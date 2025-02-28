# Sentence Follower

Sentence Follower is a browser extension that helps you follow along with long-form text content by identifying and highlighting the sentence under your cursor.

## Development

This extension uses webpack for building and managing environment-specific features.

### Build Commands

- `npm run build:dev`: Creates a development build with debug logging enabled
- `npm run build:prod`: Creates a production build with debug logging disabled
- `npm run start:firefox`: Builds for development and starts Firefox with the extension loaded
- `npm run zip:chrome`: Creates a production build and zips it for Chrome publishing
- `npm run publish:chrome`: Creates a production build and publishes to Chrome Web Store
- `npm run publish:mozilla`: Creates a production build and publishes to Firefox Add-ons

### Logging System

The extension uses a centralized logging utility with environment-based configuration:

- In development builds, all debug logs are enabled
- In production builds, all debug logs are automatically removed

For more details, see [LOGGING.md](LOGGING.md).

## License

[ISC License](LICENSE)
