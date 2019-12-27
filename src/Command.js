const yargs = require("yargs");
const signale = require("signale");
const fs = require("fs");
const path = require("path");
const options = require("./options");

module.exports = class Command {
  constructor(args) {
    Object.keys(options).forEach(k => {
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
    newObj.forEach(obj => {
      if (obj && typeof obj === "object") {
        Object.keys(obj).forEach(key => {
          if (obj[key] && typeof obj[key] === "object") {
            result[key] = this.deepMerge(
              {},
              result[key],
              obj[key]
            );
          } else {
            result[key] = obj[key];
          }
        });
      }
    });
    return result;
  }

  /**
   * Convert a key string to its object representation
   * @param {string} str
   */
  convertToObj(str) {
    if (!str) {
      return {};
    }
    return str
      .split(".")
      .reverse()
      .reduce((prev, curr) => {
        return { [curr]: prev };
      }, str);
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
      i++;
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
      const trimContent = fileContent.replace(/\s/g, "");
      this.i18nPatterns.forEach(pattern => {
        let execResult = null;
        while ((execResult = pattern.exec(trimContent))) {
          if (execResult && execResult.length > 1) {
            this.log(
              "success",
              "Found key",
              execResult[1],
              "in",
              execResult[0]
            );
            result = this.deepMerge(
              {},
              result,
              this.convertToObj(execResult[1])
            );
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
      files.forEach(f => {
        const completePath = path.join(dirPath, f);
        if (fs.statSync(completePath).isDirectory()) {
          messages = this.deepMerge(
            {},
            messages,
            this.extractDirectory(completePath)
          );
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
   * Write locales assets files.
   * @param {object} localesMsg
   */
  writeToFile(localesMsg) {
    const finalObject = {};
    this.locales.forEach(lang => {
      const localeFile = path.join(this.output, `${lang}.json`);
      finalObject[lang] = {};
      if (fs.existsSync(localeFile) && !this.forceErase) {
        const fileContent = fs.readFileSync(localeFile, "utf8");
        finalObject[lang] = JSON.parse(fileContent);
      }
      finalObject[lang] = this.deepMerge({}, finalObject[lang], localesMsg);
      fs.writeFileSync(localeFile, JSON.stringify(finalObject[lang], null, 2));
    });
    if (this.withIndexFile) {
      const indexFile = path.join(this.output, "index.js");
      const content = this.locales
        .map(l => `\t${l}: require("./${l}.json")`)
        .join(",\n");
      const indexContent = `module.exports = {\n${content}\n};\n`;
      fs.writeFileSync(indexFile, indexContent);
    }
  }

  execute() {
    // Begin execution
    signale.time("Extract i18n keys");
    this.log("start", "Start parsing files");
    const messages = this.extractDirectory(this.src);
    this.writeToFile(messages);
    this.log("complete", "Locale assets generated !");
    signale.timeEnd("Extract i18n keys");
  }
};
