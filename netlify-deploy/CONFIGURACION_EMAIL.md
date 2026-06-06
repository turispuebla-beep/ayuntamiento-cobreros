# 📧 Configuración del Sistema de Email (Netlify Deploy)

Este proyecto usa `u2389387944@gmail.com` como remitente principal con el nombre **Aviso Ayto Cobreros** para:

- Confirmaciones de cita previa
- Correos de aviso/alerta
- Recuperación de contraseña (Firebase Auth)

## 1. Firebase Auth (Recuperación de contraseña)

1. Ve a [Firebase Console](https://console.firebase.google.com/) → **Authentication** → **Templates**
2. Selecciona **Password reset**
3. Configura:
   - **From name**: `Aviso Ayto Cobreros`
   - **From email**: `u2389387944@gmail.com` (debe estar verificado)
   - Personaliza asunto y cuerpo del email

> 💡 El modal “¿Olvidaste tu contraseña?” ya usa este template.

## 2. Cloud Functions (Emails transaccionales)

Los correos del portal se envían mediante la Cloud Function HTTPS:
```
https://us-central1-turisteam-80f1b.cloudfunctions.net/sendEmail
```

Asegúrate de que la función `sendEmail` esté desplegada y configurada con Nodemailer/Gmail (App Password).

## 3. EmailJS (opcional)

Si quieres enviar emails directamente desde el navegador sin depender de Cloud Functions:

1. Regístrate en [EmailJS](https://www.emailjs.com) (plan gratuito 200 emails/mes)
2. Conecta `u2389387944@gmail.com`
3. Crea un template con las variables `to_email`, `subject`, `message`
4. En `js/email-service.js` actualiza:
   ```js
   this.emailjsServiceId = 'TU_SERVICE_ID';
   this.emailjsTemplateId = 'TU_TEMPLATE_ID';
   this.emailjsPublicKey = 'TU_PUBLIC_KEY';
   ```
5. Descomenta el script en `index.html`:
   ```html
   <script src="https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js"></script>
   ```

## 4. Endpoint personalizado (opcional)

Si dispones de backend propio:

```json
POST https://tu-servidor.com/api/send-email
{
  "to": "usuario@dominio.com",
  "from": "u2389387944@gmail.com",
  "fromName": "Aviso Ayto Cobreros",
  "subject": "Tema",
  "html": "<html>...</html>"
}
```

Luego, en `js/email-service.js`:
```js
window.emailService.configureEndpoint('https://tu-servidor.com/api/send-email');
```

## 5. Archivos relevantes

- `js/email-service.js`: lógica de envío + fallback (Cloud Function, endpoint, EmailJS, cola)
- `js/email-queue.js`: reintentos automáticos en localStorage
- `js/appointment-service.js`: confirmaciones de cita
- `js/notifications-system.js`: avisos masivos (email + push)
- `js/script.js`: llamadas directas para confirmaciones y alertas

## 6. Verificación rápida

1. Abre la consola del navegador
2. Ejecuta:
   ```js
   await window.emailService.sendNotice('tu-email@dominio.com', {
     subject: 'Prueba Netlify',
     title: 'Comprobación',
     message: 'Este es un email de prueba del Ayuntamiento de Cobreros.'
   });
   ```
3. Revisa la consola (deberías ver `✅ Email enviado via Cloud Functions`)

## 7. Errores comunes

| Error | Causa | Solución |
| --- | --- | --- |
| `Missing or insufficient permissions` | Reglas de Firestore estrictas | Revisa `firestore.rules` (colecciones `users`, `members`, `notifications`) |
| `Function not found` | Cloud Function no desplegada | `firebase deploy --only functions:sendEmail` |
| `auth/user-not-found` en password reset | Email no existe | Mensaje amigable mostrará “No existe una cuenta con este correo” |

## 8. Dónde ajustar remitentes

- **Correo principal:** `js/email-service.js` → `this.senderEmail`
- **CONFIG appointments:** `config.js` → `appointments.emailNotifications`
- **Templates Cloud Function:** en tu repositorio de Functions (`functions/index.js`)

---

¿Necesitas cambiar el remitente o añadir plantillas nuevas? Edita `js/email-service.js` y actualiza el backend de Cloud Functions. Cualquier duda, avísame y lo dejamos listo. 💪




