# Guía de Desarrollo

Este documento resume herramientas y flujos añadidos para mantener el proyecto saludable sin modificar la lógica existente de correo, notificaciones ni login.

## Requisitos

- Node.js 18.x (recomendado) o superior.
- npm 9.x o superior.

## Instalación

```bash
npm install
```

> Si estás en CI, usa `npm ci` para instalaciones reproducibles.

## Scripts disponibles

- `npm run lint` – Ejecuta ESLint sobre todos los archivos JavaScript.
- `npm run test` – Ejecuta los tests unitarios con Jest.
- `npm run test:watch` – Ejecuta los tests en modo watch (desarrollo local).
- `npm run snapshot` – Genera un snapshot de seguridad en `snapshots/<timestamp>/`.

## Tests unitarios

Se añadió Jest con una primera batería de pruebas enfocada al módulo de `rate-limiter`. Puedes encontrar los tests dentro de `__tests__/`.

Para añadir nuevos tests:

1. Asegúrate de que el módulo expone sus funciones mediante `module.exports` (manteniendo el registro en `window` cuando aplique).
2. Crea un archivo `*.test.js` dentro de `__tests__/`.
3. Ejecuta `npm test`.

## Snapshots de seguridad

Si vas a aplicar un cambio grande y quieres poder volver rápidamente a un estado estable:

```bash
npm run snapshot
```

Esto crea una carpeta en `snapshots/<fecha_hora>/` con copias de:

- `index.html`, `js/`, `css/`, `manifest.json`, `sw.js`, `netlify.toml`
- Código de Cloud Functions (`functions/src`, `functions/lib`, `firebase-functions/`)
- `package.json` y `package-lock.json`

El comando también guarda la salida de `git status -sb` en `snapshot-info.json` para saber en qué punto del desarrollo se generó la copia.

### Restaurar un snapshot

Opción automática (recomendada):

```bash
npm run snapshot:restore -- 2025-11-06_23-22-48-251
```

El script:
- Verifica que exista el snapshot.
- Comprueba si hay cambios sin commitear y pide confirmación antes de sobrescribir.
- Copia los archivos incluidos en el snapshot sobre el proyecto actual.
- Muestra el `snapshot-info.json` con contexto (fecha, `git status` original).

Opción manual:

1. Elige la carpeta `snapshots/<timestamp>` que quieras restaurar.
2. Copia manualmente los archivos/directorios desde esa carpeta a la raíz del proyecto (reemplazando los actuales).
3. Vuelve a ejecutar `npm install` si restauraste `package.json` o `package-lock.json`.
4. Comprueba el estado con `npm test` y `npm run lint`.

## Integración Continua

Se añadió un workflow (`.github/workflows/ci.yml`) que:

1. Se ejecuta en cada push o pull request a la rama `main`.
2. Instala dependencias con `npm ci`.
3. Ejecuta `npm run lint`.
4. Ejecuta `npm test`.

> Si el flujo falla, revisa los logs del job “lint-and-test” en GitHub Actions.

## Cobertura

Los reportes de cobertura se generan bajo la carpeta `coverage/` cada vez que se ejecuta `npm test`. No es necesaria para producción, pero sirve como referencia para el equipo técnico.

