// 🔥 Firebase Functions - Ayuntamiento de Cobreros
// Funciones para validar reCAPTCHA y manejar notificaciones

const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');
const axios = require('axios');

// Inicializar Firebase Admin
admin.initializeApp();

// Remitente Brevo (debe estar verificado en Brevo). Params CLI alternativos no disponibles en todas las versiones.
const DEFAULT_EMAIL_FROM = 'aytocobreroscitaprevia@gmail.com';
const DEFAULT_EMAIL_FROM_NAME = 'Ayuntamiento de Cobreros';

async function getAuthContext(req) {
    const authHeader = req.headers.authorization || req.headers.Authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
        const err = new Error('Falta token Bearer');
        err.status = 401;
        throw err;
    }
    const idToken = authHeader.substring('Bearer '.length).trim();
    if (!idToken) {
        const err = new Error('Token vacío');
        err.status = 401;
        throw err;
    }
    const decoded = await admin.auth().verifyIdToken(idToken);
    return decoded;
}

async function assertAdminByUid(uid) {
    const snap = await admin.firestore().collection('admins').doc(uid).get();
    if (!snap.exists) {
        const err = new Error('Usuario sin perfil admin');
        err.status = 403;
        throw err;
    }
    const d = snap.data() || {};
    const isAdmin = d.isAdmin === true || d.isSuperAdmin === true || d.role === 'admin' || d.role === 'super_admin';
    if (!isAdmin) {
        const err = new Error('Permisos insuficientes');
        err.status = 403;
        throw err;
    }
    return d;
}

// Secreto Brevo: firebase functions:secrets:set BREVO_API_KEY — notifyAppointmentEvent usa runWith({ secrets }).
// reCAPTCHA: sin runWith por ahora (no bloquea deploy). Cuando tengas la clave en Google reCAPTCHA:
//   firebase functions:secrets:set RECAPTCHA_SECRET_KEY --data-file clave.txt
//   y vuelve a envolver validateRecaptcha con .runWith({ secrets: ['RECAPTCHA_SECRET_KEY'] }).

/**
 * 🛡️ Validar token de reCAPTCHA v3
 * Endpoint: https://us-central1-ayuntamiento-de-cobreros.cloudfunctions.net/validateRecaptcha
 * Secreto: firebase functions:secrets:set RECAPTCHA_SECRET_KEY
 */
