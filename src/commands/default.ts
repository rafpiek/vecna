import inquirer from 'inquirer';
import chalk from 'chalk';
type ConfigManager = ReturnType<typeof import('../utils/configManager').configManager>;

interface DefaultOptions {
    project?: boolean;
    clear?: boolean;
}

export default async (config: ConfigManager, options: DefaultOptions = {}) => {
    try {
        // Show current default project
        if (!options.project && !options.clear) {
            await showCurrentDefault(config);
            return;
        }

        // Clear default project
        if (options.clear) {
            await clearDefault(config);
            return;
        }

        // Show project picker to set default
        if (options.project) {
            await setDefaultProject(config);
            return;
        }

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(chalk.red('✗') + ' Default command failed:', errorMessage);
        process.exit(1);
    }
};

async function showCurrentDefault(config: ConfigManager) {
    const globalConfig = await config.readGlobalConfig();
    const defaultProject = globalConfig?.defaultProject;

    if (!defaultProject) {
        console.log(chalk.yellow('No default project set.'));
        console.log(chalk.gray('Use "vecna default -p" to set a default project.'));
        return;
    }

    console.log(chalk.cyan('Default Project:'));
    console.log(chalk.green(`  ${defaultProject.name}`));
    console.log(chalk.gray(`  Path: ${defaultProject.path}`));
}

async function clearDefault(config: ConfigManager) {
    const globalConfig = await config.readGlobalConfig();
    
    if (!globalConfig?.defaultProject) {
        console.log(chalk.yellow('No default project is currently set.'));
        return;
    }

    // Remove default project from global config
    delete globalConfig.defaultProject;
    await config.writeGlobalConfig(globalConfig);

    console.log(chalk.green('✓') + ' Default project cleared.');
}

async function setDefaultProject(config: ConfigManager) {
    const globalConfig = await config.readGlobalConfig();
    const projects = globalConfig?.projects || [];

    const projectList = projects;

    if (projectList.length === 0) {
        console.log(chalk.yellow('No projects found in global config.'));
        console.log(chalk.gray('Use "vecna setup" in a project directory to add projects.'));
        return;
    }

    console.log(chalk.cyan.bold('🌟 Select Default Project\n'));

    const choices = projectList.map((project: any) => ({
        name: `${project.name.padEnd(30)} ${chalk.gray('→')} ${project.path}`,
        value: project,
        short: project.name
    }));

    const { selectedProject } = await inquirer.prompt([
        {
            type: 'list',
            name: 'selectedProject',
            message: 'Choose default project:',
            choices,
            pageSize: Math.min(15, choices.length),
            loop: false
        }
    ]);

    // Update global config with default project
    globalConfig.defaultProject = {
        name: selectedProject.name,
        path: selectedProject.path
    };

    await config.writeGlobalConfig(globalConfig);

    console.log(chalk.green('✓') + ` Set "${selectedProject.name}" as default project.`);
    console.log(chalk.gray(`Now you can use vecna commands from anywhere to work with this project.`));
}