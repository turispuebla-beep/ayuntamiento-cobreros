/*
Mejoras de Accesibilidad (WCAG 2.1)
© 2024 - Sistema de Gestión del Ayuntamiento de Cobreros

Implementa mejoras de accesibilidad según WCAG 2.1 nivel AA
para cumplir con la Ley de Accesibilidad

Contacto: editorturis@gmail.com
*/

class AccessibilityImprovements {
    constructor() {
        this.isInitialized = false;
        this.keyboardNavigationEnabled = true;
        this.screenReaderAnnouncements = [];
    }

    /**
     * Inicializar mejoras de accesibilidad
     */
    initialize() {
        if (this.isInitialized) return;

        // Mejorar navegación por teclado
        this.improveKeyboardNavigation();

        // Agregar etiquetas ARIA
        this.addAriaLabels();

        // Mejorar contraste
        this.improveContrast();

        // Agregar skip links - DESACTIVADO
        // this.addSkipLinks();

        // Mejorar focus visible
        this.improveFocusVisible();

        // Agregar anuncios para lectores de pantalla
        this.setupScreenReaderAnnouncements();

        // Mejorar formularios
        this.improveForms();

        // Agregar botón de accesibilidad
        this.addAccessibilityButton();

        this.isInitialized = true;
        console.log('✅ Mejoras de accesibilidad inicializadas');
    }

