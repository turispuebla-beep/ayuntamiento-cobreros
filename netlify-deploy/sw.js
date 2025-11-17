// Service Worker para PWA del Ayuntamiento de Cobreros
const CACHE_VERSION = '2025-11-14-01';
const CACHE_NAME = `ayuntamiento-cobreros-${CACHE_VERSION}`;
const STATIC_CACHE = `ayuntamiento-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `ayuntamiento-dynamic-${CACHE_VERSION}`;

// Recursos críticos para cache inmediato
const CRITICAL_RESOURCES = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Recursos estáticos (CSS, JS, imágenes)
const STATIC_RESOURCES = [
  '/css/styles.css',
  '/js/script.js',
  '/js/data-validators.js',
  '/js/error-handler.js',
  '/js/storage-manager.js',
  '/js/rate-limiter.js',
  '/js/accessibility.js',
  '/js/huawei-support.js',
  '/images/escudo-cobreros.png',
  '/images/escudo-cobreros.png',
  '/images/favicon.ico'
];

// Instalación del Service Worker (mejorada)
self.addEventListener('install', event => {
  console.log('Service Worker: Instalando...');
  
  event.waitUntil(
    Promise.all([
      // Cache de recursos críticos
      caches.open(STATIC_CACHE).then(cache => {
        console.log('Service Worker: Cacheando recursos críticos');
        return cache.addAll(CRITICAL_RESOURCES);
      }),
      // Cache de recursos estáticos
      caches.open(STATIC_CACHE).then(cache => {
        console.log('Service Worker: Cacheando recursos estáticos');
        // Agregar recursos estáticos sin bloquear si fallan
        return Promise.allSettled(
          STATIC_RESOURCES.map(url => 
            cache.add(url).catch(err => {
              console.warn(`No se pudo cachear ${url}:`, err);
              return null;
            })
          )
        );
      })
    ]).then(() => {
      console.log('Service Worker: Instalación completada');
      // Forzar activación inmediata
      return self.skipWaiting();
    })
  );
});

// Activación del Service Worker (mejorada)
self.addEventListener('activate', event => {
  console.log('Service Worker: Activando...');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all([
        // Eliminar caches antiguos
        ...cacheNames.map(cacheName => {
          if (cacheName !== STATIC_CACHE && 
              cacheName !== DYNAMIC_CACHE && 
              cacheName !== CACHE_NAME) {
            console.log('Service Worker: Eliminando cache antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        }),
        // Tomar control de todas las páginas
        self.clients.claim()
      ]);
    }).then(() => {
      console.log('Service Worker: Activación completada');
    })
  );
});

// Interceptar peticiones (estrategia mejorada)
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Ignorar peticiones no GET
  if (request.method !== 'GET') {
    return;
  }
  
  // Ignorar peticiones a Firebase/APIs externas (no cachear)
  if (url.origin.includes('firebase') || 
      url.origin.includes('googleapis') ||
      url.origin.includes('gstatic')) {
    return fetch(request);
  }
  
  // Estrategia según tipo de recurso
  if (request.destination === 'document' || url.pathname === '/') {
    // HTML: Network First (siempre actualizado)
    event.respondWith(networkFirstStrategy(request));
  } else if (request.destination === 'script' || 
             request.destination === 'style' ||
             url.pathname.match(/\.(js|css)$/)) {
    // CSS/JS: Cache First (rápido, actualizar en background)
    event.respondWith(cacheFirstStrategy(request));
  } else if (request.destination === 'image') {
    // Imágenes: Cache First (largo tiempo)
    event.respondWith(cacheFirstStrategy(request, DYNAMIC_CACHE));
  } else {
    // Otros: Network First
    event.respondWith(networkFirstStrategy(request));
  }
});

// Estrategia: Network First (siempre intentar red primero)
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);
    
    // Si la respuesta es válida, cachearla
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Si falla la red, intentar cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Si no hay cache, devolver error
    throw error;
  }
}

// Estrategia: Cache First (rápido, actualizar en background)
async function cacheFirstStrategy(request, cacheName = STATIC_CACHE) {
  // Intentar cache primero
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    // Actualizar cache en background (no bloquear)
    fetch(request).then(networkResponse => {
      if (networkResponse && networkResponse.status === 200) {
        caches.open(cacheName).then(cache => {
          cache.put(request, networkResponse.clone());
        });
      }
    }).catch(() => {
      // Ignorar errores de actualización en background
    });
    
    return cachedResponse;
  }
  
  // Si no hay cache, obtener de red
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Si falla, devolver error
    throw error;
  }
}

// Manejar notificaciones push
self.addEventListener('push', event => {
  console.log('Push recibido en la web:', event);
  
  let notificationData = {
    title: '🏛️ Ayuntamiento de Cobreros',
    body: 'Nueva notificación del Ayuntamiento de Cobreros',
    icon: '/images/escudo-cobreros.png',
    badge: '/images/escudo-cobreros.png',
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
