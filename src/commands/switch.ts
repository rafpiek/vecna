import { SimpleGit } from 'simple-git';
import { gitUtils } from '../utils/git';
import { configManager } from '../utils/configManager';
import inquirer from 'inquirer';
import { search } from '@inquirer/prompts';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { spawn } from 'child_process';

async function copyToClipboard(text: string): Promise<void> {
    return new Promise((resolve, reject) => {
        let command: string;
        let args: string[];

        // Determine the platform-specific clipboard command
        if (process.platform === 'darwin') {
            command = 'pbcopy';
            args = [];
        } else if (process.platform === 'linux') {
            command = 'xclip';
            args = ['-selection', 'clipboard'];
        } else if (process.platform === 'win32') {
            command = 'clip';
            args = [];
        } else {
            reject(new Error(`Unsupported platform: ${process.platform}`));
            return;
        }

        const proc = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'] });
        
        proc.stdin.write(text);
        proc.stdin.end();

        proc.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`Clipboard command failed with code ${code}`));
            }
        });

        proc.on('error', (error) => {
            reject(error);
        });
    });
}

interface SwitchOptions {
    json?: boolean;
    editor?: boolean;
    path?: boolean;
}

async function selectWorktreeWithFuzzySearch(worktrees: any[]): Promise<any> {
    const choices = worktrees.map((wt) => {
        const dirName = path.basename(wt.path);
        return {
            name: dirName,
            value: wt
        };
    });

    const selected = await search({
        message: 'Choose worktree to navigate to:',
        source: async (input) => {
            if (!input) {
                return choices;
            }
            
            // Simple fuzzy matching - case insensitive substring search
            const filtered = choices.filter(choice => 
                choice.name.toLowerCase().includes(input.toLowerCase())
            );
            
            return filtered;
        }
    });

    return selected;
}

async function selectWorktreeForJson(worktrees: any[]): Promise<any> {
    return await selectWorktreeWithFuzzySearch(worktrees);
}

