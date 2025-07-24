# Configuration Guide

Complete guide to configuring Vecna for your projects and workflows.

## 📋 Table of Contents

- [Configuration Overview](#configuration-overview)
- [Configuration Files](#configuration-files)
- [Project Configuration](#project-configuration)
- [Global Configuration](#global-configuration)
- [Worktree Configuration](#worktree-configuration)
- [Editor Integration](#editor-integration)
- [Environment Variables](#environment-variables)
- [Configuration Examples](#configuration-examples)

## 🔧 Configuration Overview

Vecna uses a two-tier configuration system:

1. **Global Configuration** (`~/.config/vecna/config.json`) - User-wide settings
2. **Project Configuration** (`.vecna.json`) - Project-specific settings

Project settings override global settings when both are present.

### Configuration Hierarchy

```
Environment Variables
        ↓
Project Configuration (.vecna.json)
        ↓  
Global Configuration (~/.config/vecna/config.json)
        ↓
Built-in Defaults
```

---

## 📁 Configuration Files

### File Locations

| Type | Location | Purpose |
|------|----------|---------|
| Global | `~/.config/vecna/config.json` | User-wide preferences |
| Project | `.vecna.json` | Project-specific settings |
| Shell | `~/.vecna-shell-integration` | Shell function definitions |

### File Creation

**Global Config:**
- Created automatically on first run
- Managed by `vecna setup` command
- Stores project registry

**Project Config:**
- Created by `vecna setup` in project directory
- Contains project-specific settings
- Should be committed to version control

---

## 🎯 Project Configuration

### Basic Structure

```json
{
  "name": "my-project",
  "path": "/Users/username/dev/my-project",
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
      "config/application.yml"
    ],
    "defaultBranch": "main",
    "autoInstall": true,
    "packageManager": "auto",
    "editor": {
      "command": "cursor",
      "openOnSwitch": true
    }
  }
}
```

### Configuration Options

#### Core Settings

| Option | Type | Description | Default |
|--------|------|-------------|---------|
| `name` | string | Project identifier | Directory name |
| `path` | string | Absolute project path | Current directory |
| `mainBranch` | string | Primary branch name | `"main"` |

#### Linter Configuration

```json
{
  "linter": {
    "js": "eslint",           // JavaScript/TypeScript linter
    "rb": "rubocop"           // Ruby linter
  }
}
```

**Supported Linters:**
- **JavaScript:** `eslint`, `jshint`, `standard`
- **Ruby:** `rubocop`, `reek`

#### Test Configuration

```json
{
  "test": {
    "rb": "rspec",            // Ruby test runner
    "js": "jest"              // JavaScript test runner (future)
  }
}
```

**Supported Test Runners:**
- **Ruby:** `rspec`, `minitest`

---

## 🌳 Worktree Configuration

The `worktrees` section controls all worktree-related behavior:

### Complete Worktree Configuration

```json
{
  "worktrees": {
    "baseDir": "~/dev/trees",
    "copyFiles": [
      "config/master.key",
      "config/application.yml",
      ".env",
      ".env.local",
      "config/database.yml"
    ],
    "copyPatterns": [
      "config/*.local",
      ".env.*",
      "*.key"
    ],
    "defaultBranch": "main",
    "autoInstall": true,
    "packageManager": "auto",
    "postCreateScripts": [
      "bundle install",
      "rails db:migrate",
      "npm run setup"
    ],
    "editor": {
      "command": "cursor",
      "openOnSwitch": true,
      "preferCursor": true
    }
  }
}
```

### Worktree Options

#### Directory Settings

| Option | Type | Description | Default |
|--------|------|-------------|---------|
| `baseDir` | string | Base directory for worktrees | `"~/dev/trees"` |
| `defaultBranch` | string | Branch to create worktrees from | `"main"` |

#### File Management

| Option | Type | Description | Default |
|--------|------|-------------|---------|
| `copyFiles` | string[] | Specific files to copy | `["config/master.key", "config/application.yml"]` |
| `copyPatterns` | string[] | Glob patterns for files to copy | `[]` |

**Example File Patterns:**
```json
{
  "copyFiles": [
    "config/master.key",        // Rails master key
    "config/application.yml",   // Rails config
    ".env",                     // Environment variables
    ".env.local",              // Local environment overrides
    "config/database.yml",      // Database configuration
    "docker-compose.yml",       // Docker setup
    "Procfile.dev"             // Development processes
  ],
  "copyPatterns": [
    "config/*.local",           // All local config files
    ".env.*",                  // All environment files  
    "*.key",                   // All key files
    "certs/*",                 // Certificate directory
    "secrets/**/*"             // Recursive secrets directory
  ]
}
```

#### Dependency Management

| Option | Type | Description | Default |
|--------|------|-------------|---------|
| `autoInstall` | boolean | Auto-install dependencies | `true` |
| `packageManager` | string | Preferred package manager | `"auto"` |

**Package Manager Options:**
- `"auto"` - Auto-detect (yarn.lock → yarn, pnpm-lock.yaml → pnpm, else npm)
- `"yarn"` - Force Yarn
- `"npm"` - Force npm  
- `"pnpm"` - Force pnpm

#### Post-Creation Scripts

Run custom commands after worktree creation:

```json
{
  "postCreateScripts": [
    "bundle install",           // Ruby dependencies
    "rails db:migrate",         // Database setup
    "npm run build:dev",        // Development build
    "docker-compose up -d",     // Start services
    "./scripts/setup-dev.sh"    // Custom setup script
  ]
}
```

**Script Execution:**
- Run in worktree directory
- Execute in order
- Fail fast (stops on first error)
- Use absolute paths for custom scripts

---

## 🖥️ Editor Integration

### Cursor Configuration

```json
{
  "worktrees": {
    "editor": {
      "command": "cursor",      // Editor command
      "openOnSwitch": true,     // Auto-open on switch
      "preferCursor": true      // Prefer Cursor over others
    }
  }
}
```

### Editor Options

| Option | Type | Description | Default |
|--------|------|-------------|---------|
| `command` | string | Editor command name | `"cursor"` |
| `openOnSwitch` | boolean | Auto-open on worktree creation | `false` |
| `preferCursor` | boolean | Prefer Cursor in auto-detection | `false` |

### Multi-Editor Support

```json
{
  "editor": {
    "command": "code",          // VS Code
    "openOnSwitch": false
  }
}
```

**Supported Editors:**
- `cursor` - Cursor AI Editor
- `code` - Visual Studio Code
- `subl` - Sublime Text
- `atom` - Atom Editor  
- `vim` - Vim/Neovim

### Conditional Editor Opening

```json
{
  "editor": {
    "command": "cursor",
    "openOnSwitch": true,
    "preferCursor": true
  }
}
```

**Behavior:**
- `openOnSwitch: true` - Opens editor automatically on `vecna start`
- `preferCursor: true` - Uses Cursor in `vecna switch` "Switch and open" option
- Falls back gracefully if editor not installed

---

## 🌍 Global Configuration

Stored in `~/.config/vecna/config.json`:

### Structure

```json
{
  "projects": [
    {
      "name": "web-app",
      "path": "/Users/username/dev/web-app",
      "mainBranch": "main"
    },
    {
      "name": "api-service", 
      "path": "/Users/username/dev/api-service",
      "mainBranch": "master"
    }
  ],
  "defaults": {
    "worktrees": {
      "baseDir": "~/dev/trees",
      "packageManager": "yarn",
      "autoInstall": true
    }
  }
}
```

### Global Defaults

Set defaults for all projects:

```json
{
  "defaults": {
    "mainBranch": "main",
    "worktrees": {
      "baseDir": "~/custom-trees",
      "packageManager": "pnpm",
      "autoInstall": true,
      "editor": {
        "command": "cursor",
        "openOnSwitch": false
      }
    },
    "linter": {
      "js": "eslint"
    }
  }
}
```

**Note:** Project-specific settings override global defaults.

---

## 🌐 Environment Variables

Override configuration with environment variables:

### Available Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VECNA_CONFIG_DIR` | Custom config directory | `~/.my-vecna` |
| `VECNA_WORKTREE_DIR` | Default worktree directory | `~/my-trees` |
| `VECNA_EDITOR` | Default editor command | `code` |
| `VECNA_PACKAGE_MANAGER` | Default package manager | `yarn` |
| `DEBUG` | Enable debug logging | `vecna*` |

### Usage Examples

```bash
# Custom configuration directory
export VECNA_CONFIG_DIR="~/.my-vecna-config"

# Custom worktree location
export VECNA_WORKTREE_DIR="~/projects/trees"

# Force specific editor
export VECNA_EDITOR="code"

# Debug mode
export DEBUG="vecna*"
vecna start --branch debug-test
```

### Environment Priority

Environment variables have the highest priority:

```
VECNA_WORKTREE_DIR="/tmp/trees"  # Highest priority
↓
.vecna.json: "baseDir": "~/dev/trees"
↓  
config.json: "baseDir": "~/custom/trees"
↓
Default: "~/dev/trees"           # Lowest priority
```

---

## 📋 Configuration Examples

### Minimal Configuration

For simple projects:

```json
{
  "name": "simple-app",
  "worktrees": {
    "baseDir": "~/trees"
  }
}
```

### JavaScript/Node.js Project

```json
{
  "name": "react-app",
  "linter": {
    "js": "eslint"
  },
  "worktrees": {
    "baseDir": "~/dev/trees",
    "copyFiles": [
      ".env",
      ".env.local",
      "config/development.json"
    ],
    "packageManager": "yarn",
    "postCreateScripts": [
      "yarn install",
      "yarn build:dev"
    ],
    "editor": {
      "command": "cursor",
      "openOnSwitch": true
    }
  }
}
```

### Ruby on Rails Project

```json
{
  "name": "rails-api",
  "linter": {
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
      "config/database.yml",
      ".env",
      "Procfile.dev"
    ],
    "copyPatterns": [
      "config/*.local"
    ],
    "postCreateScripts": [
      "bundle install",
      "rails db:create",
      "rails db:migrate"
    ],
    "editor": {
      "command": "cursor",
      "openOnSwitch": true
    }
  }
}
```

### Full-Stack Monorepo

```json
{
  "name": "monorepo-app",
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
      ".env",
      ".env.local",
      "config/master.key",
      "config/application.yml",
      "docker-compose.yml",
      "package.json",
      "Gemfile"
    ],
    "copyPatterns": [
      "config/*.yml",
      "certs/*",
      ".env.*"
    ],
    "packageManager": "auto",
    "postCreateScripts": [
      "bundle install",
      "yarn install", 
      "docker-compose up -d postgres redis",
      "rails db:migrate",
      "yarn build:dev"
    ],
    "editor": {
      "command": "cursor", 
      "openOnSwitch": true,
      "preferCursor": true
    }
  }
}
```

### Team Configuration

For standardized team setups:

```json
{
  "name": "team-project",
  "mainBranch": "develop",
  "linter": {
    "js": "eslint",
    "rb": "rubocop"
  },
  "worktrees": {
    "baseDir": "~/dev/branches",
    "defaultBranch": "develop",
    "copyFiles": [
      "config/master.key",
      "config/application.yml", 
      "docker-compose.yml",
      ".env.development"
    ],
    "packageManager": "yarn",
    "postCreateScripts": [
      "bundle install --quiet",
      "yarn install --silent",
      "docker-compose up -d --quiet-pull",
      "bundle exec rails db:migrate",
      "./scripts/seed-dev-data.sh"
    ],
    "editor": {
      "command": "cursor",
      "openOnSwitch": false
    }
  }
}
```

---

## 🔄 Configuration Management

### Updating Configuration

**Add New Settings:**
```bash
cd /path/to/project
# Edit .vecna.json manually or run setup again
vecna setup  # Will merge with existing config
```

**Global Updates:**
```bash
# Global config is at ~/.config/vecna/config.json
# Edit manually or let vecna manage it
```

### Configuration Validation

Vecna validates configuration on startup:

```bash
vecna start --branch test
# ✓ Configuration valid
# or
# ❌ Invalid configuration: worktrees.baseDir must be a string
```

### Migrating Configurations

When upgrading Vecna, configurations are automatically migrated:

```bash
vecna start
# 🔄 Migrating configuration to v1.1.0...
# ✓ Configuration updated
```

### Sharing Configurations

**Team Sharing:**
```bash
# Commit .vecna.json to share project settings
git add .vecna.json
git commit -m "Add vecna configuration"

# Team members can now run
vecna setup  # Uses committed configuration
```

**Template Configurations:**
```bash
# Create template in your dotfiles
cp .vecna.json ~/.dotfiles/vecna-templates/node-project.json

# Use template for new projects
cp ~/.dotfiles/vecna-templates/node-project.json .vecna.json
# Edit as needed
```

---

## 💡 Configuration Tips

### Performance Optimization

```json
{
  "worktrees": {
    "autoInstall": false,      // Skip deps for quick branches
    "copyFiles": [             // Only copy essential files
      "config/master.key"
    ],
    "postCreateScripts": []    // Skip heavy setup scripts
  }
}
```

### Security Considerations

```json
{
  "worktrees": {
    "copyFiles": [
      "config/master.key",     // ✅ Safe - encrypted
      "config/application.yml" // ✅ Safe - config only
    ]
  }
}
```

**Avoid copying:**
- Plain text passwords
- API keys in plain files
- Sensitive personal data

### Troubleshooting Configuration

**Common Issues:**

**Invalid JSON:**
```bash
# Use a JSON validator
node -e "console.log(JSON.parse(require('fs').readFileSync('.vecna.json')))"
```

**Path Issues:**
```bash
# Use absolute paths or ~ for home directory
"baseDir": "~/dev/trees"     # ✅ Good
"baseDir": "../trees"        # ❌ Problematic
```

**Permission Issues:**
```bash
# Ensure vecna can write to directories
chmod 755 ~/dev/trees
```

---

Need help with configuration? Check the [Troubleshooting Guide](../README.md#troubleshooting) or use `vecna setup` for interactive configuration.