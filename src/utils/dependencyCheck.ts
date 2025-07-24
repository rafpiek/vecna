import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const dependencyExists = async (dependency: string): Promise<boolean> => {
    try {
        await execAsync(`which ${dependency}`);
        return true;
    } catch (error) {
        return false;
    }
};
