const CACHE_NAME = 'cronflow-pwa-v3';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/logo.svg',
  '/favicon.svg'
];

const isLocalhost = Boolean(
  self.location.hostname === 'localhost' ||
  self.location.hostname === '[::1]' ||
  self.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/)
);

// Instalacao do Service Worker e caching de recursos essenciais
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-carregando assets estaticos essenciais');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Ativacao do Service Worker e limpeza de caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Intercepcao de requisicoes de rede
self.addEventListener('fetch', (event) => {
  // Ignorar caching em localhost para nao atrapalhar o hot-reload do desenvolvimento
  if (isLocalhost) {
    return;
  }

  // Ignorar chamadas de API do Go ou outros dominios externos para nao quebrar a sincronizacao
  if (event.request.url.includes('/v1/') || !event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Estrategia Network-First para a navegacao principal (documentos HTML)
  // Isso garante que o usuario sempre receba o index.html mais recente contendo os novos hashes de assets.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(event.request) || caches.match('/index.html');
        })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Retorna o asset cacheado imediatamente e atualiza o cache em segundo plano (stale-while-revalidate)
        fetch(event.request).then((networkResponse) => {
          if (networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch((err) => console.log('[Service Worker] Falha ao atualizar cache em background:', err));
        
        return cachedResponse;
      }

      return fetch(event.request).then((response) => {
        // Nao cacheia respostas que nao sejam sucesso (status 200)
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return response;
      });
    }).catch(() => {
      // Fallback offline se a rede falhar e o asset nao estiver cacheado
      if (event.request.mode === 'navigate') {
        return caches.match('/index.html');
      }
    })
  );
});
