/* kilo service worker — 앱 셸 캐싱.
 * 목적: 네트워크 없는 곳(헬스장 지하)에서도 홈화면 아이콘으로 앱이 열리게.
 * 데이터는 localStorage(게스트) 또는 Supabase라 여기서 건드리지 않는다.
 *
 * 전략
 * - 페이지 이동(navigate): 네트워크 우선, 실패하면 같은 경로 캐시 → 없으면 "/" 캐시
 * - /_next/static/*: 캐시 우선 (해시 파일명이라 영원히 유효)
 * - 종목 이미지(free-exercise-db): 캐시 우선, 300개 넘으면 오래된 것부터 삭제
 * - /api/*, Supabase 등 나머지 교차 출처: 캐시 안 함
 */
const VERSION = "kilo-v1";
const SHELL = `${VERSION}-shell`;
const STATIC = `${VERSION}-static`;
const MEDIA = `${VERSION}-media`;
const PAGES = ["/", "/meals", "/workout", "/me", "/manifest.webmanifest", "/icon.svg"];
const MEDIA_HOST = "raw.githubusercontent.com";
const MEDIA_MAX = 300;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((c) => Promise.allSettled(PAGES.map((p) => c.add(new Request(p, { cache: "reload" })))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("kilo-") && !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // 1. 페이지 이동: 네트워크 우선 → 캐시 → "/"
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok && url.origin === self.location.origin) {
            const copy = res.clone();
            caches.open(SHELL).then((c) => c.put(url.pathname, copy));
          }
          return res;
        })
        .catch(async () => (await caches.match(url.pathname)) || (await caches.match("/")) || Response.error()),
    );
    return;
  }

  // 2. 같은 출처 정적 파일: 캐시 우선
  if (url.origin === self.location.origin) {
    if (url.pathname.startsWith("/api/")) return; // 데이터는 항상 네트워크
    if (url.pathname.startsWith("/_next/static/") || url.pathname === "/icon.svg" || url.pathname === "/manifest.webmanifest") {
      event.respondWith(cacheFirst(STATIC, req));
    }
    return;
  }

  // 3. 종목 이미지: 캐시 우선 + 개수 제한
  if (url.hostname === MEDIA_HOST) {
    event.respondWith(cacheFirst(MEDIA, req, MEDIA_MAX));
  }
});

async function cacheFirst(name, req, max) {
  const cache = await caches.open(name);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok || res.type === "opaque") {
    cache.put(req, res.clone());
    if (max) trim(cache, max);
  }
  return res;
}

async function trim(cache, max) {
  const keys = await cache.keys();
  if (keys.length <= max) return;
  for (const k of keys.slice(0, keys.length - max)) await cache.delete(k);
}
