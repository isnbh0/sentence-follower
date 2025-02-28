// Add browserAPI definition at the top
const browserAPI =
  typeof window !== "undefined" && window.browser
    ? window.browser
    : typeof chrome !== "undefined"
    ? chrome
    : {
        storage: {
          local: { get: async () => ({}), set: async () => {} },
        },
        runtime: {
          sendMessage: async () => {},
        },
        tabs: {
          query: async () => [],
          sendMessage: async (tabId, message) => {},
        },
      };

const DEFAULT_OPTIONS = {
  backgroundColor: "#ffff00",
  textColor: "#000000",
};

// Track the current active tab
let currentTabId = null;

// Save options for the current tab
function saveOptions(options) {
  // Get the current active tab
  browserAPI.tabs
    .query({ active: true, currentWindow: true })
    .then((tabs) => {
      if (tabs && tabs.length > 0) {
        const activeTab = tabs[0];

        // Send a message to set the formatting options for this specific tab
        browserAPI.runtime
          .sendMessage({
            action: "setTabFormatting",
            tabId: activeTab.id,
            formatting: options,
          })
          .then(() => {
            const status = document.getElementById("status");
            status.classList.add("show");
            setTimeout(() => status.classList.remove("show"), 1500);

            // Update the tab indicator to show formatting is per-tab
            const tabIndicator = document.getElementById("tabIndicator");
            if (tabIndicator) {
              tabIndicator.textContent = `Settings affect current tab only: ${getDomainFromTab(
                activeTab
              )}`;
            }
          })
          .catch((error) => {
            console.error("Error setting tab formatting:", error);
          });
      }
    })
    .catch((error) => {
      console.error("Error getting active tab:", error);
    });
}

// Handle toggle button state change
function handleToggleChange(isEnabled) {
  // Get the current active tab
  browserAPI.tabs
    .query({ active: true, currentWindow: true })
    .then((tabs) => {
      if (tabs && tabs.length > 0) {
        const activeTab = tabs[0];

        // Send a message to set the enabled state for this specific tab
        browserAPI.runtime
          .sendMessage({
            action: "setTabEnabled",
            tabId: activeTab.id,
            enabled: isEnabled,
          })
          .then(() => {
            updateColorPickersState(isEnabled);
          })
          .catch((error) => {
            console.error("Error setting tab enabled state:", error);
          });
      }
    })
    .catch((error) => {
      console.error("Error getting active tab:", error);
    });
}

// Helper function to get domain from tab
function getDomainFromTab(tab) {
  let domain = "";
  try {
    if (tab.url) {
      const url = new URL(tab.url);
      domain = url.hostname;
    }
  } catch (e) {
    console.error("Error parsing URL:", e);
  }
  return domain || "current tab";
}

// Update the tab indicator with current tab info
function updateTabIndicator(tab) {
  const tabIndicator = document.getElementById("tabIndicator");
  if (tabIndicator && tab) {
    // Store the current tab ID
    currentTabId = tab.id;

    // Get domain for display
    const domain = getDomainFromTab(tab);

    // Update the indicator text
    tabIndicator.textContent = `Settings affect current tab only: ${domain}`;
  }
}

// Restore options from the current tab
function restoreOptions() {
  console.log("[DEBUG] Popup: restoreOptions() called");

  // Get the current tab to check its state
  browserAPI.tabs
    .query({ active: true, currentWindow: true })
    .then((tabs) => {
      if (tabs && tabs.length > 0) {
        const activeTab = tabs[0];
        console.log("[DEBUG] Popup: Found active tab with ID:", activeTab.id);

        // Update the tab indicator
        updateTabIndicator(activeTab);

        // Get the tab-specific formatting options
        browserAPI.runtime
          .sendMessage({
            action: "getTabFormatting",
            tabId: activeTab.id,
          })
          .then((response) => {
            console.log("[DEBUG] Popup: Got formatting response:", response);
            if (response && response.formatting) {
              const formatting = response.formatting;

              // Restore Background Color Selection
              const bgSwatches = document.querySelectorAll(
                "#backgroundColorOptions .color-swatch"
              );
              bgSwatches.forEach((swatch) => {
                if (swatch.dataset.color === formatting.backgroundColor) {
                  swatch.classList.add("selected");
                } else {
                  swatch.classList.remove("selected");
                }
              });

              // Restore Text Color Selection
              const textSwatches = document.querySelectorAll(
                "#textColorOptions .color-swatch"
              );
              textSwatches.forEach((swatch) => {
                if (swatch.dataset.color === formatting.textColor) {
                  swatch.classList.add("selected");
                } else {
                  swatch.classList.remove("selected");
                }
              });

              // Update the preview panel
              updatePreview();
            }
          })
          .catch((error) => {
            console.error("Error getting tab formatting:", error);
          });

        // Check if the current tab has highlighting enabled
        console.log(
          "[DEBUG] Popup: Sending getTabEnabled message for tab:",
          activeTab.id
        );
        browserAPI.runtime
          .sendMessage({
            action: "getTabEnabled",
            tabId: activeTab.id,
          })
          .then((response) => {
            console.log("[DEBUG] Popup: Got enabled state response:", response);
            const isEnabled = response && response.enabled === true;
            console.log("[DEBUG] Popup: Tab enabled state is:", isEnabled);

            // Restore Toggle Button State based on current tab only
            const enabledToggle = document.getElementById("enabledToggle");
            if (isEnabled) {
              enabledToggle.classList.add("active");
              enabledToggle.setAttribute("aria-pressed", "true");
              console.log("[DEBUG] Popup: Set toggle to ACTIVE");
            } else {
              enabledToggle.classList.remove("active");
              enabledToggle.setAttribute("aria-pressed", "false");
              console.log("[DEBUG] Popup: Set toggle to INACTIVE");
            }

            // Update UI States based on this tab's toggle state
            updateColorPickersState(isEnabled);
          })
          .catch((error) => {
            console.error("Error getting tab enabled state:", error);
            // Default to disabled if there's an error
            const enabledToggle = document.getElementById("enabledToggle");
            enabledToggle.classList.remove("active");
            enabledToggle.setAttribute("aria-pressed", "false");
            updateColorPickersState(false);
          });
      }
    })
    .catch((error) => {
      console.error("Error getting active tab:", error);
    });
}

