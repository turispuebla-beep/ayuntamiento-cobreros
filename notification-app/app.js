// Configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyC7gfaHifIGVMN94mQAGnW6VcA4wVFMZsg",
    authDomain: "ayuntamiento-de-cobreros.firebaseapp.com",
    projectId: "ayuntamiento-de-cobreros",
    storageBucket: "ayuntamiento-de-cobreros.firebasestorage.app",
    messagingSenderId: "527550932354",
    appId: "1:527550932354:web:9bd8431defa7c293b1db9b"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

const NOTIFICATION_APP_ADMIN_EMAILS = ['aytocobreros@gmail.com', 'amco@gmx.es', 'admin@cobreros.es'];

async function ensureNotificationAppAllowlistedAdmin() {
    const u = auth.currentUser;
    if (!u || !u.email) return;
    const em = u.email.toLowerCase();
    if (!NOTIFICATION_APP_ADMIN_EMAILS.includes(em)) return;
    const isSuper = em === 'amco@gmx.es';
    await db
        .collection('admins')
        .doc(u.uid)
        .set(
            {
                email: u.email,
                isAdmin: true,
                isSuperAdmin: isSuper,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            },
            { merge: true }
        );
}
try {
    db.enablePersistence({ synchronizeTabs: true }).catch(function () {});
} catch (e) {}
const messaging = firebase.messaging();

/** Mismos valores que el registro web (`index.html` del ayuntamiento). */
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

// Variables globales
let currentUser = null;
let isAdmin = false;
let citizenProfile = null;
let notifications = [];
let selectedPueblos = [];
let allNotifications = [];

function populateLocalitySelects() {
    const ids = ['pueblosSelect', 'targetPueblos'];
    ids.forEach((id) => {
        const sel = document.getElementById(id);
        if (!sel || sel.options.length > 0) return;
        COBREROS_LOCALITIES.forEach((name) => {
            const o = document.createElement('option');
            o.value = name;
            o.textContent = name;
            sel.appendChild(o);
        });
    });
}

function buildCitizenRegLocalitiesCheckboxes() {
    const wrap = document.getElementById('citizenRegLocalities');
    if (!wrap || wrap.children.length > 0) return;
    COBREROS_LOCALITIES.forEach((name) => {
        const label = document.createElement('label');
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.className = 'citizen-reg-loc';
        input.value = name;
        const span = document.createElement('span');
        span.textContent = name;
        label.appendChild(input);
        label.appendChild(span);
        wrap.appendChild(label);
    });
}

function buildCitizenEditLocalitiesCheckboxes() {
    const wrap = document.getElementById('citizenEditLocalities');
    if (!wrap || wrap.children.length > 0) return;
    COBREROS_LOCALITIES.forEach((name) => {
        const label = document.createElement('label');
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.className = 'citizen-edit-loc';
        input.value = name;
        const span = document.createElement('span');
        span.textContent = name;
        label.appendChild(input);
        label.appendChild(span);
        wrap.appendChild(label);
    });
}

function showCitizenMessage(text, isError) {
    const box = document.getElementById('citizenAuthBox');
    if (!box) return;
    const el = document.createElement('div');
    el.className = isError ? 'error-message' : 'success-message';
    el.style.marginTop = '8px';
    el.textContent = text;
    box.appendChild(el);
    setTimeout(() => el.remove(), 4000);
}

/** Generales o intersección con localidades del usuario (misma regla que la web). */
function notificationMatchesUserPueblos(notif, pueblosList, adminBypass) {
    if (adminBypass) return true;
    const type = notif.type ? String(notif.type).toLowerCase() : '';
    const targets = Array.isArray(notif.targetPueblos) ? notif.targetPueblos : [];
    const isGeneral =
        type === 'general' ||
        targets.length === 0 ||
        notif.scope === 'general';
    if (isGeneral) return true;
    const list = Array.isArray(pueblosList) ? pueblosList : [];
    if (list.length === 0) return false;
    return targets.some((p) => list.includes(p));
}

// Inicialización
document.addEventListener('DOMContentLoaded', function () {
    populateLocalitySelects();
    buildCitizenRegLocalitiesCheckboxes();
    buildCitizenEditLocalitiesCheckboxes();
    initializeApp();
    requestNotificationPermission();
    loadNotifications();
    setupFirebaseListeners();
    loadUserPueblosSelection();

    ensureMobilePersistence();
});

