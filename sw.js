const CACHE_NAME = 'cashtop-pwa-v79-light-assets';
const PRECACHE = [
  './',
  'index.html',
  'login.html',
  'dashboard.html',
  'cashier.html',
  'customers.html',
  'accounts.html',
  'suppliers.html',
  'products.html',
  'invoices.html',
  'expenses.html',
  'inventory.html',
  'finance.html',
  'analytics.html',
  'notifications.html',
  'mobile-scanner.html',
  'employees.html',
  'settings.html',
  'manifest.json',
  'sw.js',
  'README.md',
  'DATABASE_STRUCTURE.md',
  'firestore.rules',
  'database.rules.json',
  'firestore.secure.rules',
  'icon-64.png',
  'icon-192.png',
  'icon-512.png',
  'oscar-logo.png',



  'app-version.json',
  'offline-update.js',
  'local-bridge.js'
];

async function cacheOne(cache, url) {
  try {
    const req = new Request(url, {cache:'reload'});
    const res = await fetch(req);
    if(res && res.ok) await cache.put(req, res.clone());
  } catch(e) {}
}

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil((async()=>{
    const cache = await caches.open(CACHE_NAME);
    await Promise.allSettled(PRECACHE.map(u => cacheOne(cache, u)));
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async()=>{
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

async function cached(req) {
  return await caches.match(req, {ignoreSearch:true}) || await caches.match('./index.html', {ignoreSearch:true});
}

async function putFresh(req) {
  const res = await fetch(req, {cache:'no-store'});
  if(res && res.ok) {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(req, res.clone());
  }
  return res;
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);

  // لا نلمس Firebase أو أي طلب خارجي حتى لا تتأثر المزامنة.
  if(url.origin !== self.location.origin) return;

  const isNavigation = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');
  const isAppVersion = url.pathname.endsWith('/app-version.json');

  if(isNavigation) {
    event.respondWith((async()=>{
      const hit = await caches.match(req, {ignoreSearch:true});
      if(hit) {
        event.waitUntil(putFresh(req).catch(()=>null));
        return hit;
      }
      try { return await putFresh(req); }
      catch(e) { return await cached(req); }
    })());
    return;
  }

  if(isAppVersion) {
    event.respondWith(putFresh(req).catch(()=>caches.match(req, {ignoreSearch:true})));
    return;
  }

  event.respondWith((async()=>{
    const hit = await caches.match(req, {ignoreSearch:true});
    if(hit) {
      event.waitUntil(putFresh(req).catch(()=>null));
      return hit;
    }
    try { return await putFresh(req); }
    catch(e) { return await cached(req); }
  })());
});

self.addEventListener('message', event => {
  if(event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
