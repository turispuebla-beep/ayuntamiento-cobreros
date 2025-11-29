/*
Sistema de Backups Externos y Plan de Recuperación
© 2024 - Sistema de Gestión del Ayuntamiento de Cobreros

Sistema de backups automáticos y manuales con plan de
recuperación ante desastres (DRP)

Contacto: editorturis@gmail.com
*/

class ExternalBackupSystem {
    constructor() {
        this.configKey = 'backup_system_config';
        this.defaultConfig = {
            enabled: true,
            autoBackup: true,
            frequency: 'daily', // 'daily', 'weekly', 'monthly'
            retentionDays: 30,
            externalStorage: {
                enabled: false,
                type: 'firebase_storage', // 'firebase_storage', 'google_drive', 'aws_s3'
                path: 'backups/'
            },
            backupCollections: [
                'users',
                'appointments',
                'official_notifications',
                'documents',
                'audit_logs'
            ]
        };
        this.config = this.loadConfig();
        this.backupInterval = null;
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
        
        // Reiniciar backups automáticos si está habilitado
        if (this.config.enabled && this.config.autoBackup) {
            this.startAutoBackup();
        } else {
            this.stopAutoBackup();
        }
    }

    /**
     * Crear backup manual
     */
    async createBackup(backupName = null) {
        try {
            if (!this.config.enabled) {
                throw new Error('Sistema de backups deshabilitado');
            }

            const timestamp = new Date().toISOString();
            const backupId = `backup-${Date.now()}`;
            const name = backupName || `Backup-${new Date().toLocaleString('es-ES')}`;

            showNotification('Creando backup...', 'info');

            const backup = {
                id: backupId,
                name: name,
                createdAt: timestamp,
                createdBy: window.currentUser?.email || 'system',
                collections: {},
                metadata: {
                    version: '1.0',
                    systemInfo: {
                        userAgent: navigator.userAgent,
                        timestamp: timestamp
                    }
                }
            };

            // Hacer backup de cada colección
            for (const collection of this.config.backupCollections) {
                try {
                    backup.collections[collection] = await this.backupCollection(collection);
                } catch (error) {
                    console.error(`Error haciendo backup de ${collection}:`, error);
                    backup.collections[collection] = { error: error.message };
                }
            }

            // Guardar backup en Firestore
            if (window.firebase && window.firebase.firestore) {
                await window.firebase.firestore().collection('backups').add(backup);
            }

            // Guardar en almacenamiento externo si está habilitado
            if (this.config.externalStorage.enabled) {
                await this.saveToExternalStorage(backup);
            }

            // Registrar en logs
            if (window.auditLogSystem) {
                await window.auditLogSystem.log('BACKUP_CREATED', {
                    backupId: backupId,
                    name: name,
                    collections: Object.keys(backup.collections)
                });
            }

            showNotification('Backup creado correctamente', 'success');
            return { success: true, backup };
        } catch (error) {
            console.error('Error creando backup:', error);
            showNotification('Error al crear backup', 'error');
            throw error;
        }
    }

    /**
     * Hacer backup de una colección
     */
    async backupCollection(collectionName) {
        if (!window.firebase || !window.firebase.firestore) {
            throw new Error('Firestore no disponible');
        }

        const snapshot = await window.firebase.firestore().collection(collectionName).get();
        const data = [];

        snapshot.forEach(doc => {
            data.push({
                id: doc.id,
                ...doc.data()
            });
        });

        return {
            count: data.length,
            data: data,
            backedUpAt: new Date().toISOString()
        };
    }

    /**
     * Guardar en almacenamiento externo
     */
    async saveToExternalStorage(backup) {
        try {
            const backupJson = JSON.stringify(backup, null, 2);
            const blob = new Blob([backupJson], { type: 'application/json' });
            
            if (this.config.externalStorage.type === 'firebase_storage') {
                // Guardar en Firebase Storage
                if (window.firebase && window.firebase.storage) {
                    const storageRef = window.firebase.storage().ref();
                    const backupRef = storageRef.child(`${this.config.externalStorage.path}${backup.id}.json`);
                    await backupRef.put(blob);
                }
            }
            // Otros tipos de almacenamiento se pueden agregar aquí
        } catch (error) {
            console.error('Error guardando en almacenamiento externo:', error);
            throw error;
        }
    }

