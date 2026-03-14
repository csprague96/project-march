const CACHE_VERSION = 'triage-shell-v1'
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
  event.waitUntil(caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))),
    ),
  )
  self.clients.claim()
  event.waitUntil(warmTesseractAssets())
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return
  }

  const requestUrl = new URL(event.request.url)

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

  if (event.request.url.includes('api.anthropic.com')) {
    event.respondWith(fetch(event.request))
    return
  }

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
