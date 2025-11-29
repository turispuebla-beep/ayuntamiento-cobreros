# 🔏 Guía Paso a Paso: Firmar APK para Google Play

## 📋 Requisitos Previos

- ✅ Java JDK instalado (ya lo tienes)
- ✅ Keystore creado: `cobreros-release-key.jks` (ya lo tienes)
- ✅ APK generado con PWA Builder (necesitas obtenerlo)

---

## 🚀 Paso 1: Obtener el APK de PWA Builder

1. **Ve a PWA Builder**: https://www.pwabuilder.com/
2. **Ingresa tu URL**: `https://www.ayuntamientocobreros.com`
3. **Haz clic en "Build My PWA"**
4. **Selecciona "Android"**
5. **Descarga el APK** que genera
6. **Guarda el APK** en esta carpeta:
   ```
   C:\Users\USUARIO\Desktop\ayuntamiento-cobreros\netlify-deploy\
   ```

**Anota el nombre del archivo APK** (ejemplo: `app-release.apk`, `TWA.apk`, etc.)

---

## 📁 Paso 2: Verificar que Tienes Todo

Abre el **Explorador de Archivos** y ve a:
```
C:\Users\USUARIO\Desktop\ayuntamiento-cobreros\netlify-deploy\
```

**Debes tener:**
- ✅ `cobreros-release-key.jks` (el keystore)
- ✅ Tu archivo APK (ejemplo: `app-release.apk`)

**Si falta algo, vuelve al paso anterior.**

---

## 💻 Paso 3: Abrir PowerShell

### Opción A: Desde el Explorador (Más Fácil)

1. Abre el **Explorador de Archivos**
2. Ve a: `C:\Users\USUARIO\Desktop\ayuntamiento-cobreros\netlify-deploy`
3. **Clic derecho** en un espacio vacío
4. Selecciona **"Abrir en Terminal"** o **"Abrir ventana de PowerShell aquí"**

### Opción B: Desde PowerShell

1. Abre PowerShell
2. Escribe:
   ```powershell
   cd "C:\Users\USUARIO\Desktop\ayuntamiento-cobreros\netlify-deploy"
   ```
3. Presiona **Enter**

---

## 🔍 Paso 4: Verificar Archivos

En PowerShell, escribe:

```powershell
dir *.jks
dir *.apk
```

**Debes ver:**
- `cobreros-release-key.jks`
- Tu archivo APK (ejemplo: `app-release.apk`)

**Si no ves el APK, vuelve al Paso 1 y descárgalo.**

---

## 🔏 Paso 5: Firmar el APK

### Reemplaza `NOMBRE-DEL-APK.apk` con el nombre real de tu APK

**Ejemplo si tu APK se llama `app-release.apk`:**

```powershell
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 -keystore cobreros-release-key.jks app-release.apk cobreros
```

**Ejemplo si tu APK se llama `TWA.apk`:**

```powershell
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 -keystore cobreros-release-key.jks TWA.apk cobreros
```

**Ejemplo si tu APK se llama `ayuntamiento-cobreros.apk`:**

```powershell
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 -keystore cobreros-release-key.jks ayuntamiento-cobreros.apk cobreros
```

### ⚠️ IMPORTANTE:
- Reemplaza `NOMBRE-DEL-APK.apk` con el nombre **exacto** de tu APK
- El alias es `cobreros` (en minúsculas)
- Presiona **Enter** después de escribir el comando

---

## 🔐 Paso 6: Introducir la Contraseña

Después de ejecutar el comando, te pedirá:

```
Introduzca la contraseña del almacén de claves:
```

1. **Escribe la contraseña** que usaste al crear el keystore
2. **Presiona Enter**
3. ⚠️ **No verás la contraseña mientras la escribes** (es normal por seguridad)

**Si la contraseña es correcta**, verás mensajes como:
```
   agregando: META-INF/MANIFEST.MF
   agregando: META-INF/COBREROS.SF
   agregando: META-INF/COBREROS.RSA
   firmando: (lista de archivos)
```

