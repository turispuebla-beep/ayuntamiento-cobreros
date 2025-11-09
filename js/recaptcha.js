/* eslint-env browser */
/* global handleLogin, handleRegister, handleAdminLogin */
// 🛡️ reCAPTCHA v3 Integration - Ayuntamiento de Cobreros
// Configuración y funciones para reCAPTCHA

// ⚠️ IMPORTANTE: Reemplaza con tu SITE KEY real de Google reCAPTCHA Console
const RECAPTCHA_SITE_KEY = '6LdBqQQsAAAAADFZKDVWkWt2ugbV0Cccm6wExZzQ';

function recaptchaLogInfo(...args) {
  if (typeof window !== 'undefined' && window.Logger && typeof window.Logger.log === 'function') {
    window.Logger.log(...args);
  }
}

function recaptchaLogWarn(...args) {
  if (typeof window !== 'undefined' && window.Logger && typeof window.Logger.warn === 'function') {
    window.Logger.warn(...args);
  }
}

function recaptchaLogError(...args) {
  if (typeof window !== 'undefined' && window.Logger && typeof window.Logger.error === 'function') {
    window.Logger.error(...args);
  }
}

// Configuración de reCAPTCHA
const RECAPTCHA_CONFIG = {
  // Puntuación mínima para considerar válido (0.0 = bot, 1.0 = humano)
  minScore: 0.5,
    
  // Acciones para diferentes formularios
  actions: {
    login: 'login',
    register: 'register',
    admin_login: 'admin_login'
  },
    
  // Timeout para la verificación
  timeout: 10000 // 10 segundos
};

/**
 * Ejecutar reCAPTCHA v3 y obtener token
 * @param {string} action - Acción a ejecutar (login, register, etc.)
 * @returns {Promise<string|null>} Token de reCAPTCHA o null si falla
 */
async function executeRecaptcha(action) {
  try {
    // Verificar que reCAPTCHA esté cargado
    if (typeof window === 'undefined' || !window.grecaptcha) {
      recaptchaLogError('❌ reCAPTCHA no está cargado. Verifica que el script de reCAPTCHA esté incluido en el HTML.');
      throw new Error('reCAPTCHA no está disponible');
    }

    // Esperar a que reCAPTCHA esté listo (con timeout)
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout esperando a que reCAPTCHA esté listo'));
      }, 5000); // 5 segundos de timeout
            
      window.grecaptcha.ready(() => {
        clearTimeout(timeout);
        resolve();
      });
    });

    // Ejecutar reCAPTCHA
    const token = await window.grecaptcha.execute(RECAPTCHA_SITE_KEY, { 
      action: action 
    });

    if (!token) {
      throw new Error('No se pudo obtener token de reCAPTCHA');
    }

    recaptchaLogInfo(`✅ reCAPTCHA token obtenido para acción: ${action}`);
    return token;

  } catch (error) {
    recaptchaLogError('❌ Error ejecutando reCAPTCHA:', error);
    throw error; // Re-lanzar el error para que handleFormWithRecaptcha lo maneje
  }
}

/**
 * Validar token de reCAPTCHA en el servidor
 * @param {string} token - Token de reCAPTCHA
 * @param {string} action - Acción ejecutada
 * @returns {Promise<boolean>} true si es válido, false si no
 */
async function validateRecaptchaToken(token, action) {
  try {
    // Validación básica del token
    if (!token || typeof token !== 'string') {
      recaptchaLogError('❌ Token reCAPTCHA inválido: token vacío o no es string');
      return false;
    }
        
    if (token.length < 50) {
      recaptchaLogError('❌ Token reCAPTCHA inválido: longitud insuficiente');
      return false;
    }
        
    // En un entorno real, esto se haría en el backend
    // Por ahora, validamos que el token tenga el formato correcto
    // TODO: Implementar validación real en Firebase Functions
        
    recaptchaLogInfo(`🔍 Validando token reCAPTCHA para acción: ${action}`);
    recaptchaLogInfo('✅ Token reCAPTCHA válido (validación local)');
        
    // NOTA: En producción, esto debería validarse en el servidor
    // Por ahora, aceptamos tokens que parecen válidos
    return true;

  } catch (error) {
    recaptchaLogError('❌ Error validando token reCAPTCHA:', error);
    return false;
  }
}

/**
 * Manejar envío de formulario con reCAPTCHA
 * @param {string} formId - ID del formulario
 * @param {string} action - Acción de reCAPTCHA
 * @param {Function} submitCallback - Función a ejecutar si reCAPTCHA es válido
 */
