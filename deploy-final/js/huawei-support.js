/* eslint-env browser */
/* global setupFocusTrap */
// ===== SOPORTE PARA HUAWEI =====
// Detección y mejoras específicas para dispositivos Huawei

function huaweiLogInfo(...args) {
  if (typeof window !== 'undefined' && window.Logger && typeof window.Logger.log === 'function') {
    window.Logger.log(...args);
  }
}

function huaweiLogError(...args) {
  if (typeof window !== 'undefined' && window.Logger && typeof window.Logger.error === 'function') {
    window.Logger.error(...args);
  }
}

/**
 * Detecta si el dispositivo es Huawei
 * @returns {boolean} - true si es dispositivo Huawei
 */
function isHuaweiDevice() {
  const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    
  // Detectar Huawei por User Agent
  const huaweiPatterns = [
    /Huawei/i,
    /HONOR/i,
    /HUAWEI/i,
    /HONOR/i
  ];
    
  // Verificar User Agent
  const isHuaweiUA = huaweiPatterns.some(pattern => pattern.test(userAgent));
    
  // Verificar si tiene servicios de Huawei
  const hasHuaweiServices = typeof window.hms !== 'undefined' || 
                              typeof window.HMS !== 'undefined' ||
                              navigator.userAgent.includes('Huawei') ||
                              navigator.userAgent.includes('HONOR');
    
  // Verificar si está usando navegador de Huawei
  const isHuaweiBrowser = userAgent.includes('HuaweiBrowser') || 
                           userAgent.includes('Huawei') ||
                           userAgent.includes('HONOR');
    
  return isHuaweiUA || hasHuaweiServices || isHuaweiBrowser;
}

/**
 * Detecta si tiene AppGallery instalado
 * @returns {Promise<boolean>} - true si AppGallery está disponible
 */
async function hasAppGallery() {
  try {
    // Intentar detectar AppGallery
    if (typeof window.hms !== 'undefined') {
      return true;
    }
        
    // Verificar mediante intent de Android
    if (navigator.userAgent.includes('Android')) {
      // En Android, verificar si puede abrir AppGallery
      return new Promise((resolve) => {
        const timeout = setTimeout(() => resolve(false), 100);
                
        // Intentar detectar AppGallery
        const link = document.createElement('a');
        link.href = 'appmarket://details?id=com.huawei.appmarket';
        link.style.display = 'none';
        document.body.appendChild(link);
                
        // Si no se puede abrir, probablemente no está instalado
        setTimeout(() => {
          document.body.removeChild(link);
          clearTimeout(timeout);
          resolve(false);
        }, 50);
      });
    }
        
    return false;
  } catch (error) {
    huaweiLogError('Error detectando AppGallery:', error);
    return false;
  }
}

/**
 * Detecta el navegador utilizado
 * @returns {string} - Nombre del navegador
 */
function detectBrowser() {
  const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    
  if (userAgent.includes('HuaweiBrowser') || userAgent.includes('HONOR')) {
    return 'huawei';
  } else if (userAgent.includes('Chrome')) {
    return 'chrome';
  } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    return 'safari';
  } else if (userAgent.includes('Firefox')) {
    return 'firefox';
  } else if (userAgent.includes('Samsung')) {
    return 'samsung';
  } else {
    return 'other';
  }
}

/**
 * Muestra banner de instalación específico para Huawei
 */
function showHuaweiInstallBanner() {
  if (!isHuaweiDevice()) {
    return; // No es dispositivo Huawei
  }
    
  // Verificar si ya se mostró el banner
  const bannerShown = localStorage.getItem('huawei-banner-shown');
  if (bannerShown === 'true') {
    return; // Ya se mostró
  }
    
  const browser = detectBrowser();
  let installInstructions = '';
  let installButtonText = 'Instalar App';
    
  if (browser === 'huawei') {
    // Navegador de Huawei - PWA directa
    installInstructions = 'Toca el menú (⋮) y selecciona "Añadir a pantalla de inicio"';
    installButtonText = 'Instalar PWA';
  } else {
    // Otro navegador - Instrucciones generales
    installInstructions = 'Abre en el navegador de Huawei o instala desde AppGallery';
    installButtonText = 'Ver Instrucciones';
  }
    
  const banner = document.createElement('div');
  banner.id = 'huawei-install-banner';
  banner.setAttribute('role', 'region');
  banner.setAttribute('aria-label', 'Instalar aplicación en Huawei');
  banner.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 20px;
        right: 20px;
        background: linear-gradient(135deg, #FF6B00 0%, #FF8C00 100%);
        color: white;
        padding: 16px;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        display: flex;
        flex-direction: column;
        gap: 12px;
        max-width: 500px;
        margin: 0 auto;
    `;
    
  banner.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
            <div style="font-size: 24px;">📱</div>
            <div style="flex: 1;">
                <div style="font-weight: bold; margin-bottom: 4px; font-size: 16px;">
                    Instalar en Huawei
                </div>
                <div style="font-size: 14px; opacity: 0.95;">
                    ${installInstructions}
                </div>
            </div>
            <button onclick="closeHuaweiBanner()" 
                    style="background: transparent; color: white; border: none; padding: 4px 8px; cursor: pointer; font-size: 20px; line-height: 1;"
                    aria-label="Cerrar banner">
                ×
            </button>
        </div>
        <div style="display: flex; gap: 8px;">
            <button onclick="showHuaweiInstallInstructions()" 
                    style="flex: 1; background: white; color: #FF6B00; border: none; padding: 10px 16px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 14px;">
                ${installButtonText}
            </button>
            <button onclick="openHuaweiAppGallery()" 
                    style="flex: 1; background: rgba(255,255,255,0.2); color: white; border: 2px solid white; padding: 10px 16px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 14px;">
                AppGallery
            </button>
        </div>
    `;
    
  document.body.appendChild(banner);
    
  // Marcar como mostrado
  localStorage.setItem('huawei-banner-shown', 'true');
    
  // Auto-ocultar después de 10 segundos
  setTimeout(() => {
    if (document.getElementById('huawei-install-banner')) {
      closeHuaweiBanner();
    }
  }, 10000);
}

/**
 * Cierra el banner de Huawei
 */
function closeHuaweiBanner() {
  const banner = document.getElementById('huawei-install-banner');
  if (banner) {
    banner.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => {
      banner.remove();
    }, 300);
  }
}

