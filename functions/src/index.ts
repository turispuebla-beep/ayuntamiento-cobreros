import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as nodemailer from 'nodemailer';
import * as cors from 'cors';

// Inicializar Firebase Admin
admin.initializeApp();

// Configurar CORS
const corsHandler = cors({ origin: true });

// Configurar Nodemailer para Gmail
const transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: 'aytocobrero@gmail.com',
    pass: functions.config().gmail?.password || process.env.GMAIL_PASSWORD
  }
});

// Función para enviar emails
export const sendEmail = functions.https.onRequest((req, res) => {
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
        default:
          htmlContent = '<p>Email del Ayuntamiento de Cobreros</p>';
          textContent = 'Email del Ayuntamiento de Cobreros';
      }

      // Configurar el email
      const mailOptions = {
        from: from || 'aytocobrero@gmail.com',
        to: to,
        subject: subject,
        text: textContent,
        html: htmlContent
      };

      // Enviar email
      const info = await transporter.sendMail(mailOptions);
      
      console.log('Email enviado:', info.messageId);
      
      return res.status(200).json({
        success: true,
        messageId: info.messageId,
        message: 'Email enviado correctamente'
      });

    } catch (error) {
      console.error('Error al enviar email:', error);
      return res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        details: error.message
      });
    }
  });
});

// Función para generar HTML de confirmación de cita
function generateAppointmentConfirmationHTML(data: any): string {
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
                        <li><strong>ID de Cita:</strong> ${data.appointmentId}</li>
                        <li><strong>Comentarios:</strong> ${data.comments}</li>
                    </ul>
                </div>
                
                <p><strong>Importante:</strong> Nos pondremos en contacto con usted para confirmar la disponibilidad de la fecha y hora solicitada.</p>
                
                <p>Si necesita modificar o cancelar su cita, póngase en contacto con nosotros.</p>
            </div>
            
            <div class="footer">
                <p>Atentamente,<br>
                <strong>Ayuntamiento de Cobreros</strong><br>
                📧 aytocobrero@gmail.com<br>
                📞 Teléfono: [Número de teléfono]</p>
                
                <p><em>Este es un email automático, por favor no responda a este mensaje.</em></p>
            </div>
        </div>
    </body>
    </html>
  `;
}

// Función para generar texto plano de confirmación de cita
function generateAppointmentConfirmationText(data: any): string {
  return `
AYUNTAMIENTO DE COBREROS - CONFIRMACIÓN DE CITA PREVIA

Estimado/a ${data.name},

Le confirmamos que su solicitud de cita previa ha sido recibida correctamente.

DETALLES DE SU CITA:
- Servicio: ${data.service}
- Fecha: ${data.date}
- Hora: ${data.time}
- DNI: ${data.dni}
- ID de Cita: ${data.appointmentId}
- Comentarios: ${data.comments}

IMPORTANTE: Nos pondremos en contacto con usted para confirmar la disponibilidad de la fecha y hora solicitada.

Si necesita modificar o cancelar su cita, póngase en contacto con nosotros.

Atentamente,
Ayuntamiento de Cobreros
aytocobrero@gmail.com

Este es un email automático, por favor no responda a este mensaje.
  `;
}

// Función para generar HTML de notificación al administrador
function generateAdminNotificationHTML(data: any): string {
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
                        <li><strong>ID de Cita:</strong> ${data.appointmentId}</li>
                        <li><strong>Comentarios:</strong> ${data.comments}</li>
                        <li><strong>Fecha de Solicitud:</strong> ${data.createdAt}</li>
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
                📧 aytocobrero@gmail.com</p>
                
                <p><em>Este es un email automático del sistema de citas previas.</em></p>
            </div>
        </div>
    </body>
    </html>
  `;
}

