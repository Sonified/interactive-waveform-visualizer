// --- Button State Helper ---
function updateButtonState(button, isPlaying, isDisabled = false) {
    if (!button) return;

    const restartButton = document.getElementById('restart-file-button'); // Get restart button

    button.disabled = isDisabled;
    if (restartButton && button.id === 'play-pause-file-button') {
        restartButton.disabled = isDisabled; // Sync restart button state
    }

    if (isPlaying) {
        button.textContent = button.id.includes('generated') ? 'Pause Generated' : 'Pause'; // Change to Play/Pause
        button.classList.remove('play-style');
        button.classList.add('pause-style');
    } else {
        button.textContent = button.id.includes('generated') ? 'Play Generated' : 'Play'; // Change to Play/Pause
        button.classList.remove('pause-style');
        button.classList.add('play-style');
    }
}

// --- Theme Toggling --- ✨ NEW ✨ ---
// const themeToggleButton = document.getElementById('theme-toggle-checkbox'); // MOVED INSIDE setupThemeToggle
const bodyElement = document.body;

function applyTheme(themeName, canvasRefs, uiControls) {
    if (themeName === 'midnight-blue') {
        bodyElement.classList.add('midnight-blue');
    } else {
        bodyElement.classList.remove('midnight-blue');
    }
    if (canvasRefs && uiControls) {
        if (spectrogramAxisCtx && instantaneousWaveformAxisCtx && scrollingWaveformAxisCtx) {
            console.log('Applying theme and redrawing axes.')
            resizeCanvases(canvasRefs, uiControls); 
        } else {
            console.log('Applying theme, but axes contexts not ready for immediate redraw.');
        }
    }
}

function initializeTheme(canvasRefs, uiControls) {
    const savedTheme = localStorage.getItem('visualizerTheme') || 'light'; // Default to light
    applyTheme(savedTheme, canvasRefs, uiControls);
    const themeToggleButton = document.getElementById('theme-toggle-checkbox');
    if (themeToggleButton) {
         themeToggleButton.checked = (savedTheme === 'midnight-blue');
    }
}

function setupThemeToggle(canvasRefs, uiControls) {
    const themeToggleButton = document.getElementById('theme-toggle-checkbox'); // ✨ MOVED HERE ✨
    console.log('Attempting to setup theme toggle. Button found:', themeToggleButton);

    if (themeToggleButton) {
        console.log('Attaching theme toggle listener.'); // ✨ ADDED LOG ✨
        themeToggleButton.addEventListener('change', () => {
            console.log('Theme checkbox changed!'); // ✨ ADDED LOG ✨
            const selectedTheme = themeToggleButton.checked ? 'midnight-blue' : 'light';
            applyTheme(selectedTheme, canvasRefs, uiControls);
            localStorage.setItem('visualizerTheme', selectedTheme);
            console.log("Theme set to:", selectedTheme);
        });
    }
}

