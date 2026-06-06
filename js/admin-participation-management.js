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

// ===== GESTIÓN ADMINISTRATIVA DE PARTICIPACIÓN CIUDADANA =====

let allSurveys = [];
let allSuggestions = [];

/**
 * Cargar encuestas
 */
async function loadAllSurveys() {
    if (!isAdmin) return;
    
    try {
            const snapshot = await firebase.firestore().collection('citizen_surveys')
            .orderBy('createdAt', 'desc')
            .get();
        
        allSurveys = snapshot.docs
            .map(doc => ({
                id: doc.id,
                ...doc.data()
            }))
            .slice(0, 50); // Limitar a 50
        
        renderSurveysList();
    } catch (error) {
        console.error('❌ Error cargando encuestas:', error);
    }
}

/**
 * Cargar sugerencias
 */
async function loadAllSuggestions() {
    if (!isAdmin) return;
    
    try {
            const snapshot = await firebase.firestore().collection('citizen_suggestions')
            .orderBy('createdAt', 'desc')
            .get();
        
        allSuggestions = snapshot.docs
            .map(doc => ({
                id: doc.id,
                ...doc.data()
            }))
            .slice(0, 100); // Limitar a 100
        
        renderSuggestionsList();
    } catch (error) {
        console.error('❌ Error cargando sugerencias:', error);
    }
}

/**
 * Renderizar lista de encuestas
 */
