import { simpleGit } from 'simple-git';
import { gitUtils } from './git';
import { homedir } from 'os';
import path from 'path';
import fs from 'fs-extra';
import execa from 'execa';
import { spawn } from 'child_process';
import { configManager } from './configManager';

interface WorktreeInfo {
  name: string;
  branch: string;
  path: string;
  isActive: boolean;
  isCurrent: boolean;
  lastCommit: {
    hash: string;
    message: string;
    date: Date;
  };
  status: {
    hasUncommittedChanges: boolean;
    ahead: number;
    behind: number;
    remoteExists: boolean;
  };
  diskUsage?: string;
}

interface CreateOptions {
  branch?: string;
  from?: string;
  noInstall?: boolean;
}

interface WorktreeManager {
  create(branchName: string, fromBranch?: string): Promise<void>;
  createWorktree(branchName: string, options?: CreateOptions): Promise<WorktreeInfo>;
  listWorktrees(): Promise<WorktreeInfo[]>;
  removeWorktree(name: string, force?: boolean): Promise<void>;
  switchToWorktree(name: string): Promise<void>;
  getWorktreeInfo(name: string): Promise<WorktreeInfo>;
  copyConfigFiles(targetPath: string, patterns?: string[]): Promise<void>;
  runPostCreateScripts(path: string): Promise<void>;
  saveWorktreeState(info: WorktreeInfo): Promise<void>;
  getWorktreeState(name: string): Promise<any>;
  cleanOrphanedStates(): Promise<void>;
  cleanWorktreeState(name: string): Promise<void>;
}

