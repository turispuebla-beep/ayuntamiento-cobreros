@echo off
echo 📱 Copiando APK del Ayuntamiento de Cobreros al escritorio
echo ========================================================

echo 🔍 Buscando APK compilada...
if exist "android-app\app\build\outputs\apk\debug\app-debug.apk" (
    echo ✅ APK encontrada
    echo 📋 Copiando al escritorio...
    copy "android-app\app\build\outputs\apk\debug\app-debug.apk" "%USERPROFILE%\Desktop\AyuntamientoCobreros.apk"
    if %errorlevel% equ 0 (
        echo ✅ APK copiada exitosamente al escritorio
        echo 📱 Nombre: AyuntamientoCobreros.apk
        echo 📍 Ubicación: %USERPROFILE%\Desktop\
        echo.
        echo 🏛️ Características de la APK:
        echo    ✅ Icono: Escudo de Cobreros
        echo    ✅ reCAPTCHA v3 integrado
        echo    ✅ Admin: aytocobreros@gmail.com / admin123
        echo    ✅ Super Admin: amco@gmx.es / 533712
        echo    ✅ Notificaciones push
        echo    ✅ Sincronización con web
        echo.
        echo 🎉 ¡APK lista para instalar!
    ) else (
        echo ❌ Error copiando la APK
    )
) else (
    echo ❌ APK no encontrada
    echo 💡 La APK se está compilando o hubo un error
    echo 📁 Ruta esperada: android-app\app\build\outputs\apk\debug\app-debug.apk
)

echo.
pause