function renderSurveysList() {
    const listElement = document.getElementById('surveysList');
    if (!listElement) return;
    
    if (allSurveys.length === 0) {
        listElement.innerHTML = '<p class="empty-state">No hay encuestas</p>';
        return;
    }
    
    listElement.innerHTML = allSurveys.map(survey => `
        <div class="survey-item">
            <div class="item-info">
                <h4>${escapeHtml(survey.title || 'Sin título')}</h4>
                <p>${escapeHtml(survey.description || '').substring(0, 100)}...</p>
                <p><strong>Estado:</strong> ${survey.active ? 'Activa' : 'Finalizada'}</p>
                <p><strong>Votos:</strong> ${survey.totalVotes || 0}</p>
                <p><strong>Fecha fin:</strong> ${formatDate(survey.endDate)}</p>
            </div>
            <div class="item-actions">
                <button class="btn btn-sm btn-primary" onclick="openSurveyEditor('${survey.id}')">
                    <i class="fas fa-edit"></i> Editar
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteSurvey('${survey.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

/**
 * Renderizar lista de sugerencias
 */
function renderSuggestionsList() {
    const listElement = document.getElementById('suggestionsList');
    if (!listElement) return;
    
    const filter = document.getElementById('suggestionStatusFilter')?.value || 'all';
    const filtered = filter === 'all' ? allSuggestions : 
                    allSuggestions.filter(s => s.status === filter);
    
    if (filtered.length === 0) {
        listElement.innerHTML = '<p class="empty-state">No hay sugerencias</p>';
        return;
    }
    
    listElement.innerHTML = filtered.map(suggestion => `
        <div class="suggestion-item">
            <div class="item-info">
                <h4>${escapeHtml(suggestion.title || 'Sin título')}</h4>
                <p><strong>Categoría:</strong> ${getCategoryName(suggestion.category)}</p>
                <p><strong>Usuario:</strong> ${escapeHtml(suggestion.userEmail || 'N/A')}</p>
                <p><strong>Estado:</strong> <span class="status-${suggestion.status || 'pending'}">${getStatusText(suggestion.status)}</span></p>
                <p>${escapeHtml(suggestion.description || '').substring(0, 150)}...</p>
                ${suggestion.response ? `<p class="response"><strong>Respuesta:</strong> ${escapeHtml(suggestion.response)}</p>` : ''}
            </div>
            <div class="item-actions">
                <button class="btn btn-sm btn-primary" onclick="openSuggestionEditor('${suggestion.id}')">
                    <i class="fas fa-edit"></i> Responder
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteSuggestion('${suggestion.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

/**
 * Abrir editor de encuesta
 */
function openSurveyEditor(surveyId) {
    if (!isAdmin) return;
    
    const survey = surveyId ? allSurveys.find(s => s.id === surveyId) : null;
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 700px;">
            <div class="modal-header">
                <h2>${survey ? 'Editar Encuesta' : 'Nueva Encuesta'}</h2>
                <button class="close-modal" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <form id="surveyForm" onsubmit="handleSurveySubmit(event, '${surveyId || ''}')">
                    <div class="form-group">
                        <label>Título:</label>
                        <input type="text" id="surveyTitle" class="form-control" value="${survey?.title || ''}" required>
                    </div>
                    <div class="form-group">
                        <label>Descripción:</label>
                        <textarea id="surveyDescription" class="form-control" rows="4" required>${survey?.description || ''}</textarea>
                    </div>
                    <div class="form-group">
                        <label>Opciones (una por línea):</label>
                        <textarea id="surveyOptions" class="form-control" rows="5" required>${survey?.options ? survey.options.join('\\n') : ''}</textarea>
                        <small>Escriba cada opción en una línea separada</small>
                    </div>
                    <div class="form-group">
                        <label>Fecha de finalización:</label>
                        <input type="date" id="surveyEndDate" class="form-control" value="${survey?.endDate ? survey.endDate.split('T')[0] : ''}" required>
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="surveyActive" ${survey?.active !== false ? 'checked' : ''}>
                            Encuesta activa
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
 * Manejar envío de encuesta
 */
async function handleSurveySubmit(e, surveyId) {
    e.preventDefault();
    
    if (!isAdmin) return;
    
    try {
        const options = document.getElementById('surveyOptions').value
            .split('\\n')
            .map(o => o.trim())
            .filter(o => o.length > 0);
        
        if (options.length < 2) {
            showNotification('Debe agregar al menos 2 opciones', 'error');
            return;
        }
        
        const data = {
            title: document.getElementById('surveyTitle').value,
            description: document.getElementById('surveyDescription').value,
            options: options,
            endDate: document.getElementById('surveyEndDate').value,
            active: document.getElementById('surveyActive').checked,
            results: surveyId ? undefined : options.map(() => 0),
            voters: surveyId ? undefined : [],
            totalVotes: surveyId ? undefined : 0,
            updatedAt: new Date().toISOString()
        };
        
        if (surveyId) {
            await firebase.firestore().collection('citizen_surveys').doc(surveyId).update(data);
            showNotification('✅ Encuesta actualizada', 'success');
        } else {
            data.createdAt = new Date().toISOString();
            data.createdBy = currentUser.email;
            await firebase.firestore().collection('citizen_surveys').add(data);
            showNotification('✅ Encuesta creada', 'success');
        }
        
        document.querySelector('.modal').remove();
        await loadAllSurveys();
        
        // Recargar en portal público
        if (typeof CitizenParticipation !== 'undefined' && CitizenParticipation.init) {
            await CitizenParticipation.init();
        }
    } catch (error) {
        console.error('❌ Error guardando encuesta:', error);
        showNotification('Error al guardar', 'error');
    }
}

/**
 * Abrir editor de sugerencia
 */
function openSuggestionEditor(suggestionId) {
    if (!isAdmin) return;
    
    const suggestion = allSuggestions.find(s => s.id === suggestionId);
    if (!suggestion) return;
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 700px;">
            <div class="modal-header">
                <h2>Responder Sugerencia</h2>
                <button class="close-modal" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="suggestion-display">
                    <h4>${escapeHtml(suggestion.title)}</h4>
                    <p><strong>Categoría:</strong> ${getCategoryName(suggestion.category)}</p>
                    <p><strong>Usuario:</strong> ${escapeHtml(suggestion.userEmail)}</p>
                    <p><strong>Descripción:</strong></p>
                    <p>${escapeHtml(suggestion.description)}</p>
                </div>
                <form id="suggestionResponseForm" onsubmit="handleSuggestionResponse(event, '${suggestionId}')">
                    <div class="form-group">
                        <label>Estado:</label>
                        <select id="suggestionStatus" class="form-control" required>
                            <option value="pending" ${suggestion.status === 'pending' ? 'selected' : ''}>Pendiente</option>
                            <option value="reviewing" ${suggestion.status === 'reviewing' ? 'selected' : ''}>En Revisión</option>
                            <option value="accepted" ${suggestion.status === 'accepted' ? 'selected' : ''}>Aceptada</option>
                            <option value="rejected" ${suggestion.status === 'rejected' ? 'selected' : ''}>Rechazada</option>
                            <option value="implemented" ${suggestion.status === 'implemented' ? 'selected' : ''}>Implementada</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Respuesta del Ayuntamiento:</label>
                        <textarea id="suggestionResponse" class="form-control" rows="5" required>${suggestion.response || ''}</textarea>
                    </div>
                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-save"></i> Guardar Respuesta
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
 * Manejar respuesta a sugerencia
 */
async function handleSuggestionResponse(e, suggestionId) {
    e.preventDefault();
    
    if (!isAdmin) return;
    
    try {
        const data = {
            status: document.getElementById('suggestionStatus').value,
            response: document.getElementById('suggestionResponse').value,
            respondedAt: new Date().toISOString(),
            respondedBy: currentUser.email,
            updatedAt: new Date().toISOString()
        };
        
        await firebase.firestore().collection('citizen_suggestions').doc(suggestionId).update(data);
        
        showNotification('✅ Respuesta guardada correctamente', 'success');
        
        document.querySelector('.modal').remove();
        await loadAllSuggestions();
        
        // Notificar al usuario (opcional)
        // Aquí se podría enviar email al usuario
    } catch (error) {
        console.error('❌ Error guardando respuesta:', error);
        showNotification('Error al guardar', 'error');
    }
}

/**
 * Filtrar sugerencias
 */
function filterSuggestions() {
    renderSuggestionsList();
}

/**
 * Actualizar sugerencias
 */
function refreshSuggestions() {
    loadAllSuggestions();
}

/**
 * Eliminar encuesta
 */
async function deleteSurvey(id) {
    if (!isAdmin || !confirm('¿Eliminar esta encuesta?')) return;
    
    try {
        await firebase.firestore().collection('citizen_surveys').doc(id).delete();
        showNotification('✅ Encuesta eliminada', 'success');
        await loadAllSurveys();
    } catch (error) {
        console.error('❌ Error eliminando:', error);
        showNotification('Error al eliminar', 'error');
    }
}

/**
 * Eliminar sugerencia
 */
async function deleteSuggestion(id) {
    if (!isAdmin || !confirm('¿Eliminar esta sugerencia?')) return;
    
    try {
        await firebase.firestore().collection('citizen_suggestions').doc(id).delete();
        showNotification('✅ Sugerencia eliminada', 'success');
        await loadAllSuggestions();
    } catch (error) {
        console.error('❌ Error eliminando:', error);
        showNotification('Error al eliminar', 'error');
    }
}

/**
 * Obtener nombre de categoría
 */
function getCategoryName(category) {
    const map = {
        'infrastructure': 'Infraestructura',
        'services': 'Servicios',
        'environment': 'Medio Ambiente',
        'culture': 'Cultura',
        'safety': 'Seguridad',
        'other': 'Otros'
    };
    return map[category] || 'Otros';
}

/**
 * Obtener texto de estado
 */
function getStatusText(status) {
    const map = {
        'pending': 'Pendiente',
        'reviewing': 'En Revisión',
        'accepted': 'Aceptada',
        'rejected': 'Rechazada',
        'implemented': 'Implementada'
    };
    return map[status] || 'Pendiente';
}

// Cargar datos cuando se abre la pestaña
document.addEventListener('DOMContentLoaded', function() {
    const participationTab = document.getElementById('participation-admin-tab');
    if (participationTab) {
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                    const isVisible = participationTab.style.display !== 'none';
                    if (isVisible && isAdmin) {
                        loadAllSurveys();
                        loadAllSuggestions();
                    }
                }
            });
        });
        observer.observe(participationTab, { attributes: true });
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

// ===== GESTIÓN ADMINISTRATIVA DE PARTICIPACIÓN CIUDADANA =====

let allSurveys = [];
let allSuggestions = [];

/**
 * Cargar encuestas
 */
async function loadAllSurveys() {
    if (!isAdmin) return;
    
    try {
            const snapshot = await firebase.firestore().collection('citizen_surveys')
            .orderBy('createdAt', 'desc')
            .get();
        
        allSurveys = snapshot.docs
            .map(doc => ({
                id: doc.id,
                ...doc.data()
            }))
            .slice(0, 50); // Limitar a 50
        
        renderSurveysList();
    } catch (error) {
        console.error('❌ Error cargando encuestas:', error);
    }
}

/**
 * Cargar sugerencias
 */
async function loadAllSuggestions() {
    if (!isAdmin) return;
    
    try {
            const snapshot = await firebase.firestore().collection('citizen_suggestions')
            .orderBy('createdAt', 'desc')
            .get();
        
        allSuggestions = snapshot.docs
            .map(doc => ({
                id: doc.id,
                ...doc.data()
            }))
            .slice(0, 100); // Limitar a 100
        
        renderSuggestionsList();
    } catch (error) {
        console.error('❌ Error cargando sugerencias:', error);
    }
}

/**
 * Renderizar lista de encuestas
 */
function renderSurveysList() {
    const listElement = document.getElementById('surveysList');
    if (!listElement) return;
    
    if (allSurveys.length === 0) {
        listElement.innerHTML = '<p class="empty-state">No hay encuestas</p>';
        return;
    }
    
    listElement.innerHTML = allSurveys.map(survey => `
        <div class="survey-item">
            <div class="item-info">
                <h4>${escapeHtml(survey.title || 'Sin título')}</h4>
                <p>${escapeHtml(survey.description || '').substring(0, 100)}...</p>
                <p><strong>Estado:</strong> ${survey.active ? 'Activa' : 'Finalizada'}</p>
                <p><strong>Votos:</strong> ${survey.totalVotes || 0}</p>
                <p><strong>Fecha fin:</strong> ${formatDate(survey.endDate)}</p>
            </div>
            <div class="item-actions">
                <button class="btn btn-sm btn-primary" onclick="openSurveyEditor('${survey.id}')">
                    <i class="fas fa-edit"></i> Editar
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteSurvey('${survey.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

/**
 * Renderizar lista de sugerencias
 */
function renderSuggestionsList() {
    const listElement = document.getElementById('suggestionsList');
    if (!listElement) return;
    
    const filter = document.getElementById('suggestionStatusFilter')?.value || 'all';
    const filtered = filter === 'all' ? allSuggestions : 
                    allSuggestions.filter(s => s.status === filter);
    
    if (filtered.length === 0) {
        listElement.innerHTML = '<p class="empty-state">No hay sugerencias</p>';
        return;
    }
    
    listElement.innerHTML = filtered.map(suggestion => `
        <div class="suggestion-item">
            <div class="item-info">
                <h4>${escapeHtml(suggestion.title || 'Sin título')}</h4>
                <p><strong>Categoría:</strong> ${getCategoryName(suggestion.category)}</p>
                <p><strong>Usuario:</strong> ${escapeHtml(suggestion.userEmail || 'N/A')}</p>
                <p><strong>Estado:</strong> <span class="status-${suggestion.status || 'pending'}">${getStatusText(suggestion.status)}</span></p>
                <p>${escapeHtml(suggestion.description || '').substring(0, 150)}...</p>
                ${suggestion.response ? `<p class="response"><strong>Respuesta:</strong> ${escapeHtml(suggestion.response)}</p>` : ''}
            </div>
            <div class="item-actions">
                <button class="btn btn-sm btn-primary" onclick="openSuggestionEditor('${suggestion.id}')">
                    <i class="fas fa-edit"></i> Responder
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteSuggestion('${suggestion.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

/**
 * Abrir editor de encuesta
 */
function openSurveyEditor(surveyId) {
    if (!isAdmin) return;
    
    const survey = surveyId ? allSurveys.find(s => s.id === surveyId) : null;
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 700px;">
            <div class="modal-header">
                <h2>${survey ? 'Editar Encuesta' : 'Nueva Encuesta'}</h2>
                <button class="close-modal" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <form id="surveyForm" onsubmit="handleSurveySubmit(event, '${surveyId || ''}')">
                    <div class="form-group">
                        <label>Título:</label>
                        <input type="text" id="surveyTitle" class="form-control" value="${survey?.title || ''}" required>
                    </div>
                    <div class="form-group">
                        <label>Descripción:</label>
                        <textarea id="surveyDescription" class="form-control" rows="4" required>${survey?.description || ''}</textarea>
                    </div>
                    <div class="form-group">
                        <label>Opciones (una por línea):</label>
                        <textarea id="surveyOptions" class="form-control" rows="5" required>${survey?.options ? survey.options.join('\\n') : ''}</textarea>
                        <small>Escriba cada opción en una línea separada</small>
                    </div>
                    <div class="form-group">
                        <label>Fecha de finalización:</label>
                        <input type="date" id="surveyEndDate" class="form-control" value="${survey?.endDate ? survey.endDate.split('T')[0] : ''}" required>
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="surveyActive" ${survey?.active !== false ? 'checked' : ''}>
                            Encuesta activa
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
 * Manejar envío de encuesta
 */
async function handleSurveySubmit(e, surveyId) {
    e.preventDefault();
    
    if (!isAdmin) return;
    
    try {
        const options = document.getElementById('surveyOptions').value
            .split('\\n')
            .map(o => o.trim())
            .filter(o => o.length > 0);
        
        if (options.length < 2) {
            showNotification('Debe agregar al menos 2 opciones', 'error');
            return;
        }
        
        const data = {
            title: document.getElementById('surveyTitle').value,
            description: document.getElementById('surveyDescription').value,
            options: options,
            endDate: document.getElementById('surveyEndDate').value,
            active: document.getElementById('surveyActive').checked,
            results: surveyId ? undefined : options.map(() => 0),
            voters: surveyId ? undefined : [],
            totalVotes: surveyId ? undefined : 0,
            updatedAt: new Date().toISOString()
        };
        
        if (surveyId) {
            await firebase.firestore().collection('citizen_surveys').doc(surveyId).update(data);
            showNotification('✅ Encuesta actualizada', 'success');
        } else {
            data.createdAt = new Date().toISOString();
            data.createdBy = currentUser.email;
            await firebase.firestore().collection('citizen_surveys').add(data);
            showNotification('✅ Encuesta creada', 'success');
        }
        
        document.querySelector('.modal').remove();
        await loadAllSurveys();
        
        // Recargar en portal público
        if (typeof CitizenParticipation !== 'undefined' && CitizenParticipation.init) {
            await CitizenParticipation.init();
        }
    } catch (error) {
        console.error('❌ Error guardando encuesta:', error);
        showNotification('Error al guardar', 'error');
    }
}

/**
 * Abrir editor de sugerencia
 */
function openSuggestionEditor(suggestionId) {
    if (!isAdmin) return;
    
    const suggestion = allSuggestions.find(s => s.id === suggestionId);
    if (!suggestion) return;
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 700px;">
            <div class="modal-header">
                <h2>Responder Sugerencia</h2>
                <button class="close-modal" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="suggestion-display">
                    <h4>${escapeHtml(suggestion.title)}</h4>
                    <p><strong>Categoría:</strong> ${getCategoryName(suggestion.category)}</p>
                    <p><strong>Usuario:</strong> ${escapeHtml(suggestion.userEmail)}</p>
                    <p><strong>Descripción:</strong></p>
                    <p>${escapeHtml(suggestion.description)}</p>
                </div>
                <form id="suggestionResponseForm" onsubmit="handleSuggestionResponse(event, '${suggestionId}')">
                    <div class="form-group">
                        <label>Estado:</label>
                        <select id="suggestionStatus" class="form-control" required>
                            <option value="pending" ${suggestion.status === 'pending' ? 'selected' : ''}>Pendiente</option>
                            <option value="reviewing" ${suggestion.status === 'reviewing' ? 'selected' : ''}>En Revisión</option>
                            <option value="accepted" ${suggestion.status === 'accepted' ? 'selected' : ''}>Aceptada</option>
                            <option value="rejected" ${suggestion.status === 'rejected' ? 'selected' : ''}>Rechazada</option>
                            <option value="implemented" ${suggestion.status === 'implemented' ? 'selected' : ''}>Implementada</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Respuesta del Ayuntamiento:</label>
                        <textarea id="suggestionResponse" class="form-control" rows="5" required>${suggestion.response || ''}</textarea>
                    </div>
                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-save"></i> Guardar Respuesta
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
 * Manejar respuesta a sugerencia
 */
async function handleSuggestionResponse(e, suggestionId) {
    e.preventDefault();
    
    if (!isAdmin) return;
    
    try {
        const data = {
            status: document.getElementById('suggestionStatus').value,
            response: document.getElementById('suggestionResponse').value,
            respondedAt: new Date().toISOString(),
            respondedBy: currentUser.email,
            updatedAt: new Date().toISOString()
        };
        
        await firebase.firestore().collection('citizen_suggestions').doc(suggestionId).update(data);
        
        showNotification('✅ Respuesta guardada correctamente', 'success');
        
        document.querySelector('.modal').remove();
        await loadAllSuggestions();
        
        // Notificar al usuario (opcional)
        // Aquí se podría enviar email al usuario
    } catch (error) {
        console.error('❌ Error guardando respuesta:', error);
        showNotification('Error al guardar', 'error');
    }
}

/**
 * Filtrar sugerencias
 */
function filterSuggestions() {
    renderSuggestionsList();
}

/**
 * Actualizar sugerencias
 */
function refreshSuggestions() {
    loadAllSuggestions();
}

/**
 * Eliminar encuesta
 */
async function deleteSurvey(id) {
    if (!isAdmin || !confirm('¿Eliminar esta encuesta?')) return;
    
    try {
        await firebase.firestore().collection('citizen_surveys').doc(id).delete();
        showNotification('✅ Encuesta eliminada', 'success');
        await loadAllSurveys();
    } catch (error) {
        console.error('❌ Error eliminando:', error);
        showNotification('Error al eliminar', 'error');
    }
}

/**
 * Eliminar sugerencia
 */
async function deleteSuggestion(id) {
    if (!isAdmin || !confirm('¿Eliminar esta sugerencia?')) return;
    
    try {
        await firebase.firestore().collection('citizen_suggestions').doc(id).delete();
        showNotification('✅ Sugerencia eliminada', 'success');
        await loadAllSuggestions();
    } catch (error) {
        console.error('❌ Error eliminando:', error);
        showNotification('Error al eliminar', 'error');
    }
}

/**
 * Obtener nombre de categoría
 */
function getCategoryName(category) {
    const map = {
        'infrastructure': 'Infraestructura',
        'services': 'Servicios',
        'environment': 'Medio Ambiente',
        'culture': 'Cultura',
        'safety': 'Seguridad',
        'other': 'Otros'
    };
    return map[category] || 'Otros';
}

/**
 * Obtener texto de estado
 */
function getStatusText(status) {
    const map = {
        'pending': 'Pendiente',
        'reviewing': 'En Revisión',
        'accepted': 'Aceptada',
        'rejected': 'Rechazada',
        'implemented': 'Implementada'
    };
    return map[status] || 'Pendiente';
}

// Cargar datos cuando se abre la pestaña
document.addEventListener('DOMContentLoaded', function() {
    const participationTab = document.getElementById('participation-admin-tab');
    if (participationTab) {
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                    const isVisible = participationTab.style.display !== 'none';
                    if (isVisible && isAdmin) {
                        loadAllSurveys();
                        loadAllSuggestions();
                    }
                }
            });
        });
        observer.observe(participationTab, { attributes: true });
    }
});
