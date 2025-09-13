# 🚀 Despliegue en Netlify - Ayuntamiento de Cobreros

## 📋 **Archivos a Subir a Netlify:**

### **✅ Archivos Principales (OBLIGATORIOS):**
```
📁 Proyecto Netlify/
├── 📄 index.html                    ← Página principal
├── 📄 manifest.json                 ← Configuración PWA
├── 📄 sw.js                        ← Service Worker
├── 📁 css/
│   └── 📄 styles.css               ← Estilos
├── 📁 js/
│   └── 📄 script.js                ← JavaScript principal
├── 📁 images/
│   ├── 📄 escudo-cobreros.png      ← Escudo principal
│   ├── 📄 escudo-cobreros-192.png  ← Icono PWA 192x192
│   ├── 📄 escudo-cobreros-512.png  ← Icono PWA 512x512
│   └── 📄 favicon.ico              ← Favicon
└── 📄 _redirects                   ← Redirecciones (crear)
```

### **📁 Estructura Completa:**
```
ayuntamiento-cobreros/
├── index.html
├── manifest.json
├── sw.js
├── _redirects
├── css/
│   └── styles.css
├── js/
│   └── script.js
├── images/
│   ├── escudo-cobreros.png
│   ├── escudo-cobreros-192.png
│   ├── escudo-cobreros-512.png
│   ├── favicon.ico
│   ├── screenshot1.png (opcional)
│   └── screenshot2.png (opcional)
├── android-app/ (NO SUBIR)
├── PWA-README.md (NO SUBIR)
├── NETLIFY-DEPLOYMENT.md (NO SUBIR)
└── .git/ (NO SUBIR)
```

## 🔧 **Configuración de Netlify:**

### **1. 📁 Crear Carpeta para Netlify:**
```bash
# Crear nueva carpeta
mkdir ayuntamiento-cobreros-netlify
cd ayuntamiento-cobreros-netlify

# Copiar archivos necesarios
cp ../ayuntamiento-cobreros/index.html .
cp ../ayuntamiento-cobreros/manifest.json .
cp ../ayuntamiento-cobreros/sw.js .
cp -r ../ayuntamiento-cobreros/css .
cp -r ../ayuntamiento-cobreros/js .
cp -r ../ayuntamiento-cobreros/images .
```

### **2. 📄 Crear archivo _redirects:**
```bash
# Crear archivo _redirects en la raíz
echo "/*    /index.html   200" > _redirects
```

### **3. 🖼️ Crear imágenes PWA (si no existen):**
- **escudo-cobreros-192.png** (192x192 píxeles)
- **escudo-cobreros-512.png** (512x512 píxeles)
- **screenshot1.png** (1280x720 píxeles) - Opcional
- **screenshot2.png** (750x1334 píxeles) - Opcional

## 🌐 **Subir a Netlify:**

