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

// ===== GESTIÓN ADMINISTRATIVA DE TRANSPARENCIA =====

/**
 * Abrir editor de transparencia
 */
function openTransparencyEditor(type) {
    if (!isAdmin) {
        showNotification('Solo los administradores pueden gestionar la transparencia', 'error');
        return;
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    
    const title = type === 'budget' ? 'Nuevo Presupuesto' : 
                  type === 'contract' ? 'Nuevo Contrato' : 
                  'Nueva Acta de Pleno';
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 700px;">
            <div class="modal-header">
                <h2>${title}</h2>
                <button class="close-modal" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <form id="transparencyForm" onsubmit="handleTransparencySubmit(event, '${type}')">
                    ${type === 'budget' ? `
                        <div class="form-group">
                            <label>Año:</label>
                            <input type="number" id="budgetYear" class="form-control" value="${new Date().getFullYear()}" required>
                        </div>
                        <div class="form-group">
                            <label>Ingresos (€):</label>
                            <input type="number" id="budgetIncome" class="form-control" step="0.01" required>
                        </div>
                        <div class="form-group">
                            <label>Gastos (€):</label>
                            <input type="number" id="budgetExpenses" class="form-control" step="0.01" required>
                        </div>
                        <div class="form-group">
                            <label>Estado:</label>
                            <select id="budgetStatus" class="form-control" required>
                                <option value="approved">Aprobado</option>
                                <option value="pending">En Trámite</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Descripción:</label>
                            <textarea id="budgetDescription" class="form-control" rows="3"></textarea>
                        </div>
                        <div class="form-group">
                            <label>URL del documento PDF (opcional):</label>
                            <input type="url" id="budgetDocumentUrl" class="form-control">
                        </div>
                    ` : type === 'contract' ? `
                        <div class="form-group">
                            <label>Título del contrato:</label>
                            <input type="text" id="contractTitle" class="form-control" required>
                        </div>
                        <div class="form-group">
                            <label>Tipo:</label>
                            <select id="contractType" class="form-control" required>
                                <option value="service">Servicio</option>
                                <option value="supply">Suministro</option>
                                <option value="work">Obra</option>
                                <option value="other">Otro</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Empresa:</label>
                            <input type="text" id="contractCompany" class="form-control" required>
                        </div>
                        <div class="form-group">
                            <label>Importe (€):</label>
                            <input type="number" id="contractAmount" class="form-control" step="0.01" required>
                        </div>
                        <div class="form-group">
                            <label>Fecha de publicación:</label>
                            <input type="date" id="contractPublicationDate" class="form-control" required>
                        </div>
                        <div class="form-group">
                            <label>Fecha de fin (opcional):</label>
                            <input type="date" id="contractEndDate" class="form-control">
                        </div>
                        <div class="form-group">
                            <label>Descripción:</label>
                            <textarea id="contractDescription" class="form-control" rows="3"></textarea>
                        </div>
                        <div class="form-group">
                            <label>URL del documento (opcional):</label>
                            <input type="url" id="contractDocumentUrl" class="form-control">
                        </div>
                    ` : `
                        <div class="form-group">
                            <label>Fecha de la sesión:</label>
                            <input type="date" id="plenaryDate" class="form-control" required>
                        </div>
                        <div class="form-group">
                            <label>Número de sesión:</label>
                            <input type="text" id="plenarySessionNumber" class="form-control">
                        </div>
                        <div class="form-group">
                            <label>Resumen:</label>
                            <textarea id="plenarySummary" class="form-control" rows="5"></textarea>
                        </div>
                        <div class="form-group">
                            <label>URL del acta PDF (opcional):</label>
                            <input type="url" id="plenaryDocumentUrl" class="form-control">
                        </div>
                    `}
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
 * Manejar envío de formulario de transparencia
 */
async function handleTransparencySubmit(e, type) {
    e.preventDefault();
    
    if (!isAdmin) {
        showNotification('No tiene permisos para realizar esta acción', 'error');
        return;
    }
    
    try {
        let data = {};
        const collection = type === 'budget' ? 'transparency_budgets' :
                          type === 'contract' ? 'transparency_contracts' :
                          'transparency_plenary_minutes';
        
        if (type === 'budget') {
            data = {
                year: parseInt(document.getElementById('budgetYear').value),
                income: parseFloat(document.getElementById('budgetIncome').value),
                expenses: parseFloat(document.getElementById('budgetExpenses').value),
                status: document.getElementById('budgetStatus').value,
                description: document.getElementById('budgetDescription').value,
                documentUrl: document.getElementById('budgetDocumentUrl').value || null,
                publicationDate: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                createdBy: currentUser.email
            };
        } else if (type === 'contract') {
            data = {
                title: document.getElementById('contractTitle').value,
                type: document.getElementById('contractType').value,
                company: document.getElementById('contractCompany').value,
                amount: parseFloat(document.getElementById('contractAmount').value),
                publicationDate: document.getElementById('contractPublicationDate').value,
                endDate: document.getElementById('contractEndDate').value || null,
                description: document.getElementById('contractDescription').value,
                documentUrl: document.getElementById('contractDocumentUrl').value || null,
                createdAt: new Date().toISOString(),
                createdBy: currentUser.email
            };
        } else {
            data = {
                date: document.getElementById('plenaryDate').value,
                sessionNumber: document.getElementById('plenarySessionNumber').value || null,
                summary: document.getElementById('plenarySummary').value,
                documentUrl: document.getElementById('plenaryDocumentUrl').value || null,
                createdAt: new Date().toISOString(),
                createdBy: currentUser.email
            };
        }
        
        await firebase.firestore().collection(collection).add(data);
        
        showNotification(`✅ ${type === 'budget' ? 'Presupuesto' : type === 'contract' ? 'Contrato' : 'Acta'} guardado correctamente`, 'success');
        
        // Cerrar modal
        document.querySelector('.modal').remove();
        
        // Recargar datos
        if (typeof TransparencyPortal !== 'undefined' && TransparencyPortal.init) {
            await TransparencyPortal.init();
        }
        
        // Recargar lista en admin
        loadTransparencyAdminList(type);
    } catch (error) {
        console.error('❌ Error guardando:', error);
        showNotification('Error al guardar. Inténtelo de nuevo.', 'error');
    }
}

/**
 * Cargar lista de transparencia en admin
 */
async function loadTransparencyAdminList(type) {
    const listId = type === 'budget' ? 'transparencyBudgetsList' :
                   type === 'contract' ? 'transparencyContractsList' :
                   'transparencyPlenaryList';
    
    const listElement = document.getElementById(listId);
    if (!listElement) return;
    
    try {
        const collection = type === 'budget' ? 'transparency_budgets' :
                          type === 'contract' ? 'transparency_contracts' :
                          'transparency_plenary_minutes';
        
            const snapshot = await firebase.firestore().collection(collection)
            .orderBy('createdAt', 'desc')
            .get();
        
        const items = snapshot.docs
            .map(doc => ({
                id: doc.id,
                ...doc.data()
            }))
            .slice(0, 20); // Limitar a 20
        
        if (items.length === 0) {
            listElement.innerHTML = '<p class="empty-state">No hay elementos registrados</p>';
            return;
        }
        
        listElement.innerHTML = items.map(item => {
            if (type === 'budget') {
                return `
                    <div class="content-item">
                        <div class="item-info">
                            <h4>Presupuesto ${item.year}</h4>
                            <p>Ingresos: ${formatCurrency(item.income)} | Gastos: ${formatCurrency(item.expenses)}</p>
                        </div>
                        <div class="item-actions">
                            <button class="btn btn-sm btn-danger" onclick="deleteTransparencyItem('${item.id}', '${collection}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `;
            } else if (type === 'contract') {
                return `
                    <div class="content-item">
                        <div class="item-info">
                            <h4>${escapeHtml(item.title)}</h4>
                            <p>${escapeHtml(item.company)} - ${formatCurrency(item.amount)}</p>
                        </div>
                        <div class="item-actions">
                            <button class="btn btn-sm btn-danger" onclick="deleteTransparencyItem('${item.id}', '${collection}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `;
            } else {
                return `
                    <div class="content-item">
                        <div class="item-info">
                            <h4>Acta ${item.sessionNumber || ''} - ${formatDate(item.date)}</h4>
                            <p>${escapeHtml(item.summary || '').substring(0, 100)}...</p>
                        </div>
                        <div class="item-actions">
                            <button class="btn btn-sm btn-danger" onclick="deleteTransparencyItem('${item.id}', '${collection}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `;
            }
        }).join('');
    } catch (error) {
        console.error('❌ Error cargando lista:', error);
        listElement.innerHTML = '<p class="error-state">Error al cargar la lista</p>';
    }
}

/**
 * Eliminar elemento de transparencia
 */
async function deleteTransparencyItem(id, collection) {
    if (!isAdmin) {
        showNotification('No tiene permisos', 'error');
        return;
    }
    
    if (!confirm('¿Está seguro de eliminar este elemento?')) {
        return;
    }
    
    try {
        await firebase.firestore().collection(collection).doc(id).delete();
        showNotification('✅ Elemento eliminado correctamente', 'success');
        
        // Recargar lista
        const type = collection.includes('budget') ? 'budget' :
                    collection.includes('contract') ? 'contract' : 'plenary';
        loadTransparencyAdminList(type);
        
        // Recargar portal público
        if (typeof TransparencyPortal !== 'undefined' && TransparencyPortal.init) {
            await TransparencyPortal.init();
        }
    } catch (error) {
        console.error('❌ Error eliminando:', error);
        showNotification('Error al eliminar. Inténtelo de nuevo.', 'error');
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

