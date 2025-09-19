@echo off
echo 🏛️ Generador de Iconos - Ayuntamiento de Cobreros
echo ================================================

REM Verificar que existe la imagen
if not exist "%USERPROFILE%\Desktop\escudo cobreros.png" (
    echo ❌ No se encontró 'escudo cobreros.png' en el escritorio
    echo 📁 Buscando en: %USERPROFILE%\Desktop\escudo cobreros.png
    pause
    exit /b 1
)

echo ✅ Imagen encontrada: %USERPROFILE%\Desktop\escudo cobreros.png

REM Crear carpetas necesarias
echo 📁 Creando carpetas...
mkdir "android-app\app\src\main\res\mipmap-hdpi" 2>nul
mkdir "android-app\app\src\main\res\mipmap-mdpi" 2>nul
mkdir "android-app\app\src\main\res\mipmap-xhdpi" 2>nul
mkdir "android-app\app\src\main\res\mipmap-xxhdpi" 2>nul
mkdir "android-app\app\src\main\res\mipmap-xxxhdpi" 2>nul
mkdir "android-app\app\src\main\res\drawable" 2>nul

echo ✅ Carpetas creadas

REM Copiar imagen original a todas las carpetas
echo 🎯 Copiando imagen a todas las carpetas...

copy "%USERPROFILE%\Desktop\escudo cobreros.png" "android-app\app\src\main\res\mipmap-hdpi\ic_launcher.png"
copy "%USERPROFILE%\Desktop\escudo cobreros.png" "android-app\app\src\main\res\mipmap-mdpi\ic_launcher.png"
copy "%USERPROFILE%\Desktop\escudo cobreros.png" "android-app\app\src\main\res\mipmap-xhdpi\ic_launcher.png"
copy "%USERPROFILE%\Desktop\escudo cobreros.png" "android-app\app\src\main\res\mipmap-xxhdpi\ic_launcher.png"
copy "%USERPROFILE%\Desktop\escudo cobreros.png" "android-app\app\src\main\res\mipmap-xxxhdpi\ic_launcher.png"

REM Crear iconos redondos
copy "%USERPROFILE%\Desktop\escudo cobreros.png" "android-app\app\src\main\res\mipmap-hdpi\ic_launcher_round.png"
copy "%USERPROFILE%\Desktop\escudo cobreros.png" "android-app\app\src\main\res\mipmap-mdpi\ic_launcher_round.png"
copy "%USERPROFILE%\Desktop\escudo cobreros.png" "android-app\app\src\main\res\mipmap-xhdpi\ic_launcher_round.png"
copy "%USERPROFILE%\Desktop\escudo cobreros.png" "android-app\app\src\main\res\mipmap-xxhdpi\ic_launcher_round.png"
copy "%USERPROFILE%\Desktop\escudo cobreros.png" "android-app\app\src\main\res\mipmap-xxxhdpi\ic_launcher_round.png"

REM Crear iconos para notificaciones
copy "%USERPROFILE%\Desktop\escudo cobreros.png" "android-app\app\src\main\res\drawable\ic_escudo_cobreros.png"
copy "%USERPROFILE%\Desktop\escudo cobreros.png" "android-app\app\src\main\res\drawable\escudo_cobreros.png"

echo ✅ Iconos copiados

echo.
echo 🎉 ¡Iconos creados exitosamente!
echo.
echo 📋 Iconos creados:
echo    🏛️ ic_launcher.png (todos los tamaños)
echo    ⭕ ic_launcher_round.png (todos los tamaños)
echo    🔔 ic_escudo_cobreros.png
echo    🏛️ escudo_cobreros.png
echo.
echo 📱 Ahora puedes compilar la APK en Android Studio
echo.
echo ⚠️  NOTA: Los iconos están en el tamaño original
echo    Para tamaños específicos, usa Android Studio Image Asset
echo.
pause


