// browserAPI is globally defined in common.js which is loaded before this script

const DEFAULT_OPTIONS = {
  backgroundColor: "#ffff00",
  textColor: "#000000",
};

// Track the current active tab
let currentTabId = null;
let isFloatingUIVisible = false; // Track if floating UI is visible
let isUpdatingUI = false; // Flag to prevent recursive updates

// Check if floating UI is visible on current page
function checkFloatingUIVisibility() {
  console.log("[DEBUG] Popup: Checking floating UI visibility");

  // Query the current active tab
  browserAPI.tabs
    .query({ active: true, currentWindow: true })
    .then((tabs) => {
      if (tabs && tabs.length > 0) {
        const activeTab = tabs[0];

        // Ask the content script if the floating UI is visible
        browserAPI.tabs
          .sendMessage(activeTab.id, { action: "isFloatingUIVisible" })
          .then((response) => {
            console.log(
              "[DEBUG] Popup: Floating UI visibility response:",
              response
            );
            isFloatingUIVisible = response && response.visible === true;

            // Update UI based on floating UI visibility
            updateUIBasedOnFloatingVisibility();
            // Update popout/popin buttons visibility based on floating UI state
            updatePopoutButtonsVisibility();
          })
          .catch((error) => {
            console.error("Error checking floating UI visibility:", error);
            // Default to showing options if we can't determine floating UI state
            isFloatingUIVisible = false;
            updateUIBasedOnFloatingVisibility();
            updatePopoutButtonsVisibility();
          });
      }
    })
    .catch((error) => {
      console.error("Error querying active tab:", error);
    });
}

// Update the visibility of popout and popin buttons based on floating UI state
function updatePopoutButtonsVisibility() {
  const popoutButton = document.getElementById("popoutButton");
  const popinButton = document.getElementById("popinButton");

  if (popoutButton && popinButton) {
    if (isFloatingUIVisible) {
      // If floating UI is visible, show pop-in button and hide popout button
      popoutButton.style.display = "none";
      popinButton.style.display = "flex";
    } else {
      // If floating UI is not visible, show popout button and hide pop-in button
      popoutButton.style.display = "flex";
      popinButton.style.display = "none";
    }
  }
}

// Update the UI based on floating UI visibility
function updateUIBasedOnFloatingVisibility() {
  const optionsContainer = document.getElementById("color-options-container");
  const floatingUIMissing = document.getElementById("floating-ui-missing");

  if (isFloatingUIVisible) {
    // If floating UI is visible, hide options and show message
    if (optionsContainer) {
      optionsContainer.style.display = "none";
    }
    if (floatingUIMissing) {
      floatingUIMissing.style.display = "block";
    }
  } else {
    // If floating UI is not visible, show options
    if (optionsContainer) {
      optionsContainer.style.display = "block";

      // Initialize/update the color swatches when we show the options
      updateColorSwatches();

      // Also explicitly get the current formatting to ensure highlights are correct
      browserAPI.runtime
        .sendMessage({ action: "getTabFormatting" })
        .then((response) => {
          if (response && response.formatting) {
            updateSwatchSelections(response.formatting);
          }
        })
        .catch((error) => {
          console.error(
            "[DEBUG] Popup: Error getting formatting during UI update:",
            error
          );
        });
    }
    if (floatingUIMissing) {
      floatingUIMissing.style.display = "none";
    }
  }
}

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

  // First check if floating UI is visible
  checkFloatingUIVisibility();

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
              updateSwatchSelections(response.formatting);
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
  const colorOptions = document.querySelector(".color-options-container");
  if (colorOptions) {
    if (!isEnabled) {
      colorOptions.classList.add("disabled-section");
    } else {
      colorOptions.classList.remove("disabled-section");
    }
  }
}

// Color palette matching the floating UI
const colorPalette = {
  background: [
    "none", // No color
    "#ffff00", // Yellow
    "#ff0000", // Red
    "#00ff00", // Green
    "#0000ff", // Blue
    "#ff00ff", // Magenta
    "#00ffff", // Cyan
    "#000000", // Black
    "#ffffff", // White
  ],
  text: [
    "none", // No color
    "#ffff00", // Yellow
    "#ff0000", // Red
    "#00ff00", // Green
    "#0000ff", // Blue
    "#ff00ff", // Magenta
    "#00ffff", // Cyan
    "#000000", // Black
    "#ffffff", // White
  ],
};

