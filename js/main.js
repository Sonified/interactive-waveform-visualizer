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
const AUDIO_CACHE_NAME = 'audio-cache-v1';

// --- Function to precache audio files ---
async function precacheAudioFiles() {
    console.log("Starting audio file precaching...");
    try {
        const response = await fetch('audio_files.json');
        if (!response.ok) {
            throw new Error(`HTTP error loading audio_files.json! status: ${response.status}`);
        }
        const audioFilesList = await response.json();
        console.log(`Found ${audioFilesList.length} files to potentially precache.`);

        const cache = await caches.open(AUDIO_CACHE_NAME);
        console.log(`Cache '${AUDIO_CACHE_NAME}' opened.`);

        let cachedCount = 0;
        let skippedCount = 0;

        for (const filename of audioFilesList) {
            const filePath = `Audio_Files/${filename}`;
            try {
                const cachedResponse = await cache.match(filePath);
                if (cachedResponse) {
                    // console.log(`Skipping ${filename}, already in cache.`);
                    skippedCount++;
                } else {
                    console.log(`Caching ${filename}...`);
                    // Fetch and cache
                    const networkResponse = await fetch(filePath);
                    if (networkResponse.ok) {
                        await cache.put(filePath, networkResponse); // Store the original response
                        console.log(`Successfully cached ${filename}.`);
                        cachedCount++;
                    } else {
                        console.warn(`Failed to fetch ${filename} for caching, status: ${networkResponse.status}`);
                    }
                }
            } catch (err) {
                console.error(`Error during caching process for ${filename}:`, err);
            }
        }
        console.log(`Pre-caching finished. Cached: ${cachedCount}, Skipped (already cached): ${skippedCount}`);

    } catch (error) {
        console.error('Error during audio precaching process:', error);
    }
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
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
    // Capture the returned contexts from the initial resize
    const initialContexts = resizeCanvases(canvasRefs, uiControls);
    window.addEventListener('resize', () => resizeCanvases(canvasRefs, uiControls)); // Resize doesn't need return value here
    detectAudioFormatSupport(uiControls.browserFormatsSpan); // Pass specific element
    setupUIEventListeners(uiControls); 
    initializeUIValues(uiControls); 
    initializeTheme(canvasRefs, uiControls); // ✨ Initialize theme, which now calls applyTheme with redraw ✨
    setupThemeToggle(canvasRefs, uiControls); // ✨ Setup listener, passes refs/controls for subsequent toggles ✨
    
    // Explicitly initialize the AudioContext and analysers on load
    // Wrap in setTimeout to defer execution slightly, resolving potential timing issues
    setTimeout(() => {
        const localAudioContext = initializeAudioContext(); // Get context directly

        // === NEW: Explicitly Draw Axes After AudioContext is Ready ===
        // Use the contexts captured from the initial resizeCanvases call
        if (localAudioContext) { 
            console.log("Attempting deferred axis draw. Contexts available:", {
                specA: !!initialContexts.spectrogramAxisCtx,
                instA: !!initialContexts.instantaneousWaveformAxisCtx,
                scrollA: !!initialContexts.scrollingWaveformAxisCtx
            });
            // Note: Axis drawing functions implicitly use the exported audioContext from audio.js,
            // but the check here ensures we only call them if initialization succeeded.
            // Check the captured contexts before drawing
            if (initialContexts.spectrogramAxisCtx) drawSpectrogramAxis();
            if (initialContexts.instantaneousWaveformAxisCtx) drawInstantaneousWaveformAxis(uiControls);
            if (initialContexts.scrollingWaveformAxisCtx) drawScrollingWaveformAxis(uiControls);
            console.log("Explicitly drew axes after AudioContext initialization (deferred).");
        } else {
            console.error("Deferred AudioContext initialization failed, cannot draw axes.");
        }
        // =============================================================
    }, 0); // Delay of 0ms

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
            // Optionally disable the dropdown or show an error message
            preloadedSelect.disabled = true;
            preloadedSelect.innerHTML = '<option value="">Error loading files</option>';
        });

    preloadedSelect.addEventListener('change', async () => {
        const selectedFile = preloadedSelect.value;

        if (selectedFile) {
            // Stop any existing audio first
            stopGeneratedAudio();
            stopAudioFile();

            const filePath = `Audio_Files/${selectedFile}`;
            console.log(`Requesting preloaded file: ${filePath}`);
            actualFileInput.value = ''; // Clear local file input

            // --- Loading Overlay Logic ---
            let overlayTimeoutId = null;
            const showOverlayWithDelay = () => {
                if (overlayTimeoutId) clearTimeout(overlayTimeoutId); // Clear previous just in case
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
            // --- End Overlay Logic ---

            try {
                // --- Check Cache First ---
                const cache = await caches.open(AUDIO_CACHE_NAME);
                const cachedResponse = await cache.match(filePath);

                if (cachedResponse) {
                    console.log(`Cache hit for ${selectedFile}. Loading from cache.`);
                    clearOverlayTimeout(); // Don't show overlay for cached file
                    hideLoadingOverlay(); // Ensure it's hidden if somehow shown
                    
                    const audioData = await cachedResponse.arrayBuffer();
                    handleAudioDataLoad(audioData, selectedFile); // Process cached data
                    
                    // Update button text
                    const chooseFileButton = document.getElementById('choose-local-file-button');
                    if (chooseFileButton) {
                        chooseFileButton.textContent = 'Load File'; 
                    }
                    return; // Exit early, no network fetch needed
                } 
                // --- End Cache Check ---
                
                // --- Not in Cache: Fetch from Network --- 
                console.log(`Cache miss for ${selectedFile}. Fetching from network...`);
                showOverlayWithDelay(); // Show overlay (with delay) for network fetch

                const response = await fetch(filePath);

                clearOverlayTimeout(); // Clear timeout once fetch starts/responds

                if (!response.ok) {
                    throw new Error(`HTTP error fetching ${selectedFile}! status: ${response.status}`);
                }

                // --- Cache the Network Response --- 
                // Clone the response stream before consuming it
                const responseToCache = response.clone(); 
                await cache.put(filePath, responseToCache);
                console.log(`Successfully fetched and cached ${selectedFile}.`);
                // ----------------------------------

                const audioData = await response.arrayBuffer(); // Consume the original response stream
                console.log(`Fetched ${selectedFile}, size: ${audioData.byteLength}.`);
                handleAudioDataLoad(audioData, selectedFile); // Process fetched data

                // Update button text
                const chooseFileButton = document.getElementById('choose-local-file-button');
                if (chooseFileButton) {
                    chooseFileButton.textContent = 'Load File'; 
                }

            } catch (error) {
                console.error(`Error loading preloaded file ${selectedFile}:`, error);
                // Maybe disable play button or show error
                updateButtonState(uiControls.playPauseFileButton, false, true); 
                 // --- Reset file info display on error --- 
                 const infoDisplay = document.getElementById('file-info-display');
                 if (infoDisplay) {
                     infoDisplay.innerHTML = '<p>File: Error</p><p>Duration: --</p>';
                 }
                 // --- Disable playback slider on error --- 
                 const playbackRateSlider = document.getElementById('playback-rate');
                 if (playbackRateSlider) {
                     playbackRateSlider.disabled = true;
                 }
                 // ------------------------------------
            } finally {
                 // Always hide overlay regardless of success or error
                 clearOverlayTimeout(); // Ensure timeout is cleared
                 hideLoadingOverlay(); 
            }

            // --- Remove Cancel Button Logic (less applicable with fetch) ---
            // Since fetch doesn't have built-in abort like XHR for simple cases,
            // and cancellation during precache isn't implemented, we remove this.
            // -------------------------------------------------------------

        } else {
            // Handle case where "-- Select a file --" is chosen
            stopGeneratedAudio();
            stopAudioFile();
            actualFileInput.value = ''; // Clear local file input if user deselects
            // Reset UI elements if needed
            const infoDisplay = document.getElementById('file-info-display');
            if (infoDisplay) {
                 infoDisplay.innerHTML = '<p>File: --</p><p>Duration: --</p>';
             }
             const playbackRateSlider = document.getElementById('playback-rate');
             if (playbackRateSlider) {
                 playbackRateSlider.disabled = true;
             }
            updateButtonState(uiControls.playPauseFileButton, false, true); // Disable play button
            // Maybe update other UI elements as needed
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

    // === Call precaching function after initial setup ===
    precacheAudioFiles(); 
    // =====================================================
}); 