# Phase 2B: Smart Branch Cleanup - Implementation Plan

## 🧹 **vecna tidy - Feature Specification**

### **Core Logic:**
1. **Branch Detection:** Check if local branches no longer exist on remote (after `git fetch`)
2. **Safety:** Single confirmation for all deletions, reset uncommitted changes, protect only `main`
3. **Cleanup Order:** Remove worktrees first, then delete local branches
4. **Scope:** Local-only operations, no remote modifications
5. **Location:** Always operate from project root directory

### **Command Behavior:**
```bash
vecna tidy [options]
```

**Options:**
- `--dry-run` - Show what would be deleted without doing it
- `--force` - Skip confirmation prompt
- `--keep-pattern="pattern"` - Protect additional branch patterns

## **Implementation Plan**

### **Phase 1: Core Infrastructure Updates**

#### **1.1 Update Project Configuration Schema**
```typescript
// src/utils/configManager.ts
interface ProjectConfig {
  name: string;
  path: string;           // This should be project ROOT, not current dir
  mainBranch?: string;    // Default 'main'
  // ... existing fields
}
```

#### **1.2 Enhance Setup Command**
```typescript
// src/commands/setup.ts - Update setup logic
async function setupProject() {
  // Auto-detect git root directory
  const gitRoot = await findGitRoot(process.cwd());
  
  // Verify this is the main repository (not a worktree)
  const isMainRepo = await isMainRepository(gitRoot);
  
  if (!isMainRepo) {
    throw new Error('Setup must be run from the main repository directory, not a worktree');
  }
  
  // Use git root as project path
  const projectConfig = {
    name: path.basename(gitRoot),
    path: gitRoot,  // Always use git root
    mainBranch: await detectMainBranch(gitRoot),
    // ... other config
  };
}
```

#### **1.3 Add Git Root Detection Utility**
```typescript
// src/utils/git.ts - Add new functions
interface EnhancedGitUtils {
  // ... existing methods
  
  // New methods for tidy functionality
  findGitRoot(startPath: string): Promise<string>;
  isMainRepository(path: string): Promise<boolean>;
  detectMainBranch(): Promise<string>;
  getRemoteTrackingBranches(): Promise<string[]>;
  getLocalBranches(): Promise<string[]>;
  isBranchMergedIntoMain(branch: string, mainBranch: string): Promise<boolean>;
  doesRemoteBranchExist(branch: string): Promise<boolean>;
  resetUncommittedChanges(worktreePath: string): Promise<void>;
}
```

### **Phase 2: Tidy Command Implementation**

#### **2.1 Create Tidy Command Structure**
```typescript
// src/commands/tidy.ts
interface TidyOptions {
  dryRun?: boolean;
  force?: boolean;
  keepPattern?: string;
}

interface CleanupPlan {
  worktreesToRemove: Array<{
    name: string;
    path: string;
    branch: string;
    hasUncommittedChanges: boolean;
    reason: string; // e.g., "branch deleted from remote"
  }>;
  branchesToDelete: Array<{
    name: string;
    reason: string;
  }>;
}

export default async (gitInstance: SimpleGit, options: TidyOptions = {}) => {
  const git = gitUtils(gitInstance);
  const config = configManager(fs);
  const manager = worktreeManager(gitInstance);
  
  // 1. Ensure we're in project root
  await ensureInProjectRoot(config);
  
  // 2. Switch to main branch and update
  await prepareMainBranch(git, config);
  
  // 3. Analyze what needs cleanup
  const cleanupPlan = await analyzeCleanupNeeds(git, manager, config, options);
  
  // 4. Present plan and get confirmation
  if (!options.force) {
    await confirmCleanupPlan(cleanupPlan);
  }
  
  // 5. Execute cleanup
  await executeCleanup(cleanupPlan, git, manager, options);
};
```

