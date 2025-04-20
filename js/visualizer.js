import { 
    audioContext, 
    analyser, waveformAnalyser, scrollingAnalyser,
    isGeneratedPlaying, isFilePlaying, isPreviewing // <-- Add state variables
} from './audio.js';
import { // <-- Add import for config constants
    instantaneousWaveformCanvas, scrollingWaveformCanvas, spectrogramCanvas,
    spectrogramAxisCanvas, instantaneousWaveformAxisCanvas, scrollingWaveformAxisCanvas,
    waveformZoomSlider, waveformScaleSlider, scrollingScaleSlider, scrollingDownsampleSlider,
    scrollSpeedWaveformSlider, scrollSpeedSlider, spectrogramScaleSelect, colorSchemeSelect
} from './config.js';

// --- Canvas Elements and Contexts ---
export let instantaneousWaveformCtx = null;
export let scrollingWaveformCtx = null;
export let spectrogramCtx = null;
export let spectrogramAxisCtx = null;
export let instantaneousWaveformAxisCtx = null;
export let scrollingWaveformAxisCtx = null;

// Waveform Axis Canvases and Contexts

// --- Global Constants ---
const AXIS_VERTICAL_PADDING = 5; // Padding above/below axis labels
const AXIS_HORIZONTAL_PADDING = 5; // Padding left/right for axis labels

// Set to true to draw horizontal frequency lines on the main spectrogram canvas.
// These lines are intended for debugging purposes to visually verify alignment
// with the frequency ticks and labels drawn on the adjacent axis canvas.
const DRAW_SPECTROGRAM_DEBUG_LINES = false;

// --- Global Data Storage ---
let lastInstantaneousDataArray = null;
let lastScrollingCanvasImage = null;
let lastScrollingCanvasScale = 1.0; // Added: Store scale at pause

// --- Animation IDs ---
let waveformAnimationId = null;
let spectrogramAnimationId = null;
let scrollingWaveformAnimationId = null;

// --- Visualization ---
export function startVisualization() {
    if (!analyser) return;
    if (!waveformAnimationId) {
        waveformAnimationId = requestAnimationFrame(drawInstantaneousWaveform);
        // console.log("Instantaneous Waveform loop started.");
    }
    if (!scrollingWaveformAnimationId) {
        scrollingWaveformAnimationId = requestAnimationFrame(drawScrollingWaveform);
        // console.log("Scrolling Waveform loop started.");
    }
    if (!spectrogramAnimationId) {
        spectrogramAnimationId = requestAnimationFrame(drawSpectrogram);
        // console.log("Spectrogram loop started.");
    }
    // Draw axis initially if context is ready
    if (spectrogramAxisCtx) {
        drawSpectrogramAxis();
    }

    // Clear stored canvas image and reset scale when starting visualization
    lastScrollingCanvasImage = null; 
    lastScrollingCanvasScale = 1.0; // Reset scale too
    // console.log("Cleared stored scrolling waveform image and scale.");
}

// Helper function to check state and stop visualization loops if inactive
export function checkAndStopVisualization() {
    if (!isGeneratedPlaying && !isFilePlaying && !isPreviewing) {
        // console.log("All audio inactive, stopping visualization loops.");
        if (waveformAnimationId) {
            cancelAnimationFrame(waveformAnimationId);
            waveformAnimationId = null;
            // console.log("Instantaneous Waveform loop stopped.");
        }
        if (scrollingWaveformAnimationId) {
            cancelAnimationFrame(scrollingWaveformAnimationId);
            scrollingWaveformAnimationId = null;
            // console.log("Scrolling Waveform loop stopped.");
        }
        if (spectrogramAnimationId) {
            cancelAnimationFrame(spectrogramAnimationId);
            spectrogramAnimationId = null;
            // console.log("Spectrogram loop stopped.");
        }

        // Store canvas image data and scale for scrolling waveform
        if (scrollingWaveformCtx && scrollingWaveformCanvas.width > 0 && scrollingWaveformCanvas.height > 0) {
             try {
                 lastScrollingCanvasImage = scrollingWaveformCtx.getImageData(
                     0, 0, scrollingWaveformCanvas.width, scrollingWaveformCanvas.height
                 );
                 // Store the scale value at the time of pause
                 lastScrollingCanvasScale = parseFloat(scrollingScaleSlider.value); 
                 // console.log("Scrolling waveform canvas image captured with scale:", lastScrollingCanvasScale);
             } catch (e) {
                 // console.error("Error capturing scrolling waveform canvas image:", e);
                 lastScrollingCanvasImage = null; // Reset if capture fails
                 lastScrollingCanvasScale = 1.0;
             }
        } else {
             // console.warn("Could not capture scrolling waveform: context or canvas dimensions invalid.");
             lastScrollingCanvasImage = null;
             lastScrollingCanvasScale = 1.0;
        }

    } else {
        // Comment out the verbose log
        // console.log("Visualization continues (some audio source active).", {gen: isGeneratedPlaying, file: isFilePlaying, preview: isPreviewing});
    }
}

