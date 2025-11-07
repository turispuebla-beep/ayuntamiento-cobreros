/* eslint-env browser */
// ===== SISTEMA DE ESTADÍSTICAS DE EMAILS =====
// Registra y muestra estadísticas de envío de emails

const EMAIL_STATS_KEY = 'email_stats';

/**
 * Registra un intento de envío de email
 */
function logStatsInfo(...args) {
  if (typeof window !== 'undefined' && window.Logger && typeof window.Logger.log === 'function') {
    window.Logger.log(...args);
  }
}

function logStatsError(...args) {
  if (typeof window !== 'undefined' && window.Logger && typeof window.Logger.error === 'function') {
    window.Logger.error(...args);
  }
}

function recordEmailAttempt(emailData, success, error = null) {
  try {
    const stats = getEmailStats();
        
    const attempt = {
      timestamp: new Date().toISOString(),
      to: emailData.to,
      subject: emailData.subject,
      template: emailData.template || 'unknown',
      success: success,
      error: error || null
    };
        
    stats.attempts.push(attempt);
        
    // Mantener solo los últimos 1000 intentos
    if (stats.attempts.length > 1000) {
      stats.attempts = stats.attempts.slice(-1000);
    }
        
    // Actualizar contadores
    if (success) {
      stats.totalSent++;
      stats.lastSuccess = new Date().toISOString();
    } else {
      stats.totalFailed++;
      stats.lastFailure = new Date().toISOString();
    }
        
    stats.lastAttempt = new Date().toISOString();
        
    saveEmailStats(stats);
        
    // Notificar al admin si hay muchos fallos recientes
    checkEmailFailureRate(stats);
  } catch (error) {
    logStatsError('❌ Error registrando estadística de email:', error);
  }
}

/**
 * Obtiene las estadísticas de emails
 */
function getEmailStats() {
  try {
    const saved = localStorage.getItem(EMAIL_STATS_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    logStatsError('❌ Error obteniendo estadísticas:', error);
  }
    
  // Inicializar estadísticas
  return {
    totalSent: 0,
    totalFailed: 0,
    attempts: [],
    lastAttempt: null,
    lastSuccess: null,
    lastFailure: null
  };
}

/**
 * Guarda las estadísticas
 */
function saveEmailStats(stats) {
  try {
    localStorage.setItem(EMAIL_STATS_KEY, JSON.stringify(stats));
  } catch (error) {
    logStatsError('❌ Error guardando estadísticas:', error);
  }
}

/**
 * Verifica la tasa de fallos y notifica al admin si es alta
 */
function checkEmailFailureRate(stats) {
  // Verificar últimos 10 intentos
  const recentAttempts = stats.attempts.slice(-10);
  if (recentAttempts.length < 5) return; // Necesitamos al menos 5 intentos
    
  const recentFailures = recentAttempts.filter(a => !a.success).length;
  const failureRate = recentFailures / recentAttempts.length;
    
  // Si más del 50% de los últimos intentos fallaron, notificar
  if (failureRate > 0.5) {
    const lastNotification = localStorage.getItem('email_failure_notification');
    const now = new Date().toISOString();
        
    // Notificar máximo una vez cada hora
    if (!lastNotification || new Date(now) - new Date(lastNotification) > 3600000) {
      showNotification(
        `⚠️ Alerta: ${Math.round(failureRate * 100)}% de los últimos emails han fallado. Verifique la configuración.`,
        'error'
      );
      localStorage.setItem('email_failure_notification', now);
    }
  }
}

/**
 * Obtiene estadísticas resumidas
 */
function getEmailStatsSummary() {
  const stats = getEmailStats();
  const total = stats.totalSent + stats.totalFailed;
  const successRate = total > 0 ? ((stats.totalSent / total) * 100).toFixed(1) : 0;
    
  // Estadísticas de últimos 7 días
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
  const recentAttempts = stats.attempts.filter(a => {
    return new Date(a.timestamp) > sevenDaysAgo;
  });
    
  const recentSent = recentAttempts.filter(a => a.success).length;
  const recentFailed = recentAttempts.filter(a => !a.success).length;
  const recentTotal = recentAttempts.length;
  const recentSuccessRate = recentTotal > 0 ? ((recentSent / recentTotal) * 100).toFixed(1) : 0;
    
  return {
    total: {
      sent: stats.totalSent,
      failed: stats.totalFailed,
      total: total,
      successRate: successRate + '%'
    },
    last7Days: {
      sent: recentSent,
      failed: recentFailed,
      total: recentTotal,
      successRate: recentSuccessRate + '%'
    },
    lastAttempt: stats.lastAttempt,
    lastSuccess: stats.lastSuccess,
    lastFailure: stats.lastFailure
  };
}

/**
 * Limpia las estadísticas antiguas (mantiene solo últimos 30 días)
 */
function cleanOldEmailStats() {
  const stats = getEmailStats();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
  const filteredAttempts = stats.attempts.filter(a => {
    return new Date(a.timestamp) > thirtyDaysAgo;
  });
    
  stats.attempts = filteredAttempts;
  saveEmailStats(stats);
    
  logStatsInfo(`🧹 Estadísticas limpiadas: ${filteredAttempts.length} intentos de los últimos 30 días`);
}

// Limpiar estadísticas antiguas periódicamente
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    setTimeout(cleanOldEmailStats, 5000);
  });
}

// Exportar funciones
if (typeof window !== 'undefined') {
  window.recordEmailAttempt = recordEmailAttempt;
  window.getEmailStats = getEmailStats;
  window.getEmailStatsSummary = getEmailStatsSummary;
  window.cleanOldEmailStats = cleanOldEmailStats;
}

