import { simpleGit } from 'simple-git';
import { gitUtils } from './git';
import { homedir } from 'os';
import path from 'path';
import fs from 'fs-extra';

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
}

export const worktreeManager = (git = simpleGit()): WorktreeManager => {
    const gitRepo = gitUtils(git);

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
        // Implementation to follow
        console.log(`Copying config files to ${targetPath} with patterns ${patterns}`);
    };

    const runPostCreateScripts = async (path: string): Promise<void> => {
        // Implementation to follow
        console.log(`Running post-create scripts in ${path}`);
    };

    return {
        createWorktree,
        listWorktrees,
        copyConfigFiles,
        runPostCreateScripts,
        // ... other functions will be implemented later
    } as WorktreeManager;
};
// Implementations will be added in subsequent steps.
