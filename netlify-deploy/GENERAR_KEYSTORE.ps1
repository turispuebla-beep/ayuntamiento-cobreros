# Script para generar el Keystore (.jks) para firmar el APK de Google Play
# Ejecuta este script en PowerShell para generar tu clave de firma

Write-Host "🔐 Generador de Keystore para Ayuntamiento de Cobreros" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

# Verificar que Java esté instalado
$javaVersion = java -version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ ERROR: Java no está instalado o no está en el PATH" -ForegroundColor Red
    Write-Host ""
    Write-Host "Por favor, instala Java JDK desde:" -ForegroundColor Yellow
    Write-Host "  https://www.oracle.com/java/technologies/downloads/" -ForegroundColor Yellow
    Write-Host "  O https://adoptium.net/" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Presiona cualquier tecla para salir..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

Write-Host "✅ Java detectado" -ForegroundColor Green
Write-Host ""

# Información para el keystore
Write-Host "📝 Información para el Keystore:" -ForegroundColor Yellow
Write-Host ""

$keystoreName = "cobreros-release-key.jks"
$alias = "cobreros"
$validity = "10000"  # ~27 años

# Información del certificado (puedes personalizar estos valores)
Write-Host "Ingresa la siguiente información para el certificado:" -ForegroundColor Cyan
Write-Host ""

$nombre = Read-Host "Nombre y apellidos (ej: Juan Pérez)"
$organizacion = Read-Host "Organización [Ayuntamiento de Cobreros]"
if ([string]::IsNullOrWhiteSpace($organizacion)) {
    $organizacion = "Ayuntamiento de Cobreros"
}

$unidad = Read-Host "Unidad organizativa (opcional, presiona Enter para omitir)"
$ciudad = Read-Host "Ciudad [Cobreros]"
if ([string]::IsNullOrWhiteSpace($ciudad)) {
    $ciudad = "Cobreros"
}

$provincia = Read-Host "Provincia/Estado [Zamora]"
if ([string]::IsNullOrWhiteSpace($provincia)) {
    $provincia = "Zamora"
}

$pais = Read-Host "Código de país (2 letras) [ES]"
if ([string]::IsNullOrWhiteSpace($pais)) {
    $pais = "ES"
}

Write-Host ""
Write-Host "🔑 IMPORTANTE: Necesitarás crear una contraseña para el keystore" -ForegroundColor Yellow
Write-Host "   Esta contraseña es CRÍTICA. Guárdala en un lugar seguro." -ForegroundColor Yellow
Write-Host "   Si la pierdes, NO podrás actualizar tu app en Google Play." -ForegroundColor Red
Write-Host ""

$password = Read-Host "Contraseña para el keystore (mínimo 6 caracteres)" -AsSecureString
$passwordConfirm = Read-Host "Confirma la contraseña" -AsSecureString

# Convertir SecureString a String para comparar
$passwordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($password)
)
$passwordConfirmPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($passwordConfirm)
)

