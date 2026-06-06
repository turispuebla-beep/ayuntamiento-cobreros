# Configurar APNs (Apple Push Notification service) en Firebase

Esta guía te ayudará a configurar las notificaciones push para iOS en Firebase.

---

## 📋 Requisitos Previos

1. ✅ **Cuenta de Apple Developer** (gratis o de pago)
   - Gratis: https://developer.apple.com/account/ (permite probar en tu dispositivo)
   - De pago: $99/año (para distribuir en App Store)

2. ✅ **Proyecto Firebase** ya configurado
   - Tu proyecto: `turisteam-80f1b`
   - Firebase Console: https://console.firebase.google.com/

3. ✅ **Bundle ID de tu app iOS** (si ya tienes una app)
   - Ejemplo: `com.ayuntamientocobreros.ios`
   - Si no tienes app iOS aún, puedes usar: `com.ayuntamientocobreros.pwa`

---

## 🚀 Paso 1: Obtener la Key de APNs de Apple

### Opción A: Usar Authentication Key (Recomendado - Más Fácil)

1. **Ve a Apple Developer Portal**:
   - https://developer.apple.com/account/resources/authkeys/list
   - Inicia sesión con tu Apple ID

2. **Crea una nueva Key**:
   - Haz clic en el botón **"+"** (arriba a la izquierda)
   - **Key Name**: `Firebase APNs Key` (o el nombre que prefieras)
   - ✅ Marca la casilla **"Apple Push Notifications service (APNs)"**
   - Haz clic en **"Continue"** y luego en **"Register"**

3. **Descarga la Key**:
   - ⚠️ **IMPORTANTE**: Solo puedes descargar esta key UNA VEZ
   - Haz clic en **"Download"** para descargar el archivo `.p8`
   - **Guarda este archivo en un lugar seguro** (no se puede volver a descargar)

4. **Anota la información**:
   - **Key ID**: Aparece en la lista de keys (ej: `ABC123XYZ`)
   - **Team ID**: Lo encuentras en la esquina superior derecha (ej: `DEF456GHI`)
   - **Archivo `.p8`**: El que acabas de descargar

### Opción B: Usar Certificado (Más Complejo - No Recomendado)

Si prefieres usar certificados en lugar de keys:

1. Ve a: https://developer.apple.com/account/resources/certificates/list
2. Crea un certificado de tipo **"Apple Push Notification service SSL"**
3. Descarga el certificado `.cer`
4. Conviértelo a `.p12` usando Keychain Access en Mac

**Recomendación**: Usa la Opción A (Authentication Key) porque es más fácil y moderna.

---

## 🔧 Paso 2: Configurar APNs en Firebase Console

1. **Abre Firebase Console**:
   - https://console.firebase.google.com/
   - Selecciona tu proyecto: **turisteam-80f1b**

2. **Ve a Cloud Messaging**:
   - En el menú lateral, haz clic en el icono de ⚙️ **Settings** (Configuración)
   - Selecciona **"Project settings"**
   - Ve a la pestaña **"Cloud Messaging"**

3. **Configura Apple app configuration**:
   - Desplázate hasta la sección **"Apple app configuration"**
   - Si no ves esta sección, haz clic en **"Add app"** → **"iOS"** primero
   - O busca tu app iOS en la lista si ya la creaste

4. **Sube la Authentication Key**:
   - **Método**: Selecciona **"Upload"** (si usas archivo `.p8`)
   - O selecciona **"Key"** (si prefieres ingresar Key ID y Team ID manualmente)

   **Si usas archivo `.p8`**:
   - Haz clic en **"Upload"**
   - Selecciona el archivo `.p8` que descargaste
   - Ingresa el **Key ID** (ej: `ABC123XYZ`)
   - Ingresa el **Team ID** (ej: `DEF456GHI`)

   **Si usas Key ID y Team ID**:
   - Selecciona **"Key"**
   - Ingresa el **Key ID**
   - Ingresa el **Team ID**
   - Sube el archivo `.p8`

5. **Bundle ID**:
   - Ingresa el Bundle ID de tu app iOS
   - Si no tienes app iOS aún, usa: `com.ayuntamientocobreros.pwa`
   - Este debe coincidir con el Bundle ID que uses en Xcode

6. **Guarda los cambios**:
   - Haz clic en **"Upload"** o **"Save"**

---

## ✅ Paso 3: Verificar la Configuración

1. **Verifica en Firebase Console**:
   - Deberías ver un ✅ verde junto a "Apple Push Notification service"
   - El estado debe decir **"Active"** o **"Configured"**

2. **Verifica en tu código**:
   - Tu código actual ya está preparado para iOS
   - Los tokens FCM funcionan igual para Android e iOS
   - No necesitas cambiar nada en tu código JavaScript

---

## 🧪 Paso 4: Probar las Notificaciones Push

