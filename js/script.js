// Variables globales
let currentUser = null;
let isAdmin = false;
let isSuperAdmin = false; // Solo true con sesión Firebase y admins/{uid}.isSuperAdmin

function isFirebaseReady() {
    try {
        return !!(window.firebase && firebase.apps && firebase.apps.length > 0);
    } catch (_) {
        return false;
    }
}

function getFirebaseAuthSafe() {
    if (!isFirebaseReady() || !window.firebase.auth) {
        return null;
    }
    try {
        return firebase.auth();
    } catch (_) {
        return null;
    }
}

/** URL canónica del ayuntamiento (producción: www.ayuntamientodecobreros.com) */
function getSiteOrigin() {
    if (typeof window !== 'undefined' && window.location && window.location.origin) {
        return String(window.location.origin).replace(/\/$/, '');
    }
    if (typeof CONFIG !== 'undefined' && CONFIG.municipality && CONFIG.municipality.canonicalUrl) {
        return String(CONFIG.municipality.canonicalUrl).replace(/\/$/, '');
    }
    return 'https://www.ayuntamientodecobreros.com';
}

/** Texto para ciudadanos/admin: sin jerga técnica (Firebase → nube). */
function cloudUserText(text) {
    if (text == null) return text;
    return String(text)
        .replace(/Firebase Functions/gi, 'servicios en la nube')
        .replace(/Firebase Authentication/gi, 'acceso en la nube')
        .replace(/Firebase Storage/gi, 'almacenamiento en la nube')
        .replace(/Firebase Auth/gi, 'acceso en la nube')
        .replace(/Firestore/gi, 'nube')
        .replace(/Firebase/gi, 'nube');
}

let notifications = [];
let users = [];
let news = [];
let bandos = [];
let administrators = []; // Lista de administradores creados
let documents = []; // Lista de documentos subidos
let events = []; // Lista de eventos de cultura y ocio
let quickAccess = []; // Lista de tarjetas de acceso rápido
// Estado del sistema de citas previas - Se carga desde localStorage
let appointmentsEnabled = null; // Se inicializa en loadAppointmentSettings()
let appointments = []; // Lista de citas previas solicitadas
let publicNotifications = []; // Lista de notificaciones públicas
let appointmentAvailability = {
    enabledDays: [1, 2, 3, 4, 5],
    timeSlots: ['09:00', '10:00', '11:00', '12:00', '16:00', '17:00', '18:00'],
    slotCapacityDefault: 1,
    capacityBySlot: {},
    holidays: [],
    exceptionsByDate: {},
    updatedAt: null,
    updatedBy: 'system'
};

/** Evita bucles al aplicar backup remoto de Firestore sobre localStorage */
let _applyingRemoteFirestoreSync = false;
let _lastRemoteFirestoreSyncMs = 0;
let _lastForcedPublicRefreshMs = 0;
let _forcedPublicRefreshInFlight = false;

// Detección de dispositivo
let deviceType = 'desktop'; // 'desktop', 'mobile', 'tablet'
let isMobile = false;
let isTablet = false;
let isDesktop = false;

/** Email reservado (no crear otra cuenta admin con el mismo correo). Permisos solo vía Firebase admins/{uid}. */
const SUPER_ADMIN_EMAIL = 'amco@gmx.es';

/** Pueblos del municipio — misma lista en registro, notificaciones y panel admin. */
/** APK vecinos (pública) y endpoint admin para APK avisos (solo panel administración). */
const COBREROS_APK_VECINOS_URL = 'downloads/cobreros-vecinos.apk';
const COBREROS_APK_AVISOS_CF_URL =
    'https://us-central1-ayuntamiento-de-cobreros.cloudfunctions.net/downloadAvisosApk';

const COBREROS_LOCALITIES = [
    'Cobreros',
    'Avedillo de Sanabria',
    'Barrio de Lomba',
    'Castro de Sanabria',
    'Limianos',
    'Quintana de Sanabria',
    'Riego de Lomba',
    'San Martín del Terroso',
    'San Miguel de Lomba',
    'San Román de Sanabria',
    'Santa Colomba',
    'Sotillo',
    'Terroso'
];

// Inicialización cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
    detectDevice();
    createAdminButton();
    try {
        initializeApp();
    } catch (error) {
        console.error('Error al inicializar la aplicación:', error);
    }
    setupApkDownloadUi();
    setupVecinosShareFab();
    setupEventListeners();
    loadData();
    void loadAdministrators();
    loadDocuments();
    loadEvents();
    renderEventos();
    updateCulturaOcioSection();
    loadQuickAccess();
    
    // Asegurar persistencia completa
    ensureCompletePersistence();
    
    // Configurar editor de texto enriquecido
    setTimeout(() => {
        setupRichEditor();
    }, 1000);
    
    // Cargar contenido de Cobreros
    setTimeout(() => {
        loadCobrerosContent();
    }, 1500);
    
    // Cargar configuración de citas previas (CRÍTICO - SIEMPRE PRIMERO)
    loadAppointmentSettings();
    
    // Asegurar que se carga después del DOM
    setTimeout(() => {
        loadAppointmentSettings();
        console.log('🔄 Segunda carga de configuración de citas (seguridad)');
    }, 500);
    
    // Verificación adicional para asegurar persistencia
    setTimeout(() => {
        const savedSettings = localStorage.getItem('appointmentSettings');
        if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            console.log('🔍 Verificación de persistencia:', settings.enabled ? 'CITA PREVIA' : 'SIN CITA PREVIA');
            
            // Forzar actualización de UI si es necesario
            if (appointmentsEnabled !== settings.enabled) {
                console.log('⚠️ Inconsistencia detectada, corrigiendo...');
                appointmentsEnabled = settings.enabled;
                updateAppointmentUI();
            }
        } else {
            console.log('⚠️ No se encontró configuración guardada, usando valor por defecto');
        }
    }, 1000);
    
    // Migrar usuarios a Firestore si es necesario
    migrateUsersToFirestore();
    
    // Verificar integridad de datos
    setTimeout(() => {
        const isDataValid = verifyDataIntegrity();
        if (!isDataValid) {
            console.log('⚠️ Problemas de integridad detectados, reparando...');
            repairCorruptedData();
        }
    }, 500);
    
    // Intentar restaurar desde Firestore si no hay datos locales
    setTimeout(() => {
        if ((bandos.length === 0 && news.length === 0) || 
            localStorage.getItem('restoreFromFirestore') === 'true') {
            console.log('🔄 Intentando restaurar desde Firestore...');
            restoreContentFromFirestore();
        }
    }, 1500);
    
    // Backup automático inicial
    setTimeout(() => {
        if (window.firebase && window.firebase.firestore()) {
            backupContentToFirestore();
        }
    }, 3000);
    
    // Asegurar carga de usuarios después de migración
    setTimeout(() => {
        const currentUsers = JSON.parse(localStorage.getItem('users') || '[]');
        if (currentUsers.length !== users.length) {
            console.log('🔄 Recargando usuarios por seguridad...');
            users = currentUsers;
        }
        console.log(`👥 Total usuarios en memoria: ${users.length}`);
    }, 1000);
    
    // Inicializar PWA
    initializePWA();

    // Sincronización multi-dispositivo (web / pestañas) vía Firestore
    setupFirestoreRealtimeSync();
    setupAutoRefreshOnOpenAndFocus();
    scheduleFirestoreBackupInterval();
});

// ===== DETECCIÓN DE DISPOSITIVO =====

// Detectar tipo de dispositivo
function detectDevice() {
    const userAgent = navigator.userAgent.toLowerCase();
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    
    // Detectar móvil
    const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|huawei|honor|harmonyos/i;
    const isMobileUA = mobileRegex.test(userAgent);
    
    // Detectar tablet
    const tabletRegex = /ipad|android(?!.*mobile)|tablet/i;
    const isTabletUA = tabletRegex.test(userAgent);
    
    // Lógica de detección
    if (isMobileUA && screenWidth <= 768) {
        deviceType = 'mobile';
        isMobile = true;
        isTablet = false;
        isDesktop = false;
    } else if (isTabletUA || (screenWidth > 768 && screenWidth <= 1024)) {
        deviceType = 'tablet';
        isMobile = false;
        isTablet = true;
        isDesktop = false;
    } else {
        deviceType = 'desktop';
        isMobile = false;
        isTablet = false;
        isDesktop = true;
    }
    
    // Añadir clase CSS al body
    document.body.classList.add(`device-${deviceType}`);
    
    // Log para debugging
    console.log(`📱 Dispositivo detectado: ${deviceType.toUpperCase()}`);
    console.log(`📏 Resolución: ${screenWidth}x${screenHeight}`);
    console.log(`🌐 User Agent: ${userAgent.substring(0, 50)}...`);
    
    // Guardar en localStorage para futuras visitas
    localStorage.setItem('deviceType', deviceType);
    localStorage.setItem('lastScreenSize', JSON.stringify({ width: screenWidth, height: screenHeight }));
    
    // Ejecutar acciones específicas por dispositivo
    handleDeviceSpecificActions();
}

// Manejar acciones específicas por dispositivo
function handleDeviceSpecificActions() {
    if (isMobile) {
        // Acciones para móvil
        console.log('📱 Configurando experiencia móvil...');
        
        // Optimizar para touch
        document.body.classList.add('touch-optimized');
        
        // Verificar estado de la app y mostrar mensajes apropiados
        setTimeout(() => {
            checkMobileAppStatus();
        }, 2000);
        
    } else if (isTablet) {
        // Acciones para tablet
        console.log('📱 Configurando experiencia tablet...');
        document.body.classList.add('tablet-optimized');
        
    } else {
        // Acciones para desktop
        console.log('🖥️ Configurando experiencia desktop...');
        document.body.classList.add('desktop-optimized');
        
        // Mostrar información adicional en desktop
        showDesktopFeatures();
    }
}

// ===== SISTEMA MÓVIL PARA APP DE NOTIFICACIONES =====

// Verificar estado de la app en móvil
function checkMobileAppStatus() {
    const currentUser = localStorage.getItem('currentUser');
    const appInstalled = localStorage.getItem('cobrerosAppInstalled');
    const appDismissed = localStorage.getItem('cobrerosAppDismissed');
    
    console.log('📱 Verificando estado de app móvil:', {
        user: !!currentUser,
        installed: !!appInstalled,
        dismissed: !!appDismissed
    });
    
    // Si la app ya está instalada o el mensaje fue descartado, no mostrar nada
    if (appInstalled || appDismissed) {
        console.log('📱 App ya instalada o mensaje descartado');
        return;
    }
    
    // Si hay usuario registrado, mostrar mensaje de descarga
    if (currentUser) {
        showMobileAppDownloadMessage();
    } else {
        // Si no hay usuario, mostrar mensaje de registro + descarga
        showMobileRegistrationMessage();
    }
}

// Mostrar mensaje de registro para usuarios no registrados
function showMobileRegistrationMessage() {
    const message = document.createElement('div');
    message.className = 'mobile-registration-message';
    message.innerHTML = `
        <div class="mobile-message-content">
            <button class="mobile-close-btn" onclick="dismissMobileMessage()" title="Cerrar">×</button>
            <img src="images/escudo-cobreros.png" alt="Escudo Cobreros" class="mobile-logo">
            <div class="mobile-message-text">
                <h3>📱 App COBREROS</h3>
                <p><strong>Regístrate</strong> para recibir avisos. En Android puedes instalar la app; en iPhone usa la PWA.</p>
                <div class="mobile-buttons">
                    <button onclick="openRegistration()" class="btn btn-primary">Registrarse</button>
                    <button onclick="downloadMobileApp()" class="btn btn-outline">Descargar app</button>
                    <button onclick="dismissMobileMessage()" class="btn btn-secondary">Ahora no</button>
                </div>
            </div>
        </div>
    `;
    
    addMobileMessageStyles();
    document.body.appendChild(message);
    
    // Auto-dismiss después de 15 segundos
    setTimeout(() => {
        if (message.parentNode) {
            dismissMobileMessage();
        }
    }, 15000);
}

// Mostrar mensaje de descarga para usuarios registrados
function showMobileAppDownloadMessage() {
    const message = document.createElement('div');
    message.className = 'mobile-download-message';
    message.innerHTML = `
        <div class="mobile-message-content">
            <button class="mobile-close-btn" onclick="dismissMobileMessage()" title="Cerrar">×</button>
            <img src="images/escudo-cobreros.png" alt="Escudo Cobreros" class="mobile-logo">
            <div class="mobile-message-text">
                <h3>📱 App COBREROS Vecinos</h3>
                <p>Recibe avisos del ayuntamiento con sonido en tu móvil Android (o usa la PWA en iPhone)</p>
                <div class="mobile-buttons">
                    <button onclick="downloadMobileApp()" class="btn btn-primary">Descargar app</button>
                    <button onclick="dismissMobileMessage()" class="btn btn-secondary">Ahora no</button>
                </div>
            </div>
        </div>
    `;
    
    addMobileMessageStyles();
    document.body.appendChild(message);
    
    // Auto-dismiss después de 12 segundos
    setTimeout(() => {
        if (message.parentNode) {
            dismissMobileMessage();
        }
    }, 12000);
}

// Añadir estilos para mensajes móviles
function addMobileMessageStyles() {
    if (document.getElementById('mobile-message-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'mobile-message-styles';
    style.textContent = `
        .mobile-registration-message,
        .mobile-download-message {
            position: fixed;
            bottom: 20px;
            left: 15px;
            right: 15px;
            background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
            color: white;
            border-radius: 20px;
            padding: 20px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
            z-index: 1000;
            animation: mobileSlideUp 0.4s ease-out;
        }
        
        .mobile-message-content {
            display: flex;
            align-items: flex-start;
            gap: 15px;
            position: relative;
        }
        
        .mobile-close-btn {
            position: absolute;
            top: -5px;
            right: -5px;
            background: rgba(255, 255, 255, 0.2);
            border: none;
            color: white;
            font-size: 20px;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s ease;
        }
        
        .mobile-close-btn:hover {
            background: rgba(255, 255, 255, 0.3);
            transform: scale(1.1);
        }
        
        .mobile-logo {
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background: white;
            padding: 8px;
            flex-shrink: 0;
        }
        
        .mobile-message-text {
            flex: 1;
        }
        
        .mobile-message-text h3 {
            margin: 0 0 8px 0;
            font-size: 1.2rem;
            font-weight: 700;
        }
        
        .mobile-message-text p {
            margin: 0 0 15px 0;
            font-size: 0.95rem;
            line-height: 1.4;
            opacity: 0.95;
        }
        
        .mobile-buttons {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }
        
        .mobile-buttons .btn {
            padding: 12px 20px;
            border: none;
            border-radius: 12px;
            font-size: 0.95rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            flex: 1;
            min-width: 120px;
        }
        
        .mobile-buttons .btn-primary {
            background: #3498db;
            color: white;
        }
        
        .mobile-buttons .btn-primary:hover {
            background: #2980b9;
            transform: translateY(-2px);
        }
        
        .mobile-buttons .btn-secondary {
            background: rgba(255, 255, 255, 0.2);
            color: white;
            border: 1px solid rgba(255, 255, 255, 0.3);
        }
        
        .mobile-buttons .btn-secondary:hover {
            background: rgba(255, 255, 255, 0.3);
        }
        
        @keyframes mobileSlideUp {
            from { 
                transform: translateY(100%); 
                opacity: 0; 
            }
            to { 
                transform: translateY(0); 
                opacity: 1; 
            }
        }
    `;
    
    document.head.appendChild(style);
}

// Abrir registro
function openRegistration() {
    // Simular click en el botón de registro
    const registerBtn = document.querySelector('[onclick*="openModal.*registerModal"]');
    if (registerBtn) {
        registerBtn.click();
    } else {
        // Fallback: mostrar modal de registro
        showNotification('Por favor, regístrate para acceder a todas las funcionalidades', 'info');
    }
    dismissMobileMessage();
}

// Descargar app móvil (vecinos: APK Android o PWA en iOS)
function downloadMobileApp() {
    const userAgent = navigator.userAgent.toLowerCase();
    const isIOS = isAppleClientDevice();
    const isAndroid = /android/.test(userAgent);

    if (isAndroid) {
        downloadVecinosApk();
    } else if (isIOS) {
        openIosVecinosApp();
    } else {
        showNotification('En Android descarga la APK. En iPhone, iPad o Mac usa App iPhone (Safari).', 'info');
    }

    setTimeout(() => {
        localStorage.setItem('cobrerosAppInstalled', 'true');
    }, 5000);

    dismissMobileMessage();
}

/** Descarga pública APK Cobreros Vecinos (recibir avisos). */
function downloadVecinosApk() {
    const link = document.createElement('a');
    link.href = COBREROS_APK_VECINOS_URL;
    link.download = 'cobreros-vecinos.apk';
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification('📱 Descargando app Cobreros Vecinos. Permite instalar desde orígenes desconocidos si el móvil lo pide.', 'info');
}

/** Mensaje para compartir la app de avisos (solo personal; sin enlace público directo). */
function getAvisosApkShareMessage() {
    const origin = getSiteOrigin();
    return (
        'App COBREROS AVISOS (solo personal autorizado del ayuntamiento).\n\n' +
        '1) Abre la web del ayuntamiento e inicia sesión como administrador.\n' +
        '2) Panel de Administración → Configuración → App Cobreros Avisos.\n' +
        '3) Descarga la APK e instálala en este móvil.\n\n' +
        'Web: ' + origin
    );
}

/** Descarga APK avisos — solo administradores autenticados (Cloud Function). */
async function downloadAvisosApkAdmin() {
    if (!(await isFirebaseAdmin())) {
        showNotification('Solo administradores pueden descargar la app de avisos', 'error');
        return;
    }
    try {
        const token = await getAuthBearerToken();
        if (!token) {
            showNotification('Inicia sesión de administrador en la nube', 'error');
            return;
        }
        showNotification('Preparando descarga de Cobreros Avisos…', 'info');
        const response = await fetch(COBREROS_APK_AVISOS_CF_URL, {
            method: 'GET',
            headers: { Authorization: 'Bearer ' + token }
        });
        if (!response.ok) {
            let errText = 'No se pudo descargar la APK';
            try {
                const errJson = await response.json();
                if (errJson.error) {
                    errText = errJson.error;
                }
            } catch (_) {
                errText = response.statusText || errText;
            }
            showNotification(errText, 'error');
            return;
        }
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'cobreros-avisos.apk';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showNotification('APK Cobreros Avisos descargada', 'success');
    } catch (error) {
        console.error('downloadAvisosApkAdmin:', error);
        showNotification('Error al descargar la app de avisos', 'error');
    }
}

function shareAvisosApkViaSms() {
    shareAvisosApkToPhone('sms');
}

function shareAvisosApkViaWhatsApp() {
    shareAvisosApkToPhone('whatsapp');
}

function shareAvisosApkViaEmail() {
    shareAvisosApkToPhone('email');
}

/** Enviar instrucciones de instalación a otro móvil (solo desde panel admin). */
async function shareAvisosApkToPhone(channel) {
    if (!(await isFirebaseAdmin())) {
        showNotification('Solo desde el panel de administración', 'error');
        return;
    }
    const phoneInput = document.getElementById('avisosApkSharePhone');
    const emailInput = document.getElementById('avisosApkShareEmail');
    const phone = phoneInput ? phoneInput.value.replace(/\s/g, '') : '';
    const email = emailInput ? emailInput.value.trim() : '';
    const body = encodeURIComponent(getAvisosApkShareMessage());
    const subject = encodeURIComponent('Instalar app Cobreros Avisos (personal autorizado)');

    if (channel === 'sms') {
        if (!phone) {
            showNotification('Indica un número de móvil', 'warning');
            return;
        }
        const num = phone.replace(/^\+/, '');
        window.open('sms:+' + num + '?body=' + body, '_blank');
        return;
    }
    if (channel === 'whatsapp') {
        const waPhone = phone ? phone.replace(/\D/g, '') : '';
        const waUrl = waPhone
            ? 'https://wa.me/' + waPhone + '?text=' + body
            : 'https://wa.me/?text=' + body;
        window.open(waUrl, '_blank');
        return;
    }
    if (channel === 'email') {
        const mailTo = email || '';
        window.open('mailto:' + mailTo + '?subject=' + subject + '&body=' + body, '_blank');
        return;
    }
    if (navigator.share) {
        try {
            await navigator.share({
                title: 'Cobreros Avisos',
                text: getAvisosApkShareMessage()
            });
        } catch (_) {}
    }
}

/** Muestra u oculta botones de APK / app iOS según dispositivo. */
function setupApkDownloadUi() {
    const isAndroid = /android/i.test(navigator.userAgent);
    const isApple = isAppleClientDevice();

    document.querySelectorAll('.apk-vecinos-android-only').forEach((el) => {
        el.style.display = isAndroid ? '' : 'none';
    });
    document.querySelectorAll('.apk-vecinos-ios-only').forEach((el) => {
        el.style.display = isApple ? '' : 'none';
    });
    document.querySelectorAll('.apk-vecinos-ios-hint').forEach((el) => {
        el.style.display = isApple && !isPwaStandalone() ? '' : 'none';
    });
}

// —— Instalación PWA en iPhone (sin App Store) ——

const IOS_INSTALL_HINT_KEY = 'cobrerosIosInstallHintShown';

function isIOSDevice() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent || '');
}

/** iPhone, iPad o Mac (Safari / PWA). */
function isAppleClientDevice() {
    const ua = (navigator.userAgent || '').toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) {
        return true;
    }
    if (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) {
        return true;
    }
    return /macintosh|mac os x/.test(ua);
}

function isSafariBrowser() {
    const ua = (navigator.userAgent || '').toLowerCase();
    const isOtherBrowser = /crios|fxios|edgios|opios|mercury|gsa\/|chrome|chromium|edg\//.test(ua);
    return !isOtherBrowser && /safari/.test(ua);
}

function isPwaStandalone() {
    const standaloneMedia = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
    const standaloneNav = typeof navigator !== 'undefined' && navigator.standalone === true;
    return !!(standaloneMedia || standaloneNav);
}

function closeIosInstallModal() {
    const modal = document.getElementById('ios-install-modal');
    if (!modal) {
        return;
    }
    modal.classList.remove('visible');
    setTimeout(() => modal.remove(), 200);
}

function copySiteUrlForSafari() {
    const url = window.location.href.split('#')[0];
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(() => {
            showNotification('Enlace copiado. Ábrelo en Safari.', 'success');
        }).catch(() => {
            prompt('Copia este enlace y ábrelo en Safari:', url);
        });
        return;
    }
    prompt('Copia este enlace y ábrelo en Safari:', url);
}

function showIosInstallInstructions(options) {
    options = options || {};
    closeIosInstallModal();
    localStorage.setItem(IOS_INSTALL_HINT_KEY, 'true');

    if (isPwaStandalone() && !options.force) {
        showNotification('Ya tienes la app instalada. Si no recibes avisos, activa las notificaciones en Ajustes.', 'info');
        return;
    }

    const inSafari = isSafariBrowser();
    const escudoUrl = new URL('images/escudo-cobreros-192.png', window.location.href).href;
    const safariBlock = !inSafari ? `
        <div class="ios-install-alert">
            <strong>Abre esta página en Safari</strong>
            <p>Para instalar en iPhone debes usar <strong>Safari</strong> (no Chrome, WhatsApp ni Facebook).</p>
            <button type="button" class="btn btn-outline btn-small" onclick="copySiteUrlForSafari()">Copiar enlace</button>
        </div>
    ` : '';

    const modal = document.createElement('div');
    modal.id = 'ios-install-modal';
    modal.className = 'ios-install-modal';
    modal.innerHTML = `
        <div class="ios-install-content" role="dialog" aria-modal="true" aria-labelledby="ios-install-title">
            <button type="button" class="ios-install-close" onclick="closeIosInstallModal()" aria-label="Cerrar">&times;</button>
            <div class="ios-install-header">
                <img src="${escudoUrl}" alt="Escudo de Cobreros" class="ios-install-icon" width="72" height="72">
                <div>
                    <h3 id="ios-install-title">Instalar Cobreros Vecinos</h3>
                    <p>Recibe avisos del ayuntamiento con el escudo en tu pantalla de inicio.</p>
                </div>
            </div>
            ${safariBlock}
            <ol class="ios-install-steps">
                <li><strong>Regístrate</strong> en la web si aún no lo has hecho.</li>
                <li>En <strong>Safari</strong>, pulsa <strong>Compartir</strong> <span aria-hidden="true">(⬆️)</span>.</li>
                <li>Elige <strong>Añadir a pantalla de inicio</strong>.</li>
                <li>Pulsa <strong>Añadir</strong> — verás el escudo de Cobreros.</li>
                <li>Abre la app desde el inicio y <strong>acepta las notificaciones</strong>.</li>
            </ol>
            <div class="ios-install-footer">
                <button type="button" class="btn btn-primary" onclick="closeIosInstallModal()">Entendido</button>
            </div>
        </div>
    `;
    modal.addEventListener('click', (event) => {
        if (event.target === modal) {
            closeIosInstallModal();
        }
    });
    document.body.appendChild(modal);
    requestAnimationFrame(() => modal.classList.add('visible'));
}

function openIosVecinosApp() {
    if (!isAppleClientDevice()) {
        showNotification('La app para iPhone/iPad/Mac solo está disponible en dispositivos Apple.', 'info');
        return;
    }
    showIosInstallInstructions();
}

function maybeShowIosInstallHintOnFirstVisit() {
    if (!isAppleClientDevice() || isPwaStandalone()) {
        return;
    }
    if (localStorage.getItem(IOS_INSTALL_HINT_KEY) === 'true') {
        return;
    }
    setTimeout(() => showIosInstallInstructions(), 1800);
}

window.openIosVecinosApp = openIosVecinosApp;
window.closeIosInstallModal = closeIosInstallModal;
window.copySiteUrlForSafari = copySiteUrlForSafari;
window.showIosInstallInstructions = showIosInstallInstructions;

// Descartar mensaje móvil
function dismissMobileMessage() {
    // Asegurar que las animaciones de salida estén disponibles
    addMobileExitAnimation();
    
    const messages = document.querySelectorAll('.mobile-registration-message, .mobile-download-message');
    messages.forEach(message => {
        message.style.animation = 'mobileSlideDown 0.3s ease-in';
        setTimeout(() => {
            if (message.parentNode) {
                message.remove();
            }
        }, 300);
    });
    
    // Marcar como descartado
    localStorage.setItem('cobrerosAppDismissed', 'true');
    console.log('📱 Mensaje móvil descartado');
}

// Añadir animación de salida
function addMobileExitAnimation() {
    if (document.getElementById('mobile-exit-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'mobile-exit-styles';
    style.textContent = `
        @keyframes mobileSlideDown {
            from { 
                transform: translateY(0); 
                opacity: 1; 
            }
            to { 
                transform: translateY(100%); 
                opacity: 0; 
            }
        }
    `;
    
    document.head.appendChild(style);
}

// Mostrar características específicas de desktop
function showDesktopFeatures() {
    // Añadir información adicional para usuarios de desktop
    console.log('🖥️ Mostrando características de desktop...');
    
    // Verificar si debe mostrar el mensaje de la app
    checkDesktopAppMessage();
}

// Verificar si debe mostrar el mensaje de la app en desktop
function checkDesktopAppMessage() {
    // Verificar si el usuario ya está registrado
    const currentUser = localStorage.getItem('currentUser');
    const desktopInfoClosed = localStorage.getItem('desktopAppInfoClosed');
    
    const desktopInfoElement = document.getElementById('desktopAppInfo');
    
    if (desktopInfoElement) {
        // Si el usuario está registrado o ya cerró el mensaje, ocultarlo
        if (currentUser || desktopInfoClosed) {
            desktopInfoElement.style.display = 'none';
            console.log('🖥️ Mensaje de app oculto - usuario registrado o mensaje cerrado');
        } else {
            desktopInfoElement.style.display = 'block';
            console.log('🖥️ Mostrando mensaje de app para usuario no registrado');
        }
    }
}

// Cerrar el mensaje de la app en desktop
function closeDesktopInfo() {
    const desktopInfoElement = document.getElementById('desktopAppInfo');
    
    if (desktopInfoElement) {
        // Añadir clase de animación de salida
        desktopInfoElement.classList.add('closing');
        
        // Ocultar después de la animación
        setTimeout(() => {
            desktopInfoElement.style.display = 'none';
            // Guardar que el usuario cerró el mensaje
            localStorage.setItem('desktopAppInfoClosed', 'true');
            console.log('🖥️ Mensaje de app cerrado por el usuario');
        }, 300);
    }
}

// Ocultar mensaje de app cuando el usuario se registra
function hideDesktopAppMessage() {
    const desktopInfoElement = document.getElementById('desktopAppInfo');
    
    if (desktopInfoElement && isDesktop) {
        desktopInfoElement.style.display = 'none';
        console.log('🖥️ Mensaje de app oculto - usuario registrado');
    }
}

// Obtener información del dispositivo
function getDeviceInfo() {
    return {
        type: deviceType,
        isMobile: isMobile,
        isTablet: isTablet,
        isDesktop: isDesktop,
        screenWidth: window.innerWidth,
        screenHeight: window.innerHeight,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
    };
}

// Inicializar la aplicación
function initializeApp() {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            updateUserInterface();
        } catch (_) {
            currentUser = null;
        }
    }

    purgeLegacyLocalAdminStorage();
    isAdmin = false;
    isSuperAdmin = false;

    // Inicializar configuración del consultorio médico e ITV
    loadConsultorioConfig();
    loadItvConfig();
    
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
    loadAppointmentAvailabilitySettings();
    setAppointmentDateConstraints();
    refreshAppointmentTimeOptions();
    
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
        
        console.log('Estado inicial forzado');
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
        
        console.log('Estado de navegación reseteado');
    }
    
    // Ejecutar función de estado inicial
    setTimeout(forceInitialState, 200);
    
    setupFirebaseAuthListener();
}

// Crear/enlazar botón de admin (esquina superior derecha)
function createAdminButton() {
    let adminBtn = document.getElementById('adminLoginBtn');
    if (!adminBtn) {
        adminBtn = document.createElement('button');
        adminBtn.id = 'adminLoginBtn';
        adminBtn.className = 'admin-access-btn';
        adminBtn.title = 'Acceso Administradores';
        adminBtn.innerHTML =
            '<i class="fas fa-cog"></i><br><span style="font-size: 8px;">ADMIN</span>';
        document.body.appendChild(adminBtn);
    }

    adminBtn.type = 'button';

    if (!adminBtn.dataset.adminClickBound && adminBtn.dataset.adminBootstrapBound !== '1') {
        adminBtn.dataset.adminClickBound = '1';
        adminBtn.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            void handleAdminAccessClick();
        });
    }
}

