// ===== INDICADOR DE CONEXIÓN OFFLINE/ONLINE =====
// Banner que indica el estado de conexión

/**
 * Inicializa el indicador de conexión
 */
function initOfflineIndicator() {
  // Crear banner si no existe
  let banner = document.getElementById('offline-indicator');
    
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'offline-indicator';
    banner.setAttribute('role', 'alert');
    banner.setAttribute('aria-live', 'polite');
    banner.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: var(--error-color, #ef4444);
            color: white;
            padding: 1rem;
            text-align: center;
            z-index: 5000;
            transform: translateY(-100%);
            transition: transform 0.3s ease;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.75rem;
        `;
        
    document.body.appendChild(banner);
  }
    
  const updateIndicator = (isOnline) => {
    if (isOnline) {
      banner.style.background = 'var(--success-color, #10b981)';
      banner.innerHTML = `
                <i class="fas fa-wifi" style="font-size: 1.25rem;"></i>
                <span>Conexión restaurada</span>
            `;
      banner.style.transform = 'translateY(0)';
            
      // Ocultar después de 3 segundos
      setTimeout(() => {
        banner.style.transform = 'translateY(-100%)';
      }, 3000);
    } else {
      banner.style.background = 'var(--error-color, #ef4444)';
      banner.innerHTML = `
                <i class="fas fa-wifi" style="font-size: 1.25rem; transform: rotate(45deg);"></i>
                <span>Sin conexión a internet. Algunas funciones pueden no estar disponibles.</span>
            `;
      banner.style.transform = 'translateY(0)';
    }
  };
    
  // Verificar estado inicial
  updateIndicator(navigator.onLine);
    
  // Escuchar cambios de conexión
  window.addEventListener('online', () => {
    updateIndicator(true);
    if (typeof showNotification === 'function') {
      showNotification('Conexión restaurada', 'success');
    }
  });
    
  window.addEventListener('offline', () => {
    updateIndicator(false);
    if (typeof showNotification === 'function') {
      showNotification('Sin conexión a internet', 'warning');
    }
  });
    
  // Verificar periódicamente (por si los eventos no funcionan)
  setInterval(() => {
    const isOnline = navigator.onLine;
    const currentState = banner.style.transform === 'translateY(0)' && 
                           banner.style.background.includes('rgb(239, 68, 68)');
        
    if (!isOnline && currentState) {
      // Ya está mostrando offline, no hacer nada
      return;
    }
        
    if (isOnline !== navigator.onLine) {
      updateIndicator(isOnline);
    }
  }, 5000);
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initOfflineIndicator);
} else {
  initOfflineIndicator();
}

// Exportar función
if (typeof window !== 'undefined') {
  window.initOfflineIndicator = initOfflineIndicator;
}

