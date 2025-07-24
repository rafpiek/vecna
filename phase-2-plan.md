# Phase 2: Git Worktrees Management - Implementation Plan

## User's Current Workflow Description

The current manual workflow that Vecna will automate:

1. Copy the branch name
2. Navigate to the main directory of the repository
3. Pull the main branch
4. Switch to the main branch
5. Pull the main branch again
6. Run a custom script (WT) to create a working directory/worktree that:
   - Creates worktree in a specific directory
   - Creates a new directory with proper name based on branch name
   - Copies necessary files to make the application run
7. Manually switch to the trees directory
8. Navigate to the specific worktree directory

### Desired Vecna Workflow

- **`vecna start`**: Type command, paste branch name, and Vecna handles everything automatically
- **`vecna switch`**: Shows all worktrees, navigate with arrows, and switch to desired worktree
- The tool should handle directory navigation and branch switching automatically

### Current WT Script Functionality

```bash
#!/bin/bash

# Create a new git worktree for parallel development
function wt() {
  local original_dir=$(pwd)
  local branch_name="$1"

  # If no branch name provided, use current branch
  if [[ -z "$branch_name" ]]; then
    branch_name=$(git branch --show-current)
    echo "No branch specified, using current branch: $branch_name"
  fi

  local tree_name="${branch_name//\//-}"

  # Create branch if it doesn't exist
  if ! git show-ref --verify --quiet refs/heads/$branch_name; then
    git checkout -b $branch_name
  fi

  # Make sure we're not on the branch we want to create a worktree for
  local current_branch=$(git branch --show-current)
  if [[ "$current_branch" == "$branch_name" ]]; then
    git checkout main
  fi

  # Create worktree directory if it doesn't exist
  mkdir -p ~/dev/trees

  git worktree add ~/dev/trees/$tree_name $branch_name
  cd ~/dev/trees/$tree_name

  # Copy config files if they exist in the original config directory
  if [[ -f "$original_dir/config/master.key" ]]; then
    mkdir -p config
    cp "$original_dir/config/master.key" config/master.key
    echo "Copied master.key to worktree"
  fi

  if [[ -f "$original_dir/config/application.yml" ]]; then
    mkdir -p config
    cp "$original_dir/config/application.yml" config/application.yml
    echo "Copied application.yml to worktree"
  fi

  # Handle Procfile.dev - modify PORT if it exists
  if [[ -f "Procfile.dev" ]]; then
    # Check if -p 3000 exists in the file
    if grep -q "\-p 3000" Procfile.dev; then
      # Find an available port between 3001 and 4000
      local new_port
      for port in $(seq 3001 4000); do
        if ! lsof -i :$port >/dev/null 2>&1; then
          new_port=$port
          break
        fi
      done

      if [[ -n "$new_port" ]]; then
        #sed -i '' "s/-p 3000/-p $new_port/g" Procfile.dev
        echo "Updated Procfile.dev port from 3000 to $new_port"
      else
        echo "Procfile.dev found but couldn't find available port between 3001-4000"
      fi
    fi
  fi

  # Run yarn to install dependencies
  echo "Running yarn to install dependencies..."
  yarn
}
```

## Phase 2 Design Overview

Phase 2 transforms Vecna into a powerful git worktree management tool with modern interactive CLI features. The goal is to streamline the development workflow by automating worktree creation, management, and navigation.

## Core Features

### 1. Worktree Management Commands

#### `vecna start` - Interactive Worktree Creation
**Purpose**: Replace the manual multi-step process with a single interactive command

**Workflow**:
1. Prompt for branch name (with clipboard detection)
2. Validate branch name and check if worktree already exists
3. Execute automated setup:
   - Switch to main branch
   - Pull latest changes
   - Create worktree in configured directory (default: `~/dev/trees/`)
   - Copy configuration files (master.key, application.yml, etc.)
   - Run dependency installation (yarn/npm)
   - Store worktree metadata for future reference
4. Display success message with:
   - Worktree location
   - Quick command to navigate to directory

**Options**:
- `--branch, -b <name>`: Specify branch name directly
- `--no-install`: Skip dependency installation
- `--from <branch>`: Create worktree from specific branch (default: main)

#### `vecna switch` - Interactive Worktree Navigation
**Purpose**: Quick navigation between worktrees with visual feedback

**Features**:
- Interactive list of all worktrees with:
  - Current worktree highlighted
  - Branch name and status
  - Last commit message and date
  - Uncommitted changes indicator
- Fuzzy search by branch name or path
- Arrow key navigation
- Enter to switch
- Additional actions (press key):
  - `d`: Delete worktree
  - `o`: Open in editor
  - `s`: Show status

