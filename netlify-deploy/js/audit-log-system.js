/*
Sistema de Logs de Auditoría
© 2024 - Sistema de Gestión del Ayuntamiento de Cobreros

Registra todas las acciones importantes del sistema:
- Accesos de administradores
- Creación/eliminación de usuarios
- Cambios de configuración
- Modificaciones de datos críticos

Contacto: editorturis@gmail.com
*/

class AuditLogSystem {
    constructor() {
        this.collectionName = 'audit_logs';
        this.maxLogsInMemory = 100;
        this.logsCache = [];
        this.isInitialized = false;
    }

    /**
     * Inicializar el sistema de auditoría
     */
    async initialize() {
        if (this.isInitialized) return;
        
        try {
            // Cargar logs recientes en caché
            await this.loadRecentLogs();
            this.isInitialized = true;
            console.log('✅ Sistema de auditoría inicializado');
        } catch (error) {
            console.error('❌ Error inicializando sistema de auditoría:', error);
        }
    }

    /**
     * Registrar un evento de auditoría
     * @param {string} action - Tipo de acción (LOGIN, CREATE_USER, DELETE_USER, UPDATE_CONFIG, etc.)
     * @param {Object} details - Detalles de la acción
     * @param {string} userId - ID del usuario que realiza la acción
     * @param {string} userEmail - Email del usuario
     */
    async log(action, details = {}, userId = null, userEmail = null) {
        try {
            const logEntry = {
                action: action,
                details: details,
                userId: userId || this.getCurrentUserId(),
                userEmail: userEmail || this.getCurrentUserEmail(),
                ipAddress: await this.getIPAddress(),
                userAgent: navigator.userAgent,
                timestamp: new Date(),
                timestampISO: new Date().toISOString(),
                date: new Date().toLocaleDateString('es-ES'),
                time: new Date().toLocaleTimeString('es-ES')
            };

            // Agregar a caché
            this.logsCache.unshift(logEntry);
            if (this.logsCache.length > this.maxLogsInMemory) {
                this.logsCache.pop();
            }

            // Guardar en Firestore si está disponible
            if (window.firebase && window.firebase.firestore) {
                try {
                    await window.firebase.firestore()
                        .collection(this.collectionName)
                        .add(logEntry);
                } catch (firestoreError) {
                    console.warn('⚠️ No se pudo guardar log en Firestore, guardando en localStorage:', firestoreError);
                    // Guardar en localStorage como respaldo
                    this.saveToLocalStorage(logEntry);
                }
            } else {
                // Guardar solo en localStorage si Firestore no está disponible
                this.saveToLocalStorage(logEntry);
            }

            console.log(`📝 [AUDIT] ${action}:`, logEntry);
            return logEntry;

        } catch (error) {
            console.error('❌ Error registrando log de auditoría:', error);
            // Intentar guardar en localStorage como último recurso
            try {
                const logEntry = {
                    action: action,
                    details: details,
                    userId: userId || 'unknown',
                    userEmail: userEmail || 'unknown',
                    ipAddress: 'unknown',
                    timestamp: new Date(),
                    error: error.message
                };
                this.saveToLocalStorage(logEntry);
            } catch (localError) {
                console.error('❌ Error crítico guardando log:', localError);
            }
        }
    }

    /**
     * Obtener IP del usuario (usando servicio externo)
     */
    async getIPAddress() {
        try {
            // Intentar obtener IP desde un servicio
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            return data.ip || 'unknown';
        } catch (error) {
            // Si falla, intentar con otro servicio
            try {
                const response = await fetch('https://ipapi.co/json/');
                const data = await response.json();
                return data.ip || 'unknown';
            } catch (error2) {
                return 'unknown';
            }
        }
    }

