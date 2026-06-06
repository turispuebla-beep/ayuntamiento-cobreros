@echo off
chcp 65001 >nul
cd /d "%~dp0"
set SRC=%~dp0
set DST=%SRC%ayuntamiento-cobreros-netlify\

echo Sincronizando archivos web a ayuntamiento-cobreros-netlify...

copy /Y "%SRC%index.html" "%DST%index.html"
copy /Y "%SRC%sw.js" "%DST%sw.js"
copy /Y "%SRC%manifest.json" "%DST%manifest.json"
copy /Y "%SRC%_headers" "%DST%_headers"
copy /Y "%SRC%_redirects" "%DST%_redirects" 2>nul
if not exist "%DST%_redirects" echo /*    /index.html   200> "%DST%_redirects"
if exist "%SRC%config.js" copy /Y "%SRC%config.js" "%DST%config.js"
copy /Y "%SRC%js\script.js" "%DST%js\script.js"
copy /Y "%SRC%js\push-config.js" "%DST%js\push-config.js"
copy /Y "%SRC%js\recaptcha.js" "%DST%js\recaptcha.js"
copy /Y "%SRC%js\firebase-bootstrap.js" "%DST%js\firebase-bootstrap.js"
copy /Y "%SRC%js\admin-access-bootstrap.js" "%DST%js\admin-access-bootstrap.js"
copy /Y "%SRC%js\friendly-errors.js" "%DST%js\friendly-errors.js"
copy /Y "%SRC%js\error-handler.js" "%DST%js\error-handler.js"
copy /Y "%SRC%js\storage-uploader.js" "%DST%js\storage-uploader.js"
xcopy /Y /I "%SRC%scripts" "%DST%scripts"
if not exist "%DST%config" mkdir "%DST%config"
xcopy /Y /I "%SRC%config" "%DST%config"
xcopy /Y /E /I "%SRC%css" "%DST%css"
xcopy /Y /E /I "%SRC%images" "%DST%images"
if not exist "%DST%downloads" mkdir "%DST%downloads"
xcopy /Y /E /I "%SRC%downloads" "%DST%downloads"

echo.
echo Generando js\firebase-config.generated.js en ayuntamiento-cobreros-netlify...
node "%SRC%scripts\inject-firebase-config.mjs" "%SRC%ayuntamiento-cobreros-netlify"
if errorlevel 1 (
  echo ERROR: no se pudo generar firebase-config.generated.js
  pause
  exit /b 1
)

echo Hecho. Carpeta lista para subir: ayuntamiento-cobreros-netlify
echo Arrastra esa carpeta en Netlify -^> Deploys, o ejecuta desplegar-netlify.bat
pause
