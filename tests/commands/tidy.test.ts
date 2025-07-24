import tidyCommand from '../../src/commands/tidy';
import { gitUtils } from '../../src/utils/git';
import { worktreeManager } from '../../src/utils/worktreeManager';
import { configManager } from '../../src/utils/configManager';
import inquirer from 'inquirer';

jest.mock('../../src/utils/git');
jest.mock('../../src/utils/worktreeManager');
jest.mock('../../src/utils/configManager');
jest.mock('inquirer');
jest.mock('chalk', () => {
    const mockChalk = (str: string) => str;
    return {
        __esModule: true,
        default: {
            green: mockChalk,
            cyan: Object.assign(mockChalk, { bold: mockChalk }),
            yellow: mockChalk,
            red: mockChalk,
            gray: mockChalk,
            blue: mockChalk,
            bold: mockChalk,
        },
        green: mockChalk,
        cyan: Object.assign(mockChalk, { bold: mockChalk }),
        yellow: mockChalk,
        red: mockChalk,
        gray: mockChalk,
        blue: mockChalk,
        bold: mockChalk,
    };
});

const mockedGitUtils = gitUtils as jest.Mock;
const mockedWorktreeManager = worktreeManager as jest.Mock;
const mockedConfigManager = configManager as jest.Mock;
const mockedInquirer = inquirer as jest.Mocked<typeof inquirer>;

