import { SimpleGit } from 'simple-git';
import { gitUtils } from '../utils/git';
import { worktreeManager } from '../utils/worktreeManager';
import { configManager } from '../utils/configManager';
import inquirer from 'inquirer';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs-extra';

interface TidyOptions {
    dryRun?: boolean;
    force?: boolean;
    keepPattern?: string;
}

interface WorktreeCleanupInfo {
    name: string;
    path: string;
    branch: string;
    hasUncommittedChanges: boolean;
    reason: string;
}

interface CleanupPlan {
    worktreesToRemove: WorktreeCleanupInfo[];
    branchesToDelete: Array<{
        name: string;
        reason: string;
    }>;
}

export default async (gitInstance: SimpleGit, options: TidyOptions = {}) => {
    const git = gitUtils(gitInstance);
    const config = configManager(fs);
    const manager = worktreeManager(gitInstance);

    try {
        // 1. Ensure we're in project root
        await ensureInProjectRoot(git, config);
        
        // 2. Switch to main branch and update
        await prepareMainBranch(git, config);
        
        // 3. Analyze what needs cleanup
        const cleanupPlan = await analyzeCleanupNeeds(git, manager, config, options);
        
        // 4. Check if anything needs cleaning
        if (cleanupPlan.worktreesToRemove.length === 0 && cleanupPlan.branchesToDelete.length === 0) {
            console.log(chalk.green('✨ Repository is already clean!'));
            process.exit(0);
        }
        
        // 5. Present plan and get confirmation
        if (!options.force) {
            await confirmCleanupPlan(cleanupPlan, options);
        }
        
        // 6. Execute cleanup
        await executeCleanup(cleanupPlan, git, manager, options);
        
        // 7. Show summary
        showCleanupSummary(cleanupPlan, options);
        
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(chalk.red('✗') + ' Tidy failed:', errorMessage);
        process.exit(1);
    }
};

async function ensureInProjectRoot(git: any, config: any): Promise<void> {
    // Get project config to find the root directory
    const projectConfig = await config.readLocalConfig();
    
    if (!projectConfig) {
        throw new Error('No .vecna.json found. Run "vecna setup" first from your project root.');
    }
    
    // Ensure we're in the project root directory
    const currentDir = process.cwd();
    const projectRoot = projectConfig.path;
    
    if (path.resolve(currentDir) !== path.resolve(projectRoot)) {
        console.log(chalk.yellow(`Switching to project root: ${projectRoot}`));
        process.chdir(projectRoot);
    }
    
    // Verify this is still the main repository
    const isMainRepo = await git.isMainRepository(projectRoot);
    if (!isMainRepo) {
        throw new Error('Project root is not the main git repository');
    }
}

async function prepareMainBranch(git: any, config: any): Promise<void> {
    console.log(chalk.cyan('🔄 Preparing repository for cleanup...'));
    
    // Get main branch from config
    const projectConfig = await config.readLocalConfig();
    const mainBranch = projectConfig?.mainBranch || 'main';
    
    // Switch to main branch
    const currentBranch = await git.getCurrentBranch();
    if (currentBranch !== mainBranch) {
        console.log(`  Switching to ${mainBranch} branch...`);
        await git.checkout(mainBranch);
    }
    
    // Pull latest changes
    console.log('  Pulling latest changes...');
    await git.pull();
    
    // Fetch to update remote branch info
    console.log('  Fetching remote branch information...');
    await git.fetch();
}

async function analyzeCleanupNeeds(
    git: any, 
    manager: any, 
    config: any,
    options: TidyOptions
): Promise<CleanupPlan> {
    console.log(chalk.cyan('🔍 Analyzing branches for cleanup...'));
    
    // Get project configuration
    const projectConfig = await config.readLocalConfig();
    const mainBranch = projectConfig?.mainBranch || 'main';
    
    // Get all local branches except main
    const localBranches = await git.getLocalBranches();
    const branchesToCheck = localBranches.filter((b: string) => 
        b !== mainBranch && !isProtectedBranch(b, options.keepPattern)
    );
    
    console.log(`  Found ${branchesToCheck.length} branches to check`);
    
    // Check which branches no longer exist on remote
    const branchesToDelete: Array<{name: string, reason: string}> = [];
    const worktreesToRemove: WorktreeCleanupInfo[] = [];
    
    for (const branch of branchesToCheck) {
        const remoteExists = await git.doesRemoteBranchExist(branch);
        
        if (!remoteExists) {
            branchesToDelete.push({
                name: branch,
                reason: 'Branch deleted from remote'
            });
            
            // Check if this branch has a worktree
            const worktrees = await manager.listWorktrees();
            const associatedWorktree = worktrees.find((w: any) => w.branch === branch);
            
            if (associatedWorktree) {
                const hasChanges = associatedWorktree.status?.hasUncommittedChanges || false;
                worktreesToRemove.push({
                    name: associatedWorktree.name,
                    path: associatedWorktree.path,
                    branch: branch,
                    hasUncommittedChanges: hasChanges,
                    reason: 'Associated branch deleted from remote'
                });
            }
        }
    }
    
    console.log(`  Found ${branchesToDelete.length} branches to delete`);
    console.log(`  Found ${worktreesToRemove.length} worktrees to remove`);
    
    return { worktreesToRemove, branchesToDelete };
}

