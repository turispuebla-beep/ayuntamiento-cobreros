# 🏛️ Ayuntamiento de Cobreros - Sistema Web y App Móvil

## ©️ **Copyright y Propiedad**

**© 2024 Turisteam Platform System**  
*Todos los derechos reservados*

Este sistema pertenece y está registrado bajo el **Turisteam Platform System**, una plataforma integral de gestión turística y municipal desarrollada para optimizar la comunicación y administración de entidades públicas.

---

## 📋 **Descripción del Proyecto**

Sistema completo de gestión municipal para el Ayuntamiento de Cobreros, que incluye:
- **🌐 Página web oficial** con panel de administración
- **📱 App móvil** para notificaciones oficiales
- **🔔 Sistema de notificaciones push** con Firebase
- **🏘️ Gestión por pueblos** (13 localidades)

## 🚀 **Características Principales**

### **🌐 Página Web Oficial**
- ✅ **Panel de administración** completo
- ✅ **Gestión de contenido** dinámico
- ✅ **Sistema de notificaciones** push
- ✅ **Gestión de documentos** y archivos
- ✅ **Sistema de citas previas**
- ✅ **Exportación/Importación** de datos
- ✅ **Estadísticas** del sistema

### **📱 App Móvil de Notificaciones**
- ✅ **Notificaciones push** en tiempo real
- ✅ **Filtrado por pueblos** de interés
- ✅ **Panel de administrador** móvil
- ✅ **Archivos adjuntos** (PDF, imágenes)
- ✅ **Diseño responsive** y moderno
- ✅ **Escudo del ayuntamiento** en notificaciones

## 🏘️ **Pueblos del Ayuntamiento (13 localidades)**

1. **Cobreros** (pueblo principal)
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

## 🛠️ **Tecnologías Utilizadas**

### **Frontend:**
- **HTML5** - Estructura semántica
- **CSS3** - Diseño responsive y moderno
- **JavaScript (ES6+)** - Funcionalidad interactiva
- **Bootstrap** - Framework CSS
- **Font Awesome** - Iconografía

### **Backend y Servicios:**
- **Firebase** - Base de datos y notificaciones
- **Firestore** - Base de datos NoSQL
- **Firebase Cloud Messaging** - Notificaciones push
- **Firebase Functions** - Funciones serverless
- **Service Worker** - Notificaciones en segundo plano

### **Herramientas:**
- **Git** - Control de versiones
- **PWA** - Progressive Web App
- **Manifest.json** - Configuración de app móvil

## 📁 **Estructura del Proyecto**

```
ayuntamiento-cobreros/
├── 📄 index.html                 # Página principal web
├── 📁 css/
│   └── styles.css               # Estilos principales
├── 📁 js/
│   └── script.js                # Funcionalidad JavaScript
├── 📁 images/                   # Imágenes y recursos
├── 📁 notification-app/         # App móvil
│   ├── index.html              # Página de la app
│   ├── app.js                  # Lógica de la app
│   ├── manifest.json           # Configuración PWA
│   └── README.md               # Documentación de la app
├── 📁 functions/               # Firebase Functions
│   └── src/index.ts           # Funciones serverless
├── 📄 CONFIGURACION_FIREBASE_NOTIFICACIONES.md
├── 📄 MEJORAS_NOTIFICACIONES_APP.md
├── 📄 UNIFICACION_PUEBLOS_NOTIFICACIONES.md
└── 📄 README.md               # Este archivo
```

## 🚀 **Instalación y Configuración**

### **1. Clonar el Repositorio**
```bash
git clone [URL_DEL_REPOSITORIO]
cd ayuntamiento-cobreros
```