function drawInstantaneousWaveform() {
    if (!waveformAnimationId || !waveformAnalyser || (!isGeneratedPlaying && !isFilePlaying && !isPreviewing)) {
        waveformAnimationId = null;
        // Don't clear stored data here, only when explicitly stopped
        return;
    }
    // Move bufferLength calculation inside the loop to get updated fftSize
    const bufferLength = waveformAnalyser.fftSize; 
    const dataArray = new Uint8Array(bufferLength);
    waveformAnalyser.getByteTimeDomainData(dataArray);

    // Store a copy of the current data for static redraw
    lastInstantaneousDataArray = new Uint8Array(dataArray);

    const canvas = instantaneousWaveformCanvas;
    const ctx = instantaneousWaveformCtx;
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    // ✨ Theme-aware colors ✨
    const isDarkTheme = document.documentElement.classList.contains('midnight-blue');
    const bgColor = isDarkTheme ? '#0f1a3b' : '#f8f9fa';
    const lineColor = isDarkTheme ? '#ecf0f1' : '#3498db'; // White-ish for dark theme
    const zeroLineColor = isDarkTheme ? 'rgba(189, 195, 199, 0.35)' : 'rgba(128, 128, 128, 0.35)'; // Lighter grey line

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // --- Draw Zero Line (Behind Waveform) ---
    ctx.beginPath();
    ctx.moveTo(0, canvasHeight / 2);
    ctx.lineTo(canvasWidth, canvasHeight / 2);
    ctx.strokeStyle = zeroLineColor;
    ctx.lineWidth = 1;
    ctx.stroke();
    // --- End Zero Line ---

    ctx.lineWidth = 2;
    ctx.strokeStyle = lineColor;
    ctx.beginPath();

    const zoom = parseInt(waveformZoomSlider.value);
    const scale = parseFloat(waveformScaleSlider.value);
    const visibleBufferLength = Math.max(1, Math.floor(bufferLength / zoom));
    const startIndex = Math.floor((bufferLength - visibleBufferLength) / 2);
    const sliceWidth = canvasWidth / (visibleBufferLength > 1 ? visibleBufferLength - 1 : 1);

    let firstPoint = true;
    for (let i = 0; i < visibleBufferLength; i++) {
        const dataIndex = startIndex + i;
        if (dataIndex >= bufferLength || dataIndex < 0) continue;

        const v = (dataArray[dataIndex] / 128.0) - 1.0;
        const y = (canvasHeight / 2) + (v * (canvasHeight / 2) * scale);
        const x = i * sliceWidth;

        if (firstPoint) {
            ctx.moveTo(x, y);
            firstPoint = false;
        } else {
            ctx.lineTo(x, y);
        }
    }
    ctx.stroke();
    waveformAnimationId = requestAnimationFrame(drawInstantaneousWaveform);
}
function drawScrollingWaveform() {
    if (!scrollingWaveformAnimationId || !scrollingAnalyser || (!isGeneratedPlaying && !isFilePlaying && !isPreviewing)) {
        scrollingWaveformAnimationId = null;
        return;
    }
    const canvas = scrollingWaveformCanvas;
    const ctx = scrollingWaveformCtx;
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const scrollAmount = Math.max(1, Math.round(parseFloat(scrollSpeedWaveformSlider.value)));
    const columnWidth = scrollAmount;
    const columnX = canvasWidth - columnWidth;
    const isDarkThemeScrolling = document.documentElement.classList.contains('midnight-blue');
    const bgColorScrolling = isDarkThemeScrolling ? '#0f1a3b' : '#f8f9fa';
    const lineColorScrolling = isDarkThemeScrolling ? '#ecf0f1' : '#3498db';
    const zeroLineColorScrolling = isDarkThemeScrolling ? 'rgba(189, 195, 199, 0.35)' : 'rgba(128, 128, 128, 0.35)';
    const bufferLength = scrollingAnalyser.fftSize;
    const dataArray = new Uint8Array(bufferLength);
    scrollingAnalyser.getByteTimeDomainData(dataArray);

    // --- Corrected Single Canvas Logic --- 
    // 1. Capture the part of the image to shift (waveform only)
    let imageDataToShift = null;
    if (canvasWidth > scrollAmount) {
        try {
            imageDataToShift = ctx.getImageData(scrollAmount, 0, canvasWidth - scrollAmount, canvasHeight);
        } catch (e) {
            // console.error("Error getting image data for shift:", e);
            imageDataToShift = null; 
        }
    }

    // 2. Clear the entire canvas with the background color
    ctx.fillStyle = bgColorScrolling;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // 3. Draw the static zero line onto the background
    ctx.beginPath();
    ctx.moveTo(0, canvasHeight / 2);
    ctx.lineTo(canvasWidth, canvasHeight / 2);
    ctx.strokeStyle = zeroLineColorScrolling;
    ctx.lineWidth = 1;
    ctx.setLineDash([]); // Ensure solid line
    ctx.stroke();

    // 4. Put back the shifted image data (waveform) OVER the background/line
    if (imageDataToShift) {
        ctx.putImageData(imageDataToShift, 0, 0);
    }

    // 5. Draw the new waveform segment in the rightmost column OVER the background/line
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = lineColorScrolling;
    ctx.beginPath();
    const downsampleFactor = parseInt(scrollingDownsampleSlider.value);
    const scale = parseFloat(scrollingScaleSlider.value);
    const pointsToDraw = Math.max(1, Math.floor(bufferLength / downsampleFactor));
    const sliceWidth = columnWidth / (pointsToDraw > 1 ? pointsToDraw - 1 : 1);
    let firstPoint = true;
    for (let i = 0; i < pointsToDraw; i++) {
        const dataIndex = i * downsampleFactor;
        if (dataIndex >= bufferLength) break;
        const v = (dataArray[dataIndex] / 128.0) - 1.0;
        const y = (canvasHeight / 2) + (v * (canvasHeight / 2) * scale);
        const x = columnX + (i * sliceWidth);
        if (firstPoint) {
            ctx.moveTo(x, y);
            firstPoint = false;
        } else {
            ctx.lineTo(x, y);
        }
    }
    ctx.stroke(); // Stroke the new waveform segment

    scrollingWaveformAnimationId = requestAnimationFrame(drawScrollingWaveform);
}
function drawSpectrogram() {
    if (!spectrogramAnimationId || !analyser || (!isGeneratedPlaying && !isFilePlaying && !isPreviewing)) {
        spectrogramAnimationId = null;
        return;
    }
    // Move bufferLength calculation inside the loop to get updated frequencyBinCount
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);

    const scrollSpeedFloat = parseFloat(scrollSpeedSlider.value);
    const scrollAmount = Math.max(1, Math.round(scrollSpeedFloat));
    const canvasWidth = spectrogramCanvas.width;
    const canvasHeight = spectrogramCanvas.height;
    const scaleType = spectrogramScaleSelect.value;
    const sampleRate = audioContext ? audioContext.sampleRate : 44100;
    const nyquist = sampleRate / 2;
    
    // --- ✨ Align Log Calculation with Axis ✨ ---
    const VISUAL_MAX_FREQ = 22050; // Match axis
    const minLogFreq = 20;
    const logMin = Math.log(minLogFreq / 1.065); // Match axis calculation
    const logMax = Math.log(VISUAL_MAX_FREQ / 1.065); // Match axis calculation
    const logRange = logMax - logMin;
    // --- End Alignment ---

    // --- Shift Image ---
    if (canvasWidth > scrollAmount) {
        const imageData = spectrogramCtx.getImageData(scrollAmount, 0, canvasWidth - scrollAmount, canvasHeight);
        spectrogramCtx.putImageData(imageData, 0, 0);
    } else {
        spectrogramCtx.clearRect(0, 0, canvasWidth, canvasHeight);
    }
    const columnWidth = scrollAmount;
    const columnX = canvasWidth - columnWidth;
    // --- Clear New Column ---
    spectrogramCtx.clearRect(columnX, 0, columnWidth, canvasHeight);

    // --- Draw New Column ---
    if (scaleType === 'log') {
        // Loop through frequency bins (original logarithmic logic)
        for (let i = 0; i < bufferLength; i++) {
            const value = dataArray[i] / 255.0;
            let y, rectHeight;
            let yCurrentTop, yNextTop;

            // --- Original Log Scale Calculations ---
            const freq = (i / bufferLength) * nyquist;
            const logFreq = Math.log(freq / 1.065);
            if (freq <= minLogFreq) {
                yCurrentTop = canvasHeight;
            } else {
                yCurrentTop = canvasHeight * (1 - (logFreq - logMin) / logRange);
            }
            const nextFreq = ((i + 1) / bufferLength) * nyquist;
            const nextLogFreq = Math.log(nextFreq / 1.065);
            if (i === bufferLength - 1 || nextFreq > VISUAL_MAX_FREQ) {
                yNextTop = 0;
            } else if (nextFreq <= minLogFreq) {
                yNextTop = canvasHeight;
            } else {
                yNextTop = canvasHeight * (1 - (nextLogFreq - logMin) / logRange);
            }
            y = Math.max(0, yNextTop);
            rectHeight = Math.max(1, yCurrentTop - yNextTop);
            // --- End Original Log Scale Calculations ---

            const drawHeight = rectHeight + 0.5; // Add slight overlap
            // Clamp values to canvas boundaries (simplified)
            const drawY = Math.max(0, y);
            const finalHeight = Math.min(drawHeight, canvasHeight - drawY);
            if (finalHeight <= 0) continue;

            const colorValue = dataArray[i]; // Use raw byte value for getColor
            const color = getColor(colorValue); // Pass byte value directly
            spectrogramCtx.fillStyle = color;
            spectrogramCtx.fillRect(columnX, drawY, columnWidth, finalHeight);
        }

    } else { // Linear scale
        // Loop through frequency bins and draw rectangles
        const freqPerBin = nyquist / bufferLength;
        for (let i = 0; i < bufferLength; i++) {
            const freq = i * freqPerBin;
            if (freq > VISUAL_MAX_FREQ) continue; // Skip bins above visual max

            const value = dataArray[i] / 255.0; // Normalize for color calculation
            const y = canvasHeight * (1 - (freq / VISUAL_MAX_FREQ)); // Map frequency to y-coordinate within visual range
            const nextFreq = (i + 1) * freqPerBin;
            const nextY = canvasHeight * (1 - (Math.min(nextFreq, VISUAL_MAX_FREQ) / VISUAL_MAX_FREQ)); // Calculate next bin's y, clamped
            const rectHeight = Math.max(1, y - nextY); // Ensure minimum height of 1px

            const colorValue = dataArray[i]; // Use raw byte value for getColor
            const color = getColor(colorValue); // Pass byte value directly
            spectrogramCtx.fillStyle = color;
            // Ensure drawing stays within canvas bounds
            const drawY = Math.max(0, nextY); // Start drawing from the top of the next bin's position
            const finalHeight = Math.min(rectHeight, canvasHeight - drawY); // Clamp height
            if (finalHeight <= 0) continue;

            spectrogramCtx.fillRect(columnX, drawY, columnWidth, finalHeight);
        }
    }

    // --- Draw Debug Lines (Optional) ---
    if (DRAW_SPECTROGRAM_DEBUG_LINES) {
        const debugLineColor = 'rgba(255, 0, 0, 0.5)'; // Semi-transparent red
        spectrogramCtx.strokeStyle = debugLineColor;
        spectrogramCtx.lineWidth = 1;

        if (scaleType === 'log') {
            // --- Log Scale Debug Lines ---
            const logFrequencies = [
                30, 50, 75, 100, 150, 200, 300, 400, 500, 750,
                1000, 1500, 2000, 3000, 4000, 5000, 7500, 10000, 15000, 20000
            ];
            logFrequencies.forEach(freq => {
                if (freq <= 0 || freq > VISUAL_MAX_FREQ) return;
                const logFreqNorm = Math.log(freq / 1.065); // Match axis calc
                const pixelProportion = (logFreqNorm - logMin) / logRange;
                // Match calculation in drawSpectrogramAxis precisely
                const y = canvasHeight * (1 - pixelProportion); // Map proportion to y

                // Ensure y calculation aligns with the *drawing* logic, not necessarily the axis canvas logic
                // We map the frequency proportion directly to the main canvas height here.
                const debugY = Math.max(0, Math.min(canvasHeight, y)); // Clamp to canvas

                if (debugY >= 0 && debugY < canvasHeight) {
                    spectrogramCtx.beginPath();
                    spectrogramCtx.moveTo(0, debugY);
                    spectrogramCtx.lineTo(canvasWidth, debugY);
                    spectrogramCtx.stroke();
                }
            });

        } else { // Linear Scale
            // --- Linear Scale Debug Lines ---
            const linearFrequencies = [
                1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000,
                10000, 11000, 12000, 13000, 14000, 15000, 16000, 17000,
                18000, 19000, 20000, 21000, 22000
            ];
             linearFrequencies.forEach(freq => {
                if (freq <= 0 || freq > VISUAL_MAX_FREQ) return; // Use VISUAL_MAX_FREQ here too
                // Map frequency linearly to the main canvas height based on VISUAL_MAX_FREQ
                const y = canvasHeight * (1 - (freq / VISUAL_MAX_FREQ));
                const debugY = Math.max(0, Math.min(canvasHeight, y)); // Clamp to canvas

                 if (debugY >= 0 && debugY < canvasHeight) {
                     spectrogramCtx.beginPath();
                     spectrogramCtx.moveTo(0, debugY);
                     spectrogramCtx.lineTo(canvasWidth, debugY);
                     spectrogramCtx.stroke();
                 }
             });
        }
    } // End DRAW_SPECTROGRAM_DEBUG_LINES block

    spectrogramAnimationId = requestAnimationFrame(drawSpectrogram);
}
function getColor(value) { // Modified to accept byte value 0-255
    const scheme = colorSchemeSelect.value;
    let r, g, b;
    const v = Math.max(0, Math.min(255, value)) / 255.0; // Normalize byte value to 0-1
    switch (scheme) {
        case 'viridis': r = Math.sqrt(Math.max(0, -1.885*v*v + 2.113*v + 0.17)); g = Math.sqrt(Math.max(0, -0.6*v*v + 1.35*v - 0.03)); b = Math.sqrt(Math.max(0, 2.08*v*v - 0.015*v + 0.164)); break;
        case 'magma': r = Math.sqrt(Math.max(0, -0.82*v*v + 1.55*v + 0.015)); g = Math.sqrt(Math.max(0, 5.04*v*v - 5.21*v + 1.44)); b = Math.sqrt(Math.max(0, 3.64*v*v + 0.22*v + 0.08)); break;
        case 'plasma': r = Math.sqrt(Math.max(0, -2.02*v*v + 2.06*v + 0.40)); g = Math.sqrt(Math.max(0, -0.79*v*v + 1.57*v - 0.13)); b = Math.sqrt(Math.max(0, 2.86*v*v - 1.67*v + 0.65)); break;
        case 'bwr': if (v < 0.5) { r = g = 2 * v; b = 1; } else { r = 1; g = b = 2 * (1 - v); } break;
        case 'grayscale': r = g = b = v; break;
        case 'inferno': default: r = Math.sqrt(Math.max(0, -1.18*v*v + 1.58*v + 0.08)); g = Math.sqrt(Math.max(0, 3.1*v*v - 1.35*v + 0.04)); b = Math.sqrt(Math.max(0, 6.0*v*v - 8.7*v + 3.15)); break;
    }
    // Return integer RGB values
    return `rgb(${Math.floor(r * 255)}, ${Math.floor(g * 255)}, ${Math.floor(b * 255)})`;
}

