import { shellIntegration } from '../utils/shellIntegration';
import chalk from 'chalk';
import inquirer from 'inquirer';

export default async () => {
    console.log(chalk.cyan.bold('🐚 Vecna Shell Integration Setup\n'));

    const shell = shellIntegration.detectShell();
    const configPath = shellIntegration.getShellConfigPath();

    console.log(`Detected shell: ${chalk.yellow(shell)}`);
    console.log(`Config file: ${chalk.gray(configPath)}`);

    console.log('\nThis will add a shell function that allows you to:');
    console.log(chalk.green('  • Use `vecna-switch` to actually change directories'));
    console.log(chalk.green('  • Navigate directly to worktrees from the command line'));
    console.log(chalk.green('  • Integrate seamlessly with your existing workflow'));

    console.log('\nThe following function will be added to your shell config:');
    console.log(chalk.gray('─'.repeat(60)));
    console.log(chalk.gray(shellIntegration.generateSwitchFunction(shell as any)));
    console.log(chalk.gray('─'.repeat(60)));

    const { shouldInstall } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'shouldInstall',
            message: 'Install shell integration?',
            default: true
        }
    ]);

    if (shouldInstall) {
        try {
            await shellIntegration.installShellIntegration();

            console.log(chalk.green('\n✓ Shell integration installed successfully!'));
            console.log('\nTo start using it:');
            console.log(chalk.yellow(`  1. Restart your terminal, or run: source ${configPath}`));
            console.log(chalk.yellow('  2. Use `vecna-switch` instead of `vecna switch`'));
            console.log(chalk.yellow('  3. The command will automatically change to the selected directory'));

            console.log('\nExample usage:');
            console.log(chalk.cyan('  $ vecna-switch'));
            console.log(chalk.gray('  # Interactive menu appears, select a worktree'));
            console.log(chalk.gray('  # Your shell automatically changes to that directory'));

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(chalk.red('✗ Failed to install shell integration:'), errorMessage);
            process.exit(1);
        }
    } else {
        console.log(chalk.gray('\nShell integration not installed.'));
        console.log('You can run this command again anytime with:');
        console.log(chalk.cyan('  vecna shell-install'));
    }
};
