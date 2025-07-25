#!/bin/bash

# Vecna Shell Integration Installer
# This script adds the vecna shell function to your shell configuration

SHELL_FUNCTION='vecna() { eval "$(VECNA_SHELL_MODE=true command vecna "$@")"; }'

echo "🌳 Vecna Shell Integration Installer"
echo ""

# Detect shell
if [[ $SHELL == *"zsh"* ]]; then
    SHELL_CONFIG="$HOME/.zshrc"
    SHELL_NAME="zsh"
elif [[ $SHELL == *"bash"* ]]; then
    if [[ -f "$HOME/.bash_profile" ]]; then
        SHELL_CONFIG="$HOME/.bash_profile"
    else
        SHELL_CONFIG="$HOME/.bashrc"
    fi
    SHELL_NAME="bash"
elif [[ $SHELL == *"fish"* ]]; then
    SHELL_CONFIG="$HOME/.config/fish/config.fish"
    SHELL_NAME="fish"
    SHELL_FUNCTION='function vecna; eval (env VECNA_SHELL_MODE=true command vecna $argv); end'
else
    echo "❌ Unsupported shell: $SHELL"
    echo "Please manually add this to your shell configuration:"
    echo "   $SHELL_FUNCTION"
    exit 1
fi

echo "Detected shell: $SHELL_NAME"
echo "Configuration file: $SHELL_CONFIG"
echo ""

# Check if function already exists
if grep -q "VECNA_SHELL_MODE" "$SHELL_CONFIG" 2>/dev/null; then
    echo "⚠️  Vecna shell integration already exists in $SHELL_CONFIG"
    echo "Would you like to update it? [y/N]"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        echo "Installation cancelled."
        exit 0
    fi
    
    # Remove existing lines
    if [[ "$SHELL_NAME" == "fish" ]]; then
        sed -i.bak '/function vecna.*VECNA_SHELL_MODE/d' "$SHELL_CONFIG"
    else
        sed -i.bak '/vecna().*VECNA_SHELL_MODE/d' "$SHELL_CONFIG"
    fi
fi

# Add the function
echo "" >> "$SHELL_CONFIG"
echo "# Vecna shell integration - enables automatic directory navigation" >> "$SHELL_CONFIG"
echo "$SHELL_FUNCTION" >> "$SHELL_CONFIG"

echo "✅ Successfully added vecna shell integration to $SHELL_CONFIG"
echo ""
echo "To use immediately, run:"
echo "   source $SHELL_CONFIG"
echo ""
echo "Or restart your terminal."
echo ""
echo "Now you can use 'vecna switch' and it will automatically navigate to the selected directory!"