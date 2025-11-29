/**
 * Email Verification - Verificación de email
 * Enviar email de verificación al crear administradores
 * Requerir verificación antes del primer acceso
 */

class EmailVerification {
    constructor() {
        this.verificationTokens = new Map(); // token -> { email, expiresAt, userId }
    }

    /**
     * Genera un token de verificación
     * @param {string} email - Email a verificar
     * @param {string} userId - ID del usuario
     * @returns {string} - Token de verificación
     */
    generateVerificationToken(email, userId) {
        const token = this.generateSecureToken();
        const expiresAt = Date.now() + (24 * 60 * 60 * 1000); // 24 horas
        
        this.verificationTokens.set(token, {
            email,
            userId,
            expiresAt,
            createdAt: Date.now()
        });
        
        // Guardar en Firestore
        this.saveTokenToFirestore(token, email, userId, expiresAt);
        
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
     * Verifica un token de verificación
     * @param {string} token - Token a verificar
     * @returns {Object} - { valid: boolean, email: string, userId: string }
     */
    async verifyToken(token) {
        // Verificar en memoria
        const tokenData = this.verificationTokens.get(token);
        
        if (tokenData) {
            if (Date.now() > tokenData.expiresAt) {
                this.verificationTokens.delete(token);
                return { valid: false, error: 'Token expirado' };
            }
            return { valid: true, email: tokenData.email, userId: tokenData.userId };
        }
        
        // Verificar en Firestore
        try {
            if (typeof window !== 'undefined' && window.firebase && window.firebase.firestore) {
                const db = window.firebase.firestore();
                const tokenDoc = await db.collection('email_verifications').doc(token).get();
                
                if (!tokenDoc.exists) {
                    return { valid: false, error: 'Token inválido' };
                }
                
                const data = tokenDoc.data();
                
                if (Date.now() > data.expiresAt) {
                    await tokenDoc.ref.delete();
                    return { valid: false, error: 'Token expirado' };
                }
                
                return { valid: true, email: data.email, userId: data.userId };
            }
        } catch (error) {
            console.error('Error verificando token:', error);
            return { valid: false, error: 'Error al verificar token' };
        }
        
        return { valid: false, error: 'Token no encontrado' };
    }

    /**
     * Marca un email como verificado
     * @param {string} email - Email verificado
     * @param {string} userId - ID del usuario
     */
    async markEmailAsVerified(email, userId) {
        try {
            if (typeof window !== 'undefined' && window.firebase && window.firebase.firestore) {
                const db = window.firebase.firestore();
                
                // Actualizar usuario
                await db.collection('users').doc(userId).update({
                    emailVerified: true,
                    emailVerifiedAt: Date.now()
                });
                
                // Limpiar tokens de verificación de este email
                const tokensSnapshot = await db.collection('email_verifications')
                    .where('email', '==', email)
                    .get();
                
                tokensSnapshot.forEach(doc => {
                    doc.ref.delete();
                });
            }
        } catch (error) {
            console.error('Error marcando email como verificado:', error);
        }
    }

    /**
     * Envía email de verificación
     * @param {string} email - Email destino
     * @param {string} userId - ID del usuario
     * @returns {Promise<boolean>} - true si se envió correctamente
     */
    async sendVerificationEmail(email, userId) {
        try {
            const token = this.generateVerificationToken(email, userId);
            const verificationUrl = `${window.location.origin}${window.location.pathname}?verify=${token}`;
            
            // Enviar email usando Cloud Functions
            if (typeof window !== 'undefined' && window.firebase && window.firebase.functions) {
                const functions = window.firebase.functions();
                const sendVerificationEmail = functions.httpsCallable('sendVerificationEmail');
                
                await sendVerificationEmail({
                    email: email,
                    token: token,
                    verificationUrl: verificationUrl,
                    userId: userId
                });
                
                console.log('✅ Email de verificación enviado a:', email);
                return true;
            } else {
                // Fallback: mostrar mensaje al usuario
                console.warn('Cloud Functions no disponible, usando fallback');
                if (typeof showNotification === 'function') {
                    showNotification(
                        `Se ha generado un token de verificación. Por favor, contacte al administrador con este token: ${token.substring(0, 8)}...`,
                        'info'
                    );
                }
                return false;
            }
        } catch (error) {
            console.error('Error enviando email de verificación:', error);
            return false;
        }
    }

    /**
     * Verifica si un email está verificado
     * @param {string} userId - ID del usuario
     * @returns {Promise<boolean>}
     */
    async isEmailVerified(userId) {
        try {
            if (typeof window !== 'undefined' && window.firebase && window.firebase.firestore) {
                const db = window.firebase.firestore();
                const userDoc = await db.collection('users').doc(userId).get();
                
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    return userData.emailVerified === true;
                }
            }
        } catch (error) {
            console.error('Error verificando estado de email:', error);
        }
        
        return false;
    }

    /**
     * Requiere verificación antes del primer acceso
     * @param {string} userId - ID del usuario
     * @returns {Promise<boolean>} - true si requiere verificación
     */
    async requireVerificationBeforeAccess(userId) {
        const isVerified = await this.isEmailVerified(userId);
        
        if (!isVerified) {
            if (typeof showNotification === 'function') {
                showNotification(
                    '⚠️ Debe verificar su email antes de acceder. Revise su bandeja de entrada.',
                    'warning'
                );
            }
            return true;
        }
        
        return false;
    }

    /**
     * Guarda el token en Firestore
     */
    async saveTokenToFirestore(token, email, userId, expiresAt) {
        try {
            if (typeof window !== 'undefined' && window.firebase && window.firebase.firestore) {
                const db = window.firebase.firestore();
                await db.collection('email_verifications').doc(token).set({
                    email: email,
                    userId: userId,
                    expiresAt: expiresAt,
                    createdAt: Date.now(),
                    used: false
                });
            }
        } catch (error) {
            console.error('Error guardando token en Firestore:', error);
        }
    }
}

// Instancia global
const emailVerification = new EmailVerification();

// Exponer globalmente
if (typeof window !== 'undefined') {
    window.emailVerification = emailVerification;
}

// Verificar token desde URL al cargar
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', async () => {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('verify');
        
        if (token) {
            const verification = await emailVerification.verifyToken(token);
            
            if (verification.valid) {
                await emailVerification.markEmailAsVerified(verification.email, verification.userId);
                
                if (typeof showNotification === 'function') {
                    showNotification('✅ Email verificado correctamente', 'success');
                }
                
                // Limpiar URL
                window.history.replaceState({}, document.title, window.location.pathname);
            } else {
                if (typeof showNotification === 'function') {
                    showNotification(`❌ Error al verificar email: ${verification.error}`, 'error');
                }
            }
        }
    });
}


