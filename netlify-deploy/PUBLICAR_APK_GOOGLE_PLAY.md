# Publicar APK en Google Play Store

Esta guía te ayudará a subir tu APK a Google Play Store para que los usuarios puedan descargarla.

---

## 📋 Requisitos Previos

- ✅ Cuenta de desarrollador de Google Play (ya la tienes)
- ✅ APK generado con PWA Builder
- ✅ Cuenta de Google Play Console: https://play.google.com/console

---

## 🔐 Paso 1: Firmar el APK (Importante)

**⚠️ CRÍTICO**: Google Play requiere que el APK esté firmado con una clave de firma.

### Opción A: Si PWA Builder ya firmó el APK

Algunas versiones de PWA Builder generan APKs firmados. Verifica:
- Si el APK ya está firmado, puedes usarlo directamente
- Si no está firmado, necesitas firmarlo tú

### Opción B: Firmar el APK Manualmente

1. **Instala Java JDK** (si no lo tienes):
   - Descarga desde: https://www.oracle.com/java/technologies/downloads/
   - O usa OpenJDK: https://adoptium.net/

2. **Crea una clave de firma** (solo la primera vez):
   ```bash
   keytool -genkey -v -keystore cobreros-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias cobreros
   ```
   
   **Información que te pedirá:**
   - Contraseña para el keystore (guárdala bien, la necesitarás siempre)
   - Nombre y apellidos
   - Nombre de la organización: "Ayuntamiento de Cobreros"
   - Ciudad: Tu ciudad
   - Estado/Provincia: Tu provincia
   - Código de país: ES (para España)

3. **Firma el APK**:
   ```bash
   jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 -keystore cobreros-release-key.jks tu-app.apk cobreros
   ```

4. **Verifica la firma**:
   ```bash
   jarsigner -verify -verbose -certs tu-app.apk
   ```

5. **Optimiza el APK** (opcional pero recomendado):
   ```bash
   zipalign -v 4 tu-app.apk tu-app-aligned.apk
   ```

**⚠️ IMPORTANTE**: Guarda el archivo `.jks` (keystore) en un lugar seguro. Si lo pierdes, NO podrás actualizar tu app en Google Play.

---

## 📱 Paso 2: Crear la Aplicación en Google Play Console

1. **Accede a Google Play Console**:
   - https://play.google.com/console
   - Inicia sesión con tu cuenta de desarrollador

2. **Crear nueva aplicación**:
   - Haz clic en **"Crear aplicación"**
   - Completa la información:
     - **Nombre de la app**: "Ayuntamiento de Cobreros"
     - **Idioma predeterminado**: Español (España)
     - **Tipo de aplicación**: Aplicación
     - **Gratis o de pago**: Gratis
     - **Declaración de políticas**: Acepta los términos

3. **Configurar la tienda**:
   - **Nombre de la app**: "Ayuntamiento de Cobreros"
     - Máximo 50 caracteres
   - **Descripción corta**: "Portal oficial del Ayuntamiento de Cobreros"
     - Máximo 80 caracteres
   - **Descripción completa**: 
     ```
     Aplicación oficial del Ayuntamiento de Cobreros. Accede a servicios municipales, citas previas, noticias, bandos y documentos desde tu móvil.

     Funcionalidades:
     - Solicitar citas previas
     - Consultar noticias y bandos municipales
     - Acceder a documentos y formularios
     - Recibir notificaciones de avisos importantes
     - Información de contacto y servicios municipales

     Disponible para todos los ciudadanos de Cobreros y sus localidades.
     ```
     - Máximo 4000 caracteres

---

## 🖼️ Paso 3: Configurar Iconos y Capturas

### Iconos Requeridos:

1. **Icono de la aplicación**:
   - Tamaño: 512x512 píxeles
   - Formato: PNG (sin transparencia)
   - Usa: `images/escudo-cobreros-512.png`

2. **Icono de función destacada** (opcional):
   - Tamaño: 1024x500 píxeles
   - Formato: PNG o JPG

