# 🎨 Iconos para la APK del Ayuntamiento de Cobreros

## 📋 **Iconos Necesarios:**

### **1. 🏛️ Icono Principal de la App (ic_launcher):**
```
📁 app/src/main/res/
├── 📁 mipmap-hdpi/
│   └── 📄 ic_launcher.png (72x72px)
├── 📁 mipmap-mdpi/
│   └── 📄 ic_launcher.png (48x48px)
├── 📁 mipmap-xhdpi/
│   └── 📄 ic_launcher.png (96x96px)
├── 📁 mipmap-xxhdpi/
│   └── 📄 ic_launcher.png (144x144px)
└── 📁 mipmap-xxxhdpi/
    └── 📄 ic_launcher.png (192x192px)
```

### **2. 🔔 Iconos para Notificaciones:**
```
📁 app/src/main/res/drawable/
├── 📄 ic_escudo_cobreros.png (24x24px) - Icono pequeño
├── 📄 escudo_cobreros.png (256x256px) - Icono grande
├── 📄 ic_loading.png (24x24px) - Cargando
├── 📄 ic_error.png (24x24px) - Error
├── 📄 ic_attachment.png (24x24px) - Archivo adjunto
├── 📄 ic_view.png (24x24px) - Ver
└── 📄 ic_close.png (24x24px) - Cerrar
```

## 🎯 **Cómo Crear los Iconos:**

### **Método 1: Android Studio (Recomendado)**
1. **Abrir Android Studio**
2. **File** → **New** → **Image Asset**
3. **Icon Type:** Launcher Icons (Adaptive and Legacy)
4. **Path:** Seleccionar imagen del escudo (512x512px)
5. **Name:** `ic_launcher`
6. **Generate**

### **Método 2: Herramientas Online**
- **Android Asset Studio:** https://romannurik.github.io/AndroidAssetStudio/
- **App Icon Generator:** https://appicon.co/
- **Icon Kitchen:** https://icon.kitchen/

### **Método 3: Manual**
1. **Crear imagen** del escudo (512x512px)
2. **Redimensionar** a cada tamaño necesario
3. **Guardar** en las carpetas correspondientes

## 🖼️ **Especificaciones de la Imagen:**

### **✅ Requisitos:**
- **Formato:** PNG
- **Fondo:** Transparente o sólido
- **Calidad:** Alta resolución
- **Tema:** Escudo del Ayuntamiento de Cobreros
- **Colores:** Azul del ayuntamiento (#1e3a8a)

### **📐 Tamaños Necesarios:**
- **Launcher:** 48x48, 72x72, 96x96, 144x144, 192x192
- **Notificaciones:** 24x24, 256x256
- **Adaptive:** 108x108 (foreground), 108x108 (background)

## 🔧 **Configuración en AndroidManifest.xml:**

### **Ya configurado:**
```xml
<application
    android:icon="@mipmap/ic_launcher"
    android:roundIcon="@mipmap/ic_launcher_round"
    android:theme="@style/AppTheme">
```

## 🎨 **Colores del Ayuntamiento:**

### **Ya configurado en colors.xml:**
```xml
<color name="ayuntamiento_blue">#1e3a8a</color>
<color name="ayuntamiento_blue_light">#3b82f6</color>
<color name="ayuntamiento_blue_dark">#1e40af</color>
```

## 📱 **Resultado Final:**

### **✅ Lo que verás:**
- **Icono del escudo** en la pantalla de inicio
- **Notificaciones** con el escudo de Cobreros
- **Colores** del ayuntamiento en toda la app
- **Diseño profesional** y consistente

## 🚀 **Pasos para Implementar:**

### **1. 📸 Tener la imagen del escudo:**
- Escudo del Ayuntamiento de Cobreros
- Formato PNG, 512x512px mínimo
- Fondo transparente o azul del ayuntamiento

### **2. 🎨 Generar iconos:**
- Usar Android Studio Image Asset
- O herramientas online
- O crear manualmente

### **3. 📁 Colocar en carpetas:**
- Copiar a las carpetas mipmap-*
- Copiar a drawable/
- Verificar que se vean correctamente

### **4. 🔨 Compilar:**
- Build → Clean Project
- Build → Rebuild Project
- Run → Run 'app'

**¡Con esto tendrás una APK profesional con el escudo del Ayuntamiento de Cobreros!** 🏛️✨


