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
  console.log('Push recibido en la web:', event);
  
  let notificationData = {
    title: '🏛️ Ayuntamiento de Cobreros',
    body: 'Nueva notificación del Ayuntamiento de Cobreros',
    icon: '/images/escudo-cobreros-192.png',
    badge: '/images/escudo-cobreros-192.png',
    type: 'general',
    localities: '',
    sentFrom: 'WEB'
  };
  
  // Procesar datos de la notificación
  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        title: data.title || notificationData.title,
        body: data.body || data.message || notificationData.body,
        icon: data.icon || notificationData.icon,
        badge: data.badge || notificationData.badge,
        type: data.type || 'general',
        localities: data.localities || '',
        sentFrom: data.sent_from || 'WEB',
        hasAttachments: data.has_attachments || false,
        attachmentUrl: data.attachment_url || null,
        attachmentType: data.attachment_type || null
      };
    } catch (e) {
      console.log('Error procesando datos de notificación:', e);
    }
  }
  
  // Personalizar según el tipo
  let color = '#1e3a8a'; // Azul por defecto
  let priority = 'normal';
  
  switch (notificationData.type) {
    case 'emergencia':
      color = '#dc2626';
      priority = 'high';
      break;
    case 'cita':
      color = '#16a34a';
      priority = 'high';
      break;
    case 'evento':
      color = '#ea580c';
      priority = 'high';
      break;
    case 'bando':
      color = '#9333ea';
      priority = 'high';
      break;
  }
  
  const options = {
    body: notificationData.body,
    icon: notificationData.icon,
    badge: notificationData.badge,
    vibrate: [200, 100, 200],
    color: color,
    priority: priority,
    data: {
      dateOfArrival: Date.now(),
      primaryKey: Date.now(),
      type: notificationData.type,
      localities: notificationData.localities,
      sentFrom: notificationData.sentFrom,
      hasAttachments: notificationData.hasAttachments,
      attachmentUrl: notificationData.attachmentUrl,
      attachmentType: notificationData.attachmentType
    },
    actions: [
      {
        action: 'view',
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
    self.registration.showNotification(notificationData.title, options)
  );
});

// Manejar clics en notificaciones
self.addEventListener('notificationclick', event => {
  console.log('Notificación clickeada:', event);
  
  event.notification.close();
  
  if (event.action === 'view') {
    // Abrir la app y mostrar detalles de la notificación
    event.waitUntil(
      clients.openWindow('/#notification-details')
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
