const signale = require("signale");
const fs = require("fs");
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
    if (this.verbose && (type === this.logLevel || this.logLevel === "all")) {
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
   * Deeply intersect several objects
   * @param {object} oldObj
   * @param  {...object} newObj
   */
  deepIntersect(oldObj = {}, ...newObj) {
    // first object is reference
    const result = oldObj;
    const oldKeysRef = Object.keys(result);
    let keysToKeep = [];
    // walk through objects to merge
    newObj.forEach((obj) => {
      if (obj && typeof obj === "object") {
        // keep keys from obj to merge that is already in ref object
        keysToKeep = keysToKeep.concat(Object.keys(oldObj).filter((k) => !!obj[k]));
        // do the merge (intersect recursively)
        Object.keys(obj).forEach((key) => {
          if (obj[key] && typeof obj[key] === "object") {
            result[key] = this.deepIntersect(result[key], obj[key]);
          } else {
            result[key] = obj[key];
          }
        });
      }
    });
    // return object with keys either being key to keep or not being in the ref object
    return Object.keys(result).reduce((acc, curr) => {
      if (keysToKeep.indexOf(curr) > -1 || oldKeysRef.indexOf(curr) === -1) {
        acc[curr] = result[curr];
      }
      return acc;
    }, {});
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
      this.log("pending", "Parse file", filePath);
      this.i18nPatterns.forEach((pattern) => {
        let execResult = null;
        // eslint-disable-next-line no-cond-assign
        while ((execResult = pattern.exec(fileContent))) {
          if (execResult && execResult.length > 1) {
            this.log("success", "Found key", execResult[1], "in", execResult[0]);
            result = this.deepMerge({}, result, Command.convertToObj(execResult[1]));
          }
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
      this.log("success", "Entering in", dirPath);
      files.forEach((f) => {
        const completePath = path.join(dirPath, f);
        if (fs.statSync(completePath).isDirectory()) {
          messages = this.deepMerge({}, messages, this.extractDirectory(completePath));
        } else if (this.checkPath(completePath)) {
          this.log("success", "Matching path", completePath);
          messages = this.deepMerge({}, messages, this.parseFile(completePath));
        } else {
          this.log("warn", "Not matching path", completePath);
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
      if (fs.existsSync(localeFile) && !this.forceErase) {
        const fileContent = fs.readFileSync(localeFile, "utf8");
        finalObject[lang] = JSON.parse(fileContent);
        if (this.keepKeys) {
          finalObject[lang] = this.deepMerge({}, localesMsg, finalObject[lang]);
        } else {
          finalObject[lang] = this.deepIntersect(finalObject[lang], localesMsg);
        }
      } else {
        finalObject[lang] = this.deepMerge({}, localesMsg, finalObject[lang]);
      }
      fs.writeFileSync(localeFile, JSON.stringify(finalObject[lang], null, 2));
    });
    if (this.withIndexFile) {
      const indexFile = path.join(this.output, "index.js");
      const content = this.locales.map((l) => `\t${l}: require("./${l}.json")`).join(",\n");
      const indexContent = `module.exports = {\n${content}\n};\n`;
      fs.writeFileSync(indexFile, indexContent);
    }
  }

  execute() {
    // Begin execution
    signale.time("Extract i18n keys");
    this.log("start", "Start parsing files");
    const messages = this.extractDirectories(this.src);
    this.writeToFile(messages);
    this.log("complete", "Locale assets generated !");
    signale.timeEnd("Extract i18n keys");
  }
};
