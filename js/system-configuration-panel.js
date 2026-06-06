/*
Panel de Configuración del Sistema
© 2024 - Sistema de Gestión del Ayuntamiento de Cobreros

Interfaz de administración para configurar todos los módulos del sistema

Contacto: editorturis@gmail.com
*/

class SystemConfigurationPanel {
    constructor() {
        this.modalId = 'systemConfigurationModal';
    }

    /**
     * Mostrar panel de configuración
     */
    show() {
        // Verificar permisos
        if (typeof window !== 'undefined' && window.roleVerification) {
            window.roleVerification.requirePermission('MANAGE_SYSTEM_CONFIG', async () => {
                this.render();
            }, { showError: true });
        } else {
            this.render();
        }
    }

    /**
     * Renderizar panel de configuración
     */
    render() {
        // Crear modal
        let modal = document.getElementById(this.modalId);
        if (!modal) {
            modal = document.createElement('div');
            modal.id = this.modalId;
            modal.className = 'modal';
            document.body.appendChild(modal);
        }

        modal.style.display = 'block';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 900px; max-height: 90vh; overflow-y: auto;">
                <div class="modal-header">
                    <h2>⚙️ Configuración del Sistema</h2>
                    <button class="close-modal" onclick="closeModal('${this.modalId}')">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="config-tabs">
                        <button class="tab-button active" onclick="window.systemConfigPanel.showTab('notifications')">
                            📢 Notificaciones
                        </button>
                        <button class="tab-button" onclick="window.systemConfigPanel.showTab('sede')">
                            🏛️ Sede Electrónica
                        </button>
                        <button class="tab-button" onclick="window.systemConfigPanel.showTab('reports')">
                            📊 Reportes
                        </button>
                        <button class="tab-button" onclick="window.systemConfigPanel.showTab('documents')">
                            📄 Documentos
                        </button>
                        <button class="tab-button" onclick="window.systemConfigPanel.showTab('backups')">
                            💾 Backups
                        </button>
                        <button class="tab-button" onclick="window.systemConfigPanel.showTab('audit')">
                            🔍 Auditoría Legal
                        </button>
                        <button class="tab-button" onclick="window.systemConfigPanel.showTab('gdpr')">
                            🔒 RGPD
                        </button>
                        <button class="tab-button" onclick="window.systemConfigPanel.showTab('security')">
                            🛡️ Seguridad
                        </button>
                        <button class="tab-button" onclick="window.systemConfigPanel.showTab('legal')">
                            ⚖️ Políticas Legales
                        </button>
                    </div>

                    <div id="configContent" class="config-content">
                        ${this.renderNotificationsConfig()}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeModal('${this.modalId}')">Cerrar</button>
                    <button class="btn btn-primary" onclick="window.systemConfigPanel.saveAll()">Guardar Cambios</button>
                </div>
            </div>
        `;

        // Aplicar estilos
        this.applyStyles();
    }

    /**
     * Renderizar configuración de notificaciones oficiales
     */
    renderNotificationsConfig() {
        const config = window.officialNotificationsSystem?.config || {};
        return `
            <div id="notificationsTab" class="config-tab active">
                <h3>📢 Configuración de Notificaciones Oficiales</h3>
                
                <div class="config-section">
                    <label class="config-switch">
                        <input type="checkbox" id="notificationsEnabled" ${config.enabled ? 'checked' : ''}>
                        <span>Habilitar sistema de notificaciones oficiales</span>
                    </label>
                </div>

                <div class="config-section">
                    <label class="config-switch">
                        <input type="checkbox" id="notificationsRequireAck" ${config.requireAcknowledgment ? 'checked' : ''}>
                        <span>Requerir acuse de recibo</span>
                    </label>
                </div>

                <div class="config-section">
                    <label class="config-switch">
                        <input type="checkbox" id="notificationsLegalValidity" ${config.legalValidity ? 'checked' : ''}>
                        <span>Validez legal</span>
                    </label>
                </div>

                <div class="config-section">
                    <label>
                        Días de retención:
                        <input type="number" id="notificationsRetentionDays" value="${config.retentionDays || 365}" min="30" max="2555">
                    </label>
                </div>

                <div class="config-section">
                    <label class="config-switch">
                        <input type="checkbox" id="notificationsSendEmail" ${config.sendEmail ? 'checked' : ''}>
                        <span>Enviar por email</span>
                    </label>
                </div>

                <div class="config-section">
                    <label class="config-switch">
                        <input type="checkbox" id="notificationsSendSMS" ${config.sendSMS ? 'checked' : ''}>
                        <span>Enviar por SMS</span>
                    </label>
                </div>

                <div class="config-section">
                    <label class="config-switch">
                        <input type="checkbox" id="notificationsDigitalSignature" ${config.digitalSignature ? 'checked' : ''}>
                        <span>Firma digital</span>
                    </label>
                </div>
            </div>
        `;
    }

    /**
     * Renderizar configuración de Sede Electrónica
     */
    renderSedeConfig() {
        const config = window.sedeElectronicaIntegration?.config || {};
        return `
            <div id="sedeTab" class="config-tab">
                <h3>🏛️ Configuración de Sede Electrónica</h3>
                
                <div class="config-section">
                    <label class="config-switch">
                        <input type="checkbox" id="sedeEnabled" ${config.enabled ? 'checked' : ''}>
                        <span>Habilitar integración con Sede Electrónica</span>
                    </label>
                </div>

                <div class="config-section">
                    <label>
                        URL de la API:
                        <input type="url" id="sedeApiUrl" value="${config.apiUrl || ''}" placeholder="https://sede.ejemplo.es/api">
                    </label>
                </div>

                <div class="config-section">
                    <label>
                        API Key:
                        <input type="password" id="sedeApiKey" value="${config.apiKey || ''}" placeholder="Tu API Key">
                    </label>
                </div>

                <div class="config-section">
                    <label>
                        API Secret:
                        <input type="password" id="sedeApiSecret" value="${config.apiSecret || ''}" placeholder="Tu API Secret">
                    </label>
                </div>

                <div class="config-section">
                    <label class="config-switch">
                        <input type="checkbox" id="sedeTestMode" ${config.testMode ? 'checked' : ''}>
                        <span>Modo de prueba</span>
                    </label>
                </div>

                <div class="config-section">
                    <label class="config-switch">
                        <input type="checkbox" id="sedeAutoSync" ${config.autoSync ? 'checked' : ''}>
                        <span>Sincronización automática</span>
                    </label>
                </div>

                <div class="config-section">
                    <label>
                        Intervalo de sincronización (ms):
                        <input type="number" id="sedeSyncInterval" value="${config.syncInterval || 3600000}" min="60000" step="60000">
                    </label>
                </div>

                <div class="config-section">
                    <button class="btn btn-secondary" onclick="window.systemConfigPanel.testSedeConnection()">
                        Probar Conexión
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Renderizar configuración RGPD
     */
    renderGDPRConfig() {
        // Configuración RGPD se maneja principalmente desde el módulo
        return `
            <div id="gdprTab" class="config-tab">
                <h3>🔒 Configuración RGPD</h3>
                
                <div class="config-section">
                    <p>La configuración RGPD se gestiona automáticamente. Los usuarios pueden ejercer sus derechos desde el sistema.</p>
                </div>

                <div class="config-section">
                    <h4>Derechos ARCO disponibles:</h4>
                    <ul>
                        <li>✅ Acceso a datos personales</li>
                        <li>✅ Rectificación de datos</li>
                        <li>✅ Supresión (derecho al olvido)</li>
                        <li>✅ Oposición al tratamiento</li>
                        <li>✅ Portabilidad de datos</li>
                        <li>✅ Limitación del tratamiento</li>
                    </ul>
                </div>

                <div class="config-section">
                    <button class="btn btn-primary" onclick="window.systemConfigPanel.exportGDPRReport()">
                        Exportar Reporte de Cumplimiento RGPD
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Renderizar configuración de seguridad
     */
    renderSecurityConfig() {
        return `
            <div id="securityTab" class="config-tab">
                <h3>🛡️ Configuración de Seguridad</h3>
                
                <div class="config-section">
                    <h4>Encriptación de Datos</h4>
                    <label class="config-switch">
                        <input type="checkbox" id="encryptionEnabled" checked disabled>
                        <span>Encriptación de datos sensibles (siempre activa)</span>
                    </label>
                </div>

                <div class="config-section">
                    <h4>Validación de Roles</h4>
                    <label class="config-switch">
                        <input type="checkbox" id="roleVerificationEnabled" checked disabled>
                        <span>Verificación de roles en cada acción (siempre activa)</span>
                    </label>
                </div>

                <div class="config-section">
                    <h4>Rate Limiting</h4>
                    <p>Configurado automáticamente. Ver configuración avanzada en código.</p>
                </div>

                <div class="config-section">
                    <h4>Sesiones</h4>
                    <p>Gestión de sesiones activa. Ver configuración en módulo de sesiones.</p>
                </div>
            </div>
        `;
    }

    /**
     * Renderizar configuración de reportes
     */
    renderReportsConfig() {
        const config = window.officialReportsSystem?.config || {};
        return `
            <div id="reportsTab" class="config-tab">
                <h3>📊 Configuración de Reportes</h3>
                
                <div class="config-section">
                    <label class="config-switch">
                        <input type="checkbox" id="reportsEnabled" ${config.enabled ? 'checked' : ''}>
                        <span>Habilitar sistema de reportes</span>
                    </label>
                </div>

                <div class="config-section">
                    <label class="config-switch">
                        <input type="checkbox" id="reportsAutoGenerate" ${config.autoGenerate ? 'checked' : ''}>
                        <span>Generación automática de reportes</span>
                    </label>
                </div>

                <div class="config-section">
                    <label>
                        Días de retención:
                        <input type="number" id="reportsRetentionDays" value="${config.retentionDays || 365}" min="30" max="2555">
                    </label>
                </div>

                <div class="config-section">
                    <h4>Generar Reporte</h4>
                    <label>
                        Período:
                        <select id="reportPeriod">
                            <option value="day">Día</option>
                            <option value="week">Semana</option>
                            <option value="month" selected>Mes</option>
                            <option value="year">Año</option>
                        </select>
                    </label>
                    <div style="margin-top: 1rem;">
                        <button class="btn btn-primary" onclick="window.systemConfigPanel.generateReport('pdf')">
                            Exportar PDF
                        </button>
                        <button class="btn btn-primary" onclick="window.systemConfigPanel.generateReport('excel')">
                            Exportar Excel
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Renderizar configuración de documentos
     */
    renderDocumentsConfig() {
        const config = window.advancedDocumentManagement?.config || {};
        return `
            <div id="documentsTab" class="config-tab">
                <h3>📄 Configuración de Gestión Documental</h3>
                
                <div class="config-section">
                    <label class="config-switch">
                        <input type="checkbox" id="documentsEnabled" ${config.enabled ? 'checked' : ''}>
                        <span>Habilitar gestión documental avanzada</span>
                    </label>
                </div>

                <div class="config-section">
                    <label class="config-switch">
                        <input type="checkbox" id="documentsAutoVersioning" ${config.autoVersioning ? 'checked' : ''}>
                        <span>Versionado automático</span>
                    </label>
                </div>

                <div class="config-section">
                    <label class="config-switch">
                        <input type="checkbox" id="documentsRetentionEnabled" ${config.retentionPolicy?.enabled ? 'checked' : ''}>
                        <span>Política de retención</span>
                    </label>
                </div>

                <div class="config-section">
                    <label>
                        Retención por defecto (días):
                        <input type="number" id="documentsRetentionDays" value="${config.retentionPolicy?.defaultRetentionDays || 2555}" min="30" max="2555">
                    </label>
                </div>

                <div class="config-section">
                    <button class="btn btn-secondary" onclick="window.systemConfigPanel.checkDocumentRetention()">
                        Verificar Retención de Documentos
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Renderizar configuración de backups
     */
    renderBackupsConfig() {
        const config = window.externalBackupSystem?.config || {};
        return `
            <div id="backupsTab" class="config-tab">
                <h3>💾 Configuración de Backups</h3>
                
                <div class="config-section">
                    <label class="config-switch">
                        <input type="checkbox" id="backupsEnabled" ${config.enabled ? 'checked' : ''}>
                        <span>Habilitar sistema de backups</span>
                    </label>
                </div>

                <div class="config-section">
                    <label class="config-switch">
                        <input type="checkbox" id="backupsAutoEnabled" ${config.autoBackup ? 'checked' : ''}>
                        <span>Backups automáticos</span>
                    </label>
                </div>

                <div class="config-section">
                    <label>
                        Frecuencia de backups:
                        <select id="backupsFrequency">
                            <option value="daily" ${config.frequency === 'daily' ? 'selected' : ''}>Diario</option>
                            <option value="weekly" ${config.frequency === 'weekly' ? 'selected' : ''}>Semanal</option>
                            <option value="monthly" ${config.frequency === 'monthly' ? 'selected' : ''}>Mensual</option>
                        </select>
                    </label>
                </div>

                <div class="config-section">
                    <label>
                        Retención (días):
                        <input type="number" id="backupsRetention" value="${config.retentionDays || 30}" min="7" max="365">
                    </label>
                </div>

                <div class="config-section">
                    <button class="btn btn-primary" onclick="window.systemConfigPanel.createBackup()">
                        Crear Backup Manual
                    </button>
                    <button class="btn btn-secondary" onclick="window.systemConfigPanel.viewBackups()">
                        Ver Backups
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Renderizar configuración de auditoría legal
     */
    renderAuditConfig() {
        const config = window.legalAuditTrail?.config || {};
        return `
            <div id="auditTab" class="config-tab">
                <h3>🔍 Configuración de Auditoría Legal</h3>
                
                <div class="config-section">
                    <label class="config-switch">
                        <input type="checkbox" id="auditEnabled" ${config.enabled ? 'checked' : ''}>
                        <span>Habilitar auditoría legal</span>
                    </label>
                </div>

                <div class="config-section">
                    <label class="config-switch">
                        <input type="checkbox" id="auditImmutable" ${config.immutable ? 'checked' : ''}>
                        <span>Logs inalterables</span>
                    </label>
                </div>

                <div class="config-section">
                    <label class="config-switch">
                        <input type="checkbox" id="auditTimestampSealing" ${config.timestampSealing ? 'checked' : ''}>
                        <span>Sellado de tiempo</span>
                    </label>
                </div>

                <div class="config-section">
                    <label>
                        Retención (días):
                        <input type="number" id="auditRetentionDays" value="${config.retentionDays || 2555}" min="365" max="3650">
                    </label>
                </div>

                <div class="config-section">
                    <button class="btn btn-primary" onclick="window.systemConfigPanel.exportAuditReport()">
                        Exportar Auditoría para Cumplimiento
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Renderizar configuración legal
     */
    renderLegalConfig() {
        return `
            <div id="legalTab" class="config-tab">
                <h3>⚖️ Políticas y Términos Legales</h3>
                
                <div class="config-section">
                    <h4>Gestión de Políticas</h4>
                    <p>Edita y gestiona las políticas legales del sitio web.</p>
                </div>

                <div class="config-section">
                    <button class="btn btn-primary" onclick="window.systemConfigPanel.editPrivacyPolicy()">
                        Editar Política de Privacidad
                    </button>
                    <button class="btn btn-primary" onclick="window.systemConfigPanel.editTerms()">
                        Editar Términos y Condiciones
                    </button>
                    <button class="btn btn-primary" onclick="window.systemConfigPanel.editLegalNotice()">
                        Editar Aviso Legal
                    </button>
                    <button class="btn btn-primary" onclick="window.systemConfigPanel.editCookiePolicy()">
                        Editar Política de Cookies
                    </button>
                </div>

                <div class="config-section">
                    <h4>Vista Previa</h4>
                    <button class="btn btn-secondary" onclick="window.legalPoliciesManager?.showPolicy('privacy')">
                        Ver Política de Privacidad
                    </button>
                    <button class="btn btn-secondary" onclick="window.legalPoliciesManager?.showPolicy('terms')">
                        Ver Términos y Condiciones
                    </button>
                    <button class="btn btn-secondary" onclick="window.legalPoliciesManager?.showPolicy('legal')">
                        Ver Aviso Legal
                    </button>
                    <button class="btn btn-secondary" onclick="window.legalPoliciesManager?.showPolicy('cookies')">
                        Ver Política de Cookies
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Generar reporte
     */
    async generateReport(format) {
        const period = document.getElementById('reportPeriod')?.value || 'month';
        if (window.officialReportsSystem) {
            try {
                showNotification('Generando reporte...', 'info');
                await window.officialReportsSystem.generateStatisticsReport(period, format);
                showNotification('Reporte generado correctamente', 'success');
            } catch (error) {
                showNotification('Error al generar reporte', 'error');
            }
        }
    }

    /**
     * Verificar retención de documentos
     */
    async checkDocumentRetention() {
        if (window.advancedDocumentManagement) {
            try {
                showNotification('Verificando retención...', 'info');
                const result = await window.advancedDocumentManagement.checkRetentionPolicy();
                if (result.checked) {
                    showNotification(`Verificación completada. ${result.count} documentos expirados.`, 'info');
                }
            } catch (error) {
                showNotification('Error al verificar retención', 'error');
            }
        }
    }

    /**
     * Exportar reporte de auditoría
     */
    async exportAuditReport() {
        if (window.legalAuditTrail) {
            try {
                showNotification('Exportando auditoría...', 'info');
                await window.legalAuditTrail.exportForCompliance('year');
                showNotification('Auditoría exportada correctamente', 'success');
            } catch (error) {
                showNotification('Error al exportar auditoría', 'error');
            }
        }
    }

    /**
     * Mostrar pestaña específica
     */
    showTab(tabName) {
        // Ocultar todas las pestañas
        document.querySelectorAll('.config-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
        });

        // Mostrar pestaña seleccionada
        const tabMap = {
            'notifications': () => {
                document.getElementById('configContent').innerHTML = this.renderNotificationsConfig();
            },
            'sede': () => {
                document.getElementById('configContent').innerHTML = this.renderSedeConfig();
            },
            'reports': () => {
                document.getElementById('configContent').innerHTML = this.renderReportsConfig();
            },
            'documents': () => {
                document.getElementById('configContent').innerHTML = this.renderDocumentsConfig();
            },
            'backups': () => {
                document.getElementById('configContent').innerHTML = this.renderBackupsConfig();
            },
            'audit': () => {
                document.getElementById('configContent').innerHTML = this.renderAuditConfig();
            },
            'gdpr': () => {
                document.getElementById('configContent').innerHTML = this.renderGDPRConfig();
            },
            'security': () => {
                document.getElementById('configContent').innerHTML = this.renderSecurityConfig();
            },
            'legal': () => {
                document.getElementById('configContent').innerHTML = this.renderLegalConfig();
            }
        };

        if (tabMap[tabName]) {
            tabMap[tabName]();
        }

        // Activar botón
        event.target.classList.add('active');
    }

    /**
     * Guardar toda la configuración
     */
    saveAll() {
        try {
            // Guardar configuración de notificaciones
            if (window.officialNotificationsSystem) {
                const notificationsConfig = {
                    enabled: document.getElementById('notificationsEnabled')?.checked || false,
                    requireAcknowledgment: document.getElementById('notificationsRequireAck')?.checked || false,
                    legalValidity: document.getElementById('notificationsLegalValidity')?.checked || false,
                    retentionDays: parseInt(document.getElementById('notificationsRetentionDays')?.value || 365),
                    sendEmail: document.getElementById('notificationsSendEmail')?.checked || false,
                    sendSMS: document.getElementById('notificationsSendSMS')?.checked || false,
                    digitalSignature: document.getElementById('notificationsDigitalSignature')?.checked || false
                };
                window.officialNotificationsSystem.saveConfig(notificationsConfig);
            }

            // Guardar configuración de Sede Electrónica
            if (window.sedeElectronicaIntegration) {
                const sedeConfig = {
                    enabled: document.getElementById('sedeEnabled')?.checked || false,
                    apiUrl: document.getElementById('sedeApiUrl')?.value || '',
                    apiKey: document.getElementById('sedeApiKey')?.value || '',
                    apiSecret: document.getElementById('sedeApiSecret')?.value || '',
                    testMode: document.getElementById('sedeTestMode')?.checked || false,
                    autoSync: document.getElementById('sedeAutoSync')?.checked || false,
                    syncInterval: parseInt(document.getElementById('sedeSyncInterval')?.value || 3600000)
                };
                window.sedeElectronicaIntegration.saveConfig(sedeConfig);
            }

            // Guardar configuración de reportes
            if (window.officialReportsSystem) {
                const reportsConfig = {
                    enabled: document.getElementById('reportsEnabled')?.checked || false,
                    autoGenerate: document.getElementById('reportsAutoGenerate')?.checked || false,
                    retentionDays: parseInt(document.getElementById('reportsRetentionDays')?.value || 365)
                };
                window.officialReportsSystem.saveConfig(reportsConfig);
            }

            // Guardar configuración de documentos
            if (window.advancedDocumentManagement) {
                const documentsConfig = {
                    enabled: document.getElementById('documentsEnabled')?.checked || false,
                    autoVersioning: document.getElementById('documentsAutoVersioning')?.checked || false,
                    retentionPolicy: {
                        enabled: document.getElementById('documentsRetentionEnabled')?.checked || false,
                        defaultRetentionDays: parseInt(document.getElementById('documentsRetentionDays')?.value || 2555)
                    }
                };
                window.advancedDocumentManagement.saveConfig(documentsConfig);
            }

            // Guardar configuración de backups
            if (window.externalBackupSystem) {
                const backupsConfig = {
                    enabled: document.getElementById('backupsEnabled')?.checked || false,
                    autoBackup: document.getElementById('backupsAutoEnabled')?.checked || false,
                    frequency: document.getElementById('backupsFrequency')?.value || 'daily',
                    retentionDays: parseInt(document.getElementById('backupsRetention')?.value || 30)
                };
                window.externalBackupSystem.saveConfig(backupsConfig);
            }

            // Guardar configuración de auditoría legal
            if (window.legalAuditTrail) {
                const auditConfig = {
                    enabled: document.getElementById('auditEnabled')?.checked || false,
                    immutable: document.getElementById('auditImmutable')?.checked || false,
                    timestampSealing: document.getElementById('auditTimestampSealing')?.checked || false,
                    retentionDays: parseInt(document.getElementById('auditRetentionDays')?.value || 2555)
                };
                window.legalAuditTrail.saveConfig(auditConfig);
            }

            showNotification('Configuración guardada correctamente', 'success');
            console.log('✅ Configuración guardada');
        } catch (error) {
            console.error('Error guardando configuración:', error);
            showNotification('Error al guardar la configuración', 'error');
        }
    }

    /**
     * Probar conexión con Sede Electrónica
     */
    async testSedeConnection() {
        if (!window.sedeElectronicaIntegration) {
            showNotification('Módulo de Sede Electrónica no disponible', 'error');
            return;
        }

        showNotification('Probando conexión...', 'info');
        const result = await window.sedeElectronicaIntegration.testConnection();
        
        if (result.success) {
            showNotification('Conexión exitosa con Sede Electrónica', 'success');
        } else {
            showNotification(`Error: ${result.message}`, 'error');
        }
    }

    /**
     * Crear backup manual
     */
    async createBackup() {
        if (window.externalBackupSystem) {
            try {
                await window.externalBackupSystem.createBackup();
            } catch (error) {
                console.error('Error creando backup:', error);
            }
        }
    }

    /**
     * Ver backups
     */
    async viewBackups() {
        if (!window.externalBackupSystem) {
            showNotification('Sistema de backups no disponible', 'error');
            return;
        }

        try {
            const backups = await window.externalBackupSystem.listBackups();
            
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.style.display = 'block';
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 800px;">
                    <div class="modal-header">
                        <h2>💾 Backups Disponibles</h2>
                        <button class="close-modal" onclick="this.closest('.modal').remove()">&times;</button>
                    </div>
                    <div class="modal-body">
                        ${backups.length === 0 ? '<p>No hay backups disponibles</p>' : `
                            <table style="width: 100%; border-collapse: collapse;">
                                <thead>
                                    <tr>
                                        <th style="border: 1px solid #ddd; padding: 8px;">Nombre</th>
                                        <th style="border: 1px solid #ddd; padding: 8px;">Fecha</th>
                                        <th style="border: 1px solid #ddd; padding: 8px;">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${backups.map(backup => `
                                        <tr>
                                            <td style="border: 1px solid #ddd; padding: 8px;">${backup.name || backup.id}</td>
                                            <td style="border: 1px solid #ddd; padding: 8px;">${new Date(backup.createdAt).toLocaleString('es-ES')}</td>
                                            <td style="border: 1px solid #ddd; padding: 8px;">
                                                <button class="btn btn-sm btn-primary" onclick="window.externalBackupSystem.restoreBackup('${backup.id}')">
                                                    Restaurar
                                                </button>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        `}
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cerrar</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        } catch (error) {
            showNotification('Error al listar backups', 'error');
        }
    }

    /**
     * Editar política de privacidad
     */
    editPrivacyPolicy() {
        this.editPolicy('privacy');
    }

    /**
     * Editar términos y condiciones
     */
    editTerms() {
        this.editPolicy('terms');
    }

    /**
     * Editar aviso legal
     */
    editLegalNotice() {
        this.editPolicy('legal');
    }

    /**
     * Editar política de cookies
     */
    editCookiePolicy() {
        this.editPolicy('cookies');
    }

    /**
     * Editar política (método genérico)
     */
    editPolicy(policyType) {
        if (!window.legalPoliciesManager) {
            showNotification('Gestor de políticas no disponible', 'error');
            return;
        }

        const policy = window.legalPoliciesManager.getPolicy(policyType);
        if (!policy) {
            showNotification('Política no encontrada', 'error');
            return;
        }

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 900px; max-height: 90vh;">
                <div class="modal-header">
                    <h2>Editar ${policy.title}</h2>
                    <button class="close-modal" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <label>
                        Contenido (HTML permitido):
                        <textarea id="policyContent" style="width: 100%; height: 400px; font-family: monospace;">${policy.content || ''}</textarea>
                    </label>
                    <label style="margin-top: 1rem;">
                        Versión:
                        <input type="text" id="policyVersion" value="${policy.version || '1.0'}" style="width: 100px;">
                    </label>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancelar</button>
                    <button class="btn btn-primary" onclick="window.systemConfigPanel.savePolicy('${policyType}')">
                        Guardar
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    /**
     * Guardar política
     */
    savePolicy(policyType) {
        if (!window.legalPoliciesManager) {
            showNotification('Gestor de políticas no disponible', 'error');
            return;
        }

        const content = document.getElementById('policyContent')?.value || '';
        const version = document.getElementById('policyVersion')?.value || null;

        try {
            window.legalPoliciesManager.updatePolicy(policyType, content, version);
            showNotification('Política guardada correctamente', 'success');
            
            // Cerrar modal
            const modal = document.querySelector('.modal:last-of-type');
            if (modal) modal.remove();
        } catch (error) {
            showNotification('Error al guardar política', 'error');
        }
    }

    /**
     * Exportar reporte RGPD
     */
    async exportGDPRReport() {
        if (window.gdprCompliance) {
            showNotification('Funcionalidad en desarrollo', 'info');
            // TODO: Implementar exportación de reporte RGPD
        }
    }

    /**
     * Aplicar estilos
     */
    applyStyles() {
        if (document.getElementById('systemConfigStyles')) return;

        const style = document.createElement('style');
        style.id = 'systemConfigStyles';
        style.textContent = `
            .config-tabs {
                display: flex;
                gap: 0.5rem;
                margin-bottom: 1.5rem;
                border-bottom: 2px solid #e0e0e0;
                flex-wrap: wrap;
            }
            .tab-button {
                padding: 0.75rem 1.5rem;
                border: none;
                background: transparent;
                cursor: pointer;
                border-bottom: 3px solid transparent;
                transition: all 0.3s;
                font-size: 0.9rem;
            }
            .tab-button:hover {
                background: #f5f5f5;
            }
            .tab-button.active {
                border-bottom-color: #1e3a8a;
                color: #1e3a8a;
                font-weight: 600;
            }
            .config-tab {
                display: none;
                padding: 1.5rem 0;
            }
            .config-tab.active {
                display: block;
            }
            .config-section {
                margin-bottom: 1.5rem;
                padding: 1rem;
                background: #f9fafb;
                border-radius: 8px;
            }
            .config-switch {
                display: flex;
                align-items: center;
                gap: 0.75rem;
                cursor: pointer;
            }
            .config-switch input[type="checkbox"] {
                width: 20px;
                height: 20px;
                cursor: pointer;
            }
            .config-section label {
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
                font-weight: 500;
            }
            .config-section input[type="text"],
            .config-section input[type="url"],
            .config-section input[type="password"],
            .config-section input[type="number"],
            .config-section select {
                padding: 0.5rem;
                border: 1px solid #d1d5db;
                border-radius: 4px;
                font-size: 1rem;
            }
        `;
        document.head.appendChild(style);
    }
}

// Crear instancia global
if (typeof window !== 'undefined') {
    window.systemConfigPanel = new SystemConfigurationPanel();
    console.log('✅ Panel de configuración del sistema cargado');
}




© 2024 - Sistema de Gestión del Ayuntamiento de Cobreros

Interfaz de administración para configurar todos los módulos del sistema

Contacto: editorturis@gmail.com
*/

class SystemConfigurationPanel {
    constructor() {
        this.modalId = 'systemConfigurationModal';
    }

    /**
     * Mostrar panel de configuración
     */
    show() {
        // Verificar permisos
        if (typeof window !== 'undefined' && window.roleVerification) {
            window.roleVerification.requirePermission('MANAGE_SYSTEM_CONFIG', async () => {
                this.render();
            }, { showError: true });
        } else {
            this.render();
        }
    }

    /**
     * Renderizar panel de configuración
     */
    render() {
        // Crear modal
        let modal = document.getElementById(this.modalId);
        if (!modal) {
            modal = document.createElement('div');
            modal.id = this.modalId;
            modal.className = 'modal';
            document.body.appendChild(modal);
        }

        modal.style.display = 'block';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 900px; max-height: 90vh; overflow-y: auto;">
                <div class="modal-header">
                    <h2>⚙️ Configuración del Sistema</h2>
                    <button class="close-modal" onclick="closeModal('${this.modalId}')">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="config-tabs">
                        <button class="tab-button active" onclick="window.systemConfigPanel.showTab('notifications')">
                            📢 Notificaciones
                        </button>
                        <button class="tab-button" onclick="window.systemConfigPanel.showTab('sede')">
                            🏛️ Sede Electrónica
                        </button>
                        <button class="tab-button" onclick="window.systemConfigPanel.showTab('reports')">
                            📊 Reportes
                        </button>
                        <button class="tab-button" onclick="window.systemConfigPanel.showTab('documents')">
                            📄 Documentos
                        </button>
                        <button class="tab-button" onclick="window.systemConfigPanel.showTab('backups')">
                            💾 Backups
                        </button>
                        <button class="tab-button" onclick="window.systemConfigPanel.showTab('audit')">
                            🔍 Auditoría Legal
                        </button>
                        <button class="tab-button" onclick="window.systemConfigPanel.showTab('gdpr')">
                            🔒 RGPD
                        </button>
                        <button class="tab-button" onclick="window.systemConfigPanel.showTab('security')">
                            🛡️ Seguridad
                        </button>
                        <button class="tab-button" onclick="window.systemConfigPanel.showTab('legal')">
                            ⚖️ Políticas Legales
                        </button>
                    </div>

                    <div id="configContent" class="config-content">
                        ${this.renderNotificationsConfig()}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeModal('${this.modalId}')">Cerrar</button>
                    <button class="btn btn-primary" onclick="window.systemConfigPanel.saveAll()">Guardar Cambios</button>
                </div>
            </div>
        `;

        // Aplicar estilos
        this.applyStyles();
    }

    /**
     * Renderizar configuración de notificaciones oficiales
     */
    renderNotificationsConfig() {
        const config = window.officialNotificationsSystem?.config || {};
        return `
            <div id="notificationsTab" class="config-tab active">
                <h3>📢 Configuración de Notificaciones Oficiales</h3>
                
                <div class="config-section">
                    <label class="config-switch">
                        <input type="checkbox" id="notificationsEnabled" ${config.enabled ? 'checked' : ''}>
                        <span>Habilitar sistema de notificaciones oficiales</span>
                    </label>
                </div>

                <div class="config-section">
                    <label class="config-switch">
                        <input type="checkbox" id="notificationsRequireAck" ${config.requireAcknowledgment ? 'checked' : ''}>
                        <span>Requerir acuse de recibo</span>
                    </label>
                </div>

                <div class="config-section">
                    <label class="config-switch">
                        <input type="checkbox" id="notificationsLegalValidity" ${config.legalValidity ? 'checked' : ''}>
                        <span>Validez legal</span>
                    </label>
                </div>

                <div class="config-section">
                    <label>
                        Días de retención:
                        <input type="number" id="notificationsRetentionDays" value="${config.retentionDays || 365}" min="30" max="2555">
                    </label>
                </div>

                <div class="config-section">
                    <label class="config-switch">
                        <input type="checkbox" id="notificationsSendEmail" ${config.sendEmail ? 'checked' : ''}>
                        <span>Enviar por email</span>
                    </label>
                </div>

                <div class="config-section">
                    <label class="config-switch">
                        <input type="checkbox" id="notificationsSendSMS" ${config.sendSMS ? 'checked' : ''}>
                        <span>Enviar por SMS</span>
                    </label>
                </div>

                <div class="config-section">
                    <label class="config-switch">
                        <input type="checkbox" id="notificationsDigitalSignature" ${config.digitalSignature ? 'checked' : ''}>
                        <span>Firma digital</span>
                    </label>
                </div>
            </div>
        `;
    }

    /**
     * Renderizar configuración de Sede Electrónica
     */
    renderSedeConfig() {
        const config = window.sedeElectronicaIntegration?.config || {};
        return `
            <div id="sedeTab" class="config-tab">
                <h3>🏛️ Configuración de Sede Electrónica</h3>
                
                <div class="config-section">
                    <label class="config-switch">
                        <input type="checkbox" id="sedeEnabled" ${config.enabled ? 'checked' : ''}>
                        <span>Habilitar integración con Sede Electrónica</span>
                    </label>
                </div>

                <div class="config-section">
                    <label>
                        URL de la API:
                        <input type="url" id="sedeApiUrl" value="${config.apiUrl || ''}" placeholder="https://sede.ejemplo.es/api">
                    </label>
                </div>

                <div class="config-section">
                    <label>
                        API Key:
                        <input type="password" id="sedeApiKey" value="${config.apiKey || ''}" placeholder="Tu API Key">
                    </label>
                </div>

                <div class="config-section">
                    <label>
                        API Secret:
                        <input type="password" id="sedeApiSecret" value="${config.apiSecret || ''}" placeholder="Tu API Secret">
                    </label>
                </div>

                <div class="config-section">
                    <label class="config-switch">
                        <input type="checkbox" id="sedeTestMode" ${config.testMode ? 'checked' : ''}>
                        <span>Modo de prueba</span>
                    </label>
                </div>

                <div class="config-section">
                    <label class="config-switch">
                        <input type="checkbox" id="sedeAutoSync" ${config.autoSync ? 'checked' : ''}>
                        <span>Sincronización automática</span>
                    </label>
                </div>

                <div class="config-section">
                    <label>
                        Intervalo de sincronización (ms):
                        <input type="number" id="sedeSyncInterval" value="${config.syncInterval || 3600000}" min="60000" step="60000">
                    </label>
                </div>

                <div class="config-section">
                    <button class="btn btn-secondary" onclick="window.systemConfigPanel.testSedeConnection()">
                        Probar Conexión
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Renderizar configuración RGPD
     */
    renderGDPRConfig() {
        // Configuración RGPD se maneja principalmente desde el módulo
        return `
            <div id="gdprTab" class="config-tab">
                <h3>🔒 Configuración RGPD</h3>
                
                <div class="config-section">
                    <p>La configuración RGPD se gestiona automáticamente. Los usuarios pueden ejercer sus derechos desde el sistema.</p>
                </div>

                <div class="config-section">
                    <h4>Derechos ARCO disponibles:</h4>
                    <ul>
                        <li>✅ Acceso a datos personales</li>
                        <li>✅ Rectificación de datos</li>
                        <li>✅ Supresión (derecho al olvido)</li>
                        <li>✅ Oposición al tratamiento</li>
                        <li>✅ Portabilidad de datos</li>
                        <li>✅ Limitación del tratamiento</li>
                    </ul>
                </div>

                <div class="config-section">
                    <button class="btn btn-primary" onclick="window.systemConfigPanel.exportGDPRReport()">
                        Exportar Reporte de Cumplimiento RGPD
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Renderizar configuración de seguridad
     */
    renderSecurityConfig() {
        return `
            <div id="securityTab" class="config-tab">
                <h3>🛡️ Configuración de Seguridad</h3>
                
                <div class="config-section">
                    <h4>Encriptación de Datos</h4>
                    <label class="config-switch">
                        <input type="checkbox" id="encryptionEnabled" checked disabled>
                        <span>Encriptación de datos sensibles (siempre activa)</span>
                    </label>
                </div>

                <div class="config-section">
                    <h4>Validación de Roles</h4>
                    <label class="config-switch">
                        <input type="checkbox" id="roleVerificationEnabled" checked disabled>
                        <span>Verificación de roles en cada acción (siempre activa)</span>
                    </label>
                </div>

                <div class="config-section">
                    <h4>Rate Limiting</h4>
                    <p>Configurado automáticamente. Ver configuración avanzada en código.</p>
                </div>

                <div class="config-section">
                    <h4>Sesiones</h4>
                    <p>Gestión de sesiones activa. Ver configuración en módulo de sesiones.</p>
                </div>
            </div>
        `;
    }

    /**
     * Renderizar configuración de reportes
     */
    renderReportsConfig() {
        const config = window.officialReportsSystem?.config || {};
        return `
            <div id="reportsTab" class="config-tab">
                <h3>📊 Configuración de Reportes</h3>
                
                <div class="config-section">
                    <label class="config-switch">
                        <input type="checkbox" id="reportsEnabled" ${config.enabled ? 'checked' : ''}>
                        <span>Habilitar sistema de reportes</span>
                    </label>
                </div>

                <div class="config-section">
                    <label class="config-switch">
                        <input type="checkbox" id="reportsAutoGenerate" ${config.autoGenerate ? 'checked' : ''}>
                        <span>Generación automática de reportes</span>
                    </label>
                </div>

                <div class="config-section">
                    <label>
                        Días de retención:
                        <input type="number" id="reportsRetentionDays" value="${config.retentionDays || 365}" min="30" max="2555">
                    </label>
                </div>

                <div class="config-section">
                    <h4>Generar Reporte</h4>
                    <label>
                        Período:
                        <select id="reportPeriod">
                            <option value="day">Día</option>
                            <option value="week">Semana</option>
                            <option value="month" selected>Mes</option>
                            <option value="year">Año</option>
                        </select>
                    </label>
                    <div style="margin-top: 1rem;">
                        <button class="btn btn-primary" onclick="window.systemConfigPanel.generateReport('pdf')">
                            Exportar PDF
                        </button>
                        <button class="btn btn-primary" onclick="window.systemConfigPanel.generateReport('excel')">
                            Exportar Excel
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Renderizar configuración de documentos
     */
    renderDocumentsConfig() {
        const config = window.advancedDocumentManagement?.config || {};
        return `
            <div id="documentsTab" class="config-tab">
                <h3>📄 Configuración de Gestión Documental</h3>
                
                <div class="config-section">
                    <label class="config-switch">
                        <input type="checkbox" id="documentsEnabled" ${config.enabled ? 'checked' : ''}>
                        <span>Habilitar gestión documental avanzada</span>
                    </label>
                </div>

                <div class="config-section">
                    <label class="config-switch">
                        <input type="checkbox" id="documentsAutoVersioning" ${config.autoVersioning ? 'checked' : ''}>
                        <span>Versionado automático</span>
                    </label>
                </div>

                <div class="config-section">
                    <label class="config-switch">
                        <input type="checkbox" id="documentsRetentionEnabled" ${config.retentionPolicy?.enabled ? 'checked' : ''}>
                        <span>Política de retención</span>
                    </label>
                </div>

                <div class="config-section">
                    <label>
                        Retención por defecto (días):
                        <input type="number" id="documentsRetentionDays" value="${config.retentionPolicy?.defaultRetentionDays || 2555}" min="30" max="2555">
                    </label>
                </div>

                <div class="config-section">
                    <button class="btn btn-secondary" onclick="window.systemConfigPanel.checkDocumentRetention()">
                        Verificar Retención de Documentos
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Renderizar configuración de backups
     */
    renderBackupsConfig() {
        const config = window.externalBackupSystem?.config || {};
        return `
            <div id="backupsTab" class="config-tab">
                <h3>💾 Configuración de Backups</h3>
                
                <div class="config-section">
                    <label class="config-switch">
                        <input type="checkbox" id="backupsEnabled" ${config.enabled ? 'checked' : ''}>
                        <span>Habilitar sistema de backups</span>
                    </label>
                </div>

                <div class="config-section">
                    <label class="config-switch">
                        <input type="checkbox" id="backupsAutoEnabled" ${config.autoBackup ? 'checked' : ''}>
                        <span>Backups automáticos</span>
                    </label>
                </div>

                <div class="config-section">
                    <label>
                        Frecuencia de backups:
                        <select id="backupsFrequency">
                            <option value="daily" ${config.frequency === 'daily' ? 'selected' : ''}>Diario</option>
                            <option value="weekly" ${config.frequency === 'weekly' ? 'selected' : ''}>Semanal</option>
                            <option value="monthly" ${config.frequency === 'monthly' ? 'selected' : ''}>Mensual</option>
                        </select>
                    </label>
                </div>

                <div class="config-section">
                    <label>
                        Retención (días):
                        <input type="number" id="backupsRetention" value="${config.retentionDays || 30}" min="7" max="365">
                    </label>
                </div>

                <div class="config-section">
                    <button class="btn btn-primary" onclick="window.systemConfigPanel.createBackup()">
                        Crear Backup Manual
                    </button>
                    <button class="btn btn-secondary" onclick="window.systemConfigPanel.viewBackups()">
                        Ver Backups
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Renderizar configuración de auditoría legal
     */
    renderAuditConfig() {
        const config = window.legalAuditTrail?.config || {};
        return `
            <div id="auditTab" class="config-tab">
                <h3>🔍 Configuración de Auditoría Legal</h3>
                
                <div class="config-section">
                    <label class="config-switch">
                        <input type="checkbox" id="auditEnabled" ${config.enabled ? 'checked' : ''}>
                        <span>Habilitar auditoría legal</span>
                    </label>
                </div>

                <div class="config-section">
                    <label class="config-switch">
                        <input type="checkbox" id="auditImmutable" ${config.immutable ? 'checked' : ''}>
                        <span>Logs inalterables</span>
                    </label>
                </div>

                <div class="config-section">
                    <label class="config-switch">
                        <input type="checkbox" id="auditTimestampSealing" ${config.timestampSealing ? 'checked' : ''}>
                        <span>Sellado de tiempo</span>
                    </label>
                </div>

                <div class="config-section">
                    <label>
                        Retención (días):
                        <input type="number" id="auditRetentionDays" value="${config.retentionDays || 2555}" min="365" max="3650">
                    </label>
                </div>

                <div class="config-section">
                    <button class="btn btn-primary" onclick="window.systemConfigPanel.exportAuditReport()">
                        Exportar Auditoría para Cumplimiento
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Renderizar configuración legal
     */
    renderLegalConfig() {
        return `
            <div id="legalTab" class="config-tab">
                <h3>⚖️ Políticas y Términos Legales</h3>
                
                <div class="config-section">
                    <h4>Gestión de Políticas</h4>
                    <p>Edita y gestiona las políticas legales del sitio web.</p>
                </div>

                <div class="config-section">
                    <button class="btn btn-primary" onclick="window.systemConfigPanel.editPrivacyPolicy()">
                        Editar Política de Privacidad
                    </button>
                    <button class="btn btn-primary" onclick="window.systemConfigPanel.editTerms()">
                        Editar Términos y Condiciones
                    </button>
                    <button class="btn btn-primary" onclick="window.systemConfigPanel.editLegalNotice()">
                        Editar Aviso Legal
                    </button>
                    <button class="btn btn-primary" onclick="window.systemConfigPanel.editCookiePolicy()">
                        Editar Política de Cookies
                    </button>
                </div>

                <div class="config-section">
                    <h4>Vista Previa</h4>
                    <button class="btn btn-secondary" onclick="window.legalPoliciesManager?.showPolicy('privacy')">
                        Ver Política de Privacidad
                    </button>
                    <button class="btn btn-secondary" onclick="window.legalPoliciesManager?.showPolicy('terms')">
                        Ver Términos y Condiciones
                    </button>
                    <button class="btn btn-secondary" onclick="window.legalPoliciesManager?.showPolicy('legal')">
                        Ver Aviso Legal
                    </button>
                    <button class="btn btn-secondary" onclick="window.legalPoliciesManager?.showPolicy('cookies')">
                        Ver Política de Cookies
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Generar reporte
     */
    async generateReport(format) {
        const period = document.getElementById('reportPeriod')?.value || 'month';
        if (window.officialReportsSystem) {
            try {
                showNotification('Generando reporte...', 'info');
                await window.officialReportsSystem.generateStatisticsReport(period, format);
                showNotification('Reporte generado correctamente', 'success');
            } catch (error) {
                showNotification('Error al generar reporte', 'error');
            }
        }
    }

    /**
     * Verificar retención de documentos
     */
    async checkDocumentRetention() {
        if (window.advancedDocumentManagement) {
            try {
                showNotification('Verificando retención...', 'info');
                const result = await window.advancedDocumentManagement.checkRetentionPolicy();
                if (result.checked) {
                    showNotification(`Verificación completada. ${result.count} documentos expirados.`, 'info');
                }
            } catch (error) {
                showNotification('Error al verificar retención', 'error');
            }
        }
    }

    /**
     * Exportar reporte de auditoría
     */
    async exportAuditReport() {
        if (window.legalAuditTrail) {
            try {
                showNotification('Exportando auditoría...', 'info');
                await window.legalAuditTrail.exportForCompliance('year');
                showNotification('Auditoría exportada correctamente', 'success');
            } catch (error) {
                showNotification('Error al exportar auditoría', 'error');
            }
        }
    }

    /**
     * Mostrar pestaña específica
     */
    showTab(tabName) {
        // Ocultar todas las pestañas
        document.querySelectorAll('.config-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
        });

        // Mostrar pestaña seleccionada
        const tabMap = {
            'notifications': () => {
                document.getElementById('configContent').innerHTML = this.renderNotificationsConfig();
            },
            'sede': () => {
                document.getElementById('configContent').innerHTML = this.renderSedeConfig();
            },
            'reports': () => {
                document.getElementById('configContent').innerHTML = this.renderReportsConfig();
            },
            'documents': () => {
                document.getElementById('configContent').innerHTML = this.renderDocumentsConfig();
            },
            'backups': () => {
                document.getElementById('configContent').innerHTML = this.renderBackupsConfig();
            },
            'audit': () => {
                document.getElementById('configContent').innerHTML = this.renderAuditConfig();
            },
            'gdpr': () => {
                document.getElementById('configContent').innerHTML = this.renderGDPRConfig();
            },
            'security': () => {
                document.getElementById('configContent').innerHTML = this.renderSecurityConfig();
            },
            'legal': () => {
                document.getElementById('configContent').innerHTML = this.renderLegalConfig();
            }
        };

        if (tabMap[tabName]) {
            tabMap[tabName]();
        }

        // Activar botón
        event.target.classList.add('active');
    }

    /**
     * Guardar toda la configuración
     */
    saveAll() {
        try {
            // Guardar configuración de notificaciones
            if (window.officialNotificationsSystem) {
                const notificationsConfig = {
                    enabled: document.getElementById('notificationsEnabled')?.checked || false,
                    requireAcknowledgment: document.getElementById('notificationsRequireAck')?.checked || false,
                    legalValidity: document.getElementById('notificationsLegalValidity')?.checked || false,
                    retentionDays: parseInt(document.getElementById('notificationsRetentionDays')?.value || 365),
                    sendEmail: document.getElementById('notificationsSendEmail')?.checked || false,
                    sendSMS: document.getElementById('notificationsSendSMS')?.checked || false,
                    digitalSignature: document.getElementById('notificationsDigitalSignature')?.checked || false
                };
                window.officialNotificationsSystem.saveConfig(notificationsConfig);
            }

            // Guardar configuración de Sede Electrónica
            if (window.sedeElectronicaIntegration) {
                const sedeConfig = {
                    enabled: document.getElementById('sedeEnabled')?.checked || false,
                    apiUrl: document.getElementById('sedeApiUrl')?.value || '',
                    apiKey: document.getElementById('sedeApiKey')?.value || '',
                    apiSecret: document.getElementById('sedeApiSecret')?.value || '',
                    testMode: document.getElementById('sedeTestMode')?.checked || false,
                    autoSync: document.getElementById('sedeAutoSync')?.checked || false,
                    syncInterval: parseInt(document.getElementById('sedeSyncInterval')?.value || 3600000)
                };
                window.sedeElectronicaIntegration.saveConfig(sedeConfig);
            }

            // Guardar configuración de reportes
            if (window.officialReportsSystem) {
                const reportsConfig = {
                    enabled: document.getElementById('reportsEnabled')?.checked || false,
                    autoGenerate: document.getElementById('reportsAutoGenerate')?.checked || false,
                    retentionDays: parseInt(document.getElementById('reportsRetentionDays')?.value || 365)
                };
                window.officialReportsSystem.saveConfig(reportsConfig);
            }

            // Guardar configuración de documentos
            if (window.advancedDocumentManagement) {
                const documentsConfig = {
                    enabled: document.getElementById('documentsEnabled')?.checked || false,
                    autoVersioning: document.getElementById('documentsAutoVersioning')?.checked || false,
                    retentionPolicy: {
                        enabled: document.getElementById('documentsRetentionEnabled')?.checked || false,
                        defaultRetentionDays: parseInt(document.getElementById('documentsRetentionDays')?.value || 2555)
                    }
                };
                window.advancedDocumentManagement.saveConfig(documentsConfig);
            }

            // Guardar configuración de backups
            if (window.externalBackupSystem) {
                const backupsConfig = {
                    enabled: document.getElementById('backupsEnabled')?.checked || false,
                    autoBackup: document.getElementById('backupsAutoEnabled')?.checked || false,
                    frequency: document.getElementById('backupsFrequency')?.value || 'daily',
                    retentionDays: parseInt(document.getElementById('backupsRetention')?.value || 30)
                };
                window.externalBackupSystem.saveConfig(backupsConfig);
            }

            // Guardar configuración de auditoría legal
            if (window.legalAuditTrail) {
                const auditConfig = {
                    enabled: document.getElementById('auditEnabled')?.checked || false,
                    immutable: document.getElementById('auditImmutable')?.checked || false,
                    timestampSealing: document.getElementById('auditTimestampSealing')?.checked || false,
                    retentionDays: parseInt(document.getElementById('auditRetentionDays')?.value || 2555)
                };
                window.legalAuditTrail.saveConfig(auditConfig);
            }

            showNotification('Configuración guardada correctamente', 'success');
            console.log('✅ Configuración guardada');
        } catch (error) {
            console.error('Error guardando configuración:', error);
            showNotification('Error al guardar la configuración', 'error');
        }
    }

    /**
     * Probar conexión con Sede Electrónica
     */
    async testSedeConnection() {
        if (!window.sedeElectronicaIntegration) {
            showNotification('Módulo de Sede Electrónica no disponible', 'error');
            return;
        }

        showNotification('Probando conexión...', 'info');
        const result = await window.sedeElectronicaIntegration.testConnection();
        
        if (result.success) {
            showNotification('Conexión exitosa con Sede Electrónica', 'success');
        } else {
            showNotification(`Error: ${result.message}`, 'error');
        }
    }

    /**
     * Crear backup manual
     */
    async createBackup() {
        if (window.externalBackupSystem) {
            try {
                await window.externalBackupSystem.createBackup();
            } catch (error) {
                console.error('Error creando backup:', error);
            }
        }
    }

    /**
     * Ver backups
     */
    async viewBackups() {
        if (!window.externalBackupSystem) {
            showNotification('Sistema de backups no disponible', 'error');
            return;
        }

        try {
            const backups = await window.externalBackupSystem.listBackups();
            
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.style.display = 'block';
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 800px;">
                    <div class="modal-header">
                        <h2>💾 Backups Disponibles</h2>
                        <button class="close-modal" onclick="this.closest('.modal').remove()">&times;</button>
                    </div>
                    <div class="modal-body">
                        ${backups.length === 0 ? '<p>No hay backups disponibles</p>' : `
                            <table style="width: 100%; border-collapse: collapse;">
                                <thead>
                                    <tr>
                                        <th style="border: 1px solid #ddd; padding: 8px;">Nombre</th>
                                        <th style="border: 1px solid #ddd; padding: 8px;">Fecha</th>
                                        <th style="border: 1px solid #ddd; padding: 8px;">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${backups.map(backup => `
                                        <tr>
                                            <td style="border: 1px solid #ddd; padding: 8px;">${backup.name || backup.id}</td>
                                            <td style="border: 1px solid #ddd; padding: 8px;">${new Date(backup.createdAt).toLocaleString('es-ES')}</td>
                                            <td style="border: 1px solid #ddd; padding: 8px;">
                                                <button class="btn btn-sm btn-primary" onclick="window.externalBackupSystem.restoreBackup('${backup.id}')">
                                                    Restaurar
                                                </button>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        `}
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cerrar</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        } catch (error) {
            showNotification('Error al listar backups', 'error');
        }
    }

    /**
     * Editar política de privacidad
     */
    editPrivacyPolicy() {
        this.editPolicy('privacy');
    }

    /**
     * Editar términos y condiciones
     */
    editTerms() {
        this.editPolicy('terms');
    }

    /**
     * Editar aviso legal
     */
    editLegalNotice() {
        this.editPolicy('legal');
    }

    /**
     * Editar política de cookies
     */
    editCookiePolicy() {
        this.editPolicy('cookies');
    }

    /**
     * Editar política (método genérico)
     */
    editPolicy(policyType) {
        if (!window.legalPoliciesManager) {
            showNotification('Gestor de políticas no disponible', 'error');
            return;
        }

        const policy = window.legalPoliciesManager.getPolicy(policyType);
        if (!policy) {
            showNotification('Política no encontrada', 'error');
            return;
        }

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 900px; max-height: 90vh;">
                <div class="modal-header">
                    <h2>Editar ${policy.title}</h2>
                    <button class="close-modal" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <label>
                        Contenido (HTML permitido):
                        <textarea id="policyContent" style="width: 100%; height: 400px; font-family: monospace;">${policy.content || ''}</textarea>
                    </label>
                    <label style="margin-top: 1rem;">
                        Versión:
                        <input type="text" id="policyVersion" value="${policy.version || '1.0'}" style="width: 100px;">
                    </label>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancelar</button>
                    <button class="btn btn-primary" onclick="window.systemConfigPanel.savePolicy('${policyType}')">
                        Guardar
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    /**
     * Guardar política
     */
    savePolicy(policyType) {
        if (!window.legalPoliciesManager) {
            showNotification('Gestor de políticas no disponible', 'error');
            return;
        }

        const content = document.getElementById('policyContent')?.value || '';
        const version = document.getElementById('policyVersion')?.value || null;

        try {
            window.legalPoliciesManager.updatePolicy(policyType, content, version);
            showNotification('Política guardada correctamente', 'success');
            
            // Cerrar modal
            const modal = document.querySelector('.modal:last-of-type');
            if (modal) modal.remove();
        } catch (error) {
            showNotification('Error al guardar política', 'error');
        }
    }

    /**
     * Exportar reporte RGPD
     */
    async exportGDPRReport() {
        if (window.gdprCompliance) {
            showNotification('Funcionalidad en desarrollo', 'info');
            // TODO: Implementar exportación de reporte RGPD
        }
    }

    /**
     * Aplicar estilos
     */
    applyStyles() {
        if (document.getElementById('systemConfigStyles')) return;

        const style = document.createElement('style');
        style.id = 'systemConfigStyles';
        style.textContent = `
            .config-tabs {
                display: flex;
                gap: 0.5rem;
                margin-bottom: 1.5rem;
                border-bottom: 2px solid #e0e0e0;
                flex-wrap: wrap;
            }
            .tab-button {
                padding: 0.75rem 1.5rem;
                border: none;
                background: transparent;
                cursor: pointer;
                border-bottom: 3px solid transparent;
                transition: all 0.3s;
                font-size: 0.9rem;
            }
            .tab-button:hover {
                background: #f5f5f5;
            }
            .tab-button.active {
                border-bottom-color: #1e3a8a;
                color: #1e3a8a;
                font-weight: 600;
            }
            .config-tab {
                display: none;
                padding: 1.5rem 0;
            }
            .config-tab.active {
                display: block;
            }
            .config-section {
                margin-bottom: 1.5rem;
                padding: 1rem;
                background: #f9fafb;
                border-radius: 8px;
            }
            .config-switch {
                display: flex;
                align-items: center;
                gap: 0.75rem;
                cursor: pointer;
            }
            .config-switch input[type="checkbox"] {
                width: 20px;
                height: 20px;
                cursor: pointer;
            }
            .config-section label {
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
                font-weight: 500;
            }
            .config-section input[type="text"],
            .config-section input[type="url"],
            .config-section input[type="password"],
            .config-section input[type="number"],
            .config-section select {
                padding: 0.5rem;
                border: 1px solid #d1d5db;
                border-radius: 4px;
                font-size: 1rem;
            }
        `;
        document.head.appendChild(style);
    }
}

// Crear instancia global
if (typeof window !== 'undefined') {
    window.systemConfigPanel = new SystemConfigurationPanel();
    console.log('✅ Panel de configuración del sistema cargado');
}
