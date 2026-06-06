# 📤 Actualizar Deploy y APK - Guía Rápida

## ✅ Respuesta Rápida

### 1. ¿Subir a Netlify?
**✅ SÍ, DEBES SUBIR LOS CAMBIOS A NETLIFY**

Los cambios que hicimos fueron en el código JavaScript:
- Cambio de `administrators` a `admins` en la colección de Firestore
- Mejora de la lógica de permisos

**Estos cambios SOLO funcionarán si los subes a Netlify.**

### 2. ¿Actualizar la APK?
**❌ NO, NO NECESITAS REGENERAR LA APK**

El APK que creaste ayer con PWA Builder es una **Trusted Web Activity (TWA)**, lo que significa:
- ✅ Carga el contenido desde tu sitio web (Netlify)
- ✅ Cuando actualizas la web, el APK automáticamente carga el contenido actualizado
- ✅ Los cambios en JavaScript se reflejan automáticamente en el APK

**Solo necesitas subir los cambios a Netlify. El APK se actualizará automáticamente.**

---

## 📋 Pasos a Seguir

### PASO 1: Subir Cambios a Netlify

#### Opción A: Si usas Git (Recomendado)

```bash
# 1. Ir a la carpeta del proyecto
cd "C:\Users\USUARIO\Desktop\ayuntamiento-cobreros\netlify-deploy"

# 2. Verificar cambios
git status

# 3. Agregar cambios
git add js/script.js

# 4. Hacer commit
git commit -m "Fix: Cambiar colección de administrators a admins y mejorar lógica de permisos"

# 5. Subir a GitHub/GitLab
git push origin main
```

**Netlify se actualizará automáticamente** si tienes integración continua configurada.

#### Opción B: Subir Manualmente a Netlify

1. Ve a [Netlify Dashboard](https://app.netlify.com/)
2. Selecciona tu sitio
3. Ve a **Deploys**
4. Arrastra y suelta la carpeta `netlify-deploy` o usa **Deploy manually**
5. Espera a que termine el deploy

---

### PASO 2: Verificar que los Cambios Funcionen

1. **Abre tu sitio en el navegador**: `https://www.ayuntamientocobreros.com`
2. **Abre la consola del navegador** (F12)
3. **Intenta hacer login de administrador** con `editorturis@gmail.com`
4. **Verifica que funcione correctamente**

---

### PASO 3: Verificar en el APK (Opcional)

1. **Abre el APK** en tu dispositivo Android
2. **Intenta hacer login de administrador**
3. **Verifica que funcione correctamente**

**Nota**: El APK cargará automáticamente los cambios desde Netlify. No necesitas reinstalar el APK.

---

## 🔍 ¿Cuándo SÍ Necesitas Regenerar el APK?

Solo necesitas regenerar el APK si cambias:

### ❌ NO Necesitas Regenerar:
- ✅ Cambios en JavaScript (`script.js`, etc.)
- ✅ Cambios en HTML
- ✅ Cambios en CSS
- ✅ Cambios en la lógica de la aplicación
- ✅ Cambios en Firebase/Firestore
- ✅ Cambios en Cloud Functions

### ✅ SÍ Necesitas Regenerar:
- ⚠️ Cambios en `manifest.json` (nombre, iconos, start_url, etc.)
- ⚠️ Cambios en la configuración de la PWA
- ⚠️ Cambios en los iconos de la app (192x192, 512x512)
- ⚠️ Cambios en el dominio/URL base
- ⚠️ Cambios en Digital Asset Links (`.well-known/assetlinks.json`)

---

## 📊 Resumen de los Cambios Realizados

### Cambios en `js/script.js`:

1. **Línea 455**: Cambio de colección
   ```javascript
   // Antes:
   collection('administrators')
   
   // Después:
   collection('admins')
   ```

2. **Líneas 480-490**: Mejora de lógica de permisos
   ```javascript
   // Ahora maneja correctamente:
   // - Si isSuperAdmin es true, isAdmin también es true
   // - Funciona aunque isAdmin no exista en Firestore
   ```

### Archivos Modificados:
- ✅ `js/script.js` (2 cambios)

### Archivos NO Modificados:
- ✅ `manifest.json` (sin cambios)
- ✅ `index.html` (sin cambios)
- ✅ Iconos de la app (sin cambios)
- ✅ Configuración de la PWA (sin cambios)

**Conclusión**: Solo cambios en JavaScript → Solo necesitas subir a Netlify.

---

## ✅ Checklist Final

- [ ] Cambios subidos a Netlify
- [ ] Deploy completado en Netlify
- [ ] Login de administrador probado en el navegador
- [ ] Login de administrador probado en el APK (opcional)
- [ ] Verificado que funciona correctamente

---

## 🚀 Comandos Rápidos

### Si usas Git:

```bash
cd "C:\Users\USUARIO\Desktop\ayuntamiento-cobreros\netlify-deploy"
git add js/script.js
git commit -m "Fix: Cambiar colección de administrators a admins"
git push
```

### Si NO usas Git:

1. Ve a Netlify Dashboard
2. Arrastra la carpeta `netlify-deploy`
3. Espera a que termine el deploy

---

## 🎯 Conclusión

**Para estos cambios específicos:**
- ✅ **SÍ subir a Netlify** (obligatorio)
- ❌ **NO regenerar APK** (no necesario)

**El APK se actualizará automáticamente** cuando los usuarios abran la app, ya que carga el contenido desde Netlify.

---

## 📝 Notas Importantes

1. **El APK es un wrapper de la PWA**:
   - No contiene el código JavaScript embebido
   - Carga todo desde tu sitio web
   - Los cambios se reflejan automáticamente

2. **Tiempo de actualización**:
   - Los cambios en Netlify pueden tardar 1-2 minutos en propagarse
   - El APK puede tardar unos segundos en cargar los cambios actualizados
   - Si no ves los cambios, limpia la caché del navegador o reinicia la app

3. **Cache del Service Worker**:
   - Si los cambios no aparecen, puede ser por el cache del Service Worker
   - El Service Worker se actualiza automáticamente, pero puede tardar unos minutos
   - Puedes forzar la actualización cerrando y abriendo la app

---

**¿Listo para subir a Netlify?** 🚀


