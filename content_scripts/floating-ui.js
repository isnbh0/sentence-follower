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

  // Always set the initial position to the default values
  // This ensures a consistent starting position when first created
  floatingUIContainer.style.top = DEFAULT_POSITION.top;
  floatingUIContainer.style.right = DEFAULT_POSITION.right;
  floatingUIContainer.style.left = "auto"; // Default to auto

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

  // Check if the floating UI should be visible based on persisted state
  restoreFloatingUIState();
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
  const newLeft = `${initialPositionX + deltaX}px`;
  const newTop = `${initialPositionY + deltaY}px`;

  floatingUIContainer.style.left = newLeft;
  floatingUIContainer.style.top = newTop;
  // Remove right positioning when manually positioned
  floatingUIContainer.style.right = "auto";

  // Periodically log position during drag (not on every move to avoid console spam)
  if (Math.random() < 0.05) {
    // Only log occasionally during drag
    console.log("[FloatingUI:Position] During drag, position updated to:", {
      left: newLeft,
      top: newTop,
      right: "auto",
    });
  }
}

function endDrag() {
  if (isDragging) {
    // Get final position after drag
    const rect = floatingUIContainer.getBoundingClientRect();
    console.log("[FloatingUI:Position] Drag ended, final position:", {
      top: rect.top,
      left: rect.left,
      right: rect.right,
      bottom: rect.bottom,
      styleTop: floatingUIContainer.style.top,
      styleLeft: floatingUIContainer.style.left,
      styleRight: floatingUIContainer.style.right,
    });

    // Save position when drag ends
    saveCurrentPosition();
  }

  isDragging = false;
  document.removeEventListener("mousemove", dragMove);
  document.removeEventListener("mouseup", endDrag);
}

// Minimize the floating UI to just show the header
function minimizeFloatingUI() {
  if (!floatingUIContainer || isMinimized) return;

  // Use the function that doesn't persist state
  minimizeFloatingUIWithoutPersisting();

  // Persist the floating UI state
  persistFloatingUIState();
}

// Expand the floating UI
function expandFloatingUI() {
  if (!floatingUIContainer || !isMinimized) return;

  // Use the function that doesn't persist state
  expandFloatingUIWithoutPersisting();

  // Persist the floating UI state
  persistFloatingUIState();
}

// Show the floating UI
function showFloatingUI(settings) {
  console.log("[FloatingUI:Position] showFloatingUI called, initializing UI");
  initFloatingUI(); // Ensure it's initialized
  isFloatingUIVisible = true;
  floatingUIContainer.style.display = "block";

  // First check if we have a saved position, then apply it
  browserAPI.runtime
    .sendMessage({ action: "getFloatingUIState" })
    .then((response) => {
      console.log(
        "[FloatingUI:Position] Retrieved state from storage:",
        response
      );

      if (
        response &&
        response.position &&
        response.position.top &&
        response.position.top !== "0px" &&
        (response.position.right !== "0px" || response.position.left !== "0px")
      ) {
        console.log(
          "[FloatingUI:Position] Restoring saved position:",
          response.position
        );
        applyPosition(response.position);
      } else {
        // Fallback: check if the UI is in the corner and reset if needed
        const rect = floatingUIContainer.getBoundingClientRect();
        console.log("[FloatingUI:Position] Current UI position rect:", {
          top: rect.top,
          left: rect.left,
          bottom: rect.bottom,
          right: rect.right,
        });

        if (rect.top < 10 && rect.left < 10) {
          console.log(
            "[FloatingUI:Position] UI is in corner, resetting to default position"
          );
          applyPosition({
            top: DEFAULT_POSITION.top,
            right: DEFAULT_POSITION.right,
            left: "auto",
          });
        } else {
          console.log(
            "[FloatingUI:Position] UI position seems valid, keeping current position"
          );
        }
      }

      // Continue with the rest of the function
      continueShowingUI(settings);
    })
    .catch((error) => {
      console.error(
        "[FloatingUI:Position] Error getting stored position:",
        error
      );

      // Fallback to simple corner check
      const rect = floatingUIContainer.getBoundingClientRect();
      console.log(
        "[FloatingUI:Position] Current UI position (fallback check):",
        {
          top: rect.top,
          left: rect.left,
          bottom: rect.bottom,
          right: rect.right,
        }
      );

      if (rect.top < 10 && rect.left < 10) {
        console.log(
          "[FloatingUI:Position] UI is in corner (fallback), resetting to default"
        );
        applyPosition({
          top: DEFAULT_POSITION.top,
          right: DEFAULT_POSITION.right,
          left: "auto",
        });
      } else {
        console.log(
          "[FloatingUI:Position] UI position seems valid in fallback, keeping current"
        );
      }

      // Continue with the rest of the function
      continueShowingUI(settings);
    });
}

