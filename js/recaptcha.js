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
 * Función de login alternativa cuando handleAdminLogin no está disponible
 * Esta función intenta hacer login usando las credenciales directamente
 */
async function fallbackAdminLogin(email, password) {
  recaptchaLogInfo('🔄 Intentando login alternativo...');
  
  // Intentar obtener credenciales de window si están disponibles
  const SUPER_ADMIN = window.SUPER_ADMIN || (typeof SUPER_ADMIN !== 'undefined' ? SUPER_ADMIN : null);
  const ADMIN_CREDENTIALS = window.ADMIN_CREDENTIALS || (typeof ADMIN_CREDENTIALS !== 'undefined' ? ADMIN_CREDENTIALS : null);
  const administrators = window.administrators || (typeof administrators !== 'undefined' ? administrators : []);
  
  if (!SUPER_ADMIN && !ADMIN_CREDENTIALS && (!administrators || administrators.length === 0)) {
    throw new Error('No se pueden obtener las credenciales de administrador');
  }
  
  // Verificar super admin
  if (SUPER_ADMIN && email === SUPER_ADMIN.email && password === SUPER_ADMIN.password) {
    recaptchaLogInfo('✅ Login como SUPER_ADMIN exitoso (alternativo)');
    if (typeof window !== 'undefined') {
      window.isSuperAdmin = true;
      window.isAdmin = true;
      if (window.localStorage) {
        window.localStorage.setItem('isSuperAdmin', 'true');
        window.localStorage.setItem('isAdmin', 'true');
        window.localStorage.setItem('currentUser', JSON.stringify({
          email,
          name: SUPER_ADMIN.name,
          isSuperAdmin: true,
          team: SUPER_ADMIN.team
        }));
      }
      if (typeof window.updateUserInterface === 'function') {
        window.updateUserInterface();
      }
      if (typeof window.closeModal === 'function') {
        window.closeModal('adminLoginModal');
      }
      if (typeof window.showNotification === 'function') {
        window.showNotification('Sesión de administrador iniciada correctamente', 'success');
      }
    }
    return true;
  }
  
  // Verificar admin por defecto
  if (ADMIN_CREDENTIALS && email === ADMIN_CREDENTIALS.email && password === ADMIN_CREDENTIALS.password) {
    recaptchaLogInfo('✅ Login como ADMIN exitoso (alternativo)');
    if (typeof window !== 'undefined') {
      window.isAdmin = true;
      if (window.localStorage) {
        window.localStorage.setItem('isAdmin', 'true');
        window.localStorage.setItem('currentUser', JSON.stringify({
          email: ADMIN_CREDENTIALS.email,
          name: ADMIN_CREDENTIALS.name,
          isAdmin: true,
          isDefault: true
        }));
      }
      if (typeof window.updateUserInterface === 'function') {
        window.updateUserInterface();
      }
      if (typeof window.closeModal === 'function') {
        window.closeModal('adminLoginModal');
      }
      if (typeof window.showNotification === 'function') {
        window.showNotification('Sesión de administrador iniciada - Ayuntamiento de Cobreros', 'success');
      }
    }
    return true;
  }
  
  // Verificar administradores personalizados
  if (administrators && administrators.length > 0) {
    const admin = administrators.find(item => item.email === email && item.password === password && item.isActive);
    if (admin) {
      recaptchaLogInfo('✅ Login como administrador personalizado exitoso (alternativo)');
      if (typeof window !== 'undefined') {
        window.isAdmin = true;
        if (window.localStorage) {
          window.localStorage.setItem('isAdmin', 'true');
          window.localStorage.setItem('currentUser', JSON.stringify({
            email: admin.email,
            name: admin.name,
            isAdmin: true,
            adminId: admin.id
          }));
        }
        if (typeof window.updateUserInterface === 'function') {
          window.updateUserInterface();
        }
        if (typeof window.closeModal === 'function') {
          window.closeModal('adminLoginModal');
        }
        if (typeof window.showNotification === 'function') {
          window.showNotification(`Sesión de administrador iniciada - ${admin.name}`, 'success');
        }
      }
      return true;
    }
  }
  
  // Si llegamos aquí, las credenciales son incorrectas
  recaptchaLogWarn('⚠️ Login fallido - credenciales incorrectas (alternativo)');
  const adminFeedback = document.getElementById('adminLoginFeedback');
  if (adminFeedback) {
    adminFeedback.textContent = 'Credenciales de administrador incorrectas';
    adminFeedback.style.display = 'block';
  } else if (typeof window.showNotification === 'function') {
    window.showNotification('Credenciales de administrador incorrectas', 'error');
  }
  return false;
}

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
    recaptchaLogInfo('📝 Formulario de admin login encontrado, agregando listener...');
    // Usar capture phase para interceptar antes que otros listeners
    adminLoginForm.addEventListener('submit', async (e) => {
      recaptchaLogInfo('🔔 Submit del formulario de admin detectado');
      e.preventDefault();
      e.stopImmediatePropagation(); // Prevenir que otros listeners se ejecuten
      
      // Esperar más tiempo para asegurar que handleAdminLogin esté disponible
      // (script.js puede tardar en cargar completamente)
      let retries = 0;
      const maxRetries = 50; // Aumentar a 50 intentos (5 segundos)
      while ((typeof handleAdminLogin === 'undefined' && typeof window.handleAdminLogin === 'undefined') && retries < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 100));
        retries++;
        if (retries % 10 === 0) {
          recaptchaLogInfo(`⏳ Esperando handleAdminLogin... (intento ${retries}/${maxRetries})`);
        }
      }
      
      recaptchaLogInfo('🔍 handleAdminLogin disponible:', typeof handleAdminLogin !== 'undefined' || typeof window.handleAdminLogin !== 'undefined');
      
      // Si handleAdminLogin no está disponible después de esperar, verificar el fallback
      if (typeof handleAdminLogin === 'undefined' && typeof window.handleAdminLogin === 'undefined') {
        // Verificar si el fallback está disponible
        if (typeof window !== 'undefined' && window.adminLoginFallbackLoaded && typeof window.handleAdminLogin === 'function') {
          recaptchaLogInfo('✅ Usando handleAdminLogin del script de respaldo');
          // La función ya está disponible en window.handleAdminLogin, continuar
        } else {
          recaptchaLogError('❌ handleAdminLogin NO disponible después de esperar. Verifica que script.js se haya cargado correctamente.');
          recaptchaLogError('🔍 Estado de scripts:', {
            scriptJsLoaded: typeof window !== 'undefined' && window.scriptJsLoaded,
            fallbackLoaded: typeof window !== 'undefined' && window.adminLoginFallbackLoaded,
            handleAdminLogin: typeof handleAdminLogin,
            windowHandleAdminLogin: typeof window.handleAdminLogin
          });
          if (typeof showNotification === 'function') {
            showNotification('Error: El sistema de login no está disponible. Por favor, recarga la página (Ctrl+F5 para limpiar caché).', 'error');
          } else {
            alert('Error: El sistema de login no está disponible. Por favor, recarga la página (Ctrl+F5 para limpiar caché).');
          }
          return;
        }
      }
            
      try {
        // Intentar validar reCAPTCHA, pero si falla, continuar sin él
        let recaptchaSuccess = false;
        try {
      await handleFormWithRecaptcha('adminLoginForm', RECAPTCHA_CONFIG.actions.admin_login, async (token) => {
            recaptchaLogInfo('✅ reCAPTCHA validado, token recibido');
            recaptchaSuccess = true;
        // Aquí va la lógica original de admin login
        // Buscar campos de email y password de múltiples formas
        const emailInput = adminLoginForm.querySelector('#adminEmail') || 
                          adminLoginForm.querySelector('input[type="email"]') ||
                          adminLoginForm.querySelector('input[name="email"]');
        const passwordInput = adminLoginForm.querySelector('#adminPassword') || 
                             adminLoginForm.querySelector('input[type="password"]') ||
                             adminLoginForm.querySelector('input[name="password"]');

        if (!emailInput || !passwordInput) {
          recaptchaLogWarn('⚠️ No se encontraron los campos de acceso admin dentro del formulario');
          recaptchaLogWarn('Email input encontrado:', !!emailInput, 'Password input encontrado:', !!passwordInput);
          if (typeof showNotification === 'function') {
          showNotification('No se pudo validar el formulario de acceso admin. Refresca la página e inténtalo de nuevo.', 'error');
          }
          return;
        }
        
        const email = emailInput.value.trim();
        const password = passwordInput.value;

        if (!email || !password) {
          recaptchaLogWarn('⚠️ Email o contraseña vacíos');
          if (typeof showNotification === 'function') {
            showNotification('Por favor, introduce correo y contraseña.', 'error');
          }
          return;
        }
                
        recaptchaLogInfo('👨‍💼 Procesando admin login con reCAPTCHA válido');
                
        // Llamar a la función original de admin login
        // Intentar múltiples formas de acceder a la función
        let adminLoginHandler = null;
        if (typeof handleAdminLogin === 'function') {
          adminLoginHandler = handleAdminLogin;
        } else if (typeof window.handleAdminLogin === 'function') {
          adminLoginHandler = window.handleAdminLogin;
        }
        
        if (adminLoginHandler) {
          try {
            const result = await adminLoginHandler(email, password, token);
            if (result === false) {
              // handleAdminLogin retornó false, probablemente credenciales incorrectas
              recaptchaLogWarn('⚠️ Login fallido - credenciales incorrectas');
            } else {
              recaptchaLogInfo('✅ Login procesado correctamente');
            }
          } catch (error) {
            recaptchaLogError('❌ Error ejecutando handleAdminLogin:', error);
            console.error('Error completo:', error);
            // Intentar login alternativo si handleAdminLogin falla
            try {
              await fallbackAdminLogin(email, password);
            } catch (fallbackError) {
              recaptchaLogError('❌ Error en login alternativo:', fallbackError);
              if (typeof showNotification === 'function') {
                showNotification('Error al procesar el login. Intenta de nuevo.', 'error');
              }
            }
          }
        } else {
          recaptchaLogWarn('⚠️ handleAdminLogin no encontrada, intentando login alternativo...');
          // Intentar login alternativo
          try {
            await fallbackAdminLogin(email, password);
          } catch (error) {
            recaptchaLogError('❌ Error en login alternativo:', error);
            recaptchaLogError('handleAdminLogin disponible:', typeof handleAdminLogin);
            recaptchaLogError('window.handleAdminLogin disponible:', typeof window.handleAdminLogin);
            if (typeof showNotification === 'function') {
              showNotification('Error: El sistema de login no está disponible. Por favor, recarga la página (Ctrl+F5 para limpiar caché).', 'error');
            }
          }
        }
          });
        } catch (recaptchaError) {
          recaptchaLogWarn('⚠️ Error validando reCAPTCHA, continuando sin validación:', recaptchaError);
          // Si reCAPTCHA falla, intentar login sin él
          recaptchaSuccess = false;
        }
        
        // Si reCAPTCHA falló o no está disponible, intentar login directo
        if (!recaptchaSuccess) {
          recaptchaLogInfo('🔄 Intentando login sin reCAPTCHA...');
          const emailInput = adminLoginForm.querySelector('#adminEmail') || 
                            adminLoginForm.querySelector('input[type="email"]') ||
                            adminLoginForm.querySelector('input[name="email"]');
          const passwordInput = adminLoginForm.querySelector('#adminPassword') || 
                               adminLoginForm.querySelector('input[type="password"]') ||
                               adminLoginForm.querySelector('input[name="password"]');
          
          if (emailInput && passwordInput) {
            const email = emailInput.value.trim();
            const password = passwordInput.value;
            
            if (email && password) {
              const adminLoginHandler = handleAdminLogin || window.handleAdminLogin;
              if (adminLoginHandler) {
                try {
                  await adminLoginHandler(email, password);
                } catch (error) {
                  recaptchaLogError('❌ Error en login directo:', error);
                  // Intentar login alternativo
                  try {
                    await fallbackAdminLogin(email, password);
                  } catch (fallbackError) {
                    recaptchaLogError('❌ Error en login alternativo (fallback):', fallbackError);
                  }
                }
              } else {
                // Si no hay handler, intentar login alternativo
                try {
                  await fallbackAdminLogin(email, password);
                } catch (error) {
                  recaptchaLogError('❌ Error en login alternativo (sin reCAPTCHA):', error);
                }
              }
            }
          }
        }
      } catch (error) {
        recaptchaLogError('❌ Error general en proceso de login:', error);
        console.error('Error completo:', error);
        if (typeof showNotification === 'function') {
          showNotification('Error al procesar el login. Intenta de nuevo.', 'error');
        }
      }
    }, true); // Usar capture phase
  } else {
    recaptchaLogWarn('⚠️ Formulario de admin login NO encontrado');
  }

  recaptchaLogInfo('✅ reCAPTCHA inicializado en todos los formularios');
  
  // Marcar que reCAPTCHA está inicializado para que script.js no agregue listeners duplicados
  window.recaptchaInitialized = true;
}

