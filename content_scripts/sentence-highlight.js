const browserAPI = (typeof window !== 'undefined' && window.browser) ? window.browser :
    (typeof chrome !== 'undefined' ? chrome : {
        storage: {
            local: { get: async () => ({}), set: async () => { } },
            onChanged: { addListener: () => { } }
        }
    });

const DEBUG = true;

const log = {
    info: (...args) => DEBUG && console.log(...args),
    error: (...args) => DEBUG && console.error(...args),
};

const DEFAULT_OPTIONS = {
    enabled: true,
    backgroundColor: '#ffff00',
    useDefaultBackground: false,
    textColor: '#000000',
    useDefaultText: false
};

let currentOptions = { ...DEFAULT_OPTIONS };

// Add CJK Unicode ranges constant
const CJK_RANGES = '[\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF]';

// Initialize the sentence highlighter
function initializeHighlighter() {
    log.info('Initializing sentence highlighter...');
    loadOptions()
        .then(() => {
            if (!document.querySelector('[data-sentence-highlighter-initialized]')) {
                document.addEventListener('mousemove', throttledMouseMoveHandler);
                document.body.setAttribute('data-sentence-highlighter-initialized', 'true');
                log.info('Sentence highlighter initialized with options:', currentOptions);
            }
        })
        .catch(error => {
            console.error('Initialization error:', error);
        });
}

// Load options from storage
function loadOptions() {
    log.info('Loading options...');
    return browserAPI.storage.local.get(DEFAULT_OPTIONS)
        .then(storedOptions => {
            log.info('Stored options:', storedOptions);
            currentOptions = { ...DEFAULT_OPTIONS, ...storedOptions };
            log.info('Merged options:', currentOptions);
            applyStyles();
            return currentOptions;
        })
        .catch(error => {
            console.error('Error loading options:', error);
            currentOptions = { ...DEFAULT_OPTIONS };
            applyStyles();
            return currentOptions;
        });
}

// Apply styles based on current options
function applyStyles() {
    const styleElement = document.querySelector('style[data-sentence-highlighter]') ||
        document.createElement('style');
    styleElement.setAttribute('data-sentence-highlighter', '');

    const bgColor = currentOptions.useDefaultBackground ? 'inherit' : currentOptions.backgroundColor;
    const txtColor = currentOptions.useDefaultText ? 'inherit' : currentOptions.textColor;

    styleElement.textContent = `
        .sentence-highlight {
            background-color: ${bgColor} !important;
            color: ${txtColor} !important;
            transition: background-color 0.2s;
            display: inline;
        }
        li .sentence-highlight {
            background-color: ${bgColor === 'inherit' ? 'inherit' : bgColor} !important;
            color: ${txtColor} !important;
        }
    `;

    if (!styleElement.parentNode) {
        document.head.appendChild(styleElement);
    }
}

// Handle storage changes
function handleStorageChange(changes, areaName) {
    if (areaName !== 'local') return;

    log.info('Storage changes detected:', changes);
    let needsUpdate = false;

    for (const [key, { newValue }] of Object.entries(changes)) {
        if (key in DEFAULT_OPTIONS && currentOptions[key] !== newValue) {
            currentOptions[key] = newValue;
            needsUpdate = true;
            log.info(`Option "${key}" updated to:`, newValue);
        }
    }

    if (needsUpdate) {
        log.info('Updating styles with new options:', currentOptions);
        applyStyles();

        if ('enabled' in changes && !currentOptions.enabled) {
            removeHighlights();
        }
    }
}

// Throttled and Debounced mouse move handler
const throttledMouseMoveHandler = throttle(debounce(handleMouseMove, 50), 100);

// Handle mouse move events
function handleMouseMove(event) {
    if (!currentOptions.enabled) return;

    const targetElement = event.target;
    log.info('Mouse over element:', targetElement);

    if (isElementEligible(targetElement)) {
        const { textNode, offset } = getCaretPosition(event);
        if (textNode) {
            const container = findSuitableContainer(textNode);
            if (container) {
                const absoluteOffset = calculateAbsoluteOffset(container, textNode, offset);
                highlightSentence(container, absoluteOffset);
            }
        }
    } else {
        log.info('Element not eligible for highlighting:', {
            element: targetElement,
            hasText: hasText(targetElement),
            isEditable: isEditable(targetElement),
            isHeader: isHeader(targetElement),
        });
    }
}

