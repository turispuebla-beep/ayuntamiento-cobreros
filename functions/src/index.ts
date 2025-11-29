import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import * as nodemailer from 'nodemailer';
import cors from 'cors';
import type { Request, Response } from 'express';

// Inicializar Firebase Admin
admin.initializeApp();

// Configurar CORS
const corsHandler = cors({ origin: true });

// Verificar si el usuario está autenticado y es admin
async function verifyAdmin(req: Request): Promise<{ valid: boolean; uid?: string; email?: string; error?: string }> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { valid: false, error: 'No se proporcionó token de autenticación' };
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    // Verificar si el usuario tiene rol de admin en Firestore
    const userDoc = await admin.firestore().collection('users').doc(decodedToken.uid).get();
    const userData = userDoc.data();
    
    // Verificar también en colección admins
    let adminData = null;
    try {
      const adminDoc = await admin.firestore().collection('admins').doc(decodedToken.uid).get();
      if (adminDoc.exists) {
        adminData = adminDoc.data();
      }
    } catch (error) {
      console.warn('No se pudo verificar en colección admins:', error);
    }
    
    // Verificar rol de admin (puede estar en customClaims, Firestore users, o colección admins)
    const isAdmin = decodedToken.admin === true || 
                    decodedToken.role === 'admin' || 
                    decodedToken.role === 'super_admin' ||
                    (userData && (userData.isAdmin === true || userData.role === 'admin' || userData.role === 'super_admin')) ||
                    (adminData && (adminData.isAdmin === true || adminData.isSuperAdmin === true));
    
    if (!isAdmin) {
      // Registrar intento no autorizado
      try {
        await admin.firestore().collection('audit_logs').add({
          type: 'UNAUTHORIZED_ACCESS_ATTEMPT',
          userId: decodedToken.uid,
          email: decodedToken.email,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          ipAddress: req.ip || req.headers['x-forwarded-for'] || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown'
        });
      } catch (error) {
        console.error('Error registrando intento no autorizado:', error);
      }
      
      return { valid: false, error: 'No tiene permisos de administrador' };
    }

    return { 
      valid: true, 
      uid: decodedToken.uid, 
      email: decodedToken.email || undefined 
    };
  } catch (error: any) {
    console.error('Error verificando admin:', error);
    return { valid: false, error: 'Token inválido o expirado' };
  }
}

// Verificar permisos para una acción específica
export const verifyPermission = functions.https.onRequest((req: Request, res: Response) => {
  return corsHandler(req, res, async () => {
    if (req.method !== 'POST') {
      res.status(405).json({ success: false, error: 'Método no permitido' });
      return;
    }

    try {
      const { action, userId } = req.body;
      
      if (!action || !userId) {
        res.status(400).json({ success: false, error: 'Acción y userId son requeridos' });
        return;
      }

      // Verificar autenticación
      const authResult = await verifyAuth(req);
      if (!authResult.valid) {
        res.status(401).json({ success: false, allowed: false, reason: authResult.error });
        return;
      }

      // Verificar que el userId coincida con el usuario autenticado
      if (authResult.uid !== userId && authResult.email !== userId) {
        // Solo super_admin puede verificar permisos de otros usuarios
        const adminResult = await verifyAdmin(req);
        if (!adminResult.valid || !adminResult.email) {
          res.status(403).json({ success: false, allowed: false, reason: 'No puede verificar permisos de otros usuarios' });
          return;
        }
      }

      // Definir permisos por acción
      const actionPermissions: { [key: string]: string[] } = {
        CREATE_ADMIN: ['super_admin'],
        DELETE_ADMIN: ['super_admin'],
        UPDATE_ADMIN: ['super_admin'],
        CREATE_USER: ['admin', 'super_admin'],
        DELETE_USER: ['admin', 'super_admin'],
        UPDATE_USER: ['admin', 'super_admin'],
        VIEW_LOGS: ['admin', 'super_admin'],
        EXPORT_DATA: ['admin', 'super_admin']
      };

      // Obtener rol del usuario
      const userDoc = await admin.firestore().collection('users').doc(authResult.uid!).get();
      const userData = userDoc.data();
      
      let userRole = 'user';
      if (userData?.role === 'super_admin' || userData?.isSuperAdmin === true) {
        userRole = 'super_admin';
      } else if (userData?.role === 'admin' || userData?.isAdmin === true) {
        userRole = 'admin';
      }

      // Verificar permisos
      const allowedRoles = actionPermissions[action] || [];
      const allowed = allowedRoles.includes(userRole);

      res.status(200).json({
        success: true,
        allowed,
        reason: !allowed ? `Rol '${userRole}' no tiene permisos para '${action}'. Roles permitidos: ${allowedRoles.join(', ')}` : undefined
      });

    } catch (error: any) {
      console.error('Error verificando permisos:', error);
      res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  });
});

// Verificar si el usuario está autenticado (no requiere admin)
async function verifyAuth(req: Request): Promise<{ valid: boolean; uid?: string; email?: string; error?: string }> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { valid: false, error: 'No se proporcionó token de autenticación' };
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    return { 
      valid: true, 
      uid: decodedToken.uid, 
      email: decodedToken.email || undefined 
    };
  } catch (error: any) {
    console.error('Error verificando autenticación:', error);
    return { valid: false, error: 'Token inválido o expirado' };
  }
}

// Tamaño de lote para envío masivo (máximo recomendado de FCM)
const BATCH_SIZE = 500;

// ⚙️ CONFIGURACIÓN DE EMAIL PARA CITAS PREVIAS
// Email dedicado exclusivamente para citas previas
const APPOINTMENT_EMAIL = 'u2389387944@gmail.com';

