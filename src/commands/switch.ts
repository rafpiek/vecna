import { SimpleGit } from 'simple-git';
import { gitUtils } from '../utils/git';
import { worktreeManager } from '../utils/worktreeManager';
import inquirer from 'inquirer';
import chalk from 'chalk';
// Dynamic import for clipboardy ESM module
import { spawn } from 'child_process';

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

        // Enhanced interactive selection with actions
        await showInteractiveWorktreeSelector(worktrees, git, manager);

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

async function showInteractiveWorktreeSelector(worktrees: any[], git: any, manager: any) {
    let selectedWorktree = null;
    let showHelp = false;

    while (true) {
        console.clear();

        // Header
        console.log(chalk.cyan.bold('🌳 Vecna Worktree Switcher\n'));

        if (showHelp) {
            console.log(chalk.gray('Keyboard shortcuts:'));
            console.log(chalk.gray('  ↑/↓  Navigate'));
            console.log(chalk.gray('  Enter Switch to worktree'));
            console.log(chalk.gray('  d     Delete worktree'));
            console.log(chalk.gray('  i     Show worktree info'));
            console.log(chalk.gray('  o     Open in editor'));
            console.log(chalk.gray('  r     Refresh list'));
            console.log(chalk.gray('  h     Toggle this help'));
            console.log(chalk.gray('  q     Quit'));
            console.log('');
        } else {
            console.log(chalk.gray('Press h for help\n'));
        }

        // Prepare choices for inquirer with enhanced display
        const choices: any[] = worktrees.map((wt, index) => {
            let status = '';
            let statusColor = chalk.gray;

            if (wt.isCurrent) {
                status = '● current';
                statusColor = chalk.green;
            } else if (wt.status.hasUncommittedChanges) {
                status = '● changes';
                statusColor = chalk.yellow;
            } else {
                status = '○ clean';
                statusColor = chalk.gray;
            }

            const lastCommitDate = new Date(wt.lastCommit.date).toLocaleDateString();
            const branchDisplay = wt.branch.length > 25 ? wt.branch.substring(0, 22) + '...' : wt.branch;

            // Show ahead/behind info
            let syncStatus = '';
            if (wt.status.ahead > 0 || wt.status.behind > 0) {
                syncStatus = chalk.blue(`↑${wt.status.ahead}`) + chalk.red(`↓${wt.status.behind}`);
            }

            return {
                name: `${statusColor(status.padEnd(12))} ${branchDisplay.padEnd(28)} ${chalk.gray(lastCommitDate.padEnd(12))} ${syncStatus}`,
                value: { worktree: wt, action: 'switch' },
                short: wt.branch
            };
        });

        // Add action choices
        choices.push(
            new inquirer.Separator(),
            { name: chalk.cyan('🔄 Refresh list'), value: { action: 'refresh' } },
            { name: chalk.gray('❓ Toggle help'), value: { action: 'help' } },
            { name: chalk.red('❌ Quit'), value: { action: 'quit' } }
        );

        const { selection } = await inquirer.prompt([
            {
                type: 'list',
                name: 'selection',
                message: 'Select worktree or action:',
                choices,
                pageSize: Math.min(15, choices.length),
                loop: false
            }
        ]);

        // Handle the selection
        if (selection.action === 'refresh') {
            // Refresh the worktree list
            const updatedWorktrees = await manager.listWorktrees();
            worktrees.splice(0, worktrees.length, ...updatedWorktrees);
            continue;
        }

        if (selection.action === 'help') {
            showHelp = !showHelp;
            continue;
        }

        if (selection.action === 'quit') {
            console.log(chalk.gray('Goodbye!'));
            return;
        }

        if (selection.action === 'switch') {
            selectedWorktree = selection.worktree;
            break;
        }
    }

    if (!selectedWorktree) return;

    // Handle worktree switching
    if (selectedWorktree.isCurrent) {
        console.log(chalk.gray('Already in this worktree.'));
        return;
    }

    // Check if user wants to perform additional actions
    const { additionalAction } = await inquirer.prompt([
        {
            type: 'list',
            name: 'additionalAction',
            message: `Selected: ${selectedWorktree.branch}. What would you like to do?`,
            choices: [
                { name: '🔄 Switch to this worktree', value: 'switch' },
                { name: '🚀 Switch and open in Cursor', value: 'switch_and_open' },
                { name: '📝 Show detailed info', value: 'info' },
                { name: '🗑️  Delete this worktree', value: 'delete' },
                { name: '📂 Open in editor', value: 'editor' },
                { name: '❌ Cancel', value: 'cancel' }
            ]
        }
    ]);

    switch (additionalAction) {
        case 'switch':
            await handleWorktreeSwitch(selectedWorktree);
            break;

        case 'switch_and_open':
            await handleWorktreeSwitchAndOpen(selectedWorktree);
            break;

        case 'info':
            await showWorktreeInfo(selectedWorktree);
            break;

        case 'delete':
            await handleWorktreeDelete(selectedWorktree, git, manager);
            break;

        case 'editor':
            await openInEditor(selectedWorktree);
            break;

        case 'cancel':
            console.log(chalk.gray('Operation cancelled.'));
            break;
    }
}

async function handleWorktreeSwitch(worktree: any) {
    console.log(chalk.cyan(`\nSwitching to ${worktree.branch}...`));

    // Copy the path to clipboard for easy pasting
    const clipboard = await import('clipboardy');
    await clipboard.default.write(`cd ${worktree.path}`);

    console.log(chalk.green('✓') + ' To complete the switch, run:');
    console.log(chalk.yellow(`  cd ${worktree.path}`));
    console.log(chalk.gray('\n(Command copied to clipboard)'));

    // Show status
    if (worktree.status.hasUncommittedChanges) {
        console.log(chalk.yellow('\n⚠ This worktree has uncommitted changes.'));
    }

    if (worktree.status.ahead > 0 || worktree.status.behind > 0) {
        console.log(chalk.gray(`\nBranch is ${worktree.status.ahead} commits ahead and ${worktree.status.behind} commits behind.`));
    }
}