#### **2.2 Core Analysis Logic**
```typescript
async function analyzeCleanupNeeds(
  git: GitUtils, 
  manager: WorktreeManager, 
  config: ConfigManager,
  options: TidyOptions
): Promise<CleanupPlan> {
  
  // Get all local branches except main
  const localBranches = await git.getLocalBranches();
  const mainBranch = await getMainBranch(config);
  const branchesToCheck = localBranches.filter(b => 
    b !== mainBranch && !isProtectedBranch(b, options.keepPattern)
  );
  
  // Check which branches no longer exist on remote
  const branchesToDelete: Array<{name: string, reason: string}> = [];
  const worktreesToRemove: Array<WorktreeCleanupInfo> = [];
  
  for (const branch of branchesToCheck) {
    const remoteExists = await git.doesRemoteBranchExist(branch);
    
    if (!remoteExists) {
      branchesToDelete.push({
        name: branch,
        reason: 'Branch deleted from remote'
      });
      
      // Check if this branch has a worktree
      const worktrees = await manager.listWorktrees();
      const associatedWorktree = worktrees.find(w => w.branch === branch);
      
      if (associatedWorktree) {
        const hasChanges = associatedWorktree.status?.hasUncommittedChanges || false;
        worktreesToRemove.push({
          name: associatedWorktree.name,
          path: associatedWorktree.path,
          branch: branch,
          hasUncommittedChanges: hasChanges,
          reason: 'Associated branch deleted from remote'
        });
      }
    }
  }
  
  return { worktreesToRemove, branchesToDelete };
}
```

#### **2.3 Cleanup Execution Logic**
```typescript
async function executeCleanup(
  plan: CleanupPlan,
  git: GitUtils,
  manager: WorktreeManager,
  options: TidyOptions
) {
  
  // Phase 1: Remove worktrees
  if (plan.worktreesToRemove.length > 0) {
    console.log(chalk.cyan('\n🗂️  Cleaning up worktrees...'));
    
    for (const worktree of plan.worktreesToRemove) {
      if (worktree.hasUncommittedChanges && !options.dryRun) {
        console.log(`  Resetting uncommitted changes in ${worktree.name}...`);
        await git.resetUncommittedChanges(worktree.path);
      }
      
      if (!options.dryRun) {
        await git.removeWorktree(worktree.path, true); // force=true
        await manager.cleanWorktreeState(worktree.name);
      }
      
      console.log(`  ${options.dryRun ? 'Would remove' : 'Removed'} worktree: ${worktree.name}`);
    }
  }
  
  // Phase 2: Delete local branches
  if (plan.branchesToDelete.length > 0) {
    console.log(chalk.cyan('\n🌿 Cleaning up local branches...'));
    
    for (const branch of plan.branchesToDelete) {
      if (!options.dryRun) {
        await git.deleteBranch(branch.name, true); // force=true
      }
      
      console.log(`  ${options.dryRun ? 'Would delete' : 'Deleted'} branch: ${branch.name}`);
    }
  }
}
```

### **Phase 3: UI and Integration**

#### **3.1 Interactive Confirmation**
```typescript
async function confirmCleanupPlan(plan: CleanupPlan): Promise<void> {
  if (plan.worktreesToRemove.length === 0 && plan.branchesToDelete.length === 0) {
    console.log(chalk.green('✨ Repository is already clean!'));
    return;
  }
  
  console.log(chalk.cyan.bold('\n🧹 Cleanup Plan:'));
  
  if (plan.worktreesToRemove.length > 0) {
    console.log(chalk.yellow('\nWorktrees to remove:'));
    plan.worktreesToRemove.forEach(w => {
      const status = w.hasUncommittedChanges ? chalk.red(' (has uncommitted changes - will reset)') : '';
      console.log(`  • ${w.name} (${w.branch})${status}`);
    });
  }
  
  if (plan.branchesToDelete.length > 0) {
    console.log(chalk.yellow('\nLocal branches to delete:'));
    plan.branchesToDelete.forEach(b => {
      console.log(`  • ${b.name} - ${b.reason}`);
    });
  }
  
  const { confirm } = await inquirer.prompt([{
    type: 'confirm',
    name: 'confirm',
    message: 'Proceed with cleanup?',
    default: false
  }]);
  
  if (!confirm) {
    console.log(chalk.gray('Cleanup cancelled.'));
    process.exit(0);
  }
}
```

