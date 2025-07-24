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
        packageManager?: 'yarn' | 'npm' | 'pnpm' | 'auto';
        postCreateScripts?: string[];
        editor?: {
            command?: string;
            openOnSwitch?: boolean;
            preferCursor?: boolean;
        };
    };
    worktreeState?: {
        [treeName: string]: {
            branch: string;
            path: string;
            createdAt: string;
            lastAccessedAt: string;
            customConfig?: any;
        };
    };
}

export interface GlobalConfig {
    projects: ProjectConfig[];
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
        },

        updateWorktreeState: async (treeName: string, state: {
            branch: string;
            path: string;
            createdAt?: string;
            lastAccessedAt?: string;
            customConfig?: any;
        }): Promise<void> => {
            try {
                let config = await configManager(fs).readLocalConfig();
                if (!config) {
                    throw new Error('No .vecna.json found. Run "vecna setup" first.');
                }

                if (!config.worktreeState) {
                    config.worktreeState = {};
                }

                config.worktreeState[treeName] = {
                    branch: state.branch,
                    path: state.path,
                    createdAt: state.createdAt || new Date().toISOString(),
                    lastAccessedAt: state.lastAccessedAt || new Date().toISOString(),
                    customConfig: state.customConfig
                };

                await configManager(fs).writeLocalConfig(config);
            } catch (error) {
                console.error('Error updating worktree state:', error);
                throw error;
            }
        },

        getWorktreeState: async (treeName: string): Promise<any> => {
            try {
                const config = await configManager(fs).readLocalConfig();
                return config?.worktreeState?.[treeName] || null;
            } catch (error) {
                console.error('Error getting worktree state:', error);
                return null;
            }
        },

        removeWorktreeState: async (treeName: string): Promise<void> => {
            try {
                let config = await configManager(fs).readLocalConfig();
                if (!config || !config.worktreeState) {
                    return;
                }

                delete config.worktreeState[treeName];
                await configManager(fs).writeLocalConfig(config);
            } catch (error) {
                console.error('Error removing worktree state:', error);
                throw error;
            }
        },

        getAllWorktreeStates: async (): Promise<{ [key: string]: any }> => {
            try {
                const config = await configManager(fs).readLocalConfig();
                return config?.worktreeState || {};
            } catch (error) {
                console.error('Error getting all worktree states:', error);
                return {};
            }
        }
    };
}
