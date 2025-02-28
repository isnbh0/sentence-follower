const path = require("path");
const webpack = require("webpack");
const CopyPlugin = require("copy-webpack-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");

module.exports = (env, argv) => {
  // Determine if we're in production mode
  const isProduction = argv.mode === "production";

  console.log(
    `Building in ${isProduction ? "production" : "development"} mode`
  );

  return {
    entry: {
      background: "./background.js",
      "content_scripts/logging": "./content_scripts/logging.js",
      "content_scripts/common": "./content_scripts/common.js",
      "content_scripts/sentence-highlight":
        "./content_scripts/sentence-highlight.js",
      "content_scripts/floating-ui": "./content_scripts/floating-ui.js",
      "options/options": "./options/options.js",
    },
    output: {
      path: path.resolve(__dirname, "dist"),
      filename: "[name].js",
    },
    plugins: [
      new CleanWebpackPlugin(),
      new webpack.DefinePlugin({
        // Make sure process.env is defined with fallbacks to prevent errors
        "process.env": {
          // Replace IS_DEBUG in the code with the appropriate value
          IS_DEBUG: JSON.stringify(!isProduction),
          VERSION: JSON.stringify(require("./package.json").version),
        },
      }),
      new CopyPlugin({
        patterns: [
          { from: "manifest.json", to: "manifest.json" },
          { from: "icons", to: "icons" },
          { from: "options/options.html", to: "options/options.html" },
          { from: "options/options.css", to: "options/options.css" },
        ],
      }),
    ],
    optimization: {
      minimize: isProduction,
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            compress: {
              // In production, dead code will be eliminated
              // So debug statements guarded by IS_DEBUG will be removed
              dead_code: true,
              drop_console: isProduction,
            },
          },
        }),
      ],
    },
  };
};
