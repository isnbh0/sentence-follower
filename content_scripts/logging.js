/**
 * Centralized logging utility for Sentence Follower extension
 * Debug logging is automatically enabled in development and disabled in production
 * based on the build environment
 */

// This will be replaced at build time by webpack's DefinePlugin
// In development: IS_DEBUG = true
// In production: IS_DEBUG = false
// Add a fallback for direct Chrome testing where process is not defined
const IS_DEBUG =
  typeof process !== "undefined" &&
  process.env &&
  process.env.IS_DEBUG !== undefined
    ? process.env.IS_DEBUG
    : true; // Default to true when testing directly in browser

/**
 * Log utility with various levels
 * Only outputs logs when IS_DEBUG is true
 */
const log = {
  // Standard informational logs
  info: (module, ...args) => {
    if (IS_DEBUG) {
      console.log(`[${module}]`, ...args);
    }
  },

  // Warning level logs
  warn: (module, ...args) => {
    if (IS_DEBUG) {
      console.warn(`[${module}]`, ...args);
    }
  },

  // Error level logs
  error: (module, ...args) => {
    if (IS_DEBUG) {
      console.error(`[${module}]`, ...args);
    }
  },

  // Debug level logs (most verbose)
  debug: (module, ...args) => {
    if (IS_DEBUG) {
      console.log(`[DEBUG:${module}]`, ...args);
    }
  },
};

// Make log available to other scripts
if (typeof window !== "undefined") {
  window.log = log;
}

// Export for ES modules
if (typeof exports !== "undefined") {
  exports.log = log;
  exports.IS_DEBUG = IS_DEBUG;
}
