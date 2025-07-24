import { SimpleGit, simpleGit, SimpleGitOptions } from 'simple-git';

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
    addWorktree: async (path: string, branch: string): Promise<void> => {
        await git.raw('worktree', 'add', path, branch);
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

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (line.startsWith('worktree ')) {
            const path = line.substring('worktree '.length);
            const branchLine = lines[i + 2];
            const branch = branchLine.substring('branch refs/heads/'.length);
            const isCurrent = lines.some((l: string) => l.startsWith('HEAD ') && lines.indexOf(l) < i + 4);

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
        const branches = await git.branchLocal();
        return branches.all.includes(name);
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
    }
});
