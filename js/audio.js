import { 
    windowSizeSelect, waveformWindowSizeSelect, 
    fileInfoDisplay, playPauseFileButton, playbackRateSlider,
    amplitudeSlider,
    waveformTypeSelect,
    frequencySlider,
    noiseLevelSlider,
    noiseTypeSelect,
    audioFileInput
} from './config.js';
import { updateButtonState, sliderValueToPlaybackRate } from './ui.js';
import { startVisualization, checkAndStopVisualization } from './visualizer.js';

// --- Global Audio Variables ---
export let audioContext = null;
let masterGainNode = null;
export let analyser = null;         // For Spectrogram
export let waveformAnalyser = null; // For Instantaneous Waveform
export let scrollingAnalyser = null; // For Scrolling Waveform
export let oscillator = null;
export let oscillatorGain = null;
export let noiseSource = null;
export let noiseGain = null;
export let audioBuffer = null;
export let audioSource = null;
export let fileReader = new FileReader();

// Add state for pause/resume
let fileStartTime = 0; // Tracks hypothetical start time in AudioContext time
let filePauseTime = 0; // Tracks pause time in AudioContext time

// State flags
export let isGeneratedPlaying = false;
export let isFilePlaying = false;
export let isPreviewing = false; // Flag for slider preview
export let isFirstPlay = true; // <-- Add export

// Track last user-initiated play action
export let lastUserInitiatedSource = null; // <-- Add export

// Remember state before spacebar pause
export let wasFilePlayingBeforeSpacePause = false; // <-- Add export
export let wasGeneratedPlayingBeforeSpacePause = false; // <-- Add export

// Add gain node for file source
let fileGainNode = null;

// Function to update the isFirstPlay flag
export function setFirstPlayDone() {
    isFirstPlay = false;
}

// --- Audio Context Management ---
export function initializeAudioContext() {
    if (audioContext && audioContext.state === 'running') return audioContext; // Return existing context
    if (!audioContext) {
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            masterGainNode = audioContext.createGain();
            
            // Create file gain node if needed and connect
            if (!fileGainNode) { 
                fileGainNode = audioContext.createGain();
                fileGainNode.connect(masterGainNode);
                // console.log("FileGainNode created and connected to MasterGainNode.");
            }

            // --- Create and configure Limiter ---
            const limiter = audioContext.createDynamicsCompressor();
            limiter.threshold.setValueAtTime(-2.0, audioContext.currentTime); // Limit peaks above -2dBFS
            limiter.knee.setValueAtTime(0, audioContext.currentTime);      // Hard knee
            limiter.ratio.setValueAtTime(20.0, audioContext.currentTime);   // 20:1 ratio (strong limiting)
            limiter.attack.setValueAtTime(0.003, audioContext.currentTime); // Fast attack (3ms)
            limiter.release.setValueAtTime(0.100, audioContext.currentTime); // Slower release (100ms) to reduce pumping
            console.log("Limiter node created and configured.");
            // ----------------------------------

            // Spectrogram Analyser (controlled by dropdown)
            analyser = audioContext.createAnalyser();
            analyser.fftSize = parseInt(windowSizeSelect.value);
            console.log(`Audio Init: Spectrogram analyser created. Initial FFT: ${analyser.fftSize}`);
            // masterGainNode.connect(analyser);
            // analyser.connect(audioContext.destination); // Will be reconnected after limiter

            // Waveform Analyser (independent, with its own controls)
            waveformAnalyser = audioContext.createAnalyser();
            waveformAnalyser.smoothingTimeConstant = analyser.smoothingTimeConstant;
            waveformAnalyser.minDecibels = analyser.minDecibels;
            waveformAnalyser.maxDecibels = analyser.maxDecibels;
            waveformAnalyser.fftSize = parseInt(waveformWindowSizeSelect.value);
            console.log(`Audio Init: Waveform analyser created. Initial FFT: ${waveformAnalyser.fftSize}`);
            // masterGainNode.connect(waveformAnalyser); // Will be reconnected after limiter

            // Scrolling Waveform Analyser (independent, fixed FFT)
            scrollingAnalyser = audioContext.createAnalyser();
            scrollingAnalyser.smoothingTimeConstant = analyser.smoothingTimeConstant;
            scrollingAnalyser.minDecibels = analyser.minDecibels;
            scrollingAnalyser.maxDecibels = analyser.maxDecibels;
            scrollingAnalyser.fftSize = 4096; // Fixed FFT size for consistent scrolling data
            // masterGainNode.connect(scrollingAnalyser); // Will be reconnected after limiter

            // --- Modify Connections ---
            // Disconnect masterGain from any previous destinations (it may not have any yet, but safe)
            masterGainNode.disconnect(); 

            // Connect masterGain -> limiter
            masterGainNode.connect(limiter);

            // Connect limiter -> analysers (in parallel) AND destination
            limiter.connect(analyser);
            limiter.connect(waveformAnalyser);
            limiter.connect(scrollingAnalyser);
            limiter.connect(audioContext.destination);
            console.log("Audio graph reconnected: masterGain -> limiter -> (analysers & destination)");
            // --- End Modify Connections ---

            console.log("AudioContext initialized. Sample Rate:", audioContext.sampleRate);
            return audioContext; // Return newly created context
        } catch (e) {
            console.error("Error creating AudioContext:", e);
            alert("Web Audio API is not supported by this browser.");
            return null; // Return null on error
        }
    }
    else if (audioContext.state === 'suspended') {
        audioContext.resume().then(() => console.log("AudioContext resumed."))
            .catch(err => console.error("Error resuming AudioContext:", err));
        return audioContext; // Return existing context after attempting resume
    }
    return null; // Should not be reached, but return null as fallback
}

