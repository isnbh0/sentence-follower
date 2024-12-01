const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

// Get Mozilla credentials from environment variables
const credentials = process.env.MODE === 'local'
    ? JSON.parse(fs.readFileSync(path.join(__dirname, '../.secrets/mozilla.json')))
    : {
        issuer: process.env.MOZILLA_JWT_ISSUER,
        secret: process.env.MOZILLA_JWT_SECRET
};

// Validate credentials
if (!credentials.issuer || !credentials.secret) {
    console.error('❌ Mozilla credentials not found in environment variables');
    process.exit(1);
}

const configPath = path.join(__dirname, '../.web-ext-config.cjs');

// First validate the extension
try {
    console.log('🔍 Validating extension...');
    execSync(
        `web-ext lint --config=${configPath}`,
        { stdio: 'inherit' }
    );
    
    // Then submit for signing with short timeout
    console.log('📝 Submitting extension for signing...');
    execSync(
        `web-ext sign \
            --config=${configPath} \
            --api-key=${credentials.issuer} \
            --api-secret=${credentials.secret} \
            --channel=listed \
            --timeout=10000`,
        { stdio: 'pipe' }
    );
    console.log('✅ Extension submitted successfully');
} catch (error) {
    // Capture stderr output
    const stderr = error.stderr ? error.stderr.toString() : '';

    // Check if the stderr contains the timeout indication
    if (stderr.includes('Approval: timeout exceeded')) {
        const urlMatch = stderr.match(/https:\/\/addons\.mozilla\.org.*\/versions\/\d+/);
        if (urlMatch) {
            console.warn(`⚠️ Approval timed out. Signed XPI available at: ${urlMatch[0]}`);
        } else {
            console.warn('⚠️ Approval timed out. XPI URL not found in the error message.');
        }
        process.exit(0);
    } else {
        console.error('❌ Failed:', stderr || error.message);
        process.exit(1);
    }
}
