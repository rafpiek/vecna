import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { configManager, ProjectConfig } from '../../src/utils/configManager';
import { gitUtils } from '../../src/utils/git';
import testCommand from '../../src/commands/test';
import { spawn } from 'child_process';

jest.mock('child_process');

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

    it('should run tests for all modified ruby test files', async () => {
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

        process.argv = ['node', 'vecna', 'test', 'all'];
        await testCommand(mockConfigManager, mockGitUtils);

        expect(spawnSpy).toHaveBeenCalledWith('rspec', ['file1_spec.rb', 'file3_spec.rb'], expect.any(Object));
    });

    it('should only run tests for committed files with -c flag', async () => {
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

        process.argv = ['node', 'vecna', 'test', 'all', '-c'];
        await testCommand(mockConfigManager, mockGitUtils);

        expect(spawnSpy).toHaveBeenCalledWith('rspec', ['file1_spec.rb'], expect.any(Object));
        expect(spawnSpy).not.toHaveBeenCalledWith('rspec', ['file2_spec.rb'], expect.any(Object));
    });
});