// ✨ NEW: Simple helper to manage body class based on global audio state ✨
export function updateAudioActivityBodyClass() {
    const isAudioActive = isGeneratedPlaying || isFilePlaying || isPreviewing;
    if (isAudioActive) {
        document.body.classList.add('audio-active');
    } else {
        document.body.classList.remove('audio-active');
    }
    // console.log('Audio activity body class updated. Active:', isAudioActive);
}

// --- Toggle Functions for Combined Buttons ---
export function toggleGeneratedAudio(controls) {
    if (!initializeAudioContext()) return;

    lastUserInitiatedSource = 'generated'; // Track user intent

    if (isGeneratedPlaying) {
        stopGeneratedAudio();
    } else {
        startGeneratedAudio();
    }
    
    // First play check: Remove breathing from inputs AND generated play button
    if (isFirstPlay) {
        const localFileButton = document.getElementById('choose-local-file-button');
        const preloadedSelect = document.getElementById('preloaded-audio-select');
        const generatedButton = document.getElementById('play-pause-generated-button'); // Get generated button
        if (localFileButton) localFileButton.classList.remove('breathing');
        if (preloadedSelect) preloadedSelect.classList.remove('breathing');
        if (generatedButton) generatedButton.classList.remove('breathing'); // Remove from generated button too
        isFirstPlay = false;
        console.log("First play detected. Removing breathing animation from file inputs and generated play button.");
    }

    updateButtonState(controls.playPauseGeneratedButton, isGeneratedPlaying);
    if (controls.playPauseGeneratedButton) {
        controls.playPauseGeneratedButton.classList.remove('breathing');
    }
    updateAudioActivityBodyClass();
}
export function toggleFileAudio(controls) {
    if (!initializeAudioContext() || !audioBuffer) return;

    lastUserInitiatedSource = 'file'; // Track user intent

    if (isFilePlaying) {
        stopAudioFile();
    } else {
        playAudioFile();
    }

    // First play check: Remove breathing from inputs AND generated play button
    if (isFirstPlay) {
        const localFileButton = document.getElementById('choose-local-file-button');
        const preloadedSelect = document.getElementById('preloaded-audio-select');
        const generatedButton = document.getElementById('play-pause-generated-button'); // Get generated button
        if (localFileButton) localFileButton.classList.remove('breathing');
        if (preloadedSelect) preloadedSelect.classList.remove('breathing');
        if (generatedButton) generatedButton.classList.remove('breathing'); // Remove from generated button too
        isFirstPlay = false;
        console.log("First play detected. Removing breathing animation from file inputs and generated play button.");
    }
    
    // Stop breathing animation on the file play button itself when clicked (if it was still breathing)
    playPauseFileButton.classList.remove('breathing'); 

    updateButtonState(playPauseFileButton, isFilePlaying, !audioBuffer);
    updateAudioActivityBodyClass();
}

