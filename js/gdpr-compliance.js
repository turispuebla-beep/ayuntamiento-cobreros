/*
Sistema de Cumplimiento RGPD
© 2024 - Sistema de Gestión del Ayuntamiento de Cobreros

Implementa las medidas necesarias para cumplir con el Reglamento General
de Protección de Datos (RGPD) de la UE

Contacto: editorturis@gmail.com
*/

class GDPRCompliance {
    constructor() {
        this.consentKey = 'gdpr_consent';
        this.dataProcessingKey = 'gdpr_data_processing';
        this.rightsKey = 'gdpr_rights_requests';
    }

    /**
     * Mostrar modal de consentimiento RGPD
     */
    showConsentModal() {
        // Verificar si ya se ha dado consentimiento
        const consent = localStorage.getItem(this.consentKey);
        if (consent === 'accepted') {
            return; // Ya se ha dado consentimiento
        }

        // Crear modal de consentimiento
        const modal = document.createElement('div');
        modal.id = 'gdprConsentModal';
        modal.className = 'modal';
        modal.style.display = 'block';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h2>🍪 Política de Cookies y Protección de Datos</h2>
                </div>
                <div class="modal-body">
                    <p>Este sitio web utiliza cookies y procesa datos personales de acuerdo con el <strong>Reglamento General de Protección de Datos (RGPD)</strong>.</p>
                    
                    <h3>¿Qué datos recopilamos?</h3>
                    <ul>
                        <li>Datos de identificación (nombre, DNI, email, teléfono)</li>
                        <li>Datos de contacto (dirección, código postal)</li>
                        <li>Datos de navegación (cookies técnicas necesarias)</li>
                        <li>Datos de citas previas y solicitudes</li>
                    </ul>

                    <h3>¿Para qué utilizamos sus datos?</h3>
                    <ul>
                        <li>Gestión de citas previas</li>
                        <li>Envío de notificaciones oficiales</li>
                        <li>Mejora de nuestros servicios</li>
                        <li>Cumplimiento de obligaciones legales</li>
                    </ul>

                    <h3>Sus derechos (RGPD)</h3>
                    <p>Tiene derecho a:</p>
                    <ul>
                        <li><strong>Acceso:</strong> Conocer qué datos tenemos sobre usted</li>
                        <li><strong>Rectificación:</strong> Corregir datos inexactos</li>
                        <li><strong>Supresión:</strong> Solicitar la eliminación de sus datos</li>
                        <li><strong>Oposición:</strong> Oponerse al tratamiento de sus datos</li>
                        <li><strong>Portabilidad:</strong> Obtener una copia de sus datos</li>
                        <li><strong>Limitación:</strong> Limitar el tratamiento de sus datos</li>
                    </ul>

                    <p>Para ejercer sus derechos, contacte con: <a href="mailto:aytocobreros@gmail.com">aytocobreros@gmail.com</a></p>

                    <div style="margin-top: 1.5rem;">
                        <label style="display: flex; align-items: center; gap: 0.5rem;">
                            <input type="checkbox" id="gdprConsentCheckbox" required>
                            <span>Acepto la <a href="#politica-privacidad" onclick="showPrivacyPolicy()">Política de Privacidad</a> y el uso de cookies técnicas necesarias</span>
                        </label>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-primary" onclick="window.gdprCompliance.acceptConsent()">Aceptar</button>
                    <button type="button" class="btn btn-secondary" onclick="window.gdprCompliance.rejectConsent()">Rechazar</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    /**
     * Aceptar consentimiento RGPD
     */
    acceptConsent() {
        const checkbox = document.getElementById('gdprConsentCheckbox');
        if (!checkbox || !checkbox.checked) {
            alert('Debe aceptar la política de privacidad para continuar');
            return;
        }

        const consentData = {
            accepted: true,
            timestamp: new Date().toISOString(),
            version: '1.0',
            ipAddress: 'unknown' // Se obtendrá del servidor
        };

        localStorage.setItem(this.consentKey, JSON.stringify(consentData));
        
        // Registrar consentimiento en Firestore
        this.registerConsent(consentData);

        // Cerrar modal
        const modal = document.getElementById('gdprConsentModal');
        if (modal) {
            modal.remove();
        }

        console.log('✅ Consentimiento RGPD aceptado');
    }

    /**
     * Rechazar consentimiento RGPD
     */
    rejectConsent() {
        const consentData = {
            accepted: false,
            timestamp: new Date().toISOString(),
            version: '1.0'
        };

        localStorage.setItem(this.consentKey, JSON.stringify(consentData));
        
        // Registrar rechazo en Firestore
        this.registerConsent(consentData);

        // Cerrar modal
        const modal = document.getElementById('gdprConsentModal');
        if (modal) {
            modal.remove();
        }

        alert('Sin su consentimiento, algunas funcionalidades pueden no estar disponibles.');
        console.log('⚠️ Consentimiento RGPD rechazado');
    }

    /**
     * Registrar consentimiento en Firestore
     */
    async registerConsent(consentData) {
        try {
            if (window.firebase && window.firebase.firestore) {
                await window.firebase.firestore().collection('gdpr_consents').add({
                    ...consentData,
                    userId: window.currentUser?.email || 'anonymous',
                    userAgent: navigator.userAgent,
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }
        } catch (error) {
            console.error('Error registrando consentimiento:', error);
        }
    }

    /**
     * Verificar si se ha dado consentimiento
     */
    hasConsent() {
        const consent = localStorage.getItem(this.consentKey);
        if (!consent) return false;
        
        try {
            const consentData = JSON.parse(consent);
            return consentData.accepted === true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Ejercer derecho de acceso (ARCO)
     */
    async exerciseAccessRight(userEmail) {
        try {
            // Obtener todos los datos del usuario
            const userData = await this.getUserData(userEmail);
            
            // Generar reporte de datos
            const report = this.generateDataReport(userData);
            
            // Enviar por email
            await this.sendDataReport(userEmail, report);
            
            return { success: true, message: 'Se ha enviado un reporte con sus datos por email' };
        } catch (error) {
            console.error('Error ejerciendo derecho de acceso:', error);
            return { success: false, message: 'Error al obtener sus datos' };
        }
    }

    /**
     * Ejercer derecho de rectificación
     */
    async exerciseRectificationRight(userEmail, corrections) {
        try {
            // Actualizar datos del usuario
            await this.updateUserData(userEmail, corrections);
            
            // Registrar en logs
            if (window.auditLogSystem) {
                await window.auditLogSystem.log('GDPR_RECTIFICATION', {
                    userEmail: userEmail,
                    corrections: corrections,
                    timestamp: new Date().toISOString()
                });
            }
            
            return { success: true, message: 'Datos actualizados correctamente' };
        } catch (error) {
            console.error('Error ejerciendo derecho de rectificación:', error);
            return { success: false, message: 'Error al actualizar sus datos' };
        }
    }

    /**
     * Ejercer derecho de supresión (derecho al olvido)
     */
    async exerciseDeletionRight(userEmail) {
        try {
            // Confirmar eliminación
            const confirmed = confirm(
                '¿Está seguro de que desea eliminar todos sus datos? Esta acción no se puede deshacer.'
            );
            
            if (!confirmed) {
                return { success: false, message: 'Eliminación cancelada' };
            }

            // Eliminar datos del usuario
            await this.deleteUserData(userEmail);
            
            // Registrar en logs
            if (window.auditLogSystem) {
                await window.auditLogSystem.log('GDPR_DELETION', {
                    userEmail: userEmail,
                    timestamp: new Date().toISOString()
                });
            }
            
            return { success: true, message: 'Sus datos han sido eliminados correctamente' };
        } catch (error) {
            console.error('Error ejerciendo derecho de supresión:', error);
            return { success: false, message: 'Error al eliminar sus datos' };
        }
    }

    /**
     * Obtener datos del usuario
     */
    async getUserData(userEmail) {
        if (!window.firebase || !window.firebase.firestore) {
            throw new Error('Firebase no está disponible');
        }

        const usersRef = window.firebase.firestore().collection('users');
        const query = usersRef.where('email', '==', userEmail);
        const snapshot = await query.get();
        
        if (snapshot.empty) {
            return null;
        }

        return snapshot.docs[0].data();
    }

    /**
     * Actualizar datos del usuario
     */
    async updateUserData(userEmail, corrections) {
        if (!window.firebase || !window.firebase.firestore) {
            throw new Error('Firebase no está disponible');
        }

        const usersRef = window.firebase.firestore().collection('users');
        const query = usersRef.where('email', '==', userEmail);
        const snapshot = await query.get();
        
        if (snapshot.empty) {
            throw new Error('Usuario no encontrado');
        }

        const docRef = snapshot.docs[0].ref;
        await docRef.update({
            ...corrections,
            updatedAt: new Date().toISOString()
        });
    }

    /**
     * Eliminar datos del usuario
     */
    async deleteUserData(userEmail) {
        if (!window.firebase || !window.firebase.firestore) {
            throw new Error('Firebase no está disponible');
        }

        const usersRef = window.firebase.firestore().collection('users');
        const query = usersRef.where('email', '==', userEmail);
        const snapshot = await query.get();
        
        if (!snapshot.empty) {
            await snapshot.docs[0].ref.delete();
        }

        // También eliminar de otras colecciones relacionadas
        // (appointments, notifications, etc.)
    }

    /**
     * Generar reporte de datos
     */
    generateDataReport(userData) {
        return {
            user: userData,
            generatedAt: new Date().toISOString(),
            format: 'RGPD'
        };
    }

    /**
     * Enviar reporte de datos por email
     */
    async sendDataReport(userEmail, report) {
        try {
            const response = await fetch(`${window.CLOUD_FUNCTIONS_BASE_URL || 'https://us-central1-turisteam-80f1b.cloudfunctions.net'}/sendEmail`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    to: userEmail,
                    from: 'u2389387944@gmail.com',
                    subject: 'Reporte de Datos Personales - Ejercicio de Derecho RGPD',
                    template: 'general_notice',
                    data: {
                        title: 'Reporte de Datos Personales',
                        content: `<pre>${JSON.stringify(report, null, 2)}</pre>`,
                        timestamp: new Date().toLocaleString('es-ES')
                    }
                })
            });

            return await response.json();
        } catch (error) {
            console.error('Error enviando reporte:', error);
            throw error;
        }
    }

    /**
     * Registrar actividad de procesamiento de datos
     */
    async registerDataProcessing(activity, purpose, legalBasis) {
        try {
            if (window.firebase && window.firebase.firestore) {
                await window.firebase.firestore().collection('data_processing_logs').add({
                    activity: activity,
                    purpose: purpose,
                    legalBasis: legalBasis,
                    timestamp: new Date().toISOString(),
                    userId: window.currentUser?.email || 'system'
                });
            }
        } catch (error) {
            console.error('Error registrando actividad de procesamiento:', error);
        }
    }
}

// Crear instancia global
if (typeof window !== 'undefined') {
    window.gdprCompliance = new GDPRCompliance();
    
    // Mostrar modal de consentimiento al cargar la página
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.gdprCompliance.showConsentModal();
        });
    } else {
        window.gdprCompliance.showConsentModal();
    }
    
    console.log('✅ Sistema de cumplimiento RGPD cargado');
}

