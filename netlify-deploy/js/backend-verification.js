/*
Sistema de Verificación Backend
© 2024 - Sistema de Gestión del Ayuntamiento de Cobreros

Verifica permisos y valida acciones críticas en el lado del cliente
antes de enviar al servidor. La verificación final debe hacerse en Cloud Functions.

Contacto: editorturis@gmail.com
*/

class BackendVerification {
    constructor() {
        this.verificationCache = new Map();
        this.cacheExpiry = 5 * 60 * 1000; // 5 minutos
    }

    /**
     * Verificar si el usuario tiene permisos de administrador
     * @returns {boolean} - true si es administrador
     */
    verifyAdminPermissions() {
        // Verificar en múltiples fuentes para mayor seguridad
        const isAdminFromStorage = localStorage.getItem('isAdmin') === 'true';
        const isSuperAdminFromStorage = localStorage.getItem('isSuperAdmin') === 'true';
        const currentUserFromStorage = JSON.parse(localStorage.getItem('currentUser') || '{}');
        const isAdminFromUser = currentUserFromStorage.isAdmin === true;
        const isSuperAdminFromUser = currentUserFromStorage.isSuperAdmin === true;
        const isAdminFromGlobal = window.isAdmin === true;
        const isSuperAdminFromGlobal = window.isSuperAdmin === true;

        return (isAdminFromStorage || isSuperAdminFromStorage || 
                isAdminFromUser || isSuperAdminFromUser ||
                isAdminFromGlobal || isSuperAdminFromGlobal);
    }

    /**
     * Verificar si el usuario es super administrador
     * @returns {boolean} - true si es super admin
     */
    verifySuperAdminPermissions() {
        const isSuperAdminFromStorage = localStorage.getItem('isSuperAdmin') === 'true';
        const currentUserFromStorage = JSON.parse(localStorage.getItem('currentUser') || '{}');
        const isSuperAdminFromUser = currentUserFromStorage.isSuperAdmin === true;
        const isSuperAdminFromGlobal = window.isSuperAdmin === true;

        return (isSuperAdminFromStorage || isSuperAdminFromUser || isSuperAdminFromGlobal);
    }

    /**
     * Verificar permisos para una acción específica
     * @param {string} action - Acción a verificar
     * @param {Object} context - Contexto adicional
     * @returns {Promise<boolean>} - true si tiene permisos
     */
    async verifyActionPermissions(action, context = {}) {
        // Verificar caché
        const cacheKey = `${action}_${JSON.stringify(context)}`;
        const cached = this.verificationCache.get(cacheKey);
        if (cached && Date.now() < cached.expiry) {
            return cached.result;
        }

        let hasPermission = false;

        switch (action) {
            case 'CREATE_ADMIN':
            case 'DELETE_ADMIN':
            case 'UPDATE_ADMIN':
                hasPermission = this.verifySuperAdminPermissions();
                break;

            case 'CREATE_USER':
            case 'DELETE_USER':
            case 'UPDATE_USER':
                hasPermission = this.verifyAdminPermissions();
                break;

            case 'UPDATE_CONFIG':
            case 'DELETE_CONFIG':
                hasPermission = this.verifyAdminPermissions();
                break;

            case 'VIEW_LOGS':
            case 'EXPORT_DATA':
                hasPermission = this.verifyAdminPermissions();
                break;

            case 'RESTORE_BACKUP':
            case 'CREATE_BACKUP':
                hasPermission = this.verifySuperAdminPermissions();
                break;

            default:
                hasPermission = this.verifyAdminPermissions();
        }

        // Guardar en caché
        this.verificationCache.set(cacheKey, {
            result: hasPermission,
            expiry: Date.now() + this.cacheExpiry
        });

        // Si no tiene permisos, registrar en logs
        if (!hasPermission && window.auditLogSystem) {
            await window.auditLogSystem.log('UNAUTHORIZED_ACTION_ATTEMPT', {
                action: action,
                context: context,
                userId: window.currentUser?.uid || 'unknown',
                userEmail: window.currentUser?.email || 'unknown'
            });
        }

        return hasPermission;
    }

