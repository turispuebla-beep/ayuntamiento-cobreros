@echo off
chcp 65001 >nul
cd /d "%~dp0"

if not exist ".env.firebase" (
  copy /Y ".env.firebase.example" ".env.firebase" >nul
  echo Creado .env.firebase desde el ejemplo.
  echo IMPORTANTE: rellena FIREBASE_API_KEY antes de continuar.
)

rem Clave vacia = linea FIREBASE_API_KEY= sin caracteres despues del =
findstr /R /C:"^FIREBASE_API_KEY=..*" ".env.firebase" >nul 2>&1
if errorlevel 1 (
  echo.
  echo Falta FIREBASE_API_KEY en .env.firebase
  echo.
  echo NO uses: copy .env.firebase.example .env.firebase  ^(borra la clave si ya la tenias^)
  echo.
  echo 1. Firebase Console ^> ayuntamiento-de-cobreros ^> Project settings ^> Your apps ^> Web
  echo 2. Copia "apiKey" y pegala en .env.firebase:  FIREBASE_API_KEY=tu_clave
  echo.
  notepad ".env.firebase"
  pause
  exit /b 1
)

node scripts\inject-firebase-config.mjs .
if errorlevel 1 exit /b 1

node scripts\inject-firebase-config.mjs ayuntamiento-cobreros-netlify
echo.
echo Listo. Config generada en js\ y ayuntamiento-cobreros-netlify\js\
pause
