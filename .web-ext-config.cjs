const { execSync } = require('child_process');

// Get a list of untracked files (excluding node_modules)
const untrackedFiles = execSync('git ls-files --others \':!node_modules/**\'', { encoding: 'utf-8' })
    .split('\n')
    .filter(Boolean);

module.exports = {
    build: {
        overwriteDest: true, // optional, overwrite existing build
    },
    ignoreFiles: untrackedFiles
};
