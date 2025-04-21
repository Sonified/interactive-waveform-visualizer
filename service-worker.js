const APP_SHELL_CACHE_NAME = 'app-shell-cache-v1';
const AUDIO_CACHE_NAME = 'audio-cache-v1'; // Reuse the existing audio cache name

// List of core files constituting the "app shell"
const appShellFiles = [
    // '/', // Alias for index.html - REMOVED as potentially problematic
    'index.html',
    // 'manifest.json', // Good practice to cache if you have one (we might add later) - REMOVED as likely missing
    // 'favicon.ico', // REMOVED as requested
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
        // --- UNCOMMENTING: Pre-cache Audio Files ---
        try {
            // --- PRIORITY: Cache Audio Files ---
            console.log('[Service Worker] Fetching audio file list for caching (Priority)...');
            let audioCachedCount = 0;
            try {
                const response = await fetch('audio_files.json');
                if (!response.ok) {
                    throw new Error(`HTTP error fetching audio_files.json! status: ${response.status}`);
                }
                const audioFilesList = await response.json();
                console.log(`[Service Worker] Found ${audioFilesList.length} audio files to cache.`);

                const audioCache = await caches.open(AUDIO_CACHE_NAME);
                console.log(`[Service Worker] Opened audio cache: ${AUDIO_CACHE_NAME}`);

                const audioPromises = audioFilesList.map(async (filename) => {
                    const filePath = `Audio_Files/${filename}`;
                    try {
                        const cachedResponse = await audioCache.match(filePath);
                        if (!cachedResponse) {
                            console.log(`[Service Worker] Caching audio: ${filename}`);
                            const networkResponse = await fetch(filePath, { cache: 'reload' });
                            if (networkResponse.ok) {
                                await audioCache.put(filePath, networkResponse);
                                audioCachedCount++;
                                console.log(`[Service Worker] Successfully cached audio: ${filename}`);
                            } else {
                                console.warn(`[Service Worker] Failed to fetch audio ${filename} for caching, status: ${networkResponse.status}`);
                            }
                        } else {
                            // console.log(`[Service Worker] Audio already cached: ${filename}`); // Keep commented for less noise
                        }
                    } catch (err) {
                        console.error(`[Service Worker] Error caching audio file ${filename}:`, err);
                    }
                });
                await Promise.all(audioPromises);
            } catch (audioListError) {
                 console.error('[Service Worker] Failed to fetch or process audio file list:', audioListError);
                 // Decide if you want to continue caching app shell even if audio fails
            }
            console.log(`[Service Worker] Finished attempting to cache audio files. Newly cached: ${audioCachedCount}`);
            // --- END: Cache Audio Files ---
        } catch (error) {
            console.error('[Service Worker] Major installation error during audio pre-cache attempt:', error);
        }
        // */
        // --- END UNCOMMENTING: Pre-cache Audio Files ---

        /* --- COMMENTED OUT: Cache App Shell (Second) ---
        // ... (App shell caching code remains commented out) ...
        --- END COMMENTED OUT: Cache App Shell --- */

        console.log('[Service Worker] Installation sequence complete (App Shell caching skipped).');
        // Force the waiting service worker to become the active service worker.
         self.skipWaiting();
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
    console.log('[Service Worker] Fetch intercepted for:', event.request.url);

    // === Bypass SW interception for audio files ===
    if (event.request.url.includes('/Audio_Files/')) {
        console.log('[Service Worker] Fetch: Bypassing SW for audio file, fetching directly from network.');
        // Let the browser handle the request directly
        return; 
    }
    // ==============================================

    // Use a cache-first strategy for non-audio assets
    event.respondWith((async () => {
        // 1. Try to find the response in the caches (check both)
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
            // console.log('[Service Worker] Returning cached response for:', event.request.url);
            return cachedResponse;
        }

        // 2. If not in cache, fetch from the network
        console.log(`[Service Worker] Fetch: No cache hit for ${event.request.url}. Fetching from network...`);
        try {
            const networkResponse = await fetch(event.request);
            console.log(`[Service Worker] Fetch: Network response received for ${event.request.url}, Status: ${networkResponse.status}`);
            
            // 3. Cache the network response dynamically - ONLY if it's an audio file
            // Only cache successful GET requests for files in Audio_Files/
            if (networkResponse && networkResponse.status === 200 && event.request.method === 'GET' && event.request.url.includes('/Audio_Files/')) {
                // const cacheName = event.request.url.includes('/Audio_Files/') ? AUDIO_CACHE_NAME : APP_SHELL_CACHE_NAME; // REMOVED logic - only cache audio
                const cacheName = AUDIO_CACHE_NAME; // Always use audio cache here
                const cache = await caches.open(cacheName);
                // IMPORTANT: Clone the response before caching AND returning it.
                // A response is a stream and can only be consumed once.
                // console.log('[Service Worker] Caching network response for audio file:', event.request.url);
                cache.put(event.request, networkResponse.clone()); 
            }
            
            console.log(`[Service Worker] Fetch: Returning network response for ${event.request.url}`);
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