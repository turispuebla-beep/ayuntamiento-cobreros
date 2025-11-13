/**
 * Módulo ligero para registrar métricas de uso en localStorage.
 */
(function registerMetricsModule(global) {
    const STORAGE_KEY = 'appMetrics';

    function safeRead() {
        try {
            const raw = global.localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : {};
        } catch (error) {
            if (global.Logger && typeof global.Logger.warn === 'function') {
                global.Logger.warn('No se pudieron leer las métricas guardadas:', error);
            }
            return {};
        }
    }

    function safeWrite(data) {
        try {
            global.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (error) {
            if (global.Logger && typeof global.Logger.warn === 'function') {
                global.Logger.warn('No se pudieron guardar las métricas:', error);
            }
        }
    }

    function recordEvent(namespace, eventName, payload = {}) {
        if (!namespace || !eventName) {
            return;
        }

        const current = safeRead();
        if (!current[namespace]) {
            current[namespace] = [];
        }

        const event = {
            name: eventName,
            timestamp: new Date().toISOString(),
            ...payload
        };

        current[namespace].push(event);
        safeWrite(current);

        try {
            const customEvent = new CustomEvent('metrics:event', {
                detail: { namespace, event }
            });
            global.dispatchEvent(customEvent);
        } catch {
            // Ignorar si CustomEvent no está disponible
        }
    }

    function getEvents(namespace) {
        const current = safeRead();
        if (!namespace) {
            return current;
        }
        return current[namespace] || [];
    }

    function clearEvents(namespace) {
        if (!namespace) {
            safeWrite({});
            return;
        }
        const current = safeRead();
        delete current[namespace];
        safeWrite(current);
    }

    global.Metrics = {
        recordEvent,
        getEvents,
        clearEvents
    };
})(window);