exports.validateRecaptcha = functions
    .runWith({ secrets: ['RECAPTCHA_SECRET_KEY'] })
    .https.onRequest(async (req, res) => {
    // Configurar CORS
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

    // Manejar preflight OPTIONS
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }

    // Solo permitir POST
    if (req.method !== 'POST') {
        res.status(405).json({ 
            success: false, 
            error: 'Método no permitido' 
        });
        return;
    }

    try {
        const { token, action } = req.body;

        // Validar parámetros
        if (!token || !action) {
            res.status(400).json({
                success: false,
                error: 'Token y acción son requeridos'
            });
            return;
        }

        // Verificar que la clave secreta esté configurada
        const recaptchaSecret = process.env.RECAPTCHA_SECRET_KEY;
        if (!recaptchaSecret) {
            console.error('⚠️ RECAPTCHA_SECRET_KEY no configurada');
            res.status(500).json({
                success: false,
                error:
                'reCAPTCHA aún no activo en el servidor. Configura el secreto RECAPTCHA_SECRET_KEY y runWith en esta función cuando lo actives.'
            });
            return;
        }

        console.log(`🛡️ Validando reCAPTCHA para acción: ${action}`);

        // Llamar a la API de Google reCAPTCHA
        const verificationUrl = 'https://www.google.com/recaptcha/api/siteverify';
        const verificationResponse = await axios.post(verificationUrl, null, {
            params: {
                secret: recaptchaSecret,
                response: token
            }
        });

        const { success, score, action: responseAction, hostname } = verificationResponse.data;

        console.log(`📊 reCAPTCHA Score: ${score}, Success: ${success}, Action: ${responseAction}`);

        // Validar respuesta
        if (!success) {
            res.status(400).json({
                success: false,
                error: 'Token de reCAPTCHA inválido',
                details: verificationResponse.data
            });
            return;
        }

        // Validar acción
        if (responseAction !== action) {
            res.status(400).json({
                success: false,
                error: 'Acción de reCAPTCHA no coincide'
            });
            return;
        }

        // Validar puntuación (para v3)
        const minScore = 0.5;
        if (score < minScore) {
            console.log(`❌ Score muy bajo: ${score} < ${minScore}`);
            res.status(400).json({
                success: false,
                error: 'Puntuación de reCAPTCHA muy baja',
                score: score
            });
            return;
        }

        // Todo válido
        console.log(`✅ reCAPTCHA válido - Score: ${score}`);
        
        // Registrar en Firestore para estadísticas
        await admin.firestore().collection('recaptcha_logs').add({
            action: action,
            score: score,
            success: true,
            hostname: hostname,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            ip: req.ip
        });

        res.status(200).json({
            success: true,
            score: score,
            action: action,
            message: 'reCAPTCHA verificado correctamente'
        });

    } catch (error) {
        console.error('❌ Error validando reCAPTCHA:', error);
        
        // Registrar error en Firestore
        try {
            await admin.firestore().collection('recaptcha_logs').add({
                action: req.body?.action || 'unknown',
                success: false,
                error: error.message,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                ip: req.ip
            });
        } catch (logError) {
            console.error('Error registrando log:', logError);
        }

        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

/**
 * 📊 Obtener estadísticas de reCAPTCHA (solo para administradores)
 * Endpoint: https://us-central1-ayuntamiento-de-cobreros.cloudfunctions.net/getRecaptchaStats
 */
exports.getRecaptchaStats = functions.https.onRequest(async (req, res) => {
    // Configurar CORS
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }

    if (req.method !== 'GET') {
        res.status(405).json({ error: 'Método no permitido' });
        return;
    }

    try {
        const auth = await getAuthContext(req);
        await assertAdminByUid(auth.uid);

        const logsRef = admin.firestore().collection('recaptcha_logs');
        
        // Estadísticas de los últimos 30 días
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const snapshot = await logsRef
            .where('timestamp', '>=', thirtyDaysAgo)
            .orderBy('timestamp', 'desc')
            .limit(1000)
            .get();

        const stats = {
            total: snapshot.size,
            successful: 0,
            failed: 0,
            averageScore: 0,
            actionBreakdown: {},
            dailyBreakdown: {}
        };

        let totalScore = 0;
        let scoreCount = 0;

        snapshot.forEach(doc => {
            const data = doc.data();
            
            if (data.success) {
                stats.successful++;
                if (data.score !== undefined) {
                    totalScore += data.score;
                    scoreCount++;
                }
            } else {
                stats.failed++;
            }

            // Breakdown por acción
            const action = data.action || 'unknown';
            if (!stats.actionBreakdown[action]) {
                stats.actionBreakdown[action] = { success: 0, failed: 0 };
            }
            if (data.success) {
                stats.actionBreakdown[action].success++;
            } else {
                stats.actionBreakdown[action].failed++;
            }

            // Breakdown diario
            if (data.timestamp) {
                const date = data.timestamp.toDate().toISOString().split('T')[0];
                if (!stats.dailyBreakdown[date]) {
                    stats.dailyBreakdown[date] = { success: 0, failed: 0 };
                }
                if (data.success) {
                    stats.dailyBreakdown[date].success++;
                } else {
                    stats.dailyBreakdown[date].failed++;
                }
            }
        });

        if (scoreCount > 0) {
            stats.averageScore = totalScore / scoreCount;
        }

        res.status(200).json(stats);

    } catch (error) {
        console.error('❌ Error obteniendo estadísticas:', error);
        const status = error?.status || 500;
        res.status(status).json({ error: error?.message || 'Error interno del servidor' });
    }
});

/**
 * 📱 Enviar notificaciones push masivas
 * Endpoint: https://us-central1-ayuntamiento-de-cobreros.cloudfunctions.net/sendPushNotification
 */
exports.sendPushNotification = functions.https.onRequest(async (req, res) => {
    // Configurar CORS
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Método no permitido' });
        return;
    }

    try {
        const auth = await getAuthContext(req);
        await assertAdminByUid(auth.uid);

        const { title, message, type, targetUsers, localities } = req.body;

        // Validar parámetros
        if (!title || !message) {
            res.status(400).json({
                success: false,
                error: 'Título y mensaje son requeridos'
            });
            return;
        }

        console.log(`📱 Enviando notificación: "${title}"`);

        const localityFilter = Array.isArray(localities)
            ? localities.map((l) => String(l).trim()).filter(Boolean)
            : [];

        let usersQuery = admin.firestore()
            .collection('users')
            .where('notificationConsent', '==', true)
            .where('fcmToken', '!=', '');

        let usersSnapshot;
        // array-contains-any admite máximo 10 valores; si hay más, filtramos en memoria
        if (localityFilter.length > 0 && localityFilter.length <= 10) {
            usersSnapshot = await usersQuery.where('localities', 'array-contains-any', localityFilter).get();
        } else {
            usersSnapshot = await usersQuery.get();
        }

        const tokens = [];
        const users = [];

        usersSnapshot.forEach(doc => {
            const userData = doc.data();
            if (!userData.fcmToken) {
                return;
            }
            if (localityFilter.length > 0) {
                const userLocs = Array.isArray(userData.localities) ? userData.localities : [];
                const matches = userLocs.some((loc) => localityFilter.includes(loc));
                if (!matches) {
                    return;
                }
            }
            tokens.push(userData.fcmToken);
            users.push({
                id: doc.id,
                email: userData.email,
                fcmToken: userData.fcmToken
            });
        });

        if (tokens.length === 0) {
            res.status(200).json({
                success: true,
                message: 'No hay usuarios con notificaciones activadas para esas localidades',
                sent: 0
            });
            return;
        }

        // Preparar payload de notificación
        const payload = {
            notification: {
                title: title,
                body: message,
                icon: '/images/escudo-cobreros-192.png'
            },
            data: {
                type: type || 'general',
                title: String(title),
                message: String(message),
                localities: localityFilter.join(', '),
                timestamp: new Date().toISOString(),
                source: 'ayuntamiento-cobreros'
            },
            webpush: {
                notification: {
                    icon: '/images/escudo-cobreros-192.png',
                    badge: '/images/escudo-cobreros-192.png',
                    requireInteraction: true
                }
            }
        };

        // Enviar notificaciones en lotes (máximo 500 por lote)
        const batchSize = 500;
        let totalSent = 0;
        let totalFailed = 0;

        for (let i = 0; i < tokens.length; i += batchSize) {
            const batchTokens = tokens.slice(i, i + batchSize);
            
            try {
                const response = await admin.messaging().sendToDevice(batchTokens, payload);
                
                // Contar éxitos y fallos
                response.results.forEach((result, index) => {
                    if (result.error) {
                        console.error(`Error enviando a token ${batchTokens[index]}:`, result.error);
                        totalFailed++;
                    } else {
                        totalSent++;
                    }
                });

                // Guardar notificación en Firestore para cada usuario
                const batch = admin.firestore().batch();
                users.slice(i, i + batchSize).forEach((user, index) => {
                    const result = response.results[index];
                    if (!result.error) {
                        const notificationRef = admin.firestore().collection('notifications').doc();
                        batch.set(notificationRef, {
                            userId: user.id,
                            userEmail: user.email,
                            title: title,
                            message: message,
                            type: type || 'general',
                            timestamp: admin.firestore.FieldValue.serverTimestamp(),
                            read: false,
                            sentFrom: 'FIREBASE_FUNCTION',
                            sentTo: 'ALL',
                            fcmToken: user.fcmToken,
                            localities: localityFilter,
                            targetPueblos: localityFilter,
                            scope: localityFilter.length > 0 ? 'localidades' : 'general'
                        });
                    }
                });
                
                await batch.commit();

            } catch (error) {
                console.error('Error enviando lote de notificaciones:', error);
                totalFailed += batchTokens.length;
            }
        }

        console.log(`✅ Notificación enviada: ${totalSent} exitosas, ${totalFailed} fallidas`);

        res.status(200).json({
            success: true,
            message: 'Notificaciones enviadas',
            sent: totalSent,
            failed: totalFailed,
            total: tokens.length
        });

    } catch (error) {
        console.error('❌ Error enviando notificaciones push:', error);
        const status = error?.status || 500;
        res.status(status).json({
            success: false,
            error: error?.message || 'Error interno del servidor'
        });
    }
});

