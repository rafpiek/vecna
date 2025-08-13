import switchCommand from '../../src/commands/switch';
import { gitUtils } from '../../src/utils/git';
import { worktreeManager } from '../../src/utils/worktreeManager';
import inquirer, { Answers, DistinctQuestion, Question } from 'inquirer';
import { spawn } from 'child_process';

// Mock modules
jest.mock('child_process', () => ({
    spawn: jest.fn(),
}));
jest.mock('../../src/utils/git');
jest.mock('../../src/utils/worktreeManager');
jest.mock('inquirer');
jest.mock('clipboardy', () => ({
    __esModule: true,
    default: { write: jest.fn().mockResolvedValue(undefined) },
}));
jest.mock('chalk', () => {
    const mockColor = (str: string) => str;
    mockColor.bold = (str: string) => str;
    return {
        green: mockColor,
        cyan: mockColor,
        yellow: mockColor,
        red: mockColor,
        gray: mockColor,
        blue: mockColor,
        bold: mockColor,
    };
});

jest.mock('fs-extra', () => ({
    pathExists: jest.fn().mockResolvedValue(false),
    readJson: jest.fn()
}));

jest.mock('../../src/utils/configManager', () => ({
    configManager: jest.fn().mockReturnValue({
        readGlobalConfig: jest.fn().mockResolvedValue({ defaultProject: { name: 'test-project', path: '/test/path' } })
    })
}));

global.console.clear = jest.fn();

const mockedGitUtils = gitUtils as jest.Mock;
const mockedWorktreeManager = worktreeManager as jest.Mock;
const mockedInquirer = inquirer as jest.Mocked<typeof inquirer>;
const mockedSpawn = spawn as jest.Mock;

describe('switch command', () => {
    let git: any;
    let manager: any;
    let consoleLogSpy: jest.SpyInstance;
    let consoleErrorSpy: jest.SpyInstance;
    let exitSpy: jest.SpyInstance;

    let mockGitInstance: any;

    beforeEach(() => {
        jest.useFakeTimers();

        git = { listWorktrees: jest.fn() };
        manager = { listWorktrees: jest.fn() };
        
        // Mock gitInstance with a cwd method that returns an object that can be passed to gitUtils
        mockGitInstance = {
            cwd: jest.fn().mockReturnValue({}),
        };
        
        mockedGitUtils.mockReturnValue(git);
        mockedWorktreeManager.mockReturnValue(manager);

        consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
        exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => {}) as jest.MockedFunction<typeof process.exit>);

        mockedSpawn.mockImplementation((command: string, args: string[]) => {
            const p = new (jest.requireActual('events').EventEmitter)();
            (p as any).unref = jest.fn();
            const isCursor = command === 'which' && args[0] === 'cursor';
            process.nextTick(() => p.emit('close', isCursor ? 0 : 1));
            return p;
        });

        // Mock inquirer.prompt to return a resolved value with ui property
        const mockPromptResult = async (questions: any) => {
            const answers: any = {};
            if (Array.isArray(questions)) {
                for (const q of questions) {
                    // Find first valid choice (not a separator)
                    const validChoice = q.choices?.find((choice: any) => choice && choice.value !== undefined);
                    answers[q.name] = q.default || (validChoice && validChoice.value);
                }
            } else {
                // Find first valid choice (not a separator)
                const validChoice = questions.choices?.find((choice: any) => choice && choice.value !== undefined);
                answers[questions.name] = questions.default || (validChoice && validChoice.value);
            }
            return answers;
        };

        const mockUi = {
            close: jest.fn(),
            run: jest.fn(),
            rl: { on: jest.fn() },
        };

        Object.defineProperty(mockPromptResult, 'ui', { value: mockUi });
        mockedInquirer.prompt.mockImplementation(mockPromptResult as any);
    });

    afterEach(() => {
        jest.useRealTimers();
        jest.clearAllMocks();
        consoleLogSpy.mockRestore();
        consoleErrorSpy.mockRestore();
        exitSpy.mockRestore();
    });

    it('should show message when no worktrees exist', async () => {
        git.listWorktrees.mockResolvedValue([]);
        const promise = switchCommand(mockGitInstance, {});
        jest.runAllTimers();
        await promise;
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('No worktrees found for project'));
    });


    it('should handle errors gracefully', async () => {
        const error = new Error('Test error');
        git.listWorktrees.mockRejectedValue(error);
        const promise = switchCommand(mockGitInstance, {});
        jest.runAllTimers();
        await promise;
        expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to switch worktree:'), error.message);
        expect(exitSpy).toHaveBeenCalledWith(1);
    });
});