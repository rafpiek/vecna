#!/usr/bin/env node

import chalk from 'chalk';
import { configManager } from '../utils/configManager';

type ConfigManager = ReturnType<typeof configManager>;

export default async (config: ConfigManager) => {
    const { readGlobalConfig } = config;

    const globalConfig = await readGlobalConfig();

    if (globalConfig.projects.length === 0) {
        console.log(chalk.yellow('No projects configured yet. Run "vecna setup" to add one.'));
        return;
    }

    console.log(chalk.bold.blue('Configured Projects:'));
    globalConfig.projects.forEach(project => {
        console.log(`- ${chalk.green(project.name)}: ${project.path}`);
    });
};
