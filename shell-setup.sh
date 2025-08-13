#!/bin/bash
# vecna shell setup
#
# To use, add the following to your shell's config file (e.g., ~/.bashrc, ~/.zshrc):
#
#   source /path/to/vecna/shell-setup.sh
#
# Or, for a more robust setup that works from anywhere:
#
#   export VECNA_CLI_PATH=/path/to/vecna
#   source $VECNA_CLI_PATH/shell-setup.sh
#

function vecna() {
    export VECNA_SHELL=true
    local output
    local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    output=$("$script_dir/dist/index.js" "$@")
    if [[ -n "$output" ]]; then
        if [[ "$output" == "source "* ]]; then
            eval "$output"
        else
            echo "$output"
        fi
    fi
}
