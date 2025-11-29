/**
 * Admin Dashboard - Dashboard de administradores
 * Estadísticas de uso (logins, acciones, usuarios activos)
 * Lista de administradores con último acceso
 * Alertas de seguridad
 */

class AdminDashboard {
    constructor() {
        this.stats = {
            totalLogins: 0,
            totalActions: 0,
            activeUsers: 0,
            securityAlerts: []
        };
    }

    /**
     * Carga las estadísticas del dashboard
     */
    async loadStats() {
        try {
            await Promise.all([
                this.loadLoginStats(),
                this.loadActionStats(),
                this.loadActiveUsers(),
                this.loadSecurityAlerts()
            ]);
        } catch (error) {
            console.error('Error cargando estadísticas:', error);
        }
    }

    /**
     * Carga estadísticas de logins
     */
    async loadLoginStats() {
        try {
            if (typeof window !== 'undefined' && window.firebase && window.firebase.firestore) {
                const db = window.firebase.firestore();
                
                // Últimos 30 días
                const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
                
                const snapshot = await db.collection('audit_logs')
                    .where('action', '==', 'ADMIN_LOGIN')
                    .where('timestamp', '>=', thirtyDaysAgo)
                    .get();
                
                this.stats.totalLogins = snapshot.size;
                
                // Logins por día (últimos 7 días)
                const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
                const recentLogins = await db.collection('audit_logs')
                    .where('action', '==', 'ADMIN_LOGIN')
                    .where('timestamp', '>=', sevenDaysAgo)
                    .orderBy('timestamp', 'desc')
                    .get();
                
                const loginsByDay = {};
                recentLogins.forEach(doc => {
                    const date = new Date(doc.data().timestamp);
                    const dayKey = date.toISOString().split('T')[0];
                    loginsByDay[dayKey] = (loginsByDay[dayKey] || 0) + 1;
                });
                
                return {
                    total: this.stats.totalLogins,
                    byDay: loginsByDay
                };
            }
        } catch (error) {
            console.error('Error cargando estadísticas de logins:', error);
        }
        
        return { total: 0, byDay: {} };
    }

    /**
     * Carga estadísticas de acciones
     */
    async loadActionStats() {
        try {
            if (typeof window !== 'undefined' && window.firebase && window.firebase.firestore) {
                const db = window.firebase.firestore();
                
                // Últimos 30 días
                const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
                
                const snapshot = await db.collection('audit_logs')
                    .where('timestamp', '>=', thirtyDaysAgo)
                    .get();
                
                this.stats.totalActions = snapshot.size;
                
                // Acciones por tipo
                const actionsByType = {};
                snapshot.forEach(doc => {
                    const action = doc.data().action;
                    actionsByType[action] = (actionsByType[action] || 0) + 1;
                });
                
                return {
                    total: this.stats.totalActions,
                    byType: actionsByType
                };
            }
        } catch (error) {
            console.error('Error cargando estadísticas de acciones:', error);
        }
        
        return { total: 0, byType: {} };
    }

    /**
     * Carga usuarios activos
     */
    async loadActiveUsers() {
        try {
            if (typeof window !== 'undefined' && window.firebase && window.firebase.firestore) {
                const db = window.firebase.firestore();
                
                // Usuarios activos en las últimas 24 horas
                const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
                
                const snapshot = await db.collection('audit_logs')
                    .where('action', '==', 'ADMIN_LOGIN')
                    .where('timestamp', '>=', oneDayAgo)
                    .get();
                
                const uniqueUsers = new Set();
                snapshot.forEach(doc => {
                    const userEmail = doc.data().userEmail;
                    if (userEmail) {
                        uniqueUsers.add(userEmail);
                    }
                });
                
                this.stats.activeUsers = uniqueUsers.size;
                
                return Array.from(uniqueUsers);
            }
        } catch (error) {
            console.error('Error cargando usuarios activos:', error);
        }
        
        return [];
    }

    /**
     * Carga lista de administradores con último acceso
     */
    async loadAdminsList() {
        try {
            if (typeof window !== 'undefined' && window.firebase && window.firebase.firestore) {
                const db = window.firebase.firestore();
                
                // Obtener todos los administradores
                const adminsSnapshot = await db.collection('administrators')
                    .where('isActive', '==', true)
                    .get();
                
                const admins = [];
                
                for (const doc of adminsSnapshot.docs) {
                    const adminData = doc.data();
                    
                    // Obtener último acceso
                    const lastLoginSnapshot = await db.collection('audit_logs')
                        .where('action', '==', 'ADMIN_LOGIN')
                        .where('userEmail', '==', adminData.email)
                        .orderBy('timestamp', 'desc')
                        .limit(1)
                        .get();
                    
                    let lastAccess = null;
                    if (!lastLoginSnapshot.empty) {
                        lastAccess = lastLoginSnapshot.docs[0].data().timestamp;
                    }
                    
                    admins.push({
                        id: doc.id,
                        email: adminData.email,
                        name: adminData.name,
                        isSuperAdmin: adminData.isSuperAdmin || false,
                        lastAccess: lastAccess,
                        createdAt: adminData.createdAt || null
                    });
                }
                
                // Ordenar por último acceso (más reciente primero)
                admins.sort((a, b) => {
                    if (!a.lastAccess) return 1;
                    if (!b.lastAccess) return -1;
                    return b.lastAccess - a.lastAccess;
                });
                
                return admins;
            }
        } catch (error) {
            console.error('Error cargando lista de administradores:', error);
        }
        
        return [];
    }

