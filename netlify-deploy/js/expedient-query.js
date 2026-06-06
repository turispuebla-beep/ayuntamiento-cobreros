/* global firebase, db, currentUser, showNotification, escapeHtml */

// Helper para formatear fecha si no existe
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    } catch (e) {
        return dateString;
    }
}

// ===== CONSULTA DE EXPEDIENTES =====
// Sistema para que los ciudadanos consulten el estado de sus trámites

const ExpedientQuery = {
    // Expedientes del usuario
    userExpedients: [],
    
    /**
     * Inicializar sistema de consulta de expedientes
     */
    async init() {
        console.log('📋 Inicializando Consulta de Expedientes...');
        try {
            if (currentUser) {
                await this.loadUserExpedients();
            }
            this.renderExpedientQuery();
        } catch (error) {
            console.error('❌ Error inicializando Consulta de Expedientes:', error);
            const container = document.getElementById('expedientQueryContent');
            if (container) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #f59e0b; margin-bottom: 1rem;"></i>
                        <p>Error al cargar la consulta de expedientes. Por favor, inténtelo de nuevo más tarde.</p>
                    </div>
                `;
            }
        }
    },
    
    /**
     * Cargar expedientes del usuario actual
     */
    async loadUserExpedients() {
        if (!currentUser || !currentUser.email) {
            this.userExpedients = [];
            return;
        }
        
        try {
            // Buscar por email del usuario
            const expedientsRef = firebase.firestore().collection('expedients')
                .where('userEmail', '==', currentUser.email);
            
            const snapshot = await expedientsRef.get();
            this.userExpedients = snapshot.docs
                .map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }))
                .sort((a, b) => {
                    // Ordenar por fecha de creación descendente
                    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
                });
            
            console.log(`✅ ${this.userExpedients.length} expedientes encontrados para ${currentUser.email}`);
        } catch (error) {
            console.error('❌ Error cargando expedientes:', error);
            // Cargar desde localStorage como fallback
            const saved = localStorage.getItem(`expedients_${currentUser.email}`);
            if (saved) {
                this.userExpedients = JSON.parse(saved);
            }
        }
    },
    
    /**
     * Buscar expediente por número
     */
    async searchExpedient(expedientNumber) {
        if (!expedientNumber || expedientNumber.trim() === '') {
            showNotification('Por favor, ingrese un número de expediente', 'error');
            return null;
        }
        
        try {
            const expedientRef = firebase.firestore().collection('expedients')
                .where('number', '==', expedientNumber.trim().toUpperCase());
            
            const snapshot = await expedientRef.get();
            
            if (!snapshot || snapshot.empty || snapshot.docs.length === 0) {
                showNotification('No se encontró ningún expediente con ese número', 'error');
                return null;
            }
            
            const expedient = {
                id: snapshot.docs[0].id,
                ...snapshot.docs[0].data()
            };
            
            return expedient;
        } catch (error) {
            console.error('❌ Error buscando expediente:', error);
            showNotification('Error al buscar el expediente. Inténtelo de nuevo.', 'error');
            return null;
        }
    },
    
    /**
     * Renderizar interfaz de consulta
     */
    renderExpedientQuery() {
        const container = document.getElementById('expedientQueryContent');
        if (!container) return;
        
        if (!currentUser) {
            container.innerHTML = `
                <div class="expedient-query-login">
                    <div class="login-prompt">
                        <i class="fas fa-lock" style="font-size: 3rem; color: #3b82f6; margin-bottom: 1rem;"></i>
                        <h3>Consulta de Expedientes</h3>
                        <p>Para consultar sus expedientes, debe iniciar sesión primero.</p>
                        <button class="btn btn-primary" onclick="openModal('loginModal')">
                            <i class="fas fa-sign-in-alt"></i> Iniciar Sesión
                        </button>
                    </div>
                </div>
            `;
            return;
        }
        
        container.innerHTML = `
            <div class="expedient-query">
                <div class="query-options">
                    <div class="query-tabs">
                        <button class="query-tab-btn active" onclick="ExpedientQuery.showQueryTab('myExpedients')">
                            <i class="fas fa-folder-open"></i> Mis Expedientes
                        </button>
                        <button class="query-tab-btn" onclick="ExpedientQuery.showQueryTab('search')">
                            <i class="fas fa-search"></i> Buscar por Número
                        </button>
                    </div>
                </div>
                
                <div class="query-content">
                    <div id="query-myExpedients" class="query-tab-content active">
                        ${this.renderMyExpedients()}
                    </div>
                    <div id="query-search" class="query-tab-content">
                        ${this.renderSearchForm()}
                    </div>
                </div>
            </div>
        `;
    },
    
    /**
     * Renderizar mis expedientes
     */
    renderMyExpedients() {
        if (this.userExpedients.length === 0) {
            return `
                <div class="empty-state">
                    <i class="fas fa-inbox" style="font-size: 3rem; color: #ccc; margin-bottom: 1rem;"></i>
                    <p>No tiene expedientes registrados.</p>
                    <p class="text-muted">Los expedientes aparecerán aquí cuando inicie un trámite.</p>
                </div>
            `;
        }
        
        return `
            <div class="expedients-list">
                ${this.userExpedients.map(expedient => this.renderExpedientCard(expedient)).join('')}
            </div>
        `;
    },
    
    /**
     * Renderizar tarjeta de expediente
     */
    renderExpedientCard(expedient) {
        const statusClass = this.getStatusClass(expedient.status);
        const statusText = this.getStatusText(expedient.status);
        
        return `
            <div class="expedient-card">
                <div class="card-header">
                    <div>
                        <h3>${escapeHtml(expedient.title || 'Expediente sin título')}</h3>
                        <p class="expedient-number">Nº ${escapeHtml(expedient.number || expedient.id)}</p>
                    </div>
                    <span class="status-badge ${statusClass}">${statusText}</span>
                </div>
                <div class="card-body">
                    <div class="expedient-info">
                        <div class="info-item">
                            <strong>Tipo:</strong>
                            <span>${escapeHtml(expedient.type || 'N/A')}</span>
                        </div>
                        <div class="info-item">
                            <strong>Fecha inicio:</strong>
                            <span>${formatDate(expedient.createdAt || expedient.startDate)}</span>
                        </div>
                        ${expedient.lastUpdate ? `
                            <div class="info-item">
                                <strong>Última actualización:</strong>
                                <span>${formatDate(expedient.lastUpdate)}</span>
                            </div>
                        ` : ''}
                    </div>
                    ${expedient.description ? `
                        <p class="description">${escapeHtml(expedient.description)}</p>
                    ` : ''}
                    ${expedient.notes && expedient.notes.length > 0 ? `
                        <div class="expedient-notes">
                            <strong>Notas:</strong>
                            <ul>
                                ${expedient.notes.map(note => `
                                    <li>
                                        <span class="note-date">${formatDate(note.date)}:</span>
                                        ${escapeHtml(note.text)}
                                    </li>
                                `).join('')}
                            </ul>
                        </div>
                    ` : ''}
                </div>
                <div class="card-footer">
                    ${expedient.documentUrl ? `
                        <a href="${expedient.documentUrl}" target="_blank" class="btn btn-outline btn-sm">
                            <i class="fas fa-download"></i> Ver Documentos
                        </a>
                    ` : ''}
                </div>
            </div>
        `;
    },
    
    /**
     * Renderizar formulario de búsqueda
     */
    renderSearchForm() {
        return `
            <div class="search-expedient-form">
                <div class="form-group">
                    <label for="expedientNumberSearch">Número de Expediente:</label>
                    <input 
                        type="text" 
                        id="expedientNumberSearch" 
                        class="form-control" 
                        placeholder="Ej: EXP-2025-001"
                        onkeypress="if(event.key === 'Enter') ExpedientQuery.handleSearch()"
                    >
                    <small class="form-help">Ingrese el número completo del expediente</small>
                </div>
                <button class="btn btn-primary" onclick="ExpedientQuery.handleSearch()">
                    <i class="fas fa-search"></i> Buscar Expediente
                </button>
                
                <div id="searchResult" class="search-result" style="display: none;"></div>
            </div>
        `;
    },
    
    /**
     * Manejar búsqueda de expediente
     */
    async handleSearch() {
        const input = document.getElementById('expedientNumberSearch');
        if (!input) return;
        
        const expedientNumber = input.value.trim();
        const resultContainer = document.getElementById('searchResult');
        
        if (!resultContainer) return;
        
        resultContainer.style.display = 'block';
        resultContainer.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i> Buscando...</div>';
        
        const expedient = await this.searchExpedient(expedientNumber);
        
        if (expedient) {
            resultContainer.innerHTML = this.renderExpedientCard(expedient);
        } else {
            resultContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-search" style="font-size: 2rem; color: #ccc;"></i>
                    <p>No se encontró ningún expediente con ese número.</p>
                </div>
            `;
        }
    },
    
    /**
     * Mostrar pestaña de consulta
     */
    showQueryTab(tabName) {
        document.querySelectorAll('.query-tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelectorAll('.query-tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const tabContent = document.getElementById(`query-${tabName}`);
        const tabBtn = document.querySelector(`[onclick*="${tabName}"]`);
        
        if (tabContent) tabContent.classList.add('active');
        if (tabBtn) tabBtn.classList.add('active');
    },
    
    /**
     * Obtener clase CSS para estado
     */
    getStatusClass(status) {
        const statusMap = {
            'pending': 'status-pending',
            'in_progress': 'status-progress',
            'approved': 'status-approved',
            'rejected': 'status-rejected',
            'completed': 'status-completed',
            'cancelled': 'status-cancelled'
        };
        return statusMap[status] || 'status-pending';
    },
    
    /**
     * Obtener texto para estado
     */
    getStatusText(status) {
        const statusMap = {
            'pending': 'Pendiente',
            'in_progress': 'En Trámite',
            'approved': 'Aprobado',
            'rejected': 'Rechazado',
            'completed': 'Completado',
            'cancelled': 'Cancelado'
        };
        return statusMap[status] || 'Pendiente';
    },
    
    /**
     * Actualizar lista de expedientes
     */
    async refresh() {
        await this.loadUserExpedients();
        const myExpedientsTab = document.getElementById('query-myExpedients');
        if (myExpedientsTab) {
            myExpedientsTab.innerHTML = this.renderMyExpedients();
        }
    }
};

// Exponer globalmente
if (typeof window !== 'undefined') {
    window.ExpedientQuery = ExpedientQuery;
}

