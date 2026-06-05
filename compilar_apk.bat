@echo off
chcp 65001 >nul
echo Compilando APKs Cobreros (vecinos + avisos)
echo ============================================

if exist "C:\Program Files\Android\Android Studio\jbr" (
    set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
    set "PATH=%JAVA_HOME%\bin;%PATH%"
)

if not defined ANDROID_HOME (
    set "ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk"
)
if not exist "android-app\local.properties" (
    echo sdk.dir=%ANDROID_HOME:\=\\%> android-app\local.properties
)

if not exist "android-app\gradlew.bat" (
    echo No se encontro android-app\gradlew.bat
    exit /b 1
)

cd android-app
call gradlew.bat assembleVecinosRelease assembleAvisosRelease --no-daemon
set BUILD_ERR=%errorlevel%
cd ..

if not %BUILD_ERR%==0 (
    echo Error en la compilacion Gradle
    exit /b 1
)

if not exist "downloads" mkdir downloads

if exist "android-app\app\build\outputs\apk\vecinos\release\app-vecinos-release.apk" (
    copy /Y "android-app\app\build\outputs\apk\vecinos\release\app-vecinos-release.apk" "downloads\cobreros-vecinos.apk"
    echo OK: downloads\cobreros-vecinos.apk
) else (
    echo AVISO: no se genero app-vecinos-release.apk
)

if exist "android-app\app\build\outputs\apk\avisos\release\app-avisos-release.apk" (
    copy /Y "android-app\app\build\outputs\apk\avisos\release\app-avisos-release.apk" "downloads\cobreros-avisos.apk"
    echo OK: downloads\cobreros-avisos.apk (subir tambien a Firebase Storage private/cobreros-avisos.apk)
) else (
    echo AVISO: no se genero app-avisos-release.apk
)

echo.
echo Compilacion terminada.
exit /b 0
