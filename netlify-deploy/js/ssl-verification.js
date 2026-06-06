/*
Verificación SSL/HTTPS
© 2024 - Sistema de Gestión del Ayuntamiento de Cobreros

Verifica que la conexión sea segura (HTTPS)
y muestra advertencias si no lo es

Contacto: editorturis@gmail.com
*/

class SSLVerification {
    constructor() {
        this.isSecure = window.location.protocol === 'https:';
        this.checkSSL();
    }

    /**
     * Verificar SSL/HTTPS
     */
    checkSSL() {
        if (!this.isSecure) {
            console.warn('⚠️ ADVERTENCIA: La conexión no es segura (HTTP en lugar de HTTPS)');
            
            // Mostrar advertencia al usuario
            if (window.currentUser && window.currentUser.isAdmin) {
                this.showSecurityWarning();
            }

            // Registrar en logs
            if (window.auditLogSystem) {
                window.auditLogSystem.log('INSECURE_CONNECTION', {
                    protocol: window.location.protocol,
                    url: window.location.href
                });
            }
        } else {
            console.log('✅ Conexión segura (HTTPS)');
        }
    }

    /**
     * Mostrar advertencia de seguridad
     */
    showSecurityWarning() {
        const warning = document.createElement('div');
        warning.className = 'ssl-warning';
        warning.innerHTML = `
            <div class="ssl-warning-content">
                <strong>⚠️ Advertencia de Seguridad</strong>
                <p>Estás accediendo mediante HTTP (no seguro). Para un uso oficial, se recomienda HTTPS.</p>
                <button onclick="this.parentElement.parentElement.remove()">Cerrar</button>
            </div>
        `;
        
        const style = document.createElement('style');
        style.textContent = `
            .ssl-warning {
                position: fixed;
                top: 20px;
                right: 20px;
                background: #fef3c7;
                border: 2px solid #f59e0b;
                border-radius: 8px;
                padding: 15px;
                z-index: 10000;
                max-width: 300px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            }
            .ssl-warning-content strong {
                color: #92400e;
                display: block;
                margin-bottom: 10px;
            }
            .ssl-warning-content button {
                margin-top: 10px;
                padding: 5px 15px;
                background: #f59e0b;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
            }
        `;
        document.head.appendChild(style);
        document.body.appendChild(warning);
    }

    /**
     * Forzar redirección a HTTPS
     */
    forceHTTPS() {
        if (!this.isSecure && window.location.hostname !== 'localhost') {
            window.location.href = window.location.href.replace('http:', 'https:');
        }
    }

    /**
     * Verificar certificado SSL
     */
    async verifySSLCertificate() {
        if (!this.isSecure) {
            return { valid: false, message: 'No se puede verificar certificado en HTTP' };
        }

        try {
            // Verificar que estamos en HTTPS
            if (window.location.protocol !== 'https:') {
                return { valid: false, message: 'Conexión no segura' };
            }

            // En producción, se puede hacer una verificación más exhaustiva
            // consultando servicios de verificación de certificados
            
            return {
                valid: true,
                protocol: 'https',
                secure: true,
                message: 'Conexión segura verificada'
            };
        } catch (error) {
            return { valid: false, message: 'Error al verificar certificado' };
        }
    }
}

// Inicializar verificación SSL
const sslVerification = new SSLVerification();

// Hacer disponible globalmente
if (typeof window !== 'undefined') {
    window.sslVerification = sslVerification;
}

// Exportar
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SSLVerification;
}

