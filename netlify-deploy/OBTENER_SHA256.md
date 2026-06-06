# Cómo Obtener el SHA-256 del APK

## Método 1: Desde el ZIP de PWA Builder (Más Fácil)

1. **Abre el ZIP descargado** de PWA Builder
2. **Busca el archivo `assetlinks.json`** dentro del ZIP
3. **Abre ese archivo** - ya contiene el SHA-256 correcto
4. **Copia el valor de `sha256_cert_fingerprints`**

El archivo debería verse así:
```json
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
```

## Método 2: Desde el APK directamente (Windows)

1. **Abre PowerShell** como Administrador
2. **Navega a la carpeta** donde está el APK:
   ```powershell
   cd "C:\Users\USUARIO\Downloads"
   ```
3. **Ejecuta** (reemplaza `app-release.apk` con el nombre de tu APK):
   ```powershell
   keytool -printcert -jarfile app-release.apk
   ```
4. **Busca la línea** que dice `SHA256:` y copia el valor

## Método 3: Usando Java keytool (si tienes Java instalado)

```bash
keytool -list -v -keystore android.keystore -alias android
```

## Formato del SHA-256

El SHA-256 debe estar en formato con dos puntos (`:`) entre cada par de caracteres:
- ✅ Correcto: `AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99`
- ❌ Incorrecto: `AABBCCDDEEFF00112233445566778899AABBCCDDEEFF00112233445566778899`

## Después de Obtener el SHA-256

1. Abre: `.well-known/assetlinks.json`
2. Reemplaza `"REEMPLAZAR_CON_SHA256_DEL_APK"` con el SHA-256 real
3. Despliega en Netlify
4. Verifica de nuevo