// Function to update color swatches in the popup
function updateColorSwatches() {
  // Don't use isUpdatingUI flag here to prevent blocking
  // as we might need to update swatches even during other operations

  const bgColorSwatches = document.getElementById("bg-color-swatches");
  const textColorSwatches = document.getElementById("text-color-swatches");

  // Ensure elements exist
  if (!bgColorSwatches || !textColorSwatches) {
    console.error("[Popup] Color swatch elements not found");
    return;
  }

  // Clear existing swatches
  bgColorSwatches.innerHTML = "";
  textColorSwatches.innerHTML = "";

  // Add background color swatches
  colorPalette.background.forEach((color) => {
    const swatch = createColorSwatch(color, "background");
    bgColorSwatches.appendChild(swatch);
  });

  // Add text color swatches
  colorPalette.text.forEach((color) => {
    const swatch = createColorSwatch(color, "text");
    textColorSwatches.appendChild(swatch);
  });

  // Update selected swatches - use local flag to prevent nested calls
  let localIsUpdating = isUpdatingUI;
  if (!localIsUpdating) {
    isUpdatingUI = true;

    browserAPI.runtime
      .sendMessage({ action: "getTabFormatting" })
      .then((response) => {
        if (response && response.formatting) {
          updateSwatchSelections(response.formatting);
        }
      })
      .catch((err) => {
        console.error("[Popup] Error updating swatch selections:", err);
      })
      .finally(() => {
        isUpdatingUI = false;
      });
  }
}

// Update swatch selections based on current formatting
function updateSwatchSelections(formatting) {
  if (!formatting) return;

  const { backgroundColor, textColor } = formatting;
  console.log("[DEBUG] Popup: Updating swatch selections with:", formatting);

  // Get all swatch elements
  const bgSwatches = document.querySelectorAll('[data-type="background"]');
  const textSwatches = document.querySelectorAll('[data-type="text"]');

  // Update background color swatch selection
  bgSwatches.forEach((swatch) => {
    const swatchColor = swatch.getAttribute("data-color");
    if (
      (backgroundColor === null && swatchColor === "none") ||
      swatchColor === backgroundColor
    ) {
      swatch.style.boxShadow =
        "0 0 0 2px #4CAF50, 0 2px 5px rgba(0, 0, 0, 0.2)";
      swatch.classList.add("selected");
    } else {
      swatch.style.boxShadow = "none";
      swatch.classList.remove("selected");
    }
  });

  // Update text color swatch selection
  textSwatches.forEach((swatch) => {
    const swatchColor = swatch.getAttribute("data-color");
    if (
      (textColor === null && swatchColor === "none") ||
      swatchColor === textColor
    ) {
      swatch.style.boxShadow =
        "0 0 0 2px #4CAF50, 0 2px 5px rgba(0, 0, 0, 0.2)";
      swatch.classList.add("selected");
    } else {
      swatch.style.boxShadow = "none";
      swatch.classList.remove("selected");
    }
  });

  // Update preview text with selected colors
  updatePreviewText(
    backgroundColor === null ? null : backgroundColor,
    textColor === null ? null : textColor
  );
}

// Update preview text with current colors
function updatePreviewText(backgroundColor, textColor) {
  const previewText = document.getElementById("color-preview-text");
  if (!previewText) return;

  // Apply background color or default to transparent
  if (backgroundColor && backgroundColor !== "none") {
    previewText.style.backgroundColor = backgroundColor;
  } else {
    previewText.style.backgroundColor = "transparent";
  }

  // Apply text color or default to black
  if (textColor && textColor !== "none") {
    previewText.style.color = textColor;
  } else {
    previewText.style.color = "#000000";
  }
}

