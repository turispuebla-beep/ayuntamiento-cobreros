# 🔥 Firebase Functions Setup - reCAPTCHA Validation

## 📋 **Guía de Configuración y Despliegue**

### **1. 🛠️ Instalar Firebase CLI**

```bash
# Instalar Firebase CLI globalmente
npm install -g firebase-tools

# Verificar instalación
firebase --version
```

### **2. 🔐 Configurar Proyecto Firebase**

```bash
# Iniciar sesión en Firebase
firebase login

# Inicializar proyecto (ejecutar en la raíz del proyecto)
firebase init functions

# Seleccionar:
# - Use an existing project: ayuntamiento-de-cobreros
# - Language: JavaScript
# - ESLint: No (opcional)
# - Install dependencies: Yes
```

### **3. 📁 Estructura de Archivos**

```
(raíz ayuntamiento-cobreros)
├── firebase.json         # Apunta "functions" → firebase-functions/
├── .firebaserc           # Proyecto default ayuntamiento-de-cobreros
└── firebase-functions/
    ├── index.js          # Funciones principales
    └── package.json      # Dependencias
```

### **4. ⚙️ Configurar Variables de Entorno**

```bash
# Configurar SECRET KEY de reCAPTCHA
firebase functions:config:set recaptcha.secret_key="TU_SECRET_KEY_DE_RECAPTCHA_AQUI"

# Verificar configuración
firebase functions:config:get
```

### **5. 🚀 Desplegar Functions**

```bash
# Desde la raíz del repo (donde están firebase.json y .firebaserc)
cd firebase-functions
npm install
cd ..

# Desplegar todas las functions
firebase deploy --only functions

# Desplegar una function específica
firebase deploy --only functions:validateRecaptcha
```

### **6. 🔗 URLs de las Functions**

Después del despliegue, tendrás estas URLs:

```
📍 validateRecaptcha:
https://us-central1-ayuntamiento-de-cobreros.cloudfunctions.net/validateRecaptcha

📍 getRecaptchaStats:
https://us-central1-ayuntamiento-de-cobreros.cloudfunctions.net/getRecaptchaStats

📍 cleanupRecaptchaLogs:
Función automática (ejecuta diariamente)
```

### **7. 🧪 Probar Functions**

#### **Probar validateRecaptcha:**
```bash
curl -X POST \
  https://us-central1-ayuntamiento-de-cobreros.cloudfunctions.net/validateRecaptcha \
  -H "Content-Type: application/json" \
  -d '{
    "token": "TOKEN_DE_RECAPTCHA_AQUI",
    "action": "login"
  }'
```

#### **Probar getRecaptchaStats:**
```bash
curl -X GET \
  https://us-central1-ayuntamiento-de-cobreros.cloudfunctions.net/getRecaptchaStats
```

### **8. 📊 Monitoreo y Logs**

```bash
# Ver logs en tiempo real
firebase functions:log

# Ver logs de una función específica
firebase functions:log --only validateRecaptcha

# Ver logs en Firebase Console
# https://console.firebase.google.com/project/ayuntamiento-de-cobreros/functions/logs
```

### **9. 🔧 Configuración Adicional**

#### **Actualizar URLs en el código:**

**En `js/recaptcha.js`:**
```javascript
// Actualizar URL de validación
const VALIDATION_URL = 'https://us-central1-ayuntamiento-de-cobreros.cloudfunctions.net/validateRecaptcha';
```

**En `RecaptchaHelper.java`:**
```java
// Actualizar URL de validación
private static final String VALIDATION_URL = "https://us-central1-ayuntamiento-de-cobreros.cloudfunctions.net/validateRecaptcha";
```

### **10. 🛡️ Seguridad**

#### **Configurar CORS (ya incluido en las functions):**
- Permite requests desde tu dominio
- Headers necesarios configurados
- Manejo de preflight OPTIONS

#### **Validaciones implementadas:**
- ✅ Token obligatorio
- ✅ Acción obligatoria
- ✅ Verificación con Google API
- ✅ Validación de puntuación mínima
- ✅ Logs de auditoría
- ✅ Limpieza automática de logs

### **11. 🚨 Troubleshooting**

#### **Error: "reCAPTCHA no configurado"**
```bash
# Verificar configuración
firebase functions:config:get

# Reconfigurar si es necesario
firebase functions:config:set recaptcha.secret_key="TU_SECRET_KEY"
firebase deploy --only functions
```

#### **Error CORS:**
- Verificar que el dominio esté en la lista de dominios autorizados en reCAPTCHA Console
- Las functions ya incluyen configuración CORS

#### **Error de permisos:**
```bash
# Verificar permisos de Firebase
firebase login --reauth

# Verificar proyecto activo
firebase use --list
firebase use ayuntamiento-de-cobreros
```

### **12. 💰 Costos**

#### **Firebase Functions (Plan Blaze):**
- **Invocaciones gratuitas**: 2M/mes
- **GB-segundos gratuitos**: 400,000/mes
- **Tiempo de CPU gratuito**: 200,000 GHz-segundos/mes

Para el Ayuntamiento de Cobreros, el uso será **mínimo** y probablemente **gratuito**.

### **13. 🔄 Actualizaciones**

```bash
# Actualizar functions
cd firebase-functions
firebase deploy --only functions

# Ver versiones desplegadas
firebase functions:list
```

---

## ✅ **Checklist de Configuración**

- [ ] Firebase CLI instalado
- [ ] Proyecto inicializado
- [ ] SECRET_KEY configurada
- [ ] Functions desplegadas
- [ ] URLs actualizadas en el código
- [ ] Probado con requests de prueba
- [ ] Monitoreo configurado

**¡Functions listas para validar reCAPTCHA!** 🛡️✨
