import simpleGit, { SimpleGit } from 'simple-git';

export const git: SimpleGit = simpleGit();

interface ModifiedFiles {
    committed: string[];
    uncommitted: string[];
}

export const getModifiedFiles = async (mainBranch: string = 'main'): Promise<ModifiedFiles> => {
    const committed = (await git.diff(['--name-only', `${mainBranch}...HEAD`])).split('\n').filter(Boolean);

    const status = await git.status();
    const uncommitted = status.files.map(file => file.path);

    return {
        committed,
        uncommitted
    };
};