// Attaches event listeners to UI elements
function setupEventListeners(controls) {
    const {
        playPauseGeneratedButton, playPauseFileButton, audioFileInput,
        waveformTypeSelect, frequencySlider, frequencyLogSlider, amplitudeSlider,
        noiseLevelSlider, noiseTypeSelect, windowSizeSelect, scrollSpeedSlider,
        scrollSpeedWaveformSlider, colorSchemeSelect, waveformZoomSlider,
        waveformScaleSlider, waveformWindowSizeSelect, linkFftSizeCheckbox,
        scrollingDownsampleSlider, scrollingScaleSlider, spectrogramScaleSelect,
        playbackRateSlider, fileReader, linkToWaveformCheckbox,
        scrollSpeedValue, scrollSpeedWaveformValueSpan,
        waveformZoomValueSpan, waveformScaleValueSpan,
        scrollingDownsampleValueSpan, scrollingScaleValueSpan
    } = controls;

    // Get the restart button
    const restartFileButton = document.getElementById('restart-file-button');

    // playPauseGeneratedButton.addEventListener('click', toggleGeneratedAudio);
    playPauseGeneratedButton.addEventListener('click', () => toggleGeneratedAudio(controls)); // ✨ Pass controls ✨
    // playPauseFileButton.addEventListener('click', toggleFileAudio);
    playPauseFileButton.addEventListener('click', () => toggleFileAudio(controls)); // ✨ Pass controls ✨
    
    // Add event listener for the restart button
    if (restartFileButton) {
        restartFileButton.addEventListener('click', () => restartAudioFile(controls));
    }

    // audioFileInput.addEventListener('change', handleFileSelect);
    // Restore simple file input listener
    audioFileInput.addEventListener('change', (event) => {
        // Get the selected file
        const file = event.target.files[0];
        
        // --- NEW: Handle cancellation ---
        if (!file) { // Exit if no file selected (e.g., user cancelled)
             const infoDisplay = document.getElementById('file-info-display');
             if (infoDisplay) {
                 infoDisplay.innerHTML = '<p>File: --</p><p>Duration: --</p>';
             }
             // --- NEW: Disable playback slider on cancel ---
             const playbackRateSlider = document.getElementById('playback-rate');
             if (playbackRateSlider) {
                 playbackRateSlider.disabled = true;
             }
             // ---------------------------------------------
             // Optionally update button state if needed (though likely already disabled)
             // updateButtonState(playPauseFileButton, false, true);
             return; 
        }

        // Get references to the other UI elements
        const selectedFileNameSpan = document.getElementById('selected-file-name'); // This span might not exist anymore
        const preloadedSelect = document.getElementById('preloaded-audio-select');
        const chooseFileButton = document.getElementById('choose-local-file-button'); // Get the button

        // Update the display span with the local filename (REMOVE IF SPAN IS GONE)
        if (selectedFileNameSpan) {
             selectedFileNameSpan.textContent = file.name;
        }
        
        // Reset the preloaded dropdown
        if (preloadedSelect) {
            preloadedSelect.selectedIndex = 0; // Reset to "-- Select a file --"
        }

        // Change button text back to "Load File"
        if (chooseFileButton) {
            chooseFileButton.textContent = 'Load File';
        }
        
        // Call the original handler to process the file data
        handleFileSelect(event); 
        
        // Remove empty style, but NOT breathing (handled on play)
        // audioFileInput.classList.remove('breathing');
        audioFileInput.classList.remove('empty-file');
    });
    waveformTypeSelect.addEventListener('change', updateOscillatorType);
    frequencySlider.addEventListener('input', () => updateFrequency(controls));
    frequencyLogSlider.addEventListener('input', () => updateFrequencyLog(controls));
    amplitudeSlider.addEventListener('input', () => updateAmplitude(controls));
    noiseLevelSlider.addEventListener('input', () => updateNoiseLevel(controls));
    noiseTypeSelect.addEventListener('change', updateNoiseType);
    windowSizeSelect.addEventListener('change', updateAnalyserSettings);
    
    // --- Synchronize Scroll Speed Sliders ---
    scrollSpeedSlider.addEventListener('input', (event) => {
        const value = parseFloat(event.target.value);
        scrollSpeedValue.textContent = value.toFixed(1);
        scrollSpeedWaveformSlider.value = value;
        scrollSpeedWaveformValueSpan.textContent = value.toFixed(1);
    });
    scrollSpeedWaveformSlider.addEventListener('input', (event) => {
        const value = parseFloat(event.target.value);
        scrollSpeedWaveformValueSpan.textContent = value.toFixed(1);
        scrollSpeedSlider.value = value;
        scrollSpeedValue.textContent = value.toFixed(1);
    });

    colorSchemeSelect.addEventListener('change', updateColorScheme);
    waveformZoomSlider.addEventListener('input', (event) => {
        waveformZoomValueSpan.textContent = `${event.target.value}x`;
        // Redraw static waveform on zoom change
        redrawStaticInstantaneousWaveform(controls); 
    });
    waveformScaleSlider.addEventListener('input', (event) => {
        waveformScaleValueSpan.textContent = parseFloat(event.target.value).toFixed(1);
        // Update axis AND redraw static waveform on scale change
        drawInstantaneousWaveformAxis(controls); 
        redrawStaticInstantaneousWaveform(controls);
    });
    waveformWindowSizeSelect.addEventListener('change', () => updateWaveformAnalyserSettings(controls)); // Pass controls
    linkFftSizeCheckbox.addEventListener('change', () => handleLinkFftCheckboxChange(controls)); // Pass controls

    // Scrolling Waveform Controls
    scrollSpeedWaveformSlider.addEventListener('input', (event) => {
        scrollSpeedWaveformValueSpan.textContent = parseFloat(event.target.value).toFixed(1);
    });
    scrollingDownsampleSlider.addEventListener('input', (event) => {
         scrollingDownsampleValueSpan.textContent = event.target.value;
         // Redraw static waveform if paused
         if (!isGeneratedPlaying && !isFilePlaying && !isPreviewing) {
             // Redraw static waveform if paused - Note: Downsample changes won't reflect until unpaused
             // as we are redrawing the last *captured* image.
             redrawStaticScrollingWaveformFromImage(controls);
         }
     });
    scrollingScaleSlider.addEventListener('input', (event) => {
         scrollingScaleValueSpan.textContent = parseFloat(event.target.value).toFixed(1);
         // Pass controls object to axis drawing function
         drawScrollingWaveformAxis(controls); 
         // Redraw static waveform from captured image if paused
         if (!isGeneratedPlaying && !isFilePlaying && !isPreviewing) {
             redrawStaticScrollingWaveformFromImage(controls);
         }
    });

    // Spectrogram Controls
    spectrogramScaleSelect.addEventListener('change', () => {
         console.log("Spectrogram scale changed to:", spectrogramScaleSelect.value);
         if (spectrogramCtx) spectrogramCtx.clearRect(0, 0, spectrogramCanvas.width, spectrogramCanvas.height);
         if (spectrogramAxisCtx) drawSpectrogramAxis();
    });
    playbackRateSlider.addEventListener('input', () => updatePlaybackRate(controls));
    fileReader.onload = handleFileLoad;
    fileReader.onerror = handleFileError;
    document.addEventListener('keydown', handleSpacebar);

    // Add listeners for slider preview
    const generatorSliders = [
        frequencySlider, 
        frequencyLogSlider, 
        amplitudeSlider, 
        noiseLevelSlider
    ];
    generatorSliders.forEach(slider => {
        slider.addEventListener("mousedown", handleGeneratorSliderInteractionStart);
        slider.addEventListener("touchstart", handleGeneratorSliderInteractionStart, { passive: true });
    });

    // document.addEventListener("mouseup", handleGeneratorSliderInteractionEnd);
    // document.addEventListener("touchend", handleGeneratorSliderInteractionEnd);
    // ✨ Need to pass controls to preview end handler too ✨
    document.addEventListener("mouseup", (event) => handleGeneratorSliderInteractionEnd(event, controls));
    document.addEventListener("touchend", (event) => handleGeneratorSliderInteractionEnd(event, controls));

    // Pass controls object to the handler
    linkToWaveformCheckbox.addEventListener('change', () => handleLinkToWaveformCheckboxChange(controls));
}