// Check if the element is eligible for highlighting
function isElementEligible(element) {
    const headers = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6'];
    const isHeader = headers.includes(element.tagName);
    const editable = element.isContentEditable || ['INPUT', 'TEXTAREA'].includes(element.tagName);
    const hasTextContent = hasText(element);

    return hasTextContent && !editable && !isHeader;
}

// Check if element has meaningful text
function hasText(element) {
    return element.textContent && element.textContent.trim().length > 0;
}

// Check if the element is editable
function isEditable(element) {
    return element.isContentEditable || ['INPUT', 'TEXTAREA'].includes(element.tagName);
}

// Check if element is a header
function isHeader(element) {
    const headers = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6'];
    return headers.includes(element.tagName);
}

// Get caret position
function getCaretPosition(event) {
    let range, textNode, offset;

    try {
        if (document.caretRangeFromPoint) {
            range = document.caretRangeFromPoint(event.clientX, event.clientY);
        } else if (document.caretPositionFromPoint) {
            const position = document.caretPositionFromPoint(event.clientX, event.clientY);
            if (position) {
                range = document.createRange();
                range.setStart(position.offsetNode, position.offset);
                range.setEnd(position.offsetNode, position.offset);
            }
        }

        if (range) {
            textNode = range.startContainer;
            offset = range.startOffset;
        } else {
            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
                range = selection.getRangeAt(0);
                textNode = range.startContainer;
                offset = range.startOffset;
            }
        }
    } catch (error) {
        log.error('Caret position error:', error);
    }

    return { textNode, offset };
}

// Find suitable container for highlighting
function findSuitableContainer(textNode) {
    let container = textNode.parentNode;

    if (container.classList?.contains('sentence-highlight')) {
        container = container.parentNode;
    }

    while (container &&
        container.tagName !== 'BODY' &&
        container.tagName !== 'DIV' &&
        container.tagName !== 'LI' &&
        !['P', 'ARTICLE', 'SECTION'].includes(container.tagName)) {
        container = container.parentNode;
    }

    if (container && ['UL', 'OL'].includes(container.tagName)) {
        container = textNode.parentNode.closest('li');
    }

    return container;
}

// Calculate absolute offset within the container
function calculateAbsoluteOffset(container, textNode, offset) {
    const walker = document.createTreeWalker(
        container,
        NodeFilter.SHOW_TEXT,
        null,
        false
    );

    let currentNode;
    let absoluteOffset = 0;
    let found = false;

    while ((currentNode = walker.nextNode())) {
        if (currentNode === textNode) {
            absoluteOffset += offset;
            found = true;
            break;
        }
        absoluteOffset += currentNode.textContent.length;
    }

    if (!found) {
        log.info('Target node not found within container');
    }

    return absoluteOffset;
}

// Highlight the sentence based on absolute offset
function highlightSentence(container, offset) {
    log.info('Highlighting sentence in container:', container);
    removeHighlights();

    const text = container.textContent;
    const { start, end } = findSentenceBoundaries(text, offset);

    if (start >= end) {
        log.info('No valid sentence boundaries found. Skipping highlight.');
        return;
    }

    try {
        const walker = document.createTreeWalker(
            container,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );

        let currentNode;
        let currentOffset = 0;
        const nodesToHighlight = [];

        while ((currentNode = walker.nextNode())) {
            const nodeLength = currentNode.textContent.length;

            if (currentOffset + nodeLength < start) {
                currentOffset += nodeLength;
                continue;
            }

            if (currentOffset > end) break;

            const nodeStart = Math.max(start - currentOffset, 0);
            const nodeEnd = Math.min(end - currentOffset, nodeLength);

            if (nodeStart < nodeEnd) {
                nodesToHighlight.push({
                    node: currentNode,
                    start: nodeStart,
                    end: nodeEnd
                });
            }

            currentOffset += nodeLength;
        }

        nodesToHighlight.forEach(({ node, start, end }) => {
            if (start >= end) return;

            const range = document.createRange();
            range.setStart(node, start);
            range.setEnd(node, end);

            const highlightSpan = document.createElement('span');
            highlightSpan.className = 'sentence-highlight';

            try {
                range.surroundContents(highlightSpan);
                log.info('Sentence highlighted successfully.');
            } catch (error) {
                log.error('Error highlighting sentence:', error);
            }
        });
    } catch (error) {
        log.error('Error during sentence highlighting:', error);
    }
}

// Find sentence boundaries within text
const sentenceCache = new Map();

