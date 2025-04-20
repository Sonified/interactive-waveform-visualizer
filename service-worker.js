const APP_SHELL_CACHE_NAME = 'app-shell-cache-v1';
const AUDIO_CACHE_NAME = 'audio-cache-v1'; // Reuse the existing audio cache name

// List of core files constituting the "app shell"
const appShellFiles = [
    '/', // Alias for index.html
    'index.html',
    'manifest.json', // Good practice to cache if you have one (we might add later)
    'favicon.ico', 
    'Images/Waveform_Visualizer_Icon_v2.png',
    // Add main CSS/JS modules
    'js/config.js',
    'js/audio.js',
    'js/visualizer.js',
    'js/ui.js',
    'js/main.js',
    'audio_files.json' // Need the list itself
    // Add other essential assets like fonts if any
];

// --- Install Event ---
self.addEventListener('install', event => {
    console.log('[Service Worker] Install event triggered');
    event.waitUntil((async () => {
        try {
            // 1. Cache App Shell
            console.log('[Service Worker] Caching App Shell...');
            const appCache = await caches.open(APP_SHELL_CACHE_NAME);
            await appCache.addAll(appShellFiles);
            console.log('[Service Worker] App Shell cached successfully.');

            // 2. Cache Audio Files (Prioritized)
            console.log('[Service Worker] Fetching audio file list for caching...');
            const response = await fetch('audio_files.json');
            if (!response.ok) {
                throw new Error(`HTTP error fetching audio_files.json! status: ${response.status}`);
            }
            const audioFilesList = await response.json();
            console.log(`[Service Worker] Found ${audioFilesList.length} audio files to cache.`);

            const audioCache = await caches.open(AUDIO_CACHE_NAME);
            console.log(`[Service Worker] Opened audio cache: ${AUDIO_CACHE_NAME}`);
            
            let audioCachedCount = 0;
            const audioPromises = audioFilesList.map(async (filename) => {
                const filePath = `Audio_Files/${filename}`;
                try {
                    // Check if already in cache (e.g., from previous install/fetch)
                    const cachedResponse = await audioCache.match(filePath);
                    if (!cachedResponse) {
                        // console.log(`[Service Worker] Caching audio: ${filename}`);
                        // Use cache: 'reload' to ensure we get a fresh copy if needed, 
                        // though addAll in app shell should handle this for the list itself.
                        const networkResponse = await fetch(filePath, { cache: 'reload' }); 
                        if (networkResponse.ok) {
                            await audioCache.put(filePath, networkResponse);
                            audioCachedCount++;
                            // console.log(`[Service Worker] Successfully cached audio: ${filename}`);
                        } else {
                             console.warn(`[Service Worker] Failed to fetch audio ${filename} for caching, status: ${networkResponse.status}`);
                        }
                    } else {
                         // console.log(`[Service Worker] Audio already cached: ${filename}`);
                    }
                } catch (err) {
                    console.error(`[Service Worker] Error caching audio file ${filename}:`, err);
                }
            });

            await Promise.all(audioPromises);
            console.log(`[Service Worker] Finished attempting to cache audio files. Newly cached: ${audioCachedCount}`);

            console.log('[Service Worker] Installation complete.');
            // Force the waiting service worker to become the active service worker.
             self.skipWaiting();

        } catch (error) {
            console.error('[Service Worker] Installation failed:', error);
        }
    })());
});

// --- Activate Event ---
self.addEventListener('activate', event => {
    console.log('[Service Worker] Activate event triggered');
    event.waitUntil((async () => {
        // Clean up old caches
        const expectedCacheNames = [APP_SHELL_CACHE_NAME, AUDIO_CACHE_NAME];
        const cacheNames = await caches.keys();
        
        await Promise.all(
            cacheNames.map(cacheName => {
                if (!expectedCacheNames.includes(cacheName)) {
                    console.log('[Service Worker] Deleting old cache:', cacheName);
                    return caches.delete(cacheName);
                }
            })
        );
        
        console.log('[Service Worker] Old caches cleaned up.');
        // Take control of uncontrolled clients (pages) immediately
        await self.clients.claim();
        console.log('[Service Worker] Now controlling clients.');
    })());
});

// --- Fetch Event ---
self.addEventListener('fetch', event => {
    // console.log('[Service Worker] Fetch intercepted for:', event.request.url);
    
    // Use a cache-first strategy
    event.respondWith((async () => {
        // 1. Try to find the response in the caches (check both)
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
            // console.log('[Service Worker] Returning cached response for:', event.request.url);
            return cachedResponse;
        }

        // 2. If not in cache, fetch from the network
        // console.log('[Service Worker] No cache hit. Fetching from network:', event.request.url);
        try {
            const networkResponse = await fetch(event.request);
            
            // 3. Cache the network response dynamically (optional, but good for offline)
            // Only cache successful GET requests
            if (networkResponse && networkResponse.status === 200 && event.request.method === 'GET') {
                const cacheName = event.request.url.includes('/Audio_Files/') ? AUDIO_CACHE_NAME : APP_SHELL_CACHE_NAME;
                const cache = await caches.open(cacheName);
                // IMPORTANT: Clone the response before caching AND returning it.
                // A response is a stream and can only be consumed once.
                // console.log('[Service Worker] Caching network response for:', event.request.url);
                cache.put(event.request, networkResponse.clone()); 
            }
            
            return networkResponse;
            
        } catch (error) {
            console.error('[Service Worker] Network fetch failed:', error);
            // Optional: Return a fallback offline page or resource here
            // For now, just let the browser handle the network error
            // return new Response("Network error happened", {
            //     status: 408,
            //     headers: { "Content-Type": "text/plain" },
            // });
        }
    })());
}); 