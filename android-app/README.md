# Apps Android — Ayuntamiento de Cobreros

Dos APK desde el mismo proyecto (`productFlavors`):

| Flavor | App | Quién la usa |
|--------|-----|--------------|
| **avisos** | Cobreros Avisos | Personal autorizado (enviar avisos) |
| **vecinos** | Cobreros Vecinos | Vecinos (recibir avisos) |

Ambas usan el mismo package (`com.turisteam.ayuntamientocobreros`): en un móvil solo puede haber una instalada. El personal del ayuntamiento instala **avisos**; los vecinos instalan **vecinos**.

## Cobreros Vecinos (APK para vecinos)

Alternativa simple a la PWA para quien prefiera instalar una app:

1. **Registro / login** con Firebase (misma cuenta que la web).
2. **Localidades** obligatorias al registrarse; se pueden cambiar después.
3. **Push con sonido** al recibir avisos del ayuntamiento.
4. **Lista de avisos** filtrada por tus localidades.
5. **Detalle** del mensaje y **adjuntos** (ver, abrir o descargar).

## Cobreros Avisos (APK para personal)

1. Login con cuenta admin (`admins/{uid}`).
2. Plantillas rápidas y envío vía Cloud Function `sendPushNotification`.
3. Historial en Firestore y banner público opcional.

## Compilar

1. Copiar `google-services.json` de Firebase Console a `app/google-services.json` (package `com.turisteam.ayuntamientocobreros`).
2. Desde `android-app/`:

```bat
gradlew.bat assembleVecinosRelease
gradlew.bat assembleAvisosRelease
```

APKs:

- `app/build/outputs/apk/vecinos/release/app-vecinos-release.apk`
- `app/build/outputs/apk/avisos/release/app-avisos-release.apk`

## Publicar la APK vecinos

Puedes subir `app-vecinos-release.apk` a la web (enlace de descarga) junto a la PWA, para quien no quiera usar el navegador.
