# Cursor Editor Integration

Complete guide to using Vecna with Cursor, the AI-powered code editor.

## 📋 Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Basic Usage](#basic-usage)
- [Configuration](#configuration)
- [Advanced Features](#advanced-features)
- [Troubleshooting](#troubleshooting)
- [Tips and Tricks](#tips-and-tricks)

## 🚀 Overview

Vecna provides first-class integration with [Cursor](https://cursor.sh/), offering seamless worktree management with intelligent editor automation. This integration transforms your development workflow by combining powerful git worktree management with AI-assisted coding.

### Key Features

- **🎯 One-Click Launch** - Open worktrees directly in Cursor from interactive menu
- **🤖 Auto-Open Support** - Automatically launch Cursor when creating new worktrees
- **🔧 Smart Detection** - Automatic Cursor availability checking with helpful fallbacks
- **⚙️ Flexible Configuration** - Granular control over editor behavior
- **🛡️ Graceful Fallbacks** - Helpful error messages and alternative options

---

## 📦 Installation

### Prerequisites

- **Vecna** installed and configured
- **Cursor Editor** downloaded and installed

### Installing Cursor

1. **Download Cursor:**
   - Visit [cursor.sh](https://cursor.sh/)
   - Download for your platform (macOS, Linux, Windows)

2. **Install Cursor:**
   
   **macOS:**
   ```bash
   # Install from downloaded .dmg
   # Or via Homebrew (if available)
   brew install --cask cursor
   ```

   **Linux:**
   ```bash
   # Install from downloaded .deb/.rpm
   sudo dpkg -i cursor-*.deb
   # Or extract .tar.gz to /opt/cursor
   ```

   **Windows (WSL2):**
   ```bash
   # Install on Windows side, then access from WSL
   # Cursor should be available in WSL PATH
   ```

3. **Verify Installation:**
   ```bash
   which cursor
   # Should return: /usr/local/bin/cursor (or similar)
   
   cursor --version
   # Should return version information
   ```

### Add Cursor to PATH (if needed)

**macOS:**
```bash
# Create symlink if needed
sudo ln -s /Applications/Cursor.app/Contents/Resources/app/bin/cursor /usr/local/bin/cursor

# Or add to your shell profile
echo 'export PATH="/Applications/Cursor.app/Contents/Resources/app/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

**Linux:**
```bash
# If installed to /opt/cursor
sudo ln -s /opt/cursor/cursor /usr/local/bin/cursor

# Verify
which cursor
```

---

## 🎯 Basic Usage

### Interactive Worktree Switching

The primary way to use Cursor integration is through the interactive switch command:

```bash
vecna switch
```

**Interactive Menu:**
```
🌳 Vecna Worktree Switcher

? Select worktree or action: (Use arrow keys)
❯ ● current    main                         7/24/2025    
  ● changes    feature-user-auth            7/23/2025    ↑2↓0
  ○ clean      bugfix-login                 7/22/2025    
  ──────────────
  🔄 Refresh list
  ❓ Toggle help  
  ❌ Quit
```

**Action Selection:**
```
Selected: feature-user-auth. What would you like to do?
❯ 🔄 Switch to this worktree
  🚀 Switch and open in Cursor        ← New Cursor option!
  📝 Show detailed info
  🗑️  Delete this worktree
  📂 Open in editor
  ❌ Cancel
```

### Switch and Open in Cursor

Select **🚀 Switch and open in Cursor** to:

1. ✅ Copy directory change command to clipboard
2. ✅ Display terminal command for manual navigation
3. ✅ Automatically launch Cursor in the worktree directory
4. ✅ Show worktree status (uncommitted changes, sync status)

**Example Output:**
```
Switching to feature-user-auth and opening in Cursor...

✓ To complete the switch, run:
  cd ~/dev/trees/feature-user-auth
(Command copied to clipboard)

✓ Opened in Cursor

⚠ This worktree has uncommitted changes.
Branch is 2 commits ahead and 0 commits behind.
```

### Cursor Not Available

If Cursor isn't installed or accessible:

```
⚠️  Cursor not found. Please install Cursor or use the regular switch option.
You can download Cursor from: https://cursor.sh/
```

---

## ⚙️ Configuration

### Basic Configuration

Add Cursor settings to your `.vecna.json`:

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

### Configuration Options

| Option | Type | Description | Default |
|--------|------|-------------|---------|
| `command` | string | Editor command to execute | `"cursor"` |
| `openOnSwitch` | boolean | Auto-open editor on worktree creation | `false` |
| `preferCursor` | boolean | Prefer Cursor in editor detection | `false` |

### Auto-Open on Worktree Creation

Enable automatic Cursor opening when creating worktrees:

```json
{
  "worktrees": {
    "editor": {
      "command": "cursor",
      "openOnSwitch": true
    }
  }
}
```

**Behavior:**
```bash
vecna start --branch feature/new-feature

# Process runs...
# ✓ Creating worktree
# ✓ Copying files  
# ✓ Installing dependencies
# ✓ Opened in Cursor          ← Automatic!
```

### Prefer Cursor Over Other Editors

Set Cursor as the preferred editor for auto-detection:

```json
{
  "worktrees": {
    "editor": {
      "preferCursor": true,
      "openOnSwitch": true
    }
  }
}
```

This affects:
- **📂 Open in editor** option in switch menu
- **Auto-detection** when multiple editors are available
- **Fallback behavior** when Cursor is available

---

## 🔥 Advanced Features

### Project-Specific Cursor Configuration

Different projects may need different Cursor behaviors:

**JavaScript Project:**
```json
{
  "name": "react-app",
  "worktrees": {
    "editor": {
      "command": "cursor",
      "openOnSwitch": true,
      "preferCursor": true
    },
    "postCreateScripts": [
      "npm install",
      "npm run dev"
    ]
  }
}
```

**Ruby Project:**
```json
{
  "name": "rails-api",
  "worktrees": {
    "editor": {
      "command": "cursor",
      "openOnSwitch": false    // Manual opening for Rails projects
    },
    "postCreateScripts": [
      "bundle install",
      "rails db:migrate"
    ]
  }
}
```

### Environment-Based Configuration

Use environment variables to override editor settings:

```bash
# Force Cursor for current session
export VECNA_EDITOR="cursor"
vecna start --branch feature/test

# Disable auto-open temporarily
export VECNA_AUTO_OPEN="false"
vecna start --branch feature/no-editor
```

### Integration with Shell Functions

Combine Cursor integration with shell functions:

```bash
# Add to ~/.zshrc
function vcstart() {
  vecna start --branch "$1" && cursor ~/dev/trees/"${1//\//-}"
}

function vcswitch() {
  local worktree=$(vecna worktree list --json | jq -r '.[].name' | fzf)
  if [ -n "$worktree" ]; then
    cursor ~/dev/trees/"$worktree"
  fi
}

# Usage
vcstart feature/user-auth    # Create worktree and open in Cursor
vcswitch                     # Fuzzy find and open in Cursor
```

---

## 🛠️ Cursor-Specific Workflows

### AI-Assisted Development Workflow

1. **Create Feature Branch:**
   ```bash
   vecna start --branch feature/ai-assisted-auth
   # ✓ Opened in Cursor automatically
   ```

2. **Use Cursor AI Features:**
   - **Ctrl+K** - Generate code with AI
   - **Ctrl+L** - Chat with codebase
   - **Tab** - Accept AI suggestions

3. **Switch Between Features:**
   ```bash
   vecna switch
   # Select: 🚀 Switch and open in Cursor
   ```

### Multi-Feature Development

**Setup Multiple Worktrees:**
```bash
vecna start --branch feature/frontend --no-install
vecna start --branch feature/backend --no-install  
vecna start --branch feature/testing --no-install
```

**Quick Switching:**
```bash
# Use vecna switch with Cursor integration
vecna switch
# Each switch opens fresh Cursor window
```

### Code Review Workflow

1. **Create Review Branch:**
   ```bash
   vecna start --branch review/pr-123 --from main
   # ✓ Opens in Cursor
   ```

2. **Compare with Main:**
   ```bash
   # Cursor can show diff with main branch
   # Use Cursor's git integration for side-by-side comparison
   ```

3. **Cleanup After Review:**
   ```bash
   vecna worktree remove review-pr-123
   ```

---

## 🐛 Troubleshooting

### Cursor Command Not Found

**Problem:**
```bash
⚠️  Cursor not found. Please install Cursor or use the regular switch option.
```

**Solutions:**

1. **Verify Installation:**
   ```bash
   # Check if Cursor is installed
   ls /Applications/Cursor.app  # macOS
   ls /opt/cursor              # Linux
   ```

2. **Add to PATH:**
   ```bash
   # macOS
   sudo ln -s /Applications/Cursor.app/Contents/Resources/app/bin/cursor /usr/local/bin/cursor
   
   # Linux  
   sudo ln -s /opt/cursor/cursor /usr/local/bin/cursor
   
   # Verify
   which cursor
   ```

3. **Test Manual Launch:**
   ```bash
   cursor ~/dev/trees/test-project
   ```

### Cursor Opens but Doesn't Load Project

**Problem:**
Cursor launches but shows empty window or wrong directory.

**Solutions:**

1. **Check Working Directory:**
   ```bash
   # Ensure worktree path exists
   ls -la ~/dev/trees/feature-branch
   ```

2. **Try Absolute Path:**
   ```bash
   cursor /absolute/path/to/worktree
   ```

3. **Check Cursor Preferences:**
   - Open Cursor preferences
   - Check "Open folders in new window" setting
   - Verify workspace settings

### Multiple Cursor Windows

**Problem:**
Each worktree switch opens a new Cursor window.

**Solutions:**

1. **Cursor Preferences:**
   - Set "Open folders" to "Replace current window"
   - Or embrace multiple windows for parallel development

2. **Manual Window Management:**
   - Use Cursor's window management features
   - Close unnecessary windows manually

### Auto-Open Not Working

**Problem:**
`openOnSwitch: true` doesn't open Cursor automatically.

**Debug Steps:**

1. **Check Configuration:**
   ```bash
   # Verify config syntax
   node -e "console.log(JSON.parse(require('fs').readFileSync('.vecna.json')))"
   ```

2. **Enable Debug Mode:**
   ```bash
   DEBUG=vecna* vecna start --branch debug-test
   # Look for editor-related debug messages
   ```

3. **Test Manual Command:**
   ```bash
   cursor ~/dev/trees/debug-test
   ```

---

## 💡 Tips and Tricks

### Keyboard Shortcuts

**In Vecna Switch Menu:**
- `↑/↓` - Navigate worktrees
- `Enter` - Select worktree  
- `h` - Toggle help
- `q` - Quit

**In Cursor:**
- `Ctrl+K` - AI code generation
- `Ctrl+L` - Chat with codebase
- `Ctrl+Shift+P` - Command palette
- `Ctrl+`` ` - Toggle terminal

### Optimize Cursor Performance

**Large Projects:**
```json
{
  "worktrees": {
    "copyFiles": [
      "config/master.key"     // Minimal file copying
    ],
    "autoInstall": false,     // Skip deps for speed
    "editor": {
      "openOnSwitch": true
    }
  }
}
```

**Cursor Settings:**
- Disable heavy extensions for worktrees
- Use workspace-specific settings
- Configure language servers per project

### Workflow Aliases

Add to your shell profile:

```bash
# Quick Cursor + Vecna aliases
alias vcs="vecna switch"                    # Quick switch with Cursor option
alias vcn="vecna start --branch"           # Create new with auto-open
alias vcl="vecna worktree list"            # List worktrees
alias vcc="vecna worktree clean"           # Clean up worktrees

# Advanced aliases
alias vcf="vecna start --branch feature/"  # Start feature branches
alias vch="vecna start --branch hotfix/"   # Start hotfix branches
```

### Integration with Other Tools

**With fzf (fuzzy finder):**
```bash
function vcfzf() {
  local worktree=$(vecna worktree list --json | jq -r '.[].name' | fzf --preview 'vecna worktree info {}')
  if [ -n "$worktree" ]; then
    cursor ~/dev/trees/"$worktree"
  fi
}
```

**With tmux:**
```bash
function vctmux() {
  local branch=$1
  vecna start --branch "$branch"
  tmux new-session -d -s "$branch" -c ~/dev/trees/"${branch//\//-}"
  cursor ~/dev/trees/"${branch//\//-}"
}
```

### Best Practices

1. **Use Descriptive Branch Names:**
   ```bash
   vecna start --branch feature/user-authentication-oauth
   # Better than: feature/auth
   ```

2. **Leverage Cursor's AI Features:**
   - Use AI chat to understand unfamiliar codebases
   - Generate tests with AI assistance
   - Refactor code with AI suggestions

3. **Organize Worktrees:**
   ```bash
   # Use consistent naming
   vecna start --branch feature/frontend-redesign
   vecna start --branch bugfix/login-validation
   vecna start --branch hotfix/security-patch
   ```

4. **Clean Up Regularly:**
   ```bash
   # Weekly cleanup
   vecna worktree clean
   vecna worktree remove --all-unused
   ```

---

## 🎯 Next Steps

### Advanced Cursor Configuration

Explore Cursor's workspace settings for per-project configurations:

```json
// .cursor/settings.json in each worktree
{
  "cursor.ai.enabled": true,
  "cursor.ai.model": "gpt-4",
  "editor.inlineSuggest.enabled": true
}
```

### Team Integration

Share Cursor-optimized vecna configurations:

```json
{
  "worktrees": {
    "editor": {
      "command": "cursor",
      "openOnSwitch": false  // Let team members choose
    }
  }
}
```

### Automation

Create scripts that combine vecna and Cursor for complex workflows:

```bash
#!/bin/bash
# create-feature.sh
FEATURE_NAME=$1
vecna start --branch "feature/$FEATURE_NAME"
cursor ~/dev/trees/"feature-$FEATURE_NAME"
echo "Started feature: $FEATURE_NAME"
```

---

**Ready to supercharge your development workflow?** Start with `vecna switch` and select the **🚀 Switch and open in Cursor** option!