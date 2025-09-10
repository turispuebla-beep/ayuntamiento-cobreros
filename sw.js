// Service Worker para PWA del Ayuntamiento de Cobreros
const CACHE_NAME = 'ayuntamiento-cobreros-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/script.js',
  '/images/escudo-cobreros.png',
  '/images/escudo-cobreros-192.png',
  '/images/escudo-cobreros-512.png',
  '/manifest.json'
];

// Instalación del Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache abierto');
        return cache.addAll(urlsToCache);
      })
  );
});

// Activación del Service Worker
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Eliminando cache antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Interceptar peticiones
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - devolver respuesta desde cache
        if (response) {
          return response;
        }
        
        // Clonar la petición
        const fetchRequest = event.request.clone();
        
        return fetch(fetchRequest).then(response => {
          // Verificar si recibimos una respuesta válida
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // Clonar la respuesta
          const responseToCache = response.clone();
          
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });
          
          return response;
        });
      })
  );
});

// Manejar notificaciones push
self.addEventListener('push', event => {
  console.log('Push recibido:', event);
  
  const options = {
    body: event.data ? event.data.text() : 'Nueva notificación del Ayuntamiento de Cobreros',
    icon: '/images/escudo-cobreros-192.png',
    badge: '/images/escudo-cobreros-192.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Ver detalles',
        icon: '/images/icon-view.png'
      },
      {
        action: 'close',
        title: 'Cerrar',
        icon: '/images/icon-close.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('🏛️ Ayuntamiento de Cobreros', options)
  );
});

// Manejar clics en notificaciones
self.addEventListener('notificationclick', event => {
  console.log('Notificación clickeada:', event);
  
  event.notification.close();
  
  if (event.action === 'explore') {
    // Abrir la app
    event.waitUntil(
      clients.openWindow('/')
    );
  } else if (event.action === 'close') {
    // Solo cerrar la notificación
    event.notification.close();
  } else {
    // Clic en la notificación (no en acción)
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Manejar notificaciones cerradas
self.addEventListener('notificationclose', event => {
  console.log('Notificación cerrada:', event);
});