// Create a color swatch element
function createColorSwatch(color, type) {
  const swatch = document.createElement("div");
  swatch.style.width = "20px";
  swatch.style.height = "20px";
  swatch.style.position = "relative";
  swatch.style.borderRadius = "3px";
  swatch.style.cursor = "pointer";
  swatch.style.border = "1px solid #ccc";
  swatch.setAttribute("data-color", color);
  swatch.setAttribute("data-type", type);

  // Special styling for "no change" option
  if (color === "none") {
    swatch.classList.add("color-swatch", "no-color");
    swatch.style.backgroundColor = "#e0e0e0";

    // Add diagonal line
    const line = document.createElement("div");
    line.style.content = "";
    line.style.position = "absolute";
    line.style.top = "0";
    line.style.left = "50%";
    line.style.width = "1px";
    line.style.height = "100%";
    line.style.backgroundColor = "#ff0000";
    line.style.transform = "rotate(45deg)";

    swatch.appendChild(line);
  } else {
    swatch.style.backgroundColor = color;
  }

  // Add click handler
  swatch.addEventListener("click", () => {
    if (isUpdatingUI) return; // Prevent clicks during updates

    // Mark as updating to prevent recursive updates
    isUpdatingUI = true;

    try {
      // Mark the swatch as selected immediately for visual feedback
      const allSwatches = document.querySelectorAll(`[data-type="${type}"]`);
      allSwatches.forEach((s) => (s.style.boxShadow = "none"));
      swatch.style.boxShadow = "0 0 0 2px #4CAF50";

      // Prepare the color change options
      const options = {};
      if (type === "background") {
        options.backgroundColor = color === "none" ? null : color;
      } else if (type === "text") {
        options.textColor = color === "none" ? null : color;
      }

      // Get current settings to properly update the preview
      browserAPI.runtime
        .sendMessage({ action: "getTabFormatting" })
        .then((response) => {
          const currentFormatting =
            response && response.formatting ? response.formatting : {};

          // Merge the new color with existing formatting
          let bgColor = currentFormatting.backgroundColor;
          let txtColor = currentFormatting.textColor;

          if (type === "background") {
            bgColor = color === "none" ? null : color;
          } else if (type === "text") {
            txtColor = color === "none" ? null : color;
          }

          // Update preview immediately for responsive UI
          updatePreviewText(bgColor, txtColor);

          // Apply the change to extension state and CONTENT SCRIPTS immediately
          browserAPI.tabs
            .query({ active: true, currentWindow: true })
            .then((tabs) => {
              if (tabs && tabs.length > 0) {
                const activeTab = tabs[0];

                // Apply changes to background state
                browserAPI.runtime
                  .sendMessage({
                    action: "setTabFormatting",
                    tabId: activeTab.id,
                    formatting: options,
                  })
                  .then(() => {
                    // Show feedback that changes were applied
                    const status = document.getElementById("status");
                    if (status) {
                      status.textContent = "Changes applied";
                      status.classList.add("show");
                      setTimeout(() => status.classList.remove("show"), 1000);
                    }

                    console.log(
                      "[DEBUG] Popup: Applied color change:",
                      options
                    );

                    // Force update content script with direct message to ensure highlighting changes
                    browserAPI.tabs
                      .sendMessage(activeTab.id, {
                        action: "applyFormatting",
                        formatting: options,
                      })
                      .catch((error) => {
                        console.error(
                          "[DEBUG] Popup: Error directly updating content script:",
                          error
                        );
                      });

                    // Notify floating UI if it's open
                    browserAPI.tabs
                      .sendMessage(activeTab.id, {
                        action: "updateFloatingUIFormatting",
                        formatting: options,
                      })
                      .catch(() => {
                        // This is expected to fail if floating UI isn't open, so we can ignore the error
                      });
                  })
                  .catch((err) => {
                    console.error(
                      "[DEBUG] Popup: Error applying color change:",
                      err
                    );
                  })
                  .finally(() => {
                    isUpdatingUI = false;
                  });
              } else {
                isUpdatingUI = false;
              }
            })
            .catch((error) => {
              console.error(
                "[DEBUG] Popup: Error getting active tab for direct update:",
                error
              );
              isUpdatingUI = false;
            });
        })
        .catch((err) => {
          console.error(
            "[DEBUG] Popup: Error getting current formatting:",
            err
          );
          isUpdatingUI = false;

          // Even if we couldn't get current formatting, still try to apply the change
          browserAPI.runtime.sendMessage({
            action: "setTabFormatting",
            formatting: options,
          });
        });
    } catch (error) {
      console.error(
        "[DEBUG] Popup: Error in color swatch click handler:",
        error
      );
      isUpdatingUI = false;
    }
  });

  return swatch;
}

// Set up the popout button
function setupPopoutButton() {
  // Main popout button
  const popoutButton = document.getElementById("popoutButton");
  const popinButton = document.getElementById("popinButton");

  if (popoutButton) {
    popoutButton.addEventListener("click", showFloatingUI);
  }

  if (popinButton) {
    popinButton.addEventListener("click", hideFloatingUIAndRefreshPopup);
  }

  // Button in the "floating UI is visible" message
  const showFloatingUIButton = document.getElementById("show-floating-ui");
  if (showFloatingUIButton) {
    // This button specifically should close the popup after showing the floating UI
    showFloatingUIButton.addEventListener("click", showFloatingUIAndClosePopup);
  }
}

