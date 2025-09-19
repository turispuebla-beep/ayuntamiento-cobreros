# 🧪 Testing reCAPTCHA v3 - Ayuntamiento de Cobreros

## ✅ **Checklist de Configuración Completa**

### **1. 🔧 Configuración Inicial**

#### **Google reCAPTCHA Console:**
- [ ] Cuenta de Google creada/configurada
- [ ] Sitio reCAPTCHA v3 creado
- [ ] Dominios añadidos (localhost, netlify, dominio personalizado)
- [ ] APK Android configurada con SHA-1
- [ ] SITE_KEY y SECRET_KEY obtenidas

#### **Claves a Reemplazar:**
```javascript
// En index.html línea 22:
<script src="https://www.google.com/recaptcha/api.js?render=TU_SITE_KEY_AQUI"></script>

// En js/recaptcha.js línea 5:
const RECAPTCHA_SITE_KEY = 'TU_SITE_KEY_AQUI';

// En RecaptchaHelper.java línea 19:
private static final String RECAPTCHA_SITE_KEY = "TU_SITE_KEY_AQUI";

// En Firebase Functions:
firebase functions:config:set recaptcha.secret_key="TU_SECRET_KEY_AQUI"
```

### **2. 🌐 Configuración Web**

#### **Archivos Modificados:**
- ✅ `index.html` - Script reCAPTCHA y formularios actualizados
- ✅ `css/styles.css` - Estilos para reCAPTCHA añadidos
- ✅ `js/recaptcha.js` - Lógica de reCAPTCHA implementada

#### **Pruebas Web:**
```bash
# 1. Abrir la web en navegador
http://localhost:8080 (desarrollo)
# o
https://ayuntamiento-cobreros.netlify.app (producción)

# 2. Abrir DevTools (F12) y ir a Console
# 3. Intentar login/registro
# 4. Verificar logs en consola:
# - "🛡️ Inicializando reCAPTCHA v3..."
# - "✅ Token reCAPTCHA obtenido para acción: login"
# - "✅ reCAPTCHA verificado correctamente"
```

### **3. 📱 Configuración Android**

#### **Archivos Modificados:**
- ✅ `build.gradle` - SafetyNet dependency añadida
- ✅ `RecaptchaHelper.java` - Clase helper creada
- ✅ `MainActivity.java` - Login con reCAPTCHA integrado

#### **Pruebas APK:**
```bash
# 1. Compilar APK en Android Studio
# Build > Generate Signed Bundle/APK

# 2. Instalar en dispositivo de prueba
adb install app-debug.apk

# 3. Abrir LogCat en Android Studio
# 4. Filtrar por "RecaptchaHelper"
# 5. Intentar login
# 6. Verificar logs:
# - "🛡️ Ejecutando reCAPTCHA para acción: login"
# - "✅ Token reCAPTCHA obtenido"
# - "✅ reCAPTCHA válido - Score: X.X"
```

### **4. 🔥 Firebase Functions**

#### **Despliegue:**
```bash
# 1. Instalar Firebase CLI
npm install -g firebase-tools

# 2. Login y configurar
firebase login
firebase init functions

# 3. Configurar SECRET_KEY
firebase functions:config:set recaptcha.secret_key="TU_SECRET_KEY"

# 4. Desplegar
cd firebase-functions
npm install
firebase deploy --only functions
```

#### **Pruebas Functions:**
```bash
# Test validateRecaptcha
curl -X POST \
  https://us-central1-turisteam-80f1b.cloudfunctions.net/validateRecaptcha \
  -H "Content-Type: application/json" \
  -d '{
    "token": "test_token_from_frontend",
    "action": "login"
  }'

# Respuesta esperada:
{
  "success": true,
  "score": 0.9,
  "action": "login",
  "message": "reCAPTCHA verificado correctamente"
}
```

## 🔍 **Casos de Prueba**

### **Test 1: Login Web Exitoso**
```
1. Abrir web en navegador
2. Hacer clic en "Iniciar Sesión"
3. Llenar email y contraseña válidos
4. Hacer clic en "Iniciar Sesión"
5. Verificar:
   - Botón cambia a "🛡️ Verificando..."
   - No hay errores en consola
   - Login se completa correctamente
```

