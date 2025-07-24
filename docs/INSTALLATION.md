# Installation Guide

Complete installation instructions for Vecna across different systems and use cases.

## 📋 System Requirements

### Prerequisites

- **Node.js** 16.0.0 or higher
- **npm** 7.0.0 or higher (comes with Node.js)
- **Git** 2.20.0 or higher
- **Operating System**: macOS, Linux, or Windows with WSL2

### Optional Dependencies

- **Cursor Editor** - For enhanced editor integration ([download](https://cursor.sh/))
- **Yarn** or **pnpm** - Alternative package managers
- **Shell**: bash, zsh, or fish for shell integration

## 🚀 Installation Methods

### Method 1: Install from Source (Recommended)

This is currently the only installation method until Vecna is published to npm.

```bash
# Clone the repository
git clone <repository-url>
cd vecna

# Install dependencies
npm install

# Build the project
npm run build

# Create global symlink
npm link

# Verify installation
vecna --version
```

### Method 2: Local Development Setup

For contributing or customizing Vecna:

```bash
# Clone and setup
git clone <repository-url>
cd vecna
npm install

# Run in development mode
npm run dev -- --help

# Run tests
npm test

# Run linting
npm run lint
```

## ⚙️ Post-Installation Setup

### 1. Initial Project Setup

Navigate to your project directory and run:

```bash
cd /path/to/your/project
vecna setup
```

This will:
- ✅ Create `.vecna.json` configuration
- ✅ Detect your project type (JavaScript, Ruby, etc.)
- ✅ Configure linting and testing tools
- ✅ Set up worktree directories
- ✅ Register project globally

### 2. Shell Integration (Optional)

Enable seamless directory switching:

```bash
vecna shell-install
```

This adds shell functions to your profile:
- **Bash**: `~/.bashrc` or `~/.bash_profile`
- **Zsh**: `~/.zshrc`
- **Fish**: `~/.config/fish/config.fish`

**Restart your shell** after installation:
```bash
source ~/.zshrc  # or ~/.bashrc
```

### 3. Editor Integration Setup

#### Cursor Editor

Install Cursor for optimal integration:

1. **Download**: Visit [cursor.sh](https://cursor.sh/)
2. **Install**: Follow platform-specific instructions
3. **Add to PATH** (if needed):
   ```bash
   # macOS
   ln -s /Applications/Cursor.app/Contents/Resources/app/bin/cursor /usr/local/bin/cursor
   
   # Linux (adjust path as needed)
   ln -s /opt/cursor/cursor /usr/local/bin/cursor
   ```

4. **Verify**: `which cursor` should return the path

Configure auto-open in `.vecna.json`:
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

## 🖥️ Platform-Specific Instructions

### macOS

#### Homebrew Method (Future)
```bash
# This will be available once published
brew install vecna
```

#### Manual Installation
```bash
# Install Node.js via Homebrew
brew install node

# Clone and install Vecna
git clone <repository-url>
cd vecna
npm install && npm run build && npm link

# Add shell integration
vecna shell-install
```

### Linux (Ubuntu/Debian)

```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install build essentials (if needed)
sudo apt-get install -y build-essential

# Clone and install Vecna
git clone <repository-url>
cd vecna
npm install && npm run build && npm link
```

### Windows (WSL2)

Vecna works best in WSL2 environment:

```bash
# Install Node.js in WSL2
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone and install Vecna
git clone <repository-url>
cd vecna
npm install && npm run build && npm link

# Note: Cursor integration may require Windows-side installation
```

## 🔧 Configuration

### Directory Structure

After installation, Vecna creates:

```
~/.config/vecna/
├── config.json          # Global configuration
└── projects/            # Project metadata

~/dev/trees/             # Default worktree location
├── feature-branch-1/    # Individual worktrees
├── feature-branch-2/
└── ...

Your Project/
├── .vecna.json          # Project-specific config
└── ...
```

### Environment Variables

Optional environment variables:

```bash
# Custom config directory
export VECNA_CONFIG_DIR="~/.custom-vecna"

# Custom worktree base directory
export VECNA_WORKTREE_DIR="~/custom-trees"

# Debug mode
export DEBUG="vecna*"
```

### Project-Specific Setup

For each project you want to use with Vecna:

```bash
cd /path/to/project
vecna setup
```

Example interactive setup:
```
? Project name: my-awesome-project
? Main branch: main
? JavaScript linter: eslint
? Ruby linter: rubocop
? Test runner: rspec
? Worktree directory: ~/dev/trees
```

## ✅ Verification

### Test Installation

```bash
# Check version
vecna --version

# Check help
vecna --help

# Test project setup
cd /path/to/test/project
vecna setup

# Test worktree creation (dry run)
vecna start --branch test-installation --no-install
```

### Test Shell Integration

After installing shell integration:

```bash
# This should work if shell integration is installed
cd ~/dev/trees/some-worktree  # Should work from anywhere
```

### Test Editor Integration

```bash
# Check if Cursor is available
which cursor

# Test opening a directory
cursor /path/to/project
```

## 🚨 Troubleshooting Installation

### Common Issues

#### Permission Errors

```bash
# Fix npm permissions
npm config set prefix ~/.npm-global
export PATH=~/.npm-global/bin:$PATH

# Add to shell profile
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.zshrc
```

#### Node.js Version Issues

```bash
# Check Node.js version
node --version  # Should be 16+

# Update Node.js using nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18
```

#### Git Version Issues

```bash
# Check Git version
git --version  # Should be 2.20+

# Update Git
# macOS: brew install git
# Ubuntu: sudo apt update && sudo apt install git
```

#### Build Failures

```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Try with different Node.js version
nvm install 16
nvm use 16
npm install && npm run build
```

#### Shell Integration Not Working

```bash
# Manually check shell profile
cat ~/.zshrc | grep vecna

# Manually add if missing
echo 'source ~/.vecna-shell-integration' >> ~/.zshrc

# Restart shell
exec $SHELL
```

### Getting Help

If installation fails:

1. **Check system requirements** - Ensure Node.js 16+ and Git 2.20+
2. **Review error messages** - Most errors are self-explanatory
3. **Check permissions** - Ensure you can write to npm global directory
4. **Try development mode** - Use `npm run dev` instead of global install
5. **Clean installation** - Remove and reinstall dependencies

### Development Installation

For development or testing unreleased features:

```bash
# Clone the latest development branch
git clone -b develop <repository-url>
cd vecna

# Install in development mode
npm install
npm run dev -- setup  # Use dev mode instead of global install

# Or link for testing
npm run build && npm link
```

## 🔄 Updates

### Updating Vecna

```bash
# Navigate to vecna directory
cd /path/to/vecna

# Pull latest changes
git pull origin main

# Rebuild and relink
npm install
npm run build
npm link
```

### Migrating Configurations

When updating, your configurations in `~/.config/vecna/` and project `.vecna.json` files are preserved. If breaking changes occur, vecna will guide you through migration.

## 🎯 Next Steps

After successful installation:

1. **Read the [README](../README.md)** for usage examples
2. **Try the [Quick Start](../README.md#quick-start)** guide
3. **Configure your [Editor Integration](../README.md#editor-integration)**
4. **Explore [Commands](../README.md#commands)** reference

---

**Need help?** Check the [Troubleshooting](../README.md#troubleshooting) section in the main README.