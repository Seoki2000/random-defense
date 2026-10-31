// 홈 화면 앱의 서비스 워커(PLAN-mobile-ux §3-7). 네트워크 먼저 — 새로 올리면 다음 실행에 바로 반영되고,
// 안 되면(오프라인) 마지막으로 받은 것으로 연다. 같은 출처의 GET 만 다룬다
const CACHE = "rd-v2";
const START = new URL("./", self.registration.scope).href;

/** 페이지 열기(내비게이션)는 쿼리와 상관없이 시작 주소 하나로 저장·검색한다 — 쿼리마다 따로 저장하면 오프라인에서 옛 빌드가 골라졌다(Codex ⑦) */
const keyOf = (req) => (req.mode === "navigate" ? START : req.url);

// 첫 방문만으로도 오프라인 실행이 되게 설치 때 시작 페이지를 미리 받아 둔다 — 첫 HTML 요청은 워커 등록 전에 나가 저장되지 않는다(Codex ⑥)
self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll([START, "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png"])));
});
// 지난 판의 캐시는 지운다(이 앱 것만 — 같은 github.io 출처의 다른 저장소 캐시는 건드리지 않는다)
self.addEventListener("activate", (e) =>
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("rd-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  ),
);
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  const key = keyOf(req);
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          e.waitUntil(caches.open(CACHE).then((c) => c.put(key, copy)));
        }
        return res;
      })
      .catch(() => caches.open(CACHE).then((c) => c.match(key)).then((hit) => hit ?? Response.error())),
  );
});
