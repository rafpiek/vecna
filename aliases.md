# Vecna Zsh Aliases

This document provides suggested zsh aliases to make vecna commands faster and more convenient to use. Add these to your `~/.zshrc` file.

## Core Commands

```bash
# Main workflow commands
alias vs="vecna start"                    # Start new worktree
alias vw="vecna switch"                   # Switch between worktrees  
alias vws="vecna switch -s"               # Switch and spawn shell
alias vwe="vecna switch -e"               # Switch and open editor
alias vwse="vecna switch -e -s"           # Switch, open editor, and spawn shell

# Quick setup
alias vsetup="vecna setup"                # Setup project
alias vgo="vecna go"                      # Go to worktree by ticket number
```

## Worktree Management

```bash
# Worktree operations
alias vwl="vecna worktree list"           # List all worktrees
alias vwr="vecna worktree remove"         # Remove worktree (interactive)
alias vwi="vecna worktree info"           # Show worktree info (interactive)  
alias vwc="vecna worktree clean"          # Clean orphaned worktrees

# Worktree shortcuts with flags
alias vwla="vecna worktree list --active" # List only active worktrees
alias vwlj="vecna worktree list --json"   # List worktrees in JSON
alias vwrf="vecna worktree remove --force" # Force remove without prompts
alias vwcd="vecna worktree clean --dry-run" # Preview cleanup actions
```

## Development Tools

```bash
# Linting
alias vl="vecna lint all"                 # Lint all files
alias vlf="vecna lint all --fix"          # Lint and auto-fix
alias vljs="vecna lint js"                # Lint JavaScript/TypeScript
alias vlrb="vecna lint rb"                # Lint Ruby files
alias vlu="vecna lint all --uncommitted"  # Lint uncommitted changes
alias vlc="vecna lint all --committed"    # Lint committed changes

# Testing  
alias vt="vecna test all"                 # Run all tests
alias vtrb="vecna test rb"                # Run Ruby tests
alias vtu="vecna test all --uncommitted"  # Test uncommitted changes
alias vtc="vecna test all --committed"    # Test committed changes
```

## Project Management

```bash
# Project operations
alias vlist="vecna list"                  # List all projects
alias vdef="vecna default"                # Show current default project
alias vdefp="vecna default -p"            # Set default project
alias vdefc="vecna default --clear"       # Clear default project
alias vreset="vecna reset"                # Reset global configuration
```

## Cleanup & Maintenance

```bash
# Cleanup commands
alias vtidy="vecna tidy"                  # Clean merged branches
alias vtidyd="vecna tidy --dry-run"       # Preview tidy actions
alias vtidyf="vecna tidy --force"         # Force tidy without prompts
alias vshell="vecna shell-install"        # Install shell integration
```

## Advanced Workflows

```bash
# Combined workflow aliases for common patterns
alias vnew="vecna start -e"               # New worktree with editor
alias vquick="vecna start --no-install"   # Quick worktree without deps
alias vhotfix="vecna start --from production" # Hotfix from production

# Utility functions
function vbranch() {
    # Quick branch creation with editor
    vecna start --branch "$1" -e
}

function vfrom() {
    # Create branch from specific source
    vecna start --branch "$1" --from "$2" -e
}

function vticket() {
    # Go to worktree and open editor
    vecna go "$1" && vecna switch -e
}
```

## JSON Output for Scripting

```bash
# JSON aliases for scripting and automation
alias vwj="vecna switch --json"           # Switch with JSON output
alias vwp="vecna switch --path"           # Switch with path output only
alias vdefj="vecna default --json"        # Default project in JSON
```

## One-Letter Super Shortcuts (Optional)

If you want the absolute fastest access (use with caution to avoid conflicts):

```bash
# Super short aliases - uncomment if desired
# alias v="vecna"                         # Base command
# alias s="vecna start"                   # Start worktree
# alias w="vecna switch"                  # Switch worktree
```

## Installation

Add your chosen aliases to your `~/.zshrc` file:

```bash
# Add to ~/.zshrc
echo "# Vecna aliases" >> ~/.zshrc
cat aliases.md >> ~/.zshrc  # Add selected aliases
source ~/.zshrc             # Reload configuration
```

## Usage Examples

```bash
# Start new feature and open in editor
vs --branch feature/user-auth -e

# Quick switch with shell spawn
vws

# Clean up merged branches with preview
vtidyd

# Lint and fix uncommitted changes
vlfu

# Create hotfix branch with editor
vhotfix --branch hotfix/security-patch -e
```

## Customization Tips

1. **Adjust to your workflow**: Modify aliases based on your most common usage patterns
2. **Team consistency**: Share aliases with your team for consistent workflows  
3. **Avoid conflicts**: Check existing aliases with `alias | grep "^v"` before adding
4. **Function over alias**: Use functions for complex logic (see `vbranch` example above)

## Productivity Benefits

- **Faster typing**: `vws` vs `vecna switch -s`
- **Muscle memory**: Consistent short patterns
- **Reduced errors**: Less typing means fewer typos
- **Workflow optimization**: Combine frequently used flag combinations

Choose the aliases that match your workflow and add them to your shell configuration!