async function handleFormWithRecaptcha(formId, action, submitCallback) {
  const form = document.getElementById(formId);
  const submitBtn = form.querySelector('button[type="submit"]');
    
  if (!form || !submitBtn) {
    recaptchaLogError(`❌ Formulario ${formId} o botón no encontrado`);
    return;
  }

  // Mostrar estado de carga
  submitBtn.classList.add('loading');
  submitBtn.disabled = true;

  try {
    // Ejecutar reCAPTCHA
    const token = await executeRecaptcha(action);
        
    if (!token) {
      throw new Error('No se pudo obtener token de reCAPTCHA');
    }

    // Validar token
    const isValid = await validateRecaptchaToken(token, action);
        
    if (!isValid) {
      throw new Error('Token de reCAPTCHA no válido');
    }

    // Si llegamos aquí, reCAPTCHA es válido
    recaptchaLogInfo('✅ reCAPTCHA verificado correctamente');
        
    // Ejecutar callback del formulario
    await submitCallback(token);

  } catch (error) {
    recaptchaLogError('❌ Error en verificación reCAPTCHA:', error);
        
    // Mostrar mensaje de error más descriptivo
    let errorMessage = 'Error de verificación de seguridad. ';
    if (error.message.includes('no está disponible') || error.message.includes('no está cargado')) {
      errorMessage += 'reCAPTCHA no está disponible. Por favor, recarga la página.';
    } else if (error.message.includes('Timeout')) {
      errorMessage += 'Tiempo de espera agotado. Por favor, inténtalo de nuevo.';
    } else {
      errorMessage += 'Inténtalo de nuevo.';
    }
        
    showNotification(errorMessage, 'error');
        
  } finally {
    // Restaurar estado del botón
    submitBtn.classList.remove('loading');
    submitBtn.disabled = false;
  }
}

/**
 * Inicializar reCAPTCHA en los formularios
 */
function initializeRecaptcha() {
  recaptchaLogInfo('🛡️ Inicializando reCAPTCHA v3...');

  // Verificar que la clave esté configurada
  if (RECAPTCHA_SITE_KEY === 'TU_SITE_KEY_AQUI') {
    recaptchaLogWarn('⚠️ RECAPTCHA_SITE_KEY no configurada. Configura tu clave en js/recaptcha.js');
    return;
  }

  // Login Form
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
            
      await handleFormWithRecaptcha('loginForm', RECAPTCHA_CONFIG.actions.login, async (token) => {
        // Aquí va la lógica original de login
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
                
        recaptchaLogInfo('🔐 Procesando login con reCAPTCHA válido');
                
        // Llamar a la función original de login
        if (typeof handleLogin === 'function') {
          await handleLogin(email, password, token);
        } else {
          recaptchaLogError('❌ Función handleLogin no encontrada');
        }
      });
    });
  }

  // Register Form
  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    // Remover listener anterior si existe (solo podemos hacerlo si guardamos la referencia)
    // Por ahora, simplemente agregamos nuestro listener que se ejecutará primero
    // porque se agrega después de que el DOM esté listo
        
    // Usar capture phase para interceptar antes que otros listeners
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      e.stopImmediatePropagation(); // Prevenir que otros listeners se ejecuten
            
      await handleFormWithRecaptcha('registerForm', RECAPTCHA_CONFIG.actions.register, async (token) => {
        // Aquí va la lógica original de registro
        const formData = new FormData(registerForm);
                
        recaptchaLogInfo('📝 Procesando registro con reCAPTCHA válido');
                
        // Llamar a la función original de registro
        if (typeof handleRegister === 'function') {
          await handleRegister(formData, token);
        } else {
          recaptchaLogError('❌ Función handleRegister no encontrada');
          showNotification('Error: Función de registro no disponible', 'error');
        }
      });
    }, true); // Usar capture phase
  }

  // Admin Login Form
  const adminLoginForm = document.getElementById('adminLoginForm');
  if (adminLoginForm) {
    adminLoginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
            
      await handleFormWithRecaptcha('adminLoginForm', RECAPTCHA_CONFIG.actions.admin_login, async (token) => {
        // Aquí va la lógica original de admin login
        const emailInput = adminLoginForm.querySelector('#adminEmail, input[type="email"]');
        const passwordInput = adminLoginForm.querySelector('#adminPassword, input[type="password"]');
        const email = emailInput ? emailInput.value : '';
        const password = passwordInput ? passwordInput.value : '';

        if (!emailInput || !passwordInput) {
          recaptchaLogWarn('⚠️ No se encontraron los campos de acceso admin dentro del formulario');
          showNotification('No se pudo validar el formulario de acceso admin. Refresca la página e inténtalo de nuevo.', 'error');
          return;
        }
                
        recaptchaLogInfo('👨‍💼 Procesando admin login con reCAPTCHA válido');
                
        // Llamar a la función original de admin login
        if (typeof handleAdminLogin === 'function') {
          await handleAdminLogin(email, password, token);
        } else {
          recaptchaLogError('❌ Función handleAdminLogin no encontrada');
        }
      });
    });
  }

  recaptchaLogInfo('✅ reCAPTCHA inicializado en todos los formularios');
}

// Inicializar cuando el DOM esté listo y reCAPTCHA esté cargado
function waitForRecaptchaAndInitialize() {
  // Verificar si reCAPTCHA está disponible
  if (typeof window !== 'undefined' && window.grecaptcha) {
    recaptchaLogInfo('✅ reCAPTCHA cargado, inicializando...');
    initializeRecaptcha();
  } else {
    // Esperar un poco más y reintentar
    recaptchaLogInfo('⏳ Esperando a que reCAPTCHA se cargue...');
    setTimeout(waitForRecaptchaAndInitialize, 500);
  }
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    // Esperar a que reCAPTCHA se cargue
    setTimeout(waitForRecaptchaAndInitialize, 500);
  });
} else {
  // DOM ya está listo
  setTimeout(waitForRecaptchaAndInitialize, 500);
}

// Exportar funciones para uso global
window.executeRecaptcha = executeRecaptcha;
window.validateRecaptchaToken = validateRecaptchaToken;
window.handleFormWithRecaptcha = handleFormWithRecaptcha;
