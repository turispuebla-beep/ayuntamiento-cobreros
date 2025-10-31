# 🚀 Guía Completa de Despliegue en Netlify

## ✅ **¿Está listo para subir a Netlify?**

**¡Casi sí!** Solo necesitas completar estos pasos antes del despliegue:

### ⚠️ **Checklist Pre-Despliegue:**

- [ ] **1. Configurar Firebase con API keys REALES**
  - [ ] API Key de Firebase
  - [ ] App ID de Firebase
  - [ ] VAPID Key configurada (ya está, solo verificar)

- [ ] **2. Verificar Service Worker** (✅ Ya configurado)

- [ ] **3. Verificar archivos necesarios** (✅ Ya están)

- [ ] **4. Configurar dominios autorizados en Firebase**

---

## 📋 **Paso 1: Configurar Firebase con Keys Reales**

### **1.1. Obtener API Keys de Firebase:**

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto `turisteam-80f1b`
3. Ve a **Configuración del proyecto** (⚙️ icono)
4. En **Tus aplicaciones**, selecciona tu app web o crea una nueva
5. Copia las siguientes claves:

```javascript
apiKey: "TU_API_KEY_REAL",           // ⚠️ REEMPLAZAR
authDomain: "turisteam-80f1b.firebaseapp.com",
projectId: "turisteam-80f1b",
storageBucket: "turisteam-80f1b.appspot.com",
messagingSenderId: "623846192437",
appId: "TU_APP_ID_REAL"               // ⚠️ REEMPLAZAR
```

### **1.2. Actualizar en `index.html`:**

Busca esta sección (línea ~30):

```javascript
const firebaseConfig = {
    apiKey: "AIzaSyBXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX", // ⚠️ REEMPLAZAR
    authDomain: "turisteam-80f1b.firebaseapp.com",
    projectId: "turisteam-80f1b",
    storageBucket: "turisteam-80f1b.appspot.com",
    messagingSenderId: "623846192437",
    appId: "1:623846192437:web:XXXXXXXXXXXXXXXX" // ⚠️ REEMPLAZAR
};
```

### **1.3. Verificar VAPID Key:**

✅ **Ya está configurada:** `BEl62iUYgUivxIkv69yViEuiBIa40HI8lF7vQyVpX4Bw`

Si necesitas generar una nueva:
1. Firebase Console → Cloud Messaging → Web Push certificates
2. Generar nueva key
3. Actualizar en `index.html` (línea ~58) y `notification-app/app.js` (línea ~14)

---

## 📋 **Paso 2: Configurar Dominios Autorizados en Firebase**

### **2.1. Agregar Dominio de Netlify:**

1. Firebase Console → **Authentication**
2. Ve a **Configuración** (tab Settings)
3. Baja hasta **Dominios autorizados**
4. Haz clic en **Agregar dominio**
5. Agrega:
   - Tu dominio de Netlify: `tu-sitio.netlify.app`
   - Tu dominio personalizado (si lo tienes)

### **2.2. Configurar Cloud Messaging:**

1. Firebase Console → **Cloud Messaging**
2. Ve a **Web Push certificates**
3. Verifica que la VAPID key esté generada
4. Si no, genera una nueva

---

## 📋 **Paso 3: Preparar Archivos para Netlify**

### **3.1. Archivos a Subir (Estructura Mínima):**

```
📁 ayuntamiento-cobreros/
├── 📄 index.html              ✅ OBLIGATORIO
├── 📄 manifest.json           ✅ OBLIGATORIO (PWA)
├── 📄 sw.js                   ✅ OBLIGATORIO (Service Worker)
├── 📄 _redirects              ✅ OBLIGATORIO (SPA routing)
├── 📁 css/
│   └── 📄 styles.css          ✅ OBLIGATORIO
├── 📁 js/
│   └── 📄 script.js           ✅ OBLIGATORIO
├── 📁 images/
│   ├── 📄 escudo-cobreros.png
│   ├── 📄 escudo-cobreros-192.png
│   ├── 📄 escudo-cobreros-512.png
│   └── 📄 favicon.ico
└── 📁 notification-app/       ⚠️ NO SUBIR (app separada)
```

### **3.2. Crear archivo `_redirects` (si no existe):**

```bash
# En la raíz del proyecto
echo "/*    /index.html   200" > _redirects
```

Este archivo es **CRÍTICO** para:
- ✅ Que el Service Worker funcione correctamente
- ✅ Que las rutas SPA funcionen
- ✅ Que las notificaciones push funcionen

### **3.3. Verificar `sw.js` está en la raíz:**

✅ Ya está en la ubicación correcta: `ayuntamiento-cobreros/sw.js`

El Service Worker debe estar en la **raíz** del sitio para que funcione correctamente.

---

## 📋 **Paso 4: Desplegar en Netlify**

### **Método 1: Drag & Drop (Más Fácil) ⭐ RECOMENDADO PARA PRIMERA VEZ**