// Configurar Nodemailer para Gmail
// ✅ MIGRADO A FIREBASE SECRETS (marzo 2026)
// Para configurar: firebase functions:secrets:set GMAIL_PASSWORD
// El secret se expone automáticamente como process.env.GMAIL_PASSWORD
// NOTA: El secret solo está disponible en runtime, no en build time
// Por eso creamos el transporter dentro de la función

function createTransporter() {
  const gmailPassword = process.env.GMAIL_PASSWORD;
  if (!gmailPassword) {
    throw new Error('GMAIL_PASSWORD secret no configurado. Usa: firebase functions:secrets:set GMAIL_PASSWORD');
  }
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: APPOINTMENT_EMAIL,
      pass: gmailPassword
    }
  });
}

// ===== FUNCIONES PARA CITAS PREVIAS =====

/**
 * 📅 Crear nueva cita previa
 * Endpoint: https://us-central1-turisteam-80f1b.cloudfunctions.net/createAppointment
 * Método: POST
 * Auth: Requiere autenticación (no admin)
 */
export const createAppointment = functions.https.onRequest((req: Request, res: Response) => {
  return corsHandler(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Método no permitido' });
    }

    try {
      // Verificar autenticación
      const authCheck = await verifyAuth(req);
      if (!authCheck.valid) {
        return res.status(401).json({ error: authCheck.error || 'No autenticado' });
      }

      const appointmentData = req.body;
      
      // Validaciones básicas
      if (!appointmentData.service || !appointmentData.name || !appointmentData.dni || !appointmentData.email || !appointmentData.date || !appointmentData.time) {
        return res.status(400).json({ error: 'Faltan campos requeridos' });
      }

      // Validar DNI (formato: 8 números + 1 letra)
      const dniRegex = /^[0-9]{8}[A-Za-z]$/;
      if (!dniRegex.test(appointmentData.dni)) {
        return res.status(400).json({ error: 'DNI inválido. Formato requerido: 8 números + 1 letra' });
      }

      // Crear documento en Firestore
      const appointmentRef = await admin.firestore().collection('appointments').add({
        ...appointmentData,
        status: 'pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdBy: authCheck.uid,
        createdByEmail: authCheck.email
      });

      console.log(`✅ Cita creada: ${appointmentRef.id}`);

      // Enviar email de confirmación
      try {
        const transporter = createTransporter();
        await transporter.sendMail({
          from: `"Cita / Aviso Ayto Cobreros" <${APPOINTMENT_EMAIL}>`,
          to: appointmentData.email,
          subject: 'Confirmación de Cita Previa - Ayuntamiento de Cobreros',
          html: generateAppointmentConfirmationHTML({
            ...appointmentData,
            appointmentId: appointmentRef.id
          }),
          text: generateAppointmentConfirmationText({
            ...appointmentData,
            appointmentId: appointmentRef.id
          })
        });
        console.log(`✅ Email de confirmación enviado a ${appointmentData.email}`);
      } catch (emailError) {
        console.error('Error enviando email de confirmación:', emailError);
        // No fallar la creación de la cita si el email falla
      }

      // Notificar a administradores
      try {
        const adminEmails = ['aytocobreros@gmail.com'];
        const transporter = createTransporter();
        await transporter.sendMail({
          from: `"Cita / Aviso Ayto Cobreros" <${APPOINTMENT_EMAIL}>`,
          to: adminEmails.join(','),
          subject: `Nueva Cita Previa - ${appointmentData.name}`,
          html: generateAdminNotificationHTML({
            ...appointmentData,
            appointmentId: appointmentRef.id
          }),
          text: generateAdminNotificationText({
            ...appointmentData,
            appointmentId: appointmentRef.id
          })
        });
        console.log(`✅ Notificación a administradores enviada`);
      } catch (emailError) {
        console.error('Error notificando a administradores:', emailError);
      }

      return res.status(200).json({
        success: true,
        appointmentId: appointmentRef.id,
        message: 'Cita creada correctamente'
      });

    } catch (error: any) {
      console.error('❌ Error creando cita:', error);
      return res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        details: error.message
      });
    }
  });
});

/**
 * 📋 Obtener citas previas
 * Endpoint: https://us-central1-turisteam-80f1b.cloudfunctions.net/getAppointments
 * Método: GET
 * Auth: Requiere autenticación (admin para ver todas, usuario normal solo las suyas)
 */
export const getAppointments = functions.https.onRequest((req: Request, res: Response) => {
  return corsHandler(req, res, async () => {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Método no permitido' });
    }

    try {
      const authCheck = await verifyAuth(req);
      if (!authCheck.valid) {
        return res.status(401).json({ error: authCheck.error || 'No autenticado' });
      }

      // Verificar si es admin
      const adminCheck = await verifyAdmin(req);
      const isAdmin = adminCheck.valid;

      let appointmentsQuery: FirebaseFirestore.Query = admin.firestore().collection('appointments');
      
      // Si no es admin, solo ver sus propias citas
      if (!isAdmin) {
        appointmentsQuery = appointmentsQuery.where('createdBy', '==', authCheck.uid);
      }

      // Ordenar por fecha de creación descendente
      appointmentsQuery = appointmentsQuery.orderBy('createdAt', 'desc');

      // Límite opcional
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      appointmentsQuery = appointmentsQuery.limit(limit);

      const snapshot = await appointmentsQuery.get();
      const appointments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      return res.status(200).json({
        success: true,
        appointments,
        count: appointments.length
      });

    } catch (error: any) {
      console.error('❌ Error obteniendo citas:', error);
      return res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        details: error.message
      });
    }
  });
});

