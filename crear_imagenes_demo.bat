@echo off
echo 📸 Creando imágenes demo para noticias
echo =====================================

REM Crear carpeta images si no existe
if not exist "images" mkdir images

echo 🎨 Copiando escudo como imágenes de noticias...

REM Copiar escudo como imágenes de noticias
copy "images\escudo-cobreros.png" "images\noticia-1.jpg" >nul 2>&1
copy "images\escudo-cobreros.png" "images\noticia-2.jpg" >nul 2>&1  
copy "images\escudo-cobreros.png" "images\noticia-3.jpg" >nul 2>&1

echo ✅ Imágenes de noticias creadas:
echo    📄 noticia-1.jpg
echo    📄 noticia-2.jpg  
echo    📄 noticia-3.jpg

echo.
echo 💡 Ahora recarga la página web
pause
