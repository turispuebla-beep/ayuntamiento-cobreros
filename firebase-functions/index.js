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


