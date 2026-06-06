// ===== SISTEMA MULTIIDIOMA =====
// Soporte para español, gallego e inglés

const Multiidioma = {
    currentLanguage: 'es',
    translations: {
        es: {
            // Navegación
            'nav.inicio': 'Inicio',
            'nav.bando': 'Bando',
            'nav.noticias': 'Tablón de Anuncios',
            'nav.cita': 'Cita Previa',
            'nav.sede': 'Sede Electrónica',
            'nav.documentos': 'Documentos',
            'nav.cultura': 'Cultura y Ocio',
            'nav.servicios': 'Datos y Enlaces',
            'nav.sobre': 'Sobre el Ayuntamiento',
            'nav.transparencia': 'Transparencia',
            
            // Botones
            'btn.login': 'Iniciar Sesión',
            'btn.register': 'Registrarse',
            'btn.admin': 'Panel Admin',
            'btn.search': 'Buscar',
            'btn.apply': 'Aplicar',
            'btn.cancel': 'Cancelar',
            'btn.save': 'Guardar',
            'btn.delete': 'Eliminar',
            'btn.edit': 'Editar',
            'btn.close': 'Cerrar',
            
            // Común
            'common.loading': 'Cargando...',
            'common.error': 'Error',
            'common.success': 'Éxito',
            'common.confirm': 'Confirmar',
            'common.yes': 'Sí',
            'common.no': 'No',
            
            // Filtros
            'filters.title': 'Filtros Avanzados',
            'filters.search': 'Buscar',
            'filters.category': 'Categoría',
            'filters.dateFrom': 'Desde',
            'filters.dateTo': 'Hasta',
            'filters.apply': 'Aplicar Filtros',
            'filters.reset': 'Limpiar',
            'filters.results': 'resultados encontrados',
            
            // Mensajes
            'msg.noResults': 'No se encontraron resultados',
            'msg.loading': 'Cargando contenido...',
            'msg.error': 'Ha ocurrido un error',
        },
        gl: {
            // Navegación
            'nav.inicio': 'Inicio',
            'nav.bando': 'Bando',
            'nav.noticias': 'Tablón de Anuncios',
            'nav.cita': 'Cita Previa',
            'nav.sede': 'Sede Electrónica',
            'nav.documentos': 'Documentos',
            'nav.cultura': 'Cultura e Ocio',
            'nav.servicios': 'Datos e Enlaces',
            'nav.sobre': 'Sobre o Concello',
            'nav.transparencia': 'Transparencia',
            
            // Botones
            'btn.login': 'Iniciar Sesión',
            'btn.register': 'Rexistrarse',
            'btn.admin': 'Panel Admin',
            'btn.search': 'Buscar',
            'btn.apply': 'Aplicar',
            'btn.cancel': 'Cancelar',
            'btn.save': 'Gardar',
            'btn.delete': 'Eliminar',
            'btn.edit': 'Editar',
            'btn.close': 'Pechar',
            
            // Común
            'common.loading': 'Cargando...',
            'common.error': 'Erro',
            'common.success': 'Éxito',
            'common.confirm': 'Confirmar',
            'common.yes': 'Si',
            'common.no': 'Non',
            
            // Filtros
            'filters.title': 'Filtros Avanzados',
            'filters.search': 'Buscar',
            'filters.category': 'Categoría',
            'filters.dateFrom': 'Desde',
            'filters.dateTo': 'Ata',
            'filters.apply': 'Aplicar Filtros',
            'filters.reset': 'Limpar',
            'filters.results': 'resultados atopados',
            
            // Mensajes
            'msg.noResults': 'Non se atoparon resultados',
            'msg.loading': 'Cargando contido...',
            'msg.error': 'Ocorreu un erro',
        },
        en: {
            // Navegación
            'nav.inicio': 'Home',
            'nav.bando': 'Proclamation',
            'nav.noticias': 'Notice Board',
            'nav.cita': 'Appointment',
            'nav.sede': 'Electronic Office',
            'nav.documentos': 'Documents',
            'nav.cultura': 'Culture & Leisure',
            'nav.servicios': 'Data & Links',
            'nav.sobre': 'About the Council',
            'nav.transparencia': 'Transparency',
            
            // Botones
            'btn.login': 'Log In',
            'btn.register': 'Register',
            'btn.admin': 'Admin Panel',
            'btn.search': 'Search',
            'btn.apply': 'Apply',
            'btn.cancel': 'Cancel',
            'btn.save': 'Save',
            'btn.delete': 'Delete',
            'btn.edit': 'Edit',
            'btn.close': 'Close',
            
            // Común
            'common.loading': 'Loading...',
            'common.error': 'Error',
            'common.success': 'Success',
            'common.confirm': 'Confirm',
            'common.yes': 'Yes',
            'common.no': 'No',
            
            // Filtros
            'filters.title': 'Advanced Filters',
            'filters.search': 'Search',
            'filters.category': 'Category',
            'filters.dateFrom': 'From',
            'filters.dateTo': 'To',
            'filters.apply': 'Apply Filters',
            'filters.reset': 'Clear',
            'filters.results': 'results found',
            
            // Mensajes
            'msg.noResults': 'No results found',
            'msg.loading': 'Loading content...',
            'msg.error': 'An error occurred',
        }
    },

    /**
     * Inicializa el sistema multiidioma
     */
    init() {
        // Cargar idioma guardado
        const savedLang = localStorage.getItem('preferredLanguage') || 'es';
        this.setLanguage(savedLang);
        
        // Crear selector de idioma
        this.createLanguageSelector();
        
        // Cargar traducciones dinámicas desde Firestore (opcional)
        this.loadDynamicTranslations();
    },

    /**
     * Establece el idioma actual
     */
    setLanguage(lang) {
        if (!this.translations[lang]) {
            console.warn(`[Multiidioma] Idioma no soportado: ${lang}`);
            return;
        }

        this.currentLanguage = lang;
        localStorage.setItem('preferredLanguage', lang);
        
        // Actualizar atributo lang del HTML
        document.documentElement.lang = lang;
        
        // Aplicar traducciones
        this.applyTranslations();
        
        // Disparar evento
        document.dispatchEvent(new CustomEvent('languageChanged', {
            detail: { language: lang }
        }));
    },

    /**
     * Obtiene una traducción
     */
    t(key, params = {}) {
        const translation = this.translations[this.currentLanguage]?.[key] || 
                           this.translations['es']?.[key] || 
                           key;
        
        // Reemplazar parámetros
        return translation.replace(/\{(\w+)\}/g, (match, param) => {
            return params[param] || match;
        });
    },

    /**
     * Aplica traducciones a elementos con data-i18n
     */
    applyTranslations() {
        // Traducir elementos con atributo data-i18n
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = this.t(key);
            
            if (element.tagName === 'INPUT' && element.type === 'submit') {
                element.value = translation;
            } else if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                element.placeholder = translation;
            } else {
                element.textContent = translation;
            }
        });

        // Traducir atributos
        document.querySelectorAll('[data-i18n-title]').forEach(element => {
            element.title = this.t(element.getAttribute('data-i18n-title'));
        });

        document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
            element.placeholder = this.t(element.getAttribute('data-i18n-placeholder'));
        });

        document.querySelectorAll('[data-i18n-aria-label]').forEach(element => {
            element.setAttribute('aria-label', this.t(element.getAttribute('data-i18n-aria-label')));
        });
    },

    /**
     * Crea el selector de idioma
     */
    createLanguageSelector() {
        // Buscar si ya existe
        let selector = document.getElementById('languageSelector');
        
        if (!selector) {
            selector = document.createElement('div');
            selector.id = 'languageSelector';
            selector.className = 'language-selector';
            selector.innerHTML = `
                <button class="language-btn" id="languageBtn" aria-label="Seleccionar idioma">
                    <i class="fas fa-globe"></i>
                    <span id="currentLanguageLabel">${this.currentLanguage.toUpperCase()}</span>
                </button>
                <div class="language-dropdown" id="languageDropdown" style="display: none;">
                    <button class="language-option ${this.currentLanguage === 'es' ? 'active' : ''}" 
                            onclick="Multiidioma.setLanguage('es')" 
                            data-lang="es">
                        <span class="flag">🇪🇸</span> Español
                    </button>
                    <button class="language-option ${this.currentLanguage === 'gl' ? 'active' : ''}" 
                            onclick="Multiidioma.setLanguage('gl')" 
                            data-lang="gl">
                        <span class="flag">🇬🇱</span> Galego
                    </button>
                    <button class="language-option ${this.currentLanguage === 'en' ? 'active' : ''}" 
                            onclick="Multiidioma.setLanguage('en')" 
                            data-lang="en">
                        <span class="flag">🇬🇧</span> English
                    </button>
                </div>
            `;

            // Agregar estilos
            this.addLanguageStyles();

            // Insertar en el header
            const headerActions = document.querySelector('.header-actions');
            if (headerActions) {
                headerActions.insertBefore(selector, headerActions.firstChild);
            } else {
                document.body.appendChild(selector);
            }

            // Event listeners
            const btn = document.getElementById('languageBtn');
            const dropdown = document.getElementById('languageDropdown');
            
            if (btn && dropdown) {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
                });

                // Cerrar al hacer clic fuera
                document.addEventListener('click', (e) => {
                    if (!selector.contains(e.target)) {
                        dropdown.style.display = 'none';
                    }
                });
            }
        }
    },

    /**
     * Agrega estilos para el selector de idioma
     */
    addLanguageStyles() {
        if (document.getElementById('multiidiomaStyles')) return;

        const style = document.createElement('style');
        style.id = 'multiidiomaStyles';
        style.textContent = `
            .language-selector {
                position: relative;
                display: inline-block;
            }
            .language-btn {
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.2);
                color: white;
                padding: 0.5rem 1rem;
                border-radius: 6px;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 0.5rem;
                transition: all 0.3s;
            }
            .language-btn:hover {
                background: rgba(255, 255, 255, 0.2);
            }
            .language-dropdown {
                position: absolute;
                top: 100%;
                right: 0;
                margin-top: 0.5rem;
                background: white;
                border-radius: 8px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                min-width: 150px;
                z-index: 1000;
                overflow: hidden;
            }
            .language-option {
                width: 100%;
                padding: 0.75rem 1rem;
                border: none;
                background: white;
                text-align: left;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 0.5rem;
                transition: background 0.2s;
            }
            .language-option:hover {
                background: #f3f4f6;
            }
            .language-option.active {
                background: #e0e7ff;
                font-weight: 600;
            }
            .language-option .flag {
                font-size: 1.2rem;
            }
        `;
        document.head.appendChild(style);
    },

    /**
     * Carga traducciones dinámicas desde Firestore
     */
    async loadDynamicTranslations() {
        try {
            if (window.firebase && window.firebase.firestore) {
                const db = window.firebase.firestore();
                const translationsRef = db.collection('translations');
                const snapshot = await translationsRef.get();
                
                snapshot.forEach(doc => {
                    const data = doc.data();
                    const lang = data.language;
                    if (this.translations[lang]) {
                        Object.assign(this.translations[lang], data.translations || {});
                    }
                });

                // Reaplicar traducciones
                this.applyTranslations();
            }
        } catch (error) {
            console.error('[Multiidioma] Error cargando traducciones:', error);
        }
    },

    /**
     * Obtiene el idioma actual
     */
    getCurrentLanguage() {
        return this.currentLanguage;
    }
};

// Exportar globalmente
if (typeof window !== 'undefined') {
    window.Multiidioma = Multiidioma;
    // Alias corto
    window.t = (key, params) => Multiidioma.t(key, params);
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        Multiidioma.init();
    });
} else {
    Multiidioma.init();
}






