console.log('Version: 2025_04_20_v1.20'); // User confirmation log
console.log("Commit: fix: Add explicit AudioContext resume for Safari | 2025_04_20_v1.20");

import { 
    initializeAudioContext, handleAudioDataLoad, stopGeneratedAudio, stopAudioFile, fileReader, 
    updateAudioActivityBodyClass
} from './audio.js';
import { 
    resizeCanvases, drawSpectrogramAxis, drawInstantaneousWaveformAxis, drawScrollingWaveformAxis
} from './visualizer.js';
import { 
    updateSliderValue, setupUIEventListeners, detectAudioFormatSupport, initializeUIValues,
    initializeTheme, setupThemeToggle, updateButtonState,
    showLoadingOverlay, updateLoadingProgress, hideLoadingOverlay
} from './ui.js';
import { // Import all necessary elements from config.js
    instantaneousWaveformCanvas, scrollingWaveformCanvas, spectrogramCanvas,
    spectrogramAxisCanvas, instantaneousWaveformAxisCanvas, scrollingWaveformAxisCanvas,
    waveformTypeSelect, frequencySlider, frequencyValue, frequencyLogSlider, frequencyLogValue,
    amplitudeSlider, amplitudeValue, noiseTypeSelect, noiseLevelSlider, noiseLevelValue,
    windowSizeSelect, scrollSpeedSlider, scrollSpeedValue, colorSchemeSelect,
    waveformZoomSlider, waveformZoomValueSpan, waveformScaleSlider, waveformScaleValueSpan,
    scrollingDownsampleSlider, scrollingDownsampleValueSpan, scrollingScaleSlider, scrollingScaleValueSpan,
    playPauseGeneratedButton, playPauseFileButton, audioFileInput, fileInfoDisplay,
    browserFormatsSpan, spectrogramScaleSelect, playbackRateSlider, playbackRateValue,
    waveformWindowSizeSelect, scrollSpeedWaveformSlider, scrollSpeedWaveformValueSpan,
    linkFftSizeCheckbox, linkToWaveformCheckbox
} from './config.js';

// === Add AbortController reference ===
let currentFetchController = null;

// === Export function to cancel the fetch ===
export function cancelCurrentFetch() {
    if (currentFetchController) {
        console.log("UI requested fetch cancellation.");
        currentFetchController.abort();
        currentFetchController = null; // Reset controller after aborting
    }
}

let isFirstPlay = true; // Flag to track the first playback action
let initializingIntervalId = null; // Variable to store the interval ID

// --- Add necessary DOM references globally ---
// REMOVE these lines as they are declared in config.js
// const waveformZoomSlider = document.getElementById('waveform-zoom');
// const waveformZoomValueSpan = document.getElementById('waveform-zoom-value'); 

// Add other elements causing ReferenceErrors if needed
// (Keep context declarations here for now)
let instantaneousWaveformCtx = null;
let scrollingWaveformCtx = null;
let spectrogramCtx = null;
let spectrogramAxisCtx = null;
let instantaneousWaveformAxisCtx = null;
let scrollingWaveformAxisCtx = null;

// Define cache name globally or within the scope where needed
// const AUDIO_CACHE_NAME = 'audio-cache-v1'; // REMOVED - Handled by SW

