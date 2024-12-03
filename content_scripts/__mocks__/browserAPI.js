const DEFAULT_OPTIONS = {
  enabled: true,
  backgroundColor: "#ffff00",
  useDefaultBackground: false,
  textColor: "#000000",
  useDefaultText: true,
};

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
    sendMessage: jest.fn(),
  },
};

module.exports = browserAPI;
