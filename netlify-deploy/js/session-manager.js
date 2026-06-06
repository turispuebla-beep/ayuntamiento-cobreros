/**
 * Session Manager - Gestión avanzada de sesiones
 * Timeout de sesión (cierre automático tras inactividad)
 * Opción de "recordar sesión" con tokens seguros
 * Ver sesiones activas, cerrar sesiones remotas
 */

class SessionManager {
    constructor() {
        this.INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutos
        this.WARNING_TIME = 5 * 60 * 1000; // 5 minutos antes de expirar
        this.inactivityTimer = null;
        this.warningTimer = null;
        this.lastActivity = Date.now();
        this.isRemembered = false;
        this.init();
    }

    init() {
        // Verificar si hay sesión recordada
        this.checkRememberedSession();
        
        // Configurar listeners de actividad
        this.setupActivityListeners();
        
        // Iniciar monitoreo de inactividad
        this.startInactivityMonitoring();
        
        // Cargar sesiones activas
        this.loadActiveSessions();
    }

    /**
     * Verifica si hay una sesión recordada válida
     */
    checkRememberedSession() {
        try {
            const remembered = localStorage.getItem('rememberedSession');
            if (remembered) {
                const session = JSON.parse(remembered);
                const now = Date.now();
                
                // Verificar expiración (30 días para sesiones recordadas)
                if (session.expiresAt && now < session.expiresAt) {
                    this.isRemembered = true;
                    // Restaurar sesión
                    if (session.userData) {
                        if (typeof window !== 'undefined') {
                            window.currentUser = session.userData;
                            window.isAdmin = session.userData.isAdmin || false;
                            window.isSuperAdmin = session.userData.isSuperAdmin || false;
                        }
                    }
                    console.log('✅ Sesión recordada restaurada');
                } else {
                    // Sesión expirada, limpiar
                    this.clearRememberedSession();
                }
            }
        } catch (error) {
            console.error('Error verificando sesión recordada:', error);
            this.clearRememberedSession();
        }
    }

    /**
     * Guarda una sesión recordada
     * @param {Object} userData - Datos del usuario
     * @param {number} days - Días de validez (default: 30)
     */
    saveRememberedSession(userData, days = 30) {
        try {
            const expiresAt = Date.now() + (days * 24 * 60 * 60 * 1000);
            const session = {
                userData: {
                    email: userData.email,
                    name: userData.name,
                    isAdmin: userData.isAdmin || false,
                    isSuperAdmin: userData.isSuperAdmin || false,
                    adminId: userData.adminId
                },
                expiresAt: expiresAt,
                createdAt: Date.now(),
                token: this.generateSecureToken()
            };
            
            localStorage.setItem('rememberedSession', JSON.stringify(session));
            this.isRemembered = true;
            
            // Guardar también en Firestore para sincronización
            this.saveSessionToFirestore(session);
        } catch (error) {
            console.error('Error guardando sesión recordada:', error);
        }
    }

    /**
     * Limpia la sesión recordada
     */
    clearRememberedSession() {
        localStorage.removeItem('rememberedSession');
        this.isRemembered = false;
        this.clearSessionFromFirestore();
    }

    /**
     * Genera un token seguro para la sesión
     */
    generateSecureToken() {
        const array = new Uint8Array(32);
        if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
            crypto.getRandomValues(array);
        } else {
            // Fallback para navegadores antiguos
            for (let i = 0; i < array.length; i++) {
                array[i] = Math.floor(Math.random() * 256);
            }
        }
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    /**
     * Configura listeners de actividad del usuario
     */
    setupActivityListeners() {
        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
        
        events.forEach(event => {
            document.addEventListener(event, () => {
                this.updateActivity();
            }, { passive: true });
        });
    }

    /**
     * Actualiza el tiempo de última actividad
     */
    updateActivity() {
        this.lastActivity = Date.now();
        
        // Reiniciar timers
        this.startInactivityMonitoring();
    }

    /**
     * Inicia el monitoreo de inactividad
     */
    startInactivityMonitoring() {
        // Limpiar timers anteriores
        if (this.inactivityTimer) {
            clearTimeout(this.inactivityTimer);
        }
        if (this.warningTimer) {
            clearTimeout(this.warningTimer);
        }

        // Timer de advertencia (5 minutos antes)
        const warningTime = this.INACTIVITY_TIMEOUT - this.WARNING_TIME;
        this.warningTimer = setTimeout(() => {
            this.showInactivityWarning();
        }, warningTime);

        // Timer de expiración
        this.inactivityTimer = setTimeout(() => {
            this.handleInactivityTimeout();
        }, this.INACTIVITY_TIMEOUT);
    }

    /**
     * Muestra advertencia de inactividad
     */
    showInactivityWarning() {
        if (typeof showNotification === 'function') {
            showNotification(
                'Su sesión expirará en 5 minutos por inactividad. Mueva el mouse o presione una tecla para continuar.',
                'warning',
                60000 // 1 minuto
            );
        }
    }

