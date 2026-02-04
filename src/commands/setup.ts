#!/usr/bin/env node

import fs from 'fs-extra';
import path from 'path';
import { SimpleGit } from 'simple-git';
import { gitUtils } from '../utils/git';
import { shellIntegration } from '../utils/shellIntegration';
import chalk from 'chalk';

async function appendToIgnoreFile(filePath: string, entry: string): Promise<boolean> {
    let content = '';
    if (await fs.pathExists(filePath)) {
        content = await fs.readFile(filePath, 'utf-8');
    }

    // Check if entry already exists
    const lines = content.split('\n');
    if (lines.includes(entry)) {
        return false; // Already exists
    }

    // Add newline if file doesn't end with one
    if (content && !content.endsWith('\n')) {
        content += '\n';
    }
    content += entry + '\n';
    await fs.writeFile(filePath, content);
    return true;
}

export default async (gitInstance: SimpleGit) => {
    const git = gitUtils(gitInstance);

    try {
        // Find git root directory
        const gitRoot = await git.findGitRoot(process.cwd());

        // Verify this is the main repository (not a worktree)
        const isMainRepo = await git.isMainRepository(gitRoot);

        if (!isMainRepo) {
            throw new Error('Setup must be run from the main repository directory, not a worktree');
        }

        console.log(chalk.cyan.bold('🔧 Vecna Setup\n'));

        // 1. Create .worktrees directory
        const worktreesDir = path.join(gitRoot, '.worktrees');
        await fs.ensureDir(worktreesDir);
        console.log(chalk.green('✓') + ' Created .worktrees directory');

        // 2. Add .worktrees to .gitignore
        const gitignorePath = path.join(gitRoot, '.gitignore');
        const addedToGitignore = await appendToIgnoreFile(gitignorePath, '.worktrees');
        if (addedToGitignore) {
            console.log(chalk.green('✓') + ' Added .worktrees to .gitignore');
        } else {
            console.log(chalk.gray('·') + ' .worktrees already in .gitignore');
        }

        // 3. Add .worktrees to .cursorignore
        const cursorignorePath = path.join(gitRoot, '.cursorignore');
        const addedToCursorignore = await appendToIgnoreFile(cursorignorePath, '.worktrees');
        if (addedToCursorignore) {
            console.log(chalk.green('✓') + ' Added .worktrees to .cursorignore');
        } else {
            console.log(chalk.gray('·') + ' .worktrees already in .cursorignore');
        }

        // 4. Install shell integration
        console.log('');
        const shell = shellIntegration.detectShell();
        const configPath = shellIntegration.getShellConfigPath();

        console.log(`Detected shell: ${chalk.yellow(shell)}`);

        try {
            await shellIntegration.installShellIntegration();
            console.log(chalk.green('✓') + ' Shell integration installed');
        } catch {
            console.log(chalk.gray('·') + ' Shell integration already installed');
        }

        console.log(chalk.green.bold('\n✓ Setup complete!'));
        console.log('\nTo start using vecna:');
        console.log(chalk.yellow(`  1. Restart your terminal, or run: source ${configPath}`));
        console.log(chalk.yellow('  2. Create a worktree: vecna start <branch-name>'));
        console.log(chalk.yellow('  3. Switch worktrees: vecna-switch'));

    } catch (error) {
        console.error('Setup failed:', error);
        throw error;
    }
};