// Helper function to hide floating UI and refresh popup
function hideFloatingUIAndRefreshPopup() {
  // Get the current active tab
  browserAPI.tabs
    .query({ active: true, currentWindow: true })
    .then((tabs) => {
      if (tabs && tabs.length > 0) {
        const activeTab = tabs[0];

        // Send message to hide the floating UI
        browserAPI.tabs
          .sendMessage(activeTab.id, {
            action: "hideFloatingUI",
          })
          .then(() => {
            console.log("[DEBUG] Popup: Sent hideFloatingUI message to tab");
            // Update the popup UI to reflect the floating UI is now hidden
            isFloatingUIVisible = false;
            updateUIBasedOnFloatingVisibility();
            updatePopoutButtonsVisibility();

            // Explicitly fetch current formatting and update swatch selections
            browserAPI.runtime
              .sendMessage({
                action: "getTabFormatting",
                tabId: activeTab.id,
              })
              .then((response) => {
                if (response && response.formatting) {
                  console.log(
                    "[DEBUG] Popup: Explicitly updating swatches after pop-in"
                  );
                  updateSwatchSelections(response.formatting);
                }
              })
              .catch((error) => {
                console.error(
                  "[DEBUG] Popup: Error fetching formatting after pop-in:",
                  error
                );
              });
          })
          .catch((error) => {
            console.error(
              "[DEBUG] Popup: Error sending hideFloatingUI message:",
              error
            );
          });
      }
    })
    .catch((error) => {
      console.error("Error getting active tab:", error);
    });
}

// Helper function to show floating UI and close popup (only used for "Show Floating Controls" button)
function showFloatingUIAndClosePopup() {
  // Get the current active tab
  browserAPI.tabs
    .query({ active: true, currentWindow: true })
    .then((tabs) => {
      if (tabs && tabs.length > 0) {
        const activeTab = tabs[0];

        // First get current formatting and enabled state to pass along
        Promise.all([
          browserAPI.runtime.sendMessage({
            action: "getTabFormatting",
            tabId: activeTab.id,
          }),
          browserAPI.runtime.sendMessage({
            action: "getTabEnabled",
            tabId: activeTab.id,
          }),
        ])
          .then(([formattingResponse, enabledResponse]) => {
            const formatting = formattingResponse?.formatting || {};
            const enabled = enabledResponse?.enabled || false;

            // Send a message to the tab to show the floating UI with current settings
            browserAPI.tabs
              .sendMessage(activeTab.id, {
                action: "showFloatingUIPreserveState",
                formatting: formatting,
                enabled: enabled,
              })
              .then(() => {
                // Close the popup
                window.close();
              })
              .catch((error) => {
                console.error(
                  "[DEBUG] Popup: Error sending showFloatingUIPreserveState message:",
                  error
                );
              });
          })
          .catch((error) => {
            console.error(
              "[DEBUG] Popup: Error getting current settings:",
              error
            );

            // Fall back to just showing floating UI without explicit settings
            browserAPI.tabs
              .sendMessage(activeTab.id, {
                action: "showFloatingUIPreserveState",
              })
              .then(() => {
                // Close the popup
                window.close();
              })
              .catch((error) => {
                console.error(
                  "[DEBUG] Popup: Error sending showFloatingUIPreserveState message:",
                  error
                );
              });
          });
      }
    })
    .catch((error) => {
      console.error("Error getting active tab:", error);
    });
}

// Helper function to show floating UI (no longer closes popup)
function showFloatingUI() {
  // Get the current active tab
  browserAPI.tabs
    .query({ active: true, currentWindow: true })
    .then((tabs) => {
      if (tabs && tabs.length > 0) {
        const activeTab = tabs[0];

        // First get current formatting and enabled state to pass along
        Promise.all([
          browserAPI.runtime.sendMessage({
            action: "getTabFormatting",
            tabId: activeTab.id,
          }),
          browserAPI.runtime.sendMessage({
            action: "getTabEnabled",
            tabId: activeTab.id,
          }),
        ])
          .then(([formattingResponse, enabledResponse]) => {
            const formatting = formattingResponse?.formatting || {};
            const enabled = enabledResponse?.enabled || false;

            console.log(
              "[DEBUG] Popup: Got current settings to pass to floating UI:",
              { formatting, enabled }
            );

            // Update floating UI visibility state
            isFloatingUIVisible = true;

            // Update popout/popin buttons visibility
            updatePopoutButtonsVisibility();

            // Send a message to the tab to show the floating UI with current settings
            browserAPI.tabs
              .sendMessage(activeTab.id, {
                action: "showFloatingUIPreserveState",
                formatting: formatting,
                enabled: enabled,
              })
              .then(() => {
                console.log(
                  "[DEBUG] Popup: Sent showFloatingUIPreserveState message to tab with settings"
                );
                // Update UI based on floating UI visibility
                updateUIBasedOnFloatingVisibility();
              })
              .catch((error) => {
                console.error(
                  "[DEBUG] Popup: Error sending showFloatingUIPreserveState message:",
                  error
                );
              });
          })
          .catch((error) => {
            console.error(
              "[DEBUG] Popup: Error getting current settings:",
              error
            );

            // Fall back to just showing floating UI without explicit settings
            browserAPI.tabs
              .sendMessage(activeTab.id, {
                action: "showFloatingUIPreserveState",
              })
              .then(() => {
                // Update UI based on floating UI visibility
                isFloatingUIVisible = true;
                updateUIBasedOnFloatingVisibility();
                updatePopoutButtonsVisibility();
              })
              .catch((error) => {
                console.error(
                  "[DEBUG] Popup: Error sending showFloatingUIPreserveState message:",
                  error
                );
              });
          });
      }
    })
    .catch((error) => {
      console.error("Error getting active tab:", error);
    });
}