// --- Generated Audio Control ---
export function startGeneratedAudio() {
    if (!audioContext || isGeneratedPlaying) return;
    console.log("Starting generated audio with fade-in...");
    const targetAmplitude = parseFloat(amplitudeSlider.value);
    const targetNoiseLevel = parseFloat(noiseLevelSlider.value);
    const fadeTime = 0.015; // 15ms fade
    const now = audioContext.currentTime;

    // Oscillator
    if (!oscillatorGain) { oscillatorGain = audioContext.createGain(); oscillatorGain.connect(masterGainNode); }
    oscillatorGain.gain.setValueAtTime(0, now); // Start at 0 gain
    oscillatorGain.gain.linearRampToValueAtTime(targetAmplitude, now + fadeTime); // Ramp up
    oscillator = audioContext.createOscillator();
    oscillator.type = waveformTypeSelect.value;
    oscillator.frequency.setValueAtTime(parseFloat(frequencySlider.value), now);
    oscillator.connect(oscillatorGain);
    oscillator.start(now);

    // Noise
    if (!noiseGain) { noiseGain = audioContext.createGain(); noiseGain.connect(masterGainNode); }
    if (targetNoiseLevel > 0) {
        noiseGain.gain.setValueAtTime(0, now); // Start at 0 gain
        noiseGain.gain.linearRampToValueAtTime(targetNoiseLevel, now + fadeTime); // Ramp up
        createNoiseSource(true); // Pass flag to prevent redundant fade-in
    } else {
         noiseGain.gain.setValueAtTime(0, now); // Ensure gain is 0 if noise level starts at 0
    }

    isGeneratedPlaying = true;
    startVisualization();
    updateAudioActivityBodyClass(); // ✨ ADDED ✨
}
export function stopGeneratedAudio() {
    if (!isGeneratedPlaying) return;
    console.log("Stopping generated audio with fade-out...");
    const fadeTime = 0.015; // 15ms fade
    const now = audioContext.currentTime;
    const stopDelay = fadeTime * 1000 + 5; // Delay in ms slightly longer than fade

    // Ramp down gains for BOTH oscillator and noise
    if (oscillatorGain) {
        oscillatorGain.gain.cancelScheduledValues(now);
        oscillatorGain.gain.setValueAtTime(oscillatorGain.gain.value, now); 
        oscillatorGain.gain.linearRampToValueAtTime(0.0001, now + fadeTime); 
    }
    if (noiseGain) {
        noiseGain.gain.cancelScheduledValues(now);
        noiseGain.gain.setValueAtTime(noiseGain.gain.value, now); 
        noiseGain.gain.linearRampToValueAtTime(0.0001, now + fadeTime); 
    }

    // Use setTimeout to stop sources *after* the fade
    const currentOscillator = oscillator;
    const currentNoiseSource = noiseSource;
    setTimeout(() => {
        if (currentOscillator) { 
            try { currentOscillator.stop(); currentOscillator.disconnect(); } catch(e){} 
            console.log("Oscillator stopped after fade.");
        }
         // We check isGeneratedPlaying again inside timeout, in case user restarted quickly
        if (!isGeneratedPlaying && currentNoiseSource) { 
            try { currentNoiseSource.stop(); currentNoiseSource.disconnect(); } catch(e){} 
            console.log("Noise source stopped after fade.");
        }
        // Ensure noiseSource is cleared if we stopped it here
        if (currentNoiseSource === noiseSource && !isGeneratedPlaying) {
            noiseSource = null;
        }
        checkAndStopVisualization(); // Check if visuals should stop now
        updateAudioActivityBodyClass(); // ✨ ADDED ✨
    }, stopDelay);
    
    isGeneratedPlaying = false; 
    oscillator = null; // Clear reference immediately
    // Don't clear noiseSource immediately, let the timeout handle it
    checkAndStopVisualization(); // Check if visuals should stop now
    updateAudioActivityBodyClass(); // ✨ ADDED ✨
}