export default async (gitInstance: SimpleGit, options: SwitchOptions = {}) => {
    const config = configManager(fs);

    try {
        // Determine project context
        const projectContext = await getProjectContext(gitInstance, config);

        if (!projectContext) {
            // No project context, show project picker
            await showProjectPicker(config, options);
            return;
        }

        // Create git instance for the project
        const projectGit = gitUtils(gitInstance.cwd(projectContext.path));

        // Get basic worktree list (just paths and branches)
        const allWorktrees = await projectGit.listWorktrees();
        
        if (allWorktrees.length === 0) {
            if (options.json) {
                console.log(JSON.stringify({ error: 'No worktrees found' }));
                process.exit(1);
            }
            console.log(chalk.yellow(`No worktrees found for project "${projectContext.name}".`));
            console.log(chalk.gray('Use "vecna start" to create one.'));
            return;
        }

        // Filter out main repo directory - just remove "chatchat" for now
        const worktrees = allWorktrees.filter(wt => {
            const dirName = path.basename(wt.path);
            return dirName !== 'chatchat';
        });

        if (worktrees.length === 0) {
            if (options.json) {
                console.log(JSON.stringify({ error: 'No other worktrees found' }));
                process.exit(1);
            }
            console.log(chalk.yellow(`No other worktrees found for project "${projectContext.name}".`));
            console.log(chalk.gray('Use "vecna start" to create more worktrees.'));
            return;
        }

        // If path mode - output only path for command substitution
        if (options.path) {
            let selected;
            if (worktrees.length === 1) {
                selected = worktrees[0];
            } else {
                // Redirect prompts to stderr, output path to stdout
                const originalWrite = process.stdout.write;
                process.stdout.write = process.stderr.write.bind(process.stderr);
                selected = await selectWorktreeForJson(worktrees);
                process.stdout.write = originalWrite;
            }
            console.log(selected.path);
            return;
        }

        // If JSON mode and single worktree, return it directly for shell integration
        if (options.json) {
            if (worktrees.length === 1) {
                console.log(JSON.stringify({
                    branch: worktrees[0].branch,
                    path: worktrees[0].path
                }));
                return;
            }
            // Multiple worktrees - let user select interactively then output JSON
            const selected = await selectWorktreeForJson(worktrees);
            console.log(JSON.stringify({
                branch: selected.branch,
                path: selected.path
            }));
            return;
        }

        // Simple interactive selection
        await showSimpleWorktreeSelector(worktrees, options.editor || false, projectContext);

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

async function getProjectContext(gitInstance: SimpleGit, config: any) {
    // Check if we're in a directory with .vecna.json (local project)
    const currentDir = process.cwd();
    const vecnaConfigPath = path.join(currentDir, '.vecna.json');

    if (await fs.pathExists(vecnaConfigPath)) {
        const localConfig = await fs.readJson(vecnaConfigPath);
        return {
            name: localConfig.name,
            path: currentDir,
            isLocal: true
        };
    }

    // Check for default project in global config
    const globalConfig = await config.readGlobalConfig();
    if (globalConfig?.defaultProject) {
        return {
            name: globalConfig.defaultProject.name,
            path: globalConfig.defaultProject.path,
            isDefault: true
        };
    }

    return null;
}

async function showProjectPicker(config: any, options: SwitchOptions) {
    const globalConfig = await config.readGlobalConfig();
    const projects = globalConfig?.projects || [];
    const projectList = projects;

    if (projectList.length === 0) {
        if (options.json) {
            console.log(JSON.stringify({ error: 'No projects found' }));
            process.exit(1);
        }
        console.error(chalk.yellow('No projects found.'));
        console.error(chalk.gray('Use "vecna setup" in a project directory to add projects.'));
        console.error(chalk.gray('Or set a default project with "vecna default -p".'));
        return;
    }

    // Redirect all interactive output to stderr to keep stdout clean for shell integration
    const originalStdoutWrite = process.stdout.write;
    process.stdout.write = process.stderr.write.bind(process.stderr);

    console.log(chalk.cyan.bold('🌟 Select Project to Switch Worktrees\n'));

    const choices = projectList.map((project: any) => ({
        name: `${project.name.padEnd(30)} ${chalk.gray('→')} ${project.path}`,
        value: project,
        short: project.name
    }));

    const { selectedProject } = await inquirer.prompt([
        {
            type: 'list',
            name: 'selectedProject',
            message: 'Choose project:',
            choices,
            pageSize: Math.min(15, choices.length),
            loop: false
        }
    ]);

    console.log(chalk.gray(`\nTip: Set "${selectedProject.name}" as default with: vecna default -p\n`));

    // Restore stdout before proceeding
    process.stdout.write = originalStdoutWrite;

    // Now get worktrees for the selected project and continue
    const SimpleGit = (await import('simple-git')).default;
    const projectGit = gitUtils(SimpleGit().cwd(selectedProject.path));

    const allWorktrees = await projectGit.listWorktrees();
    
    if (allWorktrees.length === 0) {
        if (options.json) {
            console.log(JSON.stringify({ error: `No worktrees found for project "${selectedProject.name}"` }));
            process.exit(1);
        }
        console.error(chalk.yellow(`No worktrees found for project "${selectedProject.name}".`));
        console.error(chalk.gray('Use "vecna start" to create one.'));
        return;
    }

    // Filter out main repo directory - just remove "chatchat" for now
    const worktrees = allWorktrees.filter(wt => {
        const dirName = path.basename(wt.path);
        return dirName !== 'chatchat';
    });

    if (worktrees.length === 0) {
        if (options.json) {
            console.log(JSON.stringify({ error: `No other worktrees found for project "${selectedProject.name}"` }));
            process.exit(1);
        }
        console.error(chalk.yellow(`No other worktrees found for project "${selectedProject.name}".`));
        console.error(chalk.gray('Use "vecna start" to create more worktrees.'));
        return;
    }

    await showSimpleWorktreeSelector(worktrees, options.editor || false, selectedProject);
}

async function showSimpleWorktreeSelector(worktrees: any[], shouldOpenInEditor: boolean = false, projectContext?: any): Promise<void> {
    // Redirect all interactive output to stderr to keep stdout clean for shell integration
    const originalStdoutWrite = process.stdout.write;
    process.stdout.write = process.stderr.write.bind(process.stderr);

    console.log(chalk.cyan.bold('🌳 Select Worktree\n'));

    const selectedWorktree = await selectWorktreeWithFuzzySearch(worktrees);

    // Copy cd command to clipboard
    const cdCommand = `cd "${selectedWorktree.path}"`;
    try {
        await copyToClipboard(cdCommand);
        console.log(chalk.green('✓') + ` Copied to clipboard: ${chalk.cyan(cdCommand)}`);
        console.log(chalk.gray('Just paste and press Enter to navigate!'));
    } catch (error) {
        console.log(chalk.yellow('⚠️  Could not copy to clipboard:'), error instanceof Error ? error.message : String(error));
        console.log(chalk.gray(`Run: ${cdCommand}`));
    }

    // Optionally open in editor
    if (shouldOpenInEditor) {
        await openInEditor(selectedWorktree);
    }

    // Restore stdout
    process.stdout.write = originalStdoutWrite;
}


async function openInEditor(worktree: any) {
    console.log(chalk.cyan(`\n📂 Opening ${worktree.branch} in cursor...`));

    try {
        // Check if cursor is available
        await new Promise((resolve, reject) => {
            const { spawn } = require('child_process');
            const proc = spawn('which', ['cursor'], { stdio: 'ignore' });
            proc.on('close', (code: number | null) => {
                if (code === 0) resolve('cursor');
                else reject();
            });
        });

        // Open in cursor
        const { spawn } = require('child_process');
        spawn('cursor', [worktree.path], {
            detached: true,
            stdio: 'ignore'
        }).unref();
        console.log(chalk.green(`✓ Opened in cursor`));
    } catch (error) {
        console.log(chalk.yellow('⚠️  Cursor not found. Install cursor or manually open:'));
        console.log(chalk.gray(`cursor "${worktree.path}"`));
    }
}
