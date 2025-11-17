# Ayuntamiento de Cobreros - Despliegue Netlify

Esta carpeta contiene todos los archivos necesarios para desplegar el sitio web del Ayuntamiento de Cobreros en Netlify.

## Archivos incluidos

- `index.html` - Página principal
- `config.js` - Configuración (sin credenciales embebidas)
- `manifest.json` - Manifesto PWA
- `sw.js` - Service Worker
- `_headers` - Headers HTTP personalizados
- `_redirects` - Reglas de redirección
- `netlify.toml` - Configuración de Netlify
- `css/` - Estilos CSS
- `js/` - Archivos JavaScript
- `images/` - Imágenes y recursos estáticos

## Cómo desplegar en Netlify

### Opción 1: Arrastrar y soltar

1. Ve a https://app.netlify.com/drop
2. Arrastra esta carpeta `netlify-deploy` completa
3. Espera a que termine el despliegue

### Opción 2: Git

1. Si tienes esta carpeta en un repositorio Git:
   - Ve a https://app.netlify.com/start
   - Conecta tu repositorio
   - Configura el directorio de publicación como `netlify-deploy` (o la raíz si solo está esta carpeta)
   - Haz clic en "Deploy site"

### Opción 3: Netlify CLI

```bash
cd netlify-deploy
netlify deploy --prod
```

## Configuración importante

- ✅ Firebase Auth configurado
- ✅ Cloud Functions desplegadas en Firebase
- ✅ Sin credenciales embebidas
- ✅ Reglas de seguridad actualizadas

## URLs de Cloud Functions

Las siguientes funciones están disponibles en:
- `https://us-central1-turisteam-80f1b.cloudfunctions.net/createAppointment`
- `https://us-central1-turisteam-80f1b.cloudfunctions.net/getAppointments`
- `https://us-central1-turisteam-80f1b.cloudfunctions.net/updateAppointmentStatus`
- `https://us-central1-turisteam-80f1b.cloudfunctions.net/deleteAppointment`
- `https://us-central1-turisteam-80f1b.cloudfunctions.net/uploadAppointmentAttachment`

## Notas

- Asegúrate de que los usuarios administradores existan en Firebase Auth
- Verifica que los documentos en la colección `admins` de Firestore estén correctos
- Las citas previas se guardan en Firestore, no en localStorage

