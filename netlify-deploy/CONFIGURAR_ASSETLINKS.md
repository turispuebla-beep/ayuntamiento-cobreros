# Configuración de Digital Asset Links

## ¿Qué es Digital Asset Links?

Digital Asset Links es un sistema de verificación que vincula tu aplicación Android con tu dominio web. Esto permite:
- Verificar que la app pertenece a tu dominio
- Habilitar funcionalidades avanzadas de integración
- Mejorar la seguridad y confianza

## Pasos para Configurar

### 1. Obtener el SHA-256 del APK

Cuando descargaste el APK de PWA Builder, también deberías tener un archivo con información de firma. Para obtener el SHA-256:

#### Opción A: Desde el ZIP descargado
1. Descomprime el ZIP del APK
2. Busca el archivo `assetlinks.json` generado
3. Copia el valor de `sha256_cert_fingerprints`

#### Opción B: Usando keytool (si tienes el keystore)
```bash
keytool -list -v -keystore tu-keystore.jks -alias tu-alias
```

#### Opción C: Usando el APK directamente
```bash
# En Windows con PowerShell
$apk = "ruta\a\tu.apk"
keytool -printcert -jarfile $apk
```

### 2. Obtener el Package Name

El package name generalmente es algo como:
- `com.ayuntamientocobreros.app`
- O el que PWA Builder generó automáticamente

Puedes encontrarlo en:
- El archivo `assetlinks.json` generado por PWA Builder
- El archivo `AndroidManifest.xml` dentro del ZIP del APK

### 3. Actualizar assetlinks.json

Edita el archivo `.well-known/assetlinks.json` y reemplaza:

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "TU_PACKAGE_NAME_AQUI",
      "sha256_cert_fingerprints": [
        "TU_SHA256_AQUI"
      ]
    }
  }
]
```

**Ejemplo:**
```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.ayuntamientocobreros.app",
      "sha256_cert_fingerprints": [
        "AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99"
      ]
    }
  }
]
```

### 4. Verificar que el archivo sea accesible

Después de desplegar, verifica que el archivo sea accesible:

```
https://www.ayuntamientocobreros.com/.well-known/assetlinks.json
```

Debe mostrar el JSON correctamente.

### 5. Verificar con Google

Usa la herramienta de verificación de Google:

```
https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://www.ayuntamientocobreros.com&relation=delegate_permission/common.handle_all_urls
```

## Notas Importantes

- El archivo debe estar en: `/.well-known/assetlinks.json`
- Debe ser accesible públicamente (sin autenticación)
- Debe tener el Content-Type correcto: `application/json`
- El SHA-256 debe ser exacto (con dos puntos `:` entre cada par de caracteres)
- Puedes tener múltiples fingerprints si usas diferentes certificados

## Solución de Problemas

### El archivo no se encuentra (404)
- Verifica que el archivo esté en `.well-known/assetlinks.json`
- Verifica que `_redirects` tenga la regla correcta
- Verifica que Netlify esté sirviendo archivos en `.well-known`

### El SHA-256 no coincide
- Asegúrate de usar el SHA-256 del certificado de firma del APK
- Verifica que no haya espacios o caracteres extra
- Usa el formato correcto: `AA:BB:CC:DD:...`

### El package name es incorrecto
- Verifica el package name en el APK generado
- Debe coincidir exactamente con el del APK

## Beneficios de Configurar Digital Asset Links

✅ **Seguridad**: Verifica que la app pertenece a tu dominio
✅ **Integración**: Permite compartir datos entre web y app
✅ **Confianza**: Google Play puede verificar el ayuntamiento
✅ **Funcionalidades**: Habilita características avanzadas de Android




