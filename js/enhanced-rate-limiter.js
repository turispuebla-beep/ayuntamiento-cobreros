/**
 * Enhanced Rate Limiter - Rate limiting mejorado con bloqueo de IP
 * Límite de intentos de login (5 en 15 minutos)
 * Bloqueo temporal de IP tras múltiples fallos
 */

class EnhancedRateLimiter {
    constructor() {
        this.attempts = new Map(); // IP -> { attempts: [], blockedUntil: null }
        this.BLOCK_DURATION = 15 * 60 * 1000; // 15 minutos
        this.MAX_ATTEMPTS = 5;
        this.WINDOW = 15 * 60 * 1000; // 15 minutos
    }

    /**
     * Obtiene la IP del cliente (desde Firestore o estimada)
     */
    async getClientIP() {
        try {
            // Intentar obtener IP desde Firestore si está disponible
            if (typeof window !== 'undefined' && window.firebase) {
                // La IP se puede obtener desde Cloud Functions o desde headers
                // Por ahora, usamos un identificador de sesión
                return localStorage.getItem('clientSessionId') || this.generateSessionId();
            }
        } catch (error) {
            console.warn('No se pudo obtener IP, usando sesión:', error);
        }
        return this.generateSessionId();
    }

    /**
     * Genera un ID de sesión único
     */
    generateSessionId() {
        let sessionId = localStorage.getItem('clientSessionId');
        if (!sessionId) {
            sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('clientSessionId', sessionId);
        }
        return sessionId;
    }

    /**
     * Registra un intento de login fallido
     * @param {string} identifier - Email o IP
     * @returns {Object} - { allowed: boolean, blockedUntil: number, attemptsRemaining: number }
     */
    async recordFailedAttempt(identifier) {
        const now = Date.now();
        const key = `login_${identifier}`;
        
        if (!this.attempts.has(key)) {
            this.attempts.set(key, {
                attempts: [],
                blockedUntil: null
            });
        }

        const record = this.attempts.get(key);

        // Limpiar intentos antiguos
        record.attempts = record.attempts.filter(time => now - time < this.WINDOW);

        // Verificar si está bloqueado
        if (record.blockedUntil && now < record.blockedUntil) {
            const remaining = Math.ceil((record.blockedUntil - now) / 1000 / 60);
            return {
                allowed: false,
                blockedUntil: record.blockedUntil,
                attemptsRemaining: 0,
                message: `Acceso bloqueado. Intente de nuevo en ${remaining} minutos.`
            };
        }

        // Si se desbloqueó, reiniciar
        if (record.blockedUntil && now >= record.blockedUntil) {
            record.blockedUntil = null;
            record.attempts = [];
        }

        // Registrar nuevo intento
        record.attempts.push(now);

        // Verificar si excede el límite
        if (record.attempts.length >= this.MAX_ATTEMPTS) {
            record.blockedUntil = now + this.BLOCK_DURATION;
            
            // Guardar en Firestore para persistencia
            await this.saveBlockToFirestore(identifier, record.blockedUntil);

            return {
                allowed: false,
                blockedUntil: record.blockedUntil,
                attemptsRemaining: 0,
                message: `Demasiados intentos fallidos. Acceso bloqueado por 15 minutos.`
            };
        }

        const attemptsRemaining = this.MAX_ATTEMPTS - record.attempts.length;
        return {
            allowed: true,
            blockedUntil: null,
            attemptsRemaining,
            message: attemptsRemaining > 0 
                ? `${attemptsRemaining} intentos restantes antes del bloqueo.`
                : 'Último intento disponible.'
        };
    }

    /**
     * Limpia los intentos fallidos (después de un login exitoso)
     * @param {string} identifier - Email o IP
     */
    async clearFailedAttempts(identifier) {
        const key = `login_${identifier}`;
        this.attempts.delete(key);
        
        // Limpiar de Firestore
        await this.clearBlockFromFirestore(identifier);
    }

    /**
     * Verifica si un identificador está bloqueado
     * @param {string} identifier - Email o IP
     * @returns {Object} - { blocked: boolean, blockedUntil: number }
     */
    async checkIfBlocked(identifier) {
        const key = `login_${identifier}`;
        const record = this.attempts.get(key);
        
        if (!record || !record.blockedUntil) {
            return { blocked: false, blockedUntil: null };
        }

        const now = Date.now();
        if (now < record.blockedUntil) {
            return {
                blocked: true,
                blockedUntil: record.blockedUntil,
                remainingMinutes: Math.ceil((record.blockedUntil - now) / 1000 / 60)
            };
        }

        // Desbloqueado, limpiar
        record.blockedUntil = null;
        record.attempts = [];
        return { blocked: false, blockedUntil: null };
    }

    /**
     * Guarda el bloqueo en Firestore
     */
    async saveBlockToFirestore(identifier, blockedUntil) {
        try {
            if (typeof window !== 'undefined' && window.firebase && window.firebase.firestore) {
                const db = window.firebase.firestore();
                await db.collection('security_blocks').doc(identifier).set({
                    blockedUntil: blockedUntil,
                    timestamp: Date.now(),
                    identifier: identifier
                }, { merge: true });
            }
        } catch (error) {
            console.warn('No se pudo guardar bloqueo en Firestore:', error);
        }
    }

    /**
     * Limpia el bloqueo de Firestore
     */
    async clearBlockFromFirestore(identifier) {
        try {
            if (typeof window !== 'undefined' && window.firebase && window.firebase.firestore) {
                const db = window.firebase.firestore();
                await db.collection('security_blocks').doc(identifier).delete();
            }
        } catch (error) {
            console.warn('No se pudo limpiar bloqueo de Firestore:', error);
        }
    }

    /**
     * Carga bloqueos desde Firestore al iniciar
     */
    async loadBlocksFromFirestore() {
        try {
            if (typeof window !== 'undefined' && window.firebase && window.firebase.firestore) {
                const db = window.firebase.firestore();
                const snapshot = await db.collection('security_blocks').get();
                
                snapshot.forEach(doc => {
                    const data = doc.data();
                    const now = Date.now();
                    
                    if (data.blockedUntil && now < data.blockedUntil) {
                        const key = `login_${data.identifier}`;
                        this.attempts.set(key, {
                            attempts: new Array(this.MAX_ATTEMPTS).fill(now),
                            blockedUntil: data.blockedUntil
                        });
                    }
                });
            }
        } catch (error) {
            console.warn('No se pudieron cargar bloqueos desde Firestore:', error);
        }
    }
}

// Instancia global
const enhancedRateLimiter = new EnhancedRateLimiter();

// Inicializar al cargar
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        enhancedRateLimiter.loadBlocksFromFirestore();
    });
    
    window.enhancedRateLimiter = enhancedRateLimiter;
}


