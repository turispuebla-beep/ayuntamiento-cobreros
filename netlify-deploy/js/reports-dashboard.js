/*
Dashboard de Reportes y Estadísticas
© 2024 - Sistema de Gestión del Ayuntamiento de Cobreros

Genera reportes y estadísticas oficiales para el ayuntamiento:
- Estadísticas de usuarios
- Estadísticas de eventos
- Reportes financieros
- Exportación a formatos oficiales

Contacto: editorturis@gmail.com
*/

class ReportsDashboard {
    constructor() {
        this.reportsCollection = 'system_reports';
    }

    /**
     * Generar reporte completo del sistema
     * @param {Object} options - Opciones del reporte
     * @returns {Promise<Object>} - Reporte generado
     */
    async generateSystemReport(options = {}) {
        try {
            const {
                startDate = null,
                endDate = new Date(),
                includeUsers = true,
                includeEvents = true,
                includeFinancial = true,
                includeNotifications = true
            } = options;

            const report = {
                generatedAt: new Date(),
                generatedAtISO: new Date().toISOString(),
                generatedBy: window.currentUser?.uid || 'system',
                generatedByEmail: window.currentUser?.email || 'system',
                period: {
                    start: startDate ? new Date(startDate).toISOString() : null,
                    end: new Date(endDate).toISOString()
                },
                data: {}
            };

            // Estadísticas de usuarios
            if (includeUsers) {
                report.data.users = await this.getUserStatistics(startDate, endDate);
            }

            // Estadísticas de eventos
            if (includeEvents) {
                report.data.events = await this.getEventStatistics(startDate, endDate);
            }

            // Estadísticas financieras
            if (includeFinancial) {
                report.data.financial = await this.getFinancialStatistics(startDate, endDate);
            }

            // Estadísticas de notificaciones
            if (includeNotifications) {
                report.data.notifications = await this.getNotificationStatistics(startDate, endDate);
            }

            // Guardar reporte
            if (window.firebase && window.firebase.firestore) {
                const docRef = await window.firebase.firestore()
                    .collection(this.reportsCollection)
                    .add(report);
                report.id = docRef.id;
            }

            // Registrar en logs
            if (window.auditLogSystem) {
                await window.auditLogSystem.log('REPORT_GENERATED', {
                    reportId: report.id,
                    type: 'system',
                    period: report.period
                });
            }

            return report;
        } catch (error) {
            console.error('❌ Error generando reporte:', error);
            throw error;
        }
    }

    /**
     * Obtener estadísticas de usuarios
     */
    async getUserStatistics(startDate, endDate) {
        try {
            let users = [];

            if (window.firebase && window.firebase.firestore) {
                let query = window.firebase.firestore().collection('users');
                
                if (startDate) {
                    query = query.where('createdAt', '>=', startDate);
                }
                if (endDate) {
                    query = query.where('createdAt', '<=', endDate);
                }

                const snapshot = await query.get();
                users = snapshot.docs.map(doc => doc.data());
            } else {
                users = JSON.parse(localStorage.getItem('users') || '[]');
            }

            const stats = {
                total: users.length,
                byType: {
                    socio: users.filter(u => u.role === 'socio' || u.type === 'socio').length,
                    colaborador: users.filter(u => u.role === 'colaborador' || u.type === 'colaborador').length,
                    amigo: users.filter(u => u.role === 'amigo' || u.type === 'amigo').length,
                    admin: users.filter(u => u.role === 'admin' || u.isAdmin).length
                },
                active: users.filter(u => u.isActive !== false).length,
                inactive: users.filter(u => u.isActive === false).length,
                newThisPeriod: startDate ? users.filter(u => {
                    const created = new Date(u.createdAt);
                    return created >= new Date(startDate) && created <= new Date(endDate);
                }).length : 0
            };

            return stats;
        } catch (error) {
            console.error('❌ Error obteniendo estadísticas de usuarios:', error);
            return {};
        }
    }

