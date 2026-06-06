/* eslint-env browser */
// ===== GESTIÓN SEGURA DE LOCALSTORAGE =====
// Sistema para manejar localStorage de forma segura con límites y validación

// Límites de tamaño (en bytes)
const STORAGE_LIMITS = {
  maxItemSize: 5 * 1024 * 1024, // 5MB por item
  maxTotalSize: 10 * 1024 * 1024, // 10MB total
  maxItems: 50 // Máximo número de items
};

// Items que se pueden limpiar automáticamente si se excede el límite
const CLEANUP_PRIORITY = {
  low: ['oldNotifications', 'tempData', 'cache', 'debugData'],
  medium: ['events', 'quickAccess'],
  high: ['users', 'administrators', 'news', 'bandos', 'documents', 'notifications']
};

/**
 * Obtiene el tamaño de un objeto en bytes
 * @param {Object} obj - Objeto a medir
 * @returns {number} - Tamaño en bytes
 */
function getObjectSize(obj) {
  try {
    return new Blob([JSON.stringify(obj)]).size;
  } catch (error) {
    Logger.error('Error calculando tamaño de objeto:', error);
    return 0;
  }
}

/**
 * Obtiene el tamaño total de localStorage
 * @returns {number} - Tamaño total en bytes
 */
function getTotalStorageSize() {
  let total = 0;
  try {
    for (const key in localStorage) {
      if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
        total += localStorage[key].length + key.length;
      }
    }
  } catch (error) {
    Logger.error('Error calculando tamaño total:', error);
  }
  return total;
}

/**
 * Limpia items antiguos de localStorage según prioridad
 * @param {number} targetSize - Tamaño objetivo a liberar (en bytes)
 */
function cleanupOldStorageItems(targetSize = 0) {
  let freed = 0;
  
  // Limpiar items de baja prioridad primero
  for (const key of CLEANUP_PRIORITY.low) {
    if (localStorage.getItem(key)) {
      const size = localStorage.getItem(key).length + key.length;
      localStorage.removeItem(key);
      freed += size;
      Logger.log(`🧹 Limpiado ${key} (${(size / 1024).toFixed(2)}KB)`);
      
      if (targetSize > 0 && freed >= targetSize) {
        return freed;
      }
    }
  }
  
  // Si aún necesitamos espacio, limpiar items de prioridad media
  if (targetSize > 0 && freed < targetSize) {
    for (const key of CLEANUP_PRIORITY.medium) {
      if (localStorage.getItem(key)) {
        const size = localStorage.getItem(key).length + key.length;
        localStorage.removeItem(key);
        freed += size;
        Logger.log(`🧹 Limpiado ${key} (${(size / 1024).toFixed(2)}KB)`);
        
        if (freed >= targetSize) {
          return freed;
        }
      }
    }
  }
  
  return freed;
}

/**
 * Guarda de forma segura en localStorage con validación y límites
 * @param {string} key - Clave del item
 * @param {Object} value - Valor a guardar
 * @param {boolean} force - Forzar guardado incluso si excede límites
 * @returns {boolean} - true si se guardó correctamente
 */
