# 📱 Sistema de Notificaciones Push - Ayuntamiento de Cobreros

## 🎯 **Resumen del Sistema**

El sistema de notificaciones tiene **dos modos de funcionamiento**:

### **🖥️ MODO LOCAL (Actual - Sin Firebase)**
- ✅ **Notificaciones del navegador** (funcionan localmente)
- ✅ **Sistema de permisos** y consentimiento
- ✅ **Integración automática** con creación de bandos/noticias
- ❌ **Limitación:** Solo funciona en el navegador donde se creó el contenido

### **🚀 MODO FIREBASE (Completo - Con Firebase)**
- ✅ **Notificaciones Push reales** a todos los dispositivos
- ✅ **Envío masivo** a usuarios registrados
- ✅ **Filtrado por localidades** (Cobreros, etc.)
- ✅ **Notificaciones offline** (app cerrada)
- ✅ **Sincronización** entre web y app móvil

---

## 🔧 **Configuración Actual (Sin Firebase)**

### **✅ Lo que YA funciona:**
1. **Notificaciones automáticas** al crear bandos y noticias
2. **Sistema de permisos** del navegador
3. **Interfaz de administración** para envío manual
4. **Página de pruebas** (`test_notificaciones.html`)

### **📋 Cómo probar:**
1. Abrir `test_notificaciones.html`
2. Permitir notificaciones del navegador
3. Registrar un usuario con consentimiento
4. Iniciar sesión como admin
5. Crear un bando o noticia
6. Verificar que aparece la notificación

---

## 🚀 **Configuración Completa (Con Firebase)**

### **1. 📦 Instalar Firebase CLI**
```bash
npm install -g firebase-tools
firebase login
```

### **2. 🔥 Configurar Proyecto Firebase**
```bash
cd firebase-functions
firebase init functions
# Seleccionar proyecto: turisteam-80f1b
# Idioma: JavaScript
```

### **3. ⚙️ Configurar Variables**
```bash
# Configurar reCAPTCHA
firebase functions:config:set recaptcha.secret_key="TU_SECRET_KEY_AQUI"

# Verificar configuración
firebase functions:config:get
```

### **4. 🚀 Desplegar Functions**
```bash
cd firebase-functions
npm install
firebase deploy --only functions
```

### **5. 🔗 URLs de las Functions**
Después del despliegue:
```
📍 validateRecaptcha:
https://us-central1-turisteam-80f1b.cloudfunctions.net/validateRecaptcha

📍 sendPushNotification:
https://us-central1-turisteam-80f1b.cloudfunctions.net/sendPushNotification

📍 getRecaptchaStats:
https://us-central1-turisteam-80f1b.cloudfunctions.net/getRecaptchaStats
```

### **6. 📱 Configurar Firebase en la Web**
Agregar en `index.html` (antes del cierre de `</body>`):
```html
<!-- Firebase SDK -->
<script src="https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.0.0/firebase-functions.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging.js"></script>

<script>
// Configuración de Firebase
const firebaseConfig = {
    apiKey: "TU_API_KEY",
    authDomain: "turisteam-80f1b.firebaseapp.com",
    projectId: "turisteam-80f1b",
    storageBucket: "turisteam-80f1b.appspot.com",
    messagingSenderId: "TU_SENDER_ID",
    appId: "TU_APP_ID"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
</script>
```

### **7. 📱 Configurar App Móvil (Android)**
En `android-app/app/google-services.json`:
```json
{
  "project_info": {
    "project_id": "turisteam-80f1b",
    "project_number": "TU_PROJECT_NUMBER"
  },
  "client": [
    {
      "client_info": {
        "mobilesdk_app_id": "TU_APP_ID",
        "android_client_info": {
          "package_name": "com.ayuntamiento.cobreros"
        }
      }
    }
  ]
}
```

---

## 🎯 **Funcionamiento del Sistema**

### **📄 Al crear un Bando:**
1. **Se guarda** en localStorage
2. **Se actualiza** la página
3. **Se envía notificación automática:**
   - **Sin Firebase:** Solo notificación del navegador
   - **Con Firebase:** Notificación push a todos los usuarios

### **📢 Al crear una Noticia:**
1. **Se guarda** en localStorage
2. **Se actualiza** la página
3. **Se envía notificación automática:**
   - **Sin Firebase:** Solo notificación del navegador
   - **Con Firebase:** Notificación push a todos los usuarios

