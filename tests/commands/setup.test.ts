import setupCommand from '../../src/commands/setup';
import { configManager } from '../../src/utils/configManager';
import { gitUtils } from '../../src/utils/git';
import inquirer from 'inquirer';

jest.mock('../../src/utils/configManager');
jest.mock('../../src/utils/git');
jest.mock('inquirer');

const mockedConfigManager = configManager as jest.Mock;
const mockedGitUtils = gitUtils as jest.Mock;
const mockedInquirer = inquirer as jest.Mocked<typeof inquirer>;

describe('setup command', () => {
    let mockConfig: any;
    let mockGit: any;

    beforeEach(() => {
        mockConfig = {
            writeLocalConfig: jest.fn(),
            updateGlobalConfig: jest.fn(),
        };
        
        mockGit = {
            findGitRoot: jest.fn().mockResolvedValue('/test/project'),
            isMainRepository: jest.fn().mockResolvedValue(true),
        };
        
        mockedConfigManager.mockReturnValue(mockConfig);
        mockedGitUtils.mockReturnValue(mockGit);
        jest.clearAllMocks();
    });

    it('should setup a project with provided answers', async () => {
        mockedInquirer.prompt.mockResolvedValue({
            projectName: 'test-project',
            mainBranch: 'main',
            jsLinter: 'eslint',
            rbLinter: 'rubocop',
            rbTestRunner: 'rspec',
        });

        await setupCommand(mockGit, mockConfig);

        expect(mockConfig.writeLocalConfig).toHaveBeenCalledWith(
            expect.objectContaining({
                name: 'test-project',
                mainBranch: 'main',
                linter: {
                    js: 'eslint',
                    rb: 'rubocop',
                },
                test: {
                    rb: 'rspec',
                },
                worktrees: expect.objectContaining({
                    baseDir: expect.stringContaining('dev/trees'),
                    defaultBranch: 'main',
                    autoInstall: true,
                }),
                worktreeState: {}
            })
        );

        expect(mockConfig.updateGlobalConfig).toHaveBeenCalledWith(
            expect.objectContaining({
                name: 'test-project',
                mainBranch: 'main',
            })
        );
    });

    it('should handle empty optional fields', async () => {
        mockedInquirer.prompt.mockResolvedValue({
            projectName: 'minimal-project',
            mainBranch: 'master',
            jsLinter: '',
            rbLinter: '',
            rbTestRunner: '',
        });

        await setupCommand(mockGit, mockConfig);

        expect(mockConfig.writeLocalConfig).toHaveBeenCalledWith(
            expect.objectContaining({
                name: 'minimal-project',
                mainBranch: 'master',
                linter: {
                    js: undefined,
                    rb: undefined,
                },
                test: {
                    rb: undefined,
                },
            })
        );
    });
});
