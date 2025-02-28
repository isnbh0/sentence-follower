/**
 * @jest-environment jsdom
 */

// Mock the DOM elements needed for the tests
function setupDOM() {
  document.body.innerHTML = `
    <div class="form-group toggle-container">
      <div>
        <label for="enabledToggle">Enable Sentence Follower</label>
        <span class="shortcut-note">(Alt+Shift+H to toggle)</span>
        <span class="tab-specific-note" id="tabIndicator">Settings affect current tab only</span>
      </div>
      <button
        type="button"
        id="enabledToggle"
        class="toggle-button"
        aria-pressed="false"
      ></button>
    </div>
    <div class="settings-box">
      <div id="backgroundColorOptions">
        <div class="color-swatch selected" data-color="#ffff00"></div>
      </div>
      <div id="textColorOptions">
        <div class="color-swatch selected" data-color="#000000"></div>
      </div>
      <div id="previewText" style="background-color: #ffff00; color: #000000;">
        Sample Text
      </div>
      <div id="status" class="status"></div>
    </div>
    <form id="options-form"></form>
  `;
}

// Create mock browserAPI before requiring the module
const mockBrowserAPI = {
  storage: {
    local: {
      get: jest.fn().mockResolvedValue({
        backgroundColor: "#ffff00",
        textColor: "#000000",
      }),
      set: jest.fn().mockResolvedValue({}),
    },
  },
  runtime: {
    sendMessage: jest.fn().mockResolvedValue({ enabled: false }),
  },
  tabs: {
    query: jest
      .fn()
      .mockResolvedValue([
        { id: 123, title: "Test Tab", url: "https://example.com" },
      ]),
    sendMessage: jest.fn().mockResolvedValue({}),
  },
};

// Mock global browser object
global.browser = mockBrowserAPI;
global.chrome = mockBrowserAPI;

describe("Options Page", () => {
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Reset modules to get a fresh instance
    jest.resetModules();

    // Setup DOM
    setupDOM();
  });

  test("should update tab indicator with domain information", () => {
    // Import the module
    const optionsModule = require("./options.js");
    const tab = { id: 123, url: "https://example.com/page" };

    optionsModule.updateTabIndicator(tab);

    const tabIndicator = document.getElementById("tabIndicator");
    expect(tabIndicator.textContent).toBe(
      "Settings affect current tab only: example.com"
    );
  });

  test("should request tab-specific formatting on restore", () => {
    // Load the module
    require("./options.js");

    // Trigger DOMContentLoaded to initialize
    document.dispatchEvent(new Event("DOMContentLoaded"));

    // Check that it requested tab-specific formatting
    expect(mockBrowserAPI.tabs.query).toHaveBeenCalledWith({
      active: true,
      currentWindow: true,
    });

    // Wait for promises to resolve
    return new Promise((resolve) => setTimeout(resolve, 0)).then(() => {
      expect(mockBrowserAPI.runtime.sendMessage).toHaveBeenCalledWith({
        action: "getTabFormatting",
        tabId: 123,
      });
    });
  });

  test("should handle toggle button state change", () => {
    // Load the module
    const optionsModule = require("./options.js");

    // Call handleToggleChange directly
    optionsModule.handleToggleChange(true);

    // Check that it set tab-specific enabled state
    expect(mockBrowserAPI.tabs.query).toHaveBeenCalledWith({
      active: true,
      currentWindow: true,
    });

    // Wait for promises to resolve
    return new Promise((resolve) => setTimeout(resolve, 0)).then(() => {
      expect(mockBrowserAPI.runtime.sendMessage).toHaveBeenCalledWith({
        action: "setTabEnabled",
        tabId: 123,
        enabled: true,
      });
    });
  });

  test("should update color pickers state based on enabled state", () => {
    // Load the module
    const optionsModule = require("./options.js");

    // Call updateColorPickersState with disabled state
    optionsModule.updateColorPickersState(false);

    // Check that the settings box has the disabled class
    const settingsBox = document.querySelector(".settings-box");
    expect(settingsBox.classList.contains("disabled-section")).toBe(true);

    // Call updateColorPickersState with enabled state
    optionsModule.updateColorPickersState(true);

    // Check that the settings box doesn't have the disabled class
    expect(settingsBox.classList.contains("disabled-section")).toBe(false);
  });

  test("should extract domain from tab URL", () => {
    // Load the module
    const optionsModule = require("./options.js");

    // Test with a valid URL
    const tab = { url: "https://example.com/page?query=test" };
    expect(optionsModule.getDomainFromTab(tab)).toBe("example.com");

    // Test with no URL
    const noUrlTab = { title: "Test Tab" };
    expect(optionsModule.getDomainFromTab(noUrlTab)).toBe("current tab");
  });
});
