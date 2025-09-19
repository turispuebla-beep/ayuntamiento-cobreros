# 🛡️ Configuración reCAPTCHA v3 - Ayuntamiento de Cobreros

## 📋 **Paso 1: Configurar en Google Console**

### **1.1 Ir a Google reCAPTCHA Console:**
```
https://www.google.com/recaptcha/admin/create
```

### **1.2 Configurar el sitio:**
- **Etiqueta**: Ayuntamiento de Cobreros
- **Tipo**: reCAPTCHA v3
- **Dominios**:
  - `ayuntamiento-cobreros.netlify.app`
  - `localhost` (para desarrollo)
  - Tu dominio personalizado si lo tienes

### **1.3 Configurar para Android:**
- **Nombre del paquete**: `com.turisteam.ayuntamientocobreros`
- **Certificado SHA-1**: (obtener de Android Studio)

### **1.4 Obtener las claves:**
```javascript
// Claves que necesitarás:
const RECAPTCHA_CONFIG = {
    SITE_KEY: "6Lc..._tu_site_key_aqui",     // Para el frontend
    SECRET_KEY: "6Lc..._tu_secret_key_aqui"  // Para el backend (¡MANTENER SECRETO!)
};
```

## 🔧 **Paso 2: Obtener SHA-1 de Android Studio**

### **2.1 En Android Studio:**
```bash
# Terminal en Android Studio:
./gradlew signingReport

# O manualmente:
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

### **2.2 Copiar el SHA-1:**
```
SHA1: AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD
```

## 📱 **Configuración para Desarrollo vs Producción**

### **Desarrollo:**
- Usar `debug.keystore` (automático en Android Studio)
- Dominio: `localhost`

### **Producción:**
- Generar keystore de producción
- Dominio: tu dominio real
- Configurar ambas claves en reCAPTCHA Console

## ⚠️ **Importante:**
- **NUNCA** subir el `SECRET_KEY` al repositorio
- Usar variables de entorno en Firebase Functions
- Configurar tanto para desarrollo como producción
