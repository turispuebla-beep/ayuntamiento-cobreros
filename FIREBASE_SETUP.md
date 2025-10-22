# 🔥 Configuración de Firebase para Envío de Emails

## 📋 Pasos para Configurar Firebase Functions

### 1. **Instalar Firebase CLI**
```bash
npm install -g firebase-tools
```

### 2. **Inicializar Firebase en el proyecto**
```bash
cd ayuntamiento-cobreros
firebase login
firebase init
```

### 3. **Configurar Gmail App Password**
1. Ve a tu cuenta de Gmail (aytocobrero@gmail.com)
2. Activa la verificación en 2 pasos
3. Genera una "Contraseña de aplicación" específica
4. Configura la contraseña en Firebase:

```bash
firebase functions:config:set gmail.password="tu_app_password_aqui"
```

### 4. **Instalar dependencias**
```bash
cd functions
npm install
```

### 5. **Desplegar las funciones**
```bash
firebase deploy --only functions
```

## 📧 Configuración de Email

### **Variables de Entorno Necesarias:**
- `GMAIL_PASSWORD`: Contraseña de aplicación de Gmail
- `ADMIN_EMAIL`: aytocobrero@gmail.com
- `ADMIN_NAME`: Ayuntamiento de Cobreros

### **Funcionalidades Implementadas:**
✅ Envío automático de confirmaciones de cita
✅ Templates HTML profesionales
✅ Fallback a texto plano
✅ Manejo de errores
✅ CORS configurado
✅ Logs detallados

## 🚀 Uso

Una vez desplegado, el sistema enviará automáticamente emails cuando:
- Un usuario solicite una cita previa
- Se confirme una cita
- Se cancele una cita

## 📱 Endpoints Disponibles

- `POST /api/send-email` - Enviar email de confirmación
- `GET /api/health` - Verificar estado del servicio

## 🔧 Desarrollo Local

```bash
# Ejecutar emulador local
firebase emulators:start --only functions

# Ver logs
firebase functions:log
```

## 📊 Monitoreo

- Logs en Firebase Console
- Métricas de envío
- Errores y reintentos automáticos