// --- Preview Audio Functions ---
export function startPreviewOscillator() {
    if (!audioContext || isGeneratedPlaying || isPreviewing) return; // Don't start if playing or already previewing
    // console.log("Starting oscillator preview...");
    isPreviewing = true;
    const targetAmplitude = parseFloat(amplitudeSlider.value);
    const fadeTime = 0.015;
    const now = audioContext.currentTime;

    if (!oscillatorGain) { oscillatorGain = audioContext.createGain(); oscillatorGain.connect(masterGainNode); }
    oscillatorGain.gain.cancelScheduledValues(now);
    oscillatorGain.gain.setValueAtTime(0.0001, now);
    oscillatorGain.gain.linearRampToValueAtTime(targetAmplitude, now + fadeTime);
    
    // Stop existing oscillator if any (shouldn't happen if logic is right, but safe)
    if(oscillator) { try {oscillator.stop();} catch(e){}} 
    oscillator = audioContext.createOscillator();
    oscillator.type = waveformTypeSelect.value;
    oscillator.frequency.setValueAtTime(parseFloat(frequencySlider.value), now);
    oscillator.connect(oscillatorGain);
    oscillator.start(now);
    startVisualization(); // Start visuals for preview
    updateAudioActivityBodyClass(); // ✨ ADDED ✨
}

export function startPreviewNoise() {
    if (!audioContext || isGeneratedPlaying || isPreviewing) return; // Don't start if playing or already previewing
    // console.log("Starting noise preview...");
    isPreviewing = true;
    const targetNoiseLevel = parseFloat(noiseLevelSlider.value);
    const fadeTime = 0.015;
    const now = audioContext.currentTime;

    if (!noiseGain) { noiseGain = audioContext.createGain(); noiseGain.connect(masterGainNode); }
    noiseGain.gain.cancelScheduledValues(now);
    noiseGain.gain.setValueAtTime(0.0001, now);
    noiseGain.gain.linearRampToValueAtTime(targetNoiseLevel, now + fadeTime);
    
    // Reuse createNoiseSource but ensure it doesn't fade independently
    createNoiseSource(true); // Pass true flag
    startVisualization(); // Start visuals for preview
    updateAudioActivityBodyClass(); // ✨ ADDED ✨
}

export function stopPreviewAudio(controls) {
    if (!isPreviewing || isGeneratedPlaying) { 
        isPreviewing = false; 
        return; 
    }
    // console.log("Stopping preview audio...");
    const fadeTime = 0.015;
    const now = audioContext.currentTime;
    const stopDelay = fadeTime * 1000 + 5;

    // Ramp down gains for potentially active preview sources
    if (oscillatorGain && oscillator) { // Check if oscillator was part of the preview
        oscillatorGain.gain.cancelScheduledValues(now);
        oscillatorGain.gain.setValueAtTime(oscillatorGain.gain.value, now); 
        oscillatorGain.gain.linearRampToValueAtTime(0.0001, now + fadeTime); 
    }
    if (noiseGain && noiseSource) { // Check if noise was part of the preview
        noiseGain.gain.cancelScheduledValues(now);
        noiseGain.gain.setValueAtTime(noiseGain.gain.value, now); 
        noiseGain.gain.linearRampToValueAtTime(0.0001, now + fadeTime); 
    }

    const currentOscillator = oscillator;
    const currentNoiseSource = noiseSource;
    setTimeout(() => {
        // Only stop nodes if they haven't been replaced and we aren't fully playing
        if (!isGeneratedPlaying) {
            if (currentOscillator && currentOscillator === oscillator) { 
                try { currentOscillator.stop(); currentOscillator.disconnect(); } catch(e){} 
                // console.log("Preview Oscillator stopped.");
                oscillator = null;
            }
            if (currentNoiseSource && currentNoiseSource === noiseSource) { 
                try { currentNoiseSource.stop(); currentNoiseSource.disconnect(); } catch(e){} 
                // console.log("Preview Noise source stopped.");
                noiseSource = null;
            }
             // Stop visuals only if we stopped a preview and aren't playing
             if (!isGeneratedPlaying) {
                checkAndStopVisualization(); // Check if visuals should stop
             }
        }
        // Ensure noiseSource is cleared if we stopped it here
        if (currentNoiseSource === noiseSource && !isPreviewing && !isGeneratedPlaying) {
            noiseSource = null;
        }
        checkAndStopVisualization(); // Check if visuals should stop now
        updateAudioActivityBodyClass(); // ✨ ADDED ✨
    }, stopDelay);

    isPreviewing = false; // Set flag immediately
    // DO NOT stop visualization here, let it run if other sources active
    // checkAndStopVisualization(); // We'll call this from the calling context if needed
}