// Sets the initial text display for sliders based on their default values
function initializeUIValues(controls) {
    const {
        frequencySlider, frequencyValue, frequencyLogSlider, frequencyLogValue,
        amplitudeSlider, amplitudeValue, noiseLevelSlider, noiseLevelValue,
        scrollSpeedSlider, scrollSpeedValue, scrollSpeedWaveformSlider, scrollSpeedWaveformValueSpan,
        waveformZoomSlider, waveformZoomValueSpan,
        waveformScaleSlider, waveformScaleValueSpan,
        scrollingDownsampleSlider, scrollingDownsampleValueSpan,
        scrollingScaleSlider, scrollingScaleValueSpan,
        playbackRateSlider, playbackRateValue
    } = controls;

    frequencySlider.value = 220;
    frequencyValue.textContent = '220Hz';
    amplitudeValue.textContent = parseFloat(amplitudeSlider.value).toFixed(2);
    noiseLevelValue.textContent = parseFloat(noiseLevelSlider.value).toFixed(2);
    scrollSpeedValue.textContent = scrollSpeedSlider.value;
    scrollSpeedWaveformValueSpan.textContent = scrollSpeedWaveformSlider.value;
    waveformZoomValueSpan.textContent = waveformZoomSlider.value + 'x';
    waveformScaleValueSpan.textContent = parseFloat(waveformScaleSlider.value).toFixed(1);
    scrollingDownsampleValueSpan.textContent = scrollingDownsampleSlider.value;
    scrollingScaleValueSpan.textContent = parseFloat(scrollingScaleSlider.value).toFixed(1);
    const minLog = Math.log(20); const maxLog = Math.log(20000);
    const logPosition = ((Math.log(220) - minLog) / (maxLog - minLog)) * 100;
    frequencyLogSlider.value = logPosition;
    frequencyLogValue.textContent = '220Hz';
    
    // Set playback rate slider default value and text explicitly
    playbackRateSlider.value = 62; // Closest integer value to 1.0x speed
    playbackRateValue.textContent = '1.00x'; // Display exactly 1.00x
}

