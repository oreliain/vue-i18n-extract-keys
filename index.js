#!/usr/bin/env node
const yargs = require("yargs");
const options = require("./src/options");
const Command = require("./src/Command");
const package = require("./package.json");

yargs.version(package.version);
Object.keys(options).forEach(option => {
  yargs.option(option, options[option]);
});
const command = new Command(yargs.argv);
command.execute();
