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

// ===== SISTEMA DE PAGOS ONLINE =====
// Sistema configurable para gestionar qué servicios se pueden pagar online

const OnlinePayments = {
    // Servicios pagables configurados
    payableServices: [],
    
    // Configuración del módulo
    config: {
        moduleEnabled: false, // Por defecto deshabilitado hasta integrar pasarela
        paymentGateway: null, // 'stripe', 'paypal', 'redsys', etc.
        testMode: true
    },
    
    /**
     * Cargar configuración
     */
    loadConfig() {
        try {
            const saved = localStorage.getItem('onlinePaymentsConfig');
            if (saved) {
                this.config = { ...this.config, ...JSON.parse(saved) };
            }
        } catch (error) {
            console.error('❌ Error cargando configuración de pagos:', error);
        }
    },
    
    /**
     * Cargar servicios pagables
     */
    async loadPayableServices() {
        try {
            // Usar sintaxis compatible con el wrapper
            const servicesRef = firebase.firestore().collection('payable_services')
                .where('enabled', '==', true)
                .orderBy('order', 'asc');
            
            const snapshot = await servicesRef.get();
            this.payableServices = snapshot.docs
                .map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }))
                .sort((a, b) => {
                    // Ordenar por order, luego por nombre
                    const orderA = a.order || 0;
                    const orderB = b.order || 0;
                    if (orderA !== orderB) return orderA - orderB;
                    return (a.name || '').localeCompare(b.name || '');
                });
            
            console.log(`✅ ${this.payableServices.length} servicios pagables cargados`);
        } catch (error) {
            console.error('❌ Error cargando servicios pagables:', error);
            // Cargar desde localStorage como fallback
            const saved = localStorage.getItem('payable_services');
            if (saved) {
                this.payableServices = JSON.parse(saved);
            }
        }
    },
    
    /**
     * Inicializar sistema de pagos
     */
    async init() {
        console.log('💳 Inicializando Sistema de Pagos Online...');
        try {
            this.loadConfig();
            
            // Solo mostrar si el módulo está habilitado
            if (!this.config.moduleEnabled) {
                this.hideModule();
                return;
            }
            
            await this.loadPayableServices();
            this.renderOnlinePayments();
        } catch (error) {
            console.error('❌ Error inicializando Sistema de Pagos:', error);
            const container = document.getElementById('onlinePaymentsContent');
            if (container) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #f59e0b; margin-bottom: 1rem;"></i>
                        <p>Error al cargar el sistema de pagos. Por favor, inténtelo de nuevo más tarde.</p>
                    </div>
                `;
            }
        }
    },
    
    /**
     * Ocultar módulo
     */
    hideModule() {
        const container = document.getElementById('onlinePaymentsContent');
        const section = document.getElementById('pagos-online');
        if (container) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-info-circle" style="font-size: 3rem; color: #ccc; margin-bottom: 1rem;"></i>
                    <p>El sistema de pagos online no está disponible actualmente.</p>
                </div>
            `;
        }
        // Ocultar enlace del menú
        if (section) {
            const navLink = document.querySelector('a[href="#pagos-online"]');
            if (navLink) {
                navLink.style.display = 'none';
            }
        }
    },
    
    /**
     * Renderizar interfaz de pagos
     */
    renderOnlinePayments() {
        const container = document.getElementById('onlinePaymentsContent');
        if (!container) return;
        
        if (!this.config.moduleEnabled) {
            this.hideModule();
            return;
        }
        
        if (this.payableServices.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-credit-card" style="font-size: 3rem; color: #ccc; margin-bottom: 1rem;"></i>
                    <p>No hay servicios disponibles para pago online en este momento.</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = `
            <div class="online-payments">
                <div class="payments-info">
                    <p class="info-text">
                        <i class="fas fa-info-circle"></i>
                        Puede realizar el pago de los siguientes servicios de forma online. 
                        ${this.config.testMode ? '<strong>Modo de prueba activo</strong>' : ''}
                    </p>
                </div>
                
                <div class="payable-services-list">
                    ${this.payableServices.map(service => this.renderServiceCard(service)).join('')}
                </div>
            </div>
        `;
    },
    
    /**
     * Renderizar tarjeta de servicio
     */
    renderServiceCard(service) {
        const amount = this.formatCurrency(service.amount || 0);
        const description = service.description || 'Sin descripción';
        
        return `
            <div class="payable-service-card">
                <div class="service-header">
                    <div class="service-info">
                        <h3>${escapeHtml(service.name || 'Servicio sin nombre')}</h3>
                        <p class="service-category">${escapeHtml(service.category || 'General')}</p>
                    </div>
                    <div class="service-amount">
                        <span class="amount">${amount}</span>
                    </div>
                </div>
                <div class="service-body">
                    <p class="service-description">${escapeHtml(description)}</p>
                    ${service.requirements ? `
                        <div class="service-requirements">
                            <strong>Requisitos:</strong>
                            <ul>
                                ${service.requirements.map(req => `<li>${escapeHtml(req)}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                    ${service.validityDays ? `
                        <p class="service-validity">
                            <i class="fas fa-calendar"></i>
                            Válido por ${service.validityDays} días
                        </p>
                    ` : ''}
                </div>
                <div class="service-footer">
                    <button class="btn btn-primary" onclick="OnlinePayments.initiatePayment('${service.id}')">
                        <i class="fas fa-credit-card"></i> Pagar Ahora
                    </button>
                    ${service.documentUrl ? `
                        <a href="${service.documentUrl}" target="_blank" class="btn btn-outline">
                            <i class="fas fa-file-pdf"></i> Ver Información
                        </a>
                    ` : ''}
                </div>
            </div>
        `;
    },
    
    /**
     * Iniciar proceso de pago
     */
    async initiatePayment(serviceId) {
        const service = this.payableServices.find(s => s.id === serviceId);
        if (!service) {
            showNotification('Servicio no encontrado', 'error');
            return;
        }
        
        // Verificar si el usuario está logueado (opcional, según configuración)
        if (service.requiresLogin && !currentUser) {
            showNotification('Debe iniciar sesión para realizar este pago', 'error');
            if (typeof openModal === 'function') {
                openModal('loginModal');
            }
            return;
        }
        
        // Mostrar modal de confirmación
        this.showPaymentModal(service);
    },
    
    /**
     * Mostrar modal de pago
     */
    showPaymentModal(service) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h2>Confirmar Pago</h2>
                    <button class="close-modal" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="payment-summary">
                        <h3>${escapeHtml(service.name)}</h3>
                        <div class="summary-item">
                            <span>Importe:</span>
                            <strong>${this.formatCurrency(service.amount)}</strong>
                        </div>
                        ${service.description ? `
                            <p class="summary-description">${escapeHtml(service.description)}</p>
                        ` : ''}
                    </div>
                    
                    ${this.config.testMode ? `
                        <div class="test-mode-warning">
                            <i class="fas fa-exclamation-triangle"></i>
                            <strong>Modo de Prueba:</strong> Este es un entorno de prueba. No se realizará ningún cargo real.
                        </div>
                    ` : ''}
                    
                    <div class="payment-notice">
                        <p><strong>Nota:</strong> La integración con la pasarela de pago está pendiente de configuración.</p>
                        <p>Por favor, contacte con el ayuntamiento para realizar el pago por otros medios.</p>
                    </div>
                    
                    <form id="paymentForm" onsubmit="OnlinePayments.processPayment(event, '${service.id}')">
                        ${service.requiresUserData ? `
                            <div class="form-group">
                                <label>Nombre completo:</label>
                                <input type="text" class="form-control" required>
                            </div>
                            <div class="form-group">
                                <label>DNI/NIE:</label>
                                <input type="text" class="form-control" required>
                            </div>
                            <div class="form-group">
                                <label>Email:</label>
                                <input type="email" class="form-control" value="${currentUser?.email || ''}" required>
                            </div>
                        ` : ''}
                        
                        <div class="form-actions">
                            <button type="button" class="btn btn-outline" onclick="this.closest('.modal').remove()">
                                Cancelar
                            </button>
                            <button type="submit" class="btn btn-primary" disabled>
                                <i class="fas fa-credit-card"></i> Procesar Pago (Próximamente)
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    },
    
    /**
     * Procesar pago (preparado para integración futura)
     */
    async processPayment(e, serviceId) {
        e.preventDefault();
        
        // TODO: Integrar con pasarela de pago
        // Por ahora solo mostrar mensaje informativo
        
        showNotification('⚠️ La integración con la pasarela de pago está pendiente. Por favor, contacte con el ayuntamiento.', 'info');
        
        // Cerrar modal
        const modal = document.querySelector('.modal');
        if (modal) {
            modal.remove();
        }
        
        // Aquí se integraría con la pasarela de pago:
        // - Stripe: stripe.redirectToCheckout()
        // - PayPal: paypal.Buttons()
        // - Redsys: redirection a TPV
        // etc.
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
    window.OnlinePayments = OnlinePayments;
}