export const worktreeManager = (git = simpleGit()): WorktreeManager => {
    const gitRepo = gitUtils(git);
    const config = configManager(fs);

    const create = async (branchName: string, fromBranch: string = 'main'): Promise<void> => {
        console.log(`DEBUG: worktreeManager.create called with branchName='${branchName}', fromBranch='${fromBranch}'`);
        
        const worktreeDir = path.join(homedir(), 'dev', 'trees');
        const worktreeName = branchName.replace(/\//g, '-');
        const worktreePath = path.join(worktreeDir, worktreeName);

        // Ensure the worktree directory exists
        await fs.ensureDir(worktreeDir);

        if (fs.existsSync(worktreePath)) {
            throw new Error(`Worktree path already exists: ${worktreePath}`);
        }

        // Check if branch exists, if not create it with the worktree
        const branchExists = await gitRepo.branchExists(branchName);
        console.log(`DEBUG: branchExists('${branchName}') = ${branchExists}`);
        
        if (branchExists) {
            console.log(`DEBUG: Branch exists, calling addWorktree('${worktreePath}', '${branchName}')`);
            await gitRepo.addWorktree(worktreePath, branchName);
        } else {
            console.log(`DEBUG: Branch doesn't exist, calling addWorktreeWithNewBranch('${worktreePath}', '${branchName}', '${fromBranch}')`);
            await gitRepo.addWorktreeWithNewBranch(worktreePath, branchName, fromBranch);
        }

        // Save worktree state
        await saveWorktreeState({
            name: worktreeName,
            branch: branchName,
            path: worktreePath,
            isActive: true,
            isCurrent: false,
            lastCommit: {
                hash: '',
                message: '',
                date: new Date()
            },
            status: {
                hasUncommittedChanges: false,
                ahead: 0,
                behind: 0,
                remoteExists: true
            }
        });
    };

    const createWorktree = async (branchName: string, options: CreateOptions = {}): Promise<WorktreeInfo> => {
        const { from = 'main', noInstall = false } = options;
        const worktreeDir = path.join(homedir(), 'dev', 'trees');
        const worktreePath = path.join(worktreeDir, branchName.replace(/\//g, '-'));

        if (fs.existsSync(worktreePath)) {
            throw new Error(`Worktree path already exists: ${worktreePath}`);
        }

        const currentBranch = await gitRepo.getCurrentBranch();
        if (currentBranch === branchName) {
            await git.checkout(from);
        }

        await gitRepo.addWorktree(worktreePath, branchName);

        // Stubs for now
        await copyConfigFiles(worktreePath);
        if (!noInstall) {
            await runPostCreateScripts(worktreePath);
        }

        const worktrees = await listWorktrees();
        const newWorktree = worktrees.find(w => w.path === worktreePath);

        if (!newWorktree) {
            throw new Error('Failed to create or find the new worktree.');
        }

        return newWorktree;
    };

    const listWorktrees = async (): Promise<WorktreeInfo[]> => {
        const worktrees = await gitRepo.listWorktrees();

        const worktreeInfoPromises = worktrees.map(async (worktree) => {
            try {
                const [commitInfo, aheadBehind, hasUncommittedChanges, remoteExists] = await Promise.all([
                    gitRepo.getCommitInfo(worktree.branch),
                    gitRepo.getAheadBehind(worktree.branch),
                    gitRepo.hasUncommittedChanges(),
                    gitRepo.doesRemoteBranchExist(worktree.branch),
                ]);
                
                return {
                    name: worktree.branch, // Use branch as name since GitWorktree doesn't have name property
                    branch: worktree.branch,
                    path: worktree.path,
                    isCurrent: worktree.isCurrent,
                    isActive: true, // Add required isActive property
                    lastCommit: {
                        hash: commitInfo.hash,
                        message: commitInfo.message,
                        date: new Date(commitInfo.date),
                    },
                    status: {
                        hasUncommittedChanges,
                        ahead: aheadBehind.ahead,
                        behind: aheadBehind.behind,
                        remoteExists,
                    },
                };
            } catch (error) {
                // If there's an error fetching status, provide safe defaults
                console.warn(`Warning: Could not fetch complete status for worktree ${worktree.branch}:`, error instanceof Error ? error.message : String(error));
                
                return {
                    name: worktree.branch, // Use branch as name since GitWorktree doesn't have name property
                    branch: worktree.branch,
                    path: worktree.path,
                    isCurrent: worktree.isCurrent,
                    isActive: true, // Add required isActive property
                    lastCommit: {
                        hash: 'unknown',
                        message: 'Could not fetch commit info',
                        date: new Date(),
                    },
                    status: {
                        hasUncommittedChanges: false,
                        ahead: 0,
                        behind: 0,
                        remoteExists: true, // Default to true to avoid showing as "deleted" when we can't check
                    },
                };
            }
        });

        return Promise.all(worktreeInfoPromises);
    };

    const copyConfigFiles = async (targetPath: string, patterns?: string[]): Promise<void> => {
        const localConfig = await config.readLocalConfig();
        const currentDir = process.cwd();

        // Default files to copy
        const defaultFiles = [
            '.vecna.json',
            'config/master.key',
            'config/application.yml',
            '.env',
            '.env.local'
        ];

        // Get files to copy from config or use defaults
        const filesToCopy = patterns || localConfig?.worktrees?.copyFiles || defaultFiles;

        for (const file of filesToCopy) {
            const sourcePath = path.join(currentDir, file);
            const destPath = path.join(targetPath, file);

            if (await fs.pathExists(sourcePath)) {
                await fs.ensureDir(path.dirname(destPath));
                await fs.copy(sourcePath, destPath);
                console.log(`  Copied ${file}`);
            }
        }
    };

    const runPostCreateScripts = async (targetPath: string): Promise<void> => {
        const localConfig = await config.readLocalConfig();

        // Procfile.dev port modification removed - no longer needed

        // Check if package.json exists before attempting to install dependencies
        const packageJsonPath = path.join(targetPath, 'package.json');
        if (!(await fs.pathExists(packageJsonPath))) {
            console.log('  No package.json found, skipping dependency installation');

            // Still run custom post-create scripts and auto-open
            const postCreateScripts = localConfig?.worktrees?.postCreateScripts || [];
            for (const script of postCreateScripts) {
                console.log(`  Running: ${script}`);
                const [command, ...args] = script.split(' ');
                await execa(command, args, {
                    cwd: targetPath,
                    stdio: 'inherit'
                });
            }

            await handleAutoOpenInCursor(targetPath, localConfig);
            return;
        }

        // Detect package manager - prioritize yarn, then pnpm, then npm
        let packageManager = 'npm';
        if (await fs.pathExists(path.join(targetPath, 'yarn.lock'))) {
            packageManager = 'yarn';
        } else if (await fs.pathExists(path.join(targetPath, 'pnpm-lock.yaml'))) {
            packageManager = 'pnpm';
        } else {
            // Check if yarn is available globally as preferred package manager
            try {
                await execa('yarn', ['--version'], { stdio: 'ignore' });
                packageManager = 'yarn';
            } catch {
                // Fall back to npm if yarn is not available
                packageManager = 'npm';
            }
        }

        // Override with config if specified
        if (localConfig?.worktrees?.packageManager && localConfig.worktrees.packageManager !== 'auto') {
            packageManager = localConfig.worktrees.packageManager;
        }

        // Run package manager install
        console.log(`  Running ${packageManager} install...`);
        await execa(packageManager, ['install'], {
            cwd: targetPath,
            stdio: 'inherit'
        });

        // Run any custom post-create scripts
        const postCreateScripts = localConfig?.worktrees?.postCreateScripts || [];
        for (const script of postCreateScripts) {
            console.log(`  Running: ${script}`);
            const [command, ...args] = script.split(' ');
            await execa(command, args, {
                cwd: targetPath,
                stdio: 'inherit'
            });
        }

        // Auto-open in Cursor if configured
        await handleAutoOpenInCursor(targetPath, localConfig);
    };

    const handleAutoOpenInCursor = async (targetPath: string, localConfig: any): Promise<void> => {
        const editorConfig = localConfig?.worktrees?.editor;

        // Check if auto-open is enabled and Cursor is preferred
        if (editorConfig?.openOnSwitch && (editorConfig?.preferCursor || editorConfig?.command === 'cursor')) {
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
                spawn('cursor', [targetPath], {
                    detached: true,
                    stdio: 'ignore'
                }).unref();

                console.log('  ✓ Opened in Cursor');
            } catch (error) {
                console.log('  ⚠️  Cursor not found, skipping auto-open');
            }
        }
    };


    const saveWorktreeState = async (info: WorktreeInfo): Promise<void> => {
        await config.updateWorktreeState(info.name, {
            branch: info.branch,
            path: info.path,
            createdAt: new Date().toISOString(),
            lastAccessedAt: new Date().toISOString()
        });
    };

    const getWorktreeState = async (name: string): Promise<any> => {
        return await config.getWorktreeState(name);
    };

    const cleanOrphanedStates = async (): Promise<void> => {
        const allStates = await config.getAllWorktreeStates();
        const gitWorktrees = await gitRepo.listWorktrees();
        const validPaths = new Set(gitWorktrees.map(wt => wt.path));

        for (const [name, state] of Object.entries(allStates)) {
            if (!validPaths.has((state as any).path)) {
                await config.removeWorktreeState(name);
                console.log(`Cleaned orphaned state for: ${name}`);
            }
        }
    };

    const cleanWorktreeState = async (name: string): Promise<void> => {
        await config.removeWorktreeState(name);
    };

    return {
        create,
        createWorktree,
        listWorktrees,
        copyConfigFiles,
        runPostCreateScripts,
        saveWorktreeState,
        getWorktreeState,
        cleanOrphanedStates,
        cleanWorktreeState,
        // ... other functions will be implemented later
    } as WorktreeManager;
};
// Implementations will be added in subsequent steps.
