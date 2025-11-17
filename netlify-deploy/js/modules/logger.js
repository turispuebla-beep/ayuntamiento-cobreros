/**
 * Módulo de log centralizado para habilitar/deshabilitar mensajes según el entorno.
 */
(function registerLoggerModule(global) {
    const DEBUG_MODE = global.localStorage.getItem('debugMode') === 'true' ||
        global.location.hostname === 'localhost' ||
        global.location.hostname === '127.0.0.1';

    const Logger = {
        log: (...args) => {
            if (DEBUG_MODE) {
                console.log(...args);
            }
        },
        error: (...args) => {
            console.error(...args);
        },
        warn: (...args) => {
            if (DEBUG_MODE) {
                console.warn(...args);
            }
        },
        info: (...args) => {
            if (DEBUG_MODE) {
                console.info(...args);
            }
        }
    };

    Object.defineProperty(global, 'DEBUG_MODE', {
        value: DEBUG_MODE,
        configurable: false,
        enumerable: true,
        writable: false
    });

    Object.defineProperty(global, 'Logger', {
        value: Logger,
        configurable: false,
        enumerable: true,
        writable: false
    });
})(window);


