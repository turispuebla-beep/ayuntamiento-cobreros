#!/usr/bin/env bash
set -euo pipefail

FALLBACK_DIR="netlify-deploy"

if [ -d "$FALLBACK_DIR" ]; then
  echo "✅ Directorio '$FALLBACK_DIR' detectado. Continuando sin cambios."
  exit 0
fi

echo "⚠️ Directorio '$FALLBACK_DIR' no encontrado. Creándolo a partir del contenido actual..."

mkdir -p "$FALLBACK_DIR"

TO_COPY=(
  "index.html"
  "manifest.json"
  "sw.js"
  "favicon.ico"
  "favicon.png"
  "css"
  "js"
  "images"
  "img"
  "fonts"
  "assets"
  "static"
  "data"
  "resources"
)

copied_any=false

for item in "${TO_COPY[@]}"; do
  if [ -d "$item" ]; then
    cp -R "$item" "$FALLBACK_DIR/"
    copied_any=true
  elif [ -f "$item" ]; then
    cp "$item" "$FALLBACK_DIR/"
    copied_any=true
  fi
done

if [ "$copied_any" = false ]; then
  echo "❌ No se encontraron archivos básicos para copiar. Asegúrate de subir el contenido correcto."
  exit 1
fi

if [ ! -f "$FALLBACK_DIR/index.html" ]; then
  echo "❌ No se ha podido crear un 'index.html' dentro de '$FALLBACK_DIR'."
  exit 1
fi

echo "✅ Carpeta '$FALLBACK_DIR' reconstruida automáticamente."