// Inicializar cuando el DOM esté listo y reCAPTCHA esté cargado
let waitForRecaptchaAttempts = 0;
const MAX_WAIT_ATTEMPTS = 60; // 30 segundos máximo

function waitForRecaptchaAndInitialize() {
  waitForRecaptchaAttempts++;
  
  // Verificar si script.js se ha cargado correctamente
  const scriptLoaded = typeof window !== 'undefined' && window.scriptJsLoaded;
  // Verificar si el script de respaldo está disponible
  const fallbackLoaded = typeof window !== 'undefined' && window.adminLoginFallbackLoaded;
  // Verificar si handleAdminLogin está disponible (de script.js o del fallback)
  const handleAdminLoginAvailable = typeof window !== 'undefined' && 
    (typeof handleAdminLogin !== 'undefined' || typeof window.handleAdminLogin !== 'undefined');
  
  // Si tenemos el fallback o handleAdminLogin disponible, podemos continuar
  // No necesitamos esperar a script.js si el fallback está disponible
  if (!handleAdminLoginAvailable && !fallbackLoaded) {
    if (waitForRecaptchaAttempts < MAX_WAIT_ATTEMPTS) {
      if (waitForRecaptchaAttempts % 10 === 0) {
        recaptchaLogWarn(`⏳ Esperando a que handleAdminLogin esté disponible... (intento ${waitForRecaptchaAttempts}/${MAX_WAIT_ATTEMPTS})`);
        recaptchaLogWarn(`   scriptJsLoaded: ${scriptLoaded}, fallbackLoaded: ${fallbackLoaded}, handleAdminLogin: ${handleAdminLoginAvailable}`);
      }
      setTimeout(waitForRecaptchaAndInitialize, 500);
      return;
    } else {
      recaptchaLogError('❌ Timeout esperando a que handleAdminLogin esté disponible.');
      recaptchaLogError('   script.js puede estar corrupto en caché. Por favor, limpia la caché del navegador (Ctrl+Shift+Delete) y recarga la página.');
      // Continuar de todas formas para que al menos otros formularios funcionen
    }
  } else if (fallbackLoaded && !scriptLoaded) {
    recaptchaLogWarn('⚠️ Usando script de respaldo para handleAdminLogin (script.js no se cargó correctamente)');
  }
  
  // Verificar si reCAPTCHA está disponible
  if (typeof window !== 'undefined' && window.grecaptcha) {
    recaptchaLogInfo('✅ reCAPTCHA cargado, inicializando...');
    initializeRecaptcha();
  } else {
    // Esperar un poco más y reintentar
    if (waitForRecaptchaAttempts < MAX_WAIT_ATTEMPTS * 2) {
      recaptchaLogInfo('⏳ Esperando a que reCAPTCHA se cargue...');
      setTimeout(waitForRecaptchaAndInitialize, 500);
    } else {
      recaptchaLogError('❌ Timeout esperando a que reCAPTCHA se cargue.');
    }
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
    recaptchaLogInfo('📝 Formulario de admin login encontrado, agregando listener...');
    // Usar capture phase para interceptar antes que otros listeners
    adminLoginForm.addEventListener('submit', async (e) => {
      recaptchaLogInfo('🔔 Submit del formulario de admin detectado');
      e.preventDefault();
      e.stopImmediatePropagation(); // Prevenir que otros listeners se ejecuten
      
      // Esperar más tiempo para asegurar que handleAdminLogin esté disponible
      // (script.js puede tardar en cargar completamente)
      let retries = 0;
      const maxRetries = 50; // Aumentar a 50 intentos (5 segundos)
      while ((typeof handleAdminLogin === 'undefined' && typeof window.handleAdminLogin === 'undefined') && retries < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 100));
        retries++;
        if (retries % 10 === 0) {
          recaptchaLogInfo(`⏳ Esperando handleAdminLogin... (intento ${retries}/${maxRetries})`);
        }
      }
      
      recaptchaLogInfo('🔍 handleAdminLogin disponible:', typeof handleAdminLogin !== 'undefined' || typeof window.handleAdminLogin !== 'undefined');
      
      // Si handleAdminLogin no está disponible después de esperar, verificar el fallback
      if (typeof handleAdminLogin === 'undefined' && typeof window.handleAdminLogin === 'undefined') {
        // Verificar si el fallback está disponible
        if (typeof window !== 'undefined' && window.adminLoginFallbackLoaded && typeof window.handleAdminLogin === 'function') {
          recaptchaLogInfo('✅ Usando handleAdminLogin del script de respaldo');
          // La función ya está disponible en window.handleAdminLogin, continuar
        } else {
          recaptchaLogError('❌ handleAdminLogin NO disponible después de esperar. Verifica que script.js se haya cargado correctamente.');
          recaptchaLogError('🔍 Estado de scripts:', {
            scriptJsLoaded: typeof window !== 'undefined' && window.scriptJsLoaded,
            fallbackLoaded: typeof window !== 'undefined' && window.adminLoginFallbackLoaded,
            handleAdminLogin: typeof handleAdminLogin,
            windowHandleAdminLogin: typeof window.handleAdminLogin
          });
          if (typeof showNotification === 'function') {
            showNotification('Error: El sistema de login no está disponible. Por favor, recarga la página (Ctrl+F5 para limpiar caché).', 'error');
          } else {
            alert('Error: El sistema de login no está disponible. Por favor, recarga la página (Ctrl+F5 para limpiar caché).');
          }
          return;
        }
      }
            
      try {
        // Intentar validar reCAPTCHA, pero si falla, continuar sin él
        let recaptchaSuccess = false;
        try {
          await handleFormWithRecaptcha('adminLoginForm', RECAPTCHA_CONFIG.actions.admin_login, async (token) => {
            recaptchaLogInfo('✅ reCAPTCHA validado, token recibido');
            recaptchaSuccess = true;
        // Aquí va la lógica original de admin login
        // Buscar campos de email y password de múltiples formas
        const emailInput = adminLoginForm.querySelector('#adminEmail') || 
                          adminLoginForm.querySelector('input[type="email"]') ||
                          adminLoginForm.querySelector('input[name="email"]');
        const passwordInput = adminLoginForm.querySelector('#adminPassword') || 
                             adminLoginForm.querySelector('input[type="password"]') ||
                             adminLoginForm.querySelector('input[name="password"]');
        
        if (!emailInput || !passwordInput) {
          recaptchaLogWarn('⚠️ No se encontraron los campos de acceso admin dentro del formulario');
          recaptchaLogWarn('Email input encontrado:', !!emailInput, 'Password input encontrado:', !!passwordInput);
          if (typeof showNotification === 'function') {
            showNotification('No se pudo validar el formulario de acceso admin. Refresca la página e inténtalo de nuevo.', 'error');
          }
          return;
        }
        
        const email = emailInput.value.trim();
        const password = passwordInput.value;

        if (!email || !password) {
          recaptchaLogWarn('⚠️ Email o contraseña vacíos');
          if (typeof showNotification === 'function') {
            showNotification('Por favor, introduce correo y contraseña.', 'error');
          }
          return;
        }
                
        recaptchaLogInfo('👨‍💼 Procesando admin login con reCAPTCHA válido');
                
        // Llamar a la función original de admin login
        // Intentar múltiples formas de acceder a la función
        let adminLoginHandler = null;
        if (typeof handleAdminLogin === 'function') {
          adminLoginHandler = handleAdminLogin;
        } else if (typeof window.handleAdminLogin === 'function') {
          adminLoginHandler = window.handleAdminLogin;
        }
        
        if (adminLoginHandler) {
          try {
            const result = await adminLoginHandler(email, password, token);
            if (result === false) {
              // handleAdminLogin retornó false, probablemente credenciales incorrectas
              recaptchaLogWarn('⚠️ Login fallido - credenciales incorrectas');
            } else {
              recaptchaLogInfo('✅ Login procesado correctamente');
            }
          } catch (error) {
            recaptchaLogError('❌ Error ejecutando handleAdminLogin:', error);
            console.error('Error completo:', error);
            // Intentar login alternativo si handleAdminLogin falla
            try {
              await fallbackAdminLogin(email, password);
            } catch (fallbackError) {
              recaptchaLogError('❌ Error en login alternativo:', fallbackError);
              if (typeof showNotification === 'function') {
                showNotification('Error al procesar el login. Intenta de nuevo.', 'error');
              }
            }
          }
        } else {
          recaptchaLogWarn('⚠️ handleAdminLogin no encontrada, intentando login alternativo...');
          // Intentar login alternativo
          try {
            await fallbackAdminLogin(email, password);
          } catch (error) {
            recaptchaLogError('❌ Error en login alternativo:', error);
            recaptchaLogError('handleAdminLogin disponible:', typeof handleAdminLogin);
            recaptchaLogError('window.handleAdminLogin disponible:', typeof window.handleAdminLogin);
            if (typeof showNotification === 'function') {
              showNotification('Error: El sistema de login no está disponible. Por favor, recarga la página (Ctrl+F5 para limpiar caché).', 'error');
            }
          }
        }
          });
        } catch (recaptchaError) {
          recaptchaLogWarn('⚠️ Error validando reCAPTCHA, continuando sin validación:', recaptchaError);
          // Si reCAPTCHA falla, intentar login sin él
          recaptchaSuccess = false;
        }
        
        // Si reCAPTCHA falló o no está disponible, intentar login directo
        if (!recaptchaSuccess) {
          recaptchaLogInfo('🔄 Intentando login sin reCAPTCHA...');
          const emailInput = adminLoginForm.querySelector('#adminEmail') || 
                            adminLoginForm.querySelector('input[type="email"]') ||
                            adminLoginForm.querySelector('input[name="email"]');
          const passwordInput = adminLoginForm.querySelector('#adminPassword') || 
                               adminLoginForm.querySelector('input[type="password"]') ||
                               adminLoginForm.querySelector('input[name="password"]');
          
          if (emailInput && passwordInput) {
            const email = emailInput.value.trim();
            const password = passwordInput.value;
            
            if (email && password) {
              const adminLoginHandler = handleAdminLogin || window.handleAdminLogin;
              if (adminLoginHandler) {
                try {
                  await adminLoginHandler(email, password);
                } catch (error) {
                  recaptchaLogError('❌ Error en login directo:', error);
                  // Intentar login alternativo
                  try {
                    await fallbackAdminLogin(email, password);
                  } catch (fallbackError) {
                    recaptchaLogError('❌ Error en login alternativo (fallback):', fallbackError);
                  }
                }
              } else {
                // Si no hay handler, intentar login alternativo
                try {
                  await fallbackAdminLogin(email, password);
                } catch (error) {
                  recaptchaLogError('❌ Error en login alternativo (sin reCAPTCHA):', error);
                }
              }
            }
          }
        }
      } catch (error) {
        recaptchaLogError('❌ Error general en proceso de login:', error);
        console.error('Error completo:', error);
        if (typeof showNotification === 'function') {
          showNotification('Error al procesar el login. Intenta de nuevo.', 'error');
        }
      }
    }, true); // Usar capture phase
  } else {
    recaptchaLogWarn('⚠️ Formulario de admin login NO encontrado');
  }

  recaptchaLogInfo('✅ reCAPTCHA inicializado en todos los formularios');
  
  // Marcar que reCAPTCHA está inicializado para que script.js no agregue listeners duplicados
  window.recaptchaInitialized = true;
}

