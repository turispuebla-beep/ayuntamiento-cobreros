Write-Host "🔐 Generador de Keystore para Ayuntamiento de Cobreros" -ForegroundColor Cyan
Write-Host ""

$javaTest = java -version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ ERROR: Java no está instalado" -ForegroundColor Red
    Write-Host "Instala Java JDK desde: https://adoptium.net/" -ForegroundColor Yellow
    Read-Host "Presiona Enter para salir"
    exit
}

Write-Host "✅ Java detectado" -ForegroundColor Green
Write-Host ""
Write-Host "Ingresa la información para el certificado:" -ForegroundColor Cyan
Write-Host ""

$nombre = Read-Host "Nombre y apellidos"
$organizacion = Read-Host "Organización [Turisteam Platform System]"
if ($organizacion -eq "") { $organizacion = "Turisteam Platform System" }

$ciudad = Read-Host "Ciudad [Cobreros]"
if ($ciudad -eq "") { $ciudad = "Cobreros" }

$provincia = Read-Host "Provincia [Zamora]"
if ($provincia -eq "") { $provincia = "Zamora" }

$pais = Read-Host "Código de país [ES]"
if ($pais -eq "") { $pais = "ES" }

Write-Host ""
Write-Host "🔑 IMPORTANTE: Crea una contraseña segura y guárdala bien" -ForegroundColor Yellow
Write-Host ""

$pass1 = Read-Host "Contraseña para el keystore" -AsSecureString
$pass2 = Read-Host "Confirma la contraseña" -AsSecureString

$bstr1 = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($pass1)
$bstr2 = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($pass2)
$pwd1 = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr1)
$pwd2 = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr2)
[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr1)
[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr2)

if ($pwd1 -ne $pwd2) {
    Write-Host "❌ Las contraseñas no coinciden" -ForegroundColor Red
    Read-Host "Presiona Enter para salir"
    exit
}

if ($pwd1.Length -lt 6) {
    Write-Host "❌ La contraseña debe tener al menos 6 caracteres" -ForegroundColor Red
    Read-Host "Presiona Enter para salir"
    exit
}

$keystoreName = "cobreros-release-key.jks"
$alias = "cobreros"
$dname = "CN=$nombre, O=$organizacion, L=$ciudad, ST=$provincia, C=$pais"

Write-Host ""
Write-Host "🔐 Generando keystore..." -ForegroundColor Cyan
Write-Host ""

keytool -genkey -v -keystore $keystoreName -alias $alias -keyalg RSA -keysize 2048 -validity 10000 -storepass $pwd1 -keypass $pwd1 -dname $dname

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Keystore generado: $keystoreName" -ForegroundColor Green
    Write-Host ""
    Write-Host "⚠️  GUARDA ESTA INFORMACIÓN:" -ForegroundColor Yellow
    Write-Host "   Archivo: $keystoreName" -ForegroundColor White
    Write-Host "   Alias: $alias" -ForegroundColor White
    Write-Host "   Contraseña: [La que acabas de crear]" -ForegroundColor White
    Write-Host ""
    Write-Host "   ⚠️  Si pierdes el archivo o la contraseña," -ForegroundColor Red
    Write-Host "      NO podrás actualizar tu app en Google Play." -ForegroundColor Red
} else {
    Write-Host ""
    Write-Host "❌ Error al generar el keystore" -ForegroundColor Red
}

Write-Host ""
Read-Host "Presiona Enter para salir"
