/*
Sistema de Sanitización de Inputs
© 2024 - Sistema de Gestión del Ayuntamiento de Cobreros

Protege contra XSS, inyección SQL y otros ataques
mediante sanitización y validación de inputs del usuario

Contacto: editorturis@gmail.com
*/

class InputSanitizer {
    constructor() {
        // Caracteres peligrosos que deben ser escapados
        this.dangerousChars = {
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#x27;',
            '/': '&#x2F;',
            '&': '&amp;'
        };
        
        // Patrones peligrosos para detectar
        this.dangerousPatterns = [
            /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
            /javascript:/gi,
            /on\w+\s*=/gi, // onclick=, onerror=, etc.
            /<iframe/gi,
            /<object/gi,
            /<embed/gi,
            /<link/gi,
            /<meta/gi,
            /<style/gi,
            /expression\s*\(/gi,
            /vbscript:/gi,
            /data:text\/html/gi
        ];
    }

    /**
     * Escapar HTML para prevenir XSS
     * @param {string} input - Texto a escapar
     * @returns {string} - Texto escapado
     */
    escapeHtml(input) {
        if (typeof input !== 'string') {
            input = String(input);
        }
        
        return input.replace(/[<>&"']/g, (char) => {
            return this.dangerousChars[char] || char;
        });
    }

    /**
     * Sanitizar texto plano (eliminar HTML y scripts)
     * @param {string} input - Texto a sanitizar
     * @param {Object} options - Opciones de sanitización
     * @returns {string} - Texto sanitizado
     */
    sanitizeText(input, options = {}) {
        if (typeof input !== 'string') {
            input = String(input);
        }

        const {
            allowLineBreaks = false,
            maxLength = null,
            trim = true
        } = options;

        // Trim si está habilitado
        if (trim) {
            input = input.trim();
        }

        // Eliminar caracteres de control excepto saltos de línea si están permitidos
        if (allowLineBreaks) {
            input = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
        } else {
            input = input.replace(/[\x00-\x1F\x7F]/g, '');
        }

        // Escapar HTML
        input = this.escapeHtml(input);

        // Eliminar patrones peligrosos
        this.dangerousPatterns.forEach(pattern => {
            input = input.replace(pattern, '');
        });

        // Limitar longitud si se especifica
        if (maxLength && input.length > maxLength) {
            input = input.substring(0, maxLength);
        }

        return input;
    }

    /**
     * Sanitizar HTML permitiendo solo etiquetas seguras
     * @param {string} input - HTML a sanitizar
     * @param {Object} options - Opciones de sanitización
     * @returns {string} - HTML sanitizado
     */
    sanitizeHtml(input, options = {}) {
        if (typeof input !== 'string') {
            input = String(input);
        }

        const {
            allowedTags = ['p', 'br', 'strong', 'em', 'u', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
            allowedAttributes = {}
        } = options;

        // Crear un elemento temporal para parsear HTML
        const temp = document.createElement('div');
        temp.innerHTML = input;

        // Función recursiva para sanitizar nodos
        const sanitizeNode = (node) => {
            if (node.nodeType === Node.TEXT_NODE) {
                return node.textContent;
            }

            if (node.nodeType === Node.ELEMENT_NODE) {
                const tagName = node.tagName.toLowerCase();
                
                // Si la etiqueta no está permitida, retornar solo el contenido
                if (!allowedTags.includes(tagName)) {
                    let content = '';
                    node.childNodes.forEach(child => {
                        content += sanitizeNode(child);
                    });
                    return content;
                }

                // Crear nuevo elemento con la etiqueta permitida
                const newElement = document.createElement(tagName);

                // Copiar atributos permitidos
                if (allowedAttributes[tagName]) {
                    allowedAttributes[tagName].forEach(attr => {
                        if (node.hasAttribute(attr)) {
                            const value = node.getAttribute(attr);
                            // Escapar atributos para prevenir XSS
                            newElement.setAttribute(attr, this.escapeHtml(value));
                        }
                    });
                }

                // Sanitizar hijos
                node.childNodes.forEach(child => {
                    const sanitized = sanitizeNode(child);
                    if (typeof sanitized === 'string') {
                        newElement.appendChild(document.createTextNode(sanitized));
                    } else {
                        newElement.appendChild(sanitized);
                    }
                });

                return newElement;
            }

            return '';
        };

        // Sanitizar todos los nodos
        const sanitized = document.createDocumentFragment();
        temp.childNodes.forEach(node => {
            const cleaned = sanitizeNode(node);
            if (cleaned) {
                if (typeof cleaned === 'string') {
                    sanitized.appendChild(document.createTextNode(cleaned));
                } else {
                    sanitized.appendChild(cleaned);
                }
            }
        });

        return sanitized.innerHTML;
    }

    /**
     * Sanitizar email
     * @param {string} email - Email a sanitizar
     * @returns {string} - Email sanitizado o null si es inválido
     */
    sanitizeEmail(email) {
        if (typeof email !== 'string') {
            return null;
        }

        email = email.trim().toLowerCase();

        // Validar formato de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return null;
        }

        // Escapar caracteres peligrosos pero mantener formato de email
        email = email.replace(/[<>"']/g, '');

        // Limitar longitud
        if (email.length > 254) {
            return null;
        }

        return email;
    }

    /**
     * Sanitizar URL
     * @param {string} url - URL a sanitizar
     * @param {Object} options - Opciones
     * @returns {string} - URL sanitizada o null si es inválida
     */
    sanitizeUrl(url, options = {}) {
        if (typeof url !== 'string') {
            return null;
        }

        const { allowedProtocols = ['http:', 'https:'] } = options;

        url = url.trim();

        try {
            const urlObj = new URL(url);

            // Verificar protocolo permitido
            if (!allowedProtocols.includes(urlObj.protocol)) {
                return null;
            }

            // Verificar que no sea javascript: o data:
            if (urlObj.protocol === 'javascript:' || urlObj.protocol === 'data:') {
                return null;
            }

            return urlObj.toString();
        } catch (error) {
            // Si no es una URL válida, intentar agregar https://
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                url = 'https://' + url;
                try {
                    const urlObj = new URL(url);
                    return urlObj.toString();
                } catch (e) {
                    return null;
                }
            }
            return null;
        }
    }

    /**
     * Sanitizar número
     * @param {string|number} input - Número a sanitizar
     * @param {Object} options - Opciones
     * @returns {number|null} - Número sanitizado o null si es inválido
     */
    sanitizeNumber(input, options = {}) {
        const {
            min = null,
            max = null,
            integer = false,
            allowNegative = true
        } = options;

        let num = typeof input === 'string' ? parseFloat(input) : Number(input);

        if (isNaN(num)) {
            return null;
        }

        if (integer) {
            num = Math.floor(num);
        }

        if (!allowNegative && num < 0) {
            return null;
        }

        if (min !== null && num < min) {
            return null;
        }

        if (max !== null && num > max) {
            return null;
        }

        return num;
    }

    /**
     * Sanitizar para prevenir inyección SQL (aunque Firestore lo previene, es buena práctica)
     * @param {string} input - Input a sanitizar
     * @returns {string} - Input sanitizado
     */
    sanitizeForSQL(input) {
        if (typeof input !== 'string') {
            input = String(input);
        }

        // Eliminar caracteres peligrosos para SQL
        const sqlDangerous = [
            /'/g,
            /"/g,
            /;/g,
            /--/g,
            /\/\*/g,
            /\*\//g,
            /xp_/gi,
            /sp_/gi,
            /exec/gi,
            /execute/gi,
            /union/gi,
            /select/gi,
            /insert/gi,
            /update/gi,
            /delete/gi,
            /drop/gi,
            /create/gi,
            /alter/gi
        ];

        sqlDangerous.forEach(pattern => {
            input = input.replace(pattern, '');
        });

        return input.trim();
    }

    /**
     * Validar y sanitizar input según tipo
     * @param {string} input - Input a validar
     * @param {string} type - Tipo de validación (text, email, url, number, html)
     * @param {Object} options - Opciones específicas del tipo
     * @returns {string|number|null} - Input sanitizado o null si es inválido
     */
    validateAndSanitize(input, type, options = {}) {
        switch (type) {
            case 'text':
                return this.sanitizeText(input, options);
            
            case 'email':
                return this.sanitizeEmail(input);
            
            case 'url':
                return this.sanitizeUrl(input, options);
            
            case 'number':
                return this.sanitizeNumber(input, options);
            
            case 'html':
                return this.sanitizeHtml(input, options);
            
            case 'sql':
                return this.sanitizeForSQL(input);
            
            default:
                return this.sanitizeText(input, options);
        }
    }

    /**
     * Sanitizar objeto completo recursivamente
     * @param {Object} obj - Objeto a sanitizar
     * @param {Object} schema - Esquema de validación
     * @returns {Object} - Objeto sanitizado
     */
    sanitizeObject(obj, schema = {}) {
        if (!obj || typeof obj !== 'object') {
            return obj;
        }

        const sanitized = Array.isArray(obj) ? [] : {};

        for (const key in obj) {
            if (!obj.hasOwnProperty(key)) continue;

            const value = obj[key];
            const fieldSchema = schema[key] || { type: 'text' };

            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                // Objeto anidado
                sanitized[key] = this.sanitizeObject(value, fieldSchema.schema || {});
            } else if (Array.isArray(value)) {
                // Array
                sanitized[key] = value.map(item => {
                    if (typeof item === 'object') {
                        return this.sanitizeObject(item, fieldSchema.itemSchema || {});
                    }
                    return this.validateAndSanitize(item, fieldSchema.type || 'text', fieldSchema.options || {});
                });
            } else {
                // Valor primitivo
                sanitized[key] = this.validateAndSanitize(value, fieldSchema.type || 'text', fieldSchema.options || {});
            }
        }

        return sanitized;
    }
}

// Crear instancia global
const inputSanitizer = new InputSanitizer();

// Hacer disponible globalmente
if (typeof window !== 'undefined') {
    window.inputSanitizer = inputSanitizer;
    window.sanitize = (input, type, options) => inputSanitizer.validateAndSanitize(input, type, options);
}

// Exportar para uso en otros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = InputSanitizer;
}


