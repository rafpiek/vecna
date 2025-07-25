# Vecna shell function for directory switching
# Add this to your ~/.bashrc, ~/.zshrc, or shell config file

vecna-switch() {
    local result=$(vecna switch --path 2>/dev/null)
    if [ $? -eq 0 ] && [ -n "$result" ]; then
        cd "$result"
    else
        # Fallback to interactive mode with eval
        eval "$(vecna switch)"
    fi
}

# Alias for convenience
alias vs="vecna-switch"