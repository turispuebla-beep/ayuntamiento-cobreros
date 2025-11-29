# 🔧 Guía para Obtener Valores de Firebase

## 📋 Pasos para obtener los valores:

### 1️⃣ **API Key y App ID (App Web)**

1. Ve a: https://console.firebase.google.com/project/turisteam-80f1b/settings/general
2. Baja hasta la sección **"Your apps"**
3. Busca la app web del Ayuntamiento (debería tener un icono `</>`)
4. Si no la ves, haz clic en **"Add app"** → **Web (</>)**
5. Nombre de la app: `Ayuntamiento Cobreros Web`
6. Una vez creada/visible, haz clic en el icono de **configuración (⚙️)** o en el nombre de la app
7. Verás la configuración Firebase. Copia estos valores:
   - **apiKey**: Comienza por `AI` (no publiques la cadena completa)
   - **appId**: `1:623846192437:web:...` (empieza con 1:623846192437:web)

---

### 2️⃣ **VAPID Key (Para Notificaciones Push Web)**

1. Ve a: https://console.firebase.google.com/project/turisteam-80f1b/settings/cloudmessaging
2. Baja hasta la sección **"Web Push certificates"**
3. Si no existe un par de claves:
   - Haz clic en **"Generate key pair"**
   - Se generará automáticamente
4. Copia la **clave pública** (VAPID Key)
   - Ejemplo: `BHrX8K3m2Yq5vN9wP7sT4uR6eY8iU0oA2dF4gH6jK8lM0nP2qR4sT6uV8wX0yZ2aB4cD6eF8gH0`
   - Es una cadena larga de letras y números

---

## 📝 **Una vez tengas los 3 valores, dímelos:**

**Ejemplo:**
- API Key: `AIxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
- App ID: `1:623846192437:web:xxxxxxxxxxxxxxxxxxxx`
- VAPID Key: `BHrX8K3m2Yq5vN9wP7sT4uR6eY8iU0oA2dF4gH6jK8lM0nP2qR4sT6uV8wX0yZ2aB4cD6eF8gH0`

**Los actualizaré automáticamente en `index.html`**

---

## ✅ **Estado actual:**

- ✅ Firebase Functions desplegadas
- ✅ Gmail configurado (`yytsdzlzfpoknrxa`)
- ⏳ Pendiente: API Key, App ID y VAPID Key

