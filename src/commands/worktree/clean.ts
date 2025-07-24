import { SimpleGit } from 'simple-git';
import { gitUtils } from '../../utils/git';
import { worktreeManager } from '../../utils/worktreeManager';
import chalk from 'chalk';
import fs from 'fs-extra';
import inquirer from 'inquirer';

interface CleanOptions {
    dryRun?: boolean;
    force?: boolean;
}

export default async (gitInstance: SimpleGit, options: CleanOptions = {}) => {
    const git = gitUtils(gitInstance);
    const manager = worktreeManager(gitInstance);

    try {
        console.log(chalk.cyan('Scanning for orphaned worktrees...'));

        // Get all worktrees from git
        const gitWorktrees = await git.listWorktrees();

        // Find orphaned worktrees (directories that don't exist but are registered in git)
        const orphanedWorktrees = [];
        const invalidPaths = [];

        for (const worktree of gitWorktrees) {
            const pathExists = await fs.pathExists(worktree.path);

            if (!pathExists) {
                orphanedWorktrees.push(worktree);
            } else {
                // Check if the worktree directory is actually a valid git worktree
                const gitDirPath = `${worktree.path}/.git`;
                const gitDirExists = await fs.pathExists(gitDirPath);

                if (!gitDirExists) {
                    invalidPaths.push(worktree);
                }
            }
        }

        // Also check for directories in ~/dev/trees that aren't registered worktrees
        const baseDir = require('os').homedir() + '/dev/trees';
        let unregisteredDirs = [];

        if (await fs.pathExists(baseDir)) {
            const treeDirs = await fs.readdir(baseDir);
            const registeredPaths = gitWorktrees.map(wt => wt.path);

            for (const dir of treeDirs) {
                const fullPath = `${baseDir}/${dir}`;
                const isDirectory = (await fs.stat(fullPath)).isDirectory();

                if (isDirectory && !registeredPaths.includes(fullPath)) {
                    // Check if it looks like a git directory
                    const hasGitDir = await fs.pathExists(`${fullPath}/.git`);
                    if (hasGitDir) {
                        unregisteredDirs.push({
                            path: fullPath,
                            name: dir
                        });
                    }
                }
            }
        }

        // Report findings
        const totalIssues = orphanedWorktrees.length + invalidPaths.length + unregisteredDirs.length;

        if (totalIssues === 0) {
            console.log(chalk.green('✓ No orphaned worktrees found. Everything looks clean!'));
            return;
        }

        console.log(chalk.yellow(`\nFound ${totalIssues} issue(s):`));

        if (orphanedWorktrees.length > 0) {
            console.log(chalk.red(`\n${orphanedWorktrees.length} orphaned worktree(s) (registered but path doesn't exist):`));
            orphanedWorktrees.forEach(wt => {
                console.log(`  - ${wt.branch} → ${chalk.gray(wt.path)}`);
            });
        }

        if (invalidPaths.length > 0) {
            console.log(chalk.yellow(`\n${invalidPaths.length} invalid worktree(s) (path exists but not a valid git worktree):`));
            invalidPaths.forEach(wt => {
                console.log(`  - ${wt.branch} → ${chalk.gray(wt.path)}`);
            });
        }

        if (unregisteredDirs.length > 0) {
            console.log(chalk.blue(`\n${unregisteredDirs.length} unregistered director(ies) (git directories not registered as worktrees):`));
            unregisteredDirs.forEach(dir => {
                console.log(`  - ${dir.name} → ${chalk.gray(dir.path)}`);
            });
        }

        if (options.dryRun) {
            console.log(chalk.gray('\n(Dry run - no changes made)'));
            return;
        }

        // Ask for confirmation unless forced
        if (!options.force) {
            const { shouldClean } = await inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'shouldClean',
                    message: 'Clean up these issues?',
                    default: false
                }
            ]);

            if (!shouldClean) {
                console.log(chalk.gray('Cleanup cancelled.'));
                return;
            }
        }

        // Clean up orphaned worktrees
        for (const worktree of orphanedWorktrees) {
            try {
                console.log(chalk.cyan(`Removing orphaned worktree: ${worktree.branch}...`));
                await git.pruneWorktrees();
                console.log(chalk.green(`✓ Cleaned up ${worktree.branch}`));
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.error(chalk.red(`✗ Failed to clean ${worktree.branch}: ${errorMessage}`));
            }
        }

        // Handle invalid paths
        for (const worktree of invalidPaths) {
            try {
                console.log(chalk.cyan(`Fixing invalid worktree: ${worktree.branch}...`));

                const { action } = await inquirer.prompt([
                    {
                        type: 'list',
                        name: 'action',
                        message: `How should we handle ${worktree.branch}?`,
                        choices: [
                            { name: 'Remove from git worktree list', value: 'remove' },
                            { name: 'Try to repair', value: 'repair' },
                            { name: 'Skip', value: 'skip' }
                        ]
                    }
                ]);

                if (action === 'remove') {
                    await git.removeWorktree(worktree.path, true);
                    console.log(chalk.green(`✓ Removed ${worktree.branch} from worktree list`));
                } else if (action === 'repair') {
                    // This would require more complex logic to repair the worktree
                    console.log(chalk.yellow(`Repair not implemented for ${worktree.branch}`));
                } else {
                    console.log(chalk.gray(`Skipped ${worktree.branch}`));
                }

            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.error(chalk.red(`✗ Failed to handle ${worktree.branch}: ${errorMessage}`));
            }
        }

        // Handle unregistered directories
        for (const dir of unregisteredDirs) {
            try {
                const { action } = await inquirer.prompt([
                    {
                        type: 'list',
                        name: 'action',
                        message: `How should we handle unregistered directory ${dir.name}?`,
                        choices: [
                            { name: 'Delete directory', value: 'delete' },
                            { name: 'Register as worktree', value: 'register' },
                            { name: 'Skip', value: 'skip' }
                        ]
                    }
                ]);

                if (action === 'delete') {
                    await fs.remove(dir.path);
                    console.log(chalk.green(`✓ Deleted ${dir.name}`));
                } else if (action === 'register') {
                    console.log(chalk.yellow(`Registration not implemented for ${dir.name}`));
                } else {
                    console.log(chalk.gray(`Skipped ${dir.name}`));
                }

            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.error(chalk.red(`✗ Failed to handle ${dir.name}: ${errorMessage}`));
            }
        }

        console.log(chalk.green('\n✓ Cleanup completed!'));

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(chalk.red('✗') + ' Failed to clean worktrees:', errorMessage);
        process.exit(1);
    }
};
