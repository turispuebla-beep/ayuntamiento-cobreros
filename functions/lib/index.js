"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const nodemailer = __importStar(require("nodemailer"));
const cors_1 = __importDefault(require("cors"));
// Inicializar Firebase Admin
admin.initializeApp();
// Configurar CORS
const corsHandler = (0, cors_1.default)({ origin: true });
// ⚙️ CONFIGURACIÓN DE EMAIL PARA CITAS PREVIAS
// Email dedicado exclusivamente para citas previas
const APPOINTMENT_EMAIL = 'u2389387944@gmail.com';
// Configurar Nodemailer para Gmail
// Usar variables de entorno (método moderno) o fallback a config deprecated
const gmailPassword = process.env.GMAIL_PASSWORD || ((_a = functions.config().gmail) === null || _a === void 0 ? void 0 : _a.password);
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: APPOINTMENT_EMAIL,
        pass: gmailPassword
    }
});
// Función para enviar emails
exports.sendEmail = functions.https.onRequest((req, res) => {
    return corsHandler(req, res, async () => {
        if (req.method !== 'POST') {
            return res.status(405).json({ error: 'Método no permitido' });
        }
        try {
            const { to, from, subject, template, data } = req.body;
            if (!to || !subject) {
                return res.status(400).json({ error: 'Faltan campos requeridos' });
            }
            // Generar contenido del email según el template
            let htmlContent = '';
            let textContent = '';
            switch (template) {
                case 'appointment_confirmation':
                    htmlContent = generateAppointmentConfirmationHTML(data);
                    textContent = generateAppointmentConfirmationText(data);
                    break;
                case 'appointment_notification_admin':
                    htmlContent = generateAdminNotificationHTML(data);
                    textContent = generateAdminNotificationText(data);
                    break;
                case 'appointment_status_change':
                    htmlContent = generateStatusChangeHTML(data);
                    textContent = generateStatusChangeText(data);
                    break;
                default:
                    htmlContent = '<p>Email del Ayuntamiento de Cobreros</p>';
                    textContent = 'Email del Ayuntamiento de Cobreros';
            }
            // Configurar el email
            const mailOptions = {
                from: from || APPOINTMENT_EMAIL,
                to: to,
                subject: subject,
                text: textContent,
                html: htmlContent
            };
            // Enviar email
            const info = await transporter.sendMail(mailOptions);
            console.log('✅ Email enviado:', info.messageId);
            return res.status(200).json({
                success: true,
                messageId: info.messageId,
                message: 'Email enviado correctamente'
            });
        }
        catch (error) {
            console.error('❌ Error al enviar email:', error);
            return res.status(500).json({
                success: false,
                error: 'Error interno del servidor',
                details: error.message
            });
        }
    });
});
// Función para generar HTML de confirmación de cita
function generateAppointmentConfirmationHTML(data) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Confirmación de Cita Previa</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #2c3e50; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .appointment-details { background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #3498db; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            .highlight { color: #e74c3c; font-weight: bold; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🏛️ Ayuntamiento de Cobreros</h1>
                <h2>Confirmación de Cita Previa</h2>
            </div>
            
            <div class="content">
                <p>Estimado/a <strong>${data.name}</strong>,</p>
                
                <p>Le confirmamos que su solicitud de cita previa ha sido recibida correctamente.</p>
                
                <div class="appointment-details">
                    <h3>📅 Detalles de su cita:</h3>
                    <ul>
                        <li><strong>Servicio:</strong> ${data.service}</li>
                        <li><strong>Fecha:</strong> <span class="highlight">${data.date}</span></li>
                        <li><strong>Hora:</strong> <span class="highlight">${data.time}</span></li>
                        <li><strong>DNI:</strong> ${data.dni}</li>
                        <li><strong>ID de Cita:</strong> ${data.appointmentId || data.id}</li>
                        ${data.comments ? `<li><strong>Comentarios:</strong> ${data.comments}</li>` : ''}
                    </ul>
                </div>
                
                <p><strong>Importante:</strong> Nos pondremos en contacto con usted para confirmar la disponibilidad de la fecha y hora solicitada.</p>
                
                <p>Si necesita modificar o cancelar su cita, póngase en contacto con nosotros en <strong>${APPOINTMENT_EMAIL}</strong> o llamando al <strong>980 62 26 18</strong>.</p>
            </div>
            
            <div class="footer">
                <p>Atentamente,<br>
                <strong>Ayuntamiento de Cobreros</strong><br>
                📧 ${APPOINTMENT_EMAIL}<br>
                📞 Teléfono: 980 62 26 18</p>
                
                <p><em>Este es un email automático, por favor no responda a este mensaje.</em></p>
            </div>
        </div>
    </body>
    </html>
  `;
}
// Función para generar texto plano de confirmación de cita
function generateAppointmentConfirmationText(data) {
    return `