### **2. Configurar Firebase**
1. Crear proyecto en [Firebase Console](https://console.firebase.google.com)
2. Habilitar **Firestore Database**
3. Habilitar **Cloud Messaging**
4. Configurar **Firebase Functions**
5. Actualizar configuración en `index.html` y `notification-app/index.html`

### **3. Configurar API Keys**
Editar los siguientes archivos con tus claves reales:

**`index.html` (línea ~5800):**
```javascript
const firebaseConfig = {
    apiKey: "TU_API_KEY_REAL",
    authDomain: "tu-proyecto.firebaseapp.com",
    projectId: "tu-proyecto-id",
    storageBucket: "tu-proyecto.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdefghijklmnop"
};
```

**`notification-app/index.html` (línea ~3):**
```javascript
const firebaseConfig = {
    apiKey: "TU_API_KEY_REAL",
    authDomain: "tu-proyecto.firebaseapp.com",
    projectId: "tu-proyecto-id",
    storageBucket: "tu-proyecto.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdefghijklmnop"
};
```

### **4. Configurar VAPID Key**
1. En Firebase Console → Project Settings → Cloud Messaging
2. Generar **Web Push certificates**
3. Copiar la **VAPID key**
4. Actualizar en ambos archivos HTML

## 🎯 **Funcionalidades del Sistema**

### **🌐 Panel Web de Administración**

#### **📱 Gestión de Notificaciones**
- Enviar notificaciones a todos los usuarios
- Enviar notificaciones a pueblos específicos
- Adjuntar documentos (PDF, DOC, JPG, PNG)
- Ver estadísticas de notificaciones
- Historial de notificaciones enviadas

#### **📄 Gestión de Documentos**
- Subir documentos por categorías
- Gestión de documentos existentes
- Sistema de categorización

#### **📅 Sistema de Citas Previas**
- Configuración de horarios de atención
- Gestión de citas solicitadas
- Envío de confirmaciones por email
- Calendario de disponibilidad

#### **📊 Gestión de Datos**
- Exportar/Importar datos (JSON, Excel, DOC)
- Estadísticas del sistema
- Gestión de usuarios y administradores
- Copias de seguridad

#### **🏥 Datos y Enlaces de Interés**
- **Consultorio Médico** (unificado)
- **ITV - Puebla de Sanabria**
- **Teléfonos de Interés**
- **Líneas de Autobús y Tren**

### **📱 App Móvil**

#### **👤 Para Usuarios**
- Registro con selección de pueblos de interés
- Recibir notificaciones filtradas por pueblo
- Ver notificaciones con escudo del ayuntamiento
- Acceder a archivos adjuntos
- Interfaz moderna y responsive

#### **👨‍💼 Para Administradores**
- Login: `admin@cobreros.es` / `admin123`
- Enviar notificaciones desde el móvil
- Seleccionar pueblos objetivo
- Adjuntar documentos (PDF, JPG)
- Panel discreto con botón (+)

## 🔧 **Configuración de Notificaciones**

### **Tipos de Notificación Soportados:**
- 📄 **Bando Municipal**
- 📢 **Noticia/Anuncio**
- 🎭 **Evento**
- 🚨 **Urgencia/Emergencia**
- 📅 **Cita Previa**
- ℹ️ **General**

### **Sistema de Filtrado:**
- **Notificaciones generales**: Se muestran a todos los usuarios
- **Notificaciones por pueblo**: Solo a usuarios que han seleccionado ese pueblo
- **Sincronización**: Preferencias guardadas en localStorage y Firestore

## 📱 **Instalación de la App Móvil**

### **Desde la Web:**
1. Abrir la página web en móvil
2. Aparecerá mensaje "📱 App COBREROS"
3. Tocar "Regístrate desde tu móvil"
4. Seguir instrucciones de instalación

### **Funcionalidades PWA:**
- ✅ Instalable en pantalla de inicio
- ✅ Notificaciones push en segundo plano
- ✅ Funciona offline (caché)
- ✅ Icono personalizado del ayuntamiento

## 🎨 **Diseño y UX**

### **Características de Diseño:**
- **Responsive**: Adaptado a móviles, tablets y desktop
- **Moderno**: Gradientes, sombras, animaciones suaves
- **Accesible**: Colores contrastantes, iconos claros
- **Profesional**: Escudo del ayuntamiento prominente
- **Intuitivo**: Navegación clara y flujo lógico

### **Paleta de Colores:**
- **Primario**: Azul (#3498db, #2980b9)
- **Secundario**: Gris (#6c757d, #495057)
- **Éxito**: Verde (#27ae60)
- **Advertencia**: Naranja (#f39c12)
- **Peligro**: Rojo (#e74c3c)

## 📊 **Estadísticas y Monitoreo**

### **Métricas Disponibles:**
- Usuarios registrados
- Notificaciones enviadas
- Documentos subidos
- Citas previas solicitadas
- Uso por pueblo/localidad

### **Dashboard de Administración:**
- Contadores en tiempo real
- Gráficos de actividad
- Exportación de datos
- Historial de acciones

## 🔒 **Seguridad**

### **Medidas Implementadas:**
- Validación de formularios
- Sanitización de datos
- Autenticación de administradores
- Permisos de notificación
- Cifrado de datos sensibles

### **Credenciales por Defecto:**
- **Admin Web**: Configurar en panel de administración
- **Admin App**: `admin@cobreros.es` / `admin123`

## 🚀 **Despliegue**

### **Opciones de Hosting:**
- **Netlify** (recomendado para web)
- **Firebase Hosting**
- **GitHub Pages**
- **Vercel**

### **Configuración de Dominio:**
1. Configurar DNS del dominio
2. Actualizar URLs en configuración
3. Configurar SSL/HTTPS
4. Actualizar manifest.json con dominio real

## 📚 **Documentación Adicional**

- **`CONFIGURACION_FIREBASE_NOTIFICACIONES.md`** - Guía completa de Firebase
- **`MEJORAS_NOTIFICACIONES_APP.md`** - Mejoras implementadas en notificaciones
- **`UNIFICACION_PUEBLOS_NOTIFICACIONES.md`** - Unificación de pueblos
- **`notification-app/README.md`** - Documentación específica de la app móvil

## 🤝 **Contribución**

### **Cómo Contribuir:**
1. Fork del repositorio
2. Crear rama para nueva funcionalidad
3. Realizar cambios y pruebas
4. Crear Pull Request
5. Revisión y merge

### **Estándares de Código:**
- Código limpio y comentado
- Nombres descriptivos de variables
- Documentación de funciones
- Pruebas de funcionalidad

## 📞 **Soporte y Contacto**

### **Información del Proyecto:**
- **Desarrollado para**: Ayuntamiento de Cobreros
- **Tecnologías**: HTML5, CSS3, JavaScript, Firebase
- **Licencia**: Uso municipal
- **Versión**: 1.0.0

### **Contacto Técnico:**
- **Email**: aytocobrero@gmail.com
- **Soporte**: A través de issues en el repositorio

## 🎯 **Roadmap Futuro**

### **Próximas Funcionalidades:**
- [ ] Sistema de autenticación mejorado
- [ ] Integración con servicios municipales
- [ ] App nativa para iOS/Android
- [ ] Sistema de pagos online
- [ ] Integración con redes sociales
- [ ] Sistema de encuestas municipales

---

## ✅ **Estado del Proyecto**

**🟢 COMPLETAMENTE FUNCIONAL**

- ✅ Página web oficial operativa
- ✅ App móvil funcional
- ✅ Sistema de notificaciones activo
- ✅ Panel de administración completo
- ✅ Gestión por pueblos implementada
- ✅ Documentación completa
- ✅ Sistema de respaldos
- ✅ Diseño responsive

**🚀 Listo para producción y uso municipal**

---

*Desarrollado con ❤️ para el Ayuntamiento de Cobreros*