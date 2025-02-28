// common.js - Shared constants for Sentence Follower extension

/**
 * Browser API abstraction that works across Chrome and Firefox.
 * This is loaded first and shared with all other content scripts.
 */
const browserAPI =
  typeof window !== "undefined" && window.browser
    ? window.browser
    : typeof chrome !== "undefined"
    ? chrome
    : {
        storage: {
          local: { get: async () => ({}), set: async () => {} },
          onChanged: { addListener: () => {} },
        },
        runtime: {
          sendMessage: async () => {},
          onMessage: { addListener: () => {} },
        },
        // Add tabs API to prevent errors in floating-ui.js
        tabs: {
          query: async () => [],
          // Add other commonly used methods with safe defaults
          sendMessage: async () => {},
          create: async () => ({}),
          update: async () => {},
        },
      };

// Create a dummy log function if logging.js hasn't loaded yet
if (typeof window.log === "undefined") {
  window.log = {
    info: (module, ...args) => console.log(`[${module}]`, ...args),
    warn: (module, ...args) => console.warn(`[${module}]`, ...args),
    error: (module, ...args) => console.error(`[${module}]`, ...args),
    debug: (module, ...args) => console.log(`[DEBUG:${module}]`, ...args),
  };
}

// Now we can safely use log
window.log.info(
  "Common",
  "browserAPI initialized and available for other scripts"
);

// Export for module environments
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    browserAPI,
  };
}
