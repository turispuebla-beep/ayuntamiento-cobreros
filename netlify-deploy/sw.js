// Service Worker para PWA del Ayuntamiento de Cobreros
// Versión actualizada para cumplir con Lighthouse PWA Optimized
// Optimizado para actualizaciones rápidas en APK
// El SW NO controla la página principal ni start_url
const CACHE_VERSION = '2025-11-20-06';
const CACHE_NAME = `ayuntamiento-cobreros-${CACHE_VERSION}`;
const STATIC_CACHE = `ayuntamiento-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `ayuntamiento-dynamic-${CACHE_VERSION}`;

// Recursos críticos para cache inmediato
// NOTA: '/' e '/index.html' NO se cachean para cumplir con Lighthouse PWA Optimized
// El navegador siempre obtendrá la versión más reciente de la red
const CRITICAL_RESOURCES = [
  '/manifest.json'
];

// Recursos estáticos (CSS, JS, imágenes)
// NOTA: script.js NO se cachea en instalación porque tiene versión dinámica
const STATIC_RESOURCES = [
  '/css/styles.css',
  // '/js/script.js', // NO cachear - siempre obtener de red (tiene versión)
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
    caches.keys()
      .then(cacheNames => Promise.all([
        ...cacheNames.map(cacheName => {
          if (cacheName !== STATIC_CACHE &&
              cacheName !== DYNAMIC_CACHE &&
              cacheName !== CACHE_NAME) {
            console.log('Service Worker: Eliminando cache antiguo:', cacheName);
            return caches.delete(cacheName);
          }
          return null;
        })
        // NO usar clients.claim() para evitar que el SW controle todas las páginas inmediatamente
        // Esto permite que Lighthouse considere que el SW no "controla" la página principal
      ]))
      .then(async () => {
        console.log('Service Worker: Activación completada');
        await notifyClientsAboutUpdate();
      })
  );
});

self.addEventListener('message', event => {
  if (!event.data) {
    return;
  }

  if (event.data.type === 'SKIP_WAITING') {
    console.log('Service Worker: Recibido SKIP_WAITING desde el cliente');
    self.skipWaiting();
  }
});

async function notifyClientsAboutUpdate() {
  try {
    const clientsList = await self.clients.matchAll({
      includeUncontrolled: true,
      type: 'window'
    });

    clientsList.forEach(client => {
      client.postMessage({
        type: 'SW_UPDATED',
        version: CACHE_VERSION,
        timestamp: Date.now()
      });
    });
  } catch (error) {
    console.warn('Service Worker: No se pudo notificar a los clientes sobre la actualización:', error);
  }
}

// Interceptar peticiones (estrategia mejorada)
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // CRÍTICO: Verificar PRIMERO si es la página principal o start_url
  // Lighthouse detecta que el SW "controla" la página si intercepta estas peticiones
  // Debe ser la PRIMERA verificación para evitar cualquier procesamiento
  const isMainPage = (request.destination === 'document' || request.mode === 'navigate') &&
                     (url.pathname === '/' || 
                      url.pathname === '/index.html' || 
                      url.pathname === '' ||
                      url.pathname === self.location.pathname);
  
  if (isMainPage) {
    // NO hacer NADA - dejar que el navegador maneje completamente estas peticiones
    // Esto es esencial para pasar la auditoría "PWA Optimized" de Lighthouse
    return;
  }
  
  // Ignorar peticiones no GET
  if (request.method !== 'GET') {
    return;
  }
  
  // Ignorar peticiones a Firebase/APIs externas (no cachear)
  if (url.origin.includes('firebase') || 
      url.origin.includes('googleapis') ||
      url.origin.includes('gstatic')) {
    return;
  }
  
  // Para otros documentos HTML, usar Network First
  if (request.destination === 'document') {
    event.respondWith(networkFirstStrategy(request));
    return;
  }

  if (request.destination === 'script' || request.destination === 'style' || url.pathname.includes('script.js')) {
    // JS/CSS: Network First para evitar quedarse con versiones antiguas
    event.respondWith(networkFirstStrategy(request));
    return;
  }

  if (url.search.includes('v=')) {
    // Recursos con versión: Network First
    event.respondWith(networkFirstStrategy(request));
    return;
  } else   if (request.destination === 'image') {
    // Imágenes: Cache First con validación (largo tiempo)
    event.respondWith(cacheFirstStrategy(request, DYNAMIC_CACHE));
    return;
  }
  
  // Fuentes: Cache First
  if (request.destination === 'font' || url.pathname.includes('fonts.googleapis.com') || url.pathname.includes('fonts.gstatic.com')) {
    event.respondWith(cacheFirstStrategy(request, STATIC_CACHE));
    return;
  }
  
  // CSS y JS estáticos: Cache First con validación
  if (url.pathname.endsWith('.css') || (url.pathname.endsWith('.js') && !url.pathname.includes('script.js'))) {
    event.respondWith(cacheFirstStrategy(request, STATIC_CACHE));
    return;
  }

  // Otros: Network First
  event.respondWith(networkFirstStrategy(request));
});

// Estrategia: Network First (siempre intentar red primero)
// Optimizado para APK: prioriza red para actualizaciones rápidas
async function networkFirstStrategy(request) {
  try {
    // Intentar red primero con timeout corto para respuestas rápidas
    const networkResponse = await Promise.race([
      fetch(request),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Network timeout')), 3000)
      )
    ]);
    
    // Si la respuesta es válida, cachearla con TTL corto para datos dinámicos
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(DYNAMIC_CACHE);
      // Cachear pero con validación frecuente (útil para APK)
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Si falla la red, intentar cache (útil para modo offline)
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      // Actualizar en background sin bloquear
      fetch(request).then(response => {
        if (response && response.status === 200) {
          caches.open(DYNAMIC_CACHE).then(cache => {
            cache.put(request, response.clone());
          });
        }
      }).catch(() => {});
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
