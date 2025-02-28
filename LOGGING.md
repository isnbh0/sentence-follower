# Logging System for Sentence Follower Extension

This document describes the logging system used in the Sentence Follower extension and how to manage debug logs for development and production environments.

## Overview

The extension uses a centralized logging utility that allows for:

- Different log levels (info, warn, error, debug)
- Module-based logging (each log message includes the module name)
- Automatic detection of development vs. production environments

## Using the Logging Utility

The logging utility is automatically loaded by all content scripts and is available globally.

Use the following log methods:

```javascript
// Informational logs
log.info("ModuleName", "Some informational message", optionalVariable);

// Warning logs
log.warn("ModuleName", "Warning message", optionalVariable);

// Error logs
log.error("ModuleName", "Error message", errorObject);

// Debug logs (most verbose)
log.debug("ModuleName", "Detailed debug information", debugData);
```

## Development vs. Production

Debug logs are automatically enabled in development builds and disabled in production builds. This is controlled by webpack's environment variables:

- `npm run build:dev` will create a development build with debug logs enabled
- `npm run build:prod` will create a production build with debug logs disabled

The production build scripts (`publish:chrome` and `publish:mozilla`) automatically use production mode, which disables debug logs.

## How It Works

The system uses webpack's DefinePlugin to replace `process.env.IS_DEBUG` with `true` or `false` at build time.

In production builds, the JavaScript minifier will remove all debug logging code as dead code, making your extension smaller and faster.

## Best Practices

1. Always specify a module name (e.g., 'Background', 'Content', 'FloatingUI') as the first parameter to all log calls
2. Use the appropriate log level based on the information being logged
3. Never rely on logs for functional behavior (logs are removed in production)
4. Add detailed logging around complex or error-prone areas of code

## Advanced Usage

If you need to conditionally execute code only in development mode, you can check the `IS_DEBUG` constant:

```javascript
if (IS_DEBUG) {
  // Development-only code here
}
```

This code will be completely removed in production builds.

## Extending the Logging System

If additional functionality is needed, modify the `logging.js` file. All log methods can be updated in one central place.
