import { SimpleGit } from 'simple-git';
import { gitUtils } from '../utils/git';
import inquirer from 'inquirer';
import chalk from 'chalk';
// Dynamic import for clipboardy ESM module
import { spawn } from 'child_process';

interface SwitchOptions {
    json?: boolean;
    editor?: boolean;
}

export default async (gitInstance: SimpleGit, options: SwitchOptions = {}) => {
    const git = gitUtils(gitInstance);

    try {
        // Get basic worktree list (just paths and branches)
        const worktrees = await git.listWorktrees();

        if (worktrees.length === 0) {
            if (options.json) {
                console.log(JSON.stringify({ error: 'No worktrees found' }));
                process.exit(1);
            }
            console.log(chalk.yellow('No worktrees found. Use "vecna start" to create one.'));
            return;
        }

        // If JSON mode, output simple worktree list
        if (options.json) {
            console.log(JSON.stringify(worktrees.map(wt => ({
                branch: wt.branch,
                path: wt.path
            }))));
            return;
        }

        // Check if we should output shell commands for direct execution
        const isShellMode = process.env.VECNA_SHELL_MODE === 'true';

        // Simple interactive selection
        await showSimpleWorktreeSelector(worktrees, options.editor || false, isShellMode);

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

async function showSimpleWorktreeSelector(worktrees: any[], shouldOpenInEditor: boolean = false, isShellMode: boolean = false) {
    let selectedWorktree;

    if (isShellMode) {
        // In shell mode, use a simple numbered list without colors
        process.stderr.write('Select Worktree:\n');
        worktrees.forEach((wt, index) => {
            process.stderr.write(`${index + 1}. ${wt.branch} → ${wt.path}\n`);
        });
        process.stderr.write('Enter choice (1-' + worktrees.length + '): ');

        // Read input synchronously
        const choice = await new Promise<number>((resolve) => {
            process.stdin.once('data', (data) => {
                const num = parseInt(data.toString().trim());
                resolve(num);
            });
        });

        if (choice < 1 || choice > worktrees.length) {
            process.stderr.write('Invalid choice\n');
            process.exit(1);
        }

        selectedWorktree = worktrees[choice - 1];
    } else {
        // Normal interactive mode with colors
        console.log(chalk.cyan.bold('🌳 Select Worktree\n'));

        // Simple choices - just branch name and path
        const choices: any[] = worktrees.map((wt) => {
            const branchDisplay = wt.branch.length > 40 ? wt.branch.substring(0, 37) + '...' : wt.branch;
            return {
                name: `${branchDisplay.padEnd(40)} ${chalk.gray('→')} ${wt.path}`,
                value: wt,
                short: wt.branch
            };
        });

        const result = await inquirer.prompt([
            {
                type: 'list',
                name: 'selectedWorktree',
                message: 'Choose worktree to navigate to:',
                choices,
                pageSize: Math.min(15, choices.length),
                loop: false
            }
        ]);
        selectedWorktree = result.selectedWorktree;
    }

    if (isShellMode) {
        // In shell mode, output commands for the shell function to execute
        console.log(`cd "${selectedWorktree.path}"`);
        if (shouldOpenInEditor) {
            // Try to open editor
            const editors = ['code', 'cursor', 'subl'];
            for (const editor of editors) {
                try {
                    await new Promise((resolve, reject) => {
                        const proc = spawn('which', [editor], { stdio: 'ignore' });
                        proc.on('close', (code) => {
                            if (code === 0) resolve(editor);
                            else reject();
                        });
                    });
                    console.log(`${editor} "${selectedWorktree.path}" &`);
                    break;
                } catch {
                    // Try next editor
                }
            }
        }
    } else {
        // Normal mode - show instructions
        console.log(chalk.cyan(`\nNavigating to ${selectedWorktree.branch}...`));
        
        // Copy the path to clipboard for easy pasting
        let clipboardSuccess = false;
        try {
            const clipboard = await import('clipboardy');
            await clipboard.default.write(`cd ${selectedWorktree.path}`);
            clipboardSuccess = true;
        } catch (error) {
            // Clipboard functionality is optional
        }

        console.log(chalk.green('✓') + ' To navigate, run:');
        console.log(chalk.yellow(`  cd ${selectedWorktree.path}`));
        if (clipboardSuccess) {
            console.log(chalk.gray('\n(Command copied to clipboard)'));
        }
        
        console.log(chalk.gray('\nTip: For automatic navigation, add this to your shell:'));
        console.log(chalk.blue('  vecna() { eval "$(VECNA_SHELL_MODE=true command vecna "$@")"; }'));

        // Optionally open in editor
        if (shouldOpenInEditor) {
            await openInEditor(selectedWorktree);
        }
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
