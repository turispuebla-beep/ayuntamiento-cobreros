# 🔑 Configuración de VAPID Keys para Notificaciones Push

## 📋 **¿Qué es una VAPID Key?**

**VAPID** (Voluntary Application Server Identification) es un estándar web que permite identificar tu aplicación en servicios de notificaciones push como **Firebase Cloud Messaging (FCM)**.

### 🎯 **Propósito:**
- Identificar tu aplicación ante FCM
- Autenticar solicitudes de notificaciones push
- Garantizar que solo tu aplicación pueda enviar notificaciones a tus usuarios

---

## ⚙️ **Estado Actual de la Configuración**

### ✅ **Archivos configurados:**

1. **`index.html`** (Línea ~58)
   - Constante `VAPID_KEY` definida
   - Usada en `getFCMToken()`

2. **`notification-app/app.js`** (Línea ~14)
   - Constante `VAPID_KEY` definida
   - Usada en todas las solicitudes de tokens FCM

### 🔑 **VAPID Key Actual:**
```
BEl62iUYgUivxIkv69yViEuiBIa40HI8lF7vQyVpX4Bw
```

---

## 🚀 **Cómo Obtener/Generar una VAPID Key**

### **Paso 1: Acceder a Firebase Console**
1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto: `turisteam-80f1b`
3. Ve a **Configuración del proyecto** (⚙️ icono)

### **Paso 2: Ir a Cloud Messaging**
1. En el menú lateral, busca **Cloud Messaging**
2. Busca la sección **Web Push certificates**
3. Si no existe una clave:
   - Haz clic en **Generate key pair**
   - Copia la clave generada

### **Paso 3: Actualizar en el Código**

⚠️ **IMPORTANTE:** Debes usar la **misma VAPID key** en ambos archivos.

#### **Archivo 1: `index.html`**
```javascript
// ⚙️ CONFIGURACIÓN VAPID KEY
// 🔑 Obtener esta clave en: Firebase Console → Project Settings → Cloud Messaging → Web Push certificates
// ⚠️ IMPORTANTE: Usa la misma VAPID key que en notification-app/app.js para mantener consistencia
const VAPID_KEY = 'TU_VAPID_KEY_AQUI'; // ⚠️ Reemplazar aquí
```

#### **Archivo 2: `notification-app/app.js`**
```javascript
// ⚙️ CONFIGURACIÓN VAPID KEY PARA NOTIFICACIONES PUSH
// 🔑 Obtener esta clave en: Firebase Console → Project Settings → Cloud Messaging → Web Push certificates
// ⚠️ IMPORTANTE: Usa la misma VAPID key en index.html para mantener consistencia
const VAPID_KEY = 'TU_VAPID_KEY_AQUI'; // ⚠️ Reemplazar aquí (MISMA key que en index.html)
```

---

## ✅ **Verificación de la Configuración**

### **1. Verificar en el Código:**
- ✅ La constante `VAPID_KEY` está definida en ambos archivos
- ✅ Se usa `vapidKey: VAPID_KEY` (no hardcodeada)
- ✅ Ambos archivos tienen la misma key

### **2. Verificar en el Navegador:**
1. Abre la consola del navegador (F12)
2. Busca mensajes de Firebase
3. Debe aparecer: `FCM Token: [token]` o `📱 Token FCM: [token]`
4. Si aparece error relacionado con VAPID, verifica la key

### **3. Verificar Notificaciones:**
1. Acepta permisos de notificaciones
2. Intenta enviar una notificación desde el panel admin
3. Verifica que llegue correctamente

---

## 🔒 **Seguridad y Buenas Prácticas**

### ✅ **Hacer:**
- ✅ Usar la misma VAPID key en todos los archivos del mismo proyecto
- ✅ Mantener la key en variables constantes (no hardcodeada en funciones)
- ✅ Documentar dónde se usa la key

### ❌ **No Hacer:**
- ❌ Exponer la VAPID key en código público sin necesidad
- ❌ Usar diferentes VAPID keys en el mismo proyecto
- ❌ Hardcodear la key múltiples veces en el código

---

## 🛠️ **Solución de Problemas**

### **Error: "Invalid VAPID key"**
- Verifica que la key sea correcta (sin espacios)
- Asegúrate de haberla copiado completa desde Firebase Console
- Verifica que uses la key de Web Push, no la Server Key

### **Error: "Token generation failed"**
- Verifica que la VAPID key esté correctamente configurada
- Asegúrate de tener permisos de notificaciones
- Revisa la consola del navegador para más detalles

### **Las notificaciones no llegan**
1. Verifica la VAPID key en ambos archivos
2. Verifica que sean idénticas
3. Comprueba que el token FCM se genere correctamente
4. Revisa los logs de Firebase Console

---

## 📚 **Referencias**

- [Firebase Cloud Messaging Documentation](https://firebase.google.com/docs/cloud-messaging)
- [Web Push Protocol - VAPID](https://datatracker.ietf.org/doc/html/draft-thomson-webpush-vapid)
- [Firebase Console - Cloud Messaging](https://console.firebase.google.com/project/_/settings/cloudmessaging)

---

## 📝 **Resumen Rápido**

1. **Obtener VAPID Key:** Firebase Console → Cloud Messaging → Web Push certificates
2. **Actualizar en:** `index.html` (línea ~58) y `notification-app/app.js` (línea ~14)
3. **Usar la MISMA key** en ambos archivos
4. **Verificar** que las notificaciones funcionen correctamente

---

**Última actualización:** 2024  
**Sistema:** Turisteam Platform System - Ayuntamiento de Cobreros

