/*
Gestor de Políticas y Términos Legales
© 2024 - Sistema de Gestión del Ayuntamiento de Cobreros

Gestión de políticas de privacidad, términos y condiciones,
aviso legal y política de cookies

Contacto: editorturis@gmail.com
*/

class LegalPoliciesManager {
    constructor() {
        this.configKey = 'legal_policies_config';
        this.policies = {
            privacy: {
                title: 'Política de Privacidad',
                content: '',
                lastUpdated: null,
                version: '1.0'
            },
            terms: {
                title: 'Términos y Condiciones',
                content: '',
                lastUpdated: null,
                version: '1.0'
            },
            legal: {
                title: 'Aviso Legal',
                content: '',
                lastUpdated: null,
                version: '1.0'
            },
            cookies: {
                title: 'Política de Cookies',
                content: '',
                lastUpdated: null,
                version: '1.0'
            }
        };
        this.loadPolicies();
    }

    /**
     * Cargar políticas
     */
    loadPolicies() {
        try {
            const saved = localStorage.getItem(this.configKey);
            if (saved) {
                this.policies = { ...this.policies, ...JSON.parse(saved) };
            } else {
                // Cargar políticas por defecto
                this.loadDefaultPolicies();
            }
        } catch (error) {
            console.error('Error cargando políticas:', error);
            this.loadDefaultPolicies();
        }
    }

    /**
     * Cargar políticas por defecto
     */
    loadDefaultPolicies() {
        this.policies.privacy.content = this.getDefaultPrivacyPolicy();
        this.policies.terms.content = this.getDefaultTerms();
        this.policies.legal.content = this.getDefaultLegalNotice();
        this.policies.cookies.content = this.getDefaultCookiePolicy();
    }

    /**
     * Guardar políticas
     */
    savePolicies() {
        localStorage.setItem(this.configKey, JSON.stringify(this.policies));
        
        // Sincronizar con Firestore
        if (window.firebase && window.firebase.firestore) {
            window.firebase.firestore().collection('legal_policies').doc('current').set({
                policies: this.policies,
                updatedAt: new Date().toISOString(),
                updatedBy: window.currentUser?.email || 'system'
            }).catch(error => {
                console.error('Error guardando políticas en Firestore:', error);
            });
        }
    }

    /**
     * Actualizar política
     */
    updatePolicy(policyType, content, version = null) {
        if (!this.policies[policyType]) {
            throw new Error(`Tipo de política no válido: ${policyType}`);
        }

        this.policies[policyType].content = content;
        this.policies[policyType].lastUpdated = new Date().toISOString();
        if (version) {
            this.policies[policyType].version = version;
        } else {
            // Incrementar versión automáticamente
            const currentVersion = parseFloat(this.policies[policyType].version) || 1.0;
            this.policies[policyType].version = (currentVersion + 0.1).toFixed(1);
        }

        this.savePolicies();

        // Registrar en logs
        if (window.auditLogSystem) {
            window.auditLogSystem.log('LEGAL_POLICY_UPDATED', {
                policyType: policyType,
                version: this.policies[policyType].version
            });
        }

        return { success: true, policy: this.policies[policyType] };
    }

    /**
     * Obtener política
     */
    getPolicy(policyType) {
        return this.policies[policyType] || null;
    }

