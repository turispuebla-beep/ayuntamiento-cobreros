/* eslint-env browser */
/**
 * Email Service centralizado para el Ayuntamiento de Cobreros
 * - Prioriza Firebase Cloud Functions
 * - Fallback opcional a endpoint personalizado o EmailJS
 * - Último recurso: cola local (email-queue.js)
 */
(function() {
    function safeServiceName(service) {
        if (typeof getServiceName === 'function') {
            try {
                return getServiceName(service);
            } catch (error) {
                console.warn('getServiceName no disponible:', error);
            }
        }
        return service || 'Trámite municipal';
    }

    function safeFormatDate(dateValue) {
        if (!dateValue) {
            return '';
        }
        if (typeof formatDateForDisplay === 'function') {
            try {
                return formatDateForDisplay(dateValue);
            } catch (error) {
                console.warn('formatDateForDisplay no disponible:', error);
            }
        }
        return dateValue;
    }

    class EmailService {
        constructor() {
            this.senderEmail = 'u2389387944@gmail.com';
            this.senderName = 'Avisos Ayto Cobreros';
            this.useCloudFunctions = true;
            this.cloudFunctionsBaseUrl = typeof CLOUD_FUNCTIONS_BASE_URL === 'string'
                ? CLOUD_FUNCTIONS_BASE_URL
                : 'https://us-central1-turisteam-80f1b.cloudfunctions.net';
            this.emailEndpoint = null;

            // Configuración opcional para EmailJS
            this.emailjsServiceId = 'YOUR_SERVICE_ID';
            this.emailjsTemplateId = 'YOUR_TEMPLATE_ID';
            this.emailjsPublicKey = 'YOUR_PUBLIC_KEY';

            if (typeof emailjs !== 'undefined' && this.emailjsPublicKey !== 'YOUR_PUBLIC_KEY') {
                try {
                    emailjs.init(this.emailjsPublicKey);
                    console.log('✅ EmailJS inicializado');
                } catch (error) {
                    console.warn('No se pudo inicializar EmailJS:', error);
                }
            }
        }

        async sendEmail(toEmail, subject, htmlBody, options = {}) {
            const payload = {
                to: toEmail,
                subject,
                html: htmlBody,
                template: options.template || null,
                data: options.data || null,
                from: options.from || this.senderEmail,
                fromName: options.fromName || this.senderName
            };

            try {
                if (this.useCloudFunctions) {
                    const cloudResult = await this.sendViaCloudFunctions(payload);
                    if (cloudResult?.success) {
                        return cloudResult;
                    }
                }

                if (this.emailEndpoint) {
                    const endpointResult = await this.sendViaEndpoint(payload);
                    if (endpointResult?.success) {
                        return endpointResult;
                    }
                }

                if (typeof emailjs !== 'undefined' && this.emailjsServiceId !== 'YOUR_SERVICE_ID') {
                    const emailJsResult = await this.sendViaEmailJS(payload);
                    if (emailJsResult?.success) {
                        return emailJsResult;
                    }
                }
            } catch (error) {
                console.error('Error enviando email:', error);
            }

            return this.queueEmailFallback(payload);
        }

        async sendViaCloudFunctions(payload) {
            const url = `${this.cloudFunctionsBaseUrl.replace(/\/$/, '')}/sendEmail`;
            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const result = await response.json().catch(() => ({}));
                if (response.ok && result?.success) {
                    console.log('✅ Email enviado via Cloud Functions');
                    return { success: true, method: 'cloud-functions', response: result };
                }
                console.warn('Cloud Functions respondió con error:', result);
                return { success: false, response: result };
            } catch (error) {
                console.warn('Error en Cloud Functions:', error);
                return { success: false, error };
            }
        }

        async sendViaEndpoint(payload) {
            try {
                const response = await fetch(this.emailEndpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                const result = await response.json().catch(() => ({}));
                console.log('✅ Email enviado via endpoint personalizado');
                return { success: true, method: 'endpoint', response: result };
            } catch (error) {
                console.warn('Error en endpoint personalizado:', error);
                return { success: false, error };
            }
        }

        async sendViaEmailJS(payload) {
            if (typeof emailjs === 'undefined') {
                return { success: false };
            }
            try {
                const templateParams = {
                    to_email: payload.to,
                    subject: payload.subject,
                    message: payload.html,
                    from_name: payload.fromName || this.senderName,
                    from_email: payload.from || this.senderEmail
                };
                const response = await emailjs.send(
                    this.emailjsServiceId,
                    this.emailjsTemplateId,
                    templateParams
                );
                console.log('✅ Email enviado via EmailJS', response);
                return { success: true, method: 'emailjs', response };
            } catch (error) {
                console.warn('Error enviando email via EmailJS:', error);
                return { success: false, error };
            }
        }

        queueEmailFallback(payload) {
            if (typeof window.queueEmail === 'function') {
                window.queueEmail({
                    to: payload.to,
                    from: payload.from,
                    subject: payload.subject,
                    template: payload.template || 'manual_html',
                    data: payload.data || { html: payload.html }
                });
                return { success: false, queued: true, method: 'queue' };
            }
            console.warn('Email queue no disponible, el mensaje no pudo enviarse.');
            return { success: false, queued: false };
        }

        async sendPasswordResetEmail(toEmail, resetLink) {
            const htmlContent = `
                <h2>Recuperación de contraseña</h2>
                <p>Recibimos una solicitud para restablecer tu contraseña.</p>
                <p><a href="${resetLink}" style="display:inline-block;padding:12px 24px;background:#1e40af;color:#fff;text-decoration:none;border-radius:6px;">Restablecer contraseña</a></p>
                <p>Si no solicitaste este cambio, puedes ignorar este mensaje.</p>
            `;
            return this.sendEmail(toEmail, 'Restablece tu contraseña', htmlContent);
        }

        async sendAppointmentConfirmation(toEmail, appointmentData = {}) {
            const htmlContent = `
                <h2>Confirmación de cita previa</h2>
                <p>Hola ${appointmentData.name || 'vecino/a'},</p>
                <p>Hemos recibido tu solicitud de cita para <strong>${safeServiceName(appointmentData.service)}</strong>.</p>
                <p><strong>Fecha:</strong> ${safeFormatDate(appointmentData.date)}<br>
                <strong>Hora:</strong> ${appointmentData.time || 'Por confirmar'}</p>
                <p>Nos pondremos en contacto para confirmar o proponerte alternativas.</p>
                <p>Ayuntamiento de Cobreros.</p>
            `;
            return this.sendEmail(toEmail, 'Confirmación de cita previa', htmlContent, {
                template: 'appointment_confirmation',
                data: appointmentData
            });
        }

        async sendAdminAlert(appointmentData = {}) {
            const adminEmail = CONFIG?.appointments?.emailNotifications?.adminEmail || 'aytocobreros@gmail.com';
            const htmlContent = `
                <h2>Nueva solicitud de cita</h2>
                <ul>
                    <li><strong>Nombre:</strong> ${appointmentData.name}</li>
                    <li><strong>DNI:</strong> ${appointmentData.dni}</li>
                    <li><strong>Servicio:</strong> ${safeServiceName(appointmentData.service)}</li>
                    <li><strong>Fecha deseada:</strong> ${safeFormatDate(appointmentData.date)} ${appointmentData.time || ''}</li>
                    <li><strong>Teléfono:</strong> ${appointmentData.phone}</li>
                    <li><strong>Email:</strong> ${appointmentData.email}</li>
                </ul>
            `;
            return this.sendEmail(adminEmail, 'Nueva solicitud de cita previa', htmlContent, {
                template: 'appointment_alert',
                data: appointmentData
            });
        }

        async sendNotice(toEmail, noticeData = {}) {
            const htmlContent = `
                <h2>${noticeData.title || 'Aviso municipal'}</h2>
                <p>${noticeData.message || ''}</p>
                ${noticeData.date ? `<p><strong>Fecha:</strong> ${safeFormatDate(noticeData.date)}</p>` : ''}
                ${noticeData.location ? `<p><strong>Ubicación:</strong> ${noticeData.location}</p>` : ''}
            `;
            return this.sendEmail(toEmail, noticeData.subject || noticeData.title || 'Aviso municipal', htmlContent, {
                template: 'general_notice',
                data: noticeData
            });
        }

        configureEndpoint(url) {
            this.emailEndpoint = url;
        }

        configureCloudFunctions(enabled, baseUrl) {
            this.useCloudFunctions = enabled !== false;
            if (baseUrl) {
                this.cloudFunctionsBaseUrl = baseUrl;
            }
        }

        configureEmailJS(serviceId, templateId, publicKey) {
            this.emailjsServiceId = serviceId;
            this.emailjsTemplateId = templateId;
            this.emailjsPublicKey = publicKey;
            if (typeof emailjs !== 'undefined' && publicKey) {
                emailjs.init(publicKey);
            }
        }
    }

    window.emailService = new EmailService();
})();

