import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { configManager, GlobalConfig } from '../../src/utils/configManager';
import listCommand from '../../src/commands/list';
import chalk from 'chalk';

describe('list command', () => {
    let mockConfigManager: DeepMockProxy<ReturnType<typeof configManager>>;
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
        jest.clearAllMocks();
        mockConfigManager = mockDeep<ReturnType<typeof configManager>>();
        consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
        consoleSpy.mockRestore();
    });

    it('should display a message if no projects are configured', async () => {
        const emptyConfig: GlobalConfig = { projects: [] };
        mockConfigManager.readGlobalConfig.mockResolvedValue(emptyConfig);

        await listCommand(mockConfigManager);

        expect(console.log).toHaveBeenCalledWith(chalk.yellow('No projects configured yet. Run "vecna setup" to add one.'));
    });

    it('should list configured projects', async () => {
        const testConfig: GlobalConfig = {
            projects: [
                { name: 'project1', path: '/path/to/project1' },
                { name: 'project2', path: '/path/to/project2' },
            ]
        };
        mockConfigManager.readGlobalConfig.mockResolvedValue(testConfig);

        await listCommand(mockConfigManager);

        expect(console.log).toHaveBeenCalledWith(chalk.bold.blue('Configured Projects:'));
        expect(console.log).toHaveBeenCalledWith(`- ${chalk.green('project1')}: /path/to/project1`);
        expect(console.log).toHaveBeenCalledWith(`- ${chalk.green('project2')}: /path/to/project2`);
    });
});
