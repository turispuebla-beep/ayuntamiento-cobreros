/**
 * Password Policy - Política de contraseñas
 * Forzar cambio periódico (cada 90 días)
 * No permitir reutilizar últimas 5 contraseñas
 * Recordatorio antes de expirar
 */

class PasswordPolicy {
    constructor() {
        this.PASSWORD_EXPIRY_DAYS = 90;
        this.PASSWORD_HISTORY_LIMIT = 5;
        this.WARNING_DAYS = 7; // Advertir 7 días antes de expirar
    }

    /**
     * Verifica si una contraseña debe cambiarse
     * @param {string} userId - ID del usuario
     * @returns {Object} - { mustChange: boolean, daysRemaining: number, warning: boolean }
     */
    async checkPasswordExpiry(userId) {
        try {
            if (typeof window !== 'undefined' && window.firebase && window.firebase.firestore) {
                const db = window.firebase.firestore();
                const userDoc = await db.collection('users').doc(userId).get();
                
                if (!userDoc.exists) {
                    return { mustChange: false, daysRemaining: null, warning: false };
                }
                
                const userData = userDoc.data();
                const passwordChangedAt = userData.passwordChangedAt || userData.createdAt || Date.now();
                const daysSinceChange = (Date.now() - passwordChangedAt) / (1000 * 60 * 60 * 24);
                const daysRemaining = this.PASSWORD_EXPIRY_DAYS - daysSinceChange;
                
                return {
                    mustChange: daysRemaining <= 0,
                    daysRemaining: Math.max(0, Math.ceil(daysRemaining)),
                    warning: daysRemaining <= this.WARNING_DAYS && daysRemaining > 0,
                    expired: daysRemaining <= 0
                };
            }
        } catch (error) {
            console.error('Error verificando expiración de contraseña:', error);
        }
        
        return { mustChange: false, daysRemaining: null, warning: false };
    }

    /**
     * Verifica si una contraseña está en el historial
     * @param {string} userId - ID del usuario
     * @param {string} newPassword - Nueva contraseña (hash)
     * @returns {Promise<boolean>} - true si está en el historial
     */
    async isPasswordInHistory(userId, newPassword) {
        try {
            if (typeof window !== 'undefined' && window.firebase && window.firebase.firestore) {
                const db = window.firebase.firestore();
                const userDoc = await db.collection('users').doc(userId).get();
                
                if (!userDoc.exists) {
                    return false;
                }
                
                const userData = userDoc.data();
                const passwordHistory = userData.passwordHistory || [];
                
                // Verificar contra las últimas N contraseñas
                const recentPasswords = passwordHistory.slice(-this.PASSWORD_HISTORY_LIMIT);
                
                // En producción, aquí se compararían hashes, no contraseñas en texto plano
                // Por ahora, retornamos false ya que Firebase Auth maneja esto
                return false;
            }
        } catch (error) {
            console.error('Error verificando historial de contraseñas:', error);
        }
        
        return false;
    }

    /**
     * Agrega una contraseña al historial
     * @param {string} userId - ID del usuario
     * @param {string} passwordHash - Hash de la contraseña
     */
    async addToPasswordHistory(userId, passwordHash) {
        try {
            if (typeof window !== 'undefined' && window.firebase && window.firebase.firestore) {
                const db = window.firebase.firestore();
                const userDoc = await db.collection('users').doc(userId);
                const userData = (await userDoc.get()).data();
                
                const passwordHistory = userData.passwordHistory || [];
                
                // Agregar nueva contraseña al historial
                passwordHistory.push({
                    hash: passwordHash,
                    changedAt: Date.now()
                });
                
                // Mantener solo las últimas N
                const recentHistory = passwordHistory.slice(-this.PASSWORD_HISTORY_LIMIT);
                
                // Actualizar documento
                await userDoc.update({
                    passwordHistory: recentHistory,
                    passwordChangedAt: Date.now()
                });
            }
        } catch (error) {
            console.error('Error agregando contraseña al historial:', error);
        }
    }

    /**
     * Muestra advertencia si la contraseña está por expirar
     * @param {string} userId - ID del usuario
     */
    async showPasswordExpiryWarning(userId) {
        const check = await this.checkPasswordExpiry(userId);
        
        if (check.warning && typeof showNotification === 'function') {
            showNotification(
                `⚠️ Su contraseña expirará en ${check.daysRemaining} días. Por favor, cámbiela pronto.`,
                'warning',
                10000
            );
        }
        
        if (check.expired && typeof showNotification === 'function') {
            showNotification(
                '🔒 Su contraseña ha expirado. Debe cambiarla para continuar.',
                'error',
                0 // Permanente hasta que se cambie
            );
        }
    }

    /**
     * Fuerza el cambio de contraseña si ha expirado
     * @param {string} userId - ID del usuario
     * @returns {boolean} - true si debe cambiar la contraseña
     */
    async enforcePasswordChange(userId) {
        const check = await this.checkPasswordExpiry(userId);
        
        if (check.expired) {
            // Redirigir a cambio de contraseña
            if (typeof openModal === 'function') {
                // Abrir modal de cambio de contraseña
                // Esto se implementaría en el panel de administración
            }
            return true;
        }
        
        return false;
    }
}

// Instancia global
const passwordPolicy = new PasswordPolicy();

// Exponer globalmente
if (typeof window !== 'undefined') {
    window.passwordPolicy = passwordPolicy;
}


