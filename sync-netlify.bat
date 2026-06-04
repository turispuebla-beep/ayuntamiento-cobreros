@echo off
chcp 65001 >nul
cd /d "%~dp0"
set SRC=%~dp0
set DST=%SRC%ayuntamiento-cobreros-netlify\

echo Sincronizando archivos web a ayuntamiento-cobreros-netlify...

copy /Y "%SRC%index.html" "%DST%index.html"
copy /Y "%SRC%sw.js" "%DST%sw.js"
copy /Y "%SRC%manifest.json" "%DST%manifest.json"
copy /Y "%SRC%js\script.js" "%DST%js\script.js"
copy /Y "%SRC%js\push-config.js" "%DST%js\push-config.js"
copy /Y "%SRC%js\recaptcha.js" "%DST%js\recaptcha.js"
xcopy /Y /E /I "%SRC%css" "%DST%css"
xcopy /Y /E /I "%SRC%images" "%DST%images"

echo Hecho. Sube la carpeta ayuntamiento-cobreros-netlify a Netlify.
pause
