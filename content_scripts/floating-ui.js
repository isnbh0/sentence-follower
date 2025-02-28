// Floating UI for Sentence Follower
// browserAPI is now defined in common.js and shared across content scripts

// Default position for the floating UI
const DEFAULT_POSITION = {
  top: "100px",
  right: "20px",
};

// Track the floating UI's state
let isFloatingUIVisible = false;
let isMinimized = false; // New state to track minimized state
let floatingUIContainer = null;
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let initialPositionX = 0;
let initialPositionY = 0;
let isUpdatingUI = false; // Flag to prevent recursive updates
// Store element references for easier access
let contentElements = null; // Will hold all elements below the header

// Initialize the floating UI
function initFloatingUI() {
  if (floatingUIContainer) {
    return; // Already initialized
  }

  // Create the main container
  floatingUIContainer = document.createElement("div");
  floatingUIContainer.id = "sentence-follower-floating-ui";
  floatingUIContainer.setAttribute("data-sentence-follower-ui", "true"); // Add data attribute for easier detection
  floatingUIContainer.style.position = "fixed";
  floatingUIContainer.style.top = DEFAULT_POSITION.top;
  floatingUIContainer.style.right = DEFAULT_POSITION.right;
  floatingUIContainer.style.backgroundColor = "#fff";
  floatingUIContainer.style.borderRadius = "8px";
  floatingUIContainer.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.2)";
  floatingUIContainer.style.padding = "10px";
  floatingUIContainer.style.zIndex = "10000";
  floatingUIContainer.style.width = "200px";
  floatingUIContainer.style.fontFamily = "system-ui, -apple-system, sans-serif";
  floatingUIContainer.style.fontSize = "14px";
  floatingUIContainer.style.border = "1px solid #ddd";
  floatingUIContainer.style.display = "none"; // Start hidden
  floatingUIContainer.style.transition = "opacity 0.2s";
  floatingUIContainer.style.cursor = "move"; // Show move cursor on header

  // Create the header with title and close/minimize buttons
  const header = document.createElement("div");
  header.id = "floating-ui-header";
  header.style.display = "flex";
  header.style.justifyContent = "space-between";
  header.style.alignItems = "center";
  header.style.marginBottom = "10px";
  header.style.paddingBottom = "8px";
  header.style.borderBottom = "1px solid #eee";
  header.style.cursor = "pointer"; // Indicate it's clickable
  // Add click handler to expand when minimized
  header.addEventListener("click", (e) => {
    // Only expand if clicking on the plus button when minimized
    // The plus button click is handled by the button's own click handler
    // This handler is now empty as we don't want header clicks to un-minimize
  });

  // Replace title text with extension icon
  const iconContainer = document.createElement("div");
  iconContainer.className = "floating-ui-icon";
  iconContainer.style.display = "flex";
  iconContainer.style.alignItems = "center";

  // Create and add the icon - using bigger icon and increasing its size
  const icon = document.createElement("img");
  icon.src = browserAPI.runtime.getURL("icons/icon128.png");
  icon.alt = "Sentence Follower";
  icon.style.width = "20px"; // Slightly bigger
  icon.style.height = "20px"; // Slightly bigger
  icon.style.marginRight = "5px";
  iconContainer.appendChild(icon);

  header.appendChild(iconContainer);

  // Create the toggle switch to be added right after the icon
  const toggleSwitch = document.createElement("div");
  toggleSwitch.className = "floating-toggle-button";
  toggleSwitch.style.position = "relative";
  toggleSwitch.style.width = "32px"; // Slightly smaller to fit in header
  toggleSwitch.style.height = "16px"; // Slightly smaller to fit in header
  toggleSwitch.style.backgroundColor = "#ccc";
  toggleSwitch.style.borderRadius = "8px";
  toggleSwitch.style.cursor = "pointer";
  toggleSwitch.style.transition = "0.3s";
  // Remove margin-left: auto to position it next to the icon instead of on the right
  toggleSwitch.style.marginRight = "0"; // No right margin needed now
  toggleSwitch.style.marginLeft = "3px"; // Small space after the icon

  // Toggle switch handle
  const toggleHandle = document.createElement("div");
  toggleHandle.style.position = "absolute";
  toggleHandle.style.width = "12px"; // Slightly smaller to match
  toggleHandle.style.height = "12px"; // Slightly smaller to match
  toggleHandle.style.left = "2px";
  toggleHandle.style.top = "2px";
  toggleHandle.style.backgroundColor = "white";
  toggleHandle.style.borderRadius = "50%";
  toggleHandle.style.transition = "0.3s";
  toggleSwitch.appendChild(toggleHandle);

  toggleSwitch.addEventListener("click", (e) => {
    e.stopPropagation(); // Prevent header click event from firing
    if (isUpdatingUI) return; // Prevent clicks during updates

    isUpdatingUI = true;

    try {
      // Get the current state from the UI
      const isCurrentlyEnabled = toggleSwitch.classList.contains("active");
      const newState = !isCurrentlyEnabled;

      // Handle the visual update immediately for responsive UI
      updateToggleSwitch(newState);

      // Send the message to the background script to update the state
      browserAPI.runtime
        .sendMessage({
          action: "setTabEnabled",
          enabled: newState,
        })
        .then(() => {
          console.log("[FloatingUI] Tab enabled state updated to:", newState);

          // Notify options page if open
          browserAPI.runtime.sendMessage({
            action: "tabEnabledChanged",
            enabled: newState,
          });
        })
        .catch((err) => {
          console.error("[FloatingUI] Error updating tab enabled state:", err);
          // Revert UI if update fails
          updateToggleSwitch(!newState);
        })
        .finally(() => {
          isUpdatingUI = false;
        });
    } catch (error) {
      console.error("[FloatingUI] Error in toggle click handler:", error);
      isUpdatingUI = false;
    }
  });

  // Add the toggle right after the icon
  header.appendChild(toggleSwitch);

  // Actions container - now needs to be pushed to the right
  const actions = document.createElement("div");
  actions.style.display = "flex";
  actions.style.gap = "5px";
  actions.style.marginLeft = "auto"; // This pushes it to the right

  // Minimize button
  const minimizeBtn = document.createElement("button");
  minimizeBtn.textContent = "−";
  minimizeBtn.title = "Minimize";
  minimizeBtn.style.border = "none";
  minimizeBtn.style.background = "transparent";
  minimizeBtn.style.cursor = "pointer";
  minimizeBtn.style.fontSize = "16px";
  minimizeBtn.style.padding = "0 5px";
  minimizeBtn.addEventListener("click", (e) => {
    e.stopPropagation(); // Prevent expanding when clicking minimize
    if (isMinimized) {
      expandFloatingUI();
    } else {
      minimizeFloatingUI();
    }
  });
  actions.appendChild(minimizeBtn);

  // Close button
  const closeBtn = document.createElement("button");
  closeBtn.textContent = "×";
  closeBtn.title = "Close";
  closeBtn.style.border = "none";
  closeBtn.style.background = "transparent";
  closeBtn.style.cursor = "pointer";
  closeBtn.style.fontSize = "16px";
  closeBtn.style.padding = "0 5px";
  closeBtn.addEventListener("click", (e) => {
    e.stopPropagation(); // Prevent expanding when clicking close
    hideFloatingUI();
  });
  actions.appendChild(closeBtn);

  header.appendChild(actions);
  floatingUIContainer.appendChild(header);

  // Add drag functionality
  header.addEventListener("mousedown", startDrag);

  // Add color swatches section
  const colorsSection = document.createElement("div");
  colorsSection.style.marginBottom = "15px";

  // Create a flex container for color groups
  const colorGroups = document.createElement("div");
  colorGroups.style.display = "flex";
  colorGroups.style.gap = "0";
  colorGroups.style.justifyContent = "center";
  colorGroups.style.position = "relative";
  colorGroups.style.alignItems = "flex-start"; // Align items at the top

  // Add a vertical divider between sections
  const divider = document.createElement("div");
  divider.style.position = "absolute";
  divider.style.left = "50%";
  divider.style.top = "0";
  divider.style.bottom = "0";
  divider.style.width = "2px";
  divider.style.backgroundColor = "#bbb";
  divider.style.transform = "translateX(-50%)";
  divider.style.borderRadius = "1px";
  divider.style.boxShadow = "0 0 3px rgba(0,0,0,0.1)";
  divider.style.zIndex = "1";
  colorGroups.appendChild(divider);

  // Create a shared style for both containers to ensure symmetry
  const colorContainerStyle = {
    width: "45%",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  };

  const colorLabelStyle = {
    fontWeight: "bold",
    margin: "0 0 8px 0",
    padding: "0",
    lineHeight: "1.2",
    fontSize: "14px",
    textAlign: "center",
    width: "100%",
    display: "block",
  };

  // Background color swatches
  const bgColorContainer = document.createElement("div");
  Object.assign(bgColorContainer.style, colorContainerStyle);
  bgColorContainer.style.paddingRight = "10px";

  const bgColorLabel = document.createElement("div");
  Object.assign(bgColorLabel.style, colorLabelStyle);
  bgColorLabel.textContent = "Background";
  bgColorContainer.appendChild(bgColorLabel);

  const bgColorSwatches = document.createElement("div");
  bgColorSwatches.id = "bg-color-swatches";
  bgColorSwatches.style.display = "grid";
  bgColorSwatches.style.gridTemplateColumns = "repeat(3, 1fr)";
  bgColorSwatches.style.gap = "5px";
  bgColorSwatches.style.width = "100%";
  bgColorSwatches.style.margin = "0 auto";

  bgColorContainer.appendChild(bgColorSwatches);
  colorGroups.appendChild(bgColorContainer);

  // Text color swatches
  const textColorContainer = document.createElement("div");
  Object.assign(textColorContainer.style, colorContainerStyle);
  textColorContainer.style.paddingLeft = "10px";

  const textColorLabel = document.createElement("div");
  Object.assign(textColorLabel.style, colorLabelStyle);
  textColorLabel.textContent = "Text";
  textColorContainer.appendChild(textColorLabel);

  const textColorSwatches = document.createElement("div");
  textColorSwatches.id = "text-color-swatches";
  textColorSwatches.style.display = "grid";
  textColorSwatches.style.gridTemplateColumns = "repeat(3, 1fr)";
  textColorSwatches.style.gap = "5px";
  textColorSwatches.style.width = "100%";
  textColorSwatches.style.margin = "0 auto";

  textColorContainer.appendChild(textColorSwatches);
  colorGroups.appendChild(textColorContainer);

  colorsSection.appendChild(colorGroups);
  floatingUIContainer.appendChild(colorsSection);

  // Add preview section
  const previewSection = document.createElement("div");
  previewSection.style.marginBottom = "10px";
  previewSection.style.borderTop = "1px solid #ddd";
  previewSection.style.paddingTop = "10px";

  const previewLabel = document.createElement("div");
  previewLabel.textContent = "Preview";
  previewLabel.style.fontWeight = "bold";
  previewLabel.style.marginBottom = "5px";
  previewSection.appendChild(previewLabel);

  // Create sample text preview
  const previewText = document.createElement("div");
  previewText.id = "color-preview-text";
  previewText.textContent = "This is how your highlighted text will appear.";
  previewText.style.padding = "8px";
  previewText.style.borderRadius = "4px";
  previewText.style.border = "1px dashed #ccc";
  previewText.style.fontSize = "13px";
  previewText.style.lineHeight = "1.4";
  previewText.style.transition = "all 0.2s";
  previewSection.appendChild(previewText);

  floatingUIContainer.appendChild(previewSection);

  // Store all content elements for easy collapse/expand
  contentElements = [colorsSection, previewSection];

  // Add to document
  document.body.appendChild(floatingUIContainer);

  // Initialize color swatches
  updateColorSwatches();
}