### Capturas de Pantalla Requeridas:

**Mínimo 2 capturas, recomendado 4-8:**

1. **Teléfonos** (obligatorio):
   - Tamaño: Mínimo 320px de altura
   - Aspecto: 16:9 o 9:16
   - Formato: PNG o JPG
   - Mínimo 2 capturas

2. **Tablets** (opcional pero recomendado):
   - Tamaño: Mínimo 320px de altura
   - Aspecto: 16:9 o 9:16
   - Formato: PNG o JPG

**Consejos para capturas:**
- Muestra las funcionalidades principales
- Incluye: Inicio, Citas previas, Noticias, Panel de usuario
- Usa un dispositivo real o emulador Android
- Asegúrate de que se vean bien en diferentes tamaños

---

## 📦 Paso 4: Subir el APK/AAB

### Opción A: Subir APK Directamente

1. **Ve a "Producción"** (o "Pruebas internas" para probar primero):
   - En el menú lateral: **"Lanzamiento"** → **"Producción"**
   - O **"Lanzamiento"** → **"Pruebas internas"** (recomendado para empezar)

2. **Crear nueva versión**:
   - Haz clic en **"Crear nueva versión"**

3. **Subir el APK**:
   - Arrastra el APK firmado o haz clic en **"Subir"**
   - Espera a que se procese (puede tardar unos minutos)

4. **Información de la versión**:
   - **Número de versión**: 1 (primera versión)
   - **Nombre de versión**: "1.0" o "1.0.0"
   - **Notas de la versión**: 
     ```
     Primera versión de la aplicación oficial del Ayuntamiento de Cobreros.
     
     Incluye:
     - Solicitud de citas previas
     - Consulta de noticias y bandos
     - Acceso a documentos municipales
     - Notificaciones push
     - Panel de usuario
     ```

### Opción B: Subir AAB (Recomendado por Google)

Google recomienda usar **Android App Bundle (AAB)** en lugar de APK:

1. **Generar AAB desde PWA Builder**:
   - Si PWA Builder no genera AAB, puedes convertir el APK
   - O usar Android Studio para generar el AAB

2. **Subir el AAB**:
   - Mismo proceso que el APK
   - Google Play generará APKs optimizados automáticamente

---

## ⚙️ Paso 5: Configurar Contenido de la App

### Clasificación de Contenido:

1. **Ve a "Contenido de la app"**:
   - En el menú lateral: **"Política"** → **"Contenido de la app"**

2. **Completa el cuestionario**:
   - Tipo de contenido: Gobierno/Utilidades públicas
   - Clasificación por edad: Para todos los públicos
   - Contenido educativo: No
   - Etc.

### Privacidad y Seguridad:

1. **Política de privacidad** (obligatorio):
   - Crea una página con tu política de privacidad
   - URL pública: `https://www.ayuntamientocobreros.com/politica-privacidad.html`
   - O usa: `https://www.ayuntamientocobreros.com/#privacidad`

2. **Permisos de la app**:
   - Google Play mostrará los permisos automáticamente
   - Explica por qué necesitas cada permiso en la descripción

---

## 📝 Paso 6: Configurar Precios y Distribución

1. **Precio**:
   - Selecciona **"Gratis"**

2. **Países/regiones**:
   - Selecciona los países donde quieres distribuir
   - Recomendado: España (o todos los países)

3. **Dispositivos compatibles**:
   - Google Play detectará automáticamente
   - Verifica que sea compatible con la mayoría de dispositivos

---

## ✅ Paso 7: Revisar y Publicar

1. **Revisar toda la información**:
   - Verifica que todo esté completo
   - Revisa las capturas de pantalla
   - Verifica la descripción

2. **Enviar para revisión**:
   - Haz clic en **"Enviar para revisión"**
   - Google revisará tu app (puede tardar 1-7 días)

3. **Esperar la aprobación**:
   - Recibirás un email cuando se apruebe
   - O si hay problemas, te notificarán qué corregir