1. **Ir a** [app.netlify.com](https://app.netlify.com)
2. **Iniciar sesión** o crear cuenta gratuita
3. **Arrastrar la carpeta** `ayuntamiento-cobreros` completa a la zona de deploy
4. **Esperar** 1-2 minutos mientras se sube
5. **¡Listo!** Obtendrás una URL como: `https://random-name-123456.netlify.app`

### **Método 2: Git (Recomendado para Producción)**

1. **Crear repositorio** en GitHub (si no existe)
2. **Subir proyecto** a GitHub:
   ```bash
   git remote add origin TU_REPOSITORIO_GITHUB
   git push -u origin main
   ```
3. **En Netlify:**
   - Click en "New site from Git"
   - Conectar con GitHub
   - Seleccionar repositorio
   - Build settings:
     - **Build command:** (dejar vacío)
     - **Publish directory:** `/` (raíz)
4. **Deploy automático** en cada push

---

## 📋 **Paso 5: Configurar Netlify para Notificaciones**

### **5.1. Variables de Entorno (Opcional):**

Si quieres ocultar las API keys (recomendado para producción):

1. Netlify → **Site settings** → **Environment variables**
2. Agregar:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_APP_ID`

### **5.2. Configurar Headers (Opcional pero Recomendado):**

Crear archivo `netlify.toml` en la raíz:

```toml
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "camera=(), microphone=(), geolocation=()"
    
    # Permitir Service Worker
    Service-Worker-Allowed = "/"

[[headers]]
  for = "/sw.js"
  [headers.values]
    Cache-Control = "public, max-age=0, must-revalidate"
    Content-Type = "application/javascript"

[[headers]]
  for = "/manifest.json"
  [headers.values]
    Content-Type = "application/manifest+json"
```

### **5.3. Verificar HTTPS:**

✅ **Netlify proporciona HTTPS automáticamente** - Esto es **REQUERIDO** para:
- ✅ Service Workers
- ✅ Notificaciones Push
- ✅ PWA

---

## ✅ **Paso 6: Verificar que Todo Funciona**

### **6.1. Verificar Service Worker:**

1. Abre tu sitio en Netlify
2. Abre **DevTools** (F12)
3. Ve a **Application** → **Service Workers**
4. Debe aparecer `sw.js` registrado ✅

### **6.2. Verificar Notificaciones Push:**

1. Acepta permisos de notificaciones cuando el sitio lo solicite
2. En la consola debe aparecer: `FCM Token: [token]`
3. Prueba enviar una notificación desde el panel admin
4. Verifica que llegue correctamente ✅

### **6.3. Verificar PWA:**

1. En Chrome, busca el icono de "Instalar" en la barra de direcciones
2. O ve a **Application** → **Manifest**
3. Debe mostrar la configuración correcta ✅

---

## 🔧 **Solución de Problemas**

### **❌ Notificaciones no funcionan:**

1. **Verificar VAPID Key:**
   - Debe ser la misma en `index.html` y `notification-app/app.js`
   - Verificar en Firebase Console

2. **Verificar Firebase API Keys:**
   - Deben ser REALES (no placeholders)
   - Verificar que el proyecto Firebase esté activo

3. **Verificar HTTPS:**
   - Netlify proporciona HTTPS automáticamente
   - Si usas dominio personalizado, configurar SSL

4. **Verificar Service Worker:**
   - Abrir DevTools → Application → Service Workers
   - Debe estar registrado y activo

5. **Verificar Dominios Autorizados:**
   - Firebase Console → Authentication → Dominios autorizados
   - Agregar tu dominio de Netlify

### **❌ Service Worker no se registra:**

1. Verificar que `sw.js` esté en la raíz
2. Verificar que el archivo sea accesible: `https://tu-sitio.netlify.app/sw.js`
3. Verificar que no haya errores en la consola
4. Verificar que `index.html` tenga el registro del SW

### **❌ PWA no se instala:**

1. Verificar `manifest.json` existe y es válido
2. Verificar que las imágenes PWA existan (192x192, 512x512)
3. Verificar que el sitio esté en HTTPS
4. Verificar que el Service Worker esté registrado

---

## 📊 **Resumen de Requisitos**

### ✅ **Lo que YA está configurado:**

- ✅ Service Worker (`sw.js`) configurado
- ✅ PWA Manifest configurado
- ✅ VAPID Key configurada (constante centralizada)
- ✅ Sistema de notificaciones completo
- ✅ Estructura de archivos lista

### ⚠️ **Lo que DEBES hacer ANTES del despliegue:**

- [ ] **Actualizar Firebase API keys REALES** en `index.html`
- [ ] **Agregar dominio de Netlify** en Firebase Console
- [ ] **Crear archivo `_redirects`** si no existe
- [ ] **Verificar que todas las imágenes existan**

### 🚀 **Después del despliegue:**

- [ ] **Verificar Service Worker** se registra
- [ ] **Probar notificaciones push**
- [ ] **Verificar PWA** funciona
- [ ] **Configurar dominio personalizado** (opcional)

---

## 🎯 **Checklist Final Pre-Despliegue**

- [ ] Firebase API Key actualizada en `index.html`
- [ ] Firebase App ID actualizada en `index.html`
- [ ] VAPID Key verificada (o actualizada si es necesario)
- [ ] Dominio de Netlify agregado en Firebase Console
- [ ] Archivo `_redirects` existe en la raíz
- [ ] Archivo `sw.js` está en la raíz
- [ ] Archivo `manifest.json` existe
- [ ] Todas las imágenes PWA existen
- [ ] Probado localmente que funciona

---

## 📚 **Referencias**

- [Documentación Netlify](https://docs.netlify.com/)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [Service Workers Guide](https://developers.google.com/web/fundamentals/primers/service-workers)
- [PWA Guide](https://web.dev/progressive-web-apps/)

---

## ✅ **Conclusión**

**SÍ, solo falta subirlo a Netlify** después de:

1. ✅ Actualizar Firebase API keys REALES
2. ✅ Agregar dominio en Firebase Console
3. ✅ Verificar archivo `_redirects` existe

**Una vez en Netlify:**
- ✅ HTTPS automático (requerido para notificaciones)
- ✅ Service Worker funcionará
- ✅ Notificaciones push funcionarán
- ✅ PWA funcionará

**¡Todo está preparado para funcionar en producción!** 🚀

---

**Última actualización:** 2024  
**Sistema:** Turisteam Platform System - Ayuntamiento de Cobreros