// Single set of colors for both background and text (same order)
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

// Function to update color swatches
function updateColorSwatches() {
  if (!floatingUIContainer || isUpdatingUI) return;

  isUpdatingUI = true;

  const bgColorSwatches = document.getElementById("bg-color-swatches");
  const textColorSwatches = document.getElementById("text-color-swatches");

  // Ensure the elements exist before proceeding
  if (!bgColorSwatches || !textColorSwatches) {
    console.error("[FloatingUI] Color swatch elements not found");
    isUpdatingUI = false;
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

  // Update the state to highlight active swatches
  updateSwatchSelections();

  isUpdatingUI = false;
}

// Update preview text with current colors
function updatePreviewText(backgroundColor, textColor) {
  const previewText = document.getElementById("color-preview-text");
  if (!previewText) return;

  // Apply the selected background color or default to none
  if (backgroundColor && backgroundColor !== "none") {
    previewText.style.backgroundColor = backgroundColor;
  } else {
    previewText.style.backgroundColor = "transparent";
  }

  // Apply the selected text color or default to black
  if (textColor && textColor !== "none") {
    previewText.style.color = textColor;
  } else {
    previewText.style.color = "#000000";
  }
}

// Separate function to update swatch selections without recreating them
function updateSwatchSelections() {
  if (!floatingUIContainer) return;

  // Get current formatting
  browserAPI.runtime
    .sendMessage({ action: "getTabFormatting" })
    .then((response) => {
      if (response && response.formatting) {
        const { backgroundColor, textColor } = response.formatting;

        // Get swatch elements
        const bgSwatches = floatingUIContainer.querySelectorAll(
          '[data-type="background"]'
        );
        const textSwatches =
          floatingUIContainer.querySelectorAll('[data-type="text"]');

        // Update background color swatch selection
        bgSwatches.forEach((swatch) => {
          const swatchColor = swatch.getAttribute("data-color");
          // Select if colors match or both are null/none
          if (
            (backgroundColor === null && swatchColor === "none") ||
            swatchColor === backgroundColor
          ) {
            swatch.style.boxShadow = "0 0 0 2px #4CAF50";
          } else {
            swatch.style.boxShadow = "none";
          }
        });

        // Update text color swatch selection
        textSwatches.forEach((swatch) => {
          const swatchColor = swatch.getAttribute("data-color");
          // Select if colors match or both are null/none
          if (
            (textColor === null && swatchColor === "none") ||
            swatchColor === textColor
          ) {
            swatch.style.boxShadow = "0 0 0 2px #4CAF50";
          } else {
            swatch.style.boxShadow = "none";
          }
        });

        // Update the preview text with selected colors
        const bgColor = backgroundColor === null ? null : backgroundColor;
        const txtColor = textColor === null ? null : textColor;
        updatePreviewText(bgColor, txtColor);
      }
    })
    .catch((err) => {
      console.error("[FloatingUI] Error updating swatch selections:", err);
    })
    .finally(() => {
      isUpdatingUI = false;
    });
}

// Update the floating UI to reflect current settings
function updateFloatingUIState() {
  if (!floatingUIContainer || isUpdatingUI) return;

  isUpdatingUI = true;
  console.log("[FloatingUI] Updating floating UI state");

  // Update toggle switch based on current enabled state
  browserAPI.runtime
    .sendMessage({ action: "getTabEnabled" })
    .then((response) => {
      const isEnabled = response && response.enabled === true;
      const toggleSwitch = floatingUIContainer.querySelector(
        ".floating-toggle-button"
      );

      if (toggleSwitch) {
        updateToggleSwitch(isEnabled);
      }

      // Update swatch selections without recreating them
      updateSwatchSelections();
    })
    .catch((err) => {
      console.error("[FloatingUI] Error updating UI state:", err);
    })
    .finally(() => {
      isUpdatingUI = false;
    });
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

  swatch.addEventListener("click", () => {
    if (isUpdatingUI) return; // Prevent clicks during updates

    // Mark as updating to prevent recursive updates
    isUpdatingUI = true;

    try {
      // Mark the swatch as selected immediately for visual feedback
      const allSwatches = floatingUIContainer.querySelectorAll(
        `[data-type="${type}"]`
      );
      allSwatches.forEach((s) => (s.style.boxShadow = "none"));
      swatch.style.boxShadow = "0 0 0 2px #4CAF50";

      // Get current settings to update preview immediately
      browserAPI.runtime
        .sendMessage({ action: "getTabFormatting" })
        .then((response) => {
          const currentFormatting =
            response && response.formatting ? response.formatting : {};

          // Prepare new colors based on current and this selection
          let bgColor = currentFormatting.backgroundColor;
          let txtColor = currentFormatting.textColor;

          // Update the color that was just changed
          if (type === "background") {
            bgColor = color === "none" ? null : color;
          } else if (type === "text") {
            txtColor = color === "none" ? null : color;
          }

          // Update preview immediately for responsive UI
          updatePreviewText(bgColor, txtColor);
        })
        .catch((err) => {
          console.error(
            "[FloatingUI] Error updating preview after selection:",
            err
          );
        })
        .finally(() => {
          isUpdatingUI = false;
        });

      // Immediately apply the color change
      const options = {};
      if (type === "background") {
        options.backgroundColor = color === "none" ? null : color;
      } else if (type === "text") {
        options.textColor = color === "none" ? null : color;
      }

      console.log("[FloatingUI] Sending color change:", options);

      // Send the message to update formatting
      browserAPI.runtime
        .sendMessage({
          action: "setTabFormatting",
          formatting: options,
        })
        .then(() => {
          // Explicitly notify that tab formatting has been updated
          // This helps ensure the options panel gets updated if open
          browserAPI.runtime.sendMessage({
            action: "tabFormattingChanged",
            formatting: options,
          });
        })
        .catch((err) => {
          console.error("[FloatingUI] Error applying color change:", err);
        });
    } catch (error) {
      console.error("[FloatingUI] Error in swatch click handler:", error);
      isUpdatingUI = false;
    }
  });

  return swatch;
}

// Update floating UI toggle switch based on current tab enabled state
function updateToggleSwitch(isEnabled) {
  if (!floatingUIContainer) return;

  const toggleSwitch = floatingUIContainer.querySelector(
    ".floating-toggle-button"
  );
  if (!toggleSwitch) return;

  const toggleHandle = toggleSwitch.querySelector("div");

  if (isEnabled) {
    toggleSwitch.classList.add("active");
    toggleSwitch.style.backgroundColor = "#4CAF50";
    toggleHandle.style.left = "18px"; // Adjusted for smaller toggle
  } else {
    toggleSwitch.classList.remove("active");
    toggleSwitch.style.backgroundColor = "#ccc";
    toggleHandle.style.left = "2px";
  }

  console.log("[FloatingUI] Toggle switch updated:", isEnabled);
}

// Drag functionality
function startDrag(e) {
  if (e.target.tagName === "BUTTON") return; // Don't drag if clicking on buttons

  // If minimized, only allow dragging but don't expand
  // We'll track that we're dragging but won't modify the minimized state

  isDragging = true;
  dragStartX = e.clientX;
  dragStartY = e.clientY;

  const rect = floatingUIContainer.getBoundingClientRect();
  initialPositionX = rect.left;
  initialPositionY = rect.top;

  // Add event listeners for dragging
  document.addEventListener("mousemove", dragMove);
  document.addEventListener("mouseup", endDrag);

  // Prevent text selection during drag
  e.preventDefault();
}

function dragMove(e) {
  if (!isDragging) return;

  const deltaX = e.clientX - dragStartX;
  const deltaY = e.clientY - dragStartY;

  // Update position
  floatingUIContainer.style.left = `${initialPositionX + deltaX}px`;
  floatingUIContainer.style.top = `${initialPositionY + deltaY}px`;
  // Remove right positioning when manually positioned
  floatingUIContainer.style.right = "auto";
}

function endDrag() {
  isDragging = false;
  document.removeEventListener("mousemove", dragMove);
  document.removeEventListener("mouseup", endDrag);
}

// Minimize the floating UI to just show the header
function minimizeFloatingUI() {
  if (!floatingUIContainer || isMinimized) return;

  isMinimized = true;

  // Hide all content elements
  for (const element of contentElements) {
    element.style.display = "none";
  }

  // Update header style
  const header = floatingUIContainer.querySelector("#floating-ui-header");
  if (header) {
    header.style.marginBottom = "0";
    header.style.paddingBottom = "0";
    header.style.borderBottom = "none";
  }

  // Update minimize button to show expand symbol
  const minimizeBtn = header.querySelector("button[title='Minimize']");
  if (minimizeBtn) {
    minimizeBtn.textContent = "+";
    minimizeBtn.title = "Expand";
  }

  // Make the header more compact
  floatingUIContainer.style.paddingBottom = "6px";

  // Remove width changes to maintain consistent width
}

// Expand the minimized floating UI
function expandFloatingUI() {
  if (!floatingUIContainer || !isMinimized) return;

  isMinimized = false;

  // Show all content elements
  for (const element of contentElements) {
    element.style.display = "block";
  }

  // Restore header style
  const header = floatingUIContainer.querySelector("#floating-ui-header");
  if (header) {
    header.style.marginBottom = "10px";
    header.style.paddingBottom = "8px";
    header.style.borderBottom = "1px solid #eee";
  }

  // Update minimize button back to minimize symbol
  const minimizeBtn = header.querySelector("button[title='Expand']");
  if (minimizeBtn) {
    minimizeBtn.textContent = "−";
    minimizeBtn.title = "Minimize";
  }

  // Restore original padding but keep width consistent
  floatingUIContainer.style.paddingBottom = "10px";
}

// Show the floating UI
function showFloatingUI(settings) {
  initFloatingUI(); // Ensure it's initialized
  isFloatingUIVisible = true;
  floatingUIContainer.style.display = "block";

  // If it was minimized before hiding, expand it
  if (isMinimized) {
    expandFloatingUI();
  }

  // Apply settings if provided
  if (settings) {
    console.log("[FloatingUI] Applying settings from options:", settings);

    // Apply enabled state if provided
    if (settings.enabled !== undefined) {
      isUpdatingUI = true;
      try {
        updateToggleSwitch(settings.enabled);

        // Also update the background state to match
        browserAPI.runtime
          .sendMessage({
            action: "setTabEnabled",
            enabled: settings.enabled,
          })
          .catch((error) => {
            console.error("[FloatingUI] Error syncing enabled state:", error);
          });
      } finally {
        isUpdatingUI = false;
      }
    }

    // Apply formatting if provided
    if (settings.formatting) {
      isUpdatingUI = true;
      try {
        // Update the background state first
        browserAPI.runtime
          .sendMessage({
            action: "setTabFormatting",
            formatting: settings.formatting,
          })
          .then(() => {
            // Now update the UI to reflect these changes
            updateSwatchSelections();
          })
          .catch((error) => {
            console.error("[FloatingUI] Error applying formatting:", error);
          })
          .finally(() => {
            isUpdatingUI = false;
          });
      } catch (error) {
        console.error(
          "[FloatingUI] Error applying formatting settings:",
          error
        );
        isUpdatingUI = false;
      }
    } else {
      // No formatting provided, just update UI with current state
      updateFloatingUIState();
    }
  } else {
    // No settings provided, just update with current state
    updateFloatingUIState();
  }

  // Notify options page that floating UI is now visible
  notifyFloatingUIVisibilityChange(true);
}

// Hide the floating UI
function hideFloatingUI() {
  if (floatingUIContainer) {
    isFloatingUIVisible = false;
    floatingUIContainer.style.display = "none";

    // Notify options page that floating UI is now hidden
    notifyFloatingUIVisibilityChange(false);
  }
}

// Notify the options page about visibility changes
function notifyFloatingUIVisibilityChange(visible) {
  browserAPI.runtime.sendMessage({
    action: "updateFloatingUIVisibility",
    visible: visible,
  });
}

// Toggle the floating UI visibility
function toggleFloatingUI() {
  if (isFloatingUIVisible) {
    hideFloatingUI();
  } else {
    showFloatingUI();
  }
}

// Listen for messages from the background script
browserAPI.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("[FloatingUI] Received message:", message);

  if (message.action === "showFloatingUI") {
    console.log("[FloatingUI] Showing floating UI");

    // Extract settings if provided
    const settings = {
      formatting: message.formatting,
      enabled: message.enabled,
    };

    showFloatingUI(settings);
    sendResponse({ success: true });
    return true;
  } else if (message.action === "hideFloatingUI") {
    console.log("[FloatingUI] Hiding floating UI");
    hideFloatingUI();
    sendResponse({ success: true });
    return true;
  } else if (message.action === "minimizeFloatingUI") {
    console.log("[FloatingUI] Minimizing floating UI");
    minimizeFloatingUI();
    sendResponse({ success: true });
    return true;
  } else if (message.action === "expandFloatingUI") {
    console.log("[FloatingUI] Expanding floating UI");
    expandFloatingUI();
    sendResponse({ success: true });
    return true;
  } else if (message.action === "isFloatingUIVisible") {
    // Return the current visibility state
    console.log("[FloatingUI] Reporting visibility:", isFloatingUIVisible);
    sendResponse({ visible: isFloatingUIVisible });
    return true;
  } else if (message.action === "updateTabEnabled") {
    // Update UI state when tab enabled state changes
    if (!isUpdatingUI && floatingUIContainer) {
      console.log("[FloatingUI] Updating enabled state in UI");
      isUpdatingUI = true;

      // Update the toggle switch based on the new state
      browserAPI.runtime
        .sendMessage({ action: "getTabEnabled" })
        .then((response) => {
          const isEnabled = response && response.enabled === true;
          updateToggleSwitch(isEnabled);
        })
        .catch((err) => {
          console.error("[FloatingUI] Error updating enabled state:", err);
        })
        .finally(() => {
          isUpdatingUI = false;
        });
    }
  } else if (message.action === "updateTabFormatting") {
    // Update UI state when tab formatting changes
    if (!isUpdatingUI) {
      console.log("[FloatingUI] Updating formatting in UI");
      updateSwatchSelections(); // Only update selections, not recreate swatches
    }
  } else if (
    message.action === "applyFormatting" ||
    message.action === "updateFloatingUIFormatting"
  ) {
    // Direct request to apply formatting changes (from options UI)
    if (!isUpdatingUI && floatingUIContainer && message.formatting) {
      console.log(
        "[FloatingUI] Applying direct formatting update:",
        message.formatting
      );
      isUpdatingUI = true;

      try {
        // First update background script's state
        browserAPI.runtime
          .sendMessage({
            action: "setTabFormatting",
            formatting: message.formatting,
          })
          .then(() => {
            // Then update our UI
            updateSwatchSelections();
          })
          .catch((error) => {
            console.error(
              "[FloatingUI] Error updating background state:",
              error
            );
          })
          .finally(() => {
            isUpdatingUI = false;
          });
      } catch (error) {
        console.error(
          "[FloatingUI] Error processing formatting update:",
          error
        );
        isUpdatingUI = false;
      }
    }

    sendResponse({ success: true });
    return true;
  }
  return false;
});

// Export functions for use in other scripts
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    showFloatingUI,
    hideFloatingUI,
    toggleFloatingUI,
    minimizeFloatingUI,
    expandFloatingUI,
    updateFloatingUIState,
  };
}

// Self-initialize when the document is loaded
document.addEventListener("DOMContentLoaded", () => {
  console.log("[FloatingUI] Document loaded, initializing floating UI");
  // Initialize the floating UI but keep it hidden until needed
  setTimeout(() => {
    initFloatingUI();
  }, 100);
});

// Also try to initialize if the page is already loaded, but don't duplicate
if (
  document.readyState === "complete" ||
  document.readyState === "interactive"
) {
  console.log(
    "[FloatingUI] Page already loaded, initializing floating UI immediately"
  );
  setTimeout(() => {
    initFloatingUI();
  }, 100);
}
