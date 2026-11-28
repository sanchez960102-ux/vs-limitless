// Service worker mínimo: permite instalar la app y abre rápido con red disponible.
const CACHE = 'vsl-v26';
const BASE = ['/app/', '/app/app.css', '/app/main.js', '/shared/app.css', '/shared/ui.js', '/shared/data.js', '/shared/acceso.js', '/shared/anamnesis.js', '/shared/tests.js', '/shared/cargas.js', '/shared/composicion.js', '/shared/permisos.js', '/img/vs-limitless-horizontal-claro.svg'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(BASE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  // Red primero; si no hay conexión, lo último guardado
  e.respondWith(fetch(e.request).then(r => { const copia = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copia)); return r; }).catch(() => caches.match(e.request)));
});
