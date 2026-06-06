# Verificación de Cambios en index.html

Este documento lista todos los cambios que DEBEN estar presentes en `index.html` después del despliegue en Netlify.

## ✅ Cambios que DEBEN aparecer en el index.html desplegado:

### 1. Meta Tags para Tracking Prevention (Líneas 7-12)
```html
<!-- Meta tags para evitar Tracking Prevention -->
<meta name="referrer" content="no-referrer-when-downgrade">
<meta name="robots" content="index, follow">
<!-- Indicar que es un sitio gubernamental oficial -->
<meta name="government-entity" content="true">
<meta name="category" content="government">
```

**Ubicación**: Justo después del `<title>` en el `<head>`

### 2. Preloads Optimizados (Líneas 22-24)
```html
<!-- Preload recursos críticos - solo recursos realmente necesarios -->
<link rel="preload" href="css/styles.css" as="style">
<link rel="preload" href="js/script.js" as="script">
```

**Ubicación**: En el `<head>`, después de los preconnect/dns-prefetch

### 3. IDs Corregidos en Formulario de Crear Admin (Línea ~1524-1533)
- ✅ `createAdminEmail` (NO `adminEmail`)
- ✅ `createAdminPassword` (NO `adminPassword`)
- ✅ `adminPasswordConfirm` con `autocomplete="new-password"`

```html
<input type="email" id="createAdminEmail" name="email" required autocomplete="email">
<input type="password" id="createAdminPassword" name="password" required minlength="6" autocomplete="new-password">
<input type="password" id="adminPasswordConfirm" name="passwordConfirm" required minlength="6" autocomplete="new-password">
```

### 4. IDs en Admin Login Modal (Línea ~1000-1005)
- ✅ `adminEmail` con `autocomplete="email"`
- ✅ `adminPassword` con `autocomplete="current-password"`

```html
<input type="email" id="adminEmail" name="email" required autocomplete="email">
<input type="password" id="adminPassword" name="password" required autocomplete="current-password">
```

### 5. ID Corregido en Formulario de Cita Previa (Línea ~424)
- ✅ `notificationConsentPush` (NO `notificationConsent`)

```html
<input type="checkbox" id="notificationConsentPush" name="notificationConsent" aria-describedby="notification-help">
```

### 6. ID en Formulario de Registro (Línea ~969)
- ✅ `notificationConsent` (este SÍ debe quedar así)

```html
<input type="checkbox" id="notificationConsent" name="notificationConsent" required>
```

## 🔍 Cómo Verificar Después del Despliegue:

### Opción 1: Ver Código Fuente
1. Ve a tu sitio desplegado en Netlify
2. Haz clic derecho → "Ver código fuente de la página"
3. Busca las líneas mencionadas arriba con Ctrl+F

### Opción 2: Inspeccionar en el Navegador
1. Abre tu sitio desplegado
2. F12 para abrir DevTools
3. Ve a la pestaña "Elements" o "Elementos"
4. Busca los IDs mencionados:
   - `createAdminEmail` (debe existir)
   - `adminEmail` (debe existir solo en login, NO en crear admin)
   - `notificationConsentPush` (en cita previa)

### Opción 3: Buscar en Consola
Abre la consola (F12) y ejecuta:
```javascript
// Verificar IDs duplicados (NO debe haber duplicados)
console.log('adminEmail:', document.querySelectorAll('#adminEmail').length); // Debe ser 1
console.log('createAdminEmail:', document.querySelectorAll('#createAdminEmail').length); // Debe ser 1
console.log('notificationConsent:', document.querySelectorAll('#notificationConsent').length); // Debe ser 1
console.log('notificationConsentPush:', document.querySelectorAll('#notificationConsentPush').length); // Debe ser 1
```

## ⚠️ Si los Cambios No Aparecen:

1. **Limpiar Caché de Netlify**:
   - Ve al panel de Netlify
   - Site settings → Build & deploy
   - Clear cache and retry deploy

2. **Limpiar Caché del Navegador**:
   - Ctrl+Shift+Delete
   - Seleccionar "Caché" o "Cache"
   - Limpiar

3. **Verificar que el Archivo Correcto se Desplegó**:
   - En Netlify, ve a Deploys
   - Verifica que el último deploy incluya tus cambios
   - Si usas Git, verifica que los cambios estén commitados

4. **Desplegar Manualmente**:
   - Descargar la carpeta `netlify-deploy` completa
   - Arrastrar y soltar en https://app.netlify.com/drop
   - Esto fuerza un despliegue nuevo sin caché

## 📋 Checklist de Verificación:

- [ ] Meta tags de tracking prevention presentes (líneas 7-12)
- [ ] Solo 2 preloads (styles.css y script.js)
- [ ] `createAdminEmail` existe (NO `adminEmail` en crear admin)
- [ ] `createAdminPassword` existe (NO `adminPassword` en crear admin)
- [ ] `adminEmail` existe solo en login modal (NO duplicado)
- [ ] `notificationConsentPush` en formulario de cita previa
- [ ] `notificationConsent` en formulario de registro
- [ ] Atributos `autocomplete` en todos los campos de email/password



