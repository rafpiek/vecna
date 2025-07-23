import { configManager, GlobalConfig } from '../../src/utils/configManager';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import fs from 'fs-extra';

describe('configManager', () => {
    let mockFs: DeepMockProxy<typeof fs>;
    let manager: ReturnType<typeof configManager>;

    beforeEach(() => {
        mockFs = mockDeep<typeof fs>();
        manager = configManager(mockFs);
    });

    describe('ensureGlobalConfig', () => {
        it('should create global config file if it does not exist', async () => {
            (mockFs.pathExists as jest.Mock).mockResolvedValue(false);
            await manager.ensureGlobalConfig();
            expect(mockFs.ensureDir).toHaveBeenCalled();
            expect(mockFs.writeJson).toHaveBeenCalledWith(expect.any(String), { projects: [] }, { spaces: 2 });
        });

        it('should not create global config if it exists', async () => {
            (mockFs.pathExists as jest.Mock).mockResolvedValue(true);
            await manager.ensureGlobalConfig();
            expect(mockFs.writeJson).not.toHaveBeenCalled();
        });
    });

    describe('readGlobalConfig', () => {
        it('should read and return the global config', async () => {
            const testConfig: GlobalConfig = { projects: [{ name: 'test-project', path: '/tmp' }] };
            (mockFs.pathExists as jest.Mock).mockResolvedValue(true);
            mockFs.readJson.mockResolvedValue(testConfig);

            const config = await manager.readGlobalConfig();

            expect(mockFs.readJson).toHaveBeenCalled();
            expect(config).toEqual(testConfig);
        });
    });

    describe('updateGlobalConfig', () => {
        it('should add a new project to the global config', async () => {
            const initialConfig: GlobalConfig = { projects: [] };
            const newProject = { name: 'new-project', path: '/tmp/new' };

            (mockFs.pathExists as jest.Mock).mockResolvedValue(true);
            mockFs.readJson.mockResolvedValue(initialConfig);

            await manager.updateGlobalConfig(newProject);

            expect(mockFs.writeJson).toHaveBeenCalledWith(
                expect.any(String),
                { projects: [newProject] },
                { spaces: 2 }
            );
        });
    });

    describe('createLocalConfig', () => {
        it('should create a local .vecna.json file', async () => {
            const localConfig = { name: 'local-project' };
            await manager.createLocalConfig(localConfig);
            expect(mockFs.writeJson).toHaveBeenCalledWith(
                expect.stringContaining('.vecna.json'),
                expect.objectContaining({ name: 'local-project' }),
                { spaces: 2 }
            );
        });
    });

    describe('readLocalConfig', () => {
        it('should read and return the local config', async () => {
            const testConfig = { name: 'local-project' };
            mockFs.readJson.mockResolvedValue(testConfig);
            const config = await manager.readLocalConfig();
            expect(config).toEqual(testConfig);
        });

        it('should return null if the local config is not found', async () => {
            mockFs.readJson.mockRejectedValue(new Error('File not found'));
            const config = await manager.readLocalConfig();
            expect(config).toBeNull();
        });
    });
});
