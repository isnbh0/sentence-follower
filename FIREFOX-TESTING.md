# Sentence Follower - Firefox Testing Guide

This guide explains how to test the Sentence Follower extension in Firefox.

## Setting Up the Firefox Test Environment

To create a Firefox-compatible version of the extension with the current state of your code, run:

```bash
./setup-firefox-test.sh
```

This script will:

1. Create a `firefox-test` directory with all necessary files
2. Copy the current manifest.json file (Firefox supports Manifest V3)
3. Create a zip file (`sentence-follower-firefox.zip`) for easy installation

**Note:** Run this script whenever you make changes to the codebase that you want to test in Firefox.

## Firefox Testing Version

After running the setup script, a Firefox-compatible version of the extension will be available in two formats:

1. **Directory**: The `firefox-test` directory contains all the necessary files for loading the extension in Firefox.
2. **ZIP File**: The `sentence-follower-firefox.zip` file contains the same files in a compressed format.

## Installing in Firefox

### Method 1: Using the Directory

1. Open Firefox
2. Navigate to `about:debugging`
3. Click "This Firefox"
4. Click "Load Temporary Add-on..."
5. Navigate to the `firefox-test` directory and select the `manifest.json` file

### Method 2: Using the ZIP File

1. Open Firefox
2. Navigate to `about:debugging`
3. Click "This Firefox"
4. Click "Load Temporary Add-on..."
5. Select the `sentence-follower-firefox.zip` file

Note: Temporarily installed extensions will be removed when Firefox is closed.

## Using the Extension

Once installed, the extension will highlight the sentence under your cursor as you move it over text on web pages.

- Toggle the extension on/off: `Alt+Shift+H`
- Configure appearance: Click the extension icon in the toolbar

## Troubleshooting

If you encounter any issues:

1. Check the Firefox console (F12 > Console) for error messages
2. Make sure all the files are correctly copied to the firefox-test directory
3. Try reloading the extension from about:debugging
4. Run the setup script again to ensure you have the latest code
