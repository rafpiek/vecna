import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { configManager, ProjectConfig } from '../../src/utils/configManager';
import { gitUtils } from '../../src/utils/git';
import lintCommand from '../../src/commands/lint';
import { spawn } from 'child_process';
import { dependencyExists } from '../../src/utils/dependencyCheck';

jest.mock('child_process');
jest.mock('../../src/utils/dependencyCheck');

describe('lint command', () => {
    let mockConfigManager: DeepMockProxy<ReturnType<typeof configManager>>;
    let mockGitUtils: DeepMockProxy<ReturnType<typeof gitUtils>>;
    let spawnSpy: jest.SpyInstance;

    beforeEach(() => {
        jest.clearAllMocks();
        mockConfigManager = mockDeep<ReturnType<typeof configManager>>();
        mockGitUtils = mockDeep<ReturnType<typeof gitUtils>>();
        spawnSpy = (spawn as jest.Mock).mockReturnValue({ on: jest.fn(), exitCode: 0 });
    });

    it('should show an error if not in a git repo', async () => {
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        mockGitUtils.isGitRepo.mockResolvedValue(false);
        await lintCommand(mockConfigManager, mockGitUtils, 'all', {});
        expect(console.error).toHaveBeenCalledWith('This command must be run inside a git repository.');
        consoleErrorSpy.mockRestore();
    });

    it('should show an error if config is not found', async () => {
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        mockGitUtils.isGitRepo.mockResolvedValue(true);
        mockConfigManager.readLocalConfig.mockResolvedValue(null);
        await lintCommand(mockConfigManager, mockGitUtils, 'all', {});
        expect(console.error).toHaveBeenCalledWith('No .vecna.json found. Run "vecna setup" first.');
        consoleErrorSpy.mockRestore();
    });

    it('should show an error if linter is not found', async () => {
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        mockGitUtils.isGitRepo.mockResolvedValue(true);
        const localConfig: ProjectConfig = {
            name: 'test-project',
            path: '/path/to/project',
            linter: { js: 'nonexistent-linter' }
        };
        mockConfigManager.readLocalConfig.mockResolvedValue(localConfig);
        mockGitUtils.getModifiedFiles.mockResolvedValue({ committed: ['file1.js'], uncommitted: [] });
        (dependencyExists as jest.Mock).mockResolvedValue(false);

        await lintCommand(mockConfigManager, mockGitUtils, 'all', {});

        expect(console.error).toHaveBeenCalledWith('Linter "nonexistent-linter" not found. Please install it.');
        consoleErrorSpy.mockRestore();
    });

    it('should lint all modified files', async () => {
        mockGitUtils.isGitRepo.mockResolvedValue(true);
        const localConfig: ProjectConfig = {
            name: 'test-project',
            path: '/path/to/project',
            linter: { js: 'eslint', rb: 'rubocop' }
        };
        mockConfigManager.readLocalConfig.mockResolvedValue(localConfig);
        mockGitUtils.getModifiedFiles.mockResolvedValue({
            committed: ['file1.js', 'file2.rb'],
            uncommitted: ['file3.ts']
        });
        (dependencyExists as jest.Mock).mockResolvedValue(true);

        await lintCommand(mockConfigManager, mockGitUtils, 'all', {});

        expect(spawnSpy).toHaveBeenCalledWith(expect.stringContaining('eslint'), expect.arrayContaining(['file1.js', 'file3.ts']), expect.any(Object));
        expect(spawnSpy).toHaveBeenCalledWith('rubocop', expect.arrayContaining(['file2.rb']), expect.any(Object));
    });

    it('should only lint uncommitted files with -e flag', async () => {
        mockGitUtils.isGitRepo.mockResolvedValue(true);
        const localConfig: ProjectConfig = {
            name: 'test-project',
            path: '/path/to/project',
            linter: { js: 'eslint' }
        };
        mockConfigManager.readLocalConfig.mockResolvedValue(localConfig);
        mockGitUtils.getModifiedFiles.mockResolvedValue({
            committed: ['file1.js'],
            uncommitted: ['file2.ts']
        });
        (dependencyExists as jest.Mock).mockResolvedValue(true);

        await lintCommand(mockConfigManager, mockGitUtils, 'all', { uncommitted: true });

        expect(spawnSpy).toHaveBeenCalledWith(expect.stringContaining('eslint'), expect.arrayContaining(['file2.ts']), expect.any(Object));
        expect(spawnSpy).not.toHaveBeenCalledWith(expect.stringContaining('eslint'), expect.arrayContaining(['file1.js']), expect.any(Object));
    });
});
