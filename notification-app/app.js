// Configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    authDomain: "turisteam-80f1b.firebaseapp.com",
    projectId: "turisteam-80f1b",
    storageBucket: "turisteam-80f1b.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:abcdefghijklmnop"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const messaging = firebase.messaging();

// Variables globales
let currentUser = null;
let isAdmin = false;
let notifications = [];
let selectedPueblos = [];
let allNotifications = [];

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    requestNotificationPermission();
    loadNotifications();
    setupFirebaseListeners();
    loadUserPueblosSelection();
    
    // Asegurar persistencia completa en la app móvil
    ensureMobilePersistence();
});

// Inicializar la aplicación
function initializeApp() {
    console.log('📱 Iniciando app de notificaciones...');
    
    // Verificar si hay usuario admin guardado
    const savedAdmin = localStorage.getItem('notificationAppAdmin');
    if (savedAdmin) {
        try {
            const adminData = JSON.parse(savedAdmin);
            if (adminData.email && adminData.password) {
                currentUser = adminData;
                isAdmin = true;
                showAdminForm();
            }
        } catch (error) {
            console.error('Error cargando admin guardado:', error);
        }
    }
}

// Solicitar permisos de notificación
async function requestNotificationPermission() {
    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            console.log('✅ Permisos de notificación concedidos');
            
            // Obtener token FCM
            const token = await messaging.getToken({
                vapidKey: 'BEl62iUYgUivxIkv69yViEuiBIa40HI8lF7vQyVpX4Bw'
            });
            
            if (token) {
                console.log('📱 Token FCM:', token);
                // Guardar token para notificaciones
                localStorage.setItem('fcmToken', token);
            }
        } else {
            console.log('❌ Permisos de notificación denegados');
        }
    } catch (error) {
        console.error('Error solicitando permisos:', error);
    }
}

// Cargar notificaciones desde Firestore
async function loadNotifications() {
    try {
        const loadingState = document.getElementById('loadingState');
        const emptyState = document.getElementById('emptyState');
        const notificationsList = document.getElementById('notificationsList');
        
        const snapshot = await db.collection('notifications')
            .orderBy('timestamp', 'desc')
            .limit(50)
            .get();
        
        allNotifications = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            allNotifications.push({
                id: doc.id,
                ...data
            });
        });
        
        // Filtrar notificaciones según pueblos seleccionados
        filterNotificationsByPueblos();
        
        loadingState.style.display = 'none';
        
        if (notifications.length === 0) {
            emptyState.style.display = 'block';
        } else {
            emptyState.style.display = 'none';
            renderNotifications();
        }
        
    } catch (error) {
        console.error('Error cargando notificaciones:', error);
        document.getElementById('loadingState').innerHTML = 
            '<p style="color: #e74c3c;">Error cargando notificaciones</p>';
    }
}

// Renderizar notificaciones
function renderNotifications() {
    const notificationsList = document.getElementById('notificationsList');
    notificationsList.innerHTML = '';
    
    notifications.forEach(notification => {
        const card = document.createElement('div');
        card.className = `notification-card ${!notification.read ? 'unread' : ''}`;
        card.onclick = () => openNotification(notification);
        
        const date = notification.timestamp ? 
            new Date(notification.timestamp.toDate()).toLocaleString() : 
            'Fecha no disponible';
        
        // Determinar el icono del archivo adjunto
        let attachmentIcon = '';
        let attachmentText = '';
        if (notification.documentUrl) {
            const fileExtension = notification.documentUrl.split('.').pop().toLowerCase();
            if (fileExtension === 'pdf') {
                attachmentIcon = '📄';
                attachmentText = 'Documento PDF adjunto';
            } else if (['jpg', 'jpeg', 'png', 'gif'].includes(fileExtension)) {
                attachmentIcon = '📸';
                attachmentText = 'Imagen adjunta';
            } else if (['doc', 'docx'].includes(fileExtension)) {
                attachmentIcon = '📝';
                attachmentText = 'Documento Word adjunto';
            } else {
                attachmentIcon = '📎';
                attachmentText = 'Archivo adjunto';
            }
        }
        
        card.innerHTML = `
            <div class="notification-header">
                <img src="../images/escudo-cobreros.png" alt="Escudo de Cobreros" class="notification-escudo">
                <div class="notification-header-text">
                    <div class="notification-title">${notification.title || 'Comunicado del Ayuntamiento'}</div>
                    <div class="notification-type-badge">${getTypeIcon(notification.type)} ${getTypeText(notification.type)}</div>
                </div>
            </div>
            <div class="notification-content">
                <div class="notification-message">${notification.message || 'Sin contenido adicional'}</div>
                ${notification.documentUrl ? `
                    <div class="notification-attachment" onclick="event.stopPropagation(); openDocument('${notification.documentUrl}')">
                        <span class="attachment-icon">${attachmentIcon}</span>
                        <span class="attachment-text">${attachmentText}</span>
                        <span class="attachment-action">Toca para ver</span>
                    </div>
                ` : ''}
            </div>
            <div class="notification-footer">
                <span class="notification-date">${date}</span>
                ${!notification.read ? '<span class="unread-indicator">●</span>' : ''}
            </div>
        `;
        
        notificationsList.appendChild(card);
    });
}

// Obtener icono según tipo
function getTypeIcon(type) {
    const icons = {
        'bando': '📄',
        'noticia': '📢',
        'evento': '🎭',
        'urgencia': '🚨',
        'general': '📋'
    };
    return icons[type] || '📋';
}