// Checks browser support for common audio formats
function detectAudioFormatSupport(spanElement) {
    const audio = document.createElement('audio');
    const formats = { MP3: 'audio/mpeg', WAV: 'audio/wav', OGG: 'audio/ogg; codecs="vorbis"', AAC: 'audio/mp4; codecs="mp4a.40.2"', FLAC: 'audio/flac' };
    const supported = Object.entries(formats)
        .filter(([_, mime]) => audio.canPlayType(mime) !== '')
        .map(([format, _]) => format);
    spanElement.textContent = supported.length ? supported.join(', ') : 'None detected';
}

// --- Update Handlers for Controls ---
function updateFrequency(controls) {
    const slider = controls.frequencySlider; 
    const linearFreq = parseInt(slider.value);
    controls.frequencyValue.textContent = linearFreq + 'Hz';
    const minLog = Math.log(20); const maxLog = Math.log(20000);
    const logPosition = ((Math.log(Math.max(20, linearFreq)) - minLog) / (maxLog - minLog)) * 100;
    controls.frequencyLogSlider.value = logPosition; 
    controls.frequencyLogValue.textContent = linearFreq + 'Hz';
    if (oscillator && audioContext) { oscillator.frequency.linearRampToValueAtTime(linearFreq, audioContext.currentTime + 0.02); }
}
function updateFrequencyLog(controls) {
     const slider = controls.frequencyLogSlider; 
     const minLog = Math.log(20); const maxLog = Math.log(20000);
     const logPosition = parseFloat(slider.value) / 100; 
     const logFreq = Math.exp(minLog + logPosition * (maxLog - minLog)); 
     const roundedFreq = Math.max(20, Math.round(logFreq));
     controls.frequencyLogValue.textContent = roundedFreq + 'Hz'; 
     controls.frequencyValue.textContent = roundedFreq + 'Hz'; 
     controls.frequencySlider.value = roundedFreq;
     if (oscillator && audioContext) { oscillator.frequency.linearRampToValueAtTime(roundedFreq, audioContext.currentTime + 0.02); }
 }
function updateAmplitude(controls) {
     const slider = controls.amplitudeSlider; 
     const ampValue = parseFloat(slider.value);
     controls.amplitudeValue.textContent = ampValue.toFixed(2);
     if (oscillatorGain && audioContext) { oscillatorGain.gain.linearRampToValueAtTime(ampValue, audioContext.currentTime + 0.02); }
 }
function updateOscillatorType(event) { if (oscillator) { oscillator.type = event.target.value; } }
function updateNoiseLevel(controls) {
     const slider = controls.noiseLevelSlider; 
     const noiseValue = parseFloat(slider.value);
     controls.noiseLevelValue.textContent = noiseValue.toFixed(2);
     if (noiseGain && audioContext) { noiseGain.gain.linearRampToValueAtTime(noiseValue, audioContext.currentTime + 0.01); }
     if (isGeneratedPlaying || isPreviewing) { 
         if (noiseValue > 0 && !noiseSource) { createNoiseSource(true); }
         else if (noiseValue <= 0 && noiseSource) { stopNoiseSource(); } 
     }
 }