    /**
     * Obtener ID del usuario actual
     */
    getCurrentUserId() {
        try {
            if (window.currentUser && window.currentUser.uid) {
                return window.currentUser.uid;
            }
            if (window.currentUser && window.currentUser.adminId) {
                return window.currentUser.adminId;
            }
            const stored = localStorage.getItem('currentUser');
            if (stored) {
                const user = JSON.parse(stored);
                return user.uid || user.adminId || 'unknown';
            }
            return 'unknown';
        } catch (error) {
            return 'unknown';
        }
    }

    /**
     * Obtener email del usuario actual
     */
    getCurrentUserEmail() {
        try {
            if (window.currentUser && window.currentUser.email) {
                return window.currentUser.email;
            }
            const stored = localStorage.getItem('currentUser');
            if (stored) {
                const user = JSON.parse(stored);
                return user.email || 'unknown';
            }
            return 'unknown';
        } catch (error) {
            return 'unknown';
        }
    }

    /**
     * Guardar log en localStorage como respaldo
     */
    saveToLocalStorage(logEntry) {
        try {
            const logs = JSON.parse(localStorage.getItem('audit_logs_backup') || '[]');
            logs.unshift(logEntry);
            // Mantener solo los últimos 500 logs en localStorage
            if (logs.length > 500) {
                logs.splice(500);
            }
            localStorage.setItem('audit_logs_backup', JSON.stringify(logs));
        } catch (error) {
            console.error('❌ Error guardando log en localStorage:', error);
        }
    }

    /**
     * Cargar logs recientes en caché
     */
    async loadRecentLogs() {
        try {
            if (window.firebase && window.firebase.firestore) {
                // Intentar con orderBy, si falla obtener todos y ordenar en memoria
                let snapshot;
                try {
                    snapshot = await window.firebase.firestore()
                    .collection(this.collectionName)
                    .orderBy('timestamp', 'desc')
                    .limit(this.maxLogsInMemory)
                    .get();
                } catch (orderByError) {
                    // Si orderBy falla, obtener todos y ordenar en memoria
                    let allSnapshot;
                    try {
                        allSnapshot = await window.firebase.firestore()
                            .collection(this.collectionName)
                            .limit(500) // Limitar para no cargar demasiados
                            .get();
                    } catch (limitError) {
                        // Si limit también falla, obtener todos sin limit
                        allSnapshot = await window.firebase.firestore()
                            .collection(this.collectionName)
                            .get();
                    }
                    
                    const logs = allSnapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));
                    
                    // Ordenar por timestamp descendente
                    logs.sort((a, b) => {
                        const timeA = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp || 0);
                        const timeB = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp || 0);
                        return timeB - timeA;
                    });
                    
