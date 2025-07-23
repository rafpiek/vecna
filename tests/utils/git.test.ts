import { getModifiedFiles } from '../../src/utils/git';
import simpleGit from 'simple-git';

jest.mock('simple-git');

const mockedSimpleGit = simpleGit as jest.Mocked<typeof simpleGit>;

describe('git utils', () => {
    const mockDiff = jest.fn();
    const mockStatus = jest.fn();

    beforeEach(() => {
        mockDiff.mockResolvedValue('file1.js\nfile2.ts');
        mockStatus.mockResolvedValue({
            files: [
                { path: 'file3.js', index: 'M', working_dir: ' ' },
                { path: 'file4.rb', index: 'A', working_dir: ' ' },
            ]
        });

        mockedSimpleGit.mockReturnValue({
            diff: mockDiff,
            status: mockStatus,
        } as any);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should return committed and uncommitted files', async () => {
        const { committed, uncommitted } = await getModifiedFiles('main');

        expect(mockDiff).toHaveBeenCalledWith(['--name-only', 'main...HEAD']);
        expect(committed).toEqual(['file1.js', 'file2.ts']);

        expect(mockStatus).toHaveBeenCalled();
        expect(uncommitted).toEqual(['file3.js', 'file4.rb']);
    });
});