function updateNoiseType() { 
     if (noiseSource && (isGeneratedPlaying || isPreviewing) && parseFloat(noiseLevelSlider.value) > 0) { 
         createNoiseSource(true);
     } 
 }
function updateAnalyserSettings() { 
    if (analyser) { 
        try { 
            analyser.fftSize = parseInt(windowSizeSelect.value); 
            console.log("Analyser FFT size:", analyser.fftSize); 
            spectrogramCtx.clearRect(0, 0, spectrogramCanvas.width, spectrogramCanvas.height); 
        } catch (e) { 
            console.error("FFT size error:", e); 
        } 
    }

    // Add sync logic: if linked, update the waveform dropdown and its analyser
    if (linkFftSizeCheckbox.checked && windowSizeSelect.value !== waveformWindowSizeSelect.value) {
        const spectrogramFftValue = windowSizeSelect.value;
        console.log("Syncing waveform window size to spectrogram FFT size due to link.");
        waveformWindowSizeSelect.value = spectrogramFftValue;
        // Only call the other update function if the value actually changed
        // and the other analyser isn't already set to this value.
        if (waveformAnalyser && waveformAnalyser.fftSize !== parseInt(spectrogramFftValue)) {
            updateWaveformAnalyserSettings(); 
        }
    }
}

const maxLogPlaybackRate = 2;  // log2(4.0)
const minLogPlaybackRate = -3.321928; // NEW: log2(0.1)

// Helper function to convert linear slider value (0-100) to logarithmic playback rate (0.1 - 4.0)
function sliderValueToPlaybackRate(sliderValue) {
    const normalized = sliderValue / 100; // Normalize to 0-1
    const logRate = minLogPlaybackRate + normalized * (maxLogPlaybackRate - minLogPlaybackRate);
    return Math.pow(2, logRate);
}

function updatePlaybackRate(controls) {
    const slider = controls.playbackRateSlider;
    const linearValue = parseFloat(slider.value);
    const rate = sliderValueToPlaybackRate(linearValue);
    controls.playbackRateValue.textContent = rate.toFixed(2) + 'x';
    if (audioSource && audioContext) {
        audioSource.playbackRate.linearRampToValueAtTime(rate, audioContext.currentTime + 0.05);
    }
}

// Spacebar handler
function handleSpacebar(event) {
     // Ignore spacebar if pressed within an input field or select
     if (event.target.tagName === 'INPUT' || event.target.tagName === 'SELECT') {
         return;
     }

    if (event.key === ' ' || event.code === 'Space') { 
        event.preventDefault(); 
        console.log("Spacebar pressed. Before - File:", isFilePlaying, "Gen:", isGeneratedPlaying, "Last:", lastUserInitiatedSource);

        let isCurrentlyPlayingAnything = isFilePlaying || isGeneratedPlaying;

        // If something is playing, pause it/them and remember the state
        if (isCurrentlyPlayingAnything) {
            // Remember what was playing *before* pausing
            wasFilePlayingBeforeSpacePause = isFilePlaying;
            wasGeneratedPlayingBeforeSpacePause = isGeneratedPlaying;
            
            console.log("Remembering state:", wasFilePlayingBeforeSpacePause, wasGeneratedPlayingBeforeSpacePause);

            // Pause whatever is currently playing
            if (isFilePlaying) {
                console.log("Pausing File Audio via spacebar");
                toggleFileAudio(); // Pause file
            }
            if (isGeneratedPlaying) {
                 console.log("Pausing Generated Audio via spacebar");
                toggleGeneratedAudio(); // Pause generated
            }
        }
        // If nothing is currently playing, resume based on remembered state or last user action
        else {
            console.log("Attempting resume. State before pause was - File:", wasFilePlayingBeforeSpacePause, "Gen:", wasGeneratedPlayingBeforeSpacePause);
            let resumedSomething = false;
            
            // Try resuming based on what was playing before the last spacebar pause
            if (wasFilePlayingBeforeSpacePause && audioBuffer) {
                 console.log("Resuming File Audio via spacebar");
                toggleFileAudio(); // Resume file
                resumedSomething = true;
            }
            if (wasGeneratedPlayingBeforeSpacePause) {
                console.log("Resuming Generated Audio via spacebar");
                toggleGeneratedAudio(); // Resume generated
                resumedSomething = true;
            }

            // If nothing was resumed based on prior state, fall back to last user initiated source
            if (!resumedSomething) {
                 console.log("Nothing to resume based on prior state, falling back to lastUserInitiatedSource:", lastUserInitiatedSource);
                if (lastUserInitiatedSource === 'file' && audioBuffer) {
                    toggleFileAudio(); // Start file
                } else if (lastUserInitiatedSource === 'generated') {
                    toggleGeneratedAudio(); // Start generated
                }
            }
            
            // Reset the flags after attempting resume, so next spacebar press while paused doesn't reuse old state
            wasFilePlayingBeforeSpacePause = false;
            wasGeneratedPlayingBeforeSpacePause = false;
        }
         console.log("Spacebar action complete. After - File:", isFilePlaying, "Gen:", isGeneratedPlaying);
    }
}

