#!/bin/bash

# Script to set up the current state of the code for Firefox testing
# This script should be run from the project root

echo "Setting up Firefox test environment..."

# Create firefox-test directory if it doesn't exist
mkdir -p firefox-test

# Clean up any existing files in firefox-test
echo "Cleaning up existing files..."
rm -rf firefox-test/*

# Create necessary subdirectories
mkdir -p firefox-test/content_scripts
mkdir -p firefox-test/options
mkdir -p firefox-test/icons

# Copy current files
echo "Copying current files..."
cp -r content_scripts/* firefox-test/content_scripts/
cp -r options/* firefox-test/options/
cp -r icons/* firefox-test/icons/
cp background.js firefox-test/

# Copy the manifest.json file for Firefox
# Firefox supports both Manifest V2 and V3, so we can use the existing manifest
echo "Copying manifest.json for Firefox..."
cp manifest.json firefox-test/manifest.json

# Create README.md in firefox-test
echo "Creating README.md..."
cat > firefox-test/README.md << 'EOF'
# Sentence Follower - Firefox Test Version

This is a temporary Firefox version of the Sentence Follower extension for testing purposes.

## Installing in Firefox

### Temporary Installation (for testing)

1. Open Firefox
2. Navigate to `about:debugging`
3. Click "This Firefox"
4. Click "Load Temporary Add-on..."
5. Navigate to this directory and select the `manifest.json` file

Note: Temporarily installed extensions will be removed when Firefox is closed.

### Using the Extension

Once installed, the extension will highlight the sentence under your cursor as you move it over text on web pages.

- Toggle the extension on/off: `Alt+Shift+H`
- Configure appearance: Click the extension icon in the toolbar
EOF

# Create a zip file for easy installation
echo "Creating zip file..."
cd firefox-test
zip -r ../sentence-follower-firefox.zip *
cd ..

echo "Firefox test environment setup complete!"
echo ""
echo "You can now install the extension in Firefox using one of these methods:"
echo ""
echo "Method 1: Using the Directory"
echo "1. Open Firefox"
echo "2. Navigate to about:debugging"
echo "3. Click 'This Firefox'"
echo "4. Click 'Load Temporary Add-on...'"
echo "5. Navigate to the firefox-test directory and select the manifest.json file"
echo ""
echo "Method 2: Using the ZIP File"
echo "1. Open Firefox"
echo "2. Navigate to about:debugging"
echo "3. Click 'This Firefox'"
echo "4. Click 'Load Temporary Add-on...'"
echo "5. Select the sentence-follower-firefox.zip file" 
