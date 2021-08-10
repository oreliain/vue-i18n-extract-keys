const path = require("path");

module.exports = {
  locales: ["en"],
  src: ["src"],
  output: path.join("i18n", "locales"),
  sourcePatterns: ["\\.vue$", "\\.ts(x)?$", "\\.js(x)?$"],
  i18nPatterns: [
    /\$t[ce]?(?:(?:\(\s*'(?<simple>.*?)'\s*(?:,.*)?\))|(?:\(\s*"(?<double>.*?)"\s*(?:,.*)?\))|(?:\(`\s*(?<back>.*?)`\s*(?:,.*)?\)))/gm,
  ],
  verbose: false,
  dryRun: false,
  showDiff: false,
  withIndexFile: false,
  forceErase: false,
  keepKeys: false,
};