// --- REMOVE Function to precache audio files ---
/* 
async function precacheAudioFiles() { ... function content removed ... } 
*/

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    // --- Service Worker Registration ---
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            // Correct path for root deployment (likely better for local dev too)
            // const swPath = '/service-worker.js'; // Path relative to server root
            const swPath = 'service-worker.js'; // Path relative to current directory (should work for sub-paths)
            navigator.serviceWorker.register(swPath) 
                .then(registration => {
                    console.log('[Service Worker] registered with scope:', registration.scope);
                })
                .catch(error => {
                    console.error('Service Worker registration failed:', error);
                });
        });
    }
    // --- End Service Worker Registration ---
    
    const initOverlay = document.getElementById('initializing-overlay');
    const initTextElement = document.getElementById('initializing-text');
    
    // REMOVED: Conditional check for Service Worker controller 
    // The overlay is now always shown initially by CSS, and the fade-out 
    // is handled unconditionally after setup.
    console.log('[DOMContentLoaded] Initializing page. Overlay shown by CSS.');

    // Define objects containing references from config.js
    const canvasRefs = {
        instWf: instantaneousWaveformCanvas,
        scrollWf: scrollingWaveformCanvas,
        spec: spectrogramCanvas,
        specAxis: spectrogramAxisCanvas,
        instWfAxis: instantaneousWaveformAxisCanvas,
        scrollWfAxis: scrollingWaveformAxisCanvas
    };
    const uiControls = {
        // Generated Audio
        waveformTypeSelect,
        frequencySlider, frequencyValue, frequencyLogSlider, frequencyLogValue,
        amplitudeSlider, amplitudeValue,
        noiseTypeSelect, noiseLevelSlider, noiseLevelValue,
        playPauseGeneratedButton,
        // Audio File
        audioFileInput, playPauseFileButton, fileInfoDisplay, browserFormatsSpan,
        playbackRateSlider, playbackRateValue,
        // Visualizer Controls (General)
        scrollSpeedSlider, scrollSpeedValue, // Spectrogram scroll
        colorSchemeSelect, windowSizeSelect, spectrogramScaleSelect,
        linkToWaveformCheckbox,
        // Inst Waveform
        waveformZoomSlider, waveformZoomValueSpan,
        waveformScaleSlider, waveformScaleValueSpan,
        waveformWindowSizeSelect,
        linkFftSizeCheckbox,
        // Scroll Waveform
        scrollSpeedWaveformSlider, scrollSpeedWaveformValueSpan,
        scrollingDownsampleSlider, scrollingDownsampleValueSpan,
        scrollingScaleSlider, scrollingScaleValueSpan,
        // File Reader (used in setupEventListeners)
        fileReader
    };

    // Call functions with explicit dependencies
    console.log("[DOMContentLoaded] Initial resizeCanvases call...");
    const initialContexts = resizeCanvases(canvasRefs, uiControls);
    console.log("[DOMContentLoaded] Adding window resize listener...");
    window.addEventListener('resize', () => {
        // console.log("[Window Resize Event] Triggering resizeCanvases..."); // Keep commented for less noise
        resizeCanvases(canvasRefs, uiControls);
    }); 
    detectAudioFormatSupport(uiControls.browserFormatsSpan);
    setupUIEventListeners(uiControls);
    initializeUIValues(uiControls);
    initializeTheme(canvasRefs, uiControls);
    setupThemeToggle(canvasRefs, uiControls);

    console.log("[DOMContentLoaded] Setting timeout for AudioContext initialization and axis draw...");
    setTimeout(() => {
        console.log("[setTimeout Callback] Initializing AudioContext...");
        const localAudioContext = initializeAudioContext();

        if (localAudioContext) {
            console.log("[setTimeout Callback] Attempting deferred axis draw. Contexts available:", {
                specA: !!initialContexts.spectrogramAxisCtx,
                instA: !!initialContexts.instantaneousWaveformAxisCtx,
                scrollA: !!initialContexts.scrollingWaveformAxisCtx
            });
            if (initialContexts.spectrogramAxisCtx) {
                console.log("[setTimeout Callback] Calling drawSpectrogramAxis...");
                drawSpectrogramAxis();
            }
            if (initialContexts.instantaneousWaveformAxisCtx) {
                 console.log("[setTimeout Callback] Calling drawInstantaneousWaveformAxis...");
                drawInstantaneousWaveformAxis(uiControls);
            }
            if (initialContexts.scrollingWaveformAxisCtx) {
                 console.log("[setTimeout Callback] Calling drawScrollingWaveformAxis...");
                drawScrollingWaveformAxis(uiControls);
            }
            console.log("[setTimeout Callback] Explicitly drew axes after AudioContext initialization (deferred).");
        } else {
            console.error("[setTimeout Callback] Deferred AudioContext initialization failed, cannot draw axes.");
        }
        
        // === Trigger Delayed Hide (Overlay is always visible initially now) ===
        // Clear any lingering interval (shouldn't be one, but safe)
        if (initializingIntervalId) {
            clearInterval(initializingIntervalId);
            initializingIntervalId = null;
        }
        
        const overlayToHide = document.getElementById('initializing-overlay'); 
        const textToAnimate = document.getElementById('initializing-text');
        // Check if overlay exists (it should)
        if (overlayToHide) { 
            console.log('[setTimeout Callback] Starting overlay fade-out sequence (runs for all loads).');
            // Wait 500ms before starting fade
            setTimeout(() => {
                console.log('[Overlay Fade] Adding fade-out/animate classes.');
                overlayToHide.classList.add('fade-out'); 
                if (textToAnimate) textToAnimate.classList.add('animate-to-header'); // Add text animation class
                
                // Wait for fade transition (500ms) before hiding
                setTimeout(() => {
                    console.log('[Overlay Fade] Setting display: none and removing classes.');
                    overlayToHide.style.display = 'none';
                    overlayToHide.classList.remove('fade-out'); 
                    if (textToAnimate) textToAnimate.classList.remove('animate-to-header'); // Remove text animation class
                }, 500); // Matches CSS transition duration

            }, 500); // Initial delay before fade starts
        } else {
            console.log('[setTimeout Callback] Overlay likely already hidden or fading.');
        }
        // ===========================================

    }, 0); 

    // === Setup Preloaded Audio Files ===
    const preloadedSelect = document.getElementById('preloaded-audio-select');
    const chooseLocalButton = document.getElementById('choose-local-file-button');
    const actualFileInput = document.getElementById('audio-file'); // The hidden input

    fetch('audio_files.json')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(audioFiles => {
            audioFiles.forEach(filename => {
                const option = document.createElement('option');
                option.value = filename;
                option.textContent = filename;
                preloadedSelect.appendChild(option);
            });
        })
        .catch(error => {
            console.error('Error loading or parsing audio_files.json:', error);
            preloadedSelect.disabled = true;
            preloadedSelect.innerHTML = '<option value="">Error loading files</option>';
        });

    preloadedSelect.addEventListener('change', async () => { // Keep async for fetch below
        const selectedFile = preloadedSelect.value;

        if (selectedFile) {
            // Stop any currently playing audio
            stopGeneratedAudio();
            stopAudioFile();

            const filePath = `Audio_Files/${selectedFile}`;
            console.log(`Requesting preloaded file via fetch: ${filePath}`);
            actualFileInput.value = ''; // Clear local file input

            // --- Fetch with Progress Tracking & DELAYED Overlay --- 
            let overlayTimeoutId = null; // Variable to hold the timeout ID
            
            // === Schedule overlay show after a delay ===
            overlayTimeoutId = setTimeout(() => {
                console.log("[Main Fetch] Delay elapsed, showing loading overlay for:", selectedFile);
                showLoadingOverlay(selectedFile);
                overlayTimeoutId = null; // Clear ID after showing
            }, 200); // 200ms delay
            
            // === Create AbortController ===
            currentFetchController = new AbortController();
            const signal = currentFetchController.signal;
            
            try {
                // === Pass signal to fetch ===
                const response = await fetch(filePath, { signal });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const contentLength = response.headers.get('content-length');
                if (!contentLength) {
                    console.warn('Content-Length header not found, cannot show progress.');
                    // Fallback to original method if no length
                    const audioData = await response.arrayBuffer();
                    console.log(`Fetched ${filePath} (no progress), size: ${audioData.byteLength} bytes.`);
                    handleAudioDataLoad(audioData, selectedFile);
                    // hideLoadingOverlay(); // Moved to finally block
                    return; // Exit after fallback
                }

                const totalSize = parseInt(contentLength, 10);
                let loaded = 0;
                const reader = response.body.getReader();
                const chunks = []; // Array to store received chunks
                let loggedMilestones = { 25: false, 50: false, 75: false }; // Track logged percentages

                console.log(`Fetching ${selectedFile}, Total size: ${totalSize} bytes.`);

                // Read the stream
                console.log(`[Main Fetch] Starting stream read loop for ${selectedFile}...`);
                // eslint-disable-next-line no-constant-condition
                while (true) {
                    const { done, value } = await reader.read();

                    if (done) {
                        console.log("[Main Fetch] Fetch stream finished (done=true). Breaking loop.");
                        break; // Exit the loop when done
                    }

                    if (!value) {
                        console.warn("[Main Fetch] Received undefined chunk value before stream finished. Continuing...");
                        continue; // Should not happen with done=false, but be safe
                    }

                    chunks.push(value);
                    loaded += value.length;
                    updateLoadingProgress(loaded, totalSize); // Update UI progress bar
                    
                    // --- Log progress intermittently ---
                    const percent = (loaded / totalSize) * 100;
                    if (percent >= 25 && !loggedMilestones[25]) {
                        console.log(`[Main Fetch] Progress: ~25% loaded (${loaded}/${totalSize} bytes)`);
                        loggedMilestones[25] = true;
                    } else if (percent >= 50 && !loggedMilestones[50]) { 
                        console.log(`[Main Fetch] Progress: ~50% loaded (${loaded}/${totalSize} bytes)`);
                        loggedMilestones[50] = true;
                    } else if (percent >= 75 && !loggedMilestones[75]) {
                        console.log(`[Main Fetch] Progress: ~75% loaded (${loaded}/${totalSize} bytes)`);
                        loggedMilestones[75] = true;
                    }
                    // --- End intermittent logging ---
                }

                console.log(`[Main Fetch] Stream loop finished. Combining ${chunks.length} chunks...`);
                // Combine chunks into a single Uint8Array
                const allChunks = new Uint8Array(loaded);
                let position = 0;
                for (const chunk of chunks) {
                    allChunks.set(chunk, position);
                    position += chunk.length;
                }
                console.log(`[Main Fetch] Chunks combined. Final Uint8Array size: ${allChunks.length}`);

                // Convert Uint8Array to ArrayBuffer (needed by decodeAudioData)
                const audioData = allChunks.buffer;
                console.log(`[Main Fetch] Finished fetching ${selectedFile}. Final ArrayBuffer size: ${audioData.byteLength} bytes.`);

                // === Clear overlay timeout if fetch was fast ===
                if (overlayTimeoutId) {
                    clearTimeout(overlayTimeoutId);
                    overlayTimeoutId = null;
                    console.log("[Main Fetch] Fast fetch/stream read completed before overlay timeout.");
                }
                // ==============================================
                
                handleAudioDataLoad(audioData, selectedFile); // Pass ArrayBuffer

            } catch (error) {
                // === Clear timeout on error too ===
                if (overlayTimeoutId) {
                    clearTimeout(overlayTimeoutId);
                    overlayTimeoutId = null; // Ensure it's nulled on error
                }
                // ===================================

                // === Check for AbortError ===
                if (error.name === 'AbortError') {
                    console.log('[Main Fetch] Fetch aborted successfully by user.');
                    // No need for error message in UI, overlay is hidden by click handler (or finally block)
                } else {
                    console.error(`[Main Fetch] Error during fetch or processing for ${selectedFile}:`, error);
                    // Optionally display error to user
                    const infoDisplay = document.getElementById('file-info-display');
                    if (infoDisplay) {
                        infoDisplay.innerHTML = `<p>Error loading: ${selectedFile}</p>`;
                    }
                    updateButtonState(playPauseFileButton, false, true); // Disable play button on error
                    const playbackRateSlider = document.getElementById('playback-rate');
                    if (playbackRateSlider) playbackRateSlider.disabled = true; // Disable slider
                }
            } finally {
                 // === Ensure overlay is hidden regardless of success/error/abort ===
                 console.log("[Main Fetch] Finally block reached. Hiding overlay.");
                 hideLoadingOverlay(); // Hide overlay (safe to call even if not shown)
                // === Reset controller on completion/error/abort ===
                console.log("[Main Fetch] Resetting fetch controller.");
                currentFetchController = null; 
            }
            // --- END Fetch Logic ---

        } else {
            // Handle the case where the "-- Select --" option is chosen
            // Optional: Stop audio if needed, clear info display, disable buttons
            // stopAudioFile(); // Maybe not needed if nothing was playing
            const infoDisplay = document.getElementById('file-info-display');
            const playButton = document.getElementById('play-pause-file-button');
            const restartButton = document.getElementById('restart-file-button');
            const playbackSlider = document.getElementById('playback-rate');
            if (infoDisplay) {
                infoDisplay.innerHTML = '<p>File: --</p><p>Duration: --</p>';
            }
            // Update button state correctly when deselecting
            updateButtonState(playButton, false, true);
            if (restartButton) restartButton.disabled = true;
            if (playbackSlider) playbackSlider.disabled = true;
            actualFileInput.value = ''; // Clear file input value
            console.log("Preloaded file deselected.");
        }
    });

    chooseLocalButton.addEventListener('click', () => {
        actualFileInput.click(); // Trigger the hidden file input
    });
    // === END: Setup Preloaded Audio Files ===

    // Update button states after potential context creation affecting them
    updateButtonState(uiControls.playPauseGeneratedButton, false);
    updateButtonState(uiControls.playPauseFileButton, false, true);
    updateAudioActivityBodyClass(); // ✨ Set initial audio activity class ✨

    // Add breathing animation CSS handles initial state based on classes
    // uiControls.playPauseGeneratedButton.classList.add('breathing'); // REMOVED - Handled by HTML
    // Audio file already has breathing class from HTML

    // document.addEventListener('keydown', handleSpacebar); // Already set up in setupEventListeners
    // waveformWindowSizeSelect.addEventListener('change', updateWaveformAnalyserSettings); // Already set up in setupEventListeners

    // Setup slider adjustment controls
    // setupAdjControlListeners();
    // updateLeftSliderStyles(); // Apply initial styles
    // updateRightSliderStyles(); // Apply initial styles

    // Explicitly redraw all axes after audio context is initialized and initial UI is set
    // Wrap in setTimeout to ensure audioContext.sampleRate is available
    // setTimeout(() => resizeCanvases(canvasRefs, uiControls), 0); // ✨ REMOVED: Initial draw now handled via initializeTheme -> applyTheme ✨
    // ✨ REMOVED AGAIN: The explicit calls after initializeAudioContext handle the initial draw now ✨

    // === REMOVE Call to precacheAudioFiles ===
    // precacheAudioFiles(); 
    // ========================================
}); 