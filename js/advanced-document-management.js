/*
Gestión Documental Avanzada
© 2024 - Sistema de Gestión del Ayuntamiento de Cobreros

Sistema de gestión documental con clasificación, versiones,
retención y archivo de documentos

Contacto: editorturis@gmail.com
*/

class AdvancedDocumentManagement {
    constructor() {
        this.configKey = 'document_management_config';
        this.defaultConfig = {
            enabled: true,
            autoVersioning: true,
            retentionPolicy: {
                enabled: true,
                defaultRetentionDays: 2555, // 7 años
                categories: {
                    'legal': 2555,
                    'administrative': 1825, // 5 años
                    'temporary': 365
                }
            },
            classification: {
                enabled: true,
                categories: ['legal', 'administrative', 'financial', 'temporary', 'archived']
            }
        };
        this.config = this.loadConfig();
    }

    /**
     * Cargar configuración
     */
    loadConfig() {
        try {
            const saved = localStorage.getItem(this.configKey);
            if (saved) {
                return { ...this.defaultConfig, ...JSON.parse(saved) };
            }
        } catch (error) {
            console.error('Error cargando configuración:', error);
        }
        return { ...this.defaultConfig };
    }

    /**
     * Guardar configuración
     */
    saveConfig(config) {
        this.config = { ...this.config, ...config };
        localStorage.setItem(this.configKey, JSON.stringify(this.config));
    }

    /**
     * Clasificar documento
     */
    async classifyDocument(documentId, category, metadata = {}) {
        try {
            if (!this.config.classification.enabled) {
                return { success: false, message: 'Clasificación deshabilitada' };
            }

            if (!this.config.classification.categories.includes(category)) {
                return { success: false, message: 'Categoría no válida' };
            }

            const classification = {
                documentId: documentId,
                category: category,
                classifiedAt: new Date().toISOString(),
                classifiedBy: window.currentUser?.email || 'system',
                metadata: metadata,
                retentionDays: this.config.retentionPolicy.categories[category] || this.config.retentionPolicy.defaultRetentionDays
            };

            // Guardar en Firestore
            if (window.firebase && window.firebase.firestore) {
                await window.firebase.firestore().collection('document_classifications').add(classification);
                
                // Actualizar documento
                const docRef = window.firebase.firestore().collection('documents').doc(documentId);
                await docRef.update({
                    category: category,
                    classification: classification,
                    updatedAt: new Date().toISOString()
                });
            }

            // Registrar en logs
            if (window.auditLogSystem) {
                await window.auditLogSystem.log('DOCUMENT_CLASSIFIED', {
                    documentId: documentId,
                    category: category,
                    metadata: metadata
                });
            }

            return { success: true, classification };
        } catch (error) {
            console.error('Error clasificando documento:', error);
            throw error;
        }
    }

    /**
     * Crear nueva versión de documento
     */
    async createDocumentVersion(documentId, newVersionData) {
        try {
            if (!this.config.autoVersioning) {
                return { success: false, message: 'Versionado automático deshabilitado' };
            }

            // Obtener documento actual
            if (!window.firebase || !window.firebase.firestore) {
                throw new Error('Firestore no disponible');
            }

            const docRef = window.firebase.firestore().collection('documents').doc(documentId);
            const currentDoc = await docRef.get();

            if (!currentDoc.exists) {
                throw new Error('Documento no encontrado');
            }

            const currentData = currentDoc.data();
            const currentVersion = currentData.version || 1;

            // Crear nueva versión
            const newVersion = {
                documentId: documentId,
                version: currentVersion + 1,
                previousVersion: currentVersion,
                data: newVersionData,
                createdBy: window.currentUser?.email || 'system',
                createdAt: new Date().toISOString(),
                changes: this.detectChanges(currentData, newVersionData)
            };

            // Guardar versión
            await window.firebase.firestore().collection('document_versions').add(newVersion);

            // Actualizar documento principal
            await docRef.update({
                version: newVersion.version,
                updatedAt: new Date().toISOString(),
                updatedBy: window.currentUser?.email || 'system'
            });

            // Registrar en logs
            if (window.auditLogSystem) {
                await window.auditLogSystem.log('DOCUMENT_VERSION_CREATED', {
                    documentId: documentId,
                    version: newVersion.version,
                    changes: newVersion.changes
                });
            }

            return { success: true, version: newVersion };
        } catch (error) {
            console.error('Error creando versión:', error);
            throw error;
        }
    }

