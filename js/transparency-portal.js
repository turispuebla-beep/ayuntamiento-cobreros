/* global firebase, db, currentUser, isAdmin, showNotification, escapeHtml */

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

// ===== PORTAL DE TRANSPARENCIA =====
// Sistema para mostrar información pública: presupuestos, contratos, actas de pleno

const TransparencyPortal = {
    // Datos de transparencia
    budgets: [],
    contracts: [],
    plenaryMinutes: [],
    
    /**
     * Inicializar el portal de transparencia
     */
    async init() {
        console.log('🔍 Inicializando Portal de Transparencia...');
        try {
            await this.loadBudgets();
            await this.loadContracts();
            await this.loadPlenaryMinutes();
            this.renderTransparencyPortal();
        } catch (error) {
            console.error('❌ Error inicializando Portal de Transparencia:', error);
            const container = document.getElementById('transparencyContent');
            if (container) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #f59e0b; margin-bottom: 1rem;"></i>
                        <p>Error al cargar el portal de transparencia. Por favor, inténtelo de nuevo más tarde.</p>
                    </div>
                `;
            }
        }
    },
    
    /**
     * Cargar presupuestos desde Firestore
     */
    async loadBudgets() {
        try {
            // Usar sintaxis compatible con el wrapper
            const budgetsRef = firebase.firestore().collection('transparency_budgets')
                .orderBy('createdAt', 'desc');
            
            const snapshot = await budgetsRef.get();
            this.budgets = snapshot.docs
                .map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }))
                .sort((a, b) => {
                    // Ordenar por año descendente, luego por fecha
                    const yearA = a.year || 0;
                    const yearB = b.year || 0;
                    if (yearB !== yearA) return yearB - yearA;
                    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
                });
            
            console.log(`✅ ${this.budgets.length} presupuestos cargados`);
        } catch (error) {
            console.error('❌ Error cargando presupuestos:', error);
            // Cargar desde localStorage como fallback
            const saved = localStorage.getItem('transparency_budgets');
            if (saved) {
                this.budgets = JSON.parse(saved);
            }
        }
    },
    
    /**
     * Cargar contratos desde Firestore
     */
    async loadContracts() {
        try {
            const contractsRef = firebase.firestore().collection('transparency_contracts')
                .orderBy('publicationDate', 'desc')
                .limit(50);
            
            const snapshot = await contractsRef.get();
            this.contracts = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            console.log(`✅ ${this.contracts.length} contratos cargados`);
        } catch (error) {
            console.error('❌ Error cargando contratos:', error);
            const saved = localStorage.getItem('transparency_contracts');
            if (saved) {
                this.contracts = JSON.parse(saved);
            }
        }
    },
    
    /**
     * Cargar actas de pleno desde Firestore
     */
    async loadPlenaryMinutes() {
        try {
            const minutesRef = firebase.firestore().collection('transparency_plenary_minutes')
                .orderBy('date', 'desc')
                .limit(50);
            
            const snapshot = await minutesRef.get();
            this.plenaryMinutes = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            console.log(`✅ ${this.plenaryMinutes.length} actas de pleno cargadas`);
        } catch (error) {
            console.error('❌ Error cargando actas de pleno:', error);
            const saved = localStorage.getItem('transparency_plenary_minutes');
            if (saved) {
                this.plenaryMinutes = JSON.parse(saved);
            }
        }
    },
    
    /**
     * Renderizar el portal de transparencia
     */
    renderTransparencyPortal() {
        const container = document.getElementById('transparencyContent');
        if (!container) return;
        
        container.innerHTML = `
            <div class="transparency-portal">
                <div class="transparency-tabs">
                    <button class="transparency-tab-btn active" data-tab="budgets" onclick="TransparencyPortal.showTab('budgets')">
                        💰 Presupuestos
                    </button>
                    <button class="transparency-tab-btn" data-tab="contracts" onclick="TransparencyPortal.showTab('contracts')">
                        📋 Contratos y Licitaciones
                    </button>
                    <button class="transparency-tab-btn" data-tab="plenary" onclick="TransparencyPortal.showTab('plenary')">
                        📜 Actas de Pleno
                    </button>
                </div>
                
                <div class="transparency-content">
                    <div id="transparency-budgets-tab" class="transparency-tab-content active">
                        ${this.renderBudgets()}
                    </div>
                    <div id="transparency-contracts-tab" class="transparency-tab-content">
                        ${this.renderContracts()}
                    </div>
                    <div id="transparency-plenary-tab" class="transparency-tab-content">
                        ${this.renderPlenaryMinutes()}
                    </div>
                </div>
            </div>
        `;
    },
    
    /**
     * Renderizar presupuestos
     */
    renderBudgets() {
        if (this.budgets.length === 0) {
            return `
                <div class="empty-state">
                    <i class="fas fa-file-invoice-dollar" style="font-size: 3rem; color: #ccc; margin-bottom: 1rem;"></i>
                    <p>No hay presupuestos disponibles aún.</p>
                </div>
            `;
        }
        
        return `
            <div class="budgets-list">
                ${this.budgets.map(budget => `
                    <div class="transparency-card">
                        <div class="card-header">
                            <h3>Presupuesto ${budget.year || 'N/A'}</h3>
                            <span class="badge ${budget.status === 'approved' ? 'badge-success' : 'badge-warning'}">
                                ${budget.status === 'approved' ? 'Aprobado' : 'En trámite'}
                            </span>
                        </div>
                        <div class="card-body">
                            <div class="budget-info">
                                <div class="info-item">
                                    <strong>Ingresos:</strong>
                                    <span class="amount positive">${this.formatCurrency(budget.income || 0)}</span>
                                </div>
                                <div class="info-item">
                                    <strong>Gastos:</strong>
                                    <span class="amount negative">${this.formatCurrency(budget.expenses || 0)}</span>
                                </div>
                                <div class="info-item">
                                    <strong>Saldo:</strong>
                                    <span class="amount ${(budget.income - budget.expenses) >= 0 ? 'positive' : 'negative'}">
                                        ${this.formatCurrency((budget.income || 0) - (budget.expenses || 0))}
                                    </span>
                                </div>
                            </div>
                            ${budget.description ? `<p class="description">${escapeHtml(budget.description)}</p>` : ''}
                            ${budget.documentUrl ? `
                                <a href="${budget.documentUrl}" target="_blank" class="btn btn-outline btn-sm">
                                    <i class="fas fa-download"></i> Descargar PDF
                                </a>
                            ` : ''}
                        </div>
                        <div class="card-footer">
                            <small>Publicado: ${formatDate(budget.publicationDate || budget.createdAt)}</small>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    },
    
    /**
     * Renderizar contratos
     */
    renderContracts() {
        if (this.contracts.length === 0) {
            return `
                <div class="empty-state">
                    <i class="fas fa-file-contract" style="font-size: 3rem; color: #ccc; margin-bottom: 1rem;"></i>
                    <p>No hay contratos publicados aún.</p>
                </div>
            `;
        }
        
        return `
            <div class="contracts-list">
                ${this.contracts.map(contract => `
                    <div class="transparency-card">
                        <div class="card-header">
                            <h3>${escapeHtml(contract.title || 'Contrato sin título')}</h3>
                            <span class="badge badge-info">${contract.type || 'Contrato'}</span>
                        </div>
                        <div class="card-body">
                            <div class="contract-info">
                                <div class="info-item">
                                    <strong>Empresa:</strong>
                                    <span>${escapeHtml(contract.company || 'N/A')}</span>
                                </div>
                                <div class="info-item">
                                    <strong>Importe:</strong>
                                    <span class="amount">${this.formatCurrency(contract.amount || 0)}</span>
                                </div>
                                <div class="info-item">
                                    <strong>Fecha publicación:</strong>
                                    <span>${formatDate(contract.publicationDate || contract.createdAt)}</span>
                                </div>
                                ${contract.endDate ? `
                                    <div class="info-item">
                                        <strong>Fecha fin:</strong>
                                        <span>${formatDate(contract.endDate)}</span>
                                    </div>
                                ` : ''}
                            </div>
                            ${contract.description ? `<p class="description">${escapeHtml(contract.description)}</p>` : ''}
                            ${contract.documentUrl ? `
                                <a href="${contract.documentUrl}" target="_blank" class="btn btn-outline btn-sm">
                                    <i class="fas fa-download"></i> Ver Documento
                                </a>
                            ` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    },
    
    /**
     * Renderizar actas de pleno
     */
    renderPlenaryMinutes() {
        if (this.plenaryMinutes.length === 0) {
            return `
                <div class="empty-state">
                    <i class="fas fa-file-alt" style="font-size: 3rem; color: #ccc; margin-bottom: 1rem;"></i>
                    <p>No hay actas de pleno publicadas aún.</p>
                </div>
            `;
        }
        
        return `
            <div class="plenary-minutes-list">
                ${this.plenaryMinutes.map(minute => `
                    <div class="transparency-card">
                        <div class="card-header">
                            <h3>Sesión de Pleno - ${formatDate(minute.date || minute.createdAt)}</h3>
                            <span class="badge badge-primary">Acta ${minute.sessionNumber || ''}</span>
                        </div>
                        <div class="card-body">
                            <div class="plenary-info">
                                <div class="info-item">
                                    <strong>Fecha:</strong>
                                    <span>${formatDate(minute.date || minute.createdAt)}</span>
                                </div>
                                ${minute.agenda ? `
                                    <div class="info-item">
                                        <strong>Orden del día:</strong>
                                        <span>${minute.agenda.length} puntos</span>
                                    </div>
                                ` : ''}
                            </div>
                            ${minute.summary ? `<p class="description">${escapeHtml(minute.summary)}</p>` : ''}
                            ${minute.documentUrl ? `
                                <a href="${minute.documentUrl}" target="_blank" class="btn btn-outline btn-sm">
                                    <i class="fas fa-download"></i> Descargar Acta
                                </a>
                            ` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    },
    
    /**
     * Mostrar pestaña específica
     */
    showTab(tabName) {
        // Ocultar todas las pestañas
        document.querySelectorAll('.transparency-tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelectorAll('.transparency-tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Mostrar pestaña seleccionada
        const tabContent = document.getElementById(`transparency-${tabName}-tab`);
        const tabBtn = document.querySelector(`[data-tab="${tabName}"]`);
        
        if (tabContent) tabContent.classList.add('active');
        if (tabBtn) tabBtn.classList.add('active');
    },
    
    /**
     * Formatear moneda
     */
    formatCurrency(amount) {
        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'EUR'
        }).format(amount);
    }
};

// Exponer globalmente
if (typeof window !== 'undefined') {
    window.TransparencyPortal = TransparencyPortal;
}




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

// ===== PORTAL DE TRANSPARENCIA =====
// Sistema para mostrar información pública: presupuestos, contratos, actas de pleno

const TransparencyPortal = {
    // Datos de transparencia
    budgets: [],
    contracts: [],
    plenaryMinutes: [],
    
    /**
     * Inicializar el portal de transparencia
     */
    async init() {
        console.log('🔍 Inicializando Portal de Transparencia...');
        try {
            await this.loadBudgets();
            await this.loadContracts();
            await this.loadPlenaryMinutes();
            this.renderTransparencyPortal();
        } catch (error) {
            console.error('❌ Error inicializando Portal de Transparencia:', error);
            const container = document.getElementById('transparencyContent');
            if (container) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #f59e0b; margin-bottom: 1rem;"></i>
                        <p>Error al cargar el portal de transparencia. Por favor, inténtelo de nuevo más tarde.</p>
                    </div>
                `;
            }
        }
    },
    
    /**
     * Cargar presupuestos desde Firestore
     */
    async loadBudgets() {
        try {
            // Usar sintaxis compatible con el wrapper
            const budgetsRef = firebase.firestore().collection('transparency_budgets')
                .orderBy('createdAt', 'desc');
            
            const snapshot = await budgetsRef.get();
            this.budgets = snapshot.docs
                .map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }))
                .sort((a, b) => {
                    // Ordenar por año descendente, luego por fecha
                    const yearA = a.year || 0;
                    const yearB = b.year || 0;
                    if (yearB !== yearA) return yearB - yearA;
                    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
                });
            
            console.log(`✅ ${this.budgets.length} presupuestos cargados`);
        } catch (error) {
            console.error('❌ Error cargando presupuestos:', error);
            // Cargar desde localStorage como fallback
            const saved = localStorage.getItem('transparency_budgets');
            if (saved) {
                this.budgets = JSON.parse(saved);
            }
        }
    },
    
    /**
     * Cargar contratos desde Firestore
     */
    async loadContracts() {
        try {
            const contractsRef = firebase.firestore().collection('transparency_contracts')
                .orderBy('publicationDate', 'desc')
                .limit(50);
            
            const snapshot = await contractsRef.get();
            this.contracts = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            console.log(`✅ ${this.contracts.length} contratos cargados`);
        } catch (error) {
            console.error('❌ Error cargando contratos:', error);
            const saved = localStorage.getItem('transparency_contracts');
            if (saved) {
                this.contracts = JSON.parse(saved);
            }
        }
    },
    
    /**
     * Cargar actas de pleno desde Firestore
     */
    async loadPlenaryMinutes() {
        try {
            const minutesRef = firebase.firestore().collection('transparency_plenary_minutes')
                .orderBy('date', 'desc')
                .limit(50);
            
            const snapshot = await minutesRef.get();
            this.plenaryMinutes = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            console.log(`✅ ${this.plenaryMinutes.length} actas de pleno cargadas`);
        } catch (error) {
            console.error('❌ Error cargando actas de pleno:', error);
            const saved = localStorage.getItem('transparency_plenary_minutes');
            if (saved) {
                this.plenaryMinutes = JSON.parse(saved);
            }
        }
    },
    
    /**
     * Renderizar el portal de transparencia
     */
    renderTransparencyPortal() {
        const container = document.getElementById('transparencyContent');
        if (!container) return;
        
        container.innerHTML = `
            <div class="transparency-portal">
                <div class="transparency-tabs">
                    <button class="transparency-tab-btn active" data-tab="budgets" onclick="TransparencyPortal.showTab('budgets')">
                        💰 Presupuestos
                    </button>
                    <button class="transparency-tab-btn" data-tab="contracts" onclick="TransparencyPortal.showTab('contracts')">
                        📋 Contratos y Licitaciones
                    </button>
                    <button class="transparency-tab-btn" data-tab="plenary" onclick="TransparencyPortal.showTab('plenary')">
                        📜 Actas de Pleno
                    </button>
                </div>
                
                <div class="transparency-content">
                    <div id="transparency-budgets-tab" class="transparency-tab-content active">
                        ${this.renderBudgets()}
                    </div>
                    <div id="transparency-contracts-tab" class="transparency-tab-content">
                        ${this.renderContracts()}
                    </div>
                    <div id="transparency-plenary-tab" class="transparency-tab-content">
                        ${this.renderPlenaryMinutes()}
                    </div>
                </div>
            </div>
        `;
    },
    
    /**
     * Renderizar presupuestos
     */
    renderBudgets() {
        if (this.budgets.length === 0) {
            return `
                <div class="empty-state">
                    <i class="fas fa-file-invoice-dollar" style="font-size: 3rem; color: #ccc; margin-bottom: 1rem;"></i>
                    <p>No hay presupuestos disponibles aún.</p>
                </div>
            `;
        }
        
        return `
            <div class="budgets-list">
                ${this.budgets.map(budget => `
                    <div class="transparency-card">
                        <div class="card-header">
                            <h3>Presupuesto ${budget.year || 'N/A'}</h3>
                            <span class="badge ${budget.status === 'approved' ? 'badge-success' : 'badge-warning'}">
                                ${budget.status === 'approved' ? 'Aprobado' : 'En trámite'}
                            </span>
                        </div>
                        <div class="card-body">
                            <div class="budget-info">
                                <div class="info-item">
                                    <strong>Ingresos:</strong>
                                    <span class="amount positive">${this.formatCurrency(budget.income || 0)}</span>
                                </div>
                                <div class="info-item">
                                    <strong>Gastos:</strong>
                                    <span class="amount negative">${this.formatCurrency(budget.expenses || 0)}</span>
                                </div>
                                <div class="info-item">
                                    <strong>Saldo:</strong>
                                    <span class="amount ${(budget.income - budget.expenses) >= 0 ? 'positive' : 'negative'}">
                                        ${this.formatCurrency((budget.income || 0) - (budget.expenses || 0))}
                                    </span>
                                </div>
                            </div>
                            ${budget.description ? `<p class="description">${escapeHtml(budget.description)}</p>` : ''}
                            ${budget.documentUrl ? `
                                <a href="${budget.documentUrl}" target="_blank" class="btn btn-outline btn-sm">
                                    <i class="fas fa-download"></i> Descargar PDF
                                </a>
                            ` : ''}
                        </div>
                        <div class="card-footer">
                            <small>Publicado: ${formatDate(budget.publicationDate || budget.createdAt)}</small>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    },
    
    /**
     * Renderizar contratos
     */
    renderContracts() {
        if (this.contracts.length === 0) {
            return `
                <div class="empty-state">
                    <i class="fas fa-file-contract" style="font-size: 3rem; color: #ccc; margin-bottom: 1rem;"></i>
                    <p>No hay contratos publicados aún.</p>
                </div>
            `;
        }
        
        return `
            <div class="contracts-list">
                ${this.contracts.map(contract => `
                    <div class="transparency-card">
                        <div class="card-header">
                            <h3>${escapeHtml(contract.title || 'Contrato sin título')}</h3>
                            <span class="badge badge-info">${contract.type || 'Contrato'}</span>
                        </div>
                        <div class="card-body">
                            <div class="contract-info">
                                <div class="info-item">
                                    <strong>Empresa:</strong>
                                    <span>${escapeHtml(contract.company || 'N/A')}</span>
                                </div>
                                <div class="info-item">
                                    <strong>Importe:</strong>
                                    <span class="amount">${this.formatCurrency(contract.amount || 0)}</span>
                                </div>
                                <div class="info-item">
                                    <strong>Fecha publicación:</strong>
                                    <span>${formatDate(contract.publicationDate || contract.createdAt)}</span>
                                </div>
                                ${contract.endDate ? `
                                    <div class="info-item">
                                        <strong>Fecha fin:</strong>
                                        <span>${formatDate(contract.endDate)}</span>
                                    </div>
                                ` : ''}
                            </div>
                            ${contract.description ? `<p class="description">${escapeHtml(contract.description)}</p>` : ''}
                            ${contract.documentUrl ? `
                                <a href="${contract.documentUrl}" target="_blank" class="btn btn-outline btn-sm">
                                    <i class="fas fa-download"></i> Ver Documento
                                </a>
                            ` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    },
    
    /**
     * Renderizar actas de pleno
     */
    renderPlenaryMinutes() {
        if (this.plenaryMinutes.length === 0) {
            return `
                <div class="empty-state">
                    <i class="fas fa-file-alt" style="font-size: 3rem; color: #ccc; margin-bottom: 1rem;"></i>
                    <p>No hay actas de pleno publicadas aún.</p>
                </div>
            `;
        }
        
        return `
            <div class="plenary-minutes-list">
                ${this.plenaryMinutes.map(minute => `
                    <div class="transparency-card">
                        <div class="card-header">
                            <h3>Sesión de Pleno - ${formatDate(minute.date || minute.createdAt)}</h3>
                            <span class="badge badge-primary">Acta ${minute.sessionNumber || ''}</span>
                        </div>
                        <div class="card-body">
                            <div class="plenary-info">
                                <div class="info-item">
                                    <strong>Fecha:</strong>
                                    <span>${formatDate(minute.date || minute.createdAt)}</span>
                                </div>
                                ${minute.agenda ? `
                                    <div class="info-item">
                                        <strong>Orden del día:</strong>
                                        <span>${minute.agenda.length} puntos</span>
                                    </div>
                                ` : ''}
                            </div>
                            ${minute.summary ? `<p class="description">${escapeHtml(minute.summary)}</p>` : ''}
                            ${minute.documentUrl ? `
                                <a href="${minute.documentUrl}" target="_blank" class="btn btn-outline btn-sm">
                                    <i class="fas fa-download"></i> Descargar Acta
                                </a>
                            ` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    },
    
    /**
     * Mostrar pestaña específica
     */
    showTab(tabName) {
        // Ocultar todas las pestañas
        document.querySelectorAll('.transparency-tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelectorAll('.transparency-tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Mostrar pestaña seleccionada
        const tabContent = document.getElementById(`transparency-${tabName}-tab`);
        const tabBtn = document.querySelector(`[data-tab="${tabName}"]`);
        
        if (tabContent) tabContent.classList.add('active');
        if (tabBtn) tabBtn.classList.add('active');
    },
    
    /**
     * Formatear moneda
     */
    formatCurrency(amount) {
        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'EUR'
        }).format(amount);
    }
};

// Exponer globalmente
if (typeof window !== 'undefined') {
    window.TransparencyPortal = TransparencyPortal;
}
