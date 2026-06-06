#!/usr/bin/env python3
"""
Script para generar iconos de la APK del Ayuntamiento de Cobreros
Desde: escudo cobreros.png (escritorio)
Hacia: Todas las carpetas de Android necesarias
"""

import os
from PIL import Image
import shutil

def crear_iconos():
    # Ruta de la imagen original
    imagen_original = os.path.expanduser("~/Desktop/escudo cobreros.png")
    
    # Verificar que existe la imagen
    if not os.path.exists(imagen_original):
        print("❌ No se encontró 'escudo cobreros.png' en el escritorio")
        print("📁 Buscando en:", imagen_original)
        return False
    
    print("✅ Imagen encontrada:", imagen_original)
    
    # Crear carpetas necesarias
    carpetas = [
        "android-app/app/src/main/res/mipmap-hdpi",
        "android-app/app/src/main/res/mipmap-mdpi", 
        "android-app/app/src/main/res/mipmap-xhdpi",
        "android-app/app/src/main/res/mipmap-xxhdpi",
        "android-app/app/src/main/res/mipmap-xxxhdpi",
        "android-app/app/src/main/res/drawable"
    ]
    
    for carpeta in carpetas:
        os.makedirs(carpeta, exist_ok=True)
        print(f"📁 Carpeta creada: {carpeta}")
    
    # Tamaños para iconos de launcher
    tamanos_launcher = {
        "mipmap-mdpi": 48,
        "mipmap-hdpi": 72,
        "mipmap-xhdpi": 96,
        "mipmap-xxhdpi": 144,
        "mipmap-xxxhdpi": 192
    }
    
    # Tamaños para iconos de notificaciones
    tamanos_notificaciones = {
        "drawable": {
            "ic_escudo_cobreros.png": 24,
            "escudo_cobreros.png": 256,
            "ic_loading.png": 24,
            "ic_error.png": 24,
            "ic_attachment.png": 24,
            "ic_view.png": 24,
            "ic_close.png": 24
        }
    }
    
    try:
        # Abrir imagen original
        with Image.open(imagen_original) as img:
            print(f"📸 Imagen original: {img.size[0]}x{img.size[1]} píxeles")
            
            # Convertir a RGBA si no lo está
            if img.mode != 'RGBA':
                img = img.convert('RGBA')
            
            # Generar iconos de launcher
            print("\n🎯 Generando iconos de launcher...")
            for carpeta, tamaño in tamanos_launcher.items():
                ruta_completa = f"android-app/app/src/main/res/{carpeta}/ic_launcher.png"
                icono = img.resize((tamaño, tamaño), Image.Resampling.LANCZOS)
                icono.save(ruta_completa, 'PNG')
                print(f"✅ {ruta_completa} ({tamaño}x{tamaño})")
            
            # Generar iconos de notificaciones
            print("\n🔔 Generando iconos de notificaciones...")
            for carpeta, iconos in tamanos_notificaciones.items():
                for nombre, tamaño in iconos.items():
                    ruta_completa = f"android-app/app/src/main/res/{carpeta}/{nombre}"
                    icono = img.resize((tamaño, tamaño), Image.Resampling.LANCZOS)
                    icono.save(ruta_completa, 'PNG')
                    print(f"✅ {ruta_completa} ({tamaño}x{tamaño})")
            
            # Crear icono round (redondo)
            print("\n⭕ Generando icono redondo...")
            for carpeta, tamaño in tamanos_launcher.items():
                ruta_completa = f"android-app/app/src/main/res/{carpeta}/ic_launcher_round.png"
                icono = img.resize((tamaño, tamaño), Image.Resampling.LANCZOS)
                icono.save(ruta_completa, 'PNG')
                print(f"✅ {ruta_completa} ({tamaño}x{tamaño})")
            
            print("\n🎉 ¡Todos los iconos generados exitosamente!")
            print("\n📋 Iconos creados:")
            print("   🏛️ ic_launcher.png (todos los tamaños)")
            print("   ⭕ ic_launcher_round.png (todos los tamaños)")
            print("   🔔 ic_escudo_cobreros.png (24x24)")
            print("   🏛️ escudo_cobreros.png (256x256)")
            print("   📎 Iconos adicionales para notificaciones")
            
            return True
            
    except Exception as e:
        print(f"❌ Error procesando imagen: {e}")
        return False

if __name__ == "__main__":
    print("🏛️ Generador de Iconos - Ayuntamiento de Cobreros")
    print("=" * 50)
    
    if crear_iconos():
        print("\n✅ ¡Proceso completado!")
        print("📱 Ahora puedes compilar la APK en Android Studio")
    else:
        print("\n❌ Error en el proceso")
        print("💡 Asegúrate de que 'escudo cobreros.png' esté en el escritorio")



