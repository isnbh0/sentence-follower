// browserAPI is now defined in common.js and made globally available via window.browserAPI

// Access browserAPI from the global window object to ensure webpack minification doesn't break it
const browserAPI = window.browserAPI;

// Remove local DEBUG flag and log utility as we'll use the centralized one from logging.js
// const DEBUG = false;
//
// const log = {
//   info: (...args) => DEBUG && console.log(...args),
//   error: (...args) => DEBUG && console.error(...args),
// };

// Make sure we have a log object, even if logging.js hasn't loaded
if (typeof window.log === "undefined") {
  window.log = {
    info: (module, ...args) => console.log(`[${module}]`, ...args),
    warn: (module, ...args) => console.warn(`[${module}]`, ...args),
    error: (module, ...args) => console.error(`[${module}]`, ...args),
    debug: (module, ...args) => console.log(`[DEBUG:${module}]`, ...args),
  };
}

const DEFAULT_OPTIONS = {
  backgroundColor: "#ffff00",
  useDefaultBackground: false,
  textColor: "#000000",
  useDefaultText: false,
};

// Separate the enabled state from other options as it's now per-tab
let isEnabled = false;
let currentOptions = { ...DEFAULT_OPTIONS };

// Add CJK Unicode ranges constant
const CJK_RANGES = "[\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF]";

// Initialize the sentence highlighter
function initializeHighlighter() {
  window.log.info("Highlighter", "Initializing sentence highlighter...");
  loadOptions()
    .then(() => {
      if (!document.querySelector("[data-sentence-highlighter-initialized]")) {
        document.addEventListener("mousemove", throttledMouseMoveHandler);
        document.body.setAttribute(
          "data-sentence-highlighter-initialized",
          "true"
        );
        window.log.info(
          "Sentence highlighter initialized with options:",
          currentOptions
        );

        // Get the enabled state for this tab from the background page
        checkTabEnabledState();
      }
    })
    .catch((error) => {
      console.error("Initialization error:", error);
    });
}

// Check if highlighting is enabled for this tab
function checkTabEnabledState() {
  window.log.debug("Content", "checkTabEnabledState called");

  browserAPI.runtime
    .sendMessage({ action: "getTabEnabled" })
    .then((response) => {
      if (response) {
        window.log.debug(
          "Content",
          "Got response from getTabEnabled:",
          response
        );

        isEnabled = !!response.enabled;
        window.log.debug("Content", `Tab enabled state set to: ${isEnabled}`);

        if (isEnabled) {
          initializeHighlighter();
        }
      }
    })
    .catch((error) => {
      window.log.error("Content", "Error getting tab enabled state:", error);
    });
}

// Load options from background script (tab-specific formatting options)
function loadOptions() {
  window.log.info("Loading tab-specific formatting options...");
  return browserAPI.runtime
    .sendMessage({ action: "getTabFormatting" })
    .then((response) => {
      if (response && response.formatting) {
        window.log.info(
          "Received tab-specific formatting:",
          response.formatting
        );
        currentOptions = { ...DEFAULT_OPTIONS, ...response.formatting };
      } else {
        window.log.info("No tab-specific formatting received, using defaults");
        currentOptions = { ...DEFAULT_OPTIONS };
      }
      window.log.info("Current options:", currentOptions);
      applyStyles();
      return currentOptions;
    })
    .catch((error) => {
      console.error("Error loading tab-specific formatting:", error);
      currentOptions = { ...DEFAULT_OPTIONS };
      applyStyles();
      return currentOptions;
    });
}

// Apply styles based on current options
function applyStyles() {
  const styleElement =
    document.querySelector("style[data-sentence-highlighter]") ||
    document.createElement("style");
  styleElement.setAttribute("data-sentence-highlighter", "");

  const bgColor = currentOptions.useDefaultBackground
    ? "inherit"
    : currentOptions.backgroundColor;
  const txtColor = currentOptions.useDefaultText
    ? "inherit"
    : currentOptions.textColor;

  styleElement.textContent = `
        .sentence-highlight {
            background-color: ${bgColor} !important;
            color: ${txtColor} !important;
            transition: background-color 0.2s;
            display: inline;
        }
        li .sentence-highlight {
            background-color: ${
              bgColor === "inherit" ? "inherit" : bgColor
            } !important;
            color: ${txtColor} !important;
        }
    `;

  if (!styleElement.parentNode) {
    document.head.appendChild(styleElement);
  }
}

