# 🔄 Sistema de Persistencia Completo - Ayuntamiento de Cobreros

## 📋 Resumen del Sistema

El sistema del Ayuntamiento de Cobreros está diseñado para ser **completamente persistente** y **sincronizado** entre la web y la app móvil, con notificaciones que funcionan desde todos los puntos de acceso.

## 🏗️ Arquitectura del Sistema

### **🌐 Web Principal (www.ayuntamientocobreros.com)**
- **Panel de Administrador**: Envío de notificaciones
- **Gestión de Contenido**: Bandos, noticias, eventos
- **Sistema de Usuarios**: Registro y autenticación
- **Backup Automático**: A Firestore cada 5 minutos

### **📱 App Móvil (notification-app)**
- **Solo Notificaciones**: Interfaz minimalista
- **Panel Admin Móvil**: Envío desde el móvil
- **Sincronización**: Con Firestore cada 3 minutos
- **PWA**: Instalable en iOS/Android

### **☁️ Firebase Backend**
- **Firestore**: Base de datos principal
- **Cloud Functions**: Notificaciones push
- **Cloud Messaging**: FCM para push notifications
- **Storage**: Documentos adjuntos

## 🔄 Flujo de Persistencia

### **1. Datos Locales (localStorage)**
```javascript
// Datos que se guardan localmente
- users: Usuarios registrados
- bandos: Bandos municipales
- news: Noticias del ayuntamiento
- events: Eventos culturales/deportivos
- administrators: Administradores creados
- documents: Documentos subidos
- appointments: Citas previas
- publicNotifications: Notificaciones públicas
```

### **2. Sincronización con Firestore**
```javascript
// Colecciones en Firestore
- users: Usuarios con FCM tokens
- bandos: Bandos sincronizados
- noticias: Noticias sincronizadas
- eventos: Eventos sincronizados
- notifications: Notificaciones para app móvil
- configuraciones: Configuraciones del sistema
- backups: Copias de seguridad automáticas
```

### **3. Backup Automático**
- **Web**: Cada 5 minutos + al cerrar
- **App Móvil**: Cada 3 minutos + al cerrar
- **Cloud Functions**: Backup programado cada 6 horas
- **Limpieza**: Eliminación de backups antiguos semanal

## 📱 Sistema de Notificaciones

### **Puntos de Envío**
1. **Panel Admin Web**: `enviarNotificacionPushConLocalidades()`
2. **App Móvil**: `sendNotification()` con pueblos objetivo
3. **Automático**: Al crear bandos/noticias

### **Flujo de Notificaciones**
```
1. Usuario/Admin envía notificación
2. Se guarda en Firestore (colección 'notifications')
3. Se envía push via FCM a usuarios registrados
4. App móvil recibe y muestra notificación
5. Se sincroniza estado de lectura
```

### **Tipos de Notificación**
- 📄 **Bando Municipal**: Bandos oficiales
- 📢 **Noticia**: Noticias del ayuntamiento
- 🎭 **Evento**: Eventos culturales/deportivos
- 🚨 **Urgente**: Comunicaciones urgentes
- 📋 **General**: Otras comunicaciones

## 🔧 Funciones de Persistencia

### **Web Principal**
```javascript
// Funciones principales
- ensureCompletePersistence(): Verificación completa
- syncLocalDataToFirestore(): Sincronización con Firestore
- setupAutomaticSync(): Sincronización automática
- migrateUsersToFirestore(): Migración de usuarios
- backupContentToFirestore(): Backup de contenido
- verifyDataIntegrity(): Verificación de integridad
- repairCorruptedData(): Reparación de datos
```

### **App Móvil**
```javascript
// Funciones principales
- ensureMobilePersistence(): Verificación móvil
- syncMobileDataToFirestore(): Sincronización móvil
- setupMobileAutomaticSync(): Sincronización automática móvil
- verifyMobileDataIntegrity(): Verificación móvil
- repairMobileData(): Reparación móvil
```

