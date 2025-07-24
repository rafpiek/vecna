import { simpleGit } from 'simple-git';
import { gitUtils } from './git';
import { homedir } from 'os';
import path from 'path';
import fs from 'fs-extra';
import execa from 'execa';
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
  };
  diskUsage?: string;
}

interface CreateOptions {
  branch?: string;
  from?: string;
  noInstall?: boolean;
}

interface WorktreeManager {
  create(branchName: string): Promise<void>;
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

    const create = async (branchName: string): Promise<void> => {
        const worktreeDir = path.join(homedir(), 'dev', 'trees');
        const worktreeName = branchName.replace(/\//g, '-');
        const worktreePath = path.join(worktreeDir, worktreeName);

        // Ensure the worktree directory exists
        await fs.ensureDir(worktreeDir);

        if (fs.existsSync(worktreePath)) {
            throw new Error(`Worktree path already exists: ${worktreePath}`);
        }

        await gitRepo.addWorktree(worktreePath, branchName);

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
                behind: 0
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
            const [commitInfo, aheadBehind, hasUncommittedChanges] = await Promise.all([
                gitRepo.getCommitInfo(worktree.branch),
                gitRepo.getAheadBehind(worktree.branch),
                gitRepo.hasUncommittedChanges(),
            ]);

            return {
                name: worktree.branch,
                branch: worktree.branch,
                path: worktree.path,
                isCurrent: worktree.isCurrent,
                isActive: true, // Placeholder
                lastCommit: {
                    hash: commitInfo.hash,
                    message: commitInfo.message,
                    date: new Date(commitInfo.date),
                },
                status: {
                    hasUncommittedChanges,
                    ahead: aheadBehind.ahead,
                    behind: aheadBehind.behind,
                },
                diskUsage: 'N/A', // Placeholder
            };
        });

        return Promise.all(worktreeInfoPromises);
    };

    const copyConfigFiles = async (targetPath: string, patterns?: string[]): Promise<void> => {
        const localConfig = await config.readLocalConfig();
        const currentDir = process.cwd();

        // Default files to copy
        const defaultFiles = [
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

        // Handle Procfile.dev port modification (from original WT script)
        await handleProcfilePortModification(targetPath);

        // Detect package manager
        let packageManager = 'npm';
        if (await fs.pathExists(path.join(targetPath, 'yarn.lock'))) {
            packageManager = 'yarn';
        } else if (await fs.pathExists(path.join(targetPath, 'pnpm-lock.yaml'))) {
            packageManager = 'pnpm';
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
    };

    const handleProcfilePortModification = async (targetPath: string): Promise<void> => {
        const procfilePath = path.join(targetPath, 'Procfile.dev');

        if (await fs.pathExists(procfilePath)) {
            try {
                const procfileContent = await fs.readFile(procfilePath, 'utf-8');

                // Check if -p 3000 exists in the file
                if (procfileContent.includes('-p 3000')) {
                    // Find an available port between 3001 and 4000
                    let newPort = null;

                    for (let port = 3001; port <= 4000; port++) {
                        if (await isPortAvailable(port)) {
                            newPort = port;
                            break;
                        }
                    }

                    if (newPort) {
                        const updatedContent = procfileContent.replace(/-p 3000/g, `-p ${newPort}`);
                        await fs.writeFile(procfilePath, updatedContent);
                        console.log(`  Updated Procfile.dev port from 3000 to ${newPort}`);
                    } else {
                        console.log('  Procfile.dev found but couldn\'t find available port between 3001-4000');
                    }
                }
            } catch (error) {
                console.log('  Warning: Could not modify Procfile.dev port');
            }
        }
    };

    const isPortAvailable = async (port: number): Promise<boolean> => {
        try {
            // Use lsof to check if port is in use (Unix/macOS)
            await execa('lsof', ['-i', `:${port}`], { stdio: 'ignore' });
            return false; // Port is in use
        } catch {
            return true; // Port is available (lsof returned non-zero exit code)
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
