# Vecna 🌳

A powerful CLI tool for managing multi-language monorepos with advanced git worktree automation.

**Transform your development workflow** from 8+ manual steps into a single command. Vecna automates worktree creation, management, and editor integration to streamline parallel development.

## ⚡ Quick Start

```bash
# Setup your project
vecna setup

# Create a new worktree (replaces complex manual workflow)
vecna start --branch feature/user-auth

# Switch between worktrees interactively
vecna switch

# Open worktree in Cursor editor
# Select "🚀 Switch and open in Cursor" option
```

## 📋 Table of Contents

- [Installation](#installation)
- [Features](#features)
- [Commands](#commands)
- [Configuration](#configuration)
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
- **Interactive worktree switching** - Visual selection with status indicators
- **Automatic configuration copying** - master.key, application.yml, .env files
- **Smart port management** - Auto-allocates ports for Procfile.dev (3001-4000)
- **Dependency installation** - Automatic yarn/npm/pnpm detection and install

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
```

**Automated Process:**
1. ✅ Validates branch name
2. ✅ Switches to base branch (main)
3. ✅ Pulls latest changes
4. ✅ Creates branch if needed
5. ✅ Creates worktree in `~/dev/trees/`
6. ✅ Copies configuration files
7. ✅ Updates Procfile.dev ports
8. ✅ Installs dependencies
9. ✅ Opens in editor (if configured)

#### `vecna switch [options]`
Interactive worktree switching with rich UI.

```bash
# Interactive selection
vecna switch

# JSON output for scripts
vecna switch --json
```

**Interactive Features:**
- 🔄 **Switch to worktree** - Navigate to directory
- 🚀 **Switch and open in Cursor** - Navigate + open editor
- 📝 **Show detailed info** - Commit history, status
- 🗑️ **Delete worktree** - Safe removal with confirmations
- 📂 **Open in editor** - Launch configured editor
- 🔄 **Refresh list** - Update worktree status

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
Remove worktrees with safety checks.

```bash
# Interactive selection
vecna worktree remove

# Remove specific worktree
vecna worktree remove feature-payment

# Force removal (skip confirmations)
vecna worktree remove feature-payment --force

# Remove all unused worktrees
vecna worktree remove --all-unused
```

#### `vecna worktree info [name]`
Show detailed information about a worktree.

```bash
# Interactive selection
vecna worktree info

# Specific worktree
vecna worktree info feature-payment
```

#### `vecna worktree clean`
Clean up orphaned worktrees and verify integrity.

```bash
vecna worktree clean
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

#### `vecna test [type]`
Run tests with smart filtering.

```bash
# Run all tests
vecna test all

# Ruby tests only
vecna test rb
```

### Utility Commands

#### `vecna shell-install`
Install shell integration for seamless directory switching.

```bash
vecna shell-install
```

#### `vecna list`
List all registered projects.

```bash
vecna list
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
  ]
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

## 🔄 Workflow Examples

### Feature Development

```bash
# Start working on a new feature
vecna start --branch feature/user-authentication

# Switch between main and feature work
vecna switch
# Select: feature/user-authentication → 🚀 Switch and open in Cursor

# When done, clean up
vecna worktree remove feature-user-authentication
```

### Hotfix Workflow

```bash
# Create hotfix from production
vecna start --branch hotfix/security-patch --from production

# Quick switch for testing
vecna switch
# Select: hotfix/security-patch → 🔄 Switch to worktree

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

# Switch between them efficiently
vecna switch
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
vecna switch
# Select worktree → 🚀 Switch and open in Cursor
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

#### Port Conflicts

**Problem:** Procfile.dev port already in use

**Solution:** Vecna automatically finds available ports (3001-4000). Check with:
```bash
lsof -i :3000  # Check what's using port 3000
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