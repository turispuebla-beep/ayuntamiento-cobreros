// ===== FILTROS AVANZADOS =====
// Sistema de filtrado para documentos, noticias y eventos

const AdvancedFilters = {
    // Configuración de filtros por tipo de contenido
    config: {
        documentos: {
            filters: ['categoria', 'fecha', 'tipo', 'busqueda'],
            categories: ['Todos', 'Normativas', 'Ordenanzas', 'Decretos', 'Resoluciones', 'Informes', 'Otros'],
            types: ['PDF', 'Word', 'Excel', 'Imagen', 'Otro']
        },
        noticias: {
            filters: ['categoria', 'fecha', 'busqueda', 'estado'],
            categories: ['Todos', 'Anuncios', 'Bandos', 'Noticias', 'Eventos', 'Urgentes'],
            states: ['Todos', 'Activos', 'Archivados']
        },
        eventos: {
            filters: ['categoria', 'fecha', 'localidad', 'busqueda', 'visibilidad'],
            categories: ['Todos', 'Culturales', 'Deportivos', 'Sociales', 'Oficiales', 'Otros'],
            localities: ['Todas', 'Cobreros', 'Avedillo de Sanabria', 'Sotillo', 'Terroso']
        }
    },

    /**
     * Inicializa los filtros para un tipo de contenido
     */
    init(contentType) {
        const config = this.config[contentType];
        if (!config) {
            console.warn(`[AdvancedFilters] Tipo de contenido no configurado: ${contentType}`);
            return;
        }

        this.createFilterUI(contentType, config);
        this.attachEventListeners(contentType);
    },

    /**
     * Crea la interfaz de filtros
     */
    createFilterUI(contentType, config) {
        const container = document.querySelector(`#${contentType}FiltersContainer`);
        if (!container) {
            // Crear contenedor si no existe
            const section = document.querySelector(`#${contentType}`);
            if (section) {
                const filterContainer = document.createElement('div');
                filterContainer.id = `${contentType}FiltersContainer`;
                filterContainer.className = 'advanced-filters-container';
                section.insertBefore(filterContainer, section.firstChild.nextSibling);
                this.renderFilters(filterContainer, contentType, config);
            }
            return;
        }

        this.renderFilters(container, contentType, config);
    },

    /**
     * Renderiza los filtros
     */
    renderFilters(container, contentType, config) {
        container.innerHTML = `
            <div class="filters-header">
                <h3><i class="fas fa-filter"></i> Filtros Avanzados</h3>
                <button class="btn btn-link btn-sm" onclick="AdvancedFilters.toggleFilters('${contentType}')" aria-label="Mostrar/ocultar filtros">
                    <i class="fas fa-chevron-down" id="${contentType}FiltersToggleIcon"></i>
                </button>
            </div>
            <div class="filters-content" id="${contentType}FiltersContent" style="display: none;">
                <div class="filters-grid">
                    ${this.renderSearchFilter(contentType)}
                    ${this.renderCategoryFilter(contentType, config)}
                    ${this.renderDateFilter(contentType, config)}
                    ${this.renderTypeFilter(contentType, config)}
                    ${this.renderVisibilityFilter(contentType, config)}
                </div>
                <div class="filters-actions">
                    <button class="btn btn-primary" onclick="AdvancedFilters.applyFilters('${contentType}')">
                        <i class="fas fa-search"></i> Aplicar Filtros
                    </button>
                    <button class="btn btn-outline" onclick="AdvancedFilters.resetFilters('${contentType}')">
                        <i class="fas fa-redo"></i> Limpiar
                    </button>
                    <span class="filter-results-count" id="${contentType}FilterCount"></span>
                </div>
            </div>
        `;
    },

    /**
     * Renderiza filtro de búsqueda
     */
    renderSearchFilter(contentType) {
        return `
            <div class="filter-group">
                <label for="${contentType}SearchFilter">
                    <i class="fas fa-search"></i> Buscar
                </label>
                <input type="text" 
                       id="${contentType}SearchFilter" 
                       class="form-control" 
                       placeholder="Buscar en ${contentType}..."
                       onkeyup="AdvancedFilters.handleSearchKeyup(event, '${contentType}')">
            </div>
        `;
    },

    /**
     * Renderiza filtro de categoría
     */
    renderCategoryFilter(contentType, config) {
        if (!config.categories) return '';
        
        const options = config.categories.map(cat => 
            `<option value="${cat.toLowerCase()}">${cat}</option>`
        ).join('');

        return `
            <div class="filter-group">
                <label for="${contentType}CategoryFilter">
                    <i class="fas fa-tags"></i> Categoría
                </label>
                <select id="${contentType}CategoryFilter" class="form-control">
                    ${options}
                </select>
            </div>
        `;
    },

    /**
     * Renderiza filtro de fecha
     */
    renderDateFilter(contentType, config) {
        return `
            <div class="filter-group">
                <label for="${contentType}DateFromFilter">
                    <i class="fas fa-calendar"></i> Desde
                </label>
                <input type="date" id="${contentType}DateFromFilter" class="form-control">
            </div>
            <div class="filter-group">
                <label for="${contentType}DateToFilter">
                    <i class="fas fa-calendar"></i> Hasta
                </label>
                <input type="date" id="${contentType}DateToFilter" class="form-control">
            </div>
        `;
    },

    /**
     * Renderiza filtro de tipo
     */
    renderTypeFilter(contentType, config) {
        if (!config.types || contentType !== 'documentos') return '';
        
        const options = config.types.map(type => 
            `<option value="${type.toLowerCase()}">${type}</option>`
        ).join('');

        return `
            <div class="filter-group">
                <label for="${contentType}TypeFilter">
                    <i class="fas fa-file"></i> Tipo de archivo
                </label>
                <select id="${contentType}TypeFilter" class="form-control">
                    <option value="todos">Todos</option>
                    ${options}
                </select>
            </div>
        `;
    },

    /**
     * Renderiza filtro de visibilidad
     */
    renderVisibilityFilter(contentType, config) {
        if (contentType !== 'eventos') return '';
        
        return `
            <div class="filter-group">
                <label for="${contentType}VisibilityFilter">
                    <i class="fas fa-eye"></i> Visibilidad
                </label>
                <select id="${contentType}VisibilityFilter" class="form-control">
                    <option value="todos">Todos</option>
                    <option value="publicos">Públicos</option>
                    <option value="ocultos">Ocultos</option>
                </select>
            </div>
        `;
    },

    /**
     * Alterna la visibilidad de los filtros
     */
    toggleFilters(contentType) {
        const content = document.getElementById(`${contentType}FiltersContent`);
        const icon = document.getElementById(`${contentType}FiltersToggleIcon`);
        
        if (content && icon) {
            const isVisible = content.style.display !== 'none';
            content.style.display = isVisible ? 'none' : 'block';
            icon.className = isVisible ? 'fas fa-chevron-down' : 'fas fa-chevron-up';
        }
    },

    /**
     * Maneja la búsqueda en tiempo real
     */
    handleSearchKeyup(event, contentType) {
        if (event.key === 'Enter') {
            this.applyFilters(contentType);
        } else {
            // Búsqueda en tiempo real (opcional, con debounce)
            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => {
                this.applyFilters(contentType);
            }, 500);
        }
    },

    /**
     * Aplica los filtros
     */
    applyFilters(contentType) {
        const filters = this.getFilterValues(contentType);
        const results = this.filterContent(contentType, filters);
        this.displayResults(contentType, results);
        this.updateFilterCount(contentType, results.length);
        
        // Guardar filtros en localStorage
        localStorage.setItem(`${contentType}Filters`, JSON.stringify(filters));
        
        // Disparar evento personalizado
        document.dispatchEvent(new CustomEvent('filtersApplied', {
            detail: { contentType, filters, results }
        }));
    },

    /**
     * Obtiene los valores de los filtros
     */
    getFilterValues(contentType) {
        return {
            search: document.getElementById(`${contentType}SearchFilter`)?.value || '',
            category: document.getElementById(`${contentType}CategoryFilter`)?.value || 'todos',
            dateFrom: document.getElementById(`${contentType}DateFromFilter`)?.value || '',
            dateTo: document.getElementById(`${contentType}DateToFilter`)?.value || '',
            type: document.getElementById(`${contentType}TypeFilter`)?.value || 'todos',
            visibility: document.getElementById(`${contentType}VisibilityFilter`)?.value || 'todos'
        };
    },

    /**
     * Filtra el contenido según los criterios
     */
    filterContent(contentType, filters) {
        // Obtener elementos del contenido
        const container = document.querySelector(`#${contentType}Content, #${contentType}List, .${contentType}-list`);
        if (!container) return [];

        const items = Array.from(container.children).filter(el => 
            el.classList.contains('item') || 
            el.classList.contains('card') || 
            el.classList.contains('document-item') ||
            el.classList.contains('news-item') ||
            el.classList.contains('event-item')
        );

        return items.filter(item => {
            // Filtro de búsqueda
            if (filters.search) {
                const text = item.textContent.toLowerCase();
                if (!text.includes(filters.search.toLowerCase())) {
                    return false;
                }
            }

            // Filtro de categoría
            if (filters.category && filters.category !== 'todos') {
                const itemCategory = item.dataset.category || item.getAttribute('data-category') || '';
                if (itemCategory.toLowerCase() !== filters.category) {
                    return false;
                }
            }

            // Filtro de fecha
            if (filters.dateFrom || filters.dateTo) {
                const itemDate = item.dataset.date || item.getAttribute('data-date') || '';
                if (itemDate) {
                    if (filters.dateFrom && itemDate < filters.dateFrom) return false;
                    if (filters.dateTo && itemDate > filters.dateTo) return false;
                }
            }

            // Filtro de tipo (solo documentos)
            if (contentType === 'documentos' && filters.type && filters.type !== 'todos') {
                const itemType = item.dataset.type || item.getAttribute('data-type') || '';
                if (itemType.toLowerCase() !== filters.type) {
                    return false;
                }
            }

            // Filtro de visibilidad (solo eventos)
            if (contentType === 'eventos' && filters.visibility && filters.visibility !== 'todos') {
                const isPublic = item.dataset.visible === 'true' || item.classList.contains('public');
                if (filters.visibility === 'publicos' && !isPublic) return false;
                if (filters.visibility === 'ocultos' && isPublic) return false;
            }

            return true;
        });
    },

    /**
     * Muestra los resultados filtrados
     */
    displayResults(contentType, results) {
        const container = document.querySelector(`#${contentType}Content, #${contentType}List, .${contentType}-list`);
        if (!container) return;

        // Ocultar todos los elementos
        const allItems = Array.from(container.children);
        allItems.forEach(item => {
            item.style.display = 'none';
        });

        // Mostrar solo los resultados
        results.forEach(item => {
            item.style.display = '';
        });

        // Mostrar mensaje si no hay resultados
        let noResultsMsg = container.querySelector('.no-results-message');
        if (results.length === 0) {
            if (!noResultsMsg) {
                noResultsMsg = document.createElement('div');
                noResultsMsg.className = 'no-results-message';
                noResultsMsg.innerHTML = '<p><i class="fas fa-info-circle"></i> No se encontraron resultados con los filtros aplicados.</p>';
                container.appendChild(noResultsMsg);
            }
            noResultsMsg.style.display = 'block';
        } else if (noResultsMsg) {
            noResultsMsg.style.display = 'none';
        }
    },

    /**
     * Actualiza el contador de resultados
     */
    updateFilterCount(contentType, count) {
        const countElement = document.getElementById(`${contentType}FilterCount`);
        if (countElement) {
            countElement.textContent = `${count} resultado${count !== 1 ? 's' : ''} encontrado${count !== 1 ? 's' : ''}`;
        }
    },

    /**
     * Resetea los filtros
     */
    resetFilters(contentType) {
        // Limpiar inputs
        const searchInput = document.getElementById(`${contentType}SearchFilter`);
        if (searchInput) searchInput.value = '';

        const categorySelect = document.getElementById(`${contentType}CategoryFilter`);
        if (categorySelect) categorySelect.value = 'todos';

        const dateFrom = document.getElementById(`${contentType}DateFromFilter`);
        if (dateFrom) dateFrom.value = '';

        const dateTo = document.getElementById(`${contentType}DateToFilter`);
        if (dateTo) dateTo.value = '';

        const typeSelect = document.getElementById(`${contentType}TypeFilter`);
        if (typeSelect) typeSelect.value = 'todos';

        const visibilitySelect = document.getElementById(`${contentType}VisibilityFilter`);
        if (visibilitySelect) visibilitySelect.value = 'todos';

        // Aplicar filtros vacíos (mostrar todo)
        this.applyFilters(contentType);

        // Limpiar localStorage
        localStorage.removeItem(`${contentType}Filters`);
    },

    /**
     * Restaura filtros guardados
     */
    restoreFilters(contentType) {
        const saved = localStorage.getItem(`${contentType}Filters`);
        if (saved) {
            try {
                const filters = JSON.parse(saved);
                // Restaurar valores en los inputs
                if (filters.search) {
                    const searchInput = document.getElementById(`${contentType}SearchFilter`);
                    if (searchInput) searchInput.value = filters.search;
                }
                // ... restaurar otros filtros
                this.applyFilters(contentType);
            } catch (e) {
                console.error('[AdvancedFilters] Error restaurando filtros:', e);
            }
        }
    },

    /**
     * Adjunta event listeners
     */
    attachEventListeners(contentType) {
        // Los listeners ya están en el HTML con onclick
        // Aquí se pueden agregar listeners adicionales si es necesario
    }
};

// Exportar globalmente
if (typeof window !== 'undefined') {
    window.AdvancedFilters = AdvancedFilters;
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Inicializar filtros para cada tipo de contenido
        ['documentos', 'noticias', 'eventos'].forEach(type => {
            const section = document.getElementById(type);
            if (section) {
                AdvancedFilters.init(type);
            }
        });
    });
} else {
    ['documentos', 'noticias', 'eventos'].forEach(type => {
        const section = document.getElementById(type);
        if (section) {
            AdvancedFilters.init(type);
        }
    });
}






