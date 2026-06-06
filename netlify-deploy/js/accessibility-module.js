/* global showNotification */

/**
 * MÓDULO DE ACCESIBILIDAD
 * Proporciona funcionalidades de accesibilidad para hacer el sitio web funcional para todos
 * Cumple con WCAG 2.1 nivel AA
 */

const AccessibilityModule = {
    // Configuración
    config: {
        fontSize: 1, // Factor de escala (1 = 100%)
        highContrast: false,
        reducedMotion: false,
        keyboardNavigation: true,
        screenReaderAnnouncements: true
    },
    
    /**
     * Inicializar módulo de accesibilidad
     */
    init() {
        console.log('♿ Inicializando Módulo de Accesibilidad...');
        
        // Cargar configuración guardada
        this.loadConfig();
        
        // Aplicar configuración guardada
        this.applyConfig();
        
        // Crear panel de accesibilidad
        this.createAccessibilityPanel();
        
        // Mejorar navegación por teclado
        this.enhanceKeyboardNavigation();
        
        // Mejorar indicadores de foco
        this.enhanceFocusIndicators();
        
        // Agregar anuncios para lectores de pantalla
        this.setupScreenReaderAnnouncements();
        
        // Detectar preferencias del sistema
        this.detectSystemPreferences();
        
        // Agregar atajos de teclado
        this.setupKeyboardShortcuts();
        
        console.log('✅ Módulo de Accesibilidad inicializado');
    },
    
    /**
     * Cargar configuración desde localStorage
     */
    loadConfig() {
        try {
            const saved = localStorage.getItem('accessibilityConfig');
            if (saved) {
                this.config = { ...this.config, ...JSON.parse(saved) };
            }
        } catch (error) {
            console.error('Error cargando configuración de accesibilidad:', error);
        }
    },
    
    /**
     * Guardar configuración en localStorage
     */
    saveConfig() {
        try {
            localStorage.setItem('accessibilityConfig', JSON.stringify(this.config));
        } catch (error) {
            console.error('Error guardando configuración de accesibilidad:', error);
        }
    },
    
    /**
     * Aplicar configuración actual
     */
    applyConfig() {
        const root = document.documentElement;
        
        // Aplicar tamaño de fuente
        root.style.setProperty('--font-size-scale', this.config.fontSize);
        document.body.style.fontSize = `${this.config.fontSize * 100}%`;
        
        // Aplicar alto contraste
        if (this.config.highContrast) {
            document.body.classList.add('high-contrast');
        } else {
            document.body.classList.remove('high-contrast');
        }
        
        // Aplicar movimiento reducido
        if (this.config.reducedMotion) {
            document.body.classList.add('reduced-motion');
        } else {
            document.body.classList.remove('reduced-motion');
        }
    },
    
    /**
     * Crear panel de accesibilidad
     */
    createAccessibilityPanel() {
        // Crear botón flotante en la parte inferior izquierda
        const toggleBtn = document.createElement('button');
        toggleBtn.id = 'accessibilityToggle';
        toggleBtn.className = 'accessibility-toggle';
        toggleBtn.setAttribute('aria-label', 'Abrir panel de accesibilidad');
        toggleBtn.setAttribute('title', 'Accesibilidad (Alt + A)');
        toggleBtn.innerHTML = '<i class="fas fa-universal-access" aria-hidden="true"></i>';
        toggleBtn.addEventListener('click', () => this.togglePanel());
        
        // Crear panel
        const panel = document.createElement('div');
        panel.id = 'accessibilityPanel';
        panel.className = 'accessibility-panel';
        panel.setAttribute('role', 'dialog');
        panel.setAttribute('aria-labelledby', 'accessibilityPanelTitle');
        panel.setAttribute('aria-hidden', 'true');
        panel.innerHTML = `
            <div class="accessibility-panel-header">
                <h2 id="accessibilityPanelTitle">Opciones de Accesibilidad</h2>
                <button class="accessibility-close" aria-label="Cerrar panel" onclick="AccessibilityModule.closePanel()">
                    <i class="fas fa-times" aria-hidden="true"></i>
                </button>
            </div>
            <div class="accessibility-panel-content">
                <div class="accessibility-option">
                    <label>
                        <span>Tamaño de texto</span>
                        <div class="font-size-controls">
                            <button class="btn-icon" aria-label="Reducir tamaño de texto" onclick="AccessibilityModule.decreaseFontSize()">
                                <i class="fas fa-minus" aria-hidden="true"></i>
                            </button>
                            <span class="font-size-value">${Math.round(this.config.fontSize * 100)}%</span>
                            <button class="btn-icon" aria-label="Aumentar tamaño de texto" onclick="AccessibilityModule.increaseFontSize()">
                                <i class="fas fa-plus" aria-hidden="true"></i>
                            </button>
                            <button class="btn-reset" onclick="AccessibilityModule.resetFontSize()">Restablecer</button>
                        </div>
                    </label>
                </div>
                
                <div class="accessibility-option">
                    <label class="switch-label">
                        <input type="checkbox" id="highContrastToggle" ${this.config.highContrast ? 'checked' : ''} 
                               onchange="AccessibilityModule.toggleHighContrast(this.checked)">
                        <span>Alto contraste</span>
                    </label>
                    <p class="option-description">Mejora el contraste de colores para facilitar la lectura</p>
                </div>
                
                <div class="accessibility-option">
                    <label class="switch-label">
                        <input type="checkbox" id="reducedMotionToggle" ${this.config.reducedMotion ? 'checked' : ''} 
                               onchange="AccessibilityModule.toggleReducedMotion(this.checked)">
                        <span>Reducir animaciones</span>
                    </label>
                    <p class="option-description">Reduce las animaciones y transiciones</p>
                </div>
                
                <div class="accessibility-option">
                    <h3>Atajos de teclado</h3>
                    <ul class="keyboard-shortcuts-list">
                        <li><kbd>Alt</kbd> + <kbd>A</kbd> - Abrir panel de accesibilidad</li>
                        <li><kbd>Alt</kbd> + <kbd>M</kbd> - Ir al menú principal</li>
                        <li><kbd>Alt</kbd> + <kbd>C</kbd> - Ir al contenido principal</li>
                        <li><kbd>Tab</kbd> - Navegar por elementos</li>
                        <li><kbd>Enter</kbd> / <kbd>Espacio</kbd> - Activar elemento</li>
                        <li><kbd>Esc</kbd> - Cerrar modales/paneles</li>
                    </ul>
                </div>
                
                <div class="accessibility-option">
                    <button class="btn btn-primary btn-block" onclick="AccessibilityModule.resetAllSettings()">
                        Restablecer todas las opciones
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(toggleBtn);
        document.body.appendChild(panel);
        
        // Cerrar panel al hacer clic fuera
        panel.addEventListener('click', (e) => {
            if (e.target === panel) {
                this.closePanel();
            }
        });
    },
    
    /**
     * Abrir/cerrar panel
     */
    togglePanel() {
        const panel = document.getElementById('accessibilityPanel');
        const isHidden = panel.getAttribute('aria-hidden') === 'true';
        
        if (isHidden) {
            this.openPanel();
        } else {
            this.closePanel();
        }
    },
    
    /**
     * Abrir panel
     */
    openPanel() {
        const panel = document.getElementById('accessibilityPanel');
        panel.setAttribute('aria-hidden', 'false');
        panel.classList.add('active');
        
        // Enfocar primer elemento interactivo
        const firstInput = panel.querySelector('input, button');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
    },
    
    /**
     * Cerrar panel
     */
    closePanel() {
        const panel = document.getElementById('accessibilityPanel');
        panel.setAttribute('aria-hidden', 'true');
        panel.classList.remove('active');
        
        // Devolver foco al botón toggle
        const toggleBtn = document.getElementById('accessibilityToggle');
        if (toggleBtn) {
            toggleBtn.focus();
        }
    },
    
    /**
     * Aumentar tamaño de fuente
     */
    increaseFontSize() {
        if (this.config.fontSize < 2) {
            this.config.fontSize = Math.min(this.config.fontSize + 0.1, 2);
            this.applyConfig();
            this.saveConfig();
            this.announce('Tamaño de texto aumentado a ' + Math.round(this.config.fontSize * 100) + ' por ciento');
        }
    },
    
    /**
     * Reducir tamaño de fuente
     */
    decreaseFontSize() {
        if (this.config.fontSize > 0.8) {
            this.config.fontSize = Math.max(this.config.fontSize - 0.1, 0.8);
            this.applyConfig();
            this.saveConfig();
            this.announce('Tamaño de texto reducido a ' + Math.round(this.config.fontSize * 100) + ' por ciento');
        }
    },
    
    /**
     * Restablecer tamaño de fuente
     */
    resetFontSize() {
        this.config.fontSize = 1;
        this.applyConfig();
        this.saveConfig();
        this.announce('Tamaño de texto restablecido');
    },
    
    /**
     * Activar/desactivar alto contraste
     */
    toggleHighContrast(enabled) {
        this.config.highContrast = enabled;
        this.applyConfig();
        this.saveConfig();
        this.announce(enabled ? 'Alto contraste activado' : 'Alto contraste desactivado');
    },
    
    /**
     * Activar/desactivar movimiento reducido
     */
    toggleReducedMotion(enabled) {
        this.config.reducedMotion = enabled;
        this.applyConfig();
        this.saveConfig();
        this.announce(enabled ? 'Animaciones reducidas' : 'Animaciones normales');
    },
    
    /**
     * Restablecer todas las opciones
     */
    resetAllSettings() {
        this.config = {
            fontSize: 1,
            highContrast: false,
            reducedMotion: false,
            keyboardNavigation: true,
            screenReaderAnnouncements: true
        };
        this.applyConfig();
        this.saveConfig();
        
        // Actualizar checkboxes
        document.getElementById('highContrastToggle').checked = false;
        document.getElementById('reducedMotionToggle').checked = false;
        
        this.announce('Todas las opciones de accesibilidad han sido restablecidas');
        showNotification('Opciones de accesibilidad restablecidas', 'success');
    },
    
    /**
     * Mejorar navegación por teclado
     */
    enhanceKeyboardNavigation() {
        // Mejorar navegación en modales
        document.addEventListener('keydown', (e) => {
            // Atrapa el foco dentro de modales
            if (e.key === 'Tab') {
                const modal = document.querySelector('.modal.active, .modal.show');
                if (modal) {
                    const focusableElements = modal.querySelectorAll(
                        'a[href], button:not([disabled]), textarea:not([disabled]), ' +
                        'input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
                    );
                    
                    if (focusableElements.length === 0) return;
                    
                    const firstElement = focusableElements[0];
                    const lastElement = focusableElements[focusableElements.length - 1];
                    
                    if (e.shiftKey && document.activeElement === firstElement) {
                        e.preventDefault();
                        lastElement.focus();
                    } else if (!e.shiftKey && document.activeElement === lastElement) {
                        e.preventDefault();
                        firstElement.focus();
                    }
                }
            }
        });
        
        // Mejorar navegación en menús
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach((link, index) => {
            link.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                    e.preventDefault();
                    const nextLink = navLinks[index + 1] || navLinks[0];
                    nextLink.focus();
                } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                    e.preventDefault();
                    const prevLink = navLinks[index - 1] || navLinks[navLinks.length - 1];
                    prevLink.focus();
                }
            });
        });
    },
    
    /**
     * Mejorar indicadores de foco
     */
    enhanceFocusIndicators() {
        // Agregar clase cuando se usa teclado
        let usingKeyboard = false;
        
        document.addEventListener('keydown', () => {
            usingKeyboard = true;
            document.body.classList.add('keyboard-navigation');
        });
        
        document.addEventListener('mousedown', () => {
            usingKeyboard = false;
            document.body.classList.remove('keyboard-navigation');
        });
        
        // Mejorar visibilidad de foco
        const style = document.createElement('style');
        style.textContent = `
            .keyboard-navigation *:focus {
                outline: 3px solid var(--primary-color) !important;
                outline-offset: 2px !important;
            }
            
            .keyboard-navigation button:focus,
            .keyboard-navigation a:focus {
                outline: 3px solid var(--primary-color) !important;
                outline-offset: 2px !important;
                box-shadow: 0 0 0 2px rgba(30, 64, 175, 0.2) !important;
            }
        `;
        document.head.appendChild(style);
    },
    
    /**
     * Configurar anuncios para lectores de pantalla
     */
    setupScreenReaderAnnouncements() {
        // Crear región de anuncios
        const announcementRegion = document.createElement('div');
        announcementRegion.id = 'screenReaderAnnouncements';
        announcementRegion.setAttribute('role', 'status');
        announcementRegion.setAttribute('aria-live', 'polite');
        announcementRegion.setAttribute('aria-atomic', 'true');
        announcementRegion.className = 'sr-only';
        document.body.appendChild(announcementRegion);
    },
    
    /**
     * Anunciar mensaje a lectores de pantalla
     */
    announce(message) {
        if (!this.config.screenReaderAnnouncements) return;
        
        const region = document.getElementById('screenReaderAnnouncements');
        if (region) {
            region.textContent = message;
            // Limpiar después de un momento para permitir re-anuncios
            setTimeout(() => {
                region.textContent = '';
            }, 1000);
        }
    },
    
    /**
     * Detectar preferencias del sistema
     */
    detectSystemPreferences() {
        // Detectar preferencia de movimiento reducido
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            this.config.reducedMotion = true;
            this.applyConfig();
        }
        
        // Detectar preferencia de alto contraste
        if (window.matchMedia('(prefers-contrast: high)').matches) {
            this.config.highContrast = true;
            this.applyConfig();
        }
    },
    
    /**
     * Configurar atajos de teclado
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Alt + A: Abrir panel de accesibilidad
            if (e.altKey && e.key === 'a') {
                e.preventDefault();
                this.togglePanel();
            }
            
            // Alt + M: Ir al menú principal
            if (e.altKey && e.key === 'm') {
                e.preventDefault();
                const mainNav = document.querySelector('.main-nav');
                if (mainNav) {
                    const firstLink = mainNav.querySelector('a');
                    if (firstLink) {
                        firstLink.focus();
                    }
                }
            }
            
            // Alt + C: Ir al contenido principal
            if (e.altKey && e.key === 'c') {
                e.preventDefault();
                const mainContent = document.querySelector('main, #main-content');
                if (mainContent) {
                    mainContent.setAttribute('tabindex', '-1');
                    mainContent.focus();
                }
            }
            
            // Esc: Cerrar modales/paneles
            if (e.key === 'Escape') {
                const activeModal = document.querySelector('.modal.active, .modal.show');
                if (activeModal) {
                    const closeBtn = activeModal.querySelector('.modal-close, [data-dismiss="modal"]');
                    if (closeBtn) {
                        closeBtn.click();
                    }
                }
                
                const openPanel = document.getElementById('accessibilityPanel');
                if (openPanel && openPanel.classList.contains('active')) {
                    this.closePanel();
                }
            }
        });
    }
};

// Exponer globalmente
window.AccessibilityModule = AccessibilityModule;

