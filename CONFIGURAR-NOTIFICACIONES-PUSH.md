# 🔔 Configurar Notificaciones Push - Server Key

## ⚠️ **PASO PENDIENTE**

Para que las notificaciones push funcionen, necesitas obtener la **Server Key** de Firebase Cloud Messaging.

---

## 🔑 **Obtener Server Key**

### **Pasos:**

1. **Abre Firebase Console:**
   ```
   https://console.firebase.google.com/project/turisteam-80f1b/settings/cloudmessaging
   ```

2. **Busca "Cloud Messaging"** en el menú lateral

3. **En "Cloud Messaging API (Legacy)"**:
   - Si está deshabilitada, haz clic en "Enable"
   - Espera a que se habilite (1-2 minutos)

4. **Copia la "Server Key"**:
   - Se encuentra en la sección "Cloud Messaging API (Legacy)"
   - Haz clic en "Copy" para copiarla

---

## ⚙️ **Configurar en el Código**

### **Opción 1: Reemplazar Directamente**

Busca en `js/script.js` línea **8087**:

```javascript
'Authorization': 'key=TU_SERVER_KEY_AQUI',
```

Reemplaza `TU_SERVER_KEY_AQUI` con tu Server Key real.

### **Opción 2: Variable Global (Recomendado)**

Agrega al inicio de `js/script.js` (después de la línea 33):

```javascript
// ⚙️ CONFIGURACIÓN DE NOTIFICACIONES PUSH
const FCM_SERVER_KEY = 'TU_SERVER_KEY_DE_FIREBASE_AQUI';
```

Luego usa esta variable en línea 8087:

```javascript
'Authorization': 'key=' + FCM_SERVER_KEY,
```

---

## ✅ **Verificación**

Después de configurar:

1. Abre tu sitio web del Ayuntamiento
2. Inicia sesión como administrador
3. Ve a "Notificaciones" en el panel admin
4. Intenta enviar una notificación de prueba
5. Debe funcionar correctamente

---

## 🔍 **Ubicación en el Código**

La Server Key se usa en:

**Archivo**: `js/script.js`
**Línea**: ~8087
**Función**: `enviarNotificacionPushConLocalidades()`

También en:
- **Android**: `android-app/app/src/main/java/com/turisteam/ayuntamientocobreros/FCMNotificationService.java` línea 14

---

## ⚠️ **Nota Importante**

**NO subas la Server Key al repositorio público**.

Si usas Git:
```bash
# Asegúrate de que está en .gitignore
echo "js/script.js" >> .gitignore
# O usa variables de entorno en producción
```

---

## 🎯 **Estado Actual**

✅ **Sistema**: Configurado y listo
✅ **Firebase Blaze**: Activo
✅ **Funciones**: Desplegadas
❌ **Server Key**: Pendiente de configurar

---

**Una vez configurada la Server Key, las notificaciones push funcionarán al 100%.** 🎉

