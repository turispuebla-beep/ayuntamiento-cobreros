/* eslint-env browser */
/**
 * Servicio auxiliar para gestionar citas previas desde cualquier módulo.
 * Centraliza el guardado en Firestore y el envío de emails/alertas.
 */
(function() {
    class AppointmentService {
        constructor() {
            this.collectionName = 'appointments';
        }

        async persist(appointmentData) {
            if (!window.FirebaseUtils || !appointmentData) {
                return null;
            }

            try {
                const payload = {
                    ...appointmentData,
                    id: appointmentData.id || `appt_${Date.now()}`,
                    createdAt: appointmentData.createdAt || new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };

                if (payload.id) {
                    await window.FirebaseUtils.create(this.collectionName, payload);
                }

                return payload;
            } catch (error) {
                console.error('Error guardando cita en Firestore:', error);
                return null;
            }
        }

        async sendConfirmation(appointmentData) {
            if (window.emailService && appointmentData?.email) {
                try {
                    await window.emailService.sendAppointmentConfirmation(appointmentData.email, appointmentData);
                } catch (error) {
                    console.warn('No se pudo enviar la confirmación de cita:', error);
                }
            }
        }

        async sendAdminAlert(appointmentData) {
            if (window.emailService) {
                try {
                    await window.emailService.sendAdminAlert(appointmentData);
                } catch (error) {
                    console.warn('No se pudo enviar la alerta al ayuntamiento:', error);
                }
            }
        }
    }

    window.appointmentService = new AppointmentService();
})();