/**
 * 🛠️ Migrar esquema de notificaciones antiguas a formato unificado
 * Endpoint: https://us-central1-ayuntamiento-de-cobreros.cloudfunctions.net/migrateNotificationsSchema
 * Solo administradores autenticados.
 */
exports.migrateNotificationsSchema = functions.https.onRequest(async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    if (req.method !== 'POST') {
        res.status(405).json({ success: false, error: 'Método no permitido' });
        return;
    }

    try {
        const auth = await getAuthContext(req);
        await assertAdminByUid(auth.uid);

        const notificationsRef = admin.firestore().collection('notifications');
        let lastDoc = null;
        let scanned = 0;
        let updated = 0;
        const pageSize = 400;

        while (true) {
            let query = notificationsRef.orderBy(admin.firestore.FieldPath.documentId()).limit(pageSize);
            if (lastDoc) {
                query = query.startAfter(lastDoc);
            }
            const page = await query.get();
            if (page.empty) {
                break;
            }

            const batch = admin.firestore().batch();

            page.docs.forEach((doc) => {
                scanned++;
                const data = doc.data() || {};
                const patch = {};

                if (!data.sentTo || data.sentTo === 'WEB' || data.sentTo === 'APK') {
                    patch.sentTo = 'ALL';
                }

                const localitiesArray = Array.isArray(data.localities)
                    ? data.localities.filter(Boolean)
                    : [];
                const targetArray = Array.isArray(data.targetPueblos)
                    ? data.targetPueblos.filter(Boolean)
                    : [];

                if (!Array.isArray(data.targetPueblos) || targetArray.length === 0) {
                    if (localitiesArray.length > 0) {
                        patch.targetPueblos = localitiesArray;
                    } else if (typeof data.localities === 'string' && data.localities.trim()) {
                        patch.targetPueblos = data.localities
                            .split(',')
                            .map((s) => s.trim())
                            .filter(Boolean);
                    }
                }

                if ((!Array.isArray(data.localities) || data.localities.length === 0) && targetArray.length > 0) {
                    patch.localities = targetArray;
                }

                if (!data.attachmentUrl && data.documentUrl) {
                    patch.attachmentUrl = data.documentUrl;
                }
                if (data.attachmentUrl && !data.hasAttachments) {
                    patch.hasAttachments = true;
                }

                if (Object.keys(patch).length > 0) {
                    batch.set(doc.ref, patch, { merge: true });
                    updated++;
                }
            });

            await batch.commit();
            lastDoc = page.docs[page.docs.length - 1];
            if (page.size < pageSize) {
                break;
            }
        }

        res.status(200).json({
            success: true,
            message: 'Migración de notificaciones completada',
            scanned,
            updated
        });
    } catch (error) {
        console.error('❌ Error en migración de notificaciones:', error);
        const status = error?.status || 500;
        res.status(status).json({ success: false, error: error?.message || 'Error interno del servidor' });
    }
});

