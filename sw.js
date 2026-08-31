const CACHE_VERSION = 'v2'
const CACHE_PREFIX = 'baize-nav-'
const SHELL_CACHE = `${CACHE_PREFIX}shell-${CACHE_VERSION}`
const RUNTIME_CACHE = `${CACHE_PREFIX}runtime-${CACHE_VERSION}`

const APP_SCOPE = '/nav/'
const INDEX_URL = `${APP_SCOPE}index.html`
const SHELL_FILES = [
  APP_SCOPE,
  INDEX_URL,
  `${APP_SCOPE}manifest.webmanifest`,
  `${APP_SCOPE}baize-logo.webp`,
  `${APP_SCOPE}baize-background.webp`,
]

const NEVER_CACHE_HOSTS = new Set([
  'api.github.com',
  'github.com',
  'translate.googleapis.com',
  'translate.google.com',
  'api.mymemory.translated.net',
  'libretranslate.com',
])

function canCache(response) {
  return response.ok && (response.type === 'basic' || response.type === 'default')
}

async function cacheFile(cache, url) {
  try {
    const response = await fetch(url, { cache: 'reload' })
    if (canCache(response)) {
      await cache.put(url, response)
    }
  } catch {
    // Optional shell assets should not prevent the service worker from installing.
  }
}

async function installShell() {
  const cache = await caches.open(SHELL_CACHE)
  const indexResponse = await fetch(INDEX_URL, { cache: 'reload' })

  if (!canCache(indexResponse)) {
    throw new Error('Unable to cache the navigation shell')
  }

  const indexMarkup = await indexResponse.clone().text()
  await Promise.all([
    cache.put(INDEX_URL, indexResponse.clone()),
    cache.put(APP_SCOPE, indexResponse.clone()),
  ])

  const discoveredAssets = Array.from(
    indexMarkup.matchAll(/(?:src|href)=["']([^"']+)["']/g),
    (match) => match[1],
  ).filter((asset) => {
    const url = new URL(asset, self.location.origin)
    return url.origin === self.location.origin && url.pathname.startsWith(APP_SCOPE)
  })

  await Promise.all(
    [...new Set([...SHELL_FILES, ...discoveredAssets])]
      .filter((url) => url !== APP_SCOPE && url !== INDEX_URL)
      .map((url) => cacheFile(cache, url)),
  )
}

self.addEventListener('install', (event) => {
  event.waitUntil(installShell().then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                key.startsWith(CACHE_PREFIX) &&
                key !== SHELL_CACHE &&
                key !== RUNTIME_CACHE,
            )
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

async function navigationNetworkFirst(request) {
  try {
    const response = await fetch(request)
    if (!canCache(response)) {
      throw new Error(`Navigation returned ${response.status}`)
    }

    if (response.headers.get('content-type')?.includes('text/html')) {
      const cache = await caches.open(RUNTIME_CACHE)
      await cache.put(INDEX_URL, response.clone())
    }
    return response
  } catch {
    return (
      (await caches.match(INDEX_URL)) ||
      (await caches.match(APP_SCOPE)) ||
      new Response('白泽导航暂时无法离线打开。', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      })
    )
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached

  const response = await fetch(request)
  if (canCache(response)) {
    const cache = await caches.open(RUNTIME_CACHE)
    await cache.put(request, response.clone())
  }
  return response
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE)
  const cached = await caches.match(request)

  if (cached) {
    fetch(request)
      .then((response) => {
        if (canCache(response)) {
          return cache.put(request, response.clone())
        }
      })
      .catch(() => undefined)
    return cached
  }

  const response = await fetch(request)
  if (canCache(response)) {
    await cache.put(request, response.clone())
  }
  return response
}

async function networkFirst(request) {
  try {
    const response = await fetch(request)
    if (canCache(response)) {
      const cache = await caches.open(RUNTIME_CACHE)
      await cache.put(request, response.clone())
    }
    return response
  } catch {
    const cached = await caches.match(request)
    if (cached) return cached
    throw new Error('Network unavailable and no cached response exists')
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  if (
    request.method !== 'GET' ||
    NEVER_CACHE_HOSTS.has(url.hostname) ||
    url.origin !== self.location.origin ||
    !url.pathname.startsWith(APP_SCOPE)
  ) {
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(navigationNetworkFirst(request))
    return
  }

  if (url.pathname.startsWith(`${APP_SCOPE}assets/`)) {
    event.respondWith(cacheFirst(request))
    return
  }

  if (/\.(?:avif|gif|ico|jpe?g|png|svg|webp|woff2?)$/i.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request))
    return
  }

  event.respondWith(networkFirst(request))
})
