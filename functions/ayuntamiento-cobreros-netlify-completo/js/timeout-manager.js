// ===== GESTIÓN DE TIMEOUTS E INTERVALS =====
// Sistema para limpiar timeouts/intervals y evitar memory leaks

const timeoutManager = {
  timeouts: new Map(),
  intervals: new Map(),
  nextId: 1
};

/**
 * setTimeout mejorado que se puede limpiar fácilmente
 * @param {Function} callback - Función a ejecutar
 * @param {number} delay - Retraso en milisegundos
 * @param {string} name - Nombre identificador (opcional)
 * @returns {number} - ID del timeout
 */
function safeSetTimeout(callback, delay, name = null) {
  const id = timeoutManager.nextId++;
  const timeoutId = setTimeout(() => {
    callback();
    timeoutManager.timeouts.delete(id);
  }, delay);
    
  timeoutManager.timeouts.set(id, {
    timeoutId,
    name: name || `timeout-${id}`,
    callback,
    delay,
    startTime: Date.now()
  });
    
  return id;
}

/**
 * clearTimeout mejorado
 * @param {number} id - ID del timeout
 */
function safeClearTimeout(id) {
  const timeout = timeoutManager.timeouts.get(id);
  if (timeout) {
    clearTimeout(timeout.timeoutId);
    timeoutManager.timeouts.delete(id);
  }
}

/**
 * setInterval mejorado que se puede limpiar fácilmente
 * @param {Function} callback - Función a ejecutar
 * @param {number} delay - Intervalo en milisegundos
 * @param {string} name - Nombre identificador (opcional)
 * @returns {number} - ID del interval
 */
function safeSetInterval(callback, delay, name = null) {
  const id = timeoutManager.nextId++;
  const intervalId = setInterval(callback, delay);
    
  timeoutManager.intervals.set(id, {
    intervalId,
    name: name || `interval-${id}`,
    callback,
    delay,
    startTime: Date.now()
  });
    
  return id;
}

/**
 * clearInterval mejorado
 * @param {number} id - ID del interval
 */
function safeClearInterval(id) {
  const interval = timeoutManager.intervals.get(id);
  if (interval) {
    clearInterval(interval.intervalId);
    timeoutManager.intervals.delete(id);
  }
}

/**
 * Limpia todos los timeouts activos
 * @param {string} nameFilter - Filtrar por nombre (opcional)
 */
function clearAllTimeouts(nameFilter = null) {
  if (nameFilter) {
    timeoutManager.timeouts.forEach((timeout, id) => {
      if (timeout.name.includes(nameFilter)) {
        safeClearTimeout(id);
      }
    });
  } else {
    timeoutManager.timeouts.forEach((timeout, id) => {
      clearTimeout(timeout.timeoutId);
    });
    timeoutManager.timeouts.clear();
  }
}

/**
 * Limpia todos los intervals activos
 * @param {string} nameFilter - Filtrar por nombre (opcional)
 */
function clearAllIntervals(nameFilter = null) {
  if (nameFilter) {
    timeoutManager.intervals.forEach((interval, id) => {
      if (interval.name.includes(nameFilter)) {
        safeClearInterval(id);
      }
    });
  } else {
    timeoutManager.intervals.forEach((interval, id) => {
      clearInterval(interval.intervalId);
    });
    timeoutManager.intervals.clear();
  }
}

/**
 * Limpia todos los timeouts e intervals
 */
function clearAllTimers() {
  clearAllTimeouts();
  clearAllIntervals();
}

/**
 * Obtiene información de timeouts activos (útil para debugging)
 */
function getActiveTimers() {
  return {
    timeouts: Array.from(timeoutManager.timeouts.values()).map(t => ({
      name: t.name,
      delay: t.delay,
      elapsed: Date.now() - t.startTime
    })),
    intervals: Array.from(timeoutManager.intervals.values()).map(i => ({
      name: i.name,
      delay: i.delay,
      elapsed: Date.now() - i.startTime
    }))
  };
}

// Limpiar todos los timers cuando se descarga la página
window.addEventListener('beforeunload', () => {
  clearAllTimers();
});

// Exportar funciones
if (typeof window !== 'undefined') {
  window.safeSetTimeout = safeSetTimeout;
  window.safeClearTimeout = safeClearTimeout;
  window.safeSetInterval = safeSetInterval;
  window.safeClearInterval = safeClearInterval;
  window.clearAllTimeouts = clearAllTimeouts;
  window.clearAllIntervals = clearAllIntervals;
  window.clearAllTimers = clearAllTimers;
  window.getActiveTimers = getActiveTimers;
}