// Adjusts canvas internal resolution and height based on window size

// --- Initialization and Resizing ---
export function resizeCanvases(canvasRefs, controls) {
    const { instWf, scrollWf, spec, specAxis, instWfAxis, scrollWfAxis } = canvasRefs;
    const allCanvases = [instWf, scrollWf, spec, specAxis, instWfAxis, scrollWfAxis];

    // --- ✨ Responsive Height Calculation ✨ ---
    const defaultWaveformHeight = 200;
    const defaultSpectrogramHeight = 300;
    const minHeightFactor = 0.66; // Clamp at 66%
    const headerApproxHeight = 60;
    const controlsApproxHeight = 80;  // Reduced estimates to give canvases more height
    const paddingAndMargins = 40; // Reduced estimates to give canvases more height
    const availableHeight = window.innerHeight - headerApproxHeight - paddingAndMargins;
    const targetHeightPerVis = Math.max(10, availableHeight / 3 - controlsApproxHeight); // Rough target height per visualizer row, minimum 10px
    const minWaveformHeight = defaultWaveformHeight * minHeightFactor;
    const minSpectrogramHeight = defaultSpectrogramHeight * minHeightFactor;
    const finalWaveformHeight = Math.round(Math.max(minWaveformHeight, targetHeightPerVis)) - 45;
    const finalSpectrogramHeight = Math.round(Math.max(minSpectrogramHeight, targetHeightPerVis)) + 100; //THIS is how we change the height of the spectrogram
    // --- End Responsive Height --- 

    // ✨ Define padding for axis labels ✨
    const AXIS_VERTICAL_PADDING = 5; // Pixels for top and bottom padding

    // Main visualization canvases
    [instWf, scrollWf, spec].forEach(canvas => {
        if (!canvas || !canvas.parentElement || canvas.parentElement.offsetWidth <= 0) return;
        
        canvas.width = canvas.parentElement.offsetWidth;
        
        // ✨ Apply calculated height ✨
        if (canvas.id.includes('spectrogram')) {
            canvas.height = finalSpectrogramHeight;
        } else {
            canvas.height = finalWaveformHeight;
        }
            
        // Get main contexts if not already obtained - Assign to GLOBAL vars
        if (canvas.id === 'instantaneous-waveform-canvas' && !instantaneousWaveformCtx) {
            instantaneousWaveformCtx = canvas.getContext('2d');
        } else if (canvas.id === 'scrolling-waveform-canvas' && !scrollingWaveformCtx) {
            scrollingWaveformCtx = canvas.getContext('2d', { willReadFrequently: true }); // Keep optimization
        } else if (canvas.id === 'spectrogram-canvas' && !spectrogramCtx) {
            spectrogramCtx = canvas.getContext('2d', { willReadFrequently: true }); // Keep optimization
        }
    });
    // Comment out the resize log
    // console.log(`Resized main canvases`);

    // Axis canvases - Resize and get context if not already done
    [specAxis, instWfAxis, scrollWfAxis].forEach(axisCanvas => {
        if (!axisCanvas || !axisCanvas.parentElement || axisCanvas.parentElement.offsetWidth <= 0) return;
        
        axisCanvas.width = axisCanvas.parentElement.offsetWidth;

        // ✨ Apply calculated height, adding padding for spectrogram axis ✨
        if (axisCanvas.id.includes('spectrogram')) {
            axisCanvas.height = finalSpectrogramHeight + 2 * AXIS_VERTICAL_PADDING; // Add padding
        } else {
            axisCanvas.height = finalWaveformHeight; // Keep waveform axes same height
        }

        // Get context if not already obtained - Assign to GLOBAL context vars
        if (axisCanvas.id === 'spectrogram-axis-canvas' && !spectrogramAxisCtx) {
            spectrogramAxisCtx = axisCanvas.getContext('2d');
            // console.log("VIS: SpectrogramAxisCtx obtained."); 
        } else if (axisCanvas.id === 'instantaneous-waveform-axis-canvas' && !instantaneousWaveformAxisCtx) {
            instantaneousWaveformAxisCtx = axisCanvas.getContext('2d');
            // console.log("VIS: InstantaneousWaveformAxisCtx obtained.");
        } else if (axisCanvas.id === 'scrolling-waveform-axis-canvas' && !scrollingWaveformAxisCtx) {
            scrollingWaveformAxisCtx = axisCanvas.getContext('2d');
            // console.log("VIS: ScrollingWaveformAxisCtx obtained.");
        }
    });

    // Redraw all axes after resizing and context acquisition
    if (spectrogramAxisCtx && audioContext) drawSpectrogramAxis();
    if (instantaneousWaveformAxisCtx && audioContext) drawInstantaneousWaveformAxis(controls);
    if (scrollingWaveformAxisCtx && audioContext) drawScrollingWaveformAxis(controls);

    // --- Draw initial static zero lines on waveform canvases --- 
    const drawInitialZeroLine = (canvas, ctx) => {
        if (!ctx || !canvas) return;
        const isDarkTheme = document.documentElement.classList.contains('midnight-blue');
        const bgColor = isDarkTheme ? '#0f1a3b' : '#f8f9fa';
        const zeroLineColor = isDarkTheme ? 'rgba(189, 195, 199, 0.35)' : 'rgba(128, 128, 128, 0.35)';
        const canvasHeight = canvas.height;
        const canvasWidth = canvas.width;
        
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        
        ctx.beginPath();
        ctx.moveTo(0, canvasHeight / 2);
        ctx.lineTo(canvasWidth, canvasHeight / 2);
        ctx.strokeStyle = zeroLineColor;
        ctx.lineWidth = 1;
        ctx.stroke();
    };
    
    // Call for both waveform canvases if their contexts are ready
    drawInitialZeroLine(instantaneousWaveformCanvas, instantaneousWaveformCtx);
    drawInitialZeroLine(scrollingWaveformCanvas, scrollingWaveformCtx);
    // --- End initial zero line drawing ---

    // Return the obtained contexts
    return {
        instantaneousWaveformCtx,
        scrollingWaveformCtx,
        spectrogramCtx,
        spectrogramAxisCtx,
        instantaneousWaveformAxisCtx,
        scrollingWaveformAxisCtx
    };
} 