// Document ready handler
document.addEventListener("DOMContentLoaded", () => {
  console.log("[DEBUG] Popup: DOMContentLoaded fired");

  // Initialize the UI (will check floating UI visibility)
  restoreOptions();

  // Set up the toggle button
  setupToggleButton();

  // Set up the popout button
  setupPopoutButton();

  // Initialize popout/popin button states
  updatePopoutButtonsVisibility();

  // Listen for messages from the background script
  setupMessageListeners();
});

// Set up toggle button
function setupToggleButton() {
  const enabledToggle = document.getElementById("enabledToggle");
  if (enabledToggle) {
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
}

// Listen for messages from the background script
function setupMessageListeners() {
  browserAPI.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("[DEBUG] Popup: Received message:", message);

    if (
      message.action === "updateTabEnabled" ||
      message.action === "tabEnabledChanged"
    ) {
      // Handle both background script and floating UI updates to enabled state
      const enabledToggle = document.getElementById("enabledToggle");
      if (enabledToggle) {
        const isEnabled = message.enabled === true;
        console.log(
          "[DEBUG] Popup: Setting toggle to",
          isEnabled ? "ACTIVE" : "INACTIVE",
          "from message"
        );

        if (isEnabled) {
          enabledToggle.classList.add("active");
          enabledToggle.setAttribute("aria-pressed", "true");
        } else {
          enabledToggle.classList.remove("active");
          enabledToggle.setAttribute("aria-pressed", "false");
        }

        // Update UI states based on the toggle
        updateColorPickersState(isEnabled);
      }
    } else if (
      message.action === "updateTabFormatting" ||
      message.action === "tabFormattingChanged"
    ) {
      console.log("[DEBUG] Popup: Received formatting update message");

      // If we got direct formatting with the message, apply it
      if (message.formatting) {
        console.log(
          "[DEBUG] Popup: Applying direct formatting:",
          message.formatting
        );
        if (!isUpdatingUI) {
          isUpdatingUI = true;
          try {
            updateSwatchSelections(message.formatting);
          } catch (err) {
            console.error(
              "[DEBUG] Popup: Error applying direct formatting:",
              err
            );
          } finally {
            isUpdatingUI = false;
          }
        }
      }
      // Otherwise query for current formatting
      else if (!isUpdatingUI) {
        isUpdatingUI = true;
        browserAPI.runtime
          .sendMessage({ action: "getTabFormatting" })
          .then((response) => {
            if (response && response.formatting) {
              console.log(
                "[DEBUG] Popup: Updating UI with formatting:",
                response.formatting
              );
              updateSwatchSelections(response.formatting);
            }
          })
          .catch((err) => {
            console.error("[DEBUG] Popup: Error getting formatting:", err);
          })
          .finally(() => {
            isUpdatingUI = false;
          });
      }
    } else if (message.action === "updateFloatingUIVisibility") {
      console.log(
        "[DEBUG] Popup: Floating UI visibility changed to:",
        message.visible
      );
      // Update our knowledge of floating UI visibility
      isFloatingUIVisible = message.visible === true;
      updateUIBasedOnFloatingVisibility();
    }

    // Always return true for async response handling
    return true;
  });
}

// Export functions for testing
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    restoreOptions,
    updateTabIndicator,
    handleToggleChange,
    updateColorPickersState,
    getDomainFromTab,
    checkFloatingUIVisibility,
    updateUIBasedOnFloatingVisibility,
  };
}
