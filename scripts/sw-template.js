/* eslint-env serviceworker */
/**
 * Service worker for the blog.
 *
 * Hand-written rather than generated, because the migration has one hard
 * requirement a generator will not cover: the previous Jekyll site shipped a
 * stale-while-revalidate worker under the cache name
 * `main-precache-then-runtime`. Unless that cache is destroyed on activate,
 * returning visitors keep being served the old site indefinitely.
 *
 * The PRECACHE_URLS, VERSION and OFFLINE_URL placeholders below are
 * substituted at build time by scripts/build-sw.mjs.
 */

const VERSION = "__VERSION__";
const PRECACHE = "blog-precache-" + VERSION;
const RUNTIME = "blog-runtime-" + VERSION;
const PRECACHE_URLS = __PRECACHE__;
const OFFLINE_URL = "__OFFLINE__";

/** Caches written by the previous Jekyll service worker. */
const LEGACY_CACHES = [
  "main-precache-then-runtime",
  "main-precache-v1",
  "main-runtime",
  "precache-v1",
  "runtime",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PRECACHE);
      // Added individually: one bad URL should not void the whole precache,
      // which is exactly how the old worker silently cached nothing.
      await Promise.all(
        PRECACHE_URLS.map((url) =>
          cache.add(new Request(url, { cache: "reload" })).catch(() => {}),
        ),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter(
            (name) =>
              LEGACY_CACHES.includes(name) ||
              ((name.startsWith("blog-precache-") || name.startsWith("blog-runtime-")) &&
                name !== PRECACHE &&
                name !== RUNTIME),
          )
          .map((name) => caches.delete(name)),
      );

      if (self.registration.navigationPreload) {
        await self.registration.navigationPreload.enable();
      }
      await self.clients.claim();
    })(),
  );
});

/** Network-first for pages, so a deploy is picked up on the next visit. */
async function handleNavigation(event) {
  const cache = await caches.open(RUNTIME);
  try {
    const preloaded = await event.preloadResponse;
    const response = preloaded || (await fetch(event.request));
    if (response && response.ok) {
      cache.put(event.request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(event.request);
    if (cached) return cached;
    const offline = await caches.match(OFFLINE_URL);
    if (offline) return offline;
    return new Response("You are offline.", {
      status: 503,
      headers: { "Content-Type": "text/plain" },
    });
  }
}

/** Cache-first for build assets — their filenames are content-hashed. */
async function handleAsset(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response && response.ok && response.type === "basic") {
    const cache = await caches.open(RUNTIME);
    cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(event));
    return;
  }

  if (["style", "script", "font", "image"].includes(request.destination)) {
    event.respondWith(handleAsset(request));
  }
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
