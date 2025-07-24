#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs-extra';
import { configManager } from '../utils/configManager';
import { gitUtils } from '../utils/git';
import { dependencyExists } from '../utils/dependencyCheck';

type ConfigManager = ReturnType<typeof configManager>;
type GitUtils = ReturnType<typeof gitUtils>;

const runTests = async (runner: string, files: string[]) => {
    // Check if test runner exists locally first, then globally
    const localBinPath = path.join(process.cwd(), 'node_modules', '.bin', runner);
    const runnerPath = await fs.pathExists(localBinPath) ? localBinPath : runner;

    const childProcess = spawn(runnerPath, files, { stdio: 'inherit' });

    childProcess.on('close', (code) => {
        if (code !== 0) {
            console.error(`Test runner exited with code ${code}`);
        }
    });
};

export default async (config: ConfigManager, git: GitUtils, subcommand?: string, options: any = {}) => {
    const { isGitRepo, getModifiedFiles } = git;

    if (!await isGitRepo()) {
        console.error('This command must be run inside a git repository.');
        return;
    }

    const { readLocalConfig } = config;

    try {
        const localConfig = await readLocalConfig();
        if (!localConfig) {
            console.error('No .vecna.json found. Run "vecna setup" first.');
            return;
        }

        // Get modified files based on options
        let filesToTest: string[] = [];

        if (options.uncommitted && options.committed) {
            // Both flags: get all modified files
            const { committed, uncommitted } = await getModifiedFiles(localConfig.mainBranch || 'main');
            filesToTest = [...committed, ...uncommitted];
        } else if (options.uncommitted) {
            // Only uncommitted
            const { uncommitted } = await getModifiedFiles(localConfig.mainBranch || 'main');
            filesToTest = uncommitted;
        } else if (options.committed) {
            // Only committed
            const { committed } = await getModifiedFiles(localConfig.mainBranch || 'main');
            filesToTest = committed;
        } else {
            // Default: all modified files
            const { committed, uncommitted } = await getModifiedFiles(localConfig.mainBranch || 'main');
            filesToTest = [...committed, ...uncommitted];
        }

        // Filter for test files based on subcommand
        let rbTestFiles: string[] = [];

        if (!subcommand || subcommand === 'all') {
            rbTestFiles = filesToTest.filter(f => /_spec\.rb$/.test(f));
        } else if (subcommand === 'rb') {
            rbTestFiles = filesToTest.filter(f => /_spec\.rb$/.test(f));
        }

        // Run tests
        if (localConfig.test?.rb && rbTestFiles.length > 0) {
            if (!await dependencyExists(localConfig.test.rb)) {
                console.error(`Test runner "${localConfig.test.rb}" not found. Please install it.`);
                return;
            }
            await runTests(localConfig.test.rb, rbTestFiles);
        }

        if (rbTestFiles.length === 0) {
            console.log('No test files to run.');
        }
    } catch (error) {
        console.error('Error running tests:', error);
    }
};
