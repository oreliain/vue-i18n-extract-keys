import path from "path";

export default {
  locales: ["en"],
  src: ["src/**/*.ts", "src/**/*.js", "src/**/*.vue"],
  output: path.join("i18n", "locales"),
  ignorePatterns: ["node_modules"],
  verbose: false,
  dryRun: false,
  withIndexFile: false,
  forceErase: false,
  logLevel: "success",
  keepKeys: false,
  json: false,
} as const;
