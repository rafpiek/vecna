import { worktreeListCommand } from '../../../src/commands/worktree/list';
import { worktreeManager } from '../../../src/utils/worktreeManager';
import Table from 'cli-table3';
import chalk from 'chalk';

jest.mock('../../../src/utils/worktreeManager');
jest.mock('cli-table3');

describe('worktree list command', () => {
    let consoleLogSpy: jest.SpyInstance;
    let mockListWorktrees: jest.Mock;
    let mockTablePush: jest.Mock;

    beforeEach(() => {
        consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
        mockListWorktrees = jest.fn();
        (worktreeManager as jest.Mock).mockReturnValue({
            listWorktrees: mockListWorktrees,
        });
        mockTablePush = jest.fn();
        (Table as jest.Mock).mockImplementation(() => ({
            push: mockTablePush,
            toString: () => 'table output',
        }));
    });

    afterEach(() => {
        jest.clearAllMocks();
        consoleLogSpy.mockRestore();
    });

    it('should list all worktrees in a table', async () => {
        const worktrees = [
            {
                name: 'feature-branch',
                branch: 'feature-branch',
                path: '/path/to/feature-branch',
                isCurrent: true,
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
                status: {
                    hasUncommittedChanges: false,
                    ahead: 0,
                    behind: 0,
                },
            },
        ];
        mockListWorktrees.mockResolvedValue(worktrees);

        await worktreeListCommand.parseAsync([], { from: 'user' });

        expect(mockListWorktrees).toHaveBeenCalled();
        expect(Table).toHaveBeenCalledWith({
            head: [
                chalk.cyan('Name'),
                chalk.cyan('Branch'),
                chalk.cyan('Path'),
                chalk.cyan('Status'),
            ],
            colWidths: [30, 30, 70, 20],
        });

        expect(mockTablePush).toHaveBeenCalledTimes(2);
        expect(mockTablePush).toHaveBeenCalledWith([
            'feature-branch',
            'feature-branch',
            '/path/to/feature-branch',
            `${chalk.green('Current')} ${chalk.yellow('Modified')} ${chalk.blue('Ahead 1')} ${chalk.red('Behind 2')}`,
        ]);
        expect(mockTablePush).toHaveBeenCalledWith([
            'main',
            'main',
            '/path/to/main',
            '',
        ]);

        expect(consoleLogSpy).toHaveBeenCalledWith('table output');
    });
});