// --- Function to Draw Spectrogram Frequency Axis ---
export function drawSpectrogramAxis() {
    // Comment out initial call log
    // console.log("VIS: drawSpectrogramAxis called."); 
    if (!spectrogramAxisCtx || !audioContext) {
        // console.warn("Spectrogram axis context or audio context not ready."); // Keep warns?
        return;
    }
    const ctx = spectrogramAxisCtx;
    const canvasWidth = spectrogramAxisCanvas.width;
    const canvasHeight = spectrogramAxisCanvas.height;
    const mainSpectrogramHeight = spectrogramCanvas.height; // ✨ Height of the main spectrogram canvas ✨
    const scaleType = spectrogramScaleSelect.value;
    const sampleRate = audioContext ? audioContext.sampleRate : 44100;
    const nyquist = sampleRate / 2;
    
    // --- ✨ Define fixed visual frequency range & Padding ✨ ---
    const VISUAL_MAX_FREQ = 22050; 
    const minLogFreq = 20; 
    const logMin = Math.log(minLogFreq / 1.065);
    const logMax = Math.log(VISUAL_MAX_FREQ / 1.065); 
    const logRange = logMax - logMin;
    const AXIS_VERTICAL_PADDING = 5; // Padding outside the scale area
    const TEXT_MARGIN = 5;           // Additional margin for text within the scale area
    const drawingHeight = canvasHeight - 2 * AXIS_VERTICAL_PADDING - 2 * TEXT_MARGIN;
    const yOffset = AXIS_VERTICAL_PADDING + TEXT_MARGIN;
    // --- End Definitions ---

    // Comment out extra debug output for padding
    // console.log(`Canvas sizes: spectrogram=${mainSpectrogramHeight}px, axis=${canvasHeight}px`);
    // console.log(`Axis padding: AXIS_VERTICAL_PADDING=${AXIS_VERTICAL_PADDING}, TEXT_MARGIN=${TEXT_MARGIN}`);
    // console.log(`Final values: drawingHeight=${drawingHeight}, yOffset=${yOffset}`);

    // ✨ Theme-aware colors ✨
    const isDarkTheme = document.documentElement.classList.contains('midnight-blue');
    // Use a SOLID color for clearing to prevent ghosting artifacts
    const bgColor = isDarkTheme ? 'rgb(10, 15, 46)' : 'white'; 
    const textColor = isDarkTheme ? '#ecf0f1' : '#333';
    const tickColor = isDarkTheme ? '#bdc3c7' : '#777';

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    ctx.font = '10px Segoe UI, Tahoma, Geneva, Verdana, sans-serif';
    ctx.fillStyle = textColor;
    ctx.strokeStyle = tickColor;
    ctx.lineWidth = 1;

    let ticks = [];

    // Define frequencies to label based on scale type
    const logFrequencies = [30, 50, 75, 100, 150, 200, 300, 400, 500, 750, 1000, 1500, 2000, 3000, 4000, 5000, 7500, 10000, 15000, 20000];
    // Ensure linear frequencies do not exceed VISUAL_MAX_FREQ
    const linearFrequencies = [0, 1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000, 11000, 12000, 13000, 14000, 15000, 16000, 17000, 18000, 19000, 20000, 21000, 22000]; // Removed 100

    // Comment out debug logging
    // console.log("DrawSpectrogramAxis: VISUAL_MAX_FREQ =", VISUAL_MAX_FREQ);
    // console.log("DrawSpectrogramAxis: mainSpectrogramHeight =", mainSpectrogramHeight);
    // console.log("DrawSpectrogramAxis: yOffset =", yOffset);
    // console.log("DrawSpectrogramAxis: drawingHeight =", drawingHeight);

    const frequenciesToLabel = (scaleType === 'log') ? logFrequencies : linearFrequencies;

    // Set text baseline to middle for better vertical alignment of labels
    ctx.textBaseline = 'middle'; 

    // First: Calculate where each frequency would appear in the spectrogram
    // for reference and debugging
    const debugPositions = {};
    // Calculate debug positions for ALL linear frequencies including 0
    linearFrequencies.forEach(freq => { 
        if (freq <= VISUAL_MAX_FREQ) {
            // Treat 0Hz as the bottom edge
            const normalizedPos = (freq === 0) ? 0 : 1 - freq / VISUAL_MAX_FREQ; 
            const spectrogram_y = mainSpectrogramHeight * normalizedPos;
            debugPositions[freq] = spectrogram_y;
        }
    });
    // console.log("Spectrogram debug positions:", debugPositions); // <-- Comment out

    // Now draw the actual labels
    const drawnFrequencies = new Set(); // Keep track of drawn labels to avoid duplicates (like 0)
    const allFrequencies = (scaleType === 'log') 
        ? [0, ...logFrequencies] // Add 0 for manual placement on log scale
        : linearFrequencies;

    allFrequencies.forEach(freq => {
        // CRITICAL: Ensure we're not exceeding the visual range (22050)
        // And skip frequencies below minLogFreq for log scale (except our manual 0)
        if (freq > VISUAL_MAX_FREQ || (scaleType === 'log' && freq !== 0 && freq < minLogFreq)) {
            // console.log(`Skipping frequency ${freq} - exceeds VISUAL_MAX_FREQ or below minLogFreq`);
            return;
        }
        
        // Avoid drawing the same frequency label twice if it exists in multiple lists
        if (drawnFrequencies.has(freq)) {
            return;
        }

        let spectrogram_y;
        // Special handling for 0 Hz on both scales
        if (freq === 0) {
            spectrogram_y = mainSpectrogramHeight; // Position at the very bottom of the spectrogram
        } else if (scaleType === 'log') {
            // if (freq < minLogFreq) return; // Already handled above
            const logFreq = Math.log(freq / 1.065);
            const y_scaled_fraction = (logFreq - logMin) / logRange;
            spectrogram_y = mainSpectrogramHeight * (1 - y_scaled_fraction);
        } else { // Linear scale
            spectrogram_y = debugPositions[freq]; // Already calculated
        }

        // FINAL Y CALCULATION FOR AXIS CANVAS:
        // Add the top padding (AXIS_VERTICAL_PADDING) to the calculated spectrogram position.
        // This compensates for the canvas being taller and the `top: -5px` CSS offset,
        // ensuring the drawn tick/label aligns perfectly with the corresponding frequency
        // on the main spectrogram, while preventing clipping at the top/bottom edges.
        const y = AXIS_VERTICAL_PADDING + spectrogram_y; 

        // Remove old debug logging for y1,y2,y3
        if (scaleType === 'linear') {
             // Comment out linear scale frequency log
             // console.log(`Freq ${freq}Hz: spectrogram_y=${spectrogram_y.toFixed(1)}, final y=${y.toFixed(1)}`);
        }

        // Format frequency for display
        let label = '';
        if (freq >= 1000) {
            label = `${(freq / 1000).toFixed(freq < 10000 ? 1 : 0)}k`; 
        } else {
            label = `${freq}`;
        }

        // Draw label just to the right of the tick mark
        ctx.fillText(label, 8, y);

        // Draw tick mark from left edge
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(5, y);
        ctx.strokeStyle = tickColor;
        ctx.lineWidth = 1;
        ctx.stroke();
        
        drawnFrequencies.add(freq); // Mark this frequency as drawn
    });
} 

