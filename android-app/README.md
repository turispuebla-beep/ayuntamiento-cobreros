# 📱 APK Ayuntamiento de Cobreros - TURISTEAM

## 🚀 Aplicación Android completa con sistema de notificaciones push

### 📋 Características implementadas:

#### **👥 Sistema de Usuarios:**
- ✅ **Login con credenciales de la web** (email/contraseña)
- ✅ **Recordar credenciales** automáticamente
- ✅ **Auto-login** al abrir la aplicación
- ✅ **Verificación en Firebase Firestore**
- ✅ **Sincronización con la web**

#### **📱 Panel de Administración:**
- ✅ **Super Admin oculto** (amco@gmx.es / 533712)
- ✅ **Gestión de notificaciones** desde la APK
- ✅ **Envío por localidades específicas**
- ✅ **Selección múltiple de localidades**
- ✅ **Botones "Seleccionar Todas" / "Deseleccionar Todas"**
- ✅ **Portal de administradores** (solo super admin)

#### **🔄 Sincronización en Tiempo Real:**
- ✅ **Firebase Firestore** como base de datos compartida
- ✅ **Notificaciones push** instantáneas
- ✅ **Usuarios sincronizados** entre web y APK
- ✅ **Configuración unificada**

### 🏗️ Estructura del proyecto:

```
android-app/
├── app/
│   ├── src/main/
│   │   ├── java/com/turisteam/ayuntamientocobreros/
│   │   │   ├── MainActivity.java                    # Pantalla de login
│   │   │   ├── AdminPanelActivity.java              # Panel de administración
│   │   │   ├── NotificationManagerActivity.java     # Gestión de notificaciones
│   │   │   ├── MyFirebaseMessagingService.java      # Servicio de notificaciones
│   │   │   ├── RegisterActivity.java                # Registro de usuarios
│   │   │   ├── UserDashboardActivity.java           # Dashboard del usuario
│   │   │   ├── AdminLoginActivity.java              # Login de administradores
│   │   │   ├── AdminManagementActivity.java         # Gestión de administradores
│   │   │   └── StatisticsActivity.java              # Estadísticas
│   │   ├── res/
│   │   │   ├── layout/                              # Layouts XML
│   │   │   ├── values/                              # Strings, colors, etc.
│   │   │   └── drawable/                            # Iconos e imágenes
│   │   └── AndroidManifest.xml                      # Configuración de la app
│   ├── build.gradle                                 # Dependencias
│   └── google-services.json                         # Configuración Firebase
├── build.gradle
└── settings.gradle
```

### 🔑 Configuración necesaria:

#### **1. Firebase:**
- Proyecto: TURISTEAM (turisteam-80f1b)
- Firestore Database habilitado
- Cloud Messaging habilitado
- Authentication habilitado

#### **2. Archivos de configuración:**
- `google-services.json` (descargar de Firebase Console)
- Configurar reglas de Firestore
- Configurar VAPID keys para FCM

### 📱 Funcionalidades de la APK:

#### **Para Usuarios:**
1. **Login** con email/contraseña de la web
2. **Auto-login** automático
3. **Recibir notificaciones** push
4. **Dashboard** con información personal

#### **Para Administradores:**
1. **Panel de administración** completo
2. **Envío de notificaciones** por localidades
3. **Gestión de administradores** (solo super admin)
4. **Estadísticas** de usuarios y notificaciones

#### **Para Super Admin (TURISTEAM):**
1. **Acceso completo** al sistema
2. **Gestión de administradores**
3. **Configuración del sistema**
4. **Estadísticas avanzadas**

### 🌐 Integración con la Web:

#### **Base de Datos Compartida:**
- **Firebase Firestore** como base de datos única
- **Colección "users"** con datos de usuarios
- **Colección "notifications"** con notificaciones enviadas
- **Colección "admins"** con administradores

#### **Sincronización:**
- **Usuarios** sincronizados entre web y APK
- **Notificaciones** enviadas desde web o APK
- **Configuración** unificada
- **Tiempo real** con Firestore

### 🚀 Instalación y Uso:

#### **1. Configurar Android Studio:**
```bash
# Importar proyecto
# Configurar Firebase
# Descargar google-services.json
# Sincronizar proyecto
```

#### **2. Compilar APK:**
```bash
# Build > Generate Signed Bundle/APK
# Seleccionar APK
# Configurar firma
# Compilar
```

#### **3. Instalar en dispositivos:**
- **APK** se descarga desde la web del ayuntamiento
- **Instalación** manual (fuera de Google Play)
- **Permisos** de instalación de fuentes desconocidas

### 🔒 Seguridad:

#### **Autenticación:**
- **Firebase Authentication** para usuarios
- **Super admin oculto** con credenciales fijas
- **Verificación** en Firestore
- **Tokens FCM** seguros

#### **Permisos:**
- **Solo usuarios registrados** pueden usar la APK
- **Administradores** con permisos específicos
- **Super admin** con acceso completo

### 📊 Flujo del Sistema:

#### **1. Usuario se registra en la web:**
- Selecciona localidades de interés
- Da consentimiento para notificaciones
- Se guarda en Firebase Firestore

#### **2. Usuario instala la APK:**
- Se loguea con credenciales de la web
- Se verifica en Firestore
- Se activa auto-login

#### **3. Administrador envía notificación:**
- Desde web o APK
- Selecciona localidades
- Se envía via Firebase Cloud Messaging

#### **4. Usuario recibe notificación:**
- Push notification en el dispositivo
- Al hacer clic, abre la APK
- Información específica de su localidad

### 🎯 Ventajas del Sistema:

#### **Para el Ayuntamiento:**
- **Comunicación directa** con ciudadanos
- **Notificaciones específicas** por localidad
- **Gestión centralizada** desde web o APK
- **Estadísticas** de usuarios y notificaciones

#### **Para los Ciudadanos:**
- **Notificaciones relevantes** de su localidad
- **Información instantánea** del ayuntamiento
- **Fácil acceso** desde el móvil
- **Auto-login** sin complicaciones

---
**Desarrollado por TURISTEAM** 🚀
**Sistema profesional para Ayuntamiento de Cobreros** 🏛️