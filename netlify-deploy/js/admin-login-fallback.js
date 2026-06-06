/**
 * Script de respaldo para handleAdminLogin
 * Se carga ANTES de script.js para asegurar que handleAdminLogin esté disponible
 * incluso si script.js falla al cargar debido a problemas de caché
 */

(function() {
    'use strict';
    
    // Credenciales de administrador (mismas que en script.js)
    const SUPER_ADMIN = {
        email: atob('ZWRpdG9ydHVyaXNAZ21haWwuY29t'), // editorturis@gmail.com
        password: atob('MjkxMDIwMTI='), // 29102012
        name: 'Super Admin',
        isHidden: true,
        isSuperAdmin: true,
        team: 'TURISTEAM'
    };
    
    const ADMIN_CREDENTIALS = {
        email: atob('YXl0b2NvYnJlcm9zQGdtYWlsLmNvbQ=='), // aytocobreros@gmail.com
        password: atob('YWRtaW4xMjM='), // admin123
        name: 'Administrador Ayuntamiento',
        isHidden: true,
        isAdmin: true
    };
    
    // Exponer credenciales globalmente
    if (typeof window !== 'undefined') {
        window.SUPER_ADMIN = SUPER_ADMIN;
        window.ADMIN_CREDENTIALS = ADMIN_CREDENTIALS;
    }
    
    // Función de login de respaldo
    async function fallbackHandleAdminLogin(eventOrEmail, maybePassword, recaptchaToken) {
        const form = typeof eventOrEmail === 'string' ? document.getElementById('adminLoginForm') : eventOrEmail?.target || document.getElementById('adminLoginForm');
        const adminFeedback = document.getElementById('adminLoginFeedback');
        
        const clearAdminLoginFeedback = () => {
            if (adminFeedback) {
                adminFeedback.textContent = '';
                adminFeedback.style.display = 'none';
            }
        };
        
        const showAdminLoginError = (message) => {
            if (adminFeedback) {
                adminFeedback.textContent = message;
                adminFeedback.style.display = 'block';
            } else if (typeof showNotification === 'function') {
                showNotification(message, 'error');
            } else {
                alert(message);
            }
        };
        
        const finalizeSuccessLogin = () => {
            if (form) {
                form.reset();
            }
            clearAdminLoginFeedback();
            if (typeof closeModal === 'function') {
                closeModal('adminLoginModal');
            }
        };
        
        let email;
        let password;
        
        if (typeof eventOrEmail === 'string') {
            email = eventOrEmail;
            password = maybePassword || '';
        } else {
            const event = eventOrEmail;
            if (event && typeof event.preventDefault === 'function') {
                event.preventDefault();
            }
            const formData = new FormData(form);
            email = formData.get('email');
            password = formData.get('password');
        }
        
        clearAdminLoginFeedback();
        
        if (!email || !password) {
            showAdminLoginError('Introduce correo y contraseña.');
            return false;
        }
        
        // Verificar SUPER_ADMIN
        if (email === SUPER_ADMIN.email && password === SUPER_ADMIN.password) {
            if (typeof window !== 'undefined') {
                window.isSuperAdmin = true;
                window.isAdmin = true;
                if (typeof localStorage !== 'undefined') {
                    localStorage.setItem('isSuperAdmin', 'true');
                    localStorage.setItem('isAdmin', 'true');
                    window.currentUser = {
                        email,
                        name: SUPER_ADMIN.name,
                        isSuperAdmin: true,
                        team: SUPER_ADMIN.team
                    };
                    localStorage.setItem('currentUser', JSON.stringify(window.currentUser));
                }
            }
            
            if (typeof updateUserInterface === 'function') {
                updateUserInterface();
            }
            finalizeSuccessLogin();
            if (typeof showNotification === 'function') {
                showNotification('Sesión de administrador iniciada correctamente', 'success');
            }
            return true;
        }
        
        // Verificar ADMIN_CREDENTIALS
        if (email === ADMIN_CREDENTIALS.email && password === ADMIN_CREDENTIALS.password) {
            if (typeof window !== 'undefined') {
                window.isAdmin = true;
                if (typeof localStorage !== 'undefined') {
                    localStorage.setItem('isAdmin', 'true');
                    window.currentUser = {
                        email: ADMIN_CREDENTIALS.email,
                        name: ADMIN_CREDENTIALS.name,
                        isAdmin: true,
                        isDefault: true
                    };
                    localStorage.setItem('currentUser', JSON.stringify(window.currentUser));
                }
            }
            
            if (typeof updateUserInterface === 'function') {
                updateUserInterface();
            }
            finalizeSuccessLogin();
            if (typeof showNotification === 'function') {
                showNotification('Sesión de administrador iniciada - Ayuntamiento de Cobreros', 'success');
            }
            return true;
        }
        
        // Verificar administradores personalizados si están disponibles
        if (typeof window !== 'undefined' && window.administrators && Array.isArray(window.administrators)) {
            const admin = window.administrators.find(item => item.email === email && item.password === password && item.isActive);
            if (admin) {
                if (typeof window !== 'undefined') {
                    window.isAdmin = true;
                    if (typeof localStorage !== 'undefined') {
                        window.currentUser = {
                            email: admin.email,
                            name: admin.name,
                            isAdmin: true,
                            adminId: admin.id
                        };
                        localStorage.setItem('currentUser', JSON.stringify(window.currentUser));
                        localStorage.setItem('isAdmin', 'true');
                    }
                }
                
                if (typeof updateUserInterface === 'function') {
                    updateUserInterface();
                }
                finalizeSuccessLogin();
                if (typeof showNotification === 'function') {
                    showNotification(`Sesión de administrador iniciada - ${admin.name}`, 'success');
                }
                return true;
            }
        }
        
        showAdminLoginError('Credenciales de administrador incorrectas');
        return false;
    }
    
    // Exponer handleAdminLogin globalmente INMEDIATAMENTE
    if (typeof window !== 'undefined') {
        // Solo establecer si no existe ya (para no sobrescribir la versión completa de script.js)
        if (typeof window.handleAdminLogin === 'undefined') {
            window.handleAdminLogin = fallbackHandleAdminLogin;
            if (typeof console !== 'undefined' && console.log) {
                console.log('✅ handleAdminLogin (fallback) expuesta globalmente');
            }
        }
        
        // Marcar que el fallback está disponible
        window.adminLoginFallbackLoaded = true;
        
        // También exponer como variable global (sin window) para compatibilidad
        if (typeof handleAdminLogin === 'undefined') {
            // Intentar exponer globalmente si es posible
            try {
                if (typeof globalThis !== 'undefined') {
                    globalThis.handleAdminLogin = fallbackHandleAdminLogin;
                }
            } catch (e) {
                // Ignorar errores
            }
        }
    }
})();