                    this.logsCache = logs.slice(0, this.maxLogsInMemory);
                    return;
                }
                
                this.logsCache = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
            } else {
                // Cargar desde localStorage
                const logs = JSON.parse(localStorage.getItem('audit_logs_backup') || '[]');
                this.logsCache = logs.slice(0, this.maxLogsInMemory);
            }
        } catch (error) {
            console.warn('⚠️ Error cargando logs recientes:', error);
            // Cargar desde localStorage como respaldo
            try {
                const logs = JSON.parse(localStorage.getItem('audit_logs_backup') || '[]');
                this.logsCache = logs.slice(0, this.maxLogsInMemory);
            } catch (localError) {
                console.error('❌ Error cargando logs desde localStorage:', localError);
            }
        }
    }

    /**
     * Obtener logs filtrados
     * @param {Object} filters - Filtros (action, userId, startDate, endDate)
     * @param {number} limit - Límite de resultados
     */
    async getLogs(filters = {}, limit = 100) {
        try {
            if (window.firebase && window.firebase.firestore) {
                let query = window.firebase.firestore()
                    .collection(this.collectionName);

                if (filters.action) {
                    query = query.where('action', '==', filters.action);
                }
                if (filters.userId) {
                    query = query.where('userId', '==', filters.userId);
                }
                if (filters.startDate) {
                    query = query.where('timestamp', '>=', filters.startDate);
                }
                if (filters.endDate) {
                    query = query.where('timestamp', '<=', filters.endDate);
                }

                // Intentar orderBy, si falla ordenar en memoria
                let snapshot;
                try {
                    snapshot = await query.orderBy('timestamp', 'desc').limit(limit).get();
                } catch (orderByError) {
                    // Si orderBy falla, obtener sin ordenar y ordenar en memoria
                    try {
                        snapshot = await query.limit(limit * 2).get(); // Obtener más para filtrar mejor
                    } catch (limitError) {
                        // Si limit también falla, obtener todos sin limit
                        snapshot = await query.get();
                    }
                }

                let logs = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                // Ordenar en memoria si orderBy falló
                logs.sort((a, b) => {
                    const timeA = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp || 0);
                    const timeB = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp || 0);
                    return timeB - timeA; // Descendente
                });

                return logs.slice(0, limit);
            } else {
                // Filtrar desde caché/localStorage
                let logs = [...this.logsCache];
                
                if (filters.action) {
                    logs = logs.filter(log => log.action === filters.action);
                }
                if (filters.userId) {
                    logs = logs.filter(log => log.userId === filters.userId);
                }
                if (filters.startDate) {
                    logs = logs.filter(log => new Date(log.timestamp) >= filters.startDate);
                }
                if (filters.endDate) {
                    logs = logs.filter(log => new Date(log.timestamp) <= filters.endDate);
                }

                return logs.slice(0, limit);
            }
        } catch (error) {
            console.error('❌ Error obteniendo logs:', error);
            return [];
        }
    }

    /**
     * Obtener logs de un usuario específico
     */
    async getUserLogs(userId, limit = 50) {
        return await this.getLogs({ userId: userId }, limit);
    }

    /**
     * Obtener logs de una acción específica
     */
    async getActionLogs(action, limit = 50) {
        return await this.getLogs({ action: action }, limit);
    }

    /**
     * Exportar logs a JSON
     */
    async exportLogs(filters = {}, format = 'json') {
        const logs = await this.getLogs(filters, 1000);
        
        if (format === 'json') {
            return JSON.stringify(logs, null, 2);
        } else if (format === 'csv') {
            // Convertir a CSV
            const headers = ['timestamp', 'action', 'userId', 'userEmail', 'ipAddress', 'details'];
            const rows = logs.map(log => [
                log.timestampISO || log.timestamp,
                log.action,
                log.userId,
                log.userEmail,
                log.ipAddress,
                JSON.stringify(log.details)
            ]);
            
            return [
                headers.join(','),
                ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
            ].join('\n');
        }
        
        return logs;
    }

    /**
     * Limpiar logs antiguos (más de X días)
     */
    async cleanOldLogs(daysToKeep = 90) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

            if (window.firebase && window.firebase.firestore) {
                const snapshot = await window.firebase.firestore()
                    .collection(this.collectionName)
                    .where('timestamp', '<', cutoffDate)
                    .get();

                const batch = window.firebase.firestore().batch();
                snapshot.docs.forEach(doc => {
                    batch.delete(doc.ref);
                });
                await batch.commit();

                console.log(`✅ Limpiados ${snapshot.docs.length} logs antiguos`);
                return snapshot.docs.length;
            }
        } catch (error) {
            console.error('❌ Error limpiando logs antiguos:', error);
            return 0;
        }
    }
}

// Inicializar sistema de auditoría
const auditLogSystem = new AuditLogSystem();

// Hacer disponible globalmente
if (typeof window !== 'undefined') {
    window.auditLogSystem = auditLogSystem;
    
    // Inicializar cuando Firebase esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => auditLogSystem.initialize(), 2000);
        });
    } else {
        setTimeout(() => auditLogSystem.initialize(), 2000);
    }
}

// Exportar para uso en otros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuditLogSystem;
}