    /**
     * Mostrar política en modal
     */
    showPolicy(policyType) {
        const policy = this.getPolicy(policyType);
        if (!policy) {
            showNotification('Política no encontrada', 'error');
            return;
        }

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 800px; max-height: 90vh; overflow-y: auto;">
                <div class="modal-header">
                    <h2>${policy.title}</h2>
                    <button class="close-modal" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <p style="color: #666; font-size: 0.9rem;">
                        Última actualización: ${policy.lastUpdated ? new Date(policy.lastUpdated).toLocaleString('es-ES') : 'N/A'} | 
                        Versión: ${policy.version}
                    </p>
                    <div style="margin-top: 1.5rem; line-height: 1.6;">
                        ${policy.content || '<p>Contenido no disponible</p>'}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" onclick="this.closest('.modal').remove()">Cerrar</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    /**
     * Política de privacidad por defecto
     */
    getDefaultPrivacyPolicy() {
        return `
<h3>1. Responsable del Tratamiento</h3>
<p>El Ayuntamiento de Cobreros es el responsable del tratamiento de los datos personales recogidos a través de este sitio web.</p>

<h3>2. Datos Recopilados</h3>
<p>Recopilamos los siguientes datos personales:</p>
<ul>
    <li>Datos de identificación (nombre, DNI, email, teléfono)</li>
    <li>Datos de contacto (dirección, código postal)</li>
    <li>Datos de navegación (cookies técnicas necesarias)</li>
    <li>Datos de citas previas y solicitudes</li>
</ul>

<h3>3. Finalidad del Tratamiento</h3>
<p>Los datos se utilizan para:</p>
<ul>
    <li>Gestión de citas previas</li>
    <li>Envío de notificaciones oficiales</li>
    <li>Mejora de nuestros servicios</li>
    <li>Cumplimiento de obligaciones legales</li>
</ul>

<h3>4. Derechos del Usuario</h3>
<p>Usted tiene derecho a acceder, rectificar, suprimir, oponerse, limitar y portar sus datos personales. Para ejercer estos derechos, contacte con: aytocobreros@gmail.com</p>

<h3>5. Conservación de Datos</h3>
<p>Los datos se conservarán durante el tiempo necesario para cumplir con las finalidades para las que fueron recogidos y las obligaciones legales aplicables.</p>
        `;
    }

    /**
     * Términos y condiciones por defecto
     */
    getDefaultTerms() {
        return `
<h3>1. Aceptación de los Términos</h3>
<p>Al acceder y utilizar este sitio web, usted acepta estos términos y condiciones.</p>

<h3>2. Uso del Sitio</h3>
<p>El sitio web está destinado a proporcionar información y servicios del Ayuntamiento de Cobreros. El uso debe ser conforme a la ley y no debe interferir con el funcionamiento del sitio.</p>

<h3>3. Propiedad Intelectual</h3>
<p>Todo el contenido del sitio web es propiedad del Ayuntamiento de Cobreros y está protegido por derechos de propiedad intelectual.</p>

<h3>4. Limitación de Responsabilidad</h3>
<p>El Ayuntamiento no se hace responsable de los daños derivados del uso del sitio web o de la imposibilidad de acceder a él.</p>
        `;
    }

    /**
     * Aviso legal por defecto
     */
    getDefaultLegalNotice() {
        return `
<h3>1. Datos Identificativos</h3>
<p><strong>Denominación:</strong> Ayuntamiento de Cobreros</p>
<p><strong>Dirección:</strong> [Dirección completa]</p>
<p><strong>Email:</strong> aytocobreros@gmail.com</p>

<h3>2. Objeto</h3>
<p>Este aviso legal regula el uso del sitio web del Ayuntamiento de Cobreros.</p>

<h3>3. Condiciones de Uso</h3>
<p>El acceso y uso del sitio web implica la aceptación de las condiciones de uso establecidas en este aviso legal.</p>

<h3>4. Responsabilidad</h3>
<p>El Ayuntamiento se reserva el derecho de modificar cualquier información del sitio web sin previo aviso.</p>
        `;
    }

    /**
     * Política de cookies por defecto
     */
    getDefaultCookiePolicy() {
        return `
<h3>1. ¿Qué son las Cookies?</h3>
<p>Las cookies son pequeños archivos de texto que se almacenan en su dispositivo cuando visita nuestro sitio web.</p>

<h3>2. Tipos de Cookies Utilizadas</h3>
<p>Utilizamos los siguientes tipos de cookies:</p>
<ul>
    <li><strong>Cookies técnicas:</strong> Necesarias para el funcionamiento del sitio</li>
    <li><strong>Cookies de sesión:</strong> Para mantener su sesión activa</li>
</ul>

<h3>3. Finalidad</h3>
<p>Las cookies se utilizan para:</p>
<ul>
    <li>Garantizar el funcionamiento del sitio web</li>
    <li>Mantener su sesión de usuario</li>
    <li>Mejorar la experiencia de usuario</li>
</ul>

<h3>4. Gestión de Cookies</h3>
<p>Puede gestionar las cookies a través de la configuración de su navegador.</p>
        `;
    }
}

// Crear instancia global
if (typeof window !== 'undefined') {
    window.legalPoliciesManager = new LegalPoliciesManager();
    console.log('✅ Gestor de políticas legales cargado');
}

