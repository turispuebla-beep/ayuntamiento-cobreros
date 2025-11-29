/*
Admin Panel System
© 2024 - Sistema de Gestión del Ayuntamiento de Cobreros

Panel de administración completo:
- Gestión de administradores (hasta 3 adicionales)
- Configuración del ayuntamiento
- Estadísticas y reportes
- Gestión de usuarios
- Configuración del sistema
- Acceso restringido solo a super admin

Contacto: editorturis@gmail.com
*/

class AdminPanel {
  constructor() {
    this.isVisible = false;
    this.currentSection = 'dashboard';
    this.adminUsers = [];
    this.maxAdmins = 3; // Máximo 3 administradores adicionales
    this.panelElement = null;
    this.sectionContentEl = null;
    this.sectionTitleEl = null;
    this.navButtons = [];
    
    this.init();
  }

  init() {
    this.loadAdminUsers();
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Listen for admin panel access
    document.addEventListener('click', (e) => {
      if (e.target.id === 'manage-admins-btn') {
        this.showAdminManagement();
      }
      
      if (e.target.id === 'association-config-btn') {
        this.showAssociationConfig();
      }
      
      if (e.target.id === 'view-stats-btn') {
        this.showStatistics();
      }
      
      if (e.target.id === 'manage-users-btn') {
        this.showUserManagement();
      }
      
      if (e.target.id === 'accounting-btn') {
        this.showAccounting();
      }
      
      if (e.target.id === 'system-config-btn') {
        this.showSystemConfig();
      }
    });
  }

