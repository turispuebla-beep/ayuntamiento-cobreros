/* eslint-env browser */
// ===== SISTEMA DE LOGS DE AUDITORÍA =====
// Registra todas las acciones importantes del administrador

const AUDIT_LOG_KEY = 'audit_log';
const MAX_LOG_ENTRIES = 500;

/**
 * Tipos de acciones auditables
 */
const AUDIT_ACTIONS = {
  APPOINTMENT_CREATED: 'Cita creada',
  APPOINTMENT_UPDATED: 'Cita actualizada',
  APPOINTMENT_DELETED: 'Cita eliminada',
  APPOINTMENT_CANCELLED: 'Cita cancelada',
  APPOINTMENT_COMPLETED: 'Cita marcada como completada',
  APPOINTMENT_NO_SHOW: 'Cita marcada como no se presentó',
  APPOINTMENT_STATUS_CHANGED: 'Estado de cita cambiado',
  USER_CREATED: 'Usuario creado',
  USER_DELETED: 'Usuario eliminado',
  ADMIN_LOGIN: 'Inicio de sesión de administrador',
  ADMIN_LOGOUT: 'Cierre de sesión de administrador',
  SETTINGS_CHANGED: 'Configuración cambiada',
  DATA_EXPORTED: 'Datos exportados',
  DATA_IMPORTED: 'Datos importados',
  MAINTENANCE_ENABLED: 'Modo mantenimiento activado',
  MAINTENANCE_DISABLED: 'Modo mantenimiento desactivado'
};

/**
 * Registra una acción en el log de auditoría
 */
function logAuditAction(action, details = {}) {
  try {
    const logs = getAuditLogs();
        
    const logEntry = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      action: action,
      actionText: AUDIT_ACTIONS[action] || action,
      adminEmail: currentUser?.email || 'unknown',
      adminName: currentUser?.name || 'unknown',
      details: details,
      userAgent: navigator.userAgent,
      ip: 'N/A' // No disponible en cliente
    };
        
    logs.push(logEntry);
        
    // Mantener solo los últimos N entradas
    if (logs.length > MAX_LOG_ENTRIES) {
      logs.shift(); // Eliminar el más antiguo
    }
        
    saveAuditLogs(logs);
        
    if (window && window.Logger && typeof window.Logger.log === 'function') {
      window.Logger.log(`📝 Log de auditoría: ${logEntry.actionText}`, logEntry);
    }
  } catch (error) {
    if (window && window.Logger && typeof window.Logger.error === 'function') {
      window.Logger.error('❌ Error registrando log de auditoría:', error);
    }
  }
}

/**
 * Obtiene todos los logs de auditoría
 */
function getAuditLogs() {
  try {
    const saved = localStorage.getItem(AUDIT_LOG_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    if (window && window.Logger && typeof window.Logger.error === 'function') {
      window.Logger.error('❌ Error obteniendo logs:', error);
    }
    return [];
  }
}

/**
 * Guarda los logs de auditoría
 */
function saveAuditLogs(logs) {
  try {
    localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(logs));
  } catch (error) {
    if (window && window.Logger && typeof window.Logger.error === 'function') {
      window.Logger.error('❌ Error guardando logs:', error);
    }
  }
}

/**
 * Obtiene logs filtrados por acción o rango de fechas
 */
function getFilteredAuditLogs(filters = {}) {
  let logs = getAuditLogs();
    
  // Filtrar por acción
  if (filters.action) {
    logs = logs.filter(log => log.action === filters.action);
  }
    
  // Filtrar por rango de fechas
  if (filters.startDate) {
    const start = new Date(filters.startDate);
    logs = logs.filter(log => new Date(log.timestamp) >= start);
  }
    
  if (filters.endDate) {
    const end = new Date(filters.endDate);
    end.setHours(23, 59, 59, 999);
    logs = logs.filter(log => new Date(log.timestamp) <= end);
  }
    
  // Filtrar por administrador
  if (filters.adminEmail) {
    logs = logs.filter(log => log.adminEmail === filters.adminEmail);
  }
    
  // Ordenar por fecha (más reciente primero)
  logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
  return logs;
}

/**
 * Exporta los logs de auditoría
 */
function exportAuditLogs() {
  try {
    const logs = getAuditLogs();
    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      totalLogs: logs.length,
      logs: logs
    };
        
    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
        
    showNotification('✅ Logs de auditoría exportados correctamente', 'success');
  } catch (error) {
    if (window && window.Logger && typeof window.Logger.error === 'function') {
      window.Logger.error('❌ Error exportando logs:', error);
    }
    showNotification('Error al exportar logs', 'error');
  }
}

/**
 * Limpia los logs de auditoría antiguos (mantiene últimos 30 días)
 */
function cleanOldAuditLogs() {
  const logs = getAuditLogs();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
  const filteredLogs = logs.filter(log => {
    return new Date(log.timestamp) > thirtyDaysAgo;
  });
    
  saveAuditLogs(filteredLogs);
    
  if (window && window.Logger && typeof window.Logger.log === 'function') {
    window.Logger.log(`🧹 Logs de auditoría limpiados: ${filteredLogs.length} entradas de los últimos 30 días`);
  }
}

/**
 * Obtiene estadísticas de acciones
 */
function getAuditStats() {
  const logs = getAuditLogs();
  const stats = {};
    
  logs.forEach(log => {
    if (!stats[log.action]) {
      stats[log.action] = {
        count: 0,
        actionText: log.actionText
      };
    }
    stats[log.action].count++;
  });
    
  return stats;
}

// Limpiar logs antiguos periódicamente
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    setTimeout(cleanOldAuditLogs, 5000);
  });
}

// Exportar funciones
if (typeof window !== 'undefined') {
  window.logAuditAction = logAuditAction;
  window.getAuditLogs = getAuditLogs;
  window.getFilteredAuditLogs = getFilteredAuditLogs;
  window.exportAuditLogs = exportAuditLogs;
  window.getAuditStats = getAuditStats;
  window.AUDIT_ACTIONS = AUDIT_ACTIONS;
}

