# 🔄 Actualización de reCAPTCHA

## ✅ Claves Actualizadas

### **SITE KEY (Frontend - Pública)**
- **Clave**: `6LdBqQQsAAAAADFZKDVWkWt2ugbV0Cccm6wExZzQ`
- **Ubicación**: 
  - ✅ `index.html` (script de reCAPTCHA)
  - ✅ `js/recaptcha.js` (constante RECAPTCHA_SITE_KEY)

### **SECRET KEY (Backend - Privada)**
- **Clave**: `6LdBqQQsAAAAAJvPf3JzsmY2NP30RuAZvyXUmBWd`
- **Ubicación**: Firebase Functions (configuración)

---

## 🔧 Configuración de SECRET KEY en Firebase Functions

### **Opción 1: Firebase Functions Config (v1)**
```bash
firebase functions:config:set recaptcha.secret_key="6LdBqQQsAAAAAJvPf3JzsmY2NP30RuAZvyXUmBWd"
firebase deploy --only functions
```

### **Opción 2: Firebase Functions Secrets (v2 - Recomendado)**
```bash
# Configurar secreto
firebase functions:secrets:set RECAPTCHA_SECRET_KEY

# Cuando se solicite, ingresar:
6LdBqQQsAAAAAJvPf3JzsmY2NP30RuAZvyXUmBWd

# Desplegar funciones
firebase deploy --only functions
```

---

## ✅ Verificación

### **Frontend**
1. Abre la consola del navegador (F12)
2. Verifica que reCAPTCHA se carga sin errores
3. Intenta hacer login/registro
4. Deberías ver en la consola: `✅ reCAPTCHA token obtenido`

### **Backend**
1. Verifica en Firebase Console → Functions → Logs
2. Al hacer login/registro, deberías ver logs de validación de reCAPTCHA

---

## 📝 Notas

- **SITE KEY**: Visible en el código frontend (es pública)
- **SECRET KEY**: Solo en el servidor (nunca exponer en el frontend)
- Las claves están actualizadas en el código
- La SECRET KEY debe configurarse manualmente en Firebase Functions

---

**Fecha de actualización**: Diciembre 2025  
**Estado**: ✅ SITE KEY actualizada | ⚠️ SECRET KEY requiere configuración manual

