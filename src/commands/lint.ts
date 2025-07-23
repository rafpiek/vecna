#!/usr/bin/env node

import { Command } from 'commander';
import { spawn } from 'child_process';
import { getModifiedFiles } from '../utils/git';
import { readLocalConfig } from '../utils/configManager';

const program = new Command();

const runLinter = (linter: string, files: string[], fix: boolean) => {
    const args = fix ? [...files, '--fix'] : files;
    const process = spawn(linter, args, { stdio: 'inherit' });

    process.on('close', (code) => {
        if (code !== 0) {
            console.error(`Linter exited with code ${code}`);
        }
    });
};

program
    .command('all')
    .option('-f, --fix', 'Automatically fix issues')
    .option('-e, --uncommitted', 'Lint uncommitted changes only')
    .option('-c, --committed', 'Lint committed changes against main branch')
    .action(async (options) => {
        const config = await readLocalConfig();
        if (!config) {
            console.error('No .vecna.json found. Run "vecna setup" first.');
            return;
        }

        const { committed, uncommitted } = await getModifiedFiles();
        let filesToLint: string[] = [];

        if (options.uncommitted) {
            filesToLint = uncommitted;
        } else if (options.committed) {
            filesToLint = committed;
        } else {
            filesToLint = [...committed, ...uncommitted];
        }

        const jsFiles = filesToLint.filter(f => /\.(js|ts)x?$/.test(f));
        const rbFiles = filesToLint.filter(f => /\.rb$/.test(f));

        if (config.linter?.js && jsFiles.length > 0) {
            runLinter(config.linter.js, jsFiles, options.fix);
        }

        if (config.linter?.rb && rbFiles.length > 0) {
            runLinter(config.linter.rb, rbFiles, options.fix);
        }
    });

program.parse(process.argv);
