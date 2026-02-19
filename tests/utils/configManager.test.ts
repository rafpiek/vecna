import fs from 'fs-extra';
import { configManager, ProjectConfig } from '../../src/utils/configManager';

jest.mock('fs-extra', () => ({
    pathExists: jest.fn(),
    readJson: jest.fn(),
    writeJson: jest.fn(),
    ensureDir: jest.fn(),
}));

describe('configManager', () => {
    let mockFs: jest.Mocked<typeof fs>;
    let manager: ReturnType<typeof configManager>;

    beforeEach(() => {
        mockFs = fs as jest.Mocked<typeof fs>;
        manager = configManager(mockFs);
        jest.clearAllMocks();
    });

    describe('readLocalConfig', () => {
        it('should return null if config file does not exist', async () => {
            (mockFs.pathExists as jest.Mock).mockResolvedValue(false);

            const result = await manager.readLocalConfig();

            expect(result).toBeNull();
        });

        it('should return config if file exists', async () => {
            const mockConfig: ProjectConfig = {
                name: 'test-project',
                path: '/path/to/project',
                linter: { js: 'eslint' },
                test: { rb: 'rspec' }
            };

            (mockFs.pathExists as jest.Mock).mockResolvedValue(true);
            (mockFs.readJson as jest.Mock).mockResolvedValue(mockConfig);

            const result = await manager.readLocalConfig();

            expect(result).toEqual(mockConfig);
            expect(mockFs.readJson).toHaveBeenCalledWith(expect.stringContaining('.vecna.json'));
        });
    });

    describe('writeLocalConfig', () => {
        it('should write config to local file', async () => {
            const mockConfig: ProjectConfig = {
                name: 'test-project',
                path: '/path/to/project',
                linter: { js: 'eslint' },
                test: { rb: 'rspec' }
            };

            await manager.writeLocalConfig(mockConfig);

            expect(mockFs.writeJson).toHaveBeenCalledWith(
                expect.stringContaining('.vecna.json'),
                mockConfig,
                { spaces: 2 }
            );
        });
    });
});
