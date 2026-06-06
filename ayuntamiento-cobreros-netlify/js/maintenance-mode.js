/* eslint-env browser */
/* global CONFIG, logAuditAction */
// ===== MODO MANTENIMIENTO =====
// Gestión centralizada del modo mantenimiento con soporte de accesibilidad y auditoría
function maintenanceLogInfo(...args) {
  if (typeof window !== 'undefined' && window.Logger && typeof window.Logger.log === 'function') {
    window.Logger.log(...args);
  }
}

function maintenanceLogError(...args) {
  if (typeof window !== 'undefined' && window.Logger && typeof window.Logger.error === 'function') {
    window.Logger.error(...args);
  }
}

const MAINTENANCE_STORAGE_KEY = 'maintenance_settings';

const DEFAULT_MAINTENANCE_SETTINGS = {
  enabled: false,
  message: 'Estamos realizando labores de mantenimiento. Por favor, vuelva a intentarlo más tarde. Disculpe las molestias.',
  showContactInfo: true,
  showEstimatedTime: false,
  estimatedTime: '',
  allowAdminAccess: true,
  bannerColor: '#f97316',
  overlayColor: 'rgba(15, 23, 42, 0.92)',
  lastUpdated: null,
  updatedBy: null
};

let maintenanceSettings = null;

function updateMaintenanceLastUpdatedLabel() {
  const lastUpdatedEl = document.getElementById('maintenanceLastUpdated');
  if (!lastUpdatedEl) return;

  const settings = getMaintenanceSettings();
  if (settings.lastUpdated) {
    const date = new Date(settings.lastUpdated);
    lastUpdatedEl.textContent = `Última actualización: ${date.toLocaleString()} por ${settings.updatedBy || 'Administrador'}`;
  } else {
    lastUpdatedEl.textContent = 'Nunca se ha activado el modo mantenimiento.';
  }
}

function getMaintenanceSettings() {
  if (maintenanceSettings) return maintenanceSettings;

  try {
    const saved = localStorage.getItem(MAINTENANCE_STORAGE_KEY);
    if (saved) {
      maintenanceSettings = {
        ...DEFAULT_MAINTENANCE_SETTINGS,
        ...JSON.parse(saved)
      };
    } else {
      maintenanceSettings = { ...DEFAULT_MAINTENANCE_SETTINGS };
    }
  } catch (error) {
    maintenanceLogError('❌ Error cargando configuración de mantenimiento:', error);
    maintenanceSettings = { ...DEFAULT_MAINTENANCE_SETTINGS };
  }

  return maintenanceSettings;
}

function saveMaintenanceSettings(newSettings = {}, options = {}) {
  maintenanceSettings = {
    ...DEFAULT_MAINTENANCE_SETTINGS,
    ...getMaintenanceSettings(),
    ...newSettings,
    lastUpdated: new Date().toISOString(),
    updatedBy: currentUser?.email || 'Sistema'
  };

  try {
    localStorage.setItem(MAINTENANCE_STORAGE_KEY, JSON.stringify(maintenanceSettings));
    maintenanceLogInfo('🛠️ Configuración de mantenimiento guardada:', maintenanceSettings);
  } catch (error) {
    maintenanceLogError('❌ Error guardando configuración de mantenimiento:', error);
  }

  applyMaintenanceMode();
  if (!options.skipUI) {
    updateMaintenanceModeUI();
  }
}

