# 🏛️ Ayuntamiento de Cobreros - Sistema Completo

## 📋 **Descripción del Proyecto**

Sistema completo de gestión municipal para el **Ayuntamiento de Cobreros** con notificaciones push bidireccionales, PWA para iPhone, APK Android nativa, sistema de emails automáticos y formato de texto personalizado.

---

## ✨ **Últimas Actualizaciones (Noviembre 2025)**

### **🆕 Funcionalidades Nuevas:**

1. **✨ Editor WYSIWYG Profesional** ⭐ **NUEVO**
   - ✅ Editor de texto enriquecido tipo Word
   - ✅ Negrita, cursiva, subrayado
   - ✅ Títulos y subtítulos
   - ✅ Listas numeradas y con viñetas
   - ✅ Colores de texto y fondo
   - ✅ Insertar enlaces
   - ✅ Disponible en Noticias y Bandos
   - ✅ Usando Quill.js

2. **🔔 Sistema de Notificaciones Push Profesional**
   - ✅ Firebase Functions backend seguro
   - ✅ Batch sending (10x más rápido)
   - ✅ Limpieza automática de tokens inválidos
   - ✅ Server Key oculto en back-end
   - ✅ Estadísticas detalladas de entrega
   - ✅ Manejo profesional de errores

3. **🎨 Formato de Texto Personalizado**
   - ✅ Tipo de letra (8 opciones)
   - ✅ Tamaño de texto (7 opciones)
   - ✅ Color personalizable
   - ✅ Disponible en Notificaciones

4. **📧 Sistema de Emails Automáticos**
   - ✅ Confirmación de citas previas
   - ✅ Notificaciones a administradores
   - ✅ Firebase Functions desplegado
   - ✅ Plan Blaze activo

5. **📱 App Android Completa**
   - ✅ Sincronización en tiempo real
   - ✅ Recepción de notificaciones push
   - ✅ Envío desde la app (administradores)
   - ✅ Alerta de descarga en móviles

---

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
- **Sistema de citas previas** completo
- **Noticias y Bandos** con formato personalizado
- **Formato de texto** en todos los modales

### **📱 APK Android**
- **App nativa** para Android
- **Registro de usuarios** con localidades
- **Panel de administración** integrado
- **Notificaciones** con escudo de Cobreros
- **Sincronización** en tiempo real con la web
- **Envío de notificaciones** desde la app
- **Super administrador** TURISTEAM

### **🍎 PWA para iPhone**
- **Instalable** desde Safari
- **Notificaciones push** nativas
- **Funciona como app** nativa
- **Service Worker** completo
- **Banner de instalación** automático

---

## 🎨 **Formato de Texto Personalizado**

### **Disponible en:**
- ✅ **Notificaciones Push** - Mensajes formateables
- ✅ **Noticias/Anuncios** - Contenido con formato
- ✅ **Bandos** - Textos oficiales personalizados

### **Opciones:**
- **8 Tipos de Letra**: Arial, Times New Roman, Courier New, Georgia, Verdana, Trebuchet MS, Impact, Comic Sans MS
- **7 Tamaños**: Desde 12px (Muy Pequeño) hasta 30px (Extra Grande)
- **Colores Ilimitados**: Selector visual de color

---

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
- **Formato personalizado** de texto

---

## 📧 **Sistema de Emails Automáticos**

### **Funciones:**
- ✅ **Confirmación de citas** para ciudadanos
- ✅ **Notificación a administradores** de nuevas citas
- ✅ **Cambio de estado** de citas
- ✅ **Templates HTML** profesionales

### **Configuración:**
- **Firebase Functions** desplegadas
- **URL**: `https://us-central1-turisteam-80f1b.cloudfunctions.net/sendEmail`
- **Runtime**: Node.js 20
- **Plan**: Blaze (pay-as-you-go)
- **Email**: u2389387944@gmail.com

---

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

---

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
- **Firebase Functions** - Emails automáticos (Node.js 20)
- **Firebase Storage** - Almacenamiento de archivos

### **Mobile:**
- **Android Studio** - Desarrollo nativo
- **Java** - Lógica de la aplicación
- **Firebase SDK** - Integración con servicios
- **Material Design** - UI/UX moderna

### **Email:**
- **Nodemailer** - Envío de emails
- **Gmail SMTP** - Servidor de correo
- **HTML Templates** - Diseño profesional

---

## 📁 **Estructura del Proyecto**