/**
 * ✏️ Actualizar estado de cita previa
 * Endpoint: https://us-central1-turisteam-80f1b.cloudfunctions.net/updateAppointmentStatus
 * Método: POST
 * Auth: Requiere admin
 */
export const updateAppointmentStatus = functions.https.onRequest((req: Request, res: Response) => {
  return corsHandler(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Método no permitido' });
    }

    try {
      const adminCheck = await verifyAdmin(req);
      if (!adminCheck.valid) {
        return res.status(403).json({ error: adminCheck.error || 'No autorizado' });
      }

      const { appointmentId, status, notes } = req.body;

      if (!appointmentId || !status) {
        return res.status(400).json({ error: 'Faltan campos requeridos: appointmentId, status' });
      }

      const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed', 'no_show'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: `Estado inválido. Estados válidos: ${validStatuses.join(', ')}` });
      }

      const appointmentRef = admin.firestore().collection('appointments').doc(appointmentId);
      const appointmentDoc = await appointmentRef.get();

      if (!appointmentDoc.exists) {
        return res.status(404).json({ error: 'Cita no encontrada' });
      }

      const appointmentData = appointmentDoc.data()!;

      await appointmentRef.update({
        status,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: adminCheck.uid,
        updatedByEmail: adminCheck.email,
        ...(notes && { notes })
      });

      // Enviar email de notificación de cambio de estado si es necesario
      if (status === 'confirmed' || status === 'cancelled') {
        try {
          const transporter = createTransporter();
          await transporter.sendMail({
            from: `"Cita / Aviso Ayto Cobreros" <${APPOINTMENT_EMAIL}>`,
            to: appointmentData.email,
            subject: `Actualización de Cita Previa - ${status === 'confirmed' ? 'Confirmada' : 'Cancelada'}`,
            html: generateStatusChangeHTML({
              ...appointmentData,
              status,
              appointmentId
            }),
            text: generateStatusChangeText({
              ...appointmentData,
              status,
              appointmentId
            })
          });
          console.log(`✅ Email de actualización enviado a ${appointmentData.email}`);
        } catch (emailError) {
          console.error('Error enviando email de actualización:', emailError);
        }
      }

      console.log(`✅ Cita ${appointmentId} actualizada a estado: ${status}`);

      return res.status(200).json({
        success: true,
        message: 'Estado de cita actualizado correctamente'
      });

    } catch (error: any) {
      console.error('❌ Error actualizando estado de cita:', error);
      return res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        details: error.message
      });
    }
  });
});

/**
 * 🗑️ Eliminar cita previa
 * Endpoint: https://us-central1-turisteam-80f1b.cloudfunctions.net/deleteAppointment
 * Método: POST
 * Auth: Requiere admin
 */
export const deleteAppointment = functions.https.onRequest((req: Request, res: Response) => {
  return corsHandler(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Método no permitido' });
    }

    try {
      const adminCheck = await verifyAdmin(req);
      if (!adminCheck.valid) {
        return res.status(403).json({ error: adminCheck.error || 'No autorizado' });
      }

      const { appointmentId } = req.body;

      if (!appointmentId) {
        return res.status(400).json({ error: 'Falta campo requerido: appointmentId' });
      }

      const appointmentRef = admin.firestore().collection('appointments').doc(appointmentId);
      const appointmentDoc = await appointmentRef.get();

      if (!appointmentDoc.exists) {
        return res.status(404).json({ error: 'Cita no encontrada' });
      }

      const appointmentData = appointmentDoc.data()!;

      // Eliminar adjuntos en Storage si existen
      if (appointmentData.attachment && appointmentData.attachment.storagePath) {
        try {
          const bucket = admin.storage().bucket();
          const file = bucket.file(appointmentData.attachment.storagePath);
          await file.delete();
          console.log(`✅ Adjunto eliminado: ${appointmentData.attachment.storagePath}`);
        } catch (storageError) {
          console.error('Error eliminando adjunto:', storageError);
          // Continuar aunque falle la eliminación del archivo
        }
      }

      // Eliminar documento
      await appointmentRef.delete();

      console.log(`✅ Cita ${appointmentId} eliminada`);

      return res.status(200).json({
        success: true,
        message: 'Cita eliminada correctamente'
      });

    } catch (error: any) {
      console.error('❌ Error eliminando cita:', error);
      return res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        details: error.message
      });
    }
  });
});

/**
 * 📎 Subir adjunto de cita previa
 * Endpoint: https://us-central1-turisteam-80f1b.cloudfunctions.net/uploadAppointmentAttachment
 * Método: POST (multipart/form-data)
 * Auth: Requiere autenticación (no admin)
 */
