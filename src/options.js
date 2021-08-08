const fs = require("fs");
const path = require("path");
const defaults = require("./defaults");

const PROJECT_DIR = process.env.PWD;

module.exports = {
  locales: {
    alias: "l",
    type: "array",
    description: "List of generated locale",
    default: defaults.locales,
  },
  src: {
    alias: "s",
    type: "array",
    description: "Source directories to analyze",
    coerce: (value) => {
      const coercedValues = value.map((v) => {
        const completePath = path.join(PROJECT_DIR, v);
        if (!fs.existsSync(completePath) || !fs.statSync(completePath).isDirectory()) {
          throw new Error(`Argument '${completePath}' must be a valid existing directory`);
        }
        return completePath;
      });
      return coercedValues;
    },
    default: defaults.src,
  },
  output: {
    alias: "o",
    type: "string",
    description: "Target directory to write file",
    coerce: (value) => {
      const completePath = path.join(PROJECT_DIR, value);
      if (!fs.existsSync(completePath) || !fs.statSync(completePath).isDirectory()) {
        throw new Error(`Argument '${completePath}' must be a valid existing directory`);
      }
      return completePath;
    },
    default: defaults.output,
  },
  sourcePatterns: {
    alias: "p",
    type: "array",
    description: "RegExp pattern for sources files to analyze",
    coerce: (value) => value.map((v) => new RegExp(v)),
    default: defaults.sourcePatterns,
  },
  i18nPatterns: {
    alias: "i",
    type: "array",
    description: "i18n functions patterns",
    coerce: (value) =>
      value.map((v) => {
        if (typeof v === "string") {
          return new RegExp(v, "gm");
        }
        return v;
      }),
    default: defaults.i18nPatterns,
  },
  verbose: {
    alias: "v",
    type: "boolean",
    description: "Verbose mode",
    default: defaults.verbose,
  },
  withIndexFile: {
    alias: "x",
    type: "boolean",
    description: "Generate an index file to import all locales messages",
    default: defaults.withIndexFile,
  },
  forceErase: {
    alias: "e",
    type: "boolean",
    description: "Does not merge output files. Erase it instead.",
    default: defaults.forceErase,
  },
  logLevel: {
    type: "string",
    choices: ["warn", "success", "error", "debug", "all"],
    default: defaults.logLevel,
  },
  keepKeys: {
    alias: "k",
    type: "boolean",
    description: "Keep non existing keys in the final result",
    default: defaults.keepKeys,
  },
};