// Handle storage changes
function handleStorageChange(changes, areaName) {
  if (areaName !== "local") return;

  window.log.info("Storage changes detected:", changes);
  let needsUpdate = false;

  for (const [key, { newValue }] of Object.entries(changes)) {
    if (key in DEFAULT_OPTIONS && currentOptions[key] !== newValue) {
      currentOptions[key] = newValue;
      needsUpdate = true;
      window.log.info(`Option "${key}" updated to:`, newValue);
    }
  }

  if (needsUpdate) {
    window.log.info("Updating styles with new options:", currentOptions);
    applyStyles();
  }
}

// Throttled and Debounced mouse move handler
const throttledMouseMoveHandler = throttle(debounce(handleMouseMove, 50), 100);

// Handle mouse move events
function handleMouseMove(event) {
  if (!isEnabled) return;

  const targetElement = event.target;
  window.log.info("Mouse over element:", targetElement);

  if (isElementEligible(targetElement)) {
    const { textNode, offset } = getCaretPosition(event);
    if (textNode) {
      const container = findSuitableContainer(textNode);
      if (container) {
        const absoluteOffset = calculateAbsoluteOffset(
          container,
          textNode,
          offset
        );
        highlightSentence(container, absoluteOffset);
      }
    }
  } else {
    window.log.info("Element not eligible for highlighting:", {
      element: targetElement,
      hasText: hasText(targetElement),
      isEditable: isEditable(targetElement),
      isHeader: isHeader(targetElement),
    });
  }
}

// Check if the element is eligible for highlighting
function isElementEligible(element) {
  // First check if the element is part of the floating UI
  if (isPartOfFloatingUI(element)) {
    return false;
  }

  const headers = ["H1", "H2", "H3", "H4", "H5", "H6"];
  const isHeader = headers.includes(element.tagName);
  const editable =
    element.isContentEditable ||
    ["INPUT", "TEXTAREA"].includes(element.tagName);
  const hasTextContent = hasText(element);

  return hasTextContent && !editable && !isHeader;
}

// Check if element is part of the floating UI
function isPartOfFloatingUI(element) {
  // Most efficient way to check if this element or any parent has the floating UI data attribute
  return !!element.closest('[data-sentence-follower-ui="true"]');
}

// Check if element has meaningful text
function hasText(element) {
  return element.textContent && element.textContent.trim().length > 0;
}

// Check if the element is editable
function isEditable(element) {
  return (
    element.isContentEditable || ["INPUT", "TEXTAREA"].includes(element.tagName)
  );
}

// Check if element is a header
function isHeader(element) {
  const headers = ["H1", "H2", "H3", "H4", "H5", "H6"];
  return headers.includes(element.tagName);
}

// Get caret position
function getCaretPosition(event) {
  let range, textNode, offset;

  try {
    if (document.caretRangeFromPoint) {
      range = document.caretRangeFromPoint(event.clientX, event.clientY);
    } else if (document.caretPositionFromPoint) {
      const position = document.caretPositionFromPoint(
        event.clientX,
        event.clientY
      );
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
    window.log.error("Caret position error:", error);
  }

  return { textNode, offset };
}

// Find suitable container for highlighting
function findSuitableContainer(textNode) {
  let container = textNode.parentNode;

  if (container.classList?.contains("sentence-highlight")) {
    container = container.parentNode;
  }

  while (
    container &&
    container.tagName !== "BODY" &&
    container.tagName !== "DIV" &&
    container.tagName !== "LI" &&
    !["P", "ARTICLE", "SECTION"].includes(container.tagName)
  ) {
    container = container.parentNode;
  }

  if (container && ["UL", "OL"].includes(container.tagName)) {
    container = textNode.parentNode.closest("li");
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
    window.log.info("Target node not found within container");
  }

  return absoluteOffset;
}

// Highlight the sentence based on absolute offset
function highlightSentence(container, offset) {
  window.log.info("Highlighting sentence in container:", container);
  removeHighlights();

  const text = container.textContent;
  const { start, end } = findSentenceBoundaries(text, offset);

  if (start >= end) {
    window.log.info("No valid sentence boundaries found. Skipping highlight.");
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
          end: nodeEnd,
        });
      }

      currentOffset += nodeLength;
    }

    nodesToHighlight.forEach(({ node, start, end }) => {
      if (start >= end) return;

      const range = document.createRange();
      range.setStart(node, start);
      range.setEnd(node, end);

      const highlightSpan = document.createElement("span");
      highlightSpan.className = "sentence-highlight";

      try {
        range.surroundContents(highlightSpan);
        window.log.info("Sentence highlighted successfully.");
      } catch (error) {
        window.log.error("Error highlighting sentence:", error);
      }
    });
  } catch (error) {
    window.log.error("Error during sentence highlighting:", error);
  }
}

