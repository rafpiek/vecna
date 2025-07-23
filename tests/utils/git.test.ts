import { getModifiedFiles, git } from '../../src/utils/git';

jest.mock('../../src/utils/git', () => ({
    ...jest.requireActual('../../src/utils/git'),
    git: {
        diff: jest.fn(),
        status: jest.fn(),
    },
}));

const mockedGit = git as jest.Mocked<typeof git>;

describe('git utils', () => {
    beforeEach(() => {
        mockedGit.diff.mockResolvedValue('file1.js\nfile2.ts');
        mockedGit.status.mockResolvedValue({
            files: [
                { path: 'file3.js', index: 'M', working_dir: ' ' },
                { path: 'file4.rb', index: 'A', working_dir: ' ' },
            ]
        } as any);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should return committed and uncommitted files', async () => {
        const { committed, uncommitted } = await getModifiedFiles('main');

        expect(mockedGit.diff).toHaveBeenCalledWith(['--name-only', 'main...HEAD']);
        expect(committed).toEqual(['file1.js', 'file2.ts']);

        expect(mockedGit.status).toHaveBeenCalled();
        expect(uncommitted).toEqual(['file3.js', 'file4.rb']);
    });
});
