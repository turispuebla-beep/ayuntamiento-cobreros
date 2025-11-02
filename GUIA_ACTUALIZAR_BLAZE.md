# 🔥 Guía de Actualización a Firebase Blaze

## 📋 **Configuración Completa de Firebase Functions**

Esta guía te ayudará a configurar Firebase Functions con el plan Blaze para enviar emails desde el sistema de citas previas.

---

## ✅ **1. Verificación de Archivos de Configuración**

Los siguientes archivos ya están configurados correctamente:

- ✅ **firebase.json** - Configuración de Firebase Functions
- ✅ **.firebaserc** - Proyecto Firebase configurado (turisteam-80f1b)
- ✅ **functions/package.json** - Dependencias de Node.js
- ✅ **functions/tsconfig.json** - Configuración de TypeScript
- ✅ **functions/src/index.ts** - Código de las funciones limpiado

---

## 🚀 **2. Instalación de Dependencias**

Abre una terminal en la carpeta `functions` e instala las dependencias:

```bash
# Ir a la carpeta de functions
cd functions

# Instalar dependencias
npm install
```

Esto instalará:
- `firebase-admin`
- `firebase-functions`
- `nodemailer`
- `cors`
- `typescript` y tipos

---

## 🔐 **3. Configurar la Contraseña de Gmail**

### **Opción A: Generar Contraseña de Aplicación de Gmail**

1. **Activar verificación en dos pasos** en tu cuenta de Gmail:
   - Ir a: https://myaccount.google.com/security
   - Activar "Verificación en dos pasos"

2. **Generar contraseña de aplicación**:
   - Ir a: https://myaccount.google.com/apppasswords
   - Seleccionar "Aplicación": Correo
   - Seleccionar "Dispositivo": Otro (nombre personalizado) → "Ayuntamiento Cobreros"
   - Hacer clic en "Generar"
   - **Copiar la contraseña de 16 caracteres** (sin espacios)

### **Opción B: Configurar en Firebase**

```bash
# Configurar la contraseña en Firebase (reemplaza TU_PASSWORD con la contraseña de aplicación)
firebase functions:config:set gmail.password="TU_PASSWORD"

# Verificar configuración
firebase functions:config:get
```

---

## 🔨 **4. Compilar TypeScript**

Compila el código TypeScript a JavaScript:

```bash
# Desde la carpeta functions
npm run build
```

Esto generará los archivos JavaScript en `functions/lib/`

---

## 🚀 **5. Desplegar Firebase Functions**

```bash
# Asegúrate de estar en la raíz del proyecto
cd C:\Users\USUARIO\Desktop\COBREROS\TU AYUNTAMIENTO\ayuntamiento-cobreros

# Verificar que Firebase CLI esté instalado
firebase --version

# Si no está instalado:
npm install -g firebase-tools

# Iniciar sesión en Firebase
firebase login

# Verificar que estás en el proyecto correcto
firebase use

# Desplegar funciones
firebase deploy --only functions
```

---

## 🌐 **6. Verificar el Despliegue**

Después del despliegue, recibirás una URL como esta:

```
https://us-central1-turisteam-80f1b.cloudfunctions.net/sendEmail
```

**⚠️ IMPORTANTE**: Esta URL debe coincidir con la variable `FIREBASE_FUNCTIONS_URL` en tu `script.js`.

Verifica en `js/script.js` (línea ~41):
```javascript
const FIREBASE_FUNCTIONS_URL = 'https://us-central1-turisteam-80f1b.cloudfunctions.net/sendEmail';
```

---

## 🧪 **7. Probar la Función**

### **Prueba con curl (desde terminal):**

```bash
curl -X POST https://us-central1-turisteam-80f1b.cloudfunctions.net/sendEmail \
  -H "Content-Type: application/json" \
  -d "{\"to\":\"tu-email@gmail.com\",\"subject\":\"Prueba\",\"template\":\"appointment_confirmation\",\"data\":{\"name\":\"Test\",\"service\":\"Atención al Ciudadano\",\"date\":\"2024-01-01\",\"time\":\"10:00\",\"dni\":\"12345678A\"}}"
```

### **Prueba desde la web:**

1. Ir a tu sitio del Ayuntamiento
2. Registrarte o iniciar sesión
3. Solicitar una cita previa
4. Verificar que recibes el email de confirmación

---

## 📊 **8. Ver Logs de Firebase Functions**

```bash
# Ver logs en tiempo real
firebase functions:log

# Ver logs de una función específica
firebase functions:log --only sendEmail
```

---

## 🔄 **9. Actualizar Funciones**

Para actualizar las funciones después de hacer cambios:

```bash
# 1. Compilar TypeScript
cd functions
npm run build
cd ..

# 2. Desplegar
firebase deploy --only functions

# O desplegar una función específica
firebase deploy --only functions:sendEmail
```

---

## 💰 **10. Costos de Firebase Blaze**

### **Gratis (Spitfire Tier):**
- **Invocaciones**: 2 millones/mes
- **GB-segundos**: 400,000/mes
- **CPU GHz-segundos**: 200,000/mes

### **Pago solo por lo que uses:**
- **Después del tier gratuito**: $0.40 por millón de invocaciones
- **GB-segundos**: $0.0000025 por GB-segundo
- **CPU**: $0.0000100 por GHz-segundo

**Para el Ayuntamiento de Cobreros**: El uso será **mínimo** y probablemente **100% gratis**.

---

## ⚠️ **Solución de Problemas**

### **Error: "Failed to load functions source code"**
```bash
# Verificar que la carpeta lib existe
cd functions
npm run build
cd ..

# Intentar despliegue de nuevo
firebase deploy --only functions
```

### **Error: "Authentication failed"**
```bash
# Reiniciar sesión
firebase logout
firebase login
firebase use turisteam-80f1b
```

### **Error: "Gmail password not configured"**
```bash
# Configurar la contraseña
firebase functions:config:set gmail.password="TU_CONTRASEÑA_DE_APLICACION"
firebase deploy --only functions
```

### **Error de CORS en el navegador**
La función ya incluye configuración CORS automática. Si persiste:

1. Verificar que la URL es correcta en `script.js`
2. Verificar que la función esté desplegada
3. Ver logs: `firebase functions:log --only sendEmail`

---

## 📝 **Checklist Final**

- [ ] Firebase CLI instalado (`firebase --version`)
- [ ] Dependencias instaladas (`npm install` en functions/)
- [ ] TypeScript compilado (`npm run build`)
- [ ] Contraseña de Gmail configurada en Firebase
- [ ] Sesión iniciada en Firebase (`firebase login`)
- [ ] Proyecto correcto seleccionado (`firebase use`)
- [ ] Funciones desplegadas (`firebase deploy --only functions`)
- [ ] URL verificada en script.js
- [ ] Prueba realizada y email recibido
- [ ] Logs verificados sin errores

---

## 🎯 **Próximos Pasos**

1. **Probar el sistema completo** desde la web
2. **Verificar emails** en el buzón de u2389387944@gmail.com
3. **Monitorear logs** durante los primeros días
4. **Configurar alertas** en Firebase Console (opcional)

---

## 📚 **Recursos Adicionales**

- **Firebase Console**: https://console.firebase.google.com/project/turisteam-80f1b
- **Firebase Docs**: https://firebase.google.com/docs/functions
- **Nodemailer Docs**: https://nodemailer.com/about/
- **Gmail App Passwords**: https://support.google.com/accounts/answer/185833

---

**¡Configuración completada!** 🎉✨

Ahora tu sistema de citas previas puede enviar emails automáticamente usando Firebase Blaze.