#### **3.2 Add Command to CLI**
```typescript
// src/index.ts
program
    .command('tidy')
    .description('Clean up merged branches and associated worktrees')
    .option('--dry-run', 'Show what would be cleaned without doing it')
    .option('--force', 'Skip confirmation prompt')
    .option('--keep-pattern <pattern>', 'Protect branches matching pattern (e.g., "release/*")')
    .action((options) => import('./commands/tidy').then(i => i.default(gitInstance, options)));
```

### **Phase 4: Enhanced Git Utilities**

#### **4.1 New Git Helper Functions**
```typescript
// src/utils/git.ts - Add these methods to GitUtils

async findGitRoot(startPath: string): Promise<string> {
  let currentPath = path.resolve(startPath);
  
  while (currentPath !== path.dirname(currentPath)) {
    if (await fs.pathExists(path.join(currentPath, '.git'))) {
      return currentPath;
    }
    currentPath = path.dirname(currentPath);
  }
  
  throw new Error('Not in a git repository');
}

async isMainRepository(repoPath: string): Promise<boolean> {
  const gitDir = path.join(repoPath, '.git');
  
  if (await fs.pathExists(gitDir)) {
    const stat = await fs.stat(gitDir);
    // If .git is a directory, it's the main repo
    // If .git is a file, it's a worktree (contains "gitdir: ..." pointing to main repo)
    return stat.isDirectory();
  }
  
  return false;
}

async doesRemoteBranchExist(branch: string): Promise<boolean> {
  try {
    const result = await this.git.raw(['ls-remote', '--heads', 'origin', branch]);
    return result.trim().length > 0;
  } catch {
    return false;
  }
}

async resetUncommittedChanges(worktreePath: string): Promise<void> {
  const worktreeGit = simpleGit(worktreePath);
  await worktreeGit.reset(['--hard', 'HEAD']);
  await worktreeGit.clean('f', ['-d']); // Remove untracked files
}
```

## **File Structure Changes**

```
src/
├── commands/
│   ├── tidy.ts           # 🆕 New tidy command
│   └── setup.ts          # 🔄 Enhanced to detect git root
├── utils/
│   ├── git.ts            # 🔄 Enhanced with new git operations
│   └── configManager.ts  # 🔄 Ensure path is always git root
```

## **Testing Strategy**

```typescript
// tests/commands/tidy.test.ts
describe('tidy command', () => {
  it('should detect branches deleted from remote')
  it('should find associated worktrees for deleted branches')
  it('should reset uncommitted changes before cleanup')
  it('should protect main branch from deletion')
  it('should handle dry-run mode correctly')
  it('should work with custom keep patterns')
});
```

## **Usage Examples**

```bash
# See what would be cleaned
vecna tidy --dry-run

# Clean up with confirmation
vecna tidy

# Force cleanup without confirmation
vecna tidy --force

# Protect release branches
vecna tidy --keep-pattern="release/*"
```

## **Expected Workflow**

1. **Navigation**: Command ensures it's running from project root
2. **Preparation**: Switch to main branch, `git pull`, `git fetch`
3. **Analysis**: 
   - Get all local branches
   - Check which ones no longer exist on remote
   - Find associated worktrees for deleted branches
4. **Confirmation**: Present cleanup plan and ask for confirmation
5. **Execution**:
   - Reset uncommitted changes in worktrees to be deleted
   - Remove worktrees first
   - Delete local branches second
   - Clean up vecna metadata

## **Open Questions**

1. Should `vecna tidy` also handle branches that are merged into main but still exist on remote?
2. What about branches that exist locally but never had a remote (never pushed)?
3. Do you want any summary stats at the end (e.g., "Cleaned 3 worktrees, deleted 5 branches, freed 125MB")?

## **Success Criteria**

- ✅ Automatically detect and clean up branches deleted from remote
- ✅ Remove associated worktrees safely (with uncommitted change reset)
- ✅ Single confirmation for entire cleanup operation
- ✅ Protect main branch and configurable patterns
- ✅ Operate from project root directory
- ✅ Provide dry-run capability
- ✅ Local-only operations (no remote modifications)