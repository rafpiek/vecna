import inquirer from 'inquirer';
import fs from 'fs-extra';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { configManager } from '../../src/utils/configManager';
import setupCommand from '../../src/commands/setup';

jest.mock('inquirer');
jest.mock('fs-extra');

describe('setup command', () => {
    let mockConfigManager: DeepMockProxy<ReturnType<typeof configManager>>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockConfigManager = mockDeep<ReturnType<typeof configManager>>();
    });

    it('should prompt for project name and create config files', async () => {
        (inquirer.prompt as jest.Mock).mockResolvedValue({ projectName: 'test-project' });
        (fs.pathExists as jest.Mock).mockResolvedValue(false);

        await setupCommand(mockConfigManager);

        expect(inquirer.prompt).toHaveBeenCalled();
        expect(mockConfigManager.createLocalConfig).toHaveBeenCalledWith({
            name: 'test-project',
            linter: {},
            test: {},
        });
        expect(mockConfigManager.updateGlobalConfig).toHaveBeenCalledWith(expect.objectContaining({
            name: 'test-project',
        }));
    });

    it('should detect rspec and eslint', async () => {
        (inquirer.prompt as jest.Mock).mockResolvedValue({ projectName: 'test-project' });

        (fs.pathExists as jest.Mock).mockImplementation(path => {
            if (typeof path === 'string') {
                return Promise.resolve(path.endsWith('Gemfile') || path.endsWith('package.json'));
            }
            return Promise.resolve(false);
        });

        (fs.readFile as jest.Mock).mockResolvedValue('gem "rspec"');
        (fs.readJson as jest.Mock).mockResolvedValue({ scripts: { lint: 'eslint' } });

        await setupCommand(mockConfigManager);

        expect(mockConfigManager.createLocalConfig).toHaveBeenCalledWith({
            name: 'test-project',
            linter: { js: 'eslint' },
            test: { rb: 'rspec' },
        });
    });
});
