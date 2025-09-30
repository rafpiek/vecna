import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import crypto from 'crypto';

const CACHE_DIR = path.join(os.homedir(), '.config', 'vecna', 'cache');
const CACHE_DURATION_MS = 15 * 60 * 1000; // 15 minutes in milliseconds

export interface FetchCacheManager {
    shouldFetch(repoPath: string): Promise<boolean>;
    updateFetchTimestamp(repoPath: string): Promise<void>;
}

export function fetchCacheManager(fsModule: typeof fs = fs): FetchCacheManager {
    const getCacheFilePath = (repoPath: string): string => {
        // Create a hash of the repo path to use as filename
        const hash = crypto.createHash('md5').update(repoPath).digest('hex');
        return path.join(CACHE_DIR, `last-fetch-${hash}`);
    };

    return {
        shouldFetch: async (repoPath: string): Promise<boolean> => {
            try {
                const cacheFile = getCacheFilePath(repoPath);

                // If cache file doesn't exist, we should fetch
                if (!await fsModule.pathExists(cacheFile)) {
                    return true;
                }

                // Read the timestamp from cache
                const timestamp = await fsModule.readFile(cacheFile, 'utf-8');
                const lastFetchTime = parseInt(timestamp, 10);

                if (isNaN(lastFetchTime)) {
                    return true;
                }

                // Check if more than 15 minutes have passed
                const now = Date.now();
                const timeSinceLastFetch = now - lastFetchTime;

                return timeSinceLastFetch > CACHE_DURATION_MS;
            } catch (error) {
                // On any error, default to fetching
                return true;
            }
        },

        updateFetchTimestamp: async (repoPath: string): Promise<void> => {
            try {
                await fsModule.ensureDir(CACHE_DIR);
                const cacheFile = getCacheFilePath(repoPath);
                const timestamp = Date.now().toString();
                await fsModule.writeFile(cacheFile, timestamp, 'utf-8');
            } catch (error) {
                // Silently fail - caching is not critical
                console.warn('Warning: Could not update fetch cache:', error instanceof Error ? error.message : String(error));
            }
        }
    };
}