    /**
     * Listar backups disponibles
     */
    async listBackups() {
        try {
            if (!window.firebase || !window.firebase.firestore) {
                return [];
            }

            const backupsRef = window.firebase.firestore().collection('backups');
            const snapshot = await backupsRef.orderBy('createdAt', 'desc').limit(50).get();

            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error listando backups:', error);
            return [];
        }
    }

    /**
     * Restaurar desde backup
     */
    async restoreBackup(backupId, collections = null) {
        try {
            if (!confirm('¿Está seguro de que desea restaurar este backup? Esta acción puede sobrescribir datos existentes.')) {
                return { success: false, message: 'Restauración cancelada' };
            }

            if (!window.firebase || !window.firebase.firestore) {
                throw new Error('Firestore no disponible');
            }

            // Obtener backup
            const backupsRef = window.firebase.firestore().collection('backups');
            const backupDoc = await backupsRef.doc(backupId).get();

            if (!backupDoc.exists) {
                throw new Error('Backup no encontrado');
            }

            const backup = backupDoc.data();
            const collectionsToRestore = collections || Object.keys(backup.collections);

            showNotification('Restaurando backup...', 'info');

            // Restaurar cada colección
            for (const collectionName of collectionsToRestore) {
                if (backup.collections[collectionName] && !backup.collections[collectionName].error) {
                    await this.restoreCollection(collectionName, backup.collections[collectionName].data);
                }
            }

            // Registrar en logs
            if (window.auditLogSystem) {
                await window.auditLogSystem.log('BACKUP_RESTORED', {
                    backupId: backupId,
                    collections: collectionsToRestore
                });
            }

            showNotification('Backup restaurado correctamente', 'success');
            return { success: true };
        } catch (error) {
            console.error('Error restaurando backup:', error);
            showNotification('Error al restaurar backup', 'error');
            throw error;
        }
    }

    /**
     * Restaurar colección
     */
    async restoreCollection(collectionName, data) {
        const batch = window.firebase.firestore().batch();
        const collectionRef = window.firebase.firestore().collection(collectionName);

        data.forEach(item => {
            const docRef = collectionRef.doc(item.id);
            batch.set(docRef, item);
        });

        await batch.commit();
    }

    /**
     * Iniciar backups automáticos
     */
    startAutoBackup() {
        this.stopAutoBackup(); // Detener backup anterior si existe

        if (!this.config.enabled || !this.config.autoBackup) {
            return;
        }

        const interval = this.getBackupInterval();
        this.backupInterval = setInterval(() => {
            this.createBackup().catch(error => {
                console.error('Error en backup automático:', error);
            });
        }, interval);

        console.log('✅ Backups automáticos iniciados');
    }

    /**
     * Detener backups automáticos
     */
    stopAutoBackup() {
        if (this.backupInterval) {
            clearInterval(this.backupInterval);
            this.backupInterval = null;
            console.log('⏹️ Backups automáticos detenidos');
        }
    }

    /**
     * Obtener intervalo de backup según frecuencia
     */
    getBackupInterval() {
        switch (this.config.frequency) {
            case 'daily':
                return 24 * 60 * 60 * 1000; // 24 horas
            case 'weekly':
                return 7 * 24 * 60 * 60 * 1000; // 7 días
            case 'monthly':
                return 30 * 24 * 60 * 60 * 1000; // 30 días
            default:
                return 24 * 60 * 60 * 1000;
        }
    }

    /**
     * Limpiar backups antiguos
     */
    async cleanupOldBackups() {
        try {
            if (!window.firebase || !window.firebase.firestore) {
                return { cleaned: 0 };
            }

            const retentionDate = new Date();
            retentionDate.setDate(retentionDate.getDate() - this.config.retentionDays);

            const backupsRef = window.firebase.firestore().collection('backups');
            const oldBackups = await backupsRef
                .where('createdAt', '<', retentionDate.toISOString())
                .get();

            const batch = window.firebase.firestore().batch();
            oldBackups.forEach(doc => {
                batch.delete(doc.ref);
            });

            await batch.commit();

            return { cleaned: oldBackups.size };
        } catch (error) {
            console.error('Error limpiando backups antiguos:', error);
            return { cleaned: 0, error: error.message };
        }
    }
}

// Crear instancia global
if (typeof window !== 'undefined') {
    window.externalBackupSystem = new ExternalBackupSystem();
    
    // Iniciar backups automáticos si está habilitado
    if (window.externalBackupSystem.config.enabled && window.externalBackupSystem.config.autoBackup) {
        window.externalBackupSystem.startAutoBackup();
    }
    
    console.log('✅ Sistema de backups externos cargado');
}

