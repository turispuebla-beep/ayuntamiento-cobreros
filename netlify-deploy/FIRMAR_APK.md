# 🔏 Cómo Firmar el APK con el Keystore

## 📍 Ubicación del Keystore

El archivo `cobreros-release-key.jks` debe estar en la misma carpeta donde tienes el APK, o usar la ruta completa.

**Ubicación actual del keystore:**
```
C:\Users\USUARIO\Desktop\ayuntamiento-cobreros\netlify-deploy\cobreros-release-key.jks
```

---

## 🔧 Comando para Firmar el APK

### Forma Básica (APK en la misma carpeta):

```powershell
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 -keystore cobreros-release-key.jks tu-app.apk cobreros
```

**Reemplaza `tu-app.apk`** con el nombre real de tu APK, por ejemplo:
```powershell
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 -keystore cobreros-release-key.jks app-release.apk cobreros
```

---

## 📝 Pasos Detallados

### Paso 1: Obtener el APK de PWA Builder

1. Genera el APK con PWA Builder
2. Descarga el archivo `.apk`
3. Colócalo en la carpeta: `C:\Users\USUARIO\Desktop\ayuntamiento-cobreros\netlify-deploy\`

### Paso 2: Abrir PowerShell en la Carpeta

```powershell
cd "C:\Users\USUARIO\Desktop\ayuntamiento-cobreros\netlify-deploy"
```

### Paso 3: Firmar el APK

**Ejemplo si tu APK se llama `app-release.apk`:**

```powershell
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 -keystore cobreros-release-key.jks app-release.apk cobreros
```

**Te pedirá la contraseña del keystore:**
- Introduce la contraseña que usaste al crear el keystore
- Presiona Enter

### Paso 4: Verificar la Firma (Opcional)

```powershell
jarsigner -verify -verbose -certs app-release.apk
```

Deberías ver: `jar verificado.`

### Paso 5: Optimizar el APK (Opcional pero Recomendado)

```powershell
zipalign -v 4 app-release.apk app-release-aligned.apk
```

Esto crea una versión optimizada: `app-release-aligned.apk`

---

## 📋 Información que Necesitas

- **Archivo keystore**: `cobreros-release-key.jks`
- **Alias**: `cobreros`
- **Contraseña**: La que introdujiste al crear el keystore
- **Nombre del APK**: El que descargaste de PWA Builder

---

## 🔍 Ejemplo Completo

**Supongamos que tu APK se llama `ayuntamiento-cobreros.apk`:**

```powershell
# 1. Ir a la carpeta
cd "C:\Users\USUARIO\Desktop\ayuntamiento-cobreros\netlify-deploy"

# 2. Firmar el APK
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 -keystore cobreros-release-key.jks ayuntamiento-cobreros.apk cobreros

# 3. (Opcional) Verificar
jarsigner -verify -verbose -certs ayuntamiento-cobreros.apk

# 4. (Opcional) Optimizar
zipalign -v 4 ayuntamiento-cobreros.apk ayuntamiento-cobreros-aligned.apk
```

---

## ⚠️ Errores Comunes

### Error: "keystore no se encuentra"

**Solución**: Asegúrate de que el archivo `.jks` esté en la misma carpeta, o usa la ruta completa:

```powershell
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 -keystore "C:\Users\USUARIO\Desktop\ayuntamiento-cobreros\netlify-deploy\cobreros-release-key.jks" tu-app.apk cobreros
```

### Error: "Contraseña incorrecta"

**Solución**: Usa la contraseña exacta que introdujiste al crear el keystore.

### Error: "Alias no existe"

**Solución**: Verifica que el alias sea `cobreros` (en minúsculas).

---

## ✅ Después de Firmar

Una vez firmado, el APK está listo para:
- ✅ Subir a Google Play Store
- ✅ Distribuir directamente a usuarios
- ✅ Instalar en dispositivos Android

**El APK firmado es el que debes subir a Google Play.**

---

## 📝 Resumen

1. ✅ Coloca el APK en la misma carpeta que el keystore
2. ✅ Ejecuta el comando `jarsigner` con el nombre correcto del APK
3. ✅ Introduce la contraseña cuando te la pida
4. ✅ (Opcional) Verifica y optimiza el APK
5. ✅ Sube el APK firmado a Google Play

---

## 🎯 Comando Final (Cuando Tengas el APK)

**Reemplaza `NOMBRE-DEL-APK.apk` con el nombre real:**

```powershell
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 -keystore cobreros-release-key.jks NOMBRE-DEL-APK.apk cobreros
```

¡Eso es todo! 🚀




