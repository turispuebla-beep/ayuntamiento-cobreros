# 🔍 CÓMO VERIFICAR EN FIREBASE CONSOLE

## 📍 **PASOS EXACTOS PARA VER SI ESTÁ DESPLEGADO**

### **1. Abre este enlace**:

```
https://console.firebase.google.com/project/turisteam-80f1b/functions/list
```

---

### **2. ¿Qué debes ver?**

Si la función está desplegada, verás algo como:

```
Functions in turisteam-80f1b

┌─────────────────────────┬─────────────┬──────────┬──────────────────┐
│ Name                    │ Trigger     │ Region   │ Status          │
├─────────────────────────┼─────────────┼──────────┼──────────────────┤
│ sendPushNotification    │ HTTP        │ us-...   │ ✅ Active       │
│ sendEmail               │ HTTP        │ us-...   │ ✅ Active       │
└─────────────────────────┴─────────────┴──────────┴──────────────────┘
```

**O simplemente**:
- `sendPushNotification` en la lista
- Estado: **Active** o **Verde**

---

### **3. ¿Qué hacer?**

**Si ves `sendPushNotification`**:
✅ **¡ESTÁ DESPLEGADO!** Todo listo.

**Si NO la ves**:
❌ No está desplegado aún. Necesitamos desplegarlo manualmente.

---

## 🆘 **SI NO LA VES - DESPLEGAR MANUALMENTE**

Abre PowerShell en tu computadora y ejecuta:

```powershell
cd "C:\Users\USUARIO\Desktop\COBREROS\TU AYUNTAMIENTO\ayuntamiento-cobreros"

firebase deploy --only functions:sendPushNotification
```

Esto tardará 2-5 minutos.

---

## 📊 **OPCIÓN ALTERNATIVA - VER TODAS LAS FUNCIONES**

Si el enlace anterior no funciona, usa este:

```
https://console.firebase.google.com/project/turisteam-80f1b/functions
```

Y luego busca **"sendPushNotification"** en la lista.

---

## ✅ **RESULTADO**

**Dime qué ves**:
1. ¿Ves la función `sendPushNotification`? ✅/❌
2. ¿Qué estado tiene? (Active, Deploying, Error...)
3. ¿Cuántas funciones ves en total?

---

**¡Abre el primer enlace y mira!** 👀


