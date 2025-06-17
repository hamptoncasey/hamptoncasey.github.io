const CACHE_NAME = 'food-scale-v7';

// Don't try to precache - let runtime caching handle it
const ESSENTIAL_URLS = [
  '/',
  '/manifest.json',
  '/icon-192.png', 
  '/icon-512.png',
  '/favicon.ico'
];

// Install event - cache only essential files
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching essential assets');
        // Cache essential files one by one to avoid failures
        return Promise.allSettled(
          ESSENTIAL_URLS.map(url => 
            cache.add(url).catch(error => {
              console.warn(`Failed to cache ${url}:`, error);
              return null;
            })
          )
        );
      })
      .then(() => {
        console.log('Essential assets cached successfully');
      })
      .catch((error) => {
        console.error('Cache installation failed:', error);
      })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - cache everything as it's requested (runtime caching)
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          console.log('Serving from cache:', event.request.url);
          return cachedResponse;
        }

        // Not in cache, try to fetch and cache it
        return fetch(event.request)
          .then((networkResponse) => {
            // Don't cache non-successful responses
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }

            // Clone the response since it can only be consumed once
            const responseToCache = networkResponse.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                console.log('Caching:', event.request.url);
                cache.put(event.request, responseToCache);
              });

            return networkResponse;
          })
          .catch(() => {
            console.log('Network failed for:', event.request.url);
            // If network fails, try to return the main page for navigation requests
            if (event.request.mode === 'navigate') {
              return caches.match('/').then(response => {
                if (response) {
                  return response;
                }
                // Last resort fallback
                return new Response(
                  '<html><body><h1>Offline</h1><p>This app works offline, but some resources are still loading.</p></body></html>',
                  { 
                    headers: { 'Content-Type': 'text/html' },
                    status: 200
                  }
                );
              });
            }
            
            // For other requests, return a generic offline response
            return new Response('Offline', { 
              status: 503, 
              statusText: 'Service Unavailable' 
            });
          });
      })
  );
});

// Background sync for future enhancements
self.addEventListener('sync', (event) => {
  if (event.tag === 'food-data-sync') {
    event.waitUntil(
      // Future: sync custom foods to cloud storage
      Promise.resolve()
    );
  }
});

// Push notifications for future enhancements
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    event.waitUntil(
      self.registration.showNotification(data.title, {
        body: data.body,
        icon: '/icon-192.png',
        badge: '/icon-192.png'
      })
    );
  }
});