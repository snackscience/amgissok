/* 암기쏙 오프라인 지원 (서비스 워커)
 * - 앱 화면과 아이콘을 기기에 저장해 인터넷 없이도 열리게 합니다.
 * - 학습지 사진은 여기서 다루지 않습니다(기기 안 IndexedDB에만 저장).
 * - 앱을 고친 뒤에는 VERSION 숫자를 올려야 새 버전이 설치됩니다.
 */
const VERSION = 'amgissok-v1.1.0';
const SHELL = [
  './',
  './index.html',
  './privacy.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png',
];
const FONT_CACHE = 'amgissok-font';

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== FONT_CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // 글꼴(Pretendard) : 한 번 받으면 기기에 보관
  if (url.hostname === 'cdn.jsdelivr.net') {
    e.respondWith(
      caches.open(FONT_CACHE).then(async c => {
        const hit = await c.match(req);
        if (hit) return hit;
        try { const res = await fetch(req); if (res.ok || res.type === 'opaque') c.put(req, res.clone()); return res; }
        catch { return new Response('', { status: 504 }); }
      })
    );
    return;
  }
  if (url.origin !== location.origin) return;

  // 페이지 : 인터넷이 되면 새 버전, 안 되면 저장된 버전
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(res => { caches.open(VERSION).then(c => c.put('./index.html', res.clone())); return res; })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }
  // 아이콘 등 : 저장된 것 먼저
  e.respondWith(caches.match(req).then(hit => hit || fetch(req)));
});
