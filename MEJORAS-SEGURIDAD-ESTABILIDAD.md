# 🔒 Mejoras de Seguridad y Estabilidad de Datos

## 📋 Resumen Ejecutivo

Este documento detalla mejoras de seguridad y estabilidad de datos que se pueden implementar **sin modificar Firebase Functions**, enfocándose en el frontend y las reglas de seguridad de Firestore.

---

## 🎯 Áreas de Mejora Identificadas

### 1. 🔐 **Reglas de Seguridad de Firestore**
**Problema:** Actualmente no hay reglas de seguridad o están muy permisivas (`allow read, write: if true`)

**Impacto:** Cualquier usuario puede leer/escribir datos directamente desde el cliente

**Solución:** Implementar reglas de seguridad estrictas basadas en autenticación y roles

---

### 2. ✅ **Validación de Datos Robusta**
**Problema:** Los datos se guardan en Firestore sin validación estricta de estructura y tipos

**Impacto:** Datos inconsistentes, errores en tiempo de ejecución, problemas de integridad

**Solución:** Validar estructura, tipos y valores antes de guardar

---

### 3. 🛡️ **Sanitización Completa de Datos**
**Problema:** Aunque existe `escapeHtml`, no se aplica consistentemente en todos los puntos de entrada

**Impacto:** Vulnerabilidades XSS, inyección de código malicioso

**Solución:** Sanitizar todos los inputs del usuario antes de guardar y renderizar

---

### 4. 🔄 **Manejo de Errores Robusto**
**Problema:** Algunos errores se silencian o no se manejan adecuadamente

**Impacto:** Pérdida de datos, inconsistencias, difícil depuración

**Solución:** Implementar manejo de errores con reintentos, logging y notificaciones

---

### 5. 💾 **Gestión Segura de localStorage**
**Problema:** No hay límites de tamaño, validación de datos corruptos, ni manejo de cuota excedida

**Impacto:** Pérdida de datos, errores de rendimiento, aplicación bloqueada

**Solución:** Implementar límites, validación y fallback a Firestore

---

### 6. 🚦 **Rate Limiting en Operaciones Críticas**
**Problema:** No hay límites en operaciones como registro, envío de notificaciones, etc.

**Impacto:** Abuso del sistema, sobrecarga, posibles ataques

**Solución:** Implementar rate limiting en el cliente con debouncing y throttling

---

### 7. 🔍 **Validación de Integridad de Datos**
**Problema:** No se verifica la integridad de los datos antes de usarlos

**Impacto:** Errores en tiempo de ejecución, datos corruptos, aplicación inestable

**Solución:** Validar estructura y tipos antes de usar datos

---

### 8. 📊 **Transacciones para Operaciones Críticas**
**Problema:** Operaciones que modifican múltiples documentos no son atómicas

**Impacto:** Inconsistencias de datos, condiciones de carrera

**Solución:** Usar transacciones de Firestore para operaciones críticas

---

## 🚀 Implementaciones Propuestas

### 1. Reglas de Seguridad de Firestore

