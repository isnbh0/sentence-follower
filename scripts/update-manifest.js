const fs = require("fs");

// Read package.json to get the new version
const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
const newVersion = packageJson.version;

// Read and update manifest.json
const manifestPath = "manifest.json";
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
manifest.version = newVersion;

// Write the updated manifest.json
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

console.log(`Updated manifest.json to version ${newVersion}`);
