#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs-extra';
import { configManager } from '../utils/configManager';
import { gitUtils } from '../utils/git';
import { dependencyExists } from '../utils/dependencyCheck';

type ConfigManager = ReturnType<typeof configManager>;
type GitUtils = ReturnType<typeof gitUtils>;

const runLinter = async (linter: string, files: string[], fix: boolean) => {
    // Check if linter exists locally first, then globally
    const localBinPath = path.join(process.cwd(), 'node_modules', '.bin', linter);
    const linterPath = await fs.pathExists(localBinPath) ? localBinPath : linter;

    const args = fix ? [...files, '--fix'] : files;
    const childProcess = spawn(linterPath, args, { stdio: 'inherit' });

    childProcess.on('close', (code) => {
        if (code !== 0) {
            console.error(`Linter exited with code ${code}`);
        }
    });
};

export default async (config: ConfigManager, git: GitUtils, subcommand?: string, options: any = {}) => {
    const { readLocalConfig } = config;
    const { getModifiedFiles } = git;

    try {
        const localConfig = await readLocalConfig();
        if (!localConfig) {
            console.error('No .vecna.json found. Run "vecna setup" first.');
            return;
        }

        // Get modified files based on options
        let filesToLint: string[] = [];

        if (options.uncommitted && options.committed) {
            // Both flags: get all modified files
            const { committed, uncommitted } = await getModifiedFiles(localConfig.mainBranch || 'main');
            filesToLint = [...committed, ...uncommitted];
        } else if (options.uncommitted) {
            // Only uncommitted
            const { uncommitted } = await getModifiedFiles(localConfig.mainBranch || 'main');
            filesToLint = uncommitted;
        } else if (options.committed) {
            // Only committed
            const { committed } = await getModifiedFiles(localConfig.mainBranch || 'main');
            filesToLint = committed;
        } else {
            // Default: all modified files
            const { committed, uncommitted } = await getModifiedFiles(localConfig.mainBranch || 'main');
            filesToLint = [...committed, ...uncommitted];
        }

        // Filter files based on subcommand
        let jsFiles: string[] = [];
        let rbFiles: string[] = [];

        if (!subcommand || subcommand === 'all') {
            jsFiles = filesToLint.filter(f => /\.(js|ts)$/.test(f));
            rbFiles = filesToLint.filter(f => /\.rb$/.test(f));
        } else if (subcommand === 'js') {
            jsFiles = filesToLint.filter(f => /\.(js|ts)$/.test(f));
        } else if (subcommand === 'rb') {
            rbFiles = filesToLint.filter(f => /\.rb$/.test(f));
        }

        // Run linters
        if (localConfig.linter?.js && jsFiles.length > 0) {
            if (!await dependencyExists(localConfig.linter.js)) {
                console.error(`Linter "${localConfig.linter.js}" not found. Please install it.`);
                return;
            }
            await runLinter(localConfig.linter.js, jsFiles, options.fix);
        }

        if (localConfig.linter?.rb && rbFiles.length > 0) {
            if (!await dependencyExists(localConfig.linter.rb)) {
                console.error(`Linter "${localConfig.linter.rb}" not found. Please install it.`);
                return;
            }
            await runLinter(localConfig.linter.rb, rbFiles, options.fix);
        }

        if (jsFiles.length === 0 && rbFiles.length === 0) {
            console.log('No files to lint.');
        }
    } catch (error) {
        console.error('Error running lint:', error);
    }
};
