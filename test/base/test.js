const { expect } = require("chai");
const fs = require("fs");
const path = require("path");
const Command = require("../../src/Command");
const defaults = require("../../src/defaults");

let command = null;

const srcDir = path.resolve(__dirname, "src");
const outputDir = path.resolve(srcDir, "i18n", "locales");

const mkpdir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    mkpdir(path.dirname(dirPath));
    fs.mkdirSync(dirPath);
  }
};

before("Setup command", () => {
  mkpdir(outputDir);
  command = new Command({
    ...defaults,
    locales: ["en", "fr"],
    src: srcDir,
    output: outputDir,
    sourcePatterns: defaults.sourcePatterns.map((s) => new RegExp(s)),
    i18nPatterns: defaults.i18nPatterns.map((p) => new RegExp(p, "g")),
  });
});

describe("Utils functions", () => {
  describe("#deepMerge", () => {
    it("should return {} when passing no args", () => {
      const result = JSON.stringify(command.deepMerge());
      expect(result).is.equal("{}");
    });
    it("should return exactly first argument when passing only one arg", () => {
      const oracle = { a: "b", b: { c: "e" } };
      const result = command.deepMerge(oracle);
      expect(result).is.equal(oracle);
    });
    it("should merge in first argument", () => {
      const foo = { a: "a", b: { c: "c", d: { e: "e" }, e: { f: "f" } } };
      const bar = {
        c: "c",
        b: { c: "c1", d: { f: "f", g: { h: "h" } }, e: "e" },
      };
      const oracle = {
        a: "a",
        c: "c",
        b: { c: "c1", d: { e: "e", f: "f", g: { h: "h" } }, e: "e" },
      };
      command.deepMerge(foo, bar);
      expect(foo).is.deep.equal(oracle);
    });
    it("should return deep copy of result when passing first {} as first arg", () => {
      const foo = { a: "a", b: { c: "c", d: { e: "e" }, e: { f: "f" } } };
      const result = command.deepMerge({}, foo);
      expect(result).to.eql(foo).but.not.equal(foo);
    });
  });

  describe("#convertToObj", () => {
    it("should return {} when passing '' or no args", () => {
      const r1 = Command.convertToObj();
      const r2 = Command.convertToObj("");
      expect(r1).is.eql({});
      expect(r2).is.eql({});
    });
    it("should return expected result", () => {
      const result = Command.convertToObj("foo.bar.other.message");
      const oracle = {
        foo: { bar: { other: { message: "message" } } },
      };
      const result2 = Command.convertToObj("foo");
      const oracle2 = { foo: "foo" };
      expect(result).is.eql(oracle);
      expect(result2).is.eql(oracle2);
    });
  });

  describe("#checkPath", () => {
    it("should return expected result", () => {
      expect(command.checkPath(path.resolve(srcDir, "foo", "bar.vue"))).to.be.true;
      expect(command.checkPath(path.resolve(srcDir, "foo", "bar.ts"))).to.be.true;
      expect(command.checkPath(path.resolve(srcDir, "foo", "bar.html"))).to.be.false;
      expect(command.checkPath(path.resolve(srcDir, "foo", "bar.css"))).to.be.false;
      expect(command.checkPath(path.resolve(srcDir, "foo", "bar.js"))).to.be.true;
      expect(command.checkPath(path.resolve(srcDir, "foo", "bar.jsx"))).to.be.true;
      expect(command.checkPath(path.resolve(srcDir, "foo", "bar.t"))).to.be.false;
      expect(command.checkPath(path.resolve(srcDir, "foo", "bar.j"))).to.be.false;
    });
  });
});

describe("Files functions", () => {
  describe("command.parseFile()", () => {
    it("should correctly extract file keys", () => {
      const oracle = {
        "message with spaces": { hello: { fromVue: "fromVue" } },
      };
      const getFilePath = (name) => path.resolve(srcDir, name);
      const parsedResult = command.parseFile(getFilePath("foo.vue"));
      expect(parsedResult).is.eql(oracle);
    });
    it("should return {} if there are no translations", () => {
      const oracle = {};
      const getFilePath = (name) => path.resolve(srcDir, name);
      const parsedResult = command.parseFile(getFilePath("empty.js"));
      expect(parsedResult).is.eql(oracle);
    });
  });
  describe("command.extractDirectory", () => {
    it("should correctly extract directory keys", () => {
      const oracle = {
        "message with spaces": {
          hello: {
            fromVue: "fromVue",
            fromJS: "fromJS",
            fromTS: "fromTS",
          },
        },
        namespace: {
          "L'apostrophe du message doit être correcte.": "L'apostrophe du message doit être correcte.",
        },
      };
      const parsedResult = command.extractDirectory(srcDir);
      expect(parsedResult).is.eql(oracle);
    });
  });
  describe("command.writeFile", () => {
    it("should correctly write asset file", () => {
      const oracle = {
        "message with spaces": {
          hello: {
            fromVue: "fromVue",
            fromJS: "fromJS",
            fromTS: "fromTS",
          },
        },
        namespace: {
          "L'apostrophe du message doit être correcte.": "L'apostrophe du message doit être correcte.",
        },
      };
      const parsedResult = command.extractDirectory(srcDir);
      const filepath = (lang) => path.resolve(outputDir, `${lang}.json`);
      command.writeToFile(parsedResult);
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
    fs.rmdirSync(path.resolve(srcDir, "i18n"), { recursive: true });
  } else {
    fs.unlinkSync(path.resolve(srcDir, "i18n", "locales", "en.json"));
    fs.unlinkSync(path.resolve(srcDir, "i18n", "locales", "fr.json"));
    fs.rmdirSync(path.resolve(srcDir, "i18n", "locales"));
    fs.rmdirSync(path.resolve(srcDir, "i18n"));
  }
});
