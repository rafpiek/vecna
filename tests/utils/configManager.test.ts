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

    describe('updateWorktreeState', () => {
        it('should update worktree state in config', async () => {
            const mockConfig: ProjectConfig = {
                name: 'test-project',
                path: '/path/to/project',
                worktreeState: {}
            };

            (mockFs.pathExists as jest.Mock).mockResolvedValue(true);
            (mockFs.readJson as jest.Mock).mockResolvedValue(mockConfig);

            await manager.updateWorktreeState('test-tree', {
                branch: 'feature/test',
                path: '/path/to/worktree'
            });

            expect(mockFs.writeJson).toHaveBeenCalledWith(
                expect.stringContaining('.vecna.json'),
                expect.objectContaining({
                    worktreeState: expect.objectContaining({
                        'test-tree': expect.objectContaining({
                            branch: 'feature/test',
                            path: '/path/to/worktree'
                        })
                    })
                }),
                { spaces: 2 }
            );
        });
    });

    describe('removeWorktreeState', () => {
        it('should remove worktree state from config', async () => {
            const mockConfig: ProjectConfig = {
                name: 'test-project',
                path: '/path/to/project',
                worktreeState: {
                    'test-tree': {
                        branch: 'feature/test',
                        path: '/path/to/worktree',
                        createdAt: '2024-01-01T00:00:00.000Z',
                        lastAccessedAt: '2024-01-01T00:00:00.000Z'
                    }
                }
            };

            (mockFs.pathExists as jest.Mock).mockResolvedValue(true);
            (mockFs.readJson as jest.Mock).mockResolvedValue(mockConfig);

            await manager.removeWorktreeState('test-tree');

            expect(mockFs.writeJson).toHaveBeenCalledWith(
                expect.stringContaining('.vecna.json'),
                expect.objectContaining({
                    worktreeState: {}
                }),
                { spaces: 2 }
            );
        });
    });
});