---

## 🔄 Actualizar la App en el Futuro

Cuando quieras actualizar la app:

1. **Genera nueva versión**:
   - Incrementa el número de versión (1.0 → 1.1 → 1.2, etc.)
   - O usa versiones semánticas: 1.0.0 → 1.0.1 → 1.1.0

2. **Firma con la misma clave**:
   - ⚠️ **IMPORTANTE**: Usa el mismo archivo `.jks` que usaste la primera vez
   - Si usas una clave diferente, Google Play rechazará la actualización

3. **Sube la nueva versión**:
   - Mismo proceso que la primera vez
   - Añade notas de la versión explicando los cambios

---

## 📋 Checklist Completo

### Antes de Subir:

- [ ] APK firmado con clave de firma
- [ ] Archivo `.jks` guardado en lugar seguro
- [ ] Icono de 512x512 preparado
- [ ] Mínimo 2 capturas de pantalla para teléfonos
- [ ] Descripción de la app escrita
- [ ] Política de privacidad publicada (URL accesible)
- [ ] Clasificación de contenido completada

### Información de la App:

- [ ] Nombre de la app
- [ ] Descripción corta (máximo 80 caracteres)
- [ ] Descripción completa (máximo 4000 caracteres)
- [ ] Icono de la app (512x512)
- [ ] Capturas de pantalla (mínimo 2)
- [ ] Categoría: Gobierno/Utilidades públicas

### Configuración Técnica:

- [ ] APK/AAB subido
- [ ] Número de versión configurado
- [ ] Notas de la versión escritas
- [ ] Permisos explicados
- [ ] Política de privacidad enlazada

### Publicación:

- [ ] Precio configurado (Gratis)
- [ ] Países seleccionados
- [ ] Todo revisado
- [ ] Enviado para revisión

---

## ⚠️ Problemas Comunes y Soluciones

### Error: "APK no firmado"

**Solución**: Firma el APK con `jarsigner` antes de subirlo.

### Error: "Clave de firma diferente"

**Solución**: Usa siempre el mismo archivo `.jks` para todas las versiones.

### Error: "Falta política de privacidad"

**Solución**: Crea una página de política de privacidad y enlázala en la configuración.

### Error: "Faltan capturas de pantalla"

**Solución**: Sube mínimo 2 capturas de pantalla para teléfonos.

### Error: "Descripción muy corta"

**Solución**: Asegúrate de que la descripción tenga al menos 80 caracteres.

---

## 💡 Consejos

1. **Empieza con "Pruebas internas"**:
   - Prueba la app antes de publicarla en producción
   - Invita a algunos usuarios de prueba

2. **Usa versiones semánticas**:
   - Mayor.Minor.Patch (1.0.0 → 1.0.1 → 1.1.0)
   - Facilita el seguimiento de versiones

3. **Guarda el keystore**:
   - Haz backup del archivo `.jks`
   - Si lo pierdes, no podrás actualizar la app

4. **Lee los comentarios**:
   - Responde a las reseñas de los usuarios
   - Mejora la app basándote en el feedback

5. **Actualiza regularmente**:
   - Mantén la app actualizada
   - Corrige bugs rápidamente

---

## 📞 Recursos Útiles

- **Google Play Console**: https://play.google.com/console
- **Documentación oficial**: https://support.google.com/googleplay/android-developer
- **Guía de publicación**: https://support.google.com/googleplay/android-developer/answer/113469

---

## ✅ Resumen

**Pasos principales:**

1. ✅ Firmar el APK con una clave de firma
2. ✅ Crear la aplicación en Google Play Console
3. ✅ Configurar información de la app (nombre, descripción, iconos)
4. ✅ Subir capturas de pantalla
5. ✅ Subir el APK/AAB
6. ✅ Configurar política de privacidad
7. ✅ Enviar para revisión

**Tiempo estimado**: 2-4 horas (primera vez)
**Tiempo de revisión**: 1-7 días

**¡Buena suerte con la publicación! 🚀**




