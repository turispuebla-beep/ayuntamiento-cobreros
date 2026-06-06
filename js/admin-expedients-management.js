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

// ===== GESTIÓN ADMINISTRATIVA DE EXPEDIENTES =====

let allExpedients = [];

/**
 * Cargar todos los expedientes
 */
async function loadAllExpedients() {
    if (!isAdmin) return;
    
    try {
            const snapshot = await firebase.firestore().collection('expedients')
            .orderBy('createdAt', 'desc')
            .get();
        
        allExpedients = snapshot.docs
            .map(doc => ({
                id: doc.id,
                ...doc.data()
            }))
            .slice(0, 100); // Limitar a 100
        
        renderExpedientsList();
    } catch (error) {
        console.error('❌ Error cargando expedientes:', error);
        showNotification('Error al cargar expedientes', 'error');
    }
}

/**
 * Renderizar lista de expedientes
 */
function renderExpedientsList() {
    const listElement = document.getElementById('expedientsList');
    if (!listElement) return;
    
    const filter = document.getElementById('expedientStatusFilter')?.value || 'all';
    const filtered = filter === 'all' ? allExpedients : 
                    allExpedients.filter(e => e.status === filter);
    
    if (filtered.length === 0) {
        listElement.innerHTML = '<p class="empty-state">No hay expedientes</p>';
        return;
    }
    
    listElement.innerHTML = filtered.map(expedient => `
        <div class="expedient-item">
            <div class="item-info">
                <h4>${escapeHtml(expedient.title || 'Sin título')}</h4>
                <p><strong>Nº:</strong> ${escapeHtml(expedient.number || expedient.id)}</p>
                <p><strong>Usuario:</strong> ${escapeHtml(expedient.userEmail || 'N/A')}</p>
                <p><strong>Tipo:</strong> ${escapeHtml(expedient.type || 'N/A')}</p>
                <p><strong>Estado:</strong> <span class="status-${expedient.status || 'pending'}">${getExpedientStatusText(expedient.status)}</span></p>
                <p><strong>Fecha:</strong> ${formatDate(expedient.createdAt)}</p>
            </div>
            <div class="item-actions">
                <button class="btn btn-sm btn-primary" onclick="openExpedientEditor('${expedient.id}')">
                    <i class="fas fa-edit"></i> Editar
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteExpedient('${expedient.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

/**
 * Filtrar expedientes
 */
function filterExpedients() {
    renderExpedientsList();
}

/**
 * Actualizar expedientes
 */
function refreshExpedients() {
    loadAllExpedients();
}

/**
 * Abrir editor de expediente
 */
async function openExpedientEditor(expedientId) {
    if (!isAdmin) return;
    
    const expedient = expedientId ? allExpedients.find(e => e.id === expedientId) : null;
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 700px;">
            <div class="modal-header">
                <h2>${expedient ? 'Editar Expediente' : 'Nuevo Expediente'}</h2>
                <button class="close-modal" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <form id="expedientForm" onsubmit="handleExpedientSubmit(event, '${expedientId || ''}')">
                    <div class="form-group">
                        <label>Número de expediente:</label>
                        <input type="text" id="expedientNumber" class="form-control" value="${expedient?.number || ''}" required>
                    </div>
                    <div class="form-group">
                        <label>Título:</label>
                        <input type="text" id="expedientTitle" class="form-control" value="${expedient?.title || ''}" required>
                    </div>
                    <div class="form-group">
                        <label>Tipo:</label>
                        <input type="text" id="expedientType" class="form-control" value="${expedient?.type || ''}" required>
                    </div>
                    <div class="form-group">
                        <label>Email del usuario:</label>
                        <input type="email" id="expedientUserEmail" class="form-control" value="${expedient?.userEmail || ''}" required>
                    </div>
                    <div class="form-group">
                        <label>Estado:</label>
                        <select id="expedientStatus" class="form-control" required>
                            <option value="pending" ${expedient?.status === 'pending' ? 'selected' : ''}>Pendiente</option>
                            <option value="in_progress" ${expedient?.status === 'in_progress' ? 'selected' : ''}>En Trámite</option>
                            <option value="approved" ${expedient?.status === 'approved' ? 'selected' : ''}>Aprobado</option>
                            <option value="rejected" ${expedient?.status === 'rejected' ? 'selected' : ''}>Rechazado</option>
                            <option value="completed" ${expedient?.status === 'completed' ? 'selected' : ''}>Completado</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Descripción:</label>
                        <textarea id="expedientDescription" class="form-control" rows="4">${expedient?.description || ''}</textarea>
                    </div>
                    <div class="form-group">
                        <label>Nota (se agregará al historial):</label>
                        <textarea id="expedientNote" class="form-control" rows="3" placeholder="Agregar nota al expediente..."></textarea>
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
 * Manejar envío de expediente
 */
async function handleExpedientSubmit(e, expedientId) {
    e.preventDefault();
    
    if (!isAdmin) {
        showNotification('No tiene permisos', 'error');
        return;
    }
    
    try {
        const data = {
            number: document.getElementById('expedientNumber').value.toUpperCase(),
            title: document.getElementById('expedientTitle').value,
            type: document.getElementById('expedientType').value,
            userEmail: document.getElementById('expedientUserEmail').value,
            status: document.getElementById('expedientStatus').value,
            description: document.getElementById('expedientDescription').value,
            updatedAt: new Date().toISOString(),
            updatedBy: currentUser.email
        };
        
        const note = document.getElementById('expedientNote').value.trim();
        if (note) {
            if (!data.notes) data.notes = [];
            data.notes.push({
                text: note,
                date: new Date().toISOString(),
                addedBy: currentUser.email
            });
        }
        
        if (expedientId) {
            // Actualizar
            await firebase.firestore().collection('expedients').doc(expedientId).update(data);
            showNotification('✅ Expediente actualizado correctamente', 'success');
        } else {
            // Crear nuevo
            data.createdAt = new Date().toISOString();
            data.createdBy = currentUser.email;
            await firebase.firestore().collection('expedients').add(data);
            showNotification('✅ Expediente creado correctamente', 'success');
        }
        
        document.querySelector('.modal').remove();
        await loadAllExpedients();
        
        // Notificar al usuario si cambió el estado
        if (expedientId && note) {
            // Aquí se podría enviar notificación al usuario
        }
    } catch (error) {
        console.error('❌ Error guardando expediente:', error);
        showNotification('Error al guardar. Inténtelo de nuevo.', 'error');
    }
}

/**
 * Eliminar expediente
 */
async function deleteExpedient(id) {
    if (!isAdmin) return;
    
    if (!confirm('¿Está seguro de eliminar este expediente?')) {
        return;
    }
    
    try {
        await firebase.firestore().collection('expedients').doc(id).delete();
        showNotification('✅ Expediente eliminado', 'success');
        await loadAllExpedients();
    } catch (error) {
        console.error('❌ Error eliminando:', error);
        showNotification('Error al eliminar', 'error');
    }
}

/**
 * Obtener texto de estado
 */
function getExpedientStatusText(status) {
    const map = {
        'pending': 'Pendiente',
        'in_progress': 'En Trámite',
        'approved': 'Aprobado',
        'rejected': 'Rechazado',
        'completed': 'Completado',
        'cancelled': 'Cancelado'
    };
    return map[status] || 'Pendiente';
}

// Cargar expedientes cuando se abre la pestaña
document.addEventListener('DOMContentLoaded', function() {
    // Escuchar cambios de pestaña
    const expedientsTab = document.getElementById('expedients-admin-tab');
    if (expedientsTab) {
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                    const isVisible = expedientsTab.style.display !== 'none';
                    if (isVisible && isAdmin) {
                        loadAllExpedients();
                    }
                }
            });
        });
        observer.observe(expedientsTab, { attributes: true });
    }
});




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

// ===== GESTIÓN ADMINISTRATIVA DE EXPEDIENTES =====

let allExpedients = [];

/**
 * Cargar todos los expedientes
 */
async function loadAllExpedients() {
    if (!isAdmin) return;
    
    try {
            const snapshot = await firebase.firestore().collection('expedients')
            .orderBy('createdAt', 'desc')
            .get();
        
        allExpedients = snapshot.docs
            .map(doc => ({
                id: doc.id,
                ...doc.data()
            }))
            .slice(0, 100); // Limitar a 100
        
        renderExpedientsList();
    } catch (error) {
        console.error('❌ Error cargando expedientes:', error);
        showNotification('Error al cargar expedientes', 'error');
    }
}

/**
 * Renderizar lista de expedientes
 */
function renderExpedientsList() {
    const listElement = document.getElementById('expedientsList');
    if (!listElement) return;
    
    const filter = document.getElementById('expedientStatusFilter')?.value || 'all';
    const filtered = filter === 'all' ? allExpedients : 
                    allExpedients.filter(e => e.status === filter);
    
    if (filtered.length === 0) {
        listElement.innerHTML = '<p class="empty-state">No hay expedientes</p>';
        return;
    }
    
    listElement.innerHTML = filtered.map(expedient => `
        <div class="expedient-item">
            <div class="item-info">
                <h4>${escapeHtml(expedient.title || 'Sin título')}</h4>
                <p><strong>Nº:</strong> ${escapeHtml(expedient.number || expedient.id)}</p>
                <p><strong>Usuario:</strong> ${escapeHtml(expedient.userEmail || 'N/A')}</p>
                <p><strong>Tipo:</strong> ${escapeHtml(expedient.type || 'N/A')}</p>
                <p><strong>Estado:</strong> <span class="status-${expedient.status || 'pending'}">${getExpedientStatusText(expedient.status)}</span></p>
                <p><strong>Fecha:</strong> ${formatDate(expedient.createdAt)}</p>
            </div>
            <div class="item-actions">
                <button class="btn btn-sm btn-primary" onclick="openExpedientEditor('${expedient.id}')">
                    <i class="fas fa-edit"></i> Editar
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteExpedient('${expedient.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

/**
 * Filtrar expedientes
 */
function filterExpedients() {
    renderExpedientsList();
}

/**
 * Actualizar expedientes
 */
function refreshExpedients() {
    loadAllExpedients();
}

/**
 * Abrir editor de expediente
 */
async function openExpedientEditor(expedientId) {
    if (!isAdmin) return;
    
    const expedient = expedientId ? allExpedients.find(e => e.id === expedientId) : null;
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 700px;">
            <div class="modal-header">
                <h2>${expedient ? 'Editar Expediente' : 'Nuevo Expediente'}</h2>
                <button class="close-modal" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <form id="expedientForm" onsubmit="handleExpedientSubmit(event, '${expedientId || ''}')">
                    <div class="form-group">
                        <label>Número de expediente:</label>
                        <input type="text" id="expedientNumber" class="form-control" value="${expedient?.number || ''}" required>
                    </div>
                    <div class="form-group">
                        <label>Título:</label>
                        <input type="text" id="expedientTitle" class="form-control" value="${expedient?.title || ''}" required>
                    </div>
                    <div class="form-group">
                        <label>Tipo:</label>
                        <input type="text" id="expedientType" class="form-control" value="${expedient?.type || ''}" required>
                    </div>
                    <div class="form-group">
                        <label>Email del usuario:</label>
                        <input type="email" id="expedientUserEmail" class="form-control" value="${expedient?.userEmail || ''}" required>
                    </div>
                    <div class="form-group">
                        <label>Estado:</label>
                        <select id="expedientStatus" class="form-control" required>
                            <option value="pending" ${expedient?.status === 'pending' ? 'selected' : ''}>Pendiente</option>
                            <option value="in_progress" ${expedient?.status === 'in_progress' ? 'selected' : ''}>En Trámite</option>
                            <option value="approved" ${expedient?.status === 'approved' ? 'selected' : ''}>Aprobado</option>
                            <option value="rejected" ${expedient?.status === 'rejected' ? 'selected' : ''}>Rechazado</option>
                            <option value="completed" ${expedient?.status === 'completed' ? 'selected' : ''}>Completado</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Descripción:</label>
                        <textarea id="expedientDescription" class="form-control" rows="4">${expedient?.description || ''}</textarea>
                    </div>
                    <div class="form-group">
                        <label>Nota (se agregará al historial):</label>
                        <textarea id="expedientNote" class="form-control" rows="3" placeholder="Agregar nota al expediente..."></textarea>
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
 * Manejar envío de expediente
 */
async function handleExpedientSubmit(e, expedientId) {
    e.preventDefault();
    
    if (!isAdmin) {
        showNotification('No tiene permisos', 'error');
        return;
    }
    
    try {
        const data = {
            number: document.getElementById('expedientNumber').value.toUpperCase(),
            title: document.getElementById('expedientTitle').value,
            type: document.getElementById('expedientType').value,
            userEmail: document.getElementById('expedientUserEmail').value,
            status: document.getElementById('expedientStatus').value,
            description: document.getElementById('expedientDescription').value,
            updatedAt: new Date().toISOString(),
            updatedBy: currentUser.email
        };
        
        const note = document.getElementById('expedientNote').value.trim();
        if (note) {
            if (!data.notes) data.notes = [];
            data.notes.push({
                text: note,
                date: new Date().toISOString(),
                addedBy: currentUser.email
            });
        }
        
        if (expedientId) {
            // Actualizar
            await firebase.firestore().collection('expedients').doc(expedientId).update(data);
            showNotification('✅ Expediente actualizado correctamente', 'success');
        } else {
            // Crear nuevo
            data.createdAt = new Date().toISOString();
            data.createdBy = currentUser.email;
            await firebase.firestore().collection('expedients').add(data);
            showNotification('✅ Expediente creado correctamente', 'success');
        }
        
        document.querySelector('.modal').remove();
        await loadAllExpedients();
        
        // Notificar al usuario si cambió el estado
        if (expedientId && note) {
            // Aquí se podría enviar notificación al usuario
        }
    } catch (error) {
        console.error('❌ Error guardando expediente:', error);
        showNotification('Error al guardar. Inténtelo de nuevo.', 'error');
    }
}

/**
 * Eliminar expediente
 */
async function deleteExpedient(id) {
    if (!isAdmin) return;
    
    if (!confirm('¿Está seguro de eliminar este expediente?')) {
        return;
    }
    
    try {
        await firebase.firestore().collection('expedients').doc(id).delete();
        showNotification('✅ Expediente eliminado', 'success');
        await loadAllExpedients();
    } catch (error) {
        console.error('❌ Error eliminando:', error);
        showNotification('Error al eliminar', 'error');
    }
}

/**
 * Obtener texto de estado
 */
function getExpedientStatusText(status) {
    const map = {
        'pending': 'Pendiente',
        'in_progress': 'En Trámite',
        'approved': 'Aprobado',
        'rejected': 'Rechazado',
        'completed': 'Completado',
        'cancelled': 'Cancelado'
    };
    return map[status] || 'Pendiente';
}

// Cargar expedientes cuando se abre la pestaña
document.addEventListener('DOMContentLoaded', function() {
    // Escuchar cambios de pestaña
    const expedientsTab = document.getElementById('expedients-admin-tab');
    if (expedientsTab) {
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                    const isVisible = expedientsTab.style.display !== 'none';
                    if (isVisible && isAdmin) {
                        loadAllExpedients();
                    }
                }
            });
        });
        observer.observe(expedientsTab, { attributes: true });
    }
});
