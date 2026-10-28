const CACHE_VERSION = 'build-98634f43cc7c1ad53116'
const APP_VERSION = 'app-640b96e9d9a246e76e76'
const CACHE_PREFIX = 'baize-nav-'
// Data-only builds share the same UI shell, avoiding hourly waiting-cache copies.
const SHELL_CACHE = `${CACHE_PREFIX}shell-${APP_VERSION}`
const RUNTIME_CACHE = `${CACHE_PREFIX}runtime-${APP_VERSION}`

const APP_SCOPE = '/nav/'
const INDEX_URL = `${APP_SCOPE}index.html`
const SHELL_FILES = [
  APP_SCOPE,
  INDEX_URL,
  `${APP_SCOPE}manifest.webmanifest`,
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
  const indexResponse = await fetch(INDEX_URL, { cache: 'reload' })

  if (!canCache(indexResponse)) {
    throw new Error('Unable to cache the navigation shell')
  }

  const indexMarkup = await indexResponse.clone().text()
  const discoveredAssets = Array.from(
    indexMarkup.matchAll(/(?:src|href)=["']([^"']+)["']/g),
    (match) => match[1],
  ).filter((asset) => {
    const url = new URL(asset, self.location.origin)
    return url.origin === self.location.origin && url.pathname.startsWith(APP_SCOPE)
  })

  // Precache lazy editor/inbox/tool chunks so they can be opened offline too.
  const manifestResponse = await fetch(`${APP_SCOPE}offline-assets.json`, { cache: 'reload' })
  if (!manifestResponse.ok) throw new Error('Offline asset manifest is unavailable')
  const manifest = await manifestResponse.json()
  if (manifest.version !== 1 || manifest.appVersion !== APP_VERSION || !Array.isArray(manifest.assets) || manifest.assets.length > 500) throw new Error('Invalid or mismatched offline application manifest')
  for (const asset of manifest.assets) {
    if (typeof asset !== 'string' || !asset.startsWith(`${APP_SCOPE}assets/`) || asset.includes('..') || /[%?#\\\s]/.test(asset) || !/\.(js|css|woff2?)$/.test(asset)) throw new Error('Invalid offline asset path')
  }
  const assetSet = new Set(manifest.assets)
  for (const asset of discoveredAssets) {
    const url = new URL(asset, self.location.origin)
    if (url.pathname.startsWith(`${APP_SCOPE}assets/`) && /\.(?:js|css)$/.test(url.pathname) && !assetSet.has(url.pathname)) throw new Error('Application HTML and offline assets are from different versions')
  }

  // A data-only install shares the active UI cache: validate before any writes.
  // If a deployment changes halfway through these reads, retain the active shell.
  const cache = await caches.open(SHELL_CACHE)
  await Promise.all([
    cache.put(INDEX_URL, indexResponse.clone()),
    cache.put(APP_SCOPE, indexResponse.clone()),
  ])
  for (const asset of manifest.assets) {
    const response = await fetch(asset, { cache: 'reload' })
    if (!canCache(response)) throw new Error('Unable to cache application module')
    await cache.put(asset, response)
  }

  await Promise.all(
    [...new Set([...SHELL_FILES, ...discoveredAssets])]
      .filter((url) => url !== APP_SCOPE && url !== INDEX_URL)
      .map((url) => cacheFile(cache, url)),
  )
}

self.addEventListener('install', (event) => {
  event.waitUntil(installShell())
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'ACTIVATE_UPDATE') event.waitUntil(self.skipWaiting())
  if (event.data?.type === 'GET_BUILD_ID') event.ports?.[0]?.postMessage({ type: 'BUILD_ID', buildId: CACHE_VERSION, appVersion: typeof APP_VERSION === 'string' ? APP_VERSION : null })
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
  // These are content-hashed, same-origin build assets. Preview/CDN servers may
  // add Vary: Origin although module and precache requests carry different headers.
  const cached = await caches.match(request, { ignoreVary: true })
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
    // The standalone game must never replace the navigation's cached index.html.
    url.pathname.startsWith(`${APP_SCOPE}game/`) ||
    // Learning experiments must not replace the app shell or be served as it.
    url.pathname.startsWith(`${APP_SCOPE}learning-lab/`) ||
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
