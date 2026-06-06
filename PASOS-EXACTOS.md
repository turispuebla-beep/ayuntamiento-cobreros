# 🎯 PASOS EXACTOS PARA CONFIGURAR

## 📍 **SI YA TIENES EL SERVER KEY**

Pega aquí tu Server Key y yo ejecuto los comandos:

**Server Key**: `_______________________`

---

## 📍 **SI NO TIENES EL SERVER KEY**

### **Opción 1: Desde Firebase Console** (Recomendado)

1. Ve a: https://console.firebase.google.com
2. Selecciona proyecto: **turisteam-80f1b**
3. Haz clic en ⚙️ (engranaje arriba a la izquierda)
4. Click en: **"Project settings"** / **"Configuración del proyecto"**
5. Click en pestaña: **"Cloud Messaging"**
6. Scroll hacia abajo hasta ver: **"Cloud Messaging API (Legacy)"**
7. Busca: **"Server Key"**
8. Haz click en: **"Copy"** (botón de copiar)

**Si no ves "Cloud Messaging API (Legacy)"**:
- Haz click en **"Enable"** y espera 1-2 minutos

---

### **Opción 2: Desde Google Cloud Console** (Alternativa)

1. Ve a: https://console.cloud.google.com
2. Selecciona proyecto: **turisteam-80f1b**
3. Busca en el buscador: **"Cloud Messaging API"**
4. Haz click en: **"Cloud Messaging API"**
5. Si está deshabilitada, haz click en: **"Enable"**
6. Espera 1-2 minutos
7. Ve a: **"Credentials"** → **"Cloud Messaging API Key"**
8. Copia la clave

---

## 🔗 **ENLACE DIRECTO**

Intenta abrir este enlace directamente:

```
https://console.firebase.google.com/project/turisteam-80f1b/settings/cloudmessaging
```

O este:

```
https://console.cloud.google.com/apis/credentials?project=turisteam-80f1b
```

---

## 🆘 **NECESITAS AYUDA?**

**Dime**:
1. ¿Ya abriste Firebase Console? ✅/❌
2. ¿Ves el proyecto "turisteam-80f1b"? ✅/❌
3. ¿Encontraste la pestaña "Cloud Messaging"? ✅/❌
4. ¿Ves el "Server Key"? ✅/❌

Con esa información te puedo ayudar mejor.

---

## ⏭️ **DESPUÉS DE OBTENER EL SERVER KEY**

Una vez tengas el Server Key, ejecuta estos comandos:

```bash
cd "C:\Users\USUARIO\Desktop\COBREROS\TU AYUNTAMIENTO\ayuntamiento-cobreros"

firebase functions:config:set fcm.server_key="TU_SERVER_KEY_AQUI"

firebase deploy --only functions:sendPushNotification
```

O simplemente **dime el Server Key** y yo lo configuro por ti.

---

**¿Puedes intentar acceder al enlace?** 🚀




