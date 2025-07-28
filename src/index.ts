#!/usr/bin/env node

import { Command } from 'commander';
import fs from 'fs-extra';
import simpleGit from 'simple-git';
import { configManager } from './utils/configManager';
import { gitUtils } from './utils/git';
import { worktreeCommand } from './commands/worktree';

const program = new Command();

// Create instances of utils with dependencies
const config = configManager(fs);
const gitInstance = simpleGit();
const git = gitUtils(gitInstance);

program
    .version('1.0.0')
    .description('A CLI tool for managing multi-language monorepos');

program
    .command('setup')
    .description('setup a new project')
    .action(() => import('./commands/setup').then(i => i.default(gitInstance, config)));

program
    .command('start')
    .description('Create a new worktree')
    .option('-b, --branch <name>', 'Specify branch name directly')
    .option('--no-install', 'Skip dependency installation')
    .option('--from <branch>', 'Create worktree from specific branch (default: main)')
    .option('-e, --editor', 'Open new worktree in editor (Cursor)')
    .action((options) => import('./commands/start').then(i => i.default(gitInstance, options)));

program
    .command('switch')
    .description('Switch between worktrees interactively')
    .option('--json', 'Output result in JSON format')
    .option('--path', 'Output only path for command substitution')
    .option('-e, --editor', 'Open selected worktree in editor (Cursor)')
    .action((options) => import('./commands/switch').then(i => i.default(gitInstance, options)));

program
    .command('shell-install')
    .description('Install shell integration for better worktree switching')
    .action(() => import('./commands/shell-install').then(i => i.default()));

program
    .command('tidy')
    .description('Clean up merged branches and associated worktrees')
    .option('--dry-run', 'Show what would be cleaned without doing it')
    .option('--force', 'Skip confirmation prompt')
    .option('--keep-pattern <pattern>', 'Protect branches matching pattern (e.g., "release/*")')
    .action((options) => import('./commands/tidy').then(i => i.default(gitInstance, options)));

program
    .command('list')
    .description('list all projects')
    .action(() => import('./commands/list').then(i => i.default(config)));

program
    .command('default')
    .description('Manage default project')
    .option('-p, --project', 'Show project picker to set default')
    .option('--clear', 'Clear default project')
    .action((options) => import('./commands/default').then(i => i.default(config, options)));

program
    .command('reset')
    .description('Reset global configuration (removes all project settings)')
    .action(() => import('./commands/reset').then(i => i.default(config)));

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

program.addCommand(worktreeCommand);

program
    .command('version')
    .description('show version')
    .action(() => import('./commands/version').then(i => i.default()));

program.parse(process.argv);
