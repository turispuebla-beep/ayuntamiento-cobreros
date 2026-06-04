# Sistema de notificaciones push — Ayuntamiento de Cobreros

Proyecto Firebase: **ayuntamiento-de-cobreros**

## Modo actual (Firebase completo)

- Registro web/APK → `users/{uid}` en Firestore con `fcmToken` y `notificationConsent`
- Envío admin → Cloud Function `sendPushNotification` (requiere sesión Firebase admin + Bearer token)
- PWA → `sw.js` con Firebase Messaging en segundo plano + VAPID en `js/push-config.js`
- Sincronización admin → `backups/localStorage_completo` en Firestore

## Probar en local

1. Servir la web por HTTPS o `localhost` (necesario para Service Worker y FCM).
2. Permitir notificaciones en el navegador.
3. Registrar usuario con consentimiento de notificaciones.
4. Iniciar sesión admin con Firebase Authentication.
5. Enviar notificación desde el panel de administración.

## Despliegue

Ver **FIREBASE-SETUP.md** para secretos, índices y `sync-netlify.bat`.

## Endpoints

```
https://us-central1-ayuntamiento-de-cobreros.cloudfunctions.net/sendPushNotification
https://us-central1-ayuntamiento-de-cobreros.cloudfunctions.net/validateRecaptcha
```
