#!/usr/bin/env node

import { spawn } from 'child_process';
import { Command } from 'commander';
import { configManager } from '../utils/configManager';
import { gitUtils } from '../utils/git';

type ConfigManager = ReturnType<typeof configManager>;
type GitUtils = ReturnType<typeof gitUtils>;

const runTests = (runner: string, files: string[]) => {
    const process = spawn(runner, files, { stdio: 'inherit' });

    process.on('close', (code) => {
        if (code !== 0) {
            console.error(`Test runner exited with code ${code}`);
        }
    });
};

export default (config: ConfigManager, git: GitUtils, argv: string[]) => {
    const program = new Command();

    program
        .command('all')
        .option('-e, --uncommitted', 'Test uncommitted changes only')
        .option('-c, --committed', 'Test committed changes against main branch')
        .action(async (options) => {
            const localConfig = await config.readLocalConfig();
            if (!localConfig) {
                console.error('No .vecna.json found. Run "vecna setup" first.');
                return;
            }

            const { committed, uncommitted } = await git.getModifiedFiles();
            let filesToTest: string[] = [];

            if (options.uncommitted) {
                filesToTest = uncommitted;
            } else if (options.committed) {
                filesToTest = committed;
            } else {
                filesToTest = [...committed, ...uncommitted];
            }

            const rbTestFiles = filesToTest.filter(f => /_spec\.rb$/.test(f));

            if (localConfig.test?.rb && rbTestFiles.length > 0) {
                runTests(localConfig.test.rb, rbTestFiles);
            }
        });

    program.parse(argv);
}
