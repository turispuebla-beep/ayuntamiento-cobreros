/*
Sistema de Backup Automático
© 2024 - Sistema de Gestión del Ayuntamiento de Cobreros

Realiza backups periódicos de datos críticos:
- Usuarios y administradores
- Configuraciones
- Eventos importantes
- Documentos críticos

Contacto: editorturis@gmail.com
*/

class BackupSystem {
    constructor() {
        this.backupCollectionName = 'system_backups';
        this.backupInterval = 24 * 60 * 60 * 1000; // 24 horas
        this.maxBackups = 30; // Mantener últimos 30 backups
        this.isRunning = false;
        this.lastBackupTime = null;
        this.backupTimer = null;
    }

    /**
     * Inicializar sistema de backup
     */
    async initialize() {
        try {
            // Cargar última fecha de backup
            this.lastBackupTime = localStorage.getItem('lastBackupTime');
            
            // Verificar si necesita hacer backup
            await this.checkAndBackup();
            
            // Configurar backup automático periódico
            this.startAutomaticBackup();
            
            console.log('✅ Sistema de backup inicializado');
        } catch (error) {
            console.error('❌ Error inicializando sistema de backup:', error);
        }
    }

    /**
     * Verificar si necesita hacer backup y ejecutarlo
     */
    async checkAndBackup() {
        const now = new Date().getTime();
        const lastBackup = this.lastBackupTime ? new Date(this.lastBackupTime).getTime() : 0;
        const timeSinceLastBackup = now - lastBackup;

        // Si han pasado más de 24 horas o nunca se ha hecho backup
        if (timeSinceLastBackup >= this.backupInterval || !this.lastBackupTime) {
            console.log('🔄 Ejecutando backup automático...');
            await this.createBackup('automatic');
        }
    }

    /**
     * Iniciar backup automático periódico
     */
    startAutomaticBackup() {
        if (this.backupTimer) {
            clearInterval(this.backupTimer);
        }

        this.backupTimer = setInterval(async () => {
            await this.createBackup('automatic');
        }, this.backupInterval);

        console.log('✅ Backup automático configurado (cada 24 horas)');
    }

    /**
     * Detener backup automático
     */
    stopAutomaticBackup() {
        if (this.backupTimer) {
            clearInterval(this.backupTimer);
            this.backupTimer = null;
        }
    }

