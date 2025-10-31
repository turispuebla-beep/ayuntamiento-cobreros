# 🔥 Configurar Firebase para Ayuntamiento de Cobreros - Paso a Paso

## 📋 **Pasos para Configurar Firebase:**

### **Paso 1: Ir a Firebase Console**
1. Abre [Firebase Console](https://console.firebase.google.com/)
2. Inicia sesión con tu cuenta de Google
3. Busca el proyecto **TURISTEAM** (o `turisteam-80f1b`)

### **Paso 2: Crear App Web (si no existe)**
1. En el proyecto, haz clic en el icono **🌐</>** (Add app / Agregar app)
2. Selecciona **Web** (icono de `</>`)
3. Registra la app:
   - **Nickname:** `Ayuntamiento Cobreros Web`
   - **Firebase Hosting:** (puedes dejarlo sin marcar por ahora)
4. Haz clic en **Register app**

### **Paso 3: Copiar Configuración de Firebase**
Después de registrar la app, Firebase te mostrará un código como este:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "turisteam-80f1b.firebaseapp.com",
  projectId: "turisteam-80f1b",
  storageBucket: "turisteam-80f1b.appspot.com",
  messagingSenderId: "623846192437",
  appId: "1:623846192437:web:XXXXXXXXXXXXXXXX"
};
```

### **Paso 4: Copiar los Valores Específicos**
Copia estos **DOS valores exactos**:

1. **apiKey**: El valor completo que empieza con `AIzaSy...`
2. **appId**: El valor completo que tiene formato `1:623846192437:web:XXXXX`

### **Paso 5: Generar VAPID Key (para Notificaciones Push)**
1. En Firebase Console, ve a **⚙️ Configuración** → **Cloud Messaging**
2. Baja hasta **Web Push certificates**
3. Si ya existe una VAPID key, cópiala
4. Si no existe, haz clic en **Generate key pair**
5. Copia la **VAPID key** generada (será una cadena larga)

### **Paso 6: Habilitar Servicios Necesarios**
1. **Firestore Database:**
   - Ve a **Firestore Database**
   - Si no existe, crea una base de datos
   - Modo: **Production** o **Test** (para desarrollo)
   - Ubicación: Elige la más cercana (ej: `europe-west`)

2. **Cloud Messaging:**
   - Ya debería estar habilitado automáticamente

3. **Authentication (opcional para inicio):**
   - Ve a **Authentication** → **Get started**
   - Habilita **Email/Password** si quieres login de usuarios

### **Paso 7: Configurar Reglas de Firestore**
1. Ve a **Firestore Database** → **Reglas**
2. Para desarrollo, usa estas reglas:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true; // ⚠️ Solo para desarrollo
    }
  }
}
```
3. ⚠️ **IMPORTANTE:** Para producción, configura reglas más restrictivas

### **Paso 8: Obtener los Valores para el Código**
Una vez completados los pasos, tendrás:

✅ **apiKey**: `AIzaSy...` (valor completo)
✅ **appId**: `1:623846192437:web:XXXXX` (valor completo)  
✅ **VAPID Key**: `BEl62iUYgUivxIkv69yViEuiBIa40HI8lF7vQyVpX4Bw` (o la nueva que generes)

### **Paso 9: Actualizar el Código**
Una vez tengas los valores, actualiza:
- `index.html` (líneas ~31 y ~36)
- `notification-app/app.js` (si usas app móvil separada)

---

## 📝 **Valores que Ya Tienes Configurados:**
- ✅ `projectId`: `turisteam-80f1b`
- ✅ `authDomain`: `turisteam-80f1b.firebaseapp.com`
- ✅ `storageBucket`: `turisteam-80f1b.appspot.com`
- ✅ `messagingSenderId`: `623846192437`

## ⚠️ **Solo Necesitas Obtener:**
- 🔑 `apiKey` (desde Firebase Console después de crear la app)
- 🔑 `appId` (desde Firebase Console después de crear la app)
- 🔑 `VAPID Key` (desde Cloud Messaging, ya tienes una configurada)

---

## 🎯 **Resumen Rápido:**
1. Ve a Firebase Console → Proyecto TURISTEAM
2. Crea app web (icono `</>`)
3. Copia `apiKey` y `appId`
4. Ve a Cloud Messaging → Copia VAPID key
5. Pásame esos valores y actualizo el código automáticamente

¡Listo! 🚀

