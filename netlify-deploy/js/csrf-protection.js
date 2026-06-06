/*
Sistema de Protección CSRF
© 2024 - Sistema de Gestión del Ayuntamiento de Cobreros

Genera y valida tokens CSRF para proteger formularios críticos
contra ataques Cross-Site Request Forgery

Contacto: editorturis@gmail.com
*/

class CSRFProtection {
    constructor() {
        this.tokenStorageKey = 'csrf_token';
        this.tokenExpiryKey = 'csrf_token_expiry';
        this.tokenExpiryTime = 24 * 60 * 60 * 1000; // 24 horas
        this.currentToken = null;
    }

    /**
     * Generar token CSRF único
     * @returns {string} - Token CSRF
     */
    generateToken() {
        // Generar token aleatorio seguro
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        const token = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
        
        // Agregar timestamp para mayor seguridad
        const timestamp = Date.now();
        const combined = `${token}_${timestamp}`;
        
        // Hash simple (en producción usar algo más robusto)
        let hash = 0;
        for (let i = 0; i < combined.length; i++) {
            const char = combined.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convertir a 32 bits
        }
        
        return `${token}_${Math.abs(hash).toString(16)}`;
    }

    /**
     * Obtener token CSRF actual o generar uno nuevo
     * @param {boolean} forceNew - Forzar generación de nuevo token
     * @returns {string} - Token CSRF
     */
    getToken(forceNew = false) {
        // Si hay un token válido en memoria, usarlo
        if (!forceNew && this.currentToken) {
            return this.currentToken;
        }

        // Verificar si hay un token válido en localStorage
        const storedToken = localStorage.getItem(this.tokenStorageKey);
        const storedExpiry = localStorage.getItem(this.tokenExpiryKey);
        
        if (!forceNew && storedToken && storedExpiry) {
            const expiryTime = parseInt(storedExpiry, 10);
            const now = Date.now();
            
            // Si el token no ha expirado, usarlo
            if (now < expiryTime) {
                this.currentToken = storedToken;
                return storedToken;
            }
        }

        // Generar nuevo token
        const newToken = this.generateToken();
        const expiryTime = Date.now() + this.tokenExpiryTime;

        // Guardar en localStorage
        localStorage.setItem(this.tokenStorageKey, newToken);
        localStorage.setItem(this.tokenExpiryKey, expiryTime.toString());

        // Guardar en memoria
        this.currentToken = newToken;

        return newToken;
    }

    /**
     * Validar token CSRF
     * @param {string} token - Token a validar
     * @returns {boolean} - true si el token es válido
     */
    validateToken(token) {
        if (!token) {
            return false;
        }

        // Obtener token actual
        const currentToken = this.getToken();

        // Comparar tokens
        if (token !== currentToken) {
            return false;
        }

        // Verificar que no haya expirado
        const storedExpiry = localStorage.getItem(this.tokenExpiryKey);
        if (!storedExpiry) {
            return false;
        }

        const expiryTime = parseInt(storedExpiry, 10);
        const now = Date.now();

        if (now >= expiryTime) {
            // Token expirado, generar uno nuevo
            this.getToken(true);
            return false;
        }

        return true;
    }

    /**
     * Agregar token CSRF a un formulario
     * @param {HTMLFormElement} form - Formulario al que agregar el token
     * @returns {boolean} - true si se agregó correctamente
     */
    addTokenToForm(form) {
        if (!form || !(form instanceof HTMLFormElement)) {
            return false;
        }

        // Verificar si ya tiene un token
        const existingInput = form.querySelector('input[name="csrf_token"]');
        if (existingInput) {
            existingInput.value = this.getToken();
            return true;
        }

        // Crear input oculto con el token
        const tokenInput = document.createElement('input');
        tokenInput.type = 'hidden';
        tokenInput.name = 'csrf_token';
        tokenInput.value = this.getToken();
        tokenInput.setAttribute('data-csrf-token', 'true');

        form.appendChild(tokenInput);
        return true;
    }

    /**
     * Validar token desde un formulario
     * @param {HTMLFormElement|FormData} form - Formulario o FormData
     * @returns {boolean} - true si el token es válido
     */
    validateFormToken(form) {
        let token = null;

        if (form instanceof FormData) {
            token = form.get('csrf_token');
        } else if (form instanceof HTMLFormElement) {
            const formData = new FormData(form);
            token = formData.get('csrf_token');
        } else if (typeof form === 'object' && form.csrf_token) {
            token = form.csrf_token;
        } else if (typeof form === 'string') {
            token = form;
        }

        return this.validateToken(token);
    }

