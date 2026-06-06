# Firebase — Ayuntamiento de Cobreros

Proyecto: **AYUNTAMIENTO DE COBREROS** · ID: `ayuntamiento-de-cobreros`

## Estado configurado en este repo

| Componente | Estado |
|------------|--------|
| Web PWA | `index.html` + `sw.js` (FCM segundo plano) + `js/push-config.js` |
| App Android | Registrada en Firebase · `android-app/app/google-services.json` (generado) |
| Cloud Functions | 12 funciones en `us-central1` |
| Firestore reglas | `firestore.rules` |
| Índices Firestore | `firestore.indexes.json` |

## 1. Consola Firebase (una vez)

1. [Consola](https://console.firebase.google.com/project/ayuntamiento-de-cobreros) → **Authentication** → Email/contraseña activado.
2. Crear usuarios admin (ej. `aytocobreros@gmail.com`, `amco@gmx.es`).
3. **Cloud Messaging** → Certificados push web: mismo par VAPID que `js/push-config.js`.
4. Primer login admin en la web: crea `admins/{uid}` si el email está en la lista blanca del código.

## 2. Secretos Cloud Functions

```bat
cd ayuntamiento-cobreros
configure-recaptcha.bat
```

Email de citas (Brevo), si usas envío real:

```bat
echo TU_API_KEY_BREVO| firebase functions:secrets:set BREVO_API_KEY
firebase deploy --only functions:notifyAppointmentEvent
```

## 3. Desplegar reglas, índices y funciones

```bat
firebase use ayuntamiento-de-cobreros
firebase deploy --only firestore:rules,firestore:indexes,storage
firebase deploy --only functions
```

## 4. APK Android

```bat
firebase apps:sdkconfig ANDROID 1:527550932354:android:d80d0845b64d6626b1db9b --out android-app\app\google-services.json
compilar_apk.bat
```

## 5. Netlify (PWA en producción)

Guía completa: **`NETLIFY-PASO-A-PASO.md`**

```bat
sync-netlify.bat
desplegar-netlify.bat
```

Dominios en Firebase → Authentication → **Authorized domains** (obligatorio):  
`www.ayuntamientodecobreros.com`, `ayuntamientodecobreros.com`, `ayuntamientodecobreros.netlify.app`, `localhost`

En [Google reCAPTCHA Admin](https://www.google.com/recaptcha/admin), mismos dominios en la lista del sitio v3.

Dominio antiguo (`www.ayuntamientocobreros.com`): opcional redirección en Netlify/Porkbun al nuevo; puede quitarse de Authorized domains cuando no se use.

## 6. Probar push

1. Registrar usuario en la web con consentimiento de notificaciones.
2. Iniciar sesión admin con Firebase Auth.
3. Enviar notificación desde el panel → debe llamar a `sendPushNotification` con token Bearer.

## URLs Cloud Functions

- `https://us-central1-ayuntamiento-de-cobreros.cloudfunctions.net/sendPushNotification`
- `https://us-central1-ayuntamiento-de-cobreros.cloudfunctions.net/validateRecaptcha`
- `https://us-central1-ayuntamiento-de-cobreros.cloudfunctions.net/createAppointmentAtomic`
