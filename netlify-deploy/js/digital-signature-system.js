/*
Sistema de Firma Digital Básico
© 2024 - Sistema de Gestión del Ayuntamiento de Cobreros

Sistema básico de firma digital para documentos oficiales.
Nota: Para validez legal completa, se requiere integración con @firma (FNMT)

Contacto: editorturis@gmail.com
*/

class DigitalSignatureSystem {
    constructor() {
        this.signaturesCollection = 'digital_signatures';
    }

    /**
     * Firmar documento digitalmente
     * @param {string} documentId - ID del documento
     * @param {Object} signatureData - Datos de la firma
     * @returns {Promise<Object>} - Firma creada
     */
    async signDocument(documentId, signatureData = {}) {
        try {
            // Verificar permisos
            if (!window.backendVerification || !await window.backendVerification.verifyActionPermissions('SIGN_DOCUMENT')) {
                throw new Error('No tienes permisos para firmar documentos');
            }

            const signature = {
                documentId: documentId,
                signedBy: window.currentUser?.uid || 'unknown',
                signedByEmail: window.currentUser?.email || 'unknown',
                signedByName: window.currentUser?.name || 'unknown',
                signedAt: new Date(),
                signedAtISO: new Date().toISOString(),
                signatureHash: this.generateSignatureHash(documentId, window.currentUser),
                ipAddress: await this.getIPAddress(),
                userAgent: navigator.userAgent,
                method: signatureData.method || 'electronic', // electronic, digital (con certificado)
                certificateInfo: signatureData.certificateInfo || null,
                metadata: {
                    timestamp: Date.now(),
                    documentVersion: signatureData.documentVersion || '1.0'
                },
                legalValidity: signatureData.method === 'digital' // Solo válido legalmente con certificado
            };

            // Guardar firma
            if (window.firebase && window.firebase.firestore) {
                const docRef = await window.firebase.firestore()
                    .collection(this.signaturesCollection)
                    .add(signature);
                signature.id = docRef.id;

                // Actualizar documento con referencia a la firma
                await window.firebase.firestore()
                    .collection('documents')
                    .doc(documentId)
                    .update({
                        signed: true,
                        signedAt: signature.signedAt,
                        signedBy: signature.signedBy,
                        signatureId: signature.id
                    });
            }

            // Registrar en logs
            if (window.auditLogSystem) {
                await window.auditLogSystem.log('DOCUMENT_SIGNED', {
                    documentId: documentId,
                    signatureId: signature.id,
                    method: signature.method
                });
            }

            console.log('✅ Documento firmado:', documentId);
            return signature;

        } catch (error) {
            console.error('❌ Error firmando documento:', error);
            throw error;
        }
    }

    /**
     * Verificar firma de documento
     * @param {string} documentId - ID del documento
     * @returns {Promise<Object>} - Información de verificación
     */
    async verifySignature(documentId) {
        try {
            if (window.firebase && window.firebase.firestore) {
                const signatures = await window.firebase.firestore()
                    .collection(this.signaturesCollection)
                    .where('documentId', '==', documentId)
                    .orderBy('signedAt', 'desc')
                    .get();

                if (signatures.empty) {
                    return {
                        valid: false,
                        message: 'No se encontró firma para este documento'
                    };
                }

                const signature = signatures.docs[0].data();
                
                // Verificar hash
                const expectedHash = this.generateSignatureHash(documentId, {
                    uid: signature.signedBy,
                    email: signature.signedByEmail
                });

                const isValid = signature.signatureHash === expectedHash;

                return {
                    valid: isValid,
                    signature: signature,
                    message: isValid ? 'Firma válida' : 'Firma no válida'
                };
            }

            return { valid: false, message: 'Sistema de verificación no disponible' };
        } catch (error) {
            console.error('❌ Error verificando firma:', error);
            return { valid: false, message: 'Error al verificar la firma' };
        }
    }

    /**
     * Generar hash de firma
     */
    generateSignatureHash(documentId, user) {
        const data = `${documentId}_${user.uid || user.id}_${user.email}_${Date.now()}`;
        let hash = 0;
        for (let i = 0; i < data.length; i++) {
            const char = data.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(16).toUpperCase();
    }

    /**
     * Obtener IP del usuario
     */
    async getIPAddress() {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            return data.ip || 'unknown';
        } catch (error) {
            return 'unknown';
        }
    }

    /**
     * Preparar integración con @firma (FNMT)
     * Nota: Esto requiere configuración adicional del servidor
     */
    async prepareFirmaIntegration() {
        // Estructura para futura integración con @firma
        return {
            endpoint: 'https://valide.redsara.es/valide/ValideServicio',
            certificateRequired: true,
            integrationPending: true
        };
    }
}

// Crear instancia global
const digitalSignatureSystem = new DigitalSignatureSystem();

// Hacer disponible globalmente
if (typeof window !== 'undefined') {
    window.digitalSignatureSystem = digitalSignatureSystem;
}

// Exportar
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DigitalSignatureSystem;
}

