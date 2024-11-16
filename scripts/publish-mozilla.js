const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Read Mozilla credentials from json file
const credentialsPath = path.join(__dirname, '../.secrets/mozilla.json');
const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));

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
            --timeout=1000`,
        { stdio: 'inherit' }
    );
    console.log('✅ Extension submitted successfully');
} catch (error) {
    console.error('❌ Failed:', error.message);
    process.exit(1);
}
