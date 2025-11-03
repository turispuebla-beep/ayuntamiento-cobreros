# 🔑 CÓMO OBTENER EL SERVER KEY

## 🎯 **MÉTODO MÁS FÁCIL**

### **1. Abre este enlace directo:**

```
https://console.firebase.google.com/project/turisteam-80f1b/settings/cloudmessaging
```

O manualmente:
1. Ve a: https://console.firebase.google.com
2. Proyecto: **TURISTEAM** (turisteam-80f1b)
3. ⚙️ **Engranaje** → **Project settings**
4. Pestaña: **Cloud Messaging**

---

### **2. Busca "Cloud Messaging API (Legacy)"**

Scroll hacia abajo hasta ver esta sección.

**Deberías ver**:
- **Cloud Messaging API (Legacy)** ✅
- Debajo: **"Server Key"**
- Botón: **"Copy"** o **"Copiar"**

---

### **3. Haz click en "Copy"**

Copiará tu Server Key. Debería ser algo como:
```
AAAA123456:APA91bHcD...
```

**Largo**: ~150 caracteres  
**Empieza**: AAAA  
**Tiene**: guiones (-) y dos puntos (:)

---

## 🆘 **SI NO LO VES**

### **Opción A: Está deshabilitado**

Si ves "Cloud Messaging API (Legacy) - **Disabled**":

1. Click en: **"Enable"** o **"Habilitar"**
2. Espera 1-2 minutos
3. Refresca la página
4. Ahora deberías ver la Server Key

---

### **Opción B: Desde Google Cloud Console**

Si no funciona lo anterior:

1. Ve a: https://console.cloud.google.com
2. Proyecto: **turisteam-80f1b**
3. Busca: **"Cloud Messaging API"** (arriba)
4. Click: **"Manage"** o **"Administrar"**
5. Si está deshabilitada, **"Enable"**
6. Espera 1-2 minutos
7. Ve a: **"APIs & Services"** → **"Credentials"**
8. Busca: **"API Keys"** o **"Cloud Messaging API Key"**
9. Copia la clave

---

### **Opción C: Buscar en Credentials**

En Firebase Console:
1. ⚙️ **Settings** → **Project settings**
2. **"Service accounts"** (pestaña)
3. Click en: **"Generate new private key"**
4. Esto descarga un JSON con credenciales

---

## 📸 **RESULTADO ESPERADO**

Deberías ver algo así:

```
Cloud Messaging API (Legacy)
  
  ✅ Enabled
  
  Server Key
  AAAAxxxxx:APA91b...
  [Copy] [Show]
  
  Sender ID
  623846192437
```

---

## ✅ **SI YA LO TIENES**

Si ya tienes la Server Key, ejecuta:

```bash
cd "C:\Users\USUARIO\Desktop\COBREROS\TU AYUNTAMIENTO\ayuntamiento-cobreros"

firebase functions:config:set fcm.server_key="PEGA_AQUI_LA_CLAVE"

firebase deploy --only functions:sendPushNotification
```

---

## 🆘 **AYUDA**

**Dime**:
1. ¿Pudiste abrir Firebase Console? ✅/❌
2. ¿Ves la pestaña "Cloud Messaging"? ✅/❌
3. ¿Qué ves en esa pantalla? (describe)
4. ¿Hay algún botón "Enable"? ✅/❌

Con esa info te ayudo mejor.

---

**¡Prueba el primer método primero!** Es el más fácil 🚀


