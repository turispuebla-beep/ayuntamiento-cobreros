// 🛡️ reCAPTCHA v3 Integration - Ayuntamiento de Cobreros
// Configuración y funciones para reCAPTCHA

// ⚠️ IMPORTANTE: Reemplaza con tu SITE KEY real de Google reCAPTCHA Console
const RECAPTCHA_SITE_KEY = '6LeBYM4rAAAAALaDVtPi1H4jWjpj_Ovjf9g8VnT4';

// Validación en servidor (Firebase Cloud Functions del proyecto ayuntamiento-de-cobreros)
const RECAPTCHA_VALIDATION_URL =
    'https://us-central1-ayuntamiento-de-cobreros.cloudfunctions.net/validateRecaptcha';

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
        if (typeof grecaptcha === 'undefined') {
            console.error('reCAPTCHA no está cargado');
            return null;
        }

        // Esperar a que reCAPTCHA esté listo
        await new Promise((resolve) => {
            grecaptcha.ready(resolve);
        });

        // Ejecutar reCAPTCHA
        const token = await grecaptcha.execute(RECAPTCHA_SITE_KEY, { 
            action: action 
        });

        console.log(`✅ reCAPTCHA token obtenido para acción: ${action}`);
        return token;

    } catch (error) {
        console.error('❌ Error ejecutando reCAPTCHA:', error);
        return null;
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
        console.log(`🔍 Validando token reCAPTCHA para acción: ${action}`);

        if (!token || !action) {
            console.log('❌ Token o acción reCAPTCHA ausentes');
            return false;
        }

        const response = await fetch(RECAPTCHA_VALIDATION_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, action })
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok || !data.success) {
            console.log('❌ reCAPTCHA rechazado por el servidor:', data.error || response.status);
            return false;
        }

        const score = typeof data.score === 'number' ? data.score : 0;
        if (score < RECAPTCHA_CONFIG.minScore) {
            console.log(`❌ Score reCAPTCHA bajo: ${score} < ${RECAPTCHA_CONFIG.minScore}`);
            return false;
        }

        console.log('✅ reCAPTCHA válido (servidor)');
        return true;
    } catch (error) {
        console.error('❌ Error validando token reCAPTCHA:', error);
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
        console.error(`❌ Formulario ${formId} o botón no encontrado`);
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
        console.log('✅ reCAPTCHA verificado correctamente');
        
        // Ejecutar callback del formulario
        await submitCallback(token);

    } catch (error) {
        console.error('❌ Error en verificación reCAPTCHA:', error);
        
        // Mostrar error al usuario
        showNotification('Error de verificación de seguridad. Inténtalo de nuevo.', 'error');
        
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
    console.log('🛡️ Inicializando reCAPTCHA v3...');

    // Verificar que la clave esté configurada
    if (RECAPTCHA_SITE_KEY === 'TU_SITE_KEY_AQUI') {
        console.warn('⚠️ RECAPTCHA_SITE_KEY no configurada. Configura tu clave en js/recaptcha.js');
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
                
                console.log('🔐 Procesando login con reCAPTCHA válido');
                
                // Llamar a la función original de login
                if (typeof handleLogin === 'function') {
                    await handleLogin(email, password, token);
                } else {
                    console.error('❌ Función handleLogin no encontrada');
                }
            });
        });
    }

    // Register Form
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            await handleFormWithRecaptcha('registerForm', RECAPTCHA_CONFIG.actions.register, async (token) => {
                // Aquí va la lógica original de registro
                const formData = new FormData(registerForm);
                
                console.log('📝 Procesando registro con reCAPTCHA válido');
                
                // Llamar a la función original de registro
                if (typeof handleRegister === 'function') {
                    await handleRegister(formData, token);
                } else {
                    console.error('❌ Función handleRegister no encontrada');
                }
            });
        });
    }

    // Admin Login Form
    // NOTA: el login admin principal ya se gestiona en js/script.js.
    // Evitamos registrar aquí otro listener para no duplicar submits ni mostrar
    // falsos errores de verificación antes del inicio de sesión real.
    const adminLoginForm = document.getElementById('adminLoginForm');
    if (adminLoginForm) {
        console.log('ℹ️ reCAPTCHA admin listener desactivado para evitar doble validación');
    }

    console.log('✅ reCAPTCHA inicializado en todos los formularios');
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Esperar un poco para que reCAPTCHA se cargue
    setTimeout(initializeRecaptcha, 1000);
});

// Exportar funciones para uso global
window.executeRecaptcha = executeRecaptcha;
window.validateRecaptchaToken = validateRecaptchaToken;
window.handleFormWithRecaptcha = handleFormWithRecaptcha;
