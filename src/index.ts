#!/usr/bin/env node

import { Command } from 'commander';
import fs from 'fs-extra';
import simpleGit from 'simple-git';
import { configManager } from './utils/configManager';
import { gitUtils } from './utils/git';

const program = new Command();

// Create instances of utils with dependencies
const config = configManager(fs);
const git = gitUtils(simpleGit());

program
    .version('1.0.0')
    .description('A CLI tool for managing multi-language monorepos');

program.command('setup', 'setup a new project').action(() => import('./commands/setup').then(i => i.default(config)));
program.command('list', 'list all projects').action(() => import('./commands/list').then(i => i.default(config)));
program.command('lint', 'lint files').action(() => import('./commands/lint').then(i => i.default(config, git, process.argv.slice(2))));
program.command('test', 'run tests').action(() => import('./commands/test').then(i => i.default(config, git, process.argv.slice(2))));
program.command('version', 'show version').action(() => import('./commands/version').then(i => i.default()));


program.parse(process.argv);
