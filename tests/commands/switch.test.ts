import switchCommand from '../../src/commands/switch';
import { gitUtils } from '../../src/utils/git';
import { worktreeManager } from '../../src/utils/worktreeManager';
import inquirer from 'inquirer';
import clipboardy from 'clipboardy';

jest.mock('../../src/utils/git');
jest.mock('../../src/utils/worktreeManager');
jest.mock('inquirer');
jest.mock('clipboardy', () => ({
    __esModule: true,
    default: {
        read: jest.fn(),
        write: jest.fn(),
    },
}));
jest.mock('chalk', () => ({
    green: (str: string) => str,
    cyan: (str: string) => str,
    yellow: (str: string) => str,
    red: (str: string) => str,
    gray: (str: string) => str,
}));

const mockedGitUtils = gitUtils as jest.Mock;
const mockedWorktreeManager = worktreeManager as jest.Mock;
const mockedInquirer = inquirer as jest.Mocked<typeof inquirer>;
const mockedClipboardy = clipboardy as jest.Mocked<typeof clipboardy>;

describe('switch command', () => {
    let git: any;
    let manager: any;
    let consoleLogSpy: jest.SpyInstance;
    let consoleErrorSpy: jest.SpyInstance;

    beforeEach(() => {
        git = {};
        manager = {
            listWorktrees: jest.fn(),
        };
        mockedGitUtils.mockReturnValue(git);
        mockedWorktreeManager.mockReturnValue(manager);
        consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
        jest.clearAllMocks();
        consoleLogSpy.mockRestore();
        consoleErrorSpy.mockRestore();
    });

    it('should show message when no worktrees exist', async () => {
        manager.listWorktrees.mockResolvedValue([]);

        await switchCommand({} as any);

        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('No worktrees found'));
    });

    it('should display worktree list and handle selection', async () => {
        const mockWorktrees = [
            {
                name: 'main',
                branch: 'main',
                path: '/Users/test/dev/trees/main',
                isCurrent: true,
                isActive: true,
                lastCommit: {
                    hash: 'abc123',
                    message: 'Initial commit',
                    date: new Date('2024-01-01'),
                },
                status: {
                    hasUncommittedChanges: false,
                    ahead: 0,
                    behind: 0,
                },
            },
            {
                name: 'feature-test',
                branch: 'feature/test',
                path: '/Users/test/dev/trees/feature-test',
                isCurrent: false,
                isActive: true,
                lastCommit: {
                    hash: 'def456',
                    message: 'Add feature',
                    date: new Date('2024-01-02'),
                },
                status: {
                    hasUncommittedChanges: true,
                    ahead: 1,
                    behind: 2,
                },
            },
        ];

        manager.listWorktrees.mockResolvedValue(mockWorktrees);
        mockedInquirer.prompt.mockResolvedValue({ selectedWorktree: mockWorktrees[1] });

        await switchCommand({} as any);

        expect(manager.listWorktrees).toHaveBeenCalled();
        expect(mockedInquirer.prompt).toHaveBeenCalled();
        expect(mockedClipboardy.write).toHaveBeenCalledWith('cd /Users/test/dev/trees/feature-test');
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('cd /Users/test/dev/trees/feature-test'));
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('This worktree has uncommitted changes'));
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('1 commits ahead and 2 commits behind'));
    });

    it('should handle current worktree selection', async () => {
        const mockWorktrees = [
            {
                name: 'main',
                branch: 'main',
                path: '/Users/test/dev/trees/main',
                isCurrent: true,
                isActive: true,
                lastCommit: {
                    hash: 'abc123',
                    message: 'Initial commit',
                    date: new Date('2024-01-01'),
                },
                status: {
                    hasUncommittedChanges: false,
                    ahead: 0,
                    behind: 0,
                },
            },
        ];

        manager.listWorktrees.mockResolvedValue(mockWorktrees);
        mockedInquirer.prompt.mockResolvedValue({ selectedWorktree: mockWorktrees[0] });

        await switchCommand({} as any);

        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Already in this worktree'));
        expect(mockedClipboardy.write).not.toHaveBeenCalled();
    });

    it('should handle JSON mode error when no worktrees', async () => {
        manager.listWorktrees.mockResolvedValue([]);
        const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {
            throw new Error('process.exit');
        });

        try {
            await switchCommand({} as any, { json: true });
        } catch (error) {
            // Expected to throw due to process.exit
        }

        expect(consoleLogSpy).toHaveBeenCalledWith(JSON.stringify({ error: 'No worktrees found' }));
        expect(exitSpy).toHaveBeenCalledWith(1);

        exitSpy.mockRestore();
    });
});
