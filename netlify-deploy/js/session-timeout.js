// ===== GESTIÓN DE TIMEOUT DE SESIÓN =====
// Sistema para cerrar sesión automáticamente tras inactividad

const SESSION_TIMEOUT = {
    // Tiempo de inactividad antes de cerrar sesión (30 minutos en milisegundos)
    INACTIVITY_TIMEOUT: 30 * 60 * 1000, // 30 minutos
    
    // Tiempo antes de mostrar advertencia (5 minutos antes del cierre)
    WARNING_TIME: 5 * 60 * 1000, // 5 minutos
    
    // Intervalo para verificar actividad (cada minuto)
    CHECK_INTERVAL: 60 * 1000, // 1 minuto
};

let lastActivityTime = Date.now();
let warningShown = false;
let timeoutId = null;
let checkIntervalId = null;
let isSessionActive = false;

/**
 * Actualiza el tiempo de última actividad
 */
function updateActivityTime() {
    lastActivityTime = Date.now();
    warningShown = false;
    
    // Si hay un timeout activo, reiniciarlo
    if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
    }
    
    // Si la sesión está activa, programar nuevo timeout
    if (isSessionActive) {
        scheduleSessionTimeout();
    }
}

/**
 * Programa el timeout de sesión
 */
function scheduleSessionTimeout() {
    // Limpiar timeout anterior si existe
    if (timeoutId) {
        clearTimeout(timeoutId);
    }
    
    // Calcular tiempo hasta el cierre
    const timeUntilTimeout = SESSION_TIMEOUT.INACTIVITY_TIMEOUT;
    const timeUntilWarning = timeUntilTimeout - SESSION_TIMEOUT.WARNING_TIME;
    
    // Programar advertencia
    if (timeUntilWarning > 0) {
        setTimeout(() => {
            if (isSessionActive && !warningShown) {
                showSessionWarning();
            }
        }, timeUntilWarning);
    }
    
    // Programar cierre de sesión
    timeoutId = setTimeout(() => {
        if (isSessionActive) {
            handleSessionTimeout();
        }
    }, timeUntilTimeout);
}

/**
 * Muestra advertencia de que la sesión está por expirar
 */
function showSessionWarning() {
    if (warningShown) return;
    warningShown = true;
    
    const warningMessage = `Tu sesión expirará en ${SESSION_TIMEOUT.WARNING_TIME / 60000} minutos por inactividad. ¿Deseas continuar?`;
    
    // Mostrar notificación
    if (typeof showNotification === 'function') {
        showNotification(warningMessage, 'warning', 0); // 0 = sin auto-cerrar
    } else {
        alert(warningMessage);
    }
    
    // Crear botón de "Continuar" si hay notificación
    const notification = document.querySelector('.notification.warning');
    if (notification) {
        const continueBtn = document.createElement('button');
        continueBtn.textContent = 'Continuar';
        continueBtn.className = 'btn btn-primary btn-sm';
        continueBtn.style.marginLeft = '10px';
        continueBtn.onclick = () => {
            updateActivityTime();
            if (typeof closeNotification === 'function') {
                closeNotification(notification);
            } else {
                notification.remove();
            }
        };
        notification.appendChild(continueBtn);
    }
}

/**
 * Maneja el cierre de sesión por timeout
 */
function handleSessionTimeout() {
    console.log('[SessionTimeout] Sesión cerrada por inactividad');
    
    // Cerrar sesión
    if (typeof logout === 'function') {
        logout();
    } else if (window.firebaseAuth && typeof window.firebase.signOut === 'function') {
        window.firebase.signOut(window.firebaseAuth).then(() => {
            // Limpiar datos de sesión
            localStorage.removeItem('isAdmin');
            localStorage.removeItem('userData');
            sessionStorage.clear();
            
            // Recargar página
            window.location.reload();
        }).catch(error => {
            console.error('[SessionTimeout] Error al cerrar sesión:', error);
        });
    }
    
    // Mostrar mensaje
    if (typeof showNotification === 'function') {
        showNotification('Tu sesión ha expirado por inactividad. Por favor, inicia sesión nuevamente.', 'info');
    }
    
    // Detener el sistema de timeout
    stopSessionTimeout();
}

