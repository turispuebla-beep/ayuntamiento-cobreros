// ===== MONITOREO DE RENDIMIENTO =====
// Tracking de métricas de rendimiento sin afectar funcionalidad

/**
 * Mide y registra métricas de rendimiento
 */
function initPerformanceMonitoring() {
  // Solo en producción o si está habilitado
  if (window.location.hostname === 'localhost' || 
        window.location.hostname === '127.0.0.1') {
    return; // No monitorear en desarrollo
  }
    
  // Esperar a que la página cargue completamente
  window.addEventListener('load', () => {
    setTimeout(() => {
      measurePerformance();
    }, 1000);
  });
}

/**
 * Mide métricas de rendimiento
 */
function measurePerformance() {
  if (!window.performance || !window.performance.timing) {
    return;
  }
    
  const timing = window.performance.timing;
  const navigation = window.performance.navigation;
    
  // Calcular métricas
  const metrics = {
    // Tiempo de carga
    pageLoadTime: timing.loadEventEnd - timing.navigationStart,
    domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
    firstPaint: timing.responseEnd - timing.navigationStart,
        
    // Tiempos de red
    dnsTime: timing.domainLookupEnd - timing.domainLookupStart,
    connectTime: timing.connectEnd - timing.connectStart,
    requestTime: timing.responseStart - timing.requestStart,
    responseTime: timing.responseEnd - timing.responseStart,
        
    // Tiempos de renderizado
    domProcessing: timing.domComplete - timing.domLoading,
    domInteractive: timing.domInteractive - timing.navigationStart,
        
    // Tipo de navegación
    navigationType: navigation.type === 0 ? 'navigate' : 
      navigation.type === 1 ? 'reload' : 
        navigation.type === 2 ? 'back_forward' : 'other'
  };
    
  // Web Vitals (si están disponibles)
  if ('PerformanceObserver' in window) {
    try {
      // Largest Contentful Paint (LCP)
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        metrics.lcp = lastEntry.renderTime || lastEntry.loadTime;
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
            
      // First Input Delay (FID)
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          metrics.fid = entry.processingStart - entry.startTime;
        });
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
            
      // Cumulative Layout Shift (CLS)
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        metrics.cls = clsValue;
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
    } catch (e) {
      // Ignorar errores de observadores
    }
  }
    
  // Enviar métricas a Firebase Analytics si está disponible
  if (typeof window.gtag === 'function') {
    // LCP
    if (metrics.lcp) {
      window.gtag('event', 'web_vitals', {
        event_category: 'Web Vitals',
        event_label: 'LCP',
        value: Math.round(metrics.lcp),
        non_interaction: true
      });
    }
        
    // FID
    if (metrics.fid) {
      window.gtag('event', 'web_vitals', {
        event_category: 'Web Vitals',
        event_label: 'FID',
        value: Math.round(metrics.fid),
        non_interaction: true
      });
    }
        
    // CLS
    if (metrics.cls !== undefined) {
      window.gtag('event', 'web_vitals', {
        event_category: 'Web Vitals',
        event_label: 'CLS',
        value: Math.round(metrics.cls * 1000),
        non_interaction: true
      });
    }
  }
    
  // Log en consola solo en desarrollo
  if (typeof Logger !== 'undefined' && Logger.log) {
    Logger.log('📊 Métricas de rendimiento:', metrics);
  }
    
  return metrics;
}

/**
 * Mide el tiempo de ejecución de una función
 * @param {Function} fn - Función a medir
 * @param {string} name - Nombre de la función
 * @returns {*} - Resultado de la función
 */
function measureFunction(fn, name = 'function') {
  const start = performance.now();
  const result = fn();
  const end = performance.now();
  const duration = end - start;
    
  if (typeof Logger !== 'undefined' && Logger.log) {
    Logger.log(`⏱️ ${name} ejecutado en ${duration.toFixed(2)}ms`);
  }
    
  return result;
}

/**
 * Mide el tiempo de ejecución de una función asíncrona
 * @param {Function} fn - Función asíncrona a medir
 * @param {string} name - Nombre de la función
 * @returns {Promise} - Resultado de la función
 */
async function measureAsyncFunction(fn, name = 'async-function') {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();
  const duration = end - start;
    
  if (typeof Logger !== 'undefined' && Logger.log) {
    Logger.log(`⏱️ ${name} ejecutado en ${duration.toFixed(2)}ms`);
  }
    
  return result;
}

// Inicializar monitoreo
initPerformanceMonitoring();

// Exportar funciones
if (typeof window !== 'undefined') {
  window.measurePerformance = measurePerformance;
  window.measureFunction = measureFunction;
  window.measureAsyncFunction = measureAsyncFunction;
}

