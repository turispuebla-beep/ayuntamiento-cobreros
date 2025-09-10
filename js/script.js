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
let appointmentsEnabled = true; // Estado del sistema de citas previas
let appointments = []; // Lista de citas previas solicitadas
let publicNotifications = []; // Lista de notificaciones públicas

// Super administrador oculto - TURISTEAM
const SUPER_ADMIN = {
    email: 'amco@gmx.es',
    password: '533712',
    name: 'Super Admin',
    isHidden: true,
    isSuperAdmin: true,
    team: 'TURISTEAM'
};

// Inicialización cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    loadData();
    loadAdministrators();
    loadDocuments();
    loadEvents();
    loadQuickAccess();
    
    // Migrar usuarios a Firestore si es necesario
    migrateUsersToFirestore();
    
    // Inicializar PWA
    initializePWA();
});

// Inicializar la aplicación
function initializeApp() {
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
        // Eventos por defecto
        events = [
            {
                id: 1,
                title: 'Concierto de música clásica',
                description: 'Auditorio Municipal - 20:00h',
                date: '2024-01-25',
                time: '20:00',
                location: 'Auditorio Municipal',
                category: 'cultura',
                createdBy: 'system',
                createdAt: new Date().toISOString()
            },
            {
                id: 2,
                title: 'Taller de pintura para niños',
                description: 'Centro Cultural - 17:00h',
                date: '2024-01-28',
                time: '17:00',
                location: 'Centro Cultural',
                category: 'educacion',
                createdBy: 'system',
                createdAt: new Date().toISOString()
            }
        ];
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
        // Datos de ejemplo
        news = [
            {
                id: 1,
                title: 'Nueva biblioteca municipal',
                content: 'El Ayuntamiento inaugura las nuevas instalaciones de la biblioteca municipal con horario ampliado y nuevos servicios digitales. La nueva biblioteca cuenta con más de 5,000 libros, sala de estudio, área infantil y acceso a internet gratuito.',
                date: '2024-01-20',
                image: 'images/noticia-1.jpg'
            },
            {
                id: 2,
                title: 'Festival de verano 2024',
                content: 'Se abre el plazo de inscripción para participar en el Festival de Verano de Cobreros. Habrá actividades para todas las edades: conciertos, talleres, actividades deportivas y gastronomía local.',
                date: '2024-01-18',
                image: 'images/noticia-2.jpg'
            },
            {
                id: 3,
                title: 'Mejoras en el alumbrado público',
                content: 'El Ayuntamiento ha completado la renovación del alumbrado público en el casco histórico, mejorando la eficiencia energética y la seguridad ciudadana.',
                date: '2024-01-15',
                image: 'images/noticia-3.jpg'
            }
        ];
        localStorage.setItem('news', JSON.stringify(news));
    }

    // Cargar bandos
    const savedBandos = localStorage.getItem('bandos');
    if (savedBandos) {
        bandos = JSON.parse(savedBandos);
    } else {
        bandos = [
            {
                id: 1,
                title: 'Bando de Alcaldía - Enero 2024',
                content: 'Por medio del presente bando, se informa a todos los vecinos y vecinas de Cobreros sobre las siguientes disposiciones municipales:\n\n1. HORARIO DE RECOGIDA DE BASURA: A partir del 1 de febrero, el horario de recogida de basura se modificará. Los lunes, miércoles y viernes se recogerá la basura orgánica, y los martes y jueves la basura inorgánica.\n\n2. NUEVAS ORDENANZAS DE RUIDO: Se recuerda que el horario de silencio es de 22:00 a 08:00 horas. Se aplicarán sanciones por incumplimiento.\n\n3. APERTURA DEL NUEVO CENTRO CULTURAL: El nuevo centro cultural abrirá sus puertas el próximo 15 de febrero con una programación especial de inauguración.\n\n4. LIMPIEZA DE CALLES: Se solicita la colaboración ciudadana para mantener limpias las calles y no depositar basura fuera de los contenedores.\n\nCobreros, 15 de enero de 2024\nEl Alcalde',
                date: '2024-01-15'
            }
        ];
        localStorage.setItem('bandos', JSON.stringify(bandos));
    }

    // Cargar usuarios
    const savedUsers = localStorage.getItem('users');
    if (savedUsers) {
        users = JSON.parse(savedUsers);
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
    } else {
        showNotification('Credenciales incorrectas', 'error');
    }
}