// Function to invert color for text readability (Optional)
function invertColor(hex) {
  // Ensure hex is 6 characters
  hex = hex.replace("#", "");
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((char) => char + char)
      .join("");
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
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

// Update color pickers based on the toggle state
function updateColorPickersState(isEnabled) {
  const settingsBox = document.querySelector(".settings-box");
  if (!isEnabled) {
    settingsBox.classList.add("disabled-section");
  } else {
    settingsBox.classList.remove("disabled-section");
  }
}

// Setup Color Swatch Selection
function setupColorSwatches() {
  // Background Color Swatches
  const bgSwatches = document.querySelectorAll(
    "#backgroundColorOptions .color-swatch"
  );
  bgSwatches.forEach((swatch) => {
    swatch.addEventListener("click", () => {
      bgSwatches.forEach((s) => s.classList.remove("selected"));
      swatch.classList.add("selected");
      updatePreview();
    });
  });

  // Text Color Swatches
  const textSwatches = document.querySelectorAll(
    "#textColorOptions .color-swatch"
  );
  textSwatches.forEach((swatch) => {
    swatch.addEventListener("click", () => {
      textSwatches.forEach((s) => s.classList.remove("selected"));
      swatch.classList.add("selected");
      updatePreview();
    });
  });
}

// Setup Toggle Button
function setupToggleButton() {
  const enabledToggle = document.getElementById("enabledToggle");
  enabledToggle.addEventListener("click", () => {
    const isCurrentlyEnabled = enabledToggle.classList.contains("active");
    const newState = !isCurrentlyEnabled;

    if (newState) {
      enabledToggle.classList.add("active");
      enabledToggle.setAttribute("aria-pressed", "true");
    } else {
      enabledToggle.classList.remove("active");
      enabledToggle.setAttribute("aria-pressed", "false");
    }

    handleToggleChange(newState);
  });
}

// Handle form submission
function handleFormSubmit() {
  document.getElementById("options-form").addEventListener("submit", (e) => {
    e.preventDefault();

    // Get selected colors
    const backgroundColor = getSelectedColor("#backgroundColorOptions");
    const textColor = getSelectedColor("#textColorOptions");

    // Save options for the current tab
    saveOptions({
      backgroundColor,
      textColor,
    });
  });
}

// Get the selected color from a color panel
function getSelectedColor(panelSelector) {
  const selectedSwatch = document.querySelector(
    `${panelSelector} .color-swatch.selected`
  );
  return selectedSwatch
    ? selectedSwatch.dataset.color
    : DEFAULT_OPTIONS.backgroundColor;
}

// Initialize color swatches
function initializeColorSwatches() {
  // Set up event listeners for color swatches
  setupColorSwatches();

  // Set up toggle button
  setupToggleButton();

  // Set up form submission
  handleFormSubmit();

  // Restore options from storage
  restoreOptions();
}

// Add new function to update preview
function updatePreview() {
  const previewText = document.getElementById("previewText");
  const selectedBackground = document.querySelector(
    "#backgroundColorOptions .color-swatch.selected"
  );
  const selectedText = document.querySelector(
    "#textColorOptions .color-swatch.selected"
  );

  // Set background color
  if (selectedBackground && selectedBackground.dataset.color === "default") {
    previewText.style.backgroundColor = "";
  } else if (selectedBackground) {
    previewText.style.backgroundColor = selectedBackground.dataset.color;
  }

  // Set text color
  if (selectedText && selectedText.dataset.color === "default") {
    previewText.style.color = "";
  } else if (selectedText) {
    previewText.style.color = selectedText.dataset.color;
  }
}

// Initialize when the DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  console.log("[DEBUG] Popup: DOMContentLoaded event fired");
  initializeColorSwatches();

  // Add a message listener to detect tab state changes
  browserAPI.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("[DEBUG] Popup: Received message:", message);

    // If we receive a message about tab enabled state changing
    if (message.action === "updateTabEnabled") {
      console.log(
        "[DEBUG] Popup: Received updateTabEnabled message with enabled =",
        message.enabled
      );

      // Update the toggle button state
      const enabledToggle = document.getElementById("enabledToggle");
      if (message.enabled) {
        console.log("[DEBUG] Popup: Setting toggle to ACTIVE from message");
        enabledToggle.classList.add("active");
        enabledToggle.setAttribute("aria-pressed", "true");
      } else {
        console.log("[DEBUG] Popup: Setting toggle to INACTIVE from message");
        enabledToggle.classList.remove("active");
        enabledToggle.setAttribute("aria-pressed", "false");
      }

      // Update UI States based on this message
      updateColorPickersState(message.enabled);

      sendResponse({ success: true });
      return true;
    }

    return false;
  });
});

// Export functions for testing
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    restoreOptions,
    updateTabIndicator,
    handleToggleChange,
    updateColorPickersState,
    getDomainFromTab,
  };
}