### Para Probar en iOS (PWA en Safari):

1. **Abre tu sitio en Safari en iPhone/iPad**:
   - Ve a: https://www.ayuntamientocobreros.com
   - Instala la PWA (Compartir → Añadir a pantalla de inicio)

2. **Permite notificaciones**:
   - La app pedirá permiso para notificaciones
   - Acepta el permiso

3. **Verifica el token FCM**:
   - Abre la consola del navegador (si es posible)
   - O verifica en Firestore que el usuario tenga `fcmToken`

4. **Envía una notificación de prueba**:
   - Desde el panel de administración
   - O desde `mail-push-tester.html`
   - Selecciona "Push + Email" o "Sólo push"

### Para Probar en iOS (App Nativa):

1. **Compila la app en Xcode**:
   - Usa el proyecto generado por PWA Builder
   - Asegúrate de que el Bundle ID coincida con el configurado en Firebase

2. **Instala en tu iPhone**:
   - Conecta tu iPhone al Mac
   - Selecciona tu dispositivo en Xcode
   - Haz clic en "Run" (▶️)

3. **Permite notificaciones**:
   - La app pedirá permiso para notificaciones
   - Acepta el permiso

4. **Envía una notificación de prueba**:
   - Desde el panel de administración
   - La notificación debería llegar incluso con la app cerrada

---

## 🔍 Verificar que las Cloud Functions Soportan iOS

Tu Cloud Function `sendPushNotification` debería funcionar automáticamente, pero verifica que tenga esta estructura:

```javascript
// Ejemplo de Cloud Function que soporta iOS
const admin = require('firebase-admin');

exports.sendPushNotification = functions.https.onRequest(async (req, res) => {
  const { tokens, title, body, data } = req.body;

  const message = {
    notification: {
      title: title,
      body: body,
    },
    data: data || {},
    tokens: tokens, // Array de tokens FCM (funciona para iOS y Android)
    apns: { // Configuración específica para iOS
      payload: {
        aps: {
          sound: 'default',
          badge: 1,
          contentAvailable: true,
        },
      },
      headers: {
        'apns-priority': '10',
      },
    },
  };

  try {
    const response = await admin.messaging().sendEachForMulticast(message);
    res.json({ success: true, response });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
```

**Nota**: Si tu Cloud Function ya funciona para Android, debería funcionar para iOS sin cambios. FCM maneja automáticamente la diferencia entre plataformas.

---

## 📝 Resumen de Pasos

1. ✅ **Obtener Key APNs de Apple**:
   - https://developer.apple.com/account/resources/authkeys/list
   - Crear key con "Apple Push Notifications service (APNs)"
   - Descargar archivo `.p8`
   - Anotar Key ID y Team ID

2. ✅ **Configurar en Firebase**:
   - Firebase Console → Project Settings → Cloud Messaging
   - Sección "Apple app configuration"
   - Subir archivo `.p8` o ingresar Key ID y Team ID
   - Ingresar Bundle ID

3. ✅ **Verificar**:
   - Estado debe ser "Active" o "Configured"
   - Probar en dispositivo iOS

---

## ❓ Solución de Problemas

### Error: "Invalid APNs authentication key"
- Verifica que el archivo `.p8` sea válido
- Verifica que el Key ID y Team ID sean correctos
- Asegúrate de que la key tenga permisos de APNs

### Error: "Bundle ID mismatch"
- Verifica que el Bundle ID en Firebase coincida con el de tu app
- Si usas PWA, usa: `com.ayuntamientocobreros.pwa`

### Las notificaciones no llegan en iOS
- Verifica que el usuario haya dado permiso para notificaciones
- Verifica que el token FCM esté guardado en Firestore
- Verifica que la Cloud Function esté desplegada
- Revisa los logs de Firebase Console → Functions

### Las notificaciones solo funcionan con la app abierta
- Esto es normal para PWAs en Safari
- Para notificaciones push completas (app cerrada), necesitas app nativa iOS

---

## 🎯 Estado Actual de tu Configuración

✅ **Ya tienes configurado**:
- FCM en el código JavaScript
- Cloud Functions para enviar notificaciones
- Tokens FCM guardados en Firestore
- Sistema de consentimiento de notificaciones

⚠️ **Falta configurar**:
- APNs en Firebase Console (este paso)
- Bundle ID de app iOS (si planeas crear app nativa)

---

## 📞 Siguiente Paso

Una vez configurado APNs:

1. **Para PWA en Safari**: Las notificaciones funcionarán cuando la app esté abierta
2. **Para App Nativa iOS**: Las notificaciones funcionarán incluso con la app cerrada

**¿Necesitas ayuda con algún paso específico?** Puedo ayudarte a:
- Obtener los certificados de Apple
- Configurar la Cloud Function
- Probar las notificaciones




