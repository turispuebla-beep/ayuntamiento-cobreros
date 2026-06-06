// ===== VALIDACIÓN EN TIEMPO REAL DE FORMULARIOS =====
// Sistema de validación mientras el usuario escribe

/**
 * Valida un campo en tiempo real
 * @param {HTMLElement} field - Campo a validar
 * @param {Function} validator - Función validadora
 */
function setupRealtimeValidation(field, validator) {
  if (!field || !validator) return;
    
  let timeoutId = null;
    
  const validate = () => {
    // Limpiar timeout anterior
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
        
    // Validar después de un pequeño delay (debounce)
    timeoutId = setTimeout(() => {
      const value = field.value;
      const error = validator(value);
            
      // Actualizar estado visual
      if (error) {
        field.classList.add('invalid');
        field.classList.remove('valid');
        showFieldError(field, error);
      } else if (value) {
        field.classList.add('valid');
        field.classList.remove('invalid');
        hideFieldError(field);
      } else {
        field.classList.remove('valid', 'invalid');
        hideFieldError(field);
      }
    }, 300);
  };
    
  // Validar al escribir
  field.addEventListener('input', validate);
    
  // Validar al perder foco
  field.addEventListener('blur', () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    const value = field.value;
    const error = validator(value);
        
    if (error) {
      field.classList.add('invalid');
      showFieldError(field, error);
    } else if (value) {
      field.classList.add('valid');
      hideFieldError(field);
    }
  });
}

/**
 * Muestra un error en un campo
 * @param {HTMLElement} field - Campo
 * @param {string} error - Mensaje de error
 */
function showFieldError(field, error) {
  const errorId = field.id + '-error';
  let errorElement = document.getElementById(errorId);
    
  if (!errorElement) {
    errorElement = document.createElement('span');
    errorElement.id = errorId;
    errorElement.className = 'field-error';
    errorElement.style.cssText = `
            display: block;
            color: var(--error-color, #ef4444);
            font-size: 0.875rem;
            margin-top: 0.25rem;
            animation: slideDown 0.2s ease;
        `;
    field.parentNode.insertBefore(errorElement, field.nextSibling);
  }
    
  errorElement.textContent = error;
  errorElement.style.display = 'block';
    
  // Agregar animación si no existe
  if (!document.getElementById('field-error-animation')) {
    const style = document.createElement('style');
    style.id = 'field-error-animation';
    style.textContent = `
            @keyframes slideDown {
                from {
                    opacity: 0;
                    transform: translateY(-5px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
        `;
    document.head.appendChild(style);
  }
}

/**
 * Oculta el error de un campo
 * @param {HTMLElement} field - Campo
 */
function hideFieldError(field) {
  const errorId = field.id + '-error';
  const errorElement = document.getElementById(errorId);
  if (errorElement) {
    errorElement.style.display = 'none';
  }
}

/**
 * Validadores comunes
 */
const realtimeValidators = {
  email: (value) => {
    if (!value) return null;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return 'Email inválido';
    }
    return null;
  },
    
  phone: (value) => {
    if (!value) return null;
    const phoneRegex = /^[0-9]{9}$/;
    if (!phoneRegex.test(value.replace(/\s/g, ''))) {
      return 'Teléfono inválido (9 dígitos)';
    }
    return null;
  },
    
  required: (value) => {
    if (!value || value.trim() === '') {
      return 'Este campo es obligatorio';
    }
    return null;
  },
    
  url: (value) => {
    if (!value) return null;
    try {
      new URL(value);
      return null;
    } catch {
      if (!value.startsWith('/') && !value.startsWith('./')) {
        return 'URL inválida';
      }
      return null;
    }
  },
    
  minLength: (min) => (value) => {
    if (!value) return null;
    if (value.length < min) {
      return `Mínimo ${min} caracteres`;
    }
    return null;
  },
    
  maxLength: (max) => (value) => {
    if (!value) return null;
    if (value.length > max) {
      return `Máximo ${max} caracteres`;
    }
    return null;
  }
};

/**
 * Configura validación en tiempo real para un formulario
 * @param {string|HTMLElement} form - Formulario
 * @param {Object} validations - Objeto con validaciones por campo
 */
function setupFormRealtimeValidation(form, validations) {
  const formEl = typeof form === 'string' ? document.getElementById(form) : form;
  if (!formEl) return;
    
  Object.keys(validations).forEach(fieldId => {
    const field = formEl.querySelector(`#${fieldId}`) || formEl.querySelector(`[name="${fieldId}"]`);
    if (!field) return;
        
    const validation = validations[fieldId];
    let validator;
        
    if (typeof validation === 'function') {
      validator = validation;
    } else if (Array.isArray(validation)) {
      // Múltiples validadores
      validator = (value) => {
        for (const v of validation) {
          const error = typeof v === 'function' ? v(value) : realtimeValidators[v](value);
          if (error) return error;
        }
        return null;
      };
    } else if (typeof validation === 'string') {
      validator = realtimeValidators[validation] || (() => null);
    } else {
      return;
    }
        
    setupRealtimeValidation(field, validator);
  });
}

// Exportar funciones
if (typeof window !== 'undefined') {
  window.setupRealtimeValidation = setupRealtimeValidation;
  window.setupFormRealtimeValidation = setupFormRealtimeValidation;
  window.realtimeValidators = realtimeValidators;
  window.showFieldError = showFieldError;
  window.hideFieldError = hideFieldError;
}