async function handleWorktreeSwitchAndOpen(worktree: any) {
    console.log(chalk.cyan(`\nSwitching to ${worktree.branch} and opening in Cursor...`));

    // First, handle the directory switch
    const clipboard = await import('clipboardy');
    await clipboard.default.write(`cd ${worktree.path}`);

    console.log(chalk.green('✓') + ' To complete the switch, run:');
    console.log(chalk.yellow(`  cd ${worktree.path}`));
    console.log(chalk.gray('(Command copied to clipboard)'));

    // Then, try to open Cursor
    try {
        // Check if cursor is available
        await new Promise((resolve, reject) => {
            const proc = spawn('which', ['cursor'], { stdio: 'ignore' });
            proc.on('close', (code) => {
                if (code === 0) resolve('cursor');
                else reject(new Error('Cursor not found'));
            });
        });

        // Open Cursor in the worktree directory
        spawn('cursor', [worktree.path], {
            detached: true,
            stdio: 'ignore'
        }).unref();

        console.log(chalk.green('✓') + ' Opened in Cursor');
    } catch (error) {
        console.log(chalk.yellow('⚠️  Cursor not found. Please install Cursor or use the regular switch option.'));
        console.log(chalk.gray('You can download Cursor from: https://cursor.sh/'));
    }

    // Show status
    if (worktree.status.hasUncommittedChanges) {
        console.log(chalk.yellow('\n⚠ This worktree has uncommitted changes.'));
    }

    if (worktree.status.ahead > 0 || worktree.status.behind > 0) {
        console.log(chalk.gray(`\nBranch is ${worktree.status.ahead} commits ahead and ${worktree.status.behind} commits behind.`));
    }
}

async function showWorktreeInfo(worktree: any) {
    console.log(chalk.cyan.bold(`\n📋 Worktree Information: ${worktree.branch}`));
    console.log(chalk.gray('─'.repeat(50)));

    console.log(`${chalk.bold('Branch:')} ${worktree.branch}`);
    console.log(`${chalk.bold('Path:')} ${worktree.path}`);
    console.log(`${chalk.bold('Status:')} ${worktree.isCurrent ? chalk.green('● Current') : chalk.gray('○ Inactive')}`);

    if (worktree.status.hasUncommittedChanges) {
        console.log(`${chalk.bold('Changes:')} ${chalk.yellow('● Uncommitted changes')}`);
    } else {
        console.log(`${chalk.bold('Changes:')} ${chalk.green('● Clean working directory')}`);
    }

    console.log(`${chalk.bold('Last Commit:')} ${worktree.lastCommit.hash.substring(0, 8)} - ${worktree.lastCommit.message}`);
    console.log(`${chalk.bold('Date:')} ${new Date(worktree.lastCommit.date).toLocaleString()}`);

    if (worktree.status.ahead > 0 || worktree.status.behind > 0) {
        console.log(`${chalk.bold('Sync:')} ${worktree.status.ahead} ahead, ${worktree.status.behind} behind`);
    }

    // Wait for user to press enter
    await inquirer.prompt([
        {
            type: 'input',
            name: 'continue',
            message: 'Press Enter to continue...'
        }
    ]);
}

async function handleWorktreeDelete(worktree: any, git: any, manager: any) {
    console.log(chalk.red(`\n🗑️  Delete Worktree: ${worktree.branch}`));

    if (worktree.isCurrent) {
        console.log(chalk.red('❌ Cannot delete the current worktree.'));
        return;
    }

    if (worktree.status.hasUncommittedChanges) {
        console.log(chalk.yellow('⚠️  This worktree has uncommitted changes that will be lost!'));
    }

    const { confirmDelete } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'confirmDelete',
            message: `Are you sure you want to delete "${worktree.branch}"?`,
            default: false
        }
    ]);

    if (confirmDelete) {
        try {
            await git.removeWorktree(worktree.path, false);
            await manager.cleanWorktreeState(worktree.name);
            console.log(chalk.green(`✓ Deleted worktree: ${worktree.branch}`));
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(chalk.red(`✗ Failed to delete worktree: ${errorMessage}`));
        }
    } else {
        console.log(chalk.gray('Delete cancelled.'));
    }
}

async function openInEditor(worktree: any) {
    console.log(chalk.cyan(`\n📂 Opening ${worktree.branch} in editor...`));

    // Try to detect the editor
    const editors = ['code', 'cursor', 'subl', 'atom', 'vim'];
    let editor = null;

    for (const ed of editors) {
        try {
            // Check if editor is available
            await new Promise((resolve, reject) => {
                const proc = spawn('which', [ed], { stdio: 'ignore' });
                proc.on('close', (code) => {
                    if (code === 0) resolve(ed);
                    else reject();
                });
            });
            editor = ed;
            break;
        } catch {
            // Editor not found, try next
        }
    }

    if (editor) {
        try {
            spawn(editor, [worktree.path], {
                detached: true,
                stdio: 'ignore'
            }).unref();
            console.log(chalk.green(`✓ Opened in ${editor}`));
        } catch (error) {
            console.error(chalk.red(`✗ Failed to open in ${editor}`));
        }
    } else {
        console.log(chalk.yellow('⚠️  No supported editor found. Supported editors: code, cursor, subl, atom, vim'));
        console.log(chalk.gray(`You can manually open: ${worktree.path}`));
    }
}