// Obtener texto descriptivo según tipo
function getTypeText(type) {
    const texts = {
        'bando': 'Bando Municipal',
        'noticia': 'Noticia',
        'evento': 'Evento',
        'urgencia': 'Urgente',
        'general': 'General'
    };
    return texts[type] || 'General';
}

// Abrir notificación
function openNotification(notification) {
    // Marcar como leída
    if (!notification.read) {
        db.collection('notifications').doc(notification.id).update({
            read: true
        });
        
        // Actualizar localmente
        notification.read = true;
        renderNotifications();
    }
    
    // Mostrar modal con detalles completos
    showNotificationModal(notification);
}

// Mostrar modal de notificación completa
function showNotificationModal(notification) {
    // Crear modal
    const modal = document.createElement('div');
    modal.className = 'notification-modal-overlay';
    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    };
    
    const date = notification.timestamp ? 
        new Date(notification.timestamp.toDate()).toLocaleString() : 
        'Fecha no disponible';
    
    // Determinar el icono del archivo adjunto
    let attachmentSection = '';
    if (notification.documentUrl) {
        const fileExtension = notification.documentUrl.split('.').pop().toLowerCase();
        let attachmentIcon = '';
        let attachmentText = '';
        
        if (fileExtension === 'pdf') {
            attachmentIcon = '📄';
            attachmentText = 'Documento PDF';
        } else if (['jpg', 'jpeg', 'png', 'gif'].includes(fileExtension)) {
            attachmentIcon = '📸';
            attachmentText = 'Imagen';
        } else if (['doc', 'docx'].includes(fileExtension)) {
            attachmentIcon = '📝';
            attachmentText = 'Documento Word';
        } else {
            attachmentIcon = '📎';
            attachmentText = 'Archivo';
        }
        
        attachmentSection = `
            <div class="modal-attachment">
                <div class="attachment-header">
                    <span class="attachment-icon">${attachmentIcon}</span>
                    <span class="attachment-title">${attachmentText} adjunto</span>
                </div>
                <button class="btn btn-primary" onclick="openDocument('${notification.documentUrl}')">
                    <i class="fas fa-eye"></i> Ver ${attachmentText}
                </button>
            </div>
        `;
    }
    
    modal.innerHTML = `
        <div class="notification-modal">
            <div class="modal-header">
                <img src="../images/escudo-cobreros.png" alt="Escudo de Cobreros" class="modal-escudo">
                <div class="modal-header-text">
                    <h2>${notification.title || 'Comunicado del Ayuntamiento'}</h2>
                    <div class="modal-type">${getTypeIcon(notification.type)} ${getTypeText(notification.type)}</div>
                </div>
                <button class="modal-close" onclick="this.closest('.notification-modal-overlay').remove()">×</button>
            </div>
            <div class="modal-content">
                <div class="modal-message">
                    ${notification.message || 'Sin contenido adicional'}
                </div>
                ${attachmentSection}
            </div>
            <div class="modal-footer">
                <div class="modal-date">📅 ${date}</div>
                <button class="btn btn-secondary" onclick="this.closest('.notification-modal-overlay').remove()">
                    Cerrar
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Abrir documento
function openDocument(url) {
    window.open(url, '_blank');
}

// Configurar listeners de Firebase
function setupFirebaseListeners() {
    // Escuchar nuevas notificaciones
    db.collection('notifications')
        .orderBy('timestamp', 'desc')
        .limit(1)
        .onSnapshot((snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const newNotification = {
                        id: change.doc.id,
                        ...change.doc.data()
                    };
                    
                    // Mostrar notificación del sistema
                    showSystemNotification(newNotification);
                    
                    // Recargar lista
                    loadNotifications();
                }
            });
        });
    
    // Configurar mensajería en segundo plano
    messaging.onBackgroundMessage((payload) => {
        console.log('📱 Mensaje recibido en segundo plano:', payload);
        
        const notificationTitle = payload.notification.title;
        const notificationOptions = {
            body: payload.notification.body,
            icon: '../images/escudo-cobreros.png',
            badge: '../images/escudo-cobreros.png',
            tag: 'ayuntamiento-notification'
        };
        
        self.registration.showNotification(notificationTitle, notificationOptions);
    });
}

// Mostrar notificación del sistema
function showSystemNotification(notification) {
    if (Notification.permission === 'granted') {
        new Notification(notification.title, {
            body: notification.message,
            icon: '../images/escudo-cobreros.png',
            badge: '../images/escudo-cobreros.png',
            tag: 'ayuntamiento-notification'
        });
    }
}

// Panel de administración
function toggleAdminPanel() {
    const panel = document.getElementById('adminPanel');
    panel.classList.toggle('active');
}

// Login de administrador
function loginAdmin() {
    const email = document.getElementById('adminEmail').value;
    const password = document.getElementById('adminPassword').value;
    
    if (!email || !password) {
        showError('Por favor, complete todos los campos');
        return;
    }
    
    // Verificar credenciales (en producción usar Firebase Auth)
    if (email === 'admin@cobreros.es' && password === 'admin123') {
        currentUser = { email, password };
        isAdmin = true;
        
        // Guardar sesión
        localStorage.setItem('notificationAppAdmin', JSON.stringify(currentUser));
        
        showAdminForm();
        showSuccess('Sesión iniciada correctamente');
    } else {
        showError('Credenciales incorrectas');
    }
}

// Mostrar formulario de admin
function showAdminForm() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('adminForm').style.display = 'block';
}

// Cerrar sesión de admin
function logoutAdmin() {
    currentUser = null;
    isAdmin = false;
    localStorage.removeItem('notificationAppAdmin');
    
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('adminForm').style.display = 'none';
    document.getElementById('adminEmail').value = '';
    document.getElementById('adminPassword').value = '';
    
    showSuccess('Sesión cerrada');
}

// Enviar notificación
async function sendNotification() {
    if (!isAdmin) {
        showError('No tiene permisos de administrador');
        return;
    }
    
    const title = document.getElementById('notificationTitle').value;
    const message = document.getElementById('notificationMessage').value;
    const type = document.getElementById('notificationType').value;
    const fileInput = document.getElementById('documentFile');
    const targetPueblosSelect = document.getElementById('targetPueblos');
    const targetPueblos = Array.from(targetPueblosSelect.selectedOptions).map(option => option.value);
    
    if (!title || !message) {
        showError('Por favor, complete título y mensaje');
        return;
    }
    
    try {
        let documentUrl = null;
        
        // Subir documento si existe
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            const storageRef = firebase.storage().ref(`notifications/${Date.now()}_${file.name}`);
            const uploadTask = await storageRef.put(file);
            documentUrl = await uploadTask.ref.getDownloadURL();
        }
        
        // Crear notificación en Firestore
        const notificationData = {
            title: title,
            message: message,
            type: type,
            documentUrl: documentUrl,
            targetPueblos: targetPueblos,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            read: false,
            sentBy: currentUser.email
        };
        
        await db.collection('notifications').add(notificationData);
        
        // Enviar notificación push
        await sendPushNotification(title, message, type, targetPueblos);
        
        // Limpiar formulario
        document.getElementById('notificationTitle').value = '';
        document.getElementById('notificationMessage').value = '';
        document.getElementById('notificationType').value = 'general';
        document.getElementById('documentFile').value = '';
        
        showSuccess('Notificación enviada correctamente');
        
    } catch (error) {
        console.error('Error enviando notificación:', error);
        showError('Error enviando notificación: ' + error.message);
    }
}

// Enviar notificación push
async function sendPushNotification(title, message, type, targetPueblos = []) {
    try {
        const response = await fetch('https://us-central1-turisteam-80f1b.cloudfunctions.net/sendPushNotification', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                title: title,
                message: message,
                type: type,
                localities: targetPueblos
            })
        });
        
        const result = await response.json();
        console.log('📱 Notificación push enviada:', result);
        
    } catch (error) {
        console.error('Error enviando notificación push:', error);
    }
}

// Mostrar mensaje de error
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    
    const adminContent = document.querySelector('.admin-content');
    adminContent.insertBefore(errorDiv, adminContent.firstChild);
    
    setTimeout(() => {
        errorDiv.remove();
    }, 3000);
}

// Mostrar mensaje de éxito
function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.textContent = message;
    
    const adminContent = document.querySelector('.admin-content');
    adminContent.insertBefore(successDiv, adminContent.firstChild);
    
    setTimeout(() => {
        successDiv.remove();
    }, 3000);
}

// ===== GESTIÓN DE PUEBLOS =====

// Cargar selección de pueblos del usuario
function loadUserPueblosSelection() {
    const savedPueblos = localStorage.getItem('selectedPueblos');
    if (savedPueblos) {
        try {
            selectedPueblos = JSON.parse(savedPueblos);
            updatePueblosUI();
        } catch (error) {
            console.error('Error cargando pueblos seleccionados:', error);
        }
    }
}

// Actualizar selección de pueblos
function updatePueblosSelection() {
    const select = document.getElementById('pueblosSelect');
    selectedPueblos = Array.from(select.selectedOptions).map(option => option.value);
    
    // Guardar selección
    localStorage.setItem('selectedPueblos', JSON.stringify(selectedPueblos));
    
    // Filtrar notificaciones
    filterNotificationsByPueblos();
    
    console.log('🏘️ Pueblos seleccionados:', selectedPueblos);
}

// Actualizar UI de pueblos
function updatePueblosUI() {
    const select = document.getElementById('pueblosSelect');
    if (select) {
        Array.from(select.options).forEach(option => {
            option.selected = selectedPueblos.includes(option.value);
        });
    }
}

// Filtrar notificaciones por pueblos seleccionados
function filterNotificationsByPueblos() {
    if (selectedPueblos.length === 0) {
        // Si no hay pueblos seleccionados, mostrar solo notificaciones generales
        notifications = allNotifications.filter(notif => 
            !notif.targetPueblos || notif.targetPueblos.length === 0 || notif.type === 'general'
        );
    } else {
        // Filtrar notificaciones que coincidan con pueblos seleccionados o sean generales
        notifications = allNotifications.filter(notif => {
            // Siempre mostrar notificaciones generales
            if (notif.type === 'general' || !notif.targetPueblos || notif.targetPueblos.length === 0) {
                return true;
            }
            
            // Verificar si hay intersección entre pueblos seleccionados y pueblos objetivo
            return notif.targetPueblos.some(pueblo => selectedPueblos.includes(pueblo));
        });
    }
    
    // Re-renderizar notificaciones
    renderNotifications();
    
    // Actualizar estado vacío
    const emptyState = document.getElementById('emptyState');
    if (notifications.length === 0) {
        emptyState.style.display = 'block';
    } else {
        emptyState.style.display = 'none';
    }
}

// ===== PERSISTENCIA COMPLETA EN APP MÓVIL =====

// Asegurar persistencia completa en la app móvil
async function ensureMobilePersistence() {
    try {
        console.log('📱 Verificando persistencia en app móvil...');
        
        // 1. Verificar conexión a Firebase
        if (!firebase || !firebase.firestore()) {
            console.log('⚠️ Firebase no disponible en app móvil');
            return;
        }
        
        // 2. Sincronizar datos de la app con Firestore
        await syncMobileDataToFirestore();
        
        // 3. Configurar sincronización automática
        setupMobileAutomaticSync();
        
        // 4. Verificar integridad de datos locales
        verifyMobileDataIntegrity();
        
        console.log('✅ Persistencia móvil verificada');
        
    } catch (error) {
        console.error('❌ Error en persistencia móvil:', error);
    }
}

// Sincronizar datos de la app móvil con Firestore
async function syncMobileDataToFirestore() {
    try {
        const db = firebase.firestore();
        
        // Sincronizar notificaciones leídas
        const readNotifications = notifications.filter(n => n.read);
        if (readNotifications.length > 0) {
            const batch = db.batch();
            readNotifications.forEach(notification => {
                const notificationRef = db.collection('notifications').doc(notification.id);
                batch.update(notificationRef, { read: true });
            });
            await batch.commit();
            console.log('📱 Notificaciones leídas sincronizadas');
        }
        
        // Sincronizar selección de pueblos
        if (selectedPueblos.length > 0) {
            await db.collection('userPreferences').doc('pueblos').set({
                selectedPueblos: selectedPueblos,
                lastUpdate: new Date(),
                source: 'MOBILE_APP'
            });
            console.log('📱 Preferencias de pueblos sincronizadas');
        }
        
        // Sincronizar estado de la app
        await db.collection('appState').doc('mobile').set({
            lastActive: new Date(),
            deviceType: 'mobile',
            appVersion: '1.0',
            source: 'MOBILE_APP'
        });
        console.log('📱 Estado de app sincronizado');
        
    } catch (error) {
        console.error('❌ Error sincronizando datos móviles:', error);
    }
}

// Configurar sincronización automática en móvil
function setupMobileAutomaticSync() {
    // Sincronizar cada 3 minutos
    setInterval(async () => {
        try {
            await syncMobileDataToFirestore();
            console.log('📱 Sincronización automática móvil completada');
        } catch (error) {
            console.error('❌ Error en sincronización automática móvil:', error);
        }
    }, 3 * 60 * 1000); // 3 minutos
    
    // Sincronizar al cerrar la app
    window.addEventListener('beforeunload', async () => {
        try {
            await syncMobileDataToFirestore();
            console.log('📱 Sincronización al cerrar app completada');
        } catch (error) {
            console.error('❌ Error en sincronización al cerrar app:', error);
        }
    });
    
    // Sincronizar cuando la app vuelve a estar activa
    document.addEventListener('visibilitychange', async () => {
        if (!document.hidden) {
            try {
                await syncMobileDataToFirestore();
                console.log('📱 Sincronización al reactivar app completada');
            } catch (error) {
                console.error('❌ Error en sincronización al reactivar:', error);
            }
        }
    });
}

// Verificar integridad de datos en la app móvil
function verifyMobileDataIntegrity() {
    try {
        const issues = [];
        
        // Verificar notificaciones
        if (!Array.isArray(notifications)) {
            issues.push('Notificaciones: formato incorrecto');
        }
        
        // Verificar pueblos seleccionados
        if (!Array.isArray(selectedPueblos)) {
            issues.push('Pueblos seleccionados: formato incorrecto');
        }
        
        // Verificar datos de usuario
        const savedAdmin = localStorage.getItem('notificationAppAdmin');
        if (savedAdmin) {
            try {
                JSON.parse(savedAdmin);
            } catch (e) {
                issues.push('Datos de admin: formato incorrecto');
            }
        }
        
        if (issues.length === 0) {
            console.log('✅ Integridad de datos móviles verificada');
            return true;
        } else {
            console.warn('⚠️ Problemas de integridad móvil detectados:', issues);
            repairMobileData(issues);
            return false;
        }
        
    } catch (error) {
        console.error('❌ Error verificando integridad móvil:', error);
        return false;
    }
}

// Reparar datos corruptos en la app móvil
function repairMobileData(issues) {
    try {
        console.log('🔧 Reparando datos móviles...');
        
        // Reparar notificaciones
        if (issues.includes('Notificaciones: formato incorrecto')) {
            notifications = [];
            localStorage.setItem('notifications', JSON.stringify([]));
        }
        
        // Reparar pueblos seleccionados
        if (issues.includes('Pueblos seleccionados: formato incorrecto')) {
            selectedPueblos = [];
            localStorage.setItem('selectedPueblos', JSON.stringify([]));
        }
        
        // Reparar datos de admin
        if (issues.includes('Datos de admin: formato incorrecto')) {
            localStorage.removeItem('notificationAppAdmin');
            currentUser = null;
            isAdmin = false;
        }
        
        console.log('✅ Datos móviles reparados');
        
    } catch (error) {
        console.error('❌ Error reparando datos móviles:', error);
    }
}

// Service Worker para PWA
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
        .then(registration => {
            console.log('✅ Service Worker registrado:', registration);
        })
        .catch(error => {
            console.error('❌ Error registrando Service Worker:', error);
        });
}

    apiKey: "AIzaSyBXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    authDomain: "turisteam-80f1b.firebaseapp.com",
    projectId: "turisteam-80f1b",
    storageBucket: "turisteam-80f1b.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:abcdefghijklmnop"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const messaging = firebase.messaging();

// Variables globales
let currentUser = null;
let isAdmin = false;
let notifications = [];
let selectedPueblos = [];
let allNotifications = [];

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    requestNotificationPermission();
    loadNotifications();
    setupFirebaseListeners();
    loadUserPueblosSelection();
    
    // Asegurar persistencia completa en la app móvil
    ensureMobilePersistence();
});

// Inicializar la aplicación
function initializeApp() {
    console.log('📱 Iniciando app de notificaciones...');
    
    // Verificar si hay usuario admin guardado
    const savedAdmin = localStorage.getItem('notificationAppAdmin');
    if (savedAdmin) {
        try {
            const adminData = JSON.parse(savedAdmin);
            if (adminData.email && adminData.password) {
                currentUser = adminData;
                isAdmin = true;
                showAdminForm();
            }
        } catch (error) {
            console.error('Error cargando admin guardado:', error);
        }
    }
}

// Solicitar permisos de notificación
async function requestNotificationPermission() {
    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            console.log('✅ Permisos de notificación concedidos');
            
            // Obtener token FCM
            const token = await messaging.getToken({
                vapidKey: 'BEl62iUYgUivxIkv69yViEuiBIa40HI8lF7vQyVpX4Bw'
            });
            
            if (token) {
                console.log('📱 Token FCM:', token);
                // Guardar token para notificaciones
                localStorage.setItem('fcmToken', token);
            }
        } else {
            console.log('❌ Permisos de notificación denegados');
        }
    } catch (error) {
        console.error('Error solicitando permisos:', error);
    }
}

// Cargar notificaciones desde Firestore
async function loadNotifications() {
    try {
        const loadingState = document.getElementById('loadingState');
        const emptyState = document.getElementById('emptyState');
        const notificationsList = document.getElementById('notificationsList');
        
        const snapshot = await db.collection('notifications')
            .orderBy('timestamp', 'desc')
            .limit(50)
            .get();
        
        allNotifications = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            allNotifications.push({
                id: doc.id,
                ...data
            });
        });
        
        // Filtrar notificaciones según pueblos seleccionados
        filterNotificationsByPueblos();
        
        loadingState.style.display = 'none';
        
        if (notifications.length === 0) {
            emptyState.style.display = 'block';
        } else {
            emptyState.style.display = 'none';
            renderNotifications();
        }
        
    } catch (error) {
        console.error('Error cargando notificaciones:', error);
        document.getElementById('loadingState').innerHTML = 
            '<p style="color: #e74c3c;">Error cargando notificaciones</p>';
    }
}

// Renderizar notificaciones
function renderNotifications() {
    const notificationsList = document.getElementById('notificationsList');
    notificationsList.innerHTML = '';
    
    notifications.forEach(notification => {
        const card = document.createElement('div');
        card.className = `notification-card ${!notification.read ? 'unread' : ''}`;
        card.onclick = () => openNotification(notification);
        
        const date = notification.timestamp ? 
            new Date(notification.timestamp.toDate()).toLocaleString() : 
            'Fecha no disponible';
        
        // Determinar el icono del archivo adjunto
        let attachmentIcon = '';
        let attachmentText = '';
        if (notification.documentUrl) {
            const fileExtension = notification.documentUrl.split('.').pop().toLowerCase();
            if (fileExtension === 'pdf') {
                attachmentIcon = '📄';
                attachmentText = 'Documento PDF adjunto';
            } else if (['jpg', 'jpeg', 'png', 'gif'].includes(fileExtension)) {
                attachmentIcon = '📸';
                attachmentText = 'Imagen adjunta';
            } else if (['doc', 'docx'].includes(fileExtension)) {
                attachmentIcon = '📝';
                attachmentText = 'Documento Word adjunto';
            } else {
                attachmentIcon = '📎';
                attachmentText = 'Archivo adjunto';
            }
        }
        
        card.innerHTML = `
            <div class="notification-header">
                <img src="../images/escudo-cobreros.png" alt="Escudo de Cobreros" class="notification-escudo">
                <div class="notification-header-text">
                    <div class="notification-title">${notification.title || 'Comunicado del Ayuntamiento'}</div>
                    <div class="notification-type-badge">${getTypeIcon(notification.type)} ${getTypeText(notification.type)}</div>
                </div>
            </div>
            <div class="notification-content">
                <div class="notification-message">${notification.message || 'Sin contenido adicional'}</div>
                ${notification.documentUrl ? `
                    <div class="notification-attachment" onclick="event.stopPropagation(); openDocument('${notification.documentUrl}')">
                        <span class="attachment-icon">${attachmentIcon}</span>
                        <span class="attachment-text">${attachmentText}</span>
                        <span class="attachment-action">Toca para ver</span>
                    </div>
                ` : ''}
            </div>
            <div class="notification-footer">
                <span class="notification-date">${date}</span>
                ${!notification.read ? '<span class="unread-indicator">●</span>' : ''}
            </div>
        `;
        
        notificationsList.appendChild(card);
    });
}

// Obtener icono según tipo
function getTypeIcon(type) {
    const icons = {
        'bando': '📄',
        'noticia': '📢',
        'evento': '🎭',
        'urgencia': '🚨',
        'general': '📋'
    };
    return icons[type] || '📋';
}

// Obtener texto descriptivo según tipo
function getTypeText(type) {
    const texts = {
        'bando': 'Bando Municipal',
        'noticia': 'Noticia',
        'evento': 'Evento',
        'urgencia': 'Urgente',
        'general': 'General'
    };
    return texts[type] || 'General';
}

// Abrir notificación
function openNotification(notification) {
    // Marcar como leída
    if (!notification.read) {
        db.collection('notifications').doc(notification.id).update({
            read: true
        });
        
        // Actualizar localmente
        notification.read = true;
        renderNotifications();
    }
    
    // Mostrar modal con detalles completos
    showNotificationModal(notification);
}

// Mostrar modal de notificación completa
function showNotificationModal(notification) {
    // Crear modal
    const modal = document.createElement('div');
    modal.className = 'notification-modal-overlay';
    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    };
    
    const date = notification.timestamp ? 
        new Date(notification.timestamp.toDate()).toLocaleString() : 
        'Fecha no disponible';
    
    // Determinar el icono del archivo adjunto
    let attachmentSection = '';
    if (notification.documentUrl) {
        const fileExtension = notification.documentUrl.split('.').pop().toLowerCase();
        let attachmentIcon = '';
        let attachmentText = '';
        
        if (fileExtension === 'pdf') {
            attachmentIcon = '📄';
            attachmentText = 'Documento PDF';
        } else if (['jpg', 'jpeg', 'png', 'gif'].includes(fileExtension)) {
            attachmentIcon = '📸';
            attachmentText = 'Imagen';
        } else if (['doc', 'docx'].includes(fileExtension)) {
            attachmentIcon = '📝';
            attachmentText = 'Documento Word';
        } else {
            attachmentIcon = '📎';
            attachmentText = 'Archivo';
        }
        
        attachmentSection = `
            <div class="modal-attachment">
                <div class="attachment-header">
                    <span class="attachment-icon">${attachmentIcon}</span>
                    <span class="attachment-title">${attachmentText} adjunto</span>
                </div>
                <button class="btn btn-primary" onclick="openDocument('${notification.documentUrl}')">
                    <i class="fas fa-eye"></i> Ver ${attachmentText}
                </button>
            </div>
        `;
    }
    
    modal.innerHTML = `
        <div class="notification-modal">
            <div class="modal-header">
                <img src="../images/escudo-cobreros.png" alt="Escudo de Cobreros" class="modal-escudo">
                <div class="modal-header-text">
                    <h2>${notification.title || 'Comunicado del Ayuntamiento'}</h2>
                    <div class="modal-type">${getTypeIcon(notification.type)} ${getTypeText(notification.type)}</div>
                </div>
                <button class="modal-close" onclick="this.closest('.notification-modal-overlay').remove()">×</button>
            </div>
            <div class="modal-content">
                <div class="modal-message">
                    ${notification.message || 'Sin contenido adicional'}
                </div>
                ${attachmentSection}
            </div>
            <div class="modal-footer">
                <div class="modal-date">📅 ${date}</div>
                <button class="btn btn-secondary" onclick="this.closest('.notification-modal-overlay').remove()">
                    Cerrar
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Abrir documento
function openDocument(url) {
    window.open(url, '_blank');
}