function safeLocalStorageSet(key, value, force = false) {
  try {
    const size = getObjectSize(value);
    
    // Verificar límite por item
    if (!force && size > STORAGE_LIMITS.maxItemSize) {
      const error = new Error(`Item demasiado grande: ${(size / 1024 / 1024).toFixed(2)}MB (máximo: ${(STORAGE_LIMITS.maxItemSize / 1024 / 1024).toFixed(2)}MB)`);
      Logger.error('Error:', error);
      throw error;
    }
    
    // Verificar límite total
    const currentTotal = getTotalStorageSize();
    const currentItemSize = localStorage.getItem(key) ? (localStorage.getItem(key).length + key.length) : 0;
    const newTotal = currentTotal - currentItemSize + size;
    
    if (!force && newTotal > STORAGE_LIMITS.maxTotalSize) {
      const needed = newTotal - STORAGE_LIMITS.maxTotalSize;
      Logger.warn(`⚠️ Cuota de almacenamiento casi excedida, limpiando ${(needed / 1024).toFixed(2)}KB...`);
      cleanupOldStorageItems(needed);
      
      // Verificar nuevamente después de limpiar
      const newTotalAfterCleanup = getTotalStorageSize() - currentItemSize + size;
      if (newTotalAfterCleanup > STORAGE_LIMITS.maxTotalSize) {
        const error = new Error('No hay suficiente espacio en almacenamiento local');
        Logger.error('Error:', error);
        throw error;
      }
    }
    
    localStorage.setItem(key, JSON.stringify(value));
    Logger.log(`✅ Guardado en localStorage: ${key} (${(size / 1024).toFixed(2)}KB)`);
    return true;
  } catch (error) {
    if (error.name === 'QuotaExceededError' || error.message.includes('QuotaExceeded')) {
      Logger.warn('⚠️ Cuota de almacenamiento excedida, limpiando...');
      cleanupOldStorageItems();
      
      // Reintentar una vez después de limpiar
      try {
        localStorage.setItem(key, JSON.stringify(value));
        Logger.log(`✅ Guardado en localStorage después de limpiar: ${key}`);
        return true;
      } catch (retryError) {
        Logger.error('❌ Error al guardar en localStorage después de limpiar:', retryError);
        if (typeof showNotification === 'function') {
          showNotification('No hay suficiente espacio para guardar los datos. Algunos datos antiguos se han eliminado.', 'warning');
        }
        return false;
      }
    }
    Logger.error('❌ Error al guardar en localStorage:', error);
    return false;
  }
}

/**
 * Lee de forma segura de localStorage con validación
 * @param {string} key - Clave del item
 * @param {*} defaultValue - Valor por defecto si no existe o está corrupto
 * @returns {*} - Valor leído o valor por defecto
 */
function safeLocalStorageGet(key, defaultValue = null) {
  try {
    const item = localStorage.getItem(key);
    if (!item) {
      return defaultValue;
    }
    
    const parsed = JSON.parse(item);
    
    // Validar que el parse fue exitoso
    if (parsed === null && item !== 'null') {
      throw new Error('Datos corruptos');
    }
    
    return parsed;
  } catch (error) {
    Logger.error(`❌ Error al leer ${key} de localStorage:`, error);
    // Limpiar item corrupto
    try {
      localStorage.removeItem(key);
      Logger.log(`🧹 Item corrupto eliminado: ${key}`);
    } catch (cleanupError) {
      Logger.error('Error al limpiar item corrupto:', cleanupError);
    }
    return defaultValue;
  }
}

/**
 * Elimina un item de localStorage de forma segura
 * @param {string} key - Clave del item
 * @returns {boolean} - true si se eliminó correctamente
 */
function safeLocalStorageRemove(key) {
  try {
    localStorage.removeItem(key);
    Logger.log(`✅ Item eliminado de localStorage: ${key}`);
    return true;
  } catch (error) {
    Logger.error(`❌ Error al eliminar ${key} de localStorage:`, error);
    return false;
  }
}

/**
 * Obtiene información sobre el uso de localStorage
 * @returns {Object} - Información de uso
 */
function getStorageInfo() {
  const total = getTotalStorageSize();
  const items = Object.keys(localStorage).length;
  
  return {
    totalSize: total,
    totalSizeMB: (total / 1024 / 1024).toFixed(2),
    items: items,
    maxSize: STORAGE_LIMITS.maxTotalSize,
    maxSizeMB: (STORAGE_LIMITS.maxTotalSize / 1024 / 1024).toFixed(2),
    usagePercent: ((total / STORAGE_LIMITS.maxTotalSize) * 100).toFixed(1),
    available: STORAGE_LIMITS.maxTotalSize - total,
    availableMB: ((STORAGE_LIMITS.maxTotalSize - total) / 1024 / 1024).toFixed(2)
  };
}

// Exportar funciones
if (typeof window !== 'undefined') {
  window.safeLocalStorageSet = safeLocalStorageSet;
  window.safeLocalStorageGet = safeLocalStorageGet;
  window.safeLocalStorageRemove = safeLocalStorageRemove;
  window.getStorageInfo = getStorageInfo;
  window.getTotalStorageSize = getTotalStorageSize;
}