    /**
     * Crear backup de datos críticos
     * @param {string} type - Tipo de backup: 'automatic', 'manual', 'scheduled'
     * @param {string} description - Descripción del backup
     */
    async createBackup(type = 'manual', description = '') {
        if (this.isRunning) {
            console.warn('⚠️ Backup ya en progreso, esperando...');
            return null;
        }

        this.isRunning = true;
        const startTime = new Date();

        try {
            console.log(`📦 Creando backup (${type})...`);

            const backupData = {
                type: type,
                description: description || `Backup ${type} - ${new Date().toLocaleString('es-ES')}`,
                timestamp: new Date(),
                timestampISO: new Date().toISOString(),
                createdBy: this.getCurrentUserId(),
                createdByEmail: this.getCurrentUserEmail(),
                version: '1.0',
                data: {}
            };

            // Backup de usuarios
            backupData.data.users = await this.backupUsers();
            
            // Backup de administradores
            backupData.data.admins = await this.backupAdmins();
            
            // Backup de configuraciones
            backupData.data.config = await this.backupConfigurations();
            
            // Backup de eventos importantes
            backupData.data.events = await this.backupEvents();
            
            // Backup de documentos críticos
            backupData.data.documents = await this.backupDocuments();
            
            // Backup de logs de auditoría recientes
            backupData.data.auditLogs = await this.backupAuditLogs();

            // Calcular tamaño del backup
            backupData.size = JSON.stringify(backupData).length;
            backupData.sizeFormatted = this.formatBytes(backupData.size);

            // Guardar backup
            const backupId = await this.saveBackup(backupData);

            // Actualizar última fecha de backup
            this.lastBackupTime = new Date().toISOString();
            localStorage.setItem('lastBackupTime', this.lastBackupTime);

            const duration = new Date().getTime() - startTime.getTime();
            console.log(`✅ Backup creado exitosamente en ${duration}ms`);
            console.log(`📊 Tamaño: ${backupData.sizeFormatted}`);

            // Limpiar backups antiguos
            await this.cleanOldBackups();

            // Registrar en logs de auditoría
            if (window.auditLogSystem) {
                await window.auditLogSystem.log('BACKUP_CREATED', {
                    backupId: backupId,
                    type: type,
                    size: backupData.sizeFormatted,
                    duration: duration
                });
            }

            return {
                id: backupId,
                ...backupData
            };

        } catch (error) {
            console.error('❌ Error creando backup:', error);
            
            // Registrar error en logs
            if (window.auditLogSystem) {
                await window.auditLogSystem.log('BACKUP_ERROR', {
                    type: type,
                    error: error.message
                });
            }
            
            throw error;
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * Backup de usuarios
     */
    async backupUsers() {
        try {
            if (window.firebase && window.firebase.firestore) {
                const snapshot = await window.firebase.firestore()
                    .collection('users')
                    .get();
                
                return snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
            } else {
                // Backup desde localStorage
                const users = JSON.parse(localStorage.getItem('users') || '[]');
                return users;
            }
        } catch (error) {
            console.error('❌ Error en backup de usuarios:', error);
            return [];
        }
    }

    /**
     * Backup de administradores
     */
    async backupAdmins() {
        try {
            if (window.firebase && window.firebase.firestore) {
                const snapshot = await window.firebase.firestore()
                    .collection('admins')
                    .get();
                
                return snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
            } else {
                return [];
            }
        } catch (error) {
            console.error('❌ Error en backup de administradores:', error);
            return [];
        }
    }

    /**
     * Backup de configuraciones
     */
    async backupConfigurations() {
        try {
            const configs = {
                associationConfig: localStorage.getItem('associationConfig'),
                appointmentScheduleConfig: localStorage.getItem('appointmentScheduleConfig'),
                carnetConfig: localStorage.getItem('carnetConfig'),
                notificationSettings: localStorage.getItem('notificationSettings')
            };

            // También intentar desde Firestore si está disponible
            if (window.firebase && window.firebase.firestore) {
                try {
                    const configDoc = await window.firebase.firestore()
                        .collection('config')
                        .doc('main')
                        .get();
                    
                    if (configDoc.exists) {
                        const firestoreData = configDoc.data();
                        // Solo agregar si hay datos válidos
                        if (firestoreData && typeof firestoreData === 'object') {
                            configs.firestoreConfig = firestoreData;
                        }
                    }
                } catch (error) {
                    console.warn('⚠️ No se pudo obtener config de Firestore:', error);
                }
            }

            // Limpiar valores undefined antes de retornar
            const cleanedConfigs = {};
            for (const key in configs) {
                if (configs[key] !== undefined) {
                    cleanedConfigs[key] = configs[key];
                }
            }

            return cleanedConfigs;
        } catch (error) {
            console.error('❌ Error en backup de configuraciones:', error);
            return {};
        }
    }

    /**
     * Backup de eventos importantes
     */
    async backupEvents() {
        try {
            if (window.firebase && window.firebase.firestore) {
                let snapshot;
                try {
                    snapshot = await window.firebase.firestore()
                    .collection('events')
                    .orderBy('date', 'desc')
                        .limit(100)
                    .get();
                } catch (orderByError) {
                    // Si orderBy falla, obtener todos y ordenar en memoria
                    snapshot = await window.firebase.firestore()
                        .collection('events')
                        .limit(200)
                        .get();
                }
                
                let events = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                // Ordenar en memoria si orderBy falló
                events.sort((a, b) => {
                    const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date || 0);
                    const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date || 0);
                    return dateB - dateA; // Descendente
                });

                return events.slice(0, 100);
            } else {
                const events = JSON.parse(localStorage.getItem('events') || '[]');
                return events.slice(0, 100);
            }
        } catch (error) {
            console.error('❌ Error en backup de eventos:', error);
            return [];
        }
    }

    /**
     * Backup de documentos críticos
     */
    async backupDocuments() {
        try {
            if (window.firebase && window.firebase.firestore) {
                const snapshot = await window.firebase.firestore()
                    .collection('documents')
                    .where('isCritical', '==', true)
                    .get();
                
                return snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
            } else {
                const documents = JSON.parse(localStorage.getItem('documents') || '[]');
                return documents.filter(doc => doc.isCritical === true);
            }
        } catch (error) {
            console.error('❌ Error en backup de documentos:', error);
            return [];
        }
    }