    /**
     * Obtener estadísticas de eventos
     */
    async getEventStatistics(startDate, endDate) {
        try {
            let events = [];

            if (window.firebase && window.firebase.firestore) {
                let query = window.firebase.firestore().collection('events');
                
                if (startDate) {
                    query = query.where('date', '>=', startDate);
                }
                if (endDate) {
                    query = query.where('date', '<=', endDate);
                }

                const snapshot = await query.get();
                events = snapshot.docs.map(doc => doc.data());
            } else {
                events = JSON.parse(localStorage.getItem('events') || '[]');
            }

            const stats = {
                total: events.length,
                upcoming: events.filter(e => new Date(e.date) > new Date()).length,
                past: events.filter(e => new Date(e.date) <= new Date()).length,
                totalRegistrations: events.reduce((sum, e) => sum + (e.registrations?.length || 0), 0),
                averageRegistrations: events.length > 0 ? 
                    events.reduce((sum, e) => sum + (e.registrations?.length || 0), 0) / events.length : 0
            };

            return stats;
        } catch (error) {
            console.error('❌ Error obteniendo estadísticas de eventos:', error);
            return {};
        }
    }

    /**
     * Obtener estadísticas financieras
     */
    async getFinancialStatistics(startDate, endDate) {
        try {
            // Esto dependería de tu sistema de contabilidad
            // Por ahora retornar estructura básica
            return {
                totalIncome: 0,
                totalExpenses: 0,
                balance: 0,
                transactions: 0
            };
        } catch (error) {
            console.error('❌ Error obteniendo estadísticas financieras:', error);
            return {};
        }
    }

    /**
     * Obtener estadísticas de notificaciones
     */
    async getNotificationStatistics(startDate, endDate) {
        try {
            if (window.officialNotificationsSystem) {
                const notifications = await window.officialNotificationsSystem.getNotificationHistory({
                    startDate: startDate,
                    endDate: endDate
                });

                return {
                    total: notifications.length,
                    sent: notifications.filter(n => n.status === 'sent').length,
                    read: notifications.filter(n => n.status === 'read').length,
                    acknowledged: notifications.filter(n => n.status === 'acknowledged').length,
                    byType: {
                        administrative: notifications.filter(n => n.type === 'administrative').length,
                        event: notifications.filter(n => n.type === 'event').length,
                        payment: notifications.filter(n => n.type === 'payment').length,
                        document: notifications.filter(n => n.type === 'document').length,
                        general: notifications.filter(n => n.type === 'general').length
                    }
                };
            }

            return {};
        } catch (error) {
            console.error('❌ Error obteniendo estadísticas de notificaciones:', error);
            return {};
        }
    }

    /**
     * Exportar reporte a formato oficial
     * @param {Object} report - Reporte a exportar
     * @param {string} format - Formato (pdf, excel, csv, json)
     * @returns {Promise<string|Blob>} - Datos exportados
     */
    async exportReport(report, format = 'pdf') {
        try {
            if (format === 'json') {
                return JSON.stringify(report, null, 2);
            } else if (format === 'csv') {
                return this.exportToCSV(report);
            } else if (format === 'excel') {
                return this.exportToExcel(report);
            } else if (format === 'pdf') {
                return this.exportToPDF(report);
            }

            throw new Error('Formato no soportado');
        } catch (error) {
            console.error('❌ Error exportando reporte:', error);
            throw error;
        }
    }

    /**
     * Exportar a CSV
     */
    exportToCSV(report) {
        const lines = [];
        lines.push('REPORTE DEL SISTEMA');
        lines.push(`Generado: ${new Date(report.generatedAtISO).toLocaleString('es-ES')}`);
        lines.push(`Generado por: ${report.generatedByEmail}`);
        lines.push('');

        if (report.data.users) {
            lines.push('ESTADÍSTICAS DE USUARIOS');
            lines.push(`Total: ${report.data.users.total}`);
            lines.push(`Socios: ${report.data.users.byType?.socio || 0}`);
            lines.push(`Colaboradores: ${report.data.users.byType?.colaborador || 0}`);
            lines.push(`Amigos: ${report.data.users.byType?.amigo || 0}`);
            lines.push(`Activos: ${report.data.users.active || 0}`);
            lines.push('');
        }

        if (report.data.events) {
            lines.push('ESTADÍSTICAS DE EVENTOS');
            lines.push(`Total: ${report.data.events.total}`);
            lines.push(`Próximos: ${report.data.events.upcoming || 0}`);
            lines.push(`Pasados: ${report.data.events.past || 0}`);
            lines.push(`Total inscripciones: ${report.data.events.totalRegistrations || 0}`);
            lines.push('');
        }

        return lines.join('\n');
    }

    /**
     * Exportar a Excel (formato básico)
     */
    exportToExcel(report) {
        // Por ahora retornar CSV, se puede mejorar con librería específica
        return this.exportToCSV(report);
    }

