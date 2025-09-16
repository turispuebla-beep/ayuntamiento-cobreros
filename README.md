# 🏛️ Ayuntamiento de Cobreros - Sistema Completo

## 📋 **Descripción del Proyecto**

Sistema completo de gestión municipal para el **Ayuntamiento de Cobreros** con notificaciones push bidireccionales, PWA para iPhone y APK Android nativa.

## 🎯 **Características Principales**

### **🌐 Web del Ayuntamiento**
- **PWA completa** instalable en iPhone y Android
- **Panel de administración** para gestión municipal
- **Sistema de notificaciones** push bidireccional
- **13 localidades** del Ayuntamiento de Cobreros
- **Base de datos** sólida en Firebase Firestore
- **Notificaciones** con archivos adjuntos
- **Sistema de tarjetas configurables** para Cultura y Ocio
- **Teléfonos de Interés** con tarjeta expandible configurable

### **📱 APK Android**
- **App nativa** para Android
- **Registro de usuarios** con localidades
- **Panel de administración** integrado
- **Notificaciones** con escudo de Cobreros
- **Sincronización** en tiempo real con la web
- **Super administrador** TURISTEAM

### **🍎 PWA para iPhone**
- **Instalable** desde Safari
- **Notificaciones push** nativas
- **Funciona como app** nativa
- **Service Worker** completo
- **Banner de instalación** automático

## 🔄 **Sistema de Notificaciones Bidireccional Completo**

### **Flujo Completo:**
- **WEB → APK** ✅ (Web envía notificación a APK)
- **APK → APK** ✅ (APK envía notificación a otro APK)
- **APK → WEB** ✅ (APK envía notificación a Web)
- **WEB → WEB** ✅ (Web envía notificación a Web)
- **PWA iPhone** recibe todas ✅ (iPhone recibe todas las notificaciones)

### **Arquitectura del Sistema:**
```
📱 APK Android ←→ 🔥 Firebase FCM ←→ 🌐 Web/PWA
     ↕️                    ↕️                    ↕️
📱 PWA iPhone ←→ 🔥 Firebase FCM ←→ 🌐 Web/PWA
```

### **Funcionalidades:**
- **Filtrado por localidades** específicas (13 pueblos)
- **Archivos adjuntos** en notificaciones (PDF, imágenes)
- **Tipos de notificación:** General, Emergencia, Cita, Evento, Bando, Incidencia
- **Estadísticas** en tiempo real de entrega
- **Sistema de consentimiento** de usuarios
- **Sincronización bidireccional** entre todas las plataformas

## 🏘️ **Localidades del Ayuntamiento**

1. **Cobreros** (capital)
2. **Avedillo de Sanabria**
3. **Barrio de Lomba**
4. **Castro de Sanabria**
5. **Limianos**
6. **Quintana de Sanabria**
7. **Riego de Lomba**
8. **San Martín del Terroso**
9. **San Miguel de Lomba**
10. **San Román de Sanabria**
11. **Santa Colomba**
12. **Sotillo**
13. **Terroso**

## 🚀 **Tecnologías Utilizadas**

### **Frontend:**
- **HTML5** - Estructura semántica
- **CSS3** - Estilos modernos y responsivos
- **JavaScript ES6+** - Funcionalidades dinámicas
- **PWA** - Progressive Web App
- **Service Worker** - Cache y notificaciones

### **Backend:**
- **Firebase** - Base de datos y autenticación
- **Firestore** - Base de datos NoSQL
- **Firebase Cloud Messaging** - Notificaciones push
- **Firebase Auth** - Autenticación de usuarios

### **Mobile:**
- **Android Studio** - Desarrollo nativo
- **Java** - Lógica de la aplicación
- **Firebase SDK** - Integración con servicios
- **Material Design** - UI/UX moderna

## 📁 **Estructura del Proyecto**