    /**
     * Backup de logs de auditoría recientes
     */
    async backupAuditLogs() {
        try {
            if (window.auditLogSystem) {
                const logs = await window.auditLogSystem.getLogs({}, 500);
                return logs;
            }
            return [];
        } catch (error) {
            console.error('❌ Error en backup de logs:', error);
            return [];
        }
    }

    /**
     * Guardar backup
     */
    async saveBackup(backupData) {
        try {
            if (window.firebase && window.firebase.firestore) {
                // Limpiar valores undefined antes de guardar
                const cleanedData = this.removeUndefinedValues(backupData);
                
                const docRef = await window.firebase.firestore()
                    .collection(this.backupCollectionName)
                    .add(cleanedData);
                
                return docRef.id;
            } else {
                // Guardar en localStorage
                const backups = JSON.parse(localStorage.getItem('system_backups') || '[]');
                const backupId = `backup_${Date.now()}`;
                backups.unshift({
                    id: backupId,
                    ...backupData
                });
                
                // Mantener solo los últimos backups
                if (backups.length > this.maxBackups) {
                    backups.splice(this.maxBackups);
                }
                
                localStorage.setItem('system_backups', JSON.stringify(backups));
                return backupId;
            }
        } catch (error) {
            console.error('❌ Error guardando backup:', error);
            throw error;
        }
    }

