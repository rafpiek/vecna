#!/usr/bin/env node

import { Command } from 'commander';

const program = new Command();

program
    .version('1.0.0')
    .description('A CLI tool for managing multi-language monorepos');

program.command('setup', 'setup a new project');
program.command('list', 'list all projects');
program.command('lint', 'lint files');
program.command('test', 'run tests');


program.parse(process.argv);
