const path = require("path");

module.exports = {
    locales: ["en"],
    src: "src",
    output: path.join("i18n", "locales"),
    sourcePatterns: ["\\.vue$", "\\.component\\.ts$"],
    i18nPatterns: [`\\$t\\(["']([\\w-\\.]+)["'][,\\w'" ]*\\)`],
    verbose: false,
    withIndexFile: false,
    forceErase: false
}