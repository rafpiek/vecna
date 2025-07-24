import { Command } from 'commander';
import { SimpleGit } from 'simple-git';
import { gitUtils } from '../../utils/git';
import { worktreeManager } from '../../utils/worktreeManager';
import Table from 'cli-table3';
import chalk from 'chalk';

interface ListOptions {
    json?: boolean;
    active?: boolean;
}

export const listWorktrees = async (gitInstance: SimpleGit, options: ListOptions = {}) => {
    const git = gitUtils(gitInstance);
    const manager = worktreeManager(gitInstance);

    try {
        const worktrees = await manager.listWorktrees();

        if (options.json) {
            console.log(JSON.stringify(worktrees, null, 2));
            return;
        }

        if (worktrees.length === 0) {
            console.log(chalk.yellow('No worktrees found.'));
            return;
        }

        // Filter active worktrees if requested
        const filteredWorktrees = options.active
            ? worktrees.filter(wt => wt.isActive)
            : worktrees;

        // Create table
        const table = new Table({
            head: ['Branch', 'Path', 'Status', 'Last Commit', 'Changes'],
            colWidths: [20, 40, 15, 30, 10]
        });

        filteredWorktrees.forEach(wt => {
            let status = wt.isCurrent ? chalk.green('● Current') : chalk.gray('○ Inactive');

            const lastCommit = `${wt.lastCommit.hash.substring(0, 8)} ${wt.lastCommit.message.substring(0, 20)}...`;

            let changes = '';
            if (wt.status.hasUncommittedChanges) {
                changes += chalk.yellow('M');
            }
            if (wt.status.ahead > 0) {
                changes += chalk.blue(`↑${wt.status.ahead}`);
            }
            if (wt.status.behind > 0) {
                changes += chalk.red(`↓${wt.status.behind}`);
            }
            if (changes === '') {
                changes = chalk.green('✓');
            }

            table.push([
                wt.branch,
                wt.path,
                status,
                lastCommit,
                changes
            ]);
        });

        console.log(table.toString());

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(chalk.red('✗') + ' Failed to list worktrees:', errorMessage);
        process.exit(1);
    }
};

// Keep the original command export for backward compatibility
export const worktreeListCommand = new Command('list')
    .description('List all worktrees')
    .action(async () => {
        const { simpleGit } = await import('simple-git');
        const git = simpleGit();
        await listWorktrees(git);
    });
