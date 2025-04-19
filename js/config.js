// --- DOM Element References ---
const instantaneousWaveformCanvas = document.getElementById('instantaneous-waveform-canvas');
const scrollingWaveformCanvas = document.getElementById('scrolling-waveform-canvas');
const spectrogramCanvas = document.getElementById('spectrogram-canvas');
const spectrogramAxisCanvas = document.getElementById('spectrogram-axis-canvas');
const instantaneousWaveformAxisCanvas = document.getElementById('instantaneous-waveform-axis-canvas');
const scrollingWaveformAxisCanvas = document.getElementById('scrolling-waveform-axis-canvas');
const waveformTypeSelect = document.getElementById('waveform-type');
const frequencySlider = document.getElementById('frequency');
const frequencyValue = document.getElementById('frequency-value');
const frequencyLogSlider = document.getElementById('frequency-log');
const frequencyLogValue = document.getElementById('frequency-log-value');
const amplitudeSlider = document.getElementById('amplitude');
const amplitudeValue = document.getElementById('amplitude-value');
const noiseLevelSlider = document.getElementById('noise-level');
const noiseLevelValue = document.getElementById('noise-level-value');
const noiseTypeSelect = document.getElementById('noise-type');
const windowSizeSelect = document.getElementById('window-size');
const scrollSpeedSlider = document.getElementById('scroll-speed');
const scrollSpeedValue = document.getElementById('scroll-speed-value');
const colorSchemeSelect = document.getElementById('color-scheme');
const waveformZoomSlider = document.getElementById('waveform-zoom');
const waveformZoomValueSpan = document.getElementById('waveform-zoom-value');
const waveformScaleSlider = document.getElementById('waveform-scale');
const waveformScaleValueSpan = document.getElementById('waveform-scale-value');
const scrollingDownsampleSlider = document.getElementById('scrolling-downsample');
const scrollingDownsampleValueSpan = document.getElementById('scrolling-downsample-value');
const scrollingScaleSlider = document.getElementById('scrolling-scale');
const scrollingScaleValueSpan = document.getElementById('scrolling-scale-value');
const playPauseGeneratedButton = document.getElementById('play-pause-generated-button');
const playPauseFileButton = document.getElementById('play-pause-file-button');
const audioFileInput = document.getElementById('audio-file');
const fileInfoDisplay = document.getElementById('file-info-display');
const browserFormatsSpan = document.getElementById('browser-formats');
const spectrogramScaleSelect = document.getElementById('spectrogram-scale-type');
const playbackRateSlider = document.getElementById('playback-rate');
const playbackRateValue = document.getElementById('playback-rate-value');
const waveformWindowSizeSelect = document.getElementById('waveform-window-size');

// --- Add refs for the new scroll speed slider ---
const scrollSpeedWaveformSlider = document.getElementById('scroll-speed-waveform');
const scrollSpeedWaveformValueSpan = document.getElementById('scroll-speed-waveform-value');

// --- Ref for FFT Link Checkbox ---
const linkFftSizeCheckbox = document.getElementById('link-fft-size-checkbox');
const linkToWaveformCheckbox = document.getElementById('link-to-waveform-checkbox');

// --- Refs for Slider Adjustment Controls ---
const sliderAdjustToggle = document.getElementById('slider-adjust-toggle');
const adjControls = {
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