/* eslint-env browser */
/* global validateData, sanitizeData */
// ===== MANEJO DE ERRORES ROBUSTO =====
// Sistema de manejo de errores con reintentos y logging

function logDebug(...args) {
  if (typeof window !== 'undefined' && window.Logger && typeof window.Logger.log === 'function') {
    window.Logger.log(...args);
  }
}

function logWarn(...args) {
  if (typeof window !== 'undefined' && window.Logger && typeof window.Logger.warn === 'function') {
    window.Logger.warn(...args);
  }
}

function logError(...args) {
  if (typeof window !== 'undefined' && window.Logger && typeof window.Logger.error === 'function') {
    window.Logger.error(...args);
  }
}

// Configuración de reintentos
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1 segundo
  maxDelay: 10000, // 10 segundos
  retryableErrors: [
    'unavailable',
    'deadline-exceeded',
    'internal',
    'aborted',
    'cancelled'
  ]
};

// Función de espera
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Ejecuta una función con reintentos automáticos
 * @param {Function} fn - Función a ejecutar
 * @param {string} context - Contexto de la operación (para logging)
 * @param {number} maxRetries - Número máximo de reintentos
 * @returns {Promise} - Resultado de la función
 */
async function withRetry(fn, context = 'operación', maxRetries = RETRY_CONFIG.maxRetries) {
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // No reintentar en ciertos errores
      const errorCode = error.code || error.name || '';
      if (!RETRY_CONFIG.retryableErrors.some(code => errorCode.includes(code))) {
        logError(`❌ Error no reintentable en ${context}:`, error);
        throw error;
      }
      
      if (attempt < maxRetries) {
        const delayMs = Math.min(
          RETRY_CONFIG.baseDelay * Math.pow(2, attempt),
          RETRY_CONFIG.maxDelay
        );
        logWarn(`⚠️ Reintentando ${context} (intento ${attempt + 1}/${maxRetries}) en ${delayMs}ms...`);
        await delay(delayMs);
      }
    }
  }
  
  logError(`❌ Error en ${context} después de ${maxRetries} intentos:`, lastError);
  throw lastError;
}

/**
 * Guarda en Firestore con validación, sanitización y reintentos
 * @param {string} collection - Nombre de la colección
 * @param {Object} data - Datos a guardar
 * @param {string} schemaName - Nombre del esquema de validación
 * @returns {Promise} - Referencia del documento creado
 */
async function safeFirestoreWrite(collection, data, schemaName) {
  // Validar datos si hay esquema
  if (schemaName && typeof validateData === 'function') {
    const validation = validateData(data, schemaName);
    if (!validation.valid) {
      const error = new Error(`Datos inválidos: ${validation.errors.join(', ')}`);
      error.validationErrors = validation.errors;
      throw error;
    }
  }
  
  // Sanitizar datos si hay esquema
  let sanitized = data;
  if (schemaName && typeof sanitizeData === 'function') {
    sanitized = sanitizeData(data, schemaName);
  }
  
  // Verificar que Firebase esté disponible
  if (!window.firebase || !window.firebase.firestore) {
    throw new Error('La nube no está disponible');
  }
  
  // Guardar con reintentos
  return await withRetry(async () => {
    const docRef = await window.firebase.firestore().collection(collection).add(sanitized);
    logDebug(`✅ Datos guardados en ${collection}`);
    return docRef;
  }, `guardar en ${collection}`);
}

/**
 * Actualiza un documento en Firestore con validación y reintentos
 * @param {string} collection - Nombre de la colección
 * @param {string} docId - ID del documento
 * @param {Object} data - Datos a actualizar
 * @param {string} schemaName - Nombre del esquema de validación
 * @returns {Promise} - Promise que se resuelve cuando se actualiza
 */
async function safeFirestoreUpdate(collection, docId, data, schemaName) {
  // Validar datos si hay esquema
  if (schemaName && typeof validateData === 'function') {
    const validation = validateData(data, schemaName);
    if (!validation.valid) {
      const error = new Error(`Datos inválidos: ${validation.errors.join(', ')}`);
      error.validationErrors = validation.errors;
      throw error;
    }
  }
  
  // Sanitizar datos si hay esquema
  let sanitized = data;
  if (schemaName && typeof sanitizeData === 'function') {
    sanitized = sanitizeData(data, schemaName);
  }
  
  // Verificar que Firebase esté disponible
  if (!window.firebase || !window.firebase.firestore) {
    throw new Error('La nube no está disponible');
  }
  
  // Actualizar con reintentos
  return await withRetry(async () => {
    await window.firebase.firestore().collection(collection).doc(docId).update(sanitized);
    logDebug(`✅ Datos actualizados en ${collection}/${docId}`);
  }, `actualizar ${collection}/${docId}`);
}

/**
 * Lee de Firestore con manejo de errores
 * @param {string} collection - Nombre de la colección
 * @param {string} docId - ID del documento (opcional)
 * @returns {Promise} - Datos leídos
 */
async function safeFirestoreRead(collection, docId = null) {
  if (!window.firebase || !window.firebase.firestore) {
    throw new Error('La nube no está disponible');
  }
  
  return await withRetry(async () => {
    if (docId) {
      const doc = await window.firebase.firestore().collection(collection).doc(docId).get();
      if (!doc.exists) {
        throw new Error(`Documento ${docId} no encontrado en ${collection}`);
      }
      return { id: doc.id, ...doc.data() };
    } else {
      const snapshot = await window.firebase.firestore().collection(collection).get();
      const docs = [];
      snapshot.forEach(doc => {
        docs.push({ id: doc.id, ...doc.data() });
      });
      return docs;
    }
  }, `leer de ${collection}`);
}

/**
 * Maneja errores de forma consistente y muestra notificaciones al usuario
 * @param {Error} error - Error a manejar
 * @param {string} userMessage - Mensaje amigable para el usuario
 */
function handleError(error, userMessage = 'Ha ocurrido un error. Por favor, inténtelo de nuevo.') {
  logError('Error:', error);
  
  // Mensaje más específico según el tipo de error
  let message = userMessage;
  
  if (error.code === 'permission-denied') {
    message = 'No tiene permisos para realizar esta acción.';
  } else if (error.code === 'unavailable') {
    message = 'Servicio no disponible. Verifique su conexión a internet.';
  } else if (error.code === 'deadline-exceeded') {
    message = 'La operación tardó demasiado. Inténtelo de nuevo.';
  } else if (error.validationErrors) {
    message = `Datos inválidos: ${error.validationErrors.join(', ')}`;
  } else if (error.message) {
    message = error.message;
  }
  
  // Mostrar notificación al usuario
  if (typeof showNotification === 'function') {
    showNotification(message, 'error');
  } else {
    alert(message);
  }
  
  return message;
}

// Exportar funciones
if (typeof window !== 'undefined') {
  window.withRetry = withRetry;
  window.safeFirestoreWrite = safeFirestoreWrite;
  window.safeFirestoreUpdate = safeFirestoreUpdate;
  window.safeFirestoreRead = safeFirestoreRead;
  window.handleError = handleError;
}

