# Script PowerShell para redimensionar iconos PWA
# Requiere: .NET Framework o PowerShell Core

$sourceImage = "images\escudo-cobreros-original.png"
$output192 = "images\escudo-cobreros-192.png"
$output512 = "images\escudo-cobreros-512.png"

# Verificar si existe el archivo original
if (-not (Test-Path $sourceImage)) {
    Write-Host "❌ Error: No se encuentra el archivo $sourceImage" -ForegroundColor Red
    Write-Host "Por favor, copia 'FOTO COBREROS.png' a la carpeta images como 'escudo-cobreros-original.png'" -ForegroundColor Yellow
    exit 1
}

Write-Host "🖼️ Redimensionando iconos PWA..." -ForegroundColor Cyan

try {
    # Cargar la imagen usando .NET
    Add-Type -AssemblyName System.Drawing
    
    $original = [System.Drawing.Image]::FromFile((Resolve-Path $sourceImage))
    
    # Crear versión 192x192
    $bitmap192 = New-Object System.Drawing.Bitmap(192, 192)
    $graphics192 = [System.Drawing.Graphics]::FromImage($bitmap192)
    $graphics192.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics192.DrawImage($original, 0, 0, 192, 192)
    $bitmap192.Save((Resolve-Path "images").Path + "\escudo-cobreros-192.png", [System.Drawing.Imaging.ImageFormat]::Png)
    $graphics192.Dispose()
    $bitmap192.Dispose()
    
    Write-Host "✅ Creado: escudo-cobreros-192.png (192x192)" -ForegroundColor Green
    
    # Crear versión 512x512
    $bitmap512 = New-Object System.Drawing.Bitmap(512, 512)
    $graphics512 = [System.Drawing.Graphics]::FromImage($bitmap512)
    $graphics512.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics512.DrawImage($original, 0, 0, 512, 512)
    $bitmap512.Save((Resolve-Path "images").Path + "\escudo-cobreros-512.png", [System.Drawing.Imaging.ImageFormat]::Png)
    $graphics512.Dispose()
    $bitmap512.Dispose()
    
    Write-Host "✅ Creado: escudo-cobreros-512.png (512x512)" -ForegroundColor Green
    Write-Host ""
    Write-Host "🎉 ¡Iconos creados exitosamente!" -ForegroundColor Green
    Write-Host "Ahora puedes desplegar en Netlify y probar PWA Builder de nuevo." -ForegroundColor Cyan
    
    $original.Dispose()
} catch {
    Write-Host "❌ Error al redimensionar: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Alternativa: Usa una herramienta online:" -ForegroundColor Yellow
    Write-Host "   1. Abre: https://squoosh.app/" -ForegroundColor Yellow
    Write-Host "   2. Sube: images\escudo-cobreros-original.png" -ForegroundColor Yellow
    Write-Host "   3. Redimensiona a 192x192 y guarda como escudo-cobreros-192.png" -ForegroundColor Yellow
    Write-Host "   4. Repite para 512x512" -ForegroundColor Yellow
    exit 1
}




