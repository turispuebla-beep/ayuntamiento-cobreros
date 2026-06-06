// ===== OPTIMIZACIÓN DE IMÁGENES =====
// Lazy loading y optimización de imágenes sin afectar funcionalidad

/**
 * Inicializa lazy loading para todas las imágenes
 */
function initLazyLoading() {
  // Verificar si el navegador soporta Intersection Observer
  if (!('IntersectionObserver' in window)) {
    // Fallback: cargar todas las imágenes
    document.querySelectorAll('img[data-src]').forEach(img => {
      img.src = img.dataset.src;
    });
    return;
  }
    
  // Crear observer para lazy loading
  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
                
        // Cargar imagen
        if (img.dataset.src) {
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
        }
                
        // Agregar clase cuando se carga
        img.addEventListener('load', () => {
          img.classList.add('loaded');
        });
                
        // Dejar de observar
        observer.unobserve(img);
      }
    });
  }, {
    rootMargin: '50px' // Cargar 50px antes de que sea visible
  });
    
  // Observar todas las imágenes con data-src
  document.querySelectorAll('img[data-src]').forEach(img => {
    imageObserver.observe(img);
  });
    
  // Observar imágenes dinámicas agregadas después
  observeDynamicImages(imageObserver);
}

/**
 * Observa imágenes agregadas dinámicamente
 */
function observeDynamicImages(observer) {
  const mutationObserver = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === 1) { // Element node
          // Buscar imágenes en el nodo
          if (node.tagName === 'IMG') {
            // Aplicar lazy loading si no tiene data-src
            if (node.src && !node.dataset.src && !node.hasAttribute('loading')) {
              convertToLazyLoad(node);
              if (node.dataset.src) {
                observer.observe(node);
              }
            } else if (node.dataset.src) {
              observer.observe(node);
            }
          }
          // Buscar imágenes dentro del nodo
          node.querySelectorAll?.('img').forEach(img => {
            // Aplicar lazy loading si no tiene data-src
            if (img.src && !img.dataset.src && !img.hasAttribute('loading')) {
              convertToLazyLoad(img);
              if (img.dataset.src) {
                observer.observe(img);
              }
            } else if (img.dataset.src) {
              observer.observe(img);
            }
          });
        }
      });
    });
  });
    
  mutationObserver.observe(document.body, {
    childList: true,
    subtree: true
  });
}

/**
 * Convierte una imagen normal a lazy loading
 * @param {HTMLImageElement} img - Elemento imagen
 */
function convertToLazyLoad(img) {
  if (img.src && !img.dataset.src) {
    img.dataset.src = img.src;
    img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg"%3E%3C/svg%3E'; // Placeholder transparente
    img.loading = 'lazy';
  }
}

/**
 * Optimiza una URL de imagen (agregar parámetros de optimización si es posible)
 * @param {string} url - URL de la imagen
 * @returns {string} - URL optimizada
 */
function optimizeImageUrl(url) {
  // Si es una URL externa de un servicio que soporta optimización
  if (url.includes('firebase') || url.includes('cloudinary') || url.includes('imgix')) {
    // Agregar parámetros de optimización según el servicio
    // Por ahora, solo retornar la URL original
    return url;
  }
    
  return url;
}

/**
 * Agrega lazy loading a imágenes creadas dinámicamente
 * @param {string} containerSelector - Selector del contenedor
 */
function enableLazyLoadInContainer(containerSelector) {
  const container = document.querySelector(containerSelector);
  if (!container) return;
    
  container.querySelectorAll('img').forEach(img => {
    if (!img.loading && !img.dataset.src) {
      convertToLazyLoad(img);
    }
  });
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLazyLoading);
} else {
  initLazyLoading();
}

// Exportar funciones
if (typeof window !== 'undefined') {
  window.initLazyLoading = initLazyLoading;
  window.convertToLazyLoad = convertToLazyLoad;
  window.optimizeImageUrl = optimizeImageUrl;
  window.enableLazyLoadInContainer = enableLazyLoadInContainer;
}