// Limpiar todos los formularios al cargar la página
function clearAllForms() {
    console.log('Limpiando formularios...');
    
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
        console.log('Formulario de cita previa cerrado y limpiado completamente');
    }
    
    // Limpiar formulario de login
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.reset();
        console.log('Formulario de login limpiado');
    }
    
    // Limpiar formulario de registro
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.reset();
        console.log('Formulario de registro limpiado');
    }
    
    // Limpiar formulario de admin login
    const adminLoginForm = document.getElementById('adminLoginForm');
    if (adminLoginForm) {
        adminLoginForm.reset();
        console.log('Formulario de admin login limpiado');
    }
    
    // Cerrar todos los modales
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.style.display = 'none';
        console.log('Modal cerrado:', modal.id);
    });
    
    // Forzar cierre de cualquier modal que pueda estar abierto
    const openModals = document.querySelectorAll('.modal[style*="block"]');
    openModals.forEach(modal => {
        modal.style.display = 'none';
        console.log('Modal forzado a cerrar:', modal.id);
    });
    
    // Cerrar centro de notificaciones si está abierto
    const notificationCenter = document.getElementById('notificationCenter');
    if (notificationCenter && notificationCenter.classList.contains('show')) {
        notificationCenter.classList.remove('show');
        console.log('Centro de notificaciones cerrado');
    }
    
    // Cerrar menú móvil si está abierto
    const mainNav = document.querySelector('.main-nav');
    if (mainNav && mainNav.classList.contains('mobile-open')) {
        mainNav.classList.remove('mobile-open');
        console.log('Menú móvil cerrado');
    }
    
    // Cerrar cualquier elemento con clase 'show'
    const showElements = document.querySelectorAll('.show');
    showElements.forEach(element => {
        element.classList.remove('show');
        console.log('Elemento con clase show cerrado:', element.id || element.className);
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

    const myLocalitiesBtn = document.getElementById('myLocalitiesBtn');
    if (myLocalitiesBtn) {
        myLocalitiesBtn.addEventListener('click', () => openUserProfileModal());
    }
    
    if (adminLoginBtn && !adminLoginBtn.dataset.adminClickBound && adminLoginBtn.dataset.adminBootstrapBound !== '1') {
        adminLoginBtn.dataset.adminClickBound = '1';
        adminLoginBtn.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            console.log('Admin login button clicked');
            void handleAdminAccessClick();
        });
    }
    
    if (adminBtn) {
        adminBtn.addEventListener('click', () => {
            console.log('Admin button clicked');
            void handleAdminAccessClick();
        });
    }

    // Botón para abrir/cerrar formulario de cita previa
    const toggleAppointmentFormBtn = document.getElementById('toggleAppointmentForm');
    if (toggleAppointmentFormBtn) {
        toggleAppointmentFormBtn.addEventListener('click', toggleAppointmentForm);
    }
    const cancelAppointmentBtn = document.getElementById('cancelAppointment');
    if (cancelAppointmentBtn) {
        cancelAppointmentBtn.addEventListener('click', closeAppointmentForm);
    }

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
    document.getElementById('registerForm').addEventListener('submit', handleRegister);
    document.getElementById('adminLoginForm').addEventListener('submit', handleAdminLogin);
    document.getElementById('appointmentForm').addEventListener('submit', handleAppointment);
    document.getElementById('date').addEventListener('change', function () {
        refreshAppointmentTimeOptions();
        if (this.value && !isDateAllowedByAvailability(this.value)) {
            showNotification('Ese día no está habilitado para cita previa', 'warning');
            this.value = '';
            refreshAppointmentTimeOptions();
        }
    });
    document.getElementById('notificationForm').addEventListener('submit', handleNotification);
    document.getElementById('logoForm').addEventListener('submit', handleLogoUpload);
    document.getElementById('createAdminForm').addEventListener('submit', handleCreateAdmin);
    document.getElementById('documentUploadForm').addEventListener('submit', handleDocumentUpload);
    document.getElementById('importDataForm').addEventListener('submit', handleDataImport);

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

// Lista de administradores: solo desde Firestore (superadmin con sesión Firebase activa)
async function loadAdministrators() {
    administrators = [];
    try {
        if (!(await isFirebaseAdmin())) {
            return;
        }
        const authUser = firebase.auth().currentUser;
        if (!authUser) {
            return;
        }
        const superSnap = await firebase.firestore().collection('admins').doc(authUser.uid).get();
        if (!superSnap.exists || superSnap.data().isSuperAdmin !== true) {
            return;
        }
        const snap = await firebase.firestore().collection('administrators').get();
        snap.forEach((doc) => {
            administrators.push({ ...doc.data(), id: doc.id, authUid: doc.id });
        });
    } catch (e) {
        console.warn('loadAdministrators Firestore:', e);
    }
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
}

function parseStoredConfig(rawValue) {
    if (rawValue === undefined || rawValue === null) return null;
    if (typeof rawValue === 'string') {
        try {
            return JSON.parse(rawValue);
        } catch (e) {
            return rawValue;
        }
    }
    return rawValue;
}

async function refreshLatestPublicDataFromFirestore(reason = 'manual') {
    try {
        if (_forcedPublicRefreshInFlight) return;
        if (!window.firebase || !window.firebase.firestore) return;
        const now = Date.now();
        if (now - _lastForcedPublicRefreshMs < 10000) return; // Evitar ráfagas al cambiar foco/pestaña
        _forcedPublicRefreshInFlight = true;

        const db = firebase.firestore();
        const [bandosDoc, newsDoc, eventsDoc, configDoc] = await Promise.all([
            db.collection('bandos').doc('data').get(),
            db.collection('noticias').doc('data').get(),
            db.collection('eventos').doc('data').get(),
            db.collection('configuraciones').doc('data').get()
        ]);

        if (bandosDoc.exists && Array.isArray(bandosDoc.data()?.bandos)) {
            bandos = bandosDoc.data().bandos;
            localStorage.setItem('bandos', JSON.stringify(bandos));
        }
        if (newsDoc.exists && Array.isArray(newsDoc.data()?.news)) {
            news = newsDoc.data().news;
            localStorage.setItem('news', JSON.stringify(news));
        }
        if (eventsDoc.exists && Array.isArray(eventsDoc.data()?.events)) {
            events = eventsDoc.data().events;
            localStorage.setItem('events', JSON.stringify(events));
        }

        if (configDoc.exists) {
            const cfg = configDoc.data() || {};
            const keys = [
                'culturaOcioConfig',
                'appointmentSettings',
                'appointmentAvailability',
                'publicNotifications',
                'servicios',
                'seccionesConfig',
                'consultorioConfig',
                'itvConfig',
                'telefonosInteresConfig',
                'transporteConfig'
            ];
            keys.forEach((key) => {
                if (cfg[key] !== undefined && cfg[key] !== null) {
                    const parsed = parseStoredConfig(cfg[key]);
                    localStorage.setItem(key, JSON.stringify(parsed));
                }
            });
        }

        loadData();
        loadConsultorioConfig();
        loadItvConfig();
        loadTelefonosInteresConfig();
        loadTransporteConfig();
        loadAppointmentSettings();
        loadAppointmentAvailabilitySettings();
        loadPublicNotifications();
        loadServicios();
        renderEventos();
        updateCulturaOcioSection();
        loadReceivedNotifications();
        await loadAppointmentsFromFirestoreInBackground();

        _lastForcedPublicRefreshMs = Date.now();
        console.log(`✅ Refresco remoto aplicado (${reason})`);
    } catch (error) {
        console.warn('No se pudo refrescar datos remotos:', error);
    } finally {
        _forcedPublicRefreshInFlight = false;
    }
}

function setupAutoRefreshOnOpenAndFocus() {
    setTimeout(() => refreshLatestPublicDataFromFirestore('startup'), 300);
    window.addEventListener('pageshow', () => {
        refreshLatestPublicDataFromFirestore('pageshow');
    });
    window.addEventListener('focus', () => {
        refreshLatestPublicDataFromFirestore('focus');
    });
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            refreshLatestPublicDataFromFirestore('visibility');
        }
    });
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
        newsItem.innerHTML = `
            <div class="news-image">
                <img src="${article.image}" alt="${article.title}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                <div style="display: none; align-items: center; justify-content: center; height: 100%; background: #f3f4f6; color: #6b7280;">
                    <i class="fas fa-newspaper" style="font-size: 3rem;"></i>
                </div>
            </div>
            <div class="news-content">
                <h3>${article.title}</h3>
                <p class="news-date">${formatDate(article.date)}</p>
                <p>${article.content.substring(0, 100)}...</p>
                <button class="btn btn-outline btn-small" onclick="showNewsDetail(${article.id})">Leer más</button>
            </div>
        `;
        newsGrid.appendChild(newsItem);
    });
}

// Actualizar sección de bando
function updateBandoSection() {
    const bandoContent = document.getElementById('bandoSectionContent');
    if (!bandoContent) return;

    if (bandos.length === 0) {
        bandoContent.innerHTML = '<p class="bando-empty">No hay bandos municipales publicados en este momento.</p>';
        return;
    }

    const latestBando = bandos[bandos.length - 1];
    bandoContent.innerHTML = `
        <div class="bando-item">
            <h3>${latestBando.title}</h3>
            <p class="bando-date">Publicado: ${formatDate(latestBando.date)}</p>
            <div class="bando-text">
                <p>${latestBando.content.substring(0, 200)}...</p>
            </div>
            <button class="btn btn-outline btn-small" onclick="showBandoDetail(${latestBando.id})">Leer completo</button>
        </div>
    `;
}

// Navegación suave
function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (!section) return;

    section.scrollIntoView({ behavior: 'smooth', block: 'start' });

    if (history.replaceState) {
        history.replaceState(null, '', '#' + sectionId);
    } else {
        window.location.hash = sectionId;
    }

    const navLink = document.querySelector('.nav-link[href="#' + sectionId + '"]');
    if (navLink) {
        updateActiveNavLink(navLink);
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
    console.log('openModal called with:', modalId);
    const modal = document.getElementById(modalId);
    console.log('Modal found:', !!modal);
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
        console.log('Modal opened successfully');
    } else {
        console.error('Modal not found:', modalId);
    }
}

/** Botón ADMIN / Panel Admin: abre el panel si hay sesión, si no el login. */
async function handleAdminAccessClick() {
    if (isAdminSessionValid()) {
        await openAdminPanel();
        return;
    }

    // Abrir login al instante (no esperar a Firebase/Firestore)
    openModal('adminLoginModal');

    try {
        if (await isFirebaseAdmin()) {
            closeModal('adminLoginModal');
            await openAdminPanel();
        }
    } catch (error) {
        console.warn('handleAdminAccessClick:', error);
    }
}

window.handleAdminAccessClick = handleAdminAccessClick;
window.cloudUserText = cloudUserText;

// Cerrar modal
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// Cerrar todos los modales
function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
    });
    document.body.style.overflow = 'auto';
}

// Manejar login de usuarios normales (Firebase Auth + perfil en users/{uid})
async function handleLogin(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const email = (formData.get('email') || '').toString().trim();
    const password = (formData.get('password') || '').toString();

    if (!window.firebase || !window.firebase.auth) {
        showNotification('La nube no está disponible', 'error');
        return;
    }

    try {
        const cred = await firebase.auth().signInWithEmailAndPassword(email, password);
        const uid = cred.user.uid;
        let displayName = email;
        const snap = await firebase.firestore().collection('users').doc(uid).get();
        let localities = [];
        if (snap.exists) {
            const d = snap.data();
            displayName = d.name || d.nombre || displayName;
            localities = Array.isArray(d.localities) ? d.localities : [];
        }
        currentUser = {
            email: cred.user.email,
            name: displayName,
            id: uid,
            isRegularUser: true,
            localities: localities
        };
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        await syncUserFcmTokenToFirestore();
        await loadUsersFromFirestore();
        updateUserInterface();
        loadReceivedNotifications();
        closeModal('loginModal');
        showNotification(`Bienvenido, ${displayName}`, 'success');
        hideDesktopAppMessage();
        if (isMobile) {
            setTimeout(() => checkMobileAppStatus(), 1000);
        }
    } catch (err) {
        const code = err && err.code ? err.code : '';
        if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
            showNotification('Credenciales incorrectas', 'error');
        } else if (code === 'auth/invalid-email') {
            showNotification('Correo no válido', 'error');
        } else {
            showNotification('No se pudo iniciar sesión: ' + (err.message || code), 'error');
        }
    }
}

// Login administrador: solo Firebase Authentication + documento admins/{uid} en Firestore
async function handleAdminLogin(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const email = (formData.get('email') || '').toString().trim();
    const password = (formData.get('password') || '').toString();

    if (window.firebase && window.firebase.auth && window.firebase.firestore) {
        try {
            await firebase.auth().signInWithEmailAndPassword(email, password);
            await ensureAllowlistedAdminFirestoreDoc();
            const uid = firebase.auth().currentUser.uid;
            const adminSnap = await firebase.firestore().collection('admins').doc(uid).get();
            if (!adminSnap.exists || adminSnap.data().isAdmin !== true) {
                await firebase.auth().signOut();
                showNotification(
                    'Sin permisos de administrador en la nube. Contacte con el ayuntamiento.',
                    'error'
                );
                return;
            }
            const d = adminSnap.data() || {};
            applyFirebaseAdminSession(firebase.auth().currentUser, d);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            updateUserInterface();
            closeModal('adminLoginModal');
            showNotification('Sesión de administrador iniciada', 'success');
            hideDesktopAppMessage();
            await loadUsersFromFirestore();
            await openAdminPanel();
            return;
        } catch (err) {
            const code = err && err.code ? err.code : '';
            if (
                code === 'auth/user-not-found' ||
                code === 'auth/wrong-password' ||
                code === 'auth/invalid-credential'
            ) {
                showNotification('Credenciales incorrectas', 'error');
            } else if (code) {
                showNotification('Error de acceso: ' + code, 'error');
            } else {
                showNotification('No se pudo iniciar sesión de administrador', 'error');
            }
            return;
        }
    }

    showNotification(
        'No se pudo iniciar sesión de administrador. Use una cuenta autorizada en la nube.',
        'error'
    );
}

// Manejar registro (Firebase Auth + Firestore users/{uid}; sin guardar contraseña en Firestore)
async function handleRegister(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const name = (formData.get('name') || '').toString().trim();
    const email = (formData.get('email') || '').toString().trim();
    const phone = (formData.get('phone') || '').toString().trim();
    const password = (formData.get('password') || '').toString();
    const passwordConfirm = (formData.get('passwordConfirm') || '').toString();
    const consent = formData.get('consent');
    const notificationConsent = formData.get('notificationConsent');

    const selectedLocalities = [];
    e.target.querySelectorAll('input[name="localities"]:checked').forEach((cb) => {
        selectedLocalities.push(cb.value);
    });

    if (selectedLocalities.length === 0) {
        showNotification('Seleccione al menos una localidad para recibir avisos de su zona', 'error');
        return;
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
        showNotification('Debe aceptar el consentimiento para recibir notificaciones del ayuntamiento', 'error');
        return;
    }

    if (!window.firebase || !window.firebase.auth || !window.firebase.firestore) {
        showNotification('La nube no está disponible', 'error');
        return;
    }

    const emailNorm = email.toLowerCase();
    if (users.some((user) => String(user.email || '').toLowerCase() === emailNorm)) {
        showNotification('Este correo electrónico ya está en la lista local', 'error');
        return;
    }

    let cred = null;
    try {
        cred = await firebase.auth().createUserWithEmailAndPassword(email, password);
        const uid = cred.user.uid;
        let fcmToken = '';
        if (notificationConsent && typeof Notification !== 'undefined') {
            try {
                const permission = await Notification.requestPermission();
                if (permission === 'granted' && typeof window.getFCMToken === 'function') {
                    fcmToken = (await window.getFCMToken()) || '';
                }
            } catch (fcme) {
                console.warn('FCM registro:', fcme);
            }
        }
        try {
            await firebase
                .firestore()
                .collection('users')
                .doc(uid)
                .set(
                    {
                        name: name,
                        nombre: name,
                        email: email,
                        phone: phone,
                        telefono: phone,
                        consent: true,
                        notificationConsent: true,
                        localities: selectedLocalities,
                        fcmToken: fcmToken || '',
                        consentDate: new Date().toISOString(),
                        registeredFrom: 'WEB',
                        registrationDate: firebase.firestore.FieldValue.serverTimestamp()
                    },
                    { merge: true }
                );
        } catch (fsErr) {
            console.error('Error guardando perfil en Firestore:', fsErr);
            try {
                await firebase.auth().signOut();
            } catch (_) {}
            showNotification(
                'Cuenta creada pero no se guardó el perfil en la nube. Intente iniciar sesión de nuevo o contacte al ayuntamiento.',
                'error'
            );
            return;
        }

        const newUser = {
            id: uid,
            name: name,
            email: email,
            phone: phone,
            consent: true,
            notificationConsent: true,
            localities: selectedLocalities,
            fcmToken: fcmToken || '',
            consentDate: new Date().toISOString(),
            registeredAt: new Date().toISOString()
        };
        users.push(newUser);
        localStorage.setItem('users', JSON.stringify(users));

        showNotification('Registro completado. Sesión iniciada correctamente.', 'success');
        if (fcmToken) {
            showNotification('Notificaciones push activadas', 'success');
        }
        closeModal('registerModal');
        e.target.reset();

        currentUser = {
            email: email,
            name: name,
            id: uid,
            isRegularUser: true,
            localities: selectedLocalities
        };
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        updateUserInterface();
        loadReceivedNotifications();
        await loadUsersFromFirestore();
    } catch (err) {
        const code = err && err.code ? err.code : '';
        if (code === 'auth/email-already-in-use') {
            showNotification('Este correo ya está registrado en Authentication', 'error');
        } else if (code === 'auth/weak-password') {
            showNotification('Contraseña demasiado débil (mínimo 6 caracteres)', 'error');
        } else {
            showNotification('No se pudo registrar: ' + (err.message || code), 'error');
        }
    }
}

// Manejar creación de administradores (Firebase Auth + Firestore vía Cloud Function)
async function handleCreateAdmin(e) {
    e.preventDefault();

    const authUser = firebase.auth && firebase.auth().currentUser;
    if (!authUser) {
        showNotification('Inicie sesión como superadministrador antes de crear cuentas.', 'error');
        return;
    }
    let superOk = false;
    try {
        const s = await firebase.firestore().collection('admins').doc(authUser.uid).get();
        superOk = s.exists && s.data().isSuperAdmin === true;
    } catch (err) {
        console.warn(err);
    }
    if (!superOk) {
        showNotification('Solo el superadministrador puede crear otras cuentas de administrador.', 'error');
        return;
    }

    const formData = new FormData(e.target);
    const name = String(formData.get('name') || '').trim();
    const email = String(formData.get('email') || '').trim();
    const password = String(formData.get('password') || '');
    const passwordConfirm = String(formData.get('passwordConfirm') || '');

    if (password !== passwordConfirm) {
        showNotification('Las contraseñas no coinciden', 'error');
        return;
    }
    if (password.length < 6) {
        showNotification('La contraseña debe tener al menos 6 caracteres', 'error');
        return;
    }
    if (String(email).toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
        showNotification('No use el correo del superadministrador para una cuenta nueva.', 'error');
        return;
    }
    if (administrators.some((a) => String(a.email).toLowerCase() === email.toLowerCase())) {
        showNotification('Ya existe un administrador con este correo en el sistema.', 'error');
        return;
    }
    if (users.some((u) => String(u.email).toLowerCase() === email.toLowerCase())) {
        showNotification('Este correo está registrado como usuario ciudadano. Use otro email para el panel.', 'error');
        return;
    }

    if (!window.firebase || typeof firebase.functions !== 'function') {
        showNotification(
            'Los servicios en la nube no están disponibles. Contacte con el ayuntamiento.',
            'error'
        );
        return;
    }

    try {
        const createStaffAdmin = firebase.functions().httpsCallable('createStaffAdmin');
        await createStaffAdmin({ name, email, password });
        await loadAdministrators();
        showNotification(`Administrador "${name}" creado en la nube (cuenta y permisos listos).`, 'success');
        e.target.reset();
        const adminsTab = document.getElementById('admins-tab');
        if (adminsTab && adminsTab.classList.contains('active')) {
            loadAdminsList();
        }
    } catch (err) {
        const msg =
            (err && err.message) ||
            (err && err.details) ||
            'No se pudo crear el administrador. ¿Están desplegadas las Cloud Functions?';
        console.error('createStaffAdmin:', err);
        showNotification(String(msg), 'error');
    }
}

function getFirebaseStorageService() {
    if (!window.firebase || typeof firebase.storage !== 'function') {
        return null;
    }
    try {
        return firebase.storage();
    } catch (error) {
        console.warn('Firebase Storage no disponible:', error);
        return null;
    }
}

async function uploadDocumentToStorage(file) {
    const storage = getFirebaseStorageService();
    if (!storage) return null;

    const safeName = String(file.name || 'documento')
        .replace(/[^\w.\-]+/g, '_')
        .slice(0, 120);
    const filePath = `documents/${Date.now()}_${safeName}`;
    const storageRef = storage.ref(filePath);
    const snapshot = await storageRef.put(file);
    const downloadURL = await snapshot.ref.getDownloadURL();
    return {
        fileUrl: downloadURL,
        storagePath: filePath
    };
}

async function deleteDocumentFromStorage(storagePath) {
    if (!storagePath) return true;
    const storage = getFirebaseStorageService();
    if (!storage) return false;
    try {
        await storage.ref(storagePath).delete();
        return true;
    } catch (error) {
        console.warn('No se pudo eliminar archivo de Storage:', error);
        return false;
    }
}

// Manejar subida de documentos
async function handleDocumentUpload(e) {
    e.preventDefault();
    
    if (!isAdmin) {
        showNotification('Solo los administradores pueden subir documentos', 'error');
        return;
    }
    
    const formData = new FormData(e.target);
    const name = formData.get('name');
    const description = formData.get('description');
    const category = formData.get('category');
    const file = formData.get('file');

    if (!file || file.size === 0) {
        showNotification('Debe seleccionar un archivo', 'error');
        return;
    }

    let fileUrl = null;
    let storagePath = null;
    try {
        const uploaded = await uploadDocumentToStorage(file);
        if (uploaded) {
            fileUrl = uploaded.fileUrl;
            storagePath = uploaded.storagePath;
        } else {
            fileUrl = URL.createObjectURL(file);
            showNotification('Storage no disponible: se guarda enlace local temporal', 'warning');
        }
    } catch (error) {
        console.error('Error subiendo documento a Storage:', error);
        fileUrl = URL.createObjectURL(file);
        showNotification('No se pudo subir a Storage, se guarda enlace local temporal', 'warning');
    }
    
    const newDocument = {
        id: Date.now(),
        name,
        description,
        category,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        fileUrl: fileUrl,
        storagePath: storagePath,
        uploadedBy: currentUser.email,
        uploadedAt: new Date().toISOString(),
        isActive: true
    };

    documents.push(newDocument);
    localStorage.setItem('documents', JSON.stringify(documents));

    showNotification(`Documento "${name}" subido correctamente`, 'success');
    e.target.reset();
    
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
    const appointmentData = Object.fromEntries(formData.entries());

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
    if (!isDateAllowedByAvailability(appointmentData.date)) {
        showNotification('La fecha seleccionada no está habilitada para cita previa', 'error');
        return;
    }
    const effectiveSlots = getEffectiveTimeSlotsForDate(appointmentData.date);
    if (!effectiveSlots.includes(appointmentData.time)) {
        showNotification('La hora seleccionada no está disponible', 'error');
        return;
    }
    const slotAvailable = await isAppointmentSlotAvailable(appointmentData.date, appointmentData.time);
    if (!slotAvailable) {
        showNotification('Ese horario ya está ocupado. Elige otra hora.', 'error');
        return;
    }

    if (!window.firebase || !window.firebase.auth || !window.firebase.firestore) {
        showNotification('La nube no está disponible para guardar la cita', 'error');
        return;
    }
    const authUser = firebase.auth().currentUser;
    if (!authUser) {
        showNotification('Debe iniciar sesión para solicitar cita previa', 'warning');
        return;
    }

    const appointment = {
        id: Date.now().toString(),
        userId: authUser.uid,
        ...appointmentData,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    const created = await createAppointmentAtomic(appointment);
    if (!created) {
        showNotification('No se pudo guardar la cita en el servidor', 'error');
        return;
    }
    appointments.push(created);
    saveAppointments();
    createMunicipalAlert(created);

    try {
        await invokeAppointmentNotificationEvent('created', created);
        showNotification(
            'Su solicitud de cita ha sido enviada. Recibirá un correo de confirmación si el envío está activo en el servidor.',
            'success'
        );
    } catch (err) {
        console.warn('Aviso cita (created):', err);
        showNotification(
            'Cita guardada correctamente. No se pudieron enviar los correos automáticos; el ayuntamiento le contactará.',
            'warning'
        );
    }

    setTimeout(() => {
        closeAppointmentForm();
    }, 1500);

    // Enviar notificación a usuarios registrados
    if (users.length > 0) {
        sendNotificationToUsers(
            'Nueva solicitud de cita',
            `Se ha recibido una nueva solicitud de cita para ${appointmentData.service} de ${appointmentData.name}`,
            'general'
        );
    }
}

// Manejar notificación
function handleNotification(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const title = formData.get('title');
    
    // Obtener mensaje del editor de texto enriquecido
    const message = getRichEditorContent();
    const type = formData.get('type');
    const attachmentFile = formData.get('attachment');

    // Validar que el mensaje no esté vacío
    if (!message || message.trim() === '' || message === '<div><br></div>' || message === '<br>') {
        showNotification('Por favor, escribe un mensaje para la notificación', 'error');
        return;
    }

    let attachment = null;
    if (attachmentFile && attachmentFile.size > 0) {
        // En una implementación real, aquí subirías el archivo al servidor
        // Por ahora, simulamos la URL del archivo
        attachment = {
            name: attachmentFile.name,
            url: `#`, // URL simulada - en producción sería la URL real del archivo
            size: attachmentFile.size,
            type: attachmentFile.type
        };
    }

    sendNotificationToUsers(title, message, type, attachment);
    showNotification('Notificación enviada correctamente', 'success');
    
    // Limpiar formulario y editor
    e.target.reset();
    clearRichEditor();
    
    // Limpiar vista previa
    const preview = document.getElementById('messagePreview');
    if (preview) {
        preview.innerHTML = '<em style="color: #6c757d;">Vista previa del mensaje...</em>';
    }
}

// Enviar notificación a usuarios
function sendNotificationToUsers(title, message, type, attachment = null) {
    const notification = {
        id: Date.now(),
        title,
        message,
        type,
        date: new Date().toISOString(),
        sent: true,
        attachment: attachment // Agregar soporte para documentos adjuntos
    };

    notifications.push(notification);
    localStorage.setItem('notifications', JSON.stringify(notifications));

    // Enviar notificación push si está disponible
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, {
            body: message,
            icon: 'images/escudo-cobreros-192.png'
        });
    }

    // Enviar por email (simulado) solo a usuarios con consentimiento
    users.forEach(user => {
        if (user.consent && user.notificationConsent) {
            console.log(`Enviando notificación a ${user.email}: ${title} - ${message}`);
            if (attachment) {
                console.log(`Documento adjunto: ${attachment.name}`);
            }
        }
    });

    updateNotificationCenter();
}

