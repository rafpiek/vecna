#!/usr/bin/env node

import { Command } from 'commander';
import { spawn } from 'child_process';
import { getModifiedFiles } from '../utils/git';
import { readLocalConfig } from '../utils/configManager';

const program = new Command();

const runTests = (runner: string, files: string[]) => {
    const process = spawn(runner, files, { stdio: 'inherit' });

    process.on('close', (code) => {
        if (code !== 0) {
            console.error(`Test runner exited with code ${code}`);
        }
    });
};

program
    .command('all')
    .option('-e, --uncommitted', 'Test uncommitted changes only')
    .option('-c, --committed', 'Test committed changes against main branch')
    .action(async (options) => {
        const config = await readLocalConfig();
        if (!config) {
            console.error('No .vecna.json found. Run "vecna setup" first.');
            return;
        }

        const { committed, uncommitted } = await getModifiedFiles();
        let filesToTest: string[] = [];

        if (options.uncommitted) {
            filesToTest = uncommitted;
        } else if (options.committed) {
            filesToTest = committed;
        } else {
            filesToTest = [...committed, ...uncommitted];
        }

        const rbTestFiles = filesToTest.filter(f => /_spec\.rb$/.test(f));

        if (config.test?.rb && rbTestFiles.length > 0) {
            runTests(config.test.rb, rbTestFiles);
        }
    });

program.parse(process.argv);
