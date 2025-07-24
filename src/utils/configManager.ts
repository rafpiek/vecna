import path from 'path';
import os from 'os';
import fs from 'fs-extra';

const GLOBAL_CONFIG_DIR = path.join(os.homedir(), '.config', 'vecna');
const GLOBAL_CONFIG_PATH = path.join(GLOBAL_CONFIG_DIR, 'config.json');
const LOCAL_CONFIG_FILENAME = '.vecna.json';

export interface ProjectConfig {
    name: string;
    path: string;
    mainBranch?: string;
    linter?: {
        js?: string;
        rb?: string;
    };
    test?: {
        rb?: string;
    }
}

export interface GlobalConfig {
    projects: ProjectConfig[];
}

export const configManager = (fsInstance: typeof fs) => ({
    ensureGlobalConfig: async (): Promise<void> => {
        await fsInstance.ensureDir(GLOBAL_CONFIG_DIR);
        const configExists = await fsInstance.pathExists(GLOBAL_CONFIG_PATH);
        if (!configExists) {
            await fsInstance.writeJson(GLOBAL_CONFIG_PATH, { projects: [] }, { spaces: 2 });
        }
    },

    readGlobalConfig: async (): Promise<GlobalConfig> => {
        await configManager(fsInstance).ensureGlobalConfig();
        return await fsInstance.readJson(GLOBAL_CONFIG_PATH);
    },

    updateGlobalConfig: async (projectConfig: ProjectConfig): Promise<void> => {
        const config = await configManager(fsInstance).readGlobalConfig();
        const projectIndex = config.projects.findIndex(p => p.name === projectConfig.name);

        if (projectIndex > -1) {
            config.projects[projectIndex] = { ...config.projects[projectIndex], ...projectConfig };
        } else {
            config.projects.push(projectConfig);
        }

        await fsInstance.writeJson(GLOBAL_CONFIG_PATH, config, { spaces: 2 });
    },

    readLocalConfig: async (): Promise<ProjectConfig | null> => {
        const localConfigPath = path.join(process.cwd(), LOCAL_CONFIG_FILENAME);
        try {
            return await fsInstance.readJson(localConfigPath);
        } catch (error) {
            return null;
        }
    },

    createLocalConfig: async (config: Omit<ProjectConfig, 'path'>): Promise<void> => {
        const localConfigPath = path.join(process.cwd(), LOCAL_CONFIG_FILENAME);
        const projectConfig: ProjectConfig = {
            ...config,
            path: process.cwd(),
        };
        await fsInstance.writeJson(localConfigPath, projectConfig, { spaces: 2 });
    },
});
