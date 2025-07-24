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
        const promptSpy = jest.spyOn(inquirer, 'prompt').mockImplementation(jest.fn().mockResolvedValue({ projectName: 'test-project' }));
        const pathExistsSpy = jest.spyOn(fs, 'pathExists').mockImplementation(jest.fn().mockResolvedValue(false));

        await setupCommand(mockConfigManager);

        expect(promptSpy).toHaveBeenCalled();
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
        const promptSpy = jest.spyOn(inquirer, 'prompt').mockImplementation(jest.fn().mockResolvedValue({ projectName: 'test-project' }));
        const pathExistsSpy = jest.spyOn(fs, 'pathExists').mockImplementation(jest.fn().mockImplementation(path => {
            if (typeof path === 'string') {
                return Promise.resolve(path.endsWith('Gemfile') || path.endsWith('package.json'));
            }
            return Promise.resolve(false);
        }));
        const readFileSpy = jest.spyOn(fs, 'readFile').mockImplementation(jest.fn().mockResolvedValue('gem "rspec"'));
        const readJsonSpy = jest.spyOn(fs, 'readJson').mockImplementation(jest.fn().mockResolvedValue({ scripts: { lint: 'eslint' } }));

        await setupCommand(mockConfigManager);

        expect(mockConfigManager.createLocalConfig).toHaveBeenCalledWith({
            name: 'test-project',
            linter: { js: 'eslint' },
            test: { rb: 'rspec' },
        });
    });
});
