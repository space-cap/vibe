// 캐시 이름 설정
const CACHE_NAME = 'java-quiz-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
    '/script.js',
    '/data/basic.json',
    '/data/collections.json',
    '/data/database.json',
    '/data/designpattern.json',
    '/data/exception.json',
    '/data/jvm.json',
    '/data/network.json',
    '/data/oop.json',
    '/data/spring.json',
    '/data/thread.json',
  // 기타 필요한 리소스들
];

// 설치 이벤트
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

// 활성화 이벤트
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// 네트워크 요청 가로채기
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});
