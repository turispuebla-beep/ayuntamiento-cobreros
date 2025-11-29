# 🔧 Obtener Configuración de Firebase

## 📋 Valores que necesitas obtener:

### 1. **API Key y App ID**
1. Ve a: https://console.firebase.google.com/project/turisteam-80f1b/settings/general
2. Baja hasta "Your apps" → Web app
3. Si no existe una app web, haz clic en "Add app" → Web (</>) 
4. Copia los valores:
   - **apiKey**: Ejemplo: `AIxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - **appId**: Ejemplo: `1:623846192437:web:xxxxxxxxxxxxxxxxxxxx`

### 2. **VAPID Key (para notificaciones push web)**
1. Ve a: https://console.firebase.google.com/project/turisteam-80f1b/settings/cloudmessaging
2. Baja hasta "Web Push certificates"
3. Si no existe, haz clic en "Generate key pair"
4. Copia la **clave pública** (VAPID Key)
   - Ejemplo: `BHrX8K3m2Yq5vN9wP7sT4uR6eY8iU0oA2dF4gH6jK8lM0nP2qR4sT6uV8wX0yZ2aB4cD6eF8gH0`

---

## 📝 Una vez tengas los valores:

**Dime los 3 valores y los actualizo en `index.html`:**
- API Key: `AIxx-...`
- App ID: `1:623846192437:web:...`
- VAPID Key: `BHrX8K...`

---

## ✅ Estado actual:

- ✅ Firebase Functions desplegadas
- ✅ Contraseña de email configurada (`yytsdzlzfpoknrxa`)
- ⏳ Pendiente: API Key, App ID y VAPID Key en `index.html`

