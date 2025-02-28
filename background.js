const browserAPI = typeof browser !== "undefined" ? browser : chrome;

const DEFAULT_OPTIONS = {
  // Note: enabled is no longer a global setting, it's per-tab
  // Formatting options are also now per-tab
  backgroundColor: "#ffff00",
  useDefaultBackground: false,
  textColor: "#000000",
  useDefaultText: false,
};

// Store tab-specific state
const tabState = new Map();

// Helper function to get or initialize tab state
function getTabState(tabId) {
  if (!tabState.has(tabId)) {
    tabState.set(tabId, {
      enabled: false,
      backgroundColor: DEFAULT_OPTIONS.backgroundColor,
      useDefaultBackground: DEFAULT_OPTIONS.useDefaultBackground,
      textColor: DEFAULT_OPTIONS.textColor,
      useDefaultText: DEFAULT_OPTIONS.useDefaultText,
    });
  }
  return tabState.get(tabId);
}

// Respond with the enabled state for a specific tab
function isTabEnabled(tabId) {
  const state = getTabState(tabId);
  const enabled = state.enabled === true;
  console.log(
    `[DEBUG] Background: Checking tab ${tabId} enabled state: ${enabled}`
  );
  return enabled;
}

// Get formatting options for a specific tab
function getTabFormatting(tabId) {
  const state = getTabState(tabId);
  console.log(`[Tab State] Getting formatting for tab ${tabId}:`, {
    backgroundColor: state.backgroundColor,
    useDefaultBackground: state.useDefaultBackground,
    textColor: state.textColor,
    useDefaultText: state.useDefaultText,
  });
  return {
    backgroundColor: state.backgroundColor,
    useDefaultBackground: state.useDefaultBackground,
    textColor: state.textColor,
    useDefaultText: state.useDefaultText,
  };
}

// Clean up when tabs are closed to prevent memory leaks
browserAPI.tabs.onRemoved.addListener((tabId) => {
  if (tabState.has(tabId)) {
    console.log(`[Tab State] Cleaning up tab ${tabId} state on tab close`);
    tabState.delete(tabId);
  }
});

// Periodically check for any stale tabs in the map (runs every hour)
setInterval(() => {
  console.log(
    `[Tab State] Running periodic cleanup check. Current tab count: ${tabState.size}`
  );
  browserAPI.tabs
    .query({})
    .then((tabs) => {
      const activeTabs = new Set(tabs.map((tab) => tab.id));
      let cleanupCount = 0;

      tabState.forEach((value, tabId) => {
        if (!activeTabs.has(tabId)) {
          console.log(`[Tab State] Removing stale tab ${tabId} during cleanup`);
          tabState.delete(tabId);
          cleanupCount++;
        }
      });

      if (cleanupCount > 0) {
        console.log(
          `[Tab State] Cleaned up ${cleanupCount} stale tabs. Remaining: ${tabState.size}`
        );
      }
    })
    .catch((error) => {
      console.error(`[Tab State] Error during periodic cleanup:`, error);
    });
}, 60 * 60 * 1000); // Run every hour

browserAPI.runtime.onInstalled.addListener(() => {
  browserAPI.storage.local
    .get(DEFAULT_OPTIONS)
    .then((options) => {
      // Check if any default option is missing
      const shouldSetDefaults = Object.keys(DEFAULT_OPTIONS).some(
        (key) => !(key in options)
      );
      if (shouldSetDefaults) {
        browserAPI.storage.local
          .set(DEFAULT_OPTIONS)
          .then(() => {
            console.log("Default options have been set.");
          })
          .catch((error) => {
            console.error("Error setting default options:", error);
          });
      }
    })
    .catch((error) => {
      console.error("Error retrieving storage options:", error);
    });
});

