/* eslint-env browser */
/* global appointments:writable, showConfirmation, saveAppointments, loadAppointmentsList, loadAppointmentStats, renderAdminCalendar */
// ===== SISTEMA DE EXPORTAR/IMPORTAR CITAS (BACKUP MANUAL) =====
// Permite al administrador hacer backups manuales y restaurar datos

/**
 * Exporta todas las citas a un archivo JSON
 */
function exportAppointments() {
  try {
    const appointmentsData = {
      version: '2.3',
      exportDate: new Date().toISOString(),
      totalAppointments: appointments.length,
      appointments: appointments.map(apt => ({
        id: apt.id,
        name: apt.name,
        dni: apt.dni,
        email: apt.email,
        phone: apt.phone,
        service: apt.service,
        date: apt.date,
        time: apt.time,
        status: apt.status,
        comments: apt.comments || '',
        createdAt: apt.createdAt,
        updatedAt: apt.updatedAt,
        completedAt: apt.completedAt || null,
        noShowAt: apt.noShowAt || null,
        cancellationReason: apt.cancellationReason || null,
        alternativeDate: apt.alternativeDate || null,
        alternativeTime: apt.alternativeTime || null
      }))
    };
        
    const jsonString = JSON.stringify(appointmentsData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `citas-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
        
    showNotification('✅ Citas exportadas correctamente', 'success');
    if (window && window.Logger && typeof window.Logger.log === 'function') {
      window.Logger.log(`📥 Exportadas ${appointments.length} citas`);
    }
  } catch (error) {
    if (window && window.Logger && typeof window.Logger.error === 'function') {
      window.Logger.error('❌ Error exportando citas:', error);
    }
    showNotification('Error al exportar citas', 'error');
  }
}

/**
 * Importa citas desde un archivo JSON
 */
function importAppointments() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
        
    try {
      const text = await file.text();
      const data = JSON.parse(text);
            
      // Validar estructura
      if (!data.appointments || !Array.isArray(data.appointments)) {
        showNotification('El archivo no tiene el formato correcto', 'error');
        return;
      }
            
      // Confirmar importación
      if (typeof showConfirmation === 'function') {
        const confirmed = await showConfirmation(
          '¿Importar citas?',
          `Se importarán ${data.appointments.length} citas. Las citas existentes se mantendrán.`,
          'warning'
        );
        if (!confirmed) return;
      } else {
        if (!confirm(`¿Importar ${data.appointments.length} citas? Las citas existentes se mantendrán.`)) {
          return;
        }
      }
            
      // Validar y agregar citas
      let imported = 0;
      let skipped = 0;
            
      data.appointments.forEach(apt => {
        // Validar campos requeridos
        if (!apt.id || !apt.name || !apt.email || !apt.date || !apt.time || !apt.status) {
          skipped++;
          return;
        }
                
        // Verificar si ya existe
        const exists = appointments.find(a => a.id === apt.id);
        if (exists) {
          skipped++;
          return;
        }
                
        // Agregar cita
        appointments.push({
          id: apt.id,
          name: apt.name,
          dni: apt.dni || '',
          email: apt.email,
          phone: apt.phone || '',
          service: apt.service || 'otros',
          date: apt.date,
          time: apt.time,
          status: apt.status,
          comments: apt.comments || '',
          createdAt: apt.createdAt || new Date().toISOString(),
          updatedAt: apt.updatedAt || new Date().toISOString(),
          completedAt: apt.completedAt || null,
          noShowAt: apt.noShowAt || null,
          cancellationReason: apt.cancellationReason || null,
          alternativeDate: apt.alternativeDate || null,
          alternativeTime: apt.alternativeTime || null
        });
        imported++;
      });
            
      // Guardar
      saveAppointments();
      loadAppointmentsList();
      loadAppointmentStats();
      if (typeof renderAdminCalendar === 'function') {
        renderAdminCalendar();
      }
            
      showNotification(`✅ Importadas ${imported} citas. ${skipped} omitidas (duplicadas o inválidas).`, 'success');
      if (window && window.Logger && typeof window.Logger.log === 'function') {
        window.Logger.log(`📤 Importadas ${imported} citas, ${skipped} omitidas`);
      }
    } catch (error) {
      if (window && window.Logger && typeof window.Logger.error === 'function') {
        window.Logger.error('❌ Error importando citas:', error);
      }
      showNotification('Error al importar citas. Verifique que el archivo sea válido.', 'error');
    }
  };
    
  input.click();
}

/**
 * Limpia todas las citas (con confirmación)
 */
async function clearAllAppointments() {
  if (typeof showConfirmation === 'function') {
    const confirmed = await showConfirmation(
      '⚠️ ¿Eliminar TODAS las citas?',
      `Esta acción eliminará ${appointments.length} citas permanentemente. Esta acción NO se puede deshacer.`,
      'error'
    );
    if (!confirmed) return;
  } else {
    if (!confirm(`⚠️ ¿Eliminar TODAS las ${appointments.length} citas? Esta acción NO se puede deshacer.`)) {
      return;
    }
  }
    
  // Crear backup antes de eliminar
  exportAppointments();
    
  // Esperar un momento para que se descargue el backup
  await new Promise(resolve => setTimeout(resolve, 1000));
    
  appointments = [];
  saveAppointments();
  loadAppointmentsList();
  loadAppointmentStats();
  if (typeof renderAdminCalendar === 'function') {
    renderAdminCalendar();
  }
    
  showNotification('✅ Todas las citas han sido eliminadas. Se ha creado un backup automático.', 'success');
}

// Exportar funciones
if (typeof window !== 'undefined') {
  window.exportAppointments = exportAppointments;
  window.importAppointments = importAppointments;
  window.clearAllAppointments = clearAllAppointments;
}