// --- Noise Control ---
export function createNoiseSource(calledFromStart = false) {
    if (!audioContext || !noiseGain) return;
    // Stop any existing noise source immediately (no fade needed here)
    if (noiseSource) { 
        try { noiseSource.stop(); noiseSource.disconnect(); } catch(e){} 
        noiseSource = null; 
    }
    
    const noiseType = noiseTypeSelect.value;
    const bufferSize = audioContext.sampleRate * 2; // 2 seconds buffer
    const noiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    // console.log(`Generating ${noiseType} noise buffer...`);

    // Noise generation logic (unchanged)
    if (noiseType === 'white') { for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1; }
    else if (noiseType === 'pink') { let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0; for (let i = 0; i < bufferSize; i++) { const white = Math.random() * 2 - 1; b0 = 0.99886 * b0 + white * 0.0555179; b1 = 0.99332 * b1 + white * 0.0750759; b2 = 0.96900 * b2 + white * 0.1538520; b3 = 0.86650 * b3 + white * 0.3104856; b4 = 0.55000 * b4 + white * 0.5329522; b5 = -0.7616 * b5 - white * 0.0168980; output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362; output[i] *= 0.11; b6 = white * 0.115926; } }
    else if (noiseType === 'brown') { let lastOut = 0; for (let i = 0; i < bufferSize; i++) { const white = Math.random() * 2 - 1; output[i] = (lastOut + (0.02 * white)) / 1.02; lastOut = output[i]; output[i] *= 3.5; } }
    
    noiseSource = audioContext.createBufferSource(); 
    noiseSource.buffer = noiseBuffer; 
    noiseSource.loop = true; 
    noiseSource.connect(noiseGain); 
    noiseSource.start(audioContext.currentTime);

    // Fade in the noise gain *unless* it was already faded in by startGeneratedAudio
    if (!calledFromStart) {
        const targetNoiseLevel = parseFloat(noiseLevelSlider.value);
        const fadeTime = 0.015; // 15ms fade 
        const now = audioContext.currentTime;
        // console.log("Fading in noise source independently.");
        noiseGain.gain.setValueAtTime(0, now);
        noiseGain.gain.linearRampToValueAtTime(targetNoiseLevel, now + fadeTime);
    }

    // console.log("Noise source started.");
}
export function stopNoiseSource() {
    // if (noiseSource) { try { noiseSource.stop(); noiseSource.disconnect(); } catch(e){} noiseSource = null; console.log("Noise source stopped."); } // Old immediate stop
    
    if (noiseSource) {
        const currentNoiseNode = noiseSource; // Capture reference
        const fadeTime = 0.015; // 15ms fade 
        const now = audioContext.currentTime;
        const stopDelay = fadeTime * 1000 + 5;
        // console.log("Fading out noise source independently...");

        // Ramp down gain
        if (noiseGain) {
            noiseGain.gain.setValueAtTime(noiseGain.gain.value, now);
            noiseGain.gain.linearRampToValueAtTime(0.0001, now + fadeTime);
        }
        
        // Stop source after fade
        setTimeout(() => {
            // Check if this specific node is still the active one before stopping
            if (currentNoiseNode === noiseSource) {
                try { 
                    currentNoiseNode.stop(); 
                    currentNoiseNode.disconnect(); 
                    noiseSource = null; // Clear reference only after successful stop
                    // console.log("Noise source stopped after independent fade.");
                } catch(e){ 
                    // console.error("Error stopping noise source after fade:", e);
                    // Still clear reference if stop fails but node matches
                    noiseSource = null;
                }
            } else {
                // console.log("Noise source changed before independent fade could stop it.");
            }
        }, stopDelay);
    } else {
        // Ensure gain is 0 if called when noiseSource is already null
        if (noiseGain) {
            noiseGain.gain.setValueAtTime(0, audioContext.currentTime);
        }
    }
}

