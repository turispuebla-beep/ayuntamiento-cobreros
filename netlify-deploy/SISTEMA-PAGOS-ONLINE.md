# 💳 Sistema de Pagos Online - Documentación

## 📋 Resumen

El sistema de pagos online permite al administrador **decidir qué servicios, tasas o multas se pueden pagar online**. Es completamente configurable y está preparado para integrarse con una pasarela de pago en el futuro.

---

## 🎯 ¿Cómo Decidir Qué se Puede Pagar?

### **Respuesta: El Administrador Decide Todo**

El sistema está diseñado para que **el administrador tenga control total** sobre qué se puede pagar online:

1. **Crear servicios pagables** desde el panel de administración
2. **Activar/desactivar** cada servicio individualmente
3. **Configurar importes, descripciones y requisitos** para cada servicio
4. **Habilitar/deshabilitar** el módulo completo

---

## ⚙️ Configuración del Sistema

### **1. Habilitar el Módulo**

**Panel Admin → Pagos Online → Configuración del Sistema de Pagos**

- ✅ **Habilitar módulo de Pagos Online**: Activa/desactiva la sección pública
- 🔌 **Pasarela de Pago**: Selecciona la pasarela que se usará (Stripe, PayPal, Redsys, etc.)
- 🧪 **Modo de prueba**: Activa modo de prueba (muestra avisos, no procesa pagos reales)

### **2. Crear Servicios Pagables**

**Panel Admin → Pagos Online → Servicios Pagables → Nuevo Servicio Pagable**

Para cada servicio puedes configurar:

- **Nombre del servicio**: Ej: "Tasa de Basura", "Multa de Tráfico", "Licencia de Obras"
- **Categoría**: Tasas Municipales, Multas, Licencias, Servicios, Otros
- **Importe**: Cantidad en euros
- **Descripción**: Información sobre el servicio
- **Requisitos**: Lista de documentos o requisitos necesarios
- **Orden de visualización**: Orden en que aparecerá en la lista
- **Días de validez**: Cuántos días es válido el pago
- **URL del documento**: Enlace a PDF con más información
- **Servicio activo**: Mostrar/ocultar en la web pública
- **Requiere inicio de sesión**: Si el usuario debe estar logueado
- **Solicitar datos del usuario**: Si se piden datos adicionales en el formulario

---

## 💡 Ejemplos de Servicios Pagables

### **Tasas Municipales**
- Tasa de Basura
- Tasa de Agua
- IBI (Impuesto sobre Bienes Inmuebles)
- Licencia de Obras
- Licencia de Actividad

### **Multas**
- Multas de Tráfico
- Multas de Ordenanza Municipal
- Sanciones Administrativas

### **Servicios**
- Certificados
- Copias de documentos
- Inscripciones a actividades

### **Otros**
- Donaciones
- Contribuciones voluntarias

---

## 🔧 Cómo Funciona

### **Para el Administrador:**

1. **Ir a Panel Admin → Pagos Online**
2. **Habilitar el módulo** (si quiere que sea visible)
3. **Crear servicios pagables** con la información necesaria
4. **Activar/desactivar** cada servicio según necesidad
5. **Configurar la pasarela de pago** cuando esté lista

### **Para el Ciudadano:**

1. **Ver servicios disponibles** en la sección "Pagos Online"
2. **Seleccionar el servicio** que quiere pagar
3. **Ver información** (importe, requisitos, descripción)
4. **Hacer clic en "Pagar Ahora"**
5. **Completar formulario** (si se requiere)
6. **Procesar pago** (cuando esté integrada la pasarela)

---

## 🚀 Integración Futura con Pasarela de Pago

### **Estado Actual:**
- ✅ Sistema de gestión completo
- ✅ Interfaz pública preparada
- ✅ Configuración de servicios
- ⚠️ **Integración con pasarela pendiente**

### **Para Integrar una Pasarela:**

1. **Contratar pasarela** (Stripe, PayPal, Redsys, etc.)
2. **Obtener credenciales** (claves API públicas y privadas)
3. **Configurar credenciales** en el sistema (futuro)
4. **Implementar función `processPayment`** en `js/online-payments.js`
5. **Probar en modo sandbox** antes de producción

### **Ejemplo de Integración (Futuro):**

```javascript
// En js/online-payments.js, función processPayment
async function processPayment(e, serviceId) {
    e.preventDefault();
    
    // Obtener datos del formulario
    const formData = new FormData(e.target);
    
    // Crear sesión de pago con Stripe (ejemplo)
    const response = await fetch('/api/create-payment-session', {
        method: 'POST',
        body: JSON.stringify({
            serviceId: serviceId,
            amount: service.amount,
            // ... otros datos
        })
    });
    
    // Redirigir a pasarela de pago
    const { sessionId } = await response.json();
    window.location.href = `https://checkout.stripe.com/pay/${sessionId}`;
}
```

---

## 📊 Ventajas del Sistema

### **1. Control Total**
- El administrador decide qué se puede pagar
- Puede activar/desactivar servicios sin afectar otros
- Configuración flexible por servicio

### **2. Preparado para el Futuro**
- Estructura lista para integrar cualquier pasarela
- No requiere cambios en la base de datos
- Fácil de extender

### **3. Seguro**
- Validaciones en frontend y backend
- Modo de prueba para testing
- Requisitos configurables por servicio

### **4. Flexible**
- Diferentes categorías de servicios
- Requisitos personalizables
- Validez configurable

---

## 🎯 Respuesta a tu Pregunta

**"¿Cómo decidir lo que se puede pagar o no?"**

**Respuesta:** El administrador tiene **control completo** a través del panel de administración:

1. **Crea servicios pagables** con toda la información necesaria
2. **Activa/desactiva** cada servicio individualmente con un checkbox
3. **Habilita/deshabilita** el módulo completo si no quiere que aparezca
4. **Configura requisitos** específicos para cada servicio

**No hay límites técnicos** - el administrador decide todo según las necesidades del ayuntamiento.

---

## 📝 Notas Importantes

- ⚠️ **Por ahora, los pagos no se procesan realmente** - solo se muestra la interfaz
- ✅ **El sistema está listo** para integrar cualquier pasarela de pago
- 🔒 **Se requiere integración** con pasarela para procesar pagos reales
- 📋 **Todos los servicios** se gestionan desde el panel de administración

---

**Última actualización:** Diciembre 2025

