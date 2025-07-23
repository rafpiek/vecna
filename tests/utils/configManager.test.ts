import fs from 'fs-extra';
import { ensureGlobalConfig, readGlobalConfig, updateGlobalConfig, createLocalConfig, readLocalConfig } from '../../src/utils/configManager';

jest.mock('fs-extra');
const mockedFs = jest.mocked(fs);

describe('configManager', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should ensure global config file exists, creating it if not present', async () => {
        mockedFs.pathExists.mockResolvedValue(false as any);
        await ensureGlobalConfig();
        expect(mockedFs.ensureDir).toHaveBeenCalled();
        expect(mockedFs.writeJson).toHaveBeenCalledWith(expect.any(String), { projects: [] }, { spaces: 2 });
    });

    it('should not create global config if it exists', async () => {
        mockedFs.pathExists.mockResolvedValue(true as any);
        await ensureGlobalConfig();
        expect(mockedFs.writeJson).not.toHaveBeenCalled();
    });

    it('should read global config', async () => {
        const testConfig = { projects: [{ name: 'test-project', path: '/tmp' }] };
        mockedFs.readJson.mockResolvedValue(testConfig);
        const config = await readGlobalConfig();
        expect(config).toEqual(testConfig);
    });

    it('should update global config', async () => {
        const initialConfig = { projects: [] };
        const newProject = { name: 'new-project', path: '/tmp/new' };
        mockedFs.readJson.mockResolvedValue(initialConfig);

        await updateGlobalConfig(newProject);

        expect(mockedFs.writeJson).toHaveBeenCalledWith(
            expect.any(String),
            { projects: [newProject] },
            { spaces: 2 }
        );
    });

    it('should create local config', async () => {
        const localConfig = { name: 'local-project' };
        await createLocalConfig(localConfig);
        expect(mockedFs.writeJson).toHaveBeenCalledWith(
            expect.stringContaining('.vecna.json'),
            expect.objectContaining({ name: 'local-project' }),
            { spaces: 2 }
        );
    });

    it('should read local config', async () => {
        const testConfig = { name: 'local-project' };
        mockedFs.readJson.mockResolvedValue(testConfig);
        const config = await readLocalConfig();
        expect(config).toEqual(testConfig);
    });

    it('should return null when local config is not found', async () => {
        mockedFs.readJson.mockRejectedValue(new Error('File not found'));
        const config = await readLocalConfig();
        expect(config).toBeNull();
    });
});
