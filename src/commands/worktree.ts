import { Command } from 'commander';
import { worktreeListCommand } from './worktree/list';

export const worktreeCommand = new Command('worktree')
    .description('Manage git worktrees')
    .addCommand(worktreeListCommand);
