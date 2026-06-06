# Generar App para iOS con PWA Builder

## 📱 ¿PWA Builder puede generar apps para iOS?

**Sí, pero con limitaciones importantes:**

1. **PWA Builder NO genera directamente un archivo `.ipa` instalable**
2. **Genera un proyecto Xcode** que debes compilar tú mismo
3. **Requiere una cuenta de desarrollador de Apple** ($99/año) para distribuir
4. **Necesitas un Mac con Xcode** para compilar

---

## 🚀 Proceso Completo

### Paso 1: Generar el Proyecto iOS con PWA Builder

1. **Visita PWA Builder**: https://www.pwabuilder.com/
2. **Ingresa tu URL**: `https://www.ayuntamientocobreros.com`
3. **Haz clic en "Build My PWA"**
4. **Selecciona "iOS"**
5. **Descarga el proyecto Xcode** (archivo `.zip`)

### Paso 2: Configurar en Xcode (Requiere Mac)

1. **Extrae el ZIP** descargado
2. **Abre Xcode** (versión 12.0 o superior)
3. **Abre el proyecto**: `platforms/ios/YourApp.xcworkspace`
4. **Configura tu cuenta de desarrollador**:
   - Xcode → Preferences → Accounts
   - Agrega tu Apple ID
   - Selecciona tu equipo de desarrollo

5. **Configura el Bundle Identifier**:
   - Selecciona el proyecto en el navegador
   - Ve a "Signing & Capabilities"
   - Cambia el Bundle ID a algo único: `com.ayuntamientocobreros.ios`

6. **Configura los certificados**:
   - Xcode intentará generar automáticamente los certificados
   - Si tienes una cuenta de desarrollador, se configurarán automáticamente

### Paso 3: Compilar y Probar

#### Para Probar en tu iPhone (Gratis - Limitado a 7 días):

1. **Conecta tu iPhone** al Mac por USB
2. **Selecciona tu dispositivo** en Xcode (arriba, junto al botón Play)
3. **Haz clic en "Run"** (▶️)
4. **Confía en el desarrollador** en tu iPhone:
   - Configuración → General → Gestión de dispositivos
   - Toca tu Apple ID
   - Toca "Confiar"

#### Para Distribuir (Requiere cuenta de desarrollador $99/año):

1. **Archivo → Producto → Archive**
2. **Distribuir App** → **App Store Connect** o **Ad Hoc**
3. **Sigue el asistente** para subir a App Store o generar IPA

---

## 🔔 ¿Funcionarían los Avisos/Notificaciones Push en iOS?

### ✅ **SÍ, pero necesitas configuración adicional:**

#### 1. **Notificaciones Locales** (Funcionan sin configuración extra)
- ✅ Funcionan inmediatamente
- ✅ No requieren certificados
- ✅ Se muestran aunque la app esté cerrada

#### 2. **Notificaciones Push** (Requieren configuración)

**Estado actual:**
- ✅ Tu app ya tiene FCM (Firebase Cloud Messaging) configurado
- ⚠️ **Pero necesitas configurar APNs (Apple Push Notification service) en Firebase**

**Pasos para habilitar Push en iOS:**

1. **Obtener certificado APNs de Apple**:
   - Ve a https://developer.apple.com/account/
   - Certificates, Identifiers & Profiles → Keys
   - Crea una nueva Key con "Apple Push Notifications service (APNs)"
   - Descarga el archivo `.p8`
   - Anota el **Key ID** y el **Team ID**

2. **Configurar APNs en Firebase**:
   - Ve a Firebase Console → Project Settings → Cloud Messaging
   - Pestaña "Apple app configuration"
   - Sube el certificado `.p8` o configura con Key ID y Team ID
   - Ingresa el Bundle ID de tu app iOS

3. **Actualizar tu Cloud Function** (si usas una):
   - Asegúrate de que tu función de envío de notificaciones soporte tokens iOS
   - FCM maneja automáticamente la diferencia entre Android e iOS

**Código de ejemplo para Cloud Function:**

