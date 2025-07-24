import removeCommand from '../../../src/commands/worktree/remove';
import { gitUtils } from '../../../src/utils/git';
import { worktreeManager } from '../../../src/utils/worktreeManager';
import inquirer from 'inquirer';

jest.mock('../../../src/utils/git');
jest.mock('../../../src/utils/worktreeManager');
jest.mock('inquirer');
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

describe('worktree remove command', () => {
    let git: any;
    let manager: any;
    let consoleLogSpy: jest.SpyInstance;
    let consoleErrorSpy: jest.SpyInstance;

    beforeEach(() => {
        git = {
            removeWorktree: jest.fn(),
        };
        manager = {
            listWorktrees: jest.fn(),
            cleanWorktreeState: jest.fn(),
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

        await removeCommand({} as any);

        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('No worktrees found'));
    });

    it('should remove specific worktree by name', async () => {
        const mockWorktrees = [
            {
                name: 'feature-test',
                branch: 'feature/test',
                path: '/Users/test/dev/trees/feature-test',
                isCurrent: false,
                isActive: true,
                lastCommit: {
                    hash: 'abc123',
                    message: 'Test commit',
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
        mockedInquirer.prompt.mockResolvedValue({ finalConfirm: true });

        await removeCommand({} as any, 'feature-test');

        expect(git.removeWorktree).toHaveBeenCalledWith('/Users/test/dev/trees/feature-test', undefined);
        expect(manager.cleanWorktreeState).toHaveBeenCalledWith('feature-test');
    });

    it('should handle interactive selection', async () => {
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
                    message: 'Test commit',
                    date: new Date('2024-01-02'),
                },
                status: {
                    hasUncommittedChanges: false,
                    ahead: 0,
                    behind: 0,
                },
            },
        ];

        manager.listWorktrees.mockResolvedValue(mockWorktrees);
        mockedInquirer.prompt
            .mockResolvedValueOnce({ selectedWorktrees: [mockWorktrees[1]] })
            .mockResolvedValueOnce({ finalConfirm: true });

        await removeCommand({} as any);

        expect(mockedInquirer.prompt).toHaveBeenCalledWith(
            expect.arrayContaining([
                expect.objectContaining({
                    type: 'checkbox',
                    name: 'selectedWorktrees',
                })
            ])
        );
        expect(git.removeWorktree).toHaveBeenCalledWith('/Users/test/dev/trees/feature-test', undefined);
    });

    it('should handle uncommitted changes warning', async () => {
        const mockWorktrees = [
            {
                name: 'feature-test',
                branch: 'feature/test',
                path: '/Users/test/dev/trees/feature-test',
                isCurrent: false,
                isActive: true,
                lastCommit: {
                    hash: 'abc123',
                    message: 'Test commit',
                    date: new Date('2024-01-01'),
                },
                status: {
                    hasUncommittedChanges: true,
                    ahead: 1,
                    behind: 0,
                },
            },
        ];

        manager.listWorktrees.mockResolvedValue(mockWorktrees);
        mockedInquirer.prompt
            .mockResolvedValueOnce({ selectedWorktrees: [mockWorktrees[0]] })
            .mockResolvedValueOnce({ confirmWithChanges: true })
            .mockResolvedValueOnce({ finalConfirm: true });

        await removeCommand({} as any);

        expect(mockedInquirer.prompt).toHaveBeenCalledWith(
            expect.arrayContaining([
                expect.objectContaining({
                    name: 'confirmWithChanges',
                    message: expect.stringContaining('changes will be lost'),
                })
            ])
        );
    });

    it('should skip removal if user cancels', async () => {
        const mockWorktrees = [
            {
                name: 'feature-test',
                branch: 'feature/test',
                path: '/Users/test/dev/trees/feature-test',
                isCurrent: false,
                isActive: true,
                lastCommit: {
                    hash: 'abc123',
                    message: 'Test commit',
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
        mockedInquirer.prompt
            .mockResolvedValueOnce({ selectedWorktrees: [mockWorktrees[0]] })
            .mockResolvedValueOnce({ finalConfirm: false });

        await removeCommand({} as any);

        expect(git.removeWorktree).not.toHaveBeenCalled();
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Cancelled removal'));
    });

    it('should force remove when --force option is used', async () => {
        const mockWorktrees = [
            {
                name: 'feature-test',
                branch: 'feature/test',
                path: '/Users/test/dev/trees/feature-test',
                isCurrent: false,
                isActive: true,
                lastCommit: {
                    hash: 'abc123',
                    message: 'Test commit',
                    date: new Date('2024-01-01'),
                },
                status: {
                    hasUncommittedChanges: true,
                    ahead: 0,
                    behind: 0,
                },
            },
        ];

        manager.listWorktrees.mockResolvedValue(mockWorktrees);

        await removeCommand({} as any, 'feature-test', { force: true });

        expect(git.removeWorktree).toHaveBeenCalledWith('/Users/test/dev/trees/feature-test', true);
        expect(mockedInquirer.prompt).not.toHaveBeenCalled();
    });
});
