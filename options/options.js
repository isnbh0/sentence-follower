// Add browserAPI definition at the top
const browserAPI = (typeof window !== 'undefined' && window.browser) ? window.browser :
    (typeof chrome !== 'undefined' ? chrome : {
        storage: {
            local: { get: async () => ({}), set: async () => { } }
        },
        runtime: {
            sendMessage: async () => { }
        }
    });

const DEFAULT_OPTIONS = {
    enabled: true,
    backgroundColor: '#ffff00',
    useDefaultBackground: false,
    textColor: '#000000',
    useDefaultText: false
};

// Save options to browser.storage
function saveOptions(options) {
    browserAPI.storage.local.set(options).then(() => {
        const status = document.getElementById('status');
        status.classList.add('show');
        setTimeout(() => status.classList.remove('show'), 1500);

        // Send a message to notify content scripts about the update
        browserAPI.runtime.sendMessage({ action: 'reloadOptions' }).catch(error => {
            console.error('Error sending message:', error);
        });
    }).catch(error => {
        console.error('Error saving options:', error);
    });
}

// Handle toggle button state change
function handleToggleChange(isEnabled) {
    const options = {
        enabled: isEnabled
    };
    saveOptions(options);
    updateColorPickersState(isEnabled);
}

// Restore options from browser.storage
function restoreOptions() {
    console.log('Restoring options...');

    browserAPI.storage.local.get(DEFAULT_OPTIONS).then((options) => {
        console.log('Retrieved options:', options);

        // Restore Toggle Button State
        const enabledToggle = document.getElementById('enabledToggle');
        if (options.enabled) {
            enabledToggle.classList.add('active');
            enabledToggle.setAttribute('aria-pressed', 'true');
        } else {
            enabledToggle.classList.remove('active');
            enabledToggle.setAttribute('aria-pressed', 'false');
        }

        // Restore other options
        document.getElementById('backgroundColorPreview').style.backgroundColor = options.backgroundColor || '#ffff00';
        document.getElementById('backgroundColorPreview').style.color = invertColor(options.backgroundColor || '#ffff00');
        document.getElementById('useDefaultBackground').checked = options.useDefaultBackground;
        document.getElementById('textColorPreview').style.color = options.textColor || '#000000';
        document.getElementById('textColorPreview').style.backgroundColor = 'transparent';
        document.getElementById('useDefaultText').checked = options.useDefaultText;

        updateColorInputStates();
        updateColorPickersState(options.enabled);
    }).catch(error => {
        console.error('Error restoring options:', error);
    });
}

