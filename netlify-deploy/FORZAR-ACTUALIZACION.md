# 🚨 FORZAR ACTUALIZACIÓN EN NETLIFY - PASOS CRÍTICOS

## ⚠️ PROBLEMA

Netlify está sirviendo archivos antiguos desde caché. El sitio muestra:
- ❌ `script.js?v=2.5` (antiguo) en lugar de `v=2.7` (nuevo)
- ❌ `createAdminEmail: 0` (no existe)
- ❌ `openModal: undefined` (script no cargado)
- ❌ IDs duplicados (#adminEmail, #adminPassword, #notificationConsent)

## ✅ SOLUCIÓN COMPLETA - PASOS OBLIGATORIOS

### Paso 1: LIMPIAR CACHÉ DE NETLIFY (CRÍTICO)

**En Netlify Dashboard:**

1. Ve a https://app.netlify.com
2. Selecciona tu sitio con el dominio `www.ayuntamientocobreros.com`
3. Ve a **"Configuración del sitio"** → **"Construir y desplegar"**
4. Scroll hasta **"Configuración de despliegue"**
5. **Busca la sección "Caché de compilación"** o **"Limpiar caché"**
6. **Click en "Limpiar caché de compilación"** o **"Limpiar caché y volver a desplegar"**

**Si no ves esa opción:**
- Ve a **"Despliegues"** (Deploys)
- Click en el **último despliegue**
- Click en **"Ejecutar despliegue"** (Trigger deploy)
- **Marca la casilla "Limpiar caché"** ⚠️ IMPORTANTE
- Click en **"Desplegar sitio"** (Deploy site)

### Paso 2: VERIFICAR DIRECTORIO DE DESPLIEGUE

**En Netlify Dashboard:**
1. **Configuración del sitio** → **"Construir y desplegar"** → **"Configuración de compilación"**
2. **Verifica "Directorio de publicación"** (Publish directory):
   - Si dice `.` o está vacío → Despliega desde la **raíz**
   - Si dice `netlify-deploy` → Despliega desde `netlify-deploy`

### Paso 3: DESPLEGAR DESDE EL DIRECTORIO CORRECTO

#### Si "Publish directory" = `.` (raíz):
- Los archivos ya están actualizados en la raíz ✅
- Solo necesitas limpiar caché y desplegar de nuevo

#### Si "Publish directory" = `netlify-deploy`:
- Los archivos ya están en `netlify-deploy` ✅
- Solo necesitas limpiar caché y desplegar de nuevo

### Paso 4: DESPLEGAR DE NUEVO (Opción A: Arrastrar y Soltar)

1. Ve a: https://app.netlify.com/drop
2. **Selecciona el directorio correcto**:
   - Si Netlify usa raíz → Selecciona toda la carpeta `ayuntamiento-cobreros`
   - Si Netlify usa `netlify-deploy` → Selecciona solo la carpeta `netlify-deploy`
3. **Arrastra la carpeta completa**
4. **Espera a que termine el despliegue**

### Paso 5: VERIFICAR QUE SE DESPLEGÓ CORRECTAMENTE

**En Netlify Dashboard:**
1. Ve a **"Despliegues"** (Deploys)
2. Click en el **último despliegue** (debe ser nuevo con fecha/hora reciente)
3. Click en **"Ver archivos publicados"** o **"Explorar archivos publicados"** (Browse published files)
4. **Verifica**:
   - Busca `index.html` → Abre y busca: `script.js?v=2.7` ✅
   - Busca `index.html` → Abre y busca: `createAdminEmail` ✅
   - Busca `index.html` → Abre y busca: `government-entity` ✅

### Paso 6: LIMPIAR CACHÉ DEL NAVEGADOR (DESPUÉS DEL DESPLIEGUE)

1. Abre: `https://www.ayuntamientocobreros.com`
2. **F12** para abrir DevTools
3. **Click derecho en el botón de recargar** (círculo con flecha)
4. Selecciona **"Vaciar caché y volver a cargar de forma forzada"** o **"Empty Cache and Hard Reload"**
5. O usa: **Ctrl + Shift + R** (Windows) o **Cmd + Shift + R** (Mac)

### Paso 7: DESREGISTRAR SERVICE WORKER (SI ES NECESARIO)

Si aún no funciona después de limpiar caché:

1. **F12** → Pestaña **"Application"** o **"Aplicación"**
2. Menú izquierdo → **"Service Workers"**
3. **Click en "Unregister"** para todos los service workers
4. **Cierra DevTools**
5. **Recarga la página** (Ctrl+Shift+R)

### Paso 8: VERIFICAR EN LA CONSOLA

Abre la consola (F12) y ejecuta:

```javascript
// 1. Verificar versión del script
console.log('Script:', document.querySelector('script[src*="script.js"]')?.src);
// Debe mostrar: .../script.js?v=2.7 ✅

// 2. Verificar openModal
console.log('openModal:', typeof window.openModal);
// Debe mostrar: "function" ✅

// 3. Verificar IDs únicos
console.log('adminEmail:', document.querySelectorAll('#adminEmail').length); // Debe ser 1 ✅
console.log('createAdminEmail:', document.querySelectorAll('#createAdminEmail').length); // Debe ser 1 ✅
console.log('notificationConsentPush:', document.querySelectorAll('#notificationConsentPush').length); // Debe ser 1 ✅

// 4. Verificar meta tags
console.log('Meta government-entity:', document.querySelector('meta[name="government-entity"]') ? '✅' : '❌');
```

## ⚠️ SI AÚN NO FUNCIONA

### Verificar que Netlify Desplegó los Archivos Correctos

1. **En Netlify**: **Despliegues** → **Último despliegue** → **Explorar archivos** → `index.html`
2. **Busca en el contenido**:
   - `script.js?v=2.7` (debe estar)
   - `createAdminEmail` (debe estar)
   - `government-entity` (debe estar)

3. **Si NO están en el archivo desplegado**:
   - El despliegue no se hizo correctamente
   - Vuelve al Paso 4 y despliega de nuevo
   - **Asegúrate de limpiar caché antes**

### Cambiar Versión del Script de Nuevo

Si Netlify sigue sirviendo archivos antiguos, cambia la versión a `v=2.8` o `v=3.0` para forzar completamente la recarga.

## 📝 CAMBIOS APLICADOS

1. ✅ `script.js?v=2.7` (versión actualizada desde v2.6)
2. ✅ Service Worker versión `2025-11-14-03` (nueva)
3. ✅ Todos los IDs corregidos
4. ✅ Meta tags agregados

## 🎯 RESULTADO ESPERADO

Después de seguir estos pasos:
- ✅ Script versión v2.7
- ✅ openModal funcionando
- ✅ createAdminEmail existe
- ✅ Sin IDs duplicados
- ✅ Modales funcionando

