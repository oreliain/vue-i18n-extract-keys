const { expect } = require("chai");
const fs = require("fs");
const path = require("path");
const Command = require("../../src/Command");
const defaults = require("../../src/defaults");

const srcDir = path.resolve(__dirname);
const translationDir = path.join(srcDir, "translations");
const messagesDir = path.join(translationDir, "messages");
const outputDir = messagesDir;
let command = null;
const commandOptions = {
  ...defaults,
  locales: ["en", "fr"],
  output: outputDir,
  sourcePatterns: defaults.sourcePatterns.map((s) => new RegExp(s)),
  i18nPatterns: defaults.i18nPatterns.map((p) => new RegExp(p, "g")),
};

const mkpdir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    mkpdir(path.dirname(dirPath));
    fs.mkdirSync(dirPath);
  }
};

before("Setup command", () => {
  mkpdir(outputDir);
});

describe("Object separator", () => {
  describe("command.convertToObj()", () => {
    it("should preserve spaces", () => {
      commandOptions.src = ["test/objectSeparator/foo"];
      commandOptions.forceErase = true;
      command = new Command(commandOptions);
      const oracle = {
        login: {
          messages: {
            "Malheureusement, cette application n’est pas prise en charge par votre navigateur.":
              "Malheureusement, cette application n’est pas prise en charge par votre navigateur.",
            "Pour y accéder et vous connecter, veuillez utiliser Google Chrome (version":
              "Pour y accéder et vous connecter, veuillez utiliser Google Chrome (version",
          },
          // eslint-disable-next-line no-template-curly-in-string
          "Bienvenue sur ${console} l'interface de configuration EZAP4 de l'autre": {
            Test: "Test",
          },
        },
      };
      const filepath = (lang) => path.resolve(outputDir, `${lang}.json`);
      command.execute();
      expect(fs.existsSync(filepath("en"))).to.be.true;
      expect(fs.existsSync(filepath("fr"))).to.be.true;
      let fileContent = fs.readFileSync(path.resolve(outputDir, "en.json"), "utf8");
      if (fileContent) {
        fileContent = JSON.parse(fileContent);
      }
      expect(fileContent).is.eql(oracle);
    });
  });
});

after("Remove produce files", () => {
  if (process.version.match(/^v12\..*/)) {
    fs.rmdirSync(translationDir, { recursive: true });
  } else {
    fs.unlinkSync(path.join(messagesDir, "en.json"));
    fs.unlinkSync(path.join(messagesDir, "fr.json"));
    fs.rmdirSync(messagesDir);
    fs.rmdirSync(translationDir);
  }
});
