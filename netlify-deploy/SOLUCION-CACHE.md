# 🔧 Solución: Problema de Caché en Netlify

## ⚠️ Problema Detectado

Netlify está sirviendo archivos antiguos desde caché, por eso:
- Los cambios no aparecen
- Los modales no funcionan
- Los botones no abren

## ✅ Soluciones Aplicadas

### 1. Versión del Script Actualizada
- `script.js?v=2.5` → `script.js?v=2.6`
- Esto fuerza a los navegadores a descargar la nueva versión

### 2. Headers de Caché Actualizados
- HTML ahora tiene: `Cache-Control: no-cache, no-store`
- Esto evita que Netlify sirva HTML en caché

## 🚀 Pasos para Desplegar CORRECTAMENTE

### Opción 1: Limpiar Caché y Redesplegar (RECOMENDADO)

1. **En Netlify Dashboard**:
   - Ve a tu sitio
   - Site settings → Build & deploy
   - Click en "Clear cache and retry deploy"
   - O manualmente: Deploys → Trigger deploy → Marca "Clear cache"

2. **Desplegar de Nuevo**:
   - Arrastra la carpeta `netlify-deploy` completa a https://app.netlify.com/drop
   - O si usas Git: haz un commit y push

### Opción 2: Forzar Recarga en el Navegador

Después del despliegue:
1. Abre tu sitio: `https://www.ayuntamientocobreros.com`
2. **Ctrl + Shift + R** (Windows) o **Cmd + Shift + R** (Mac)
3. O abre DevTools (F12) → Click derecho en el botón de recargar → "Vaciar caché y volver a cargar de forma forzada"

### Opción 3: Verificar que se Desplegó Correctamente

1. **En Netlify Dashboard**:
   - Ve a Deploys
   - Verifica que el último deploy sea reciente
   - Verifica que no haya errores

2. **Verificar Archivos Desplegados**:
   - En Netlify: Deploys → Click en el deploy → Ver archivos
   - Verifica que `index.html` tenga los cambios (meta tags, IDs corregidos)
   - Verifica que `js/script.js` esté presente

## 🔍 Verificación Después del Despliegue

Abre la consola (F12) y ejecuta:

```javascript
// Verificar versión del script
console.log('Script version:', document.querySelector('script[src*="script.js"]')?.src);

// Verificar que openModal existe
console.log('openModal exists:', typeof window.openModal === 'function');

// Verificar IDs
console.log('adminEmail count:', document.querySelectorAll('#adminEmail').length); // Debe ser 1
console.log('createAdminEmail count:', document.querySelectorAll('#createAdminEmail').length); // Debe ser 1

// Verificar meta tags
console.log('Meta government-entity:', document.querySelector('meta[name="government-entity"]') ? '✅' : '❌');
```

## ⚠️ Si Aún No Funciona

### 1. Verificar que Netlify Está Usando la Carpeta Correcta

En Netlify Dashboard:
- Site settings → Build & deploy → Build settings
- Verifica que "Publish directory" sea `.` (punto) o `netlify-deploy`

### 2. Verificar Archivos en el Deploy

1. Ve a Deploys → Click en el último deploy
2. Click en "Browse published files"
3. Verifica que:
   - `index.html` existe
   - `js/script.js` existe
   - Los archivos tienen el tamaño correcto

### 3. Desplegar Manualmente SIN Caché

1. **Eliminar el sitio temporalmente** (o crear uno nuevo)
2. **Arrastrar la carpeta completa** a https://app.netlify.com/drop
3. **Configurar el dominio** de nuevo
4. Esto fuerza un despliegue completamente nuevo

## 📝 Cambios Realizados

1. ✅ `script.js?v=2.6` (versión actualizada)
2. ✅ Headers de caché actualizados en `netlify.toml`
3. ✅ Headers de caché actualizados en `_headers`

## 🎯 Próximos Pasos

1. **Desplegar de nuevo** con caché limpiado
2. **Forzar recarga** en el navegador (Ctrl+Shift+R)
3. **Verificar** que todo funciona
4. Si aún no funciona, verificar que Netlify está usando los archivos correctos