```javascript
// En tu Cloud Function que envía notificaciones
const admin = require('firebase-admin');

async function sendPushNotification(userToken, title, body) {
  const message = {
    notification: {
      title: title,
      body: body,
    },
    token: userToken, // FCM token (funciona igual para iOS y Android)
    apns: { // Configuración específica para iOS
      payload: {
        aps: {
          sound: 'default',
          badge: 1,
        },
      },
    },
  };

  try {
    const response = await admin.messaging().send(message);
    console.log('Notificación enviada:', response);
    return response;
  } catch (error) {
    console.error('Error enviando notificación:', error);
    throw error;
  }
}
```

---

## 📋 Resumen: ¿Qué Funciona y Qué No?

| Funcionalidad | iOS PWA (Safari) | iOS App (PWA Builder) |
|--------------|------------------|----------------------|
| **Instalación** | ✅ Sí (desde Safari) | ⚠️ Requiere Mac + Xcode + cuenta dev |
| **Notificaciones Locales** | ✅ Sí | ✅ Sí |
| **Notificaciones Push** | ⚠️ Limitadas | ✅ Sí (con APNs configurado) |
| **Funcionalidad Web** | ✅ 100% | ✅ 100% |
| **Actualizaciones** | ✅ Automáticas | ⚠️ Requiere recompilar |
| **App Store** | ❌ No | ✅ Sí (con cuenta dev) |

---

## 💡 Recomendación

### Opción 1: PWA en Safari (Más Fácil - Gratis)
- ✅ Los usuarios pueden instalar desde Safari
- ✅ Funciona sin cuenta de desarrollador
- ✅ Se actualiza automáticamente
- ⚠️ Notificaciones push limitadas (solo cuando la app está abierta)

### Opción 2: App Nativa iOS (Más Completa - Requiere Inversión)
- ✅ Notificaciones push completas
- ✅ Disponible en App Store
- ✅ Mejor experiencia de usuario
- ❌ Requiere Mac + Xcode + $99/año
- ❌ Necesitas recompilar para actualizaciones

---

## 🔧 Configuración Actual de tu App

Tu app ya está preparada para iOS:

✅ **Manifest.json** configurado con iconos iOS
✅ **Meta tags** para iOS (`apple-mobile-web-app-capable`)
✅ **Apple Touch Icons** configurados
✅ **FCM** configurado (solo falta APNs en Firebase)

**Para habilitar push en iOS, solo necesitas:**
1. Configurar APNs en Firebase Console
2. (Opcional) Compilar la app nativa con PWA Builder

---

## 📝 Pasos Rápidos para Habilitar Push en iOS

1. **Obtener certificado APNs**:
   ```
   https://developer.apple.com/account/resources/authkeys/list
   ```

2. **Configurar en Firebase**:
   ```
   Firebase Console → Project Settings → Cloud Messaging → Apple app configuration
   ```

3. **Probar**:
   - Los tokens FCM funcionan igual en iOS y Android
   - Tu código actual debería funcionar sin cambios

---

## ❓ Preguntas Frecuentes

**¿Puedo generar el APK para iOS sin Mac?**
- No, necesitas Xcode que solo está disponible en macOS

**¿Puedo usar un servicio en la nube para compilar?**
- Sí, puedes usar servicios como:
  - **Codemagic** (https://codemagic.io/)
  - **Bitrise** (https://www.bitrise.io/)
  - **AppCircle** (https://appcircle.io/)

**¿Las notificaciones funcionan en iOS sin app nativa?**
- Notificaciones locales: ✅ Sí
- Notificaciones push: ⚠️ Limitadas (solo cuando la PWA está abierta)

**¿Vale la pena crear la app nativa para iOS?**
- Si tienes muchos usuarios iOS: ✅ Sí
- Si quieres estar en App Store: ✅ Sí
- Si solo quieres funcionalidad básica: ⚠️ La PWA en Safari es suficiente

---

## 🎯 Conclusión

**Para iOS, tienes dos opciones:**

1. **PWA en Safari** (Recomendado para empezar):
   - Gratis
   - Fácil de mantener
   - Se actualiza automáticamente
   - Notificaciones push limitadas

2. **App Nativa** (Para funcionalidad completa):
   - Requiere inversión ($99/año + Mac)
   - Notificaciones push completas
   - Disponible en App Store
   - Mejor experiencia de usuario

**Los avisos funcionarán en ambas opciones**, pero con la app nativa tendrás notificaciones push completas incluso cuando la app está cerrada.




