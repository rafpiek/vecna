import removeCommand from '../../../src/commands/worktree/remove';
import { gitUtils } from '../../../src/utils/git';
import { worktreeManager } from '../../../src/utils/worktreeManager';
import { selectWorktreeWithFuzzySearch } from '../../../src/utils/worktreePicker';
import inquirer from 'inquirer';
import fs from 'fs-extra';

jest.mock('../../../src/utils/git');
jest.mock('../../../src/utils/worktreeManager');
jest.mock('../../../src/utils/worktreePicker');
jest.mock('inquirer');
jest.mock('fs-extra');
jest.mock('chalk', () => ({
    green: (str: string) => str,
    cyan: (str: string) => str,
    yellow: (str: string) => str,
    red: (str: string) => str,
    gray: (str: string) => str,
}));

const mockedGitUtils = gitUtils as jest.Mock;
const mockedWorktreeManager = worktreeManager as jest.Mock;
const mockedSelectWorktreeWithFuzzySearch = selectWorktreeWithFuzzySearch as jest.Mock;
const mockedInquirer = inquirer as jest.Mocked<typeof inquirer>;
const mockedFs = fs as jest.Mocked<typeof fs>;

describe('worktree remove command', () => {
    let git: any;
    let manager: any;
    let consoleLogSpy: jest.SpyInstance;
    let consoleErrorSpy: jest.SpyInstance;

    beforeEach(() => {
        git = {
            removeWorktree: jest.fn(),
            deleteBranch: jest.fn(),
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
        mockedSelectWorktreeWithFuzzySearch.mockResolvedValue(mockWorktrees[1]);
        mockedInquirer.prompt.mockResolvedValue({ finalConfirm: true });

        await removeCommand({} as any);

        expect(mockedSelectWorktreeWithFuzzySearch).toHaveBeenCalledWith(
            [mockWorktrees[1]], // Only non-current worktrees are available for selection
            'Choose worktree to remove:'
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
        mockedSelectWorktreeWithFuzzySearch.mockResolvedValue(mockWorktrees[0]);
        mockedInquirer.prompt
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
        mockedSelectWorktreeWithFuzzySearch.mockResolvedValue(mockWorktrees[0]);
        mockedInquirer.prompt.mockResolvedValue({ finalConfirm: false });

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

    it('should list gone worktrees when --gone option is used', async () => {
        const mockWorktrees = [
            {
                name: 'existing-worktree',
                branch: 'feature/existing',
                path: '/Users/test/dev/trees/existing-worktree',
                isCurrent: false,
                isActive: true,
                lastCommit: {
                    hash: 'abc123',
                    message: 'Existing commit',
                    date: new Date('2024-01-01'),
                },
                status: {
                    hasUncommittedChanges: false,
                    ahead: 0,
                    behind: 0,
                },
            },
            {
                name: 'gone-worktree',
                branch: 'feature/gone',
                path: '/Users/test/dev/trees/gone-worktree',
                isCurrent: false,
                isActive: true,
                lastCommit: {
                    hash: 'def456',
                    message: 'Gone commit',
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
        (mockedFs.pathExists as jest.Mock)
            .mockResolvedValueOnce(true)  // existing worktree exists
            .mockResolvedValueOnce(false); // gone worktree doesn't exist

        await removeCommand({} as any, undefined, { gone: true });

        expect(mockedFs.pathExists).toHaveBeenCalledWith('/Users/test/dev/trees/existing-worktree');
        expect(mockedFs.pathExists).toHaveBeenCalledWith('/Users/test/dev/trees/gone-worktree');
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Found 1 gone worktrees'));
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('feature/gone'));
        expect(git.removeWorktree).not.toHaveBeenCalled(); // Should not remove, just list
    });

    it('should show no gone worktrees message when all exist', async () => {
        const mockWorktrees = [
            {
                name: 'existing-worktree',
                branch: 'feature/existing',
                path: '/Users/test/dev/trees/existing-worktree',
                isCurrent: false,
                isActive: true,
                lastCommit: {
                    hash: 'abc123',
                    message: 'Existing commit',
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
        (mockedFs.pathExists as jest.Mock).mockResolvedValue(true); // all worktrees exist

        await removeCommand({} as any, undefined, { gone: true });

        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('No gone worktrees found'));
        expect(git.removeWorktree).not.toHaveBeenCalled();
    });
});
