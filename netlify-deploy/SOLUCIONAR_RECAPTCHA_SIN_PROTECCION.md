# 🛡️ Solucionar reCAPTCHA "Sin Protección"

## 🔍 Problema

En la consola de Google reCAPTCHA aparece:
- **Estado**: "Sin protección"
- **Dominios**: `www.ayuntamientocobreros.com; ayuntamientocobreros.com`
- **Site Key**: `6LdBqQQsAAAAADFZKDVWkWt2ugbV0Cccm6wExZzQ`

## ✅ Verificación del Código

**Buenas noticias**: El código ya tiene reCAPTCHA implementado correctamente:

1. ✅ **Site Key configurado**: `6LdBqQQsAAAAADFZKDVWkWt2ugbV0Cccm6wExZzQ`
2. ✅ **Script cargado en `index.html`**: Línea 74
3. ✅ **Archivo `js/recaptcha.js`**: Implementación completa
4. ✅ **Integrado en formularios**: Login, Registro, Admin Login

## 🔧 Soluciones

### SOLUCIÓN 1: Verificar Dominios en Google reCAPTCHA Console

El mensaje "Sin protección" puede aparecer si los dominios no están correctamente configurados.

**Pasos:**

1. Ve a [Google reCAPTCHA Console](https://www.google.com/recaptcha/admin)
2. Selecciona tu sitio con la Site Key `6LdBqQQsAAAAADFZKDVWkWt2ugbV0Cccm6wExZzQ`
3. Verifica que los dominios estén configurados así:
   ```
   www.ayuntamientocobreros.com
   ayuntamientocobreros.com
   ```
4. **IMPORTANTE**: Asegúrate de que **NO** haya espacios extra o caracteres incorrectos
5. Guarda los cambios

### SOLUCIÓN 2: Verificar que reCAPTCHA se Ejecute

El mensaje "Sin protección" puede aparecer si reCAPTCHA no se está ejecutando en el sitio.

**Verificación en el navegador:**

1. Abre tu sitio: `https://www.ayuntamientocobreros.com`
2. Abre la **Consola del navegador** (F12)
3. Ve a la pestaña **Console**
4. Intenta hacer login o registro
5. Deberías ver mensajes como:
   ```
   🛡️ Inicializando reCAPTCHA v3...
   ✅ reCAPTCHA cargado, inicializando...
   ✅ reCAPTCHA token obtenido para acción: login
   ```

**Si NO ves estos mensajes:**
- reCAPTCHA no se está ejecutando
- Verifica que el script esté cargando correctamente

### SOLUCIÓN 3: Verificar Carga del Script

**En la consola del navegador, ejecuta:**

```javascript
// Verificar que reCAPTCHA esté cargado
console.log('reCAPTCHA disponible:', typeof window.grecaptcha !== 'undefined');
console.log('Site Key configurado:', '6LdBqQQsAAAAADFZKDVWkWt2ugbV0Cccm6wExZzQ');
```

**Resultado esperado:**
- `reCAPTCHA disponible: true`
- `Site Key configurado: 6LdBqQQsAAAAADFZKDVWkWt2ugbV0Cccm6wExZzQ`

**Si `reCAPTCHA disponible: false`:**
- El script no se está cargando
- Verifica la conexión a internet
- Verifica que no haya bloqueadores de anuncios bloqueando reCAPTCHA

### SOLUCIÓN 4: Verificar que los Formularios Usen reCAPTCHA

**Verificación:**

1. Abre tu sitio
2. Abre la consola del navegador (F12)
3. Intenta hacer login
4. Deberías ver en la consola:
   ```
   🛡️ Inicializando reCAPTCHA v3...
   ✅ reCAPTCHA cargado, inicializando...
   🔐 Procesando login con reCAPTCHA válido
   ```

**Si NO ves estos mensajes:**
- Los formularios no están usando reCAPTCHA
- Verifica que `js/recaptcha.js` esté cargando correctamente

### SOLUCIÓN 5: Verificar Configuración de Netlify

**Si usas Netlify, verifica:**

1. Ve a [Netlify Dashboard](https://app.netlify.com/)
2. Selecciona tu sitio
3. Ve a **Site settings** → **Build & deploy**
4. Verifica que el dominio esté configurado correctamente
5. Verifica que HTTPS esté habilitado (reCAPTCHA requiere HTTPS)

## 🧪 Prueba Completa

### Paso 1: Verificar en la Consola del Navegador

1. Abre: `https://www.ayuntamientocobreros.com`
2. Abre la consola (F12)
3. Ejecuta:
   ```javascript
   // Verificar reCAPTCHA
   if (typeof window.grecaptcha !== 'undefined') {
       console.log('✅ reCAPTCHA está cargado');
       window.grecaptcha.ready(() => {
           console.log('✅ reCAPTCHA está listo');
       });
   } else {
       console.error('❌ reCAPTCHA NO está cargado');
   }
   ```

### Paso 2: Probar Login con reCAPTCHA

1. Intenta hacer login
2. Abre la consola del navegador
3. Deberías ver:
   ```
   🛡️ Inicializando reCAPTCHA v3...
   ✅ reCAPTCHA cargado, inicializando...
   🔐 Procesando login con reCAPTCHA válido
   ✅ reCAPTCHA token obtenido para acción: login
   ```

### Paso 3: Verificar en Google reCAPTCHA Console

1. Ve a [Google reCAPTCHA Console](https://www.google.com/recaptcha/admin)
2. Selecciona tu sitio
3. Ve a **Statistics** (Estadísticas)
4. Deberías ver estadísticas de uso si reCAPTCHA está funcionando

## ⚠️ Notas Importantes

### ¿Por qué dice "Sin protección"?

El mensaje "Sin protección" en la consola de Google reCAPTCHA puede aparecer por varias razones:

1. **reCAPTCHA no se está ejecutando**: El código no está llamando a reCAPTCHA
2. **Dominios no verificados**: Los dominios no están correctamente configurados
3. **Sin estadísticas aún**: No hay actividad registrada (normal si acabas de configurarlo)
4. **Problema de carga**: El script de reCAPTCHA no se está cargando

### reCAPTCHA v3 es Invisible

**Importante**: reCAPTCHA v3 es **invisible** para el usuario. No verás un checkbox como en v2. Funciona en segundo plano.

### Verificación en el Código

Tu código ya tiene:
- ✅ Site Key configurado
- ✅ Script cargado
- ✅ Integración en formularios
- ✅ Función de inicialización

**El código está correcto**. El problema probablemente es de configuración en Google reCAPTCHA Console.

## 🔍 Diagnóstico Rápido

**Ejecuta esto en la consola del navegador:**

```javascript
// Diagnóstico completo
console.log('=== DIAGNÓSTICO reCAPTCHA ===');
console.log('1. reCAPTCHA cargado:', typeof window.grecaptcha !== 'undefined');
console.log('2. Site Key en HTML:', document.querySelector('script[src*="recaptcha"]')?.src);
console.log('3. recaptcha.js cargado:', typeof window.executeRecaptcha !== 'undefined');
console.log('4. Formularios encontrados:', {
    login: !!document.getElementById('loginForm'),
    register: !!document.getElementById('registerForm'),
    admin: !!document.getElementById('adminLoginForm')
});
```

**Resultado esperado:**
```
=== DIAGNÓSTICO reCAPTCHA ===
1. reCAPTCHA cargado: true
2. Site Key en HTML: https://www.google.com/recaptcha/api.js?render=6LdBqQQsAAAAADFZKDVWkWt2ugbV0Cccm6wExZzQ
3. recaptcha.js cargado: true
4. Formularios encontrados: {login: true, register: true, admin: true}
```

## ✅ Checklist de Verificación

- [ ] Dominios configurados correctamente en Google reCAPTCHA Console
- [ ] Site Key correcto: `6LdBqQQsAAAAADFZKDVWkWt2ugbV0Cccm6wExZzQ`
- [ ] Script de reCAPTCHA cargando en el navegador
- [ ] `js/recaptcha.js` cargando correctamente
- [ ] Formularios usando reCAPTCHA (verificar en consola)
- [ ] HTTPS habilitado en Netlify
- [ ] Sin bloqueadores de anuncios bloqueando reCAPTCHA

## 🎯 Solución Más Probable

**El problema más común es la configuración de dominios en Google reCAPTCHA Console.**

1. Ve a [Google reCAPTCHA Console](https://www.google.com/recaptcha/admin)
2. Selecciona tu sitio
3. Verifica que los dominios sean exactamente:
   ```
   www.ayuntamientocobreros.com
   ayuntamientocobreros.com
   ```
4. **NO incluyas** `https://` ni `/` al final
5. Guarda los cambios
6. Espera unos minutos para que se actualice

**Después de esto, el estado debería cambiar a "Protegido" o mostrar estadísticas de uso.**

---

## 📞 Si el Problema Persiste

Si después de verificar todo lo anterior sigue apareciendo "Sin protección":

1. **Espera 24-48 horas**: Google reCAPTCHA puede tardar en actualizar las estadísticas
2. **Verifica las estadísticas**: Aunque diga "Sin protección", si ves estadísticas de uso, está funcionando
3. **Prueba en modo incógnito**: Para evitar problemas de caché
4. **Verifica la consola del navegador**: Deberías ver mensajes de reCAPTCHA cuando usas los formularios

**Nota**: El mensaje "Sin protección" puede ser solo un problema de visualización en la consola. Si reCAPTCHA se está ejecutando (verificable en la consola del navegador), está funcionando correctamente.