function applyMaintenanceMode() {
  const settings = getMaintenanceSettings();
  const isMaintenanceActive = !!settings.enabled;

  // Actualizar clase global
  if (isMaintenanceActive) {
    document.documentElement.classList.add('maintenance-active');
  } else {
    document.documentElement.classList.remove('maintenance-active');
  }

  // Gestionar overlay para usuarios
  let overlay = document.getElementById('maintenanceOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'maintenanceOverlay';
    overlay.setAttribute('role', 'alert');
    overlay.setAttribute('aria-live', 'assertive');
    overlay.innerHTML = `
            <div class="maintenance-overlay-content" tabindex="-1">
                <div class="maintenance-overlay-icon">🛠️</div>
                <h1>Estamos en mantenimiento</h1>
                <p class="maintenance-message"></p>
                <p class="maintenance-estimate" style="display: none;"></p>
                <p class="maintenance-contact" style="display: none;">
                    Puede contactar con el ayuntamiento en <strong>${CONFIG?.municipality?.email || 'aytocobreros@gmail.com'}</strong> o llamando al <strong>${CONFIG?.municipality?.phone || '980 62 26 18'}</strong>.
                </p>
            </div>
        `;
    document.body.appendChild(overlay);
  }

  overlay.style.backgroundColor = settings.overlayColor || DEFAULT_MAINTENANCE_SETTINGS.overlayColor;
  const messageEl = overlay.querySelector('.maintenance-message');
  const estimateEl = overlay.querySelector('.maintenance-estimate');
  const contactEl = overlay.querySelector('.maintenance-contact');

  if (messageEl) {
    messageEl.textContent = settings.message || DEFAULT_MAINTENANCE_SETTINGS.message;
  }

  if (estimateEl) {
    if (settings.showEstimatedTime && settings.estimatedTime) {
      estimateEl.textContent = `🕒 Tiempo estimado: ${settings.estimatedTime}`;
      estimateEl.style.display = 'block';
    } else {
      estimateEl.style.display = 'none';
    }
  }

  if (contactEl) {
    contactEl.style.display = settings.showContactInfo ? 'block' : 'none';
  }

  overlay.classList.toggle('visible', isMaintenanceActive && !isAdmin && !isSuperAdmin);

  if (isMaintenanceActive && !isAdmin && !isSuperAdmin) {
    overlay.style.display = 'flex';
    overlay.querySelector('.maintenance-overlay-content')?.focus();
  } else {
    overlay.style.display = 'none';
  }

  // Banner para administradores
  let adminBanner = document.getElementById('maintenanceAdminBanner');
  if (!adminBanner) {
    adminBanner = document.createElement('div');
    adminBanner.id = 'maintenanceAdminBanner';
    adminBanner.innerHTML = `
            <div class="maintenance-admin-info">
                <span class="maintenance-admin-icon">🛠️</span>
                <div class="maintenance-admin-text">
                    <strong>Modo mantenimiento activo.</strong>
                    <span class="maintenance-admin-message"></span>
                </div>
            </div>
            <div class="maintenance-admin-actions">
                <button class="btn btn-success btn-sm" type="button" onclick="disableMaintenanceMode()">Desactivar</button>
            </div>
        `;
    document.body.appendChild(adminBanner);
  }

  const adminMessageEl = adminBanner.querySelector('.maintenance-admin-message');
  if (adminMessageEl) {
    adminMessageEl.textContent = settings.message || DEFAULT_MAINTENANCE_SETTINGS.message;
  }

  adminBanner.style.backgroundColor = settings.bannerColor || DEFAULT_MAINTENANCE_SETTINGS.bannerColor;
  adminBanner.style.display = isMaintenanceActive && (isAdmin || isSuperAdmin) ? 'flex' : 'none';

  // Desactivar interacciones no críticas para usuarios cuando está activo
  document.body.classList.toggle('maintenance-lock', isMaintenanceActive && !isAdmin && !isSuperAdmin);
}

