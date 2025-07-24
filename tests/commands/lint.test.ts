import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { configManager, ProjectConfig } from '../../src/utils/configManager';
import { gitUtils } from '../../src/utils/git';
import lintCommand from '../../src/commands/lint';
import { spawn } from 'child_process';

jest.mock('child_process');

describe('lint command', () => {
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
        await lintCommand(mockConfigManager, mockGitUtils, argv);
        expect(console.error).toHaveBeenCalledWith('This command must be run inside a git repository.');
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

        const argv = ['/usr/bin/node', '/path/to/vecna', 'all'];
        await lintCommand(mockConfigManager, mockGitUtils, argv);

        expect(spawnSpy).toHaveBeenCalledWith('eslint', ['file1.js', 'file3.ts'], expect.any(Object));
        expect(spawnSpy).toHaveBeenCalledWith('rubocop', ['file2.rb'], expect.any(Object));
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

        const argv = ['/usr/bin/node', '/path/to/vecna', 'all', '-e'];
        await lintCommand(mockConfigManager, mockGitUtils, argv);

        expect(spawnSpy).toHaveBeenCalledWith('eslint', ['file2.ts'], expect.any(Object));
        expect(spawnSpy).not.toHaveBeenCalledWith('eslint', ['file1.js'], expect.any(Object));
    });
});
