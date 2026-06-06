/**
 * Change History - Historial de cambios
 * Registro de quién hizo qué y cuándo
 * Posibilidad de revertir cambios
 */

class ChangeHistory {
    constructor() {
        this.COLLECTION = 'change_history';
        this.MAX_HISTORY_DAYS = 365; // Mantener historial por 1 año
    }

    /**
     * Registra un cambio
     * @param {string} action - Acción realizada (CREATE, UPDATE, DELETE)
     * @param {string} entityType - Tipo de entidad (user, admin, config, etc.)
     * @param {string} entityId - ID de la entidad
     * @param {Object} oldData - Datos anteriores (opcional)
     * @param {Object} newData - Datos nuevos
     * @param {Object} metadata - Metadatos adicionales
     */
    async recordChange(action, entityType, entityId, oldData = null, newData = null, metadata = {}) {
        try {
            if (typeof window !== 'undefined' && window.firebase && window.firebase.firestore) {
                const db = window.firebase.firestore();
                
                const changeRecord = {
                    action: action, // CREATE, UPDATE, DELETE
                    entityType: entityType,
                    entityId: entityId,
                    oldData: oldData,
                    newData: newData,
                    userId: window.currentUser?.email || window.currentUser?.adminId || 'unknown',
                    userName: window.currentUser?.name || 'unknown',
                    timestamp: Date.now(),
                    ipAddress: await this.getClientIP(),
                    userAgent: navigator.userAgent,
                    ...metadata
                };
                
                await db.collection(this.COLLECTION).add(changeRecord);
                
                console.log(`✅ Cambio registrado: ${action} ${entityType} ${entityId}`);
            }
        } catch (error) {
            console.error('Error registrando cambio:', error);
        }
    }

    /**
     * Obtiene el historial de cambios de una entidad
     * @param {string} entityType - Tipo de entidad
     * @param {string} entityId - ID de la entidad
     * @param {number} limit - Límite de resultados (default: 50)
     * @returns {Promise<Array>}
     */
    async getEntityHistory(entityType, entityId, limit = 50) {
        try {
            if (typeof window !== 'undefined' && window.firebase && window.firebase.firestore) {
                const db = window.firebase.firestore();
                
                const snapshot = await db.collection(this.COLLECTION)
                    .where('entityType', '==', entityType)
                    .where('entityId', '==', entityId)
                    .orderBy('timestamp', 'desc')
                    .limit(limit)
                    .get();
                
                const history = [];
                snapshot.forEach(doc => {
                    history.push({
                        id: doc.id,
                        ...doc.data()
                    });
                });
                
                return history;
            }
        } catch (error) {
            console.error('Error obteniendo historial:', error);
        }
        
        return [];
    }

    /**
     * Obtiene todos los cambios recientes
     * @param {number} limit - Límite de resultados (default: 100)
     * @returns {Promise<Array>}
     */
    async getRecentChanges(limit = 100) {
        try {
            if (typeof window !== 'undefined' && window.firebase && window.firebase.firestore) {
                const db = window.firebase.firestore();
                
                const snapshot = await db.collection(this.COLLECTION)
                    .orderBy('timestamp', 'desc')
                    .limit(limit)
                    .get();
                
                const changes = [];
                snapshot.forEach(doc => {
                    changes.push({
                        id: doc.id,
                        ...doc.data()
                    });
                });
                
                return changes;
            }
        } catch (error) {
            console.error('Error obteniendo cambios recientes:', error);
        }
        
        return [];
    }

    /**
     * Revierte un cambio
     * @param {string} changeId - ID del cambio a revertir
     * @returns {Promise<boolean>} - true si se revirtió correctamente
     */
    async revertChange(changeId) {
        try {
            if (typeof window !== 'undefined' && window.firebase && window.firebase.firestore) {
                const db = window.firebase.firestore();
                const changeDoc = await db.collection(this.COLLECTION).doc(changeId).get();
                
                if (!changeDoc.exists) {
                    throw new Error('Cambio no encontrado');
                }
                
                const changeData = changeDoc.data();
                
                // Verificar que tenga datos antiguos para revertir
                if (!changeData.oldData) {
                    throw new Error('No se puede revertir: no hay datos anteriores');
                }
                
                // Revertir según el tipo de acción
                if (changeData.action === 'DELETE') {
                    // Restaurar entidad eliminada
                    await db.collection(changeData.entityType + 's').doc(changeData.entityId).set(changeData.oldData);
                } else if (changeData.action === 'UPDATE') {
                    // Restaurar datos anteriores
                    await db.collection(changeData.entityType + 's').doc(changeData.entityId).update(changeData.oldData);
                } else if (changeData.action === 'CREATE') {
                    // Eliminar entidad creada
                    await db.collection(changeData.entityType + 's').doc(changeData.entityId).delete();
                }
                
                // Registrar la reversión
                await this.recordChange(
                    'REVERT',
                    changeData.entityType,
                    changeData.entityId,
                    changeData.newData,
                    changeData.oldData,
                    { revertedChangeId: changeId }
                );
                
                console.log(`✅ Cambio revertido: ${changeId}`);
                
                if (typeof showNotification === 'function') {
                    showNotification('Cambio revertido correctamente', 'success');
                }
                
                return true;
            }
        } catch (error) {
            console.error('Error revirtiendo cambio:', error);
            if (typeof showNotification === 'function') {
                showNotification(`Error al revertir cambio: ${error.message}`, 'error');
            }
            return false;
        }
    }

    /**
     * Limpia el historial antiguo
     */
    async cleanupOldHistory() {
        try {
            if (typeof window !== 'undefined' && window.firebase && window.firebase.firestore) {
                const db = window.firebase.firestore();
                const cutoffDate = Date.now() - (this.MAX_HISTORY_DAYS * 24 * 60 * 60 * 1000);
                
                const snapshot = await db.collection(this.COLLECTION)
                    .where('timestamp', '<', cutoffDate)
                    .limit(500) // Procesar en lotes
                    .get();
                
                const batch = db.batch();
                let count = 0;
                
                snapshot.forEach(doc => {
                    batch.delete(doc.ref);
                    count++;
                });
                
                if (count > 0) {
                    await batch.commit();
                    console.log(`✅ Limpiados ${count} registros antiguos del historial`);
                }
            }
        } catch (error) {
            console.error('Error limpiando historial antiguo:', error);
        }
    }

    /**
     * Obtiene la IP del cliente
     */
    async getClientIP() {
        return localStorage.getItem('clientSessionId') || 'unknown';
    }
}

// Instancia global
const changeHistory = new ChangeHistory();

// Exponer globalmente
if (typeof window !== 'undefined') {
    window.changeHistory = changeHistory;
}

