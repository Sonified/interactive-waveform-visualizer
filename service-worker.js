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

    // Define the async function for audio pre-caching separately
    const precacheAudio = async () => {
        console.log('[Service Worker] Starting background audio pre-caching...');
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
            console.error('[Service Worker] Major error during background audio pre-cache attempt:', error);
        }
    };

    // Wait only for essential setup (currently just skipWaiting)
    event.waitUntil((async () => {
        // REMOVE console.log("[Service Worker] Audio pre-caching in install event is temporarily disabled.");
        // REMOVE /* === TEMPORARILY DISABLED AUDIO PRE-CACHING === ... */
        // REMOVE console.log("[Service Worker] Audio pre-caching in install event is temporarily disabled."); // Added log
        // REMOVE /* === END TEMPORARILY DISABLED AUDIO PRE-CACHING === */

        // REMOVE /* --- COMMENTED OUT: Cache App Shell (Second) --- ... */

        console.log('[Service Worker] waitUntil: Essential setup complete.');
        // Force the waiting service worker to become the active service worker.
         await self.skipWaiting(); // Keep skipWaiting inside waitUntil
         console.log('[Service Worker] waitUntil: skipWaiting called.');
    })());

    // Start the non-essential audio pre-caching AFTER waitUntil is processed
    // Use a microtask (queueMicrotask or Promise.resolve().then()) 
    // or just call it directly - should run after sync code completes.
    precacheAudio(); 

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

    // REMOVED: Bypass SW interception for audio files
    /*
    if (event.request.url.includes('/Audio_Files/')) {
        console.log('[Service Worker] Fetch: Bypassing SW for audio file, fetching directly from network.');
        // Let the browser handle the request directly
        return; 
    }
    */

    // Use a cache-first strategy (checking appropriate cache based on request type)
    event.respondWith((async () => {
        const isAudioFile = event.request.url.includes('/Audio_Files/');
        const cacheNameToTry = isAudioFile ? AUDIO_CACHE_NAME : APP_SHELL_CACHE_NAME;
        const cache = await caches.open(cacheNameToTry);

        // 1. Try to find the response in the appropriate cache
        const cachedResponse = await cache.match(event.request);
        if (cachedResponse) {
            // console.log(`[SW] Cache hit in ${cacheNameToTry} for:`, event.request.url);
            return cachedResponse;
        }

        // 2. If not in cache, fetch from the network
        console.log(`[SW] Fetch: Cache miss in ${cacheNameToTry} for ${event.request.url}. Fetching network...`);
        try {
            // --- Fetch and Stream with Progress --- 
            const networkResponse = await fetch(event.request);
            console.log(`[SW] Fetch: Network response OK for ${event.request.url}, Status: ${networkResponse.status}`);

            // Check if we should track progress and cache (audio files only for now)
            const shouldTrackProgress = networkResponse.ok && 
                                        event.request.method === 'GET' && 
                                        isAudioFile && 
                                        networkResponse.body && 
                                        networkResponse.headers.get('content-length');

            if (shouldTrackProgress) {
                const total = parseInt(networkResponse.headers.get('content-length') || '0', 10);
                let loaded = 0;
                const reader = networkResponse.body.getReader();
                const chunks = [];
                let lastProgressSent = 0; // Track time of last message
                const progressInterval = 100; // Send progress every 100ms

                // Function to send progress update
                const sendProgress = async (force = false) => {
                    const now = Date.now();
                    if (force || now - lastProgressSent > progressInterval) {
                        const clients = await self.clients.matchAll({
                            includeUncontrolled: true,
                            type: 'window',
                        });
                        clients.forEach(client => {
                            client.postMessage({ 
                                type: 'FETCH_PROGRESS', 
                                url: event.request.url, // Include URL for potential filtering
                                loaded: loaded,
                                total: total 
                            });
                        });
                        lastProgressSent = now;
                        // console.log(`[SW Progress] Sent: ${loaded} / ${total}`); // DEBUG
                    }
                };

                // Read the stream
                // eslint-disable-next-line no-constant-condition
                while (true) {
                    try {
                        const { done, value } = await reader.read();
                        if (done) {
                            await sendProgress(true); // Send final progress
                            break;
                        }
                        chunks.push(value);
                        loaded += value.length;
                        await sendProgress(); // Send progress update (throttled)
                    } catch (streamError) {
                        console.error('[SW] Error reading stream:', streamError);
                        // Potentially send an error message back to client
                        throw streamError; // Re-throw to be caught by outer catch
                    }
                }
                
                // Combine chunks into a Blob, then create a new Response
                const blob = new Blob(chunks);
                const headers = {};
                networkResponse.headers.forEach((value, key) => { headers[key] = value; });
                const finalResponse = new Response(blob, { status: networkResponse.status, statusText: networkResponse.statusText, headers: headers });
                
                // Cache the final response (using the blob)
                console.log('[SW] Caching final response for audio file:', event.request.url);
                await cache.put(event.request, finalResponse.clone()); // Cache the *new* response
                
                console.log(`[SW] Fetch: Returning streamed & cached response for ${event.request.url}`);
                return finalResponse; // Return the *new* response built from chunks

            } else {
                // For non-audio files, or if progress tracking isn't possible (no length, etc.)
                // Return the network response directly (no caching logic needed here for non-audio based on previous rules)
                console.log(`[SW] Fetch: Returning network response directly (no progress tracking/caching) for ${event.request.url}`);
                return networkResponse;
            }
            // --- End Fetch and Stream --- 

        } catch (error) {
            console.error('[SW] Network fetch or stream processing failed:', error);
            // Optional: Return a fallback offline page or resource here
        }
    })());
}); 