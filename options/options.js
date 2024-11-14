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
    useDefaultText: true
};

// Save options to browser.storage
function saveOptions(e) {
    e.preventDefault();

    const options = {
        enabled: document.getElementById('enabled').checked,
        backgroundColor: document.getElementById('useDefaultBackground').checked
            ? ''
            : document.getElementById('backgroundColorPreview').style.backgroundColor || DEFAULT_OPTIONS.backgroundColor,
        useDefaultBackground: document.getElementById('useDefaultBackground').checked,
        textColor: document.getElementById('useDefaultText').checked
            ? ''
            : document.getElementById('textColorPreview').style.backgroundColor || DEFAULT_OPTIONS.textColor,
        useDefaultText: document.getElementById('useDefaultText').checked
    };

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

// Restore options from browser.storage
function restoreOptions() {
    console.log('Restoring options...');

    browserAPI.storage.local.get(DEFAULT_OPTIONS).then((options) => {
        console.log('Retrieved options:', options);

        document.getElementById('enabled').checked = options.enabled;
        document.getElementById('backgroundColorPreview').style.backgroundColor = options.backgroundColor;
        document.getElementById('useDefaultBackground').checked = options.useDefaultBackground;
        document.getElementById('textColorPreview').style.backgroundColor = options.textColor;
        document.getElementById('useDefaultText').checked = options.useDefaultText;

        updateColorInputStates();
    }).catch(error => {
        console.error('Error restoring options:', error);
    });
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

// Setup Custom Color Pickers
function setupCustomColorPickers() {
    // Background Color Picker
    const bgColorButton = document.getElementById('backgroundColorButton');
    const bgColorPalette = document.getElementById('backgroundColorPalette');
    const bgColorPreview = document.getElementById('backgroundColorPreview');
    const bgColorSwatches = bgColorPalette.querySelectorAll('.color-swatch');
    const bgCustomInput = document.getElementById('backgroundCustomColor');
    const bgCustomButton = document.getElementById('backgroundCustomColorButton');

    bgColorButton.addEventListener('click', () => {
        bgColorPalette.classList.toggle('hidden');
    });

    bgColorSwatches.forEach(swatch => {
        swatch.addEventListener('click', () => {
            const color = swatch.getAttribute('data-color');
            bgColorPreview.style.backgroundColor = color;
            bgColorPalette.classList.add('hidden');
        });
    });

    bgCustomButton.addEventListener('click', () => {
        const color = bgCustomInput.value.trim();
        if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
            bgColorPreview.style.backgroundColor = color;
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

    textColorButton.addEventListener('click', () => {
        textColorPalette.classList.toggle('hidden');
    });

    textColorSwatches.forEach(swatch => {
        swatch.addEventListener('click', () => {
            const color = swatch.getAttribute('data-color');
            textColorPreview.style.backgroundColor = color;
            textColorPalette.classList.add('hidden');
        });
    });

    textCustomButton.addEventListener('click', () => {
        const color = textCustomInput.value.trim();
        if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
            textColorPreview.style.backgroundColor = color;
            textCustomInput.value = '';
            textColorPalette.classList.add('hidden');
        } else {
            alert('Please enter a valid hex color code (e.g., #1A2B3C).');
        }
    });

    // Close color palettes when clicking outside
    document.addEventListener('click', (event) => {
        if (!bgColorPalette.contains(event.target) && event.target !== bgColorButton) {
            bgColorPalette.classList.add('hidden');
        }
        if (!textColorPalette.contains(event.target) && event.target !== textColorButton) {
            textColorPalette.classList.add('hidden');
        }
    });
}

// Add event listeners
document.addEventListener('DOMContentLoaded', () => {
    restoreOptions();
    setupCustomColorPickers();
});
document.getElementById('options-form').addEventListener('submit', saveOptions);
document.getElementById('useDefaultBackground').addEventListener('change', updateColorInputStates);
document.getElementById('useDefaultText').addEventListener('change', updateColorInputStates); 