### **Método 1: Arrastrar y Soltar (Más Fácil)**
1. **Ir a** [netlify.com](https://netlify.com)
2. **Iniciar sesión** o crear cuenta
3. **Arrastrar la carpeta** `ayuntamiento-cobreros-netlify` a la zona de deploy
4. **Esperar** a que se suba (1-2 minutos)
5. **¡Listo!** Tendrás una URL como `https://amazing-name-123456.netlify.app`

### **Método 2: Git (Recomendado)**
1. **Crear repositorio** en GitHub
2. **Subir archivos** a GitHub
3. **Conectar** Netlify con GitHub
4. **Deploy automático** en cada cambio

## ⚙️ **Configuración de Firebase:**

### **1. 🔥 Configurar Firebase:**
1. **Ir a** [console.firebase.google.com](https://console.firebase.google.com)
2. **Seleccionar proyecto** "TURISTEAM"
3. **Agregar app web** al proyecto
4. **Copiar configuración** Firebase

### **2. 🔑 Obtener Claves:**
```javascript
// En index.html, reemplazar en la configuración Firebase:
const firebaseConfig = {
  apiKey: "TU_API_KEY_AQUI",
  authDomain: "turisteam-80f1b.firebaseapp.com",
  projectId: "turisteam-80f1b",
  storageBucket: "turisteam-80f1b.appspot.com",
  messagingSenderId: "623846192437",
  appId: "TU_APP_ID_AQUI"
};
```

### **3. 🔔 Configurar FCM:**
1. **En Firebase Console** → Project Settings → Cloud Messaging
2. **Copiar Server Key** (para envío de notificaciones)
3. **Reemplazar en script.js:**
```javascript
// Buscar y reemplazar:
const SERVER_KEY = "TU_SERVER_KEY_AQUI";
```

### **4. 🗄️ Configurar Firestore:**
1. **En Firebase Console** → Firestore Database
2. **Crear base de datos** en modo producción
3. **Configurar reglas** de seguridad:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true; // Temporal para desarrollo
    }
  }
}
```

## 🎯 **Configuración de Dominio:**

### **1. 🌐 Dominio Personalizado:**
1. **En Netlify** → Site Settings → Domain Management
2. **Add custom domain** → `ayuntamiento-cobreros.com`
3. **Configurar DNS** en tu proveedor de dominio
4. **Esperar propagación** (24-48 horas)

### **2. 🔒 HTTPS (Automático):**
- **Netlify** proporciona HTTPS automáticamente
- **Certificado SSL** gratuito incluido
- **Redirección HTTP → HTTPS** automática

## 📱 **Configuración PWA:**

### **1. 🍎 Para iPhone:**
- **Abrir Safari** en iPhone
- **Ir a tu dominio** de Netlify
- **Tocar "Compartir"** → "Añadir a pantalla de inicio"
- **¡Listo!** App instalada en iPhone

### **2. 🤖 Para Android:**
- **Abrir Chrome** en Android
- **Ir a tu dominio** de Netlify
- **Banner de instalación** aparecerá automáticamente
- **Tocar "Instalar"**

## 🔧 **Variables de Entorno (Opcional):**

### **En Netlify:**
1. **Site Settings** → Environment Variables
2. **Agregar variables:**
```
FIREBASE_API_KEY=tu_api_key
FIREBASE_PROJECT_ID=turisteam-80f1b
FIREBASE_MESSAGING_SENDER_ID=623846192437
```

## ✅ **Checklist de Despliegue:**

### **Antes de Subir:**
- [ ] ✅ Archivos principales copiados
- [ ] ✅ Imágenes PWA creadas (192x192, 512x512)
- [ ] ✅ Archivo _redirects creado
- [ ] ✅ Configuración Firebase actualizada
- [ ] ✅ Server Key FCM configurada

### **Después de Subir:**
- [ ] ✅ Sitio carga correctamente
- [ ] ✅ PWA se puede instalar
- [ ] ✅ Notificaciones push funcionan
- [ ] ✅ Firebase conectado
- [ ] ✅ Dominio personalizado configurado

## 🚨 **Problemas Comunes:**

### **1. 🔥 Firebase no conecta:**
- Verificar configuración en `index.html`
- Comprobar que el proyecto existe
- Verificar reglas de Firestore

### **2. 📱 PWA no se instala:**
- Verificar que `manifest.json` existe
- Comprobar que `sw.js` se registra
- Verificar que las imágenes existen

### **3. 🔔 Notificaciones no funcionan:**
- Verificar Server Key FCM
- Comprobar permisos de notificación
- Verificar que el sitio es HTTPS

## 🎯 **Resultado Final:**

**¡Tendrás una web completa del Ayuntamiento de Cobreros con:**
- ✅ **PWA instalable** en iPhone y Android
- ✅ **Notificaciones push** funcionando
- ✅ **Base de datos** en Firebase
- ✅ **Dominio personalizado**
- ✅ **HTTPS automático**
- ✅ **Sistema completo** de gestión municipal

**¡Perfecto para el Ayuntamiento de Cobreros!** 🏛️✨

