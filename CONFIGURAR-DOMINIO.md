# Configurar Dominio Personalizado www.ayuntamientocobreros.com

## 🌐 Información del Dominio

Tu dominio: **www.ayuntamientocobreros.com**

## 🔍 Verificar Dónde Está Configurado Actualmente

### Opción 1: Verificar DNS
```bash
# En PowerShell o CMD:
nslookup www.ayuntamientocobreros.com

# O usar:
ping www.ayuntamientocobreros.com
```

### Opción 2: Verificar en Firebase Console
1. Ve a https://console.firebase.google.com/project/turisteam-80f1b/hosting
2. Ve a "Custom domains" o "Dominios personalizados"
3. Verifica si `www.ayuntamientocobreros.com` está listado

### Opción 3: Verificar en Netlify
1. Ve a https://app.netlify.com
2. Selecciona tu sitio
3. Ve a "Domain settings" o "Configuración de dominios"
4. Verifica si `www.ayuntamientocobreros.com` está configurado

## 📋 Configurar en Firebase Hosting (Recomendado)

### Paso 1: Agregar Dominio Personalizado en Firebase

1. **Ve a Firebase Console**:
   ```
   https://console.firebase.google.com/project/turisteam-80f1b/hosting
   ```

2. **Click en "Add custom domain"** o "Agregar dominio personalizado"

3. **Ingresa tu dominio**:
   ```
   www.ayuntamientocobreros.com
   ```

4. **Sigue las instrucciones** para configurar DNS:
   - Firebase te dará registros DNS tipo A o CNAME
   - Necesitarás configurarlos en tu proveedor de dominio

### Paso 2: Configurar DNS en tu Proveedor de Dominio

Firebase te dará registros similares a estos:

**Opción A: Registro A (si Firebase lo permite)**
```
Tipo: A
Nombre: www
Valor: [IP de Firebase]
```

**Opción B: Registro CNAME (más común)**
```
Tipo: CNAME
Nombre: www
Valor: turisteam-80f1b.web.app
```

**Opción C: Con dominio sin www**
```
Tipo: CNAME
Nombre: @ (o vacío)
Valor: turisteam-80f1b.web.app

Tipo: CNAME
Nombre: www
Valor: turisteam-80f1b.web.app
```

### Paso 3: Esperar Propagación DNS

- **Tiempo típico**: 1-24 horas
- Firebase verificará automáticamente cuando el DNS esté configurado
- Recibirás notificación cuando esté listo

### Paso 4: Verificar SSL

- Firebase proporcionará automáticamente un certificado SSL
- Puede tardar hasta 24 horas después de la verificación DNS
- El certificado es gratuito y se renueva automáticamente

## 🚀 Desplegar en Firebase Hosting

Una vez configurado el dominio, despliega:

```bash
# Desde la carpeta raíz del proyecto:
firebase deploy --only hosting
```

O si quieres desplegar todo:

```bash
firebase deploy
```

## ✅ Verificar Despliegue

Después del deploy, verifica:

1. **URL de Firebase**: `https://turisteam-80f1b.web.app`
2. **Tu dominio**: `https://www.ayuntamientocobreros.com`

Ambos deberían mostrar el mismo contenido (desde `netlify-deploy`)

## 🔧 Si el Dominio Ya Está en Netlify

Si el dominio `www.ayuntamientocobreros.com` ya está configurado en Netlify:

### Opción A: Dejar en Netlify
- Mantén el dominio en Netlify
- Despliega en Netlify arrastrando la carpeta `netlify-deploy`
- El dominio seguirá funcionando desde Netlify

### Opción B: Migrar a Firebase
1. **En Netlify**: Remover el dominio personalizado
2. **En Firebase**: Agregar el dominio (pasos arriba)
3. **Actualizar DNS**: Cambiar los registros DNS
4. **Esperar propagación**: 1-24 horas
5. **Desplegar en Firebase**: `firebase deploy --only hosting`

## ⚠️ Importante

- **No puedes tener el mismo dominio en ambos** (Netlify y Firebase) al mismo tiempo
- **Decide dónde quieres hostear** (Firebase o Netlify)
- **Firebase es mejor** si usas Firebase Functions, Firestore, etc.
- **Netlify es mejor** si solo necesitas hosting estático simple

## 📝 Notas Adicionales

- El archivo `firebase.json` ya está configurado para usar `netlify-deploy`
- Todos los cambios en `netlify-deploy/index.html` se reflejarán en Firebase
- El certificado SSL es automático y gratuito en Firebase
- Firebase tiene CDN global incluido