export const uploadAppointmentAttachment = functions.https.onRequest((req: Request, res: Response) => {
  return corsHandler(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Método no permitido' });
    }

    try {
      const authCheck = await verifyAuth(req);
      if (!authCheck.valid) {
        return res.status(401).json({ error: authCheck.error || 'No autenticado' });
      }

      const { appointmentId, file } = req.body;

      if (!appointmentId || !file) {
        return res.status(400).json({ error: 'Faltan campos requeridos: appointmentId, file' });
      }

      // Validar tamaño (máximo 10MB)
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        return res.status(400).json({ error: 'El archivo excede el tamaño máximo de 10MB' });
      }

      // Validar tipo de archivo
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        return res.status(400).json({ error: 'Tipo de archivo no permitido' });
      }

      // Subir a Storage
      const bucket = admin.storage().bucket();
      const fileName = `appointments/${appointmentId}/${Date.now()}_${file.name}`;
      const fileRef = bucket.file(fileName);

      // Convertir base64 a buffer si es necesario
      let fileBuffer: Buffer;
      if (typeof file.data === 'string') {
        fileBuffer = Buffer.from(file.data, 'base64');
      } else {
        fileBuffer = Buffer.from(file.data);
      }

      await fileRef.save(fileBuffer, {
        contentType: file.type,
        metadata: {
          metadata: {
            appointmentId,
            uploadedBy: authCheck.uid,
            uploadedAt: new Date().toISOString(),
            originalName: file.name
          }
        }
      });

      // Hacer el archivo público o generar URL firmada
      await fileRef.makePublic();
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

      // Actualizar referencia en Firestore
      const appointmentRef = admin.firestore().collection('appointments').doc(appointmentId);
      await appointmentRef.update({
        attachment: {
          name: file.name,
          url: publicUrl,
          storagePath: fileName,
          size: file.size,
          contentType: file.type,
          uploadedAt: admin.firestore.FieldValue.serverTimestamp()
        }
      });

      console.log(`✅ Adjunto subido para cita ${appointmentId}: ${fileName}`);

      return res.status(200).json({
        success: true,
        attachment: {
          name: file.name,
          url: publicUrl,
          storagePath: fileName,
          size: file.size,
          contentType: file.type
        }
      });

    } catch (error: any) {
      console.error('❌ Error subiendo adjunto:', error);
      return res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        details: error.message
      });
    }
  });
});

// Función para enviar emails
// ✅ Usa Firebase Secrets (GMAIL_PASSWORD se expone automáticamente como process.env)
export const sendEmail = functions
  .runWith({ secrets: ['GMAIL_PASSWORD'] })
  .https.onRequest((req: Request, res: Response) => {
  return corsHandler(req, res, async () => {
    // Validar que el secret esté configurado (solo en runtime)
    const runtimeGmailPassword = process.env.GMAIL_PASSWORD;
    if (!runtimeGmailPassword) {
      return res.status(500).json({ 
        error: 'GMAIL_PASSWORD secret no configurado',
        message: 'Configura el secret con: firebase functions:secrets:set GMAIL_PASSWORD'
      });
    }
    
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Método no permitido' });
    }

    try {
      const { to, from, subject, template, data } = req.body;

      if (!to || !subject) {
        return res.status(400).json({ error: 'Faltan campos requeridos' });
      }

      // Generar contenido del email según el template
      let htmlContent = '';
      let textContent = '';

      switch (template) {
        case 'appointment_confirmation':
          htmlContent = generateAppointmentConfirmationHTML(data);
          textContent = generateAppointmentConfirmationText(data);
          break;
        case 'appointment_notification_admin':
          htmlContent = generateAdminNotificationHTML(data);
          textContent = generateAdminNotificationText(data);
          break;
        case 'appointment_status_change':
          htmlContent = generateStatusChangeHTML(data);
          textContent = generateStatusChangeText(data);
          break;
        case 'appointment_no_show':
          htmlContent = generateNoShowHTML(data);
          textContent = generateNoShowText(data);
          break;
        case 'general_notice':
          htmlContent = generateGeneralNoticeHTML(data);
          textContent = generateGeneralNoticeText(data);
          break;
        default:
          htmlContent = '<p>Email del Ayuntamiento de Cobreros</p>';
          textContent = 'Email del Ayuntamiento de Cobreros';
      }

      // Configurar el email
      const defaultFrom = `"Cita / Aviso Ayto Cobreros" <${APPOINTMENT_EMAIL}>`;
      const mailOptions = {
        from: from || defaultFrom,
        to: to,
        subject: subject,
        text: textContent,
        html: htmlContent
      };

      // Enviar email
      const transporter = createTransporter();
      const info = await transporter.sendMail(mailOptions);
      
      console.log('✅ Email enviado:', info.messageId);
      
      return res.status(200).json({
        success: true,
        messageId: info.messageId,
        message: 'Email enviado correctamente'
      });

    } catch (error: any) {
      console.error('❌ Error al enviar email:', error);
      return res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        details: error.message
      });
    }
  });
});

// ===== SISTEMA DE NOTIFICACIONES PUSH MEJORADO =====

/**
 * 🔔 Función para enviar notificaciones push masivas
 * 
 * Esta función implementa:
 * - Batch sending (500 usuarios por request)
 * - Limpieza automática de tokens inválidos
 * - Manejo de errores FCM
 * - Estadísticas de entrega
 * - Logging completo
 * 
 * Endpoint: https://us-central1-turisteam-80f1b.cloudfunctions.net/sendPushNotification
 */