// --- File Audio Control ---
export function handleFileSelect(event) {
    const file = event.target.files[0];
    // Make sure button state reflects loading (disabled)
    updateButtonState(playPauseFileButton, false, true); 
    
    if (!file) {
        // This case is now handled by the listener in ui.js which resets the display
        // fileInfoDisplay.innerHTML = `<p>File: None Loaded</p><p>Duration: --</p>`; // Redundant
        audioBuffer = null;
        fileStartTime = 0;
        filePauseTime = 0;
        // Keep input visually distinct when empty (handled by CSS/ui.js)
        // audioFileInput.classList.add("empty-file"); // Should be handled in ui.js listener
        return;
    }
    // Remove green background etc. (handled by listener in ui.js)
    // audioFileInput.classList.remove('empty-file'); 
    
    // REMOVED: Don't update display here, wait for decode success/fail
    // fileInfoDisplay.innerHTML = `<p>File: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)</p>`;
    
    // Stop any currently playing audio file immediately
    stopAudioFile(); // This also clears the buffer implicitly via stopAudioSource
    
    // Read the file
    fileReader.readAsArrayBuffer(file);
}
export function handleFileLoad(event) {
    const audioData = event.target.result;
    if (!initializeAudioContext()) { 
        updateButtonState(playPauseFileButton, false, true); 
        return; 
    }
    audioContext.decodeAudioData(audioData)
        .then(buffer => {
            audioBuffer = buffer;
            // Reset timing state for new file
            fileStartTime = 0;
            filePauseTime = 0;
            // Reset file gain to full volume in case it was faded out
            if (fileGainNode) {
                fileGainNode.gain.cancelScheduledValues(audioContext.currentTime);
                fileGainNode.gain.setValueAtTime(1.0, audioContext.currentTime);
            }
            // Remove SR from the display string
            fileInfoDisplay.innerHTML = `<p>File: ${audioFileInput.files[0].name}</p><p>Duration: ${buffer.duration.toFixed(2)}s</p>`;
            updateButtonState(playPauseFileButton, false, false);
            // console.log("Audio file decoded.");
            // Auto-play the file once it's decoded
            playAudioFile();
            // Update button state to reflect playing status
            updateButtonState(playPauseFileButton, true, false);

            // --- Enable Playback Slider --- 
            const playbackRateSlider = document.getElementById('playback-rate');
            if (playbackRateSlider) {
                playbackRateSlider.disabled = false; // Explicitly enable here
                // console.log("Playback rate slider ENABLED after local file decode.");
                // console.log("Slider disabled state AFTER explicit enable:", playbackRateSlider.disabled);
            }
            // -----------------------------
        }).catch(err => { 
            console.error('Decode error:', err); 
            audioBuffer = null; 
            updateButtonState(playPauseFileButton, false, true); 
        });
}

