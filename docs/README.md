# Vecna Documentation

Complete documentation for Vecna - the powerful CLI tool for managing multi-language monorepos with advanced git worktree automation.

## 📚 Documentation Index

### Getting Started
- **[Main README](../README.md)** - Project overview, features, and quick start guide
- **[Installation Guide](INSTALLATION.md)** - Detailed installation instructions for all platforms
- **[Command Reference](COMMANDS.md)** - Complete reference for all CLI commands

### Configuration & Setup
- **[Configuration Guide](CONFIGURATION.md)** - Comprehensive configuration options and examples
- **[Cursor Integration](CURSOR-INTEGRATION.md)** - Detailed guide for Cursor editor integration

### Support
- **[Troubleshooting](TROUBLESHOOTING.md)** - Common issues, solutions, and debugging

## 🚀 Quick Navigation

### New Users
1. Start with the [Main README](../README.md) for project overview
2. Follow the [Installation Guide](INSTALLATION.md) to get set up
3. Use the [Configuration Guide](CONFIGURATION.md) to customize for your workflow

### Existing Users
- **Commands:** [Command Reference](COMMANDS.md) for detailed usage
- **Editor Setup:** [Cursor Integration](CURSOR-INTEGRATION.md) for AI-powered development
- **Issues:** [Troubleshooting](TROUBLESHOOTING.md) for problem solving

### Developers
- **Contributing:** See the main [README](../README.md#contributing) for development setup
- **Architecture:** Explore the `src/` directory structure
- **Testing:** Run `npm test` and check test files in `tests/`

## 📖 Documentation Features

### Comprehensive Coverage
- ✅ **Installation** - Multiple platforms and methods
- ✅ **Commands** - Every command with examples and options
- ✅ **Configuration** - All settings with real-world examples
- ✅ **Integration** - Detailed Cursor editor integration
- ✅ **Troubleshooting** - Common issues and solutions

### User-Focused
- **Step-by-step examples** for common workflows
- **Copy-paste commands** that actually work
- **Real-world scenarios** from feature development to hotfixes
- **Progressive complexity** from basic to advanced usage

### Searchable & Organized
- **Table of contents** in every document
- **Cross-references** between related sections
- **Examples first** approach with explanations
- **Troubleshooting index** for quick problem resolution

## 🎯 Common Use Cases

### Daily Development
- **[Creating worktrees](COMMANDS.md#vecna-start)** - Replace complex manual workflows
- **[Switching between features](COMMANDS.md#vecna-switch)** - Interactive worktree management
- **[Editor integration](CURSOR-INTEGRATION.md#basic-usage)** - Seamless Cursor automation

### Team Workflows
- **[Configuration sharing](CONFIGURATION.md#team-integration)** - Standardized team setups
- **[Project templates](CONFIGURATION.md#configuration-examples)** - Consistent project configurations
- **[Shell integration](COMMANDS.md#vecna-shell-install)** - Enhanced terminal workflows

### Troubleshooting
- **[Installation issues](TROUBLESHOOTING.md#installation-problems)** - Platform-specific solutions
- **[Git worktree problems](TROUBLESHOOTING.md#worktree-issues)** - Common git-related issues
- **[Editor integration](TROUBLESHOOTING.md#editor-integration)** - Cursor and editor problems

## 🔍 Finding Information

### By Task
- **Installing:** [Installation Guide](INSTALLATION.md)
- **Configuring:** [Configuration Guide](CONFIGURATION.md)
- **Using commands:** [Command Reference](COMMANDS.md)
- **Integrating editors:** [Cursor Integration](CURSOR-INTEGRATION.md)
- **Solving problems:** [Troubleshooting](TROUBLESHOOTING.md)

### By Experience Level
- **Beginner:** Main README → Installation → Configuration
- **Intermediate:** Commands → Cursor Integration → Troubleshooting
- **Advanced:** All guides → Source code → Contributing

### Quick Reference
```bash
# Get help for any command
vecna --help
vecna <command> --help

# Debug any issue
DEBUG=vecna* vecna <command>

# Check configuration
node -e "console.log(JSON.parse(require('fs').readFileSync('.vecna.json')))"
```

## 🤝 Contributing to Documentation

### Improving Docs
- **Fix typos/errors:** Edit files directly and submit PR
- **Add examples:** Real-world usage examples are always welcome
- **Update screenshots:** Keep visual content current
- **Expand troubleshooting:** Add solutions for new issues

### Documentation Standards
- **Clear headings** with emoji for visual scanning
- **Code examples** that can be copy-pasted
- **Cross-references** to related sections
- **Progressive disclosure** from simple to complex

## 📧 Getting Help

### Self-Service
1. **Search documentation** using Ctrl+F in your browser
2. **Check troubleshooting** for known issues
3. **Try debug mode** with `DEBUG=vecna*`
4. **Validate configuration** with JSON tools

### Community Support
- **GitHub Issues** for bugs and feature requests
- **Documentation** improvements via pull requests
- **Examples** and workflow sharing

---

**Documentation Version:** v1.0.0  
**Last Updated:** July 2025  
**Coverage:** Complete for all released features

Happy coding with Vecna! 🌳