// Continue showing UI after position is determined
function continueShowingUI(settings) {
  // Don't automatically expand the UI if it was minimized
  // This allows showFloatingUIPreserveState to maintain the minimized state
  // This section is intentionally commented out:
  // if (isMinimized) {
  //   expandFloatingUI();
  // }

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

  // Persist the floating UI state
  persistFloatingUIState();

  // Notify options page that floating UI is now visible
  notifyFloatingUIVisibilityChange(true);
}

// Hide the floating UI
function hideFloatingUI() {
  if (floatingUIContainer) {
    isFloatingUIVisible = false;
    floatingUIContainer.style.display = "none";

    // Persist visibility state while keeping existing position
    persistFloatingUIState();

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

// Show the floating UI while preserving its current minimized state
function showFloatingUIPreserveState(settings) {
  console.log("[FloatingUI:Position] showFloatingUIPreserveState called");

  // First check if we have a saved state with minimization information
  browserAPI.runtime
    .sendMessage({ action: "getCurrentTabFloatingUIState" })
    .then((response) => {
      console.log(
        "[FloatingUI:Position] Retrieved state for preserve state call:",
        response
      );

      // Show the UI with the minimized state preserved (modified continueShowingUI will not expand)
      showFloatingUI(settings);

      // If we have a saved state with isMinimized=true, ensure the UI is minimized
      if (response && response.isMinimized === true && !isMinimized) {
        console.log("[FloatingUI:Position] Re-applying minimized state");
        setTimeout(() => {
          minimizeFloatingUI();
        }, 50); // Small delay to ensure UI is visible first
      }
    })
    .catch((error) => {
      console.error(
        "[FloatingUI:Position] Error getting state for preserve call:",
        error
      );
      // Fallback to regular show
      showFloatingUI(settings);
    });
}

// Listen for messages from the background script
browserAPI.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("[FloatingUI] Received message:", message);

  if (message.action === "showFloatingUIPreserveState") {
    console.log("[FloatingUI] Showing floating UI with preserved state");

    // Extract settings if provided
    const settings = {
      formatting: message.formatting,
      enabled: message.enabled,
    };

    // Show UI with preserved state
    showFloatingUIPreserveState(settings);
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

// Function to restore the floating UI state from background storage
function restoreFloatingUIState() {
  console.log(
    "[FloatingUI:Position] Restoring floating UI state from background storage"
  );

  // Instead of directly accessing browserAPI.tabs, we'll send a message to the background script
  // to get the current tab's state. This works even when tabs API isn't directly available
  browserAPI.runtime
    .sendMessage({
      action: "getCurrentTabFloatingUIState",
    })
    .then((response) => {
      console.log(
        "[FloatingUI:Position] Got saved floating UI state from background:",
        response
      );

      if (response) {
        // Apply saved position if available and valid
        if (
          response.position &&
          response.position.top &&
          response.position.top !== "0px" &&
          (response.position.right !== "0px" ||
            response.position.left !== "0px")
        ) {
          console.log(
            "[FloatingUI:Position] Applying saved position:",
            response.position
          );
          applyPosition(response.position);
        } else {
          // Apply default position if saved position is invalid
          console.log(
            "[FloatingUI:Position] No valid position found, using default"
          );
          console.log(
            "[FloatingUI:Position] Saved position was:",
            response.position
          );
          applyPosition({
            top: DEFAULT_POSITION.top,
            right: DEFAULT_POSITION.right,
            left: "auto",
          });
        }

        // Apply saved visibility state
        if (response.isVisible === true) {
          console.log("[FloatingUI:Position] Restoring visible state");
          // We need to show the UI without updating the persisted state
          // to prevent an infinite loop
          showFloatingUIWithoutPersisting();

          // Also apply minimized state if needed
          if (response.isMinimized === true) {
            console.log("[FloatingUI:Position] Restoring minimized state");
            minimizeFloatingUIWithoutPersisting();
          }
        } else {
          // Make sure the UI stays hidden but keeps its position
          console.log(
            "[FloatingUI:Position] Keeping UI hidden per saved state"
          );
          isFloatingUIVisible = false;
          floatingUIContainer.style.display = "none";
        }
      } else {
        // No state found, keep UI hidden by default
        console.log(
          "[FloatingUI:Position] No saved state found, keeping UI hidden"
        );
        isFloatingUIVisible = false;
        floatingUIContainer.style.display = "none";
      }
    })
    .catch((error) => {
      console.error(
        "[FloatingUI:Position] Error getting floating UI state:",
        error
      );
      // Apply defaults in case of error
      applyPosition({
        top: DEFAULT_POSITION.top,
        right: DEFAULT_POSITION.right,
        left: "auto",
      });
      isFloatingUIVisible = false;
      if (floatingUIContainer) {
        floatingUIContainer.style.display = "none";
      }
    });
}

// Show the floating UI without updating persisted state
function showFloatingUIWithoutPersisting() {
  console.log("[FloatingUI:Position] showFloatingUIWithoutPersisting called");
  initFloatingUI(); // Ensure it's initialized
  isFloatingUIVisible = true;
  floatingUIContainer.style.display = "block";

  // Position is not modified here - we rely on the caller to set position correctly
  // before calling this function
  console.log(
    "[FloatingUI:Position] Current position in showFloatingUIWithoutPersisting:",
    {
      top: floatingUIContainer.style.top,
      left: floatingUIContainer.style.left,
      right: floatingUIContainer.style.right,
    }
  );

  // Apply current settings
  updateFloatingUIState();

  // Notify options page that floating UI is now visible
  notifyFloatingUIVisibilityChange(true);
}

// Minimize the floating UI without updating persisted state
function minimizeFloatingUIWithoutPersisting() {
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

// Expand the floating UI without updating persisted state
function expandFloatingUIWithoutPersisting() {
  if (!floatingUIContainer || !isMinimized) return;

  isMinimized = false;

  // Show all content elements
  for (const element of contentElements) {
    element.style.display = "block";
  }

  // Update header style back to normal
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

  // Restore normal padding
  floatingUIContainer.style.paddingBottom = "10px";
}

// Persist the current floating UI state
function persistFloatingUIState() {
  // Get current position if the UI is visible and available
  let position = null;
  if (floatingUIContainer) {
    if (isFloatingUIVisible) {
      // If visible, get current position from element
      const rect = floatingUIContainer.getBoundingClientRect();
      position = {
        top: `${rect.top}px`,
        left: `${rect.left}px`,
        right: floatingUIContainer.style.right,
      };
      console.log(
        "[FloatingUI:Position] Saving current position while visible:",
        position
      );
    } else {
      // If hiding, we need to preserve the existing position
      // Send a message to get the current state first
      browserAPI.runtime
        .sendMessage({
          action: "getCurrentTabFloatingUIState",
        })
        .then((response) => {
          // If we already have a stored position, use that
          if (response && response.position) {
            console.log(
              "[FloatingUI:Position] Preserving existing position when hiding UI:",
              response.position
            );

            // Now send complete update with existing position
            browserAPI.runtime
              .sendMessage({
                action: "setCurrentTabFloatingUIState",
                state: {
                  isVisible: isFloatingUIVisible,
                  isMinimized: isMinimized,
                  position: response.position,
                },
              })
              .then(() => {
                console.log(
                  "[FloatingUI:Position] Successfully preserved position while hiding"
                );
              })
              .catch((error) => {
                console.error(
                  "[FloatingUI:Position] Error preserving position when hiding:",
                  error
                );
              });
          } else {
            // No position stored yet, just update without position
            console.log(
              "[FloatingUI:Position] No previous position found when hiding"
            );
            browserAPI.runtime
              .sendMessage({
                action: "setCurrentTabFloatingUIState",
                state: {
                  isVisible: isFloatingUIVisible,
                  isMinimized: isMinimized,
                },
              })
              .then(() => {
                console.log(
                  "[FloatingUI:Position] Saved state without position while hiding"
                );
              })
              .catch((error) => {
                console.error(
                  "[FloatingUI:Position] Error updating state without position:",
                  error
                );
              });
          }
        })
        .catch((error) => {
          console.error(
            "[FloatingUI:Position] Error getting existing position:",
            error
          );
        });

      // Return early since we're handling the API call in the promise chain
      return;
    }
  }

  console.log("[FloatingUI:Position] Persisting floating UI state:", {
    isVisible: isFloatingUIVisible,
    isMinimized: isMinimized,
    position: position,
  });

  // Use message passing to update the state via the background script
  browserAPI.runtime
    .sendMessage({
      action: "setCurrentTabFloatingUIState",
      state: {
        isVisible: isFloatingUIVisible,
        isMinimized: isMinimized,
        position: position,
      },
    })
    .then(() => {
      console.log(
        "[FloatingUI:Position] Successfully saved state with position:",
        position
      );
    })
    .catch((error) => {
      console.error(
        "[FloatingUI:Position] Error persisting floating UI state:",
        error
      );
    });
}

// Apply position to the floating UI
function applyPosition(position) {
  if (!floatingUIContainer || !position) {
    console.log(
      "[FloatingUI:Position] Cannot apply position - container or position missing",
      {
        containerExists: !!floatingUIContainer,
        positionProvided: !!position,
      }
    );
    return;
  }

  console.log(
    "[FloatingUI:Position] Before applying position, current styles:",
    {
      top: floatingUIContainer.style.top,
      right: floatingUIContainer.style.right,
      left: floatingUIContainer.style.left,
    }
  );

  console.log("[FloatingUI:Position] Applying position:", position);

  // Apply each position property if available
  if (position.top !== undefined) {
    floatingUIContainer.style.top = position.top;
  }

  if (position.right !== undefined) {
    floatingUIContainer.style.right = position.right;
  }

  if (position.left !== undefined) {
    floatingUIContainer.style.left = position.left;
  }

  console.log(
    "[FloatingUI:Position] After applying position, updated styles:",
    {
      top: floatingUIContainer.style.top,
      right: floatingUIContainer.style.right,
      left: floatingUIContainer.style.left,
    }
  );

  // Verify with getBoundingClientRect for absolute screen position
  const rect = floatingUIContainer.getBoundingClientRect();
  console.log(
    "[FloatingUI:Position] Actual screen position after applying styles:",
    {
      top: rect.top,
      left: rect.left,
      right: rect.right,
      bottom: rect.bottom,
    }
  );
}

// Save current position to be persisted
function saveCurrentPosition() {
  if (!floatingUIContainer) {
    console.log(
      "[FloatingUI:Position] Cannot save position - container missing"
    );
    return;
  }

  const rect = floatingUIContainer.getBoundingClientRect();
  const position = {
    top: `${rect.top}px`,
    left: `${rect.left}px`,
    right: "auto", // Clear right positioning when manually positioned
  };

  console.log(
    "[FloatingUI:Position] Saving current position from drag:",
    position
  );
  console.log("[FloatingUI:Position] Current element styles:", {
    top: floatingUIContainer.style.top,
    left: floatingUIContainer.style.left,
    right: floatingUIContainer.style.right,
  });

  // Update our floating UI state with the new position
  persistFloatingUIPosition(position);
}

// Persist just the position of the floating UI
function persistFloatingUIPosition(position) {
  if (!position) {
    console.log("[FloatingUI:Position] Cannot persist null position");
    return;
  }

  console.log(
    "[FloatingUI:Position] Persisting floating UI position:",
    position
  );

  // Use message passing to update just the position via the background script
  browserAPI.runtime
    .sendMessage({
      action: "setCurrentTabFloatingUIState",
      state: {
        position: position,
      },
    })
    .then(() => {
      console.log(
        "[FloatingUI:Position] Successfully saved position to storage:",
        position
      );
    })
    .catch((error) => {
      console.error("[FloatingUI:Position] Error persisting position:", error);
    });
}

// Export functions for use in other scripts
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    showFloatingUI,
    hideFloatingUI,
    toggleFloatingUI,
    minimizeFloatingUI,
    expandFloatingUI,
    updateFloatingUIState,
    persistFloatingUIState,
    restoreFloatingUIState,
    saveCurrentPosition,
    applyPosition,
    continueShowingUI,
    showFloatingUIPreserveState,
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
