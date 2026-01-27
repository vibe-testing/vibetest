#!/usr/bin/env bun

import { Command } from "commander";
import { createExploreCommand, createGenerateCommand, createDiffCommand } from "./cli/index.js";

const program = new Command();

program
  .name("vibetest")
  .description("AI-powered web application exploration and test generation")
  .version("0.1.0");

program.addCommand(createExploreCommand());
program.addCommand(createGenerateCommand());
program.addCommand(createDiffCommand());

program.parse();
