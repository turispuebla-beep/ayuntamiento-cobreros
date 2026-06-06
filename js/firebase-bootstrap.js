/**
 * Inicialización Firebase en la página (sin claves; usa firebase-config.generated.js).
 */
(function () {
    var firebaseConfig = window.__FIREBASE_CONFIG__;
    if (!firebaseConfig || !firebaseConfig.apiKey) {
        console.error(
            'Firebase: falta js/firebase-config.generated.js. Ejecuta node scripts/inject-firebase-config.mjs o despliega en Netlify con variables de entorno.'
        );
        return;
    }
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    try {
        firebase.firestore().enablePersistence({ synchronizeTabs: true }).catch(function () {});
    } catch (e) {}

    function showCustomNotification(title, body) {
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            new Notification(title, {
                body: body,
                icon: 'images/escudo-cobreros-192.png',
                badge: 'images/escudo-cobreros-192.png'
            });
        }
    }

    async function requestNotificationPermission() {
        if (typeof Notification === 'undefined') return false;
        var permission = await Notification.requestPermission();
        return permission === 'granted';
    }

    var VAPID_KEY =
        typeof window.__FIREBASE_VAPID_PUBLIC_KEY__ === 'string' &&
        window.__FIREBASE_VAPID_PUBLIC_KEY__.length > 40
            ? window.__FIREBASE_VAPID_PUBLIC_KEY__
            : '';

    async function getFCMToken() {
        try {
            if (!firebase.messaging.isSupported || !firebase.messaging.isSupported()) {
                return null;
            }
            if (!VAPID_KEY) {
                console.warn(
                    'Clave VAPID: revisa js/push-config.js e importa el par en Firebase (Cloud Messaging → certificados push web).'
                );
                return null;
            }
            var messaging = firebase.messaging();
            var swReg = null;
            if ('serviceWorker' in navigator) {
                swReg = await navigator.serviceWorker.register('/sw.js');
                await navigator.serviceWorker.ready;
            }
            return await messaging.getToken({
                vapidKey: VAPID_KEY,
                serviceWorkerRegistration: swReg || undefined
            });
        } catch (error) {
            console.error('Error obteniendo token FCM:', error);
            return null;
        }
    }

    window.addEventListener('load', async function () {
        try {
            if (firebase.messaging.isSupported && firebase.messaging.isSupported()) {
                firebase.messaging().onMessage(function (payload) {
                    if (payload && payload.notification) {
                        showCustomNotification(
                            payload.notification.title,
                            payload.notification.body
                        );
                    }
                });
            }
        } catch (e) {}
        var granted = await requestNotificationPermission();
        if (granted) {
            var token = await getFCMToken();
            if (token) {
                try {
                    localStorage.setItem('fcmToken', token);
                } catch (x) {}
            }
        }
    });

    window.requestNotificationPermission = requestNotificationPermission;
    window.getFCMToken = getFCMToken;
    window.showCustomNotification = showCustomNotification;
})();
