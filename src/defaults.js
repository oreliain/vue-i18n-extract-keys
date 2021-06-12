const path = require("path");

module.exports = {
  locales: ["en"],
  src: ["src"],
  output: path.join("i18n", "locales"),
  sourcePatterns: ["\\.vue$", "\\.ts(x)?$", "\\.js(x)?$"],
  i18nPatterns: [`\\$t[ce]?\\(["'\`](.*)["'\`].*?\\)`],
  verbose: false,
  withIndexFile: false,
  forceErase: false,
  logLevel: "success",
  keepKeys: false,
};
