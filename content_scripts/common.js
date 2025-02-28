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
      };

// Import log utility if not already available
if (typeof log === "undefined") {
  // This will be defined after logging.js is loaded
  // Fallback for when logging.js hasn't loaded yet
  window.log = {
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
  };
}

log.info("Common", "browserAPI initialized and available for other scripts");

// Export for module environments
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    browserAPI,
  };
}