```
ayuntamiento-cobreros/
├── 📄 index.html                 # Página principal
├── 📄 manifest.json              # Configuración PWA
├── 📄 sw.js                      # Service Worker
├── 📁 css/
│   └── 📄 styles.css             # Estilos principales
├── 📁 js/
│   └── 📄 script.js              # JavaScript principal
├── 📁 images/                    # Imágenes y iconos
├── 📁 android-app/               # APK Android
│   ├── 📁 app/src/main/java/     # Código Java
│   ├── 📁 app/src/main/res/      # Recursos Android
│   └── 📁 app/src/main/AndroidManifest.xml
├── 📄 NETLIFY-DEPLOYMENT.md      # Guía de despliegue
├── 📄 PWA-README.md              # Guía PWA
└── 📄 README.md                  # Este archivo
```

## 🔧 **Configuración e Instalación**

### **1. 🌐 Despliegue Web (Netlify)**
```bash
# Ver NETLIFY-DEPLOYMENT.md para instrucciones detalladas
1. Subir archivos a Netlify
2. Configurar Firebase
3. Configurar dominio personalizado
```

### **2. 📱 Compilación APK (Android Studio)**
```bash
# Ver android-app/README.md para instrucciones detalladas
1. Abrir proyecto en Android Studio
2. Configurar Firebase
3. Crear iconos de la app
4. Compilar APK
```

### **3. 🔥 Configuración Firebase**
```javascript
// Configuración en index.html
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "turisteam-80f1b.firebaseapp.com",
  projectId: "turisteam-80f1b",
  storageBucket: "turisteam-80f1b.appspot.com",
  messagingSenderId: "623846192437",
  appId: "TU_APP_ID"
};
```

## 👥 **Usuarios y Permisos**

### **👤 Usuarios Ciudadanos:**
- **Registro** con email y contraseña
- **Selección** de localidades de interés
- **Consentimiento** para notificaciones
- **Recepción** de notificaciones push

### **👨‍💼 Administradores:**
- **Login** con credenciales especiales
- **Envío** de notificaciones
- **Gestión** de usuarios
- **Estadísticas** en tiempo real

### **🔐 Super Administrador:**
- **Email:** amco@gmx.es
- **Contraseña:** 533712
- **Acceso** completo al sistema
- **Gestión** de otros administradores

## 📊 **Funcionalidades del Sistema**

### **🌐 Panel Web:**
- ✅ **Gestión de servicios** municipales
- ✅ **Sistema de tarjetas configurables** para Cultura y Ocio
- ✅ **Envío de notificaciones** push
- ✅ **Estadísticas** de usuarios
- ✅ **Configuración** de secciones
- ✅ **Gestión** de administradores
- ✅ **Base de datos** de usuarios

### **📱 APK Android:**
- ✅ **Registro** de usuarios
- ✅ **Login** automático
- ✅ **Panel de administración**
- ✅ **Envío de notificaciones**
- ✅ **Recepción** de notificaciones
- ✅ **Sincronización** con web

### **🍎 PWA iPhone:**
- ✅ **Instalación** desde Safari
- ✅ **Notificaciones** push nativas
- ✅ **Funcionalidad** completa
- ✅ **Sincronización** con web y APK

## 🃏 **Sistema de Tarjetas Configurables**

