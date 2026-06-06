/* eslint-env browser */
/* global getEmailStatsSummary, formatDateTime, formatDate, getAuditLogs */
// ===== PANEL DE ESTADÍSTICAS PARA ADMINISTRADOR =====
// Muestra estadísticas de emails y otras métricas

/**
 * Carga y muestra las estadísticas de emails
 */
function refreshEmailStats() {
  if (typeof getEmailStatsSummary !== 'function') {
    if (window && window.Logger && typeof window.Logger.warn === 'function') {
      window.Logger.warn('⚠️ Sistema de estadísticas de emails no disponible');
    }
    return;
  }
    
  const container = document.getElementById('emailStatsContainer');
  if (!container) return;
    
  const stats = getEmailStatsSummary();
    
  container.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1rem;">
            <div style="padding: 1rem; background: var(--bg-secondary); border-radius: var(--border-radius); border-left: 4px solid #10b981;">
                <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.5rem;">Total Enviados</div>
                <div style="font-size: 1.5rem; font-weight: bold; color: #10b981;">${stats.total.sent}</div>
            </div>
            <div style="padding: 1rem; background: var(--bg-secondary); border-radius: var(--border-radius); border-left: 4px solid #ef4444;">
                <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.5rem;">Total Fallidos</div>
                <div style="font-size: 1.5rem; font-weight: bold; color: #ef4444;">${stats.total.failed}</div>
            </div>
            <div style="padding: 1rem; background: var(--bg-secondary); border-radius: var(--border-radius); border-left: 4px solid #3b82f6;">
                <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.5rem;">Tasa de Éxito</div>
                <div style="font-size: 1.5rem; font-weight: bold; color: #3b82f6;">${stats.total.successRate}</div>
            </div>
        </div>
        
        <div style="margin-top: 1rem; padding: 1rem; background: var(--bg-secondary); border-radius: var(--border-radius);">
            <h5 style="margin: 0 0 0.75rem 0; color: var(--text-primary);">Últimos 7 días</h5>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 0.75rem;">
                <div>
                    <div style="font-size: 0.75rem; color: var(--text-secondary);">Enviados</div>
                    <div style="font-size: 1.25rem; font-weight: bold; color: var(--text-primary);">${stats.last7Days.sent}</div>
                </div>
                <div>
                    <div style="font-size: 0.75rem; color: var(--text-secondary);">Fallidos</div>
                    <div style="font-size: 1.25rem; font-weight: bold; color: var(--text-primary);">${stats.last7Days.failed}</div>
                </div>
                <div>
                    <div style="font-size: 0.75rem; color: var(--text-secondary);">Tasa de Éxito</div>
                    <div style="font-size: 1.25rem; font-weight: bold; color: var(--text-primary);">${stats.last7Days.successRate}</div>
                </div>
            </div>
        </div>
        
        ${stats.lastAttempt ? `
        <div style="margin-top: 0.75rem; padding: 0.75rem; background: var(--bg-secondary); border-radius: var(--border-radius); font-size: 0.85rem; color: var(--text-secondary);">
            <div><strong>Último intento:</strong> ${formatDateTime(stats.lastAttempt)}</div>
            ${stats.lastSuccess ? `<div><strong>Último éxito:</strong> ${formatDateTime(stats.lastSuccess)}</div>` : ''}
            ${stats.lastFailure ? `<div><strong>Último fallo:</strong> ${formatDateTime(stats.lastFailure)}</div>` : ''}
        </div>
        ` : ''}
    `;
}

/**
 * Muestra los logs de auditoría
 */
function showAuditLogs() {
  if (typeof getAuditLogs !== 'function') {
    if (window && window.Logger && typeof window.Logger.warn === 'function') {
      window.Logger.warn('⚠️ Sistema de logs de auditoría no disponible');
    }
    return;
  }
    
  const container = document.getElementById('auditLogsContainer');
  if (!container) return;
    
  // Toggle visibilidad
  if (container.style.display === 'none') {
    container.style.display = 'block';
    loadAuditLogsList();
  } else {
    container.style.display = 'none';
  }
}

/**
 * Carga la lista de logs de auditoría
 */
function loadAuditLogsList() {
  const container = document.getElementById('auditLogsContainer');
  if (!container) return;
    
  const logs = getAuditLogs();
  const recentLogs = logs.slice(-50); // Últimos 50 logs
    
  if (recentLogs.length === 0) {
    container.innerHTML = '<p style="color: var(--text-secondary); padding: 1rem; text-align: center;">No hay logs de auditoría</p>';
    return;
  }
    
  container.innerHTML = `
        <div style="max-height: 400px; overflow-y: auto; margin-top: 1rem;">
            <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
                <thead>
                    <tr style="background: var(--bg-secondary); border-bottom: 2px solid var(--border-color);">
                        <th style="padding: 0.75rem; text-align: left;">Fecha/Hora</th>
                        <th style="padding: 0.75rem; text-align: left;">Acción</th>
                        <th style="padding: 0.75rem; text-align: left;">Administrador</th>
                        <th style="padding: 0.75rem; text-align: left;">Detalles</th>
                    </tr>
                </thead>
                <tbody>
                    ${recentLogs.map(log => `
                        <tr style="border-bottom: 1px solid var(--border-color);">
                            <td style="padding: 0.75rem;">${formatDateTime(log.timestamp)}</td>
                            <td style="padding: 0.75rem;">
                                <span style="padding: 0.25rem 0.5rem; background: var(--bg-secondary); border-radius: 4px; font-size: 0.75rem;">
                                    ${log.actionText}
                                </span>
                            </td>
                            <td style="padding: 0.75rem;">${log.adminName}</td>
                            <td style="padding: 0.75rem; color: var(--text-secondary); font-size: 0.8rem;">
                                ${log.details.appointmentName ? `Cita: ${log.details.appointmentName}` : ''}
                                ${log.details.appointmentDate ? ` - ${formatDate(log.details.appointmentDate)}` : ''}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        <div style="margin-top: 0.75rem; font-size: 0.85rem; color: var(--text-secondary);">
            Mostrando últimos ${recentLogs.length} de ${logs.length} logs
        </div>
    `;
}

// Exportar funciones
if (typeof window !== 'undefined') {
  window.refreshEmailStats = refreshEmailStats;
  window.showAuditLogs = showAuditLogs;
  window.loadAuditLogsList = loadAuditLogsList;
}

