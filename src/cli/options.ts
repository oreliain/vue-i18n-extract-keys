import fs from "fs";
import path from "path";
import defaults from "./defaults";
import yargs from "yargs";
import glob from "glob";

const PROJECT_DIR = process.env.PWD as string;

const options = {
  locales: {
    alias: "l",
    type: "array",
    description: "List of generated locale",
    default: defaults.locales,
  },
  src: {
    alias: "s",
    type: "array",
    description: "Source globs to analyze",
    default: defaults.src,
  },
  ignorePatterns: {
    alias: "i",
    type: "array",
    description: "Patterns to ignore",
  },
  output: {
    alias: "o",
    type: "string",
    description: "Target directory to write file",
    coerce: (value: string) => {
      const completePath = path.join(PROJECT_DIR, value);
      if (!fs.existsSync(completePath) || !fs.statSync(completePath).isDirectory()) {
        throw new Error(`Argument '${completePath}' must be a valid existing directory`);
      }
      return completePath;
    },
    default: defaults.output,
  },
  verbose: {
    type: "boolean",
    description: "Verbose mode",
    default: defaults.verbose,
  },
  dryRun: {
    type: "boolean",
    description: "Dry run mode",
    default: defaults.dryRun,
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
  json: {
    type: "boolean",
    description: "Output json format",
    default: defaults.keepKeys,
  },
} as const;

export type CommandArgumentsType = yargs.InferredOptionTypes<typeof options>;
export type CommandArguments = yargs.Arguments<CommandArgumentsType>;
export default options;
