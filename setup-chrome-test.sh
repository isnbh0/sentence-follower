#!/bin/bash

# Script to set up the current state of the code for Chrome testing
# This script should be run from the project root

echo "Setting up Chrome test environment..."

# Create chrome-test directory if it doesn't exist
mkdir -p chrome-test

# Clean up any existing files in chrome-test
echo "Cleaning up existing files..."
rm -rf chrome-test/*

# Create necessary subdirectories
mkdir -p chrome-test/content_scripts
mkdir -p chrome-test/options
mkdir -p chrome-test/icons

# Copy current files
echo "Copying current files..."
cp -r content_scripts/* chrome-test/content_scripts/
cp -r options/* chrome-test/options/
cp -r icons/* chrome-test/icons/
cp background.js chrome-test/

# Copy the manifest.json file for Chrome
# Chrome requires Manifest V3, ensure compatibility
echo "Copying manifest.json for Chrome..."
cp manifest.json chrome-test/manifest.json

# Create README.md in chrome-test
echo "Creating README.md..."
cat > chrome-test/README.md << 'EOF'
# Sentence Follower - Chrome Test Version

This is a temporary Chrome version of the Sentence Follower extension for testing purposes.

## Installing in Chrome

### Developer Mode Installation (for testing)

1. Open Chrome
2. Navigate to `chrome://extensions`
3. Toggle "Developer mode" in the top-right corner
4. Click "Load unpacked"
5. Navigate to and select this directory

Note: Extensions loaded in developer mode will remain installed until you remove them or disable developer mode.

### Using the Extension

Once installed, the extension will highlight the sentence under your cursor as you move it over text on web pages.

- Toggle the extension on/off: `Alt+Shift+H`
- Configure appearance: Click the extension icon in the toolbar
EOF

# Create a zip file for easy installation
echo "Creating zip file..."
cd chrome-test
zip -r ../sentence-follower-chrome.zip *
cd ..

echo "Chrome test environment setup complete!"
echo ""
echo "You can now install the extension in Chrome using one of these methods:"
echo ""
echo "Method 1: Using the Directory (Developer Mode)"
echo "1. Open Chrome"
echo "2. Navigate to chrome://extensions"
echo "3. Toggle 'Developer mode' in the top-right corner"
echo "4. Click 'Load unpacked'"
echo "5. Navigate to and select the chrome-test directory"
echo ""
echo "Method 2: Using the ZIP File"
echo "1. Open Chrome"
echo "2. Navigate to chrome://extensions"
echo "3. Toggle 'Developer mode' in the top-right corner"
echo "4. Drag and drop the sentence-follower-chrome.zip file into the extensions page" 
