const path = require("path");

module.exports = {
  locales: ["en"],
  src: ["src"],
  output: path.join("i18n", "locales"),
  sourcePatterns: ["\\.vue$", "\\.ts(x)?$", "\\.js(x)?$"],
  i18nPatterns: [
    /\$t[ce]?(?:(?:\('(?<simple>.*?)'(?:,.*)?\))|(?:\("(?<double>.*?)"(?:,.*)?\))|(?:\(`(?<back>.*?)`(?:,.*)?\)))/gm,
  ],
  verbose: false,
  dryRun: false,
  showDiff: false,
  withIndexFile: false,
  forceErase: false,
  keepKeys: false,
};