// Función para descargar documentos adjuntos
function downloadAttachment(url, filename) {
    // Verificar que el usuario esté logueado
    if (!currentUser) {
        showNotification('Debes iniciar sesión para descargar documentos', 'error');
        return;
    }
    
    // Crear enlace temporal para descarga
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
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

// Cambiar tab en admin
function switchTab(tabName) {
    // El botón "cultura-ocio" en tabs superiores usa la misma vista de contenido.
    const effectiveTab = tabName === 'cultura-ocio' ? 'content' : tabName;
    const adminModal = document.getElementById('adminModal');
    if (!adminModal) return;

    // Actualizar botones
    adminModal.querySelectorAll('.admin-tabs .tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    const activeBtn = adminModal.querySelector(`.admin-tabs [data-tab="${tabName}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }

    // Actualizar contenido
    adminModal.querySelectorAll(':scope > .modal-content > .tab-content').forEach(content => {
        content.classList.remove('active');
    });
    const targetTab = adminModal.querySelector(`#${effectiveTab}-tab`);
    if (!targetTab) {
        console.warn(`Tab no encontrada: ${effectiveTab}-tab`);
        return;
    }
    targetTab.classList.add('active');

    // Cargar contenido específico del tab
    if (effectiveTab === 'content') {
        loadNewsList();
        loadBandoList();
        loadEventsList();
        loadQuickAccessList();
        if (tabName === 'cultura-ocio' && typeof openCulturaOcioManager === 'function') {
            openCulturaOcioManager();
        }
    } else if (effectiveTab === 'users') {
        void loadUsersFromFirestore().then(() => loadUsersList());
    } else if (effectiveTab === 'admins') {
        loadAdminsList();
    } else if (effectiveTab === 'documents') {
        loadDocumentsList();
    } else if (effectiveTab === 'notifications') {
        loadNotificationsHistory();
    } else if (effectiveTab === 'database') {
        loadSystemStats();
    } else if (effectiveTab === 'settings') {
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
    } else if (effectiveTab === 'appointments') {
        console.log('Cargando pestaña de citas previas...');
        void loadAppointmentsFromFirestoreInBackground().then(() => {
            loadAppointmentsList();
            loadAppointmentStats();
            loadMunicipalAlertsList();
        });
        loadMunicipalAlertsList();
        console.log('Pestaña de citas previas cargada');
    } else if (effectiveTab === 'servicios') {
        loadServiciosAdmin();
    }
}

// Actualizar interfaz de usuario
function updateUserInterface() {
    if (currentUser) {
        // Mostrar nombre del usuario (sin revelar que es super admin)
        const displayName = currentUser.name;
        document.getElementById('registerBtn').style.display = 'none';
        
        // Mostrar botón de logout con estilo distintivo
        document.getElementById('loginBtn').textContent = `Cerrar Sesión (${displayName})`;
        document.getElementById('loginBtn').onclick = logout;
        document.getElementById('loginBtn').className = 'btn btn-outline btn-logout';
        document.getElementById('loginBtn').title = 'Cerrar sesión';
        
        if (isAdminSessionValid()) {
            document.getElementById('adminBtn').style.display = 'block';
            document.getElementById('adminBtn').textContent = 'Panel Admin';
            document.getElementById('adminBtn').style.background = '#3b82f6';
        } else {
            document.getElementById('adminBtn').style.display = 'none';
        }

        const myLocBtn = document.getElementById('myLocalitiesBtn');
        if (myLocBtn) {
            const showProfile =
                !isAdminSessionValid() &&
                !!(getFirebaseAuthSafe() && getFirebaseAuthSafe().currentUser);
            myLocBtn.style.display = showProfile ? 'inline-flex' : 'none';
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
        const myLocBtn = document.getElementById('myLocalitiesBtn');
        if (myLocBtn) {
            myLocBtn.style.display = 'none';
        }
    }
    
    // Actualizar centro de notificaciones
    updateNotificationCenter();
}

// Actualizar contenido del admin
function updateAdminContent() {
    if (!isAdminSessionValid()) return;

    // Ocultar pestaña de administradores si no es super admin
    const adminsTab = document.querySelector('[data-tab="admins"]');
    if (adminsTab) {
        adminsTab.style.display = isSuperAdmin ? 'block' : 'none';
    }

    loadNewsList();
    loadBandoList();
    loadUsersList();
    loadNotificationsHistory();
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
        
        newsItem.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: start;">
                <div style="flex: 1;">
                    <h4>${article.title}</h4>
                    <p>${article.content.substring(0, 100)}...</p>
                    <p><small>Fecha: ${formatDate(article.date)}</small></p>
                    ${article.image ? `<p><small>Imagen: ${article.image}</small></p>` : ''}
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
        
        bandoItem.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: start;">
                <div style="flex: 1;">
                    <h4>${bando.title}</h4>
                    <p>${bando.content.substring(0, 100)}...</p>
                    <p><small>Fecha: ${formatDate(bando.date)}</small></p>
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

async function deletePanelUser(email) {
    if (!isAdmin) {
        showNotification('Sin permisos', 'error');
        return;
    }
    if (!confirm(cloudUserText(`¿Eliminar definitivamente al usuario ${email}? (acceso y datos en la nube)`))) {
        return;
    }
    const u = users.find((x) => String(x.email).toLowerCase() === String(email).toLowerCase());
    if (!u || !u.id) {
        showNotification('Usuario no encontrado en la lista cargada.', 'error');
        return;
    }
    if (!window.firebase || typeof firebase.functions !== 'function') {
        showNotification('Servicios en la nube no disponibles. Contacte con el ayuntamiento.', 'error');
        return;
    }
    try {
        const fn = firebase.functions().httpsCallable('removeEndUser');
        await fn({ uid: u.id });
        await loadUsersFromFirestore();
        loadUsersList();
        showNotification('Usuario eliminado correctamente', 'success');
    } catch (err) {
        console.error('removeEndUser:', err);
        showNotification(err.message || 'No se pudo eliminar el usuario', 'error');
    }
}

async function deletePanelAdmin(email) {
    if (!isSuperAdmin) {
        showNotification('Solo el superadministrador puede eliminar administradores.', 'error');
        return;
    }
    const adminRow = administrators.find(
        (a) => String(a.email).toLowerCase() === String(email).toLowerCase()
    );
    const uid = adminRow && (adminRow.authUid || adminRow.id);
    if (!uid) {
        showNotification('No se encontró el UID del administrador.', 'error');
        return;
    }
    if (firebase.auth().currentUser && uid === firebase.auth().currentUser.uid) {
        showNotification('No puede eliminar su propia cuenta.', 'error');
        return;
    }
    if (!confirm(cloudUserText(`¿Eliminar administrador ${email}? (cuenta en la nube y permisos)`))) {
        return;
    }
    if (!window.firebase || typeof firebase.functions !== 'function') {
        showNotification('Servicios en la nube no disponibles. Contacte con el ayuntamiento.', 'error');
        return;
    }
    try {
        const fn = firebase.functions().httpsCallable('removeStaffAdmin');
        await fn({ uid });
        await loadAdministrators();
        loadAdminsList();
        showNotification('Administrador eliminado', 'success');
    } catch (err) {
        console.error('removeStaffAdmin:', err);
        showNotification(err.message || 'No se pudo eliminar', 'error');
    }
}

// Cargar lista de usuarios (panel admin)
function loadUsersList() {
    const usersList = document.getElementById('usersList');
    if (!usersList) return;

    usersList.innerHTML = '';

    const visibleUsers = users.filter((user) => !user.isHidden && !user.isSuperAdmin);

    if (visibleUsers.length === 0) {
        usersList.innerHTML =
            '<p style="text-align: center; color: #666; padding: 2rem;">No hay usuarios registrados</p>';
        return;
    }

    visibleUsers.forEach((user) => {
        const userItem = document.createElement('div');
        userItem.className = 'user-item';
        userItem.style.cssText =
            'background: var(--bg-secondary, #f9fafb); padding: 1rem; margin: 0.5rem 0; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;';
        const locs = Array.isArray(user.localities) ? user.localities : [];
        const locsLabel = locs.length ? locs.join(', ') : 'Sin localidades';
        userItem.innerHTML = `
            <div style="flex: 1; min-width: 200px;">
                <h4 style="margin: 0 0 0.5rem 0;">${user.name || ''}</h4>
                <p style="margin: 0; color: #666;">${user.email || ''}</p>
                <p style="margin: 0.35rem 0 0 0; color: #475569; font-size: 0.9rem;"><strong>📍 Localidades:</strong> ${locsLabel}</p>
                <small style="color: #999;">Registrado: ${formatDate(user.registeredAt || user.registrationDate)}</small>
            </div>
            <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                <span class="badge ${user.consent ? 'badge-success' : 'badge-warning'}">
                    ${user.consent ? 'Consentimiento' : 'Sin consentimiento'}
                </span>
                ${user.notificationConsent ? '<span class="badge badge-info">Notif.</span>' : ''}
                ${user.fcmToken ? '<span class="badge badge-success">Push</span>' : '<span class="badge badge-warning">Sin push</span>'}
                <button type="button" class="btn btn-sm btn-primary panel-edit-locs">Localidades</button>
                <button type="button" class="btn btn-sm btn-danger panel-del-user" data-email="${String(user.email || '').replace(/"/g, '&quot;')}">Eliminar</button>
            </div>
        `;
        const editLocs = userItem.querySelector('.panel-edit-locs');
        if (editLocs) {
            editLocs.addEventListener('click', () => openAdminEditUserLocalities(user.id, user.name, user.email));
        }
        const del = userItem.querySelector('.panel-del-user');
        if (del) {
            del.addEventListener('click', () => deletePanelUser(user.email));
        }
        usersList.appendChild(userItem);
    });
}

// Cargar lista de administradores (panel superadmin)
function loadAdminsList() {
    const adminsList = document.getElementById('adminsList');
    if (!adminsList) return;

    adminsList.innerHTML = '';

    const visibleAdmins = administrators.filter((a) => !a.isHidden);

    if (visibleAdmins.length === 0) {
        adminsList.innerHTML =
            '<p style="text-align: center; color: #666; padding: 2rem;">No hay administradores en la nube. Cree uno con el formulario.</p>';
        return;
    }

    const authUid = firebase.auth().currentUser ? firebase.auth().currentUser.uid : null;

    visibleAdmins.forEach((admin) => {
        const adminItem = document.createElement('div');
        adminItem.className = 'admin-item';
        adminItem.style.cssText =
            'border: 1px solid #e5e7eb; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; background: #f9fafb;';

        const uid = admin.authUid || admin.id;
        const createdBy = admin.createdBy === 'system' ? 'Sistema' : admin.createdBy || '—';
        const isSelf = authUid && uid === authUid;

        adminItem.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: start; flex-wrap: wrap; gap: 0.75rem;">
                <div>
                    <h4 style="margin: 0 0 0.35rem 0;">${admin.name || ''} ${isSelf ? '(Tú)' : ''}</h4>
                    <p style="margin: 0.2rem 0;"><strong>Email:</strong> ${admin.email || ''}</p>
                    <p style="margin: 0.2rem 0;"><strong>UID:</strong> ${uid || '—'}</p>
                    <p style="margin: 0.2rem 0;"><strong>Creado por:</strong> ${createdBy}</p>
                    <p style="margin: 0.2rem 0;"><strong>Fecha:</strong> ${formatDate(admin.createdAt || admin.createdDate)}</p>
                </div>
                <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 0.5rem;">
                    <span class="badge ${admin.isActive !== false ? 'badge-success' : 'badge-warning'}">
                        ${admin.isActive !== false ? 'Activo' : 'Inactivo'}
                    </span>
                    ${isSuperAdmin && !isSelf ? `<button type="button" class="btn btn-sm btn-danger panel-del-admin" data-email="${String(admin.email || '').replace(/"/g, '&quot;')}">Eliminar</button>` : ''}
                </div>
            </div>
        `;
        const del = adminItem.querySelector('.panel-del-admin');
        if (del) {
            del.addEventListener('click', () => deletePanelAdmin(admin.email));
        }
        adminsList.appendChild(adminItem);
    });
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

function saveQuickAccessData() {
    localStorage.setItem('quickAccess', JSON.stringify(quickAccess));
    loadQuickAccessList();
    showNotification('Acceso rápido actualizado', 'success');
}

function openQuickAccessEditor() {
    const title = prompt('Título de la tarjeta de acceso rápido:');
    if (!title) return;
    const description = prompt('Descripción:') || '';
    const section = prompt('Sección destino (ej: bando, documentos, sede-electronica, cultura-ocio):', 'bando') || 'bando';
    const icon = prompt('Clase de icono Font Awesome (ej: fas fa-link):', 'fas fa-link') || 'fas fa-link';
    const order = parseInt(prompt('Orden de visualización:', String(quickAccess.length + 1)) || String(quickAccess.length + 1), 10);

    const newItem = {
        id: Date.now(),
        title: title.trim(),
        description: description.trim(),
        section: section.trim(),
        icon: icon.trim(),
        order: Number.isNaN(order) ? quickAccess.length + 1 : order,
        isActive: true,
        createdBy: currentUser?.email || 'admin',
        createdAt: new Date().toISOString()
    };
    quickAccess.push(newItem);
    saveQuickAccessData();
}

function editQuickAccess(itemId) {
    const item = quickAccess.find((q) => q.id === itemId);
    if (!item) {
        showNotification('Tarjeta no encontrada', 'error');
        return;
    }
    const title = prompt('Título:', item.title);
    if (!title) return;
    const description = prompt('Descripción:', item.description || '') || '';
    const section = prompt('Sección destino:', item.section || 'bando') || item.section;
    const icon = prompt('Clase de icono Font Awesome:', item.icon || 'fas fa-link') || item.icon;
    const orderRaw = prompt('Orden:', String(item.order || 1)) || String(item.order || 1);
    const order = parseInt(orderRaw, 10);
    const activeRaw = prompt('¿Activa? (si/no):', item.isActive ? 'si' : 'no') || (item.isActive ? 'si' : 'no');

    item.title = title.trim();
    item.description = description.trim();
    item.section = section.trim();
    item.icon = icon.trim();
    item.order = Number.isNaN(order) ? item.order : order;
    item.isActive = activeRaw.trim().toLowerCase() !== 'no';
    item.updatedAt = new Date().toISOString();
    item.updatedBy = currentUser?.email || 'admin';
    saveQuickAccessData();
}

function deleteQuickAccess(itemId) {
    if (!confirm('¿Eliminar esta tarjeta de acceso rápido?')) return;
    quickAccess = quickAccess.filter((q) => q.id !== itemId);
    saveQuickAccessData();
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

function clearAllData() {
    const firstConfirm = confirm('Esto eliminará los datos locales del panel (contenido, servicios, citas locales y configuraciones). ¿Deseas continuar?');
    if (!firstConfirm) return;
    const secondConfirm = confirm('Última confirmación: esta acción no se puede deshacer. ¿Eliminar todo?');
    if (!secondConfirm) return;

    const keysToClear = [
        'news', 'bandos', 'events', 'quickAccess', 'documents', 'notifications', 'userNotifications',
        'administrators', 'appointmentSettings', 'appointmentAvailability', 'appointments',
        'publicNotifications', 'culturaOcioConfig', 'servicios', 'seccionesConfig',
        'consultorioConfig', 'itvConfig', 'telefonosInteresConfig', 'transporteConfig',
        'municipalAlerts'
    ];
    keysToClear.forEach((key) => localStorage.removeItem(key));
    showNotification('Datos locales eliminados. Recargando...', 'success');
    setTimeout(() => window.location.reload(), 600);
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

    const notificationsToShow = userNotifications || notifications.slice(-5).reverse();
    const unreadCount = notificationsToShow.filter(n => !n.read).length;

    notificationBadge.textContent = unreadCount;
    notificationBadge.style.display = unreadCount > 0 ? 'flex' : 'none';

    notificationsList.innerHTML = '';
    notificationsToShow.forEach(notification => {
        const notifItem = document.createElement('div');
        notifItem.className = `notification-item ${!notification.read ? 'unread' : ''}`;
        notifItem.onclick = () => showNotificationDetail(notification);
        
        // Mostrar indicador de documento adjunto si existe
        const attachmentIcon = notification.attachment ? '<i class="fas fa-paperclip" style="color: #3b82f6; margin-left: 5px;"></i>' : '';
        
        notifItem.innerHTML = `
            <h4>${notification.title}${attachmentIcon}</h4>
            <p>${notification.message.substring(0, 50)}...</p>
            <p class="notification-time">${formatDate(notification.date)}</p>
        `;
        notificationsList.appendChild(notifItem);
    });
}

// Mostrar detalle de notificación
function showNotificationDetail(notification) {
    // Verificar que el usuario esté logueado
    if (!currentUser) {
        showNotification('Debes iniciar sesión para ver las notificaciones', 'error');
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
        </div>
    `;
    document.body.appendChild(modal);
}

// Mostrar detalle de bando
function showBandoDetail(bandoId) {
    const bando = bandos.find(b => b.id === bandoId);
    if (!bando) return;

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            <h2>${bando.title}</h2>
            <p><strong>Fecha:</strong> ${formatDate(bando.date)}</p>
            <div style="margin-top: 1rem; white-space: pre-line;">
                <p>${bando.content}</p>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// Alternar centro de notificaciones
function toggleNotificationCenter() {
    // Verificar que el usuario esté logueado
    if (!currentUser) {
        showNotification('Debes iniciar sesión para ver las notificaciones', 'error');
        return;
    }
    
    const center = document.getElementById('notificationCenter');
    center.classList.toggle('show');
}

// Marcar todas las notificaciones como leídas
async function markAllAsRead() {
    notifications.forEach(notification => {
        notification.read = true;
    });
    localStorage.setItem('notifications', JSON.stringify(notifications));
    updateNotificationCenter();

    const authUser = firebase.auth && firebase.auth().currentUser;
    if (authUser && lastReceivedNotifications.length) {
        for (const n of lastReceivedNotifications) {
            await markFirestoreNotificationAsRead(n);
        }
        await updateAppIconBadgeCount(lastReceivedNotifications);
        displayReceivedNotifications(lastReceivedNotifications);
    }

    showNotification('Todas las notificaciones marcadas como leídas', 'success');
}

// Mostrar notificación toast
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `toast toast-${type}`;
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
    `;
    notification.textContent = cloudUserText(message);
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function getVecinosAppShareMessage() {
    const origin = getSiteOrigin();
    const webUrl = origin + '/';
    const apkUrl = origin + '/' + COBREROS_APK_VECINOS_URL.replace(/^\//, '');
    return (
        '🏛️ Ayuntamiento de Cobreros — recibe avisos en tu móvil\n\n' +
        '📱 Android: descarga la app Cobreros Vecinos\n' + apkUrl + '\n\n' +
        '🍎 iPhone: abre en Safari e instala en la pantalla de inicio\n' + webUrl + '\n\n' +
        'Regístrate en la web para recibir avisos de tu localidad.'
    );
}

function toggleVecinosSharePanel(forceOpen) {
    const panel = document.getElementById('vecinosSharePanel');
    const btn = document.getElementById('vecinosShareFabBtn');
    if (!panel || !btn) {
        return;
    }
    const open = typeof forceOpen === 'boolean' ? forceOpen : panel.hidden;
    panel.hidden = !open;
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
}

function closeVecinosSharePanel() {
    toggleVecinosSharePanel(false);
}

function shareVecinosApp(channel) {
    const message = getVecinosAppShareMessage();
    const origin = window.location.origin || '';
    const webUrl = origin + '/';
    const subject = encodeURIComponent('App avisos Ayuntamiento de Cobreros');
    const body = encodeURIComponent(message);

    closeVecinosSharePanel();

    if (channel === 'whatsapp') {
        window.open('https://wa.me/?text=' + body, '_blank', 'noopener');
        return;
    }
    if (channel === 'sms') {
        window.open('sms:?body=' + body, '_blank');
        return;
    }
    if (channel === 'email') {
        window.open('mailto:?subject=' + subject + '&body=' + body, '_blank');
        return;
    }
    if (channel === 'copy') {
        const text = message + '\n';
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(() => {
                showNotification('Enlace copiado. Pégalo en WhatsApp o donde quieras.', 'success');
            }).catch(() => prompt('Copia este mensaje:', text));
        } else {
            prompt('Copia este mensaje:', text);
        }
        return;
    }
    if (channel === 'native' && navigator.share) {
        navigator.share({
            title: 'App avisos — Ayuntamiento de Cobreros',
            text: message,
            url: webUrl
        }).catch(() => {});
        return;
    }
    if (channel === 'native') {
        prompt('Copia y comparte este mensaje:', message);
    }
}

function setupVecinosShareFab() {
    document.addEventListener('click', (event) => {
        const wrap = document.getElementById('vecinosShareFab');
        if (!wrap || wrap.contains(event.target)) {
            return;
        }
        closeVecinosSharePanel();
    });
}

window.toggleVecinosSharePanel = toggleVecinosSharePanel;
window.shareVecinosApp = shareVecinosApp;
window.getVecinosAppShareMessage = getVecinosAppShareMessage;

function shareOnWhatsApp() {
    shareVecinosApp('whatsapp');
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
    
    if (formContainer.style.display === 'none' || formContainer.style.display === '') {
        // Abrir formulario
        formContainer.style.display = 'block';
        toggleBtn.innerHTML = '<i class="fas fa-calendar-minus"></i> Ocultar Formulario';
        toggleBtn.style.background = '#ef4444';
        
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
        }, 100);
        
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
        
        // Backup automático a Firestore
        setTimeout(() => {
            backupContentToFirestore();
        }, 1000);
        
        // Enviar notificación automática solo si es una noticia nueva (no edición)
        if (!article) {
            const titulo = `📢 Nueva Noticia Municipal - ${newsData.title}`;
            const mensaje = `Se ha publicado una nueva noticia: "${newsData.title}". Consulte la información completa en la web del ayuntamiento.`;
            enviarNotificacionPush(titulo, mensaje, 'noticia');
            
            // Guardar en colección de notificaciones para la app móvil
            guardarNotificacionApp(titulo, mensaje, 'noticia', newsData.documentUrl);
        }
    });
}

function openBandoEditor(bandoId = null) {
    const bando = bandoId ? bandos.find(b => b.id === bandoId) : null;
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            <h2>${bando ? 'Editar Bando' : 'Nuevo Bando'}</h2>
            <form id="bandoForm">
                <div class="form-group">
                    <label for="bandoTitle">Título:</label>
                    <input type="text" id="bandoTitle" name="title" value="${bando ? bando.title : ''}" required>
                </div>
                <div class="form-group">
                    <label for="bandoEditorText">Contenido:</label>
                    <textarea id="bandoEditorText" name="content" rows="8" required>${bando ? bando.content : ''}</textarea>
                </div>
                <button type="submit" class="btn btn-primary">${bando ? 'Actualizar' : 'Crear'} Bando</button>
            </form>
        </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('bandoForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const bandoData = Object.fromEntries(formData.entries());
        
        if (bando) {
            // Editar bando existente
            const index = bandos.findIndex(b => b.id === bandoId);
            bandos[index] = { ...bando, ...bandoData };
        } else {
            // Crear nuevo bando
            bandos.push({
                id: Date.now(),
                ...bandoData,
                date: new Date().toISOString().split('T')[0]
            });
        }
        
        localStorage.setItem('bandos', JSON.stringify(bandos));
        updateContent();
        modal.remove();
        showNotification('Bando guardado correctamente', 'success');
        
        // Backup automático a Firestore
        setTimeout(() => {
            backupContentToFirestore();
        }, 1000);
        
        // Enviar notificación automática solo si es un bando nuevo (no edición)
        if (!bando) {
            const titulo = `📄 Nuevo Bando Municipal - ${bandoData.title}`;
            const mensaje = `Se ha publicado un nuevo bando municipal: "${bandoData.title}". Consulte la información completa en la web del ayuntamiento.`;
            enviarNotificacionPush(titulo, mensaje, 'bando');
            
            // Guardar en colección de notificaciones para la app móvil
            guardarNotificacionApp(titulo, mensaje, 'bando', bandoData.documentUrl);
        }
    });
}

function editNews(newsId) {
    openNewsEditor(newsId);
}

function deleteNews(newsId) {
    if (confirm('¿Está seguro de que desea eliminar este anuncio?')) {
        news = news.filter(n => n.id !== newsId);
        localStorage.setItem('news', JSON.stringify(news));
        updateContent();
        showNotification('Anuncio eliminado correctamente', 'success');
    }
}

function editBando(bandoId) {
    openBandoEditor(bandoId);
}

function deleteBando(bandoId) {
    if (confirm('¿Está seguro de que desea eliminar este bando?')) {
        bandos = bandos.filter(b => b.id !== bandoId);
        localStorage.setItem('bandos', JSON.stringify(bandos));
        updateContent();
        showNotification('Bando eliminado correctamente', 'success');
    }
}

// Utilidades
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Superadmin: solo con sesión Firebase activa y admins/{uid}.isSuperAdmin
function isSuperAdminLoggedIn() {
    return isSuperAdmin && isAdminSessionValid();
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
                    <textarea id="editDocDescription" rows="3">${doc.description || ''}</textarea>
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
    document.getElementById('editDocumentForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        doc.name = document.getElementById('editDocName').value;
        doc.description = document.getElementById('editDocDescription').value;
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

    deleteDocumentFromStorage(doc.storagePath).finally(() => {
        showNotification(`Documento "${doc.name}" eliminado correctamente`, 'success');
        loadDocumentsList();
    });
}

// Funciones de gestión de noticias
function openNewsEditor(newsId = null) {
    const isEdit = newsId !== null;
    const news = isEdit ? news.find(n => n.id === newsId) : null;
    
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
                    <input type="text" id="newsTitle" value="${news ? news.title : ''}" required>
                </div>
                <div class="form-group">
                    <label for="newsContent">Contenido:</label>
                    <textarea id="newsContent" rows="6" required>${news ? news.content : ''}</textarea>
                </div>
                <div class="form-group">
                    <label for="newsDate">Fecha:</label>
                    <input type="date" id="newsDate" value="${news ? news.date : new Date().toISOString().split('T')[0]}" required>
                </div>
                <div class="form-group">
                    <label for="newsImage">URL de imagen (opcional):</label>
                    <input type="url" id="newsImage" value="${news ? news.image || '' : ''}">
                </div>
                <button type="submit" class="btn btn-primary">${isEdit ? 'Actualizar' : 'Crear'} Anuncio</button>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
    
    document.getElementById('newsForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const newsData = {
            title: document.getElementById('newsTitle').value,
            content: document.getElementById('newsContent').value,
            date: document.getElementById('newsDate').value,
            image: document.getElementById('newsImage').value || null
        };
        
        if (isEdit) {
            const index = news.findIndex(n => n.id === newsId);
            news[index] = { ...news[index], ...newsData };
        } else {
            newsData.id = Date.now();
            news.push(newsData);
        }
        
        localStorage.setItem('news', JSON.stringify(news));
        showNotification(`Anuncio ${isEdit ? 'actualizado' : 'creado'} correctamente`, 'success');
        modal.remove();
        loadNewsList();
        
        // Backup automático a Firestore
        setTimeout(() => {
            backupContentToFirestore();
        }, 1000);
        
        // Enviar notificación automática solo si es una noticia nueva (no edición)
        if (!isEdit) {
            const titulo = `📢 Nueva Noticia Municipal - ${newsData.title}`;
            const mensaje = `Se ha publicado una nueva noticia: "${newsData.title}". Consulte la información completa en la web del ayuntamiento.`;
            enviarNotificacionPush(titulo, mensaje, 'noticia');
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
    loadNewsList();
    
    // Backup automático a Firestore
    setTimeout(() => {
        backupContentToFirestore();
    }, 1000);
}

// Funciones de gestión de bandos
function openBandoEditor(bandoId = null) {
    const isEdit = bandoId !== null;
    const bando = isEdit ? bandos.find(b => b.id === bandoId) : null;
    
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
                    <label for="bandoEditorText">Contenido:</label>
                    <textarea id="bandoEditorText" rows="8" required>${bando ? bando.content : ''}</textarea>
                </div>
                <div class="form-group">
                    <label for="bandoDate">Fecha:</label>
                    <input type="date" id="bandoDate" value="${bando ? bando.date : new Date().toISOString().split('T')[0]}" required>
                </div>
                <button type="submit" class="btn btn-primary">${isEdit ? 'Actualizar' : 'Crear'} Bando</button>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
    
    document.getElementById('bandoForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const bandoData = {
            title: document.getElementById('bandoTitle').value,
            content: document.getElementById('bandoEditorText').value,
            date: document.getElementById('bandoDate').value
        };
        
        if (isEdit) {
            const index = bandos.findIndex(b => b.id === bandoId);
            bandos[index] = { ...bandos[index], ...bandoData };
        } else {
            bandoData.id = Date.now();
            bandos.push(bandoData);
        }
        
        localStorage.setItem('bandos', JSON.stringify(bandos));
        showNotification(`Bando ${isEdit ? 'actualizado' : 'creado'} correctamente`, 'success');
        modal.remove();
        loadBandoList();
        
        // Backup automático a Firestore
        setTimeout(() => {
            backupContentToFirestore();
        }, 1000);
        
        // Enviar notificación automática solo si es un bando nuevo (no edición)
        if (!isEdit) {
            const titulo = `📄 Nuevo Bando Municipal - ${bandoData.title}`;
            const mensaje = `Se ha publicado un nuevo bando municipal: "${bandoData.title}". Consulte la información completa en la web del ayuntamiento.`;
            enviarNotificacionPush(titulo, mensaje, 'bando');
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
    loadBandoList();
    
    // Backup automático a Firestore
    setTimeout(() => {
        backupContentToFirestore();
    }, 1000);
}

// Funciones de exportación de datos
function exportUsers() {
    const dataStr = JSON.stringify(users, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `usuarios_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showNotification('Usuarios exportados correctamente', 'success');
}

function exportAdmins() {
    const dataStr = JSON.stringify(administrators, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `administradores_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showNotification('Administradores exportados correctamente', 'success');
}

function exportDocuments() {
    const dataStr = JSON.stringify(documents, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `documentos_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showNotification('Documentos exportados correctamente', 'success');
}

function exportNotifications() {
    const dataStr = JSON.stringify(notifications, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `notificaciones_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showNotification('Notificaciones exportadas correctamente', 'success');
}

function exportNews() {
    const dataStr = JSON.stringify(news, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `noticias_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showNotification('Noticias exportadas correctamente', 'success');
}

function exportBandos() {
    const dataStr = JSON.stringify(bandos, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bandos_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showNotification('Bandos exportados correctamente', 'success');
}

function exportEvents() {
    const dataStr = JSON.stringify(events, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `eventos_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showNotification('Eventos exportados correctamente', 'success');
}

// Funciones para gestionar eventos
function openEventEditor(eventId = null) {
    const modal = document.getElementById('eventModal');
    const modalTitle = document.getElementById('eventModalTitle');
    const form = document.getElementById('eventForm');
    
    if (eventId) {
        // Editar evento existente
        const event = events.find(e => e.id === eventId);
        if (event) {
            modalTitle.textContent = '✏️ Editar Evento';
            document.getElementById('eventId').value = event.id;
            document.getElementById('eventTitle').value = event.title;
            document.getElementById('eventDescription').value = event.description;
            document.getElementById('eventDate').value = event.date;
            document.getElementById('eventTime').value = event.time;
            document.getElementById('eventLocation').value = event.location;
            document.getElementById('eventCategory').value = event.category;
        }
    } else {
        // Nuevo evento
        modalTitle.textContent = '🎉 Nuevo Evento';
        form.reset();
        document.getElementById('eventId').value = '';
    }
    
    openModal('eventModal');
}

function closeEventModal() {
    closeModal('eventModal');
}

function saveEvent() {
    const form = document.getElementById('eventForm');
    const formData = new FormData(form);
    
    const eventData = {
        title: formData.get('title'),
        description: formData.get('description'),
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
                <p class="event-description">${event.description}</p>
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
    tarjetas: []
};

// Funciones para gestionar Cultura y Ocio
function openCulturaOcioManager() {
    loadCulturaOcioConfig();
    openModal('culturaOcioModal');
    switchCulturaTab('contenido');
}

function closeCulturaOcioModal() {
    closeModal('culturaOcioModal');
}

function switchCulturaTab(tabName) {
    // Ocultar todas las pestañas
    document.querySelectorAll('#culturaOcioModal .tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remover clase active de todos los botones
    document.querySelectorAll('#culturaOcioModal .tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Mostrar la pestaña seleccionada
    document.getElementById(`cultura-${tabName}-tab`).classList.add('active');
    
    // Activar el botón correspondiente
    event.target.classList.add('active');
    
    // Cargar contenido específico de la pestaña
    switch(tabName) {
        case 'eventos':
            loadCulturaEventsList();
            break;
        case 'tarjetas':
            loadCulturaTarjetasList();
            break;
    }
}

function loadCulturaOcioConfig() {
    const saved = localStorage.getItem('culturaOcioConfig');
    if (saved) {
        culturaOcioConfig = JSON.parse(saved);
    }
    
    document.getElementById('culturaTitulo').value = culturaOcioConfig.titulo;
}

function saveCulturaOcio() {
    culturaOcioConfig.titulo = document.getElementById('culturaTitulo').value;
    
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
    if (container) {
        container.innerHTML = '';
        
        if (culturaOcioConfig.tarjetas && culturaOcioConfig.tarjetas.length > 0) {
            const tarjetasGrid = document.createElement('div');
            tarjetasGrid.className = 'cultura-tarjetas-grid';
            
            culturaOcioConfig.tarjetas
                .filter(tarjeta => tarjeta.activa)
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
                        <p>${tarjeta.descripcion}</p>
                    `;
                    
                    // Lista de elementos
                    const elementosList = document.createElement('div');
                    elementosList.className = 'cultura-tarjeta-elementos';
                    
                    tarjeta.elementos.forEach(elemento => {
                        const elementoDiv = document.createElement('div');
                        elementoDiv.className = 'cultura-elemento';
                        
                        if (elemento.esEnlace) {
                            elementoDiv.innerHTML = `
                                <a href="${elemento.enlace}" class="elemento-link">
                                    <h4>${elemento.titulo}</h4>
                                    <p>${elemento.descripcion}</p>
                                </a>
                            `;
                        } else {
                            elementoDiv.innerHTML = `
                                <div class="elemento-info">
                                    <h4>${elemento.titulo}</h4>
                                    <p>${elemento.descripcion}</p>
                                </div>
                            `;
                        }
                        
                        elementosList.appendChild(elementoDiv);
                    });
                    
                    tarjetaElement.appendChild(header);
                    tarjetaElement.appendChild(elementosList);
                    tarjetasGrid.appendChild(tarjetaElement);
                });
            
            container.appendChild(tarjetasGrid);
        }
    }
}

function loadCulturaEventsList() {
    const eventsList = document.getElementById('culturaEventsList');
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
    const data = {
        config: culturaOcioConfig,
        events: events
    };
    
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cultura_ocio_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showNotification('Datos de Cultura y Ocio exportados correctamente', 'success');
}

function exportQuickAccess() {
    const dataStr = JSON.stringify(quickAccess, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `acceso_rapido_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showNotification('Tarjetas de acceso rápido exportadas correctamente', 'success');
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
                    showNotification('Usuarios importados correctamente', 'success');
                    break;
                case 'admins':
                    showNotification(
                        'Los administradores solo se crean desde el panel con acceso en la nube.',
                        'warning'
                    );
                    break;
                case 'documents':
                    documents = data;
                    localStorage.setItem('documents', JSON.stringify(documents));
                    showNotification('Documentos importados correctamente', 'success');
                    break;
                case 'notifications':
                    notifications = data;
                    localStorage.setItem('notifications', JSON.stringify(notifications));
                    showNotification('Notificaciones importadas correctamente', 'success');
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
                    <p>Con Notificaciones</p>
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

    const totalUsers = users.length;
    const totalAdmins = administrators.length;
    const totalDocuments = documents.length;
    const totalNotifications = notifications.length;
    const totalNews = news.length;
    const totalBandos = bandos.length;
    const totalEvents = events.length;
    const totalQuickAccess = quickAccess.length;

    statsContainer.innerHTML = `
        <div class="stats-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
            <div class="stat-card" style="background: #f0f9ff; padding: 1rem; border-radius: 8px; text-align: center; border: 1px solid #0ea5e9;">
                <h3 style="color: #0ea5e9; margin: 0;">${totalUsers}</h3>
                <p style="margin: 0.5rem 0 0 0; color: #64748b;">Usuarios Registrados</p>
            </div>
            <div class="stat-card" style="background: #f0fdf4; padding: 1rem; border-radius: 8px; text-align: center; border: 1px solid #22c55e;">
                <h3 style="color: #22c55e; margin: 0;">${totalAdmins}</h3>
                <p style="margin: 0.5rem 0 0 0; color: #64748b;">Administradores</p>
            </div>
            <div class="stat-card" style="background: #fef3c7; padding: 1rem; border-radius: 8px; text-align: center; border: 1px solid #f59e0b;">
                <h3 style="color: #f59e0b; margin: 0;">${totalDocuments}</h3>
                <p style="margin: 0.5rem 0 0 0; color: #64748b;">Documentos</p>
            </div>
            <div class="stat-card" style="background: #fdf2f8; padding: 1rem; border-radius: 8px; text-align: center; border: 1px solid #ec4899;">
                <h3 style="color: #ec4899; margin: 0;">${totalNotifications}</h3>
                <p style="margin: 0.5rem 0 0 0; color: #64748b;">Notificaciones</p>
            </div>
            <div class="stat-card" style="background: #f3e8ff; padding: 1rem; border-radius: 8px; text-align: center; border: 1px solid #a855f7;">
                <h3 style="color: #a855f7; margin: 0;">${totalNews}</h3>
                <p style="margin: 0.5rem 0 0 0; color: #64748b;">Noticias</p>
            </div>
            <div class="stat-card" style="background: #ecfdf5; padding: 1rem; border-radius: 8px; text-align: center; border: 1px solid #10b981;">
                <h3 style="color: #10b981; margin: 0;">${totalBandos}</h3>
                <p style="margin: 0.5rem 0 0 0; color: #64748b;">Bandos</p>
            </div>
            <div class="stat-card" style="background: #fef2f2; padding: 1rem; border-radius: 8px; text-align: center; border: 1px solid #ef4444;">
                <h3 style="color: #ef4444; margin: 0;">${totalEvents}</h3>
                <p style="margin: 0.5rem 0 0 0; color: #64748b;">Eventos</p>
            </div>
            <div class="stat-card" style="background: #f0fdfa; padding: 1rem; border-radius: 8px; text-align: center; border: 1px solid #14b8a6;">
                <h3 style="color: #14b8a6; margin: 0;">${totalQuickAccess}</h3>
                <p style="margin: 0.5rem 0 0 0; color: #64748b;">Acceso Rápido</p>
            </div>
        </div>
    `;
}

// Obtener información del super admin
function getSuperAdminInfo() {
    if (!isSuperAdminLoggedIn() || !currentUser) {
        return null;
    }
    return {
        email: currentUser.email,
        permissions: ['full_access', 'user_management', 'content_management', 'notifications', 'system_settings']
    };
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

function normalizeAppointmentAvailability(raw) {
    const normalizedDays = Array.isArray(raw?.enabledDays)
        ? raw.enabledDays.map((d) => parseInt(d, 10)).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
        : [1, 2, 3, 4, 5];
    const uniqueDays = [...new Set(normalizedDays)];
    const normalizedSlots = Array.isArray(raw?.timeSlots)
        ? raw.timeSlots
              .map((slot) => String(slot).trim())
              .filter((slot) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(slot))
        : ['09:00', '10:00', '11:00', '12:00', '16:00', '17:00', '18:00'];
    const uniqueSlots = [...new Set(normalizedSlots)].sort();
    const slotCapacityDefault = Math.max(1, parseInt(raw?.slotCapacityDefault || 1, 10) || 1);
    const capacityBySlot = {};
    if (raw?.capacityBySlot && typeof raw.capacityBySlot === 'object') {
        Object.entries(raw.capacityBySlot).forEach(([slot, cap]) => {
            if (/^([01]\d|2[0-3]):([0-5]\d)$/.test(slot)) {
                const parsedCap = Math.max(1, parseInt(cap, 10) || slotCapacityDefault);
                capacityBySlot[slot] = parsedCap;
            }
        });
    }
    const holidays = Array.isArray(raw?.holidays)
        ? raw.holidays
              .map((d) => String(d).trim())
              .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
        : [];
    const exceptionsByDate = {};
    if (raw?.exceptionsByDate && typeof raw.exceptionsByDate === 'object') {
        Object.entries(raw.exceptionsByDate).forEach(([date, exception]) => {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
            const ex = exception || {};
            const exTimeSlots = Array.isArray(ex.timeSlots)
                ? ex.timeSlots
                      .map((slot) => String(slot).trim())
                      .filter((slot) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(slot))
                : null;
            const exCapacityBySlot = {};
            if (ex.capacityBySlot && typeof ex.capacityBySlot === 'object') {
                Object.entries(ex.capacityBySlot).forEach(([slot, cap]) => {
                    if (/^([01]\d|2[0-3]):([0-5]\d)$/.test(slot)) {
                        exCapacityBySlot[slot] = Math.max(1, parseInt(cap, 10) || slotCapacityDefault);
                    }
                });
            }
            exceptionsByDate[date] = {
                enabled: ex.enabled !== false,
                timeSlots: exTimeSlots,
                capacityBySlot: exCapacityBySlot
            };
        });
    }

    return {
        enabledDays: uniqueDays.length ? uniqueDays : [1, 2, 3, 4, 5],
        timeSlots: uniqueSlots.length ? uniqueSlots : ['09:00', '10:00', '11:00', '12:00', '16:00', '17:00', '18:00'],
        slotCapacityDefault,
        capacityBySlot,
        holidays: [...new Set(holidays)].sort(),
        exceptionsByDate,
        updatedAt: raw?.updatedAt || null,
        updatedBy: raw?.updatedBy || 'system'
    };
}

function renderAppointmentAvailabilityAdmin() {
    for (let day = 0; day <= 6; day += 1) {
        const checkbox = document.getElementById(`day-${day}`);
        if (checkbox) {
            checkbox.checked = appointmentAvailability.enabledDays.includes(day);
        }
    }
    const slotsInput = document.getElementById('appointmentTimeSlotsInput');
    if (slotsInput) {
        slotsInput.value = appointmentAvailability.timeSlots.join(',');
    }
    const capacityInput = document.getElementById('appointmentSlotCapacityInput');
    if (capacityInput) {
        capacityInput.value = String(appointmentAvailability.slotCapacityDefault || 1);
    }
    const holidaysInput = document.getElementById('appointmentHolidaysInput');
    if (holidaysInput) {
        holidaysInput.value = (appointmentAvailability.holidays || []).join(',');
    }
    const exceptionsInput = document.getElementById('appointmentExceptionsInput');
    if (exceptionsInput) {
        const list = Object.entries(appointmentAvailability.exceptionsByDate || {}).map(([date, ex]) => ({
            date,
            enabled: ex.enabled !== false,
            timeSlots: Array.isArray(ex.timeSlots) ? ex.timeSlots : undefined,
            capacityBySlot: ex.capacityBySlot && Object.keys(ex.capacityBySlot).length ? ex.capacityBySlot : undefined
        }));
        exceptionsInput.value = JSON.stringify(list, null, 2);
    }
}

function loadAppointmentAvailabilitySettings() {
    const saved = localStorage.getItem('appointmentAvailability');
    if (saved) {
        try {
            appointmentAvailability = normalizeAppointmentAvailability(JSON.parse(saved));
        } catch (error) {
            console.warn('No se pudo cargar appointmentAvailability, se mantiene el valor por defecto', error);
        }
    }
    renderAppointmentAvailabilityAdmin();
    refreshAppointmentTimeOptions();
}

function saveAppointmentAvailabilitySettings() {
    if (!isAdmin) {
        showNotification('Solo los administradores pueden cambiar la disponibilidad', 'error');
        return;
    }
    const enabledDays = [];
    for (let day = 0; day <= 6; day += 1) {
        const checkbox = document.getElementById(`day-${day}`);
        if (checkbox && checkbox.checked) {
            enabledDays.push(day);
        }
    }
    if (enabledDays.length === 0) {
        showNotification('Selecciona al menos un día disponible', 'error');
        return;
    }
    const slotsInput = document.getElementById('appointmentTimeSlotsInput');
    const rawSlots = slotsInput ? slotsInput.value : '';
    const validSlots = [...new Set(rawSlots.split(',').map((slot) => slot.trim()))]
        .filter((slot) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(slot))
        .sort();
    if (validSlots.length === 0) {
        showNotification('Introduce al menos una hora válida (ej: 09:00)', 'error');
        return;
    }
    const capacityInput = document.getElementById('appointmentSlotCapacityInput');
    const slotCapacityDefault = Math.max(1, parseInt(capacityInput?.value || '1', 10) || 1);
    const holidaysInput = document.getElementById('appointmentHolidaysInput');
    const holidays = [...new Set((holidaysInput?.value || '')
        .split(',')
        .map((d) => d.trim())
        .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)))].sort();

    let exceptionsByDate = {};
    const exceptionsInput = document.getElementById('appointmentExceptionsInput');
    const rawExceptions = exceptionsInput?.value?.trim();
    if (rawExceptions) {
        try {
            const parsed = JSON.parse(rawExceptions);
            if (!Array.isArray(parsed)) {
                throw new Error('El JSON de excepciones debe ser una lista');
            }
            parsed.forEach((item) => {
                if (!item || !/^\d{4}-\d{2}-\d{2}$/.test(item.date || '')) {
                    return;
                }
                const exTimeSlots = Array.isArray(item.timeSlots)
                    ? item.timeSlots
                          .map((slot) => String(slot).trim())
                          .filter((slot) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(slot))
                    : undefined;
                const exCapacityBySlot = {};
                if (item.capacityBySlot && typeof item.capacityBySlot === 'object') {
                    Object.entries(item.capacityBySlot).forEach(([slot, cap]) => {
                        if (/^([01]\d|2[0-3]):([0-5]\d)$/.test(slot)) {
                            exCapacityBySlot[slot] = Math.max(1, parseInt(cap, 10) || slotCapacityDefault);
                        }
                    });
                }
                exceptionsByDate[item.date] = {
                    enabled: item.enabled !== false,
                    timeSlots: exTimeSlots,
                    capacityBySlot: exCapacityBySlot
                };
            });
        } catch (error) {
            showNotification('JSON de excepciones inválido', 'error');
            return;
        }
    }

    appointmentAvailability = {
        enabledDays: enabledDays.sort(),
        timeSlots: validSlots,
        slotCapacityDefault,
        capacityBySlot: {},
        holidays,
        exceptionsByDate,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser?.email || 'admin'
    };
    localStorage.setItem('appointmentAvailability', JSON.stringify(appointmentAvailability));
    refreshAppointmentTimeOptions();
    void syncAppointmentConfigToFirestore().then((ok) => {
        if (ok) {
            showNotification('Disponibilidad guardada y sincronizada en la nube', 'success');
        } else {
            showNotification('Disponibilidad guardada localmente (inicie sesión como administrador para sincronizar en la nube)', 'warning');
        }
    });
}

function setAppointmentDateConstraints() {
    const dateInput = document.getElementById('date');
    if (!dateInput) return;
    dateInput.setAttribute('min', new Date().toISOString().split('T')[0]);
}

function isDateAllowedByAvailability(dateIso) {
    if (!dateIso) return false;
    const d = new Date(dateIso + 'T00:00:00');
    if (Number.isNaN(d.getTime())) return false;
    if ((appointmentAvailability.holidays || []).includes(dateIso)) return false;
    const dateException = appointmentAvailability.exceptionsByDate?.[dateIso];
    if (dateException && dateException.enabled === false) return false;
    return appointmentAvailability.enabledDays.includes(d.getDay());
}

function getEffectiveTimeSlotsForDate(dateIso) {
    const dateException = appointmentAvailability.exceptionsByDate?.[dateIso];
    if (dateException && Array.isArray(dateException.timeSlots) && dateException.timeSlots.length) {
        return dateException.timeSlots;
    }
    return appointmentAvailability.timeSlots;
}

function getEffectiveCapacityForSlot(dateIso, slot) {
    const dateException = appointmentAvailability.exceptionsByDate?.[dateIso];
    if (dateException?.capacityBySlot?.[slot]) {
        return dateException.capacityBySlot[slot];
    }
    if (appointmentAvailability.capacityBySlot?.[slot]) {
        return appointmentAvailability.capacityBySlot[slot];
    }
    return appointmentAvailability.slotCapacityDefault || 1;
}

function refreshAppointmentTimeOptions() {
    const timeSelect = document.getElementById('time');
    const dateInput = document.getElementById('date');
    if (!timeSelect) return;
    const currentValue = timeSelect.value;
    timeSelect.innerHTML = '<option value="">Seleccione una hora</option>';
    const selectedDate = dateInput ? dateInput.value : '';
    const slots = getEffectiveTimeSlotsForDate(selectedDate);
    slots.forEach((slot) => {
        const option = document.createElement('option');
        option.value = slot;
        option.textContent = slot;
        timeSelect.appendChild(option);
    });
    if (slots.includes(currentValue)) {
        timeSelect.value = currentValue;
    }
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
    setAppointmentDateConstraints();
    refreshAppointmentTimeOptions();
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
    
    void syncAppointmentConfigToFirestore();
    showNotification(`Sistema de citas previas ${appointmentsEnabled ? 'activado' : 'desactivado'}`, 'success');
    console.log('💾 Configuración guardada:', appointmentsEnabled ? 'CITA PREVIA' : 'SIN CITA PREVIA');
}

/** Sincroniza citas previas (on/off) y calendario a configuraciones/data para todos los dispositivos y el servidor. */
async function syncAppointmentConfigToFirestore() {
    try {
        if (!window.firebase || !window.firebase.firestore) {
            return false;
        }
        if (!(await isFirebaseAdmin())) {
            return false;
        }
        await firebase
            .firestore()
            .collection('configuraciones')
            .doc('data')
            .set(
                {
                    appointmentSettings: {
                        enabled: !!appointmentsEnabled,
                        updatedAt: new Date().toISOString(),
                        updatedBy: currentUser?.email || 'admin'
                    },
                    appointmentAvailability: appointmentAvailability,
                    lastUpdate: firebase.firestore.FieldValue.serverTimestamp(),
                    source: 'WEB_SYNC'
                },
                { merge: true }
            );
        console.log('✅ Configuración de citas sincronizada en configuraciones/data');
        return true;
    } catch (error) {
        console.error('Error sincronizando configuración de citas:', error);
        return false;
    }
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

// Función para enviar email de confirmación (simulada)
function sendConfirmationEmail(appointmentData) {
    const emailContent = {
        to: appointmentData.email,
        from: 'aytocobreros@gmail.com',
        subject: 'Confirmación de Cita Previa - Ayuntamiento de Cobreros',
        body: `
Estimado/a ${appointmentData.name},

Hemos recibido su solicitud de cita previa con los siguientes datos:

- Servicio: ${appointmentData.service}
- Fecha preferida: ${appointmentData.date}
- Hora preferida: ${appointmentData.time}
- DNI: ${appointmentData.dni}

Le contactaremos en breve para confirmar la fecha y hora exacta de su cita.

Atentamente,
Ayuntamiento de Cobreros
aytocobreros@gmail.com
980 62 26 18
        `
    };
    
    console.log('Email de confirmación enviado:', emailContent);
    return true;
}

// Función para enviar alerta al ayuntamiento (simulada)
function sendAdminAlert(appointmentData) {
    const alertContent = {
        to: 'aytocobreros@gmail.com',
        from: 'aytocobreros@gmail.com',
        subject: 'NUEVA SOLICITUD DE CITA PREVIA',
        body: `
NUEVA SOLICITUD DE CITA PREVIA RECIBIDA:

Datos del solicitante:
- Nombre: ${appointmentData.name}
- DNI: ${appointmentData.dni}
- Email: ${appointmentData.email}
- Teléfono: ${appointmentData.phone}

Detalles de la cita:
- Servicio: ${appointmentData.service}
- Fecha preferida: ${appointmentData.date}
- Hora preferida: ${appointmentData.time}
- Comentarios: ${appointmentData.comments || 'Ninguno'}

Fecha de solicitud: ${new Date().toLocaleString('es-ES')}

Por favor, contacte con el solicitante para confirmar la cita.
        `
    };
    
    console.log('Alerta enviada al ayuntamiento:', alertContent);
    return true;
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
        appointments = JSON.parse(savedAppointments);
    }
    loadAppointmentsFromFirestoreInBackground();
}

function saveAppointments() {
    localStorage.setItem('appointments', JSON.stringify(appointments));
}

function mapAppointmentFromFirestore(doc) {
    const d = doc.data() || {};
    return {
        id: doc.id,
        userId: d.userId || '',
        name: d.name || '',
        dni: d.dni || '',
        email: d.email || '',
        phone: d.phone || '',
        service: d.service || '',
        date: d.date || '',
        time: d.time || '',
        comments: d.comments || '',
        status: d.status || 'pending',
        gdprConsent: d.gdprConsent || false,
        createdAt: d.createdAt || new Date().toISOString(),
        updatedAt: d.updatedAt || new Date().toISOString()
    };
}

async function canReadAppointmentsFromFirestore() {
    if (!window.firebase || !window.firebase.auth || !window.firebase.firestore) {
        return false;
    }
    if (await isFirebaseAdmin()) {
        return true;
    }
    return !!firebase.auth().currentUser;
}

async function loadAppointmentsFromFirestoreInBackground() {
    try {
        if (!(await canReadAppointmentsFromFirestore())) {
            return;
        }
        const db = firebase.firestore();
        const isAdminFirestore = await isFirebaseAdmin();
        const authUser = firebase.auth().currentUser;
        let snapshot;
        if (isAdminFirestore) {
            snapshot = await db.collection('appointments').orderBy('createdAt', 'desc').limit(500).get();
        } else if (authUser) {
            snapshot = await db
                .collection('appointments')
                .where('userId', '==', authUser.uid)
                .orderBy('createdAt', 'desc')
                .limit(200)
                .get();
        } else {
            return;
        }
        const loaded = [];
        snapshot.forEach((doc) => loaded.push(mapAppointmentFromFirestore(doc)));
        appointments = loaded;
        saveAppointments();
        if (document.getElementById('appointmentsList')) {
            loadAppointmentsList();
            loadAppointmentStats();
        }
    } catch (err) {
        console.warn('No se pudieron cargar citas desde Firestore:', err);
    }
}

async function createAppointmentInFirestore(appointment) {
    try {
        const db = firebase.firestore();
        const payload = {
            userId: appointment.userId || '',
            name: appointment.name || '',
            dni: appointment.dni || '',
            email: appointment.email || '',
            phone: appointment.phone || '',
            service: appointment.service || '',
            date: appointment.date || '',
            time: appointment.time || '',
            comments: appointment.comments || '',
            status: appointment.status || 'pending',
            gdprConsent: !!appointment.gdprConsent,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            source: 'WEB'
        };
        const ref = await db.collection('appointments').add(payload);
        const snap = await ref.get();
        return mapAppointmentFromFirestore(snap);
    } catch (err) {
        console.error('Error creando cita en Firestore:', err);
        return null;
    }
}

async function createAppointmentAtomic(appointment) {
    const endpoint =
        'https://us-central1-ayuntamiento-de-cobreros.cloudfunctions.net/createAppointmentAtomic';
    try {
        const token = await getAuthBearerToken();
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: JSON.stringify({ appointment })
        });
        const data = await response.json();
        if (!response.ok || !data?.success || !data?.appointment) {
            if (data?.errorCode === 'SLOT_FULL') {
                showNotification('La franja seleccionada ya está completa', 'error');
            } else if (data?.errorCode === 'DAY_NOT_AVAILABLE') {
                showNotification('El día seleccionado no está disponible', 'error');
            } else             if (data?.errorCode === 'TIME_NOT_AVAILABLE') {
                showNotification('La hora seleccionada no está disponible para ese día', 'error');
            } else if (data?.errorCode === 'APPOINTMENTS_DISABLED') {
                showNotification('En este momento no se aceptan citas previas. Acuda directamente al ayuntamiento.', 'info');
            }
            return null;
        }
        return data.appointment;
    } catch (error) {
        console.warn('Fallback a escritura directa por error en createAppointmentAtomic:', error);
        return createAppointmentInFirestore(appointment);
    }
}

async function isAppointmentSlotAvailable(date, time, excludeAppointmentId = null) {
    if (!window.firebase || !window.firebase.firestore) {
        return true;
    }
    try {
        const snapshot = await firebase
            .firestore()
            .collection('appointments')
            .where('date', '==', date)
            .where('time', '==', time)
            .where('status', 'in', ['pending', 'confirmed'])
            .limit(10)
            .get();
        let occupied = 0;
        snapshot.forEach((doc) => {
            if (!excludeAppointmentId || doc.id !== excludeAppointmentId) {
                occupied += 1;
            }
        });
        const capacity = getEffectiveCapacityForSlot(date, time);
        return occupied < capacity;
    } catch (err) {
        console.warn('No se pudo validar disponibilidad en Firestore:', err);
        return true;
    }
}

async function updateAppointmentInFirestore(appointmentId, patch) {
    if (!window.firebase || !window.firebase.firestore) return false;
    try {
        await firebase
            .firestore()
            .collection('appointments')
            .doc(appointmentId)
            .set(
                {
                    ...patch,
                    updatedAt: new Date().toISOString()
                },
                { merge: true }
            );
        return true;
    } catch (err) {
        console.error('Error actualizando cita en Firestore:', err);
        return false;
    }
}

async function deleteAppointmentInFirestore(appointmentId) {
    if (!window.firebase || !window.firebase.firestore) return false;
    try {
        await firebase.firestore().collection('appointments').doc(appointmentId).delete();
        return true;
    } catch (err) {
        console.error('Error eliminando cita en Firestore:', err);
        return false;
    }
}

async function invokeAppointmentNotificationEvent(eventType, appointment, oldStatus) {
    const endpoint =
        'https://us-central1-ayuntamiento-de-cobreros.cloudfunctions.net/notifyAppointmentEvent';
    const payload = {
        eventType: eventType,
        appointment: appointment,
        oldStatus: oldStatus || null
    };
    const token = await getAuthBearerToken();
    const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
    });
    if (!res.ok) {
        throw new Error('HTTP ' + res.status);
    }
}

async function getAuthBearerToken() {
    try {
        if (!window.firebase || !window.firebase.auth) {
            return null;
        }
        const user = firebase.auth().currentUser;
        if (!user) {
            return null;
        }
        return await user.getIdToken();
    } catch (error) {
        console.warn('No se pudo obtener ID token:', error);
        return null;
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
        
        // Botón de editar (siempre visible)
        actionButtons += `<button class="btn btn-primary" onclick="editAppointment('${appointment.id}')">
            <i class="fas fa-edit"></i> Editar
        </button>`;
        
        // Botones según el estado
        if (appointment.status === 'pending') {
            actionButtons += `<button class="btn btn-success" onclick="updateAppointmentStatus('${appointment.id}', 'confirmed')">
                <i class="fas fa-check"></i> Confirmar
            </button>`;
            actionButtons += `<button class="btn btn-warning" onclick="updateAppointmentStatus('${appointment.id}', 'cancelled')">
                <i class="fas fa-times"></i> Cancelar
            </button>`;
        } else if (appointment.status === 'confirmed') {
            actionButtons += `<button class="btn btn-warning" onclick="updateAppointmentStatus('${appointment.id}', 'cancelled')">
                <i class="fas fa-times"></i> Cancelar
            </button>`;
        } else if (appointment.status === 'cancelled') {
            actionButtons += `<button class="btn btn-success" onclick="updateAppointmentStatus('${appointment.id}', 'confirmed')">
                <i class="fas fa-check"></i> Confirmar de nuevo
            </button>`;
        }
        
        // Botones adicionales
        actionButtons += `<button class="btn btn-outline" onclick="viewAppointmentDetails('${appointment.id}')">
            <i class="fas fa-eye"></i> Ver Detalles
        </button>`;
        actionButtons += `<button class="btn btn-danger" onclick="deleteAppointment('${appointment.id}')">
            <i class="fas fa-trash"></i> Eliminar
        </button>`;
        
        return `
            <div class="appointment-item" data-status="${appointment.status}" style="margin-bottom: 1rem; border: 1px solid var(--border-color); border-radius: var(--border-radius);">
                <div class="appointment-header" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                    <div class="appointment-info" style="flex: 1;">
                        <div class="appointment-name" style="font-weight: 600; color: var(--text-primary); margin-bottom: 0.25rem;">${appointment.name}</div>
                        <div class="appointment-service" style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 0.25rem;">${getServiceName(appointment.service)}</div>
                        <div class="appointment-datetime" style="color: var(--text-secondary); font-size: 0.85rem;">
                            <i class="fas fa-calendar"></i> ${formatDate(appointment.date)} 
                            <i class="fas fa-clock"></i> ${appointment.time}
                        </div>
                    </div>
                    <div class="appointment-status">
                        <span class="status-badge status-${appointment.status}" style="padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.75rem; font-weight: 500; text-transform: uppercase;">${getStatusText(appointment.status)}</span>
                    </div>
                </div>
                <div class="appointment-details" style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid var(--border-color); font-size: 0.85rem; color: var(--text-secondary);">
                    <p style="margin-bottom: 0.25rem;"><strong style="color: var(--text-primary);">DNI:</strong> ${appointment.dni}</p>
                    <p style="margin-bottom: 0.25rem;"><strong style="color: var(--text-primary);">Email:</strong> ${appointment.email}</p>
                    <p style="margin-bottom: 0.25rem;"><strong style="color: var(--text-primary);">Teléfono:</strong> ${appointment.phone}</p>
                    ${appointment.comments ? `<p style="margin-bottom: 0.25rem;"><strong style="color: var(--text-primary);">Comentarios:</strong> ${appointment.comments}</p>` : ''}
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
    
    document.getElementById('totalAppointments').textContent = total;
    document.getElementById('pendingAppointments').textContent = pending;
    document.getElementById('confirmedAppointments').textContent = confirmed;
    document.getElementById('cancelledAppointments').textContent = cancelled;
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
        'cancelled': 'Cancelada'
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

async function updateAppointmentStatus(appointmentId, newStatus) {
    const appointment = appointments.find(a => a.id === appointmentId);
    if (appointment) {
        const oldStatus = appointment.status;
        appointment.status = newStatus;
        appointment.updatedAt = new Date().toISOString();
        const persisted = await updateAppointmentInFirestore(appointment.id, { status: newStatus });
        if (!persisted) {
            showNotification('No se pudo actualizar el estado en servidor', 'error');
            return;
        }
        saveAppointments();
        loadAppointmentsList();
        loadAppointmentStats();
        
        // Enviar email de confirmación al usuario
        sendStatusChangeEmail(appointment, oldStatus, newStatus);
        invokeAppointmentNotificationEvent('status_changed', appointment, oldStatus).catch((err) =>
            console.warn('Aviso cita (status_changed):', err)
        );
        
        const statusText = getStatusText(newStatus);
        showNotification(`Cita ${statusText.toLowerCase()} correctamente. Se ha enviado un email de confirmación.`, 'success');
    }
}

async function deleteAppointment(appointmentId) {
    if (confirm('¿Está seguro de que desea eliminar esta cita previa?')) {
        const deleted = await deleteAppointmentInFirestore(appointmentId);
        if (!deleted) {
            showNotification('No se pudo eliminar la cita en servidor', 'error');
            return;
        }
        appointments = appointments.filter(a => a.id !== appointmentId);
        saveAppointments();
        loadAppointmentsList();
        loadAppointmentStats();
        showNotification('Cita previa eliminada correctamente', 'success');
    }
}

function viewAppointmentDetails(appointmentId) {
    const appointment = appointments.find(a => a.id === appointmentId);
    if (appointment) {
        const details = `
Detalles de la Cita Previa:

Nombre: ${appointment.name}
DNI: ${appointment.dni}
Email: ${appointment.email}
Teléfono: ${appointment.phone}
Servicio: ${getServiceName(appointment.service)}
Fecha: ${formatDate(appointment.date)}
Hora: ${appointment.time}
Estado: ${getStatusText(appointment.status)}
Comentarios: ${appointment.comments || 'Ninguno'}
Solicitado: ${formatDateTime(appointment.createdAt)}
Última actualización: ${formatDateTime(appointment.updatedAt)}
        `;
        alert(details);
    }
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

async function refreshAppointments() {
    await loadAppointmentsFromFirestoreInBackground();
    if (appointments.length === 0) {
        loadAppointments();
    }
    loadAppointmentsList();
    loadAppointmentStats();
    showNotification('Lista de citas actualizada', 'success');
}

// Función para crear una cita de prueba (solo para desarrollo)
function createTestAppointment() {
    const testAppointment = {
        id: Date.now().toString(),
        name: 'Juan Pérez García',
        dni: '12345678A',
        email: 'juan.perez@email.com',
        phone: '666123456',
        service: 'empadronamiento',
        date: '2024-12-25',
        time: '10:00',
        comments: 'Cita de prueba para verificar funcionalidad',
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    appointments.push(testAppointment);
    saveAppointments();
    loadAppointmentsList();
    loadAppointmentStats();
    showNotification('Cita de prueba creada', 'success');
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
        const persisted = await updateAppointmentInFirestore(appointment.id, {
            service: appointment.service,
            name: appointment.name,
            dni: appointment.dni,
            email: appointment.email,
            phone: appointment.phone,
            date: appointment.date,
            time: appointment.time,
            comments: appointment.comments,
            status: appointment.status
        });
        if (!persisted) {
            showNotification('No se pudo guardar la edición en servidor', 'error');
            return;
        }
        
        saveAppointments();
        loadAppointmentsList();
        loadAppointmentStats();
        
        // Si cambió el estado, enviar email de confirmación
        if (oldStatus !== appointment.status) {
            sendStatusChangeEmail(appointment, oldStatus, appointment.status);
            invokeAppointmentNotificationEvent('status_changed', appointment, oldStatus).catch((err) =>
                console.warn('Aviso cita (status_changed):', err)
            );
        }
        
        closeEditAppointmentModal();
        showNotification('Cita previa actualizada correctamente', 'success');
    }
}

// Función para enviar email de cambio de estado
function sendStatusChangeEmail(appointment, oldStatus, newStatus) {
    const statusText = getStatusText(newStatus);
    const oldStatusText = getStatusText(oldStatus);
    
    const emailContent = {
        to: appointment.email,
        from: 'aytocobreros@gmail.com',
        subject: `Actualización de Cita Previa - ${statusText}`,
        body: `
Estimado/a ${appointment.name},

Le informamos que el estado de su cita previa ha sido actualizado:

Estado anterior: ${oldStatusText}
Estado actual: ${statusText}

Detalles de su cita:
- Servicio: ${getServiceName(appointment.service)}
- Fecha: ${formatDate(appointment.date)}
- Hora: ${appointment.time}
- DNI: ${appointment.dni}

${newStatus === 'confirmed' ? `
Su cita ha sido CONFIRMADA. Por favor, acuda al ayuntamiento en la fecha y hora indicadas.

IMPORTANTE: Si no puede acudir, por favor contacte con nosotros lo antes posible.
` : newStatus === 'cancelled' ? `
Su cita ha sido CANCELADA. Si necesita una nueva cita, puede solicitarla a través de nuestra página web o contactando directamente con nosotros.
` : `
Su cita está PENDIENTE de confirmación. Le contactaremos próximamente para confirmar la fecha y hora exacta.
`}

Para cualquier consulta, puede contactar con nosotros:
- Email: aytocobreros@gmail.com
- Teléfono: 980 62 26 18

Atentamente,
Ayuntamiento de Cobreros
        `
    };
    
    console.log('Email de cambio de estado enviado:', emailContent);
    return true;
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
        scrollContent.innerHTML = '<div class="scroll-item">No hay notificaciones activas</div>';
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
        notificationsList.innerHTML = '<div class="no-data" style="padding: 2rem; text-align: center; color: var(--text-secondary);">No hay notificaciones públicas creadas</div>';
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
                    <button class="btn btn-outline" onclick="sendPublicBannerPushForId('${notification.id}')">
                        <i class="fas fa-bell"></i> Enviar push
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
            modalTitle.textContent = 'Editar Notificación Pública';
            document.getElementById('notificationId').value = notification.id;
            document.getElementById('notificationType').value = notification.type;
            document.getElementById('notificationTitle').value = notification.title;
            setRichEditorContent(notification.message);
            document.getElementById('notificationStartDate').value = notification.startDate;
            document.getElementById('notificationEndDate').value = notification.endDate || '';
            document.getElementById('notificationPriority').value = notification.priority;
            document.getElementById('notificationActive').checked = notification.active;
        }
    } else {
        // Nueva notificación
        modalTitle.textContent = 'Nueva Notificación Pública';
        form.reset();
        document.getElementById('notificationId').value = '';
        document.getElementById('notificationStartDate').value = new Date().toISOString().split('T')[0];
    }
    resetPublicNotifPushFormUI();
    
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closePublicNotificationModal() {
    const modal = document.getElementById('publicNotificationModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

function mapPublicNotificationTypeToPush(type) {
    if (type === 'emergency') return 'emergencia';
    if (type === 'event') return 'evento';
    return 'general';
}

function stripHtmlForPush(html) {
    const div = document.createElement('div');
    div.innerHTML = html || '';
    const text = (div.textContent || div.innerText || '').trim();
    if (!text) return '';
    return text.length > 220 ? `${text.slice(0, 217)}...` : text;
}

function resetPublicNotifPushFormUI() {
    const sendPush = document.getElementById('publicNotifSendPush');
    const pushOptions = document.getElementById('publicNotifPushOptions');
    const pushScope = document.getElementById('publicNotifPushScope');
    if (sendPush) sendPush.checked = false;
    if (pushOptions) pushOptions.style.display = 'none';
    if (pushScope) pushScope.value = 'todos';
    document.querySelectorAll('input[name="publicNotifLocalities"]').forEach((cb) => {
        cb.checked = false;
    });
    togglePublicNotifPushLocalidades();
}

function togglePublicNotifPushLocalidades() {
    const scope = document.getElementById('publicNotifPushScope');
    const localitiesDiv = document.getElementById('publicNotifPushLocalidades');
    if (!scope || !localitiesDiv) return;
    localitiesDiv.style.display = scope.value === 'localidades' ? 'block' : 'none';
}

function getPublicNotifPushOptionsFromForm() {
    const sendPush = document.getElementById('publicNotifSendPush');
    if (!sendPush || !sendPush.checked) {
        return { sendPush: false, alcance: 'todos', localidades: [] };
    }
    const alcance = document.getElementById('publicNotifPushScope')?.value || 'todos';
    let localidades = [];
    if (alcance === 'localidades') {
        localidades = Array.from(document.querySelectorAll('input[name="publicNotifLocalities"]:checked')).map(
            (cb) => cb.value
        );
        if (localidades.length === 0) {
            throw new Error('Seleccione al menos una localidad para el push');
        }
    }
    return { sendPush: true, alcance, localidades };
}

async function sendPublicBannerPush(notification, alcance, localidades) {
    if (!(await isFirebaseAdmin())) {
        showNotification('Debe iniciar sesión como administrador en la nube para enviar push', 'warning');
        return false;
    }
    const pushTitle = notification.title || 'Aviso del Ayuntamiento';
    const pushMessage = stripHtmlForPush(notification.message) || pushTitle;
    const pushType = mapPublicNotificationTypeToPush(notification.type);
    await enviarNotificacionPushConLocalidades(pushTitle, pushMessage, pushType, alcance, localidades);
    await guardarNotificacionApp(
        pushTitle,
        pushMessage,
        pushType,
        null,
        alcance === 'localidades' ? localidades : []
    );
    return true;
}

async function sendPublicBannerPushForId(notificationId) {
    const notification = publicNotifications.find((n) => n.id === notificationId);
    if (!notification) {
        showNotification('Aviso no encontrado', 'error');
        return;
    }
    if (
        !confirm(
            `¿Enviar notificación push del aviso "${notification.title}" a todos los usuarios registrados con notificaciones activas?`
        )
    ) {
        return;
    }
    try {
        await sendPublicBannerPush(notification, 'todos', []);
    } catch (err) {
        console.error('Error enviando push del aviso:', err);
        showNotification('No se pudo enviar la notificación push', 'error');
    }
}

async function savePublicNotification() {
    if (!(await isFirebaseAdmin())) {
        showNotification('Solo un administrador con sesión activa puede gestionar avisos públicos', 'warning');
        return;
    }

    const form = document.getElementById('publicNotificationForm');
    const formData = new FormData(form);
    const notificationId = formData.get('id');
    const messageHtml = getRichEditorContent();
    if (!messageHtml || messageHtml.trim() === '' || messageHtml === '<div><br></div>' || messageHtml === '<br>') {
        showNotification('Escriba el mensaje del aviso', 'error');
        return;
    }

    let pushOptions = { sendPush: false, alcance: 'todos', localidades: [] };
    try {
        pushOptions = getPublicNotifPushOptionsFromForm();
    } catch (err) {
        showNotification(err.message || 'Revise las opciones de push', 'error');
        return;
    }

    const notification = {
        id: notificationId || Date.now().toString(),
        type: formData.get('type'),
        title: formData.get('title'),
        message: messageHtml,
        startDate: formData.get('startDate'),
        endDate: formData.get('endDate') || null,
        priority: formData.get('priority'),
        active: formData.get('active') === 'on',
        createdAt: notificationId ? publicNotifications.find((n) => n.id === notificationId)?.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    if (notificationId) {
        const index = publicNotifications.findIndex((n) => n.id === notificationId);
        if (index !== -1) {
            publicNotifications[index] = notification;
        }
    } else {
        publicNotifications.push(notification);
    }

    savePublicNotifications();
    updatePublicNotificationsScroll();
    loadPublicNotificationsList();
    closePublicNotificationModal();

    showNotification(`Aviso ${notificationId ? 'actualizado' : 'creado'} correctamente`, 'success');

    if (pushOptions.sendPush) {
        try {
            await sendPublicBannerPush(notification, pushOptions.alcance, pushOptions.localidades);
        } catch (err) {
            console.error('Push del aviso público:', err);
            showNotification('Aviso guardado, pero falló el envío push', 'warning');
        }
    }
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
        
        showNotification(`Notificación ${notification.active ? 'activada' : 'desactivada'}`, 'success');
    }
}

function deletePublicNotification(notificationId) {
    if (confirm('¿Está seguro de que desea eliminar esta notificación?')) {
        publicNotifications = publicNotifications.filter(n => n.id !== notificationId);
        savePublicNotifications();
        updatePublicNotificationsScroll();
        loadPublicNotificationsList();
        showNotification('Notificación eliminada', 'success');
    }
}

function refreshPublicNotifications() {
    loadPublicNotifications();
    loadPublicNotificationsList();
    showNotification('Notificaciones actualizadas', 'success');
}

// Configurar modal de notificaciones públicas
function setupPublicNotificationModal() {
    const modal = document.getElementById('publicNotificationModal');
    const sendPush = document.getElementById('publicNotifSendPush');
    const pushOptions = document.getElementById('publicNotifPushOptions');
    if (sendPush && pushOptions) {
        sendPush.addEventListener('change', function () {
            pushOptions.style.display = sendPush.checked ? 'block' : 'none';
            if (!sendPush.checked) {
                togglePublicNotifPushLocalidades();
            }
        });
    }
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

// Login / registro: handleLogin y handleRegister (eventos del formulario). Sesión persistente: onAuthStateChanged.

// Función de logout
async function logout() {
    try {
        if (window.firebase && window.firebase.auth && firebase.auth().currentUser) {
            await firebase.auth().signOut();
        }
    } catch (e) {
        console.warn('signOut:', e);
    }
    currentUser = null;
    isAdmin = false;
    isSuperAdmin = false;
    localStorage.removeItem('currentUser');
    purgeLegacyLocalAdminStorage();
    
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

// Abrir panel de administración
async function openAdminPanel() {
    if (!isAdminSessionValid()) {
        let firebaseAdmin = false;
        try {
            firebaseAdmin = await isFirebaseAdmin();
        } catch (error) {
            console.warn('openAdminPanel isFirebaseAdmin:', error);
        }
        if (!firebaseAdmin) {
            showNotification('Debe iniciar sesión como administrador en la nube', 'warning');
            openModal('adminLoginModal');
            return;
        }
    }

    openModal('adminModal');
    updateAdminContent();

    try {
        await loadUsersFromFirestore();
    } catch (error) {
        console.warn('openAdminPanel loadUsersFromFirestore:', error);
    }

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
    loadAppointmentAvailabilitySettings();
    loadPublicNotificationsList();

    // Actualizar información del sistema para la pestaña de backup
    setTimeout(() => {
        updateSystemInfo();
    }, 500);
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

// Configuración de ITV
let itvConfig = {
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

// Cargar configuración de ITV
function loadItvConfig() {
    const saved = localStorage.getItem('itvConfig');
    if (saved) {
        itvConfig = JSON.parse(saved);
    }
}

// Guardar configuración de ITV
function saveItvConfig() {
    localStorage.setItem('itvConfig', JSON.stringify(itvConfig));
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
    if (itvConfig.documentos.length > 0) {
        // Mostrar el primer documento disponible
        window.open(itvConfig.documentos[0].url, '_blank');
    } else {
        alert('No hay documentos disponibles. Contacte con el administrador.');
    }
}

function viewItvPhoto() {
    if (itvConfig.fotos.length > 0) {
        // Mostrar la primera foto disponible
        window.open(itvConfig.fotos[0].url, '_blank');
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
    
    if (itvConfig.documentos.length > 0 || itvConfig.fotos.length > 0) {
        html += '<div class="itv-enlaces">';
        
        if (itvConfig.documentos.length > 0) {
            html += `<a href="#" class="btn btn-outline" onclick="viewItvDocument()">📋 Ver Documento</a>`;
        }
        
        if (itvConfig.fotos.length > 0) {
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

function openTransporteModal() {
    openTransporteManager();
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

function openTransporteLineaModal() {
    addTransporteLinea();
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

function editUser(email) {
    alert(`Función de editar usuario: ${email}`);
}

function editAdmin(email) {
    alert(`Función de editar administrador: ${email}`);
}

/** @deprecated usar deletePanelUser */
function deleteUser(email) {
    return deletePanelUser(email);
}

/** @deprecated usar deletePanelAdmin */
function deleteAdmin(email) {
    return deletePanelAdmin(email);
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

// ===== EDITOR DE TEXTO ENRIQUECIDO =====

// Formatear texto en el editor
function formatText(command, value = null) {
    const editor = document.getElementById('notificationMessage');
    
    if (!editor) {
        console.error('Editor no encontrado');
        return;
    }
    
    // Asegurar que el editor tenga foco
    editor.focus();
    
    try {
        if (value) {
            document.execCommand(command, false, value);
        } else {
            document.execCommand(command, false, null);
        }
        
        // Actualizar vista previa
        updateMessagePreview();
        
        // Actualizar estado de botones
        updateToolbarButtons();
        
        console.log(`✅ Formato aplicado: ${command}${value ? ' = ' + value : ''}`);
        
    } catch (error) {
        console.error('❌ Error aplicando formato:', error);
    }
}

// Limpiar formato del texto
function clearFormatting() {
    const editor = document.getElementById('notificationMessage');
    
    if (!editor) {
        console.error('Editor no encontrado');
        return;
    }
    
    try {
        // Seleccionar todo el contenido
        const range = document.createRange();
        range.selectNodeContents(editor);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        
        // Limpiar formato
        document.execCommand('removeFormat', false, null);
        
        // Limpiar selección
        selection.removeAllRanges();
        
        // Actualizar vista previa
        updateMessagePreview();
        
        // Actualizar estado de botones
        updateToolbarButtons();
        
        console.log('✅ Formato limpiado');
        
    } catch (error) {
        console.error('❌ Error limpiando formato:', error);
    }
}

// Actualizar vista previa del mensaje
function updateMessagePreview() {
    const editor = document.getElementById('notificationMessage');
    const preview = document.getElementById('messagePreview');
    
    if (!editor || !preview) {
        return;
    }
    
    // Copiar contenido HTML al preview
    preview.innerHTML = editor.innerHTML;
    
    // Si está vacío, mostrar placeholder
    if (!editor.textContent.trim()) {
        preview.innerHTML = '<em style="color: #6c757d;">Vista previa del mensaje...</em>';
    }
}

// Actualizar estado de botones de la barra de herramientas
function updateToolbarButtons() {
    const editor = document.getElementById('notificationMessage');
    
    if (!editor) {
        return;
    }
    
    // Verificar estado de formato
    const isBold = document.queryCommandState('bold');
    const isItalic = document.queryCommandState('italic');
    const isUnderline = document.queryCommandState('underline');
    
    // Actualizar botones
    updateButtonState('bold', isBold);
    updateButtonState('italic', isItalic);
    updateButtonState('underline', isUnderline);
}

// Actualizar estado de un botón
function updateButtonState(command, isActive) {
    const buttons = document.querySelectorAll(`[onclick*="${command}"]`);
    buttons.forEach(button => {
        if (isActive) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });
}

// Configurar eventos del editor
function setupRichEditor() {
    const editor = document.getElementById('notificationMessage');
    
    if (!editor) {
        return;
    }
    
    // Evento de entrada de texto
    editor.addEventListener('input', function() {
        updateMessagePreview();
        updateToolbarButtons();
    });
    
    // Evento de selección
    editor.addEventListener('mouseup', function() {
        updateToolbarButtons();
    });
    
    // Evento de teclado
    editor.addEventListener('keyup', function() {
        updateToolbarButtons();
    });
    
    // Evento de foco
    editor.addEventListener('focus', function() {
        updateToolbarButtons();
    });
    
    // Prevenir pegado de HTML no deseado
    editor.addEventListener('paste', function(e) {
        e.preventDefault();
        
        // Obtener texto plano
        const text = (e.clipboardData || window.clipboardData).getData('text/plain');
        
        // Insertar texto plano
        document.execCommand('insertText', false, text);
        
        updateMessagePreview();
    });
    
    console.log('✅ Editor de texto enriquecido configurado');
}

// Obtener contenido HTML del editor
function getRichEditorContent() {
    const editor = document.getElementById('notificationMessage');
    
    if (!editor) {
        return '';
    }
    
    return editor.innerHTML;
}

// Establecer contenido HTML en el editor
function setRichEditorContent(html) {
    const editor = document.getElementById('notificationMessage');
    
    if (!editor) {
        return;
    }
    
    editor.innerHTML = html;
    updateMessagePreview();
    updateToolbarButtons();
}

// Limpiar editor
function clearRichEditor() {
    const editor = document.getElementById('notificationMessage');
    
    if (!editor) {
        return;
    }
    
    editor.innerHTML = '';
    updateMessagePreview();
    updateToolbarButtons();
}

// ===== SISTEMA DE ACORDEÓN DESPLEGABLE =====

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
    }
    
    console.log(`📂 Acordeón ${sectionId} ${isActive ? 'cerrado' : 'abierto'}`);
}

// Cargar contenido inicial de Cobreros
function loadCobrerosContent() {
    // Cargar datos desde localStorage si existen
    const savedData = localStorage.getItem('culturaOcioData');
    if (savedData) {
        culturaOcioData = JSON.parse(savedData);
    }
    
    // Si no hay datos guardados, usar datos por defecto
    if (!savedData || Object.values(culturaOcioData).every(section => section.length === 0)) {
        const cobrerosData = {
        naturaleza: [
            {
                title: "🌊 Cascadas de Sotillo",
                description: "Una de las rutas más populares con cascadas de agua cristalina en un entorno boscoso. Dificultad media, duración 2-3 horas.",
                image: "images/cascadas-sotillo.jpg",
                links: [
                    { text: "📋 Guía de Ruta", url: "#", type: "pdf" },
                    { text: "🗺️ Mapa Interactivo", url: "#", type: "external" }
                ]
            },
            {
                title: "🏞️ Lago de Sanabria",
                description: "El lago glaciar más grande de España. Superficie de 368 hectáreas y hasta 53 metros de profundidad. Ideal para baño y kayak.",
                image: "images/lago-sanabria.jpg",
                links: [
                    { text: "📋 Información Turística", url: "#", type: "pdf" },
                    { text: "🏊 Actividades Acuáticas", url: "#", type: "external" }
                ]
            },
            {
                title: "🥾 Ruta de las Cascadas de Ribadelago",
                description: "Cerca del famoso Lago de Sanabria, múltiples saltos de agua en una ruta circular muy recomendada.",
                image: "images/cascadas-ribadelago.jpg",
                links: [
                    { text: "📋 Guía Completa", url: "#", type: "pdf" },
                    { text: "📸 Galería de Fotos", url: "#", type: "external" }
                ]
            },
            {
                title: "🌲 Laguna de los Peces",
                description: "Laguna de origen glaciar con acceso desde Cobreros. Ideal para familias y senderistas principiantes.",
                image: "images/laguna-peces.jpg",
                links: [
                    { text: "📋 Ruta Familiar", url: "#", type: "pdf" },
                    { text: "🗺️ Acceso y Parking", url: "#", type: "external" }
                ]
            },
            {
                title: "🌊 Cascadas de Aguas Cernidas",
                description: "Una de las cascadas más impresionantes de Sanabria. Ruta desde Terroso: 4-5 km ida, dificultad media-alta. Cascada escalonada de 20-25 metros de altura en entorno boscoso de roble y castaño.",
                image: "images/cascadas-aguas-cernidas.jpg",
                links: [
                    { text: "📋 Ruta desde Terroso", url: "#", type: "pdf" },
                    { text: "🗺️ Mapa de Acceso", url: "#", type: "external" },
                    { text: "📸 Galería de Fotos", url: "#", type: "external" }
                ]
            }
        ],
        patrimonio: [
            {
                title: "⛪ Iglesia de San Martín",
                description: "Iglesia del siglo XVI con arquitectura tradicional sanabresa. Destaca su retablo barroco y campanario de piedra.",
                image: "images/iglesia-san-martin.jpg",
                links: [
                    { text: "📋 Historia Detallada", url: "#", type: "pdf" },
                    { text: "🕒 Horarios de Visita", url: "#", type: "external" }
                ]
            },
            {
                title: "🌉 Puentes Medievales",
                description: "Varios puentes de piedra medievales que cruzan los arroyos de la zona, testimonio de la arquitectura tradicional.",
                image: "images/puentes-medievales.jpg",
                links: [
                    { text: "📋 Ruta de Puentes", url: "#", type: "pdf" },
                    { text: "📸 Galería Histórica", url: "#", type: "external" }
                ]
            },
            {
                title: "🏭 Molinos de Agua",
                description: "Molinos tradicionales restaurados que muestran la importancia del agua en la vida rural de Cobreros.",
                image: "images/molinos-agua.jpg",
                links: [
                    { text: "📋 Historia de los Molinos", url: "#", type: "pdf" },
                    { text: "🔧 Proceso de Restauración", url: "#", type: "external" }
                ]
            },
            {
                title: "🏘️ Arquitectura Tradicional",
                description: "Casas de piedra con tejados de pizarra, balconadas de madera y corrales que caracterizan la arquitectura sanabresa.",
                image: "images/arquitectura-tradicional.jpg",
                links: [
                    { text: "📋 Guía Arquitectónica", url: "#", type: "pdf" },
                    { text: "🏠 Ruta de Casas Históricas", url: "#", type: "external" }
                ]
            }
        ],
        gastronomia: [
            {
                title: "🍄 Recolección de Setas",
                description: "Cobreros es famoso por sus setas. Temporada de otoño con especies como boletus, níscalos y setas de cardo.",
                image: "images/setas-cobreros.jpg",
                links: [
                    { text: "📋 Guía de Setas", url: "https://www.diputaciondezamora.es/opencms/export/sites/dipu-zamora/.Archivos/documentos/servicios/agro-ganaderia-y-servicios-forestales/Guia-de-la-Unidad-de-Gestion-Micologica-de-Sanabria-y-La-Carballeda.pdf", type: "pdf" },
                    { text: "📘 Guía del Recolector", url: "https://www.diputaciondezamora.es/opencms/export/sites/dipu-zamora/.Archivos/documentos/diputacion/areas-gestion/agricultura-ganaderia-zonas-verdes/Guia-del-Recolector-de-setas-PROYECTO-MYASRC.pdf", type: "pdf" }
                ]
            },
            {
                title: "🌰 Castañas de Sanabria",
                description: "Las castañas de la zona son especialmente apreciadas. Temporada de recolección en octubre y noviembre.",
                image: "images/castanas-sanabria.jpg",
                links: [
                    { text: "📋 Recetas Tradicionales", url: "#", type: "pdf" },
                    { text: "🌰 Fiesta de la Castaña", url: "#", type: "external" }
                ]
            },
            {
                title: "🧀 Quesos Artesanales",
                description: "Quesos de cabra y oveja elaborados de forma tradicional en las granjas locales de la comarca.",
                image: "images/quesos-artesanales.jpg",
                links: [
                    { text: "📋 Variedades de Queso", url: "#", type: "pdf" },
                    { text: "🏪 Productores Locales", url: "#", type: "external" }
                ]
            },
            {
                title: "🍷 Vinos de la Tierra",
                description: "Vinos locales de la denominación de origen que acompañan perfectamente la gastronomía de montaña.",
                image: "images/vinos-tierra.jpg",
                links: [
                    { text: "📋 Cata de Vinos", url: "#", type: "pdf" },
                    { text: "🍷 Bodegas de la Zona", url: "#", type: "external" }
                ]
            }
        ],
        eventos: [
            {
                title: "🎭 Fiestas Patronales",
                description: "Fiestas en honor a San Martín con procesiones, verbenas y actividades tradicionales en noviembre.",
                image: "images/fiestas-patronales.jpg",
                links: [
                    { text: "📋 Programa de Fiestas", url: "#", type: "pdf" },
                    { text: "📅 Calendario de Eventos", url: "#", type: "external" }
                ]
            },
            {
                title: "🌰 Fiesta de la Castaña",
                description: "Celebración otoñal con degustación de castañas asadas, música tradicional y actividades familiares.",
                image: "images/fiesta-castana.jpg",
                links: [
                    { text: "📋 Actividades", url: "#", type: "pdf" },
                    { text: "🍂 Tradiciones Otoñales", url: "#", type: "external" }
                ]
            },
            {
                title: "🥾 Jornadas de Senderismo",
                description: "Rutas guiadas organizadas por el ayuntamiento para descubrir los rincones más bellos de Cobreros.",
                image: "images/jornadas-senderismo.jpg",
                links: [
                    { text: "📋 Rutas Programadas", url: "#", type: "pdf" },
                    { text: "👥 Inscripciones", url: "#", type: "external" }
                ]
            },
            {
                title: "🎨 Mercado Artesanal",
                description: "Mercado de productos locales, artesanía y gastronomía tradicional que se celebra en verano.",
                image: "images/mercado-artesanal.jpg",
                links: [
                    { text: "📋 Artesanos Participantes", url: "#", type: "pdf" },
                    { text: "🛍️ Productos Locales", url: "#", type: "external" }
                ]
            }
        ],
        cercanos: [
            {
                title: "🏰 Puebla de Sanabria",
                description: "Villa medieval con castillo del siglo XV, iglesias históricas y monasterio. Conjunto histórico-artístico de gran belleza arquitectónica. Destaca su castillo de los Condes de Benavente y la iglesia de Nuestra Señora del Azogue.",
                image: "images/puebla-sanabria.jpg",
                links: [
                    { text: "📋 Guía Turística", url: "#", type: "pdf" },
                    { text: "🏰 Historia del Castillo", url: "#", type: "external" },
                    { text: "⛪ Iglesias y Monasterio", url: "#", type: "external" }
                ]
            },
            {
                title: "🎭 Museo de Gigantes y Cabezudos",
                description: "Museo dedicado a la tradición de los gigantes y cabezudos de Puebla de Sanabria. Exposición de figuras tradicionales, trajes históricos y documentación sobre las fiestas populares. Ubicado en el casco histórico de la villa.",
                image: "images/museo-gigantes-cabezudos.jpg",
                links: [
                    { text: "📋 Historia de la Tradición", url: "#", type: "pdf" },
                    { text: "🎭 Colección de Figuras", url: "#", type: "external" },
                    { text: "📅 Horarios de Visita", url: "#", type: "external" }
                ]
            },
            {
                title: "🍄 Centro de Interpretación Micológico de Ungilde",
                description: "Centro especializado en la micología de la zona de Sanabria. Exposiciones sobre setas comestibles y tóxicas, talleres de identificación, rutas micológicas guiadas y actividades educativas sobre el mundo de los hongos.",
                image: "images/centro-micologico-ungilde.jpg",
                links: [
                    { text: "📋 Guía de Setas de la Zona", url: "#", type: "pdf" },
                    { text: "🍄 Talleres de Identificación", url: "#", type: "external" },
                    { text: "🥾 Rutas Micológicas", url: "#", type: "external" }
                ]
            },
            {
                title: "🌉 Mercado del Puente",
                description: "Mercado tradicional que se celebra en el Puente de Sanabria todos los lunes del año. Se vende artesanía, frutas y verduras, utensilios para la casa, ropa y calzado. Mercado semanal con productos locales y tradicionales de la comarca.",
                image: "images/mercado-puente.jpg",
                links: [
                    { text: "📋 Calendario de Mercados", url: "#", type: "pdf" },
                    { text: "🛍️ Productos Locales", url: "#", type: "external" },
                    { text: "📅 Próximas Fechas", url: "#", type: "external" }
                ]
            },
            {
                title: "🏞️ Casa del Parque Natural del Lago de Sanabria y Sierras Segundera y de Porto",
                description: "Centro de interpretación del Parque Natural del Lago de Sanabria y Sierras Segundera y de Porto. Exposiciones sobre la geología, flora y fauna del parque. Información sobre rutas y actividades. Ubicada en San Martín de Castañeda.",
                image: "images/casa-parque-natural.jpg",
                links: [
                    { text: "📋 Horarios y Visitas", url: "#", type: "pdf" },
                    { text: "🌿 Exposiciones", url: "#", type: "external" },
                    { text: "🗺️ Información del Parque", url: "#", type: "external" }
                ]
            },
            {
                title: "🐺 Centro del Lobo Ibérico",
                description: "Centro de interpretación del lobo ibérico en Robledo de Sanabria. Observación de lobos en semi-libertad, exposiciones educativas y actividades de sensibilización sobre la conservación de esta especie emblemática.",
                image: "images/centro-lobo-iberico.jpg",
                links: [
                    { text: "📋 Horarios y Tarifas", url: "#", type: "pdf" },
                    { text: "🐺 Actividades Educativas", url: "#", type: "external" },
                    { text: "📅 Reservas", url: "#", type: "external" }
                ]
            },
            {
                title: "🏛️ Monasterio de San Martín de Castañeda",
                description: "Monasterio cisterciense del siglo X con vistas espectaculares al Lago de Sanabria. Arquitectura románica y gótica. Centro de interpretación del parque natural y punto de partida de rutas de senderismo.",
                image: "images/monasterio-san-martin.jpg",
                links: [
                    { text: "📋 Historia del Monasterio", url: "#", type: "pdf" },
                    { text: "⛪ Arquitectura Religiosa", url: "#", type: "external" },
                    { text: "🥾 Rutas desde el Monasterio", url: "#", type: "external" }
                ]
            },
            {
                title: "🌊 La Alcobilla de Rábano",
                description: "Pueblo tradicional de Sanabria con arquitectura típica de la zona. Casas de piedra, tejados de pizarra y balconadas de madera. Entorno natural privilegiado y tranquilidad rural auténtica.",
                image: "images/alcobilla-rabano.jpg",
                links: [
                    { text: "📋 Arquitectura Tradicional", url: "#", type: "pdf" },
                    { text: "🏘️ Casas Históricas", url: "#", type: "external" },
                    { text: "🌿 Entorno Natural", url: "#", type: "external" }
                ]
            },
            {
                title: "🌲 Ruta del Tejedelo desde Requejo",
                description: "Ruta de senderismo que parte desde Requejo hacia el bosque de tejos milenarios del Tejedelo. Bosque único en España con tejos de más de 1000 años. Dificultad media, duración 4-5 horas.",
                image: "images/ruta-tejedelo.jpg",
                links: [
                    { text: "📋 Guía de la Ruta", url: "#", type: "pdf" },
                    { text: "🌲 Bosque de Tejos", url: "#", type: "external" },
                    { text: "🗺️ Mapa de Acceso", url: "#", type: "external" }
                ]
            }
        ]
    };
    
        // Asignar datos por defecto
        culturaOcioData = cobrerosData;
        
        // Guardar datos por defecto en localStorage
        localStorage.setItem('culturaOcioData', JSON.stringify(culturaOcioData));
    }
    
    // Normalizar enlaces actualizados aunque existan datos antiguos en localStorage
    enforceMushroomGuideLinks();

    // Renderizar cada sección
    Object.keys(culturaOcioData).forEach(section => {
        renderAccordionSection(section, culturaOcioData[section]);
    });
    
    console.log('✅ Contenido de Cobreros cargado');
}

function enforceMushroomGuideLinks() {
    try {
        if (!culturaOcioData || !Array.isArray(culturaOcioData.gastronomia)) {
            return;
        }
        let changed = false;
        const guiaSetasUrl =
            'https://www.diputaciondezamora.es/opencms/export/sites/dipu-zamora/.Archivos/documentos/servicios/agro-ganaderia-y-servicios-forestales/Guia-de-la-Unidad-de-Gestion-Micologica-de-Sanabria-y-La-Carballeda.pdf';
        const guiaRecolectorUrl =
            'https://www.diputaciondezamora.es/opencms/export/sites/dipu-zamora/.Archivos/documentos/diputacion/areas-gestion/agricultura-ganaderia-zonas-verdes/Guia-del-Recolector-de-setas-PROYECTO-MYASRC.pdf';

        culturaOcioData.gastronomia.forEach((item) => {
            if (!item || item.title !== '🍄 Recolección de Setas' || !Array.isArray(item.links)) {
                return;
            }

            item.links.forEach((link) => {
                if (!link || typeof link.text !== 'string') return;
                if (link.text.trim() === '📋 Guía de Setas') {
                    if (link.url !== guiaSetasUrl || link.type !== 'pdf') {
                        link.url = guiaSetasUrl;
                        link.type = 'pdf';
                        changed = true;
                    }
                }
                if (link.text.trim() === '🗓️ Calendario de Recolección' || link.text.trim() === '📘 Guía del Recolector') {
                    if (
                        link.text !== '📘 Guía del Recolector' ||
                        link.url !== guiaRecolectorUrl ||
                        link.type !== 'pdf'
                    ) {
                        link.text = '📘 Guía del Recolector';
                        link.url = guiaRecolectorUrl;
                        link.type = 'pdf';
                        changed = true;
                    }
                }
            });
        });

        if (changed) {
            localStorage.setItem('culturaOcioData', JSON.stringify(culturaOcioData));
            console.log('✅ Enlaces micológicos actualizados en datos guardados');
        }
    } catch (error) {
        console.warn('No se pudieron ajustar enlaces micológicos:', error);
    }
}

// Renderizar una sección del acordeón
function renderAccordionSection(sectionId, items) {
    const container = document.getElementById(`${sectionId}Items`);
    if (!container) return;
    
    if (items.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #6c757d; padding: 20px;">No hay elementos en esta sección</p>';
        return;
    }
    
    container.innerHTML = items.map(item => `
        <div class="accordion-item-card">
            ${item.image ? `<img src="${item.image}" alt="${item.title}" class="item-image" onerror="this.style.display='none'">` : ''}
            <h4>${item.title}</h4>
            <p>${item.description}</p>
            ${item.links && item.links.length > 0 ? `
                <div class="item-links">
                    ${item.links.map(link => `
                        <a href="${link.url}" class="item-link ${link.type || 'normal'}" 
                           ${link.type === 'external' ? 'target="_blank"' : ''}
                           onclick="handleCulturaLink('${link.type || 'normal'}', '${link.url}', '${item.id}')">
                            ${link.text}
                        </a>
                    `).join('')}
                </div>
            ` : ''}
            ${item.externalLink ? `
                <div class="item-links">
                    <a href="${item.externalLink}" class="item-link external" target="_blank"
                       onclick="handleCulturaLink('external', '${item.externalLink}', '${item.id}')">
                        🌐 Ver más información
                    </a>
                </div>
            ` : ''}
        </div>
    `).join('');
}

// ===== SISTEMA DE PERSISTENCIA COMPLETA =====

// Asegurar persistencia completa de todos los datos
async function ensureCompletePersistence() {
    try {
        console.log('🔄 Verificando persistencia completa...');
        
        // 1. Verificar y migrar usuarios a Firestore si es necesario
        await migrateUsersToFirestore();
        
        // 2. Cargar primero desde Firestore para evitar sobrescribir
        // datos recientes con caché local antigua al abrir sesión admin.
        await refreshLatestPublicDataFromFirestore('ensureCompletePersistence');
        
        // 3. Verificar integridad de datos
        const isDataValid = verifyDataIntegrity();
        if (!isDataValid) {
            console.log('⚠️ Reparando datos corruptos...');
            repairCorruptedData();
        }
        
        // 4. Backup automático inicial
        setTimeout(() => {
            if (window.firebase && window.firebase.firestore()) {
                backupContentToFirestore();
            }
        }, 2000);
        
        // 5. Configurar sincronización automática
        setupAutomaticSync();
        
        console.log('✅ Persistencia completa verificada');
        
    } catch (error) {
        console.error('❌ Error en persistencia completa:', error);
    }
}

// Sincronizar datos locales con Firestore
async function syncLocalDataToFirestore() {
    try {
        if (!window.firebase || !window.firebase.firestore()) {
            console.log('⚠️ Firebase no disponible para sincronización');
            return;
        }
        if (!(await isFirebaseAdmin())) {
            console.log('⚠️ Sincronización bandos/noticias/eventos omitida: solo administrador Firebase');
            return;
        }

        const db = window.firebase.firestore();
        
        // Sincronizar bandos
        if (bandos.length > 0) {
            await db.collection('bandos').doc('data').set({
                bandos: bandos,
                lastUpdate: new Date(),
                source: 'WEB_SYNC'
            });
            console.log('✅ Bandos sincronizados con Firestore');
        }
        
        // Sincronizar noticias
        if (news.length > 0) {
            await db.collection('noticias').doc('data').set({
                news: news,
                lastUpdate: new Date(),
                source: 'WEB_SYNC'
            });
            console.log('✅ Noticias sincronizadas con Firestore');
        }
        
        // Sincronizar eventos
        if (events.length > 0) {
            await db.collection('eventos').doc('data').set({
                events: events,
                lastUpdate: new Date(),
                source: 'WEB_SYNC'
            });
            console.log('✅ Eventos sincronizados con Firestore');
        }
        
        // Sincronizar configuraciones
        const configData = {
            culturaOcioConfig: localStorage.getItem('culturaOcioConfig'),
            appointmentSettings: localStorage.getItem('appointmentSettings'),
            appointmentAvailability: localStorage.getItem('appointmentAvailability')
                ? JSON.parse(localStorage.getItem('appointmentAvailability'))
                : null,
            servicios: localStorage.getItem('servicios'),
            seccionesConfig: localStorage.getItem('seccionesConfig'),
            consultorioConfig: localStorage.getItem('consultorioConfig'),
            itvConfig: localStorage.getItem('itvConfig'),
            telefonosInteresConfig: localStorage.getItem('telefonosInteresConfig'),
            transporteConfig: localStorage.getItem('transporteConfig'),
            lastUpdate: new Date(),
            source: 'WEB_SYNC'
        };
        
        await db.collection('configuraciones').doc('data').set(configData);
        console.log('✅ Configuraciones sincronizadas con Firestore');
        
    } catch (error) {
        console.error('❌ Error sincronizando con Firestore:', error);
    }
}

// Configurar sincronización automática
function setupAutomaticSync() {
    // Sincronizar cada 5 minutos
    setInterval(async () => {
        if (window.firebase && window.firebase.firestore()) {
            try {
                await syncLocalDataToFirestore();
                console.log('🔄 Sincronización automática completada');
            } catch (error) {
                console.error('❌ Error en sincronización automática:', error);
            }
        }
    }, 5 * 60 * 1000); // 5 minutos
    
    // Sincronizar al cerrar la ventana
    window.addEventListener('beforeunload', async () => {
        if (window.firebase && window.firebase.firestore()) {
            try {
                await syncLocalDataToFirestore();
                console.log('🔄 Sincronización al cerrar completada');
            } catch (error) {
                console.error('❌ Error en sincronización al cerrar:', error);
            }
        }
    });
}

// ===== SISTEMA DE NOTIFICACIONES PARA APP MÓVIL =====

// Guardar notificación en la colección para la app móvil
async function guardarNotificacionApp(titulo, mensaje, tipo, documentUrl = null, targetPueblos = []) {
    try {
        if (!window.firebase || !window.firebase.firestore()) {
            console.log('⚠️ Firebase no disponible para guardar notificación de app');
            return;
        }
        if (!(await isFirebaseAdmin())) {
            console.log('⚠️ No se guarda notificación en Firestore: se requiere administrador Firebase');
            return;
        }

        const db = window.firebase.firestore();
        
        const notificationData = {
            title: titulo,
            message: mensaje,
            type: tipo,
            documentUrl: documentUrl,
            targetPueblos: targetPueblos,
            timestamp: new Date(),
            sentFrom: 'WEB_AYUNTAMIENTO',
            sentTo: 'ALL'
        };
        
        await db.collection('notifications').add(notificationData);
        console.log('✅ Notificación guardada para app móvil');
        
    } catch (error) {
        console.error('❌ Error guardando notificación para app:', error);
    }
}

// ===== SISTEMA DE BACKUP Y PERSISTENCIA MEJORADA =====

// Backup automático de bandos y noticias a Firestore
async function backupContentToFirestore() {
    try {
        if (!window.firebase || !window.firebase.firestore()) {
            console.log('⚠️ Firebase no disponible para backup');
            return;
        }
        if (!(await isFirebaseAdmin())) {
            console.log('⚠️ Backup a Firestore omitido: no hay sesión de administrador Firebase');
            return;
        }

        const db = window.firebase.firestore();
        
        // Backup de bandos
        const bandosData = {
            bandos: bandos,
            lastBackup: new Date(),
            totalCount: bandos.length,
            source: 'WEB_BACKUP'
        };
        
        await db.collection('backups').doc('bandos').set(bandosData);
        console.log('✅ Backup de bandos completado');
        
        // Backup de noticias
        const newsData = {
            news: news,
            lastBackup: new Date(),
            totalCount: news.length,
            source: 'WEB_BACKUP'
        };
        
        await db.collection('backups').doc('noticias').set(newsData);
        console.log('✅ Backup de noticias completado');
        
        // Backup de eventos
        const eventsData = {
            events: events,
            lastBackup: new Date(),
            totalCount: events.length,
            source: 'WEB_BACKUP'
        };
        
        await db.collection('backups').doc('eventos').set(eventsData);
        console.log('✅ Backup de eventos completado');
        
        // Backup de configuraciones
        const configData = {
            appointmentsEnabled: appointmentsEnabled,
            appointmentAvailability: localStorage.getItem('appointmentAvailability') ? JSON.parse(localStorage.getItem('appointmentAvailability')) : {},
            culturaOcioConfig: localStorage.getItem('culturaOcioConfig') ? JSON.parse(localStorage.getItem('culturaOcioConfig')) : {},
            servicios: localStorage.getItem('servicios') ? JSON.parse(localStorage.getItem('servicios')) : {},
            seccionesConfig: localStorage.getItem('seccionesConfig') ? JSON.parse(localStorage.getItem('seccionesConfig')) : {},
            consultorioConfig: localStorage.getItem('consultorioConfig') ? JSON.parse(localStorage.getItem('consultorioConfig')) : {},
            itvConfig: localStorage.getItem('itvConfig') ? JSON.parse(localStorage.getItem('itvConfig')) : {},
            telefonosInteresConfig: localStorage.getItem('telefonosInteresConfig') ? JSON.parse(localStorage.getItem('telefonosInteresConfig')) : {},
            transporteConfig: localStorage.getItem('transporteConfig') ? JSON.parse(localStorage.getItem('transporteConfig')) : {},
            lastBackup: new Date(),
            source: 'WEB_BACKUP'
        };
        
        await db.collection('backups').doc('configuraciones').set(configData);
        console.log('✅ Backup de configuraciones completado');
        
    } catch (error) {
        console.error('❌ Error en backup automático:', error);
    }
}

// Restaurar contenido desde Firestore
async function restoreContentFromFirestore() {
    try {
        if (!window.firebase || !window.firebase.firestore()) {
            console.log('⚠️ Firebase no disponible para restauración');
            return;
        }
        if (!(await isFirebaseAdmin())) {
            console.log('⚠️ Restauración desde backups omitida: solo administradores Firebase');
            return;
        }

        const db = window.firebase.firestore();
        
        // Restaurar bandos
        const bandosSnapshot = await db.collection('backups').doc('bandos').get();
        if (bandosSnapshot.exists) {
            const bandosData = bandosSnapshot.data();
            if (bandosData.bandos && bandosData.bandos.length > 0) {
                bandos = bandosData.bandos;
                localStorage.setItem('bandos', JSON.stringify(bandos));
                console.log('✅ Bandos restaurados desde Firestore');
            }
        }
        
        // Restaurar noticias
        const newsSnapshot = await db.collection('backups').doc('noticias').get();
        if (newsSnapshot.exists) {
            const newsData = newsSnapshot.data();
            if (newsData.news && newsData.news.length > 0) {
                news = newsData.news;
                localStorage.setItem('news', JSON.stringify(news));
                console.log('✅ Noticias restauradas desde Firestore');
            }
        }
        
        // Restaurar eventos
        const eventsSnapshot = await db.collection('backups').doc('eventos').get();
        if (eventsSnapshot.exists) {
            const eventsData = eventsSnapshot.data();
            if (eventsData.events && eventsData.events.length > 0) {
                events = eventsData.events;
                localStorage.setItem('events', JSON.stringify(events));
                console.log('✅ Eventos restaurados desde Firestore');
            }
        }
        
        // Restaurar configuraciones
        const configSnapshot = await db.collection('backups').doc('configuraciones').get();
        if (configSnapshot.exists) {
            const configData = configSnapshot.data();
            if (configData.appointmentsEnabled !== undefined) {
                appointmentsEnabled = configData.appointmentsEnabled;
                localStorage.setItem('appointmentSettings', JSON.stringify({ enabled: appointmentsEnabled }));
                console.log('✅ Configuraciones restauradas desde Firestore');
            }
            if (configData.appointmentAvailability) {
                localStorage.setItem('appointmentAvailability', JSON.stringify(configData.appointmentAvailability));
                appointmentAvailability = normalizeAppointmentAvailability(configData.appointmentAvailability);
            }
            if (configData.servicios) {
                localStorage.setItem('servicios', JSON.stringify(configData.servicios));
            }
            if (configData.seccionesConfig) {
                localStorage.setItem('seccionesConfig', JSON.stringify(configData.seccionesConfig));
            }
            if (configData.consultorioConfig) {
                localStorage.setItem('consultorioConfig', JSON.stringify(configData.consultorioConfig));
            }
            if (configData.itvConfig) {
                localStorage.setItem('itvConfig', JSON.stringify(configData.itvConfig));
            }
            if (configData.telefonosInteresConfig) {
                localStorage.setItem('telefonosInteresConfig', JSON.stringify(configData.telefonosInteresConfig));
            }
            if (configData.transporteConfig) {
                localStorage.setItem('transporteConfig', JSON.stringify(configData.transporteConfig));
            }
        }
        
        // Actualizar contenido
        loadAppointmentAvailabilitySettings();
        updateContent();
        updateCulturaOcioSection();
        
    } catch (error) {
        console.error('❌ Error restaurando desde Firestore:', error);
    }
}

// Backup completo de localStorage
async function backupLocalStorageToFirestore() {
    try {
        if (_applyingRemoteFirestoreSync) {
            return;
        }
        if (!window.firebase || !window.firebase.firestore()) {
            console.log('⚠️ Firebase no disponible para backup completo');
            return;
        }
        if (!(await isFirebaseAdmin())) {
            return;
        }

        const db = window.firebase.firestore();
        const backupData = {};
        
        // Recopilar todos los datos importantes
        const keysToBackup = [
            'users', 'bandos', 'news', 'events', 'notifications', 
            'administrators', 'documents', 'quickAccess', 'publicNotifications',
            'appointmentSettings', 'appointmentAvailability', 'culturaOcioConfig', 'servicios',
            'seccionesConfig', 'consultorioConfig', 'itvConfig',
            'telefonosInteresConfig', 'transporteConfig'
        ];
        
        keysToBackup.forEach(key => {
            const data = localStorage.getItem(key);
            if (data) {
                backupData[key] = JSON.parse(data);
            }
        });
        
        // Añadir metadatos del backup
        backupData.metadata = {
            timestamp: new Date(),
            userAgent: navigator.userAgent,
            totalKeys: Object.keys(backupData).length,
            source: 'COMPLETE_BACKUP'
        };

        backupData._syncUpdatedAt = firebase.firestore.FieldValue.serverTimestamp();
        
        // Guardar backup completo
        await db.collection('backups').doc('localStorage_completo').set(backupData);
        console.log('✅ Backup completo de localStorage realizado');
        
        return true;
        
    } catch (error) {
        console.error('❌ Error en backup completo:', error);
        return false;
    }
}

let _firestoreBackupSyncUnsubscribe = null;

/**
 * Escucha cambios en Firestore del backup completo (solo administrador Firebase; reglas backups).
 */
function setupFirestoreRealtimeSync() {
    try {
        if (!window.firebase || !window.firebase.firestore || !window.firebase.auth) {
            return;
        }
        const attachIfAdmin = async () => {
            if (_firestoreBackupSyncUnsubscribe) {
                _firestoreBackupSyncUnsubscribe();
                _firestoreBackupSyncUnsubscribe = null;
            }
            if (!(await isFirebaseAdmin())) {
                return;
            }
            const db = window.firebase.firestore();
            _firestoreBackupSyncUnsubscribe = db.collection('backups').doc('localStorage_completo').onSnapshot(
                { includeMetadataChanges: true },
                (snapshot) => {
                    if (!snapshot.exists) {
                        return;
                    }
                    if (snapshot.metadata.hasPendingWrites) {
                        return;
                    }
                    const data = snapshot.data();
                    if (!data) {
                        return;
                    }
                    let remoteMs = 0;
                    if (data._syncUpdatedAt && typeof data._syncUpdatedAt.toMillis === 'function') {
                        remoteMs = data._syncUpdatedAt.toMillis();
                    } else if (data.metadata && data.metadata.timestamp) {
                        const ts = data.metadata.timestamp;
                        if (ts && typeof ts.toMillis === 'function') {
                            remoteMs = ts.toMillis();
                        }
                    }
                    if (remoteMs && remoteMs <= _lastRemoteFirestoreSyncMs) {
                        return;
                    }
                    applyRemoteFirestoreBackupPayload(data);
                    if (remoteMs) {
                        _lastRemoteFirestoreSyncMs = remoteMs;
                    }
                },
                (err) => console.warn('Firestore sync:', err)
            );
        };
        firebase.auth().onAuthStateChanged(() => {
            attachIfAdmin();
        });
    } catch (e) {
        console.warn('No se pudo iniciar sync en tiempo real:', e);
    }
}

function applyRemoteFirestoreBackupPayload(data) {
    const skip = new Set(['metadata', '_syncUpdatedAt']);
    const keys = [
        'users',
        'bandos',
        'news',
        'events',
        'notifications',
        'administrators',
        'documents',
        'quickAccess',
        'publicNotifications',
        'appointmentSettings',
        'appointmentAvailability',
        'culturaOcioConfig',
        'servicios',
        'seccionesConfig',
        'consultorioConfig',
        'itvConfig',
        'telefonosInteresConfig',
        'transporteConfig'
    ];
    _applyingRemoteFirestoreSync = true;
    try {
        keys.forEach((key) => {
            if (skip.has(key) || data[key] === undefined || data[key] === null) {
                return;
            }
            try {
                const val =
                    typeof data[key] === 'string' ? data[key] : JSON.stringify(data[key]);
                localStorage.setItem(key, val);
            } catch (err) {
                console.warn('Sync clave ' + key + ':', err);
            }
        });
        if (typeof loadData === 'function') {
            loadData();
        }
        if (typeof loadAdministrators === 'function') {
            loadAdministrators();
        }
        if (typeof loadDocuments === 'function') {
            loadDocuments();
        }
        if (typeof loadEvents === 'function') {
            loadEvents();
        }
        if (typeof renderEventos === 'function') {
            renderEventos();
        }
        if (typeof updateCulturaOcioSection === 'function') {
            updateCulturaOcioSection();
        }
        if (typeof loadQuickAccess === 'function') {
            loadQuickAccess();
        }
        if (typeof loadAppointmentSettings === 'function') {
            loadAppointmentSettings();
        }
        if (typeof loadAppointmentAvailabilitySettings === 'function') {
            loadAppointmentAvailabilitySettings();
        }
        if (typeof updateContent === 'function') {
            updateContent();
        }
        if (typeof updateAppointmentUI === 'function') {
            updateAppointmentUI();
        }
    } finally {
        _applyingRemoteFirestoreSync = false;
    }
}

/** Envía periódicamente el estado local a Firestore para que Android / otras pestañas lo reciban */
function scheduleFirestoreBackupInterval() {
    setInterval(async () => {
        if (!window.firebase || !window.firebase.firestore()) {
            return;
        }
        if (_applyingRemoteFirestoreSync) {
            return;
        }
        if (!(await isFirebaseAdmin())) {
            return;
        }
        backupLocalStorageToFirestore();
    }, 90000);
}

// Exportar datos como JSON
function exportDataAsJSON() {
    try {
        const exportData = {
            bandos: bandos,
            news: news,
            events: events,
            users: users,
            administrators: JSON.parse(localStorage.getItem('administrators') || '[]'),
            documents: JSON.parse(localStorage.getItem('documents') || '[]'),
            quickAccess: JSON.parse(localStorage.getItem('quickAccess') || '[]'),
            notifications: notifications,
            appointmentsEnabled: appointmentsEnabled,
            appointmentAvailability: JSON.parse(localStorage.getItem('appointmentAvailability') || '{}'),
            culturaOcioConfig: JSON.parse(localStorage.getItem('culturaOcioConfig') || '{}'),
            servicios: JSON.parse(localStorage.getItem('servicios') || '{}'),
            seccionesConfig: JSON.parse(localStorage.getItem('seccionesConfig') || '{}'),
            consultorioConfig: JSON.parse(localStorage.getItem('consultorioConfig') || '{}'),
            itvConfig: JSON.parse(localStorage.getItem('itvConfig') || '{}'),
            telefonosInteresConfig: JSON.parse(localStorage.getItem('telefonosInteresConfig') || '{}'),
            transporteConfig: JSON.parse(localStorage.getItem('transporteConfig') || '{}'),
            exportDate: new Date().toISOString(),
            version: '1.0'
        };
        
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `ayuntamiento_cobreros_backup_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        console.log('✅ Datos exportados correctamente');
        showNotification('Datos exportados correctamente', 'success');
        
    } catch (error) {
        console.error('❌ Error exportando datos:', error);
        showNotification('Error al exportar datos', 'error');
    }
}

// Importar datos desde JSON
function importDataFromJSON(file) {
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const importData = JSON.parse(e.target.result);
            
            // Validar estructura
            if (!importData.version || !importData.exportDate) {
                throw new Error('Archivo no válido');
            }
            
            // Importar datos
            if (importData.bandos) {
                bandos = importData.bandos;
                localStorage.setItem('bandos', JSON.stringify(bandos));
            }
            
            if (importData.news) {
                news = importData.news;
                localStorage.setItem('news', JSON.stringify(news));
            }
            
            if (importData.events) {
                events = importData.events;
                localStorage.setItem('events', JSON.stringify(events));
            }
            
            if (importData.users) {
                users = importData.users;
                localStorage.setItem('users', JSON.stringify(users));
            }
            
            if (importData.administrators) {
                localStorage.setItem('administrators', JSON.stringify(importData.administrators));
            }
            
            if (importData.documents) {
                localStorage.setItem('documents', JSON.stringify(importData.documents));
            }
            
            if (importData.quickAccess) {
                localStorage.setItem('quickAccess', JSON.stringify(importData.quickAccess));
            }
            
            if (importData.appointmentsEnabled !== undefined) {
                appointmentsEnabled = importData.appointmentsEnabled;
                localStorage.setItem('appointmentSettings', JSON.stringify({ enabled: appointmentsEnabled }));
            }
            if (importData.appointmentAvailability) {
                localStorage.setItem('appointmentAvailability', JSON.stringify(importData.appointmentAvailability));
                appointmentAvailability = normalizeAppointmentAvailability(importData.appointmentAvailability);
            }
            
            if (importData.culturaOcioConfig) {
                localStorage.setItem('culturaOcioConfig', JSON.stringify(importData.culturaOcioConfig));
            }
            if (importData.servicios) {
                localStorage.setItem('servicios', JSON.stringify(importData.servicios));
            }
            if (importData.seccionesConfig) {
                localStorage.setItem('seccionesConfig', JSON.stringify(importData.seccionesConfig));
            }
            if (importData.consultorioConfig) {
                localStorage.setItem('consultorioConfig', JSON.stringify(importData.consultorioConfig));
            }
            if (importData.itvConfig) {
                localStorage.setItem('itvConfig', JSON.stringify(importData.itvConfig));
            }
            if (importData.telefonosInteresConfig) {
                localStorage.setItem('telefonosInteresConfig', JSON.stringify(importData.telefonosInteresConfig));
            }
            if (importData.transporteConfig) {
                localStorage.setItem('transporteConfig', JSON.stringify(importData.transporteConfig));
            }
            
            // Actualizar contenido
            loadAppointmentAvailabilitySettings();
            updateContent();
            updateCulturaOcioSection();
            loadAdministrators();
            loadDocuments();
            loadEvents();
            loadQuickAccess();
            
            console.log('✅ Datos importados correctamente');
            showNotification('Datos importados correctamente', 'success');
            
            // Hacer backup automático después de la importación
            setTimeout(() => {
                backupContentToFirestore();
            }, 1000);
            
        } catch (error) {
            console.error('❌ Error importando datos:', error);
            showNotification('Error al importar datos: ' + error.message, 'error');
        }
    };
    
    reader.readAsText(file);
}

// Verificar integridad de datos
function verifyDataIntegrity() {
    const issues = [];
    
    try {
        // Verificar bandos
        if (!Array.isArray(bandos)) {
            issues.push('Bandos: formato incorrecto');
        }
        
        // Verificar noticias
        if (!Array.isArray(news)) {
            issues.push('Noticias: formato incorrecto');
        }
        
        // Verificar usuarios
        if (!Array.isArray(users)) {
            issues.push('Usuarios: formato incorrecto');
        }
        
        // Verificar eventos
        if (!Array.isArray(events)) {
            issues.push('Eventos: formato incorrecto');
        }
        
        // Verificar configuraciones críticas
        const appointmentSettings = localStorage.getItem('appointmentSettings');
        if (appointmentSettings) {
            try {
                JSON.parse(appointmentSettings);
            } catch (e) {
                issues.push('Configuración de citas: formato incorrecto');
            }
        }
        
        if (issues.length === 0) {
            console.log('✅ Integridad de datos verificada correctamente');
            return true;
        } else {
            console.warn('⚠️ Problemas de integridad detectados:', issues);
            return false;
        }
        
    } catch (error) {
        console.error('❌ Error verificando integridad:', error);
        return false;
    }
}

// Reparar datos corruptos
function repairCorruptedData() {
    try {
        console.log('🔧 Iniciando reparación de datos...');
        
        // Reparar arrays si están corruptos
        if (!Array.isArray(bandos)) {
            bandos = [];
            localStorage.setItem('bandos', JSON.stringify(bandos));
            console.log('✅ Bandos reparados');
        }
        
        if (!Array.isArray(news)) {
            news = [];
            localStorage.setItem('news', JSON.stringify(news));
            console.log('✅ Noticias reparadas');
        }
        
        if (!Array.isArray(users)) {
            users = [];
            localStorage.setItem('users', JSON.stringify(users));
            console.log('✅ Usuarios reparados');
        }
        
        if (!Array.isArray(events)) {
            events = [];
            localStorage.setItem('events', JSON.stringify(events));
            console.log('✅ Eventos reparados');
        }
        
        // Reparar configuraciones
        if (!appointmentSettings || typeof appointmentsEnabled !== 'boolean') {
            appointmentsEnabled = true;
            localStorage.setItem('appointmentSettings', JSON.stringify({ enabled: true }));
            console.log('✅ Configuración de citas reparada');
        }
        
        console.log('✅ Reparación completada');
        showNotification('Datos reparados correctamente', 'success');
        
        // Actualizar contenido
        updateContent();
        updateCulturaOcioSection();
        
        // Actualizar información del sistema
        updateSystemInfo();
        
    } catch (error) {
        console.error('❌ Error reparando datos:', error);
        showNotification('Error reparando datos', 'error');
    }
}

// Actualizar información del sistema en la pestaña de backup
function updateSystemInfo() {
    try {
        // Actualizar contadores
        const totalBandosEl = document.getElementById('totalBandos');
        const totalNoticiasEl = document.getElementById('totalNoticias');
        const totalEventosEl = document.getElementById('totalEventos');
        const totalUsuariosEl = document.getElementById('totalUsuarios');
        const lastIntegrityCheckEl = document.getElementById('lastIntegrityCheck');
        
        if (totalBandosEl) totalBandosEl.textContent = bandos.length;
        if (totalNoticiasEl) totalNoticiasEl.textContent = news.length;
        if (totalEventosEl) totalEventosEl.textContent = events.length;
        if (totalUsuariosEl) totalUsuariosEl.textContent = users.length;
        if (lastIntegrityCheckEl) lastIntegrityCheckEl.textContent = new Date().toLocaleString();
        
        // Verificar estado de Firebase
        const firebaseStatusEl = document.getElementById('firebaseStatus');
        if (firebaseStatusEl) {
            if (window.firebase && window.firebase.firestore()) {
                firebaseStatusEl.textContent = '✅ Conectado';
                firebaseStatusEl.style.color = 'green';
            } else {
                firebaseStatusEl.textContent = '❌ No disponible';
                firebaseStatusEl.style.color = 'red';
            }
        }
        
        // Actualizar estado de integridad
        const integrityStatusEl = document.getElementById('integrityStatus');
        if (integrityStatusEl) {
            const isIntegrity = verifyDataIntegrity();
            if (isIntegrity) {
                integrityStatusEl.textContent = '✅ Datos íntegros';
                integrityStatusEl.style.color = 'green';
            } else {
                integrityStatusEl.textContent = '⚠️ Problemas detectados';
                integrityStatusEl.style.color = 'orange';
            }
        }
        
    } catch (error) {
        console.error('❌ Error actualizando información del sistema:', error);
    }
}

// Verificar integridad de datos (versión mejorada para UI)
function verifyDataIntegrity() {
    const issues = [];
    
    try {
        // Verificar bandos
        if (!Array.isArray(bandos)) {
            issues.push('Bandos: formato incorrecto');
        }
        
        // Verificar noticias
        if (!Array.isArray(news)) {
            issues.push('Noticias: formato incorrecto');
        }
        
        // Verificar usuarios
        if (!Array.isArray(users)) {
            issues.push('Usuarios: formato incorrecto');
        }
        
        // Verificar eventos
        if (!Array.isArray(events)) {
            issues.push('Eventos: formato incorrecto');
        }
        
        // Verificar configuraciones críticas
        const appointmentSettings = localStorage.getItem('appointmentSettings');
        if (appointmentSettings) {
            try {
                JSON.parse(appointmentSettings);
            } catch (e) {
                issues.push('Configuración de citas: formato incorrecto');
            }
        }
        
        if (issues.length === 0) {
            console.log('✅ Integridad de datos verificada correctamente');
            return true;
        } else {
            console.warn('⚠️ Problemas de integridad detectados:', issues);
            
            // Actualizar UI con problemas detectados
            const integrityStatusEl = document.getElementById('integrityStatus');
            if (integrityStatusEl) {
                integrityStatusEl.textContent = `⚠️ ${issues.length} problema(s) detectado(s)`;
                integrityStatusEl.style.color = 'orange';
                integrityStatusEl.title = issues.join(', ');
            }
            
            return false;
        }
        
    } catch (error) {
        console.error('❌ Error verificando integridad:', error);
        return false;
    }
}

// ===== FIREBASE AUTH (sesión + admin en Firestore) =====

/** Elimina flags legacy de admin local; los permisos solo vienen de Firebase Auth + admins/{uid}. */
function purgeLegacyLocalAdminStorage() {
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('isSuperAdmin');
    try {
        const raw = localStorage.getItem('currentUser');
        if (!raw) {
            return;
        }
        const u = JSON.parse(raw);
        if (!u.isAdmin && !u.adminUid) {
            return;
        }
        delete u.isAdmin;
        delete u.adminUid;
        localStorage.setItem('currentUser', JSON.stringify(u));
        if (currentUser && currentUser.email === u.email) {
            currentUser = u;
        }
    } catch (_) {}
}

/** Admin en memoria solo válido con sesión Firebase activa y documento admins/{uid}. */
function isAdminSessionValid() {
    const auth = getFirebaseAuthSafe();
    return isAdmin === true && !!(auth && auth.currentUser);
}

function applyFirebaseAdminSession(authUser, adminData) {
    const d = adminData || {};
    isAdmin = true;
    isSuperAdmin = d.isSuperAdmin === true;
    currentUser = {
        email: authUser.email,
        name: d.displayName || d.name || authUser.email || '',
        id: authUser.uid,
        adminUid: authUser.uid
    };
    purgeLegacyLocalAdminStorage();
}

function clearAdminSessionFlags() {
    isAdmin = false;
    isSuperAdmin = false;
    purgeLegacyLocalAdminStorage();
}

async function isFirebaseAdmin() {
    try {
        if (!isFirebaseReady() || !window.firebase.firestore) {
            return false;
        }
        const auth = getFirebaseAuthSafe();
        const authUser = auth ? auth.currentUser : null;
        if (!authUser) {
            return false;
        }
        const snap = await firebase.firestore().collection('admins').doc(authUser.uid).get();
        return snap.exists && snap.data().isAdmin === true;
    } catch (e) {
        return false;
    }
}

const FIREBASE_SETUP_ADMIN_EMAILS = ['aytocobreros@gmail.com', 'amco@gmx.es', 'admin@cobreros.es'];

async function ensureAllowlistedAdminFirestoreDoc() {
    const authUser = firebase.auth().currentUser;
    if (!authUser || !authUser.email) {
        return;
    }
    const em = authUser.email.toLowerCase();
    if (!FIREBASE_SETUP_ADMIN_EMAILS.includes(em)) {
        return;
    }
    const ref = firebase.firestore().collection('admins').doc(authUser.uid);
    const isSuper = em === 'amco@gmx.es';
    await ref.set(
        {
            email: authUser.email,
            isAdmin: true,
            isSuperAdmin: isSuper,
            role: isSuper ? 'super_admin' : 'admin',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        },
        { merge: true }
    );
    if (isSuper && firebase.auth().currentUser) {
        applyFirebaseAdminSession(firebase.auth().currentUser, { isSuperAdmin: true, isAdmin: true });
    }
}

function setupFirebaseAuthListener() {
    const auth = getFirebaseAuthSafe();
    if (!auth) {
        return;
    }
    auth.onAuthStateChanged(async function (user) {
        if (!user) {
            currentUser = null;
            clearAdminSessionFlags();
            localStorage.removeItem('currentUser');
            try {
                users = [];
            } catch (_) {}
            updateUserInterface();
            return;
        }
        try {
            const adminSnap = await firebase.firestore().collection('admins').doc(user.uid).get();
            if (adminSnap.exists && adminSnap.data().isAdmin === true) {
                applyFirebaseAdminSession(user, adminSnap.data() || {});
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                await loadUsersFromFirestore();
                await loadAdministrators();
                updateUserInterface();
                return;
            }
        } catch (e) {
            console.warn('onAuthStateChanged admin check:', e);
        }
        clearAdminSessionFlags();
        let displayName = user.email || '';
        let localities = [];
        try {
            const uSnap = await firebase.firestore().collection('users').doc(user.uid).get();
            if (uSnap.exists) {
                const ud = uSnap.data();
                displayName = ud.name || ud.nombre || displayName;
                localities = Array.isArray(ud.localities) ? ud.localities : [];
            }
        } catch (_) {}
        currentUser = {
            email: user.email,
            name: displayName,
            id: user.uid,
            isRegularUser: true,
            localities
        };
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        void syncUserFcmTokenToFirestore();
        await loadUsersFromFirestore();
        updateUserInterface();
        try {
            loadReceivedNotifications();
        } catch (_) {}
    });
}

// ===== MIGRACIÓN Y SINCRONIZACIÓN DE USUARIOS =====

// Migración masiva desde localStorage desactivada: las reglas exigen users/{uid} = auth.uid.
// Solo se marca estado y se cargan usuarios según rol (admin: todos; ciudadano: su doc).
async function migrateUsersToFirestore() {
    try {
        if (!window.firebase || !window.firebase.firestore) {
            loadUsersFromLocalStorage();
            return;
        }
        const migrationDone = localStorage.getItem('usersMigratedToFirestore');
        if (migrationDone !== 'true') {
            localStorage.setItem('usersMigratedToFirestore', 'true');
            console.log(
                'ℹ️ Migración masiva de usuarios omitida: use el registro web o el panel de administración.'
            );
        }
        await loadUsersFromFirestore();
    } catch (error) {
        console.error('Error en la migración:', error);
        loadUsersFromLocalStorage();
    }
}

function mapFirestoreUserDoc(docId, userData) {
    const name = userData.name || userData.nombre || '';
    const phone = userData.phone || userData.telefono || '';
    const regDate = userData.registrationDate || userData.registeredAt || userData.consentDate;
    let registeredAt = userData.registeredAt || userData.consentDate || '';
    if (regDate && typeof regDate.toDate === 'function') {
        registeredAt = regDate.toDate().toISOString();
    } else if (regDate && !registeredAt) {
        registeredAt = String(regDate);
    }
    return {
        id: docId,
        name: name,
        nombre: userData.nombre || name,
        apellidos: userData.apellidos || '',
        email: userData.email || '',
        phone: phone,
        telefono: userData.telefono || phone,
        consent: userData.consent === true,
        notificationConsent: userData.notificationConsent === true,
        localities: Array.isArray(userData.localities) ? userData.localities : [],
        fcmToken: userData.fcmToken || '',
        registeredFrom: userData.registeredFrom || 'WEB',
        registrationDate: regDate || null,
        registeredAt: registeredAt
    };
}

// Cargar usuarios: administrador Firebase ve la colección; ciudadano autenticado solo users/{uid}.
async function loadUsersFromFirestore() {
    try {
        if (!window.firebase || !window.firebase.firestore) {
            loadUsersFromLocalStorage();
            return;
        }
        const db = window.firebase.firestore();
        const admin = await isFirebaseAdmin();
        const authUser = firebase.auth().currentUser;

        users = [];

        if (admin) {
            const snapshot = await db.collection('users').get();
            snapshot.forEach((doc) => {
                users.push(mapFirestoreUserDoc(doc.id, doc.data()));
            });
        } else if (authUser) {
            const doc = await db.collection('users').doc(authUser.uid).get();
            if (doc.exists) {
                users.push(mapFirestoreUserDoc(doc.id, doc.data()));
            }
        } else {
            loadUsersFromLocalStorage();
            return;
        }

        localStorage.setItem('users', JSON.stringify(users));

        setTimeout(() => {
            const verification = JSON.parse(localStorage.getItem('users') || '[]');
            if (verification.length !== users.length) {
                console.error('❌ Error: usuarios no se guardaron correctamente en localStorage, reintentando...');
                localStorage.setItem('users', JSON.stringify(users));
            }
        }, 100);

        console.log(`✅ Cargados ${users.length} usuario(s) desde Firestore`);
        actualizarEstadisticasNotificaciones();
    } catch (error) {
        console.error('Error cargando usuarios desde Firestore:', error);
        loadUsersFromLocalStorage();
    }
}

// Cargar usuarios desde localStorage (fallback)
function loadUsersFromLocalStorage() {
    users = JSON.parse(localStorage.getItem('users') || '[]');
    console.log(`✅ Cargados ${users.length} usuarios desde localStorage`);
    actualizarEstadisticasNotificaciones();
}

// —— Localidades del usuario (Firebase + panel admin) ——

function formatLocalitiesList(localities) {
    const locs = Array.isArray(localities) ? localities.filter(Boolean) : [];
    return locs.length ? locs.join(', ') : 'Sin localidades';
}

function renderUserLocalitiesCheckboxes(selectedLocalities) {
    const grid = document.getElementById('userLocalitiesGrid');
    if (!grid) return;
    const selected = new Set(Array.isArray(selectedLocalities) ? selectedLocalities : []);
    grid.innerHTML = COBREROS_LOCALITIES.map(
        (name) => `
        <label class="locality-checkbox">
            <input type="checkbox" name="userLocalitiesEdit" value="${name.replace(/"/g, '&quot;')}" ${selected.has(name) ? 'checked' : ''}>
            <span>${name}</span>
        </label>`
    ).join('');
}

function getSelectedUserLocalitiesFromModal() {
    return Array.from(document.querySelectorAll('input[name="userLocalitiesEdit"]:checked')).map((cb) => cb.value);
}

function selectAllUserLocalitiesCheckboxes() {
    document.querySelectorAll('input[name="userLocalitiesEdit"]').forEach((cb) => {
        cb.checked = true;
    });
}

function deselectAllUserLocalitiesCheckboxes() {
    document.querySelectorAll('input[name="userLocalitiesEdit"]').forEach((cb) => {
        cb.checked = false;
    });
}

function openUserProfileModal() {
    if (!currentUser || !firebase.auth().currentUser) {
        showNotification('Inicie sesión para gestionar sus localidades', 'warning');
        openModal('loginModal');
        return;
    }
    const uid = firebase.auth().currentUser.uid;
    const u = users.find((x) => x.id === uid) || currentUser;
    const locs = Array.isArray(u.localities) ? u.localities : currentUser.localities || [];
    document.getElementById('userLocalitiesEditUid').value = '';
    document.getElementById('userLocalitiesModalTitle').textContent = 'Mis localidades';
    document.getElementById('userLocalitiesModalSubtitle').textContent =
        'Seleccione los pueblos de los que desea recibir avisos específicos. Los avisos generales llegan siempre.';
    renderUserLocalitiesCheckboxes(locs);
    openModal('userLocalitiesModal');
}

function openAdminEditUserLocalities(userId, userName, userEmail) {
    if (!isAdminSessionValid()) {
        showNotification('Solo administradores pueden editar usuarios', 'error');
        return;
    }
    const u = users.find((x) => x.id === userId);
    const locs = u && Array.isArray(u.localities) ? u.localities : [];
    document.getElementById('userLocalitiesEditUid').value = userId;
    document.getElementById('userLocalitiesModalTitle').textContent = `Localidades: ${userName || userEmail || ''}`;
    document.getElementById('userLocalitiesModalSubtitle').textContent =
        'Los cambios se guardan en la nube y se reflejan en el panel de usuarios.';
    renderUserLocalitiesCheckboxes(locs);
    openModal('userLocalitiesModal');
}

function closeUserLocalitiesModal() {
    closeModal('userLocalitiesModal');
}

async function saveUserLocalitiesFromModal() {
    const selected = getSelectedUserLocalitiesFromModal();
    if (selected.length === 0) {
        showNotification('Seleccione al menos una localidad', 'error');
        return;
    }

    const editUid = (document.getElementById('userLocalitiesEditUid')?.value || '').trim();
    const authUser = firebase.auth().currentUser;
    if (!authUser) {
        showNotification('Sesión expirada. Vuelva a iniciar sesión.', 'warning');
        return;
    }

    let targetUid = authUser.uid;
    const isAdminEdit = !!editUid;

    if (isAdminEdit) {
        if (!(await isFirebaseAdmin())) {
            showNotification('Sin permisos de administrador', 'error');
            return;
        }
        targetUid = editUid;
    } else if (editUid && editUid !== authUser.uid) {
        showNotification('No puede editar otro usuario', 'error');
        return;
    }

    try {
        const patch = {
            localities: selected,
            localitiesUpdatedAt: new Date().toISOString(),
            localitiesUpdatedBy: currentUser?.email || authUser.email || 'usuario'
        };
        await firebase.firestore().collection('users').doc(targetUid).set(patch, { merge: true });

        const idx = users.findIndex((u) => u.id === targetUid);
        if (idx !== -1) {
            users[idx] = { ...users[idx], localities: selected };
        } else if (targetUid === authUser.uid) {
            users.push({
                id: targetUid,
                email: authUser.email,
                name: currentUser?.name || '',
                localities: selected,
                notificationConsent: true
            });
        }
        localStorage.setItem('users', JSON.stringify(users));

        if (targetUid === authUser.uid && currentUser) {
            currentUser.localities = selected;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
        }

        closeUserLocalitiesModal();
        loadUsersList();
        loadReceivedNotifications();
        actualizarEstadisticasNotificaciones();
        showNotification(
            isAdminEdit ? 'Localidades del usuario actualizadas en la nube' : 'Sus localidades se han guardado',
            'success'
        );
    } catch (err) {
        console.error('Error guardando localidades:', err);
        showNotification('No se pudieron guardar las localidades: ' + (err.message || 'error'), 'error');
    }
}

// Sincronizar perfil del usuario autenticado en users/{uid} (sin contraseña)
async function syncUserToFirestore(userData) {
    try {
        if (!window.firebase || !window.firebase.auth || !window.firebase.firestore) {
            return;
        }
        const authUser = firebase.auth().currentUser;
        if (!authUser) {
            return;
        }
        const payload = {
            nombre: userData.nombre || userData.name || '',
            name: userData.name || userData.nombre || '',
            apellidos: userData.apellidos || '',
            email: userData.email || authUser.email || '',
            telefono: userData.telefono || userData.phone || '',
            phone: userData.phone || userData.telefono || '',
            notificationConsent: !!userData.notificationConsent,
            localities: userData.localities || [],
            fcmToken: userData.fcmToken || '',
            registeredFrom: userData.registeredFrom || 'WEB',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        await firebase.firestore().collection('users').doc(authUser.uid).set(payload, { merge: true });
        console.log('✅ Usuario sincronizado con Firestore');
    } catch (error) {
        console.error('Error sincronizando usuario:', error);
    }
}

// ===== PWA (Progressive Web App) =====

// Registrar Service Worker para PWA
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            const swPath = new URL('sw.js', window.location.href).pathname;
            const swScope = new URL('./', window.location.href).pathname;
            navigator.serviceWorker.register(swPath, { scope: swScope })
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
    let deferredPrompt;
    
    window.addEventListener('beforeinstallprompt', (e) => {
        // Prevenir que se muestre automáticamente
        e.preventDefault();
        deferredPrompt = e;
        
        // Mostrar banner personalizado
        const installBanner = document.createElement('div');
        installBanner.id = 'pwa-install-banner';
        installBanner.innerHTML = `
            <div style="position: fixed; bottom: 20px; left: 20px; right: 20px; background: #1e3a8a; color: white; padding: 16px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); z-index: 1000; display: flex; align-items: center; gap: 12px;">
                <div style="flex: 1;">
                    <div style="font-weight: bold; margin-bottom: 4px;">📱 Instalar App</div>
                    <div style="font-size: 14px; opacity: 0.9;">Instala la app del Ayuntamiento de Cobreros en tu iPhone</div>
                </div>
                <button onclick="installPWAApp()" style="background: white; color: #1e3a8a; border: none; padding: 8px 16px; border-radius: 6px; font-weight: bold; cursor: pointer;">
                    Instalar
                </button>
                <button onclick="closePWAInstallBanner()" style="background: transparent; color: white; border: none; padding: 8px; cursor: pointer; font-size: 18px;">
                    ×
                </button>
            </div>
        `;
        document.body.appendChild(installBanner);
    });
    
    // Función para instalar la app
    window.installPWAApp = () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then((choiceResult) => {
                if (choiceResult.outcome === 'accepted') {
                    console.log('✅ Usuario aceptó instalar la PWA');
                } else {
                    console.log('❌ Usuario rechazó instalar la PWA');
                }
                deferredPrompt = null;
                closePWAInstallBanner();
            });
        }
    };
    
    // Función para cerrar el banner
    window.closePWAInstallBanner = () => {
        const banner = document.getElementById('pwa-install-banner');
        if (banner) {
            banner.remove();
        }
    };
}

// Inicializar PWA
function initializePWA() {
    registerServiceWorker();
    showPWAInstallBanner();
    setupApkDownloadUi();
    maybeShowIosInstallHintOnFirstVisit();
    
    // Configurar recepción de notificaciones
    setupNotificationReception();
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
                if (event.data.type === 'BADGE_REFRESH' || event.data.type === 'BADGE_COUNT') {
                    if (typeof event.data.count === 'number') {
                        syncAppIconBadge(event.data.count);
                    } else {
                        loadReceivedNotifications();
                    }
                }
            });
        });
    }
    
    // Cargar notificaciones recibidas al iniciar
    loadReceivedNotifications();
}

// Manejar notificación recibida
function handleReceivedNotification(notificationData) {
    console.log('Notificación recibida en la web:', notificationData);
    
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
        icon: '/images/escudo-cobreros-192.png',
        badge: '/images/escudo-cobreros-192.png',
        tag: 'ayuntamiento-notification',
        data: notificationData
    };
    
    new Notification(notificationData.title || '🏛️ Ayuntamiento de Cobreros', options);
}

// —— Notificaciones: generales (todos) vs por pueblos (targetPueblos) ——
function getCurrentUserLocalitiesForNotifications() {
    if (currentUser && Array.isArray(currentUser.localities) && currentUser.localities.length > 0) {
        return currentUser.localities;
    }
    if (!currentUser) {
        return [];
    }
    const u = users.find((x) => x.email === currentUser.email || x.id === currentUser.id);
    return u && Array.isArray(u.localities) ? u.localities : [];
}

/** Pueblos destino guardados en Firestore (targetPueblos o localities del envío). */
function getNotificationTargetPueblos(data) {
    const fromTarget = Array.isArray(data?.targetPueblos)
        ? data.targetPueblos.filter(Boolean)
        : [];
    if (fromTarget.length > 0) {
        return fromTarget;
    }
    const fromLocalities = Array.isArray(data?.localities)
        ? data.localities.filter(Boolean)
        : [];
    if (fromLocalities.length > 0) {
        return fromLocalities;
    }
    if (typeof data?.localities === 'string' && data.localities.trim()) {
        return data.localities.split(',').map((s) => s.trim()).filter(Boolean);
    }
    return [];
}

/** Generales: sin pueblos destino. Por pueblo: intersección con localities del registro del usuario. */
function isNotificationForUserLocalities(data, userLocalities) {
    const targets = getNotificationTargetPueblos(data);
    const isGeneral = targets.length === 0 || data.scope === 'general';
    if (isGeneral) {
        return true;
    }
    const locs = Array.isArray(userLocalities) ? userLocalities : [];
    if (locs.length === 0) {
        return false;
    }
    return targets.some((p) => locs.includes(p));
}

/** Actualiza fcmToken en Firestore tras login (si el usuario ya dio permiso de notificaciones). */
async function syncUserFcmTokenToFirestore() {
    try {
        if (!window.firebase || !window.firebase.auth || !window.firebase.firestore) {
            return;
        }
        const authUser = firebase.auth().currentUser;
        if (!authUser || typeof Notification === 'undefined' || Notification.permission !== 'granted') {
            return;
        }
        if (typeof window.getFCMToken !== 'function') {
            return;
        }
        const token = await window.getFCMToken();
        if (!token) {
            return;
        }
        await firebase.firestore().collection('users').doc(authUser.uid).set(
            { fcmToken: token, notificationConsent: true },
            { merge: true }
        );
        try {
            localStorage.setItem('fcmToken', token);
        } catch (_) {}
    } catch (err) {
        console.warn('No se pudo sincronizar fcmToken:', err);
    }
}

// —— Badge en icono de la app (PWA): avisos sin leer ——

let cachedReadBroadcastIds = [];
let lastReceivedNotifications = [];

async function syncAppIconBadge(count) {
    const n = Math.max(0, Number(count) || 0);
    try {
        if ('setAppBadge' in navigator) {
            if (n > 0) {
                await navigator.setAppBadge(n);
            } else if ('clearAppBadge' in navigator) {
                await navigator.clearAppBadge();
            }
        }
        if (navigator.serviceWorker && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({ type: 'BADGE_COUNT', count: n });
        }
    } catch (err) {
        console.warn('No se pudo actualizar badge del icono:', err);
    }
    const notificationBadge = document.getElementById('notificationBadge');
    if (notificationBadge) {
        notificationBadge.textContent = String(n);
        notificationBadge.style.display = n > 0 ? 'flex' : 'none';
    }
}

function isFirestoreNotificationUnread(n, uid, readBroadcastIds) {
    if (!n) return false;
    if (n.userId && uid && n.userId === uid) {
        return n.read !== true;
    }
    const id = n.id || '';
    return id && !(readBroadcastIds || []).includes(id);
}

function countUnreadNotifications(notifications, uid, readBroadcastIds) {
    return (notifications || []).filter((n) =>
        isFirestoreNotificationUnread(n, uid, readBroadcastIds)
    ).length;
}

async function loadUserReadBroadcastIds(uid) {
    if (!uid || !window.firebase || !window.firebase.firestore) {
        return [];
    }
    try {
        const doc = await firebase.firestore().collection('users').doc(uid).get();
        const raw = doc.exists ? doc.get('readBroadcastNotificationIds') : [];
        return Array.isArray(raw) ? raw.map(String) : [];
    } catch (e) {
        return [];
    }
}

async function markFirestoreNotificationAsRead(notification) {
    if (!notification || !notification.id) return;
    const authUser = firebase.auth && firebase.auth().currentUser;
    const uid = authUser ? authUser.uid : null;
    if (!uid || !window.firebase || !window.firebase.firestore) return;

    try {
        if (notification.userId && notification.userId === uid) {
            await firebase.firestore().collection('notifications').doc(notification.id)
                .update({ read: true });
        } else {
            if (!cachedReadBroadcastIds.includes(notification.id)) {
                cachedReadBroadcastIds.push(notification.id);
            }
            await firebase.firestore().collection('users').doc(uid).set({
                readBroadcastNotificationIds: cachedReadBroadcastIds
            }, { merge: true });
        }
        notification.read = true;
    } catch (err) {
        console.warn('No se pudo marcar aviso como leído:', err);
    }
}

async function updateAppIconBadgeCount(notificationsOverride) {
    try {
        const authUser = firebase.auth && firebase.auth().currentUser;
        const uid = authUser ? authUser.uid : null;
        if (!uid) {
            await syncAppIconBadge(0);
            return;
        }
        if (!cachedReadBroadcastIds.length) {
            cachedReadBroadcastIds = await loadUserReadBroadcastIds(uid);
        }
        let list = notificationsOverride;
        if (!list) {
            const snap = await firebase.firestore().collection('notifications')
                .orderBy('timestamp', 'desc').limit(50).get();
            list = [];
            snap.forEach((doc) => {
                list.push({ id: doc.id, ...doc.data() });
            });
            const userLocalities = getCurrentUserLocalitiesForNotifications();
            list = list.filter((n) => isNotificationForUserLocalities(n, userLocalities));
        }
        const unread = countUnreadNotifications(list, uid, cachedReadBroadcastIds);
        await syncAppIconBadge(unread);
    } catch (err) {
        console.warn('updateAppIconBadgeCount:', err);
    }
}

function updateNotificationBadge() {
    updateAppIconBadgeCount();
}

// Cargar notificaciones recibidas desde Firestore
async function loadReceivedNotifications() {
    try {
        if (window.firebase && window.firebase.firestore) {
            const skipPuebloFilter = isAdminSessionValid();
            if (!currentUser && !skipPuebloFilter) {
                displayReceivedNotifications([]);
                return;
            }

            const snapshot = await window.firebase.firestore()
                .collection('notifications')
                .orderBy('timestamp', 'desc')
                .limit(50)
                .get();
            
            const receivedNotifications = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                const rawLocalities = data.localities;
                const formattedLocalities = Array.isArray(rawLocalities)
                    ? rawLocalities.join(', ')
                    : (rawLocalities || '');
                const localitiesLabel =
                    formattedLocalities ||
                    (Array.isArray(data.targetPueblos) && data.targetPueblos.length
                        ? data.targetPueblos.join(', ')
                        : '');
                receivedNotifications.push({
                    id: doc.id,
                    ...data,
                    localities: localitiesLabel,
                    hasAttachments: !!(data.hasAttachments || data.documentUrl),
                    attachmentUrl: data.attachmentUrl || data.documentUrl || null
                });
            });

            let filtered = receivedNotifications;
            if (!skipPuebloFilter) {
                const userLocalities = getCurrentUserLocalitiesForNotifications();
                filtered = receivedNotifications.filter((n) =>
                    isNotificationForUserLocalities(n, userLocalities)
                );
            }

            const authUser = firebase.auth && firebase.auth().currentUser;
            if (authUser) {
                cachedReadBroadcastIds = await loadUserReadBroadcastIds(authUser.uid);
            }

            displayReceivedNotifications(filtered);
            await updateAppIconBadgeCount(filtered);
        }
    } catch (error) {
        console.error('Error cargando notificaciones recibidas:', error);
    }
}

// Mostrar notificaciones recibidas en la interfaz
function displayReceivedNotifications(notifications) {
    const container = document.getElementById('receivedNotificationsList');
    if (!container) return;

    lastReceivedNotifications = notifications || [];
    
    if (notifications.length === 0) {
        container.innerHTML = '<p class="no-notifications">No hay notificaciones recibidas</p>';
        return;
    }
    
    container.innerHTML = notifications.map(notification => {
        const unread = isFirestoreNotificationUnread(
            notification,
            firebase.auth && firebase.auth().currentUser ? firebase.auth().currentUser.uid : null,
            cachedReadBroadcastIds
        );
        const unreadClass = unread ? ' unread' : '';
        return `
        <div class="notification-item received${unreadClass}" data-id="${notification.id}" onclick="openReceivedNotification('${notification.id}')">
            <div class="notification-header">
                <span class="notification-type ${notification.type || 'general'}">
                    ${getTypeIcon(notification.type)} ${(notification.type || 'general').toString().toUpperCase()}
                </span>
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
                ${notification.hasAttachments ? '<button onclick="event.stopPropagation(); downloadAttachment(\'' + notification.attachmentUrl + '\')" class="btn btn-small">📥 Descargar</button>' : ''}
            </div>
        </div>
    `;
    }).join('');
}

async function openReceivedNotification(notificationId) {
    const notification = lastReceivedNotifications.find((n) => n.id === notificationId);
    if (!notification) return;
    await markFirestoreNotificationAsRead(notification);
    await updateAppIconBadgeCount(lastReceivedNotifications);
    showNotificationDetail({
        title: notification.title,
        message: notification.message,
        type: notification.type || 'general',
        date: notification.timestamp,
        attachment: notification.attachmentUrl
            ? { url: notification.attachmentUrl, name: 'Adjunto' }
            : null,
        read: true
    });
    displayReceivedNotifications(lastReceivedNotifications);
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

// Actualizar notificaciones recibidas
function refreshReceivedNotifications() {
    loadReceivedNotifications();
    showNotification('Notificaciones actualizadas', 'success');
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
    let date;
    if (timestamp && typeof timestamp.toDate === 'function') {
        date = timestamp.toDate();
    } else {
        date = new Date(timestamp);
    }
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Hace un momento';
    if (diff < 3600000) return `Hace ${Math.floor(diff / 60000)} minutos`;
    if (diff < 86400000) return `Hace ${Math.floor(diff / 3600000)} horas`;
    return date.toLocaleDateString('es-ES');
}

// Descargar archivo adjunto
function downloadAttachment(attachmentUrl) {
    if (attachmentUrl) {
        window.open(attachmentUrl, '_blank');
    } else {
        showNotification('No hay archivo adjunto disponible', 'error');
    }
}

// ===== SISTEMA DE NOTIFICACIONES PUSH - TURISTEAM =====

// Enviar notificación push con filtrado por localidades (SOLO DESDE WEB)
async function enviarNotificacionPushConLocalidades(titulo, mensaje, tipo = 'general', alcance = 'todos', localidadesSeleccionadas = [], hasAttachments = false, attachmentUrl = null, attachmentType = null) {
    try {
        const token = await getAuthBearerToken();
        const endpoint = 'https://us-central1-ayuntamiento-de-cobreros.cloudfunctions.net/sendPushNotification';
        const localities = alcance === 'localidades' ? localidadesSeleccionadas : [];
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: JSON.stringify({
                title: titulo,
                message: mensaje,
                type: tipo,
                localities,
                hasAttachments,
                attachmentUrl,
                attachmentType
            })
        });
        const data = await response.json();
        if (!response.ok || !data?.success) {
            throw new Error(data?.error || `HTTP ${response.status}`);
        }
        showNotification(`Notificación enviada a ${data.sent || 0} usuarios`, 'success');
    } catch (error) {
        console.error('Error enviando notificación push:', error);
        showNotification('Error al enviar notificación push', 'error');
    }
}

// Envía push a todos los usuarios con consentimiento (Cloud Function HTTP + Bearer admin)
async function enviarNotificacionPush(titulo, mensaje, tipo = 'general') {
    return await enviarNotificacionPushConLocalidades(titulo, mensaje, tipo, 'todos', []);
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
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            enviarNotificacionDesdeFormulario();
        });
    }
}

async function migrateNotificationsFromAdmin() {
    const resultEl = document.getElementById('notificationMigrationResult');
    if (resultEl) {
        resultEl.textContent = 'Migrando...';
    }
    try {
        const token = await getAuthBearerToken();
        if (!token) {
            showNotification('Debe iniciar sesión como administrador para migrar', 'error');
            if (resultEl) resultEl.textContent = 'Error: sin sesión admin';
            return;
        }
        const endpoint =
            'https://us-central1-ayuntamiento-de-cobreros.cloudfunctions.net/migrateNotificationsSchema';
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: '{}'
        });
        const data = await res.json();
        if (!res.ok || !data?.success) {
            throw new Error(data?.error || `HTTP ${res.status}`);
        }
        const summary = `OK - revisadas: ${data.scanned || 0}, actualizadas: ${data.updated || 0}`;
        if (resultEl) {
            resultEl.textContent = summary;
        }
        showNotification('Migración de notificaciones completada', 'success');
        loadReceivedNotifications();
    } catch (error) {
        console.error('Error en migración de notificaciones:', error);
        if (resultEl) {
            resultEl.textContent = `Error: ${error.message || 'No se pudo migrar'}`;
        }
        showNotification('No se pudo ejecutar la migración de notificaciones', 'error');
    }
}

// Enviar notificación desde el formulario
function enviarNotificacionDesdeFormulario() {
    const titulo = document.getElementById('notifTitle').value.trim();
    
    // Obtener mensaje del editor de texto enriquecido
    const mensaje = getRichEditorContent();
    const tipo = document.getElementById('notifType').value;
    const archivo = document.getElementById('notifAttachment').files[0];
    const destinatarios = document.querySelector('input[name="destinatarios"]:checked').value;
    
    // Validaciones
    if (!titulo) {
        alert('Por favor, ingrese un título para la notificación.');
        return;
    }
    
    // Validar que el mensaje no esté vacío
    if (!mensaje || mensaje.trim() === '' || mensaje === '<div><br></div>' || mensaje === '<br>') {
        alert('Por favor, escribe un mensaje para la notificación.');
        return;
    }
    
    if (!tipo) {
        alert('Por favor, seleccione un tipo de notificación.');
        return;
    }
    
    if (destinatarios === 'localidades') {
        const localidadesSeleccionadas = Array.from(document.querySelectorAll('input[name="localidades"]:checked'));
        if (localidadesSeleccionadas.length === 0) {
            alert('Por favor, seleccione al menos una localidad.');
            return;
        }
    }
    
    // Obtener localidades seleccionadas
    let localidades = [];
    if (destinatarios === 'localidades') {
        localidades = Array.from(document.querySelectorAll('input[name="localidades"]:checked')).map(cb => cb.value);
    }
    
    // Enviar notificación
    enviarNotificacionPushConLocalidades(titulo, mensaje, tipo, destinatarios, localidades, archivo);
    
    // Limpiar formulario después del envío
    limpiarFormularioNotificacion();
    
    alert('Notificación enviada correctamente.');
}

// Limpiar formulario de notificación
function limpiarFormularioNotificacion() {
    document.getElementById('notificationForm').reset();
    document.getElementById('localidadesGroup').style.display = 'none';
    document.querySelector('input[name="destinatarios"][value="todos"]').checked = true;
    
    // Limpiar editor de texto enriquecido
    clearRichEditor();
    
    // Limpiar vista previa
    const preview = document.getElementById('messagePreview');
    if (preview) {
        preview.innerHTML = '<em style="color: #6c757d;">Vista previa del mensaje...</em>';
    }
}

// Abrir modal para enviar notificación personalizada
function abrirModalNotificacion() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            <h2>📱 Enviar Notificación Push</h2>
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
    
    showNotification(`Estadísticas actualizadas: ${usuariosConNotificaciones.length} usuarios con notificaciones activadas`, 'success');
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
                    <textarea id="apkDescripcion" rows="3" placeholder="Aplicación oficial del Ayuntamiento de Cobreros para recibir notificaciones push..."></textarea>
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
    
    if (itvConfig.documentos.length === 0 && itvConfig.fotos.length === 0) {
        container.innerHTML = '<p>No hay contenido disponible para ITV.</p>';
        return;
    }
    
    let html = '<div class="content-items">';
    
    // Mostrar documentos
    if (itvConfig.documentos.length > 0) {
        html += '<div class="content-item"><h5>📋 Documentos:</h5><ul>';
        itvConfig.documentos.forEach((doc, index) => {
            html += `<li>${doc.nombre} <button class="btn btn-danger btn-small" onclick="deleteItvDocument(${index})">Eliminar</button></li>`;
        });
        html += '</ul></div>';
    }
    
    // Mostrar fotos
    if (itvConfig.fotos.length > 0) {
        html += '<div class="content-item"><h5>📸 Fotos:</h5><ul>';
        itvConfig.fotos.forEach((foto, index) => {
            html += `<li>${foto.nombre} <button class="btn btn-danger btn-small" onclick="deleteItvFoto(${index})">Eliminar</button></li>`;
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
    
    if (itvConfig.documentos.length === 0) {
        container.innerHTML = '<p>No hay documentos disponibles.</p>';
        return;
    }
    
    itvConfig.documentos.forEach((doc, index) => {
        const docItem = document.createElement('div');
        docItem.className = 'content-item';
        docItem.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 1rem;">
                <div>
                    <h5>${doc.nombre}</h5>
                    <p>${doc.descripcion || 'Sin descripción'}</p>
                    <a href="${doc.url}" target="_blank" class="btn btn-outline btn-small">Ver Documento</a>
                </div>
                <button class="btn btn-danger btn-small" onclick="deleteItvDocument(${index})">
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
    
    if (itvConfig.fotos.length === 0) {
        container.innerHTML = '<p>No hay fotos disponibles.</p>';
        return;
    }
    
    itvConfig.fotos.forEach((foto, index) => {
        const fotoItem = document.createElement('div');
        fotoItem.className = 'content-item';
        fotoItem.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 1rem;">
                <div>
                    <h5>${foto.nombre}</h5>
                    <p>${foto.descripcion || 'Sin descripción'}</p>
                    <img src="${foto.url}" alt="${foto.nombre}" style="width: 100px; height: 100px; object-fit: cover; border-radius: 4px;">
                </div>
                <button class="btn btn-danger btn-small" onclick="deleteItvFoto(${index})">
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
        
        itvConfig.documentos.push(nuevoDocumento);
        saveItvConfig();
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
        
        itvConfig.fotos.push(nuevaFoto);
        saveItvConfig();
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

function deleteItvDocument(index) {
    if (confirm('¿Estás seguro de que quieres eliminar este documento de ITV?')) {
        itvConfig.documentos.splice(index, 1);
        saveItvConfig();
        loadItvDocumentosInModal();
        loadItvList();
        renderServicios();
    }
}

function deleteItvFoto(index) {
    if (confirm('¿Estás seguro de que quieres eliminar esta foto de ITV?')) {
        itvConfig.fotos.splice(index, 1);
        saveItvConfig();
        loadItvFotosInModal();
        loadItvList();
        renderServicios();
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

// ===== FUNCIONES DE GESTIÓN DE CULTURA Y OCIO =====

// Función para manejar enlaces de cultura y ocio
function handleCulturaLink(type, url, itemId) {
    console.log(`🔗 Enlace de cultura clickeado: ${type} - ${url}`);
    
    switch(type) {
        case 'pdf':
            // Abrir PDF en nueva ventana
            window.open(url, '_blank');
            break;
        case 'external':
            // Abrir enlace externo en nueva ventana
            window.open(url, '_blank');
            break;
        case 'normal':
            // Enlaces normales (pueden ser internos o externos)
            if (url.startsWith('http')) {
                window.open(url, '_blank');
            } else {
                // Enlace interno - podría abrir un modal o navegar
                handleInternalCulturaLink(url, itemId);
            }
            break;
        default:
            // Por defecto, abrir en nueva ventana
            window.open(url, '_blank');
    }
    
    // Registrar estadística de clic
    recordCulturaLinkClick(itemId, type, url);
}

// Función para manejar enlaces internos de cultura
function handleInternalCulturaLink(url, itemId) {
    console.log(`🔗 Enlace interno: ${url} para elemento ${itemId}`);
    
    // Manejar enlaces específicos
    switch(url) {
        case 'guia-setas':
        case 'guia_setas':
            openGuiaSetas();
            break;
        case 'calendario-recoleccion':
        case 'calendario_recoleccion':
            openCalendarioRecoleccion();
            break;
        case 'mapa-rutas':
        case 'mapa_rutas':
            openMapaRutas();
            break;
        case 'eventos-calendario':
        case 'eventos_calendario':
            openCalendarioEventos();
            break;
        default:
            // Por defecto, mostrar notificación
            showNotification(`Enlace interno: ${url}`, 'info');
    }
}

// Función para registrar estadísticas de clics en enlaces
function recordCulturaLinkClick(itemId, type, url) {
    try {
        const stats = JSON.parse(localStorage.getItem('culturaLinkStats') || '{}');
        const key = `${itemId}_${type}_${url}`;
        stats[key] = (stats[key] || 0) + 1;
        stats[`${itemId}_total`] = (stats[`${itemId}_total`] || 0) + 1;
        localStorage.setItem('culturaLinkStats', JSON.stringify(stats));
        
        console.log(`📊 Estadística registrada: ${key} = ${stats[key]}`);
    } catch (error) {
        console.error('Error registrando estadística:', error);
    }
}

// Función para abrir guía de setas
function openGuiaSetas() {
    // Crear modal con información de setas
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 800px;">
            <div class="modal-header">
                <h3>🍄 Guía de Setas de Cobreros</h3>
                <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            <div class="modal-body">
                <div class="setas-guide">
                    <h4>📋 Especies Comunes en la Zona</h4>
                    <div class="setas-grid">
                        <div class="seta-item">
                            <h5>🍄 Boletus edulis (Boleto)</h5>
                            <p><strong>Época:</strong> Otoño (Septiembre-Noviembre)</p>
                            <p><strong>Hábitat:</strong> Bosques de robles y castaños</p>
                            <p><strong>Identificación:</strong> Sombrero marrón, pie grueso, poros blancos</p>
                        </div>
                        <div class="seta-item">
                            <h5>🍄 Lactarius deliciosus (Níscalo)</h5>
                            <p><strong>Época:</strong> Otoño (Octubre-Diciembre)</p>
                            <p><strong>Hábitat:</strong> Pinares</p>
                            <p><strong>Identificación:</strong> Sombrero naranja, látex naranja</p>
                        </div>
                        <div class="seta-item">
                            <h5>🍄 Cantharellus cibarius (Rebozuelo)</h5>
                            <p><strong>Época:</strong> Verano-Otoño</p>
                            <p><strong>Hábitat:</strong> Bosques húmedos</p>
                            <p><strong>Identificación:</strong> Color amarillo dorado, forma de embudo</p>
                        </div>
                        <div class="seta-item">
                            <h5>🍄 Amanita caesarea (Oronja)</h5>
                            <p><strong>Época:</strong> Verano-Otoño</p>
                            <p><strong>Hábitat:</strong> Bosques de encinas</p>
                            <p><strong>Identificación:</strong> Sombrero naranja, pie amarillo</p>
                        </div>
                    </div>
                    
                    <h4>⚠️ Precauciones Importantes</h4>
                    <ul>
                        <li>Nunca consumir setas sin identificación segura</li>
                        <li>Consultar con expertos micólogos</li>
                        <li>Recoger solo ejemplares en buen estado</li>
                        <li>Usar cesta de mimbre para esporar</li>
                        <li>No arrancar, cortar por el pie</li>
                    </ul>
                    
                    <h4>📞 Contactos de Emergencia</h4>
                    <p><strong>Centro de Interpretación Micológico de Ungilde:</strong> 980 123 456</p>
                    <p><strong>Guardia Civil:</strong> 062</p>
                    <p><strong>Emergencias Sanitarias:</strong> 112</p>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-primary" onclick="this.closest('.modal').remove()">Cerrar</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// Función para abrir calendario de recolección
function openCalendarioRecoleccion() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 900px;">
            <div class="modal-header">
                <h3>🗓️ Calendario de Recolección - Cobreros</h3>
                <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            <div class="modal-body">
                <div class="calendario-recoleccion">
                    <div class="mes-grid">
                        <div class="mes-item">
                            <h4>🌱 Marzo - Abril</h4>
                            <ul>
                                <li>Colmenillas (Morchella)</li>
                                <li>Senderuelas (Marasmius oreades)</li>
                                <li>Perrechicos (Calocybe gambosa)</li>
                            </ul>
                        </div>
                        <div class="mes-item">
                            <h4>🌿 Mayo - Junio</h4>
                            <ul>
                                <li>Rebozuelos (Cantharellus)</li>
                                <li>Boletos de verano</li>
                                <li>Parasoles (Macrolepiota)</li>
                            </ul>
                        </div>
                        <div class="mes-item">
                            <h4>☀️ Julio - Agosto</h4>
                            <ul>
                                <li>Boletos de verano</li>
                                <li>Rebozuelos</li>
                                <li>Oronjas (Amanita caesarea)</li>
                            </ul>
                        </div>
                        <div class="mes-item">
                            <h4>🍂 Septiembre - Octubre</h4>
                            <ul>
                                <li>Boletus edulis</li>
                                <li>Níscalos (Lactarius)</li>
                                <li>Rebozuelos</li>
                                <li>Parasoles</li>
                            </ul>
                        </div>
                        <div class="mes-item">
                            <h4>🍁 Noviembre - Diciembre</h4>
                            <ul>
                                <li>Níscalos tardíos</li>
                                <li>Boletos de invierno</li>
                                <li>Pleurotus (setas de ostra)</li>
                            </ul>
                        </div>
                        <div class="mes-item">
                            <h4>❄️ Enero - Febrero</h4>
                            <ul>
                                <li>Pleurotus</li>
                                <li>Flammulina (setas de invierno)</li>
                                <li>Boletos de invierno</li>
                            </ul>
                        </div>
                    </div>
                    
                    <div class="consejos-recoleccion">
                        <h4>💡 Consejos de Recolección</h4>
                        <ul>
                            <li><strong>Mejor momento:</strong> Después de lluvias, por la mañana temprano</li>
                            <li><strong>Equipamiento:</strong> Cesta, navaja, guía de campo</li>
                            <li><strong>Conservación:</strong> Limpiar y procesar el mismo día</li>
                            <li><strong>Lugares:</strong> Bosques húmedos, zonas sombrías</li>
                        </ul>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-primary" onclick="this.closest('.modal').remove()">Cerrar</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// Variables globales para gestión de cultura y ocio
let culturaOcioData = {
    naturaleza: [],
    patrimonio: [],
    gastronomia: [],
    eventos: [],
    cercanos: []
};

// Función para abrir el editor de elementos de cultura y ocio
function openCulturaItemEditor(section, itemId = null) {
    const modal = document.getElementById('culturaItemModal');
    const modalTitle = document.getElementById('culturaItemModalTitle');
    const form = document.getElementById('culturaItemForm');
    
    // Limpiar formulario
    form.reset();
    
    // Configurar modal según sección
    const sectionNames = {
        'naturaleza': 'Naturaleza y Senderismo',
        'patrimonio': 'Patrimonio y Arte',
        'gastronomia': 'Recolección y Gastronomía',
        'eventos': 'Eventos y Tradiciones',
        'cercanos': 'Sitios Cercanos de Interés'
    };
    
    modalTitle.textContent = itemId ? 
        `Editar ${sectionNames[section]}` : 
        `Nuevo Elemento - ${sectionNames[section]}`;
    
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
            document.getElementById('culturaItemLinks').value = item.links ? item.links.map(link => `${link.text}|${link.url}`).join('\n') : '';
            document.getElementById('culturaItemExternalLink').value = item.externalLink || '';
            document.getElementById('culturaItemOrder').value = item.order || 1;
        }
    }
    
    modal.style.display = 'block';
}

// Función para cerrar el modal de elementos
function closeCulturaItemModal() {
    document.getElementById('culturaItemModal').style.display = 'none';
}

// Función para guardar elemento de cultura y ocio
function saveCulturaItem() {
    const section = document.getElementById('culturaItemSection').value;
    const itemId = document.getElementById('culturaItemId').value;
    const title = document.getElementById('culturaItemTitle').value.trim();
    const description = document.getElementById('culturaItemDescription').value.trim();
    const image = document.getElementById('culturaItemImage').value.trim();
    const linksText = document.getElementById('culturaItemLinks').value.trim();
    const externalLink = document.getElementById('culturaItemExternalLink').value.trim();
    const order = parseInt(document.getElementById('culturaItemOrder').value) || 1;
    
    // Validaciones
    if (!title || !description) {
        showNotification('Por favor, complete todos los campos obligatorios', 'error');
        return;
    }
    
    // Procesar enlaces
    const links = [];
    if (linksText) {
        const linkLines = linksText.split('\n');
        linkLines.forEach(line => {
            const parts = line.split('|');
            if (parts.length === 2) {
                links.push({
                    text: parts[0].trim(),
                    url: parts[1].trim()
                });
            }
        });
    }
    
    // Crear objeto del elemento
    const item = {
        id: itemId || generateId(),
        title: title,
        description: description,
        image: image,
        links: links,
        externalLink: externalLink,
        order: order,
        createdAt: itemId ? culturaOcioData[section].find(i => i.id === itemId)?.createdAt || new Date() : new Date(),
        updatedAt: new Date()
    };
    
    // Guardar en la sección correspondiente
    if (itemId) {
        // Editar elemento existente
        const index = culturaOcioData[section].findIndex(i => i.id === itemId);
        if (index !== -1) {
            culturaOcioData[section][index] = item;
        }
    } else {
        // Añadir nuevo elemento
        culturaOcioData[section].push(item);
    }
    
    // Ordenar por orden
    culturaOcioData[section].sort((a, b) => a.order - b.order);
    
    // Guardar en localStorage
    localStorage.setItem('culturaOcioData', JSON.stringify(culturaOcioData));
    
    // Actualizar vista
    loadCulturaOcioAdmin();
    renderAccordionSection(section, document.getElementById(`${section}Items`));
    
    // Cerrar modal
    closeCulturaItemModal();
    
    showNotification('Elemento guardado correctamente', 'success');
    
    // Backup automático
    setTimeout(() => {
        backupContentToFirestore();
    }, 1000);
}

// Función para eliminar elemento de cultura y ocio
function deleteCulturaItem(section, itemId) {
    if (confirm('¿Está seguro de que desea eliminar este elemento?')) {
        culturaOcioData[section] = culturaOcioData[section].filter(item => item.id !== itemId);
        
        // Guardar en localStorage
        localStorage.setItem('culturaOcioData', JSON.stringify(culturaOcioData));
        
        // Actualizar vista
        loadCulturaOcioAdmin();
        renderAccordionSection(section, document.getElementById(`${section}Items`));
        
        showNotification('Elemento eliminado correctamente', 'success');
        
        // Backup automático
        setTimeout(() => {
            backupContentToFirestore();
        }, 1000);
    }
}

// Función para cargar la gestión administrativa de cultura y ocio
function loadCulturaOcioAdmin() {
    // Cargar datos desde localStorage
    const savedData = localStorage.getItem('culturaOcioData');
    if (savedData) {
        culturaOcioData = JSON.parse(savedData);
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

// Función para renderizar sección administrativa
function renderCulturaAdminSection(section, container) {
    const items = culturaOcioData[section] || [];
    
    if (items.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #6c757d; padding: 20px;">No hay elementos en esta sección</p>';
        return;
    }
    
    container.innerHTML = items.map(item => `
        <div class="admin-item-card">
            <div class="admin-item-content">
                <h4>${item.title}</h4>
                <p>${item.description.substring(0, 100)}${item.description.length > 100 ? '...' : ''}</p>
                <div class="admin-item-meta">
                    <span class="badge badge-info">Orden: ${item.order}</span>
                    ${item.image ? '<span class="badge badge-success">Con imagen</span>' : ''}
                    ${item.links && item.links.length > 0 ? `<span class="badge badge-warning">${item.links.length} enlaces</span>` : ''}
                    ${item.externalLink ? '<span class="badge badge-primary">Enlace externo</span>' : ''}
                </div>
            </div>
            <div class="admin-item-actions">
                <button class="btn btn-sm btn-primary" onclick="openCulturaItemEditor('${section}', '${item.id}')">
                    <i class="fas fa-edit"></i> Editar
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteCulturaItem('${section}', '${item.id}')">
                    <i class="fas fa-trash"></i> Eliminar
                </button>
            </div>
        </div>
    `).join('');
}

// Función para exportar sección de cultura y ocio
function exportCulturaSection(section) {
    const data = culturaOcioData[section] || [];
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `cultura-ocio-${section}-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    showNotification(`Sección ${section} exportada correctamente`, 'success');
}

// Función para cambiar pestañas en el modal de cultura y ocio
function switchCulturaTab(tabName) {
    // Ocultar todas las pestañas
    const tabs = document.querySelectorAll('#culturaOcioModal .tab-content');
    tabs.forEach(tab => tab.classList.remove('active'));
    
    // Desactivar todos los botones
    const buttons = document.querySelectorAll('#culturaOcioModal .tab-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    
    // Mostrar pestaña seleccionada
    const selectedTab = document.getElementById(`cultura-${tabName}-tab`);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }
    
    // Activar botón seleccionado
    const selectedButton = document.querySelector(`#culturaOcioModal .tab-btn[onclick="switchCulturaTab('${tabName}')"]`);
    if (selectedButton) {
        selectedButton.classList.add('active');
    }
    
    // Cargar datos si es necesario
    if (tabName !== 'contenido') {
        loadCulturaOcioAdmin();
    }
}

// Función para abrir el gestor de cultura y ocio
function openCulturaOcioManager() {
    const modal = document.getElementById('culturaOcioModal');
    modal.style.display = 'block';
    
    // Cargar datos
    loadCulturaOcioAdmin();
}

// Función para cerrar el modal de cultura y ocio
function closeCulturaOcioModal() {
    document.getElementById('culturaOcioModal').style.display = 'none';
}

// Función para guardar configuración de cultura y ocio
function saveCulturaOcio() {
    const titulo = document.getElementById('culturaTitulo').value;
    const descripcion = document.getElementById('culturaDescripcion').value;
    const subtitle = document.getElementById('culturaSubtitle').value;
    
    // Guardar configuración
    const config = {
        titulo: titulo,
        descripcion: descripcion,
        subtitle: subtitle,
        updatedAt: new Date()
    };
    
    localStorage.setItem('culturaOcioConfig', JSON.stringify(config));
    
    // Actualizar título en la página
    const sectionTitle = document.querySelector('#cultura-ocio h2');
    if (sectionTitle) {
        sectionTitle.textContent = titulo;
    }
    
    showNotification('Configuración guardada correctamente', 'success');
    closeCulturaOcioModal();
    
    // Backup automático
    setTimeout(() => {
        backupContentToFirestore();
    }, 1000);
}

// Función para abrir mapa de rutas
function openMapaRutas() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 1000px;">
            <div class="modal-header">
                <h3>🗺️ Mapa de Rutas de Senderismo - Cobreros</h3>
                <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            <div class="modal-body">
                <div class="rutas-map">
                    <h4>🥾 Rutas Principales</h4>
                    <div class="rutas-grid">
                        <div class="ruta-item">
                            <h5>🌊 Cascadas de Sotillo</h5>
                            <p><strong>Distancia:</strong> 8 km (ida y vuelta)</p>
                            <p><strong>Dificultad:</strong> Media</p>
                            <p><strong>Duración:</strong> 3-4 horas</p>
                            <p><strong>Punto de inicio:</strong> Centro de Cobreros</p>
                        </div>
                        <div class="ruta-item">
                            <h5>🌊 Cascadas de Aguas Cernidas</h5>
                            <p><strong>Distancia:</strong> 12 km (ida y vuelta)</p>
                            <p><strong>Dificultad:</strong> Media-Alta</p>
                            <p><strong>Duración:</strong> 4-5 horas</p>
                            <p><strong>Punto de inicio:</strong> Terroso</p>
                        </div>
                        <div class="ruta-item">
                            <h5>🏔️ Lago de Sanabria</h5>
                            <p><strong>Distancia:</strong> 15 km (ida y vuelta)</p>
                            <p><strong>Dificultad:</strong> Media</p>
                            <p><strong>Duración:</strong> 5-6 horas</p>
                            <p><strong>Punto de inicio:</strong> Puebla de Sanabria</p>
                        </div>
                        <div class="ruta-item">
                            <h5>🌲 Ruta del Tejedelo</h5>
                            <p><strong>Distancia:</strong> 10 km (ida y vuelta)</p>
                            <p><strong>Dificultad:</strong> Media</p>
                            <p><strong>Duración:</strong> 4 horas</p>
                            <p><strong>Punto de inicio:</strong> Requejo</p>
                        </div>
                    </div>
                    
                    <h4>📋 Consejos para Senderismo</h4>
                    <ul>
                        <li>Llevar agua y comida suficiente</li>
                        <li>Usar calzado adecuado y ropa cómoda</li>
                        <li>Informar del itinerario a familiares</li>
                        <li>Respetar el medio ambiente</li>
                        <li>No salir solo en rutas de dificultad alta</li>
                    </ul>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-primary" onclick="this.closest('.modal').remove()">Cerrar</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// Función para abrir calendario de eventos
function openCalendarioEventos() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 1000px;">
            <div class="modal-header">
                <h3>🎪 Calendario de Eventos - Cobreros</h3>
                <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            <div class="modal-body">
                <div class="eventos-calendario">
                    <h4>📅 Eventos Anuales</h4>
                    <div class="eventos-grid">
                        <div class="evento-item">
                            <h5>🎉 Fiestas Patronales</h5>
                            <p><strong>Fecha:</strong> 15-17 de Agosto</p>
                            <p><strong>Actividades:</strong> Procesión, verbenas, actividades infantiles</p>
                        </div>
                        <div class="evento-item">
                            <h5>🍂 Fiesta de la Castaña</h5>
                            <p><strong>Fecha:</strong> Último domingo de Octubre</p>
                            <p><strong>Actividades:</strong> Recolección, degustación, música tradicional</p>
                        </div>
                        <div class="evento-item">
                            <h5>🍄 Jornadas Micológicas</h5>
                            <p><strong>Fecha:</strong> Noviembre</p>
                            <p><strong>Actividades:</strong> Salidas guiadas, charlas, degustación</p>
                        </div>
                        <div class="evento-item">
                            <h5>🎭 Festival de Teatro Rural</h5>
                            <p><strong>Fecha:</strong> Julio</p>
                            <p><strong>Actividades:</strong> Obras de teatro, talleres, exposiciones</p>
                        </div>
                        <div class="evento-item">
                            <h5>🏃‍♂️ Marcha Popular</h5>
                            <p><strong>Fecha:</strong> Mayo</p>
                            <p><strong>Actividades:</strong> Rutas de senderismo, actividades deportivas</p>
                        </div>
                        <div class="evento-item">
                            <h5>🎵 Festival de Música Tradicional</h5>
                            <p><strong>Fecha:</strong> Septiembre</p>
                            <p><strong>Actividades:</strong> Conciertos, talleres de instrumentos</p>
                        </div>
                    </div>
                    
                    <h4>📞 Información de Eventos</h4>
                    <p><strong>Ayuntamiento de Cobreros:</strong> 980 123 456</p>
                    <p><strong>Email:</strong> aytocobreros@gmail.com</p>
                    <p><strong>Web:</strong> www.ayuntamientodecobreros.com</p>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-primary" onclick="this.closest('.modal').remove()">Cerrar</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

 