    /**
     * Mejorar navegación por teclado
     */
    improveKeyboardNavigation() {
        // Asegurar que todos los elementos interactivos sean accesibles por teclado
        document.addEventListener('keydown', (e) => {
            // Atajo para ir al contenido principal
            if (e.altKey && e.key === 'm') {
                const main = document.querySelector('main') || document.querySelector('#main-content');
                if (main) {
                    main.focus();
                    main.scrollIntoView({ behavior: 'smooth' });
                }
            }

            // Cerrar modales con Escape
            if (e.key === 'Escape') {
                const openModal = document.querySelector('.modal[style*="display: block"]');
                if (openModal) {
                    const closeBtn = openModal.querySelector('.close, [aria-label*="cerrar" i]');
                    if (closeBtn) {
                        closeBtn.click();
                    }
                }
            }
        });

        // Mejorar navegación en menús
        const menus = document.querySelectorAll('nav, .sidebar, .menu');
        menus.forEach(menu => {
            const items = menu.querySelectorAll('a, button, [role="menuitem"]');
            items.forEach((item, index) => {
                item.addEventListener('keydown', (e) => {
                    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
                        e.preventDefault();
                        const next = items[index + 1] || items[0];
                        next?.focus();
                    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
                        e.preventDefault();
                        const prev = items[index - 1] || items[items.length - 1];
                        prev?.focus();
                    }
                });
            });
        });
    }

    /**
     * Agregar etiquetas ARIA
     */
    addAriaLabels() {
        // Agregar labels a botones sin texto
        document.querySelectorAll('button:not([aria-label]):empty, button:not([aria-label]) i').forEach(btn => {
            const icon = btn.querySelector('i');
            if (icon) {
                const iconClass = icon.className;
                if (iconClass.includes('close') || iconClass.includes('times')) {
                    btn.setAttribute('aria-label', 'Cerrar');
                } else if (iconClass.includes('menu')) {
                    btn.setAttribute('aria-label', 'Menú');
                } else if (iconClass.includes('search')) {
                    btn.setAttribute('aria-label', 'Buscar');
                }
            }
        });

        // Agregar roles a elementos semánticos
        document.querySelectorAll('main').forEach(el => {
            if (!el.getAttribute('role')) {
                el.setAttribute('role', 'main');
            }
        });

        document.querySelectorAll('nav').forEach(el => {
            if (!el.getAttribute('role')) {
                el.setAttribute('role', 'navigation');
            }
        });

        // Agregar aria-live a regiones dinámicas
        const dynamicRegions = document.querySelectorAll('.notifications, .alerts, #notificationBell');
        dynamicRegions.forEach(region => {
            if (!region.getAttribute('aria-live')) {
                region.setAttribute('aria-live', 'polite');
                region.setAttribute('aria-atomic', 'true');
            }
        });
    }

    /**
     * Mejorar contraste de colores
     */
    improveContrast() {
        // Agregar clase para modo alto contraste
        const style = document.createElement('style');
        style.textContent = `
            .high-contrast {
                --primary-color: #000000;
                --secondary-color: #000000;
                --text-color: #000000;
                --bg-color: #FFFFFF;
                --border-color: #000000;
            }
            .high-contrast * {
                background-color: var(--bg-color) !important;
                color: var(--text-color) !important;
                border-color: var(--border-color) !important;
            }
            .high-contrast a {
                text-decoration: underline !important;
            }
            .high-contrast button, .high-contrast .btn {
                border: 2px solid var(--border-color) !important;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Agregar skip links
     */
    addSkipLinks() {
        const skipLinks = document.createElement('div');
        skipLinks.className = 'skip-links';
        skipLinks.innerHTML = `
            <a href="#main-content" class="skip-link">Saltar al contenido principal</a>
            <a href="#navigation" class="skip-link">Saltar a la navegación</a>
            <a href="#footer" class="skip-link">Saltar al pie de página</a>
        `;
        
        const style = document.createElement('style');
        style.textContent = `
            .skip-links {
                position: absolute;
                top: -100px;
                left: 0;
                z-index: 10000;
            }
            .skip-link {
                position: absolute;
                top: 0;
                left: 0;
                padding: 10px 15px;
                background: #000;
                color: #fff;
                text-decoration: none;
                z-index: 10001;
            }
            .skip-link:focus {
                top: 0;
            }
        `;
        document.head.appendChild(style);
        
        if (document.body) {
            document.body.insertBefore(skipLinks, document.body.firstChild);
        }
    }

    /**
     * Mejorar focus visible
     */
    improveFocusVisible() {
        const style = document.createElement('style');
        style.textContent = `
            *:focus-visible {
                outline: 3px solid #3b82f6 !important;
                outline-offset: 2px !important;
            }
            button:focus-visible,
            a:focus-visible,
            input:focus-visible,
            select:focus-visible,
            textarea:focus-visible {
                outline: 3px solid #3b82f6 !important;
                outline-offset: 2px !important;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Configurar anuncios para lectores de pantalla
     */
    setupScreenReaderAnnouncements() {
        // Crear región aria-live para anuncios
        const announcementRegion = document.createElement('div');
        announcementRegion.id = 'screen-reader-announcements';
        announcementRegion.setAttribute('aria-live', 'polite');
        announcementRegion.setAttribute('aria-atomic', 'true');
        announcementRegion.className = 'sr-only';
        announcementRegion.style.cssText = 'position: absolute; left: -10000px; width: 1px; height: 1px; overflow: hidden;';
        document.body.appendChild(announcementRegion);

        // Función global para anunciar
        window.announceToScreenReader = (message) => {
            announcementRegion.textContent = message;
            setTimeout(() => {
                announcementRegion.textContent = '';
            }, 1000);
        };
    }

    /**
     * Mejorar formularios
     */
    improveForms() {
        // Agregar labels a todos los inputs
        document.querySelectorAll('input:not([type="hidden"]), select, textarea').forEach(input => {
            if (!input.id) {
                input.id = `input-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            }

            const label = input.closest('.form-group')?.querySelector('label');
            if (label && !label.getAttribute('for')) {
                label.setAttribute('for', input.id);
            }

            // Agregar aria-required si es required
            if (input.hasAttribute('required') && !input.getAttribute('aria-required')) {
                input.setAttribute('aria-required', 'true');
            }

            // Agregar aria-invalid si hay error
            if (input.classList.contains('error') || input.getAttribute('aria-invalid') === 'true') {
                input.setAttribute('aria-invalid', 'true');
            }
        });

        // Mejorar mensajes de error
        document.querySelectorAll('.error-message, .form-error').forEach(error => {
            if (!error.id) {
                error.id = `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            }
            error.setAttribute('role', 'alert');
            error.setAttribute('aria-live', 'polite');
        });
    }

    /**
     * Agregar botón de accesibilidad
     */
    addAccessibilityButton() {
        const button = document.createElement('button');
        button.className = 'accessibility-button';
        button.setAttribute('aria-label', 'Opciones de accesibilidad');
        button.innerHTML = '♿';
        button.title = 'Opciones de accesibilidad';
        
        button.addEventListener('click', () => {
            this.showAccessibilityMenu();
        });

        const style = document.createElement('style');
        style.textContent = `
            .accessibility-button {
                position: fixed;
                bottom: 90px;
                left: 20px;
                right: auto !important;
                width: 50px;
                height: 50px;
                border-radius: 50%;
                background: #3b82f6;
                color: white;
                border: none;
                font-size: 24px;
                cursor: pointer;
                z-index: 10000;
                box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            }
            .accessibility-button:hover {
                background: #2563eb;
            }
            .accessibility-button:focus {
                outline: 3px solid #3b82f6;
                outline-offset: 2px;
            }
        `;
        document.head.appendChild(style);

        if (document.body) {
            document.body.appendChild(button);
        }
    }

    /**
     * Mostrar menú de accesibilidad
     */
    showAccessibilityMenu() {
        const menu = document.createElement('div');
        menu.className = 'accessibility-menu';
        menu.innerHTML = `
            <h3>Opciones de Accesibilidad</h3>
            <button id="toggle-high-contrast">Alto Contraste</button>
            <button id="increase-font-size">Aumentar Tamaño de Fuente</button>
            <button id="decrease-font-size">Disminuir Tamaño de Fuente</button>
            <button id="reset-accessibility">Restablecer</button>
            <button class="close-menu">Cerrar</button>
        `;

        const style = document.createElement('style');
        style.textContent = `
            .accessibility-menu {
                position: fixed;
                bottom: 150px;
                left: 20px;
                right: auto !important;
                background: white;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                z-index: 10001;
                min-width: 250px;
            }
            .accessibility-menu h3 {
                margin-top: 0;
            }
            .accessibility-menu button {
                display: block;
                width: 100%;
                margin: 10px 0;
                padding: 10px;
                background: #3b82f6;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
            }
            .accessibility-menu button:hover {
                background: #2563eb;
            }
        `;
        document.head.appendChild(style);
        document.body.appendChild(menu);

        // Event listeners
        document.getElementById('toggle-high-contrast')?.addEventListener('click', () => {
            document.body.classList.toggle('high-contrast');
            localStorage.setItem('highContrast', document.body.classList.contains('high-contrast'));
        });

        document.getElementById('increase-font-size')?.addEventListener('click', () => {
            const currentSize = parseFloat(getComputedStyle(document.body).fontSize);
            document.body.style.fontSize = `${currentSize * 1.1}px`;
            localStorage.setItem('fontSize', document.body.style.fontSize);
        });

        document.getElementById('decrease-font-size')?.addEventListener('click', () => {
            const currentSize = parseFloat(getComputedStyle(document.body).fontSize);
            document.body.style.fontSize = `${currentSize * 0.9}px`;
            localStorage.setItem('fontSize', document.body.style.fontSize);
        });

        document.getElementById('reset-accessibility')?.addEventListener('click', () => {
            document.body.classList.remove('high-contrast');
            document.body.style.fontSize = '';
            localStorage.removeItem('highContrast');
            localStorage.removeItem('fontSize');
        });

        menu.querySelector('.close-menu')?.addEventListener('click', () => {
            menu.remove();
        });

        // Cerrar al hacer clic fuera
        setTimeout(() => {
            document.addEventListener('click', function closeOnOutsideClick(e) {
                if (!menu.contains(e.target) && e.target.className !== 'accessibility-button') {
                    menu.remove();
                    document.removeEventListener('click', closeOnOutsideClick);
                }
            });
        }, 100);
    }

    /**
     * Cargar preferencias guardadas
     */
    loadSavedPreferences() {
        if (localStorage.getItem('highContrast') === 'true') {
            document.body.classList.add('high-contrast');
        }
        if (localStorage.getItem('fontSize')) {
            document.body.style.fontSize = localStorage.getItem('fontSize');
        }
    }
}

// Inicializar mejoras de accesibilidad
const accessibilityImprovements = new AccessibilityImprovements();

if (typeof window !== 'undefined') {
    window.accessibilityImprovements = accessibilityImprovements;
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            accessibilityImprovements.initialize();
            accessibilityImprovements.loadSavedPreferences();
        });
    } else {
        accessibilityImprovements.initialize();
        accessibilityImprovements.loadSavedPreferences();
    }
}

// Exportar
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AccessibilityImprovements;
}