// Find sentence boundaries within text
const sentenceCache = new Map();

function findSentenceBoundaries(text, offset) {
  const cacheKey = `${text}-${offset}`;
  if (sentenceCache.has(cacheKey)) {
    return sentenceCache.get(cacheKey);
  }

  const normalizedText = text.replace(/\s+/g, " ");
  const normalizedOffset =
    offset -
    (text.slice(0, offset).length -
      text.slice(0, offset).replace(/\s+/g, " ").length);

  const sentenceEndRegex = /[.!?。！？︕︖]/g;
  const footnotePattern = /(?:\[[0-9a-zA-Z]+\]|\([0-9a-zA-Z]+\))/;
  const nextSentencePattern = new RegExp(
    `(?:\\s+[A-Z]|${CJK_RANGES}|\\s*\\(|$)`
  );
  const listItemBoundaryPattern = /<\/li>/i;

  const combinedRegex = new RegExp(
    `(?:${sentenceEndRegex.source})${footnotePattern.source}?(?=${nextSentencePattern.source}|${listItemBoundaryPattern.source}|${CJK_RANGES}?)`,
    "g"
  );

  let sentenceStart = 0;
  let match;

  while ((match = combinedRegex.exec(normalizedText)) !== null) {
    if (match.index + match[0].length <= normalizedOffset) {
      sentenceStart = match.index + match[0].length;
      while (normalizedText[sentenceStart] === " ") {
        sentenceStart++;
      }
    } else {
      break;
    }
  }

  combinedRegex.lastIndex = normalizedOffset;
  match = combinedRegex.exec(normalizedText);
  const sentenceEnd = match
    ? match.index + match[0].length
    : normalizedText.length;

  const boundaries = { start: sentenceStart, end: sentenceEnd };
  sentenceCache.set(cacheKey, boundaries);

  if (sentenceCache.size > 1000) {
    sentenceCache.clear();
  }

  return boundaries;
}

// Remove all highlighted sentences
function removeHighlights() {
  const highlights = document.querySelectorAll(".sentence-highlight");
  if (highlights.length === 0) return;

  window.log.info("Removing existing highlights:", highlights);
  highlights.forEach((span) => {
    const parent = span.parentNode;
    while (span.firstChild) {
      parent.insertBefore(span.firstChild, span);
    }
    parent.removeChild(span);
  });
}

// Toggle the highlighter's enabled state
function toggleHighlighter() {
  const newEnabledState = !isEnabled;
  console.log(
    `[DEBUG] Content: toggleHighlighter called, new state will be: ${newEnabledState}`
  );

  // Send a message to the background script to update the enabled state for this tab
  console.log(
    `[DEBUG] Content: Sending setTabEnabled message with enabled=${newEnabledState}`
  );
  browserAPI.runtime
    .sendMessage({
      action: "setTabEnabled",
      enabled: newEnabledState,
    })
    .then((response) => {
      console.log(
        `[DEBUG] Content: Received response from setTabEnabled:`,
        response
      );
      if (response && response.success) {
        isEnabled = newEnabledState;
        console.log(
          `[DEBUG] Content: Updated local isEnabled to: ${isEnabled}`
        );
        if (!newEnabledState) {
          removeHighlights();
        } else {
          // When enabling via shortcut, show the floating UI but don't override its minimized state
          browserAPI.runtime
            .sendMessage({ action: "showFloatingUIPreserveState" })
            .catch((error) => {
              console.error(
                "[DEBUG] Content: Error showing floating UI:",
                error
              );
            });
        }
        displayStatusMessage(
          `Sentence Follower ${newEnabledState ? "Enabled" : "Disabled"}`
        );
      } else {
        // Handle case when the background script returns an error
        console.error(
          "[DEBUG] Content: Failed to toggle highlighter:",
          response?.error || "Unknown error"
        );
        displayStatusMessage("Failed to toggle highlighting", true);
      }
    })
    .catch((error) => {
      console.error("[DEBUG] Content: Error toggling highlighter:", error);
      displayStatusMessage("Failed to toggle highlighting", true);
    });
}

