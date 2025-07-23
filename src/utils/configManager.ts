import path from 'path';
import os from 'os';
import { Fs } from 'fs-extra';

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
    }
}

export interface GlobalConfig {
    projects: ProjectConfig[];
}

export const configManager = (fs: Fs) => ({
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
        const localConfigPath = path.join(process.cwd(), LOCAL_CONFIG_FILENAME);
        try {
            return await fs.readJson(localConfigPath);
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
        await fs.writeJson(localConfigPath, projectConfig, { spaces: 2 });
    },
});