// Update waveform analyser settings
function updateWaveformAnalyserSettings(controls) {
    if (waveformAnalyser) {
        try {
            waveformAnalyser.fftSize = parseInt(controls.waveformWindowSizeSelect.value);
            console.log("Waveform Analyser FFT size set to:", waveformAnalyser.fftSize);
            // No need to clear canvases here, the drawing loops handle that
        } catch (e) {
            console.error("Error setting Waveform FFT size:", e);
        }
    }

    // Add sync logic: if linked, update the spectrogram dropdown and its analyser
    if (controls.linkFftSizeCheckbox.checked && controls.waveformWindowSizeSelect.value !== controls.windowSizeSelect.value) {
        const waveformWindowValue = controls.waveformWindowSizeSelect.value;
        console.log("Syncing spectrogram FFT size to waveform window size due to link.");
        controls.windowSizeSelect.value = waveformWindowValue;
        // Only call the other update function if the value actually changed
        // and the other analyser isn't already set to this value.
        if (analyser && analyser.fftSize !== parseInt(waveformWindowValue)) {
             updateAnalyserSettings(); 
        }
    }
}

// Function to handle the FIRST checkbox change
function handleLinkFftCheckboxChange(controls) {
    const isChecked = controls.linkFftSizeCheckbox.checked;
    // Sync the other checkbox
    if (controls.linkToWaveformCheckbox.checked !== isChecked) {
        controls.linkToWaveformCheckbox.checked = isChecked;
    }
    
    // Sync dropdowns if checked
    if (isChecked) {
        if (controls.waveformWindowSizeSelect.value !== controls.windowSizeSelect.value) {
            controls.waveformWindowSizeSelect.value = controls.windowSizeSelect.value;
            updateWaveformAnalyserSettings(controls); // Update the analyser if the value changed
        }
    }
}

// Function to handle the SECOND checkbox change
function handleLinkToWaveformCheckboxChange(controls) {
    const isChecked = controls.linkToWaveformCheckbox.checked;
    // Sync the other checkbox
    if (controls.linkFftSizeCheckbox.checked !== isChecked) {
        controls.linkFftSizeCheckbox.checked = isChecked;
    }

    // Sync dropdowns if checked (using the state of the FIRST checkbox for consistency in other functions)
    if (controls.linkFftSizeCheckbox.checked) { // Check the first box's state after syncing
         if (controls.windowSizeSelect.value !== controls.waveformWindowSizeSelect.value) {
             controls.windowSizeSelect.value = controls.waveformWindowSizeSelect.value;
             updateAnalyserSettings(); // Update the analyser if the value changed
         }
    }
}

