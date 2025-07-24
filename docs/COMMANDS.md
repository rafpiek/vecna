# Command Reference

Complete reference for all Vecna commands with examples, options, and use cases.

## 📋 Table of Contents

- [Core Commands](#core-commands)
- [Worktree Management](#worktree-management)
- [Development Tools](#development-tools)
- [Utility Commands](#utility-commands)
- [Global Options](#global-options)
- [Exit Codes](#exit-codes)

## 🚀 Core Commands

### `vecna setup`

Initialize vecna configuration for your project.

#### Synopsis
```bash
vecna setup [options]
```

#### Description
Interactive setup wizard that configures vecna for your project. Creates local `.vecna.json` configuration and registers the project globally.

#### Options
None. All configuration is done interactively.

#### Examples

**Basic Setup:**
```bash
cd /path/to/your/project
vecna setup
```

**Interactive Flow:**
```
? Project name: my-web-app
? Main branch: main
? JavaScript linter: eslint
? Ruby linter: rubocop  
? Test runner: rspec
? Worktree base directory: ~/dev/trees
✓ Project setup complete.
```

#### What It Does
1. ✅ Detects project type (JavaScript, Ruby, etc.)
2. ✅ Configures linting tools
3. ✅ Sets up test runners
4. ✅ Creates `.vecna.json` configuration
5. ✅ Creates worktree base directory
6. ✅ Registers project in global config

#### Notes
- Must be run from project root directory
- Creates `.vecna.json` in current directory
- Overwrites existing configuration if present

---

### `vecna start`

Create a new worktree with automated setup.

#### Synopsis
```bash
vecna start [options]
```

#### Description
Automated worktree creation that replaces the complex manual workflow. Handles branch creation, directory setup, file copying, and dependency installation.

#### Options

| Option | Description | Default |
|--------|-------------|---------|
| `-b, --branch <name>` | Specify branch name directly | Interactive prompt |
| `--from <branch>` | Create worktree from specific branch | `main` |
| `--no-install` | Skip dependency installation | Install enabled |

#### Examples

**Interactive Mode:**
```bash
vecna start
# Prompts for branch name, detects clipboard content
```

**Direct Branch Specification:**
```bash
# Create feature branch
vecna start --branch feature/user-authentication

# Create hotfix from production
vecna start --branch hotfix/security-patch --from production

# Quick setup without dependencies
vecna start --branch quick-test --no-install
```

**Real-world Examples:**
```bash
# Start working on a GitHub issue
vecna start --branch feature/issue-123-add-dark-mode

# Create hotfix branch
vecna start --branch hotfix/urgent-security-fix --from production

# Experiment without full setup
vecna start --branch experiment/new-architecture --no-install
```

#### Process Flow
1. **Branch Validation** - Checks branch name format
2. **Repository Setup** - Switches to base branch and pulls
3. **Branch Creation** - Creates branch if it doesn't exist
4. **Worktree Creation** - Adds worktree to `~/dev/trees/`
5. **File Copying** - Copies config files (master.key, .env, etc.)
6. **Port Management** - Updates Procfile.dev ports automatically
7. **Dependencies** - Runs package manager (yarn/npm/pnpm)
8. **Editor Integration** - Opens in Cursor if configured

#### Output Example
```
✓ Validating branch name
✓ Checking out to main branch  
✓ Pulling latest changes
✓ Creating branch: feature/user-auth
✓ Creating worktree
  Copied config/master.key
  Copied config/application.yml
  Updated Procfile.dev port from 3000 to 3001
✓ Running yarn install...
✓ Opened in Cursor

🎉 Worktree created successfully!
📁 Path: ~/dev/trees/feature-user-auth
💡 Run: cd ~/dev/trees/feature-user-auth
```

---

### `vecna switch`

Interactive worktree switching with rich UI.

#### Synopsis
```bash
vecna switch [options]
```

#### Description
Interactive interface for switching between worktrees with visual status indicators, keyboard shortcuts, and multiple actions.

#### Options

| Option | Description |
|--------|-------------|
| `--json` | Output result in JSON format |

#### Examples

**Interactive Mode:**
```bash
vecna switch
```

**JSON Output (for scripts):**
```bash
vecna switch --json
```

#### Interactive Interface

**Main View:**
```
🌳 Vecna Worktree Switcher

Press h for help

? Select worktree or action: (Use arrow keys)
❯ ● current    main                         7/24/2025    
  ● changes    feature-user-auth            7/23/2025    ↑2↓0
  ○ clean      bugfix-login                 7/22/2025    
  ──────────────
  🔄 Refresh list
  ❓ Toggle help  
  ❌ Quit
```

**Action Menu:**
```
Selected: feature-user-auth. What would you like to do?
❯ 🔄 Switch to this worktree
  🚀 Switch and open in Cursor
  📝 Show detailed info
  🗑️  Delete this worktree
  📂 Open in editor
  ❌ Cancel
```

#### Status Indicators

| Symbol | Meaning |
|--------|---------|
| `● current` | Currently active worktree |
| `● changes` | Has uncommitted changes |
| `○ clean` | Clean working directory |
| `↑2↓0` | 2 ahead, 0 behind main |

#### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `↑/↓` | Navigate options |
| `Enter` | Select worktree/action |
| `h` | Toggle help |
| `q` | Quit |

#### Actions Available

1. **🔄 Switch to worktree** - Copies `cd` command to clipboard
2. **🚀 Switch and open in Cursor** - Switches + opens Cursor editor
3. **📝 Show detailed info** - Shows commit history, status
4. **🗑️ Delete this worktree** - Safe removal with confirmations
5. **📂 Open in editor** - Opens in configured editor
6. **🔄 Refresh list** - Updates worktree status

---

## 🌳 Worktree Management

### `vecna worktree list`

Display all worktrees in table format.

#### Synopsis
```bash
vecna worktree list [options]
```

#### Options

| Option | Description |
|--------|-------------|
| `--json` | Output in JSON format |
| `--active` | Show only active worktrees |

#### Examples

**Standard Table View:**
```bash
vecna worktree list
```

**Output:**
```
┌─────────────────────┬──────────────────────┬────────────────────────────────┬────────────┬──────────┐
│ Name                │ Branch               │ Path                           │ Status     │ Changes  │
├─────────────────────┼──────────────────────┼────────────────────────────────┼────────────┼──────────┤
│ main                │ main                 │ /Users/dev/project             │ ● Current  │ Clean    │
│ feature-user-auth   │ feature/user-auth    │ /Users/dev/trees/feature-user  │ ○ Inactive │ 2 files  │
│ hotfix-security     │ hotfix/security      │ /Users/dev/trees/hotfix-sec    │ ○ Inactive │ Clean    │
└─────────────────────┴──────────────────────┴────────────────────────────────┴────────────┴──────────┘
```

**JSON Output:**
```bash
vecna worktree list --json
```

**JSON Response:**
```json
[
  {
    "name": "main",
    "branch": "main",
    "path": "/Users/dev/project",
    "isCurrent": true,
    "status": {
      "hasUncommittedChanges": false,
      "ahead": 0,
      "behind": 0
    },
    "lastCommit": {
      "hash": "abc123",
      "message": "feat: add user authentication",
      "date": "2024-07-24T10:30:00Z"
    }
  }
]
```

---

### `vecna worktree remove`

Remove worktrees with safety checks.

#### Synopsis
```bash
vecna worktree remove [name] [options]
```

#### Options

| Option | Description |
|--------|-------------|
| `-f, --force` | Skip confirmation prompts |
| `--all-unused` | Remove all worktrees not accessed in X days |

#### Examples

**Interactive Selection:**
```bash
vecna worktree remove
```

**Remove Specific Worktree:**
```bash
vecna worktree remove feature-user-auth
```

**Force Removal:**
```bash
vecna worktree remove feature-user-auth --force
```

**Bulk Cleanup:**
```bash
vecna worktree remove --all-unused
```

#### Interactive Flow
```
? Select worktree to remove: (Use arrow keys)
❯ feature-user-auth    (2 uncommitted changes)
  hotfix-security      (clean)
  experimental-ui      (clean)

⚠️  Worktree 'feature-user-auth' has uncommitted changes!
? Are you sure you want to delete it? (y/N)

✓ Removed worktree: feature-user-auth
💾 Freed 45.2 MB of disk space
```

#### Safety Features
- ✅ Warns about uncommitted changes
- ✅ Shows disk space that will be freed
- ✅ Prevents deletion of current worktree
- ✅ Confirmation prompts (unless `--force`)

---

### `vecna worktree info`

Show detailed information about a worktree.

#### Synopsis
```bash
vecna worktree info [name]
```

#### Examples

**Interactive Selection:**
```bash
vecna worktree info
```

**Specific Worktree:**
```bash
vecna worktree info feature-user-auth
```

#### Output Example
```
📋 Worktree Information: feature-user-auth
──────────────────────────────────────────────

Branch:     feature/user-auth
Path:       ~/dev/trees/feature-user-auth  
Status:     ○ Inactive
Changes:    ● 3 uncommitted files
Last Commit: a1b2c3d - Add login component
Date:       July 23, 2024 2:30 PM
Sync:       2 ahead, 0 behind main
Size:       45.2 MB

Files Changed:
  M  src/components/Login.tsx
  A  src/utils/auth.ts
  ??  src/types/user.ts

Recent Commits:
  a1b2c3d - Add login component (2 hours ago)
  d4e5f6g - Setup authentication routes (1 day ago)
  g7h8i9j - Initial user auth structure (2 days ago)
```

---

### `vecna worktree clean`

Clean orphaned worktrees and verify integrity.

#### Synopsis
```bash
vecna worktree clean [options]
```

#### Description
Removes orphaned worktree states and verifies git worktree integrity.

#### Examples

**Basic Cleanup:**
```bash
vecna worktree clean
```

#### Output Example
```
🧹 Cleaning worktree states...

✓ Scanned 15 worktree states
✓ Found 3 orphaned states  
✓ Cleaned: old-feature-branch
✓ Cleaned: deleted-experiment
✓ Cleaned: merged-hotfix

🗂️  Verifying git worktree integrity...
✓ All worktrees are valid

✨ Cleanup complete! Freed 2.1 MB
```

---

## 🛠️ Development Tools

### `vecna lint`

Run linting on project files with smart filtering.

#### Synopsis
```bash
vecna lint <type> [options]
```

#### Types
- `all` - Lint all supported file types
- `js` - JavaScript/TypeScript files only
- `rb` - Ruby files only

#### Options

| Option | Description |
|--------|-------------|
| `-f, --fix` | Automatically fix issues |
| `-e, --uncommitted` | Lint only uncommitted changes |
| `-c, --committed` | Lint only committed changes |

#### Examples

**Lint All Files:**
```bash
vecna lint all
```

**Fix JavaScript Issues:**
```bash
vecna lint js --fix
```

**Lint Only Uncommitted Changes:**
```bash
vecna lint all --uncommitted
```

**Lint Recent Commits:**
```bash
vecna lint all --committed
```

#### Output Example
```
🔍 Linting JavaScript files...

src/components/Login.tsx
  ✓ No issues found

src/utils/auth.ts  
  ❌ Line 15: Missing semicolon
  ❌ Line 23: Unused variable 'temp'

src/types/user.ts
  ✓ No issues found

📊 Results: 2 files with issues, 2 errors total
💡 Run with --fix to automatically resolve issues
```

---

### `vecna test`

Run tests with intelligent filtering.

#### Synopsis
```bash
vecna test <type> [options]
```

#### Types
- `all` - Run all test types
- `rb` - Ruby tests only (RSpec)

#### Examples

**Run All Tests:**
```bash
vecna test all
```

**Ruby Tests Only:**
```bash
vecna test rb
```

#### Output Example
```
🧪 Running Ruby tests...

RSpec Results:
  ✓ Authentication spec (15 examples, 0 failures)  
  ✓ User model spec (8 examples, 0 failures)
  ❌ Payment spec (12 examples, 2 failures)

Failed Examples:
  1) Payment processes successful transaction
     Expected: true, got: false
     
  2) Payment handles declined cards  
     Expected exception not raised

📊 Total: 35 examples, 2 failures, 0 pending
```

---

## 🔧 Utility Commands

### `vecna shell-install`

Install shell integration for seamless directory switching.

#### Synopsis
```bash
vecna shell-install [options]
```

#### Description
Adds shell functions to your profile for automatic directory navigation after worktree operations.

#### Examples

**Install Shell Integration:**
```bash
vecna shell-install
```

#### Output Example
```
🐚 Installing shell integration...

✓ Shell detected: zsh
✓ Added functions to ~/.zshrc
✓ Created ~/.vecna-shell-integration

Shell functions added:
  - vcd(): Quick directory switching
  - vtree(): List worktree directories

💡 Restart your shell or run: source ~/.zshrc
```

#### Generated Functions
```bash
# Quick switch to worktree directory
vcd feature-user-auth

# List all worktree directories  
vtree
```

---

### `vecna list`

List all registered projects.

#### Synopsis  
```bash
vecna list [options]
```

#### Examples

**List Projects:**
```bash
vecna list
```

#### Output Example
```
📋 Registered Projects:

┌─────────────────┬────────────────────────────────┬─────────────┐
│ Name            │ Path                           │ Main Branch │
├─────────────────┼────────────────────────────────┼─────────────┤
│ my-web-app      │ /Users/dev/my-web-app          │ main        │
│ api-service     │ /Users/dev/api-service         │ master      │
│ mobile-app      │ /Users/dev/mobile-app          │ develop     │
└─────────────────┴────────────────────────────────┴─────────────┘

💡 Use 'vecna setup' in a project directory to register it
```

---

### `vecna version`

Show version information.

#### Synopsis
```bash
vecna version
```

#### Output Example
```bash
vecna version 1.0.0
```

---

## ⚙️ Global Options

These options work with any command:

| Option | Description |
|--------|-------------|
| `-h, --help` | Show help for command |
| `-V, --version` | Show version number |

#### Examples
```bash
# Get help for any command
vecna start --help
vecna worktree remove --help

# Show version
vecna --version
```

---

## 🔢 Exit Codes

Vecna uses standard exit codes:

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | General error |
| `2` | Misuse of command |
| `126` | Command cannot execute |
| `127` | Command not found |

#### Examples in Scripts
```bash
#!/bin/bash

# Check if worktree creation succeeded
if vecna start --branch feature/test --no-install; then
    echo "✓ Worktree created successfully"
else
    echo "✗ Failed to create worktree"
    exit 1
fi

# Use in conditional logic
vecna lint all --uncommitted && echo "Code is clean!" || echo "Fix linting issues"
```

---

## 💡 Usage Tips

### Command Chaining
```bash
# Create worktree and immediately switch
vecna start --branch feature/new && vecna switch

# Lint before creating worktree
vecna lint all && vecna start --branch clean-feature
```

### Scripting Integration
```bash
#!/bin/bash
# Automated workflow script

BRANCH="feature/automated-$(date +%s)"

# Create worktree
vecna start --branch "$BRANCH" --no-install

# Get worktree path
WORKTREE_PATH=$(vecna worktree list --json | jq -r ".[] | select(.branch == \"$BRANCH\") | .path")

# Custom setup
cd "$WORKTREE_PATH"
cp ../custom-config.json ./config.json
npm install

echo "✓ Automated setup complete: $WORKTREE_PATH"
```

### Aliases
Add to your shell profile:
```bash
# Common aliases
alias vs="vecna switch"
alias vst="vecna start"
alias vl="vecna worktree list"
alias vr="vecna worktree remove"
```

---

Need help with a specific command? Use `vecna <command> --help` for detailed information.