// Configurar listeners de Firebase
function setupFirebaseListeners() {
    // Escuchar nuevas notificaciones
    db.collection('notifications')
        .orderBy('timestamp', 'desc')
        .limit(1)
        .onSnapshot((snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const newNotification = {
                        id: change.doc.id,
                        ...change.doc.data()
                    };
                    
                    // Mostrar notificación del sistema
                    showSystemNotification(newNotification);
                    
                    // Recargar lista
                    loadNotifications();
                }
            });
        });
    
    // Configurar mensajería en segundo plano
    messaging.onBackgroundMessage((payload) => {
        console.log('📱 Mensaje recibido en segundo plano:', payload);
        
        const notificationTitle = payload.notification.title;
        const notificationOptions = {
            body: payload.notification.body,
            icon: '../images/escudo-cobreros.png',
            badge: '../images/escudo-cobreros.png',
            tag: 'ayuntamiento-notification'
        };
        
        self.registration.showNotification(notificationTitle, notificationOptions);
    });
}

// Mostrar notificación del sistema
function showSystemNotification(notification) {
    if (Notification.permission === 'granted') {
        new Notification(notification.title, {
            body: notification.message,
            icon: '../images/escudo-cobreros.png',
            badge: '../images/escudo-cobreros.png',
            tag: 'ayuntamiento-notification'
        });
    }
}

