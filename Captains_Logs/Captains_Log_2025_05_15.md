# Captain's Log: Stardate 2025.05.15

## Project Folder Relocation Prep & Caching Status (v1.27)

*   **Service Worker Error Resolution:** Investigated a `TypeError: Failed to fetch` and `net::ERR_FAILED` related to `Images/Waveform_Visualizer_Icon_v2.png` in the `service-worker.js` context. The issue appears to have been an intermittent problem with the local development server or browser cache, as it resolved after a hard refresh and was not reproducible. The icon file exists and is correctly referenced.
*   **Caching Behavior Clarification:**
    *   **Audio Files (`AUDIO_CACHE_NAME`):** Confirmed that audio files listed in `audio_files.json` are pre-cached during the Service Worker `install` event. Additionally, audio files fetched from the network (if not already cached) are cached by the Service Worker during the `fetch` event.
    *   **App Shell Files (`APP_SHELL_CACHE_NAME`):** Confirmed that other application assets (HTML, JS, CSS, images like the icon) are **not** currently being cached by the Service Worker. The `install` step to cache these `appShellFiles` is not active, and the `fetch` handler returns them directly from the network without adding them to the `APP_SHELL_CACHE_NAME`.
*   **Next Steps:** Preparing to move the local project folder `Interactive_Waveform_Visualizer` from its current location to `/Users/robertalexander/GitHub/`. The following Git push will sync the latest changes before this local folder relocation. 