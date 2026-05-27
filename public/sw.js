const CACHE_NAME = 'cronflow-pwa-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/logo.svg',
  '/favicon.svg'
];

// Instalação do Service Worker e caching de recursos essenciais
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pré-carregando assets estáticos essenciais');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Ativação do Service Worker e limpeza de caches antigos
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

// Intercepção de requisições de rede
self.addEventListener('fetch', (event) => {
  // Ignorar chamadas de API do Go ou outros domínios externos para não quebrar a sincronização
  if (event.request.url.includes('/v1/') || !event.request.url.startsWith(self.location.origin)) {
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
        // Não cacheia respostas que não sejam sucesso (status 200)
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
      // Fallback offline se a rede falhar e o asset não estiver cacheado
      if (event.request.mode === 'navigate') {
        return caches.match('/index.html');
      }
    })
  );
});
