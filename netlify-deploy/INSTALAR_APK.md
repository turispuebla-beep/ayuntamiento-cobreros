# Cómo Instalar el APK en tu Móvil Android

## 📱 Método 1: Transferencia por USB (Más Rápido)

### Paso 1: Conectar el móvil al PC
1. Conecta tu móvil Android al PC con un cable USB
2. En el móvil, cuando aparezca la notificación de USB, selecciona **"Transferencia de archivos"** o **"MTP"**

### Paso 2: Copiar el APK
1. Abre el ZIP descargado de PWA Builder
2. Busca el archivo `.apk` (generalmente `app-release.apk` o similar)
3. Copia el APK a la carpeta `Download` o `Downloads` de tu móvil

### Paso 3: Instalar en el móvil
1. Desconecta el móvil del PC
2. Abre el **gestor de archivos** en tu móvil
3. Navega a la carpeta `Download` o `Downloads`
4. Toca el archivo `.apk`
5. Si aparece un aviso de seguridad, toca **"Configuración"** y activa **"Permitir desde esta fuente"**
6. Toca **"Instalar"**
7. Espera a que termine la instalación
8. Toca **"Abrir"** para iniciar la app

---

## 📧 Método 2: Por Email o Google Drive (Más Fácil)

### Paso 1: Subir el APK
1. Abre el ZIP descargado de PWA Builder
2. Extrae el archivo `.apk`
3. **Opción A - Email:**
   - Envía el APK por email a tu cuenta de Gmail
4. **Opción B - Google Drive:**
   - Sube el APK a Google Drive
   - Comparte el enlace contigo mismo

### Paso 2: Descargar en el móvil
1. Abre tu email o Google Drive en el móvil
2. Descarga el APK
3. Cuando termine la descarga, toca el archivo
4. Sigue los pasos de instalación

---

## 🔐 Habilitar "Fuentes Desconocidas"

Si tu móvil no permite instalar el APK:

### Android 8.0 (Oreo) o superior:
1. Ve a **Configuración** > **Aplicaciones** > **Acceso especial** > **Instalar aplicaciones desconocidas**
2. Selecciona el navegador o gestor de archivos que usas
3. Activa **"Permitir desde esta fuente"**

### Android 7.0 o anterior:
1. Ve a **Configuración** > **Seguridad**
2. Activa **"Fuentes desconocidas"**

---

## ✅ Verificar la Instalación

Después de instalar:
1. Busca el icono de **"Cobreros"** o **"Ayuntamiento de Cobreros"** en el menú de aplicaciones
2. Toca para abrir la app
3. Debería cargar tu sitio web en modo app

---

## 🔄 Actualizaciones

**IMPORTANTE**: La app se actualiza automáticamente cuando actualizas la web. No necesitas reinstalar el APK cada vez que cambias contenido.

Solo necesitas regenerar el APK si cambias:
- El icono de la app
- El nombre de la app
- El service worker
- El manifest.json

---

## ❓ Solución de Problemas

### "No se puede abrir el archivo"
- Verifica que el archivo sea un `.apk` válido
- Asegúrate de haber extraído el APK del ZIP

### "Aplicación no instalada"
- Verifica que tengas suficiente espacio en el móvil
- Intenta desinstalar versiones anteriores si existen

### "El archivo está dañado"
- Descarga el APK de nuevo desde PWA Builder
- Verifica que la descarga se completó correctamente

### La app no se actualiza
- Cierra completamente la app (desde el menú de aplicaciones recientes)
- Vuelve a abrirla
- El contenido debería actualizarse desde la web

---

## 📝 Notas Importantes

- **Seguridad**: Solo instala APKs de fuentes confiables
- **Actualizaciones**: El contenido se actualiza automáticamente desde la web
- **Datos**: La app usa los mismos datos que la web (Firestore)
- **Offline**: Funciona offline gracias al Service Worker




