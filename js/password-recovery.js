/**
 * Password Recovery - Recuperación de contraseña mejorada
 * Tokens con expiración
 * Historial de recuperaciones
 * Notificación al cambiar contraseña
 */

class PasswordRecovery {
    constructor() {
        this.TOKEN_EXPIRY = 60 * 60 * 1000; // 1 hora
        this.MAX_RECOVERY_ATTEMPTS = 3; // Máximo 3 intentos por día
    }

    /**
     * Genera un token de recuperación de contraseña
     * @param {string} email - Email del usuario
     * @returns {string} - Token de recuperación
     */
    async generateRecoveryToken(email) {
        const token = this.generateSecureToken();
        const expiresAt = Date.now() + this.TOKEN_EXPIRY;
        
        // Guardar en Firestore
        await this.saveRecoveryTokenToFirestore(token, email, expiresAt);
        
        // Registrar en historial
        await this.addToRecoveryHistory(email);
        
        return token;
    }

    /**
     * Genera un token seguro
     */
    generateSecureToken() {
        const array = new Uint8Array(32);
        if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
            crypto.getRandomValues(array);
        } else {
            for (let i = 0; i < array.length; i++) {
                array[i] = Math.floor(Math.random() * 256);
            }
        }
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    /**
     * Verifica un token de recuperación
     * @param {string} token - Token a verificar
     * @returns {Object} - { valid: boolean, email: string, error: string }
     */
    async verifyRecoveryToken(token) {
        try {
            if (typeof window !== 'undefined' && window.firebase && window.firebase.firestore) {
                const db = window.firebase.firestore();
                const tokenDoc = await db.collection('password_recovery_tokens').doc(token).get();
                
                if (!tokenDoc.exists) {
                    return { valid: false, error: 'Token inválido' };
                }
                
                const data = tokenDoc.data();
                
                // Verificar expiración
                if (Date.now() > data.expiresAt) {
                    await tokenDoc.ref.delete();
                    return { valid: false, error: 'Token expirado' };
                }
                
                // Verificar si ya fue usado
                if (data.used === true) {
                    return { valid: false, error: 'Token ya utilizado' };
                }
                
                return { valid: true, email: data.email, userId: data.userId };
            }
        } catch (error) {
            console.error('Error verificando token de recuperación:', error);
            return { valid: false, error: 'Error al verificar token' };
        }
        
        return { valid: false, error: 'Token no encontrado' };
    }

    /**
     * Marca un token como usado
     * @param {string} token - Token usado
     */
    async markTokenAsUsed(token) {
        try {
            if (typeof window !== 'undefined' && window.firebase && window.firebase.firestore) {
                const db = window.firebase.firestore();
                await db.collection('password_recovery_tokens').doc(token).update({
                    used: true,
                    usedAt: Date.now()
                });
            }
        } catch (error) {
            console.error('Error marcando token como usado:', error);
        }
    }

    /**
     * Envía email de recuperación de contraseña
     * @param {string} email - Email destino
     * @returns {Promise<boolean>} - true si se envió correctamente
     */
    async sendRecoveryEmail(email) {
        try {
            // Verificar límite de intentos
            const canRecover = await this.checkRecoveryLimit(email);
            if (!canRecover.allowed) {
                if (typeof showNotification === 'function') {
                    showNotification(
                        `Ha excedido el límite de recuperaciones. Intente de nuevo en ${canRecover.waitTime} minutos.`,
                        'error'
                    );
                }
                return false;
            }
            
            const token = await this.generateRecoveryToken(email);
            const recoveryUrl = `${window.location.origin}${window.location.pathname}?recover=${token}`;
            
            // Enviar email usando Cloud Functions
            if (typeof window !== 'undefined' && window.firebase && window.firebase.functions) {
                const functions = window.firebase.functions();
                const sendPasswordRecoveryEmail = functions.httpsCallable('sendPasswordRecoveryEmail');
                
                await sendPasswordRecoveryEmail({
                    email: email,
                    token: token,
                    recoveryUrl: recoveryUrl
                });
                
                console.log('✅ Email de recuperación enviado a:', email);
                
                if (typeof showNotification === 'function') {
                    showNotification(
                        'Se ha enviado un email con las instrucciones para recuperar su contraseña.',
                        'success'
                    );
                }
                
                return true;
            } else {
                // Fallback
                console.warn('Cloud Functions no disponible');
                if (typeof showNotification === 'function') {
                    showNotification(
                        'Función de recuperación no disponible. Contacte al administrador.',
                        'error'
                    );
                }
                return false;
            }
        } catch (error) {
            console.error('Error enviando email de recuperación:', error);
            return false;
        }
    }

