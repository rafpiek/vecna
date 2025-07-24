import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs-extra';
import path from 'path';

const execAsync = promisify(exec);

export const dependencyExists = async (dependency: string): Promise<boolean> => {
    try {
        // First try to find it globally
        await execAsync(`which ${dependency}`);
        return true;
    } catch (error) {
        // If not found globally, check local node_modules/.bin
        const localBinPath = path.join(process.cwd(), 'node_modules', '.bin', dependency);
        return await fs.pathExists(localBinPath);
    }
};
