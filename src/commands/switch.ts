import { SimpleGit } from 'simple-git';
import { gitUtils } from '../utils/git';
import { configManager } from '../utils/configManager';
import inquirer from 'inquirer';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
// Dynamic import for clipboardy ESM module
import { spawn } from 'child_process';

interface SwitchOptions {
    json?: boolean;
    editor?: boolean;
}

async function selectWorktreeForJson(worktrees: any[]): Promise<any> {
    const choices: any[] = worktrees.map((wt) => {
        const branchDisplay = wt.branch.length > 40 ? wt.branch.substring(0, 37) + '...' : wt.branch;
        return {
            name: `${branchDisplay.padEnd(40)} ${chalk.gray('→')} ${wt.path}`,
            value: wt,
            short: wt.branch
        };
    });

    const { selectedWorktree } = await inquirer.prompt([
        {
            type: 'list',
            name: 'selectedWorktree',
            message: 'Choose worktree to navigate to:',
            choices,
            pageSize: Math.min(15, choices.length),
            loop: false
        }
    ]);

    return selectedWorktree;
}

export default async (gitInstance: SimpleGit, options: SwitchOptions = {}) => {
    const config = configManager(fs);
    
    try {
        // Determine project context
        const projectContext = await getProjectContext(gitInstance, config);
        
        if (!projectContext) {
            // No project context, show project picker
            await showProjectPicker(config, options);
            return;
        }

        // Create git instance for the project
        const projectGit = gitUtils(gitInstance.cwd(projectContext.path));
        
        // Get basic worktree list (just paths and branches)
        const worktrees = await projectGit.listWorktrees();

        if (worktrees.length === 0) {
            if (options.json) {
                console.log(JSON.stringify({ error: 'No worktrees found' }));
                process.exit(1);
            }
            console.log(chalk.yellow(`No worktrees found for project "${projectContext.name}".`));
            console.log(chalk.gray('Use "vecna start" to create one.'));
            return;
        }

        // If JSON mode and single worktree, return it directly for shell integration
        if (options.json) {
            if (worktrees.length === 1) {
                console.log(JSON.stringify({
                    branch: worktrees[0].branch,
                    path: worktrees[0].path
                }));
                return;
            }
            // Multiple worktrees - let user select interactively then output JSON
            const selected = await selectWorktreeForJson(worktrees);
            console.log(JSON.stringify({
                branch: selected.branch,
                path: selected.path
            }));
            return;
        }

        // Simple interactive selection
        await showSimpleWorktreeSelector(worktrees, options.editor || false, projectContext);

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (options.json) {
            console.log(JSON.stringify({ error: errorMessage }));
            process.exit(1);
        }
        console.error(chalk.red('✗') + ' Failed to switch worktree:', errorMessage);
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

async function showProjectPicker(config: any, options: SwitchOptions) {
    const globalConfig = await config.readGlobalConfig();
    const projects = globalConfig?.projects || [];
    const projectList = projects;

    if (projectList.length === 0) {
        console.log(chalk.yellow('No projects found.'));
        console.log(chalk.gray('Use "vecna setup" in a project directory to add projects.'));
        console.log(chalk.gray('Or set a default project with "vecna default -p".'));
        return;
    }

    console.log(chalk.cyan.bold('🌟 Select Project to Switch Worktrees\n'));

    const choices = projectList.map((project: any) => ({
        name: `${project.name.padEnd(30)} ${chalk.gray('→')} ${project.path}`,
        value: project,
        short: project.name
    }));

    const { selectedProject } = await inquirer.prompt([
        {
            type: 'list',
            name: 'selectedProject',
            message: 'Choose project:',
            choices,
            pageSize: Math.min(15, choices.length),
            loop: false
        }
    ]);

    console.log(chalk.gray(`\nTip: Set "${selectedProject.name}" as default with: vecna default -p\n`));

    // Now get worktrees for the selected project and continue
    const SimpleGit = (await import('simple-git')).default;
    const projectGit = gitUtils(SimpleGit().cwd(selectedProject.path));
    
    const worktrees = await projectGit.listWorktrees();

    if (worktrees.length === 0) {
        console.log(chalk.yellow(`No worktrees found for project "${selectedProject.name}".`));
        console.log(chalk.gray('Use "vecna start" to create one.'));
        return;
    }

    await showSimpleWorktreeSelector(worktrees, options.editor || false, selectedProject);
}

async function showSimpleWorktreeSelector(worktrees: any[], shouldOpenInEditor: boolean = false, projectContext?: any): Promise<void> {
    // Interactive mode with colors - output to stderr so stdout is clean for command substitution
    console.error(chalk.cyan.bold('🌳 Select Worktree\n'));

    // Simple choices - just branch name and path
    const choices: any[] = worktrees.map((wt) => {
        const branchDisplay = wt.branch.length > 40 ? wt.branch.substring(0, 37) + '...' : wt.branch;
        return {
            name: `${branchDisplay.padEnd(40)} ${chalk.gray('→')} ${wt.path}`,
            value: wt,
            short: wt.branch
        };
    });

    const { selectedWorktree } = await inquirer.prompt([
        {
            type: 'list',
            name: 'selectedWorktree',
            message: 'Choose worktree to navigate to:',
            choices,
            pageSize: Math.min(15, choices.length),
            loop: false
        }
    ]);

    console.error(chalk.cyan(`\nNavigating to ${selectedWorktree.branch}...`));
    
    // Optionally open in editor first
    if (shouldOpenInEditor) {
        await openInEditor(selectedWorktree);
    }
    
    // Output ONLY the cd command to stdout - everything else goes to stderr
    process.stdout.write(`cd "${selectedWorktree.path}"`);
}


async function openInEditor(worktree: any) {
    console.log(chalk.cyan(`\n📂 Opening ${worktree.branch} in editor...`));

    // Try to detect the editor
    const editors = ['code', 'cursor', 'subl', 'atom', 'vim'];
    let editor = null;

    for (const ed of editors) {
        try {
            // Check if editor is available
            await new Promise((resolve, reject) => {
                const proc = spawn('which', [ed], { stdio: 'ignore' });
                proc.on('close', (code) => {
                    if (code === 0) resolve(ed);
                    else reject();
                });
            });
            editor = ed;
            break;
        } catch {
            // Editor not found, try next
        }
    }

    if (editor) {
        try {
            spawn(editor, [worktree.path], {
                detached: true,
                stdio: 'ignore'
            }).unref();
            console.log(chalk.green(`✓ Opened in ${editor}`));
        } catch (error) {
            console.error(chalk.red(`✗ Failed to open in ${editor}`));
        }
    } else {
        console.log(chalk.yellow('⚠️  No supported editor found. Supported editors: code, cursor, subl, atom, vim'));
        console.log(chalk.gray(`You can manually open: ${worktree.path}`));
    }
}
