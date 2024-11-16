const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Read Mozilla credentials from json file
const credentialsPath = path.join(__dirname, '../.secrets/mozilla.json');
const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));

const configPath = path.join(__dirname, '../.web-ext-config.cjs');

// Run web-ext sign with credentials
try {
    execSync(
        `web-ext sign \
            --config=${configPath} \
            --api-key=${credentials.issuer} \
            --api-secret=${credentials.secret} \
            --channel=listed`,
        { stdio: 'inherit' }
    );
    console.log('✅ Extension signed successfully');
} catch (error) {
    console.error('❌ Failed to sign extension:', error.message);
    process.exit(1);
}
