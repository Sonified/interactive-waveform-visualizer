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

    preloadedSelect.addEventListener('change', () => {
        const selectedFile = preloadedSelect.value;
        if (selectedFile) {
            // --- NEW: Stop any existing audio first --- 
            stopGeneratedAudio();
            stopAudioFile();
            // --- END: Stop any existing audio --- 

            const filePath = `Audio_Files/${selectedFile}`;
            console.log(`Fetching preloaded file: ${filePath}`);
            actualFileInput.value = ''; // Clear local file input

            // --- Start Loading Overlay (with delay) ---
            let overlayTimeoutId = null;
            overlayTimeoutId = setTimeout(() => {
                showLoadingOverlay(selectedFile);
                overlayTimeoutId = null; // Clear the ID once the timeout has run
            }, 150); // Delay showing overlay by 150ms
            // ----------------------------------------

            // Use XMLHttpRequest for progress tracking
            const xhr = new XMLHttpRequest();
            xhr.open('GET', filePath, true);
            xhr.responseType = 'arraybuffer';

            xhr.onprogress = (event) => {
                if (event.lengthComputable) {
                    updateLoadingProgress(event.loaded, event.total);
                } else {
                    // Optional: Handle cases where progress is not computable
                    // updateLoadingProgress(0, 0); // Or show indeterminate state
                }
            };

            xhr.onload = () => {
                // --- Clear the overlay timeout --- 
                if (overlayTimeoutId) {
                    clearTimeout(overlayTimeoutId);
                    overlayTimeoutId = null;
                }
                // ---------------------------------

                if (xhr.status === 200) {
                    const audioData = xhr.response;
                    console.log(`Fetched ${selectedFile}, size: ${audioData.byteLength}.`);
                    handleAudioDataLoad(audioData, selectedFile); // Call function in audio.js
                    
                    // Update button text (moved inside success handler)
                    const chooseFileButton = document.getElementById('choose-local-file-button');
                    if (chooseFileButton) {
                        chooseFileButton.textContent = 'Load File'; 
                    }
                } else {
                    console.error(`HTTP error! status: ${xhr.status}`);
                    // Maybe disable play button or show error
                    updateButtonState(uiControls.playPauseFileButton, false, true); 
                }
                hideLoadingOverlay(); // Hide overlay on success or expected HTTP error
            };

            xhr.onerror = () => {
                // --- Clear the overlay timeout --- 
                if (overlayTimeoutId) {
                    clearTimeout(overlayTimeoutId);
                    overlayTimeoutId = null;
                }
                // ---------------------------------

                console.error(`Network error fetching audio file ${selectedFile}`);
                // Maybe disable play button or show error
                updateButtonState(uiControls.playPauseFileButton, false, true); 
                hideLoadingOverlay(); // Hide overlay on network error
            };

            xhr.send();

            /* // --- OLD Fetch code - replaced by XMLHttpRequest ---
            fetch(filePath)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    // Cannot easily get progress with standard fetch .arrayBuffer()
                    return response.arrayBuffer(); 
                })
                .then(audioData => {
                    // TODO: Call a function in audio.js to handle this ArrayBuffer
                    // e.g., loadAudioData(audioData, selectedFile);
                    console.log(`Fetched ${selectedFile}, size: ${audioData.byteLength}. Need to implement audio loading.`);
                    // For now, just log success
                    // Placeholder for loadAudioData call:
                     handleAudioDataLoad(audioData, selectedFile);

                    // --- NEW: Change button text ---
                    const chooseFileButton = document.getElementById('choose-local-file-button');
                    if (chooseFileButton) {
                        chooseFileButton.textContent = 'Load File';
                    }
                    // --- END: Change button text ---

                })
                .catch(error => {
                    console.error(`Error fetching audio file ${selectedFile}:`, error);
                    // Maybe disable play button or show error
                     updateButtonState(uiControls.playPauseFileButton, false, true); 
                });
            */ // --- End of OLD Fetch code ---
        } else {
            // Option "-- Select a file --" chosen
             // Potentially stop audio if it was playing a preloaded file
             stopAudioFile(); // Ensure any playing file stops
             audioBuffer = null; // Clear buffer
             updateButtonState(uiControls.playPauseFileButton, false, true); // Update button state (disable play/restart)
             // --- NEW: Reset file info display ---
             const infoDisplay = document.getElementById('file-info-display');
             if (infoDisplay) {
                 infoDisplay.innerHTML = '<p>File: --</p><p>Duration: --</p>';
             }
             // --- NEW: Disable playback slider ---
             const playbackRateSlider = document.getElementById('playback-rate');
             if (playbackRateSlider) {
                 playbackRateSlider.disabled = true;
             }
             // -------------------------------------
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
}); 