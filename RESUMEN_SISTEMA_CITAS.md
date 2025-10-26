# 📅 Sistema Completo de Citas Previas - Ayuntamiento de Cobreros

## 🎯 **RESPUESTA A TU PREGUNTA:**

### **📍 Dónde está configurado el calendario:**
- **Archivo:** `js/script.js` (líneas 14079-14090)
- **Variable:** `appointmentSchedule`
- **Configuración actual:**
  - Días laborales: Lunes a Viernes
  - Horario mañana: 09:00 - 14:00
  - Horario tarde: 16:00 - 18:00
  - Duración citas: 30 minutos
  - Máximo por día: 20 citas

### **📧 Dónde está configurado el email:**
- **Email del ayuntamiento:** `aytocobrero@gmail.com`
- **Configuración:** `js/script.js` (línea 14089)
- **Firebase Functions:** `functions/src/index.ts`

## ✅ **SÍ, los emails van al ayuntamiento:**

### **📨 Sistema de Notificaciones Doble:**

1. **Email al Usuario** (Confirmación):
   - ✅ Recibe confirmación de su solicitud
   - ✅ Detalles de la cita solicitada
   - ✅ Información de contacto

2. **Email al Ayuntamiento** (Notificación):
   - ✅ **QUIÉN:** Nombre, DNI, email, teléfono
   - ✅ **CUÁNDO:** Fecha y hora solicitada
   - ✅ **QUÉ:** Servicio específico y comentarios
   - ✅ **ID de cita** para seguimiento
   - ✅ **Fecha de solicitud** para priorización

## 🔧 **Configuración Actual:**

### **Horarios del Ayuntamiento:**
```javascript
workingDays: ['lunes', 'martes', 'miércoles', 'jueves', 'viernes']
workingHours: {
    morning: { start: '09:00', end: '14:00' },
    afternoon: { start: '16:00', end: '18:00' }
}
timeSlots: 30, // minutos por cita
maxAppointmentsPerDay: 20
```

### **Email del Ayuntamiento:**
```javascript
adminEmail: 'aytocobrero@gmail.com'
```

## 📧 **Templates de Email Implementados:**

### **1. Confirmación al Usuario:**
- Diseño profesional con logo del ayuntamiento
- Detalles completos de la cita
- Información de contacto
- Branding consistente

### **2. Notificación al Ayuntamiento:**
- **🚨 ALERTA:** "NUEVA SOLICITUD DE CITA PREVIA"
- **👤 Datos completos del solicitante**
- **📅 Detalles de la cita solicitada**
- **⚠️ Acción requerida:** Confirmar disponibilidad
- **📋 Próximos pasos** claramente definidos

## 🚀 **Para Activar el Sistema:**

### **1. Configurar Gmail:**
```bash
# Generar App Password en aytocobrero@gmail.com
firebase functions:config:set gmail.password="tu_app_password"
```

### **2. Desplegar Firebase:**
```bash
cd functions
npm install
firebase deploy --only functions
```

## 📊 **Flujo Completo:**

1. **Usuario solicita cita** → Formulario web
2. **Sistema valida horarios** → Calendario dinámico
3. **Se guarda la cita** → Base de datos local
4. **Firebase envía 2 emails:**
   - ✅ **Al usuario:** Confirmación
   - ✅ **Al ayuntamiento:** Notificación completa
5. **Ayuntamiento recibe:**
   - Quién solicita la cita
   - Cuándo la quiere
   - Qué servicio necesita
   - Cómo contactarle

## 🎯 **Ventajas del Sistema:**

✅ **Notificación inmediata** al ayuntamiento
✅ **Datos completos** del solicitante
✅ **Horarios editables** desde administración
✅ **Templates profesionales** HTML
✅ **Sistema robusto** con fallbacks
✅ **Logs detallados** para seguimiento

## 📱 **Ubicación de Archivos:**

- **Configuración calendario:** `js/script.js` (líneas 14079-14090)
- **Configuración email:** `js/script.js` (línea 14089)
- **Firebase Functions:** `functions/src/index.ts`
- **Templates email:** `functions/src/index.ts` (líneas 80-282)
- **Instrucciones:** `FIREBASE_SETUP.md`