// Panel de administración
function toggleAdminPanel() {
    const panel = document.getElementById('adminPanel');
    panel.classList.toggle('active');
}

// Login de administrador
function loginAdmin() {
    const email = document.getElementById('adminEmail').value;
    const password = document.getElementById('adminPassword').value;
    
    if (!email || !password) {
        showError('Por favor, complete todos los campos');
        return;
    }
    
    // Verificar credenciales (en producción usar Firebase Auth)
    if (email === 'admin@cobreros.es' && password === 'admin123') {
        currentUser = { email, password };
        isAdmin = true;
        
        // Guardar sesión
        localStorage.setItem('notificationAppAdmin', JSON.stringify(currentUser));
        
        showAdminForm();
        showSuccess('Sesión iniciada correctamente');
    } else {
        showError('Credenciales incorrectas');
    }
}

// Mostrar formulario de admin
function showAdminForm() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('adminForm').style.display = 'block';
}

// Cerrar sesión de admin
function logoutAdmin() {
    currentUser = null;
    isAdmin = false;
    localStorage.removeItem('notificationAppAdmin');
    
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('adminForm').style.display = 'none';
    document.getElementById('adminEmail').value = '';
    document.getElementById('adminPassword').value = '';
    
    showSuccess('Sesión cerrada');
}