    /**
     * Maneja el timeout por inactividad
     */
    handleInactivityTimeout() {
        console.log('⏱️ Sesión expirada por inactividad');
        
        if (typeof showNotification === 'function') {
            showNotification('Su sesión ha expirado por inactividad. Por favor, inicie sesión nuevamente.', 'info');
        }
        
        // Cerrar sesión (excepto si está recordada)
        if (!this.isRemembered) {
            if (typeof logout === 'function') {
                logout();
            } else {
                // Fallback: limpiar manualmente
                if (typeof window !== 'undefined') {
                    window.currentUser = null;
                    window.isAdmin = false;
                    window.isSuperAdmin = false;
                    localStorage.removeItem('currentUser');
                    localStorage.removeItem('isAdmin');
                    localStorage.removeItem('isSuperAdmin');
                }
                
                // Recargar página
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
            }
        } else {
            // Si está recordada, solo reiniciar el timer
            this.startInactivityMonitoring();
        }
    }

    /**
     * Obtiene las sesiones activas del usuario
     */
    async loadActiveSessions() {
        try {
            if (typeof window !== 'undefined' && window.firebase && window.firebase.firestore && window.currentUser) {
                const db = window.firebase.firestore();
                const userId = window.currentUser.email || window.currentUser.adminId;
                
                const snapshot = await db.collection('active_sessions')
                    .where('userId', '==', userId)
                    .where('expiresAt', '>', Date.now())
                    .get();
                
                const sessions = [];
                snapshot.forEach(doc => {
                    sessions.push({
                        id: doc.id,
                        ...doc.data()
                    });
                });
                
                return sessions;
            }
        } catch (error) {
            console.error('Error cargando sesiones activas:', error);
        }
        return [];
    }

    /**
     * Cierra una sesión remota
     * @param {string} sessionId - ID de la sesión a cerrar
     */
    async closeRemoteSession(sessionId) {
        try {
            if (typeof window !== 'undefined' && window.firebase && window.firebase.firestore) {
                const db = window.firebase.firestore();
                await db.collection('active_sessions').doc(sessionId).delete();
                
                if (typeof showNotification === 'function') {
                    showNotification('Sesión cerrada correctamente', 'success');
                }
            }
        } catch (error) {
            console.error('Error cerrando sesión remota:', error);
            if (typeof showNotification === 'function') {
                showNotification('Error al cerrar la sesión', 'error');
            }
        }
    }

    /**
     * Guarda la sesión en Firestore
     */
    async saveSessionToFirestore(session) {
        try {
            if (typeof window !== 'undefined' && window.firebase && window.firebase.firestore && window.currentUser) {
                const db = window.firebase.firestore();
                const userId = window.currentUser.email || window.currentUser.adminId;
                
                await db.collection('active_sessions').doc(session.token).set({
                    userId: userId,
                    userData: session.userData,
                    createdAt: session.createdAt,
                    expiresAt: session.expiresAt,
                    ipAddress: await this.getClientIP(),
                    userAgent: navigator.userAgent,
                    isRemembered: true
                });
            }
        } catch (error) {
            console.warn('No se pudo guardar sesión en Firestore:', error);
        }
    }

    /**
     * Limpia la sesión de Firestore
     */
    async clearSessionFromFirestore() {
        try {
            if (typeof window !== 'undefined' && window.firebase && window.firebase.firestore) {
                const db = window.firebase.firestore();
                const remembered = localStorage.getItem('rememberedSession');
                
                if (remembered) {
                    const session = JSON.parse(remembered);
                    if (session.token) {
                        await db.collection('active_sessions').doc(session.token).delete();
                    }
                }
            }
        } catch (error) {
            console.warn('No se pudo limpiar sesión de Firestore:', error);
        }
    }

    /**
     * Obtiene la IP del cliente
     */
    async getClientIP() {
        // Esto se obtendría desde Cloud Functions o headers
        // Por ahora, retornamos un identificador de sesión
        return localStorage.getItem('clientSessionId') || 'unknown';
    }

    /**
     * Notifica sobre nuevo inicio de sesión
     */
    async notifyNewLogin() {
        try {
            if (typeof window !== 'undefined' && window.firebase && window.firebase.firestore && window.currentUser) {
                const db = window.firebase.firestore();
                const userId = window.currentUser.email || window.currentUser.adminId;
                
                // Enviar notificación si hay otras sesiones activas
                const sessions = await this.loadActiveSessions();
                if (sessions.length > 1) {
                    if (typeof showNotification === 'function') {
                        showNotification(
                            `Se ha detectado un nuevo inicio de sesión. Tiene ${sessions.length} sesiones activas.`,
                            'info'
                        );
                    }
                }
            }
        } catch (error) {
            console.warn('No se pudo notificar nuevo login:', error);
        }
    }
}

// Instancia global
const sessionManager = new SessionManager();

// Exponer globalmente
if (typeof window !== 'undefined') {
    window.sessionManager = sessionManager;
}

