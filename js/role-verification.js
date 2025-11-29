/*
Sistema de Verificación de Roles Mejorado
© 2024 - Sistema de Gestión del Ayuntamiento de Cobreros

Verifica roles y permisos en cada acción crítica del sistema
para prevenir acceso no autorizado

Contacto: editorturis@gmail.com
*/

class RoleVerification {
    constructor() {
        this.permissionCache = new Map();
        this.cacheExpiry = 5 * 60 * 1000; // 5 minutos
        this.actionPermissions = {
            // Acciones de Super Admin
            CREATE_ADMIN: ['super_admin'],
            DELETE_ADMIN: ['super_admin'],
            UPDATE_ADMIN: ['super_admin'],
            MANAGE_SYSTEM_CONFIG: ['super_admin'],
            VIEW_ALL_LOGS: ['super_admin'],
            EXPORT_ALL_DATA: ['super_admin'],
            MANAGE_BACKUPS: ['super_admin'],
            
            // Acciones de Admin
            CREATE_USER: ['admin', 'super_admin'],
            DELETE_USER: ['admin', 'super_admin'],
            UPDATE_USER: ['admin', 'super_admin'],
            VIEW_LOGS: ['admin', 'super_admin'],
            CREATE_NOTIFICATION: ['admin', 'super_admin'],
            DELETE_NOTIFICATION: ['admin', 'super_admin'],
            UPDATE_NOTIFICATION: ['admin', 'super_admin'],
            MANAGE_APPOINTMENTS: ['admin', 'super_admin'],
            VIEW_STATISTICS: ['admin', 'super_admin'],
            EXPORT_DATA: ['admin', 'super_admin'],
            
            // Acciones de Usuario
            VIEW_OWN_DATA: ['user', 'admin', 'super_admin'],
            UPDATE_OWN_DATA: ['user', 'admin', 'super_admin'],
            CREATE_APPOINTMENT: ['user', 'admin', 'super_admin']
        };
    }

    /**
     * Obtener rol del usuario actual
     * @returns {string} - 'super_admin', 'admin', 'user', o 'guest'
     */
    getCurrentUserRole() {
        if (typeof window === 'undefined') return 'guest';
        
        // Verificar super admin
        if (window.isSuperAdmin === true || 
            (window.currentUser && window.currentUser.isSuperAdmin === true) ||
            localStorage.getItem('isSuperAdmin') === 'true') {
            return 'super_admin';
        }
        
        // Verificar admin
        if (window.isAdmin === true || 
            (window.currentUser && window.currentUser.isAdmin === true) ||
            localStorage.getItem('isAdmin') === 'true') {
            return 'admin';
        }
        
        // Verificar usuario autenticado
        if (window.currentUser && window.currentUser.email) {
            return 'user';
        }
        
        return 'guest';
    }

    /**
     * Verificar si el usuario tiene permisos para una acción
     * @param {string} action - Acción a verificar
     * @param {Object} options - Opciones adicionales
     * @returns {Promise<{allowed: boolean, reason?: string}>}
     */
    async verifyActionPermission(action, options = {}) {
        const userRole = this.getCurrentUserRole();
        
        // Verificar caché
        const cacheKey = `${action}_${userRole}`;
        const cached = this.permissionCache.get(cacheKey);
        if (cached && Date.now() < cached.expiry) {
            return cached.result;
        }

        // Obtener roles permitidos para esta acción
        const allowedRoles = this.actionPermissions[action];
        if (!allowedRoles) {
            // Si la acción no está definida, solo super_admin puede ejecutarla
            const result = {
                allowed: userRole === 'super_admin',
                reason: userRole !== 'super_admin' ? 'Acción no definida. Solo super administradores pueden ejecutarla.' : undefined
            };
            this.permissionCache.set(cacheKey, {
                result,
                expiry: Date.now() + this.cacheExpiry
            });
            return result;
        }

        // Verificar si el rol del usuario está permitido
        const allowed = allowedRoles.includes(userRole);
        
        const result = {
            allowed,
            reason: !allowed ? `No tiene permisos para ${action}. Roles permitidos: ${allowedRoles.join(', ')}` : undefined
        };

        // Guardar en caché
        this.permissionCache.set(cacheKey, {
            result,
            expiry: Date.now() + this.cacheExpiry
        });

        // Si no tiene permisos, registrar en logs
        if (!allowed && typeof window !== 'undefined' && window.auditLogSystem) {
            try {
                await window.auditLogSystem.log('UNAUTHORIZED_ACTION_ATTEMPT', {
                    action: action,
                    userRole: userRole,
                    allowedRoles: allowedRoles,
                    userId: window.currentUser?.email || 'unknown',
                    ipAddress: await this.getClientIP() || 'unknown'
                });
            } catch (error) {
                console.warn('No se pudo registrar intento no autorizado:', error);
            }
        }

        return result;
    }

    /**
     * Verificar permisos desde el backend (más seguro)
     * @param {string} action - Acción a verificar
     * @returns {Promise<{allowed: boolean, reason?: string}>}
     */
    async verifyBackendPermission(action) {
        try {
            if (!window.currentUser || !window.currentUser.email) {
                return { allowed: false, reason: 'Usuario no autenticado' };
            }

            // Obtener token de Firebase Auth si está disponible
            let idToken = null;
            if (window.firebase && window.firebase.auth && window.firebase.auth().currentUser) {
                idToken = await window.firebase.auth().currentUser.getIdToken();
            }

            // Llamar a Cloud Function para verificar permisos
            const response = await fetch(`${window.CLOUD_FUNCTIONS_BASE_URL || 'https://us-central1-turisteam-80f1b.cloudfunctions.net'}/verifyPermission`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {})
                },
                body: JSON.stringify({
                    action: action,
                    userId: window.currentUser.email
                })
            });

            if (!response.ok) {
                return { allowed: false, reason: 'Error al verificar permisos en el servidor' };
            }

            const result = await response.json();
            return {
                allowed: result.allowed === true,
                reason: result.reason
            };
        } catch (error) {
            console.error('Error verificando permisos en backend:', error);
            // Fallback a verificación local
            return await this.verifyActionPermission(action);
        }
    }

    /**
     * Middleware para proteger funciones
     * @param {string} action - Acción a verificar
     * @param {Function} callback - Función a ejecutar si tiene permisos
     * @param {Object} options - Opciones adicionales
     */
    async requirePermission(action, callback, options = {}) {
        const { useBackend = false, showError = true } = options;
        
        const verification = useBackend 
            ? await this.verifyBackendPermission(action)
            : await this.verifyActionPermission(action);

        if (!verification.allowed) {
            if (showError && typeof window !== 'undefined' && typeof showNotification === 'function') {
                showNotification(verification.reason || 'No tiene permisos para realizar esta acción', 'error');
            }
            throw new Error(verification.reason || 'Permisos insuficientes');
        }

        return await callback();
    }

    /**
     * Obtener IP del cliente
     * @returns {Promise<string>}
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
     * Limpiar caché de permisos
     */
    clearCache() {
        this.permissionCache.clear();
    }

    /**
     * Registrar nueva acción en el sistema
     * @param {string} action - Nombre de la acción
     * @param {Array<string>} allowedRoles - Roles permitidos
     */
    registerAction(action, allowedRoles) {
        this.actionPermissions[action] = allowedRoles;
        this.clearCache(); // Limpiar caché al registrar nueva acción
    }
}

// Crear instancia global
if (typeof window !== 'undefined') {
    window.roleVerification = new RoleVerification();
    console.log('✅ Sistema de verificación de roles cargado');
}

