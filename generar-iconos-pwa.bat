@echo off
cd /d "%~dp0"
echo Generando iconos PWA desde images\escudo-cobreros.png ...
call npm run icons
if errorlevel 1 (
  echo ERROR al generar iconos.
  pause
  exit /b 1
)
echo Listo. Ejecuta sync-netlify.bat antes de desplegar.
pause