// Enviar notificación
async function sendNotification() {
    if (!isAdmin) {
        showError('No tiene permisos de administrador');
        return;
    }
    
    const title = document.getElementById('notificationTitle').value;
    const message = document.getElementById('notificationMessage').value;
    const type = document.getElementById('notificationType').value;
    const fileInput = document.getElementById('documentFile');
    const targetPueblosSelect = document.getElementById('targetPueblos');
    const targetPueblos = Array.from(targetPueblosSelect.selectedOptions).map(option => option.value);
    
    if (!title || !message) {
        showError('Por favor, complete título y mensaje');
        return;
    }
    
    try {
        let documentUrl = null;
        
        // Subir documento si existe
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            const storageRef = firebase.storage().ref(`notifications/${Date.now()}_${file.name}`);
            const uploadTask = await storageRef.put(file);
            documentUrl = await uploadTask.ref.getDownloadURL();
        }
        
        // Crear notificación en Firestore
        const notificationData = {
            title: title,
            message: message,
            type: type,
            documentUrl: documentUrl,
            targetPueblos: targetPueblos,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            read: false,
            sentBy: currentUser.email
        };
        
        await db.collection('notifications').add(notificationData);
        
        // Enviar notificación push
        await sendPushNotification(title, message, type, targetPueblos);
        
        // Limpiar formulario
        document.getElementById('notificationTitle').value = '';
        document.getElementById('notificationMessage').value = '';
        document.getElementById('notificationType').value = 'general';
        document.getElementById('documentFile').value = '';
        
        showSuccess('Notificación enviada correctamente');
        
    } catch (error) {
        console.error('Error enviando notificación:', error);
        showError('Error enviando notificación: ' + error.message);
    }
}

