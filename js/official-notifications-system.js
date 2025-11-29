/*
Sistema de Notificaciones Oficiales
© 2024 - Sistema de Gestión del Ayuntamiento de Cobreros

Sistema de notificaciones con validez legal, acuse de recibo,
historial y cumplimiento normativo

Contacto: editorturis@gmail.com
*/

class OfficialNotificationsSystem {
    constructor() {
        this.configKey = 'official_notifications_config';
        this.defaultConfig = {
            enabled: true,
            requireAcknowledgment: true,
            legalValidity: true,
            retentionDays: 365,
            sendEmail: true,
            sendSMS: false,
            digitalSignature: false,
            sedeElectronicaIntegration: false
        };
        this.config = this.loadConfig();
    }

    /**
     * Cargar configuración
     */
    loadConfig() {
        try {
            const saved = localStorage.getItem(this.configKey);
            if (saved) {
                return { ...this.defaultConfig, ...JSON.parse(saved) };
            }
        } catch (error) {
            console.error('Error cargando configuración:', error);
        }
        return { ...this.defaultConfig };
    }

    /**
     * Guardar configuración
     */
    saveConfig(config) {
        this.config = { ...this.config, ...config };
        localStorage.setItem(this.configKey, JSON.stringify(this.config));
        
        // Sincronizar con Firestore si está disponible
        if (window.firebase && window.firebase.firestore) {
            window.firebase.firestore().collection('system_config').doc('official_notifications').set({
                ...this.config,
                updatedAt: new Date().toISOString(),
                updatedBy: window.currentUser?.email || 'system'
            }).catch(error => {
                console.error('Error guardando configuración en Firestore:', error);
            });
        }
    }