/**
 * 🧹 Limpiar logs antiguos de reCAPTCHA (ejecutar diariamente)
 * Ejecuta automáticamente cada día a las 02:00
 */
exports.cleanupRecaptchaLogs = functions.pubsub
    .schedule('0 2 * * *')
    .timeZone('Europe/Madrid')
    .onRun(async (context) => {
        console.log('🧹 Iniciando limpieza de logs de reCAPTCHA...');

        try {
            const logsRef = admin.firestore().collection('recaptcha_logs');
            
            // Eliminar logs de más de 90 días
            const ninetyDaysAgo = new Date();
            ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

            const oldLogsSnapshot = await logsRef
                .where('timestamp', '<', ninetyDaysAgo)
                .limit(500) // Procesar en lotes
                .get();

            if (oldLogsSnapshot.empty) {
                console.log('✅ No hay logs antiguos para eliminar');
                return;
            }

            const batch = admin.firestore().batch();
            oldLogsSnapshot.forEach(doc => {
                batch.delete(doc.ref);
            });

            await batch.commit();
            console.log(`✅ Eliminados ${oldLogsSnapshot.size} logs antiguos`);

        } catch (error) {
            console.error('❌ Error en limpieza de logs:', error);
        }
    });

/**
 * 📦 Backup automático de contenido (ejecutar cada 6 horas)
 * Ejecuta automáticamente cada 6 horas para mantener backups actualizados
 */
exports.automaticContentBackup = functions.pubsub
    .schedule('0 */6 * * *')
    .timeZone('Europe/Madrid')
    .onRun(async (context) => {
        console.log('📦 Iniciando backup automático de contenido...');

        try {
            // Crear backup de metadatos del sistema
            const backupMetadata = {
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                source: 'AUTOMATIC_BACKUP',
                version: '1.0',
                environment: 'production'
            };

            // Guardar metadatos del backup
            await admin.firestore().collection('backups').doc('metadata').set(backupMetadata);
            
            console.log('✅ Backup automático completado');

        } catch (error) {
            console.error('❌ Error en backup automático:', error);
        }
    });

/**
 * 🔄 Limpiar backups antiguos (ejecutar semanalmente)
 * Ejecuta automáticamente cada domingo a las 03:00
 */
exports.cleanupOldBackups = functions.pubsub
    .schedule('0 3 * * 0')
    .timeZone('Europe/Madrid')
    .onRun(async (context) => {
        console.log('🔄 Iniciando limpieza de backups antiguos...');

        try {
            const backupsRef = admin.firestore().collection('backups');
            
            // Eliminar backups de más de 30 días
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const oldBackupsSnapshot = await backupsRef
                .where('lastBackup', '<', thirtyDaysAgo)
                .limit(100) // Procesar en lotes
                .get();

            if (oldBackupsSnapshot.empty) {
                console.log('✅ No hay backups antiguos para eliminar');
                return;
            }

            const batch = admin.firestore().batch();
            oldBackupsSnapshot.forEach(doc => {
                // No eliminar backups críticos
                if (!['bandos', 'noticias', 'eventos', 'configuraciones', 'localStorage_completo', 'metadata'].includes(doc.id)) {
                    batch.delete(doc.ref);
                }
            });

            await batch.commit();
            console.log(`✅ Limpieza de backups completada`);

        } catch (error) {
            console.error('❌ Error en limpieza de backups:', error);
        }
    });