// --- Functions to Draw Waveform Amplitude Axes ---
export function drawInstantaneousWaveformAxis(controls) {
    // Double-check this is commented out
    // console.log("VIS: drawInstantaneousWaveformAxis called."); 
    if (!instantaneousWaveformAxisCtx || !controls || !controls.waveformScaleSlider) {
        // console.warn("Instantaneous waveform axis context or controls not ready."); // Keep warns?
        return;
    }

    const canvas = instantaneousWaveformAxisCanvas;
    const ctx = instantaneousWaveformAxisCtx;
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const scale = parseFloat(controls.waveformScaleSlider.value);
    if (isNaN(scale)) return;

    // ✨ Theme-aware colors ✨
    const isDarkTheme = document.documentElement.classList.contains('midnight-blue');
    const bgColor = isDarkTheme ? 'rgb(10, 15, 46)' : 'white';
    const textColor = isDarkTheme ? '#ecf0f1' : '#333';
    const tickColor = isDarkTheme ? '#bdc3c7' : '#777';
    const zeroLineColor = isDarkTheme ? '#3498db' : '#aaa'; // Make zero line blue in dark mode

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    ctx.font = '10px Segoe UI, Tahoma, Geneva, Verdana, sans-serif';
    ctx.fillStyle = textColor;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    // Tick mark properties
    ctx.strokeStyle = tickColor;
    ctx.lineWidth = 1;

    // --- Define amplitudes to label dynamically based on scale ---
    let amplitudes = [-1, -0.5, 0, 0.5, 1]; // Always include base set

    // Add finer ticks if zoomed in (scale > 1)
    if (scale >= 0.5 && scale <= 1.3) { // Add 0.25 increments in this specific range
        amplitudes.push(-0.75, -0.25, 0.25, 0.75);
    }
    if (scale >= 1.4) { // Threshold for showing +/- 0.1 increments (excluding existing base)
        amplitudes.push(-0.9, -0.8, -0.7, -0.6, -0.4, -0.3, -0.2, -0.1, 
                        0.1, 0.2, 0.3, 0.4, 0.6, 0.7, 0.8, 0.9);
    }
    if (scale >= 3) { // Threshold for showing +/- 0.05 increments
        for (let i = 0.05; i < 1; i += 0.1) {
            amplitudes.push(-i, i);
        }
    }

    // Add coarser ticks if zoomed out (scale < 1)
    if (scale <= 0.7) { amplitudes.push(-2, 2); }
    if (scale <= 0.4) { amplitudes.push(-3, 3); }
    if (scale <= 0.25) { amplitudes.push(-4, 4); }
    if (scale <= 0.2) { amplitudes.push(-5, 5); }   // Add +/- 5
    if (scale <= 0.15) { amplitudes.push(-6, 6); }  // Add +/- 6
    if (scale <= 0.12) { amplitudes.push(-7, 7); }  // Add +/- 7
    if (scale <= 0.1) { amplitudes.push(-8, 8); }   // Add +/- 8

    // Remove +/- 0.5 if scale is very small
    if (scale <= 0.1) {
        amplitudes = amplitudes.filter(amp => Math.abs(amp) !== 0.5);
    }

    // Remove duplicates and sort for cleaner drawing order
    amplitudes = [...new Set(amplitudes)].sort((a, b) => a - b);

    const centerY = canvasHeight / 2;

    amplitudes.forEach(amp => {
        // Calculate Y position based on scale
        // Correct formula: y = centerY - (amplitude * half_height * scale_factor)
        const y = centerY - (amp * centerY * scale); // Use multiplication, not division

        // Clamp y to canvas boundaries to prevent drawing outside
        const clampedY = Math.max(0, Math.min(canvasHeight, y));

        // Draw label (adjust precision based on value and scale)
        let precision = 0;
        if (Math.abs(amp) < 1 && Math.abs(amp) > 0) { // It's a non-zero fraction
            // Use 2 decimals if scale >= 3 OR if scale is in the [0.5, 1.3] range, else 1
            precision = (scale >= 3 || (scale >= 0.5 && scale <= 1.3)) ? 2 : 1; 
        }
        let label = amp.toFixed(precision);
        if (amp === 0) label = "0"; // Ensure 0 is just "0"

        ctx.fillText(label, 8, clampedY); 

        // Draw tick mark
        ctx.beginPath();
        ctx.moveTo(0, clampedY); 
        ctx.lineTo(5, clampedY); 
        ctx.stroke();
    });

    // Draw zero line
    const zeroY = canvasHeight / 2;
    ctx.beginPath();
    ctx.moveTo(canvasWidth * 0.1, zeroY); // Start slightly in
    ctx.lineTo(canvasWidth * 0.9, zeroY); // End slightly before edge
    ctx.strokeStyle = zeroLineColor; // Use theme-aware color
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 3]); // Make it dashed
    ctx.stroke();
}

