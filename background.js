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
      const state = getTabState(tabId);
      state.enabled = message.enabled === true;
      sendResponse({ success: true, enabled: state.enabled });

      // Notify the content script about the change
      browserAPI.tabs
        .sendMessage(tabId, {
          action: "updateTabEnabled",
          enabled: state.enabled,
        })
        .catch((error) => {
          console.log(
            `[DEBUG] Background: Error notifying content script about tab enabled state: ${error}`
          );
        });

      // Broadcast the change to all extension pages (including options)
      browserAPI.runtime
        .sendMessage({
          action: "updateTabEnabled",
          tabId: tabId,
          enabled: state.enabled,
        })
        .catch((error) => {
          console.log(
            `[DEBUG] Background: Error broadcasting tab enabled state: ${error}`
          );
        });
    } else {
      console.error(
        `[DEBUG] Background: Missing tabId in setTabEnabled request`
      );
      sendResponse({ success: false, error: "Missing tabId" });
    }
    return true;
  } else if (message.action === "getTabFormatting") {
    // Get formatting options for a specific tab
    const tabId = message.tabId || sender.tab?.id;
    console.log(`[DEBUG] Background: getTabFormatting for tab ${tabId}`);

    if (tabId) {
      const formatting = getTabFormatting(tabId);
      console.log(
        `[DEBUG] Background: Retrieved formatting for tab ${tabId}:`,
        formatting
      );
      sendResponse({ formatting });
    } else {
      console.error(
        `[DEBUG] Background: Missing tabId in getTabFormatting request`
      );
      sendResponse({ formatting: null });
    }
    return true;
  } else if (message.action === "setTabFormatting") {
    // Update formatting options for a specific tab
    const tabId = message.tabId || sender.tab?.id;
    console.log(
      `[DEBUG] Background: setTabFormatting for tab ${tabId}:`,
      message.formatting
    );

    if (tabId && message.formatting) {
      const state = getTabState(tabId);
      const formatting = message.formatting;

      // Update the background color if provided
      if (formatting.hasOwnProperty("backgroundColor")) {
        state.backgroundColor = formatting.backgroundColor;
      }

      // Update the text color if provided
      if (formatting.hasOwnProperty("textColor")) {
        state.textColor = formatting.textColor;
      }

      // Update useDefaultBackground if provided
      if (formatting.hasOwnProperty("useDefaultBackground")) {
        state.useDefaultBackground = formatting.useDefaultBackground === true;
      }

      // Update useDefaultText if provided
      if (formatting.hasOwnProperty("useDefaultText")) {
        state.useDefaultText = formatting.useDefaultText === true;
      }

      // Respond with the updated formatting
      const updatedFormatting = getTabFormatting(tabId);
      sendResponse({ success: true, formatting: updatedFormatting });

      // Notify the content script about the change
      browserAPI.tabs
        .sendMessage(tabId, {
          action: "updateTabFormatting",
          formatting: updatedFormatting,
        })
        .catch((error) => {
          console.log(
            `[DEBUG] Background: Error notifying content script about formatting: ${error}`
          );
        });

      // Broadcast the formatting change to all extension pages (including options)
      browserAPI.runtime
        .sendMessage({
          action: "updateTabFormatting",
          tabId: tabId,
          formatting: updatedFormatting,
        })
        .catch((error) => {
          console.log(
            `[DEBUG] Background: Error broadcasting formatting change: ${error}`
          );
        });
    } else {
      console.error(
        `[DEBUG] Background: Invalid setTabFormatting request, missing tabId or formatting`
      );
      sendResponse({
        success: false,
        error: "Missing tabId or formatting options",
      });
    }
    return true;
  } else if (
    message.action === "tabEnabledChanged" ||
    message.action === "tabFormattingChanged"
  ) {
    // Forward these messages to ensure all parts of the extension stay in sync
    console.log(`[DEBUG] Background: Forwarding message: ${message.action}`);

    // Create the appropriate action to broadcast
    const broadcastAction =
      message.action === "tabEnabledChanged"
        ? "updateTabEnabled"
        : "updateTabFormatting";

    // Broadcast to all extension parts
    browserAPI.runtime
      .sendMessage({
        action: broadcastAction,
        ...message, // Include all original properties
          })
          .catch((error) => {
        console.log(`[DEBUG] Background: Error forwarding message: ${error}`);
      });

    sendResponse({ success: true });
    return true;
  } else if (message.action === "updateFloatingUIVisibility") {
    // Forward floating UI visibility changes to options page
    console.log(
      `[DEBUG] Background: Forwarding UI visibility change: ${message.visible}`
    );

    browserAPI.runtime.sendMessage(message).catch((error) => {
      console.log(`[DEBUG] Background: Error forwarding visibility: ${error}`);
    });

    sendResponse({ success: true });
    return true;
  }
});

// Export for testing
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    tabState,
    DEFAULT_OPTIONS,
  };
}
