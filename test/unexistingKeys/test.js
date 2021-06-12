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
  locales: ["fr"],
  src: [path.join(srcDir, "foo")],
  output: outputDir,
  sourcePatterns: defaults.sourcePatterns.map((s) => new RegExp(s)),
  i18nPatterns: defaults.i18nPatterns.map((p) => new RegExp(p, "g")),
};

describe("Remove non existing keys", () => {
  it("should remove unexisting keys", () => {
    command = new Command(commandOptions);
    const oracle = {
      login: {
        messages: {
          "Malheureusement, cette application n’est pas prise en charge par votre navigateur.":
            "Malheureusement, cette application n’est pas prise en charge par votre navigateur.",
        },
        "Pour y accéder et vous connecter, veuillez utiliser Google Chrome (version":
          "Pour y accéder et vous connecter, veuillez utiliser Google Chrome (version",
        // eslint-disable-next-line no-template-curly-in-string
        "Bienvenue sur ${console} l'interface de configuration EZAP4 de l'autre": {
          Test: "Test",
        },
      },
    };
    const filepath = (lang) => path.resolve(outputDir, `${lang}.json`);
    command.execute();
    expect(fs.existsSync(filepath("fr"))).to.be.true;
    let fileContent = fs.readFileSync(path.resolve(outputDir, "fr.json"), "utf8");
    if (fileContent) {
      fileContent = JSON.parse(fileContent);
    }
    expect(fileContent).is.eql(oracle);
  });
});

after("Remove produce files", () => {
  const jsonFilePath = path.join(messagesDir, "fr.json");
  const tradFile = fs.readFileSync(jsonFilePath, "utf-8");
  const result = JSON.parse(tradFile);
  result.login["unknown ref"] = "unknown ref";
  fs.writeFileSync(jsonFilePath, JSON.stringify(result, null, 2));
});
