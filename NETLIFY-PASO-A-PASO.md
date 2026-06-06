# Netlify + PWA — Ayuntamiento de Cobreros

Proyecto Firebase: **ayuntamiento-de-cobreros**  
Carpeta a publicar: **`ayuntamiento-cobreros-netlify/`**

---

## Resumen rápido

| Paso | Acción |
|------|--------|
| 1 | `sync-netlify.bat` (copia la web actual) |
| 2 | Subir carpeta a Netlify o `desplegar-netlify.bat` |
| 3 | Firebase: dominios autorizados |
| 4 | Dominio propio (opcional) |
| 5 | Probar PWA e instalación |

---

## 1. Preparar archivos (en tu PC)

Desde la raíz del proyecto:

```bat
sync-netlify.bat
```

Copia `index.html`, `sw.js`, `manifest.json`, `css/`, `js/`, `images/`, `_headers`, `_redirects` y `netlify.toml` a `ayuntamiento-cobreros-netlify\`.

---

## 2. Primera publicación en Netlify

### Opción A — Arrastrar (más fácil)

1. Entra en [https://app.netlify.com](https://app.netlify.com) e inicia sesión.
2. **Add new site** → **Deploy manually**.
3. Arrastra la carpeta **`ayuntamiento-cobreros-netlify`** (no la raíz del repo).
4. Espera 1–2 minutos.
5. Netlify te dará una URL tipo: `https://nombre-random-123.netlify.app`
6. En **Site configuration** → **Change site name** puedes poner: `ayuntamiento-cobreros`  
   → URL fija: **`https://ayuntamiento-cobreros.netlify.app`**

### Opción B — Desde terminal (CLI)

```bat
desplegar-netlify.bat
```

La primera vez pedirá login en el navegador (`npx netlify login`).

### Opción C — GitHub (recomendado a largo plazo)

1. Repositorio: `github.com/turispuebla-beep/ayuntamiento-cobreros`
2. Netlify → **Add new site** → **Import from Git**
3. **Build settings:**
   - **Base directory:** (vacío o raíz)
   - **Publish directory:** `ayuntamiento-cobreros-netlify`
   - **Build command:** (vacío)
4. Cada `git push` despliega solo.

---

## 3. Firebase — dominios autorizados (obligatorio)

Sin esto, login y Firestore fallan en la URL de Netlify.

1. [Firebase Console](https://console.firebase.google.com/project/ayuntamiento-de-cobreros/authentication/settings)
2. **Authentication** → **Settings** → **Authorized domains**
3. Añade:
   - `www.ayuntamientodecobreros.com`
   - `ayuntamientodecobreros.com`
   - `ayuntamientodecobreros.netlify.app`
   - `localhost` (pruebas locales)

La config Firebase se genera en el build (`js/firebase-config.generated.js`) desde variables de entorno (sección 4).

### Push (FCM) en la PWA

1. **Project settings** → **Cloud Messaging** → certificados **Web Push**
2. La clave pública debe coincidir con `js/push-config.js`
3. Tras desplegar, abre la web en **HTTPS**, acepta notificaciones y prueba desde el panel admin (sesión Firebase).

---

## 4. Variables de entorno en Netlify (obligatorias)

El build ejecuta `node scripts/inject-firebase-config.mjs` y genera `js/firebase-config.generated.js`.

**No subas la API key al repositorio.** Netlify la detecta como secreto y falla el deploy.

En **Site settings → Environment variables** añade (mínimo la primera):

| Variable | Valor (ejemplo proyecto Cobreros) |
|----------|-----------------------------------|
| `FIREBASE_API_KEY` | **Obligatoria.** Clave web en Firebase Console → Project settings → Your apps |
| `FIREBASE_AUTH_DOMAIN` | `ayuntamiento-de-cobreros.firebaseapp.com` |
| `FIREBASE_PROJECT_ID` | `ayuntamiento-de-cobreros` |
| `FIREBASE_STORAGE_BUCKET` | `ayuntamiento-de-cobreros.firebasestorage.app` |
| `FIREBASE_MESSAGING_SENDER_ID` | `527550932354` |
| `FIREBASE_APP_ID` | `1:527550932354:web:9bd8431defa7c293b1db9b` |

Tras guardar, **Trigger deploy** → **Clear cache and deploy site**.

Local: copia `.env.firebase.example` → `.env.firebase`, rellena `FIREBASE_API_KEY` y ejecuta:

```bat
node scripts/inject-firebase-config.mjs
node scripts/inject-firebase-config.mjs ayuntamiento-cobreros-netlify
```

---

## 5. Dominio personalizado (producción)

**URL oficial:** `https://www.ayuntamientodecobreros.com`  
**Sitio Netlify:** `ayuntamientodecobreros` · subdominio `ayuntamientodecobreros.netlify.app`

1. Netlify → sitio **ayuntamientodecobreros** → **Domain management**
2. Dominio principal: `www.ayuntamientodecobreros.com`
3. Redirección: `ayuntamientodecobreros.com` → www
4. Si el dominio está registrado en Netlify, el DNS lo gestiona Netlify (esperar propagación).
5. **Firebase → Authorized domains** y **reCAPTCHA Admin**: añadir los dominios nuevos (sección 3).

### Dominio antiguo (sin "de")

Si teníais `www.ayuntamientocobreros.com` en otro sitio Netlify o Porkbun, configurad allí una **redirección 301** a `https://www.ayuntamientodecobreros.com` para no perder visitas.

Propagación DNS: desde minutos hasta 48 h.

---

## 6. Actualizar la PWA cuando cambiéis algo

1. Editáis en la raíz del proyecto (`index.html`, `js/script.js`, etc.).
2. Ejecutáis **`sync-netlify.bat`**
3. Subís de nuevo a Netlify (arrastrar) o `git push` si está conectado a GitHub.
4. Si cambiáis **`sw.js`**, subid la versión del caché (ej. `v5` → `v6`) para que los móviles no queden con UI antigua.
5. Los usuarios al abrir la PWA verán aviso de nueva versión o datos frescos desde Firestore.

---

## 7. Checklist después del deploy

- [ ] La URL abre el ayuntamiento (sin error 404)
- [ ] `manifest.json` y `sw.js` cargan (F12 → Application → Service Workers)
- [ ] Login ciudadano y admin con Firebase
- [ ] En iPhone: Safari → Compartir → Añadir a pantalla de inicio
- [ ] En Android: Chrome → Instalar app / Añadir a inicio
- [ ] Notificaciones: permiso concedido + prueba desde admin
- [ ] Dominio propio con HTTPS (si aplica)

---

## 8. Problemas frecuentes

| Síntoma | Solución |
|---------|----------|
| Firebase `auth/unauthorized-domain` | Añadir dominio Netlify en Firebase Authorized domains |
| PWA no instala | Debe ser HTTPS; revisar `manifest.json` e iconos 192/512 |
| Notificaciones no llegan | Permiso del navegador; VAPID en consola; admin con Firebase Auth |
| Cambios no se ven | Ctrl+F5 o subir versión en `sw.js`; ejecutar `sync-netlify.bat` |
| Panel admin no guarda en nube | Login con cuenta Firebase + documento `admins/{uid}` |

---

## URLs de referencia

- Producción: `https://www.ayuntamientodecobreros.com`
- Netlify: `https://ayuntamientodecobreros.netlify.app`
- Firebase: `https://console.firebase.google.com/project/ayuntamiento-de-cobreros`