// Función para generar texto plano de notificación al administrador
function generateAdminNotificationText(data: any): string {
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
- ID de Cita: ${data.appointmentId}
- Comentarios: ${data.comments}
- Fecha de Solicitud: ${data.createdAt}

PRÓXIMOS PASOS:
1. Verificar disponibilidad en el calendario
2. Contactar al solicitante para confirmar
3. Actualizar el estado de la cita en el sistema

Sistema de Gestión de Citas - Ayuntamiento de Cobreros
aytocobrero@gmail.com

Este es un email automático del sistema de citas previas.
  `;
}

// API principal que maneja todas las rutas
export const api = functions.https.onRequest((req, res) => {
  const path = req.path;
  
  if (path === '/send-email') {
    return sendEmail(req, res);
  }
  
  return res.status(404).json({ error: 'Endpoint no encontrado' });
});

import * as nodemailer from 'nodemailer';
import * as cors from 'cors';

// Inicializar Firebase Admin
admin.initializeApp();

// Configurar CORS
const corsHandler = cors({ origin: true });

// Configurar Nodemailer para Gmail
const transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: 'aytocobrero@gmail.com',
    pass: functions.config().gmail?.password || process.env.GMAIL_PASSWORD
  }
});

// Función para enviar emails
export const sendEmail = functions.https.onRequest((req, res) => {
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
        default:
          htmlContent = '<p>Email del Ayuntamiento de Cobreros</p>';
          textContent = 'Email del Ayuntamiento de Cobreros';
      }

      // Configurar el email
      const mailOptions = {
        from: from || 'aytocobrero@gmail.com',
        to: to,
        subject: subject,
        text: textContent,
        html: htmlContent
      };

      // Enviar email
      const info = await transporter.sendMail(mailOptions);
      
      console.log('Email enviado:', info.messageId);
      
      return res.status(200).json({
        success: true,
        messageId: info.messageId,
        message: 'Email enviado correctamente'
      });

    } catch (error) {
      console.error('Error al enviar email:', error);
      return res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        details: error.message
      });
    }
  });
});

// Función para generar HTML de confirmación de cita
function generateAppointmentConfirmationHTML(data: any): string {
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
                        <li><strong>ID de Cita:</strong> ${data.appointmentId}</li>
                        <li><strong>Comentarios:</strong> ${data.comments}</li>
                    </ul>
                </div>
                
                <p><strong>Importante:</strong> Nos pondremos en contacto con usted para confirmar la disponibilidad de la fecha y hora solicitada.</p>
                
                <p>Si necesita modificar o cancelar su cita, póngase en contacto con nosotros.</p>
            </div>
            
            <div class="footer">
                <p>Atentamente,<br>
                <strong>Ayuntamiento de Cobreros</strong><br>
                📧 aytocobrero@gmail.com<br>
                📞 Teléfono: [Número de teléfono]</p>
                
                <p><em>Este es un email automático, por favor no responda a este mensaje.</em></p>
            </div>
        </div>
    </body>
    </html>
  `;
}

// Función para generar texto plano de confirmación de cita
function generateAppointmentConfirmationText(data: any): string {
  return `
AYUNTAMIENTO DE COBREROS - CONFIRMACIÓN DE CITA PREVIA

Estimado/a ${data.name},

Le confirmamos que su solicitud de cita previa ha sido recibida correctamente.

DETALLES DE SU CITA:
- Servicio: ${data.service}
- Fecha: ${data.date}
- Hora: ${data.time}
- DNI: ${data.dni}
- ID de Cita: ${data.appointmentId}
- Comentarios: ${data.comments}

IMPORTANTE: Nos pondremos en contacto con usted para confirmar la disponibilidad de la fecha y hora solicitada.

Si necesita modificar o cancelar su cita, póngase en contacto con nosotros.

Atentamente,
Ayuntamiento de Cobreros
aytocobrero@gmail.com

Este es un email automático, por favor no responda a este mensaje.
  `;
}

// Función para generar HTML de notificación al administrador
function generateAdminNotificationHTML(data: any): string {
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
                        <li><strong>ID de Cita:</strong> ${data.appointmentId}</li>
                        <li><strong>Comentarios:</strong> ${data.comments}</li>
                        <li><strong>Fecha de Solicitud:</strong> ${data.createdAt}</li>
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
                📧 aytocobrero@gmail.com</p>
                
                <p><em>Este es un email automático del sistema de citas previas.</em></p>
            </div>
        </div>
    </body>
    </html>
  `;
}

// Función para generar texto plano de notificación al administrador
function generateAdminNotificationText(data: any): string {
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
- ID de Cita: ${data.appointmentId}
- Comentarios: ${data.comments}
- Fecha de Solicitud: ${data.createdAt}

PRÓXIMOS PASOS:
1. Verificar disponibilidad en el calendario
2. Contactar al solicitante para confirmar
3. Actualizar el estado de la cita en el sistema

Sistema de Gestión de Citas - Ayuntamiento de Cobreros
aytocobrero@gmail.com

Este es un email automático del sistema de citas previas.
  `;
}

// API principal que maneja todas las rutas
export const api = functions.https.onRequest((req, res) => {
  const path = req.path;
  
  if (path === '/send-email') {
    return sendEmail(req, res);
  }
  
  return res.status(404).json({ error: 'Endpoint no encontrado' });
});
