import fs from 'fs-extra';
import os from 'os';
import path from 'path';

jest.mock('os');
const mockedOs = jest.mocked(os);

describe('configManager', () => {
    let configManager: typeof import('../../src/utils/configManager');
    const FAKE_HOME_DIR = path.join(__dirname, 'test-home');
    const TEST_CONFIG_DIR = path.join(FAKE_HOME_DIR, '.config', 'vecna');
    const TEST_CONFIG_PATH = path.join(TEST_CONFIG_DIR, 'config.json');

    beforeEach(async () => {
        // Mock homedir to point to our test-specific directory
        mockedOs.homedir.mockReturnValue(FAKE_HOME_DIR);

        // Reset modules to force configManager to be re-evaluated with the mocked os
        jest.resetModules();
        configManager = require('../../src/utils/configManager');

        // Ensure the test directory is clean
        await fs.emptyDir(TEST_CONFIG_DIR);
    });

    afterAll(async () => {
        // Clean up the entire test home directory
        await fs.remove(FAKE_HOME_DIR);
    });

    it('should ensure global config file exists', async () => {
        await configManager.ensureGlobalConfig();
        const configExists = await fs.pathExists(TEST_CONFIG_PATH);
        expect(configExists).toBe(true);
        const config = await fs.readJson(TEST_CONFIG_PATH);
        expect(config).toEqual({ projects: [] });
    });

    it('should read global config', async () => {
        const testConfig = { projects: [{ name: 'test-project', path: '/tmp' }] };
        await fs.writeJson(TEST_CONFIG_PATH, testConfig, { spaces: 2 });

        const config = await configManager.readGlobalConfig();
        expect(config).toEqual(testConfig);
    });

    it('should update global config with a new project', async () => {
        const newProject = { name: 'new-project', path: '/tmp/new' };
        await configManager.updateGlobalConfig(newProject);

        const config = await configManager.readGlobalConfig();
        expect(config.projects).toHaveLength(1);
        expect(config.projects[0]).toEqual(newProject);
    });

    it('should create and read local config', async () => {
        const localConfig = { name: 'local-project', linter: { js: 'eslint' } };
        const localConfigPath = path.join(process.cwd(), '.vecna.json');

        await configManager.createLocalConfig(localConfig);

        const readConfig = await configManager.readLocalConfig();
        expect(readConfig).not.toBeNull();
        expect(readConfig.name).toBe('local-project');
        expect(readConfig.linter.js).toBe('eslint');

        await fs.remove(localConfigPath);
    });
});