## 🛡️ Verificación de Integridad

### **Datos Verificados**
- ✅ **Bandos**: Array válido con estructura correcta
- ✅ **Noticias**: Array válido con estructura correcta
- ✅ **Usuarios**: Array válido con datos completos
- ✅ **Eventos**: Array válido con fechas válidas
- ✅ **Configuraciones**: JSON válido en localStorage

### **Reparación Automática**
- 🔧 **Arrays corruptos**: Reinicialización a array vacío
- 🔧 **JSON inválido**: Restauración a valores por defecto
- 🔧 **Datos faltantes**: Migración desde Firestore
- 🔧 **Configuraciones**: Restauración de configuración base

## 📊 Monitoreo del Sistema

### **Logs de Consola**
```javascript
// Logs importantes
✅ "Persistencia completa verificada"
✅ "Bandos sincronizados con Firestore"
✅ "Notificación guardada para app móvil"
✅ "Integridad de datos verificada correctamente"
⚠️ "Problemas de integridad detectados"
❌ "Error en persistencia completa"
```

### **Estados del Sistema**
- 🟢 **Verde**: Todo funcionando correctamente
- 🟡 **Amarillo**: Problemas menores detectados
- 🔴 **Rojo**: Errores críticos que requieren atención

## 🔄 Sincronización Automática

### **Web Principal**
- **Intervalo**: Cada 5 minutos
- **Eventos**: Al cerrar ventana, al cambiar datos
- **Datos**: Bandos, noticias, eventos, configuraciones

### **App Móvil**
- **Intervalo**: Cada 3 minutos
- **Eventos**: Al cerrar app, al reactivar, al cambiar datos
- **Datos**: Notificaciones leídas, preferencias, estado

### **Cloud Functions**
- **Backup**: Cada 6 horas
- **Limpieza**: Semanal (backups > 30 días)
- **Estadísticas**: Disponibles via API

## 🚀 Características Avanzadas

### **Migración Automática**
- **Usuarios**: Migración automática de localStorage a Firestore
- **Datos**: Sincronización bidireccional
- **Configuraciones**: Preservación de preferencias

### **Recuperación de Datos**
- **Backup Local**: Exportación JSON completa
- **Backup Cloud**: Restauración desde Firestore
- **Verificación**: Integridad antes de restaurar

### **Optimización**
- **Lazy Loading**: Carga bajo demanda
- **Caching**: Datos frecuentemente accedidos
- **Compresión**: Datos optimizados para móvil

## 📱 Compatibilidad

### **Dispositivos Soportados**
- 🖥️ **Desktop**: Chrome, Firefox, Safari, Edge
- 📱 **Móvil**: iOS Safari, Android Chrome
- 📱 **PWA**: Instalable en todos los dispositivos

### **Navegadores**
- ✅ **Chrome**: Soporte completo
- ✅ **Firefox**: Soporte completo
- ✅ **Safari**: Soporte completo (iOS)
- ✅ **Edge**: Soporte completo

## 🔐 Seguridad

### **Autenticación**
- **Usuarios**: Email/password con validación
- **Administradores**: Acceso restringido
- **Super Admin**: Acceso oculto (TURISTEAM)

### **Datos**
- **Encriptación**: Datos sensibles encriptados
- **Validación**: Verificación de integridad
- **Backup**: Copias de seguridad seguras

---

## ✅ Estado del Sistema

**🟢 SISTEMA COMPLETAMENTE FUNCIONAL**

- ✅ Persistencia completa implementada
- ✅ Sincronización automática activa
- ✅ Notificaciones funcionando desde todos los puntos
- ✅ Verificación de integridad automática
- ✅ Backup y recuperación implementados
- ✅ Compatibilidad multi-dispositivo
- ✅ Seguridad y validación implementadas

**El sistema está listo para producción y garantiza que todos los datos sean persistentes y sincronizados entre la web y la app móvil.**



