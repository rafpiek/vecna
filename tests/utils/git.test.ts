import { gitUtils } from '../../src/utils/git';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { SimpleGit } from 'simple-git';

describe('gitUtils', () => {
    let mockGit: DeepMockProxy<SimpleGit>;
    let utils: ReturnType<typeof gitUtils>;

    beforeEach(() => {
        mockGit = mockDeep<SimpleGit>();
        utils = gitUtils(mockGit);
    });

    describe('getModifiedFiles', () => {
        it('should return committed and uncommitted files', async () => {
            mockGit.diff.mockResolvedValue('file1.js\nfile2.ts');
            mockGit.status.mockResolvedValue({
                files: [
                    { path: 'file3.js', index: 'M', working_dir: ' ' },
                    { path: 'file4.rb', index: 'A', working_dir: ' ' },
                ]
            } as any);

            const { committed, uncommitted } = await utils.getModifiedFiles('main');

            expect(mockGit.diff).toHaveBeenCalledWith(['--name-only', 'main...HEAD']);
            expect(committed).toEqual(['file1.js', 'file2.ts']);

            expect(mockGit.status).toHaveBeenCalled();
            expect(uncommitted).toEqual(['file3.js', 'file4.rb']);
        });
    });
});
