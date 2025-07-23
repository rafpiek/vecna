#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { readGlobalConfig } from '../utils/configManager';

const program = new Command();

program
    .action(async () => {
        const config = await readGlobalConfig();

        if (config.projects.length === 0) {
            console.log(chalk.yellow('No projects configured yet. Run "vecna setup" to add one.'));
            return;
        }

        console.log(chalk.bold.blue('Configured Projects:'));
        config.projects.forEach(project => {
            console.log(`- ${chalk.green(project.name)}: ${project.path}`);
        });
    });

program.parse(process.argv);