describe('tidy command', () => {
    let git: any;
    let manager: any;
    let config: any;
    let consoleLogSpy: jest.SpyInstance;
    let consoleErrorSpy: jest.SpyInstance;
    let processExitSpy: jest.SpyInstance;
    let processChdirSpy: jest.SpyInstance;

    beforeEach(() => {
        git = {
            findGitRoot: jest.fn(),
            isMainRepository: jest.fn(),
            getCurrentBranch: jest.fn(),
            checkout: jest.fn(),
            pull: jest.fn(),
            fetch: jest.fn(),
            getLocalBranches: jest.fn(),
            doesRemoteBranchExist: jest.fn(),
            resetUncommittedChanges: jest.fn(),
            removeWorktree: jest.fn(),
            deleteBranch: jest.fn(),
        };
        
        manager = {
            listWorktrees: jest.fn(),
            cleanWorktreeState: jest.fn(),
        };
        
        config = {
            readLocalConfig: jest.fn(),
        };
        
        mockedGitUtils.mockReturnValue(git);
        mockedWorktreeManager.mockReturnValue(manager);
        mockedConfigManager.mockReturnValue(config);
        
        consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
        processExitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {
            throw new Error('process.exit');
        });
        processChdirSpy = jest.spyOn(process, 'chdir').mockImplementation();
    });

    afterEach(() => {
        jest.clearAllMocks();
        consoleLogSpy.mockRestore();
        consoleErrorSpy.mockRestore();
        processExitSpy.mockRestore();
        processChdirSpy.mockRestore();
    });

    it('should detect branches deleted from remote', async () => {
        // Setup mocks
        config.readLocalConfig.mockResolvedValue({
            path: '/test/project',
            mainBranch: 'main'
        });
        git.findGitRoot.mockResolvedValue('/test/project');
        git.isMainRepository.mockResolvedValue(true);
        git.getCurrentBranch.mockResolvedValue('main');
        git.pull.mockResolvedValue(undefined);
        git.fetch.mockResolvedValue(undefined);
        git.getLocalBranches.mockResolvedValue(['main', 'feature-deleted', 'feature-exists']);
        git.doesRemoteBranchExist.mockImplementation((branch: string) => {
            return Promise.resolve(branch !== 'feature-deleted');
        });
        manager.listWorktrees.mockResolvedValue([]);
        
        // Mock confirmation
        mockedInquirer.prompt.mockResolvedValue({ confirm: false });

        try {
            await tidyCommand({} as any, { dryRun: true });
        } catch (error) {
            // Expected due to process.exit
        }

        expect(git.doesRemoteBranchExist).toHaveBeenCalledWith('feature-deleted');
        expect(git.doesRemoteBranchExist).toHaveBeenCalledWith('feature-exists');
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Found 1 branches to delete'));
    });

    it('should find associated worktrees for deleted branches', async () => {
        // Setup mocks
        config.readLocalConfig.mockResolvedValue({
            path: '/test/project',
            mainBranch: 'main'
        });
        git.findGitRoot.mockResolvedValue('/test/project');
        git.isMainRepository.mockResolvedValue(true);
        git.getCurrentBranch.mockResolvedValue('main');
        git.pull.mockResolvedValue(undefined);
        git.fetch.mockResolvedValue(undefined);
        git.getLocalBranches.mockResolvedValue(['main', 'feature-deleted']);
        git.doesRemoteBranchExist.mockResolvedValue(false);
        manager.listWorktrees.mockResolvedValue([{
            name: 'feature-deleted',
            branch: 'feature-deleted',
            path: '/test/trees/feature-deleted',
            status: { hasUncommittedChanges: true }
        }]);
        
        await tidyCommand({} as any, { dryRun: true });

        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Found 1 worktrees to remove'));
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('• feature-deleted (feature-deleted) (has uncommitted changes - will reset)'));
    });

    it('should handle dry-run mode correctly', async () => {
        // Setup mocks for cleanup scenario
        config.readLocalConfig.mockResolvedValue({
            path: '/test/project',
            mainBranch: 'main'
        });
        git.findGitRoot.mockResolvedValue('/test/project');
        git.isMainRepository.mockResolvedValue(true);
        git.getCurrentBranch.mockResolvedValue('main');
        git.pull.mockResolvedValue(undefined);
        git.fetch.mockResolvedValue(undefined);
        git.getLocalBranches.mockResolvedValue(['main', 'feature-deleted']);
        git.doesRemoteBranchExist.mockResolvedValue(false);
        manager.listWorktrees.mockResolvedValue([]);

        await tidyCommand({} as any, { dryRun: true });

        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('This is a dry run'));
        expect(git.resetUncommittedChanges).not.toHaveBeenCalled();
        expect(git.removeWorktree).not.toHaveBeenCalled();
        expect(git.deleteBranch).not.toHaveBeenCalled();
    });

    it('should protect main branch from deletion', async () => {
        // Setup mocks
        config.readLocalConfig.mockResolvedValue({
            path: '/test/project',
            mainBranch: 'main'
        });
        git.findGitRoot.mockResolvedValue('/test/project');
        git.isMainRepository.mockResolvedValue(true);
        git.getCurrentBranch.mockResolvedValue('main');
        git.pull.mockResolvedValue(undefined);
        git.fetch.mockResolvedValue(undefined);
        git.getLocalBranches.mockResolvedValue(['main', 'feature-test']);
        git.doesRemoteBranchExist.mockResolvedValue(false); // Pretend even main doesn't exist on remote
        manager.listWorktrees.mockResolvedValue([]);

        await tidyCommand({} as any, { dryRun: true });

        // Should only check feature-test, not main
        expect(git.doesRemoteBranchExist).toHaveBeenCalledWith('feature-test');
        expect(git.doesRemoteBranchExist).not.toHaveBeenCalledWith('main');
    });

    it('should work with custom keep patterns', async () => {
        // Setup mocks
        config.readLocalConfig.mockResolvedValue({
            path: '/test/project',
            mainBranch: 'main'
        });
        git.findGitRoot.mockResolvedValue('/test/project');
        git.isMainRepository.mockResolvedValue(true);
        git.getCurrentBranch.mockResolvedValue('main');
        git.pull.mockResolvedValue(undefined);
        git.fetch.mockResolvedValue(undefined);
        git.getLocalBranches.mockResolvedValue(['main', 'release/v1.0', 'feature-test']);
        git.doesRemoteBranchExist.mockResolvedValue(false);
        manager.listWorktrees.mockResolvedValue([]);

        await tidyCommand({} as any, { 
            dryRun: true, 
            keepPattern: 'release/*' 
        });

        // Should only check feature-test, not release/v1.0
        expect(git.doesRemoteBranchExist).toHaveBeenCalledWith('feature-test');
        expect(git.doesRemoteBranchExist).not.toHaveBeenCalledWith('release/v1.0');
    });

    it('should show clean message when nothing to clean', async () => {
        // Setup mocks for clean repository
        config.readLocalConfig.mockResolvedValue({
            path: '/test/project',
            mainBranch: 'main'
        });
        git.findGitRoot.mockResolvedValue('/test/project');
        git.isMainRepository.mockResolvedValue(true);
        git.getCurrentBranch.mockResolvedValue('main');
        git.pull.mockResolvedValue(undefined);
        git.fetch.mockResolvedValue(undefined);
        git.getLocalBranches.mockResolvedValue(['main']);
        manager.listWorktrees.mockResolvedValue([]);

        try {
            await tidyCommand({} as any);
        } catch (error) {
            // Expected due to process.exit
        }

        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Repository is already clean!'));
        expect(processExitSpy).toHaveBeenCalledWith(0);
    });
});