**Si la contraseña es incorrecta**, verás:
```
jarsigner: error: java.io.IOException: Keystore was tampered with, or password was incorrect
```

---

## ✅ Paso 7: Verificar que Funcionó

Al final deberías ver:
```
jar firmado.
```

**Si ves esto, ¡el APK está firmado correctamente!** ✅

---

## 🔍 Paso 8: Verificar la Firma (Opcional pero Recomendado)

Para asegurarte de que todo está bien, ejecuta:

```powershell
jarsigner -verify -verbose -certs NOMBRE-DEL-APK.apk
```

**Reemplaza `NOMBRE-DEL-APK.apk` con el nombre real de tu APK.**

**Deberías ver:**
```
jar verificado.
```

**Si ves esto, la firma es válida.** ✅

---

## 📦 Paso 9: Optimizar el APK (Opcional pero Recomendado)

Para optimizar el APK (hace que sea más pequeño y rápido):

```powershell
zipalign -v 4 NOMBRE-DEL-APK.apk NOMBRE-DEL-APK-aligned.apk
```

**Reemplaza `NOMBRE-DEL-APK.apk` con el nombre real.**

**Esto creará un nuevo archivo:** `NOMBRE-DEL-APK-aligned.apk`

**Usa este archivo optimizado para subir a Google Play.**

---

## 📋 Resumen de Comandos

**1. Firmar el APK:**
```powershell
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 -keystore cobreros-release-key.jks NOMBRE-DEL-APK.apk cobreros
```

**2. Verificar (opcional):**
```powershell
jarsigner -verify -verbose -certs NOMBRE-DEL-APK.apk
```

**3. Optimizar (opcional):**
```powershell
zipalign -v 4 NOMBRE-DEL-APK.apk NOMBRE-DEL-APK-aligned.apk
```

**⚠️ Reemplaza `NOMBRE-DEL-APK.apk` con el nombre real de tu APK en todos los comandos.**

---

## 🎯 Ejemplo Completo Real

**Supongamos que tu APK se llama `app-release.apk`:**

```powershell
# 1. Ir a la carpeta
cd "C:\Users\USUARIO\Desktop\ayuntamiento-cobreros\netlify-deploy"

# 2. Verificar archivos
dir *.apk
dir *.jks

# 3. Firmar el APK
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 -keystore cobreros-release-key.jks app-release.apk cobreros

# 4. (Opcional) Verificar
jarsigner -verify -verbose -certs app-release.apk

# 5. (Opcional) Optimizar
zipalign -v 4 app-release.apk app-release-aligned.apk
```

---

## ⚠️ Errores Comunes y Soluciones

### Error: "keystore no se encuentra"

**Solución**: Asegúrate de estar en la carpeta correcta:
```powershell
cd "C:\Users\USUARIO\Desktop\ayuntamiento-cobreros\netlify-deploy"
```

### Error: "Contraseña incorrecta"

**Solución**: Usa la contraseña exacta que introdujiste al crear el keystore.

### Error: "El archivo APK no existe"

**Solución**: Verifica el nombre del APK con `dir *.apk` y usa el nombre exacto.

---

## ✅ Después de Firmar

**El APK firmado está listo para:**
- ✅ Subir a Google Play Store
- ✅ Distribuir directamente a usuarios
- ✅ Instalar en dispositivos Android

**El APK firmado es el que debes subir a Google Play.**

---

## 📝 Checklist Final

- [ ] APK descargado de PWA Builder
- [ ] APK en la carpeta con el keystore
- [ ] PowerShell abierto en la carpeta correcta
- [ ] Comando jarsigner ejecutado
- [ ] Contraseña introducida correctamente
- [ ] Mensaje "jar firmado" apareció
- [ ] (Opcional) Verificación exitosa
- [ ] (Opcional) APK optimizado

---

## 🚀 Siguiente Paso

Una vez firmado el APK, sigue la guía:
- `PUBLICAR_APK_GOOGLE_PLAY.md` → Para subirlo a Google Play Store

---

**¡Listo! Ahora puedes firmar tu APK. 🎉**