// Inicializar la aplicación (ciudadano = perfil users/{uid}; admin = admins/{uid})
function initializeApp() {
    console.log('📱 Iniciando app de notificaciones...');

    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            citizenProfile = null;
            currentUser = null;
            isAdmin = false;
            localStorage.removeItem('notificationAppAdmin');
            const loginForm = document.getElementById('loginForm');
            const adminForm = document.getElementById('adminForm');
            if (loginForm && adminForm) {
                loginForm.style.display = 'block';
                adminForm.style.display = 'none';
            }
            loadUserPueblosSelection();
            updateCitizenAuthUI();
            await loadNotifications();
            return;
        }
        try {
            await ensureNotificationAppAllowlistedAdmin();
            const adminSnap = await db.collection('admins').doc(user.uid).get();
            if (adminSnap.exists && adminSnap.data().isAdmin === true) {
                citizenProfile = null;
                currentUser = { email: user.email, uid: user.uid };
                isAdmin = true;
                localStorage.setItem('notificationAppAdmin', JSON.stringify({ email: user.email, uid: user.uid }));
                updateCitizenAuthUI();
                await loadNotifications();
                return;
            }

            isAdmin = false;
            currentUser = null;
            localStorage.removeItem('notificationAppAdmin');

            const prof = await db.collection('users').doc(user.uid).get();
            const d = prof.exists ? prof.data() : {};
            citizenProfile = {
                uid: user.uid,
                email: user.email,
                name: d.name || d.nombre || user.email || '',
                localities: Array.isArray(d.localities) ? d.localities : [],
                notificationConsent: d.notificationConsent !== false
            };
            selectedPueblos = citizenProfile.localities.slice();
            localStorage.setItem('selectedPueblos', JSON.stringify(selectedPueblos));
            updatePueblosUI();
            updateCitizenAuthUI();
            await syncCitizenFcmToFirestore(user.uid);
            await loadNotifications();
        } catch (e) {
            console.error('Error en sesión:', e);
        }
    });
}

function updateCitizenAuthUI() {
    const guest = document.getElementById('citizenGuestView');
    const logged = document.getElementById('citizenLoggedView');
    const adminBanner = document.getElementById('citizenAdminBanner');
    const guestBlock = document.getElementById('pueblosGuestBlock');
    if (!guest || !logged || !adminBanner) return;

    if (isAdmin) {
        guest.style.display = 'none';
        logged.style.display = 'none';
        adminBanner.style.display = 'block';
        if (guestBlock) guestBlock.style.display = 'none';
        return;
    }

    adminBanner.style.display = 'none';

    if (citizenProfile) {
        guest.style.display = 'none';
        logged.style.display = 'block';
        if (guestBlock) guestBlock.style.display = 'none';
        const w = document.getElementById('citizenWelcomeText');
        const t = document.getElementById('citizenLocalitiesText');
        if (w) w.textContent = 'Hola, ' + (citizenProfile.name || citizenProfile.email);
        if (t) {
            const locs = citizenProfile.localities && citizenProfile.localities.length
                ? citizenProfile.localities.join(', ')
                : 'solo avisos generales (sin pueblos en el perfil)';
            t.textContent = 'Avisos por pueblo: ' + locs + '.';
        }
        document.querySelectorAll('.citizen-edit-loc').forEach((cb) => {
            cb.checked = citizenProfile.localities.includes(cb.value);
        });
        const consentEdit = document.getElementById('citizenNotifConsentEdit');
        if (consentEdit) {
            consentEdit.checked = citizenProfile.notificationConsent !== false;
        }
        return;
    }

    guest.style.display = 'block';
    logged.style.display = 'none';
    if (guestBlock) guestBlock.style.display = 'block';
}

