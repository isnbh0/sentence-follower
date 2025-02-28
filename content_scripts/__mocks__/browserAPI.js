const DEFAULT_OPTIONS = {
  backgroundColor: "#ffff00",
  useDefaultBackground: false,
  textColor: "#000000",
  useDefaultText: true,
};

// Mock implementation of enabledTabs map from background.js
const enabledTabsMap = new Map();

// Mock the sendResponse function for message handling
const sendResponse = jest.fn();

const browserAPI = {
  storage: {
    local: {
      get: jest.fn().mockResolvedValue(DEFAULT_OPTIONS),
      set: jest.fn().mockResolvedValue({}),
    },
    onChanged: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
    },
  },
  runtime: {
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
    },
    // Mock sendMessage to simulate tab-specific functionality
    sendMessage: jest.fn().mockImplementation((message) => {
      // Return different responses based on the message action
      if (message && message.action === "getTabEnabled") {
        // Default tab ID for testing
        const tabId = 123;
        return Promise.resolve({ enabled: enabledTabsMap.get(tabId) || false });
      } else if (message && message.action === "setTabEnabled") {
        // Default tab ID for testing
        const tabId = 123;
        enabledTabsMap.set(tabId, message.enabled);
        return Promise.resolve({ success: true });
      }
      return Promise.resolve({});
    }),
  },
  tabs: {
    query: jest.fn().mockResolvedValue([{ id: 123, url: "https://example.com" }]),
    sendMessage: jest.fn().mockResolvedValue({}),
    onRemoved: {
      addListener: jest.fn(),
    },
  },
  
  // Helper methods for testing
  _resetMocks() {
    enabledTabsMap.clear();
    this.storage.local.get.mockClear();
    this.storage.local.set.mockClear();
    this.runtime.sendMessage.mockClear();
    this.tabs.query.mockClear();
    this.tabs.sendMessage.mockClear();
    sendResponse.mockClear();
  },
  
  // Test helper to simulate tab state
  _setTabEnabled(tabId, isEnabled) {
    enabledTabsMap.set(tabId || 123, isEnabled);
  },
  
  // Test helper to get tab state
  _getTabEnabled(tabId) {
    return enabledTabsMap.get(tabId || 123) || false;
  }
};

module.exports = browserAPI;