### **🔔 Notificaciones Manuales:**
- **Panel de administración** → Pestaña "Notificaciones"
- **Envío personalizado** con título y mensaje
- **Filtrado por localidades** (solo con Firebase)

---

## 📊 **Estructura de Datos**

### **👥 Usuarios (Firestore):**
```json
{
  "nombre": "Juan",
  "apellidos": "Pérez",
  "email": "juan@email.com",
  "telefono": "123456789",
  "notificationConsent": true,
  "fcmToken": "token_fcm_aqui",
  "localities": ["Cobreros"],
  "registeredFrom": "WEB",
  "registrationDate": "2024-01-01T00:00:00Z"
}
```

### **📱 Notificaciones (Firestore):**
```json
{
  "userId": "user_id",
  "userEmail": "juan@email.com",
  "title": "Nuevo Bando Municipal",
  "message": "Se ha publicado un nuevo bando...",
  "type": "bando",
  "timestamp": "2024-01-01T00:00:00Z",
  "read": false,
  "sentFrom": "FIREBASE_FUNCTION",
  "fcmToken": "token_fcm_aqui",
  "localities": ["Cobreros"]
}
```

---

## 🧪 **Pruebas del Sistema**

### **1. 🖥️ Pruebas Locales:**
```bash
# Abrir página de pruebas
start test_notificaciones.html

# Probar notificaciones básicas
# Verificar permisos del navegador
# Crear contenido desde admin
```

### **2. 🚀 Pruebas con Firebase:**
```bash
# Probar función de notificaciones
curl -X POST \
  https://us-central1-turisteam-80f1b.cloudfunctions.net/sendPushNotification \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test de Notificación",
    "message": "Esta es una notificación de prueba",
    "type": "test"
  }'
```

### **3. 📱 Pruebas en App Móvil:**
- Instalar app en dispositivo
- Registrar usuario con notificaciones
- Crear contenido desde web
- Verificar que llega notificación

---

## 💰 **Costos de Firebase**

### **📊 Plan Blaze (Pay-as-you-go):**
- **Firebase Functions:** 2M invocaciones/mes gratuitas
- **Firestore:** 1GB almacenamiento gratuito
- **FCM:** Notificaciones ilimitadas gratuitas

### **💡 Para el Ayuntamiento de Cobreros:**
- **Uso estimado:** Muy bajo
- **Costo esperado:** **GRATUITO** (dentro de límites gratuitos)
- **Escalabilidad:** Sin límites

---

## 🔄 **Migración de Datos**

### **📤 Exportar datos actuales:**
```javascript
// En la consola del navegador
const data = {
  users: JSON.parse(localStorage.getItem('users') || '[]'),
  bandos: JSON.parse(localStorage.getItem('bandos') || '[]'),
  news: JSON.parse(localStorage.getItem('news') || '[]')
};
console.log(JSON.stringify(data, null, 2));
```

### **📥 Importar a Firebase:**
- Usar función `migrateUsersToFirestore()` en el código
- Sincronizar automáticamente al registrar nuevos usuarios

---

## 🛠️ **Mantenimiento**

### **📊 Monitoreo:**
```bash
# Ver logs de Firebase
firebase functions:log

# Ver estadísticas
curl https://us-central1-turisteam-80f1b.cloudfunctions.net/getRecaptchaStats
```

### **🧹 Limpieza automática:**
- **Logs de reCAPTCHA:** Se limpian automáticamente cada 90 días
- **Notificaciones leídas:** Se pueden limpiar manualmente
- **Tokens FCM inválidos:** Se eliminan automáticamente

---

## ✅ **Checklist de Configuración**

### **🖥️ Modo Local:**
- [x] Notificaciones del navegador funcionando
- [x] Integración automática con bandos/noticias
- [x] Página de pruebas creada
- [x] Sistema de permisos configurado

### **🚀 Modo Firebase:**
- [ ] Firebase CLI instalado
- [ ] Proyecto configurado
- [ ] Functions desplegadas
- [ ] Configuración en web agregada
- [ ] App móvil configurada
- [ ] Pruebas realizadas
- [ ] Migración de datos completada

---

## 🎉 **Resultado Final**

### **✅ Sistema Completo:**
- **Notificaciones automáticas** al crear contenido
- **Envío masivo** a todos los usuarios
- **Filtrado por localidades**
- **Funcionamiento offline**
- **Sincronización web-móvil**
- **Panel de administración completo**

**¡El sistema de notificaciones está listo para funcionar tanto localmente como con Firebase!** 🚀📱




