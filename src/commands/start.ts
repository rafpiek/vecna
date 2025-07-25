import { Listr } from 'listr2';
// Dynamic import for clipboardy ESM module
import { gitUtils } from '../utils/git';
import { worktreeManager } from '../utils/worktreeManager';
import { SimpleGit } from 'simple-git';
import chalk from 'chalk';
import path from 'path';
import { homedir } from 'os';

interface StartOptions {
    branch?: string;
    install?: boolean;
    from?: string;
}

export default async (gitInstance: SimpleGit, options: StartOptions = {}) => {
    const git = gitUtils(gitInstance);
    const manager = worktreeManager(gitInstance);

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
        console.log('\nTo navigate to your worktree:');
        console.log(chalk.yellow(`  cd ${ctx.worktreePath}`));

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('\n' + chalk.red('✗') + ' Failed to create worktree:', errorMessage);
        process.exit(1);
    }
};

async function getBranchName(): Promise<string> {
    const clipboard = await import('clipboardy');
    const clipboardContent = await clipboard.default.read().catch(() => '');

    const tasks = new Listr([
        {
            title: 'Enter branch name',
            task: async (ctx, task) => {
                const branchName = await task.prompt({
                    type: 'input',
                    message: 'Enter branch name:',
                    initial: clipboardContent,
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
