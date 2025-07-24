import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { configManager, ProjectConfig } from '../../src/utils/configManager';
import { gitUtils } from '../../src/utils/git';
import testCommand from '../../src/commands/test';
import { spawn } from 'child_process';
import { dependencyExists } from '../../src/utils/dependencyCheck';

jest.mock('child_process');
jest.mock('../../src/utils/dependencyCheck');

describe('test command', () => {
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
        await testCommand(mockConfigManager, mockGitUtils, 'all', {});
        expect(console.error).toHaveBeenCalledWith('This command must be run inside a git repository.');
        consoleErrorSpy.mockRestore();
    });

    it('should show an error if config is not found', async () => {
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        mockGitUtils.isGitRepo.mockResolvedValue(true);
        mockConfigManager.readLocalConfig.mockResolvedValue(null);
        await testCommand(mockConfigManager, mockGitUtils, 'all', {});
        expect(console.error).toHaveBeenCalledWith('No .vecna.json found. Run "vecna setup" first.');
        consoleErrorSpy.mockRestore();
    });

    it('should show an error if test runner is not found', async () => {
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        mockGitUtils.isGitRepo.mockResolvedValue(true);
        const localConfig: ProjectConfig = {
            name: 'test-project',
            path: '/path/to/project',
            test: { rb: 'nonexistent-runner' }
        };
        mockConfigManager.readLocalConfig.mockResolvedValue(localConfig);
        mockGitUtils.getModifiedFiles.mockResolvedValue({ committed: ['file1_spec.rb'], uncommitted: [] });
        (dependencyExists as jest.Mock).mockResolvedValue(false);

        await testCommand(mockConfigManager, mockGitUtils, 'all', {});

        expect(console.error).toHaveBeenCalledWith('Test runner "nonexistent-runner" not found. Please install it.');
        consoleErrorSpy.mockRestore();
    });

    it('should run tests for all modified ruby test files', async () => {
        mockGitUtils.isGitRepo.mockResolvedValue(true);
        const localConfig: ProjectConfig = {
            name: 'test-project',
            path: '/path/to/project',
            test: { rb: 'rspec' }
        };
        mockConfigManager.readLocalConfig.mockResolvedValue(localConfig);
        mockGitUtils.getModifiedFiles.mockResolvedValue({
            committed: ['file1_spec.rb', 'file2.js'],
            uncommitted: ['file3_spec.rb']
        });
        (dependencyExists as jest.Mock).mockResolvedValue(true);

        await testCommand(mockConfigManager, mockGitUtils, 'all', {});

        expect(spawnSpy).toHaveBeenCalledWith('rspec', ['file1_spec.rb', 'file3_spec.rb'], expect.any(Object));
    });

    it('should only run tests for committed files with -c flag', async () => {
        mockGitUtils.isGitRepo.mockResolvedValue(true);
        const localConfig: ProjectConfig = {
            name: 'test-project',
            path: '/path/to/project',
            test: { rb: 'rspec' }
        };
        mockConfigManager.readLocalConfig.mockResolvedValue(localConfig);
        mockGitUtils.getModifiedFiles.mockResolvedValue({
            committed: ['file1_spec.rb'],
            uncommitted: ['file2_spec.rb']
        });
        (dependencyExists as jest.Mock).mockResolvedValue(true);

        await testCommand(mockConfigManager, mockGitUtils, 'all', { committed: true });

        expect(spawnSpy).toHaveBeenCalledWith('rspec', ['file1_spec.rb'], expect.any(Object));
        expect(spawnSpy).not.toHaveBeenCalledWith('rspec', ['file2_spec.rb'], expect.any(Object));
    });
});
