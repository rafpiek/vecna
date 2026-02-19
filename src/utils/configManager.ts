import path from 'path';
import os from 'os';
import fs from 'fs-extra';

const GLOBAL_CONFIG_DIR = path.join(os.homedir(), '.config', 'vecna');
const GLOBAL_CONFIG_PATH = path.join(GLOBAL_CONFIG_DIR, 'config.json');
const LOCAL_CONFIG_FILENAME = '.vecna.json';

export interface ProjectConfig {
    name: string;
    path: string;
    linter?: {
        js?: string;
        rb?: string;
    };
    test?: {
        rb?: string;
    };
    mainBranch?: string;
    worktrees?: {
        baseDir?: string;
        copyFiles?: string[];
        copyPatterns?: string[];
        defaultBranch?: string;
        autoInstall?: boolean;
        packageManager?: 'yarn' | 'npm' | 'pnpm' | 'bun' | 'auto';
        postCreateScripts?: string[];
        editor?: {
            command?: string;
            openOnSwitch?: boolean;
            preferCursor?: boolean;
        };
    };
}

export interface GlobalConfig {
    projects: ProjectConfig[];
    defaultProject?: {
        name: string;
        path: string;
    };
}

export function configManager(fs: any) {
    return {
        ensureGlobalConfig: async (): Promise<void> => {
            await fs.ensureDir(GLOBAL_CONFIG_DIR);
            const configExists = await fs.pathExists(GLOBAL_CONFIG_PATH);
            if (!configExists) {
                await fs.writeJson(GLOBAL_CONFIG_PATH, { projects: [] }, { spaces: 2 });
            }
        },

        readGlobalConfig: async (): Promise<GlobalConfig> => {
            await configManager(fs).ensureGlobalConfig();
            return await fs.readJson(GLOBAL_CONFIG_PATH);
        },

        writeGlobalConfig: async (config: GlobalConfig): Promise<void> => {
            await fs.writeJson(GLOBAL_CONFIG_PATH, config, { spaces: 2 });
        },

        updateGlobalConfig: async (projectConfig: ProjectConfig): Promise<void> => {
            const config = await configManager(fs).readGlobalConfig();
            const projectIndex = config.projects.findIndex(p => p.name === projectConfig.name);

            if (projectIndex > -1) {
                config.projects[projectIndex] = { ...config.projects[projectIndex], ...projectConfig };
            } else {
                config.projects.push(projectConfig);
            }

            await fs.writeJson(GLOBAL_CONFIG_PATH, config, { spaces: 2 });
        },

        readLocalConfig: async (): Promise<ProjectConfig | null> => {
            try {
                const configPath = path.join(process.cwd(), '.vecna.json');
                if (await fs.pathExists(configPath)) {
                    const config = await fs.readJson(configPath);
                    return config;
                }
                return null;
            } catch (error) {
                console.error('Error reading local config:', error);
                return null;
            }
        },

        writeLocalConfig: async (config: ProjectConfig): Promise<void> => {
            try {
                const configPath = path.join(process.cwd(), '.vecna.json');
                await fs.writeJson(configPath, config, { spaces: 2 });
            } catch (error) {
                console.error('Error writing local config:', error);
                throw error;
            }
        }
    };
}
