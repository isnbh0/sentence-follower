const browserAPI = typeof browser !== "undefined" ? browser : chrome;

const DEFAULT_OPTIONS = {
  enabled: false, // Ensure this matches the default state
  backgroundColor: "#ffff00",
  useDefaultBackground: false,
  textColor: "#000000",
  useDefaultText: false,
};

browserAPI.runtime.onInstalled.addListener(() => {
  browserAPI.storage.local
    .get(DEFAULT_OPTIONS)
    .then((options) => {
      // Check if any default option is missing
      const shouldSetDefaults = Object.keys(DEFAULT_OPTIONS).some(
        (key) => !(key in options),
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

// Listen for messages from the options page
browserAPI.runtime.onMessage.addListener((message, sender) => {
  if (message.action === "reloadOptions") {
    // Query all tabs where the content script might be active
    browserAPI.tabs
      .query({})
      .then((tabs) => {
        for (let tab of tabs) {
          // Send the message to each tab
          browserAPI.tabs
            .sendMessage(tab.id, { action: "reloadOptions" })
            .catch((error) => {
              // Handle cases where the tab doesn't have the content script
              console.error(`Failed to send message to tab ${tab.id}:`, error);
            });
        }
      })
      .catch((error) => {
        console.error("Error querying tabs:", error);
      });
  }
});