**Archivo:** `firestore.rules`

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Función auxiliar para verificar autenticación
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Función para verificar si es administrador
    function isAdmin() {
      return isAuthenticated() && 
             exists(/databases/$(database)/documents/admins/$(request.auth.uid));
    }
    
    // Función para verificar si es super admin
    function isSuperAdmin() {
      return isAuthenticated() && 
             get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.isSuperAdmin == true;
    }
    
    // Colección de usuarios
    match /users/{userId} {
      // Los usuarios solo pueden leer/escribir sus propios datos
      allow read: if isAuthenticated() && (request.auth.uid == userId || isAdmin());
      allow create: if isAuthenticated() && request.auth.uid == userId;
      allow update: if isAuthenticated() && (request.auth.uid == userId || isAdmin());
      allow delete: if isAdmin();
    }
    
    // Colección de administradores
    match /admins/{adminId} {
      allow read: if isAdmin();
      allow write: if isSuperAdmin();
    }
    
    // Colección de notificaciones
    match /notifications/{notificationId} {
      allow read: if isAuthenticated();
      allow create: if isAdmin();
      allow update, delete: if isAdmin();
    }
    
    // Colección de noticias
    match /news/{newsId} {
      allow read: if true; // Público
      allow write: if isAdmin();
    }
    
    // Colección de bandos
    match /bandos/{bandoId} {
      allow read: if true; // Público
      allow write: if isAdmin();
    }
    
    // Colección de eventos
    match /events/{eventId} {
      allow read: if true; // Público
      allow write: if isAdmin();
    }
    
    // Colección de documentos
    match /documents/{documentId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }
    
    // Colección de citas previas
    match /appointments/{appointmentId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update, delete: if isAdmin();
    }
  }
}
```

---

### 2. Validación de Datos Robusta

**Archivo:** `js/data-validators.js` (nuevo)

```javascript
// Esquemas de validación para cada tipo de dato
const DATA_SCHEMAS = {
  user: {
    required: ['email', 'nombre', 'surname1', 'phone', 'address', 'city', 'postalCode'],
    types: {
      email: 'string',
      nombre: 'string',
      surname1: 'string',
      surname2: 'string',
      phone: 'string',
      address: 'string',
      city: 'string',
      postalCode: 'string',
      documentType: 'string',
      documentNumber: 'string',
      notificationConsent: 'boolean',
      localities: 'array',
      fcmToken: 'string'
    },
    validators: {
      email: (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
      postalCode: (val) => /^[0-9]{5}$/.test(val),
      phone: (val) => /^[0-9]{9}$/.test(val.replace(/\s/g, '')),
      localities: (val) => Array.isArray(val) && val.length > 0
    }
  },
  
  notification: {
    required: ['title', 'message', 'type'],
    types: {
      title: 'string',
      message: 'string',
      type: 'string',
      localities: 'array',
      timestamp: 'object'
    },
    validators: {
      type: (val) => ['general', 'urgent', 'event', 'cita', 'bando', 'incidencia'].includes(val)
    }
  },
  
  news: {
    required: ['title', 'content'],
    types: {
      title: 'string',
      content: 'string',
      image: 'string',
      createdAt: 'object'
    }
  }
};

// Función principal de validación
function validateData(data, schemaName) {
  const schema = DATA_SCHEMAS[schemaName];
  if (!schema) {
    throw new Error(`Schema ${schemaName} no encontrado`);
  }
  
  const errors = [];
  
  // Validar campos requeridos
  for (const field of schema.required) {
    if (!(field in data) || data[field] === null || data[field] === undefined) {
      errors.push(`Campo requerido faltante: ${field}`);
    }
  }
  
  // Validar tipos
  for (const [field, expectedType] of Object.entries(schema.types)) {
    if (field in data && data[field] !== null && data[field] !== undefined) {
      const actualType = Array.isArray(data[field]) ? 'array' : typeof data[field];
      if (actualType !== expectedType) {
        errors.push(`Tipo incorrecto en ${field}: esperado ${expectedType}, obtenido ${actualType}`);
      }
    }
  }
  
  // Validar con validadores personalizados
  if (schema.validators) {
    for (const [field, validator] of Object.entries(schema.validators)) {
      if (field in data && data[field] !== null && data[field] !== undefined) {
        if (!validator(data[field])) {
          errors.push(`Validación fallida en ${field}`);
        }
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// Función para sanitizar datos antes de guardar
function sanitizeData(data, schemaName) {
  const schema = DATA_SCHEMAS[schemaName];
  if (!schema) return data;
  
  const sanitized = { ...data };
  
  // Sanitizar strings
  for (const [field, type] of Object.entries(schema.types)) {
    if (type === 'string' && field in sanitized) {
      sanitized[field] = escapeHtml(String(sanitized[field])).trim();
    }
  }
  
  return sanitized;
}
```

---

### 3. Manejo de Errores Robusto

**Archivo:** `js/error-handler.js` (nuevo)

```javascript
// Configuración de reintentos
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1 segundo
  maxDelay: 10000 // 10 segundos
};

// Función de espera exponencial
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Función con reintentos automáticos
async function withRetry(fn, context = 'operación', maxRetries = RETRY_CONFIG.maxRetries) {
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // No reintentar en ciertos errores
      if (error.code === 'permission-denied' || 
          error.code === 'invalid-argument' ||
          error.code === 'unauthenticated') {
        throw error;
      }
      
      if (attempt < maxRetries) {
        const delayMs = Math.min(
          RETRY_CONFIG.baseDelay * Math.pow(2, attempt),
          RETRY_CONFIG.maxDelay
        );
        console.warn(`⚠️ Reintentando ${context} (intento ${attempt + 1}/${maxRetries})...`);
        await delay(delayMs);
      }
    }
  }
  
  console.error(`❌ Error en ${context} después de ${maxRetries} intentos:`, lastError);
  throw lastError;
}

// Función para guardar en Firestore con validación y reintentos
async function safeFirestoreWrite(collection, data, schemaName) {
  // Validar datos
  const validation = validateData(data, schemaName);
  if (!validation.valid) {
    throw new Error(`Datos inválidos: ${validation.errors.join(', ')}`);
  }
  
  // Sanitizar datos
  const sanitized = sanitizeData(data, schemaName);
  
  // Guardar con reintentos
  return await withRetry(async () => {
    return await window.firebase.firestore().collection(collection).add(sanitized);
  }, `guardar en ${collection}`);
}
```

---

### 4. Gestión Segura de localStorage

**Archivo:** `js/storage-manager.js` (nuevo)

```javascript
// Límites de tamaño (en bytes)
const STORAGE_LIMITS = {
  maxItemSize: 5 * 1024 * 1024, // 5MB por item
  maxTotalSize: 10 * 1024 * 1024 // 10MB total
};

// Función para obtener tamaño de un objeto
function getObjectSize(obj) {
  return new Blob([JSON.stringify(obj)]).size;
}

// Función para obtener tamaño total de localStorage
function getTotalStorageSize() {
  let total = 0;
  for (let key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      total += localStorage[key].length + key.length;
    }
  }
  return total;
}

// Función segura para guardar en localStorage
function safeLocalStorageSet(key, value) {
  try {
    const size = getObjectSize(value);
    
    // Verificar límite por item
    if (size > STORAGE_LIMITS.maxItemSize) {
      throw new Error(`Item demasiado grande: ${(size / 1024 / 1024).toFixed(2)}MB`);
    }
    
    // Verificar límite total
    const currentTotal = getTotalStorageSize();
    if (currentTotal + size > STORAGE_LIMITS.maxTotalSize) {
      // Limpiar items antiguos
      cleanupOldStorageItems();
    }
    
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    if (error.name === 'QuotaExceededError') {
      console.warn('⚠️ Cuota de almacenamiento excedida, limpiando...');
      cleanupOldStorageItems();
      // Reintentar una vez
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (retryError) {
        console.error('❌ Error al guardar en localStorage:', retryError);
        return false;
      }
    }
    console.error('❌ Error al guardar en localStorage:', error);
    return false;
  }
}

// Función segura para leer de localStorage
function safeLocalStorageGet(key, defaultValue = null) {
  try {
    const item = localStorage.getItem(key);
    if (!item) return defaultValue;
    
    const parsed = JSON.parse(item);
    
    // Validar que el parse fue exitoso
    if (parsed === null && item !== 'null') {
      throw new Error('Datos corruptos');
    }
    
    return parsed;
  } catch (error) {
    console.error(`❌ Error al leer ${key} de localStorage:`, error);
    // Limpiar item corrupto
    localStorage.removeItem(key);
    return defaultValue;
  }
}

// Función para limpiar items antiguos
function cleanupOldStorageItems() {
  const itemsToClean = ['oldNotifications', 'tempData', 'cache'];
  itemsToClean.forEach(key => {
    if (localStorage.getItem(key)) {
      localStorage.removeItem(key);
    }
  });
}
```

---

### 5. Rate Limiting

**Archivo:** `js/rate-limiter.js` (nuevo)

```javascript
// Configuración de rate limiting
const RATE_LIMITS = {
  register: { max: 3, window: 60000 }, // 3 registros por minuto
  sendNotification: { max: 10, window: 60000 }, // 10 notificaciones por minuto
  saveData: { max: 20, window: 60000 } // 20 guardados por minuto
};

// Almacenamiento de intentos
const rateLimitStore = {};

// Función para verificar rate limit
function checkRateLimit(operation) {
  const limit = RATE_LIMITS[operation];
  if (!limit) return true; // Sin límite si no está configurado
  
  const now = Date.now();
  const key = `rate_limit_${operation}`;
  
  if (!rateLimitStore[key]) {
    rateLimitStore[key] = [];
  }
  
  const attempts = rateLimitStore[key];
  
  // Limpiar intentos antiguos
  const recentAttempts = attempts.filter(time => now - time < limit.window);
  rateLimitStore[key] = recentAttempts;
  
  // Verificar límite
  if (recentAttempts.length >= limit.max) {
    const waitTime = limit.window - (now - recentAttempts[0]);
    throw new Error(`Rate limit excedido. Intente de nuevo en ${Math.ceil(waitTime / 1000)} segundos`);
  }
  
  // Registrar intento
  recentAttempts.push(now);
  return true;
}

// Función wrapper para rate limiting
function withRateLimit(operation, fn) {
  return async (...args) => {
    checkRateLimit(operation);
    return await fn(...args);
  };
}
```

---

## 📝 Implementación en el Código Existente

### Modificar `syncUserToFirestore`:

```javascript
async function syncUserToFirestore(userData) {
  try {
    // Validar datos
    const validation = validateData(userData, 'user');
    if (!validation.valid) {
      console.error('❌ Datos de usuario inválidos:', validation.errors);
      return;
    }
    
    // Sanitizar datos
    const sanitized = sanitizeData(userData, 'user');
    
    // Guardar con reintentos
    await safeFirestoreWrite('users', sanitized, 'user');
    console.log('✅ Usuario sincronizado con Firestore');
  } catch (error) {
    console.error('Error sincronizando usuario:', error);
    // Guardar en localStorage como fallback
    safeLocalStorageSet('users', [...users, userData]);
  }
}
```

---

## ✅ Checklist de Implementación

- [x] Crear archivo `firestore.rules` con reglas de seguridad
- [ ] Desplegar reglas de seguridad: `firebase deploy --only firestore:rules`
- [x] Crear `js/data-validators.js` con validaciones
- [x] Crear `js/error-handler.js` con manejo de errores
- [x] Crear `js/storage-manager.js` para localStorage seguro
- [x] Crear `js/rate-limiter.js` para rate limiting
- [x] Modificar funciones existentes para usar nuevas utilidades
- [x] Agregar módulos al `index.html`
- [ ] Probar validaciones con datos inválidos
- [ ] Probar manejo de errores con conexión intermitente
- [ ] Probar rate limiting con múltiples intentos
- [ ] Verificar que localStorage maneja cuota excedida

---

## 🚀 Instrucciones de Despliegue

### 1. Desplegar Reglas de Seguridad de Firestore

```bash
# Desde la raíz del proyecto
firebase deploy --only firestore:rules
```

**Importante:** Las reglas de seguridad son críticas. Asegúrate de:
- Probar en modo de prueba primero si es posible
- Verificar que los administradores existentes pueden acceder
- Tener un plan de rollback si algo falla

### 2. Verificar que los Módulos se Carguen Correctamente

1. Abre la consola del navegador (F12)
2. Verifica que no hay errores de carga de scripts
3. Verifica que las funciones están disponibles:
   ```javascript
   console.log(typeof validateData); // debe ser "function"
   console.log(typeof safeFirestoreWrite); // debe ser "function"
   console.log(typeof safeLocalStorageSet); // debe ser "function"
   console.log(typeof checkRateLimit); // debe ser "function"
   ```

### 3. Probar Funcionalidades

#### Probar Validación de Datos:
```javascript
// En consola del navegador
const testUser = { email: 'test@test.com', nombre: 'Test' };
const validation = validateData(testUser, 'user');
console.log(validation); // Debe mostrar errores de campos faltantes
```

#### Probar Rate Limiting:
```javascript
// Intentar registrar múltiples veces rápidamente
// Debe mostrar mensaje de rate limit después de 3 intentos
```

#### Probar localStorage Seguro:
```javascript
// Ver información de almacenamiento
const info = getStorageInfo();
console.log(info);
```

### 4. Monitorear Errores

Después del despliegue, monitorea:
- Consola del navegador para errores JavaScript
- Firebase Console → Firestore → Usage para ver accesos
- Firebase Console → Firestore → Rules para verificar que las reglas están activas

---

## 🔍 Verificación Post-Despliegue

### Verificar Reglas de Seguridad:

1. **En Firebase Console:**
   - Ve a Firestore Database → Rules
   - Verifica que las reglas están desplegadas
   - Revisa el historial de cambios

2. **Probar Acceso:**
   - Intenta leer/escribir como usuario normal
   - Intenta leer/escribir como administrador
   - Verifica que usuarios no autorizados no pueden acceder

### Verificar Validaciones:

1. **Registro de Usuario:**
   - Intenta registrar con datos inválidos (email mal formado, código postal incorrecto)
   - Debe mostrar errores de validación

2. **Guardado de Datos:**
   - Intenta guardar noticias/bandos con datos muy largos
   - Debe truncar o rechazar según los límites

### Verificar Rate Limiting:

1. **Registro:**
   - Intenta registrar más de 3 veces en un minuto
   - Debe mostrar mensaje de rate limit

2. **Notificaciones:**
   - Intenta enviar más de 10 notificaciones por minuto
   - Debe limitar los envíos

---

## 🎯 Prioridades

1. **ALTA:** Reglas de seguridad de Firestore ⚠️ **REQUIERE DESPLIEGUE**
2. **ALTA:** Validación de datos antes de guardar ✅ **IMPLEMENTADO**
3. **MEDIA:** Manejo de errores robusto ✅ **IMPLEMENTADO**
4. **MEDIA:** Gestión segura de localStorage ✅ **IMPLEMENTADO**
5. **BAJA:** Rate limiting (mejora UX) ✅ **IMPLEMENTADO**

---

## 📝 Notas Importantes

1. **Compatibilidad hacia atrás:** Las nuevas funciones tienen fallbacks, por lo que el código seguirá funcionando incluso si los módulos no se cargan.

2. **Reglas de Firestore:** Son críticas para la seguridad. Asegúrate de probarlas antes de desplegar en producción.

3. **Validaciones:** Los esquemas de validación pueden extenderse fácilmente agregando nuevos campos a `DATA_SCHEMAS`.

4. **Rate Limiting:** Los límites son configurables en `RATE_LIMITS` en `js/rate-limiter.js`.

5. **localStorage:** Los límites de tamaño son configurables en `STORAGE_LIMITS` en `js/storage-manager.js`.

---

**Fecha:** Diciembre 2025
**Versión:** 1.0
**Estado:** ✅ Implementado (pendiente despliegue de reglas de Firestore)