**Display Format**:
```
┌─ Select Worktree ─────────────────────────────────────┐
│ ▶ feature-user-auth          ✓                        │
│   main                       ● 2 changes              │
│   bugfix-payment-flow                                │
│   feature-new-dashboard      ✓                        │
└───────────────────────────────────────────────────────┘
  ↑/↓: Navigate  Enter: Switch  d: Delete  q: Quit
```

#### `vecna worktree` - Worktree Management Subcommands

##### `vecna worktree list`
- Display all worktrees in table format
- Show: name, branch, path, last commit, disk usage
- Options:
  - `--json`: Output in JSON format
  - `--active`: Show only active worktrees

##### `vecna worktree remove [name]`
- Interactive selection if name not provided
- Confirmation prompt with:
  - Uncommitted changes warning
  - Disk space to be freed
- Options:
  - `--force, -f`: Skip confirmation
  - `--all-unused`: Remove all worktrees not accessed in X days

##### `vecna worktree info [name]`
- Detailed information about specific worktree
- Current branch, commits ahead/behind, file changes

##### `vecna worktree clean`
- Remove orphaned worktrees
- Verify worktree integrity

### 2. Configuration Enhancements

#### Updated Configuration Schema

```typescript
interface VecnaConfig {
  // Existing configuration...
  projects: ProjectConfig[];

  // New worktree configuration
  worktrees: {
    // Base directory for all worktrees
    baseDir: string;              // Default: "~/dev/trees"

    // Files to copy from main repo to worktree
    copyFiles: string[];          // Default: ["config/master.key", "config/application.yml"]

    // Additional paths to copy (supports glob patterns)
    copyPatterns: string[];       // e.g., ["config/*.local", ".env.*"]

    // Default branch to create worktrees from
    defaultBranch: string;        // Default: "main"

    // Auto-install dependencies
    autoInstall: boolean;         // Default: true

    // Preferred package manager
    packageManager: 'yarn' | 'npm' | 'pnpm' | 'auto';  // Default: "auto"

    // Custom setup scripts to run after worktree creation
    postCreateScripts: string[];  // e.g., ["bundle install", "rails db:setup"]

    // Editor integration
    editor: {
      command: string;            // e.g., "code", "cursor", "vim"
      openOnSwitch: boolean;      // Auto-open editor on switch
    };
  };

  // Worktree metadata storage in vecna.json
  worktreeState: {
    [treeName: string]: {
      branch: string;
      path: string;
      createdAt: string;
      lastAccessedAt: string;
      customConfig?: any;
    };
  };
}
```

### 3. Technical Implementation

#### New Utilities

##### `src/utils/worktreeManager.ts`
Core worktree operations and state management

```typescript
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

interface WorktreeManager {
  // Core operations
  createWorktree(branchName: string, options?: CreateOptions): Promise<WorktreeInfo>;
  listWorktrees(): Promise<WorktreeInfo[]>;
  removeWorktree(name: string, force?: boolean): Promise<void>;
  switchToWorktree(name: string): Promise<void>;
  getWorktreeInfo(name: string): Promise<WorktreeInfo>;

  // Utility functions
  copyConfigFiles(targetPath: string, patterns?: string[]): Promise<void>;
  runPostCreateScripts(path: string): Promise<void>;

  // State management
  saveWorktreeState(info: WorktreeInfo): Promise<void>;
  getWorktreeState(name: string): Promise<WorktreeState>;
  cleanOrphanedStates(): Promise<void>;
}
```

##### `src/utils/shellIntegration.ts`
Shell command generation for seamless integration

```typescript
interface ShellIntegration {
  // Generate shell functions
  generateSwitchFunction(shell: 'bash' | 'zsh' | 'fish'): string;
  generateAliases(config: VecnaConfig): string;

  // Shell detection
  detectShell(): string;
  getShellConfigPath(): string;

  // Installation
  installShellIntegration(): Promise<void>;
  uninstallShellIntegration(): Promise<void>;
}
```

#### Enhanced Git Utilities

Extend existing `git.ts` with worktree-specific operations:

```typescript
interface EnhancedGitUtils extends GitUtils {
  // Worktree operations
  addWorktree(path: string, branch: string): Promise<void>;
  removeWorktree(name: string, force?: boolean): Promise<void>;
  listWorktrees(): Promise<GitWorktree[]>;
  pruneWorktrees(): Promise<void>;

  // Branch operations
  createBranch(name: string, from?: string): Promise<void>;
  branchExists(name: string): Promise<boolean>;
  getCurrentBranch(): Promise<string>;

  // Repository state
  hasUncommittedChanges(): Promise<boolean>;
  getCommitInfo(ref: string): Promise<CommitInfo>;
  getAheadBehind(branch: string, against?: string): Promise<{ahead: number, behind: number}>;
}
```