    /**
     * Verifica el límite de recuperaciones
     * @param {string} email - Email del usuario
     * @returns {Object} - { allowed: boolean, waitTime: number }
     */
    async checkRecoveryLimit(email) {
        try {
            if (typeof window !== 'undefined' && window.firebase && window.firebase.firestore) {
                const db = window.firebase.firestore();
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                
                const snapshot = await db.collection('password_recovery_history')
                    .where('email', '==', email)
                    .where('timestamp', '>=', today.getTime())
                    .get();
                
                if (snapshot.size >= this.MAX_RECOVERY_ATTEMPTS) {
                    const lastAttempt = snapshot.docs[snapshot.docs.length - 1].data();
                    const nextAllowed = new Date(lastAttempt.timestamp);
                    nextAllowed.setDate(nextAllowed.getDate() + 1);
                    const waitTime = Math.ceil((nextAllowed.getTime() - Date.now()) / 1000 / 60);
                    
                    return { allowed: false, waitTime };
                }
            }
        } catch (error) {
            console.error('Error verificando límite de recuperación:', error);
        }
        
        return { allowed: true, waitTime: 0 };
    }

    /**
     * Agrega una entrada al historial de recuperaciones
     * @param {string} email - Email del usuario
     */
    async addToRecoveryHistory(email) {
        try {
            if (typeof window !== 'undefined' && window.firebase && window.firebase.firestore) {
                const db = window.firebase.firestore();
                await db.collection('password_recovery_history').add({
                    email: email,
                    timestamp: Date.now(),
                    ipAddress: await this.getClientIP(),
                    userAgent: navigator.userAgent
                });
            }
        } catch (error) {
            console.error('Error agregando al historial de recuperación:', error);
        }
    }

    /**
     * Obtiene el historial de recuperaciones de un usuario
     * @param {string} email - Email del usuario
     * @returns {Promise<Array>}
     */
    async getRecoveryHistory(email) {
        try {
            if (typeof window !== 'undefined' && window.firebase && window.firebase.firestore) {
                const db = window.firebase.firestore();
                const snapshot = await db.collection('password_recovery_history')
                    .where('email', '==', email)
                    .orderBy('timestamp', 'desc')
                    .limit(10)
                    .get();
                
                const history = [];
                snapshot.forEach(doc => {
                    history.push({
                        id: doc.id,
                        ...doc.data()
                    });
                });
                
                return history;
            }
        } catch (error) {
            console.error('Error obteniendo historial de recuperación:', error);
        }
        
        return [];
    }

    /**
     * Notifica al cambiar contraseña
     * @param {string} email - Email del usuario
     */
    async notifyPasswordChanged(email) {
        try {
            if (typeof window !== 'undefined' && window.firebase && window.firebase.functions) {
                const functions = window.firebase.functions();
                const sendPasswordChangedNotification = functions.httpsCallable('sendPasswordChangedNotification');
                
                await sendPasswordChangedNotification({
                    email: email,
                    timestamp: Date.now(),
                    ipAddress: await this.getClientIP()
                });
                
                console.log('✅ Notificación de cambio de contraseña enviada');
            }
        } catch (error) {
            console.error('Error enviando notificación de cambio de contraseña:', error);
        }
    }

    /**
     * Guarda el token en Firestore
     */
    async saveRecoveryTokenToFirestore(token, email, expiresAt) {
        try {
            if (typeof window !== 'undefined' && window.firebase && window.firebase.firestore) {
                const db = window.firebase.firestore();
                
                // Obtener userId del email
                let userId = email;
                const userSnapshot = await db.collection('users')
                    .where('email', '==', email)
                    .limit(1)
                    .get();
                
                if (!userSnapshot.empty) {
                    userId = userSnapshot.docs[0].id;
                }
                
                await db.collection('password_recovery_tokens').doc(token).set({
                    email: email,
                    userId: userId,
                    expiresAt: expiresAt,
                    createdAt: Date.now(),
                    used: false
                });
            }
        } catch (error) {
            console.error('Error guardando token de recuperación:', error);
        }
    }

    /**
     * Obtiene la IP del cliente
     */
    async getClientIP() {
        return localStorage.getItem('clientSessionId') || 'unknown';
    }
}

// Instancia global
const passwordRecovery = new PasswordRecovery();

// Exponer globalmente
if (typeof window !== 'undefined') {
    window.passwordRecovery = passwordRecovery;
}

// Verificar token desde URL al cargar
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', async () => {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('recover');
        
        if (token) {
            const verification = await passwordRecovery.verifyRecoveryToken(token);
            
            if (verification.valid) {
                // Abrir modal de cambio de contraseña
                if (typeof openModal === 'function') {
                    // Guardar token temporalmente
                    sessionStorage.setItem('recoveryToken', token);
                    sessionStorage.setItem('recoveryEmail', verification.email);
                    
                    // Abrir modal de cambio de contraseña
                    // Esto se implementaría en el panel de administración
                    if (typeof showNotification === 'function') {
                        showNotification('Token válido. Puede cambiar su contraseña.', 'success');
                    }
                }
                
                // Limpiar URL
                window.history.replaceState({}, document.title, window.location.pathname);
            } else {
                if (typeof showNotification === 'function') {
                    showNotification(`❌ Error: ${verification.error}`, 'error');
                }
            }
        }
    });
}


