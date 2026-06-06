/* eslint-env browser */
/**
 * Sistema ligero para enviar avisos por email desde cualquier módulo.
 * Depende de email-service.js y FirebaseUtils (si está disponible).
 */
(function() {
    class NotificationsSystem {
        constructor() {
            this.notifications = [];
        }

        async sendNotice(options = {}) {
            const {
                recipients = [],
                subject = 'Aviso del Ayuntamiento de Cobreros',
                title = 'Aviso municipal',
                message = '',
                date = null,
                location = null
            } = options;

            if (!Array.isArray(recipients) || recipients.length === 0) {
                throw new Error('No se especificaron destinatarios');
            }

            const emailResults = [];
            for (const recipient of recipients) {
                const email = typeof recipient === 'string' ? recipient : recipient?.email;
                if (!email) continue;

                try {
                    if (!window.emailService) {
                        throw new Error('emailService no disponible');
                    }
                    await window.emailService.sendNotice(email, {
                        subject,
                        title,
                        message,
                        date,
                        location
                    });
                    emailResults.push({ email, success: true });
                } catch (error) {
                    console.error(`Error enviando aviso a ${email}:`, error);
                    emailResults.push({ email, success: false, error: error.message });
                }
            }

            // Registrar en Firestore
            if (window.FirebaseUtils) {
                try {
                    const notificationDoc = {
                        title,
                        message,
                        date: new Date().toISOString(),
                        metadata: {
                            subject,
                            attempted: emailResults.length,
                            success: emailResults.filter(r => r.success).length
                        }
                    };
                    await window.FirebaseUtils.create('notifications', notificationDoc);
                } catch (firestoreError) {
                    console.warn('No se pudo registrar el aviso en Firestore:', firestoreError);
                }
            }

            return emailResults;
        }
    }

    window.notificationsSystem = new NotificationsSystem();
})();




