// Service Worker para notificaciones push
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

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
const messaging = firebase.messaging();

// Manejar mensajes en segundo plano
messaging.onBackgroundMessage((payload) => {
    console.log('📱 Mensaje recibido en segundo plano:', payload);
    
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/images/escudo-cobreros.png',
        badge: '/images/escudo-cobreros.png',
        tag: 'ayuntamiento-notification',
        requireInteraction: true,
        actions: [
            {
                action: 'open',
                title: 'Ver notificación'
            }
        ],
        data: {
            url: '/notification-app/',
            type: payload.data?.type || 'general'
        }
    };
    
    self.registration.showNotification(notificationTitle, notificationOptions);
});

// Manejar clics en notificaciones
self.addEventListener('notificationclick', (event) => {
    console.log('📱 Notificación clickeada:', event);
    
    event.notification.close();
    
    if (event.action === 'open' || !event.action) {
        // Abrir la app
        event.waitUntil(
            clients.openWindow('/notification-app/')
        );
    }
});

// Cache de recursos estáticos
const CACHE_NAME = 'notifications-app-v1';
const urlsToCache = [
    '/notification-app/',
    '/notification-app/index.html',
    '/notification-app/app.js',
    '/notification-app/manifest.json',
    '/images/escudo-cobreros.png'
];

// Instalar Service Worker
self.addEventListener('install', (event) => {
    console.log('📱 Service Worker instalado');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                return cache.addAll(urlsToCache);
            })
    );
});

// Activar Service Worker
self.addEventListener('activate', (event) => {
    console.log('📱 Service Worker activado');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Interceptar requests
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Devolver desde cache si está disponible
                if (response) {
                    return response;
                }
                
                // Si no está en cache, hacer fetch
                return fetch(event.request);
            })
    );
});



