#!/usr/bin/env node

import { Command } from 'commander';
import inquirer from 'inquirer';
import fs from 'fs-extra';
import path from 'path';
import { createLocalConfig, updateGlobalConfig } from '../utils/configManager';

const program = new Command();

program
    .action(async () => {
        const answers = await inquirer.prompt([
            {
                type: 'input',
                name: 'projectName',
                message: 'Enter the project name:',
                default: path.basename(process.cwd()),
            },
        ]);

        const { projectName } = answers;

        const config = {
            name: projectName,
            linter: {},
            test: {}
        };

        // Detect rspec
        const gemfilePath = path.join(process.cwd(), 'Gemfile');
        if (await fs.pathExists(gemfilePath)) {
            const gemfileContent = await fs.readFile(gemfilePath, 'utf-8');
            if (gemfileContent.includes('rspec')) {
                config.test.rb = 'rspec';
            }
        }

        // Detect eslint
        const packageJsonPath = path.join(process.cwd(), 'package.json');
        if (await fs.pathExists(packageJsonPath)) {
            const packageJson = await fs.readJson(packageJsonPath);
            if (packageJson.scripts?.lint?.includes('eslint')) {
                config.linter.js = 'eslint';
            }
        }

        await createLocalConfig(config);
        await updateGlobalConfig({ ...config, path: process.cwd() });

        console.log(`Project ${projectName} setup complete.`);
    });

program.parse(process.argv);