// Function to invert color for text readability
function invertColor(hex) {
    // Remove '#' if present
    hex = hex.replace('#', '');
    // Parse r, g, b values
    let r = parseInt(hex.substr(0, 2), 16);
    let g = parseInt(hex.substr(2, 2), 16);
    let b = parseInt(hex.substr(4, 2), 16);
    // Invert colors
    r = 255 - r;
    g = 255 - g;
    b = 255 - b;
    // Convert back to hex
    return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)}`;
}

// Update color input states based on checkboxes
function updateColorInputStates() {
    const useDefaultBackground = document.getElementById('useDefaultBackground').checked;
    const useDefaultText = document.getElementById('useDefaultText').checked;

    document.getElementById('backgroundColorButton').disabled = useDefaultBackground;
    document.getElementById('backgroundColorPreview').style.opacity = useDefaultBackground ? 0.5 : 1;

    document.getElementById('textColorButton').disabled = useDefaultText;
    document.getElementById('textColorPreview').style.opacity = useDefaultText ? 0.5 : 1;

    // Hide or show the custom color palette
    document.getElementById('backgroundColorPalette').classList.toggle('hidden', useDefaultBackground);
    document.getElementById('textColorPalette').classList.toggle('hidden', useDefaultText);
}

// Enable or disable color pickers based on toggle state
function updateColorPickersState(isEnabled) {
    // Background Color Controls
    document.getElementById('backgroundColorButton').disabled = !isEnabled || document.getElementById('useDefaultBackground').checked;
    document.getElementById('useDefaultBackground').disabled = !isEnabled;
    if (!isEnabled) {
        document.getElementById('backgroundColorPreview').style.opacity = 0.5;
        document.getElementById('backgroundColorPalette').classList.add('hidden');
    } else {
        // Restore opacity based on 'useDefaultBackground' checkbox
        const useDefaultBackground = document.getElementById('useDefaultBackground').checked;
        document.getElementById('backgroundColorPreview').style.opacity = useDefaultBackground ? 0.5 : 1;
    }

    // Text Color Controls
    document.getElementById('textColorButton').disabled = !isEnabled || document.getElementById('useDefaultText').checked;
    document.getElementById('useDefaultText').disabled = !isEnabled;
    if (!isEnabled) {
        document.getElementById('textColorPreview').style.opacity = 0.5;
        document.getElementById('textColorPalette').classList.add('hidden');
    } else {
        // Restore opacity based on 'useDefaultText' checkbox
        const useDefaultText = document.getElementById('useDefaultText').checked;
        document.getElementById('textColorPreview').style.opacity = useDefaultText ? 0.5 : 1;
    }

    // Add or remove 'disabled-section' class to gray out the sections
    const backgroundColorGroup = document.getElementById('backgroundColorGroup');
    const textColorGroup = document.getElementById('textColorGroup');

    if (!isEnabled) {
        backgroundColorGroup.classList.add('disabled-section');
        textColorGroup.classList.add('disabled-section');
    } else {
        backgroundColorGroup.classList.remove('disabled-section');
        textColorGroup.classList.remove('disabled-section');
    }
}

// Setup Custom Color Pickers
function setupCustomColorPickers() {
    // Background Color Picker
    const bgColorButton = document.getElementById('backgroundColorButton');
    const bgColorPalette = document.getElementById('backgroundColorPalette');
    const bgColorPreview = document.getElementById('backgroundColorPreview');
    const bgColorSwatches = bgColorPalette.querySelectorAll('.color-swatch');
    const bgCustomInput = document.getElementById('backgroundCustomColor');
    const bgCustomButton = document.getElementById('backgroundCustomColorButton');

    bgColorButton.addEventListener('click', (e) => {
        e.stopPropagation();
        // Toggle visibility
        bgColorPalette.classList.toggle('hidden');
    });

    bgColorSwatches.forEach(swatch => {
        swatch.addEventListener('click', () => {
            const color = swatch.getAttribute('data-color');
            bgColorPreview.style.backgroundColor = color;
            bgColorPreview.style.color = invertColor(color);
            bgColorPalette.classList.add('hidden');
        });
    });

    bgCustomButton.addEventListener('click', () => {
        const color = bgCustomInput.value.trim();
        if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
            bgColorPreview.style.backgroundColor = color;
            bgColorPreview.style.color = invertColor(color);
            bgCustomInput.value = '';
            bgColorPalette.classList.add('hidden');
        } else {
            alert('Please enter a valid hex color code (e.g., #1A2B3C).');
        }
    });

    // Text Color Picker
    const textColorButton = document.getElementById('textColorButton');
    const textColorPalette = document.getElementById('textColorPalette');
    const textColorPreview = document.getElementById('textColorPreview');
    const textColorSwatches = textColorPalette.querySelectorAll('.color-swatch');
    const textCustomInput = document.getElementById('textCustomColor');
    const textCustomButton = document.getElementById('textCustomColorButton');

    textColorButton.addEventListener('click', (e) => {
        e.stopPropagation();
        // Toggle visibility
        textColorPalette.classList.toggle('hidden');
    });

    textColorSwatches.forEach(swatch => {
        swatch.addEventListener('click', () => {
            const color = swatch.getAttribute('data-color');
            textColorPreview.style.color = color;
            textColorPreview.style.backgroundColor = 'transparent';
            textColorPalette.classList.add('hidden');
        });
    });

    textCustomButton.addEventListener('click', () => {
        const color = textCustomInput.value.trim();
        if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
            textColorPreview.style.color = color;
            textColorPreview.style.backgroundColor = 'transparent';
            textCustomInput.value = '';
            textColorPalette.classList.add('hidden');
        } else {
            alert('Please enter a valid hex color code (e.g., #1A2B3C).');
        }
    });

    // Close color palettes when clicking outside
    document.addEventListener('click', (event) => {
        if (!bgColorPalette.contains(event.target) && event.target !== bgColorButton && !bgColorButton.contains(event.target)) {
            bgColorPalette.classList.add('hidden');
        }
        if (!textColorPalette.contains(event.target) && event.target !== textColorButton && !textColorButton.contains(event.target)) {
            textColorPalette.classList.add('hidden');
        }
    });
}

// Handle Toggle Button Click
function setupToggleButton() {
    const enabledToggle = document.getElementById('enabledToggle');
    enabledToggle.addEventListener('click', () => {
        const isActive = enabledToggle.classList.toggle('active');
        enabledToggle.setAttribute('aria-pressed', isActive);
        handleToggleChange(isActive);
    });
}

// Add event listeners
document.addEventListener('DOMContentLoaded', () => {
    restoreOptions();
    setupCustomColorPickers();
    setupToggleButton();
});
document.getElementById('options-form').addEventListener('submit', (e) => {
    e.preventDefault();

    const options = {
        backgroundColor: document.getElementById('useDefaultBackground').checked
            ? ''
            : document.getElementById('backgroundColorPreview').style.backgroundColor || DEFAULT_OPTIONS.backgroundColor,
        useDefaultBackground: document.getElementById('useDefaultBackground').checked,
        textColor: document.getElementById('useDefaultText').checked
            ? ''
            : document.getElementById('textColorPreview').style.color || DEFAULT_OPTIONS.textColor,
        useDefaultText: document.getElementById('useDefaultText').checked
    };

    saveOptions(options);
});
document.getElementById('useDefaultBackground').addEventListener('change', updateColorInputStates);
document.getElementById('useDefaultText').addEventListener('change', updateColorInputStates); 
