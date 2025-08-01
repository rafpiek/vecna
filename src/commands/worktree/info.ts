import { SimpleGit } from 'simple-git';
import { gitUtils } from '../../utils/git';
import { worktreeManager } from '../../utils/worktreeManager';
import { selectWorktreeWithFuzzySearch } from '../../utils/worktreePicker';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';

export default async (gitInstance: SimpleGit, worktreeName?: string) => {
    const git = gitUtils(gitInstance);
    const manager = worktreeManager(gitInstance);

    try {
        // Get all worktrees
        const worktrees = await manager.listWorktrees();

        if (worktrees.length === 0) {
            console.log(chalk.yellow('No worktrees found.'));
            return;
        }

        let targetWorktree;

        if (worktreeName) {
            // Find specific worktree by name or branch
            targetWorktree = worktrees.find(wt =>
                wt.name === worktreeName ||
                wt.branch === worktreeName ||
                wt.path.includes(worktreeName)
            );

            if (!targetWorktree) {
                console.error(chalk.red(`Worktree "${worktreeName}" not found.`));
                process.exit(1);
            }
        } else {
            // Interactive selection with fuzzy search
            // Filter out main repo directory - just remove "chatchat" for now (same as switch command)
            const filteredWorktrees = worktrees.filter(wt => {
                const dirName = path.basename(wt.path);
                return dirName !== 'chatchat';
            });

            if (filteredWorktrees.length === 0) {
                console.log(chalk.yellow('No worktrees found.'));
                return;
            }

            targetWorktree = await selectWorktreeWithFuzzySearch(filteredWorktrees, 'Choose worktree to view info:');
        }

        // Display detailed information
        console.log(chalk.cyan.bold(`\nWorktree Information: ${targetWorktree.branch}`));
        console.log(chalk.gray('─'.repeat(50)));

        // Basic info
        console.log(`${chalk.bold('Branch:')} ${targetWorktree.branch}`);
        console.log(`${chalk.bold('Path:')} ${targetWorktree.path}`);
        console.log(`${chalk.bold('Status:')} ${targetWorktree.isCurrent ? chalk.green('● Current') : chalk.gray('○ Inactive')}`);

        // Git status
        console.log(`\n${chalk.bold('Git Status:')}`);
        if (targetWorktree.status.hasUncommittedChanges) {
            console.log(`  ${chalk.yellow('● Uncommitted changes')}`);
        } else {
            console.log(`  ${chalk.green('● Clean working directory')}`);
        }

        if (targetWorktree.status.ahead > 0 || targetWorktree.status.behind > 0) {
            console.log(`  ${chalk.blue('●')} ${targetWorktree.status.ahead} commits ahead, ${targetWorktree.status.behind} commits behind`);
        } else {
            console.log(`  ${chalk.green('● Up to date with remote')}`);
        }

        // Last commit info
        console.log(`\n${chalk.bold('Last Commit:')}`);
        console.log(`  ${chalk.bold('Hash:')} ${targetWorktree.lastCommit.hash.substring(0, 8)}`);
        console.log(`  ${chalk.bold('Message:')} ${targetWorktree.lastCommit.message}`);
        console.log(`  ${chalk.bold('Date:')} ${new Date(targetWorktree.lastCommit.date).toLocaleString()}`);

        // File system info
        console.log(`\n${chalk.bold('File System:')}`);
        const diskUsage = await calculateDetailedDiskUsage(targetWorktree.path);
        console.log(`  ${chalk.bold('Disk Usage:')} ${diskUsage.total}`);
        console.log(`  ${chalk.bold('Files:')} ${diskUsage.fileCount} files`);
        console.log(`  ${chalk.bold('Directories:')} ${diskUsage.dirCount} directories`);

        // Check for common files
        const commonFiles = [
            'package.json',
            'Gemfile',
            'requirements.txt',
            'Dockerfile',
            '.env',
            'config/application.yml'
        ];

        const existingFiles = [];
        for (const file of commonFiles) {
            const filePath = path.join(targetWorktree.path, file);
            if (await fs.pathExists(filePath)) {
                existingFiles.push(file);
            }
        }

        if (existingFiles.length > 0) {
            console.log(`\n${chalk.bold('Configuration Files:')}`);
            existingFiles.forEach(file => {
                console.log(`  ${chalk.green('✓')} ${file}`);
            });
        }

        // Recent activity (placeholder)
        console.log(`\n${chalk.bold('Recent Activity:')}`);
        console.log(`  ${chalk.gray('Last accessed: N/A (feature not implemented)')}`);
        console.log(`  ${chalk.gray('Created: N/A (feature not implemented)')}`);

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(chalk.red('✗') + ' Failed to get worktree info:', errorMessage);
        process.exit(1);
    }
};

async function calculateDetailedDiskUsage(dirPath: string): Promise<{
    total: string;
    fileCount: number;
    dirCount: number;
}> {
    try {
        let totalSize = 0;
        let fileCount = 0;
        let dirCount = 0;

        const calculateSize = async (currentPath: string): Promise<void> => {
            const stats = await fs.stat(currentPath);

            if (stats.isDirectory()) {
                dirCount++;
                try {
                    const items = await fs.readdir(currentPath);
                    for (const item of items) {
                        // Skip .git directory for more accurate size
                        if (item === '.git') continue;
                        await calculateSize(path.join(currentPath, item));
                    }
                } catch {
                    // Skip directories we can't read
                }
            } else {
                fileCount++;
                totalSize += stats.size;
            }
        };

        await calculateSize(dirPath);

        // Format size
        const formatSize = (bytes: number): string => {
            const units = ['B', 'KB', 'MB', 'GB'];
            let size = bytes;
            let unitIndex = 0;

            while (size >= 1024 && unitIndex < units.length - 1) {
                size /= 1024;
                unitIndex++;
            }

            return `${size.toFixed(1)} ${units[unitIndex]}`;
        };

        return {
            total: formatSize(totalSize),
            fileCount,
            dirCount
        };

    } catch {
        return {
            total: 'unknown',
            fileCount: 0,
            dirCount: 0
        };
    }
}
