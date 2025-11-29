/* global firebase, db, currentUser, isAdmin, showNotification, escapeHtml */

// Helper para formatear fecha
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES');
    } catch (e) {
        return dateString;
    }
}

// ===== GESTIÓN ADMINISTRATIVA DE PAGOS ONLINE =====

let allPayableServices = [];
let paymentsConfig = {
    moduleEnabled: false,
    paymentGateway: null,
    testMode: true,
    gatewayConfig: {}
};

/**
 * Cargar configuración de pagos
 */
function loadPaymentsConfig() {
    try {
        const saved = localStorage.getItem('onlinePaymentsConfig');
        if (saved) {
            paymentsConfig = { ...paymentsConfig, ...JSON.parse(saved) };
            
            // Actualizar UI
            const moduleCheckbox = document.getElementById('paymentsModuleEnabled');
            const testModeCheckbox = document.getElementById('paymentsTestMode');
            const gatewaySelect = document.getElementById('paymentsGateway');
            
            if (moduleCheckbox) moduleCheckbox.checked = paymentsConfig.moduleEnabled === true;
            if (testModeCheckbox) testModeCheckbox.checked = paymentsConfig.testMode !== false;
            if (gatewaySelect) gatewaySelect.value = paymentsConfig.paymentGateway || '';
        }
    } catch (error) {
        console.error('❌ Error cargando configuración:', error);
    }
}

/**
 * Guardar configuración de pagos
 */
function savePaymentsConfig() {
    if (!isAdmin) {
        showNotification('Solo los administradores pueden cambiar esta configuración', 'error');
        return;
    }
    
    const moduleCheckbox = document.getElementById('paymentsModuleEnabled');
    const testModeCheckbox = document.getElementById('paymentsTestMode');
    const gatewaySelect = document.getElementById('paymentsGateway');
    
    if (!moduleCheckbox || !testModeCheckbox || !gatewaySelect) {
        showNotification('Error: No se encontraron los controles de configuración', 'error');
        return;
    }
    
    paymentsConfig = {
        moduleEnabled: moduleCheckbox.checked,
        testMode: testModeCheckbox.checked,
        paymentGateway: gatewaySelect.value || null,
        gatewayConfig: paymentsConfig.gatewayConfig || {},
        updatedBy: currentUser ? currentUser.email : 'admin',
        updatedAt: new Date().toISOString()
    };
    
    try {
        localStorage.setItem('onlinePaymentsConfig', JSON.stringify(paymentsConfig));
        
        // Actualizar en módulo
        if (typeof OnlinePayments !== 'undefined') {
            OnlinePayments.config = paymentsConfig;
            if (paymentsConfig.moduleEnabled) {
                OnlinePayments.init();
            } else {
                OnlinePayments.hideModule();
            }
        }
        
        // Mostrar/ocultar enlace del menú
        const navLink = document.querySelector('a[href="#pagos-online"]');
        if (navLink) {
            if (!paymentsConfig.moduleEnabled) {
                navLink.style.display = 'none';
            } else {
                navLink.style.display = '';
            }
        }
        
        showNotification('✅ Configuración de pagos guardada correctamente', 'success');
    } catch (error) {
        console.error('❌ Error guardando configuración:', error);
        showNotification('Error al guardar la configuración', 'error');
    }
}

/**
 * Cargar todos los servicios pagables
 */
async function loadAllPayableServices() {
    if (!isAdmin) return;
    
    try {
        const snapshot = await firebase.firestore().collection('payable_services')
            .orderBy('order', 'asc')
            .orderBy('name', 'asc')
            .get();
        
        allPayableServices = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        renderPayableServicesList();
    } catch (error) {
        console.error('❌ Error cargando servicios pagables:', error);
        showNotification('Error al cargar servicios', 'error');
    }
}

/**
 * Renderizar lista de servicios pagables
 */
