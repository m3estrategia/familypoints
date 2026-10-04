// Cache-first. Cambia CACHE_VERSION al publicar cambios para invalidar la caché.
const CACHE_VERSION = 'familypoints-v1.3.0';
const ASSETS = [
  './', './index.html', './manifest.webmanifest', './css/styles.css',
  './js/app.js', './js/store.js', './js/router.js', './js/dates.js', './js/ui.js', './js/ai-judge.js', './js/suggestions.js', './js/push.js',
  './js/views/today.js', './js/views/approvals.js', './js/views/history.js',
  './js/views/stats.js', './js/views/settings.js', './js/views/forms.js', './js/views/onboarding.js', './js/views/crown.js',
  './icons/icon-180.png', './icons/icon-192.png', './icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_VERSION).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((hit) => {
      if (hit) return hit;
      return fetch(e.request).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE_VERSION).then((c) => c.put(e.request, copy)); }
        return res;
      }).catch(() => (e.request.mode === 'navigate' ? caches.match('./index.html') : Response.error()));
    })
  );
});

self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = {}; }
  const title = d.title || '👑 ¡Hora de repartir los puntos!';
  e.waitUntil(self.registration.showNotification(title, {
    body: d.body || 'Abre FamilyPoints y reparte los puntos de hoy.',
    icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: 'daily-points',
    data: { url: d.url || './index.html#/hoy' },
  }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const target = new URL((e.notification.data && e.notification.data.url) || './index.html#/hoy', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    const own = list.find((c) => c.url.startsWith(self.registration.scope));
    if (own) {
      if ('navigate' in own) return own.navigate(target).catch(() => own).then((c) => (c || own).focus());
      return own.focus();
    }
    return self.clients.openWindow(target);
  }));
});
