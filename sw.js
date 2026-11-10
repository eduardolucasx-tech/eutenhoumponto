/* Eu tenho um ponto · service worker v2.3.1
   - Página (index.html): rede primeiro, cache só se estiver offline. Assim o app nunca fica preso numa versão velha.
   - Arquivos com versão na URL (app.js?v=…, app.css?v=…) e bibliotecas com versão fixa
     (Firebase 10.12.5, PDF.js 3.11.174, XLSX 0.18.5): cache primeiro, porque nunca mudam.
   - Nada de Firestore/Auth: chamadas de dados não passam pelo cache. */
const CACHE = 'ponto-v2.3.1';
const CORE = ['./', 'index.html', 'app.css?v=2.3.1', 'app.js?v=2.3.1', 'sync-core.js?v=2.3.1', 'firebase-config.js?v=2.3.1', 'manifest.json', 'icon.svg'];
const IMMUTABLE_HOSTS = ['https://www.gstatic.com/firebasejs/', 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/', 'https://cdn.jsdelivr.net/npm/xlsx@'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('ponto-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function cacheFirst(request){
  const hit = await caches.match(request);
  if(hit) return hit;
  const res = await fetch(request);
  if(res.ok || res.type === 'opaque'){
    const c = await caches.open(CACHE);
    c.put(request, res.clone());
  }
  return res;
}

async function networkFirst(request){
  try{
    const res = await fetch(request);
    if(res.ok){
      const c = await caches.open(CACHE);
      c.put(request, res.clone());
    }
    return res;
  }catch(err){
    const hit = await caches.match(request, { ignoreSearch: request.mode === 'navigate' });
    if(hit) return hit;
    if(request.mode === 'navigate'){
      const shell = await caches.match('index.html');
      if(shell) return shell;
    }
    throw err;
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;

  if(IMMUTABLE_HOSTS.some((h) => req.url.startsWith(h))){
    event.respondWith(cacheFirst(req));
    return;
  }
  if(!sameOrigin) return;
  if(req.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('/')){
    event.respondWith(networkFirst(req));
    return;
  }
  if(url.searchParams.has('v')){
    event.respondWith(cacheFirst(req));
    return;
  }
  event.respondWith(networkFirst(req));
});
