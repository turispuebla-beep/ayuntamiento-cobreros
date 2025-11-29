/*
Sistema de Encriptación de Datos Sensibles
© 2024 - Sistema de Gestión del Ayuntamiento de Cobreros

Encripta datos sensibles antes de guardarlos en Firestore
para proteger información personal y confidencial

Contacto: editorturis@gmail.com
*/

class DataEncryption {
    constructor() {
        // Clave de encriptación (en producción debería estar en Firebase Secrets)
        // Por ahora usamos una clave derivada del dominio
        this.encryptionKey = this.deriveKey();
        this.algorithm = 'AES-GCM';
    }

    /**
     * Derivar clave de encriptación
     * En producción, esto debería venir de Firebase Secrets
     */
    deriveKey() {
        // Generar clave basada en el dominio (temporal)
        // En producción, obtener de Firebase Secrets
        const domain = window.location.hostname || 'ayuntamientocobreros.es';
        const baseKey = btoa(domain).substring(0, 32);
        return baseKey.padEnd(32, '0');
    }

    /**
     * Generar IV (Initialization Vector) aleatorio
     */
    generateIV() {
        const array = new Uint8Array(12);
        crypto.getRandomValues(array);
        return array;
    }

    /**
     * Convertir string a ArrayBuffer
     */
    stringToArrayBuffer(str) {
        const encoder = new TextEncoder();
        return encoder.encode(str);
    }

    /**
     * Convertir ArrayBuffer a string
     */
    arrayBufferToString(buffer) {
        const decoder = new TextDecoder();
        return decoder.decode(buffer);
    }

    /**
     * Encriptar datos sensibles
     * @param {string} data - Datos a encriptar
     * @param {string} key - Clave de encriptación (opcional)
     * @returns {Promise<string>} - Datos encriptados en base64
     */
    async encrypt(data) {
        try {
            if (!data) return data;
            
            const key = await this.getEncryptionKey();
            const iv = this.generateIV();
            const dataBuffer = this.stringToArrayBuffer(data);

            // Importar clave
            const cryptoKey = await crypto.subtle.importKey(
                'raw',
                this.stringToArrayBuffer(key),
                { name: this.algorithm },
                false,
                ['encrypt']
            );

            // Encriptar
            const encrypted = await crypto.subtle.encrypt(
                {
                    name: this.algorithm,
                    iv: iv
                },
                cryptoKey,
                dataBuffer
            );

            // Combinar IV y datos encriptados
            const combined = new Uint8Array(iv.length + encrypted.byteLength);
            combined.set(iv, 0);
            combined.set(new Uint8Array(encrypted), iv.length);

            // Convertir a base64 para almacenamiento
            return btoa(String.fromCharCode(...combined));
        } catch (error) {
            console.error('Error encriptando datos:', error);
            // En caso de error, devolver datos sin encriptar (con advertencia)
            console.warn('⚠️ No se pudo encriptar. Los datos se guardarán sin encriptar.');
            return data;
        }
    }

    /**
     * Desencriptar datos
     * @param {string} encryptedData - Datos encriptados en base64
     * @param {string} key - Clave de encriptación (opcional)
     * @returns {Promise<string>} - Datos desencriptados
     */
    async decrypt(encryptedData) {
        try {
            if (!encryptedData) return encryptedData;
            
            // Verificar si los datos están encriptados (empiezan con marca especial)
            if (!encryptedData.startsWith('ENC:')) {
                // Datos no encriptados, devolver tal cual
                return encryptedData;
            }

            const dataWithoutPrefix = encryptedData.substring(4);
            const key = await this.getEncryptionKey();

            // Convertir de base64 a ArrayBuffer
            const combined = Uint8Array.from(atob(dataWithoutPrefix), c => c.charCodeAt(0));

            // Extraer IV y datos encriptados
            const iv = combined.slice(0, 12);
            const encrypted = combined.slice(12);

            // Importar clave
            const cryptoKey = await crypto.subtle.importKey(
                'raw',
                this.stringToArrayBuffer(key),
                { name: this.algorithm },
                false,
                ['decrypt']
            );

            // Desencriptar
            const decrypted = await crypto.subtle.decrypt(
                {
                    name: this.algorithm,
                    iv: iv
                },
                cryptoKey,
                encrypted
            );

            return this.arrayBufferToString(decrypted);
        } catch (error) {
            console.error('Error desencriptando datos:', error);
            throw new Error('No se pudieron desencriptar los datos');
        }
    }

    /**
     * Obtener clave de encriptación
     * En producción, esto debería obtener la clave de Firebase Secrets
     */
    async getEncryptionKey() {
        // Por ahora, usar clave derivada
        // En producción, hacer fetch a Cloud Function que devuelva la clave desde Secrets
        try {
            const response = await fetch(`${window.CLOUD_FUNCTIONS_BASE_URL || 'https://us-central1-turisteam-80f1b.cloudfunctions.net'}/getEncryptionKey`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${await this.getAuthToken()}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                return data.key;
            }
        } catch (error) {
            console.warn('No se pudo obtener clave de encriptación del servidor, usando clave local');
        }
        
        return this.encryptionKey;
    }

    /**
     * Obtener token de autenticación
     */
    async getAuthToken() {
        if (window.firebase && window.firebase.auth && window.firebase.auth().currentUser) {
            return await window.firebase.auth().currentUser.getIdToken();
        }
        return null;
    }

    /**
     * Encriptar campos sensibles de un objeto
     * @param {Object} data - Objeto con datos
     * @param {Array<string>} sensitiveFields - Campos a encriptar
     * @returns {Promise<Object>} - Objeto con campos encriptados
     */
    async encryptSensitiveFields(data, sensitiveFields = ['dni', 'documentNumber', 'phone', 'email', 'address']) {
        const encrypted = { ...data };
        
        for (const field of sensitiveFields) {
            if (encrypted[field]) {
                try {
                    const encryptedValue = await this.encrypt(String(encrypted[field]));
                    encrypted[field] = `ENC:${encryptedValue}`;
                } catch (error) {
                    console.warn(`No se pudo encriptar campo ${field}:`, error);
                }
            }
        }
        
        return encrypted;
    }

    /**
     * Desencriptar campos sensibles de un objeto
     * @param {Object} data - Objeto con datos encriptados
     * @param {Array<string>} sensitiveFields - Campos a desencriptar
     * @returns {Promise<Object>} - Objeto con campos desencriptados
     */
    async decryptSensitiveFields(data, sensitiveFields = ['dni', 'documentNumber', 'phone', 'email', 'address']) {
        const decrypted = { ...data };
        
        for (const field of sensitiveFields) {
            if (decrypted[field] && typeof decrypted[field] === 'string' && decrypted[field].startsWith('ENC:')) {
                try {
                    decrypted[field] = await this.decrypt(decrypted[field]);
                } catch (error) {
                    console.warn(`No se pudo desencriptar campo ${field}:`, error);
                }
            }
        }
        
        return decrypted;
    }
}

// Crear instancia global
if (typeof window !== 'undefined') {
    window.dataEncryption = new DataEncryption();
    console.log('✅ Sistema de encriptación de datos cargado');
}