  initializeUI(panelElement) {
    this.panelElement = panelElement;
    this.sectionContentEl = panelElement.querySelector('#admin-section-content');
    this.sectionTitleEl = panelElement.querySelector('#admin-section-title');
    this.navButtons = Array.from(panelElement.querySelectorAll('.admin-nav-item'));

    const closeBtn = panelElement.querySelector('#close-admin-panel');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closePanel());
    }

    this.navButtons.forEach(button => {
      button.addEventListener('click', () => {
        const section = button.dataset.section;
        this.showSection(section);
      });
    });

    this.updateNavLabels();
    this.showSection(this.currentSection || 'dashboard');
  }

  openPanel() {
    if (!this.panelElement) {
      console.warn('AdminPanel UI no inicializada.');
      return;
    }
    this.isVisible = true;
    this.panelElement.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    this.showSection(this.currentSection || 'dashboard');
  }

  closePanel() {
    if (this.panelElement) {
      this.isVisible = false;
      this.panelElement.style.display = 'none';
      document.body.style.overflow = '';
    }
  }

  showSection(section) {
    if (!this.sectionContentEl) return;

    this.currentSection = section;

    this.navButtons.forEach(button => {
      const isActive = button.dataset.section === section;
      button.classList.toggle('active', isActive);
      const icon = button.querySelector('.nav-icon');
      if (icon) {
        icon.textContent = isActive ? '−' : '+';
      }
    });

    if (this.sectionTitleEl) {
      this.sectionTitleEl.textContent = this.getSectionTitle(section);
    }

    this.sectionContentEl.innerHTML = this.getSectionContent(section);
    this.attachSectionListeners(section);
    this.updateNavLabels();
    this.refreshSectionData(section);
  }

  getSectionTitle(section) {
    if (section === 'dashboard') {
      return 'Panel de Control';
    }
    if (section === 'hero') {
      return 'Encabezado principal';
    }
    if (section === 'quickActions') {
      return 'Acciones rápidas';
    }
    const data = this.getSectionData(section);
    return data.navTitle || data.title || 'Panel';
  }

  getSectionContent(section) {
    if (section === 'dashboard') {
      return this.renderDashboardContent();
    }
    if (section === 'hero') {
      return this.buildHeroEditor();
    }
    if (section === 'quickActions') {
      return this.buildQuickActionsEditor();
    }
    return this.buildSectionEditor(section);
  }

  getSectionData(section) {
    const defaults = typeof window.associationConfig.getDefaultSections === 'function'
      ? window.associationConfig.getDefaultSections()
      : {};

    const base = defaults[section] || {};
    const customSections = window.associationConfig.sections || {};
    const current = customSections[section] || {};

    return {
      ...base,
      ...current,
      summary: current.summary ?? base.summary ?? '',
      paragraphs: Array.isArray(current.paragraphs) ? current.paragraphs : (base.paragraphs || []),
      highlightTitle: current.highlightTitle ?? base.highlightTitle ?? '',
      highlights: Array.isArray(current.highlights) ? current.highlights : (base.highlights || []),
      cta: {
        ...(base.cta || {}),
        ...(current.cta || {})
      }
    };
  }

  buildSectionEditor(section) {
    const data = this.getSectionData(section);
    const paragraphsValue = (data.paragraphs || []).join('\n');
    const highlightsValue = (data.highlights || []).join('\n');
    const cta = data.cta || {};
    const ctaType = cta.type || 'anchor';
    const ctaVariant = cta.variant || (ctaType === 'action' ? 'primary' : 'link');

    return `
      <form id="section-form-${section}" class="section-editor-form">
        <div class="admin-section">
          <div class="section-editor-grid">
            <div class="form-group">
              <label>Título de la sección</label>
              <input type="text" name="title" value="${this.escapeHtml(data.title || '')}" required>
              <small>Se utiliza como título interno de la sección.</small>
            </div>
            <div class="form-group">
              <label>Título en el menú lateral</label>
              <input type="text" name="navTitle" value="${this.escapeHtml(data.navTitle || '')}">
              <small>Nombre mostrado en el panel lateral y en el panel de administración.</small>
            </div>
            <div class="form-group form-group--full">
              <label>Resumen principal</label>
              <textarea name="summary" rows="3" placeholder="Resumen corto de la sección">${this.escapeHtml(data.summary || '')}</textarea>
            </div>
            <div class="form-group form-group--full">
              <label>Párrafos adicionales (uno por línea)</label>
              <textarea name="paragraphs" rows="5" placeholder="Cada línea se mostrará como un párrafo">${this.escapeHtml(paragraphsValue)}</textarea>
            </div>
            <div class="form-group">
              <label>Título de la lista</label>
              <input type="text" name="highlightTitle" value="${this.escapeHtml(data.highlightTitle || '')}" placeholder="Ej. Valores que nos guían">
            </div>
            <div class="form-group form-group--full">
              <label>Elementos destacados (uno por línea)</label>
              <textarea name="highlights" rows="4" placeholder="Cada línea se mostrará como un elemento de la lista">${this.escapeHtml(highlightsValue)}</textarea>
            </div>
            <fieldset class="form-fieldset form-group--full">
              <legend>Acción de la sección</legend>
              <div class="fieldset-grid">
                <div class="form-group">
                  <label>Tipo de acción</label>
                  <select name="ctaType">
                    <option value="none" ${ctaType === 'none' ? 'selected' : ''}>Sin acción</option>
                    <option value="anchor" ${ctaType === 'anchor' ? 'selected' : ''}>Enlace interno (desplazamiento)</option>
                    <option value="action" ${ctaType === 'action' ? 'selected' : ''}>Acción de la plataforma</option>
                    <option value="link" ${ctaType === 'link' ? 'selected' : ''}>Enlace externo</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Etiqueta del botón/enlace</label>
                  <input type="text" name="ctaLabel" value="${this.escapeHtml(cta.label || '')}" placeholder="Texto que verá el usuario">
                </div>
                <div class="form-group">
                  <label>Estilo</label>
                  <select name="ctaVariant">
                    <option value="link" ${ctaVariant === 'link' ? 'selected' : ''}>Enlace simple</option>
                    <option value="primary" ${ctaVariant === 'primary' ? 'selected' : ''}>Botón primario</option>
                    <option value="outline" ${ctaVariant === 'outline' ? 'selected' : ''}>Botón contorneado</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Destino (ancla o URL)</label>
                  <input type="text" name="ctaTarget" value="${this.escapeHtml(cta.target || '')}" placeholder="#eventos o https://...">
                  <small>Usa #seccion para desplazamientos internos.</small>
                </div>
                <div class="form-group">
                  <label>Acción (solo para tipo acción)</label>
                  <input type="text" name="ctaAction" value="${this.escapeHtml(cta.action || '')}" placeholder="Ej. register-volunteer">
                </div>
              </div>
            </fieldset>
          </div>
          <div class="admin-section-actions">
            <button type="button" class="btn btn-outline" data-reset-section>Restablecer</button>
            <button type="button" class="btn btn-danger btn-sm" data-delete-section>Eliminar contenido</button>
            <button type="submit" class="btn btn-primary">Guardar cambios</button>
          </div>
        </div>
      </form>
    `;
  }

  buildHeroEditor() {
    const hero = window.associationConfig?.hero || {};
    return `
      <form id="hero-form" class="section-editor-form">
        <div class="admin-section">
          <div class="section-editor-grid">
            <div class="form-group form-group--full">
              <label>Texto de la banda superior</label>
              <input type="text" name="badge" value="${this.escapeHtml(hero.badge || '')}" placeholder="Fiestas de la Virgen...">
            </div>
            <div class="form-group">
              <label>Título (prefijo)</label>
              <input type="text" name="titlePrefix" value="${this.escapeHtml(hero.titlePrefix || '')}" placeholder="Bienvenidos a">
            </div>
            <div class="form-group">
              <label>Título destacado</label>
              <input type="text" name="titleHighlight" value="${this.escapeHtml(hero.titleHighlight || '')}" placeholder="Nombre del ayuntamiento">
              <small>Se mostrará con el degradado destacado.</small>
            </div>
            <div class="form-group form-group--full">
              <label>Subtítulo</label>
              <textarea name="subtitle" rows="3" placeholder="Descripción breve del encabezado">${this.escapeHtml(hero.subtitle || '')}</textarea>
            </div>
          </div>
          <div class="editor-actions">
            <button type="button" class="btn btn-outline" data-reset-hero>Restablecer</button>
            <button type="button" class="btn btn-danger btn-sm" data-clear-hero>Limpiar</button>
            <button type="submit" class="btn btn-primary">Guardar encabezado</button>
          </div>
        </div>
      </form>
    `;
  }

  buildQuickActionsEditor() {
    return `
      <form id="quick-actions-form" class="section-editor-form">
        <div class="admin-section">
          <div class="quick-actions-editor" data-quick-actions-holder></div>
          <div class="editor-actions">
            <button type="button" class="btn btn-outline" id="reset-quick-actions">Restablecer</button>
            <button type="button" class="btn btn-danger btn-sm" id="clear-quick-actions">Eliminar todas</button>
            <button type="button" class="btn btn-outline" id="add-quick-action">Añadir acción</button>
            <button type="submit" class="btn btn-primary">Guardar acciones</button>
          </div>
        </div>
      </form>
    `;
  }

  createQuickActionRow(action = {}) {
    const row = document.createElement('div');
    row.className = 'quick-action-row';
    row.dataset.quickActionId = action.id || '';

    row.innerHTML = `
      <div class="form-group">
        <label>Icono</label>
        <input type="text" data-field="icon" value="${this.escapeHtml(action.icon || '')}" maxlength="4" placeholder="Emoji o símbolo">
      </div>
      <div class="form-group">
        <label>Título</label>
        <input type="text" data-field="title" value="${this.escapeHtml(action.title || '')}" required>
      </div>
      <div class="form-group">
        <label>Descripción</label>
        <input type="text" data-field="description" value="${this.escapeHtml(action.description || '')}" required>
      </div>
      <div class="form-group">
        <label>Tipo</label>
        <select data-field="type">
          <option value="action" ${action.type === 'action' ? 'selected' : ''}>Acción interna</option>
          <option value="anchor" ${action.type === 'anchor' ? 'selected' : ''}>Desplazamiento a sección</option>
          <option value="link" ${action.type === 'link' ? 'selected' : ''}>Enlace externo</option>
        </select>
      </div>
      <div class="form-group">
        <label>Destino / Identificador</label>
        <input type="text" data-field="target" value="${this.escapeHtml(action.target || '')}" placeholder="Ej. register-member o #eventos">
        <small>Para acciones internas, utiliza el identificador (ej. register-member). Para desplazamientos, usa #seccion.</small>
      </div>
      <div class="form-group">
        <label>Identificador (opcional)</label>
        <input type="text" data-field="id" value="${this.escapeHtml(action.id || '')}" placeholder="Se genera automáticamente si se deja vacío">
      </div>
      <button type="button" class="btn btn-danger btn-sm remove-quick-action" aria-label="Eliminar acción">Eliminar</button>
    `;

    return row;
  }

  attachSectionListeners(section) {
    if (!this.sectionContentEl) return;

    if (section === 'hero') {
      this.attachHeroListeners();
      return;
    }

    if (section === 'quickActions') {
      this.attachQuickActionsListeners();
      return;
    }
    const form = this.sectionContentEl.querySelector(`#section-form-${section}`);
    if (!form) return;

    const submitBtn = form.querySelector('[type="submit"]');
    const resetBtn = form.querySelector('[data-reset-section]');
    const deleteBtn = form.querySelector('[data-delete-section]');

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        const defaults = this.getDefaultSectionData(section);
        this.fillSectionForm(form, defaults);
      });
    }

    if (deleteBtn) {
      deleteBtn.addEventListener('click', async () => {
        deleteBtn.disabled = true;
        try {
          await this.deleteSectionConfig(section);
        } catch (error) {
          console.error('Error deleting section config:', error);
          this.showFeedback('No se pudo eliminar el contenido de la sección.', 'error');
        } finally {
          deleteBtn.disabled = false;
        }
      });
    }

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (submitBtn) submitBtn.disabled = true;

      const formData = new FormData(form);
      const data = {
        title: (formData.get('title') || '').toString().trim(),
        navTitle: (formData.get('navTitle') || '').toString().trim(),
        summary: (formData.get('summary') || '').toString().trim(),
        paragraphs: this.parseTextareaList(formData.get('paragraphs')),
        highlightTitle: (formData.get('highlightTitle') || '').toString().trim(),
        highlights: this.parseTextareaList(formData.get('highlights')),
        cta: {
          type: (formData.get('ctaType') || 'none').toString(),
          label: (formData.get('ctaLabel') || '').toString().trim(),
          variant: (formData.get('ctaVariant') || 'link').toString(),
          target: (formData.get('ctaTarget') || '').toString().trim(),
          action: (formData.get('ctaAction') || '').toString().trim()
        }
      };

      if (!data.navTitle) {
        data.navTitle = data.title;
      }

      if (!data.cta.label || data.cta.type === 'none') {
        data.cta = {
          type: 'none',
          label: '',
          variant: 'link',
          target: '',
          action: ''
        };
      }

      try {
        await this.saveSectionConfig(section, data);
      } catch (error) {
        console.error('Error saving section config:', error);
        this.showFeedback('No se pudo guardar la sección. Inténtalo de nuevo.', 'error');
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  parseTextareaList(value) {
    if (!value) return [];
    return value
      .toString()
      .split('\n')
      .map(item => item.trim())
      .filter(item => item.length > 0);
  }

  fillHeroForm(form, hero = {}) {
    const setValue = (selector, value) => {
      const field = form.querySelector(selector);
      if (field) field.value = value ?? '';
    };

    setValue('input[name="badge"]', hero.badge || '');
    setValue('input[name="titlePrefix"]', hero.titlePrefix || '');
    setValue('input[name="titleHighlight"]', hero.titleHighlight || '');
    setValue('textarea[name="subtitle"]', hero.subtitle || '');
  }

  fillSectionForm(form, data = {}) {
    const cta = data.cta || {};
    const setValue = (selector, value) => {
      const field = form.querySelector(selector);
      if (field) {
        field.value = value ?? '';
      }
    };

    setValue('input[name="title"]', data.title || '');
    setValue('input[name="navTitle"]', data.navTitle || data.title || '');
    setValue('textarea[name="summary"]', data.summary || '');
    setValue('textarea[name="paragraphs"]', (data.paragraphs || []).join('\n'));
    setValue('input[name="highlightTitle"]', data.highlightTitle || '');
    setValue('textarea[name="highlights"]', (data.highlights || []).join('\n'));
    setValue('select[name="ctaType"]', cta.type || 'none');
    setValue('input[name="ctaLabel"]', cta.label || '');
    setValue('select[name="ctaVariant"]', cta.variant || 'link');
    setValue('input[name="ctaTarget"]', cta.target || '');
    setValue('input[name="ctaAction"]', cta.action || '');
  }

  getDefaultSectionData(section) {
    if (typeof window.associationConfig.getDefaultSections === 'function') {
      const defaults = window.associationConfig.getDefaultSections();
      if (defaults && defaults[section]) {
        const base = defaults[section];
        return {
          ...base,
          paragraphs: Array.isArray(base.paragraphs) ? [...base.paragraphs] : [],
          highlights: Array.isArray(base.highlights) ? [...base.highlights] : [],
          cta: base.cta ? { ...base.cta } : { type: 'none', label: '', variant: 'link', target: '', action: '' }
        };
      }
    }
    return {
      title: '',
      navTitle: '',
      summary: '',
      paragraphs: [],
      highlightTitle: '',
      highlights: [],
      cta: { type: 'none', label: '', variant: 'link', target: '', action: '' }
    };
  }

  async saveSectionConfig(section, data) {
    const sections = { ...(window.associationConfig.sections || {}) };
    sections[section] = {
      ...data,
      paragraphs: data.paragraphs || [],
      highlights: data.highlights || [],
      cta: data.cta || { type: 'none', label: '' }
    };

    const success = await this.safeUpdateAssociationConfig({ sections });
    window.associationConfig.sections = sections;

    if (window.app && typeof window.app.renderSidebarSections === 'function') {
      window.app.renderSidebarSections();
    }

    this.updateNavLabels();
    this.showSection(section);
    this.showFeedback(
      success ? 'Sección actualizada correctamente.' : 'Sección guardada localmente. Se sincronizará al reconectar.',
      success ? 'success' : 'info'
    );
  }

  updateNavLabels() {
    if (!Array.isArray(this.navButtons) || this.navButtons.length === 0) {
      return;
    }

    const sections = window.associationConfig?.sections || {};
    const defaults = typeof window.associationConfig.getDefaultSections === 'function'
      ? window.associationConfig.getDefaultSections()
      : {};

    this.navButtons.forEach(button => {
      const key = button.dataset.section;
      if (!key || key === 'dashboard' || key === 'hero' || key === 'quickActions') return;

      const labelEl = button.querySelector('span:not(.nav-icon)');
      if (!labelEl) return;

      const sectionData = sections[key] || (defaults ? defaults[key] : null);
      if (!sectionData) return;

      labelEl.textContent = sectionData.navTitle || sectionData.title || labelEl.textContent;
    });
  }

  attachHeroListeners() {
    const form = this.sectionContentEl.querySelector('#hero-form');
    if (!form) return;

    const submitBtn = form.querySelector('[type="submit"]');
    const resetBtn = form.querySelector('[data-reset-hero]');
    const clearBtn = form.querySelector('[data-clear-hero]');

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        const defaults = this.getDefaultHero();
        this.fillHeroForm(form, defaults);
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.fillHeroForm(form, {
          badge: '',
          titlePrefix: '',
          titleHighlight: '',
          subtitle: ''
        });
      });
    }

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (submitBtn) submitBtn.disabled = true;

      const formData = new FormData(form);
      const hero = {
        badge: (formData.get('badge') || '').toString().trim(),
        titlePrefix: (formData.get('titlePrefix') || '').toString().trim(),
        titleHighlight: (formData.get('titleHighlight') || '').toString().trim(),
        subtitle: (formData.get('subtitle') || '').toString().trim()
      };

      try {
        await this.saveHeroConfig(hero);
      } catch (error) {
        console.error('Error saving hero config:', error);
        this.showFeedback('No se pudo guardar el encabezado.', 'error');
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  async saveHeroConfig(hero) {
    if (!hero.titleHighlight) {
      hero.titleHighlight = window.associationConfig.associationName || hero.titlePrefix || 'Ayuntamiento de Cobreros';
    }
    const success = await this.safeUpdateAssociationConfig({ hero });
    window.associationConfig.hero = { ...window.associationConfig.hero, ...hero };

    if (window.app && typeof window.app.renderHero === 'function') {
      window.app.renderHero();
    }

    this.showFeedback(
      success ? 'Encabezado actualizado correctamente.' : 'Encabezado guardado localmente. Se sincronizará al reconectar.',
      success ? 'success' : 'info'
    );
    this.showSection('hero');
  }

  getDefaultHero() {
    if (typeof window.associationConfig.getDefaultHero === 'function') {
      return { ...window.associationConfig.getDefaultHero() };
    }
    return {
      badge: '',
      titlePrefix: '',
      titleHighlight: '',
      subtitle: ''
    };
  }

  attachQuickActionsListeners() {
    const form = this.sectionContentEl.querySelector('#quick-actions-form');
    if (!form) return;

    const container = form.querySelector('[data-quick-actions-holder]');
    const addBtn = form.querySelector('#add-quick-action');
    const resetBtn = form.querySelector('#reset-quick-actions');
    const clearBtn = form.querySelector('#clear-quick-actions');
    if (!container) return;

    const initialActions = this.getStoredQuickActions();
    this.renderQuickActionRows(container, initialActions.length ? initialActions : [{}]);

    form.addEventListener('click', (event) => {
      const removeBtn = event.target.closest('.remove-quick-action');
      if (removeBtn) {
        const row = removeBtn.closest('.quick-action-row');
        if (row) {
          row.remove();
          if (!container.children.length) {
            container.appendChild(this.createQuickActionRow());
          }
        }
      }
    });

    if (addBtn) {
      addBtn.addEventListener('click', () => {
        container.appendChild(this.createQuickActionRow());
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        const defaults = this.getDefaultQuickActions();
        this.renderQuickActionRows(container, defaults.length ? defaults : [{}]);
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.renderQuickActionRows(container, [{}]);
      });
    }

    const submitBtn = form.querySelector('[type="submit"]');
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (submitBtn) submitBtn.disabled = true;

      try {
        const rows = Array.from(container.querySelectorAll('.quick-action-row'));
        const actions = rows.map(row => {
          const getField = (field) => row.querySelector(`[data-field="${field}"]`)?.value.trim() || '';
          const type = getField('type') || 'action';
          let id = row.dataset.quickActionId || getField('id') || this.generateQuickActionId(getField('title'));
          if (!id) {
            id = this.generateQuickActionId(`qa_${Date.now()}`);
          }
          return {
            id,
            icon: getField('icon') || '⭐',
            title: getField('title'),
            description: getField('description'),
            type,
            target: getField('target')
          };
        }).filter(action => action.title);

        const usedIds = new Set();
        actions.forEach(action => {
          if (!action.id || usedIds.has(action.id)) {
            action.id = this.generateQuickActionId(action.title);
          }
          usedIds.add(action.id);
        });

        await this.saveQuickActionsConfig(actions);
      } catch (error) {
        console.error('Error saving quick actions:', error);
        this.showFeedback('No se pudieron guardar las acciones.', 'error');
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  async saveQuickActionsConfig(actions) {
    const success = await this.safeUpdateAssociationConfig({ quickActions: actions });
    window.associationConfig.quickActions = actions;

    if (window.app && typeof window.app.renderQuickActions === 'function') {
      window.app.renderQuickActions();
    }

    this.showFeedback(
      success ? 'Acciones rápidas actualizadas.' : 'Acciones guardadas localmente. Se sincronizarán al reconectar.',
      success ? 'success' : 'info'
    );
    this.showSection('quickActions');
  }

  renderQuickActionRows(container, actions = []) {
    container.innerHTML = '';
    const rows = actions.length ? actions : [{}];
    rows.forEach(action => container.appendChild(this.createQuickActionRow(action)));
  }

  getStoredQuickActions() {
    const actions = window.associationConfig?.quickActions;
    return Array.isArray(actions) ? actions.map(action => ({ ...action })) : [];
  }

  getDefaultQuickActions() {
    if (typeof window.associationConfig.getDefaultQuickActions === 'function') {
      const defaults = window.associationConfig.getDefaultQuickActions();
      return Array.isArray(defaults) ? defaults.map(action => ({ ...action })) : [];
    }
    return [];
  }

  generateQuickActionId(value = '') {
    if (value) {
      const slug = this.slugify(value);
      if (slug) return slug;
    }
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return `qa_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }

  async deleteSectionConfig(section) {
    const sections = { ...(window.associationConfig.sections || {}) };
    const hadCustomSection = Boolean(sections[section]);

    if (hadCustomSection) {
      delete sections[section];
      const success = await this.safeUpdateAssociationConfig({ sections });
      window.associationConfig.sections = sections;

      if (window.app && typeof window.app.renderSidebarSections === 'function') {
        window.app.renderSidebarSections();
      }
      this.updateNavLabels();
      this.showSection(section);
      this.showFeedback(
        success
          ? 'Contenido de la sección eliminado. Se restauraron los valores predeterminados.'
          : 'Contenido eliminado localmente. Se sincronizará al reconectar.',
        success ? 'success' : 'info'
      );
    } else {
      this.showSection(section);
      this.showFeedback('La sección ya estaba usando los valores predeterminados.', 'info');
    }
  }

  async safeUpdateAssociationConfig(partial) {
    if (window.FirebaseUtils && typeof window.FirebaseUtils.updateAssociationConfig === 'function') {
      try {
        await window.FirebaseUtils.updateAssociationConfig(partial);
        return true;
      } catch (error) {
        console.warn('No se pudo sincronizar con Firebase. Aplicando cambios localmente.', error);
      }
    }
    return false;
  }

  slugify(value) {
    return value
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40);
  }

  escapeHtml(value = '') {
    const str = String(value);
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return str.replace(/[&<>"']/g, char => map[char]);
  }

  showFeedback(message, type = 'success') {
    if (window.app) {
      if (type === 'success' && typeof window.app.showSuccessMessage === 'function') {
        window.app.showSuccessMessage(message);
        return;
      }
      if (type === 'error' && typeof window.app.showErrorMessage === 'function') {
        window.app.showErrorMessage(message);
        return;
      }
    }
    alert(message);
  }

  renderDashboardContent() {
    const associationName = window.associationConfig?.associationName || 'Ayuntamiento de Cobreros';
    return `
      <div class="admin-dashboard">
        <div class="admin-welcome-card">
          <div class="admin-welcome-title">
            <span class="welcome-badge">Administrador</span>
            <h2>${associationName}</h2>
          </div>
          <p>Gestiona todos los módulos internos, añade nuevos administradores y controla la configuración del ayuntamiento.</p>
          <div class="admin-welcome-actions">
            <button class="btn btn-primary" onclick="adminPanel.showAssociationConfig()">Configurar ayuntamiento</button>
            <button class="btn btn-outline" onclick="adminPanel.showStatistics()">Ver estadísticas</button>
          </div>
        </div>
        <div class="admin-dashboard-grid">
          <div class="admin-dashboard-card">
            <div class="card-icon">👥</div>
            <div class="card-value">${this.adminUsers.length}/${this.maxAdmins}</div>
            <h3>Administradores</h3>
            <p>Controla quién puede acceder al panel de gestión.</p>
            <button class="btn btn-outline" onclick="adminPanel.showAdminManagement()">Gestionar administradores</button>
          </div>
          <div class="admin-dashboard-card">
            <div class="card-icon">⚙️</div>
            <div class="card-value">Identidad</div>
            <h3>Configuración</h3>
            <p>Actualiza nombre, eslogan, logo y datos de contacto.</p>
            <button class="btn btn-outline" onclick="adminPanel.showAssociationConfig()">Editar identidad</button>
          </div>
          <div class="admin-dashboard-card">
            <div class="card-icon">📊</div>
            <div class="card-value">Reportes</div>
            <h3>Estadísticas</h3>
            <p>Monitorea miembros, eventos, finanzas y actividad reciente.</p>
            <button class="btn btn-outline" onclick="adminPanel.showStatistics()">Abrir estadísticas</button>
          </div>
          <div class="admin-dashboard-card">
            <div class="card-icon">👤</div>
            <div class="card-value">Socios</div>
            <h3>Gestión de miembros</h3>
            <p>Administra socios, colaboradores y amigos registrados.</p>
            <button class="btn btn-outline" onclick="adminPanel.showUserManagement()">Gestionar usuarios</button>
          </div>
          <div class="admin-dashboard-card">
            <div class="card-icon">💰</div>
            <div class="card-value">Finanzas</div>
            <h3>Contabilidad</h3>
            <p>Registra ingresos, gastos y controla el balance general.</p>
            <button class="btn btn-outline" onclick="adminPanel.showAccounting()">Gestionar contabilidad</button>
          </div>
          <div class="admin-dashboard-card">
            <div class="card-icon">🔔</div>
            <div class="card-value">Alertas</div>
            <h3>Próximos pasos</h3>
            <p>Revisa tareas pendientes y próximas acciones clave.</p>
            <button class="btn btn-outline" onclick="adminPanel.showStatistics()">Ver detalles</button>
          </div>
        </div>
      </div>
    `;
  }

  refreshSectionData(section) {
    if (['dashboard', 'members'].includes(section)) {
      this.loadAdminUsers().then(() => {
        if (this.currentSection === section && this.sectionContentEl) {
          this.sectionContentEl.innerHTML = this.getSectionContent(section);
          this.attachSectionListeners(section);
          this.updateNavLabels();
        }
      });
    }
  }

  openPublicSection(anchor) {
    this.closePanel();
    setTimeout(() => {
      const target = document.querySelector(anchor);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 200);
  }

  async loadAdminUsers() {
    try {
      const users = await window.FirebaseUtils.read('users');
      this.adminUsers = users.filter(user => 
        user.role === 'admin' && !user.isHidden
      );
    } catch (error) {
      console.error('Error loading admin users:', error);
    }
  }

  showAdminManagement() {
    this.createModal('Gestión de Administradores', this.createAdminManagementContent());
  }

  createAdminManagementContent() {
    return `
      <div class="admin-management">
        <div class="admin-info">
          <h4>Administrador principal</h4>
          <div class="admin-card super-admin">
            <div class="admin-avatar">👑</div>
            <div class="admin-details">
              <strong>Administrador</strong>
              <p>editorturis@gmail.com</p>
              <span class="admin-badge super">Administrador</span>
            </div>
          </div>
        </div>
        
        <div class="admin-list">
          <h4>Administradores Adicionales (${this.adminUsers.length}/${this.maxAdmins})</h4>
          <div class="admins-grid">
            ${this.adminUsers.map(admin => this.createAdminCard(admin)).join('')}
            ${this.adminUsers.length < this.maxAdmins ? `
              <div class="admin-card add-admin" onclick="adminPanel.showAddAdminModal()">
                <div class="admin-avatar">➕</div>
                <div class="admin-details">
                  <strong>Agregar Admin</strong>
                  <p>Hacer clic para agregar</p>
                </div>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }

  createAdminCard(admin) {
    return `
      <div class="admin-card" data-admin-id="${admin.uid}">
        <div class="admin-avatar">${admin.name ? admin.name.charAt(0).toUpperCase() : 'A'}</div>
        <div class="admin-details">
          <strong>${admin.name || 'Administrador'}</strong>
          <p>${admin.email}</p>
          <span class="admin-badge">Administrador</span>
        </div>
        <div class="admin-actions">
          <button class="btn btn-sm btn-outline" onclick="adminPanel.editAdmin('${admin.uid}')">Editar</button>
          <button class="btn btn-sm btn-danger" onclick="adminPanel.removeAdmin('${admin.uid}')">Eliminar</button>
        </div>
      </div>
    `;
  }

  showAddAdminModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    
    modal.innerHTML = `
      <div class="modal-content">
        <span class="close">&times;</span>
        <h3>Agregar Administrador</h3>
        <form id="add-admin-form">
          <div class="form-group">
            <label>Email del administrador:</label>
            <input type="email" id="admin-email" required placeholder="admin@ejemplo.com">
          </div>
          
          <div class="form-group">
            <label>Nombre completo:</label>
            <input type="text" id="admin-name" required placeholder="Nombre del administrador">
          </div>
          
          <div class="form-group">
            <label>Contraseña temporal:</label>
            <div class="password-input-wrapper">
              <input type="password" id="admin-password" required placeholder="Contraseña temporal">
              <button type="button" class="toggle-password-btn" aria-label="Mostrar contraseña" data-target="admin-password">
                <span class="password-icon">👁️</span>
              </button>
            </div>
          </div>
          
          <div class="form-group">
            <label>Confirmar contraseña:</label>
            <div class="password-input-wrapper">
              <input type="password" id="admin-password-confirm" required placeholder="Confirmar contraseña">
              <button type="button" class="toggle-password-btn" aria-label="Mostrar contraseña" data-target="admin-password-confirm">
                <span class="password-icon">👁️</span>
              </button>
            </div>
          </div>
          
          <div class="modal-actions">
            <button type="submit" class="btn btn-primary">Crear Administrador</button>
            <button type="button" class="btn btn-outline" onclick="this.closest('.modal').remove()">Cancelar</button>
          </div>
        </form>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Handle form submission
    modal.querySelector('#add-admin-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      // Validar token CSRF
      if (window.csrfProtection && !window.csrfProtection.validateFormToken(e.target)) {
        alert('Token de seguridad inválido. Por favor, recarga la página.');
        return;
      }
      
      let email = document.getElementById('admin-email').value;
      let name = document.getElementById('admin-name').value;
      let password = document.getElementById('admin-password').value;
      let passwordConfirm = document.getElementById('admin-password-confirm').value;
      
      // Sanitizar inputs
      if (window.inputSanitizer) {
        name = window.inputSanitizer.sanitizeText(name, { maxLength: 100, trim: true });
        email = window.inputSanitizer.sanitizeEmail(email);
        password = window.inputSanitizer.sanitizeText(password, { maxLength: 128 });
        passwordConfirm = window.inputSanitizer.sanitizeText(passwordConfirm, { maxLength: 128 });
      }
      
      if (!email || !name) {
        alert('Por favor, completa todos los campos correctamente');
        return;
      }

      if (name.length < 2) {
        alert('El nombre debe tener al menos 2 caracteres');
        return;
      }
      
      if (password !== passwordConfirm) {
        alert('Las contraseñas no coinciden');
        return;
      }

      if (password.length < 6) {
        alert('La contraseña debe tener al menos 6 caracteres');
        return;
      }
      
      if (this.adminUsers.length >= this.maxAdmins) {
        alert('No se pueden agregar más administradores');
        return;
      }
      
      try {
        await this.createAdmin(email, name, password);
        alert('Administrador creado correctamente');
        modal.remove();
        this.loadAdminUsers();
        this.showAdminManagement();
      } catch (error) {
        alert('Error al crear administrador: ' + error.message);
      }
    });
    
    // Close modal handlers
    modal.querySelector('.close').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });

    // Setup password toggle buttons
    modal.querySelectorAll('.toggle-password-btn').forEach(button => {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const targetId = button.getAttribute('data-target');
        const passwordInput = document.getElementById(targetId);
        
        if (!passwordInput) return;
        
        const icon = button.querySelector('.password-icon');
        
        if (passwordInput.type === 'password') {
          passwordInput.type = 'text';
          button.classList.add('active');
          button.setAttribute('aria-label', 'Ocultar contraseña');
          if (icon) icon.textContent = '🙈';
        } else {
          passwordInput.type = 'password';
          button.classList.remove('active');
          button.setAttribute('aria-label', 'Mostrar contraseña');
          if (icon) icon.textContent = '👁️';
        }
      });
    });
  }

  async createAdmin(email, name, password) {
    try {
      // Create user account in Firebase Auth
      const user = await window.FirebaseUtils.signUp(email, password, {
        name: name,
        role: 'admin',
        isAdmin: true,
        isSuperAdmin: false,
        isActive: true,
        createdAt: new Date()
      });
      
      // Create document in 'admins' collection
      if (window.firebase && window.firebase.firestore && user.uid) {
        try {
          await window.firebase.firestore().collection('admins').doc(user.uid).set({
            name: name,
            email: email,
            isAdmin: true,
            isSuperAdmin: false,
            isActive: true,
            isHidden: false,
            createdAt: new Date(),
            createdBy: window.currentUser?.uid || 'system'
          });
          console.log('✅ Documento de administrador creado en colección admins');
        } catch (error) {
          console.warn('⚠️ No se pudo crear documento en admins, pero el usuario fue creado:', error);
        }
      }
      
      // Send welcome email with credentials
      await this.sendAdminWelcomeEmail(email, name, password);
      
      // Registrar en logs de auditoría
      if (window.auditLogSystem) {
        await window.auditLogSystem.log('ADMIN_CREATED', {
          adminEmail: email,
          adminName: name,
          adminId: user.uid,
          createdBy: window.currentUser?.uid || 'system',
          createdByEmail: window.currentUser?.email || 'system'
        }, window.currentUser?.uid, window.currentUser?.email);
      }
      
      return user;
      
    } catch (error) {
      console.error('Error creating admin:', error);
      
      // Registrar error en logs de auditoría
      if (window.auditLogSystem) {
        await window.auditLogSystem.log('ADMIN_CREATE_ERROR', {
          adminEmail: email,
          adminName: name,
          error: error.message
        });
      }
      
      throw error;
    }
  }

  async sendAdminWelcomeEmail(email, name, password) {
    try {
      const notification = {
        type: 'admin_welcome',
        recipientEmail: email,
        title: 'Bienvenido como Administrador',
        message: `Hola ${name}, has sido nombrado administrador del Ayuntamiento de Cobreros. Tus credenciales son: Email: ${email}, Contraseña: ${password}. Por favor, cambia tu contraseña después del primer acceso.`,
        data: {
          adminName: name,
          adminEmail: email,
          temporaryPassword: password
        },
        sentAt: new Date(),
        isRead: false
      };

      await window.FirebaseUtils.create('notifications', notification);
      
    } catch (error) {
      console.error('Error sending admin welcome email:', error);
    }
  }

  async removeAdmin(adminId) {
    if (!confirm('¿Estás seguro de que quieres eliminar este administrador?')) {
      return;
    }
    
    try {
      // Obtener información del administrador antes de eliminarlo
      let adminInfo = {};
      try {
        if (window.firebase && window.firebase.firestore) {
          const adminDoc = await window.firebase.firestore()
            .collection('admins')
            .doc(adminId)
            .get();
          if (adminDoc.exists) {
            adminInfo = adminDoc.data();
          }
        }
      } catch (error) {
        console.warn('No se pudo obtener info del admin:', error);
      }
      
      // Update user role to 'friend' instead of deleting
      await window.FirebaseUtils.update('users', adminId, {
        role: 'friend',
        removedAsAdminAt: new Date(),
        removedBy: window.authManager.getCurrentUser()?.uid
      });
      
      // Eliminar de colección admins
      if (window.firebase && window.firebase.firestore) {
        await window.firebase.firestore()
          .collection('admins')
          .doc(adminId)
          .delete();
      }
      
      // Registrar en logs de auditoría
      if (window.auditLogSystem) {
        await window.auditLogSystem.log('ADMIN_REMOVED', {
          adminId: adminId,
          adminEmail: adminInfo.email || 'unknown',
          adminName: adminInfo.name || 'unknown',
          removedBy: window.currentUser?.uid || 'system',
          removedByEmail: window.currentUser?.email || 'system'
        }, window.currentUser?.uid, window.currentUser?.email);
      }
      
      alert('Administrador eliminado correctamente');
      this.loadAdminUsers();
      this.showAdminManagement();
      
    } catch (error) {
      console.error('Error removing admin:', error);
      
      // Registrar error en logs de auditoría
      if (window.auditLogSystem) {
        await window.auditLogSystem.log('ADMIN_REMOVE_ERROR', {
          adminId: adminId,
          error: error.message
        });
      }
      
      alert('Error al eliminar administrador: ' + error.message);
    }
  }

  showAssociationConfig() {
    this.createModal('Configuración del Ayuntamiento', this.createAssociationConfigContent());
  }

  createAssociationConfigContent() {
    return `
      <div class="association-config">
        <form id="association-config-form">
          <div class="form-group">
            <label>Nombre del ayuntamiento:</label>
            <input type="text" id="config-association-name" value="${window.associationConfig.associationName}" required>
          </div>
          
          <div class="form-group">
            <label>Eslogan:</label>
            <input type="text" id="config-association-slogan" value="${window.associationConfig.associationSlogan}">
          </div>
          
          <div class="form-group">
            <label>Email de contacto:</label>
            <input type="email" id="config-association-email" placeholder="info@ayuntamientocobreros.com">
          </div>
          
          <div class="form-group">
            <label>Teléfono de contacto:</label>
            <input type="tel" id="config-association-phone" placeholder="+34 123 456 789">
          </div>
          
          <div class="form-group">
            <label>Dirección:</label>
            <textarea id="config-association-address" placeholder="Dirección completa del ayuntamiento"></textarea>
          </div>
          
          <div class="form-group">
            <label>Logo del ayuntamiento:</label>
            <input type="file" id="config-association-logo" accept="image/*">
            <small>Formatos permitidos: JPG, PNG, GIF (máx. 2MB)</small>
          </div>
          
          <div class="form-group">
            <label>Descripción:</label>
            <textarea id="config-association-description" placeholder="Descripción del ayuntamiento"></textarea>
          </div>
          
          <div class="form-group">
            <label>Redes sociales:</label>
            <input type="url" id="config-association-facebook" placeholder="https://facebook.com/ayuntamientocobreros">
            <input type="url" id="config-association-twitter" placeholder="https://twitter.com/ayuntamientocobreros">
            <input type="url" id="config-association-instagram" placeholder="https://instagram.com/ayuntamientocobreros">
          </div>
          
          <div class="modal-actions">
            <button type="submit" class="btn btn-primary">Guardar Configuración</button>
            <button type="button" class="btn btn-outline" onclick="this.closest('.modal').remove()">Cancelar</button>
          </div>
        </form>
      </div>
    `;
  }

  showStatistics() {
    this.createModal('Estadísticas del Sistema', this.createStatisticsContent());
  }

  async createStatisticsContent() {
    try {
      const memberStats = await window.memberManagement.getMemberStatistics();
      const eventStats = await window.eventsSystem.getEventStatistics();
      const financialSummary = await window.accountingSystem.getFinancialSummary(
        new Date(new Date().getFullYear(), 0, 1),
        new Date()
      );
      
      return `
        <div class="statistics-dashboard">
          <div class="stats-grid">
            <div class="stat-card">
              <h4>👥 Miembros</h4>
              <div class="stat-number">${memberStats.total}</div>
              <div class="stat-breakdown">
                <div>Socios: ${memberStats.byType.socio}</div>
                <div>Colaboradores: ${memberStats.byType.colaborador}</div>
                <div>Amigos: ${memberStats.byType.amigo}</div>
              </div>
            </div>
            
            <div class="stat-card">
              <h4>📅 Eventos</h4>
              <div class="stat-number">${eventStats.totalEvents}</div>
              <div class="stat-breakdown">
                <div>Próximos: ${eventStats.upcomingEvents}</div>
                <div>Pasados: ${eventStats.pastEvents}</div>
                <div>Inscripciones: ${eventStats.totalRegistrations}</div>
              </div>
            </div>
            
            <div class="stat-card">
              <h4>💰 Finanzas</h4>
              <div class="stat-number">${financialSummary.netBalance.toFixed(2)}€</div>
              <div class="stat-breakdown">
                <div>Ingresos: ${financialSummary.totalIncome.toFixed(2)}€</div>
                <div>Gastos: ${financialSummary.totalExpenses.toFixed(2)}€</div>
                <div>Transacciones: ${financialSummary.transactionCount}</div>
              </div>
            </div>
            
            <div class="stat-card">
              <h4>📊 Actividad</h4>
              <div class="stat-number">${memberStats.recentRegistrations}</div>
              <div class="stat-breakdown">
                <div>Nuevos miembros (30 días)</div>
                <div>Usuarios activos: ${memberStats.byStatus.active}</div>
                <div>Pagos pendientes: ${memberStats.byPayment.pending}</div>
              </div>
            </div>
          </div>
          
          <div class="charts-section">
            <h4>Gráficos de Actividad</h4>
            <div class="chart-placeholder">
              <p>📈 Gráficos de actividad mensual</p>
              <small>Los gráficos se implementarán con una librería de visualización</small>
            </div>
          </div>
        </div>
      `;
    } catch (error) {
      console.error('Error loading statistics:', error);
      return '<div class="error">Error al cargar las estadísticas</div>';
    }
  }

  showUserManagement() {
    this.createModal('Gestión de Usuarios', this.createUserManagementContent());
  }

  async createUserManagementContent() {
    try {
      const members = await window.FirebaseUtils.read('members');
      
      // Filtrar miembros válidos y asegurar que tengan propiedades requeridas
      const validMembers = (Array.isArray(members) ? members : [])
        .filter(member => member != null && typeof member === 'object')
        .map(member => ({
          id: member.id || '',
          name: member.name || 'Sin nombre',
          email: member.email || 'Sin email',
          type: member.type || 'amigo',
          isActive: member.isActive !== undefined ? member.isActive : true,
          registrationDate: member.registrationDate || new Date()
        }));
      
      return `
        <div class="user-management">
          <div class="user-filters">
            <select id="user-type-filter">
              <option value="">Todos los tipos</option>
              <option value="socio">Socios</option>
              <option value="colaborador">Colaboradores</option>
              <option value="amigo">Amigos</option>
            </select>
            
            <select id="user-status-filter">
              <option value="">Todos los estados</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </select>
            
            <input type="text" id="user-search" placeholder="Buscar por nombre o email...">
          </div>
          
          <div class="users-table">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Email</th>
                  <th>Tipo</th>
                  <th>Estado</th>
                  <th>Fecha Registro</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                ${validMembers.length > 0 ? validMembers.map(member => `
                  <tr>
                    <td>${this.escapeHtml(member.name)}</td>
                    <td>${this.escapeHtml(member.email)}</td>
                    <td><span class="type-badge ${this.escapeHtml(member.type)}">${this.escapeHtml(member.type)}</span></td>
                    <td><span class="status-badge ${member.isActive ? 'active' : 'inactive'}">${member.isActive ? 'Activo' : 'Inactivo'}</span></td>
                    <td>${new Date(member.registrationDate).toLocaleDateString()}</td>
                    <td>
                      <button class="btn btn-sm btn-outline" onclick="adminPanel.viewUserDetails('${this.escapeHtml(member.id)}')">Ver</button>
                      <button class="btn btn-sm btn-outline" onclick="adminPanel.editUser('${this.escapeHtml(member.id)}')">Editar</button>
                      <button class="btn btn-sm btn-danger" onclick="adminPanel.toggleUserStatus('${this.escapeHtml(member.id)}')">${member.isActive ? 'Desactivar' : 'Activar'}</button>
                    </td>
                  </tr>
                `).join('') : '<tr><td colspan="6" style="text-align: center;">No hay miembros registrados</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      `;
    } catch (error) {
      console.error('Error loading user management:', error);
      return '<div class="error">Error al cargar la gestión de usuarios</div>';
    }
  }

  async viewUserDetails(memberId) {
    if (!memberId) {
      this.showFeedback('ID de miembro no válido', 'error');
      return;
    }

    try {
      const members = await window.FirebaseUtils.read('members');
      const member = Array.isArray(members) 
        ? members.find(m => m && m.id === memberId)
        : null;

      if (!member) {
        this.showFeedback('Miembro no encontrado', 'error');
        return;
      }

      // Normalizar datos del miembro
      const memberData = {
        id: member.id || '',
        name: member.name || 'Sin nombre',
        email: member.email || 'Sin email',
        type: member.type || 'amigo',
        isActive: member.isActive !== undefined ? member.isActive : true,
        registrationDate: member.registrationDate || new Date(),
        phone: member.phone || 'No proporcionado',
        address: member.address || 'No proporcionado',
        paymentStatus: member.paymentStatus || 'pending',
        lastPaymentDate: member.lastPaymentDate || null,
        nextPaymentDate: member.nextPaymentDate || null,
        notes: member.notes || 'Sin notas',
        createdAt: member.createdAt || member.registrationDate || new Date(),
        updatedAt: member.updatedAt || null
      };

      const detailsContent = `
        <div class="user-details">
          <div class="user-details-header">
            <div class="user-avatar">${memberData.name.charAt(0).toUpperCase()}</div>
            <div class="user-header-info">
              <h3>${this.escapeHtml(memberData.name)}</h3>
              <p class="user-email">${this.escapeHtml(memberData.email)}</p>
              <div class="user-badges">
                <span class="type-badge ${this.escapeHtml(memberData.type)}">${this.escapeHtml(memberData.type)}</span>
                <span class="status-badge ${memberData.isActive ? 'active' : 'inactive'}">${memberData.isActive ? 'Activo' : 'Inactivo'}</span>
              </div>
            </div>
          </div>

          <div class="user-details-content">
            <div class="details-section">
              <h4>Información Personal</h4>
              <div class="details-grid">
                <div class="detail-item">
                  <label>Nombre completo:</label>
                  <span>${this.escapeHtml(memberData.name)}</span>
                </div>
                <div class="detail-item">
                  <label>Email:</label>
                  <span>${this.escapeHtml(memberData.email)}</span>
                </div>
                <div class="detail-item">
                  <label>Teléfono:</label>
                  <span>${this.escapeHtml(memberData.phone)}</span>
                </div>
                <div class="detail-item">
                  <label>Dirección:</label>
                  <span>${this.escapeHtml(memberData.address)}</span>
                </div>
              </div>
            </div>

            <div class="details-section">
              <h4>Información de Membresía</h4>
              <div class="details-grid">
                <div class="detail-item">
                  <label>Tipo de miembro:</label>
                  <span class="type-badge ${this.escapeHtml(memberData.type)}">${this.escapeHtml(memberData.type)}</span>
                </div>
                <div class="detail-item">
                  <label>Estado:</label>
                  <span class="status-badge ${memberData.isActive ? 'active' : 'inactive'}">${memberData.isActive ? 'Activo' : 'Inactivo'}</span>
                </div>
                <div class="detail-item">
                  <label>Estado de pago:</label>
                  <span class="payment-badge ${memberData.paymentStatus}">${this.escapeHtml(memberData.paymentStatus)}</span>
                </div>
                <div class="detail-item">
                  <label>Fecha de registro:</label>
                  <span>${new Date(memberData.registrationDate).toLocaleDateString('es-ES', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}</span>
                </div>
                ${memberData.lastPaymentDate ? `
                <div class="detail-item">
                  <label>Último pago:</label>
                  <span>${new Date(memberData.lastPaymentDate).toLocaleDateString('es-ES', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}</span>
                </div>
                ` : ''}
                ${memberData.nextPaymentDate ? `
                <div class="detail-item">
                  <label>Próximo pago:</label>
                  <span>${new Date(memberData.nextPaymentDate).toLocaleDateString('es-ES', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}</span>
                </div>
                ` : ''}
              </div>
            </div>

            ${memberData.notes && memberData.notes !== 'Sin notas' ? `
            <div class="details-section">
              <h4>Notas</h4>
              <p class="user-notes">${this.escapeHtml(memberData.notes)}</p>
            </div>
            ` : ''}

            <div class="details-section">
              <h4>Información del Sistema</h4>
              <div class="details-grid">
                <div class="detail-item">
                  <label>ID de miembro:</label>
                  <span class="user-id">${this.escapeHtml(memberData.id)}</span>
                </div>
                <div class="detail-item">
                  <label>Creado:</label>
                  <span>${new Date(memberData.createdAt).toLocaleString('es-ES')}</span>
                </div>
                ${memberData.updatedAt ? `
                <div class="detail-item">
                  <label>Última actualización:</label>
                  <span>${new Date(memberData.updatedAt).toLocaleString('es-ES')}</span>
                </div>
                ` : ''}
              </div>
            </div>
          </div>

          <div class="user-details-actions">
            <button class="btn btn-primary" onclick="adminPanel.editUser('${this.escapeHtml(memberData.id)}')">Editar Miembro</button>
            <button class="btn btn-outline" onclick="adminPanel.toggleUserStatus('${this.escapeHtml(memberData.id)}')">${memberData.isActive ? 'Desactivar' : 'Activar'}</button>
            <button class="btn btn-outline" onclick="this.closest('.modal').remove()">Cerrar</button>
          </div>
        </div>
      `;

      this.createModal('Detalles del Miembro', detailsContent);
    } catch (error) {
      console.error('Error loading user details:', error);
      this.showFeedback('Error al cargar los detalles del miembro', 'error');
    }
  }

  async editUser(memberId) {
    if (!memberId) {
      this.showFeedback('ID de miembro no válido', 'error');
      return;
    }

    try {
      const members = await window.FirebaseUtils.read('members');
      const member = Array.isArray(members) 
        ? members.find(m => m && m.id === memberId)
        : null;

      if (!member) {
        this.showFeedback('Miembro no encontrado', 'error');
        return;
      }

      // Normalizar datos del miembro
      const memberData = {
        id: member.id || '',
        name: member.name || '',
        email: member.email || '',
        type: member.type || 'amigo',
        isActive: member.isActive !== undefined ? member.isActive : true,
        phone: member.phone || '',
        address: member.address || '',
        paymentStatus: member.paymentStatus || 'pending',
        notes: member.notes || ''
      };

      const editContent = `
        <form id="edit-user-form" class="user-edit-form">
          <div class="form-section">
            <h4>Información Personal</h4>
            <div class="form-group">
              <label>Nombre completo: <span class="required">*</span></label>
              <input type="text" id="edit-user-name" value="${this.escapeHtml(memberData.name)}" required>
            </div>
            
            <div class="form-group">
              <label>Email: <span class="required">*</span></label>
              <input type="email" id="edit-user-email" value="${this.escapeHtml(memberData.email)}" required>
            </div>
            
            <div class="form-group">
              <label>Teléfono:</label>
              <input type="tel" id="edit-user-phone" value="${this.escapeHtml(memberData.phone)}" placeholder="+34 123 456 789">
            </div>
            
            <div class="form-group">
              <label>Dirección:</label>
              <textarea id="edit-user-address" rows="2" placeholder="Dirección completa">${this.escapeHtml(memberData.address)}</textarea>
            </div>
          </div>

          <div class="form-section">
            <h4>Información de Membresía</h4>
            <div class="form-group">
              <label>Tipo de miembro: <span class="required">*</span></label>
              <select id="edit-user-type" required>
                <option value="socio" ${memberData.type === 'socio' ? 'selected' : ''}>Socio</option>
                <option value="colaborador" ${memberData.type === 'colaborador' ? 'selected' : ''}>Colaborador</option>
                <option value="amigo" ${memberData.type === 'amigo' ? 'selected' : ''}>Amigo</option>
              </select>
            </div>
            
            <div class="form-group">
              <label>Estado:</label>
              <select id="edit-user-status">
                <option value="true" ${memberData.isActive ? 'selected' : ''}>Activo</option>
                <option value="false" ${!memberData.isActive ? 'selected' : ''}>Inactivo</option>
              </select>
            </div>
            
            <div class="form-group">
              <label>Estado de pago:</label>
              <select id="edit-user-payment-status">
                <option value="paid" ${memberData.paymentStatus === 'paid' ? 'selected' : ''}>Pagado</option>
                <option value="pending" ${memberData.paymentStatus === 'pending' ? 'selected' : ''}>Pendiente</option>
                <option value="overdue" ${memberData.paymentStatus === 'overdue' ? 'selected' : ''}>Vencido</option>
              </select>
            </div>
          </div>

          <div class="form-section">
            <h4>Notas Adicionales</h4>
            <div class="form-group">
              <label>Notas:</label>
              <textarea id="edit-user-notes" rows="4" placeholder="Notas adicionales sobre el miembro">${this.escapeHtml(memberData.notes)}</textarea>
            </div>
          </div>

          <div class="form-actions">
            <button type="submit" class="btn btn-primary">Guardar Cambios</button>
            <button type="button" class="btn btn-outline" onclick="adminPanel.viewUserDetails('${this.escapeHtml(memberData.id)}')">Ver Detalles</button>
            <button type="button" class="btn btn-outline" onclick="this.closest('.modal').remove()">Cancelar</button>
          </div>
        </form>
      `;

      this.createModal('Editar Miembro', editContent);

      // Configurar el formulario de edición
      const form = document.getElementById('edit-user-form');
      if (form) {
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          await this.saveUserChanges(memberId);
        });
      }
    } catch (error) {
      console.error('Error loading user for edit:', error);
      this.showFeedback('Error al cargar los datos del miembro', 'error');
    }
  }

  async saveUserChanges(memberId) {
    try {
      const submitBtn = document.querySelector('#edit-user-form [type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      const updates = {
        name: document.getElementById('edit-user-name').value.trim(),
        email: document.getElementById('edit-user-email').value.trim(),
        phone: document.getElementById('edit-user-phone').value.trim(),
        address: document.getElementById('edit-user-address').value.trim(),
        type: document.getElementById('edit-user-type').value,
        isActive: document.getElementById('edit-user-status').value === 'true',
        paymentStatus: document.getElementById('edit-user-payment-status').value,
        notes: document.getElementById('edit-user-notes').value.trim(),
        updatedAt: new Date()
      };

      // Validaciones
      if (!updates.name) {
        this.showFeedback('El nombre es obligatorio', 'error');
        if (submitBtn) submitBtn.disabled = false;
        return;
      }

      if (!updates.email || !updates.email.includes('@')) {
        this.showFeedback('El email es obligatorio y debe ser válido', 'error');
        if (submitBtn) submitBtn.disabled = false;
        return;
      }

      await window.FirebaseUtils.update('members', memberId, updates);
      
      this.showFeedback('Miembro actualizado correctamente', 'success');
      
      // Cerrar el modal de edición
      const modal = document.getElementById('admin-modal');
      if (modal) modal.remove();
      
      // Refrescar la tabla de usuarios si está abierta
      if (this.currentSection === 'members' || document.getElementById('admin-modal')) {
        // Si hay un modal de gestión de usuarios abierto, recargarlo
        const userManagementModal = document.querySelector('#admin-modal .user-management');
        if (userManagementModal) {
          this.showUserManagement();
        }
      }
    } catch (error) {
      console.error('Error saving user changes:', error);
      this.showFeedback('Error al guardar los cambios: ' + (error.message || 'Error desconocido'), 'error');
    } finally {
      const submitBtn = document.querySelector('#edit-user-form [type="submit"]');
      if (submitBtn) submitBtn.disabled = false;
    }
  }

  async toggleUserStatus(memberId) {
    if (!memberId) {
      this.showFeedback('ID de miembro no válido', 'error');
      return;
    }

    try {
      const members = await window.FirebaseUtils.read('members');
      const member = Array.isArray(members) 
        ? members.find(m => m && m.id === memberId)
        : null;

      if (!member) {
        this.showFeedback('Miembro no encontrado', 'error');
        return;
      }

      const currentStatus = member.isActive !== undefined ? member.isActive : true;
      const newStatus = !currentStatus;
      const action = newStatus ? 'activar' : 'desactivar';

      if (!confirm(`¿Estás seguro de que quieres ${action} a ${member.name || 'este miembro'}?`)) {
        return;
      }

      await window.FirebaseUtils.update('members', memberId, {
        isActive: newStatus,
        updatedAt: new Date(),
        statusChangedAt: new Date(),
        statusChangedBy: window.authManager?.getCurrentUser()?.uid || 'admin'
      });

      this.showFeedback(
        `Miembro ${newStatus ? 'activado' : 'desactivado'} correctamente`,
        'success'
      );

      // Cerrar modales abiertos
      const detailsModal = document.getElementById('admin-modal');
      if (detailsModal) {
        const isDetailsView = detailsModal.querySelector('.user-details');
        if (isDetailsView) {
          detailsModal.remove();
        }
      }

      // Refrescar la tabla de usuarios si está abierta
      const userManagementModal = document.querySelector('#admin-modal .user-management');
      if (userManagementModal) {
        this.showUserManagement();
      }
    } catch (error) {
      console.error('Error toggling user status:', error);
      this.showFeedback('Error al cambiar el estado del miembro: ' + (error.message || 'Error desconocido'), 'error');
    }
  }

  showAccounting() {
    this.createModal('Gestión de Contabilidad', this.createAccountingContent());
  }

  createAccountingContent() {
    return `
      <div class="accounting-management">
        <div class="accounting-actions">
          <button class="btn btn-primary" onclick="window.accountingSystem.showAddTransactionModal()">
            Nueva Transacción
          </button>
          <button class="btn btn-outline" onclick="window.accountingSystem.showFinancialReport()">
            Ver Reporte
          </button>
          <button class="btn btn-outline" onclick="adminPanel.showOutstandingPayments()">
            Pagos Pendientes
          </button>
        </div>
        
        <div class="accounting-summary">
          <h4>Resumen Financiero</h4>
          <div class="summary-cards">
            <div class="summary-card income">
              <h5>Ingresos del Mes</h5>
              <div class="amount" id="monthly-income">Cargando...</div>
            </div>
            <div class="summary-card expense">
              <h5>Gastos del Mes</h5>
              <div class="amount" id="monthly-expenses">Cargando...</div>
            </div>
            <div class="summary-card balance">
              <h5>Balance del Mes</h5>
              <div class="amount" id="monthly-balance">Cargando...</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  showSystemConfig() {
    this.createModal('Configuración del Sistema', this.createSystemConfigContent());
  }

  createSystemConfigContent() {
    return `
      <div class="system-config">
        <div class="config-section">
          <h4>Configuración General</h4>
          <form id="system-config-form">
            <div class="form-group">
              <label>
                <input type="checkbox" id="enable-registrations" checked>
                Permitir nuevos registros
              </label>
            </div>
            
            <div class="form-group">
              <label>
                <input type="checkbox" id="enable-events" checked>
                Habilitar sistema de eventos
              </label>
            </div>
            
            <div class="form-group">
              <label>
                <input type="checkbox" id="enable-store" checked>
                Habilitar tienda online
              </label>
            </div>
            
            <div class="form-group">
              <label>
                <input type="checkbox" id="enable-notifications" checked>
                Habilitar notificaciones
              </label>
            </div>
            
            <div class="form-group">
              <label>Cuota anual de socio (€):</label>
              <input type="number" id="membership-fee" value="25" min="0" step="0.01">
            </div>
            
            <div class="form-group">
              <label>Días de gracia para pagos:</label>
              <input type="number" id="payment-grace-days" value="30" min="0">
            </div>
            
            <div class="modal-actions">
              <button type="submit" class="btn btn-primary">Guardar Configuración</button>
              <button type="button" class="btn btn-outline" onclick="this.closest('.modal').remove()">Cancelar</button>
            </div>
          </form>
        </div>
        
        <div class="config-section">
          <h4>Mantenimiento</h4>
          <div class="maintenance-actions">
            <button class="btn btn-warning" onclick="adminPanel.backupData()">
              Crear Respaldo
            </button>
            <button class="btn btn-danger" onclick="adminPanel.clearCache()">
              Limpiar Caché
            </button>
            <button class="btn btn-outline" onclick="adminPanel.exportData()">
              Exportar Datos
            </button>
          </div>
        </div>
      </div>
    `;
  }

  createModal(title, content) {
    // Remove existing modal if any
    const existingModal = document.getElementById('admin-modal');
    if (existingModal) {
      existingModal.remove();
    }
    
    const modal = document.createElement('div');
    modal.id = 'admin-modal';
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.style.maxWidth = '900px';
    
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>${title}</h3>
          <span class="close">&times;</span>
        </div>
        <div class="modal-body">
          ${content}
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close modal handlers
    modal.querySelector('.close').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
    
    // Handle form submissions
    this.setupModalForms(modal);
  }

  setupModalForms(modal) {
    // Association config form
    const associationForm = modal.querySelector('#association-config-form');
    if (associationForm) {
      associationForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.saveAssociationConfig();
      });
    }
    
    // System config form
    const systemForm = modal.querySelector('#system-config-form');
    if (systemForm) {
      systemForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.saveSystemConfig();
      });
    }
  }

  async saveAssociationConfig() {
    try {
      const config = {
        name: document.getElementById('config-association-name').value,
        slogan: document.getElementById('config-association-slogan').value,
        email: document.getElementById('config-association-email').value,
        phone: document.getElementById('config-association-phone').value,
        address: document.getElementById('config-association-address').value,
        description: document.getElementById('config-association-description').value,
        socialMedia: {
          facebook: document.getElementById('config-association-facebook').value,
          twitter: document.getElementById('config-association-twitter').value,
          instagram: document.getElementById('config-association-instagram').value
        }
      };
      
      await window.FirebaseUtils.updateAssociationConfig(config);
      alert('Configuración guardada correctamente');
      
    } catch (error) {
      console.error('Error saving association config:', error);
      alert('Error al guardar la configuración');
    }
  }

  async saveSystemConfig() {
    try {
      const config = {
        enableRegistrations: document.getElementById('enable-registrations').checked,
        enableEvents: document.getElementById('enable-events').checked,
        enableStore: document.getElementById('enable-store').checked,
        enableNotifications: document.getElementById('enable-notifications').checked,
        membershipFee: parseFloat(document.getElementById('membership-fee').value),
        paymentGraceDays: parseInt(document.getElementById('payment-grace-days').value)
      };
      
      await window.FirebaseUtils.create('system_config', config);
      alert('Configuración del sistema guardada');
      
    } catch (error) {
      console.error('Error saving system config:', error);
      alert('Error al guardar la configuración del sistema');
    }
  }

  async backupData() {
    try {
      alert('Función de respaldo en desarrollo');
    } catch (error) {
      console.error('Error creating backup:', error);
    }
  }

  async clearCache() {
    try {
      localStorage.clear();
      sessionStorage.clear();
      alert('Caché limpiado correctamente');
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  async exportData() {
    try {
      alert('Función de exportación en desarrollo');
    } catch (error) {
      console.error('Error exporting data:', error);
    }
  }
}

// Initialize admin panel when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.adminPanel = new AdminPanel();
});

// Export for global access
window.AdminPanel = AdminPanel;
