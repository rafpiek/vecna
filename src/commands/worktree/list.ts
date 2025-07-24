import { Command } from 'commander';
import { worktreeManager } from '../../utils/worktreeManager';
import Table from 'cli-table3';
import chalk from 'chalk';

export const worktreeListCommand = new Command('list')
    .description('List all worktrees')
    .action(async () => {
        const manager = worktreeManager();
        const worktrees = await manager.listWorktrees();

        const table = new Table({
            head: [
                chalk.cyan('Name'),
                chalk.cyan('Branch'),
                chalk.cyan('Path'),
                chalk.cyan('Status'),
            ],
            colWidths: [30, 30, 70, 20],
        });

        worktrees.forEach(worktree => {
            let status = '';
            if (worktree.isCurrent) {
                status += chalk.green('Current ');
            }
            if (worktree.status.hasUncommittedChanges) {
                status += chalk.yellow('Modified ');
            }
            if (worktree.status.ahead > 0) {
                status += chalk.blue(`Ahead ${worktree.status.ahead} `);
            }
            if (worktree.status.behind > 0) {
                status += chalk.red(`Behind ${worktree.status.behind} `);
            }

            table.push([
                worktree.name,
                worktree.branch,
                worktree.path,
                status.trim(),
            ]);
        });

        console.log(table.toString());
    });
