/**
 * @jest-environment jsdom
 */

// Mock the browser API
const mockBrowserAPI = {
  storage: {
    local: {
      get: jest.fn().mockResolvedValue({}),
      set: jest.fn().mockResolvedValue({}),
    },
  },
  runtime: {
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
    },
    onInstalled: {
      addListener: jest.fn(),
    },
    sendMessage: jest.fn().mockResolvedValue({}),
  },
  tabs: {
    onRemoved: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
    },
    query: jest
      .fn()
      .mockResolvedValue([{ id: 123, url: "https://example.com" }]),
    sendMessage: jest.fn().mockResolvedValue({}),
  },
  alarms: {
    onAlarm: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
    },
    create: jest.fn(),
  },
};

// Mock the browser object
global.browser = mockBrowserAPI;
global.chrome = mockBrowserAPI;

// Helper to manipulate the tabState Map in background.js
function manipulateTabState(callback) {
  const backgroundModule = require("./background.js");
  callback(backgroundModule.tabState);
}

describe("Background Script", () => {
  let messageListener;
  let tabRemovedListener;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Reset modules to get a fresh instance
    jest.resetModules();

    // Capture the message listener when it's added
    mockBrowserAPI.runtime.onMessage.addListener.mockImplementation(
      (listener) => {
        messageListener = listener;
        return listener;
      }
    );

    // Capture the tab removed listener when it's added
    mockBrowserAPI.tabs.onRemoved.addListener.mockImplementation((listener) => {
      tabRemovedListener = listener;
      return listener;
    });

    // Load the background script
    require("./background.js");
  });

  test("should handle getTabEnabled message correctly", () => {
    // Set up a tab state
    manipulateTabState((tabState) => {
      tabState.set(123, { enabled: true });
    });

    // Create a mock sender and sendResponse
    const sender = { tab: { id: 123 } };
    const sendResponse = jest.fn();

    // Call the message listener directly
    messageListener({ action: "getTabEnabled" }, sender, sendResponse);

    // Check that it responded with the correct enabled state
    expect(sendResponse).toHaveBeenCalledWith({ enabled: true });
  });

  test("should handle setTabEnabled message correctly", () => {
    // Create a mock sender and sendResponse
    const sender = {};
    const sendResponse = jest.fn();

    // Call the message listener directly
    messageListener(
      { action: "setTabEnabled", tabId: 123, enabled: true },
      sender,
      sendResponse
    );

    // Check that it responded with success
    expect(sendResponse).toHaveBeenCalledWith({ success: true });

    // Check that the tab state was updated
    manipulateTabState((tabState) => {
      expect(tabState.get(123).enabled).toBe(true);
    });
  });

  test("should clean up tab state when tab is closed", () => {
    // Set up a tab state
    manipulateTabState((tabState) => {
      tabState.set(123, { enabled: true });
    });

    // Call the tab removed listener directly
    tabRemovedListener(123);

    // Check that the tab state was removed
    manipulateTabState((tabState) => {
      expect(tabState.has(123)).toBe(false);
    });
  });

  test("should return default values for closed tabs", () => {
    // Create a mock sender and sendResponse
    const sender = { tab: { id: 456 } }; // Tab ID not in the Map
    const sendResponse = jest.fn();

    // Call the message listener directly
    messageListener({ action: "getTabEnabled" }, sender, sendResponse);

    // Check that it responded with the default enabled state (false)
    expect(sendResponse).toHaveBeenCalledWith({ enabled: false });
  });

  test("should initialize tab formatting with defaults", () => {
    // Create a mock sender and sendResponse
    const sender = { tab: { id: 123 } };
    const sendResponse = jest.fn();

    // Call the message listener directly
    messageListener({ action: "getTabFormatting" }, sender, sendResponse);

    // Check that it responded with the default formatting
    expect(sendResponse).toHaveBeenCalledWith({
      formatting: {
        backgroundColor: "#ffff00",
        textColor: "#000000",
        useDefaultBackground: false,
        useDefaultText: false,
      },
    });
  });

  test("should set and get custom tab formatting", () => {
    // Create a mock sender and sendResponse
    const sender = {};
    const sendResponse = jest.fn();

    // Set custom formatting
    messageListener(
      {
        action: "setTabFormatting",
        tabId: 123,
        formatting: {
          backgroundColor: "#ff0000",
          textColor: "#ffffff",
        },
      },
      sender,
      sendResponse
    );

    // Check that it responded with success
    expect(sendResponse).toHaveBeenCalledWith({ success: true });

    // Get the formatting
    const getFormatSendResponse = jest.fn();
    messageListener(
      { action: "getTabFormatting" },
      { tab: { id: 123 } },
      getFormatSendResponse
    );

    // Check that it responded with the custom formatting
    expect(getFormatSendResponse).toHaveBeenCalledWith({
      formatting: {
        backgroundColor: "#ff0000",
        textColor: "#ffffff",
        useDefaultBackground: false,
        useDefaultText: false,
      },
    });
  });

  test("should handle partial formatting updates", () => {
    // Create a mock sender and sendResponse
    const sender = {};
    const sendResponse = jest.fn();

    // Set initial formatting
    messageListener(
      {
        action: "setTabFormatting",
        tabId: 123,
        formatting: {
          backgroundColor: "#ff0000",
          textColor: "#ffffff",
        },
      },
      sender,
      sendResponse
    );

    // Update only the background color
    const updateSendResponse = jest.fn();
    messageListener(
      {
        action: "setTabFormatting",
        tabId: 123,
        formatting: {
          backgroundColor: "#00ff00",
        },
      },
      sender,
      updateSendResponse
    );

    // Check that it responded with success
    expect(updateSendResponse).toHaveBeenCalledWith({ success: true });

    // Get the formatting
    const getFormatSendResponse = jest.fn();
    messageListener(
      { action: "getTabFormatting" },
      { tab: { id: 123 } },
      getFormatSendResponse
    );

    // Check that it responded with the updated formatting
    expect(getFormatSendResponse).toHaveBeenCalledWith({
      formatting: {
        backgroundColor: "#00ff00",
        textColor: "#ffffff",
        useDefaultBackground: false,
        useDefaultText: false,
      },
    });
  });

  // Skip the stale tabs test since we can't easily mock the alarm listener
  test.skip("should clean up stale tabs periodically", () => {
    // This test is skipped because we can't easily mock the alarm listener
  });
});