// Enviar notificación push
async function sendPushNotification(title, message, type, targetPueblos = []) {
    try {
        const response = await fetch('https://us-central1-turisteam-80f1b.cloudfunctions.net/sendPushNotification', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                title: title,
                message: message,
                type: type,
                localities: targetPueblos
            })
        });
        
        const result = await response.json();
        console.log('📱 Notificación push enviada:', result);
        
    } catch (error) {
        console.error('Error enviando notificación push:', error);
    }
}

// Mostrar mensaje de error
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    
    const adminContent = document.querySelector('.admin-content');
    adminContent.insertBefore(errorDiv, adminContent.firstChild);
    
    setTimeout(() => {
        errorDiv.remove();
    }, 3000);
}

// Mostrar mensaje de éxito
function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.textContent = message;
    
    const adminContent = document.querySelector('.admin-content');
    adminContent.insertBefore(successDiv, adminContent.firstChild);
    
    setTimeout(() => {
        successDiv.remove();
    }, 3000);
}

// ===== GESTIÓN DE PUEBLOS =====

// Cargar selección de pueblos del usuario
function loadUserPueblosSelection() {
    const savedPueblos = localStorage.getItem('selectedPueblos');
    if (savedPueblos) {
        try {
            selectedPueblos = JSON.parse(savedPueblos);
            updatePueblosUI();
        } catch (error) {
            console.error('Error cargando pueblos seleccionados:', error);
        }
    }
}