### 4. UI/UX Enhancements

#### Interactive Components

1. **Branch Name Input**
   - Auto-detect from clipboard
   - Validate branch name format
   - Suggest branch names based on patterns
   - Show existing worktrees for the branch

2. **Progress Indicators**
   - Step-by-step progress with spinner
   - Estimated time remaining
   - Detailed logs in verbose mode
   - Error recovery suggestions

3. **Worktree Selector**
   - Rich display with status icons
   - Grouping by project or status
   - Quick filters (active, with changes, by date)
   - Keyboard shortcuts for power users

#### Status Icons and Colors

- 🟢 Active/Current worktree
- 🔵 Clean worktree
- 🟡 Uncommitted changes
- 🔴 Conflicts or errors
- ⚪ Inactive/Stale

### 5. Error Handling and Recovery

#### Common Scenarios

1. **Branch Conflicts**
   - Handle existing worktrees for same branch
   - Suggest alternative names
   - Option to reuse existing worktree

2. **Disk Space**
   - Check available space before creation
   - Suggest cleanup options
   - Show disk usage per worktree

3. **Network Issues**
   - Retry mechanism for git operations
   - Offline mode for local operations
   - Clear error messages with solutions

4. **Rollback / Self-healing**
   - If any step in `vecna start` fails, auto-clean partial worktree unless `--keep-failed` is specified
   - A periodic `vecna doctor` or the `clean` command could verify symlinks and git consistency

### 6. Integration Features

#### Editor Integration

1. **VS Code/Cursor**
   - Auto-open workspace on switch
   - Generate workspace settings
   - Sync extensions and settings

2. **Terminal Integration**
   - Auto-cd on switch
   - Update terminal title
   - Session management

### 7. Implementation Phases

#### Phase 2.1 - Core Functionality (Weeks 1-2)
- Basic worktree creation (`vecna start`)
- Worktree listing and removal
- Configuration file copying
- State management using vecna.json

#### Phase 2.2 - Interactive Features (Week 3)
- Interactive switch command
- Progress indicators
- Error handling
- Basic shell integration

#### Phase 2.3 - Advanced Features (Week 4)
- Worktree cleanup tools
- Editor integration
- Performance optimizations

#### Phase 2.4 - Polish and Testing (Week 5)
- Comprehensive error handling
- Documentation
- Unit and integration tests
- User feedback incorporation

### 8. Dependencies to Add

```json
{
  "dependencies": {
    "ora": "^5.4.1",              // Elegant terminal spinner
    "cli-table3": "^0.6.3",       // Table formatting for list displays
    "clipboardy": "^3.0.0",       // Clipboard integration
    "execa": "^5.1.1",            // Better child process execution
    "fuzzy": "^0.1.3",            // Fuzzy search for worktree selection
    "conf": "^10.2.0",            // Better configuration management
    "terminal-link": "^2.1.1",    // Clickable terminal links
    "boxen": "^5.1.2",            // Boxes for terminal UI
    "listr2": "^5.0.0"            // Task list with progress
  },
  "devDependencies": {
    "@types/fuzzy": "^0.1.5"
  }
}
```

### 9. Migration Strategy

#### From Existing Bash Script

1. **Import Existing Worktrees**
   ```bash
   vecna worktree import --scan-dir ~/dev/trees
   ```

2. **Configuration Migration**
   - Detect existing setup
   - Preserve custom scripts
   - Import worktree metadata

3. **Gradual Adoption**
   - Both tools can coexist
   - Import worktrees on-demand
   - Preserve existing workflows

### 10. Future Enhancements (Post-Phase 2)

1. **Worktree Templates**
   - Save worktree configurations
   - Project-specific setups
   - Team sharing

2. **Advanced Automation**
   - Auto-create worktrees from PR links
   - Integration with issue trackers
   - Smart branch name generation

3. **Performance Features**
   - Parallel worktree creation
   - Incremental file copying
   - Smart caching

### 11. Success Metrics

- Reduce worktree creation time from multiple minutes to under 30 seconds
- Single command instead of 8+ manual steps
- Zero manual directory navigation
- 100% preservation of existing functionality

This plan provides a comprehensive roadmap for implementing Phase 2, transforming Vecna into a powerful worktree management tool while maintaining simplicity and enhancing the developer experience.
