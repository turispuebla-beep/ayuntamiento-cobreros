"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBackup = exports.backupAppointmentsTask = exports.sendPushNotification = exports.sendEmail = exports.uploadAppointmentAttachment = exports.deleteAppointment = exports.updateAppointmentStatus = exports.getAppointments = exports.createAppointment = void 0;
const functions = __importStar(require("firebase-functions/v1"));
const admin = __importStar(require("firebase-admin"));
const nodemailer = __importStar(require("nodemailer"));
const cors_1 = __importDefault(require("cors"));
// Inicializar Firebase Admin
admin.initializeApp();
// Configurar CORS
const corsHandler = (0, cors_1.default)({ origin: true });
// Verificar si el usuario está autenticado y es admin
async function verifyAdmin(req) {
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
        // Verificar rol de admin (puede estar en customClaims o en Firestore)
        const isAdmin = decodedToken.admin === true ||
            decodedToken.role === 'admin' ||
            decodedToken.role === 'super_admin' ||
            (userData && (userData.isAdmin === true || userData.role === 'admin' || userData.role === 'super_admin'));
        if (!isAdmin) {
            return { valid: false, error: 'No tiene permisos de administrador' };
        }
        return {
            valid: true,
            uid: decodedToken.uid,
            email: decodedToken.email || undefined
        };
    }
    catch (error) {
        console.error('Error verificando admin:', error);
        return { valid: false, error: 'Token inválido o expirado' };
    }
}
// Verificar si el usuario está autenticado (no requiere admin)
async function verifyAuth(req) {
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
    }
    catch (error) {
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
exports.createAppointment = functions.https.onRequest((req, res) => {
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
            const appointmentRef = await admin.firestore().collection('appointments').add(Object.assign(Object.assign({}, appointmentData), { status: 'pending', createdAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp(), createdBy: authCheck.uid, createdByEmail: authCheck.email }));
            console.log(`✅ Cita creada: ${appointmentRef.id}`);
            // Enviar email de confirmación
            try {
                const transporter = createTransporter();
                await transporter.sendMail({
                    from: `"Cita / Aviso Ayto Cobreros" <${APPOINTMENT_EMAIL}>`,
                    to: appointmentData.email,
                    subject: 'Confirmación de Cita Previa - Ayuntamiento de Cobreros',
                    html: generateAppointmentConfirmationHTML(Object.assign(Object.assign({}, appointmentData), { appointmentId: appointmentRef.id })),
                    text: generateAppointmentConfirmationText(Object.assign(Object.assign({}, appointmentData), { appointmentId: appointmentRef.id }))
                });
                console.log(`✅ Email de confirmación enviado a ${appointmentData.email}`);
            }
            catch (emailError) {
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
                    html: generateAdminNotificationHTML(Object.assign(Object.assign({}, appointmentData), { appointmentId: appointmentRef.id })),
                    text: generateAdminNotificationText(Object.assign(Object.assign({}, appointmentData), { appointmentId: appointmentRef.id }))
                });
                console.log(`✅ Notificación a administradores enviada`);
            }
            catch (emailError) {
                console.error('Error notificando a administradores:', emailError);
            }
            return res.status(200).json({
                success: true,
                appointmentId: appointmentRef.id,
                message: 'Cita creada correctamente'
            });
        }
        catch (error) {
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
exports.getAppointments = functions.https.onRequest((req, res) => {
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
            let appointmentsQuery = admin.firestore().collection('appointments');
            // Si no es admin, solo ver sus propias citas
            if (!isAdmin) {
                appointmentsQuery = appointmentsQuery.where('createdBy', '==', authCheck.uid);
            }
            // Ordenar por fecha de creación descendente
            appointmentsQuery = appointmentsQuery.orderBy('createdAt', 'desc');
            // Límite opcional
            const limit = req.query.limit ? parseInt(req.query.limit) : 100;
            appointmentsQuery = appointmentsQuery.limit(limit);
            const snapshot = await appointmentsQuery.get();
            const appointments = snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
            return res.status(200).json({
                success: true,
                appointments,
                count: appointments.length
            });
        }
        catch (error) {
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
exports.updateAppointmentStatus = functions.https.onRequest((req, res) => {
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
            const appointmentData = appointmentDoc.data();
            await appointmentRef.update(Object.assign({ status, updatedAt: admin.firestore.FieldValue.serverTimestamp(), updatedBy: adminCheck.uid, updatedByEmail: adminCheck.email }, (notes && { notes })));
            // Enviar email de notificación de cambio de estado si es necesario
            if (status === 'confirmed' || status === 'cancelled') {
                try {
                    const transporter = createTransporter();
                    await transporter.sendMail({
                        from: `"Cita / Aviso Ayto Cobreros" <${APPOINTMENT_EMAIL}>`,
                        to: appointmentData.email,
                        subject: `Actualización de Cita Previa - ${status === 'confirmed' ? 'Confirmada' : 'Cancelada'}`,
                        html: generateStatusChangeHTML(Object.assign(Object.assign({}, appointmentData), { status,
                            appointmentId })),
                        text: generateStatusChangeText(Object.assign(Object.assign({}, appointmentData), { status,
                            appointmentId }))
                    });
                    console.log(`✅ Email de actualización enviado a ${appointmentData.email}`);
                }
                catch (emailError) {
                    console.error('Error enviando email de actualización:', emailError);
                }
            }
            console.log(`✅ Cita ${appointmentId} actualizada a estado: ${status}`);
            return res.status(200).json({
                success: true,
                message: 'Estado de cita actualizado correctamente'
            });
        }
        catch (error) {
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
exports.deleteAppointment = functions.https.onRequest((req, res) => {
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
            const appointmentData = appointmentDoc.data();
            // Eliminar adjuntos en Storage si existen
            if (appointmentData.attachment && appointmentData.attachment.storagePath) {
                try {
                    const bucket = admin.storage().bucket();
                    const file = bucket.file(appointmentData.attachment.storagePath);
                    await file.delete();
                    console.log(`✅ Adjunto eliminado: ${appointmentData.attachment.storagePath}`);
                }
                catch (storageError) {
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
        }
        catch (error) {
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
exports.uploadAppointmentAttachment = functions.https.onRequest((req, res) => {
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
            let fileBuffer;
            if (typeof file.data === 'string') {
                fileBuffer = Buffer.from(file.data, 'base64');
            }
            else {
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
        }
        catch (error) {
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
exports.sendEmail = functions
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
        }
        catch (error) {
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
exports.sendPushNotification = functions.https.onRequest((req, res) => {
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
            let usersToNotify = [];
            if (scope === 'localities' && localities && Array.isArray(localities) && localities.length > 0) {
                usersSnapshot.forEach(doc => {
                    const userData = doc.data();
                    const userLocalities = userData.localities || [];
                    // Verificar si el usuario está en alguna de las localidades seleccionadas
                    const userInLocalities = localities.some((locality) => userLocalities.includes(locality));
                    if (userInLocalities && userData.fcmToken) {
                        usersToNotify.push(doc);
                    }
                });
            }
            else {
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
            const invalidTokens = [];
            // Procesar en lotes
            for (let i = 0; i < usersToNotify.length; i += BATCH_SIZE) {
                const batch = usersToNotify.slice(i, i + BATCH_SIZE);
                const tokens = batch.map(doc => doc.data().fcmToken).filter(Boolean);
                if (tokens.length === 0)
                    continue;
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
                            priority: 'high',
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
                            var _a, _b;
                            if (resp.success) {
                                sentCount++;
                            }
                            else {
                                failedCount++;
                                // Detectar tokens inválidos
                                if (((_a = resp.error) === null || _a === void 0 ? void 0 : _a.code) === 'messaging/invalid-registration-token' ||
                                    ((_b = resp.error) === null || _b === void 0 ? void 0 : _b.code) === 'messaging/registration-token-not-registered') {
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
                }
                catch (error) {
                    console.error('❌ Error en batch:', error);
                    failedCount += tokens.length;
                }
            }
            // Limpiar tokens inválidos de la base de datos
            if (invalidTokens.length > 0) {
                console.log(`🧹 Limpiando ${invalidTokens.length} tokens inválidos`);
                const cleanPromises = usersToNotify
                    .filter(doc => invalidTokens.includes(doc.data().fcmToken))
                    .map(doc => doc.ref.update({
                    fcmToken: admin.firestore.FieldValue.delete(),
                    lastNotificationError: 'Token inválido',
                    notificationConsent: false
                }).catch(err => console.error('Error limpiando token:', err)));
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
        }
        catch (error) {
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
function generateAppointmentConfirmationHTML(data) {
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
function generateAppointmentConfirmationText(data) {
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
function generateAdminNotificationHTML(data) {
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
function generateAdminNotificationText(data) {
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
function generateStatusChangeHTML(data) {
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
            .header { background-color: ${statusColor[data.status] || '#2c3e50'}; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .appointment-details { background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid ${statusColor[data.status] || '#2c3e50'}; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>📅 Actualización de Cita Previa</h1>
                <h2>Estado: ${statusText[data.status] || data.status}</h2>
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
                        <li><strong>Estado:</strong> <strong style="color: ${statusColor[data.status] || '#2c3e50'};">${statusText[data.status] || data.status}</strong></li>
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
function generateStatusChangeText(data) {
    const statusText = {
        'pending': 'Pendiente',
        'confirmed': 'Confirmada',
        'cancelled': 'Cancelada',
        'completed': 'Completada',
        'no_show': 'No se presentó'
    };
    return `
📅 Actualización de Cita Previa
Estado: ${statusText[data.status] || data.status}

Estimado/a ${data.name},

Le informamos que el estado de su cita previa ha sido actualizado.

📋 Detalles de la cita:
- Servicio: ${data.service}
- Fecha: ${data.date || data.dateFormatted || 'No especificada'}
- Hora: ${data.time || 'No especificada'}
- Estado: ${statusText[data.status] || data.status}
- ID de Cita: ${data.appointmentId || data.id}

Si tiene alguna pregunta, no dude en contactarnos.

Atentamente,
Ayuntamiento de Cobreros

---
Este es un email automático. Por favor, no responda a este mensaje.
  `;
}
function generateNoShowHTML(data) {
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
function generateNoShowText(data) {
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
function generateGeneralNoticeHTML(data) {
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
function generateGeneralNoticeText(data) {
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
exports.backupAppointmentsTask = functions.pubsub
    .schedule('every day 02:00')
    .timeZone('UTC')
    .onRun(async (context) => {
    try {
        console.log('🔄 Iniciando backup automático...');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupDate = new Date().toISOString().split('T')[0];
        // Recolectar datos
        const backupData = {
            timestamp: new Date().toISOString(),
            backupDate: backupDate,
            collections: {}
        };
        // Backup de usuarios
        const usersSnapshot = await admin.firestore().collection('users').get();
        backupData.collections.users = usersSnapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        console.log(`✅ Usuarios: ${usersSnapshot.size} documentos`);
        // Backup de citas previas desde Firestore
        const appointmentsSnapshot = await admin.firestore().collection('appointments').get();
        backupData.collections.appointments = appointmentsSnapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        console.log(`✅ Citas previas: ${appointmentsSnapshot.size} documentos`);
        // Backup de estadísticas de notificaciones
        const statsSnapshot = await admin.firestore()
            .collection('notification_stats')
            .orderBy('timestamp', 'desc')
            .limit(1000)
            .get();
        backupData.collections.notification_stats = statsSnapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        console.log(`✅ Estadísticas: ${statsSnapshot.size} documentos`);
        // Backup de administradores (solo estructura, sin contraseñas)
        const adminsSnapshot = await admin.firestore().collection('admins').get();
        backupData.collections.admins = adminsSnapshot.docs.map(doc => {
            const data = doc.data();
            // No incluir contraseñas en el backup
            delete data.password;
            return Object.assign({ id: doc.id }, data);
        });
        console.log(`✅ Administradores: ${adminsSnapshot.size} documentos`);
        // Guardar backup en Firestore
        const backupRef = await admin.firestore().collection('backups').add(Object.assign(Object.assign({}, backupData), { createdAt: admin.firestore.FieldValue.serverTimestamp(), size: JSON.stringify(backupData).length, collectionsCount: {
                users: backupData.collections.users.length,
                appointments: backupData.collections.appointments.length,
                notification_stats: backupData.collections.notification_stats.length,
                admins: backupData.collections.admins.length
            } }));
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
            if (!timeCreated)
                return false;
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
    }
    catch (error) {
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
exports.createBackup = functions.https.onRequest((req, res) => {
    return corsHandler(req, res, async () => {
        if (req.method !== 'POST') {
            return res.status(405).json({ error: 'Método no permitido' });
        }
        try {
            console.log('🔄 Iniciando backup manual...');
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupDate = new Date().toISOString().split('T')[0];
            // Recolectar datos (mismo proceso que backup automático)
            const backupData = {
                timestamp: new Date().toISOString(),
                backupDate: backupDate,
                type: 'manual',
                collections: {}
            };
            // Backup de usuarios
            const usersSnapshot = await admin.firestore().collection('users').get();
            backupData.collections.users = usersSnapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
            // Backup de citas previas desde Firestore
            const appointmentsSnapshot = await admin.firestore().collection('appointments').get();
            backupData.collections.appointments = appointmentsSnapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
            // Backup de estadísticas
            const statsSnapshot = await admin.firestore()
                .collection('notification_stats')
                .orderBy('timestamp', 'desc')
                .limit(1000)
                .get();
            backupData.collections.notification_stats = statsSnapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
            // Backup de administradores (sin contraseñas)
            const adminsSnapshot = await admin.firestore().collection('admins').get();
            backupData.collections.admins = adminsSnapshot.docs.map(doc => {
                const data = doc.data();
                delete data.password;
                return Object.assign({ id: doc.id }, data);
            });
            // Guardar en Firestore
            const backupRef = await admin.firestore().collection('backups').add(Object.assign(Object.assign({}, backupData), { createdAt: admin.firestore.FieldValue.serverTimestamp(), size: JSON.stringify(backupData).length }));
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
        }
        catch (error) {
            console.error('❌ Error en backup manual:', error);
            return res.status(500).json({
                success: false,
                error: 'Error interno del servidor',
                details: error.message
            });
        }
    });
});
//# sourceMappingURL=index.js.map