/*
Sistema de Notificaciones Oficiales
© 2024 - Sistema de Gestión del Ayuntamiento de Cobreros

Gestiona notificaciones oficiales con validez legal:
- Notificaciones electrónicas
- Acuse de recibo
- Historial de notificaciones
- Integración con Sede Electrónica

Contacto: editorturis@gmail.com
*/

class OfficialNotificationsSystem {
    constructor() {
        this.collectionName = 'official_notifications';
        this.notificationTypes = {
            ADMINISTRATIVE: 'administrative',
            EVENT: 'event',
            PAYMENT: 'payment',
            DOCUMENT: 'document',
            GENERAL: 'general'
        };
    }

    /**
     * Crear notificación oficial
     * @param {Object} notificationData - Datos de la notificación
     * @returns {Promise<Object>} - Notificación creada con acuse de recibo
     */
    async createOfficialNotification(notificationData) {
        try {
            const {
                recipientId,
                recipientEmail,
                recipientName,
                type = this.notificationTypes.GENERAL,
                subject,
                content,
                attachments = [],
                priority = 'normal',
                requiresAcknowledgment = true,
                expiresAt = null
            } = notificationData;

            // Validar datos requeridos
            if (!recipientId || !recipientEmail || !subject || !content) {
                throw new Error('Faltan datos requeridos para la notificación');
            }

            // Sanitizar contenido
            if (window.inputSanitizer) {
                subject = window.inputSanitizer.sanitizeText(subject, { maxLength: 200 });
                content = window.inputSanitizer.sanitizeHtml(content, {
                    allowedTags: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'a'],
                    allowedAttributes: { a: ['href', 'target'] }
                });
            }

            const notification = {
                recipientId,
                recipientEmail,
                recipientName,
                type,
                subject,
                content,
                attachments,
                priority,
                requiresAcknowledgment,
                status: 'sent',
                sentAt: new Date(),
                sentAtISO: new Date().toISOString(),
                acknowledgedAt: null,
                acknowledgedAtISO: null,
                readAt: null,
                readAtISO: null,
                expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
                createdBy: window.currentUser?.uid || 'system',
                createdByEmail: window.currentUser?.email || 'system',
                notificationId: this.generateNotificationId(),
                legalValidity: true,
                metadata: {
                    ipAddress: await this.getIPAddress(),
                    userAgent: navigator.userAgent,
                    timestamp: Date.now()
                }
            };

            // Guardar en Firestore
            if (window.firebase && window.firebase.firestore) {
                const docRef = await window.firebase.firestore()
                    .collection(this.collectionName)
                    .add(notification);
                notification.id = docRef.id;
            } else {
                // Guardar en localStorage como respaldo
                notification.id = `notif_${Date.now()}`;
                this.saveToLocalStorage(notification);
            }

            // Enviar email de notificación
            await this.sendNotificationEmail(notification);

            // Registrar en logs de auditoría
            if (window.auditLogSystem) {
                await window.auditLogSystem.log('OFFICIAL_NOTIFICATION_SENT', {
                    notificationId: notification.notificationId,
                    recipientEmail: recipientEmail,
                    type: type,
                    subject: subject
                });
            }

            console.log('✅ Notificación oficial creada:', notification.notificationId);
            return notification;

        } catch (error) {
            console.error('❌ Error creando notificación oficial:', error);
            throw error;
        }
    }

    /**
     * Marcar notificación como leída
     * @param {string} notificationId - ID de la notificación
     * @returns {Promise<boolean>} - true si se marcó correctamente
     */
    async markAsRead(notificationId) {
        try {
            const updateData = {
                readAt: new Date(),
                readAtISO: new Date().toISOString(),
                status: 'read'
            };

            if (window.firebase && window.firebase.firestore) {
                const notifications = await window.firebase.firestore()
                    .collection(this.collectionName)
                    .where('notificationId', '==', notificationId)
                    .get();

                if (!notifications.empty) {
                    await notifications.docs[0].ref.update(updateData);
                }
            }

            // Registrar en logs
            if (window.auditLogSystem) {
                await window.auditLogSystem.log('NOTIFICATION_READ', {
                    notificationId: notificationId
                });
            }

            return true;
        } catch (error) {
            console.error('❌ Error marcando notificación como leída:', error);
            return false;
        }
    }

    /**
     * Acusar recibo de notificación
     * @param {string} notificationId - ID de la notificación
     * @param {string} acknowledgmentMethod - Método de acuse (read, email, digital_signature)
     * @returns {Promise<Object>} - Acuse de recibo
     */
    async acknowledgeNotification(notificationId, acknowledgmentMethod = 'read') {
        try {
            const acknowledgment = {
                notificationId: notificationId,
                acknowledgedAt: new Date(),
                acknowledgedAtISO: new Date().toISOString(),
                method: acknowledgmentMethod,
                acknowledgedBy: window.currentUser?.uid || 'unknown',
                acknowledgedByEmail: window.currentUser?.email || 'unknown',
                ipAddress: await this.getIPAddress(),
                userAgent: navigator.userAgent,
                legalValidity: true
            };

            if (window.firebase && window.firebase.firestore) {
                const notifications = await window.firebase.firestore()
                    .collection(this.collectionName)
                    .where('notificationId', '==', notificationId)
                    .get();

                if (!notifications.empty) {
                    await notifications.docs[0].ref.update({
                        acknowledgedAt: acknowledgment.acknowledgedAt,
                        acknowledgedAtISO: acknowledgment.acknowledgedAtISO,
                        acknowledgmentMethod: acknowledgmentMethod,
                        status: 'acknowledged'
                    });

                    // Guardar acuse de recibo en colección separada
                    await window.firebase.firestore()
                        .collection('notification_acknowledgments')
                        .add(acknowledgment);
                }
            }

            // Registrar en logs
            if (window.auditLogSystem) {
                await window.auditLogSystem.log('NOTIFICATION_ACKNOWLEDGED', {
                    notificationId: notificationId,
                    method: acknowledgmentMethod
                });
            }

            console.log('✅ Acuse de recibo registrado:', notificationId);
            return acknowledgment;

        } catch (error) {
            console.error('❌ Error registrando acuse de recibo:', error);
            throw error;
        }
    }

    /**
     * Obtener notificaciones de un usuario
     * @param {string} userId - ID del usuario
     * @param {Object} filters - Filtros adicionales
     * @returns {Promise<Array>} - Lista de notificaciones
     */
    async getUserNotifications(userId, filters = {}) {
        try {
            let query = null;

            if (window.firebase && window.firebase.firestore) {
                query = window.firebase.firestore()
                    .collection(this.collectionName)
                    .where('recipientId', '==', userId)
                    .orderBy('sentAt', 'desc');

                if (filters.type) {
                    query = query.where('type', '==', filters.type);
                }
                if (filters.status) {
                    query = query.where('status', '==', filters.status);
                }
                if (filters.unreadOnly) {
                    query = query.where('readAt', '==', null);
                }

                const snapshot = await query.limit(filters.limit || 50).get();
                return snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
            } else {
                // Cargar desde localStorage
                const notifications = JSON.parse(localStorage.getItem('official_notifications') || '[]');
                return notifications
                    .filter(n => n.recipientId === userId)
                    .slice(0, filters.limit || 50);
            }
        } catch (error) {
            console.error('❌ Error obteniendo notificaciones:', error);
            return [];
        }
    }

    /**
     * Obtener historial completo de notificaciones (solo administradores)
     * @param {Object} filters - Filtros
     * @returns {Promise<Array>} - Historial de notificaciones
     */
    async getNotificationHistory(filters = {}) {
        try {
            // Verificar permisos
            if (!window.backendVerification || !await window.backendVerification.verifyActionPermissions('VIEW_LOGS')) {
                throw new Error('No tienes permisos para ver el historial');
            }

            if (window.firebase && window.firebase.firestore) {
                let query = window.firebase.firestore()
                    .collection(this.collectionName)
                    .orderBy('sentAt', 'desc');

                if (filters.recipientEmail) {
                    query = query.where('recipientEmail', '==', filters.recipientEmail);
                }
                if (filters.type) {
                    query = query.where('type', '==', filters.type);
                }
                if (filters.startDate) {
                    query = query.where('sentAt', '>=', filters.startDate);
                }
                if (filters.endDate) {
                    query = query.where('sentAt', '<=', filters.endDate);
                }

                const snapshot = await query.limit(filters.limit || 100).get();
                return snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
            }

            return [];
        } catch (error) {
            console.error('❌ Error obteniendo historial:', error);
            throw error;
        }
    }

    /**
     * Exportar notificaciones a formato oficial
     * @param {Array} notifications - Notificaciones a exportar
     * @param {string} format - Formato (pdf, csv, json)
     * @returns {Promise<string>} - Datos exportados
     */
    async exportNotifications(notifications, format = 'pdf') {
        try {
            if (format === 'json') {
                return JSON.stringify(notifications, null, 2);
            } else if (format === 'csv') {
                const headers = ['ID', 'Fecha', 'Destinatario', 'Asunto', 'Tipo', 'Estado', 'Acuse'];
                const rows = notifications.map(n => [
                    n.notificationId,
                    n.sentAtISO,
                    n.recipientEmail,
                    n.subject,
                    n.type,
                    n.status,
                    n.acknowledgedAt ? 'Sí' : 'No'
                ]);

                return [
                    headers.join(','),
                    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
                ].join('\n');
            } else if (format === 'pdf') {
                // Generar PDF usando jsPDF o similar
                // Por ahora retornar JSON, se puede mejorar después
                return JSON.stringify(notifications, null, 2);
            }

            return '';
        } catch (error) {
            console.error('❌ Error exportando notificaciones:', error);
            throw error;
        }
    }

    /**
     * Enviar email de notificación
     */
    async sendNotificationEmail(notification) {
        try {
            if (window.emailService) {
                await window.emailService.sendEmail({
                    to: notification.recipientEmail,
                    subject: `[NOTIFICACIÓN OFICIAL] ${notification.subject}`,
                    html: this.generateEmailTemplate(notification),
                    priority: notification.priority
                });
            }
        } catch (error) {
            console.warn('⚠️ No se pudo enviar email de notificación:', error);
        }
    }

    /**
     * Generar plantilla de email
     */
    generateEmailTemplate(notification) {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .header { background: #2c3e50; color: white; padding: 20px; text-align: center; }
                    .content { padding: 20px; }
                    .footer { background: #f4f4f4; padding: 15px; text-align: center; font-size: 12px; }
                    .button { display: inline-block; padding: 10px 20px; background: #3b82f6; color: white; text-decoration: none; border-radius: 5px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h2>NOTIFICACIÓN OFICIAL</h2>
                    <p>${notification.type.toUpperCase()}</p>
                </div>
                <div class="content">
                    <p>Estimado/a ${notification.recipientName},</p>
                    <p>${notification.content}</p>
                    ${notification.requiresAcknowledgment ? `
                        <p><strong>IMPORTANTE:</strong> Esta notificación requiere acuse de recibo.</p>
                        <a href="${window.location.origin}/notificaciones/${notification.notificationId}" class="button">Ver Notificación</a>
                    ` : ''}
                </div>
                <div class="footer">
                    <p>Esta es una notificación oficial con validez legal.</p>
                    <p>ID de notificación: ${notification.notificationId}</p>
                    <p>Fecha: ${new Date(notification.sentAtISO).toLocaleString('es-ES')}</p>
                </div>
            </body>
            </html>
        `;
    }

    /**
     * Generar ID único de notificación
     */
    generateNotificationId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 9);
        return `NOT-${timestamp}-${random.toUpperCase()}`;
    }

    /**
     * Obtener IP del usuario
     */
    async getIPAddress() {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            return data.ip || 'unknown';
        } catch (error) {
            return 'unknown';
        }
    }

    /**
     * Guardar en localStorage como respaldo
     */
    saveToLocalStorage(notification) {
        try {
            const notifications = JSON.parse(localStorage.getItem('official_notifications') || '[]');
            notifications.unshift(notification);
            if (notifications.length > 500) {
                notifications.splice(500);
            }
            localStorage.setItem('official_notifications', JSON.stringify(notifications));
        } catch (error) {
            console.error('❌ Error guardando en localStorage:', error);
        }
    }
}

// Crear instancia global
const officialNotificationsSystem = new OfficialNotificationsSystem();

// Hacer disponible globalmente
if (typeof window !== 'undefined') {
    window.officialNotificationsSystem = officialNotificationsSystem;
}

// Exportar
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OfficialNotificationsSystem;
}

