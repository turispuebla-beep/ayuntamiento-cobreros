/* eslint-env browser */
/* global appointments, getServiceName, formatDate, setupFocusTrap, removeFocusTrap, logAuditAction, recordEmailAttempt, saveAppointments, loadAppointmentsList, loadAppointmentStats, renderAdminCalendar, queueEmail, formatDateForDisplay, getStatusText, escapeHtml */
// ===== MODAL DE CANCELACIÓN DE CITA CON FECHA ALTERNATIVA =====
// Sistema para cancelar citas con opción de fecha alternativa

let currentCancellingAppointment = null;

/**
 * Abre modal para cancelar cita con fecha alternativa
 * @param {string} appointmentId - ID de la cita a cancelar
 */
function openCancelAppointmentModal(appointmentId) {
  const appointment = appointments.find(a => a.id === appointmentId);
  if (!appointment) {
    showNotification('Cita no encontrada', 'error');
    return;
  }
    
  currentCancellingAppointment = appointment;
    
  // Crear o obtener modal
  let modal = document.getElementById('cancelAppointmentModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'cancelAppointmentModal';
    modal.className = 'modal';
    document.body.appendChild(modal);
  }
    
  modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h3>⚠️ Cancelar Cita Previa</h3>
                <span class="close" onclick="closeCancelAppointmentModal()">&times;</span>
            </div>
            <div class="modal-body">
                <div style="margin-bottom: 1rem; padding: 1rem; background: rgba(239, 68, 68, 0.1); border-left: 4px solid var(--error-color); border-radius: 4px;">
                    <p style="margin: 0; color: var(--text-primary);"><strong>Cita a cancelar:</strong></p>
                    <p style="margin: 0.5rem 0 0 0;">
                        <strong>${typeof escapeHtml === 'function' ? escapeHtml(appointment.name) : appointment.name}</strong><br>
                        ${typeof formatDate === 'function' ? formatDate(appointment.date) : appointment.date} a las ${appointment.time}<br>
                        <small>${typeof getServiceName === 'function' ? getServiceName(appointment.service) : appointment.service}</small>
                    </p>
                </div>
                
                <div class="form-group">
                    <label for="cancelReason">Motivo de la cancelación (opcional):</label>
                    <textarea id="cancelReason" rows="3" placeholder="Ej: Cambio de horario, imprevisto, etc." style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 6px; font-family: inherit;"></textarea>
                </div>
                
                <div class="form-group">
                    <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                        <input type="checkbox" id="offerAlternativeDate" onchange="toggleAlternativeDateFields()">
                        <span>Ofrecer fecha alternativa</span>
                    </label>
                </div>
                
                <div id="alternativeDateFields" style="display: none; margin-top: 1rem; padding: 1rem; background: var(--bg-secondary); border-radius: 6px;">
                    <div class="form-group">
                        <label for="alternativeDate">Nueva fecha propuesta:</label>
                        <input type="date" id="alternativeDate" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 6px;">
                    </div>
                    <div class="form-group">
                        <label for="alternativeTime">Nueva hora propuesta:</label>
                        <select id="alternativeTime" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 6px;">
                            <option value="">Seleccione una hora</option>
                            <option value="09:00">09:00</option>
                            <option value="10:00">10:00</option>
                            <option value="11:00">11:00</option>
                            <option value="12:00">12:00</option>
                            <option value="16:00">16:00</option>
                            <option value="17:00">17:00</option>
                            <option value="18:00">18:00</option>
                        </select>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="closeCancelAppointmentModal()">No cancelar</button>
                <button class="btn btn-error" onclick="confirmCancelAppointment()">
                    <i class="fas fa-times"></i> Confirmar cancelación
                </button>
            </div>
        </div>
    `;
    
  modal.style.display = 'block';
    
  // Focus trap
  if (typeof setupFocusTrap === 'function') {
    setupFocusTrap(modal);
  }
    
  // Establecer fecha mínima (mañana)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const alternativeDateInput = document.getElementById('alternativeDate');
  if (alternativeDateInput) {
    alternativeDateInput.min = tomorrow.toISOString().split('T')[0];
  }
}

/**
 * Muestra/oculta campos de fecha alternativa
 */
function toggleAlternativeDateFields() {
  const checkbox = document.getElementById('offerAlternativeDate');
  const fields = document.getElementById('alternativeDateFields');
    
  if (checkbox && fields) {
    fields.style.display = checkbox.checked ? 'block' : 'none';
        
    if (checkbox.checked) {
      // Validar campos cuando se muestran
      const dateInput = document.getElementById('alternativeDate');
      const timeInput = document.getElementById('alternativeTime');
      if (dateInput) dateInput.required = true;
      if (timeInput) timeInput.required = true;
    } else {
      const dateInput = document.getElementById('alternativeDate');
      const timeInput = document.getElementById('alternativeTime');
      if (dateInput) dateInput.required = false;
      if (timeInput) timeInput.required = false;
    }
  }
}

/**
 * Confirma la cancelación de la cita
 */
async function confirmCancelAppointment() {
  if (!currentCancellingAppointment) {
    showNotification('Error: No hay cita seleccionada', 'error');
    return;
  }
    
  const reason = document.getElementById('cancelReason')?.value || '';
  const offerAlternative = document.getElementById('offerAlternativeDate')?.checked || false;
  const alternativeDate = document.getElementById('alternativeDate')?.value || '';
  const alternativeTime = document.getElementById('alternativeTime')?.value || '';
    
  // Validar fecha alternativa si está marcada
  if (offerAlternative) {
    if (!alternativeDate || !alternativeTime) {
      showNotification('Por favor, complete la fecha y hora alternativa', 'error');
      return;
    }
  }
    
  // Cambiar estado a cancelled
  const appointment = currentCancellingAppointment;
  appointment.status = 'cancelled';
  appointment.updatedAt = new Date().toISOString();
  appointment.cancellationReason = reason;
    
  // Agregar fecha alternativa si se proporcionó
  if (offerAlternative && alternativeDate && alternativeTime) {
    appointment.alternativeDate = alternativeDate;
    appointment.alternativeTime = alternativeTime;
  }
    
  // Registrar acción en log de auditoría
  if (typeof logAuditAction === 'function') {
    logAuditAction('APPOINTMENT_CANCELLED', {
      appointmentId: appointment.id,
      appointmentName: appointment.name,
      appointmentDate: appointment.date,
      appointmentTime: appointment.time,
      reason: reason,
      hasAlternativeDate: offerAlternative && alternativeDate && alternativeTime
    });
  }
    
  // Enviar email con información de cancelación y fecha alternativa
  const emailResult = await sendCancellationEmail(appointment, reason, offerAlternative ? {
    date: alternativeDate,
    time: alternativeTime
  } : null);
  
  // Enviar notificación push al usuario (si tiene token FCM y consentimiento)
  if (typeof enviarNotificacionPushAUsuario === 'function' && appointment.email) {
    try {
      const serviceName = typeof getServiceName === 'function' ? getServiceName(appointment.service) : appointment.service;
      const dateFormatted = typeof formatDateForDisplay === 'function' 
        ? formatDateForDisplay(appointment.date) 
        : (typeof formatDate === 'function' ? formatDate(appointment.date) : appointment.date);
      
      let mensajePush = `Su cita para ${serviceName} del ${dateFormatted} ha sido cancelada.`;
      
      if (reason) {
        mensajePush += ` Motivo: ${reason}`;
      }
      
      if (offerAlternative && alternativeDate && alternativeTime && alternativeDate.date) {
        const altDateFormatted = typeof formatDateForDisplay === 'function' 
          ? formatDateForDisplay(alternativeDate.date) 
          : (alternativeDate.date || alternativeDate);
        mensajePush += ` Le proponemos una nueva fecha: ${altDateFormatted} a las ${alternativeTime}. Por favor, confirme si le resulta conveniente.`;
      } else {
        mensajePush += ' Si desea reagendar su cita, por favor contacte con nosotros.';
      }
      
      await enviarNotificacionPushAUsuario(
        appointment.email,
        'Cita Cancelada - Ayuntamiento de Cobreros',
        mensajePush,
        'cita'
      );
    } catch (pushError) {
      console.warn('No se pudo enviar notificación push al usuario:', pushError);
      // No fallar si no se puede enviar push, el email ya se envió
    }
  }
  
  // Registrar intento de email
  if (typeof recordEmailAttempt === 'function' && emailResult) {
    recordEmailAttempt({
      to: appointment.email,
      subject: 'Cancelación de Cita Previa - Ayuntamiento de Cobreros',
      template: 'appointment_status_change'
    }, emailResult.success, emailResult.error);
  }
    
  // Guardar cambios
  saveAppointments();
  loadAppointmentsList();
  loadAppointmentStats();
  if (typeof syncCalendars === 'function') {
    syncCalendars(); // Sincronizar ambos calendarios
  }
    
  // Cerrar modal
  closeCancelAppointmentModal();
    
  // Mostrar mensaje según resultado del email
  if (emailResult.success) {
    showNotification('Cita cancelada correctamente. Se ha enviado un email al usuario.', 'success');
  } else if (emailResult.queued) {
    showNotification('Cita cancelada correctamente. El email se enviará automáticamente cuando sea posible.', 'warning');
  } else {
    showNotification('Cita cancelada correctamente. No se pudo enviar el email, pero se intentará más tarde.', 'warning');
  }
}

/**
 * Cierra el modal de cancelación
 */
function closeCancelAppointmentModal() {
  const modal = document.getElementById('cancelAppointmentModal');
  if (modal) {
    modal.style.display = 'none';
    if (typeof removeFocusTrap === 'function') {
      removeFocusTrap(modal);
    }
  }
  currentCancellingAppointment = null;
}

/**
 * Envía email de cancelación con fecha alternativa
 */
async function sendCancellationEmail(appointment, reason, alternativeDate = null) {
  try {
    // Formatear fechas de forma segura
    const safeFormatDate = (date) => {
      if (typeof formatDateForDisplay === 'function') {
        return formatDateForDisplay(date);
      }
      if (typeof formatDate === 'function') {
        return formatDate(date);
      }
      return date;
    };
    
    const safeServiceName = (service) => {
      if (typeof getServiceName === 'function') {
        return getServiceName(service);
      }
      return service || 'Trámite municipal';
    };
    
    const appointmentDate = safeFormatDate(appointment.date);
    const altDateFormatted = alternativeDate?.date ? safeFormatDate(alternativeDate.date) : null;
    
    // Generar HTML profesional del email de cancelación
    const emailHtml = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc;">
        <!-- Cabecera -->
        <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; text-align: center;">
          <div style="font-size: 48px; margin-bottom: 10px;">❌</div>
          <h1 style="margin: 0; font-size: 22px;">Cita Cancelada</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9; font-size: 14px;">Ayuntamiento de Cobreros</p>
        </div>
        
        <!-- Contenido principal -->
        <div style="padding: 30px; background: white;">
          <p style="font-size: 16px; color: #334155;">Hola <strong>${appointment.name}</strong>,</p>
          <p style="color: #64748b;">Lamentamos informarle que su cita previa ha sido <strong style="color: #ef4444;">cancelada</strong>.</p>
          
          ${reason ? `
          <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <p style="margin: 0; color: #92400e;"><strong>📝 Motivo de la cancelación:</strong></p>
            <p style="margin: 8px 0 0 0; color: #78350f;">${reason}</p>
          </div>
          ` : ''}
          
          <!-- Detalles de la cita cancelada -->
          <div style="background: #fef2f2; padding: 20px; border-radius: 12px; margin: 20px 0; border-left: 4px solid #ef4444;">
            <h3 style="margin: 0 0 15px 0; color: #991b1b;">📋 Cita que ha sido cancelada</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0; color: #64748b;">Servicio:</td><td style="padding: 8px 0; font-weight: 600; color: #334155;">${safeServiceName(appointment.service)}</td></tr>
              <tr><td style="padding: 8px 0; color: #64748b;">Fecha:</td><td style="padding: 8px 0; font-weight: 600; color: #334155; text-decoration: line-through;">📅 ${appointmentDate}</td></tr>
              <tr><td style="padding: 8px 0; color: #64748b;">Hora:</td><td style="padding: 8px 0; font-weight: 600; color: #334155; text-decoration: line-through;">🕐 ${appointment.time}</td></tr>
            </table>
          </div>
          
          ${alternativeDate && altDateFormatted ? `
          <!-- Fecha alternativa propuesta -->
          <div style="background: #dbeafe; padding: 20px; border-radius: 12px; margin: 20px 0; border-left: 4px solid #3b82f6;">
            <h3 style="margin: 0 0 15px 0; color: #1e40af;">✨ Le proponemos una nueva fecha</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0; color: #64748b;">Nueva fecha:</td><td style="padding: 8px 0; font-weight: 700; color: #1e3a8a;">📅 ${altDateFormatted}</td></tr>
              <tr><td style="padding: 8px 0; color: #64748b;">Nueva hora:</td><td style="padding: 8px 0; font-weight: 700; color: #1e3a8a;">🕐 ${alternativeDate.time}</td></tr>
            </table>
            <p style="margin: 15px 0 0 0; color: #3b82f6; font-size: 14px;">
              📞 Por favor, confirme si esta nueva fecha le resulta conveniente contactándonos.
            </p>
          </div>
          ` : `
          <div style="background: #f1f5f9; padding: 20px; border-radius: 12px; margin: 20px 0;">
            <p style="margin: 0; color: #64748b; text-align: center;">
              Si desea solicitar una <strong>nueva cita</strong>, puede hacerlo a través de nuestra web<br>
              o contactándonos directamente.
            </p>
          </div>
          `}
        </div>
        
        <!-- Contacto -->
        <div style="padding: 20px 30px; background: #f1f5f9; text-align: center;">
          <p style="margin: 0; color: #64748b; font-size: 14px;">
            ¿Tiene alguna pregunta? Contáctenos:<br>
            📞 980 62 26 18 | 📧 aytocobreros@gmail.com
          </p>
        </div>
        
        <!-- Pie de página -->
        <div style="background: #1e293b; color: white; padding: 20px; text-align: center;">
          <p style="margin: 0; font-size: 14px;"><strong>Ayuntamiento de Cobreros</strong></p>
          <p style="margin: 8px 0 0 0; font-size: 12px; opacity: 0.7;">
            Calle Principal, s/n · 49395 Cobreros (Zamora)<br>
            Horario: Lunes a Viernes de 9:00 a 14:00
          </p>
        </div>
      </div>
    `;
        
    // Verificar que CLOUD_FUNCTIONS_BASE_URL esté definido (o usar URL hardcodeada como fallback)
    const cloudFunctionsUrl = typeof CLOUD_FUNCTIONS_BASE_URL !== 'undefined' 
      ? CLOUD_FUNCTIONS_BASE_URL 
      : 'https://us-central1-turisteam-80f1b.cloudfunctions.net';
    
    if (!cloudFunctionsUrl) {
      console.error('❌ URL de Cloud Functions no está definida');
      return { success: false, error: 'URL de Cloud Functions no definida' };
    }

    // Configurar timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos

    let response;
    try {
      response = await fetch(`${cloudFunctionsUrl}/sendEmail`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: appointment.email,
          from: 'u2389387944@gmail.com',
          fromName: 'Ayuntamiento de Cobreros',
          subject: `❌ Cita Cancelada - Ayuntamiento de Cobreros`,
          html: emailHtml,
          template: 'appointment_status_change',
          data: {
            name: appointment.name,
            oldStatus: typeof getStatusText === 'function' ? getStatusText(appointment.status === 'cancelled' ? 'confirmed' : appointment.status) : 'Confirmada',
            newStatus: 'Cancelada',
            service: safeServiceName(appointment.service),
            date: appointmentDate,
            time: appointment.time,
            dni: appointment.dni,
            email: appointment.email,
            phone: appointment.phone,
            reason: reason || null,
            alternativeDate: altDateFormatted,
            alternativeTime: alternativeDate?.time || null,
            // Información del ayuntamiento
            ayuntamiento: {
              nombre: 'Ayuntamiento de Cobreros',
              direccion: 'Calle Principal, s/n',
              codigoPostal: '49395',
              localidad: 'Cobreros',
              provincia: 'Zamora',
              telefono: '980 62 26 18',
              email: 'aytocobreros@gmail.com',
              horario: 'Lunes a Viernes de 9:00 a 14:00'
            }
          }
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.error(`❌ Timeout enviando email de cancelación a ${appointment.email} (más de 10 segundos)`);
      } else {
        console.error(`❌ Error de red enviando email de cancelación a ${appointment.email}:`, fetchError);
      }
      return { success: false, error: fetchError.message || 'Error de red' };
    }

    // Validar respuesta HTTP
    if (!response.ok) {
      console.error(`❌ Error HTTP ${response.status} enviando email de cancelación a ${appointment.email}`);
      return { success: false, error: `HTTP ${response.status}` };
    }

    // Parsear respuesta JSON con manejo de errores
    let result;
    try {
      result = await response.json();
    } catch (jsonError) {
      console.error(`❌ Error parseando respuesta JSON para ${appointment.email}:`, jsonError);
      return { success: false, error: 'Error parseando respuesta' };
    }
    if (result.success) {
      if (window && window.Logger && typeof window.Logger.log === 'function') {
        window.Logger.log('✅ Email de cancelación enviado:', result.messageId);
      }
      return { success: true, messageId: result.messageId };
    } else {
      if (window && window.Logger && typeof window.Logger.error === 'function') {
        window.Logger.error('❌ Error al enviar email:', result.error);
      }
      // Agregar a cola para reintento si está disponible
      if (typeof queueEmail === 'function') {
        queueEmail({
          to: appointment.email,
          from: 'u2389387944@gmail.com',
          fromName: 'Avisos Ayto Cobreros',
          subject: 'Cancelación de Cita Previa - Ayuntamiento de Cobreros',
          template: 'appointment_status_change',
          data: {
            name: appointment.name,
            oldStatus: typeof getStatusText === 'function' ? getStatusText(appointment.status === 'cancelled' ? 'confirmed' : appointment.status) : 'Confirmada',
            newStatus: 'Cancelada',
            service: typeof getServiceName === 'function' ? getServiceName(appointment.service) : appointment.service,
            date: typeof formatDate === 'function' ? formatDate(appointment.date) : appointment.date,
            time: appointment.time,
            dni: appointment.dni,
            email: appointment.email,
            phone: appointment.phone,
            message: message,
            alternativeDate: alternativeDate && typeof formatDateForDisplay === 'function' 
              ? formatDateForDisplay(alternativeDate.date) 
              : (alternativeDate ? alternativeDate.date : null),
            alternativeTime: alternativeDate ? alternativeDate.time : null
          }
        });
      }
      return { success: false, error: result.error, queued: typeof queueEmail === 'function' };
    }
  } catch (error) {
    if (window && window.Logger && typeof window.Logger.error === 'function') {
      window.Logger.error('❌ Error al enviar email de cancelación:', error);
    }
    // Agregar a cola para reintento si está disponible
    if (typeof queueEmail === 'function') {
      queueEmail({
        to: appointment.email,
        from: 'u2389387944@gmail.com',
        subject: 'Cancelación de Cita Previa - Ayuntamiento de Cobreros',
        template: 'appointment_status_change',
        data: {
          name: appointment.name,
          oldStatus: typeof getStatusText === 'function' ? getStatusText(appointment.status === 'cancelled' ? 'confirmed' : appointment.status) : 'Confirmada',
          newStatus: 'Cancelada',
          service: typeof getServiceName === 'function' ? getServiceName(appointment.service) : appointment.service,
          date: typeof formatDate === 'function' ? formatDate(appointment.date) : appointment.date,
          time: appointment.time,
          dni: appointment.dni,
          email: appointment.email,
          phone: appointment.phone,
          message: message,
          alternativeDate: alternativeDate && typeof formatDateForDisplay === 'function' 
            ? formatDateForDisplay(alternativeDate.date) 
            : (alternativeDate ? alternativeDate.date : null),
          alternativeTime: alternativeDate ? alternativeDate.time : null
        }
      });
    }
    return { success: false, error: error.message, queued: typeof queueEmail === 'function' };
  }
}

// Exportar funciones
if (typeof window !== 'undefined') {
  window.openCancelAppointmentModal = openCancelAppointmentModal;
  window.closeCancelAppointmentModal = closeCancelAppointmentModal;
  window.confirmCancelAppointment = confirmCancelAppointment;
  window.toggleAlternativeDateFields = toggleAlternativeDateFields;
}

