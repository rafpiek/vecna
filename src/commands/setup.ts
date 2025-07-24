#!/usr/bin/env node

import inquirer from 'inquirer';
import fs from 'fs-extra';
import path from 'path';
import { configManager, ProjectConfig } from '../utils/configManager';

type ConfigManager = ReturnType<typeof configManager>;

export default (config: ConfigManager) => {
    const { createLocalConfig, updateGlobalConfig } = config;

    return new Promise<void>(async (resolve, reject) => {
        try {
            const answers = await inquirer.prompt([
                {
                    type: 'input',
                    name: 'projectName',
                    message: 'Enter the project name:',
                    default: path.basename(process.cwd()),
                },
            ]);

            const { projectName } = answers;

            const projectConfig: Omit<ProjectConfig, 'path'> = {
                name: projectName,
                linter: {},
                test: {}
            };

            // Detect rspec
            const gemfilePath = path.join(process.cwd(), 'Gemfile');
            if (await fs.pathExists(gemfilePath)) {
                const gemfileContent = await fs.readFile(gemfilePath, 'utf-8');
                if (gemfileContent.includes('rspec')) {
                    if (!projectConfig.test) projectConfig.test = {};
                    projectConfig.test.rb = 'rspec';
                }
            }

            // Detect eslint
            const packageJsonPath = path.join(process.cwd(), 'package.json');
            if (await fs.pathExists(packageJsonPath)) {
                const packageJson = await fs.readJson(packageJsonPath);
                if (packageJson.scripts?.lint?.includes('eslint')) {
                    if (!projectConfig.linter) projectConfig.linter = {};
                    projectConfig.linter.js = 'eslint';
                }
            }

            await createLocalConfig(projectConfig);
            await updateGlobalConfig({ ...projectConfig, path: process.cwd() });

            console.log(`Project ${projectName} setup complete.`);
            resolve();
        } catch (error) {
            reject(error);
        }
    });
};
