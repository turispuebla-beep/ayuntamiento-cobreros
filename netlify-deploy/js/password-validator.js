/**
 * Password Validator - Validación fuerte de contraseñas
 * Mínimo 8 caracteres, mayúsculas, minúsculas, números y símbolos
 * Verificación de contraseñas comunes
 */

// Lista de contraseñas comunes (las 1000 más usadas)
const COMMON_PASSWORDS = new Set([
    'password', '123456', '123456789', '12345678', '12345', '1234567',
    '1234567890', 'qwerty', 'abc123', 'password1', '123123', 'admin',
    'letmein', 'welcome', 'monkey', '123456789', '1234567890', 'qwerty123',
    'dragon', 'master', 'sunshine', 'ashley', 'bailey', 'passw0rd',
    'shadow', '1234', 'superman', 'qazwsx', 'michael', 'football',
    'iloveyou', 'trustno1', 'jesus', 'ninja', 'mustang', 'password123',
    'admin123', 'root', 'toor', 'administrator', 'administrador',
    'ayuntamiento', 'cobreros', 'ayuntamientocobreros'
]);

/**
 * Valida la fortaleza de una contraseña
 * @param {string} password - Contraseña a validar
 * @returns {Object} - { valid: boolean, errors: string[], strength: string }
 */
function validatePasswordStrength(password) {
    const errors = [];
    const checks = {
        minLength: password.length >= 8,
        hasUpperCase: /[A-Z]/.test(password),
        hasLowerCase: /[a-z]/.test(password),
        hasNumber: /[0-9]/.test(password),
        hasSymbol: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
        notCommon: !COMMON_PASSWORDS.has(password.toLowerCase()),
        notSequential: !isSequential(password),
        notRepeating: !isRepeating(password)
    };

    if (!checks.minLength) {
        errors.push('La contraseña debe tener al menos 8 caracteres');
    }
    if (!checks.hasUpperCase) {
        errors.push('La contraseña debe contener al menos una letra mayúscula');
    }
    if (!checks.hasLowerCase) {
        errors.push('La contraseña debe contener al menos una letra minúscula');
    }
    if (!checks.hasNumber) {
        errors.push('La contraseña debe contener al menos un número');
    }
    if (!checks.hasSymbol) {
        errors.push('La contraseña debe contener al menos un símbolo (!@#$%^&*...)');
    }
    if (!checks.notCommon) {
        errors.push('La contraseña es demasiado común. Por favor, elija una más segura');
    }
    if (!checks.notSequential) {
        errors.push('La contraseña no puede contener secuencias (ej: 12345, abcde)');
    }
    if (!checks.notRepeating) {
        errors.push('La contraseña no puede contener caracteres repetidos (ej: aaaa, 1111)');
    }

    const valid = Object.values(checks).every(check => check === true);
    
    // Calcular fortaleza
    let strength = 'débil';
    const passedChecks = Object.values(checks).filter(c => c).length;
    if (passedChecks >= 7) {
        strength = 'fuerte';
    } else if (passedChecks >= 5) {
        strength = 'media';
    }

    return {
        valid,
        errors,
        strength,
        checks
    };
}

/**
 * Verifica si una contraseña contiene secuencias
 * @param {string} password - Contraseña a verificar
 * @returns {boolean}
 */
function isSequential(password) {
    const sequences = [
        '0123456789', '9876543210', 'abcdefghijklmnopqrstuvwxyz',
        'zyxwvutsrqponmlkjihgfedcba', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm'
    ];
    
    password = password.toLowerCase();
    for (let i = 0; i <= password.length - 4; i++) {
        const substr = password.substring(i, i + 4);
        for (const seq of sequences) {
            if (seq.includes(substr)) {
                return true;
            }
        }
    }
    return false;
}

/**
 * Verifica si una contraseña contiene caracteres repetidos
 * @param {string} password - Contraseña a verificar
 * @returns {boolean}
 */
function isRepeating(password) {
    for (let i = 0; i <= password.length - 4; i++) {
        const substr = password.substring(i, i + 4);
        if (new Set(substr).size === 1) {
            return true;
        }
    }
    return false;
}

/**
 * Genera una contraseña segura aleatoria
 * @param {number} length - Longitud de la contraseña (default: 12)
 * @returns {string}
 */
function generateSecurePassword(length = 12) {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    const all = uppercase + lowercase + numbers + symbols;
    
    let password = '';
    // Asegurar al menos un carácter de cada tipo
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];
    
    // Completar el resto
    for (let i = password.length; i < length; i++) {
        password += all[Math.floor(Math.random() * all.length)];
    }
    
    // Mezclar los caracteres
    return password.split('').sort(() => Math.random() - 0.5).join('');
}

// Exponer funciones globalmente
if (typeof window !== 'undefined') {
    window.validatePasswordStrength = validatePasswordStrength;
    window.generateSecurePassword = generateSecurePassword;
}