// Actualizar selección de pueblos
function updatePueblosSelection() {
    const select = document.getElementById('pueblosSelect');
    selectedPueblos = Array.from(select.selectedOptions).map(option => option.value);
    
    // Guardar selección
    localStorage.setItem('selectedPueblos', JSON.stringify(selectedPueblos));
    
    // Filtrar notificaciones
    filterNotificationsByPueblos();
    
    console.log('🏘️ Pueblos seleccionados:', selectedPueblos);
}

// Actualizar UI de pueblos
function updatePueblosUI() {
    const select = document.getElementById('pueblosSelect');
    if (select) {
        Array.from(select.options).forEach(option => {
            option.selected = selectedPueblos.includes(option.value);
        });
    }
}

// Filtrar notificaciones por pueblos seleccionados
function filterNotificationsByPueblos() {
    if (selectedPueblos.length === 0) {
        // Si no hay pueblos seleccionados, mostrar solo notificaciones generales
        notifications = allNotifications.filter(notif => 
            !notif.targetPueblos || notif.targetPueblos.length === 0 || notif.type === 'general'
        );
    } else {
        // Filtrar notificaciones que coincidan con pueblos seleccionados o sean generales
        notifications = allNotifications.filter(notif => {
            // Siempre mostrar notificaciones generales
            if (notif.type === 'general' || !notif.targetPueblos || notif.targetPueblos.length === 0) {
                return true;
            }
            
            // Verificar si hay intersección entre pueblos seleccionados y pueblos objetivo
            return notif.targetPueblos.some(pueblo => selectedPueblos.includes(pueblo));
        });
    }
    
    // Re-renderizar notificaciones
    renderNotifications();
    
    // Actualizar estado vacío
    const emptyState = document.getElementById('emptyState');
    if (notifications.length === 0) {
        emptyState.style.display = 'block';
    } else {
        emptyState.style.display = 'none';
    }
}