/**
 * 📊 Obtener estadísticas de backup
 * Endpoint: https://us-central1-ayuntamiento-de-cobreros.cloudfunctions.net/getBackupStats
 */
exports.getBackupStats = functions.https.onRequest(async (req, res) => {
    // Configurar CORS
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }

    if (req.method !== 'GET') {
        res.status(405).json({ error: 'Método no permitido' });
        return;
    }

    try {
        const backupsRef = admin.firestore().collection('backups');
        const snapshot = await backupsRef.get();

        const stats = {
            totalBackups: 0,
            backupTypes: {},
            lastBackup: null,
            oldestBackup: null,
            totalSize: 0
        };

        snapshot.forEach(doc => {
            const data = doc.data();
            stats.totalBackups++;
            
            // Contar por tipo
            const source = data.source || 'unknown';
            stats.backupTypes[source] = (stats.backupTypes[source] || 0) + 1;
            
            // Encontrar último y más antiguo backup
            if (data.lastBackup) {
                const backupTime = data.lastBackup.toDate();
                if (!stats.lastBackup || backupTime > stats.lastBackup) {
                    stats.lastBackup = backupTime;
                }
                if (!stats.oldestBackup || backupTime < stats.oldestBackup) {
                    stats.oldestBackup = backupTime;
                }
            }
        });

        res.status(200).json(stats);

    } catch (error) {
        console.error('❌ Error obteniendo estadísticas de backup:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

/**
 * ✉️ Notificaciones reales de citas previas por email (Brevo API)
 * Configuración (params/secrets):
 * firebase functions:secrets:set BREVO_API_KEY
 * Remitente: constantes DEFAULT_EMAIL_FROM / DEFAULT_EMAIL_FROM_NAME en este archivo.
 */
exports.notifyAppointmentEvent = functions
    .runWith({ secrets: ['BREVO_API_KEY'] })
    .https.onRequest(async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    if (req.method !== 'POST') {
        res.status(405).json({ success: false, error: 'Método no permitido' });
        return;
    }

    const brevoApiKey = process.env.BREVO_API_KEY;
    const fromEmail = DEFAULT_EMAIL_FROM;
    const fromName = DEFAULT_EMAIL_FROM_NAME;
    const ADMIN_EMAIL = 'aytocobreros@gmail.com';

    try {
        const auth = await getAuthContext(req);
        const { eventType, appointment, oldStatus } = req.body || {};
        if (!eventType || !appointment || !appointment.email) {
            res.status(400).json({ success: false, error: 'eventType y appointment son requeridos' });
            return;
        }
        if (eventType === 'created') {
            if (!appointment.userId || appointment.userId !== auth.uid) {
                res.status(403).json({ success: false, error: 'No autorizado para crear este evento de cita' });
                return;
            }
        } else if (eventType === 'status_changed') {
            await assertAdminByUid(auth.uid);
        }

        const serviceNameMap = {
            empadronamiento: 'Empadronamiento',
            certificados: 'Certificados',
            multas: 'Consulta de multas',
            otros: 'Otros trámites'
        };
        const serviceName = serviceNameMap[appointment.service] || appointment.service || 'Trámite municipal';

        let userSubject = '';
        let userBody = '';
        let adminSubject = '';
        let adminBody = '';

        if (eventType === 'created') {
            userSubject = 'Confirmación de solicitud de cita previa';
            userBody = `
Estimado/a ${appointment.name || ''},

Hemos recibido su solicitud de cita previa:
- Servicio: ${serviceName}
- Fecha preferida: ${appointment.date || '-'}
- Hora preferida: ${appointment.time || '-'}

Le contactaremos para confirmar la cita.

Ayuntamiento de Cobreros
            `.trim();

            adminSubject = 'Nueva solicitud de cita previa';
            adminBody = `
Nueva solicitud de cita recibida:
- Nombre: ${appointment.name || '-'}
- Email: ${appointment.email || '-'}
- Teléfono: ${appointment.phone || '-'}
- DNI: ${appointment.dni || '-'}
- Servicio: ${serviceName}
- Fecha: ${appointment.date || '-'}
- Hora: ${appointment.time || '-'}
- Comentarios: ${appointment.comments || 'Ninguno'}
            `.trim();
        } else if (eventType === 'status_changed') {
            const statusLabel = appointment.status || 'pending';
            userSubject = `Actualización de estado de su cita: ${statusLabel}`;
            userBody = `
Estimado/a ${appointment.name || ''},

El estado de su cita ha cambiado:
- Estado anterior: ${oldStatus || '-'}
- Estado actual: ${appointment.status || '-'}
- Servicio: ${serviceName}
- Fecha: ${appointment.date || '-'}
- Hora: ${appointment.time || '-'}

Ayuntamiento de Cobreros
            `.trim();

            adminSubject = `Estado de cita actualizado (${appointment.status || '-'})`;
            adminBody = `
Actualización de cita:
- Nombre: ${appointment.name || '-'}
- Email: ${appointment.email || '-'}
- Estado anterior: ${oldStatus || '-'}
- Estado actual: ${appointment.status || '-'}
- Fecha: ${appointment.date || '-'} ${appointment.time || ''}
            `.trim();
        } else {
            res.status(400).json({ success: false, error: 'eventType no soportado' });
            return;
        }

        if (!brevoApiKey) {
            console.warn('BREVO API key no configurada; se registra en logs sin envío real');
            console.log({ eventType, userSubject, adminSubject, appointment });
            res.status(200).json({
                success: true,
                mode: 'log-only',
                message: 'Evento procesado sin envío real (falta brevo.api_key)'
            });
            return;
        }

        const sendEmail = async (toEmail, toName, subject, textContent) => {
            return axios.post(
                'https://api.brevo.com/v3/smtp/email',
                {
                    sender: { email: fromEmail, name: fromName },
                    to: [{ email: toEmail, name: toName || '' }],
                    subject: subject,
                    textContent: textContent
                },
                {
                    headers: {
                        'api-key': brevoApiKey,
                        'Content-Type': 'application/json'
                    }
                }
            );
        };

        await Promise.all([
            sendEmail(appointment.email, appointment.name || '', userSubject, userBody),
            sendEmail(ADMIN_EMAIL, 'Ayuntamiento de Cobreros', adminSubject, adminBody)
        ]);

        res.status(200).json({ success: true, mode: 'brevo', message: 'Emails enviados' });
    } catch (error) {
        console.error('notifyAppointmentEvent error:', error?.response?.data || error.message || error);
        const status = error?.status || 500;
        res.status(status).json({ success: false, error: error?.message || 'Error enviando notificaciones de cita' });
    }
});

function normalizeServerAvailability(raw) {
    const baseSlots = ['09:00', '10:00', '11:00', '12:00', '16:00', '17:00', '18:00'];
    const enabledDays = Array.isArray(raw?.enabledDays)
        ? raw.enabledDays.map((d) => parseInt(d, 10)).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
        : [1, 2, 3, 4, 5];
    const timeSlots = Array.isArray(raw?.timeSlots)
        ? raw.timeSlots.map((slot) => String(slot).trim()).filter((slot) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(slot))
        : baseSlots;
    const slotCapacityDefault = Math.max(1, parseInt(raw?.slotCapacityDefault || 1, 10) || 1);
    const holidays = Array.isArray(raw?.holidays)
        ? raw.holidays.map((d) => String(d).trim()).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
        : [];
    const exceptionsByDate = raw?.exceptionsByDate && typeof raw.exceptionsByDate === 'object'
        ? raw.exceptionsByDate
        : {};
    return {
        enabledDays: [...new Set(enabledDays)],
        timeSlots: [...new Set(timeSlots)],
        slotCapacityDefault,
        holidays: [...new Set(holidays)],
        exceptionsByDate
    };
}

function getServerEffectiveSlots(availability, dateIso) {
    const ex = availability.exceptionsByDate?.[dateIso];
    if (ex && Array.isArray(ex.timeSlots) && ex.timeSlots.length) {
        return ex.timeSlots.map((slot) => String(slot).trim()).filter((slot) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(slot));
    }
    return availability.timeSlots;
}

function getServerCapacity(availability, dateIso, slot) {
    const ex = availability.exceptionsByDate?.[dateIso];
    if (ex?.capacityBySlot?.[slot]) {
        return Math.max(1, parseInt(ex.capacityBySlot[slot], 10) || availability.slotCapacityDefault);
    }
    if (availability?.capacityBySlot?.[slot]) {
        return Math.max(1, parseInt(availability.capacityBySlot[slot], 10) || availability.slotCapacityDefault);
    }
    return availability.slotCapacityDefault;
}

exports.createAppointmentAtomic = functions.https.onRequest(async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    if (req.method !== 'POST') {
        res.status(405).json({ success: false, error: 'Método no permitido' });
        return;
    }

    try {
        const auth = await getAuthContext(req);
        const appointment = req.body?.appointment || {};
        const date = String(appointment.date || '');
        const time = String(appointment.time || '');

        if (!date || !time || !appointment.email || !appointment.userId) {
            res.status(400).json({ success: false, errorCode: 'INVALID_INPUT', error: 'Datos de cita incompletos' });
            return;
        }
        if (String(appointment.userId) !== String(auth.uid)) {
            res.status(403).json({ success: false, errorCode: 'FORBIDDEN', error: 'No autorizado para crear cita de otro usuario' });
            return;
        }

        const selectedDate = new Date(date + 'T00:00:00');
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (Number.isNaN(selectedDate.getTime()) || selectedDate < today) {
            res.status(400).json({ success: false, errorCode: 'INVALID_DATE', error: 'Fecha inválida' });
            return;
        }

        const db = admin.firestore();
        const configRef = db.collection('configuraciones').doc('data');
        const appointmentsCol = db.collection('appointments');

        const created = await db.runTransaction(async (tx) => {
            const configSnap = await tx.get(configRef);
            const configData = configSnap.exists ? configSnap.data() : {};
            if (configData.appointmentSettings?.enabled === false) {
                const err = new Error('Citas previas desactivadas');
                err.code = 'APPOINTMENTS_DISABLED';
                throw err;
            }
            const rawAvailability = configData.appointmentAvailability || {};
            const availability = normalizeServerAvailability(rawAvailability);

            if (availability.holidays.includes(date)) {
                const err = new Error('Festivo');
                err.code = 'HOLIDAY_BLOCKED';
                throw err;
            }
            const ex = availability.exceptionsByDate?.[date];
            if (ex && ex.enabled === false) {
                const err = new Error('Día bloqueado');
                err.code = 'DAY_NOT_AVAILABLE';
                throw err;
            }
            if (!availability.enabledDays.includes(selectedDate.getDay())) {
                const err = new Error('Día fuera de agenda');
                err.code = 'DAY_NOT_AVAILABLE';
                throw err;
            }
            const effectiveSlots = getServerEffectiveSlots(availability, date);
            if (!effectiveSlots.includes(time)) {
                const err = new Error('Hora fuera de agenda');
                err.code = 'TIME_NOT_AVAILABLE';
                throw err;
            }

            const capacity = getServerCapacity(availability, date, time);
            const existingSnap = await tx.get(
                appointmentsCol
                    .where('date', '==', date)
                    .where('time', '==', time)
                    .where('status', 'in', ['pending', 'confirmed'])
            );

            if (existingSnap.size >= capacity) {
                const err = new Error('Slot completo');
                err.code = 'SLOT_FULL';
                throw err;
            }

            const payload = {
                userId: String(appointment.userId || ''),
                name: String(appointment.name || ''),
                dni: String(appointment.dni || ''),
                email: String(appointment.email || ''),
                phone: String(appointment.phone || ''),
                service: String(appointment.service || ''),
                date,
                time,
                comments: String(appointment.comments || ''),
                status: String(appointment.status || 'pending'),
                gdprConsent: !!appointment.gdprConsent,
                source: 'WEB',
                capacityUsed: existingSnap.size + 1,
                capacityMax: capacity,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            const newRef = appointmentsCol.doc();
            tx.set(newRef, payload);
            return { id: newRef.id, ...payload };
        });

        res.status(200).json({ success: true, appointment: created });
    } catch (error) {
        const code = error?.code || 'UNKNOWN';
        const mappedStatus = ['SLOT_FULL', 'DAY_NOT_AVAILABLE', 'TIME_NOT_AVAILABLE', 'HOLIDAY_BLOCKED', 'APPOINTMENTS_DISABLED'].includes(code) ? 409 : 500;
        res.status(mappedStatus).json({
            success: false,
            errorCode: code,
            error: error?.message || 'No se pudo crear la cita de forma atómica'
        });
    }
});

/**
 * Crea cuenta Firebase Auth + admins/{uid} + administrators/{uid} (solo superadmin).
 */
exports.createStaffAdmin = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Debe iniciar sesión');
    }
    const callerSnap = await admin.firestore().collection('admins').doc(context.auth.uid).get();
    const caller = callerSnap.data() || {};
    if (!caller.isSuperAdmin) {
        throw new functions.https.HttpsError(
            'permission-denied',
            'Solo el superadministrador puede crear administradores'
        );
    }
    const email = String(data.email || '').trim().toLowerCase();
    const password = String(data.password || '');
    const name = String(data.name || '').trim();
    if (!email || !password || password.length < 6) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'Email y contraseña (mín. 6 caracteres) son obligatorios'
        );
    }
    let userRecord;
    try {
        userRecord = await admin.auth().createUser({
            email,
            password,
            displayName: name || email
        });
    } catch (e) {
        if (e.code === 'auth/email-already-exists') {
            throw new functions.https.HttpsError(
                'already-exists',
                'Ese correo ya tiene cuenta en Authentication'
            );
        }
        throw new functions.https.HttpsError('internal', e.message || 'Error creando usuario');
    }
    const uid = userRecord.uid;
    const now = admin.firestore.FieldValue.serverTimestamp();
    await admin.firestore().collection('admins').doc(uid).set(
        {
            email: data.email.trim(),
            isAdmin: true,
            isSuperAdmin: false,
            displayName: name,
            name: name,
            role: 'admin',
            createdBy: context.auth.uid,
            createdAt: now,
            updatedAt: now
        },
        { merge: true }
    );
    await admin.firestore().collection('administrators').doc(uid).set(
        {
            id: uid,
            authUid: uid,
            name,
            email: data.email.trim(),
            createdBy: context.auth.uid,
            createdAt: new Date().toISOString(),
            createdDate: new Date().toISOString(),
            isActive: true,
            isHidden: false
        },
        { merge: true }
    );
    return { uid, email: data.email.trim() };
});

