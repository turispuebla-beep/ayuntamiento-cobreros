# ✅ Verificación de Cloud Functions (Ayuntamiento de Cobreros)

Las mejoras dependen de la función `sendEmail` desplegada en Firebase. Usa esta guía para comprobar que todo está operativo.

## 1. ¿Qué debe existir?

- Proyecto: `turisteam-80f1b`
- Región: `us-central1`
- Cloud Function HTTPS: `https://us-central1-turisteam-80f1b.cloudfunctions.net/sendEmail`
- (Opcional) Callable Function con el mismo nombre `sendEmail`

## 2. Pasos para verificar desde Firebase Console

1. Ve a [Firebase Console → Functions](https://console.firebase.google.com/)
2. Selecciona `sendEmail`
3. Revisa:
   - Última versión desplegada
   - Registros (Logs)
   - Errores recientes

Si no aparece, despliega desde tu carpeta de `functions`:

```bash
firebase deploy --only functions:sendEmail
```

## 3. Prueba rápida desde el navegador

En el sitio (Netlify o localhost con `http://`), abre la consola (F12) y ejecuta:

```js
await window.emailService.sendNotice('tu-email@dominio.com', {
  subject: 'Prueba Cloud Function',
  title: 'Correo de prueba',
  message: 'Este email confirma que Cloud Functions funciona correctamente.'
});
```

Deberías ver en la consola:
```
✅ Email enviado via Cloud Functions ...
```

## 4. Errores frecuentes & soluciones

| Error | Causa | Solución |
| --- | --- | --- |
| `Function not found` | No se desplegó `sendEmail` | `firebase deploy --only functions:sendEmail` |
| `Permission denied` | La función exige auth o IP restringida | Revisa tu código en `functions/index.js` |
| `Missing or insufficient permissions` | Reglas de Firestore bloquean la escritura | Ajusta `firestore.rules` (users, members, notifications) |
| `Daily quota exceeded` | Límite de Gmail / App Password | Usa EmailJS como fallback o App Password distinta |

## 5. Estructura recomendada de la función

```javascript
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

admin.initializeApp();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'u2389387944@gmail.com',
    pass: 'TU_APP_PASSWORD'
  }
});

exports.sendEmail = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    const { to, from, fromName, subject, html, template, data } = req.body;

    const mailOptions = {
      from: `"${fromName || 'Aviso Ayto Cobreros'}" <${from || 'u2389387944@gmail.com'}>`,
      to,
      subject,
      html: html || `<p>${template || 'general_notice'}</p><pre>${JSON.stringify(data, null, 2)}</pre>`
    };

    await transporter.sendMail(mailOptions);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error sending email:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});
```

> 📝 Si prefieres callable functions (`functions.https.onCall`), recuerda manejar `context.auth` según tus necesidades.

## 6. Prueba desde Postman / curl

```bash
curl -X POST https://us-central1-turisteam-80f1b.cloudfunctions.net/sendEmail \
  -H "Content-Type: application/json" \
  -d '{
    "to": "destinatario@dominio.com",
    "from": "u2389387944@gmail.com",
    "fromName": "Aviso Ayto Cobreros",
    "subject": "Correo de prueba",
    "html": "<p>Hola, este es un test.</p>"
  }'
```

Si la función devuelve `{ "success": true }`, todo está correcto.

## 7. ¿Por qué es importante?

- Confirmaciones de cita
- Avisos a ciudadanos
- Emails del panel admin
- Recuperación de contraseña (Firebase Auth) usa otro canal, pero este controla los correos transaccionales.

Mantén esta función monitorizada; cualquier alerta en los logs impactará directamente en el envío de correos del portal. 💬




