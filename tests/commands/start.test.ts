import start from '../../src/commands/start';
import { gitUtils } from '../../src/utils/git';
import { worktreeManager } from '../../src/utils/worktreeManager';
import { Listr } from 'listr2';

jest.mock('listr2', () => {
    return {
        Listr: jest.fn().mockImplementation((tasks) => {
            return {
                run: async () => {
                    const ctx = {};

                    for (const task of tasks) {
                        if (task.title === 'Enter branch name') {
                            await task.task(ctx, { prompt: () => Promise.resolve('feature/new-branch') });
                        } else if (task.title === 'Choose source branch') {
                            await task.task(ctx, { prompt: () => Promise.resolve('main') });
                        } else if (!task.skip || !(typeof task.skip === 'function' ? await task.skip() : task.skip)) {
                            await task.task(ctx);
                        }
                    }

                    return {
                        branchName: 'feature/new-branch',
                        worktreePath: '/Users/test/dev/trees/feature-new-branch',
                        sourceBranch: 'main',
                        worktreeCreated: true
                    };
                }
            };
        })
    };
});
jest.mock('clipboardy', () => ({
    __esModule: true,
    default: {
        read: jest.fn().mockResolvedValue(''),
        write: jest.fn(),
    },
}));
jest.mock('../../src/utils/git');
jest.mock('../../src/utils/worktreeManager');
jest.mock('../../src/utils/configManager');
jest.mock('fs-extra');
jest.mock('chalk', () => ({
    green: (str: string) => str,
    cyan: (str: string) => str,
    yellow: (str: string) => str,
    red: (str: string) => str,
}));

import clipboard from 'clipboardy';
import { configManager } from '../../src/utils/configManager';
import fs from 'fs-extra';

const mockedGitUtils = gitUtils as jest.Mock;
const mockedWorktreeManager = worktreeManager as jest.Mock;
const mockedClipboard = clipboard as jest.Mocked<typeof clipboard>;
const mockedConfigManager = configManager as jest.Mock;
const mockedFs = fs as jest.Mocked<typeof fs>;

describe('start command', () => {
    let git: any;
    let manager: any;
    let consoleLogSpy: jest.SpyInstance;
    let consoleErrorSpy: jest.SpyInstance;

    beforeEach(() => {
        git = {
            checkout: jest.fn(),
            pull: jest.fn(),
            getCurrentBranch: jest.fn().mockResolvedValue('main'),
            branchExists: jest.fn().mockResolvedValue(false),
            createBranch: jest.fn(),
            hasRemotes: jest.fn().mockResolvedValue(true),
            hasTrackingBranch: jest.fn().mockResolvedValue(true),
            isBranchInUseByWorktree: jest.fn().mockResolvedValue({ inUse: false }),
        };
        manager = {
            create: jest.fn(),
            copyConfigFiles: jest.fn(),
            runPostCreateScripts: jest.fn(),
        };
        const config = {
            readGlobalConfig: jest.fn().mockResolvedValue({}),
        };
        mockedGitUtils.mockReturnValue(git);
        mockedWorktreeManager.mockReturnValue(manager);
        mockedConfigManager.mockReturnValue(config);
        (mockedFs.pathExists as jest.Mock).mockResolvedValue(true);
        (mockedFs.readJson as jest.Mock).mockResolvedValue({ name: 'test-project' });
        mockedClipboard.read.mockResolvedValue('feature/new-branch');
        consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
        jest.clearAllMocks();
        consoleLogSpy.mockRestore();
        consoleErrorSpy.mockRestore();
    });

    it('should run the correct sequence of tasks', async () => {
        await start({} as any);

        expect(git.getCurrentBranch).toHaveBeenCalled();
        expect(git.pull).toHaveBeenCalled();
        expect(git.isBranchInUseByWorktree).toHaveBeenCalledWith('feature/new-branch');
        expect(manager.create).toHaveBeenCalledWith('feature/new-branch', 'main');
        expect(manager.copyConfigFiles).toHaveBeenCalled();
        expect(manager.runPostCreateScripts).toHaveBeenCalled();
    });

    it('should checkout to main if not already on main', async () => {
        git.getCurrentBranch.mockResolvedValue('feature/other-branch');

        await start({} as any);

        expect(git.checkout).toHaveBeenCalledWith('main');
    });

    it('should use branch from options if provided', async () => {
        await start({} as any, { branch: 'my-branch' });

        expect(git.isBranchInUseByWorktree).toHaveBeenCalledWith('my-branch');
        expect(manager.create).toHaveBeenCalledWith('my-branch', 'main');
    });

    it('should skip dependency installation when --no-install is used', async () => {
        await start({} as any, { install: false });

        expect(manager.runPostCreateScripts).not.toHaveBeenCalled();
    });

    it('should use custom from branch if specified', async () => {
        await start({} as any, { from: 'develop' });

        expect(git.checkout).toHaveBeenCalledWith('develop');
        expect(manager.create).toHaveBeenCalledWith('feature/new-branch', 'develop');
    });

    it('should prompt for source branch when not on main and no from option specified', async () => {
        git.getCurrentBranch.mockResolvedValue('feature/current-branch');
        
        await start({} as any);

        expect(git.getCurrentBranch).toHaveBeenCalled();
        expect(manager.create).toHaveBeenCalledWith('feature/new-branch', 'main');
    });

    it('should use main as source branch when already on main', async () => {
        git.getCurrentBranch.mockResolvedValue('main');
        
        await start({} as any);

        expect(manager.create).toHaveBeenCalledWith('feature/new-branch', 'main');
    });
});
