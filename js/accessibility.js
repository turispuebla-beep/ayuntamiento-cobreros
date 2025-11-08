// ===== MEJORAS DE ACCESIBILIDAD (A11y) =====
// Módulo completo para mejorar la accesibilidad del sitio

// Crear región ARIA live para anuncios
let ariaLiveRegion = null;

/**
 * Inicializa las regiones ARIA live para anuncios
 */
function initAriaLiveRegions() {
  // Crear región para alertas importantes
  if (!document.getElementById('aria-live-alert')) {
    ariaLiveRegion = document.createElement('div');
    ariaLiveRegion.id = 'aria-live-alert';
    ariaLiveRegion.setAttribute('role', 'alert');
    ariaLiveRegion.setAttribute('aria-live', 'assertive');
    ariaLiveRegion.setAttribute('aria-atomic', 'true');
    ariaLiveRegion.className = 'sr-only';
    document.body.appendChild(ariaLiveRegion);
  }
    
  // Crear región para actualizaciones de estado
  if (!document.getElementById('aria-live-status')) {
    const statusRegion = document.createElement('div');
    statusRegion.id = 'aria-live-status';
    statusRegion.setAttribute('role', 'status');
    statusRegion.setAttribute('aria-live', 'polite');
    statusRegion.setAttribute('aria-atomic', 'true');
    statusRegion.className = 'sr-only';
    document.body.appendChild(statusRegion);
  }
}

/**
 * Anuncia un mensaje a los lectores de pantalla
 * @param {string} message - Mensaje a anunciar
 * @param {string} type - Tipo: 'alert' (urgente) o 'status' (informativo)
 */
function announceToScreenReader(message, type = 'status') {
  // Prevenir recursión infinita
  if (announceToScreenReader._calling) {
    return;
  }
  announceToScreenReader._calling = true;
    
  try {
    if (!ariaLiveRegion) {
      initAriaLiveRegions();
    }
        
    const regionId = type === 'alert' ? 'aria-live-alert' : 'aria-live-status';
    const region = document.getElementById(regionId);
        
    if (region) {
      // Limpiar mensaje anterior
      region.textContent = '';
            
      // Agregar nuevo mensaje después de un breve delay para asegurar que se anuncie
      setTimeout(() => {
        region.textContent = message;
                
        // Limpiar después de 1 segundo para permitir nuevos anuncios
        setTimeout(() => {
          region.textContent = '';
          announceToScreenReader._calling = false;
        }, 1000);
      }, 100);
    } else {
      announceToScreenReader._calling = false;
    }
  } catch (error) {
    announceToScreenReader._calling = false;
    if (window && window.Logger && typeof window.Logger.error === 'function') {
      window.Logger.error('Error en announceToScreenReader:', error);
    }
  }
}

/**
 * Mejora la función showNotification con accesibilidad
 * @param {string} message - Mensaje a mostrar
 * @param {string} type - Tipo: 'success', 'error', 'warning', 'info'
 */