    /**
     * Crear notificación oficial
     * @param {Object} notificationData - Datos de la notificación
     * @returns {Promise<Object>} - Notificación creada con ID y timestamp
     */
    async createOfficialNotification(notificationData) {
        try {
            if (!this.config.enabled) {
                throw new Error('El sistema de notificaciones oficiales está deshabilitado');
            }

            const notification = {
                id: `NOT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                title: notificationData.title,
                content: notificationData.content,
                type: notificationData.type || 'general',
                recipient: notificationData.recipient, // email o userId
                recipientType: notificationData.recipientType || 'user', // 'user', 'admin', 'all'
                priority: notificationData.priority || 'normal', // 'low', 'normal', 'high', 'urgent'
                legalValidity: this.config.legalValidity,
                requireAcknowledgment: this.config.requireAcknowledgment,
                createdAt: new Date().toISOString(),
                createdBy: window.currentUser?.email || 'system',
                status: 'sent',
                acknowledgment: {
                    required: this.config.requireAcknowledgment,
                    received: false,
                    receivedAt: null,
                    ipAddress: null
                },
                delivery: {
                    email: this.config.sendEmail ? 'pending' : 'disabled',
                    sms: this.config.sendSMS ? 'pending' : 'disabled',
                    push: 'pending'
                },
                metadata: {
                    retentionDays: this.config.retentionDays,
                    digitalSignature: this.config.digitalSignature ? 'pending' : 'disabled'
                }
            };

            // Guardar en Firestore
            if (window.firebase && window.firebase.firestore) {
                await window.firebase.firestore().collection('official_notifications').add(notification);
            }

            // Enviar notificación
            await this.sendNotification(notification);

            // Registrar en logs de auditoría
            if (window.auditLogSystem) {
                await window.auditLogSystem.log('OFFICIAL_NOTIFICATION_CREATED', {
                    notificationId: notification.id,
                    recipient: notification.recipient,
                    title: notification.title,
                    type: notification.type
                });
            }

            return notification;
        } catch (error) {
            console.error('Error creando notificación oficial:', error);
            throw error;
        }
    }

    /**
     * Enviar notificación
     */
    async sendNotification(notification) {
        // Enviar email si está habilitado
        if (this.config.sendEmail && notification.delivery.email === 'pending') {
            try {
                await this.sendEmailNotification(notification);
                notification.delivery.email = 'sent';
            } catch (error) {
                notification.delivery.email = 'failed';
                console.error('Error enviando email:', error);
            }
        }

        // Enviar SMS si está habilitado
        if (this.config.sendSMS && notification.delivery.sms === 'pending') {
            try {
                await this.sendSMSNotification(notification);
                notification.delivery.sms = 'sent';
            } catch (error) {
                notification.delivery.sms = 'failed';
                console.error('Error enviando SMS:', error);
            }
        }

        // Enviar push notification
        if (notification.delivery.push === 'pending') {
            try {
                await this.sendPushNotification(notification);
                notification.delivery.push = 'sent';
            } catch (error) {
                notification.delivery.push = 'failed';
                console.error('Error enviando push:', error);
            }
        }

        // Aplicar firma digital si está habilitado
        if (this.config.digitalSignature && notification.metadata.digitalSignature === 'pending') {
            try {
                await this.applyDigitalSignature(notification);
                notification.metadata.digitalSignature = 'applied';
            } catch (error) {
                notification.metadata.digitalSignature = 'failed';
                console.error('Error aplicando firma digital:', error);
            }
        }
    }

    /**
     * Enviar notificación por email
     */
    async sendEmailNotification(notification) {
        const response = await fetch(`${window.CLOUD_FUNCTIONS_BASE_URL || 'https://us-central1-turisteam-80f1b.cloudfunctions.net'}/sendEmail`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                to: notification.recipient,
                from: 'u2389387944@gmail.com',
                subject: `[OFICIAL] ${notification.title}`,
                template: 'official_notification',
                data: {
                    notificationId: notification.id,
                    title: notification.title,
                    content: notification.content,
                    type: notification.type,
                    priority: notification.priority,
                    createdAt: notification.createdAt,
                    acknowledgmentRequired: notification.acknowledgment.required,
                    acknowledgmentUrl: `${window.location.origin}/#notificaciones/${notification.id}`
                }
            })
        });

        return await response.json();
    }

    /**
     * Enviar notificación por SMS
     */
    async sendSMSNotification(notification) {
        // Integración con servicio SMS (implementar según proveedor)
        console.log('Enviando SMS:', notification);
        // TODO: Implementar integración con servicio SMS
    }

    /**
     * Enviar push notification
     */
    async sendPushNotification(notification) {
        // Usar sistema de push notifications existente
        if (typeof showNotification === 'function') {
            showNotification(notification.title, notification.type || 'info');
        }
    }

    /**
     * Aplicar firma digital
     */
    async applyDigitalSignature(notification) {
        // Generar hash SHA-256 del contenido
        const content = JSON.stringify({
            id: notification.id,
            title: notification.title,
            content: notification.content,
            createdAt: notification.createdAt,
            recipient: notification.recipient
        });

        const encoder = new TextEncoder();
        const data = encoder.encode(content);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        // Guardar firma digital
        if (window.firebase && window.firebase.firestore) {
            await window.firebase.firestore().collection('official_notifications').doc(notification.id).update({
                'metadata.digitalSignature': 'applied',
                'metadata.signatureHash': hashHex,
                'metadata.signatureTimestamp': new Date().toISOString()
            });
        }

        return hashHex;
    }

    /**
     * Registrar acuse de recibo
     */
    async acknowledgeNotification(notificationId, userEmail) {
        try {
            const ipAddress = await this.getClientIP();
            
            const acknowledgment = {
                received: true,
                receivedAt: new Date().toISOString(),
                ipAddress: ipAddress,
                acknowledgedBy: userEmail
            };

            // Actualizar en Firestore
            if (window.firebase && window.firebase.firestore) {
                const notificationsRef = window.firebase.firestore().collection('official_notifications');
                const query = notificationsRef.where('id', '==', notificationId);
                const snapshot = await query.get();
                
                if (!snapshot.empty) {
                    await snapshot.docs[0].ref.update({
                        'acknowledgment': acknowledgment,
                        'status': 'acknowledged'
                    });
                }
            }

            // Registrar en logs
            if (window.auditLogSystem) {
                await window.auditLogSystem.log('OFFICIAL_NOTIFICATION_ACKNOWLEDGED', {
                    notificationId: notificationId,
                    acknowledgedBy: userEmail,
                    ipAddress: ipAddress
                });
            }

            return { success: true, acknowledgment };
        } catch (error) {
            console.error('Error registrando acuse de recibo:', error);
            throw error;
        }
    }

    /**
     * Obtener historial de notificaciones
     */
    async getNotificationHistory(filters = {}) {
        try {
            if (!window.firebase || !window.firebase.firestore) {
                return [];
            }

            let query = window.firebase.firestore().collection('official_notifications');

            if (filters.recipient) {
                query = query.where('recipient', '==', filters.recipient);
            }

            if (filters.status) {
                query = query.where('status', '==', filters.status);
            }

            if (filters.type) {
                query = query.where('type', '==', filters.type);
            }

            query = query.orderBy('createdAt', 'desc').limit(filters.limit || 50);

            const snapshot = await query.get();
            return snapshot.docs.map(doc => doc.data());
        } catch (error) {
            console.error('Error obteniendo historial:', error);
            return [];
        }
    }

    /**
     * Obtener IP del cliente
     */
    async getClientIP() {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            return data.ip;
        } catch (error) {
            return 'unknown';
        }
    }

    /**
     * Exportar notificaciones a PDF
     */
    async exportToPDF(notifications) {
        // TODO: Implementar exportación a PDF
        console.log('Exportando notificaciones a PDF:', notifications);
    }

    /**
     * Verificar validez legal de notificación
     */
    async verifyLegalValidity(notificationId) {
        try {
            if (!window.firebase || !window.firebase.firestore) {
                return { valid: false, reason: 'Firestore no disponible' };
            }

            const notificationsRef = window.firebase.firestore().collection('official_notifications');
            const query = notificationsRef.where('id', '==', notificationId);
            const snapshot = await query.get();

            if (snapshot.empty) {
                return { valid: false, reason: 'Notificación no encontrada' };
            }

            const notification = snapshot.docs[0].data();

            // Verificar que tenga firma digital si está habilitada
            if (this.config.digitalSignature && !notification.metadata?.signatureHash) {
                return { valid: false, reason: 'Falta firma digital' };
            }

            // Verificar que no haya expirado
            const createdAt = new Date(notification.createdAt);
            const retentionDate = new Date(createdAt.getTime() + (this.config.retentionDays * 24 * 60 * 60 * 1000));
            if (new Date() > retentionDate) {
                return { valid: false, reason: 'Notificación expirada' };
            }

            return { valid: true, notification };
        } catch (error) {
            console.error('Error verificando validez legal:', error);
            return { valid: false, reason: 'Error al verificar' };
        }
    }
}

// Crear instancia global
if (typeof window !== 'undefined') {
    window.officialNotificationsSystem = new OfficialNotificationsSystem();
    console.log('✅ Sistema de notificaciones oficiales cargado');
}

