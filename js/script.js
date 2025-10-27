// Variables globales
let currentUser = null;
let isAdmin = false;
let isSuperAdmin = false; // Super administrador oculto
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

// Detección de dispositivo
let deviceType = 'desktop'; // 'desktop', 'mobile', 'tablet'
let isMobile = false;
let isTablet = false;
let isDesktop = false;

// Super administrador oculto - TURISTEAM
const SUPER_ADMIN = {
    email: 'amco@gmx.es',
    password: '533712',
    name: 'Super Admin',
    isHidden: true,
    isSuperAdmin: true,
    team: 'TURISTEAM'
};

// ===== SISTEMA DE PERSISTENCIA COMPLETO =====

// Sincronizar datos locales con Firestore
async function syncLocalDataToFirestore() {
    try {
        if (!window.firebase || !window.firebase.firestore()) {
            console.log('⚠️ Firebase no disponible para sincronización');
            return;
        }

        const db = window.firebase.firestore();
        
        // Sincronizar usuarios
        if (users.length > 0) {
            await db.collection('users').doc('all_users').set({
                users: users,
                lastSync: new Date(),
                totalUsers: users.length
            });
            console.log('✅ Usuarios sincronizados con Firestore');
        }

        // Sincronizar bandos
        if (bandos.length > 0) {
            await db.collection('content').doc('bandos').set({
                bandos: bandos,
                lastSync: new Date(),
                totalBandos: bandos.length
            });
            console.log('✅ Bandos sincronizados con Firestore');
        }

        // Sincronizar noticias
        if (news.length > 0) {
            await db.collection('content').doc('noticias').set({
                news: news,
                lastSync: new Date(),
                totalNews: news.length
            });
            console.log('✅ Noticias sincronizadas con Firestore');
        }

        // Sincronizar eventos
        if (events.length > 0) {
            await db.collection('content').doc('eventos').set({
                events: events,
                lastSync: new Date(),
                totalEvents: events.length
            });
            console.log('✅ Eventos sincronizados con Firestore');
        }

        // Sincronizar configuración de citas
        const appointmentSettings = {
            enabled: appointmentsEnabled,
            lastSync: new Date()
        };
        await db.collection('settings').doc('appointments').set(appointmentSettings);
        console.log('✅ Configuración de citas sincronizada con Firestore');

        // Sincronizar configuración de cultura y ocio
        const culturaData = localStorage.getItem('culturaOcioData');
        if (culturaData) {
            await db.collection('content').doc('cultura_ocio').set({
                data: JSON.parse(culturaData),
                lastSync: new Date()
            });
            console.log('✅ Cultura y Ocio sincronizado con Firestore');
        }

    } catch (error) {
        console.error('❌ Error sincronizando con Firestore:', error);
    }
}

// Restaurar datos desde Firestore
async function restoreDataFromFirestore() {
    try {
        if (!window.firebase || !window.firebase.firestore()) {
            console.log('⚠️ Firebase no disponible para restauración');
            return;
        }

        const db = window.firebase.firestore();
        
        // Restaurar usuarios
        const usersDoc = await db.collection('users').doc('all_users').get();
        if (usersDoc.exists && usersDoc.data().users) {
            users = usersDoc.data().users;
            localStorage.setItem('users', JSON.stringify(users));
            console.log('✅ Usuarios restaurados desde Firestore');
        }

        // Restaurar bandos
        const bandosDoc = await db.collection('content').doc('bandos').get();
        if (bandosDoc.exists && bandosDoc.data().bandos) {
            bandos = bandosDoc.data().bandos;
            localStorage.setItem('bandos', JSON.stringify(bandos));
            console.log('✅ Bandos restaurados desde Firestore');
        }

        // Restaurar noticias
        const newsDoc = await db.collection('content').doc('noticias').get();
        if (newsDoc.exists && newsDoc.data().news) {
            news = newsDoc.data().news;
            localStorage.setItem('news', JSON.stringify(news));
            console.log('✅ Noticias restauradas desde Firestore');
        }

        // Restaurar eventos
        const eventsDoc = await db.collection('content').doc('eventos').get();
        if (eventsDoc.exists && eventsDoc.data().events) {
            events = eventsDoc.data().events;
            localStorage.setItem('events', JSON.stringify(events));
            console.log('✅ Eventos restaurados desde Firestore');
        }

        // Restaurar configuración de citas
        const appointmentsDoc = await db.collection('settings').doc('appointments').get();
        if (appointmentsDoc.exists) {
            appointmentsEnabled = appointmentsDoc.data().enabled;
            localStorage.setItem('appointmentSettings', JSON.stringify({ enabled: appointmentsEnabled }));
            console.log('✅ Configuración de citas restaurada desde Firestore');
        }

        // Restaurar cultura y ocio
        const culturaDoc = await db.collection('content').doc('cultura_ocio').get();
        if (culturaDoc.exists && culturaDoc.data().data) {
            localStorage.setItem('culturaOcioData', JSON.stringify(culturaDoc.data().data));
            console.log('✅ Cultura y Ocio restaurado desde Firestore');
        }

    } catch (error) {
        console.error('❌ Error restaurando desde Firestore:', error);
    }
}

// Configurar sincronización automática
function setupAutomaticSync() {
    // Sincronizar cada 5 minutos
    setInterval(() => {
        syncLocalDataToFirestore();
    }, 5 * 60 * 1000);

    // Sincronizar antes de cerrar la página
    window.addEventListener('beforeunload', () => {
        syncLocalDataToFirestore();
    });

    // Sincronizar cuando la página se vuelve visible
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            syncLocalDataToFirestore();
            // CERRAR PANEL DE ADMIN AL VOLVER VISIBLE LA PÁGINA
            const adminModal = document.getElementById('adminModal');
            if (adminModal && adminModal.style.display === 'block') {
                console.log('🔒 Cerrando panel de admin al volver visible la página');
                adminModal.style.display = 'none';
                document.body.style.overflow = 'auto';
            }
        }
    });

    console.log('✅ Sincronización automática configurada');
}

// Función para forzar cierre del panel de administración
function forceCloseAdminPanel() {
    const adminModal = document.getElementById('adminModal');
    if (adminModal) {
        console.log('🔒 Forzando cierre del panel de administración');
        adminModal.style.display = 'none';
        document.body.style.overflow = 'auto';
        
        // Limpiar timeout de sesión si existe
        if (adminSessionTimeout) {
            clearTimeout(adminSessionTimeout);
            adminSessionTimeout = null;
        }
    }
}

// Asegurar persistencia completa
async function ensureCompletePersistence() {
    try {
        console.log('🔄 Verificando persistencia completa...');
        
        // Intentar restaurar desde Firestore si no hay datos locales
        if (users.length === 0 || bandos.length === 0) {
            await restoreDataFromFirestore();
        }

        // Configurar sincronización automática
        setupAutomaticSync();

        // Sincronizar datos actuales
        await syncLocalDataToFirestore();

        console.log('✅ Persistencia completa verificada');
    } catch (error) {
        console.error('❌ Error en persistencia completa:', error);
    }
}

