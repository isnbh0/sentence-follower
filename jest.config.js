module.exports = {
  testEnvironment: "jsdom",
  moduleDirectories: ["node_modules", "content_scripts"],
  moduleNameMapper: {
    "^./__mocks__/browser$": "<rootDir>/content_scripts/__mocks__/browser.js",
    "^webextension-polyfill$":
      "<rootDir>/content_scripts/__mocks__/webextension-polyfill.js",
  },
};
