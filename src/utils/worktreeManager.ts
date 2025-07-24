import {
  copyConfigFiles,
  runPostCreateScripts,
} from './worktreeManager';

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

// Implementations will be added in subsequent steps.