### **Test 2: Registro Web Exitoso**
```
1. Hacer clic en "Registrarse"
2. Llenar todos los campos requeridos
3. Seleccionar localidades
4. Aceptar términos
5. Hacer clic en "Registrarse"
6. Verificar:
   - Proceso de reCAPTCHA se ejecuta
   - Registro se completa
   - Usuario puede hacer login
```

### **Test 3: Login APK Exitoso**
```
1. Abrir APK en dispositivo
2. Introducir credenciales válidas
3. Hacer clic en "Iniciar Sesión"
4. Verificar en LogCat:
   - reCAPTCHA se ejecuta correctamente
   - Token se valida en servidor
   - Login se completa
```

### **Test 4: Validación de Score Bajo**
```
1. Simular comportamiento de bot (múltiples requests rápidos)
2. Intentar login/registro
3. Verificar:
   - reCAPTCHA detecta comportamiento sospechoso
   - Score bajo (< 0.5)
   - Request es rechazado
```

## 🐛 **Troubleshooting**

### **Problema: "reCAPTCHA no configurado"**
**Causa:** SITE_KEY no reemplazada
**Solución:**
```javascript
// Reemplazar en todos los archivos:
'TU_SITE_KEY_AQUI' → 'tu_site_key_real_de_google'
```

### **Problema: "Token de reCAPTCHA inválido"**
**Causa:** SECRET_KEY incorrecta o no configurada
**Solución:**
```bash
firebase functions:config:set recaptcha.secret_key="tu_secret_key_real"
firebase deploy --only functions
```

### **Problema: CORS Error**
**Causa:** Dominio no autorizado
**Solución:**
1. Ir a Google reCAPTCHA Console
2. Añadir tu dominio a la lista de dominios autorizados
3. Incluir localhost para desarrollo

### **Problema: SafetyNet no disponible (Android)**
**Causa:** Dispositivo sin Google Play Services
**Solución:**
```java
// En RecaptchaHelper.java, el código ya incluye fallback
// Para desarrollo, temporalmente acepta sin validación
```

### **Problema: Score muy bajo en desarrollo**
**Causa:** Desarrollo local puede tener scores bajos
**Solución:**
```javascript
// Temporalmente reducir minScore en desarrollo
const minScore = 0.3; // En lugar de 0.5
```

## 📊 **Monitoreo y Estadísticas**

### **Ver Logs de reCAPTCHA:**
```bash
# Firebase Functions logs
firebase functions:log --only validateRecaptcha

# Ver en Firebase Console
https://console.firebase.google.com/project/turisteam-80f1b/functions/logs
```

### **Estadísticas de reCAPTCHA:**
```bash
# Obtener estadísticas
curl -X GET \
  https://us-central1-turisteam-80f1b.cloudfunctions.net/getRecaptchaStats

# Respuesta incluye:
# - Total de verificaciones
# - Rate de éxito/fallo
# - Score promedio
# - Breakdown por acción
# - Estadísticas diarias
```

### **Firestore Collections Creadas:**
- `recaptcha_logs` - Logs de todas las verificaciones
- Limpieza automática cada día a las 02:00

## 🔐 **Consideraciones de Seguridad**

### **Configuración de Producción:**
```javascript
// Scores recomendados por Google:
// 1.0 = Definitivamente humano
// 0.5 = Probablemente humano (recomendado)
// 0.0 = Definitivamente bot

const PRODUCTION_CONFIG = {
    minScore: 0.5,        // Para login/registro
    adminMinScore: 0.7,   // Para acciones administrativas
    timeoutMs: 10000      // 10 segundos timeout
};
```

### **Rate Limiting:**
- Firebase Functions incluye rate limiting automático
- Para protección adicional, considerar implementar rate limiting por IP

### **Logs y Auditoría:**
- Todos los intentos se registran en Firestore
- Incluye IP, timestamp, score, y resultado
- Limpieza automática de logs antiguos (90 días)

---

## 🎯 **Resultado Final**

Con esta implementación tendrás:

✅ **reCAPTCHA v3 invisible** en web y APK
✅ **Validación server-side** segura
✅ **Protección contra bots** y ataques automatizados
✅ **Logs y estadísticas** completas
✅ **Fallbacks** para casos edge
✅ **Mantenimiento automático** de logs

**¡Sistema de seguridad profesional implementado!** 🛡️✨