// Inicializar cuando el DOM esté listo y reCAPTCHA esté cargado
let waitForRecaptchaAttempts = 0;
const MAX_WAIT_ATTEMPTS = 60; // 30 segundos máximo

function waitForRecaptchaAndInitialize() {
  waitForRecaptchaAttempts++;
  
  // Verificar si script.js se ha cargado correctamente
  const scriptLoaded = typeof window !== 'undefined' && window.scriptJsLoaded;
  // Verificar si el script de respaldo está disponible
  const fallbackLoaded = typeof window !== 'undefined' && window.adminLoginFallbackLoaded;
  // Verificar si handleAdminLogin está disponible (de script.js o del fallback)
  const handleAdminLoginAvailable = typeof window !== 'undefined' && 
    (typeof handleAdminLogin !== 'undefined' || typeof window.handleAdminLogin !== 'undefined');
  
  // Si tenemos el fallback o handleAdminLogin disponible, podemos continuar
  // No necesitamos esperar a script.js si el fallback está disponible
  if (!handleAdminLoginAvailable && !fallbackLoaded) {
    if (waitForRecaptchaAttempts < MAX_WAIT_ATTEMPTS) {
      if (waitForRecaptchaAttempts % 10 === 0) {
        recaptchaLogWarn(`⏳ Esperando a que handleAdminLogin esté disponible... (intento ${waitForRecaptchaAttempts}/${MAX_WAIT_ATTEMPTS})`);
        recaptchaLogWarn(`   scriptJsLoaded: ${scriptLoaded}, fallbackLoaded: ${fallbackLoaded}, handleAdminLogin: ${handleAdminLoginAvailable}`);
      }
      setTimeout(waitForRecaptchaAndInitialize, 500);
      return;
    } else {
      recaptchaLogError('❌ Timeout esperando a que handleAdminLogin esté disponible.');
      recaptchaLogError('   script.js puede estar corrupto en caché. Por favor, limpia la caché del navegador (Ctrl+Shift+Delete) y recarga la página.');
      // Continuar de todas formas para que al menos otros formularios funcionen
    }
  } else if (fallbackLoaded && !scriptLoaded) {
    recaptchaLogWarn('⚠️ Usando script de respaldo para handleAdminLogin (script.js no se cargó correctamente)');
  }
  
  // Verificar si reCAPTCHA está disponible
  if (typeof window !== 'undefined' && window.grecaptcha) {
    recaptchaLogInfo('✅ reCAPTCHA cargado, inicializando...');
    initializeRecaptcha();
  } else {
    // Esperar un poco más y reintentar
    if (waitForRecaptchaAttempts < MAX_WAIT_ATTEMPTS * 2) {
    recaptchaLogInfo('⏳ Esperando a que reCAPTCHA se cargue...');
    setTimeout(waitForRecaptchaAndInitialize, 500);
    } else {
      recaptchaLogError('❌ Timeout esperando a que reCAPTCHA se cargue.');
    }
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
    recaptchaLogInfo('📝 Formulario de admin login encontrado, agregando listener...');
    // Usar capture phase para interceptar antes que otros listeners
    adminLoginForm.addEventListener('submit', async (e) => {
      recaptchaLogInfo('🔔 Submit del formulario de admin detectado');
      e.preventDefault();
      e.stopImmediatePropagation(); // Prevenir que otros listeners se ejecuten
      
      // Esperar más tiempo para asegurar que handleAdminLogin esté disponible
      // (script.js puede tardar en cargar completamente)
      let retries = 0;
      const maxRetries = 50; // Aumentar a 50 intentos (5 segundos)
      while ((typeof handleAdminLogin === 'undefined' && typeof window.handleAdminLogin === 'undefined') && retries < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 100));
        retries++;
        if (retries % 10 === 0) {
          recaptchaLogInfo(`⏳ Esperando handleAdminLogin... (intento ${retries}/${maxRetries})`);
        }
      }
      
      recaptchaLogInfo('🔍 handleAdminLogin disponible:', typeof handleAdminLogin !== 'undefined' || typeof window.handleAdminLogin !== 'undefined');
      
      // Si handleAdminLogin no está disponible después de esperar, verificar el fallback
      if (typeof handleAdminLogin === 'undefined' && typeof window.handleAdminLogin === 'undefined') {
        // Verificar si el fallback está disponible
        if (typeof window !== 'undefined' && window.adminLoginFallbackLoaded && typeof window.handleAdminLogin === 'function') {
          recaptchaLogInfo('✅ Usando handleAdminLogin del script de respaldo');
          // La función ya está disponible en window.handleAdminLogin, continuar
        } else {
          recaptchaLogError('❌ handleAdminLogin NO disponible después de esperar. Verifica que script.js se haya cargado correctamente.');
          recaptchaLogError('🔍 Estado de scripts:', {
            scriptJsLoaded: typeof window !== 'undefined' && window.scriptJsLoaded,
            fallbackLoaded: typeof window !== 'undefined' && window.adminLoginFallbackLoaded,
            handleAdminLogin: typeof handleAdminLogin,
            windowHandleAdminLogin: typeof window.handleAdminLogin
          });
          if (typeof showNotification === 'function') {
            showNotification('Error: El sistema de login no está disponible. Por favor, recarga la página (Ctrl+F5 para limpiar caché).', 'error');
          } else {
            alert('Error: El sistema de login no está disponible. Por favor, recarga la página (Ctrl+F5 para limpiar caché).');
          }
          return;
        }
      }
            
      try {
        // Intentar validar reCAPTCHA, pero si falla, continuar sin él
        let recaptchaSuccess = false;
        try {
          await handleFormWithRecaptcha('adminLoginForm', RECAPTCHA_CONFIG.actions.admin_login, async (token) => {
            recaptchaLogInfo('✅ reCAPTCHA validado, token recibido');
            recaptchaSuccess = true;
        // Aquí va la lógica original de admin login
        // Buscar campos de email y password de múltiples formas
        const emailInput = adminLoginForm.querySelector('#adminEmail') || 
                          adminLoginForm.querySelector('input[type="email"]') ||
                          adminLoginForm.querySelector('input[name="email"]');
        const passwordInput = adminLoginForm.querySelector('#adminPassword') || 
                             adminLoginForm.querySelector('input[type="password"]') ||
                             adminLoginForm.querySelector('input[name="password"]');
        
        if (!emailInput || !passwordInput) {
          recaptchaLogWarn('⚠️ No se encontraron los campos de acceso admin dentro del formulario');
          recaptchaLogWarn('Email input encontrado:', !!emailInput, 'Password input encontrado:', !!passwordInput);
          if (typeof showNotification === 'function') {
            showNotification('No se pudo validar el formulario de acceso admin. Refresca la página e inténtalo de nuevo.', 'error');
          }
          return;
        }
        
        const email = emailInput.value.trim();
        const password = passwordInput.value;

        if (!email || !password) {
          recaptchaLogWarn('⚠️ Email o contraseña vacíos');
          if (typeof showNotification === 'function') {
            showNotification('Por favor, introduce correo y contraseña.', 'error');
          }
          return;
        }
                
        recaptchaLogInfo('👨‍💼 Procesando admin login con reCAPTCHA válido');
                
        // Llamar a la función original de admin login
        // Intentar múltiples formas de acceder a la función
        let adminLoginHandler = null;
        if (typeof handleAdminLogin === 'function') {
          adminLoginHandler = handleAdminLogin;
        } else if (typeof window.handleAdminLogin === 'function') {
          adminLoginHandler = window.handleAdminLogin;
        }
        
        if (adminLoginHandler) {
          try {
            const result = await adminLoginHandler(email, password, token);
            if (result === false) {
              // handleAdminLogin retornó false, probablemente credenciales incorrectas
              recaptchaLogWarn('⚠️ Login fallido - credenciales incorrectas');
            } else {
              recaptchaLogInfo('✅ Login procesado correctamente');
            }
          } catch (error) {
            recaptchaLogError('❌ Error ejecutando handleAdminLogin:', error);
            console.error('Error completo:', error);
            // Intentar login alternativo si handleAdminLogin falla
            try {
              await fallbackAdminLogin(email, password);
            } catch (fallbackError) {
              recaptchaLogError('❌ Error en login alternativo:', fallbackError);
              if (typeof showNotification === 'function') {
                showNotification('Error al procesar el login. Intenta de nuevo.', 'error');
              }
            }
          }
        } else {
          recaptchaLogWarn('⚠️ handleAdminLogin no encontrada, intentando login alternativo...');
          // Intentar login alternativo
          try {
            await fallbackAdminLogin(email, password);
          } catch (error) {
            recaptchaLogError('❌ Error en login alternativo:', error);
            recaptchaLogError('handleAdminLogin disponible:', typeof handleAdminLogin);
            recaptchaLogError('window.handleAdminLogin disponible:', typeof window.handleAdminLogin);
            if (typeof showNotification === 'function') {
              showNotification('Error: El sistema de login no está disponible. Por favor, recarga la página (Ctrl+F5 para limpiar caché).', 'error');
            }
          }
        }
          });
        } catch (recaptchaError) {
          recaptchaLogWarn('⚠️ Error validando reCAPTCHA, continuando sin validación:', recaptchaError);
          // Si reCAPTCHA falla, intentar login sin él
          recaptchaSuccess = false;
        }
        
        // Si reCAPTCHA falló o no está disponible, intentar login directo
        if (!recaptchaSuccess) {
          recaptchaLogInfo('🔄 Intentando login sin reCAPTCHA...');
          const emailInput = adminLoginForm.querySelector('#adminEmail') || 
                            adminLoginForm.querySelector('input[type="email"]') ||
                            adminLoginForm.querySelector('input[name="email"]');
          const passwordInput = adminLoginForm.querySelector('#adminPassword') || 
                               adminLoginForm.querySelector('input[type="password"]') ||
                               adminLoginForm.querySelector('input[name="password"]');
          
          if (emailInput && passwordInput) {
            const email = emailInput.value.trim();
            const password = passwordInput.value;
            
            if (email && password) {
              const adminLoginHandler = handleAdminLogin || window.handleAdminLogin;
              if (adminLoginHandler) {
                try {
                  await adminLoginHandler(email, password);
                } catch (error) {
                  recaptchaLogError('❌ Error en login directo:', error);
                  // Intentar login alternativo
                  try {
                    await fallbackAdminLogin(email, password);
                  } catch (fallbackError) {
                    recaptchaLogError('❌ Error en login alternativo (fallback):', fallbackError);
                  }
                }
              } else {
                // Si no hay handler, intentar login alternativo
                try {
                  await fallbackAdminLogin(email, password);
                } catch (error) {
                  recaptchaLogError('❌ Error en login alternativo (sin reCAPTCHA):', error);
                }
              }
            }
          }
        }
      } catch (error) {
        recaptchaLogError('❌ Error general en proceso de login:', error);
        console.error('Error completo:', error);
        if (typeof showNotification === 'function') {
          showNotification('Error al procesar el login. Intenta de nuevo.', 'error');
        }
      }
    }, true); // Usar capture phase
  } else {
    recaptchaLogWarn('⚠️ Formulario de admin login NO encontrado');
  }

  recaptchaLogInfo('✅ reCAPTCHA inicializado en todos los formularios');
  
  // Marcar que reCAPTCHA está inicializado para que script.js no agregue listeners duplicados
  window.recaptchaInitialized = true;
}

