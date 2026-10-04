const C='marcel-v10',L=['./','index.html','style.css','script.js','playbooks.js','callmode.js','engine.js','radar.js','notify.js','manifest.json','icon.svg'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(C).then(c=>Promise.all(L.map(u=>c.add(u).catch(()=>0)))))});
self.addEventListener('fetch',e=>{if(e.request.method!='GET'||!e.request.url.startsWith(location.origin))return;e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(C).then(x=>x.put(e.request,c));return r}).catch(()=>caches.match(e.request)))});
self.addEventListener('notificationclick',e=>{e.notification.close();e.waitUntil(clients.openWindow(e.notification.data?.url||'./'))});
