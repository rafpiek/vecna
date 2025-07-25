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

        // Simple interactive selection
        await showSimpleWorktreeSelector(worktrees, options.editor || false);

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

async function showSimpleWorktreeSelector(worktrees: any[], shouldOpenInEditor: boolean = false): Promise<void> {
    // Interactive mode with colors
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

    const { selectedWorktree } = await inquirer.prompt([
        {
            type: 'list',
            name: 'selectedWorktree',
            message: 'Choose worktree to navigate to:',
            choices,
            pageSize: Math.min(15, choices.length),
            loop: false
        }
    ]);

    // DIRECT NAVIGATION - NO BULLSHIT
    console.log(chalk.cyan(`\nNavigating to ${selectedWorktree.branch}...`));
    
    // Change the current process directory
    process.chdir(selectedWorktree.path);
    
    // Optionally open in editor first
    if (shouldOpenInEditor) {
        await openInEditor(selectedWorktree);
    }
    
    console.log(chalk.green('✓') + ` Changed directory to: ${selectedWorktree.path}`);
    console.log(chalk.yellow('Starting new shell in this directory...'));
    
    // Get user's preferred shell
    const userShell = process.env.SHELL || '/bin/bash';
    
    // Replace the current process with a new shell in the target directory
    const { spawn } = await import('child_process');
    const shellProcess = spawn(userShell, [], {
        cwd: selectedWorktree.path,
        stdio: 'inherit'
    });
    
    // Handle shell exit
    shellProcess.on('close', (code) => {
        console.log(chalk.gray(`\nExited shell (code: ${code})`));
        process.exit(code || 0);
    });
    
    // Handle process termination
    process.on('SIGINT', () => {
        shellProcess.kill('SIGINT');
    });
    
    process.on('SIGTERM', () => {
        shellProcess.kill('SIGTERM');
    });
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
