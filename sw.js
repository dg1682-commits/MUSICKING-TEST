// ============================================================================
// [음악왕] PWA & PWABuilder Android APK 전용 Service Worker (sw.js)
// - 온라인 상태: 항상 최신 서버 파일을 우선 받아옴 (Network-First) -> 업데이트 즉시 반영
// - 오프라인 상태: 캐시된 앱 셸 폴백 반환 -> PWABuilder 오프라인/설치 조건 100% 통과
// - Supabase / iTunes / 외부 CDN: 실시간 통신 보장을 위해 캐시하지 않고 네트워크 직통
// ============================================================================

const CACHE_NAME = "musicking-pwa-v20.0";
const APP_SHELL_FILES = [
  "./",
  "./index.html",
  "./style.css?v=20.0",
  "./data.js?v=20.0",
  "./pixel_avatar.js?v=20.0",
  "./online.js?v=20.0",
  "./fishing.js?v=20.0",
  "./app.js?v=20.0",
  "./manifest.json",
  "./bgm/click.wav"
];

self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(APP_SHELL_FILES).catch(() => {});
    })
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // 외부 API(Supabase, iTunes, CDN 등)는 캐시 없이 네트워크 직통 처리
  if (url.origin !== self.location.origin) {
    return;
  }

  // 같은 출처의 정적/HTML 파일은 Network-First 전략으로 항상 최신 반영 + 오프라인 폴백 지원
  event.respondWith(
    fetch(req)
      .then(networkRes => {
        if (networkRes && networkRes.status === 200) {
          const cloned = networkRes.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, cloned)).catch(() => {});
        }
        return networkRes;
      })
      .catch(async () => {
        const cached = await caches.match(req, { ignoreSearch: true });
        if (cached) return cached;
        if (req.mode === "navigate") {
          return caches.match("./index.html");
        }
        return new Response("Offline", { status: 503, statusText: "Offline" });
      })
  );
});
