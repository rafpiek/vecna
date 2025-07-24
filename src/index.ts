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

program
    .command('setup')
    .description('setup a new project')
    .action(() => import('./commands/setup').then(i => i.default(config)));

program
    .command('list')
    .description('list all projects')
    .action(() => import('./commands/list').then(i => i.default(config)));

// Lint command with subcommands
const lintCommand = program
    .command('lint')
    .description('lint files');

lintCommand
    .command('all')
    .description('lint all files')
    .option('-f, --fix', 'automatically fix issues')
    .option('-e, --uncommitted', 'lint uncommitted changes only')
    .option('-c, --committed', 'lint committed changes against main branch')
    .action((options) => import('./commands/lint').then(i => i.default(config, git, 'all', options)));

lintCommand
    .command('js')
    .description('lint JavaScript/TypeScript files')
    .option('-f, --fix', 'automatically fix issues')
    .option('-e, --uncommitted', 'lint uncommitted changes only')
    .option('-c, --committed', 'lint committed changes against main branch')
    .action((options) => import('./commands/lint').then(i => i.default(config, git, 'js', options)));

lintCommand
    .command('rb')
    .description('lint Ruby files')
    .option('-f, --fix', 'automatically fix issues')
    .option('-e, --uncommitted', 'lint uncommitted changes only')
    .option('-c, --committed', 'lint committed changes against main branch')
    .action((options) => import('./commands/lint').then(i => i.default(config, git, 'rb', options)));

// Test command with subcommands
const testCommand = program
    .command('test')
    .description('run tests');

testCommand
    .command('all')
    .description('run all tests')
    .option('-e, --uncommitted', 'test uncommitted changes only')
    .option('-c, --committed', 'test committed changes against main branch')
    .action((options) => import('./commands/test').then(i => i.default(config, git, 'all', options)));

testCommand
    .command('rb')
    .description('run Ruby tests')
    .option('-e, --uncommitted', 'test uncommitted changes only')
    .option('-c, --committed', 'test committed changes against main branch')
    .action((options) => import('./commands/test').then(i => i.default(config, git, 'rb', options)));

program
    .command('version')
    .description('show version')
    .action(() => import('./commands/version').then(i => i.default()));

program.parse(process.argv);
