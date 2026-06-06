# 🚨 Limpiar Caché de Netlify - Instrucciones en Castellano

## ⚠️ PROBLEMA

Netlify está sirviendo archivos antiguos desde caché. El sitio muestra:
- ❌ `script.js?v=2.5` (antiguo) en lugar de `v=2.7` (nuevo)
- ❌ `createAdminEmail: 0` (no existe)
- ❌ `openModal: undefined` (script no cargado)
- ❌ IDs duplicados (#adminEmail, #adminPassword, #notificationConsent)

## ✅ SOLUCIÓN - PASOS EN CASTELLANO

### Paso 1: LIMPIAR CACHÉ DE NETLIFY (CRÍTICO)

**En el Panel de Netlify:**

1. Ve a https://app.netlify.com
2. Selecciona tu sitio con el dominio `www.ayuntamientocobreros.com`
3. Ve a **"Configuración del sitio"** (Site settings)
4. Click en **"Construir y desplegar"** (Build & deploy)
5. Scroll hasta **"Configuración de despliegue"** (Deploy settings)
6. Busca la sección **"Caché de compilación"** (Build cache)
7. **Click en "Limpiar caché de compilación"** (Clear build cache) o
8. **Click en "Limpiar caché y volver a desplegar"** (Clear cache and retry deploy)

**Si no ves esa opción:**

1. Ve a la pestaña **"Despliegues"** (Deploys)
2. Click en el **último despliegue** (último deploy)
3. Click en **"⋮"** (tres puntos) → **"Ejecutar despliegue"** (Trigger deploy)
4. **Marca la casilla "Limpiar caché"** (Clear cache) ⚠️ IMPORTANTE
5. Click en **"Desplegar sitio"** (Deploy site)

### Paso 2: VERIFICAR DIRECTORIO DE DESPLIEGUE

**En el Panel de Netlify:**

1. **"Configuración del sitio"** (Site settings)
2. **"Construir y desplegar"** (Build & deploy)
3. **"Configuración de compilación"** (Build settings)
4. Verifica **"Directorio de publicación"** (Publish directory):
   - Si dice `.` o está vacío → Despliega desde la **raíz**
   - Si dice `netlify-deploy` → Despliega desde `netlify-deploy`

### Paso 3: DESPLEGAR DE NUEVO

**Opción A: Arrastrar y Soltar (RECOMENDADO)**

1. Ve a: https://app.netlify.com/drop
2. **Selecciona el directorio correcto**:
   - Si Netlify usa raíz → Selecciona toda la carpeta `ayuntamiento-cobreros`
   - Si Netlify usa `netlify-deploy` → Selecciona solo la carpeta `netlify-deploy`
3. **Arrastra la carpeta completa**
4. **Espera a que termine el despliegue**

**Opción B: Desde Git (si tienes repositorio conectado)**

1. Haz commit de los cambios
2. Push al repositorio
3. Netlify desplegará automáticamente
4. **Asegúrate de marcar "Limpiar caché"** antes de desplegar

### Paso 4: VERIFICAR QUE SE DESPLEGÓ CORRECTAMENTE

**En el Panel de Netlify:**

1. Ve a la pestaña **"Despliegues"** (Deploys)
2. Click en el **último despliegue** (debe ser nuevo con fecha/hora reciente)
3. Click en **"Explorar archivos publicados"** o **"Ver archivos publicados"** (Browse published files)
4. **Verifica**:
   - Busca `index.html` → Abre y busca: `script.js?v=2.7` ✅
   - Busca `index.html` → Abre y busca: `createAdminEmail` ✅
   - Busca `index.html` → Abre y busca: `government-entity` ✅

### Paso 5: LIMPIAR CACHÉ DEL NAVEGADOR (DESPUÉS DEL DESPLIEGUE)

1. Abre: `https://www.ayuntamientocobreros.com`
2. **F12** para abrir las herramientas de desarrollador
3. **Click derecho en el botón de recargar** (círculo con flecha)
4. Selecciona **"Vaciar caché y volver a cargar de forma forzada"** o **"Empty Cache and Hard Reload"**
5. O usa: **Ctrl + Shift + R** (Windows) o **Cmd + Shift + R** (Mac)

### Paso 6: DESREGISTRAR SERVICE WORKER (SI ES NECESARIO)

Si aún no funciona después de limpiar caché:

1. **F12** → Pestaña **"Aplicación"** o **"Application"**
2. Menú izquierdo → **"Service Workers"**
3. **Click en "Desregistrar"** (Unregister) para todos los service workers
4. **Cierra las herramientas de desarrollador**
5. **Recarga la página** (Ctrl+Shift+R)

### Paso 7: VERIFICAR EN LA CONSOLA

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
   - Vuelve al Paso 3 y despliega de nuevo
   - **Asegúrate de limpiar caché antes**

## 📝 RESUMEN DE TÉRMINOS EN NETLIFY

**Español → Inglés:**
- Configuración del sitio → Site settings
- Construir y desplegar → Build & deploy
- Configuración de compilación → Build settings
- Configuración de despliegue → Deploy settings
- Caché de compilación → Build cache
- Limpiar caché de compilación → Clear build cache
- Limpiar caché y volver a desplegar → Clear cache and retry deploy
- Despliegues → Deploys
- Ejecutar despliegue → Trigger deploy
- Desplegar sitio → Deploy site
- Explorar archivos publicados → Browse published files
- Directorio de publicación → Publish directory

## ✅ RESULTADO ESPERADO

Después de seguir estos pasos:
- ✅ Script versión v2.7
- ✅ openModal funcionando
- ✅ createAdminEmail existe
- ✅ Sin IDs duplicados
- ✅ Modales funcionando