// NEW function to handle ArrayBuffer directly (e.g., from fetch)
export function handleAudioDataLoad(audioData, fileName) {
    if (!initializeAudioContext()) { 
        updateButtonState(playPauseFileButton, false, true); 
        return; 
    }
    
    // Stop any currently playing file before decoding new one
    stopAudioFile(); 

    audioContext.decodeAudioData(audioData)
        .then(buffer => {
            // Assign the decoded buffer
            audioBuffer = buffer;

            // --- ADDED: Reset timing state for the NEW file --- 
            fileStartTime = 0;
            filePauseTime = 0;
            // ----------------------------------------------------

            // Update file info display
            if (fileInfoDisplay) {
                // --- REMOVE LOG BEFORE UPDATING DISPLAY ---
                // console.log(`AUDIO: Decoded Buffer Info - File: ${fileName}, Duration: ${buffer.duration.toFixed(2)}, File SR: ${buffer.sampleRate}, Context SR: ${audioContext.sampleRate}`);
                // ----------------------------------------
                // Remove SR from the display string
                fileInfoDisplay.innerHTML = `<p>File: ${fileName}</p><p>Duration: ${buffer.duration.toFixed(2)}s</p>`;
            }
            updateButtonState(playPauseFileButton, false, false); // Enable play button
            // Enable the playback rate slider
            const playbackRateSlider = document.getElementById('playback-rate');
            if (playbackRateSlider) {
                playbackRateSlider.disabled = false;
            }
            // console.log(`Audio file decoded: ${fileName}`);
            
            // Auto-play the file once it's decoded
            playAudioFile();
            // Update button state to reflect playing status
            updateButtonState(playPauseFileButton, true, false);

            // --- Enable Playback Slider ---
            if (playbackRateSlider) {
                playbackRateSlider.disabled = false; // Explicitly enable here
                 // console.log(`Playback rate slider ENABLED after preloaded/data decode for: ${fileName}`);
                 // console.log("Slider disabled state AFTER explicit enable:", playbackRateSlider.disabled);
            } else {
                 console.error("Could not find playback rate slider to enable.");
            }
            // -----------------------------
        }).catch(err => { 
            console.error(`Decode error for ${fileName}:`, err); 
            fileInfoDisplay.innerHTML = `<p>Error decoding: ${fileName}</p>`;
            audioBuffer = null; 
            updateButtonState(playPauseFileButton, false, true); 
        });
}

export function handleFileError() {
    console.error("File read error:", fileReader.error); 
    audioBuffer = null; 
    updateButtonState(playPauseFileButton, false, true);
    // Disable playback rate slider on error
    const playbackRateSlider = document.getElementById('playback-rate');
    if (playbackRateSlider) {
        playbackRateSlider.disabled = true;
    }
}
export function playAudioFile() {
    if (!audioContext || !audioBuffer) return; // Check context and buffer وجود 
    // console.log("Starting/Resuming file playback...");

    let offset = 0;
    // Calculate offset if resuming from pause
    if (filePauseTime > 0 && fileStartTime > 0) {
        offset = (filePauseTime - fileStartTime);
        // console.log(`Resuming. StartTime: ${fileStartTime.toFixed(3)}, PauseTime: ${filePauseTime.toFixed(3)}, Raw Offset: ${offset.toFixed(3)}`);
        offset = offset % audioBuffer.duration; // Wrap offset for looping buffer
        // console.log(`Modulo Offset: ${offset.toFixed(3)}`);
    } else {
        // console.log("Starting from beginning or after full stop.");
        offset = 0;
        // fileStartTime will be set below, after getting currentTime
    }

    audioSource = audioContext.createBufferSource();
    audioSource.buffer = audioBuffer;
    audioSource.loop = true; // Keep looping enabled
    const currentRate = sliderValueToPlaybackRate(parseFloat(playbackRateSlider.value));
    audioSource.playbackRate.setValueAtTime(currentRate, audioContext.currentTime);
    audioSource.connect(fileGainNode); // Connect to fileGainNode

    // Store the hypothetical start time (relative to AudioContext) needed for pause calculation
    fileStartTime = audioContext.currentTime - offset;

    // Fade in the file gain node
    fileGainNode.gain.cancelScheduledValues(audioContext.currentTime);
    fileGainNode.gain.setValueAtTime(0.0001, audioContext.currentTime);
    fileGainNode.gain.linearRampToValueAtTime(1.0, audioContext.currentTime + 0.015);

    audioSource.onended = () => {
        // This handler should ideally only run if playback finishes naturally,
        // but with loop=true, it only fires on stop(). We prevent it during manual stop.
        if (isFilePlaying) { // Check flag which is set to false by stopAudioSource
             console.log("File playback ended unexpectedly (should loop).");
             isFilePlaying = false;
             audioSource = null;
             updateButtonState(playPauseFileButton, false, audioBuffer ? false : true);
             checkAndStopVisualization(); // Check if visuals should stop now
             fileStartTime = 0; // Reset times
             filePauseTime = 0;
        } else {
            console.log("onended successfully ignored after manual stop.");
        }
    };

    // console.log(`Starting buffer source with offset: ${offset.toFixed(3)}`);
    audioSource.start(0, offset); // Start immediately at calculated offset

    filePauseTime = 0; // Reset pause time as we are now playing
    isFilePlaying = true;
    startVisualization();
    updateButtonState(playPauseFileButton, true, !audioBuffer); // Ensure button state is updated
    updateAudioActivityBodyClass(); // ✨ ADDED ✨
}
export function stopAudioFile() {
    if (!isFilePlaying) return;
    console.log("Pausing file playback manually...");
    // Record context time when pause occurs
    filePauseTime = audioContext.currentTime;
    console.log(`Pause triggered. StartTime: ${fileStartTime.toFixed(3)}, PauseTime: ${filePauseTime.toFixed(3)}, Elapsed: ${(filePauseTime - fileStartTime).toFixed(3)}`);

    // Fade out the file gain node
    if (fileGainNode) {
        fileGainNode.gain.cancelScheduledValues(audioContext.currentTime);
        fileGainNode.gain.setValueAtTime(fileGainNode.gain.value, audioContext.currentTime); // Start from current value
        fileGainNode.gain.linearRampToValueAtTime(0.0001, audioContext.currentTime + 0.015);
    }

    // Stop the source node *after* the fade completes
    const sourceToStop = audioSource; // Capture current source node
    setTimeout(() => {
        // Check if this is still the active source before stopping
        if (audioSource === sourceToStop) { 
            stopAudioSource(); // Default stop, will update isFilePlaying
            console.log("Audio source stopped after fade-out.");
        } else {
            console.log("Audio source changed before fade-out completed.");
        }
    }, (0.015 * 1000) + 5); // Delay slightly longer than fade

    checkAndStopVisualization(); // Check if visuals should stop now
    updateAudioActivityBodyClass(); // ✨ ADDED ✨
}

