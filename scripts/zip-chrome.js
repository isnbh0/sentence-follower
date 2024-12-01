const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

// Directory where the zipped extension will be saved
const outputDir = path.join(__dirname, '../dist');
const outputPath = path.join(outputDir, 'extension.zip');

// Ensure the output directory exists
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`Created output directory at ${outputDir}`);
}

// Create a file to stream archive data to
const output = fs.createWriteStream(outputPath);
const archive = archiver('zip', {
    zlib: { level: 9 } // Maximum compression
});

// Listen for all archive data to be written
output.on('close', () => {
    console.log(`✅ Extension package zipped successfully. Total size: ${archive.pointer()} bytes`);
});

// Handle archive warnings (e.g., stat failures and other non-blocking errors)
archive.on('warning', (err) => {
    if (err.code === 'ENOENT') {
        console.warn('⚠️ Warning:', err.message);
    } else {
        throw err;
    }
});

// Handle archive errors
archive.on('error', (err) => {
    throw err;
});

// Pipe archive data to the file
archive.pipe(output);

// Define the files and directories to include in the Chrome extension package
const filesToInclude = [
    'manifest.json',
    'background.js',
    'content_scripts/',
    'options/',
    'icons/',
];

// Append each specified file/directory to the archive
filesToInclude.forEach((item) => {
    const itemPath = path.join(__dirname, '../', item);
    if (fs.existsSync(itemPath)) {
        archive.glob(item, {
            cwd: path.join(__dirname, '../'),
            ignore: ['**/node_modules/**', '**/__tests__/**', '**/*.test.js', '**/.git/**']
        });
        console.log(`📦 Added ${item} to the archive.`);
    } else {
        console.warn(`⚠️ Warning: ${item} does not exist and was skipped.`);
    }
});

// Finalize the archive (i.e., finish the stream)
archive.finalize().then(() => {
    console.log('✅ Archive finalized successfully.');
}).catch(err => {
    console.log('❌ Error finalizing the archive:', err.stack || err);
    console.error('❌ Error finalizing the archive:', err.stack || err);
    process.exit(1);
});
