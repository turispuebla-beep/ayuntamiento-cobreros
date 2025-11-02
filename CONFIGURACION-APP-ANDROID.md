# 📱 Configuración de la App Android - Ayuntamiento de Cobreros

## ✅ **FUNCIONES DE LA APP ANDROID**

La app Android está configurada **EXACTAMENTE** como especificaste:

---

## 🎯 **FUNCIONALIDADES DE LA APP**

### **1️⃣ Para Usuarios Normales:**

#### **📱 Recibir Notificaciones Push**
- ✅ Solo usuarios **registrados** pueden descargar la app
- ✅ Solo usuarios que **han dado consentimiento** reciben notificaciones
- ✅ Reciben notificaciones de sus **pueblos seleccionados**
- ✅ Reciben notificaciones **generales** del ayuntamiento
- ✅ Notificaciones con **archivos adjuntos** (PDF, imágenes)
- ✅ **6 tipos** de notificaciones:
  - General
  - Emergencia 🚨
  - Cita 📅
  - Evento 🎉
  - Bando 📢
  - Incidencia ⚠️

#### **🔔 Sistema de Consentimiento:**
- Los usuarios **deben dar consentimiento** explícito para recibir notificaciones
- Pueden **seleccionar sus localidades** de interés
- Si seleccionan **varios pueblos**, reciben notificaciones de todos ellos
- Si no seleccionan ningún pueblo, solo reciben notificaciones **generales**

---

### **2️⃣ Para Administradores (desde la App):**

#### **📤 Enviar Notificaciones Push**
- ✅ Los administradores pueden **enviar notificaciones** desde la app
- ✅ Pueden enviar a **pueblos específicos**
- ✅ Pueden enviar a **todos los usuarios**
- ✅ Pueden adjuntar **archivos** (PDF, fotos, documentos)
- ✅ Ver **estadísticas** de entrega

#### **👥 Gestión de Usuarios:**
- ✅ Ver lista de usuarios registrados
- ✅ Ver usuarios con notificaciones activadas
- ✅ Ver estadísticas de usuarios por localidad

---

## 📥 **DESCARGA DE LA APP**

### **🌐 Alerta de Descarga (Solo en Móviles):**

La sección de descarga de APK **NO aparece automáticamente**. Debes configurarla desde Admin:

#### **Pasos para Configurar:**

1. **Iniciar sesión como Administrador** en la web
2. **Ir a Panel de Administración**
3. **Buscar la opción**: "Configurar Descarga de APK"
4. **Completar el formulario**:
   - URL de descarga: `https://tu-dominio.com/app.apk`
   - Versión: `1.0.0`
   - Descripción: `Aplicación oficial del Ayuntamiento de Cobreros`
   - Tamaño: `15 MB`
5. **Guardar configuración**

#### **Después de Configurar:**

- ✅ Aparece una **sección bonita** en la página principal
- ✅ Visible para **todos los visitantes** (móviles y desktop)
- ✅ Incluye botón de descarga con **escudo de Cobreros**
- ✅ **Responsive**: se adapta a móviles y desktop
- ✅ **Gradiente azul** atractivo

### **📱 Experiencia en Móviles:**

Cuando alguien entra desde un móvil:
- ✅ Ve la sección de descarga **destacada**
- ✅ Puede descargar la APK directamente
- ✅ El botón es **grande y visible**
- ✅ Tiene el **escudo del ayuntamiento**

---

## 🔐 **SISTEMA DE REGISTRO**

### **Proceso de Usuario:**

1. **Usuario se registra en la WEB**
   - Introduce: nombre, apellidos, email, teléfono
   - **Selecciona pueblos** de los que quiere notificaciones
   - **Da consentimiento** para recibir notificaciones

2. **Usuario descarga la APP**
   - Va a la web desde su móvil
   - Ve la sección de descarga
   - Descarga e instala la APK

3. **Usuario inicia sesión en la APP**
   - Usa las **mismas credenciales** de la web
   - Se verifica en Firebase
   - Se activa **auto-login**

4. **Usuario empieza a recibir notificaciones**
   - Solo de sus pueblos seleccionados
   - Y notificaciones generales
   - Con archivos adjuntos

---

## 📊 **TIPOS DE NOTIFICACIONES**

### **Filtrado por Localidades:**

Si un administrador envía una notificación a **"Cobreros y Avedillo"**:
- ✅ Solo usuarios que seleccionaron **"Cobreros"** la reciben
- ✅ Solo usuarios que seleccionaron **"Avedillo"** la reciben
- ❌ Usuarios que no seleccionaron esos pueblos **NO** la reciben

### **Notificaciones Generales:**

Si un administrador envía una notificación **"General"**:
- ✅ **Todos los usuarios** la reciben
- ✅ No importa qué pueblos seleccionaron

---

## 🎨 **DISEÑO DE LA SECCIÓN DE DESCARGA**

### **Cómo se Ve:**

```
┌─────────────────────────────────────────┐
│  📲 Aplicación Móvil                    │
│  ─────────────────────────────────────  │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ [ESCUDO]   Ayuntamiento        │   │
│  │            de Cobreros         │   │
│  │                                │   │
│  │  Versión 1.0.0                │   │
│  │                                │   │
│  │  Aplicación oficial del       │   │
│  │  Ayuntamiento de Cobreros     │   │
│  │                                │   │
│  │  Tamaño: 15 MB                │   │
│  │                                │   │
│  │  [ 📥 Descargar APK ]         │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

### **Colores:**
- **Fondo**: Gradiente azul (primary a secondary)
- **Texto**: Blanco
- **Botón**: Blanco con texto azul
- **Escudo**: Imagen del ayuntamiento

---

## ✅ **RESUMEN DE CONFIGURACIÓN**

### **La App está Configurada Para:**

✅ **Recibir** notificaciones push de pueblos seleccionados
✅ **Recibir** notificaciones generales
✅ **Requiere** consentimiento del usuario
✅ **Solo** usuarios registrados
✅ **Administradores** pueden enviar desde la app
✅ **Sección de descarga** (configurar desde Admin)
✅ **Alerta visible** en móviles (después de configurar)
✅ **Arquitectura** bidireccional completa

### **La Sección de Descarga:**

❌ **NO aparece** automáticamente
✅ **SÍ aparece** después de configurarla en Admin
✅ **Visible** en móviles y desktop
✅ **Responsive** y bonita
✅ **Incluye** escudo del ayuntamiento

---

## 🚀 **PASO A PASO PARA ACTIVAR**

### **1. Compilar la APK:**
```bash
cd android-app
./gradlew assembleRelease
```

### **2. Subir la APK a un servidor:**
- Sube el archivo `.apk` a tu hosting
- Obtén la URL: `https://tu-dominio.com/ayuntamiento-cobreros.apk`

### **3. Configurar desde Admin:**
1. Entra como admin en la web
2. Ve a "Configurar APK" 
3. Introduce la URL
4. Guarda

### **4. ¡Listo!**
- Los usuarios verán la sección de descarga
- Podrán descargar la app
- Empezarán a recibir notificaciones

---

**¡La app está PERFECTAMENTE configurada según tus especificaciones!** ✅

**Solo falta configurar la sección de descarga desde el panel de administración.**



