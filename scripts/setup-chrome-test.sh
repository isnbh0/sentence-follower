#!/bin/bash

# Script to set up the current state of the code for Chrome testing
# This script should be run from the project root
#
# Usage:
#   ./scripts/setup-chrome-test.sh [--webpack]
#
# Options:
#   --webpack    Build with webpack in production mode before packaging

set -e  # Exit on any error

# Configuration
CHROME_TEST_DIR="chrome-test"
ZIP_FILE="sentence-follower-chrome.zip"
USE_WEBPACK=false

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to show usage information
show_usage() {
    echo "Usage: $0 [--webpack]"
    echo ""
    echo "Options:"
    echo "  --webpack    Build with webpack in production mode before packaging"
    echo "  --help       Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0           # Use source files directly"
    echo "  $0 --webpack # Build with webpack first, then package"
}

# Function to validate prerequisites
validate_prerequisites() {
    print_info "Validating prerequisites..."
    
    # Check if we're in the project root
    if [[ ! -f "manifest.json" ]]; then
        print_error "manifest.json not found. Please run this script from the project root."
        exit 1
    fi
    
    # If webpack mode is enabled, check for required files and dependencies
    if [[ "$USE_WEBPACK" == true ]]; then
        if [[ ! -f "webpack.config.js" ]]; then
            print_error "webpack.config.js not found. Cannot build with webpack."
            exit 1
        fi
        
        if [[ ! -f "package.json" ]]; then
            print_error "package.json not found. Cannot build with webpack."
            exit 1
        fi
        
        # Check if node_modules exists
        if [[ ! -d "node_modules" ]]; then
            print_warning "node_modules directory not found. You may need to run 'npm install' first."
        fi
    fi
}

# Function to build with webpack
build_with_webpack() {
    print_info "Building project with webpack in production mode..."
    
    # Check if npm is available
    if ! command -v npm &> /dev/null; then
        print_error "npm is required for webpack build but not found in PATH."
        exit 1
    fi
    
    # Run webpack build
    if npm run build:prod; then
        print_success "Webpack build completed successfully"
    else
        print_error "Webpack build failed"
        exit 1
    fi
    
    # Verify dist directory was created
    if [[ ! -d "dist" ]]; then
        print_error "dist directory not found after webpack build"
        exit 1
    fi
}

# Function to setup directory structure
setup_directories() {
    print_info "Setting up directory structure..."

# Create chrome-test directory if it doesn't exist
    mkdir -p "$CHROME_TEST_DIR"

# Clean up any existing files in chrome-test
    print_info "Cleaning up existing files..."
    rm -rf "${CHROME_TEST_DIR:?}"/*

# Create necessary subdirectories
    mkdir -p "$CHROME_TEST_DIR/content_scripts"
    mkdir -p "$CHROME_TEST_DIR/options"
    mkdir -p "$CHROME_TEST_DIR/icons"
}

# Function to copy webpack built files
copy_webpack_files() {
    print_info "Copying webpack built files..."
    
    # Copy all content_scripts
    if [[ -d "dist/content_scripts" ]]; then
        cp -r dist/content_scripts/* "$CHROME_TEST_DIR/content_scripts/"
    fi
    
    # Copy options files
    if [[ -d "dist/options" ]]; then
        cp -r dist/options/* "$CHROME_TEST_DIR/options/"
    fi
    
    # Copy icons
    if [[ -d "dist/icons" ]]; then
        cp -r dist/icons/* "$CHROME_TEST_DIR/icons/"
    fi
    
    # Copy background script
    if [[ -f "dist/background.js" ]]; then
        cp dist/background.js "$CHROME_TEST_DIR/"
    fi
    
    # Copy manifest
    if [[ -f "dist/manifest.json" ]]; then
        cp dist/manifest.json "$CHROME_TEST_DIR/"
    fi
}

# Function to copy source files
copy_source_files() {
    print_info "Copying source files..."

# Copy current files
    cp -r content_scripts/* "$CHROME_TEST_DIR/content_scripts/"
    cp -r options/* "$CHROME_TEST_DIR/options/"
    cp -r icons/* "$CHROME_TEST_DIR/icons/"
    cp background.js "$CHROME_TEST_DIR/"
    cp manifest.json "$CHROME_TEST_DIR/"
}

# Function to create README
create_readme() {
    print_info "Creating README.md..."
    
    local build_info=""
    if [[ "$USE_WEBPACK" == true ]]; then
        build_info=" (Webpack Production Build)"
    else
        build_info=" (Source Files)"
    fi
    
    cat > "$CHROME_TEST_DIR/README.md" << EOF
# Sentence Follower - Chrome Test Version${build_info}

This is a temporary Chrome version of the Sentence Follower extension for testing purposes.

## Build Information

EOF

    if [[ "$USE_WEBPACK" == true ]]; then
        cat >> "$CHROME_TEST_DIR/README.md" << 'EOF'
This version was built using webpack in production mode, which includes:
- Code minification and optimization
- Debug statements removed
- Production-ready bundle

EOF
    else
        cat >> "$CHROME_TEST_DIR/README.md" << 'EOF'
This version uses the source files directly without webpack processing.

EOF
    fi

    cat >> "$CHROME_TEST_DIR/README.md" << 'EOF'
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
}

# Function to create zip file
create_zip() {
    print_info "Creating zip file..."
    
    # Remove existing zip file if it exists
    [[ -f "$ZIP_FILE" ]] && rm "$ZIP_FILE"
    
    # Create zip file
    (cd "$CHROME_TEST_DIR" && zip -r "../$ZIP_FILE" .)
    
    if [[ -f "$ZIP_FILE" ]]; then
        print_success "Created $ZIP_FILE"
    else
        print_error "Failed to create zip file"
        exit 1
    fi
}

# Function to show completion instructions
show_completion_info() {
    local build_type=""
    if [[ "$USE_WEBPACK" == true ]]; then
        build_type=" using webpack production build"
    fi
    
    print_success "Chrome test environment setup complete${build_type}!"
echo ""
echo "You can now install the extension in Chrome using one of these methods:"
echo ""
echo "Method 1: Using the Directory (Developer Mode)"
echo "1. Open Chrome"
echo "2. Navigate to chrome://extensions"
echo "3. Toggle 'Developer mode' in the top-right corner"
echo "4. Click 'Load unpacked'"
    echo "5. Navigate to and select the $CHROME_TEST_DIR directory"
echo ""
echo "Method 2: Using the ZIP File"
echo "1. Open Chrome"
echo "2. Navigate to chrome://extensions"
echo "3. Toggle 'Developer mode' in the top-right corner"
    echo "4. Drag and drop the $ZIP_FILE file into the extensions page"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --webpack)
            USE_WEBPACK=true
            shift
            ;;
        --help)
            show_usage
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Main execution
main() {
    print_info "Setting up Chrome test environment..."
    
    if [[ "$USE_WEBPACK" == true ]]; then
        print_info "Using webpack production build mode"
    else
        print_info "Using source files directly"
    fi
    
    validate_prerequisites
    setup_directories
    
    if [[ "$USE_WEBPACK" == true ]]; then
        build_with_webpack
        copy_webpack_files
    else
        copy_source_files
    fi
    
    create_readme
    create_zip
    show_completion_info
}

# Run main function
main 
