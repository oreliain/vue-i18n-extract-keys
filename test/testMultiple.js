const expect = require("chai").expect;
const fs = require("fs");
const path = require("path");
const Command = require("../src/Command");
const defaults = require("../src/defaults");

let command = null;

const srcDir = path.resolve(__dirname);
const outputDir = path.resolve(srcDir, "i18n", "locales");

mkpdir = dirPath => {
    if (!fs.existsSync(dirPath)) {
        mkpdir(path.dirname(dirPath));
        fs.mkdirSync(dirPath);
    }
};

before("Setup command", () => {
    mkpdir(outputDir);
    command = new Command(
        Object.assign({}, defaults, {
            locales: ["en", "fr"],
            src: ["test/src", "test/foo", "test/bar"],
            output: outputDir,
            sourcePatterns: defaults.sourcePatterns.map(s => new RegExp(s)),
            i18nPatterns: defaults.i18nPatterns.map(p => new RegExp(p, "g"))
        })
    );
});

describe("Source multiples", () => {
    describe("command.extractDirectories()", () => {
        it("should correctly extract directories keys", () => {
            const oracle = {
                messages: {
                    hello: {
                        fromVue: "messages.hello.fromVue",
                        fromJS: "messages.hello.fromJS",
                        fromTS: "messages.hello.fromTS"
                    }
                },
                foo: {
                    hey: {
                        fromVue: "foo.hey.fromVue",
                        fromJS: "foo.hey.fromJS",
                        fromTS: "foo.hey.fromTS"
                    }
                },
                bar: {
                    hi: {
                        fromVue: "bar.hi.fromVue",
                        fromJS: "bar.hi.fromJS",
                        fromTS: "bar.hi.fromTS"
                    }
                }
            };
            const filepath = lang => path.resolve(outputDir, lang + ".json");
            const parsedResult = command.execute();
            expect(fs.existsSync(filepath("en"))).to.be.true;
            expect(fs.existsSync(filepath("fr"))).to.be.true;
            console.log(outputDir);
            let fileContent = fs.readFileSync(
                path.resolve(outputDir, "en.json"),
                "utf8"
            );
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
