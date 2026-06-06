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

        // Plantilla base del email
        getEmailTemplate(content, options = {}) {
            const headerColor = options.headerColor || '#1e3a8a';
            const headerIcon = options.headerIcon || '🏛️';
            const headerTitle = options.headerTitle || 'Ayuntamiento de Cobreros';
            const headerSubtitle = options.headerSubtitle || '';
            
            return `
                <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc;">
                    <!-- Cabecera -->
                    <div style="background: linear-gradient(135deg, ${headerColor} 0%, ${headerColor}dd 100%); color: white; padding: 30px; text-align: center;">
                        <div style="font-size: 36px; margin-bottom: 8px;">${headerIcon}</div>
                        <h1 style="margin: 0; font-size: 22px;">${headerTitle}</h1>
                        ${headerSubtitle ? `<p style="margin: 8px 0 0 0; opacity: 0.9; font-size: 14px;">${headerSubtitle}</p>` : ''}
                    </div>
                    
                    <!-- Contenido -->
                    <div style="padding: 30px; background: white;">
                        ${content}
                    </div>
                    
                    <!-- Contacto -->
                    <div style="padding: 20px 30px; background: #f1f5f9; text-align: center;">
                        <p style="margin: 0; color: #64748b; font-size: 14px;">
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
        }

        async sendPasswordResetEmail(toEmail, resetLink) {
            const content = `
                <h2 style="color: #1e3a8a; margin: 0 0 20px 0;">🔐 Recuperación de contraseña</h2>
                <p style="color: #334155;">Hemos recibido una solicitud para restablecer tu contraseña.</p>
                <p style="color: #64748b;">Si no solicitaste este cambio, puedes ignorar este mensaje.</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${resetLink}" style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
                        🔑 Restablecer contraseña
                    </a>
                </div>
                <p style="color: #94a3b8; font-size: 13px; text-align: center;">Este enlace expira en 24 horas.</p>
            `;
            const htmlContent = this.getEmailTemplate(content, {
                headerIcon: '🔐',
                headerTitle: 'Recuperar Contraseña',
                headerSubtitle: 'Ayuntamiento de Cobreros'
            });
            return this.sendEmail(toEmail, '🔐 Restablece tu contraseña - Ayuntamiento de Cobreros', htmlContent);
        }

        async sendAppointmentConfirmation(toEmail, appointmentData = {}) {
            const content = `
                <p style="font-size: 16px; color: #334155;">Hola <strong>${appointmentData.name || 'vecino/a'}</strong>,</p>
                <p style="color: #64748b;">Hemos recibido correctamente tu solicitud de cita previa.</p>
                
                <!-- Detalles de la cita -->
                <div style="background: #f1f5f9; padding: 20px; border-radius: 12px; margin: 20px 0; border-left: 4px solid #3b82f6;">
                    <h3 style="margin: 0 0 15px 0; color: #1e3a8a;">📋 Detalles de tu cita</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr><td style="padding: 8px 0; color: #64748b;">Servicio:</td><td style="padding: 8px 0; font-weight: 600; color: #334155;">${safeServiceName(appointmentData.service)}</td></tr>
                        <tr><td style="padding: 8px 0; color: #64748b;">Fecha:</td><td style="padding: 8px 0; font-weight: 600; color: #334155;">📅 ${safeFormatDate(appointmentData.date)}</td></tr>
                        <tr><td style="padding: 8px 0; color: #64748b;">Hora:</td><td style="padding: 8px 0; font-weight: 600; color: #334155;">🕐 ${appointmentData.time || 'Por confirmar'}</td></tr>
                    </table>
                </div>
                
                <!-- Ubicación -->
                <div style="background: #fef3c7; padding: 20px; border-radius: 12px; margin: 20px 0; border-left: 4px solid #f59e0b;">
                    <h3 style="margin: 0 0 10px 0; color: #92400e;">📍 Lugar de la cita</h3>
                    <p style="margin: 0; color: #78350f;">
                        <strong>Ayuntamiento de Cobreros</strong><br>
                        Calle Principal, s/n<br>
                        49395 Cobreros (Zamora)
                    </p>
                </div>
                
                <!-- Documentación -->
                <div style="background: #ecfdf5; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
                    <p style="margin: 0; color: #065f46; font-size: 14px;">
                        <strong>📝 Recuerde traer:</strong> DNI/NIE original y documentación relacionada con su trámite.
                    </p>
                </div>
                
                <p style="color: #64748b; font-size: 14px;">
                    Nos pondremos en contacto para <strong>confirmar definitivamente</strong> la cita.
                </p>
            `;
            const htmlContent = this.getEmailTemplate(content, {
                headerIcon: '✅',
                headerTitle: 'Confirmación de Cita Previa',
                headerColor: '#10b981'
            });
            return this.sendEmail(toEmail, '✅ Confirmación de Cita Previa - Ayuntamiento de Cobreros', htmlContent, {
                template: 'appointment_confirmation',
                data: appointmentData
            });
        }

        async sendAdminAlert(appointmentData = {}) {
            const adminEmail = CONFIG?.appointments?.emailNotifications?.adminEmail || 'aytocobreros@gmail.com';
            const fechaSolicitud = new Date().toLocaleString('es-ES');
            
            const content = `
                <div style="background: #fef2f2; padding: 15px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
                    <p style="margin: 0; color: #991b1b; font-weight: 600;">⏰ Recibida: ${fechaSolicitud}</p>
                </div>
                
                <!-- Datos del solicitante -->
                <h3 style="color: #1e3a8a; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">👤 Datos del Solicitante</h3>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                    <tr style="background: #f8fafc;">
                        <td style="padding: 12px; border: 1px solid #e2e8f0; color: #64748b; width: 35%;">Nombre</td>
                        <td style="padding: 12px; border: 1px solid #e2e8f0; font-weight: 600;">${appointmentData.name}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px; border: 1px solid #e2e8f0; color: #64748b;">DNI/NIE</td>
                        <td style="padding: 12px; border: 1px solid #e2e8f0;">${appointmentData.dni || 'No proporcionado'}</td>
                    </tr>
                    <tr style="background: #f8fafc;">
                        <td style="padding: 12px; border: 1px solid #e2e8f0; color: #64748b;">📧 Email</td>
                        <td style="padding: 12px; border: 1px solid #e2e8f0;"><a href="mailto:${appointmentData.email}" style="color: #2563eb;">${appointmentData.email}</a></td>
                    </tr>
                    <tr>
                        <td style="padding: 12px; border: 1px solid #e2e8f0; color: #64748b;">📞 Teléfono</td>
                        <td style="padding: 12px; border: 1px solid #e2e8f0;"><a href="tel:${appointmentData.phone}" style="color: #2563eb;">${appointmentData.phone || 'No proporcionado'}</a></td>
                    </tr>
                </table>
                
                <!-- Detalles de la cita -->
                <h3 style="color: #1e3a8a; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">📅 Cita Solicitada</h3>
                <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 20px;">
                    <div style="flex: 1; min-width: 150px; background: #dbeafe; padding: 15px; border-radius: 8px; text-align: center;">
                        <div style="font-size: 12px; color: #1e40af;">SERVICIO</div>
                        <div style="font-weight: 700; color: #1e3a8a;">${safeServiceName(appointmentData.service)}</div>
                    </div>
                    <div style="flex: 1; min-width: 120px; background: #dcfce7; padding: 15px; border-radius: 8px; text-align: center;">
                        <div style="font-size: 12px; color: #166534;">FECHA</div>
                        <div style="font-weight: 700; color: #15803d;">${safeFormatDate(appointmentData.date)}</div>
                    </div>
                    <div style="flex: 1; min-width: 80px; background: #fef3c7; padding: 15px; border-radius: 8px; text-align: center;">
                        <div style="font-size: 12px; color: #92400e;">HORA</div>
                        <div style="font-weight: 700; color: #b45309; font-size: 18px;">${appointmentData.time || '-'}</div>
                    </div>
                </div>
                
                ${appointmentData.comments ? `
                <div style="background: #f1f5f9; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                    <p style="margin: 0; color: #64748b; font-size: 13px;">💬 Comentarios:</p>
                    <p style="margin: 8px 0 0 0; color: #334155; font-style: italic;">"${appointmentData.comments}"</p>
                </div>
                ` : ''}
                
                <div style="text-align: center; margin-top: 25px;">
                    <a href="https://ayuntamientodecobreros.netlify.app/#citas-previas" style="display: inline-block; padding: 14px 28px; background: #1e3a8a; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
                        🔧 Gestionar en Panel Admin
                    </a>
                </div>
            `;
            const htmlContent = this.getEmailTemplate(content, {
                headerIcon: '🔔',
                headerTitle: 'NUEVA SOLICITUD DE CITA',
                headerColor: '#dc2626'
            });
            return this.sendEmail(adminEmail, `🔔 Nueva Cita: ${appointmentData.name} - ${safeFormatDate(appointmentData.date)}`, htmlContent, {
                template: 'appointment_alert',
                data: appointmentData
            });
        }

        async sendStatusChangeEmail(toEmail, appointmentData = {}, newStatus = 'confirmed') {
            const statusConfig = {
                confirmed: { emoji: '✅', color: '#10b981', title: '¡Su cita ha sido CONFIRMADA!' },
                cancelled: { emoji: '❌', color: '#ef4444', title: 'Su cita ha sido CANCELADA' },
                completed: { emoji: '🎉', color: '#8b5cf6', title: 'Cita COMPLETADA' },
                no_show: { emoji: '⚠️', color: '#f59e0b', title: 'No se presentó a su cita' }
            };
            const config = statusConfig[newStatus] || statusConfig.confirmed;
            
            const content = `
                <p style="font-size: 16px; color: #334155;">Hola <strong>${appointmentData.name || 'vecino/a'}</strong>,</p>
                <p style="color: #64748b;">${config.title}</p>
                
                <div style="background: #f1f5f9; padding: 20px; border-radius: 12px; margin: 20px 0; border-left: 4px solid ${config.color};">
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr><td style="padding: 8px 0; color: #64748b;">Servicio:</td><td style="padding: 8px 0; font-weight: 600;">${safeServiceName(appointmentData.service)}</td></tr>
                        <tr><td style="padding: 8px 0; color: #64748b;">Fecha:</td><td style="padding: 8px 0; font-weight: 600;">📅 ${safeFormatDate(appointmentData.date)}</td></tr>
                        <tr><td style="padding: 8px 0; color: #64748b;">Hora:</td><td style="padding: 8px 0; font-weight: 600;">🕐 ${appointmentData.time || '-'}</td></tr>
                    </table>
                </div>
                
                ${newStatus === 'confirmed' ? `
                <div style="background: #ecfdf5; padding: 20px; border-radius: 12px; margin: 20px 0;">
                    <h3 style="margin: 0 0 10px 0; color: #065f46;">📍 Lugar de la cita</h3>
                    <p style="margin: 0; color: #047857;">
                        Ayuntamiento de Cobreros<br>
                        Calle Principal, s/n<br>
                        49395 Cobreros (Zamora)
                    </p>
                </div>
                <p style="color: #065f46; font-size: 14px;">📝 Recuerde traer: DNI/NIE original y documentación relacionada.</p>
                ` : ''}
            `;
            const htmlContent = this.getEmailTemplate(content, {
                headerIcon: config.emoji,
                headerTitle: config.title,
                headerColor: config.color
            });
            return this.sendEmail(toEmail, `${config.emoji} ${config.title} - Ayuntamiento de Cobreros`, htmlContent, {
                template: 'appointment_status_change',
                data: appointmentData
            });
        }

        async sendNotice(toEmail, noticeData = {}) {
            const content = `
                <h2 style="color: #1e3a8a; margin: 0 0 20px 0;">${noticeData.title || 'Aviso municipal'}</h2>
                <p style="color: #334155; line-height: 1.6;">${noticeData.message || ''}</p>
                ${noticeData.date ? `
                <div style="background: #f1f5f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0;"><strong>📅 Fecha:</strong> ${safeFormatDate(noticeData.date)}</p>
                </div>
                ` : ''}
                ${noticeData.location ? `
                <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0;"><strong>📍 Ubicación:</strong> ${noticeData.location}</p>
                </div>
                ` : ''}
            `;
            const htmlContent = this.getEmailTemplate(content, {
                headerIcon: '📢',
                headerTitle: noticeData.title || 'Aviso Municipal',
                headerColor: '#1e3a8a'
            });
            return this.sendEmail(toEmail, noticeData.subject || noticeData.title || '📢 Aviso municipal - Ayuntamiento de Cobreros', htmlContent, {
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

