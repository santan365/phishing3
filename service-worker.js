// ============================================================
// CSEC3100 Phishing Awareness Trainer — Service Worker
// Caches the app shell so it loads instantly and works offline
// Scenarios are fetched fresh from GitHub each time (not cached)
// ============================================================

const CACHE_NAME = 'phishing-trainer-v1';

// These are the core app files we want to cache locally
// Once cached, the app loads from the device even with no internet
const APP_SHELL = [
  '/phishing-trainer/',
  '/phishing-trainer/index.html',
  '/phishing-trainer/styles.css',
  '/phishing-trainer/app.js',
  '/phishing-trainer/icon-192.png',
  '/phishing-trainer/icon-512.png'
];

// INSTALL — runs once when the service worker is first registered
// Opens the cache and stores all app shell files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Service worker: caching app shell');
      return cache.addAll(APP_SHELL);
    })
  );
  self.skipWaiting(); // Activate immediately without waiting
});

// ACTIVATE — runs after install, cleans up any old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME) // Remove old cache versions
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim(); // Take control of all open tabs immediately
});

// FETCH — intercepts every network request the app makes
// Strategy: cache first for app shell, network first for scenarios
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // Always fetch scenarios fresh from GitHub — never serve from cache
  // This ensures users always get the latest scenario bank
  if (url.includes('raw.githubusercontent.com')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // For everything else: try cache first, fall back to network
  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request);
    })
  );
});