/**
 * Elimina administrador: Auth + admins + administrators (solo superadmin; no puede borrarse a sí mismo ni otro superadmin).
 */
exports.removeStaffAdmin = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Debe iniciar sesión');
    }
    const callerSnap = await admin.firestore().collection('admins').doc(context.auth.uid).get();
    if (!(callerSnap.data() || {}).isSuperAdmin) {
        throw new functions.https.HttpsError('permission-denied', 'Solo superadministrador');
    }
    const targetUid = String(data.uid || '').trim();
    if (!targetUid || targetUid === context.auth.uid) {
        throw new functions.https.HttpsError('invalid-argument', 'UID no válido');
    }
    const targetSnap = await admin.firestore().collection('admins').doc(targetUid).get();
    if (!targetSnap.exists) {
        throw new functions.https.HttpsError('not-found', 'Administrador no encontrado');
    }
    if ((targetSnap.data() || {}).isSuperAdmin) {
        throw new functions.https.HttpsError('permission-denied', 'No se puede eliminar un superadministrador');
    }
    try {
        await admin.auth().deleteUser(targetUid);
    } catch (e) {
        if (e.code !== 'auth/user-not-found') {
            throw new functions.https.HttpsError('internal', e.message || 'Error borrando usuario Auth');
        }
    }
    await admin.firestore().collection('admins').doc(targetUid).delete();
    await admin.firestore().collection('administrators').doc(targetUid).delete();
    return { ok: true };
});

