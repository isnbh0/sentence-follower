# Sentence Follower - Chrome Testing Guide

This guide explains how to test the Sentence Follower extension in Chrome.

## Setting Up the Chrome Test Environment

To create a Chrome-compatible version of the extension with the current state of your code, run:

```bash
./setup-chrome-test.sh
```

This script will:

1. Create a `chrome-test` directory with all necessary files
2. Copy and adapt the manifest.json file for Chrome compatibility
3. Create a zip file (`sentence-follower-chrome.zip`) for easy installation

**Note:** Run this script whenever you make changes to the codebase that you want to test in Chrome.

## Chrome Testing Version

After running the setup script, a Chrome-compatible version of the extension will be available in two formats:

1. **Directory**: The `chrome-test` directory contains all the necessary files for loading the extension in Chrome.
2. **ZIP File**: The `sentence-follower-chrome.zip` file contains the same files in a compressed format.

## Installing in Chrome

### Method 1: Using the Directory (Developer Mode)

1. Open Chrome
2. Navigate to `chrome://extensions`
3. Toggle "Developer mode" in the top-right corner
4. Click "Load unpacked"
5. Navigate to and select the `chrome-test` directory

### Method 2: Using the ZIP File

1. Open Chrome
2. Navigate to `chrome://extensions`
3. Toggle "Developer mode" in the top-right corner
4. Drag and drop the `sentence-follower-chrome.zip` file into the extensions page

Note: Extensions loaded in developer mode will remain installed until you remove them or disable developer mode.

## Using the Extension

Once installed, the extension will highlight the sentence under your cursor as you move it over text on web pages.

- Toggle the extension on/off: `Alt+Shift+H`
- Configure appearance: Click the extension icon in the toolbar

## Troubleshooting

If you encounter any issues:

1. Check the Chrome console (F12 > Console) for error messages
2. Inspect the extension's background page by clicking "background page" under the extension in chrome://extensions
3. Make sure all the files are correctly copied to the chrome-test directory
4. Try reloading the extension from chrome://extensions
5. Run the setup script again to ensure you have the latest code
