const path = require('path');
const fs = require('fs');

// Get Chrome Web Store credentials from environment variables
const credentials = process.env.MODE === 'local'
    ? JSON.parse(fs.readFileSync(path.join(__dirname, '../.secrets/chrome.json')))
    : {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
        chromeExtensionId: process.env.GOOGLE_CHROME_EXTENSION_ID
    };

// Validate credentials
if (!credentials.clientId || !credentials.clientSecret || !credentials.refreshToken || !credentials.extensionId) {
    if (!credentials.clientId) {
        console.error('❌ GOOGLE_CLIENT_ID not found in environment variables');
    }
    if (!credentials.clientSecret) {
        console.error('❌ GOOGLE_CLIENT_SECRET not found in environment variables');
    }
    if (!credentials.refreshToken) {
        console.error('❌ GOOGLE_REFRESH_TOKEN not found in environment variables');
    }
    if (!credentials.chromeExtensionId) {
        console.error('❌ GOOGLE_CHROME_EXTENSION_ID not found in environment variables');
    }
    process.exit(1);
}

// Function to refresh access token
async function refreshAccessToken() {
    try {
        console.log('🔄 Refreshing access token...');
        const params = new URLSearchParams();
        params.append('client_id', credentials.clientId);
        params.append('client_secret', credentials.clientSecret);
        params.append('refresh_token', credentials.refreshToken);
        params.append('grant_type', 'refresh_token');

        const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: params
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const tokenData = await response.json();

        if (tokenData.access_token) {
            console.log('✅ Access token refreshed successfully');
            return tokenData.access_token;
        } else {
            throw new Error('No access token returned');
        }
    } catch (error) {
        console.error('❌ Failed to refresh access token:', error.message);
        process.exit(1);
    }
}

// Function to upload the extension package
async function uploadExtension(accessToken, zipFilePath) {
    try {
        console.log('📦 Uploading extension package...');
        const fileData = fs.readFileSync(zipFilePath);

        const uploadUrl = `https://www.googleapis.com/upload/chromewebstore/v1.1/items/${credentials.extensionId}`;

        const response = await fetch(uploadUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'x-goog-api-version': '2',
                'Content-Type': 'application/zip'
            },
            body: fileData
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Upload failed with status ${response.status}: ${errorText}`);
        }

        console.log('✅ Extension package uploaded successfully');
    } catch (error) {
        console.error('❌ Failed to upload extension package:', error.message);
        process.exit(1);
    }
}

// Function to publish the extension
async function publishExtension(accessToken) {
    try {
        console.log('🚀 Publishing extension to Chrome Web Store...');
        const publishUrl = `https://www.googleapis.com/chromewebstore/v1.1/items/${credentials.extensionId}/publish`;

        const response = await fetch(publishUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'x-goog-api-version': '2',
                'Content-Length': '0'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Publish failed with status ${response.status}: ${errorText}`);
        }

        console.log('✅ Extension published successfully');
    } catch (error) {
        console.error('❌ Failed to publish extension:', error.message);
        process.exit(1);
    }
}

// Main publishing process
async function publishChromeExtension() {
    console.log('🔍 Starting publishChromeExtension process');

    // Path to the zipped extension package
    const zipFilePath = path.join(__dirname, '../dist/extension.zip'); // Update this path as needed
    console.log(`📂 Zip file path: ${zipFilePath}`);

    // Check if the zip file exists
    if (!fs.existsSync(zipFilePath)) {
        console.error(`❌ Extension package not found at path: ${zipFilePath}`);
        process.exit(1);
    }
    console.log('✅ Extension package exists.');

    try {
        // Refresh access token
        console.log('🔄 Refreshing access token...');
        const accessToken = await refreshAccessToken();
        console.log(`🔑 Access token obtained: ${accessToken}`);

        // Upload the extension package
        console.log('📦 Uploading extension package...');
        await uploadExtension(accessToken, zipFilePath);
        console.log('✅ Extension package uploaded successfully.');

        // Publish the extension
        console.log('🚀 Publishing the extension to Chrome Web Store...');
        await publishExtension(accessToken);
        console.log('✅ Extension published successfully.');
    } catch (error) {
        console.error(`❌ An error occurred during the publishing process: ${error.message}`);
        process.exit(1);
    }

    console.log('🎉 publishChromeExtension process completed.');
}

// Execute the publishing process
publishChromeExtension();
