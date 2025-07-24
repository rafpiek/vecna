import { simpleGit } from 'simple-git';
import { gitUtils } from './git';

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

    return {
        listWorktrees,
        // ... other functions will be implemented later
    } as WorktreeManager;
};
// Implementations will be added in subsequent steps.
