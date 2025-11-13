// ===== BOTÓN VOLVER ARRIBA FLOTANTE =====
// Botón que aparece al hacer scroll para volver arriba

/**
 * Inicializa el botón "Volver arriba"
 */
function initScrollToTopButton() {
  // Crear botón si no existe
  let button = document.getElementById('scroll-to-top-btn');
    
  if (!button) {
    button = document.createElement('button');
    button.id = 'scroll-to-top-btn';
    button.setAttribute('aria-label', 'Volver arriba');
    button.innerHTML = '<i class="fas fa-arrow-up"></i>';
    button.style.cssText = `
            position: fixed;
            bottom: 2rem;
            right: 2rem;
            width: 50px;
            height: 50px;
            background: var(--primary-color, #3b82f6);
            color: white;
            border: none;
            border-radius: 50%;
            cursor: pointer;
            display: none;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            z-index: 1000;
            transition: all 0.3s ease;
            font-size: 1.25rem;
        `;
        
    document.body.appendChild(button);
        
    // Agregar estilos hover
    button.addEventListener('mouseenter', () => {
      button.style.transform = 'translateY(-5px) scale(1.1)';
      button.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
    });
        
    button.addEventListener('mouseleave', () => {
      button.style.transform = 'translateY(0) scale(1)';
      button.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
    });
        
    // Scroll suave al hacer clic
    button.addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }
    
  // Mostrar/ocultar según scroll
  let scrollTimeout;
  const handleScroll = () => {
    // Limpiar timeout anterior
    if (scrollTimeout) {
      clearTimeout(scrollTimeout);
    }
        
    // Debounce para mejor rendimiento
    scrollTimeout = setTimeout(() => {
      const scrollY = window.scrollY || window.pageYOffset;
            
      if (scrollY > 300) {
        button.style.display = 'flex';
        button.style.opacity = '1';
      } else {
        button.style.opacity = '0';
        setTimeout(() => {
          if (window.scrollY < 300) {
            button.style.display = 'none';
          }
        }, 300);
      }
    }, 10);
  };
    
  // Escuchar scroll
  window.addEventListener('scroll', handleScroll, { passive: true });
    
  // Verificar estado inicial
  handleScroll();
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initScrollToTopButton);
} else {
  initScrollToTopButton();
}

// Exportar función
if (typeof window !== 'undefined') {
  window.initScrollToTopButton = initScrollToTopButton;
}

