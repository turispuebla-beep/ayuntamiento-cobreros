/* eslint-env browser */
/* global escapeHtml */
// ===== ESTADOS DE CARGA VISUALES =====
// Sistema de indicadores de carga para mejorar UX

/**
 * Muestra un estado de carga en un contenedor
 * @param {string|HTMLElement} container - ID del contenedor o elemento DOM
 * @param {string} message - Mensaje a mostrar
 * @param {string} size - Tamaño: 'small', 'medium', 'large'
 */
function showLoadingState(container, message = 'Cargando...', size = 'medium') {
  const containerEl = typeof container === 'string' 
    ? document.getElementById(container) 
    : container;
    
  if (!containerEl) {
    Logger.warn('Contenedor no encontrado para mostrar loading:', container);
    return null;
  }
    
  // Guardar contenido original si no existe
  if (!containerEl.dataset.originalContent) {
    containerEl.dataset.originalContent = containerEl.innerHTML;
  }
    
  const sizeClass = `loading-${size}`;
  const spinnerSize = size === 'small' ? '20px' : size === 'large' ? '60px' : '40px';
    
  containerEl.innerHTML = `
        <div class="loading-state ${sizeClass}" style="
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 2rem;
            text-align: center;
            min-height: 100px;
        ">
            <div class="spinner" style="
                width: ${spinnerSize};
                height: ${spinnerSize};
                border: 3px solid rgba(59, 130, 246, 0.1);
                border-top-color: var(--primary-color, #3b82f6);
                border-radius: 50%;
                animation: spin 0.8s linear infinite;
                margin-bottom: 1rem;
            "></div>
            <p style="
                color: var(--text-secondary, #6b7280);
                font-size: ${size === 'small' ? '0.875rem' : '1rem'};
                margin: 0;
            ">${escapeHtml(message)}</p>
        </div>
    `;
    
  // Agregar animación si no existe
  if (!document.getElementById('spinner-animation-style')) {
    const style = document.createElement('style');
    style.id = 'spinner-animation-style';
    style.textContent = `
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
        `;
    document.head.appendChild(style);
  }
    
  return containerEl;
}

/**
 * Oculta el estado de carga y restaura el contenido original
 * @param {string|HTMLElement} container - ID del contenedor o elemento DOM
 */
function hideLoadingState(container) {
  const containerEl = typeof container === 'string' 
    ? document.getElementById(container) 
    : container;
    
  if (!containerEl) return;
    
  // Restaurar contenido original si existe
  if (containerEl.dataset.originalContent) {
    containerEl.innerHTML = containerEl.dataset.originalContent;
    delete containerEl.dataset.originalContent;
  } else {
    containerEl.innerHTML = '';
  }
}

/**
 * Muestra un botón con estado de carga
 * @param {HTMLElement} button - Botón a modificar
 * @param {string} loadingText - Texto mientras carga
 */
function setButtonLoading(button, loadingText = 'Cargando...') {
  if (!button) return;
    
  // Guardar estado original
  if (!button.dataset.originalHTML) {
    button.dataset.originalHTML = button.innerHTML;
    button.dataset.originalDisabled = button.disabled;
  }
    
  button.disabled = true;
  button.innerHTML = `
        <span style="display: inline-flex; align-items: center; gap: 0.5rem;">
            <span style="
                width: 16px;
                height: 16px;
                border: 2px solid rgba(255,255,255,0.3);
                border-top-color: white;
                border-radius: 50%;
                animation: spin 0.8s linear infinite;
                display: inline-block;
            "></span>
            ${escapeHtml(loadingText)}
        </span>
    `;
}

/**
 * Restaura el botón a su estado original
 * @param {HTMLElement} button - Botón a restaurar
 */
function setButtonNormal(button) {
  if (!button) return;
    
  if (button.dataset.originalHTML) {
    button.innerHTML = button.dataset.originalHTML;
    button.disabled = button.dataset.originalDisabled === 'true';
    delete button.dataset.originalHTML;
    delete button.dataset.originalDisabled;
  } else {
    button.disabled = false;
  }
}

/**
 * Muestra un overlay de carga sobre toda la página
 * @param {string} message - Mensaje a mostrar
 */
function showFullPageLoading(message = 'Cargando...') {
  // Evitar múltiples overlays
  if (document.getElementById('full-page-loading')) {
    return;
  }
    
  const overlay = document.createElement('div');
  overlay.id = 'full-page-loading';
  overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        backdrop-filter: blur(4px);
    `;
    
  overlay.innerHTML = `
        <div style="
            background: white;
            padding: 2rem;
            border-radius: 12px;
            text-align: center;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        ">
            <div style="
                width: 50px;
                height: 50px;
                border: 4px solid rgba(59, 130, 246, 0.1);
                border-top-color: var(--primary-color, #3b82f6);
                border-radius: 50%;
                animation: spin 0.8s linear infinite;
                margin: 0 auto 1rem;
            "></div>
            <p style="
                color: var(--text-primary, #1f2937);
                font-size: 1rem;
                margin: 0;
            ">${escapeHtml(message)}</p>
        </div>
    `;
    
  document.body.appendChild(overlay);
}

/**
 * Oculta el overlay de carga de toda la página
 */
function hideFullPageLoading() {
  const overlay = document.getElementById('full-page-loading');
  if (overlay) {
    overlay.remove();
  }
}

// Exportar funciones
if (typeof window !== 'undefined') {
  window.showLoadingState = showLoadingState;
  window.hideLoadingState = hideLoadingState;
  window.setButtonLoading = setButtonLoading;
  window.setButtonNormal = setButtonNormal;
  window.showFullPageLoading = showFullPageLoading;
  window.hideFullPageLoading = hideFullPageLoading;
}

