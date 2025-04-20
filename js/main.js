console.log("--- RUNNING LATEST js/main.js (SW VERSION TEST 1) ---");
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
            // Correct path for GitHub Pages deployment
            const swPath = '/interactive-waveform-visualizer/service-worker.js'; 
            navigator.serviceWorker.register(swPath) 
                .then(registration => {
                    console.log('Service Worker registered with scope:', registration.scope);
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
            stopGeneratedAudio();
            stopAudioFile();

            const filePath = `Audio_Files/${selectedFile}`;
            console.log(`Requesting preloaded file via fetch (SW should intercept): ${filePath}`);
            actualFileInput.value = ''; 

            // Use the *existing* audio loading overlay for file fetching
            let overlayTimeoutId = null;
            const showOverlayWithDelay = () => {
                if (overlayTimeoutId) clearTimeout(overlayTimeoutId);
                overlayTimeoutId = setTimeout(() => {
                    showLoadingOverlay(selectedFile);
                    overlayTimeoutId = null; 
                }, 150);
            };
            const clearOverlayTimeout = () => {
                if (overlayTimeoutId) {
                    clearTimeout(overlayTimeoutId);
                    overlayTimeoutId = null;
                }
            };
            
            try {
                // --- REMOVE Cache Check --- 
                /* 
                const cache = await caches.open(AUDIO_CACHE_NAME);
                const cachedResponse = await cache.match(filePath);
                if (cachedResponse) { ... removed ... } 
                */
                // --- End Cache Check ---
                
                // --- Fetch (will be intercepted by SW) --- 
                console.log(`Fetching ${selectedFile} (Service Worker will handle cache)...`);
                showOverlayWithDelay(); 

                const response = await fetch(filePath); // SW intercepts here

                clearOverlayTimeout();

                if (!response.ok) {
                    // If SW returns fallback or network fails, this will trigger
                    throw new Error(`Fetch failed for ${selectedFile}! status: ${response.status}`); 
                }

                // --- REMOVE Cache Put --- 
                /*
                const responseToCache = response.clone(); 
                await cache.put(filePath, responseToCache);
                console.log(`Successfully fetched and cached ${selectedFile}.`);
                */
                // ----------------------------------

                const audioData = await response.arrayBuffer(); 
                console.log(`Fetched ${selectedFile} (via SW/Network), size: ${audioData.byteLength}.`);
                handleAudioDataLoad(audioData, selectedFile);

                const chooseFileButton = document.getElementById('choose-local-file-button');
                if (chooseFileButton) {
                    chooseFileButton.textContent = 'Load File'; 
                }

            } catch (error) {
                console.error(`Error loading preloaded file ${selectedFile}:`, error);
                updateButtonState(uiControls.playPauseFileButton, false, true); 
                 const infoDisplay = document.getElementById('file-info-display');
                 if (infoDisplay) {
                     infoDisplay.innerHTML = '<p>File: Error</p><p>Duration: --</p>';
                 }
                 const playbackRateSlider = document.getElementById('playback-rate');
                 if (playbackRateSlider) {
                     playbackRateSlider.disabled = true;
                 }
            } finally {
                 clearOverlayTimeout(); 
                 hideLoadingOverlay(); 
            }
        } else {
            // Handle case where "-- Select a file --" is chosen
            stopGeneratedAudio();
            stopAudioFile();
            actualFileInput.value = ''; 
            const infoDisplay = document.getElementById('file-info-display');
            if (infoDisplay) {
                 infoDisplay.innerHTML = '<p>File: --</p><p>Duration: --</p>';
             }
             const playbackRateSlider = document.getElementById('playback-rate');
             if (playbackRateSlider) {
                 playbackRateSlider.disabled = true;
             }
            updateButtonState(uiControls.playPauseFileButton, false, true); 
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