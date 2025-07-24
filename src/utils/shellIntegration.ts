import fs from 'fs-extra';
import path from 'path';
import { homedir } from 'os';

export const shellIntegration = {
    /**
     * Generate a shell function for worktree switching
     */
    generateSwitchFunction: (shell: 'bash' | 'zsh' | 'fish' = 'bash'): string => {
        if (shell === 'fish') {
            return `
function vecna-switch
    set result (vecna switch --json)
    if test $status -eq 0
        set worktree_path (echo $result | jq -r '.path')
        if test -n "$worktree_path"
            cd $worktree_path
        end
    end
end
`;
        }

        // Bash/Zsh version
        return `
vecna-switch() {
    local result=$(vecna switch --json)
    if [ $? -eq 0 ]; then
        local worktree_path=$(echo "$result" | jq -r '.path')
        if [ -n "$worktree_path" ]; then
            cd "$worktree_path"
        fi
    fi
}
`;
    },

    /**
     * Detect the user's shell
     */
    detectShell: (): string => {
        const shell = process.env.SHELL || '';
        if (shell.includes('zsh')) return 'zsh';
        if (shell.includes('fish')) return 'fish';
        return 'bash';
    },

    /**
     * Get the shell configuration file path
     */
    getShellConfigPath: (): string => {
        const shell = shellIntegration.detectShell();
        const home = homedir();

        switch (shell) {
            case 'zsh':
                return path.join(home, '.zshrc');
            case 'fish':
                return path.join(home, '.config', 'fish', 'config.fish');
            default:
                return path.join(home, '.bashrc');
        }
    },

    /**
     * Install shell integration
     */
    installShellIntegration: async (): Promise<void> => {
        const shell = shellIntegration.detectShell();
        const configPath = shellIntegration.getShellConfigPath();
        const functionCode = shellIntegration.generateSwitchFunction(shell as any);

        // Check if already installed
        const configContent = await fs.readFile(configPath, 'utf-8').catch(() => '');
        if (configContent.includes('vecna-switch')) {
            console.log('Shell integration already installed.');
            return;
        }

        // Append to config file
        const integrationBlock = `
# Vecna shell integration
${functionCode}
`;

        await fs.appendFile(configPath, integrationBlock);
        console.log(`Shell integration installed in ${configPath}`);
        console.log('Please restart your shell or run: source ' + configPath);
    },

    /**
     * Create a simple cd script that can be sourced
     */
    createCdScript: async (targetPath: string): Promise<string> => {
        const scriptPath = path.join(homedir(), '.vecna-switch.sh');
        await fs.writeFile(scriptPath, `cd "${targetPath}"`);
        return scriptPath;
    }
};
