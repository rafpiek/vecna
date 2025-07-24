import { Command } from 'commander';
import { worktreeManager } from '../utils/worktreeManager';
import inquirer from 'inquirer';
import clipboardy from 'clipboardy';
import { Listr } from 'listr2';

export const startCommand = new Command('start')
    .description('Create a new worktree')
    .option('-b, --branch <name>', 'Specify branch name directly')
    .option('--no-install', 'Skip dependency installation')
    .action(async (options) => {
        let branchName = options.branch;

        if (!branchName) {
            const clipboardContent = await clipboardy.read();
            const { branch } = await inquirer.prompt([
                {
                    type: 'input',
                    name: 'branch',
                    message: 'Enter the branch name:',
                    default: clipboardContent,
                },
            ]);
            branchName = branch;
        }

        if (!branchName) {
            console.error('Branch name is required.');
            return;
        }

        const tasks = new Listr([
            {
                title: 'Creating worktree',
                task: async (ctx, task) => {
                    const manager = worktreeManager();
                    const worktree = await manager.createWorktree(branchName, {
                        noInstall: options.noInstall,
                    });
                    task.title = `Worktree created at ${worktree.path}`;
                },
            },
        ]);

        try {
            await tasks.run();
        } catch (e) {
            console.error(e);
        }
    });
