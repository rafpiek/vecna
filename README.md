# Vecna 🌳

A powerful CLI tool for managing multi-language monorepos with advanced git worktree automation.

**Transform your development workflow** from 8+ manual steps into a single command. Vecna automates worktree creation, management, and editor integration to streamline parallel development.

## ⚡ Quick Start

```bash
# Setup your project
vecna setup

# Create a new worktree (replaces complex manual workflow)
vecna start --branch feature/user-auth

# Create worktree and open in Cursor editor
vecna start --branch feature/user-auth -e

# Switch between worktrees interactively
vecna switch

# Open worktree in Cursor editor
vecna switch -e

# Spawn new shell in selected worktree
vecna switch -s

# Combine both - open in editor and spawn shell
vecna switch -e -s
```

## 📋 Table of Contents

- [Installation](#installation)
- [Features](#features)
- [Commands](#commands)
- [Configuration](#configuration)
- [Shell Aliases](#shell-aliases)
- [Workflow Examples](#workflow-examples)
- [Editor Integration](#editor-integration)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

## 🚀 Installation

### Prerequisites

- Node.js 16+ 
- Git 2.20+
- A git repository

### Install from Source

```bash
git clone <repository-url>
cd vecna
npm install
npm run build
npm link  # Makes 'vecna' command available globally
```

## ✨ Features

### 🌳 **Advanced Worktree Management**
- **One-command worktree creation** - Replace 8+ manual steps with `vecna start`
- **Interactive worktree switching** - Visual selection with status indicators and fuzzy search
- **Automatic configuration copying** - master.key, application.yml, .env files
- **Dependency installation** - Automatic yarn/npm/pnpm detection and install
- **Shell integration** - Spawn new shells directly in worktree directories
- **Smart cleanup** - Automated cleanup of merged branches and orphaned worktrees

### 🎯 **Developer Experience**
- **Rich interactive UI** - Colored output with progress indicators
- **Clipboard integration** - Auto-copies navigation commands
- **Status awareness** - Shows uncommitted changes, ahead/behind status
- **Keyboard shortcuts** - Efficient navigation with arrow keys and hotkeys

### 🖥️ **Editor Integration**
- **Cursor support** - Open worktrees directly in Cursor editor
- **Auto-open configuration** - Automatically open editor on worktree creation
- **Smart detection** - Graceful fallback when editors aren't available

### 🛠️ **Multi-Language Support**
- **JavaScript/TypeScript** - ESLint integration, npm/yarn/pnpm support
- **Ruby** - RuboCop linting, RSpec testing
- **Extensible** - Easy to add support for other languages

### ⚙️ **Flexible Configuration**
- **Project-specific settings** - Local `.vecna.json` configuration
- **Global preferences** - User-wide settings in `~/.config/vecna/`
- **Customizable workflows** - Post-creation scripts, custom file patterns

## 📖 Commands

### Core Commands

#### `vecna setup`
Initialize vecna for your project with interactive configuration.

```bash
vecna setup
```

**Features:**
- Auto-detects project type (JavaScript, Ruby, etc.)
- Configures linting and testing tools
- Creates local `.vecna.json` configuration
- Sets up worktree directories

#### `vecna start [options]`
Create a new worktree with automated setup.

```bash
# Interactive mode - prompts for branch name
vecna start

# Specify branch directly
vecna start --branch feature/payment-flow

# Create from specific branch (default: main)
vecna start --branch hotfix/urgent-fix --from production

# Skip dependency installation
vecna start --branch quick-test --no-install

# Create worktree and open in Cursor editor
vecna start --branch feature/payment-flow -e
```

**Automated Process:**
1. ✅ Validates branch name
2. ✅ Switches to base branch (main)
3. ✅ Pulls latest changes
4. ✅ Creates branch if needed
5. ✅ Creates worktree in `~/dev/trees/`
6. ✅ Copies configuration files
7. ✅ Installs dependencies
8. ✅ Opens in editor (if `-e` flag used)

#### `vecna switch [options]`
Interactive worktree switching with rich UI.

```bash
# Interactive selection (directory switch only)
vecna switch

# Interactive selection with editor opening
vecna switch -e
vecna switch --editor

# Spawn new shell in selected worktree directory
vecna switch -s
vecna switch --shell

# Combine multiple options
vecna switch -e -s  # Open in editor AND spawn shell

# JSON output for scripts
vecna switch --json

# Path-only output for command substitution
vecna switch --path
```

**Interactive Features:**
- 🔄 **Switch to worktree** - Navigate to directory (default behavior)
- 🚀 **Switch and open in editor** - Navigate + open editor (with `-e` flag)
- 🐚 **Spawn new shell** - Open new shell in worktree directory (with `-s` flag)
- 🎯 **Fuzzy search** - Type to filter worktrees by name
- 📊 **Status indicators** - Visual indicators show worktree status at a glance
- 📋 **Multiple output modes** - JSON, path-only, or interactive
- 🏠 **Project context** - Works from any directory with default project

**Status Indicators:**
- 🗑️ Remote deleted (red) - ● Current (green) - ● Changes (yellow) - ● Sync needed (blue) - ○ Clean (gray)

### Worktree Management

#### `vecna worktree list`
Display all worktrees in table format.

```bash
# Standard table view
vecna worktree list

# JSON output
vecna worktree list --json

# Show only active worktrees
vecna worktree list --active
```

#### `vecna worktree remove [name]`
Remove worktrees and their associated local branches with safety checks.

```bash
# Interactive selection with fuzzy search and status indicators (default)
vecna worktree remove

# Remove specific worktree by name
vecna worktree remove feature-payment

# Force removal (skip confirmations)
vecna worktree remove feature-payment --force

# Remove all unused worktrees
vecna worktree remove --all-unused

# List only worktrees that no longer exist on disk
vecna worktree remove --gone
```

**Complete Cleanup:**
- ✅ Removes the worktree directory
- ✅ Deletes the associated local branch
- ✅ Cleans up internal state
- ✅ Shows clear success/failure messages

**Status Indicators:**
- 🗑️ Remote branch deleted (red - safe to remove)
- ● Current worktree (green)
- ● Has uncommitted changes (yellow)
- ● Ahead/behind remote (blue)
- ○ Clean worktree (gray)

#### `vecna worktree info [name]`
Show detailed information about a worktree.

```bash
# Interactive selection with fuzzy search (default)
vecna worktree info

# Specific worktree by name
vecna worktree info feature-payment
```

#### `vecna worktree clean [options]`
Clean up orphaned worktrees and verify integrity.

```bash
# Interactive cleanup
vecna worktree clean

# See what would be cleaned without making changes
vecna worktree clean --dry-run

# Skip confirmation prompts
vecna worktree clean --force
```

### Development Tools

#### `vecna lint [type] [options]`
Run linting on project files.

```bash
# Lint all files
vecna lint all

# JavaScript/TypeScript only
vecna lint js

# Ruby only  
vecna lint rb

# Fix issues automatically
vecna lint all --fix

# Lint only uncommitted changes
vecna lint all --uncommitted

# Lint only committed changes
vecna lint all --committed
```

#### `vecna test [type] [options]`
Run tests with smart filtering.

```bash
# Run all tests
vecna test all

# Ruby tests only
vecna test rb

# Test only uncommitted changes
vecna test all --uncommitted
vecna test rb --uncommitted

# Test only committed changes against main branch
vecna test all --committed
vecna test rb --committed
```

### Utility Commands

#### `vecna shell-install`
Install shell integration for seamless directory switching.

```bash
vecna shell-install
```

**Features:**
- Auto-detects shell type (bash, zsh, fish)
- Adds `vecna-switch` function to shell configuration
- Enables automatic directory changes
- Works across different operating systems

#### `vecna go <ticketNumber>`
Navigate to worktree containing the specified ticket number.

```bash
# Find and navigate to worktree with ticket number
vecna go PROJ-123
vecna go 456
```

#### `vecna tidy [options]`
Clean up merged branches and associated worktrees.

```bash
# Interactive cleanup of merged branches
vecna tidy

# See what would be cleaned without making changes
vecna tidy --dry-run

# Skip confirmation prompts
vecna tidy --force

# Protect branches matching pattern
vecna tidy --keep-pattern "release/*"
```

#### `vecna list`
List all registered projects.

```bash
vecna list
```

#### `vecna default [options]`
Manage default project settings.

```bash
# Show current default project
vecna default

# Set default project interactively
vecna default --project
vecna default -p

# Clear default project
vecna default --clear
```

#### `vecna reset`
Reset global configuration (removes all project settings).

```bash
vecna reset
```

#### `vecna version`
Show the current version of vecna.

```bash
vecna version
```

## ⚙️ Configuration

### Project Configuration (`.vecna.json`)

Located in your project root:

```json
{
  "name": "my-project",
  "path": "/Users/you/dev/my-project",
  "mainBranch": "main",
  "linter": {
    "js": "eslint",
    "rb": "rubocop"
  },
  "test": {
    "rb": "rspec"
  },
  "worktrees": {
    "baseDir": "~/dev/trees",
    "copyFiles": [
      "config/master.key",
      "config/application.yml",
      ".env",
      ".env.local"
    ],
    "copyPatterns": [
      "config/*.local",
      ".env.*"
    ],
    "defaultBranch": "main",
    "autoInstall": true,
    "packageManager": "auto",
    "postCreateScripts": [
      "bundle install",
      "rails db:migrate"
    ],
    "editor": {
      "command": "cursor",
      "openOnSwitch": true,
      "preferCursor": true
    }
  }
}
```

### Global Configuration (`~/.config/vecna/config.json`)

Stores user-wide settings and project registry:

```json
{
  "projects": [
    {
      "name": "my-project",
      "path": "/Users/you/dev/my-project",
      "mainBranch": "main"
    }
  ],
  "defaultProject": {
    "name": "my-project",
    "path": "/Users/you/dev/my-project"
  }
}
```

### Configuration Options

| Option | Description | Default |
|--------|-------------|---------|
| `worktrees.baseDir` | Directory for all worktrees | `~/dev/trees` |
| `worktrees.copyFiles` | Files to copy to new worktrees | `[config/master.key, config/application.yml]` |
| `worktrees.defaultBranch` | Base branch for worktrees | `main` |
| `worktrees.autoInstall` | Auto-install dependencies | `true` |
| `worktrees.packageManager` | Preferred package manager | `auto` |
| `editor.command` | Editor command | `cursor` |
| `editor.openOnSwitch` | Auto-open editor | `false` |
| `editor.preferCursor` | Prefer Cursor over other editors | `false` |

## ⚡ Shell Aliases

**Supercharge your productivity** with suggested shell aliases that reduce typing by up to 78%!

### 🚀 Quick Start Aliases

```bash
# Add to your ~/.zshrc for lightning-fast vecna commands
alias vs="vecna start"                    # Start new worktree
alias vw="vecna switch"                   # Switch between worktrees  
alias vws="vecna switch -s"               # Switch and spawn shell
alias vwe="vecna switch -e"               # Switch and open editor
alias vwse="vecna switch -e -s"           # Switch, open editor, and spawn shell

alias vwl="vecna worktree list"           # List all worktrees
alias vwr="vecna worktree remove"         # Remove worktree (interactive)
alias vwi="vecna worktree info"           # Show worktree info
alias vwc="vecna worktree clean"          # Clean orphaned worktrees

alias vl="vecna lint all"                 # Lint all files
alias vlf="vecna lint all --fix"          # Lint and auto-fix
alias vt="vecna test all"                 # Run all tests
alias vtidy="vecna tidy"                  # Clean up merged branches

alias vg="vecna go"                       # Navigate to ticket worktree
alias vlist="vecna list"                  # List all projects
alias vsetup="vecna setup"                # Setup new project
```

### 💡 Productivity Benefits

- **78% less typing**: `vecna switch -e -s` → `vwse`
- **73% less typing**: `vecna worktree list --active` → `vwla`
- **Muscle memory**: Consistent `v` prefix for all commands
- **Fewer errors**: Less typing means fewer typos

### 📖 Complete Alias Guide

**[📄 View Complete Aliases Documentation →](aliases.md)**

The complete `aliases.md` file includes:
- ✅ **120+ suggested aliases** for all vecna commands
- ✅ **Smart functions** for complex workflows  
- ✅ **Installation instructions** for zsh/bash
- ✅ **Team collaboration** tips
- ✅ **Customization guidance**

## 🔄 Workflow Examples

### Feature Development

```bash
# Start working on a new feature with editor
vecna start --branch feature/user-authentication -e

# Switch between main and feature work
vecna switch -e -s  # Opens in Cursor AND spawns shell

# When done, clean up
vecna worktree remove feature-user-authentication
```

### Hotfix Workflow

```bash
# Create hotfix from production and open in editor
vecna start --branch hotfix/security-patch --from production -e

# Quick switch with shell spawn for testing
vecna switch -s
# Select: hotfix/security-patch → spawns shell in worktree

# Clean up when deployed
vecna worktree remove hotfix-security-patch
```

### Multi-Feature Development

```bash
# Create multiple worktrees for parallel work
vecna start --branch feature/payment-flow
vecna start --branch feature/user-dashboard  
vecna start --branch bugfix/login-issue

# View all active work
vecna worktree list

# Switch between them efficiently with shell spawning
vecna switch -s  # Interactive selection + new shell in directory
```

### Development Environment Setup

```bash
# Complete development setup in one command
vecna switch -e -s
# This will:
# 1. Show interactive worktree selector
# 2. Open selected worktree in Cursor editor
# 3. Spawn new shell in that directory
# 4. Ready to code immediately!
```

## 🖥️ Editor Integration

### Cursor Integration

Vecna provides first-class support for [Cursor](https://cursor.sh/), the AI-powered code editor.

#### Features
- **Direct integration** - Open worktrees in Cursor with one command
- **Auto-detection** - Checks if Cursor is installed automatically
- **Smart fallback** - Helpful error messages with download links
- **Configuration** - Enable auto-open for new worktrees

#### Usage

**Interactive Switch:**
```bash
# Select worktree and open in Cursor
vecna switch -e

# Select worktree and spawn shell
vecna switch -s

# Both editor and shell
vecna switch -e -s
```

**Auto-open Configuration:**
```json
{
  "worktrees": {
    "editor": {
      "command": "cursor",
      "openOnSwitch": true,
      "preferCursor": true
    }
  }
}
```

**Installation Check:**
If Cursor isn't installed, vecna will show:
```
⚠️  Cursor not found. Please install Cursor or use the regular switch option.
You can download Cursor from: https://cursor.sh/
```

### Other Editors

Vecna also supports other editors through the generic editor integration:
- VS Code (`code`)
- Sublime Text (`subl`)
- Atom (`atom`)
- Vim (`vim`)

## 🔧 Troubleshooting

### Common Issues

#### Worktree Creation Fails

**Problem:** `git pull` fails during worktree creation
```
Error: There is no tracking information for the current branch
```

**Solution:** Set up remote tracking or skip pull:
```bash
# Set up remote tracking
git branch --set-upstream-to=origin/main main

# Or work locally without pull (modify worktree manager)
```

#### Clipboardy Import Errors

**Problem:** ESM module errors with clipboardy
```
Error [ERR_REQUIRE_ESM]: require() of ES Module clipboardy
```

**Solution:** Already fixed in latest version using dynamic imports.

#### Cursor Not Opening

**Problem:** Cursor command not found
```
⚠️  Cursor not found
```

**Solutions:**
1. Install Cursor from https://cursor.sh/
2. Add Cursor to PATH: `ln -s /Applications/Cursor.app/Contents/Resources/app/bin/cursor /usr/local/bin/cursor`
3. Use alternative editor in configuration

#### Shell Integration Issues

**Problem:** Shell commands not working after `vecna switch -s`

**Solution:** Ensure your shell configuration is properly loaded:
```bash
# For bash/zsh users
source ~/.bashrc  # or ~/.zshrc

# Or restart your terminal
```

### Debug Mode

Enable verbose logging:
```bash
DEBUG=vecna* vecna start --branch debug-test
```

### Getting Help

1. **Command help:** `vecna <command> --help`
2. **Configuration issues:** Check `.vecna.json` syntax
3. **Worktree problems:** Run `vecna worktree clean`
4. **Git issues:** Verify git version 2.20+

## 🤝 Contributing

Vecna is built with TypeScript and follows modern CLI best practices.

### Development Setup

```bash
git clone <repository>
cd vecna
npm install
npm run dev -- --help  # Test with ts-node
npm run build         # Build for production
npm test              # Run test suite
npm run lint          # Check code style
```

### Project Structure

```
src/
├── commands/          # CLI command implementations
│   ├── start.ts      # Worktree creation
│   ├── switch.ts     # Interactive switching
│   └── worktree/     # Worktree management
├── utils/            # Core utilities
│   ├── git.ts        # Git operations
│   ├── worktreeManager.ts  # Worktree logic
│   └── configManager.ts    # Configuration
└── index.ts          # CLI entry point

tests/                # Test suites
docs/                 # Additional documentation
```

### Code Style

- **TypeScript** with strict mode
- **ESLint** for linting
- **Jest** for testing
- **Conventional commits** for git history

## 📄 License

ISC License - see LICENSE file for details.

---

**Vecna** - Streamline your development workflow with powerful git worktree automation.

Made with ❤️ for developers who value efficiency.