export function drawScrollingWaveformAxis(controls) {
    // Comment out initial call log
    // console.log("VIS: drawScrollingWaveformAxis called."); 
     if (!scrollingWaveformAxisCtx || !controls || !controls.scrollingScaleSlider) {
         // console.warn("Scrolling waveform axis context or controls not ready."); // Keep warns?
         return;
     }

    const canvas = scrollingWaveformAxisCanvas;
    const ctx = scrollingWaveformAxisCtx;
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const scale = parseFloat(controls.scrollingScaleSlider.value);
    if (isNaN(scale)) return;

    // ✨ Theme-aware colors ✨
    const isDarkTheme = document.documentElement.classList.contains('midnight-blue');
    const bgColor = isDarkTheme ? 'rgb(10, 15, 46)' : 'white';
    const textColor = isDarkTheme ? '#ecf0f1' : '#333';
    const tickColor = isDarkTheme ? '#bdc3c7' : '#777';
    const zeroLineColor = isDarkTheme ? '#3498db' : '#aaa'; // Make zero line blue in dark mode

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    ctx.font = '10px Segoe UI, Tahoma, Geneva, Verdana, sans-serif';
    ctx.fillStyle = textColor;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    // Tick mark properties
    ctx.strokeStyle = tickColor;
    ctx.lineWidth = 1;

    // --- Define amplitudes to label dynamically based on scale ---
    let amplitudes = [-1, -0.5, 0, 0.5, 1]; // Always include base set

    // Add finer ticks if zoomed in (scale > 1)
    if (scale >= 0.5 && scale <= 1.3) { // Add 0.25 increments in this specific range
        amplitudes.push(-0.75, -0.25, 0.25, 0.75);
    }
    if (scale >= 1.4) { // Threshold for showing +/- 0.1 increments (excluding existing base)
        amplitudes.push(-0.9, -0.8, -0.7, -0.6, -0.4, -0.3, -0.2, -0.1, 
                        0.1, 0.2, 0.3, 0.4, 0.6, 0.7, 0.8, 0.9);
    }
    if (scale >= 3) { // Threshold for showing +/- 0.05 increments
        for (let i = 0.05; i < 1; i += 0.1) {
            amplitudes.push(-i, i);
        }
    }

    // Add coarser ticks if zoomed out (scale < 1)
    if (scale <= 0.7) { amplitudes.push(-2, 2); }
    if (scale <= 0.4) { amplitudes.push(-3, 3); }
    if (scale <= 0.25) { amplitudes.push(-4, 4); }
    if (scale <= 0.2) { amplitudes.push(-5, 5); }   // Add +/- 5
    if (scale <= 0.15) { amplitudes.push(-6, 6); }  // Add +/- 6
    if (scale <= 0.12) { amplitudes.push(-7, 7); }  // Add +/- 7
    if (scale <= 0.1) { amplitudes.push(-8, 8); }   // Add +/- 8

    // Remove +/- 0.5 if scale is very small
    if (scale <= 0.1) {
        amplitudes = amplitudes.filter(amp => Math.abs(amp) !== 0.5);
    }

    // Remove duplicates and sort for cleaner drawing order
    amplitudes = [...new Set(amplitudes)].sort((a, b) => a - b);

    const centerY = canvasHeight / 2;

    amplitudes.forEach(amp => {
        // Calculate Y position based on scale
        // Correct formula: y = centerY - (amplitude * half_height * scale_factor)
        const y = centerY - (amp * centerY * scale); // Use multiplication, not division

        // Clamp y to canvas boundaries to prevent drawing outside
        const clampedY = Math.max(0, Math.min(canvasHeight, y));

        // Draw label (adjust precision based on value and scale)
        let precision = 0;
        if (Math.abs(amp) < 1 && Math.abs(amp) > 0) { // It's a non-zero fraction
            // Use 2 decimals if scale >= 3 OR if scale is in the [0.5, 1.3] range, else 1
            precision = (scale >= 3 || (scale >= 0.5 && scale <= 1.3)) ? 2 : 1; 
        }
        let label = amp.toFixed(precision);
        if (amp === 0) label = "0"; // Ensure 0 is just "0"

        ctx.fillText(label, 8, clampedY); 

        // Draw tick mark
        ctx.beginPath();
        ctx.moveTo(0, clampedY); 
        ctx.lineTo(5, clampedY); 
        ctx.stroke();
    });

    // Draw zero line
    const zeroY = canvasHeight / 2;
    ctx.beginPath();
    ctx.moveTo(canvasWidth * 0.1, zeroY); // Start slightly in
    ctx.lineTo(canvasWidth * 0.9, zeroY); // End slightly before edge
    ctx.strokeStyle = zeroLineColor; // Use theme-aware color
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 3]); // Make it dashed
    ctx.stroke();
} 