    /**
     * Verificar y validar datos antes de enviar al servidor
     * @param {string} action - Acción a realizar
     * @param {Object} data - Datos a validar
     * @param {Object} schema - Esquema de validación
     * @returns {Object} - { valid: boolean, sanitizedData: Object, errors: Array }
     */
    async validateAndSanitizeData(action, data, schema = {}) {
        const errors = [];
        const sanitizedData = {};

        // Verificar permisos primero
        const hasPermission = await this.verifyActionPermissions(action);
        if (!hasPermission) {
            errors.push('No tienes permisos para realizar esta acción');
            return { valid: false, sanitizedData: {}, errors };
        }

        // Sanitizar datos según esquema
        if (window.inputSanitizer && schema) {
            try {
                sanitizedData = window.inputSanitizer.sanitizeObject(data, schema);
            } catch (error) {
                errors.push('Error al sanitizar datos: ' + error.message);
                return { valid: false, sanitizedData: {}, errors };
            }
        } else {
            sanitizedData = data;
        }

        // Validaciones adicionales según la acción
        switch (action) {
            case 'CREATE_ADMIN':
                if (!sanitizedData.email || !sanitizedData.name || !sanitizedData.password) {
                    errors.push('Faltan campos requeridos');
                }
                if (sanitizedData.password && sanitizedData.password.length < 6) {
                    errors.push('La contraseña debe tener al menos 6 caracteres');
                }
                break;

            case 'DELETE_ADMIN':
                if (!sanitizedData.adminId) {
                    errors.push('ID de administrador requerido');
                }
                // No permitir eliminarse a sí mismo
                if (sanitizedData.adminId === window.currentUser?.uid) {
                    errors.push('No puedes eliminar tu propia cuenta');
                }
                break;

            case 'UPDATE_CONFIG':
                // Validaciones específicas según el tipo de configuración
                break;
        }

        return {
            valid: errors.length === 0,
            sanitizedData: sanitizedData,
            errors: errors
        };
    }

    /**
     * Verificar token CSRF antes de acción crítica
     * @param {HTMLFormElement|FormData|string} formOrToken - Formulario o token
     * @returns {boolean} - true si el token es válido
     */
    verifyCSRFToken(formOrToken) {
        if (window.csrfProtection) {
            return window.csrfProtection.validateToken(formOrToken);
        }
        return true; // Si no hay protección CSRF, permitir (no ideal pero compatible)
    }

    /**
     * Limpiar caché de verificación
     */
    clearCache() {
        this.verificationCache.clear();
    }

    /**
     * Verificar permisos desde Firestore (verificación más robusta)
     * @param {string} userId - ID del usuario
     * @returns {Promise<Object>} - { isAdmin: boolean, isSuperAdmin: boolean }
     */
    async verifyPermissionsFromFirestore(userId) {
        try {
            if (!window.firebase || !window.firebase.firestore || !userId) {
                return { isAdmin: false, isSuperAdmin: false };
            }

            // Verificar en colección admins
            const adminDoc = await window.firebase.firestore()
                .collection('admins')
                .doc(userId)
                .get();

            if (adminDoc.exists) {
                const adminData = adminDoc.data();
                return {
                    isAdmin: adminData.isAdmin === true || adminData.isSuperAdmin === true,
                    isSuperAdmin: adminData.isSuperAdmin === true
                };
            }

            // Verificar en colección users
            const userDoc = await window.firebase.firestore()
                .collection('users')
                .doc(userId)
                .get();

            if (userDoc.exists) {
                const userData = userDoc.data();
                return {
                    isAdmin: userData.role === 'admin' || userData.role === 'super_admin' || userData.isAdmin === true,
                    isSuperAdmin: userData.role === 'super_admin' || userData.isSuperAdmin === true
                };
            }

            return { isAdmin: false, isSuperAdmin: false };
        } catch (error) {
            console.error('❌ Error verificando permisos desde Firestore:', error);
            return { isAdmin: false, isSuperAdmin: false };
        }
    }
}

// Crear instancia global
const backendVerification = new BackendVerification();

// Hacer disponible globalmente
if (typeof window !== 'undefined') {
    window.backendVerification = backendVerification;
}

// Exportar para uso en otros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BackendVerification;
}