function renderPayableServicesList() {
    const listElement = document.getElementById('payableServicesList');
    if (!listElement) return;
    
    if (allPayableServices.length === 0) {
        listElement.innerHTML = '<p class="empty-state">No hay servicios configurados</p>';
        return;
    }
    
    listElement.innerHTML = allPayableServices.map(service => `
        <div class="payable-service-item">
            <div class="item-info">
                <h4>
                    ${escapeHtml(service.name || 'Sin nombre')}
                    ${service.enabled ? '<span class="badge badge-success">Activo</span>' : '<span class="badge badge-secondary">Inactivo</span>'}
                </h4>
                <p><strong>Categoría:</strong> ${escapeHtml(service.category || 'General')}</p>
                <p><strong>Importe:</strong> ${formatCurrency(service.amount || 0)}</p>
                <p>${escapeHtml((service.description || '').substring(0, 100))}...</p>
            </div>
            <div class="item-actions">
                <button class="btn btn-sm btn-primary" onclick="openPayableServiceEditor('${service.id}')">
                    <i class="fas fa-edit"></i> Editar
                </button>
                <button class="btn btn-sm btn-danger" onclick="deletePayableService('${service.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

/**
 * Abrir editor de servicio pagable
 */
function openPayableServiceEditor(serviceId) {
    if (!isAdmin) return;
    
    const service = serviceId ? allPayableServices.find(s => s.id === serviceId) : null;
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 700px;">
            <div class="modal-header">
                <h2>${service ? 'Editar Servicio Pagable' : 'Nuevo Servicio Pagable'}</h2>
                <button class="close-modal" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <form id="payableServiceForm" onsubmit="handlePayableServiceSubmit(event, '${serviceId || ''}')">
                    <div class="form-group">
                        <label>Nombre del servicio:</label>
                        <input type="text" id="serviceName" class="form-control" value="${service?.name || ''}" required>
                    </div>
                    <div class="form-group">
                        <label>Categoría:</label>
                        <select id="serviceCategory" class="form-control" required>
                            <option value="">Seleccione una categoría</option>
                            <option value="tasas" ${service?.category === 'tasas' ? 'selected' : ''}>Tasas Municipales</option>
                            <option value="multas" ${service?.category === 'multas' ? 'selected' : ''}>Multas</option>
                            <option value="licencias" ${service?.category === 'licencias' ? 'selected' : ''}>Licencias</option>
                            <option value="servicios" ${service?.category === 'servicios' ? 'selected' : ''}>Servicios</option>
                            <option value="otros" ${service?.category === 'otros' ? 'selected' : ''}>Otros</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Importe (€):</label>
                        <input type="number" id="serviceAmount" class="form-control" step="0.01" min="0" value="${service?.amount || ''}" required>
                    </div>
                    <div class="form-group">
                        <label>Descripción:</label>
                        <textarea id="serviceDescription" class="form-control" rows="4" required>${service?.description || ''}</textarea>
                    </div>
                    <div class="form-group">
                        <label>Requisitos (uno por línea):</label>
                        <textarea id="serviceRequirements" class="form-control" rows="3" placeholder="Ejemplo:&#10;DNI o NIE&#10;Justificante de domicilio">${service?.requirements ? service.requirements.join('\\n') : ''}</textarea>
                        <small>Escriba cada requisito en una línea separada</small>
                    </div>
                    <div class="form-group">
                        <label>Orden de visualización:</label>
                        <input type="number" id="serviceOrder" class="form-control" value="${service?.order || 0}" min="0">
                        <small>Los servicios se ordenarán por este número (menor = primero)</small>
                    </div>
                    <div class="form-group">
                        <label>Días de validez (opcional):</label>
                        <input type="number" id="serviceValidityDays" class="form-control" value="${service?.validityDays || ''}" min="1">
                        <small>Número de días que el pago es válido</small>
                    </div>
                    <div class="form-group">
                        <label>URL del documento (opcional):</label>
                        <input type="url" id="serviceDocumentUrl" class="form-control" value="${service?.documentUrl || ''}">
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="serviceEnabled" ${service?.enabled !== false ? 'checked' : ''}>
                            Servicio activo (visible en la web pública)
                        </label>
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="serviceRequiresLogin" ${service?.requiresLogin ? 'checked' : ''}>
                            Requiere inicio de sesión para pagar
                        </label>
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="serviceRequiresUserData" ${service?.requiresUserData ? 'checked' : ''}>
                            Solicitar datos del usuario en el formulario de pago
                        </label>
                    </div>
                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-save"></i> Guardar
                        </button>
                        <button type="button" class="btn btn-outline" onclick="this.closest('.modal').remove()">
                            Cancelar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

/**
 * Manejar envío de servicio pagable
 */
async function handlePayableServiceSubmit(e, serviceId) {
    e.preventDefault();
    
    if (!isAdmin) {
        showNotification('No tiene permisos', 'error');
        return;
    }
    
    try {
        const requirements = document.getElementById('serviceRequirements').value
            .split('\\n')
            .map(r => r.trim())
            .filter(r => r.length > 0);
        
        const data = {
            name: document.getElementById('serviceName').value,
            category: document.getElementById('serviceCategory').value,
            amount: parseFloat(document.getElementById('serviceAmount').value),
            description: document.getElementById('serviceDescription').value,
            requirements: requirements.length > 0 ? requirements : null,
            order: parseInt(document.getElementById('serviceOrder').value) || 0,
            validityDays: document.getElementById('serviceValidityDays').value ? parseInt(document.getElementById('serviceValidityDays').value) : null,
            documentUrl: document.getElementById('serviceDocumentUrl').value || null,
            enabled: document.getElementById('serviceEnabled').checked,
            requiresLogin: document.getElementById('serviceRequiresLogin').checked,
            requiresUserData: document.getElementById('serviceRequiresUserData').checked,
            updatedAt: new Date().toISOString(),
            updatedBy: currentUser.email
        };
        
        if (serviceId) {
            await firebase.firestore().collection('payable_services').doc(serviceId).update(data);
            showNotification('✅ Servicio actualizado correctamente', 'success');
        } else {
            data.createdAt = new Date().toISOString();
            data.createdBy = currentUser.email;
            await firebase.firestore().collection('payable_services').add(data);
            showNotification('✅ Servicio creado correctamente', 'success');
        }
        
        document.querySelector('.modal').remove();
        await loadAllPayableServices();
        
        // Recargar en portal público
        if (typeof OnlinePayments !== 'undefined' && OnlinePayments.init) {
            await OnlinePayments.init();
        }
    } catch (error) {
        console.error('❌ Error guardando servicio:', error);
        showNotification('Error al guardar. Inténtelo de nuevo.', 'error');
    }
}

/**
 * Eliminar servicio pagable
 */
async function deletePayableService(id) {
    if (!isAdmin || !confirm('¿Está seguro de eliminar este servicio?')) return;
    
    try {
        await firebase.firestore().collection('payable_services').doc(id).delete();
        showNotification('✅ Servicio eliminado', 'success');
        await loadAllPayableServices();
        
        // Recargar en portal público
        if (typeof OnlinePayments !== 'undefined' && OnlinePayments.init) {
            await OnlinePayments.init();
        }
    } catch (error) {
        console.error('❌ Error eliminando:', error);
        showNotification('Error al eliminar', 'error');
    }
}

/**
 * Formatear moneda
 */
function formatCurrency(amount) {
    return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'EUR'
    }).format(amount);
}

// Cargar configuración al iniciar
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', function() {
        const paymentsTab = document.getElementById('payments-admin-tab');
        if (paymentsTab) {
            const observer = new MutationObserver(function(mutations) {
                mutations.forEach(function(mutation) {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                        const isVisible = paymentsTab.style.display !== 'none';
                        if (isVisible && isAdmin) {
                            loadPaymentsConfig();
                            loadAllPayableServices();
                        }
                    }
                });
            });
            observer.observe(paymentsTab, { attributes: true });
        }
    });
}

