# Desplegar en Firebase Hosting

## ✅ Configuración Actualizada

El archivo `firebase.json` ha sido actualizado para desplegar desde la carpeta `netlify-deploy`.

## 🚀 Cómo Desplegar en Firebase Hosting

### Opción 1: Desplegar Todo (Hosting + Functions + Rules)
```bash
firebase deploy
```

### Opción 2: Desplegar Solo Hosting
```bash
firebase deploy --only hosting
```

### Opción 3: Desplegar Solo Functions
```bash
firebase deploy --only functions
```

### Opción 4: Desplegar Solo Firestore Rules
```bash
firebase deploy --only firestore:rules
```

## 📋 Configuración en firebase.json

- **`public`**: `netlify-deploy` - Carpeta que contiene todos los archivos del sitio
- **`rewrites`**: Todas las rutas redirigen a `/index.html` (SPA)
- **`headers`**: Headers de seguridad configurados (CSP, tracking prevention, etc.)

## ✅ Verificación

Después de desplegar, tu sitio estará disponible en:
- **URL por defecto**: `https://turisteam-80f1b.web.app`
- **URL personalizada**: (si tienes dominio configurado)

## 🔍 Verificar que los Cambios se Desplegaron

1. Ve a la URL de Firebase Hosting
2. Abre la consola (F12) y ejecuta:
```javascript
// Verificar IDs únicos
console.log('adminEmail:', document.querySelectorAll('#adminEmail').length); // Debe ser 1
console.log('createAdminEmail:', document.querySelectorAll('#createAdminEmail').length); // Debe ser 1

// Verificar meta tags
console.log('Meta government-entity:', document.querySelector('meta[name="government-entity"]') ? '✅' : '❌');
```

## ⚠️ Importante

- Firebase Hosting y Netlify son **servicios diferentes**
- Si tu dominio apunta a **Firebase**, necesitas desplegar aquí
- Si tu dominio apunta a **Netlify**, necesitas desplegar allí
- Puedes tener ambos desplegados y usar diferentes URLs

## 📝 Notas

- Los cambios en `netlify-deploy/index.html` se reflejarán en Firebase después de `firebase deploy --only hosting`
- El caché de Firebase se actualiza automáticamente después del deploy
- No necesitas limpiar caché manualmente en Firebase (a diferencia de Netlify)



