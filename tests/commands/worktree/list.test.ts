import { listWorktrees } from '../../../src/commands/worktree/list';
import { gitUtils } from '../../../src/utils/git';
import { worktreeManager } from '../../../src/utils/worktreeManager';
import Table from 'cli-table3';
import chalk from 'chalk';

jest.mock('../../../src/utils/git');
jest.mock('../../../src/utils/worktreeManager');
jest.mock('cli-table3');
jest.mock('chalk', () => ({
    green: (str: string) => str,
    cyan: (str: string) => str,
    yellow: (str: string) => str,
    red: (str: string) => str,
    gray: (str: string) => str,
    blue: (str: string) => str,
}));

const mockedGitUtils = gitUtils as jest.Mock;
const mockedWorktreeManager = worktreeManager as jest.Mock;

describe('worktree list command', () => {
    let consoleLogSpy: jest.SpyInstance;
    let consoleErrorSpy: jest.SpyInstance;
    let mockListWorktrees: jest.Mock;
    let mockTablePush: jest.Mock;
    let git: any;
    let manager: any;

    beforeEach(() => {
        consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

        git = {};
        manager = {
            listWorktrees: jest.fn(),
        };

        mockedGitUtils.mockReturnValue(git);
        mockedWorktreeManager.mockReturnValue(manager);

        mockTablePush = jest.fn();
        (Table as jest.Mock).mockImplementation(() => ({
            push: mockTablePush,
            toString: () => 'table output',
        }));
    });

    afterEach(() => {
        jest.clearAllMocks();
        consoleLogSpy.mockRestore();
        consoleErrorSpy.mockRestore();
    });

    it('should list all worktrees in a table', async () => {
        const worktrees = [
            {
                name: 'feature-branch',
                branch: 'feature-branch',
                path: '/path/to/feature-branch',
                isCurrent: true,
                isActive: true,
                lastCommit: {
                    hash: 'abc123456',
                    message: 'Add new feature',
                    date: new Date('2024-01-01'),
                },
                status: {
                    hasUncommittedChanges: true,
                    ahead: 1,
                    behind: 2,
                },
            },
            {
                name: 'main',
                branch: 'main',
                path: '/path/to/main',
                isCurrent: false,
                isActive: true,
                lastCommit: {
                    hash: 'def789012',
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
        manager.listWorktrees.mockResolvedValue(worktrees);

        await listWorktrees({} as any);

        expect(manager.listWorktrees).toHaveBeenCalled();
        expect(Table).toHaveBeenCalledWith({
            head: ['Branch', 'Path', 'Status', 'Last Commit', 'Changes'],
            colWidths: [20, 40, 15, 30, 10]
        });

        expect(mockTablePush).toHaveBeenCalledTimes(2);
        expect(consoleLogSpy).toHaveBeenCalledWith('table output');
    });

    it('should show message when no worktrees exist', async () => {
        manager.listWorktrees.mockResolvedValue([]);

        await listWorktrees({} as any);

        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('No worktrees found'));
    });

    it('should output JSON when --json option is used', async () => {
        const worktrees = [
            {
                name: 'main',
                branch: 'main',
                path: '/path/to/main',
                isCurrent: true,
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
        manager.listWorktrees.mockResolvedValue(worktrees);

        await listWorktrees({} as any, { json: true });

        expect(consoleLogSpy).toHaveBeenCalledWith(JSON.stringify(worktrees, null, 2));
        expect(Table).not.toHaveBeenCalled();
    });

    it('should filter active worktrees when --active option is used', async () => {
        const worktrees = [
            {
                name: 'active',
                branch: 'active',
                path: '/path/to/active',
                isCurrent: true,
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
            {
                name: 'inactive',
                branch: 'inactive',
                path: '/path/to/inactive',
                isCurrent: false,
                isActive: false,
                lastCommit: {
                    hash: 'def456',
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
        manager.listWorktrees.mockResolvedValue(worktrees);

        await listWorktrees({} as any, { active: true });

        expect(mockTablePush).toHaveBeenCalledTimes(1);
    });

    it('should handle errors gracefully', async () => {
        manager.listWorktrees.mockRejectedValue(new Error('Test error'));
        const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {
            throw new Error('process.exit');
        });

        try {
            await listWorktrees({} as any);
        } catch (error) {
            // Expected to throw due to process.exit
        }

        expect(consoleErrorSpy).toHaveBeenCalledWith('✗ Failed to list worktrees:', 'Test error');
        expect(exitSpy).toHaveBeenCalledWith(1);

        exitSpy.mockRestore();
    });
});
