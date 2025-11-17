/* global escapeHtml */
// ===== VALIDACIÓN DE DATOS ROBUSTA =====
// Sistema de validación de datos antes de guardar en Firestore

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
      fcmToken: 'string',
      registeredFrom: 'string'
    },
    validators: {
      email: (val) => {
        if (!val || typeof val !== 'string') return false;
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
      },
      postalCode: (val) => {
        if (!val) return false;
        return /^[0-9]{5}$/.test(String(val));
      },
      phone: (val) => {
        if (!val) return false;
        const cleaned = String(val).replace(/\s/g, '');
        return /^[0-9]{9,15}$/.test(cleaned);
      },
      localities: (val) => {
        if (!val) return false;
        return Array.isArray(val) && val.length > 0;
      }
    },
    maxLengths: {
      nombre: 100,
      surname1: 100,
      surname2: 100,
      email: 255,
      phone: 20,
      address: 200,
      city: 100,
      postalCode: 5,
      documentNumber: 20
    }
  },
  
  notification: {
    required: ['title', 'message', 'type'],
    types: {
      title: 'string',
      message: 'string',
      type: 'string',
      localities: 'array',
      timestamp: 'object',
      hasAttachments: 'boolean'
    },
    validators: {
      type: (val) => {
        const validTypes = ['general', 'urgent', 'event', 'cita', 'bando', 'incidencia', 'emergencia'];
        return validTypes.includes(val);
      },
      title: (val) => {
        if (!val || typeof val !== 'string') return false;
        return val.trim().length > 0 && val.length <= 200;
      },
      message: (val) => {
        if (!val || typeof val !== 'string') return false;
        return val.trim().length > 0 && val.length <= 5000;
      }
    },
    maxLengths: {
      title: 200,
      message: 5000
    }
  },
  
  news: {
    required: ['title', 'content'],
    types: {
      title: 'string',
      content: 'string',
      image: 'string',
      createdAt: 'object'
    },
    validators: {
      title: (val) => {
        if (!val || typeof val !== 'string') return false;
        return val.trim().length > 0 && val.length <= 200;
      },
      content: (val) => {
        if (!val || typeof val !== 'string') return false;
        return val.trim().length > 0;
      }
    },
    maxLengths: {
      title: 200,
      content: 10000
    }
  },
  
  bando: {
    required: ['title', 'content'],
    types: {
      title: 'string',
      content: 'string',
      createdAt: 'object'
    },
    validators: {
      title: (val) => {
        if (!val || typeof val !== 'string') return false;
        return val.trim().length > 0 && val.length <= 200;
      },
      content: (val) => {
        if (!val || typeof val !== 'string') return false;
        return val.trim().length > 0;
      }
    },
    maxLengths: {
      title: 200,
      content: 10000
    }
  },
  
  appointment: {
    required: ['name', 'email', 'phone', 'service', 'date', 'time'],
    types: {
      name: 'string',
      email: 'string',
      phone: 'string',
      service: 'string',
      date: 'string',
      time: 'string',
      status: 'string'
    },
    validators: {
      email: (val) => {
        if (!val || typeof val !== 'string') return false;
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
      },
      phone: (val) => {
        if (!val) return false;
        const cleaned = String(val).replace(/\s/g, '');
        return /^[0-9]{9,15}$/.test(cleaned);
      },
      status: (val) => {
        if (!val) return true; // Opcional
        const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed'];
        return validStatuses.includes(val);
      }
    },
    maxLengths: {
      name: 100,
      email: 255,
      phone: 20,
      service: 100
    }
  }
};

/**
 * Valida datos según un esquema
 * @param {Object} data - Datos a validar
 * @param {string} schemaName - Nombre del esquema a usar
 * @returns {Object} - { valid: boolean, errors: string[] }
 */
function validateData(data, schemaName) {
  const schema = DATA_SCHEMAS[schemaName];
  if (!schema) {
    return {
      valid: false,
      errors: [`Schema ${schemaName} no encontrado`]
    };
  }
  
  const errors = [];
  
  // Validar campos requeridos
  for (const field of schema.required) {
    if (!(field in data) || data[field] === null || data[field] === undefined || 
        (typeof data[field] === 'string' && data[field].trim() === '')) {
      errors.push(`Campo requerido faltante o vacío: ${field}`);
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
  
  // Validar longitudes máximas
  if (schema.maxLengths) {
    for (const [field, maxLength] of Object.entries(schema.maxLengths)) {
      if (field in data && data[field] !== null && data[field] !== undefined) {
        const value = String(data[field]);
        if (value.length > maxLength) {
          errors.push(`Campo ${field} excede longitud máxima de ${maxLength} caracteres`);
        }
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Sanitiza datos antes de guardar
 * @param {Object} data - Datos a sanitizar
 * @param {string} schemaName - Nombre del esquema
 * @returns {Object} - Datos sanitizados
 */
function sanitizeData(data, schemaName) {
  const schema = DATA_SCHEMAS[schemaName];
  if (!schema) return data;
  
  const sanitized = { ...data };
  
  // Sanitizar strings
  for (const [field, type] of Object.entries(schema.types)) {
    if (type === 'string' && field in sanitized && sanitized[field] !== null && sanitized[field] !== undefined) {
      // Escapar HTML y recortar espacios
      sanitized[field] = escapeHtml(String(sanitized[field])).trim();
      
      // Aplicar límite de longitud si existe
      if (schema.maxLengths && schema.maxLengths[field]) {
        sanitized[field] = sanitized[field].substring(0, schema.maxLengths[field]);
      }
    }
  }
  
  // Sanitizar arrays (solo strings)
  for (const [field, type] of Object.entries(schema.types)) {
    if (type === 'array' && field in sanitized && Array.isArray(sanitized[field])) {
      sanitized[field] = sanitized[field].map(item => {
        if (typeof item === 'string') {
          return escapeHtml(item).trim();
        }
        return item;
      });
    }
  }
  
  return sanitized;
}

// Exportar funciones
if (typeof window !== 'undefined') {
  window.validateData = validateData;
  window.sanitizeData = sanitizeData;
  window.DATA_SCHEMAS = DATA_SCHEMAS;
}