// Manejar login de administradores
function handleAdminLogin(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const email = formData.get('email');
    const password = formData.get('password');

    // Verificar credenciales de super admin (TURISTEAM)
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
        updateUserInterface();
        closeModal('adminLoginModal');
        showNotification('Sesión de administrador iniciada correctamente', 'success');
        return;
    }

    // Verificar credenciales de administradores creados
    const admin = administrators.find(admin => admin.email === email && admin.password === password && admin.isActive);
    
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
        updateUserInterface();
        closeModal('adminLoginModal');
        showNotification(`Sesión de administrador iniciada - ${admin.name}`, 'success');
    } else {
        showNotification('Credenciales de administrador incorrectas', 'error');
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

    // Crear nuevo usuario
    const newUser = {
        id: Date.now(),
        name,
        email,
        phone,
        password, // En una aplicación real, esto debería estar hasheado
        consent: true,
        notificationConsent: true, // Consentimiento específico para notificaciones
        consentDate: new Date().toISOString(),
        registeredAt: new Date().toISOString()
    };

    users.push(newUser);
    localStorage.setItem('users', JSON.stringify(users));
    
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
    const message = formData.get('message');
    const type = formData.get('type');
    const attachmentFile = formData.get('attachment');

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
    e.target.reset();
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
        loadUsersList();
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
    } else if (tabName === 'appointments') {
        console.log('Cargando pestaña de citas previas...');
        loadAppointments();
        loadAppointmentsList();
        loadAppointmentStats();
        loadMunicipalAlertsList();
        console.log('Pestaña de citas previas cargada');
    } else if (tabName === 'servicios') {
        loadServiciosAdmin();
    }
}

