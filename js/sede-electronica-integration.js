/*
Integración con Sede Electrónica
© 2024 - Sistema de Gestión del Ayuntamiento de Cobreros

Integración con sistemas de Sede Electrónica para notificaciones
y trámites oficiales

Contacto: editorturis@gmail.com
*/

class SedeElectronicaIntegration {
    constructor() {
        this.configKey = 'sede_electronica_config';
        this.defaultConfig = {
            enabled: false,
            apiUrl: '',
            apiKey: '',
            apiSecret: '',
            certificatePath: '',
            testMode: true,
            autoSync: false,
            syncInterval: 3600000 // 1 hora
        };
        this.config = this.loadConfig();
        this.syncInterval = null;
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
        
        // Sincronizar con Firestore
        if (window.firebase && window.firebase.firestore) {
            window.firebase.firestore().collection('system_config').doc('sede_electronica').set({
                ...this.config,
                updatedAt: new Date().toISOString(),
                updatedBy: window.currentUser?.email || 'system'
            }).catch(error => {
                console.error('Error guardando configuración:', error);
            });
        }

        // Reiniciar sincronización automática si está habilitada
        if (this.config.enabled && this.config.autoSync) {
            this.startAutoSync();
        } else {
            this.stopAutoSync();
        }
    }

    /**
     * Verificar conexión con Sede Electrónica
     */
    async testConnection() {
        try {
            if (!this.config.enabled || !this.config.apiUrl) {
                return { success: false, message: 'La integración no está configurada' };
            }

            // Llamar a endpoint de prueba
            const response = await fetch(`${this.config.apiUrl}/test`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.config.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                return { success: true, message: 'Conexión exitosa con Sede Electrónica' };
            } else {
                return { success: false, message: 'Error al conectar con Sede Electrónica' };
            }
        } catch (error) {
            console.error('Error probando conexión:', error);
            return { success: false, message: `Error: ${error.message}` };
        }
    }

    /**
     * Enviar notificación a Sede Electrónica
     */
    async sendNotificationToSede(notification) {
        try {
            if (!this.config.enabled) {
                throw new Error('La integración con Sede Electrónica está deshabilitada');
            }

            const payload = {
                notificationId: notification.id,
                title: notification.title,
                content: notification.content,
                recipient: notification.recipient,
                type: notification.type,
                priority: notification.priority,
                createdAt: notification.createdAt,
                legalValidity: notification.legalValidity,
                digitalSignature: notification.metadata?.signatureHash || null
            };

            const response = await fetch(`${this.config.apiUrl}/notifications`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.config.apiKey}`,
                    'Content-Type': 'application/json',
                    'X-API-Secret': this.config.apiSecret
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();

            // Registrar en logs
            if (window.auditLogSystem) {
                await window.auditLogSystem.log('SEDE_ELECTRONICA_NOTIFICATION_SENT', {
                    notificationId: notification.id,
                    sedeId: result.sedeId || 'unknown',
                    recipient: notification.recipient
                });
            }

            return { success: true, sedeId: result.sedeId, result };
        } catch (error) {
            console.error('Error enviando notificación a Sede Electrónica:', error);
            throw error;
        }
    }

    /**
     * Sincronizar notificaciones desde Sede Electrónica
     */
    async syncNotificationsFromSede() {
        try {
            if (!this.config.enabled) {
                return { success: false, message: 'La integración está deshabilitada' };
            }

            const response = await fetch(`${this.config.apiUrl}/notifications/sync`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.config.apiKey}`,
                    'Content-Type': 'application/json',
                    'X-API-Secret': this.config.apiSecret
                }
            });

            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }

            const notifications = await response.json();

            // Guardar notificaciones en Firestore
            if (window.firebase && window.firebase.firestore && notifications.length > 0) {
                const batch = window.firebase.firestore().batch();
                const notificationsRef = window.firebase.firestore().collection('official_notifications');

                notifications.forEach(notification => {
                    const docRef = notificationsRef.doc();
                    batch.set(docRef, {
                        ...notification,
                        source: 'sede_electronica',
                        syncedAt: new Date().toISOString()
                    });
                });

                await batch.commit();
            }

            // Registrar en logs
            if (window.auditLogSystem) {
                await window.auditLogSystem.log('SEDE_ELECTRONICA_SYNC', {
                    notificationsCount: notifications.length,
                    timestamp: new Date().toISOString()
                });
            }

            return { success: true, count: notifications.length, notifications };
        } catch (error) {
            console.error('Error sincronizando desde Sede Electrónica:', error);
            return { success: false, message: error.message };
        }
    }

    /**
     * Iniciar sincronización automática
     */
    startAutoSync() {
        this.stopAutoSync(); // Detener sincronización anterior si existe

        if (!this.config.enabled || !this.config.autoSync) {
            return;
        }

        this.syncInterval = setInterval(() => {
            this.syncNotificationsFromSede().catch(error => {
                console.error('Error en sincronización automática:', error);
            });
        }, this.config.syncInterval);

        console.log('✅ Sincronización automática iniciada');
    }

    /**
     * Detener sincronización automática
     */
    stopAutoSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
            console.log('⏹️ Sincronización automática detenida');
        }
    }

    /**
     * Obtener estado de la integración
     */
    getStatus() {
        return {
            enabled: this.config.enabled,
            configured: !!(this.config.apiUrl && this.config.apiKey),
            autoSync: this.config.autoSync,
            lastSync: localStorage.getItem('sede_electronica_last_sync') || null
        };
    }
}

// Crear instancia global
if (typeof window !== 'undefined') {
    window.sedeElectronicaIntegration = new SedeElectronicaIntegration();
    console.log('✅ Integración con Sede Electrónica cargada');
}

