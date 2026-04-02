// ─────────────────────────────────────────────────────────────
// FIRE PWA — Service Worker
// Strategy: Cache-first for all static assets (shell, fonts,
// styles, scripts). Network-first for nothing — this is a
// fully offline app after first load.
// Push notifications wired but dormant until Phase 5.
// ─────────────────────────────────────────────────────────────

const CACHE_NAME = 'forest-v3.2.6';
const OFFLINE_PAGE = '/';

// All assets to pre-cache on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/config.js',
  '/manifest.json',

  // Core
  '/core/device.js',
  '/core/state.js',
  '/core/analytics.js',
  '/core/router.js',
  '/core/firebase.js',

  // Engine
  '/engine/draw.js',
  '/engine/streak.js',
  '/engine/economy.js',
  '/engine/oracle.js',
  '/engine/audio.js',

  // Screens
  '/screens/splash.js',
  '/screens/first-reveal.js',
  '/screens/reveal.js',
  '/screens/result.js',
  '/screens/ritual.js',
  '/screens/soul-profile.js',
  '/screens/devmode.js',

  // Data
  '/data/quotes.js',

  // Components
  '/components/oracle-eye.js',
  '/components/toast.js',
  '/components/jackpot-banner.js',
  '/components/user-avatar.js',

  // Styles
  '/styles/tokens.css',
  '/styles/animations.css',
  '/styles/screens.css',
  '/styles/components.css',

  // Fonts (self-hosted — added in Phase 1 build step)
  '/assets/fonts/CormorantGaramond-Light.woff2',
  '/assets/fonts/CormorantGaramond-LightItalic.woff2',
  '/assets/fonts/CormorantGaramond-Regular.woff2',
  '/assets/fonts/Inter-Regular.woff2',
  '/assets/fonts/Inter-Medium.woff2',
  '/assets/fonts/Inter-SemiBold.woff2',

  // Icons
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png',

  // Sounds (Phase 1 — silence fallbacks until real audio added)
  // '/assets/sounds/match.mp3',
  // '/assets/sounds/drop.mp3',
  // '/assets/sounds/win.mp3',
  // '/assets/sounds/ambient.mp3',
];

// ── Install: pre-cache all assets ────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())   // activate immediately
      .catch(err => {
        // Don't fail install if one asset is missing — log only
        console.warn('[FIRE SW] Pre-cache partial failure:', err);
      })
  );
});

// ── Activate: delete old caches ───────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim()) // take control of all tabs immediately
  );
});

// ── Fetch: cache-first strategy ───────────────────────────────
self.addEventListener('fetch', event => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // Skip cross-origin requests (GA, Clarity, Firebase)
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request)
      .then(cached => {
        if (cached) return cached;

        // Not in cache — fetch from network and cache it
        return fetch(event.request)
          .then(response => {
            // Only cache valid responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            const toCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => cache.put(event.request, toCache));

            return response;
          })
          .catch(() => {
            // Network failed — serve offline page for navigation requests
            if (event.request.mode === 'navigate') {
              return caches.match(OFFLINE_PAGE);
            }
          });
      })
  );
});

// ── Push Notifications (Phase 5 — wired but dormant) ─────────
self.addEventListener('push', event => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = {
      title: 'FIRE',
      body: event.data.text(),
      type: 'generic',
    };
  }

  const { title = 'FIRE', body = '', icon, type } = payload;

  const options = {
    body,
    icon: icon || '/assets/icons/icon-192.png',
    badge: '/assets/icons/icon-72.png',
    data: { type, url: '/' },
    vibrate: [30, 20, 15, 20, 50],   // matches haptic.streak()
    requireInteraction: false,
    tag: type || 'fire-notification', // replace same-type notifications
    renotify: true,
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// ── Notification click ────────────────────────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // If app already open, focus it
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        // Otherwise open new window
        return clients.openWindow('/');
      })
  );
});

// ── Background sync (future — Phase 5 crew sync) ─────────────
self.addEventListener('sync', event => {
  if (event.tag === 'crew-sync') {
    // Phase 7 will handle this
  }
});