    /**
     * Agregar token a todos los formularios críticos de la página
     */
    addTokensToCriticalForms() {
        // Lista de IDs de formularios críticos
        const criticalFormIds = [
            'adminLoginForm',
            'createAdminForm',
            'registerForm',
            'passwordResetForm',
            'changePasswordForm',
            'deleteUserForm',
            'updateConfigForm'
        ];

        // Agregar token a formularios por ID
        criticalFormIds.forEach(formId => {
            const form = document.getElementById(formId);
            if (form) {
                this.addTokenToForm(form);
            }
        });

        // Agregar token a formularios con clase 'critical-form'
        const criticalForms = document.querySelectorAll('.critical-form');
        criticalForms.forEach(form => {
            this.addTokenToForm(form);
        });

        // Agregar token a formularios con atributo data-csrf-protected
        const protectedForms = document.querySelectorAll('[data-csrf-protected="true"]');
        protectedForms.forEach(form => {
            this.addTokenToForm(form);
        });
    }

    /**
     * Interceptar envíos de formularios para validar token
     */
    interceptFormSubmissions() {
        document.addEventListener('submit', (event) => {
            const form = event.target;

            // Solo validar formularios críticos
            const isCritical = form.classList.contains('critical-form') ||
                             form.hasAttribute('data-csrf-protected') ||
                             form.id && ['adminLoginForm', 'createAdminForm', 'deleteUserForm'].includes(form.id);

            if (isCritical) {
                // Asegurar que el formulario tenga token
                if (!form.querySelector('input[name="csrf_token"]')) {
                    this.addTokenToForm(form);
                }

                // Validar token antes de enviar
                if (!this.validateFormToken(form)) {
                    event.preventDefault();
                    event.stopPropagation();
                    
                    // Mostrar error
                    if (typeof showNotification === 'function') {
                        showNotification('Token de seguridad inválido. Por favor, recarga la página e intenta de nuevo.', 'error');
                    } else {
                        alert('Token de seguridad inválido. Por favor, recarga la página e intenta de nuevo.');
                    }

                    // Generar nuevo token
                    this.getToken(true);
                    
                    return false;
                }
            }
        }, true); // Usar capture phase para interceptar antes
    }

    /**
     * Inicializar protección CSRF
     */
    initialize() {
        // Generar token inicial
        this.getToken();

        // Agregar tokens a formularios críticos existentes
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.addTokensToCriticalForms();
                this.interceptFormSubmissions();
            });
        } else {
            this.addTokensToCriticalForms();
            this.interceptFormSubmissions();
        }

        // Observar cambios en el DOM para agregar tokens a nuevos formularios
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Verificar si el nodo es un formulario crítico
                        if (node.tagName === 'FORM' && 
                            (node.classList.contains('critical-form') || 
                             node.hasAttribute('data-csrf-protected'))) {
                            this.addTokenToForm(node);
                        }

                        // Verificar formularios dentro del nodo
                        const forms = node.querySelectorAll && node.querySelectorAll('form.critical-form, form[data-csrf-protected="true"]');
                        if (forms) {
                            forms.forEach(form => this.addTokenToForm(form));
                        }
                    }
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        console.log('✅ Protección CSRF inicializada');
    }

    /**
     * Invalidar token actual (útil para logout)
     */
    invalidateToken() {
        localStorage.removeItem(this.tokenStorageKey);
        localStorage.removeItem(this.tokenExpiryKey);
        this.currentToken = null;
    }

    /**
     * Obtener token para uso en peticiones AJAX
     * @returns {Object} - Objeto con el token para headers
     */
    getTokenForAjax() {
        return {
            'X-CSRF-Token': this.getToken()
        };
    }
}

// Crear instancia global
const csrfProtection = new CSRFProtection();

// Hacer disponible globalmente
if (typeof window !== 'undefined') {
    window.csrfProtection = csrfProtection;
    
    // Inicializar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            csrfProtection.initialize();
        });
    } else {
        csrfProtection.initialize();
    }
}

// Exportar para uso en otros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CSRFProtection;
}


