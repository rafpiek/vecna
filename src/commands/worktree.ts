import { Command } from 'commander';
import { SimpleGit } from 'simple-git';

export const worktreeCommand = new Command('worktree')
    .description('Manage git worktrees');

// List subcommand
worktreeCommand
    .command('list')
    .description('List all worktrees')
    .option('--json', 'Output in JSON format')
    .option('--active', 'Show only active worktrees')
    .action((options) => {
        import('simple-git').then(({ simpleGit }) => {
            const git = simpleGit();
            return import('./worktree/list').then(i => i.listWorktrees(git, options));
        });
    });

// Remove subcommand
worktreeCommand
    .command('remove [name]')
    .description('Remove a worktree')
    .option('-f, --force', 'Skip confirmation prompts')
    .option('-m, --multi', 'Select multiple worktrees to remove')
    .option('--all-unused', 'Remove all unused worktrees')
    .option('--gone', 'List only worktrees that no longer exist on disk')
    .action((name, options) => {
        // We need to get the git instance from somewhere
        // For now, we'll import it dynamically
        import('simple-git').then(({ simpleGit }) => {
            const git = simpleGit();
            return import('./worktree/remove').then(i => i.default(git, name, options));
        });
    });

// Info subcommand
worktreeCommand
    .command('info [name]')
    .description('Show detailed information about a worktree')
    .action((name) => {
        import('simple-git').then(({ simpleGit }) => {
            const git = simpleGit();
            return import('./worktree/info').then(i => i.default(git, name));
        });
    });

// Clean subcommand
worktreeCommand
    .command('clean')
    .description('Remove orphaned worktrees')
    .option('--dry-run', 'Show what would be cleaned without making changes')
    .option('-f, --force', 'Skip confirmation prompts')
    .action((options) => {
        import('simple-git').then(({ simpleGit }) => {
            const git = simpleGit();
            return import('./worktree/clean').then(i => i.default(git, options));
        });
    });
