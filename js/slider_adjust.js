// --- Slider Adjustment Logic (Adapted from slider_testing.html) ---

function updateSliderStyles(prefix) {
    const controlSet = adjControls[prefix];
    // Select the correct rows based on prefix
    const rows = prefix === 'left' 
        ? document.querySelectorAll('.controls-file .slider-container, .controls-generated .slider-container') 
        : document.querySelectorAll('.vis-controls .slider-container');
    
    if (!rows || rows.length === 0) {
        console.warn(`No slider rows found for prefix: ${prefix}`);
        return;
    }

    const isGrid = controlSet.layoutGrid.checked;
    const gap = controlSet.gap.value + 'px';
    const paddingLeft = controlSet.paddingLeft.value + 'px';
    const paddingRight = controlSet.paddingRight.value + 'px';
    const labelUnit = controlSet.labelUnit.value;
    const labelWidthValue = controlSet.labelWidth.value;
    const labelWidth = labelWidthValue + labelUnit;
    const valueUnit = controlSet.valueUnit.value;
    const valueWidthValue = controlSet.valueWidth.value;
    const valueWidth = valueWidthValue + valueUnit;

    // Update value displays in control panel
    controlSet.gapValue.textContent = gap;
    controlSet.paddingLeftValue.textContent = paddingLeft;
    controlSet.paddingRightValue.textContent = paddingRight;
    controlSet.labelWidthValue.textContent = labelWidth;
    controlSet.valueWidthValue.textContent = valueWidth;

    rows.forEach(row => {
        // Skip rows that are specifically for dropdowns if we are adjusting the right side
        if (prefix === 'right' && (row.id === 'waveform-window-container' || row.id === 'fft-size-container' || row.parentElement.id === 'color-scheme-container' || row.parentElement.id === 'freq-scale-container')) {
            // Need to check parentElement for the non-.slider-container ones
             if (row.id && (row.id === 'color-scheme-container' || row.id === 'freq-scale-container')) {
                 // These don't use the row structure we're modifying
             } else if (!row.querySelector('.slider-input[type="range"]')) {
                   return; // Skip containers that don't contain a range slider 
             } else if (row.id === 'waveform-window-container' || row.id === 'fft-size-container') {
                 // Also skip these as they contain selects
                 return;
             }
        }
         // Additional check for color/freq scale containers (which aren't .slider-container)
         if (row.id === 'color-scheme-container' || row.id === 'freq-scale-container') {
             return; 
         }


        const label = row.querySelector('.slider-label');
        const input = row.querySelector('.slider-input'); // May be null if it's a select container
        const value = row.querySelector('.slider-value');
        
         if (!label || !input || !value) {
            // Special handling for the dropdown rows we need to skip
             if (!(row.id === 'waveform-window-container' || row.id === 'fft-size-container')) { 
                  console.warn('Missing label, input, or value in slider row:', row);
             }
            return; // Skip this row if essential elements are missing
        }

        // Apply container styles
        row.style.gap = gap;
        row.style.paddingLeft = paddingLeft;
        row.style.paddingRight = paddingRight;

        if (isGrid) {
            row.style.display = 'grid'; // Explicitly set display
            row.classList.add('layout-grid');
            row.classList.remove('layout-flex'); 
            const labelCol = labelWidth;
            const valueCol = valueWidth;
            row.style.gridTemplateColumns = `${labelCol} 1fr ${valueCol}`;
            label.style.flexBasis = ''; label.style.width = ''; label.style.gridColumn = '1 / 2';
            input.style.gridColumn = '2 / 3'; input.style.minWidth = '0';
            value.style.flexBasis = ''; value.style.minWidth = ''; value.style.width = ''; value.style.gridColumn = '3 / 4';
        } else {
            row.style.display = 'flex'; // Explicitly set display
            row.classList.remove('layout-grid');
            row.classList.add('layout-flex'); 
            row.style.gridTemplateColumns = ''; 
            label.style.flexBasis = labelWidth; label.style.width = ''; label.style.gridColumn = '';
            input.style.gridColumn = ''; input.style.minWidth = '';
            value.style.flexBasis = valueWidth; value.style.minWidth = ''; value.style.width = ''; value.style.gridColumn = '';
        }
    });
}

// Create separate update functions for clarity 
function updateLeftSliderStyles() {
    updateSliderStyles('left');
}
function updateRightSliderStyles() {
    updateSliderStyles('right');
}

// Adapted from slider_testing.html
function setupAdjControlListeners() {
    ['left', 'right'].forEach(prefix => {
        const controls = adjControls[prefix];
        if (!controls.panel) return; // Skip if panel doesn't exist (safety)

        controls.layoutGrid.addEventListener('change', () => updateSliderStyles(prefix));
        controls.gap.addEventListener('input', () => updateSliderStyles(prefix));
        controls.paddingLeft.addEventListener('input', () => updateSliderStyles(prefix));
        controls.paddingRight.addEventListener('input', () => updateSliderStyles(prefix));
        controls.labelWidth.addEventListener('input', () => updateSliderStyles(prefix));
        controls.valueWidth.addEventListener('input', () => updateSliderStyles(prefix));
        
        setupUnitToggle(controls.labelUnitToggle, controls.labelUnit, controls.labelWidthValue, controls.labelWidth, prefix);
        setupUnitToggle(controls.valueUnitToggle, controls.valueUnit, controls.valueWidthValue, controls.valueWidth, prefix);
    });
}

// Adapted from slider_testing.html - needs prefix passed
function setupUnitToggle(button, input, valueDisplay, widthControl, prefix) {
    button.addEventListener('click', () => {
        const currentUnit = input.value;
        const newUnit = currentUnit === 'px' ? '%' : 'px';
        input.value = newUnit;
        button.textContent = currentUnit === 'px' ? 'Use px' : 'Use %';
        
        const isLabel = button.id.includes('label');
        if (newUnit === '%') {
            widthControl.min = 5;
            widthControl.max = 50;
            widthControl.step = 1;
            widthControl.value = Math.max(parseInt(widthControl.min), Math.min(parseInt(widthControl.max), Math.round(parseInt(widthControl.value) / 5))); 
        } else {
            widthControl.min = isLabel ? 40 : 5; // Use 5px min for value width now
            widthControl.max = isLabel ? 150 : 100;
            widthControl.step = 1;
            widthControl.value = Math.max(parseInt(widthControl.min), Math.min(parseInt(widthControl.max), Math.round(parseInt(widthControl.value) * 5))); 
        }
        updateSliderStyles(prefix); // Use the generic update function
    });
} 