// --- Slider Preview Handlers ---
function handleGeneratorSliderInteractionStart(event) {
    if (isGeneratedPlaying) return; // Do nothing if already playing
    
    // Ensure AudioContext is initialized for preview
    if (!initializeAudioContext()) {
        console.warn("AudioContext could not be initialized for preview.");
        return;
    }

    // Determine slider type and start preview
    const sliderId = event.target.id;
    let previewStarted = false;
    if (sliderId === "frequency" || sliderId === "frequency-log" || sliderId === "amplitude") {
        startPreviewOscillator();
        previewStarted = isPreviewing; // Check if preview actually started
    } else if (sliderId === "noise-level") {
        startPreviewNoise();
        previewStarted = isPreviewing; // Check if preview actually started
    }

    // Visually toggle button to Pause if preview started
    if (previewStarted) {
        updateButtonState(playPauseGeneratedButton, true);

        // --- NEW: Stop breathing animation on first slider interaction --- 
        if (isFirstPlay) {
            console.log("First generator slider interaction detected, stopping breathing animations.");
            const chooseFileButton = document.getElementById('choose-local-file-button');
            const preloadedSelect = document.getElementById('preloaded-audio-select');
            if (chooseFileButton) chooseFileButton.classList.remove('breathing');
            if (preloadedSelect) preloadedSelect.classList.remove('breathing');
            isFirstPlay = false; // Set the flag to prevent this from running again
        }
        // --- END: Stop breathing ---
    }
}

function handleGeneratorSliderInteractionEnd(event, controls) { // ✨ Accept controls ✨
    if (isPreviewing) {
        stopPreviewAudio(controls); // ✨ Pass controls ✨
        // Visually toggle button back to Play only if NOT actually playing
        if (!isGeneratedPlaying && controls && controls.playPauseGeneratedButton) { // Check controls exist
             updateButtonState(controls.playPauseGeneratedButton, false);
        }
    }
}

function updateColorScheme() { 
    console.log("Color scheme:", colorSchemeSelect.value); 
    spectrogramCtx.clearRect(0, 0, spectrogramCanvas.width, spectrogramCanvas.height); 
} 

const loopButton = document.getElementById('loop-button');
const volumeSlider = document.getElementById('volume-slider');
const volumeValue = document.getElementById('volume-value');

// Loading Overlay Elements
const loadingOverlay = document.getElementById('loading-overlay');
const loadingText = document.getElementById('loading-text');
const progressBarFill = document.getElementById('progress-bar-fill');
const loadingProgressText = document.getElementById('loading-progress-text');

// --- Canvas Elements (Additions for specific visualizers might go elsewhere) ---
const waveformCanvas = document.getElementById('waveform-canvas');

// --- Loading Overlay Functions ---
export function showLoadingOverlay(filename) { // <-- Add export
    console.log("Showing loading overlay for:", filename); 
    if (!loadingOverlay || !loadingText || !progressBarFill || !loadingProgressText) {
        console.error("Loading overlay elements not found!");
        return;
    }
    loadingText.textContent = `Downloading ${filename}...`;
    progressBarFill.style.width = '0%';
    loadingProgressText.textContent = ''; 
    loadingOverlay.style.display = 'flex';
}

export function updateLoadingProgress(loadedBytes, totalBytes) { // <-- Add export
    if (!progressBarFill || !loadingProgressText) return;

    if (totalBytes > 0) {
        const percentComplete = Math.round((loadedBytes / totalBytes) * 100);
        progressBarFill.style.width = `${percentComplete}%`;
        
        const loadedMB = (loadedBytes / (1024 * 1024)).toFixed(2);
        const totalMB = (totalBytes / (1024 * 1024)).toFixed(2);
        loadingProgressText.textContent = `${loadedMB} MB / ${totalMB} MB`;
    } else {
        // Handle cases where total size is unknown (optional)
        progressBarFill.style.width = '100%'; // Or show indeterminate state
        loadingProgressText.textContent = 'Downloading...';
    }
}

export function hideLoadingOverlay() { // <-- Add export
    console.log("Hiding loading overlay");
    if (!loadingOverlay) return;
    loadingOverlay.style.display = 'none';
}

// --- Initialization and Event Listeners ---
export function setupUIEventListeners(audioContext, analyser, visualizer) {
    // ... existing code ...
}