    /**
     * Detectar cambios entre versiones
     */
    detectChanges(oldData, newData) {
        const changes = [];
        
        for (const key in newData) {
            if (oldData[key] !== newData[key]) {
                changes.push({
                    field: key,
                    oldValue: oldData[key],
                    newValue: newData[key]
                });
            }
        }

        return changes;
    }

    /**
     * Obtener historial de versiones
     */
    async getVersionHistory(documentId) {
        try {
            if (!window.firebase || !window.firebase.firestore) {
                return [];
            }

            const versionsRef = window.firebase.firestore().collection('document_versions');
            const query = versionsRef.where('documentId', '==', documentId).orderBy('version', 'desc');
            const snapshot = await query.get();

            return snapshot.docs.map(doc => doc.data());
        } catch (error) {
            console.error('Error obteniendo historial:', error);
            return [];
        }
    }

    /**
     * Archivar documento
     */
    async archiveDocument(documentId, reason = '') {
        try {
            if (!window.firebase || !window.firebase.firestore) {
                throw new Error('Firestore no disponible');
            }

            const docRef = window.firebase.firestore().collection('documents').doc(documentId);
            await docRef.update({
                archived: true,
                archivedAt: new Date().toISOString(),
                archivedBy: window.currentUser?.email || 'system',
                archiveReason: reason
            });

            // Registrar en logs
            if (window.auditLogSystem) {
                await window.auditLogSystem.log('DOCUMENT_ARCHIVED', {
                    documentId: documentId,
                    reason: reason
                });
            }

            return { success: true };
        } catch (error) {
            console.error('Error archivando documento:', error);
            throw error;
        }
    }

    /**
     * Verificar retención de documentos
     */
    async checkRetentionPolicy() {
        try {
            if (!this.config.retentionPolicy.enabled) {
                return { checked: false, message: 'Política de retención deshabilitada' };
            }

            if (!window.firebase || !window.firebase.firestore) {
                return { checked: false, message: 'Firestore no disponible' };
            }

            const now = new Date();
            const classificationsRef = window.firebase.firestore().collection('document_classifications');
            const snapshot = await classificationsRef.get();

            const expired = [];

            snapshot.forEach(doc => {
                const classification = doc.data();
                const retentionDate = new Date(classification.classifiedAt);
                retentionDate.setDate(retentionDate.getDate() + classification.retentionDays);

                if (now > retentionDate) {
                    expired.push({
                        documentId: classification.documentId,
                        classificationId: doc.id,
                        expiredAt: retentionDate.toISOString()
                    });
                }
            });

            return { checked: true, expired: expired, count: expired.length };
        } catch (error) {
            console.error('Error verificando retención:', error);
            return { checked: false, error: error.message };
        }
    }

    /**
     * Buscar documentos
     */
    async searchDocuments(query, filters = {}) {
        try {
            if (!window.firebase || !window.firebase.firestore) {
                return [];
            }

            let searchQuery = window.firebase.firestore().collection('documents');

            if (filters.category) {
                searchQuery = searchQuery.where('category', '==', filters.category);
            }

            if (filters.archived !== undefined) {
                searchQuery = searchQuery.where('archived', '==', filters.archived);
            }

            const snapshot = await searchQuery.get();
            const results = [];

            snapshot.forEach(doc => {
                const data = doc.data();
                // Búsqueda simple por texto (se puede mejorar con índices)
                if (!query || JSON.stringify(data).toLowerCase().includes(query.toLowerCase())) {
                    results.push({ id: doc.id, ...data });
                }
            });

            return results;
        } catch (error) {
            console.error('Error buscando documentos:', error);
            return [];
        }
    }
}

// Crear instancia global
if (typeof window !== 'undefined') {
    window.advancedDocumentManagement = new AdvancedDocumentManagement();
    console.log('✅ Gestión documental avanzada cargada');
}