export const sendPushNotification = functions.https.onRequest((req, res) => {
  return corsHandler(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Método no permitido' });
    }

    try {
      const { title, message, type, scope, localities, textFont, textSize, textColor, adminEmail } = req.body;

      // Validaciones
      if (!title || !message) {
        return res.status(400).json({ error: 'Título y mensaje son requeridos' });
      }

      console.log('🔔 Iniciando envío de notificación push:', { title, type, scope });

      // Obtener usuarios que han dado consentimiento
      let usersQuery = admin.firestore().collection('users')
        .where('notificationConsent', '==', true);

      const usersSnapshot = await usersQuery.get();

      if (usersSnapshot.empty) {
        return res.status(200).json({
          success: true,
          message: 'No hay usuarios con notificaciones activas',
          stats: { totalUsers: 0, sent: 0, failed: 0, invalidTokens: 0 }
        });
      }

      // Filtrar usuarios por localidades si es necesario
      let usersToNotify: FirebaseFirestore.QueryDocumentSnapshot[] = [];
      
      if (scope === 'localities' && localities && Array.isArray(localities) && localities.length > 0) {
        usersSnapshot.forEach(doc => {
          const userData = doc.data();
          const userLocalities = userData.localities || [];
          
          // Verificar si el usuario está en alguna de las localidades seleccionadas
          const userInLocalities = localities.some((locality: string) => 
            userLocalities.includes(locality)
          );
          
          if (userInLocalities && userData.fcmToken) {
            usersToNotify.push(doc);
          }
        });
      } else {
        // Todos los usuarios
        usersSnapshot.forEach(doc => {
          if (doc.data().fcmToken) {
            usersToNotify.push(doc);
          }
        });
      }

      console.log(`📊 Usuarios a notificar: ${usersToNotify.length}`);

      if (usersToNotify.length === 0) {
        return res.status(200).json({
          success: true,
          message: 'No hay usuarios para notificar con los filtros aplicados',
          stats: { totalUsers: 0, sent: 0, failed: 0, invalidTokens: 0 }
        });
      }

      // Estadísticas
      let sentCount = 0;
      let failedCount = 0;
      let invalidTokensCount = 0;
      const invalidTokens: string[] = [];

      // Procesar en lotes
      for (let i = 0; i < usersToNotify.length; i += BATCH_SIZE) {
        const batch = usersToNotify.slice(i, i + BATCH_SIZE);
        const tokens = batch.map(doc => doc.data().fcmToken).filter(Boolean);

        if (tokens.length === 0) continue;

        try {
          // Enviar notificación batch usando Firebase Admin SDK
          const response = await admin.messaging().sendEachForMulticast({
            tokens: tokens,
            notification: {
              title: title,
              body: message,
            },
            data: {
              type: type || 'general',
              scope: scope || 'all',
              localities: localities ? localities.join(',') : '',
              textFont: textFont || '',
              textSize: textSize || '',
              textColor: textColor || '',
              adminEmail: adminEmail || '',
              timestamp: new Date().toISOString(),
            },
            android: {
              priority: 'high' as any,
              notification: {
                icon: 'ic_escudo_cobreros',
                sound: 'default',
                clickAction: 'FLUTTER_NOTIFICATION_CLICK',
              },
            },
            apns: {
              payload: {
                aps: {
                  sound: 'default',
                  badge: 1,
                },
              },
            },
            webpush: {
              notification: {
                title: title,
                body: message,
                icon: '/images/escudo-cobreros.png',
                badge: '/images/escudo-cobreros.png',
                requireInteraction: false,
                tag: 'ayuntamiento-notification',
                timestamp: Date.now(),
              },
              fcmOptions: {
                link: '/#notifications',
              },
            },
          });

          // Procesar respuestas
          if (response.responses) {
            response.responses.forEach((resp, idx) => {
              if (resp.success) {
                sentCount++;
              } else {
                failedCount++;
                
                // Detectar tokens inválidos
                if (resp.error?.code === 'messaging/invalid-registration-token' ||
                    resp.error?.code === 'messaging/registration-token-not-registered') {
                  invalidTokensCount++;
                  const invalidToken = tokens[idx];
                  if (invalidToken) {
                    invalidTokens.push(invalidToken);
                  }
                }
              }
            });
          }

          console.log(`✅ Batch ${Math.floor(i / BATCH_SIZE) + 1} procesado: ${response.successCount} enviados, ${response.failureCount} fallidos`);

        } catch (error: any) {
          console.error('❌ Error en batch:', error);
          failedCount += tokens.length;
        }
      }

      // Limpiar tokens inválidos de la base de datos
      if (invalidTokens.length > 0) {
        console.log(`🧹 Limpiando ${invalidTokens.length} tokens inválidos`);
        
        const cleanPromises = usersToNotify
          .filter(doc => invalidTokens.includes(doc.data().fcmToken))
          .map(doc => 
            doc.ref.update({
              fcmToken: admin.firestore.FieldValue.delete(),
              lastNotificationError: 'Token inválido',
              notificationConsent: false
            }).catch(err => console.error('Error limpiando token:', err))
          );

        await Promise.all(cleanPromises);
        console.log('✅ Tokens inválidos eliminados');
      }

      // Guardar estadísticas en Firestore
      const stats = {
        totalUsers: usersToNotify.length,
        sent: sentCount,
        failed: failedCount,
        invalidTokens: invalidTokensCount,
        successRate: usersToNotify.length > 0 ? ((sentCount / usersToNotify.length) * 100).toFixed(2) + '%' : '0%',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        title: title,
        type: type,
        scope: scope,
        localities: scope === 'localities' ? localities : [],
        adminEmail: adminEmail
      };

      await admin.firestore().collection('notification_stats').add(stats);

      console.log('📊 Estadísticas guardadas:', stats);
      
      return res.status(200).json({
        success: true,
        message: `Notificación enviada: ${sentCount} exitosos, ${failedCount} fallidos`,
        stats: stats
      });

    } catch (error: any) {
      console.error('❌ Error al enviar notificación push:', error);
      return res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        details: error.message
      });
    }
  });
});

