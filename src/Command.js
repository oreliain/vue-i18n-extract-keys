require("colors");
const signale = require("signale");
const fs = require("fs");
const diff = require("diff");
const path = require("path");
const options = require("./options");

module.exports = class Command {
  constructor(args) {
    Object.keys(options).forEach((k) => {
      this[k] = args[k];
    });
  }

  /**
   * Log function
   * @param {string} type
   * @param  {...any} messages
   */
  log(type, ...messages) {
    if (this.dryRun || this.verbose) {
      signale[type](...messages);
    }
  }

  /**
   * Deeply merge several objects
   * @param {object} oldObj
   * @param  {...object} newObj
   */
  deepMerge(oldObj = {}, ...newObj) {
    const result = oldObj;
    newObj.forEach((obj) => {
      if (obj && typeof obj === "object") {
        Object.keys(obj).forEach((key) => {
          if (obj[key] && typeof obj[key] === "object") {
            result[key] = this.deepMerge({}, result[key], obj[key]);
          } else {
            result[key] = obj[key];
          }
        });
      }
    });
    return result;
  }

  /**
   * Add new keys and remove unexisting keys
   * @param {Object} existingLocales
   * @param {Object} newLocales
   */
  addAndCleanMessages(existingLocales = {}, newLocales) {
    const result = {};
    if (newLocales && typeof newLocales === "object") {
      Object.keys(newLocales).forEach((localeKey) => {
        if (!existingLocales[localeKey]) {
          // the key is newly added, so just add it
          result[localeKey] = newLocales[localeKey];
        } else if (newLocales[localeKey] && typeof newLocales[localeKey] === "object") {
          // do recursive job
          result[localeKey] = this.addAndCleanMessages(existingLocales[localeKey], newLocales[localeKey]);
        } else {
          // the key value already exist, do not erase it, so copy it in result
          result[localeKey] = existingLocales[localeKey];
        }
      });
    }
    return result;
  }

  /**
   * Convert a key string to its object representation
   * @param {string} keyPath
   */
  static convertToObj(keyPath = "") {
    const customSplit = (str) => {
      const splitChar = "<&_oreliain|:>";
      const toSplit = str.replace(/\S\.\S/g, (match) => {
        if (match) {
          return match.replace(".", splitChar);
        }
        return "";
      });
      return toSplit.split(splitChar);
    };
    if (!keyPath) {
      return {};
    }
    return customSplit(keyPath)
      .reverse()
      .reduce((prev, curr) => ({ [curr]: prev !== null ? prev : curr }), null);
  }

  /**
   * Check if a path is matched by patterns
   * @param {string} itemPath
   */
  checkPath(itemPath) {
    let result = false;
    let i = 0;
    // while loop for lazy search
    while (i < this.sourcePatterns.length && !result) {
      const pattern = this.sourcePatterns[i];
      result = pattern.test(itemPath);
      i += 1;
    }
    return result;
  }

  /**
   * Parse a file and extract its keys
   * @param {string} filePath
   * @return {object} keys
   */
  parseFile(filePath) {
    const fileContent = fs.readFileSync(filePath, "utf8");
    let result = {};
    if (fileContent) {
      this.i18nPatterns.forEach((pattern) => {
        let execResult = pattern.exec(fileContent);
        while (execResult) {
          if (
            execResult &&
            execResult.groups &&
            (execResult.groups.double || execResult.groups.simple || execResult.groups.back)
          ) {
            const key = execResult.groups.double || execResult.groups.simple || execResult.groups.back;
            if (key) {
              this.log("info", `\t\t 🔑 key "${key}" found`);
              result = this.deepMerge({}, result, Command.convertToObj(key));
            }
          }
          execResult = pattern.exec(fileContent);
        }
      });
    }
    return result;
  }

  /**
   * Extract keys from a directory
   * @param {string} dirPath
   * @return {object} keys
   */
  extractDirectory(dirPath) {
    let messages = {};
    const files = fs.readdirSync(dirPath);
    if (files && files.length) {
      this.log("info", "Entering in", dirPath);
      files.forEach((f) => {
        const completePath = path.join(dirPath, f);
        if (fs.statSync(completePath).isDirectory()) {
          messages = this.deepMerge({}, messages, this.extractDirectory(completePath));
        } else if (this.checkPath(completePath)) {
          this.log("info", `\t• Parsing "${f}"`);
          messages = this.deepMerge({}, messages, this.parseFile(completePath));
        } else {
          this.log("warn", `\t• "${f}" does not match the filename capturing pattern`);
        }
      });
    }
    return messages;
  }

  /**
   * Extract keys from a directory
   * @return {object} keys
   * @param {Array<string> | string} dirPaths
   */
  extractDirectories(dirPaths) {
    if (typeof dirPaths === "string") {
      return this.extractDirectory(dirPaths);
    }
    let messages = {};
    dirPaths.forEach((dirPath) => {
      messages = this.deepMerge(messages, this.extractDirectory(dirPath));
    });
    return messages;
  }

  /**
   * Write locales assets files.
   * @param {object} localesMsg
   */
  writeToFile(localesMsg) {
    const finalObject = {};
    this.locales.forEach((lang) => {
      const localeFile = path.join(this.output, `${lang}.json`);
      finalObject[lang] = {};
      let compareRef = {};
      if (fs.existsSync(localeFile) && !this.forceErase) {
        const fileContent = fs.readFileSync(localeFile, "utf8");
        compareRef = JSON.parse(fileContent);
        finalObject[lang] = JSON.parse(fileContent);
        if (this.keepKeys) {
          finalObject[lang] = this.deepMerge({}, localesMsg, finalObject[lang]);
        } else {
          finalObject[lang] = this.addAndCleanMessages(finalObject[lang], localesMsg);
        }
      } else {
        finalObject[lang] = this.deepMerge({}, localesMsg, finalObject[lang]);
      }
      if (!this.dryRun) {
        this.log("success", `Writing file for locale "${lang}" to "${localeFile}"`);
        fs.writeFileSync(localeFile, JSON.stringify(finalObject[lang], null, 2));
      }
      const diffs = diff.diffJson(compareRef, finalObject[lang]);
      const addedKeys = diffs.filter((part) => !!part.added).length;
      const removedKeys = diffs.filter((part) => !!part.removed).length;
      signale.info(`${localeFile + ` : + ${addedKeys} keys added`.green}, ${`- ${removedKeys} keys removed`.red}`);
      if (this.showDiff) {
        this.log("info", `Differences for the locale file "${localeFile}" :\n`);

        diffs.forEach((part) => {
          // green for additions, red for deletions
          // grey for common parts
          // eslint-disable-next-line no-nested-ternary
          const color = part.added ? "green" : part.removed ? "red" : "white";
          process.stdout.write(part.value[color]);
        });
        console.log("\n");
      }
    });
    if (this.withIndexFile) {
      const indexFile = path.join(this.output, "index.js");
      const content = this.locales.map((l) => `\t${l}: require("./${l}.json")`).join(",\n");
      const indexContent = `module.exports = {\n${content}\n};\n`;
      if (!this.dryRun) {
        this.log("info", `Writing index file to "${indexFile}"`);
        fs.writeFileSync(indexFile, indexContent);
      }
    }
  }

  execute() {
    // Begin execution
    signale.time("Extract i18n keys");
    this.log("start", "Start keys extraction");
    const messages = this.extractDirectories(this.src);
    this.writeToFile(messages);
    this.log("complete", "Extraction completed");
    signale.timeEnd("Extract i18n keys");
  }
};