    /**
     * Exportar a PDF (formato básico)
     */
    exportToPDF(report) {
        // Por ahora retornar JSON, se puede mejorar con jsPDF
        return JSON.stringify(report, null, 2);
    }

    /**
     * Generar dashboard HTML
     * @returns {string} - HTML del dashboard
     */
    generateDashboardHTML() {
        return `
            <div class="reports-dashboard">
                <h2>Dashboard de Reportes y Estadísticas</h2>
                
                <div class="report-controls">
                    <button onclick="reportsDashboard.generateAndShowReport()" class="btn btn-primary">
                        Generar Reporte Completo
                    </button>
                    <button onclick="reportsDashboard.exportLastReport()" class="btn btn-outline">
                        Exportar Último Reporte
                    </button>
                </div>

                <div id="reports-container" class="reports-container">
                    <!-- Los reportes se cargarán aquí -->
                </div>
            </div>
        `;
    }

    /**
     * Generar y mostrar reporte
     */
    async generateAndShowReport() {
        try {
            const report = await this.generateSystemReport({
                startDate: new Date(new Date().getFullYear(), 0, 1), // Desde inicio del año
                endDate: new Date()
            });

            this.displayReport(report);
        } catch (error) {
            console.error('❌ Error generando reporte:', error);
            if (typeof showNotification === 'function') {
                showNotification('Error al generar el reporte', 'error');
            }
        }
    }

    /**
     * Mostrar reporte en el dashboard
     */
    displayReport(report) {
        const container = document.getElementById('reports-container');
        if (!container) return;

        container.innerHTML = `
            <div class="report-card">
                <h3>Reporte Generado: ${new Date(report.generatedAtISO).toLocaleString('es-ES')}</h3>
                
                ${report.data.users ? `
                    <div class="stat-section">
                        <h4>Usuarios</h4>
                        <ul>
                            <li>Total: ${report.data.users.total}</li>
                            <li>Socios: ${report.data.users.byType?.socio || 0}</li>
                            <li>Colaboradores: ${report.data.users.byType?.colaborador || 0}</li>
                            <li>Amigos: ${report.data.users.byType?.amigo || 0}</li>
                            <li>Activos: ${report.data.users.active || 0}</li>
                        </ul>
                    </div>
                ` : ''}
                
                ${report.data.events ? `
                    <div class="stat-section">
                        <h4>Eventos</h4>
                        <ul>
                            <li>Total: ${report.data.events.total}</li>
                            <li>Próximos: ${report.data.events.upcoming || 0}</li>
                            <li>Pasados: ${report.data.events.past || 0}</li>
                            <li>Total inscripciones: ${report.data.events.totalRegistrations || 0}</li>
                        </ul>
                    </div>
                ` : ''}
                
                <div class="report-actions">
                    <button onclick="reportsDashboard.exportReportById('${report.id}', 'pdf')" class="btn btn-primary">
                        Exportar PDF
                    </button>
                    <button onclick="reportsDashboard.exportReportById('${report.id}', 'excel')" class="btn btn-primary">
                        Exportar Excel
                    </button>
                    <button onclick="reportsDashboard.exportReportById('${report.id}', 'csv')" class="btn btn-outline">
                        Exportar CSV
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Exportar reporte por ID
     */
    async exportReportById(reportId, format) {
        try {
            let report = null;

            if (window.firebase && window.firebase.firestore) {
                const doc = await window.firebase.firestore()
                    .collection(this.reportsCollection)
                    .doc(reportId)
                    .get();
                
                if (doc.exists) {
                    report = { id: doc.id, ...doc.data() };
                }
            }

            if (!report) {
                throw new Error('Reporte no encontrado');
            }

            const exported = await this.exportReport(report, format);
            
            // Descargar archivo
            const blob = new Blob([exported], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `reporte_${reportId}_${new Date().toISOString().split('T')[0]}.${format}`;
            a.click();
            URL.revokeObjectURL(url);

        } catch (error) {
            console.error('❌ Error exportando reporte:', error);
            if (typeof showNotification === 'function') {
                showNotification('Error al exportar el reporte', 'error');
            }
        }
    }
}

// Crear instancia global
const reportsDashboard = new ReportsDashboard();

// Hacer disponible globalmente
if (typeof window !== 'undefined') {
    window.reportsDashboard = reportsDashboard;
}

// Exportar
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ReportsDashboard;
}