    /**
     * Carga alertas de seguridad
     */
    async loadSecurityAlerts() {
        try {
            if (typeof window !== 'undefined' && window.firebase && window.firebase.firestore) {
                const db = window.firebase.firestore();
                
                // Últimas 24 horas
                const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
                
                const alerts = [];
                
                // Intentos de login fallidos múltiples
                const failedLoginsSnapshot = await db.collection('audit_logs')
                    .where('action', '==', 'ADMIN_LOGIN_FAILED')
                    .where('timestamp', '>=', oneDayAgo)
                    .get();
                
                const failedByEmail = {};
                failedLoginsSnapshot.forEach(doc => {
                    const email = doc.data().userEmail;
                    failedByEmail[email] = (failedByEmail[email] || 0) + 1;
                });
                
                Object.entries(failedByEmail).forEach(([email, count]) => {
                    if (count >= 3) {
                        alerts.push({
                            type: 'MULTIPLE_FAILED_LOGINS',
                            severity: 'high',
                            message: `${count} intentos de login fallidos para ${email}`,
                            timestamp: Date.now()
                        });
                    }
                });
                
                // Nuevos logins desde IPs diferentes
                const newLoginsSnapshot = await db.collection('audit_logs')
                    .where('action', '==', 'ADMIN_LOGIN')
                    .where('timestamp', '>=', oneDayAgo)
                    .orderBy('timestamp', 'desc')
                    .get();
                
                const ipsByEmail = {};
                newLoginsSnapshot.forEach(doc => {
                    const data = doc.data();
                    const email = data.userEmail;
                    const ip = data.ipAddress;
                    
                    if (!ipsByEmail[email]) {
                        ipsByEmail[email] = new Set();
                    }
                    ipsByEmail[email].add(ip);
                });
                
                Object.entries(ipsByEmail).forEach(([email, ips]) => {
                    if (ips.size > 2) {
                        alerts.push({
                            type: 'MULTIPLE_IP_LOGINS',
                            severity: 'medium',
                            message: `Login desde ${ips.size} IPs diferentes para ${email}`,
                            timestamp: Date.now()
                        });
                    }
                });
                
                this.stats.securityAlerts = alerts;
                
                return alerts;
            }
        } catch (error) {
            console.error('Error cargando alertas de seguridad:', error);
        }
        
        return [];
    }

    /**
     * Renderiza el dashboard en el DOM
     * @param {HTMLElement} container - Contenedor donde renderizar
     */
    async renderDashboard(container) {
        if (!container) return;
        
        await this.loadStats();
        const admins = await this.loadAdminsList();
        const alerts = await this.loadSecurityAlerts();
        
        container.innerHTML = `
            <div class="admin-dashboard">
                <h2>Dashboard de Administración</h2>
                
                <!-- Estadísticas -->
                <div class="dashboard-stats">
                    <div class="stat-card">
                        <h3>Logins (30 días)</h3>
                        <p class="stat-value">${this.stats.totalLogins}</p>
                    </div>
                    <div class="stat-card">
                        <h3>Acciones (30 días)</h3>
                        <p class="stat-value">${this.stats.totalActions}</p>
                    </div>
                    <div class="stat-card">
                        <h3>Usuarios Activos (24h)</h3>
                        <p class="stat-value">${this.stats.activeUsers}</p>
                    </div>
                    <div class="stat-card">
                        <h3>Alertas de Seguridad</h3>
                        <p class="stat-value ${alerts.length > 0 ? 'alert' : ''}">${alerts.length}</p>
                    </div>
                </div>
                
                <!-- Alertas de Seguridad -->
                ${alerts.length > 0 ? `
                    <div class="security-alerts">
                        <h3>Alertas de Seguridad</h3>
                        <div class="alerts-list">
                            ${alerts.map(alert => `
                                <div class="alert-item alert-${alert.severity}">
                                    <strong>${alert.type}</strong>
                                    <p>${alert.message}</p>
                                    <small>${new Date(alert.timestamp).toLocaleString()}</small>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                
                <!-- Lista de Administradores -->
                <div class="admins-list">
                    <h3>Administradores</h3>
                    <table class="admins-table">
                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th>Email</th>
                                <th>Tipo</th>
                                <th>Último Acceso</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${admins.map(admin => `
                                <tr>
                                    <td>${admin.name || 'N/A'}</td>
                                    <td>${admin.email}</td>
                                    <td>${admin.isSuperAdmin ? 'Super Admin' : 'Admin'}</td>
                                    <td>${admin.lastAccess ? new Date(admin.lastAccess).toLocaleString() : 'Nunca'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }
}

// Instancia global
const adminDashboard = new AdminDashboard();

// Exponer globalmente
if (typeof window !== 'undefined') {
    window.adminDashboard = adminDashboard;
}


