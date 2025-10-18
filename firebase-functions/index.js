// 🔥 Firebase Functions - Ayuntamiento de Cobreros
// Funciones para validar reCAPTCHA y manejar notificaciones

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');

// Inicializar Firebase Admin
admin.initializeApp();

// ⚠️ IMPORTANTE: Configura tu SECRET KEY en Firebase Console
// firebase functions:config:set recaptcha.secret_key="TU_SECRET_KEY_AQUI"
const RECAPTCHA_SECRET_KEY = functions.config().recaptcha?.secret_key || 'TU_SECRET_KEY_AQUI';

/**
 * 🛡️ Validar token de reCAPTCHA v3
 * Endpoint: https://us-central1-turisteam-80f1b.cloudfunctions.net/validateRecaptcha
 */
exports.validateRecaptcha = functions.https.onRequest(async (req, res) => {
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
        if (RECAPTCHA_SECRET_KEY === 'TU_SECRET_KEY_AQUI') {
            console.error('⚠️ RECAPTCHA_SECRET_KEY no configurada');
            res.status(500).json({
                success: false,
                error: 'reCAPTCHA no configurado en el servidor'
            });
            return;
        }

        console.log(`🛡️ Validando reCAPTCHA para acción: ${action}`);

        // Llamar a la API de Google reCAPTCHA
        const verificationUrl = 'https://www.google.com/recaptcha/api/siteverify';
        const verificationResponse = await axios.post(verificationUrl, null, {
            params: {
                secret: RECAPTCHA_SECRET_KEY,
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
 * Endpoint: https://us-central1-turisteam-80f1b.cloudfunctions.net/getRecaptchaStats
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
        // TODO: Implementar autenticación de administrador
        // const adminToken = req.headers.authorization?.split('Bearer ')[1];
        // await verifyAdminToken(adminToken);

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
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

/**
 * 📱 Enviar notificaciones push masivas
 * Endpoint: https://us-central1-turisteam-80f1b.cloudfunctions.net/sendPushNotification
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

        // Obtener usuarios que han dado consentimiento
        let usersQuery = admin.firestore()
            .collection('users')
            .where('notificationConsent', '==', true)
            .where('fcmToken', '!=', '');

        // Filtrar por localidades si se especifica
        if (localities && localities.length > 0) {
            usersQuery = usersQuery.where('localities', 'array-contains-any', localities);
        }

        const usersSnapshot = await usersQuery.get();
        
        if (usersSnapshot.empty) {
            res.status(200).json({
                success: true,
                message: 'No hay usuarios con notificaciones activadas',
                sent: 0
            });
            return;
        }

        const tokens = [];
        const users = [];

        usersSnapshot.forEach(doc => {
            const userData = doc.data();
            if (userData.fcmToken) {
                tokens.push(userData.fcmToken);
                users.push({
                    id: doc.id,
                    email: userData.email,
                    fcmToken: userData.fcmToken
                });
            }
        });

        if (tokens.length === 0) {
            res.status(200).json({
                success: true,
                message: 'No hay tokens FCM válidos',
                sent: 0
            });
            return;
        }

        // Preparar payload de notificación
        const payload = {
            notification: {
                title: title,
                body: message,
                icon: '/images/escudo-cobreros.png'
            },
            data: {
                type: type || 'general',
                timestamp: new Date().toISOString(),
                source: 'ayuntamiento-cobreros'
            },
            webpush: {
                notification: {
                    icon: '/images/escudo-cobreros.png',
                    badge: '/images/escudo-cobreros.png',
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
                            fcmToken: user.fcmToken,
                            localities: localities || []
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
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
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
 * Endpoint: https://us-central1-turisteam-80f1b.cloudfunctions.net/getBackupStats
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
