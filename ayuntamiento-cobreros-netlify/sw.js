// Service Worker — PWA Ayuntamiento de Cobreros (cache + FCM en segundo plano)
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyC7gfaHifIGVMN94mQAGnW6VcA4wVFMZsg',
  authDomain: 'ayuntamiento-de-cobreros.firebaseapp.com',
  projectId: 'ayuntamiento-de-cobreros',
  storageBucket: 'ayuntamiento-de-cobreros.firebasestorage.app',
  messagingSenderId: '527550932354',
  appId: '1:527550932354:web:9bd8431defa7c293b1db9b'
};

if (!firebase.apps.length) {
  firebase.initializeApp(FIREBASE_CONFIG);
}

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function (payload) {
  const notification = payload.notification || {};
  const data = payload.data || {};
  const title = notification.title || '🏛️ Ayuntamiento de Cobreros';
  const body = notification.body || 'Nueva notificación del Ayuntamiento de Cobreros';

  return self.registration.showNotification(title, {
    body: body,
    icon: notification.icon || '/images/escudo-cobreros-192.png',
    badge: '/images/escudo-cobreros-192.png',
    tag: 'ayuntamiento-fcm-' + (data.type || 'general'),
    vibrate: [200, 100, 200],
    data: {
      url: '/',
      type: data.type || 'general',
      sentFrom: data.source || data.sent_from || 'FCM'
    }
  });
});

const CACHE_NAME = 'ayuntamiento-cobreros-v5';
const urlsToCache = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/script.js',
  '/js/push-config.js',
  '/js/recaptcha.js',
  '/images/escudo-cobreros.jpg',
  '/images/escudo-cobreros.png',
  '/images/escudo-cobreros-192.png',
  '/images/escudo-cobreros-512.png',
  '/images/favicon.ico',
  '/manifest.json'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (cacheNames) {
      return Promise.all(
        cacheNames.map(function (cacheName) {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

function isFirebaseOrApiRequest(url) {
  return (
    url.includes('firestore.googleapis.com') ||
    url.includes('googleapis.com') ||
    url.includes('gstatic.com') ||
    url.includes('firebaseio.com') ||
    url.includes('google.com/recaptcha') ||
    url.includes('cloudfunctions.net')
  );
}

self.addEventListener('fetch', function (event) {
  const reqUrl = event.request.url || '';
  if (isFirebaseOrApiRequest(reqUrl)) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request).then(function (response) {
      if (response) {
        return response;
      }

      return fetch(event.request).then(function (networkResponse) {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then(function (cache) {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      });
    })
  );
});

// Push genérico (respaldo si FCM no entrega payload estándar)
self.addEventListener('push', function (event) {
  if (event.data) {
    try {
      const parsed = event.data.json();
      if (parsed && parsed.notification) {
        return;
      }
    } catch (e) {
      /* usar handler manual */
    }
  }

  let notificationData = {
    title: '🏛️ Ayuntamiento de Cobreros',
    body: 'Nueva notificación del Ayuntamiento de Cobreros',
    icon: '/images/escudo-cobreros-192.png',
    badge: '/images/escudo-cobreros-192.png',
    type: 'general'
  };

  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        title: data.title || notificationData.title,
        body: data.body || data.message || notificationData.body,
        icon: data.icon || notificationData.icon,
        badge: data.badge || notificationData.badge,
        type: data.type || 'general'
      };
    } catch (err) {
      console.warn('Push sin JSON:', err);
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      data: { url: '/', type: notificationData.type }
    })
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

self.addEventListener('notificationclose', function (event) {
  console.log('Notificación cerrada:', event);
});