**¡El sistema está completamente configurado y listo para usar!** 🎉



## 🎯 **RESPUESTA A TU PREGUNTA:**

### **📍 Dónde está configurado el calendario:**
- **Archivo:** `js/script.js` (líneas 14079-14090)
- **Variable:** `appointmentSchedule`
- **Configuración actual:**
  - Días laborales: Lunes a Viernes
  - Horario mañana: 09:00 - 14:00
  - Horario tarde: 16:00 - 18:00
  - Duración citas: 30 minutos
  - Máximo por día: 20 citas

### **📧 Dónde está configurado el email:**
- **Email del ayuntamiento:** `aytocobrero@gmail.com`
- **Configuración:** `js/script.js` (línea 14089)
- **Firebase Functions:** `functions/src/index.ts`

## ✅ **SÍ, los emails van al ayuntamiento:**

### **📨 Sistema de Notificaciones Doble:**

1. **Email al Usuario** (Confirmación):
   - ✅ Recibe confirmación de su solicitud
   - ✅ Detalles de la cita solicitada
   - ✅ Información de contacto

2. **Email al Ayuntamiento** (Notificación):
   - ✅ **QUIÉN:** Nombre, DNI, email, teléfono
   - ✅ **CUÁNDO:** Fecha y hora solicitada
   - ✅ **QUÉ:** Servicio específico y comentarios
   - ✅ **ID de cita** para seguimiento
   - ✅ **Fecha de solicitud** para priorización

## 🔧 **Configuración Actual:**

### **Horarios del Ayuntamiento:**
```javascript
workingDays: ['lunes', 'martes', 'miércoles', 'jueves', 'viernes']
workingHours: {
    morning: { start: '09:00', end: '14:00' },
    afternoon: { start: '16:00', end: '18:00' }
}
timeSlots: 30, // minutos por cita
maxAppointmentsPerDay: 20
```

### **Email del Ayuntamiento:**
```javascript
adminEmail: 'aytocobrero@gmail.com'
```

## 📧 **Templates de Email Implementados:**

### **1. Confirmación al Usuario:**
- Diseño profesional con logo del ayuntamiento
- Detalles completos de la cita
- Información de contacto
- Branding consistente

### **2. Notificación al Ayuntamiento:**
- **🚨 ALERTA:** "NUEVA SOLICITUD DE CITA PREVIA"
- **👤 Datos completos del solicitante**
- **📅 Detalles de la cita solicitada**
- **⚠️ Acción requerida:** Confirmar disponibilidad
- **📋 Próximos pasos** claramente definidos

## 🚀 **Para Activar el Sistema:**

### **1. Configurar Gmail:**
```bash
# Generar App Password en aytocobrero@gmail.com
firebase functions:config:set gmail.password="tu_app_password"
```

### **2. Desplegar Firebase:**
```bash
cd functions
npm install
firebase deploy --only functions
```

## 📊 **Flujo Completo:**

1. **Usuario solicita cita** → Formulario web
2. **Sistema valida horarios** → Calendario dinámico
3. **Se guarda la cita** → Base de datos local
4. **Firebase envía 2 emails:**
   - ✅ **Al usuario:** Confirmación
   - ✅ **Al ayuntamiento:** Notificación completa
5. **Ayuntamiento recibe:**
   - Quién solicita la cita
   - Cuándo la quiere
   - Qué servicio necesita
   - Cómo contactarle

## 🎯 **Ventajas del Sistema:**

✅ **Notificación inmediata** al ayuntamiento
✅ **Datos completos** del solicitante
✅ **Horarios editables** desde administración
✅ **Templates profesionales** HTML
✅ **Sistema robusto** con fallbacks
✅ **Logs detallados** para seguimiento

## 📱 **Ubicación de Archivos:**

- **Configuración calendario:** `js/script.js` (líneas 14079-14090)
- **Configuración email:** `js/script.js` (línea 14089)
- **Firebase Functions:** `functions/src/index.ts`
- **Templates email:** `functions/src/index.ts` (líneas 80-282)
- **Instrucciones:** `FIREBASE_SETUP.md`

**¡El sistema está completamente configurado y listo para usar!** 🎉

