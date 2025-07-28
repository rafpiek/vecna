import { Listr } from 'listr2';
// Dynamic import for clipboardy ESM module
import { gitUtils } from '../utils/git';
import { worktreeManager } from '../utils/worktreeManager';
import { SimpleGit } from 'simple-git';
import chalk from 'chalk';
import path from 'path';
import { homedir } from 'os';
import fs from 'fs-extra';
import { configManager } from '../utils/configManager';
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

interface StartOptions {
    branch?: string;
    install?: boolean;
    from?: string;
    editor?: boolean;
}

export default async (gitInstance: SimpleGit, options: StartOptions = {}) => {
    const git = gitUtils(gitInstance);
    const manager = worktreeManager(gitInstance);
    const config = configManager(fs);
    
    // Determine project context
    const projectContext = await getProjectContext(gitInstance, config);
    if (!projectContext) {
        throw new Error('No project context found. Run "vecna setup" in a project directory or set a default project with "vecna default -p".');
    }
    
    // Switch to project directory if needed
    if (process.cwd() !== projectContext.path) {
        console.log(chalk.yellow(`Switching to project: ${projectContext.name}`));
        process.chdir(projectContext.path);
        gitInstance.cwd(projectContext.path);
    }

    // Get branch name from options or prompt
    const branchName = options.branch || await getBranchName();
    const fromBranch = options.from || 'main';
    const shouldInstall = options.install !== false;

    // Generate worktree path
    const worktreeDir = path.join(homedir(), 'dev', 'trees');
    const worktreeName = branchName.replace(/\//g, '-');
    const worktreePath = path.join(worktreeDir, worktreeName);

    const tasks = new Listr([
        {
            title: 'Validating branch name',
            task: async (ctx) => {
                if (!branchName) {
                    throw new Error('Branch name is required');
                }
                ctx.branchName = branchName;
                ctx.worktreePath = worktreePath;
            },
        },
        {
            title: `Checking out to ${fromBranch} branch`,
            task: async () => {
                const currentBranch = await git.getCurrentBranch();
                if (currentBranch !== fromBranch) {
                    await git.checkout(fromBranch);
                }
            },
        },
        {
            title: 'Pulling latest changes',
            skip: async () => {
                const hasRemotes = await git.hasRemotes();
                const hasTracking = hasRemotes ? await git.hasTrackingBranch() : false;
                if (!hasRemotes) {
                    return 'No remotes configured - working locally';
                }
                if (!hasTracking) {
                    return 'No tracking branch configured - working locally';
                }
                return false;
            },
            task: async () => {
                await git.pull();
            },
        },
        {
            title: 'Checking branch availability',
            task: async () => {
                const branchInUse = await git.isBranchInUseByWorktree(branchName);
                if (branchInUse.inUse) {
                    throw new Error(`Branch '${branchName}' is already checked out in worktree: ${branchInUse.worktreePath}. Use 'vecna switch' to navigate there, or choose a different branch name.`);
                }
            },
        },
        {
            title: 'Creating worktree',
            task: async (ctx) => {
                await manager.create(branchName, fromBranch);
                ctx.worktreeCreated = true;
            },
        },
        {
            title: 'Copying configuration files',
            task: async (ctx) => {
                await manager.copyConfigFiles(ctx.worktreePath);
            },
        },
        {
            title: 'Installing dependencies',
            skip: () => !shouldInstall,
            task: async (ctx) => {
                await manager.runPostCreateScripts(ctx.worktreePath);
            },
        },
    ]);

    try {
        const ctx = await tasks.run();

        console.log('\n' + chalk.green('✓') + ' Worktree created successfully!');
        console.log('\nLocation: ' + chalk.cyan(ctx.worktreePath));
        
        // Copy cd command to clipboard
        const cdCommand = `cd "${ctx.worktreePath}"`;
        try {
            await copyToClipboard(cdCommand);
            console.log('\n' + chalk.green('✓') + ` Copied to clipboard: ${chalk.cyan(cdCommand)}`);
            console.log(chalk.gray('Just paste and press Enter to navigate!'));
        } catch (error) {
            console.log('\n' + chalk.yellow('⚠️  Could not copy to clipboard'));
            console.log('To navigate to your worktree:');
            console.log(chalk.yellow(`  cd ${ctx.worktreePath}`));
        }

        // Optionally open in editor
        if (options.editor) {
            await openInEditor(ctx.worktreePath, ctx.branchName);
        }

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('\n' + chalk.red('✗') + ' Failed to create worktree:', errorMessage);
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

async function getBranchName(): Promise<string> {
    const tasks = new Listr([
        {
            title: 'Enter branch name',
            task: async (ctx, task) => {
                const branchName = await task.prompt({
                    type: 'input',
                    message: 'Enter branch name:',
                });

                if (!branchName) {
                    throw new Error('Branch name is required');
                }

                ctx.branchName = branchName;
            },
        },
    ]);

    const { branchName } = await tasks.run();
    return branchName;
}

async function openInEditor(worktreePath: string, branchName: string) {
    console.log(chalk.cyan(`\n📂 Opening ${branchName} in cursor...`));

    try {
        // Check if cursor is available
        await new Promise((resolve, reject) => {
            const proc = spawn('which', ['cursor'], { stdio: 'ignore' });
            proc.on('close', (code: number | null) => {
                if (code === 0) resolve('cursor');
                else reject();
            });
        });

        // Open in cursor
        spawn('cursor', [worktreePath], {
            detached: true,
            stdio: 'ignore'
        }).unref();
        console.log(chalk.green(`✓ Opened in cursor`));
    } catch (error) {
        console.log(chalk.yellow('⚠️  Cursor not found. Install cursor or manually open:'));
        console.log(chalk.gray(`cursor "${worktreePath}"`));
    }
}
