import inquirer from 'inquirer';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

type ConfigManager = ReturnType<typeof import('../utils/configManager').configManager>;

const GLOBAL_CONFIG_DIR = path.join(os.homedir(), '.config', 'vecna');

export default async (config: ConfigManager) => {
    try {
        // Check if global config exists
        const globalConfigExists = await fs.pathExists(GLOBAL_CONFIG_DIR);
        
        if (!globalConfigExists) {
            console.log(chalk.yellow('No global configuration found.'));
            return;
        }

        // Show warning and confirm
        console.log(chalk.yellow.bold('⚠️  Reset Global Configuration'));
        console.log(chalk.gray('This will remove:'));
        console.log(chalk.gray('  • All project configurations'));
        console.log(chalk.gray('  • Default project settings'));
        console.log(chalk.gray('  • Global vecna configuration'));
        console.log(chalk.gray(`  • Directory: ${GLOBAL_CONFIG_DIR}`));
        console.log();

        const { confirmed } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'confirmed',
                message: 'Are you sure you want to reset all global configuration?',
                default: false
            }
        ]);

        if (!confirmed) {
            console.log(chalk.gray('Reset cancelled.'));
            return;
        }

        // Remove global config directory
        await fs.remove(GLOBAL_CONFIG_DIR);

        console.log(chalk.green('✓') + ' Global configuration reset successfully.');
        console.log(chalk.gray('You can run "vecna setup" in project directories to re-configure.'));

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(chalk.red('✗') + ' Reset failed:', errorMessage);
        process.exit(1);
    }
};