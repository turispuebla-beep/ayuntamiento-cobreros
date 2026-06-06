# 🚨 INSTRUCCIONES URGENTES - Desplegar con Cambios de Caché

## ⚠️ PROBLEMA DETECTADO

Netlify está sirviendo archivos antiguos desde caché. Los cambios están en los archivos locales pero no aparecen en el sitio desplegado.

## ✅ SOLUCIONES APLICADAS

1. ✅ **Versión del script actualizada**: `script.js?v=2.6` (antes era v2.5)
2. ✅ **Service Worker actualizado**: Versión de caché `2025-11-14-02` (nueva)
3. ✅ **Service Worker NO cachea script.js**: Siempre obtiene de red
4. ✅ **Headers de caché actualizados**: HTML sin caché

## 🚀 PASOS OBLIGATORIOS PARA DESPLEGAR

### Paso 1: LIMPIAR CACHÉ EN NETLIFY (CRÍTICO)

**En Netlify Dashboard:**
1. Ve a tu sitio: https://app.netlify.com
2. Selecciona tu sitio
3. Ve a **"Site settings"** → **"Build & deploy"**
4. Scroll hasta **"Deploy settings"**
5. Click en **"Clear cache and retry deploy"** o **"Clear build cache"**
6. Si no ves esa opción, ve a **"Deploys"** → Click en el último deploy → **"Trigger deploy"** → **Marca "Clear cache"**

### Paso 2: DESPLEGAR DE NUEVO

**Opción A: Arrastrar y Soltar (RECOMENDADO)**
1. Ve a: https://app.netlify.com/drop
2. **Arrastra la carpeta completa `netlify-deploy`**
3. Espera a que termine el despliegue
4. **IMPORTANTE**: Verifica que el deploy sea nuevo (fecha/hora reciente)

**Opción B: Si tienes Git conectado**
1. Haz commit de los cambios
2. Push al repositorio
3. Netlify desplegará automáticamente
4. **Asegúrate de marcar "Clear cache"** en el deploy

### Paso 3: LIMPIAR CACHÉ DEL NAVEGADOR

**Después del despliegue:**
1. Abre tu sitio: `https://www.ayuntamientocobreros.com`
2. **Abre DevTools (F12)**
3. **Click derecho en el botón de recargar** (círculo con flecha)
4. Selecciona **"Vaciar caché y volver a cargar de forma forzada"** o **"Empty Cache and Hard Reload"**
5. O usa: **Ctrl + Shift + R** (Windows) o **Cmd + Shift + R** (Mac)

### Paso 4: DESREGISTRAR SERVICE WORKER (SI ES NECESARIO)

Si aún no funciona después de limpiar caché:

1. **Abre DevTools (F12)**
2. Ve a la pestaña **"Application"** o **"Aplicación"**
3. En el menú izquierdo, click en **"Service Workers"**
4. Click en **"Unregister"** o **"Desregistrar"** para todos los service workers
5. **Recarga la página** (Ctrl+Shift+R)

## 🔍 VERIFICACIÓN DESPUÉS DEL DESPLIEGUE

Abre la consola (F12) y ejecuta:

```javascript
// 1. Verificar versión del script
console.log('Script URL:', document.querySelector('script[src*="script.js"]')?.src);
// Debe mostrar: .../script.js?v=2.6

// 2. Verificar que openModal existe
console.log('openModal:', typeof window.openModal);
// Debe mostrar: "function"

// 3. Verificar IDs únicos
console.log('adminEmail:', document.querySelectorAll('#adminEmail').length); // Debe ser 1
console.log('createAdminEmail:', document.querySelectorAll('#createAdminEmail').length); // Debe ser 1

// 4. Verificar meta tags
console.log('Meta government-entity:', document.querySelector('meta[name="government-entity"]') ? '✅' : '❌');
```

## ⚠️ SI AÚN NO FUNCIONA

### Verificar que Netlify Desplegó los Archivos Correctos

1. **En Netlify Dashboard**:
   - Ve a **"Deploys"**
   - Click en el **último deploy**
   - Click en **"Browse published files"** o **"Ver archivos publicados"**
   - Verifica que:
     - `index.html` existe
     - `js/script.js` existe
     - Los archivos tienen tamaño > 0

2. **Verificar contenido del index.html desplegado**:
   - En Netlify: Deploys → Último deploy → Browse files → `index.html`
   - Busca: `script.js?v=2.6` (debe estar)
   - Busca: `government-entity` (debe estar)
   - Busca: `createAdminEmail` (debe estar)

3. **Si los archivos NO tienen los cambios**:
   - El despliegue no se hizo correctamente
   - Vuelve a arrastrar la carpeta `netlify-deploy` completa
   - Asegúrate de limpiar caché antes

## 📋 CHECKLIST FINAL

- [ ] Caché de Netlify limpiado
- [ ] Carpeta `netlify-deploy` desplegada de nuevo
- [ ] Deploy reciente (verificar fecha/hora)
- [ ] Caché del navegador limpiado (Ctrl+Shift+R)
- [ ] Service Worker desregistrado (si es necesario)
- [ ] Verificación en consola ejecutada
- [ ] Modales funcionando (Iniciar Sesión, Registrarse, Admin)

## 🎯 CAMBIOS REALIZADOS EN ESTA ACTUALIZACIÓN

1. ✅ `script.js?v=2.6` (versión actualizada)
2. ✅ Service Worker versión `2025-11-14-02` (nueva)
3. ✅ Service Worker NO cachea `script.js` (siempre de red)
4. ✅ Headers de caché actualizados para HTML
5. ✅ Headers en `_headers` y `netlify.toml` actualizados

## ⏰ TIEMPO ESTIMADO

- Limpiar caché: 1 minuto
- Desplegar: 2-5 minutos
- Verificar: 2 minutos
- **Total: ~5-10 minutos**

## ✅ RESULTADO ESPERADO

Después de seguir estos pasos:
- ✅ Los modales se abrirán correctamente
- ✅ Los cambios aparecerán en el sitio
- ✅ No habrá errores de caché
- ✅ Todo funcionará como en local



