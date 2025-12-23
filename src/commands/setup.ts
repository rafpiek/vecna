#!/usr/bin/env node

import inquirer from 'inquirer';
import fs from 'fs-extra';
import path from 'path';
import { SimpleGit } from 'simple-git';
import { configManager, ProjectConfig } from '../utils/configManager';
import { gitUtils } from '../utils/git';

type ConfigManager = ReturnType<typeof configManager>;

export default async (gitInstance: SimpleGit, config: ConfigManager) => {
    const git = gitUtils(gitInstance);
    try {
        // Find git root directory
        const gitRoot = await git.findGitRoot(process.cwd());
        
        // Verify this is the main repository (not a worktree)
        const isMainRepo = await git.isMainRepository(gitRoot);
        
        if (!isMainRepo) {
            throw new Error('Setup must be run from the main repository directory, not a worktree');
        }
        const answers = await inquirer.prompt([
            {
                type: 'input',
                name: 'projectName',
                message: 'Enter the project name:',
                default: path.basename(gitRoot),
            },
            {
                type: 'input',
                name: 'mainBranch',
                message: 'Enter the main branch name:',
                default: 'main',
            },
            {
                type: 'list',
                name: 'packageManager',
                message: 'Select package manager:',
                choices: [
                    { name: 'npm', value: 'npm' },
                    { name: 'yarn', value: 'yarn' },
                    { name: 'pnpm', value: 'pnpm' },
                    { name: 'bun', value: 'bun' },
                    { name: 'auto (detect from lock files)', value: 'auto' },
                ],
                default: 'auto',
            },
            {
                type: 'input',
                name: 'jsLinter',
                message: 'Enter the JavaScript/TypeScript linter command (optional):',
                default: 'eslint',
            },
            {
                type: 'input',
                name: 'rbLinter',
                message: 'Enter the Ruby linter command (optional):',
                default: 'rubocop',
            },
            {
                type: 'input',
                name: 'rbTestRunner',
                message: 'Enter the Ruby test runner command (optional):',
                default: 'rspec',
            },
        ]);

        const projectConfig: ProjectConfig = {
            name: answers.projectName,
            path: gitRoot,
            mainBranch: answers.mainBranch,
            linter: {
                js: answers.jsLinter || undefined,
                rb: answers.rbLinter || undefined,
            },
            test: {
                rb: answers.rbTestRunner || undefined,
            },
            worktrees: {
                baseDir: path.join(require('os').homedir(), 'dev', 'trees'),
                copyFiles: ['config/master.key', 'config/application.yml'],
                defaultBranch: answers.mainBranch,
                autoInstall: true,
                packageManager: answers.packageManager,
                postCreateScripts: [],
                editor: {
                    command: 'code',
                    openOnSwitch: false
                }
            },
            worktreeState: {}
        };

        // Write local config
        await config.writeLocalConfig(projectConfig);

        // Update global config
        await config.updateGlobalConfig(projectConfig);

        console.log(`Project ${answers.projectName} setup complete.`);

    } catch (error) {
        console.error('Setup failed:', error);
        throw error;
    }
};