AYUNTAMIENTO DE COBREROS - CONFIRMACIÓN DE CITA PREVIA

Estimado/a ${data.name},

Le confirmamos que su solicitud de cita previa ha sido recibida correctamente.

DETALLES DE SU CITA:
- Servicio: ${data.service}
- Fecha: ${data.date}
- Hora: ${data.time}
- DNI: ${data.dni}
- ID de Cita: ${data.appointmentId || data.id}
${data.comments ? `- Comentarios: ${data.comments}` : ''}

IMPORTANTE: Nos pondremos en contacto con usted para confirmar la disponibilidad de la fecha y hora solicitada.

Si necesita modificar o cancelar su cita, póngase en contacto con nosotros en ${APPOINTMENT_EMAIL} o llamando al 980 62 26 18.

Atentamente,
Ayuntamiento de Cobreros
${APPOINTMENT_EMAIL}
Teléfono: 980 62 26 18

Este es un email automático, por favor no responda a este mensaje.
  `;
}
// Función para generar HTML de notificación al administrador
function generateAdminNotificationHTML(data) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Nueva Solicitud de Cita Previa</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #e74c3c; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .appointment-details { background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #e74c3c; }
            .contact-info { background-color: #ecf0f1; padding: 15px; margin: 15px 0; border-radius: 5px; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            .highlight { color: #e74c3c; font-weight: bold; }
            .urgent { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; border-radius: 5px; margin: 10px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🚨 NUEVA SOLICITUD DE CITA PREVIA</h1>
                <h2>Ayuntamiento de Cobreros</h2>
            </div>
            
            <div class="content">
                <div class="urgent">
                    <strong>⚠️ ACCIÓN REQUERIDA:</strong> Se ha recibido una nueva solicitud de cita previa que requiere confirmación.
                </div>
                
                <div class="contact-info">
                    <h3>👤 Datos del Solicitante:</h3>
                    <ul>
                        <li><strong>Nombre:</strong> ${data.name}</li>
                        <li><strong>DNI:</strong> ${data.dni}</li>
                        <li><strong>Email:</strong> ${data.email}</li>
                        <li><strong>Teléfono:</strong> ${data.phone}</li>
                    </ul>
                </div>
                
                <div class="appointment-details">
                    <h3>📅 Detalles de la Cita Solicitada:</h3>
                    <ul>
                        <li><strong>Servicio:</strong> <span class="highlight">${data.service}</span></li>
                        <li><strong>Fecha:</strong> <span class="highlight">${data.date}</span></li>
                        <li><strong>Hora:</strong> <span class="highlight">${data.time}</span></li>
                        <li><strong>ID de Cita:</strong> ${data.appointmentId || data.id}</li>
                        ${data.comments ? `<li><strong>Comentarios:</strong> ${data.comments}</li>` : ''}
                        <li><strong>Fecha de Solicitud:</strong> ${data.createdAt || new Date().toLocaleString('es-ES')}</li>
                    </ul>
                </div>
                
                <div class="urgent">
                    <h3>📋 Próximos Pasos:</h3>
                    <ol>
                        <li>Verificar disponibilidad en el calendario</li>
                        <li>Contactar al solicitante para confirmar</li>
                        <li>Actualizar el estado de la cita en el sistema</li>
                    </ol>
                </div>
            </div>
            
            <div class="footer">
                <p><strong>Sistema de Gestión de Citas</strong><br>
                Ayuntamiento de Cobreros<br>
                📧 ${APPOINTMENT_EMAIL}<br>
                📞 980 62 26 18</p>
                
                <p><em>Este es un email automático del sistema de citas previas.</em></p>
            </div>
        </div>
    </body>
    </html>
  `;
}
// Función para generar texto plano de notificación al administrador
function generateAdminNotificationText(data) {
    return `
NUEVA SOLICITUD DE CITA PREVIA - AYUNTAMIENTO DE COBREROS

⚠️ ACCIÓN REQUERIDA: Se ha recibido una nueva solicitud de cita previa que requiere confirmación.

DATOS DEL SOLICITANTE:
- Nombre: ${data.name}
- DNI: ${data.dni}
- Email: ${data.email}
- Teléfono: ${data.phone}

DETALLES DE LA CITA SOLICITADA:
- Servicio: ${data.service}
- Fecha: ${data.date}
- Hora: ${data.time}
- ID de Cita: ${data.appointmentId || data.id}
${data.comments ? `- Comentarios: ${data.comments}` : ''}
- Fecha de Solicitud: ${data.createdAt || new Date().toLocaleString('es-ES')}

PRÓXIMOS PASOS:
1. Verificar disponibilidad en el calendario
2. Contactar al solicitante para confirmar
3. Actualizar el estado de la cita en el sistema

Sistema de Gestión de Citas - Ayuntamiento de Cobreros
${APPOINTMENT_EMAIL}
Teléfono: 980 62 26 18

Este es un email automático del sistema de citas previas.
  `;
}
// Función para generar HTML de cambio de estado
function generateStatusChangeHTML(data) {
    const statusTexts = {
        'pending': 'Pendiente',
        'confirmed': 'Confirmada',
        'cancelled': 'Cancelada',
        'completed': 'Completada'
    };
    const statusColors = {
        'pending': '#f39c12',
        'confirmed': '#27ae60',
        'cancelled': '#e74c3c',
        'completed': '#3498db'
    };
    const statusText = statusTexts[data.newStatus] || data.newStatus;
    const statusColor = statusColors[data.newStatus] || '#333';
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Actualización de Cita Previa</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: ${statusColor}; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .status-box { background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid ${statusColor}; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            .highlight { color: ${statusColor}; font-weight: bold; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>📅 Actualización de su Cita Previa</h1>
                <h2>Ayuntamiento de Cobreros</h2>
            </div>
            
            <div class="content">
                <p>Estimado/a <strong>${data.name}</strong>,</p>
                
                <p>Le informamos que el estado de su cita previa ha sido actualizado.</p>
                
                <div class="status-box">
                    <h3>Estado de su cita:</h3>
                    <p style="font-size: 18px; color: ${statusColor}; font-weight: bold;">${statusText}</p>
                    <ul>
                        <li><strong>Servicio:</strong> ${data.service}</li>
                        <li><strong>Fecha:</strong> ${data.date}</li>
                        <li><strong>Hora:</strong> ${data.time}</li>
                        <li><strong>ID de Cita:</strong> ${data.appointmentId || data.id}</li>
                    </ul>
                </div>
                
                ${data.message ? `<p>${data.message}</p>` : ''}
                
                <p>Si tiene alguna duda, puede contactarnos en <strong>${APPOINTMENT_EMAIL}</strong> o llamando al <strong>980 62 26 18</strong>.</p>
            </div>
            
            <div class="footer">
                <p>Atentamente,<br>
                <strong>Ayuntamiento de Cobreros</strong><br>
                📧 ${APPOINTMENT_EMAIL}<br>
                📞 Teléfono: 980 62 26 18</p>
                
                <p><em>Este es un email automático, por favor no responda a este mensaje.</em></p>
            </div>
        </div>
    </body>
    </html>
  `;
}
// Función para generar texto plano de cambio de estado
function generateStatusChangeText(data) {
    const statusTexts = {
        'pending': 'Pendiente',
        'confirmed': 'Confirmada',
        'cancelled': 'Cancelada',
        'completed': 'Completada'
    };
    const statusText = statusTexts[data.newStatus] || data.newStatus;
    return `
ACTUALIZACIÓN DE CITA PREVIA - AYUNTAMIENTO DE COBREROS

Estimado/a ${data.name},

Le informamos que el estado de su cita previa ha sido actualizado.

ESTADO DE SU CITA: ${statusText}

DETALLES:
- Servicio: ${data.service}
- Fecha: ${data.date}
- Hora: ${data.time}
- ID de Cita: ${data.appointmentId || data.id}

${data.message ? `\n${data.message}\n` : ''}

Si tiene alguna duda, puede contactarnos en ${APPOINTMENT_EMAIL} o llamando al 980 62 26 18.

Atentamente,
Ayuntamiento de Cobreros
${APPOINTMENT_EMAIL}
Teléfono: 980 62 26 18

Este es un email automático, por favor no responda a este mensaje.
  `;
}
//# sourceMappingURL=index.js.map