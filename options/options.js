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
    textColor: '#000000'
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

        // Restore Background Color Selection
        const bgSwatches = document.querySelectorAll('#backgroundColorOptions .color-swatch');
        bgSwatches.forEach(swatch => {
            if (swatch.dataset.color === options.backgroundColor) {
                swatch.classList.add('selected');
            } else {
                swatch.classList.remove('selected');
            }
        });

        // Restore Text Color Selection
        const textSwatches = document.querySelectorAll('#textColorOptions .color-swatch');
        textSwatches.forEach(swatch => {
            if (swatch.dataset.color === options.textColor) {
                swatch.classList.add('selected');
            } else {
                swatch.classList.remove('selected');
            }
        });

        // Update the preview panel
        updatePreview();

        // Update UI States based on toggle
        updateColorPickersState(options.enabled);
    }).catch(error => {
        console.error('Error restoring options:', error);
    });
}

// Function to invert color for text readability (Optional)
function invertColor(hex) {
    // Ensure hex is 6 characters
    hex = hex.replace('#', '');
    if (hex.length === 3) {
        hex = hex.split('').map(char => char + char).join('');
    }
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

// Update color pickers based on the toggle state
function updateColorPickersState(isEnabled) {
    const settingsBox = document.querySelector('.settings-box');
    if (!isEnabled) {
        settingsBox.classList.add('disabled-section');
    } else {
        settingsBox.classList.remove('disabled-section');
    }
}

// Setup Color Swatch Selection
function setupColorSwatches() {
    // Background Color Swatches
    const bgSwatches = document.querySelectorAll('#backgroundColorOptions .color-swatch');
    bgSwatches.forEach(swatch => {
        swatch.addEventListener('click', () => {
            bgSwatches.forEach(s => s.classList.remove('selected'));
            swatch.classList.add('selected');
            updatePreview();
        });
    });

    // Text Color Swatches
    const textSwatches = document.querySelectorAll('#textColorOptions .color-swatch');
    textSwatches.forEach(swatch => {
        swatch.addEventListener('click', () => {
            textSwatches.forEach(s => s.classList.remove('selected'));
            swatch.classList.add('selected');
            updatePreview();
        });
    });
}

// Setup Toggle Button
function setupToggleButton() {
    const enabledToggle = document.getElementById('enabledToggle');
    enabledToggle.addEventListener('click', () => {
        const isActive = enabledToggle.classList.toggle('active');
        enabledToggle.setAttribute('aria-pressed', isActive);
        handleToggleChange(isActive);
    });
}

// Handle form submission
function handleFormSubmit() {
    const form = document.getElementById('options-form');
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const options = {
            enabled: document.getElementById('enabledToggle').classList.contains('active'),
            backgroundColor: getSelectedColor('#backgroundColorOptions'),
            textColor: getSelectedColor('#textColorOptions')
        };

        saveOptions(options);
    });
}

// Get selected color from a color options panel
function getSelectedColor(panelSelector) {
    const panel = document.querySelector(`${panelSelector} .color-swatch.selected`);
    return panel ? panel.getAttribute('data-color') : DEFAULT_OPTIONS.backgroundColor;
}

// Initialize Color Swatches
function initializeColorSwatches() {
    setupColorSwatches();
}

// Add event listeners
document.addEventListener('DOMContentLoaded', () => {
    restoreOptions();
    setupToggleButton();
    handleFormSubmit();
    initializeColorSwatches();
});

// Add new function to update preview
function updatePreview() {
    const previewText = document.getElementById('previewText');
    const selectedBackground = document.querySelector('#backgroundColorOptions .color-swatch.selected');
    const selectedText = document.querySelector('#textColorOptions .color-swatch.selected');

    // Set background color
    if (selectedBackground && selectedBackground.dataset.color === 'default') {
        previewText.style.backgroundColor = '';
    } else if (selectedBackground) {
        previewText.style.backgroundColor = selectedBackground.dataset.color;
    }

    // Set text color
    if (selectedText && selectedText.dataset.color === 'default') {
        previewText.style.color = '';
    } else if (selectedText) {
        previewText.style.color = selectedText.dataset.color;
    }
} 