// Función para generar HTML de confirmación de cita
function generateAppointmentConfirmationHTML(data: any): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Confirmación de Cita Previa</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #2c3e50; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .appointment-details { background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #3498db; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            .highlight { color: #e74c3c; font-weight: bold; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🏛️ Ayuntamiento de Cobreros</h1>
                <h2>Confirmación de Cita Previa</h2>
            </div>
            
            <div class="content">
                <p>Estimado/a <strong>${data.name}</strong>,</p>
                
                <p>Le confirmamos que su solicitud de cita previa ha sido recibida correctamente.</p>
                
                <div class="appointment-details">
                    <h3>📅 Detalles de su cita:</h3>
                    <ul>
                        <li><strong>Servicio:</strong> ${data.service}</li>
                        <li><strong>Fecha:</strong> <span class="highlight">${data.date || data.dateFormatted || 'No especificada'}</span></li>
                        <li><strong>Hora:</strong> <span class="highlight">${data.time || 'No especificada'}</span></li>
                        <li><strong>DNI:</strong> ${data.dni}</li>
                        <li><strong>ID de Cita:</strong> ${data.appointmentId || data.id || 'N/A'}</li>
                        ${data.comments ? `<li><strong>Comentarios:</strong> ${data.comments}</li>` : ''}
                    </ul>
                </div>
                
                <p><strong>Importante:</strong> Nos pondremos en contacto con usted para confirmar la disponibilidad de la fecha y hora solicitada.</p>
                
                <p>Atentamente,<br>Ayuntamiento de Cobreros</p>
            </div>
            
            <div class="footer">
                <p>Este es un email automático. Por favor, no responda a este mensaje.</p>
            </div>
        </div>
    </body>
    </html>
  `;
}

function generateAppointmentConfirmationText(data: any): string {
  return `
🏛️ Ayuntamiento de Cobreros
Confirmación de Cita Previa

Estimado/a ${data.name},

Le confirmamos que su solicitud de cita previa ha sido recibida correctamente.

📅 Detalles de su cita:
- Servicio: ${data.service}
- Fecha: ${data.date || data.dateFormatted || 'No especificada'}
- Hora: ${data.time || 'No especificada'}
- DNI: ${data.dni}
- ID de Cita: ${data.appointmentId || data.id || 'N/A'}
${data.comments ? `- Comentarios: ${data.comments}` : ''}

Importante: Nos pondremos en contacto con usted para confirmar la disponibilidad de la fecha y hora solicitada.

Atentamente,
Ayuntamiento de Cobreros

---
Este es un email automático. Por favor, no responda a este mensaje.
  `;
}

function generateAdminNotificationHTML(data: any): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Nueva Cita Previa</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #e74c3c; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .appointment-details { background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #e74c3c; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🔔 Nueva Cita Previa</h1>
                <h2>Notificación para Administradores</h2>
            </div>
            
            <div class="content">
                <p>Se ha recibido una nueva solicitud de cita previa.</p>
                
                <div class="appointment-details">
                    <h3>📋 Detalles de la solicitud:</h3>
                    <ul>
                        <li><strong>Nombre:</strong> ${data.name}</li>
                        <li><strong>Email:</strong> ${data.email}</li>
                        <li><strong>Teléfono:</strong> ${data.phone || 'No proporcionado'}</li>
                        <li><strong>DNI:</strong> ${data.dni}</li>
                        <li><strong>Servicio:</strong> ${data.service}</li>
                        <li><strong>Fecha:</strong> ${data.date || data.dateFormatted || 'No especificada'}</li>
                        <li><strong>Hora:</strong> ${data.time || 'No especificada'}</li>
                        <li><strong>ID de Cita:</strong> ${data.appointmentId || data.id}</li>
                        ${data.comments ? `<li><strong>Comentarios:</strong> ${data.comments}</li>` : ''}
                    </ul>
                </div>
                
                <p>Por favor, revise la solicitud en el panel de administración.</p>
            </div>
            
            <div class="footer">
                <p>Este es un email automático del sistema de gestión de citas.</p>
            </div>
        </div>
    </body>
    </html>
  `;
}

function generateAdminNotificationText(data: any): string {
  return `
🔔 Nueva Cita Previa
Notificación para Administradores

Se ha recibido una nueva solicitud de cita previa.

📋 Detalles de la solicitud:
- Nombre: ${data.name}
- Email: ${data.email}
- Teléfono: ${data.phone || 'No proporcionado'}
- DNI: ${data.dni}
- Servicio: ${data.service}
- Fecha: ${data.date || data.dateFormatted || 'No especificada'}
- Hora: ${data.time || 'No especificada'}
- ID de Cita: ${data.appointmentId || data.id}
${data.comments ? `- Comentarios: ${data.comments}` : ''}

Por favor, revise la solicitud en el panel de administración.

---
Este es un email automático del sistema de gestión de citas.
  `;
}

