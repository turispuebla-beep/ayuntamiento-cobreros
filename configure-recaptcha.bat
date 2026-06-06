@echo off
echo 🔥 Configurando reCAPTCHA en Firebase Functions
echo =============================================

REM Instalar Firebase CLI si no está instalado
echo 📦 Verificando Firebase CLI...
firebase --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Firebase CLI no está instalado
    echo 💡 Instala con: npm install -g firebase-tools
    pause
    exit /b 1
)

echo ✅ Firebase CLI encontrado

REM Login en Firebase
echo 🔐 Iniciando sesión en Firebase...
firebase login

REM Configurar SECRET KEY
echo 🔑 Configurando SECRET KEY de reCAPTCHA...
firebase functions:config:set recaptcha.secret_key="6LeBYM4rAAAAAMNMYxZHa4lDKxYy7b_ZbiC7FVaq"

REM Verificar configuración
echo 🔍 Verificando configuración...
firebase functions:config:get

echo.
echo ✅ ¡SECRET KEY configurada correctamente!
echo.
echo 📋 Próximos pasos:
echo    1. cd firebase-functions
echo    2. npm install
echo    3. firebase deploy --only functions
echo.
pause