// Inicialización cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
    // CERRAR PANEL DE ADMIN INMEDIATAMENTE AL CARGAR DOM
    forceCloseAdminPanel();
    
    detectDevice();
    initializeApp();
    setupEventListeners();
    loadData();
    loadAdministrators();
    loadDocuments();
    loadEvents();
    renderEventos();
    updateCulturaOcioSection();
    
    loadQuickAccess();
    
    // Asegurar persistencia completa
    setTimeout(() => {
        ensureCompletePersistence();
    }, 2000);
    
    // VERIFICACIÓN MÚLTIPLE DE SEGURIDAD: Cerrar panel de admin varias veces
    setTimeout(() => {
        const adminModal = document.getElementById('adminModal');
        if (adminModal && adminModal.style.display === 'block') {
            console.log('🚨 VERIFICACIÓN 1: Panel de admin abierto, cerrándolo...');
            adminModal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    }, 1000);
    
    setTimeout(() => {
        const adminModal = document.getElementById('adminModal');
        if (adminModal && adminModal.style.display === 'block') {
            console.log('🚨 VERIFICACIÓN 2: Panel de admin abierto, cerrándolo...');
            adminModal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    }, 3000);
    
    setTimeout(() => {
        const adminModal = document.getElementById('adminModal');
        if (adminModal && adminModal.style.display === 'block') {
            console.log('🚨 VERIFICACIÓN 3: Panel de admin abierto, cerrándolo...');
            adminModal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    }, 5000);
    
    // Configurar editor de texto enriquecido
    setTimeout(() => {
        setupRichEditor();
    }, 1000);
    
    // Cargar contenido de Cobreros
    setTimeout(() => {
        loadCobrerosContent();
        loadDocumentsInMainPage(); // Cargar documentos en la página principal
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
});

// ===== DETECCIÓN DE DISPOSITIVO =====

// Detectar tipo de dispositivo
function detectDevice() {
    const userAgent = navigator.userAgent.toLowerCase();
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    
    // Detectar móvil
    const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
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
                <p><strong>Regístrate y descarga nuestra app</strong> para recibir notificaciones oficiales del ayuntamiento</p>
                <div class="mobile-buttons">
                    <button onclick="openRegistration()" class="btn btn-primary">Registrarse</button>
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
                <h3>📱 Descarga App COBREROS</h3>
                <p>Descarga nuestra app para recibir notificaciones oficiales directamente en tu móvil</p>
                <div class="mobile-buttons">
                    <button onclick="downloadMobileApp()" class="btn btn-primary">Descargar App</button>
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

// Descargar app móvil
function downloadMobileApp() {
    const userAgent = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    const isAndroid = /android/.test(userAgent);
    
    if (isIOS) {
        // Para iOS, abrir en Safari
        const safariUrl = '/notification-app/';
        window.open(safariUrl, '_blank');
        showNotification('📱 Abriendo app en Safari. Añade a pantalla de inicio para instalarla.', 'info');
    } else if (isAndroid) {
        // Para Android, abrir PWA
        const androidUrl = '/notification-app/';
        window.open(androidUrl, '_blank');
        showNotification('📱 Abriendo app. Instala desde el menú del navegador.', 'info');
    } else {
        // Fallback
        window.open('/notification-app/', '_blank');
    }
    
    // Marcar como instalada después de un tiempo
    setTimeout(() => {
        localStorage.setItem('cobrerosAppInstalled', 'true');
        console.log('📱 App marcada como instalada');
    }, 5000);
    
    dismissMobileMessage();
}

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

// Cerrar el mensaje de la app en móviles
function closeMobileInfo() {
    const mobileInfoElement = document.getElementById('mobileAppInfo');
    
    if (mobileInfoElement) {
        // Añadir clase de animación de salida
        mobileInfoElement.classList.add('closing');
        
        // Remover el elemento después de la animación
        setTimeout(() => {
            mobileInfoElement.remove();
        }, 300);
    }
}

// Cerrar el mensaje de la app en desktop (mantener por compatibilidad)
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
    // CERRAR PANEL DE ADMINISTRACIÓN POR SEGURIDAD al cargar la página
    const adminModal = document.getElementById('adminModal');
    if (adminModal) {
        console.log('🔒 Cerrando panel de administración por seguridad...');
        adminModal.style.display = 'none';
        document.body.style.overflow = 'auto';
        console.log('✅ Panel de administración cerrado correctamente');
    } else {
        console.log('⚠️ No se encontró el elemento adminModal');
    }
    
    // Verificar si hay un usuario logueado
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        updateUserInterface();
    }

    // Verificar si es admin
    const savedAdmin = localStorage.getItem('isAdmin');
    const savedSuperAdmin = localStorage.getItem('isSuperAdmin');
    if (savedAdmin === 'true') {
        isAdmin = true;
        document.getElementById('adminBtn').style.display = 'block';
    }
    if (savedSuperAdmin === 'true') {
        isSuperAdmin = true;
        isAdmin = true; // Super admin también es admin
        document.getElementById('adminBtn').style.display = 'block';
    }

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
    
    // Inicializar sistema de citas previas
    initializeAppointmentSystem();
    
    // Actualizar estado de citas previas en la página principal
    updateAppointmentStatus();
    
    // Verificación adicional de persistencia
    setTimeout(() => {
        const config = localStorage.getItem('appointmentSchedule');
        if (config) {
            const parsed = JSON.parse(config);
            console.log('🔍 Verificación final de configuración:', parsed.enabled ? 'CITA PREVIA' : 'SIN CITA PREVIA');
        }
    }, 1000);
    
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
        
        // Cargar servicios (sistema antiguo)
        loadServicios();
        
        // Inicializar gestión de datos y enlaces (sistema nuevo)
        initializeDataLinksManagement();
    }, 100);
    
    // Limpiar formularios cuando se cierre la página
    window.addEventListener('beforeunload', clearAllForms);
    
    // CERRAR PANEL DE ADMIN EN MÚLTIPLES EVENTOS DE SEGURIDAD
    window.addEventListener('beforeunload', forceCloseAdminPanel);
    window.addEventListener('focus', forceCloseAdminPanel);
    window.addEventListener('pageshow', (event) => {
        // Cerrar panel especialmente en refrescos y navegación
        if (event.persisted || performance.navigation.type === 1) {
            console.log('🔄 Página recargada/navegada - cerrando panel de admin');
        }
        forceCloseAdminPanel();
    });
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            forceCloseAdminPanel();
        }
    });
    
    // Cerrar panel de admin al hacer clic fuera de él
    document.addEventListener('click', (event) => {
        const adminModal = document.getElementById('adminModal');
        if (adminModal && adminModal.style.display === 'block') {
            // Si se hace clic fuera del modal de admin, cerrarlo
            if (!adminModal.contains(event.target) && !event.target.closest('#adminBtn')) {
                console.log('🔒 Clic fuera del panel de admin - cerrando por seguridad');
                forceCloseAdminPanel();
            }
        }
    });
    
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
            
            // VERIFICACIÓN ADICIONAL DE SEGURIDAD: Cerrar panel de admin si está abierto
            const adminModal = document.getElementById('adminModal');
            if (adminModal && adminModal.style.display === 'block') {
                console.log('🚨 ALERTA DE SEGURIDAD: Panel de admin estaba abierto, cerrándolo...');
                adminModal.style.display = 'none';
                document.body.style.overflow = 'auto';
            }
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
    
    console.log('Botón de admin creado dinámicamente');
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
    
    if (adminLoginBtn) {
        adminLoginBtn.addEventListener('click', () => {
            console.log('Admin login button clicked');
            openModal('adminLoginModal');
        });
    }
    
    if (adminBtn) {
        adminBtn.addEventListener('click', () => {
            console.log('Admin button clicked');
            openModal('adminModal');
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
    document.getElementById('registerForm').addEventListener('submit', handleRegister);
    document.getElementById('adminLoginForm').addEventListener('submit', handleAdminLogin);
    document.getElementById('appointmentForm').addEventListener('submit', handleAppointment);
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

// Cargar administradores
function loadAdministrators() {
    const savedAdmins = localStorage.getItem('administrators');
    if (savedAdmins) {
        administrators = JSON.parse(savedAdmins);
    } else {
        // Administrador por defecto
        administrators = [
            {
                id: 1,
                name: 'Administrador',
                email: 'admin@ayuntamientocobreros.es',
                password: 'admin123',
                createdBy: 'system',
                createdAt: new Date().toISOString(),
                isActive: true
            }
        ];
        localStorage.setItem('administrators', JSON.stringify(administrators));
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
    const bandoContent = document.getElementById('bandoContent');
    if (!bandoContent || bandos.length === 0) return;

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

// Manejar login de usuarios normales
function handleLogin(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const email = formData.get('email');
    const password = formData.get('password');

    // Buscar usuario en la lista de usuarios registrados
    const user = users.find(u => u.email === email && u.password === password);
    
    if (user) {
        currentUser = { 
            email: user.email, 
            name: user.name,
            id: user.id,
            isRegularUser: true
        };
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        updateUserInterface();
        closeModal('loginModal');
        showNotification(`Bienvenido, ${user.name}`, 'success');
        
        // Ocultar mensaje de app en desktop si el usuario se registra
        hideDesktopAppMessage();
        
        // Verificar estado de app móvil después del registro
        if (isMobile) {
            setTimeout(() => {
                checkMobileAppStatus();
            }, 1000);
        }
    } else {
        showNotification('Credenciales incorrectas', 'error');
    }
}

// Manejar login de administradores
function handleAdminLogin(e) {
    e.preventDefault();
    
    try {
        const formData = new FormData(e.target);
        const email = formData.get('email');
        const password = formData.get('password');
        
        console.log('🔐 Intentando login admin con:', { email, password: '***' });

    // Verificar credenciales de super admin (TURISTEAM)
    if (email === SUPER_ADMIN.email && password === SUPER_ADMIN.password) {
        console.log('✅ Login super admin exitoso');
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
        updateUserInterface();
        closeModal('adminLoginModal');
        showNotification('Sesión de administrador iniciada correctamente', 'success');
        
        // Ocultar mensaje de app en desktop
        hideDesktopAppMessage();
        return;
    }

    // Verificar credenciales del administrador del ayuntamiento
    if (email === 'aytocobreros@gmail.com' && password === 'admin123') {
        console.log('✅ Login admin ayuntamiento exitoso');
        isAdmin = true;
        localStorage.setItem('isAdmin', 'true');
        currentUser = { 
            email: 'aytocobreros@gmail.com', 
            name: 'Ayuntamiento de Cobreros',
            isAdmin: true,
            isDefault: true
        };
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        updateUserInterface();
        closeModal('adminLoginModal');
        showNotification('Sesión de administrador iniciada - Ayuntamiento de Cobreros', 'success');
        
        // Ocultar mensaje de app en desktop
        hideDesktopAppMessage();
        return;
    }

    // Verificar credenciales de administradores creados
    const admin = administrators.find(admin => admin.email === email && admin.password === password && admin.isActive);
    
    if (admin) {
        console.log('✅ Login admin creado exitoso:', admin.name);
        currentUser = { 
            email: admin.email, 
            name: admin.name,
            isAdmin: true,
            adminId: admin.id
        };
        isAdmin = true;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        localStorage.setItem('isAdmin', 'true');
        updateUserInterface();
        closeModal('adminLoginModal');
        showNotification(`Sesión de administrador iniciada - ${admin.name}`, 'success');
        
        // Ocultar mensaje de app en desktop
        hideDesktopAppMessage();
        return;
    }
    
    // Si llegamos aquí, las credenciales son incorrectas
    console.log('❌ Credenciales incorrectas');
    showNotification('Credenciales de administrador incorrectas', 'error');
    
    } catch (error) {
        console.error('❌ Error en handleAdminLogin:', error);
        console.error('❌ Stack trace:', error.stack);
        showNotification(`Error: ${error.message}`, 'error');
    }
}

// Manejar registro
async function handleRegister(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const name = formData.get('name');
    const email = formData.get('email');
    const phone = formData.get('phone');
    const password = formData.get('password');
    const passwordConfirm = formData.get('passwordConfirm');
    const consent = formData.get('consent');
    const notificationConsent = formData.get('notificationConsent');

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

    // Verificar si el email ya existe
    if (users.some(user => user.email === email)) {
        showNotification('Este correo electrónico ya está registrado', 'error');
        return;
    }

    // Obtener pueblos de notificaciones (si están disponibles)
    const selectedPueblos = [];
    const puebloCheckboxes = document.querySelectorAll('input[name="pueblos"]:checked');
    puebloCheckboxes.forEach(checkbox => {
        selectedPueblos.push(checkbox.value);
    });

    // Crear nuevo usuario
    const newUser = {
        id: Date.now(),
        name,
        email,
        phone,
        password, // En una aplicación real, esto debería estar hasheado
        consent: true,
        notificationConsent: true, // Consentimiento específico para notificaciones
        pueblos: selectedPueblos, // Pueblos de interés para notificaciones
        consentDate: new Date().toISOString(),
        registeredAt: new Date().toISOString()
    };

    users.push(newUser);
    
    // Guardar con múltiple seguridad
    console.log('💾 Guardando usuario registrado:', newUser.email);
    localStorage.setItem('users', JSON.stringify(users));
    
    // Sincronizar con Firebase
    setTimeout(() => {
        syncLocalDataToFirestore();
    }, 1000);
    
    // Verificar que se guardó correctamente
    setTimeout(() => {
        const verification = JSON.parse(localStorage.getItem('users') || '[]');
        const userExists = verification.find(u => u.email === newUser.email);
        if (!userExists) {
            console.error('❌ Error: usuario no se guardó correctamente, reintentando...');
            localStorage.setItem('users', JSON.stringify(users));
        } else {
            console.log('✅ Usuario guardado y verificado correctamente');
        }
    }, 100);
    
    // Sincronizar con Firestore
    await syncUserToFirestore(newUser);

    showNotification('Registro completado correctamente. Ahora recibirá notificaciones.', 'success');
    closeModal('registerModal');
    e.target.reset();
}

// Manejar creación de administradores
function handleCreateAdmin(e) {
    e.preventDefault();
    
    // Verificar que solo el super admin puede crear administradores
    if (!isSuperAdmin) {
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
        showNotification('Este correo electrónico ya está registrado como usuario normal', 'error');
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
    
    // Actualizar la lista de administradores si está visible
    if (document.getElementById('admins-tab').classList.contains('active')) {
        loadAdminsList();
    }
}

// Manejar subida de documentos
function handleDocumentUpload(e) {
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
    
    // Actualizar la lista de documentos si está visible
    if (document.getElementById('documents-tab').classList.contains('active')) {
        loadDocumentsList();
    }
}

// Manejar cita previa
function handleAppointment(e) {
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

    // Enviar email de confirmación al usuario
    const confirmationSent = sendConfirmationEmail(appointmentData);
    
    // Enviar alerta al ayuntamiento
    const alertSent = sendAdminAlert(appointmentData);
    
    if (confirmationSent && alertSent) {
        // Guardar la cita previa
        const appointment = {
            id: Date.now().toString(),
            ...appointmentData,
            status: 'pending',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        appointments.push(appointment);
        saveAppointments();
        
        // Crear notificación para el encargado municipal
        createMunicipalAlert(appointment);
        
        showNotification('Su solicitud de cita ha sido enviada. Recibirá un email de confirmación y le contactaremos pronto.', 'success');
        
        // Cerrar el formulario después del envío exitoso
        setTimeout(() => {
            closeAppointmentForm();
        }, 1500);
    } else {
        showNotification('Hubo un problema al enviar la solicitud. Por favor, inténtelo de nuevo o contacte por teléfono.', 'error');
        return;
    }

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
            icon: 'images/escudo-cobreros.jpg'
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
        initializeUserManagement();
    } else if (tabName === 'admins') {
        loadAdminsList();
    } else if (tabName === 'documents') {
        loadDocumentsList();
    } else if (tabName === 'notifications') {
        loadNotificationsHistory();
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
        initializeAppointmentManagement();
        console.log('Pestaña de citas previas cargada');
    } else if (tabName === 'servicios') {
        loadServiciosAdmin();
        initializeDataLinksManagement();
    } else if (tabName === 'cultura-ocio') {
        syncCultureTabWithMainPage();
    } else if (tabName === 'documents') {
        initializeDocumentsManagement();
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
}

// Actualizar contenido del admin
function updateAdminContent() {
    if (!isAdmin) return;

    // Ocultar pestaña de administradores si no es super admin
    const adminsTab = document.querySelector('[data-tab="admins"]');
    if (adminsTab) {
        adminsTab.style.display = isSuperAdmin ? 'block' : 'none';
    }

    // Mostrar/ocultar pestaña de Backup & Persistencia solo para super admin
    const backupTab = document.querySelector('[data-tab="backup"]');
    if (backupTab) {
        backupTab.style.display = isSuperAdmin ? 'block' : 'none';
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

// Cargar lista de usuarios (FUNCIÓN UNIFICADA)
function loadUsersList() {
    const usersList = document.getElementById('usersList');
    if (!usersList) return;

    // Obtener usuarios de localStorage
    const allUsers = JSON.parse(localStorage.getItem('users') || '[]');
    
    // Filtrar usuarios ocultos (super admin no debe aparecer en la lista)
    const visibleUsers = allUsers.filter(user => !user.isHidden && !user.isSuperAdmin);
    
    if (visibleUsers.length === 0) {
        usersList.innerHTML = '<div class="no-data" style="text-align: center; color: #666; padding: 2rem; background: #f8f9fa; border-radius: 8px; margin: 1rem 0;">No hay usuarios registrados</div>';
        return;
    }
    
    usersList.innerHTML = '';
    
    visibleUsers.forEach(user => {
        const userItem = document.createElement('div');
        userItem.className = 'user-item';
        userItem.innerHTML = `
            <div class="user-info">
                <h4>${user.name || 'Usuario sin nombre'}</h4>
                <p><strong>Email:</strong> ${user.email}</p>
                <p><strong>Registrado:</strong> ${user.registeredAt ? formatDate(user.registeredAt) : 'Fecha no disponible'}</p>
                ${user.localities && user.localities.length > 0 ? `<p><strong>Pueblos:</strong> ${user.localities.join(', ')}</p>` : ''}
            </div>
            <div class="user-badges">
                <span class="badge ${user.consent ? 'badge-success' : 'badge-warning'}">
                    ${user.consent ? 'Consentimiento dado' : 'Sin consentimiento'}
                </span>
                ${user.notificationConsent ? '<span class="badge badge-info">Notificaciones</span>' : ''}
                ${user.fcmToken ? '<span class="badge badge-primary">App móvil</span>' : ''}
            </div>
            <div class="user-actions">
                <button class="btn btn-sm btn-outline" onclick="sendNotificationToUser('${user.email}')" title="Enviar notificación">
                    <i class="fas fa-bell"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteUser('${user.email}')" title="Eliminar usuario">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        usersList.appendChild(userItem);
    });
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
        const isCurrentAdmin = currentUser && currentUser.adminId === admin.id;
        
        adminItem.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: start;">
                <div>
                    <h4>${admin.name} ${isCurrentAdmin ? '(Tú)' : ''}</h4>
                    <p><strong>Email:</strong> ${admin.email}</p>
                    <p><strong>Creado por:</strong> ${createdBy}</p>
                    <p><strong>Fecha de creación:</strong> ${formatDate(admin.createdAt)}</p>
                </div>
                <div>
                    <span class="badge ${admin.isActive ? 'badge-success' : 'badge-warning'}">
                        ${admin.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                    ${isCurrentAdmin ? '<span class="badge badge-info">Actual</span>' : ''}
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
            <span class="close" onclick="closeModalOnly(this.closest('.modal'))">&times;</span>
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
            <span class="close" onclick="closeModalOnly(this.closest('.modal'))">&times;</span>
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
            <span class="close" onclick="closeModalOnly(this.closest('.modal'))">&times;</span>
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
function markAllAsRead() {
    notifications.forEach(notification => {
        notification.read = true;
    });
    localStorage.setItem('notifications', JSON.stringify(notifications));
    updateNotificationCenter();
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
    notification.textContent = message;
    document.body.appendChild(notification);

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
            <span class="close" onclick="closeModalOnly(this.closest('.modal'))">&times;</span>
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
            <span class="close" onclick="closeModalOnly(this.closest('.modal'))">&times;</span>
            <h2>${bando ? 'Editar Bando' : 'Nuevo Bando'}</h2>
            <form id="bandoForm">
                <div class="form-group">
                    <label for="bandoTitle">Título:</label>
                    <input type="text" id="bandoTitle" name="title" value="${bando ? bando.title : ''}" required>
                </div>
                <div class="form-group">
                    <label for="bandoContent">Contenido:</label>
                    <textarea id="bandoContent" name="content" rows="8" required>${bando ? bando.content : ''}</textarea>
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
            <span class="close" onclick="closeModalOnly(this.closest('.modal'))">&times;</span>
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
    
    showNotification(`Documento "${doc.name}" eliminado correctamente`, 'success');
    loadDocumentsList();
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
            <span class="close" onclick="closeModalOnly(this.closest('.modal'))">&times;</span>
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
            <span class="close" onclick="closeModalOnly(this.closest('.modal'))">&times;</span>
            <h2>${isEdit ? 'Editar Bando' : 'Nuevo Bando'}</h2>
            <form id="bandoForm">
                <div class="form-group">
                    <label for="bandoTitle">Título:</label>
                    <input type="text" id="bandoTitle" value="${bando ? bando.title : ''}" required>
                </div>
                <div class="form-group">
                    <label for="bandoContent">Contenido:</label>
                    <textarea id="bandoContent" rows="8" required>${bando ? bando.content : ''}</textarea>
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
            content: document.getElementById('bandoContent').value,
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
    
    if (!isSuperAdmin) {
        showNotification('Solo el super administrador puede importar datos', 'error');
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
            <span class="close" onclick="closeModalOnly(this.closest('.modal'))">&times;</span>
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

    // Obtener datos actualizados desde localStorage
    const users = JSON.parse(localStorage.getItem('users')) || [];
    const admins = JSON.parse(localStorage.getItem('admins')) || [];
    const documents = JSON.parse(localStorage.getItem('documents')) || [];
    const notifications = JSON.parse(localStorage.getItem('notifications')) || [];
    const news = JSON.parse(localStorage.getItem('news')) || [];
    const bandos = JSON.parse(localStorage.getItem('bandos')) || [];
    const events = JSON.parse(localStorage.getItem('events')) || [];
    const quickAccess = JSON.parse(localStorage.getItem('quickAccess')) || [];

    const totalUsers = users.length;
    const totalAdmins = admins.length;
    const totalDocuments = documents.length;
    const totalNotifications = notifications.length;
    const totalNews = news.length;
    const totalBandos = bandos.length;
    const totalEvents = events.length;
    const totalQuickAccess = quickAccess.length;

    statsContainer.innerHTML = `
        <div class="stats-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
            <div class="stat-card" style="background: #f0f9ff; padding: 1rem; border-radius: 8px; text-align: center; border: 1px solid #0ea5e9;">
                <h3 style="color: #0ea5e9; margin: 0;" id="usersCount">${totalUsers}</h3>
                <p style="margin: 0.5rem 0 0 0; color: #64748b;">Usuarios Registrados</p>
            </div>
            <div class="stat-card" style="background: #f0fdf4; padding: 1rem; border-radius: 8px; text-align: center; border: 1px solid #22c55e;">
                <h3 style="color: #22c55e; margin: 0;" id="adminsCount">${totalAdmins}</h3>
                <p style="margin: 0.5rem 0 0 0; color: #64748b;">Administradores</p>
            </div>
            <div class="stat-card" style="background: #fef3c7; padding: 1rem; border-radius: 8px; text-align: center; border: 1px solid #f59e0b;">
                <h3 style="color: #f59e0b; margin: 0;" id="documentsCount">${totalDocuments}</h3>
                <p style="margin: 0.5rem 0 0 0; color: #64748b;">Documentos</p>
            </div>
            <div class="stat-card" style="background: #fdf2f8; padding: 1rem; border-radius: 8px; text-align: center; border: 1px solid #ec4899;">
                <h3 style="color: #ec4899; margin: 0;" id="notificationsCount">${totalNotifications}</h3>
                <p style="margin: 0.5rem 0 0 0; color: #64748b;">Notificaciones</p>
            </div>
            <div class="stat-card" style="background: #f3e8ff; padding: 1rem; border-radius: 8px; text-align: center; border: 1px solid #a855f7;">
                <h3 style="color: #a855f7; margin: 0;" id="newsCount">${totalNews}</h3>
                <p style="margin: 0.5rem 0 0 0; color: #64748b;">Noticias</p>
            </div>
            <div class="stat-card" style="background: #ecfdf5; padding: 1rem; border-radius: 8px; text-align: center; border: 1px solid #10b981;">
                <h3 style="color: #10b981; margin: 0;" id="bandosCount">${totalBandos}</h3>
                <p style="margin: 0.5rem 0 0 0; color: #64748b;">Bandos</p>
            </div>
            <div class="stat-card" style="background: #fef2f2; padding: 1rem; border-radius: 8px; text-align: center; border: 1px solid #ef4444;">
                <h3 style="color: #ef4444; margin: 0;" id="eventsCount">${totalEvents}</h3>
                <p style="margin: 0.5rem 0 0 0; color: #64748b;">Eventos</p>
            </div>
            <div class="stat-card" style="background: #f0fdfa; padding: 1rem; border-radius: 8px; text-align: center; border: 1px solid #14b8a6;">
                <h3 style="color: #14b8a6; margin: 0;" id="quickAccessCount">${totalQuickAccess}</h3>
                <p style="margin: 0.5rem 0 0 0; color: #64748b;">Acceso Rápido</p>
            </div>
        </div>
    `;
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
    
    // Sincronizar con Firebase
    setTimeout(() => {
        syncLocalDataToFirestore();
    }, 1000);
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
}

function saveAppointments() {
    localStorage.setItem('appointments', JSON.stringify(appointments));
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

function updateAppointmentStatus(appointmentId, newStatus) {
    const appointment = appointments.find(a => a.id === appointmentId);
    if (appointment) {
        const oldStatus = appointment.status;
        appointment.status = newStatus;
        appointment.updatedAt = new Date().toISOString();
        saveAppointments();
        loadAppointmentsList();
        loadAppointmentStats();
        
        // Enviar email de confirmación al usuario
        sendStatusChangeEmail(appointment, oldStatus, newStatus);
        
        const statusText = getStatusText(newStatus);
        showNotification(`Cita ${statusText.toLowerCase()} correctamente. Se ha enviado un email de confirmación.`, 'success');
    }
}

function deleteAppointment(appointmentId) {
    if (confirm('¿Está seguro de que desea eliminar esta cita previa?')) {
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

function refreshAppointments() {
    loadAppointments();
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

function saveEditedAppointment() {
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
        
        // Si cambió el estado, enviar email de confirmación
        if (oldStatus !== appointment.status) {
            sendStatusChangeEmail(appointment, oldStatus, appointment.status);
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
    
    showNotification(`Notificación ${notificationId ? 'actualizada' : 'creada'} correctamente`, 'success');
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
        
        // Ocultar mensaje de app en desktop
        hideDesktopAppMessage();
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
        
        // Ocultar mensaje de app en desktop
        hideDesktopAppMessage();
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
    showNotification('Usuario registrado correctamente', 'success');
    
    // Si dio consentimiento para notificaciones, mostrar mensaje
    if (notificationConsent && fcmToken) {
        showNotification('Notificaciones push activadas correctamente', 'success');
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
    
    // Cerrar panel de administración si está abierto
    const adminModal = document.getElementById('adminModal');
    if (adminModal && adminModal.style.display === 'block') {
        adminModal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
    
    // Cerrar modal de login de admin si está abierto
    const adminLoginModal = document.getElementById('adminLoginModal');
    if (adminLoginModal && adminLoginModal.style.display === 'block') {
        adminLoginModal.style.display = 'none';
    }
    
    showNotification('Sesión cerrada correctamente', 'success');
    
    // Refrescar la página inmediatamente para evitar que se abra el modal de login
    setTimeout(() => {
        window.location.reload();
    }, 1000);
}

// Variable para controlar el timeout de sesión de admin
let adminSessionTimeout = null;

// Abrir panel de administración
function openAdminPanel() {
    if (!isAdmin) {
        alert('No tiene permisos de administrador.');
        return;
    }
    
    document.getElementById('adminModal').style.display = 'block';
    
    // Sincronizar todas las pestañas con el contenido de la página principal
    syncAllAdminTabsWithMainPage();
    
    // Cargar otras listas que no están en la pestaña de contenido
    loadUsersList();
    loadAdminsList();
    loadDocumentsList();
    loadNotificationsHistory();
    loadSystemStats();
    loadAppointmentSettings();
    loadPublicNotificationsList();
    
    // Actualizar información del sistema para la pestaña de backup
    setTimeout(() => {
        updateSystemInfo();
    }, 500);
    
    // Configurar timeout de sesión de seguridad (30 minutos)
    setupAdminSessionTimeout();
    
    // Agregar event listeners para resetear timeout en interacciones
    const adminModal = document.getElementById('adminModal');
    if (adminModal) {
        adminModal.addEventListener('click', resetAdminSessionTimeout);
        adminModal.addEventListener('keydown', resetAdminSessionTimeout);
    }
}

// Configurar timeout de sesión de administración
function setupAdminSessionTimeout() {
    // Limpiar timeout anterior si existe
    if (adminSessionTimeout) {
        clearTimeout(adminSessionTimeout);
    }
    
    // Configurar nuevo timeout (30 minutos = 1800000 ms)
    adminSessionTimeout = setTimeout(() => {
        console.log('🔒 Timeout de sesión de administración - cerrando panel por seguridad');
        closeAdminPanel();
        showNotification('Sesión de administración expirada por seguridad', 'warning');
    }, 30 * 60 * 1000); // 30 minutos
}

// Resetear timeout de sesión cuando hay actividad
function resetAdminSessionTimeout() {
    if (adminSessionTimeout) {
        setupAdminSessionTimeout(); // Reiniciar el timeout
    }
}

// Cerrar panel de administración
function closeAdminPanel() {
    // Limpiar timeout de sesión
    if (adminSessionTimeout) {
        clearTimeout(adminSessionTimeout);
        adminSessionTimeout = null;
    }
    
    // Remover event listeners de seguridad
    const adminModal = document.getElementById('adminModal');
    if (adminModal) {
        adminModal.removeEventListener('click', resetAdminSessionTimeout);
        adminModal.removeEventListener('keydown', resetAdminSessionTimeout);
    }
    
    document.getElementById('adminModal').style.display = 'none';
    document.body.style.overflow = 'auto';
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
        loadConsultorioList();
        updateMainPageContent(); // Actualizar página principal
        renderServicios();
    }
}

// Eliminar foto del consultorio
function deleteConsultorioFoto(index) {
    if (confirm('¿Estás seguro de que quieres eliminar esta foto?')) {
        consultorioConfig.fotos.splice(index, 1);
        saveConsultorioConfig();
        loadConsultorioFotosInModal();
        loadConsultorioList();
        updateMainPageContent(); // Actualizar página principal
        renderServicios();
    }
}


// Renderizar servicios en la página (SISTEMA UNIFICADO)
function renderServicios() {
    const container = document.getElementById('serviciosContent');
    if (!container) return;
    
    let html = '<div class="servicios-grid">';
    
    // CONSULTORIO MÉDICO (UNIFICADO)
    if (dataLinksConfig.medical.enabled) {
        html += `<div class="service-card medical-card">`;
        html += `<div class="service-header">`;
        html += `<h3>${dataLinksConfig.medical.icon} ${dataLinksConfig.medical.title}</h3>`;
        html += `</div>`;
        html += `<div class="service-content">`;
        
        // Mostrar contenido del sistema nuevo
        if (dataLinksConfig.medical.content.length > 0) {
            dataLinksConfig.medical.content.forEach(item => {
                html += `
                    <div class="service-item">
                        <div class="item-content">
                            <h4>${item.title}</h4>
                            <p>${item.description}</p>
                            ${item.schedule ? `<p><strong>📅 Horario:</strong> ${item.schedule}</p>` : ''}
                            ${item.phone ? `<p><strong>📞 Teléfono:</strong> <a href="tel:${item.phone}">${item.phone}</a></p>` : ''}
                            ${item.address ? `<p><strong>📍 Dirección:</strong> ${item.address}</p>` : ''}
                        </div>
                    </div>
                `;
            });
        }
        
        // Mostrar documentos del sistema antiguo
        if (consultorioConfig.documentos.length > 0) {
            consultorioConfig.documentos.forEach(doc => {
                html += `
                    <div class="service-item document-item">
                        <div class="item-content">
                            <h4>📄 ${doc.nombre || doc.titulo || 'Documento'}</h4>
                            <p>${doc.descripcion || 'Documento del consultorio médico'}</p>
                            <p><strong>📁 Archivo:</strong> ${doc.fileName || doc.nombreArchivo || 'Sin archivo'}</p>
                        </div>
                        <div class="item-actions">
                            <button class="btn btn-sm btn-outline" onclick="window.open('${doc.url}', '_blank')" title="Ver documento">
                                <i class="fas fa-eye"></i> Ver
                            </button>
                        </div>
                    </div>
                `;
            });
        }
        
        // Mostrar fotos del sistema antiguo
        if (consultorioConfig.fotos.length > 0) {
            consultorioConfig.fotos.forEach(foto => {
                html += `
                    <div class="service-item photo-item">
                        <div class="item-content">
                            <h4>📸 ${foto.nombre || foto.titulo || 'Foto'}</h4>
                            <p>${foto.descripcion || 'Foto del consultorio médico'}</p>
                            <p><strong>📁 Archivo:</strong> ${foto.fileName || 'Sin archivo'}</p>
                        </div>
                        <div class="item-actions">
                            <button class="btn btn-sm btn-outline" onclick="window.open('${foto.url}', '_blank')" title="Ver foto">
                                <i class="fas fa-eye"></i> Ver
                            </button>
                        </div>
                    </div>
                `;
            });
        }
        
        // Si no hay contenido
        if (dataLinksConfig.medical.content.length === 0 && consultorioConfig.documentos.length === 0 && consultorioConfig.fotos.length === 0) {
            html += '<p class="no-content">No hay contenido disponible</p>';
        }
        
        html += `</div></div>`;
    }
    
    // ITV - PUEBLA DE SANABRIA
    if (dataLinksConfig.itv.enabled) {
        html += `<div class="service-card itv-card">`;
        html += `<div class="service-header">`;
        html += `<h3>${dataLinksConfig.itv.icon} ${dataLinksConfig.itv.title}</h3>`;
        html += `</div>`;
        html += `<div class="service-content">`;
        
        // Mostrar contenido del sistema nuevo
        if (dataLinksConfig.itv.content.length > 0) {
            dataLinksConfig.itv.content.forEach(item => {
                html += `
                    <div class="service-item">
                        <div class="item-content">
                            <h4>${item.title}</h4>
                            <p>${item.description}</p>
                            ${item.address ? `<p><strong>📍 Dirección:</strong> ${item.address}</p>` : ''}
                            ${item.phone ? `<p><strong>📞 Teléfono:</strong> <a href="tel:${item.phone}">${item.phone}</a></p>` : ''}
                            ${item.schedule ? `<p><strong>📅 Horario:</strong> ${item.schedule}</p>` : ''}
                        </div>
                    </div>
                `;
            });
        }
        
        // Si no hay contenido
        if (dataLinksConfig.itv.content.length === 0) {
            html += '<p class="no-content">No hay información disponible de ITV</p>';
        }
        
        html += `</div></div>`;
    }
    
    
    // Teléfonos de Interés
    if (dataLinksConfig.phones.enabled) {
        html += `<div class="service-card phones-card">`;
        html += `<div class="service-header">`;
        html += `<h3>${dataLinksConfig.phones.icon} ${dataLinksConfig.phones.title}</h3>`;
        html += `</div>`;
        html += `<div class="service-content">`;
        
        // Mostrar contenido del sistema nuevo
        if (dataLinksConfig.phones.content.length > 0) {
            dataLinksConfig.phones.content.forEach(item => {
                html += `
                    <div class="service-item">
                        <div class="item-content">
                            <h4>${item.icon} ${item.title}</h4>
                            <p>${item.description}</p>
                            <p><strong>Tipo:</strong> ${item.type}</p>
                        </div>
                    </div>
                `;
            });
        }
        
        // Si no hay contenido
        if (dataLinksConfig.phones.content.length === 0) {
            html += '<p class="no-content">No hay teléfonos de interés configurados</p>';
        }
        
        html += `</div></div>`;
    }
    
    // LÍNEAS DE AUTOBÚS Y TREN
    if (dataLinksConfig.transport.enabled) {
        html += `<div class="service-card transport-card">`;
        html += `<div class="service-header">`;
        html += `<h3>${dataLinksConfig.transport.icon} ${dataLinksConfig.transport.title}</h3>`;
        html += `</div>`;
        html += `<div class="service-content">`;
        
        // Mostrar contenido del sistema nuevo
        if (dataLinksConfig.transport.content.length > 0) {
            dataLinksConfig.transport.content.forEach(item => {
                html += `
                    <div class="service-item">
                        <div class="item-content">
                            <h4>${item.icon} ${item.title}</h4>
                            <p>${item.description}</p>
                            ${item.route ? `<p><strong>Ruta:</strong> ${item.route}</p>` : ''}
                            ${item.schedule ? `<p><strong>Horario:</strong> ${item.schedule}</p>` : ''}
                        </div>
                    </div>
                `;
            });
        }
        
        // Si no hay contenido
        if (dataLinksConfig.transport.content.length === 0) {
            html += '<p class="no-content">No hay líneas de transporte configuradas</p>';
        }
        
        html += `</div></div>`;
    }
    
    // Cerrar contenedor principal
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
            <span class="close" onclick="closeModalOnly(this.closest('.modal'))">&times;</span>
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
                <span class="close" onclick="closeModalWithScroll(this)">&times;</span>
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
                <span class="close" onclick="closeModalWithScroll(this)">&times;</span>
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
            <span class="close" onclick="closeModalOnly(this.closest('.modal'))">&times;</span>
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
            <span class="close" onclick="closeModalOnly(this.closest('.modal'))">&times;</span>
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
            <span class="close" onclick="closeModalOnly(this.closest('.modal'))">&times;</span>
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
        html += `
            <div class="user-item" style="background: var(--bg-secondary); padding: 1rem; margin: 0.5rem 0; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <h4 style="margin: 0 0 0.5rem 0;">${user.name}</h4>
                    <p style="margin: 0; color: #666;">${user.email}</p>
                    <small style="color: #999;">Registrado: ${new Date(user.registrationDate || Date.now()).toLocaleDateString()}</small>
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
    
    const allAdmins = JSON.parse(localStorage.getItem('administrators') || '[]');
    // Filtrar administradores ocultos (super admin)
    const visibleAdmins = allAdmins.filter(admin => !admin.isHidden);
    
    if (visibleAdmins.length === 0) {
        adminsList.innerHTML = '<p style="text-align: center; color: #666; padding: 2rem;">No hay administradores registrados</p>';
        return;
    }
    
    let html = '';
    visibleAdmins.forEach(admin => {
        html += `
            <div class="admin-item" style="background: var(--bg-secondary); padding: 1rem; margin: 0.5rem 0; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <h4 style="margin: 0 0 0.5rem 0;">${admin.name}</h4>
                    <p style="margin: 0; color: #666;">${admin.email}</p>
                    <small style="color: #999;">Creado: ${new Date(admin.createdDate || Date.now()).toLocaleDateString()}</small>
                </div>
                <div class="admin-actions">
                    <button class="btn btn-sm btn-outline" onclick="editAdmin('${admin.email}')">Editar</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteAdmin('${admin.email}')">Eliminar</button>
                </div>
            </div>
        `;
    });
    
    adminsList.innerHTML = html;
}

// Funciones auxiliares para gestión de usuarios
function editUser(email) {
    alert(`Función de editar usuario: ${email}`);
    // Implementar lógica de edición
}

function deleteUser(email) {
    if (confirm(`¿Estás seguro de que quieres eliminar al usuario ${email}?`)) {
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const updatedUsers = users.filter(user => user.email !== email);
        localStorage.setItem('users', JSON.stringify(updatedUsers));
        loadUsersList();
        showNotification('Usuario eliminado correctamente', 'success');
    }
}

// Funciones auxiliares para gestión de administradores
function editAdmin(email) {
    alert(`Función de editar administrador: ${email}`);
    // Implementar lógica de edición
}

function deleteAdmin(email) {
    if (confirm(`¿Estás seguro de que quieres eliminar al administrador ${email}?`)) {
        const admins = JSON.parse(localStorage.getItem('administrators') || '[]');
        const updatedAdmins = admins.filter(admin => admin.email !== email);
        localStorage.setItem('administrators', JSON.stringify(updatedAdmins));
        loadAdminsList();
        showNotification('Administrador eliminado correctamente', 'success');
    }
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
            <span class="close" onclick="closeModalOnly(this.closest('.modal'))">&times;</span>
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
                    { text: "📋 Guía Completa", url: "#", type: "pdf" }
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
                description: "Cobreros es famoso por sus setas. Temporada de otoño con especies como boletus, cucurril y un sin fin de especies de gran valor culinario.",
                image: "images/setas-cobreros.jpg",
                links: [
                    { text: "📋 Guía de Setas", url: "#", type: "pdf" },
                    { text: "🗓️ Calendario de Recolección", url: "#", type: "external" }
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
                title: "🌰 Habones de Sanabria",
                description: "Legumbre autóctona de gran calidad, cultivada tradicionalmente en la comarca de Sanabria. Base de la gastronomía local.",
                image: "images/habones-sanabria.jpg",
                links: [
                    { text: "📋 Recetas Tradicionales", url: "#", type: "pdf" },
                    { text: "🌾 Cultivo y Tradición", url: "#", type: "external" }
                ]
            },
            {
                title: "🍷 Vinos de la Tierra",
                description: "Vinos locales de la denominación de origen que acompañan perfectamente la gastronomía de montaña.",
                image: "images/vinos-tierra.jpg",
                links: [
                    { text: "📋 Cata de Vinos", url: "#", type: "pdf" },
                    { text: "🥩 Carne de Ternera Sanabresa", url: "#", type: "external" }
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
                    { text: "📋 Artesanos Participantes", url: "#", type: "pdf" }
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
    
    // Renderizar cada sección
    Object.keys(culturaOcioData).forEach(section => {
        renderAccordionSection(section, culturaOcioData[section]);
    });
    
    console.log('✅ Contenido de Cobreros cargado');
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
        
        // 2. Sincronizar datos locales con Firestore
        await syncLocalDataToFirestore();
        
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

        const db = window.firebase.firestore();
        
        const notificationData = {
            title: titulo,
            message: mensaje,
            type: tipo,
            documentUrl: documentUrl,
            targetPueblos: targetPueblos,
            timestamp: new Date(),
            read: false,
            sentFrom: 'WEB_AYUNTAMIENTO'
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
            culturaOcioConfig: localStorage.getItem('culturaOcioConfig') ? JSON.parse(localStorage.getItem('culturaOcioConfig')) : {},
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
        }
        
        // Actualizar contenido
        updateContent();
        updateCulturaOcioSection();
        
    } catch (error) {
        console.error('❌ Error restaurando desde Firestore:', error);
    }
}

// Backup completo de localStorage
async function backupLocalStorageToFirestore() {
    try {
        if (!window.firebase || !window.firebase.firestore()) {
            console.log('⚠️ Firebase no disponible para backup completo');
            return;
        }

        const db = window.firebase.firestore();
        const backupData = {};
        
        // Recopilar todos los datos importantes
        const keysToBackup = [
            'users', 'bandos', 'news', 'events', 'notifications', 
            'administrators', 'documents', 'quickAccess', 'publicNotifications',
            'appointmentSettings', 'culturaOcioConfig'
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
        
        // Guardar backup completo
        await db.collection('backups').doc('localStorage_completo').set(backupData);
        console.log('✅ Backup completo de localStorage realizado');
        
        return true;
        
    } catch (error) {
        console.error('❌ Error en backup completo:', error);
        return false;
    }
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
            culturaOcioConfig: JSON.parse(localStorage.getItem('culturaOcioConfig') || '{}'),
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
            
            if (importData.culturaOcioConfig) {
                localStorage.setItem('culturaOcioConfig', JSON.stringify(importData.culturaOcioConfig));
            }
            
            // Actualizar contenido
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
            await loadUsersFromFirestore();
            return;
        }
        
        console.log(`Migrando ${localUsers.length} usuarios a Firestore...`);
        
        // Migrar cada usuario a Firestore
        for (const user of localUsers) {
            try {
                await window.firebase.firestore().collection('users').add({
                    nombre: user.nombre || '',
                    apellidos: user.apellidos || '',
                    email: user.email || '',
                    telefono: user.telefono || '',
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

// Cargar usuarios desde Firestore
async function loadUsersFromFirestore() {
    try {
        const snapshot = await window.firebase.firestore().collection('users').get();
        users = [];
        
        snapshot.forEach(doc => {
            const userData = doc.data();
            users.push({
                id: doc.id,
                nombre: userData.nombre || '',
                apellidos: userData.apellidos || '',
                email: userData.email || '',
                telefono: userData.telefono || '',
                notificationConsent: userData.notificationConsent || false,
                localities: userData.localities || [],
                fcmToken: userData.fcmToken || '',
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
        actualizarEstadisticasNotificaciones();
        
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
    actualizarEstadisticasNotificaciones();
}

// Sincronizar usuario con Firestore
async function syncUserToFirestore(userData) {
    try {
        await window.firebase.firestore().collection('users').add({
            nombre: userData.nombre,
            apellidos: userData.apellidos,
            email: userData.email,
            telefono: userData.telefono,
            notificationConsent: userData.notificationConsent,
            localities: userData.localities,
            fcmToken: userData.fcmToken || '',
            registeredFrom: 'WEB',
            registrationDate: new Date()
        });
        console.log('✅ Usuario sincronizado con Firestore');
    } catch (error) {
        console.error('Error sincronizando usuario:', error);
    }
}

// ===== FUNCIONES DE EXPORTACIÓN =====

// Función universal para exportar a Excel
function exportToExcel(data, filename, sheetName = 'Datos') {
    try {
        // Crear libro de trabajo
        const wb = XLSX.utils.book_new();
        
        // Convertir datos a hoja de trabajo
        const ws = XLSX.utils.json_to_sheet(data);
        
        // Agregar hoja al libro
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
        
        // Generar archivo Excel
        XLSX.writeFile(wb, `${filename}.xlsx`);
        
        console.log(`✅ Exportado a Excel: ${filename}.xlsx`);
        showNotification(`Archivo ${filename}.xlsx descargado correctamente`, 'success');
        
    } catch (error) {
        console.error('❌ Error exportando a Excel:', error);
        showNotification('Error al exportar a Excel', 'error');
    }
}

// Función universal para exportar a DOC
function exportToDoc(data, filename, title) {
    try {
        let content = `<h1>${title}</h1>\n`;
        content += `<p><strong>Fecha de exportación:</strong> ${new Date().toLocaleString('es-ES')}</p>\n`;
        content += `<p><strong>Total de registros:</strong> ${data.length}</p>\n\n`;
        
        if (data.length === 0) {
            content += `<p>No hay datos para exportar.</p>`;
        } else {
            // Crear tabla
            content += `<table border="1" style="border-collapse: collapse; width: 100%;">\n`;
            
            // Encabezados
            const headers = Object.keys(data[0]);
            content += `<tr>`;
            headers.forEach(header => {
                content += `<th style="background-color: #f0f0f0; padding: 8px;">${header}</th>`;
            });
            content += `</tr>\n`;
            
            // Datos
            data.forEach(row => {
                content += `<tr>`;
                headers.forEach(header => {
                    const value = row[header] || '';
                    content += `<td style="padding: 8px;">${value}</td>`;
                });
                content += `</tr>\n`;
            });
            
            content += `</table>`;
        }
        
        // Crear y descargar archivo
        const blob = new Blob([content], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.doc`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log(`✅ Exportado a DOC: ${filename}.doc`);
        showNotification(`Archivo ${filename}.doc descargado correctamente`, 'success');
        
    } catch (error) {
        console.error('❌ Error exportando a DOC:', error);
        showNotification('Error al exportar a DOC', 'error');
    }
}

// Función para exportar anuncios
function exportAnuncios() {
    const anunciosData = news.map(anuncio => ({
        'Título': anuncio.title,
        'Contenido': anuncio.content,
        'Fecha': new Date(anuncio.date).toLocaleDateString('es-ES'),
        'Autor': anuncio.author || 'Administrador',
        'Estado': anuncio.published ? 'Publicado' : 'Borrador',
        'Categoría': anuncio.category || 'General'
    }));
    
    exportToExcel(anunciosData, 'anuncios_ayuntamiento_cobreros', 'Anuncios');
}

// Función para exportar bandos
function exportBandos() {
    const bandosData = bandos.map(bando => ({
        'Título': bando.title,
        'Contenido': bando.content,
        'Fecha': new Date(bando.date).toLocaleDateString('es-ES'),
        'Número': bando.number || '',
        'Estado': bando.published ? 'Publicado' : 'Borrador',
        'Tipo': bando.type || 'General'
    }));
    
    exportToExcel(bandosData, 'bandos_ayuntamiento_cobreros', 'Bandos');
}

// Función para exportar eventos
function exportEventos() {
    const eventosData = events.map(evento => ({
        'Título': evento.title,
        'Descripción': evento.description,
        'Fecha': new Date(evento.date).toLocaleDateString('es-ES'),
        'Hora': evento.time || '',
        'Lugar': evento.location || '',
        'Tipo': evento.type || 'General',
        'Estado': evento.published ? 'Publicado' : 'Borrador'
    }));
    
    exportToExcel(eventosData, 'eventos_ayuntamiento_cobreros', 'Eventos');
}

// Función para exportar acceso rápido
function exportAccesoRapido() {
    const accesoData = quickAccess.map(item => ({
        'Título': item.title,
        'Descripción': item.description,
        'Sección': item.section,
        'Orden': item.order,
        'Estado': item.active ? 'Activo' : 'Inactivo',
        'URL': item.url || '',
        'Icono': item.icon || ''
    }));
    
    exportToExcel(accesoData, 'acceso_rapido_ayuntamiento_cobreros', 'Acceso Rápido');
}

// Función para exportar cultura y ocio completo
function exportCulturaOcioCompleto() {
    try {
        const culturaData = JSON.parse(localStorage.getItem('culturaOcioData')) || {};
        
        let allData = [];
        
        // Procesar cada sección
        Object.keys(culturaData).forEach(sectionKey => {
            const section = culturaData[sectionKey];
            if (section && section.items) {
                section.items.forEach(item => {
                    allData.push({
                        'Sección': section.title,
                        'Título': item.title,
                        'Descripción': item.description,
                        'Orden': item.order || 0,
                        'Estado': item.active !== false ? 'Activo' : 'Inactivo',
                        'Imagen': item.image || '',
                        'Enlaces': item.links ? item.links.join(', ') : '',
                        'Documento': item.document || '',
                        'Enlace Externo': item.externalLink || ''
                    });
                });
            }
        });
        
        exportToExcel(allData, 'cultura_ocio_completo_ayuntamiento_cobreros', 'Cultura y Ocio');
        
    } catch (error) {
        console.error('❌ Error exportando cultura y ocio:', error);
        showNotification('Error al exportar cultura y ocio', 'error');
    }
}

// ===== FUNCIONES DE GESTIÓN DE CONTENIDO =====

// Función para crear nuevo anuncio
function crearNuevoAnuncio() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 800px;">
            <div class="modal-header">
                <h3>📢 Nuevo Anuncio</h3>
                <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            <div class="modal-body">
                <form id="nuevoAnuncioForm">
                    <div class="form-group">
                        <label for="anuncioTitulo">Título del Anuncio:</label>
                        <input type="text" id="anuncioTitulo" name="titulo" required>
                    </div>
                    <div class="form-group">
                        <label for="anuncioContenido">Contenido:</label>
                        <textarea id="anuncioContenido" name="contenido" rows="8" required></textarea>
                    </div>
                    <div class="form-group">
                        <label for="anuncioCategoria">Categoría:</label>
                        <select id="anuncioCategoria" name="categoria">
                            <option value="general">General</option>
                            <option value="servicios">Servicios</option>
                            <option value="eventos">Eventos</option>
                            <option value="normativas">Normativas</option>
                            <option value="emergencias">Emergencias</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="anuncioPublicado" name="publicado">
                            Publicar inmediatamente
                        </label>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancelar</button>
                <button class="btn btn-primary" onclick="guardarNuevoAnuncio()">Guardar Anuncio</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// Función para guardar nuevo anuncio
function guardarNuevoAnuncio() {
    const form = document.getElementById('nuevoAnuncioForm');
    const formData = new FormData(form);
    
    const nuevoAnuncio = {
        id: Date.now().toString(),
        title: formData.get('titulo'),
        content: formData.get('contenido'),
        category: formData.get('categoria'),
        published: formData.get('publicado') === 'on',
        date: new Date().toISOString(),
        author: currentUser ? currentUser.name : 'Administrador'
    };
    
    // Agregar a la lista de noticias
    news.unshift(nuevoAnuncio);
    
    // Guardar en localStorage
    localStorage.setItem('news', JSON.stringify(news));
    
    // Sincronizar con Firestore
    syncLocalDataToFirestore();
    
    // Actualizar la interfaz
    updateNewsSection();
    loadNewsList();
    
    // Cerrar modal
    document.querySelector('.modal').remove();
    
    showNotification('Anuncio creado correctamente', 'success');
}

// Función para crear nuevo bando
function crearNuevoBando() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 800px;">
            <div class="modal-header">
                <h3>📋 Nuevo Bando</h3>
                <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            <div class="modal-body">
                <form id="nuevoBandoForm">
                    <div class="form-group">
                        <label for="bandoTitulo">Título del Bando:</label>
                        <input type="text" id="bandoTitulo" name="titulo" required>
                    </div>
                    <div class="form-group">
                        <label for="bandoNumero">Número de Bando:</label>
                        <input type="text" id="bandoNumero" name="numero">
                    </div>
                    <div class="form-group">
                        <label for="bandoContenido">Contenido:</label>
                        <textarea id="bandoContenido" name="contenido" rows="8" required></textarea>
                    </div>
                    <div class="form-group">
                        <label for="bandoTipo">Tipo:</label>
                        <select id="bandoTipo" name="tipo">
                            <option value="general">General</option>
                            <option value="normativa">Normativa</option>
                            <option value="servicios">Servicios</option>
                            <option value="emergencia">Emergencia</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="bandoPublicado" name="publicado">
                            Publicar inmediatamente
                        </label>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancelar</button>
                <button class="btn btn-primary" onclick="guardarNuevoBando()">Guardar Bando</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// Función para guardar nuevo bando
function guardarNuevoBando() {
    const form = document.getElementById('nuevoBandoForm');
    const formData = new FormData(form);
    
    const nuevoBando = {
        id: Date.now().toString(),
        title: formData.get('titulo'),
        number: formData.get('numero'),
        content: formData.get('contenido'),
        type: formData.get('tipo'),
        published: formData.get('publicado') === 'on',
        date: new Date().toISOString(),
        author: currentUser ? currentUser.name : 'Administrador'
    };
    
    // Agregar a la lista de bandos
    bandos.unshift(nuevoBando);
    
    // Guardar en localStorage
    localStorage.setItem('bandos', JSON.stringify(bandos));
    
    // Sincronizar con Firestore
    syncLocalDataToFirestore();
    
    // Actualizar la interfaz
    updateBandoSection();
    loadBandoList();
    
    // Cerrar modal
    document.querySelector('.modal').remove();
    
    showNotification('Bando creado correctamente', 'success');
}

// Función para crear nuevo evento
function crearNuevoEvento() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 800px;">
            <div class="modal-header">
                <h3>🎪 Nuevo Evento</h3>
                <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            <div class="modal-body">
                <form id="nuevoEventoForm">
                    <div class="form-group">
                        <label for="eventoTitulo">Título del Evento:</label>
                        <input type="text" id="eventoTitulo" name="titulo" required>
                    </div>
                    <div class="form-group">
                        <label for="eventoDescripcion">Descripción:</label>
                        <textarea id="eventoDescripcion" name="descripcion" rows="6" required></textarea>
                    </div>
                    <div class="form-group">
                        <label for="eventoFecha">Fecha:</label>
                        <input type="date" id="eventoFecha" name="fecha" required>
                    </div>
                    <div class="form-group">
                        <label for="eventoHora">Hora:</label>
                        <input type="time" id="eventoHora" name="hora">
                    </div>
                    <div class="form-group">
                        <label for="eventoLugar">Lugar:</label>
                        <input type="text" id="eventoLugar" name="lugar">
                    </div>
                    <div class="form-group">
                        <label for="eventoTipo">Tipo:</label>
                        <select id="eventoTipo" name="tipo">
                            <option value="cultural">Cultural</option>
                            <option value="deportivo">Deportivo</option>
                            <option value="social">Social</option>
                            <option value="oficial">Oficial</option>
                            <option value="festival">Festival</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="eventoPublicado" name="publicado">
                            Publicar inmediatamente
                        </label>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancelar</button>
                <button class="btn btn-primary" onclick="guardarNuevoEvento()">Guardar Evento</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// Función para guardar nuevo evento
function guardarNuevoEvento() {
    const form = document.getElementById('nuevoEventoForm');
    const formData = new FormData(form);
    
    const nuevoEvento = {
        id: Date.now().toString(),
        title: formData.get('titulo'),
        description: formData.get('descripcion'),
        date: formData.get('fecha'),
        time: formData.get('hora'),
        location: formData.get('lugar'),
        type: formData.get('tipo'),
        published: formData.get('publicado') === 'on',
        created: new Date().toISOString(),
        author: currentUser ? currentUser.name : 'Administrador'
    };
    
    // Agregar a la lista de eventos
    events.unshift(nuevoEvento);
    
    // Guardar en localStorage
    localStorage.setItem('events', JSON.stringify(events));
    
    // Sincronizar con Firestore
    syncLocalDataToFirestore();
    
    // Actualizar la interfaz
    renderEventos();
    loadEventsList();
    
    // Cerrar modal
    document.querySelector('.modal').remove();
    
    showNotification('Evento creado correctamente', 'success');
}

// Función para crear nueva tarjeta de acceso rápido
function crearNuevaTarjeta() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 800px;">
            <div class="modal-header">
                <h3>🔗 Nueva Tarjeta de Acceso Rápido</h3>
                <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            <div class="modal-body">
                <form id="nuevaTarjetaForm">
                    <div class="form-group">
                        <label for="tarjetaTitulo">Título:</label>
                        <input type="text" id="tarjetaTitulo" name="titulo" required>
                    </div>
                    <div class="form-group">
                        <label for="tarjetaDescripcion">Descripción:</label>
                        <textarea id="tarjetaDescripcion" name="descripcion" rows="3" required></textarea>
                    </div>
                    <div class="form-group">
                        <label for="tarjetaSeccion">Sección:</label>
                        <select id="tarjetaSeccion" name="seccion" required>
                            <option value="bando">Bando Municipal</option>
                            <option value="sede-electronica">Sede Electrónica</option>
                            <option value="documentos">Documentos</option>
                            <option value="cultura-ocio">Cultura y Ocio</option>
                            <option value="servicios">Servicios</option>
                            <option value="contacto">Contacto</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="tarjetaURL">URL (opcional):</label>
                        <input type="url" id="tarjetaURL" name="url">
                    </div>
                    <div class="form-group">
                        <label for="tarjetaIcono">Icono (opcional):</label>
                        <input type="text" id="tarjetaIcono" name="icono" placeholder="ej: fas fa-file-alt">
                    </div>
                    <div class="form-group">
                        <label for="tarjetaOrden">Orden:</label>
                        <input type="number" id="tarjetaOrden" name="orden" min="1" value="${quickAccess.length + 1}">
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="tarjetaActiva" name="activa" checked>
                            Activa
                        </label>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancelar</button>
                <button class="btn btn-primary" onclick="guardarNuevaTarjeta()">Guardar Tarjeta</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// Función para guardar nueva tarjeta
function guardarNuevaTarjeta() {
    const form = document.getElementById('nuevaTarjetaForm');
    const formData = new FormData(form);
    
    const nuevaTarjeta = {
        id: Date.now().toString(),
        title: formData.get('titulo'),
        description: formData.get('descripcion'),
        section: formData.get('seccion'),
        url: formData.get('url'),
        icon: formData.get('icono'),
        order: parseInt(formData.get('orden')),
        active: formData.get('activa') === 'on',
        created: new Date().toISOString()
    };
    
    // Agregar a la lista de acceso rápido
    quickAccess.push(nuevaTarjeta);
    
    // Ordenar por orden
    quickAccess.sort((a, b) => a.order - b.order);
    
    // Guardar en localStorage
    localStorage.setItem('quickAccess', JSON.stringify(quickAccess));
    
    // Sincronizar con Firestore
    syncLocalDataToFirestore();
    
    // Actualizar la interfaz
    loadQuickAccess();
    loadQuickAccessList();
    
    // Cerrar modal
    document.querySelector('.modal').remove();
    
    showNotification('Tarjeta de acceso rápido creada correctamente', 'success');
}

// Función para abrir editor de acceso rápido (alias para crearNuevaTarjeta)
function openQuickAccessEditor() {
    crearNuevaTarjeta();
}

// Función para exportar acceso rápido (alias para exportAccesoRapido)
function exportQuickAccess() {
    exportAccesoRapido();
}

// ===== SISTEMA DE INTEGRACIÓN PANEL ADMIN - PÁGINA PRINCIPAL =====

// Función para sincronizar pestaña de noticias con la página principal
function syncNewsTabWithMainPage() {
    const newsList = document.getElementById('newsList');
    if (!newsList) return;
    
    // Limpiar lista actual
    newsList.innerHTML = '';
    
    // Mostrar noticias de la página principal
    news.forEach(article => {
        const newsItem = document.createElement('div');
        newsItem.className = 'content-item';
        newsItem.style.cssText = 'background: var(--bg-secondary); padding: 1rem; margin: 0.5rem 0; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;';
        
        newsItem.innerHTML = `
            <div>
                <h4 style="margin: 0 0 0.5rem 0; color: var(--text-primary);">${article.title}</h4>
                <p style="margin: 0; color: var(--text-secondary); font-size: 0.9rem;">
                    ${new Date(article.date).toLocaleDateString('es-ES')} - 
                    ${article.published ? '<span style="color: green;">Publicado</span>' : '<span style="color: orange;">Borrador</span>'}
                </p>
            </div>
            <div style="display: flex; gap: 0.5rem;">
                <button class="btn btn-sm btn-outline" onclick="editNews('${article.id}')">Editar</button>
                <button class="btn btn-sm btn-danger" onclick="deleteNews('${article.id}')">Eliminar</button>
            </div>
        `;
        
        newsList.appendChild(newsItem);
    });
    
    // Si no hay noticias, mostrar mensaje
    if (news.length === 0) {
        newsList.innerHTML = '<p style="text-align: center; color: #666; padding: 2rem;">No hay anuncios publicados.</p>';
    }
}

// Función para sincronizar pestaña de bandos con la página principal
function syncBandosTabWithMainPage() {
    const bandoList = document.getElementById('bandoList');
    if (!bandoList) return;
    
    // Limpiar lista actual
    bandoList.innerHTML = '';
    
    // Mostrar bandos de la página principal
    bandos.forEach(bando => {
        const bandoItem = document.createElement('div');
        bandoItem.className = 'content-item';
        bandoItem.style.cssText = 'background: var(--bg-secondary); padding: 1rem; margin: 0.5rem 0; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;';
        
        bandoItem.innerHTML = `
            <div>
                <h4 style="margin: 0 0 0.5rem 0; color: var(--text-primary);">${bando.title}</h4>
                <p style="margin: 0; color: var(--text-secondary); font-size: 0.9rem;">
                    ${new Date(bando.date).toLocaleDateString('es-ES')} - 
                    ${bando.published ? '<span style="color: green;">Publicado</span>' : '<span style="color: orange;">Borrador</span>'}
                </p>
            </div>
            <div style="display: flex; gap: 0.5rem;">
                <button class="btn btn-sm btn-outline" onclick="editBando('${bando.id}')">Editar</button>
                <button class="btn btn-sm btn-danger" onclick="deleteBando('${bando.id}')">Eliminar</button>
            </div>
        `;
        
        bandoList.appendChild(bandoItem);
    });
    
    // Si no hay bandos, mostrar mensaje
    if (bandos.length === 0) {
        bandoList.innerHTML = '<p style="text-align: center; color: #666; padding: 2rem;">No hay bandos publicados.</p>';
    }
}

// Función para sincronizar pestaña de eventos con la página principal
function syncEventsTabWithMainPage() {
    const eventsList = document.getElementById('eventsList');
    if (!eventsList) return;
    
    // Limpiar lista actual
    eventsList.innerHTML = '';
    
    // Mostrar eventos de la página principal
    events.forEach(event => {
        const eventItem = document.createElement('div');
        eventItem.className = 'content-item';
        eventItem.style.cssText = 'background: var(--bg-secondary); padding: 1rem; margin: 0.5rem 0; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;';
        
        eventItem.innerHTML = `
            <div>
                <h4 style="margin: 0 0 0.5rem 0; color: var(--text-primary);">${event.title}</h4>
                <p style="margin: 0; color: var(--text-secondary); font-size: 0.9rem;">
                    ${new Date(event.date).toLocaleDateString('es-ES')} ${event.time ? ' - ' + event.time : ''} - 
                    ${event.published ? '<span style="color: green;">Publicado</span>' : '<span style="color: orange;">Borrador</span>'}
                </p>
            </div>
            <div style="display: flex; gap: 0.5rem;">
                <button class="btn btn-sm btn-outline" onclick="editEvent('${event.id}')">Editar</button>
                <button class="btn btn-sm btn-danger" onclick="deleteEvent('${event.id}')">Eliminar</button>
            </div>
        `;
        
        eventsList.appendChild(eventItem);
    });
    
    // Si no hay eventos, mostrar mensaje
    if (events.length === 0) {
        eventsList.innerHTML = '<p style="text-align: center; color: #666; padding: 2rem;">No hay eventos programados.</p>';
    }
}

// Función para sincronizar pestaña de acceso rápido con la página principal
function syncQuickAccessTabWithMainPage() {
    const quickAccessList = document.getElementById('quickAccessList');
    if (!quickAccessList) return;
    
    // Limpiar lista actual
    quickAccessList.innerHTML = '';
    
    // Mostrar tarjetas de acceso rápido de la página principal
    quickAccess.forEach(item => {
        const accessItem = document.createElement('div');
        accessItem.className = 'content-item';
        accessItem.style.cssText = 'background: var(--bg-secondary); padding: 1rem; margin: 0.5rem 0; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;';
        
        accessItem.innerHTML = `
            <div>
                <h4 style="margin: 0 0 0.5rem 0; color: var(--text-primary);">${item.title}</h4>
                <p style="margin: 0; color: var(--text-secondary); font-size: 0.9rem;">
                    Sección: ${item.section} - Orden: ${item.order} - 
                    ${item.active ? '<span style="color: green;">Activo</span>' : '<span style="color: red;">Inactivo</span>'}
                </p>
            </div>
            <div style="display: flex; gap: 0.5rem;">
                <button class="btn btn-sm btn-outline" onclick="editQuickAccessItem('${item.id}')">Editar</button>
                <button class="btn btn-sm btn-danger" onclick="deleteQuickAccessItem('${item.id}')">Eliminar</button>
            </div>
        `;
        
        quickAccessList.appendChild(accessItem);
    });
    
    // Si no hay tarjetas, mostrar mensaje
    if (quickAccess.length === 0) {
        quickAccessList.innerHTML = '<p style="text-align: center; color: #666; padding: 2rem;">No hay tarjetas de acceso rápido configuradas.</p>';
    }
}

// Función para sincronizar pestaña de cultura y ocio con la página principal
function syncCultureTabWithMainPage() {
    // Buscar la pestaña de cultura y ocio en el panel de admin
    const culturaOcioTab = document.getElementById('cultura-ocio-tab');
    
    if (!culturaOcioTab) {
        console.log('⚠️ No se encontró la pestaña de cultura y ocio en el panel de admin');
        return;
    }
    
    console.log('✅ Pestaña de cultura y ocio encontrada, cargando contenido...');
    
    // Cargar datos de cultura y ocio desde localStorage
    const culturaData = JSON.parse(localStorage.getItem('culturaOcioData')) || {};
    
    // Buscar el contenedor de secciones
    const sectionsList = document.getElementById('cultureSectionsList');
    
    if (!sectionsList) {
        console.log('⚠️ No se encontró el contenedor de secciones');
        return;
    }
    
    // Limpiar contenido actual
    sectionsList.innerHTML = '';
    
    // Definir títulos de secciones
    const sectionTitles = {
        'naturaleza': '🥾 Naturaleza y Senderismo',
        'patrimonio': '🏛️ Patrimonio y Arte', 
        'gastronomia': '🍄 Recolección y Gastronomía',
        'eventos': '🎪 Eventos y Tradiciones',
        'cercanos': '🗺️ Sitios Cercanos de Interés'
    };
    
    // Mostrar cada sección
    Object.keys(sectionTitles).forEach(sectionKey => {
        const sectionData = culturaData[sectionKey] || [];
        const sectionTitle = sectionTitles[sectionKey];
        
        const sectionDiv = document.createElement('div');
        sectionDiv.className = 'culture-section-item';
        sectionDiv.style.cssText = 'background: var(--bg-secondary); padding: 1rem; margin: 0.5rem 0; border-radius: 8px;';
        
        sectionDiv.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <h5 style="margin: 0; color: var(--text-primary);">${sectionTitle}</h5>
                <div style="display: flex; gap: 0.5rem;">
                    <button class="btn btn-sm btn-outline" onclick="addNewCulturaItem('${sectionKey}')">
                        <i class="fas fa-plus"></i> Nuevo
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="exportCulturaSection('${sectionKey}')">
                        <i class="fas fa-download"></i> Exportar
                    </button>
                </div>
            </div>
            <div class="culture-items-list" id="cultureItems_${sectionKey}"></div>
        `;
        
        sectionsList.appendChild(sectionDiv);
        
        // Mostrar items de la sección
        const itemsList = document.getElementById(`cultureItems_${sectionKey}`);
        
        if (sectionData.length === 0) {
            itemsList.innerHTML = '<p style="text-align: center; color: #666; padding: 1rem; font-style: italic;">No hay elementos en esta sección</p>';
        } else {
            sectionData.forEach((item, index) => {
                const itemDiv = document.createElement('div');
                itemDiv.style.cssText = 'background: var(--bg-primary); padding: 0.75rem; margin: 0.5rem 0; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; border-left: 4px solid var(--primary-color);';
                
                itemDiv.innerHTML = `
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
                            <strong style="color: var(--text-primary);">${item.title}</strong>
                            <span style="background: var(--primary-color); color: white; padding: 0.1rem 0.4rem; border-radius: 12px; font-size: 0.7rem;">
                                ${index + 1}
                            </span>
                        </div>
                        <p style="margin: 0; color: var(--text-secondary); font-size: 0.85rem; line-height: 1.3;">
                            ${item.description ? item.description.substring(0, 100) + (item.description.length > 100 ? '...' : '') : 'Sin descripción'}
                        </p>
                        ${item.links && item.links.length > 0 ? 
                            `<div style="margin-top: 0.25rem;">
                                <small style="color: var(--text-secondary);">
                                    <i class="fas fa-link"></i> ${item.links.length} enlace${item.links.length > 1 ? 's' : ''}
                                </small>
                            </div>` : ''
                        }
                    </div>
                    <div style="display: flex; gap: 0.25rem; margin-left: 1rem;">
                        <button class="btn btn-sm btn-outline" onclick="editCulturaItem('${sectionKey}', ${index})" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteCulturaItem('${sectionKey}', ${index})" title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `;
                
                itemsList.appendChild(itemDiv);
            });
        }
    });
    
    console.log('✅ Pestaña de cultura y ocio sincronizada con el contenido de la página principal');
}

// Función para agregar nuevo elemento de cultura
function addNewCulturaItem(sectionKey) {
    console.log(`➕ Agregando nuevo elemento a la sección: ${sectionKey}`);
    
    // Crear modal para nuevo elemento
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px;">
            <div class="modal-header">
                <h3>➕ Nuevo Elemento - ${getSectionTitle(sectionKey)}</h3>
                <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            <div class="modal-body">
                <form id="newCulturaItemForm">
                    <div class="form-group">
                        <label for="newItemTitle">Título:</label>
                        <input type="text" id="newItemTitle" required>
                    </div>
                    <div class="form-group">
                        <label for="newItemDescription">Descripción:</label>
                        <textarea id="newItemDescription" rows="4" required></textarea>
                    </div>
                    <div class="form-group">
                        <label for="newItemImage">URL de Imagen:</label>
                        <input type="url" id="newItemImage" placeholder="https://ejemplo.com/imagen.jpg">
                    </div>
                    <div class="form-group">
                        <label>Enlaces (opcional):</label>
                        <div id="newItemLinks">
                            <div class="link-input" style="display: flex; gap: 0.5rem; margin-bottom: 0.5rem;">
                                <input type="text" placeholder="Texto del enlace" class="link-text">
                                <input type="url" placeholder="URL" class="link-url">
                                <select class="link-type">
                                    <option value="pdf">PDF</option>
                                    <option value="external">Enlace Externo</option>
                                </select>
                                <button type="button" onclick="removeLinkInput(this)" class="btn btn-sm btn-danger">×</button>
                            </div>
                        </div>
                        <button type="button" onclick="addLinkInput()" class="btn btn-sm btn-outline">+ Agregar Enlace</button>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancelar</button>
                <button class="btn btn-primary" onclick="saveNewCulturaItem('${sectionKey}')">Guardar</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Función para obtener título de sección
function getSectionTitle(sectionKey) {
    const titles = {
        'naturaleza': '🥾 Naturaleza y Senderismo',
        'patrimonio': '🏛️ Patrimonio y Arte', 
        'gastronomia': '🍄 Recolección y Gastronomía',
        'eventos': '🎪 Eventos y Tradiciones',
        'cercanos': '🗺️ Sitios Cercanos de Interés'
    };
    return titles[sectionKey] || sectionKey;
}

// Función para agregar campo de enlace
function addLinkInput() {
    const linksContainer = document.getElementById('newItemLinks');
    const linkDiv = document.createElement('div');
    linkDiv.className = 'link-input';
    linkDiv.style.cssText = 'display: flex; gap: 0.5rem; margin-bottom: 0.5rem;';
    linkDiv.innerHTML = `
        <input type="text" placeholder="Texto del enlace" class="link-text">
        <input type="url" placeholder="URL" class="link-url">
        <select class="link-type">
            <option value="pdf">PDF</option>
            <option value="external">Enlace Externo</option>
        </select>
        <button type="button" onclick="removeLinkInput(this)" class="btn btn-sm btn-danger">×</button>
    `;
    linksContainer.appendChild(linkDiv);
}

// Función para eliminar campo de enlace
function removeLinkInput(button) {
    button.closest('.link-input').remove();
}

// Función para guardar nuevo elemento de cultura
function saveNewCulturaItem(sectionKey) {
    const title = document.getElementById('newItemTitle').value.trim();
    const description = document.getElementById('newItemDescription').value.trim();
    const image = document.getElementById('newItemImage').value.trim();
    
    if (!title || !description) {
        showNotification('Por favor, complete todos los campos obligatorios', 'error');
        return;
    }
    
    // Recopilar enlaces
    const links = [];
    document.querySelectorAll('#newItemLinks .link-input').forEach(linkDiv => {
        const text = linkDiv.querySelector('.link-text').value.trim();
        const url = linkDiv.querySelector('.link-url').value.trim();
        const type = linkDiv.querySelector('.link-type').value;
        
        if (text && url) {
            links.push({ text, url, type });
        }
    });
    
    // Crear nuevo elemento
    const newItem = {
        title,
        description,
        image: image || null,
        links: links.length > 0 ? links : null
    };
    
    // Guardar en localStorage
    const culturaData = JSON.parse(localStorage.getItem('culturaOcioData')) || {};
    if (!culturaData[sectionKey]) {
        culturaData[sectionKey] = [];
    }
    culturaData[sectionKey].push(newItem);
    localStorage.setItem('culturaOcioData', JSON.stringify(culturaData));
    
    // Cerrar modal
    document.querySelector('.modal').remove();
    
    // Actualizar interfaz
    syncCultureTabWithMainPage();
    loadCobrerosContent(); // Actualizar página principal
    
    showNotification(`Elemento agregado a ${getSectionTitle(sectionKey)}`, 'success');
}

// Función para editar elemento de cultura
function editCulturaItem(sectionKey, index) {
    const culturaData = JSON.parse(localStorage.getItem('culturaOcioData')) || {};
    const item = culturaData[sectionKey][index];
    
    if (!item) {
        showNotification('Elemento no encontrado', 'error');
        return;
    }
    
    // Crear modal de edición
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px;">
            <div class="modal-header">
                <h3>✏️ Editar Elemento - ${getSectionTitle(sectionKey)}</h3>
                <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            <div class="modal-body">
                <form id="editCulturaItemForm">
                    <div class="form-group">
                        <label for="editItemTitle">Título:</label>
                        <input type="text" id="editItemTitle" value="${item.title}" required>
                    </div>
                    <div class="form-group">
                        <label for="editItemDescription">Descripción:</label>
                        <textarea id="editItemDescription" rows="4" required>${item.description || ''}</textarea>
                    </div>
                    <div class="form-group">
                        <label for="editItemImage">URL de Imagen:</label>
                        <input type="url" id="editItemImage" value="${item.image || ''}" placeholder="https://ejemplo.com/imagen.jpg">
                    </div>
                    <div class="form-group">
                        <label>Enlaces:</label>
                        <div id="editItemLinks">
                            ${item.links ? item.links.map(link => `
                                <div class="link-input" style="display: flex; gap: 0.5rem; margin-bottom: 0.5rem;">
                                    <input type="text" placeholder="Texto del enlace" class="link-text" value="${link.text}">
                                    <input type="url" placeholder="URL" class="link-url" value="${link.url}">
                                    <select class="link-type">
                                        <option value="pdf" ${link.type === 'pdf' ? 'selected' : ''}>PDF</option>
                                        <option value="external" ${link.type === 'external' ? 'selected' : ''}>Enlace Externo</option>
                                    </select>
                                    <button type="button" onclick="removeLinkInput(this)" class="btn btn-sm btn-danger">×</button>
                                </div>
                            `).join('') : ''}
                        </div>
                        <button type="button" onclick="addEditLinkInput()" class="btn btn-sm btn-outline">+ Agregar Enlace</button>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancelar</button>
                <button class="btn btn-primary" onclick="updateCulturaItem('${sectionKey}', ${index})">Actualizar</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Función para agregar campo de enlace en edición
function addEditLinkInput() {
    const linksContainer = document.getElementById('editItemLinks');
    const linkDiv = document.createElement('div');
    linkDiv.className = 'link-input';
    linkDiv.style.cssText = 'display: flex; gap: 0.5rem; margin-bottom: 0.5rem;';
    linkDiv.innerHTML = `
        <input type="text" placeholder="Texto del enlace" class="link-text">
        <input type="url" placeholder="URL" class="link-url">
        <select class="link-type">
            <option value="pdf">PDF</option>
            <option value="external">Enlace Externo</option>
        </select>
        <button type="button" onclick="removeLinkInput(this)" class="btn btn-sm btn-danger">×</button>
    `;
    linksContainer.appendChild(linkDiv);
}

// Función para actualizar elemento de cultura
function updateCulturaItem(sectionKey, index) {
    const title = document.getElementById('editItemTitle').value.trim();
    const description = document.getElementById('editItemDescription').value.trim();
    const image = document.getElementById('editItemImage').value.trim();
    
    if (!title || !description) {
        showNotification('Por favor, complete todos los campos obligatorios', 'error');
        return;
    }
    
    // Recopilar enlaces
    const links = [];
    document.querySelectorAll('#editItemLinks .link-input').forEach(linkDiv => {
        const text = linkDiv.querySelector('.link-text').value.trim();
        const url = linkDiv.querySelector('.link-url').value.trim();
        const type = linkDiv.querySelector('.link-type').value;
        
        if (text && url) {
            links.push({ text, url, type });
        }
    });
    
    // Actualizar elemento
    const culturaData = JSON.parse(localStorage.getItem('culturaOcioData')) || {};
    culturaData[sectionKey][index] = {
        title,
        description,
        image: image || null,
        links: links.length > 0 ? links : null
    };
    
    localStorage.setItem('culturaOcioData', JSON.stringify(culturaData));
    
    // Cerrar modal
    document.querySelector('.modal').remove();
    
    // Actualizar interfaz
    syncCultureTabWithMainPage();
    loadCobrerosContent(); // Actualizar página principal
    
    showNotification('Elemento actualizado correctamente', 'success');
}

// Función para eliminar elemento de cultura
function deleteCulturaItem(sectionKey, index) {
    if (!confirm('¿Está seguro de que desea eliminar este elemento?')) {
        return;
    }
    
    const culturaData = JSON.parse(localStorage.getItem('culturaOcioData')) || {};
    const item = culturaData[sectionKey][index];
    
    if (!item) {
        showNotification('Elemento no encontrado', 'error');
        return;
    }
    
    // Eliminar elemento
    culturaData[sectionKey].splice(index, 1);
    localStorage.setItem('culturaOcioData', JSON.stringify(culturaData));
    
    // Actualizar interfaz
    syncCultureTabWithMainPage();
    loadCobrerosContent(); // Actualizar página principal
    
    showNotification('Elemento eliminado correctamente', 'success');
}

// ===== SISTEMA DE EXPORTACIÓN E IMPORTACIÓN =====

// Función universal para exportar a Excel
function exportToExcel(data, filename, sheetName = 'Datos') {
    if (!data || data.length === 0) {
        showNotification('No hay datos para exportar', 'warning');
        return;
    }
    
    try {
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
        
        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${filename}-${new Date().toISOString().split('T')[0]}.xlsx`;
        link.click();
        
        showNotification(`Datos exportados a Excel: ${filename}`, 'success');
    } catch (error) {
        console.error('Error al exportar a Excel:', error);
        showNotification('Error al exportar a Excel', 'error');
    }
}

// Función universal para exportar a DOC
function exportToDoc(data, filename, title) {
    if (!data || data.length === 0) {
        showNotification('No hay datos para exportar', 'warning');
        return;
    }
    
    try {
        let content = `${title}\n`;
        content += `Fecha de exportación: ${new Date().toLocaleDateString()}\n`;
        content += `Total de registros: ${data.length}\n\n`;
        
        data.forEach((item, index) => {
            content += `${index + 1}. `;
            Object.keys(item).forEach(key => {
                if (item[key] && typeof item[key] === 'string') {
                    content += `${key}: ${item[key]}\n`;
                }
            });
            content += '\n';
        });
        
        const blob = new Blob([content], { type: 'application/msword' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${filename}-${new Date().toISOString().split('T')[0]}.doc`;
        link.click();
        
        showNotification(`Datos exportados a DOC: ${filename}`, 'success');
    } catch (error) {
        console.error('Error al exportar a DOC:', error);
        showNotification('Error al exportar a DOC', 'error');
    }
}

// Función universal para exportar a PDF
function exportToPDF(data, filename, title) {
    if (!data || data.length === 0) {
        showNotification('No hay datos para exportar', 'warning');
        return;
    }
    
    try {
        let content = `${title}\n\n`;
        content += `Fecha de exportación: ${new Date().toLocaleDateString()}\n`;
        content += `Total de registros: ${data.length}\n\n`;
        
        data.forEach((item, index) => {
            content += `${index + 1}. `;
            Object.keys(item).forEach(key => {
                if (item[key] && typeof item[key] === 'string') {
                    content += `${key}: ${item[key]}\n`;
                }
            });
            content += '\n';
        });
        
        // Crear PDF usando jsPDF (si está disponible) o generar texto plano
        const blob = new Blob([content], { type: 'text/plain' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${filename}-${new Date().toISOString().split('T')[0]}.txt`;
        link.click();
        
        showNotification(`Datos exportados: ${filename}`, 'success');
    } catch (error) {
        console.error('Error al exportar:', error);
        showNotification('Error al exportar', 'error');
    }
}

// ===== FUNCIONES DE EXPORTACIÓN ESPECÍFICAS =====

// Exportar Usuarios
function exportUsers() {
    const users = JSON.parse(localStorage.getItem('users')) || [];
    const usersData = users.map(user => ({
        'ID': user.id,
        'Nombre': user.name,
        'Email': user.email,
        'Teléfono': user.phone || 'No especificado',
        'Pueblos': user.selectedPueblos ? user.selectedPueblos.join(', ') : 'No especificado',
        'Notificaciones': user.notificationConsent ? 'Sí' : 'No',
        'Fecha Registro': new Date(user.registrationDate).toLocaleDateString(),
        'Última Actividad': user.lastActivity ? new Date(user.lastActivity).toLocaleDateString() : 'No disponible'
    }));
    
    exportToExcel(usersData, 'usuarios-registrados', 'Usuarios');
}

// Exportar Administradores
function exportAdmins() {
    const admins = JSON.parse(localStorage.getItem('admins')) || [];
    const adminsData = admins.map(admin => ({
        'ID': admin.id,
        'Nombre': admin.name,
        'Email': admin.email,
        'Rol': admin.role || 'Administrador',
        'Fecha Creación': new Date(admin.createdAt).toLocaleDateString(),
        'Última Actividad': admin.lastActivity ? new Date(admin.lastActivity).toLocaleDateString() : 'No disponible',
        'Estado': admin.active ? 'Activo' : 'Inactivo'
    }));
    
    exportToExcel(adminsData, 'administradores', 'Administradores');
}

// Exportar Documentos
function exportDocuments() {
    const documents = JSON.parse(localStorage.getItem('documents')) || [];
    const docsData = documents.map(doc => ({
        'ID': doc.id,
        'Título': doc.title,
        'Tipo': doc.type,
        'URL': doc.url,
        'Descripción': doc.description || 'Sin descripción',
        'Fecha Creación': new Date(doc.createdAt).toLocaleDateString(),
        'Creado por': doc.createdBy || 'Sistema'
    }));
    
    exportToExcel(docsData, 'documentos', 'Documentos');
}

// Exportar Notificaciones
function exportNotifications() {
    const notifications = JSON.parse(localStorage.getItem('notifications')) || [];
    const notifData = notifications.map(notif => ({
        'ID': notif.id,
        'Título': notif.title,
        'Mensaje': notif.message,
        'Tipo': notif.type,
        'Fecha Envío': new Date(notif.sentAt).toLocaleDateString(),
        'Enviado por': notif.sentBy || 'Sistema',
        'Destinatarios': notif.recipients ? notif.recipients.length : 0,
        'Estado': notif.status || 'Enviado'
    }));
    
    exportToExcel(notifData, 'notificaciones', 'Notificaciones');
}

// Exportar Todo (Backup Completo)
function exportAllData() {
    try {
        const allData = {
            users: JSON.parse(localStorage.getItem('users')) || [],
            admins: JSON.parse(localStorage.getItem('admins')) || [],
            documents: JSON.parse(localStorage.getItem('documents')) || [],
            notifications: JSON.parse(localStorage.getItem('notifications')) || [],
            news: JSON.parse(localStorage.getItem('news')) || [],
            bandos: JSON.parse(localStorage.getItem('bandos')) || [],
            events: JSON.parse(localStorage.getItem('events')) || [],
            quickAccess: JSON.parse(localStorage.getItem('quickAccess')) || [],
            culturaOcioData: JSON.parse(localStorage.getItem('culturaOcioData')) || {},
            appointmentSettings: JSON.parse(localStorage.getItem('appointmentSettings')) || {},
            serviciosData: JSON.parse(localStorage.getItem('serviciosData')) || {},
            exportDate: new Date().toISOString(),
            version: '1.0'
        };
        
        const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `backup-completo-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        showNotification('Backup completo exportado correctamente', 'success');
    } catch (error) {
        console.error('Error al exportar backup completo:', error);
        showNotification('Error al exportar backup completo', 'error');
    }
}

// ===== FUNCIONES DE IMPORTACIÓN UNIVERSAL =====

// Función para manejar la selección de archivo (JSON, Excel, DOC)
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const fileName = file.name.toLowerCase();
    const fileExtension = fileName.split('.').pop();
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            let data = null;
            
            switch (fileExtension) {
                case 'json':
                    data = JSON.parse(e.target.result);
                    document.getElementById('importData').value = JSON.stringify(data, null, 2);
                    showNotification('Archivo JSON cargado correctamente', 'success');
                    break;
                    
                case 'xlsx':
                case 'xls':
                    // Para Excel, necesitamos usar XLSX.js
                    if (typeof XLSX !== 'undefined') {
                        const workbook = XLSX.read(e.target.result, { type: 'array' });
                        const sheetName = workbook.SheetNames[0];
                        const worksheet = workbook.Sheets[sheetName];
                        data = XLSX.utils.sheet_to_json(worksheet);
                        
                        // Convertir a formato JSON para mostrar
                        document.getElementById('importData').value = JSON.stringify(data, null, 2);
                        showNotification('Archivo Excel cargado correctamente', 'success');
                    } else {
                        showNotification('Error: Biblioteca XLSX no disponible', 'error');
                    }
                    break;
                    
                case 'doc':
                case 'docx':
                    // Para DOC, intentamos leer como texto plano
                    const text = e.target.result;
                    data = parseDocContent(text);
                    document.getElementById('importData').value = JSON.stringify(data, null, 2);
                    showNotification('Archivo DOC cargado correctamente', 'success');
                    break;
                    
                case 'txt':
                    // Para archivos de texto plano
                    const txtContent = e.target.result;
                    data = parseTextContent(txtContent);
                    document.getElementById('importData').value = JSON.stringify(data, null, 2);
                    showNotification('Archivo de texto cargado correctamente', 'success');
                    break;
                    
                default:
                    showNotification('Formato de archivo no soportado', 'error');
                    return;
            }
            
        } catch (error) {
            console.error('Error al procesar archivo:', error);
            showNotification('Error al procesar el archivo', 'error');
        }
    };
    
    // Leer el archivo según su tipo
    if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        reader.readAsArrayBuffer(file);
    } else {
        reader.readAsText(file);
    }
}

// Función para parsear contenido de archivos DOC
function parseDocContent(content) {
    // Esta es una implementación básica para archivos DOC de texto plano
    const lines = content.split('\n');
    const data = [];
    let currentItem = {};
    
    lines.forEach(line => {
        line = line.trim();
        if (line && line.includes(':')) {
            const [key, value] = line.split(':', 2);
            currentItem[key.trim()] = value.trim();
        } else if (line === '' && Object.keys(currentItem).length > 0) {
            data.push(currentItem);
            currentItem = {};
        }
    });
    
    // Agregar el último elemento si existe
    if (Object.keys(currentItem).length > 0) {
        data.push(currentItem);
    }
    
    return data;
}

// Función para parsear contenido de archivos de texto
function parseTextContent(content) {
    const lines = content.split('\n');
    const data = [];
    let currentItem = {};
    
    lines.forEach(line => {
        line = line.trim();
        if (line && line.includes(':')) {
            const [key, value] = line.split(':', 2);
            currentItem[key.trim()] = value.trim();
        } else if (line === '' && Object.keys(currentItem).length > 0) {
            data.push(currentItem);
            currentItem = {};
        }
    });
    
    // Agregar el último elemento si existe
    if (Object.keys(currentItem).length > 0) {
        data.push(currentItem);
    }
    
    return data;
}

// Función para importar datos (universal)
function importData() {
    const importType = document.getElementById('importType').value;
    const importData = document.getElementById('importData').value;
    
    if (!importType || importType === 'Seleccionar tipo') {
        showNotification('Por favor, seleccione el tipo de datos a importar', 'warning');
        return;
    }
    
    if (!importData.trim()) {
        showNotification('Por favor, pegue los datos o seleccione un archivo', 'warning');
        return;
    }
    
    try {
        let data;
        
        // Intentar parsear como JSON primero
        try {
            data = JSON.parse(importData);
        } catch (jsonError) {
            // Si no es JSON válido, intentar parsear como texto estructurado
            data = parseStructuredText(importData);
        }
        
        if (!data || (Array.isArray(data) && data.length === 0)) {
            showNotification('No se encontraron datos válidos para importar', 'warning');
            return;
        }
        
        // Validar y procesar datos según el tipo
        switch (importType) {
            case 'usuarios':
                data = validateAndFormatUsers(data);
                localStorage.setItem('users', JSON.stringify(data));
                showNotification(`${data.length} usuarios importados correctamente`, 'success');
                break;
                
            case 'administradores':
                data = validateAndFormatAdmins(data);
                localStorage.setItem('admins', JSON.stringify(data));
                showNotification(`${data.length} administradores importados correctamente`, 'success');
                break;
                
            case 'documentos':
                data = validateAndFormatDocuments(data);
                localStorage.setItem('documents', JSON.stringify(data));
                showNotification(`${data.length} documentos importados correctamente`, 'success');
                break;
                
            case 'notificaciones':
                data = validateAndFormatNotifications(data);
                localStorage.setItem('notifications', JSON.stringify(data));
                showNotification(`${data.length} notificaciones importadas correctamente`, 'success');
                break;
                
            case 'backup-completo':
                // Importar backup completo
                let importedCount = 0;
                Object.keys(data).forEach(key => {
                    if (key !== 'exportDate' && key !== 'version' && data[key]) {
                        localStorage.setItem(key, JSON.stringify(data[key]));
                        importedCount++;
                    }
                });
                showNotification(`Backup completo importado: ${importedCount} secciones`, 'success');
                break;
                
            default:
                showNotification('Tipo de datos no válido', 'error');
                return;
        }
        
        // Limpiar formulario
        document.getElementById('importData').value = '';
        document.getElementById('importType').value = 'Seleccionar tipo';
        
        // Actualizar estadísticas
        updateSystemStats();
        
        // Sincronizar con Firestore si está disponible
        if (typeof syncLocalDataToFirestore === 'function') {
            syncLocalDataToFirestore();
        }
        
    } catch (error) {
        console.error('Error al importar datos:', error);
        showNotification('Error al importar datos. Verifique el formato del archivo', 'error');
    }
}

// Función para parsear texto estructurado
function parseStructuredText(text) {
    const lines = text.split('\n');
    const data = [];
    let currentItem = {};
    
    lines.forEach(line => {
        line = line.trim();
        if (line && line.includes(':')) {
            const [key, value] = line.split(':', 2);
            currentItem[key.trim()] = value.trim();
        } else if (line === '' && Object.keys(currentItem).length > 0) {
            data.push(currentItem);
            currentItem = {};
        }
    });
    
    // Agregar el último elemento si existe
    if (Object.keys(currentItem).length > 0) {
        data.push(currentItem);
    }
    
    return data;
}

// Funciones de validación y formateo
function validateAndFormatUsers(data) {
    if (!Array.isArray(data)) return [];
    
    return data.map((user, index) => ({
        id: user.ID || user.id || `imported_${Date.now()}_${index}`,
        name: user.Nombre || user.name || 'Usuario Importado',
        email: user.Email || user.email || '',
        phone: user.Teléfono || user.phone || '',
        selectedPueblos: user.Pueblos ? user.Pueblos.split(',').map(p => p.trim()) : [],
        notificationConsent: user.Notificaciones === 'Sí' || user.notificationConsent === true,
        registrationDate: user['Fecha Registro'] || user.registrationDate || new Date().toISOString(),
        lastActivity: user['Última Actividad'] || user.lastActivity || new Date().toISOString()
    }));
}

function validateAndFormatAdmins(data) {
    if (!Array.isArray(data)) return [];
    
    return data.map((admin, index) => ({
        id: admin.ID || admin.id || `admin_imported_${Date.now()}_${index}`,
        name: admin.Nombre || admin.name || 'Administrador Importado',
        email: admin.Email || admin.email || '',
        role: admin.Rol || admin.role || 'Administrador',
        createdAt: admin['Fecha Creación'] || admin.createdAt || new Date().toISOString(),
        lastActivity: admin['Última Actividad'] || admin.lastActivity || new Date().toISOString(),
        active: admin.Estado === 'Activo' || admin.active !== false
    }));
}

function validateAndFormatDocuments(data) {
    if (!Array.isArray(data)) return [];
    
    return data.map((doc, index) => ({
        id: doc.ID || doc.id || `doc_imported_${Date.now()}_${index}`,
        title: doc.Título || doc.title || 'Documento Importado',
        type: doc.Tipo || doc.type || 'general',
        url: doc.URL || doc.url || '',
        description: doc.Descripción || doc.description || '',
        createdAt: doc['Fecha Creación'] || doc.createdAt || new Date().toISOString(),
        createdBy: doc['Creado por'] || doc.createdBy || 'Sistema'
    }));
}

function validateAndFormatNotifications(data) {
    if (!Array.isArray(data)) return [];
    
    return data.map((notif, index) => ({
        id: notif.ID || notif.id || `notif_imported_${Date.now()}_${index}`,
        title: notif.Título || notif.title || 'Notificación Importada',
        message: notif.Mensaje || notif.message || '',
        type: notif.Tipo || notif.type || 'info',
        sentAt: notif['Fecha Envío'] || notif.sentAt || new Date().toISOString(),
        sentBy: notif['Enviado por'] || notif.sentBy || 'Sistema',
        recipients: notif.Destinatarios || notif.recipients || 0,
        status: notif.Estado || notif.status || 'Enviado'
    }));
}

// Función para limpiar el formulario de importación
function clearImportForm() {
    document.getElementById('importFile').value = '';
    document.getElementById('importData').value = '';
    document.getElementById('importType').value = '';
    showNotification('Formulario de importación limpiado', 'info');
}

// ===== ACTUALIZACIÓN DE ESTADÍSTICAS =====

// Función para actualizar estadísticas del sistema
function updateSystemStats() {
    const users = JSON.parse(localStorage.getItem('users')) || [];
    const admins = JSON.parse(localStorage.getItem('admins')) || [];
    const documents = JSON.parse(localStorage.getItem('documents')) || [];
    const notifications = JSON.parse(localStorage.getItem('notifications')) || [];
    const news = JSON.parse(localStorage.getItem('news')) || [];
    const bandos = JSON.parse(localStorage.getItem('bandos')) || [];
    const events = JSON.parse(localStorage.getItem('events')) || [];
    const quickAccess = JSON.parse(localStorage.getItem('quickAccess')) || [];
    
    // Actualizar contadores
    document.getElementById('usersCount').textContent = users.length;
    document.getElementById('adminsCount').textContent = admins.length;
    document.getElementById('documentsCount').textContent = documents.length;
    document.getElementById('notificationsCount').textContent = notifications.length;
    document.getElementById('newsCount').textContent = news.length;
    document.getElementById('bandosCount').textContent = bandos.length;
    document.getElementById('eventsCount').textContent = events.length;
    document.getElementById('quickAccessCount').textContent = quickAccess.length;
    
    console.log('📊 Estadísticas del sistema actualizadas');
}

// ===== GESTIÓN DE DOCUMENTOS =====

// Función para cargar la lista de documentos
function loadDocumentsList() {
    const documentsList = document.getElementById('documentsList');
    if (!documentsList) return;
    
    const documents = JSON.parse(localStorage.getItem('documents')) || [];
    
    if (documents.length === 0) {
        documentsList.innerHTML = '<p style="text-align: center; color: #666; padding: 2rem;">No hay documentos subidos.</p>';
        return;
    }
    
    documentsList.innerHTML = '';
    
    documents.forEach((doc, index) => {
        const docElement = document.createElement('div');
        docElement.className = 'document-item';
        docElement.style.cssText = 'background: #f8f9fa; padding: 1rem; margin: 0.5rem 0; border-radius: 8px; border-left: 4px solid #007bff; display: flex; justify-content: space-between; align-items: center;';
        
        docElement.innerHTML = `
            <div style="flex: 1;">
                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                    <h5 style="margin: 0; color: #333;">${doc.title}</h5>
                    <span style="background: #007bff; color: white; padding: 0.2rem 0.5rem; border-radius: 12px; font-size: 0.7rem; text-transform: uppercase;">
                        ${doc.category}
                    </span>
                </div>
                <p style="margin: 0; color: #666; font-size: 0.9rem;">${doc.description || 'Sin descripción'}</p>
                <div style="margin-top: 0.5rem; font-size: 0.8rem; color: #888;">
                    <span><i class="fas fa-calendar"></i> ${new Date(doc.createdAt).toLocaleDateString()}</span>
                    <span style="margin-left: 1rem;"><i class="fas fa-user"></i> ${doc.createdBy}</span>
                    <span style="margin-left: 1rem;"><i class="fas fa-file"></i> ${doc.fileName}</span>
                </div>
            </div>
            <div style="display: flex; gap: 0.5rem; margin-left: 1rem;">
                <button class="btn btn-sm btn-outline" onclick="downloadDocument('${doc.id}')" title="Descargar">
                    <i class="fas fa-download"></i>
                </button>
                <button class="btn btn-sm btn-outline" onclick="editDocument('${doc.id}')" title="Editar">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteDocument('${doc.id}')" title="Eliminar">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        documentsList.appendChild(docElement);
    });
}

// Función para manejar el envío del formulario de documentos
function handleDocumentUpload(event) {
    event.preventDefault();
    
    const name = document.getElementById('documentName').value.trim();
    const description = document.getElementById('documentDescription').value.trim();
    const category = document.getElementById('documentCategory').value;
    const fileInput = document.getElementById('documentFile');
    
    if (!name || !category) {
        showNotification('Por favor, complete todos los campos obligatorios', 'warning');
        return;
    }
    
    if (!fileInput.files[0]) {
        showNotification('Por favor, seleccione un archivo', 'warning');
        return;
    }
    
    const file = fileInput.files[0];
    
    // Crear objeto de documento
    const document = {
        id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: name,
        description: description,
        category: category,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        createdAt: new Date().toISOString(),
        createdBy: currentUser ? currentUser.name : 'Administrador',
        url: null // En una implementación real, aquí se subiría el archivo a un servidor
    };
    
    // Simular subida de archivo (en una implementación real, se subiría a un servidor)
    const reader = new FileReader();
    reader.onload = function(e) {
        document.url = e.target.result; // Data URL para simulación
        
        // Guardar documento
        const documents = JSON.parse(localStorage.getItem('documents')) || [];
        documents.push(document);
        localStorage.setItem('documents', JSON.stringify(documents));
        
        // Limpiar formulario
        document.getElementById('documentUploadForm').reset();
        
        // Actualizar lista
        loadDocumentsList();
        
        // Actualizar página principal
        loadDocumentsInMainPage();
        
        // Actualizar estadísticas
        updateSystemStats();
        
        showNotification('Documento subido correctamente', 'success');
    };
    
    reader.readAsDataURL(file);
}

// Función para descargar un documento
function downloadDocument(documentId) {
    const documents = JSON.parse(localStorage.getItem('documents')) || [];
    const document = documents.find(doc => doc.id === documentId);
    
    if (!document) {
        showNotification('Documento no encontrado', 'error');
        return;
    }
    
    if (document.url) {
        const link = document.createElement('a');
        link.href = document.url;
        link.download = document.fileName;
        link.click();
        showNotification('Descargando documento...', 'info');
    } else {
        showNotification('El archivo no está disponible para descarga', 'warning');
    }
}

// Función para editar un documento
function editDocument(documentId) {
    const documents = JSON.parse(localStorage.getItem('documents')) || [];
    const document = documents.find(doc => doc.id === documentId);
    
    if (!document) {
        showNotification('Documento no encontrado', 'error');
        return;
    }
    
    // Crear modal de edición
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px;">
            <div class="modal-header">
                <h3>✏️ Editar Documento</h3>
                <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            <div class="modal-body">
                <form id="editDocumentForm">
                    <div class="form-group">
                        <label for="editDocumentName">Nombre del documento:</label>
                        <input type="text" id="editDocumentName" value="${document.title}" required>
                    </div>
                    <div class="form-group">
                        <label for="editDocumentDescription">Descripción:</label>
                        <textarea id="editDocumentDescription" rows="3">${document.description || ''}</textarea>
                    </div>
                    <div class="form-group">
                        <label for="editDocumentCategory">Categoría:</label>
                        <select id="editDocumentCategory" required>
                            <option value="normativas" ${document.category === 'normativas' ? 'selected' : ''}>Normativas</option>
                            <option value="formularios" ${document.category === 'formularios' ? 'selected' : ''}>Formularios</option>
                            <option value="certificados" ${document.category === 'certificados' ? 'selected' : ''}>Certificados</option>
                            <option value="informes" ${document.category === 'informes' ? 'selected' : ''}>Informes</option>
                            <option value="otros" ${document.category === 'otros' ? 'selected' : ''}>Otros</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Archivo actual:</label>
                        <p style="background: #f8f9fa; padding: 0.5rem; border-radius: 4px; margin: 0;">
                            <i class="fas fa-file"></i> ${document.fileName} (${formatFileSize(document.fileSize)})
                        </p>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancelar</button>
                <button class="btn btn-primary" onclick="updateDocument('${documentId}')">Actualizar</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Función para actualizar un documento
function updateDocument(documentId) {
    const name = document.getElementById('editDocumentName').value.trim();
    const description = document.getElementById('editDocumentDescription').value.trim();
    const category = document.getElementById('editDocumentCategory').value;
    
    if (!name || !category) {
        showNotification('Por favor, complete todos los campos obligatorios', 'warning');
        return;
    }
    
    const documents = JSON.parse(localStorage.getItem('documents')) || [];
    const documentIndex = documents.findIndex(doc => doc.id === documentId);
    
    if (documentIndex === -1) {
        showNotification('Documento no encontrado', 'error');
        return;
    }
    
    // Actualizar documento
    documents[documentIndex].title = name;
    documents[documentIndex].description = description;
    documents[documentIndex].category = category;
    documents[documentIndex].updatedAt = new Date().toISOString();
    documents[documentIndex].updatedBy = currentUser ? currentUser.name : 'Administrador';
    
    localStorage.setItem('documents', JSON.stringify(documents));
    
    // Cerrar modal
    document.querySelector('.modal').remove();
    
    // Actualizar lista
    loadDocumentsList();
    
    // Actualizar página principal
    loadDocumentsInMainPage();
    
    showNotification('Documento actualizado correctamente', 'success');
}

// Función para eliminar un documento
function deleteDocument(documentId) {
    if (!confirm('¿Está seguro de que desea eliminar este documento?')) {
        return;
    }
    
    const documents = JSON.parse(localStorage.getItem('documents')) || [];
    const documentIndex = documents.findIndex(doc => doc.id === documentId);
    
    if (documentIndex === -1) {
        showNotification('Documento no encontrado', 'error');
        return;
    }
    
    const document = documents[documentIndex];
    
    // Eliminar documento
    documents.splice(documentIndex, 1);
    localStorage.setItem('documents', JSON.stringify(documents));
    
    // Actualizar lista
    loadDocumentsList();
    
    // Actualizar página principal
    loadDocumentsInMainPage();
    
    // Actualizar estadísticas
    updateSystemStats();
    
    showNotification(`Documento "${document.title}" eliminado correctamente`, 'success');
}

// Función para formatear el tamaño del archivo
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Función para inicializar la gestión de documentos
function initializeDocumentsManagement() {
    // Agregar event listener al formulario de subida
    const uploadForm = document.getElementById('documentUploadForm');
    if (uploadForm) {
        uploadForm.addEventListener('submit', handleDocumentUpload);
    }
    
    // Cargar lista inicial
    loadDocumentsList();
    
    console.log('📄 Gestión de documentos inicializada');
}

// ===== FUNCIONES PARA LA PÁGINA PRINCIPAL =====

// Función para cargar documentos en la página principal
function loadDocumentsInMainPage() {
    const documentsGrid = document.getElementById('documentsGrid');
    if (!documentsGrid) return;
    
    const documents = JSON.parse(localStorage.getItem('documents')) || [];
    
    if (documents.length === 0) {
        // Mostrar documentos por defecto si no hay documentos subidos
        documentsGrid.innerHTML = `
            <div class="document-category">
                <h3>Formularios</h3>
                <ul class="document-list">
                    <li><a href="https://cobreros.sedelectronica.es/catalog/t/15fabacb-83b1-47d1-b435-508245672051" target="_blank" class="document-link"><i class="fas fa-download"></i> Licencia de obras</a></li>
                    <li><a href="https://cobreros.sedelectronica.es/catalog/t/d120f65c-c936-4a95-bd50-e7ae970ca149" target="_blank" class="document-link"><i class="fas fa-download"></i> Solicitud de empadronamiento</a></li>
                    <li><a href="https://cobreros.sedelectronica.es/catalog/t/1c74bc66-8b69-4f3c-8183-d3591f0504ed" target="_blank" class="document-link"><i class="fas fa-download"></i> Certificado de empadronamiento</a></li>
                    <li><a href="https://cobreros.sedelectronica.es/?x=YNOk4QU4OCH1VkP5PEIUePAoMJMUn8b-T88O9vfrVKUeSihv2bENIqzWyk461HpKudzhAdFOWwE9q4qefF-Mxi32kuWV4orZqsZxo8GjkR0m9UsFMZJrvtQI8cQXwqOE5h8yPgI9lbLQB86*ZKIMyz9hPheu1upkL85pK64JPLMMHjMYAS8uiKjtaeB2Hr*mQ8UtWDh77MXQZ4v-fH9CQw" target="_blank" class="document-link"><i class="fas fa-download"></i> Instancia General</a></li>
                </ul>
            </div>
            <div class="document-category">
                <h3>Normativas</h3>
                <ul class="document-list">
                    <li><a href="#" class="document-link"><i class="fas fa-download"></i> Ordenanzas municipales</a></li>
                    <li><a href="https://cobreros.sedelectronica.es/catalog/t/96514574-aca1-40e1-a800-e06485e6d016" target="_blank" class="document-link"><i class="fas fa-download"></i> Planeamiento General (Modificación)</a></li>
                </ul>
            </div>
        `;
        return;
    }
    
    // Agrupar documentos por categoría
    const documentsByCategory = {};
    documents.forEach(doc => {
        if (!documentsByCategory[doc.category]) {
            documentsByCategory[doc.category] = [];
        }
        documentsByCategory[doc.category].push(doc);
    });
    
    // Crear HTML para cada categoría
    let html = '';
    Object.keys(documentsByCategory).forEach(category => {
        const categoryName = getCategoryDisplayName(category);
        const categoryDocs = documentsByCategory[category];
        
        html += `
            <div class="document-category">
                <h3>${categoryName}</h3>
                <ul class="document-list">
        `;
        
        categoryDocs.forEach(doc => {
            html += `
                <li>
                    <a href="#" onclick="downloadDocumentFromMain('${doc.id}')" class="document-link">
                        <i class="fas fa-download"></i> ${doc.title}
                    </a>
                    ${doc.description ? `<small style="display: block; color: #666; margin-top: 0.25rem;">${doc.description}</small>` : ''}
                </li>
            `;
        });
        
        html += `
                </ul>
            </div>
        `;
    });
    
    documentsGrid.innerHTML = html;
}

// Función para obtener el nombre de visualización de la categoría
function getCategoryDisplayName(category) {
    const categoryNames = {
        'normativas': 'Normativas',
        'formularios': 'Formularios',
        'certificados': 'Certificados',
        'informes': 'Informes',
        'otros': 'Otros'
    };
    return categoryNames[category] || category;
}

// Función para descargar documento desde la página principal
function downloadDocumentFromMain(documentId) {
    const documents = JSON.parse(localStorage.getItem('documents')) || [];
    const document = documents.find(doc => doc.id === documentId);
    
    if (!document) {
        showNotification('Documento no encontrado', 'error');
        return;
    }
    
    if (document.url) {
        const link = document.createElement('a');
        link.href = document.url;
        link.download = document.fileName;
        link.click();
        showNotification(`Descargando: ${document.title}`, 'info');
    } else {
        showNotification('El archivo no está disponible para descarga', 'warning');
    }
}

// Función principal para sincronizar todas las pestañas
function syncAllAdminTabsWithMainPage() {
    console.log('🔄 Sincronizando todas las pestañas del panel de admin con la página principal...');
    
    syncNewsTabWithMainPage();
    syncBandosTabWithMainPage();
    syncEventsTabWithMainPage();
    syncQuickAccessTabWithMainPage();
    syncCultureTabWithMainPage();
    
    console.log('✅ Sincronización completada');
}

// Funciones para gestionar elementos de acceso rápido
function editQuickAccessItem(itemId) {
    const item = quickAccess.find(i => i.id === itemId);
    if (!item) return;
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 800px;">
            <div class="modal-header">
                <h3>🔗 Editar Tarjeta de Acceso Rápido</h3>
                <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            <div class="modal-body">
                <form id="editTarjetaForm">
                    <div class="form-group">
                        <label for="editTarjetaTitulo">Título:</label>
                        <input type="text" id="editTarjetaTitulo" name="titulo" value="${item.title}" required>
                    </div>
                    <div class="form-group">
                        <label for="editTarjetaDescripcion">Descripción:</label>
                        <textarea id="editTarjetaDescripcion" name="descripcion" rows="3" required>${item.description}</textarea>
                    </div>
                    <div class="form-group">
                        <label for="editTarjetaSeccion">Sección:</label>
                        <select id="editTarjetaSeccion" name="seccion" required>
                            <option value="bando" ${item.section === 'bando' ? 'selected' : ''}>Bando Municipal</option>
                            <option value="sede-electronica" ${item.section === 'sede-electronica' ? 'selected' : ''}>Sede Electrónica</option>
                            <option value="documentos" ${item.section === 'documentos' ? 'selected' : ''}>Documentos</option>
                            <option value="cultura-ocio" ${item.section === 'cultura-ocio' ? 'selected' : ''}>Cultura y Ocio</option>
                            <option value="servicios" ${item.section === 'servicios' ? 'selected' : ''}>Servicios</option>
                            <option value="contacto" ${item.section === 'contacto' ? 'selected' : ''}>Contacto</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="editTarjetaURL">URL (opcional):</label>
                        <input type="url" id="editTarjetaURL" name="url" value="${item.url || ''}">
                    </div>
                    <div class="form-group">
                        <label for="editTarjetaIcono">Icono (opcional):</label>
                        <input type="text" id="editTarjetaIcono" name="icono" value="${item.icon || ''}" placeholder="ej: fas fa-file-alt">
                    </div>
                    <div class="form-group">
                        <label for="editTarjetaOrden">Orden:</label>
                        <input type="number" id="editTarjetaOrden" name="orden" min="1" value="${item.order}">
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="editTarjetaActiva" name="activa" ${item.active ? 'checked' : ''}>
                            Activa
                        </label>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancelar</button>
                <button class="btn btn-primary" onclick="guardarEdicionTarjeta('${itemId}')">Guardar Cambios</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function guardarEdicionTarjeta(itemId) {
    const form = document.getElementById('editTarjetaForm');
    const formData = new FormData(form);
    
    const itemIndex = quickAccess.findIndex(i => i.id === itemId);
    if (itemIndex === -1) return;
    
    // Actualizar el elemento
    quickAccess[itemIndex] = {
        ...quickAccess[itemIndex],
        title: formData.get('titulo'),
        description: formData.get('descripcion'),
        section: formData.get('seccion'),
        url: formData.get('url'),
        icon: formData.get('icono'),
        order: parseInt(formData.get('orden')),
        active: formData.get('activa') === 'on'
    };
    
    // Ordenar por orden
    quickAccess.sort((a, b) => a.order - b.order);
    
    // Guardar en localStorage
    localStorage.setItem('quickAccess', JSON.stringify(quickAccess));
    
    // Sincronizar con Firestore
    syncLocalDataToFirestore();
    
    // Actualizar la interfaz
    loadQuickAccess();
    syncQuickAccessTabWithMainPage();
    
    // Cerrar modal
    document.querySelector('.modal').remove();
    
    showNotification('Tarjeta de acceso rápido actualizada correctamente', 'success');
}

function deleteQuickAccessItem(itemId) {
    if (!confirm('¿Está seguro de que desea eliminar esta tarjeta de acceso rápido?')) {
        return;
    }
    
    const itemIndex = quickAccess.findIndex(i => i.id === itemId);
    if (itemIndex === -1) return;
    
    const item = quickAccess[itemIndex];
    quickAccess.splice(itemIndex, 1);
    
    // Guardar en localStorage
    localStorage.setItem('quickAccess', JSON.stringify(quickAccess));
    
    // Sincronizar con Firestore
    syncLocalDataToFirestore();
    
    // Actualizar la interfaz
    loadQuickAccess();
    syncQuickAccessTabWithMainPage();
    
    showNotification(`Tarjeta "${item.title}" eliminada correctamente`, 'success');
}

// Funciones para gestionar elementos de cultura y ocio
function editCulturaItem(sectionKey, itemId) {
    const culturaData = JSON.parse(localStorage.getItem('culturaOcioData')) || {};
    const section = culturaData[sectionKey];
    if (!section || !section.items) return;
    
    const item = section.items.find(i => i.id === itemId);
    if (!item) return;
    
    // Usar la función existente de edición de cultura
    openCulturaItemEditor(sectionKey, itemId);
}

function deleteCulturaItem(sectionKey, itemId) {
    if (!confirm('¿Está seguro de que desea eliminar este elemento de cultura y ocio?')) {
        return;
    }
    
    // Usar la función existente de eliminación de cultura
    deleteCulturaItem(sectionKey, itemId);
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

// Cargar notificaciones recibidas desde Firestore
async function loadReceivedNotifications() {
    try {
        if (window.firebase && window.firebase.firestore) {
            const snapshot = await window.firebase.firestore()
                .collection('notifications')
                .where('sentTo', '==', 'WEB')
                .orderBy('timestamp', 'desc')
                .limit(50)
                .get();
            
            const receivedNotifications = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                receivedNotifications.push({
                    id: doc.id,
                    ...data
                });
            });
            
            displayReceivedNotifications(receivedNotifications);
        }
    } catch (error) {
        console.error('Error cargando notificaciones recibidas:', error);
    }
}

// Mostrar notificaciones recibidas en la interfaz
function displayReceivedNotifications(notifications) {
    const container = document.getElementById('receivedNotificationsList');
    if (!container) return;
    
    if (notifications.length === 0) {
        container.innerHTML = '<p class="no-notifications">No hay notificaciones recibidas</p>';
        return;
    }
    
    container.innerHTML = notifications.map(notification => `
        <div class="notification-item received" data-id="${notification.id}">
            <div class="notification-header">
                <span class="notification-type ${notification.type}">
                    ${getTypeIcon(notification.type)} ${notification.type.toUpperCase()}
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
                ${notification.hasAttachments ? '<button onclick="downloadAttachment(\'' + notification.attachmentUrl + '\')" class="btn btn-small">📥 Descargar</button>' : ''}
                <button onclick="markNotificationAsRead('${notification.id}')" class="btn btn-small">✓ Leído</button>
            </div>
        </div>
    `).join('');
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
        if (window.firebase && window.firebase.firestore) {
            await window.firebase.firestore()
                .collection('notifications')
                .doc(notificationId)
                .update({ read: true });
            
            // Remover de la lista
            const notificationElement = document.querySelector(`[data-id="${notificationId}"]`);
            if (notificationElement) {
                notificationElement.remove();
            }
            
            showNotification('Notificación marcada como leída', 'success');
        }
    } catch (error) {
        console.error('Error marcando notificación como leída:', error);
    }
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
        // Verificar que se está enviando desde la web
        console.log('🌐 Enviando notificación desde la WEB hacia la APK');
        
        // Obtener usuarios que han dado consentimiento para notificaciones
        let usuariosConNotificaciones = users.filter(user => 
            user.notificationConsent && user.fcmToken
        );
        
        // Filtrar por localidades si es necesario
        if (alcance === 'localidades' && localidadesSeleccionadas.length > 0) {
            usuariosConNotificaciones = usuariosConNotificaciones.filter(user => 
                user.localities && user.localities.some(localidad => 
                    localidadesSeleccionadas.includes(localidad)
                )
            );
        }
        
        if (usuariosConNotificaciones.length === 0) {
            if (alcance === 'localidades') {
                alert('No hay usuarios registrados en las localidades seleccionadas que hayan dado consentimiento para recibir notificaciones.');
            } else {
                alert('No hay usuarios registrados que hayan dado consentimiento para recibir notificaciones.');
            }
            return;
        }

        // Datos de la notificación
        const notificationData = {
            titulo: titulo,
            mensaje: mensaje,
            tipo: tipo,
            timestamp: new Date().toISOString(),
            enviadoPor: currentUser ? currentUser.name : 'Administrador',
            proyecto: 'Ayuntamiento de Cobreros'
        };

        let notificacionesEnviadas = 0;
        let notificacionesFallidas = 0;

        // Enviar a cada usuario individualmente
        for (const usuario of usuariosConNotificaciones) {
            try {
                const response = await fetch('https://fcm.googleapis.com/fcm/send', {
                    method: 'POST',
                    headers: {
                        'Authorization': 'key=TU_SERVER_KEY_AQUI', // Necesitas tu Server Key de Firebase
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        to: usuario.fcmToken,
                        notification: {
                            title: titulo,
                            body: mensaje,
                            icon: 'images/escudo-cobreros.png',
                            badge: 'images/escudo-cobreros.png',
                            click_action: window.location.origin
                        },
                        data: {
                            ...notificationData,
                            destinatario: usuario.email,
                            has_attachments: hasAttachments,
                            attachment_url: attachmentUrl,
                            attachment_type: attachmentType,
                            sent_from: 'WEB',
                            sent_to: 'APK'
                        }
                    })
                });

                if (response.ok) {
                    notificacionesEnviadas++;
                    
                    // Guardar notificación en Firestore para sincronización
                    if (window.firebase && window.firebase.firestore) {
                        window.firebase.firestore().collection('notifications').add({
                            userId: usuario.id,
                            userEmail: usuario.email,
                            title: titulo,
                            message: mensaje,
                            type: tipo,
                            localities: localidadesSeleccionadas.length > 0 ? localidadesSeleccionadas.join(', ') : 'Todas',
                            hasAttachments: hasAttachments,
                            attachmentUrl: attachmentUrl,
                            attachmentType: attachmentType,
                            timestamp: new Date(),
                            read: false,
                            sentFrom: 'WEB',
                            sentTo: 'APK',
                            fcmToken: usuario.fcmToken
                        }).catch(error => {
                            console.error('Error guardando notificación en Firestore:', error);
                        });
                    }
                } else {
                    notificacionesFallidas++;
                }
            } catch (error) {
                console.error(`Error enviando notificación a ${usuario.email}:`, error);
                notificacionesFallidas++;
            }
        }

        // Mostrar resultado
        if (notificacionesEnviadas > 0) {
            let mensaje = `Notificación enviada a ${notificacionesEnviadas} usuarios`;
            if (alcance === 'localidades' && localidadesSeleccionadas.length > 0) {
                mensaje += ` en: ${localidadesSeleccionadas.join(', ')}`;
            }
            showNotification(mensaje, 'success');
        }
        if (notificacionesFallidas > 0) {
            showNotification(`${notificacionesFallidas} notificaciones fallaron`, 'warning');
        }

        console.log('Notificación enviada:', {
            ...notificationData,
            alcance: alcance,
            localidades: localidadesSeleccionadas,
            totalUsuarios: usuariosConNotificaciones.length,
            enviadas: notificacionesEnviadas,
            fallidas: notificacionesFallidas
        });

    } catch (error) {
        console.error('Error enviando notificación push:', error);
        showNotification('Error al enviar notificación push', 'error');
    }
}

// Función original para compatibilidad (envía a todos)
async function enviarNotificacionPush(titulo, mensaje, tipo = 'general') {
    // Intentar usar Firebase si está disponible
    if (window.firebase && window.firebase.functions) {
        try {
            const sendPushNotification = window.firebase.functions().httpsCallable('sendPushNotification');
            const result = await sendPushNotification({
                title: titulo,
                message: mensaje,
                type: tipo,
                localities: []
            });
            
            console.log('✅ Notificación enviada via Firebase:', result.data);
            showNotification(`Notificación enviada a ${result.data.sent} usuarios`, 'success');
            return result.data;
        } catch (error) {
            console.error('❌ Error enviando via Firebase, usando método local:', error);
        }
    }
    
    // Fallback al método local
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
            <span class="close" onclick="closeModalOnly(this.closest('.modal'))">&times;</span>
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
            <span class="close" onclick="closeModalOnly(this.closest('.modal'))">&times;</span>
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
// Función para cargar lista del consultorio médico (UNIFICADA)
function loadConsultorioList() {
    const consultorioList = document.getElementById('consultorioList');
    if (!consultorioList) return;
    
    consultorioList.innerHTML = '';
    
    // Verificar si hay contenido
    const hasContent = dataLinksConfig.medical.content.length > 0;
    const hasDocuments = consultorioConfig.documentos.length > 0;
    const hasPhotos = consultorioConfig.fotos.length > 0;
    
    if (!hasContent && !hasDocuments && !hasPhotos) {
        consultorioList.innerHTML = '<p>No hay contenido disponible para el consultorio médico.</p>';
        return;
    }
    
    let html = '<div class="consultorio-unified">';
    
    // Mostrar elementos del consultorio (sistema nuevo)
    if (hasContent) {
        html += '<div class="consultorio-content-section">';
        html += '<h5>🏥 Información del Consultorio:</h5>';
        html += '<div class="content-items">';
        
        dataLinksConfig.medical.content.forEach(item => {
            html += `
                <div class="service-item">
                    <div class="service-content">
                        <h6>${item.title}</h6>
                        <p>${item.description}</p>
                        ${item.schedule ? `<p><strong>📅 Horario:</strong> ${item.schedule}</p>` : ''}
                        ${item.phone ? `<p><strong>📞 Teléfono:</strong> <a href="tel:${item.phone}">${item.phone}</a></p>` : ''}
                        ${item.address ? `<p><strong>📍 Dirección:</strong> ${item.address}</p>` : ''}
                    </div>
                    <div class="service-actions">
                        <button class="btn btn-sm btn-primary" onclick="editConsultorioItem('${item.id}')" title="Editar elemento">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteConsultorioItem('${item.id}')" title="Eliminar elemento">
                            <i class="fas fa-trash"></i> Eliminar
                        </button>
                    </div>
                </div>
            `;
        });
        
        html += '</div></div>';
    }
    
    // Mostrar documentos (sistema antiguo)
    if (hasDocuments) {
        html += '<div class="consultorio-documents-section">';
        html += '<h5>📄 Documentos del Consultorio:</h5>';
        html += '<div class="content-items">';
        
        consultorioConfig.documentos.forEach((doc, index) => {
            html += `
                <div class="document-item">
                    <div class="document-content">
                        <h6>${doc.nombre || doc.titulo || 'Documento sin nombre'}</h6>
                        <p>Archivo: ${doc.fileName || doc.nombreArchivo || 'Sin archivo'}</p>
                        ${doc.descripcion ? `<p>${doc.descripcion}</p>` : ''}
                    </div>
                    <div class="document-actions">
                        <button class="btn btn-sm btn-outline" onclick="window.open('${doc.url}', '_blank')" title="Ver documento">
                            <i class="fas fa-eye"></i> Ver
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteConsultorioDocument(${index})" title="Eliminar documento">
                            <i class="fas fa-trash"></i> Eliminar
                        </button>
                    </div>
                </div>
            `;
        });
        
        html += '</div></div>';
    }
    
    // Mostrar fotos (sistema antiguo)
    if (hasPhotos) {
        html += '<div class="consultorio-photos-section">';
        html += '<h5>📸 Fotos del Consultorio:</h5>';
        html += '<div class="content-items">';
        
        consultorioConfig.fotos.forEach((foto, index) => {
            html += `
                <div class="photo-item">
                    <div class="photo-content">
                        <h6>${foto.nombre || foto.titulo || 'Foto sin nombre'}</h6>
                        <p>Archivo: ${foto.fileName || 'Sin archivo'}</p>
                        ${foto.descripcion ? `<p>${foto.descripcion}</p>` : ''}
                    </div>
                    <div class="photo-actions">
                        <button class="btn btn-sm btn-outline" onclick="window.open('${foto.url}', '_blank')" title="Ver foto">
                            <i class="fas fa-eye"></i> Ver
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteConsultorioFoto(${index})" title="Eliminar foto">
                            <i class="fas fa-trash"></i> Eliminar
                        </button>
                    </div>
                </div>
            `;
        });
        
        html += '</div></div>';
    }
    
    html += '</div>';
    consultorioList.innerHTML = html;
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

// Abrir modal de ITV
function openItvModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="closeModalOnly(this.closest('.modal'))">&times;</span>
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
            <span class="close" onclick="closeModalOnly(this.closest('.modal'))">&times;</span>
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
        updateMainPageContent(); // Actualizar página principal
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
            <span class="close" onclick="closeModalOnly(this.closest('.modal'))">&times;</span>
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
        updateMainPageContent(); // Actualizar página principal
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
            <span class="close" onclick="closeModalOnly(this.closest('.modal'))">&times;</span>
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
            <span class="close" onclick="closeModalOnly(this.closest('.modal'))">&times;</span>
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
            <span class="close" onclick="closeModalOnly(this.closest('.modal'))">&times;</span>
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
            <span class="close" onclick="closeModalOnly(this.closest('.modal'))">&times;</span>
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
                <span class="close" onclick="closeModalWithScroll(this)">&times;</span>
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
    
    // Prevenir scroll automático y posicionar modal en la parte superior
    setTimeout(() => {
        // Evitar que la página haga scroll automático
        document.body.style.overflow = 'hidden';
        
        // Hacer scroll de la página al inicio
        window.scrollTo(0, 0);
        
        // Posicionar el modal en la parte superior de la ventana
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.zIndex = '1000';
        
        // Hacer scroll al inicio del contenido del modal
        const modalContent = modal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.scrollTop = 0;
        }
    }, 50);
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
                <span class="close" onclick="closeModalWithScroll(this)">&times;</span>
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
    
    // Prevenir scroll automático y posicionar modal en la parte superior
    setTimeout(() => {
        // Evitar que la página haga scroll automático
        document.body.style.overflow = 'hidden';
        
        // Hacer scroll de la página al inicio
        window.scrollTo(0, 0);
        
        // Posicionar el modal en la parte superior de la ventana
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.zIndex = '1000';
        
        // Hacer scroll al inicio del contenido del modal
        const modalContent = modal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.scrollTop = 0;
        }
    }, 50);
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
                <span class="close" onclick="closeModalWithScroll(this)">&times;</span>
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
    
    // Prevenir scroll automático y posicionar modal en la parte superior
    setTimeout(() => {
        // Evitar que la página haga scroll automático
        document.body.style.overflow = 'hidden';
        
        // Hacer scroll de la página al inicio
        window.scrollTo(0, 0);
        
        // Posicionar el modal en la parte superior de la ventana
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.zIndex = '1000';
        
        // Hacer scroll al inicio del contenido del modal
        const modalContent = modal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.scrollTop = 0;
        }
    }, 50);
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
                <span class="close" onclick="closeModalWithScroll(this)">&times;</span>
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
                    <p><strong>Email:</strong> info@ayuntamientocobreros.com</p>
                    <p><strong>Web:</strong> www.ayuntamientocobreros.com</p>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-primary" onclick="this.closest('.modal').remove()">Cerrar</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    // Prevenir scroll automático y posicionar modal en la parte superior
    setTimeout(() => {
        // Evitar que la página haga scroll automático
        document.body.style.overflow = 'hidden';
        
        // Hacer scroll de la página al inicio
        window.scrollTo(0, 0);
        
        // Posicionar el modal en la parte superior de la ventana
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.zIndex = '1000';
        
        // Hacer scroll al inicio del contenido del modal
        const modalContent = modal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.scrollTop = 0;
        }
    }, 50);
}

// ===== SISTEMA COMPLETO DE CITAS PREVIAS =====

// Configuración de horarios del ayuntamiento
let appointmentSchedule = {
    enabled: true,
    workingDays: ['lunes', 'martes', 'miércoles', 'jueves', 'viernes'],
    workingHours: {
        morning: { start: '09:00', end: '14:00' },
        afternoon: { start: '16:00', end: '18:00' }
    },
    timeSlots: 30, // minutos por cita
    maxAppointmentsPerDay: 20,
    emailNotifications: true,
    adminEmail: 'aytocobrero@gmail.com'
};

// Función para cargar configuración de horarios
function loadAppointmentSchedule() {
    const saved = localStorage.getItem('appointmentSchedule');
    const backup = localStorage.getItem('appointmentConfigBackup');
    
    if (saved) {
        try {
            const config = JSON.parse(saved);
            appointmentSchedule = { ...appointmentSchedule, ...config };
            console.log('📅 Configuración cargada desde appointmentSchedule:', config.enabled ? 'CITA PREVIA' : 'SIN CITA PREVIA');
        } catch (error) {
            console.error('❌ Error cargando appointmentSchedule:', error);
        }
    }
    
    // Verificar backup si la configuración principal no está disponible
    if (backup && (!saved || !JSON.parse(saved).enabled !== undefined)) {
        try {
            const backupConfig = JSON.parse(backup);
            appointmentSchedule.enabled = backupConfig.enabled;
            console.log('📅 Configuración cargada desde backup:', backupConfig.enabled ? 'CITA PREVIA' : 'SIN CITA PREVIA');
            
            // Restaurar configuración principal
            saveAppointmentSchedule();
        } catch (error) {
            console.error('❌ Error cargando backup:', error);
        }
    }
}

// Función para guardar configuración de horarios
function saveAppointmentSchedule() {
    localStorage.setItem('appointmentSchedule', JSON.stringify(appointmentSchedule));
}

// Función para generar horarios disponibles
function generateAvailableTimeSlots(date) {
    const slots = [];
    const selectedDate = new Date(date);
    const dayName = selectedDate.toLocaleDateString('es-ES', { weekday: 'long' });
    
    // Verificar si es día laboral
    if (!appointmentSchedule.workingDays.includes(dayName)) {
        return slots;
    }
    
    // Obtener citas existentes para esa fecha
    const existingAppointments = getAppointmentsByDate(date);
    const occupiedSlots = existingAppointments.map(apt => apt.time);
    
    // Generar slots de mañana
    const morningStart = appointmentSchedule.workingHours.morning.start;
    const morningEnd = appointmentSchedule.workingHours.morning.end;
    slots.push(...generateTimeSlots(morningStart, morningEnd, occupiedSlots));
    
    // Generar slots de tarde
    const afternoonStart = appointmentSchedule.workingHours.afternoon.start;
    const afternoonEnd = appointmentSchedule.workingHours.afternoon.end;
    slots.push(...generateTimeSlots(afternoonStart, afternoonEnd, occupiedSlots));
    
    return slots;
}

// Función para generar slots de tiempo
function generateTimeSlots(startTime, endTime, occupiedSlots) {
    const slots = [];
    const start = timeToMinutes(startTime);
    const end = timeToMinutes(endTime);
    const slotDuration = appointmentSchedule.timeSlots;
    
    for (let time = start; time < end; time += slotDuration) {
        const timeString = minutesToTime(time);
        if (!occupiedSlots.includes(timeString)) {
            slots.push(timeString);
        }
    }
    
    return slots;
}

// Función para convertir tiempo a minutos
function timeToMinutes(timeString) {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
}

// Función para convertir minutos a tiempo
function minutesToTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

// Función para obtener citas por fecha
function getAppointmentsByDate(date) {
    const appointments = JSON.parse(localStorage.getItem('appointments')) || [];
    return appointments.filter(apt => apt.date === date);
}

// Función para actualizar el selector de horarios
function updateTimeSlots() {
    const dateInput = document.getElementById('date');
    const timeSelect = document.getElementById('time');
    
    if (!dateInput || !timeSelect) return;
    
    const selectedDate = dateInput.value;
    if (!selectedDate) {
        timeSelect.innerHTML = '<option value="">Seleccione una hora</option>';
        return;
    }
    
    const availableSlots = generateAvailableTimeSlots(selectedDate);
    
    timeSelect.innerHTML = '<option value="">Seleccione una hora</option>';
    availableSlots.forEach(slot => {
        const option = document.createElement('option');
        option.value = slot;
        option.textContent = slot;
        timeSelect.appendChild(option);
    });
    
    if (availableSlots.length === 0) {
        timeSelect.innerHTML = '<option value="">No hay horarios disponibles</option>';
    }
}

// Función para enviar confirmación por email usando Firebase
async function sendAppointmentConfirmation(appointment) {
    try {
        console.log('📧 Enviando confirmación de cita por email usando Firebase...');
        
        // Preparar datos del email para el usuario
        const userEmailData = {
            to: appointment.email,
            from: 'aytocobrero@gmail.com',
            subject: 'Confirmación de Cita Previa - Ayuntamiento de Cobreros',
            template: 'appointment_confirmation',
            data: {
                name: appointment.name,
                service: appointment.service,
                date: new Date(appointment.date).toLocaleDateString('es-ES'),
                time: appointment.time,
                dni: appointment.dni,
                comments: appointment.comments || 'Sin comentarios adicionales',
                appointmentId: appointment.id
            }
        };
        
        // Preparar datos del email para el ayuntamiento
        const adminEmailData = {
            to: appointmentSchedule.adminEmail,
            from: 'aytocobrero@gmail.com',
            subject: `Nueva Solicitud de Cita Previa - ${appointment.name}`,
            template: 'appointment_notification_admin',
            data: {
                name: appointment.name,
                service: appointment.service,
                date: new Date(appointment.date).toLocaleDateString('es-ES'),
                time: appointment.time,
                dni: appointment.dni,
                email: appointment.email,
                phone: appointment.phone,
                comments: appointment.comments || 'Sin comentarios adicionales',
                appointmentId: appointment.id,
                createdAt: new Date(appointment.createdAt).toLocaleString('es-ES')
            }
        };
        
        // Enviar email al usuario
        const userResponse = await fetch('/api/send-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userEmailData)
        });
        
        // Enviar notificación al ayuntamiento
        const adminResponse = await fetch('/api/send-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(adminEmailData)
        });
        
        if (userResponse.ok && adminResponse.ok) {
            const userResult = await userResponse.json();
            const adminResult = await adminResponse.json();
            console.log('✅ Emails enviados correctamente:', { user: userResult, admin: adminResult });
            return {
                success: true,
                message: 'Confirmación enviada correctamente',
                messageId: userResult.messageId,
                adminNotification: adminResult.messageId
            };
        } else {
            throw new Error(`Error HTTP: Usuario ${userResponse.status}, Admin ${adminResponse.status}`);
        }
        
    } catch (error) {
        console.error('❌ Error al enviar email:', error);
        
        // Fallback: mostrar contenido del email en consola para desarrollo
        const userEmailContent = `
Estimado/a ${appointment.name},

Le confirmamos que su solicitud de cita previa ha sido recibida correctamente.

Detalles de la cita:
- Servicio: ${appointment.service}
- Fecha: ${new Date(appointment.date).toLocaleDateString('es-ES')}
- Hora: ${appointment.time}
- DNI: ${appointment.dni}
- ID de Cita: ${appointment.id}

Nos pondremos en contacto con usted para confirmar la disponibilidad de la fecha y hora solicitada.

Atentamente,
Ayuntamiento de Cobreros
aytocobrero@gmail.com
        `;
        
        const adminEmailContent = `
NUEVA SOLICITUD DE CITA PREVIA

Datos del solicitante:
- Nombre: ${appointment.name}
- DNI: ${appointment.dni}
- Email: ${appointment.email}
- Teléfono: ${appointment.phone}

Detalles de la cita:
- Servicio: ${appointment.service}
- Fecha: ${new Date(appointment.date).toLocaleDateString('es-ES')}
- Hora: ${appointment.time}
- ID de Cita: ${appointment.id}
- Comentarios: ${appointment.comments || 'Sin comentarios adicionales'}
- Fecha de solicitud: ${new Date(appointment.createdAt).toLocaleString('es-ES')}

Acción requerida: Confirmar disponibilidad y contactar al solicitante.
        `;
        
        console.log('📧 Email al usuario (fallback):', userEmailContent);
        console.log('📧 Notificación al ayuntamiento (fallback):', adminEmailContent);
        
        return {
            success: false,
            message: 'Error al enviar email, pero la cita se ha registrado correctamente',
            error: error.message
        };
    }
}

// Función para procesar solicitud de cita
async function processAppointmentRequest(appointmentData) {
    const appointment = {
        id: `apt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...appointmentData,
        status: 'pendiente',
        createdAt: new Date().toISOString(),
        confirmed: false
    };
    
    // Guardar cita
    const appointments = JSON.parse(localStorage.getItem('appointments')) || [];
    appointments.push(appointment);
    localStorage.setItem('appointments', JSON.stringify(appointments));
    
    // Enviar confirmación por email
    try {
        const result = await sendAppointmentConfirmation(appointment);
        if (result.success) {
            showNotification('Cita solicitada correctamente. Recibirá una confirmación por email.', 'success');
        } else {
            showNotification('Cita solicitada, pero hubo un problema al enviar la confirmación por email.', 'warning');
        }
    } catch (error) {
        console.error('Error al enviar confirmación:', error);
        showNotification('Cita solicitada correctamente.', 'success');
    }
    
    // Actualizar estadísticas
    updateSystemStats();
    
    return appointment;
}

// Función para manejar el envío del formulario de citas
async function handleAppointmentFormSubmit(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const appointmentData = {
        service: formData.get('service'),
        name: formData.get('name'),
        dni: formData.get('dni'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        date: formData.get('date'),
        time: formData.get('time'),
        comments: formData.get('comments'),
        gdprConsent: formData.get('gdprConsent') === 'on',
        notificationConsent: formData.get('notificationConsent') === 'on'
    };
    
    // Validar datos
    if (!appointmentData.gdprConsent) {
        showNotification('Debe aceptar la Política de Protección de Datos', 'warning');
        return;
    }
    
    // Verificar disponibilidad
    const availableSlots = generateAvailableTimeSlots(appointmentData.date);
    if (!availableSlots.includes(appointmentData.time)) {
        showNotification('El horario seleccionado ya no está disponible', 'warning');
        return;
    }
    
    // Mostrar indicador de carga
    const submitButton = event.target.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;
    submitButton.textContent = 'Enviando...';
    submitButton.disabled = true;
    
    try {
        // Procesar solicitud
        const appointment = await processAppointmentRequest(appointmentData);
        
        // Limpiar formulario
        event.target.reset();
        
        // Ocultar formulario
        const formContainer = document.getElementById('appointmentFormContainer');
        if (formContainer) {
            formContainer.style.display = 'none';
        }
        
        console.log('✅ Cita previa procesada:', appointment);
        
    } catch (error) {
        console.error('Error al procesar cita:', error);
        showNotification('Error al procesar la solicitud. Inténtelo de nuevo.', 'error');
    } finally {
        // Restaurar botón
        submitButton.textContent = originalText;
        submitButton.disabled = false;
    }
}

// Función para inicializar el sistema de citas previas
function initializeAppointmentSystem() {
    // Cargar configuración
    loadAppointmentSchedule();
    
    // Configurar event listeners
    const appointmentForm = document.getElementById('appointmentForm');
    if (appointmentForm) {
        appointmentForm.addEventListener('submit', handleAppointmentFormSubmit);
    }
    
    const dateInput = document.getElementById('date');
    if (dateInput) {
        dateInput.addEventListener('change', updateTimeSlots);
    }
    
    const toggleButton = document.getElementById('toggleAppointmentForm');
    if (toggleButton) {
        toggleButton.addEventListener('click', () => {
            const formContainer = document.getElementById('appointmentFormContainer');
            if (formContainer) {
                formContainer.style.display = formContainer.style.display === 'none' ? 'block' : 'none';
            }
        });
    }
    
    // Configurar fecha mínima (hoy)
    if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.min = today;
    }
    
    console.log('📅 Sistema de citas previas inicializado');
}

// ===== GESTIÓN DE CITAS PREVIAS EN ADMINISTRACIÓN =====

// Función para cargar alertas municipales
function loadMunicipalAlerts() {
    const appointments = JSON.parse(localStorage.getItem('appointments')) || [];
    const pendingAppointments = appointments.filter(apt => apt.status === 'pendiente');
    
    const alertsContainer = document.getElementById('municipalAlertsList');
    const alertsCount = document.getElementById('alertsCount');
    
    if (!alertsContainer || !alertsCount) return;
    
    if (pendingAppointments.length === 0) {
        alertsContainer.innerHTML = '<div class="no-alerts">No hay alertas pendientes</div>';
        alertsCount.textContent = '0 alertas pendientes';
    } else {
        alertsContainer.innerHTML = pendingAppointments.map(appointment => `
            <div class="alert-item" data-appointment-id="${appointment.id}">
                <div class="alert-content">
                    <div class="alert-header">
                        <span class="alert-type">📅 Nueva Cita Previa</span>
                        <span class="alert-time">${new Date(appointment.createdAt).toLocaleString('es-ES')}</span>
                    </div>
                    <div class="alert-details">
                        <strong>${appointment.name}</strong> - ${appointment.service}
                        <br>
                        <small>Fecha: ${new Date(appointment.date).toLocaleDateString('es-ES')} a las ${appointment.time}</small>
                    </div>
                </div>
                <div class="alert-actions">
                    <button class="btn btn-sm btn-success" onclick="confirmAppointment('${appointment.id}')">
                        <i class="fas fa-check"></i> Confirmar
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="cancelAppointment('${appointment.id}')">
                        <i class="fas fa-times"></i> Cancelar
                    </button>
                    <button class="btn btn-sm btn-outline" onclick="viewAppointmentDetails('${appointment.id}')">
                        <i class="fas fa-eye"></i> Ver
                    </button>
                </div>
            </div>
        `).join('');
        
        alertsCount.textContent = `${pendingAppointments.length} alertas pendientes`;
    }
}

// Función para limpiar todas las alertas
function clearAllAlerts() {
    if (confirm('¿Está seguro de que desea limpiar todas las alertas?')) {
        const appointments = JSON.parse(localStorage.getItem('appointments')) || [];
        const updatedAppointments = appointments.map(apt => {
            if (apt.status === 'pendiente') {
                return { ...apt, status: 'confirmada', confirmedAt: new Date().toISOString() };
            }
            return apt;
        });
        
        localStorage.setItem('appointments', JSON.stringify(updatedAppointments));
        loadMunicipalAlerts();
        loadAppointmentsList();
        updateAppointmentStats();
        showNotification('Todas las alertas han sido procesadas', 'success');
    }
}

// Función para actualizar el modo de citas previas
function updateAppointmentMode() {
    const enabledRadio = document.getElementById('appointmentEnabled');
    const disabledRadio = document.getElementById('appointmentDisabled');
    
    if (!enabledRadio || !disabledRadio) {
        console.error('❌ Error: Radio buttons no encontrados');
        showNotification('Error: No se pudieron encontrar los controles de configuración', 'error');
        return;
    }
    
    const isEnabled = enabledRadio.checked;
    
    try {
        // SINCRONIZAR AMBOS SISTEMAS
        // Sistema nuevo (appointmentSchedule)
        appointmentSchedule.enabled = isEnabled;
        saveAppointmentSchedule();
        
        // Sistema antiguo (appointmentsEnabled)
        appointmentsEnabled = isEnabled;
        const oldSystemSettings = {
            enabled: isEnabled,
            updatedBy: 'admin',
            updatedAt: new Date().toISOString(),
            version: '1.0'
        };
        localStorage.setItem('appointmentSettings', JSON.stringify(oldSystemSettings));
        
        // Verificación adicional - guardar también en una clave separada
        const backupConfig = {
            enabled: isEnabled,
            updatedAt: new Date().toISOString(),
            version: '1.0'
        };
        localStorage.setItem('appointmentConfigBackup', JSON.stringify(backupConfig));
        
        // Actualizar estado en la página principal (sistema antiguo)
        updateAppointmentUI();
        
        // Actualizar estado en la página principal (sistema nuevo)
        updateAppointmentStatus();
        
        // Verificación final de ambos sistemas
        setTimeout(() => {
            const newSystem = localStorage.getItem('appointmentSchedule');
            const oldSystem = localStorage.getItem('appointmentSettings');
            
            if (newSystem) {
                const config = JSON.parse(newSystem);
                console.log('✅ Sistema nuevo:', config.enabled ? 'CITA PREVIA' : 'SIN CITA PREVIA');
            }
            
            if (oldSystem) {
                const config = JSON.parse(oldSystem);
                console.log('✅ Sistema antiguo:', config.enabled ? 'CITA PREVIA' : 'SIN CITA PREVIA');
            }
        }, 100);
        
        showNotification(`Modo de citas previas actualizado: ${isEnabled ? 'CITA PREVIA' : 'SIN CITA PREVIA'}`, 'success');
        console.log('💾 Configuración sincronizada en ambos sistemas:', isEnabled ? 'CITA PREVIA' : 'SIN CITA PREVIA');
        
    } catch (error) {
        console.error('❌ Error actualizando configuración:', error);
        showNotification('Error al guardar la configuración', 'error');
    }
}

// Función para cargar la lista de citas previas
function loadAppointmentsList() {
    const appointments = JSON.parse(localStorage.getItem('appointments')) || [];
    const filter = document.getElementById('appointmentStatusFilter')?.value || 'all';
    
    let filteredAppointments = appointments;
    if (filter !== 'all') {
        filteredAppointments = appointments.filter(apt => {
            switch (filter) {
                case 'pending': return apt.status === 'pendiente';
                case 'confirmed': return apt.status === 'confirmada';
                case 'cancelled': return apt.status === 'cancelada';
                default: return true;
            }
        });
    }
    
    const appointmentsList = document.getElementById('appointmentsList');
    if (!appointmentsList) return;
    
    if (filteredAppointments.length === 0) {
        appointmentsList.innerHTML = '<div class="no-data">No hay citas previas solicitadas</div>';
    } else {
        appointmentsList.innerHTML = filteredAppointments.map(appointment => `
            <div class="appointment-item" data-appointment-id="${appointment.id}">
                <div class="appointment-header">
                    <div class="appointment-info">
                        <h5>${appointment.name}</h5>
                        <span class="appointment-service">${appointment.service}</span>
                    </div>
                    <div class="appointment-status">
                        <span class="status-badge status-${appointment.status}">${getStatusText(appointment.status)}</span>
                    </div>
                </div>
                <div class="appointment-details">
                    <div class="detail-row">
                        <span class="detail-label">📅 Fecha:</span>
                        <span class="detail-value">${new Date(appointment.date).toLocaleDateString('es-ES')} a las ${appointment.time}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">📧 Email:</span>
                        <span class="detail-value">${appointment.email}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">📞 Teléfono:</span>
                        <span class="detail-value">${appointment.phone}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">🆔 DNI:</span>
                        <span class="detail-value">${appointment.dni}</span>
                    </div>
                    ${appointment.comments ? `
                    <div class="detail-row">
                        <span class="detail-label">💬 Comentarios:</span>
                        <span class="detail-value">${appointment.comments}</span>
                    </div>
                    ` : ''}
                    <div class="detail-row">
                        <span class="detail-label">🕒 Solicitado:</span>
                        <span class="detail-value">${new Date(appointment.createdAt).toLocaleString('es-ES')}</span>
                    </div>
                </div>
                <div class="appointment-actions">
                    ${appointment.status === 'pendiente' ? `
                        <button class="btn btn-sm btn-success" onclick="confirmAppointment('${appointment.id}')">
                            <i class="fas fa-check"></i> Confirmar
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="cancelAppointment('${appointment.id}')">
                            <i class="fas fa-times"></i> Cancelar
                        </button>
                    ` : ''}
                    <button class="btn btn-sm btn-primary" onclick="viewAppointmentDetails('${appointment.id}')">
                        <i class="fas fa-eye"></i> Ver Detalles
                    </button>
                    <button class="btn btn-sm btn-outline" onclick="editAppointment('${appointment.id}')">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                </div>
            </div>
        `).join('');
    }
}

// Función para filtrar citas
function filterAppointments() {
    loadAppointmentsList();
}

// Función para actualizar la lista de citas
function refreshAppointments() {
    loadAppointmentsList();
    loadMunicipalAlerts();
    updateAppointmentStats();
    showNotification('Lista de citas actualizada', 'success');
}

// Función para crear una cita de prueba
function createTestAppointment() {
    const testAppointment = {
        id: `apt_test_${Date.now()}`,
        service: 'Empadronamiento',
        name: 'Juan Pérez García',
        dni: '12345678A',
        email: 'juan.perez@ejemplo.com',
        phone: '666123456',
        date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Mañana
        time: '10:00',
        comments: 'Cita de prueba creada desde administración',
        status: 'pendiente',
        createdAt: new Date().toISOString(),
        confirmed: false
    };
    
    const appointments = JSON.parse(localStorage.getItem('appointments')) || [];
    appointments.push(testAppointment);
    localStorage.setItem('appointments', JSON.stringify(appointments));
    
    loadAppointmentsList();
    loadMunicipalAlerts();
    updateAppointmentStats();
    showNotification('Cita de prueba creada correctamente', 'success');
}

// Función para confirmar una cita
function confirmAppointment(appointmentId) {
    const appointments = JSON.parse(localStorage.getItem('appointments')) || [];
    const appointmentIndex = appointments.findIndex(apt => apt.id === appointmentId);
    
    if (appointmentIndex !== -1) {
        appointments[appointmentIndex].status = 'confirmada';
        appointments[appointmentIndex].confirmedAt = new Date().toISOString();
        appointments[appointmentIndex].confirmed = true;
        
        localStorage.setItem('appointments', JSON.stringify(appointments));
        
        // Enviar email de confirmación al usuario
        sendAppointmentConfirmationEmail(appointments[appointmentIndex], 'confirmed');
        
        loadAppointmentsList();
        loadMunicipalAlerts();
        updateAppointmentStats();
        showNotification('Cita confirmada correctamente', 'success');
    }
}

// Función para cancelar una cita
function cancelAppointment(appointmentId) {
    if (confirm('¿Está seguro de que desea cancelar esta cita?')) {
        const appointments = JSON.parse(localStorage.getItem('appointments')) || [];
        const appointmentIndex = appointments.findIndex(apt => apt.id === appointmentId);
        
        if (appointmentIndex !== -1) {
            appointments[appointmentIndex].status = 'cancelada';
            appointments[appointmentIndex].cancelledAt = new Date().toISOString();
            
            localStorage.setItem('appointments', JSON.stringify(appointments));
            
            // Enviar email de cancelación al usuario
            sendAppointmentConfirmationEmail(appointments[appointmentIndex], 'cancelled');
            
            loadAppointmentsList();
            loadMunicipalAlerts();
            updateAppointmentStats();
            showNotification('Cita cancelada correctamente', 'success');
        }
    }
}

// Función para ver detalles de una cita
function viewAppointmentDetails(appointmentId) {
    const appointments = JSON.parse(localStorage.getItem('appointments')) || [];
    const appointment = appointments.find(apt => apt.id === appointmentId);
    
    if (appointment) {
        const details = `
DETALLES DE LA CITA:

👤 SOLICITANTE:
- Nombre: ${appointment.name}
- DNI: ${appointment.dni}
- Email: ${appointment.email}
- Teléfono: ${appointment.phone}

📅 CITA:
- Servicio: ${appointment.service}
- Fecha: ${new Date(appointment.date).toLocaleDateString('es-ES')}
- Hora: ${appointment.time}
- Estado: ${getStatusText(appointment.status)}

💬 COMENTARIOS:
${appointment.comments || 'Sin comentarios'}

🕒 INFORMACIÓN:
- ID: ${appointment.id}
- Solicitado: ${new Date(appointment.createdAt).toLocaleString('es-ES')}
${appointment.confirmedAt ? `- Confirmado: ${new Date(appointment.confirmedAt).toLocaleString('es-ES')}` : ''}
${appointment.cancelledAt ? `- Cancelado: ${new Date(appointment.cancelledAt).toLocaleString('es-ES')}` : ''}
        `;
        
        alert(details);
    }
}

// Función para editar una cita
function editAppointment(appointmentId) {
    const appointments = JSON.parse(localStorage.getItem('appointments')) || [];
    const appointment = appointments.find(apt => apt.id === appointmentId);
    
    if (appointment) {
        // Abrir modal de edición (implementar si es necesario)
        showNotification('Función de edición en desarrollo', 'info');
    }
}

// Función para obtener texto del estado
function getStatusText(status) {
    switch (status) {
        case 'pendiente': return 'Pendiente';
        case 'confirmada': return 'Confirmada';
        case 'cancelada': return 'Cancelada';
        default: return 'Desconocido';
    }
}

// Función para actualizar estadísticas de citas
function updateAppointmentStats() {
    const appointments = JSON.parse(localStorage.getItem('appointments')) || [];
    
    const total = appointments.length;
    const pending = appointments.filter(apt => apt.status === 'pendiente').length;
    const confirmed = appointments.filter(apt => apt.status === 'confirmada').length;
    const cancelled = appointments.filter(apt => apt.status === 'cancelada').length;
    
    const totalElement = document.getElementById('totalAppointments');
    const pendingElement = document.getElementById('pendingAppointments');
    const confirmedElement = document.getElementById('confirmedAppointments');
    const cancelledElement = document.getElementById('cancelledAppointments');
    
    if (totalElement) totalElement.textContent = total;
    if (pendingElement) pendingElement.textContent = pending;
    if (confirmedElement) confirmedElement.textContent = confirmed;
    if (cancelledElement) cancelledElement.textContent = cancelled;
}

// Función para enviar email de confirmación/cancelación
async function sendAppointmentConfirmationEmail(appointment, type) {
    try {
        const subject = type === 'confirmed' 
            ? 'Cita Previa Confirmada - Ayuntamiento de Cobreros'
            : 'Cita Previa Cancelada - Ayuntamiento de Cobreros';
            
        const emailData = {
            to: appointment.email,
            from: 'aytocobrero@gmail.com',
            subject: subject,
            template: `appointment_${type}`,
            data: {
                name: appointment.name,
                service: appointment.service,
                date: new Date(appointment.date).toLocaleDateString('es-ES'),
                time: appointment.time,
                dni: appointment.dni,
                appointmentId: appointment.id,
                status: getStatusText(appointment.status)
            }
        };
        
        const response = await fetch('/api/send-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(emailData)
        });
        
        if (response.ok) {
            console.log(`✅ Email de ${type} enviado correctamente`);
        } else {
            console.error(`❌ Error al enviar email de ${type}`);
        }
        
    } catch (error) {
        console.error(`❌ Error al enviar email de ${type}:`, error);
    }
}

// Función para inicializar la gestión de citas previas
function initializeAppointmentManagement() {
    // Cargar configuración inicial
    loadAppointmentSchedule(); // Sistema nuevo
    loadAppointmentSettings(); // Sistema antiguo
    loadMunicipalAlerts();
    loadAppointmentsList();
    updateAppointmentStats();
    
    // Configurar modo de citas previas con verificación robusta
    const enabledRadio = document.getElementById('appointmentEnabled');
    const disabledRadio = document.getElementById('appointmentDisabled');
    
    if (enabledRadio && disabledRadio) {
        // Verificar configuración guardada (priorizar sistema antiguo)
        const oldSystem = localStorage.getItem('appointmentSettings');
        const newSystem = localStorage.getItem('appointmentSchedule');
        let isEnabled = true; // Valor por defecto
        
        // Priorizar sistema antiguo si existe
        if (oldSystem) {
            try {
                const config = JSON.parse(oldSystem);
                isEnabled = config.enabled !== false;
                console.log('📅 Usando configuración del sistema antiguo:', isEnabled ? 'CITA PREVIA' : 'SIN CITA PREVIA');
            } catch (error) {
                console.error('❌ Error cargando sistema antiguo:', error);
            }
        } else if (newSystem) {
            try {
                const config = JSON.parse(newSystem);
                isEnabled = config.enabled !== false;
                console.log('📅 Usando configuración del sistema nuevo:', isEnabled ? 'CITA PREVIA' : 'SIN CITA PREVIA');
            } catch (error) {
                console.error('❌ Error cargando sistema nuevo:', error);
            }
        }
        
        // SINCRONIZAR AMBOS SISTEMAS
        appointmentSchedule.enabled = isEnabled;
        appointmentsEnabled = isEnabled;
        
        // Configurar radio buttons
        if (isEnabled) {
            enabledRadio.checked = true;
            disabledRadio.checked = false;
        } else {
            enabledRadio.checked = false;
            disabledRadio.checked = true;
        }
        
        // Guardar configuración en ambos sistemas para asegurar sincronización
        saveAppointmentSchedule();
        const oldSystemSettings = {
            enabled: isEnabled,
            updatedBy: 'sistema',
            updatedAt: new Date().toISOString(),
            version: '1.0'
        };
        localStorage.setItem('appointmentSettings', JSON.stringify(oldSystemSettings));
        
        console.log('📅 Configuración sincronizada en ambos sistemas:', isEnabled ? 'CITA PREVIA' : 'SIN CITA PREVIA');
    }
    
    console.log('📅 Gestión de citas previas inicializada');
}

// Función para actualizar el estado de citas previas en la página principal
function updateAppointmentStatus() {
    // Asegurar que la configuración esté cargada en ambos sistemas
    loadAppointmentSchedule(); // Sistema nuevo
    loadAppointmentSettings(); // Sistema antiguo
    
    const statusBadge = document.getElementById('statusBadge');
    const statusText = document.getElementById('statusText');
    const appointmentDescription = document.getElementById('appointmentDescription');
    const toggleButton = document.getElementById('toggleAppointmentForm');
    
    if (!statusBadge || !statusText || !appointmentDescription || !toggleButton) {
        console.warn('⚠️ Elementos de UI de citas previas no encontrados');
        return;
    }
    
    // Verificar configuración con fallback (priorizar sistema antiguo)
    let isEnabled = true; // Valor por defecto
    
    if (appointmentsEnabled !== null) {
        isEnabled = appointmentsEnabled;
        console.log('📅 Usando sistema antiguo (appointmentsEnabled):', isEnabled ? 'CITA PREVIA' : 'SIN CITA PREVIA');
    } else if (appointmentSchedule.enabled !== undefined) {
        isEnabled = appointmentSchedule.enabled !== false;
        console.log('📅 Usando sistema nuevo (appointmentSchedule):', isEnabled ? 'CITA PREVIA' : 'SIN CITA PREVIA');
    }
    
    if (isEnabled) {
        statusBadge.innerHTML = '<i class="fas fa-calendar-check"></i><span id="statusText">CITA PREVIA</span>';
        statusText.textContent = 'CITA PREVIA';
        appointmentDescription.textContent = 'Para solicitar una cita previa, complete el formulario a continuación. Le contactaremos para confirmar la fecha y hora.';
        toggleButton.style.display = 'inline-block';
        console.log('📅 Estado actualizado: CITA PREVIA');
    } else {
        statusBadge.innerHTML = '<i class="fas fa-calendar-times"></i><span id="statusText">SIN CITA PREVIA</span>';
        statusText.textContent = 'SIN CITA PREVIA';
        appointmentDescription.textContent = 'Actualmente se atiende sin cita previa. Puede acudir directamente al ayuntamiento en horario de atención.';
        toggleButton.style.display = 'none';
        console.log('📅 Estado actualizado: SIN CITA PREVIA');
    }
    
    // Sincronizar ambos sistemas
    appointmentSchedule.enabled = isEnabled;
    appointmentsEnabled = isEnabled;
    
    // Guardar configuración en ambos sistemas para asegurar persistencia
    saveAppointmentSchedule();
    const oldSystemSettings = {
        enabled: isEnabled,
        updatedBy: 'sistema',
        updatedAt: new Date().toISOString(),
        version: '1.0'
    };
    localStorage.setItem('appointmentSettings', JSON.stringify(oldSystemSettings));
}

// ===== GESTIÓN DE USUARIOS EN ADMINISTRACIÓN =====

// Función para cargar la lista de usuarios
function loadUsersList() {
    const usersList = document.getElementById('usersList');
    if (!usersList) return;
    
    // Obtener usuarios de diferentes fuentes
    const appointments = JSON.parse(localStorage.getItem('appointments')) || [];
    const notifications = JSON.parse(localStorage.getItem('userNotifications')) || [];
    const documents = JSON.parse(localStorage.getItem('documents')) || [];
    
    // Crear mapa de usuarios únicos
    const usersMap = new Map();
    
    // Agregar usuarios de citas previas
    appointments.forEach(appointment => {
        if (appointment.email && appointment.name) {
            const userId = appointment.email.toLowerCase();
            if (!usersMap.has(userId)) {
                usersMap.set(userId, {
                    id: userId,
                    name: appointment.name,
                    email: appointment.email,
                    phone: appointment.phone,
                    dni: appointment.dni,
                    source: 'Cita Previa',
                    firstSeen: appointment.createdAt,
                    lastSeen: appointment.createdAt,
                    appointments: 1,
                    notifications: 0,
                    documents: 0
                });
            } else {
                const user = usersMap.get(userId);
                user.appointments++;
                if (new Date(appointment.createdAt) > new Date(user.lastSeen)) {
                    user.lastSeen = appointment.createdAt;
                }
            }
        }
    });
    
    // Agregar usuarios de notificaciones
    notifications.forEach(notification => {
        if (notification.email && notification.name) {
            const userId = notification.email.toLowerCase();
            if (!usersMap.has(userId)) {
                usersMap.set(userId, {
                    id: userId,
                    name: notification.name,
                    email: notification.email,
                    phone: notification.phone || 'No disponible',
                    dni: notification.dni || 'No disponible',
                    source: 'Notificación',
                    firstSeen: notification.createdAt,
                    lastSeen: notification.createdAt,
                    appointments: 0,
                    notifications: 1,
                    documents: 0
                });
            } else {
                const user = usersMap.get(userId);
                user.notifications++;
                if (new Date(notification.createdAt) > new Date(user.lastSeen)) {
                    user.lastSeen = notification.createdAt;
                }
            }
        }
    });
    
    // Agregar usuarios de documentos
    documents.forEach(document => {
        if (document.uploadedBy) {
            const userId = document.uploadedBy.toLowerCase();
            if (!usersMap.has(userId)) {
                usersMap.set(userId, {
                    id: userId,
                    name: document.uploadedBy,
                    email: document.uploadedBy,
                    phone: 'No disponible',
                    dni: 'No disponible',
                    source: 'Documento',
                    firstSeen: document.uploadedAt,
                    lastSeen: document.uploadedAt,
                    appointments: 0,
                    notifications: 0,
                    documents: 1
                });
            } else {
                const user = usersMap.get(userId);
                user.documents++;
                if (new Date(document.uploadedAt) > new Date(user.lastSeen)) {
                    user.lastSeen = document.uploadedAt;
                }
            }
        }
    });
    
    const users = Array.from(usersMap.values());
    
    if (users.length === 0) {
        usersList.innerHTML = '<div class="no-data">No hay usuarios registrados</div>';
    } else {
        usersList.innerHTML = users.map(user => `
            <div class="user-item" data-user-id="${user.id}">
                <div class="user-header">
                    <div class="user-info">
                        <h5>${user.name}</h5>
                        <span class="user-email">${user.email}</span>
                    </div>
                    <div class="user-stats">
                        <span class="stat-badge">📅 ${user.appointments} citas</span>
                        <span class="stat-badge">📢 ${user.notifications} notif.</span>
                        <span class="stat-badge">📄 ${user.documents} docs</span>
                    </div>
                </div>
                <div class="user-details">
                    <div class="detail-row">
                        <span class="detail-label">📞 Teléfono:</span>
                        <span class="detail-value">${user.phone}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">🆔 DNI:</span>
                        <span class="detail-value">${user.dni}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">📅 Primera vez:</span>
                        <span class="detail-value">${new Date(user.firstSeen).toLocaleDateString('es-ES')}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">🕒 Última vez:</span>
                        <span class="detail-value">${new Date(user.lastSeen).toLocaleDateString('es-ES')}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">🔗 Fuente:</span>
                        <span class="detail-value">${user.source}</span>
                    </div>
                </div>
                <div class="user-actions">
                    <button class="btn btn-sm btn-primary" onclick="viewUserDetails('${user.id}')">
                        <i class="fas fa-eye"></i> Ver Detalles
                    </button>
                    <button class="btn btn-sm btn-success" onclick="contactUser('${user.email}')">
                        <i class="fas fa-envelope"></i> Contactar
                    </button>
                    <button class="btn btn-sm btn-warning" onclick="viewUserHistory('${user.id}')">
                        <i class="fas fa-history"></i> Historial
                    </button>
                </div>
            </div>
        `).join('');
    }
}

// Función para exportar usuarios
function exportUsers() {
    try {
        // Obtener usuarios de diferentes fuentes
        const appointments = JSON.parse(localStorage.getItem('appointments')) || [];
        const notifications = JSON.parse(localStorage.getItem('userNotifications')) || [];
        const documents = JSON.parse(localStorage.getItem('documents')) || [];
        
        // Crear mapa de usuarios únicos
        const usersMap = new Map();
        
        // Agregar usuarios de citas previas
        appointments.forEach(appointment => {
            if (appointment.email && appointment.name) {
                const userId = appointment.email.toLowerCase();
                if (!usersMap.has(userId)) {
                    usersMap.set(userId, {
                        nombre: appointment.name,
                        email: appointment.email,
                        telefono: appointment.phone,
                        dni: appointment.dni,
                        fuente: 'Cita Previa',
                        primera_vez: new Date(appointment.createdAt).toLocaleDateString('es-ES'),
                        ultima_vez: new Date(appointment.createdAt).toLocaleDateString('es-ES'),
                        citas_previas: 1,
                        notificaciones: 0,
                        documentos: 0
                    });
                } else {
                    const user = usersMap.get(userId);
                    user.citas_previas++;
                    if (new Date(appointment.createdAt) > new Date(user.ultima_vez)) {
                        user.ultima_vez = new Date(appointment.createdAt).toLocaleDateString('es-ES');
                    }
                }
            }
        });
        
        // Agregar usuarios de notificaciones
        notifications.forEach(notification => {
            if (notification.email && notification.name) {
                const userId = notification.email.toLowerCase();
                if (!usersMap.has(userId)) {
                    usersMap.set(userId, {
                        nombre: notification.name,
                        email: notification.email,
                        telefono: notification.phone || 'No disponible',
                        dni: notification.dni || 'No disponible',
                        fuente: 'Notificación',
                        primera_vez: new Date(notification.createdAt).toLocaleDateString('es-ES'),
                        ultima_vez: new Date(notification.createdAt).toLocaleDateString('es-ES'),
                        citas_previas: 0,
                        notificaciones: 1,
                        documentos: 0
                    });
                } else {
                    const user = usersMap.get(userId);
                    user.notificaciones++;
                    if (new Date(notification.createdAt) > new Date(user.ultima_vez)) {
                        user.ultima_vez = new Date(notification.createdAt).toLocaleDateString('es-ES');
                    }
                }
            }
        });
        
        // Agregar usuarios de documentos
        documents.forEach(document => {
            if (document.uploadedBy) {
                const userId = document.uploadedBy.toLowerCase();
                if (!usersMap.has(userId)) {
                    usersMap.set(userId, {
                        nombre: document.uploadedBy,
                        email: document.uploadedBy,
                        telefono: 'No disponible',
                        dni: 'No disponible',
                        fuente: 'Documento',
                        primera_vez: new Date(document.uploadedAt).toLocaleDateString('es-ES'),
                        ultima_vez: new Date(document.uploadedAt).toLocaleDateString('es-ES'),
                        citas_previas: 0,
                        notificaciones: 0,
                        documentos: 1
                    });
                } else {
                    const user = usersMap.get(userId);
                    user.documentos++;
                    if (new Date(document.uploadedAt) > new Date(user.ultima_vez)) {
                        user.ultima_vez = new Date(document.uploadedAt).toLocaleDateString('es-ES');
                    }
                }
            }
        });
        
        const users = Array.from(usersMap.values());
        
        if (users.length === 0) {
            showNotification('No hay usuarios para exportar', 'warning');
            return;
        }
        
        // Crear CSV
        const headers = ['Nombre', 'Email', 'Teléfono', 'DNI', 'Fuente', 'Primera Vez', 'Última Vez', 'Citas Previas', 'Notificaciones', 'Documentos'];
        const csvContent = [
            headers.join(','),
            ...users.map(user => [
                `"${user.nombre}"`,
                `"${user.email}"`,
                `"${user.telefono}"`,
                `"${user.dni}"`,
                `"${user.fuente}"`,
                `"${user.primera_vez}"`,
                `"${user.ultima_vez}"`,
                user.citas_previas,
                user.notificaciones,
                user.documentos
            ].join(','))
        ].join('\n');
        
        // Descargar archivo
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `usuarios_ayuntamiento_cobreros_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showNotification(`Exportados ${users.length} usuarios correctamente`, 'success');
        
    } catch (error) {
        console.error('Error al exportar usuarios:', error);
        showNotification('Error al exportar usuarios', 'error');
    }
}

// Función para mostrar estadísticas de usuarios
function showUserStats() {
    const appointments = JSON.parse(localStorage.getItem('appointments')) || [];
    const notifications = JSON.parse(localStorage.getItem('userNotifications')) || [];
    const documents = JSON.parse(localStorage.getItem('documents')) || [];
    
    // Calcular estadísticas
    const totalUsers = new Set();
    const usersBySource = {
        citas: new Set(),
        notificaciones: new Set(),
        documentos: new Set()
    };
    
    appointments.forEach(apt => {
        if (apt.email) {
            totalUsers.add(apt.email.toLowerCase());
            usersBySource.citas.add(apt.email.toLowerCase());
        }
    });
    
    notifications.forEach(notif => {
        if (notif.email) {
            totalUsers.add(notif.email.toLowerCase());
            usersBySource.notificaciones.add(notif.email.toLowerCase());
        }
    });
    
    documents.forEach(doc => {
        if (doc.uploadedBy) {
            totalUsers.add(doc.uploadedBy.toLowerCase());
            usersBySource.documentos.add(doc.uploadedBy.toLowerCase());
        }
    });
    
    const stats = `
📊 ESTADÍSTICAS DE USUARIOS

👥 USUARIOS TOTALES: ${totalUsers.size}

📅 Por Citas Previas: ${usersBySource.citas.size}
📢 Por Notificaciones: ${usersBySource.notificaciones.size}
📄 Por Documentos: ${usersBySource.documentos.size}

📈 ACTIVIDAD:
- Total Citas: ${appointments.length}
- Total Notificaciones: ${notifications.length}
- Total Documentos: ${documents.length}

🕒 PERÍODO:
- Desde: ${appointments.length > 0 ? new Date(Math.min(...appointments.map(a => new Date(a.createdAt)))).toLocaleDateString('es-ES') : 'N/A'}
- Hasta: ${new Date().toLocaleDateString('es-ES')}
    `;
    
    alert(stats);
}

// Función para ver detalles de un usuario
function viewUserDetails(userId) {
    const appointments = JSON.parse(localStorage.getItem('appointments')) || [];
    const notifications = JSON.parse(localStorage.getItem('userNotifications')) || [];
    const documents = JSON.parse(localStorage.getItem('documents')) || [];
    
    // Buscar usuario
    let user = null;
    let userAppointments = [];
    let userNotifications = [];
    let userDocuments = [];
    
    // Buscar en citas
    appointments.forEach(apt => {
        if (apt.email && apt.email.toLowerCase() === userId) {
            if (!user) {
                user = {
                    name: apt.name,
                    email: apt.email,
                    phone: apt.phone,
                    dni: apt.dni
                };
            }
            userAppointments.push(apt);
        }
    });
    
    // Buscar en notificaciones
    notifications.forEach(notif => {
        if (notif.email && notif.email.toLowerCase() === userId) {
            if (!user) {
                user = {
                    name: notif.name,
                    email: notif.email,
                    phone: notif.phone || 'No disponible',
                    dni: notif.dni || 'No disponible'
                };
            }
            userNotifications.push(notif);
        }
    });
    
    // Buscar en documentos
    documents.forEach(doc => {
        if (doc.uploadedBy && doc.uploadedBy.toLowerCase() === userId) {
            if (!user) {
                user = {
                    name: doc.uploadedBy,
                    email: doc.uploadedBy,
                    phone: 'No disponible',
                    dni: 'No disponible'
                };
            }
            userDocuments.push(doc);
        }
    });
    
    if (!user) {
        showNotification('Usuario no encontrado', 'error');
        return;
    }
    
    const details = `
👤 DETALLES DEL USUARIO

📋 INFORMACIÓN PERSONAL:
- Nombre: ${user.name}
- Email: ${user.email}
- Teléfono: ${user.phone}
- DNI: ${user.dni}

📅 CITAS PREVIAS: ${userAppointments.length}
${userAppointments.map(apt => `- ${apt.service} (${new Date(apt.date).toLocaleDateString('es-ES')} ${apt.time}) - ${apt.status}`).join('\n')}

📢 NOTIFICACIONES: ${userNotifications.length}
${userNotifications.map(notif => `- ${notif.title} (${new Date(notif.createdAt).toLocaleDateString('es-ES')})`).join('\n')}

📄 DOCUMENTOS: ${userDocuments.length}
${userDocuments.map(doc => `- ${doc.name} (${new Date(doc.uploadedAt).toLocaleDateString('es-ES')})`).join('\n')}
    `;
    
    alert(details);
}

// Función para contactar a un usuario
function contactUser(email) {
    const subject = 'Ayuntamiento de Cobreros - Comunicación';
    const body = 'Estimado/a ciudadano/a,\n\n';
    const mailtoLink = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoLink);
}

// Función para ver historial de un usuario
function viewUserHistory(userId) {
    const appointments = JSON.parse(localStorage.getItem('appointments')) || [];
    const notifications = JSON.parse(localStorage.getItem('userNotifications')) || [];
    const documents = JSON.parse(localStorage.getItem('documents')) || [];
    
    // Recopilar todo el historial
    const history = [];
    
    appointments.forEach(apt => {
        if (apt.email && apt.email.toLowerCase() === userId) {
            history.push({
                type: 'Cita Previa',
                date: apt.createdAt,
                details: `${apt.service} - ${new Date(apt.date).toLocaleDateString('es-ES')} ${apt.time}`,
                status: apt.status
            });
        }
    });
    
    notifications.forEach(notif => {
        if (notif.email && notif.email.toLowerCase() === userId) {
            history.push({
                type: 'Notificación',
                date: notif.createdAt,
                details: notif.title,
                status: 'Enviada'
            });
        }
    });
    
    documents.forEach(doc => {
        if (doc.uploadedBy && doc.uploadedBy.toLowerCase() === userId) {
            history.push({
                type: 'Documento',
                date: doc.uploadedAt,
                details: doc.name,
                status: 'Subido'
            });
        }
    });
    
    // Ordenar por fecha
    history.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    if (history.length === 0) {
        showNotification('No hay historial disponible', 'info');
        return;
    }
    
    const historyText = `
📜 HISTORIAL DEL USUARIO

${history.map(item => `
${item.type} - ${new Date(item.date).toLocaleString('es-ES')}
${item.details}
Estado: ${item.status}
---`).join('\n')}
    `;
    
    alert(historyText);
}

// Función para inicializar la gestión de usuarios
function initializeUserManagement() {
    loadUsersList();
    console.log('👥 Gestión de usuarios inicializada');
}

// ===== GESTIÓN DE DATOS Y ENLACES =====

// Configuración de datos y enlaces
let dataLinksConfig = {
    medical: {
        title: '🏥 CONSULTORIO MÉDICO',
        icon: '🏥',
        enabled: true,
        content: []
    },
    itv: {
        title: '🚗 ITV',
        icon: '🚗',
        enabled: true,
        content: []
    },
    phones: {
        title: '📞 Teléfonos de Interés',
        icon: '📞',
        enabled: true,
        content: []
    },
    transport: {
        title: '🚌 Líneas de Transporte',
        icon: '🚌',
        enabled: true,
        content: []
    }
};

// Función para cargar configuración de datos y enlaces
function loadDataLinksConfig() {
    const saved = localStorage.getItem('dataLinksConfig');
    if (saved) {
        dataLinksConfig = { ...dataLinksConfig, ...JSON.parse(saved) };
    }
}

// Función para guardar configuración de datos y enlaces
function saveDataLinksConfig() {
    localStorage.setItem('dataLinksConfig', JSON.stringify(dataLinksConfig));
}


// Función para cargar lista de ITV
function loadItvList() {
    const itvList = document.getElementById('itvList');
    if (!itvList) return;
    
    const itvContent = dataLinksConfig.itv.content;
    
    if (itvContent.length === 0) {
        itvList.innerHTML = '<div class="no-data">No hay contenido disponible para ITV.</div>';
    } else {
        itvList.innerHTML = itvContent.map(item => `
            <div class="content-item">
                <div class="content-info">
                    <h5>${item.title}</h5>
                    <p>${item.description}</p>
                    ${item.address ? `<small>📍 ${item.address}</small>` : ''}
                    ${item.phone ? `<small>📞 ${item.phone}</small>` : ''}
                    ${item.schedule ? `<small>📅 ${item.schedule}</small>` : ''}
                </div>
                <div class="content-actions">
                    <button class="btn btn-sm btn-primary" onclick="editItvItem('${item.id}')">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteItvItem('${item.id}')">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </div>
            </div>
        `).join('');
    }
}

// Función para cargar lista de teléfonos de interés
function loadTelefonosElementosList() {
    const telefonosList = document.getElementById('telefonosElementosList');
    if (!telefonosList) return;
    
    const phonesContent = dataLinksConfig.phones.content;
    
    if (phonesContent.length === 0) {
        telefonosList.innerHTML = '<div class="no-data">No hay teléfonos de interés configurados.</div>';
    } else {
        telefonosList.innerHTML = phonesContent.map(item => `
            <div class="content-item">
                <div class="content-info">
                    <h5>${item.icon} ${item.title}</h5>
                    <p>${item.description}</p>
                    <small>Tipo: ${item.type} | Orden: ${item.order}</small>
                </div>
                <div class="content-actions">
                    <button class="btn btn-sm btn-primary" onclick="editTelefonoItem('${item.id}')">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteTelefonoItem('${item.id}')">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </div>
            </div>
        `).join('');
    }
}

// Función para cargar lista de líneas de transporte
function loadTransporteLinesList() {
    const transporteList = document.getElementById('transporteLinesList');
    if (!transporteList) return;
    
    const transportContent = dataLinksConfig.transport.content;
    
    if (transportContent.length === 0) {
        transporteList.innerHTML = '<div class="no-data">No hay líneas de transporte configuradas.</div>';
    } else {
        transporteList.innerHTML = transportContent.map(item => `
            <div class="content-item">
                <div class="content-info">
                    <h5>${item.icon} ${item.title}</h5>
                    <p>${item.description}</p>
                    ${item.route ? `<small>🛣️ ${item.route}</small>` : ''}
                    ${item.schedule ? `<small>📅 ${item.schedule}</small>` : ''}
                </div>
                <div class="content-actions">
                    <button class="btn btn-sm btn-primary" onclick="editTransporteItem('${item.id}')">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteTransporteItem('${item.id}')">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </div>
            </div>
        `).join('');
    }
}

// Función para abrir modal del consultorio médico
function openConsultorioModal() {
    console.log('🏥 Abriendo modal de configuración del consultorio...');
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px;">
            <div class="modal-header">
                <h3>🏥 Configurar Consultorio Médico</h3>
                <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            <div class="modal-body">
                <form id="consultorioForm">
                    <div class="form-group">
                        <label for="consultorioTitle">Título de la sección:</label>
                        <input type="text" id="consultorioTitle" name="title" value="${dataLinksConfig.medical.title}" required maxlength="50">
                        <small class="form-help">Título que aparecerá en la página principal</small>
                    </div>
                    <div class="form-group">
                        <label for="consultorioIcon">Icono:</label>
                        <input type="text" id="consultorioIcon" name="icon" value="${dataLinksConfig.medical.icon}" required maxlength="2">
                        <small class="form-help">Emoji que representará la sección (máximo 2 caracteres)</small>
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="consultorioEnabled" name="enabled" ${dataLinksConfig.medical.enabled ? 'checked' : ''}>
                            Mostrar sección en la página principal
                        </label>
                    </div>
                </form>
                
                <div class="content-actions" style="margin-top: 2rem; padding-top: 1rem; border-top: 1px solid var(--border-color);">
                    <h4>Gestionar Contenido del Consultorio</h4>
                    <p>Aquí puedes agregar, editar o eliminar elementos del consultorio médico.</p>
                    <div style="display: flex; gap: 1rem; margin-top: 1rem;">
                        <button class="btn btn-primary" onclick="addNewConsultorioItem()">
                            <i class="fas fa-plus"></i> Agregar Elemento
                        </button>
                        <button class="btn btn-secondary" onclick="viewConsultorioContent()">
                            <i class="fas fa-list"></i> Ver Contenido
                        </button>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-primary" onclick="saveConsultorioConfig()">
                    <i class="fas fa-save"></i> Guardar Configuración
                </button>
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">
                    <i class="fas fa-times"></i> Cancelar
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    // Enfocar el primer campo
    setTimeout(() => {
        const firstInput = modal.querySelector('#consultorioTitle');
        if (firstInput) firstInput.focus();
    }, 100);
}

// Función para guardar configuración del consultorio
function saveConsultorioConfig() {
    console.log('💾 Guardando configuración del consultorio...');
    
    try {
        const title = document.getElementById('consultorioTitle').value.trim();
        const icon = document.getElementById('consultorioIcon').value.trim();
        const enabled = document.getElementById('consultorioEnabled').checked;
        
        // Validar datos
        if (!title) {
            showNotification('❌ El título es obligatorio', 'error');
            return;
        }
        
        if (!icon) {
            showNotification('❌ El icono es obligatorio', 'error');
            return;
        }
        
        // Actualizar configuración
        dataLinksConfig.medical.title = title;
        dataLinksConfig.medical.icon = icon;
        dataLinksConfig.medical.enabled = enabled;
        
        console.log('✅ Configuración actualizada:', { title, icon, enabled });
        
        // Guardar en localStorage
        saveDataLinksConfig();
        console.log('💾 Configuración guardada en localStorage');
        
        // Actualizar todas las vistas
        updateMainPageSections();
        updateMainPageContent();
        loadConsultorioList();
        console.log('🔄 Todas las vistas actualizadas');
        
        // Cerrar modal
        const modal = document.querySelector('.modal');
        if (modal) {
            modal.remove();
        }
        
        // Mostrar notificación de éxito
        showNotification('✅ Configuración del consultorio guardada correctamente', 'success');
        console.log('🎉 Configuración guardada exitosamente');
        
    } catch (error) {
        console.error('❌ Error guardando configuración del consultorio:', error);
        showNotification('❌ Error inesperado al guardar la configuración', 'error');
    }
}

// Función para agregar nuevo elemento al consultorio
function addNewConsultorioItem() {
    console.log('➕ Agregando nuevo elemento al consultorio...');
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px;">
            <div class="modal-header">
                <h3>🏥 Agregar Elemento al Consultorio</h3>
                <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            <div class="modal-body">
                <form id="newConsultorioItemForm">
                    <div class="form-group">
                        <label for="newConsultorioTitle">Título: <span class="required">*</span></label>
                        <input type="text" id="newConsultorioTitle" name="title" required maxlength="100" placeholder="Ej: Centro de Salud de Cobreros">
                        <small class="form-help">Máximo 100 caracteres</small>
                    </div>
                    <div class="form-group">
                        <label for="newConsultorioDescription">Descripción: <span class="required">*</span></label>
                        <textarea id="newConsultorioDescription" name="description" required maxlength="500" rows="4" placeholder="Ej: Atención médica primaria para todos los vecinos"></textarea>
                        <small class="form-help">Máximo 500 caracteres</small>
                    </div>
                    <div class="form-group">
                        <label for="newConsultorioSchedule">Horario:</label>
                        <input type="text" id="newConsultorioSchedule" name="schedule" maxlength="200" placeholder="Ej: Lunes a Viernes - 08:00-15:00">
                        <small class="form-help">Opcional. Ejemplo: Lunes a Viernes - 08:00-15:00</small>
                    </div>
                    <div class="form-group">
                        <label for="newConsultorioPhone">Teléfono:</label>
                        <input type="tel" id="newConsultorioPhone" name="phone" maxlength="20" placeholder="Ej: 980 62 26 18">
                        <small class="form-help">Opcional. Número de teléfono de contacto</small>
                    </div>
                    <div class="form-group">
                        <label for="newConsultorioAddress">Dirección:</label>
                        <input type="text" id="newConsultorioAddress" name="address" maxlength="200" placeholder="Ej: Calle Principal, 123">
                        <small class="form-help">Opcional. Dirección del consultorio</small>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn-primary" onclick="saveNewConsultorioItem()">
                    <i class="fas fa-save"></i> Guardar Elemento
                </button>
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">
                    <i class="fas fa-times"></i> Cancelar
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    // Enfocar el primer campo
    setTimeout(() => {
        const firstInput = modal.querySelector('#newConsultorioTitle');
        if (firstInput) firstInput.focus();
    }, 100);
}

// Función para guardar nuevo elemento del consultorio
function saveNewConsultorioItem() {
    console.log('💾 Guardando nuevo elemento del consultorio...');
    
    try {
        const title = document.getElementById('newConsultorioTitle').value.trim();
        const description = document.getElementById('newConsultorioDescription').value.trim();
        const schedule = document.getElementById('newConsultorioSchedule').value.trim();
        const phone = document.getElementById('newConsultorioPhone').value.trim();
        const address = document.getElementById('newConsultorioAddress').value.trim();
        
        // Validar campos obligatorios
        if (!title) {
            showNotification('❌ El título es obligatorio', 'error');
            return;
        }
        
        if (!description) {
            showNotification('❌ La descripción es obligatoria', 'error');
            return;
        }
        
        // Crear nuevo elemento
        const newItem = {
            id: 'medical_' + Date.now(),
            title: title,
            description: description,
            schedule: schedule || null,
            phone: phone || null,
            address: address || null,
            createdAt: new Date().toISOString()
        };
        
        // Agregar al array
        dataLinksConfig.medical.content.push(newItem);
        
        console.log('✅ Nuevo elemento agregado:', newItem);
        
        // Guardar configuración
        saveDataLinksConfig();
        console.log('💾 Configuración guardada en localStorage');
        
        // Actualizar todas las vistas
        loadConsultorioList();
        updateMainPageSections();
        updateMainPageContent();
        console.log('🔄 Todas las vistas actualizadas');
        
        // Cerrar modal
        const modal = document.querySelector('.modal');
        if (modal) {
            modal.remove();
        }
        
        // Mostrar notificación de éxito
        showNotification('✅ Elemento agregado al consultorio correctamente', 'success');
        console.log('🎉 Elemento agregado exitosamente');
        
    } catch (error) {
        console.error('❌ Error agregando elemento al consultorio:', error);
        showNotification('❌ Error inesperado al agregar el elemento', 'error');
    }
}

// Función para ver contenido del consultorio
function viewConsultorioContent() {
    console.log('👁️ Mostrando contenido del consultorio...');
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 800px;">
            <div class="modal-header">
                <h3>🏥 Contenido del Consultorio Médico</h3>
                <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            <div class="modal-body">
                <div id="consultorioContentList">
                    <!-- Se llenará dinámicamente -->
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">
                    <i class="fas fa-times"></i> Cerrar
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    // Cargar contenido
    loadConsultorioContentInModal();
}

// Función para cargar contenido del consultorio en el modal
function loadConsultorioContentInModal() {
    const container = document.getElementById('consultorioContentList');
    if (!container) return;
    
    const content = dataLinksConfig.medical.content;
    
    if (content.length === 0) {
        container.innerHTML = '<p>No hay elementos en el consultorio médico.</p>';
        return;
    }
    
    container.innerHTML = content.map(item => `
        <div class="service-item">
            <div class="service-content">
                <h4>${item.title}</h4>
                <p>${item.description}</p>
                ${item.schedule ? `<p><strong>📅 Horario:</strong> ${item.schedule}</p>` : ''}
                ${item.phone ? `<p><strong>📞 Teléfono:</strong> <a href="tel:${item.phone}">${item.phone}</a></p>` : ''}
                ${item.address ? `<p><strong>📍 Dirección:</strong> ${item.address}</p>` : ''}
            </div>
            <div class="service-actions">
                <button class="btn btn-sm btn-primary" onclick="editConsultorioItem('${item.id}')" title="Editar elemento">
                    <i class="fas fa-edit"></i> Editar
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteConsultorioItem('${item.id}')" title="Eliminar elemento">
                    <i class="fas fa-trash"></i> Eliminar
                </button>
            </div>
        </div>
    `).join('');
}

// Función para abrir modal de ITV
function openItvModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>🚗 Editar ITV</h3>
                <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            <div class="modal-body">
                <form id="itvForm">
                    <div class="form-group">
                        <label for="itvTitle">Título:</label>
                        <input type="text" id="itvTitle" name="title" value="${dataLinksConfig.itv.title}" required>
                    </div>
                    <div class="form-group">
                        <label for="itvIcon">Icono:</label>
                        <input type="text" id="itvIcon" name="icon" value="${dataLinksConfig.itv.icon}" required>
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="itvEnabled" name="enabled" ${dataLinksConfig.itv.enabled ? 'checked' : ''}>
                            Sección habilitada
                        </label>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn-primary" onclick="saveItvConfig()">Guardar</button>
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancelar</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// Función para guardar configuración de ITV
function saveItvConfig() {
    const title = document.getElementById('itvTitle').value;
    const icon = document.getElementById('itvIcon').value;
    const enabled = document.getElementById('itvEnabled').checked;
    
    dataLinksConfig.itv.title = title;
    dataLinksConfig.itv.icon = icon;
    dataLinksConfig.itv.enabled = enabled;
    
    saveDataLinksConfig();
    updateMainPageSections();
    
    document.querySelector('.modal').remove();
    showNotification('Configuración de ITV guardada', 'success');
}

// Función para abrir modal de teléfonos de interés
function openTelefonosInteresModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>📞 Configurar Teléfonos de Interés</h3>
                <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            <div class="modal-body">
                <form id="telefonosForm">
                    <div class="form-group">
                        <label for="telefonosTitle">Título:</label>
                        <input type="text" id="telefonosTitle" name="title" value="${dataLinksConfig.phones.title}" required>
                    </div>
                    <div class="form-group">
                        <label for="telefonosIcon">Icono:</label>
                        <input type="text" id="telefonosIcon" name="icon" value="${dataLinksConfig.phones.icon}" required>
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="telefonosEnabled" name="enabled" ${dataLinksConfig.phones.enabled ? 'checked' : ''}>
                            Sección habilitada
                        </label>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn-primary" onclick="saveTelefonosConfig()">Guardar</button>
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancelar</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// Función para guardar configuración de teléfonos
function saveTelefonosConfig() {
    const title = document.getElementById('telefonosTitle').value;
    const icon = document.getElementById('telefonosIcon').value;
    const enabled = document.getElementById('telefonosEnabled').checked;
    
    dataLinksConfig.phones.title = title;
    dataLinksConfig.phones.icon = icon;
    dataLinksConfig.phones.enabled = enabled;
    
    saveDataLinksConfig();
    updateMainPageSections();
    
    document.querySelector('.modal').remove();
    showNotification('Configuración de teléfonos guardada', 'success');
}

// Función para abrir modal de nuevo elemento de teléfono
function openTelefonoElementoModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>📞 Nuevo Teléfono de Interés</h3>
                <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            <div class="modal-body">
                <form id="telefonoElementoForm">
                    <div class="form-group">
                        <label for="telefonoIcon">Icono:</label>
                        <input type="text" id="telefonoIcon" name="icon" placeholder="🚕" required>
                    </div>
                    <div class="form-group">
                        <label for="telefonoTitle">Título:</label>
                        <input type="text" id="telefonoTitle" name="title" placeholder="Taxis" required>
                    </div>
                    <div class="form-group">
                        <label for="telefonoDescription">Descripción:</label>
                        <textarea id="telefonoDescription" name="description" placeholder="Servicio de taxis locales" required></textarea>
                    </div>
                    <div class="form-group">
                        <label for="telefonoType">Tipo:</label>
                        <select id="telefonoType" name="type" required>
                            <option value="telefonos">Teléfonos</option>
                            <option value="servicio">Servicio</option>
                            <option value="documento">Documento</option>
                            <option value="emergencia">Emergencia</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="telefonoOrder">Orden:</label>
                        <input type="number" id="telefonoOrder" name="order" value="${dataLinksConfig.phones.content.length + 1}" min="1" required>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn-primary" onclick="saveTelefonoElemento()">Guardar</button>
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancelar</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// Función para guardar nuevo elemento de teléfono
function saveTelefonoElemento() {
    const icon = document.getElementById('telefonoIcon').value;
    const title = document.getElementById('telefonoTitle').value;
    const description = document.getElementById('telefonoDescription').value;
    const type = document.getElementById('telefonoType').value;
    const order = parseInt(document.getElementById('telefonoOrder').value);
    
    const newItem = {
        id: `phone_${Date.now()}`,
        icon: icon,
        title: title,
        description: description,
        type: type,
        order: order,
        createdAt: new Date().toISOString()
    };
    
    dataLinksConfig.phones.content.push(newItem);
    dataLinksConfig.phones.content.sort((a, b) => a.order - b.order);
    
    saveDataLinksConfig();
    loadTelefonosElementosList();
    updateMainPageSections();
    
    document.querySelector('.modal').remove();
    showNotification('Teléfono de interés agregado correctamente', 'success');
}

// Función para abrir modal de transporte
function openTransporteModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>🚌 Configurar Líneas de Transporte</h3>
                <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            <div class="modal-body">
                <form id="transporteForm">
                    <div class="form-group">
                        <label for="transporteTitle">Título:</label>
                        <input type="text" id="transporteTitle" name="title" value="${dataLinksConfig.transport.title}" required>
                    </div>
                    <div class="form-group">
                        <label for="transporteIcon">Icono:</label>
                        <input type="text" id="transporteIcon" name="icon" value="${dataLinksConfig.transport.icon}" required>
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="transporteEnabled" name="enabled" ${dataLinksConfig.transport.enabled ? 'checked' : ''}>
                            Sección habilitada
                        </label>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn-primary" onclick="saveTransporteConfig()">Guardar</button>
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancelar</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// Función para guardar configuración de transporte
function saveTransporteConfig() {
    const title = document.getElementById('transporteTitle').value;
    const icon = document.getElementById('transporteIcon').value;
    const enabled = document.getElementById('transporteEnabled').checked;
    
    dataLinksConfig.transport.title = title;
    dataLinksConfig.transport.icon = icon;
    dataLinksConfig.transport.enabled = enabled;
    
    saveDataLinksConfig();
    updateMainPageSections();
    
    document.querySelector('.modal').remove();
    showNotification('Configuración de transporte guardada', 'success');
}

// Función para abrir modal de nueva línea de transporte
function openTransporteLineaModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>🚌 Nueva Línea de Transporte</h3>
                <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            <div class="modal-body">
                <form id="transporteLineaForm">
                    <div class="form-group">
                        <label for="lineaIcon">Icono:</label>
                        <input type="text" id="lineaIcon" name="icon" placeholder="🚌" required>
                    </div>
                    <div class="form-group">
                        <label for="lineaTitle">Título:</label>
                        <input type="text" id="lineaTitle" name="title" placeholder="Línea 1" required>
                    </div>
                    <div class="form-group">
                        <label for="lineaDescription">Descripción:</label>
                        <textarea id="lineaDescription" name="description" placeholder="Ruta principal" required></textarea>
                    </div>
                    <div class="form-group">
                        <label for="lineaRoute">Ruta:</label>
                        <input type="text" id="lineaRoute" name="route" placeholder="Cobreros - Puebla de Sanabria">
                    </div>
                    <div class="form-group">
                        <label for="lineaSchedule">Horario:</label>
                        <input type="text" id="lineaSchedule" name="schedule" placeholder="Lunes a Viernes - 08:00-18:00">
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn-primary" onclick="saveTransporteLinea()">Guardar</button>
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancelar</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// Función para guardar nueva línea de transporte
function saveTransporteLinea() {
    const icon = document.getElementById('lineaIcon').value;
    const title = document.getElementById('lineaTitle').value;
    const description = document.getElementById('lineaDescription').value;
    const route = document.getElementById('lineaRoute').value;
    const schedule = document.getElementById('lineaSchedule').value;
    
    const newItem = {
        id: `transport_${Date.now()}`,
        icon: icon,
        title: title,
        description: description,
        route: route,
        schedule: schedule,
        createdAt: new Date().toISOString()
    };
    
    dataLinksConfig.transport.content.push(newItem);
    
    saveDataLinksConfig();
    loadTransporteLinesList();
    updateMainPageSections();
    
    document.querySelector('.modal').remove();
    showNotification('Línea de transporte agregada correctamente', 'success');
}

// Función para actualizar secciones en la página principal
function updateMainPageSections() {
    // Actualizar títulos de secciones
    const medicalTitle = document.getElementById('medicalSectionTitle');
    const itvTitle = document.getElementById('itvSectionTitle');
    const phoneTitle = document.getElementById('phoneSectionTitle');
    
    if (medicalTitle) medicalTitle.textContent = dataLinksConfig.medical.title;
    if (itvTitle) itvTitle.textContent = dataLinksConfig.itv.title;
    if (phoneTitle) phoneTitle.textContent = dataLinksConfig.phones.title;
    
    // Actualizar contenido en la página principal
    updateMainPageContent();
}

// Función para inicializar la gestión de datos y enlaces
function initializeDataLinksManagement() {
    loadDataLinksConfig();
    
    // Agregar datos de ejemplo si no existen
    if (dataLinksConfig.medical.content.length === 0) {
        dataLinksConfig.medical.content.push({
            id: 'medical_1',
            title: 'Centro de Salud de Cobreros',
            description: 'Atención médica primaria para todos los vecinos',
            schedule: 'Lunes a Viernes - 08:00-15:00',
            createdAt: new Date().toISOString()
        });
    }
    
    if (dataLinksConfig.phones.content.length === 0) {
        dataLinksConfig.phones.content = [
            {
                id: 'phone_1',
                icon: '🚕',
                title: 'Taxis',
                description: 'Servicio de taxis locales',
                type: 'telefonos',
                order: 1,
                createdAt: new Date().toISOString()
            },
            {
                id: 'phone_2',
                icon: '🚗',
                title: 'ITV',
                description: 'Inspección Técnica de Vehículos',
                type: 'servicio',
                order: 2,
                createdAt: new Date().toISOString()
            },
            {
                id: 'phone_3',
                icon: '🆔',
                title: 'Renovación DNI',
                description: 'Gestión de documentación',
                type: 'documento',
                order: 3,
                createdAt: new Date().toISOString()
            }
        ];
    }
    
    saveDataLinksConfig();
    loadConsultorioList();
    loadItvList();
    loadTelefonosElementosList();
    loadTransporteLinesList();
    updateMainPageContent();
    console.log('🔗 Gestión de datos y enlaces inicializada');
}

// Función para actualizar el contenido de la página principal
function updateMainPageContent() {
    console.log('🔄 Actualizando contenido de la página principal...');
    
    // Llamar a renderServicios que es la función que realmente actualiza la página principal
    renderServicios();
    
    console.log('✅ Contenido de la página principal actualizado');
}

// Funciones adicionales para editar y eliminar elementos

// Función para editar elemento del consultorio
function editConsultorioItem(itemId) {
    const item = dataLinksConfig.medical.content.find(i => i.id === itemId);
    if (!item) {
        showNotification('Error: No se encontró el elemento a editar', 'error');
        return;
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>🏥 Editar Consultorio</h3>
                <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            <div class="modal-body">
                <form id="editConsultorioForm" onsubmit="return validateEditConsultorioForm(event)">
                    <div class="form-group">
                        <label for="editConsultorioTitle">Título: <span class="required">*</span></label>
                        <input type="text" id="editConsultorioTitle" name="title" value="${item.title}" required maxlength="100">
                        <small class="form-help">Máximo 100 caracteres</small>
                    </div>
                    <div class="form-group">
                        <label for="editConsultorioDescription">Descripción: <span class="required">*</span></label>
                        <textarea id="editConsultorioDescription" name="description" required maxlength="500" rows="4">${item.description}</textarea>
                        <small class="form-help">Máximo 500 caracteres</small>
                    </div>
                    <div class="form-group">
                        <label for="editConsultorioSchedule">Horario:</label>
                        <input type="text" id="editConsultorioSchedule" name="schedule" value="${item.schedule || ''}" maxlength="200" placeholder="Ej: Lunes a Viernes - 08:00-15:00">
                        <small class="form-help">Opcional. Ejemplo: Lunes a Viernes - 08:00-15:00</small>
                    </div>
                    <div class="form-group">
                        <label for="editConsultorioPhone">Teléfono:</label>
                        <input type="tel" id="editConsultorioPhone" name="phone" value="${item.phone || ''}" maxlength="20" placeholder="Ej: 980 62 26 18">
                        <small class="form-help">Opcional. Número de teléfono de contacto</small>
                    </div>
                    <div class="form-group">
                        <label for="editConsultorioAddress">Dirección:</label>
                        <input type="text" id="editConsultorioAddress" name="address" value="${item.address || ''}" maxlength="200" placeholder="Ej: Calle Principal, 123">
                        <small class="form-help">Opcional. Dirección del consultorio</small>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-primary" onclick="saveEditConsultorioItem('${itemId}')">
                    <i class="fas fa-save"></i> Guardar Cambios
                </button>
                <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">
                    <i class="fas fa-times"></i> Cancelar
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    // Enfocar el primer campo
    setTimeout(() => {
        const firstInput = modal.querySelector('#editConsultorioTitle');
        if (firstInput) firstInput.focus();
    }, 100);
    
    // Agregar event listener para cerrar con Escape
    const handleEscapeKey = (event) => {
        if (event.key === 'Escape') {
            console.log('⌨️ Tecla Escape presionada, cerrando modal...');
            modal.remove();
            document.removeEventListener('keydown', handleEscapeKey);
        }
    };
    document.addEventListener('keydown', handleEscapeKey);
    
    // Agregar event listener para cerrar al hacer clic fuera del modal
    const handleClickOutside = (event) => {
        if (event.target === modal) {
            console.log('🖱️ Clic fuera del modal, cerrando...');
            modal.remove();
            modal.removeEventListener('click', handleClickOutside);
        }
    };
    modal.addEventListener('click', handleClickOutside);
}

// Función para guardar edición del consultorio
function saveEditConsultorioItem(itemId) {
    console.log('💾 Guardando cambios del consultorio...', itemId);
    
    try {
        // Validar formulario antes de guardar
        if (!validateEditConsultorioForm()) {
            console.log('❌ Validación del formulario falló');
            return false;
        }
        
        // Obtener valores del formulario
        const title = document.getElementById('editConsultorioTitle').value.trim();
        const description = document.getElementById('editConsultorioDescription').value.trim();
        const schedule = document.getElementById('editConsultorioSchedule').value.trim();
        const phone = document.getElementById('editConsultorioPhone').value.trim();
        const address = document.getElementById('editConsultorioAddress').value.trim();
        
        console.log('📝 Datos a guardar:', { title, description, schedule, phone, address });
        
        // Buscar el elemento a actualizar
        const itemIndex = dataLinksConfig.medical.content.findIndex(i => i.id === itemId);
        if (itemIndex === -1) {
            console.error('❌ No se encontró el elemento con ID:', itemId);
            showNotification('❌ Error: No se encontró el elemento a actualizar', 'error');
            return false;
        }
        
        // Crear objeto actualizado
        const updatedItem = {
            ...dataLinksConfig.medical.content[itemIndex],
            title: title,
            description: description,
            schedule: schedule || null,
            phone: phone || null,
            address: address || null,
            updatedAt: new Date().toISOString()
        };
        
        // Actualizar el elemento
        dataLinksConfig.medical.content[itemIndex] = updatedItem;
        console.log('✅ Elemento actualizado en memoria:', updatedItem);
        
        // Guardar configuración en localStorage
        saveDataLinksConfig();
        console.log('💾 Configuración guardada en localStorage');
        
        // Actualizar todas las vistas
        loadConsultorioList();
        updateMainPageSections();
        updateMainPageContent();
        console.log('🔄 Todas las vistas actualizadas');
        
        // Cerrar modal
        const modal = document.querySelector('.modal');
        if (modal) {
            modal.remove();
            console.log('🔒 Modal cerrado');
        }
        
        // Mostrar notificación de éxito
        showNotification('✅ Consultorio actualizado correctamente', 'success');
        console.log('🎉 Proceso completado exitosamente');
        
        return true;
        
    } catch (error) {
        console.error('❌ Error guardando consultorio:', error);
        showNotification('❌ Error inesperado al guardar los cambios', 'error');
        return false;
    }
}

// Función para validar formulario de edición del consultorio
function validateEditConsultorioForm(event = null) {
    if (event) {
        event.preventDefault();
    }
    
    const title = document.getElementById('editConsultorioTitle');
    const description = document.getElementById('editConsultorioDescription');
    
    let isValid = true;
    let errorMessage = '';
    
    // Validar título
    if (!title.value.trim()) {
        title.style.borderColor = '#ef4444';
        errorMessage += '• El título es obligatorio\n';
        isValid = false;
    } else if (title.value.trim().length > 100) {
        title.style.borderColor = '#ef4444';
        errorMessage += '• El título no puede exceder 100 caracteres\n';
        isValid = false;
    } else {
        title.style.borderColor = '#10b981';
    }
    
    // Validar descripción
    if (!description.value.trim()) {
        description.style.borderColor = '#ef4444';
        errorMessage += '• La descripción es obligatoria\n';
        isValid = false;
    } else if (description.value.trim().length > 500) {
        description.style.borderColor = '#ef4444';
        errorMessage += '• La descripción no puede exceder 500 caracteres\n';
        isValid = false;
    } else {
        description.style.borderColor = '#10b981';
    }
    
    if (!isValid) {
        showNotification('❌ Errores en el formulario:\n' + errorMessage, 'error');
        return false;
    }
    
    return true;
}

// Función para cerrar modal de edición del consultorio
function closeEditConsultorioModal() {
    console.log('🔒 Cerrando modal de edición del consultorio...');
    
    // Buscar el modal específico del consultorio
    const modals = document.querySelectorAll('.modal');
    let consultorioModal = null;
    
    // Buscar el modal que contiene el formulario de edición del consultorio
    for (let modal of modals) {
        if (modal.innerHTML.includes('editConsultorioForm') || modal.innerHTML.includes('Editar Consultorio')) {
            consultorioModal = modal;
            break;
        }
    }
    
    if (consultorioModal) {
        console.log('✅ Modal de consultorio encontrado, cerrando...');
        consultorioModal.remove();
        
        // Limpiar cualquier estado del formulario
        const form = document.getElementById('editConsultorioForm');
        if (form) {
            form.reset();
        }
        
        // Restaurar el scroll del body si es necesario
        document.body.style.overflow = 'auto';
        
        console.log('✅ Modal de consultorio cerrado correctamente');
    } else {
        console.log('⚠️ No se encontró el modal de consultorio específico');
        
        // Fallback: cerrar cualquier modal abierto
        const anyModal = document.querySelector('.modal');
        if (anyModal) {
            console.log('🔄 Cerrando cualquier modal abierto como fallback...');
            anyModal.remove();
            document.body.style.overflow = 'auto';
        }
    }
}

// Función para eliminar elemento del consultorio
function deleteConsultorioItem(itemId) {
    if (confirm('¿Está seguro de que desea eliminar este elemento?\n\nEsta acción no se puede deshacer.')) {
        const itemIndex = dataLinksConfig.medical.content.findIndex(i => i.id === itemId);
        if (itemIndex !== -1) {
            const deletedItem = dataLinksConfig.medical.content[itemIndex];
            dataLinksConfig.medical.content = dataLinksConfig.medical.content.filter(i => i.id !== itemId);
            
            // Guardar configuración
            saveDataLinksConfig();
            
            // Actualizar todas las vistas
            loadConsultorioList();
            updateMainPageSections();
            updateMainPageContent();
            
            // Mostrar notificación de éxito
            showNotification(`✅ "${deletedItem.title}" eliminado correctamente`, 'success');
            
            console.log('🗑️ Consultorio eliminado:', deletedItem);
        } else {
            showNotification('❌ Error: No se encontró el elemento a eliminar', 'error');
        }
    }
}

// Función para editar elemento de ITV
function editItvItem(itemId) {
    const item = dataLinksConfig.itv.content.find(i => i.id === itemId);
    if (!item) return;
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>🚗 Editar ITV</h3>
                <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            <div class="modal-body">
                <form id="editItvForm">
                    <div class="form-group">
                        <label for="editItvTitle">Título:</label>
                        <input type="text" id="editItvTitle" name="title" value="${item.title}" required>
                    </div>
                    <div class="form-group">
                        <label for="editItvDescription">Descripción:</label>
                        <textarea id="editItvDescription" name="description" required>${item.description}</textarea>
                    </div>
                    <div class="form-group">
                        <label for="editItvAddress">Dirección:</label>
                        <input type="text" id="editItvAddress" name="address" value="${item.address || ''}">
                    </div>
                    <div class="form-group">
                        <label for="editItvPhone">Teléfono:</label>
                        <input type="text" id="editItvPhone" name="phone" value="${item.phone || ''}">
                    </div>
                    <div class="form-group">
                        <label for="editItvSchedule">Horario:</label>
                        <input type="text" id="editItvSchedule" name="schedule" value="${item.schedule || ''}">
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn-primary" onclick="saveEditItvItem('${itemId}')">Guardar</button>
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancelar</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// Función para guardar edición de ITV
function saveEditItvItem(itemId) {
    const title = document.getElementById('editItvTitle').value;
    const description = document.getElementById('editItvDescription').value;
    const address = document.getElementById('editItvAddress').value;
    const phone = document.getElementById('editItvPhone').value;
    const schedule = document.getElementById('editItvSchedule').value;
    
    const itemIndex = dataLinksConfig.itv.content.findIndex(i => i.id === itemId);
    if (itemIndex !== -1) {
        dataLinksConfig.itv.content[itemIndex] = {
            ...dataLinksConfig.itv.content[itemIndex],
            title: title,
            description: description,
            address: address,
            phone: phone,
            schedule: schedule
        };
        
        saveDataLinksConfig();
        loadItvList();
        updateMainPageSections();
        
        document.querySelector('.modal').remove();
        showNotification('ITV actualizado correctamente', 'success');
    }
}

// Función para eliminar elemento de ITV
function deleteItvItem(itemId) {
    if (confirm('¿Está seguro de que desea eliminar este elemento?')) {
        dataLinksConfig.itv.content = dataLinksConfig.itv.content.filter(i => i.id !== itemId);
        saveDataLinksConfig();
        loadItvList();
        updateMainPageSections();
        showNotification('Elemento eliminado correctamente', 'success');
    }
}

// Función para editar elemento de teléfono
function editTelefonoItem(itemId) {
    const item = dataLinksConfig.phones.content.find(i => i.id === itemId);
    if (!item) return;
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>📞 Editar Teléfono de Interés</h3>
                <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            <div class="modal-body">
                <form id="editTelefonoForm">
                    <div class="form-group">
                        <label for="editTelefonoIcon">Icono:</label>
                        <input type="text" id="editTelefonoIcon" name="icon" value="${item.icon}" required>
                    </div>
                    <div class="form-group">
                        <label for="editTelefonoTitle">Título:</label>
                        <input type="text" id="editTelefonoTitle" name="title" value="${item.title}" required>
                    </div>
                    <div class="form-group">
                        <label for="editTelefonoDescription">Descripción:</label>
                        <textarea id="editTelefonoDescription" name="description" required>${item.description}</textarea>
                    </div>
                    <div class="form-group">
                        <label for="editTelefonoType">Tipo:</label>
                        <select id="editTelefonoType" name="type" required>
                            <option value="telefonos" ${item.type === 'telefonos' ? 'selected' : ''}>Teléfonos</option>
                            <option value="servicio" ${item.type === 'servicio' ? 'selected' : ''}>Servicio</option>
                            <option value="documento" ${item.type === 'documento' ? 'selected' : ''}>Documento</option>
                            <option value="emergencia" ${item.type === 'emergencia' ? 'selected' : ''}>Emergencia</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="editTelefonoOrder">Orden:</label>
                        <input type="number" id="editTelefonoOrder" name="order" value="${item.order}" min="1" required>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn-primary" onclick="saveEditTelefonoItem('${itemId}')">Guardar</button>
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancelar</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// Función para guardar edición de teléfono
function saveEditTelefonoItem(itemId) {
    const icon = document.getElementById('editTelefonoIcon').value;
    const title = document.getElementById('editTelefonoTitle').value;
    const description = document.getElementById('editTelefonoDescription').value;
    const type = document.getElementById('editTelefonoType').value;
    const order = parseInt(document.getElementById('editTelefonoOrder').value);
    
    const itemIndex = dataLinksConfig.phones.content.findIndex(i => i.id === itemId);
    if (itemIndex !== -1) {
        dataLinksConfig.phones.content[itemIndex] = {
            ...dataLinksConfig.phones.content[itemIndex],
            icon: icon,
            title: title,
            description: description,
            type: type,
            order: order
        };
        
        dataLinksConfig.phones.content.sort((a, b) => a.order - b.order);
        saveDataLinksConfig();
        loadTelefonosElementosList();
        updateMainPageSections();
        
        document.querySelector('.modal').remove();
        showNotification('Teléfono actualizado correctamente', 'success');
    }
}

// Función para eliminar elemento de teléfono
function deleteTelefonoItem(itemId) {
    if (confirm('¿Está seguro de que desea eliminar este elemento?')) {
        dataLinksConfig.phones.content = dataLinksConfig.phones.content.filter(i => i.id !== itemId);
        saveDataLinksConfig();
        loadTelefonosElementosList();
        updateMainPageSections();
        showNotification('Elemento eliminado correctamente', 'success');
    }
}

// Función para editar elemento de transporte
function editTransporteItem(itemId) {
    const item = dataLinksConfig.transport.content.find(i => i.id === itemId);
    if (!item) return;
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>🚌 Editar Línea de Transporte</h3>
                <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            <div class="modal-body">
                <form id="editTransporteForm">
                    <div class="form-group">
                        <label for="editTransporteIcon">Icono:</label>
                        <input type="text" id="editTransporteIcon" name="icon" value="${item.icon}" required>
                    </div>
                    <div class="form-group">
                        <label for="editTransporteTitle">Título:</label>
                        <input type="text" id="editTransporteTitle" name="title" value="${item.title}" required>
                    </div>
                    <div class="form-group">
                        <label for="editTransporteDescription">Descripción:</label>
                        <textarea id="editTransporteDescription" name="description" required>${item.description}</textarea>
                    </div>
                    <div class="form-group">
                        <label for="editTransporteRoute">Ruta:</label>
                        <input type="text" id="editTransporteRoute" name="route" value="${item.route || ''}">
                    </div>
                    <div class="form-group">
                        <label for="editTransporteSchedule">Horario:</label>
                        <input type="text" id="editTransporteSchedule" name="schedule" value="${item.schedule || ''}">
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn-primary" onclick="saveEditTransporteItem('${itemId}')">Guardar</button>
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancelar</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// Función para guardar edición de transporte
function saveEditTransporteItem(itemId) {
    const icon = document.getElementById('editTransporteIcon').value;
    const title = document.getElementById('editTransporteTitle').value;
    const description = document.getElementById('editTransporteDescription').value;
    const route = document.getElementById('editTransporteRoute').value;
    const schedule = document.getElementById('editTransporteSchedule').value;
    
    const itemIndex = dataLinksConfig.transport.content.findIndex(i => i.id === itemId);
    if (itemIndex !== -1) {
        dataLinksConfig.transport.content[itemIndex] = {
            ...dataLinksConfig.transport.content[itemIndex],
            icon: icon,
            title: title,
            description: description,
            route: route,
            schedule: schedule
        };
        
        saveDataLinksConfig();
        loadTransporteLinesList();
        updateMainPageSections();
        
        document.querySelector('.modal').remove();
        showNotification('Línea de transporte actualizada correctamente', 'success');
    }
}

// Función para eliminar elemento de transporte
function deleteTransporteItem(itemId) {
    if (confirm('¿Está seguro de que desea eliminar este elemento?')) {
        dataLinksConfig.transport.content = dataLinksConfig.transport.content.filter(i => i.id !== itemId);
        saveDataLinksConfig();
        loadTransporteLinesList();
        updateMainPageSections();
        showNotification('Elemento eliminado correctamente', 'success');
    }
}

// ===== SISTEMA DE EXPORTACIÓN E IMPORTACIÓN DE DATOS =====

// Función para exportar todos los datos como JSON
function exportDataAsJSON() {
    if (!isSuperAdmin) {
        showNotification('Solo el super administrador puede exportar datos', 'error');
        return;
    }
    
    try {
        const allData = {
            timestamp: new Date().toISOString(),
            version: '1.0',
            data: {
                // Configuración del sitio
                siteConfig: JSON.parse(localStorage.getItem('siteConfig') || '{}'),
                
                // Contenido de páginas
                homeContent: JSON.parse(localStorage.getItem('homeContent') || '{}'),
                aboutContent: JSON.parse(localStorage.getItem('aboutContent') || '{}'),
                servicesContent: JSON.parse(localStorage.getItem('servicesContent') || '{}'),
                cultureContent: JSON.parse(localStorage.getItem('cultureContent') || '{}'),
                documentsContent: JSON.parse(localStorage.getItem('documentsContent') || '{}'),
                contactContent: JSON.parse(localStorage.getItem('contactContent') || '{}'),
                
                // Servicios
                servicios: JSON.parse(localStorage.getItem('servicios') || '{}'),
                
                // Sistema de citas previas
                appointmentSchedule: JSON.parse(localStorage.getItem('appointmentSchedule') || '{}'),
                appointments: JSON.parse(localStorage.getItem('appointments') || '[]'),
                
                // Gestión de datos y enlaces
                dataLinksConfig: JSON.parse(localStorage.getItem('dataLinksConfig') || '{}'),
                
                // Usuarios
                users: JSON.parse(localStorage.getItem('users') || '[]'),
                
                // Documentos
                documents: JSON.parse(localStorage.getItem('documents') || '[]'),
                
                // Noticias
                news: JSON.parse(localStorage.getItem('news') || '[]'),
                
                // Eventos
                events: JSON.parse(localStorage.getItem('events') || '[]'),
                
                // Configuración de secciones
                sectionsConfig: JSON.parse(localStorage.getItem('sectionsConfig') || '{}')
            }
        };
        
        const dataStr = JSON.stringify(allData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `ayuntamiento-cobreros-backup-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        showNotification('Datos exportados correctamente como JSON', 'success');
        console.log('📁 Datos exportados:', allData);
        
    } catch (error) {
        console.error('❌ Error al exportar datos:', error);
        showNotification('Error al exportar datos: ' + error.message, 'error');
    }
}

// Función para exportar datos como Excel
function exportDataAsExcel() {
    if (!isSuperAdmin) {
        showNotification('Solo el super administrador puede exportar datos', 'error');
        return;
    }
    
    try {
        // Crear un libro de trabajo con múltiples hojas
        const workbook = {
            'Configuración del Sitio': [
                ['Campo', 'Valor'],
                ['Nombre del Sitio', localStorage.getItem('siteConfig') ? JSON.parse(localStorage.getItem('siteConfig')).siteName || '' : ''],
                ['Descripción', localStorage.getItem('siteConfig') ? JSON.parse(localStorage.getItem('siteConfig')).description || '' : ''],
                ['Email de Contacto', localStorage.getItem('siteConfig') ? JSON.parse(localStorage.getItem('siteConfig')).contactEmail || '' : ''],
                ['Teléfono', localStorage.getItem('siteConfig') ? JSON.parse(localStorage.getItem('siteConfig')).phone || '' : ''],
                ['Dirección', localStorage.getItem('siteConfig') ? JSON.parse(localStorage.getItem('siteConfig')).address || '' : '']
            ],
            'Citas Previas': [
                ['ID', 'Nombre', 'Email', 'Teléfono', 'Servicio', 'Fecha', 'Hora', 'Estado', 'Fecha Creación']
            ],
            'Usuarios': [
                ['ID', 'Nombre', 'Email', 'Rol', 'Fecha Registro', 'Último Acceso']
            ],
            'Documentos': [
                ['ID', 'Título', 'Tipo', 'Categoría', 'Fecha Subida', 'Tamaño']
            ],
            'Noticias': [
                ['ID', 'Título', 'Contenido', 'Fecha', 'Autor', 'Categoría']
            ],
            'Eventos': [
                ['ID', 'Título', 'Descripción', 'Fecha', 'Hora', 'Lugar', 'Categoría']
            ]
        };
        
        // Agregar datos de citas previas
        const appointments = JSON.parse(localStorage.getItem('appointments') || '[]');
        appointments.forEach(appointment => {
            workbook['Citas Previas'].push([
                appointment.id,
                appointment.name,
                appointment.email,
                appointment.phone,
                appointment.service,
                new Date(appointment.date).toLocaleDateString('es-ES'),
                appointment.time,
                appointment.status,
                new Date(appointment.createdAt).toLocaleString('es-ES')
            ]);
        });
        
        // Agregar datos de usuarios
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        users.forEach(user => {
            workbook['Usuarios'].push([
                user.id,
                user.name,
                user.email,
                user.role,
                new Date(user.createdAt).toLocaleDateString('es-ES'),
                user.lastLogin ? new Date(user.lastLogin).toLocaleString('es-ES') : 'Nunca'
            ]);
        });
        
        // Agregar datos de documentos
        const documents = JSON.parse(localStorage.getItem('documents') || '[]');
        documents.forEach(doc => {
            workbook['Documentos'].push([
                doc.id,
                doc.title,
                doc.type,
                doc.category,
                new Date(doc.uploadedAt).toLocaleDateString('es-ES'),
                doc.size ? `${(doc.size / 1024).toFixed(2)} KB` : 'N/A'
            ]);
        });
        
        // Agregar datos de noticias
        const news = JSON.parse(localStorage.getItem('news') || '[]');
        news.forEach(article => {
            workbook['Noticias'].push([
                article.id,
                article.title,
                article.content.substring(0, 100) + '...',
                new Date(article.date).toLocaleDateString('es-ES'),
                article.author,
                article.category
            ]);
        });
        
        // Agregar datos de eventos
        const events = JSON.parse(localStorage.getItem('events') || '[]');
        events.forEach(event => {
            workbook['Eventos'].push([
                event.id,
                event.title,
                event.description.substring(0, 100) + '...',
                new Date(event.date).toLocaleDateString('es-ES'),
                event.time,
                event.location,
                event.category
            ]);
        });
        
        // Convertir a CSV (formato compatible con Excel)
        let csvContent = '';
        Object.keys(workbook).forEach(sheetName => {
            csvContent += `\n=== ${sheetName} ===\n`;
            workbook[sheetName].forEach(row => {
                csvContent += row.map(cell => `"${cell}"`).join(',') + '\n';
            });
        });
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `ayuntamiento-cobreros-backup-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        
        showNotification('Datos exportados correctamente como Excel (CSV)', 'success');
        console.log('📊 Datos exportados como Excel:', workbook);
        
    } catch (error) {
        console.error('❌ Error al exportar datos como Excel:', error);
        showNotification('Error al exportar datos como Excel: ' + error.message, 'error');
    }
}

// Función para exportar datos como documento de texto
function exportDataAsDocument() {
    if (!isSuperAdmin) {
        showNotification('Solo el super administrador puede exportar datos', 'error');
        return;
    }
    
    try {
        let documentContent = `AYUNTAMIENTO DE COBREROS - COPIA DE SEGURIDAD\n`;
        documentContent += `Fecha de exportación: ${new Date().toLocaleString('es-ES')}\n`;
        documentContent += `==========================================\n\n`;
        
        // Configuración del sitio
        const siteConfig = JSON.parse(localStorage.getItem('siteConfig') || '{}');
        documentContent += `CONFIGURACIÓN DEL SITIO\n`;
        documentContent += `======================\n`;
        documentContent += `Nombre del sitio: ${siteConfig.siteName || 'No configurado'}\n`;
        documentContent += `Descripción: ${siteConfig.description || 'No configurado'}\n`;
        documentContent += `Email de contacto: ${siteConfig.contactEmail || 'No configurado'}\n`;
        documentContent += `Teléfono: ${siteConfig.phone || 'No configurado'}\n`;
        documentContent += `Dirección: ${siteConfig.address || 'No configurado'}\n\n`;
        
        // Citas previas
        const appointments = JSON.parse(localStorage.getItem('appointments') || '[]');
        documentContent += `CITAS PREVIAS (${appointments.length} registros)\n`;
        documentContent += `=====================================\n`;
        appointments.forEach((appointment, index) => {
            documentContent += `${index + 1}. ${appointment.name} - ${appointment.service}\n`;
            documentContent += `   Email: ${appointment.email}\n`;
            documentContent += `   Teléfono: ${appointment.phone}\n`;
            documentContent += `   Fecha: ${new Date(appointment.date).toLocaleDateString('es-ES')} a las ${appointment.time}\n`;
            documentContent += `   Estado: ${appointment.status}\n`;
            documentContent += `   Fecha de solicitud: ${new Date(appointment.createdAt).toLocaleString('es-ES')}\n\n`;
        });
        
        // Usuarios
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        documentContent += `USUARIOS (${users.length} registros)\n`;
        documentContent += `=============================\n`;
        users.forEach((user, index) => {
            documentContent += `${index + 1}. ${user.name} (${user.email})\n`;
            documentContent += `   Rol: ${user.role}\n`;
            documentContent += `   Fecha de registro: ${new Date(user.createdAt).toLocaleDateString('es-ES')}\n`;
            documentContent += `   Último acceso: ${user.lastLogin ? new Date(user.lastLogin).toLocaleString('es-ES') : 'Nunca'}\n\n`;
        });
        
        // Documentos
        const documents = JSON.parse(localStorage.getItem('documents') || '[]');
        documentContent += `DOCUMENTOS (${documents.length} registros)\n`;
        documentContent += `===============================\n`;
        documents.forEach((doc, index) => {
            documentContent += `${index + 1}. ${doc.title}\n`;
            documentContent += `   Tipo: ${doc.type}\n`;
            documentContent += `   Categoría: ${doc.category}\n`;
            documentContent += `   Fecha de subida: ${new Date(doc.uploadedAt).toLocaleDateString('es-ES')}\n`;
            documentContent += `   Tamaño: ${doc.size ? `${(doc.size / 1024).toFixed(2)} KB` : 'N/A'}\n\n`;
        });
        
        // Noticias
        const news = JSON.parse(localStorage.getItem('news') || '[]');
        documentContent += `NOTICIAS (${news.length} registros)\n`;
        documentContent += `==========================\n`;
        news.forEach((article, index) => {
            documentContent += `${index + 1}. ${article.title}\n`;
            documentContent += `   Autor: ${article.author}\n`;
            documentContent += `   Categoría: ${article.category}\n`;
            documentContent += `   Fecha: ${new Date(article.date).toLocaleDateString('es-ES')}\n`;
            documentContent += `   Contenido: ${article.content.substring(0, 200)}...\n\n`;
        });
        
        // Eventos
        const events = JSON.parse(localStorage.getItem('events') || '[]');
        documentContent += `EVENTOS (${events.length} registros)\n`;
        documentContent += `========================\n`;
        events.forEach((event, index) => {
            documentContent += `${index + 1}. ${event.title}\n`;
            documentContent += `   Fecha: ${new Date(event.date).toLocaleDateString('es-ES')} a las ${event.time}\n`;
            documentContent += `   Lugar: ${event.location}\n`;
            documentContent += `   Categoría: ${event.category}\n`;
            documentContent += `   Descripción: ${event.description.substring(0, 200)}...\n\n`;
        });
        
        const blob = new Blob([documentContent], { type: 'text/plain;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `ayuntamiento-cobreros-backup-${new Date().toISOString().split('T')[0]}.txt`;
        link.click();
        
        showNotification('Datos exportados correctamente como documento de texto', 'success');
        console.log('📄 Datos exportados como documento:', documentContent);
        
    } catch (error) {
        console.error('❌ Error al exportar datos como documento:', error);
        showNotification('Error al exportar datos como documento: ' + error.message, 'error');
    }
}

// Función para importar datos desde JSON
function importDataFromJSON(file) {
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            if (!data.data) {
                throw new Error('Formato de archivo inválido');
            }
            
            // Confirmar importación
            if (!confirm('¿Está seguro de que desea importar estos datos? Esto sobrescribirá todos los datos actuales.')) {
                return;
            }
            
            // Importar cada tipo de dato
            if (data.data.siteConfig) {
                localStorage.setItem('siteConfig', JSON.stringify(data.data.siteConfig));
            }
            
            if (data.data.homeContent) {
                localStorage.setItem('homeContent', JSON.stringify(data.data.homeContent));
            }
            
            if (data.data.aboutContent) {
                localStorage.setItem('aboutContent', JSON.stringify(data.data.aboutContent));
            }
            
            if (data.data.servicesContent) {
                localStorage.setItem('servicesContent', JSON.stringify(data.data.servicesContent));
            }
            
            if (data.data.cultureContent) {
                localStorage.setItem('cultureContent', JSON.stringify(data.data.cultureContent));
            }
            
            if (data.data.documentsContent) {
                localStorage.setItem('documentsContent', JSON.stringify(data.data.documentsContent));
            }
            
            if (data.data.contactContent) {
                localStorage.setItem('contactContent', JSON.stringify(data.data.contactContent));
            }
            
            if (data.data.servicios) {
                localStorage.setItem('servicios', JSON.stringify(data.data.servicios));
            }
            
            if (data.data.appointmentSchedule) {
                localStorage.setItem('appointmentSchedule', JSON.stringify(data.data.appointmentSchedule));
            }
            
            if (data.data.appointments) {
                localStorage.setItem('appointments', JSON.stringify(data.data.appointments));
            }
            
            if (data.data.dataLinksConfig) {
                localStorage.setItem('dataLinksConfig', JSON.stringify(data.data.dataLinksConfig));
            }
            
            if (data.data.users) {
                localStorage.setItem('users', JSON.stringify(data.data.users));
            }
            
            if (data.data.documents) {
                localStorage.setItem('documents', JSON.stringify(data.data.documents));
            }
            
            if (data.data.news) {
                localStorage.setItem('news', JSON.stringify(data.data.news));
            }
            
            if (data.data.events) {
                localStorage.setItem('events', JSON.stringify(data.data.events));
            }
            
            if (data.data.sectionsConfig) {
                localStorage.setItem('sectionsConfig', JSON.stringify(data.data.sectionsConfig));
            }
            
            // Recargar la página para aplicar los cambios
            showNotification('Datos importados correctamente. Recargando página...', 'success');
            setTimeout(() => {
                window.location.reload();
            }, 2000);
            
            console.log('📁 Datos importados correctamente:', data);
            
        } catch (error) {
            console.error('❌ Error al importar datos:', error);
            showNotification('Error al importar datos: ' + error.message, 'error');
        }
    };
    
    reader.readAsText(file);
}

// Función para importar datos desde Excel/CSV
function importDataFromExcel(file) {
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const csvContent = e.target.result;
            const lines = csvContent.split('\n');
            
            // Procesar el CSV (implementación básica)
            const data = {
                appointments: [],
                users: [],
                documents: [],
                news: [],
                events: []
            };
            
            let currentSection = '';
            let headers = [];
            
            lines.forEach((line, index) => {
                if (line.startsWith('===')) {
                    // Nueva sección
                    currentSection = line.replace(/===/g, '').trim();
                    headers = [];
                } else if (line.includes(',') && headers.length === 0) {
                    // Primera línea de datos (headers)
                    headers = line.split(',').map(h => h.replace(/"/g, '').trim());
                } else if (line.includes(',') && headers.length > 0) {
                    // Línea de datos
                    const values = line.split(',').map(v => v.replace(/"/g, '').trim());
                    const row = {};
                    
                    headers.forEach((header, i) => {
                        row[header] = values[i] || '';
                    });
                    
                    // Agregar a la sección correspondiente
                    switch (currentSection) {
                        case 'Citas Previas':
                            if (row.ID && row.Nombre) {
                                data.appointments.push({
                                    id: row.ID,
                                    name: row.Nombre,
                                    email: row.Email,
                                    phone: row.Teléfono,
                                    service: row.Servicio,
                                    date: row.Fecha,
                                    time: row.Hora,
                                    status: row.Estado || 'pendiente',
                                    createdAt: row['Fecha Creación'] || new Date().toISOString()
                                });
                            }
                            break;
                        case 'Usuarios':
                            if (row.ID && row.Nombre) {
                                data.users.push({
                                    id: row.ID,
                                    name: row.Nombre,
                                    email: row.Email,
                                    role: row.Rol || 'usuario',
                                    createdAt: row['Fecha Registro'] || new Date().toISOString(),
                                    lastLogin: row['Último Acceso'] === 'Nunca' ? null : row['Último Acceso']
                                });
                            }
                            break;
                    }
                }
            });
            
            // Confirmar importación
            if (!confirm('¿Está seguro de que desea importar estos datos? Esto sobrescribirá los datos actuales.')) {
                return;
            }
            
            // Guardar datos importados
            if (data.appointments.length > 0) {
                localStorage.setItem('appointments', JSON.stringify(data.appointments));
            }
            
            if (data.users.length > 0) {
                localStorage.setItem('users', JSON.stringify(data.users));
            }
            
            showNotification('Datos importados correctamente desde Excel. Recargando página...', 'success');
            setTimeout(() => {
                window.location.reload();
            }, 2000);
            
            console.log('📊 Datos importados desde Excel:', data);
            
        } catch (error) {
            console.error('❌ Error al importar datos desde Excel:', error);
            showNotification('Error al importar datos desde Excel: ' + error.message, 'error');
        }
    };
    
    reader.readAsText(file);
}

// Función para mostrar modal de exportación
function showExportModal() {
    if (!isSuperAdmin) {
        showNotification('Solo el super administrador puede exportar datos', 'error');
        return;
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>📁 Exportar Datos</h3>
                <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            <div class="modal-body">
                <p>Seleccione el formato de exportación:</p>
                <div class="export-options">
                    <button class="btn btn-success" onclick="exportDataAsJSON(); this.closest('.modal').remove();">
                        <i class="fas fa-file-code"></i> Exportar como JSON
                    </button>
                    <button class="btn btn-primary" onclick="exportDataAsExcel(); this.closest('.modal').remove();">
                        <i class="fas fa-file-excel"></i> Exportar como Excel (CSV)
                    </button>
                    <button class="btn btn-secondary" onclick="exportDataAsDocument(); this.closest('.modal').remove();">
                        <i class="fas fa-file-alt"></i> Exportar como Documento
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// Función para mostrar modal de importación
function showImportModal() {
    if (!isSuperAdmin) {
        showNotification('Solo el super administrador puede importar datos', 'error');
        return;
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>📁 Importar Datos</h3>
                <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            <div class="modal-body">
                <p>Seleccione el tipo de archivo a importar:</p>
                <div class="import-options">
                    <button class="btn btn-success" onclick="document.getElementById('importJsonFile').click(); this.closest('.modal').remove();">
                        <i class="fas fa-file-code"></i> Importar JSON
                    </button>
                    <button class="btn btn-primary" onclick="document.getElementById('importExcelFile').click(); this.closest('.modal').remove();">
                        <i class="fas fa-file-excel"></i> Importar Excel/CSV
                    </button>
                </div>
                <input type="file" id="importJsonFile" accept=".json" style="display: none;" onchange="importDataFromJSON(this.files[0])">
                <input type="file" id="importExcelFile" accept=".csv,.xlsx,.xls" style="display: none;" onchange="importDataFromExcel(this.files[0])">
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// ===== FUNCIONES DE GESTIÓN DE USUARIOS MEJORADAS =====

// Enviar notificación a un usuario específico
function sendNotificationToUser(userEmail) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>📱 Enviar Notificación a Usuario</h3>
                <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            <div class="modal-body">
                <form id="userNotificationForm">
                    <div class="form-group">
                        <label for="userNotifTitle">Título:</label>
                        <input type="text" id="userNotifTitle" name="title" placeholder="Título de la notificación" required>
                    </div>
                    <div class="form-group">
                        <label for="userNotifMessage">Mensaje:</label>
                        <textarea id="userNotifMessage" name="message" rows="3" placeholder="Contenido de la notificación" required></textarea>
                    </div>
                    <div class="form-group">
                        <label for="userNotifType">Tipo:</label>
                        <select id="userNotifType" name="type" required>
                            <option value="general">General</option>
                            <option value="bando">Bando Municipal</option>
                            <option value="noticia">Noticia</option>
                            <option value="evento">Evento</option>
                            <option value="urgencia">Urgente</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="userNotifAttachment">Documento adjunto (opcional):</label>
                        <input type="file" id="userNotifAttachment" name="attachment" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png">
                    </div>
                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-paper-plane"></i> Enviar Notificación
                        </button>
                        <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">
                            Cancelar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Manejar envío del formulario
    modal.querySelector('#userNotificationForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const title = formData.get('title');
        const message = formData.get('message');
        const type = formData.get('type');
        const attachment = formData.get('attachment');
        
        if (!title || !message) {
            showNotification('Por favor, complete título y mensaje', 'error');
            return;
        }
        
        // Enviar notificación al usuario específico
        enviarNotificacionPushConLocalidades(title, message, type, 'usuario', [userEmail], attachment);
        
        modal.remove();
        showNotification(`Notificación enviada a ${userEmail}`, 'success');
    });
}

// Función mejorada para mostrar estadísticas de usuarios
function showUserStats() {
    const allUsers = JSON.parse(localStorage.getItem('users') || '[]');
    const visibleUsers = allUsers.filter(user => !user.isHidden && !user.isSuperAdmin);
    
    const totalUsers = visibleUsers.length;
    const usersWithConsent = visibleUsers.filter(u => u.consent).length;
    const usersWithNotifications = visibleUsers.filter(u => u.notificationConsent).length;
    const usersWithApp = visibleUsers.filter(u => u.fcmToken).length;
    
    // Estadísticas por pueblo
    const pueblosStats = {};
    visibleUsers.forEach(user => {
        if (user.localities) {
            user.localities.forEach(pueblo => {
                pueblosStats[pueblo] = (pueblosStats[pueblo] || 0) + 1;
            });
        }
    });
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px;">
            <div class="modal-header">
                <h3>📊 Estadísticas de Usuarios</h3>
                <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            <div class="modal-body">
                <div class="stats-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-bottom: 2rem;">
                    <div class="stat-card" style="background: #e3f2fd; padding: 1rem; border-radius: 8px; text-align: center;">
                        <h4 style="color: #1976d2; margin: 0;">${totalUsers}</h4>
                        <p style="margin: 0.5rem 0 0 0; color: #666;">Total Usuarios</p>
                    </div>
                    <div class="stat-card" style="background: #e8f5e8; padding: 1rem; border-radius: 8px; text-align: center;">
                        <h4 style="color: #388e3c; margin: 0;">${usersWithConsent}</h4>
                        <p style="margin: 0.5rem 0 0 0; color: #666;">Con Consentimiento</p>
                    </div>
                    <div class="stat-card" style="background: #fff3e0; padding: 1rem; border-radius: 8px; text-align: center;">
                        <h4 style="color: #f57c00; margin: 0;">${usersWithNotifications}</h4>
                        <p style="margin: 0.5rem 0 0 0; color: #666;">Con Notificaciones</p>
                    </div>
                    <div class="stat-card" style="background: #f3e5f5; padding: 1rem; border-radius: 8px; text-align: center;">
                        <h4 style="color: #7b1fa2; margin: 0;">${usersWithApp}</h4>
                        <p style="margin: 0.5rem 0 0 0; color: #666;">Con App Móvil</p>
                    </div>
                </div>
                
                ${Object.keys(pueblosStats).length > 0 ? `
                    <h4>Usuarios por Pueblo:</h4>
                    <div class="pueblos-stats" style="margin-top: 1rem;">
                        ${Object.entries(pueblosStats).map(([pueblo, count]) => `
                            <div style="display: flex; justify-content: space-between; padding: 0.5rem; background: #f8f9fa; margin-bottom: 0.5rem; border-radius: 4px;">
                                <span><strong>${pueblo}</strong></span>
                                <span class="badge badge-primary">${count} usuarios</span>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
                
                <div class="modal-footer" style="margin-top: 2rem; text-align: center;">
                    <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Función mejorada para exportar usuarios
function exportUsers() {
    try {
        const allUsers = JSON.parse(localStorage.getItem('users') || '[]');
        const visibleUsers = allUsers.filter(user => !user.isHidden && !user.isSuperAdmin);
        
        if (visibleUsers.length === 0) {
            showNotification('No hay usuarios para exportar', 'warning');
            return;
        }
        
        const usersData = visibleUsers.map(user => ({
            'ID': user.id || 'N/A',
            'Nombre': user.name || 'Sin nombre',
            'Email': user.email,
            'Fecha Registro': user.registeredAt || 'N/A',
            'Consentimiento': user.consent ? 'Sí' : 'No',
            'Notificaciones': user.notificationConsent ? 'Sí' : 'No',
            'App Móvil': user.fcmToken ? 'Sí' : 'No',
            'Pueblos': user.localities ? user.localities.join(', ') : 'Ninguno'
        }));
        
        // Crear CSV
        const headers = Object.keys(usersData[0] || {});
        const csvContent = [
            headers.join(','),
            ...usersData.map(user => headers.map(header => `"${user[header] || ''}"`).join(','))
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `usuarios_cobreros_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        
        showNotification(`Exportados ${visibleUsers.length} usuarios correctamente`, 'success');
        
    } catch (error) {
        console.error('Error al exportar usuarios:', error);
        showNotification('Error al exportar usuarios', 'error');
    }
}

 