function generateStatusChangeHTML(data: any): string {
  const statusText = {
    'pending': 'Pendiente',
    'confirmed': 'Confirmada',
    'cancelled': 'Cancelada',
    'completed': 'Completada',
    'no_show': 'No se presentó'
  };

  const statusColor = {
    'pending': '#f39c12',
    'confirmed': '#27ae60',
    'cancelled': '#e74c3c',
    'completed': '#3498db',
    'no_show': '#95a5a6'
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Actualización de Cita Previa</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: ${statusColor[data.status as keyof typeof statusColor] || '#2c3e50'}; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .appointment-details { background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid ${statusColor[data.status as keyof typeof statusColor] || '#2c3e50'}; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>📅 Actualización de Cita Previa</h1>
                <h2>Estado: ${statusText[data.status as keyof typeof statusText] || data.status}</h2>
            </div>
            
            <div class="content">
                <p>Estimado/a <strong>${data.name}</strong>,</p>
                
                <p>Le informamos que el estado de su cita previa ha sido actualizado.</p>
                
                <div class="appointment-details">
                    <h3>📋 Detalles de la cita:</h3>
                    <ul>
                        <li><strong>Servicio:</strong> ${data.service}</li>
                        <li><strong>Fecha:</strong> ${data.date || data.dateFormatted || 'No especificada'}</li>
                        <li><strong>Hora:</strong> ${data.time || 'No especificada'}</li>
                        <li><strong>Estado:</strong> <strong style="color: ${statusColor[data.status as keyof typeof statusColor] || '#2c3e50'};">${statusText[data.status as keyof typeof statusText] || data.status}</strong></li>
                        <li><strong>ID de Cita:</strong> ${data.appointmentId || data.id}</li>
                    </ul>
                </div>
                
                <p>Si tiene alguna pregunta, no dude en contactarnos.</p>
                
                <p>Atentamente,<br>Ayuntamiento de Cobreros</p>
            </div>
            
            <div class="footer">
                <p>Este es un email automático. Por favor, no responda a este mensaje.</p>
            </div>
        </div>
    </body>
    </html>
  `;
}

function generateStatusChangeText(data: any): string {
  const statusText = {
    'pending': 'Pendiente',
    'confirmed': 'Confirmada',
    'cancelled': 'Cancelada',
    'completed': 'Completada',
    'no_show': 'No se presentó'
  };

  return `
📅 Actualización de Cita Previa
Estado: ${statusText[data.status as keyof typeof statusText] || data.status}

Estimado/a ${data.name},

Le informamos que el estado de su cita previa ha sido actualizado.

📋 Detalles de la cita:
- Servicio: ${data.service}
- Fecha: ${data.date || data.dateFormatted || 'No especificada'}
- Hora: ${data.time || 'No especificada'}
- Estado: ${statusText[data.status as keyof typeof statusText] || data.status}
- ID de Cita: ${data.appointmentId || data.id}

Si tiene alguna pregunta, no dude en contactarnos.

Atentamente,
Ayuntamiento de Cobreros

---
Este es un email automático. Por favor, no responda a este mensaje.
  `;
}

function generateNoShowHTML(data: any): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>No se presentó a la cita</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #e74c3c; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .appointment-details { background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #e74c3c; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>⚠️ No se presentó a la cita</h1>
            </div>
            
            <div class="content">
                <p>Estimado/a <strong>${data.name}</strong>,</p>
                
                <p>Le informamos que ha sido registrado como ausente en su cita previa.</p>
                
                <div class="appointment-details">
                    <h3>📋 Detalles de la cita:</h3>
                    <ul>
                        <li><strong>Servicio:</strong> ${data.service}</li>
                        <li><strong>Fecha:</strong> ${data.date || data.dateFormatted || 'No especificada'}</li>
                        <li><strong>Hora:</strong> ${data.time || 'No especificada'}</li>
                        <li><strong>ID de Cita:</strong> ${data.appointmentId || data.id}</li>
                    </ul>
                </div>
                
                <p>Si necesita una nueva cita, por favor, realice una nueva solicitud.</p>
                
                <p>Atentamente,<br>Ayuntamiento de Cobreros</p>
            </div>
            
            <div class="footer">
                <p>Este es un email automático. Por favor, no responda a este mensaje.</p>
            </div>
        </div>
    </body>
    </html>
  `;
}

function generateNoShowText(data: any): string {
  return `
⚠️ No se presentó a la cita

Estimado/a ${data.name},

Le informamos que ha sido registrado como ausente en su cita previa.

📋 Detalles de la cita:
- Servicio: ${data.service}
- Fecha: ${data.date || data.dateFormatted || 'No especificada'}
- Hora: ${data.time || 'No especificada'}
- ID de Cita: ${data.appointmentId || data.id}

Si necesita una nueva cita, por favor, realice una nueva solicitud.

Atentamente,
Ayuntamiento de Cobreros

---
Este es un email automático. Por favor, no responda a este mensaje.
  `;
}

function generateGeneralNoticeHTML(data: any): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>${data.title || 'Aviso del Ayuntamiento'}</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #2c3e50; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🏛️ Ayuntamiento de Cobreros</h1>
                <h2>${data.title || 'Aviso'}</h2>
            </div>
            
            <div class="content">
                ${data.content || data.message || '<p>Aviso del Ayuntamiento de Cobreros</p>'}
            </div>
            
            <div class="footer">
                <p>Este es un email automático. Por favor, no responda a este mensaje.</p>
            </div>
        </div>
    </body>
    </html>
  `;
}

function generateGeneralNoticeText(data: any): string {
  return `
🏛️ Ayuntamiento de Cobreros
${data.title || 'Aviso'}

${data.content || data.message || 'Aviso del Ayuntamiento de Cobreros'}

---
Este es un email automático. Por favor, no responda a este mensaje.
  `;
}

// ===== FUNCIONES DE BACKUP =====

/**
 * 🔄 Función programada para backup automático diario
 * Se ejecuta todos los días a las 2:00 AM UTC
 */
export const backupAppointmentsTask = functions.pubsub
  .schedule('every day 02:00')
  .timeZone('UTC')
  .onRun(async (context) => {
    try {
      console.log('🔄 Iniciando backup automático...');
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupDate = new Date().toISOString().split('T')[0];
      
      // Recolectar datos
      const backupData: any = {
        timestamp: new Date().toISOString(),
        backupDate: backupDate,
        collections: {}
      };

      // Backup de usuarios
      const usersSnapshot = await admin.firestore().collection('users').get();
      backupData.collections.users = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      console.log(`✅ Usuarios: ${usersSnapshot.size} documentos`);

      // Backup de citas previas desde Firestore
      const appointmentsSnapshot = await admin.firestore().collection('appointments').get();
      backupData.collections.appointments = appointmentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      console.log(`✅ Citas previas: ${appointmentsSnapshot.size} documentos`);

      // Backup de estadísticas de notificaciones
      const statsSnapshot = await admin.firestore()
        .collection('notification_stats')
        .orderBy('timestamp', 'desc')
        .limit(1000)
        .get();
      backupData.collections.notification_stats = statsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      console.log(`✅ Estadísticas: ${statsSnapshot.size} documentos`);

      // Backup de administradores (solo estructura, sin contraseñas)
      const adminsSnapshot = await admin.firestore().collection('admins').get();
      backupData.collections.admins = adminsSnapshot.docs.map(doc => {
        const data = doc.data();
        // No incluir contraseñas en el backup
        delete data.password;
        return {
          id: doc.id,
          ...data
        };
      });
      console.log(`✅ Administradores: ${adminsSnapshot.size} documentos`);

      // Guardar backup en Firestore
      const backupRef = await admin.firestore().collection('backups').add({
        ...backupData,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        size: JSON.stringify(backupData).length,
        collectionsCount: {
          users: backupData.collections.users.length,
          appointments: backupData.collections.appointments.length,
          notification_stats: backupData.collections.notification_stats.length,
          admins: backupData.collections.admins.length
        }
      });

      console.log(`✅ Backup guardado en Firestore: ${backupRef.id}`);

      // Opcional: Guardar también en Firebase Storage como JSON
      const bucket = admin.storage().bucket();
      const fileName = `backups/${backupDate}/backup-${timestamp}.json`;
      const file = bucket.file(fileName);
      
      await file.save(JSON.stringify(backupData, null, 2), {
        contentType: 'application/json',
        metadata: {
          metadata: {
            createdBy: 'backup-automatico',
            timestamp: timestamp,
            backupDate: backupDate
          }
        }
      });

      console.log(`✅ Backup guardado en Storage: ${fileName}`);

      // Limpiar backups antiguos (mantener solo los últimos 30 días)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const oldBackups = await admin.firestore()
        .collection('backups')
        .where('createdAt', '<', thirtyDaysAgo)
        .get();

      if (!oldBackups.empty) {
        const deletePromises = oldBackups.docs.map(doc => doc.ref.delete());
        await Promise.all(deletePromises);
        console.log(`🧹 Limpieza: ${oldBackups.size} backups antiguos eliminados`);
      }

      // Limpiar archivos antiguos de Storage
      const [files] = await bucket.getFiles({ prefix: 'backups/' });
      const oldFiles = files.filter(file => {
        const timeCreated = file.metadata.timeCreated;
        if (!timeCreated) return false;
        const fileDate = new Date(timeCreated);
        return fileDate < thirtyDaysAgo;
      });

      if (oldFiles.length > 0) {
        const deletePromises = oldFiles.map(file => file.delete());
        await Promise.all(deletePromises);
        console.log(`🧹 Limpieza Storage: ${oldFiles.length} archivos antiguos eliminados`);
      }

      console.log('✅ Backup automático completado exitosamente');
      
      return null;
    } catch (error: any) {
      console.error('❌ Error en backup automático:', error);
      // No lanzar error para que no falle la función programada
      return null;
    }
  });

/**
 * 🔄 Función manual para crear backup inmediato
 * 
 * Endpoint: https://us-central1-turisteam-80f1b.cloudfunctions.net/createBackup
 * Método: POST
 */
export const createBackup = functions.https.onRequest((req, res) => {
  return corsHandler(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Método no permitido' });
    }

    try {
      console.log('🔄 Iniciando backup manual...');
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupDate = new Date().toISOString().split('T')[0];
      
      // Recolectar datos (mismo proceso que backup automático)
      const backupData: any = {
        timestamp: new Date().toISOString(),
        backupDate: backupDate,
        type: 'manual',
        collections: {}
      };

      // Backup de usuarios
      const usersSnapshot = await admin.firestore().collection('users').get();
      backupData.collections.users = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Backup de citas previas desde Firestore
      const appointmentsSnapshot = await admin.firestore().collection('appointments').get();
      backupData.collections.appointments = appointmentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Backup de estadísticas
      const statsSnapshot = await admin.firestore()
        .collection('notification_stats')
        .orderBy('timestamp', 'desc')
        .limit(1000)
        .get();
      backupData.collections.notification_stats = statsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Backup de administradores (sin contraseñas)
      const adminsSnapshot = await admin.firestore().collection('admins').get();
      backupData.collections.admins = adminsSnapshot.docs.map(doc => {
        const data = doc.data();
        delete data.password;
        return {
          id: doc.id,
          ...data
        };
      });

      // Guardar en Firestore
      const backupRef = await admin.firestore().collection('backups').add({
        ...backupData,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        size: JSON.stringify(backupData).length
      });

      // Guardar en Storage
      const bucket = admin.storage().bucket();
      const fileName = `backups/${backupDate}/backup-manual-${timestamp}.json`;
      const file = bucket.file(fileName);
      
      await file.save(JSON.stringify(backupData, null, 2), {
        contentType: 'application/json'
      });

      console.log(`✅ Backup manual completado: ${backupRef.id}`);
      
      return res.status(200).json({
        success: true,
        message: 'Backup creado exitosamente',
        backupId: backupRef.id,
        storagePath: fileName,
        timestamp: backupData.timestamp,
        collectionsCount: {
          users: backupData.collections.users.length,
          appointments: backupData.collections.appointments.length,
          notification_stats: backupData.collections.notification_stats.length,
          admins: backupData.collections.admins.length
        }
      });

    } catch (error: any) {
      console.error('❌ Error en backup manual:', error);
      return res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        details: error.message
      });
    }
  });
});