if ($passwordPlain -ne $passwordConfirmPlain) {
    Write-Host ""
    Write-Host "❌ ERROR: Las contraseñas no coinciden" -ForegroundColor Red
    Write-Host "Presiona cualquier tecla para salir..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

if ($passwordPlain.Length -lt 6) {
    Write-Host ""
    Write-Host "❌ ERROR: La contraseña debe tener al menos 6 caracteres" -ForegroundColor Red
    Write-Host "Presiona cualquier tecla para salir..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

Write-Host ""
Write-Host "🔐 Generando keystore..." -ForegroundColor Cyan
Write-Host ""

# Construir el DN (Distinguished Name) para el certificado
if ([string]::IsNullOrWhiteSpace($unidad)) {
    $dname = "CN=$nombre, O=$organizacion, L=$ciudad, ST=$provincia, C=$pais"
} else {
    $dname = "CN=$nombre, OU=$unidad, O=$organizacion, L=$ciudad, ST=$provincia, C=$pais"
}

# Construir el comando keytool
$keytoolArgs = @(
    "-genkey",
    "-v",
    "-keystore", $keystoreName,
    "-alias", $alias,
    "-keyalg", "RSA",
    "-keysize", "2048",
    "-validity", $validity,
    "-storepass", $passwordPlain,
    "-keypass", $passwordPlain,
    "-dname", $dname
)

# Ejecutar keytool
Write-Host "Ejecutando keytool..." -ForegroundColor Cyan
Write-Host ""

try {
    # Construir el comando completo
    $keytoolCommand = "keytool -genkey -v -keystore `"$keystoreName`" -alias `"$alias`" -keyalg RSA -keysize 2048 -validity $validity -storepass `"$passwordPlain`" -keypass `"$passwordPlain`" -dname `"$dname`""
    
    # Ejecutar el comando
    Invoke-Expression $keytoolCommand
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Keystore generado exitosamente!" -ForegroundColor Green
        Write-Host ""
        Write-Host "📁 Archivo creado: $keystoreName" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "⚠️  IMPORTANTE - GUARDA ESTA INFORMACIÓN:" -ForegroundColor Yellow
        Write-Host "   =========================================" -ForegroundColor Yellow
        Write-Host "   📁 Archivo: $keystoreName" -ForegroundColor White
        Write-Host "   🔑 Alias: $alias" -ForegroundColor White
        Write-Host "   🔐 Contraseña: [La que acabas de crear]" -ForegroundColor White
        Write-Host ""
        Write-Host "   ⚠️  Si pierdes este archivo o la contraseña," -ForegroundColor Red
        Write-Host "      NO podrás actualizar tu app en Google Play." -ForegroundColor Red
        Write-Host ""
        Write-Host "   💾 Guarda el archivo en:" -ForegroundColor Yellow
        Write-Host "      - Un USB de respaldo" -ForegroundColor White
        Write-Host "      - Un servicio de almacenamiento en la nube (encriptado)" -ForegroundColor White
        Write-Host "      - Múltiples ubicaciones seguras" -ForegroundColor White
        Write-Host ""
        
        # Crear un archivo de información (sin la contraseña)
        $infoFile = "keystore-info.txt"
        $currentPath = (Get-Location).Path
        $infoContent = "INFORMACIÓN DEL KEYSTORE - AYUNTAMIENTO DE COBREROS`r`n"
        $infoContent += "====================================================`r`n`r`n"
        $infoContent += "Fecha de creación: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')`r`n`r`n"
        $infoContent += "Archivo: $keystoreName`r`n"
        $infoContent += "Alias: $alias`r`n"
        $infoContent += "Algoritmo: RSA`r`n"
        $infoContent += "Tamaño de clave: 2048 bits`r`n"
        $infoContent += "Validez: $validity días (~27 años)`r`n`r`n"
        $infoContent += "Información del certificado:`r`n"
        $infoContent += "- Nombre: $nombre`r`n"
        $infoContent += "- Organización: $organizacion`r`n"
        $infoContent += "- Ciudad: $ciudad`r`n"
        $infoContent += "- Provincia: $provincia`r`n"
        $infoContent += "- País: $pais`r`n`r`n"
        $infoContent += "⚠️  IMPORTANTE:`r`n"
        $infoContent += "- La contraseña NO está guardada en este archivo por seguridad`r`n"
        $infoContent += "- Guarda la contraseña en un gestor de contraseñas seguro`r`n"
        $infoContent += "- Haz backup del archivo .jks en múltiples ubicaciones`r`n"
        $infoContent += "- Si pierdes el archivo o la contraseña, NO podrás actualizar la app`r`n`r`n"
        $infoContent += "Ubicación del archivo: $currentPath\$keystoreName`r`n"
        
        $infoContent | Out-File -FilePath $infoFile -Encoding UTF8
        Write-Host "   📄 Archivo de información creado: $infoFile" -ForegroundColor Green
        Write-Host ""
        Write-Host "✅ ¡Listo! Ya puedes usar este keystore para firmar tu APK" -ForegroundColor Green
        Write-Host ""
        Write-Host "Siguiente paso: Firmar el APK con:" -ForegroundColor Cyan
        Write-Host "   jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 -keystore $keystoreName tu-app.apk $alias" -ForegroundColor White
        Write-Host ""
    } else {
        Write-Host ""
        Write-Host "❌ ERROR al generar el keystore" -ForegroundColor Red
        Write-Host "Código de salida: $LASTEXITCODE" -ForegroundColor Red
    }
} catch {
    Write-Host ""
    Write-Host "❌ ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Presiona cualquier tecla para salir..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

