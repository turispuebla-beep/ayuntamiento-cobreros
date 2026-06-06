# ⚙️ Configuración Necesaria para Notificaciones Push

## 📋 Estado Actual

### ✅ **Implementado:**
1. **Firebase Functions** - Código creado y listo
   - `sendPushNotification` implementada
   - Usa `admin.messaging()` (no requiere Server Key en frontend)
   - Batch sending (500 usuarios por lote)
   - Limpieza automática de tokens inválidos

2. **Código de notificaciones** - Actualizado para usar Firebase Functions
   - Ya no requiere Server Key en el frontend
   - Más seguro y profesional

3. **Obtención de tokens FCM** - Código implementado
   - Función `getFCMToken()` disponible
   - Se ejecuta al registrarse el usuario

### ⚠️ **Pendiente de Configurar:**

## 🔧 **Configuración Requerida**

### **1. Desplegar Firebase Functions**

```bash
# Ir a la carpeta de functions
cd functions

# Instalar dependencias
npm install

# Compilar TypeScript
npm run build

# Desplegar funciones
firebase deploy --only functions
```

**Verificar despliegue:**
- URL: `https://us-central1-turisteam-80f1b.cloudfunctions.net/sendPushNotification`
- Debe responder con JSON válido

---

### **2. Configurar VAPID Key para Web**

**¿Qué es VAPID Key?**
- Clave necesaria para generar tokens FCM en navegadores web
- Se genera una vez en Firebase Console
- Se usa para notificaciones push en PWA/web

**Pasos:**

1. **Ir a Firebase Console:**
   - https://console.firebase.google.com
   - Proyecto: `turisteam-80f1b`
   - Cloud Messaging → Web Push certificates

2. **Generar par de claves:**
   - Hacer clic en "Generate key pair"
   - Copiar la clave pública (VAPID Key)

3. **Actualizar en `index.html` (línea 62):**
   ```javascript
   const token = await getToken(messaging, {
       vapidKey: 'TU_VAPID_KEY_AQUI' // ← Reemplazar con la clave generada
   });
   ```

**Ejemplo de VAPID Key:**
```
BHrX8K3m2Yq5vN9wP7sT4uR6eY8iU0oA2dF4gH6jK8lM0nP2qR4sT6uV8wX0yZ2aB4cD6eF8gH0
```

---

### **3. Configurar Firebase en `index.html`**

**Obtener configuración:**

1. **Firebase Console:**
   - Project Settings → General
   - Buscar "Your apps" → Web app
   - Si no existe, crear una nueva

2. **Copiar configuración:**
   ```javascript
   const firebaseConfig = {
       apiKey: "AIxx-...", // ← Copiar de Firebase Console
       authDomain: "turisteam-80f1b.firebaseapp.com",
       projectId: "turisteam-80f1b",
       storageBucket: "turisteam-80f1b.appspot.com",
       messagingSenderId: "623846192437",
       appId: "1:623846192437:web:..." // ← Copiar de Firebase Console
   };
   ```

3. **Actualizar en `index.html` (líneas 33-40)**

---

### **4. Configurar Contraseña de Email (YA HECHO)**

✅ **Ya configurado:**
- Contraseña: `yytsdzlzfpoknrxa`
- Email: `u2389387944@gmail.com`

**Si necesitas actualizarla:**
```bash
firebase functions:config:set gmail.password="yytsdzlzfpoknrxa"
firebase deploy --only functions
```

---

## ✅ **Checklist de Configuración**

- [ ] Firebase Functions desplegadas
- [ ] VAPID Key generada y configurada en `index.html`
- [ ] API Key de Firebase configurada en `index.html`
- [ ] App ID de Firebase configurada en `index.html`
- [ ] Contraseña de email configurada en Firebase Functions
- [ ] Probar envío de notificación desde el panel

---

## 🧪 **Probar Notificaciones**

### **1. Probar Firebase Function:**
```bash
curl -X POST https://us-central1-turisteam-80f1b.cloudfunctions.net/sendPushNotification \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test",
    "message": "Prueba de notificación",
    "type": "general",
    "scope": "all"
  }'
```

### **2. Probar desde el Panel:**
1. Iniciar sesión como administrador
2. Ir a "Enviar Notificación Push"
3. Completar formulario
4. Enviar
5. Verificar estadísticas

---

## 📝 **Notas Importantes**

1. **No se requiere Server Key en frontend:**
   - Firebase Functions usa `admin.messaging()` automáticamente
   - Más seguro que exponer Server Key

2. **VAPID Key es solo para web:**
   - APK Android no la necesita
   - PWA iPhone sí la necesita

3. **Tokens FCM se obtienen automáticamente:**
   - Al registrarse con consentimiento
   - Al dar permiso de notificaciones

---

## 🔗 **URLs Importantes**

- **Firebase Console:** https://console.firebase.google.com/project/turisteam-80f1b
- **Cloud Messaging:** https://console.firebase.google.com/project/turisteam-80f1b/settings/cloudmessaging
- **Functions:** https://console.firebase.google.com/project/turisteam-80f1b/functions

---

**Última actualización:** Diciembre 2025

