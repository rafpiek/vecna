#!/usr/bin/env node

import { spawn } from 'child_process';
import { Command } from 'commander';
import { configManager } from '../utils/configManager';
import { gitUtils } from '../utils/git';

type ConfigManager = ReturnType<typeof configManager>;
type GitUtils = ReturnType<typeof gitUtils>;

const runLinter = (linter: string, files: string[], fix: boolean) => {
    const args = fix ? [...files, '--fix'] : files;
    const process = spawn(linter, args, { stdio: 'inherit' });

    process.on('close', (code) => {
        if (code !== 0) {
            console.error(`Linter exited with code ${code}`);
        }
    });
};

export default (config: ConfigManager, git: GitUtils, argv: string[]) => {
    const program = new Command();

    program
        .command('all')
        .option('-f, --fix', 'Automatically fix issues')
        .option('-e, --uncommitted', 'Lint uncommitted changes only')
        .option('-c, --committed', 'Lint committed changes against main branch')
        .action(async (options) => {
            const isGitRepo = await git.isGitRepo();
            if (!isGitRepo) {
                console.error('This command must be run inside a git repository.');
                return;
            }
            const localConfig = await config.readLocalConfig();
            if (!localConfig) {
                console.error('No .vecna.json found. Run "vecna setup" first.');
                return;
            }

            const { committed, uncommitted } = await git.getModifiedFiles();
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

            if (localConfig.linter?.js && jsFiles.length > 0) {
                runLinter(localConfig.linter.js, jsFiles, options.fix);
            }

            if (localConfig.linter?.rb && rbFiles.length > 0) {
                runLinter(localConfig.linter.rb, rbFiles, options.fix);
            }
        });

    return program.parseAsync(argv);
}