### **🎭 Cultura y Ocio:**
- **Tarjetas personalizables** con títulos, descripciones e iconos
- **Colores personalizables** para cada tarjeta
- **Elementos configurables** dentro de cada tarjeta
- **Títulos con emojis** para mayor atractivo visual
- **Enlaces opcionales** (internos #enlace o externos https://...)
- **Orden personalizable** de elementos
- **Activación/desactivación** de tarjetas

### **📋 Gestión desde Administración:**
- **Panel intuitivo** para configurar tarjetas
- **Formularios avanzados** con validación
- **Preview en tiempo real** de cambios
- **Modales especializados** para cada función
- **Persistencia automática** en localStorage
- **Actualización instantánea** en la página principal

### **🎨 Características Visuales:**
- **Diseño moderno** con efectos hover
- **Iconos FontAwesome** personalizables
- **Bordes de colores** distintivos
- **Layout responsive** para móviles
- **Transiciones suaves** y animaciones

## 📞 **Sistema de Teléfonos de Interés**

### **🎯 Características Principales:**
- **Tarjeta única expandible** con diseño moderno
- **Sistema de elementos configurables** por categorías
- **Tipos de elementos**:
  - **📞 Teléfonos múltiples**: Lista de números de teléfono (ej: Taxis)
  - **🏢 Información de servicio**: Datos completos (ej: ITV con dirección, horarios)
  - **📄 Documento/Foto**: Información básica + archivo adjunto (ej: Renovación DNI)

### **⚙️ Gestión desde Administración:**
- **Panel especializado** para configurar teléfonos de interés
- **Formularios dinámicos** según el tipo de elemento
- **Datos estructurados** con formato Nombre|Valor
- **Enlaces opcionales** a documentos PDF y fotos
- **Orden personalizable** de elementos
- **Activación/desactivación** individual de elementos

### **🎨 Interfaz de Usuario:**
- **Tarjeta principal** con emoji y descripción
- **Expansión suave** al hacer clic
- **Elementos individuales** con sus propios datos
- **Enlaces telefónicos** clickeables (tel:)
- **Enlaces a documentos** y fotos
- **Diseño responsive** para móviles

### **📋 Ejemplos de Configuración:**
- **🚕 Taxis**: Múltiples números de taxis locales
- **🚗 ITV**: Dirección, teléfono, horarios de apertura
- **🆔 Renovación DNI**: Teléfono, horarios + documento PDF con días disponibles

## 🔔 **Sistema de Notificaciones Bidireccional**

### **Tipos de Notificación:**
- **🏛️ General** - Información general del ayuntamiento
- **🚨 Emergencia** - Alertas urgentes (rojo, prioridad alta)
- **📅 Cita** - Recordatorios de citas (verde, prioridad alta)
- **🎉 Evento** - Eventos municipales (naranja, prioridad alta)
- **📢 Bando** - Bandos oficiales (morado, prioridad alta)
- **⚠️ Incidencia** - Reportes de incidencias (amarillo, prioridad media)

### **Características:**
- **Escudo de Cobreros** en todas las notificaciones
- **Archivos adjuntos** (PDF, imágenes, documentos)
- **Filtrado por localidades** específicas (13 pueblos)
- **Estadísticas** de entrega en tiempo real
- **Historial** de notificaciones
- **Sincronización bidireccional** entre todas las plataformas

### **Flujos de Notificación:**
1. **🌐 Web → 📱 APK:** Administrador web envía notificación a usuarios APK
2. **📱 APK → 📱 APK:** Usuario APK envía notificación a otro usuario APK
3. **📱 APK → 🌐 Web:** Usuario APK envía notificación a administrador web
4. **🌐 Web → 🌐 Web:** Administrador web envía notificación a otros administradores web
5. **📱 PWA iPhone:** Recibe todas las notificaciones de cualquier origen

### **Arquitectura Técnica:**
- **Firebase Cloud Messaging (FCM)** como backbone
- **Firestore** para almacenamiento de notificaciones
- **Service Worker** para PWA y notificaciones web
- **Firebase SDK** para APK Android
- **Sincronización en tiempo real** entre todas las plataformas

## 🚀 **Despliegue y Producción**

### **🌐 Web (Netlify):**
- **URL:** https://ayuntamientocobreros.netlify.app
- **HTTPS:** Automático
- **CDN:** Global
- **Actualizaciones:** Automáticas

### **📱 APK Android:**
- **Distribución:** Descarga directa desde la web
- **Actualizaciones:** Manuales
- **Compatibilidad:** Android 5.0+

### **🍎 PWA iPhone:**
- **Instalación:** Desde Safari
- **Actualizaciones:** Automáticas
- **Compatibilidad:** iOS 11.3+

## 📈 **Estadísticas y Monitoreo**

### **Métricas Disponibles:**
- **Usuarios registrados** por localidad
- **Notificaciones enviadas** por tipo
- **Tasa de entrega** de notificaciones
- **Usuarios activos** por plataforma
- **Estadísticas** de uso por localidad

## 🔒 **Seguridad y Privacidad**

### **Medidas de Seguridad:**
- **HTTPS** en todas las comunicaciones
- **Autenticación** Firebase
- **Validación** de datos
- **Consentimiento** explícito para notificaciones
- **Datos encriptados** en Firestore

### **Privacidad:**
- **Consentimiento** explícito de usuarios
- **Datos mínimos** necesarios
- **Cumplimiento** GDPR
- **Transparencia** en el uso de datos

## 🆘 **Soporte y Mantenimiento**

### **Contacto:**
- **Desarrollador:** TURISTEAM
- **Email:** amco@gmx.es
- **Proyecto:** Ayuntamiento de Cobreros

### **Mantenimiento:**
- **Actualizaciones** automáticas de la web
- **Monitoreo** de notificaciones
- **Backup** automático en Firebase
- **Soporte** técnico disponible

## 📝 **Changelog**

### **v1.2.0** - Teléfonos de Interés Configurables 📞
- ✅ **Sección de Teléfonos de Interés** completamente refactorizada
- ✅ **Tarjeta única expandible** en lugar de múltiples tarjetas
- ✅ **Sistema de elementos configurables** (Taxis, ITV, Renovación DNI)
- ✅ **Tipos de elementos**: Teléfonos múltiples, Información de servicio, Documento/Foto
- ✅ **Panel de administración avanzado** con modales específicos
- ✅ **Datos dinámicos** según el tipo de elemento
- ✅ **Enlaces a documentos y fotos** opcionales
- ✅ **Interfaz responsive** con efectos de expansión
- ✅ **Gestión completa**: crear, editar, eliminar, ordenar elementos
- ✅ **Eliminación de sección duplicada** no configurable

### **v1.1.0** - Sistema de Tarjetas Configurables ✨
- ✅ **Sistema completo de tarjetas configurables** para Cultura y Ocio
- ✅ **Formularios avanzados** para gestión desde administración
- ✅ **Interfaz moderna** con colores personalizables e iconos FontAwesome
- ✅ **Sistema de enlaces opcionales** (internos y externos)
- ✅ **Gestión de elementos** con títulos, descripciones y emojis
- ✅ **Panel de administración intuitivo** con modales avanzados
- ✅ **Persistencia en localStorage** con actualización automática
- ✅ **Funcionalidades completas**: crear, editar, eliminar, ordenar elementos
- ✅ **Diseño responsive** y efectos hover
- ✅ **Todo el contenido completamente configurable** desde admin

### **v1.0.0** - Sistema Completo
- ✅ **Web del Ayuntamiento** con PWA
- ✅ **APK Android** nativa
- ✅ **Sistema de notificaciones** bidireccional
- ✅ **13 localidades** implementadas
- ✅ **Base de datos** en Firebase
- ✅ **Panel de administración** completo
- ✅ **Super administrador** TURISTEAM

## 🎯 **Próximas Funcionalidades**

### **En Desarrollo:**
- 🔄 **Iconos** de la APK
- 🔄 **Compilación** final
- 🔄 **Despliegue** en Netlify
- 🔄 **Configuración** Firebase

### **Futuras Mejoras:**
- 📊 **Dashboard** avanzado
- 📱 **App iOS** nativa
- 🔔 **Notificaciones** programadas
- 📈 **Analytics** avanzados

---

## 🏛️ **Ayuntamiento de Cobreros**

**Sistema profesional de gestión municipal con tecnología moderna**

*Desarrollado por TURISTEAM para el Ayuntamiento de Cobreros*

**¡Sistema completo y funcional para la gestión municipal!** 🚀✨
