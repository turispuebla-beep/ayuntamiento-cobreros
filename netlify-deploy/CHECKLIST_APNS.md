# ✅ Checklist: Configurar APNs en Firebase

Usa este checklist para asegurarte de completar todos los pasos.

---

## 📱 Paso 1: Apple Developer Account

- [ ] Tener cuenta de Apple Developer (gratis o de pago)
  - URL: https://developer.apple.com/account/
  - Si no tienes cuenta, créala con tu Apple ID

---

## 🔑 Paso 2: Crear Authentication Key en Apple

- [ ] Ir a: https://developer.apple.com/account/resources/authkeys/list
- [ ] Hacer clic en el botón **"+"** para crear nueva key
- [ ] Nombrar la key: `Firebase APNs Key` (o nombre personalizado)
- [ ] Marcar la casilla: **"Apple Push Notifications service (APNs)"**
- [ ] Hacer clic en **"Continue"** y luego **"Register"**
- [ ] **Descargar el archivo `.p8`** (⚠️ solo se puede descargar una vez)
- [ ] **Anotar el Key ID** (ej: `ABC123XYZ`)
- [ ] **Anotar el Team ID** (aparece en la esquina superior derecha, ej: `DEF456GHI`)
- [ ] **Guardar el archivo `.p8` en un lugar seguro**

---

## 🔥 Paso 3: Configurar en Firebase Console

- [ ] Ir a: https://console.firebase.google.com/
- [ ] Seleccionar proyecto: **turisteam-80f1b**
- [ ] Ir a: ⚙️ **Settings** → **Project settings**
- [ ] Pestaña: **"Cloud Messaging"**
- [ ] Sección: **"Apple app configuration"**
- [ ] Si no existe app iOS, hacer clic en **"Add app"** → **"iOS"**
- [ ] Método: Seleccionar **"Upload"** (para archivo `.p8`)
- [ ] Subir archivo `.p8`
- [ ] Ingresar **Key ID**
- [ ] Ingresar **Team ID**
- [ ] Ingresar **Bundle ID**: `com.ayuntamientocobreros.pwa` (o el que uses)
- [ ] Hacer clic en **"Upload"** o **"Save"**

---

## ✅ Paso 4: Verificar Configuración

- [ ] Verificar que aparece ✅ verde en Firebase Console
- [ ] Estado debe decir **"Active"** o **"Configured"**
- [ ] No debe aparecer ningún error en rojo

---

## 🧪 Paso 5: Probar Notificaciones

### Para PWA en Safari (iPhone/iPad):

- [ ] Abrir sitio en Safari: https://www.ayuntamientocobreros.com
- [ ] Instalar PWA: Compartir → Añadir a pantalla de inicio
- [ ] Aceptar permiso de notificaciones cuando la app lo solicite
- [ ] Verificar que el usuario tenga `fcmToken` en Firestore
- [ ] Enviar notificación de prueba desde panel de administración
- [ ] Verificar que la notificación llegue (puede tardar unos minutos)

### Para App Nativa iOS (si la tienes):

- [ ] Compilar app en Xcode con Bundle ID correcto
- [ ] Instalar en iPhone/iPad
- [ ] Aceptar permiso de notificaciones
- [ ] Enviar notificación de prueba
- [ ] Verificar que llegue incluso con la app cerrada

---

## 📋 Información Necesaria (Anota aquí)

**Key ID**: `_________________`

**Team ID**: `_________________`

**Bundle ID**: `com.ayuntamientocobreros.pwa` (o el que uses)

**Ubicación del archivo `.p8`**: `_________________`

**Fecha de configuración**: `_________________`

---

## ❌ Problemas Comunes

### Si aparece error "Invalid APNs authentication key":
- [ ] Verificar que el archivo `.p8` sea válido
- [ ] Verificar que Key ID y Team ID sean correctos
- [ ] Verificar que la key tenga permisos de APNs

### Si las notificaciones no llegan:
- [ ] Verificar que el usuario haya dado permiso
- [ ] Verificar que el token FCM esté en Firestore
- [ ] Verificar que la Cloud Function esté desplegada
- [ ] Revisar logs en Firebase Console → Functions

### Si solo funcionan con la app abierta:
- [ ] Esto es normal para PWAs en Safari
- [ ] Para push completas, necesitas app nativa iOS

---

## ✅ Estado Final

- [ ] APNs configurado en Firebase
- [ ] Notificaciones funcionando en iOS
- [ ] Documentación guardada

---

**Fecha de finalización**: `_________________`

**Notas adicionales**:
```
_________________________________________________
_________________________________________________
_________________________________________________
```




