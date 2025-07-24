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
        spawnSpy = (spawn as jest.Mock).mockReturnValue({ on: jest.fn() });
    });

    it('should show an error if not in a git repo', async () => {
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        mockGitUtils.isGitRepo.mockResolvedValue(false);
        const argv = ['/usr/bin/node', '/path/to/vecna', 'all'];
        await testCommand(mockConfigManager, mockGitUtils, argv);
        expect(console.error).toHaveBeenCalledWith('This command must be run inside a git repository.');
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
        (dependencyExists as jest.Mock).mockResolvedValue(false);

        const argv = ['/usr/bin/node', '/path/to/vecna', 'all'];
        await testCommand(mockConfigManager, mockGitUtils, argv);

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

        const argv = ['/usr/bin/node', '/path/to/vecna', 'all'];
        await testCommand(mockConfigManager, mockGitUtils, argv);

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

        const argv = ['/usr/bin/node', '/path/to/vecna', 'test', 'all', '-c'];
        await testCommand(mockConfigManager, mockGitUtils, argv);

        expect(spawnSpy).toHaveBeenCalledWith('rspec', ['file1_spec.rb'], expect.any(Object));
        expect(spawnSpy).not.toHaveBeenCalledWith('rspec', ['file2_spec.rb'], expect.any(Object));
    });
});
