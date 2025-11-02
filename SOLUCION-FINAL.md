# 🔥 Solución Final: Firebase Blaze Deployment

## ⚠️ **Problema Detectado**

Hay dos problemas:
1. El plan Blaze no está completamente activado en Firebase
2. Firebase CLI tiene un alias corrupto en caché

---

## ✅ **Solución Paso a Paso**

### **Paso 1: Abrir Terminal Nueva**

Cierra TODAS las terminales y abre una **terminal completamente nueva**.

---

### **Paso 2: Ir al Proyecto**

```bash
cd "C:\Users\USUARIO\Desktop\COBREROS\TU AYUNTAMIENTO\ayuntamiento-cobreros"
```

---

### **Paso 3: Verificar Configuración**

```bash
firebase use
```

**Debe mostrar**: `Active Project: default (turisteam-80f1b)`

Si no funciona:

```bash
firebase use turisteam-80f1b
```

---

### **Paso 4: Activar Blaze en Firebase Console**

1. Abre: https://console.firebase.google.com/project/turisteam-80f1b/usage/details

2. Haz clic en **"Upgrade plan"** o **"Choose Blaze plan"**

3. Completa el proceso:
   - Confirma método de pago
   - Acepta términos
   - Haz clic en **"Activate"**

4. Espera 2-3 minutos a que se active

5. Verifica que diga **"Blaze"** en lugar de "Spark"

---

### **Paso 5: Desplegar Functions**

```bash
firebase deploy --only functions
```

---

## 🚨 **Si Persiste el Error**

### **Error: "Invalid project id"**

```bash
# Limpiar configuración
cd "C:\Users\USUARIO\Desktop\COBREROS\TU AYUNTAMIENTO\ayuntamiento-cobreros"

# Eliminar el archivo y recrearlo
del .firebaserc

# Crear nuevo
echo { > .firebaserc
echo   "projects": { >> .firebaserc
echo     "default": "turisteam-80f1b" >> .firebaserc
echo   } >> .firebaserc
echo } >> .firebaserc

# Verificar
firebase use
```

### **Error: "Must be on Blaze plan"**

1. Confirma que en Firebase Console dice **"Blaze"**
2. Si sigue diciendo "Spark", el upgrade no se completó
3. Repite el Paso 4

---

### **Error: "Missing required API"**

Espera 3-5 minutos después de activar Blaze para que Google habilite las APIs automáticamente.

Luego intenta de nuevo:
```bash
firebase deploy --only functions
```

---

## 📋 **Checklist Final**

Antes de intentar desplegar:

- [ ] Terminal nueva abierta
- [ ] Estás en la carpeta correcta
- [ ] `firebase use` funciona correctamente
- [ ] Blaze está activo en Firebase Console
- [ ] Esperaste 3-5 minutos después de activar Blaze
- [ ] Tienes método de pago configurado

---

## 🎯 **Comandos Directos**

Copia y pega estos comandos en la terminal NUEVA:

```bash
# 1. Ir al proyecto
cd "C:\Users\USUARIO\Desktop\COBREROS\TU AYUNTAMIENTO\ayuntamiento-cobreros"

# 2. Verificar proyecto
firebase use

# 3. Desplegar
firebase deploy --only functions
```

---

## 🆘 **Último Recurso**

Si nada funciona, prueba desplegar desde Google Cloud Console:

1. Abre: https://console.cloud.google.com/functions/list?project=turisteam-80f1b
2. Haz clic en **"Create Function"**
3. O usa el deploy manual desde ahí

---

**¡Suerte!** 💪🚀


