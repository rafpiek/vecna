import { dependencyExists } from '../../src/utils/dependencyCheck';
import * as child_process from 'child_process';

jest.mock('child_process');

describe('dependencyCheck', () => {
    it('should return true if dependency exists', async () => {
        const execSpy = jest.spyOn(child_process, 'exec').mockImplementation((command, callback) => {
            callback(null, 'path/to/dependency', '');
            return {} as any;
        });
        const exists = await dependencyExists('node');
        expect(exists).toBe(true);
        execSpy.mockRestore();
    });

    it('should return false if dependency does not exist', async () => {
        const execSpy = jest.spyOn(child_process, 'exec').mockImplementation((command, callback) => {
            callback(new Error('not found'), '', '');
            return {} as any;
        });
        const exists = await dependencyExists('nonexistent');
        expect(exists).toBe(false);
        execSpy.mockRestore();
    });
});