/**
 * Inicia el sistema de timeout de sesión
 */
function startSessionTimeout() {
    if (isSessionActive) {
        console.warn('[SessionTimeout] El sistema de timeout ya está activo');
        return;
    }
    
    isSessionActive = true;
    lastActivityTime = Date.now();
    warningShown = false;
    
    // Programar timeout inicial
    scheduleSessionTimeout();
    
    // Iniciar verificación periódica
    checkIntervalId = setInterval(() => {
        const timeSinceActivity = Date.now() - lastActivityTime;
        
        // Si ha pasado el tiempo de inactividad, cerrar sesión
        if (timeSinceActivity >= SESSION_TIMEOUT.INACTIVITY_TIMEOUT) {
            handleSessionTimeout();
        }
        // Si está cerca del timeout y no se ha mostrado la advertencia
        else if (timeSinceActivity >= (SESSION_TIMEOUT.INACTIVITY_TIMEOUT - SESSION_TIMEOUT.WARNING_TIME) && !warningShown) {
            showSessionWarning();
        }
    }, SESSION_TIMEOUT.CHECK_INTERVAL);
    
    console.log('[SessionTimeout] Sistema de timeout iniciado');
}

/**
 * Detiene el sistema de timeout de sesión
 */
function stopSessionTimeout() {
    isSessionActive = false;
    warningShown = false;
    
    if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
    }
    
    if (checkIntervalId) {
        clearInterval(checkIntervalId);
        checkIntervalId = null;
    }
    
    console.log('[SessionTimeout] Sistema de timeout detenido');
}

/**
 * Reinicia el timeout de sesión (útil después de acciones importantes)
 */
function resetSessionTimeout() {
    if (isSessionActive) {
        updateActivityTime();
    }
}

// Eventos que indican actividad del usuario
const activityEvents = [
    'mousedown',
    'mousemove',
    'keypress',
    'scroll',
    'touchstart',
    'click',
    'keydown'
];

// Agregar listeners de actividad
activityEvents.forEach(event => {
    document.addEventListener(event, updateActivityTime, { passive: true });
});

// También considerar actividad en ventanas/iframe
window.addEventListener('focus', updateActivityTime);
window.addEventListener('blur', () => {
    // No actualizar en blur, pero sí verificar al volver
    window.addEventListener('focus', updateActivityTime, { once: true });
});

// Detener timeout cuando se cierra la página
window.addEventListener('beforeunload', () => {
    stopSessionTimeout();
});

// Iniciar automáticamente si hay una sesión activa
document.addEventListener('DOMContentLoaded', () => {
    // Esperar a que Firebase esté listo
    const checkFirebase = setInterval(() => {
        if (window.firebaseInitialized && window.firebaseAuth) {
            clearInterval(checkFirebase);
            
            // Verificar si hay usuario autenticado
            window.firebase.onAuthStateChanged(window.firebaseAuth, (user) => {
                if (user) {
                    // Verificar si es admin o usuario normal
                    const isAdmin = localStorage.getItem('isAdmin') === 'true';
                    if (isAdmin || user) {
                        startSessionTimeout();
                    }
                } else {
                    stopSessionTimeout();
                }
            });
        }
    }, 500);
    
    // Timeout de seguridad (5 segundos)
    setTimeout(() => {
        clearInterval(checkFirebase);
    }, 5000);
});

// Exportar funciones globalmente
if (typeof window !== 'undefined') {
    window.sessionTimeout = {
        start: startSessionTimeout,
        stop: stopSessionTimeout,
        reset: resetSessionTimeout,
        updateActivity: updateActivityTime
    };
}

// Exportar para uso en otros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        startSessionTimeout,
        stopSessionTimeout,
        resetSessionTimeout,
        updateActivityTime
    };
}






