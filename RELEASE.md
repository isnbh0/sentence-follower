# Sentence Follower Extension: Version & Release Guide

## Overview

This document outlines the process for updating and publishing new versions of the Sentence Follower browser extension. The extension uses semantic versioning and an automated GitHub Actions workflow to streamline the release process.

## Versioning System

The extension follows [Semantic Versioning](https://semver.org/) conventions:

- **Patch version** (0.4.20 → 0.4.21): Bug fixes and minor changes
- **Minor version** (0.4.20 → 0.5.0): New features that are backward compatible
- **Major version** (0.4.20 → 1.0.0): Breaking changes or significant rewrites

## Release Process

### 1. Update the Version

Run one of the following commands locally based on the type of changes:

```bash
npm version patch   # For bug fixes (0.4.20 → 0.4.21)
npm version minor   # For new features (0.4.20 → 0.5.0)
npm version major   # For breaking changes (0.4.20 → 1.0.0)
```

**Note:** Do not run `npm run version` separately. The `version` script is automatically executed during the npm version lifecycle.

### 2. Push Changes to GitHub

Push both the commit and the tag:

```bash
git push origin main --tags
```

### 3. Automated Release Process

The GitHub Actions workflow is triggered automatically when a tag matching `v*` is pushed. It performs the following steps:

1. Sets up the build environment
2. Builds the extension
3. Creates a GitHub Release with the extension file
4. Publishes to Mozilla Add-ons
5. Publishes to Chrome Web Store

## What Happens Behind the Scenes

### When `npm version` Runs

The `npm version` command follows this lifecycle:

1. Checks that the git working directory is clean
2. Runs `preversion` script if defined in package.json
3. Updates the version number in package.json
4. Runs `version` script:
   - Executes `scripts/update-manifest.js` to update manifest.json
   - Adds manifest.json to git staging
5. Creates a git commit with the version change
6. Creates a git tag for the new version (e.g., v0.4.21)
7. Runs `postversion` script if defined in package.json

### GitHub Actions Workflow Trigger

When a tag matching `v*` is pushed:

1. The `release.yml` workflow triggers
2. The workflow:
   - Installs dependencies using `npm ci`
   - Builds the extension with `npm run build:prod`
   - Creates a GitHub release with the generated ZIP file
   - Publishes to Mozilla Add-ons using JWT credentials
   - Publishes to Chrome Web Store using Google API credentials

## Publishing Scripts

### Mozilla Publishing

The `publish:mozilla.js` script:

- Validates the extension with `web-ext lint`
- Submits it for signing with Mozilla Add-ons
- Uses JWT credentials stored in GitHub secrets or local `.secrets/mozilla.json`

### Chrome Publishing

The Chrome publishing process has two steps:

1. `zip:chrome.js` script:

   - Creates a temporary directory
   - Copies relevant files (excluding node_modules, tests, etc.)
   - Creates a ZIP archive at `dist/extension.zip`

2. `publish:chrome.js` script:
   - Refreshes access token using stored credentials
   - Uploads the extension package to Chrome Web Store
   - Note: Final publishing to users is done manually from the Chrome Web Store dashboard

## Required Credentials

The automated publishing process requires these credentials:

### For Mozilla Add-ons:

- `MOZILLA_JWT_ISSUER`
- `MOZILLA_JWT_SECRET`

### For Chrome Web Store:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REFRESH_TOKEN`
- `GOOGLE_CHROME_EXTENSION_ID`

These are stored as GitHub secrets for the automated workflow.

## Troubleshooting

### Common Issues

1. **"Git working directory not clean" error**

   - Commit or stash pending changes before running `npm version`

2. **"Failed to refresh access token" error**

   - Check that Chrome Web Store credentials are correctly set

3. **Mozilla signing timeout**
   - This is normal; the extension is still being processed
   - Check the Mozilla Add-ons dashboard for status

## Quick Reference

```bash
# Update version
npm version patch|minor|major

# Push changes and tags
git push origin main --tags

# Manual build (if needed)
npm run build:prod

# Manual publishing (if GitHub Actions fails)
npm run publish:mozilla     # Publish to Mozilla
npm run publish:chrome      # Publish to Chrome
npm run publish             # Publish to both
```

## How to Create a Release Manually

1. Update version in `package.json`
2. Run the version script: `npm run version`
3. Build the extension using `npm run build:prod`
4. Create and push a version tag:
   ```bash
   git tag v0.x.x
   git push origin v0.x.x
   ```

---

This guide documents the release process for the Sentence Follower browser extension. For questions, please refer to the extension repository documentation or open an issue on GitHub.
