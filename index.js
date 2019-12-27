#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const yargs = require("yargs");
const signale = require("signale");

const defaults = require("./defaults");
const PROJECT_DIR = process.env.PWD;

const argv = yargs
  .option("locales", {
    alias: "l",
    type: "array",
    description: "List of generated locale",
    default: defaults.locales
  })
  .option("src", {
    alias: "s",
    type: "string",
    description: "Source dir to analyze",
    coerce: value => {
      const completePath = path.join(PROJECT_DIR, value);
      if (
        !fs.existsSync(completePath) ||
        !fs.statSync(completePath).isDirectory()
      ) {
        throw new Error(
          `Argument '${completePath}' must be a valid existing directory`
        );
      }
      return completePath;
    },
    default: defaults.src
  })
  .option("output", {
    alias: "o",
    type: "string",
    description: "Target directory to write file",
    coerce: value => {
      const completePath = path.join(PROJECT_DIR, defaults.src, value);
      if (
        !fs.existsSync(completePath) ||
        !fs.statSync(completePath).isDirectory()
      ) {
        throw new Error(
          `Argument '${completePath}' must be a valid existing directory`
        );
      }
      return completePath;
    },
    default: defaults.output
  })
  .option("sourcePatterns", {
    alias: "p",
    type: "array",
    description: "RegExp pattern for sources files to analyze",
    coerce: value => value.map(v => new RegExp(v)),
    default: defaults.sourcePatterns
  })
  .option("i18nPatterns", {
    alias: "i",
    type: "array",
    description: "i18n functions patterns",
    coerce: value => value.map(v => new RegExp(v, "g")),
    default: defaults.i18nPatterns
  })
  .option("verbose", {
    alias: "v",
    type: "boolean",
    description: "Verbose mode",
    default: defaults.verbose
  })
  .option("withIndexFile", {
    alias: "x",
    type: "boolean",
    description: "Generate an index file to import all locales messages",
    default: defaults.withIndexFile
  })
  .option("forceErase", {
    alias: "e",
    type: "boolean",
    description: "Does not merge output files. Erase it instead.",
    default: defaults.forceErase
  }).argv;

const langList = argv.locales;
const sourcePath = argv.src;
const destinationPath = argv.output;
const filePatterns = argv.sourcePatterns;
const i18nPatterns = argv.i18nPatterns;

/**
 * Log function
 * @param {string} type
 * @param  {...any} messages
 */
const log = (type, ...messages) => {
  if (argv.verbose) {
    signale[type](...messages);
  }
};

/**
 * Deeply merge several objects
 * @param {object} oldObj
 * @param  {...object} newObj
 */
const deepMerge = (oldObj, ...newObj) => {
  const result = {};
  newObj.forEach(obj => {
    if (obj && typeof obj === "object") {
      Object.keys(obj).forEach(key => {
        if (obj[key] && typeof obj[key] === "object") {
          result[key] = deepMerge({}, result[key], oldObj[key], obj[key]);
        } else {
          result[key] = obj[key];
        }
      });
    }
  });
  return result;
};

/**
 * Convert a key string to its object representation
 * @param {string} str
 */
const convertToObj = str => {
  return str
    .split(".")
    .reverse()
    .reduce((prev, curr) => {
      return { [curr]: prev };
    }, str);
};

/**
 * Check if a path is matched by patterns
 * @param {string} itemPath
 */
const checkPath = itemPath => !!filePatterns.find(p => p.test(itemPath));

/**
 * Parse a file and extract its keys
 * @param {string} filePath
 * @return {object} keys
 */
const parseFile = filePath => {
  const fileContent = fs.readFileSync(filePath, "utf8");
  let result = {};
  if (fileContent) {
    log("pending", "Parse file", filePath);
    const trimContent = fileContent.replace(/\s/g, "");
    i18nPatterns.forEach(pattern => {
      let execResult = null;
      while ((execResult = pattern.exec(trimContent))) {
        if (execResult && execResult.length > 1) {
          log("success", "Found key", execResult[1], "in", execResult[0]);
          result = deepMerge({}, result, convertToObj(execResult[1]));
        }
      }
    });
  }
  return result;
};

/**
 * Extract keys from a directory
 * @param {string} dirPath
 * @return {object} keys
 */
const extractDirectory = dirPath => {
  let messages = {};
  const files = fs.readdirSync(dirPath);
  if (files && files.length) {
    log("success", "Entering in", dirPath);
    files.forEach(f => {
      const completePath = path.join(dirPath, f);
      if (fs.statSync(completePath).isDirectory()) {
        messages = deepMerge({}, messages, extractDirectory(completePath));
      } else if (checkPath(completePath)) {
        log("success", "Matching path", completePath);
        messages = deepMerge({}, messages, parseFile(completePath));
      } else {
        log("warn", "Not matching path", completePath);
      }
    });
  }
  return messages;
};

/**
 * Write locales assets files.
 * @param {object} localesMsg
 */
const writeToFile = localesMsg => {
  const finalObject = {};
  langList.forEach(lang => {
    const localeFile = path.join(destinationPath, `${lang}.json`);
    finalObject[lang] = {};
    if (fs.existsSync(localeFile) && !argv.forceErase) {
      const fileContent = fs.readFileSync(localeFile, "utf8");
      finalObject[lang] = JSON.parse(fileContent);
    }
    finalObject[lang] = deepMerge({}, finalObject[lang], localesMsg);
    fs.writeFileSync(localeFile, JSON.stringify(finalObject[lang], null, 2));
  });
  if (argv.withIndexFile) {
    const indexFile = path.join(destinationPath, "index.js");
    const content = langList
      .map(l => `\t${l}: require("./${l}.json")`)
      .join(",\n");
    const indexContent = `module.exports = {\n${content}\n};\n`;
    fs.writeFileSync(indexFile, indexContent);
  }
};

// Begin execution
signale.time("Extract i18n keys");
log("start", "Start parsing files");
const messages = extractDirectory(sourcePath);
writeToFile(messages);
log("complete", "Locale assets generated !");
signale.timeEnd("Extract i18n keys");
