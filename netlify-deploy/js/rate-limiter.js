// ===== RATE LIMITING =====
// Sistema para limitar la frecuencia de operaciones críticas

// Configuración de rate limiting
const RATE_LIMITS = {
  register: { max: 3, window: 60000 }, // 3 registros por minuto
  sendNotification: { max: 10, window: 60000 }, // 10 notificaciones por minuto
  saveData: { max: 20, window: 60000 }, // 20 guardados por minuto
  login: { max: 5, window: 300000 }, // 5 intentos de login por 5 minutos
  createAppointment: { max: 5, window: 60000 }, // 5 citas por minuto
  updateUser: { max: 10, window: 60000 } // 10 actualizaciones por minuto
};

// Almacenamiento de intentos (en memoria)
const rateLimitStore = {};

/**
 * Limpia intentos antiguos de una operación
 * @param {string} operation - Nombre de la operación
 */
function cleanupOldAttempts(operation) {
  const limit = RATE_LIMITS[operation];
  if (!limit) return;
  
  const now = Date.now();
  const key = `rate_limit_${operation}`;
  
  if (!rateLimitStore[key]) {
    rateLimitStore[key] = [];
    return;
  }
  
  // Mantener solo intentos dentro de la ventana de tiempo
  rateLimitStore[key] = rateLimitStore[key].filter(time => now - time < limit.window);
}

/**
 * Verifica si una operación excede el rate limit
 * @param {string} operation - Nombre de la operación
 * @returns {Object} - { allowed: boolean, waitTime: number }
 */
function checkRateLimit(operation) {
  const limit = RATE_LIMITS[operation];
  if (!limit) {
    return { allowed: true, waitTime: 0 };
  }
  
  const now = Date.now();
  const key = `rate_limit_${operation}`;
  
  // Limpiar intentos antiguos
  cleanupOldAttempts(operation);
  
  if (!rateLimitStore[key]) {
    rateLimitStore[key] = [];
  }
  
  const attempts = rateLimitStore[key];
  
  // Verificar límite
  if (attempts.length >= limit.max) {
    const oldestAttempt = attempts[0];
    const waitTime = limit.window - (now - oldestAttempt);
    return {
      allowed: false,
      waitTime: Math.ceil(waitTime / 1000) // En segundos
    };
  }
  
  // Registrar intento
  attempts.push(now);
  return { allowed: true, waitTime: 0 };
}

/**
 * Wrapper para aplicar rate limiting a una función
 * @param {string} operation - Nombre de la operación
 * @param {Function} fn - Función a ejecutar
 * @returns {Function} - Función envuelta con rate limiting
 */
function withRateLimit(operation, fn) {
  return async (...args) => {
    const check = checkRateLimit(operation);
    
    if (!check.allowed) {
      const error = new Error(`Rate limit excedido. Intente de nuevo en ${check.waitTime} segundos`);
      error.code = 'RATE_LIMIT_EXCEEDED';
      error.waitTime = check.waitTime;
      throw error;
    }
    
    return await fn(...args);
  };
}

/**
 * Obtiene información sobre el rate limit de una operación
 * @param {string} operation - Nombre de la operación
 * @returns {Object} - Información del rate limit
 */
function getRateLimitInfo(operation) {
  const limit = RATE_LIMITS[operation];
  if (!limit) {
    return null;
  }
  
  cleanupOldAttempts(operation);
  const key = `rate_limit_${operation}`;
  const attempts = rateLimitStore[key] || [];
  
  return {
    operation,
    max: limit.max,
    window: limit.window,
    windowSeconds: limit.window / 1000,
    current: attempts.length,
    remaining: Math.max(0, limit.max - attempts.length),
    resetIn: attempts.length > 0 ? Math.ceil((limit.window - (Date.now() - attempts[0])) / 1000) : 0
  };
}

/**
 * Reinicia las métricas de rate limit (principalmente para pruebas)
 */
function resetRateLimitStore() {
  Object.keys(rateLimitStore).forEach((key) => {
    delete rateLimitStore[key];
  });
}

// Exportar funciones
if (typeof window !== 'undefined') {
  window.checkRateLimit = checkRateLimit;
  window.withRateLimit = withRateLimit;
  window.getRateLimitInfo = getRateLimitInfo;
  window.resetRateLimitStore = resetRateLimitStore;
  window.RATE_LIMITS = RATE_LIMITS;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    RATE_LIMITS,
    checkRateLimit,
    withRateLimit,
    getRateLimitInfo,
    cleanupOldAttempts,
    resetRateLimitStore
  };
}