// ===== PERSISTENCIA COMPLETA EN APP MÓVIL =====

// Asegurar persistencia completa en la app móvil
async function ensureMobilePersistence() {
    try {
        console.log('📱 Verificando persistencia en app móvil...');
        
        // 1. Verificar conexión a Firebase
        if (!firebase || !firebase.firestore()) {
            console.log('⚠️ Firebase no disponible en app móvil');
            return;
        }
        
        // 2. Sincronizar datos de la app con Firestore
        await syncMobileDataToFirestore();
        
        // 3. Configurar sincronización automática
        setupMobileAutomaticSync();
        
        // 4. Verificar integridad de datos locales
        verifyMobileDataIntegrity();
        
        console.log('✅ Persistencia móvil verificada');
        
    } catch (error) {
        console.error('❌ Error en persistencia móvil:', error);
    }
}

// Sincronizar datos de la app móvil con Firestore
async function syncMobileDataToFirestore() {
    try {
        const db = firebase.firestore();
        
        // Sincronizar notificaciones leídas
        const readNotifications = notifications.filter(n => n.read);
        if (readNotifications.length > 0) {
            const batch = db.batch();
            readNotifications.forEach(notification => {
                const notificationRef = db.collection('notifications').doc(notification.id);
                batch.update(notificationRef, { read: true });
            });
            await batch.commit();
            console.log('📱 Notificaciones leídas sincronizadas');
        }
        
        // Sincronizar selección de pueblos
        if (selectedPueblos.length > 0) {
            await db.collection('userPreferences').doc('pueblos').set({
                selectedPueblos: selectedPueblos,
                lastUpdate: new Date(),
                source: 'MOBILE_APP'
            });
            console.log('📱 Preferencias de pueblos sincronizadas');
        }
        
        // Sincronizar estado de la app
        await db.collection('appState').doc('mobile').set({
            lastActive: new Date(),
            deviceType: 'mobile',
            appVersion: '1.0',
            source: 'MOBILE_APP'
        });
        console.log('📱 Estado de app sincronizado');
        
    } catch (error) {
        console.error('❌ Error sincronizando datos móviles:', error);
    }
}

// Configurar sincronización automática en móvil
function setupMobileAutomaticSync() {
    // Sincronizar cada 3 minutos
    setInterval(async () => {
        try {
            await syncMobileDataToFirestore();
            console.log('📱 Sincronización automática móvil completada');
        } catch (error) {
            console.error('❌ Error en sincronización automática móvil:', error);
        }
    }, 3 * 60 * 1000); // 3 minutos
    
    // Sincronizar al cerrar la app
    window.addEventListener('beforeunload', async () => {
        try {
            await syncMobileDataToFirestore();
            console.log('📱 Sincronización al cerrar app completada');
        } catch (error) {
            console.error('❌ Error en sincronización al cerrar app:', error);
        }
    });
    
    // Sincronizar cuando la app vuelve a estar activa
    document.addEventListener('visibilitychange', async () => {
        if (!document.hidden) {
            try {
                await syncMobileDataToFirestore();
                console.log('📱 Sincronización al reactivar app completada');
            } catch (error) {
                console.error('❌ Error en sincronización al reactivar:', error);
            }
        }
    });
}

// Verificar integridad de datos en la app móvil
function verifyMobileDataIntegrity() {
    try {
        const issues = [];
        
        // Verificar notificaciones
        if (!Array.isArray(notifications)) {
            issues.push('Notificaciones: formato incorrecto');
        }
        
        // Verificar pueblos seleccionados
        if (!Array.isArray(selectedPueblos)) {
            issues.push('Pueblos seleccionados: formato incorrecto');
        }
        
        // Verificar datos de usuario
        const savedAdmin = localStorage.getItem('notificationAppAdmin');
        if (savedAdmin) {
            try {
                JSON.parse(savedAdmin);
            } catch (e) {
                issues.push('Datos de admin: formato incorrecto');
            }
        }
        
        if (issues.length === 0) {
            console.log('✅ Integridad de datos móviles verificada');
            return true;
        } else {
            console.warn('⚠️ Problemas de integridad móvil detectados:', issues);
            repairMobileData(issues);
            return false;
        }
        
    } catch (error) {
        console.error('❌ Error verificando integridad móvil:', error);
        return false;
    }
}

// Reparar datos corruptos en la app móvil
function repairMobileData(issues) {
    try {
        console.log('🔧 Reparando datos móviles...');
        
        // Reparar notificaciones
        if (issues.includes('Notificaciones: formato incorrecto')) {
            notifications = [];
            localStorage.setItem('notifications', JSON.stringify([]));
        }
        
        // Reparar pueblos seleccionados
        if (issues.includes('Pueblos seleccionados: formato incorrecto')) {
            selectedPueblos = [];
            localStorage.setItem('selectedPueblos', JSON.stringify([]));
        }
        
        // Reparar datos de admin
        if (issues.includes('Datos de admin: formato incorrecto')) {
            localStorage.removeItem('notificationAppAdmin');
            currentUser = null;
            isAdmin = false;
        }
        
        console.log('✅ Datos móviles reparados');
        
    } catch (error) {
        console.error('❌ Error reparando datos móviles:', error);
    }
}

// Service Worker para PWA
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
        .then(registration => {
            console.log('✅ Service Worker registrado:', registration);
        })
        .catch(error => {
            console.error('❌ Error registrando Service Worker:', error);
        });
}
