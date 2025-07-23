import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import * as configManager from '../../src/utils/configManager';

const TEST_CONFIG_DIR = path.join(os.homedir(), '.config', 'vecna-test');
const TEST_CONFIG_PATH = path.join(TEST_CONFIG_DIR, 'config.json');

jest.spyOn(configManager, 'GLOBAL_CONFIG_DIR', 'get').mockReturnValue(TEST_CONFIG_DIR);
jest.spyOn(configManager, 'GLOBAL_CONFIG_PATH', 'get').mockReturnValue(TEST_CONFIG_PATH);


describe('configManager', () => {
    beforeEach(async () => {
        await fs.emptyDir(TEST_CONFIG_DIR);
    });

    afterAll(async () => {
        await fs.remove(TEST_CONFIG_DIR);
    });

    it('should ensure global config file exists', async () => {
        await configManager.ensureGlobalConfig();
        const configExists = await fs.pathExists(TEST_CONFIG_PATH);
        expect(configExists).toBe(true);
    });

    it('should read global config', async () => {
        await fs.writeJson(TEST_CONFIG_PATH, { projects: [{ name: 'test-project', path: '/tmp' }] });
        const config = await configManager.readGlobalConfig();
        expect(config.projects).toHaveLength(1);
        expect(config.projects[0].name).toBe('test-project');
    });

    it('should update global config with a new project', async () => {
        await configManager.updateGlobalConfig({ name: 'new-project', path: '/tmp/new' });
        const config = await configManager.readGlobalConfig();
        expect(config.projects).toHaveLength(1);
        expect(config.projects[0].name).toBe('new-project');
    });

    it('should create and read local config', async () => {
        const localConfig = { name: 'local-project', linter: { js: 'eslint' } };
        await configManager.createLocalConfig(localConfig);

        const readConfig = await configManager.readLocalConfig();
        expect(readConfig).not.toBeNull();
        expect(readConfig?.name).toBe('local-project');
        expect(readConfig?.linter?.js).toBe('eslint');

        await fs.remove('.vecna.json');
    });
});
