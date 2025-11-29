# Crear Iconos PNG Válidos para PWA

## Problema
Los archivos `escudo-cobreros-192.png` y `escudo-cobreros-512.png` no son PNG válidos, lo que causa errores en PWA Builder.

## Solución

### Opción 1: Usar herramienta online (Recomendado)

1. **Abre el archivo original**: `images/escudo-cobreros.png` o `images/escudo-cobreros.jpg`
2. **Usa una herramienta online para redimensionar**:
   - [Squoosh](https://squoosh.app/) - Herramienta de Google
   - [TinyPNG](https://tinypng.com/) - Comprime y redimensiona
   - [ResizeImage.net](https://resizeimage.net/) - Redimensiona fácilmente

3. **Crea dos versiones**:
   - **192x192 píxeles** → Guarda como `escudo-cobreros-192.png`
   - **512x512 píxeles** → Guarda como `escudo-cobreros-512.png`

4. **Importante**: Asegúrate de que:
   - El formato sea **PNG** (no JPG renombrado)
   - El tamaño sea **exacto** (192x192 y 512x512)
   - El archivo sea **válido** (puedes abrirlo en un visor de imágenes)

### Opción 2: Usar GIMP o Photoshop

1. Abre `images/escudo-cobreros.png` o `images/escudo-cobreros.jpg`
2. Ve a **Imagen > Escalar imagen**
3. Establece el tamaño a **192x192 píxeles**
4. **Exportar como** → PNG → `escudo-cobreros-192.png`
5. Repite para **512x512 píxeles** → `escudo-cobreros-512.png`

### Opción 3: Usar ImageMagick (línea de comandos)

```bash
# Redimensionar a 192x192
magick convert images/escudo-cobreros.png -resize 192x192 images/escudo-cobreros-192.png

# Redimensionar a 512x512
magick convert images/escudo-cobreros.png -resize 512x512 images/escudo-cobreros-512.png
```

## Verificación

Después de crear los iconos, verifica que:

1. **Los archivos existen**: `images/escudo-cobreros-192.png` y `images/escudo-cobreros-512.png`
2. **Son PNG válidos**: Puedes abrirlos en un visor de imágenes
3. **Tienen el tamaño correcto**: 192x192 y 512x512 píxeles exactos
4. **Son accesibles**: Abre en el navegador:
   - `https://www.ayuntamientocobreros.com/images/escudo-cobreros-192.png`
   - `https://www.ayuntamientocobreros.com/images/escudo-cobreros-512.png`

## Actualizar Manifest

Una vez creados los iconos válidos, actualiza el `manifest.json`:

```json
"icons": [
  {
    "src": "https://www.ayuntamientocobreros.com/images/escudo-cobreros-192.png",
    "sizes": "192x192",
    "type": "image/png",
    "purpose": "any"
  },
  {
    "src": "https://www.ayuntamientocobreros.com/images/escudo-cobreros-512.png",
    "sizes": "512x512",
    "type": "image/png",
    "purpose": "any"
  }
]
```

## Después de crear los iconos

1. Reemplaza los archivos en `images/`
2. Despliega en Netlify
3. Verifica que los iconos sean accesibles
4. Intenta de nuevo con PWA Builder