// Modified to accept an optional flag to prevent setting isFilePlaying=false
function stopAudioSource(updatePlayState = true) { 
     if (audioSource) {
         try { 
            // Prevent onended handler from firing during manual stop/pause
            audioSource.onended = null; 
            audioSource.stop(); 
            audioSource.disconnect(); 
            console.log("AudioBufferSourceNode stopped and disconnected.");
        } catch(e) { console.warn("Error stopping source", e); }
         audioSource = null;
     }
     // Always update state, even if source was already null
     if (updatePlayState) { // Only update if flag is true (default)
         isFilePlaying = false;
         updateButtonState(playPauseFileButton, false, audioBuffer ? false : true);
         checkAndStopVisualization(); // Check if visuals should stop now
         updateAudioActivityBodyClass(); // ✨ ADDED ✨
     }
     // Do not reset fileStartTime/filePauseTime here
 }

// ✨ NEW: Restart Audio File Function ✨
export function restartAudioFile(controls) {
    if (!audioContext || !audioBuffer) {
        console.log("Cannot restart: No audio buffer or context.");
        return;
    }
    console.log("Restarting audio file...");
    
    // Stop current source node *without* changing play state if playing
    if (isFilePlaying) {
        stopAudioSource(false); // Pass false to prevent setting isFilePlaying = false
    }
    
    // Reset playback timing
    fileStartTime = 0;
    filePauseTime = 0;

    // Start playback from the beginning
    // Ensure audio context is resumed if needed
    if (audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
            console.log("Resumed context before restart.");
            playAudioFile(); // playAudioFile will set isFilePlaying = true and update button
        });
    } else {
        playAudioFile(); // playAudioFile will set isFilePlaying = true and update button
    }
    
    // No need for explicit updateButtonState here, playAudioFile handles it.
}

// Functions to manage spacebar pause state
export function rememberSpacebarPauseState(isFile, isGenerated) {
    wasFilePlayingBeforeSpacePause = isFile;
    wasGeneratedPlayingBeforeSpacePause = isGenerated;
}

export function resetSpacebarPauseState() {
    wasFilePlayingBeforeSpacePause = false;
    wasGeneratedPlayingBeforeSpacePause = false;
}
