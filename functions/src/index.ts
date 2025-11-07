import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as nodemailer from 'nodemailer';
import cors from 'cors';

// Inicializar Firebase Admin
admin.initializeApp();

// Configurar CORS
const corsHandler = cors({ origin: true });

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

// Función para enviar emails
// ✅ Usa Firebase Secrets (GMAIL_PASSWORD se expone automáticamente como process.env)
export const sendEmail = functions
  .runWith({ secrets: ['GMAIL_PASSWORD'] })
  .https.onRequest((req, res) => {
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
        default:
          htmlContent = '<p>Email del Ayuntamiento de Cobreros</p>';
          textContent = 'Email del Ayuntamiento de Cobreros';
      }

      // Configurar el email
      const mailOptions = {
        from: from || APPOINTMENT_EMAIL,
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
                icon: '/images/escudo-cobreros.png',
                badge: '/images/escudo-cobreros.png',
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
                
                <p>Si necesita modificar o cancelar su cita, póngase en contacto con nosotros en <strong>${APPOINTMENT_EMAIL}</strong> o llamando al <strong>980 62 26 18</strong>.</p>
            </div>
            
            <div class="footer">
                <p>Atentamente,<br>
                <strong>Ayuntamiento de Cobreros</strong><br>
                📧 ${APPOINTMENT_EMAIL}<br>
                📞 Teléfono: 980 62 26 18</p>
                
                <p><em>Este es un email automático, por favor no responda a este mensaje.</em></p>
            </div>
        </div>
    </body>
    </html>
  `;
}

// Función para generar texto plano de confirmación de cita
function generateAppointmentConfirmationText(data: any): string {
  return `
AYUNTAMIENTO DE COBREROS - CONFIRMACIÓN DE CITA PREVIA

Estimado/a ${data.name},

Le confirmamos que su solicitud de cita previa ha sido recibida correctamente.

DETALLES DE SU CITA:
- Servicio: ${data.service}
- Fecha: ${data.date || data.dateFormatted || 'No especificada'}
- Hora: ${data.time || 'No especificada'}
- DNI: ${data.dni}
- ID de Cita: ${data.appointmentId || data.id || 'N/A'}
${data.comments ? `- Comentarios: ${data.comments}` : ''}

IMPORTANTE: Nos pondremos en contacto con usted para confirmar la disponibilidad de la fecha y hora solicitada.

Si necesita modificar o cancelar su cita, póngase en contacto con nosotros en ${APPOINTMENT_EMAIL} o llamando al 980 62 26 18.

Atentamente,
Ayuntamiento de Cobreros
${APPOINTMENT_EMAIL}
Teléfono: 980 62 26 18

Este es un email automático, por favor no responda a este mensaje.
  `;
}

// Función para generar HTML de notificación al administrador
function generateAdminNotificationHTML(data: any): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Nueva Solicitud de Cita Previa</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #e74c3c; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .appointment-details { background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #e74c3c; }
            .contact-info { background-color: #ecf0f1; padding: 15px; margin: 15px 0; border-radius: 5px; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            .highlight { color: #e74c3c; font-weight: bold; }
            .urgent { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; border-radius: 5px; margin: 10px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🚨 NUEVA SOLICITUD DE CITA PREVIA</h1>
                <h2>Ayuntamiento de Cobreros</h2>
            </div>
            
            <div class="content">
                <div class="urgent">
                    <strong>⚠️ ACCIÓN REQUERIDA:</strong> Se ha recibido una nueva solicitud de cita previa que requiere confirmación.
                </div>
                
                <div class="contact-info">
                    <h3>👤 Datos del Solicitante:</h3>
                    <ul>
                        <li><strong>Nombre:</strong> ${data.name}</li>
                        <li><strong>DNI:</strong> ${data.dni}</li>
                        <li><strong>Email:</strong> ${data.email}</li>
                        <li><strong>Teléfono:</strong> ${data.phone}</li>
                    </ul>
                </div>
                
                <div class="appointment-details">
                    <h3>📅 Detalles de la Cita Solicitada:</h3>
                    <ul>
                        <li><strong>Servicio:</strong> <span class="highlight">${data.service}</span></li>
                        <li><strong>Fecha:</strong> <span class="highlight">${data.date}</span></li>
                        <li><strong>Hora:</strong> <span class="highlight">${data.time}</span></li>
                        <li><strong>ID de Cita:</strong> ${data.appointmentId || data.id}</li>
                        ${data.comments ? `<li><strong>Comentarios:</strong> ${data.comments}</li>` : ''}
                        <li><strong>Fecha de Solicitud:</strong> ${data.createdAt || new Date().toLocaleString('es-ES')}</li>
                    </ul>
                </div>
                
                <div class="urgent">
                    <h3>📋 Próximos Pasos:</h3>
                    <ol>
                        <li>Verificar disponibilidad en el calendario</li>
                        <li>Contactar al solicitante para confirmar</li>
                        <li>Actualizar el estado de la cita en el sistema</li>
                    </ol>
                </div>
            </div>
            
            <div class="footer">
                <p><strong>Sistema de Gestión de Citas</strong><br>
                Ayuntamiento de Cobreros<br>
                📧 ${APPOINTMENT_EMAIL}<br>
                📞 980 62 26 18</p>
                
                <p><em>Este es un email automático del sistema de citas previas.</em></p>
            </div>
        </div>
    </body>
    </html>
  `;
}

// Función para generar texto plano de notificación al administrador
function generateAdminNotificationText(data: any): string {
  return `
NUEVA SOLICITUD DE CITA PREVIA - AYUNTAMIENTO DE COBREROS

⚠️ ACCIÓN REQUERIDA: Se ha recibido una nueva solicitud de cita previa que requiere confirmación.

DATOS DEL SOLICITANTE:
- Nombre: ${data.name}
- DNI: ${data.dni}
- Email: ${data.email}
- Teléfono: ${data.phone}

DETALLES DE LA CITA SOLICITADA:
- Servicio: ${data.service}
- Fecha: ${data.date}
- Hora: ${data.time}
- ID de Cita: ${data.appointmentId || data.id}
${data.comments ? `- Comentarios: ${data.comments}` : ''}
- Fecha de Solicitud: ${data.createdAt || new Date().toLocaleString('es-ES')}

PRÓXIMOS PASOS:
1. Verificar disponibilidad en el calendario
2. Contactar al solicitante para confirmar
3. Actualizar el estado de la cita en el sistema

Sistema de Gestión de Citas - Ayuntamiento de Cobreros
${APPOINTMENT_EMAIL}
Teléfono: 980 62 26 18

Este es un email automático del sistema de citas previas.
  `;
}

// Función para generar HTML de cambio de estado
function generateStatusChangeHTML(data: any): string {
  const statusTexts: any = {
    'pending': 'Pendiente',
    'confirmed': 'Confirmada',
    'cancelled': 'Cancelada',
    'completed': 'Completada'
  };
  
  const statusColors: any = {
    'pending': '#f39c12',
    'confirmed': '#27ae60',
    'cancelled': '#e74c3c',
    'completed': '#3498db'
  };

  const statusText = statusTexts[data.newStatus] || data.newStatus;
  const statusColor = statusColors[data.newStatus] || '#333';

  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Actualización de Cita Previa</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: ${statusColor}; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .status-box { background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid ${statusColor}; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            .highlight { color: ${statusColor}; font-weight: bold; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>📅 Actualización de su Cita Previa</h1>
                <h2>Ayuntamiento de Cobreros</h2>
            </div>
            
            <div class="content">
                <p>Estimado/a <strong>${data.name}</strong>,</p>
                
                <p>Le informamos que el estado de su cita previa ha sido actualizado.</p>
                
                <div class="status-box">
                    <h3>Estado de su cita:</h3>
                    <p style="font-size: 18px; color: ${statusColor}; font-weight: bold;">${statusText}</p>
                    <ul>
                        <li><strong>Servicio:</strong> ${data.service}</li>
                        <li><strong>Fecha:</strong> ${data.date}</li>
                        <li><strong>Hora:</strong> ${data.time}</li>
                        <li><strong>ID de Cita:</strong> ${data.appointmentId || data.id}</li>
                    </ul>
                </div>
                
                ${data.message ? `<p style="white-space: pre-line;">${data.message}</p>` : ''}
                
                ${data.alternativeDate && data.alternativeTime ? `
                <div class="status-box" style="background-color: #e8f5e9; border-left-color: #4caf50;">
                    <h3 style="color: #2e7d32;">📅 Fecha Alternativa Propuesta</h3>
                    <p style="font-size: 16px; color: #2e7d32; font-weight: bold;">
                        Fecha: ${data.alternativeDate}<br>
                        Hora: ${data.alternativeTime}
                    </p>
                    <p style="margin-top: 10px; color: #555;">
                        Por favor, confirme si esta nueva fecha le resulta conveniente contactándonos.
                    </p>
                </div>
                ` : ''}
                
                ${data.reason ? `<p><strong>Motivo:</strong> ${data.reason}</p>` : ''}
                
                <p>Si tiene alguna duda, puede contactarnos en <strong>${APPOINTMENT_EMAIL}</strong> o llamando al <strong>980 62 26 18</strong>.</p>
            </div>
            
            <div class="footer">
                <p>Atentamente,<br>
                <strong>Ayuntamiento de Cobreros</strong><br>
                📧 ${APPOINTMENT_EMAIL}<br>
                📞 Teléfono: 980 62 26 18</p>
                
                <p><em>Este es un email automático, por favor no responda a este mensaje.</em></p>
            </div>
        </div>
    </body>
    </html>
  `;
}

// Función para generar texto plano de cambio de estado
function generateStatusChangeText(data: any): string {
  const statusTexts: any = {
    'pending': 'Pendiente',
    'confirmed': 'Confirmada',
    'cancelled': 'Cancelada',
    'completed': 'Completada'
  };
  
  const statusText = statusTexts[data.newStatus] || data.newStatus;

  return `
ACTUALIZACIÓN DE CITA PREVIA - AYUNTAMIENTO DE COBREROS

Estimado/a ${data.name},

Le informamos que el estado de su cita previa ha sido actualizado.

ESTADO DE SU CITA: ${statusText}

DETALLES:
- Servicio: ${data.service}
- Fecha: ${data.date}
- Hora: ${data.time}
- ID de Cita: ${data.appointmentId || data.id}

${data.message ? `\n${data.message}\n` : ''}

${data.alternativeDate && data.alternativeTime ? `
FECHA ALTERNATIVA PROPUESTA:
Fecha: ${data.alternativeDate}
Hora: ${data.alternativeTime}

Por favor, confirme si esta nueva fecha le resulta conveniente contactándonos.
` : ''}

${data.reason ? `\nMotivo: ${data.reason}\n` : ''}

Si tiene alguna duda, puede contactarnos en ${APPOINTMENT_EMAIL} o llamando al 980 62 26 18.

Atentamente,
Ayuntamiento de Cobreros
${APPOINTMENT_EMAIL}
Teléfono: 980 62 26 18

Este es un email automático, por favor no responda a este mensaje.
  `;
}

// Función para generar HTML de no presentación
function generateNoShowHTML(data: any): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>No se presentó a su cita previa</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #ef4444; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .warning-box { background-color: #fef2f2; padding: 15px; margin: 15px 0; border-left: 4px solid #ef4444; border-radius: 4px; }
            .info-box { background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #3b82f6; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>⚠️ No se presentó a su cita previa</h1>
                <h2>Ayuntamiento de Cobreros</h2>
            </div>
            
            <div class="content">
                <p>Estimado/a <strong>${data.name}</strong>,</p>
                
                <div class="warning-box">
                    <h3 style="color: #dc2626; margin-top: 0;">No se presentó a su cita</h3>
                    <p>Le informamos que no se presentó a su cita previa programada.</p>
                </div>
                
                <div class="info-box">
                    <h3>Detalles de la cita:</h3>
                    <ul style="list-style: none; padding: 0;">
                        <li><strong>Servicio:</strong> ${data.service}</li>
                        <li><strong>Fecha:</strong> ${data.date}</li>
                        <li><strong>Hora:</strong> ${data.time}</li>
                        <li><strong>ID de Cita:</strong> ${data.appointmentId || data.id}</li>
                    </ul>
                </div>
                
                <p>Si desea reagendar su cita, por favor contacte con nosotros lo antes posible.</p>
                
                <p>Si tiene alguna duda, puede contactarnos en <strong>${APPOINTMENT_EMAIL}</strong> o llamando al <strong>980 62 26 18</strong>.</p>
            </div>
            
            <div class="footer">
                <p>Atentamente,<br>
                <strong>Ayuntamiento de Cobreros</strong><br>
                📧 ${APPOINTMENT_EMAIL}<br>
                📞 Teléfono: 980 62 26 18</p>
                
                <p><em>Este es un email automático, por favor no responda a este mensaje.</em></p>
            </div>
        </div>
    </body>
    </html>
  `;
}

// Función para generar texto plano de no presentación
function generateNoShowText(data: any): string {
  return `
NO SE PRESENTÓ A SU CITA PREVIA - AYUNTAMIENTO DE COBREROS

Estimado/a ${data.name},

Le informamos que no se presentó a su cita previa programada.

DETALLES DE LA CITA:
- Servicio: ${data.service}
- Fecha: ${data.date}
- Hora: ${data.time}
- ID de Cita: ${data.appointmentId || data.id}

Si desea reagendar su cita, por favor contacte con nosotros lo antes posible.

Si tiene alguna duda, puede contactarnos en ${APPOINTMENT_EMAIL} o llamando al 980 62 26 18.

Atentamente,
Ayuntamiento de Cobreros
${APPOINTMENT_EMAIL}
Teléfono: 980 62 26 18

Este es un email automático, por favor no responda a este mensaje.
  `;
}

// ===== SISTEMA DE BACKUP AUTOMÁTICO =====

/**
 * 🔄 Función programada para crear backups automáticos
 * 
 * Se ejecuta diariamente a las 02:00 UTC
 * Guarda backups en Firebase Storage
 * 
 * Backup incluye:
 * - Usuarios registrados
 * - Citas previas
 * - Notificaciones enviadas
 * - Configuración del sistema
 */
export const createDailyBackup = functions.pubsub
  .schedule('0 2 * * *') // Diariamente a las 02:00 UTC
  .timeZone('Europe/Madrid')
  .onRun(async (context) => {
    try {
      console.log('🔄 Iniciando backup automático diario...');
      
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

      // Backup de citas previas (desde localStorage, guardar en Firestore)
      // Nota: Las citas están en localStorage del frontend, aquí guardamos la estructura
      backupData.collections.appointments = {
        note: 'Las citas previas se guardan en localStorage del frontend. Este backup guarda la estructura de datos.'
      };

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




