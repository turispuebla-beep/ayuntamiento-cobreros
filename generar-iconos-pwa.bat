@echo off
cd /d "%~dp0"
echo Generando PNG PWA desde images\escudo-cobreros.jpg ...
node scripts\generate-pwa-icons.mjs
if errorlevel 1 (
  echo ERROR al ejecutar el script.
  pause
  exit /b 1
)
echo Listo.
pause
