import signale from "signale";
import fsp from "fs/promises";
import fs from "fs";
import path from "path";
import CommandInterface from "./CommandInterface";
import { CommandArguments } from "./options";
import glob from "glob";
import { promisify } from "util";

const globPromise = promisify(glob);

export default class Command implements CommandInterface {
  protected static I18N_PATTERN =
    /\$t[ce]?(?:(?:\('(?<simple>.*?)'(?:,.*)?\))|(?:\("(?<double>.*?)"(?:,.*)?\))|(?:\(`(?<back>.*?)`(?:,.*)?\)))/gm;
  protected options: CommandArguments;
  protected sourceFiles: string[] = [];
  protected countKeys = {
    added: 0,
    removed: 0,
    updated: 0,
    nonExisting: 0,
  };
  protected enableCount = false;

  constructor(options: CommandArguments) {
    this.options = options;
  }

  /**
   * Deeply merge several objects
   * @param {object} oldObj
   * @param  {...object} newObj
   */
  deepMerge(oldObj: any = {}, ...newObj: any[]) {
    const result = oldObj;
    newObj.forEach((obj) => {
      if (obj && typeof obj === "object") {
        Object.keys(obj).forEach((key) => {
          if (obj[key] && typeof obj[key] === "object") {
            result[key] = this.deepMerge({}, result[key], obj[key]);
          } else {
            if (this.enableCount && !result[key]) {
              this.countKeys.added++;
            }
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
  deepIntersect(oldObj: any = {}, ...newObj: any[]) {
    // first object is reference
    const result = oldObj;
    const oldKeysRef = Object.keys(result);
    let keysToKeep: string[] = [];
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
    return Object.keys(result).reduce((acc: any, curr: string) => {
      if (keysToKeep.indexOf(curr) > -1) {
        if (this.enableCount && acc[curr] !== result[curr]) {
          this.countKeys.updated++;
        }
        acc[curr] = result[curr];
      } else if (oldKeysRef.indexOf(curr) === -1) {
        if (this.enableCount) {
          this.countKeys.added++;
        }
        this.verbose(`\t+ add key "${curr}`);
        acc[curr] = result[curr];
      } else {
        if (this.enableCount) {
          this.countKeys.removed++;
        }
        this.verbose(`\t- remove key "${curr}`);
      }
      return acc;
    }, {});
  }

  /**
   * Convert a key string to its object representation
   * @param {string} keyPath
   */
  static convertToObj(keyPath = "") {
    const customSplit = (str: string) => {
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
      .reduce((prev: any, curr: string) => ({ [curr]: prev !== null ? prev : curr }), null);
  }

  verbose(message: any): void {
    if (this.options.verbose || this.options.dryRun) {
      signale.info(message);
    }
  }
  debug(message: any): void {
    if (this.options.dryRun || this.options.logLevel.includes("debug") || this.options.logLevel.includes("all")) {
      signale.debug(message);
    }
  }
  error(message: any): void {
    signale.error(message);
  }
  success(message: any): void {
    signale.success(message);
  }

  /**
   * Resolve glob source patterns
   *  @returns {string[]} source files paths
   */
  async getSourceFiles(): Promise<string[]> {
    if (this.sourceFiles.length === 0) {
      this.sourceFiles = await this.options.src.reduce((acc: Promise<string[]>, srcGlob) => {
        return acc.then((values) => {
          return globPromise(srcGlob, { realpath: true, ignore: this.options.ignorePatterns as string[] }).then(
            (files) => {
              const realFiles = (filesPaths: string[]) => {
                const result: string[] = [];
                filesPaths.forEach((f) => {
                  const stat = fs.statSync(f);
                  if (stat.isFile()) {
                    result.push(f);
                  }
                });
                return result;
              };
              return [...values, ...realFiles(files)];
            }
          );
        });
      }, Promise.resolve([]));
    }
    return this.sourceFiles;
  }

  /**
   * Write locales assets files.
   * @param {object} localesMsg
   */
  writeToFile(localesMsg: any) {
    const finalObject: any = {};
    this.options.locales.forEach((lang) => {
      const localeFile = path.join(this.options.output, `${lang}.json`);
      finalObject[lang] = {};
      this.enableCount = true;
      if (fs.existsSync(localeFile) && !this.options.forceErase) {
        const fileContent = fs.readFileSync(localeFile, "utf8");
        finalObject[lang] = JSON.parse(fileContent);
        if (this.options.keepKeys) {
          finalObject[lang] = this.deepMerge({}, localesMsg, finalObject[lang]);
        } else {
          finalObject[lang] = this.deepIntersect(finalObject[lang], localesMsg);
        }
      } else {
        finalObject[lang] = this.deepMerge({}, localesMsg, finalObject[lang]);
      }
      this.enableCount = false;
      if (!this.options.dryRun) {
        fs.writeFileSync(localeFile, JSON.stringify(finalObject[lang], null, 2));
      }
    });
    if (this.options.withIndexFile) {
      const indexFile = path.join(this.options.output, "index.js");
      const content = this.options.locales.map((l) => `\t${l}: require("./${l}.json")`).join(",\n");
      const indexContent = `module.exports = {\n${content}\n};\n`;
      this.verbose(`write index file to "${indexFile}`);
      if (!this.options.dryRun) {
        fs.writeFileSync(indexFile, indexContent);
      }
    }
  }

  async execute() {
    try {
      const files = await this.getSourceFiles();
      let messages = {};
      let keyCount = 0;
      await Promise.all(
        files.map(async (filepath) => {
          const fileContent = await fsp.readFile(filepath, "utf8");
          this.verbose(`Parse "${filepath}"`);
          let matches = Command.I18N_PATTERN.exec(fileContent);
          while (matches) {
            if (matches && matches.groups && (matches.groups.double || matches.groups.simple || matches.groups.back)) {
              const key = matches.groups.double || matches.groups.simple || matches.groups.back;
              if (key) {
                keyCount++;
                this.verbose(`\t• found key "${key}"`);
                messages = this.deepMerge({}, messages, Command.convertToObj(key));
              }
            }
            matches = Command.I18N_PATTERN.exec(fileContent);
          }
        })
      );
      this.verbose(`write json file`);
      this.writeToFile(messages);

      if (this.options.json) {
        console.log(JSON.stringify(messages, null, 2));
      } else {
        this.success(
          `${files.length} files parsed, ${keyCount} keys found (${this.countKeys.added} added, ${this.countKeys.removed} removed)`
        );
      }
    } catch (err) {
      this.error(err.message);
    }
  }
}
