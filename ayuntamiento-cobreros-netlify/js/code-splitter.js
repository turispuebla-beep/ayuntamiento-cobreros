// ===== CODE SPLITTING SEGURO =====
// Carga diferida de módulos sin afectar funcionalidad

/**
 * Carga un módulo de forma diferida
 * @param {string} modulePath - Ruta del módulo
 * @returns {Promise} - Módulo cargado
 */
async function loadModule(modulePath) {
  try {
    // Cargar script tradicional (sin usar import para evitar errores)
    return new Promise((resolve, reject) => {
      // Verificar si el módulo ya está cargado
      if (window[modulePath] || document.querySelector(`script[src="${modulePath}"]`)) {
        resolve(window);
        return;
      }
            
      const script = document.createElement('script');
      script.src = modulePath;
      script.async = true;
      script.onload = () => resolve(window);
      script.onerror = () => reject(new Error(`Error cargando módulo: ${modulePath}`));
      document.head.appendChild(script);
    });
  } catch (error) {
    console.error(`Error cargando módulo ${modulePath}:`, error);
    throw error;
  }
}

/**
 * Carga módulos del panel de administración solo cuando se necesita
 */
async function loadAdminModules() {
  // Solo cargar si el usuario es admin y no se han cargado
  if (typeof isAdmin === 'undefined' || !isAdmin || window.adminModulesLoaded) {
    return;
  }
    
  try {
    // Aquí se podrían cargar módulos específicos del admin
    // Por ahora, todo está en script.js, pero esto prepara para futuras mejoras
    window.adminModulesLoaded = true;
    Logger.log('✅ Módulos de administración cargados');
  } catch (error) {
    Logger.error('Error cargando módulos de admin:', error);
  }
}

/**
 * Carga módulos de cultura y ocio de forma diferida
 */
async function loadCulturaModules() {
  if (window.culturaModulesLoaded) {
    return;
  }
    
  try {
    // Preparado para futura modularización
    window.culturaModulesLoaded = true;
  } catch (error) {
    Logger.error('Error cargando módulos de cultura:', error);
  }
}

/**
 * Inicializa code splitting seguro
 */
function initCodeSplitting() {
  if (typeof isAdmin === 'undefined') {
    Logger?.warn?.('[CodeSplitter] isAdmin no está definido todavía');
    return;
  }
  // Cargar módulos de admin cuando se detecte que es admin
  if (isAdmin) {
    loadAdminModules();
  }
    
  // Observar cambios en isAdmin
  const adminObserver = new MutationObserver(() => {
    if (typeof isAdmin !== 'undefined' && isAdmin && !window.adminModulesLoaded) {
      loadAdminModules();
    }
  });
    
  // Observar cambios en el estado de admin (si se almacena en DOM)
  const adminBtn = document.getElementById('adminBtn');
  if (adminBtn) {
    adminObserver.observe(adminBtn, {
      attributes: true,
      attributeFilter: ['style', 'class']
    });
  }
}

// Inicializar cuando el DOM esté listo
function scheduleInit() {
  if (typeof isAdmin !== 'undefined') {
    initCodeSplitting();
    return;
  }
  setTimeout(scheduleInit, 100);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', scheduleInit);
} else {
  scheduleInit();
}

// Exportar funciones
if (typeof window !== 'undefined') {
  window.loadModule = loadModule;
  window.loadAdminModules = loadAdminModules;
  window.loadCulturaModules = loadCulturaModules;
}

