@echo off
echo 📱 Compilando APK - Ayuntamiento de Cobreros
echo ============================================

echo 🔧 Verificando proyecto Android...
if not exist "android-app\gradlew.bat" (
    echo ❌ No se encontró el proyecto Android
    echo 📁 Asegúrate de estar en la carpeta correcta
    pause
    exit /b 1
)

echo ✅ Proyecto Android encontrado

echo 🏗️ Compilando APK...
cd android-app

echo 📦 Ejecutando Gradle...
call gradlew.bat assembleDebug

if %errorlevel% equ 0 (
    echo ✅ APK compilada exitosamente
    
    echo 📱 Copiando APK al escritorio...
    if exist "app\build\outputs\apk\debug\app-debug.apk" (
        copy "app\build\outputs\apk\debug\app-debug.apk" "%USERPROFILE%\Desktop\AyuntamientoCobreros.apk"
        echo ✅ APK copiada al escritorio como: AyuntamientoCobreros.apk
        echo.
        echo 🎉 ¡APK lista para instalar!
        echo 📍 Ubicación: %USERPROFILE%\Desktop\AyuntamientoCobreros.apk
    ) else (
        echo ❌ No se encontró la APK compilada
        echo 📁 Buscando en otras ubicaciones...
        dir app\build\outputs\apk\ /s /b
    )
) else (
    echo ❌ Error compilando la APK
    echo 💡 Asegúrate de tener Android Studio y Java configurados
)

cd ..
echo.
pause

