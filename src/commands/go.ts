import { SimpleGit } from 'simple-git';
import { gitUtils } from '../utils/git';
import { configManager } from '../utils/configManager';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { spawn } from 'child_process';

async function copyToClipboard(text: string): Promise<void> {
    return new Promise((resolve, reject) => {
        let command: string;
        let args: string[];

        // Determine the platform-specific clipboard command
        if (process.platform === 'darwin') {
            command = 'pbcopy';
            args = [];
        } else if (process.platform === 'linux') {
            command = 'xclip';
            args = ['-selection', 'clipboard'];
        } else if (process.platform === 'win32') {
            command = 'clip';
            args = [];
        } else {
            reject(new Error(`Unsupported platform: ${process.platform}`));
            return;
        }

        const proc = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'] });
        
        proc.stdin.write(text);
        proc.stdin.end();

        proc.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`Clipboard command failed with code ${code}`));
            }
        });

        proc.on('error', (error) => {
            reject(error);
        });
    });
}

export default async (gitInstance: SimpleGit, ticketNumber: string) => {
    const config = configManager(fs);

    try {
        // Determine project context
        const projectContext = await getProjectContext(gitInstance, config);

        if (!projectContext) {
            console.error(chalk.red('✗') + ' No project context found. Run "vecna setup" or set a default project.');
            process.exit(1);
        }

        // Create git instance for the project
        const projectGit = gitUtils(gitInstance.cwd(projectContext.path));

        // Get basic worktree list (just paths and branches)
        const allWorktrees = await projectGit.listWorktrees();
        
        if (allWorktrees.length === 0) {
            console.error(chalk.red('✗') + ' No worktrees found.');
            process.exit(1);
        }

        // Filter out main repo directory - just remove "chatchat" for now (same as switch command)
        const worktrees = allWorktrees.filter(wt => {
            const dirName = path.basename(wt.path);
            return dirName !== 'chatchat';
        });

        if (worktrees.length === 0) {
            console.error(chalk.red('✗') + ' No worktrees found.');
            process.exit(1);
        }

        // Find worktree containing the ticket number
        const matchingWorktree = worktrees.find(wt => {
            const dirName = path.basename(wt.path);
            return dirName.includes(ticketNumber);
        });

        if (!matchingWorktree) {
            console.error(chalk.red('✗') + ` No worktree found containing ticket number "${ticketNumber}".`);
            process.exit(1);
        }

        // Navigate to the directory
        process.chdir(matchingWorktree.path);
        
        // Copy cd command to clipboard
        const cdCommand = `cd "${matchingWorktree.path}"`;
        try {
            await copyToClipboard(cdCommand);
        } catch (error) {
            // Silently fail on clipboard copy - not critical
        }
        
        // Output the cd command
        console.log(cdCommand);

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(chalk.red('✗') + ' Failed to find worktree:', errorMessage);
        process.exit(1);
    }
};

async function getProjectContext(gitInstance: SimpleGit, config: any) {
    // Check if we're in a directory with .vecna.json (local project)
    const currentDir = process.cwd();
    const vecnaConfigPath = path.join(currentDir, '.vecna.json');

    if (await fs.pathExists(vecnaConfigPath)) {
        const localConfig = await fs.readJson(vecnaConfigPath);
        return {
            name: localConfig.name,
            path: currentDir,
            isLocal: true
        };
    }

    // Check for default project in global config
    const globalConfig = await config.readGlobalConfig();
    if (globalConfig?.defaultProject) {
        return {
            name: globalConfig.defaultProject.name,
            path: globalConfig.defaultProject.path,
            isDefault: true
        };
    }

    return null;
}