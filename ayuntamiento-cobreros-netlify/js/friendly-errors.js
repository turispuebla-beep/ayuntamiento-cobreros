// ===== MENSAJES DE ERROR MÁS AMIGABLES =====
// Convierte errores técnicos en mensajes comprensibles

/**
 * Convierte un error técnico en un mensaje amigable
 * @param {Error|string} error - Error a convertir
 * @returns {string} - Mensaje amigable
 */
function getFriendlyErrorMessage(error) {
  const errorMessage = typeof error === 'string' ? error : error.message || '';
  const errorCode = error.code || '';
    
  // Mensajes amigables por código de error
  const friendlyMessages = {
    // Firebase/Firestore
    'permission-denied': 'No tiene permisos para realizar esta acción.',
    'unavailable': 'Servicio no disponible. Verifique su conexión a internet.',
    'deadline-exceeded': 'La operación tardó demasiado. Inténtelo de nuevo.',
    'not-found': 'No se encontró el elemento solicitado.',
    'already-exists': 'Este elemento ya existe.',
    'failed-precondition': 'No se puede realizar esta acción en este momento.',
    'aborted': 'La operación fue cancelada.',
    'out-of-range': 'El valor está fuera del rango permitido.',
    'unimplemented': 'Esta función aún no está disponible.',
    'internal': 'Error interno del servidor. Inténtelo más tarde.',
    'unauthenticated': 'Debe iniciar sesión para realizar esta acción.',
    'resource-exhausted': 'Se ha alcanzado el límite de recursos. Inténtelo más tarde.',
        
    // Network
    'network-error': 'Error de conexión. Verifique su internet.',
    'timeout': 'La conexión tardó demasiado. Inténtelo de nuevo.',
    'fetch-error': 'No se pudo conectar con el servidor.',
        
    // Validation
    'validation-error': 'Los datos ingresados no son válidos.',
    'required-field': 'Este campo es obligatorio.',
    'invalid-email': 'El email ingresado no es válido.',
    'invalid-phone': 'El teléfono ingresado no es válido.',
    'invalid-url': 'La URL ingresada no es válida.',
        
    // Generic
    'unknown-error': 'Ha ocurrido un error inesperado. Inténtelo de nuevo.',
    'operation-failed': 'La operación no se pudo completar.',
  };
    
  // Buscar por código
  if (errorCode && friendlyMessages[errorCode]) {
    return friendlyMessages[errorCode];
  }
    
  // Buscar por mensaje
  const lowerMessage = errorMessage.toLowerCase();
    
  if (lowerMessage.includes('permission') || lowerMessage.includes('permiso')) {
    return friendlyMessages['permission-denied'];
  }
    
  if (lowerMessage.includes('network') || lowerMessage.includes('conexión') || lowerMessage.includes('connection')) {
    return friendlyMessages['network-error'];
  }
    
  if (lowerMessage.includes('timeout') || lowerMessage.includes('tiempo')) {
    return friendlyMessages['timeout'];
  }
    
  if (lowerMessage.includes('not found') || lowerMessage.includes('no encontrado')) {
    return friendlyMessages['not-found'];
  }
    
  if (lowerMessage.includes('validation') || lowerMessage.includes('validación')) {
    return friendlyMessages['validation-error'];
  }
    
  if (lowerMessage.includes('email') && (lowerMessage.includes('invalid') || lowerMessage.includes('inválido'))) {
    return friendlyMessages['invalid-email'];
  }
    
  // Si no se encuentra, devolver mensaje genérico pero amigable
  if (errorMessage && errorMessage.length < 100) {
    // Si el mensaje es corto y parece amigable, usarlo
    return typeof cloudUserText === 'function' ? cloudUserText(errorMessage) : errorMessage;
  }
    
  return friendlyMessages['unknown-error'];
}

/**
 * Muestra un error de forma amigable
 * @param {Error|string} error - Error a mostrar
 * @param {string} context - Contexto de la operación (opcional)
 */
function showFriendlyError(error, context = '') {
  const friendlyMessage = getFriendlyErrorMessage(error);
  const message = context ? `${context}: ${friendlyMessage}` : friendlyMessage;
  const displayMessage = typeof cloudUserText === 'function' ? cloudUserText(message) : message;
    
  if (typeof showNotification === 'function') {
    showNotification(displayMessage, 'error');
  } else {
    alert(displayMessage);
  }
    
  // Log técnico para debugging
  if (typeof Logger !== 'undefined' && Logger.error) {
    Logger.error('Error técnico:', error);
  }
}

/**
 * Maneja errores de forma amigable con contexto
 * @param {Error|string} error - Error a manejar
 * @param {string} operation - Operación que falló
 */
function handleFriendlyError(error, operation = '') {
  const context = operation ? `Error al ${operation}` : 'Error';
  showFriendlyError(error, context);
}

// Exportar funciones
if (typeof window !== 'undefined') {
  window.getFriendlyErrorMessage = getFriendlyErrorMessage;
  window.showFriendlyError = showFriendlyError;
  window.handleFriendlyError = handleFriendlyError;
}