// --- Function to Redraw Static Instantaneous Waveform ---
// This uses the last captured data array and current control settings
export function redrawStaticInstantaneousWaveform(controls) {
    if (!lastInstantaneousDataArray || !instantaneousWaveformCtx) {
        console.warn("Cannot redraw static instantaneous waveform: No data or context.");
        return;
    }

    // ✨ Theme-aware colors ✨
    const isDarkTheme = document.documentElement.classList.contains('midnight-blue');
    const bgColor = isDarkTheme ? '#0f1a3b' : '#f8f9fa';
    const lineColor = isDarkTheme ? '#ecf0f1' : '#3498db'; // White-ish for dark theme
    const zeroLineColor = isDarkTheme ? 'rgba(189, 195, 199, 0.35)' : 'rgba(128, 128, 128, 0.35)'; // Lighter grey line

    const ctx = instantaneousWaveformCtx;
    const canvas = instantaneousWaveformCanvas; // Rely on global canvas ref
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    // Clear canvas before drawing or returning
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // --- Draw Zero Line (Behind Waveform) ---
    ctx.beginPath();
    ctx.moveTo(0, canvasHeight / 2);
    ctx.lineTo(canvasWidth, canvasHeight / 2);
    ctx.strokeStyle = zeroLineColor;
    ctx.lineWidth = 1;
    ctx.stroke();
    // --- End Zero Line ---

    if (!lastInstantaneousDataArray) { 
        console.log("No stored waveform data to redraw.");
        return; // No data to draw
    }

    // Get current control values from passed object
    const scale = parseFloat(controls.waveformScaleSlider.value);
    const zoom = parseInt(controls.waveformZoomSlider.value);
    const bufferLength = lastInstantaneousDataArray.length; // Use stored data length
    const dataArray = lastInstantaneousDataArray; // Use stored data

    if (isNaN(scale) || isNaN(zoom) || scale <= 0 || zoom <= 0) {
        console.warn("Invalid scale or zoom for static redraw.");
        return;
    }

    // --- Drawing Logic (Copied & adapted from drawInstantaneousWaveform) ---
    ctx.lineWidth = 2;
    ctx.strokeStyle = lineColor; // Use theme color
    ctx.beginPath();

    const visibleBufferLength = Math.max(1, Math.floor(bufferLength / zoom));
    const startIndex = Math.floor((bufferLength - visibleBufferLength) / 2);
    const sliceWidth = canvasWidth / (visibleBufferLength > 1 ? visibleBufferLength - 1 : 1);

    let firstPoint = true;
    for (let i = 0; i < visibleBufferLength; i++) {
        const dataIndex = startIndex + i;
        if (dataIndex >= bufferLength || dataIndex < 0) continue;

        const v = (dataArray[dataIndex] / 128.0) - 1.0; // Use stored data
        const y = (canvasHeight / 2) + (v * (canvasHeight / 2) * scale); // Apply current scale
        const x = i * sliceWidth;

        if (firstPoint) {
            ctx.moveTo(x, y);
            firstPoint = false;
        } else {
            ctx.lineTo(x, y);
        }
    }
    ctx.stroke();
    // Comment out this log
    // console.log("Redrew static instantaneous waveform.");
} 