async function syncCitizenFcmToFirestore(uid) {
    try {
        const token = localStorage.getItem('fcmToken');
        if (!uid) return;
        if (citizenProfile && citizenProfile.notificationConsent === false) {
            return;
        }
        if (!token) return;
        const payload = {
            fcmToken: token,
            updatedFrom: 'NOTIFICATION_PWA',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        if (citizenProfile && typeof citizenProfile.notificationConsent === 'boolean') {
            payload.notificationConsent = citizenProfile.notificationConsent;
        }
        await db
            .collection('users')
            .doc(uid)
            .set(payload, { merge: true });
    } catch (e) {
        console.warn('No se pudo guardar token FCM en el perfil:', e);
    }
}

async function citizenLogin() {
    const email = (document.getElementById('citizenLoginEmail').value || '').trim();
    const password = document.getElementById('citizenLoginPassword').value;
    if (!email || !password) {
        showCitizenMessage('Indique correo y contraseña', true);
        return;
    }
    try {
        await auth.signInWithEmailAndPassword(email, password);
        showCitizenMessage('Sesión iniciada', false);
    } catch (err) {
        const c = err && err.code ? err.code : '';
        if (c === 'auth/wrong-password' || c === 'auth/user-not-found' || c === 'auth/invalid-credential') {
            showCitizenMessage('Credenciales incorrectas', true);
        } else {
            showCitizenMessage(err.message || 'Error al entrar', true);
        }
    }
}

async function citizenRegister() {
    const name = (document.getElementById('citizenRegName').value || '').trim();
    const phone = (document.getElementById('citizenRegPhone').value || '').trim();
    const email = (document.getElementById('citizenRegEmail').value || '').trim();
    const password = document.getElementById('citizenRegPassword').value;
    const password2 = document.getElementById('citizenRegPassword2').value;
    const consent = document.getElementById('citizenRegConsent') && document.getElementById('citizenRegConsent').checked;
    const notifConsent =
        document.getElementById('citizenRegNotifConsent') && document.getElementById('citizenRegNotifConsent').checked;

    const localities = [];
    document.querySelectorAll('.citizen-reg-loc:checked').forEach((cb) => localities.push(cb.value));

    if (!name || !phone || !email || !password) {
        showCitizenMessage('Complete nombre, teléfono, correo y contraseña', true);
        return;
    }
    if (password.length < 6) {
        showCitizenMessage('La contraseña debe tener al menos 6 caracteres', true);
        return;
    }
    if (password !== password2) {
        showCitizenMessage('Las contraseñas no coinciden', true);
        return;
    }
    if (!consent || !notifConsent) {
        showCitizenMessage('Debe aceptar ambos consentimientos', true);
        return;
    }

    try {
        const cred = await auth.createUserWithEmailAndPassword(email, password);
        const uid = cred.user.uid;
        await db
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
                    localities: localities,
                    consentDate: new Date().toISOString(),
                    registeredFrom: 'NOTIFICATION_PWA',
                    registrationDate: firebase.firestore.FieldValue.serverTimestamp()
                },
                { merge: true }
            );
        showCitizenMessage('Cuenta creada. Misma cuenta que en la web del ayuntamiento.', false);
        const det = document.getElementById('citizenRegisterDetails');
        if (det) det.removeAttribute('open');
    } catch (err) {
        const c = err && err.code ? err.code : '';
        if (c === 'auth/email-already-in-use') {
            showCitizenMessage('Ese correo ya está registrado: use Entrar', true);
        } else {
            showCitizenMessage(err.message || 'No se pudo registrar', true);
        }
    }
}

async function citizenLogout() {
    try {
        await auth.signOut();
    } catch (e) {
        console.warn(e);
    }
    citizenProfile = null;
    showCitizenMessage('Sesión cerrada', false);
}

async function saveCitizenLocalities() {
    if (!auth.currentUser || !citizenProfile) {
        showCitizenMessage('Inicie sesión para actualizar sus pueblos', true);
        return;
    }
    const localities = [];
    document.querySelectorAll('.citizen-edit-loc:checked').forEach((cb) => localities.push(cb.value));
    try {
        await db.collection('users').doc(auth.currentUser.uid).set(
            {
                localities: localities,
                updatedFrom: 'NOTIFICATION_PWA',
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            },
            { merge: true }
        );
        citizenProfile.localities = localities;
        selectedPueblos = localities.slice();
        localStorage.setItem('selectedPueblos', JSON.stringify(selectedPueblos));
        updatePueblosUI();
        filterNotificationsByPueblos();
        updateCitizenAuthUI();
        const det = document.getElementById('citizenEditLocalitiesDetails');
        if (det) det.removeAttribute('open');
        showCitizenMessage('Pueblos actualizados correctamente', false);
    } catch (e) {
        console.error('Error guardando localidades:', e);
        showCitizenMessage('No se pudieron guardar los pueblos', true);
    }
}

