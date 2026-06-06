# Generar APK para Android/Huawei

Este documento explica cómo generar archivos APK para que los usuarios puedan descargar la app del Ayuntamiento de Cobreros como una aplicación nativa.

## Opción 1: Usar PWA Builder (Recomendado - Gratis)

### Pasos:

1. **Visita PWA Builder**: https://www.pwabuilder.com/

2. **Ingresa la URL de tu sitio**:
   - URL: `https://www.ayuntamientocobreros.com` (o tu dominio de Netlify)

3. **Genera el APK**:
   - Haz clic en "Build My PWA"
   - Selecciona "Android" o "Huawei"
   - PWA Builder generará el APK automáticamente

4. **Descarga el APK**:
   - Una vez generado, descarga el archivo `.apk`
   - Sube el APK a un servicio de hosting (Firebase Storage, Google Drive, etc.)
   - Obtén la URL pública del APK

5. **Configura la URL en la app**:
   - Abre la consola del navegador en tu sitio
   - Ejecuta:
   ```javascript
   localStorage.setItem('apkConfig', JSON.stringify({
     androidUrl: 'https://tu-url-del-apk-android.apk',
     huaweiUrl: 'https://tu-url-del-apk-huawei.apk',
     url: 'https://tu-url-del-apk-generico.apk'
   }));
   ```
   - O configura las URLs desde el panel de administración (si está implementado)

## Opción 2: Usar Bubblewrap (CLI de Google)

### Requisitos:
- Node.js instalado
- Java JDK instalado

### Pasos:

1. **Instalar Bubblewrap**:
   ```bash
   npm install -g @bubblewrap/cli
   ```

2. **Inicializar proyecto**:
   ```bash
   bubblewrap init --manifest https://www.ayuntamientocobreros.com/manifest.json
   ```

3. **Generar APK**:
   ```bash
   bubblewrap build
   ```

4. **Firmar APK** (opcional, para Play Store):
   ```bash
   bubblewrap update --appVersionName=1.0.0
   ```

5. **El APK se generará en**: `./app/build/outputs/bundle/release/app-release.aab`

## Opción 3: Usar Capacitor (Para apps más avanzadas)

### Requisitos:
- Node.js
- Android Studio

### Pasos:

1. **Instalar Capacitor**:
   ```bash
   npm install @capacitor/core @capacitor/cli
   npx cap init
   ```

2. **Agregar plataforma Android**:
   ```bash
   npm install @capacitor/android
   npx cap add android
   ```

3. **Sincronizar**:
   ```bash
   npx cap sync
   ```

4. **Abrir en Android Studio**:
   ```bash
   npx cap open android
   ```

5. **Generar APK desde Android Studio**:
   - Build → Generate Signed Bundle / APK
   - Selecciona APK
   - Sigue el asistente

## Configuración en la App

Una vez que tengas las URLs de los APK, configúralas en la app:

### Método 1: Desde localStorage (Temporal)

```javascript
localStorage.setItem('apkConfig', JSON.stringify({
  androidUrl: 'https://ejemplo.com/app-android.apk',
  huaweiUrl: 'https://ejemplo.com/app-huawei.apk'
}));
```

### Método 2: Desde Firestore (Recomendado)

Crea un documento en la colección `config` con ID `apk_config`:

```json
{
  "androidUrl": "https://ejemplo.com/app-android.apk",
  "huaweiUrl": "https://ejemplo.com/app-huawei.apk",
  "updatedAt": "2025-01-20T00:00:00Z"
}
```

### Método 3: Desde el Panel de Administración

Si tienes un panel de administración, agrega una sección para configurar las URLs de los APK.

## Notas Importantes

1. **Firma del APK**: Para distribuir en Google Play Store, necesitas firmar el APK con una clave de firma.

2. **Actualizaciones**: Cuando actualices la PWA, deberás regenerar el APK para que incluya los cambios.

3. **Hosting del APK**: 
   - Puedes usar Firebase Storage
   - Google Drive (con enlace público)
   - GitHub Releases
   - Tu propio servidor

4. **Seguridad**: Asegúrate de que las URLs de los APK sean HTTPS.

5. **Versionado**: Mantén versiones diferentes del APK para poder hacer rollback si es necesario.

## Verificación

Para verificar que el APK funciona:

1. Descarga el APK en un dispositivo Android
2. Permite la instalación desde "Fuentes desconocidas" si es necesario
3. Instala el APK
4. Abre la app y verifica que funciona correctamente
5. Verifica que las notificaciones push funcionan

## Troubleshooting

- **Error "App not installed"**: Verifica que el APK esté firmado correctamente
- **Error de permisos**: Asegúrate de que el manifest.json tenga todos los permisos necesarios
- **APK no se descarga**: Verifica que la URL sea accesible públicamente




