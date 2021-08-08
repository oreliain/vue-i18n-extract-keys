#!/usr/bin/env node
import yargs from "yargs";
import options, { CommandArguments } from "./cli/options";
import Command from "./cli/Command";

const argv = yargs.options(options).argv;
const cmd = new Command(argv as CommandArguments);
cmd.execute();