// Inicializar cuando el DOM esté listo y reCAPTCHA esté cargado
let waitForRecaptchaAttempts = 0;
const MAX_WAIT_ATTEMPTS = 60; // 30 segundos máximo

function waitForRecaptchaAndInitialize() {
  waitForRecaptchaAttempts++;
  
  // Verificar si script.js se ha cargado correctamente
  const scriptLoaded = typeof window !== 'undefined' && window.scriptJsLoaded;
  // Verificar si el script de respaldo está disponible
  const fallbackLoaded = typeof window !== 'undefined' && window.adminLoginFallbackLoaded;
  // Verificar si handleAdminLogin está disponible (de script.js o del fallback)
  const handleAdminLoginAvailable = typeof window !== 'undefined' && 
    (typeof handleAdminLogin !== 'undefined' || typeof window.handleAdminLogin !== 'undefined');
  
  // Si tenemos el fallback o handleAdminLogin disponible, podemos continuar
  // No necesitamos esperar a script.js si el fallback está disponible
  if (!handleAdminLoginAvailable && !fallbackLoaded) {
    if (waitForRecaptchaAttempts < MAX_WAIT_ATTEMPTS) {
      if (waitForRecaptchaAttempts % 10 === 0) {
        recaptchaLogWarn(`⏳ Esperando a que handleAdminLogin esté disponible... (intento ${waitForRecaptchaAttempts}/${MAX_WAIT_ATTEMPTS})`);
        recaptchaLogWarn(`   scriptJsLoaded: ${scriptLoaded}, fallbackLoaded: ${fallbackLoaded}, handleAdminLogin: ${handleAdminLoginAvailable}`);
      }
      setTimeout(waitForRecaptchaAndInitialize, 500);
      return;
    } else {
      recaptchaLogError('❌ Timeout esperando a que handleAdminLogin esté disponible.');
      recaptchaLogError('   script.js puede estar corrupto en caché. Por favor, limpia la caché del navegador (Ctrl+Shift+Delete) y recarga la página.');
      // Continuar de todas formas para que al menos otros formularios funcionen
    }
  } else if (fallbackLoaded && !scriptLoaded) {
    recaptchaLogWarn('⚠️ Usando script de respaldo para handleAdminLogin (script.js no se cargó correctamente)');
  }
  
  // Verificar si reCAPTCHA está disponible
  if (typeof window !== 'undefined' && window.grecaptcha) {
    recaptchaLogInfo('✅ reCAPTCHA cargado, inicializando...');
    initializeRecaptcha();
  } else {
    // Esperar un poco más y reintentar
    if (waitForRecaptchaAttempts < MAX_WAIT_ATTEMPTS * 2) {
      recaptchaLogInfo('⏳ Esperando a que reCAPTCHA se cargue...');
      setTimeout(waitForRecaptchaAndInitialize, 500);
    } else {
      recaptchaLogError('❌ Timeout esperando a que reCAPTCHA se cargue.');
    }
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