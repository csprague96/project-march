// CACHE_VERSION is replaced at build time by Vite's define plugin.
// This ensures a new cache key on every deploy, preventing stale assets
// from being served after a Vercel build (the root cause of white-screen issues).
const CACHE_VERSION = typeof __SW_CACHE_VERSION__ !== 'undefined'
  ? __SW_CACHE_VERSION__
  : 'triage-shell-dev'

const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
]

const TESSERACT_ASSETS = [
  'https://cdn.jsdelivr.net/npm/tesseract.js-core@6/dist/tesseract-core-simd.wasm.js',
  'https://cdn.jsdelivr.net/npm/tesseract.js-core@6/dist/tesseract-core-simd.wasm',
  'https://tessdata.projectnaptha.com/4.0.0/ukr.traineddata.gz',
]

async function warmTesseractAssets() {
  const cache = await caches.open(CACHE_VERSION)

  await Promise.allSettled(
    TESSERACT_ASSETS.map(async (assetUrl) => {
      const request = new Request(assetUrl, { mode: 'no-cors' })
      const existingResponse = await cache.match(request)

      if (existingResponse) {
        return
      }

      const response = await fetch(request)
      await cache.put(request, response)
    }),
  )
}

self.addEventListener('install', (event) => {
  // waitUntil keeps the SW in "installing" state until the shell is cached
  // AND skipWaiting is called — both must be inside the same waitUntil promise
  // chain, otherwise skipWaiting can race against cache.addAll on slow networks.
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // Purge all caches from previous versions
      caches.keys().then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))),
      ),
      // Pre-warm Tesseract assets in the background after activation
      warmTesseractAssets(),
      // Take control of all open tabs immediately
      self.clients.claim(),
    ]),
  )
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return
  }

  const requestUrl = new URL(event.request.url)

  // Always pass Anthropic API calls straight through — never cache them.
  if (event.request.url.includes('api.anthropic.com')) {
    event.respondWith(fetch(event.request))
    return
  }

  // Same-origin assets: cache-first with network fallback.
  if (requestUrl.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse
        }

        return fetch(event.request).then((networkResponse) => {
          const responseClone = networkResponse.clone()
          caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, responseClone))
          return networkResponse
        })
      }),
    )
    return
  }

  // Tesseract CDN assets: cache-first with network fallback.
  if (TESSERACT_ASSETS.some((assetUrl) => event.request.url.includes(assetUrl))) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse
        }

        return fetch(event.request).then((networkResponse) => {
          const responseClone = networkResponse.clone()
          caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, responseClone))
          return networkResponse
        })
      }),
    )
  }
})
