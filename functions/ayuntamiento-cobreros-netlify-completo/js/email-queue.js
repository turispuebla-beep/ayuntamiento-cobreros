/* eslint-env browser */
/* global recordEmailAttempt */
// ===== SISTEMA DE COLA DE EMAILS CON REINTENTOS =====
// Maneja emails fallidos y los reintenta automáticamente

const EMAIL_QUEUE_KEY = 'email_queue';
const MAX_RETRIES = 3;
const RETRY_DELAY = 5000; // 5 segundos

function queueLogInfo(...args) {
  if (typeof window !== 'undefined' && window.Logger && typeof window.Logger.log === 'function') {
    window.Logger.log(...args);
  }
}

function queueLogWarn(...args) {
  if (typeof window !== 'undefined' && window.Logger && typeof window.Logger.warn === 'function') {
    window.Logger.warn(...args);
  }
}

function queueLogError(...args) {
  if (typeof window !== 'undefined' && window.Logger && typeof window.Logger.error === 'function') {
    window.Logger.error(...args);
  }
}

/**
 * Agrega un email a la cola para reintento
 */
function queueEmail(emailData) {
  try {
    const queue = getEmailQueue();
    queue.push({
      ...emailData,
      attempts: 0,
      lastAttempt: null,
      queuedAt: new Date().toISOString()
    });
    saveEmailQueue(queue);
    queueLogInfo('📧 Email agregado a la cola de reintentos');
        
    // Intentar enviar inmediatamente
    processEmailQueue();
  } catch (error) {
    queueLogError('❌ Error agregando email a la cola:', error);
  }
}

/**
 * Obtiene la cola de emails pendientes
 */
function getEmailQueue() {
  try {
    const saved = localStorage.getItem(EMAIL_QUEUE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    queueLogError('❌ Error obteniendo cola de emails:', error);
    return [];
  }
}

/**
 * Guarda la cola de emails
 */
function saveEmailQueue(queue) {
  try {
    // Limpiar emails muy antiguos (más de 7 días)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
    const filteredQueue = queue.filter(email => {
      const queuedDate = new Date(email.queuedAt);
      return queuedDate > sevenDaysAgo;
    });
        
    localStorage.setItem(EMAIL_QUEUE_KEY, JSON.stringify(filteredQueue));
  } catch (error) {
    queueLogError('❌ Error guardando cola de emails:', error);
  }
}

/**
 * Procesa la cola de emails pendientes
 */
async function processEmailQueue() {
  const queue = getEmailQueue();
  if (queue.length === 0) {
    return;
  }
    
  queueLogInfo(`📧 Procesando ${queue.length} emails en cola...`);
    
  const updatedQueue = [];
    
  for (const emailData of queue) {
    // Saltar si ya se intentó recientemente (menos de 5 segundos)
    if (emailData.lastAttempt) {
      const lastAttempt = new Date(emailData.lastAttempt);
      const now = new Date();
      if (now - lastAttempt < RETRY_DELAY) {
        updatedQueue.push(emailData);
        continue;
      }
    }
        
    // Saltar si ya se intentó demasiadas veces
    if (emailData.attempts >= MAX_RETRIES) {
      queueLogWarn(`⚠️ Email descartado después de ${MAX_RETRIES} intentos:`, emailData.subject);
      // Opcional: Notificar al admin sobre emails fallidos
      continue;
    }
        
    // Intentar enviar
    emailData.attempts++;
    emailData.lastAttempt = new Date().toISOString();
        
    try {
      const response = await fetch('https://us-central1-turisteam-80f1b.cloudfunctions.net/sendEmail', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: emailData.to,
          from: emailData.from,
          subject: emailData.subject,
          template: emailData.template,
          data: emailData.data
        })
      });
            
      const result = await response.json();
            
      if (result.success) {
        queueLogInfo(`✅ Email enviado desde cola: ${emailData.subject}`);
                
        // Registrar éxito en estadísticas
        if (typeof recordEmailAttempt === 'function') {
          recordEmailAttempt(emailData, true);
        }
                
        // No agregar a la cola actualizada (éxito)
      } else {
        queueLogWarn(`⚠️ Email falló, reintentando más tarde: ${emailData.subject}`);
                
        // Registrar fallo en estadísticas
        if (typeof recordEmailAttempt === 'function') {
          recordEmailAttempt(emailData, false, result.error);
        }
                
        updatedQueue.push(emailData);
      }
    } catch (error) {
      queueLogWarn('⚠️ Error enviando email, reintentando más tarde:', error);
            
      // Registrar fallo en estadísticas
      if (typeof recordEmailAttempt === 'function') {
        recordEmailAttempt(emailData, false, error.message);
      }
            
      updatedQueue.push(emailData);
    }
  }
    
  saveEmailQueue(updatedQueue);
    
  if (updatedQueue.length > 0) {
    queueLogInfo(`📧 ${updatedQueue.length} emails pendientes en cola`);
  }
}

/**
 * Envía email con manejo de errores y cola de reintentos
 */
async function sendEmailWithRetry(emailData) {
  try {
    const response = await fetch('https://us-central1-turisteam-80f1b.cloudfunctions.net/sendEmail', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailData)
    });
        
    const result = await response.json();
        
    if (result.success) {
      // Registrar éxito en estadísticas
      if (typeof recordEmailAttempt === 'function') {
        recordEmailAttempt(emailData, true);
      }
      return { success: true, messageId: result.messageId };
    } else {
      // Registrar fallo en estadísticas
      if (typeof recordEmailAttempt === 'function') {
        recordEmailAttempt(emailData, false, result.error);
      }
      // Agregar a cola para reintento
      queueEmail(emailData);
      return { success: false, error: result.error, queued: true };
    }
  } catch (error) {
    // Registrar fallo en estadísticas
    if (typeof recordEmailAttempt === 'function') {
      recordEmailAttempt(emailData, false, error.message);
    }
    // Agregar a cola para reintento
    queueEmail(emailData);
    return { success: false, error: error.message, queued: true };
  }
}

/**
 * Limpia la cola de emails
 */
function clearEmailQueue() {
  localStorage.removeItem(EMAIL_QUEUE_KEY);
  queueLogInfo('🧹 Cola de emails limpiada');
}

/**
 * Obtiene estadísticas de la cola
 */
function getEmailQueueStats() {
  const queue = getEmailQueue();
  return {
    pending: queue.length,
    maxRetries: MAX_RETRIES,
    oldestEmail: queue.length > 0 ? queue[0].queuedAt : null
  };
}

// Procesar cola periódicamente (cada 30 segundos)
if (typeof window !== 'undefined') {
  // Procesar al cargar
  window.addEventListener('load', () => {
    setTimeout(processEmailQueue, 5000); // Esperar 5 segundos después de cargar
  });
    
  // Procesar periódicamente
  setInterval(processEmailQueue, 30000); // Cada 30 segundos
    
  // Procesar cuando vuelve a estar online
  window.addEventListener('online', () => {
    queueLogInfo('🌐 Conexión restaurada, procesando cola de emails...');
    processEmailQueue();
  });
}

// Exportar funciones
if (typeof window !== 'undefined') {
  window.queueEmail = queueEmail;
  window.processEmailQueue = processEmailQueue;
  window.sendEmailWithRetry = sendEmailWithRetry;
  window.clearEmailQueue = clearEmailQueue;
  window.getEmailQueueStats = getEmailQueueStats;
}

