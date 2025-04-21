# Interactive Waveform Visualizer

This project provides an interactive web-based application for visualizing audio waveforms, spectrograms, and generating simple tones/noise. Users can load local audio files, select preloaded samples, or use the built-in generator, while controlling various audio and visual parameters.

## Project Structure & Key Files

This README aims to provide enough context to understand the codebase without needing to read every file initially.

*   **`index.html`**: The main HTML file defining the application structure, including all UI elements (canvases, controls, buttons, sliders, dropdowns) and layout. It also includes initial CSS and the critical theme-loading script to prevent FOUC (Flash Of Unstyled Content).
*   **`service-worker.js`**: Implements offline caching using a cache-first strategy. It prioritizes caching preloaded audio files during installation and dynamically caches other application assets (HTML, JS, CSS, images) and fetched audio files.
*   **`audio_files.json`**: A simple JSON list of filenames for the preloaded audio samples.
*   **`Audio_Files/`**: Directory containing the actual audio files listed in `audio_files.json`. These files include scientific data files (WAV format) and a music track (MP3 format), approximately 10MB in size combined.
*   **`js/`**: Directory containing the core JavaScript modules:
    *   **`config.js`**: Centralizes DOM element lookups. Exports constants representing references to all major UI elements (canvases, sliders, buttons, etc.), making them easily accessible to other modules.
    *   **`main.js`**: The main application entry point. Handles initialization (`DOMContentLoaded`), service worker registration, loading preloaded file lists, initial UI setup, theme initialization, initial canvas sizing/drawing, and coordinating calls between other modules.
    *   **`audio.js`**: Manages all Web Audio API logic. Initializes the `AudioContext`, creates and connects audio nodes (`AnalyserNode`s, `GainNode`s, `OscillatorNode`, noise generation, `DynamicsCompressorNode` limiter). Handles loading, decoding, playing, pausing, stopping, and restarting audio (generated and file-based). Manages audio playback state.
    *   **`visualizer.js`**: Contains all canvas drawing logic. Uses `requestAnimationFrame` to render the instantaneous waveform, scrolling waveform, and spectrogram based on data from the `AnalyserNode`s in `audio.js`. Also handles drawing the corresponding axes, resizing canvases, managing theme-aware colors, and static redraws when audio is paused.
    *   **`ui.js`**: Handles user interactions. Sets up event listeners for all controls, updates UI elements (button states, slider values), manages theme switching, links related controls, translates UI values to audio/visual parameters, handles spacebar controls, and manages the loading overlay display.
    *   **`slider_adjust.js`**: Contains code for dynamically adjusting the layout and styling of control panel sliders, likely intended for development/debugging purposes. **Note:** The associated HTML and `<script>` tag for this functionality are currently commented out in `index.html` and may require updates before being used.
*   **`Concepts/`**: Contains exploratory code and notes for potential future features, such as multi-threading (`multi-threading.md`) and alternative file loading mechanisms (`audio-player.html`, `audio-player-with-button.html`). Also includes `GPU-Acceleration-ThreeJS.md`, which outlines a future implementation for WebGL-accelerated spectrograms that would require a major rewrite of the drawing code. These are **reference only** and not currently integrated.
*   **`Captains_Logs/`**: Contains markdown files documenting the development process, decisions, and encountered issues. `Captains_Log_2025_04_20.md` provides a recent summary.
*   **`Archive/`**: Contains older versions of HTML files that are no longer in use. The `slider_testing.html` file includes an attempted implementation that would allow users to adjust the layout in the UI to find ideal values and track issues with competing CSS, JavaScript, and HTML code in complex parent-child relationships. This functionality is currently commented out in the main code.
*   **`Images/`**: Contains image assets, like the application icon.
*   **`README.md`**: This file.
*   **`.gitignore`**: Standard Git ignore file.

## Codebase Interaction & Nuances

Understanding these points will help grasp how the modules work together:

