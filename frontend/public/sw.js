const CACHE_NAME = 'devcontrol-cache-v1';
const CACHE_VERSION = 1;

// Install event listeners
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Cache opened:', CACHE_NAME);
      return cache.addAll(['/']);
    })
  );
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Cache activated:', CACHE_NAME);
      return cache.keys().then((keys) => {
        return Promise.all(keys.map(key => cache.delete(key)));
      });
    })
  );
});

// Network requests
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  
  // Skip non-HTTP requests
  if (!url.protocol.startsWith('http')) {
    return;
  }
  
  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).then(response => {
        // Cache successful responses
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request.url, responseClone);
          });
        }
        return response;
      })
    );
    return;
  }
  
  // Serve cached content when offline
  event.respondWith(
    caches.match(request).then((response) => {
      return response || fetch(request);
    })
  );
});