function updateMaintenanceModeUI() {
  const settings = getMaintenanceSettings();

  const toggle = document.getElementById('maintenanceToggle');
  const messageInput = document.getElementById('maintenanceMessage');
  const contactCheckbox = document.getElementById('maintenanceShowContact');
  const estimateCheckbox = document.getElementById('maintenanceShowEstimate');
  const estimateInput = document.getElementById('maintenanceEstimate');
  const lastUpdatedEl = document.getElementById('maintenanceLastUpdated');

  if (!toggle || !messageInput) return;

  toggle.checked = !!settings.enabled;
  messageInput.value = settings.message || DEFAULT_MAINTENANCE_SETTINGS.message;

  if (contactCheckbox) {
    contactCheckbox.checked = !!settings.showContactInfo;
  }

  if (estimateCheckbox) {
    estimateCheckbox.checked = !!settings.showEstimatedTime;
  }

  if (estimateInput) {
    estimateInput.value = settings.estimatedTime || '';
    estimateInput.disabled = !settings.showEstimatedTime;
  }

  if (lastUpdatedEl) {
    if (settings.lastUpdated) {
      const date = new Date(settings.lastUpdated);
      lastUpdatedEl.textContent = `Última actualización: ${date.toLocaleString()} por ${settings.updatedBy || 'Administrador'}`;
    } else {
      lastUpdatedEl.textContent = 'Nunca se ha activado el modo mantenimiento.';
    }
  }
}

function initializeMaintenanceModeUI() {
  const toggle = document.getElementById('maintenanceToggle');
  const messageInput = document.getElementById('maintenanceMessage');
  const contactCheckbox = document.getElementById('maintenanceShowContact');
  const estimateCheckbox = document.getElementById('maintenanceShowEstimate');
  const estimateInput = document.getElementById('maintenanceEstimate');

  if (toggle) {
    toggle.addEventListener('change', () => {
      const enabled = toggle.checked;
      saveMaintenanceSettings({ enabled });

      if (typeof logAuditAction === 'function' && isAdmin) {
        logAuditAction(enabled ? 'MAINTENANCE_ENABLED' : 'MAINTENANCE_DISABLED', {
          message: getMaintenanceSettings().message
        });
      }

      if (typeof showNotification === 'function') {
        showNotification(enabled ? 'Modo mantenimiento activado' : 'Modo mantenimiento desactivado', enabled ? 'warning' : 'success');
      }
    });
  }

  if (messageInput) {
    messageInput.addEventListener('input', (e) => {
      saveMaintenanceSettings({ message: e.target.value }, { skipUI: true });
      updateMaintenanceLastUpdatedLabel();
    });
  }

  if (contactCheckbox) {
    contactCheckbox.addEventListener('change', (e) => {
      saveMaintenanceSettings({ showContactInfo: e.target.checked });
    });
  }

  if (estimateCheckbox) {
    estimateCheckbox.addEventListener('change', (e) => {
      const checked = e.target.checked;
      saveMaintenanceSettings({ showEstimatedTime: checked });
      if (estimateInput) {
        estimateInput.disabled = !checked;
        if (!checked) {
          estimateInput.value = '';
          saveMaintenanceSettings({ estimatedTime: '' });
        }
      }
    });
  }

  if (estimateInput) {
    estimateInput.addEventListener('input', (e) => {
      saveMaintenanceSettings({ estimatedTime: e.target.value }, { skipUI: true });
      updateMaintenanceLastUpdatedLabel();
    });
  }

  updateMaintenanceModeUI();
  applyMaintenanceMode();
}

function disableMaintenanceMode() {
  saveMaintenanceSettings({ enabled: false });
}

// Reaplicar mantenimiento cuando cambia la visibilidad (por si el admin se conecta)
if (typeof window !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      applyMaintenanceMode();
    }
  });

  window.addEventListener('storage', (event) => {
    if (event.key === MAINTENANCE_STORAGE_KEY) {
      maintenanceSettings = null;
      updateMaintenanceModeUI();
      applyMaintenanceMode();
    }
  });

  window.getMaintenanceSettings = getMaintenanceSettings;
  window.saveMaintenanceSettings = saveMaintenanceSettings;
  window.applyMaintenanceMode = applyMaintenanceMode;
  window.initializeMaintenanceModeUI = initializeMaintenanceModeUI;
  window.disableMaintenanceMode = disableMaintenanceMode;
}


