// ═══════════════════════════════════════════════════════════════
//  ExamFlow v14 — Service Worker (PWA + Offline + Push)
// ═══════════════════════════════════════════════════════════════
const CACHE_NAME = 'examflow-v14.0';
const STATIC_ASSETS = [
  '/index.html',
  '/manifest.json',
  '/assets/css/variables.css',
  '/assets/css/theme-dark.css',
  '/assets/css/app.css',
  '/assets/css/login.css',
  '/assets/js/config.js',
  '/assets/js/core/theme.js',
  '/assets/js/core/state.js',
  '/assets/js/core/utils.js',
  '/assets/js/core/auth.js',
  '/assets/js/core/sync.js',
  '/assets/js/core/biometric.js',
  '/assets/js/core/geolocation.js',
  '/assets/js/ui/shell.js',
  '/assets/js/ui/modals.js',
  '/assets/js/ui/app-html.js',
  '/assets/js/main.js',
  '/assets/js/pages/dashboard.js',
  '/assets/js/pages/dashboards-extended.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(STATIC_ASSETS)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Strategy: network-first for API, cache-first for static
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.hostname.includes('supabase.co')) return;            // مرور مباشر
  if (e.request.method !== 'GET') return;

  // HTML — network first
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // static — cache first + revalidate
  e.respondWith(
    caches.match(e.request).then(cached => {
      const net = fetch(e.request).then(res => {
        if (res.ok) caches.open(CACHE_NAME).then(c => c.put(e.request, res.clone()));
        return res;
      }).catch(() => cached);
      return cached || net;
    })
  );
});

// ── Push notifications ─────────────────────────────────────────
self.addEventListener('push', e => {
  let payload = { title: 'ExamFlow', body: 'لديك إشعار جديد' };
  try { payload = e.data.json(); } catch {}
  e.waitUntil(self.registration.showNotification(payload.title, {
    body: payload.body,
    icon: payload.icon || 'https://conferences.squ.edu.om/Portals/151/ThemePlugin/uploads/2026/1/6/logo.png',
    badge: payload.badge,
    data: payload.data || {},
    vibrate: [120, 60, 120]
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.url || '/';
  e.waitUntil(clients.openWindow(url));
});
