# Troubleshooting Guide

Solutions for common issues, error messages, and debugging techniques for Vecna.

## 📋 Table of Contents

- [Common Issues](#common-issues)
- [Installation Problems](#installation-problems)
- [Worktree Issues](#worktree-issues)
- [Editor Integration](#editor-integration)
- [Configuration Problems](#configuration-problems)
- [Performance Issues](#performance-issues)
- [Debug Mode](#debug-mode)
- [Getting Help](#getting-help)

## 🚨 Common Issues

### Command Not Found

**Problem:**
```bash
vecna --help
# command not found: vecna
```

**Solutions:**

1. **Check Installation:**
   ```bash
   # Verify npm link worked
   which vecna
   
   # If not found, relink
   cd /path/to/vecna
   npm link
   ```

2. **Check PATH:**
   ```bash
   # Check npm global path
   npm config get prefix
   
   # Add to PATH if needed
   export PATH="$(npm config get prefix)/bin:$PATH"
   echo 'export PATH="$(npm config get prefix)/bin:$PATH"' >> ~/.zshrc
   ```

3. **Alternative Execution:**
   ```bash
   # Run directly from project
   cd /path/to/vecna
   node dist/index.js --help
   
   # Or use npm script
   npm run start -- --help
   ```

---

### ESM Import Errors

**Problem:**
```bash
Error [ERR_REQUIRE_ESM]: require() of ES Module clipboardy
```

**Solution:**
This is already fixed in the latest version. If you encounter this:

```bash
# Update to latest version
cd /path/to/vecna
git pull origin main
npm install
npm run build
npm link
```

**Manual Fix (if needed):**
The issue is with clipboardy being ESM-only. Use dynamic imports:

```typescript
// Instead of: import clipboard from 'clipboardy';
const clipboard = await import('clipboardy');
await clipboard.default.write('text');
```

---

### Permission Denied

**Problem:**
```bash
Error: EACCES: permission denied, mkdir '/Users/username/dev/trees'
```

**Solutions:**

1. **Create Directory Manually:**
   ```bash
   mkdir -p ~/dev/trees
   chmod 755 ~/dev/trees
   ```

2. **Fix npm Permissions:**
   ```bash
   sudo chown -R $(whoami) $(npm config get prefix)/{lib/node_modules,bin,share}
   ```

3. **Use Different Directory:**
   ```json
   {
     "worktrees": {
       "baseDir": "~/my-trees"
     }
   }
   ```

---

## 🔧 Installation Problems

### Node.js Version Issues

**Problem:**
```bash
TypeError: String.prototype.replaceAll is not a function
```

**Solution:**
Update to Node.js 16+:

```bash
# Check current version
node --version

# Install Node.js 18 (recommended)
# Via nvm:
nvm install 18
nvm use 18

# Via Homebrew (macOS):
brew install node@18

# Verify installation
node --version  # Should be 18.x.x or higher
```

---

### Build Failures

**Problem:**
```bash
npm run build
# TypeScript compilation errors
```

**Solutions:**

1. **Clean Installation:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   npm run build
   ```

2. **Check TypeScript Version:**
   ```bash
   npx tsc --version  # Should be 5.x+
   npm install typescript@latest
   ```

3. **Manual Dependencies:**
   ```bash
   npm install @types/node @types/inquirer @types/fs-extra
   npm run build
   ```

---

### Jest Worker Errors

**Problem:**
```bash
Jest worker encountered 4 child process exceptions, exceeding retry limit
```

**Solution:**
This is a known issue with process.exit() in tests. Tests still pass:

```bash
# Run tests with more workers
npm test -- --maxWorkers=1

# Or ignore worker warnings (tests still pass)
npm test 2>/dev/null | grep -E "(PASS|FAIL|✓|✗)"
```

---

## 🌳 Worktree Issues

### Git Pull Failures

**Problem:**
```bash
[FAILED] There is no tracking information for the current branch
```

**Solutions:**

1. **Set Up Remote Tracking:**
   ```bash
   git branch --set-upstream-to=origin/main main
   git pull
   ```

2. **Work Without Remote:**
   ```bash
   # Skip pull by modifying worktreeManager.ts temporarily
   # Or work on local-only repositories
   ```

3. **Initialize Remote:**
   ```bash
   git remote add origin <repository-url>
   git push -u origin main
   ```

---

### Worktree Already Exists

**Problem:**
```bash
Error: Worktree path already exists: ~/dev/trees/feature-branch
```

**Solutions:**

1. **Remove Existing Worktree:**
   ```bash
   vecna worktree remove feature-branch
   # Or manually:
   git worktree remove ~/dev/trees/feature-branch
   ```

2. **Use Different Branch Name:**
   ```bash
   vecna start --branch feature-branch-v2
   ```

3. **Clean Up Orphaned Worktrees:**
   ```bash
   vecna worktree clean
   git worktree prune
   ```

---

### Port Conflicts

**Problem:**
```bash
Procfile.dev found but couldn't find available port between 3001-4000
```

**Solutions:**

1. **Kill Processes Using Ports:**
   ```bash
   # Find what's using ports
   lsof -i :3001
   lsof -i :3002
   
   # Kill specific process
   kill <PID>
   ```

2. **Extend Port Range:**
   Modify `worktreeManager.ts` to use wider range:
   ```typescript
   for (let port = 3001; port <= 5000; port++) {
   ```

3. **Manual Port Assignment:**
   Edit Procfile.dev manually after worktree creation.

---

### File Copy Failures

**Problem:**
```bash
Error: ENOENT: no such file or directory, open 'config/master.key'
```

**Solutions:**

1. **Check File Exists:**
   ```bash
   ls -la config/master.key
   ```

2. **Update Configuration:**
   ```json
   {
     "worktrees": {
       "copyFiles": [
         "config/application.yml"  // Remove non-existent files
       ]
     }
   }
   ```

3. **Create Missing Files:**
   ```bash
   touch config/master.key
   echo "development_key" > config/master.key
   ```

---

## 🖥️ Editor Integration

### Cursor Not Found

**Problem:**
```bash
⚠️  Cursor not found. Please install Cursor or use the regular switch option.
```

**Solutions:**

1. **Install Cursor:**
   - Download from [cursor.sh](https://cursor.sh/)
   - Follow installation instructions

2. **Add to PATH (macOS):**
   ```bash
   ln -s /Applications/Cursor.app/Contents/Resources/app/bin/cursor /usr/local/bin/cursor
   
   # Verify
   which cursor
   ```

3. **Add to PATH (Linux):**
   ```bash
   # Find cursor installation
   find /opt -name cursor 2>/dev/null
   
   # Create symlink
   sudo ln -s /opt/cursor/cursor /usr/local/bin/cursor
   ```

4. **Use Alternative Editor:**
   ```json
   {
     "worktrees": {
       "editor": {
         "command": "code"  // Use VS Code instead
       }
     }
   }
   ```

---

### Editor Won't Open

**Problem:**
Cursor command exists but doesn't open the project.

**Solutions:**

1. **Test Command Manually:**
   ```bash
   cursor ~/dev/trees/test-project
   ```

2. **Check Permissions:**
   ```bash
   chmod +x /usr/local/bin/cursor
   ```

3. **Try Alternative Launch:**
   ```bash
   # macOS
   open -a Cursor ~/dev/trees/test-project
   
   # Linux
   /opt/cursor/cursor ~/dev/trees/test-project
   ```

---

## ⚙️ Configuration Problems

### Invalid JSON

**Problem:**
```bash
SyntaxError: Unexpected token } in JSON
```

**Solutions:**

1. **Validate JSON:**
   ```bash
   # Check syntax
   node -e "console.log(JSON.parse(require('fs').readFileSync('.vecna.json')))"
   
   # Or use online validator
   cat .vecna.json | pbcopy  # Paste into jsonlint.com
   ```

2. **Common JSON Errors:**
   ```json
   {
     "name": "project",
     "linter": {
       "js": "eslint"    // ❌ Missing comma
     }
     "worktrees": {}     // ❌ Should have comma above
   }
   ```

   **Fixed:**
   ```json
   {
     "name": "project",
     "linter": {
       "js": "eslint"    // ✅ Added comma
     },
     "worktrees": {}
   }
   ```

---

### Configuration Not Loading

**Problem:**
Vecna ignores `.vecna.json` settings.

**Solutions:**

1. **Check File Location:**
   ```bash
   pwd  # Should be project root
   ls -la .vecna.json  # Should exist
   ```

2. **Check File Permissions:**
   ```bash
   chmod 644 .vecna.json
   ```

3. **Debug Configuration Loading:**
   ```bash
   DEBUG=vecna* vecna start --branch test
   ```

---

### Path Resolution Issues

**Problem:**
```bash
Error: Cannot resolve path ~/dev/trees
```

**Solutions:**

1. **Use Absolute Paths:**
   ```json
   {
     "worktrees": {
       "baseDir": "/Users/username/dev/trees"
     }
   }
   ```

2. **Check Home Directory:**
   ```bash
   echo $HOME
   # Use correct path in config
   ```

---

## ⚡ Performance Issues

### Slow Worktree Creation

**Problem:**
Worktree creation takes several minutes.

**Solutions:**

1. **Skip Dependency Installation:**
   ```bash
   vecna start --branch test --no-install
   ```

2. **Optimize Configuration:**
   ```json
   {
     "worktrees": {
       "autoInstall": false,
       "copyFiles": ["config/master.key"],  // Minimal files
       "postCreateScripts": []              // Skip heavy scripts
     }
   }
   ```

3. **Use Faster Package Manager:**
   ```json
   {
     "worktrees": {
       "packageManager": "pnpm"  // Faster than npm
     }
   }
   ```

---

### Large Repository Issues

**Problem:**
Git operations are slow on large repositories.

**Solutions:**

1. **Enable Git Partial Clone:**
   ```bash
   git config core.preloadindex true
   git config core.fscache true
   git config gc.auto 256
   ```

2. **Use Shallow Clones:**
   ```bash
   git clone --depth 1 <repository-url>
   ```

3. **Optimize Worktree Location:**
   ```json
   {
     "worktrees": {
       "baseDir": "/tmp/trees"  // Use faster filesystem
     }
   }
   ```

---

## 🔍 Debug Mode

### Enabling Debug Mode

```bash
# Enable all vecna debug logs
export DEBUG="vecna*"

# Enable specific modules
export DEBUG="vecna:worktree,vecna:git"

# Run command with debug
DEBUG=vecna* vecna start --branch debug-test
```

### Debug Output Example

```bash
DEBUG=vecna* vecna start --branch test
# vecna:config Reading local config from .vecna.json +0ms
# vecna:git Checking current branch +10ms
# vecna:worktree Creating worktree at ~/dev/trees/test +50ms
# vecna:worktree Copying files: config/master.key +100ms
```

### Common Debug Patterns

```bash
# Git operations
DEBUG=vecna:git vecna start --branch test

# Configuration loading
DEBUG=vecna:config vecna setup

# Worktree management
DEBUG=vecna:worktree vecna switch

# All operations
DEBUG=vecna* vecna start --branch debug-all
```

---

## 🩺 System Diagnostics

### Health Check Script

```bash#!/bin/bash
echo "🔍 Vecna System Diagnostics"
echo "=========================="

# Check Node.js
echo "Node.js: $(node --version)"

# Check Git
echo "Git: $(git --version)"

# Check vecna installation
if command -v vecna &> /dev/null; then
    echo "Vecna: ✅ Installed ($(vecna --version))"
else
    echo "Vecna: ❌ Not found in PATH"
fi

# Check directories
echo "Home: $HOME"
echo "Config dir: ~/.config/vecna ($([ -d ~/.config/vecna ] && echo "✅" || echo "❌"))"
echo "Trees dir: ~/dev/trees ($([ -d ~/dev/trees ] && echo "✅" || echo "❌"))"

# Check editors
for editor in cursor code subl vim; do
    if command -v $editor &> /dev/null; then
        echo "Editor $editor: ✅ Available"
    else
        echo "Editor $editor: ❌ Not found"
    fi
done

# Check project config
if [ -f .vecna.json ]; then
    echo "Project config: ✅ Present"
    if node -e "JSON.parse(require('fs').readFileSync('.vecna.json'))" 2>/dev/null; then
        echo "Project config: ✅ Valid JSON"
    else
        echo "Project config: ❌ Invalid JSON"
    fi
else
    echo "Project config: ❌ Not found (.vecna.json)"
fi
```

### Environment Check

```bash
# Check environment variables
env | grep VECNA

# Check npm configuration
npm config list

# Check git configuration
git config --list | grep -E "(user|core)"

# Check filesystem permissions
ls -la ~/.config/vecna/
ls -la ~/dev/trees/
```

---

## 📞 Getting Help

### Before Reporting Issues

1. **Update to Latest Version:**
   ```bash
   cd /path/to/vecna
   git pull origin main
   npm install && npm run build && npm link
   ```

2. **Run with Debug Mode:**
   ```bash
   DEBUG=vecna* vecna start --branch test-issue 2>&1 | tee debug.log
   ```

3. **Check System Requirements:**
   - Node.js 16+
   - Git 2.20+
   - Supported OS (macOS, Linux, WSL2)

### Information to Include

When reporting issues, include:

- **OS and Version:** `uname -a`
- **Node.js Version:** `node --version`
- **Git Version:** `git --version`
- **Vecna Version:** `vecna --version`
- **Error Message:** Full error output
- **Debug Logs:** `DEBUG=vecna* <command>`
- **Configuration:** Contents of `.vecna.json`
- **Steps to Reproduce:** Exact commands used

### Self-Help Resources

1. **Command Help:**
   ```bash
   vecna --help
   vecna <command> --help
   ```

2. **Configuration Validation:**
   ```bash
   node -e "console.log(JSON.parse(require('fs').readFileSync('.vecna.json')))"
   ```

3. **System Check:**
   ```bash
   which vecna node git cursor
   ```

### Community Support

- **GitHub Issues:** Report bugs and feature requests
- **Documentation:** Check README and docs/ directory
- **Debug Mode:** Use `DEBUG=vecna*` for detailed logs

### Emergency Fixes

**Complete Reset:**
```bash
# Remove all vecna data (⚠️ Destructive)
rm -rf ~/.config/vecna
rm .vecna.json
npm unlink vecna
cd /path/to/vecna && npm link
vecna setup
```

**Minimal Working Setup:**
```json
{
  "name": "emergency-setup",
  "worktrees": {
    "baseDir": "~/trees",
    "autoInstall": false,
    "copyFiles": []
  }
}
```

---

**Still having issues?** Make sure you've tried the solutions above and include all diagnostic information when seeking help.