    /**
     * Obtener lista de backups
     */
    async getBackups(limit = 30) {
        try {
            if (window.firebase && window.firebase.firestore) {
                let snapshot;
                try {
                    snapshot = await window.firebase.firestore()
                    .collection(this.backupCollectionName)
                    .orderBy('timestamp', 'desc')
                    .limit(limit)
                    .get();
                } catch (orderByError) {
                    // Si orderBy falla, obtener todos y ordenar en memoria
                    snapshot = await window.firebase.firestore()
                        .collection(this.backupCollectionName)
                        .limit(limit * 2)
                        .get();
                }
                
                let backups = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                // Ordenar en memoria si orderBy falló
                backups.sort((a, b) => {
                    const timeA = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp || 0);
                    const timeB = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp || 0);
                    return timeB - timeA; // Descendente
                });

                return backups.slice(0, limit);
            } else {
                const backups = JSON.parse(localStorage.getItem('system_backups') || '[]');
                return backups.slice(0, limit);
            }
        } catch (error) {
            console.error('❌ Error obteniendo backups:', error);
            return [];
        }
    }

    /**
     * Restaurar desde backup
     * @param {string} backupId - ID del backup a restaurar
     * @param {Object} options - Opciones de restauración
     */
    async restoreBackup(backupId, options = {}) {
        try {
            console.log(`🔄 Restaurando desde backup: ${backupId}`);

            // Obtener backup
            let backupData = null;
            
            if (window.firebase && window.firebase.firestore) {
                const doc = await window.firebase.firestore()
                    .collection(this.backupCollectionName)
                    .doc(backupId)
                    .get();
                
                if (!doc.exists) {
                    throw new Error('Backup no encontrado');
                }
                
                backupData = doc.data();
            } else {
                const backups = JSON.parse(localStorage.getItem('system_backups') || '[]');
                backupData = backups.find(b => b.id === backupId);
                
                if (!backupData) {
                    throw new Error('Backup no encontrado');
                }
            }

            // Confirmar restauración
            if (!options.skipConfirmation) {
                const confirmed = confirm(
                    `¿Estás seguro de restaurar el backup del ${new Date(backupData.timestamp).toLocaleString('es-ES')}?\n\n` +
                    `Esto sobrescribirá los datos actuales.`
                );
                
                if (!confirmed) {
                    return { success: false, message: 'Restauración cancelada' };
                }
            }

            // Restaurar datos según opciones
            const restoreResults = {
                users: false,
                admins: false,
                config: false,
                events: false,
                documents: false
            };

            // Restaurar usuarios
            if (options.restoreUsers !== false && backupData.data.users) {
                restoreResults.users = await this.restoreUsers(backupData.data.users);
            }

            // Restaurar administradores
            if (options.restoreAdmins !== false && backupData.data.admins) {
                restoreResults.admins = await this.restoreAdmins(backupData.data.admins);
            }

            // Restaurar configuraciones
            if (options.restoreConfig !== false && backupData.data.config) {
                restoreResults.config = await this.restoreConfig(backupData.data.config);
            }

            // Restaurar eventos
            if (options.restoreEvents !== false && backupData.data.events) {
                restoreResults.events = await this.restoreEvents(backupData.data.events);
            }

            // Restaurar documentos
            if (options.restoreDocuments !== false && backupData.data.documents) {
                restoreResults.documents = await this.restoreDocuments(backupData.data.documents);
            }

            // Registrar en logs de auditoría
            if (window.auditLogSystem) {
                await window.auditLogSystem.log('BACKUP_RESTORED', {
                    backupId: backupId,
                    backupDate: backupData.timestampISO,
                    restoreResults: restoreResults
                });
            }

            console.log('✅ Restauración completada:', restoreResults);
            return {
                success: true,
                results: restoreResults
            };

        } catch (error) {
            console.error('❌ Error restaurando backup:', error);
            
            if (window.auditLogSystem) {
                await window.auditLogSystem.log('BACKUP_RESTORE_ERROR', {
                    backupId: backupId,
                    error: error.message
                });
            }
            
            throw error;
        }
    }

    /**
     * Restaurar usuarios
     */
    async restoreUsers(usersData) {
        try {
            if (window.firebase && window.firebase.firestore) {
                const batch = window.firebase.firestore().batch();
                
                usersData.forEach(user => {
                    const ref = window.firebase.firestore()
                        .collection('users')
                        .doc(user.id || user.uid);
                    batch.set(ref, user, { merge: true });
                });
                
                await batch.commit();
            } else {
                localStorage.setItem('users', JSON.stringify(usersData));
            }
            
            return true;
        } catch (error) {
            console.error('❌ Error restaurando usuarios:', error);
            return false;
        }
    }

    /**
     * Restaurar administradores
     */
    async restoreAdmins(adminsData) {
        try {
            if (window.firebase && window.firebase.firestore) {
                const batch = window.firebase.firestore().batch();
                
                adminsData.forEach(admin => {
                    const ref = window.firebase.firestore()
                        .collection('admins')
                        .doc(admin.id);
                    batch.set(ref, admin, { merge: true });
                });
                
                await batch.commit();
            }
            
            return true;
        } catch (error) {
            console.error('❌ Error restaurando administradores:', error);
            return false;
        }
    }

    /**
     * Restaurar configuraciones
     */
    async restoreConfig(configData) {
        try {
            // Restaurar desde localStorage
            if (configData.associationConfig) {
                localStorage.setItem('associationConfig', configData.associationConfig);
            }
            if (configData.appointmentScheduleConfig) {
                localStorage.setItem('appointmentScheduleConfig', configData.appointmentScheduleConfig);
            }
            if (configData.carnetConfig) {
                localStorage.setItem('carnetConfig', configData.carnetConfig);
            }
            if (configData.notificationSettings) {
                localStorage.setItem('notificationSettings', configData.notificationSettings);
            }

            // Restaurar desde Firestore si está disponible
            if (configData.firestoreConfig && window.firebase && window.firebase.firestore) {
                await window.firebase.firestore()
                    .collection('config')
                    .doc('main')
                    .set(configData.firestoreConfig, { merge: true });
            }
            
            return true;
        } catch (error) {
            console.error('❌ Error restaurando configuraciones:', error);
            return false;
        }
    }

    /**
     * Restaurar eventos
     */
    async restoreEvents(eventsData) {
        try {
            if (window.firebase && window.firebase.firestore) {
                const batch = window.firebase.firestore().batch();
                
                eventsData.forEach(event => {
                    const ref = window.firebase.firestore()
                        .collection('events')
                        .doc(event.id);
                    batch.set(ref, event, { merge: true });
                });
                
                await batch.commit();
            } else {
                localStorage.setItem('events', JSON.stringify(eventsData));
            }
            
            return true;
        } catch (error) {
            console.error('❌ Error restaurando eventos:', error);
            return false;
        }
    }

    /**
     * Restaurar documentos
     */
    async restoreDocuments(documentsData) {
        try {
            if (window.firebase && window.firebase.firestore) {
                const batch = window.firebase.firestore().batch();
                
                documentsData.forEach(doc => {
                    const ref = window.firebase.firestore()
                        .collection('documents')
                        .doc(doc.id);
                    batch.set(ref, doc, { merge: true });
                });
                
                await batch.commit();
            }
            
            return true;
        } catch (error) {
            console.error('❌ Error restaurando documentos:', error);
            return false;
        }
    }

    /**
     * Exportar backup a ubicación externa (Google Drive, Dropbox, etc.)
     * @param {string} backupId - ID del backup
     * @param {string} destination - Destino (googledrive, dropbox, email)
     * @returns {Promise<boolean>} - true si se exportó correctamente
     */
    async exportToExternalStorage(backupId, destination = 'email') {
        try {
            let backupData = null;
            
            if (window.firebase && window.firebase.firestore) {
                const doc = await window.firebase.firestore()
                    .collection(this.backupCollectionName)
                    .doc(backupId)
                    .get();
                
                if (!doc.exists) {
                    throw new Error('Backup no encontrado');
                }
                
                backupData = doc.data();
            } else {
                const backups = JSON.parse(localStorage.getItem('system_backups') || '[]');
                backupData = backups.find(b => b.id === backupId);
            }

            if (!backupData) {
                throw new Error('Backup no encontrado');
            }

            // Exportar según destino
            switch (destination) {
                case 'email':
                    await this.sendBackupByEmail(backupData);
                    break;
                case 'googledrive':
                    // Preparar para integración futura con Google Drive API
                    console.log('⚠️ Exportación a Google Drive pendiente de implementación');
                    break;
                case 'dropbox':
                    // Preparar para integración futura con Dropbox API
                    console.log('⚠️ Exportación a Dropbox pendiente de implementación');
                    break;
                default:
                    throw new Error('Destino no soportado');
            }

            // Registrar en logs
            if (window.auditLogSystem) {
                await window.auditLogSystem.log('BACKUP_EXPORTED_EXTERNAL', {
                    backupId: backupId,
                    destination: destination
                });
            }

            return true;
        } catch (error) {
            console.error('❌ Error exportando backup externo:', error);
            throw error;
        }
    }

    /**
     * Enviar backup por email
     */
    async sendBackupByEmail(backupData) {
        try {
            if (window.emailService && window.currentUser) {
                const backupJson = JSON.stringify(backupData, null, 2);
                const backupBlob = new Blob([backupJson], { type: 'application/json' });
                
                // Convertir a base64 para adjuntar
                const reader = new FileReader();
                reader.onload = async () => {
                    const base64 = reader.result.split(',')[1];
                    
                    await window.emailService.sendEmail({
                        to: window.currentUser.email,
                        subject: `Backup del Sistema - ${new Date(backupData.timestampISO).toLocaleDateString('es-ES')}`,
                        html: `
                            <h2>Backup del Sistema</h2>
                            <p>Se adjunta el backup generado el ${new Date(backupData.timestampISO).toLocaleString('es-ES')}</p>
                            <p><strong>Tamaño:</strong> ${backupData.sizeFormatted || 'N/A'}</p>
                            <p><strong>Tipo:</strong> ${backupData.type}</p>
                        `,
                        attachments: [{
                            filename: `backup_${backupData.id}_${new Date().toISOString().split('T')[0]}.json`,
                            content: base64,
                            type: 'application/json'
                        }]
                    });
                };
                reader.readAsDataURL(backupBlob);
            }
        } catch (error) {
            console.error('❌ Error enviando backup por email:', error);
            throw error;
        }
    }

    /**
     * Configurar backup automático externo
     * @param {Object} config - Configuración de backup externo
     */
    async configureExternalBackup(config) {
        try {
            const externalBackupConfig = {
                enabled: config.enabled || false,
                destination: config.destination || 'email',
                frequency: config.frequency || 'weekly', // daily, weekly, monthly
                recipients: config.recipients || [],
                lastExport: null,
                createdAt: new Date()
            };

            // Guardar configuración
            if (window.firebase && window.firebase.firestore) {
                await window.firebase.firestore()
                    .collection('config')
                    .doc('external_backup')
                    .set(externalBackupConfig, { merge: true });
            } else {
                localStorage.setItem('external_backup_config', JSON.stringify(externalBackupConfig));
            }

            // Si está habilitado, programar exportaciones
            if (externalBackupConfig.enabled) {
                this.scheduleExternalBackups(externalBackupConfig);
            }

            return externalBackupConfig;
        } catch (error) {
            console.error('❌ Error configurando backup externo:', error);
            throw error;
        }
    }

    /**
     * Programar backups externos
     */
    scheduleExternalBackups(config) {
        const frequencyMs = {
            daily: 24 * 60 * 60 * 1000,
            weekly: 7 * 24 * 60 * 60 * 1000,
            monthly: 30 * 24 * 60 * 60 * 1000
        };

        const interval = frequencyMs[config.frequency] || frequencyMs.weekly;

        setInterval(async () => {
            try {
                const latestBackup = await this.getBackups(1);
                if (latestBackup.length > 0) {
                    await this.exportToExternalStorage(latestBackup[0].id, config.destination);
                }
            } catch (error) {
                console.error('❌ Error en backup externo programado:', error);
            }
        }, interval);
    }

    /**
     * Limpiar backups antiguos
     */
    async cleanOldBackups() {
        try {
            const backups = await this.getBackups(this.maxBackups + 10);
            
            if (backups.length > this.maxBackups) {
                const toDelete = backups.slice(this.maxBackups);
                
                if (window.firebase && window.firebase.firestore) {
                    const batch = window.firebase.firestore().batch();
                    toDelete.forEach(backup => {
                        const ref = window.firebase.firestore()
                            .collection(this.backupCollectionName)
                            .doc(backup.id);
                        batch.delete(ref);
                    });
                    await batch.commit();
                } else {
                    const allBackups = JSON.parse(localStorage.getItem('system_backups') || '[]');
                    const filtered = allBackups.filter(b => !toDelete.find(td => td.id === b.id));
                    localStorage.setItem('system_backups', JSON.stringify(filtered));
                }
                
                console.log(`✅ Limpiados ${toDelete.length} backups antiguos`);
            }
        } catch (error) {
            console.error('❌ Error limpiando backups antiguos:', error);
        }
    }

    /**
     * Exportar backup a archivo
     */
    async exportBackup(backupId, format = 'json') {
        try {
            let backupData = null;
            
            if (window.firebase && window.firebase.firestore) {
                const doc = await window.firebase.firestore()
                    .collection(this.backupCollectionName)
                    .doc(backupId)
                    .get();
                
                if (!doc.exists) {
                    throw new Error('Backup no encontrado');
                }
                
                backupData = doc.data();
            } else {
                const backups = JSON.parse(localStorage.getItem('system_backups') || '[]');
                backupData = backups.find(b => b.id === backupId);
            }

            if (!backupData) {
                throw new Error('Backup no encontrado');
            }

            if (format === 'json') {
                const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `backup_${backupId}_${new Date().toISOString().split('T')[0]}.json`;
                a.click();
                URL.revokeObjectURL(url);
            }

            return backupData;
        } catch (error) {
            console.error('❌ Error exportando backup:', error);
            throw error;
        }
    }

    /**
     * Obtener ID del usuario actual
     */
    getCurrentUserId() {
        try {
            if (window.currentUser && window.currentUser.uid) {
                return window.currentUser.uid;
            }
            const stored = localStorage.getItem('currentUser');
            if (stored) {
                const user = JSON.parse(stored);
                return user.uid || user.adminId || 'system';
            }
            return 'system';
        } catch (error) {
            return 'system';
        }
    }

    /**
     * Obtener email del usuario actual
     */
    getCurrentUserEmail() {
        try {
            if (window.currentUser && window.currentUser.email) {
                return window.currentUser.email;
            }
            const stored = localStorage.getItem('currentUser');
            if (stored) {
                const user = JSON.parse(stored);
                return user.email || 'system';
            }
            return 'system';
        } catch (error) {
            return 'system';
        }
    }

    /**
     * Formatear bytes a formato legible
     */
    /**
     * Elimina valores undefined de un objeto recursivamente
     */
    removeUndefinedValues(obj) {
        if (obj === null || obj === undefined) {
            return null;
        }
        
        if (Array.isArray(obj)) {
            return obj.map(item => this.removeUndefinedValues(item)).filter(item => item !== undefined);
        }
        
        if (typeof obj === 'object') {
            const cleaned = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    const value = this.removeUndefinedValues(obj[key]);
                    if (value !== undefined) {
                        cleaned[key] = value;
                    }
                }
            }
            return cleaned;
        }
        
        return obj;
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }
}

// Inicializar sistema de backup
const backupSystem = new BackupSystem();

// Hacer disponible globalmente
if (typeof window !== 'undefined') {
    window.backupSystem = backupSystem;
    
    // Inicializar cuando Firebase esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => backupSystem.initialize(), 3000);
        });
    } else {
        setTimeout(() => backupSystem.initialize(), 3000);
    }
}

// Exportar para uso en otros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BackupSystem;
}


