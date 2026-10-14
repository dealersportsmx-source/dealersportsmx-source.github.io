/* Guarda las apps en el aparato para que abran sin internet.
   Cuando hay internet, revisa en segundo plano si hay una versión nueva. */
const CACHE = 'mis-apps-v8';
const FILES = ["/", "/index.html", "/manifest.webmanifest", "/icon-180.png", "/icon-512.png", "/cotizador/", "/cotizador/index.html", "/cotizador/manifest.webmanifest", "/cotizador/icon-180.png", "/cotizador/icon-512.png", "/facturas/prueba.html", "/facturas/", "/facturas/index.html", "/facturas/manifest.webmanifest", "/facturas/icon-180.png", "/facturas/icon-512.png", "/clientes/prueba.html", "/clientes/", "/clientes/index.html", "/clientes/manifest.webmanifest", "/clientes/icon-180.png", "/clientes/icon-512.png", "/catalogo/prueba.html", "/catalogo/", "/catalogo/index.html", "/catalogo/manifest.webmanifest", "/catalogo/icon-180.png", "/catalogo/icon-512.png", "/historias/", "/historias/index.html", "/historias/manifest.webmanifest", "/historias/icon-180.png", "/historias/icon-512.png"];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  const u = new URL(req.url);
  // La tienda pública (/tienda/) no se guarda aquí: siempre se ve la versión más nueva
  if (req.method !== 'GET' || u.origin !== location.origin || u.pathname.startsWith('/tienda/')) return;
  e.respondWith(caches.open(CACHE).then(async cache => {
    const cached = await cache.match(req, { ignoreSearch: true });
    const fresh = fetch(req).then(res => {
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    }).catch(() => null);
    if (cached) { e.waitUntil(fresh); return cached; }
    const res = await fresh;
    if (res) return res;
    if (req.mode === 'navigate') {
      const u = new URL(req.url);
      const fallback = await cache.match(u.pathname.replace(/[^/]*$/, '') + 'index.html');
      if (fallback) return fallback;
    }
    return new Response('Sin conexión', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }));
});