function findSentenceBoundaries(text, offset) {
    const cacheKey = `${text}-${offset}`;
    if (sentenceCache.has(cacheKey)) {
        return sentenceCache.get(cacheKey);
    }

    const normalizedText = text.replace(/\s+/g, ' ');
    const normalizedOffset = offset - (text.slice(0, offset).length - text.slice(0, offset).replace(/\s+/g, ' ').length);

    const sentenceEndRegex = /[.!?。！？︕︖]/g;
    const footnotePattern = /(?:\[[0-9a-zA-Z]+\]|\([0-9a-zA-Z]+\))/;
    const nextSentencePattern = new RegExp(`(?:\\s+[A-Z]|${CJK_RANGES}|\\s*\\(|$)`);
    const listItemBoundaryPattern = /<\/li>/i;

    const combinedRegex = new RegExp(
        `(?:${sentenceEndRegex.source})${footnotePattern.source}?(?=${nextSentencePattern.source}|${listItemBoundaryPattern.source}|${CJK_RANGES}?)`,
        'g'
    );

    let sentenceStart = 0;
    let match;

    while ((match = combinedRegex.exec(normalizedText)) !== null) {
        if (match.index + match[0].length <= normalizedOffset) {
            sentenceStart = match.index + match[0].length;
            while (normalizedText[sentenceStart] === ' ') {
                sentenceStart++;
            }
        } else {
            break;
        }
    }

    combinedRegex.lastIndex = normalizedOffset;
    match = combinedRegex.exec(normalizedText);
    const sentenceEnd = match ? match.index + match[0].length : normalizedText.length;

    const boundaries = { start: sentenceStart, end: sentenceEnd };
    sentenceCache.set(cacheKey, boundaries);

    if (sentenceCache.size > 1000) {
        sentenceCache.clear();
    }

    return boundaries;
}

// Remove all highlighted sentences
function removeHighlights() {
    const highlights = document.querySelectorAll('.sentence-highlight');
    if (highlights.length === 0) return;

    log.info('Removing existing highlights:', highlights);
    highlights.forEach(span => {
        const parent = span.parentNode;
        while (span.firstChild) {
            parent.insertBefore(span.firstChild, span);
        }
        parent.removeChild(span);
    });
}

// Toggle the highlighter's enabled state
function toggleHighlighter() {
    const newEnabledState = !currentOptions.enabled;
    browserAPI.storage.local.set({ enabled: newEnabledState })
        .then(() => {
            currentOptions.enabled = newEnabledState;
            if (!newEnabledState) {
                removeHighlights();
            }
            displayStatusMessage(`Sentence Highlighter ${newEnabledState ? 'Enabled' : 'Disabled'}`);
        })
        .catch(error => {
            console.error('Error toggling highlighter:', error);
        });
}

// Display a status message to the user
function displayStatusMessage(message) {
    const statusDiv = document.createElement('div');
    statusDiv.textContent = message;
    Object.assign(statusDiv.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '10px 20px',
        backgroundColor: '#333',
        color: '#fff',
        borderRadius: '5px',
        zIndex: '10000',
        transition: 'opacity 0.5s',
    });
    document.body.appendChild(statusDiv);

    setTimeout(() => {
        statusDiv.style.opacity = '0';
    }, 1500);
    setTimeout(() => {
        statusDiv.remove();
    }, 2000);
}

// Utility: Throttle function
function throttle(func, limit) {
    let inThrottle = false;
    return function (...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Utility: Debounce function
function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

// Keyboard shortcut handler
document.addEventListener('keydown', event => {
    if (event.altKey && event.shiftKey && event.code === 'KeyH') {
        toggleHighlighter();
    }
});

// Listen for messages from the background or options page
browserAPI.runtime.onMessage.addListener((message) => {
    log.info('Received message:', message);
    if (message.action === 'reloadOptions') {
        loadOptions()
            .then(() => {
                log.info('Options reloaded successfully.');
            })
            .catch(error => {
                console.error('Error reloading options:', error);
            });
    }
});

// Observe DOM changes to initialize highlighter on dynamic content
const domObserver = new MutationObserver(() => {
    if (!document.querySelector('[data-sentence-highlighter-initialized]')) {
        initializeHighlighter();
    }
});

domObserver.observe(document.documentElement, {
    childList: true,
    subtree: true
});

// Initialize the highlighter on script load and DOMContentLoaded
initializeHighlighter();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeHighlighter);
} else {
    initializeHighlighter();
}

// Export functions for testing
if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
    module.exports = {
        findSentenceBoundaries,
        throttle,
        debounce,
        highlightSentence,
        removeHighlights,
        toggleHighlighter,
        isEnabled: () => currentOptions.enabled
    };
}