async function saveCitizenNotificationConsent() {
    if (!auth.currentUser || !citizenProfile) {
        showCitizenMessage('Inicie sesión para actualizar su consentimiento', true);
        return;
    }
    const consentEl = document.getElementById('citizenNotifConsentEdit');
    const consent = !!(consentEl && consentEl.checked);
    try {
        const ref = db.collection('users').doc(auth.currentUser.uid);
        const basePayload = {
            notificationConsent: consent,
            updatedFrom: 'NOTIFICATION_PWA',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        if (consent) {
            const token = localStorage.getItem('fcmToken');
            const payload = token ? { ...basePayload, fcmToken: token } : basePayload;
            await ref.set(payload, { merge: true });
        } else {
            await ref.set(
                {
                    ...basePayload,
                    fcmToken: firebase.firestore.FieldValue.delete()
                },
                { merge: true }
            );
        }
        citizenProfile.notificationConsent = consent;
        if (consent) {
            await syncCitizenFcmToFirestore(auth.currentUser.uid);
        }
        showCitizenMessage(
            consent
                ? 'Consentimiento activado y token actualizado'
                : 'Consentimiento desactivado y token eliminado',
            false
        );
    } catch (e) {
        console.error('Error guardando consentimiento:', e);
        showCitizenMessage('No se pudo actualizar el consentimiento', true);
    }
}

// Solicitar permisos de notificación
async function requestNotificationPermission() {
    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            console.log('✅ Permisos de notificación concedidos');
            
            // Obtener token FCM
            const vapidKey =
                typeof window.__FIREBASE_VAPID_PUBLIC_KEY__ === 'string' &&
                window.__FIREBASE_VAPID_PUBLIC_KEY__.length > 40
                    ? window.__FIREBASE_VAPID_PUBLIC_KEY__
                    : '';
            if (!vapidKey) {
                console.warn(
                    'Clave VAPID ausente: carga ../js/push-config.js e importa el par en Firebase (Cloud Messaging).'
                );
                return;
            }
            const token = await messaging.getToken({
                vapidKey: vapidKey
            });
            
            if (token) {
                console.log('📱 Token FCM:', token);
                localStorage.setItem('fcmToken', token);
                if (auth.currentUser) {
                    await syncCitizenFcmToFirestore(auth.currentUser.uid);
                }
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
        card.className = 'notification-card';
        card.onclick = () => openNotification(notification);
        
        const date = notification.timestamp ? 
            new Date(notification.timestamp.toDate()).toLocaleString() : 
            'Fecha no disponible';
        
        card.innerHTML = `
            <div class="notification-title">${notification.title || 'Sin título'}</div>
            <div class="notification-message">${notification.message || 'Sin mensaje'}</div>
            ${notification.documentUrl ? `
                <div class="has-document" onclick="event.stopPropagation(); openDocument('${notification.documentUrl}')">
                    <i class="fas fa-file-pdf document-icon"></i>
                    Ver documento adjunto
                </div>
            ` : ''}
            <div class="notification-meta">
                <span class="notification-type">${getTypeIcon(notification.type)} ${notification.type || 'general'}</span>
                <span class="notification-date">${date}</span>
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

// Abrir notificación (sin persistir "leído" en Firestore: avisos oficiales por pueblo o generales)
function openNotification(notification) {
    alert(`${notification.title}\n\n${notification.message}`);
}

// Abrir documento
function openDocument(url) {
    window.open(url, '_blank');
}

// Configurar listeners de Firebase
function setupFirebaseListeners() {
    db.collection('notifications')
        .orderBy('timestamp', 'desc')
        .limit(50)
        .onSnapshot((snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const newNotification = {
                        id: change.doc.id,
                        ...change.doc.data()
                    };
                    showSystemNotification(newNotification);
                }
            });
            loadNotifications();
        });
}

// Mostrar notificación del sistema (solo si aplica al usuario actual)
function showSystemNotification(notification) {
    if (Notification.permission !== 'granted') return;
    const list = isAdmin ? null : selectedPueblos;
    if (!notificationMatchesUserPueblos(notification, list || [], !!isAdmin)) return;
    new Notification(notification.title, {
        body: notification.message,
        icon: '../images/escudo-cobreros-192.png',
        badge: '../images/escudo-cobreros-192.png',
        tag: 'ayuntamiento-notification'
    });
}

// Panel de administración
function toggleAdminPanel() {
    const panel = document.getElementById('adminPanel');
    panel.classList.toggle('active');
    if (panel.classList.contains('active') && isAdmin && auth.currentUser) {
        showAdminForm();
    }
}

// Login de administrador (reCAPTCHA v3 + Firebase Auth + admins/{uid})
async function loginAdmin() {
    const email = (document.getElementById('adminEmail').value || '').trim();
    const password = document.getElementById('adminPassword').value;
    
    if (!email || !password) {
        showError('Por favor, complete todos los campos');
        return;
    }

    if (typeof window.executeRecaptcha === 'function' && typeof window.validateRecaptchaToken === 'function') {
        const token = await window.executeRecaptcha('admin_login');
        if (!token || !(await window.validateRecaptchaToken(token, 'admin_login'))) {
            showError('Verificación de seguridad no superada. Inténtelo de nuevo.');
            return;
        }
    } else if (typeof grecaptcha === 'undefined') {
        showError('reCAPTCHA no está cargado. Compruebe la conexión e inténtelo de nuevo.');
        return;
    }

    try {
        await auth.signInWithEmailAndPassword(email, password);
        await ensureNotificationAppAllowlistedAdmin();
        const uid = auth.currentUser.uid;
        const snap = await db.collection('admins').doc(uid).get();
        if (!snap.exists || snap.data().isAdmin !== true) {
            await auth.signOut();
            showError('Esta cuenta no es administradora en Firestore (admins/{uid}).');
            return;
        }
        currentUser = { email: auth.currentUser.email, uid: uid };
        isAdmin = true;
        localStorage.setItem('notificationAppAdmin', JSON.stringify(currentUser));
        showAdminForm();
        showSuccess('Sesión iniciada con Firebase');
    } catch (err) {
        const code = err && err.code ? err.code : '';
        if (code === 'auth/wrong-password' || code === 'auth/user-not-found' || code === 'auth/invalid-credential') {
            showError('Credenciales incorrectas');
        } else {
            showError(err.message || 'Error al iniciar sesión');
        }
    }
}

// Mostrar formulario de admin
function showAdminForm() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('adminForm').style.display = 'block';
}

// Cerrar sesión de admin
async function logoutAdmin() {
    try {
        await auth.signOut();
    } catch (e) {
        console.warn(e);
    }
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
            sentBy: currentUser.email,
            sentFrom: 'NOTIFICATION_APP',
            sentTo: 'WEB'
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
        const response = await fetch('https://us-central1-ayuntamiento-de-cobreros.cloudfunctions.net/sendPushNotification', {
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

// Filtrar por pueblos: admin ve todo; ciudadano usa perfil / selector invitado (misma lógica que la web).
function filterNotificationsByPueblos() {
    if (isAdmin) {
        notifications = allNotifications.slice();
    } else if (selectedPueblos.length === 0) {
        notifications = allNotifications.filter((notif) =>
            notificationMatchesUserPueblos(notif, [], false)
        );
    } else {
        notifications = allNotifications.filter((notif) =>
            notificationMatchesUserPueblos(notif, selectedPueblos, false)
        );
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
                await loadNotifications();
                console.log('📱 Sincronización al reactivar app completada');
            } catch (error) {
                console.error('❌ Error en sincronización al reactivar:', error);
            }
        }
    });

    window.addEventListener('pageshow', async () => {
        try {
            await loadNotifications();
            console.log('📱 Notificaciones recargadas (pageshow)');
        } catch (error) {
            console.error('❌ Error recargando notificaciones (pageshow):', error);
        }
    });

    window.addEventListener('focus', async () => {
        try {
            await loadNotifications();
            console.log('📱 Notificaciones recargadas (focus)');
        } catch (error) {
            console.error('❌ Error recargando notificaciones (focus):', error);
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
