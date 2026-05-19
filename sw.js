// Finance Tracker Service Worker
// 전략: HTML은 항상 네트워크 우선, 해시된 JS/CSS는 캐시 우선, JSON은 항상 새로 가져옴

const CACHE = 'ft-v1';

// 설치 즉시 대기 없이 활성화
self.addEventListener('install', () => self.skipWaiting());

// 활성화 시 이전 캐시 삭제 + 모든 탭 즉시 제어
self.addEventListener('activate', (e) =>
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
);

self.addEventListener('fetch', (e) => {
  const { request } = e;
  const url = new URL(request.url);

  // 다른 도메인 요청은 그대로 통과
  if (url.origin !== location.origin) return;

  // HTML 페이지 로드: 항상 네트워크에서 새로 가져옴 (캐시 우선 절대 안 함)
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request, { cache: 'no-store' })
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(request, clone));
          return res;
        })
        .catch(() => caches.match(request)) // 오프라인 시에만 캐시 사용
    );
    return;
  }

  // JSON 데이터 파일: 항상 네트워크 (transactions.json, version.json)
  if (url.pathname.endsWith('.json')) {
    e.respondWith(
      fetch(request, { cache: 'no-store' })
        .catch(() => caches.match(request))
    );
    return;
  }

  // 해시 포함 JS/CSS 파일 (/assets/index-XXXXXXXX.js): 캐시 우선 (내용이 바뀌면 파일명도 바뀜)
  if (url.pathname.includes('/assets/')) {
    e.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((res) => {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(request, clone));
          return res;
        });
      })
    );
    return;
  }
});