/**
 * Muestra instrucciones de instalación para Huawei
 */
function showHuaweiInstallInstructions() {
  closeHuaweiBanner();
    
  const browser = detectBrowser();
  let instructions = '';
    
  if (browser === 'huawei') {
    instructions = `
            <h3>Instalación en Navegador de Huawei</h3>
            <ol style="text-align: left; padding-left: 20px;">
                <li>Abre el menú del navegador (tres puntos ⋮)</li>
                <li>Selecciona "Añadir a pantalla de inicio"</li>
                <li>Confirma la instalación</li>
                <li>¡Listo! La app aparecerá en tu pantalla de inicio</li>
            </ol>
        `;
  } else {
    instructions = `
            <h3>Instalación en Dispositivo Huawei</h3>
            <h4>Opción 1: Navegador de Huawei</h4>
            <ol style="text-align: left; padding-left: 20px;">
                <li>Abre esta página en el navegador de Huawei</li>
                <li>Toca el menú (⋮) en la esquina superior derecha</li>
                <li>Selecciona "Añadir a pantalla de inicio"</li>
                <li>Confirma la instalación</li>
            </ol>
            <h4>Opción 2: AppGallery (Próximamente)</h4>
            <p>La aplicación estará disponible en AppGallery próximamente.</p>
        `;
  }
    
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'huawei-instructions-title');
  modal.style.display = 'block';
  modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <span class="close" onclick="this.closest('.modal').remove()" aria-label="Cerrar">&times;</span>
            <h2 id="huawei-instructions-title">📱 Instalar en Huawei</h2>
            <div style="text-align: center; padding: 20px;">
                ${instructions}
            </div>
            <div style="text-align: center; margin-top: 20px;">
                <button class="btn btn-primary" onclick="this.closest('.modal').remove()">
                    Entendido
                </button>
            </div>
        </div>
    `;
    
  document.body.appendChild(modal);
    
  // Focus trap
  if (typeof setupFocusTrap === 'function') {
    setupFocusTrap(modal);
  }
}

/**
 * Intenta abrir AppGallery
 */
function openHuaweiAppGallery() {
  // Intentar abrir AppGallery
  const appGalleryUrl = 'appmarket://details?id=com.huawei.appmarket';
    
  // Crear enlace temporal
  const link = document.createElement('a');
  link.href = appGalleryUrl;
  link.target = '_blank';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
    
  // Si no se abre, mostrar mensaje
  setTimeout(() => {
    if (typeof showNotification === 'function') {
      showNotification('Si AppGallery no se abrió, búscalo manualmente en tu dispositivo', 'info');
    }
  }, 1000);
}

/**
 * Mejora la instalación PWA para Huawei
 */
function enhancePWAForHuawei() {
  if (!isHuaweiDevice()) {
    return;
  }
    
  // Mejorar manifest para Huawei
  const manifestLink = document.querySelector('link[rel="manifest"]');
  if (manifestLink) {
    // Asegurar que el manifest tenga todos los campos necesarios
    manifestLink.setAttribute('crossorigin', 'use-credentials');
  }
    
  // Agregar meta tags específicos para Huawei
  if (!document.querySelector('meta[name="huawei-mobile-web-app-capable"]')) {
    const meta = document.createElement('meta');
    meta.name = 'huawei-mobile-web-app-capable';
    meta.content = 'yes';
    document.head.appendChild(meta);
  }
    
  // Mejorar Service Worker para Huawei
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(registration => {
      // Asegurar que el Service Worker esté activo
      if (registration.active) {
        huaweiLogInfo('✅ Service Worker activo en Huawei');
      }
    });
  }
}

/**
 * Inicializa soporte para Huawei
 */
function initHuaweiSupport() {
  if (!isHuaweiDevice()) {
    return; // No es dispositivo Huawei
  }
    
  huaweiLogInfo('📱 Dispositivo Huawei detectado');
    
  // Mejorar PWA para Huawei
  enhancePWAForHuawei();
    
  // Mostrar banner después de un delay
  setTimeout(() => {
    showHuaweiInstallBanner();
  }, 2000);
    
  // Escuchar eventos de instalación
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
        
    // Mostrar banner personalizado para Huawei
    showHuaweiInstallBanner();
  });
}

// Exportar funciones
if (typeof window !== 'undefined') {
  window.isHuaweiDevice = isHuaweiDevice;
  window.hasAppGallery = hasAppGallery;
  window.detectBrowser = detectBrowser;
  window.showHuaweiInstallBanner = showHuaweiInstallBanner;
  window.closeHuaweiBanner = closeHuaweiBanner;
  window.showHuaweiInstallInstructions = showHuaweiInstallInstructions;
  window.openHuaweiAppGallery = openHuaweiAppGallery;
  window.initHuaweiSupport = initHuaweiSupport;
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initHuaweiSupport);
} else {
  initHuaweiSupport();
}

