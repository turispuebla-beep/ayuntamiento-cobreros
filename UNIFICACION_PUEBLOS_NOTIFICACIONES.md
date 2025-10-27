# 🏘️ Unificación de Pueblos - Sistema de Notificaciones

## ✅ **Unificación Completada**

Se ha unificado la lista de pueblos entre el **panel web** y la **app móvil** para que sea consistente en ambos sistemas.

## 📋 **Lista Unificada de Pueblos (13 pueblos)**

### **Pueblos del Ayuntamiento de Cobreros:**
1. **Cobreros** (pueblo principal)
2. **Avedillo de Sanabria**
3. **Barrio de Lomba**
4. **Castro de Sanabria**
5. **Limianos**
6. **Quintana de Sanabria**
7. **Riego de Lomba**
8. **San Martín del Terroso**
9. **San Miguel de Lomba**
10. **San Román de Sanabria**
11. **Santa Colomba**
12. **Sotillo**
13. **Terroso**

## 🔄 **Cambios Realizados**

### **1. App Móvil (notification-app/index.html)**
- ✅ **Panel de administrador**: Actualizado selector de pueblos objetivo
- ✅ **Selector de usuario**: Actualizado para selección de pueblos de interés
- ✅ **Nombres unificados**: Todos los pueblos usan nombres completos y consistentes

### **2. Panel Web (index.html)**
- ✅ **Ya estaba correcto**: Lista de 13 pueblos ya era la correcta
- ✅ **Sin cambios necesarios**: Mantiene la configuración original

## 🎯 **Funcionalidades Unificadas**

### **Panel Web (Administradores):**
- 📱 **Enviar notificaciones** a todos los usuarios
- 🏘️ **Enviar notificaciones** a pueblos específicos
- 📄 **Adjuntar documentos** (PDF, DOC, JPG, PNG)
- 📊 **Estadísticas** de notificaciones enviadas
- 📋 **Historial** de notificaciones

### **App Móvil (Administradores):**
- 📱 **Enviar notificaciones** desde el móvil
- 🏘️ **Seleccionar pueblos objetivo** (misma lista unificada)
- 📄 **Adjuntar documentos** (PDF, JPG)
- 🔐 **Login de administrador**: `admin@cobreros.es` / `admin123`

### **App Móvil (Usuarios):**
- 🏘️ **Seleccionar pueblos de interés** (misma lista unificada)
- 📱 **Recibir notificaciones** filtradas por pueblos seleccionados
- 🔔 **Notificaciones push** en tiempo real

## 🔧 **Configuración Técnica**

### **Estructura de Datos:**
```javascript
// Pueblos unificados (mismo formato en web y app)
const pueblos = [
    "Cobreros", "Avedillo de Sanabria", "Barrio de Lomba", 
    "Castro de Sanabria", "Limianos", "Quintana de Sanabria",
    "Riego de Lomba", "San Martín del Terroso", "San Miguel de Lomba",
    "San Román de Sanabria", "Santa Colomba", "Sotillo", "Terroso"
];
```

### **Filtrado de Notificaciones:**
- **Notificaciones generales**: Se muestran a todos los usuarios
- **Notificaciones por pueblo**: Solo se muestran a usuarios que han seleccionado ese pueblo
- **Sincronización**: Las preferencias se guardan en localStorage y Firestore

## 🚀 **Beneficios de la Unificación**

1. **✅ Consistencia**: Misma lista de pueblos en web y app
2. **✅ Precisión**: Nombres exactos de todos los pueblos del ayuntamiento
3. **✅ Funcionalidad**: Filtrado correcto de notificaciones por pueblo
4. **✅ Mantenimiento**: Una sola fuente de verdad para los pueblos
5. **✅ Experiencia**: Los usuarios ven los mismos pueblos en ambos sistemas

## 📱 **Uso del Sistema**

### **Para Administradores:**
1. **Web**: Acceder al panel de administración → Pestaña "Notificaciones"
2. **App Móvil**: Tocar botón (+) → Login admin → Enviar notificación
3. **Seleccionar pueblos**: Elegir pueblos específicos o "Todos los usuarios"

### **Para Usuarios:**
1. **Descargar app móvil** desde la web
2. **Seleccionar pueblos** de interés en el selector
3. **Recibir notificaciones** filtradas por pueblos seleccionados

## 🔄 **Sincronización**

- **Web → App**: Las notificaciones enviadas desde web llegan a la app
- **App → Web**: Las notificaciones enviadas desde app se guardan en Firestore
- **Pueblos**: Lista unificada garantiza compatibilidad total

---

**✅ Sistema completamente unificado y funcional para notificaciones por pueblos específicos.**

