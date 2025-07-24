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
        const promptSpy = jest.spyOn(inquirer, 'prompt').mockResolvedValue({ projectName: 'test-project' } as any);
        const pathExistsSpy = jest.spyOn(fs, 'pathExists').mockResolvedValue(false as any);

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
        const promptSpy = jest.spyOn(inquirer, 'prompt').mockResolvedValue({ projectName: 'test-project' } as any);
        const pathExistsSpy = jest.spyOn(fs, 'pathExists').mockImplementation(path => {
            if (typeof path === 'string') {
                return Promise.resolve(path.endsWith('Gemfile') || path.endsWith('package.json'));
            }
            return Promise.resolve(false);
        });
        const readFileSpy = jest.spyOn(fs, 'readFile').mockResolvedValue('gem "rspec"' as any);
        const readJsonSpy = jest.spyOn(fs, 'readJson').mockResolvedValue({ scripts: { lint: 'eslint' } });

        await setupCommand(mockConfigManager);

        expect(mockConfigManager.createLocalConfig).toHaveBeenCalledWith({
            name: 'test-project',
            linter: { js: 'eslint' },
            test: { rb: 'rspec' },
        });
    });
});
