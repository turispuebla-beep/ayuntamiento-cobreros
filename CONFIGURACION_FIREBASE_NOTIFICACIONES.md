# 🔥 Configuración de Firebase para Notificaciones

## 📋 **Estado Actual del Sistema**

### ✅ **Lo que está bien configurado:**
- ✅ Sistema de notificaciones push implementado
- ✅ App móvil configurada SOLO para notificaciones (correcto)
- ✅ Service Worker para notificaciones en segundo plano
- ✅ Integración con Firebase Firestore
- ✅ Sistema de consentimiento de usuarios
- ✅ Notificaciones automáticas al publicar noticias/bandos

### ⚠️ **Lo que necesita configuración:**

## 🔧 **1. Configurar Firebase Console**

### **Paso 1: Obtener las claves de Firebase**
1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto `turisteam-80f1b`
3. Ve a **Configuración del proyecto** (⚙️)
4. En la pestaña **General**, busca **Tus aplicaciones**
5. Copia las claves de tu aplicación web

### **Paso 2: Actualizar configuración en `index.html`**
```javascript
const firebaseConfig = {
    apiKey: "TU_API_KEY_REAL_AQUI", // ⚠️ Reemplazar
    authDomain: "turisteam-80f1b.firebaseapp.com",
    projectId: "turisteam-80f1b",
    storageBucket: "turisteam-80f1b.appspot.com",
    messagingSenderId: "623846192437",
    appId: "TU_APP_ID_REAL_AQUI" // ⚠️ Reemplazar
};
```

### **Paso 3: Generar VAPID Key**
1. En Firebase Console, ve a **Cloud Messaging**
2. En la pestaña **Web Push certificates**
3. Haz clic en **Generate key pair**
4. Copia la clave generada
5. Actualiza en `index.html`:
```javascript
vapidKey: 'TU_VAPID_KEY_REAL_AQUI' // ⚠️ Reemplazar
```

## 📱 **2. Configurar App Móvil**

### **Archivos a actualizar:**
- `notification-app/app.js`
- `notification-app/sw.js`

### **Configuración necesaria:**
```javascript
const firebaseConfig = {
    apiKey: "TU_API_KEY_REAL_AQUI",
    authDomain: "turisteam-80f1b.firebaseapp.com",
    projectId: "turisteam-80f1b",
    storageBucket: "turisteam-80f1b.appspot.com",
    messagingSenderId: "623846192437",
    appId: "TU_APP_ID_REAL_AQUI"
};
```

## 🚀 **3. Desplegar Firebase Functions**

### **Configurar Gmail:**
```bash
# Generar App Password en aytocobrero@gmail.com
firebase functions:config:set gmail.password="tu_app_password"
```

### **Desplegar:**
```bash
cd firebase-functions
npm install
firebase deploy --only functions
```

## ✅ **4. Verificar Funcionamiento**

### **Test de notificaciones:**
1. Abre la web en móvil
2. Acepta permisos de notificaciones
3. Publica una noticia desde el panel admin
4. Verifica que llegue la notificación

### **Test de app móvil:**
1. Abre la app móvil
2. Regístrate como usuario
3. Verifica que aparezca en Firebase Console > Authentication
4. Envía notificación desde web
5. Verifica que llegue a la app

## 📊 **5. Monitoreo**

### **Firebase Console:**
- **Authentication**: Ver usuarios registrados
- **Firestore**: Ver notificaciones guardadas
- **Cloud Messaging**: Ver estadísticas de envío
- **Functions**: Ver logs de funciones

## 🎯 **Resumen de Funcionalidades**

### **App Móvil (SOLO notificaciones):**
- ✅ Registro de usuarios
- ✅ Recepción de notificaciones push
- ✅ Notificaciones en segundo plano
- ✅ Historial de notificaciones

### **Web (Panel Admin):**
- ✅ Envío de notificaciones
- ✅ Notificaciones automáticas (noticias/bandos)
- ✅ Filtrado por localidades
- ✅ Gestión de usuarios

## ⚠️ **Importante:**
- La app móvil está configurada SOLO para notificaciones (correcto)
- No tiene funcionalidades adicionales innecesarias
- Se enfoca únicamente en notificaciones oficiales del ayuntamiento
- Cumple con el propósito específico solicitado

## 🔗 **Enlaces útiles:**
- [Firebase Console](https://console.firebase.google.com/)
- [Documentación FCM](https://firebase.google.com/docs/cloud-messaging)
- [Service Worker Guide](https://developers.google.com/web/fundamentals/primers/service-workers)