/**
 * Elimina ciudadano: Authentication + users/{uid} (cualquier administrador del panel).
 */
exports.removeEndUser = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Debe iniciar sesión');
    }
    await assertAdminByUid(context.auth.uid);
    const targetUid = String(data.uid || '').trim();
    if (!targetUid) {
        throw new functions.https.HttpsError('invalid-argument', 'UID requerido');
    }
    try {
        await admin.auth().deleteUser(targetUid);
    } catch (e) {
        if (e.code !== 'auth/user-not-found') {
            throw new functions.https.HttpsError('internal', e.message || 'Error borrando usuario');
        }
    }
    await admin.firestore().collection('users').doc(targetUid).delete();
    return { ok: true };
});

/**
 * Descarga APK Cobreros Avisos — solo administradores (Bearer).
 * Subir el archivo a Storage: private/cobreros-avisos.apk
 */
exports.downloadAvisosApk = functions.https.onRequest(async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    if (req.method !== 'GET') {
        res.status(405).json({ error: 'Método no permitido' });
        return;
    }

    try {
        const auth = await getAuthContext(req);
        await assertAdminByUid(auth.uid);

        const bucket = admin.storage().bucket();
        const file = bucket.file('private/cobreros-avisos.apk');
        const [exists] = await file.exists();
        if (!exists) {
            res.status(404).json({
                error: 'APK no encontrada. Sube private/cobreros-avisos.apk en Firebase Storage.'
            });
            return;
        }

        res.setHeader('Content-Type', 'application/vnd.android.package-archive');
        res.setHeader('Content-Disposition', 'attachment; filename="cobreros-avisos.apk"');
        file.createReadStream()
            .on('error', (err) => {
                console.error('downloadAvisosApk stream:', err);
                if (!res.headersSent) {
                    res.status(500).json({ error: 'Error leyendo la APK' });
                }
            })
            .pipe(res);
    } catch (error) {
        console.error('downloadAvisosApk:', error);
        const status = error.status || 500;
        res.status(status).json({ error: error.message || 'Error interno' });
    }
});
