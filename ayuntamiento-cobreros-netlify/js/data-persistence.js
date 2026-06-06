/* eslint-env browser */
// ===== SISTEMA DE PERSISTENCIA Y VERSIÓN DE DATOS =====
// Garantiza que los datos se mantengan al actualizar el proyecto

const DATA_VERSION = '2.3'; // Versión actual de la estructura de datos
const STORAGE_KEY_VERSION = 'app_data_version';

function logInfo(...args) {
  if (typeof window !== 'undefined' && window.Logger && typeof window.Logger.log === 'function') {
    window.Logger.log(...args);
  }
}

function logWarn(...args) {
  if (typeof window !== 'undefined' && window.Logger && typeof window.Logger.warn === 'function') {
    window.Logger.warn(...args);
  }
}

function logError(...args) {
  if (typeof window !== 'undefined' && window.Logger && typeof window.Logger.error === 'function') {
    window.Logger.error(...args);
  }
}

/**
 * Verifica y migra datos si es necesario al actualizar el proyecto
 */
function checkDataVersion() {
  const savedVersion = localStorage.getItem(STORAGE_KEY_VERSION);
    
  if (!savedVersion) {
    // Primera vez que se ejecuta, guardar versión actual
    localStorage.setItem(STORAGE_KEY_VERSION, DATA_VERSION);
    logInfo(`✅ Versión de datos inicializada: ${DATA_VERSION}`);
    return;
  }
    
  if (savedVersion !== DATA_VERSION) {
    logInfo(`🔄 Actualización detectada: ${savedVersion} → ${DATA_VERSION}`);
        
    // Migrar datos si es necesario
    migrateDataIfNeeded(savedVersion, DATA_VERSION);
        
    // Actualizar versión guardada
    localStorage.setItem(STORAGE_KEY_VERSION, DATA_VERSION);
    logInfo(`✅ Versión de datos actualizada a: ${DATA_VERSION}`);
  } else {
    logInfo(`✅ Versión de datos correcta: ${DATA_VERSION}`);
  }
}

/**
 * Migra datos entre versiones si es necesario
 */
function migrateDataIfNeeded(oldVersion, newVersion) {
  logInfo(`🔄 Iniciando migración de datos de ${oldVersion} a ${newVersion}`);
    
  try {
    // Migrar citas previas si es necesario
    migrateAppointmentsData(oldVersion, newVersion);
        
    // Migrar otros datos si es necesario en el futuro
    // migrateOtherData(oldVersion, newVersion);
        
    logInfo('✅ Migración de datos completada');
  } catch (error) {
    logError('❌ Error en migración de datos:', error);
    // No fallar si la migración tiene problemas, los datos se mantienen
  }
}

/**
 * Migra datos de citas previas entre versiones
 */
function migrateAppointmentsData(oldVersion, newVersion) {
  const savedAppointments = localStorage.getItem('appointments');
  if (!savedAppointments) {
    return; // No hay datos que migrar
  }
    
  try {
    let appointments = JSON.parse(savedAppointments);
    let needsSave = false;
        
    // Migración para versión 2.3: Asegurar campos nuevos
    if (oldVersion < '2.3' || !oldVersion) {
      appointments = appointments.map(apt => {
        const original = { ...apt };
                
        // Agregar campos nuevos si no existen
        if (!apt.completedAt && apt.status === 'completed') {
          apt.completedAt = apt.updatedAt || new Date().toISOString();
          needsSave = true;
        }
                
        if (!apt.noShowAt && apt.status === 'no_show') {
          apt.noShowAt = apt.updatedAt || new Date().toISOString();
          needsSave = true;
        }
                
        if (!apt.cancellationReason && apt.status === 'cancelled') {
          apt.cancellationReason = '';
          needsSave = true;
        }
                
        if (!apt.alternativeDate && apt.alternativeDate !== undefined) {
          // Solo agregar si realmente no existe (undefined es válido)
          if (apt.alternativeDate === undefined) {
            // No hacer nada, undefined es válido
          }
        }
                
        // Asegurar que todos los campos requeridos estén presentes
        if (!apt.id) {
          apt.id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
          needsSave = true;
        }
                
        if (!apt.status) {
          apt.status = 'pending';
          needsSave = true;
        }
                
        if (!apt.createdAt) {
          apt.createdAt = new Date().toISOString();
          needsSave = true;
        }
                
        if (!apt.updatedAt) {
          apt.updatedAt = new Date().toISOString();
          needsSave = true;
        }
                
        return apt;
      });
            
      if (needsSave) {
        localStorage.setItem('appointments', JSON.stringify(appointments));
        logInfo(`✅ Citas migradas a versión ${newVersion}`);
      }
    }
        
  } catch (error) {
    logError('❌ Error migrando citas:', error);
    // No fallar, mantener datos originales
  }
}

/**
 * Verifica integridad de datos y repara si es necesario
 */
function verifyDataIntegrity() {
  try {
    // Verificar citas
    const savedAppointments = localStorage.getItem('appointments');
    if (savedAppointments) {
      const appointments = JSON.parse(savedAppointments);
            
      // Validar que todas las citas tengan estructura correcta
      const validAppointments = appointments.filter(apt => {
        return apt && 
                       typeof apt === 'object' && 
                       apt.id && 
                       apt.status;
      });
            
      if (validAppointments.length !== appointments.length) {
        logWarn(`⚠️ Se encontraron ${appointments.length - validAppointments.length} citas inválidas, corrigiendo...`);
        localStorage.setItem('appointments', JSON.stringify(validAppointments));
      }
    }
        
    logInfo('✅ Integridad de datos verificada');
  } catch (error) {
    logError('❌ Error verificando integridad:', error);
  }
}

/**
 * Crea backup de datos antes de actualizaciones importantes
 */
function createDataBackup() {
  try {
    const backup = {
      timestamp: new Date().toISOString(),
      version: DATA_VERSION,
      appointments: localStorage.getItem('appointments'),
      users: localStorage.getItem('users'),
      news: localStorage.getItem('news'),
      bandos: localStorage.getItem('bandos'),
      appointmentSettings: localStorage.getItem('appointmentSettings')
    };
        
    localStorage.setItem('data_backup_' + Date.now(), JSON.stringify(backup));
        
    // Limpiar backups antiguos (mantener solo los últimos 5)
    const backupKeys = Object.keys(localStorage).filter(key => key.startsWith('data_backup_'));
    if (backupKeys.length > 5) {
      backupKeys.sort().slice(0, backupKeys.length - 5).forEach(key => {
        localStorage.removeItem(key);
      });
    }
        
    logInfo('✅ Backup de datos creado');
  } catch (error) {
    logError('❌ Error creando backup:', error);
  }
}

// Exportar funciones
if (typeof window !== 'undefined') {
  window.checkDataVersion = checkDataVersion;
  window.verifyDataIntegrity = verifyDataIntegrity;
  window.createDataBackup = createDataBackup;
}

