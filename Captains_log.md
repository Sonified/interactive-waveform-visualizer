# Captain's Log: Reset - Spectrogram Axis Alignment Saga

## Robert's Assessment (Direct Quote):

What!? the fact that you wrote THAT in the log is telling...  do you see that we've been talking about trying to re-align the axis canvas ticks with the spectrogram ticks... that whole saga... I'm exhausted by you! Go into our chat history and see what's really been going on and completely re-0write what we're trying to do... the top and bottom. of the tick labels were getting cut off so I said let's extend the canvas size and we did but then they no longer aligned... but then you got them to align perfetly but the top was still clipped, and we tried to figure it out and discovered you had aligned the tops of the canvases when there should have been padding on both sides... properly document our goal please.

## Clarification on CSS Offset:

Based on Robert's correction, the `position: relative; top: -5px;` CSS offset applied to the `#spectrogram-axis-canvas` is considered essential and potentially the "saving grace" for achieving the desired alignment *after* the axis canvas height was increased to prevent label clipping.

## Note to Self: Strict Alignment Requirement

*   **Goal:** Achieve **perfect 1:1 visual alignment** between the spectrogram axis labels/ticks and the corresponding frequencies on the main spectrogram canvas.
    *   **Clarification:** To accommodate labels (like the highest frequency, e.g., 22kHz) without clipping them at the very top or bottom edge, the axis canvas must extend slightly *beyond* the vertical boundaries of the main spectrogram canvas. Despite this size difference, the *drawn* ticks and labels must still align precisely with the corresponding points on the spectrogram's frequency scale. (We are using a helper function to visually verify this by drawing horizontal lines directly onto the spectrogram canvas at specific frequencies, which should perfectly match the corresponding ticks/labels on the axis canvas).
*   **Non-Goal:** Preventing visual "clipping" by compromising alignment.
*   **Mandate:** **NO HACKS.** Any code that attempts to adjust label positions near the edges to *avoid* clipping (e.g., shifting top labels down, bottom labels up, changing `textBaseline` based on position) is counter to the goal and **must be removed**. The calculated `y` position must be used directly without edge-case adjustments that break the 1:1 mapping. 

## Current State & Path Forward:

