/**
 * Módulo de utilidades compartidas por toda la aplicación web.
 */
(function registerUtilsModule(global) {
    function escapeHtml(text) {
        if (text == null) {
            return '';
        }
        const div = global.document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
    }

    function escapeForHtml(text) {
        if (text == null) {
            return '';
        }
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function isValidUrl(url) {
        if (!url || typeof url !== 'string') {
            return false;
        }
        try {
            new URL(url);
            return true;
        } catch {
            return url.startsWith('/') || url.startsWith('./') || url.startsWith('../');
        }
    }

    const validators = {
        required(value, fieldName) {
            if (!value || (typeof value === 'string' && value.trim() === '')) {
                return `${fieldName} es obligatorio`;
            }
            return null;
        },
        url(value) {
            if (!value) {
                return null;
            }
            if (!isValidUrl(value)) {
                return 'URL inválida';
            }
            return null;
        },
        positiveNumber(value) {
            const num = parseInt(value, 10);
            if (Number.isNaN(num) || num < 1) {
                return 'Debe ser un número mayor a 0';
            }
            return null;
        },
        email(value) {
            if (!value) {
                return null;
            }
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                return 'Email inválido';
            }
            return null;
        },
        postalCode(value) {
            if (!value) {
                return null;
            }
            const postalCodeRegex = /^[0-9]{5}$/;
            if (!postalCodeRegex.test(value)) {
                return 'El código postal debe tener 5 dígitos';
            }
            return null;
        }
    };

    function debounce(func, wait) {
        let timeout;
        return function debouncedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    const culturaOcioCache = {
        modal: null,
        containers: {},
        getModal() {
            if (!this.modal) {
                this.modal = global.document.getElementById('culturaOcioModal');
            }
            return this.modal;
        },
        getContainer(id) {
            if (!this.containers[id]) {
                this.containers[id] = global.document.getElementById(id);
            }
            return this.containers[id];
        },
        clear() {
            this.modal = null;
            this.containers = {};
        }
    };

    function createBadge(text, color = '#3b82f6') {
        const badge = global.document.createElement('span');
        badge.style.cssText = `background: ${color}; color: white; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem;`;
        badge.textContent = text;
        return badge;
    }

    function createActionButton(text, icon, onClick, variant = 'primary') {
        const button = global.document.createElement('button');
        button.className = `btn btn-sm btn-${variant}`;
        button.innerHTML = `<i class="fas fa-${icon}"></i> ${text}`;
        button.onclick = onClick;
        button.style.cssText = 'padding: 0.5rem 1rem; font-size: 0.875rem;';
        return button;
    }

    function showLoadingState(containerId, message = 'Cargando...') {
        const container = global.document.getElementById(containerId);
        if (!container) {
            return;
        }
        container.innerHTML = `
        <div class="loading-state" style="text-align: center; padding: 2rem; color: #6b7280;">
            <div style="display: inline-block; width: 40px; height: 40px; border: 4px solid #e5e7eb; border-top-color: #3b82f6; border-radius: 50%; animation: spin 1s linear infinite;"></div>
            <p style="margin-top: 1rem;">${escapeHtml(message)}</p>
        </div>
    `;
        if (!global.document.getElementById('loading-spinner-style')) {
            const style = global.document.createElement('style');
            style.id = 'loading-spinner-style';
            style.textContent = `
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
        `;
            global.document.head.appendChild(style);
        }
    }

    const TARJETAS_A_ELIMINAR = [
        'Quesos Artesanales',
        'Vinos de la Tierra'
    ];

    Object.assign(global, {
        escapeHtml,
        escapeForHtml,
        isValidUrl,
        validators,
        debounce,
        culturaOcioCache,
        createBadge,
        createActionButton,
        showLoadingState,
        TARJETAS_A_ELIMINAR
    });
})(window);


