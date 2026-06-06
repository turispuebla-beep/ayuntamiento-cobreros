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

// ===== PARTICIPACIÓN CIUDADANA =====
// Sistema de encuestas municipales y sugerencias ciudadanas

const CitizenParticipation = {
    // Datos
    surveys: [],
    suggestions: [],
    userSuggestions: [],
    
    // Configuración de visibilidad
    config: {
        moduleEnabled: true,
        surveysEnabled: true,
        suggestionsEnabled: true
    },
    
    /**
     * Cargar configuración de visibilidad
     */
    loadConfig() {
        try {
            const saved = localStorage.getItem('participationSettings');
            if (saved) {
                this.config = { ...this.config, ...JSON.parse(saved) };
            }
        } catch (error) {
            console.error('❌ Error cargando configuración:', error);
        }
    },
    
    /**
     * Inicializar sistema de participación ciudadana
     */
    async init() {
        console.log('🗳️ Inicializando Participación Ciudadana...');
        try {
            this.loadConfig();
            
            // Verificar si el módulo está habilitado
            if (!this.config.moduleEnabled) {
                this.hideModule();
                return;
            }
            
            if (this.config.surveysEnabled) {
                await this.loadSurveys();
            }
            if (this.config.suggestionsEnabled && currentUser) {
                await this.loadUserSuggestions();
            }
            this.renderCitizenParticipation();
        } catch (error) {
            console.error('❌ Error inicializando Participación Ciudadana:', error);
            const container = document.getElementById('citizenParticipationContent');
            if (container) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #f59e0b; margin-bottom: 1rem;"></i>
                        <p>Error al cargar la participación ciudadana. Por favor, inténtelo de nuevo más tarde.</p>
                    </div>
                `;
            }
        }
    },
    
    /**
     * Ocultar módulo completo
     */
    hideModule() {
        const container = document.getElementById('citizenParticipationContent');
        const section = document.getElementById('participacion');
        if (container) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-lock" style="font-size: 3rem; color: #ccc; margin-bottom: 1rem;"></i>
                    <p>El módulo de Participación Ciudadana no está disponible actualmente.</p>
                </div>
            `;
        }
        // Ocultar enlace del menú si está deshabilitado
        if (section) {
            const navLink = document.querySelector('a[href="#participacion"]');
            if (navLink && !this.config.moduleEnabled) {
                navLink.style.display = 'none';
            } else if (navLink) {
                navLink.style.display = '';
            }
        }
    },
    
    /**
     * Cargar encuestas activas
     */
    async loadSurveys() {
        try {
            const surveysRef = firebase.firestore().collection('citizen_surveys')
                .where('active', '==', true);
            
            const snapshot = await surveysRef.get();
            this.surveys = snapshot.docs
                .map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }))
                .sort((a, b) => {
                    // Ordenar por fecha de fin descendente
                    return new Date(b.endDate || 0) - new Date(a.endDate || 0);
                })
                .slice(0, 10); // Limitar a 10
            
            console.log(`✅ ${this.surveys.length} encuestas activas cargadas`);
        } catch (error) {
            console.error('❌ Error cargando encuestas:', error);
            const saved = localStorage.getItem('citizen_surveys');
            if (saved) {
                this.surveys = JSON.parse(saved);
            }
        }
    },
    
    /**
     * Cargar sugerencias del usuario
     */
    async loadUserSuggestions() {
        if (!currentUser || !currentUser.email) {
            this.userSuggestions = [];
            return;
        }
        
        try {
            const suggestionsRef = firebase.firestore().collection('citizen_suggestions')
                .where('userEmail', '==', currentUser.email);
            
            const snapshot = await suggestionsRef.get();
            this.userSuggestions = snapshot.docs
                .map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }))
                .sort((a, b) => {
                    // Ordenar por fecha de creación descendente
                    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
                });
            
            console.log(`✅ ${this.userSuggestions.length} sugerencias del usuario cargadas`);
        } catch (error) {
            console.error('❌ Error cargando sugerencias:', error);
        }
    },
    
    /**
     * Renderizar interfaz de participación
     */
    renderCitizenParticipation() {
        const container = document.getElementById('citizenParticipationContent');
        if (!container) return;
        
        // Verificar configuración
        if (!this.config.moduleEnabled) {
            this.hideModule();
            return;
        }
        
        // Determinar qué pestañas mostrar
        const showSurveys = this.config.surveysEnabled;
        const showSuggestions = this.config.suggestionsEnabled;
        
        if (!showSurveys && !showSuggestions) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-info-circle" style="font-size: 3rem; color: #ccc; margin-bottom: 1rem;"></i>
                    <p>Las funcionalidades de participación ciudadana no están habilitadas actualmente.</p>
                </div>
            `;
            return;
        }
        
        // Si solo hay una opción, no mostrar pestañas
        if (showSurveys && !showSuggestions) {
            container.innerHTML = `
                <div class="citizen-participation">
                    <div class="participation-content">
                        <div id="participation-surveys" class="participation-tab-content active">
                            ${this.renderSurveys()}
                        </div>
                    </div>
                </div>
            `;
            return;
        }
        
        if (showSuggestions && !showSurveys) {
            container.innerHTML = `
                <div class="citizen-participation">
                    <div class="participation-content">
                        <div id="participation-suggestions" class="participation-tab-content active">
                            ${this.renderSuggestions()}
                        </div>
                    </div>
                </div>
            `;
            return;
        }
        
        // Ambas opciones habilitadas - mostrar pestañas
        container.innerHTML = `
            <div class="citizen-participation">
                <div class="participation-tabs">
                    ${showSurveys ? `
                        <button class="participation-tab-btn active" onclick="CitizenParticipation.showTab('surveys')">
                            📊 Encuestas Municipales
                        </button>
                    ` : ''}
                    ${showSuggestions ? `
                        <button class="participation-tab-btn ${!showSurveys ? 'active' : ''}" onclick="CitizenParticipation.showTab('suggestions')">
                            💡 Sugerencias
                        </button>
                    ` : ''}
                </div>
                
                <div class="participation-content">
                    ${showSurveys ? `
                        <div id="participation-surveys" class="participation-tab-content active">
                            ${this.renderSurveys()}
                        </div>
                    ` : ''}
                    ${showSuggestions ? `
                        <div id="participation-suggestions" class="participation-tab-content ${!showSurveys ? 'active' : ''}">
                            ${this.renderSuggestions()}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    },
    
    /**
     * Renderizar encuestas
     */
    renderSurveys() {
        if (!this.config.surveysEnabled) {
            return `
                <div class="empty-state">
                    <i class="fas fa-info-circle" style="font-size: 3rem; color: #ccc; margin-bottom: 1rem;"></i>
                    <p>Las encuestas municipales no están disponibles actualmente.</p>
                </div>
            `;
        }
        
        if (this.surveys.length === 0) {
            return `
                <div class="empty-state">
                    <i class="fas fa-poll" style="font-size: 3rem; color: #ccc; margin-bottom: 1rem;"></i>
                    <p>No hay encuestas activas en este momento.</p>
                </div>
            `;
        }
        
        return `
            <div class="surveys-list">
                ${this.surveys.map(survey => this.renderSurveyCard(survey)).join('')}
            </div>
        `;
    },
    
    /**
     * Renderizar tarjeta de encuesta
     */
    renderSurveyCard(survey) {
        const isExpired = new Date(survey.endDate) < new Date();
        const hasVoted = survey.voters && currentUser && survey.voters.includes(currentUser.email);
        
        return `
            <div class="survey-card">
                <div class="card-header">
                    <h3>${escapeHtml(survey.title || 'Encuesta sin título')}</h3>
                    ${isExpired ? '<span class="badge badge-secondary">Finalizada</span>' : '<span class="badge badge-success">Activa</span>'}
                </div>
                <div class="card-body">
                    <p class="description">${escapeHtml(survey.description || '')}</p>
                    <div class="survey-info">
                        <div class="info-item">
                            <strong>Fecha fin:</strong>
                            <span>${formatDate(survey.endDate)}</span>
                        </div>
                        ${survey.totalVotes !== undefined ? `
                            <div class="info-item">
                                <strong>Votos:</strong>
                                <span>${survey.totalVotes}</span>
                            </div>
                        ` : ''}
                    </div>
                    ${!isExpired && !hasVoted && currentUser ? `
                        <button class="btn btn-primary" onclick="CitizenParticipation.openSurvey('${survey.id}')">
                            <i class="fas fa-vote-yea"></i> Participar
                        </button>
                    ` : hasVoted ? `
                        <p class="text-success"><i class="fas fa-check-circle"></i> Ya has participado en esta encuesta</p>
                    ` : !currentUser ? `
                        <button class="btn btn-outline" onclick="openModal('loginModal')">
                            <i class="fas fa-sign-in-alt"></i> Iniciar Sesión para Participar
                        </button>
                    ` : ''}
                    ${isExpired && survey.results ? `
                        <div class="survey-results">
                            <strong>Resultados:</strong>
                            ${this.renderSurveyResults(survey)}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    },
    
    /**
     * Renderizar resultados de encuesta
     */
    renderSurveyResults(survey) {
        if (!survey.options || !survey.results) return '';
        
        const totalVotes = survey.totalVotes || 1;
        
        return `
            <div class="results-list">
                ${survey.options.map((option, index) => {
                    const votes = survey.results[index] || 0;
                    const percentage = (votes / totalVotes) * 100;
                    return `
                        <div class="result-item">
                            <div class="result-label">
                                <span>${escapeHtml(option)}</span>
                                <span class="result-percentage">${percentage.toFixed(1)}%</span>
                            </div>
                            <div class="result-bar">
                                <div class="result-bar-fill" style="width: ${percentage}%"></div>
                            </div>
                            <div class="result-votes">${votes} votos</div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    },
    
    /**
     * Renderizar sugerencias
     */
    renderSuggestions() {
        if (!this.config.suggestionsEnabled) {
            return `
                <div class="empty-state">
                    <i class="fas fa-info-circle" style="font-size: 3rem; color: #ccc; margin-bottom: 1rem;"></i>
                    <p>Las sugerencias ciudadanas no están disponibles actualmente.</p>
                </div>
            `;
        }
        
        return `
            <div class="suggestions-section">
                ${currentUser ? `
                    <div class="suggestions-form-section">
                        <h3>Enviar una Sugerencia</h3>
                        <form id="suggestionForm" onsubmit="CitizenParticipation.handleSuggestionSubmit(event)">
                            <div class="form-group">
                                <label for="suggestionTitle">Título:</label>
                                <input type="text" id="suggestionTitle" class="form-control" required>
                            </div>
                            <div class="form-group">
                                <label for="suggestionCategory">Categoría:</label>
                                <select id="suggestionCategory" class="form-control" required>
                                    <option value="">Seleccione una categoría</option>
                                    <option value="infrastructure">Infraestructura</option>
                                    <option value="services">Servicios Municipales</option>
                                    <option value="environment">Medio Ambiente</option>
                                    <option value="culture">Cultura y Ocio</option>
                                    <option value="safety">Seguridad</option>
                                    <option value="other">Otros</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="suggestionDescription">Descripción:</label>
                                <textarea id="suggestionDescription" class="form-control" rows="5" required></textarea>
                            </div>
                            <button type="submit" class="btn btn-primary">
                                <i class="fas fa-paper-plane"></i> Enviar Sugerencia
                            </button>
                        </form>
                    </div>
                    
                    <div class="my-suggestions-section">
                        <h3>Mis Sugerencias</h3>
                        ${this.renderUserSuggestions()}
                    </div>
                ` : `
                    <div class="login-prompt">
                        <i class="fas fa-lock" style="font-size: 3rem; color: #3b82f6; margin-bottom: 1rem;"></i>
                        <h3>Participación Ciudadana</h3>
                        <p>Para enviar sugerencias, debe iniciar sesión primero.</p>
                        <button class="btn btn-primary" onclick="openModal('loginModal')">
                            <i class="fas fa-sign-in-alt"></i> Iniciar Sesión
                        </button>
                    </div>
                `}
            </div>
        `;
    },
    
    /**
     * Renderizar sugerencias del usuario
     */
    renderUserSuggestions() {
        if (this.userSuggestions.length === 0) {
            return `
                <div class="empty-state">
                    <p>No has enviado sugerencias aún.</p>
                </div>
            `;
        }
        
        return `
            <div class="suggestions-list">
                ${this.userSuggestions.map(suggestion => `
                    <div class="suggestion-card">
                        <div class="card-header">
                            <h4>${escapeHtml(suggestion.title || 'Sin título')}</h4>
                            <span class="badge badge-${this.getCategoryBadgeClass(suggestion.category)}">
                                ${this.getCategoryName(suggestion.category)}
                            </span>
                        </div>
                        <div class="card-body">
                            <p>${escapeHtml(suggestion.description || '')}</p>
                            <div class="suggestion-status">
                                <strong>Estado:</strong>
                                <span class="status-${suggestion.status || 'pending'}">
                                    ${this.getStatusText(suggestion.status || 'pending')}
                                </span>
                            </div>
                            ${suggestion.response ? `
                                <div class="suggestion-response">
                                    <strong>Respuesta del Ayuntamiento:</strong>
                                    <p>${escapeHtml(suggestion.response)}</p>
                                </div>
                            ` : ''}
                        </div>
                        <div class="card-footer">
                            <small>Enviada: ${formatDate(suggestion.createdAt)}</small>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    },
    
    /**
     * Manejar envío de sugerencia
     */
    async handleSuggestionSubmit(e) {
        e.preventDefault();
        
        if (!currentUser || !currentUser.email) {
            showNotification('Debe iniciar sesión para enviar sugerencias', 'error');
            return;
        }
        
        const title = document.getElementById('suggestionTitle').value.trim();
        const category = document.getElementById('suggestionCategory').value;
        const description = document.getElementById('suggestionDescription').value.trim();
        
        if (!title || !category || !description) {
            showNotification('Por favor, complete todos los campos', 'error');
            return;
        }
        
        try {
            const suggestionData = {
                title,
                category,
                description,
                userEmail: currentUser.email,
                userName: currentUser.name || currentUser.email,
                status: 'pending',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            await firebase.firestore().collection('citizen_suggestions').add(suggestionData);
            
            showNotification('✅ Sugerencia enviada correctamente. Gracias por su participación.', 'success');
            
            // Limpiar formulario
            document.getElementById('suggestionForm').reset();
            
            // Recargar sugerencias
            await this.loadUserSuggestions();
            this.renderSuggestions();
        } catch (error) {
            console.error('❌ Error enviando sugerencia:', error);
            showNotification('Error al enviar la sugerencia. Inténtelo de nuevo.', 'error');
        }
    },
    
    /**
     * Abrir encuesta para votar
     */
    async openSurvey(surveyId) {
        const survey = this.surveys.find(s => s.id === surveyId);
        if (!survey) return;
        
        if (!currentUser || !currentUser.email) {
            showNotification('Debe iniciar sesión para participar', 'error');
            openModal('loginModal');
            return;
        }
        
        // Crear modal para votar
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h2>${escapeHtml(survey.title)}</h2>
                    <button class="close-modal" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <p>${escapeHtml(survey.description || '')}</p>
                    <form id="surveyVoteForm" onsubmit="CitizenParticipation.handleVote(event, '${surveyId}')">
                        ${survey.options.map((option, index) => `
                            <label class="radio-option">
                                <input type="radio" name="surveyOption" value="${index}" required>
                                <span>${escapeHtml(option)}</span>
                            </label>
                        `).join('')}
                        <div class="form-actions">
                            <button type="submit" class="btn btn-primary">
                                <i class="fas fa-vote-yea"></i> Votar
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
    },
    
    /**
     * Manejar voto en encuesta
     */
    async handleVote(e, surveyId) {
        e.preventDefault();
        
        const form = e.target;
        const selectedOption = form.querySelector('input[name="surveyOption"]:checked');
        
        if (!selectedOption) {
            showNotification('Por favor, seleccione una opción', 'error');
            return;
        }
        
        const optionIndex = parseInt(selectedOption.value);
        
        try {
            const surveyRef = firebase.firestore().collection('citizen_surveys').doc(surveyId);
            const surveyDoc = await surveyRef.get();
            const survey = surveyDoc.data();
            
            // Actualizar resultados
            const results = survey.results || survey.options.map(() => 0);
            results[optionIndex] = (results[optionIndex] || 0) + 1;
            
            // Agregar votante
            const voters = survey.voters || [];
            if (!voters.includes(currentUser.email)) {
                voters.push(currentUser.email);
            }
            
            await surveyRef.update({
                results,
                voters,
                totalVotes: (survey.totalVotes || 0) + 1,
                updatedAt: new Date().toISOString()
            });
            
            showNotification('✅ Voto registrado correctamente. Gracias por su participación.', 'success');
            
            // Cerrar modal
            document.querySelector('.modal').remove();
            
            // Recargar encuestas
            await this.loadSurveys();
            this.renderSurveys();
        } catch (error) {
            console.error('❌ Error registrando voto:', error);
            showNotification('Error al registrar el voto. Inténtelo de nuevo.', 'error');
        }
    },
    
    /**
     * Mostrar pestaña
     */
    showTab(tabName) {
        document.querySelectorAll('.participation-tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelectorAll('.participation-tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const tabContent = document.getElementById(`participation-${tabName}`);
        const tabBtn = document.querySelector(`[onclick*="showTab('${tabName}')"]`);
        
        if (tabContent) tabContent.classList.add('active');
        if (tabBtn) tabBtn.classList.add('active');
    },
    
    /**
     * Obtener clase de badge para categoría
     */
    getCategoryBadgeClass(category) {
        const map = {
            'infrastructure': 'primary',
            'services': 'info',
            'environment': 'success',
            'culture': 'warning',
            'safety': 'danger',
            'other': 'secondary'
        };
        return map[category] || 'secondary';
    },
    
    /**
     * Obtener nombre de categoría
     */
    getCategoryName(category) {
        const map = {
            'infrastructure': 'Infraestructura',
            'services': 'Servicios',
            'environment': 'Medio Ambiente',
            'culture': 'Cultura',
            'safety': 'Seguridad',
            'other': 'Otros'
        };
        return map[category] || 'Otros';
    },
    
    /**
     * Obtener texto de estado
     */
    getStatusText(status) {
        const map = {
            'pending': 'Pendiente',
            'reviewing': 'En Revisión',
            'accepted': 'Aceptada',
            'rejected': 'Rechazada',
            'implemented': 'Implementada'
        };
        return map[status] || 'Pendiente';
    }
};

// Exponer globalmente
if (typeof window !== 'undefined') {
    window.CitizenParticipation = CitizenParticipation;
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

// ===== PARTICIPACIÓN CIUDADANA =====
// Sistema de encuestas municipales y sugerencias ciudadanas

const CitizenParticipation = {
    // Datos
    surveys: [],
    suggestions: [],
    userSuggestions: [],
    
    // Configuración de visibilidad
    config: {
        moduleEnabled: true,
        surveysEnabled: true,
        suggestionsEnabled: true
    },
    
    /**
     * Cargar configuración de visibilidad
     */
    loadConfig() {
        try {
            const saved = localStorage.getItem('participationSettings');
            if (saved) {
                this.config = { ...this.config, ...JSON.parse(saved) };
            }
        } catch (error) {
            console.error('❌ Error cargando configuración:', error);
        }
    },
    
    /**
     * Inicializar sistema de participación ciudadana
     */
    async init() {
        console.log('🗳️ Inicializando Participación Ciudadana...');
        try {
            this.loadConfig();
            
            // Verificar si el módulo está habilitado
            if (!this.config.moduleEnabled) {
                this.hideModule();
                return;
            }
            
            if (this.config.surveysEnabled) {
                await this.loadSurveys();
            }
            if (this.config.suggestionsEnabled && currentUser) {
                await this.loadUserSuggestions();
            }
            this.renderCitizenParticipation();
        } catch (error) {
            console.error('❌ Error inicializando Participación Ciudadana:', error);
            const container = document.getElementById('citizenParticipationContent');
            if (container) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #f59e0b; margin-bottom: 1rem;"></i>
                        <p>Error al cargar la participación ciudadana. Por favor, inténtelo de nuevo más tarde.</p>
                    </div>
                `;
            }
        }
    },
    
    /**
     * Ocultar módulo completo
     */
    hideModule() {
        const container = document.getElementById('citizenParticipationContent');
        const section = document.getElementById('participacion');
        if (container) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-lock" style="font-size: 3rem; color: #ccc; margin-bottom: 1rem;"></i>
                    <p>El módulo de Participación Ciudadana no está disponible actualmente.</p>
                </div>
            `;
        }
        // Ocultar enlace del menú si está deshabilitado
        if (section) {
            const navLink = document.querySelector('a[href="#participacion"]');
            if (navLink && !this.config.moduleEnabled) {
                navLink.style.display = 'none';
            } else if (navLink) {
                navLink.style.display = '';
            }
        }
    },
    
    /**
     * Cargar encuestas activas
     */
    async loadSurveys() {
        try {
            const surveysRef = firebase.firestore().collection('citizen_surveys')
                .where('active', '==', true);
            
            const snapshot = await surveysRef.get();
            this.surveys = snapshot.docs
                .map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }))
                .sort((a, b) => {
                    // Ordenar por fecha de fin descendente
                    return new Date(b.endDate || 0) - new Date(a.endDate || 0);
                })
                .slice(0, 10); // Limitar a 10
            
            console.log(`✅ ${this.surveys.length} encuestas activas cargadas`);
        } catch (error) {
            console.error('❌ Error cargando encuestas:', error);
            const saved = localStorage.getItem('citizen_surveys');
            if (saved) {
                this.surveys = JSON.parse(saved);
            }
        }
    },
    
    /**
     * Cargar sugerencias del usuario
     */
    async loadUserSuggestions() {
        if (!currentUser || !currentUser.email) {
            this.userSuggestions = [];
            return;
        }
        
        try {
            const suggestionsRef = firebase.firestore().collection('citizen_suggestions')
                .where('userEmail', '==', currentUser.email);
            
            const snapshot = await suggestionsRef.get();
            this.userSuggestions = snapshot.docs
                .map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }))
                .sort((a, b) => {
                    // Ordenar por fecha de creación descendente
                    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
                });
            
            console.log(`✅ ${this.userSuggestions.length} sugerencias del usuario cargadas`);
        } catch (error) {
            console.error('❌ Error cargando sugerencias:', error);
        }
    },
    
    /**
     * Renderizar interfaz de participación
     */
    renderCitizenParticipation() {
        const container = document.getElementById('citizenParticipationContent');
        if (!container) return;
        
        // Verificar configuración
        if (!this.config.moduleEnabled) {
            this.hideModule();
            return;
        }
        
        // Determinar qué pestañas mostrar
        const showSurveys = this.config.surveysEnabled;
        const showSuggestions = this.config.suggestionsEnabled;
        
        if (!showSurveys && !showSuggestions) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-info-circle" style="font-size: 3rem; color: #ccc; margin-bottom: 1rem;"></i>
                    <p>Las funcionalidades de participación ciudadana no están habilitadas actualmente.</p>
                </div>
            `;
            return;
        }
        
        // Si solo hay una opción, no mostrar pestañas
        if (showSurveys && !showSuggestions) {
            container.innerHTML = `
                <div class="citizen-participation">
                    <div class="participation-content">
                        <div id="participation-surveys" class="participation-tab-content active">
                            ${this.renderSurveys()}
                        </div>
                    </div>
                </div>
            `;
            return;
        }
        
        if (showSuggestions && !showSurveys) {
            container.innerHTML = `
                <div class="citizen-participation">
                    <div class="participation-content">
                        <div id="participation-suggestions" class="participation-tab-content active">
                            ${this.renderSuggestions()}
                        </div>
                    </div>
                </div>
            `;
            return;
        }
        
        // Ambas opciones habilitadas - mostrar pestañas
        container.innerHTML = `
            <div class="citizen-participation">
                <div class="participation-tabs">
                    ${showSurveys ? `
                        <button class="participation-tab-btn active" onclick="CitizenParticipation.showTab('surveys')">
                            📊 Encuestas Municipales
                        </button>
                    ` : ''}
                    ${showSuggestions ? `
                        <button class="participation-tab-btn ${!showSurveys ? 'active' : ''}" onclick="CitizenParticipation.showTab('suggestions')">
                            💡 Sugerencias
                        </button>
                    ` : ''}
                </div>
                
                <div class="participation-content">
                    ${showSurveys ? `
                        <div id="participation-surveys" class="participation-tab-content active">
                            ${this.renderSurveys()}
                        </div>
                    ` : ''}
                    ${showSuggestions ? `
                        <div id="participation-suggestions" class="participation-tab-content ${!showSurveys ? 'active' : ''}">
                            ${this.renderSuggestions()}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    },
    
    /**
     * Renderizar encuestas
     */
    renderSurveys() {
        if (!this.config.surveysEnabled) {
            return `
                <div class="empty-state">
                    <i class="fas fa-info-circle" style="font-size: 3rem; color: #ccc; margin-bottom: 1rem;"></i>
                    <p>Las encuestas municipales no están disponibles actualmente.</p>
                </div>
            `;
        }
        
        if (this.surveys.length === 0) {
            return `
                <div class="empty-state">
                    <i class="fas fa-poll" style="font-size: 3rem; color: #ccc; margin-bottom: 1rem;"></i>
                    <p>No hay encuestas activas en este momento.</p>
                </div>
            `;
        }
        
        return `
            <div class="surveys-list">
                ${this.surveys.map(survey => this.renderSurveyCard(survey)).join('')}
            </div>
        `;
    },
    
    /**
     * Renderizar tarjeta de encuesta
     */
    renderSurveyCard(survey) {
        const isExpired = new Date(survey.endDate) < new Date();
        const hasVoted = survey.voters && currentUser && survey.voters.includes(currentUser.email);
        
        return `
            <div class="survey-card">
                <div class="card-header">
                    <h3>${escapeHtml(survey.title || 'Encuesta sin título')}</h3>
                    ${isExpired ? '<span class="badge badge-secondary">Finalizada</span>' : '<span class="badge badge-success">Activa</span>'}
                </div>
                <div class="card-body">
                    <p class="description">${escapeHtml(survey.description || '')}</p>
                    <div class="survey-info">
                        <div class="info-item">
                            <strong>Fecha fin:</strong>
                            <span>${formatDate(survey.endDate)}</span>
                        </div>
                        ${survey.totalVotes !== undefined ? `
                            <div class="info-item">
                                <strong>Votos:</strong>
                                <span>${survey.totalVotes}</span>
                            </div>
                        ` : ''}
                    </div>
                    ${!isExpired && !hasVoted && currentUser ? `
                        <button class="btn btn-primary" onclick="CitizenParticipation.openSurvey('${survey.id}')">
                            <i class="fas fa-vote-yea"></i> Participar
                        </button>
                    ` : hasVoted ? `
                        <p class="text-success"><i class="fas fa-check-circle"></i> Ya has participado en esta encuesta</p>
                    ` : !currentUser ? `
                        <button class="btn btn-outline" onclick="openModal('loginModal')">
                            <i class="fas fa-sign-in-alt"></i> Iniciar Sesión para Participar
                        </button>
                    ` : ''}
                    ${isExpired && survey.results ? `
                        <div class="survey-results">
                            <strong>Resultados:</strong>
                            ${this.renderSurveyResults(survey)}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    },
    
    /**
     * Renderizar resultados de encuesta
     */
    renderSurveyResults(survey) {
        if (!survey.options || !survey.results) return '';
        
        const totalVotes = survey.totalVotes || 1;
        
        return `
            <div class="results-list">
                ${survey.options.map((option, index) => {
                    const votes = survey.results[index] || 0;
                    const percentage = (votes / totalVotes) * 100;
                    return `
                        <div class="result-item">
                            <div class="result-label">
                                <span>${escapeHtml(option)}</span>
                                <span class="result-percentage">${percentage.toFixed(1)}%</span>
                            </div>
                            <div class="result-bar">
                                <div class="result-bar-fill" style="width: ${percentage}%"></div>
                            </div>
                            <div class="result-votes">${votes} votos</div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    },
    
    /**
     * Renderizar sugerencias
     */
    renderSuggestions() {
        if (!this.config.suggestionsEnabled) {
            return `
                <div class="empty-state">
                    <i class="fas fa-info-circle" style="font-size: 3rem; color: #ccc; margin-bottom: 1rem;"></i>
                    <p>Las sugerencias ciudadanas no están disponibles actualmente.</p>
                </div>
            `;
        }
        
        return `
            <div class="suggestions-section">
                ${currentUser ? `
                    <div class="suggestions-form-section">
                        <h3>Enviar una Sugerencia</h3>
                        <form id="suggestionForm" onsubmit="CitizenParticipation.handleSuggestionSubmit(event)">
                            <div class="form-group">
                                <label for="suggestionTitle">Título:</label>
                                <input type="text" id="suggestionTitle" class="form-control" required>
                            </div>
                            <div class="form-group">
                                <label for="suggestionCategory">Categoría:</label>
                                <select id="suggestionCategory" class="form-control" required>
                                    <option value="">Seleccione una categoría</option>
                                    <option value="infrastructure">Infraestructura</option>
                                    <option value="services">Servicios Municipales</option>
                                    <option value="environment">Medio Ambiente</option>
                                    <option value="culture">Cultura y Ocio</option>
                                    <option value="safety">Seguridad</option>
                                    <option value="other">Otros</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="suggestionDescription">Descripción:</label>
                                <textarea id="suggestionDescription" class="form-control" rows="5" required></textarea>
                            </div>
                            <button type="submit" class="btn btn-primary">
                                <i class="fas fa-paper-plane"></i> Enviar Sugerencia
                            </button>
                        </form>
                    </div>
                    
                    <div class="my-suggestions-section">
                        <h3>Mis Sugerencias</h3>
                        ${this.renderUserSuggestions()}
                    </div>
                ` : `
                    <div class="login-prompt">
                        <i class="fas fa-lock" style="font-size: 3rem; color: #3b82f6; margin-bottom: 1rem;"></i>
                        <h3>Participación Ciudadana</h3>
                        <p>Para enviar sugerencias, debe iniciar sesión primero.</p>
                        <button class="btn btn-primary" onclick="openModal('loginModal')">
                            <i class="fas fa-sign-in-alt"></i> Iniciar Sesión
                        </button>
                    </div>
                `}
            </div>
        `;
    },
    
    /**
     * Renderizar sugerencias del usuario
     */
    renderUserSuggestions() {
        if (this.userSuggestions.length === 0) {
            return `
                <div class="empty-state">
                    <p>No has enviado sugerencias aún.</p>
                </div>
            `;
        }
        
        return `
            <div class="suggestions-list">
                ${this.userSuggestions.map(suggestion => `
                    <div class="suggestion-card">
                        <div class="card-header">
                            <h4>${escapeHtml(suggestion.title || 'Sin título')}</h4>
                            <span class="badge badge-${this.getCategoryBadgeClass(suggestion.category)}">
                                ${this.getCategoryName(suggestion.category)}
                            </span>
                        </div>
                        <div class="card-body">
                            <p>${escapeHtml(suggestion.description || '')}</p>
                            <div class="suggestion-status">
                                <strong>Estado:</strong>
                                <span class="status-${suggestion.status || 'pending'}">
                                    ${this.getStatusText(suggestion.status || 'pending')}
                                </span>
                            </div>
                            ${suggestion.response ? `
                                <div class="suggestion-response">
                                    <strong>Respuesta del Ayuntamiento:</strong>
                                    <p>${escapeHtml(suggestion.response)}</p>
                                </div>
                            ` : ''}
                        </div>
                        <div class="card-footer">
                            <small>Enviada: ${formatDate(suggestion.createdAt)}</small>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    },
    
    /**
     * Manejar envío de sugerencia
     */
    async handleSuggestionSubmit(e) {
        e.preventDefault();
        
        if (!currentUser || !currentUser.email) {
            showNotification('Debe iniciar sesión para enviar sugerencias', 'error');
            return;
        }
        
        const title = document.getElementById('suggestionTitle').value.trim();
        const category = document.getElementById('suggestionCategory').value;
        const description = document.getElementById('suggestionDescription').value.trim();
        
        if (!title || !category || !description) {
            showNotification('Por favor, complete todos los campos', 'error');
            return;
        }
        
        try {
            const suggestionData = {
                title,
                category,
                description,
                userEmail: currentUser.email,
                userName: currentUser.name || currentUser.email,
                status: 'pending',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            await firebase.firestore().collection('citizen_suggestions').add(suggestionData);
            
            showNotification('✅ Sugerencia enviada correctamente. Gracias por su participación.', 'success');
            
            // Limpiar formulario
            document.getElementById('suggestionForm').reset();
            
            // Recargar sugerencias
            await this.loadUserSuggestions();
            this.renderSuggestions();
        } catch (error) {
            console.error('❌ Error enviando sugerencia:', error);
            showNotification('Error al enviar la sugerencia. Inténtelo de nuevo.', 'error');
        }
    },
    
    /**
     * Abrir encuesta para votar
     */
    async openSurvey(surveyId) {
        const survey = this.surveys.find(s => s.id === surveyId);
        if (!survey) return;
        
        if (!currentUser || !currentUser.email) {
            showNotification('Debe iniciar sesión para participar', 'error');
            openModal('loginModal');
            return;
        }
        
        // Crear modal para votar
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h2>${escapeHtml(survey.title)}</h2>
                    <button class="close-modal" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <p>${escapeHtml(survey.description || '')}</p>
                    <form id="surveyVoteForm" onsubmit="CitizenParticipation.handleVote(event, '${surveyId}')">
                        ${survey.options.map((option, index) => `
                            <label class="radio-option">
                                <input type="radio" name="surveyOption" value="${index}" required>
                                <span>${escapeHtml(option)}</span>
                            </label>
                        `).join('')}
                        <div class="form-actions">
                            <button type="submit" class="btn btn-primary">
                                <i class="fas fa-vote-yea"></i> Votar
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
    },
    
    /**
     * Manejar voto en encuesta
     */
    async handleVote(e, surveyId) {
        e.preventDefault();
        
        const form = e.target;
        const selectedOption = form.querySelector('input[name="surveyOption"]:checked');
        
        if (!selectedOption) {
            showNotification('Por favor, seleccione una opción', 'error');
            return;
        }
        
        const optionIndex = parseInt(selectedOption.value);
        
        try {
            const surveyRef = firebase.firestore().collection('citizen_surveys').doc(surveyId);
            const surveyDoc = await surveyRef.get();
            const survey = surveyDoc.data();
            
            // Actualizar resultados
            const results = survey.results || survey.options.map(() => 0);
            results[optionIndex] = (results[optionIndex] || 0) + 1;
            
            // Agregar votante
            const voters = survey.voters || [];
            if (!voters.includes(currentUser.email)) {
                voters.push(currentUser.email);
            }
            
            await surveyRef.update({
                results,
                voters,
                totalVotes: (survey.totalVotes || 0) + 1,
                updatedAt: new Date().toISOString()
            });
            
            showNotification('✅ Voto registrado correctamente. Gracias por su participación.', 'success');
            
            // Cerrar modal
            document.querySelector('.modal').remove();
            
            // Recargar encuestas
            await this.loadSurveys();
            this.renderSurveys();
        } catch (error) {
            console.error('❌ Error registrando voto:', error);
            showNotification('Error al registrar el voto. Inténtelo de nuevo.', 'error');
        }
    },
    
    /**
     * Mostrar pestaña
     */
    showTab(tabName) {
        document.querySelectorAll('.participation-tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelectorAll('.participation-tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const tabContent = document.getElementById(`participation-${tabName}`);
        const tabBtn = document.querySelector(`[onclick*="showTab('${tabName}')"]`);
        
        if (tabContent) tabContent.classList.add('active');
        if (tabBtn) tabBtn.classList.add('active');
    },
    
    /**
     * Obtener clase de badge para categoría
     */
    getCategoryBadgeClass(category) {
        const map = {
            'infrastructure': 'primary',
            'services': 'info',
            'environment': 'success',
            'culture': 'warning',
            'safety': 'danger',
            'other': 'secondary'
        };
        return map[category] || 'secondary';
    },
    
    /**
     * Obtener nombre de categoría
     */
    getCategoryName(category) {
        const map = {
            'infrastructure': 'Infraestructura',
            'services': 'Servicios',
            'environment': 'Medio Ambiente',
            'culture': 'Cultura',
            'safety': 'Seguridad',
            'other': 'Otros'
        };
        return map[category] || 'Otros';
    },
    
    /**
     * Obtener texto de estado
     */
    getStatusText(status) {
        const map = {
            'pending': 'Pendiente',
            'reviewing': 'En Revisión',
            'accepted': 'Aceptada',
            'rejected': 'Rechazada',
            'implemented': 'Implementada'
        };
        return map[status] || 'Pendiente';
    }
};

// Exponer globalmente
if (typeof window !== 'undefined') {
    window.CitizenParticipation = CitizenParticipation;
}
