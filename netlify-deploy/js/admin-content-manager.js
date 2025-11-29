// ===== GESTOR DE CONTENIDO DESDE ADMIN =====
// Sistema para gestionar todo el contenido desde el panel de administración
// con persistencia en Firestore

const AdminContentManager = {
    /**
     * Inicializa el gestor de contenido
     */
    init() {
        this.setupAdminTabs();
        this.loadAllContent();
    },

    /**
     * Configura las nuevas pestañas del panel admin
     */
    setupAdminTabs() {
        // Las pestañas se agregan al HTML del modal admin
        // Este método se puede usar para inicializar funcionalidades
    },

    /**
     * Carga todo el contenido desde Firestore
     */
    async loadAllContent() {
        try {
            await Promise.all([
                this.loadBanners(),
                this.loadAboutSection(),
                this.loadTimelineEvents(),
                this.loadTranslations(),
                this.loadCalendarEvents(),
                this.loadWeatherConfig(),
                this.loadTransparencyData(),
                this.loadServicesData()
            ]);
        } catch (error) {
            console.error('[AdminContentManager] Error cargando contenido:', error);
        }
    },

    /**
     * ===== GESTIÓN DE BANNERS =====
     */
    async loadBanners() {
        try {
            if (!window.firebase?.firestore) return;

            const db = window.firebase.firestore();
            // Primero obtener todos los banners activos, luego ordenar en memoria
            // porque orderBy requiere un índice en Firestore cuando se combina con where
            const snapshot = await db.collection('banners')
                .where('activo', '==', true)
                .get();

            const banners = [];
            snapshot.forEach(doc => {
                banners.push({ id: doc.id, ...doc.data() });
            });

            // Ordenar en memoria por el campo 'orden'
            banners.sort((a, b) => {
                const ordenA = a.orden || 0;
                const ordenB = b.orden || 0;
                return ordenA - ordenB;
            });

            // Actualizar banner rotativo
            if (window.BannerRotativo) {
                window.BannerRotativo.init(banners);
            }

            return banners;
        } catch (error) {
            console.error('[AdminContentManager] Error cargando banners:', error);
            return [];
        }
    },

    async saveBanner(bannerData) {
        try {
            if (!window.firebase?.firestore) {
                throw new Error('Firebase no está disponible');
            }

            const db = window.firebase.firestore();
            const bannersRef = db.collection('banners');

            if (bannerData.id) {
                // Actualizar
                await bannersRef.doc(bannerData.id).update({
                    ...bannerData,
                    actualizado: new Date(),
                    actualizadoPor: this.getCurrentAdminId()
                });
            } else {
                // Crear nuevo
                const maxOrden = await this.getMaxBannerOrden();
                await bannersRef.add({
                    ...bannerData,
                    orden: maxOrden + 1,
                    activo: true,
                    creado: new Date(),
                    creadoPor: this.getCurrentAdminId()
                });
            }

            // Recargar banners
            await this.loadBanners();
            
            if (typeof showNotification === 'function') {
                showNotification('Banner guardado correctamente', 'success');
            }

            return true;
        } catch (error) {
            console.error('[AdminContentManager] Error guardando banner:', error);
            if (typeof showNotification === 'function') {
                showNotification('Error al guardar el banner', 'error');
            }
            return false;
        }
    },

    async deleteBanner(bannerId) {
        try {
            if (!window.firebase?.firestore) return false;

            const db = window.firebase.firestore();
            await db.collection('banners').doc(bannerId).update({
                activo: false,
                eliminado: new Date()
            });

            await this.loadBanners();
            
            if (typeof showNotification === 'function') {
                showNotification('Banner eliminado', 'success');
            }

            return true;
        } catch (error) {
            console.error('[AdminContentManager] Error eliminando banner:', error);
            return false;
        }
    },

    async getMaxBannerOrden() {
        try {
            const db = window.firebase.firestore();
            let snapshot;
            try {
                snapshot = await db.collection('banners')
                    .orderBy('orden', 'desc')
                    .limit(1)
                    .get();
            } catch (orderByError) {
                // Si orderBy falla, obtener todos y encontrar el máximo
                snapshot = await db.collection('banners').get();
            }

            if (snapshot.empty) return 0;
            
            if (snapshot.docs.length === 1) {
                return snapshot.docs[0].data().orden || 0;
            } else {
                // Si hay múltiples, encontrar el máximo
                let maxOrden = 0;
                snapshot.forEach(doc => {
                    const orden = doc.data().orden || 0;
                    if (orden > maxOrden) maxOrden = orden;
                });
                return maxOrden;
            }
        } catch (error) {
            return 0;
        }
    },

    /**
     * ===== GESTIÓN DE SECCIÓN "SOBRE EL AYUNTAMIENTO" =====
     */
    async loadAboutSection() {
        try {
            if (!window.firebase?.firestore) return null;

            const db = window.firebase.firestore();
            const doc = await db.collection('config').doc('aboutSection').get();

            if (doc.exists) {
                const data = doc.data();
                this.renderAboutSection(data);
                return data;
            }

            return null;
        } catch (error) {
            console.error('[AdminContentManager] Error cargando sección sobre:', error);
            return null;
        }
    },

    async saveAboutSection(data) {
        try {
            if (!window.firebase?.firestore) return false;

            const db = window.firebase.firestore();
            await db.collection('config').doc('aboutSection').set({
                ...data,
                actualizado: new Date(),
                actualizadoPor: this.getCurrentAdminId()
            }, { merge: true });

            await this.loadAboutSection();
            
            if (typeof showNotification === 'function') {
                showNotification('Sección "Sobre el Ayuntamiento" guardada', 'success');
            }

            return true;
        } catch (error) {
            console.error('[AdminContentManager] Error guardando sección sobre:', error);
            return false;
        }
    },

    renderAboutSection(data) {
        // Renderizar en la sección correspondiente del HTML
        const section = document.getElementById('sobre-ayuntamiento');
        if (!section || !data) return;

        if (data.historia) {
            const historiaEl = section.querySelector('#historia-content');
            if (historiaEl) historiaEl.innerHTML = data.historia;
        }

        if (data.organigrama) {
            const orgEl = section.querySelector('#organigrama-content');
            if (orgEl) orgEl.innerHTML = this.renderOrganigrama(data.organigrama);
        }

        if (data.pleno) {
            const plenoEl = section.querySelector('#pleno-content');
            if (plenoEl) plenoEl.innerHTML = this.renderPleno(data.pleno);
        }

        if (data.comisiones) {
            const comisionesEl = section.querySelector('#comisiones-content');
            if (comisionesEl) comisionesEl.innerHTML = this.renderComisiones(data.comisiones);
        }
    },

    renderOrganigrama(organigrama) {
        if (!Array.isArray(organigrama)) return '';
        
        return `
            <div class="organigrama-tree">
                ${organigrama.map(item => `
                    <div class="organigrama-item">
                        <h4>${this.escapeHtml(item.cargo || '')}</h4>
                        <p>${this.escapeHtml(item.nombre || '')}</p>
                        ${item.email ? `<p><a href="mailto:${item.email}">${this.escapeHtml(item.email)}</a></p>` : ''}
                    </div>
                `).join('')}
            </div>
        `;
    },

    renderPleno(pleno) {
        if (!pleno) return '';
        
        return `
            <div class="pleno-info">
                <h4>Composición del Pleno</h4>
                <p><strong>Alcalde:</strong> ${this.escapeHtml(pleno.alcalde || '')}</p>
                <p><strong>Concejales:</strong> ${pleno.concejales || 0}</p>
                ${pleno.actas ? `
                    <div class="pleno-actas">
                        <h5>Actas del Pleno</h5>
                        ${this.renderActas(pleno.actas)}
                    </div>
                ` : ''}
            </div>
        `;
    },

    renderComisiones(comisiones) {
        if (!Array.isArray(comisiones)) return '';
        
        return `
            <div class="comisiones-list">
                ${comisiones.map(comision => `
                    <div class="comision-item">
                        <h4>${this.escapeHtml(comision.nombre || '')}</h4>
                        <p>${this.escapeHtml(comision.descripcion || '')}</p>
                        ${comision.miembros ? `
                            <p><strong>Miembros:</strong> ${comision.miembros.join(', ')}</p>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
        `;
    },

    renderActas(actas) {
        if (!Array.isArray(actas)) return '';
        
        return `
            <ul class="actas-list">
                ${actas.map(acta => `
                    <li>
                        <a href="${acta.url || '#'}" target="_blank">
                            ${this.escapeHtml(acta.fecha || '')} - ${this.escapeHtml(acta.titulo || '')}
                        </a>
                    </li>
                `).join('')}
            </ul>
        `;
    },

    /**
     * ===== GESTIÓN DE TIMELINE DE EVENTOS =====
     */
    async loadTimelineEvents() {
        try {
            if (!window.firebase?.firestore) return [];

            const db = window.firebase.firestore();
            // Obtener eventos activos y ordenar en memoria
            const snapshot = await db.collection('timelineEvents')
                .where('activo', '==', true)
                .get();

            const events = [];
            snapshot.forEach(doc => {
                events.push({ id: doc.id, ...doc.data() });
            });

            // Ordenar por fecha descendente en memoria
            events.sort((a, b) => {
                const fechaA = a.fecha?.toDate ? a.fecha.toDate() : new Date(a.fecha || 0);
                const fechaB = b.fecha?.toDate ? b.fecha.toDate() : new Date(b.fecha || 0);
                return fechaB - fechaA; // Descendente
            });

            this.renderTimeline(events);
            return events;
        } catch (error) {
            console.error('[AdminContentManager] Error cargando timeline:', error);
            return [];
        }
    },

    async saveTimelineEvent(eventData) {
        try {
            if (!window.firebase?.firestore) return false;

            const db = window.firebase.firestore();
            const eventsRef = db.collection('timelineEvents');

            if (eventData.id) {
                await eventsRef.doc(eventData.id).update({
                    ...eventData,
                    actualizado: new Date()
                });
            } else {
                await eventsRef.add({
                    ...eventData,
                    activo: true,
                    creado: new Date()
                });
            }

            await this.loadTimelineEvents();
            if (typeof showNotification === 'function') {
                showNotification('Evento guardado', 'success');
            }

            return true;
        } catch (error) {
            console.error('[AdminContentManager] Error guardando evento:', error);
            return false;
        }
    },

    renderTimeline(events) {
        const timelineContainer = document.getElementById('timeline-container');
        if (!timelineContainer) return;

        timelineContainer.innerHTML = `
            <div class="timeline">
                ${events.map(event => `
                    <div class="timeline-item" data-date="${event.fecha}">
                        <div class="timeline-marker"></div>
                        <div class="timeline-content">
                            <h4>${this.escapeHtml(event.titulo || '')}</h4>
                            <p>${this.escapeHtml(event.descripcion || '')}</p>
                            <span class="timeline-date">${this.formatDate(event.fecha)}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    },

    /**
     * ===== GESTIÓN DE TRADUCCIONES =====
     */
    async loadTranslations() {
        try {
            if (!window.firebase?.firestore) return;

            const db = window.firebase.firestore();
            const snapshot = await db.collection('translations').get();

            const translations = {};
            snapshot.forEach(doc => {
                const data = doc.data();
                translations[data.language] = data.translations || {};
            });

            // Actualizar sistema multiidioma
            if (window.Multiidioma) {
                Object.keys(translations).forEach(lang => {
                    if (window.Multiidioma.translations[lang]) {
                        Object.assign(window.Multiidioma.translations[lang], translations[lang]);
                    }
                });
                window.Multiidioma.applyTranslations();
            }

            return translations;
        } catch (error) {
            console.error('[AdminContentManager] Error cargando traducciones:', error);
            return {};
        }
    },

    async saveTranslations(language, translations) {
        try {
            if (!window.firebase?.firestore) return false;

            const db = window.firebase.firestore();
            await db.collection('translations').doc(language).set({
                language,
                translations,
                actualizado: new Date()
            }, { merge: true });

            await this.loadTranslations();
            
            if (typeof showNotification === 'function') {
                showNotification('Traducciones guardadas', 'success');
            }

            return true;
        } catch (error) {
            console.error('[AdminContentManager] Error guardando traducciones:', error);
            return false;
        }
    },

    /**
     * ===== GESTIÓN DE CALENDARIO DE EVENTOS =====
     */
    async loadCalendarEvents() {
        try {
            if (!window.firebase?.firestore) return [];

            const db = window.firebase.firestore();
            const snapshot = await db.collection('calendarEvents').get();

            const events = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                events.push({ id: doc.id, ...data });
            });

            // Ordenar por fecha ascendente en memoria
            events.sort((a, b) => {
                const fechaA = a.fecha?.toDate ? a.fecha.toDate() : new Date(a.fecha || 0);
                const fechaB = b.fecha?.toDate ? b.fecha.toDate() : new Date(b.fecha || 0);
                return fechaA - fechaB; // Ascendente
            });

            this.renderCalendar(events);
            return events;
        } catch (error) {
            console.error('[AdminContentManager] Error cargando eventos calendario:', error);
            return [];
        }
    },

    async saveCalendarEvent(eventData) {
        try {
            if (!window.firebase?.firestore) return false;

            const db = window.firebase.firestore();
            const eventsRef = db.collection('calendarEvents');

            if (eventData.id) {
                await eventsRef.doc(eventData.id).update({
                    ...eventData,
                    actualizado: new Date()
                });
            } else {
                await eventsRef.add({
                    ...eventData,
                    creado: new Date()
                });
            }

            await this.loadCalendarEvents();
            
            if (typeof showNotification === 'function') {
                showNotification('Evento del calendario guardado', 'success');
            }

            return true;
        } catch (error) {
            console.error('[AdminContentManager] Error guardando evento calendario:', error);
            return false;
        }
    },

    renderCalendar(events) {
        // Renderizar calendario interactivo
        // Esta función se implementará con un componente de calendario
        const calendarContainer = document.getElementById('calendar-container');
        if (!calendarContainer) return;

        // Renderizado básico - se puede mejorar con librería de calendario
        calendarContainer.innerHTML = `
            <div class="calendar-events-list">
                ${events.map(event => `
                    <div class="calendar-event-item ${event.visible ? 'visible' : 'hidden'}" 
                         data-date="${event.fecha}"
                         data-visible="${event.visible}">
                        <h4>${this.escapeHtml(event.titulo || '')}</h4>
                        <p>${this.escapeHtml(event.descripcion || '')}</p>
                        <span class="event-date">${this.formatDate(event.fecha)}</span>
                        <span class="event-visibility">
                            ${event.visible ? '👁️ Visible' : '🔒 Oculto'}
                        </span>
                    </div>
                `).join('')}
            </div>
        `;
    },

    /**
     * ===== GESTIÓN DE CONFIGURACIÓN DE CLIMA =====
     */
    async loadWeatherConfig() {
        try {
            if (!window.firebase?.firestore) return null;

            const db = window.firebase.firestore();
            const doc = await db.collection('config').doc('weather').get();

            if (doc.exists) {
                const config = doc.data();
                if (config && config.activo && window.WeatherWidget) {
                    window.WeatherWidget.init(config);
                }
                return config || null;
            }

            return null;
        } catch (error) {
            console.error('[AdminContentManager] Error cargando config clima:', error);
            return null;
        }
    },

    async saveWeatherConfig(config) {
        try {
            if (!window.firebase?.firestore) return false;

            const db = window.firebase.firestore();
            await db.collection('config').doc('weather').set({
                ...config,
                actualizado: new Date()
            }, { merge: true });

            await this.loadWeatherConfig();
            
            if (typeof showNotification === 'function') {
                showNotification('Configuración de clima guardada', 'success');
            }

            return true;
        } catch (error) {
            console.error('[AdminContentManager] Error guardando config clima:', error);
            return false;
        }
    },

    /**
     * ===== GESTIÓN DE TRANSPARENCIA =====
     */
    async loadTransparencyData() {
        try {
            if (!window.firebase?.firestore) return {};

            const db = window.firebase.firestore();
            const doc = await db.collection('config').doc('transparency').get();

            if (doc.exists) {
                const data = doc.data();
                this.renderTransparency(data);
                return data;
            }

            return {};
        } catch (error) {
            console.error('[AdminContentManager] Error cargando transparencia:', error);
            return {};
        }
    },

    async saveTransparencyData(data) {
        try {
            if (!window.firebase?.firestore) return false;

            const db = window.firebase.firestore();
            await db.collection('config').doc('transparency').set({
                ...data,
                actualizado: new Date()
            }, { merge: true });

            await this.loadTransparencyData();
            
            if (typeof showNotification === 'function') {
                showNotification('Datos de transparencia guardados', 'success');
            }

            return true;
        } catch (error) {
            console.error('[AdminContentManager] Error guardando transparencia:', error);
            return false;
        }
    },

    renderTransparency(data) {
        const section = document.getElementById('transparencia');
        if (!section || !data) return;

        // Renderizar presupuestos, contratos, etc.
        if (data.presupuestos) {
            const presupuestosEl = section.querySelector('#presupuestos-content');
            if (presupuestosEl) {
                presupuestosEl.innerHTML = this.renderPresupuestos(data.presupuestos);
            }
        }
    },

    renderPresupuestos(presupuestos) {
        if (!Array.isArray(presupuestos)) return '';
        
        return `
            <div class="presupuestos-list">
                ${presupuestos.map(pres => `
                    <div class="presupuesto-item">
                        <h4>${this.escapeHtml(pres.ano || '')}</h4>
                        <p><strong>Presupuesto:</strong> ${this.formatCurrency(pres.presupuesto || 0)}</p>
                        <p><strong>Ejecutado:</strong> ${this.formatCurrency(pres.ejecutado || 0)}</p>
                        ${pres.url ? `<a href="${pres.url}" target="_blank">Ver documento</a>` : ''}
                    </div>
                `).join('')}
            </div>
        `;
    },

    /**
     * ===== GESTIÓN DE SERVICIOS MUNICIPALES =====
     */
    async loadServicesData() {
        try {
            if (!window.firebase?.firestore) return {};

            const db = window.firebase.firestore();
            const doc = await db.collection('config').doc('services').get();

            if (doc.exists) {
                const data = doc.data();
                this.renderServices(data);
                return data;
            }

            return {};
        } catch (error) {
            console.error('[AdminContentManager] Error cargando servicios:', error);
            return {};
        }
    },

    async saveServicesData(data) {
        try {
            if (!window.firebase?.firestore) return false;

            const db = window.firebase.firestore();
            await db.collection('config').doc('services').set({
                ...data,
                actualizado: new Date()
            }, { merge: true });

            await this.loadServicesData();
            
            if (typeof showNotification === 'function') {
                showNotification('Servicios guardados', 'success');
            }

            return true;
        } catch (error) {
            console.error('[AdminContentManager] Error guardando servicios:', error);
            return false;
        }
    },

    renderServices(data) {
        // Renderizar servicios municipales
        // Implementar según estructura de datos
    },

    /**
     * ===== UTILIDADES =====
     */
    getCurrentAdminId() {
        // Obtener ID del admin actual
        const user = window.firebaseAuth?.currentUser;
        return user?.uid || 'system';
    },

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    formatDate(date) {
        if (!date) return '';
        const d = date.toDate ? date.toDate() : new Date(date);
        return d.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    },

    formatCurrency(amount) {
        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'EUR'
        }).format(amount);
    },

    /**
     * ===== HANDLERS DE FORMULARIOS =====
     */
    async handleBannerSubmit(event) {
        event.preventDefault();
        
        const bannerData = {
            titulo: document.getElementById('bannerTitulo').value,
            descripcion: document.getElementById('bannerDescripcion').value,
            imagen: document.getElementById('bannerImagen').value,
            enlace: document.getElementById('bannerEnlace').value || '#inicio',
            botonTexto: document.getElementById('bannerBotonTexto').value,
            orden: parseInt(document.getElementById('bannerOrden').value) || 1,
            activo: document.getElementById('bannerActivo').checked
        };

        const bannerId = document.getElementById('bannerId').value;
        if (bannerId) bannerData.id = bannerId;

        await this.saveBanner(bannerData);
        this.resetBannerForm();
        this.loadBannersList();
    },

    resetBannerForm() {
        document.getElementById('bannerForm').reset();
        document.getElementById('bannerId').value = '';
    },

    async loadBannersList() {
        const banners = await this.loadBanners();
        const listContainer = document.getElementById('bannersList');
        if (!listContainer) return;

        listContainer.innerHTML = banners.map(banner => `
            <div class="banner-item-card">
                <img src="${this.escapeHtml(banner.imagen)}" alt="${this.escapeHtml(banner.titulo)}" style="width: 100px; height: 60px; object-fit: cover;">
                <div class="banner-item-info">
                    <h5>${this.escapeHtml(banner.titulo)}</h5>
                    <p>${this.escapeHtml(banner.descripcion || '')}</p>
                    <small>Orden: ${banner.orden} | ${banner.activo ? 'Activo' : 'Inactivo'}</small>
                </div>
                <div class="banner-item-actions">
                    <button class="btn btn-sm btn-primary" onclick="AdminContentManager.editBanner('${banner.id}')">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="AdminContentManager.deleteBanner('${banner.id}')">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </div>
            </div>
        `).join('');
    },

    async editBanner(bannerId) {
        try {
            const db = window.firebase.firestore();
            const doc = await db.collection('banners').doc(bannerId).get();
            
            if (doc.exists) {
                const data = doc.data();
                document.getElementById('bannerId').value = bannerId;
                document.getElementById('bannerTitulo').value = data.titulo || '';
                document.getElementById('bannerDescripcion').value = data.descripcion || '';
                document.getElementById('bannerImagen').value = data.imagen || '';
                document.getElementById('bannerEnlace').value = data.enlace || '';
                document.getElementById('bannerBotonTexto').value = data.botonTexto || '';
                document.getElementById('bannerOrden').value = data.orden || 1;
                document.getElementById('bannerActivo').checked = data.activo !== false;
                
                // Scroll al formulario
                document.getElementById('bannerForm').scrollIntoView({ behavior: 'smooth' });
            }
        } catch (error) {
            console.error('[AdminContentManager] Error editando banner:', error);
        }
    },

    async handleAboutSubmit(event) {
        event.preventDefault();
        const section = event.target.id.includes('Historia') ? 'historia' : 
                       event.target.id.includes('Organigrama') ? 'organigrama' :
                       event.target.id.includes('Pleno') ? 'pleno' : 'comisiones';
        
        let data = {};
        
        if (section === 'historia') {
            const editor = window.quillInstances?.historiaEditor;
            data.historia = editor ? editor.root.innerHTML : document.getElementById('historiaContent').value;
        } else if (section === 'organigrama') {
            const items = [];
            document.querySelectorAll('#organigramaItems .organigrama-item-form').forEach(item => {
                items.push({
                    cargo: item.querySelector('[name="cargo"]').value,
                    nombre: item.querySelector('[name="nombre"]').value,
                    email: item.querySelector('[name="email"]').value
                });
            });
            data.organigrama = items;
        } else if (section === 'pleno') {
            data.pleno = {
                alcalde: document.getElementById('plenoAlcalde').value,
                concejales: parseInt(document.getElementById('plenoConcejales').value) || 0,
                actas: this.getActasFromForm()
            };
        } else if (section === 'comisiones') {
            const items = [];
            document.querySelectorAll('#comisionesItems .comision-item-form').forEach(item => {
                items.push({
                    nombre: item.querySelector('[name="nombre"]').value,
                    descripcion: item.querySelector('[name="descripcion"]').value,
                    miembros: item.querySelector('[name="miembros"]').value.split(',').map(m => m.trim())
                });
            });
            data.comisiones = items;
        }

        await this.saveAboutSection(data);
    },

    async handleTimelineSubmit(event) {
        event.preventDefault();
        
        const eventData = {
            titulo: document.getElementById('timelineTitulo').value,
            descripcion: document.getElementById('timelineDescripcion').value,
            fecha: document.getElementById('timelineFecha').value,
            activo: document.getElementById('timelineActivo').checked
        };

        const eventId = document.getElementById('timelineEventId').value;
        if (eventId) eventData.id = eventId;

        await this.saveTimelineEvent(eventData);
        document.getElementById('timelineEventForm').reset();
        document.getElementById('timelineEventId').value = '';
        this.loadTimelineEventsList();
    },

    async handleCalendarSubmit(event) {
        event.preventDefault();
        
        const eventData = {
            titulo: document.getElementById('calendarTitulo').value,
            descripcion: document.getElementById('calendarDescripcion').value,
            fecha: document.getElementById('calendarFecha').value,
            localidad: document.getElementById('calendarLocalidad').value,
            visible: document.getElementById('calendarVisible').checked
        };

        const eventId = document.getElementById('calendarEventId').value;
        if (eventId) eventData.id = eventId;

        await this.saveCalendarEvent(eventData);
        document.getElementById('calendarEventForm').reset();
        document.getElementById('calendarEventId').value = '';
        this.loadCalendarEventsList();
    },

    async saveTranslations() {
        const language = document.getElementById('translationLanguage').value;
        const translations = {};
        
        // Recopilar traducciones del editor
        document.querySelectorAll('#translationsEditor [data-key]').forEach(input => {
            const key = input.getAttribute('data-key');
            translations[key] = input.value;
        });

        await this.saveTranslations(language, translations);
    },

    async loadTranslationEditor() {
        const language = document.getElementById('translationLanguage').value;
        const translations = await this.loadTranslations();
        const langTranslations = translations[language] || {};
        
        const editor = document.getElementById('translationsEditor');
        if (!editor) return;

        editor.innerHTML = Object.keys(langTranslations).map(key => `
            <div class="form-group">
                <label>${key}:</label>
                <input type="text" class="form-control" data-key="${key}" value="${this.escapeHtml(langTranslations[key])}">
            </div>
        `).join('');
    },

    // Funciones auxiliares para formularios
    addOrganigramaItem() {
        const container = document.getElementById('organigramaItems');
        const item = document.createElement('div');
        item.className = 'organigrama-item-form';
        item.innerHTML = `
            <div class="form-group">
                <input type="text" name="cargo" class="form-control" placeholder="Cargo">
            </div>
            <div class="form-group">
                <input type="text" name="nombre" class="form-control" placeholder="Nombre">
            </div>
            <div class="form-group">
                <input type="email" name="email" class="form-control" placeholder="Email">
            </div>
            <button type="button" class="btn btn-sm btn-danger" onclick="this.parentElement.remove()">
                <i class="fas fa-trash"></i> Eliminar
            </button>
        `;
        container.appendChild(item);
    },

    addActaItem() {
        const container = document.getElementById('actasItems');
        const item = document.createElement('div');
        item.className = 'acta-item-form';
        item.innerHTML = `
            <div class="form-group">
                <input type="date" name="fecha" class="form-control">
            </div>
            <div class="form-group">
                <input type="text" name="titulo" class="form-control" placeholder="Título del acta">
            </div>
            <div class="form-group">
                <input type="url" name="url" class="form-control" placeholder="URL del documento">
            </div>
            <button type="button" class="btn btn-sm btn-danger" onclick="this.parentElement.remove()">
                <i class="fas fa-trash"></i> Eliminar
            </button>
        `;
        container.appendChild(item);
    },

    getActasFromForm() {
        const actas = [];
        document.querySelectorAll('#actasItems .acta-item-form').forEach(item => {
            actas.push({
                fecha: item.querySelector('[name="fecha"]').value,
                titulo: item.querySelector('[name="titulo"]').value,
                url: item.querySelector('[name="url"]').value
            });
        });
        return actas;
    },

    addComisionItem() {
        const container = document.getElementById('comisionesItems');
        const item = document.createElement('div');
        item.className = 'comision-item-form';
        item.innerHTML = `
            <div class="form-group">
                <input type="text" name="nombre" class="form-control" placeholder="Nombre de la comisión">
            </div>
            <div class="form-group">
                <textarea name="descripcion" class="form-control" placeholder="Descripción"></textarea>
            </div>
            <div class="form-group">
                <input type="text" name="miembros" class="form-control" placeholder="Miembros (separados por comas)">
            </div>
            <button type="button" class="btn btn-sm btn-danger" onclick="this.parentElement.remove()">
                <i class="fas fa-trash"></i> Eliminar
            </button>
        `;
        container.appendChild(item);
    },

    addPresupuestoItem() {
        const container = document.getElementById('presupuestosItems');
        const item = document.createElement('div');
        item.className = 'presupuesto-item-form';
        item.innerHTML = `
            <div class="form-group">
                <input type="number" name="ano" class="form-control" placeholder="Año">
            </div>
            <div class="form-group">
                <input type="number" name="presupuesto" class="form-control" placeholder="Presupuesto (€)">
            </div>
            <div class="form-group">
                <input type="number" name="ejecutado" class="form-control" placeholder="Ejecutado (€)">
            </div>
            <div class="form-group">
                <input type="url" name="url" class="form-control" placeholder="URL del documento">
            </div>
            <button type="button" class="btn btn-sm btn-danger" onclick="this.parentElement.remove()">
                <i class="fas fa-trash"></i> Eliminar
            </button>
        `;
        container.appendChild(item);
    },

    addContratoItem() {
        const container = document.getElementById('contratosItems');
        const item = document.createElement('div');
        item.className = 'contrato-item-form';
        item.innerHTML = `
            <div class="form-group">
                <input type="text" name="numero" class="form-control" placeholder="Número de contrato">
            </div>
            <div class="form-group">
                <input type="text" name="empresa" class="form-control" placeholder="Empresa">
            </div>
            <div class="form-group">
                <input type="number" name="importe" class="form-control" placeholder="Importe (€)">
            </div>
            <div class="form-group">
                <input type="date" name="fecha" class="form-control">
            </div>
            <button type="button" class="btn btn-sm btn-danger" onclick="this.parentElement.remove()">
                <i class="fas fa-trash"></i> Eliminar
            </button>
        `;
        container.appendChild(item);
    },

    async loadTimelineEventsList() {
        const events = await this.loadTimelineEvents();
        const listContainer = document.getElementById('timelineEventsList');
        if (!listContainer) return;

        listContainer.innerHTML = events.map(event => `
            <div class="timeline-event-item">
                <h5>${this.escapeHtml(event.titulo)}</h5>
                <p>${this.escapeHtml(event.descripcion)}</p>
                <small>${this.formatDate(event.fecha)} | ${event.activo ? 'Activo' : 'Inactivo'}</small>
                <button class="btn btn-sm btn-primary" onclick="AdminContentManager.editTimelineEvent('${event.id}')">
                    <i class="fas fa-edit"></i> Editar
                </button>
            </div>
        `).join('');
    },

    async loadCalendarEventsList() {
        const events = await this.loadCalendarEvents();
        const listContainer = document.getElementById('calendarEventsList');
        if (!listContainer) return;

        listContainer.innerHTML = events.map(event => `
            <div class="calendar-event-item-admin ${event.visible ? 'visible' : 'hidden'}">
                <h5>${this.escapeHtml(event.titulo)}</h5>
                <p>${this.escapeHtml(event.descripcion)}</p>
                <small>${this.formatDate(event.fecha)} | ${event.visible ? '👁️ Visible' : '🔒 Oculto'}</small>
                <button class="btn btn-sm btn-primary" onclick="AdminContentManager.editCalendarEvent('${event.id}')">
                    <i class="fas fa-edit"></i> Editar
                </button>
            </div>
        `).join('');
    },

    async editTimelineEvent(eventId) {
        try {
            const db = window.firebase.firestore();
            const doc = await db.collection('timelineEvents').doc(eventId).get();
            
            if (doc.exists) {
                const data = doc.data();
                document.getElementById('timelineEventId').value = eventId;
                document.getElementById('timelineTitulo').value = data.titulo || '';
                document.getElementById('timelineDescripcion').value = data.descripcion || '';
                document.getElementById('timelineFecha').value = data.fecha || '';
                document.getElementById('timelineActivo').checked = data.activo !== false;
            }
        } catch (error) {
            console.error('[AdminContentManager] Error editando evento timeline:', error);
        }
    },

    async editCalendarEvent(eventId) {
        try {
            const db = window.firebase.firestore();
            const doc = await db.collection('calendarEvents').doc(eventId).get();
            
            if (doc.exists) {
                const data = doc.data();
                document.getElementById('calendarEventId').value = eventId;
                document.getElementById('calendarTitulo').value = data.titulo || '';
                document.getElementById('calendarDescripcion').value = data.descripcion || '';
                document.getElementById('calendarFecha').value = data.fecha || '';
                document.getElementById('calendarLocalidad').value = data.localidad || '';
                document.getElementById('calendarVisible').checked = data.visible !== false;
            }
        } catch (error) {
            console.error('[AdminContentManager] Error editando evento calendario:', error);
        }
    }
};

// Exportar globalmente
if (typeof window !== 'undefined') {
    window.AdminContentManager = AdminContentManager;
}

// Cargar contenido cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        AdminContentManager.init();
    });
} else {
    AdminContentManager.init();
}

// Recargar contenido cuando cambie la autenticación
if (window.firebaseAuth) {
    window.firebase.onAuthStateChanged(window.firebaseAuth, (user) => {
        if (user) {
            AdminContentManager.loadAllContent();
        }
    });
}