*   **Modularity & Dependencies:** The code is structured into ES6 modules (`import`/`export`). Key shared instances (like `audioContext`, `analyser` nodes, state flags) are exported from their defining module (`audio.js`) and imported where needed. DOM elements are centralized in `config.js` and imported by modules that interact with the UI (`main.js`, `ui.js`, `visualizer.js`).
*   **Initialization Flow (`main.js`):** Critical setup occurs on `DOMContentLoaded`. Service worker registration is initiated. UI elements are referenced (via `config.js`), initial values/themes are set (`ui.js`), canvas sizes are determined (`visualizer.js`), and event listeners are attached (`ui.js`). `AudioContext` initialization and initial axis drawing are deferred slightly using `setTimeout(..., 0)` to ensure the main thread isn't blocked immediately and necessary DOM elements/styles are ready.
*   **State Management (`audio.js`, `ui.js`):** Core playback states (`isGeneratedPlaying`, `isFilePlaying`, `isPreviewing`, `isFirstPlay`, `lastUserInitiatedSource`, spacebar pause states) are managed primarily within `audio.js` and exported. UI elements are updated based on these states via functions in `ui.js` (e.g., `updateButtonState`). Body classes (`.audio-active`) are also used to reflect global audio state for CSS styling (like pausing breathing animations).
*   **Event Handling (`ui.js` -> `audio.js`/`visualizer.js`):** User interactions with controls (captured in `ui.js`) trigger functions primarily in `audio.js` (e.g., `toggleGeneratedAudio`, `updateOscillatorType`, `handleFileSelect`) or `visualizer.js` (e.g., `drawSpectrogramAxis` when scale type changes). Some UI events trigger redraws or state updates within `ui.js` itself (e.g., updating slider value displays).
*   **Audio Processing Graph (`audio.js`):** Audio sources (oscillator, noise, file buffer source) are connected to Gain nodes, which then merge into a `masterGainNode`. This master gain feeds into a `DynamicsCompressorNode` (acting as a limiter to prevent harsh digital clipping when multiple loud sources are combined) before splitting to the various `AnalyserNode`s (one for each visualization type) and the final `audioContext.destination`.
*   **Visualization Loop (`visualizer.js`):** Each active visualization runs in its own `requestAnimationFrame` loop (`drawInstantaneousWaveform`, `drawScrollingWaveform`, `drawSpectrogram`). These loops continuously fetch data from their respective `AnalyserNode`s (`getByteTimeDomainData` or `getByteFrequencyData`) and redraw the canvas. The loops check the global playback state flags (imported from `audio.js`) and cancel themselves (`cancelAnimationFrame`) when no audio is playing.
*   **Axis Synchronization (`visualizer.js`, `ui.js`):** Axis canvases (`...AxisCanvas`) are drawn separately from the main data canvases. Axis drawing functions (`draw...Axis`) are called initially (`main.js`), on resize (`visualizer.js`), on theme change (`ui.js`), and when relevant parameters change (e.g., scale type in `ui.js`, zoom/scale sliders in `ui.js`).
*   **Pause/Resume Handling (`visualizer.js`):** When visualization stops, the current image data of the scrolling waveform canvas is captured (`lastScrollingCanvasImage`) along with its vertical scale factor (`lastScrollingCanvasScale`). This allows the waveform to be redrawn statically (`redrawStaticScrollingWaveformFromImage`) when paused or upon resizing/theme changes, preserving the visual state.
*   **Theme Handling (`index.html`, `ui.js`, `visualizer.js`):** A script in `<head>` applies the theme class (`.midnight-blue`) to the `<html>` element *before* rendering to prevent FOUC. `ui.js` handles theme toggling (updating `localStorage` and the class) and triggers redraws. Drawing functions in `visualizer.js` check for the `<html>` class to select appropriate colors.
*   **Service Worker Caching (`service-worker.js`, `main.js`):** The SW intercepts `fetch` requests. For preloaded audio files (requested in `main.js`), it serves from the `audio-cache-v1` if available, otherwise fetches and caches. For app shell assets, it uses `app-shell-cache-v1` similarly.

## Current Status & Known Issues

Refer to the **latest Captain's Log** in the `Captains_Logs/` folder for the most up-to-date status and detailed debugging history. New entries are typically appended to the end of the most recent log file. Key outstanding bugs currently include:
1.  **Layout/Sizing:** Canvas height calculations are problematic, particularly with shrinking the spectrogram.
2.  **Development Caching:** Browser/Service Worker caching can cause issues during development (workarounds exist in browser DevTools).
3.  **Loading Progress:** The file loading progress bar/percentage is not functional.
4.  **Loading Overlay Color:** The loading overlay in the dark theme doesn't match the theme gradient.

## Future Directions

*   Addressing the outstanding bugs.
*   Exploring performance enhancements, potentially using multi-threading concepts from `Concepts/multi-threading.md`.
*   Investigating alternative file/folder loading methods (e.g., drag-and-drop) based on ideas in the `Concepts/` folder.

## Development Notes

*   **Branching:** The primary development branch is `main`. Feature branches (like `audio-cache-test` for caching, `temp-sw-fixes` for Service Worker fixes) were used historically and merged into `main`. See Git history or Captain's Logs for more details.
*   **GitHub Pages Testing:** For internal testing of feature branches before merging, the GitHub Pages source branch can be temporarily switched in the repository settings to deploy and test that specific branch.
*   **Caching During Development:** Browser and Service Worker caching can sometimes interfere with development by serving outdated files. Common workarounds include:
    *   Using browser DevTools (e.g., Chrome: Application -> Service Workers -> check "Update on reload").
    *   Disabling the HTTP cache in DevTools (Network -> check "Disable cache").
    *   Manually clearing site data (Application -> Storage -> Clear site data).
    *   Performing a hard refresh (Cmd+Shift+R or Ctrl+Shift+R).