import { SimpleGit, simpleGit, SimpleGitOptions } from 'simple-git';
import path from 'path';
import fs from 'fs-extra';
import { fetchCacheManager } from './fetchCacheManager';

export interface ModifiedFiles {
    committed: string[];
    uncommitted: string[];
}

export interface GitWorktree {
    path: string;
    branch: string;
    isCurrent: boolean;
}

export interface CommitInfo {
    hash: string;
    message: string;
    date: string;
}

export const gitUtils = (git: SimpleGit) => ({
    isGitRepo: async (): Promise<boolean> => {
        return await git.checkIsRepo();
    },
    getModifiedFiles: async (mainBranch: string = 'main'): Promise<ModifiedFiles> => {
        const committed = (await git.diff(['--name-only', `${mainBranch}...HEAD`])).split('\n').filter(Boolean);

        const status = await git.status();
        const uncommitted = status.files.map(file => file.path);

        return {
            committed,
            uncommitted
        };
    },
    checkout: async (branch: string): Promise<void> => {
        await git.checkout(branch);
    },
    addWorktree: async (path: string, branch: string): Promise<void> => {
        await git.raw('worktree', 'add', path, branch);
    },
    addWorktreeWithNewBranch: async (path: string, branch: string, from: string = 'HEAD'): Promise<void> => {
        console.log(`DEBUG: Executing: git worktree add -b ${branch} ${path} ${from}`);
        await git.raw('worktree', 'add', '-b', branch, path, from);
    },
    removeWorktree: async (path: string, force?: boolean): Promise<void> => {
        const args = ['worktree', 'remove'];
        if (force) {
            args.push('--force');
        }
        args.push(path);
        await git.raw(...args);
    },
    listWorktrees: async (): Promise<GitWorktree[]> => {
        const worktreeOutput = await git.raw('worktree', 'list', '--porcelain');
        const worktrees: GitWorktree[] = [];
        const lines = worktreeOutput.split('\n').filter(Boolean);
        
        // Get current working directory to determine which worktree is current
        const currentPath = process.cwd();

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (line.startsWith('worktree ')) {
            const path = line.substring('worktree '.length);
            const branchLine = lines[i + 2];
            const branch = branchLine.substring('branch refs/heads/'.length);
            
            // A worktree is current if we're currently in that directory
            const isCurrent = currentPath === path || currentPath.startsWith(path + '/');

            worktrees.push({
              path,
              branch,
              isCurrent,
            });
          }
        }

        return worktrees;
    },
    pruneWorktrees: async (): Promise<void> => {
        await git.raw('worktree', 'prune');
    },
    createBranch: async (name: string, from?: string): Promise<void> => {
        const args = ['-b', name];
        if (from) {
            args.push(from);
        }
        await git.checkout(args);
    },
    branchExists: async (name: string): Promise<boolean> => {
        try {
            // Check local branches first
            const localBranches = await git.branchLocal();
            if (localBranches.all.includes(name)) {
                return true;
            }
            
            // Check remote branches
            const remoteBranches = await git.branch(['-r']);
            const remoteNames = remoteBranches.all.map(branch => 
                branch.startsWith('origin/') ? branch.substring(7) : branch
            );
            if (remoteNames.includes(name)) {
                return true;
            }
            
            // Check if it exists as a commit reference (handles worktree branches)
            try {
                await git.raw(['rev-parse', '--verify', name]);
                return true;
            } catch {
                return false;
            }
        } catch {
            return false;
        }
    },
    getCurrentBranch: async (): Promise<string> => {
        return (await git.branchLocal()).current;
    },
    hasUncommittedChanges: async (): Promise<boolean> => {
        const status = await git.status();
        return !status.isClean();
    },
    getCommitInfo: async (ref: string): Promise<CommitInfo> => {
        const log = await git.log({ [ref]: null, n: 1 });
        if (!log.latest) {
            throw new Error(`Could not get commit info for ref: ${ref}`);
        }
        return {
            hash: log.latest.hash,
            message: log.latest.message,
            date: log.latest.date,
        };
    },
    getAheadBehind: async (branch: string, against: string = 'main'): Promise<{ ahead: number, behind: number }> => {
        const revList = await git.raw('rev-list', '--left-right', '--count', `${against}...${branch}`);
        const [behind, ahead] = revList.trim().split('\t').map(Number);
        return { ahead, behind };
    },
    pull: async (): Promise<void> => {
        await git.pull();
    },
    
    // New functions for tidy command
    findGitRoot: async (startPath: string): Promise<string> => {
        let currentPath = path.resolve(startPath);
        
        while (currentPath !== path.dirname(currentPath)) {
            if (await fs.pathExists(path.join(currentPath, '.git'))) {
                return currentPath;
            }
            currentPath = path.dirname(currentPath);
        }
        
        throw new Error('Not in a git repository');
    },
    
    isMainRepository: async (repoPath: string): Promise<boolean> => {
        const gitDir = path.join(repoPath, '.git');
        
        if (await fs.pathExists(gitDir)) {
            const stat = await fs.stat(gitDir);
            // If .git is a directory, it's the main repo
            // If .git is a file, it's a worktree (contains "gitdir: ..." pointing to main repo)
            return stat.isDirectory();
        }
        
        return false;
    },
    
    getLocalBranches: async (): Promise<string[]> => {
        const branches = await git.branchLocal();
        return branches.all;
    },
    
    doesRemoteBranchExist: async (branch: string): Promise<boolean> => {
        try {
            // Check local remote-tracking branches instead of hitting network with ls-remote
            // This assumes fetch has been called recently (via fetchIfNeeded)
            const remoteBranches = await git.branch(['-r']);
            const remoteBranchName = `origin/${branch}`;
            return remoteBranches.all.includes(remoteBranchName);
        } catch {
            return false;
        }
    },
    
    resetUncommittedChanges: async (worktreePath: string): Promise<void> => {
        const worktreeGit = simpleGit(worktreePath);
        await worktreeGit.reset(['--hard', 'HEAD']);
        await worktreeGit.clean('f', ['-d']); // Remove untracked files
    },
    
    deleteBranch: async (branchName: string, force: boolean = false): Promise<void> => {
        const args = force ? ['-D', branchName] : ['-d', branchName];
        await git.branch(args);
    },
    
    fetch: async (): Promise<void> => {
        await git.fetch();
    },

    fetchIfNeeded: async (): Promise<boolean> => {
        try {
            const repoPath = await gitUtils(git).findGitRoot(process.cwd());
            const cacheManager = fetchCacheManager(fs);

            if (await cacheManager.shouldFetch(repoPath)) {
                await git.fetch();
                await cacheManager.updateFetchTimestamp(repoPath);
                return true; // Fetch was performed
            }

            return false; // Fetch was skipped (cache valid)
        } catch {
            // If anything fails, skip fetch silently
            return false;
        }
    },
    
    hasRemotes: async (): Promise<boolean> => {
        try {
            const remotes = await git.getRemotes();
            return remotes.length > 0;
        } catch {
            return false;
        }
    },
    
    hasTrackingBranch: async (branch?: string): Promise<boolean> => {
        try {
            const currentBranch = branch || await git.revparse(['--abbrev-ref', 'HEAD']);
            const trackingBranch = await git.revparse(['--abbrev-ref', `${currentBranch}@{upstream}`]);
            return !!trackingBranch;
        } catch {
            return false;
        }
    },
    
    pullIfTracking: async (): Promise<boolean> => {
        try {
            const hasRemote = await gitUtils(git).hasRemotes();
            if (!hasRemote) {
                return false; // Skip pull if no remotes
            }
            
            const hasTracking = await gitUtils(git).hasTrackingBranch();
            if (!hasTracking) {
                return false; // Skip pull if no tracking branch
            }
            
            await git.pull();
            return true; // Successfully pulled
        } catch {
            return false; // Failed to pull, but that's ok
        }
    },
    
    isBranchInUseByWorktree: async (branchName: string): Promise<{ inUse: boolean; worktreePath?: string }> => {
        try {
            const worktrees = await gitUtils(git).listWorktrees();
            const inUseWorktree = worktrees.find(wt => wt.branch === branchName);
            return {
                inUse: !!inUseWorktree,
                worktreePath: inUseWorktree?.path
            };
        } catch {
            return { inUse: false };
        }
    }
});