// Listen for messages from the options page or content scripts
browserAPI.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log(
    `[DEBUG] Background: Received message action: ${message.action}`,
    message
  );

  if (message.action === "reloadOptions") {
    // This is now a no-op since options are per-tab and loaded on demand
    sendResponse({ success: true });
  } else if (message.action === "getTabEnabled") {
    // Get the enabled state for a specific tab
    const tabId = message.tabId || sender.tab?.id;
    console.log(`[DEBUG] Background: getTabEnabled request for tab ${tabId}`);

    if (tabId) {
      const enabled = isTabEnabled(tabId);
      console.log(
        `[DEBUG] Background: Responding with enabled=${enabled} for tab ${tabId}`
      );
      sendResponse({ enabled: enabled });
    } else {
      console.error(
        `[DEBUG] Background: Missing tabId in getTabEnabled request`
      );
      sendResponse({ enabled: false });
    }
    return true; // Keep the channel open for the async response
  } else if (message.action === "setTabEnabled") {
    // Set the enabled state for a specific tab
    const tabId = message.tabId || sender.tab?.id;
    console.log(
      `[DEBUG] Background: setTabEnabled request for tab ${tabId}, enabled=${message.enabled}`
    );

    if (tabId) {
      console.log(
        `[DEBUG] Background: Setting tab ${tabId} enabled state to: ${message.enabled}`
      );
      const state = getTabState(tabId);
      state.enabled = message.enabled;
      console.log(`[DEBUG] Background: Updated tab state:`, state);

      // Notify the tab of the change
      browserAPI.tabs
        .sendMessage(tabId, {
          action: "updateTabEnabled",
          enabled: message.enabled,
        })
        .then(() => {
          console.log(
            `[DEBUG] Background: Successfully notified tab ${tabId} of state change`
          );
        })
        .catch((error) => {
          console.error(
            `[DEBUG] Background: Failed to update tab ${tabId}:`,
            error
          );
        });

      sendResponse({ success: true });
    } else {
      console.error(
        `[DEBUG] Background: Missing tabId in setTabEnabled request`
      );
      sendResponse({ success: false, error: "Missing tab ID" });
    }
    return true; // Keep the channel open for the async response
  } else if (message.action === "getTabFormatting") {
    // New message to get formatting options for a specific tab
    const tabId = sender.tab?.id || message.tabId;
    if (tabId) {
      console.log(
        `[Tab State] Received getTabFormatting request for tab ${tabId}`
      );
      sendResponse({ formatting: getTabFormatting(tabId) });
    } else {
      console.error(`[Tab State] Missing tabId in getTabFormatting request`);
      sendResponse({ formatting: DEFAULT_OPTIONS });
    }
    return true; // Keep the channel open for the async response
  } else if (message.action === "setTabFormatting") {
    // New message to set formatting options for a specific tab
    const tabId = sender.tab?.id || message.tabId;
    if (tabId && message.formatting) {
      console.log(
        `[Tab State] Setting tab ${tabId} formatting:`,
        message.formatting
      );
      const state = getTabState(tabId);

      // Update formatting options
      if (message.formatting.backgroundColor !== undefined) {
        state.backgroundColor = message.formatting.backgroundColor;
      }
      if (message.formatting.useDefaultBackground !== undefined) {
        state.useDefaultBackground = message.formatting.useDefaultBackground;
      }
      if (message.formatting.textColor !== undefined) {
        state.textColor = message.formatting.textColor;
      }
      if (message.formatting.useDefaultText !== undefined) {
        state.useDefaultText = message.formatting.useDefaultText;
      }

      // Notify the tab of the change
      browserAPI.tabs
        .sendMessage(tabId, {
          action: "updateTabFormatting",
          formatting: getTabFormatting(tabId),
        })
        .then(() => {
          console.log(
            `[Tab State] Successfully notified tab ${tabId} of formatting change`
          );
        })
        .catch((error) => {
          console.error(
            `[Tab State] Failed to update tab ${tabId} formatting:`,
            error
          );
        });

      sendResponse({ success: true });
    } else {
      console.error(`[Tab State] Invalid setTabFormatting request:`, {
        tabId,
        formatting: message.formatting,
      });
      sendResponse({ success: false, error: "Invalid formatting request" });
    }
    return true; // Keep the channel open for the async response
  }
});

// Export for testing
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    tabState,
    DEFAULT_OPTIONS,
  };
}
