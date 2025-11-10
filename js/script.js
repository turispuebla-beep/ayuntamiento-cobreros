const PUSH_WARNING_SESSION_PREFIX = 'pushWarningShown:';
const CLOUD_FUNCTIONS_BASE_URL = 'https://us-central1-turisteam-80f1b.cloudfunctions.net';
const PWA_INSTALLED_KEY = 'pwaInstalled';

let deferredPwaPrompt = null;

function getFriendlyStorageErrorMessage(error) {
    if (!error) {
        return 'No se pudo subir el documento adjunto. Inténtalo de nuevo.';
    }

    const code = error.code || '';
    const message = (typeof error.message === 'string' ? error.message : '').toLowerCase();

    switch (code) {
        case 'storage/unauthorized':
            return 'No tienes permisos para subir documentos. Inicia sesión de nuevo o contacta con el administrador.';
        case 'storage/canceled':
            return 'Se canceló la subida del documento.';
        case 'storage/quota-exceeded':
            return 'Has alcanzado el límite de almacenamiento disponible.';
        case 'storage/retry-limit-exceeded':
            return 'No se pudo subir el documento por problemas de red. Inténtalo de nuevo más tarde.';
        case 'storage/invalid-checksum':
            return 'El archivo se corrompió durante la subida. Vuelve a intentarlo.';
        case 'storage/object-not-found':
            return 'No se pudo encontrar el archivo adjunto en el servidor.';
        default:
            break;
    }

    if (message.includes('does not have storage bucket')) {
        return 'El proyecto de Firebase no tiene configurado un bucket de Storage. Revisa la configuración.';
    }
    if (message.includes('network') || message.includes('fetch')) {
        return 'No hay conexión estable. Comprueba tu red e inténtalo de nuevo.';
    }
    if (message.includes('maximum upload retry')) {
        return 'La subida tardó demasiado y se canceló. Inténtalo otra vez.';
    }
    if (message.includes('unknown error')) {
        return 'Ocurrió un error desconocido al subir el documento. Revisa la consola para más detalles.';
    }

    return 'No se pudo subir el documento adjunto. Vuelve a intentarlo y revisa la consola para más detalles.';
}

const PLATFORM_ICONS = {
    android: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="%23A4C639" d="M17.6 8.48l1.42-2.46a.5.5 0 10-.87-.5l-1.47 2.55A8.04 8.04 0 0012 7a8.04 8.04 0 00-3.68.99L6.85 5.52a.5.5 0 10-.87.5l1.42 2.46A7.03 7.03 0 005 13v5a1 1 0 001 1h1v3a1 1 0 002 0v-3h6v3a1 1 0 002 0v-3h1a1 1 0 001-1v-5a7.03 7.03 0 00-2.4-4.52zM9 11a1 1 0 110-2 1 1 0 010 2zm6 0a1 1 0 110-2 1 1 0 010 2z"/></svg>',
    ios: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="%23000000" d="M16.74 13.66c.02 2.42 2.11 3.22 2.13 3.23-.02.05-.33 1.14-1.09 2.26-.66.97-1.34 1.95-2.42 1.97-1.06.02-1.4-.64-2.62-.64-1.22 0-1.6.62-2.61.66-1.05.04-1.86-1.05-2.53-2.02-1.38-2.01-2.44-5.69-1.02-8.17.7-1.21 1.95-1.98 3.32-2 .1 0 .21.02.31.04.82.23 1.68.81 2.2.81.51 0 1.42-.8 2.4-.82 1.02-.02 1.99.53 2.53 1.36-1.11.6-1.67 1.58-1.64 3.32zm-2.01-6.08c.45-.54.76-1.3.68-2.06-.66.03-1.46.44-1.94.98-.42.48-.78 1.26-.68 2.02.72.06 1.46-.37 1.94-.94z"/></svg>',
    huawei: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" rx="5" fill="%23d81b60"/><path fill="%23ffffff" d="M6.5 6.5h2.1v4.6h6.8V6.5h2.1v11h-2.1v-4.8H8.6v4.8H6.5z"/></svg>'
};

const PWA_INSTRUCTIONS = {
    android: `
        <ol>
            <li>Abre el menú <strong>⋮</strong> del navegador.</li>
            <li>Selecciona <strong>"Añadir a pantalla principal"</strong>.</li>
            <li>Confirma el nombre y pulsa <strong>Añadir</strong>.</li>
        </ol>
    `,
    huawei: `
        <ol>
            <li>Pulsa el menú <strong>⋮</strong> (o los tres puntos) de tu navegador.</li>
            <li>Elige <strong>"Agregar a pantalla principal"</strong>.</li>
            <li>Confirma con <strong>Añadir</strong> para crear el acceso directo.</li>
        </ol>
    `,
    ios: `
        <ol>
            <li>En Safari, pulsa el botón <strong>Compartir</strong> (<span aria-hidden="true">⬆️</span>).</li>
            <li>Selecciona <strong>"Añadir a pantalla de inicio"</strong>.</li>
            <li>Confirma pulsando <strong>Añadir</strong> para instalar la app.</li>
        </ol>
    `
};

// Función genérica para eliminar tarjetas por títulos
function removeTarjetasByTitles(titles) {
    if (!culturaOcioConfig.tarjetas || !Array.isArray(culturaOcioConfig.tarjetas)) {
        return false;
    }
    const initialLength = culturaOcioConfig.tarjetas.length;
    culturaOcioConfig.tarjetas = culturaOcioConfig.tarjetas.filter(tarjeta => {
        const titulo = tarjeta.titulo || '';
        return !titles.some(nombre => titulo.includes(nombre));
    });
    if (culturaOcioConfig.tarjetas.length < initialLength) {
        localStorage.setItem('culturaOcioConfig', JSON.stringify(culturaOcioConfig));
        return true;
    }
    return false;
}

// Variables globales
let currentUser = null;
let isAdmin = false;
let isSuperAdmin = false; // Super administrador oculto
let notifications = [];
let users = [];
let news = [];
const NEWS_ATTACHMENT_MAX_SIZE = 3 * 1024 * 1024; // 3MB
const BANDO_ATTACHMENT_MAX_SIZE = 3 * 1024 * 1024; // 3MB
const DEFAULT_QUILL_TOOLBAR = [
    [{ 'header': [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    [{ 'align': [] }],
    ['link', 'blockquote', 'code-block', 'clean']
];
let bandos = [];
let administrators = []; // Lista de administradores creados
let documents = []; // Lista de documentos subidos
let events = []; // Lista de eventos de cultura y ocio
let quickAccess = []; // Lista de tarjetas de acceso rápido
let documentDescriptionEditor = null;
// Estado del sistema de citas previas - Se carga desde localStorage
let appointmentsEnabled = null; // Se inicializa en loadAppointmentSettings()
let appointments = []; // Lista de citas previas solicitadas
let publicNotifications = []; // Lista de notificaciones públicas
let selectedReceivedNotifications = new Set();
let selectedUserNotifications = new Set();
const DEFAULT_CARNET_CONFIG = {
    accountNumber: '',
    feeEmpadronado: '',
    feeDescendiente: '',
    feeVisitante: '',
    instructions: 'Una vez enviada la solicitud, realiza el ingreso de la cuota correspondiente indicando tu nombre y apellidos en el concepto.',
    emailRecipient: 'aytocobreros@gmail.com',
    micologicoVisible: false,
    cotoVisible: false,
    cotoAccountNumber: '',
    cotoFeeEmpadronado: '',
    cotoInstructions: 'El permiso cinegético municipal solo está disponible para personas empadronadas en el Ayuntamiento de Cobreros.',
    cotoEmailRecipient: 'aytocobreros@gmail.com',
    updatedAt: null
};
let carnetConfig = { ...DEFAULT_CARNET_CONFIG };
let carnetRequests = [];
let cotoRequests = [];
const CARNET_REQUESTS_LOCAL_KEY = 'carnetRequests';
const COTO_REQUESTS_LOCAL_KEY = 'cotoRequests';

function applyCalendarStylesFromConfig() {
    if (typeof CONFIG === 'undefined' || !CONFIG?.appointments?.calendarStyles) {
        return;
    }
    const styles = CONFIG.appointments.calendarStyles;
    const root = document.documentElement;
    if (styles.availableBackground) {
        root.style.setProperty('--calendar-available-bg', styles.availableBackground);
    }
    if (styles.availableBorder) {
        root.style.setProperty('--calendar-available-border', styles.availableBorder);
    }
    if (styles.disabledBackground) {
        root.style.setProperty('--calendar-disabled-bg', styles.disabledBackground);
    }
    if (styles.disabledBorder) {
        root.style.setProperty('--calendar-disabled-border', styles.disabledBorder);
    }
    if (styles.fullyBookedBackground) {
        root.style.setProperty('--calendar-fully-booked-bg', styles.fullyBookedBackground);
    }
    if (styles.fullyBookedBorder) {
        root.style.setProperty('--calendar-fully-booked-border', styles.fullyBookedBorder);
    }
}

function getDiaSinCitaMensaje() {
    if (typeof window !== 'undefined' && window.customDiaSinCitaMensaje) {
        return window.customDiaSinCitaMensaje;
    }
    if (typeof CONFIG !== 'undefined' && CONFIG?.appointments?.messages?.dayWithoutAppointment) {
        return CONFIG.appointments.messages.dayWithoutAppointment;
    }
    return 'Día sin cita previa. Atención presencial sin cita disponible.';
}

function mostrarDiaSinCitaMensaje() {
    const mensaje = getDiaSinCitaMensaje();
    if (typeof showNotification === 'function') {
        showNotification(mensaje, 'info');
    } else {
        alert(mensaje);
    }
}

// Super administrador oculto - Credenciales codificadas para seguridad
// Las credenciales están codificadas en base64 para no ser visibles en el código fuente
const SUPER_ADMIN = {
    // Email: editorturis@gmail.com (codificado)
    email: atob('ZWRpdG9ydHVyaXNAZ21haWwuY29t'),
    // Password: 29102012 (codificado)
    password: atob('MjkxMDIwMTI='),
    name: 'Super Admin',
    isHidden: true,
    isSuperAdmin: true,
    team: 'TURISTEAM'
};

// Credenciales de administrador ocultas (codificadas para seguridad)
// Las credenciales están codificadas en base64 para ocultarlas del código fuente
const ADMIN_CREDENTIALS = {
    // Email: aytocobreros@gmail.com (codificado)
    email: atob('YXl0b2NvYnJlcm9zQGdtYWlsLmNvbQ=='),
    // Password: admin123 (codificado)  
    password: atob('YWRtaW4xMjM='),
    name: 'Administrador Ayuntamiento',
    isHidden: true,
    isAdmin: true
};

// Inicialización cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
    // PRIMERO: Verificar versión de datos y migrar si es necesario
    if (typeof checkDataVersion === 'function') {
        checkDataVersion();
    }
    
    // SEGUNDO: Verificar integridad de datos
    if (typeof verifyDataIntegrity === 'function') {
        verifyDataIntegrity();
    }
    
    // TERCERO: Crear backup antes de continuar
    if (typeof createDataBackup === 'function') {
        createDataBackup();
    }
    
    initializeApp();
    setupEventListeners();
    loadData();
    loadAdministrators();
    loadDocuments();
    loadEvents();
    renderEventos();
    updateCulturaOcioSection();
    loadQuickAccess();
    initializeDocumentDescriptionEditor();
    
    if (typeof applyMaintenanceMode === 'function') {
        applyMaintenanceMode();
    }

    if (typeof initializeMaintenanceModeUI === 'function') {
        initializeMaintenanceModeUI();
    }

    applyCalendarStylesFromConfig();

    // Cargar configuración de citas previas (CRÍTICO - SIEMPRE PRIMERO)
    loadAppointmentSettings();
    
    // Asegurar que se carga después del DOM
    setTimeout(() => {
        loadAppointmentSettings();
        Logger.log('🔄 Segunda carga de configuración de citas (seguridad)');
    }, 500);
    
    // Verificación adicional para asegurar persistencia
    setTimeout(() => {
        const savedSettings = localStorage.getItem('appointmentSettings');
        if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            Logger.log('🔍 Verificación de persistencia:', settings.enabled ? 'CITA PREVIA' : 'SIN CITA PREVIA');
            
            // Forzar actualización de UI si es necesario
            if (appointmentsEnabled !== settings.enabled) {
                Logger.warn('⚠️ Inconsistencia detectada, corrigiendo...');
                appointmentsEnabled = settings.enabled;
                updateAppointmentUI();
            }
        } else {
            Logger.warn('⚠️ No se encontró configuración guardada, usando valor por defecto');
        }
    }, 1000);
    
    // Migrar usuarios a Firestore si es necesario
    migrateUsersToFirestore();
    
    // Asegurar carga de usuarios después de migración
    setTimeout(() => {
        const currentUsers = JSON.parse(localStorage.getItem('users') || '[]');
        if (currentUsers.length !== users.length) {
            Logger.log('🔄 Recargando usuarios por seguridad...');
            users = currentUsers;
        }
        Logger.log(`👥 Total usuarios en memoria: ${users.length}`);
    }, 1000);
    
    // Inicializar PWA
    initializePWA();

    // Inicializar módulo de carnés micológicos
    initializeCarnetModule();
});

// Inicializar la aplicación
function initializeApp() {
    // SEGURIDAD: Verificar sesión al iniciar, pero NO restaurar automáticamente isAdmin
    // Solo restaurar si hay un usuario válido y la sesión es reciente
    
    const rememberSession = localStorage.getItem('rememberUserSession') === 'true';
    const savedUser = rememberSession ? localStorage.getItem('currentUser') : null;
    const savedAdmin = rememberSession ? localStorage.getItem('isAdmin') : null;
    const savedSuperAdmin = rememberSession ? localStorage.getItem('isSuperAdmin') : null;
    
    // Por defecto, no hay sesión
    currentUser = null;
    isAdmin = false;
    isSuperAdmin = false;
    
    // Ocultar botón de admin por defecto
    const adminBtn = document.getElementById('adminBtn');
    if (adminBtn) {
        adminBtn.style.display = 'none';
    }
    
    if (!rememberSession) {
        // Limpiar cualquier sesión guardada al iniciar la página si no se solicitó recordar
        localStorage.removeItem('currentUser');
        localStorage.removeItem('isAdmin');
        localStorage.removeItem('isSuperAdmin');
    } else if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            isAdmin = savedAdmin === 'true';
            isSuperAdmin = savedSuperAdmin === 'true';
        } catch (error) {
            console.warn('No se pudo restaurar la sesión guardada:', error);
            currentUser = null;
            isAdmin = false;
            isSuperAdmin = false;
            localStorage.removeItem('currentUser');
            localStorage.removeItem('isAdmin');
            localStorage.removeItem('isSuperAdmin');
            localStorage.removeItem('rememberUserSession');
        }
    }
    
    // Actualizar interfaz
    updateUserInterface();

    // Inicializar configuración del consultorio médico
    loadConsultorioConfig();
    
    // Cargar configuración de teléfonos de interés
    loadTelefonosInteresConfig();
    
    // Cargar configuración de transporte
    loadTransporteConfig();
    
    // Configurar formulario de notificaciones
    setupNotificationForm();
    

    // Configurar notificaciones push
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }

    // Cargar notificaciones
    loadNotifications();
    
    // Cargar configuración de citas previas
    loadAppointmentSettings();
    
    // Cargar citas previas
    loadAppointments();
    
    // Cargar notificaciones públicas
    loadPublicNotifications();
    
    // Configurar modal de GDPR
    setupGDPRModal();
    
    // Configurar modal de edición de citas
    setupEditAppointmentModal();
    
    // Configurar modal de notificaciones públicas
    setupPublicNotificationModal();
    
    
    // Inicializar badge de notificación municipal
    updateMunicipalNotificationBadge();
    
    // Limpiar formularios al cargar la página (con delay para asegurar que los elementos estén cargados)
    setTimeout(() => {
        clearAllForms();
        // Limpiar hash de la URL para evitar que se posicione en una sección específica
        if (window.location.hash) {
            window.location.hash = '';
        }
        // Forzar scroll al inicio de la página
        window.scrollTo(0, 0);
        
        // Cargar servicios
        loadServicios();
    }, 100);
    
    // Limpiar formularios cuando se cierre la página
    window.addEventListener('beforeunload', clearAllForms);
    
    // Asegurar que la página esté en el inicio cuando se carga completamente
    window.addEventListener('load', () => {
        setTimeout(() => {
            // Forzar scroll al inicio
            window.scrollTo(0, 0);
            // Limpiar hash si existe
            if (window.location.hash) {
                window.location.hash = '';
            }
            // Forzar limpieza completa
            clearAllForms();
            // Asegurar que solo el enlace de inicio esté activo
            resetNavigationState();
        }, 50);
    });
    
    // Función adicional para forzar estado inicial
    function forceInitialState() {
        // Scroll al inicio
        window.scrollTo(0, 0);
        
        // Limpiar hash
        if (window.location.hash) {
            window.location.hash = '';
        }
        
        // Limpiar formularios
        clearAllForms();
        
        // Resetear estado de navegación
        resetNavigationState();
        
        Logger.log('Estado inicial forzado');
    }
    
    // Función para resetear el estado de navegación
    function resetNavigationState() {
        // Remover clases activas de navegación
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        // Activar solo el enlace de inicio
        const inicioLink = document.querySelector('a[href="#inicio"]');
        if (inicioLink) {
            inicioLink.classList.add('active');
        }
        
        Logger.log('Estado de navegación reseteado');
    }
    
    // Ejecutar función de estado inicial
    setTimeout(forceInitialState, 200);
    
    // Crear botón de admin dinámicamente para asegurar que se vea
    createAdminButton();
}

// Crear botón de admin dinámicamente
function createAdminButton() {
    // Remover botón existente si existe
    const existingBtn = document.getElementById('adminLoginBtn');
    if (existingBtn) {
        existingBtn.remove();
    }
    
    // Crear nuevo botón
    const adminBtn = document.createElement('button');
    adminBtn.id = 'adminLoginBtn';
    adminBtn.className = 'admin-access-btn';
    adminBtn.title = 'Acceso Administradores';
    adminBtn.innerHTML = '<i class="fas fa-cog"></i><br><span style="font-size: 8px;">ADMIN</span>';
    
    // Aplicar estilos directamente
    adminBtn.style.cssText = `
        position: fixed !important;
        top: 20px !important;
        right: 20px !important;
        width: 70px !important;
        height: 70px !important;
        border-radius: 50% !important;
        background: #22c55e !important;
        color: white !important;
        border: 2px solid #16a34a !important;
        font-size: 16px !important;
        cursor: pointer !important;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
        z-index: 9999 !important;
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        justify-content: center !important;
        visibility: visible !important;
        opacity: 1 !important;
    `;
    
    // Agregar event listener
    adminBtn.addEventListener('click', () => openModal('adminLoginModal'));
    
    // Agregar al body
    document.body.appendChild(adminBtn);
    
    Logger.log('Botón de admin creado dinámicamente');
}
// Limpiar todos los formularios al cargar la página
function clearAllForms() {
    Logger.log('Limpiando formularios...');
    
    // Cerrar y limpiar formulario de cita previa
    const appointmentFormContainer = document.getElementById('appointmentFormContainer');
    const appointmentForm = document.getElementById('appointmentForm');
    const toggleBtn = document.getElementById('toggleAppointmentForm');
    
    if (appointmentFormContainer) {
        appointmentFormContainer.style.display = 'none';
    }
    
    if (toggleBtn) {
        toggleBtn.innerHTML = '<i class="fas fa-calendar-plus"></i> Solicitar Cita Previa';
        toggleBtn.style.background = '';
    }
    
    if (appointmentForm) {
        appointmentForm.reset();
        // Limpiar también los valores por defecto de los selects
        const selects = appointmentForm.querySelectorAll('select');
        selects.forEach(select => {
            select.selectedIndex = 0;
        });
        // Limpiar inputs de fecha y hora
        const dateInput = appointmentForm.querySelector('input[type="date"]');
        if (dateInput) {
            dateInput.value = '';
        }
        // Limpiar textarea de comentarios
        const commentsTextarea = appointmentForm.querySelector('textarea');
        if (commentsTextarea) {
            commentsTextarea.value = '';
        }
        // Limpiar campo DNI
        const dniInput = appointmentForm.querySelector('input[name="dni"]');
        if (dniInput) {
            dniInput.value = '';
        }
        // Limpiar checkbox de GDPR
        const gdprCheckbox = appointmentForm.querySelector('input[name="gdprConsent"]');
        if (gdprCheckbox) {
            gdprCheckbox.checked = false;
        }
        Logger.log('Formulario de cita previa cerrado y limpiado completamente');
    }
    
    // Limpiar formulario de login
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.reset();
        Logger.log('Formulario de login limpiado');
    }
    
    // Limpiar formulario de registro
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.reset();
        // Ocultar campos de documento al resetear
        const dniGroup = document.getElementById('dniGroup');
        const passportGroup = document.getElementById('passportGroup');
        const otherDocGroup = document.getElementById('otherDocGroup');
        if (dniGroup) dniGroup.style.display = 'none';
        if (passportGroup) passportGroup.style.display = 'none';
        if (otherDocGroup) otherDocGroup.style.display = 'none';
        // Remover atributos required
        const dniInput = document.getElementById('regDNI');
        const passportInput = document.getElementById('regPassport');
        const otherDocInput = document.getElementById('regOtherDoc');
        const otherDocTypeInput = document.getElementById('regOtherDocType');
        if (dniInput) dniInput.removeAttribute('required');
        if (passportInput) passportInput.removeAttribute('required');
        if (otherDocInput) otherDocInput.removeAttribute('required');
        if (otherDocTypeInput) otherDocTypeInput.removeAttribute('required');
        Logger.log('Formulario de registro limpiado');
    }
    
    // Limpiar formulario de admin login
    const adminLoginForm = document.getElementById('adminLoginForm');
    if (adminLoginForm) {
        adminLoginForm.reset();
        Logger.log('Formulario de admin login limpiado');
    }
    
    // Cerrar todos los modales
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.style.display = 'none';
        Logger.log('Modal cerrado:', modal.id);
    });
    
    // Forzar cierre de cualquier modal que pueda estar abierto
    const openModals = document.querySelectorAll('.modal[style*="block"]');
    openModals.forEach(modal => {
        modal.style.display = 'none';
        Logger.log('Modal forzado a cerrar:', modal.id);
    });
    
    // Cerrar centro de notificaciones si está abierto
    const notificationCenter = document.getElementById('notificationCenter');
    if (notificationCenter && notificationCenter.classList.contains('show')) {
        notificationCenter.classList.remove('show');
        Logger.log('Centro de notificaciones cerrado');
    }
    
    // Cerrar menú móvil si está abierto
    const mainNav = document.querySelector('.main-nav');
    if (mainNav && mainNav.classList.contains('mobile-open')) {
        mainNav.classList.remove('mobile-open');
        Logger.log('Menú móvil cerrado');
    }
    
    // Cerrar cualquier elemento con clase 'show'
    const showElements = document.querySelectorAll('.show');
    showElements.forEach(element => {
        element.classList.remove('show');
        Logger.log('Elemento con clase show cerrado:', element.id || element.className);
    });
    
    console.log('Limpieza de formularios completada');
}
// Configurar event listeners
function setupEventListeners() {
    // Navegación suave
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            scrollToSection(targetId);
            updateActiveNavLink(this);
            
            // Si se hace clic en cita previa, abrir el formulario automáticamente
            if (targetId === 'cita-previa') {
                setTimeout(() => {
                    // Abrir el formulario de cita previa automáticamente
                    const formContainer = document.getElementById('appointmentFormContainer');
                    const toggleBtn = document.getElementById('toggleAppointmentForm');
                    
                    if (formContainer && formContainer.style.display === 'none') {
                        formContainer.style.display = 'block';
                        toggleBtn.innerHTML = '<i class="fas fa-calendar-minus"></i> Ocultar Formulario';
                        toggleBtn.style.background = '#ef4444';
                        console.log('Formulario de cita previa abierto automáticamente al navegar');
                    }
                }, 300);
            }
        });
    });

    // Botones de modal
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const adminLoginBtn = document.getElementById('adminLoginBtn');
    const adminBtn = document.getElementById('adminBtn');
    
    console.log('Configurando event listeners:', {
        loginBtn: !!loginBtn,
        registerBtn: !!registerBtn,
        adminLoginBtn: !!adminLoginBtn,
        adminBtn: !!adminBtn
    });
    
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            console.log('Login button clicked');
            openModal('loginModal');
        });
    }
    
    if (registerBtn) {
        registerBtn.addEventListener('click', () => {
            console.log('Register button clicked');
            openModal('registerModal');
        });
    }
    
    if (adminLoginBtn) {
        adminLoginBtn.addEventListener('click', () => {
            console.log('Admin login button clicked');
            openModal('adminLoginModal');
        });
    }
    
    if (adminBtn) {
        adminBtn.addEventListener('click', () => {
            // Verificar sesión antes de abrir panel admin
            if (!isAdmin || !currentUser) {
                showNotification('Debe iniciar sesión como administrador primero', 'error');
                openModal('adminLoginModal');
                return;
            }
            console.log('Admin button clicked - Sesión válida');
            openAdminPanel();
        });
    }

    // Botón para abrir/cerrar formulario de cita previa
    document.getElementById('toggleAppointmentForm').addEventListener('click', toggleAppointmentForm);
    document.getElementById('cancelAppointment').addEventListener('click', closeAppointmentForm);

    // Cerrar modales
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            closeModal(modal.id);
        });
    });

    // Cerrar modal al hacer clic fuera
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeModal(this.id);
            }
        });
    });

    // Formularios
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    // El registro se maneja a través de recaptcha.js si está disponible
    // Si recaptcha no está disponible, agregar listener directo
    const registerForm = document.getElementById('registerForm');
    if (registerForm && typeof initializeRecaptcha === 'undefined') {
        registerForm.addEventListener('submit', handleRegister);
    }
    document.getElementById('adminLoginForm').addEventListener('submit', handleAdminLogin);
    
    const loginPasswordToggle = document.getElementById('loginPasswordToggle');
    if (loginPasswordToggle) {
        loginPasswordToggle.addEventListener('click', () => togglePasswordVisibility('loginPassword', loginPasswordToggle));
    }

    const loginRemember = document.getElementById('loginRemember');
    if (loginRemember) {
        loginRemember.checked = localStorage.getItem('rememberUserSession') === 'true';
    }
    
    // Manejar cambio de tipo de documento en registro
    const documentTypeSelect = document.getElementById('documentType');
    if (documentTypeSelect) {
        documentTypeSelect.addEventListener('change', function() {
            const dniGroup = document.getElementById('dniGroup');
            const passportGroup = document.getElementById('passportGroup');
            const otherDocGroup = document.getElementById('otherDocGroup');
            const dniInput = document.getElementById('regDNI');
            const passportInput = document.getElementById('regPassport');
            const otherDocInput = document.getElementById('regOtherDoc');
            const otherDocTypeInput = document.getElementById('regOtherDocType');
            
            // Ocultar todos los grupos
            if (dniGroup) dniGroup.style.display = 'none';
            if (passportGroup) passportGroup.style.display = 'none';
            if (otherDocGroup) otherDocGroup.style.display = 'none';
            
            // Limpiar campos
            if (dniInput) {
                dniInput.value = '';
                dniInput.removeAttribute('required');
            }
            if (passportInput) {
                passportInput.value = '';
                passportInput.removeAttribute('required');
            }
            if (otherDocInput) {
                otherDocInput.value = '';
                otherDocInput.removeAttribute('required');
            }
            if (otherDocTypeInput) {
                otherDocTypeInput.value = '';
                otherDocTypeInput.removeAttribute('required');
            }
            
            // Mostrar el grupo correspondiente
            const selectedType = this.value;
            if (selectedType === 'dni' || selectedType === 'nie') {
                if (dniGroup) {
                    dniGroup.style.display = 'block';
                    if (dniInput) {
                        dniInput.setAttribute('required', 'required');
                        // Cambiar placeholder según tipo
                        if (selectedType === 'nie') {
                            dniInput.placeholder = 'Ej: X1234567L (letra + 7 números + letra)';
                            const label = dniGroup.querySelector('label');
                            if (label) label.textContent = 'NIE:';
                            const help = dniGroup.querySelector('small');
                            if (help) help.textContent = 'Formato: Letra + 7 números + letra (ej: X1234567L)';
                        } else {
                            dniInput.placeholder = 'Ej: 12345678A';
                            const label = dniGroup.querySelector('label');
                            if (label) label.textContent = 'DNI:';
                            const help = dniGroup.querySelector('small');
                            if (help) help.textContent = 'Formato: 8 números seguidos de 1 letra (ej: 12345678A)';
                        }
                    }
                }
            } else if (selectedType === 'passport') {
                if (passportGroup) {
                    passportGroup.style.display = 'block';
                    if (passportInput) passportInput.setAttribute('required', 'required');
                }
            } else if (selectedType === 'other') {
                if (otherDocGroup) {
                    otherDocGroup.style.display = 'block';
                    if (otherDocInput) otherDocInput.setAttribute('required', 'required');
                    if (otherDocTypeInput) otherDocTypeInput.setAttribute('required', 'required');
                }
            }
        });
    }
    
    // Autoformatear DNI/NIE mientras se escribe
    const dniInput = document.getElementById('regDNI');
    if (dniInput) {
        dniInput.addEventListener('input', function(e) {
            let value = e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, '');
            e.target.value = value;
        });
    }
    document.getElementById('appointmentForm').addEventListener('submit', handleAppointment);
    document.getElementById('logoForm').addEventListener('submit', handleLogoUpload);
    document.getElementById('createAdminForm').addEventListener('submit', handleCreateAdmin);
    document.getElementById('documentUploadForm').addEventListener('submit', handleDocumentUpload);
    document.getElementById('importDataForm').addEventListener('submit', handleDataImport);

    const carnetForm = document.getElementById('carnetForm');
    if (carnetForm) {
        carnetForm.addEventListener('submit', handleCarnetFormSubmit);
    }

    const cotoForm = document.getElementById('cotoForm');
    if (cotoForm) {
        cotoForm.addEventListener('submit', handleCotoFormSubmit);
    }

    const carnetConfigSaveBtn = document.getElementById('carnetConfigSaveBtn');
    if (carnetConfigSaveBtn) {
        carnetConfigSaveBtn.addEventListener('click', handleCarnetConfigSave);
    }

    const carnetConfigResetBtn = document.getElementById('carnetConfigResetBtn');
    if (carnetConfigResetBtn) {
        carnetConfigResetBtn.addEventListener('click', handleCarnetConfigReset);
    }

    const carnetRefreshBtn = document.getElementById('carnetRefreshBtn');
    if (carnetRefreshBtn) {
        carnetRefreshBtn.addEventListener('click', loadCarnetRequestsAdmin);
    }

    const carnetExportBtn = document.getElementById('carnetExportBtn');
    if (carnetExportBtn) {
        carnetExportBtn.addEventListener('click', exportCarnetRequests);
    }

    const cotoRefreshBtn = document.getElementById('cotoRefreshBtn');
    if (cotoRefreshBtn) {
        cotoRefreshBtn.addEventListener('click', loadCotoRequestsAdmin);
    }

    const cotoExportBtn = document.getElementById('cotoExportBtn');
    if (cotoExportBtn) {
        cotoExportBtn.addEventListener('click', exportCotoRequests);
    }

    // Tabs del admin
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            switchTab(this.dataset.tab);
        });
    });

    // Menú móvil
    document.getElementById('mobileMenuToggle').addEventListener('click', toggleMobileMenu);

    // Tecla Escape para cerrar modales
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeAllModals();
        }
    });
}

// Cargar eventos
function loadEvents() {
    const savedEvents = localStorage.getItem('events');
    if (savedEvents) {
        events = JSON.parse(savedEvents);
    } else {
        // Inicializar con array vacío
        events = [];
        localStorage.setItem('events', JSON.stringify(events));
    }
}

// Cargar acceso rápido
function loadQuickAccess() {
    const savedQuickAccess = localStorage.getItem('quickAccess');
    if (savedQuickAccess) {
        quickAccess = JSON.parse(savedQuickAccess);
    } else {
        // Tarjetas de acceso rápido por defecto
        quickAccess = [
            {
                id: 1,
                title: 'Bando Municipal',
                description: 'Normativas y anuncios oficiales',
                icon: 'fas fa-gavel',
                section: 'bando',
                order: 1,
                isActive: true,
                createdBy: 'system',
                createdAt: new Date().toISOString()
            },
            {
                id: 2,
                title: 'Sede Electrónica',
                description: 'Trámites online',
                icon: 'fas fa-laptop',
                section: 'sede-electronica',
                order: 2,
                isActive: true,
                createdBy: 'system',
                createdAt: new Date().toISOString()
            },
            {
                id: 3,
                title: 'Documentos',
                description: 'Formularios y documentos',
                icon: 'fas fa-file-alt',
                section: 'documentos',
                order: 3,
                isActive: true,
                createdBy: 'system',
                createdAt: new Date().toISOString()
            },
            {
                id: 4,
                title: 'Cultura y Ocio',
                description: 'Eventos y actividades',
                icon: 'fas fa-theater-masks',
                section: 'cultura-ocio',
                order: 4,
                isActive: true,
                createdBy: 'system',
                createdAt: new Date().toISOString()
            }
        ];
        localStorage.setItem('quickAccess', JSON.stringify(quickAccess));
    }
}

// Cargar documentos
function loadDocuments() {
    const savedDocuments = localStorage.getItem('documents');
    if (savedDocuments) {
        documents = JSON.parse(savedDocuments);
    } else {
        documents = [];
        localStorage.setItem('documents', JSON.stringify(documents));
    }
}

// Cargar administradores
function loadAdministrators() {
    const savedAdmins = localStorage.getItem('administrators');
    if (savedAdmins) {
        administrators = JSON.parse(savedAdmins);
    } else {
        administrators = [];
    }
    
    // Asegurar que los administradores por defecto siempre existan
    const defaultAdmins = [
            {
                id: 1,
            name: 'Administrador Ayuntamiento',
            email: 'aytocobreros@gmail.com',
            password: 'admin123',
            createdBy: 'system',
            createdAt: new Date().toISOString(),
            isActive: true
        },
        {
            id: 2,
                name: 'Administrador',
                email: 'admin@ayuntamientocobreros.es',
                password: 'admin123',
                createdBy: 'system',
                createdAt: new Date().toISOString(),
                isActive: true
            }
        ];
    
    // Agregar administradores por defecto si no existen
    defaultAdmins.forEach(defaultAdmin => {
        const exists = administrators.some(admin => admin.email === defaultAdmin.email);
        if (!exists) {
            administrators.push(defaultAdmin);
        }
    });
    
    // Guardar si se agregaron nuevos
        localStorage.setItem('administrators', JSON.stringify(administrators));
}

// Cargar datos desde localStorage
function loadData() {
    // Cargar noticias
    const savedNews = localStorage.getItem('news');
    if (savedNews) {
        news = JSON.parse(savedNews);
    } else {
        // Inicializar con array vacío
        news = [];
        localStorage.setItem('news', JSON.stringify(news));
    }

    // Cargar bandos
    const savedBandos = localStorage.getItem('bandos');
    if (savedBandos) {
        bandos = JSON.parse(savedBandos);
    } else {
        // Inicializar con array vacío
        bandos = [];
        localStorage.setItem('bandos', JSON.stringify(bandos));
    }

    // Cargar usuarios con múltiple seguridad
    console.log('👥 Cargando usuarios registrados...');
    const savedUsers = localStorage.getItem('users');
    if (savedUsers) {
        try {
        users = JSON.parse(savedUsers);
            console.log(`✅ ${users.length} usuarios cargados desde localStorage`);
        } catch (error) {
            console.error('❌ Error parseando usuarios guardados:', error);
            users = [];
        }
    } else {
        users = [];
        console.log('⚠️ No hay usuarios guardados, iniciando con array vacío');
    }

    // Cargar notificaciones
    const savedNotifications = localStorage.getItem('notifications');
    if (savedNotifications) {
        notifications = JSON.parse(savedNotifications);
    }

    updateContent();
    refreshStatistics();
}

// Actualizar contenido de la página
function updateContent() {
    updateNewsSection();
    updateBandoSection();
    updateAdminContent();
}

// Actualizar sección de noticias
function updateNewsSection() {
    const newsGrid = document.getElementById('newsGrid');
    if (!newsGrid) return;

    newsGrid.innerHTML = '';
    news.forEach(article => {
        const newsItem = document.createElement('article');
        newsItem.className = 'news-item';
        const attachment = article.attachment;
        const isImageAttachment = attachment && attachment.type.startsWith('image/');
        const isPdfAttachment = attachment && attachment.type === 'application/pdf';
        const displayImage = article.image || (isImageAttachment ? attachment.dataUrl : null);

        const mediaHtml = displayImage ? `
            <div class="news-image">
                <img src="${displayImage}" alt="${article.title}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                <div style="display: none; align-items: center; justify-content: center; height: 100%; background: #f3f4f6; color: #6b7280;">
                    <i class="fas fa-newspaper" style="font-size: 3rem;"></i>
                </div>
            </div>
        ` : isPdfAttachment ? `
            <div class="news-image news-image--pdf" style="display: flex; align-items: center; justify-content: center; background: #f3f4f6; color: #ef4444;">
                <div style="text-align: center;">
                    <i class="fas fa-file-pdf" style="font-size: 3rem;"></i>
                    <p style="margin-top: 0.5rem; font-weight: 600;">PDF adjunto</p>
                </div>
            </div>
        ` : `
            <div class="news-image news-image--placeholder" style="display: flex; align-items: center; justify-content: center; background: #f3f4f6; color: #6b7280;">
                <i class="fas fa-newspaper" style="font-size: 3rem;"></i>
            </div>
        `;

        const attachmentButton = attachment ? `
            <a class="btn btn-outline btn-small" href="${attachment.dataUrl}" target="_blank" download="${attachment.name}">
                <i class="fas ${isPdfAttachment ? 'fa-file-download' : 'fa-image'}"></i> Ver ${isPdfAttachment ? 'documento' : 'imagen'}
            </a>
        ` : '';

        newsItem.innerHTML = `
            ${mediaHtml}
            <div class="news-content">
                <h3>${article.title}</h3>
                <p class="news-date">${formatDate(article.date)}</p>
                <p>${article.content.substring(0, 100)}...</p>
                <button class="btn btn-outline btn-small" onclick="showNewsDetail(${article.id})">Leer más</button>
                ${attachmentButton}
            </div>
        `;
        newsGrid.appendChild(newsItem);
    });
}

// Actualizar sección de bando
function updateBandoSection() {
    const bandoContent = document.getElementById('bandoContent');
    if (!bandoContent) return;

    if (bandos.length === 0) {
        bandoContent.innerHTML = '<p class="bando-empty">No hay bandos municipales publicados.</p>';
        return;
    }

    bandoContent.innerHTML = '';

    const sortedBandos = [...bandos].sort((a, b) => {
        const dateA = new Date(a.date || 0);
        const dateB = new Date(b.date || 0);
        return dateB - dateA;
    });

    sortedBandos.forEach((bando, index) => {
        const attachment = bando.attachment;
        const isImageAttachment = attachment && attachment.type && attachment.type.startsWith('image/');
        const isPdfAttachment = attachment && attachment.type === 'application/pdf';
        const displayImage = isImageAttachment ? attachment.dataUrl : null;

        const mediaHtml = displayImage ? `
            <div class="bando-media">
                <img src="${displayImage}" alt="Imagen del bando ${bando.title}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                <div style="display:none; align-items:center; justify-content:center; height:100%; background:#f3f4f6; color:#6b7280;">
                    <i class="fas fa-bullhorn" style="font-size:2.5rem;"></i>
            </div>
            </div>
        ` : isPdfAttachment ? `
            <div class="bando-media bando-media--pdf" style="display:flex; align-items:center; justify-content:center; background:#f3f4f6; color:#ef4444;">
                <div style="text-align:center;">
                    <i class="fas fa-file-pdf" style="font-size:2.5rem;"></i>
                    <p style="margin-top:0.5rem; font-weight:600;">PDF adjunto</p>
                </div>
            </div>
        ` : `
            <div class="bando-media bando-media--placeholder" style="display:flex; align-items:center; justify-content:center; background:#f3f4f6; color:#6b7280;">
                <i class="fas fa-bullhorn" style="font-size:2.5rem;"></i>
        </div>
    `;

        const attachmentButton = attachment ? `
            <a class="btn btn-outline btn-small" href="${attachment.dataUrl}" target="_blank" download="${attachment.name}">
                <i class="fas ${isPdfAttachment ? 'fa-file-download' : 'fa-image'}"></i> Ver ${isPdfAttachment ? 'documento' : 'imagen'}
            </a>
        ` : '';

        const contentPreview = typeof bando.content === 'string'
            ? bando.content.replace(/<[^>]+>/g, '').substring(0, 160)
            : '';

        const bandoItem = document.createElement('article');
        bandoItem.className = 'bando-item';
        bandoItem.setAttribute('data-index', index);
        bandoItem.innerHTML = `
            ${mediaHtml}
            <div class="bando-content-body">
                <h3>${bando.title}</h3>
                <p class="bando-date">Publicado: ${formatDate(bando.date)}</p>
                <p>${contentPreview}${contentPreview.length === 160 ? '...' : ''}</p>
                <div class="bando-actions">
                    <button class="btn btn-outline btn-small" onclick="showBandoDetail(${bando.id})">Leer completo</button>
                    ${attachmentButton}
                </div>
            </div>
        `;

        bandoContent.appendChild(bandoItem);
    });
}
// Navegación suave
function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        // Obtener la altura del header fijo
        const header = document.querySelector('header');
        const headerHeight = header ? header.offsetHeight : 80;
        
        // Calcular la posición con offset para que la sección quede visible debajo del header
        const sectionTop = section.offsetTop;
        const offsetPosition = sectionTop - headerHeight - 20; // 20px adicionales de margen
        
        // Hacer scroll suave a la posición calculada
        window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
        });
        
        // Track event
        if (window.trackEvent) {
            trackEvent('section_view', {
                section_id: sectionId
            });
        }
    }
}

// Actualizar enlace de navegación activo
function updateActiveNavLink(activeLink) {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    activeLink.classList.add('active');
}

// Abrir modal
function openModal(modalId) {
    // SEGURIDAD: Verificar acceso al panel de administración
    if (modalId === 'adminModal') {
        if (!isAdmin || !currentUser) {
            showNotification('⚠️ Acceso denegado: Debe iniciar sesión como administrador', 'error');
            // Redirigir al login de admin en lugar de abrir el panel
            const adminLoginModal = document.getElementById('adminLoginModal');
            if (adminLoginModal) {
                adminLoginModal.style.display = 'block';
                document.body.style.overflow = 'hidden';
            }
            return;
        }
        // Si es admin, usar la función específica que tiene más verificaciones
        openAdminPanel();
        return;
    }
    
    console.log('openModal called with:', modalId);
    const modal = document.getElementById(modalId);
    console.log('Modal found:', !!modal);
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
        
        // Mejorar accesibilidad: agregar atributos ARIA
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-hidden', 'false');
        
        // Buscar título del modal para aria-labelledby
        const modalTitle = modal.querySelector('h2, h3, .modal-title, [class*="title"]');
        if (modalTitle && !modalTitle.id) {
            modalTitle.id = `${modalId}-title`;
        }
        if (modalTitle) {
            modal.setAttribute('aria-labelledby', modalTitle.id);
        }
        
        // Focus trap: usar función mejorada si está disponible
        if (typeof setupFocusTrap === 'function') {
            setupFocusTrap(modal);
        }
        
        // Enfocar primer elemento interactivo
        setTimeout(() => {
            const firstFocusable = modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            if (firstFocusable) {
                firstFocusable.focus();
            }
        }, 100);
        
        // Agregar listener para ESC
        const handleEscape = (e) => {
            if (e.key === 'Escape' && modal.style.display === 'block') {
                closeModal(modalId);
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
        
        console.log('Modal opened successfully');
    } else {
        console.error('Modal not found:', modalId);
    }
}

// Cerrar modal
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    
    // Remover focus trap si existe
    if (modal && typeof removeFocusTrap === 'function') {
        removeFocusTrap(modal);
    }
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
        
        // Mejorar accesibilidad: actualizar atributos ARIA
        modal.setAttribute('aria-hidden', 'true');
    }
}

// Cerrar todos los modales
function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
    });
    document.body.style.overflow = 'auto';
}

// Manejar login de usuarios normales
function handleLogin(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const email = formData.get('email');
    const password = formData.get('password');
    const rememberSession = formData.get('rememberSession') === 'on';

    // Buscar usuario en la lista de usuarios registrados
    const user = users.find(u => u.email === email && u.password === password);
    
    if (user) {
        const displayName = user.fullName || (user.name ? `${user.name}${user.surname1 ? ' ' + user.surname1 : ''}${user.surname2 ? ' ' + user.surname2 : ''}` : (user.nombre ? `${user.nombre}${user.apellidos ? ' ' + user.apellidos : ''}` : user.name || 'Persona usuaria'));
        currentUser = { 
            email: user.email, 
            name: user.name || user.nombre || '',
            fullName: displayName,
            surname1: user.surname1 || '',
            surname2: user.surname2 || '',
            id: user.id,
            isRegularUser: true
        };
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        if (rememberSession) {
            localStorage.setItem('rememberUserSession', 'true');
        } else {
            localStorage.removeItem('rememberUserSession');
        }
        updateUserInterface();
        closeModal('loginModal');
        showNotification(`Bienvenido, ${displayName}`, 'success');
        
        // Track event
        if (window.trackEvent) {
            trackEvent('login', {
                method: 'email',
                user_id: user.id
            });
        }
    } else {
        showNotification('Credenciales incorrectas', 'error');
        if (!rememberSession) {
            localStorage.removeItem('rememberUserSession');
        }
        
        // Track failed login
        if (window.trackEvent) {
            trackEvent('login_failed', {
                method: 'email',
                reason: 'invalid_credentials'
            });
        }
    }
}
// Manejar login de administradores
function handleAdminLogin(eventOrEmail, maybePassword) {
    const form = typeof eventOrEmail === 'string' ? document.getElementById('adminLoginForm') : eventOrEmail?.target || document.getElementById('adminLoginForm');
    const adminFeedback = document.getElementById('adminLoginFeedback');

    const clearAdminLoginFeedback = () => {
        if (adminFeedback) {
            adminFeedback.textContent = '';
            adminFeedback.style.display = 'none';
        }
    };

    const showAdminLoginError = (message) => {
        if (adminFeedback) {
            adminFeedback.textContent = message;
            adminFeedback.style.display = 'block';
        } else if (typeof showNotification === 'function') {
            showNotification(message, 'error');
        } else {
            alert(message);
        }
    };

    const finalizeSuccessLogin = () => {
        if (form) {
            form.reset();
        }
        clearAdminLoginFeedback();
        closeModal('adminLoginModal');
    };

    let email;
    let password;

    if (typeof eventOrEmail === 'string') {
        email = eventOrEmail;
        password = maybePassword || '';
    } else {
        const event = eventOrEmail;
        if (event && typeof event.preventDefault === 'function') {
            event.preventDefault();
        }
        const formData = new FormData(form);
        email = formData.get('email');
        password = formData.get('password');
    }

    clearAdminLoginFeedback();

    if (!email || !password) {
        showAdminLoginError('Introduce correo y contraseña.');
        return false;
    }

    if (email === SUPER_ADMIN.email && password === SUPER_ADMIN.password) {
        isSuperAdmin = true;
        isAdmin = true;
        localStorage.setItem('isSuperAdmin', 'true');
        localStorage.setItem('isAdmin', 'true');
        currentUser = {
            email,
            name: SUPER_ADMIN.name,
            isSuperAdmin: true,
            team: SUPER_ADMIN.team
        };
        localStorage.setItem('currentUser', JSON.stringify(currentUser));

        if (typeof logAuditAction === 'function') {
            logAuditAction('ADMIN_LOGIN', {
                adminType: 'super_admin',
                adminName: SUPER_ADMIN.name
            });
        }

        updateUserInterface();
        finalizeSuccessLogin();
        showNotification('Sesión de administrador iniciada correctamente', 'success');
        return true;
    }

    const adminEmail = ADMIN_CREDENTIALS.email;
    const adminPassword = ADMIN_CREDENTIALS.password;

    if (email === adminEmail && password === adminPassword) {
        isAdmin = true;
        localStorage.setItem('isAdmin', 'true');
        currentUser = {
            email: adminEmail,
            name: ADMIN_CREDENTIALS.name,
            isAdmin: true,
            isDefault: true
        };
        localStorage.setItem('currentUser', JSON.stringify(currentUser));

        if (typeof logAuditAction === 'function') {
            logAuditAction('ADMIN_LOGIN', {
                adminType: 'default_admin',
                adminName: ADMIN_CREDENTIALS.name
            });
        }

        updateUserInterface();
        finalizeSuccessLogin();
        showNotification('Sesión de administrador iniciada - Ayuntamiento de Cobreros', 'success');
        return true;
    }

    const admin = administrators.find(item => item.email === email && item.password === password && item.isActive);

    if (admin) {
        currentUser = {
            email: admin.email,
            name: admin.name,
            isAdmin: true,
            adminId: admin.id
        };
        isAdmin = true;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        localStorage.setItem('isAdmin', 'true');

        if (typeof logAuditAction === 'function') {
            logAuditAction('ADMIN_LOGIN', {
                adminType: 'custom_admin',
                adminName: admin.name,
                adminId: admin.id
            });
        }

        updateUserInterface();
        finalizeSuccessLogin();
        showNotification(`Sesión de administrador iniciada - ${admin.name}`, 'success');
        return true;
    }

    showAdminLoginError('Credenciales de administrador incorrectas');
    return false;
}
// Manejar registro (con rate limiting)
async function handleRegister(e, recaptchaToken = null) {
    // Si e es un Event, prevenir comportamiento por defecto
    if (e && e.preventDefault) {
        e.preventDefault();
    }
    
    // Aplicar rate limiting si está disponible
    if (typeof checkRateLimit === 'function') {
        try {
            const rateCheck = checkRateLimit('register');
            if (!rateCheck.allowed) {
                showNotification(`Demasiados intentos de registro. Intente de nuevo en ${rateCheck.waitTime} segundos`, 'error');
                return;
            }
        } catch (rateError) {
            if (rateError.code === 'RATE_LIMIT_EXCEEDED') {
                showNotification(`Demasiados intentos de registro. Intente de nuevo en ${rateError.waitTime} segundos`, 'error');
                return;
            }
        }
    }
    
    try {
        // Si e es FormData, usarlo directamente; si es Event, obtener FormData del formulario
        let formData;
        let formElement;
        
        if (e instanceof FormData) {
            formData = e;
            formElement = document.getElementById('registerForm');
        } else if (e && e.target) {
            formData = new FormData(e.target);
            formElement = e.target;
        } else {
            showNotification('Error al procesar el formulario de registro', 'error');
            return;
        }
        const name = formData.get('name') || '';
        const surname1 = formData.get('surname1') || '';
        const surname2 = formData.get('surname2') || '';
        const email = formData.get('email') || '';
        const phone = formData.get('phone') || '';
        const address = formData.get('address') || '';
        const city = formData.get('city') || '';
        const postalCode = formData.get('postalCode') || '';
        const password = formData.get('password') || '';
        const passwordConfirm = formData.get('passwordConfirm') || '';
        const consent = formData.get('consent') === 'on' || formData.get('consent') === 'true';
        const notificationConsent = formData.get('notificationConsent') === 'on' || formData.get('notificationConsent') === 'true';
        
        // Obtener localidades seleccionadas
        const selectedLocalities = [];
        const localityCheckboxes = document.querySelectorAll('input[name="localities"]:checked');
        localityCheckboxes.forEach(checkbox => {
            selectedLocalities.push(checkbox.value);
        });

        // Validaciones
        if (!name || !surname1 || !email || !phone || !address || !city || !postalCode || !password || !passwordConfirm) {
            showNotification('Por favor, complete todos los campos obligatorios', 'error');
            return;
        }

        // Validar código postal (5 dígitos)
        const postalCodeRegex = /^[0-9]{5}$/;
        if (!postalCodeRegex.test(postalCode)) {
            showNotification('El código postal debe tener 5 dígitos', 'error');
            return;
        }

        const documentType = formData.get('documentType');
        if (!documentType) {
            showNotification('Por favor, seleccione el tipo de documento', 'error');
            return;
        }

        // Validar documento según tipo
        let documentNumber = '';
        let documentTypeName = '';
        if (documentType === 'dni' || documentType === 'nie') {
            documentNumber = formData.get('dni') || '';
            if (!documentNumber) {
                showNotification('Por favor, ingrese su DNI o NIE', 'error');
                return;
            }
            documentNumber = documentNumber.toUpperCase().trim();
            
            if (documentType === 'dni') {
                if (!validateDNI(documentNumber)) {
                    showNotification('El DNI introducido no es válido. Verifique el formato (8 números + 1 letra).', 'error');
                    return;
                }
                documentTypeName = 'DNI';
            } else if (documentType === 'nie') {
                if (!validateNIE(documentNumber)) {
                    showNotification('El NIE introducido no es válido. Verifique el formato (letra + 7 números + letra).', 'error');
                    return;
                }
                documentTypeName = 'NIE';
            }
        } else if (documentType === 'passport') {
            documentNumber = formData.get('passport') || '';
            if (!documentNumber || documentNumber.trim().length < 3) {
                showNotification('Por favor, ingrese un número de pasaporte válido', 'error');
                return;
            }
            documentNumber = documentNumber.trim().toUpperCase();
            documentTypeName = 'Pasaporte';
        } else if (documentType === 'other') {
            documentNumber = formData.get('otherDoc') || '';
            const otherDocType = formData.get('otherDocType') || '';
            if (!documentNumber || documentNumber.trim().length < 3) {
                showNotification('Por favor, ingrese el número de documento', 'error');
                return;
            }
            if (!otherDocType || otherDocType.trim().length < 2) {
                showNotification('Por favor, especifique el tipo de documento', 'error');
                return;
            }
            documentNumber = documentNumber.trim().toUpperCase();
            documentTypeName = otherDocType.trim();
        }

        if (password !== passwordConfirm) {
            showNotification('Las contraseñas no coinciden', 'error');
            return;
        }

        if (!consent) {
            showNotification('Debe aceptar el consentimiento para el tratamiento de datos', 'error');
            return;
        }

        if (!notificationConsent) {
        showNotification('Debe aceptar el consentimiento para recibir avisos del ayuntamiento', 'error');
            return;
        }

        // Verificar si el email ya existe
        if (users.some(user => user.email === email)) {
            showNotification('Este correo electrónico ya está registrado', 'error');
            return;
        }

        // Verificar si el documento ya existe (solo para DNI/NIE)
        if (documentType === 'dni' || documentType === 'nie') {
            if (users.some(user => (user.dni === documentNumber || user.documentNumber === documentNumber) && user.email !== email)) {
                showNotification('Este DNI/NIE ya está registrado con otro correo electrónico', 'error');
                return;
            }
        }

        // Obtener token FCM si el usuario da consentimiento para notificaciones
        let fcmToken = null;
        if (notificationConsent) {
            try {
                // Solicitar permiso para notificaciones
                const permission = await Notification.requestPermission();
                if (permission === 'granted') {
                    // Obtener token FCM
                    if (window.getFCMToken) {
                        fcmToken = await window.getFCMToken();
                    }
                }
            } catch (error) {
                console.error('Error obteniendo token FCM:', error);
            }
        }

        // Construir nombre completo
        const fullName = `${name} ${surname1}${surname2 ? ' ' + surname2 : ''}`.trim();
        const fullSurnames = surname2 ? `${surname1} ${surname2}` : surname1;

        // Crear nuevo usuario con campos compatibles con ambas funciones
        const newUser = {
            id: Date.now(),
            name: name,
            surname1: surname1,
            surname2: surname2 || '',
            fullName: fullName, // Nombre completo para mostrar
            nombre: name, // Para compatibilidad con Firestore
            apellidos: fullSurnames, // Para compatibilidad con Firestore
            email: email,
            phone: phone,
            telefono: phone, // Para compatibilidad con Firestore
            address: address,
            direccion: address, // Para compatibilidad con Firestore
            city: city,
            ciudad: city, // Para compatibilidad con Firestore
            postalCode: postalCode,
            codigoPostal: postalCode, // Para compatibilidad con Firestore
            password: password, // En una aplicación real, esto debería estar hasheado
            documentType: documentType,
            documentTypeName: documentTypeName,
            documentNumber: documentNumber,
            dni: documentType === 'dni' || documentType === 'nie' ? documentNumber : '', // Para compatibilidad
            consent: true,
            notificationConsent: notificationConsent,
            localities: selectedLocalities,
            fcmToken: fcmToken,
            lastNotificationError: '',
            consentDate: new Date().toISOString(),
            registeredAt: new Date().toISOString(),
            registrationDate: new Date().toISOString()
        };

        users.push(newUser);
        
        // Guardar con múltiple seguridad usando función segura si está disponible
        console.log('💾 Guardando usuario registrado:', newUser.email);
        if (typeof safeLocalStorageSet === 'function') {
            safeLocalStorageSet('users', users);
        } else {
            localStorage.setItem('users', JSON.stringify(users));
        }
        
        // Verificar que se guardó correctamente
        setTimeout(() => {
            const verification = typeof safeLocalStorageGet === 'function' 
                ? safeLocalStorageGet('users', [])
                : JSON.parse(localStorage.getItem('users') || '[]');
            const userExists = verification.find(u => u.email === newUser.email);
            if (!userExists) {
                console.error('❌ Error: usuario no se guardó correctamente, reintentando...');
                if (typeof safeLocalStorageSet === 'function') {
                    safeLocalStorageSet('users', users);
                } else {
                    localStorage.setItem('users', JSON.stringify(users));
                }
            } else {
                console.log('✅ Usuario guardado y verificado correctamente');
            }
        }, 100);
        
        // Sincronizar con Firestore
        await syncUserToFirestore(newUser);

        // Track event
        if (window.trackEvent) {
            trackEvent('sign_up', {
                method: 'email',
                user_id: newUser.id,
                notification_consent: newUser.notificationConsent
            });
        }

    showNotification('Registro completado correctamente. Ahora recibirá avisos.', 'success');
        closeModal('registerModal');
        
        // Resetear formulario si existe
        if (formElement && formElement.reset) {
            formElement.reset();
        } else {
            const form = document.getElementById('registerForm');
            if (form) {
                form.reset();
            }
        }
        
        // Limpiar campos de documento al resetear
        const dniGroup = document.getElementById('dniGroup');
        const passportGroup = document.getElementById('passportGroup');
        const otherDocGroup = document.getElementById('otherDocGroup');
        if (dniGroup) dniGroup.style.display = 'none';
        if (passportGroup) passportGroup.style.display = 'none';
        if (otherDocGroup) otherDocGroup.style.display = 'none';
        
    } catch (error) {
        console.error('❌ Error en el registro:', error);
        showNotification('Error al registrar a la persona. Por favor, inténtelo de nuevo.', 'error');
    }
}

// Manejar creación de administradores
function handleCreateAdmin(e) {
    e.preventDefault();
    
    // Verificar que solo los administradores pueden crear otros administradores
    if (!isAdmin) {
        showNotification('Solo los administradores pueden crear otros administradores', 'error');
        return;
    }
    
    const formData = new FormData(e.target);
    const name = formData.get('name');
    const email = formData.get('email');
    const password = formData.get('password');
    const passwordConfirm = formData.get('passwordConfirm');

    // Validaciones
    if (password !== passwordConfirm) {
        showNotification('Las contraseñas no coinciden', 'error');
        return;
    }

    if (password.length < 6) {
        showNotification('La contraseña debe tener al menos 6 caracteres', 'error');
        return;
    }

    // Verificar si el email ya existe en administradores
    if (administrators.some(admin => admin.email === email)) {
        showNotification('Ya existe un administrador con este correo electrónico', 'error');
        return;
    }

    // Verificar si el email ya existe en usuarios normales
    if (users.some(user => user.email === email)) {
        showNotification('Este correo electrónico ya está registrado', 'error');
        return;
    }

    // Verificar que no sea el super admin
    if (email === SUPER_ADMIN.email) {
        showNotification('No se puede crear un administrador con el email del Super Admin', 'error');
        return;
    }

    // Crear nuevo administrador
    const newAdmin = {
        id: Date.now(),
        name,
        email,
        password, // En una aplicación real, esto debería estar hasheado
        createdBy: currentUser.email,
        createdAt: new Date().toISOString(),
        isActive: true
    };

    administrators.push(newAdmin);
    localStorage.setItem('administrators', JSON.stringify(administrators));

    showNotification(`Administrador "${name}" creado correctamente`, 'success');
    e.target.reset();
    
    // Actualizar la lista de administradores
        loadAdminsList();
}
// Manejar subida de documentos
function handleDocumentUpload(e) {
    e.preventDefault();
    
    if (!isAdmin) {
        showNotification('Solo los administradores pueden subir documentos', 'error');
        return;
    }
    
    updateDocumentDescriptionHiddenField();
    
    const formData = new FormData(e.target);
    const name = formData.get('name');
    const description = formData.get('description') || '';
    const category = formData.get('category');
    const file = formData.get('file');

    if (!file || file.size === 0) {
        showNotification('Debe seleccionar un archivo', 'error');
        return;
    }

    // Crear objeto URL para el archivo (simulado)
    const fileUrl = URL.createObjectURL(file);
    
    const newDocument = {
        id: Date.now(),
        name,
        description,
        category,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        fileUrl: fileUrl, // En producción sería la URL real del servidor
        uploadedBy: currentUser.email,
        uploadedAt: new Date().toISOString(),
        isActive: true
    };

    documents.push(newDocument);
    localStorage.setItem('documents', JSON.stringify(documents));

    showNotification(`Documento "${name}" subido correctamente`, 'success');
    e.target.reset();
    if (documentDescriptionEditor) {
        documentDescriptionEditor.root.innerHTML = '';
        updateDocumentDescriptionHiddenField();
    }
    
    // Actualizar la lista de documentos si está visible
    if (document.getElementById('documents-tab').classList.contains('active')) {
        loadDocumentsList();
    }
}

// Manejar cita previa
async function handleAppointment(e) {
    e.preventDefault();
    
    // Verificar si las citas previas están habilitadas
    if (!appointmentsEnabled) {
        showNotification('Actualmente no se requieren citas previas. Puede acudir directamente al ayuntamiento.', 'info');
        return;
    }
    
    const formData = new FormData(e.target);
    const attachmentFile = formData.get('appointmentAttachment');
    formData.delete('appointmentAttachment');

    const appointmentId = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Date.now().toString();
    const appointmentData = Object.fromEntries(formData.entries());
    appointmentData.id = appointmentId;

    let attachmentMetadata = null;
    if (attachmentFile && attachmentFile.size > 0) {
        if (typeof uploadAttachment !== 'function') {
            showNotification('El sistema de adjuntos no está disponible actualmente. Inténtelo de nuevo más tarde.', 'error');
            return;
        }
        try {
            attachmentMetadata = await uploadAttachment(attachmentFile, {
                folder: 'appointments',
                entityId: appointmentId,
                allowedExtensions: CONFIG?.notifications?.allowedFileTypes,
                maxSize: CONFIG?.notifications?.maxFileSize,
                metadata: {
                    context: 'appointment_attachment',
                    appointmentId: appointmentId,
                    service: appointmentData.service || ''
                }
            });
        } catch (error) {
            console.error('❌ Error subiendo adjunto de cita previa:', error);
            showNotification(error.message || 'No se pudo subir el documento adjunto. Por favor, inténtelo de nuevo.', 'error');
            return;
        }
    }
    
    if (attachmentMetadata) {
        appointmentData.attachment = attachmentMetadata;
    }

    // Validar DNI
    if (!validateDNI(appointmentData.dni)) {
        showNotification('El DNI introducido no es válido. Verifique el formato (8 números + 1 letra).', 'error');
        return;
    }

    // Validar aceptación de protección de datos
    if (!appointmentData.gdprConsent) {
        showNotification('Debe aceptar la Política de Protección de Datos para continuar.', 'error');
        return;
    }

    // Validar fecha (no puede ser en el pasado)
    const selectedDate = new Date(appointmentData.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
        showNotification('La fecha seleccionada no puede ser en el pasado', 'error');
        return;
    }
    
    // Validar que la fecha y hora no estén ya reservadas
    const dateStr = formatDateForStorage(selectedDate);
    const existingAppointment = appointments.find(apt => {
        const aptDate = new Date(apt.date);
        return formatDateForStorage(aptDate) === dateStr && 
               apt.time === appointmentData.time && 
               apt.status !== 'cancelled';
    });
    
    if (existingAppointment) {
        showNotification('Este horario ya está reservado. Por favor, seleccione otro horario.', 'error');
        // Recargar calendario para mostrar el horario como reservado
        if (document.getElementById('calendarGrid')) {
            renderCalendar();
            selectAppointmentDate(dateStr);
        }
        return;
    }
    
    // Validar que la fecha tenga horarios disponibles
    const dayOfWeek = selectedDate.getDay();
    const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][dayOfWeek];
    const dayConfig = appointmentScheduleConfig.days[dayName];
    
    if (!dayConfig || !dayConfig.enabled) {
        showNotification('Este día no tiene horarios disponibles', 'error');
        return;
    }
    
    const allSlots = [...(dayConfig.morningHours || []), ...(dayConfig.afternoonHours || [])];
    if (!allSlots.includes(appointmentData.time)) {
        showNotification('El horario seleccionado no está disponible para este día', 'error');
        return;
    }

    // Enviar email de confirmación al usuario
    const confirmationSent = await sendConfirmationEmail(appointmentData);
    
    // Enviar alerta al ayuntamiento
    const alertSent = await sendAdminAlert(appointmentData);
    
    if (confirmationSent && alertSent) {
        // Guardar la cita previa
        const appointment = {
            id: appointmentId,
            ...appointmentData,
            status: 'pending',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        if (attachmentMetadata) {
            appointment.attachment = attachmentMetadata;
        }
        
        appointments.push(appointment);
        
        // Registrar acción en log de auditoría
        if (typeof logAuditAction === 'function' && isAdmin) {
            logAuditAction('APPOINTMENT_CREATED', {
                appointmentId: appointment.id,
                appointmentName: appointment.name,
                appointmentDate: appointment.date,
                appointmentTime: appointment.time,
                service: appointment.service
            });
        }
        
        saveAppointments();
        
        // Actualizar calendario para mostrar la nueva cita en rojo
        if (document.getElementById('calendarGrid')) {
            renderCalendar();
            // Si el formulario sigue abierto, actualizar los horarios
            if (selectedAppointmentDate) {
                setTimeout(() => {
                    showTimeSlots(selectedAppointmentDate);
                }, 100);
            }
        }
        
        // Crear notificación para el encargado municipal
        createMunicipalAlert(appointment);
        
        // Track event
        if (window.trackEvent) {
            trackEvent('appointment_requested', {
                service: appointmentData.service,
                appointment_id: appointment.id
            });
        }
        
        showNotification('Su solicitud de cita ha sido enviada. Recibirá un email de confirmación y le contactaremos pronto.', 'success');
        
        // Cerrar el formulario después del envío exitoso
        setTimeout(() => {
            closeAppointmentForm();
        }, 1500);
    } else {
        if (attachmentMetadata && attachmentMetadata.storagePath && typeof deleteStorageFile === 'function') {
            await deleteStorageFile(attachmentMetadata.storagePath);
        }
        showNotification('Hubo un problema al enviar la solicitud. Por favor, inténtelo de nuevo o contacte por teléfono.', 'error');
        return;
    }

    // Enviar notificación a usuarios registrados
    if (users.length > 0) {
        await sendNotificationToUsers({
            title: 'Nueva solicitud de cita',
            message: `Se ha recibido una nueva solicitud de cita para ${appointmentData.service} de ${appointmentData.name}`,
            type: 'general',
            sendPush: false,
            sendEmail: false
        });
    }
}

// Manejar notificación
async function registerLocalNotificationRecord(title, message, type, attachment = null, options = {}) {
    const safeTitle = (title || '').trim();
    if (!safeTitle) {
        return null;
    }

    const safeMessage = (message || '').toString();
    const safeType = (type || 'general').toString();

    const result = await sendNotificationToUsers({
        title: safeTitle,
        message: safeMessage,
        type: safeType,
        attachment,
        ...options
    });
    const notification = result?.notification || null;

    if (window.trackEvent) {
        trackEvent('notification_sent', {
            notification_type: safeType,
            has_attachment: !!attachment
        });
    }
    
    try {
        const totalEnviadas = parseInt(localStorage.getItem('notificationsSentCount') || '0', 10) + 1;
        localStorage.setItem('notificationsSentCount', totalEnviadas.toString());

        const contadorNotificaciones = document.getElementById('contadorNotificaciones');
        if (contadorNotificaciones) {
            contadorNotificaciones.textContent = totalEnviadas.toString();
        }

        if (notification?.date) {
            localStorage.setItem('notificationsLastSent', notification.date);
        }
    } catch (error) {
        console.warn('No se pudo actualizar el contador de notificaciones enviadas:', error);
    }

    if (options.sendEmail !== false && result?.email?.attempted) {
        const { attempted, success, failed } = result.email;
        const status = failed === 0
            ? 'success'
            : success > 0
                ? 'warning'
                : 'error';
        const summary = `Aviso por email: ${success}/${attempted} enviados${failed ? `, ${failed} fallidos` : ''}.`;
        showNotification(summary, status);
    }

    refreshNotificationStats();
    return result;
}

// Enviar notificación a usuarios
async function sendGeneralNoticeEmail(toEmail, payload = {}) {
    if (!toEmail) {
        return false;
    }

    const {
        title = 'Aviso municipal',
        message = '',
        attachmentName = null,
        attachmentUrl = null
    } = payload || {};

    try {
        const response = await fetch(`${CLOUD_FUNCTIONS_BASE_URL}/sendEmail`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                to: toEmail,
                subject: `Aviso Municipal: ${title}`,
                template: 'general_notice',
                data: {
                    title,
                    message,
                    attachmentName,
                    attachmentUrl,
                    sentAt: new Date().toISOString()
                }
            })
        });

        const result = await response.json();
        if (result && result.success) {
            console.log(`✅ Email de aviso enviado a ${toEmail}`);
            return true;
        }
        console.warn(`⚠️ No se pudo enviar el email a ${toEmail}:`, result?.error || result);
        return false;
    } catch (error) {
        console.error(`❌ Error enviando email de aviso a ${toEmail}:`, error);
        return false;
    }
}

async function sendNotificationToUsers(titleOrOptions, message, type, attachment = null, legacyOptions = {}) {
    let options;
    if (typeof titleOrOptions === 'object' && titleOrOptions !== null && !Array.isArray(titleOrOptions)) {
        options = { ...titleOrOptions };
    } else {
        options = {
            title: titleOrOptions,
            message,
            type,
            attachment,
            ...legacyOptions
        };
    }

    const {
        title = '',
        message: bodyMessage = '',
        type: notificationType = 'general',
        attachment: attachmentData = options.attachment ?? attachment ?? null,
        scope = options.scope || 'all',
        localities = Array.isArray(options.localities) ? options.localities : [],
        sendPush = options.sendPush !== false,
        sendEmail = options.sendEmail !== false,
        recipients = options.recipients || null
    } = options;

    if (!title || !bodyMessage) {
        console.warn('sendNotificationToUsers: título o mensaje no proporcionado');
        return {
            notification: null,
            push: { attempted: sendPush, success: false },
            email: { attempted: 0, success: 0, failed: 0 }
        };
    }

    const notification = {
        id: Date.now(),
        title,
        message: bodyMessage,
        type: notificationType,
        date: new Date().toISOString(),
        sent: true,
        attachment: attachmentData || null
    };

    notifications.push(notification);
    try {
        localStorage.setItem('notifications', JSON.stringify(notifications));
    } catch (storageError) {
        console.warn('No se pudo guardar el historial de avisos en localStorage:', storageError);
    }

    actualizarEstadisticasNotificaciones();

    const lastSentElement = document.getElementById('ultimoEnvioNotificaciones');
    if (lastSentElement) {
        lastSentElement.textContent = formatDate(notification.date);
    }

    if ('Notification' in window && Notification.permission === 'granted') {
        try {
            new Notification(title, {
                body: bodyMessage,
                icon: 'images/escudo-cobreros.jpg'
            });
        } catch (browserNotificationError) {
            console.warn('No se pudo mostrar la notificación local del navegador:', browserNotificationError);
        }
    }

    updateNotificationCenter();

    let pushSuccess = false;
    if (sendPush) {
        try {
            pushSuccess = await enviarNotificacionPushConLocalidades(
                title,
                bodyMessage,
                notificationType,
                scope === 'localities' ? 'localities' : 'all',
                scope === 'localities' ? localities : [],
                !!(attachmentData && attachmentData.url),
                attachmentData?.url || null,
                attachmentData?.type || null
            );
        } catch (pushError) {
            console.error('❌ Error al enviar aviso push:', pushError);
            pushSuccess = false;
        }
    }

    const emailResult = { attempted: 0, success: 0, failed: 0 };
    if (sendEmail) {
        const targetRecipients = Array.isArray(recipients)
            ? recipients
            : users.filter(user => user && user.consent && user.notificationConsent && user.email);

        for (const recipient of targetRecipients) {
            const email = typeof recipient === 'string' ? recipient : recipient.email;
            if (!email) {
                continue;
            }
            emailResult.attempted += 1;
            const emailSent = await sendGeneralNoticeEmail(email, {
                title,
                message: bodyMessage,
                attachmentName: attachmentData?.name || null,
                attachmentUrl: attachmentData?.url || null
            });
            if (emailSent) {
                emailResult.success += 1;
            } else {
                emailResult.failed += 1;
            }
        }
    }

    return {
        notification,
        push: {
            attempted: sendPush,
            success: sendPush ? !!pushSuccess : false
        },
        email: emailResult
    };
}
// Función para descargar documentos adjuntos
function downloadAttachment(url, filename = '') {
    // Verificar que el usuario esté logueado
    if (!currentUser) {
        showNotification('Debes iniciar sesión para descargar documentos', 'error');
        return;
    }
    
    // Crear enlace temporal para descarga
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || '';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification(`Descargando: ${filename}`, 'success');
}

// Manejar subida de logo
function handleLogoUpload(e) {
    e.preventDefault();
    const fileInput = document.getElementById('logoUpload');
    const file = fileInput.files[0];

    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const logo = document.querySelector('.logo');
            logo.src = e.target.result;
            localStorage.setItem('logo', e.target.result);
            showNotification('Escudo actualizado correctamente', 'success');
        };
        reader.readAsDataURL(file);
    }
}

// Utilidad para convertir archivos en DataURL con límite de tamaño
function readFileAsDataURL(file, maxSize = NEWS_ATTACHMENT_MAX_SIZE) {
    return new Promise((resolve, reject) => {
        if (!file) {
            reject(new Error('Archivo no proporcionado'));
            return;
        }

        if (file.size > maxSize) {
            reject(new Error(`El archivo supera el límite de ${(maxSize / (1024 * 1024)).toFixed(1)} MB`));
            return;
        }

        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error || new Error('No se pudo leer el archivo'));
        reader.readAsDataURL(file);
    });
}

// Cambiar tab en admin
function switchTab(tabName) {
    // Actualizar botones
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Actualizar contenido
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');

    // Cargar contenido específico del tab
    if (tabName === 'content') {
        loadNewsList();
        loadBandoList();
        loadEventsList();
        loadQuickAccessList();
    } else if (tabName === 'users') {
        loadUsersList();
    } else if (tabName === 'admins') {
        loadAdminsList();
    } else if (tabName === 'documents') {
        loadDocumentsList();
    } else if (tabName === 'notifications') {
        loadNotificationsHistory();
    } else if (tabName === 'carnets') {
        populateCarnetAdminForm();
        loadCarnetRequestsAdmin();
        loadCotoRequestsAdmin();
    } else if (tabName === 'appointments') {
        loadAppointmentScheduleConfigUI(); // Cargar configuración de horarios
        // Renderizar calendario después de un breve delay para asegurar que el DOM esté listo
        setTimeout(() => {
            renderAdminCalendar();
            loadAppointmentsList();
        }, 200);
    } else if (tabName === 'database') {
        loadSystemStats();
    } else if (tabName === 'settings') {
        loadAppointmentSettings();
        loadPublicNotificationsList();
        
        // Verificación adicional de persistencia al abrir settings
        setTimeout(() => {
            const savedSettings = localStorage.getItem('appointmentSettings');
            if (savedSettings) {
                const settings = JSON.parse(savedSettings);
                console.log('🔍 Verificación en settings:', settings.enabled ? 'CITA PREVIA' : 'SIN CITA PREVIA');
                
                // Actualizar radio buttons si es necesario
                const enabledRadio = document.getElementById('appointmentEnabled');
                const disabledRadio = document.getElementById('appointmentDisabled');
                
                if (enabledRadio && disabledRadio) {
                    if (settings.enabled) {
                        enabledRadio.checked = true;
                        disabledRadio.checked = false;
                    } else {
                        enabledRadio.checked = false;
                        disabledRadio.checked = true;
                    }
                    console.log('🔘 Radio buttons sincronizados con configuración guardada');
                }
            }
        }, 100);
    } else if (tabName === 'appointments') {
        console.log('Cargando pestaña de citas previas...');
        loadAppointments();
        loadAppointmentsList();
        loadAppointmentStats();
        loadMunicipalAlertsList();
        
        // Cargar estadísticas de emails si está disponible
        if (typeof refreshEmailStats === 'function') {
            setTimeout(refreshEmailStats, 500);
        }
        
        console.log('Pestaña de citas previas cargada');
    } else if (tabName === 'servicios') {
        loadServiciosAdmin();
    }
}

function checkPushTokenStatusForCurrentUser() {
    if (!currentUser || !currentUser.email || !Array.isArray(users)) {
        return;
    }

    const currentEmail = (currentUser.email || '').toLowerCase();
    if (!currentEmail) {
        return;
    }

    const userRecord = users.find(user => (user.email || '').toLowerCase() === currentEmail);
    if (!userRecord) {
        return;
    }

    const warningKey = `${PUSH_WARNING_SESSION_PREFIX}${currentEmail}`;
    let warningAlreadyShown = false;
    try {
        warningAlreadyShown = sessionStorage.getItem(warningKey) === 'shown';
    } catch (storageError) {
        Logger.warn('No se pudo consultar sessionStorage para avisos push:', storageError);
    }

    if (warningAlreadyShown) {
        return;
    }

    const lastError = (userRecord.lastNotificationError || '').toLowerCase();
    const hasConsent = !!userRecord.notificationConsent;
    const hasToken = !!userRecord.fcmToken;

    let message = '';

    if (!hasConsent && lastError) {
        message = 'Detectamos que tu instalación anterior dejó de recibir avisos. Vuelve a instalar la PWA o inicia sesión en el dispositivo instalado y activa los avisos para registrarlo de nuevo.';
    } else if (hasConsent && !hasToken) {
        message = 'Para seguir recibiendo avisos en este dispositivo, instala la PWA y acepta las notificaciones o vuelve a activar el permiso de avisos.';
    }

    if (message) {
        showNotification(message, 'warning');
        try {
            sessionStorage.setItem(warningKey, 'shown');
        } catch (storageError) {
            Logger.warn('No se pudo guardar el aviso push en sessionStorage:', storageError);
        }
    }
}

function detectDevicePlatform() {
    const ua = (navigator.userAgent || navigator.vendor || window.opera || '').toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) {
        return 'ios';
    }
    if (/android/.test(ua)) {
        if (/huawei|honor|hw-/.test(ua)) {
            return 'huawei';
        }
        return 'android';
    }
    return 'desktop';
}

function isRunningStandalone() {
    if (typeof window === 'undefined') {
        return false;
    }
    const standaloneMatchMedia = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
    const standaloneNavigator = typeof window.navigator !== 'undefined' && window.navigator.standalone === true;
    return !!(standaloneMatchMedia || standaloneNavigator);
}

function markPwaInstalled() {
    try {
        localStorage.setItem(PWA_INSTALLED_KEY, 'installed');
    } catch (error) {
        if (typeof Logger !== 'undefined' && Logger && typeof Logger.warn === 'function') {
            Logger.warn('No se pudo guardar el estado de instalación PWA:', error);
        }
    }
}

function clearPwaInstalledFlag() {
    try {
        localStorage.removeItem(PWA_INSTALLED_KEY);
    } catch (error) {
        if (typeof Logger !== 'undefined' && Logger && typeof Logger.warn === 'function') {
            Logger.warn('No se pudo limpiar el estado de instalación PWA:', error);
        }
    }
}

function isPwaInstalled() {
    if (isRunningStandalone()) {
        markPwaInstalled();
        return true;
    }
    try {
        return localStorage.getItem(PWA_INSTALLED_KEY) === 'installed';
    } catch (error) {
        if (typeof Logger !== 'undefined' && Logger && typeof Logger.warn === 'function') {
            Logger.warn('No se pudo consultar el estado de instalación PWA:', error);
        }
        return false;
    }
}

function renderPwaInstallBanner(force = false) {
    if (!force && isPwaInstalled()) {
        return;
    }

    const existingBanner = document.getElementById('pwa-install-banner');
    if (existingBanner) {
        if (!force) {
            return;
        }
        existingBanner.remove();
    }

    const platform = detectDevicePlatform();
    const banner = document.createElement('div');
    banner.id = 'pwa-install-banner';
    banner.className = `pwa-install-banner pwa-install-banner--${platform}`;

    if (typeof Metrics !== 'undefined' && Metrics && typeof Metrics.recordEvent === 'function') {
        Metrics.recordEvent('pwa', 'install_banner_rendered', {
            platform,
            forced: !!force
        });
    }

    if (platform === 'desktop') {
        banner.innerHTML = `
            <div class="pwa-banner-content">
                <div class="pwa-banner-text">
                    <h3>📱 Recibe avisos en tu móvil</h3>
                    <p>Abre esta web desde el navegador de tu móvil o tablet para instalar la app del Ayuntamiento y recibir avisos en tiempo real una vez completes el registro como usuario/a.</p>
                </div>
                <button class="pwa-banner-close" onclick="closePWAInstallBanner()" aria-label="Cerrar aviso">
                    Entendido
                </button>
            </div>
        `;
    } else {
        banner.innerHTML = `
            <div class="pwa-banner-content">
                <div class="pwa-banner-header">
                    <div>
                        <h3>Instala la app del Ayuntamiento</h3>
                        <p>Instálala, completa tu registro como usuario/a y acepta las notificaciones para recibir avisos directos en tu dispositivo móvil.</p>
                    </div>
                    <button class="pwa-banner-close" onclick="closePWAInstallBanner()" aria-label="Cerrar aviso">×</button>
                </div>
                <div class="pwa-install-options">
                    <button class="pwa-install-option" onclick="handlePwaInstallOption('android')">
                        <img src="${PLATFORM_ICONS.android}" alt="Android" loading="lazy">
                        <div>
                            <span>Android</span>
                            <small>Instalar ahora</small>
                        </div>
                    </button>
                    <button class="pwa-install-option" onclick="handlePwaInstallOption('huawei')">
                        <img src="${PLATFORM_ICONS.huawei}" alt="Huawei" loading="lazy">
                        <div>
                            <span>Huawei</span>
                            <small>Instalar en HMS</small>
                        </div>
                    </button>
                    <button class="pwa-install-option" onclick="handlePwaInstallOption('ios')">
                        <img src="${PLATFORM_ICONS.ios}" alt="iOS" loading="lazy">
                        <div>
                            <span>iOS</span>
                            <small>Ver instrucciones</small>
                        </div>
                    </button>
                </div>
            </div>
        `;
    }

    document.body.appendChild(banner);
    requestAnimationFrame(() => banner.classList.add('visible'));
}

async function validatePwaInstallationStatus(showWarnings = true) {
    const platform = detectDevicePlatform();
    const installedFlag = isPwaInstalled();
    const standalone = isRunningStandalone();
    let hasServiceWorker = false;

    if ('serviceWorker' in navigator) {
        try {
            const registrations = await navigator.serviceWorker.getRegistrations();
            hasServiceWorker = Array.isArray(registrations) && registrations.length > 0;
        } catch (error) {
            if (typeof Logger !== 'undefined' && Logger && typeof Logger.warn === 'function') {
                Logger.warn('No se pudo validar el estado de la PWA:', error);
            }
        }
    }

    const hasPushToken = !!(currentUser && currentUser.notificationConsent && currentUser.fcmToken);
    const pushPermission = typeof Notification !== 'undefined' ? Notification.permission : 'default';
    const installationHealthy = installedFlag && (standalone || hasServiceWorker) && hasPushToken && pushPermission !== 'denied';

    if (typeof Metrics !== 'undefined' && Metrics && typeof Metrics.recordEvent === 'function') {
        Metrics.recordEvent('pwa', 'installation_status_checked', {
            platform,
            installedFlag,
            standalone,
            hasServiceWorker,
            hasPushToken,
            pushPermission
        });
    }

    if (!installationHealthy && installedFlag) {
        clearPwaInstalledFlag();
        if (typeof Metrics !== 'undefined' && Metrics && typeof Metrics.recordEvent === 'function') {
            Metrics.recordEvent('pwa', 'installation_lost', {
                platform,
                standalone,
                hasServiceWorker,
                hasPushToken,
                pushPermission
            });
        }
        if (showWarnings && typeof showNotification === 'function') {
            showNotification('Detectamos que la app instalada ya no está activa o perdió permisos. Vuelve a instalarla y acepta los avisos para seguir recibiendo notificaciones.', 'warning');
        }
        setTimeout(() => renderPwaInstallBanner(true), 300);
        return false;
    }

    if (typeof Metrics !== 'undefined' && Metrics && typeof Metrics.recordEvent === 'function') {
        Metrics.recordEvent('pwa', 'installation_valid', {
            platform,
            standalone,
            hasServiceWorker,
            hasPushToken,
            pushPermission
        });
    }

    return installationHealthy;
}

function closePwaInstructionModal() {
    const modal = document.getElementById('pwa-instructions-modal');
    if (modal) {
        modal.classList.remove('visible');
        setTimeout(() => modal.remove(), 200);
    }
}

function showPwaInstructionModal(platform) {
    closePwaInstructionModal();
    const modal = document.createElement('div');
    modal.id = 'pwa-instructions-modal';
    modal.className = 'pwa-instructions-modal';

    const titles = {
        android: 'Cómo instalar en Android',
        huawei: 'Cómo instalar en Huawei',
        ios: 'Cómo instalar en iOS'
    };

    modal.innerHTML = `
        <div class="pwa-instructions-content" role="dialog" aria-modal="true" aria-labelledby="pwa-instructions-title">
            <div class="pwa-instructions-header">
                <h3 id="pwa-instructions-title">${titles[platform] || 'Instalar la app'}</h3>
                <button class="pwa-instructions-close" onclick="closePwaInstructionModal()" aria-label="Cerrar instrucciones">×</button>
            </div>
            <div class="pwa-instructions-body">
                ${PWA_INSTRUCTIONS[platform] || ''}
            </div>
            <div class="pwa-instructions-footer">
                <button class="btn btn-primary" onclick="closePwaInstructionModal()">Entendido</button>
            </div>
        </div>
    `;

    modal.addEventListener('click', (event) => {
        if (event.target === modal) {
            closePwaInstructionModal();
        }
    });

    document.body.appendChild(modal);
    requestAnimationFrame(() => modal.classList.add('visible'));

    if (typeof Metrics !== 'undefined' && Metrics && typeof Metrics.recordEvent === 'function') {
        Metrics.recordEvent('pwa', 'instructions_shown', {
            platform
        });
    }
}

async function handlePwaInstallOption(platform) {
    const actualPlatform = detectDevicePlatform();

    if (typeof Metrics !== 'undefined' && Metrics && typeof Metrics.recordEvent === 'function') {
        Metrics.recordEvent('pwa', 'install_option_selected', {
            requestedPlatform: platform,
            actualPlatform
        });
    }

    if (platform === 'android' || (platform === 'huawei' && actualPlatform === 'android')) {
        if (deferredPwaPrompt) {
            deferredPwaPrompt.prompt();
            const { outcome } = await deferredPwaPrompt.userChoice;
            if (outcome !== 'accepted') {
                showPwaInstructionModal(platform === 'android' ? 'android' : 'huawei');
            } else {
                closePWAInstallBanner();
                markPwaInstalled();
                if (typeof Metrics !== 'undefined' && Metrics && typeof Metrics.recordEvent === 'function') {
                    Metrics.recordEvent('pwa', 'install_prompt_accepted', {
                        platform: actualPlatform
                    });
                }
            }
            deferredPwaPrompt = null;
        } else {
            showPwaInstructionModal(platform === 'android' ? 'android' : 'huawei');
        }
        return;
    }

    if (platform === 'huawei' && actualPlatform === 'huawei') {
        if (deferredPwaPrompt) {
            deferredPwaPrompt.prompt();
            const { outcome } = await deferredPwaPrompt.userChoice;
            if (outcome === 'accepted') {
                closePWAInstallBanner();
                markPwaInstalled();
                if (typeof Metrics !== 'undefined' && Metrics && typeof Metrics.recordEvent === 'function') {
                    Metrics.recordEvent('pwa', 'install_prompt_accepted', {
                        platform: actualPlatform
                    });
                }
                deferredPwaPrompt = null;
                return;
            }
            deferredPwaPrompt = null;
        }
        showPwaInstructionModal('huawei');
        return;
    }

    showPwaInstructionModal('ios');
}

window.handlePwaInstallOption = handlePwaInstallOption;
window.closePwaInstructionModal = closePwaInstructionModal;
window.validatePwaInstallationStatus = validatePwaInstallationStatus;

// Actualizar interfaz de usuario
function updateUserInterface() {
    if (currentUser) {
        // Mostrar nombre del usuario (sin revelar que es super admin)
        const displayName = currentUser.fullName || (currentUser.name ? `${currentUser.name}${currentUser.surname1 ? ' ' + currentUser.surname1 : ''}${currentUser.surname2 ? ' ' + currentUser.surname2 : ''}` : (currentUser.nombre ? `${currentUser.nombre}${currentUser.apellidos ? ' ' + currentUser.apellidos : ''}` : currentUser.name || 'Usuario'));
        document.getElementById('registerBtn').style.display = 'none';
        
        // Mostrar botón de logout con estilo distintivo
        document.getElementById('loginBtn').textContent = `Cerrar Sesión (${displayName})`;
        document.getElementById('loginBtn').onclick = logout;
        document.getElementById('loginBtn').className = 'btn btn-outline btn-logout';
        document.getElementById('loginBtn').title = 'Cerrar sesión';
        
        if (isAdmin) {
            document.getElementById('adminBtn').style.display = 'block';
            // Mantener apariencia normal para super admin
                document.getElementById('adminBtn').textContent = 'Panel Admin';
                document.getElementById('adminBtn').style.background = '#3b82f6';
        }
        
        // Mostrar campana de notificaciones solo para usuarios logueados
        document.getElementById('notificationBell').style.display = 'block';
    } else {
        // Mostrar botones de login para usuarios no autenticados
        document.getElementById('loginBtn').textContent = 'Iniciar Sesión';
        document.getElementById('loginBtn').onclick = () => openModal('loginModal');
        document.getElementById('loginBtn').className = 'btn btn-outline';
        document.getElementById('loginBtn').title = 'Iniciar sesión';
        document.getElementById('registerBtn').style.display = 'block';
        // El botón de acceso admin siempre visible (comentado para mantenerlo siempre visible)
        // document.getElementById('adminLoginBtn').style.display = 'block';
        document.getElementById('adminBtn').style.display = 'none';
        document.getElementById('adminBtn').textContent = 'Panel Admin';
        document.getElementById('adminBtn').style.background = '';
        document.getElementById('notificationBell').style.display = 'none';
    }
    
    // Actualizar centro de notificaciones
    updateNotificationCenter();

    checkPushTokenStatusForCurrentUser();

    if (typeof applyMaintenanceMode === 'function') {
        applyMaintenanceMode();
    }
}

// Actualizar contenido del admin
function updateAdminContent() {
    if (!isAdmin) return;

    // Ocultar pestaña de administradores si no es super admin
    const adminsTab = document.querySelector('[data-tab="admins"]');
    if (adminsTab) {
        adminsTab.style.display = isSuperAdmin ? 'block' : 'none';
    }

    loadNewsList();
    loadBandoList();
    loadUsersList();
    loadNotificationsHistory();
    loadAppointmentScheduleConfigUI(); // Cargar configuración de horarios en el UI
}

// Cargar lista de noticias en admin
function loadNewsList() {
    const newsList = document.getElementById('newsList');
    if (!newsList) return;

    newsList.innerHTML = '';
    
    if (news.length === 0) {
        newsList.innerHTML = '<p>No hay anuncios publicados.</p>';
        return;
    }
    
    news.forEach(article => {
        const newsItem = document.createElement('div');
        newsItem.className = 'content-item';
        newsItem.style.cssText = 'border: 1px solid #e5e7eb; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; background: #f9fafb;';
        
        const attachmentInfo = article.attachment ? `<p><small>Adjunto: ${article.attachment.name} (${article.attachment.type && article.attachment.type.includes('pdf') ? 'PDF' : 'Imagen'})</small></p>` : '';
        
        newsItem.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: start;">
                <div style="flex: 1;">
                    <h4>${article.title}</h4>
                    <p>${article.content.substring(0, 100)}...</p>
                    <p><small>Fecha: ${formatDate(article.date)}</small></p>
                    ${article.image ? `<p><small>Imagen: ${article.image.substring(0, 60)}...</small></p>` : ''}
                    ${attachmentInfo}
                </div>
                <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                    <button class="btn btn-primary btn-small" onclick="editNews(${article.id})">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn btn-danger btn-small" onclick="deleteNews(${article.id})">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </div>
            </div>
        `;
        newsList.appendChild(newsItem);
    });
}

// Cargar lista de bandos en admin
function loadBandoList() {
    const bandoList = document.getElementById('bandoList');
    if (!bandoList) return;

    bandoList.innerHTML = '';
    
    if (bandos.length === 0) {
        bandoList.innerHTML = '<p>No hay bandos publicados.</p>';
        return;
    }
    
    bandos.forEach(bando => {
        const bandoItem = document.createElement('div');
        bandoItem.className = 'content-item';
        bandoItem.style.cssText = 'border: 1px solid #e5e7eb; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; background: #f9fafb;';
        
        const attachmentSummary = bando.attachment ? `<p><small>Adjunto: ${bando.attachment.name} (${bando.attachment.type && bando.attachment.type.includes('pdf') ? 'PDF' : 'Imagen'})</small></p>` : '';
        const contentPreview = typeof bando.content === 'string' ? bando.content.replace(/<[^>]+>/g, '') : '';
        
        bandoItem.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: start;">
                <div style="flex: 1;">
                    <h4>${bando.title}</h4>
                    <p>${contentPreview.substring(0, 100)}${contentPreview.length > 100 ? '...' : ''}</p>
                    <p><small>Fecha: ${formatDate(bando.date)}</small></p>
                    ${attachmentSummary}
                </div>
                <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                    <button class="btn btn-primary btn-small" onclick="editBando(${bando.id})">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn btn-danger btn-small" onclick="deleteBando(${bando.id})">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </div>
            </div>
        `;
        bandoList.appendChild(bandoItem);
    });
}

// Cargar lista de usuarios
function loadUsersList() {
    const usersList = document.getElementById('usersList');
    if (!usersList) return;

    usersList.innerHTML = '';
    
    // Filtrar usuarios ocultos (super admin no debe aparecer en la lista)
    const visibleUsers = users.filter(user => !user.isHidden && !user.isSuperAdmin);
    
    visibleUsers.forEach(user => {
        const displayName = user.fullName || (user.name ? `${user.name}${user.surname1 ? ' ' + user.surname1 : ''}${user.surname2 ? ' ' + user.surname2 : ''}` : (user.nombre ? `${user.nombre}${user.apellidos ? ' ' + user.apellidos : ''}` : 'Usuario'));
        const userItem = document.createElement('div');
        userItem.className = 'user-item';
        userItem.innerHTML = `
            <div>
                <h4>${displayName}</h4>
                <p>${user.email}</p>
                ${user.dni || user.documentNumber ? `<p>${user.documentTypeName || 'Documento'}: ${user.documentNumber || user.dni}</p>` : ''}
                ${user.address || user.direccion ? `<p>📍 ${user.address || user.direccion}${user.city || user.ciudad ? ', ' + (user.city || user.ciudad) : ''}${user.postalCode || user.codigoPostal ? ' (' + (user.postalCode || user.codigoPostal) + ')' : ''}</p>` : ''}
                <p>Registrado: ${formatDate(user.registeredAt)}</p>
            </div>
            <div>
                <span class="badge ${user.consent ? 'badge-success' : 'badge-warning'}">
                    ${user.consent ? 'Consentimiento dado' : 'Sin consentimiento'}
                </span>
                ${user.notificationConsent ? '<span class="badge badge-info">Avisos</span>' : ''}
            </div>
        `;
        usersList.appendChild(userItem);
    });
    
    // Super administrador oculto - no se muestra en la lista
}
// Cargar lista de administradores
function loadAdminsList() {
    const adminsList = document.getElementById('adminsList');
    if (!adminsList) return;

    adminsList.innerHTML = '';
    
    // Mostrar todos los administradores
    administrators.forEach(admin => {
        const adminItem = document.createElement('div');
        adminItem.className = 'admin-item';
        adminItem.style.cssText = 'border: 1px solid #e5e7eb; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; background: #f9fafb;';
        
        const createdBy = admin.createdBy === 'system' ? 'Sistema' : admin.createdBy;
        const isCurrentAdmin = currentUser && (currentUser.email === admin.email || currentUser.adminId === admin.id);
        const createdDate = admin.createdAt ? new Date(admin.createdAt).toLocaleDateString('es-ES') : 'N/A';
        
        adminItem.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: start; flex-wrap: wrap;">
                <div style="flex: 1; min-width: 250px;">
                    <h4 style="margin: 0 0 0.5rem 0;">${admin.name} ${isCurrentAdmin ? '<span style="color: #3b82f6;">(Tú)</span>' : ''}</h4>
                    <p style="margin: 0.25rem 0;"><strong>Email:</strong> ${admin.email}</p>
                    <p style="margin: 0.25rem 0;"><strong>Creado por:</strong> ${createdBy}</p>
                    <p style="margin: 0.25rem 0;"><strong>Creado:</strong> ${createdDate}</p>
                </div>
                <div style="display: flex; flex-direction: column; gap: 0.5rem; align-items: flex-end;">
                <div>
                        <span class="badge ${admin.isActive ? 'badge-success' : 'badge-warning'}" style="padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.875rem;">
                        ${admin.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                        ${isCurrentAdmin ? '<span class="badge badge-info" style="padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.875rem; margin-left: 0.25rem;">Actual</span>' : ''}
                    </div>
                    <div style="display: flex; gap: 0.5rem;">
                        <button class="btn btn-sm btn-outline" onclick="editAdmin('${admin.id}')" style="padding: 0.5rem 1rem; font-size: 0.875rem;">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        ${!isCurrentAdmin ? `
                            <button class="btn btn-sm btn-danger" onclick="deleteAdmin('${admin.id}')" style="padding: 0.5rem 1rem; font-size: 0.875rem;">
                                <i class="fas fa-trash"></i> Eliminar
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
        adminsList.appendChild(adminItem);
    });
    
    // Super administrador oculto - no se muestra en la lista
}

// Cargar lista de documentos
function loadDocumentsList() {
    const documentsList = document.getElementById('documentsList');
    if (!documentsList) return;

    documentsList.innerHTML = '';
    
    if (documents.length === 0) {
        documentsList.innerHTML = '<p>No hay documentos subidos.</p>';
        return;
    }
    
    documents.forEach(doc => {
        const docItem = document.createElement('div');
        docItem.className = 'document-item';
        docItem.style.cssText = 'border: 1px solid #e5e7eb; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; background: #f9fafb;';
        
        const fileSizeKB = Math.round(doc.fileSize / 1024);
        const fileSizeMB = Math.round(doc.fileSize / (1024 * 1024) * 100) / 100;
        const displaySize = fileSizeMB > 1 ? `${fileSizeMB} MB` : `${fileSizeKB} KB`;
        
        docItem.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: start;">
                <div style="flex: 1;">
                    <h4>${doc.name}</h4>
                    <p><strong>Categoría:</strong> ${doc.category}</p>
                    <p><strong>Archivo:</strong> ${doc.fileName}</p>
                    <p><strong>Tamaño:</strong> ${displaySize}</p>
                    <p><strong>Subido por:</strong> ${doc.uploadedBy}</p>
                    <p><strong>Fecha:</strong> ${formatDate(doc.uploadedAt)}</p>
                    ${doc.description ? `<p><strong>Descripción:</strong> ${doc.description}</p>` : ''}
                </div>
                <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                    <button class="btn btn-primary btn-small" onclick="downloadDocument(${doc.id})">
                        <i class="fas fa-download"></i> Descargar
                    </button>
                    <button class="btn btn-warning btn-small" onclick="editDocument(${doc.id})">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn btn-danger btn-small" onclick="deleteDocument(${doc.id})">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </div>
            </div>
        `;
        documentsList.appendChild(docItem);
    });
}

// ===== CARNÉ MICOLÓGICO =====

function initializeCarnetModule() {
    loadCarnetRequestsFromLocal();
    loadCotoRequestsFromLocal();
    renderCarnetPublicInfo();
    loadCarnetConfig();
}

function loadCarnetRequestsFromLocal() {
    try {
        const saved = localStorage.getItem(CARNET_REQUESTS_LOCAL_KEY);
        carnetRequests = saved ? JSON.parse(saved) : [];
    } catch (error) {
        console.warn('No se pudo cargar el historial local de carnés:', error);
        carnetRequests = [];
    }
}

function loadCotoRequestsFromLocal() {
    try {
        const saved = localStorage.getItem(COTO_REQUESTS_LOCAL_KEY);
        cotoRequests = saved ? JSON.parse(saved) : [];
    } catch (error) {
        console.warn('No se pudo cargar el historial local del permiso de caza:', error);
        cotoRequests = [];
    }
}

function persistCarnetRequestsLocal() {
    try {
        localStorage.setItem(CARNET_REQUESTS_LOCAL_KEY, JSON.stringify(carnetRequests.slice(0, 500)));
    } catch (error) {
        console.warn('No se pudo guardar el historial local de carnés:', error);
    }
}

function persistCotoRequestsLocal() {
    try {
        localStorage.setItem(COTO_REQUESTS_LOCAL_KEY, JSON.stringify(cotoRequests.slice(0, 500)));
    } catch (error) {
        console.warn('No se pudo guardar el historial local del permiso de caza:', error);
    }
}

async function loadCarnetConfig() {
    try {
        const storedConfig = localStorage.getItem('carnetConfig');
        if (storedConfig) {
            const parsed = JSON.parse(storedConfig);
            carnetConfig = { ...DEFAULT_CARNET_CONFIG, ...parsed };
        } else {
            carnetConfig = { ...DEFAULT_CARNET_CONFIG };
        }
    } catch (error) {
        console.warn('No se pudo leer la configuración local del carné:', error);
        carnetConfig = { ...DEFAULT_CARNET_CONFIG };
    }

    renderCarnetPublicInfo();
    populateCarnetAdminForm();

    const firebaseReady = await waitForFirebase(7000);
    if (!firebaseReady || !window.firebase || !window.firebase.firestore) {
        return;
    }

    try {
        const configDoc = window.firebase.firestore().collection('config').doc('carnet');
        if (configDoc && typeof configDoc.get === 'function') {
            const snapshot = await configDoc.get();
            const exists = snapshot && (typeof snapshot.exists === 'function' ? snapshot.exists() : snapshot.exists);
            if (exists && snapshot && typeof snapshot.data === 'function') {
                const data = snapshot.data();
                const remoteConfig = { ...DEFAULT_CARNET_CONFIG, ...data };
                if (data.updatedAt && typeof data.updatedAt.toDate === 'function') {
                    remoteConfig.updatedAt = data.updatedAt.toDate().toISOString();
                } else if (data.updatedAtString) {
                    remoteConfig.updatedAt = data.updatedAtString;
                }
                carnetConfig = remoteConfig;
                localStorage.setItem('carnetConfig', JSON.stringify(carnetConfig));
                renderCarnetPublicInfo();
                populateCarnetAdminForm();
            }
        }
    } catch (error) {
        console.warn('No se pudo cargar la configuración del carné desde Firestore:', error);
    }
}

function toggleElementVisibility(element, shouldShow) {
    if (!element) return;
    element.classList.toggle('is-hidden', !shouldShow);
    element.setAttribute('aria-hidden', shouldShow ? 'false' : 'true');
}

function renderCarnetPublicInfo() {
    const micologicoEnabled = carnetConfig.micologicoVisible === true;
    const cotoEnabled = carnetConfig.cotoVisible === true;

    const micologicoCard = document.getElementById('carnetCardMicologico');
    const cotoCard = document.getElementById('carnetCardCoto');
    toggleElementVisibility(micologicoCard, micologicoEnabled);
    toggleElementVisibility(cotoCard, cotoEnabled);

    const instructionsEl = document.getElementById('carnetInstructions');
    const accountEl = document.getElementById('carnetAccountNumber');
    const feeEmpEl = document.getElementById('carnetFeeEmpadronado');
    const feeDesEl = document.getElementById('carnetFeeDescendiente');
    const feeVisEl = document.getElementById('carnetFeeVisitante');

    if (instructionsEl) {
        const instructions = (carnetConfig.instructions || DEFAULT_CARNET_CONFIG.instructions || '').trim();
        const safeInstructions = escapeHtml(instructions).replace(/\n/g, '<br>');
        instructionsEl.innerHTML = safeInstructions || 'Completa el formulario y sigue las instrucciones para formalizar tu solicitud.';
    }

    if (accountEl) {
        const account = (carnetConfig.accountNumber || '').trim();
        accountEl.textContent = account || 'Consultar en el ayuntamiento';
    }

    if (feeEmpEl) {
        feeEmpEl.textContent = (carnetConfig.feeEmpadronado || 'Consultar');
    }
    if (feeDesEl) {
        feeDesEl.textContent = (carnetConfig.feeDescendiente || 'Consultar');
    }
    if (feeVisEl) {
        feeVisEl.textContent = (carnetConfig.feeVisitante || 'Consultar');
    }

    const cotoInstructionsEl = document.getElementById('cotoInstructions');
    const cotoAccountEl = document.getElementById('cotoAccountNumber');
    const cotoFeeEl = document.getElementById('cotoFeeEmpadronado');

    if (cotoInstructionsEl) {
        const cotoInstructions = (carnetConfig.cotoInstructions || DEFAULT_CARNET_CONFIG.cotoInstructions || '').trim();
        const safeCotoInstructions = escapeHtml(cotoInstructions).replace(/\n/g, '<br>');
        cotoInstructionsEl.innerHTML = safeCotoInstructions || 'Completa el formulario y sigue las instrucciones para solicitar el permiso municipal de caza.';
    }

    if (cotoAccountEl) {
        const cotoAccount = (carnetConfig.cotoAccountNumber || carnetConfig.accountNumber || '').trim();
        cotoAccountEl.textContent = cotoAccount || 'Consultar en el ayuntamiento';
    }

    if (cotoFeeEl) {
        const cotoFee = (carnetConfig.cotoFeeEmpadronado || '').trim();
        cotoFeeEl.textContent = cotoFee || 'Consultar';
    }
}

function populateCarnetAdminForm() {
    const accountInput = document.getElementById('carnetConfigAccount');
    if (!accountInput) {
        return;
    }

    accountInput.value = carnetConfig.accountNumber || '';

    const emailInput = document.getElementById('carnetConfigEmail');
    if (emailInput) {
        emailInput.value = carnetConfig.emailRecipient || DEFAULT_CARNET_CONFIG.emailRecipient;
    }

    const feeEmpInput = document.getElementById('carnetConfigFeeEmpadronado');
    if (feeEmpInput) {
        feeEmpInput.value = carnetConfig.feeEmpadronado || '';
    }

    const feeDescInput = document.getElementById('carnetConfigFeeDescendiente');
    if (feeDescInput) {
        feeDescInput.value = carnetConfig.feeDescendiente || '';
    }

    const feeVisInput = document.getElementById('carnetConfigFeeVisitante');
    if (feeVisInput) {
        feeVisInput.value = carnetConfig.feeVisitante || '';
    }

    const instructionsInput = document.getElementById('carnetConfigInstructions');
    if (instructionsInput) {
        instructionsInput.value = carnetConfig.instructions || '';
    }

    const showMicologicoCheckbox = document.getElementById('carnetConfigShowMicologico');
    if (showMicologicoCheckbox) {
        showMicologicoCheckbox.checked = carnetConfig.micologicoVisible === true;
    }

    const showCotoCheckbox = document.getElementById('carnetConfigShowCoto');
    if (showCotoCheckbox) {
        showCotoCheckbox.checked = carnetConfig.cotoVisible === true;
    }

    const cotoAccountInput = document.getElementById('carnetConfigCotoAccount');
    if (cotoAccountInput) {
        cotoAccountInput.value = carnetConfig.cotoAccountNumber || carnetConfig.accountNumber || '';
    }

    const cotoEmailInput = document.getElementById('carnetConfigCotoEmail');
    if (cotoEmailInput) {
        cotoEmailInput.value = carnetConfig.cotoEmailRecipient || carnetConfig.emailRecipient || DEFAULT_CARNET_CONFIG.emailRecipient;
    }

    const cotoFeeInput = document.getElementById('carnetConfigCotoFee');
    if (cotoFeeInput) {
        cotoFeeInput.value = carnetConfig.cotoFeeEmpadronado || '';
    }

    const cotoInstructionsInput = document.getElementById('carnetConfigCotoInstructions');
    if (cotoInstructionsInput) {
        cotoInstructionsInput.value = carnetConfig.cotoInstructions || DEFAULT_CARNET_CONFIG.cotoInstructions || '';
    }

    const feedback = document.getElementById('carnetConfigFeedback');
    if (feedback) {
        feedback.classList.remove('success', 'error');
        if (carnetConfig.updatedAt) {
            feedback.textContent = `Última actualización: ${formatDateTime(carnetConfig.updatedAt)}`;
        } else {
            feedback.textContent = '';
        }
    }
}

async function saveCarnetConfig(updates = {}, options = {}) {
    carnetConfig = {
        ...DEFAULT_CARNET_CONFIG,
        ...carnetConfig,
        ...updates,
        updatedAt: new Date().toISOString()
    };

    try {
        localStorage.setItem('carnetConfig', JSON.stringify(carnetConfig));
    } catch (error) {
        console.warn('No se pudo guardar la configuración local del carné:', error);
    }

    renderCarnetPublicInfo();
    populateCarnetAdminForm();

    if (options.skipRemote) {
        return carnetConfig;
    }

    const firebaseReady = await waitForFirebase(7000);
    if (!firebaseReady || !window.firebase || !window.firebase.firestore) {
        return carnetConfig;
    }

    try {
        const docRef = window.firebase.firestore().collection('config').doc('carnet');
        if (docRef && typeof docRef.set === 'function') {
            await docRef.set({
                accountNumber: carnetConfig.accountNumber || '',
                feeEmpadronado: carnetConfig.feeEmpadronado || '',
                feeDescendiente: carnetConfig.feeDescendiente || '',
                feeVisitante: carnetConfig.feeVisitante || '',
                instructions: carnetConfig.instructions || '',
                emailRecipient: carnetConfig.emailRecipient || DEFAULT_CARNET_CONFIG.emailRecipient,
                micologicoVisible: carnetConfig.micologicoVisible === true,
                cotoVisible: carnetConfig.cotoVisible === true,
                cotoAccountNumber: carnetConfig.cotoAccountNumber || '',
                cotoFeeEmpadronado: carnetConfig.cotoFeeEmpadronado || '',
                cotoInstructions: carnetConfig.cotoInstructions || DEFAULT_CARNET_CONFIG.cotoInstructions,
                cotoEmailRecipient: carnetConfig.cotoEmailRecipient || carnetConfig.emailRecipient || DEFAULT_CARNET_CONFIG.cotoEmailRecipient,
                updatedAt: new Date(),
                updatedAtString: carnetConfig.updatedAt
            }, { merge: true });
        }
    } catch (error) {
        console.error('No se pudo guardar la configuración del carné en Firestore:', error);
        throw error;
    }

    return carnetConfig;
}

function setCarnetConfigFeedback(message, status = 'info') {
    const feedback = document.getElementById('carnetConfigFeedback');
    if (!feedback) return;
    feedback.textContent = message || '';
    feedback.classList.remove('success', 'error');
    if (status === 'success') {
        feedback.classList.add('success');
    } else if (status === 'error') {
        feedback.classList.add('error');
    }
}

async function handleCarnetConfigSave() {
    const accountInput = document.getElementById('carnetConfigAccount');
    const emailInput = document.getElementById('carnetConfigEmail');
    const feeEmpInput = document.getElementById('carnetConfigFeeEmpadronado');
    const feeDescInput = document.getElementById('carnetConfigFeeDescendiente');
    const feeVisInput = document.getElementById('carnetConfigFeeVisitante');
    const instructionsInput = document.getElementById('carnetConfigInstructions');
    const showMicologicoCheckbox = document.getElementById('carnetConfigShowMicologico');
    const showCotoCheckbox = document.getElementById('carnetConfigShowCoto');
    const cotoAccountInput = document.getElementById('carnetConfigCotoAccount');
    const cotoEmailInput = document.getElementById('carnetConfigCotoEmail');
    const cotoFeeInput = document.getElementById('carnetConfigCotoFee');
    const cotoInstructionsInput = document.getElementById('carnetConfigCotoInstructions');

    const updates = {
        accountNumber: (accountInput?.value || '').trim(),
        emailRecipient: (emailInput?.value || '').trim() || DEFAULT_CARNET_CONFIG.emailRecipient,
        feeEmpadronado: (feeEmpInput?.value || '').trim(),
        feeDescendiente: (feeDescInput?.value || '').trim(),
        feeVisitante: (feeVisInput?.value || '').trim(),
        instructions: (instructionsInput?.value || '').trim(),
        micologicoVisible: showMicologicoCheckbox ? showMicologicoCheckbox.checked : carnetConfig.micologicoVisible,
        cotoVisible: showCotoCheckbox ? showCotoCheckbox.checked : carnetConfig.cotoVisible,
        cotoAccountNumber: (cotoAccountInput?.value || '').trim(),
        cotoEmailRecipient: (cotoEmailInput?.value || '').trim() || (emailInput?.value || '').trim() || DEFAULT_CARNET_CONFIG.emailRecipient,
        cotoFeeEmpadronado: (cotoFeeInput?.value || '').trim(),
        cotoInstructions: (cotoInstructionsInput?.value || '').trim()
    };

    try {
        await saveCarnetConfig(updates);
        setCarnetConfigFeedback('Configuración guardada correctamente.', 'success');
        showNotification('Configuración del carné actualizada', 'success');
    } catch (error) {
        setCarnetConfigFeedback('No se pudo guardar la configuración en la nube. Revisa la consola.', 'error');
        showNotification('Ocurrió un problema al guardar la configuración.', 'error');
    }
}

async function handleCarnetConfigReset() {
    try {
        await saveCarnetConfig({ ...DEFAULT_CARNET_CONFIG });
        setCarnetConfigFeedback('Configuración restablecida a los valores por defecto.', 'success');
        showNotification('Configuración restablecida', 'success');
    } catch (error) {
        setCarnetConfigFeedback('No se pudo restablecer la configuración. Revisa la consola.', 'error');
        showNotification('Ocurrió un problema al restablecer la configuración.', 'error');
    }
}

function setCarnetFormFeedback(message, status = 'info') {
    const feedback = document.getElementById('carnetFormFeedback');
    if (!feedback) return;
    feedback.textContent = message || '';
    feedback.classList.remove('success', 'error');
    if (status === 'success') {
        feedback.classList.add('success');
    } else if (status === 'error') {
        feedback.classList.add('error');
    }
}

function resetCarnetForm(form) {
    form.reset();
    const radios = form.querySelectorAll('input[name="tipoSolicitante"]');
    radios.forEach(radio => radio.checked = false);
}

function getCarnetFeeByType(type) {
    if (type === 'empadronado') {
        return carnetConfig.feeEmpadronado || '';
    }
    if (type === 'descendiente') {
        return carnetConfig.feeDescendiente || '';
    }
    if (type === 'visitante') {
        return carnetConfig.feeVisitante || '';
    }
    return '';
}

function getCarnetApplicantLabel(type) {
    const labels = {
        empadronado: 'Empadronado/a',
        descendiente: 'Descendiente',
        visitante: 'Visitante'
    };
    return labels[type] || type || 'Otro';
}

async function handleCarnetFormSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const loadingSpan = submitBtn?.querySelector('.btn-loading');
    const btnTextSpan = submitBtn?.querySelector('.btn-text');

    const nombre = (form.querySelector('#carnetNombre')?.value || '').trim();
    const apellidos = (form.querySelector('#carnetApellidos')?.value || '').trim();
    const documentoTipo = form.querySelector('#carnetDocumentoTipo')?.value || '';
    const documentoNumero = (form.querySelector('#carnetDocumentoNumero')?.value || '').trim();
    const direccion = (form.querySelector('#carnetDireccion')?.value || '').trim();
    const email = (form.querySelector('#carnetEmail')?.value || '').trim();
    const telefono = (form.querySelector('#carnetTelefono')?.value || '').trim();
    const tipoSolicitanteInput = form.querySelector('input[name="tipoSolicitante"]:checked');
    const tipoSolicitante = tipoSolicitanteInput ? tipoSolicitanteInput.value : '';
    const consentimiento = form.querySelector('#carnetConsent')?.checked;

    if (!nombre || !apellidos || !documentoTipo || !documentoNumero || !direccion) {
        setCarnetFormFeedback('Por favor, completa todos los campos obligatorios.', 'error');
        return;
    }

    if (!tipoSolicitante) {
        setCarnetFormFeedback('Selecciona el tipo de solicitante.', 'error');
        return;
    }

    if (!consentimiento) {
        setCarnetFormFeedback('Debes aceptar el tratamiento de datos personales.', 'error');
        return;
    }

    const fullName = `${nombre} ${apellidos}`.trim();
    const nowIso = new Date().toISOString();
    const fee = getCarnetFeeByType(tipoSolicitante);
    const applicantLabel = getCarnetApplicantLabel(tipoSolicitante);

    const localRecord = {
        id: `carnet-${Date.now()}`,
        nombre,
        apellidos,
        nombreCompleto: fullName,
        documentoTipo,
        documentoNumero,
        direccion,
        email,
        telefono,
        tipoSolicitante,
        tipoSolicitanteLabel: applicantLabel,
        cuota: fee,
        dataConsent: true,
        createdAt: nowIso
    };

    try {
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.classList.add('loading');
        }
        if (loadingSpan) {
            loadingSpan.style.display = 'inline-flex';
        }
        if (btnTextSpan) {
            btnTextSpan.style.display = 'none';
        }

        carnetRequests.unshift(localRecord);
        persistCarnetRequestsLocal();

        let remoteSaved = false;
        const firebaseReady = await waitForFirebase(7000);
        if (firebaseReady && window.firebase && window.firebase.firestore) {
            try {
                await window.firebase.firestore().collection('carnet_requests').add({
                    nombre,
                    apellidos,
                    nombreCompleto: fullName,
                    documentoTipo,
                    documentoNumero,
                    direccion,
                    email,
                    telefono,
                    tipoSolicitante,
                    tipoSolicitanteLabel: applicantLabel,
                    cuota: fee,
                    dataConsent: true,
                    createdAt: new Date(),
                    createdAtString: nowIso,
                    source: 'web'
                });
                remoteSaved = true;
            } catch (firestoreError) {
                console.error('No se pudo registrar la solicitud en Firestore:', firestoreError);
            }
        }

        let emailSent = false;
        const recipient = (carnetConfig.emailRecipient || DEFAULT_CARNET_CONFIG.emailRecipient || '').trim();
        if (recipient) {
            const messageLines = [
                `Nombre: ${fullName}`,
                `Tipo de solicitante: ${applicantLabel}`,
                `Documento (${documentoTipo.toUpperCase()}): ${documentoNumero}`,
                `Dirección: ${direccion}`,
                email ? `Correo electrónico: ${email}` : null,
                telefono ? `Teléfono: ${telefono}` : null,
                fee ? `Cuota aplicable: ${fee}` : null,
                `Acepta tratamiento de datos: Sí`,
                `Fecha de solicitud: ${formatDateTime(nowIso)}`
            ].filter(Boolean);

            try {
                emailSent = await sendGeneralNoticeEmail(recipient, {
                    title: 'Nueva solicitud de carné micológico',
                    message: messageLines.join('\n'),
                    attachmentName: null,
                    attachmentUrl: null
                });
            } catch (emailError) {
                console.error('No se pudo enviar el correo de solicitud de carné:', emailError);
            }
        }

        setCarnetFormFeedback('Solicitud enviada correctamente. Recibirás la confirmación por correo electrónico.', 'success');
        showNotification('Solicitud de carné enviada correctamente.', 'success');
        resetCarnetForm(form);

        if (window.Metrics && typeof window.Metrics.recordEvent === 'function') {
            window.Metrics.recordEvent('carnet_request_submitted', {
                applicantType: tipoSolicitante,
                emailSent: emailSent
            });
        }

        if (isAdmin) {
            loadCarnetRequestsAdmin();
        }

        if (!remoteSaved) {
            console.warn('La solicitud se guardó localmente, pero no se pudo registrar en Firestore.');
        }
    } catch (error) {
        console.error('Error al procesar la solicitud de carné:', error);
        setCarnetFormFeedback('Ocurrió un error al enviar la solicitud. Inténtalo de nuevo en unos minutos.', 'error');
        showNotification('No se pudo enviar la solicitud en este momento.', 'error');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.classList.remove('loading');
        }
        if (loadingSpan) {
            loadingSpan.style.display = 'none';
        }
        if (btnTextSpan) {
            btnTextSpan.style.display = 'inline';
        }
    }
}

function setCotoFormFeedback(message, status = 'info') {
    const feedback = document.getElementById('cotoFormFeedback');
    if (!feedback) return;
    feedback.textContent = message || '';
    feedback.classList.remove('success', 'error');
    if (status === 'success') {
        feedback.classList.add('success');
    } else if (status === 'error') {
        feedback.classList.add('error');
    }
}

function resetCotoForm(form) {
    form.reset();
}

async function handleCotoFormSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const loadingSpan = submitBtn?.querySelector('.btn-loading');
    const btnTextSpan = submitBtn?.querySelector('.btn-text');

    const nombre = (form.querySelector('#cotoNombre')?.value || '').trim();
    const apellidos = (form.querySelector('#cotoApellidos')?.value || '').trim();
    const documentoTipo = form.querySelector('#cotoDocumentoTipo')?.value || '';
    const documentoNumero = (form.querySelector('#cotoDocumentoNumero')?.value || '').trim();
    const direccion = (form.querySelector('#cotoDireccion')?.value || '').trim();
    const email = (form.querySelector('#cotoEmail')?.value || '').trim();
    const telefono = (form.querySelector('#cotoTelefono')?.value || '').trim();
    const licencia = (form.querySelector('#cotoLicencia')?.value || '').trim();
    const consentimiento = form.querySelector('#cotoConsent')?.checked;

    if (!nombre || !apellidos || !documentoTipo || !documentoNumero || !direccion || !licencia) {
        setCotoFormFeedback('Por favor, completa todos los campos obligatorios.', 'error');
        return;
    }

    if (!consentimiento) {
        setCotoFormFeedback('Debes aceptar el tratamiento de datos personales.', 'error');
        return;
    }

    const fullName = `${nombre} ${apellidos}`.trim();
    const nowIso = new Date().toISOString();
    const cuota = (carnetConfig.cotoFeeEmpadronado || '').trim();

    const localRecord = {
        id: `coto-${Date.now()}`,
        nombre,
        apellidos,
        nombreCompleto: fullName,
        documentoTipo,
        documentoNumero,
        direccion,
        email,
        telefono,
        licenciaNumero: licencia,
        tipoSolicitante: 'empadronado',
        tipoSolicitanteLabel: getCarnetApplicantLabel('empadronado'),
        cuota,
        dataConsent: true,
        createdAt: nowIso
    };

    try {
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.classList.add('loading');
        }
        if (loadingSpan) {
            loadingSpan.style.display = 'inline-flex';
        }
        if (btnTextSpan) {
            btnTextSpan.style.display = 'none';
        }

        cotoRequests.unshift(localRecord);
        persistCotoRequestsLocal();

        let remoteSaved = false;
        const firebaseReady = await waitForFirebase(7000);
        if (firebaseReady && window.firebase && window.firebase.firestore) {
            try {
                await window.firebase.firestore().collection('coto_requests').add({
                    nombre,
                    apellidos,
                    nombreCompleto: fullName,
                    documentoTipo,
                    documentoNumero,
                    direccion,
                    email,
                    telefono,
                    licenciaNumero: licencia,
                    tipoSolicitante: 'empadronado',
                    tipoSolicitanteLabel: getCarnetApplicantLabel('empadronado'),
                    cuota,
                    dataConsent: true,
                    createdAt: new Date(),
                    createdAtString: nowIso,
                    source: 'web'
                });
                remoteSaved = true;
            } catch (firestoreError) {
                console.error('No se pudo registrar la solicitud de caza en Firestore:', firestoreError);
            }
        }

        let emailSent = false;
        const recipient = (carnetConfig.cotoEmailRecipient || carnetConfig.emailRecipient || DEFAULT_CARNET_CONFIG.cotoEmailRecipient || DEFAULT_CARNET_CONFIG.emailRecipient || '').trim();
        if (recipient) {
            const messageLines = [
                `Nombre: ${fullName}`,
                `Tipo de solicitante: Empadronado/a`,
                `Documento (${documentoTipo.toUpperCase()}): ${documentoNumero}`,
                `Dirección: ${direccion}`,
                email ? `Correo electrónico: ${email}` : null,
                telefono ? `Teléfono: ${telefono}` : null,
                `Número de licencia de caza: ${licencia}`,
                cuota ? `Cuota aplicable: ${cuota}` : null,
                `Acepta tratamiento de datos: Sí`,
                `Fecha de solicitud: ${formatDateTime(nowIso)}`
            ].filter(Boolean);

            try {
                emailSent = await sendGeneralNoticeEmail(recipient, {
                    title: 'Nueva solicitud permiso Coto de Caza',
                    message: messageLines.join('\n'),
                    attachmentName: null,
                    attachmentUrl: null
                });
            } catch (emailError) {
                console.error('No se pudo enviar el correo de solicitud de permiso de caza:', emailError);
            }
        }

        setCotoFormFeedback('Solicitud de permiso enviada correctamente.', 'success');
        showNotification('Solicitud de permiso de caza enviada correctamente.', 'success');
        resetCotoForm(form);

        if (window.Metrics && typeof window.Metrics.recordEvent === 'function') {
            window.Metrics.recordEvent('coto_request_submitted', {
                emailSent: emailSent
            });
        }

        if (isAdmin) {
            loadCotoRequestsAdmin();
        }

        if (!remoteSaved) {
            console.warn('La solicitud de caza se guardó localmente, pero no se pudo registrar en Firestore.');
        }
    } catch (error) {
        console.error('Error al procesar la solicitud del permiso de caza:', error);
        setCotoFormFeedback('Ocurrió un error al enviar la solicitud. Inténtalo de nuevo en unos minutos.', 'error');
        showNotification('No se pudo enviar la solicitud de permiso de caza en este momento.', 'error');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.classList.remove('loading');
        }
        if (loadingSpan) {
            loadingSpan.style.display = 'none';
        }
        if (btnTextSpan) {
            btnTextSpan.style.display = 'inline';
        }
    }
}

async function loadCarnetRequestsAdmin() {
    const tbody = document.getElementById('carnetRequestsTableBody');
    const summary = document.getElementById('carnetRequestsSummary');

    renderCarnetRequestsAdmin();

    const firebaseReady = await waitForFirebase(7000);
    if (!firebaseReady || !window.firebase || !window.firebase.firestore) {
        if (summary) {
            summary.textContent = 'Mostrando solicitudes almacenadas localmente (sin conexión a la base de datos).';
        }
        return;
    }

    try {
        const snapshot = await window.firebase.firestore().collection('carnet_requests').get();
        const remoteRequests = [];
        snapshot.forEach(doc => {
            const data = typeof doc.data === 'function' ? doc.data() : null;
            if (!data) return;

            let createdAtIso = data.createdAtString || null;
            if (!createdAtIso && data.createdAt && typeof data.createdAt.toDate === 'function') {
                createdAtIso = data.createdAt.toDate().toISOString();
            }

            remoteRequests.push({
                id: doc.id,
                nombre: data.nombre || '',
                apellidos: data.apellidos || '',
                nombreCompleto: data.nombreCompleto || `${data.nombre || ''} ${data.apellidos || ''}`.trim(),
                documentoTipo: data.documentoTipo || '',
                documentoNumero: data.documentoNumero || '',
                direccion: data.direccion || '',
                email: data.email || '',
                telefono: data.telefono || '',
                tipoSolicitante: data.tipoSolicitante || '',
                tipoSolicitanteLabel: data.tipoSolicitanteLabel || getCarnetApplicantLabel(data.tipoSolicitante),
                cuota: data.cuota || '',
                dataConsent: data.dataConsent === true,
                createdAt: createdAtIso || new Date().toISOString()
            });
        });

        remoteRequests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        carnetRequests = remoteRequests;
        persistCarnetRequestsLocal();
        renderCarnetRequestsAdmin();

        if (summary) {
            summary.textContent = `Solicitudes totales registradas: ${carnetRequests.length}`;
        }
    } catch (error) {
        console.error('No se pudieron cargar las solicitudes de cartera desde Firestore:', error);
        if (summary) {
            summary.textContent = 'No se pudieron cargar las solicitudes desde la base de datos. Se muestran los datos guardados en este dispositivo.';
        }
    }
}

function renderCarnetRequestsAdmin() {
    const tbody = document.getElementById('carnetRequestsTableBody');
    const summary = document.getElementById('carnetRequestsSummary');
    if (!tbody) return;

    if (!carnetRequests.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" id="carnetRequestsEmpty">No hay solicitudes registradas.</td>
            </tr>
        `;
        if (summary) {
            summary.textContent = 'No se han registrado solicitudes todavía.';
        }
        return;
    }

    const rows = carnetRequests.map(request => {
        const createdAtLabel = formatDateTime(request.createdAt);
        const contactLines = [
            request.email ? `Correo: ${request.email}` : null,
            request.telefono ? `Teléfono: ${request.telefono}` : null
        ].filter(Boolean).join('<br>');

        return `
            <tr>
                <td>${escapeHtml(createdAtLabel)}</td>
                <td>${escapeHtml(request.nombreCompleto || `${request.nombre} ${request.apellidos}`.trim())}</td>
                <td>${escapeHtml(request.documentoTipo ? request.documentoTipo.toUpperCase() : '')}<br>${escapeHtml(request.documentoNumero || '')}</td>
                <td>${escapeHtml(request.tipoSolicitanteLabel || getCarnetApplicantLabel(request.tipoSolicitante))}${request.cuota ? `<br><small>Cuota: ${escapeHtml(request.cuota)}</small>` : ''}</td>
                <td>${contactLines ? contactLines : '—'}</td>
                <td>${escapeHtml(request.direccion || '')}</td>
            </tr>
        `;
    }).join('');

    tbody.innerHTML = rows;

    if (summary) {
        summary.textContent = `Solicitudes listadas: ${carnetRequests.length}`;
    }
}

function exportCarnetRequests() {
    if (!carnetRequests.length) {
        showNotification('No hay solicitudes para exportar.', 'warning');
        return;
    }

    const headers = ['Fecha', 'Nombre', 'Tipo solicitante', 'Documento', 'Dirección', 'Correo', 'Teléfono', 'Cuota'];
    const rows = carnetRequests.map(request => [
        formatDateTime(request.createdAt),
        `${request.nombreCompleto || `${request.nombre} ${request.apellidos}`.trim()}`.trim(),
        request.tipoSolicitanteLabel || getCarnetApplicantLabel(request.tipoSolicitante),
        `${(request.documentoTipo || '').toUpperCase()} ${request.documentoNumero || ''}`.trim(),
        request.direccion || '',
        request.email || '',
        request.telefono || '',
        request.cuota || ''
    ]);

    const csvContent = [headers, ...rows]
        .map(columns => columns.map(value => `"${(value || '').replace(/"/g, '""')}"`).join(','))
        .join('\n');

    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `solicitudes-carnet-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showNotification('Exportación de solicitudes completada.', 'success');
}

// ===== FIN CARNÉ MICOLÓGICO =====

async function loadCotoRequestsAdmin() {
    const summary = document.getElementById('cotoRequestsSummary');

    renderCotoRequestsAdmin();

    const firebaseReady = await waitForFirebase(7000);
    if (!firebaseReady || !window.firebase || !window.firebase.firestore) {
        if (summary) {
            summary.textContent = 'Mostrando solicitudes almacenadas localmente (sin conexión a la base de datos).';
        }
        return;
    }

    try {
        const snapshot = await window.firebase.firestore().collection('coto_requests').get();
        const remoteRequests = [];
        snapshot.forEach(doc => {
            const data = typeof doc.data === 'function' ? doc.data() : null;
            if (!data) return;

            let createdAtIso = data.createdAtString || null;
            if (!createdAtIso && data.createdAt && typeof data.createdAt.toDate === 'function') {
                createdAtIso = data.createdAt.toDate().toISOString();
            }

            remoteRequests.push({
                id: doc.id,
                nombre: data.nombre || '',
                apellidos: data.apellidos || '',
                nombreCompleto: data.nombreCompleto || `${data.nombre || ''} ${data.apellidos || ''}`.trim(),
                documentoTipo: data.documentoTipo || '',
                documentoNumero: data.documentoNumero || '',
                direccion: data.direccion || '',
                email: data.email || '',
                telefono: data.telefono || '',
                licenciaNumero: data.licenciaNumero || '',
                cuota: data.cuota || '',
                dataConsent: data.dataConsent === true,
                createdAt: createdAtIso || new Date().toISOString()
            });
        });

        remoteRequests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        cotoRequests = remoteRequests;
        persistCotoRequestsLocal();
        renderCotoRequestsAdmin();

        if (summary) {
            summary.textContent = `Solicitudes totales registradas: ${cotoRequests.length}`;
        }
    } catch (error) {
        console.error('No se pudieron cargar las solicitudes de caza desde Firestore:', error);
        if (summary) {
            summary.textContent = 'No se pudieron cargar las solicitudes desde la base de datos. Se muestran los datos guardados en este dispositivo.';
        }
    }
}

function renderCotoRequestsAdmin() {
    const tbody = document.getElementById('cotoRequestsTableBody');
    const summary = document.getElementById('cotoRequestsSummary');
    if (!tbody) return;

    if (!cotoRequests.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" id="cotoRequestsEmpty">No hay solicitudes registradas.</td>
            </tr>
        `;
        if (summary) {
            summary.textContent = 'No se han registrado solicitudes todavía.';
        }
        return;
    }

    const rows = cotoRequests.map(request => {
        const createdAtLabel = formatDateTime(request.createdAt);
        const contactLines = [
            request.email ? `Correo: ${request.email}` : null,
            request.telefono ? `Teléfono: ${request.telefono}` : null
        ].filter(Boolean).join('<br>');

        return `
            <tr>
                <td>${escapeHtml(createdAtLabel)}</td>
                <td>${escapeHtml(request.nombreCompleto || `${request.nombre} ${request.apellidos}`.trim())}</td>
                <td>${escapeHtml(request.documentoTipo ? request.documentoTipo.toUpperCase() : '')}<br>${escapeHtml(request.documentoNumero || '')}</td>
                <td>${escapeHtml(request.licenciaNumero || '')}</td>
                <td>${contactLines ? contactLines : '—'}</td>
                <td>${escapeHtml(request.direccion || '')}</td>
            </tr>
        `;
    }).join('');

    tbody.innerHTML = rows;

    if (summary) {
        summary.textContent = `Solicitudes listadas: ${cotoRequests.length}`;
    }
}

function exportCotoRequests() {
    if (!cotoRequests.length) {
        showNotification('No hay solicitudes para exportar.', 'warning');
        return;
    }

    const headers = ['Fecha', 'Nombre', 'Documento', 'Licencia de caza', 'Dirección', 'Correo', 'Teléfono', 'Cuota'];
    const rows = cotoRequests.map(request => [
        formatDateTime(request.createdAt),
        `${request.nombreCompleto || `${request.nombre} ${request.apellidos}`.trim()}`.trim(),
        `${(request.documentoTipo || '').toUpperCase()} ${request.documentoNumero || ''}`.trim(),
        request.licenciaNumero || '',
        request.direccion || '',
        request.email || '',
        request.telefono || '',
        request.cuota || ''
    ]);

    const csvContent = [headers, ...rows]
        .map(columns => columns.map(value => `"${(value || '').replace(/"/g, '""')}"`).join(','))
        .join('\n');

    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `solicitudes-coto-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showNotification('Exportación de solicitudes completada.', 'success');
}

// Cargar lista de eventos
function loadEventsList() {
    const eventsList = document.getElementById('eventsList');
    if (!eventsList) return;

    eventsList.innerHTML = '';
    
    if (events.length === 0) {
        eventsList.innerHTML = '<p>No hay eventos programados.</p>';
        return;
    }
    
    events.forEach(event => {
        const eventItem = document.createElement('div');
        eventItem.className = 'event-item';
        eventItem.style.cssText = 'border: 1px solid #e5e7eb; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; background: #f9fafb;';
        
        eventItem.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: start;">
                <div style="flex: 1;">
                    <h4>${event.title}</h4>
                    <p>${event.description}</p>
                    <p><strong>Fecha:</strong> ${formatDate(event.date)}</p>
                    <p><strong>Hora:</strong> ${event.time}</p>
                    <p><strong>Ubicación:</strong> ${event.location}</p>
                    <p><strong>Categoría:</strong> ${event.category}</p>
                </div>
                <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                    <button class="btn btn-primary btn-small" onclick="editEvent(${event.id})">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn btn-danger btn-small" onclick="deleteEvent(${event.id})">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </div>
            </div>
        `;
        eventsList.appendChild(eventItem);
    });
}

// Cargar lista de acceso rápido
function loadQuickAccessList() {
    const quickAccessList = document.getElementById('quickAccessList');
    if (!quickAccessList) return;

    quickAccessList.innerHTML = '';
    
    if (quickAccess.length === 0) {
        quickAccessList.innerHTML = '<p>No hay tarjetas de acceso rápido configuradas.</p>';
        return;
    }
    
    // Ordenar por el campo order
    const sortedQuickAccess = [...quickAccess].sort((a, b) => a.order - b.order);
    
    sortedQuickAccess.forEach(item => {
        const quickItem = document.createElement('div');
        quickItem.className = 'quick-access-item';
        quickItem.style.cssText = 'border: 1px solid #e5e7eb; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; background: #f9fafb;';
        
        quickItem.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: start;">
                <div style="flex: 1;">
                    <h4><i class="${item.icon}"></i> ${item.title}</h4>
                    <p>${item.description}</p>
                    <p><strong>Sección:</strong> ${item.section}</p>
                    <p><strong>Orden:</strong> ${item.order}</p>
                    <p><strong>Estado:</strong> ${item.isActive ? 'Activo' : 'Inactivo'}</p>
                </div>
                <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                    <button class="btn btn-primary btn-small" onclick="editQuickAccess(${item.id})">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn btn-danger btn-small" onclick="deleteQuickAccess(${item.id})">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </div>
            </div>
        `;
        quickAccessList.appendChild(quickItem);
    });
}

// Cargar historial de notificaciones
function loadNotificationsHistory() {
    const history = document.getElementById('notificationsHistory');
    if (!history) return;

    history.innerHTML = '';
    notifications.slice(-10).reverse().forEach(notification => {
        const notifItem = document.createElement('div');
        notifItem.className = 'notification-item';
        notifItem.innerHTML = `
            <div>
                <h4>${notification.title}</h4>
                <p>${notification.message}</p>
                <p class="notification-time">${formatDate(notification.date)}</p>
            </div>
        `;
        history.appendChild(notifItem);
    });
}

// Cargar notificaciones
function loadNotifications() {
    const savedNotifications = localStorage.getItem('userNotifications');
    if (savedNotifications) {
        const userNotifications = JSON.parse(savedNotifications);
        updateNotificationCenter(userNotifications);
    }
}

// Actualizar centro de notificaciones
function updateNotificationCenter(userNotifications = null) {
    const notificationsList = document.getElementById('notificationsList');
    const notificationBadge = document.getElementById('notificationBadge');
    const notificationBell = document.getElementById('notificationBell');
    
    if (!notificationsList || !notificationBadge || !notificationBell) return;

    // Solo mostrar notificaciones si el usuario está logueado
    if (!currentUser) {
        notificationBell.style.display = 'none';
        return;
    }

    // Mostrar campana de notificaciones solo para usuarios logueados
    notificationBell.style.display = 'block';

    let sourceNotifications = userNotifications ? [...userNotifications] : [...notifications];
    let idsUpdated = false;

    sourceNotifications.forEach((notification, index) => {
        if (!notification.id) {
            notification.id = `notif-${notification.date || Date.now()}-${index}`;
            idsUpdated = true;
        }
    });

    if (!userNotifications && idsUpdated) {
        localStorage.setItem('notifications', JSON.stringify(sourceNotifications));
        notifications = sourceNotifications;
    } else if (userNotifications && idsUpdated) {
        localStorage.setItem('userNotifications', JSON.stringify(sourceNotifications));
    }

    const notificationsToShow = (userNotifications ? sourceNotifications : sourceNotifications.slice(-5)).reverse();
    const unreadCount = notificationsToShow.filter(n => !n.read).length;

    notificationBadge.textContent = unreadCount;
    notificationBadge.style.display = unreadCount > 0 ? 'flex' : 'none';

    if (notificationsToShow.length === 0) {
        notificationsList.innerHTML = '<p class="no-notifications">No tienes avisos aún</p>';
        selectedUserNotifications.clear();
        updateUserNotificationsActions();
        return;
    }

    const sanitizedSelection = new Set();
    const itemsHtml = notificationsToShow.map(notification => {
        const isSelected = selectedUserNotifications.has(notification.id);
        if (isSelected) {
            sanitizedSelection.add(notification.id);
        }
        const attachmentIcon = notification.attachment ? '<i class="fas fa-paperclip" style="color: #3b82f6; margin-left: 5px;"></i>' : '';
        const messagePreview = notification.message ? notification.message.substring(0, 80) : '';
        return `
            <div class="notification-item ${!notification.read ? 'unread' : ''} ${isSelected ? 'selected' : ''}" data-id="${notification.id}">
                <div class="notification-header">
                    <label class="notification-select">
                        <input type="checkbox" onchange="toggleUserNotificationSelection('${notification.id}', this.checked)" ${isSelected ? 'checked' : ''}>
                        Seleccionar
                    </label>
                    <span class="notification-time">${formatDate(notification.date)}</span>
                </div>
                <div class="notification-body" onclick="showNotificationDetailById('${notification.id}')">
                    <h4>${notification.title}${attachmentIcon}</h4>
                    <p>${messagePreview}${notification.message && notification.message.length > 80 ? '...' : ''}</p>
                </div>
            </div>
        `;
    }).join('');

    notificationsList.innerHTML = itemsHtml;
    selectedUserNotifications = sanitizedSelection;
    updateUserNotificationsActions();
}

function showNotificationDetailById(notificationId) {
    if (!notificationId) return;

    let notification = notifications.find(n => String(n.id) === String(notificationId));
    let storageUpdated = false;

    if (notification) {
        notification.read = true;
        storageUpdated = true;
    } else {
        const savedUserNotifications = localStorage.getItem('userNotifications');
        if (savedUserNotifications) {
            try {
                const parsed = JSON.parse(savedUserNotifications);
                const target = parsed.find(n => String(n.id) === String(notificationId));
                if (target) {
                    target.read = true;
                    localStorage.setItem('userNotifications', JSON.stringify(parsed));
                    notification = target;
                }
            } catch (error) {
                console.warn('No se pudo acceder a userNotifications para mostrar detalle:', error);
            }
        }
    }

    if (!notification) {
        showNotification('No se encontró la notificación seleccionada', 'error');
        return;
    }

    if (storageUpdated) {
        localStorage.setItem('notifications', JSON.stringify(notifications));
    }

    if (selectedUserNotifications.has(notificationId)) {
        selectedUserNotifications.delete(notificationId);
        updateUserNotificationsActions();
    }

    showNotificationDetail(notification);
    updateNotificationCenter();
}

// Mostrar detalle de notificación
function showNotificationDetail(notification) {
    // Verificar que el usuario esté logueado
    if (!currentUser) {
        showNotification('Debes iniciar sesión para ver los avisos', 'error');
        return;
    }
    
    // Marcar como leída
    notification.read = true;
    localStorage.setItem('notifications', JSON.stringify(notifications));
    
    // Mostrar modal con detalle
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    
    // Botón de descarga si hay documento adjunto
    const attachmentButton = notification.attachment ? 
        `<div style="margin-top: 1rem;">
            <button class="btn btn-primary" onclick="downloadAttachment('${notification.attachment.url}', '${notification.attachment.name}')">
                <i class="fas fa-download"></i> Descargar Documento: ${notification.attachment.name}
            </button>
        </div>` : '';
    
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            <h2>${notification.title}</h2>
            <p><strong>Tipo:</strong> ${notification.type}</p>
            <p><strong>Fecha:</strong> ${formatDate(notification.date)}</p>
            <div style="margin-top: 1rem;">
                <p>${notification.message}</p>
            </div>
            ${attachmentButton}
        </div>
    `;
    document.body.appendChild(modal);
    updateNotificationCenter();
}

// Mostrar detalle de noticia
function showNewsDetail(newsId) {
    const article = news.find(n => n.id === newsId);
    if (!article) return;

    const attachment = article.attachment;
    const isImageAttachment = attachment && attachment.type.startsWith('image/');
    const isPdfAttachment = attachment && attachment.type === 'application/pdf';
    const displayImage = article.image || (isImageAttachment ? attachment.dataUrl : null);

    const mediaSection = displayImage ? `
        <div style="margin-top: 1rem; text-align: center;">
            <img src="${displayImage}" alt="${article.title}" style="max-width: 100%; border-radius: 8px;">
        </div>
    ` : '';

    const attachmentSection = attachment ? `
        <div style="margin-top: 1.5rem;">
            ${isPdfAttachment ? `
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <i class="fas fa-file-pdf" style="font-size: 2rem; color: #ef4444;"></i>
                    <div>
                        <p style="margin: 0; font-weight: 600;">Documento PDF adjunto</p>
                        <a class="btn btn-primary btn-small" href="${attachment.dataUrl}" target="_blank" download="${attachment.name}">
                            <i class="fas fa-file-download"></i> Abrir o descargar (${attachment.name})
                        </a>
                    </div>
                </div>
            ` : `
                <div style="text-align: center;">
                    ${displayImage === attachment.dataUrl ? '' : `<img src="${attachment.dataUrl}" alt="${attachment.name}" style="max-width: 100%; border-radius: 8px; margin-bottom: 0.75rem;">`}
                    <a class="btn btn-primary btn-small" href="${attachment.dataUrl}" target="_blank" download="${attachment.name}">
                        <i class="fas fa-image"></i> Ver imagen adjunta (${attachment.name})
                    </a>
                </div>
            `}
        </div>
    ` : '';

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            <h2>${article.title}</h2>
            <p><strong>Fecha:</strong> ${formatDate(article.date)}</p>
            <div style="margin-top: 1rem;">
                <p>${article.content}</p>
            </div>
            ${mediaSection}
            ${attachmentSection}
        </div>
    `;
    document.body.appendChild(modal);
}

// Mostrar detalle de bando
function showBandoDetail(bandoId) {
    const bando = bandos.find(b => b.id === bandoId);
    if (!bando) return;

    const attachment = bando.attachment;
    const isImageAttachment = attachment && attachment.type && attachment.type.startsWith('image/');
    const isPdfAttachment = attachment && attachment.type === 'application/pdf';
    const mediaSection = isImageAttachment ? `
        <div style="margin-top: 1.5rem; text-align: center;">
            <img src="${attachment.dataUrl}" alt="${attachment.name}" style="max-width: 100%; border-radius: 8px;">
        </div>
    ` : '';

    const attachmentSection = attachment ? `
        <div style="margin-top: 1.5rem;">
            ${isPdfAttachment ? `
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <i class="fas fa-file-pdf" style="font-size: 2rem; color: #ef4444;"></i>
                    <div>
                        <p style="margin: 0; font-weight: 600;">Documento PDF adjunto</p>
                        <a class="btn btn-primary btn-small" href="${attachment.dataUrl}" target="_blank" download="${attachment.name}">
                            <i class="fas fa-file-download"></i> Abrir o descargar (${attachment.name})
                        </a>
                    </div>
                </div>
            ` : `
                <div style="text-align: center;">
                    <a class="btn btn-primary btn-small" href="${attachment.dataUrl}" target="_blank" download="${attachment.name}">
                        <i class="fas fa-image"></i> Ver imagen adjunta (${attachment.name})
                    </a>
                </div>
            `}
        </div>
    ` : '';

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            <h2>${bando.title}</h2>
            <p><strong>Fecha:</strong> ${formatDate(bando.date)}</p>
            <div style="margin-top: 1rem; white-space: normal;">
                ${bando.content}
            </div>
            ${mediaSection}
            ${attachmentSection}
        </div>
    `;
    document.body.appendChild(modal);
}

// Alternar centro de notificaciones
function toggleNotificationCenter() {
    // Verificar que el usuario esté logueado
    if (!currentUser) {
        showNotification('Debes iniciar sesión para ver los avisos', 'error');
        return;
    }
    
    const center = document.getElementById('notificationCenter');
    center.classList.toggle('show');
}

// Marcar todas las notificaciones como leídas
function markAllAsRead() {
    notifications.forEach(notification => {
        notification.read = true;
    });
    localStorage.setItem('notifications', JSON.stringify(notifications));

    const savedUserNotifications = localStorage.getItem('userNotifications');
    let updatedUserNotifications = null;

    if (savedUserNotifications) {
        try {
            const parsed = JSON.parse(savedUserNotifications);
            let changed = false;
            parsed.forEach(notification => {
                if (!notification.read) {
                    notification.read = true;
                    changed = true;
                }
            });
            if (changed) {
                localStorage.setItem('userNotifications', JSON.stringify(parsed));
            }
            updatedUserNotifications = parsed;
        } catch (error) {
            console.warn('No se pudieron marcar como leídos los avisos del usuario:', error);
        }
    }

    selectedUserNotifications.clear();
    updateUserNotificationsActions();
    updateNotificationCenter(updatedUserNotifications);
    showNotification('Todas las notificaciones marcadas como leídas', 'success');
}

// Mostrar notificación toast
function showNotification(message, type = 'info') {
    // Prevenir recursión: si showAccessibleNotification está llamando, usar implementación directa
    if (typeof showAccessibleNotification === 'function' && !showAccessibleNotification._calling) {
        showAccessibleNotification(message, type);
        return;
    }
    
    // Determinar rol ARIA según el tipo
    const ariaRole = (type === 'error' || type === 'warning') ? 'alert' : 'status';
    const ariaLive = (type === 'error' || type === 'warning') ? 'assertive' : 'polite';
    
    const notification = document.createElement('div');
    notification.className = `toast toast-${type}`;
    notification.setAttribute('role', ariaRole);
    notification.setAttribute('aria-live', ariaLive);
    notification.setAttribute('aria-atomic', 'true');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
        z-index: 3000;
        animation: slideIn 0.3s ease;
        max-width: 400px;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Anunciar a lectores de pantalla si la función está disponible
    if (typeof announceToScreenReader === 'function') {
        announceToScreenReader(message, ariaRole);
    }

    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Alternar menú móvil
function toggleMobileMenu() {
    const nav = document.querySelector('.main-nav');
    nav.classList.toggle('mobile-open');
}
// Alternar formulario de cita previa
function toggleAppointmentForm() {
    const formContainer = document.getElementById('appointmentFormContainer');
    const toggleBtn = document.getElementById('toggleAppointmentForm');
    
    // Actualizar aria-expanded para accesibilidad
    const isExpanded = formContainer.style.display !== 'none';
    toggleBtn.setAttribute('aria-expanded', !isExpanded);
    
    if (formContainer.style.display === 'none' || formContainer.style.display === '') {
        // Abrir formulario
        formContainer.style.display = 'block';
        toggleBtn.innerHTML = '<i class="fas fa-calendar-minus"></i> Ocultar Formulario';
        toggleBtn.style.background = '#ef4444';
        toggleBtn.setAttribute('aria-expanded', 'true');
        
        // Inicializar calendario
        setTimeout(() => {
            initializeAppointmentCalendar();
        }, 100);
        
        // Scroll suave al formulario con offset
        setTimeout(() => {
            const header = document.querySelector('header');
            const headerHeight = header ? header.offsetHeight : 80;
            const formTop = formContainer.offsetTop;
            const offsetPosition = formTop - headerHeight - 20;
            
            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }, 200);
        
        console.log('Formulario de cita previa abierto');
    } else {
        // Cerrar formulario
        closeAppointmentForm();
    }
}

// Cerrar formulario de cita previa
function closeAppointmentForm() {
    const formContainer = document.getElementById('appointmentFormContainer');
    const toggleBtn = document.getElementById('toggleAppointmentForm');
    const appointmentForm = document.getElementById('appointmentForm');
    
        // Cerrar formulario
        formContainer.style.display = 'none';
        toggleBtn.innerHTML = '<i class="fas fa-calendar-plus"></i> Solicitar Cita Previa';
        toggleBtn.style.background = '';
        toggleBtn.setAttribute('aria-expanded', 'false');
    
    // Limpiar formulario
    if (appointmentForm) {
        appointmentForm.reset();
        // Limpiar también los valores por defecto de los selects
        const selects = appointmentForm.querySelectorAll('select');
        selects.forEach(select => {
            select.selectedIndex = 0;
        });
        // Limpiar inputs de fecha y hora
        const dateInput = appointmentForm.querySelector('input[type="date"]');
        if (dateInput) {
            dateInput.value = '';
        }
        // Limpiar textarea de comentarios
        const commentsTextarea = appointmentForm.querySelector('textarea');
        if (commentsTextarea) {
            commentsTextarea.value = '';
        }
        // Limpiar campo DNI
        const dniInput = appointmentForm.querySelector('input[name="dni"]');
        if (dniInput) {
            dniInput.value = '';
        }
        // Limpiar checkbox de GDPR
        const gdprCheckbox = appointmentForm.querySelector('input[name="gdprConsent"]');
        if (gdprCheckbox) {
            gdprCheckbox.checked = false;
        }
    }
    
    console.log('Formulario de cita previa cerrado y limpiado');
}

// Funciones de administración
function openNewsEditor(newsId = null) {
    const article = newsId ? news.find(n => n.id === newsId) : null;
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            <h2>${article ? 'Editar Anuncio' : 'Nuevo Anuncio'}</h2>
            <form id="newsForm">
                <div class="form-group">
                    <label for="newsTitle">Título:</label>
                    <input type="text" id="newsTitle" name="title" value="${article ? article.title : ''}" required>
                </div>
                <div class="form-group">
                    <label for="newsContent">Contenido:</label>
                    <textarea id="newsContent" name="content" rows="6" required>${article ? article.content : ''}</textarea>
                </div>
                <div class="form-group">
                    <label for="newsImage">URL de imagen:</label>
                    <input type="url" id="newsImage" name="image" value="${article ? article.image : ''}">
                </div>
                <button type="submit" class="btn btn-primary">${article ? 'Actualizar' : 'Crear'} Anuncio</button>
            </form>
        </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('newsForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const newsData = Object.fromEntries(formData.entries());
        
        if (article) {
            // Editar noticia existente
            const index = news.findIndex(n => n.id === newsId);
            news[index] = { ...article, ...newsData };
        } else {
            // Crear nueva noticia
            news.push({
                id: Date.now(),
                ...newsData,
                date: new Date().toISOString().split('T')[0]
            });
        }
        
        localStorage.setItem('news', JSON.stringify(news));
        updateContent();
        modal.remove();
        showNotification('Anuncio guardado correctamente', 'success');
    });
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Verificar si es super administrador
function isSuperAdminLoggedIn() {
    return isSuperAdmin && currentUser && currentUser.isSuperAdmin;
}

// Funciones de gestión de documentos
function downloadDocument(docId) {
    const doc = documents.find(d => d.id === docId);
    if (!doc) {
        showNotification('Documento no encontrado', 'error');
        return;
    }
    
    // Crear enlace de descarga
    const link = document.createElement('a');
    link.href = doc.fileUrl;
    link.download = doc.fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification(`Descargando: ${doc.fileName}`, 'success');
}
function editDocument(docId) {
    const doc = documents.find(d => d.id === docId);
    if (!doc) {
        showNotification('Documento no encontrado', 'error');
        return;
    }
    
    // Crear modal de edición
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            <h2>Editar Documento</h2>
            <form id="editDocumentForm">
                <div class="form-group">
                    <label for="editDocName">Nombre:</label>
                    <input type="text" id="editDocName" value="${doc.name}" required>
                </div>
                <div class="form-group">
                    <label for="editDocDescription">Descripción:</label>
                    <div id="editDocDescriptionEditor" style="min-height: 180px;"></div>
                    <textarea id="editDocDescription" style="display: none;">${doc.description || ''}</textarea>
                </div>
                <div class="form-group">
                    <label for="editDocCategory">Categoría:</label>
                    <select id="editDocCategory" required>
                        <option value="normativas" ${doc.category === 'normativas' ? 'selected' : ''}>Normativas</option>
                        <option value="formularios" ${doc.category === 'formularios' ? 'selected' : ''}>Formularios</option>
                        <option value="certificados" ${doc.category === 'certificados' ? 'selected' : ''}>Certificados</option>
                        <option value="informes" ${doc.category === 'informes' ? 'selected' : ''}>Informes</option>
                        <option value="otros" ${doc.category === 'otros' ? 'selected' : ''}>Otros</option>
                    </select>
                </div>
                <button type="submit" class="btn btn-primary">Guardar Cambios</button>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
    
    // Event listener para el formulario de edición
    setTimeout(() => {
        const editorElement = modal.querySelector('#editDocDescriptionEditor');
        if (!editorElement) {
            return;
        }

        const hiddenField = modal.querySelector('#editDocDescription');

        if (typeof Quill === 'undefined') {
            editorElement.innerHTML = hiddenField.value || '';
            return;
        }

        const quill = new Quill(editorElement, {
            theme: 'snow',
            modules: {
                toolbar: DEFAULT_QUILL_TOOLBAR
            }
        });

        if (hiddenField.value) {
            quill.root.innerHTML = hiddenField.value;
        }

        const syncHiddenField = () => {
            hiddenField.value = quill.root.innerHTML.trim();
        };

        quill.on('text-change', syncHiddenField);
        syncHiddenField();

        modal.editDocQuill = quill;
    }, 0);
    
    document.getElementById('editDocumentForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        doc.name = document.getElementById('editDocName').value;
        if (modal.editDocQuill) {
            doc.description = modal.editDocQuill.root.innerHTML.trim();
        } else {
            doc.description = document.getElementById('editDocDescription').value;
        }
        doc.category = document.getElementById('editDocCategory').value;
        
        localStorage.setItem('documents', JSON.stringify(documents));
        showNotification('Documento actualizado correctamente', 'success');
        modal.remove();
        loadDocumentsList();
    });
}

function deleteDocument(docId) {
    if (!confirm('¿Está seguro de que desea eliminar este documento?')) {
        return;
    }
    
    const docIndex = documents.findIndex(d => d.id === docId);
    if (docIndex === -1) {
        showNotification('Documento no encontrado', 'error');
        return;
    }
    
    const doc = documents[docIndex];
    documents.splice(docIndex, 1);
    localStorage.setItem('documents', JSON.stringify(documents));
    
    showNotification(`Documento "${doc.name}" eliminado correctamente`, 'success');
    loadDocumentsList();
}

// Funciones de gestión de noticias
function openNewsEditor(newsId = null) {
    const isEdit = newsId !== null;
    const selectedNews = isEdit ? news.find(n => n.id === newsId) : null;
    const existingAttachment = selectedNews && selectedNews.attachment ? selectedNews.attachment : null;
    const emptyAttachmentPreviewHtml = '<p id="newsAttachmentPreviewMessage" style="color: #6b7280; margin: 0;">No hay adjunto cargado.</p>';

    const attachmentPreviewHtml = existingAttachment ? `
        <div class="attachment-preview" style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 0.75rem;">
            ${existingAttachment.type === 'application/pdf' ? `
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <i class="fas fa-file-pdf" style="font-size: 2rem; color: #ef4444;"></i>
                    <div>
                        <p style="margin: 0; font-weight: 600;">${existingAttachment.name}</p>
                        <small style="color: #6b7280;">PDF adjunto actual</small>
                    </div>
                </div>
            ` : `
                <div style="text-align: center;">
                    <img src="${existingAttachment.dataUrl}" alt="${existingAttachment.name}" style="max-width: 100%; border-radius: 6px; margin-bottom: 0.5rem;">
                    <p style="margin: 0; font-weight: 600;">${existingAttachment.name}</p>
                    <small style="color: #6b7280;">Imagen adjunta actual</small>
                </div>
            `}
            <label style="display: flex; align-items: center; gap: 0.5rem; margin-top: 0.75rem; font-size: 0.9rem;">
                <input type="checkbox" id="newsAttachmentRemove">
                Quitar adjunto actual
            </label>
        </div>
    ` : emptyAttachmentPreviewHtml;

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            <h2>${isEdit ? 'Editar Anuncio' : 'Nuevo Anuncio'}</h2>
            <form id="newsForm">
                <div class="form-group">
                    <label for="newsTitle">Título:</label>
                    <input type="text" id="newsTitle" value="${selectedNews ? selectedNews.title : ''}" required>
                </div>
                <div class="form-group">
                    <label for="newsContent">Contenido:</label>
                    <div id="newsContentEditor" style="min-height: 200px;">${selectedNews && selectedNews.content ? selectedNews.content : ''}</div>
                </div>
                <div class="form-group">
                    <label for="newsDate">Fecha:</label>
                    <input type="date" id="newsDate" value="${selectedNews ? selectedNews.date : new Date().toISOString().split('T')[0]}" required>
                </div>
                <div class="form-group">
                    <label for="newsImage">URL de imagen (opcional):</label>
                    <input type="url" id="newsImage" value="${selectedNews ? selectedNews.image || '' : ''}">
                </div>
                <div class="form-group">
                    <label for="newsAttachment">Adjunto (PDF o imagen):</label>
                    <input type="file" id="newsAttachment" accept="application/pdf,image/*">
                    <small style="display:block; color:#6b7280; margin-top:0.25rem;">Formatos permitidos: PDF, JPG, PNG, WEBP (máx. ${(NEWS_ATTACHMENT_MAX_SIZE / (1024 * 1024)).toFixed(1)}MB)</small>
                </div>
                <div class="form-group" id="newsAttachmentPreview">
                    ${attachmentPreviewHtml}
                </div>
                <button type="submit" class="btn btn-primary">${isEdit ? 'Actualizar' : 'Crear'} Anuncio</button>
            </form>
        </div>
    `;
    document.body.appendChild(modal);

    const attachmentInputEl = document.getElementById('newsAttachment');
    const attachmentPreviewContainer = document.getElementById('newsAttachmentPreview');
    const removeAttachmentCheckbox = document.getElementById('newsAttachmentRemove');

    if (attachmentInputEl && attachmentPreviewContainer) {
        attachmentInputEl.addEventListener('change', async (event) => {
            const file = event.target.files && event.target.files[0];

            if (removeAttachmentCheckbox) {
                removeAttachmentCheckbox.checked = false;
            }

            if (!file) {
                attachmentPreviewContainer.innerHTML = existingAttachment ? attachmentPreviewHtml : emptyAttachmentPreviewHtml;
                return;
            }

            if (!(file.type === 'application/pdf' || file.type.startsWith('image/'))) {
                showNotification('Formato de archivo no permitido. Usa PDF o imagen.', 'error');
                event.target.value = '';
                attachmentPreviewContainer.innerHTML = existingAttachment ? attachmentPreviewHtml : emptyAttachmentPreviewHtml;
                return;
            }

            try {
                const dataUrl = await readFileAsDataURL(file, NEWS_ATTACHMENT_MAX_SIZE);
                attachmentPreviewContainer.innerHTML = file.type === 'application/pdf'
                    ? `
                        <div class="attachment-preview" style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 0.75rem;">
                            <div style="display: flex; align-items: center; gap: 0.75rem;">
                                <i class="fas fa-file-pdf" style="font-size: 2rem; color: #ef4444;"></i>
                                <div>
                                    <p style="margin: 0; font-weight: 600;">${file.name}</p>
                                    <small style="color: #6b7280;">PDF seleccionado</small>
                                </div>
                            </div>
                        </div>
                    `
                    : `
                        <div class="attachment-preview" style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 0.75rem; text-align: center;">
                            <img src="${dataUrl}" alt="${file.name}" style="max-width: 100%; border-radius: 6px; margin-bottom: 0.5rem;">
                            <p style="margin: 0; font-weight: 600;">${file.name}</p>
                            <small style="color: #6b7280;">Imagen seleccionada</small>
                        </div>
                    `;
            } catch (previewError) {
                console.error('❌ Error previsualizando adjunto de anuncio', previewError);
                showNotification(previewError.message || 'No se pudo previsualizar el adjunto.', 'error');
                event.target.value = '';
                attachmentPreviewContainer.innerHTML = existingAttachment ? attachmentPreviewHtml : emptyAttachmentPreviewHtml;
            }
        });
    }

    if (removeAttachmentCheckbox && attachmentPreviewContainer) {
        removeAttachmentCheckbox.addEventListener('change', (event) => {
            if (event.target.checked) {
                if (attachmentInputEl) {
                    attachmentInputEl.value = '';
                }
                attachmentPreviewContainer.innerHTML = emptyAttachmentPreviewHtml;
            } else {
                attachmentPreviewContainer.innerHTML = existingAttachment ? attachmentPreviewHtml : emptyAttachmentPreviewHtml;
            }
        });
    }

    // Inicializar editor Quill
    setTimeout(() => {
        const editorElement = document.getElementById('newsContentEditor');
        if (editorElement && typeof Quill !== 'undefined') {
            modal.quillEditor = new Quill('#newsContentEditor', {
                theme: 'snow',
                modules: {
                    toolbar: [
                        [{ 'header': [1, 2, 3, false] }],
                        ['bold', 'italic', 'underline', 'strike'],
                        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                        [{ 'align': [] }],
                        ['link', 'image', 'blockquote', 'code-block']
                    ]
                }
            });
            
            // Si hay contenido existente y es HTML, establecerlo
            if (selectedNews && selectedNews.content) {
                if (selectedNews.content.includes('<')) {
                    // Es HTML
                    modal.quillEditor.root.innerHTML = selectedNews.content;
                } else {
                    // Es texto plano
                    modal.quillEditor.root.textContent = selectedNews.content;
                }
            }
        }
    }, 100);

    document.getElementById('newsForm').addEventListener('submit', async function(e) {
        e.preventDefault();

        const submitBtn = e.target.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.classList.add('loading');
        }

        try {
        // Obtener contenido del editor Quill
        let content = '';
        if (modal.quillEditor) {
            content = modal.quillEditor.root.innerHTML.trim();
        } else {
            // Fallback si no hay editor Quill
            const editorElement = document.getElementById('newsContentEditor');
            if (editorElement) {
                    content = (editorElement.innerHTML || editorElement.textContent || '').trim();
                }
            }

            const titleInput = document.getElementById('newsTitle');
            const dateInput = document.getElementById('newsDate');
            const imageInput = document.getElementById('newsImage');
            const attachmentInput = document.getElementById('newsAttachment');
            const removeAttachmentCheckbox = document.getElementById('newsAttachmentRemove');

        const newsData = {
                title: titleInput ? titleInput.value.trim() : '',
                content,
                date: dateInput ? dateInput.value : new Date().toISOString().split('T')[0],
                image: imageInput && imageInput.value ? imageInput.value.trim() : null
            };

            if (!newsData.title) {
                throw new Error('El título es obligatorio.');
            }

            if (!newsData.date) {
                newsData.date = new Date().toISOString().split('T')[0];
            }

            let attachment = existingAttachment;

            if (removeAttachmentCheckbox && removeAttachmentCheckbox.checked) {
                attachment = null;
            }

            const file = attachmentInput && attachmentInput.files ? attachmentInput.files[0] : null;

            if (file) {
                if (!(file.type === 'application/pdf' || file.type.startsWith('image/'))) {
                    throw new Error('Formato de archivo no permitido. Usa PDF o imagen.');
                }

                const dataUrl = await readFileAsDataURL(file, NEWS_ATTACHMENT_MAX_SIZE);
                attachment = {
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    dataUrl
                };

                if (!newsData.image && file.type.startsWith('image/')) {
                    newsData.image = dataUrl;
                }
            } else if (!newsData.image && attachment && attachment.type.startsWith('image/')) {
                // Mantener imagen previa si existía y no se proporcionó nueva URL
                newsData.image = attachment.dataUrl;
            }

            if (attachment) {
                newsData.attachment = attachment;
            }

        if (isEdit) {
            const index = news.findIndex(n => n.id === newsId);
                if (index === -1) {
                    throw new Error('No se encontró el anuncio a editar.');
                }
            news[index] = { ...news[index], ...newsData };
                if (!attachment && news[index].attachment) {
                    delete news[index].attachment;
                }
        } else {
            newsData.id = Date.now();
                if (!newsData.attachment && attachment) {
                    newsData.attachment = attachment;
                }
            news.push(newsData);
        }

        localStorage.setItem('news', JSON.stringify(news));
        showNotification(`Anuncio ${isEdit ? 'actualizado' : 'creado'} correctamente`, 'success');
        updateContent();
        modal.remove();
        loadNewsList();
        } catch (error) {
            console.error('❌ Error guardando el anuncio', error);
            showNotification(error.message || 'No se pudo guardar el anuncio.', 'error');
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.classList.remove('loading');
            }
        }
    });
}

function editNews(newsId) {
    openNewsEditor(newsId);
}

function deleteNews(newsId) {
    if (!confirm('¿Está seguro de que desea eliminar este anuncio?')) {
        return;
    }
    
    const index = news.findIndex(n => n.id === newsId);
    if (index === -1) {
        showNotification('Noticia no encontrada', 'error');
        return;
    }
    
    const newsItem = news[index];
    news.splice(index, 1);
    localStorage.setItem('news', JSON.stringify(news));
    
    showNotification(`Noticia "${newsItem.title}" eliminada correctamente`, 'success');
    updateContent();
    loadNewsList();
}
// Funciones de gestión de bandos
function openBandoEditor(bandoId = null) {
    const isEdit = bandoId !== null;
    const bando = isEdit ? bandos.find(b => b.id === bandoId) : null;
    const existingAttachment = bando && bando.attachment ? bando.attachment : null;
    const emptyAttachmentPreviewHtml = '<p id="bandoAttachmentPreviewMessage" style="color: #6b7280; margin: 0;">No hay adjunto cargado.</p>';

    const attachmentPreviewHtml = existingAttachment ? `
        <div class="attachment-preview" style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 0.75rem;">
            ${existingAttachment.type === 'application/pdf' ? `
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <i class="fas fa-file-pdf" style="font-size: 2rem; color: #ef4444;"></i>
                    <div>
                        <p style="margin: 0; font-weight: 600;">${existingAttachment.name}</p>
                        <small style="color: #6b7280;">PDF adjunto actual</small>
                    </div>
                </div>
            ` : `
                <div style="text-align: center;">
                    <img src="${existingAttachment.dataUrl}" alt="${existingAttachment.name}" style="max-width: 100%; border-radius: 6px; margin-bottom: 0.5rem;">
                    <p style="margin: 0; font-weight: 600;">${existingAttachment.name}</p>
                    <small style="color: #6b7280;">Imagen adjunta actual</small>
                </div>
            `}
            <label style="display: flex; align-items: center; gap: 0.5rem; margin-top: 0.75rem; font-size: 0.9rem;">
                <input type="checkbox" id="bandoAttachmentRemove">
                Quitar adjunto actual
            </label>
        </div>
    ` : emptyAttachmentPreviewHtml;

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            <h2>${isEdit ? 'Editar Bando' : 'Nuevo Bando'}</h2>
            <form id="bandoForm">
                <div class="form-group">
                    <label for="bandoTitle">Título:</label>
                    <input type="text" id="bandoTitle" value="${bando ? bando.title : ''}" required>
                </div>
                <div class="form-group">
                    <label for="bandoContent">Contenido:</label>
                    <div id="bandoContentEditor" style="min-height: 250px;">${bando && bando.content ? bando.content : ''}</div>
                </div>
                <div class="form-group">
                    <label for="bandoDate">Fecha:</label>
                    <input type="date" id="bandoDate" value="${bando ? bando.date : new Date().toISOString().split('T')[0]}" required>
                </div>
                <div class="form-group">
                    <label for="bandoAttachment">Adjunto (PDF o imagen):</label>
                    <input type="file" id="bandoAttachment" accept="application/pdf,image/*">
                    <small style="display:block; color:#6b7280; margin-top:0.25rem;">Formatos permitidos: PDF, JPG, PNG, WEBP (máx. ${(BANDO_ATTACHMENT_MAX_SIZE / (1024 * 1024)).toFixed(1)}MB)</small>
                </div>
                <div class="form-group" id="bandoAttachmentPreview">
                    ${attachmentPreviewHtml}
                </div>
                <button type="submit" class="btn btn-primary">${isEdit ? 'Actualizar' : 'Crear'} Bando</button>
            </form>
        </div>
    `;
    document.body.appendChild(modal);

    // Inicializar editor Quill
    setTimeout(() => {
        const editorElement = document.getElementById('bandoContentEditor');
        if (editorElement && typeof Quill !== 'undefined') {
            modal.quillEditor = new Quill('#bandoContentEditor', {
                theme: 'snow',
                modules: {
                    toolbar: [
                        [{ 'header': [1, 2, 3, false] }],
                        ['bold', 'italic', 'underline', 'strike'],
                        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                        [{ 'align': [] }],
                        ['link', 'image', 'blockquote', 'code-block']
                    ]
                }
            });
            
            // Si hay contenido existente y es HTML, establecerlo
            if (bando && bando.content) {
                if (bando.content.includes('<')) {
                    // Es HTML
                    modal.quillEditor.root.innerHTML = bando.content;
                } else {
                    // Es texto plano
                    modal.quillEditor.root.textContent = bando.content;
                }
            }
        }
    }, 100);

    const attachmentInputEl = document.getElementById('bandoAttachment');
    const attachmentPreviewContainer = document.getElementById('bandoAttachmentPreview');
    const removeAttachmentCheckbox = document.getElementById('bandoAttachmentRemove');

    if (attachmentInputEl && attachmentPreviewContainer) {
        attachmentInputEl.addEventListener('change', async (event) => {
            const file = event.target.files && event.target.files[0];

            if (removeAttachmentCheckbox) {
                removeAttachmentCheckbox.checked = false;
            }

            if (!file) {
                attachmentPreviewContainer.innerHTML = existingAttachment ? attachmentPreviewHtml : emptyAttachmentPreviewHtml;
                return;
            }

            if (!(file.type === 'application/pdf' || file.type.startsWith('image/'))) {
                showNotification('Formato de archivo no permitido. Usa PDF o imagen.', 'error');
                event.target.value = '';
                attachmentPreviewContainer.innerHTML = existingAttachment ? attachmentPreviewHtml : emptyAttachmentPreviewHtml;
                return;
            }

            try {
                const dataUrl = await readFileAsDataURL(file, BANDO_ATTACHMENT_MAX_SIZE);
                attachmentPreviewContainer.innerHTML = file.type === 'application/pdf'
                    ? `
                        <div class="attachment-preview" style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 0.75rem;">
                            <div style="display: flex; align-items: center; gap: 0.75rem;">
                                <i class="fas fa-file-pdf" style="font-size: 2rem; color: #ef4444;"></i>
                                <div>
                                    <p style="margin: 0; font-weight: 600;">${file.name}</p>
                                    <small style="color: #6b7280;">PDF seleccionado</small>
                                </div>
                            </div>
                        </div>
                    `
                    : `
                        <div class="attachment-preview" style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 0.75rem; text-align: center;">
                            <img src="${dataUrl}" alt="${file.name}" style="max-width: 100%; border-radius: 6px; margin-bottom: 0.5rem;">
                            <p style="margin: 0; font-weight: 600;">${file.name}</p>
                            <small style="color: #6b7280;">Imagen seleccionada</small>
                        </div>
                    `;
            } catch (previewError) {
                console.error('❌ Error previsualizando adjunto de bando', previewError);
                showNotification(previewError.message || 'No se pudo previsualizar el adjunto.', 'error');
                event.target.value = '';
                attachmentPreviewContainer.innerHTML = existingAttachment ? attachmentPreviewHtml : emptyAttachmentPreviewHtml;
            }
        });
    }

    if (removeAttachmentCheckbox && attachmentPreviewContainer) {
        removeAttachmentCheckbox.addEventListener('change', (event) => {
            if (event.target.checked) {
                if (attachmentInputEl) {
                    attachmentInputEl.value = '';
                }
                attachmentPreviewContainer.innerHTML = emptyAttachmentPreviewHtml;
            } else {
                attachmentPreviewContainer.innerHTML = existingAttachment ? attachmentPreviewHtml : emptyAttachmentPreviewHtml;
            }
        });
    }

    document.getElementById('bandoForm').addEventListener('submit', async function(e) {
        e.preventDefault();

        const submitBtn = e.target.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.classList.add('loading');
        }

        try {
        // Obtener contenido del editor Quill
        let content = '';
        if (modal.quillEditor) {
            content = modal.quillEditor.root.innerHTML.trim();
        } else {
            const editorElement = document.getElementById('bandoContentEditor');
            if (editorElement) {
                    content = (editorElement.innerHTML || editorElement.textContent || '').trim();
            }
        }

            const titleInput = document.getElementById('bandoTitle');
            const dateInput = document.getElementById('bandoDate');
            const fileInput = document.getElementById('bandoAttachment');

        const bandoData = {
                title: titleInput ? titleInput.value.trim() : '',
                content,
                date: dateInput ? dateInput.value : new Date().toISOString().split('T')[0]
            };

            if (!bandoData.title) {
                throw new Error('El título del bando es obligatorio.');
            }

            if (!bandoData.date) {
                bandoData.date = new Date().toISOString().split('T')[0];
            }

            let attachment = existingAttachment;

            if (removeAttachmentCheckbox && removeAttachmentCheckbox.checked) {
                attachment = null;
            }

            const file = fileInput && fileInput.files ? fileInput.files[0] : null;

            if (file) {
                if (!(file.type === 'application/pdf' || file.type.startsWith('image/'))) {
                    throw new Error('Formato de archivo no permitido. Usa PDF o imagen.');
                }

                const dataUrl = await readFileAsDataURL(file, BANDO_ATTACHMENT_MAX_SIZE);
                attachment = {
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    dataUrl
                };
            }

            if (attachment) {
                bandoData.attachment = attachment;
            }

        if (isEdit) {
            const index = bandos.findIndex(b => b.id === bandoId);
                if (index === -1) {
                    throw new Error('No se encontró el bando a editar.');
                }
            bandos[index] = { ...bandos[index], ...bandoData };
                if (!attachment && bandos[index].attachment) {
                    delete bandos[index].attachment;
                }
        } else {
            bandoData.id = Date.now();
            bandos.push(bandoData);
        }

        localStorage.setItem('bandos', JSON.stringify(bandos));
        showNotification(`Bando ${isEdit ? 'actualizado' : 'creado'} correctamente`, 'success');
        updateContent();
        modal.remove();
        loadBandoList();
        } catch (error) {
            console.error('❌ Error guardando el bando', error);
            showNotification(error.message || 'No se pudo guardar el bando.', 'error');
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.classList.remove('loading');
            }
        }
    });
}

function editBando(bandoId) {
    openBandoEditor(bandoId);
}
function deleteBando(bandoId) {
    if (!confirm('¿Está seguro de que desea eliminar este bando?')) {
        return;
    }
    
    const index = bandos.findIndex(b => b.id === bandoId);
    if (index === -1) {
        showNotification('Bando no encontrado', 'error');
        return;
    }
    
    const bandoItem = bandos[index];
    bandos.splice(index, 1);
    localStorage.setItem('bandos', JSON.stringify(bandos));
    
    showNotification(`Bando "${bandoItem.title}" eliminado correctamente`, 'success');
    updateContent();
    loadBandoList();
}

// Funciones de exportación de datos
function exportUsers() {
    const sortedUsers = Array.isArray(users)
        ? [...users].sort((a, b) => (a.name || '').localeCompare(b.name || ''))
        : [];

    exportTableData({
        data: sortedUsers,
        title: 'Personas Usuarias Registradas - Ayuntamiento de Cobreros',
        filenameBase: 'usuarios',
        emptyMessage: 'No hay personas usuarias para exportar',
        successMessage: 'Datos de personas usuarias exportados en Word, Excel y PDF',
        columns: [
            { header: 'N.º', getValue: (_, index) => index + 1, stripHtml: false },
            { header: 'Nombre completo', getValue: item => item.fullName || `${item.name || ''} ${item.surname1 || ''} ${item.surname2 || ''}`.trim() },
            { header: 'Email', getValue: item => item.email || '', stripHtml: false },
            { header: 'Teléfono', getValue: item => item.phone || item.telefono || '', stripHtml: false },
            { header: 'Localidades', getValue: item => Array.isArray(item.localities) ? item.localities.join(', ') : '' },
            { header: 'Consentimiento', getValue: item => item.consent ? 'Sí' : 'No', stripHtml: false },
            { header: 'Notificaciones', getValue: item => item.notificationConsent ? 'Sí' : 'No', stripHtml: false },
            { header: 'fcmToken', getValue: item => item.fcmToken ? `${item.fcmToken.slice(0, 20)}...` : 'Sin token', stripHtml: false },
            { header: 'Registrado', getValue: item => item.registrationDate ? formatDateTime(item.registrationDate) : '', stripHtml: false }
        ]
    });
}

function exportAdmins() {
    const sortedAdmins = Array.isArray(administrators)
        ? [...administrators].sort((a, b) => (a.name || '').localeCompare(b.name || ''))
        : [];

    exportTableData({
        data: sortedAdmins,
        title: 'Administradores - Ayuntamiento de Cobreros',
        filenameBase: 'administradores',
        emptyMessage: 'No hay administradores para exportar',
        successMessage: 'Administradores exportados en Word, Excel y PDF',
        columns: [
            { header: 'N.º', getValue: (_, index) => index + 1, stripHtml: false },
            { header: 'Nombre', getValue: item => item.name || '' },
            { header: 'Email', getValue: item => item.email || '', stripHtml: false },
            { header: 'Activo', getValue: item => item.isActive ? 'Sí' : 'No', stripHtml: false },
            { header: 'Super Admin', getValue: item => item.isSuperAdmin ? 'Sí' : 'No', stripHtml: false },
            { header: 'Equipo', getValue: item => item.team || '', stripHtml: false }
        ]
    });
}

function exportDocuments() {
    const sortedDocuments = Array.isArray(documents)
        ? [...documents].sort((a, b) => (a.name || '').localeCompare(b.name || ''))
        : [];

    exportTableData({
        data: sortedDocuments,
        title: 'Documentos del Ayuntamiento de Cobreros',
        filenameBase: 'documentos',
        emptyMessage: 'No hay documentos para exportar',
        successMessage: 'Documentos exportados en Word, Excel y PDF',
        columns: [
            { header: 'N.º', getValue: (_, index) => index + 1, stripHtml: false },
            { header: 'Nombre', getValue: item => item.name || '' },
            { header: 'Descripción', getValue: item => stripHtml(item.description || ''), stripHtml: false, maxLength: 220 },
            { header: 'Categoría', getValue: item => item.category || '' },
            { header: 'Archivo', getValue: item => item.fileName || '', stripHtml: false },
            { header: 'URL', getValue: item => item.fileUrl || '', stripHtml: false },
            { header: 'Tamaño', getValue: item => item.fileSize || '', stripHtml: false }
        ]
    });
}

function exportNotifications() {
    const sortedNotifications = Array.isArray(notifications)
        ? [...notifications].sort((a, b) => (b.date || '').localeCompare(a.date || ''))
        : [];

    exportTableData({
        data: sortedNotifications,
        title: 'Historial de avisos - Ayuntamiento de Cobreros',
        filenameBase: 'avisos',
        emptyMessage: 'No hay avisos para exportar',
        successMessage: 'Avisos exportados en Word, Excel y PDF',
        columns: [
            { header: 'N.º', getValue: (_, index) => index + 1, stripHtml: false },
            { header: 'Título', getValue: item => item.title || '' },
            { header: 'Mensaje', getValue: item => stripHtml(item.message || ''), stripHtml: false, maxLength: 220 },
            { header: 'Tipo', getValue: item => item.type || 'general', stripHtml: false },
            { header: 'Fecha', getValue: item => item.date ? formatDateTime(item.date) : '', stripHtml: false },
            { header: 'Adjunto', getValue: item => item.attachment ? (item.attachment.name || 'Documento adjunto') : 'N/A', stripHtml: false },
            { header: 'Estado', getValue: item => item.sent ? 'Enviada' : 'Pendiente', stripHtml: false }
        ]
    });
}

function exportNews() {
    const sortedNews = Array.isArray(news)
        ? [...news].sort((a, b) => (b.date || '').localeCompare(a.date || ''))
        : [];

    exportTableData({
        data: sortedNews,
        title: 'Anuncios - Ayuntamiento de Cobreros',
        filenameBase: 'anuncios',
        emptyMessage: 'No hay anuncios para exportar',
        successMessage: 'Anuncios exportados en Word, Excel y PDF',
        columns: [
            { header: 'N.º', getValue: (_, index) => index + 1, stripHtml: false },
            { header: 'Título', getValue: item => item.title || '' },
            { header: 'Fecha', getValue: item => item.date ? formatDate(item.date) : '' },
            { header: 'Resumen', getValue: item => stripHtml(item.content || ''), stripHtml: false, maxLength: 200 },
            { header: 'Imagen', getValue: item => item.image || '', stripHtml: false }
        ]
    });
}

function exportBandos() {
    const sortedBandos = Array.isArray(bandos)
        ? [...bandos].sort((a, b) => (b.date || '').localeCompare(a.date || ''))
        : [];

    exportTableData({
        data: sortedBandos,
        title: 'Bandos Municipales - Ayuntamiento de Cobreros',
        filenameBase: 'bandos',
        emptyMessage: 'No hay bandos para exportar',
        successMessage: 'Bandos exportados en Word, Excel y PDF',
        columns: [
            { header: 'N.º', getValue: (_, index) => index + 1, stripHtml: false },
            { header: 'Título', getValue: item => item.title || '' },
            { header: 'Fecha', getValue: item => item.date ? formatDate(item.date) : '' },
            { header: 'Contenido', getValue: item => stripHtml(item.content || ''), stripHtml: false, maxLength: 220 },
            { header: 'Adjunto', getValue: item => (item.attachment && item.attachment.name) || '', stripHtml: false }
        ]
    });
}

function exportEvents() {
    const sortedEvents = Array.isArray(events)
        ? [...events].sort((a, b) => (a.date || '').localeCompare(b.date || ''))
        : [];

    exportTableData({
        data: sortedEvents,
        title: 'Eventos de Cultura y Ocio - Ayuntamiento de Cobreros',
        filenameBase: 'eventos',
        emptyMessage: 'No hay eventos para exportar',
        successMessage: 'Eventos exportados en Word, Excel y PDF',
        columns: [
            { header: 'N.º', getValue: (_, index) => index + 1, stripHtml: false },
            { header: 'Título', getValue: item => item.title || '' },
            { header: 'Fecha', getValue: item => item.date ? formatDate(item.date) : '' },
            { header: 'Hora', getValue: item => item.time || '', stripHtml: false },
            { header: 'Ubicación', getValue: item => item.location || '' },
            { header: 'Categoría', getValue: item => item.category || '' },
            { header: 'Descripción', getValue: item => stripHtml(item.description || ''), stripHtml: false, maxLength: 220 }
        ]
    });
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function getCurrentDateForFilename() {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    return `${day}-${month}-${year}`;
}

function stripHtml(value) {
    if (value === null || value === undefined) {
        return '';
    }
    return value.toString().replace(/<[^>]*>/g, ' ');
}

function sanitizeExportValue(value, maxLength, options = {}) {
    const { stripHtmlContent = true } = options;

    let result;
    if (value === null || value === undefined) {
        result = '';
    } else if (typeof value === 'boolean') {
        result = value ? 'Sí' : 'No';
    } else if (value instanceof Date) {
        result = value.toLocaleString('es-ES');
                        } else {
        result = value.toString();
    }

    if (stripHtmlContent) {
        result = stripHtml(result);
    }

    result = result.replace(/\r?\n|\r/g, ' ').replace(/\s+/g, ' ').trim();

    if (maxLength && result.length > maxLength) {
        result = `${result.slice(0, Math.max(0, maxLength - 3))}...`;
    }

    return result;
}

function buildRowsFromColumns(data, columns) {
    return data.map((item, index) =>
        columns.map(col => {
            try {
                const raw = col.getValue ? col.getValue(item, index) : (col.key ? item[col.key] : '');
                return sanitizeExportValue(raw, col.maxLength, { stripHtmlContent: col.stripHtml !== false });
            } catch (error) {
                console.error('Error preparando datos para exportación:', error);
                return '';
            }
        })
    );
}

function buildHtmlTable(headers, rows) {
    if (!Array.isArray(headers) || headers.length === 0) {
        return '<table><tbody><tr><td>Sin datos</td></tr></tbody></table>';
    }

    const headerRow = headers.map(header => `<th>${escapeHtml(header)}</th>`).join('');
    const bodyRows = rows.length
        ? rows.map(row => `<tr>${row.map(cell => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')
        : `<tr><td colspan="${headers.length}" style="text-align: center;">Sin datos</td></tr>`;

    return `
        <table>
            <thead>
                <tr>${headerRow}</tr>
            </thead>
            <tbody>
                ${bodyRows}
            </tbody>
        </table>
    `;
}

function updateDocumentDescriptionHiddenField() {
    const hiddenField = document.getElementById('documentDescription');
    if (!hiddenField) {
        return;
    }

    if (documentDescriptionEditor) {
        hiddenField.value = documentDescriptionEditor.root.innerHTML.trim();
                    } else {
        const editorElement = document.getElementById('documentDescriptionEditor');
        if (editorElement) {
            hiddenField.value = editorElement.innerHTML || editorElement.textContent || '';
        }
    }
}

function initializeDocumentDescriptionEditor() {
    const editorElement = document.getElementById('documentDescriptionEditor');
    if (!editorElement) {
                    return;
                }
                
    if (typeof Quill === 'undefined') {
        console.warn('Quill no está disponible para el editor de documentos. Reintentando en 500ms.');
        setTimeout(initializeDocumentDescriptionEditor, 500);
        return;
    }

    if (documentDescriptionEditor) {
        return;
    }

    documentDescriptionEditor = new Quill('#documentDescriptionEditor', {
                    theme: 'snow',
                    modules: {
            toolbar: DEFAULT_QUILL_TOOLBAR
        }
    });

    editorElement.quillEditor = documentDescriptionEditor;

    const hiddenField = document.getElementById('documentDescription');
    if (hiddenField) {
        const syncHiddenField = () => updateDocumentDescriptionHiddenField();
        documentDescriptionEditor.on('text-change', syncHiddenField);
        syncHiddenField();
    }
}

function togglePasswordVisibility(inputId, triggerButton) {
    const input = document.getElementById(inputId);
    if (!input) {
        return;
    }

    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';

    if (triggerButton) {
        triggerButton.setAttribute('aria-label', isPassword ? 'Ocultar contraseña' : 'Mostrar contraseña');
        const icon = triggerButton.querySelector('i');
        if (icon) {
            icon.classList.toggle('fa-eye', !isPassword);
            icon.classList.toggle('fa-eye-slash', isPassword);
        }
    }
}

function buildKeyValueTable(entries) {
    if (!Array.isArray(entries) || entries.length === 0) {
        return '<p style="margin: 0.5rem 0;">Sin datos.</p>';
    }

    const rows = entries.map(entry => `
        <tr>
            <th scope="row">${escapeHtml(entry.label || '')}</th>
            <td>${escapeHtml(entry.value || '')}</td>
        </tr>
    `).join('');

    return `
        <table class="kv-table">
            <tbody>
                ${rows}
            </tbody>
        </table>
    `;
}

function getStatisticsSnapshot() {
    const totalUsers = Array.isArray(users) ? users.length : 0;
    const totalAdmins = Array.isArray(administrators) ? administrators.length : 0;
    const totalDocuments = Array.isArray(documents) ? documents.length : 0;
    const totalNotificationsStored = Array.isArray(notifications) ? notifications.length : 0;
    const totalNews = Array.isArray(news) ? news.length : 0;
    const totalBandos = Array.isArray(bandos) ? bandos.length : 0;
    const totalEvents = Array.isArray(events) ? events.length : 0;
    const totalQuickAccess = Array.isArray(quickAccess) ? quickAccess.length : 0;
    const totalTarjetasCultura = Array.isArray(culturaOcioConfig?.tarjetas) ? culturaOcioConfig.tarjetas.length : 0;
    const totalInstalaciones = Array.isArray(culturaOcioConfig?.instalaciones) ? culturaOcioConfig.instalaciones.length : 0;
    const totalPestanas = Array.isArray(culturaOcioConfig?.pestanasPersonalizadas) ? culturaOcioConfig.pestanasPersonalizadas.length : 0;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);

    const localitiesSet = new Set();
    let newUsersCount = 0;
    let activeUsersRecent = 0;
    let usersWithNotifications = 0;

    if (Array.isArray(users)) {
        users.forEach(user => {
            if (Array.isArray(user.localities)) {
                user.localities.forEach(locality => {
                    if (locality && typeof locality === 'string') {
                        localitiesSet.add(locality.trim());
                    }
                });
            }

            const registrationDate = normalizeToDate(user.registrationDate || user.createdAt || user.created_at);
            if (registrationDate) {
                if (registrationDate >= startOfMonth) {
                    newUsersCount++;
                }
                if (registrationDate >= weekAgo) {
                    activeUsersRecent++;
                }
            }

            if (user.notificationConsent && user.fcmToken) {
                usersWithNotifications++;
            }
        });
    }

    if (activeUsersRecent === 0 && Array.isArray(users)) {
        activeUsersRecent = usersWithNotifications;
    }

    const notificationsSentCountRaw = parseInt(localStorage.getItem('notificationsSentCount') || '0', 10);
    const notificationsSentFallback = Array.isArray(notifications) ? notifications.length : 0;
    const totalNotificationsSent = Number.isNaN(notificationsSentCountRaw)
        ? notificationsSentFallback
        : Math.max(notificationsSentCountRaw, notificationsSentFallback);

    let notificationsSuccessRate = '-';
    let notificationsInvalidTokens = 0;
    const statsSummaryRaw = localStorage.getItem('notificationsStatsSummary');
    if (statsSummaryRaw) {
        try {
            const statsSummary = JSON.parse(statsSummaryRaw);
            if (typeof statsSummary.sent === 'number' && typeof statsSummary.totalUsers === 'number' && statsSummary.totalUsers > 0) {
                notificationsSuccessRate = `${((statsSummary.sent / statsSummary.totalUsers) * 100).toFixed(0)}%`;
            } else if (typeof statsSummary.successRate === 'string') {
                notificationsSuccessRate = statsSummary.successRate;
            }
            if (typeof statsSummary.invalidTokens === 'number') {
                notificationsInvalidTokens = statsSummary.invalidTokens;
            }
        } catch (error) {
            console.warn('No se pudo procesar estadísticas de notificaciones guardadas:', error);
        }
    }

    let mostUsedNotificationType = '-';
    if (Array.isArray(notifications) && notifications.length > 0) {
        const typeCounts = notifications.reduce((acc, notif) => {
            const type = (notif.type || 'general').toString().trim().toLowerCase();
            acc[type] = (acc[type] || 0) + 1;
            return acc;
        }, {});
        const topEntry = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0];
        if (topEntry) {
            mostUsedNotificationType = topEntry[0];
        }
    }

    const totalAppointments = Array.isArray(appointments) ? appointments.length : 0;
    const pendingAppointments = Array.isArray(appointments) ? appointments.filter(a => a.status === 'pending').length : 0;
    const confirmedAppointments = Array.isArray(appointments) ? appointments.filter(a => a.status === 'confirmed').length : 0;
    const cancelledAppointments = Array.isArray(appointments) ? appointments.filter(a => a.status === 'cancelled').length : 0;
    const completedAppointments = Array.isArray(appointments) ? appointments.filter(a => a.status === 'completed').length : 0;
    const noShowAppointments = Array.isArray(appointments) ? appointments.filter(a => a.status === 'no_show').length : 0;

    return {
        users: {
            total: totalUsers,
            newThisMonth: newUsersCount,
            activeThisWeek: activeUsersRecent,
            localitiesCount: localitiesSet.size,
            localitiesList: Array.from(localitiesSet).sort().join(', ') || 'Sin localidades registradas',
            withNotifications: usersWithNotifications
        },
        notifications: {
            totalStored: totalNotificationsStored,
            totalSent: totalNotificationsSent,
            successRate: notificationsSuccessRate,
            invalidTokens: notificationsInvalidTokens,
            mostUsedType: mostUsedNotificationType
        },
        appointments: {
            total: totalAppointments,
            pending: pendingAppointments,
            confirmed: confirmedAppointments,
            cancelled: cancelledAppointments,
            completed: completedAppointments,
            noShow: noShowAppointments
        },
        content: {
            news: totalNews,
            bandos: totalBandos,
            events: totalEvents,
            quickAccess: totalQuickAccess,
            culturaTarjetas: totalTarjetasCultura,
            culturaInstalaciones: totalInstalaciones,
            culturaPestanas: totalPestanas,
            documents: totalDocuments,
            admins: totalAdmins
        }
    };
}

function exportTableData({
    data,
    title,
    filenameBase,
    columns,
    emptyMessage,
    successMessage,
    extraPdfInfo = []
}) {
    if (!Array.isArray(data) || data.length === 0) {
        showNotification(emptyMessage || 'No hay datos para exportar', 'warning');
        return;
    }

    if (!Array.isArray(columns) || columns.length === 0) {
        console.warn('No se especificaron columnas para exportación.');
        showNotification('No se pudo exportar: configuración incompleta.', 'error');
        return;
    }

    const exportDate = getCurrentDateForFilename();
    const generatedAt = new Date().toLocaleString('es-ES');
    const headers = columns.map(col => col.header);
    const rows = buildRowsFromColumns(data, columns);

    const tableHtml = buildHtmlTable(headers, rows);

    const baseStyles = `
        body { font-family: Arial, sans-serif; color: #1f2937; }
        h1, h2, h3 { color: #1f2937; }
        table { border-collapse: collapse; width: 100%; margin-top: 1.5rem; }
        th, td { border: 1px solid #1f2937; padding: 6px 8px; text-align: left; vertical-align: top; }
        th { background: #e5e7eb; }
        caption { caption-side: top; text-align: left; font-weight: 600; margin-bottom: 0.5rem; }
        p.meta { font-size: 0.95rem; margin: 0.25rem 0; }
    `;

    const wordContent = `
        <!DOCTYPE html>
        <html>
            <head>
                <meta charset="utf-8">
                <style>${baseStyles}</style>
            </head>
            <body>
                <h1>${escapeHtml(title)}</h1>
                <p class="meta"><strong>Generado:</strong> ${escapeHtml(generatedAt)}</p>
                ${tableHtml}
            </body>
        </html>
    `;
    const wordBlob = new Blob(['\ufeff', wordContent], { type: 'application/msword' });
    downloadBlob(wordBlob, `${filenameBase}_${exportDate}.doc`);

    const excelContent = `
        <!DOCTYPE html>
        <html>
            <head>
                <meta charset="UTF-8">
                <style>${baseStyles}</style>
            </head>
            <body>
                <h2>${escapeHtml(title)}</h2>
                <p class="meta">Generado: ${escapeHtml(generatedAt)}</p>
                ${tableHtml}
            </body>
        </html>
    `;
    const excelBlob = new Blob(['\ufeff', excelContent], { type: 'application/vnd.ms-excel' });
    downloadBlob(excelBlob, `${filenameBase}_${exportDate}.xls`);

    const pdfLines = [
        title,
        `Generado: ${generatedAt}`,
        ...extraPdfInfo.filter(Boolean),
        ''
    ];

    const headerLine = headers.join(' | ');
    pdfLines.push(headerLine);
    pdfLines.push('-'.repeat(Math.min(160, headerLine.length || 40)));

    rows.forEach(row => {
        const truncatedRow = row.map(cell => (cell.length > 120 ? `${cell.slice(0, 117)}...` : cell));
        pdfLines.push(truncatedRow.join(' | '));
    });

    const pdfBlob = createPdfBlobFromLines(pdfLines);
    downloadBlob(pdfBlob, `${filenameBase}_${exportDate}.pdf`);

    showNotification(successMessage || 'Datos exportados en Word, Excel y PDF', 'success');
}

function createPdfBlobFromLines(lines) {
    const pageWidth = 612; // 8.5in * 72
    const pageHeight = 792; // 11in * 72
    const margin = 48; // 2/3 in
    const fontSize = 12;
    const lineHeight = Math.round(fontSize * 1.3);
    const availableHeight = pageHeight - margin * 2;
    const linesPerPage = Math.max(1, Math.floor(availableHeight / lineHeight));

    const sanitizedLines = Array.isArray(lines) && lines.length > 0 ? lines : ['Sin datos'];
    const pages = [];
    for (let i = 0; i < sanitizedLines.length; i += linesPerPage) {
        pages.push(sanitizedLines.slice(i, i + linesPerPage));
    }
    if (pages.length === 0) {
        pages.push(['Sin datos']);
    }

    const escapePdfText = (text) => {
        if (text === null || text === undefined) return '';
        return text.toString()
            .replace(/\\/g, '\\\\')
            .replace(/\(/g, '\\(')
            .replace(/\)/g, '\\)')
            .replace(/\r?\n|\r/g, ' ');
    };

    const buildContentStream = (pageLines) => {
        let stream = 'BT\n/F1 ' + fontSize + ' Tf\n';
        stream += `${margin} ${pageHeight - margin} Td\n`;
        pageLines.forEach((line, index) => {
            const safeLine = escapePdfText(line);
            if (index === 0) {
                stream += `(${safeLine}) Tj\n`;
    } else {
                stream += `0 -${lineHeight} Td\n(${safeLine}) Tj\n`;
            }
        });
        stream += 'ET\n';
        return stream;
    };

    const totalObjects = 3 + pages.length * 2;
    const offsets = new Array(totalObjects + 1).fill(0);
    let pdf = '%PDF-1.4\n';

    const writeObject = (objNumber, body) => {
        offsets[objNumber] = pdf.length;
        pdf += `${objNumber} 0 obj\n${body}\nendobj\n`;
    };

    const kidsRefs = pages.map((_, idx) => `${4 + idx * 2 + 1} 0 R`).join(' ');

    writeObject(1, '<< /Type /Catalog /Pages 2 0 R >>');
    writeObject(2, `<< /Type /Pages /Kids [ ${kidsRefs} ] /Count ${pages.length} >>`);
    writeObject(3, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');

    pages.forEach((pageLines, index) => {
        const content = buildContentStream(pageLines);
        const contentLength = content.length;
        const contentObjNumber = 4 + index * 2;
        const pageObjNumber = contentObjNumber + 1;

        writeObject(contentObjNumber, `<< /Length ${contentLength} >>\nstream\n${content}endstream`);
        writeObject(pageObjNumber,
            `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] ` +
            `/Contents ${contentObjNumber} 0 R /Resources << /Font << /F1 3 0 R >> >> >>`);
    });

    const xrefOffset = pdf.length;
    pdf += `xref\n0 ${totalObjects + 1}\n`;
    pdf += '0000000000 65535 f \n';
    for (let i = 1; i <= totalObjects; i++) {
        pdf += `${offsets[i].toString().padStart(10, '0')} 00000 n \n`;
    }
    pdf += `trailer\n<< /Size ${totalObjects + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

    return new Blob([pdf], { type: 'application/pdf' });
}

function exportAppointments() {
    try {
        if (!appointments || appointments.length === 0) {
            showNotification('No hay citas para exportar', 'warning');
                return;
            }
            
        const exportDate = getCurrentDateForFilename();
        const sortedAppointments = [...appointments].sort((a, b) => {
            const dateA = a.date || '';
            const dateB = b.date || '';
            if (dateA !== dateB) {
                return dateA.localeCompare(dateB);
            }
            const timeA = a.time || '';
            const timeB = b.time || '';
            if (timeA !== timeB) {
                return timeA.localeCompare(timeB);
            }
            return (a.createdAt || '').localeCompare(b.createdAt || '');
        });

        const headers = [
            'N.º',
            'Nombre',
            'DNI',
            'Email',
            'Teléfono',
            'Servicio',
            'Fecha',
            'Hora',
            'Estado',
            'Creada',
            'Actualizada',
            'Comentarios'
        ];

        const tableRows = sortedAppointments.map((appointment, index) => {
            const serviceName = getServiceName(appointment.service);
            const statusLabel = getStatusText(appointment.status);
            const createdAt = appointment.createdAt ? formatDateTime(appointment.createdAt) : '';
            const updatedAt = appointment.updatedAt ? formatDateTime(appointment.updatedAt) : '';
            const comments = appointment.comments ? appointment.comments : '';

            return `
                <tr>
                    <td>${index + 1}</td>
                    <td>${escapeHtml(appointment.name || '')}</td>
                    <td>${escapeHtml(appointment.dni || '')}</td>
                    <td>${escapeHtml(appointment.email || '')}</td>
                    <td>${escapeHtml(appointment.phone || '')}</td>
                    <td>${escapeHtml(serviceName || '')}</td>
                    <td>${escapeHtml(appointment.date || '')}</td>
                    <td>${escapeHtml(appointment.time || '')}</td>
                    <td>${escapeHtml(statusLabel || '')}</td>
                    <td>${escapeHtml(createdAt)}</td>
                    <td>${escapeHtml(updatedAt)}</td>
                    <td>${escapeHtml(comments)}</td>
                </tr>
            `;
        }).join('');

        const tableHtml = `
            <table>
                <thead>
                    <tr>${headers.map(header => `<th>${escapeHtml(header)}</th>`).join('')}</tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
        `;

        const title = 'Listado de Citas Previas - Ayuntamiento de Cobreros';
        const generatedAt = new Date().toLocaleString('es-ES');

        // Word
        const wordContent = `
            <!DOCTYPE html>
            <html>
                <head>
                    <meta charset="utf-8">
                    <style>
                        body { font-family: Arial, sans-serif; color: #1f2937; }
                        h1 { text-align: center; }
                        table { border-collapse: collapse; width: 100%; margin-top: 1.5rem; }
                        th, td { border: 1px solid #1f2937; padding: 6px 8px; text-align: left; }
                        th { background: #e5e7eb; }
                        caption { caption-side: top; text-align: left; font-weight: 600; margin-bottom: 0.5rem; }
                    </style>
                </head>
                <body>
                    <h1>${escapeHtml(title)}</h1>
                    <p><strong>Generado:</strong> ${escapeHtml(generatedAt)}</p>
                    ${tableHtml}
                </body>
            </html>
        `;
        const wordBlob = new Blob(['\ufeff', wordContent], { type: 'application/msword' });
        downloadBlob(wordBlob, `citas_${exportDate}.doc`);

        // Excel
        const excelContent = `
            <!DOCTYPE html>
            <html>
                <head>
                    <meta charset="UTF-8">
                </head>
                <body>
                    <h2>${escapeHtml(title)}</h2>
                    <p>Generado: ${escapeHtml(generatedAt)}</p>
                    ${tableHtml}
                </body>
            </html>
        `;
        const excelBlob = new Blob(['\ufeff', excelContent], { type: 'application/vnd.ms-excel' });
        downloadBlob(excelBlob, `citas_${exportDate}.xls`);

        // PDF
        const pdfLines = [
            title,
            `Generado: ${generatedAt}`,
            ''
        ];

        pdfLines.push(headers.join(' | '));
        pdfLines.push('-'.repeat(112));

        sortedAppointments.forEach((appointment, index) => {
            const serviceName = getServiceName(appointment.service);
            const statusLabel = getStatusText(appointment.status);
            const createdAt = appointment.createdAt ? formatDateTime(appointment.createdAt) : '';
            const updatedAt = appointment.updatedAt ? formatDateTime(appointment.updatedAt) : '';
            const baseLine = `${index + 1}. ${appointment.date || ''} ${appointment.time || ''} | ${serviceName || 'Sin servicio'} | ${appointment.name || 'Sin nombre'} | ${statusLabel}`;
            pdfLines.push(baseLine.trim());

            if (appointment.phone || appointment.email) {
                const contactLine = `   Contacto: ${(appointment.phone || 'Sin teléfono')} | ${(appointment.email || 'Sin email')}`;
                pdfLines.push(contactLine);
            }
            if (appointment.dni) {
                pdfLines.push(`   DNI: ${appointment.dni}`);
            }
            if (appointment.comments) {
                pdfLines.push(`   Comentarios: ${appointment.comments}`);
            }
            pdfLines.push(`   Creada: ${createdAt} | Actualizada: ${updatedAt}`);
            pdfLines.push('');
        });

        const pdfBlob = createPdfBlobFromLines(pdfLines);
        downloadBlob(pdfBlob, `citas_${exportDate}.pdf`);

        showNotification('Citas exportadas en Word, Excel y PDF', 'success');
    } catch (error) {
        console.error('Error exportando citas:', error);
        showNotification('Error al exportar las citas. Inténtelo de nuevo.', 'error');
    }
}

function openEventEditor(eventId = null) {
    const modal = document.getElementById('eventModal');
    const modalTitle = document.getElementById('eventModalTitle');
    const form = document.getElementById('eventForm');
    
    if (eventId) {
        const event = events.find(e => e.id === eventId);
        if (event) {
            modalTitle.textContent = '✏️ Editar Evento';
            document.getElementById('eventId').value = event.id;
            document.getElementById('eventTitle').value = event.title;
            document.getElementById('eventDate').value = event.date;
            document.getElementById('eventTime').value = event.time;
            document.getElementById('eventLocation').value = event.location;
            document.getElementById('eventCategory').value = event.category;
            
            setTimeout(() => {
                const editorElement = document.getElementById('eventDescriptionEditor');
                if (!editorElement) return;
                
                if (typeof Quill === 'undefined') {
                    editorElement.innerHTML = event.description || '';
                    return;
                }
                
                if (!modal.eventQuillEditor) {
                    modal.eventQuillEditor = new Quill('#eventDescriptionEditor', {
                        theme: 'snow',
                        modules: {
                            toolbar: DEFAULT_QUILL_TOOLBAR
                        }
                    });
                    editorElement.quillEditor = modal.eventQuillEditor;
                }
                
                if (event.description) {
                    modal.eventQuillEditor.root.innerHTML = event.description;
                } else {
                    modal.eventQuillEditor.root.innerHTML = '';
                }
            }, 0);
        }
    } else {
        modalTitle.textContent = '🎉 Nuevo Evento';
        form.reset();
        document.getElementById('eventId').value = '';
        
        setTimeout(() => {
            const editorElement = document.getElementById('eventDescriptionEditor');
            if (!editorElement) return;
            
            if (typeof Quill === 'undefined') {
                editorElement.innerHTML = '';
                return;
            }
            
            if (!modal.eventQuillEditor) {
                modal.eventQuillEditor = new Quill('#eventDescriptionEditor', {
                    theme: 'snow',
                    modules: {
                        toolbar: DEFAULT_QUILL_TOOLBAR
                    }
                });
                editorElement.quillEditor = modal.eventQuillEditor;
            } else {
                modal.eventQuillEditor.root.innerHTML = '';
            }
        }, 0);
    }
    
    openModal('eventModal');
}

function closeEventModal() {
    closeModal('eventModal');
}

function saveEvent() {
    const form = document.getElementById('eventForm');
    const formData = new FormData(form);
    const modal = document.getElementById('eventModal');
    
    // Obtener descripción del editor Quill
    let description = '';
    if (modal.eventQuillEditor) {
        description = modal.eventQuillEditor.root.innerHTML.trim();
    } else {
        // Fallback si no hay editor Quill
        const editorElement = document.getElementById('eventDescriptionEditor');
        if (editorElement) {
            description = editorElement.innerHTML || editorElement.textContent || '';
        }
    }
    
    const eventData = {
        title: formData.get('title'),
        description: description,
        date: formData.get('date'),
        time: formData.get('time'),
        location: formData.get('location'),
        category: formData.get('category'),
        image: formData.get('image')?.name || null
    };
    
    const eventId = document.getElementById('eventId').value;
    
    if (eventId) {
        // Actualizar evento existente
        const eventIndex = events.findIndex(e => e.id === parseInt(eventId));
        if (eventIndex !== -1) {
            events[eventIndex] = {
                ...events[eventIndex],
                ...eventData,
                updatedAt: new Date().toISOString()
            };
            showNotification('Evento actualizado correctamente', 'success');
        }
    } else {
        // Crear nuevo evento
        const newEvent = {
            id: Date.now(),
            ...eventData,
            createdBy: currentUser ? currentUser.name : 'admin',
            createdAt: new Date().toISOString()
        };
        events.push(newEvent);
        showNotification('Evento creado correctamente', 'success');
    }
    
    // Guardar en localStorage
    localStorage.setItem('events', JSON.stringify(events));
    
    // Actualizar la lista de eventos
    loadEventsList();
    renderEventos();
    
    // Cerrar modal
    closeEventModal();
}

function editEvent(eventId) {
    openEventEditor(eventId);
}

function deleteEvent(eventId) {
    if (confirm('¿Estás seguro de que quieres eliminar este evento?')) {
        events = events.filter(e => e.id !== eventId);
        localStorage.setItem('events', JSON.stringify(events));
        loadEventsList();
        renderEventos();
        showNotification('Evento eliminado correctamente', 'success');
    }
}

// Función para renderizar eventos en la página principal
function renderEventos() {
    const eventosContent = document.getElementById('eventosContent');
    if (!eventosContent) return;
    
    // Buscar la sección de eventos en cultura-ocio
    const culturaOcioSection = document.getElementById('cultura-ocio');
    if (!culturaOcioSection) return;
    
    let eventosSection = culturaOcioSection.querySelector('.eventos-section');
    if (!eventosSection) {
        eventosSection = document.createElement('div');
        eventosSection.className = 'eventos-section';
        eventosSection.innerHTML = '<h3>🎉 Próximos Eventos</h3><div class="eventos-grid" id="eventosGrid"></div>';
        culturaOcioSection.appendChild(eventosSection);
    }
    
    const eventosGrid = eventosSection.querySelector('#eventosGrid') || eventosSection.querySelector('.eventos-grid');
    if (!eventosGrid) return;
    
    eventosGrid.innerHTML = '';
    
    if (events.length === 0) {
        eventosGrid.innerHTML = '<p>No hay eventos programados en este momento.</p>';
        return;
    }
    
    // Filtrar eventos futuros y ordenar por fecha
    const today = new Date().toISOString().split('T')[0];
    const upcomingEvents = events
        .filter(event => event.date >= today)
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(0, 6); // Mostrar máximo 6 eventos
    
    upcomingEvents.forEach(event => {
        const eventCard = document.createElement('div');
        eventCard.className = 'event-card';
        
        const eventDate = new Date(event.date);
        const day = eventDate.getDate();
        const month = eventDate.toLocaleDateString('es-ES', { month: 'short' }).toUpperCase();
        
        eventCard.innerHTML = `
            <div class="event-date">
                <span class="event-day">${day}</span>
                <span class="event-month">${month}</span>
            </div>
            <div class="event-info">
                <h4>${event.title}</h4>
                <div class="event-description">${event.description || ''}</div>
                <div class="event-details">
                    <span class="event-time">🕐 ${event.time}</span>
                    <span class="event-location">📍 ${event.location}</span>
                </div>
                <span class="event-category">${getCategoryIcon(event.category)} ${event.category}</span>
            </div>
        `;
        
        eventosGrid.appendChild(eventCard);
    });
}

function getCategoryIcon(category) {
    const icons = {
        cultura: '🎭',
        deporte: '⚽',
        educacion: '📚',
        musica: '🎵',
        arte: '🎨',
        teatro: '🎭',
        fiesta: '🎉',
        conferencia: '💼',
        otros: '🔸'
    };
    return icons[category] || '🔸';
}

// Variables para gestión de Cultura y Ocio
let culturaOcioConfig = {
    titulo: 'Cultura y Ocio',
    tarjetas: [],
    pestanasPersonalizadas: []
};

// Funciones para gestionar Cultura y Ocio
function openCulturaOcioManager() {
    loadCulturaOcioConfig();
    
    // Cargar datos administrativos de cultura y ocio
    if (typeof loadCulturaOcioAdmin === 'function') {
        loadCulturaOcioAdmin();
    }
    
    openModal('culturaOcioModal');
    switchCulturaTab('contenido');
}

function closeCulturaOcioModal() {
    closeModal('culturaOcioModal');
}
function switchCulturaTab(tabName, event = null) {
    try {
        // Usar cache para obtener modal
        const modal = culturaOcioCache.getModal();
        if (!modal) {
            console.warn('Modal de cultura y ocio no encontrado');
            return;
        }
        
        // Ocultar todas las pestañas
        const tabs = modal.querySelectorAll('.tab-content');
        tabs.forEach(tab => tab.classList.remove('active'));
        
        // Desactivar todos los botones
        const buttons = modal.querySelectorAll('.tab-btn');
        buttons.forEach(btn => btn.classList.remove('active'));
        
        // Mostrar pestaña seleccionada
        const selectedTab = document.getElementById(`cultura-${tabName}-tab`);
        if (selectedTab) {
            selectedTab.classList.add('active');
        }
        
        // Activar botón seleccionado (usar event si está disponible, sino buscar por selector)
        const safeTabName = escapeHtml(tabName);
        const buttonSelector = `#culturaOcioModal .tab-btn[onclick*="switchCulturaTab('${safeTabName}')"]`;
        const selectedButton = event?.target || modal.querySelector(buttonSelector);
        if (selectedButton) {
            selectedButton.classList.add('active');
        }
        
        // Cargar contenido específico de la pestaña
        switch(tabName) {
        case 'eventos':
            if (typeof loadCulturaEventsList === 'function') {
            loadCulturaEventsList();
            } else {
                loadCulturaOcioAdmin();
            }
            break;
        case 'tarjetas':
            if (typeof loadCulturaTarjetasList === 'function') {
            loadCulturaTarjetasList();
            } else {
                loadCulturaOcioAdmin();
            }
            break;
        case 'naturaleza':
        case 'patrimonio':
        case 'gastronomia':
        case 'cercanos':
            loadCulturaOcioAdmin();
            break;
        case 'contenido':
            // No necesita cargar nada especial
            break;
        case 'pestanas':
            // Cargar lista de pestañas personalizadas
            if (typeof loadCustomTabsList === 'function') {
                loadCustomTabsList();
            }
            break;
        default:
            // Verificar si es una pestaña personalizada
            if (culturaOcioConfig.pestanasPersonalizadas && culturaOcioConfig.pestanasPersonalizadas.find(p => p.id === tabName)) {
                // Es una pestaña personalizada, mostrar su contenido
                const pestana = culturaOcioConfig.pestanasPersonalizadas.find(p => p.id === tabName);
                let customTabContent = document.getElementById(`cultura-${tabName}-tab`);
                if (!customTabContent) {
                    // Crear el contenido de la pestaña personalizada si no existe
                    const container = document.getElementById('customTabsContentContainer');
                    if (container) {
                        customTabContent = document.createElement('div');
                        customTabContent.id = `cultura-${tabName}-tab`;
                        customTabContent.className = 'tab-content';
                        customTabContent.innerHTML = `
                            <div class="content-actions">
                                <button class="btn btn-primary" onclick="openCulturaItemEditor('${tabName}')">
                                    <i class="fas fa-plus"></i> Nuevo Elemento
                                </button>
                                <button class="btn btn-secondary" onclick="exportCulturaSection('${tabName}')">
                                    <i class="fas fa-download"></i> Exportar
                                </button>
                            </div>
                            <div class="content-list" id="${tabName}AdminList">
                                <!-- Se cargará dinámicamente -->
                            </div>
                        `;
                        container.appendChild(customTabContent);
                    }
                }
                if (customTabContent) {
                    customTabContent.classList.add('active');
                    // Cargar elementos de la pestaña personalizada
                    if (!culturaOcioData[tabName]) {
                        culturaOcioData[tabName] = pestana.elementos || [];
                    }
                    loadCulturaOcioAdmin();
                }
            }
            break;
        }
    } catch (error) {
        console.error('Error en switchCulturaTab:', error);
        showNotification('Error al cambiar de pestaña. Por favor, inténtelo de nuevo.', 'error');
    }
}
function loadCulturaOcioConfig() {
    const saved = localStorage.getItem('culturaOcioConfig');
    if (saved) {
        culturaOcioConfig = JSON.parse(saved);
        // Asegurar que pestanasPersonalizadas existe
        if (!culturaOcioConfig.pestanasPersonalizadas) {
            culturaOcioConfig.pestanasPersonalizadas = [];
        }
        
        // Eliminar tarjetas específicas usando función genérica
        removeTarjetasByTitles(TARJETAS_A_ELIMINAR);
    }
    // Renderizar pestañas personalizadas al cargar
    if (typeof renderCustomTabs === 'function') {
        renderCustomTabs();
    }
    
    document.getElementById('culturaTitulo').value = culturaOcioConfig.titulo || '';
    
    // Inicializar editor Quill para la descripción (solo si no existe)
    setTimeout(() => {
        const editorElement = document.getElementById('culturaDescripcionEditor');
        const modal = document.getElementById('culturaOcioModal');
        
        if (!editorElement || !modal || typeof Quill === 'undefined') return;
        
        // Verificar si el editor ya existe
        if (editorElement.quillEditor || modal.culturaQuillEditor) {
            // El editor ya existe, solo actualizar el contenido si hay
            const quillInstance = editorElement.quillEditor || modal.culturaQuillEditor;
            if (culturaOcioConfig.descripcion) {
                if (culturaOcioConfig.descripcion.includes('<')) {
                    quillInstance.root.innerHTML = culturaOcioConfig.descripcion;
                } else {
                    quillInstance.root.textContent = culturaOcioConfig.descripcion;
                }
            } else {
                quillInstance.root.innerHTML = '';
            }
            return;
        }
        
        // Crear nuevo editor
        modal.culturaQuillEditor = new Quill('#culturaDescripcionEditor', {
            theme: 'snow',
            modules: {
                toolbar: [
                    [{ 'header': [1, 2, 3, false] }],
                    ['bold', 'italic', 'underline', 'strike'],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                    [{ 'align': [] }],
                    ['link', 'image', 'blockquote', 'code-block']
                ]
            }
        });
        
        // Guardar referencia también en el elemento
        editorElement.quillEditor = modal.culturaQuillEditor;
        
        // Establecer contenido si existe
        if (culturaOcioConfig.descripcion) {
            if (culturaOcioConfig.descripcion.includes('<')) {
                // Es HTML
                modal.culturaQuillEditor.root.innerHTML = culturaOcioConfig.descripcion;
            } else {
                // Es texto plano
                modal.culturaQuillEditor.root.textContent = culturaOcioConfig.descripcion;
            }
        }
    }, 100);
}

function saveCulturaOcio() {
    culturaOcioConfig.titulo = document.getElementById('culturaTitulo').value;
    
    // Obtener descripción del editor Quill
    const modal = document.getElementById('culturaOcioModal');
    if (modal && modal.culturaQuillEditor) {
        culturaOcioConfig.descripcion = modal.culturaQuillEditor.root.innerHTML.trim();
    } else {
        // Fallback si no hay editor Quill
        const editorElement = document.getElementById('culturaDescripcionEditor');
        if (editorElement) {
            culturaOcioConfig.descripcion = editorElement.innerHTML || editorElement.textContent || '';
        }
    }
    
    localStorage.setItem('culturaOcioConfig', JSON.stringify(culturaOcioConfig));
    
    // Actualizar la sección en la página principal
    updateCulturaOcioSection();
    
    showNotification('Configuración de Cultura y Ocio guardada correctamente', 'success');
    closeCulturaOcioModal();
}

function loadCulturaTarjetasList() {
    const tarjetasList = document.getElementById('culturaTarjetasList');
    if (!tarjetasList) return;
    
    tarjetasList.innerHTML = '';
    
    culturaOcioConfig.tarjetas.forEach(tarjeta => {
        const tarjetaItem = document.createElement('div');
        tarjetaItem.className = 'tarjeta-item';
        tarjetaItem.style.cssText = 'border: 1px solid #e5e7eb; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; background: #f9fafb;';
        
        tarjetaItem.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: start;">
                <div style="flex: 1;">
                    <h4><i class="${tarjeta.icono}" style="color: ${tarjeta.color}"></i> ${tarjeta.titulo}</h4>
                    <p>${tarjeta.descripcion}</p>
                    <p><strong>Elementos:</strong> ${tarjeta.elementos.length}</p>
                    <p><strong>Orden:</strong> ${tarjeta.orden}</p>
                    <p><strong>Estado:</strong> ${tarjeta.activa ? 'Activa' : 'Inactiva'}</p>
                </div>
                <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                    <button class="btn btn-primary btn-small" onclick="editCulturaTarjeta(${tarjeta.id})">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn btn-secondary btn-small" onclick="editCulturaTarjetaElementos(${tarjeta.id})">
                        <i class="fas fa-list"></i> Elementos
                    </button>
                    <button class="btn btn-danger btn-small" onclick="deleteCulturaTarjeta(${tarjeta.id})">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </div>
            </div>
        `;
        tarjetasList.appendChild(tarjetaItem);
    });
}

function addCulturaTarjeta() {
    // Limpiar formulario
    document.getElementById('tarjetaConfigForm').reset();
    document.getElementById('tarjetaConfigId').value = '';
    document.getElementById('tarjetaConfigModalTitle').textContent = '🃏 Nueva Tarjeta';
    
    // Cargar elementos vacíos
    loadTarjetaElementosList();
    
    openModal('tarjetaConfigModal');
}
function editCulturaTarjeta(tarjetaId) {
    const tarjeta = culturaOcioConfig.tarjetas.find(t => t.id === tarjetaId);
    if (!tarjeta) return;
    
    // Llenar formulario con datos existentes
    document.getElementById('tarjetaConfigId').value = tarjeta.id;
    document.getElementById('tarjetaConfigTitulo').value = tarjeta.titulo;
    document.getElementById('tarjetaConfigDescripcion').value = tarjeta.descripcion;
    document.getElementById('tarjetaConfigIcono').value = tarjeta.icono;
    document.getElementById('tarjetaConfigColor').value = tarjeta.color;
    document.getElementById('tarjetaConfigOrden').value = tarjeta.orden;
    document.getElementById('tarjetaConfigActiva').checked = tarjeta.activa;
    
    document.getElementById('tarjetaConfigModalTitle').textContent = '✏️ Editar Tarjeta';
    
    // Cargar elementos de la tarjeta
    loadTarjetaElementosList(tarjetaId);
    
    openModal('tarjetaConfigModal');
}

function deleteCulturaTarjeta(tarjetaId) {
    if (confirm('¿Estás seguro de que quieres eliminar esta tarjeta?')) {
        culturaOcioConfig.tarjetas = culturaOcioConfig.tarjetas.filter(t => t.id !== tarjetaId);
        localStorage.setItem('culturaOcioConfig', JSON.stringify(culturaOcioConfig));
        
        loadCulturaTarjetasList();
        updateCulturaOcioSection();
        showNotification('Tarjeta eliminada correctamente', 'success');
    }
}

function editCulturaTarjetaElementos(tarjetaId) {
    const tarjeta = culturaOcioConfig.tarjetas.find(t => t.id === tarjetaId);
    if (!tarjeta) return;
    
    const accion = prompt(`Gestión de elementos para "${tarjeta.titulo}":\n1 - Agregar elemento\n2 - Ver elementos\n3 - Editar elemento\n4 - Eliminar elemento\n\nEscribe el número (1-4):`);
    
    switch(accion) {
        case '1':
            addCulturaTarjetaElemento(tarjetaId);
            break;
        case '2':
            showCulturaTarjetaElementos(tarjetaId);
            break;
        case '3':
            editCulturaTarjetaElemento(tarjetaId);
            break;
        case '4':
            deleteCulturaTarjetaElemento(tarjetaId);
            break;
        default:
            showNotification('Opción no válida', 'error');
    }
}

function addCulturaTarjetaElemento(tarjetaId) {
    const tarjeta = culturaOcioConfig.tarjetas.find(t => t.id === tarjetaId);
    if (!tarjeta) return;
    
    const titulo = prompt('Título del elemento (con emoji):');
    if (!titulo) return;
    
    const descripcion = prompt('Descripción del elemento:');
    if (!descripcion) return;
    
    const esEnlace = confirm('¿Es un enlace? (Aceptar = Sí, Cancelar = No)');
    let enlace = '';
    if (esEnlace) {
        enlace = prompt('URL del enlace (ej: #enlace o https://...):', '#');
        if (enlace === null) return;
    }
    
    const nuevoElemento = {
        id: Date.now(),
        titulo: titulo,
        descripcion: descripcion,
        enlace: enlace,
        esEnlace: esEnlace
    };
    
    tarjeta.elementos.push(nuevoElemento);
    localStorage.setItem('culturaOcioConfig', JSON.stringify(culturaOcioConfig));
    
    loadCulturaTarjetasList();
    updateCulturaOcioSection();
    showNotification('Elemento agregado correctamente', 'success');
}

function showCulturaTarjetaElementos(tarjetaId) {
    const tarjeta = culturaOcioConfig.tarjetas.find(t => t.id === tarjetaId);
    if (!tarjeta) return;
    
    let mensaje = `Elementos de "${tarjeta.titulo}":\n\n`;
    tarjeta.elementos.forEach((elemento, index) => {
        mensaje += `${index + 1}. ${elemento.titulo}\n`;
        mensaje += `   ${elemento.descripcion}\n`;
        mensaje += `   ${elemento.esEnlace ? '🔗 Enlace: ' + elemento.enlace : '📄 Solo información'}\n\n`;
    });
    
    alert(mensaje);
}

function editCulturaTarjetaElemento(tarjetaId) {
    const tarjeta = culturaOcioConfig.tarjetas.find(t => t.id === tarjetaId);
    if (!tarjeta || tarjeta.elementos.length === 0) {
        showNotification('No hay elementos para editar', 'error');
        return;
    }
    
    let listaElementos = `Selecciona el elemento a editar:\n\n`;
    tarjeta.elementos.forEach((elemento, index) => {
        listaElementos += `${index + 1}. ${elemento.titulo}\n`;
    });
    
    const seleccion = prompt(listaElementos + '\nEscribe el número del elemento:');
    const indice = parseInt(seleccion) - 1;
    
    if (indice >= 0 && indice < tarjeta.elementos.length) {
        const elemento = tarjeta.elementos[indice];
        
        const titulo = prompt('Título del elemento (con emoji):', elemento.titulo);
        if (titulo === null) return;
        
        const descripcion = prompt('Descripción del elemento:', elemento.descripcion);
        if (descripcion === null) return;
        
        const esEnlace = confirm('¿Es un enlace? (Aceptar = Sí, Cancelar = No)');
        let enlace = elemento.enlace;
        if (esEnlace && elemento.esEnlace) {
            enlace = prompt('URL del enlace:', elemento.enlace);
            if (enlace === null) return;
        } else if (esEnlace && !elemento.esEnlace) {
            enlace = prompt('URL del enlace:', '#');
            if (enlace === null) return;
        }
        
        elemento.titulo = titulo;
        elemento.descripcion = descripcion;
        elemento.enlace = enlace;
        elemento.esEnlace = esEnlace;
        
        localStorage.setItem('culturaOcioConfig', JSON.stringify(culturaOcioConfig));
        
        loadCulturaTarjetasList();
        updateCulturaOcioSection();
        showNotification('Elemento actualizado correctamente', 'success');
    } else {
        showNotification('Número de elemento no válido', 'error');
    }
}

function deleteCulturaTarjetaElemento(tarjetaId) {
    const tarjeta = culturaOcioConfig.tarjetas.find(t => t.id === tarjetaId);
    if (!tarjeta || tarjeta.elementos.length === 0) {
        showNotification('No hay elementos para eliminar', 'error');
        return;
    }
    
    let listaElementos = `Selecciona el elemento a eliminar:\n\n`;
    tarjeta.elementos.forEach((elemento, index) => {
        listaElementos += `${index + 1}. ${elemento.titulo}\n`;
    });
    
    const seleccion = prompt(listaElementos + '\nEscribe el número del elemento:');
    const indice = parseInt(seleccion) - 1;
    
    if (indice >= 0 && indice < tarjeta.elementos.length) {
        if (confirm('¿Estás seguro de que quieres eliminar este elemento?')) {
            tarjeta.elementos.splice(indice, 1);
            localStorage.setItem('culturaOcioConfig', JSON.stringify(culturaOcioConfig));
            
            loadCulturaTarjetasList();
            updateCulturaOcioSection();
            showNotification('Elemento eliminado correctamente', 'success');
        }
    } else {
        showNotification('Número de elemento no válido', 'error');
    }
}

// Funciones para los nuevos modales avanzados
function closeTarjetaConfigModal() {
    closeModal('tarjetaConfigModal');
}

function closeElementoModal() {
    closeModal('elementoModal');
}

function saveTarjetaConfig() {
    const form = document.getElementById('tarjetaConfigForm');
    const formData = new FormData(form);
    
    const tarjetaData = {
        titulo: formData.get('titulo'),
        descripcion: formData.get('descripcion'),
        icono: formData.get('icono'),
        color: formData.get('color'),
        orden: parseInt(formData.get('orden')),
        activa: formData.get('activa') === 'on'
    };
    
    const tarjetaId = document.getElementById('tarjetaConfigId').value;
    
    if (tarjetaId) {
        // Actualizar tarjeta existente
        const tarjetaIndex = culturaOcioConfig.tarjetas.findIndex(t => t.id === parseInt(tarjetaId));
        if (tarjetaIndex !== -1) {
            culturaOcioConfig.tarjetas[tarjetaIndex] = {
                ...culturaOcioConfig.tarjetas[tarjetaIndex],
                ...tarjetaData
            };
            showNotification('Tarjeta actualizada correctamente', 'success');
        }
    } else {
        // Crear nueva tarjeta
        const nuevaTarjeta = {
            id: Date.now(),
            ...tarjetaData,
            elementos: []
        };
        culturaOcioConfig.tarjetas.push(nuevaTarjeta);
        showNotification('Tarjeta creada correctamente', 'success');
    }
    
    localStorage.setItem('culturaOcioConfig', JSON.stringify(culturaOcioConfig));
    
    loadCulturaTarjetasList();
    updateCulturaOcioSection();
    closeTarjetaConfigModal();
}

function loadTarjetaElementosList(tarjetaId = null) {
    const elementosList = document.getElementById('tarjetaElementosList');
    if (!elementosList) return;
    
    elementosList.innerHTML = '';
    
    let tarjeta = null;
    if (tarjetaId) {
        tarjeta = culturaOcioConfig.tarjetas.find(t => t.id === tarjetaId);
    } else {
        // Para nueva tarjeta, usar el ID del formulario si existe
        const formTarjetaId = document.getElementById('tarjetaConfigId').value;
        if (formTarjetaId) {
            tarjeta = culturaOcioConfig.tarjetas.find(t => t.id === parseInt(formTarjetaId));
        }
    }
    
    console.log('Cargando elementos para tarjeta:', tarjeta);
    
    if (!tarjeta || !tarjeta.elementos || tarjeta.elementos.length === 0) {
        elementosList.innerHTML = '<p class="no-elements">No hay elementos en esta tarjeta. Agrega el primero usando el botón "Agregar Elemento".</p>';
        return;
    }
    
    // Ordenar elementos por orden, luego por índice original
    const elementosOrdenados = tarjeta.elementos
        .map((elemento, indexOriginal) => ({ ...elemento, indexOriginal }))
        .sort((a, b) => (a.orden || 0) - (b.orden || 0));
    
    elementosOrdenados.forEach((elemento, index) => {
        const elementoItem = document.createElement('div');
        elementoItem.className = 'elemento-item';
        elementoItem.style.cssText = 'border: 1px solid #e5e7eb; border-radius: 6px; padding: 0.75rem; margin-bottom: 0.5rem; background: #f9fafb;';
        
        elementoItem.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: start;">
                <div style="flex: 1;">
                    <h5 style="margin: 0 0 0.25rem 0; color: #1f2937;">${elemento.titulo}</h5>
                    <p style="margin: 0 0 0.25rem 0; color: #6b7280; font-size: 0.875rem;">${elemento.descripcion}</p>
                    <p style="margin: 0; color: #9ca3af; font-size: 0.75rem;">
                        ${elemento.esEnlace ? '🔗 Enlace: ' + elemento.enlace : '📄 Solo información'} | 
                        Orden: ${elemento.orden || index + 1}
                    </p>
                </div>
                <div style="display: flex; gap: 0.25rem;">
                    <button class="btn btn-primary btn-xs" onclick="editElemento(${tarjeta.id}, ${elemento.indexOriginal})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger btn-xs" onclick="deleteElemento(${tarjeta.id}, ${elemento.indexOriginal})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
        
        elementosList.appendChild(elementoItem);
    });
}

function openElementoEditor(tarjetaId = null, elementoIndex = null) {
    const form = document.getElementById('elementoForm');
    form.reset();
    
    console.log('Abriendo editor de elemento:', { tarjetaId, elementoIndex });
    
    if (tarjetaId && elementoIndex !== null) {
        // Editar elemento existente
        const tarjeta = culturaOcioConfig.tarjetas.find(t => t.id === tarjetaId);
        console.log('Tarjeta encontrada:', tarjeta);
        
        if (tarjeta && tarjeta.elementos[elementoIndex]) {
            const elemento = tarjeta.elementos[elementoIndex];
            console.log('Elemento encontrado:', elemento);
            
            document.getElementById('elementoId').value = elemento.id || '';
            document.getElementById('elementoTarjetaId').value = tarjetaId;
            document.getElementById('elementoIndex').value = elementoIndex;
            document.getElementById('elementoTitulo').value = elemento.titulo || '';
            document.getElementById('elementoDescripcion').value = elemento.descripcion || '';
            document.getElementById('elementoEsEnlace').checked = elemento.esEnlace || false;
            document.getElementById('elementoEnlace').value = elemento.enlace || '';
            document.getElementById('elementoOrden').value = elemento.orden || elementoIndex + 1;
            
            document.getElementById('elementoModalTitle').textContent = '✏️ Editar Elemento';
            toggleEnlaceGroup(elemento.esEnlace || false);
        } else {
            console.error('Elemento no encontrado en índice:', elementoIndex);
            showNotification('Error: Elemento no encontrado', 'error');
            return;
        }
    } else {
        // Nuevo elemento
        const currentTarjetaId = document.getElementById('tarjetaConfigId').value;
        document.getElementById('elementoId').value = '';
        document.getElementById('elementoTarjetaId').value = currentTarjetaId;
        document.getElementById('elementoIndex').value = '';
        document.getElementById('elementoModalTitle').textContent = '➕ Nuevo Elemento';
        toggleEnlaceGroup(false);
    }
    
    openModal('elementoModal');
}

function editElemento(tarjetaId, elementoIndex) {
    openElementoEditor(tarjetaId, elementoIndex);
}

function deleteElemento(tarjetaId, elementoIndex) {
    if (confirm('¿Estás seguro de que quieres eliminar este elemento?')) {
        const tarjeta = culturaOcioConfig.tarjetas.find(t => t.id === tarjetaId);
        if (tarjeta && tarjeta.elementos[elementoIndex]) {
            tarjeta.elementos.splice(elementoIndex, 1);
            localStorage.setItem('culturaOcioConfig', JSON.stringify(culturaOcioConfig));
            
            loadTarjetaElementosList(tarjetaId);
            updateCulturaOcioSection();
            showNotification('Elemento eliminado correctamente', 'success');
        }
    }
}

function saveElemento() {
    const form = document.getElementById('elementoForm');
    const formData = new FormData(form);
    
    const elementoData = {
        titulo: formData.get('titulo'),
        descripcion: formData.get('descripcion'),
        esEnlace: formData.get('esEnlace') === 'on',
        enlace: formData.get('enlace') || '',
        orden: parseInt(formData.get('orden')) || 1
    };
    
    const elementoId = document.getElementById('elementoId').value;
    const tarjetaId = parseInt(document.getElementById('elementoTarjetaId').value);
    const elementoIndex = document.getElementById('elementoIndex').value;
    
    console.log('Guardando elemento:', { elementoId, tarjetaId, elementoIndex, elementoData });
    
    const tarjeta = culturaOcioConfig.tarjetas.find(t => t.id === tarjetaId);
    if (!tarjeta) {
        showNotification('Error: Tarjeta no encontrada', 'error');
        return;
    }
    
    if (elementoId && elementoIndex !== '') {
        // Actualizar elemento existente
        const index = parseInt(elementoIndex);
        if (tarjeta.elementos[index]) {
            tarjeta.elementos[index] = {
                ...tarjeta.elementos[index],
                ...elementoData
            };
            showNotification('Elemento actualizado correctamente', 'success');
        }
    } else {
        // Crear nuevo elemento
        const nuevoElemento = {
            id: Date.now(),
            ...elementoData
        };
        tarjeta.elementos.push(nuevoElemento);
        showNotification('Elemento creado correctamente', 'success');
    }
    
    localStorage.setItem('culturaOcioConfig', JSON.stringify(culturaOcioConfig));
    
    loadTarjetaElementosList(tarjetaId);
    updateCulturaOcioSection();
    closeElementoModal();
}

// Función para mostrar/ocultar el campo de enlace
function toggleEnlaceGroup(esEnlace) {
    const enlaceGroup = document.getElementById('elementoEnlaceGroup');
    if (esEnlace) {
        enlaceGroup.style.display = 'block';
    } else {
        enlaceGroup.style.display = 'none';
    }
}

// Event listener para el checkbox de enlace
document.addEventListener('DOMContentLoaded', function() {
    const elementoEsEnlace = document.getElementById('elementoEsEnlace');
    if (elementoEsEnlace) {
        elementoEsEnlace.addEventListener('change', function() {
            toggleEnlaceGroup(this.checked);
        });
    }
});

function updateCulturaOcioSection() {
    const section = document.getElementById('cultura-ocio');
    if (!section) return;
    
    const titleElement = section.querySelector('h2');
    if (titleElement) {
        titleElement.textContent = culturaOcioConfig.titulo;
    }
    
    // Renderizar las tarjetas configurables
    const container = section.querySelector('#culturaTarjetasContainer');
    if (!container) return;
    
    // Verificar si hay tarjetas activas para mostrar
    const tarjetasActivas = culturaOcioConfig.tarjetas && culturaOcioConfig.tarjetas.length > 0 
        ? culturaOcioConfig.tarjetas.filter(tarjeta => tarjeta.activa)
        : [];
    
    // Solo limpiar y actualizar si hay tarjetas activas
    // Si no hay tarjetas, preservar el contenido existente
    if (tarjetasActivas.length > 0) {
        // Preservar cualquier sección de eventos existente antes de limpiar
        const eventosSection = section.querySelector('.eventos-section');
        const eventosHTML = eventosSection ? eventosSection.outerHTML : null;
        
        container.innerHTML = '';
        
        const tarjetasGrid = document.createElement('div');
        tarjetasGrid.className = 'cultura-tarjetas-grid';
        
        tarjetasActivas
            .sort((a, b) => a.orden - b.orden)
            .forEach(tarjeta => {
                const tarjetaElement = document.createElement('div');
                tarjetaElement.className = 'cultura-tarjeta';
                tarjetaElement.style.borderTop = `4px solid ${tarjeta.color}`;
                
                // Header de la tarjeta
                const header = document.createElement('div');
                header.className = 'cultura-tarjeta-header';
                header.innerHTML = `
                    <i class="${tarjeta.icono}" style="color: ${tarjeta.color}"></i>
                    <h3>${tarjeta.titulo}</h3>
                    <div>${tarjeta.descripcion || ''}</div>
                `;
                
                // Lista de elementos
                const elementosList = document.createElement('div');
                elementosList.className = 'cultura-tarjeta-elementos';
                
                if (tarjeta.elementos && tarjeta.elementos.length > 0) {
                    tarjeta.elementos.forEach(elemento => {
                        const elementoDiv = document.createElement('div');
                        elementoDiv.className = 'cultura-elemento';
                        
                        if (elemento.esEnlace) {
                            elementoDiv.innerHTML = `
                                <a href="${elemento.enlace}" class="elemento-link">
                                    <h4>${elemento.titulo}</h4>
                                    <div>${elemento.descripcion || ''}</div>
                                </a>
                            `;
                        } else {
                            elementoDiv.innerHTML = `
                                <div class="elemento-info">
                                    <h4>${elemento.titulo}</h4>
                                    <div>${elemento.descripcion || ''}</div>
                                </div>
                            `;
                        }
                        
                        elementosList.appendChild(elementoDiv);
                    });
                }
                
                tarjetaElement.appendChild(header);
                tarjetaElement.appendChild(elementosList);
                tarjetasGrid.appendChild(tarjetaElement);
            });
        
        container.appendChild(tarjetasGrid);
        
        // Restaurar sección de eventos si existía
        if (eventosHTML && eventosSection) {
            section.appendChild(eventosSection);
        }
    }
    // Si no hay tarjetas activas, no hacer nada (preservar contenido existente)
}
function loadCulturaEventsList() {
    const eventsList = document.getElementById('culturaEventsList');
    if (!eventsList) return;
    
    eventsList.innerHTML = '';
    
    if (events.length === 0) {
        eventsList.innerHTML = '<p>No hay eventos programados.</p>';
        return;
    }
    
    // Mostrar TODOS los eventos (no solo los futuros)
    events.forEach(event => {
        const eventItem = document.createElement('div');
        eventItem.className = 'event-item';
        eventItem.style.cssText = 'border: 1px solid #e5e7eb; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; background: #f9fafb;';
        
        eventItem.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: start;">
                <div style="flex: 1;">
                    <h4>${event.title}</h4>
                    <div class="event-description-content" style="margin-bottom: 0.5rem;">${event.description || ''}</div>
                    <p><strong>Fecha:</strong> ${formatDate(event.date)}</p>
                    <p><strong>Hora:</strong> ${event.time}</p>
                    <p><strong>Ubicación:</strong> ${event.location}</p>
                    <p><strong>Categoría:</strong> ${event.category}</p>
                </div>
                <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                    <button class="btn btn-primary btn-small" onclick="editEvent(${event.id})">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn btn-danger btn-small" onclick="deleteEvent(${event.id})">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </div>
            </div>
        `;
        eventsList.appendChild(eventItem);
    });
}

function loadCulturaCardsList() {
    const cardsList = document.getElementById('culturaCardsList');
    if (!cardsList) return;
    
    cardsList.innerHTML = '';
    
    culturaOcioConfig.tarjetas.forEach(card => {
        const cardItem = document.createElement('div');
        cardItem.className = 'card-item';
        cardItem.style.cssText = 'border: 1px solid #e5e7eb; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; background: #f9fafb;';
        
        cardItem.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: start;">
                <div style="flex: 1;">
                    <h4><i class="${card.icono}"></i> ${card.titulo}</h4>
                    <p>${card.descripcion}</p>
                    <p><strong>Enlace:</strong> ${card.enlace}</p>
                    <p><strong>Orden:</strong> ${card.orden}</p>
                    <p><strong>Estado:</strong> ${card.activa ? 'Activa' : 'Inactiva'}</p>
                </div>
                <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                    <button class="btn btn-primary btn-small" onclick="editCulturaCard(${card.id})">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn btn-danger btn-small" onclick="deleteCulturaCard(${card.id})">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </div>
            </div>
        `;
        cardsList.appendChild(cardItem);
    });
}

function addCulturaCard() {
    const titulo = prompt('Título de la tarjeta:');
    if (!titulo) return;
    
    const descripcion = prompt('Descripción:');
    if (!descripcion) return;
    
    const icono = prompt('Icono (clase FontAwesome, ej: fas fa-music):', 'fas fa-star');
    
    const enlace = prompt('Enlace (ej: #enlace):', '#');
    
    const nuevaTarjeta = {
        id: Date.now(),
        titulo: titulo,
        descripcion: descripcion,
        icono: icono,
        enlace: enlace,
        orden: culturaOcioConfig.tarjetas.length + 1,
        activa: true
    };
    
    culturaOcioConfig.tarjetas.push(nuevaTarjeta);
    localStorage.setItem('culturaOcioConfig', JSON.stringify(culturaOcioConfig));
    
    loadCulturaCardsList();
    showNotification('Tarjeta agregada correctamente', 'success');
}

function editCulturaCard(cardId) {
    const card = culturaOcioConfig.tarjetas.find(c => c.id === cardId);
    if (!card) return;
    
    const titulo = prompt('Título de la tarjeta:', card.titulo);
    if (titulo === null) return;
    
    const descripcion = prompt('Descripción:', card.descripcion);
    if (descripcion === null) return;
    
    const icono = prompt('Icono (clase FontAwesome):', card.icono);
    if (icono === null) return;
    
    const enlace = prompt('Enlace:', card.enlace);
    if (enlace === null) return;
    
    card.titulo = titulo;
    card.descripcion = descripcion;
    card.icono = icono;
    card.enlace = enlace;
    
    localStorage.setItem('culturaOcioConfig', JSON.stringify(culturaOcioConfig));
    
    loadCulturaCardsList();
    showNotification('Tarjeta actualizada correctamente', 'success');
}
function deleteCulturaCard(cardId) {
    if (confirm('¿Estás seguro de que quieres eliminar esta tarjeta?')) {
        culturaOcioConfig.tarjetas = culturaOcioConfig.tarjetas.filter(c => c.id !== cardId);
        localStorage.setItem('culturaOcioConfig', JSON.stringify(culturaOcioConfig));
        
        loadCulturaCardsList();
        showNotification('Tarjeta eliminada correctamente', 'success');
    }
}
function loadCulturaInstalacionesList() {
    const instalacionesList = document.getElementById('culturaInstalacionesList');
    if (!instalacionesList) return;
    
    instalacionesList.innerHTML = '';
    
    culturaOcioConfig.instalaciones.forEach(instalacion => {
        const instalacionItem = document.createElement('div');
        instalacionItem.className = 'instalacion-item';
        instalacionItem.style.cssText = 'border: 1px solid #e5e7eb; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; background: #f9fafb;';
        
        instalacionItem.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: start;">
                <div style="flex: 1;">
                    <h4><i class="${instalacion.icono}"></i> ${instalacion.nombre}</h4>
                    <p>${instalacion.descripcion}</p>
                    <p><strong>Orden:</strong> ${instalacion.orden}</p>
                    <p><strong>Estado:</strong> ${instalacion.activa ? 'Activa' : 'Inactiva'}</p>
                </div>
                <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                    <button class="btn btn-primary btn-small" onclick="editCulturaInstalacion(${instalacion.id})">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn btn-danger btn-small" onclick="deleteCulturaInstalacion(${instalacion.id})">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </div>
            </div>
        `;
        instalacionesList.appendChild(instalacionItem);
    });
}

function addCulturaInstalacion() {
    const nombre = prompt('Nombre de la instalación:');
    if (!nombre) return;
    
    const descripcion = prompt('Descripción/Horarios:');
    if (!descripcion) return;
    
    const icono = prompt('Icono (clase FontAwesome, ej: fas fa-building):', 'fas fa-building');
    
    const nuevaInstalacion = {
        id: Date.now(),
        nombre: nombre,
        descripcion: descripcion,
        icono: icono,
        orden: culturaOcioConfig.instalaciones.length + 1,
        activa: true
    };
    
    culturaOcioConfig.instalaciones.push(nuevaInstalacion);
    localStorage.setItem('culturaOcioConfig', JSON.stringify(culturaOcioConfig));
    
    loadCulturaInstalacionesList();
    updateCulturaOcioSection();
    showNotification('Instalación agregada correctamente', 'success');
}

function editCulturaInstalacion(instalacionId) {
    const instalacion = culturaOcioConfig.instalaciones.find(i => i.id === instalacionId);
    if (!instalacion) return;
    
    const nombre = prompt('Nombre de la instalación:', instalacion.nombre);
    if (nombre === null) return;
    
    const descripcion = prompt('Descripción/Horarios:', instalacion.descripcion);
    if (descripcion === null) return;
    
    const icono = prompt('Icono (clase FontAwesome):', instalacion.icono);
    if (icono === null) return;
    
    instalacion.nombre = nombre;
    instalacion.descripcion = descripcion;
    instalacion.icono = icono;
    
    localStorage.setItem('culturaOcioConfig', JSON.stringify(culturaOcioConfig));
    
    loadCulturaInstalacionesList();
    updateCulturaOcioSection();
    showNotification('Instalación actualizada correctamente', 'success');
}

function deleteCulturaInstalacion(instalacionId) {
    if (confirm('¿Estás seguro de que quieres eliminar esta instalación?')) {
        culturaOcioConfig.instalaciones = culturaOcioConfig.instalaciones.filter(i => i.id !== instalacionId);
        localStorage.setItem('culturaOcioConfig', JSON.stringify(culturaOcioConfig));
        
        loadCulturaInstalacionesList();
        updateCulturaOcioSection();
        showNotification('Instalación eliminada correctamente', 'success');
    }
}

function exportCulturaOcio() {
    try {
        const tarjetas = Array.isArray(culturaOcioConfig.tarjetas) ? [...culturaOcioConfig.tarjetas] : [];
        const instalaciones = Array.isArray(culturaOcioConfig.instalaciones) ? [...culturaOcioConfig.instalaciones] : [];
        const pestañas = Array.isArray(culturaOcioConfig.pestanasPersonalizadas) ? [...culturaOcioConfig.pestanasPersonalizadas] : [];
        const eventos = Array.isArray(events) ? [...events] : [];

        if (
            (!culturaOcioConfig || !Object.keys(culturaOcioConfig).length) &&
            tarjetas.length === 0 &&
            instalaciones.length === 0 &&
            pestañas.length === 0 &&
            eventos.length === 0
        ) {
            showNotification('No hay datos de Cultura y Ocio para exportar', 'warning');
            return;
        }

        const exportDate = getCurrentDateForFilename();
        const generatedAt = new Date().toLocaleString('es-ES');
        const title = 'Cultura y Ocio - Ayuntamiento de Cobreros';

        const baseStyles = `
            body { font-family: Arial, sans-serif; color: #1f2937; }
            h1, h2, h3 { color: #1f2937; }
            table { border-collapse: collapse; width: 100%; margin-top: 1.5rem; }
            th, td { border: 1px solid #1f2937; padding: 6px 8px; text-align: left; vertical-align: top; }
            th { background: #e5e7eb; }
            p.meta { font-size: 0.95rem; margin: 0.25rem 0; }
        `;

        const sections = [];
        const pdfLines = [
            title,
            `Generado: ${generatedAt}`,
            ''
        ];

        const descripcionGeneral = stripHtml(culturaOcioConfig?.descripcion || '');

        let sectionsHtml = `
            <h1>${escapeHtml(title)}</h1>
            <p class="meta"><strong>Generado:</strong> ${escapeHtml(generatedAt)}</p>
            <h2>Configuración General</h2>
            <p><strong>Título:</strong> ${escapeHtml(culturaOcioConfig?.titulo || '')}</p>
            ${descripcionGeneral ? `<p><strong>Descripción:</strong> ${escapeHtml(descripcionGeneral)}</p>` : '<p><strong>Descripción:</strong> Sin descripción.</p>'}
        `;

        pdfLines.push('Configuración general:');
        pdfLines.push(`Título: ${culturaOcioConfig?.titulo || 'Sin título'}`);
        if (descripcionGeneral) {
            pdfLines.push(`Descripción: ${descripcionGeneral}`);
        }
        pdfLines.push('');

        const tarjetaColumns = [
            { header: 'N.º', getValue: (_, index) => index + 1, stripHtml: false },
            { header: 'Título', getValue: item => item.titulo || item.title || '' },
            { header: 'Descripción', getValue: item => stripHtml(item.descripcion || item.description || ''), stripHtml: false, maxLength: 220 },
            { header: 'Enlace', getValue: item => item.enlace || item.link || '', stripHtml: false },
            { header: 'Icono', getValue: item => item.icono || '', stripHtml: false },
            { header: 'Orden', getValue: item => item.orden != null ? item.orden : '', stripHtml: false },
            { header: 'Activa', getValue: item => item.activa === undefined ? '' : (item.activa ? 'Sí' : 'No'), stripHtml: false }
        ];
        const tarjetaRows = buildRowsFromColumns(tarjetas, tarjetaColumns);

        if (tarjetaRows.length) {
            sectionsHtml += `<h2>Tarjetas</h2>${buildHtmlTable(tarjetaColumns.map(c => c.header), tarjetaRows)}`;
            const headerLine = tarjetaColumns.map(c => c.header).join(' | ');
            pdfLines.push('Tarjetas:');
            pdfLines.push(headerLine);
            pdfLines.push('-'.repeat(Math.min(160, headerLine.length || 40)));
            tarjetaRows.forEach(row => pdfLines.push(row.map(cell => (cell.length > 120 ? `${cell.slice(0, 117)}...` : cell)).join(' | ')));
            pdfLines.push('');
        } else {
            sectionsHtml += '<h2>Tarjetas</h2><p>Sin tarjetas registradas.</p>';
            pdfLines.push('Tarjetas: Sin datos');
            pdfLines.push('');
        }

        const instalacionesColumns = [
            { header: 'N.º', getValue: (_, index) => index + 1, stripHtml: false },
            { header: 'Nombre', getValue: item => item.nombre || '' },
            { header: 'Descripción', getValue: item => stripHtml(item.descripcion || ''), stripHtml: false, maxLength: 220 },
            { header: 'Icono', getValue: item => item.icono || '', stripHtml: false },
            { header: 'Orden', getValue: item => item.orden != null ? item.orden : '', stripHtml: false },
            { header: 'Activa', getValue: item => item.activa === undefined ? '' : (item.activa ? 'Sí' : 'No'), stripHtml: false }
        ];
        const instalacionesRows = buildRowsFromColumns(instalaciones, instalacionesColumns);

        if (instalacionesRows.length) {
            sectionsHtml += `<h2>Instalaciones</h2>${buildHtmlTable(instalacionesColumns.map(c => c.header), instalacionesRows)}`;
            const headerLine = instalacionesColumns.map(c => c.header).join(' | ');
            pdfLines.push('Instalaciones:');
            pdfLines.push(headerLine);
            pdfLines.push('-'.repeat(Math.min(160, headerLine.length || 40)));
            instalacionesRows.forEach(row => pdfLines.push(row.map(cell => (cell.length > 120 ? `${cell.slice(0, 117)}...` : cell)).join(' | ')));
            pdfLines.push('');
        } else {
            sectionsHtml += '<h2>Instalaciones</h2><p>Sin instalaciones registradas.</p>';
            pdfLines.push('Instalaciones: Sin datos');
            pdfLines.push('');
        }

        const pestañasColumns = [
            { header: 'N.º', getValue: (_, index) => index + 1, stripHtml: false },
            { header: 'Nombre', getValue: item => item.nombre || item.title || '' },
            { header: 'ID', getValue: item => item.id || '', stripHtml: false },
            { header: 'Elementos', getValue: item => Array.isArray(item.elementos) ? item.elementos.length : 0, stripHtml: false },
            { header: 'Activa', getValue: item => item.activa === undefined ? '' : (item.activa ? 'Sí' : 'No'), stripHtml: false },
            { header: 'Creada', getValue: item => item.createdAt ? formatDateTime(item.createdAt) : '', stripHtml: false }
        ];
        const pestañasRows = buildRowsFromColumns(pestañas, pestañasColumns);

        if (pestañasRows.length) {
            sectionsHtml += `<h2>Pestañas Personalizadas</h2>${buildHtmlTable(pestañasColumns.map(c => c.header), pestañasRows)}`;
            const headerLine = pestañasColumns.map(c => c.header).join(' | ');
            pdfLines.push('Pestañas personalizadas:');
            pdfLines.push(headerLine);
            pdfLines.push('-'.repeat(Math.min(160, headerLine.length || 40)));
            pestañasRows.forEach(row => pdfLines.push(row.map(cell => (cell.length > 120 ? `${cell.slice(0, 117)}...` : cell)).join(' | ')));
            pdfLines.push('');
        } else {
            sectionsHtml += '<h2>Pestañas Personalizadas</h2><p>No hay pestañas personalizadas.</p>';
            pdfLines.push('Pestañas personalizadas: Sin datos');
            pdfLines.push('');
        }

        const eventosColumns = [
            { header: 'N.º', getValue: (_, index) => index + 1, stripHtml: false },
            { header: 'Título', getValue: item => item.title || '' },
            { header: 'Fecha', getValue: item => item.date ? formatDate(item.date) : '' },
            { header: 'Hora', getValue: item => item.time || '', stripHtml: false },
            { header: 'Ubicación', getValue: item => item.location || '' },
            { header: 'Categoría', getValue: item => item.category || '' },
            { header: 'Descripción', getValue: item => stripHtml(item.description || ''), stripHtml: false, maxLength: 220 }
        ];
        const eventosRows = buildRowsFromColumns(eventos, eventosColumns);

        if (eventosRows.length) {
            sectionsHtml += `<h2>Eventos</h2>${buildHtmlTable(eventosColumns.map(c => c.header), eventosRows)}`;
            const headerLine = eventosColumns.map(c => c.header).join(' | ');
            pdfLines.push('Eventos:');
            pdfLines.push(headerLine);
            pdfLines.push('-'.repeat(Math.min(160, headerLine.length || 40)));
            eventosRows.forEach(row => pdfLines.push(row.map(cell => (cell.length > 120 ? `${cell.slice(0, 117)}...` : cell)).join(' | ')));
            pdfLines.push('');
        } else {
            sectionsHtml += '<h2>Eventos</h2><p>Sin eventos registrados.</p>';
            pdfLines.push('Eventos: Sin datos');
            pdfLines.push('');
        }

        const wordContent = `
            <!DOCTYPE html>
            <html>
                <head>
                    <meta charset="utf-8">
                    <style>${baseStyles}</style>
                </head>
                <body>
                    ${sectionsHtml}
                </body>
            </html>
        `;
        const wordBlob = new Blob(['\ufeff', wordContent], { type: 'application/msword' });
        downloadBlob(wordBlob, `cultura_ocio_${exportDate}.doc`);

        const excelContent = `
            <!DOCTYPE html>
            <html>
                <head>
                    <meta charset="UTF-8">
                    <style>${baseStyles}</style>
                </head>
                <body>
                    ${sectionsHtml}
                </body>
            </html>
        `;
        const excelBlob = new Blob(['\ufeff', excelContent], { type: 'application/vnd.ms-excel' });
        downloadBlob(excelBlob, `cultura_ocio_${exportDate}.xls`);

        const pdfBlob = createPdfBlobFromLines(pdfLines);
        downloadBlob(pdfBlob, `cultura_ocio_${exportDate}.pdf`);

        showNotification('Datos de Cultura y Ocio exportados en Word, Excel y PDF', 'success');
    } catch (error) {
        console.error('Error exportando Cultura y Ocio:', error);
        showNotification('Error al exportar Cultura y Ocio. Inténtelo de nuevo.', 'error');
    }
}

function exportQuickAccess() {
    const data = Array.isArray(quickAccess) ? [...quickAccess] : [];

    exportTableData({
        data,
        title: 'Tarjetas de Acceso Rápido - Ayuntamiento de Cobreros',
        filenameBase: 'acceso_rapido',
        emptyMessage: 'No hay tarjetas de acceso rápido para exportar',
        successMessage: 'Tarjetas de acceso rápido exportadas en Word, Excel y PDF',
        columns: [
            { header: 'N.º', getValue: (_, index) => index + 1, stripHtml: false },
            { header: 'Título', getValue: item => item.titulo || item.title || '' },
            { header: 'Descripción', getValue: item => stripHtml(item.descripcion || item.description || ''), stripHtml: false, maxLength: 220 },
            { header: 'Enlace', getValue: item => item.enlace || item.link || '', stripHtml: false },
            { header: 'Icono', getValue: item => item.icono || '', stripHtml: false },
            { header: 'Orden', getValue: item => item.orden != null ? item.orden : '', stripHtml: false },
            { header: 'Activa', getValue: item => item.activa === undefined ? '' : (item.activa ? 'Sí' : 'No'), stripHtml: false }
        ]
    });
}

function exportAllData() {
    const allData = {
        users,
        administrators,
        documents,
        notifications,
        news,
        bandos,
        events,
        quickAccess,
        exportDate: new Date().toISOString(),
        exportedBy: currentUser.email
    };
    
    const dataStr = JSON.stringify(allData, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup_completo_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showNotification('Backup completo exportado correctamente', 'success');
}

// Función de importación de datos
function handleDataImport(e) {
    e.preventDefault();
    
    if (!isAdmin) {
        showNotification('Solo los administradores pueden importar datos', 'error');
        return;
    }
    
    const formData = new FormData(e.target);
    const file = formData.get('file');
    const type = formData.get('type');
    
    if (!file || file.size === 0) {
        showNotification('Debe seleccionar un archivo', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            switch(type) {
                case 'users':
                    users = data;
                    localStorage.setItem('users', JSON.stringify(users));
                    showNotification('Datos de personas usuarias importados correctamente', 'success');
                    break;
                case 'admins':
                    administrators = data;
                    localStorage.setItem('administrators', JSON.stringify(administrators));
                    showNotification('Administradores importados correctamente', 'success');
                    break;
                case 'documents':
                    documents = data;
                    localStorage.setItem('documents', JSON.stringify(documents));
                    showNotification('Documentos importados correctamente', 'success');
                    break;
                case 'notifications':
                    notifications = data;
                    localStorage.setItem('notifications', JSON.stringify(notifications));
                    showNotification('Avisos importados correctamente', 'success');
                    break;
                default:
                    showNotification('Tipo de datos no válido', 'error');
                    return;
            }
            
            e.target.reset();
            
        } catch (error) {
            showNotification('Error al procesar el archivo JSON', 'error');
            console.error('Error importing data:', error);
        }
    };
    
    reader.readAsText(file);
}

// Función para mostrar estadísticas de usuarios
function showUserStats() {
    const totalUsers = users.length;
    const usersWithConsent = users.filter(u => u.consent).length;
    const usersWithNotifications = users.filter(u => u.notificationConsent).length;
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            <h2>Estadísticas de Usuarios</h2>
            <div class="stats-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin: 1rem 0;">
                <div class="stat-card" style="background: #f0f9ff; padding: 1rem; border-radius: 8px; text-align: center;">
                    <h3>${totalUsers}</h3>
                    <p>Total de Usuarios</p>
                </div>
                <div class="stat-card" style="background: #f0fdf4; padding: 1rem; border-radius: 8px; text-align: center;">
                    <h3>${usersWithConsent}</h3>
                    <p>Con Consentimiento</p>
                </div>
                <div class="stat-card" style="background: #fef3c7; padding: 1rem; border-radius: 8px; text-align: center;">
                    <h3>${usersWithNotifications}</h3>
                    <p>Con avisos</p>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// Cargar estadísticas del sistema
function loadSystemStats() {
    const statsContainer = document.getElementById('systemStats');
    if (!statsContainer) return;

    const snapshot = getStatisticsSnapshot();
    const ultimaNotificacion = localStorage.getItem('notificationsLastSent');

    statsContainer.innerHTML = `
        <div class="stats-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
            <div class="stat-card" style="background: #f0f9ff; padding: 1rem; border-radius: 8px; text-align: center; border: 1px solid #0ea5e9;">
                <h3 style="color: #0ea5e9; margin: 0;">${snapshot.users.total}</h3>
                <p style="margin: 0.5rem 0 0 0; color: #64748b;">Usuarios Registrados</p>
            </div>
            <div class="stat-card" style="background: #f0fdf4; padding: 1rem; border-radius: 8px; text-align: center; border: 1px solid #22c55e;">
                <h3 style="color: #22c55e; margin: 0;">${snapshot.users.withNotifications}</h3>
                <p style="margin: 0.5rem 0 0 0; color: #64748b;">Usuarios con avisos activos</p>
            </div>
            <div class="stat-card" style="background: #fef3c7; padding: 1rem; border-radius: 8px; text-align: center; border: 1px solid #f59e0b;">
                <h3 style="color: #f59e0b; margin: 0;">${snapshot.notifications.totalSent}</h3>
                <p style="margin: 0.5rem 0 0 0; color: #64748b;">Avisos enviados</p>
            </div>
            <div class="stat-card" style="background: #fdf2f8; padding: 1rem; border-radius: 8px; text-align: center; border: 1px solid #ec4899;">
                <h3 style="color: #ec4899; margin: 0;">${snapshot.notifications.totalStored}</h3>
                <p style="margin: 0.5rem 0 0 0; color: #64748b;">Avisos almacenados</p>
            </div>
            <div class="stat-card" style="background: #f3e8ff; padding: 1rem; border-radius: 8px; text-align: center; border: 1px solid #a855f7;">
                <h3 style="color: #a855f7; margin: 0;">${snapshot.content.documents}</h3>
                <p style="margin: 0.5rem 0 0 0; color: #64748b;">Documentos</p>
            </div>
            <div class="stat-card" style="background: #ecfdf5; padding: 1rem; border-radius: 8px; text-align: center; border: 1px solid #10b981;">
                <h3 style="color: #10b981; margin: 0;">${snapshot.content.news}</h3>
                <p style="margin: 0.5rem 0 0 0; color: #64748b;">Noticias</p>
            </div>
            <div class="stat-card" style="background: #fef2f2; padding: 1rem; border-radius: 8px; text-align: center; border: 1px solid #ef4444;">
                <h3 style="color: #ef4444; margin: 0;">${snapshot.content.bandos}</h3>
                <p style="margin: 0.5rem 0 0 0; color: #64748b;">Bandos</p>
            </div>
            <div class="stat-card" style="background: #f0fdfa; padding: 1rem; border-radius: 8px; text-align: center; border: 1px solid #14b8a6;">
                <h3 style="color: #14b8a6; margin: 0;">${snapshot.content.events}</h3>
                <p style="margin: 0.5rem 0 0 0; color: #64748b;">Eventos</p>
            </div>
            <div class="stat-card" style="background: #f1f5f9; padding: 1rem; border-radius: 8px; text-align: center; border: 1px solid #94a3b8;">
                <h3 style="color: #475569; margin: 0;">${snapshot.content.quickAccess}</h3>
                <p style="margin: 0.5rem 0 0 0; color: #64748b;">Acceso rápido</p>
                <small style="display:block; margin-top:0.5rem; color:#94a3b8;">Último envío: ${ultimaNotificacion ? formatDate(ultimaNotificacion) : 'Sin registros'}</small>
            </div>
        </div>
    `;
}

function normalizeToDate(value) {
    if (!value) {
        return null;
    }
    if (value instanceof Date) {
        return value;
    }
    if (typeof value === 'string') {
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    if (typeof value.toDate === 'function') {
        try {
            return value.toDate();
        } catch (error) {
            console.warn('No se pudo convertir valor a fecha mediante toDate():', error);
        }
    }
    if (typeof value === 'object' && typeof value.seconds === 'number') {
        return new Date(value.seconds * 1000);
    }
    return null;
}

function refreshNotificationStats() {
    const totalNotificationsEl = document.getElementById('totalNotifications');
    const successRateEl = document.getElementById('successRate');
    const invalidTokensEl = document.getElementById('invalidTokens');
    const mostUsedTypeEl = document.getElementById('mostUsedType');

    if (!totalNotificationsEl && !successRateEl && !invalidTokensEl && !mostUsedTypeEl) {
        return;
    }

    const storedSent = parseInt(localStorage.getItem('notificationsSentCount') || '0', 10);
    const sentFallback = Array.isArray(notifications) ? notifications.length : 0;
    const totalSent = Number.isNaN(storedSent) ? sentFallback : Math.max(storedSent, sentFallback);

    if (totalNotificationsEl) {
        totalNotificationsEl.textContent = totalSent.toString();
    }

    let successRateValue = '-';
    let invalidTokensValue = 0;

    const statsSummaryRaw = localStorage.getItem('notificationsStatsSummary');
    if (statsSummaryRaw) {
        try {
            const statsSummary = JSON.parse(statsSummaryRaw);
            if (typeof statsSummary.sent === 'number' && typeof statsSummary.totalUsers === 'number' && statsSummary.totalUsers > 0) {
                successRateValue = `${((statsSummary.sent / statsSummary.totalUsers) * 100).toFixed(0)}%`;
            } else if (typeof statsSummary.successRate === 'string') {
                successRateValue = statsSummary.successRate;
            }
            if (typeof statsSummary.invalidTokens === 'number') {
                invalidTokensValue = statsSummary.invalidTokens;
            }
        } catch (error) {
            console.warn('No se pudo procesar estadísticas de notificaciones guardadas:', error);
        }
    }

    if (successRateEl) {
        successRateEl.textContent = successRateValue;
    }
    if (invalidTokensEl) {
        invalidTokensEl.textContent = invalidTokensValue.toString();
    }

    if (mostUsedTypeEl) {
        if (Array.isArray(notifications) && notifications.length > 0) {
            const typeCounts = notifications.reduce((acc, notif) => {
                const type = (notif.type || 'general').toString().trim().toLowerCase();
                acc[type] = (acc[type] || 0) + 1;
                return acc;
            }, {});
            const topEntry = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0];
            mostUsedTypeEl.textContent = topEntry ? topEntry[0] : '-';
        } else {
            mostUsedTypeEl.textContent = '-';
        }
    }
}

function refreshStatistics(showNotificationToast = false) {
    const totalUsersEl = document.getElementById('totalUsers');
    const newUsersMonthEl = document.getElementById('newUsersMonth');
    const activeUsersEl = document.getElementById('activeUsers');
    const usersByLocalitiesEl = document.getElementById('usersByLocalities');

    const hasUserStatsElements = totalUsersEl || newUsersMonthEl || activeUsersEl || usersByLocalitiesEl;

    const totalUsersCount = Array.isArray(users) ? users.length : 0;
    if (totalUsersEl) {
        totalUsersEl.textContent = totalUsersCount.toString();
    }

    if (hasUserStatsElements) {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const weekAgo = new Date(now);
        weekAgo.setDate(now.getDate() - 7);

        let newUsersCount = 0;
        let activeUsersCount = 0;
        const localitiesSet = new Set();

        if (Array.isArray(users)) {
            users.forEach(user => {
                const registrationDate = normalizeToDate(user.registrationDate || user.createdAt || user.created_at);
                if (registrationDate) {
                    if (registrationDate >= startOfMonth) {
                        newUsersCount++;
                    }
                    if (registrationDate >= weekAgo) {
                        activeUsersCount++;
                    }
                }
                if (Array.isArray(user.localities)) {
                    user.localities.forEach(locality => {
                        if (locality && typeof locality === 'string') {
                            localitiesSet.add(locality.trim());
                        }
                    });
                }
            });
        }

        if (newUsersMonthEl) {
            newUsersMonthEl.textContent = newUsersCount.toString();
        }

        if (activeUsersEl) {
            if (activeUsersCount === 0 && Array.isArray(users)) {
                activeUsersCount = users.filter(user => user.notificationConsent && user.fcmToken).length;
            }
            activeUsersEl.textContent = activeUsersCount.toString();
        }

        if (usersByLocalitiesEl) {
            usersByLocalitiesEl.textContent = localitiesSet.size.toString();
        }
    }

    refreshNotificationStats();

    if (showNotificationToast) {
        showNotification('Estadísticas actualizadas', 'success');
    }
}

function exportStatisticsPDF() {
    try {
        const stats = getStatisticsSnapshot();
        if (!stats) {
            showNotification('No se pudieron obtener las estadísticas.', 'error');
            return;
        }

        const exportDate = getCurrentDateForFilename();
        const generatedAt = new Date().toLocaleString('es-ES');
        const title = 'Estadísticas Avanzadas - Ayuntamiento de Cobreros';

        const baseStyles = `
            body { font-family: Arial, sans-serif; color: #1f2937; }
            h1, h2 { color: #1f2937; margin-bottom: 0.5rem; }
            .section { margin-bottom: 2rem; }
            .kv-table { border-collapse: collapse; width: 100%; margin-top: 0.5rem; }
            .kv-table th, .kv-table td { border: 1px solid #1f2937; padding: 6px 8px; text-align: left; vertical-align: top; }
            .kv-table th { background: #e5e7eb; width: 35%; }
            p.meta { font-size: 0.95rem; margin: 0.25rem 0; }
        `;

        const usersSection = buildKeyValueTable([
            { label: 'Total registrados', value: stats.users.total },
            { label: 'Nuevos este mes', value: stats.users.newThisMonth },
            { label: 'Activos (última semana)', value: stats.users.activeThisWeek },
            { label: 'Usuarios con notificaciones activas', value: stats.users.withNotifications },
            { label: 'Localidades activas', value: stats.users.localitiesCount },
            { label: 'Listado de localidades', value: stats.users.localitiesList }
        ]);

        const notificationsSection = buildKeyValueTable([
            { label: 'Total almacenadas', value: stats.notifications.totalStored },
            { label: 'Total enviadas', value: stats.notifications.totalSent },
            { label: 'Tasa de éxito', value: stats.notifications.successRate },
            { label: 'Tokens inválidos detectados', value: stats.notifications.invalidTokens },
            { label: 'Tipo más utilizado', value: stats.notifications.mostUsedType }
        ]);

        const appointmentsSection = buildKeyValueTable([
            { label: 'Total citas', value: stats.appointments.total },
            { label: 'Pendientes', value: stats.appointments.pending },
            { label: 'Confirmadas', value: stats.appointments.confirmed },
            { label: 'Canceladas', value: stats.appointments.cancelled },
            { label: 'Completadas', value: stats.appointments.completed },
            { label: 'No se presentó', value: stats.appointments.noShow }
        ]);

        const contentSection = buildKeyValueTable([
            { label: 'Anuncios publicados', value: stats.content.news },
            { label: 'Bandos publicados', value: stats.content.bandos },
            { label: 'Eventos programados', value: stats.content.events },
            { label: 'Tarjetas de acceso rápido', value: stats.content.quickAccess },
            { label: 'Tarjetas de Cultura y Ocio', value: stats.content.culturaTarjetas },
            { label: 'Instalaciones de Cultura y Ocio', value: stats.content.culturaInstalaciones },
            { label: 'Pestañas personalizadas', value: stats.content.culturaPestanas },
            { label: 'Documentos en la biblioteca', value: stats.content.documents },
            { label: 'Administradores registrados', value: stats.content.admins }
        ]);

        const sectionsHtml = `
            <h1>${escapeHtml(title)}</h1>
            <p class="meta"><strong>Generado:</strong> ${escapeHtml(generatedAt)}</p>

            <div class="section">
                <h2>Usuarios</h2>
                ${usersSection}
            </div>

            <div class="section">
                <h2>Avisos</h2>
                ${notificationsSection}
            </div>

            <div class="section">
                <h2>Citas previas</h2>
                ${appointmentsSection}
            </div>

            <div class="section">
                <h2>Contenido publicado</h2>
                ${contentSection}
            </div>
        `;

        const wordContent = `
            <!DOCTYPE html>
            <html>
                <head>
                    <meta charset="utf-8">
                    <style>${baseStyles}</style>
                </head>
                <body>
                    ${sectionsHtml}
                </body>
            </html>
        `;
        const wordBlob = new Blob(['\ufeff', wordContent], { type: 'application/msword' });
        downloadBlob(wordBlob, `estadisticas_${exportDate}.doc`);

        const excelContent = `
            <!DOCTYPE html>
            <html>
                <head>
                    <meta charset="UTF-8">
                    <style>${baseStyles}</style>
                </head>
                <body>
                    ${sectionsHtml}
                </body>
            </html>
        `;
        const excelBlob = new Blob(['\ufeff', excelContent], { type: 'application/vnd.ms-excel' });
        downloadBlob(excelBlob, `estadisticas_${exportDate}.xls`);

        const pdfLines = [
            title,
            `Generado: ${generatedAt}`,
            ''
        ];

        const addSectionToPdf = (heading, entries) => {
            pdfLines.push(heading);
            if (Array.isArray(entries) && entries.length > 0) {
                entries.forEach(entry => {
                    pdfLines.push(`${entry.label}: ${entry.value}`);
                });
            } else {
                pdfLines.push('Sin datos.');
            }
            pdfLines.push('');
        };

        addSectionToPdf('Usuarios', [
            { label: 'Total registrados', value: stats.users.total },
            { label: 'Nuevos este mes', value: stats.users.newThisMonth },
            { label: 'Activos (última semana)', value: stats.users.activeThisWeek },
            { label: 'Usuarios con notificaciones activas', value: stats.users.withNotifications },
            { label: 'Localidades activas', value: stats.users.localitiesCount },
            { label: 'Localidades', value: stats.users.localitiesList }
        ]);

        addSectionToPdf('Avisos', [
            { label: 'Total almacenadas', value: stats.notifications.totalStored },
            { label: 'Total enviadas', value: stats.notifications.totalSent },
            { label: 'Tasa de éxito', value: stats.notifications.successRate },
            { label: 'Tokens inválidos', value: stats.notifications.invalidTokens },
            { label: 'Tipo más usado', value: stats.notifications.mostUsedType }
        ]);

        addSectionToPdf('Citas previas', [
            { label: 'Total citas', value: stats.appointments.total },
            { label: 'Pendientes', value: stats.appointments.pending },
            { label: 'Confirmadas', value: stats.appointments.confirmed },
            { label: 'Canceladas', value: stats.appointments.cancelled },
            { label: 'Completadas', value: stats.appointments.completed },
            { label: 'No se presentó', value: stats.appointments.noShow }
        ]);

        addSectionToPdf('Contenido publicado', [
            { label: 'Anuncios', value: stats.content.news },
            { label: 'Bandos', value: stats.content.bandos },
            { label: 'Eventos', value: stats.content.events },
            { label: 'Tarjetas de acceso rápido', value: stats.content.quickAccess },
            { label: 'Tarjetas de Cultura y Ocio', value: stats.content.culturaTarjetas },
            { label: 'Instalaciones de Cultura y Ocio', value: stats.content.culturaInstalaciones },
            { label: 'Pestañas personalizadas', value: stats.content.culturaPestanas },
            { label: 'Documentos', value: stats.content.documents },
            { label: 'Administradores', value: stats.content.admins }
        ]);

        const pdfBlob = createPdfBlobFromLines(pdfLines);
        downloadBlob(pdfBlob, `estadisticas_${exportDate}.pdf`);

        showNotification('Estadísticas exportadas en Word, Excel y PDF', 'success');
    } catch (error) {
        console.error('Error exportando estadísticas:', error);
        showNotification('Error al exportar las estadísticas. Inténtelo de nuevo.', 'error');
    }
}

// Obtener información del super admin
function getSuperAdminInfo() {
    if (isSuperAdminLoggedIn()) {
        return {
            email: SUPER_ADMIN.email,
            team: SUPER_ADMIN.team,
            permissions: ['full_access', 'user_management', 'content_management', 'notifications', 'system_settings']
        };
    }
    return null;
}


// Funciones para el sistema de citas previas
function loadAppointmentSettings() {
    console.log('🔧 Cargando configuración de citas previas...');
    
    const savedSettings = localStorage.getItem('appointmentSettings');
    
    if (savedSettings) {
        try {
        const settings = JSON.parse(savedSettings);
        appointmentsEnabled = settings.enabled;
            console.log('✅ Configuración cargada desde localStorage:', appointmentsEnabled ? 'CITA PREVIA' : 'SIN CITA PREVIA');
        } catch (error) {
            console.error('❌ Error parseando configuración guardada:', error);
            appointmentsEnabled = true; // Valor por defecto
        }
    } else {
        // Primera vez - configuración por defecto
        appointmentsEnabled = true;
        console.log('⚠️ Primera vez - usando configuración por defecto: CITA PREVIA');
        
        // Guardar configuración por defecto
        const defaultSettings = {
            enabled: appointmentsEnabled,
            updatedBy: 'sistema',
            updatedAt: new Date().toISOString()
        };
        localStorage.setItem('appointmentSettings', JSON.stringify(defaultSettings));
    }
    
    // Actualizar interfaz inmediatamente
    updateAppointmentUI();
    
    // Actualizar radio buttons en el panel de administración
    const enabledRadio = document.getElementById('appointmentEnabled');
    const disabledRadio = document.getElementById('appointmentDisabled');
    
    if (enabledRadio && disabledRadio) {
        if (appointmentsEnabled) {
            enabledRadio.checked = true;
            disabledRadio.checked = false;
        } else {
            enabledRadio.checked = false;
            disabledRadio.checked = true;
        }
        console.log('🔘 Radio buttons actualizados:', appointmentsEnabled ? 'Habilitado' : 'Deshabilitado');
    }
    
    console.log('✅ Configuración de citas previas cargada completamente');
}

function updateAppointmentUI() {
    // Verificar que la configuración esté cargada
    if (appointmentsEnabled === null) {
        console.log('⚠️ appointmentsEnabled es null, recargando configuración...');
        loadAppointmentSettings();
        return;
    }
    
    console.log('🎨 Actualizando UI de citas previas:', appointmentsEnabled ? 'CITA PREVIA' : 'SIN CITA PREVIA');
    
    const statusBadge = document.getElementById('statusBadge');
    const statusText = document.getElementById('statusText');
    const appointmentDescription = document.getElementById('appointmentDescription');
    const toggleBtn = document.getElementById('toggleAppointmentForm');
    const appointmentForm = document.getElementById('appointmentForm');
    
    // Verificar que los elementos existen
    if (!statusBadge || !statusText || !appointmentDescription) {
        console.log('⚠️ Elementos de UI no encontrados, reintentando en 100ms...');
        setTimeout(updateAppointmentUI, 100);
        return;
    }
    
    if (appointmentsEnabled) {
        // Modo CITA PREVIA
        statusBadge.className = 'status-badge appointment-enabled';
        statusText.textContent = 'CITA PREVIA';
        appointmentDescription.textContent = 'Para solicitar una cita previa, complete el formulario a continuación. Le contactaremos para confirmar la fecha y hora.';
        toggleBtn.innerHTML = '<i class="fas fa-calendar-plus"></i> Solicitar Cita Previa';
        toggleBtn.style.display = 'inline-flex';
        
        // Habilitar formulario
        if (appointmentForm) {
            appointmentForm.querySelectorAll('input, select, textarea').forEach(field => {
                field.disabled = false;
            });
        }
    } else {
        // Modo SIN CITA PREVIA
        statusBadge.className = 'status-badge appointment-disabled';
        statusText.textContent = 'SE ATIENDE SIN CITA PREVIA';
        appointmentDescription.textContent = 'Actualmente se atiende sin cita previa. Puede acudir directamente al ayuntamiento en horario de atención.';
        toggleBtn.style.display = 'none';
        
        // Deshabilitar formulario
        if (appointmentForm) {
            appointmentForm.querySelectorAll('input, select, textarea').forEach(field => {
                field.disabled = true;
            });
        }
    }
}

function updateAppointmentMode() {
    const enabledRadio = document.getElementById('appointmentEnabled');
    const disabledRadio = document.getElementById('appointmentDisabled');
    
    if (!isAdmin) {
        showNotification('Solo los administradores pueden cambiar esta configuración', 'error');
        return;
    }
    
    // Verificar que los radio buttons existen
    if (!enabledRadio || !disabledRadio) {
        console.error('❌ Error: Radio buttons no encontrados');
        showNotification('Error: No se pudieron encontrar los controles de configuración', 'error');
        return;
    }
    
    appointmentsEnabled = enabledRadio.checked;
    
    // Guardar configuración con múltiple seguridad
    const settings = {
        enabled: appointmentsEnabled,
        updatedBy: currentUser ? currentUser.email : 'admin',
        updatedAt: new Date().toISOString(),
        version: '1.0'
    };
    
    // Guardar múltiples veces para asegurar persistencia
    try {
        localStorage.setItem('appointmentSettings', JSON.stringify(settings));
        console.log('💾 Configuración guardada en localStorage');
        
        // Verificación inmediata
        const immediateCheck = localStorage.getItem('appointmentSettings');
        if (immediateCheck) {
            const immediateSettings = JSON.parse(immediateCheck);
            if (immediateSettings.enabled !== appointmentsEnabled) {
                console.error('❌ Error inmediato: configuración no coincide, reintentando...');
                localStorage.setItem('appointmentSettings', JSON.stringify(settings));
            }
        }
        
        // Verificación con delay
        setTimeout(() => {
            const verification = localStorage.getItem('appointmentSettings');
            if (verification) {
                const verifySettings = JSON.parse(verification);
                if (verifySettings.enabled !== appointmentsEnabled) {
                    console.error('❌ Error: configuración no se guardó correctamente, reintentando...');
                    localStorage.setItem('appointmentSettings', JSON.stringify(settings));
                } else {
                    console.log('✅ Configuración guardada y verificada correctamente');
                }
            } else {
                console.error('❌ Error: No se encontró configuración guardada, reintentando...');
                localStorage.setItem('appointmentSettings', JSON.stringify(settings));
            }
        }, 100);
        
        // Verificación adicional con más delay
        setTimeout(() => {
            const finalCheck = localStorage.getItem('appointmentSettings');
            if (finalCheck) {
                const finalSettings = JSON.parse(finalCheck);
                console.log('🔍 Verificación final:', finalSettings.enabled ? 'CITA PREVIA' : 'SIN CITA PREVIA');
            }
        }, 500);
        
    } catch (error) {
        console.error('❌ Error guardando en localStorage:', error);
        showNotification('Error al guardar la configuración', 'error');
        return;
    }
    
    // Actualizar interfaz inmediatamente
    updateAppointmentUI();
    
    // Actualizaciones adicionales por seguridad
    setTimeout(updateAppointmentUI, 200);
    setTimeout(updateAppointmentUI, 500);
    
    showNotification(`Sistema de citas previas ${appointmentsEnabled ? 'activado' : 'desactivado'}`, 'success');
    console.log('💾 Configuración guardada:', appointmentsEnabled ? 'CITA PREVIA' : 'SIN CITA PREVIA');
}

// Función para validar DNI
function validateDNI(dni) {
    const dniRegex = /^[0-9]{8}[A-Za-z]$/;
    if (!dniRegex.test(dni)) {
        return false;
    }
    
    const numbers = dni.substring(0, 8);
    const letter = dni.substring(8, 9).toUpperCase();
    const letters = 'TRWAGMYFPDXBNJZSQVHLCKE';
    const expectedLetter = letters[parseInt(numbers) % 23];
    
    return letter === expectedLetter;
}

// Función para validar NIE
function validateNIE(nie) {
    // Formato NIE: X/Y/Z + 7 números + letra
    const nieRegex = /^[XYZ][0-9]{7}[A-Za-z]$/;
    if (!nieRegex.test(nie)) {
        return false;
    }
    
    // Reemplazar primera letra por número (X=0, Y=1, Z=2)
    const firstLetter = nie.substring(0, 1).toUpperCase();
    const numbers = nie.substring(1, 8);
    const letter = nie.substring(8, 9).toUpperCase();
    
    let firstDigit = '0';
    if (firstLetter === 'Y') firstDigit = '1';
    else if (firstLetter === 'Z') firstDigit = '2';
    
    const fullNumber = firstDigit + numbers;
    const letters = 'TRWAGMYFPDXBNJZSQVHLCKE';
    const expectedLetter = letters[parseInt(fullNumber) % 23];
    
    return letter === expectedLetter;
}

// Función para enviar email de confirmación usando Firebase Functions
// Email dedicado: u2389387944@gmail.com
async function sendConfirmationEmail(appointmentData) {
    try {
        const response = await fetch(`${CLOUD_FUNCTIONS_BASE_URL}/sendEmail`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
        to: appointmentData.email,
                from: 'u2389387944@gmail.com',
        subject: 'Confirmación de Cita Previa - Ayuntamiento de Cobreros',
                template: 'appointment_confirmation',
                data: {
                    name: appointmentData.name,
                    service: getServiceName(appointmentData.service),
                    date: formatDateForDisplay(appointmentData.date),
                    time: appointmentData.time,
                    dateFormatted: formatDateForDisplay(appointmentData.date),
                    dni: appointmentData.dni,
                    email: appointmentData.email,
                    phone: appointmentData.phone,
                    comments: appointmentData.comments || 'Ninguno',
                    appointmentId: appointmentData.id || Date.now().toString(),
                    attachmentUrl: appointmentData.attachment?.url || null,
                    attachmentName: appointmentData.attachment?.name || null
                }
            })
        });

        const result = await response.json();
        if (result.success) {
            console.log('✅ Email de confirmación enviado al usuario:', result.messageId);
    return true;
        } else {
            console.error('❌ Error al enviar email:', result.error);
            return false;
        }
    } catch (error) {
        console.error('❌ Error al enviar email de confirmación:', error);
        return false;
    }
}

// Función para enviar alerta al ayuntamiento usando Firebase Functions
// Email dedicado: u2389387944@gmail.com
async function sendAdminAlert(appointmentData) {
    try {
        const response = await fetch(`${CLOUD_FUNCTIONS_BASE_URL}/sendEmail`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
        to: 'aytocobreros@gmail.com',
                from: 'u2389387944@gmail.com',
        subject: 'NUEVA SOLICITUD DE CITA PREVIA',
                template: 'appointment_notification_admin',
                data: {
                    name: appointmentData.name,
                    dni: appointmentData.dni,
                    email: appointmentData.email,
                    phone: appointmentData.phone,
                    service: getServiceName(appointmentData.service),
                    date: formatDateForDisplay(appointmentData.date),
                    time: appointmentData.time,
                    dateFormatted: formatDateForDisplay(appointmentData.date),
                    comments: appointmentData.comments || 'Ninguno',
                    createdAt: new Date().toLocaleString('es-ES'),
                    appointmentId: appointmentData.id || Date.now().toString(),
                    attachmentUrl: appointmentData.attachment?.url || null,
                    attachmentName: appointmentData.attachment?.name || null
                }
            })
        });

        const result = await response.json();
        if (result.success) {
            console.log('✅ Alerta enviada al administrador:', result.messageId);
    return true;
        } else {
            console.error('❌ Error al enviar alerta:', result.error);
            return false;
        }
    } catch (error) {
        console.error('❌ Error al enviar alerta al administrador:', error);
        return false;
    }
}

// Funciones para el modal de protección de datos
function showGDPRModal() {
    const modal = document.getElementById('gdprModal');
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
}

function closeGDPRModal() {
    const modal = document.getElementById('gdprModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}
function setupGDPRModal() {
    const modal = document.getElementById('gdprModal');
    if (modal) {
        // Cerrar modal al hacer clic fuera de él
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeGDPRModal();
            }
        });
        
        // Cerrar modal con tecla Escape
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && modal.style.display === 'block') {
                closeGDPRModal();
            }
        });
    }
}
// Funciones para gestión de citas previas
function loadAppointments() {
    const savedAppointments = localStorage.getItem('appointments');
    if (savedAppointments) {
        try {
            appointments = JSON.parse(savedAppointments);
            console.log(`✅ ${appointments.length} citas cargadas desde localStorage`);
            
            // Validar que todas las citas tengan los campos necesarios
            appointments = appointments.map(apt => {
                // Asegurar que todos los campos estén presentes
                if (!apt.id) apt.id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
                if (!apt.status) apt.status = 'pending';
                if (!apt.createdAt) apt.createdAt = new Date().toISOString();
                if (!apt.updatedAt) apt.updatedAt = new Date().toISOString();
                if (apt.attachment && typeof apt.attachment === 'object') {
                    apt.attachment = {
                        name: apt.attachment.name || apt.attachment.fileName || apt.attachment.originalName || 'Documento adjunto',
                        url: apt.attachment.url || apt.attachment.fileUrl || null,
                        storagePath: apt.attachment.storagePath || apt.attachment.path || null,
                        size: apt.attachment.size || apt.attachment.fileSize || null,
                        contentType: apt.attachment.contentType || apt.attachment.type || null,
                        uploadedAt: apt.attachment.uploadedAt || null
                    };
                    if (!apt.attachment.url) {
                        apt.attachment = null;
                    }
                } else {
                    apt.attachment = null;
                }
                return apt;
            });
            
            // Guardar citas validadas
            saveAppointments();
        } catch (error) {
            console.error('❌ Error cargando citas desde localStorage:', error);
            appointments = [];
            localStorage.setItem('appointments', JSON.stringify([]));
        }
    } else {
        appointments = [];
        console.log('⚠️ No hay citas guardadas, iniciando con array vacío');
    }
    
    // Cargar lista y estadísticas después de cargar las citas
    if (document.getElementById('appointmentsList')) {
        loadAppointmentsList();
    }
    if (document.getElementById('totalAppointments')) {
        loadAppointmentStats();
    }
}

function saveAppointments() {
    try {
        localStorage.setItem('appointments', JSON.stringify(appointments));
        console.log(`💾 ${appointments.length} citas guardadas en localStorage`);
    } catch (error) {
        console.error('❌ Error guardando citas en localStorage:', error);
        // Intentar limpiar localStorage si está lleno
        if (error.name === 'QuotaExceededError') {
            console.warn('⚠️ localStorage lleno, intentando limpiar...');
            // Limpiar citas muy antiguas (más de 1 año)
            const oneYearAgo = new Date();
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
            appointments = appointments.filter(apt => {
                const aptDate = new Date(apt.createdAt);
                return aptDate > oneYearAgo;
            });
            try {
                localStorage.setItem('appointments', JSON.stringify(appointments));
                console.log(`✅ Citas limpiadas y guardadas: ${appointments.length} citas`);
            } catch (retryError) {
                console.error('❌ Error crítico: No se pudo guardar citas incluso después de limpiar', retryError);
            }
        }
    }
}
function loadAppointmentsList() {
    const appointmentsList = document.getElementById('appointmentsList');
    if (!appointmentsList) {
        console.log('No se encontró el elemento appointmentsList');
        return;
    }
    
    console.log('Cargando lista de citas, total:', appointments.length);
    
    if (appointments.length === 0) {
        appointmentsList.innerHTML = '<div class="no-data" style="padding: 2rem; text-align: center; color: var(--text-secondary);">No hay citas previas solicitadas</div>';
        return;
    }
    
    const sortedAppointments = appointments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    appointmentsList.innerHTML = sortedAppointments.map(appointment => {
        let actionButtons = '';
        const hasAttachment = appointment.attachment && appointment.attachment.url;
        const attachmentName = hasAttachment ? (appointment.attachment.name || 'Documento adjunto') : '';
        const safeAttachmentUrl = hasAttachment ? escapeHtml(appointment.attachment.url) : '';
        const safeAttachmentName = hasAttachment ? escapeHtml(attachmentName) : '';
        const attachmentSize = hasAttachment && typeof formatFileSize === 'function' && appointment.attachment.size ? formatFileSize(appointment.attachment.size) : null;
        const attachmentBadge = hasAttachment ? '<span class="appointment-attachment" style="color: var(--primary-color); margin-left: 0.4rem;"><i class="fas fa-paperclip"></i></span>' : '';
        
        // Botón de editar (siempre visible)
        actionButtons += `<button class="btn btn-primary" onclick="editAppointment('${appointment.id}')">
            <i class="fas fa-edit"></i> Editar
        </button>`;
        
        // Botones según el estado
        if (appointment.status === 'pending') {
            actionButtons += `<button class="btn btn-success" onclick="updateAppointmentStatus('${appointment.id}', 'confirmed')">
                <i class="fas fa-check"></i> Confirmar
            </button>`;
            actionButtons += `<button class="btn btn-warning" onclick="openCancelAppointmentModal('${appointment.id}')" title="Cancelar cita con opción de fecha alternativa">
                <i class="fas fa-times"></i> Cancelar
            </button>`;
        } else if (appointment.status === 'confirmed') {
            actionButtons += `<button class="btn btn-warning" onclick="openCancelAppointmentModal('${appointment.id}')" title="Cancelar cita con opción de fecha alternativa">
                <i class="fas fa-times"></i> Cancelar
            </button>`;
        } else if (appointment.status === 'cancelled') {
            actionButtons += `<button class="btn btn-success" onclick="updateAppointmentStatus('${appointment.id}', 'confirmed')">
                <i class="fas fa-check"></i> Confirmar de nuevo
            </button>`;
        }
        
        // Botones para marcar asistencia (solo para citas confirmadas o pasadas)
        const appointmentDate = new Date(appointment.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        appointmentDate.setHours(0, 0, 0, 0);
        
        // Validar que la fecha sea válida
        const isValidDate = !isNaN(appointmentDate.getTime());
        const isPastDate = isValidDate && appointmentDate < today;
        const isToday = isValidDate && appointmentDate.getTime() === today.getTime();
        
        // Mostrar botones de asistencia solo si:
        // 1. La fecha es válida
        // 2. La cita está confirmada/completada/no_show
        // 3. La fecha ya pasó o es hoy (no futuras)
        if (isValidDate && (appointment.status === 'confirmed' || appointment.status === 'completed' || appointment.status === 'no_show') && (isPastDate || isToday)) {
            if (appointment.status !== 'completed') {
                actionButtons += `<button class="btn btn-success" onclick="markAppointmentCompleted('${appointment.id}')" title="Marcar como cita realizada">
                    <i class="fas fa-check-circle"></i> Cita Realizada
                </button>`;
            }
            if (appointment.status !== 'no_show') {
                actionButtons += `<button class="btn btn-danger" onclick="markAppointmentNoShow('${appointment.id}')" title="Marcar como no se presentó - Enviará email automático">
                    <i class="fas fa-user-times"></i> No se Presentó
                </button>`;
            }
        }

        if (hasAttachment) {
            actionButtons += `<button class="btn btn-outline" data-url="${safeAttachmentUrl}" data-name="${safeAttachmentName}" onclick="downloadAttachment(this.dataset.url, this.dataset.name, true)">
                <i class="fas fa-paperclip"></i> Descargar Adjunto
            </button>`;
        }
        
        // Botones adicionales
        actionButtons += `<button class="btn btn-outline" onclick="viewAppointmentDetails('${appointment.id}')">
            <i class="fas fa-eye"></i> Ver Detalles
        </button>`;
        actionButtons += `<button class="btn btn-danger" onclick="deleteAppointment('${appointment.id}')">
            <i class="fas fa-trash"></i> Eliminar
        </button>`;
        
        // Determinar color de borde según estado
        let borderColor = 'var(--border-color)';
        let borderStyle = '1px solid';
        if (appointment.status === 'no_show') {
            borderColor = '#ef4444'; // Rojo para no se presentó
            borderStyle = '2px solid';
        } else if (appointment.status === 'completed') {
            borderColor = '#10b981'; // Verde para completada
            borderStyle = '2px solid';
        }
        
        return `
            <div class="appointment-item" data-status="${appointment.status}" style="margin-bottom: 1rem; border: ${borderStyle} ${borderColor}; border-radius: var(--border-radius); ${appointment.status === 'no_show' ? 'background: rgba(239, 68, 68, 0.05);' : appointment.status === 'completed' ? 'background: rgba(16, 185, 129, 0.05);' : ''}">
                <div class="appointment-header" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                    <div class="appointment-info" style="flex: 1;">
                        <div class="appointment-name" style="font-weight: 600; color: var(--text-primary); margin-bottom: 0.25rem;">${appointment.name}</div>
                        <div class="appointment-service" style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 0.25rem;">${getServiceName(appointment.service)}${attachmentBadge}</div>
                        <div class="appointment-datetime" style="color: var(--text-secondary); font-size: 0.85rem;">
                            <i class="fas fa-calendar"></i> ${formatDate(appointment.date)} 
                            <i class="fas fa-clock"></i> ${appointment.time}
                        </div>
                    </div>
                    <div class="appointment-status">
                        <span class="status-badge status-${appointment.status}" style="padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.75rem; font-weight: 500; text-transform: uppercase; ${appointment.status === 'no_show' ? 'background: #ef4444; color: white;' : appointment.status === 'completed' ? 'background: #10b981; color: white;' : ''}">${getStatusText(appointment.status)}</span>
                    </div>
                </div>
                <div class="appointment-details" style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid var(--border-color); font-size: 0.85rem; color: var(--text-secondary);">
                    <p style="margin-bottom: 0.25rem;"><strong style="color: var(--text-primary);">DNI:</strong> ${appointment.dni}</p>
                    <p style="margin-bottom: 0.25rem;"><strong style="color: var(--text-primary);">Email:</strong> ${appointment.email}</p>
                    <p style="margin-bottom: 0.25rem;"><strong style="color: var(--text-primary);">Teléfono:</strong> ${appointment.phone}</p>
                    ${appointment.comments ? `<p style="margin-bottom: 0.25rem;"><strong style="color: var(--text-primary);">Comentarios:</strong> ${appointment.comments}</p>` : ''}
                    ${hasAttachment ? `<p style="margin-bottom: 0.25rem;"><strong style="color: var(--text-primary);">Adjunto:</strong> <button class="btn btn-outline btn-small" data-url="${safeAttachmentUrl}" data-name="${safeAttachmentName}" onclick="downloadAttachment(this.dataset.url, this.dataset.name, true)"><i class="fas fa-paperclip"></i> ${safeAttachmentName}${attachmentSize ? ` (${attachmentSize})` : ''}</button></p>` : ''}
                    <p style="margin-bottom: 0.25rem;"><strong style="color: var(--text-primary);">Solicitado:</strong> ${formatDateTime(appointment.createdAt)}</p>
                </div>
                <div class="appointment-actions" style="display: flex; gap: 0.5rem; margin-top: 0.75rem; flex-wrap: wrap;">
                    ${actionButtons}
                </div>
            </div>
        `;
    }).join('');
    
    console.log('Lista de citas cargada correctamente');
}

function loadAppointmentStats() {
    const total = appointments.length;
    const pending = appointments.filter(a => a.status === 'pending').length;
    const confirmed = appointments.filter(a => a.status === 'confirmed').length;
    const cancelled = appointments.filter(a => a.status === 'cancelled').length;
    const completed = appointments.filter(a => a.status === 'completed').length;
    const noShow = appointments.filter(a => a.status === 'no_show').length;
    
    document.getElementById('totalAppointments').textContent = total;
    document.getElementById('pendingAppointments').textContent = pending;
    document.getElementById('confirmedAppointments').textContent = confirmed;
    document.getElementById('cancelledAppointments').textContent = cancelled;
    
    // Actualizar estadísticas adicionales si existen
    const completedEl = document.getElementById('completedAppointments');
    const noShowEl = document.getElementById('noShowAppointments');
    if (completedEl) completedEl.textContent = completed;
    if (noShowEl) noShowEl.textContent = noShow;
}

function getServiceName(service) {
    const services = {
        'empadronamiento': 'Empadronamiento',
        'certificados': 'Certificados',
        'multas': 'Consulta de multas',
        'otros': 'Otros trámites'
    };
    return services[service] || service;
}

function getStatusText(status) {
    const statuses = {
        'pending': 'Pendiente',
        'confirmed': 'Confirmada',
        'cancelled': 'Cancelada',
        'completed': 'Completada',
        'no_show': 'No se presentó'
    };
    return statuses[status] || status;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

async function updateAppointmentStatus(appointmentId, newStatus, alternativeDate = null, reason = '') {
    const appointment = appointments.find(a => a.id === appointmentId);
    if (appointment) {
        const oldStatus = appointment.status;
        appointment.status = newStatus;
        appointment.updatedAt = new Date().toISOString();
        
        // Si se cancela, usar modal de cancelación con fecha alternativa
        if (newStatus === 'cancelled' && typeof openCancelAppointmentModal === 'function') {
            openCancelAppointmentModal(appointmentId);
            return; // El modal manejará el resto
        }
        
        // Enviar email de cambio de estado
        if (oldStatus !== newStatus) {
            await sendStatusChangeEmail(appointment, oldStatus, newStatus, alternativeDate, reason);
        }
        
        saveAppointments();
        loadAppointmentsList();
        loadAppointmentStats();
        renderAdminCalendar(); // Actualizar calendario del admin
        
        const statusText = getStatusText(newStatus);
        showNotification(`Cita ${statusText.toLowerCase()} correctamente. Se ha enviado un email de confirmación.`, 'success');
    }
}

async function deleteAppointment(appointmentId) {
    const appointment = appointments.find(a => a.id === appointmentId);
    if (!appointment) {
        showNotification('Cita no encontrada', 'error');
        return;
    }
    
    // Usar confirmación mejorada si está disponible
    if (typeof confirmDelete === 'function') {
        const confirmed = await confirmDelete(
            `Cita de ${appointment.name} - ${formatDate(appointment.date)} ${appointment.time}`,
            'cita previa'
        );
        if (!confirmed) return;
    } else {
        if (!confirm('¿Está seguro de que desea eliminar esta cita previa?')) {
            return;
        }
    }
    
    // Registrar acción en log de auditoría
    if (typeof logAuditAction === 'function') {
        logAuditAction('APPOINTMENT_DELETED', {
            appointmentId: appointment.id,
            appointmentName: appointment.name,
            appointmentDate: appointment.date,
            appointmentTime: appointment.time
        });
    }
    
    // Enviar email de cancelación antes de eliminar
    const emailResult = await sendCancellationEmail(appointment, 'Cita eliminada por el administrador', null);
    
    // Registrar intento de email
    if (typeof recordEmailAttempt === 'function' && emailResult) {
        recordEmailAttempt({
            to: appointment.email,
            subject: 'Cancelación de Cita Previa - Ayuntamiento de Cobreros',
            template: 'appointment_status_change'
        }, emailResult.success, emailResult.error);
    }
    
    // Eliminar adjunto asociado si existe
    if (appointment.attachment && appointment.attachment.storagePath && typeof deleteStorageFile === 'function') {
        await deleteStorageFile(appointment.attachment.storagePath);
    }
    
    // Eliminar cita
    appointments = appointments.filter(a => a.id !== appointmentId);
    saveAppointments();
    loadAppointmentsList();
    loadAppointmentStats();
    renderAdminCalendar();
    
    // Mostrar mensaje según resultado del email
    if (emailResult && emailResult.success) {
        showNotification('Cita previa eliminada correctamente. Se ha enviado un email al usuario.', 'success');
    } else if (emailResult && emailResult.queued) {
        showNotification('Cita previa eliminada correctamente. El email se enviará automáticamente cuando sea posible.', 'warning');
    } else {
        showNotification('Cita previa eliminada correctamente. No se pudo enviar el email, pero se intentará más tarde.', 'warning');
    }
}

function viewAppointmentDetails(appointmentId) {
    const appointment = appointments.find(a => a.id === appointmentId);
    if (!appointment) {
        showNotification('Cita no encontrada', 'error');
        return;
    }

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';

    const hasAttachment = appointment.attachment && appointment.attachment.url;
    const attachmentName = hasAttachment ? (appointment.attachment.name || 'Documento adjunto') : '';
    const safeAttachmentUrl = hasAttachment ? escapeHtml(appointment.attachment.url) : '';
    const safeAttachmentName = hasAttachment ? escapeHtml(attachmentName) : '';
    const attachmentSize = hasAttachment && typeof formatFileSize === 'function' && appointment.attachment.size ? formatFileSize(appointment.attachment.size) : null;

    const attachmentSection = hasAttachment ? `
        <p><strong>Adjunto:</strong> 
            <button class="btn btn-outline btn-small" data-url="${safeAttachmentUrl}" data-name="${safeAttachmentName}" onclick="downloadAttachment(this.dataset.url, this.dataset.name, true)">
                <i class="fas fa-paperclip"></i> ${safeAttachmentName}${attachmentSize ? ` (${attachmentSize})` : ''}
            </button>
        </p>
    ` : '';

    modal.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            <h2>Detalle de la Cita Previa</h2>
            <div style="display: flex; flex-direction: column; gap: 0.5rem; font-size: 0.95rem; margin-top: 1rem;">
                <p><strong>Nombre:</strong> ${escapeHtml(appointment.name)}</p>
                <p><strong>DNI:</strong> ${escapeHtml(appointment.dni || '')}</p>
                <p><strong>Email:</strong> ${escapeHtml(appointment.email || '')}</p>
                <p><strong>Teléfono:</strong> ${escapeHtml(appointment.phone || '')}</p>
                <p><strong>Servicio:</strong> ${escapeHtml(getServiceName(appointment.service))}</p>
                <p><strong>Fecha:</strong> ${formatDate(appointment.date)}</p>
                <p><strong>Hora:</strong> ${appointment.time}</p>
                <p><strong>Estado:</strong> ${getStatusText(appointment.status)}</p>
                ${appointment.comments ? `<p><strong>Comentarios:</strong> ${escapeHtml(appointment.comments)}</p>` : ''}
                ${attachmentSection}
                <p><strong>Solicitado:</strong> ${formatDateTime(appointment.createdAt)}</p>
                <p><strong>Última actualización:</strong> ${formatDateTime(appointment.updatedAt)}</p>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function filterAppointments() {
    const filter = document.getElementById('appointmentStatusFilter').value;
    const appointmentItems = document.querySelectorAll('.appointment-item');
    
    appointmentItems.forEach(item => {
        if (filter === 'all' || item.dataset.status === filter) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
}

function refreshAppointments() {
    loadAppointments();
    loadAppointmentsList();
    loadAppointmentStats();
    renderAdminCalendar(); // Actualizar calendario del admin
    showNotification('Lista de citas actualizada', 'success');
}

// Función para crear una cita de prueba (solo para desarrollo)
async function createTestAppointment() {
    console.log('🚀 Iniciando prueba de cita previa...');
    
    // Obtener fecha de mañana para la prueba
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = formatDateForStorage(tomorrow);
    
    console.log('📅 Fecha seleccionada para la prueba:', dateStr);
    
    const testAppointmentData = {
        name: 'Prueba Cita Previa',
        dni: '12345678A',
        email: 'aytocobreros@gmail.com',
        phone: '980622618',
        service: 'empadronamiento',
        date: dateStr,
        time: '10:00',
        comments: 'Cita de prueba para verificar el envío de correos de confirmación',
        status: 'pending'
    };
    
    console.log('📋 Datos de la cita de prueba:', testAppointmentData);
    
    const testAppointment = {
        id: Date.now().toString(),
        ...testAppointmentData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    // Agregar la cita
    appointments.push(testAppointment);
    saveAppointments();
    console.log('✅ Cita guardada en localStorage');
    
    // Enviar correo de confirmación
    try {
        console.log('📧 Enviando correo de confirmación de prueba a aytocobreros@gmail.com...');
        const confirmationSent = await sendConfirmationEmail(testAppointmentData);
        if (confirmationSent) {
            console.log('✅ Correo de confirmación enviado correctamente');
            showNotification('Cita de prueba creada y correo de confirmación enviado a aytocobreros@gmail.com', 'success');
        } else {
            console.log('⚠️ No se pudo enviar el correo de confirmación');
            showNotification('Cita de prueba creada, pero no se pudo enviar el correo de confirmación', 'warning');
        }
    } catch (error) {
        console.error('❌ Error enviando correo de confirmación:', error);
        showNotification('Cita de prueba creada, pero hubo un error al enviar el correo: ' + error.message, 'error');
    }
    
    // Enviar alerta al administrador
    try {
        console.log('📧 Enviando alerta al administrador (aytocobreros@gmail.com)...');
        const alertSent = await sendAdminAlert(testAppointmentData);
        if (alertSent) {
            console.log('✅ Alerta al administrador enviada correctamente');
        } else {
            console.log('⚠️ No se pudo enviar la alerta al administrador');
        }
    } catch (error) {
        console.error('❌ Error enviando alerta al administrador:', error);
    }
    
    // Actualizar UI
    loadAppointmentsList();
    loadAppointmentStats();
    renderAdminCalendar();
    
    console.log('✅ Prueba de cita previa completada. Revisa el correo aytocobreros@gmail.com');
    showNotification('Cita de prueba creada correctamente. Revisa el correo aytocobreros@gmail.com', 'success');
    
    return testAppointment;
}

// Funciones para editar citas previas
function editAppointment(appointmentId) {
    const appointment = appointments.find(a => a.id === appointmentId);
    if (appointment) {
        // Llenar el formulario con los datos actuales
        document.getElementById('editAppointmentId').value = appointment.id;
        document.getElementById('editService').value = appointment.service;
        document.getElementById('editName').value = appointment.name;
        document.getElementById('editDni').value = appointment.dni;
        document.getElementById('editEmail').value = appointment.email;
        document.getElementById('editPhone').value = appointment.phone;
        document.getElementById('editDate').value = appointment.date;
        document.getElementById('editTime').value = appointment.time;
        document.getElementById('editComments').value = appointment.comments || '';
        document.getElementById('editStatus').value = appointment.status;
        
        // Mostrar el modal
        const modal = document.getElementById('editAppointmentModal');
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
}

function closeEditAppointmentModal() {
    const modal = document.getElementById('editAppointmentModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

async function saveEditedAppointment() {
    const form = document.getElementById('editAppointmentForm');
    const formData = new FormData(form);
    const appointmentId = formData.get('id');
    
    // Validar DNI
    const dni = formData.get('dni');
    if (!validateDNI(dni)) {
        showNotification('El DNI introducido no es válido. Verifique el formato (8 números + 1 letra).', 'error');
        return;
    }
    
    // Validar fecha
    const selectedDate = new Date(formData.get('date'));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
        showNotification('La fecha seleccionada no puede ser en el pasado', 'error');
        return;
    }
    
    const appointment = appointments.find(a => a.id === appointmentId);
    if (appointment) {
        const oldStatus = appointment.status;
        
        // Actualizar los datos
        appointment.service = formData.get('service');
        appointment.name = formData.get('name');
        appointment.dni = formData.get('dni');
        appointment.email = formData.get('email');
        appointment.phone = formData.get('phone');
        appointment.date = formData.get('date');
        appointment.time = formData.get('time');
        appointment.comments = formData.get('comments');
        appointment.status = formData.get('status');
        appointment.updatedAt = new Date().toISOString();
        
        saveAppointments();
        loadAppointmentsList();
        loadAppointmentStats();
        
        // Registrar acción en log de auditoría
        if (typeof logAuditAction === 'function') {
            logAuditAction('APPOINTMENT_UPDATED', {
                appointmentId: appointment.id,
                appointmentName: appointment.name,
                oldStatus: oldStatus,
                newStatus: appointment.status,
                appointmentDate: appointment.date,
                appointmentTime: appointment.time
            });
        }
        
        // Si cambió el estado, enviar email de confirmación
        if (oldStatus !== appointment.status) {
            const emailResult = await sendStatusChangeEmail(appointment, oldStatus, appointment.status);
            
            // Registrar intento de email
            if (typeof recordEmailAttempt === 'function') {
                recordEmailAttempt({
                    to: appointment.email,
                    subject: `Actualización de Cita Previa - ${getStatusText(appointment.status)}`,
                    template: 'appointment_status_change'
                }, emailResult || false, emailResult ? null : 'Error desconocido');
            }
        }
        
        closeEditAppointmentModal();
        showNotification('Cita previa actualizada correctamente', 'success');
    }
}
// Función para enviar email de cambio de estado usando Firebase Functions
// Email dedicado: u2389387944@gmail.com
async function sendStatusChangeEmail(appointment, oldStatus, newStatus, alternativeDate = null, reason = '') {
    try {
        const statusText = getStatusText(newStatus);
        const oldStatusText = getStatusText(oldStatus);
        
        // Construir mensaje personalizado
        let message = '';
        if (newStatus === 'cancelled') {
            message = 'Lamentamos informarle que su cita previa ha sido cancelada.';
            if (reason) {
                message += `\n\nMotivo: ${reason}`;
            }
            if (alternativeDate) {
                message += `\n\nLe proponemos una nueva fecha alternativa:\nFecha: ${formatDateForDisplay(alternativeDate.date)}\nHora: ${alternativeDate.time}`;
                message += '\n\nPor favor, confirme si esta nueva fecha le resulta conveniente contactándonos.';
            } else {
                message += '\n\nSi desea reagendar su cita, por favor contacte con nosotros.';
            }
        }
        
        const response = await fetch(`${CLOUD_FUNCTIONS_BASE_URL}/sendEmail`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                to: appointment.email,
                from: 'u2389387944@gmail.com',
                subject: `Actualización de Cita Previa - ${statusText}`,
                template: 'appointment_status_change',
                data: {
                    name: appointment.name,
                    oldStatus: oldStatusText,
                    newStatus: statusText,
                    service: getServiceName(appointment.service),
                    date: formatDate(appointment.date),
                    time: appointment.time,
                    dni: appointment.dni,
                    email: appointment.email,
                    phone: appointment.phone,
                    message: message,
                    alternativeDate: alternativeDate ? formatDateForDisplay(alternativeDate.date) : null,
                    alternativeTime: alternativeDate ? alternativeDate.time : null,
                    reason: reason || null
                }
            })
        });

        const result = await response.json();
        if (result.success) {
            console.log('✅ Email de cambio de estado enviado:', result.messageId);
            
            // Registrar éxito en estadísticas
            if (typeof recordEmailAttempt === 'function') {
                recordEmailAttempt({
                    to: appointment.email,
                    subject: `Actualización de Cita Previa - ${statusText}`,
                    template: 'appointment_status_change'
                }, true);
            }
            
            return true;
        } else {
            console.error('❌ Error al enviar email:', result.error);
            
            // Registrar fallo en estadísticas
            if (typeof recordEmailAttempt === 'function') {
                recordEmailAttempt({
                    to: appointment.email,
                    subject: `Actualización de Cita Previa - ${statusText}`,
                    template: 'appointment_status_change'
                }, false, result.error);
            }
            
            return false;
        }
    } catch (error) {
        console.error('❌ Error al enviar email de cambio de estado:', error);
        
        // Registrar fallo en estadísticas
        if (typeof recordEmailAttempt === 'function') {
            recordEmailAttempt({
                to: appointment.email,
                subject: `Actualización de Cita Previa - ${statusText}`,
                template: 'appointment_status_change'
            }, false, error.message);
        }
        
        return false;
    }
}

// Marcar cita como completada (se realizó)
async function markAppointmentCompleted(appointmentId) {
    const appointment = appointments.find(a => a.id === appointmentId);
    if (!appointment) {
        showNotification('Cita no encontrada', 'error');
        return;
    }
    
    if (typeof showConfirmation === 'function') {
        const confirmed = await showConfirmation(
            '¿Confirmar que la cita se realizó correctamente?',
            `Cita de ${appointment.name} - ${formatDate(appointment.date)} ${appointment.time}`
        );
        if (!confirmed) return;
    } else {
        if (!confirm('¿Confirmar que la cita se realizó correctamente?')) {
            return;
        }
    }
    
    // Registrar acción en log de auditoría
    if (typeof logAuditAction === 'function') {
        logAuditAction('APPOINTMENT_COMPLETED', {
            appointmentId: appointment.id,
            appointmentName: appointment.name,
            appointmentDate: appointment.date,
            appointmentTime: appointment.time
        });
    }
    
    const oldStatus = appointment.status;
    appointment.status = 'completed';
    appointment.completedAt = new Date().toISOString();
    appointment.updatedAt = new Date().toISOString();
    
    saveAppointments();
    loadAppointmentsList();
    loadAppointmentStats();
    if (typeof renderAdminCalendar === 'function') {
        renderAdminCalendar();
    }
    
    showNotification('Cita marcada como completada correctamente', 'success');
}
// Marcar cita como no se presentó (envía email automático)
async function markAppointmentNoShow(appointmentId) {
    const appointment = appointments.find(a => a.id === appointmentId);
    if (!appointment) {
        showNotification('Cita no encontrada', 'error');
        return;
    }
    
    // Validar que la fecha de la cita sea válida y no futura
    const appointmentDate = new Date(appointment.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    appointmentDate.setHours(0, 0, 0, 0);
    
    if (isNaN(appointmentDate.getTime())) {
        showNotification('Error: La fecha de la cita no es válida', 'error');
        return;
    }
    
    if (appointmentDate > today) {
        showNotification('No se puede marcar como "No se presentó" una cita futura', 'error');
        return;
    }
    
    if (typeof showConfirmation === 'function') {
        const confirmed = await showConfirmation(
            '¿Marcar como "No se presentó"?',
            `Se enviará un email automático a ${appointment.email} informando que no se presentó a la cita del ${formatDate(appointment.date)} a las ${appointment.time}.`,
            'warning'
        );
        if (!confirmed) return;
    } else {
        if (!confirm('¿Marcar como "No se presentó"? Se enviará un email automático al usuario.')) {
            return;
        }
    }
    
    const oldStatus = appointment.status;
    appointment.status = 'no_show';
    appointment.noShowAt = new Date().toISOString();
    appointment.updatedAt = new Date().toISOString();
    
    // Registrar acción en log de auditoría
    if (typeof logAuditAction === 'function') {
        logAuditAction('APPOINTMENT_NO_SHOW', {
            appointmentId: appointment.id,
            appointmentName: appointment.name,
            appointmentDate: appointment.date,
            appointmentTime: appointment.time
        });
    }
    
    // Enviar email automático de no presentación
    const emailResult = await sendNoShowEmail(appointment);
    
    // Registrar intento de email
    if (typeof recordEmailAttempt === 'function') {
        recordEmailAttempt({
            to: appointment.email,
            subject: 'No se presentó a su cita previa - Ayuntamiento de Cobreros',
            template: 'appointment_no_show'
        }, emailResult.success, emailResult.error);
    }
    
    saveAppointments();
    loadAppointmentsList();
    loadAppointmentStats();
    if (typeof renderAdminCalendar === 'function') {
        renderAdminCalendar();
    }
    
    // Mostrar mensaje según resultado del email
    if (emailResult.success) {
        showNotification('Cita marcada como "No se presentó". Se ha enviado un email automático al usuario.', 'success');
    } else if (emailResult.queued) {
        showNotification('Cita marcada como "No se presentó". El email se enviará automáticamente cuando sea posible.', 'warning');
    } else {
        showNotification('Cita marcada como "No se presentó". No se pudo enviar el email, pero se intentará más tarde.', 'warning');
    }
}
// Enviar email automático cuando no se presenta a la cita
async function sendNoShowEmail(appointment) {
    // Validar email antes de enviar
    if (!appointment.email || !isValidEmail(appointment.email)) {
        console.error('❌ Email inválido:', appointment.email);
        return { success: false, error: 'Email inválido', queued: false };
    }
    
    const emailData = {
        to: appointment.email,
        from: 'u2389387944@gmail.com',
        subject: 'No se presentó a su cita previa - Ayuntamiento de Cobreros',
        template: 'appointment_no_show',
        data: {
            name: appointment.name,
            service: typeof getServiceName === 'function' ? getServiceName(appointment.service) : appointment.service,
            date: typeof formatDate === 'function' ? formatDate(appointment.date) : appointment.date,
            time: appointment.time,
            dni: appointment.dni,
            email: appointment.email,
            phone: appointment.phone,
            appointmentId: appointment.id
        }
    };
    
    // Usar sistema de cola con reintentos si está disponible
    if (typeof sendEmailWithRetry === 'function') {
        return await sendEmailWithRetry(emailData);
    }
    
    // Fallback: método tradicional
    try {
        const response = await fetch(`${CLOUD_FUNCTIONS_BASE_URL}/sendEmail`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(emailData)
        });

        const result = await response.json();
        if (result.success) {
            console.log('✅ Email de no presentación enviado:', result.messageId);
            
            // Registrar éxito en estadísticas
            if (typeof recordEmailAttempt === 'function') {
                recordEmailAttempt(emailData, true);
            }
            
            return { success: true, messageId: result.messageId };
        } else {
            console.error('❌ Error al enviar email:', result.error);
            
            // Registrar fallo en estadísticas
            if (typeof recordEmailAttempt === 'function') {
                recordEmailAttempt(emailData, false, result.error);
            }
            
            return { success: false, error: result.error, queued: false };
        }
    } catch (error) {
        console.error('❌ Error al enviar email de no presentación:', error);
        
        // Registrar fallo en estadísticas
        if (typeof recordEmailAttempt === 'function') {
            recordEmailAttempt(emailData, false, error.message);
        }
        
        return { success: false, error: error.message, queued: false };
    }
}

// Validar formato de email
function isValidEmail(email) {
    if (!email || typeof email !== 'string') return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Asegurar que las funciones estén disponibles globalmente para onclick handlers
// Esto debe ir DESPUÉS de definir todas las funciones
if (typeof window !== 'undefined') {
    window.markAppointmentCompleted = markAppointmentCompleted;
    window.markAppointmentNoShow = markAppointmentNoShow;
    window.sendNoShowEmail = sendNoShowEmail;
    console.log('✅ Funciones de citas disponibles globalmente');
}

// Configurar modal de edición
function setupEditAppointmentModal() {
    const modal = document.getElementById('editAppointmentModal');
    if (modal) {
        // Cerrar modal al hacer clic fuera de él
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeEditAppointmentModal();
            }
        });
        
        // Cerrar modal con tecla Escape
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && modal.style.display === 'block') {
                closeEditAppointmentModal();
            }
        });
    }
}

// Sistema de avisos para el encargado municipal
function createMunicipalAlert(appointment) {
    const alert = {
        id: Date.now().toString(),
        type: 'new_appointment',
        title: 'Nueva Solicitud de Cita Previa',
        message: `${appointment.name} ha solicitado una cita para ${getServiceName(appointment.service)} el ${formatDate(appointment.date)} a las ${appointment.time}`,
        appointmentId: appointment.id,
        createdAt: new Date().toISOString(),
        read: false,
        priority: 'high'
    };
    
    // Guardar en localStorage
    const existingAlerts = JSON.parse(localStorage.getItem('municipalAlerts') || '[]');
    existingAlerts.push(alert);
    localStorage.setItem('municipalAlerts', JSON.stringify(existingAlerts));
    
    // Actualizar badge de notificación
    updateMunicipalNotificationBadge();
    
    // Reproducir sonido de alerta
    playAlertSound();
    
    // Mostrar notificación del sistema si está disponible
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Nueva Solicitud de Cita', {
            body: alert.message,
            icon: 'images/escudo-cobreros.png',
            tag: 'new-appointment'
        });
    }
    
    console.log('Alerta municipal creada:', alert);
}

function updateMunicipalNotificationBadge() {
    const alerts = JSON.parse(localStorage.getItem('municipalAlerts') || '[]');
    const unreadAlerts = alerts.filter(alert => !alert.read);
    const badge = document.getElementById('municipalNotificationBadge');
    
    if (badge) {
        if (unreadAlerts.length > 0) {
            badge.textContent = unreadAlerts.length;
            badge.style.display = 'block';
            badge.style.animation = 'pulse 1s infinite';
        } else {
            badge.style.display = 'none';
        }
    }
}

function playAlertSound() {
    // Crear un sonido de alerta simple usando Web Audio API
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
        console.log('No se pudo reproducir el sonido de alerta:', error);
    }
}

function loadMunicipalAlerts() {
    const alerts = JSON.parse(localStorage.getItem('municipalAlerts') || '[]');
    return alerts;
}

function markAlertAsRead(alertId) {
    const alerts = loadMunicipalAlerts();
    const alert = alerts.find(a => a.id === alertId);
    if (alert) {
        alert.read = true;
        localStorage.setItem('municipalAlerts', JSON.stringify(alerts));
        updateMunicipalNotificationBadge();
    }
}

function clearAllAlerts() {
    localStorage.removeItem('municipalAlerts');
    updateMunicipalNotificationBadge();
    loadMunicipalAlertsList();
    showNotification('Todas las alertas han sido eliminadas', 'success');
}

function loadMunicipalAlertsList() {
    const alertsList = document.getElementById('municipalAlertsList');
    const alertsCount = document.getElementById('alertsCount');
    
    if (!alertsList) return;
    
    const alerts = loadMunicipalAlerts();
    const unreadAlerts = alerts.filter(alert => !alert.read);
    
    // Actualizar contador
    if (alertsCount) {
        alertsCount.textContent = `${unreadAlerts.length} alerta${unreadAlerts.length !== 1 ? 's' : ''} pendiente${unreadAlerts.length !== 1 ? 's' : ''}`;
    }
    
    if (alerts.length === 0) {
        alertsList.innerHTML = '<div class="no-data" style="padding: 2rem; text-align: center; color: var(--text-secondary);">No hay alertas pendientes</div>';
        return;
    }
    
    // Ordenar alertas por fecha (más recientes primero)
    const sortedAlerts = alerts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    alertsList.innerHTML = sortedAlerts.map(alert => `
        <div class="alert-item ${alert.read ? '' : 'unread'}" data-alert-id="${alert.id}">
            <div class="alert-header">
                <div>
                    <div class="alert-title">${alert.title}</div>
                    <div class="alert-time">${formatDateTime(alert.createdAt)}</div>
                </div>
                ${!alert.read ? '<span class="badge badge-warning">NUEVO</span>' : ''}
            </div>
            <div class="alert-message">${alert.message}</div>
            <div class="alert-actions">
                ${!alert.read ? `
                    <button class="btn btn-primary btn-sm" onclick="markAlertAsRead('${alert.id}')">
                        <i class="fas fa-check"></i> Marcar como Leído
                    </button>
                ` : ''}
                <button class="btn btn-outline btn-sm" onclick="viewAppointmentFromAlert('${alert.appointmentId}')">
                    <i class="fas fa-eye"></i> Ver Cita
                </button>
                <button class="btn btn-danger btn-sm" onclick="deleteAlert('${alert.id}')">
                    <i class="fas fa-trash"></i> Eliminar
                </button>
            </div>
        </div>
    `).join('');
}

function viewAppointmentFromAlert(appointmentId) {
    // Buscar la cita y mostrar sus detalles
    const appointment = appointments.find(a => a.id === appointmentId);
    if (appointment) {
        viewAppointmentDetails(appointmentId);
    } else {
        showNotification('No se encontró la cita asociada a esta alerta', 'error');
    }
}

function deleteAlert(alertId) {
    if (confirm('¿Está seguro de que desea eliminar esta alerta?')) {
        const alerts = loadMunicipalAlerts();
        const filteredAlerts = alerts.filter(alert => alert.id !== alertId);
        localStorage.setItem('municipalAlerts', JSON.stringify(filteredAlerts));
        
        updateMunicipalNotificationBadge();
        loadMunicipalAlertsList();
        showNotification('Alerta eliminada', 'success');
    }
}

// Funciones para gestión de notificaciones públicas
function loadPublicNotifications() {
    const savedNotifications = localStorage.getItem('publicNotifications');
    if (savedNotifications) {
        publicNotifications = JSON.parse(savedNotifications);
    }
    updatePublicNotificationsScroll();
}

function savePublicNotifications() {
    localStorage.setItem('publicNotifications', JSON.stringify(publicNotifications));
}

function updatePublicNotificationsScroll() {
    const scrollContent = document.getElementById('scrollContent');
    if (!scrollContent) return;
    
    const today = new Date();
    const activeNotifications = publicNotifications.filter(notification => {
        if (!notification.active) return false;
        
        const startDate = new Date(notification.startDate);
        const endDate = notification.endDate ? new Date(notification.endDate) : null;
        
        return startDate <= today && (!endDate || endDate >= today);
    });
    
    if (activeNotifications.length === 0) {
        scrollContent.innerHTML = '<div class="scroll-item">No hay avisos activos</div>';
        return;
    }
    
    // Ordenar por prioridad
    const priorityOrder = { urgent: 4, emergency: 5, high: 3, medium: 2, low: 1 };
    activeNotifications.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);
    
    scrollContent.innerHTML = activeNotifications.map(notification => {
        const typeEmoji = {
            info: 'ℹ️',
            warning: '⚠️',
            closure: '🚫',
            schedule: '🕒',
            event: '🎉',
            emergency: '🚨'
        };
        
        const emoji = typeEmoji[notification.type] || 'ℹ️';
        const priorityClass = notification.priority === 'urgent' ? 'urgent' : 
                             notification.priority === 'emergency' ? 'emergency' : '';
        
        return `<div class="scroll-item ${priorityClass}">${emoji} ${notification.title} - ${notification.message}</div>`;
    }).join('');
}

function loadPublicNotificationsList() {
    const notificationsList = document.getElementById('publicNotificationsList');
    if (!notificationsList) return;
    
    if (publicNotifications.length === 0) {
        notificationsList.innerHTML = '<div class="no-data" style="padding: 2rem; text-align: center; color: var(--text-secondary);">No hay avisos públicos creados</div>';
        return;
    }
    
    const sortedNotifications = publicNotifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    notificationsList.innerHTML = sortedNotifications.map(notification => {
        const typeEmoji = {
            info: 'ℹ️',
            warning: '⚠️',
            closure: '🚫',
            schedule: '🕒',
            event: '🎉',
            emergency: '🚨'
        };
        
        const emoji = typeEmoji[notification.type] || 'ℹ️';
        const statusIcon = notification.active ? '🟢' : '🔴';
        const statusText = notification.active ? 'Activa' : 'Inactiva';
        
        return `
            <div class="notification-item">
                <div class="notification-header">
                    <div>
                        <div class="notification-title">${emoji} ${notification.title}</div>
                        <div class="notification-dates">
                            Desde: ${formatDate(notification.startDate)} 
                            ${notification.endDate ? `Hasta: ${formatDate(notification.endDate)}` : '(Sin fecha de fin)'}
                        </div>
                    </div>
                    <div>
                        <span class="notification-type ${notification.type}">${notification.type}</span>
                        <span class="notification-status ${notification.active ? 'status-active' : 'status-inactive'}">
                            ${statusIcon} ${statusText}
                        </span>
                    </div>
                </div>
                <div class="notification-message">${notification.message}</div>
                <div class="notification-actions">
                    <button class="btn btn-primary" onclick="editPublicNotification('${notification.id}')">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn ${notification.active ? 'btn-warning' : 'btn-success'}" onclick="toggleNotificationStatus('${notification.id}')">
                        <i class="fas fa-${notification.active ? 'pause' : 'play'}"></i> 
                        ${notification.active ? 'Desactivar' : 'Activar'}
                    </button>
                    <button class="btn btn-danger" onclick="deletePublicNotification('${notification.id}')">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function openNotificationEditor(notificationId = null) {
    const modal = document.getElementById('publicNotificationModal');
    const modalTitle = document.getElementById('notificationModalTitle');
    const form = document.getElementById('publicNotificationForm');
    
    if (notificationId) {
        // Editar notificación existente
        const notification = publicNotifications.find(n => n.id === notificationId);
        if (notification) {
            modalTitle.textContent = 'Editar aviso público';
            document.getElementById('notificationId').value = notification.id;
            document.getElementById('notificationType').value = notification.type;
            document.getElementById('notificationTitle').value = notification.title;
            document.getElementById('notificationMessage').value = notification.message;
            document.getElementById('notificationStartDate').value = notification.startDate;
            document.getElementById('notificationEndDate').value = notification.endDate || '';
            document.getElementById('notificationPriority').value = notification.priority;
            document.getElementById('notificationActive').checked = notification.active;
        }
    } else {
        // Nueva notificación
        modalTitle.textContent = 'Nuevo aviso público';
        form.reset();
        document.getElementById('notificationId').value = '';
        document.getElementById('notificationStartDate').value = new Date().toISOString().split('T')[0];
    }
    
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closePublicNotificationModal() {
    const modal = document.getElementById('publicNotificationModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}
function savePublicNotification() {
    const form = document.getElementById('publicNotificationForm');
    const formData = new FormData(form);
    const notificationId = formData.get('id');
    
    const notification = {
        id: notificationId || Date.now().toString(),
        type: formData.get('type'),
        title: formData.get('title'),
        message: formData.get('message'),
        startDate: formData.get('startDate'),
        endDate: formData.get('endDate') || null,
        priority: formData.get('priority'),
        active: formData.get('active') === 'on',
        createdAt: notificationId ? publicNotifications.find(n => n.id === notificationId)?.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    if (notificationId) {
        // Actualizar notificación existente
        const index = publicNotifications.findIndex(n => n.id === notificationId);
        if (index !== -1) {
            publicNotifications[index] = notification;
        }
    } else {
        // Crear nueva notificación
        publicNotifications.push(notification);
    }
    
    savePublicNotifications();
    updatePublicNotificationsScroll();
    loadPublicNotificationsList();
    closePublicNotificationModal();
    
    showNotification(`Aviso ${notificationId ? 'actualizado' : 'creado'} correctamente`, 'success');
}

function editPublicNotification(notificationId) {
    openNotificationEditor(notificationId);
}

function toggleNotificationStatus(notificationId) {
    const notification = publicNotifications.find(n => n.id === notificationId);
    if (notification) {
        notification.active = !notification.active;
        notification.updatedAt = new Date().toISOString();
        
        savePublicNotifications();
        updatePublicNotificationsScroll();
        loadPublicNotificationsList();
        
        showNotification(`Aviso ${notification.active ? 'activado' : 'desactivado'}`, 'success');
    }
}

function deletePublicNotification(notificationId) {
    if (confirm('¿Está seguro de que desea eliminar esta notificación?')) {
        publicNotifications = publicNotifications.filter(n => n.id !== notificationId);
        savePublicNotifications();
        updatePublicNotificationsScroll();
        loadPublicNotificationsList();
        showNotification('Aviso eliminado', 'success');
    }
}

function refreshPublicNotifications() {
    loadPublicNotifications();
    loadPublicNotificationsList();
    showNotification('Avisos actualizados', 'success');
}

// Configurar modal de notificaciones públicas
function setupPublicNotificationModal() {
    const modal = document.getElementById('publicNotificationModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closePublicNotificationModal();
            }
        });
        
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && modal.style.display === 'block') {
                closePublicNotificationModal();
            }
        });
    }
}

// Agregar estilos CSS para toast
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            opacity: 0;
            transform: translateX(100%);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
    
    .badge {
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        font-size: 0.75rem;
        font-weight: 500;
    }
    
    .badge-success {
        background-color: #d1fae5;
        color: #065f46;
    }
    
    .badge-warning {
        background-color: #fef3c7;
        color: #92400e;
    }
    
    .main-nav.mobile-open {
        display: block;
    }
    
    @media (max-width: 768px) {
        .main-nav {
            display: none;
        }
    }
`;
document.head.appendChild(style); 

// ===== FUNCIONES DE AUTENTICACIÓN =====

// Función de login
function login() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    if (!email || !password) {
        alert('Por favor, complete todos los campos.');
        return;
    }
    
    // Verificar super administrador
    if (email === SUPER_ADMIN.email && password === SUPER_ADMIN.password) {
        currentUser = SUPER_ADMIN;
        isAdmin = true;
        isSuperAdmin = true;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        localStorage.setItem('isAdmin', 'true');
        localStorage.setItem('isSuperAdmin', 'true');
        updateUserInterface();
        closeModal('loginModal');
        showNotification('Sesión de administrador iniciada correctamente', 'success');
        return;
    }
    
    // Verificar usuarios normales
    const user = users.find(u => u.email === email && u.password === password);
    if (user) {
        currentUser = user;
        isAdmin = user.isAdmin || false;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        localStorage.setItem('isAdmin', isAdmin.toString());
        updateUserInterface();
        closeModal('loginModal');
        showNotification('Inicio de sesión exitoso', 'success');
    } else {
        alert('Credenciales incorrectas.');
    }
}

// Función de registro
async function register() {
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const phone = document.getElementById('regPhone').value;
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regPasswordConfirm').value;
    const consent = document.getElementById('consent').checked;
    const notificationConsent = document.getElementById('notificationConsent').checked;
    
    // Obtener localidades seleccionadas
    const selectedLocalities = [];
    const localityCheckboxes = document.querySelectorAll('input[name="localities"]:checked');
    localityCheckboxes.forEach(checkbox => {
        selectedLocalities.push(checkbox.value);
    });
    
    if (!name || !email || !phone || !password || !confirmPassword) {
        alert('Por favor, complete todos los campos.');
        return;
    }
    
    if (password !== confirmPassword) {
        alert('Las contraseñas no coinciden.');
        return;
    }
    
    if (!consent) {
        alert('Debe aceptar el tratamiento de datos personales.');
        return;
    }
    
    if (users.find(u => u.email === email)) {
        alert('Ya existe un usuario con este email.');
        return;
    }
    
    // Obtener token FCM si el usuario da consentimiento para notificaciones
    let fcmToken = null;
    if (notificationConsent) {
        try {
            // Solicitar permiso para notificaciones
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                // Obtener token FCM
                if (window.getFCMToken) {
                    fcmToken = await window.getFCMToken();
                }
            }
        } catch (error) {
            console.error('Error obteniendo token FCM:', error);
        }
    }
    
    const newUser = {
        id: Date.now(),
        name,
        email,
        phone,
        password,
        consent,
        notificationConsent,
        fcmToken,
        localities: selectedLocalities,
        isAdmin: false,
        registrationDate: new Date().toISOString()
    };
    
    users.push(newUser);
    localStorage.setItem('users', JSON.stringify(users));
    closeModal('registerModal');
    showNotification('Registro completado correctamente', 'success');
    
    // Si dio consentimiento para notificaciones, mostrar mensaje
    if (notificationConsent && fcmToken) {
        showNotification('Avisos push activados correctamente', 'success');
    }
}

// Función de logout
function logout() {
    currentUser = null;
    isAdmin = false;
    isSuperAdmin = false;
    localStorage.removeItem('currentUser');
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('isSuperAdmin');
    localStorage.removeItem('rememberUserSession');
    selectedUserNotifications.clear();
    selectedReceivedNotifications.clear();
    updateUserNotificationsActions();
    updateReceivedNotificationsActions();
    
    // Cerrar panel de administración si está abierto
    const adminModal = document.getElementById('adminModal');
    if (adminModal && adminModal.style.display === 'block') {
        adminModal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
    
    updateUserInterface();
    showNotification('Sesión cerrada correctamente', 'success');
    
    // Refrescar la página después de un breve delay para mostrar la notificación
    setTimeout(() => {
        window.location.reload();
    }, 1500);
}
// Abrir panel de administración - CON VERIFICACIÓN DE SEGURIDAD
function openAdminPanel() {
    // Verificar que hay sesión válida antes de abrir
    if (!isAdmin || !currentUser) {
        showNotification('⚠️ Acceso denegado: Debe iniciar sesión como administrador', 'error');
        // Cerrar panel si está abierto
        const adminModal = document.getElementById('adminModal');
        if (adminModal) {
            adminModal.style.display = 'none';
        }
        // Abrir modal de login de admin
        openModal('adminLoginModal');
        return;
    }
    
    // Verificar que el usuario actual es realmente admin
    const savedUser = localStorage.getItem('currentUser');
    const savedAdmin = localStorage.getItem('isAdmin');
    
    if (!savedUser || savedAdmin !== 'true') {
        showNotification('⚠️ Sesión inválida: Por favor inicie sesión nuevamente', 'error');
        // Limpiar sesión inválida
        currentUser = null;
        isAdmin = false;
        localStorage.removeItem('currentUser');
        localStorage.removeItem('isAdmin');
        updateUserInterface();
        openModal('adminLoginModal');
        return;
    }
    
    // Sesión válida, abrir panel
    document.getElementById('adminModal').style.display = 'block';
    loadUsersList();
    loadAdminsList();
    loadNewsList();
    loadBandoList();
    loadEventsList();
    loadQuickAccessList();
    loadDocumentsList();
    loadNotificationsHistory();
    loadSystemStats();
    loadAppointmentSettings();
    loadAppointmentScheduleConfigUI(); // Cargar configuración de horarios
    loadPublicNotificationsList();
    loadCarnetRequestsAdmin();
    loadCotoRequestsAdmin();
    populateCarnetAdminForm();
    
    // Renderizar calendario del admin después de un breve delay para asegurar que el DOM esté listo
    setTimeout(() => {
        renderAdminCalendar();
    }, 300);
}

// Cerrar panel de administración
function closeAdminPanel() {
    document.getElementById('adminModal').style.display = 'none';
}

// ===== SERVICIOS SIMPLES =====

let servicios = {
    medical: [],
    itv: []
};
// Configuración de teléfonos de interés
let telefonosInteresConfig = {
    titulo: 'TELÉFONOS DE INTERÉS',
    icono: '📞',
    descripcion: 'Servicios importantes de la zona',
    tarjeta: {
        nombre: 'Servicios',
        emoji: '📞',
        descripcion: 'Información y contactos de servicios locales',
        elementos: [
            {
                id: 1,
                nombre: 'Taxis',
                emoji: '🚕',
                descripcion: 'Servicio de taxis locales',
                tipo: 'telefonos',
                datos: [
                    { nombre: 'Taxi Cobreros', telefono: '980 62 26 18' },
                    { nombre: 'Taxi Sanabria', telefono: '980 62 26 19' },
                    { nombre: 'Taxi Express', telefono: '980 62 26 20' }
                ],
                documento: null,
                foto: null,
                orden: 1,
                isActive: true
            },
            {
                id: 2,
                nombre: 'ITV',
                emoji: '🚗',
                descripcion: 'Inspección Técnica de Vehículos',
                tipo: 'servicio',
                datos: [
                    { nombre: 'Dirección', valor: 'Carretera N-525, km 12' },
                    { nombre: 'Teléfono', valor: '980 62 26 21' },
                    { nombre: 'Horario', valor: 'L-V: 8:00-18:00, S: 8:00-14:00' }
                ],
                documento: null,
                foto: null,
                orden: 2,
                isActive: true
            },
            {
                id: 3,
                nombre: 'Renovación DNI',
                emoji: '🆔',
                descripcion: 'Gestión de documentación',
                tipo: 'documento',
                datos: [
                    { nombre: 'Teléfono', valor: '980 62 26 18' },
                    { nombre: 'Horario', valor: 'L-V: 9:00-14:00' }
                ],
                documento: 'https://ejemplo.com/renovacion-dni.pdf',
                foto: null,
                orden: 3,
                isActive: true
            }
        ]
    }
};

// Configuración de las secciones (títulos e iconos editables)
let seccionesConfig = {
    medical: {
        title: 'CONSULTORIO MÉDICO',
        icon: '🏥',
        description: 'Horarios y información del consultorio médico'
    },
    itv: {
        title: 'ITV',
        icon: '🚗',
        description: 'Inspección técnica de vehículos'
    },
    telefonosInteres: {
        title: 'TELÉFONOS DE INTERÉS',
        icon: '📞',
        description: 'Servicios importantes de la zona',
        isActive: true
    },
    transporte: {
        title: 'LÍNEAS DE AUTOBÚS Y TREN',
        icon: '🚌',
        description: 'Horarios y rutas de transporte público',
        isActive: true
    }
};

// Configuración de líneas de transporte
let transporteConfig = {
    titulo: 'LÍNEAS DE AUTOBÚS Y TREN',
    icono: '🚌',
    descripcion: 'Horarios y rutas de transporte público',
    lineas: []
};

// Cargar configuración de secciones
function loadSeccionesConfig() {
    const saved = localStorage.getItem('seccionesConfig');
    if (saved) {
        seccionesConfig = JSON.parse(saved);
    }
}

// Cargar configuración de teléfonos de interés
function loadTelefonosInteresConfig() {
    const saved = localStorage.getItem('telefonosInteresConfig');
    if (saved) {
        telefonosInteresConfig = JSON.parse(saved);
    }
}

// Cargar configuración de transporte
function loadTransporteConfig() {
    const saved = localStorage.getItem('transporteConfig');
    if (saved) {
        transporteConfig = JSON.parse(saved);
    }
}

// Guardar configuración de teléfonos de interés
function saveTelefonosInteresConfig() {
    localStorage.setItem('telefonosInteresConfig', JSON.stringify(telefonosInteresConfig));
}

// Guardar configuración de transporte
function saveTransporteConfig() {
    localStorage.setItem('transporteConfig', JSON.stringify(transporteConfig));
}

// Cargar servicios
function loadServicios() {
    const saved = localStorage.getItem('servicios');
    if (saved) {
        servicios = JSON.parse(saved);
    } else {
        // Datos de ejemplo
        servicios = {
            medical: [
                {
                    id: 1,
                    name: 'Centro de Salud de Cobreros',
                    day: 'Lunes a Viernes',
                    time: '08:00-15:00',
                    location: 'Centro de Salud',
                    phone: '980 62 26 18',
                    description: 'Consultas médicas generales',
                    photo: null
                }
            ],
            itv: [
                {
                    id: 1,
                    name: 'Estación ITV Puebla de Sanabria',
                    day: 'Lunes a Viernes',
                    time: '08:00-18:00',
                    location: 'Puebla de Sanabria',
                    phone: '980 62 00 00',
                    description: 'Inspección técnica de vehículos',
                    photo: null
                }
            ],
        };
        saveServicios();
    }
    loadSeccionesConfig();
    renderServicios();
}

// Guardar configuración de secciones
function saveSeccionesConfig() {
    localStorage.setItem('seccionesConfig', JSON.stringify(seccionesConfig));
}

// Guardar servicios
function saveServicios() {
    localStorage.setItem('servicios', JSON.stringify(servicios));
}

// Configuración del consultorio médico
let consultorioConfig = {
    documentos: [],
    fotos: []
};

// Cargar configuración del consultorio
function loadConsultorioConfig() {
    const saved = localStorage.getItem('consultorioConfig');
    if (saved) {
        consultorioConfig = JSON.parse(saved);
    }
}

// Guardar configuración del consultorio
function saveConsultorioConfig() {
    localStorage.setItem('consultorioConfig', JSON.stringify(consultorioConfig));
}

// Funciones para el consultorio
function viewConsultorioDocument() {
    if (consultorioConfig.documentos.length > 0) {
        // Mostrar el primer documento disponible
        window.open(consultorioConfig.documentos[0].url, '_blank');
    } else {
        alert('No hay documentos disponibles. Contacte con el administrador.');
    }
}

function viewConsultorioPhoto() {
    if (consultorioConfig.fotos.length > 0) {
        // Mostrar la primera foto disponible
        window.open(consultorioConfig.fotos[0].url, '_blank');
    } else {
        alert('No hay fotos disponibles. Contacte con el administrador.');
    }
}

// Funciones para ITV - PUEBLA DE SANABRIA
function viewItvDocument() {
    if (consultorioConfig.documentos.length > 0) {
        // Mostrar el primer documento disponible
        window.open(consultorioConfig.documentos[0].url, '_blank');
    } else {
        alert('No hay documentos disponibles. Contacte con el administrador.');
    }
}

function viewItvPhoto() {
    if (consultorioConfig.fotos.length > 0) {
        // Mostrar la primera foto disponible
        window.open(consultorioConfig.fotos[0].url, '_blank');
    } else {
        alert('No hay fotos disponibles. Contacte con el administrador.');
    }
}

// Funciones para gestionar los modales del consultorio

function editConsultorioDocumentos() {
    loadConsultorioDocumentosInModal();
    document.getElementById('consultorioDocumentosModal').style.display = 'block';
}

function closeConsultorioDocumentosModal() {
    document.getElementById('consultorioDocumentosModal').style.display = 'none';
}

function editConsultorioFotos() {
    loadConsultorioFotosInModal();
    document.getElementById('consultorioFotosModal').style.display = 'block';
}

function closeConsultorioFotosModal() {
    document.getElementById('consultorioFotosModal').style.display = 'none';
}


// Cargar documentos en el modal
function loadConsultorioDocumentosInModal() {
    const container = document.getElementById('consultorioDocumentosList');
    if (consultorioConfig.documentos.length === 0) {
        container.innerHTML = '<p>No hay documentos subidos.</p>';
        return;
    }
    
    let html = '<div class="documentos-grid">';
    consultorioConfig.documentos.forEach((doc, index) => {
        html += `
            <div class="documento-item">
                <h5>${doc.titulo}</h5>
                <p><strong>Archivo:</strong> ${doc.nombreArchivo}</p>
                <div class="documento-actions">
                    <button class="btn btn-outline btn-sm" onclick="window.open('${doc.url}', '_blank')">Ver</button>
                    <button class="btn btn-error btn-sm" onclick="deleteConsultorioDocument(${index})">Eliminar</button>
                </div>
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
}

// Cargar fotos en el modal
function loadConsultorioFotosInModal() {
    const container = document.getElementById('consultorioFotosList');
    if (consultorioConfig.fotos.length === 0) {
        container.innerHTML = '<p>No hay fotos subidas.</p>';
        return;
    }
    
    let html = '<div class="fotos-grid">';
    consultorioConfig.fotos.forEach((foto, index) => {
        html += `
            <div class="foto-item">
                <h5>${foto.titulo}</h5>
                <img src="${foto.url}" alt="${foto.titulo}" style="max-width: 200px; height: auto; margin: 10px 0;">
                <div class="foto-actions">
                    <button class="btn btn-outline btn-sm" onclick="window.open('${foto.url}', '_blank')">Ver</button>
                    <button class="btn btn-error btn-sm" onclick="deleteConsultorioFoto(${index})">Eliminar</button>
                </div>
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
}
// Eliminar documento del consultorio
function deleteConsultorioDocument(index) {
    if (confirm('¿Estás seguro de que quieres eliminar este documento?')) {
        consultorioConfig.documentos.splice(index, 1);
        saveConsultorioConfig();
        loadConsultorioDocumentosInModal();
        renderServicios();
    }
}

// Eliminar foto del consultorio
function deleteConsultorioFoto(index) {
    if (confirm('¿Estás seguro de que quieres eliminar esta foto?')) {
        consultorioConfig.fotos.splice(index, 1);
        saveConsultorioConfig();
        loadConsultorioFotosInModal();
        renderServicios();
    }
}


// Renderizar servicios en la página
function renderServicios() {
    const container = document.getElementById('serviciosContent');
    if (!container) return;
    
    let html = '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem;">';
    
    // CONSULTORIO MÉDICO
    html += `<div class="admin-section"><h3>${seccionesConfig.medical.icon} ${seccionesConfig.medical.title}</h3>`;
    html += '<div class="consultorio-simple">';
    
    if (consultorioConfig.documentos.length > 0 || consultorioConfig.fotos.length > 0) {
        html += '<div class="consultorio-enlaces">';
        
        if (consultorioConfig.documentos.length > 0) {
            html += `<a href="#" class="btn btn-outline" onclick="viewConsultorioDocument()">📋 Ver Documento</a>`;
        }
        
        if (consultorioConfig.fotos.length > 0) {
            html += `<a href="#" class="btn btn-outline" onclick="viewConsultorioPhoto()">📸 Ver Foto</a>`;
        }
        
    html += '</div>';
    } else {
        html += '<p class="no-content">No hay contenido disponible</p>';
    }
    
    html += '</div>';
    html += '</div>';
    
    // ITV - PUEBLA DE SANABRIA
    html += `<div class="admin-section"><h3>${seccionesConfig.itv.icon} ${seccionesConfig.itv.title}</h3>`;
    html += '<div class="itv-puebla">';
    html += '<h4>🏘️ PUEBLA DE SANABRIA</h4>';
    
    if (consultorioConfig.documentos.length > 0 || consultorioConfig.fotos.length > 0) {
        html += '<div class="itv-enlaces">';
        
        if (consultorioConfig.documentos.length > 0) {
            html += `<a href="#" class="btn btn-outline" onclick="viewItvDocument()">📋 Ver Documento</a>`;
        }
        
        if (consultorioConfig.fotos.length > 0) {
            html += `<a href="#" class="btn btn-outline" onclick="viewItvPhoto()">📸 Ver Foto</a>`;
        }
        
    html += '</div>';
    } else {
        html += '<p class="no-content">No hay contenido disponible</p>';
    }
    
    html += '</div>';
    html += '</div>';
    
    
    // Teléfonos de Interés
    html += `<div class="admin-section"><h3>${telefonosInteresConfig.icono} ${telefonosInteresConfig.titulo}</h3>`;
    html += '<div class="telefonos-interes-container">';
    html += `<p>${telefonosInteresConfig.descripcion}</p>`;
    
    // Tarjeta principal expandible
    html += `
        <div class="telefono-tarjeta-principal" onclick="toggleTelefonoExpansion()">
            <div class="telefono-tarjeta-header">
                <span class="telefono-emoji">${telefonosInteresConfig.tarjeta.emoji}</span>
                <div class="telefono-details">
                    <h4>${telefonosInteresConfig.tarjeta.nombre}</h4>
                    <p>${telefonosInteresConfig.tarjeta.descripcion}</p>
                </div>
                <span class="telefono-expand-icon" id="telefonoExpandIcon">▼</span>
            </div>
        </div>
    `;
    
    // Contenido expandible
    html += '<div class="telefonos-dropdown-content" id="telefonosDropdownContent" style="display: none;">';
    
    telefonosInteresConfig.tarjeta.elementos
        .filter(elemento => elemento.isActive)
        .sort((a, b) => a.orden - b.orden)
        .forEach(elemento => {
            html += `
                <div class="telefono-elemento" onclick="toggleElementoExpansion(${elemento.id})">
                    <div class="telefono-elemento-header">
                        <span class="telefono-emoji">${elemento.emoji}</span>
                        <div class="telefono-details">
                            <h4>${elemento.nombre}</h4>
                            <p>${elemento.descripcion}</p>
                        </div>
                        <span class="telefono-expand-icon" id="elementoExpandIcon${elemento.id}">▼</span>
                    </div>
                    <div class="telefono-elemento-content" id="elementoContent${elemento.id}" style="display: none;">
                        ${renderTelefonoElementoContent(elemento)}
                    </div>
                </div>
            `;
        });
    
    html += '</div>';
    html += '</div>';
    html += '</div>';
    
    // LÍNEAS DE AUTOBÚS Y TREN
    html += `<div class="admin-section"><h3>${seccionesConfig.transporte.icon} ${seccionesConfig.transporte.title}</h3>`;
    html += '<div class="transporte-lines">';
    
    if (transporteConfig.lineas.length > 0) {
        html += '<div class="transporte-lines-list">';
        
        transporteConfig.lineas
            .filter(linea => linea.isActive)
            .sort((a, b) => a.orden - b.orden)
            .forEach(linea => {
                html += `
                    <div class="transporte-linea" onclick="toggleLineaExpansion(${linea.id})">
                        <div class="transporte-linea-header">
                            <span class="transporte-emoji">${linea.emoji}</span>
                            <div class="transporte-details">
                                <h4>${linea.nombre}</h4>
                                <p>${linea.descripcion}</p>
                            </div>
                            <span class="transporte-expand-icon" id="lineaExpandIcon${linea.id}">▼</span>
                        </div>
                        <div class="transporte-linea-content" id="lineaContent${linea.id}" style="display: none;">
                            ${renderTransporteLineaContent(linea)}
                        </div>
                    </div>
                `;
            });
        
        html += '</div>';
    } else {
        html += '<p class="no-content">No hay líneas de transporte configuradas</p>';
    }
    
    html += '</div>';
    html += '</div>';
    
    html += '</div>';
    container.innerHTML = html;
}

// Crear tarjeta de servicio
function createServicioCard(servicio, type) {
    return `
        <div style="background: var(--bg-secondary); padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
            <div style="display: flex; align-items: center; margin-bottom: 1rem;">
                <div style="margin-right: 1rem;">
                    ${servicio.logo ? `<img src="${servicio.logo}" alt="Logo" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;">` : `<div style="width: 50px; height: 50px; background: var(--primary-color); border-radius: 4px; display: flex; align-items: center; justify-content: center; color: white; font-size: 24px;">${type === 'medical' ? '🏥' : type === 'itv' ? '🚗' : '📞'}</div>`}
                </div>
                <h4 style="margin: 0;">${servicio.name}</h4>
            </div>
            ${servicio.photo ? `<img src="${servicio.photo}" style="width: 100%; height: 150px; object-fit: cover; border-radius: 4px; margin-bottom: 1rem;" onclick="viewPhoto('${servicio.photo}')">` : ''}
            <p><strong>Día:</strong> ${servicio.day || 'No especificado'}</p>
            <p><strong>Horario:</strong> ${servicio.time || 'No especificado'}</p>
            <p><strong>Lugar:</strong> ${servicio.location || 'No especificado'}</p>
            <p><strong>Teléfono:</strong> <a href="tel:${servicio.phone}">${servicio.phone}</a></p>
            ${servicio.link ? `<p><strong>Web:</strong> <a href="${servicio.link}" target="_blank" style="color: var(--primary-color);">Ver más información</a></p>` : ''}
            ${servicio.description ? `<p><strong>Descripción:</strong> ${servicio.description}</p>` : ''}
        </div>
    `;
}

// Funciones para manejar la expansión de teléfonos
function toggleTelefonoExpansion() {
    const content = document.getElementById('telefonosDropdownContent');
    const icon = document.getElementById('telefonoExpandIcon');
    
    if (content.style.display === 'none') {
        content.style.display = 'block';
        icon.textContent = '▲';
    } else {
        content.style.display = 'none';
        icon.textContent = '▼';
    }
}

// Funciones para manejar la expansión de líneas de transporte
function toggleLineaExpansion(lineaId) {
    const content = document.getElementById(`lineaContent${lineaId}`);
    const icon = document.getElementById(`lineaExpandIcon${lineaId}`);
    
    if (content.style.display === 'none') {
        content.style.display = 'block';
        icon.textContent = '▲';
    } else {
        content.style.display = 'none';
        icon.textContent = '▼';
    }
}

// Renderizar contenido de línea de transporte
function renderTransporteLineaContent(linea) {
    let html = '<div class="transporte-linea-info">';
    
    // Información básica
    if (linea.horarios && linea.horarios.length > 0) {
        html += '<div class="transporte-section"><h5>🕐 Horarios</h5>';
        linea.horarios.forEach(horario => {
            html += `<p><strong>${horario.dia}:</strong> ${horario.hora}</p>`;
        });
        html += '</div>';
    }
    
    if (linea.rutas && linea.rutas.length > 0) {
        html += '<div class="transporte-section"><h5>🗺️ Rutas</h5>';
        linea.rutas.forEach(ruta => {
            html += `<p><strong>${ruta.origen}</strong> → <strong>${ruta.destino}</strong></p>`;
        });
        html += '</div>';
    }
    
    if (linea.contacto) {
        html += '<div class="transporte-section"><h5>📞 Contacto</h5>';
        html += `<p><strong>Teléfono:</strong> <a href="tel:${linea.contacto.telefono}">${linea.contacto.telefono}</a></p>`;
        if (linea.contacto.web) {
            html += `<p><strong>Web:</strong> <a href="${linea.contacto.web}" target="_blank">${linea.contacto.web}</a></p>`;
        }
        html += '</div>';
    }
    
    // Documentos y fotos
    html += '<div class="transporte-section"><h5>📄 Documentos</h5>';
    if (linea.documentos && linea.documentos.length > 0) {
        linea.documentos.forEach((doc, index) => {
            html += `<div class="documento-item">
                <a href="${doc.url}" target="_blank" class="btn btn-outline btn-small">
                    <i class="fas fa-file-pdf"></i> ${doc.nombre}
                </a>
            </div>`;
        });
    } else {
        html += '<p class="no-content">No hay documentos disponibles</p>';
    }
    html += '</div>';
    
    html += '<div class="transporte-section"><h5>📸 Imágenes</h5>';
    if (linea.fotos && linea.fotos.length > 0) {
        linea.fotos.forEach((foto, index) => {
            html += `<div class="foto-item">
                <img src="${foto.url}" alt="${foto.nombre}" style="width: 100%; max-width: 300px; height: auto; border-radius: 8px; margin: 0.5rem 0; cursor: pointer;" onclick="viewTransportePhoto('${foto.url}', '${foto.nombre}')">
                <p><small>${foto.nombre}</small></p>
            </div>`;
        });
    } else {
        html += '<p class="no-content">No hay imágenes disponibles</p>';
    }
    html += '</div>';
    
    html += '</div>';
    return html;
}

// Ver foto de transporte
function viewTransportePhoto(url, nombre) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 90%; max-height: 90%;">
            <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            <h3>${nombre}</h3>
            <img src="${url}" alt="${nombre}" style="width: 100%; height: auto; border-radius: 8px;">
        </div>
    `;
    document.body.appendChild(modal);
}

// Abrir gestor de transporte
function openTransporteManager() {
    loadTransporteConfig();
    openModal('transporteModal');
    loadTransporteLinesList();
}

// Cerrar gestor de transporte
function closeTransporteModal() {
    closeModal('transporteModal');
}

// Cargar lista de líneas de transporte en el modal
function loadTransporteLinesList() {
    const linesList = document.getElementById('transporteLinesList');
    if (!linesList) return;
    
    linesList.innerHTML = '';
    
    if (transporteConfig.lineas.length === 0) {
        linesList.innerHTML = '<p>No hay líneas de transporte configuradas.</p>';
        return;
    }
    
    transporteConfig.lineas.forEach(linea => {
        const lineItem = document.createElement('div');
        lineItem.className = 'content-item';
        lineItem.style.cssText = 'border: 1px solid #e5e7eb; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; background: #f9fafb;';
        
        lineItem.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: start;">
                <div style="flex: 1;">
                    <h4>${linea.emoji} ${linea.nombre}</h4>
                    <p>${linea.descripcion}</p>
                    <p><small>Orden: ${linea.orden} | ${linea.isActive ? 'Activa' : 'Inactiva'}</small></p>
                </div>
                <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                    <button class="btn btn-primary btn-small" onclick="editTransporteLinea(${linea.id})">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn btn-danger btn-small" onclick="deleteTransporteLinea(${linea.id})">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </div>
            </div>
        `;
        linesList.appendChild(lineItem);
    });
}

// Añadir nueva línea de transporte
function addTransporteLinea() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>🚌 Añadir Nueva Línea de Transporte</h3>
                <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            <div class="modal-body">
                <form id="addTransporteLineaForm">
                    <div class="form-group">
                        <label for="lineaEmoji">Emoji:</label>
                        <input type="text" id="lineaEmoji" value="🚌" maxlength="2" required>
                    </div>
                    <div class="form-group">
                        <label for="lineaNombre">Nombre de la línea:</label>
                        <input type="text" id="lineaNombre" placeholder="Ej: Línea 1 - Cobreros a Puebla" required>
                    </div>
                    <div class="form-group">
                        <label for="lineaDescripcion">Descripción:</label>
                        <textarea id="lineaDescripcion" placeholder="Descripción de la línea de transporte" rows="3"></textarea>
                    </div>
                    <div class="form-group">
                        <label for="lineaOrden">Orden de visualización:</label>
                        <input type="number" id="lineaOrden" value="1" min="1" required>
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="lineaActiva" checked>
                            Línea activa
                        </label>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-outline" onclick="this.closest('.modal').remove()">Cancelar</button>
                        <button type="submit" class="btn btn-primary">Guardar Línea</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    // Configurar el formulario
    document.getElementById('addTransporteLineaForm').addEventListener('submit', function(e) {
        e.preventDefault();
        saveTransporteLinea();
        modal.remove();
    });
}

// Guardar línea de transporte
function saveTransporteLinea() {
    const nuevaLinea = {
        id: Date.now(),
        emoji: document.getElementById('lineaEmoji').value,
        nombre: document.getElementById('lineaNombre').value,
        descripcion: document.getElementById('lineaDescripcion').value,
        orden: parseInt(document.getElementById('lineaOrden').value),
        isActive: document.getElementById('lineaActiva').checked,
        horarios: [],
        rutas: [],
        contacto: null,
        documentos: [],
        fotos: []
    };
    
    transporteConfig.lineas.push(nuevaLinea);
    saveTransporteConfig();
    loadTransporteLinesList();
    renderServicios();
    showNotification('Línea de transporte añadida correctamente', 'success');
}
// Editar línea de transporte
function editTransporteLinea(lineaId) {
    const linea = transporteConfig.lineas.find(l => l.id === lineaId);
    if (!linea) return;
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 90%; max-height: 90%; overflow-y: auto;">
            <div class="modal-header">
                <h3>✏️ Editar Línea de Transporte</h3>
                <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            <div class="modal-body">
                <form id="editTransporteLineaForm">
                    <div class="form-group">
                        <label for="editLineaEmoji">Emoji:</label>
                        <input type="text" id="editLineaEmoji" value="${linea.emoji}" maxlength="2" required>
                    </div>
                    <div class="form-group">
                        <label for="editLineaNombre">Nombre de la línea:</label>
                        <input type="text" id="editLineaNombre" value="${linea.nombre}" required>
                    </div>
                    <div class="form-group">
                        <label for="editLineaDescripcion">Descripción:</label>
                        <textarea id="editLineaDescripcion" rows="3">${linea.descripcion || ''}</textarea>
                    </div>
                    <div class="form-group">
                        <label for="editLineaOrden">Orden de visualización:</label>
                        <input type="number" id="editLineaOrden" value="${linea.orden}" min="1" required>
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="editLineaActiva" ${linea.isActive ? 'checked' : ''}>
                            Línea activa
                        </label>
                    </div>
                    
                    <div class="form-group">
                        <h4>📄 Documentos</h4>
                        <div id="editLineaDocumentos">
                            ${renderEditLineaDocumentos(linea.documentos || [])}
                        </div>
                        <button type="button" class="btn btn-outline btn-small" onclick="addDocumentoToLinea(${lineaId})">
                            <i class="fas fa-plus"></i> Añadir Documento
                        </button>
                    </div>
                    
                    <div class="form-group">
                        <h4>📸 Imágenes</h4>
                        <div id="editLineaFotos">
                            ${renderEditLineaFotos(linea.fotos || [])}
                        </div>
                        <button type="button" class="btn btn-outline btn-small" onclick="addFotoToLinea(${lineaId})">
                            <i class="fas fa-plus"></i> Añadir Imagen
                        </button>
                    </div>
                    
                    <div class="modal-footer">
                        <button type="button" class="btn btn-outline" onclick="this.closest('.modal').remove()">Cancelar</button>
                        <button type="submit" class="btn btn-primary">Guardar Cambios</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    // Configurar el formulario
    document.getElementById('editTransporteLineaForm').addEventListener('submit', function(e) {
        e.preventDefault();
        updateTransporteLinea(lineaId);
        modal.remove();
    });
}
// Actualizar línea de transporte
function updateTransporteLinea(lineaId) {
    const linea = transporteConfig.lineas.find(l => l.id === lineaId);
    if (!linea) return;
    
    linea.emoji = document.getElementById('editLineaEmoji').value;
    linea.nombre = document.getElementById('editLineaNombre').value;
    linea.descripcion = document.getElementById('editLineaDescripcion').value;
    linea.orden = parseInt(document.getElementById('editLineaOrden').value);
    linea.isActive = document.getElementById('editLineaActiva').checked;
    
    saveTransporteConfig();
    loadTransporteLinesList();
    renderServicios();
    showNotification('Línea de transporte actualizada correctamente', 'success');
}

// Eliminar línea de transporte
function deleteTransporteLinea(lineaId) {
    if (confirm('¿Estás seguro de que quieres eliminar esta línea de transporte?')) {
        transporteConfig.lineas = transporteConfig.lineas.filter(l => l.id !== lineaId);
        saveTransporteConfig();
        loadTransporteLinesList();
        renderServicios();
        showNotification('Línea de transporte eliminada correctamente', 'success');
    }
}

// Renderizar documentos para edición
function renderEditLineaDocumentos(documentos) {
    if (documentos.length === 0) {
        return '<p class="no-content">No hay documentos</p>';
    }
    
    return documentos.map((doc, index) => `
        <div class="documento-edit-item" style="display: flex; align-items: center; gap: 1rem; margin: 0.5rem 0; padding: 0.5rem; border: 1px solid #e5e7eb; border-radius: 4px;">
            <input type="text" value="${doc.nombre}" onchange="updateDocumentoNombre(${index}, this.value)" placeholder="Nombre del documento" style="flex: 1;">
            <input type="url" value="${doc.url}" onchange="updateDocumentoUrl(${index}, this.value)" placeholder="URL del documento" style="flex: 2;">
            <button type="button" class="btn btn-danger btn-small" onclick="removeDocumentoFromLinea(${index})">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `).join('');
}

// Renderizar fotos para edición
function renderEditLineaFotos(fotos) {
    if (fotos.length === 0) {
        return '<p class="no-content">No hay imágenes</p>';
    }
    
    return fotos.map((foto, index) => `
        <div class="foto-edit-item" style="display: flex; align-items: center; gap: 1rem; margin: 0.5rem 0; padding: 0.5rem; border: 1px solid #e5e7eb; border-radius: 4px;">
            <img src="${foto.url}" alt="${foto.nombre}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;">
            <input type="text" value="${foto.nombre}" onchange="updateFotoNombre(${index}, this.value)" placeholder="Nombre de la imagen" style="flex: 1;">
            <input type="url" value="${foto.url}" onchange="updateFotoUrl(${index}, this.value)" placeholder="URL de la imagen" style="flex: 2;">
            <button type="button" class="btn btn-danger btn-small" onclick="removeFotoFromLinea(${index})">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `).join('');
}

// Funciones auxiliares para gestionar documentos y fotos
function addDocumentoToLinea(lineaId) {
    const linea = transporteConfig.lineas.find(l => l.id === lineaId);
    if (!linea) return;
    
    if (!linea.documentos) linea.documentos = [];
    
    linea.documentos.push({
        nombre: 'Nuevo documento',
        url: ''
    });
    
    // Actualizar la vista
    const documentosDiv = document.getElementById('editLineaDocumentos');
    if (documentosDiv) {
        documentosDiv.innerHTML = renderEditLineaDocumentos(linea.documentos);
    }
}

function addFotoToLinea(lineaId) {
    const linea = transporteConfig.lineas.find(l => l.id === lineaId);
    if (!linea) return;
    
    if (!linea.fotos) linea.fotos = [];
    
    linea.fotos.push({
        nombre: 'Nueva imagen',
        url: ''
    });
    
    // Actualizar la vista
    const fotosDiv = document.getElementById('editLineaFotos');
    if (fotosDiv) {
        fotosDiv.innerHTML = renderEditLineaFotos(linea.fotos);
    }
}

function updateDocumentoNombre(index, nombre) {
    // Esta función se llamará desde el HTML generado dinámicamente
    // Necesitamos encontrar la línea actual siendo editada
    const modal = document.querySelector('.modal:not([style*="display: none"])');
    if (modal) {
        const form = modal.querySelector('#editTransporteLineaForm');
        if (form) {
            // Buscar la línea por el contexto del modal
            // Por simplicidad, actualizaremos todas las líneas que tengan documentos
            transporteConfig.lineas.forEach(linea => {
                if (linea.documentos && linea.documentos[index]) {
                    linea.documentos[index].nombre = nombre;
                }
            });
        }
    }
}

function updateDocumentoUrl(index, url) {
    transporteConfig.lineas.forEach(linea => {
        if (linea.documentos && linea.documentos[index]) {
            linea.documentos[index].url = url;
        }
    });
}

function updateFotoNombre(index, nombre) {
    transporteConfig.lineas.forEach(linea => {
        if (linea.fotos && linea.fotos[index]) {
            linea.fotos[index].nombre = nombre;
        }
    });
}

function updateFotoUrl(index, url) {
    transporteConfig.lineas.forEach(linea => {
        if (linea.fotos && linea.fotos[index]) {
            linea.fotos[index].url = url;
        }
    });
}
function removeDocumentoFromLinea(index) {
    transporteConfig.lineas.forEach(linea => {
        if (linea.documentos && linea.documentos[index]) {
            linea.documentos.splice(index, 1);
        }
    });
    
    // Actualizar la vista
    const modal = document.querySelector('.modal:not([style*="display: none"])');
    if (modal) {
        const documentosDiv = modal.querySelector('#editLineaDocumentos');
        if (documentosDiv) {
            // Buscar la línea actual
            const linea = transporteConfig.lineas.find(l => l.documentos && l.documentos.length > 0);
            if (linea) {
                documentosDiv.innerHTML = renderEditLineaDocumentos(linea.documentos);
            }
        }
    }
}

function removeFotoFromLinea(index) {
    transporteConfig.lineas.forEach(linea => {
        if (linea.fotos && linea.fotos[index]) {
            linea.fotos.splice(index, 1);
        }
    });
    
    // Actualizar la vista
    const modal = document.querySelector('.modal:not([style*="display: none"])');
    if (modal) {
        const fotosDiv = modal.querySelector('#editLineaFotos');
        if (fotosDiv) {
            // Buscar la línea actual
            const linea = transporteConfig.lineas.find(l => l.fotos && l.fotos.length > 0);
            if (linea) {
                fotosDiv.innerHTML = renderEditLineaFotos(linea.fotos);
            }
        }
    }
}

function toggleElementoExpansion(elementoId) {
    const content = document.getElementById(`elementoContent${elementoId}`);
    const icon = document.getElementById(`elementoExpandIcon${elementoId}`);
    
    if (content.style.display === 'none') {
        content.style.display = 'block';
        icon.textContent = '▲';
    } else {
        content.style.display = 'none';
        icon.textContent = '▼';
    }
}

function renderTelefonoElementoContent(elemento) {
    let html = '';
    
    // Mostrar datos según el tipo
    if (elemento.tipo === 'telefonos') {
        elemento.datos.forEach(dato => {
            html += `
                <div class="telefono-dato-item">
                    <span class="dato-nombre">${dato.nombre}:</span>
                    <a href="tel:${dato.telefono}" class="dato-valor telefono-link">
                        <i class="fas fa-phone"></i> ${dato.telefono}
                    </a>
                </div>
            `;
        });
    } else {
        elemento.datos.forEach(dato => {
            html += `
                <div class="telefono-dato-item">
                    <span class="dato-nombre">${dato.nombre}:</span>
                    <span class="dato-valor">${dato.valor}</span>
                </div>
            `;
        });
    }
    
    // Mostrar documento si existe
    if (elemento.documento) {
        html += `
            <div class="telefono-dato-item">
                <span class="dato-nombre">Documento:</span>
                <a href="${elemento.documento}" target="_blank" class="dato-valor documento-link">
                    <i class="fas fa-file-pdf"></i> Ver Documento
                </a>
            </div>
        `;
    }
    
    // Mostrar foto si existe
    if (elemento.foto) {
        html += `
            <div class="telefono-dato-item">
                <span class="dato-nombre">Foto:</span>
                <a href="${elemento.foto}" target="_blank" class="dato-valor foto-link">
                    <i class="fas fa-image"></i> Ver Foto
                </a>
            </div>
        `;
    }
    
    return html;
}

// Funciones para gestionar Teléfonos de Interés
function openTelefonosInteresManager() {
    loadTelefonosInteresConfig();
    document.getElementById('telefonosInteresModal').style.display = 'block';
}

function closeTelefonosInteresModal() {
    document.getElementById('telefonosInteresModal').style.display = 'none';
}

function switchTelefonosTab(tabName) {
    // Ocultar todas las pestañas
    document.querySelectorAll('#telefonosInteresModal .tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Desactivar todos los botones de pestaña
    document.querySelectorAll('#telefonosInteresModal .tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Mostrar la pestaña seleccionada
    document.getElementById(`telefonos-${tabName}-tab`).classList.add('active');
    
    // Activar el botón de pestaña correspondiente
    event.target.classList.add('active');
    
    // Cargar contenido específico si es necesario
    if (tabName === 'elementos') {
        loadTelefonosElementosList();
    }
}

function loadTelefonosInteresConfig() {
    document.getElementById('telefonosTitulo').value = telefonosInteresConfig.titulo;
    document.getElementById('telefonosDescripcion').value = telefonosInteresConfig.descripcion;
    document.getElementById('telefonosTarjetaNombre').value = telefonosInteresConfig.tarjeta.nombre;
    document.getElementById('telefonosTarjetaEmoji').value = telefonosInteresConfig.tarjeta.emoji;
    document.getElementById('telefonosTarjetaDescripcion').value = telefonosInteresConfig.tarjeta.descripcion;
}

function saveTelefonosInteres() {
    telefonosInteresConfig.titulo = document.getElementById('telefonosTitulo').value;
    telefonosInteresConfig.descripcion = document.getElementById('telefonosDescripcion').value;
    telefonosInteresConfig.tarjeta.nombre = document.getElementById('telefonosTarjetaNombre').value;
    telefonosInteresConfig.tarjeta.emoji = document.getElementById('telefonosTarjetaEmoji').value;
    telefonosInteresConfig.tarjeta.descripcion = document.getElementById('telefonosTarjetaDescripcion').value;
    
    saveTelefonosInteresConfig();
    renderServicios();
    closeTelefonosInteresModal();
    
    showNotification('Configuración de Teléfonos de Interés guardada correctamente', 'success');
}

function loadTelefonosElementosList() {
    const container = document.getElementById('telefonosElementosList');
    if (!container) return;
    
    let html = '';
    
    telefonosInteresConfig.tarjeta.elementos
        .sort((a, b) => a.orden - b.orden)
        .forEach(elemento => {
            html += `
                <div class="telefono-elemento-item">
                    <div class="elemento-info">
                        <span class="elemento-emoji">${elemento.emoji}</span>
                        <div class="elemento-details">
                            <h4>${elemento.nombre}</h4>
                            <p>${elemento.descripcion}</p>
                            <small>Tipo: ${elemento.tipo} | Orden: ${elemento.orden}</small>
                        </div>
                    </div>
                    <div class="elemento-actions">
                        <button class="btn btn-sm btn-primary" onclick="editTelefonoElemento(${elemento.id})">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteTelefonoElemento(${elemento.id})">
                            <i class="fas fa-trash"></i> Eliminar
                        </button>
                    </div>
                </div>
            `;
        });
    
    if (html === '') {
        html = '<p class="no-content">No hay elementos configurados</p>';
    }
    
    container.innerHTML = html;
}

function openTelefonoElementoEditor(elementoId = null) {
    if (elementoId) {
        editTelefonoElemento(elementoId);
    } else {
        // Crear nuevo elemento
        document.getElementById('telefonoElementoModal').style.display = 'block';
        document.getElementById('telefonoElementoNombre').value = '';
        document.getElementById('telefonoElementoEmoji').value = '';
        document.getElementById('telefonoElementoDescripcion').value = '';
        document.getElementById('telefonoElementoTipo').value = 'telefonos';
        document.getElementById('telefonoElementoOrden').value = telefonosInteresConfig.tarjeta.elementos.length + 1;
        document.getElementById('telefonoElementoActivo').checked = true;
        document.getElementById('telefonoElementoDocumento').value = '';
        document.getElementById('telefonoElementoFoto').value = '';
        
        // Limpiar datos dinámicos
        document.getElementById('telefonoElementoDatosContainer').innerHTML = '';
        
        // Ocultar grupos de documento/foto
        document.getElementById('telefonoElementoDocumentoGroup').style.display = 'none';
        document.getElementById('telefonoElementoFotoGroup').style.display = 'none';
        
        toggleTelefonoElementoFields();
    }
}

function editTelefonoElemento(elementoId) {
    const elemento = telefonosInteresConfig.tarjeta.elementos.find(e => e.id === elementoId);
    if (!elemento) return;
    
    document.getElementById('telefonoElementoModal').style.display = 'block';
    document.getElementById('telefonoElementoNombre').value = elemento.nombre;
    document.getElementById('telefonoElementoEmoji').value = elemento.emoji;
    document.getElementById('telefonoElementoDescripcion').value = elemento.descripcion;
    document.getElementById('telefonoElementoTipo').value = elemento.tipo;
    document.getElementById('telefonoElementoOrden').value = elemento.orden;
    document.getElementById('telefonoElementoActivo').checked = elemento.isActive;
    document.getElementById('telefonoElementoDocumento').value = elemento.documento || '';
    document.getElementById('telefonoElementoFoto').value = elemento.foto || '';
    
    // Guardar ID para edición
    document.getElementById('telefonoElementoModal').dataset.editingId = elementoId;
    
    toggleTelefonoElementoFields();
}

function closeTelefonoElementoModal() {
    document.getElementById('telefonoElementoModal').style.display = 'none';
    document.getElementById('telefonoElementoModal').dataset.editingId = '';
}

function toggleTelefonoElementoFields() {
    const tipo = document.getElementById('telefonoElementoTipo').value;
    const datosContainer = document.getElementById('telefonoElementoDatosContainer');
    
    // Limpiar container
    datosContainer.innerHTML = '';
    
    if (tipo === 'telefonos') {
        datosContainer.innerHTML = `
            <div class="form-group">
                <label>Teléfonos (uno por línea, formato: Nombre|Teléfono):</label>
                <textarea id="telefonoElementoDatosTextarea" rows="5" placeholder="Taxi Cobreros|980 62 26 18&#10;Taxi Sanabria|980 62 26 19&#10;Taxi Express|980 62 26 20"></textarea>
            </div>
        `;
    } else if (tipo === 'servicio') {
        datosContainer.innerHTML = `
            <div class="form-group">
                <label>Información del servicio (una por línea, formato: Campo|Valor):</label>
                <textarea id="telefonoElementoDatosTextarea" rows="4" placeholder="Dirección|Carretera N-525, km 12&#10;Teléfono|980 62 26 21&#10;Horario|L-V: 8:00-18:00, S: 8:00-14:00"></textarea>
            </div>
        `;
    } else if (tipo === 'documento') {
        datosContainer.innerHTML = `
            <div class="form-group">
                <label>Información básica (una por línea, formato: Campo|Valor):</label>
                <textarea id="telefonoElementoDatosTextarea" rows="3" placeholder="Teléfono|980 62 26 18&#10;Horario|L-V: 9:00-14:00"></textarea>
            </div>
        `;
    }
    
    // Mostrar/ocultar grupos según el tipo
    if (tipo === 'documento') {
        document.getElementById('telefonoElementoDocumentoGroup').style.display = 'block';
        document.getElementById('telefonoElementoFotoGroup').style.display = 'none';
    } else {
        document.getElementById('telefonoElementoDocumentoGroup').style.display = 'none';
        document.getElementById('telefonoElementoFotoGroup').style.display = 'none';
    }
}

function saveTelefonoElemento() {
    const editingId = document.getElementById('telefonoElementoModal').dataset.editingId;
    const nombre = document.getElementById('telefonoElementoNombre').value;
    const emoji = document.getElementById('telefonoElementoEmoji').value;
    const descripcion = document.getElementById('telefonoElementoDescripcion').value;
    const tipo = document.getElementById('telefonoElementoTipo').value;
    const orden = parseInt(document.getElementById('telefonoElementoOrden').value);
    const isActive = document.getElementById('telefonoElementoActivo').checked;
    const documento = document.getElementById('telefonoElementoDocumento').value;
    const foto = document.getElementById('telefonoElementoFoto').value;
    
    // Procesar datos del textarea
    const datosTextarea = document.getElementById('telefonoElementoDatosTextarea').value;
    const datos = [];
    
    if (datosTextarea.trim()) {
        const lineas = datosTextarea.split('\n');
        lineas.forEach(linea => {
            const partes = linea.split('|');
            if (partes.length === 2) {
                if (tipo === 'telefonos') {
                    datos.push({
                        nombre: partes[0].trim(),
                        telefono: partes[1].trim()
                    });
                } else {
                    datos.push({
                        nombre: partes[0].trim(),
                        valor: partes[1].trim()
                    });
                }
            }
        });
    }
    
    const elementoData = {
        nombre,
        emoji,
        descripcion,
        tipo,
        datos,
        documento: documento || null,
        foto: foto || null,
        orden,
        isActive
    };
    
    if (editingId) {
        // Editar elemento existente
        const index = telefonosInteresConfig.tarjeta.elementos.findIndex(e => e.id === parseInt(editingId));
        if (index !== -1) {
            elementoData.id = parseInt(editingId);
            telefonosInteresConfig.tarjeta.elementos[index] = elementoData;
        }
    } else {
        // Crear nuevo elemento
        const newId = Math.max(...telefonosInteresConfig.tarjeta.elementos.map(e => e.id), 0) + 1;
        elementoData.id = newId;
        telefonosInteresConfig.tarjeta.elementos.push(elementoData);
    }
    
    saveTelefonosInteresConfig();
    loadTelefonosElementosList();
    closeTelefonoElementoModal();
    renderServicios();
    
    showNotification('Elemento de teléfono guardado correctamente', 'success');
}

function deleteTelefonoElemento(elementoId) {
    if (confirm('¿Estás seguro de que quieres eliminar este elemento?')) {
        telefonosInteresConfig.tarjeta.elementos = telefonosInteresConfig.tarjeta.elementos.filter(e => e.id !== elementoId);
        saveTelefonosInteresConfig();
        loadTelefonosElementosList();
        renderServicios();
        showNotification('Elemento eliminado correctamente', 'success');
    }
}

function exportTelefonosInteres() {
    const dataStr = JSON.stringify(telefonosInteresConfig, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'telefonos-interes-config.json';
    link.click();
    URL.revokeObjectURL(url);
}

// Cargar listas en admin
function loadServiciosAdmin() {
    loadSeccionesConfig();
    updateSectionTitles();
    loadServiciosList('medical');
    loadServiciosList('itv');
    loadConsultorioList();
    loadItvList();
    loadTelefonosElementosList();
    loadTransporteLinesList();
    actualizarEstadisticasNotificaciones();
}

// Cargar lista específica
function loadServiciosList(type) {
    const container = document.getElementById(type + 'List');
    if (!container) return;
    
    let html = '';
    servicios[type].forEach(servicio => {
        html += `
            <div style="background: var(--bg-secondary); padding: 1rem; border-radius: 8px; margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <h4>${servicio.name}</h4>
                    <p>${servicio.day} - ${servicio.time}</p>
                </div>
                <div>
                    <button class="btn btn-small btn-outline" onclick="editServicio('${type}', ${servicio.id})">Editar</button>
                    <button class="btn btn-small btn-danger" onclick="deleteServicio('${type}', ${servicio.id})">Eliminar</button>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

// Añadir servicio
function addServicio(type) {
    console.log('addServicio called with type:', type);
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            <h2>Nuevo Servicio</h2>
            <form id="servicioForm">
                <input type="hidden" id="servicioId" value="">
                <input type="hidden" id="servicioType" value="${type}">
                
                <div class="form-group">
                    <label for="servicioLogo">Logo/Icono:</label>
                    <input type="file" id="servicioLogo" accept="image/*">
                    <div id="currentLogo"></div>
                    <small style="color: #666;">Imagen pequeña que aparecerá como icono del servicio</small>
                </div>
                
                <div class="form-group">
                    <label for="servicioName">Nombre:</label>
                    <input type="text" id="servicioName" required>
                </div>
                
                <div class="form-group">
                    <label for="servicioDay">Día:</label>
                    <input type="text" id="servicioDay" placeholder="Ej: Lunes, Martes...">
                </div>
                
                <div class="form-group">
                    <label for="servicioTime">Hora:</label>
                    <input type="text" id="servicioTime" placeholder="Ej: 09:00 - 14:00">
                </div>
                
                <div class="form-group">
                    <label for="servicioLocation">Ubicación:</label>
                    <input type="text" id="servicioLocation" placeholder="Ej: Centro de Salud">
                </div>
                
                <div class="form-group">
                    <label for="servicioPhone">Teléfono:</label>
                    <input type="tel" id="servicioPhone" required>
                </div>
                
                <div class="form-group">
                    <label for="servicioLink">Enlace Web:</label>
                    <input type="url" id="servicioLink" placeholder="https://ejemplo.com">
                    <small style="color: #666;">URL opcional para más información</small>
                </div>
                
                <div class="form-group">
                    <label for="servicioDescription">Descripción:</label>
                    <textarea id="servicioDescription" rows="3"></textarea>
                </div>
                
                ${type === 'medical' || type === 'itv' ? `
                <div class="form-group">
                    <label for="servicioPhoto">Fotografía:</label>
                    <input type="file" id="servicioPhoto" accept="image/*">
                    <div id="currentPhoto"></div>
                    <small style="color: #666;">Imagen grande para mostrar en la tarjeta del servicio</small>
                </div>
                ` : ''}
                
                <div class="modal-footer">
                    <button type="button" class="btn btn-outline" onclick="this.closest('.modal').remove()">Cancelar</button>
                    <button type="button" class="btn btn-primary" onclick="saveServicioFromModal(this)">Guardar</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
    console.log('Modal created and opened successfully');
}
// Editar servicio
function editServicio(type, id) {
    console.log('editServicio called with type:', type, 'id:', id);
    
    const servicio = servicios[type].find(s => s.id === id);
    if (!servicio) {
        console.error('Servicio not found');
        return;
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            <h2>Editar Servicio</h2>
            <form id="servicioForm">
                <input type="hidden" id="servicioId" value="${servicio.id}">
                <input type="hidden" id="servicioType" value="${type}">
                
                <div class="form-group">
                    <label for="servicioLogo">Logo/Icono:</label>
                    <input type="file" id="servicioLogo" accept="image/*">
                    <div id="currentLogo">
                        ${servicio.logo ? `<img src="${servicio.logo}" style="max-width: 60px; max-height: 60px; border-radius: 4px; margin-top: 10px;">` : ''}
                    </div>
                    <small style="color: #666;">Imagen pequeña que aparecerá como icono del servicio</small>
                </div>
                
                <div class="form-group">
                    <label for="servicioName">Nombre:</label>
                    <input type="text" id="servicioName" value="${servicio.name}" required>
                </div>
                
                <div class="form-group">
                    <label for="servicioDay">Día:</label>
                    <input type="text" id="servicioDay" value="${servicio.day || ''}" placeholder="Ej: Lunes, Martes...">
                </div>
                
                <div class="form-group">
                    <label for="servicioTime">Hora:</label>
                    <input type="text" id="servicioTime" value="${servicio.time || ''}" placeholder="Ej: 09:00 - 14:00">
                </div>
                
                <div class="form-group">
                    <label for="servicioLocation">Ubicación:</label>
                    <input type="text" id="servicioLocation" value="${servicio.location || ''}" placeholder="Ej: Centro de Salud">
                </div>
                
                <div class="form-group">
                    <label for="servicioPhone">Teléfono:</label>
                    <input type="tel" id="servicioPhone" value="${servicio.phone}" required>
                </div>
                
                <div class="form-group">
                    <label for="servicioLink">Enlace Web:</label>
                    <input type="url" id="servicioLink" value="${servicio.link || ''}" placeholder="https://ejemplo.com">
                    <small style="color: #666;">URL opcional para más información</small>
                </div>
                
                <div class="form-group">
                    <label for="servicioDescription">Descripción:</label>
                    <textarea id="servicioDescription" rows="3">${servicio.description || ''}</textarea>
                </div>
                
                ${type === 'medical' || type === 'itv' ? `
                <div class="form-group">
                    <label for="servicioPhoto">Fotografía:</label>
                    <input type="file" id="servicioPhoto" accept="image/*">
                    <div id="currentPhoto">
                        ${servicio.photo ? `<img src="${servicio.photo}" style="max-width: 200px; max-height: 150px; border-radius: 4px; margin-top: 10px;">` : ''}
                    </div>
                    <small style="color: #666;">Imagen grande para mostrar en la tarjeta del servicio</small>
                </div>
                ` : ''}
                
                <div class="modal-footer">
                    <button type="button" class="btn btn-outline" onclick="this.closest('.modal').remove()">Cancelar</button>
                    <button type="button" class="btn btn-primary" onclick="saveServicioFromModal(this)">Guardar</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
    console.log('Edit modal created and opened successfully');
}
// Guardar servicio desde modal dinámico
function saveServicioFromModal(button) {
    console.log('saveServicioFromModal called');
    
    const modal = button.closest('.modal');
    const form = modal.querySelector('#servicioForm');
    
    // Obtener datos del formulario
    const id = form.querySelector('#servicioId').value;
    const type = form.querySelector('#servicioType').value;
    const name = form.querySelector('#servicioName').value;
    const day = form.querySelector('#servicioDay').value;
    const time = form.querySelector('#servicioTime').value;
    const location = form.querySelector('#servicioLocation').value;
    const phone = form.querySelector('#servicioPhone').value;
    const link = form.querySelector('#servicioLink').value;
    const description = form.querySelector('#servicioDescription').value;
    
    console.log('Form data:', { id, type, name, day, time, location, phone, description });
    
    // Validar campos obligatorios
    if (!name || !phone) {
        alert('Por favor, complete al menos el nombre y el teléfono.');
        return;
    }
    
    const servicio = {
        id: id ? parseInt(id) : Date.now(),
        name,
        day,
        time,
        location,
        phone,
        link,
        description
    };
    
    // Procesar logo si existe
    const logoInput = form.querySelector('#servicioLogo');
    if (logoInput && logoInput.files[0]) {
        const file = logoInput.files[0];
        const reader = new FileReader();
        reader.onload = function(e) {
            servicio.logo = e.target.result;
            processPhotoAndSave();
        };
        reader.readAsDataURL(file);
    } else {
        processPhotoAndSave();
    }
    
    function processPhotoAndSave() {
        // Procesar foto si existe
        const photoInput = form.querySelector('#servicioPhoto');
        if (photoInput && photoInput.files[0]) {
            const file = photoInput.files[0];
            const reader = new FileReader();
            reader.onload = function(e) {
                servicio.photo = e.target.result;
                saveServicioData(servicio, type, id);
            };
            reader.readAsDataURL(file);
        } else {
            saveServicioData(servicio, type, id);
        }
    }
    
    // Cerrar modal
    modal.remove();
    document.body.style.overflow = 'auto';
}
// Guardar servicio (función original mantenida para compatibilidad)
function saveServicio() {
    console.log('saveServicio called');
    
    // Obtener datos del formulario
    const id = document.getElementById('servicioId').value;
    const type = document.getElementById('servicioType').value;
    const name = document.getElementById('servicioName').value;
    const day = document.getElementById('servicioDay').value;
    const time = document.getElementById('servicioTime').value;
    const location = document.getElementById('servicioLocation').value;
    const phone = document.getElementById('servicioPhone').value;
    const description = document.getElementById('servicioDescription').value;
    
    console.log('Form data:', { id, type, name, day, time, location, phone, description });
    
    // Validar campos obligatorios
    if (!name || !phone) {
        alert('Por favor, complete al menos el nombre y el teléfono.');
        return;
    }
    
    const servicio = {
        id: id ? parseInt(id) : Date.now(),
        name,
        day,
        time,
        location,
        phone,
        description
    };
    
    // Manejar foto
    const photoFile = document.getElementById('servicioPhoto').files[0];
    if (photoFile) {
        const reader = new FileReader();
        reader.onload = function(e) {
            servicio.photo = e.target.result;
            saveServicioData(servicio, type, id);
        };
        reader.readAsDataURL(photoFile);
    } else {
        if (id) {
            const existing = servicios[type].find(s => s.id === parseInt(id));
            if (existing && existing.photo) {
                servicio.photo = existing.photo;
            }
        }
        saveServicioData(servicio, type, id);
    }
}

// Guardar datos del servicio
function saveServicioData(servicio, type, id) {
    if (id) {
        const index = servicios[type].findIndex(s => s.id === parseInt(id));
        if (index !== -1) {
            servicios[type][index] = servicio;
        }
    } else {
        servicios[type].push(servicio);
    }
    
    saveServicios();
    loadServiciosAdmin();
    renderServicios();
    closeServicioModal();
    showNotification('Servicio guardado correctamente', 'success');
}

// Eliminar servicio
function deleteServicio(type, id) {
    if (confirm('¿Está seguro de que desea eliminar este servicio?')) {
        servicios[type] = servicios[type].filter(s => s.id !== id);
        saveServicios();
        loadServiciosAdmin();
        renderServicios();
        showNotification('Servicio eliminado correctamente', 'success');
    }
}

// Cerrar modal
function closeServicioModal() {
    const modal = document.getElementById('servicioModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Ver foto
function viewPhoto(photoSrc) {
    const modal = document.createElement('div');
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 10000;';
    modal.innerHTML = `
        <div style="position: relative;">
            <img src="${photoSrc}" style="max-width: 90vw; max-height: 90vh; border-radius: 8px;">
            <button onclick="this.parentElement.parentElement.remove()" style="position: absolute; top: -40px; right: 0; background: white; border: none; padding: 10px; border-radius: 50%; cursor: pointer;">X</button>
        </div>
    `;
    document.body.appendChild(modal);
    modal.onclick = () => modal.remove();
}

// ===== MODAL GENÉRICO EN BLANCO =====

// Variables globales para el modal genérico
let genericModalCallback = null;
let genericModalData = null;

// Abrir modal genérico
function openGenericModal(title, content, footerButtons = null, callback = null, data = null) {
    console.log('openGenericModal called:', { title, content, footerButtons, callback, data });
    
    // Guardar callback y datos
    genericModalCallback = callback;
    genericModalData = data;
    
    // Configurar título
    document.getElementById('genericModalTitle').textContent = title;
    
    // Configurar contenido
    document.getElementById('genericModalBody').innerHTML = content;
    
    // Configurar botones del footer
    const footer = document.getElementById('genericModalFooter');
    if (footerButtons) {
        footer.innerHTML = footerButtons;
    } else {
        footer.innerHTML = `
            <button class="btn btn-outline" onclick="closeGenericModal()">Cancelar</button>
            <button class="btn btn-primary" onclick="genericModalAction()">Aceptar</button>
        `;
    }
    
    // Abrir modal
    document.getElementById('genericModal').style.display = 'block';
    document.body.style.overflow = 'hidden';
}

// Cerrar modal genérico
function closeGenericModal() {
    document.getElementById('genericModal').style.display = 'none';
    document.body.style.overflow = 'auto';
    
    // Limpiar callback y datos
    genericModalCallback = null;
    genericModalData = null;
}

// Acción del modal genérico
function genericModalAction() {
    if (genericModalCallback) {
        // Obtener datos del formulario si existe
        const form = document.querySelector('#genericModal form');
        let formData = null;
        
        if (form) {
            formData = new FormData(form);
        }
        
        // Ejecutar callback
        genericModalCallback(formData, genericModalData);
    }
    
    // Cerrar modal
    closeGenericModal();
}

// Función de utilidad para crear formularios rápidos
function createForm(fields) {
    let formHTML = '<form>';
    
    fields.forEach(field => {
        const { type, name, label, placeholder, required, value, options } = field;
        
        formHTML += `<div class="form-group">`;
        formHTML += `<label for="${name}">${label}:</label>`;
        
        switch (type) {
            case 'text':
            case 'email':
            case 'tel':
            case 'number':
                formHTML += `<input type="${type}" id="${name}" name="${name}" placeholder="${placeholder || ''}" ${required ? 'required' : ''} value="${value || ''}">`;
                break;
            case 'textarea':
                formHTML += `<textarea id="${name}" name="${name}" placeholder="${placeholder || ''}" ${required ? 'required' : ''} rows="3">${value || ''}</textarea>`;
                break;
            case 'select':
                formHTML += `<select id="${name}" name="${name}" ${required ? 'required' : ''}>`;
                formHTML += `<option value="">Seleccionar...</option>`;
                options.forEach(option => {
                    formHTML += `<option value="${option.value}" ${option.value === value ? 'selected' : ''}>${option.label}</option>`;
                });
                formHTML += `</select>`;
                break;
            case 'file':
                formHTML += `<input type="file" id="${name}" name="${name}" accept="${field.accept || '*'}">`;
                break;
        }
        
        formHTML += `</div>`;
    });
    
    formHTML += '</form>';
    return formHTML;
}

// Función para abrir modal personalizable
function openCustomModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            <h2>🛠️ Modal Personalizable</h2>
            <form id="customModalForm">
                <div class="form-group">
                    <label for="modalTitle">Título del Modal:</label>
                    <input type="text" id="modalTitle" placeholder="Ej: Nueva Funcionalidad" required>
                </div>
                
                <div class="form-group">
                    <label for="modalDescription">Descripción:</label>
                    <textarea id="modalDescription" rows="2" placeholder="Descripción de la funcionalidad..."></textarea>
                </div>
                
                <div class="form-group">
                    <label for="fieldCount">Número de campos:</label>
                    <select id="fieldCount" onchange="generateCustomFields()">
                        <option value="1">1 campo</option>
                        <option value="2">2 campos</option>
                        <option value="3">3 campos</option>
                        <option value="4">4 campos</option>
                        <option value="5">5 campos</option>
                        <option value="6">6 campos</option>
                    </select>
                </div>
                
                <div id="customFields"></div>
                
                <div class="form-group">
                    <label for="buttonText">Texto del botón principal:</label>
                    <input type="text" id="buttonText" value="Guardar" placeholder="Ej: Enviar, Crear, etc.">
                </div>
                
                <div class="modal-footer">
                    <button type="button" class="btn btn-outline" onclick="this.closest('.modal').remove()">Cancelar</button>
                    <button type="button" class="btn btn-primary" onclick="createCustomModal()">Crear Modal</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
    
    // Generar campos iniciales
    generateCustomFields();
}

// Generar campos personalizados
function generateCustomFields() {
    const fieldCount = document.getElementById('fieldCount').value;
    const container = document.getElementById('customFields');
    
    let html = '';
    for (let i = 1; i <= fieldCount; i++) {
        html += `
            <div class="form-group" style="border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 8px;">
                <h4 style="margin: 0 0 10px 0; color: var(--primary-color);">Campo ${i}</h4>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <div>
                        <label for="field${i}_label">Etiqueta:</label>
                        <input type="text" id="field${i}_label" placeholder="Ej: Nombre, Email...">
                    </div>
                    <div>
                        <label for="field${i}_type">Tipo:</label>
                        <select id="field${i}_type">
                            <option value="text">Texto</option>
                            <option value="email">Email</option>
                            <option value="tel">Teléfono</option>
                            <option value="number">Número</option>
                            <option value="textarea">Área de texto</option>
                            <option value="select">Lista desplegable</option>
                            <option value="file">Archivo</option>
                            <option value="url">URL</option>
                        </select>
                    </div>
                </div>
                <div style="margin-top: 10px;">
                    <label for="field${i}_placeholder">Placeholder:</label>
                    <input type="text" id="field${i}_placeholder" placeholder="Texto de ayuda...">
                </div>
                <div style="margin-top: 10px;">
                    <label>
                        <input type="checkbox" id="field${i}_required"> Campo obligatorio
                    </label>
                </div>
            </div>
        `;
    }
    
    container.innerHTML = html;
}

// Crear el modal personalizado
function createCustomModal() {
    const title = document.getElementById('modalTitle').value;
    const description = document.getElementById('modalDescription').value;
    const buttonText = document.getElementById('buttonText').value;
    const fieldCount = document.getElementById('fieldCount').value;
    
    if (!title) {
        alert('Por favor, ingrese un título para el modal.');
        return;
    }
    
    // Recopilar datos de los campos
    const fields = [];
    for (let i = 1; i <= fieldCount; i++) {
        const label = document.getElementById(`field${i}_label`).value;
        const type = document.getElementById(`field${i}_type`).value;
        const placeholder = document.getElementById(`field${i}_placeholder`).value;
        const required = document.getElementById(`field${i}_required`).checked;
        
        if (label) {
            fields.push({
                type,
                name: `field${i}`,
                label,
                placeholder,
                required
            });
        }
    }
    
    // Crear el formulario
    const formHTML = createForm(fields);
    
    // Crear el contenido del modal
    const content = `
        ${description ? `<div style="margin-bottom: 20px; padding: 15px; background: #f0f8ff; border-radius: 8px; border-left: 4px solid var(--primary-color);">
            <p style="margin: 0; color: #666;">${description}</p>
        </div>` : ''}
        ${formHTML}
    `;
    
    // Crear botones personalizados
    const customButtons = `
        <button class="btn btn-outline" onclick="closeGenericModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="handleCustomModalSubmit()">${buttonText}</button>
    `;
    
    // Cerrar el modal de configuración
    document.querySelector('.modal').remove();
    document.body.style.overflow = 'auto';
    
    // Abrir el modal personalizado
    openGenericModal(
        title,
        content,
        customButtons,
        function(formData, data) {
            console.log('Datos del modal personalizado:', formData);
            alert('¡Modal personalizado enviado! Revisa la consola para ver los datos.');
        }
    );
}

// Manejar envío del modal personalizado
function handleCustomModalSubmit() {
    const form = document.querySelector('#genericModal form');
    if (form) {
        const formData = new FormData(form);
        const data = {};
        
        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }
        
        console.log('Datos recopilados:', data);
        alert('¡Formulario enviado correctamente! Revisa la consola para ver los datos.');
    }
    
    closeGenericModal();
}

// ===== GESTIÓN DE USUARIOS Y ADMINISTRADORES =====

// Cargar lista de usuarios (ocultando super admin)
function loadUsersList() {
    const usersList = document.getElementById('usersList');
    if (!usersList) return;
    
    const allUsers = JSON.parse(localStorage.getItem('users') || '[]');
    // Filtrar usuarios ocultos (super admin)
    const visibleUsers = allUsers.filter(user => !user.isHidden);
    
    if (visibleUsers.length === 0) {
        usersList.innerHTML = '<p style="text-align: center; color: #666; padding: 2rem;">No hay usuarios registrados</p>';
        return;
    }
    
    let html = '';
    visibleUsers.forEach(user => {
        const displayName = user.fullName || (user.name ? `${user.name}${user.surname1 ? ' ' + user.surname1 : ''}${user.surname2 ? ' ' + user.surname2 : ''}` : (user.nombre ? `${user.nombre}${user.apellidos ? ' ' + user.apellidos : ''}` : 'Usuario'));
        html += `
            <div class="user-item" style="background: var(--bg-secondary); padding: 1rem; margin: 0.5rem 0; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <h4 style="margin: 0 0 0.5rem 0;">${displayName}</h4>
                    <p style="margin: 0; color: #666;">${user.email}</p>
                    ${user.dni || user.documentNumber ? `<p style="margin: 0.25rem 0; color: #666; font-size: 0.9em;">${user.documentTypeName || 'Documento'}: ${user.documentNumber || user.dni}</p>` : ''}
                    ${user.address || user.direccion ? `<p style="margin: 0.25rem 0; color: #666; font-size: 0.9em;">📍 ${user.address || user.direccion}${user.city || user.ciudad ? ', ' + (user.city || user.ciudad) : ''}${user.postalCode || user.codigoPostal ? ' (' + (user.postalCode || user.codigoPostal) + ')' : ''}</p>` : ''}
                    <small style="color: #999;">Registrado: ${new Date(user.registrationDate || user.registeredAt || Date.now()).toLocaleDateString()}</small>
                </div>
                <div class="user-actions">
                    <button class="btn btn-sm btn-outline" onclick="editUser('${user.email}')">Editar</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteUser('${user.email}')">Eliminar</button>
                </div>
            </div>
        `;
    });
    
    usersList.innerHTML = html;
}

// Cargar lista de administradores (ocultando super admin)
function loadAdminsList() {
    const adminsList = document.getElementById('adminsList');
    if (!adminsList) return;
    
    // Asegurar que administrators esté cargado
    loadAdministrators();
    
    // Filtrar administradores ocultos (super admin)
    const visibleAdmins = administrators.filter(admin => !admin.isHidden);
    
    if (visibleAdmins.length === 0) {
        adminsList.innerHTML = '<p style="text-align: center; color: #666; padding: 2rem;">No hay administradores registrados</p>';
        return;
    }
    
    let html = '';
    visibleAdmins.forEach(admin => {
        const createdDate = admin.createdAt ? new Date(admin.createdAt).toLocaleDateString() : new Date().toLocaleDateString();
        html += `
            <div class="admin-item" style="background: var(--bg-secondary); padding: 1rem; margin: 0.5rem 0; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <h4 style="margin: 0 0 0.5rem 0;">${admin.name || 'Administrador'}</h4>
                    <p style="margin: 0; color: #666;">${admin.email}</p>
                    <small style="color: #999;">Creado: ${createdDate}</small>
                </div>
                <div class="admin-actions">
                    <button class="btn btn-sm btn-outline" onclick="editAdmin(${admin.id})">Editar</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteAdmin(${admin.id})">Eliminar</button>
                </div>
            </div>
        `;
    });
    
    adminsList.innerHTML = html;
}
// Funciones auxiliares para gestión de usuarios
function editUser(email) {
    // Cargar usuarios
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const user = users.find(u => u.email === email);
    
    if (!user) {
        showNotification('Persona no encontrada', 'error');
        return;
    }
    
    // Crear modal de edición
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'editUserModal';
    modal.style.display = 'block';
    
    // Construir dirección completa
    const fullAddress = user.address || user.direccion || '';
    const city = user.city || user.ciudad || '';
    const postalCode = user.postalCode || user.codigoPostal || '';
    const addressParts = [fullAddress, city, postalCode].filter(p => p);
    const displayAddress = addressParts.join(', ');
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 700px; max-height: 90vh; overflow-y: auto;">
            <div class="modal-header">
                <h3>✏️ Editar Usuario</h3>
                <span class="close" onclick="closeEditUserModal()">&times;</span>
            </div>
            <div class="modal-body">
                <form id="editUserForm">
                    <input type="hidden" id="editUserEmail" value="${user.email}">
                    
                    <div class="form-group">
                        <label for="editUserName">Nombre:</label>
                        <input type="text" id="editUserName" value="${user.name || user.nombre || ''}" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="editUserSurname1">Primer Apellido:</label>
                        <input type="text" id="editUserSurname1" value="${user.surname1 || ''}" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="editUserSurname2">Segundo Apellido: <small style="color: #999;">(Opcional)</small></label>
                        <input type="text" id="editUserSurname2" value="${user.surname2 || ''}">
                    </div>
                    
                    <div class="form-group">
                        <label for="editUserEmailInput">Correo electrónico:</label>
                        <input type="email" id="editUserEmailInput" value="${user.email}" required>
                        <small style="color: #666;">El email no se puede cambiar</small>
                    </div>
                    
                    <div class="form-group">
                        <label for="editUserPhone">Teléfono:</label>
                        <input type="tel" id="editUserPhone" value="${user.phone || user.telefono || ''}" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="editUserAddress">Dirección:</label>
                        <input type="text" id="editUserAddress" value="${fullAddress}" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="editUserCity">Ciudad / Población:</label>
                        <input type="text" id="editUserCity" value="${city}" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="editUserPostalCode">Código Postal:</label>
                        <input type="text" id="editUserPostalCode" value="${postalCode}" required maxlength="5" pattern="[0-9]{5}">
                    </div>
                    
                    <div class="form-group">
                        <label for="editUserDocumentType">Tipo de documento:</label>
                        <select id="editUserDocumentType" required>
                            <option value="dni" ${(user.documentType === 'dni' || (!user.documentType && user.dni)) ? 'selected' : ''}>DNI</option>
                            <option value="nie" ${user.documentType === 'nie' ? 'selected' : ''}>NIE</option>
                            <option value="passport" ${user.documentType === 'passport' ? 'selected' : ''}>Pasaporte</option>
                            <option value="other" ${user.documentType === 'other' ? 'selected' : ''}>Otro</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="editUserDocumentNumber">Número de documento:</label>
                        <input type="text" id="editUserDocumentNumber" value="${user.documentNumber || user.dni || ''}" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="editUserLocalities">Localidades de interés:</label>
                        <div class="localities-selection">
                            <div class="localities-grid">
                                ${['Cobreros', 'Avedillo de Sanabria', 'Barrio de Lomba', 'Castro de Sanabria', 'Limianos', 'Quintana de Sanabria', 'Riego de Lomba', 'San Martín del Terroso', 'San Miguel de Lomba', 'San Román de Sanabria', 'Santa Colomba', 'Sotillo', 'Terroso'].map(locality => {
                                    const isChecked = (user.localities || []).includes(locality);
                                    return `
                                        <label class="locality-checkbox">
                                            <input type="checkbox" name="editUserLocalities" value="${locality}" ${isChecked ? 'checked' : ''}>
                                            <span>${locality}</span>
                                        </label>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-group checkbox-group">
                        <input type="checkbox" id="editUserConsent" ${user.consent ? 'checked' : ''}>
                        <label for="editUserConsent">Consentimiento para tratamiento de datos</label>
                    </div>
                    
                    <div class="form-group checkbox-group">
                        <input type="checkbox" id="editUserNotificationConsent" ${user.notificationConsent ? 'checked' : ''}>
                        <label for="editUserNotificationConsent">Consentimiento para recibir avisos</label>
                    </div>
                    
                    <div class="form-group">
                        <label for="editUserPassword">Nueva contraseña: <small style="color: #999;">(dejar vacío para no cambiar)</small></label>
                        <input type="password" id="editUserPassword" placeholder="Nueva contraseña">
                    </div>
                    
                    <div class="form-actions" style="display: flex; gap: 1rem; margin-top: 1.5rem;">
                        <button type="button" class="btn btn-outline" onclick="closeEditUserModal()">Cancelar</button>
                        <button type="submit" class="btn btn-primary">Guardar Cambios</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Manejar envío del formulario
    document.getElementById('editUserForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveUserChanges(user.email);
    });
    
    // Cerrar al hacer clic fuera del modal
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeEditUserModal();
        }
    });
}

function closeEditUserModal() {
    const modal = document.getElementById('editUserModal');
    if (modal) {
        modal.remove();
    }
}
async function saveUserChanges(oldEmail) {
    try {
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const userIndex = users.findIndex(u => u.email === oldEmail);
        
        if (userIndex === -1) {
            showNotification('Persona no encontrada', 'error');
            return;
        }
        
        const user = users[userIndex];
        
        // Obtener valores del formulario
        const name = document.getElementById('editUserName').value.trim();
        const surname1 = document.getElementById('editUserSurname1').value.trim();
        const surname2 = document.getElementById('editUserSurname2').value.trim();
        const phone = document.getElementById('editUserPhone').value.trim();
        const address = document.getElementById('editUserAddress').value.trim();
        const city = document.getElementById('editUserCity').value.trim();
        const postalCode = document.getElementById('editUserPostalCode').value.trim();
        const documentType = document.getElementById('editUserDocumentType').value;
        const documentNumber = document.getElementById('editUserDocumentNumber').value.trim().toUpperCase();
        const newPassword = document.getElementById('editUserPassword').value.trim();
        const consent = document.getElementById('editUserConsent').checked;
        const notificationConsent = document.getElementById('editUserNotificationConsent').checked;
        
        // Obtener localidades seleccionadas
        const selectedLocalities = [];
        document.querySelectorAll('input[name="editUserLocalities"]:checked').forEach(checkbox => {
            selectedLocalities.push(checkbox.value);
        });
        
        // Validaciones
        if (!name || !surname1 || !phone || !address || !city || !postalCode || !documentNumber) {
            showNotification('Por favor, complete todos los campos obligatorios', 'error');
            return;
        }
        
        // Validar código postal
        const postalCodeRegex = /^[0-9]{5}$/;
        if (!postalCodeRegex.test(postalCode)) {
            showNotification('El código postal debe tener 5 dígitos', 'error');
            return;
        }
        
        // Construir nombre completo
        const fullName = `${name} ${surname1}${surname2 ? ' ' + surname2 : ''}`.trim();
        const fullSurnames = surname2 ? `${surname1} ${surname2}` : surname1;
        
        // Actualizar usuario
        const updatedUser = {
            ...user,
            name: name,
            nombre: name,
            surname1: surname1,
            surname2: surname2 || '',
            fullName: fullName,
            apellidos: fullSurnames,
            phone: phone,
            telefono: phone,
            address: address,
            direccion: address,
            city: city,
            ciudad: city,
            postalCode: postalCode,
            codigoPostal: postalCode,
            documentType: documentType,
            documentNumber: documentNumber,
            dni: (documentType === 'dni' || documentType === 'nie') ? documentNumber : (user.dni || ''),
            localities: selectedLocalities,
            consent: consent,
            notificationConsent: notificationConsent,
            lastNotificationError: notificationConsent ? '' : (user.lastNotificationError || ''),
            updatedAt: new Date().toISOString()
        };
        
        // Actualizar contraseña si se proporcionó una nueva
        if (newPassword) {
            updatedUser.password = newPassword;
        }
        
        // Guardar cambios
        users[userIndex] = updatedUser;
        localStorage.setItem('users', JSON.stringify(users));
        
        // Sincronizar con Firestore si está disponible
        if (typeof syncUserToFirestore === 'function') {
            await syncUserToFirestore(updatedUser);
        }
        
        // Cerrar modal
        closeEditUserModal();
        
        // Recargar lista de usuarios
        loadUsersList();
        
        showNotification('Datos actualizados correctamente', 'success');
        
    } catch (error) {
        console.error('Error guardando cambios del usuario:', error);
        showNotification('Error al guardar los cambios. Por favor, inténtelo de nuevo.', 'error');
    }
}

function deleteUser(email) {
    if (confirm(`¿Estás seguro de que quieres eliminar al usuario ${email}?`)) {
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const updatedUsers = users.filter(user => user.email !== email);
        localStorage.setItem('users', JSON.stringify(updatedUsers));
        loadUsersList();
        showNotification('Datos eliminados correctamente', 'success');
    }
}

// Funciones auxiliares para gestión de administradores
// Editar administrador
function editAdmin(adminId) {
    // Asegurar que administrators esté cargado
    loadAdministrators();
    
    const admin = administrators.find(a => a.id === parseInt(adminId) || a.id === adminId || a.id.toString() === adminId.toString());
    if (!admin) {
        showNotification('Administrador no encontrado', 'error');
        return;
    }
    
    // Verificar que no se está editando a sí mismo si es el único admin
    const isCurrentAdmin = currentUser && (currentUser.email === admin.email || currentUser.adminId === admin.id);
    
    // Crear modal de edición
    const modalContent = `
        <div class="modal-content" style="max-width: 600px;">
            <div class="modal-header">
                <h3>✏️ Editar Administrador</h3>
                <span class="close" onclick="closeGenericModal()">&times;</span>
            </div>
            <div class="modal-body">
                <form id="editAdminForm">
                    <input type="hidden" id="editAdminId" value="${admin.id}">
                    <div class="form-group">
                        <label for="editAdminName">Nombre completo:</label>
                        <input type="text" id="editAdminName" value="${admin.name}" required>
                    </div>
                    <div class="form-group">
                        <label for="editAdminEmail">Correo electrónico:</label>
                        <input type="email" id="editAdminEmail" value="${admin.email}" required>
                    </div>
                    <div class="form-group">
                        <label for="editAdminPassword">Nueva contraseña (dejar vacío para no cambiar):</label>
                        <input type="password" id="editAdminPassword" placeholder="Dejar vacío para mantener la actual">
                    </div>
                    <div class="form-group">
                        <label for="editAdminPasswordConfirm">Confirmar nueva contraseña:</label>
                        <input type="password" id="editAdminPasswordConfirm" placeholder="Confirmar nueva contraseña">
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="editAdminActive" ${admin.isActive ? 'checked' : ''}>
                            Administrador activo
                        </label>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="closeGenericModal()">Cancelar</button>
                <button class="btn btn-primary" onclick="saveEditedAdmin()">Guardar Cambios</button>
            </div>
        </div>
    `;
    
    // Crear o actualizar modal genérico
    let modal = document.getElementById('genericModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'genericModal';
        modal.className = 'modal';
        document.body.appendChild(modal);
    }
    
    modal.innerHTML = modalContent;
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}
// Guardar administrador editado
function saveEditedAdmin() {
    const adminId = document.getElementById('editAdminId').value;
    const name = document.getElementById('editAdminName').value.trim();
    const email = document.getElementById('editAdminEmail').value.trim();
    const password = document.getElementById('editAdminPassword').value;
    const passwordConfirm = document.getElementById('editAdminPasswordConfirm').value;
    const isActive = document.getElementById('editAdminActive').checked;
    
    if (!name || !email) {
        showNotification('Por favor complete todos los campos obligatorios', 'error');
        return;
    }
    
    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showNotification('Por favor ingrese un email válido', 'error');
        return;
    }
    
    // Buscar administrador
    const adminIndex = administrators.findIndex(a => a.id === parseInt(adminId) || a.id === adminId || a.id.toString() === adminId.toString());
    if (adminIndex === -1) {
        showNotification('Administrador no encontrado', 'error');
        return;
    }
    
    const admin = administrators[adminIndex];
    
    // Verificar si el email ya existe en otro administrador
    if (email !== admin.email && administrators.some(a => a.email === email && a.id !== admin.id)) {
        showNotification('Ya existe un administrador con este correo electrónico', 'error');
        return;
    }
    
    // Verificar si se cambió la contraseña
    if (password) {
        if (password !== passwordConfirm) {
            showNotification('Las contraseñas no coinciden', 'error');
            return;
        }
        if (password.length < 6) {
            showNotification('La contraseña debe tener al menos 6 caracteres', 'error');
            return;
        }
        
        // Confirmación explícita para cambiar contraseña
        if (!confirm(`¿Estás seguro de que quieres cambiar la contraseña del administrador "${admin.name}"?\n\nEsta acción no se puede deshacer.`)) {
            return;
        }
        
        admin.password = password;
    }
    
    // Actualizar datos
    admin.name = name;
    admin.email = email;
    admin.isActive = isActive;
    admin.updatedAt = new Date().toISOString();
    admin.updatedBy = currentUser ? currentUser.email : 'system';
    
    // Guardar
    localStorage.setItem('administrators', JSON.stringify(administrators));
    
    // Si es el usuario actual, actualizar sesión
    if (currentUser && (currentUser.email === admin.email || currentUser.adminId === admin.id)) {
        currentUser.email = email;
        currentUser.name = name;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
    }
    
    // Actualizar lista
        loadAdminsList();
    
    // Cerrar modal
    closeGenericModal();
    
    showNotification(`Administrador "${name}" actualizado correctamente`, 'success');
}

// Eliminar administrador
function deleteAdmin(adminId) {
    // Asegurar que administrators esté cargado
    loadAdministrators();
    
    const admin = administrators.find(a => a.id === parseInt(adminId) || a.id === adminId || a.id.toString() === adminId.toString());
    if (!admin) {
        showNotification('Administrador no encontrado', 'error');
        return;
    }
    
    // Verificar que no se está eliminando a sí mismo
    const isCurrentAdmin = currentUser && (currentUser.email === admin.email || currentUser.adminId === admin.id);
    if (isCurrentAdmin) {
        showNotification('No puedes eliminar tu propia cuenta de administrador', 'error');
        return;
    }
    
    // Verificar que no sea el super admin
    if (admin.email === SUPER_ADMIN.email) {
        showNotification('No se puede eliminar el Super Administrador', 'error');
        return;
    }
    
    if (!confirm(`¿Estás seguro de que quieres eliminar al administrador "${admin.name}" (${admin.email})?\n\nEsta acción no se puede deshacer.`)) {
        return;
    }
    
    // Eliminar
    const adminIdNum = parseInt(adminId);
    administrators = administrators.filter(a => {
        return a.id !== adminIdNum && a.id.toString() !== adminId.toString() && a.id !== admin.id;
    });
    
    localStorage.setItem('administrators', JSON.stringify(administrators));
    
    // Actualizar lista
    loadAdminsList();
    
    showNotification(`Administrador "${admin.name}" eliminado correctamente`, 'success');
}

// ===== CONFIGURACIÓN DE SECCIONES =====

// Abrir modal de configuración de sección
function openSeccionConfig(type) {
    const config = seccionesConfig[type];
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            <h2>Configurar Sección</h2>
            <form id="seccionConfigForm">
                <input type="hidden" id="seccionType" value="${type}">
                
                <div class="form-group">
                    <label for="seccionTitle">Título de la Sección:</label>
                    <input type="text" id="seccionTitle" value="${config.title}" required>
                </div>
                
                <div class="form-group">
                    <label for="seccionIcon">Icono (Emoji):</label>
                    <input type="text" id="seccionIcon" value="${config.icon}" maxlength="2" required>
                    <small style="color: #666;">Usa un emoji o símbolo (ej: 🏥, 🚗, 📞, ⚕️, 🏛️)</small>
                </div>
                
                <div class="form-group">
                    <label for="seccionDescription">Descripción:</label>
                    <textarea id="seccionDescription" rows="2">${config.description}</textarea>
                    <small style="color: #666;">Descripción opcional que aparecerá como subtítulo</small>
                </div>
                
                <div class="modal-footer">
                    <button type="button" class="btn btn-outline" onclick="this.closest('.modal').remove()">Cancelar</button>
                    <button type="button" class="btn btn-primary" onclick="saveSeccionConfig(this)">Guardar</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
}

// Guardar configuración de sección
function saveSeccionConfig(button) {
    const modal = button.closest('.modal');
    const type = document.getElementById('seccionType').value;
    const title = document.getElementById('seccionTitle').value.trim();
    const icon = document.getElementById('seccionIcon').value.trim();
    const description = document.getElementById('seccionDescription').value.trim();
    
    if (!title || !icon) {
        alert('El título y el icono son obligatorios');
        return;
    }
    
    // Actualizar configuración
    seccionesConfig[type] = {
        title: title,
        icon: icon,
        description: description
    };
    
    // Guardar en localStorage
    saveSeccionesConfig();
    
    // Actualizar títulos en el panel de administración
    updateSectionTitles();
    
    // Actualizar servicios en la página principal
    renderServicios();
    
    // Cerrar modal
    modal.remove();
    
    showNotification('Configuración de sección guardada correctamente', 'success');
}

// Actualizar títulos de secciones en el panel de administración
function updateSectionTitles() {
    const medicalTitle = document.getElementById('medicalSectionTitle');
    const itvTitle = document.getElementById('itvSectionTitle');
    
    if (medicalTitle) {
        medicalTitle.textContent = `${seccionesConfig.medical.icon} ${seccionesConfig.medical.title}`;
    }
    if (itvTitle) {
        itvTitle.textContent = `${seccionesConfig.itv.icon} ${seccionesConfig.itv.title}`;
    }
}

// ===== MIGRACIÓN Y SINCRONIZACIÓN DE USUARIOS =====

// Migrar usuarios del localStorage a Firestore
async function migrateUsersToFirestore() {
    try {
        // Verificar si ya se migró
        const migrationDone = localStorage.getItem('usersMigratedToFirestore');
        if (migrationDone === 'true') {
            // Cargar usuarios desde Firestore
            await loadUsersFromFirestore();
            return;
        }
        
        // Obtener usuarios del localStorage
        const localUsers = JSON.parse(localStorage.getItem('users') || '[]');
        
        if (localUsers.length === 0) {
            console.log('No hay usuarios locales para migrar');
            // Esperar a que Firebase esté listo antes de cargar
            await loadUsersFromFirestore();
            return;
        }
        
        // Esperar a que Firebase esté inicializado
        const firebaseReady = await waitForFirebase();
        if (!firebaseReady || !window.firebase || !window.firebase.firestore) {
            console.warn('⚠️ Firebase no disponible, usando localStorage como fallback');
            loadUsersFromLocalStorage();
            return;
        }
        
        console.log(`Migrando ${localUsers.length} usuarios a Firestore...`);
        
        // Migrar cada usuario a Firestore
        for (const user of localUsers) {
            try {
                await window.firebase.firestore().collection('users').add({
                    nombre: user.nombre || user.name || '',
                    apellidos: user.apellidos || (user.surname1 ? `${user.surname1}${user.surname2 ? ' ' + user.surname2 : ''}` : '') || '',
                    surname1: user.surname1 || '',
                    surname2: user.surname2 || '',
                    fullName: user.fullName || '',
                    email: user.email || '',
                    telefono: user.telefono || user.phone || '',
                    direccion: user.direccion || user.address || '',
                    ciudad: user.ciudad || user.city || '',
                    codigoPostal: user.codigoPostal || user.postalCode || '',
                    documentType: user.documentType || '',
                    documentTypeName: user.documentTypeName || '',
                    documentNumber: user.documentNumber || user.dni || '',
                    dni: user.dni || user.documentNumber || '',
                    notificationConsent: user.notificationConsent || false,
                    localities: user.localities || [],
                    fcmToken: user.fcmToken || '',
                    registeredFrom: 'WEB_MIGRATION',
                    registrationDate: new Date(),
                    originalId: user.id || Date.now().toString()
                });
                console.log(`✅ Usuario migrado: ${user.email}`);
            } catch (error) {
                console.error(`❌ Error migrando usuario ${user.email}:`, error);
            }
        }
        
        // Marcar migración como completada
        localStorage.setItem('usersMigratedToFirestore', 'true');
        console.log('✅ Migración completada');
        
        // Cargar usuarios desde Firestore
        await loadUsersFromFirestore();
        
    } catch (error) {
        console.error('Error en la migración:', error);
        // Si hay error, mantener usuarios locales
        loadUsersFromLocalStorage();
    }
}
// Función auxiliar para esperar a que Firebase esté inicializado
async function waitForFirebase(maxWait = 5000) {
    if (window.firebase && window.firebase.firestore) {
        return true;
    }
    
    return new Promise((resolve) => {
        let waited = 0;
        const checkInterval = 100;
        const interval = setInterval(() => {
            waited += checkInterval;
            if (window.firebase && window.firebase.firestore) {
                clearInterval(interval);
                resolve(true);
            } else if (waited >= maxWait) {
                clearInterval(interval);
                console.warn('⚠️ Firebase no se inicializó en el tiempo esperado');
                resolve(false);
            }
        }, checkInterval);
        
        // También escuchar el evento personalizado
        window.addEventListener('firebaseReady', () => {
            clearInterval(interval);
            resolve(true);
        }, { once: true });
    });
}

// Cargar usuarios desde Firestore
async function loadUsersFromFirestore() {
    try {
        // Esperar a que Firebase esté inicializado
        const firebaseReady = await waitForFirebase();
        if (!firebaseReady || !window.firebase || !window.firebase.firestore) {
            console.warn('⚠️ Firebase no disponible, usando localStorage como fallback');
            loadUsersFromLocalStorage();
            return;
        }
        
        const snapshot = await window.firebase.firestore().collection('users').get();
        users = [];
        
        snapshot.forEach(doc => {
            const userData = doc.data();
            users.push({
                id: doc.id,
                name: userData.nombre || userData.name || '',
                surname1: userData.surname1 || '',
                surname2: userData.surname2 || '',
                fullName: userData.fullName || userData.nombre || userData.name || '',
                nombre: userData.nombre || userData.name || '',
                apellidos: userData.apellidos || (userData.surname1 ? `${userData.surname1}${userData.surname2 ? ' ' + userData.surname2 : ''}` : '') || '',
                email: userData.email || '',
                phone: userData.telefono || userData.phone || '',
                telefono: userData.telefono || userData.phone || '',
                address: userData.direccion || userData.address || '',
                direccion: userData.direccion || userData.address || '',
                city: userData.ciudad || userData.city || '',
                ciudad: userData.ciudad || userData.city || '',
                postalCode: userData.codigoPostal || userData.postalCode || '',
                codigoPostal: userData.codigoPostal || userData.postalCode || '',
                documentType: userData.documentType || '',
                documentTypeName: userData.documentTypeName || '',
                documentNumber: userData.documentNumber || userData.dni || '',
                dni: userData.dni || userData.documentNumber || '',
                notificationConsent: userData.notificationConsent || false,
                localities: userData.localities || [],
                fcmToken: userData.fcmToken || '',
                lastNotificationError: userData.lastNotificationError || '',
                registeredFrom: userData.registeredFrom || 'WEB',
                registrationDate: userData.registrationDate || new Date()
            });
        });
        
        // Actualizar localStorage como respaldo con verificación
        localStorage.setItem('users', JSON.stringify(users));
        
        // Verificar que se guardó correctamente en localStorage
        setTimeout(() => {
            const verification = JSON.parse(localStorage.getItem('users') || '[]');
            if (verification.length !== users.length) {
                console.error('❌ Error: usuarios no se guardaron correctamente en localStorage, reintentando...');
                localStorage.setItem('users', JSON.stringify(users));
            }
        }, 100);
        
        console.log(`✅ Cargados ${users.length} usuarios desde Firestore`);
        
        // Actualizar estadísticas
        refreshStatistics();
        actualizarEstadisticasNotificaciones();

        checkPushTokenStatusForCurrentUser();
        
    } catch (error) {
        console.error('Error cargando usuarios desde Firestore:', error);
        // Fallback a localStorage
        loadUsersFromLocalStorage();
    }
}

// Cargar usuarios desde localStorage (fallback)
function loadUsersFromLocalStorage() {
    users = JSON.parse(localStorage.getItem('users') || '[]');
    console.log(`✅ Cargados ${users.length} usuarios desde localStorage`);
    refreshStatistics();
    actualizarEstadisticasNotificaciones();

    checkPushTokenStatusForCurrentUser();
}

// Sincronizar usuario con Firestore (mejorado con validación y seguridad)
async function syncUserToFirestore(userData) {
    try {
        // Esperar a que Firebase esté inicializado
        const firebaseReady = await waitForFirebase();
        if (!firebaseReady || !window.firebase || !window.firebase.firestore) {
            Logger.warn('⚠️ Firebase no disponible, usuario guardado solo en localStorage');
            // Guardar en localStorage como fallback seguro
            if (typeof safeLocalStorageSet === 'function') {
                const currentUsers = safeLocalStorageGet('users', []);
                currentUsers.push(userData);
                safeLocalStorageSet('users', currentUsers);
            }
            return;
        }
        
        // Preparar datos para Firestore
        const firestoreData = {
            nombre: userData.nombre || userData.name || '',
            apellidos: userData.apellidos || (userData.surname1 ? `${userData.surname1}${userData.surname2 ? ' ' + userData.surname2 : ''}` : '') || '',
            surname1: userData.surname1 || '',
            surname2: userData.surname2 || '',
            fullName: userData.fullName || '',
            email: userData.email,
            telefono: userData.telefono || userData.phone || '',
            direccion: userData.direccion || userData.address || '',
            ciudad: userData.ciudad || userData.city || '',
            codigoPostal: userData.codigoPostal || userData.postalCode || '',
            documentType: userData.documentType || '',
            documentTypeName: userData.documentTypeName || '',
            documentNumber: userData.documentNumber || userData.dni || '',
            dni: userData.dni || userData.documentNumber || '',
            notificationConsent: userData.notificationConsent || false,
            localities: userData.localities || [],
            fcmToken: userData.fcmToken || '',
            lastNotificationError: userData.lastNotificationError || null,
            registeredFrom: 'WEB',
            registrationDate: new Date()
        };
        
        // Usar función segura con validación y reintentos si está disponible
        if (typeof safeFirestoreWrite === 'function') {
            await safeFirestoreWrite('users', firestoreData, 'user');
        } else {
            // Fallback al método original si las utilidades no están disponibles
            await window.firebase.firestore().collection('users').add(firestoreData);
        }
        
        Logger.log('✅ Usuario sincronizado con Firestore');
    } catch (error) {
        Logger.error('Error sincronizando usuario:', error);
        // Manejar error de forma amigable
        if (typeof handleError === 'function') {
            handleError(error, 'Error al sincronizar usuario. Los datos se guardaron localmente.');
        }
        // Guardar en localStorage como fallback
        if (typeof safeLocalStorageSet === 'function') {
            const currentUsers = safeLocalStorageGet('users', []);
            currentUsers.push(userData);
            safeLocalStorageSet('users', currentUsers);
        }
    }
}

// ===== PWA (Progressive Web App) =====

// Registrar Service Worker para PWA
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('✅ Service Worker registrado exitosamente:', registration.scope);
                    
                    // Verificar actualizaciones
                    registration.addEventListener('updatefound', () => {
                        const newWorker = registration.installing;
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                // Nueva versión disponible
                                if (confirm('Nueva versión disponible. ¿Recargar la página?')) {
                                    window.location.reload();
                                }
                            }
                        });
                    });
                })
                .catch(error => {
                    console.log('❌ Error registrando Service Worker:', error);
                });
        });
    }
}

// Instalar PWA
function installPWA() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(registration => {
            if (registration.waiting) {
                registration.waiting.postMessage({ action: 'skipWaiting' });
            }
        });
    }
}

// Mostrar banner de instalación PWA
function showPWAInstallBanner() {
    window.addEventListener('beforeinstallprompt', (e) => {
        // Prevenir que se muestre automáticamente
        e.preventDefault();
        deferredPwaPrompt = e;
        clearPwaInstalledFlag();
        if (typeof Metrics !== 'undefined' && Metrics && typeof Metrics.recordEvent === 'function') {
            Metrics.recordEvent('pwa', 'beforeinstallprompt_captured', {
                platform: detectDevicePlatform()
            });
        }
        renderPwaInstallBanner(true);
    });
    
    const platform = detectDevicePlatform();
    if (platform !== 'android') {
        setTimeout(() => renderPwaInstallBanner(), 1000);
    }

    if (typeof Metrics !== 'undefined' && Metrics && typeof Metrics.recordEvent === 'function') {
        Metrics.recordEvent('pwa', 'banner_schedule', {
            platform
        });
    }
}

window.installPWAApp = () => handlePwaInstallOption('android');

window.closePWAInstallBanner = () => {
    const banner = document.getElementById('pwa-install-banner');
    if (banner) {
        banner.classList.remove('visible');
        setTimeout(() => banner.remove(), 150);
    }
    closePwaInstructionModal();
    if (typeof Metrics !== 'undefined' && Metrics && typeof Metrics.recordEvent === 'function') {
        Metrics.recordEvent('pwa', 'install_banner_closed', {
            platform: detectDevicePlatform()
        });
    }
};

if (typeof window !== 'undefined') {
    window.addEventListener('appinstalled', () => {
        markPwaInstalled();
        closePWAInstallBanner();
        if (typeof Metrics !== 'undefined' && Metrics && typeof Metrics.recordEvent === 'function') {
            Metrics.recordEvent('pwa', 'appinstalled', {
                platform: detectDevicePlatform()
            });
        }
    });

    if (window.matchMedia) {
        const standaloneMatcher = window.matchMedia('(display-mode: standalone)');
        if (standaloneMatcher) {
            const updateStandaloneStatus = (event) => {
                if (event.matches) {
                    markPwaInstalled();
                    if (typeof Metrics !== 'undefined' && Metrics && typeof Metrics.recordEvent === 'function') {
                        Metrics.recordEvent('pwa', 'display_mode_standalone', {
                            platform: detectDevicePlatform()
                        });
                    }
                }
            };
            if (typeof standaloneMatcher.addEventListener === 'function') {
                standaloneMatcher.addEventListener('change', updateStandaloneStatus);
            } else if (typeof standaloneMatcher.addListener === 'function') {
                standaloneMatcher.addListener(updateStandaloneStatus);
            }
        }
    }
}

// Inicializar PWA
function initializePWA() {
    registerServiceWorker();
    
    // Inicializar soporte para Huawei si está disponible
    if (typeof initHuaweiSupport === 'function') {
        initHuaweiSupport();
    } else {
        // Fallback: mostrar banner estándar
        showPWAInstallBanner();
    }

    if (isRunningStandalone()) {
        markPwaInstalled();
    }
    
    // Configurar recepción de notificaciones
    setupNotificationReception();

    validatePwaInstallationStatus(false);
    setTimeout(() => validatePwaInstallationStatus(true), 5000);
    setInterval(() => validatePwaInstallationStatus(true), 60 * 60 * 1000);
}

// ===== SISTEMA DE NOTIFICACIONES RECIBIDAS =====

// Configurar recepción de notificaciones
function setupNotificationReception() {
    // Escuchar notificaciones push en tiempo real
    if ('serviceWorker' in navigator && 'PushManager' in window) {
        navigator.serviceWorker.ready.then(registration => {
            // Escuchar mensajes del service worker
            navigator.serviceWorker.addEventListener('message', event => {
                if (event.data.type === 'NOTIFICATION_RECEIVED') {
                    handleReceivedNotification(event.data.notification);
                }
            });
        });
    }
    
    // Cargar notificaciones recibidas al iniciar
    loadReceivedNotifications();
}

// Manejar notificación recibida
function handleReceivedNotification(notificationData) {
    console.log('Aviso recibido en la web:', notificationData);
    
    // Agregar a la lista de notificaciones recibidas
    addReceivedNotificationToList(notificationData);
    
    // Actualizar contador
    updateNotificationBadge();
    
    // Mostrar notificación visual si está disponible
    if (Notification.permission === 'granted') {
        showWebNotification(notificationData);
    }
}
// Mostrar notificación web
function showWebNotification(notificationData) {
    const options = {
        body: notificationData.message || notificationData.body,
        icon: '/images/escudo-cobreros.png',
        badge: '/images/escudo-cobreros.png',
        tag: 'ayuntamiento-notification',
        data: notificationData
    };
    
    new Notification(notificationData.title || '🏛️ Ayuntamiento de Cobreros', options);
}
// Cargar notificaciones recibidas desde Firestore
async function loadReceivedNotifications() {
    try {
        // Esperar a que Firebase esté inicializado
        const firebaseReady = await waitForFirebase();
        if (!firebaseReady || !window.firebase || !window.firebase.firestore) {
            console.warn('⚠️ Firebase no disponible para cargar notificaciones');
            return;
        }
        
        // Usar get() y ordenar en memoria si orderBy falla
        let snapshot;
        try {
            snapshot = await window.firebase.firestore()
                .collection('notifications')
                .where('sentTo', '==', 'WEB')
                .orderBy('timestamp', 'desc')
                .limit(50)
                .get();
        } catch (orderByError) {
            // Si orderBy falla (falta índice), obtener todos y ordenar en memoria
            Logger.warn('orderBy falló, ordenando en memoria:', orderByError);
            const allDocs = await window.firebase.firestore()
                .collection('notifications')
                .where('sentTo', '==', 'WEB')
                .get();
            
            // Ordenar en memoria
            const sortedDocs = allDocs.docs.sort((a, b) => {
                const aTime = a.data().timestamp?.toMillis?.() || a.data().timestamp || 0;
                const bTime = b.data().timestamp?.toMillis?.() || b.data().timestamp || 0;
                return bTime - aTime;
            }).slice(0, 50);
            
            // Crear un objeto similar a snapshot
            snapshot = {
                forEach: (callback) => sortedDocs.forEach(callback),
                docs: sortedDocs
            };
        }
        
        const receivedNotifications = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            receivedNotifications.push({
                id: doc.id,
                ...data
            });
        });
        
        displayReceivedNotifications(receivedNotifications);
    } catch (error) {
        console.error('Error cargando notificaciones recibidas:', error);
    }
}

// Mostrar notificaciones recibidas en la interfaz
function displayReceivedNotifications(notifications) {
    const container = document.getElementById('receivedNotificationsList');
    if (!container) return;
    
    if (notifications.length === 0) {
        container.innerHTML = '<p class="no-notifications">No hay avisos recibidos</p>';
        selectedReceivedNotifications.clear();
        updateReceivedNotificationsActions();
        return;
    }
    
    const sanitizedSet = new Set();
    const itemsHtml = notifications.map(notification => {
        const isSelected = selectedReceivedNotifications.has(notification.id);
        if (isSelected) {
            sanitizedSet.add(notification.id);
        }
        return `
        <div class="notification-item received ${isSelected ? 'selected' : ''}" data-id="${notification.id}">
            <div class="notification-header">
                <span class="notification-type ${notification.type}">
                    ${getTypeIcon(notification.type)} ${notification.type.toUpperCase()}
                </span>
                <label class="notification-select">
                    <input type="checkbox" onchange="toggleReceivedNotificationSelection('${notification.id}', this.checked)" ${isSelected ? 'checked' : ''}>
                    Seleccionar
                </label>
                <span class="notification-time">
                    ${formatNotificationTime(notification.timestamp)}
                </span>
            </div>
            <div class="notification-content">
                <h4>${notification.title}</h4>
                <p>${notification.message}</p>
                ${notification.localities ? `<p class="notification-localities">📍 ${notification.localities}</p>` : ''}
                ${notification.hasAttachments ? '<p class="notification-attachment">📎 Archivo adjunto</p>' : ''}
                <p class="notification-source">Enviado desde: ${notification.sentFrom}</p>
            </div>
            <div class="notification-actions">
                ${notification.hasAttachments ? '<button onclick="downloadAttachment(\'' + notification.attachmentUrl + '\')" class="btn btn-small">📥 Descargar</button>' : ''}
                <button onclick="markNotificationAsRead('${notification.id}')" class="btn btn-small">✓ Leído</button>
            </div>
        </div>
    `;
    }).join('');

    // Eliminar selecciones que ya no existen
    selectedReceivedNotifications = sanitizedSet;
    
    container.innerHTML = itemsHtml;
    updateReceivedNotificationsActions();

    if (notifications.length > 0 && container.style.display === 'none') {
        container.style.display = 'block';
        const toggleText = document.getElementById('notificationsToggleText');
        if (toggleText) {
            toggleText.textContent = 'Ocultar recibidas';
        }
    }
}

// Alternar vista de notificaciones
function toggleNotificationsView() {
    const receivedList = document.getElementById('receivedNotificationsList');
    const toggleText = document.getElementById('notificationsToggleText');
    
    if (receivedList.style.display === 'none') {
        receivedList.style.display = 'block';
        toggleText.textContent = 'Ocultar recibidas';
        loadReceivedNotifications();
    } else {
        receivedList.style.display = 'none';
        toggleText.textContent = 'Ver recibidas';
    }
}

function toggleUserNotificationSelection(notificationId, isChecked) {
    if (isChecked) {
        selectedUserNotifications.add(notificationId);
    } else {
        selectedUserNotifications.delete(notificationId);
    }

    const notificationElement = document.querySelector(`#notificationsList [data-id="${notificationId}"]`);
    if (notificationElement) {
        notificationElement.classList.toggle('selected', isChecked);
    }

    updateUserNotificationsActions();
}

function updateUserNotificationsActions() {
    const deleteBtn = document.getElementById('deleteUserNotificationsBtn');
    if (deleteBtn) {
        const count = selectedUserNotifications.size;
        deleteBtn.disabled = count === 0;
        deleteBtn.textContent = count > 0
            ? `🗑️ Eliminar (${count})`
            : '🗑️ Eliminar seleccionadas';
    }
}

function toggleReceivedNotificationSelection(notificationId, isChecked) {
    if (isChecked) {
        selectedReceivedNotifications.add(notificationId);
    } else {
        selectedReceivedNotifications.delete(notificationId);
    }

    const notificationElement = document.querySelector(`[data-id="${notificationId}"]`);
    if (notificationElement) {
        notificationElement.classList.toggle('selected', isChecked);
    }

    updateReceivedNotificationsActions();
}

function updateReceivedNotificationsActions() {
    const deleteBtn = document.getElementById('deleteSelectedNotificationsBtn');
    if (deleteBtn) {
        const count = selectedReceivedNotifications.size;
        deleteBtn.disabled = count === 0;
        deleteBtn.textContent = count > 0
            ? `🗑️ Eliminar (${count})`
            : '🗑️ Eliminar seleccionadas';
    }
}

// Actualizar notificaciones recibidas
async function refreshReceivedNotifications() {
    const refreshBtn = document.getElementById('refreshReceivedNotificationsBtn');
    if (refreshBtn) {
        refreshBtn.disabled = true;
        refreshBtn.dataset.originalText = refreshBtn.textContent;
        refreshBtn.textContent = 'Actualizando...';
    }

    try {
        await loadReceivedNotifications();
        showNotification('Avisos actualizados', 'success');
    } catch (error) {
        console.error('Error actualizando notificaciones:', error);
        showNotification('No se pudieron actualizar los avisos', 'error');
    } finally {
        if (refreshBtn) {
            refreshBtn.disabled = false;
            refreshBtn.textContent = refreshBtn.dataset.originalText || '🔄 Actualizar';
        }
    }
}

async function deleteSelectedNotifications() {
    if (selectedReceivedNotifications.size === 0) {
        return;
    }

    if (!confirm(`¿Eliminar ${selectedReceivedNotifications.size} notificación(es) seleccionadas?`)) {
        return;
    }

    try {
        const firebaseReady = await waitForFirebase();
        if (!firebaseReady || !window.firebase || !window.firebase.firestore) {
            showNotification('Firebase no está disponible para eliminar avisos', 'error');
            return;
        }

        const idsToDelete = Array.from(selectedReceivedNotifications);
        const failed = [];

        for (const id of idsToDelete) {
            try {
                await window.firebase.firestore()
                    .collection('notifications')
                    .doc(id)
                    .delete();
            } catch (error) {
                console.error('Error eliminando notificación:', id, error);
                failed.push(id);
            }
        }

        if (failed.length === 0) {
            showNotification('Avisos eliminados correctamente', 'success');
        } else {
            showNotification(`Algunos avisos no se pudieron eliminar (${failed.length}).`, 'warning');
        }

        selectedReceivedNotifications.clear();
        updateReceivedNotificationsActions();
        await loadReceivedNotifications();
    } catch (error) {
        console.error('Error eliminando notificaciones seleccionadas:', error);
        showNotification('No se pudieron eliminar los avisos seleccionados', 'error');
    }
}

function deleteSelectedUserNotifications() {
    if (selectedUserNotifications.size === 0) {
        return;
    }

    if (!confirm(`¿Eliminar ${selectedUserNotifications.size} notificación(es) seleccionadas?`)) {
        return;
    }

    const idsToDelete = Array.from(selectedUserNotifications).map(String);

    if (notifications.length > 0) {
        notifications = notifications.filter(notification => !idsToDelete.includes(String(notification.id)));
        localStorage.setItem('notifications', JSON.stringify(notifications));
    }

    const savedUserNotifications = localStorage.getItem('userNotifications');
    if (savedUserNotifications) {
        try {
            const parsed = JSON.parse(savedUserNotifications);
            const filtered = parsed.filter(notification => !idsToDelete.includes(String(notification.id)));
            localStorage.setItem('userNotifications', JSON.stringify(filtered));
        } catch (error) {
            console.warn('No se pudieron actualizar las notificaciones del usuario:', error);
        }
    }

    selectedUserNotifications.clear();
    updateUserNotificationsActions();
    updateNotificationCenter();
    showNotification('Avisos seleccionados eliminados', 'success');
}

// Obtener icono según el tipo
function getTypeIcon(type) {
    const icons = {
        'emergencia': '🚨',
        'cita': '📅',
        'evento': '🎉',
        'bando': '📢',
        'general': '🏛️'
    };
    return icons[type] || '🏛️';
}

// Formatear tiempo de notificación
function formatNotificationTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Hace un momento';
    if (diff < 3600000) return `Hace ${Math.floor(diff / 60000)} minutos`;
    if (diff < 86400000) return `Hace ${Math.floor(diff / 3600000)} horas`;
    return date.toLocaleDateString('es-ES');
}

// Marcar notificación como leída
async function markNotificationAsRead(notificationId) {
    try {
        // Esperar a que Firebase esté inicializado
        const firebaseReady = await waitForFirebase();
        if (!firebaseReady || !window.firebase || !window.firebase.firestore) {
            console.warn('⚠️ Firebase no disponible para marcar notificación como leída');
            return;
        }
        
        await window.firebase.firestore()
            .collection('notifications')
            .doc(notificationId)
            .update({ read: true });
        
        // Remover de la lista
        selectedReceivedNotifications.delete(notificationId);
        const notificationElement = document.querySelector(`[data-id="${notificationId}"]`);
        if (notificationElement) {
            notificationElement.remove();
        }
        updateReceivedNotificationsActions();
        
        showNotification('Aviso marcado como leído', 'success');
    } catch (error) {
        console.error('Error marcando notificación como leída:', error);
    }
}

// ===== SISTEMA DE NOTIFICACIONES PUSH - TURISTEAM =====

// Enviar notificación push con filtrado por localidades usando Firebase Functions
// Sistema mejorado: usa Firebase Functions (más seguro, no requiere Server Key en frontend)
async function enviarNotificacionPushConLocalidades(titulo, mensaje, tipo = 'general', alcance = 'todos', localidadesSeleccionadas = [], hasAttachments = false, attachmentUrl = null, attachmentType = null) {
    try {
        console.log('🔔 Enviando notificación push usando Firebase Functions');
        
        // Preparar datos para Firebase Function
        const requestData = {
            title: titulo,
            message: mensaje,
            type: tipo,
            scope: alcance === 'localities' ? 'localities' : 'all',
            localities: alcance === 'localities' ? localidadesSeleccionadas : [],
            adminEmail: currentUser ? currentUser.email : 'admin',
            textFont: '',
            textSize: '',
            textColor: ''
        };

        // Enviar a Firebase Function
        const response = await fetch(`${CLOUD_FUNCTIONS_BASE_URL}/sendPushNotification`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });

        const result = await response.json();

        if (result.success) {
            // Mostrar estadísticas
            const stats = result.stats || {};
            let mensaje = `Aviso enviado: ${stats.sent || 0} exitosos`;
            
            if (stats.failed > 0) {
                mensaje += `, ${stats.failed} fallidos`;
            }
            
            if (alcance === 'localities' && localidadesSeleccionadas.length > 0) {
                mensaje += ` en: ${localidadesSeleccionadas.join(', ')}`;
            }

            if (stats && typeof stats === 'object' && Object.keys(stats).length > 0) {
                try {
                    localStorage.setItem('notificationsStatsSummary', JSON.stringify(stats));
                } catch (storageError) {
                    console.warn('No se pudo guardar el resumen de estadísticas de notificaciones:', storageError);
                }
            }

            refreshNotificationStats();
            
            showNotification(mensaje, 'success');
            
            // Log detallado
            console.log('✅ Aviso enviado exitosamente:', {
                titulo,
                tipo,
                alcance,
                localidades: localidadesSeleccionadas,
                estadisticas: stats
            });
            
            return true;
        } else {
            console.error('❌ Error en Firebase Function:', result.error || result.message);
            showNotification(result.message || 'Error al enviar notificación', 'error');
            return false;
        }

    } catch (error) {
        console.error('❌ Error al enviar notificación push:', error);
        showNotification('Error al enviar notificación push. Verifique la conexión.', 'error');
        return false;
    }
}

// Función original para compatibilidad (envía a todos)
async function enviarNotificacionPush(titulo, mensaje, tipo = 'general') {
    return await enviarNotificacionPushConLocalidades(titulo, mensaje, tipo, 'all', []);
}

// Enviar notificación de cita confirmada
function enviarNotificacionCita() {
    const titulo = prompt('Título de la notificación de cita:', 'Cita Confirmada - Ayuntamiento de Cobreros');
    if (titulo) {
        const mensaje = prompt('Mensaje de la notificación:', 'Su cita ha sido confirmada. Por favor, acuda a la hora indicada.');
        if (mensaje) {
    enviarNotificacionPush(titulo, mensaje, 'cita');
        }
    }
}

// Enviar notificación de evento
function enviarNotificacionEvento() {
    const titulo = prompt('Título del evento:', 'Nuevo Evento - Ayuntamiento de Cobreros');
    if (titulo) {
        const mensaje = prompt('Descripción del evento:', 'Se ha programado un nuevo evento municipal. Más información próximamente.');
        if (mensaje) {
    enviarNotificacionPush(titulo, mensaje, 'evento');
        }
    }
}

// Enviar notificación de bando
function enviarNotificacionBando() {
    const titulo = prompt('Título del bando:', 'Nuevo Bando Municipal');
    if (titulo) {
        const mensaje = prompt('Descripción del bando:', 'Se ha publicado un nuevo bando municipal. Consulte la información completa en la web.');
        if (mensaje) {
    enviarNotificacionPush(titulo, mensaje, 'bando');
        }
    }
}

// Enviar notificación de emergencia
function enviarNotificacionEmergencia(mensaje) {
    if (!mensaje) {
        mensaje = prompt('Mensaje de emergencia:', 'Comunicado urgente del Ayuntamiento. Por favor, preste atención a esta información.');
    }
    if (mensaje) {
    const titulo = '🚨 EMERGENCIA - Ayuntamiento de Cobreros';
    enviarNotificacionPush(titulo, mensaje, 'emergencia');
    }
}

let notificationMessageEditor = null;

function updateNotificationHiddenField() {
    const hiddenField = document.getElementById('notifMessage');
    if (!hiddenField) {
        return;
    }
    if (!notificationMessageEditor) {
        hiddenField.value = hiddenField.value || '';
        return;
    }
    const textContent = notificationMessageEditor.getText().trim();
    hiddenField.value = textContent.length ? notificationMessageEditor.root.innerHTML.trim() : '';
}

function getNotificationMessageContent() {
    if (notificationMessageEditor) {
        const textContent = notificationMessageEditor.getText().trim();
        return {
            text: textContent,
            html: textContent.length ? notificationMessageEditor.root.innerHTML.trim() : ''
        };
    }
    const hiddenField = document.getElementById('notifMessage');
    const value = hiddenField ? hiddenField.value.trim() : '';
    return {
        text: value,
        html: value
    };
}
// Configurar formulario de notificaciones
function setupNotificationForm() {
    // Mostrar/ocultar localidades según selección
    const destinatariosRadios = document.querySelectorAll('input[name="destinatarios"]');
    const localidadesGroup = document.getElementById('localidadesGroup');
    
    destinatariosRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            if (this.value === 'localidades') {
                localidadesGroup.style.display = 'block';
            } else {
                localidadesGroup.style.display = 'none';
                // Desmarcar todas las localidades
                document.querySelectorAll('input[name="localidades"]').forEach(checkbox => {
                    checkbox.checked = false;
                });
            }
        });
    });
    
    // Configurar envío del formulario
    const form = document.getElementById('notificationForm');
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            await enviarNotificacionDesdeFormulario();
        });
    }

    if (window.Quill && document.getElementById('notifMessageEditor')) {
        if (!notificationMessageEditor) {
            notificationMessageEditor = new Quill('#notifMessageEditor', {
                theme: 'snow',
                placeholder: 'Escribe el contenido de la notificación...',
                modules: {
                    toolbar: [
                        [{ header: [1, 2, false] }],
                        ['bold', 'italic', 'underline'],
                        [{ list: 'ordered' }, { list: 'bullet' }],
                        ['link'],
                        ['clean']
                    ]
                }
            });
            notificationMessageEditor.on('text-change', updateNotificationHiddenField);
        }
        updateNotificationHiddenField();
    }
}

// Enviar notificación desde el formulario
async function enviarNotificacionDesdeFormulario() {
    const tituloInput = document.getElementById('notifTitle');
    const tipoSelect = document.getElementById('notifType');
    const attachmentInput = document.getElementById('notifAttachment');
    const destinatariosInput = document.querySelector('input[name="destinatarios"]:checked');
    const sendEmailCheckbox = document.getElementById('notifSendEmail');
    const submitBtn = document.querySelector('#notificationForm button[type="submit"]');

    const titulo = tituloInput ? tituloInput.value.trim() : '';
    const tipo = tipoSelect ? tipoSelect.value : '';
    const archivo = attachmentInput && attachmentInput.files ? attachmentInput.files[0] : null;
    const destinatarios = destinatariosInput ? destinatariosInput.value : 'todos';
    const { text: mensajePlano } = getNotificationMessageContent();
    const mensaje = mensajePlano;

    if (!titulo) {
        showNotification('Por favor, ingrese un título para la notificación.', 'error');
        return;
    }
    
    if (!tipo) {
        showNotification('Seleccione un tipo de notificación.', 'error');
        return;
    }
    
    let localidades = [];
    if (destinatarios === 'localidades') {
        const localidadesSeleccionadas = Array.from(document.querySelectorAll('input[name="localidades"]:checked'));
        if (localidadesSeleccionadas.length === 0) {
            showNotification('Seleccione al menos una localidad.', 'error');
            return;
        }
        localidades = localidadesSeleccionadas.map(cb => cb.value);
    }

    const alcance = destinatarios === 'localidades' ? 'localities' : 'all';
    const tieneAdjunto = !!archivo;
    const sendEmail = sendEmailCheckbox ? sendEmailCheckbox.checked : false;

    let attachmentMeta = null;
    if (archivo) {
        try {
            if (typeof uploadAttachment === 'function') {
                showNotification('Subiendo documento adjunto, por favor espera…', 'info');
                const entityId = (currentUser && (currentUser.uid || currentUser.id)) ||
                    (currentUser && currentUser.email ? currentUser.email.replace(/[^a-zA-Z0-9]/g, '_') : 'admin');
                const uploadResult = await uploadAttachment(archivo, {
                    folder: 'uploads/notifications',
                    entityId: entityId || 'admin',
                    metadata: {
                        context: 'notification_attachment',
                        notificationTitle: titulo,
                        notificationType: tipo
                    },
                    allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'],
                    maxSize: 10 * 1024 * 1024
                });
                attachmentMeta = {
                    name: archivo.name,
                    url: uploadResult.url,
                    storagePath: uploadResult.storagePath,
                    size: uploadResult.size,
                    type: uploadResult.contentType || archivo.type || 'application/octet-stream',
                    uploadedAt: uploadResult.uploadedAt || new Date().toISOString()
                };
                showNotification('Documento adjunto subido correctamente.', 'success');
            } else {
                const dataUrl = await readFileAsDataURL(archivo, 10 * 1024 * 1024);
                attachmentMeta = {
                    name: archivo.name,
                    url: dataUrl,
                    size: archivo.size,
                    type: archivo.type
                };
            }
        } catch (uploadError) {
            console.error('❌ Error subiendo el adjunto de la notificación:', uploadError);
            const friendlyMessage = getFriendlyStorageErrorMessage(uploadError);
            showNotification(friendlyMessage, 'error');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.classList.remove('loading');
            }
            return;
        }
    }

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.classList.add('loading');
    }

    try {
        const result = await registerLocalNotificationRecord(titulo, mensaje, tipo, attachmentMeta, {
            scope: alcance,
            localities: localidades,
            sendPush: true,
            sendEmail
        });

        if (result?.notification) {
            limpiarFormularioNotificacion();
        }
    } catch (error) {
        console.error('❌ Error al enviar la notificación:', error);
        showNotification('No se pudo enviar la notificación. Revise la consola para más detalles.', 'error');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.classList.remove('loading');
        }
    }
}

// Limpiar formulario de notificación
function limpiarFormularioNotificacion() {
    document.getElementById('notificationForm').reset();
    document.getElementById('localidadesGroup').style.display = 'none';
    document.querySelector('input[name="destinatarios"][value="todos"]').checked = true;
    const sendEmailCheckbox = document.getElementById('notifSendEmail');
    if (sendEmailCheckbox) {
        sendEmailCheckbox.checked = false;
    }
    if (notificationMessageEditor) {
        notificationMessageEditor.setContents([]);
    }
    updateNotificationHiddenField();
}

// Abrir modal para enviar notificación personalizada
function abrirModalNotificacion() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            <h2>📱 Enviar aviso push</h2>
            <form id="notificacionForm">
                <div class="form-group">
                    <label for="notifTitulo">Título:</label>
                    <input type="text" id="notifTitulo" required placeholder="Ej: Nueva noticia importante">
                </div>
                
                <div class="form-group">
                    <label for="notifMensaje">Mensaje:</label>
                    <textarea id="notifMensaje" rows="3" required placeholder="Escribe el mensaje que quieres enviar..."></textarea>
                </div>
                
                <div class="form-group">
                    <label for="notifTipo">Tipo de notificación:</label>
                    <select id="notifTipo">
                        <option value="general">General</option>
                        <option value="cita">Cita</option>
                        <option value="evento">Evento</option>
                        <option value="bando">Bando</option>
                        <option value="emergencia">Emergencia</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="notifArchivo">Archivo adjunto (opcional):</label>
                    <input type="file" id="notifArchivo" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif">
                    <small style="color: #666;">Puedes adjuntar documentos, imágenes o archivos PDF</small>
                </div>
                
                <div class="form-group">
                    <label for="notifAlcance">Alcance de la notificación:</label>
                    <select id="notifAlcance" onchange="toggleLocalidadesSelection()">
                        <option value="todos">Todos los usuarios</option>
                        <option value="localidades">Localidades específicas</option>
                    </select>
                </div>
                
                <div class="form-group" id="localidadesSelection" style="display: none;">
                    <label>Seleccionar localidades:</label>
                    <div class="localities-controls" style="margin-bottom: 1rem;">
                        <button type="button" class="btn btn-outline btn-small" onclick="seleccionarTodasLocalidades()">
                            <i class="fas fa-check-square"></i> Seleccionar Todas
                        </button>
                        <button type="button" class="btn btn-outline btn-small" onclick="deseleccionarTodasLocalidades()">
                            <i class="fas fa-square"></i> Deseleccionar Todas
                        </button>
                    </div>
                    <div class="localities-selection">
                        <div class="localities-grid">
                            <label class="locality-checkbox">
                                <input type="checkbox" name="notifLocalities" value="Cobreros">
                                <span>Cobreros</span>
                            </label>
                            <label class="locality-checkbox">
                                <input type="checkbox" name="notifLocalities" value="Avedillo de Sanabria">
                                <span>Avedillo de Sanabria</span>
                            </label>
                            <label class="locality-checkbox">
                                <input type="checkbox" name="notifLocalities" value="Barrio de Lomba">
                                <span>Barrio de Lomba</span>
                            </label>
                            <label class="locality-checkbox">
                                <input type="checkbox" name="notifLocalities" value="Castro de Sanabria">
                                <span>Castro de Sanabria</span>
                            </label>
                            <label class="locality-checkbox">
                                <input type="checkbox" name="notifLocalities" value="Limianos">
                                <span>Limianos</span>
                            </label>
                            <label class="locality-checkbox">
                                <input type="checkbox" name="notifLocalities" value="Quintana de Sanabria">
                                <span>Quintana de Sanabria</span>
                            </label>
                            <label class="locality-checkbox">
                                <input type="checkbox" name="notifLocalities" value="Riego de Lomba">
                                <span>Riego de Lomba</span>
                            </label>
                            <label class="locality-checkbox">
                                <input type="checkbox" name="notifLocalities" value="San Martín del Terroso">
                                <span>San Martín del Terroso</span>
                            </label>
                            <label class="locality-checkbox">
                                <input type="checkbox" name="notifLocalities" value="San Miguel de Lomba">
                                <span>San Miguel de Lomba</span>
                            </label>
                            <label class="locality-checkbox">
                                <input type="checkbox" name="notifLocalities" value="San Román de Sanabria">
                                <span>San Román de Sanabria</span>
                            </label>
                            <label class="locality-checkbox">
                                <input type="checkbox" name="notifLocalities" value="Santa Colomba">
                                <span>Santa Colomba</span>
                            </label>
                            <label class="locality-checkbox">
                                <input type="checkbox" name="notifLocalities" value="Sotillo">
                                <span>Sotillo</span>
                            </label>
                            <label class="locality-checkbox">
                                <input type="checkbox" name="notifLocalities" value="Terroso">
                                <span>Terroso</span>
                            </label>
                        </div>
                    </div>
                </div>
                
                <div class="modal-footer">
                    <button type="button" class="btn btn-outline" onclick="this.closest('.modal').remove()">Cancelar</button>
                    <button type="button" class="btn btn-primary" onclick="enviarNotificacionPersonalizada(this)">Enviar</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
}

// Toggle para mostrar/ocultar selección de localidades
function toggleLocalidadesSelection() {
    const alcance = document.getElementById('notifAlcance').value;
    const localidadesDiv = document.getElementById('localidadesSelection');
    
    if (alcance === 'localidades') {
        localidadesDiv.style.display = 'block';
    } else {
        localidadesDiv.style.display = 'none';
    }
}

// Seleccionar todas las localidades
function seleccionarTodasLocalidades() {
    const checkboxes = document.querySelectorAll('input[name="notifLocalities"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = true;
    });
    showNotification('Todas las localidades seleccionadas', 'success');
}

// Deseleccionar todas las localidades
function deseleccionarTodasLocalidades() {
    const checkboxes = document.querySelectorAll('input[name="notifLocalities"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
    });
    showNotification('Todas las localidades deseleccionadas', 'success');
}

// Enviar notificación personalizada
function enviarNotificacionPersonalizada(button) {
    const modal = button.closest('.modal');
    const titulo = document.getElementById('notifTitulo').value.trim();
    const mensaje = document.getElementById('notifMensaje').value.trim();
    const tipo = document.getElementById('notifTipo').value;
    const alcance = document.getElementById('notifAlcance').value;
    const archivoAdjunto = document.getElementById('notifArchivo');
    
    if (!titulo || !mensaje) {
        alert('Por favor, completa todos los campos');
        return;
    }
    
    // Obtener localidades seleccionadas si es necesario
    let localidadesSeleccionadas = [];
    if (alcance === 'localidades') {
        const localityCheckboxes = modal.querySelectorAll('input[name="notifLocalities"]:checked');
        localityCheckboxes.forEach(checkbox => {
            localidadesSeleccionadas.push(checkbox.value);
        });
        
        if (localidadesSeleccionadas.length === 0) {
            alert('Por favor, selecciona al menos una localidad');
            return;
        }
    }
    
    // Verificar si hay archivo adjunto
    let hasAttachments = false;
    let attachmentUrl = null;
    let attachmentType = null;
    
    if (archivoAdjunto && archivoAdjunto.files.length > 0) {
        hasAttachments = true;
        // Aquí se subiría el archivo a Firebase Storage
        // Por ahora simulamos la URL
        attachmentUrl = "https://firebasestorage.googleapis.com/...";
        attachmentType = archivoAdjunto.files[0].type;
    }
    
    enviarNotificacionPushConLocalidades(titulo, mensaje, tipo, alcance, localidadesSeleccionadas, hasAttachments, attachmentUrl, attachmentType);
    modal.remove();
}

// Actualizar estadísticas de notificaciones
function actualizarEstadisticasNotificaciones() {
    const usuariosConNotificaciones = users.filter(user => 
        user.notificationConsent && user.fcmToken
    );
    
    const contador = document.getElementById('contadorUsuarios');
    if (contador) {
        contador.textContent = usuariosConNotificaciones.length;
    }
    
    // Mostrar estadísticas por localidad
    const estadisticasPorLocalidad = {};
    usuariosConNotificaciones.forEach(usuario => {
        if (usuario.localities) {
            usuario.localities.forEach(localidad => {
                if (!estadisticasPorLocalidad[localidad]) {
                    estadisticasPorLocalidad[localidad] = 0;
                }
                estadisticasPorLocalidad[localidad]++;
            });
        }
    });
    
    console.log('Estadísticas por localidad:', estadisticasPorLocalidad);
    
    const contadorNotificaciones = document.getElementById('contadorNotificaciones');
    if (contadorNotificaciones) {
        const totalEnviadas = parseInt(localStorage.getItem('notificationsSentCount') || '0', 10);
        contadorNotificaciones.textContent = totalEnviadas.toString();
    }

    refreshNotificationStats();
}

// Mostrar modal de descarga de APK
function mostrarDescargaAPK() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            <h2>📲 Configurar Descarga de APK</h2>
            <form id="apkConfigForm">
                <div class="form-group">
                    <label for="apkUrl">URL de descarga de la APK:</label>
                    <input type="url" id="apkUrl" placeholder="https://tu-dominio.com/app.apk">
                    <small style="color: #666;">URL donde estará alojada la aplicación APK</small>
                </div>
                
                <div class="form-group">
                    <label for="apkVersion">Versión de la APK:</label>
                    <input type="text" id="apkVersion" placeholder="1.0.0">
                </div>
                
                <div class="form-group">
                    <label for="apkDescripcion">Descripción de la aplicación:</label>
                    <textarea id="apkDescripcion" rows="3" placeholder="Aplicación oficial del Ayuntamiento de Cobreros para recibir avisos push..."></textarea>
                </div>
                
                <div class="form-group">
                    <label for="apkTamaño">Tamaño de la APK:</label>
                    <input type="text" id="apkTamaño" placeholder="15 MB">
                </div>
                
                <div class="modal-footer">
                    <button type="button" class="btn btn-outline" onclick="this.closest('.modal').remove()">Cancelar</button>
                    <button type="button" class="btn btn-primary" onclick="guardarConfiguracionAPK(this)">Guardar</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
}

// Guardar configuración de APK
function guardarConfiguracionAPK(button) {
    const modal = button.closest('.modal');
    const apkUrl = document.getElementById('apkUrl').value.trim();
    const apkVersion = document.getElementById('apkVersion').value.trim();
    const apkDescripcion = document.getElementById('apkDescripcion').value.trim();
    const apkTamaño = document.getElementById('apkTamaño').value.trim();
    
    if (!apkUrl || !apkVersion) {
        alert('Por favor, completa la URL y la versión de la APK');
        return;
    }
    
    // Guardar configuración en localStorage
    const apkConfig = {
        url: apkUrl,
        version: apkVersion,
        descripcion: apkDescripcion,
        tamaño: apkTamaño,
        fechaActualizacion: new Date().toISOString()
    };
    
    localStorage.setItem('apkConfig', JSON.stringify(apkConfig));
    
    // Crear sección de descarga en la página principal
    crearSeccionDescargaAPK(apkConfig);
    
    modal.remove();
    showNotification('Configuración de APK guardada correctamente', 'success');
}

// Crear sección de descarga de APK en la página principal
function crearSeccionDescargaAPK(config) {
    // Buscar si ya existe la sección
    let seccionAPK = document.getElementById('descargaAPK');
    
    if (!seccionAPK) {
        // Crear nueva sección
        seccionAPK = document.createElement('section');
        seccionAPK.id = 'descargaAPK';
        seccionAPK.className = 'content-section';
        seccionAPK.innerHTML = `
            <div class="container">
                <h2>📲 Aplicación Móvil</h2>
                <div class="app-download-card">
                    <div class="app-info">
                        <h3>Ayuntamiento de Cobreros</h3>
                        <p>Versión ${config.version}</p>
                        <p>${config.descripcion}</p>
                        <p><strong>Tamaño:</strong> ${config.tamaño}</p>
                        <a href="${config.url}" class="btn btn-primary download-btn" download>
                            <i class="fas fa-download"></i> Descargar APK
                        </a>
                    </div>
                    <div class="app-icon">
                        <img src="images/escudo-cobreros.png" alt="Ayuntamiento de Cobreros" style="width: 100px; height: 100px;">
                    </div>
                </div>
            </div>
        `;
        
        // Insertar después de la sección de servicios
        const serviciosSection = document.getElementById('servicios');
        if (serviciosSection) {
            serviciosSection.parentNode.insertBefore(seccionAPK, serviciosSection.nextSibling);
        }
    } else {
        // Actualizar sección existente
        seccionAPK.querySelector('h3').textContent = 'Ayuntamiento de Cobreros';
        seccionAPK.querySelector('p').textContent = `Versión ${config.version}`;
        seccionAPK.querySelector('.download-btn').href = config.url;
    }
}
// ===== FUNCIONES DE ADMINISTRACIÓN PARA DATOS Y ENLACES =====
// Cargar lista del consultorio médico
function loadConsultorioList() {
    const container = document.getElementById('consultorioList');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (consultorioConfig.documentos.length === 0 && consultorioConfig.fotos.length === 0) {
        container.innerHTML = '<p>No hay contenido disponible para el consultorio médico.</p>';
        return;
    }
    
    let html = '<div class="content-items">';
    
    // Mostrar documentos
    if (consultorioConfig.documentos.length > 0) {
        html += '<div class="content-item"><h5>📋 Documentos:</h5><ul>';
        consultorioConfig.documentos.forEach((doc, index) => {
            html += `<li>${doc.nombre} <button class="btn btn-danger btn-small" onclick="deleteConsultorioDocument(${index})">Eliminar</button></li>`;
        });
        html += '</ul></div>';
    }
    
    // Mostrar fotos
    if (consultorioConfig.fotos.length > 0) {
        html += '<div class="content-item"><h5>📸 Fotos:</h5><ul>';
        consultorioConfig.fotos.forEach((foto, index) => {
            html += `<li>${foto.nombre} <button class="btn btn-danger btn-small" onclick="deleteConsultorioFoto(${index})">Eliminar</button></li>`;
        });
        html += '</ul></div>';
    }
    
    html += '</div>';
    container.innerHTML = html;
}

// Cargar lista de ITV
function loadItvList() {
    const container = document.getElementById('itvList');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (consultorioConfig.documentos.length === 0 && consultorioConfig.fotos.length === 0) {
        container.innerHTML = '<p>No hay contenido disponible para ITV.</p>';
        return;
    }
    
    let html = '<div class="content-items">';
    
    // Mostrar documentos
    if (consultorioConfig.documentos.length > 0) {
        html += '<div class="content-item"><h5>📋 Documentos:</h5><ul>';
        consultorioConfig.documentos.forEach((doc, index) => {
            html += `<li>${doc.nombre} <button class="btn btn-danger btn-small" onclick="deleteConsultorioDocument(${index})">Eliminar</button></li>`;
        });
        html += '</ul></div>';
    }
    
    // Mostrar fotos
    if (consultorioConfig.fotos.length > 0) {
        html += '<div class="content-item"><h5>📸 Fotos:</h5><ul>';
        consultorioConfig.fotos.forEach((foto, index) => {
            html += `<li>${foto.nombre} <button class="btn btn-danger btn-small" onclick="deleteConsultorioFoto(${index})">Eliminar</button></li>`;
        });
        html += '</ul></div>';
    }
    
    html += '</div>';
    container.innerHTML = html;
}

// Abrir modal del consultorio médico
function openConsultorioModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            <h2>🏥 Editar Consultorio Médico</h2>
            <div class="modal-tabs">
                <button class="tab-btn active" onclick="showConsultorioTab('documentos')">📋 Documentos</button>
                <button class="tab-btn" onclick="showConsultorioTab('fotos')">📸 Fotos</button>
            </div>
            <div id="consultorioDocumentosTab" class="tab-content active">
                <h3>Documentos del Consultorio</h3>
                <div class="content-actions">
                    <button class="btn btn-primary" onclick="openConsultorioDocumentModal()">
                        <i class="fas fa-plus"></i> Añadir Documento
                    </button>
                </div>
                <div id="consultorioDocumentosList"></div>
            </div>
            <div id="consultorioFotosTab" class="tab-content">
                <h3>Fotos del Consultorio</h3>
                <div class="content-actions">
                    <button class="btn btn-primary" onclick="openConsultorioFotoModal()">
                        <i class="fas fa-plus"></i> Añadir Foto
                    </button>
                </div>
                <div id="consultorioFotosList"></div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    loadConsultorioDocumentosInModal();
    loadConsultorioFotosInModal();
}

// Abrir modal de ITV
function openItvModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            <h2>🚗 Editar ITV - Puebla de Sanabria</h2>
            <div class="modal-tabs">
                <button class="tab-btn active" onclick="showItvTab('documentos')">📋 Documentos</button>
                <button class="tab-btn" onclick="showItvTab('fotos')">📸 Fotos</button>
            </div>
            <div id="itvDocumentosTab" class="tab-content active">
                <h3>Documentos de ITV</h3>
                <div class="content-actions">
                    <button class="btn btn-primary" onclick="openItvDocumentModal()">
                        <i class="fas fa-plus"></i> Añadir Documento
                    </button>
                </div>
                <div id="itvDocumentosList"></div>
            </div>
            <div id="itvFotosTab" class="tab-content">
                <h3>Fotos de ITV</h3>
                <div class="content-actions">
                    <button class="btn btn-primary" onclick="openItvFotoModal()">
                        <i class="fas fa-plus"></i> Añadir Foto
                    </button>
                </div>
                <div id="itvFotosList"></div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    loadItvDocumentosInModal();
    loadItvFotosInModal();
}

// Mostrar pestaña del consultorio
function showConsultorioTab(tabName) {
    // Ocultar todas las pestañas
    document.querySelectorAll('#consultorioDocumentosTab, #consultorioFotosTab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Desactivar todos los botones
    document.querySelectorAll('.modal .tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Mostrar la pestaña seleccionada
    document.getElementById('consultorio' + tabName.charAt(0).toUpperCase() + tabName.slice(1) + 'Tab').classList.add('active');
    
    // Activar el botón correspondiente
    event.target.classList.add('active');
}
// Mostrar pestaña de ITV
function showItvTab(tabName) {
    // Ocultar todas las pestañas
    document.querySelectorAll('#itvDocumentosTab, #itvFotosTab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Desactivar todos los botones
    document.querySelectorAll('.modal .tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Mostrar la pestaña seleccionada
    document.getElementById('itv' + tabName.charAt(0).toUpperCase() + tabName.slice(1) + 'Tab').classList.add('active');
    
    // Activar el botón correspondiente
    event.target.classList.add('active');
}

// Cargar documentos del consultorio en el modal
function loadConsultorioDocumentosInModal() {
    const container = document.getElementById('consultorioDocumentosList');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (consultorioConfig.documentos.length === 0) {
        container.innerHTML = '<p>No hay documentos disponibles.</p>';
        return;
    }
    
    consultorioConfig.documentos.forEach((doc, index) => {
        const docItem = document.createElement('div');
        docItem.className = 'content-item';
        docItem.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 1rem;">
                <div>
                    <h5>${doc.nombre}</h5>
                    <p>${doc.descripcion || 'Sin descripción'}</p>
                    <a href="${doc.url}" target="_blank" class="btn btn-outline btn-small">Ver Documento</a>
                </div>
                <button class="btn btn-danger btn-small" onclick="deleteConsultorioDocument(${index})">
                    <i class="fas fa-trash"></i> Eliminar
                </button>
            </div>
        `;
        container.appendChild(docItem);
    });
}

// Cargar fotos del consultorio en el modal
function loadConsultorioFotosInModal() {
    const container = document.getElementById('consultorioFotosList');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (consultorioConfig.fotos.length === 0) {
        container.innerHTML = '<p>No hay fotos disponibles.</p>';
        return;
    }
    
    consultorioConfig.fotos.forEach((foto, index) => {
        const fotoItem = document.createElement('div');
        fotoItem.className = 'content-item';
        fotoItem.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 1rem;">
                <div>
                    <h5>${foto.nombre}</h5>
                    <p>${foto.descripcion || 'Sin descripción'}</p>
                    <img src="${foto.url}" alt="${foto.nombre}" style="width: 100px; height: 100px; object-fit: cover; border-radius: 4px;">
                </div>
                <button class="btn btn-danger btn-small" onclick="deleteConsultorioFoto(${index})">
                    <i class="fas fa-trash"></i> Eliminar
                </button>
            </div>
        `;
        container.appendChild(fotoItem);
    });
}

// Cargar documentos de ITV en el modal
function loadItvDocumentosInModal() {
    const container = document.getElementById('itvDocumentosList');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (consultorioConfig.documentos.length === 0) {
        container.innerHTML = '<p>No hay documentos disponibles.</p>';
        return;
    }
    
    consultorioConfig.documentos.forEach((doc, index) => {
        const docItem = document.createElement('div');
        docItem.className = 'content-item';
        docItem.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 1rem;">
                <div>
                    <h5>${doc.nombre}</h5>
                    <p>${doc.descripcion || 'Sin descripción'}</p>
                    <a href="${doc.url}" target="_blank" class="btn btn-outline btn-small">Ver Documento</a>
                </div>
                <button class="btn btn-danger btn-small" onclick="deleteConsultorioDocument(${index})">
                    <i class="fas fa-trash"></i> Eliminar
                </button>
            </div>
        `;
        container.appendChild(docItem);
    });
}

// Cargar fotos de ITV en el modal
function loadItvFotosInModal() {
    const container = document.getElementById('itvFotosList');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (consultorioConfig.fotos.length === 0) {
        container.innerHTML = '<p>No hay fotos disponibles.</p>';
        return;
    }
    
    consultorioConfig.fotos.forEach((foto, index) => {
        const fotoItem = document.createElement('div');
        fotoItem.className = 'content-item';
        fotoItem.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 1rem;">
                <div>
                    <h5>${foto.nombre}</h5>
                    <p>${foto.descripcion || 'Sin descripción'}</p>
                    <img src="${foto.url}" alt="${foto.nombre}" style="width: 100px; height: 100px; object-fit: cover; border-radius: 4px;">
                </div>
                <button class="btn btn-danger btn-small" onclick="deleteConsultorioFoto(${index})">
                    <i class="fas fa-trash"></i> Eliminar
                </button>
            </div>
        `;
        container.appendChild(fotoItem);
    });
}

// Abrir modal para añadir documento del consultorio
function openConsultorioDocumentModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            <h2>📋 Añadir Documento del Consultorio</h2>
            <form id="consultorioDocumentForm" enctype="multipart/form-data">
                <div class="form-group">
                    <label for="docNombre">Nombre del documento:</label>
                    <input type="text" id="docNombre" required>
                </div>
                <div class="form-group">
                    <label for="docDescripcion">Descripción:</label>
                    <textarea id="docDescripcion" rows="3"></textarea>
                </div>
                <div class="form-group">
                    <label for="docFile">Subir archivo (PDF, JPG, PNG):</label>
                    <input type="file" id="docFile" accept=".pdf,.jpg,.jpeg,.png" onchange="handleFileUpload('docFile', 'docUrl')">
                </div>
                <div class="form-group">
                    <label for="docUrl">O URL del documento:</label>
                    <input type="url" id="docUrl" placeholder="https://ejemplo.com/documento.pdf">
                </div>
                <div class="form-group">
                    <small>Puedes subir un archivo o proporcionar una URL. Si subes un archivo, se usará automáticamente.</small>
                </div>
                <button type="submit" class="btn btn-primary">Añadir Documento</button>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
    
    document.getElementById('consultorioDocumentForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const fileInput = document.getElementById('docFile');
        const urlInput = document.getElementById('docUrl');
        
        let documentUrl = urlInput.value;
        
        // Si se subió un archivo, crear una URL local
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            documentUrl = URL.createObjectURL(file);
        }
        
        if (!documentUrl) {
            showNotification('Debes subir un archivo o proporcionar una URL', 'error');
            return;
        }
        
        const nuevoDocumento = {
            nombre: document.getElementById('docNombre').value,
            descripcion: document.getElementById('docDescripcion').value,
            url: documentUrl,
            fileName: fileInput.files.length > 0 ? fileInput.files[0].name : null
        };
        
        consultorioConfig.documentos.push(nuevoDocumento);
        saveConsultorioConfig();
        loadConsultorioDocumentosInModal();
        loadConsultorioList();
        renderServicios();
        
        modal.remove();
        showNotification('Documento añadido correctamente', 'success');
    });
}

// Abrir modal para añadir foto del consultorio
function openConsultorioFotoModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            <h2>📸 Añadir Foto del Consultorio</h2>
            <form id="consultorioFotoForm" enctype="multipart/form-data">
                <div class="form-group">
                    <label for="fotoNombre">Nombre de la foto:</label>
                    <input type="text" id="fotoNombre" required>
                </div>
                <div class="form-group">
                    <label for="fotoDescripcion">Descripción:</label>
                    <textarea id="fotoDescripcion" rows="3"></textarea>
                </div>
                <div class="form-group">
                    <label for="fotoFile">Subir imagen (JPG, PNG, GIF):</label>
                    <input type="file" id="fotoFile" accept=".jpg,.jpeg,.png,.gif" onchange="handleFileUpload('fotoFile', 'fotoUrl')">
                </div>
                <div class="form-group">
                    <label for="fotoUrl">O URL de la imagen:</label>
                    <input type="url" id="fotoUrl" placeholder="https://ejemplo.com/imagen.jpg">
                </div>
                <div class="form-group">
                    <small>Puedes subir una imagen o proporcionar una URL. Si subes un archivo, se usará automáticamente.</small>
                </div>
                <button type="submit" class="btn btn-primary">Añadir Foto</button>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
    
    document.getElementById('consultorioFotoForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const fileInput = document.getElementById('fotoFile');
        const urlInput = document.getElementById('fotoUrl');
        
        let fotoUrl = urlInput.value;
        
        // Si se subió un archivo, crear una URL local
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            fotoUrl = URL.createObjectURL(file);
        }
        
        if (!fotoUrl) {
            showNotification('Debes subir una imagen o proporcionar una URL', 'error');
            return;
        }
        
        const nuevaFoto = {
            nombre: document.getElementById('fotoNombre').value,
            descripcion: document.getElementById('fotoDescripcion').value,
            url: fotoUrl,
            fileName: fileInput.files.length > 0 ? fileInput.files[0].name : null
        };
        
        consultorioConfig.fotos.push(nuevaFoto);
        saveConsultorioConfig();
        loadConsultorioFotosInModal();
        loadConsultorioList();
        renderServicios();
        
        modal.remove();
        showNotification('Foto añadida correctamente', 'success');
    });
}

// Abrir modal para añadir documento de ITV
function openItvDocumentModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            <h2>📋 Añadir Documento de ITV</h2>
            <form id="itvDocumentForm" enctype="multipart/form-data">
                <div class="form-group">
                    <label for="itvDocNombre">Nombre del documento:</label>
                    <input type="text" id="itvDocNombre" required>
                </div>
                <div class="form-group">
                    <label for="itvDocDescripcion">Descripción:</label>
                    <textarea id="itvDocDescripcion" rows="3"></textarea>
                </div>
                <div class="form-group">
                    <label for="itvDocFile">Subir archivo (PDF, JPG, PNG):</label>
                    <input type="file" id="itvDocFile" accept=".pdf,.jpg,.jpeg,.png" onchange="handleFileUpload('itvDocFile', 'itvDocUrl')">
                </div>
                <div class="form-group">
                    <label for="itvDocUrl">O URL del documento:</label>
                    <input type="url" id="itvDocUrl" placeholder="https://ejemplo.com/documento.pdf">
                </div>
                <div class="form-group">
                    <small>Puedes subir un archivo o proporcionar una URL. Si subes un archivo, se usará automáticamente.</small>
                </div>
                <button type="submit" class="btn btn-primary">Añadir Documento</button>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
    
    document.getElementById('itvDocumentForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const fileInput = document.getElementById('itvDocFile');
        const urlInput = document.getElementById('itvDocUrl');
        
        let documentUrl = urlInput.value;
        
        // Si se subió un archivo, crear una URL local
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            documentUrl = URL.createObjectURL(file);
        }
        
        if (!documentUrl) {
            showNotification('Debes subir un archivo o proporcionar una URL', 'error');
            return;
        }
        
        const nuevoDocumento = {
            nombre: document.getElementById('itvDocNombre').value,
            descripcion: document.getElementById('itvDocDescripcion').value,
            url: documentUrl,
            fileName: fileInput.files.length > 0 ? fileInput.files[0].name : null
        };
        
        consultorioConfig.documentos.push(nuevoDocumento);
        saveConsultorioConfig();
        loadItvDocumentosInModal();
        loadItvList();
        renderServicios();
        
        modal.remove();
        showNotification('Documento añadido correctamente', 'success');
    });
}

// Abrir modal para añadir foto de ITV
function openItvFotoModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            <h2>📸 Añadir Foto de ITV</h2>
            <form id="itvFotoForm" enctype="multipart/form-data">
                <div class="form-group">
                    <label for="itvFotoNombre">Nombre de la foto:</label>
                    <input type="text" id="itvFotoNombre" required>
                </div>
                <div class="form-group">
                    <label for="itvFotoDescripcion">Descripción:</label>
                    <textarea id="itvFotoDescripcion" rows="3"></textarea>
                </div>
                <div class="form-group">
                    <label for="itvFotoFile">Subir imagen (JPG, PNG, GIF):</label>
                    <input type="file" id="itvFotoFile" accept=".jpg,.jpeg,.png,.gif" onchange="handleFileUpload('itvFotoFile', 'itvFotoUrl')">
                </div>
                <div class="form-group">
                    <label for="itvFotoUrl">O URL de la imagen:</label>
                    <input type="url" id="itvFotoUrl" placeholder="https://ejemplo.com/imagen.jpg">
                </div>
                <div class="form-group">
                    <small>Puedes subir una imagen o proporcionar una URL. Si subes un archivo, se usará automáticamente.</small>
                </div>
                <button type="submit" class="btn btn-primary">Añadir Foto</button>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
    
    document.getElementById('itvFotoForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const fileInput = document.getElementById('itvFotoFile');
        const urlInput = document.getElementById('itvFotoUrl');
        
        let fotoUrl = urlInput.value;
        
        // Si se subió un archivo, crear una URL local
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            fotoUrl = URL.createObjectURL(file);
        }
        
        if (!fotoUrl) {
            showNotification('Debes subir una imagen o proporcionar una URL', 'error');
            return;
        }
        
        const nuevaFoto = {
            nombre: document.getElementById('itvFotoNombre').value,
            descripcion: document.getElementById('itvFotoDescripcion').value,
            url: fotoUrl,
            fileName: fileInput.files.length > 0 ? fileInput.files[0].name : null
        };
        
        consultorioConfig.fotos.push(nuevaFoto);
        saveConsultorioConfig();
        loadItvFotosInModal();
        loadItvList();
        renderServicios();
        
        modal.remove();
        showNotification('Foto añadida correctamente', 'success');
    });
}

// Función para manejar la subida de archivos
function handleFileUpload(fileInputId, urlInputId) {
    const fileInput = document.getElementById(fileInputId);
    const urlInput = document.getElementById(urlInputId);
    
    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        const fileUrl = URL.createObjectURL(file);
        urlInput.value = fileUrl;
        urlInput.disabled = true;
        urlInput.style.backgroundColor = '#f0f0f0';
    } else {
        urlInput.disabled = false;
        urlInput.style.backgroundColor = '';
    }
}

// Hacer funcional el botón "Editar Configuración" de Teléfonos de Interés
function openTelefonosInteresModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            <h2>📞 Editar Configuración de Teléfonos de Interés</h2>
            <form id="telefonosInteresConfigForm">
                <div class="form-group">
                    <label for="telefonosTitulo">Título de la sección:</label>
                    <input type="text" id="telefonosTitulo" value="${telefonosInteresConfig.titulo}" required>
                </div>
                <div class="form-group">
                    <label for="telefonosIcono">Icono:</label>
                    <input type="text" id="telefonosIcono" value="${telefonosInteresConfig.icono}" maxlength="2">
                </div>
                <div class="form-group">
                    <label for="telefonosDescripcion">Descripción:</label>
                    <textarea id="telefonosDescripcion" rows="3">${telefonosInteresConfig.descripcion}</textarea>
                </div>
                <div class="form-group">
                    <label for="telefonosTarjetaNombre">Nombre de la tarjeta:</label>
                    <input type="text" id="telefonosTarjetaNombre" value="${telefonosInteresConfig.tarjeta.nombre}">
                </div>
                <div class="form-group">
                    <label for="telefonosTarjetaEmoji">Emoji de la tarjeta:</label>
                    <input type="text" id="telefonosTarjetaEmoji" value="${telefonosInteresConfig.tarjeta.emoji}" maxlength="2">
                </div>
                <div class="form-group">
                    <label for="telefonosTarjetaDescripcion">Descripción de la tarjeta:</label>
                    <textarea id="telefonosTarjetaDescripcion" rows="3">${telefonosInteresConfig.tarjeta.descripcion}</textarea>
                </div>
                <button type="submit" class="btn btn-primary">Guardar Configuración</button>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
    
    document.getElementById('telefonosInteresConfigForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        telefonosInteresConfig.titulo = document.getElementById('telefonosTitulo').value;
        telefonosInteresConfig.icono = document.getElementById('telefonosIcono').value;
        telefonosInteresConfig.descripcion = document.getElementById('telefonosDescripcion').value;
        telefonosInteresConfig.tarjeta.nombre = document.getElementById('telefonosTarjetaNombre').value;
        telefonosInteresConfig.tarjeta.emoji = document.getElementById('telefonosTarjetaEmoji').value;
        telefonosInteresConfig.tarjeta.descripcion = document.getElementById('telefonosTarjetaDescripcion').value;
        
        saveTelefonosInteresConfig();
        loadTelefonosElementosList();
        renderServicios();
        
        modal.remove();
        showNotification('Configuración de Teléfonos de Interés guardada correctamente', 'success');
    });
}

// Hacer funcional el botón "Nuevo Elemento" de Teléfonos de Interés
function openTelefonoElementoModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            <h2>📞 Nuevo Elemento de Teléfonos de Interés</h2>
            <form id="telefonoElementoForm">
                <div class="form-group">
                    <label for="elementoNombre">Nombre del elemento:</label>
                    <input type="text" id="elementoNombre" required>
                </div>
                <div class="form-group">
                    <label for="elementoEmoji">Emoji:</label>
                    <input type="text" id="elementoEmoji" maxlength="2" required>
                </div>
                <div class="form-group">
                    <label for="elementoDescripcion">Descripción:</label>
                    <textarea id="elementoDescripcion" rows="3"></textarea>
                </div>
                <div class="form-group">
                    <label for="elementoTipo">Tipo:</label>
                    <select id="elementoTipo" required>
                        <option value="telefonos">📞 Teléfonos</option>
                        <option value="servicio">🏢 Servicio</option>
                        <option value="informacion">ℹ️ Información</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="elementoOrden">Orden de visualización:</label>
                    <input type="number" id="elementoOrden" value="${telefonosInteresConfig.tarjeta.elementos.length + 1}" min="1">
                </div>
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="elementoActivo" checked> Elemento activo
                    </label>
                </div>
                <div class="form-group">
                    <label>Datos del elemento:</label>
                    <div id="elementoDatosContainer">
                        <div class="dato-item">
                            <input type="text" placeholder="Nombre del dato" class="dato-nombre">
                            <input type="text" placeholder="Valor del dato" class="dato-valor">
                            <button type="button" onclick="removeDatoItem(this)" class="btn btn-danger btn-small">Eliminar</button>
                        </div>
                    </div>
                    <button type="button" onclick="addDatoItem()" class="btn btn-secondary btn-small">Añadir Dato</button>
                </div>
                <button type="submit" class="btn btn-primary">Crear Elemento</button>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
    
    document.getElementById('telefonoElementoForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const datos = [];
        document.querySelectorAll('#elementoDatosContainer .dato-item').forEach(item => {
            const nombre = item.querySelector('.dato-nombre').value;
            const valor = item.querySelector('.dato-valor').value;
            if (nombre && valor) {
                datos.push({ nombre, valor });
            }
        });
        
        const nuevoElemento = {
            id: Date.now(),
            nombre: document.getElementById('elementoNombre').value,
            emoji: document.getElementById('elementoEmoji').value,
            descripcion: document.getElementById('elementoDescripcion').value,
            tipo: document.getElementById('elementoTipo').value,
            datos: datos,
            documento: null,
            foto: null,
            orden: parseInt(document.getElementById('elementoOrden').value),
            isActive: document.getElementById('elementoActivo').checked
        };
        
        telefonosInteresConfig.tarjeta.elementos.push(nuevoElemento);
        saveTelefonosInteresConfig();
        loadTelefonosElementosList();
        renderServicios();
        
        modal.remove();
        showNotification('Elemento de teléfono creado correctamente', 'success');
    });
}

// Función para añadir un nuevo dato al elemento
function addDatoItem() {
    const container = document.getElementById('elementoDatosContainer');
    const newItem = document.createElement('div');
    newItem.className = 'dato-item';
    newItem.innerHTML = `
        <input type="text" placeholder="Nombre del dato" class="dato-nombre">
        <input type="text" placeholder="Valor del dato" class="dato-valor">
        <button type="button" onclick="removeDatoItem(this)" class="btn btn-danger btn-small">Eliminar</button>
    `;
    container.appendChild(newItem);
}

// Función para eliminar un dato del elemento
function removeDatoItem(button) {
    button.parentElement.remove();
}

// ===== SISTEMA DE ACORDEÓN DESPLEGABLE PARA CULTURA Y OCIO =====

// Variables globales para gestión de cultura y ocio con acordeones
let culturaOcioData = {
    naturaleza: [],
    patrimonio: [],
    gastronomia: [],
    eventos: [],
    cercanos: []
};
// Función para generar ID único
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
// Función para manejar enlaces de cultura
function handleCulturaLink(type, url, itemId, event) {
    // Prevenir comportamiento por defecto si se pasa el evento
    if (event) {
        event.preventDefault();
    }
    
    // Validar que la URL no esté vacía o sea solo #
    if (!url || url === '#' || url.trim() === '') {
        showNotification('Este enlace aún no tiene una URL configurada. Edítalo desde el panel de administración.', 'info');
        return false;
    }
    
    if (type === 'pdf' || url.toLowerCase().endsWith('.pdf')) {
        // Abrir PDF en nueva ventana
        window.open(url, '_blank');
        console.log('Abriendo PDF:', url);
    } else if (type === 'external' || url.startsWith('http://') || url.startsWith('https://')) {
        // Enlace externo - ya se abre en nueva ventana por target="_blank"
        // Pero si se llama desde onclick, abrir manualmente
        if (event) {
            window.open(url, '_blank');
        }
        console.log('Abriendo enlace externo:', url);
    } else {
        // Enlace local o relativo
        if (url.startsWith('/') || url.startsWith('./') || !url.includes('://')) {
            window.location.href = url;
        } else {
            window.open(url, '_blank');
        }
    }
    
    return false;
}

// Función para alternar el acordeón
function toggleAccordion(sectionId) {
    const accordionItem = document.querySelector(`#${sectionId}-content`).closest('.accordion-item');
    const isActive = accordionItem.classList.contains('active');
    
    // Cerrar todos los acordeones
    document.querySelectorAll('.accordion-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Abrir el seleccionado si no estaba activo
    if (!isActive) {
        accordionItem.classList.add('active');
        
        // Cargar el contenido específico de la sección
        const container = document.getElementById(`${sectionId}Items`);
        if (container && culturaOcioData[sectionId]) {
            renderAccordionSection(sectionId, culturaOcioData[sectionId]);
        }
    }
    
    console.log(`📂 Acordeón ${sectionId} ${isActive ? 'cerrado' : 'abierto'}`);
}
// Cargar contenido inicial de Cobreros
function loadCobrerosContent() {
    // Cargar datos desde localStorage si existen
    const savedData = localStorage.getItem('culturaOcioData');
    if (savedData) {
        try {
            culturaOcioData = JSON.parse(savedData);
            
            // Migración: Actualizar texto de Fiestas Patronales si tiene el texto antiguo
            if (culturaOcioData.eventos && Array.isArray(culturaOcioData.eventos)) {
                culturaOcioData.eventos.forEach(evento => {
                    if (evento.title === "🎭 Fiestas Patronales" && 
                        evento.description && 
                        evento.description.includes("San Martín") && 
                        evento.description.includes("noviembre")) {
                        evento.description = "Fiestas en honor a San Roque con procesiones, verbenas y actividades tradicionales a mediados de agosto.";
                        // Guardar actualización
                        localStorage.setItem('culturaOcioData', JSON.stringify(culturaOcioData));
                        console.log('✅ Actualizado: Fiestas Patronales - San Martín → San Roque, noviembre → mediados de agosto');
                    }
                });
            }
        } catch (e) {
            console.error('Error parseando culturaOcioData:', e);
            culturaOcioData = {
                naturaleza: [],
                patrimonio: [],
                gastronomia: [],
                eventos: [],
                cercanos: []
            };
        }
    }
    
    // Si no hay datos guardados, usar datos por defecto
    if (!savedData || Object.values(culturaOcioData).every(section => section.length === 0)) {
        const cobrerosData = {
            naturaleza: [
                {
                    id: generateId(),
                    title: "🌊 Cascadas de Sotillo",
                    description: "Una de las rutas más populares con cascadas de agua cristalina en un entorno boscoso. Dificultad media, duración 2-3 horas.",
                    image: "images/cascadas-sotillo.jpg",
                    links: [
                        { text: "📋 Guía de Ruta", url: "#", type: "pdf" },
                        { text: "🗺️ Mapa Interactivo", url: "#", type: "external" }
                    ],
                    order: 1
                },
                {
                    id: generateId(),
                    title: "🏞️ Lago de Sanabria",
                    description: "El lago glaciar más grande de España. Superficie de 368 hectáreas y hasta 53 metros de profundidad. Ideal para baño y kayak.",
                    image: "images/lago-sanabria.jpg",
                    links: [
                        { text: "📋 Información Turística", url: "#", type: "pdf" },
                        { text: "🏊 Actividades Acuáticas", url: "#", type: "external" }
                    ],
                    order: 2
                }
            ],
            patrimonio: [
                {
                    id: generateId(),
                    title: "⛪ Iglesia de San Martín",
                    description: "Iglesia del siglo XVI con arquitectura tradicional sanabresa. Destaca su retablo barroco y campanario de piedra.",
                    image: "images/iglesia-san-martin.jpg",
                    links: [
                        { text: "📋 Historia Detallada", url: "#", type: "pdf" },
                        { text: "🕒 Horarios de Visita", url: "#", type: "external" }
                    ],
                    order: 1
                }
            ],
            gastronomia: [
                {
                    id: generateId(),
                    title: "🍄 Recolección de Setas",
                    description: "Cobreros es famoso por sus setas. Temporada de otoño con especies como boletus, cucurril y un sin fin de especies de gran valor culinario.",
                    image: "images/setas-cobreros.jpg",
                    links: [
                        { text: "📋 Guía de Setas", url: "#", type: "pdf" },
                        { text: "🗓️ Calendario de Recolección", url: "#", type: "external" }
                    ],
                    order: 1
                }
            ],
            eventos: [
                {
                    id: generateId(),
                    title: "🎭 Fiestas Patronales",
                    description: "Fiestas en honor a San Roque con procesiones, verbenas y actividades tradicionales a mediados de agosto.",
                    image: "images/fiestas-patronales.jpg",
                    links: [
                        { text: "📋 Programa de Fiestas", url: "#", type: "pdf" },
                        { text: "📅 Calendario de Eventos", url: "#", type: "external" }
                    ],
                    order: 1
                }
            ],
            cercanos: [
                {
                    id: generateId(),
                    title: "🏰 Puebla de Sanabria",
                    description: "Villa medieval con castillo del siglo XV, iglesias históricas y monasterio. Conjunto histórico-artístico de gran belleza arquitectónica.",
                    image: "images/puebla-sanabria.jpg",
                    links: [
                        { text: "📋 Guía Turística", url: "#", type: "pdf" },
                        { text: "🏰 Historia del Castillo", url: "#", type: "external" }
                    ],
                    order: 1
                }
            ]
        };
        
        // Asignar datos por defecto
        culturaOcioData = cobrerosData;
        
        // Guardar datos por defecto en localStorage
        localStorage.setItem('culturaOcioData', JSON.stringify(culturaOcioData));
    }
    
    // Eliminar elemento específico: "Ruta de las Cascadas de Ribadelago"
    if (culturaOcioData.naturaleza && culturaOcioData.naturaleza.length > 0) {
        const initialLength = culturaOcioData.naturaleza.length;
        culturaOcioData.naturaleza = culturaOcioData.naturaleza.filter(item => {
            return !item.title || !item.title.toLowerCase().includes('cascadas de ribadelago');
        });
        if (initialLength !== culturaOcioData.naturaleza.length) {
            localStorage.setItem('culturaOcioData', JSON.stringify(culturaOcioData));
            console.log('✅ Eliminado: Ruta de las Cascadas de Ribadelago');
        }
    }
    
    // Renderizar cada sección
    Object.keys(culturaOcioData).forEach(section => {
        renderAccordionSection(section, culturaOcioData[section]);
    });
    
    console.log('✅ Contenido de Cobreros cargado');
}

// Renderizar una sección del acordeón (con sanitización)
function renderAccordionSection(sectionId, items) {
    const container = document.getElementById(`${sectionId}Items`);
    if (!container) return;
    
    if (items.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #6c757d; padding: 20px;">No hay elementos en esta sección</p>';
        return;
    }
    
    // Usar DocumentFragment para mejor rendimiento
    const fragment = document.createDocumentFragment();
    
    items.forEach(item => {
        // Sanitizar todos los inputs del usuario
        const safeTitle = escapeHtml(item.title || '');
        const safeDescription = escapeHtml(item.description || '');
        const safeImage = item.image ? escapeForHtml(item.image) : '';
        const safeExternalLink = item.externalLink ? escapeForHtml(item.externalLink) : '';
        const safeItemId = escapeHtml(item.id || '');
        
        const card = document.createElement('div');
        card.className = 'accordion-item-card';
        
        // Imagen (si existe y es válida)
        if (safeImage && isValidUrl(safeImage)) {
            const img = document.createElement('img');
            img.src = safeImage;
            img.alt = safeTitle;
            img.className = 'item-image';
            img.onerror = function() { this.style.display = 'none'; };
            card.appendChild(img);
        }
        
        const title = document.createElement('h4');
        title.textContent = safeTitle;
        card.appendChild(title);
        
        const description = document.createElement('p');
        description.textContent = safeDescription;
        card.appendChild(description);
        
        // Enlaces
        if (item.links && item.links.length > 0) {
            const linksDiv = document.createElement('div');
            linksDiv.className = 'item-links';
            
            item.links.filter(link => link.enabled !== false).forEach(link => {
                const linkType = link.type || (link.url && (link.url.toLowerCase().endsWith('.pdf') ? 'pdf' : (link.url.startsWith('http://') || link.url.startsWith('https://') ? 'external' : 'normal')));
                const safeUrl = escapeForHtml(link.url || '');
                const safeLinkText = escapeHtml(link.text || '');
                const safeLinkType = escapeHtml(linkType || 'normal');
                
                // Validar URL antes de crear enlace
                if (!safeUrl || safeUrl === '#') {
                    return; // Saltar enlaces inválidos
                }
                
                const linkElement = document.createElement('a');
                linkElement.href = safeUrl;
                linkElement.className = `item-link ${safeLinkType}`;
                linkElement.textContent = safeLinkText;
                
                if (linkType === 'external' || safeUrl.startsWith('http')) {
                    linkElement.target = '_blank';
                    linkElement.rel = 'noopener noreferrer';
                }
                
                linkElement.onclick = (e) => {
                    return handleCulturaLink(safeLinkType, safeUrl, safeItemId, e);
                };
                
                linksDiv.appendChild(linkElement);
            });
            
            if (linksDiv.children.length > 0) {
                card.appendChild(linksDiv);
            }
        }
        
        // Enlace externo
        if (safeExternalLink && isValidUrl(safeExternalLink)) {
            const linksDiv = document.createElement('div');
            linksDiv.className = 'item-links';
            
            const externalLink = document.createElement('a');
            externalLink.href = safeExternalLink;
            externalLink.className = 'item-link external';
            externalLink.target = '_blank';
            externalLink.rel = 'noopener noreferrer';
            externalLink.textContent = '🌐 Ver más información';
            externalLink.onclick = (e) => {
                return handleCulturaLink('external', safeExternalLink, safeItemId, e);
            };
            
            linksDiv.appendChild(externalLink);
            card.appendChild(linksDiv);
        }
        
        fragment.appendChild(card);
    });
    
    container.innerHTML = '';
    container.appendChild(fragment);
}

// Función para abrir el editor de elementos de cultura y ocio
function openCulturaItemEditor(section, itemId = null) {
    const modal = document.getElementById('culturaItemModal');
    if (!modal) {
        showNotification('Modal de cultura no encontrado', 'error');
        return;
    }
    
    const modalTitle = document.getElementById('culturaItemModalTitle');
    const form = document.getElementById('culturaItemForm');
    
    // Limpiar formulario
    form.reset();
    
    // Limpiar contenedor de enlaces
    loadCulturaLinksEditor([]);
    
    // Configurar modal según sección
    const sectionNames = {
        'naturaleza': 'Naturaleza y Senderismo',
        'patrimonio': 'Patrimonio y Arte',
        'gastronomia': 'Recolección y Gastronomía',
        'eventos': 'Eventos y Tradiciones',
        'cercanos': 'Sitios Cercanos de Interés'
    };
    
    if (modalTitle) {
        modalTitle.textContent = itemId ? 
            `Editar ${sectionNames[section]}` : 
            `Nuevo Elemento - ${sectionNames[section]}`;
    }
    
    // Configurar campos ocultos
    document.getElementById('culturaItemSection').value = section;
    document.getElementById('culturaItemId').value = itemId || '';
    
    // Si es edición, cargar datos existentes
    if (itemId) {
        const item = culturaOcioData[section].find(i => i.id === itemId);
        if (item) {
            document.getElementById('culturaItemTitle').value = item.title || '';
            document.getElementById('culturaItemDescription').value = item.description || '';
            document.getElementById('culturaItemImage').value = item.image || '';
            // Cargar enlaces en el contenedor dinámico
            loadCulturaLinksEditor(item.links || []);
            document.getElementById('culturaItemExternalLink').value = item.externalLink || '';
            document.getElementById('culturaItemOrder').value = item.order || 1;
        } else {
            // Si es nuevo, inicializar con contenedor vacío
            loadCulturaLinksEditor([]);
        }
    } else {
        // Si es nuevo, inicializar con contenedor vacío
        loadCulturaLinksEditor([]);
    }
    
    modal.style.display = 'block';
}

// Cargar editor de enlaces dinámico
function loadCulturaLinksEditor(links) {
    const container = document.getElementById('culturaLinksContainer');
    if (!container) return;
    
    if (!links || links.length === 0) {
        container.innerHTML = '<p style="color: #666; text-align: center; padding: 1rem;">No hay enlaces. Haz clic en "Agregar Enlace" para añadir uno.</p>';
        return;
    }
    
    // Usar DocumentFragment para mejor rendimiento
    const fragment = document.createDocumentFragment();
    
    links.forEach((link, index) => {
        // Sanitizar valores
        const safeText = escapeForHtml(link.text || '');
        const safeUrl = escapeForHtml(link.url || '');
        const safeType = escapeHtml(link.type || 'normal');
        const safeIndex = index;
        
        const linkItem = document.createElement('div');
        linkItem.className = 'cultura-link-item';
        linkItem.style.cssText = 'background: white; border: 1px solid #ddd; border-radius: 6px; padding: 1rem; margin-bottom: 0.75rem;';
        
        const headerDiv = document.createElement('div');
        headerDiv.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;';
        
        const strong = document.createElement('strong');
        strong.style.cssText = 'color: #333;';
        strong.textContent = `Enlace ${index + 1}`;
        
        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'btn btn-sm btn-danger';
        deleteBtn.style.cssText = 'padding: 0.25rem 0.5rem; font-size: 0.75rem;';
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i> Eliminar';
        deleteBtn.onclick = () => removeCulturaLink(safeIndex);
        
        headerDiv.appendChild(strong);
        headerDiv.appendChild(deleteBtn);
        
        const inputsDiv = document.createElement('div');
        inputsDiv.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 0.5rem;';
        
        const textDiv = document.createElement('div');
        const textLabel = document.createElement('label');
        textLabel.style.cssText = 'display: block; font-size: 0.875rem; margin-bottom: 0.25rem; color: #555;';
        textLabel.textContent = 'Texto del Botón:';
        const textInput = document.createElement('input');
        textInput.type = 'text';
        textInput.className = 'cultura-link-text';
        textInput.value = safeText;
        textInput.placeholder = 'Ej: 📋 Guía de Ruta';
        textInput.style.cssText = 'width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;';
        textDiv.appendChild(textLabel);
        textDiv.appendChild(textInput);
        
        const urlDiv = document.createElement('div');
        const urlLabel = document.createElement('label');
        urlLabel.style.cssText = 'display: block; font-size: 0.875rem; margin-bottom: 0.25rem; color: #555;';
        urlLabel.textContent = 'URL:';
        const urlInput = document.createElement('input');
        urlInput.type = 'text';
        urlInput.className = 'cultura-link-url';
        urlInput.value = safeUrl;
        urlInput.placeholder = 'https://ejemplo.com';
        urlInput.style.cssText = 'width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;';
        // Agregar validación en tiempo real
        urlInput.addEventListener('input', function() {
            const url = this.value.trim();
            if (url && !isValidUrl(url) && !url.startsWith('/') && !url.startsWith('#')) {
                this.style.borderColor = '#ef4444';
            } else {
                this.style.borderColor = '';
            }
        });
        urlDiv.appendChild(urlLabel);
        urlDiv.appendChild(urlInput);
        
        inputsDiv.appendChild(textDiv);
        inputsDiv.appendChild(urlDiv);
        
        const typeDiv = document.createElement('div');
        typeDiv.style.cssText = 'display: grid; grid-template-columns: 1fr auto; gap: 0.75rem; align-items: center;';
        
        const selectDiv = document.createElement('div');
        const typeLabel = document.createElement('label');
        typeLabel.style.cssText = 'display: block; font-size: 0.875rem; margin-bottom: 0.25rem; color: #555;';
        typeLabel.textContent = 'Tipo:';
        const typeSelect = document.createElement('select');
        typeSelect.className = 'cultura-link-type';
        typeSelect.style.cssText = 'width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;';
        typeSelect.innerHTML = `
            <option value="normal" ${link.type === 'normal' || !link.type ? 'selected' : ''}>Normal</option>
            <option value="pdf" ${link.type === 'pdf' ? 'selected' : ''}>PDF</option>
            <option value="external" ${link.type === 'external' ? 'selected' : ''}>Enlace Externo</option>
        `;
        selectDiv.appendChild(typeLabel);
        selectDiv.appendChild(typeSelect);
        
        const checkboxDiv = document.createElement('div');
        checkboxDiv.style.cssText = 'display: flex; align-items: center; gap: 0.5rem; margin-top: 1.5rem;';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'cultura-link-enabled';
        checkbox.id = `linkEnabled${index}`;
        checkbox.checked = link.enabled !== false;
        const checkboxLabel = document.createElement('label');
        checkboxLabel.htmlFor = `linkEnabled${index}`;
        checkboxLabel.style.cssText = 'margin: 0; font-size: 0.875rem; color: #555; cursor: pointer;';
        checkboxLabel.textContent = 'Mostrar botón';
        checkboxDiv.appendChild(checkbox);
        checkboxDiv.appendChild(checkboxLabel);
        
        typeDiv.appendChild(selectDiv);
        typeDiv.appendChild(checkboxDiv);
        
        linkItem.appendChild(headerDiv);
        linkItem.appendChild(inputsDiv);
        linkItem.appendChild(typeDiv);
        
        fragment.appendChild(linkItem);
    });
    
    container.innerHTML = '';
    container.appendChild(fragment);
}

// Agregar nuevo enlace al editor
function addCulturaLink() {
    const container = document.getElementById('culturaLinksContainer');
    if (!container) return;
    
    // Si está vacío, limpiar el mensaje
    if (container.innerHTML.includes('No hay enlaces')) {
        container.innerHTML = '';
    }
    
    const currentLinks = getCulturaLinksFromEditor();
    const newIndex = currentLinks.length;
    
    const newLinkHtml = `
        <div class="cultura-link-item" style="background: white; border: 1px solid #ddd; border-radius: 6px; padding: 1rem; margin-bottom: 0.75rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                <strong style="color: #333;">Enlace ${newIndex + 1}</strong>
                <button type="button" class="btn btn-sm btn-danger" onclick="removeCulturaLink(${newIndex})" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">
                    <i class="fas fa-trash"></i> Eliminar
                </button>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 0.5rem;">
                <div>
                    <label style="display: block; font-size: 0.875rem; margin-bottom: 0.25rem; color: #555;">Texto del Botón:</label>
                    <input type="text" class="cultura-link-text" value="" placeholder="Ej: 📋 Guía de Ruta" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                <div>
                    <label style="display: block; font-size: 0.875rem; margin-bottom: 0.25rem; color: #555;">URL:</label>
                    <input type="text" class="cultura-link-url" value="" placeholder="https://ejemplo.com" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr auto; gap: 0.75rem; align-items: center;">
                <div>
                    <label style="display: block; font-size: 0.875rem; margin-bottom: 0.25rem; color: #555;">Tipo:</label>
                    <select class="cultura-link-type" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                        <option value="normal">Normal</option>
                        <option value="pdf">PDF</option>
                        <option value="external">Enlace Externo</option>
                    </select>
                </div>
                <div style="display: flex; align-items: center; gap: 0.5rem; margin-top: 1.5rem;">
                    <input type="checkbox" class="cultura-link-enabled" checked id="linkEnabled${newIndex}">
                    <label for="linkEnabled${newIndex}" style="margin: 0; font-size: 0.875rem; color: #555; cursor: pointer;">Mostrar botón</label>
                </div>
            </div>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', newLinkHtml);
}

// Eliminar enlace del editor
function removeCulturaLink(index) {
    const container = document.getElementById('culturaLinksContainer');
    if (!container) return;
    
    const items = container.querySelectorAll('.cultura-link-item');
    if (items[index]) {
        items[index].remove();
        // Re-numerar los enlaces restantes
        updateCulturaLinksNumbers();
    }
}

// Actualizar números de los enlaces
function updateCulturaLinksNumbers() {
    const container = document.getElementById('culturaLinksContainer');
    if (!container) return;
    
    const items = container.querySelectorAll('.cultura-link-item');
    items.forEach((item, index) => {
        const title = item.querySelector('strong');
        if (title) {
            title.textContent = `Enlace ${index + 1}`;
        }
    });
    
    // Si no hay enlaces, mostrar mensaje
    if (items.length === 0) {
        container.innerHTML = '<p style="color: #666; text-align: center; padding: 1rem;">No hay enlaces. Haz clic en "Agregar Enlace" para añadir uno.</p>';
    }
}

// Obtener enlaces desde el editor
function getCulturaLinksFromEditor() {
    const container = document.getElementById('culturaLinksContainer');
    if (!container) return [];
    
    const items = container.querySelectorAll('.cultura-link-item');
    const links = [];
    
    items.forEach(item => {
        const text = item.querySelector('.cultura-link-text')?.value.trim() || '';
        const url = item.querySelector('.cultura-link-url')?.value.trim() || '';
        const type = item.querySelector('.cultura-link-type')?.value || 'normal';
        const enabled = item.querySelector('.cultura-link-enabled')?.checked !== false;
        
        if (text && url) {
            links.push({
                text: text,
                url: url,
                type: type,
                enabled: enabled
            });
        }
    });
    
    return links;
}

// Función para cerrar el modal de elementos
function closeCulturaItemModal() {
    const modal = document.getElementById('culturaItemModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Función para validar elemento de cultura y ocio
function validateCulturaItem(item) {
    const errors = [];
    
    const titleError = validators.required(item.title, 'Título');
    if (titleError) errors.push(titleError);
    
    const descError = validators.required(item.description, 'Descripción');
    if (descError) errors.push(descError);
    
    if (item.image) {
        const urlError = validators.url(item.image);
        if (urlError) errors.push(urlError);
    }
    
    if (item.externalLink) {
        const urlError = validators.url(item.externalLink);
        if (urlError) errors.push(urlError);
    }
    
    const orderError = validators.positiveNumber(item.order);
    if (orderError) errors.push(orderError);
    
    // Validar enlaces
    if (item.links && item.links.length > 0) {
        item.links.forEach((link, index) => {
            if (link.url) {
                const linkUrlError = validators.url(link.url);
                if (linkUrlError) {
                    errors.push(`Enlace ${index + 1}: ${linkUrlError}`);
                }
            }
        });
    }
    
    return errors;
}
// Función para guardar elemento de cultura y ocio (mejorada con validaciones)
function saveCulturaItem() {
    try {
        const section = document.getElementById('culturaItemSection').value;
        const itemId = document.getElementById('culturaItemId').value;
        const title = document.getElementById('culturaItemTitle').value.trim();
        const description = document.getElementById('culturaItemDescription').value.trim();
        const image = document.getElementById('culturaItemImage').value.trim();
        const externalLink = document.getElementById('culturaItemExternalLink').value.trim();
        const order = parseInt(document.getElementById('culturaItemOrder').value) || 1;
        
        // Obtener enlaces desde el editor dinámico
        const links = getCulturaLinksFromEditor();
        
        // Crear objeto del elemento
        const item = {
            id: itemId || generateId(),
            title: title,
            description: description,
            image: image,
            links: links,
            externalLink: externalLink,
            order: order,
            createdAt: itemId ? (culturaOcioData[section]?.find(i => i.id === itemId)?.createdAt || new Date()) : new Date(),
            updatedAt: new Date()
        };
        
        // Validar usando validators
        const errors = validateCulturaItem(item);
        if (errors.length > 0) {
            showNotification(`Errores de validación:\n${errors.join('\n')}`, 'error');
            return;
        }
        
        // Inicializar sección si no existe
        if (!culturaOcioData[section]) {
            culturaOcioData[section] = [];
        }
        
        // Guardar en la sección correspondiente
        if (itemId) {
            // Editar elemento existente
            const index = culturaOcioData[section].findIndex(i => i.id === itemId);
            if (index !== -1) {
                culturaOcioData[section][index] = item;
            } else {
                showNotification('Elemento no encontrado para editar', 'error');
                return;
            }
        } else {
            // Añadir nuevo elemento
            culturaOcioData[section].push(item);
        }
        
        // Ordenar por orden
        culturaOcioData[section].sort((a, b) => (a.order || 0) - (b.order || 0));
        
        // Guardar en localStorage
        localStorage.setItem('culturaOcioData', JSON.stringify(culturaOcioData));
        
        // Actualizar vista
        loadCulturaOcioAdmin();
        const container = document.getElementById(`${section}Items`);
        if (container) {
            renderAccordionSection(section, culturaOcioData[section]);
        }
        
        // Cerrar modal
        closeCulturaItemModal();
        
        showNotification('Elemento guardado correctamente', 'success');
        
    } catch (error) {
        console.error('Error guardando elemento de cultura y ocio:', error);
        showNotification('Error al guardar el elemento. Por favor, inténtelo de nuevo.', 'error');
    }
}

// Función para eliminar elemento de cultura y ocio (mejorada con mejor confirmación)
function deleteCulturaItem(section, itemId) {
    try {
        const item = culturaOcioData[section]?.find(i => i.id === itemId);
        if (!item) {
            showNotification('Elemento no encontrado', 'error');
            return;
        }
        
        const itemName = item.title || 'este elemento';
        const confirmMessage = `¿Está seguro de que desea eliminar "${itemName}"?\n\nEsta acción no se puede deshacer.`;
        
        if (!confirm(confirmMessage)) {
            return;
        }
        
        // Mostrar estado de carga
        showLoadingState(`${section}AdminList`, 'Eliminando elemento...');
        
        culturaOcioData[section] = culturaOcioData[section].filter(item => item.id !== itemId);
        
        // Guardar en localStorage
        localStorage.setItem('culturaOcioData', JSON.stringify(culturaOcioData));
        
        // Actualizar vista
        loadCulturaOcioAdmin();
        const container = document.getElementById(`${section}Items`);
        if (container) {
            renderAccordionSection(section, culturaOcioData[section]);
        }
        
        showNotification(`"${itemName}" eliminado correctamente`, 'success');
        
    } catch (error) {
        console.error('Error eliminando elemento de cultura y ocio:', error);
        showNotification('Error al eliminar el elemento. Por favor, inténtelo de nuevo.', 'error');
    }
}
// Función para eliminar elemento específico por título (utilidad)
function deleteCulturaItemByTitle(section, titleKeyword) {
    // Cargar datos actuales
    const savedData = localStorage.getItem('culturaOcioData');
    if (savedData) {
        try {
            culturaOcioData = JSON.parse(savedData);
        } catch (e) {
            console.error('Error parseando culturaOcioData:', e);
            return;
        }
    }
    
    // Buscar y eliminar el elemento que contenga el título
    const initialLength = culturaOcioData[section]?.length || 0;
    culturaOcioData[section] = culturaOcioData[section].filter(item => {
        return !item.title || !item.title.toLowerCase().includes(titleKeyword.toLowerCase());
    });
    
    const removedCount = initialLength - (culturaOcioData[section]?.length || 0);
    
    if (removedCount > 0) {
        // Guardar en localStorage
        localStorage.setItem('culturaOcioData', JSON.stringify(culturaOcioData));
        
        // Actualizar vista
        loadCulturaOcioAdmin();
        const container = document.getElementById(`${section}Items`);
        if (container) {
            renderAccordionSection(section, culturaOcioData[section]);
        }
        
        console.log(`✅ Eliminado: ${removedCount} elemento(s) con título "${titleKeyword}"`);
        return true;
    }
    
    return false;
}

// Función para cargar la gestión administrativa de cultura y ocio
function loadCulturaOcioAdmin() {
    // Cargar datos desde localStorage
    const savedData = localStorage.getItem('culturaOcioData');
    if (savedData) {
        try {
            culturaOcioData = JSON.parse(savedData);
        } catch (e) {
            console.error('Error parseando culturaOcioData:', e);
        }
    }
    
    // Renderizar cada sección
    const sections = ['naturaleza', 'patrimonio', 'gastronomia', 'eventos', 'cercanos'];
    sections.forEach(section => {
        const listElement = document.getElementById(`${section}AdminList`);
        if (listElement) {
            renderCulturaAdminSection(section, listElement);
        }
    });
}
// Función para renderizar sección administrativa (con sanitización)
function renderCulturaAdminSection(section, container) {
    const items = culturaOcioData[section] || [];
    
    if (items.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #6c757d; padding: 20px;">No hay elementos en esta sección</p>';
        return;
    }
    
    // Usar DocumentFragment para mejor rendimiento
    const fragment = document.createDocumentFragment();
    
    items.forEach(item => {
        // Sanitizar todos los inputs del usuario
        const safeTitle = escapeHtml(item.title || '');
        const safeDescription = escapeHtml((item.description || '').substring(0, 100));
        const safeSection = escapeHtml(section);
        const safeId = escapeHtml(item.id || '');
        const order = item.order || 1;
        const linksCount = item.links ? item.links.length : 0;
        
        const card = document.createElement('div');
        card.className = 'admin-item-card';
        card.style.cssText = 'background: #fff; border: 1px solid #e0e0e0; border-radius: 12px; padding: 20px; margin-bottom: 15px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);';
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'admin-item-content';
        contentDiv.style.cssText = 'flex: 1;';
        
        const title = document.createElement('h4');
        title.style.cssText = 'margin: 0 0 0.5rem 0;';
        title.textContent = safeTitle;
        
        const description = document.createElement('p');
        description.style.cssText = 'margin: 0 0 0.5rem 0; color: #666;';
        description.textContent = safeDescription + (item.description && item.description.length > 100 ? '...' : '');
        
        const metaDiv = document.createElement('div');
        metaDiv.className = 'admin-item-meta';
        metaDiv.style.cssText = 'display: flex; gap: 0.5rem; flex-wrap: wrap;';
        
        // Usar createBadge para crear badges
        metaDiv.appendChild(createBadge(`Orden: ${order}`, '#3b82f6'));
        if (item.image) {
            metaDiv.appendChild(createBadge('Con imagen', '#10b981'));
        }
        if (linksCount > 0) {
            metaDiv.appendChild(createBadge(`${linksCount} enlaces`, '#f59e0b'));
        }
        if (item.externalLink) {
            metaDiv.appendChild(createBadge('Enlace externo', '#8b5cf6'));
        }
        
        contentDiv.appendChild(title);
        contentDiv.appendChild(description);
        contentDiv.appendChild(metaDiv);
        
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'admin-item-actions';
        actionsDiv.style.cssText = 'display: flex; gap: 0.5rem; margin-top: 1rem;';
        
        // Usar createActionButton para crear botones
        const editBtn = createActionButton('Editar', 'edit', () => openCulturaItemEditor(safeSection, safeId), 'primary');
        const deleteBtn = createActionButton('Eliminar', 'trash', () => deleteCulturaItem(safeSection, safeId), 'danger');
        
        actionsDiv.appendChild(editBtn);
        actionsDiv.appendChild(deleteBtn);
        
        card.appendChild(contentDiv);
        card.appendChild(actionsDiv);
        fragment.appendChild(card);
    });
    
    container.innerHTML = '';
    container.appendChild(fragment);
}

// Función para exportar sección de cultura y ocio (con cleanup de ObjectURLs)
function exportCulturaSection(section) {
    try {
        const data = culturaOcioData[section] || [];
        if (data.length === 0) {
            showNotification('No hay datos para exportar en esta sección', 'warning');
            return;
        }
        
        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        
        const link = document.createElement('a');
        const objectUrl = URL.createObjectURL(dataBlob);
        link.href = objectUrl;
        link.download = `cultura-ocio-${section}-${new Date().toISOString().split('T')[0]}.json`;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        
        // Cleanup: revocar ObjectURL después de un tiempo
        setTimeout(() => {
            URL.revokeObjectURL(objectUrl);
            document.body.removeChild(link);
        }, 100);
        
        showNotification(`Sección ${section} exportada correctamente`, 'success');
        
    } catch (error) {
        console.error('Error exportando sección:', error);
        showNotification('Error al exportar la sección. Por favor, inténtelo de nuevo.', 'error');
    }
}

// Función para exportar tarjetas de cultura y ocio (con cleanup de ObjectURLs)
function exportCulturaTarjetas() {
    try {
        const data = culturaOcioConfig.tarjetas || [];
        if (data.length === 0) {
            showNotification('No hay tarjetas para exportar', 'warning');
            return;
        }
        
        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        
        const link = document.createElement('a');
        const objectUrl = URL.createObjectURL(dataBlob);
        link.href = objectUrl;
        link.download = `cultura-tarjetas-${new Date().toISOString().split('T')[0]}.json`;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        
        // Cleanup: revocar ObjectURL después de un tiempo
        setTimeout(() => {
            URL.revokeObjectURL(objectUrl);
            document.body.removeChild(link);
        }, 100);
        
        showNotification('Tarjetas exportadas correctamente', 'success');
        
    } catch (error) {
        console.error('Error exportando tarjetas:', error);
        showNotification('Error al exportar las tarjetas. Por favor, inténtelo de nuevo.', 'error');
    }
}

// Función para crear pestañas personalizadas
function addCustomTab(event) {
    if (event) {
        event.preventDefault();
    }
    
    const nombre = document.getElementById('pestanaNombre').value.trim();
    const id = document.getElementById('pestanaId').value.trim();
    
    if (!nombre || !id) {
        showNotification('Por favor, complete todos los campos', 'error');
        return;
    }
    
    // Verificar que el ID no exista ya
    if (!culturaOcioConfig.pestanasPersonalizadas) {
        culturaOcioConfig.pestanasPersonalizadas = [];
    }
    
    if (culturaOcioConfig.pestanasPersonalizadas.find(p => p.id === id)) {
        showNotification('Ya existe una pestaña con ese ID', 'error');
        return;
    }
    
    // Agregar nueva pestaña
    const nuevaPestana = {
        id: id,
        nombre: nombre,
        elementos: [],
        activa: true,
        createdAt: new Date().toISOString()
    };
    
    culturaOcioConfig.pestanasPersonalizadas.push(nuevaPestana);
    
    // Guardar en localStorage
    localStorage.setItem('culturaOcioConfig', JSON.stringify(culturaOcioConfig));
    
    // Limpiar formulario
    document.getElementById('nuevaPestanaForm').reset();
    
    // Recargar lista de pestañas
    loadCustomTabsList();
    
    // Actualizar pestañas en el modal
    renderCustomTabs();
    
    showNotification('Pestaña personalizada creada correctamente', 'success');
    
    // Cambiar a la nueva pestaña
    switchCulturaTab(id);
}

// Función para cargar lista de pestañas personalizadas
function loadCustomTabsList() {
    const container = document.getElementById('customTabsList');
    if (!container) return;
    
    if (!culturaOcioConfig.pestanasPersonalizadas || culturaOcioConfig.pestanasPersonalizadas.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #6c757d; padding: 20px;">No hay pestañas personalizadas creadas</p>';
        return;
    }
    
    container.innerHTML = culturaOcioConfig.pestanasPersonalizadas.map(pestana => `
        <div class="admin-item-card" style="background: #fff; border: 1px solid #e0e0e0; border-radius: 12px; padding: 20px; margin-bottom: 15px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <div class="admin-item-content" style="flex: 1;">
                <h4 style="margin: 0 0 0.5rem 0;">${pestana.nombre}</h4>
                <p style="margin: 0 0 0.5rem 0; color: #666;">ID: ${pestana.id}</p>
                <div class="admin-item-meta" style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                    <span style="background: #3b82f6; color: white; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem;">${pestana.elementos?.length || 0} elementos</span>
                    <span style="background: ${pestana.activa ? '#10b981' : '#ef4444'}; color: white; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem;">${pestana.activa ? 'Activa' : 'Inactiva'}</span>
                </div>
            </div>
            <div class="admin-item-actions" style="display: flex; gap: 0.5rem; margin-top: 1rem;">
                <button class="btn btn-sm btn-primary" onclick="switchCulturaTab('${pestana.id}')" style="padding: 0.5rem 1rem; font-size: 0.875rem;">
                    <i class="fas fa-edit"></i> Gestionar
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteCustomTab('${pestana.id}')" style="padding: 0.5rem 1rem; font-size: 0.875rem;">
                    <i class="fas fa-trash"></i> Eliminar
                </button>
            </div>
        </div>
    `).join('');
}

// Función para renderizar pestañas personalizadas en el contenedor de pestañas
function renderCustomTabs() {
    const container = document.getElementById('customTabsContainer');
    if (!container) return;
    
    if (!culturaOcioConfig.pestanasPersonalizadas || culturaOcioConfig.pestanasPersonalizadas.length === 0) {
        container.innerHTML = '';
        return;
    }
    
    container.innerHTML = culturaOcioConfig.pestanasPersonalizadas.map(pestana => `
        <button class="tab-btn" onclick="switchCulturaTab('${pestana.id}')">${pestana.nombre}</button>
    `).join('');
}

// Función para eliminar pestaña personalizada
function deleteCustomTab(pestanaId) {
    if (!confirm('¿Está seguro de que desea eliminar esta pestaña personalizada?')) {
        return;
    }
    
    culturaOcioConfig.pestanasPersonalizadas = culturaOcioConfig.pestanasPersonalizadas.filter(p => p.id !== pestanaId);
    
    // Guardar en localStorage
    localStorage.setItem('culturaOcioConfig', JSON.stringify(culturaOcioConfig));
    
    // Recargar lista
    loadCustomTabsList();
    renderCustomTabs();
    
    showNotification('Pestaña personalizada eliminada correctamente', 'success');
}

// La función switchCulturaTab ya está definida arriba, no duplicar

// La función openCulturaOcioManager ya está definida arriba, solo actualizar si es necesario

// La función saveCulturaOcio ya está definida arriba, solo actualizar si es necesario

// Cargar contenido al iniciar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(() => {
            loadCobrerosContent();
        }, 500);
    });
} else {
    setTimeout(() => {
        loadCobrerosContent();
    }, 500);
}

// ===== SISTEMA MEJORADO DE CITAS PREVIAS =====

// Configuración de horarios por día
let appointmentScheduleConfig = {
    days: {
        monday: { enabled: true, morningHours: ['09:00', '10:00', '11:00', '12:00'], afternoonHours: ['16:00', '17:00', '18:00'] },
        tuesday: { enabled: true, morningHours: ['09:00', '10:00', '11:00', '12:00'], afternoonHours: ['16:00', '17:00', '18:00'] },
        wednesday: { enabled: true, morningHours: ['09:00', '10:00', '11:00', '12:00'], afternoonHours: ['16:00', '17:00', '18:00'] },
        thursday: { enabled: true, morningHours: ['09:00', '10:00', '11:00', '12:00'], afternoonHours: ['16:00', '17:00', '18:00'] },
        friday: { enabled: true, morningHours: ['09:00', '10:00', '11:00', '12:00'], afternoonHours: ['16:00', '17:00', '18:00'] },
        saturday: { enabled: false, morningHours: [], afternoonHours: [] },
        sunday: { enabled: false, morningHours: [], afternoonHours: [] }
    }
};

// Estado del calendario
let currentCalendarMonth = new Date().getMonth();
let currentCalendarYear = new Date().getFullYear();
let selectedAppointmentDate = null;
let selectedAppointmentTime = null;

// Estado del calendario del admin
let adminCalendarMonth = new Date().getMonth();
let adminCalendarYear = new Date().getFullYear();
let selectedAdminDate = null;

// Cargar configuración de horarios
function loadAppointmentScheduleConfig() {
    const saved = localStorage.getItem('appointmentScheduleConfig');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            appointmentScheduleConfig = { ...appointmentScheduleConfig, ...parsed };
        } catch (error) {
            console.error('Error cargando configuración de horarios:', error);
        }
    }
}

// Cargar configuración de horarios en el UI del panel de admin
function loadAppointmentScheduleConfigUI() {
    if (!isAdmin) return;
    
    // Verificar que los elementos existan antes de continuar
    const morningList = document.getElementById('morningHoursList');
    const afternoonList = document.getElementById('afternoonHoursList');
    
    if (!morningList || !afternoonList) {
        // Si los elementos no existen, intentar de nuevo después de un breve delay
        setTimeout(() => {
            loadAppointmentScheduleConfigUI();
        }, 100);
        return;
    }
    
    // Cargar configuración desde localStorage
    loadAppointmentScheduleConfig();
    
    // Actualizar checkboxes de días
    const dayCheckboxes = {
        'scheduleMonday': 'monday',
        'scheduleTuesday': 'tuesday',
        'scheduleWednesday': 'wednesday',
        'scheduleThursday': 'thursday',
        'scheduleFriday': 'friday',
        'scheduleSaturday': 'saturday',
        'scheduleSunday': 'sunday'
    };
    
    Object.keys(dayCheckboxes).forEach(checkboxId => {
        const checkbox = document.getElementById(checkboxId);
        if (checkbox) {
            const dayName = dayCheckboxes[checkboxId];
            const dayConfig = appointmentScheduleConfig.days[dayName];
            if (dayConfig) {
                checkbox.checked = dayConfig.enabled || false;
            } else {
                checkbox.checked = false;
            }
        }
    });
    
    // Obtener horarios guardados (todos los días comparten los mismos horarios)
    // Buscar cualquier día que tenga horarios configurados
    let morningHours = ['09:00', '10:00', '11:00', '12:00']; // Valores por defecto
    let afternoonHours = ['16:00', '17:00', '18:00']; // Valores por defecto
    
    // Buscar horarios en cualquier día configurado
    for (const dayName in appointmentScheduleConfig.days) {
        const dayConfig = appointmentScheduleConfig.days[dayName];
        if (dayConfig && (dayConfig.morningHours?.length > 0 || dayConfig.afternoonHours?.length > 0)) {
            if (dayConfig.morningHours && dayConfig.morningHours.length > 0) {
                morningHours = dayConfig.morningHours;
            }
            if (dayConfig.afternoonHours && dayConfig.afternoonHours.length > 0) {
                afternoonHours = dayConfig.afternoonHours;
            }
            break; // Usar los primeros horarios encontrados
        }
    }
    
    // Actualizar horarios de mañana
    if (morningList) {
        morningList.innerHTML = '';
        if (morningHours.length === 0) {
            morningHours = ['09:00', '10:00', '11:00', '12:00']; // Valores por defecto si está vacío
        }
        morningHours.forEach(hour => {
            const item = document.createElement('div');
            item.className = 'hour-input-item';
            item.innerHTML = `
                <input type="time" class="hour-time-input" value="${escapeHtml(hour)}">
                <button type="button" class="btn-remove-hour" onclick="removeHourSlot(this)" aria-label="Eliminar hora">
                    <i class="fas fa-times" aria-hidden="true"></i>
                </button>
            `;
            morningList.appendChild(item);
        });
    }
    
    // Actualizar horarios de tarde
    if (afternoonList) {
        afternoonList.innerHTML = '';
        if (afternoonHours.length === 0) {
            afternoonHours = ['16:00', '17:00', '18:00']; // Valores por defecto si está vacío
        }
        afternoonHours.forEach(hour => {
            const item = document.createElement('div');
            item.className = 'hour-input-item';
            item.innerHTML = `
                <input type="time" class="hour-time-input" value="${escapeHtml(hour)}">
                <button type="button" class="btn-remove-hour" onclick="removeHourSlot(this)" aria-label="Eliminar hora">
                    <i class="fas fa-times" aria-hidden="true"></i>
                </button>
            `;
            afternoonList.appendChild(item);
        });
    }
}

// Obtener configuración de un día específico
function getDayConfig(checkboxId) {
    const checkbox = document.getElementById(checkboxId);
    const enabled = checkbox ? checkbox.checked : false;
    
    // Los horarios son compartidos entre todos los días
    const morningHours = getHoursFromList('morningHoursList');
    const afternoonHours = getHoursFromList('afternoonHoursList');
    
    return {
        enabled: enabled,
        morningHours: morningHours,
        afternoonHours: afternoonHours
    };
}
// Guardar configuración de horarios
function saveAppointmentScheduleConfig() {
    if (!isAdmin) {
        showNotification('Solo los administradores pueden cambiar esta configuración', 'error');
        return;
    }
    
    try {
        // Obtener horarios compartidos
        const morningHours = getHoursFromList('morningHoursList');
        const afternoonHours = getHoursFromList('afternoonHoursList');
        
        // Obtener configuración por día desde los checkboxes
        const daysConfig = {
            monday: {
                enabled: document.getElementById('scheduleMonday')?.checked || false,
                morningHours: morningHours,
                afternoonHours: afternoonHours
            },
            tuesday: {
                enabled: document.getElementById('scheduleTuesday')?.checked || false,
                morningHours: morningHours,
                afternoonHours: afternoonHours
            },
            wednesday: {
                enabled: document.getElementById('scheduleWednesday')?.checked || false,
                morningHours: morningHours,
                afternoonHours: afternoonHours
            },
            thursday: {
                enabled: document.getElementById('scheduleThursday')?.checked || false,
                morningHours: morningHours,
                afternoonHours: afternoonHours
            },
            friday: {
                enabled: document.getElementById('scheduleFriday')?.checked || false,
                morningHours: morningHours,
                afternoonHours: afternoonHours
            },
            saturday: {
                enabled: document.getElementById('scheduleSaturday')?.checked || false,
                morningHours: morningHours,
                afternoonHours: afternoonHours
            },
            sunday: {
                enabled: document.getElementById('scheduleSunday')?.checked || false,
                morningHours: morningHours,
                afternoonHours: afternoonHours
            }
        };
        
        appointmentScheduleConfig.days = daysConfig;
        localStorage.setItem('appointmentScheduleConfig', JSON.stringify(appointmentScheduleConfig));
        
        // Recargar calendario si está visible
        if (document.getElementById('calendarGrid')) {
            renderCalendar();
        }
        
        showNotification('Configuración de horarios guardada correctamente', 'success');
    } catch (error) {
        console.error('Error guardando configuración:', error);
        showNotification('Error al guardar la configuración', 'error');
    }
}


// Obtener horas de una lista
function getHoursFromList(listId) {
    const list = document.getElementById(listId);
    if (!list) return [];
    const inputs = list.querySelectorAll('.hour-time-input');
    return Array.from(inputs).map(input => input.value).filter(v => v);
}

// Agregar slot de hora
function addHourSlot(listId) {
    const list = document.getElementById(listId);
    if (!list) return;
    
    const newItem = document.createElement('div');
    newItem.className = 'hour-input-item';
    newItem.innerHTML = `
        <input type="time" class="hour-time-input" value="09:00">
        <button type="button" class="btn-remove-hour" onclick="removeHourSlot(this)">
            <i class="fas fa-times"></i>
        </button>
    `;
    list.appendChild(newItem);
}

// Eliminar slot de hora
function removeHourSlot(button) {
    button.closest('.hour-input-item').remove();
}

// Renderizar calendario completo (mes completo, no solo semana)
function renderCalendar() {
    const calendarGrid = document.getElementById('calendarGrid');
    if (!calendarGrid) return;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const firstDay = new Date(currentCalendarYear, currentCalendarMonth, 1);
    const lastDay = new Date(currentCalendarYear, currentCalendarMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = (firstDay.getDay() + 6) % 7;
    
    // Nombres de días y meses
    const displayDayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    const dayKeyByIndex = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                       'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    
    // Actualizar título del mes
    const monthYearElement = document.getElementById('currentMonthYear');
    if (monthYearElement) {
        monthYearElement.textContent = `${monthNames[currentCalendarMonth]} ${currentCalendarYear}`;
    }
    
    // Crear encabezados de días
    let calendarHTML = '<div class="calendar-weekdays">';
    displayDayNames.forEach(day => {
        calendarHTML += `<div class="calendar-weekday">${escapeHtml(day)}</div>`;
    });
    calendarHTML += '</div>';
    
    // Crear grid de días
    calendarHTML += '<div class="calendar-days-grid">';
    
    // Días vacíos al inicio
    for (let i = 0; i < startingDayOfWeek; i++) {
        calendarHTML += '<div class="calendar-day empty"></div>';
    }
    
    // Días del mes
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(currentCalendarYear, currentCalendarMonth, day);
        const dateStr = formatDateForStorage(date);
        const isPast = date < today;
        const isToday = dateStr === formatDateForStorage(today);
        const dayOfWeek = date.getDay();
        const dayKey = dayKeyByIndex[dayOfWeek];
        const dayConfig = appointmentScheduleConfig.days[dayKey];
        const isEnabled = Boolean(dayConfig && dayConfig.enabled);
        
        const appointmentsOnDay = appointments.filter(apt => {
            const aptDate = new Date(apt.date);
            return formatDateForStorage(aptDate) === dateStr && apt.status !== 'cancelled';
        });
        
        const allSlots = [...(dayConfig?.morningHours || []), ...(dayConfig?.afternoonHours || [])];
        const hasHoursConfigured = isEnabled && allSlots.length > 0;
        const reservedSlots = appointmentsOnDay.map(apt => apt.time).filter(Boolean);
        const isFullyBooked = hasHoursConfigured && reservedSlots.length >= allSlots.length;
        const hasAvailableSlots = hasHoursConfigured && reservedSlots.length < allSlots.length && !isPast;
        
        let dayClass = 'calendar-day';
        if (isPast) {
            dayClass += ' past';
        }
        if (isToday) {
            dayClass += ' today';
        }

        if (!isPast) {
            if (!isEnabled || !hasHoursConfigured) {
            dayClass += ' disabled';
            } else if (isFullyBooked) {
                dayClass += ' fully-booked';
            } else if (hasAvailableSlots) {
            dayClass += ' available';
            }
        }
        
        if (selectedAppointmentDate === dateStr) {
            dayClass += ' selected';
        }
        
        const safeDateStr = escapeHtml(dateStr);
        const appointmentsInfo = appointmentsOnDay.map(apt => `${apt.time} - ${apt.name || 'Sin nombre'}`).join(', ');

        let dayTitle;
        if (isFullyBooked && !isPast) {
            dayTitle = 'Todas las horas reservadas';
        } else if (hasAvailableSlots) {
            dayTitle = 'Disponible para cita';
        } else if (!isEnabled || !hasHoursConfigured) {
            dayTitle = getDiaSinCitaMensaje();
        } else {
            dayTitle = getDiaSinCitaMensaje();
        }

        if (appointmentsInfo && !isFullyBooked) {
            dayTitle += `\nReservas: ${appointmentsInfo}`;
        }

        let clickAttribute = '';
        if (!isPast) {
            clickAttribute = hasAvailableSlots
                ? `onclick="selectAppointmentDate('${safeDateStr}')"`
                : 'onclick="mostrarDiaSinCitaMensaje()"';
        }
        const cursorStyle = !isPast ? 'pointer' : 'default';
        const availableIndicator = hasAvailableSlots ? '<span class="available-indicator" aria-hidden="true">✓</span>' : '';
        
        calendarHTML += `
            <div class="${dayClass}" 
                 data-date="${safeDateStr}" 
                 data-day="${day}"
                 data-has-available="${hasAvailableSlots ? 'true' : 'false'}"
                 data-is-fully-booked="${isFullyBooked ? 'true' : 'false'}"
                 ${clickAttribute}
                 style="cursor: ${cursorStyle};"
                 title="${escapeHtml(dayTitle)}">
                <span class="day-number">${day}</span>
                ${availableIndicator}
            </div>
        `;
    }
    
    // Calcular días del siguiente mes para completar la última semana
    const totalCells = startingDayOfWeek + daysInMonth;
    const remainingCells = (7 - (totalCells % 7)) % 7;
    if (remainingCells > 0) {
        const nextMonth = currentCalendarMonth === 11 ? 0 : currentCalendarMonth + 1;
        const nextYear = currentCalendarMonth === 11 ? currentCalendarYear + 1 : currentCalendarYear;
        for (let day = 1; day <= remainingCells; day++) {
            const date = new Date(nextYear, nextMonth, day);
            const dateStr = formatDateForStorage(date);
            const isPast = date < today;
            
            calendarHTML += `
                <div class="calendar-day next-month ${isPast ? 'past' : ''}" 
                     data-date="${escapeHtml(dateStr)}" 
                     data-day="${day}"
                     style="opacity: 0.4;">
                    <span class="day-number">${day}</span>
                </div>
            `;
        }
    }
    
    calendarHTML += '</div>';
    calendarGrid.innerHTML = calendarHTML;
}

// Formatear fecha para almacenamiento (YYYY-MM-DD)
function formatDateForStorage(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Formatear fecha para mostrar
function formatDateForDisplay(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 
                       'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    return `${dayNames[date.getDay()]}, ${date.getDate()} de ${monthNames[date.getMonth()]} de ${date.getFullYear()}`;
}

// Cambiar mes del calendario
function changeCalendarMonth(direction) {
    currentCalendarMonth += direction;
    if (currentCalendarMonth < 0) {
        currentCalendarMonth = 11;
        currentCalendarYear--;
    } else if (currentCalendarMonth > 11) {
        currentCalendarMonth = 0;
        currentCalendarYear++;
    }
    renderCalendar();
}
// Seleccionar fecha de cita
function selectAppointmentDate(dateStr) {
    selectedAppointmentDate = dateStr;
    selectedAppointmentTime = null;
    
    // Actualizar campo oculto
    const dateInput = document.getElementById('date');
    if (dateInput) {
        dateInput.value = dateStr;
    }
    
    // Actualizar texto de fecha seleccionada
    const selectedDateText = document.getElementById('selectedDateText');
    if (selectedDateText) {
        selectedDateText.textContent = formatDateForDisplay(dateStr);
    }
    
    // Obtener citas del día seleccionado para mostrar información
    const appointmentsOnDay = appointments.filter(apt => {
        const aptDate = new Date(apt.date);
        return formatDateForStorage(aptDate) === dateStr && apt.status !== 'cancelled';
    });
    
    // Mostrar horarios disponibles (esto también mostrará las citas existentes)
    showTimeSlots(dateStr);
    
    // Re-renderizar calendario para mostrar selección
    renderCalendar();
}
// Mostrar horarios disponibles para una fecha
function showTimeSlots(dateStr) {
    const timeSlotsContainer = document.getElementById('timeSlotsContainer');
    const timeSlotsGrid = document.getElementById('timeSlotsGrid');
    const selectedDateAppointments = document.getElementById('selectedDateAppointments');
    const existingAppointmentsList = document.getElementById('existingAppointmentsList');
    if (!timeSlotsContainer || !timeSlotsGrid) return;
    
    const date = new Date(dateStr + 'T00:00:00');
    const dayOfWeek = date.getDay();
    const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][dayOfWeek];
    const dayConfig = appointmentScheduleConfig.days[dayName];
    
    if (!dayConfig || !dayConfig.enabled) {
        timeSlotsContainer.style.display = 'none';
        showNotification('Este día no tiene horarios disponibles', 'warning');
        return;
    }
    
    // Obtener citas ya reservadas para este día
    const reservedAppointments = appointments.filter(apt => {
        const aptDate = new Date(apt.date);
        return formatDateForStorage(aptDate) === dateStr && apt.status !== 'cancelled';
    });
    const reservedTimes = reservedAppointments.map(apt => apt.time).filter(t => t);
    
    // Mostrar información de citas existentes
    if (selectedDateAppointments && existingAppointmentsList) {
        if (reservedAppointments.length > 0) {
            existingAppointmentsList.innerHTML = '';
            reservedAppointments.forEach(apt => {
                const li = document.createElement('li');
                li.innerHTML = `<strong>${escapeHtml(apt.time)}</strong> - ${escapeHtml(apt.name || 'Sin nombre')} (${escapeHtml(apt.service || 'Sin servicio')})`;
                existingAppointmentsList.appendChild(li);
            });
            selectedDateAppointments.style.display = 'block';
        } else {
            selectedDateAppointments.style.display = 'none';
        }
    }
    
    // Combinar horarios de mañana y tarde
    const allSlots = [...(dayConfig.morningHours || []), ...(dayConfig.afternoonHours || [])];
    
    if (allSlots.length === 0) {
        timeSlotsContainer.style.display = 'none';
        showNotification('No hay horarios configurados para este día', 'warning');
        return;
    }
    
    // Renderizar slots de tiempo
    timeSlotsGrid.innerHTML = '';
    allSlots.forEach(time => {
        const isReserved = reservedTimes.includes(time);
        const reservedAppointment = reservedAppointments.find(apt => apt.time === time);
        const slot = document.createElement('button');
        slot.type = 'button';
        slot.className = `time-slot ${isReserved ? 'reserved' : 'available'}`;
        slot.dataset.time = escapeHtml(time);
        
        if (isReserved) {
            slot.disabled = true;
            const reservedBy = reservedAppointment ? ` - Reservado por ${reservedAppointment.name || 'Sin nombre'}` : '';
            slot.title = `Horario ya reservado${reservedBy}`;
            slot.innerHTML = `<span class="time-text">${escapeHtml(time)}</span> <i class="fas fa-lock" aria-hidden="true"></i>`;
        } else {
            slot.onclick = () => selectAppointmentTime(time);
            if (selectedAppointmentTime === time) {
                slot.classList.add('selected');
            }
            slot.title = 'Horario disponible';
            slot.innerHTML = `<span class="time-text">${escapeHtml(time)}</span>`;
        }
        
        timeSlotsGrid.appendChild(slot);
    });
    
    timeSlotsContainer.style.display = 'block';
}

// Seleccionar hora de cita
function selectAppointmentTime(time) {
    selectedAppointmentTime = time;
    
    // Actualizar campo oculto
    const timeInput = document.getElementById('time');
    if (timeInput) {
        timeInput.value = time;
    }
    
    // Actualizar UI de slots
    const slots = document.querySelectorAll('.time-slot');
    slots.forEach(slot => {
        slot.classList.remove('selected');
        if (slot.dataset.time === time && !slot.disabled) {
            slot.classList.add('selected');
        }
    });
}

// Renderizar calendario del admin (mes completo)
function renderAdminCalendar() {
    const calendarGrid = document.getElementById('adminCalendarGrid');
    if (!calendarGrid) {
        console.log('⚠️ adminCalendarGrid no encontrado, reintentando...');
        setTimeout(() => renderAdminCalendar(), 200);
        return;
    }
    
    // Asegurar que la configuración esté cargada
    loadAppointmentScheduleConfig();
    
    console.log('📅 Renderizando calendario del admin...');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const firstDay = new Date(adminCalendarYear, adminCalendarMonth, 1);
    const lastDay = new Date(adminCalendarYear, adminCalendarMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = (firstDay.getDay() + 6) % 7;
    
    // Nombres de días y meses
    const displayDayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    const dayKeyByIndex = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                       'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    
    // Actualizar título del mes
    const monthYearElement = document.getElementById('adminCurrentMonthYear');
    if (monthYearElement) {
        monthYearElement.textContent = `${monthNames[adminCalendarMonth]} ${adminCalendarYear}`;
    }
    
    // Crear encabezados de días
    let calendarHTML = '<div class="calendar-weekdays">';
    displayDayNames.forEach(day => {
        calendarHTML += `<div class="calendar-weekday">${escapeHtml(day)}</div>`;
    });
    calendarHTML += '</div>';
    
    // Crear grid de días
    calendarHTML += '<div class="calendar-days-grid">';
    
    // Días vacíos al inicio
    for (let i = 0; i < startingDayOfWeek; i++) {
        calendarHTML += '<div class="calendar-day empty"></div>';
    }
    
    // Días del mes
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(adminCalendarYear, adminCalendarMonth, day);
        const dateStr = formatDateForStorage(date);
        const isPast = date < today;
        const isToday = dateStr === formatDateForStorage(today);
        const dayOfWeek = date.getDay();
        const dayKey = dayKeyByIndex[dayOfWeek];
        const dayConfig = appointmentScheduleConfig.days[dayKey];
        const isEnabled = Boolean(dayConfig && dayConfig.enabled);
        
        const appointmentsOnDay = appointments.filter(apt => {
            const aptDate = new Date(apt.date);
            return formatDateForStorage(aptDate) === dateStr && apt.status !== 'cancelled';
        });
        
        const confirmedAppointments = appointmentsOnDay.filter(apt => apt.status === 'confirmed');
        const pendingAppointments = appointmentsOnDay.filter(apt => apt.status === 'pending');
        
        const allSlots = [...(dayConfig?.morningHours || []), ...(dayConfig?.afternoonHours || [])];
        const hasHoursConfigured = isEnabled && allSlots.length > 0;
        const reservedSlots = appointmentsOnDay.map(apt => apt.time).filter(Boolean);
        const isFullyBooked = hasHoursConfigured && reservedSlots.length >= allSlots.length;
        const hasAvailableSlots = hasHoursConfigured && reservedSlots.length < allSlots.length && !isPast;
        
        let dayClass = 'calendar-day';
        if (isPast) {
            dayClass += ' past';
        }
        if (isToday) {
            dayClass += ' today';
        }
        
        if (!isEnabled || !hasHoursConfigured) {
            dayClass += ' disabled';
        } else if (isFullyBooked) {
            dayClass += ' fully-booked';
        } else if (confirmedAppointments.length > 0) {
                dayClass += ' has-confirmed';
            } else if (pendingAppointments.length > 0) {
                dayClass += ' has-pending';
        } else if (hasAvailableSlots) {
            dayClass += ' available';
        }
        
        if (selectedAdminDate === dateStr) {
            dayClass += ' selected';
        }
        
        const safeDateStr = escapeHtml(dateStr);
        const tooltipParts = [];
        if (isFullyBooked) {
            tooltipParts.push('Todas las horas reservadas');
        } else if (hasAvailableSlots) {
            tooltipParts.push('Disponible para cita');
        } else if (!isEnabled || !hasHoursConfigured) {
            tooltipParts.push(getDiaSinCitaMensaje());
        }
        if (appointmentsOnDay.length > 0) {
            tooltipParts.push(`Total reservas: ${appointmentsOnDay.length}`);
        }
        if (confirmedAppointments.length > 0) {
            tooltipParts.push(`Confirmadas: ${confirmedAppointments.length}`);
        }
        if (pendingAppointments.length > 0) {
            tooltipParts.push(`Pendientes: ${pendingAppointments.length}`);
        }
        const dayTitle = tooltipParts.join('\n');
        
        const availableIndicator = hasAvailableSlots ? '<span class="available-indicator" aria-hidden="true">✓</span>' : '';
        
        calendarHTML += `
            <div class="${dayClass}" 
                 data-date="${safeDateStr}" 
                 data-day="${day}"
                 data-has-available="${hasAvailableSlots ? 'true' : 'false'}"
                 data-is-fully-booked="${isFullyBooked ? 'true' : 'false'}"
                 onclick="selectAdminDate('${safeDateStr}')"
                 style="cursor: pointer;"
                 title="${escapeHtml(dayTitle)}">
                <span class="day-number">${day}</span>
                ${availableIndicator}
            </div>
        `;
    }
    
    // Calcular días del siguiente mes para completar la última semana
    const totalCells = startingDayOfWeek + daysInMonth;
    const remainingCells = (7 - (totalCells % 7)) % 7;
    if (remainingCells > 0) {
        const nextMonth = adminCalendarMonth === 11 ? 0 : adminCalendarMonth + 1;
        const nextYear = adminCalendarMonth === 11 ? adminCalendarYear + 1 : adminCalendarYear;
        for (let day = 1; day <= remainingCells; day++) {
            const date = new Date(nextYear, nextMonth, day);
            const dateStr = formatDateForStorage(date);
            const isPast = date < today;
            
            calendarHTML += `
                <div class="calendar-day next-month ${isPast ? 'past' : ''}" 
                     data-date="${escapeHtml(dateStr)}" 
                     data-day="${day}"
                     style="opacity: 0.4;">
                    <span class="day-number">${day}</span>
                </div>
            `;
        }
    }
    
    calendarHTML += '</div>';
    calendarGrid.innerHTML = calendarHTML;
    console.log('✅ Calendario del admin renderizado correctamente');
}

// Cambiar mes del calendario del admin
function changeAdminCalendarMonth(direction) {
    adminCalendarMonth += direction;
    if (adminCalendarMonth < 0) {
        adminCalendarMonth = 11;
        adminCalendarYear--;
    } else if (adminCalendarMonth > 11) {
        adminCalendarMonth = 0;
        adminCalendarYear++;
    }
    renderAdminCalendar();
}
// Seleccionar fecha en el calendario del admin
function selectAdminDate(dateStr) {
    selectedAdminDate = dateStr;
    
    // Obtener el día de la semana
    const date = new Date(dateStr + 'T00:00:00');
    const dayOfWeek = date.getDay();
    const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][dayOfWeek];
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    
    // Mostrar panel de configuración del día
    const dayConfigPanel = document.getElementById('adminDayConfigPanel');
    const selectedDayTitle = document.getElementById('adminSelectedDayTitle');
    const dayEnabledCheckbox = document.getElementById('adminDayEnabled');
    const dayHoursConfig = document.getElementById('adminDayHoursConfig');
    
    if (dayConfigPanel && selectedDayTitle && dayEnabledCheckbox) {
        dayConfigPanel.style.display = 'block';
        selectedDayTitle.textContent = `${dayNames[dayOfWeek]}, ${formatDateForDisplay(dateStr)}`;
        
        // Cargar configuración del día
        const dayConfig = appointmentScheduleConfig.days[dayName];
        if (dayConfig) {
            dayEnabledCheckbox.checked = dayConfig.enabled || false;
            toggleAdminDayEnabled(); // Esto mostrará/ocultará la configuración de horarios
            loadAdminDayHoursConfig(dayName);
        } else {
            dayEnabledCheckbox.checked = false;
            toggleAdminDayEnabled();
        }
    }
    
    // Obtener citas del día seleccionado
    const appointmentsOnDay = appointments.filter(apt => {
        const aptDate = new Date(apt.date);
        return formatDateForStorage(aptDate) === dateStr;
    });
    
    const selectedDateContainer = document.getElementById('adminSelectedDateAppointments');
    const dayAppointmentsList = document.getElementById('adminDayAppointmentsList');
    
    if (selectedDateContainer && dayAppointmentsList) {
        if (appointmentsOnDay.length > 0) {
            dayAppointmentsList.innerHTML = appointmentsOnDay.map(apt => {
                const statusBadge = {
                    'pending': '<span class="status-badge status-pending" style="padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.75rem; font-weight: 500; text-transform: uppercase; background: rgba(245, 158, 11, 0.2); color: var(--accent-color);">Pendiente</span>',
                    'confirmed': '<span class="status-badge status-confirmed" style="padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.75rem; font-weight: 500; text-transform: uppercase; background: rgba(34, 197, 94, 0.2); color: #22c55e;">Confirmada</span>',
                    'cancelled': '<span class="status-badge status-cancelled" style="padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.75rem; font-weight: 500; text-transform: uppercase; background: rgba(239, 68, 68, 0.2); color: var(--error-color);">Cancelada</span>'
                }[apt.status] || '';
                
                return `
                    <div class="appointment-item" data-status="${apt.status}" style="margin-bottom: 1rem; padding: 1rem; border: 1px solid var(--border-color); border-radius: var(--border-radius); background: var(--bg-secondary);">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                            <div style="flex: 1;">
                                <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 0.25rem;">${escapeHtml(apt.name || 'Sin nombre')}</div>
                                <div style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 0.25rem;">
                                    <i class="fas fa-clock"></i> ${escapeHtml(apt.time || 'Sin hora')} - ${escapeHtml(getServiceName(apt.service))}
                                </div>
                            </div>
                            <div>${statusBadge}</div>
                        </div>
                        <div style="font-size: 0.85rem; color: var(--text-secondary);">
                            <p style="margin-bottom: 0.25rem;"><strong>DNI:</strong> ${escapeHtml(apt.dni || 'N/A')}</p>
                            <p style="margin-bottom: 0.25rem;"><strong>Email:</strong> ${escapeHtml(apt.email || 'N/A')}</p>
                            <p style="margin-bottom: 0.25rem;"><strong>Teléfono:</strong> ${escapeHtml(apt.phone || 'N/A')}</p>
                        </div>
                        <div style="display: flex; gap: 0.5rem; margin-top: 0.75rem; flex-wrap: wrap;">
                            <button class="btn btn-primary btn-sm" onclick="editAppointment('${apt.id}')">
                                <i class="fas fa-edit"></i> Editar
                            </button>
                            ${apt.status === 'pending' ? `
                                <button class="btn btn-success btn-sm" onclick="updateAppointmentStatus('${apt.id}', 'confirmed'); renderAdminCalendar(); selectAdminDate('${dateStr}');">
                                    <i class="fas fa-check"></i> Confirmar
                                </button>
                            ` : ''}
                            ${apt.status !== 'cancelled' ? `
                                <button class="btn btn-warning btn-sm" onclick="updateAppointmentStatus('${apt.id}', 'cancelled'); renderAdminCalendar(); selectAdminDate('${dateStr}');">
                                    <i class="fas fa-times"></i> Cancelar
                                </button>
                            ` : ''}
                        </div>
                    </div>
                `;
            }).join('');
            
            selectedDateContainer.style.display = 'block';
        } else {
            selectedDateContainer.style.display = 'none';
        }
    }
    
    // Re-renderizar calendario para mostrar selección
    renderAdminCalendar();
}

// Toggle para activar/desactivar día
function toggleAdminDayEnabled() {
    const dayEnabledCheckbox = document.getElementById('adminDayEnabled');
    const dayHoursConfig = document.getElementById('adminDayHoursConfig');
    
    if (dayEnabledCheckbox && dayHoursConfig) {
        if (dayEnabledCheckbox.checked) {
            dayHoursConfig.style.display = 'block';
            // Si no hay horarios configurados, cargar los del día de la semana
            if (selectedAdminDate) {
                const date = new Date(selectedAdminDate + 'T00:00:00');
                const dayOfWeek = date.getDay();
                const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][dayOfWeek];
                loadAdminDayHoursConfig(dayName);
            }
        } else {
            dayHoursConfig.style.display = 'none';
        }
    }
}

// Cargar configuración de horarios del día
function loadAdminDayHoursConfig(dayName) {
    const dayConfig = appointmentScheduleConfig.days[dayName];
    const morningHours = dayConfig?.morningHours || [];
    const afternoonHours = dayConfig?.afternoonHours || [];
    
    // Si no hay horarios, usar valores por defecto
    const defaultMorning = morningHours.length > 0 ? morningHours : ['09:00', '10:00', '11:00', '12:00'];
    const defaultAfternoon = afternoonHours.length > 0 ? afternoonHours : ['16:00', '17:00', '18:00'];
    
    // Cargar horarios de mañana
    const morningContainer = document.getElementById('adminDayMorningHours');
    if (morningContainer) {
        morningContainer.innerHTML = '';
        defaultMorning.forEach(hour => {
            const item = document.createElement('div');
            item.className = 'hour-input-item';
            item.style.cssText = 'display: flex; gap: 0.5rem; margin-bottom: 0.5rem; align-items: center;';
            item.innerHTML = `
                <input type="time" class="hour-time-input" value="${escapeHtml(hour)}" style="flex: 1; padding: 0.5rem; border: 1px solid var(--border-color); border-radius: 4px;">
                <button type="button" class="btn btn-outline btn-sm" onclick="removeAdminDayHourSlot(this, 'morning')" style="padding: 0.5rem;">
                    <i class="fas fa-times"></i>
                </button>
            `;
            morningContainer.appendChild(item);
        });
    }
    
    // Cargar horarios de tarde
    const afternoonContainer = document.getElementById('adminDayAfternoonHours');
    if (afternoonContainer) {
        afternoonContainer.innerHTML = '';
        defaultAfternoon.forEach(hour => {
            const item = document.createElement('div');
            item.className = 'hour-input-item';
            item.style.cssText = 'display: flex; gap: 0.5rem; margin-bottom: 0.5rem; align-items: center;';
            item.innerHTML = `
                <input type="time" class="hour-time-input" value="${escapeHtml(hour)}" style="flex: 1; padding: 0.5rem; border: 1px solid var(--border-color); border-radius: 4px;">
                <button type="button" class="btn btn-outline btn-sm" onclick="removeAdminDayHourSlot(this, 'afternoon')" style="padding: 0.5rem;">
                    <i class="fas fa-times"></i>
                </button>
            `;
            afternoonContainer.appendChild(item);
        });
    }
}

// Agregar slot de hora para el día
function addAdminDayHourSlot(period) {
    const containerId = period === 'morning' ? 'adminDayMorningHours' : 'adminDayAfternoonHours';
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const item = document.createElement('div');
    item.className = 'hour-input-item';
    item.style.cssText = 'display: flex; gap: 0.5rem; margin-bottom: 0.5rem; align-items: center;';
    item.innerHTML = `
        <input type="time" class="hour-time-input" value="09:00" style="flex: 1; padding: 0.5rem; border: 1px solid var(--border-color); border-radius: 4px;">
        <button type="button" class="btn btn-outline btn-sm" onclick="removeAdminDayHourSlot(this, '${period}')" style="padding: 0.5rem;">
            <i class="fas fa-times"></i>
        </button>
    `;
    container.appendChild(item);
}

// Eliminar slot de hora del día
function removeAdminDayHourSlot(button, period) {
    button.closest('.hour-input-item').remove();
}

// Guardar configuración del día
function saveAdminDayConfig() {
    if (!selectedAdminDate) {
        showNotification('No hay día seleccionado', 'error');
        return;
    }
    
    const date = new Date(selectedAdminDate + 'T00:00:00');
    const dayOfWeek = date.getDay();
    const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][dayOfWeek];
    const dayEnabledCheckbox = document.getElementById('adminDayEnabled');
    
    if (!dayEnabledCheckbox) {
        showNotification('Error: No se pudo encontrar la configuración del día', 'error');
        return;
    }
    
    // Obtener horarios de mañana
    const morningContainer = document.getElementById('adminDayMorningHours');
    const morningInputs = morningContainer ? morningContainer.querySelectorAll('.hour-time-input') : [];
    const morningHours = Array.from(morningInputs).map(input => input.value).filter(v => v);
    
    // Obtener horarios de tarde
    const afternoonContainer = document.getElementById('adminDayAfternoonHours');
    const afternoonInputs = afternoonContainer ? afternoonContainer.querySelectorAll('.hour-time-input') : [];
    const afternoonHours = Array.from(afternoonInputs).map(input => input.value).filter(v => v);
    
    // Actualizar configuración
    if (!appointmentScheduleConfig.days[dayName]) {
        appointmentScheduleConfig.days[dayName] = { enabled: false, morningHours: [], afternoonHours: [] };
    }
    
    appointmentScheduleConfig.days[dayName].enabled = dayEnabledCheckbox.checked;
    appointmentScheduleConfig.days[dayName].morningHours = morningHours;
    appointmentScheduleConfig.days[dayName].afternoonHours = afternoonHours;
    
    // Guardar en localStorage
    localStorage.setItem('appointmentScheduleConfig', JSON.stringify(appointmentScheduleConfig));
    
    // Re-renderizar calendario
    renderAdminCalendar();
    
    showNotification('Configuración del día guardada correctamente', 'success');
}

// Inicializar calendario cuando se abre el formulario
function initializeAppointmentCalendar() {
    loadAppointmentScheduleConfig();
    currentCalendarMonth = new Date().getMonth();
    currentCalendarYear = new Date().getFullYear();
    renderCalendar();
}

// Cargar configuración al iniciar
loadAppointmentScheduleConfig();

// Inicializar calendario cuando se muestra el formulario
document.addEventListener('DOMContentLoaded', function() {
    const toggleBtn = document.getElementById('toggleAppointmentForm');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', function() {
            setTimeout(() => {
                if (document.getElementById('appointmentFormContainer')?.style.display !== 'none') {
                    initializeAppointmentCalendar();
                }
            }, 100);
        });
    }
    
    // Ejecutar prueba automáticamente si hay parámetro ?testAppointment=true en la URL
    if (window.location.search.includes('testAppointment=true')) {
        setTimeout(async () => {
            console.log('🧪 Modo de prueba activado. Ejecutando prueba de cita previa...');
            if (typeof createTestAppointment === 'function') {
                try {
                    await createTestAppointment();
                } catch (error) {
                    console.error('❌ Error ejecutando prueba:', error);
                }
            } else {
                console.error('❌ La función createTestAppointment no está disponible');
            }
        }, 3000);
    }
});