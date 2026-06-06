# 🔧 Configurar Netlify para Desplegar desde `netlify-deploy`

## ✅ PROBLEMA RESUELTO

**Antes:**
- Netlify desplegaba desde la **raíz** (`index.html` en la raíz)
- Los cambios estaban en `netlify-deploy/index.html`
- El sitio desplegado no mostraba los cambios

**Ahora:**
- Netlify desplegará desde `netlify-deploy/`
- Todos los cambios en `netlify-deploy/` se reflejarán en el sitio

## 📝 CAMBIO REALIZADO

Se actualizó `netlify.toml` en la raíz:

```toml
[build]
  # IMPORTANTE: Desplegar desde netlify-deploy, no desde la raíz
  publish = "netlify-deploy"
  command = ""
```

**Antes era:** `publish = "."` (raíz)  
**Ahora es:** `publish = "netlify-deploy"` (carpeta correcta)

## 🚀 PRÓXIMOS PASOS

### Opción 1: Desplegar desde Netlify Dashboard (Recomendado)

1. **Ve a**: https://app.netlify.com
2. **Selecciona tu sitio**: `www.ayuntamientocobreros.com`
3. **Ve a**: **"Configuración del sitio"** → **"Construir y desplegar"** → **"Configuración de compilación"**
4. **Verifica "Directorio de publicación"** (Publish directory):
   - Debe decir: `netlify-deploy` ✅
   - Si dice `.` o está vacío, cámbialo a: `netlify-deploy`
5. **Guarda los cambios**
6. **Ve a "Despliegues"** → **"Ejecutar despliegue"** → **"Desplegar sitio"**

### Opción 2: Desplegar con Drag & Drop

1. **Ve a**: https://app.netlify.com/drop
2. **Arrastra la carpeta completa** `netlify-deploy`
3. **Espera** a que termine el despliegue

### Opción 3: Si usas Git

1. **Haz commit** de los cambios:
   ```bash
   git add netlify.toml
   git commit -m "Configurar Netlify para desplegar desde netlify-deploy"
   git push
   ```
2. Netlify desplegará automáticamente desde `netlify-deploy/`

## ✅ VERIFICACIÓN

Después del despliegue, verifica:

1. **Abre**: `https://www.ayuntamientocobreros.com`
2. **F12** → Consola → Ejecuta:
   ```javascript
   console.log('Script:', document.querySelector('script[src*="script.js"]')?.src);
   // Debe mostrar: .../script.js?v=2.9 ✅
   
   console.log('createAdminEmail:', document.querySelectorAll('#createAdminEmail').length);
   // Debe mostrar: 1 ✅
   
   console.log('notificationConsentRegister:', document.querySelectorAll('#notificationConsentRegister').length);
   // Debe mostrar: 1 ✅
   ```

## 📋 RESUMEN

- ✅ `netlify.toml` configurado para desplegar desde `netlify-deploy`
- ✅ Todos los cambios están en `netlify-deploy/`
- ✅ Después del próximo despliegue, el sitio usará los archivos correctos

**IMPORTANTE:** Después de cambiar la configuración, **debes hacer un nuevo despliegue** para que los cambios surtan efecto.