// Display a status message to the user
function displayStatusMessage(message, isError = false) {
  const statusDiv = document.createElement("div");
  statusDiv.textContent = message;

  // Set styles based on whether this is an error or not
  Object.assign(statusDiv.style, {
    position: "fixed",
    top: "20px",
    right: "20px",
    padding: "10px 20px",
    backgroundColor: isError ? "#d32f2f" : "#333",
    color: "#fff",
    borderRadius: "5px",
    zIndex: "10000",
    transition: "opacity 0.5s",
    boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
    border: isError ? "1px solid #b71c1c" : "none",
  });

  // Add an icon for visual feedback if it's an error
  if (isError) {
    const iconSpan = document.createElement("span");
    iconSpan.textContent = "⚠️ ";
    statusDiv.prepend(iconSpan);
  }

  document.body.appendChild(statusDiv);

  // Keep error messages visible a bit longer
  const displayTime = isError ? 2500 : 1500;

  setTimeout(() => {
    statusDiv.style.opacity = "0";
  }, displayTime);
  setTimeout(() => {
    statusDiv.remove();
  }, displayTime + 500);
}

// Utility: Throttle function
function throttle(func, limit) {
  let inThrottle = false;
  return function (...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
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
document.addEventListener("keydown", (event) => {
  if (event.altKey && event.shiftKey && event.code === "KeyH") {
    toggleHighlighter();
  }
});

// Listen for messages from the background script
browserAPI.runtime.onMessage.addListener((message, sender, sendResponse) => {
  window.log.info("Message received:", message);

  if (message.action === "updateTabEnabled") {
    isEnabled = message.enabled === true;
    window.log.info("Tab enabled state updated:", isEnabled);

    // If disabled, remove highlights
    if (!isEnabled) {
      removeHighlights();
    }

    sendResponse({ success: true });
    return true;
  } else if (
    message.action === "updateTabFormatting" ||
    message.action === "applyFormatting"
  ) {
    if (message.formatting) {
      window.log.info("Tab formatting updated:", message.formatting);
      currentOptions = { ...currentOptions, ...message.formatting };
      applyStyles();

      // If we have an active highlight, reapply it to ensure it uses the new styles
      if (
        isEnabled &&
        document.querySelectorAll(".sentence-highlight").length > 0
      ) {
        window.log.info("Reapplying highlight with new styles");
        const highlights = Array.from(
          document.querySelectorAll(".sentence-highlight")
        );
        if (highlights.length > 0) {
          // Store the text content before removing highlights
          const highlightedText = highlights[0].textContent;
          // Get the container
          const container = highlights[0].closest(
            "p, div, article, section, li"
          );

          // Remove existing highlights
          removeHighlights();

          // If we have a container, try to rehighlight the same text
          if (container && highlightedText) {
            // Try to find the same text within the container
            const text = container.textContent;
            const offset = text.indexOf(highlightedText);
            if (offset >= 0) {
              highlightSentence(container, offset);
            }
          }
        }
      }
    }

    sendResponse({ success: true });
    return true;
  }

  return false;
});

// Observe DOM changes to initialize highlighter on dynamic content
const domObserver = new MutationObserver(() => {
  if (!document.querySelector("[data-sentence-highlighter-initialized]")) {
    initializeHighlighter();
  }
});

domObserver.observe(document.documentElement, {
  childList: true,
  subtree: true,
});

// Initialize the highlighter when the page is loaded
document.addEventListener("DOMContentLoaded", initializeHighlighter);

// Also try to initialize immediately in case DOMContentLoaded already fired
initializeHighlighter();

// Show the floating UI
function showFloatingUI() {
  // Directly communicate with the floating UI via the preserve state action
  browserAPI.runtime
    .sendMessage({ action: "showFloatingUIPreserveState" })
    .catch((error) => {
      console.error("[DEBUG] Content: Error showing floating UI:", error);
    });
}

// Hide the floating UI
function hideFloatingUI() {
  browserAPI.runtime
    .sendMessage({ action: "hideFloatingUI" })
    .catch((error) => {
      console.error("[DEBUG] Content: Error hiding floating UI:", error);
    });
}

// Export functions for testing
if (
  (typeof process !== "undefined" && process.env.NODE_ENV === "test") ||
  (typeof module !== "undefined" && module.exports)
) {
  module.exports = {
    findSentenceBoundaries,
    throttle,
    debounce,
    highlightSentence,
    removeHighlights,
    toggleHighlighter,
    checkTabEnabledState,
    displayStatusMessage,
    isEnabled: () => isEnabled,
    handleMouseMove,
    loadOptions,
    showFloatingUI,
    hideFloatingUI,
  };
}