*   **Status:** Perfect visual 1:1 alignment between the spectrogram axis ticks/labels and the main spectrogram canvas has been achieved.
*   **Problem:** The highest frequency label (e.g., 22kHz) is clipped at the top edge of the axis canvas.
*   **Root Cause:** The current alignment relies solely on JavaScript calculations. To prevent clipping, the axis canvas needs padding, and its position needs adjustment.
*   **Solution Strategy:**
    1.  **Increase Axis Canvas Height:** Make `#spectrogram-axis-canvas` exactly 10px taller than the `#spectrogram-canvas` (providing 5px padding above and 5px below the spectrogram's vertical range).
    2.  **Apply CSS Offset:** Use `position: relative; top: -5px;` on `#spectrogram-axis-canvas` to visually shift it upwards, aligning the *start* of its drawing area with the *start* of the main spectrogram canvas.
    3.  **Adjust JS Calculation:** Modify the `drawSpectrogramAxis` function in `js/visualizer.js`. The `y` coordinate calculation for drawing labels/ticks needs to be adjusted to account for the 5px upward CSS shift. The final calculated `y` position must effectively add 5px to the currently calculated `spectrogram_y` value to ensure the drawn elements align correctly with the main spectrogram despite the taller canvas and the CSS offset.

## Solution Implemented (Spectrogram Axis Alignment/Clipping)

*   **Status:** FIXED
*   **Summary:** The top label clipping issue on the spectrogram axis has been resolved while maintaining perfect 1:1 visual alignment.
*   **Implementation Steps:**
    1.  **CSS Offset:** The `#spectrogram-axis-canvas` CSS rule in `Interactive_Waveform_Visualizer.html` was updated to include `position: relative; top: -5px;`. This shifts the axis canvas upwards visually.
    2.  **Canvas Height:** The `resizeCanvases` function in `js/visualizer.js` already correctly set the `#spectrogram-axis-canvas` height to be 10px taller than the main `#spectrogram-canvas` (using `finalSpectrogramHeight + 2 * AXIS_VERTICAL_PADDING` where `AXIS_VERTICAL_PADDING` is 5). This provides the necessary space for the offset and prevents clipping.
    3.  **JS Calculation Adjustment:** The `drawSpectrogramAxis` function in `js/visualizer.js` was modified. The final `y` coordinate for drawing ticks/labels is now consistently calculated by taking the corresponding pixel position on the main spectrogram (`spectrogram_y`) and adding the `AXIS_VERTICAL_PADDING` (5px). This compensates for the CSS offset and ensures correct alignment on the taller canvas.

## Spectrogram Debug Lines & Frequency Updates

*   **Log Scale Debug Lines:** Added functionality to draw horizontal debug lines on the main spectrogram canvas for the logarithmic scale, mirroring the existing functionality for the linear scale. This helps visually verify alignment between the spectrogram content and the axis labels.
*   **Current Frequencies (Labels & Debug Lines):**
    *   **Logarithmic:** 0 Hz (bottom edge), 30 Hz, 50 Hz, 75 Hz, 100 Hz, 150 Hz, 200 Hz, 300 Hz, 400 Hz, 500 Hz, 750 Hz, 1 kHz, 1.5 kHz, 2 kHz, 3 kHz, 4 kHz, 5 kHz, 7.5 kHz, 10 kHz, 15 kHz, 20 kHz.
    *   **Linear:** 0 Hz (bottom edge), 1 kHz, 2 kHz, 3 kHz, 4 kHz, 5 kHz, 6 kHz, 7 kHz, 8 kHz, 9 kHz, 10 kHz, 11 kHz, 12 kHz, 13 kHz, 14 kHz, 15 kHz, 16 kHz, 17 kHz, 18 kHz, 19 kHz, 20 kHz, 21 kHz, 22 kHz.
    *   *(Note: 100 Hz was removed from the linear scale).*

## Axis Label Ghosting Fix (Dark Mode)

*   **Problem:** When switching frequency scales (Linear/Log) in the Midnight Blue theme, faint "shadows" or "ghosts" of the previous scale's labels remained visible on the spectrogram axis canvas.
*   **Cause:** The `drawSpectrogramAxis` function was clearing the canvas using a semi-transparent background color (`rgba(10, 15, 46, 0.8)`) in dark mode. This didn't fully erase the previously drawn labels.
*   **Solution:** Modified `drawSpectrogramAxis` in `js/visualizer.js` to use a fully opaque background color (`rgb(10, 15, 46)`) for clearing the canvas in dark mode, ensuring previous content is completely erased before redrawing.

## UI Style Refinements

*   **Main Title (`<h1>`):**
    *   Reduced top margin to `8px`.
    *   Reduced font size to `1.8em`.
    *   Removed text shadow in both light and dark themes.
*   **Visualizer Titles (`.main-canvas-wrapper h3`):**
    *   Centered text alignment.
    *   Reduced font size to `1.0em`.
    *   Adjusted bottom margin to `10px`.
    *   Reduced space above titles by setting `padding-top: 10px;` on the parent `.visualization-panel`.
*   **Canvas Heights:**
    *   Increased overall height allocated to canvases by reducing estimated `paddingAndMargins` and `controlsApproxHeight` constants within the `resizeCanvases` function in `js/visualizer.js`.
    *   Adjusted final distribution: Subtracted 35px from `finalWaveformHeight` and added 80px to `finalSpectrogramHeight` to make the spectrogram significantly taller relative to the waveforms.
*   **Panel Spacing & Styling:**
    *   Reduced vertical space between visualization panels by setting `margin-bottom: 10px;` on `.visualization-panel`.
    *   Reduced border thickness (`border-left`, `border-bottom`) to `3px` for `.visualization-panel`, `.controls-file`, and `.controls-generated` in both themes.
    *   Reduced intensity and offset of `box-shadow` for all panels in both themes.

## Playback Speed Slider Default Correction

*   **Problem:** After changing the playback speed range to 0.1x-4.0x, the default slider value of 50 no longer corresponded to the desired default speed of 1.0x due to the logarithmic mapping.
*   **Solution:**
    1.  Calculated the slider value (0-100 range) that maps logarithmically to a 1.0x playback rate. The closest integer value is 62 (which technically yields ~0.98x).
    2.  Updated the `value` attribute of the `#playback-rate` slider input in `Interactive_Waveform_Visualizer.html` to `62`.
    3.  Modified the `initializeUIValues` function in `js/ui.js` to explicitly set the slider's initial value to `62` and force the associated text display (`#playback-rate-value`) to show exactly `"1.00x"` on page load for user clarity, overriding the slightly off calculated value.

## File Input UI & Bug Fix

*   **UI Update:**
    *   Removed the "None Chosen" text span that appeared next to the "Load File" button.
    *   Changed the "Choose Local File" button text to "Load File".
    *   Added the `breathing` animation class to the "Load File" button and the "Select Pre-loaded File" dropdown to indicate they are initial action points.
    *   Ensured the "Load File" button has the green `play-style` class by default, making it visually active.
*   **Bug Fix:**
    *   Resolved a `TypeError: Cannot set properties of null (setting 'textContent')` occurring in `main.js`.
    *   **Cause:** The error happened when selecting a preloaded file because the code was still trying to update the `textContent` of the `span#selected-file-name` element, which had been removed from the HTML.
    *   **Solution:** Removed the lines of code in the `preloadedSelect` event listener in `main.js` that attempted to access the non-existent span.

## Breathing Animation Persistence Fix

*   **Problem:** The `breathing` animation on the "Load File" button (`#choose-local-file-button`) and "Select Pre-loaded File" dropdown (`#preloaded-audio-select`) was intended to stop after user interaction, but the exact desired behavior wasn't implemented.
*   **Requirement:** The breathing animation should only be active *before* the very first audio playback (either generated or file). After the first play action, the animation should be permanently removed from these two elements for the current session.
*   **Requirement Update:** The breathing animation should also stop the first time a user interacts with a *generator* slider (causing preview audio), as this is also an initial sound-producing action.
*   **Solution:**
    1.  Introduced a global flag `isFirstPlay = true` in `js/main.js`.
    2.  Modified `toggleGeneratedAudio` and `toggleFileAudio` in `js/audio.js` to check `isFirstPlay`. If true when toggling audio, remove breathing classes from file inputs and set `isFirstPlay` to `false`.
    3.  Modified `handleGeneratorSliderInteractionStart` in `js/ui.js` to *also* check `isFirstPlay`. If true when preview audio starts, remove breathing classes from file inputs and set `isFirstPlay` to `false`.
    4.  Corrected the element ID used in the JavaScript from `'local-file-label'` to the actual button ID `'choose-local-file-button'`.
    5.  Removed redundant code in `js/ui.js` that incorrectly removed the `breathing` class on file selection rather than first play.
    6.  The existing CSS rule `body.audio-active .breathing { animation: none !important; }` correctly handles pausing the animation on other elements (like the play buttons themselves) *while* audio is active, complementing the permanent removal logic for the file inputs.

## File Playback Control Refinements

*   **Play/Pause Button Text:** Changed the text displayed on the `#play-pause-file-button` from "Play File" / "Pause File" to simply "Play" / "Pause" via the `updateButtonState` function in `js/ui.js`.
*   **Restart Button:**
    1.  Added a "Restart" button (`#restart-file-button`) next to the file Play/Pause button in `Interactive_Waveform_Visualizer.html`.
    2.  Implemented a `restartAudioFile` function in `js/audio.js`.
    3.  Added an event listener in `js/ui.js` to call `restartAudioFile` when the button is clicked.
    4.  Modified `updateButtonState` in `js/ui.js` to automatically disable/enable the Restart button whenever the Play/Pause button is disabled/enabled.

## Default File Info Display Update

*   **Requirement:** Display default placeholder text in the file info area (`#file-info-display`) before any file is loaded.
*   **Implementation:**
    1.  Set the initial HTML content of `#file-info-display` to `<p>File: --</p><p>Duration: --</p>`.
    2.  Updated the `change` event listeners for the preloaded dropdown (`js/main.js`) and the local file input (`js/ui.js`) to reset the `innerHTML` of `#file-info-display` to the default string if no file is selected or selection is cancelled.
    3.  Removed code from `handleFileSelect` (`js/audio.js`) that prematurely updated the display before decoding.

## File Control Spacing Adjustment Saga

*   **Problem:** Unwanted vertical space exists between the `div` containing the "Load File" button (`#load-file-container`) and the paragraph below it displaying the supported file formats (`<p class="file-info">Supported: <span id="browser-formats">...</span></p>`). The goal is to reduce this gap.
*   **Debugging Attempts:**
    1.  Reduced `margin-top` on the "Supported:" paragraph via inline style (no effect).
    2.  Added `margin-bottom` to the `#load-file-container` via inline style (no effect).
    3.  Added CSS rules with `!important` to force `margin-top: 0;` on the paragraph and `margin-bottom: 0;` on the button container (no effect).
    4.  Adjusted `padding-bottom` on the parent `.control-group` (reverted).
    5.  Identified an existing CSS rule (`.controls-file p.file-info { margin-top: 0; }`) that should already be removing the top margin from the paragraph.
    6.  Added `!important` to the existing rule and added a more specific `:has()` rule to target the button container's `margin-bottom` (reverted).
    7.  Added an ID (`#load-file-container`) to the button container div.
    8.  Added CSS rule `#load-file-container { margin-bottom: 0 !important; }` (no effect).
    9.  Added `padding-bottom: 0 !important;` to the `#load-file-container` rule (no effect).
*   **Root Cause Analysis:** The persistent spacing was caused by an *inline style* (`margin-top: 5px;`) directly on the `<p class="file-info">` tag containing the "Supported:" text. This inline style had higher specificity than the CSS rules attempting to override it.
*   **Solution:** Removed the inline `margin-top: 5px;` style from the paragraph tag in `Interactive_Waveform_Visualizer.html`. This allowed the existing `.controls-file p.file-info { margin-top: 0; }` rule to take effect.
*   **Refinement:** Centered the "Supported:" text and moved it further up by modifying the `.controls-file p.file-info` rule to include `text-align: center;` and `margin-top: -8px;`. A comment was added to this rule clarifying its purpose.
*   **Current Status:** The spacing issue is resolved, and the "Supported:" text is centered and positioned higher.

## Restart Button Restoration Saga

*   **Problem:** The previously implemented "Restart" button functionality (including the button element itself in the HTML, the event listener, and the button state logic in `js/ui.js`) mysteriously disappeared from the codebase.
*   **Investigation:**
    1.  Confirmed the core `restartAudioFile` function still existed in `js/audio.js`.
    2.  Used `grep` to confirm the `#restart-file-button` element was missing from `Interactive_Waveform_Visualizer.html`.
    3.  Used `grep` to confirm references to `#restart-file-button` were missing from `js/ui.js`.
*   **Restoration Steps:**
    1.  **HTML:** Re-added the `<button id="restart-file-button">...<button>` element immediately after the `#play-pause-file-button` in `Interactive_Waveform_Visualizer.html`.
    2.  **JS (`js/ui.js`):**
        *   Re-added the event listener in `setupEventListeners` to call `restartAudioFile` on button click.
        *   Modified `updateButtonState` to correctly set the text content of the `#play-pause-file-button` to "Play"/"Pause".
        *   Modified `updateButtonState` to find the `#restart-file-button` and synchronize its `disabled` state with the play/pause button.
    3.  **Layout Fix:** Wrapped the Play and Restart buttons in a `div` with `display: flex` to ensure they rendered side-by-side instead of stacking vertically.
    4.  **Styling Fix:**
        *   Removed the `play-style` class from the Restart button.
        *   Added specific CSS rules targeting `#restart-file-button:not(:disabled)` to ensure it appears blue in both light and dark themes when enabled, improving visual distinction from the disabled state in light mode.
*   **Current Status:** The Restart button functionality and layout have been fully restored and styled correctly.

## File Input Button UI Refinement

*   **Initial Change:** Modified the text on the `#choose-local-file-button` from "Load File" to "Or Load a File" in `Interactive_Waveform_Visualizer.html` to clarify its relationship with the preloaded file dropdown.
*   **Dynamic Update:** Added JavaScript logic to automatically change the button text back to "Load File" after a user successfully selects either a preloaded file (via `js/main.js`) or a local file (via `js/ui.js`).

## Playback Speed Control Enable/Disable Logic

*   **Requirement:** Prevent interaction with the playback speed slider (`#playback-rate`) until an audio file is successfully loaded.
*   **Implementation:**
    1.  **HTML:** Added the `disabled` attribute to the slider input in `Interactive_Waveform_Visualizer.html` to disable it by default.
    2.  **JS - Enable:** Modified the `handleAudioDataLoad` function in `js/audio.js` to find the slider element and set its `disabled` property to `false` upon successful decoding of an audio buffer.
    3.  **JS - Disable:** Modified the relevant event handlers/functions to find the slider element and set its `disabled` property back to `true` in the following scenarios:
        *   User selects "-- Select a file --" from the preloaded dropdown (`js/main.js`).
        *   User cancels the local file selection dialog (`js/ui.js`).
        *   An error occurs during file reading (`handleFileError` in `js/audio.js`).
        *   (Note: Decode errors in `handleAudioDataLoad` also implicitly prevent enabling).
*   **Current Status:** The playback speed slider is now correctly disabled until a file is loaded and is re-disabled if the file selection is cancelled or fails.

## Spectrogram Debug Line Toggle

*   **Requirement:** Allow the horizontal frequency lines drawn on the main spectrogram (used for visual alignment debugging with the axis canvas) to be easily enabled or disabled via code.
*   **Implementation:**
    1.  Added a constant `DRAW_SPECTROGRAM_DEBUG_LINES` at the top of `js/visualizer.js`.
    2.  Added a comment explaining the purpose of this constant and the debug lines.
    3.  Wrapped the code responsible for drawing both linear and logarithmic debug lines within the `drawSpectrogram` function inside an `if (DRAW_SPECTROGRAM_DEBUG_LINES)` block.
    4.  Set the default value of `DRAW_SPECTROGRAM_DEBUG_LINES` to `false`, so the lines are hidden by default.
*   **Bug Fix:** The initial implementation inadvertently removed the core spectrogram rendering logic along with the debug lines, resulting in a blank canvas. This was corrected by restoring the original rendering code for both linear and logarithmic scales and ensuring the `if (DRAW_SPECTROGRAM_DEBUG_LINES)` block *only* encloses the debug line drawing loops.
*   **Refinement:** Adjusted the `getColor` function to accept byte values (0-255) directly from the restored rendering logic and perform normalization internally, ensuring correct color mapping.
*   **Current Status:** The spectrogram renders correctly. The debug lines are hidden by default but can be easily re-enabled for alignment verification by changing the constant to `true`.

## Waveform Zero Line Background Reference

*   **Requirement:** Add a static, thin, light grey horizontal line at the zero amplitude point (y=0) on both the instantaneous and scrolling waveform canvases to serve as a visual reference behind the waveform data. The line should be visible on page load.
*   **Implementation Steps & Challenges:**
    1.  **Initial Implementation:** Added code to draw the zero line after clearing the background but before drawing the waveform in all four relevant functions (`drawInstantaneousWaveform`, `drawScrollingWaveform`, `redrawStaticInstantaneousWaveform`, `redrawStaticScrollingWaveformFromImage`). The line color alpha was set to `0.35`.
    2.  **Initial Load:** Added code to `resizeCanvases` to call the static redraw functions on load, ensuring the line was visible immediately.
    3.  **Scrolling Waveform Bug:** The initial implementation for the scrolling waveform (`drawScrollingWaveform`) caused the line to be drawn *over* the waveform due to incorrect interaction with the `putImageData` step used for shifting the canvas content.
    4.  **Correction Attempts:** Several attempts were made to fix the drawing order in `drawScrollingWaveform` (e.g., drawing the line last, attempting layering with a second canvas - rejected), none of which correctly placed the static line behind the scrolling waveform while preserving the scrolled data.
    5.  **Final Solution (Single Canvas):** The correct order for the single scrolling canvas (`drawScrollingWaveform` and `redrawStaticScrollingWaveformFromImage`) was established:
        *   Capture the portion of the existing waveform image to be shifted.
        *   Clear the entire canvas with the background color.
        *   Draw the static zero line onto the cleared background.
        *   Use `putImageData` to place the captured (old) waveform data back onto the canvas, drawing *over* the background and zero line in the shifted area.
        *   Draw the new waveform segment in the rightmost column, also drawing *over* the background and zero line in that area.
    6.  **Initial Load (Refined):** The `resizeCanvases` function was updated to directly draw the background and zero line on the waveform canvases initially, rather than calling the full static redraw functions.
*   **Current Status:** A static, light-grey (alpha 0.35) zero line is correctly displayed *behind* the waveform data on both the instantaneous and scrolling canvases, visible on page load and during playback/pause states.

## Breathing Animation Refinement (Background vs. Filter)

*   **Initial State:** A single `breathing` animation using `filter: brightness` was applied via the `.breathing` class to the file select dropdown, load file button, and generated play button.
*   **Requirement 1:** Make the animation effect ~33% more pronounced. (Implemented by adjusting brightness values in `@keyframes breathing` and `@keyframes breathing-dark`).
*   **Requirement 2:** Modify the animation so it only affects the *background* of the buttons, leaving the text undimmed.
*   **Attempt 1 (Failed):** Replaced brightness keyframes with background-color keyframes (`breathing-bg-light`, `breathing-bg-dark`) applied via the generic `.breathing` class. This caused widespread formatting issues, likely due to conflicts with base styles when animating background-color directly on diverse elements.
*   **Attempt 2 (Partial Success):**
    *   Removed old brightness keyframes and the generic `.breathing` CSS rule.
    *   Created new background-color keyframes (`breathing-bg-light`, `breathing-bg-dark`).
    *   Applied these background animations *only* to the specific button IDs (`#choose-local-file-button`, `#play-pause-generated-button`) when the `.breathing` class was present.
    *   **Omission:** Forgot to re-implement breathing for the select dropdown (`#preloaded-audio-select`).
*   **Attempt 3 (Synchronization Bug):**
    *   Restored the brightness keyframes (renamed `breathing-filter-light`, `breathing-filter-dark`).
    *   Applied the filter keyframes *only* to the select dropdown ID (`#preloaded-audio-select`) when `.breathing` class was present.
    *   **Bug:** The dark theme filter animation (`breathing-filter-dark`) brightened at 50% while the dark theme background animation (`breathing-bg-dark`) dimmed at 50%, causing them to pulse out of phase.
*   **Final Solution:**
    *   Inverted the `@keyframes breathing-filter-dark` animation (swapped 0%/100% and 50% brightness values) so it now dims at the 50% mark, matching the background animation's dimming behavior.
*   **Current Status:** The load file button and generated play button use a background-color pulse. The file select dropdown uses a brightness pulse. Both pulse types dim at the 50% mark in both light and dark themes, ensuring visual synchronization.

## Preloaded File Selection Fix

*   **Problem:** Selecting a new file from the `#preloaded-audio-select` dropdown did not stop any currently playing audio (generated or file) before attempting to load the new file.
*   **Solution:** Modified the `change` event listener for `#preloaded-audio-select` in `js/main.js` to explicitly call `stopGeneratedAudio()` and `stopAudioFile()` at the beginning of the handler, ensuring playback stops before fetching the new file.

## Default Settings Update

*   **Scrolling Speed:** Changed the default `value` attribute for both the Spectrogram (`#scroll-speed`) and Scrolling Waveform (`#scroll-speed-waveform`) sliders to `1` in `Interactive_Waveform_Visualizer.html`.

## Generated Frequency Range Increase

*   **Requirement:** Allow generated audio frequency selection up to 20 kHz.
*   **Solution:** Changed the `max` attribute of the `#frequency` slider in `Interactive_Waveform_Visualizer.html` from `10000` to `20000`.
*   **Related:** Updated the JavaScript functions `updateFrequency` and `updateFrequencyLog` in `js/ui.js` to use `Math.log(20000)` instead of `Math.log(10000)` for calculating the logarithmic mapping, ensuring both the linear and log sliders correctly reflect the new range.

## Post-Refactor Debugging Sprint (Import/Export Issues)

*   **Context:** A key motivation for restructuring the codebase was to facilitate adding new features, notably a loading screen with progress indication for downloading potentially large audio files. This led to significant code refactoring into separate modules (`audio.js`, `visualizer.js`, `ui.js`, `config.js`, `main.js`). Additionally, the main HTML file `Interactive_Waveform_Visualizer.html` was renamed to `index.html` during this refactoring. Following this refactoring, the updated codebase was pushed to GitHub. Upon subsequently loading or pulling this refactored code, a cascade of `ReferenceError` and `SyntaxError` exceptions began appearing. These errors fundamentally stemmed from the new modular structure: dependencies between the modules (functions, variables, etc.) were not correctly declared using `export` in the source module and `import` in the consuming module. The refactoring introduced these dependency requirements, and the push/subsequent load revealed where they were missing.
*   **Problem Summary:** The core issues revolved around ensuring that all necessary components (functions, DOM element references stored in constants, state variables, analyser nodes, canvas contexts) were correctly shared across the different JavaScript files. This involved meticulously identifying each error, tracing the required component back to its definition file, ensuring it was exported, and adding the corresponding import statement to the file(s) that needed it. Scope issues (using global variable names instead of passed objects) and browser caching occasionally complicated the debugging process.
*   **Specific Errors Addressed & Fixes:**
    *   `ReferenceError: setupUIEventListeners has already been declared`: Caused by duplicate function definition in `js/ui.js`; removed duplicate.
    *   `ReferenceError: audioSource is not defined` (in `updatePlaybackRate` within `js/ui.js`): Imported `audioSource` from `js/audio.js`.
    *   `ReferenceError: initializeAudioContext is not defined` (in `handleGeneratorSliderInteractionStart` within `js/ui.js`): Imported `initializeAudioContext` from `js/audio.js`.
    *   `ReferenceError: amplitudeSlider is not defined` (in `startPreviewOscillator` within `js/audio.js`): Imported `amplitudeSlider` from `js/config.js`.
    *   `ReferenceError: waveformTypeSelect is not defined` (in `startPreviewOscillator` within `js/audio.js`): Imported `waveformTypeSelect` from `js/config.js`.
    *   `ReferenceError: frequencySlider is not defined` (in `startPreviewOscillator` within `js/audio.js`): Imported `frequencySlider` from `js/config.js`. (Also preemptively added `noiseLevelSlider`, `noiseTypeSelect`).
    *   `ReferenceError: drawInstantaneousWaveformAxis is not defined` (in `js/ui.js`): Imported from `js/visualizer.js`.
    *   `ReferenceError: redrawStaticInstantaneousWaveform is not defined` (in `js/ui.js`): Added `export` to function in `js/visualizer.js` and imported into `js/ui.js`.
    *   `SyntaxError: ...does not provide export named 'redrawStaticInstantaneousWaveform'`: Caused by browser caching an old version of `js/visualizer.js`. Resolved via hard refresh.
    *   `ReferenceError: waveformAnalyser is not defined` (in `updateWaveformAnalyserSettings` within `js/ui.js`): Imported `waveformAnalyser` from `js/audio.js`.
    *   `ReferenceError: drawScrollingWaveformAxis is not defined` (in `js/ui.js`): Imported from `js/visualizer.js`.
    *   `ReferenceError: colorSchemeSelect is not defined` (in `updateColorScheme` within `js/ui.js`): Imported `colorSchemeSelect` from `js/config.js`.
    *   `ReferenceError: spectrogramCtx is not defined` (in spectrogram scale listener within `js/ui.js`): Imported `spectrogramCtx` from `js/visualizer.js`.
    *   `SyntaxError: ...does not provide export named 'spectrogramCanvas'`: Incorrectly imported `spectrogramCanvas` from `js/visualizer.js`. Corrected to import from `js/config.js`.
    *   `ReferenceError: analyser is not defined` (in `updateAnalyserSettings` within `js/ui.js`): Imported `analyser` from `js/audio.js`.
    *   `ReferenceError: playPauseGeneratedButton is not defined` (in `toggleGeneratedAudio` within `js/audio.js`): Corrected function to use `controls.playPauseGeneratedButton` instead of accessing a global variable.
    *   `ReferenceError: redrawStaticScrollingWaveformFromImage is not defined` (in `js/ui.js`): Added `export` to function in `js/visualizer.js` and imported into `js/ui.js`.
    *   `ReferenceError: drawSpectrogramAxis is not defined` (in `js/ui.js`): Imported from `js/visualizer.js`.
*   **Current Status:** All known `ReferenceError` and `SyntaxError` issues related to module imports/exports appear to be resolved. The application loads without these specific errors.

## Current Issue: Axis Canvases Not Drawing on Load

*   **Problem:** Despite resolving the import/export errors, the axis canvases (`#spectrogram-axis-canvas`, `#instantaneous-waveform-axis-canvas`, `#scrolling-waveform-axis-canvas`) are not displaying their content (ticks, labels) when the page initially loads. The main visualization canvases appear correctly.
*   **Investigation:**
    1.  Verified that `js/main.js` calls the respective `draw...Axis` functions within a `setTimeout` callback, after attempting `initializeAudioContext`. This logic appears sound and includes checks for the existence of the `AudioContext` and the relevant axis canvas contexts.
    2.  Added `console.log` statements within `resizeCanvases` in `js/visualizer.js` to confirm that the axis canvas contexts (`...AxisCtx`) are being obtained.
    3.  Added `console.log` statements at the beginning of each `draw...Axis` function in `js/visualizer.js` to verify if they are being called by `main.js`.
*   **Resolution:** This issue is now **RESOLVED**. Subsequent debugging revealed a cascade of JavaScript `ReferenceError` and `SyntaxError` issues (primarily related to missing imports or incorrect variable scopes after the module refactor). Fixing these errors allowed the existing axis drawing logic, which was being called correctly according to logs (`VIS:` logs in `visualizer.js`, explicit call confirmation in `main.js`), to execute successfully on page load.
*   **Current Status:** All axis canvases (Spectrogram, Instantaneous Waveform, Scrolling Waveform) now correctly draw their initial ticks and labels when the page loads.

## Loading Overlay Flicker Fix

*   **Problem:** When selecting a preloaded audio file that was already cached by the browser (or loaded very quickly), the loading overlay would briefly flash grey on the screen because it was shown immediately and then hidden almost instantly upon load completion.
*   **Solution:** Modified the `change` event listener for the preloaded file dropdown (`#preloaded-audio-select`) in `js/main.js`.
    1.  Instead of showing the overlay immediately, `setTimeout` is used to schedule the `showLoadingOverlay` function call after a 150ms delay. The timeout ID is stored.
    2.  In the `onload` and `onerror` handlers for the `XMLHttpRequest` used to fetch the file, `clearTimeout` is called with the stored ID. This cancels the scheduled showing of the overlay if the file load completes (successfully or with an error) before the 150ms delay has elapsed.
*   **Result:** The overlay no longer flickers for instantly loaded files but still appears correctly for files that take longer than 150ms to load.

## Spacebar Play/Pause Fixes

*   **Problem:** The spacebar functionality was broken due to several `ReferenceError` and `TypeError` issues after the refactoring.
    1.  `handleSpacebar` in `js/ui.js` couldn't access `lastUserInitiatedSource` (defined in `js/audio.js`).
    2.  `handleSpacebar` attempted to directly assign values to imported state variables (`wasFilePlayingBeforeSpacePause`, `wasGeneratedPlayingBeforeSpacePause`), which are treated as constants in the importing module.
    3.  `handleSpacebar` called `toggleGeneratedAudio`/`toggleFileAudio` without passing the necessary `controls` object, leading to errors when those functions tried to access button elements (e.g., `controls.playPauseGeneratedButton`).
*   **Solution:**
    1.  Added `export` to `lastUserInitiatedSource` in `js/audio.js` and imported it into `js/ui.js`.
    2.  Added `export` to `wasFilePlayingBeforeSpacePause` and `wasGeneratedPlayingBeforeSpacePause` in `js/audio.js`. Created two new exported functions in `js/audio.js`: `rememberSpacebarPauseState(isFile, isGenerated)` and `resetSpacebarPauseState()`. Modified `handleSpacebar` in `js/ui.js` to import and call these functions instead of attempting direct assignment.
    3.  Modified `handleSpacebar` in `js/ui.js` to accept the `controls` object. Updated the `document.addEventListener('keydown', ...)` call in `setupUIEventListeners` to pass `controls` to `handleSpacebar`. Updated the calls to `toggleGeneratedAudio` and `toggleFileAudio` within `handleSpacebar` to pass `controls`.
*   **Result:** The spacebar now correctly toggles playback for the last used source (generated or file), remembering state across pauses initiated by the spacebar itself.

## Playback Speed Control Enable/Disable Refinement

*   **Problem:** The playback speed slider (`#playback-rate`) was not behaving correctly. Initially, it was found that cancelling a second local file load could incorrectly disable the slider even if a previously loaded file existed. Further testing revealed the slider might also become disabled immediately after the first successful file load.
*   **Investigation & Solution:**
    1.  The initial fix attempt involved making the slider disable logic (within the local file input cancellation handler in `js/ui.js`) conditional on `!audioBuffer`. However, this didn't fully resolve the issue.
    2.  Added `console.log` statements to trace the `disabled` property of the slider in `js/audio.js` (after explicit enabling in `handleFileLoad`/`handleAudioDataLoad`) and in `js/ui.js` (before and after the check in the cancellation handler).
    3.  Ensured the explicit enabling logic (`playbackRateSlider.disabled = false;`) was correctly placed within the successful decode promise handlers (`.then(...)`) in `handleFileLoad` and `handleAudioDataLoad` in `js/audio.js`.
    4.  Confirmed the cancellation logic in `js/ui.js` correctly uses the `!audioBuffer` check (`if (playbackRateSlider && !audioBuffer)`).
*   **Result:** The playback speed slider is now reliably enabled upon successful file decoding and remains enabled if a subsequent file load is cancelled. It is correctly disabled only on initial load, file errors, or cancellation when no valid audio buffer is present.

## File Info Reset on Cancel Fix

*   **Problem:** If a file (File A) was loaded and its information was displayed, initiating a *new* local file load via the "Load File" button and then cancelling the file selection dialog would incorrectly clear the info display, removing the details for File A even though it was still loaded and playable.
*   **Cause:** The `change` event listener for the local file input (`#audio-file`) in `js/ui.js` had logic in its cancellation block (`if (!file)`) that unconditionally reset the `innerHTML` of the `#file-info-display` element to its default placeholder state.
*   **Solution:** Modified the cancellation block in the event listener. The line that resets the `innerHTML` of `#file-info-display` was wrapped in an additional check: `if (infoDisplay && !audioBuffer)`. This ensures the display is only reset to placeholder text if no audio buffer is currently loaded when the cancellation occurs.
*   **Result:** Cancelling the local file dialog now correctly leaves the existing file information displayed if a file was previously loaded.

## FFT/Window Size Visual Update Fix

*   **Problem:** Changing the "FFT Size" (Spectrogram) or "Window Size" (Instantaneous Waveform) dropdowns updated the underlying `AnalyserNode.fftSize` property, but the actual active visualizations (`drawSpectrogram`, `drawInstantaneousWaveform`) did not visually change to reflect the new setting (e.g., frequency resolution in spectrogram, time zoom in waveform).
*   **Investigation & Debugging:**
    1.  **Initial Check:** Verified that the drawing functions (`drawSpectrogram`, `drawInstantaneousWaveform` in `js/visualizer.js`) *were* correctly creating new data arrays (`Uint8Array`) inside their `requestAnimationFrame` loops, sized according to the *current* `analyser.frequencyBinCount` or `waveformAnalyser.fftSize`. This ruled out the hypothesis of fixed-size arrays causing the issue.
    2.  **Console Logging:** Added logs to the UI event handlers (`updateAnalyserSettings`, `updateWaveformAnalyserSettings` in `js/ui.js`) immediately after they set the `fftSize`, and also inside the drawing loops (`drawSpectrogram`, `drawInstantaneousWaveform`) to report the `fftSize` being used.
    3.  **Root Cause Identified:** The logs revealed that the UI event handlers were receiving the analyser nodes (`analyser`, `waveformAnalyser`) via a `controls` object passed during event listener setup. However, this `controls` object was created *before* the analysers were initialized in `audio.js`, and thus didn't actually contain references to them. The UI handlers were attempting to set `fftSize` on `undefined`. Meanwhile, the drawing loops correctly imported and used the *actual* analyser instances exported from `audio.js`, but these instances were never being updated by the UI handlers.
    4.  **Fix 1:** Modified `updateAnalyserSettings` and `updateWaveformAnalyserSettings` in `js/ui.js` to directly use the `analyser` and `waveformAnalyser` instances imported from `audio.js`, removing reliance on the incomplete `controls` object for these nodes.
    5.  **Secondary Error:** After Fix 1, a `TypeError: Cannot read properties of undefined (reading 'clearRect')` occurred in `updateAnalyserSettings`. This was because the same function was *also* incorrectly trying to access `spectrogramCtx` and `spectrogramCanvas` via the `controls` object.
    6.  **Fix 2:** Modified `updateAnalyserSettings` again to use the directly imported `spectrogramCtx` (from `visualizer.js`) and `spectrogramCanvas` (from `config.js`).
*   **Result:** Changing the FFT Size and Window Size dropdowns now correctly updates the respective `AnalyserNode` instances, and the active visualizations (`drawSpectrogram`, `drawInstantaneousWaveform`) visually reflect these changes in real-time during playback.

## Disable Page Scrolling for Desktop App Feel

*   **Requirement:** Prevent the entire page from scrolling using trackpad gestures (or other means) to make the application feel more like a static desktop app.
*   **Goal:** Allow future implementation of custom scroll/zoom behaviors *within* specific visualizer elements (like canvases) by handling `wheel` events directly, without the main page interfering.
*   **Implementation:** Added `overflow: hidden;`, `height: 100%;`, `width: 100%;`, and `padding: 0;` to the `html, body` CSS rule in `index.html`.
*   **Layout Refinement:** Adding `overflow: hidden` caused right-side content to hang off the page due to body padding. Added `* { box-sizing: border-box; }` CSS rule to ensure padding is included within element widths, resolving the layout issue.
*   **Result:** Default browser scrolling for the main page is now disabled, and the overall layout respects the viewport boundaries.

## Future Input/Playback Exploration (`audio-player.html`)

*   **Context:** Separate concept files were created based on explorations with Claude, demonstrating alternative file loading and playback mechanisms. These are located in the `Concepts/` folder.
    *   `Concepts/audio-player.html`: Focuses on a drag-and-drop approach without buttons.
    *   `Concepts/audio-player-with-button.html`: Includes browser detection (`showDirectoryPicker` vs `webkitdirectory`) to provide different button-based folder selection methods for Chromium vs. other browsers, in addition to drag-and-drop.
*   **Reference Only:** For now, these files serve only as a reference and concept for future consideration. They are not currently integrated.
*   **Potential Features to Revisit:**
    *   **Drag-and-Drop Folder:** Implementing a robust drag-and-drop interface for entire folders remains a desired feature (example in both concept files).
    *   **Browser-Specific Buttons:** Offering different button interactions based on browser capabilities (example in `audio-player-with-button.html`).
    *   **Simple File Upload:** Exploring a standard "Upload Files" button approach as an alternative or supplement.
    *   **Playlist/Playback System:** The playlist generation and audio playback logic within the concept files might be adaptable for the main visualizer in the future.

## File Sample Rate Display Issue

*   **Problem:** The file info display (`#file-info-display`) was showing the sample rate of the `AudioContext` (e.g., 96000Hz based on system audio settings) rather than the intrinsic sample rate of the loaded audio file (e.g., 44100Hz).
*   **Investigation:**
    1.  Verified the code (`js/audio.js`) correctly used `buffer.sampleRate` (where `buffer` is the result of `decodeAudioData`) to display the sample rate, which *should* contain the file's intrinsic rate.
    2.  Added `console.log` statements to inspect the `AudioBuffer` object immediately after `decodeAudioData` completed.
    3.  **Root Cause Identified:** The logs confirmed that, in the current browser environment (Chromium), the `decodeAudioData` function was unexpectedly returning the `audioContext.sampleRate` value for the `buffer.sampleRate` property, instead of the actual rate from the file header.
*   **Resolution:** Since the sample rate value provided by `decodeAudioData` was unreliable in this specific browser context and did not reflect the true file sample rate, the decision was made to remove the sample rate information from the file info display string entirely.
*   **Cleanup:** The associated debug `console.log` statement was also removed from `js/audio.js` after confirming the issue.

## Preloaded Audio File Caching

*   **Goal:** Improve loading speed for the preloaded audio files after the first visit.
*   **Implementation:**
    1.  Added a `precacheAudioFiles` async function to `js/main.js`.
    2.  This function fetches `audio_files.json`, opens a named cache (`audio-cache-v1`) using the Cache API, iterates through the files, and uses `fetch` and `cache.put` to store any files not already in the cache.
    3.  Called `precacheAudioFiles()` at the end of the `DOMContentLoaded` listener in `js/main.js` to initiate caching after page setup.
    4.  Modified the `preloadedSelect` event listener in `js/main.js` to use `async/await`.
    5.  The listener now checks the cache (`caches.open`, `cache.match`) *before* attempting a network request.
    6.  If a cached response exists, it's loaded directly.
    7.  If not cached, `fetch` is used (replacing the previous XHR implementation), and the response is cloned and stored in the cache via `cache.put` before being processed.
*   **Result:** Preloaded files should load instantly from the cache on subsequent visits after being precached in the background on the first visit (or after a cache clear).

## Theme Loading Flash (FOUC) Prevention

*   **Problem:** When the "Midnight Blue" theme was selected, reloading the page caused a brief flash of the default light theme before the JavaScript applied the dark theme styles from `localStorage`.
*   **Cause:** Standard JavaScript theme application runs after the initial HTML/CSS render.
*   **Solution:**
    1.  Added a small, inline `<script>` block at the very beginning of the `<head>` in `index.html`.
    2.  This script immediately reads the theme setting from `localStorage`.
    3.  If the dark theme is selected, it adds the `.midnight-blue` class directly to the `<html>` element (`document.documentElement`) *before* the browser renders the body content.
    4.  Updated the CSS rules in `index.html` to target `html.midnight-blue` instead of `body.midnight-blue`.
    5.  Updated the `applyTheme` function in `js/ui.js` to also add/remove the class from `document.documentElement` when the theme is toggled manually.
    6.  Updated theme checks within JavaScript drawing functions (`js/visualizer.js`) to check `document.documentElement.classList.contains('midnight-blue')`.
*   **Result:** The correct theme is applied before the initial page render, eliminating the flash of the light theme when the dark theme is active.

## Smoother Slider Parameter Changes

*   **Problem:** Rapidly dragging the frequency or amplitude sliders caused audible clicks or "zipper noise" distortion. This occurred because each `input` event triggered a new `linearRampToValueAtTime`, potentially creating discontinuities or abrupt changes in the rate of parameter change.
*   **Solution:** Modified the `updateFrequency`, `updateFrequencyLog`, and `updateAmplitude` functions in `js/ui.js`.
    1.  Added a call to `oscillator.frequency.cancelScheduledValues(now)` or `oscillatorGain.gain.cancelScheduledValues(now)` before applying the new value to clear any pending ramps.
    2.  Replaced `linearRampToValueAtTime` with `setTargetAtTime(targetValue, now, timeConstant)`.
    3.  Used a `timeConstant` of `0.015` for both frequency and amplitude, providing a smooth exponential approach to the target value without causing discontinuities when the target updates rapidly during slider dragging.
*   **Result:** Dragging the frequency and amplitude sliders now results in smooth, artifact-free changes to the generated audio.

## Output Limiter Implementation

*   **Problem:** Combining loud audio sources (e.g., a normalized audio file and a high-amplitude generated sine wave) could cause the summed signal level to exceed the digital ceiling (0 dBFS), resulting in harsh clipping distortion.
*   **Solution:** Added a `DynamicsCompressorNode` configured as a limiter to the audio graph in `js/audio.js` (`initializeAudioContext`).
    1.  The node is inserted *after* the `masterGainNode` (where all sources sum) but *before* the final output (`audioContext.destination`) and the analyser nodes.
    2.  Initial Limiter Settings:
        *   `threshold`: -2.0 dBFS
        *   `knee`: 0 dB (hard knee)
        *   `ratio`: 20.0:1
        *   `attack`: 0.003 s (3 ms)
        *   `release`: 0.100 s (100 ms) - *Increased from 50ms to reduce audible pumping.*
*   **Result:** The limiter prevents the final output signal from exceeding -2 dBFS, avoiding harsh digital clipping and replacing it with less noticeable limiting/compression when signals are very loud. The increased release time provides a smoother response.

## Service Worker Reintegration & Merge Conflict Resolution (temp-sw-fixes)

*   **Goal:** Reintroduce and fix the Service Worker functionality, which had been previously removed on the `main` branch during unrelated refactoring, while incorporating other updates (like audio caching) from the `audio-cache-test` branch.
*   **Branch Strategy:**
    1.  Merged `audio-cache-test` into `main` to bring in general caching improvements.
    2.  Created a temporary branch `temp-sw-fixes` off `main` to specifically address the Service Worker.
    3.  In `temp-sw-fixes`, the `service-worker.js` file (which had been deleted on `main`) was reintroduced and modified (e.g., for audio caching priorities).
*   **Merge Conflict:** When merging `temp-sw-fixes` back into `main`, a conflict arose for `service-worker.js`:
    *   `main` (HEAD): File deleted.
    *   `temp-sw-fixes`: File modified.
*   **Resolution:** The conflict was resolved by choosing the version from `temp-sw-fixes` (`git add service-worker.js`), effectively overriding the deletion on `main` and keeping the necessary Service Worker file.
*   **Outcome:** `temp-sw-fixes` was successfully merged into `main`, incorporating the restored and updated `service-worker.js`.

Note: When using align-items: stretch for vertical alignment in a flex row, the effective min-height of the entire row is determined by the tallest minimum height among its children (considering both explicit CSS min-height and the natural height of the content within those children). To guarantee a specific minimum height for all items with stretch, you must ensure every item can naturally achieve or exceed that height, either through its own min-height or its content.

Existing bugs: 
1. Height calculations are wonky. Can't get main spectrogram to shrink any farther.
2. Caching the code is a bit weird for development, leading to issues of wrong file loading at times, though it can be helped by having Application -> service workers -> update on reload and Network -> disable cache and clearing the cache under applications storage. I'm not sure what of that is really necessary though.
3. File loading bar and loading numbers still do not show.
4. The load color for midnight blue background should match the blue gradient, I can't figure out how to override solid black