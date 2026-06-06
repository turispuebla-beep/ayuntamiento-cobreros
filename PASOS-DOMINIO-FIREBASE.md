# Pasos para Configurar www.ayuntamientocobreros.com en Firebase Hosting

## ✅ Configuración Actual

- **Firebase Project**: `turisteam-80f1b`
- **Firebase Site ID**: `turisteam-80f1b`
- **URL Firebase**: `https://turisteam-80f1b.web.app`
- **Tu Dominio**: `www.ayuntamientocobreros.com`
- **Carpeta de despliegue**: `netlify-deploy` (ya configurado en `firebase.json`)

## 🚀 Pasos para Configurar el Dominio

### Paso 1: Agregar Dominio en Firebase Console

1. **Ve a Firebase Console**:
   ```
   https://console.firebase.google.com/project/turisteam-80f1b/hosting
   ```

2. **Click en "Agregar dominio personalizado"** o "Add custom domain"

3. **Ingresa tu dominio**:
   ```
   www.ayuntamientocobreros.com
   ```

4. **Firebase te mostrará registros DNS** que necesitas configurar

### Paso 2: Configurar DNS en tu Proveedor de Dominio

**Firebase te dará registros similares a estos:**

#### Opción A: Si Firebase usa CNAME (más común)
```
Tipo: CNAME
Nombre: www
Valor: turisteam-80f1b.web.app
TTL: 3600 (o el que recomiende Firebase)
```

#### Opción B: Si Firebase usa registros A
Firebase te dará IPs específicas (ejemplo):
```
Tipo: A
Nombre: www
Valor: 151.101.1.195
Valor: 151.101.65.195
```

**⚠️ IMPORTANTE**: Usa los valores EXACTOS que Firebase te proporciona

### Paso 3: Configurar Dominio Sin WWW (Opcional)

Si también quieres `ayuntamientocobreros.com` (sin www):

1. **En Firebase**: Agrega también `ayuntamientocobreros.com` como dominio
2. **En DNS**: Configura un registro CNAME o A para `@` (o dominio raíz)
3. **Firebase**: Redirige automáticamente de `www` a sin `www` o viceversa

### Paso 4: Verificar Configuración DNS

**Puedes verificar con:**

```bash
# En PowerShell o CMD:
nslookup www.ayuntamientocobreros.com

# O con:
dig www.ayuntamientocobreros.com
```

**Debería mostrar**:
- IPs de Firebase (si usas registros A), o
- Referencia a `turisteam-80f1b.web.app` (si usas CNAME)

### Paso 5: Esperar Verificación

- **Firebase verificará automáticamente** cuando el DNS esté configurado
- **Tiempo típico**: 1-24 horas después de configurar DNS
- **Recibirás notificación** en Firebase Console cuando esté verificado
- **SSL automático**: Firebase proporcionará certificado SSL (puede tardar hasta 24h más)

### Paso 6: Desplegar en Firebase Hosting

Una vez verificado el dominio, despliega:

```bash
# Desde la carpeta raíz del proyecto:
cd C:\Users\marsa\Desktop\ayuntamiento-cobreros

# Desplegar solo hosting:
firebase deploy --only hosting

# O desplegar todo (hosting + functions + rules):
firebase deploy
```

## ✅ Verificar Despliegue

Después del deploy, ambos URLs deberían funcionar:

- ✅ `https://turisteam-80f1b.web.app` (URL de Firebase)
- ✅ `https://www.ayuntamientocobreros.com` (Tu dominio personalizado)

Ambos mostrarán el mismo contenido desde `netlify-deploy`.

## 🔧 Si el Dominio Ya Está en Netlify

Si `www.ayuntamientocobreros.com` actualmente apunta a Netlify:

### Opción A: Mantener en Netlify
- Deja el dominio en Netlify
- Despliega en Netlify arrastrando la carpeta `netlify-deploy`
- Todo seguirá funcionando

### Opción B: Migrar a Firebase (Recomendado si usas Firebase Functions)
1. **En Netlify**: Ve a Domain Settings → Remove domain
2. **En Firebase**: Agrega el dominio (Pasos 1-5 arriba)
3. **En DNS**: Actualiza registros DNS según Firebase
4. **Espera**: 1-24 horas para propagación
5. **Despliega**: `firebase deploy --only hosting`

## 📝 Notas Importantes

- **No puedes tener el mismo dominio en ambos** (Netlify y Firebase) al mismo tiempo
- **El DNS solo puede apuntar a un lugar** (Netlify O Firebase)
- **Firebase es mejor si**:
  - Ya usas Firebase Functions
  - Ya usas Firestore
  - Quieres todo en un solo lugar
- **Netlify es mejor si**:
  - Solo necesitas hosting estático
  - No usas Firebase Functions activamente

## 🆘 Si Tienes Problemas

1. **Verifica DNS**: Usa `nslookup` o herramientas online como `whatsmydns.net`
2. **Espera más tiempo**: La propagación DNS puede tardar hasta 48 horas
3. **Verifica en Firebase Console**: Revisa el estado del dominio en Hosting
4. **Revisa registros DNS**: Asegúrate de que sean exactamente como Firebase indica



