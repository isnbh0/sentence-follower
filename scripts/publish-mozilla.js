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

// Function to execute a shell command and display output in real-time
function executeCommand(command, options = {}) {
    try {
        // Execute the command with 'pipe' to capture stdout and stderr
        const output = execSync(command, { stdio: ['ignore', 'pipe', 'pipe'], ...options });

        // Write stdout to the console
        if (output) {
            process.stdout.write(output);
        }

        return { success: true, output: output.toString() };
    } catch (error) {
        // Capture and display stderr
        const stderr = error.stderr ? error.stderr.toString() : '';
        process.stderr.write(stderr);

        return { success: false, error, stderr };
    }
}

// First validate the extension
console.log('🔍 Validating extension...');
const lintCommand = `web-ext lint --config=${configPath}`;
const lintResult = executeCommand(lintCommand, { stdio: 'pipe' });

if (!lintResult.success) {
    console.error('❌ Linting failed.');
    process.exit(1);
}

// Then submit for signing with short timeout
console.log('📝 Submitting extension for signing...');
const signCommand = `web-ext sign \
    --config=${configPath} \
    --api-key=${credentials.issuer} \
    --api-secret=${credentials.secret} \
    --channel=listed \
    --timeout=100000`;
const signResult = executeCommand(signCommand, { stdio: 'pipe' });

if (signResult.success) {
    console.log('✅ Extension submitted successfully');
} else {
    const stderr = signResult.stderr || signResult.error.message;

    // Check if the stderr contains the timeout indication
    if (stderr.includes('Approval: timeout exceeded')) {
        // Optionally, extract the XPI URL from stderr if available
        const urlMatch = stderr.match(/https:\/\/addons\.mozilla\.org.*\/versions\/\d+/);
        if (urlMatch) {
            console.warn(`⚠️ Approval timed out. Signed XPI available at: ${urlMatch[0]}`);
        } else {
            console.warn('⚠️ Approval timed out. XPI URL not found in the error message.');
        }
        process.exit(0);
    } else {
        console.error('❌ Failed:', stderr || signResult.error.message);
        process.exit(1);
    }
}
