// Git Service - Real Implementation
// Uses simple-git to provide actual git functionality

import { logger } from '../../shared/logger';

export interface GitStatus {
  branch: string;
  ahead: number;
  behind: number;
  staged: string[];
  unstaged: string[];
  untracked: string[];
  conflicted: string[];
  created: string[];
  deleted: string[];
  modified: string[];
  renamed: Array<{from: string; to: string}>;
}

export interface GitCommit {
  hash: string;
  date: string;
  message: string;
  author: string;
}

class GitService {
  private initialized: boolean = false;
  private currentRepo: string | null = null;

  async initialize(repoPath: string): Promise<boolean> {
    try {
      const result = await window.primus.git.init(repoPath);
      if (result.success) {
        this.currentRepo = repoPath;
        this.initialized = true;
        logger.info('Git service initialized', { repo: repoPath });
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Failed to initialize git service', error);
      return false;
    }
  }

  async getStatus(): Promise<GitStatus | null> {
    if (!this.initialized || !this.currentRepo) {
      logger.warn('Git service not initialized');
      return null;
    }

    try {
      const status = await window.primus.git.status(this.currentRepo);
      return {
        branch: status.current || 'unknown',
        ahead: status.ahead || 0,
        behind: status.behind || 0,
        staged: status.staged || [],
        unstaged: status.modified || [],
        untracked: status.not_added || [],
        conflicted: status.conflicted || [],
        created: status.created || [],
        deleted: status.deleted || [],
        modified: status.modified || [],
        renamed: status.renamed || []
      };
    } catch (error) {
      logger.error('Failed to get git status', error);
      return null;
    }
  }

  async stage(files: string[]): Promise<boolean> {
    if (!this.initialized || !this.currentRepo) return false;

    try {
      await window.primus.git.add(this.currentRepo, files);
      logger.info('Files staged', { files });
      return true;
    } catch (error) {
      logger.error('Failed to stage files', error);
      return false;
    }
  }

  async unstage(files: string[]): Promise<boolean> {
    if (!this.initialized || !this.currentRepo) return false;

    try {
      await window.primus.git.reset(this.currentRepo, files);
      logger.info('Files unstaged', { files });
      return true;
    } catch (error) {
      logger.error('Failed to unstage files', error);
      return false;
    }
  }

  async commit(message: string): Promise<boolean> {
    if (!this.initialized || !this.currentRepo || !message.trim()) return false;

    try {
      await window.primus.git.commit(this.currentRepo, message);
      logger.info('Commit created', { message });
      return true;
    } catch (error) {
      logger.error('Failed to commit', error);
      return false;
    }
  }

  async push(remote = 'origin', branch?: string): Promise<boolean> {
    if (!this.initialized || !this.currentRepo) return false;

    try {
      const currentBranch = branch || (await this.getCurrentBranch());
      if (!currentBranch) return false;

      await window.primus.git.push(this.currentRepo, remote, currentBranch);
      logger.info('Pushed to remote', { remote, branch: currentBranch });
      return true;
    } catch (error) {
      logger.error('Failed to push', error);
      return false;
    }
  }

  async pull(remote = 'origin', branch?: string): Promise<boolean> {
    if (!this.initialized || !this.currentRepo) return false;

    try {
      const currentBranch = branch || (await this.getCurrentBranch());
      if (!currentBranch) return false;

      await window.primus.git.pull(this.currentRepo, remote, currentBranch);
      logger.info('Pulled from remote', { remote, branch: currentBranch });
      return true;
    } catch (error) {
      logger.error('Failed to pull', error);
      return false;
    }
  }

  async getCurrentBranch(): Promise<string | null> {
    const status = await this.getStatus();
    return status?.branch || null;
  }

  async getBranches(): Promise<string[]> {
    if (!this.initialized || !this.currentRepo) return [];

    try {
      const branches = await window.primus.git.branches(this.currentRepo);
      return branches.all || [];
    } catch (error) {
      logger.error('Failed to get branches', error);
      return [];
    }
  }

  async checkout(branch: string): Promise<boolean> {
    if (!this.initialized || !this.currentRepo) return false;

    try {
      await window.primus.git.checkout(this.currentRepo, branch);
      logger.info('Checked out branch', { branch });
      return true;
    } catch (error) {
      logger.error('Failed to checkout branch', error);
      return false;
    }
  }

  async createBranch(name: string): Promise<boolean> {
    if (!this.initialized || !this.currentRepo || !name.trim()) return false;

    try {
      await window.primus.git.checkoutLocalBranch(this.currentRepo, name);
      logger.info('Created branch', { name });
      return true;
    } catch (error) {
      logger.error('Failed to create branch', error);
      return false;
    }
  }

  async getLog(limit = 50): Promise<GitCommit[]> {
    if (!this.initialized || !this.currentRepo) return [];

    try {
      const log = await window.primus.git.log(this.currentRepo, { n: limit });
      return (log.all || []).map(commit => ({
        hash: commit.hash,
        date: commit.date,
        message: commit.message,
        author: commit.author_name
      }));
    } catch (error) {
      logger.error('Failed to get log', error);
      return [];
    }
  }

  async diff(file?: string): Promise<string> {
    if (!this.initialized || !this.currentRepo) return '';

    try {
      const diff = await window.primus.git.diff(this.currentRepo, file ? [file] : []);
      return diff || '';
    } catch (error) {
      logger.error('Failed to get diff', error);
      return '';
    }
  }
}

// Singleton instance
export const gitService = new GitService();
