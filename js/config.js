// --- DOM Element References ---
export const instantaneousWaveformCanvas = document.getElementById('instantaneous-waveform-canvas');
export const scrollingWaveformCanvas = document.getElementById('scrolling-waveform-canvas');
export const spectrogramCanvas = document.getElementById('spectrogram-canvas');
export const spectrogramAxisCanvas = document.getElementById('spectrogram-axis-canvas');
export const instantaneousWaveformAxisCanvas = document.getElementById('instantaneous-waveform-axis-canvas');
export const scrollingWaveformAxisCanvas = document.getElementById('scrolling-waveform-axis-canvas');
export const waveformTypeSelect = document.getElementById('waveform-type');
export const frequencySlider = document.getElementById('frequency');
export const frequencyValue = document.getElementById('frequency-value');
export const frequencyLogSlider = document.getElementById('frequency-log');
export const frequencyLogValue = document.getElementById('frequency-log-value');
export const amplitudeSlider = document.getElementById('amplitude');
export const amplitudeValue = document.getElementById('amplitude-value');
export const noiseLevelSlider = document.getElementById('noise-level');
export const noiseLevelValue = document.getElementById('noise-level-value');
export const noiseTypeSelect = document.getElementById('noise-type');
export const windowSizeSelect = document.getElementById('window-size');
export const scrollSpeedSlider = document.getElementById('scroll-speed');
export const scrollSpeedValue = document.getElementById('scroll-speed-value');
export const colorSchemeSelect = document.getElementById('color-scheme');
export const waveformZoomSlider = document.getElementById('waveform-zoom');
export const waveformZoomValueSpan = document.getElementById('waveform-zoom-value');
export const waveformScaleSlider = document.getElementById('waveform-scale');
export const waveformScaleValueSpan = document.getElementById('waveform-scale-value');
export const scrollingDownsampleSlider = document.getElementById('scrolling-downsample');
export const scrollingDownsampleValueSpan = document.getElementById('scrolling-downsample-value');
export const scrollingScaleSlider = document.getElementById('scrolling-scale');
export const scrollingScaleValueSpan = document.getElementById('scrolling-scale-value');
export const playPauseGeneratedButton = document.getElementById('play-pause-generated-button');
export const playPauseFileButton = document.getElementById('play-pause-file-button');
export const audioFileInput = document.getElementById('audio-file');
export const fileInfoDisplay = document.getElementById('file-info-display');
export const browserFormatsSpan = document.getElementById('browser-formats');
export const spectrogramScaleSelect = document.getElementById('spectrogram-scale-type');
export const playbackRateSlider = document.getElementById('playback-rate');
export const playbackRateValue = document.getElementById('playback-rate-value');
export const waveformWindowSizeSelect = document.getElementById('waveform-window-size');

// --- Add refs for the new scroll speed slider ---
export const scrollSpeedWaveformSlider = document.getElementById('scroll-speed-waveform');
export const scrollSpeedWaveformValueSpan = document.getElementById('scroll-speed-waveform-value');

// --- Ref for FFT Link Checkbox ---
export const linkFftSizeCheckbox = document.getElementById('link-fft-size-checkbox');
export const linkToWaveformCheckbox = document.getElementById('link-to-waveform-checkbox');

// --- Refs for Slider Adjustment Controls ---
export const sliderAdjustToggle = document.getElementById('slider-adjust-toggle');
export const adjControls = {
    left: {
        panel: document.getElementById('left-slider-controls'),
        layoutGrid: document.getElementById('left-layout-grid'),
        gap: document.getElementById('left-gap'),
        gapValue: document.getElementById('left-gap-value'),
        paddingLeft: document.getElementById('left-padding-left'),
        paddingLeftValue: document.getElementById('left-padding-left-value'),
        paddingRight: document.getElementById('left-padding-right'),
        paddingRightValue: document.getElementById('left-padding-right-value'),
        labelWidth: document.getElementById('left-label-width'),
        labelWidthValue: document.getElementById('left-label-width-value'),
        labelUnitToggle: document.getElementById('left-label-unit-toggle'),
        labelUnit: document.getElementById('left-label-unit'),
        valueWidth: document.getElementById('left-value-width'),
        valueWidthValue: document.getElementById('left-value-width-value'),
        valueUnitToggle: document.getElementById('left-value-unit-toggle'),
        valueUnit: document.getElementById('left-value-unit'),
    },
    right: {
        panel: document.getElementById('right-slider-controls'),
        layoutGrid: document.getElementById('right-layout-grid'),
        gap: document.getElementById('right-gap'),
        gapValue: document.getElementById('right-gap-value'),
        paddingLeft: document.getElementById('right-padding-left'),
        paddingLeftValue: document.getElementById('right-padding-left-value'),
        paddingRight: document.getElementById('right-padding-right'),
        paddingRightValue: document.getElementById('right-padding-right-value'),
        labelWidth: document.getElementById('right-label-width'),
        labelWidthValue: document.getElementById('right-label-width-value'),
        labelUnitToggle: document.getElementById('right-label-unit-toggle'),
        labelUnit: document.getElementById('right-label-unit'),
        valueWidth: document.getElementById('right-value-width'),
        valueWidthValue: document.getElementById('right-value-width-value'),
        valueUnitToggle: document.getElementById('right-value-unit-toggle'),
        valueUnit: document.getElementById('right-value-unit'),
    }
}; 