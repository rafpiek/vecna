import { search } from '@inquirer/prompts';
import path from 'path';
import chalk from 'chalk';

function getStatusIndicator(worktree: any): string {
    // Priority order: show the most important status first
    if (!worktree.status.remoteExists) {
        return chalk.red('🗑️ '); // Gone/deleted remote branch - most important
    }
    
    if (worktree.isCurrent) {
        return chalk.green('● '); // Current worktree
    }
    
    if (worktree.status.hasUncommittedChanges) {
        return chalk.yellow('● '); // Has changes
    }
    
    if (worktree.status.ahead > 0 || worktree.status.behind > 0) {
        return chalk.blue('● '); // Ahead/behind remote
    }
    
    return chalk.gray('○ '); // Clean worktree
}

export async function selectWorktreeWithFuzzySearch(worktrees: any[], message: string = 'Choose worktree:'): Promise<any> {
    const choices = worktrees.map((wt) => {
        const dirName = path.basename(wt.path);
        const statusIndicator = getStatusIndicator(wt);
        const statusSuffix = getStatusSuffix(wt);
        const displayName = `${statusIndicator}${dirName}${statusSuffix}`;
        
        return {
            name: displayName,
            value: wt
        };
    });

    const selected = await search({
        message,
        source: async (input) => {
            if (!input) {
                return choices;
            }
            
            // Simple fuzzy matching - case insensitive substring search
            // Search in both the display name and the original directory name
            const filtered = choices.filter(choice => {
                const dirName = path.basename(choice.value.path);
                return choice.name.toLowerCase().includes(input.toLowerCase()) ||
                       dirName.toLowerCase().includes(input.toLowerCase());
            });
            
            return filtered;
        }
    });

    return selected;
}

function getStatusSuffix(worktree: any): string {
    // Only show the most important additional info as a subtle suffix
    if (!worktree.status.remoteExists) {
        return chalk.red(' (remote gone)');
    }
    
    if (worktree.status.hasUncommittedChanges) {
        return chalk.yellow(' (changes)');
    }
    
    if (worktree.status.ahead > 0 || worktree.status.behind > 0) {
        const aheadBehind = [];
        if (worktree.status.ahead > 0) aheadBehind.push(`${worktree.status.ahead}↑`);
        if (worktree.status.behind > 0) aheadBehind.push(`${worktree.status.behind}↓`);
        return chalk.blue(` (${aheadBehind.join(' ')})`);
    }
    
    return '';
}