const path = require('path');
const { execSync } = require('child_process');

// Get Mozilla credentials from environment variables
const credentials = {
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
            --timeout=100000`,
        { stdio: 'inherit' }
    );
    console.log('✅ Extension submitted successfully');
} catch (error) {
    console.error('❌ Failed:', error.message);
    process.exit(1);
}
