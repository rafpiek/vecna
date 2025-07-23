import { getModifiedFiles } from '../../src/utils/git';
import simpleGit from 'simple-git';

jest.mock('simple-git', () => ({
    __esModule: true,
    default: jest.fn(),
}));

const mockedSimpleGit = simpleGit as jest.Mock;

describe('git utils', () => {
    const mockDiff = jest.fn();
    const mockStatus = jest.fn();

    beforeEach(() => {
        mockedSimpleGit.mockReturnValue({
            diff: mockDiff,
            status: mockStatus,
        });

        mockDiff.mockResolvedValue('file1.js\nfile2.ts');
        mockStatus.mockResolvedValue({
            files: [
                { path: 'file3.js', index: 'M', working_dir: ' ' },
                { path: 'file4.rb', index: 'A', working_dir: ' ' },
            ]
        });
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
