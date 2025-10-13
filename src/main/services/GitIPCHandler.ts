// Git IPC Handlers for Main Process
import { ipcMain } from 'electron';
import simpleGit, { SimpleGit, ResetMode } from 'simple-git';
import { logger } from '../../shared/logger';

class GitIPCHandler {
  private gitInstances: Map<string, SimpleGit> = new Map();

  constructor() {
    this.registerHandlers();
  }

  private getGitInstance(repoPath: string): SimpleGit {
    if (!this.gitInstances.has(repoPath)) {
      const git = simpleGit(repoPath);
      this.gitInstances.set(repoPath, git);
    }
    return this.gitInstances.get(repoPath)!;
  }

  private registerHandlers() {
      // Guard: avoid double-registration of git ipc handlers when modules are reloaded
      try {
        if ((global as any).__primus_git_handlers_installed) return;
        (global as any).__primus_git_handlers_installed = true;
      } catch (e) { /* ignore */ }

    // Initialize repository
    ipcMain.handle('git:init', async (event, repoPath: string) => {
      try {
        const git = this.getGitInstance(repoPath);
        const isRepo = await git.checkIsRepo();
        
        if (!isRepo) {
          await git.init();
        }
        
        return { success: true, isNew: !isRepo };
      } catch (error: any) {
        logger.error('Git init failed', error);
        return { success: false, error: error.message || String(error) };
      }
    });

    // Get status
    ipcMain.handle('git:status', async (event, repoPath: string) => {
      try {
        const git = this.getGitInstance(repoPath);
        const status = await git.status();
        
        return {
          current: status.current,
          ahead: status.ahead,
          behind: status.behind,
          staged: status.staged,
          modified: status.modified,
          not_added: status.not_added,
          conflicted: status.conflicted,
          created: status.created,
          deleted: status.deleted,
          renamed: status.renamed
        };
      } catch (error: any) {
        logger.error('Git status failed', error);
        throw error;
      }
    });

    // Stage files
    ipcMain.handle('git:add', async (event, repoPath: string, files: string[]) => {
      try {
        const git = this.getGitInstance(repoPath);
        await git.add(files);
        return { success: true };
      } catch (error: any) {
        logger.error('Git add failed', error);
        throw error;
      }
    });

    // Commit
    ipcMain.handle('git:commit', async (event, repoPath: string, message: string) => {
      try {
        const git = this.getGitInstance(repoPath);
        const result = await git.commit(message);
        return { 
          success: true, 
          hash: result.commit,
          summary: result.summary
        };
      } catch (error: any) {
        logger.error('Git commit failed', error);
        throw error;
      }
    });

    // Push
    ipcMain.handle('git:push', async (event, repoPath: string, remote: string, branch: string) => {
      try {
        const git = this.getGitInstance(repoPath);
        await git.push(remote, branch);
        return { success: true };
      } catch (error: any) {
        logger.error('Git push failed', error);
        throw error;
      }
    });

    // Pull
    ipcMain.handle('git:pull', async (event, repoPath: string, remote: string, branch: string) => {
      try {
        const git = this.getGitInstance(repoPath);
        const result = await git.pull(remote, branch);
        return { 
          success: true,
          files: result.files,
          insertions: result.insertions,
          deletions: result.deletions
        };
      } catch (error: any) {
        logger.error('Git pull failed', error);
        throw error;
      }
    });

    // Get branches
    ipcMain.handle('git:branches', async (event, repoPath: string) => {
      try {
        const git = this.getGitInstance(repoPath);
        const result = await git.branch();
        return {
          all: result.all,
          current: result.current,
          branches: result.branches
        };
      } catch (error: any) {
        logger.error('Git branches failed', error);
        throw error;
      }
    });

    // Checkout branch
    ipcMain.handle('git:checkout', async (event, repoPath: string, branch: string) => {
      try {
        const git = this.getGitInstance(repoPath);
        await git.checkout(branch);
        return { success: true };
      } catch (error: any) {
        logger.error('Git checkout failed', error);
        throw error;
      }
    });

    // Create branch (checkoutLocalBranch)
    ipcMain.handle('git:checkoutLocalBranch', async (event, repoPath: string, branch: string) => {
      try {
        const git = this.getGitInstance(repoPath);
        await git.checkoutLocalBranch(branch);
        return { success: true };
      } catch (error: any) {
        logger.error('Git checkout local branch failed', error);
        throw error;
      }
    });

    // Reset repository
    ipcMain.handle('git:reset', async (event, repoPath: string, files?: string[]) => {
      try {
        const git = this.getGitInstance(repoPath);
        if (files && files.length > 0) {
          await git.reset(ResetMode.HARD, ['--', ...files]);
        } else {
          await git.reset(ResetMode.HARD);
        }
        return { success: true };
      } catch (error: any) {
        logger.error('Git reset failed', error);
        throw error;
      }
    });

    // Get diff
    ipcMain.handle('git:diff', async (event, repoPath: string, files?: string[]) => {
      try {
        const git = this.getGitInstance(repoPath);
        if (files && files.length > 0) {
          return await git.diff(files);
        } else {
          return await git.diff();
        }
      } catch (error: any) {
        logger.error('Git diff failed', error);
        throw error;
      }
    });

    // Get log
    ipcMain.handle('git:log', async (event, repoPath: string, options?: any) => {
      try {
        const git = this.getGitInstance(repoPath);
        const result = await git.log(options || {});
        return result;
      } catch (error: any) {
        logger.error('Git log failed', error);
        throw error;
      }
    });

    // Legacy methods for compatibility
    ipcMain.handle('git:isRepo', async (event, dirPath?: string) => {
      try {
        const repoPath = dirPath || process.cwd();
        const git = this.getGitInstance(repoPath);
        const isRepo = await git.checkIsRepo();
        return isRepo;
      } catch (error: any) {
        logger.error('Git isRepo failed', error);
        throw error;
      }
    });

    ipcMain.handle('git:getStatus', async (event, dirPath?: string) => {
      try {
        const repoPath = dirPath || process.cwd();
        const git = this.getGitInstance(repoPath);
        return await git.status();
      } catch (error: any) {
        logger.error('Git getStatus failed', error);
        throw error;
      }
    });

    ipcMain.handle('git:getBranches', async (event, dirPath?: string) => {
      try {
        const repoPath = dirPath || process.cwd();
        const git = this.getGitInstance(repoPath);
        return await git.branch();
      } catch (error: any) {
        logger.error('Git getBranches failed', error);
        throw error;
      }
    });

    ipcMain.handle('git:stage', async (event, filePath: string, dirPath?: string) => {
      try {
        const repoPath = dirPath || process.cwd();
        const git = this.getGitInstance(repoPath);
        await git.add(filePath);
        return true;
      } catch (error: any) {
        logger.error('Git stage failed', error);
        return false;
      }
    });

    ipcMain.handle('git:unstage', async (event, filePath: string, dirPath?: string) => {
      try {
        const repoPath = dirPath || process.cwd();
        const git = this.getGitInstance(repoPath);
        await git.reset(ResetMode.HARD, ['--', filePath]);
        return true;
      } catch (error: any) {
        logger.error('Git unstage failed', error);
        return false;
      }
    });

    ipcMain.handle('git:getDiff', async (event, filePath?: string) => {
      try {
        const repoPath = process.cwd();
        const git = this.getGitInstance(repoPath);
        const diff = filePath ? await git.diff(['--', filePath]) : await git.diff();
        return { diff };
      } catch (error: any) {
        logger.error('Git getDiff failed', error);
        throw error;
      }
    });
  }

  cleanup() {
    this.gitInstances.clear();
  }

  setProjectDir(projectDir: string) {
    // This method is kept for compatibility but doesn't need to do anything
    // since GitIPCHandler manages git instances per repository path dynamically
    logger.info(`GitIPCHandler project directory set to: ${projectDir}`);
  }
}

// Export singleton
export const gitIPCHandler = new GitIPCHandler();
