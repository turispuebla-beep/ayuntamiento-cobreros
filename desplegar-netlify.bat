@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ========================================
echo  Despliegue Netlify - Ayuntamiento Cobreros
echo ========================================
echo.

call sync-netlify.bat
if errorlevel 1 exit /b 1

echo.
echo Carpeta lista: ayuntamiento-cobreros-netlify
echo.

where npx >nul 2>&1
if errorlevel 1 (
    echo Sin npx. Sube la carpeta manualmente en https://app.netlify.com
    echo Ver NETLIFY-PASO-A-PASO.md
    pause
    exit /b 0
)

set /p DEPLOY="Desplegar ahora con Netlify CLI? (S/N): "
if /i not "%DEPLOY%"=="S" (
    echo.
    echo Manual: arrastra ayuntamiento-cobreros-netlify a Netlify Drop.
    pause
    exit /b 0
)

echo.
echo Si es la primera vez, se abrira el login de Netlify...
cd ayuntamiento-cobreros-netlify
call npx --yes netlify-cli@17 deploy --prod --dir=.

if errorlevel 1 (
    echo.
    echo Fallo el deploy CLI. Usa arrastrar y soltar en app.netlify.com
) else (
    echo.
    echo Deploy terminado. Revisa la URL en la salida anterior.
    echo Recuerda: Firebase - Authorized domains - tu URL .netlify.app
)

cd ..
pause
