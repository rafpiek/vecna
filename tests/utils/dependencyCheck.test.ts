import { dependencyExists } from '../../src/utils/dependencyCheck';
import { exec } from 'child_process';

jest.mock('child_process');

describe('dependencyCheck', () => {
    it('should return true if dependency exists', async () => {
        (exec as jest.Mock).mockImplementation((command, callback) => {
            callback(null, 'path/to/dependency');
        });
        const exists = await dependencyExists('node');
        expect(exists).toBe(true);
    });

    it('should return false if dependency does not exist', async () => {
        (exec as jest.Mock).mockImplementation((command, callback) => {
            callback(new Error('not found'));
        });
        const exists = await dependencyExists('nonexistent');
        expect(exists).toBe(false);
    });
});
