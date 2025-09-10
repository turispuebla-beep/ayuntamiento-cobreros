# 📱 APK Ayuntamiento de Cobreros - TURISTEAM

## 🚀 Aplicación Android para notificaciones push

### 📋 Características:
- **Notificaciones push** integradas con Firebase
- **Sincronización** con la web del ayuntamiento
- **Interfaz nativa** Android
- **Gestión de TURISTEAM** como administrador

### 🔧 Configuración necesaria:

#### 1. Firebase Cloud Messaging:
- Proyecto: TURISTEAM (turisteam-80f1b)
- Server Key: [Obtener de Firebase Console]
- VAPID Key: [Generar en Firebase Console]

#### 2. Archivos de configuración:
- `google-services.json` (descargar de Firebase)
- `firebase-messaging-sw.js` (service worker)

### 📱 Funcionalidades implementadas:
- ✅ Recibir notificaciones push
- ✅ Mostrar notificaciones nativas
- ✅ Abrir web al hacer clic
- ✅ Gestión de tokens FCM
- ✅ Sincronización con web

### 🏗️ Estructura del proyecto:
```
android-app/
├── app/
│   ├── src/main/
│   │   ├── java/com/turisteam/ayuntamientocobreros/
│   │   │   ├── MainActivity.java
│   │   │   ├── MyFirebaseMessagingService.java
│   │   │   └── NotificationHelper.java
│   │   ├── res/
│   │   │   ├── layout/
│   │   │   ├── values/
│   │   │   └── drawable/
│   │   └── AndroidManifest.xml
│   ├── build.gradle
│   └── google-services.json
├── build.gradle
└── settings.gradle
```

### 🔑 Claves necesarias:
1. **API Key de Firebase**
2. **Server Key de FCM**
3. **VAPID Key**
4. **App ID de Firebase**

### 📲 Instalación:
1. Descargar Android Studio
2. Importar proyecto
3. Configurar Firebase
4. Compilar APK
5. Instalar en dispositivos

### 🌐 Integración con web:
- La web envía notificaciones via Firebase
- La APK recibe y muestra las notificaciones
- Sincronización automática de datos

### 👥 Administración TURISTEAM:
- Acceso completo al sistema
- Gestión de notificaciones
- Monitoreo de usuarios
- Estadísticas de uso

---
**Desarrollado por TURISTEAM** 🚀
