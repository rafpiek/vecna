import { SimpleGit } from 'simple-git';
import { gitUtils } from '../utils/git';
import { worktreeManager } from '../utils/worktreeManager';
import inquirer from 'inquirer';
import chalk from 'chalk';
import clipboardy from 'clipboardy';

interface SwitchOptions {
    json?: boolean;
}

export default async (gitInstance: SimpleGit, options: SwitchOptions = {}) => {
    const git = gitUtils(gitInstance);
    const manager = worktreeManager(gitInstance);

    try {
        // Get all worktrees
        const worktrees = await manager.listWorktrees();

        if (worktrees.length === 0) {
            if (options.json) {
                console.log(JSON.stringify({ error: 'No worktrees found' }));
                process.exit(1);
            }
            console.log(chalk.yellow('No worktrees found. Use "vecna start" to create one.'));
            return;
        }

        // If JSON mode, don't show interactive prompt
        if (options.json) {
            // In JSON mode, we need to handle this differently
            // For now, just return an error
            console.log(JSON.stringify({ error: 'Interactive mode required' }));
            process.exit(1);
        }

        // Prepare choices for inquirer
        const choices = worktrees.map(wt => {
            let status = '';
            if (wt.isCurrent) {
                status = chalk.green('● current');
            } else if (wt.status.hasUncommittedChanges) {
                status = chalk.yellow('● changes');
            } else {
                status = chalk.gray('○');
            }

            const lastCommitDate = new Date(wt.lastCommit.date).toLocaleDateString();

            return {
                name: `${status} ${wt.branch.padEnd(30)} ${chalk.gray(lastCommitDate)}`,
                value: wt,
                short: wt.branch
            };
        });

        const { selectedWorktree } = await inquirer.prompt([
            {
                type: 'list',
                name: 'selectedWorktree',
                message: 'Select worktree to switch to:',
                choices,
                pageSize: 15
            }
        ]);

        if (selectedWorktree.isCurrent) {
            console.log(chalk.gray('Already in this worktree.'));
            return;
        }

        // Switch to the selected worktree
        console.log(chalk.cyan(`\nSwitching to ${selectedWorktree.branch}...`));

        // Copy the path to clipboard for easy pasting
        await clipboardy.write(`cd ${selectedWorktree.path}`);

        // Note: We can't actually change the shell's directory from within Node.js
        // We'll output the cd command for the user to run
        console.log(chalk.green('✓') + ' To complete the switch, run:');
        console.log(chalk.yellow(`  cd ${selectedWorktree.path}`));
        console.log(chalk.gray('\n(Command copied to clipboard)'));

        // Show status
        if (selectedWorktree.status.hasUncommittedChanges) {
            console.log(chalk.yellow('\n⚠ This worktree has uncommitted changes.'));
        }

        if (selectedWorktree.status.ahead > 0 || selectedWorktree.status.behind > 0) {
            console.log(chalk.gray(`\nBranch is ${selectedWorktree.status.ahead} commits ahead and ${selectedWorktree.status.behind} commits behind.`));
        }

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (options.json) {
            console.log(JSON.stringify({ error: errorMessage }));
            process.exit(1);
        }
        console.error(chalk.red('✗') + ' Failed to switch worktree:', errorMessage);
        process.exit(1);
    }
};