function isProtectedBranch(branchName: string, keepPattern?: string): boolean {
    // Always protect main, master, develop, staging
    const defaultProtected = ['main', 'master', 'develop', 'staging'];
    
    if (defaultProtected.includes(branchName)) {
        return true;
    }
    
    // Check custom keep pattern
    if (keepPattern) {
        const pattern = new RegExp(keepPattern.replace('*', '.*'));
        return pattern.test(branchName);
    }
    
    return false;
}

async function confirmCleanupPlan(plan: CleanupPlan, options: TidyOptions): Promise<void> {
    console.log(chalk.cyan.bold('\n🧹 Cleanup Plan:'));
    
    if (plan.worktreesToRemove.length > 0) {
        console.log(chalk.yellow('\nWorktrees to remove:'));
        plan.worktreesToRemove.forEach(w => {
            const status = w.hasUncommittedChanges ? chalk.red(' (has uncommitted changes - will reset)') : '';
            console.log(`  • ${w.name} (${w.branch})${status}`);
        });
    }
    
    if (plan.branchesToDelete.length > 0) {
        console.log(chalk.yellow('\nLocal branches to delete:'));
        plan.branchesToDelete.forEach(b => {
            console.log(`  • ${b.name} - ${b.reason}`);
        });
    }
    
    if (options.dryRun) {
        console.log(chalk.blue('\n💡 This is a dry run - no changes will be made'));
        return;
    }
    
    const { confirm } = await inquirer.prompt([{
        type: 'confirm',
        name: 'confirm',
        message: 'Proceed with cleanup?',
        default: false
    }]);
    
    if (!confirm) {
        console.log(chalk.gray('Cleanup cancelled.'));
        process.exit(0);
    }
}

async function executeCleanup(
    plan: CleanupPlan,
    git: any,
    manager: any,
    options: TidyOptions
): Promise<void> {
    
    // Phase 1: Remove worktrees
    if (plan.worktreesToRemove.length > 0) {
        console.log(chalk.cyan('\n🗂️  Cleaning up worktrees...'));
        
        for (const worktree of plan.worktreesToRemove) {
            if (worktree.hasUncommittedChanges && !options.dryRun) {
                console.log(`  Resetting uncommitted changes in ${worktree.name}...`);
                await git.resetUncommittedChanges(worktree.path);
            }
            
            if (!options.dryRun) {
                await git.removeWorktree(worktree.path, true); // force=true
                await manager.cleanWorktreeState(worktree.name);
            }
            
            const action = options.dryRun ? 'Would remove' : 'Removed';
            console.log(`  ${chalk.green('✓')} ${action} worktree: ${worktree.name}`);
        }
    }
    
    // Phase 2: Delete local branches
    if (plan.branchesToDelete.length > 0) {
        console.log(chalk.cyan('\n🌿 Cleaning up local branches...'));
        
        for (const branch of plan.branchesToDelete) {
            if (!options.dryRun) {
                await git.deleteBranch(branch.name, true); // force=true
            }
            
            const action = options.dryRun ? 'Would delete' : 'Deleted';
            console.log(`  ${chalk.green('✓')} ${action} branch: ${branch.name}`);
        }
    }
}

function showCleanupSummary(plan: CleanupPlan, options: TidyOptions): void {
    const worktreeCount = plan.worktreesToRemove.length;
    const branchCount = plan.branchesToDelete.length;
    
    if (worktreeCount === 0 && branchCount === 0) {
        return;
    }
    
    const action = options.dryRun ? 'Would clean' : 'Cleaned';
    console.log(chalk.green(`\n✨ ${action} up:`));
    
    if (worktreeCount > 0) {
        console.log(`  • ${worktreeCount} worktree${worktreeCount > 1 ? 's' : ''}`);
    }
    
    if (branchCount > 0) {
        console.log(`  • ${branchCount} local branch${branchCount > 1 ? 'es' : ''}`);
    }
    
    if (!options.dryRun) {
        console.log(chalk.gray('\n💡 Your repository is now tidy!'));
    }
}