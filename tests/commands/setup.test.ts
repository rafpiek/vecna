import inquirer from 'inquirer';
import fs from 'fs-extra';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { configManager } from '../../src/utils/configManager';
import setupCommand from '../../src/commands/setup';

jest.mock('inquirer', () => ({
    prompt: jest.fn(),
}));
jest.mock('fs-extra', () => ({
    pathExists: jest.fn(),
    readFile: jest.fn(),
    readJson: jest.fn(),
}));

const mockedInquirer = inquirer as jest.Mocked<typeof inquirer>;
const mockedFs = fs as jest.Mocked<typeof fs>;

describe('setup command', () => {
    let mockConfigManager: DeepMockProxy<ReturnType<typeof configManager>>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockConfigManager = mockDeep<ReturnType<typeof configManager>>();
    });

    it('should prompt for project name and create config files', async () => {
        mockedInquirer.prompt.mockResolvedValue({ projectName: 'test-project' });
        mockedFs.pathExists.mockResolvedValue(false);

        await setupCommand(mockConfigManager);

        expect(mockedInquirer.prompt).toHaveBeenCalled();
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
        mockedInquirer.prompt.mockResolvedValue({ projectName: 'test-project' });

        mockedFs.pathExists.mockImplementation(path => {
            if (typeof path === 'string') {
                return Promise.resolve(path.endsWith('Gemfile') || path.endsWith('package.json'));
            }
            return Promise.resolve(false);
        });

        mockedFs.readFile.mockResolvedValue('gem "rspec"');
        mockedFs.readJson.mockResolvedValue({ scripts: { lint: 'eslint' } });

        await setupCommand(mockConfigManager);

        expect(mockConfigManager.createLocalConfig).toHaveBeenCalledWith({
            name: 'test-project',
            linter: { js: 'eslint' },
            test: { rb: 'rspec' },
        });
    });
});