```
ayuntamiento-cobreros/
├── 📄 index.html                 # Página principal
├── 📄 manifest.json              # Configuración PWA
├── 📄 sw.js                      # Service Worker
├── 📄 firebase.json              # Configuración Firebase
├── 📄 .firebaserc                # Proyecto Firebase
│
├── 📁 css/                       # Estilos
│   └── styles.css
│
├── 📁 js/                        # JavaScript
│   ├── script.js                 # Lógica principal
│   └── recaptcha.js              # reCAPTCHA v3
│
├── 📁 images/                    # Imágenes y recursos
│   ├── escudo-cobreros.png
│   └── favicon.ico
│
├── 📁 functions/                 # Firebase Functions
│   ├── src/
│   │   └── index.ts              # Código TypeScript
│   ├── lib/                      # Compilado JavaScript
│   ├── package.json
│   └── tsconfig.json
│
├── 📁 android-app/               # Aplicación Android
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── java/             # Código Java
│   │   │   └── res/              # Recursos Android
│   │   └── build.gradle
│   └── google-services.json
│
└── 📁 documentation/             # Documentación
    ├── README.md
    ├── FORMATO-TEXTO-COMPLETO.md
    ├── CONFIGURACION-APP-ANDROID.md
    └── ESTADO-COMPLETO.md
```

---

## 🔑 **Configuración Inicial**

### **1. Firebase:**
- Proyecto: `turisteam-80f1b`
- Plan: **Blaze** (pay-as-you-go)
- Firestore: Habilitado
- Authentication: Habilitado
- Cloud Messaging: Habilitado
- Storage: Habilitado
- Functions: Desplegadas

### **2. Credenciales:**
- **Super Admin**: amco@gmx.es / 533712
- **Email Sistema**: u2389387944@gmail.com
- **Team**: TURISTEAM

### **3. Funciones Firebase:**
```bash
cd functions
npm install
npm run build
firebase deploy --only functions
```

---

## 📱 **Instalación y Uso**

### **Web/PWA:**
1. Abre `index.html` en un servidor web
2. O despliega en Netlify/vercel
3. Configura Firebase en el código
4. ¡Listo!

### **APK Android:**
1. Abre `android-app/` en Android Studio
2. Sincroniza proyecto
3. Compila APK Release
4. Instala en dispositivos

### **Firebase Functions:**
1. Instala dependencias: `cd functions && npm install`
2. Compila TypeScript: `npm run build`
3. **Configura Server Key FCM** (ver `CONFIGURAR-NOTIFICACIONES-PUSH.md`)
4. Despliega: `firebase deploy --only functions`

### **🔔 Configurar Notificaciones Push** (NUEVO):
1. Obtén la Server Key FCM desde Firebase Console
2. Configura: `firebase functions:config:set fcm.server_key="TU_SERVER_KEY"`
3. Despliega la función: `firebase deploy --only functions:sendPushNotification`

---

## 🎨 **Formato de Texto - Guía de Uso**

### **En Notificaciones:**
1. Panel Admin → "Enviar Notificación Push"
2. Escribe mensaje
3. Personaliza formato (fuente, tamaño, color)
4. Envía

### **En Noticias:**
1. Panel Admin → "Gestionar Noticias"
2. Crea/edita noticia
3. Personaliza formato del contenido
4. Guarda

### **En Bandos:**
1. Panel Admin → "Gestionar Bandos"
2. Crea/edita bando
3. Personaliza formato del contenido
4. Guarda

---

## 📊 **Estadísticas y Monitoreo**

### **Datos Disponibles:**
- Usuarios registrados por localidad
- Notificaciones enviadas
- Emails enviados
- Citas previas gestionadas
- Estadísticas de uso

---

## 🔒 **Seguridad**

- **reCAPTCHA v3** en formularios
- **Firebase Authentication** para usuarios
- **Verificación** en Firestore
- **Tokens FCM** seguros
- **HTTPS** obligatorio

---

## 📚 **Documentación Adicional**

- `FORMATO-TEXTO-COMPLETO.md` - Guía completa de formato
- `CONFIGURACION-APP-ANDROID.md` - Configuración de la app
- `ESTADO-COMPLETO.md` - Estado actual del sistema
- `DEPLOY-COMPLETADO.md` - Estado del despliegue
- `CONFIGURAR-NOTIFICACIONES-PUSH.md` - Notificaciones

---

## 🚀 **Estado del Proyecto**

### **✅ Completado:**
- ✅ Sistema web completo
- ✅ PWA funcionando
- ✅ APK Android nativa
- ✅ Notificaciones push bidireccionales
- ✅ Sistema de emails automáticos
- ✅ Formato de texto personalizado
- ✅ Sincronización en tiempo real
- ✅ 13 localidades configuradas
- ✅ Firebase Blaze activo
- ✅ Functions desplegadas

### **⏳ Mejoras Futuras:**
- ⏳ Más opciones de formato avanzado
- ⏳ Plantillas predefinidas
- ⏳ Estadísticas avanzadas
- ⏳ Sistema de programación de notificaciones

---

## 👥 **Equipo**

**Desarrollado por TURISTEAM** 🚀
**Sistema profesional para Ayuntamiento de Cobreros** 🏛️

---

## 📝 **Licencia**

Proyecto privado para el Ayuntamiento de Cobreros.

---

## 🆘 **Soporte**

Para soporte técnico, contactar con el equipo de desarrollo.

---

**Última actualización**: Noviembre 2025
**Versión**: 2.1.0
**Estado**: ✅ Producción
