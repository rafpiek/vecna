import { SimpleGit } from 'simple-git';
import { gitUtils } from '../../utils/git';
import { worktreeManager } from '../../utils/worktreeManager';
import { selectWorktreeWithFuzzySearch } from '../../utils/worktreePicker';
import inquirer from 'inquirer';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';

interface RemoveOptions {
    force?: boolean;
    allUnused?: boolean;
    gone?: boolean;
}

export default async (gitInstance: SimpleGit, worktreeName?: string, options: RemoveOptions = {}) => {
    const git = gitUtils(gitInstance);
    const manager = worktreeManager(gitInstance);

    try {
        // Get all worktrees
        const allWorktrees = await manager.listWorktrees();
        
        // Filter out main repo directory - just remove "chatchat" for now (same as switch command)
        const worktrees = allWorktrees.filter(wt => {
            const dirName = path.basename(wt.path);
            return dirName !== 'chatchat';
        });

        if (worktrees.length === 0) {
            console.log(chalk.yellow('No worktrees found.'));
            return;
        }

        let worktreesToRemove = [];

        if (options.gone) {
            // Filter to only worktrees that don't exist on disk
            const goneWorktrees = [];
            for (const wt of worktrees) {
                const exists = await fs.pathExists(wt.path);
                if (!exists) {
                    goneWorktrees.push(wt);
                }
            }
            
            if (goneWorktrees.length === 0) {
                console.log(chalk.green('No gone worktrees found.'));
                return;
            }

            console.log(chalk.yellow(`Found ${goneWorktrees.length} gone worktrees:`));
            goneWorktrees.forEach(wt => {
                console.log(`  - ${wt.branch} (${wt.path})`);
            });

            // For --gone flag, we list them but don't proceed with removal
            // User needs to manually select or use specific name to remove
            return;

        } else if (options.allUnused) {
            // Remove all worktrees not accessed in X days (placeholder logic)
            worktreesToRemove = worktrees.filter(wt => !wt.isCurrent && !wt.status.hasUncommittedChanges);

            if (worktreesToRemove.length === 0) {
                console.log(chalk.green('No unused worktrees found.'));
                return;
            }

            console.log(chalk.yellow(`Found ${worktreesToRemove.length} unused worktrees:`));
            worktreesToRemove.forEach(wt => {
                console.log(`  - ${wt.branch} (${wt.path})`);
            });

        } else if (worktreeName) {
            // Remove specific worktree by name
            const worktree = worktrees.find(wt => wt.name === worktreeName || wt.branch === worktreeName);
            if (!worktree) {
                console.error(chalk.red(`Worktree "${worktreeName}" not found.`));
                process.exit(1);
            }
            worktreesToRemove = [worktree];

        } else {
            // Interactive selection with fuzzy search
            const availableWorktrees = worktrees.filter(wt => !wt.isCurrent); // Don't allow removing current worktree
            
            if (availableWorktrees.length === 0) {
                console.log(chalk.yellow('No worktrees available for removal (cannot remove current worktree).'));
                return;
            }

            const selectedWorktree = await selectWorktreeWithFuzzySearch(availableWorktrees, 'Choose worktree to remove:');
            worktreesToRemove = [selectedWorktree];
        }

        // Safety checks and confirmation
        for (const worktree of worktreesToRemove) {
            if (worktree.isCurrent) {
                console.error(chalk.red(`Cannot remove current worktree: ${worktree.branch}`));
                continue;
            }

            // Check for uncommitted changes
            if (worktree.status.hasUncommittedChanges && !options.force) {
                console.log(chalk.yellow(`\n⚠ Worktree "${worktree.branch}" has uncommitted changes:`));

                const { confirmWithChanges } = await inquirer.prompt([
                    {
                        type: 'confirm',
                        name: 'confirmWithChanges',
                        message: `Remove "${worktree.branch}" anyway? (changes will be lost)`,
                        default: false
                    }
                ]);

                if (!confirmWithChanges) {
                    console.log(chalk.gray(`Skipped ${worktree.branch}`));
                    continue;
                }
            }

            // Final confirmation unless forced
            if (!options.force) {
                const diskSpace = await calculateDiskUsage(worktree.path);

                console.log(chalk.cyan(`\nRemoving worktree: ${worktree.branch}`));
                console.log(`  Path: ${worktree.path}`);
                console.log(`  Disk space to be freed: ${diskSpace}`);

                const { finalConfirm } = await inquirer.prompt([
                    {
                        type: 'confirm',
                        name: 'finalConfirm',
                        message: 'Are you sure?',
                        default: false
                    }
                ]);

                if (!finalConfirm) {
                    console.log(chalk.gray(`Cancelled removal of ${worktree.branch}`));
                    continue;
                }
            }

            // Remove the worktree
            console.log(chalk.cyan(`Removing worktree: ${worktree.branch}...`));

            try {
                await git.removeWorktree(worktree.path, options.force);
                console.log(chalk.green(`✓ Removed worktree ${worktree.branch}`));

                // Also delete the local branch
                try {
                    await git.deleteBranch(worktree.branch, options.force);
                    console.log(chalk.green(`✓ Deleted local branch ${worktree.branch}`));
                } catch (branchError) {
                    const branchErrorMessage = branchError instanceof Error ? branchError.message : String(branchError);
                    
                    // Check if it's an unmerged branch error
                    if (branchErrorMessage.includes('not fully merged') || branchErrorMessage.includes('not merged')) {
                        console.log(chalk.yellow(`⚠️  Could not delete local branch ${worktree.branch}: ${branchErrorMessage}`));
                        
                        if (!options.force) {
                            const { confirmForceDelete } = await inquirer.prompt([
                                {
                                    type: 'confirm',
                                    name: 'confirmForceDelete',
                                    message: `Force delete unmerged branch "${worktree.branch}"? (changes may be lost)`,
                                    default: false
                                }
                            ]);

                            if (confirmForceDelete) {
                                try {
                                    await git.deleteBranch(worktree.branch, true);
                                    console.log(chalk.green(`✓ Force deleted local branch ${worktree.branch}`));
                                } catch (forceDeleteError) {
                                    const forceDeleteErrorMessage = forceDeleteError instanceof Error ? forceDeleteError.message : String(forceDeleteError);
                                    console.log(chalk.yellow(`⚠️  Still could not delete local branch ${worktree.branch}: ${forceDeleteErrorMessage}`));
                                    console.log(chalk.gray(`You may need to delete it manually: git branch -D ${worktree.branch}`));
                                }
                            } else {
                                console.log(chalk.gray(`Skipped deletion of branch ${worktree.branch}`));
                                console.log(chalk.gray(`You can delete it manually later: git branch -D ${worktree.branch}`));
                            }
                        } else {
                            console.log(chalk.gray(`You may need to delete it manually: git branch -D ${worktree.branch}`));
                        }
                    } else {
                        console.log(chalk.yellow(`⚠️  Could not delete local branch ${worktree.branch}: ${branchErrorMessage}`));
                        console.log(chalk.gray(`You may need to delete it manually: git branch -D ${worktree.branch}`));
                    }
                }

                // Clean up any remaining state
                await manager.cleanWorktreeState(worktree.name);

            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.error(chalk.red(`✗ Failed to remove ${worktree.branch}: ${errorMessage}`));

                if (!options.force) {
                    const { retryWithForce } = await inquirer.prompt([
                        {
                            type: 'confirm',
                            name: 'retryWithForce',
                            message: 'Retry with --force?',
                            default: false
                        }
                    ]);

                    if (retryWithForce) {
                        try {
                            await git.removeWorktree(worktree.path, true);
                            console.log(chalk.green(`✓ Force removed worktree ${worktree.branch}`));
                            
                            // Also try to delete the local branch with force
                            try {
                                await git.deleteBranch(worktree.branch, true);
                                console.log(chalk.green(`✓ Force deleted local branch ${worktree.branch}`));
                            } catch (branchError) {
                                const branchErrorMessage = branchError instanceof Error ? branchError.message : String(branchError);
                                console.log(chalk.yellow(`⚠️  Could not delete local branch ${worktree.branch}: ${branchErrorMessage}`));
                                console.log(chalk.gray(`You may need to delete it manually: git branch -D ${worktree.branch}`));
                            }
                        } catch (forceError) {
                            const forceErrorMessage = forceError instanceof Error ? forceError.message : String(forceError);
                            console.error(chalk.red(`✗ Force removal also failed: ${forceErrorMessage}`));
                        }
                    }
                }
            }
        }

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(chalk.red('✗') + ' Failed to remove worktree:', errorMessage);
        process.exit(1);
    }
};

async function calculateDiskUsage(path: string): Promise<string> {
    try {
        const stats = await fs.stat(path);
        if (stats.isDirectory()) {
            // This is a simplified calculation - in practice you'd want to recursively calculate
            return 'calculating...';
        }
        return '0 B';
    } catch {
        return 'unknown';
    }
}