// Improved function that accounts for scale at time of capture
export function redrawStaticScrollingWaveformFromImage(controls) {
    if (!scrollingWaveformCtx || !lastScrollingCanvasImage) {
        console.warn("Cannot redraw static scrolling waveform: context or stored image missing.");
        return;
    }
    
    // ✨ Theme-aware colors ✨
    const isDarkTheme = document.documentElement.classList.contains('midnight-blue');
    const bgColor = isDarkTheme ? '#0f1a3b' : '#f8f9fa';
    const zeroLineColor = isDarkTheme ? 'rgba(189, 195, 199, 0.35)' : 'rgba(128, 128, 128, 0.35)';
    const canvas = scrollingWaveformCanvas;
    const ctx = scrollingWaveformCtx;
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const newScale = parseFloat(controls.scrollingScaleSlider.value);

    // 1. Clear canvas with background color
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // 2. Draw the static zero line onto the background
    ctx.beginPath();
    ctx.moveTo(0, canvasHeight / 2);
    ctx.lineTo(canvasWidth, canvasHeight / 2);
    ctx.strokeStyle = zeroLineColor;
    ctx.lineWidth = 1;
    ctx.setLineDash([]); // Ensure solid line
    ctx.stroke();

    // 3. Draw the scaled image (waveform) OVER the background/line (if it exists)
    if (lastScrollingCanvasImage && !isNaN(newScale) && !isNaN(lastScrollingCanvasScale) && newScale > 0 && lastScrollingCanvasScale > 0) {
        const relativeScale = newScale / lastScrollingCanvasScale;
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = lastScrollingCanvasImage.width;
        tempCanvas.height = lastScrollingCanvasImage.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.putImageData(lastScrollingCanvasImage, 0, 0);
        
        const centerY = canvasHeight / 2;
        ctx.save();
        ctx.translate(0, centerY);
        ctx.scale(1, relativeScale);
        ctx.translate(0, -centerY);
        // Make sure the source image is drawn with appropriate compositing
        // Default 'source-over' should draw the opaque waveform over the background/line
        ctx.drawImage(tempCanvas, 0, 0, tempCanvas.width, tempCanvas.height, 0, 0, canvasWidth, canvasHeight);
        ctx.restore();
    } else {
        console.log("No stored image or invalid scale for static scrolling redraw.");
    }

    // 4. Redraw the axis 
    drawScrollingWaveformAxis(controls);
    // Comment out this log
    // console.log(`Redrew static scrolling waveform. ` + (lastScrollingCanvasImage ? `Original Scale: ${lastScrollingCanvasScale.toFixed(2)}, New Scale: ${newScale.toFixed(2)}` : 'No image.'));
} 