// Actualizar interfaz de usuario
function updateUserInterface() {
    if (currentUser) {
        // Mostrar nombre del usuario (sin revelar que es super admin)
        const displayName = currentUser.name;
        document.getElementById('loginBtn').textContent = displayName;
        document.getElementById('registerBtn').style.display = 'none';
        // El botón de acceso admin siempre visible (comentado para mantenerlo siempre visible)
        // document.getElementById('adminLoginBtn').style.display = 'none';
        
        // Mostrar botón de logout
        document.getElementById('loginBtn').onclick = logout;
        document.getElementById('loginBtn').style.background = '#ef4444';
        document.getElementById('loginBtn').textContent = `Cerrar Sesión (${displayName})`;
        
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
        document.getElementById('loginBtn').style.background = '';
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
        newsList.innerHTML = '<p>No hay noticias publicadas.</p>';
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

// Cargar lista de usuarios
function loadUsersList() {
    const usersList = document.getElementById('usersList');
    if (!usersList) return;

    usersList.innerHTML = '';
    
    // Filtrar usuarios ocultos (super admin no debe aparecer en la lista)
    const visibleUsers = users.filter(user => !user.isHidden && !user.isSuperAdmin);
    
    visibleUsers.forEach(user => {
        const userItem = document.createElement('div');
        userItem.className = 'user-item';
        userItem.innerHTML = `
            <div>
                <h4>${user.name}</h4>
                <p>${user.email}</p>
                <p>Registrado: ${formatDate(user.registeredAt)}</p>
            </div>
            <div>
                <span class="badge ${user.consent ? 'badge-success' : 'badge-warning'}">
                    ${user.consent ? 'Consentimiento dado' : 'Sin consentimiento'}
                </span>
                ${user.notificationConsent ? '<span class="badge badge-info">Notificaciones</span>' : ''}
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
            <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            <h2>${article ? 'Editar Noticia' : 'Nueva Noticia'}</h2>
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
                <button type="submit" class="btn btn-primary">${article ? 'Actualizar' : 'Crear'} Noticia</button>
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
        showNotification('Noticia guardada correctamente', 'success');
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
    });
}

function editNews(newsId) {
    openNewsEditor(newsId);
}

function deleteNews(newsId) {
    if (confirm('¿Está seguro de que desea eliminar esta noticia?')) {
        news = news.filter(n => n.id !== newsId);
        localStorage.setItem('news', JSON.stringify(news));
        updateContent();
        showNotification('Noticia eliminada correctamente', 'success');
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
            <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            <h2>${isEdit ? 'Editar Noticia' : 'Nueva Noticia'}</h2>
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
                <button type="submit" class="btn btn-primary">${isEdit ? 'Actualizar' : 'Crear'} Noticia</button>
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
        showNotification(`Noticia ${isEdit ? 'actualizada' : 'creada'} correctamente`, 'success');
        modal.remove();
        loadNewsList();
    });
}

function editNews(newsId) {
    openNewsEditor(newsId);
}

function deleteNews(newsId) {
    if (!confirm('¿Está seguro de que desea eliminar esta noticia?')) {
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
    const savedSettings = localStorage.getItem('appointmentSettings');
    if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        appointmentsEnabled = settings.enabled;
    }
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
    }
}

function updateAppointmentUI() {
    const statusBadge = document.getElementById('statusBadge');
    const statusText = document.getElementById('statusText');
    const appointmentDescription = document.getElementById('appointmentDescription');
    const toggleBtn = document.getElementById('toggleAppointmentForm');
    const appointmentForm = document.getElementById('appointmentForm');
    
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
    
    appointmentsEnabled = enabledRadio.checked;
    
    // Guardar configuración
    const settings = {
        enabled: appointmentsEnabled,
        updatedBy: currentUser.email,
        updatedAt: new Date().toISOString()
    };
    localStorage.setItem('appointmentSettings', JSON.stringify(settings));
    
    // Actualizar interfaz
    updateAppointmentUI();
    
    showNotification(`Sistema de citas previas ${appointmentsEnabled ? 'activado' : 'desactivado'}`, 'success');
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
            document.getElementById('notificationMessage').value = notification.message;
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
    
    updateUserInterface();
    showNotification('Sesión cerrada correctamente', 'success');
    
    // Refrescar la página después de un breve delay para mostrar la notificación
    setTimeout(() => {
        window.location.reload();
    }, 1500);
}

// Abrir panel de administración
function openAdminPanel() {
    if (!isAdmin) {
        alert('No tiene permisos de administrador.');
        return;
    }
    
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
    loadPublicNotificationsList();
}

// Cerrar panel de administración
function closeAdminPanel() {
    document.getElementById('adminModal').style.display = 'none';
}

// ===== SERVICIOS SIMPLES =====

let servicios = {
    medical: [],
    itv: [],
    phone: []
};

// Configuración de las secciones (títulos e iconos editables)
let seccionesConfig = {
    medical: {
        title: 'Consultas Médicas',
        icon: '🏥',
        description: 'Servicios médicos y de salud'
    },
    itv: {
        title: 'ITV',
        icon: '🚗',
        description: 'Inspección técnica de vehículos'
    },
    phone: {
        title: 'Teléfonos de Interés',
        icon: '📞',
        description: 'Números de teléfono importantes'
    }
};

// Cargar configuración de secciones
function loadSeccionesConfig() {
    const saved = localStorage.getItem('seccionesConfig');
    if (saved) {
        seccionesConfig = JSON.parse(saved);
    }
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
            phone: [
                {
                    id: 1,
                    name: 'Emergencias',
                    day: '24 horas',
                    time: '24h',
                    location: 'Servicio de emergencias',
                    phone: '112',
                    description: 'Número de emergencias generales',
                    photo: null
                }
            ]
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

// Renderizar servicios en la página
function renderServicios() {
    const container = document.getElementById('serviciosContent');
    if (!container) return;
    
    let html = '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem;">';
    
    // Consultas Médicas
    html += `<div class="admin-section"><h3>${seccionesConfig.medical.icon} ${seccionesConfig.medical.title}</h3>`;
    servicios.medical.forEach(servicio => {
        html += createServicioCard(servicio, 'medical');
    });
    html += '</div>';
    
    // ITV
    html += `<div class="admin-section"><h3>${seccionesConfig.itv.icon} ${seccionesConfig.itv.title}</h3>`;
    servicios.itv.forEach(servicio => {
        html += createServicioCard(servicio, 'itv');
    });
    html += '</div>';
    
    // Teléfonos
    html += `<div class="admin-section"><h3>${seccionesConfig.phone.icon} ${seccionesConfig.phone.title}</h3>`;
    servicios.phone.forEach(servicio => {
        html += createServicioCard(servicio, 'phone');
    });
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

// Cargar listas en admin
function loadServiciosAdmin() {
    loadSeccionesConfig();
    updateSectionTitles();
    loadServiciosList('medical');
    loadServiciosList('itv');
    loadServiciosList('phone');
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
    const phoneTitle = document.getElementById('phoneSectionTitle');
    
    if (medicalTitle) {
        medicalTitle.textContent = `${seccionesConfig.medical.icon} ${seccionesConfig.medical.title}`;
    }
    if (itvTitle) {
        itvTitle.textContent = `${seccionesConfig.itv.icon} ${seccionesConfig.itv.title}`;
    }
    if (phoneTitle) {
        phoneTitle.textContent = `${seccionesConfig.phone.icon} ${seccionesConfig.phone.title}`;
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
        
        // Actualizar localStorage como respaldo
        localStorage.setItem('users', JSON.stringify(users));
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
    return await enviarNotificacionPushConLocalidades(titulo, mensaje, tipo, 'todos', []);
}

// Enviar notificación de cita confirmada
function enviarNotificacionCita(nombre, fecha, hora) {
    const titulo = 'Cita Confirmada - Ayuntamiento de Cobreros';
    const mensaje = `Hola ${nombre}, tu cita ha sido confirmada para el ${fecha} a las ${hora}.`;
    enviarNotificacionPush(titulo, mensaje, 'cita');
}

// Enviar notificación de evento
function enviarNotificacionEvento(tituloEvento, fecha, descripcion) {
    const titulo = 'Nuevo Evento - Ayuntamiento de Cobreros';
    const mensaje = `${tituloEvento} - ${fecha}. ${descripcion}`;
    enviarNotificacionPush(titulo, mensaje, 'evento');
}

// Enviar notificación de bando
function enviarNotificacionBando(tituloBando) {
    const titulo = 'Nuevo Bando - Ayuntamiento de Cobreros';
    const mensaje = `Se ha publicado un nuevo bando: ${tituloBando}`;
    enviarNotificacionPush(titulo, mensaje, 'bando');
}

// Enviar notificación de emergencia
function enviarNotificacionEmergencia(mensaje) {
    const titulo = '🚨 EMERGENCIA - Ayuntamiento de Cobreros';
    enviarNotificacionPush(titulo, mensaje, 'emergencia');
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

