// Every published release MUST use a new VERSION, even for an HTML-only fix.
const VERSION='prealpha-pwa-1';
const PREFIX='math-camp-pwa:'+self.registration.scope+'::';
const CACHE=PREFIX+VERSION;
const LIST=new URL('./precache-list.json',self.registration.scope).href;
const INDEX=new URL('./index.html',self.registration.scope).href;
async function tell(message){for(const c of await self.clients.matchAll({includeUncontrolled:true,type:'window'}))c.postMessage(message);}
self.addEventListener('install',event=>event.waitUntil((async()=>{
 await caches.delete(CACHE);
 try{
  const cache=await caches.open(CACHE),response=await fetch(LIST,{cache:'no-store'});if(!response.ok)throw Error('Cache list unavailable');
  const files=await response.json();let cursor=0,done=0;
  await Promise.all(Array.from({length:6},async()=>{while(cursor<files.length){const url=new URL(files[cursor++],self.registration.scope).href;const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw Error('Missing '+url);await cache.put(url,r);done++;if(done%12===0||done===files.length)await tell({type:'CACHE_PROGRESS',done,total:files.length});}}));
  await cache.put(new URL('./__offline-ready',self.registration.scope).href,new Response(VERSION));
 }catch(error){await caches.delete(CACHE);await tell({type:'CACHE_FAILED'});throw error;}
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 const keys=(await caches.keys()).filter(k=>k.startsWith(PREFIX)&&k!==CACHE);
 // Keep one previous offline release for any older tab still finishing its session.
 await Promise.all(keys.slice(0,-1).map(k=>caches.delete(k)));
 await self.clients.claim();await tell({type:'OFFLINE_READY',version:VERSION});
})()));
self.addEventListener('message',event=>{
 if(event.data?.type==='APPLY_UPDATE')event.waitUntil(self.skipWaiting());
 if(event.data?.type==='GET_STATUS')event.waitUntil((async()=>{const c=await caches.open(CACHE);const ready=!!await c.match(new URL('./__offline-ready',self.registration.scope).href);event.source?.postMessage({type:ready?'OFFLINE_READY':'CACHE_FAILED',version:VERSION});})());
});
self.addEventListener('fetch',event=>{
 const req=event.request,url=new URL(req.url);if(req.method!=='GET'||url.origin!==self.location.origin||!url.href.startsWith(self.registration.scope))return;
 if(url.pathname.endsWith('/sw.js')||url.href===LIST)return;
 event.respondWith((async()=>{const cache=await caches.open(CACHE);let hit=await cache.match(req);
 if(!hit&&req.mode==='navigate'&&(url.pathname===new URL(self.registration.scope).pathname||url.pathname===new URL(INDEX).pathname))hit=await cache.match(INDEX);
 return hit||fetch(req);})());
});
