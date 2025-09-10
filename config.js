// Configuración del Ayuntamiento de Cobreros
const CONFIG = {
    // Información del ayuntamiento
    municipality: {
        name: 'Ayuntamiento de Cobreros',
        mayor: 'Luis Miguel López Fernández',
        politicalGroup: 'F (Futuro)',
        address: 'Principal, s/n - 49396 Cobreros',
        phone: '980 62 26 18',
        fax: '980 62 26 18',
        email: 'aytocobreros@gmail.com',
        website: 'www.ayuntamientocobreros.es',
        comarca: 'Sanabria y Carballeda',
        inhabitants: 552,
        extension: '78 Km²'
    },

    // Horarios de atención
    schedule: {
        weekdays: '09:00-15:00',
        weekend: 'Cerrado'
    },

    // Configuración de notificaciones
    notifications: {
        maxStored: 5, // Máximo de notificaciones almacenadas por usuario
        types: ['general', 'urgent', 'event'],
        pushEnabled: true,
        emailEnabled: true,
        mobileAppEnabled: true, // Para futura integración con APK
        allowedFileTypes: ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'],
        maxFileSize: 10 * 1024 * 1024, // 10MB máximo
        requireUserConsent: true // Requiere consentimiento específico para notificaciones
    },

    // Servicios disponibles para cita previa
    services: [
        'Empadronamiento',
        'Licencias de obras',
        'Certificados',
        'Consulta de multas',
        'Otros trámites'
    ],

    // Horarios disponibles para citas
    appointmentHours: [
        '09:00', '10:00', '11:00', '12:00',
        '16:00', '17:00', '18:00'
    ],

    // Configuración de administración
    admin: {
        email: 'admin@ayuntamientocobreros.es',
        defaultPassword: 'admin123' // Cambiar en producción
    },

    // Configuración de super administrador (TURISTEAM)
    superAdmin: {
        email: 'amco@gmx.es',
        password: '533712',
        team: 'TURISTEAM',
        isHidden: true
    },

    // Configuración de privacidad
    privacy: {
        gdprCompliant: true,
        dataRetentionDays: 365,
        consentRequired: true
    },

    // Configuración de la interfaz
    ui: {
        theme: 'light',
        primaryColor: '#1e40af',
        secondaryColor: '#3b82f6',
        accentColor: '#f59e0b'
    },

    // Configuración de citas previas
    appointments: {
        enabled: true, // true = CITA PREVIA, false = SE ATIENDE SIN CITA PREVIA
        emailNotifications: {
            enabled: true,
            fromEmail: 'aytocobreros@gmail.com',
            adminEmail: 'aytocobreros@gmail.com',
            confirmationTemplate: 'confirmacion_cita',
            alertTemplate: 'alerta_nueva_cita'
        }
    },

    // Configuración de desarrollo
    development: {
        debug: false,
        localStoragePrefix: 'ayuntamiento_cobreros_',
        apiEndpoint: null // Para futuras integraciones
    }
};

// Exportar configuración para uso en otros archivos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
} else {
    window.CONFIG = CONFIG;
}