function showAccessibleNotification(message, type = 'info') {
  // Prevenir recursión infinita: usar flag
  if (showAccessibleNotification._calling) {
    return;
  }
  showAccessibleNotification._calling = true;
    
  try {
    // Determinar el tipo de anuncio ARIA
    const ariaType = (type === 'error' || type === 'warning') ? 'alert' : 'status';
        
    // Anunciar a lectores de pantalla
    if (typeof announceToScreenReader === 'function') {
      announceToScreenReader(message, ariaType);
    }
        
    // Crear notificación directamente (no llamar a showNotification para evitar recursión)
    const notification = document.createElement('div');
    notification.className = `toast toast-${type}`;
    notification.setAttribute('role', ariaType);
    notification.setAttribute('aria-live', ariaType === 'alert' ? 'assertive' : 'polite');
    notification.setAttribute('aria-atomic', 'true');
    notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#3b82f6'};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
            z-index: 3000;
            animation: slideIn 0.3s ease;
            max-width: 400px;
        `;
    notification.textContent = message;
    document.body.appendChild(notification);
        
    setTimeout(() => {
      notification.remove();
    }, 3000);
  } finally {
    showAccessibleNotification._calling = false;
  }
    
  // Código antiguo (comentado para evitar recursión)
  /*
    if (typeof showNotification === 'function') {
        showNotification(message, type);
    } else {
        // Fallback: crear notificación básica
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.setAttribute('role', ariaType);
        notification.setAttribute('aria-live', ariaType === 'alert' ? 'assertive' : 'polite');
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Remover después de 5 segundos
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }
    */
}

/**
 * Implementa focus trap completo en un modal
 * @param {HTMLElement} modal - Elemento del modal
 */
function setupFocusTrap(modal) {
  if (!modal) return;
    
  const focusableElements = modal.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
    
  if (focusableElements.length === 0) return;
    
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];
    
  // Función para manejar Tab
  const handleTabKey = (e) => {
    if (e.key !== 'Tab') return;
        
    if (e.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  };
    
  // Agregar listener
  modal.addEventListener('keydown', handleTabKey);
    
  // Guardar referencia para poder removerlo después
  modal._focusTrapHandler = handleTabKey;
}

/**
 * Remueve el focus trap de un modal
 * @param {HTMLElement} modal - Elemento del modal
 */
function removeFocusTrap(modal) {
  if (!modal || !modal._focusTrapHandler) return;
    
  modal.removeEventListener('keydown', modal._focusTrapHandler);
  delete modal._focusTrapHandler;
}

/**
 * Valida un campo de formulario y actualiza atributos ARIA
 * @param {HTMLElement} field - Campo a validar
 * @param {boolean} isValid - Si el campo es válido
 * @param {string} errorMessage - Mensaje de error (opcional)
 */
function setFieldValidity(field, isValid, errorMessage = '') {
  if (!field) return;
    
  const errorId = field.id + '-error';
  let errorElement = document.getElementById(errorId);
    
  // Crear elemento de error si no existe
  if (!errorElement && !isValid) {
    errorElement = document.createElement('span');
    errorElement.id = errorId;
    errorElement.className = 'error-message';
    errorElement.setAttribute('role', 'alert');
    errorElement.setAttribute('aria-live', 'polite');
        
    // Insertar después del campo
    field.parentNode.insertBefore(errorElement, field.nextSibling);
  }
    
  // Actualizar atributos ARIA
  field.setAttribute('aria-invalid', !isValid);
  field.setAttribute('aria-describedby', isValid ? '' : errorId);
    
  // Actualizar mensaje de error
  if (errorElement) {
    if (isValid) {
      errorElement.textContent = '';
      errorElement.style.display = 'none';
    } else {
      errorElement.textContent = errorMessage;
      errorElement.style.display = 'block';
    }
  }
    
  // Agregar clase visual
  if (isValid) {
    field.classList.remove('invalid');
    field.classList.add('valid');
  } else {
    field.classList.remove('valid');
    field.classList.add('invalid');
  }
}

/**
 * Mejora la navegación por teclado en componentes dinámicos
 * @param {HTMLElement} container - Contenedor del componente
 * @param {string} itemSelector - Selector de items navegables
 */
function setupKeyboardNavigation(container, itemSelector = '.nav-item, .card, button') {
  if (!container) return;
    
  const items = Array.from(container.querySelectorAll(itemSelector));
    
  container.addEventListener('keydown', (e) => {
    const currentIndex = items.indexOf(document.activeElement);
        
    switch (e.key) {
    case 'ArrowDown':
    case 'ArrowRight': {
      e.preventDefault();
      const nextIndex = (currentIndex + 1) % items.length;
      items[nextIndex]?.focus();
      break;
    }
    case 'ArrowUp':
    case 'ArrowLeft': {
      e.preventDefault();
      const prevIndex = (currentIndex - 1 + items.length) % items.length;
      items[prevIndex]?.focus();
      break;
    }
    case 'Home': {
      e.preventDefault();
      items[0]?.focus();
      break;
    }
    case 'End': {
      e.preventDefault();
      items[items.length - 1]?.focus();
      break;
    }
    }
  });
}

/**
 * Agrega soporte para modo de alto contraste
 */
function setupHighContrastMode() {
  // Detectar preferencia de alto contraste
  if (window.matchMedia) {
    const prefersHighContrast = window.matchMedia('(prefers-contrast: high)');
        
    const handleContrastChange = (e) => {
      if (e.matches) {
        document.documentElement.classList.add('high-contrast');
      } else {
        document.documentElement.classList.remove('high-contrast');
      }
    };
        
    // Aplicar inicialmente
    handleContrastChange(prefersHighContrast);
        
    // Escuchar cambios
    prefersHighContrast.addEventListener('change', handleContrastChange);
  }
    
  // Se eliminó el toggle manual para evitar confusión con el buscador.
}

/**
 * Mejora la accesibilidad de botones con solo iconos
 * @param {HTMLElement} button - Botón a mejorar
 */
function improveIconButtonAccessibility(button) {
  if (!button) return;
    
  // Si el botón solo tiene un icono y no tiene aria-label
  const hasIcon = button.querySelector('i, svg, [class*="icon"]');
  const hasText = button.textContent.trim().length > 0;
  const hasAriaLabel = button.getAttribute('aria-label');
    
  if (hasIcon && !hasText && !hasAriaLabel) {
    // Intentar obtener texto del título o del icono
    const title = button.getAttribute('title');
    const iconClass = button.querySelector('i')?.className;
        
    if (title) {
      button.setAttribute('aria-label', title);
    } else if (iconClass) {
      // Extraer nombre del icono de la clase
      const iconName = iconClass.match(/fa-([a-z-]+)/)?.[1] || 'acción';
      button.setAttribute('aria-label', `Botón ${iconName}`);
    }
  }
}

/**
 * Inicializa todas las mejoras de accesibilidad
 */
function initAccessibility() {
  // Inicializar regiones ARIA live
  initAriaLiveRegions();
    
  // Configurar modo de alto contraste
  setupHighContrastMode();
    
  // Mejorar botones con solo iconos
  document.querySelectorAll('button').forEach(button => {
    improveIconButtonAccessibility(button);
  });
    
  // Mejorar modales existentes
  document.querySelectorAll('.modal').forEach(modal => {
    if (modal.style.display === 'block' || modal.classList.contains('active')) {
      setupFocusTrap(modal);
    }
  });
    
  // Observar nuevos modales
  const modalObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1) { // Element node
          if (node.classList?.contains('modal')) {
            setupFocusTrap(node);
          }
          // También buscar modales dentro del nodo
          node.querySelectorAll?.('.modal').forEach(modal => {
            setupFocusTrap(modal);
          });
        }
      });
    });
  });
    
  modalObserver.observe(document.body, {
    childList: true,
    subtree: true
  });
    
  if (window && window.Logger && typeof window.Logger.log === 'function') {
    window.Logger.log('✅ Mejoras de accesibilidad inicializadas');
  }
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAccessibility);
} else {
  initAccessibility();
}

// Exportar funciones
if (typeof window !== 'undefined') {
  window.announceToScreenReader = announceToScreenReader;
  window.showAccessibleNotification = showAccessibleNotification;
  window.setupFocusTrap = setupFocusTrap;
  window.removeFocusTrap = removeFocusTrap;
  window.setFieldValidity = setFieldValidity;
  window.setupKeyboardNavigation = setupKeyboardNavigation;
  window.initAccessibility = initAccessibility;
}

