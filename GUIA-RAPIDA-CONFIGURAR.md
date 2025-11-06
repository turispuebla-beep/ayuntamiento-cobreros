# 🚀 GUÍA RÁPIDA - Configurar Notificaciones en 10 Minutos

## 📋 **PASOS RÁPIDOS**

### **1️⃣ Obtener Server Key FCM** (5 minutos)

1. **Abre la consola de Firebase**:
   ```
   https://console.firebase.google.com/project/turisteam-80f1b/settings/cloudmessaging
   ```
   
   O manualmente:
   - Ve a https://console.firebase.google.com
   - Selecciona proyecto: **turisteam-80f1b**
   - Haz clic en ⚙️ **Settings** → **Project Settings**
   - Pestaña **Cloud Messaging**

2. **Busca "Cloud Messaging API (Legacy)"**:
   - Scroll hacia abajo
   - Sección "Cloud Messaging API (Legacy)"
   - Busca "Server Key"
   - Haz clic en "Copy" para copiar

3. **Si no ves la opción**:
   - La API puede estar deshabilitada
   - Haz clic en "Enable" y espera 1-2 minutos

---

### **2️⃣ Configurar en Firebase** (2 minutos)

Abre PowerShell/Terminal y ejecuta:

```bash
cd "C:\Users\USUARIO\Desktop\COBREROS\TU AYUNTAMIENTO\ayuntamiento-cobreros"

firebase functions:config:set fcm.server_key="PEGA_AQUI_EL_SERVER_KEY"
```

**⚠️ IMPORTANTE**: Reemplaza `PEGA_AQUI_EL_SERVER_KEY` con la clave que copiaste.

---

### **3️⃣ Desplegar la Función** (3 minutos)

Ejecuta:

```bash
firebase deploy --only functions:sendPushNotification
```

**Esto puede tardar 2-5 minutos**. Cuando termine, verás:
```
✅  Deploy complete!
```

---

### **4️⃣ Probar** (Opcional - 1 minuto)

Abre tu aplicación web y envía una notificación de prueba. Debería funcionar correctamente.

---

## 🆘 **SI ALGO FALLA**

### **Error: "fcm is not defined"**
**Solución**: Ejecuta primero:
```bash
firebase functions:config:get
```
Debería mostrar tu configuración.

### **Error: "Function not found"**
**Solución**: Despliega todas las funciones:
```bash
firebase deploy --only functions
```

### **No encuentras el Server Key**
**Solución**:
1. Ve a https://console.cloud.google.com/
2. Proyecto: turisteam-80f1b
3. APIs & Services → Cloud Messaging API
4. Credentials → Generate Server Key

---

## ✅ **VERIFICACIÓN**

Si todo salió bien, deberías ver:
- ✅ Configuración guardada
- ✅ Función desplegada
- ✅ Notificaciones funcionando

---

## 📞 **NECESITAS AYUDA?**

Si tienes problemas:
1. Lee los logs: `CONFIGURAR-NOTIFICACIONES-PUSH.md`
2. Revisa errores en consola
3. Verifica que estás en el proyecto correcto

---

**¡Listo! En 10 minutos tendrás notificaciones funcionando** 🎉




