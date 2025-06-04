const fs = require("fs");
const path = require("path");
const os = require("os");
const archiver = require("archiver");
const minimatch = require("minimatch");
const shutil = require("fs").promises;

// Directory where the zipped extension will be saved
const outputDir = path.join(__dirname, "../dist");
const outputPath = path.join(outputDir, "extension.zip");

// Ensure the output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
  console.log(`Created output directory at ${outputDir}`);
}

// Create a temporary directory
const tempDirPrefix = path.join(os.tmpdir(), "chrome-extension-");
fs.mkdtemp(tempDirPrefix, async (err, tempDir) => {
  if (err) {
    console.error("❌ Failed to create a temporary directory:", err);
    process.exit(1);
  }

  console.log(`📁 Created temporary directory at ${tempDir}`);

  try {
    // Define the files and directories to include in the Chrome extension package
    // These should come from the webpack dist output, not the source directories
    const filesToInclude = [
      "manifest.json",
      "background.js",
      "content_scripts/",
      "options/",
      "icons/",
    ];

    // Use the dist directory as the base (webpack output) instead of source
    const baseDir = path.resolve(__dirname, "../dist");

    // Check if dist directory exists (should be created by webpack build)
    if (!fs.existsSync(baseDir)) {
      console.error(
        "❌ Error: dist directory not found. Please run 'npm run build:prod' first."
      );
      process.exit(1);
    }

    const filesToIgnore = [
      "**/node_modules/**",
      "**/__tests__/**",
      "**/*.test.js",
      "**/.git/**",
    ];

    // Custom ignore function to log excluded files
    function shouldIgnore(filePath) {
      const relativePath = path.relative(baseDir, filePath);
      const isIgnored = filesToIgnore.some((pattern) =>
        minimatch(relativePath, pattern, { dot: true })
      );
      if (isIgnored) {
        console.log(`❌ Excluded: ${relativePath}`);
      }
      return isIgnored;
    }

    // Copy each specified file/directory to the temporary directory
    for (const item of filesToInclude) {
      const itemPath = path.join(baseDir, item);
      const tempItemPath = path.join(tempDir, item);

      if (fs.existsSync(itemPath)) {
        if (fs.lstatSync(itemPath).isDirectory()) {
          await copyDirectory(itemPath, tempItemPath, shouldIgnore);
          console.log(`📂 Copied directory ${item} to temporary directory.`);
        } else {
          await shutil.copyFile(itemPath, tempItemPath);
          console.log(`📄 Copied file ${item} to temporary directory.`);
        }
      } else {
        console.warn(`⚠️ Warning: ${item} does not exist and was skipped.`);
      }
    }

    // Create a file to stream archive data to
    const output = fs.createWriteStream(outputPath);
    const archive = archiver("zip", {
      zlib: { level: 9 }, // Maximum compression
    });

    // Listen for all archive data to be written
    output.on("close", () => {
      console.log(
        `✅ Extension package zipped successfully. Total size: ${archive.pointer()} bytes`
      );
      // Clean up the temporary directory
      fs.rm(tempDir, { recursive: true, force: true }, (err) => {
        if (err) {
          console.error("❌ Failed to remove temporary directory:", err);
        } else {
          console.log(`🗑️ Temporary directory ${tempDir} removed.`);
        }
      });
    });

    // Handle archive warnings (e.g., stat failures and other non-blocking errors)
    archive.on("warning", (err) => {
      if (err.code === "ENOENT") {
        console.warn("⚠️ Warning:", err.message);
      } else {
        throw err;
      }
    });

    // Handle archive errors
    archive.on("error", (err) => {
      throw err;
    });

    // Pipe archive data to the file
    archive.pipe(output);

    // Append the temporary directory to the archive
    archive.directory(tempDir, false);

    // Finalize the archive (i.e., finish the stream)
    await archive.finalize();
    console.log("✅ Archive finalized successfully.");
  } catch (error) {
    console.error("❌ Error during zipping process:", error.stack || error);
    process.exit(1);
  }
});

/**
 * Recursively copies a directory from src to dest, ignoring files based on the shouldIgnore function.
 * @param {string} src - Source directory path.
 * @param {string} dest - Destination directory path.
 * @param {function} shouldIgnore - Function to determine if a file should be ignored.
 */
async function copyDirectory(src, dest, shouldIgnore) {
  await fs.promises.mkdir(dest, { recursive: true });
  const entries = await fs.promises.readdir(src, { withFileTypes: true });

  for (let entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (shouldIgnore(srcPath)) {
      continue;
    }

    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath, shouldIgnore);
    } else {
      await shutil.copyFile(srcPath, destPath);
    }
  }
}
