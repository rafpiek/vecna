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
        const selectedPath = await showSimpleWorktreeSelector(worktrees, options.editor || false);
        
        // If VECNA_OUTPUT_PATH is set, just output the path for shell integration
        if (process.env.VECNA_OUTPUT_PATH === 'true') {
            console.log(selectedPath);
        }

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

async function showSimpleWorktreeSelector(worktrees: any[], shouldOpenInEditor: boolean = false): Promise<string> {
    const isPathMode = process.env.VECNA_OUTPUT_PATH === 'true';
    
    if (!isPathMode) {
        // Interactive mode with colors
        console.log(chalk.cyan.bold('🌳 Select Worktree\n'));
    }

    // Simple choices - just branch name and path
    const choices: any[] = worktrees.map((wt) => {
        const branchDisplay = wt.branch.length > 40 ? wt.branch.substring(0, 37) + '...' : wt.branch;
        return {
            name: isPathMode ? `${wt.branch} → ${wt.path}` : `${branchDisplay.padEnd(40)} ${chalk.gray('→')} ${wt.path}`,
            value: wt,
            short: wt.branch
        };
    });

    let selectedWorktree;
    
    if (isPathMode) {
        // In path mode, write to stderr and read from stdin
        process.stderr.write('Choose worktree:\n');
        worktrees.forEach((wt, index) => {
            process.stderr.write(`${index + 1}. ${wt.branch} → ${wt.path}\n`);
        });
        process.stderr.write('Enter choice (1-' + worktrees.length + '): ');
        
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

    if (isPathMode) {
        // In path mode, just return the path
        return selectedWorktree.path;
    }

    // Normal mode - show user-friendly output and copy to clipboard
    console.log(chalk.cyan(`\nNavigating to ${selectedWorktree.branch}...`));
    
    try {
        const clipboard = await import('clipboardy');
        await clipboard.default.write(`cd "${selectedWorktree.path}"`);
    } catch {
        // Clipboard is optional
    }
    
    console.log(chalk.green('✓') + ' Path copied to clipboard!');
    console.log(chalk.yellow('\nTo navigate:'));
    console.log(chalk.bold(`cd "${selectedWorktree.path}"`));
    console.log(chalk.gray('\nTip: For zero-config navigation, add this alias:'));
    console.log(chalk.blue(`alias vs='cd "$(VECNA_OUTPUT_PATH=true vecna switch)"'`));
    
    // Optionally open in editor
    if (shouldOpenInEditor) {
        await openInEditor(selectedWorktree);
    }
    
    return selectedWorktree.path;
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
