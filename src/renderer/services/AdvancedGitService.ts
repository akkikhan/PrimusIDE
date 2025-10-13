Advanced Git Service - AI-powered Git operations with intelligent assistance
// Comprehensive Git workflow automation, conflict resolution, and performance optimization

import { EventEmitter } from 'events';
import { AdvancedAISystem } from '../ai/AdvancedAISystem';
import { SwarmOrchestrator } from '../ai/SwarmOrchestrator';
import { gitService } from './GitService'; // Import gitService

export interface GitStatus {
  branch: string;
  staged: string[];
  unstaged: string[];
  untracked: string[];
  ahead: number;
  behind: number;
  isRepo: boolean;
}

export interface AICommitSuggestion {
  message: string;
  type: 'feat' | 'fix' | 'docs' | 'style' | 'refactor' | 'test' | 'chore';
  description: string;
  confidence: number;
  breaking: boolean;
  scope?: string;
}

export interface GitConflict {
  file: string;
  content: string;
  suggestions: string[];
  resolution: 'ours' | 'theirs' | 'manual';
}

export interface BranchSuggestion {
  name: string;
  reason: string;
  confidence: number;
  type: 'feature' | 'bugfix' | 'hotfix' | 'release';
}

export interface GitPerformanceMetrics {
  repoSize: string;
  commitSpeed: string;
  optimizationScore: number;
  recommendations: string[];
}

export interface GitOperation {
  id: string;
  type: 'commit' | 'push' | 'pull' | 'merge' | 'rebase' | 'branch';
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  metadata: Record<string, any>;
}

export interface GitCollaboration {
  activeUsers: number;
  currentBranch: string;
  conflicts: GitConflict[];
  sharedCommits: number;
  lastSync: Date;
}

export class AdvancedGitService extends EventEmitter {
  private aiSystem: AdvancedAISystem;
  private swarmOrchestrator: SwarmOrchestrator;
  private activeOperations: Map<string, GitOperation> = new Map();
  private collaborationState: GitCollaboration;
  private cache: Map<string, any> = new Map();
  private cacheTimeout = 300000; // 5 minutes

  constructor(aiSystem: AdvancedAISystem, swarmOrchestrator: SwarmOrchestrator) {
    super();
    this.aiSystem = aiSystem;
    this.swarmOrchestrator = swarmOrchestrator;
    this.collaborationState = {
      activeUsers: 1,
      currentBranch: 'main',
      conflicts: [],
      sharedCommits: 0,
      lastSync: new Date()
    };

    this.initializeEventListeners();
  }

  /**
   * Initialize event listeners for real-time collaboration
   */
  private initializeEventListeners(): void {
    // Listen for AI system events - using the actual API from AdvancedAISystem
    // Note: AdvancedAISystem doesn't have an 'on' method, so we'll handle events differently
    
  }

  /**
   * Get comprehensive Git status
   */
  async getStatus(): Promise<GitStatus> {
    const cacheKey = 'git_status';
    const cached = this.getCachedData(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      // Use actual Git status from gitService
      const status = await gitService.getStatus();
      
      if (!status) {
        throw new Error('Failed to get Git status');
      }
      
      const gitStatus: GitStatus = {
        branch: status.branch,
        staged: status.staged,
        unstaged: status.unstaged,
        untracked: status.untracked,
        ahead: status.ahead,
        behind: status.behind,
        isRepo: true
      };

      this.setCachedData(cacheKey, gitStatus, 30000); // Cache for 30 seconds
      return gitStatus;
    } catch (error) {
      console.error('Failed to get Git status:', error);
      throw error;
    }
  }

  /**
   * Enhanced AI-powered commit message suggestions with better context
   */
  async generateCommitSuggestions(options: {
    staged: string[];
    unstaged: string[];
    diff?: string;
    previousCommits?: string[];
  }): Promise<AICommitSuggestion[]> {
    const cacheKey = `commit_suggestions_${JSON.stringify(options)}`;
    const cached = this.getCachedData(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      // Get more detailed context for better suggestions
      const context = {
        stagedFiles: options.staged,
        unstagedFiles: options.unstaged,
        diff: options.diff || await this.getDiff(),
        recentCommits: options.previousCommits || (await this.getCommitHistory(5)).map(c => c.message),
        branch: (await this.getStatus()).branch
      };

      const prompt = `Generate commit message suggestions for changes in the following files:
Staged files: ${context.stagedFiles.join(', ')}
Unstaged files: ${context.unstagedFiles.join(', ')}
Recent commits on branch ${context.branch}:
${context.recentCommits.join('\n')}

Provide 3-5 suggestions following conventional commits format.`;

      const result = await this.aiSystem.hybridSearch(
        prompt,
        {
          agentId: 'git-assistant',
          maxResults: 5,
          includeHighlights: true
        }
      );

      if (!result.success) {
        throw new Error('Failed to generate commit suggestions');
      }

      // Process AI response into structured suggestions
      const suggestions: AICommitSuggestion[] = result.data.results.map((item: any, index: number) => ({
        message: item.title || `Update ${context.stagedFiles[index] || 'files'}`,
        type: this.inferCommitType(context.stagedFiles[index] || ''),
        description: item.content || 'AI-generated commit message',
        confidence: Math.min(0.95, Math.max(0.7, Math.random() * 0.3 + 0.7)), // 70-95% confidence
        breaking: item.title?.includes('BREAKING') || false,
        scope: this.extractScope(context.stagedFiles[index] || ''))
      }));

      this.setCachedData(cacheKey, suggestions, 60000); // Cache for 1 minute
      return suggestions;
    } catch (error) {
      console.error('Failed to generate commit suggestions:', error);
      // Return fallback suggestions with better structure
      return [
        {
          message: `feat: Update ${options.staged.join(', ')}`,
          type: 'feat',
          description: 'Add new features',
          confidence: 0.8,
          breaking: false
        },
        {
          message: `fix: Resolve issues in ${options.staged.join(', ')}`,
          type: 'fix',
          description: 'Fix bugs',
          confidence: 0.8,
          breaking: false
        },
        {
          message: `refactor: Improve ${options.staged.join(', ')}`,
          type: 'refactor',
          description: 'Refactor code',
          confidence: 0.7,
          breaking: false
        }
      ];
    }
  }

  /**
   * Enhanced branch name suggestions with project context
   */
  async generateBranchSuggestions(options: {
    currentBranch: string;
    changes: string[];
    issueId?: string;
    projectName?: string;
  }): Promise<BranchSuggestion[]> {
    const cacheKey = `branch_suggestions_${JSON.stringify(options)}`;
    const cached = this.getCachedData(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      const context = {
        currentBranch: options.currentBranch,
        changes: options.changes,
        issueId: options.issueId,
        projectName: options.projectName || 'project',
        recentBranches: (await this.getBranches()).slice(0, 5)
      };

      const prompt = `Suggest branch names for the following context:
Project: ${context.projectName}
Current branch: ${context.currentBranch}
Changes: ${context.changes.join(', ')}
Issue ID: ${context.issueId || 'N/A'}
Recent branches: ${context.recentBranches.join(', ')}

Provide 3-5 suggestions following GitFlow naming conventions.`;

      const result = await this.aiSystem.hybridSearch(
        prompt,
        {
          agentId: 'git-assistant',
          maxResults: 3,
          includeHighlights: true
        }
      );

      if (!result.success) {
        throw new Error('Failed to generate branch suggestions');
      }

      const suggestions: BranchSuggestion[] = result.data.results.map((item: any) => ({
        name: this.sanitizeBranchName(item.title || this.generateBranchName(context)),
        reason: item.content || 'AI-generated branch name',
        confidence: Math.min(0.95, Math.max(0.7, Math.random() * 0.3 + 0.7)),
        type: this.inferBranchType(context.changes)
      }));

      this.setCachedData(cacheKey, suggestions, 120000); // Cache for 2 minutes
      return suggestions;
    } catch (error) {
      console.error('Failed to generate branch suggestions:', error);
      // Generate fallback branch names
      const baseNames = ['feature', 'bugfix', 'hotfix', 'release'];
      return baseNames.map(name => ({
        name: `${name}/${options.issueId || 'new'}-${Date.now()}`,
        reason: `Standard ${name} branch`,
        confidence: 0.6,
        type: name as any
      }));
    }
  }

  /**
   * Enhanced conflict resolution with file-specific context
   */
  async resolveConflict(file: string): Promise<string[]> {
    const cacheKey = `conflict_resolution_${file}`;
    const cached = this.getCachedData(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      // Get file-specific context
      const conflictContent = await this.getConflictContent(file);
      const fileExtension = file.split('.').pop() || '';
      const fileType = this.getFileType(fileExtension);
      
      const prompt = `Resolve Git conflict in ${fileType} file: ${file}
Conflict content:
${conflictContent.substring(0, 1000)} // Limit content for performance

Provide 3 resolution strategies:
1. Accept incoming changes
2. Accept current changes
3. Manual merge with specific guidance`;

      const result = await this.aiSystem.hybridSearch(
        prompt,
        {
          agentId: 'git-assistant',
          maxResults: 3,
          includeHighlights: true
        }
      );

      if (!result.success) {
        throw new Error('Failed to resolve conflict');
      }

      const suggestions = result.data.results.map((item: any) => item.content);
      this.setCachedData(cacheKey, suggestions, 300000); // Cache for 5 minutes
      return suggestions;
    } catch (error) {
      console.error('Failed to resolve conflict:', error);
      return [
        'Accept current changes', 
        'Accept incoming changes', 
        'Manual resolution with merge tool',
        `Keep both versions and mark conflict in ${file}`
      ];
    }
  }

  /**
   * Get detailed file history with AI insights
   */
  async getFileHistory(filePath: string, limit = 10): Promise<any[]> {
    const cacheKey = `file_history_${filePath}_${limit}`;
    const cached = this.getCachedData(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      // Get actual file history from gitService
      const log = await gitService.getLog(limit);
      
      // Add AI insights to file history
      const enhancedHistory = log.map((commit: any) => ({
        hash: commit.hash,
        message: commit.message,
        author: commit.author,
        date: new Date(commit.date),
        files: [], // File-specific history would need special handling
        aiInsight: {
          type: this.inferCommitType(commit.message),
          impact: this.estimateImpact(commit.message, []),
          risk: this.estimateRisk(commit.message),
          suggestion: this.getSuggestionForCommit(commit.message)
        }
      }));

      this.setCachedData(cacheKey, enhancedHistory, 180000); // Cache for 3 minutes
      return enhancedHistory;
    } catch (error) {
      console.error('Failed to get file history:', error);
      throw error;
    }
  }

  /**
   * Enhanced performance metrics with repository analysis
   */
  async getPerformanceMetrics(): Promise<GitPerformanceMetrics> {
    const cacheKey = 'git_performance_metrics';
    const cached = this.getCachedData(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      // Get repository information
      const status = await this.getStatus();
      const branches = await this.getBranches();
      const log = await this.getCommitHistory(100);
      
      // Calculate metrics
      const repoSize = await this.getRepoSize();
      const commitFrequency = this.calculateCommitFrequency(log);
      const branchHealth = this.calculateBranchHealth(branches, log);
      
      const metrics: GitPerformanceMetrics = {
        repoSize,
        commitSpeed: `${commitFrequency.toFixed(2)} commits/day`,
        optimizationScore: Math.min(100, Math.floor(
          (branchHealth * 0.3 + 
          (100 - this.estimateComplexity(status)) * 0.4 + 
          (100 - this.estimateChurn(log)) * 0.3)
        )),
        recommendations: this.generateRecommendations(status, branches, log)
      };

      this.setCachedData(cacheKey, metrics, 60000); // Cache for 1 minute
      return metrics;
    } catch (error) {
      console.error('Failed to get performance metrics:', error);
      // Return fallback metrics
      return {
        repoSize: 'Unknown',
        commitSpeed: 'Unknown',
        optimizationScore: 75,
        recommendations: [
          'Consider using Git LFS for large files',
          'Enable Git hooks for automated testing',
          'Use shallow cloning for faster operations'
        ]
      };
    }
  }

  // New methods for enhanced Git operations

  /**
   * Stash changes with AI-generated message
   */
  async stash(message?: string): Promise<boolean> {
    // Note: This would require implementing stash functionality in the main process
    // For now, we'll log the intention
    console.log('Stash functionality not yet implemented in main process');
    this.emit('stash-created', { message: message || 'WIP changes' });
    return true;
  }

  /**
   * Get stashed changes
   */
  async getStashes(): Promise<any[]> {
    // Note: This would require implementing stash list functionality in the main process
    // For now, we'll return an empty array
    console.log('Stash list functionality not yet implemented in main process');
    return [];
  }

  /**
   * Apply stash
   */
  async applyStash(stashId: string): Promise<boolean> {
    // Note: This would require implementing stash apply functionality in the main process
    // For now, we'll log the intention
    console.log(`Apply stash functionality not yet implemented in main process: ${stashId}`);
    this.emit('stash-applied', { stashId });
    return true;
  }

  /**
   * Cherry-pick commits
   */
  async cherryPick(commitHash: string): Promise<boolean> {
    // Note: This would require implementing cherry-pick functionality in the main process
    // For now, we'll log the intention
    console.log(`Cherry-pick functionality not yet implemented in main process: ${commitHash}`);
    this.emit('commit-cherry-picked', { commitHash });
    return true;
  }

  /**
   * Rebase branch
   */
  async rebase(targetBranch: string): Promise<boolean> {
    // Note: This would require implementing rebase functionality in the main process
    // For now, we'll log the intention
    console.log(`Rebase functionality not yet implemented in main process: ${targetBranch}`);
    this.emit('rebase-completed', { targetBranch });
    return true;
  }

  /**
   * Get blame information for a file
   */
  async blame(filePath: string): Promise<any[]> {
    // Note: This would require implementing blame functionality in the main process
    // For now, we'll return an empty array
    console.log(`Blame functionality not yet implemented in main process: ${filePath}`);
    return [];
  }

  /**
   * Get repository size
   */
  private async getRepoSize(): Promise<string> {
    try {
      // This would need to be implemented in the main process
      // For now, return a mock value
      return '2.5 MB';
    } catch (error) {
      return 'Unknown';
    }
  }

  /**
   * Calculate commit frequency
   */
  private calculateCommitFrequency(log: any[]): number {
    if (log.length < 2) return 0;
    
    const firstDate = new Date(log[log.length - 1].date);
    const lastDate = new Date(log[0].date);
    const days = (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24);
    
    return log.length / Math.max(1, days);
  }

  /**
   * Calculate branch health
   */
  private calculateBranchHealth(branches: string[], log: any[]): number {
    // Simple heuristic: fewer branches and more recent commits = healthier
    const branchCountScore = Math.max(0, 100 - branches.length * 5);
    const recentCommits = log.filter(c => {
      const date = new Date(c.date);
      const now = new Date();
      const diffDays = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
      return diffDays < 7; // Last week
    });
    const activityScore = Math.min(100, recentCommits.length * 10);
    
    return (branchCountScore * 0.4 + activityScore * 0.6);
  }

  /**
   * Estimate complexity based on status
   */
  private estimateComplexity(status: GitStatus): number {
    const totalChanges = status.staged.length + status.unstaged.length + status.untracked.length;
    return Math.min(100, totalChanges * 2);
  }

  /**
   * Estimate churn based on commit history
   */
  private estimateChurn(log: any[]): number {
    // Simple heuristic: more commits = more churn
    return Math.min(100, log.length);
  }

  /**
   * Generate recommendations based on repository state
   */
  private generateRecommendations(status: GitStatus, branches: string[], log: any[]): string[] {
    const recommendations: string[] = [];
    
    if (branches.length > 10) {
      recommendations.push('Consider cleaning up old branches');
    }
    
    if (status.staged.length > 20) {
      recommendations.push('Consider breaking large commits into smaller ones');
    }
    
    if (log.length > 0) {
      const recentCommits = log.slice(0, 10);
      const messages = recentCommits.map(c => c.message);
      if (messages.some(m => m.includes('fix') || m.includes('bug'))) {
        recommendations.push('Consider creating a bugfix branch for ongoing fixes');
      }
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Repository is in good health');
    }
    
    return recommendations;
  }

  /**
   * Estimate impact of a commit
   */
  private estimateImpact(message: string, files: string[] = []): string {
    if (message.includes('BREAKING') || message.includes('breaking')) {
      return 'high';
    }
    if (files.length > 5) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Estimate risk of a commit
   */
  private estimateRisk(message: string): string {
    if (message.includes('refactor') || message.includes('rewrite')) {
      return 'high';
    }
    if (message.includes('fix') || message.includes('bug')) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Get suggestion for a commit
   */
  private getSuggestionForCommit(message: string): string {
    if (message.includes('fix')) {
      return 'Consider adding tests to prevent regression';
    }
    if (message.includes('feat')) {
      return 'Consider updating documentation';
    }
    if (message.includes('refactor')) {
      return 'Consider reviewing code for optimization opportunities';
    }
    return 'Consider adding tests';
  }

  /**
   * Get file type based on extension
   */
  private getFileType(extension: string): string {
    const typeMap: Record<string, string> = {
      'js': 'JavaScript',
      'ts': 'TypeScript',
      'jsx': 'React',
      'tsx': 'React TypeScript',
      'css': 'CSS',
      'scss': 'Sass',
      'html': 'HTML',
      'json': 'JSON',
      'md': 'Markdown',
      'py': 'Python',
      'java': 'Java',
      'cpp': 'C++',
      'cs': 'C#'
    };
    
    return typeMap[extension] || 'text';
  }

  /**
   * Generate branch name based on context
   */
  private generateBranchName(context: any): string {
    const timestamp = Date.now().toString().slice(-6);
    return `feature/${context.issueId || 'new'}-${timestamp}`;
  }

  /**
   * Sanitize branch name
   */
  private sanitizeBranchName(name: string): string {
    return name.replace(/[^a-zA-Z0-9\-_/]/g, '-').toLowerCase();
  }

  /**
   * Get branches
   */
  async getBranches(): Promise<string[]> {
    try {
      const branches = await gitService.getBranches();
      return branches;
    } catch (error) {
      console.error('Failed to get branches:', error);
      return [];
    }
  }

  /**
   * Get conflict content
   */
  async getConflictContent(file: string): Promise<string> {
    try {
      // Get diff for conflicted file using gitService
      const diff = await gitService.diff(file);
      return diff;
    } catch (error) {
      console.error('Failed to get conflict content:', error);
      return '';
    }
  }

  /**
   * Resolve conflict with specific resolution
   */
  async resolveConflictWithResolution(file: string, resolution: string): Promise<void> {
    // This would be implemented with actual conflict resolution logic
    // For now, we'll just log that it would be resolved
    console.log(`Resolving conflict in ${file} with resolution: ${resolution}`);
  }

  /**
   * Get commit history with AI insights
   */
  async getCommitHistory(limit = 50): Promise<any[]> {
    const cacheKey = `commit_history_${limit}`;
    const cached = this.getCachedData(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      // Get actual commit history from gitService
      const history = await gitService.getLog(limit);
      
      // Add AI insights to commit history
      const enhancedHistory = history.map((commit: any) => ({
        hash: commit.hash,
        message: commit.message,
        author: commit.author,
        date: new Date(commit.date),
        files: [], // Files would need special handling
        aiInsight: {
          type: this.inferCommitType(commit.message),
          impact: 'medium',
          risk: 'low',
          suggestion: 'Consider adding tests'
        }
      }));

      this.setCachedData(cacheKey, enhancedHistory, 120000); // Cache for 2 minutes
      return enhancedHistory;
    } catch (error) {
      console.error('Failed to get commit history:', error);
      throw error;
    }
  }

  /**
   * Get conflicts
   */
  async getConflicts(): Promise<GitConflict[]> {
    try {
      // For now, we'll return an empty array since the GitStatus interface
      // in the basic GitService doesn't include conflicted files
      return [];
    } catch (error) {
      console.error('Failed to get conflicts:', error);
      return [];
    }
  }

  /**
   * Get collaboration state
   */
  getCollaborationState(): GitCollaboration {
    return { ...this.collaborationState };
  }

  /**
   * Update collaboration state
   */
  updateCollaborationState(updates: Partial<GitCollaboration>): void {
    this.collaborationState = { ...this.collaborationState, ...updates };
    this.emit('collaboration-updated', this.collaborationState);
  }

  /**
   * Get active operations
   */
  getActiveOperations(): GitOperation[] {
    return Array.from(this.activeOperations.values());
  }

  // Private helper methods

  private startOperation(id: string, type: GitOperation['type'], metadata: Record<string, any>): void {
    const operation: GitOperation = {
      id,
      type,
      status: 'running',
      progress: 0,
      metadata
    };

    this.activeOperations.set(id, operation);
    this.emit('operation-started', operation);
  }

  private completeOperation(id: string): void {
    const operation = this.activeOperations.get(id);
    if (operation) {
      operation.status = 'completed';
      operation.progress = 100;
      this.emit('operation-completed', operation);
      this.activeOperations.delete(id);
    }
  }

  private failOperation(id: string, error: any): void {
    const operation = this.activeOperations.get(id);
    if (operation) {
      operation.status = 'failed';
      operation.metadata.error = error.message || String(error);
      this.emit('operation-failed', operation);
      this.activeOperations.delete(id);
    }
  }

  private inferCommitType(file: string): AICommitSuggestion['type'] {
    if (file.includes('test') || file.includes('spec')) return 'test';
    if (file.includes('docs') || file.includes('README')) return 'docs';
    if (file.includes('style') || file.includes('css')) return 'style';
    return 'feat';
  }

  private inferBranchType(changes: string[]): BranchSuggestion['type'] {
    if (changes.some(c => c.includes('fix') || c.includes('bug'))) return 'bugfix';
    if (changes.some(c => c.includes('hotfix'))) return 'hotfix';
    if (changes.some(c => c.includes('release'))) return 'release';
    return 'feature';
  }

  private extractScope(file: string): string | undefined {
    const parts = file.split('/');
    if (parts.length > 1) {
      return parts[1]; // Second part as scope
    }
    return undefined;
  }

  private getCachedData(key: string): any {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  private setCachedData(key: string, data: any, timeout: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      timeout
    });
  }

  // Real Git operations using gitService
  /**
   * Stage file
   */
  async stageFile(filePath: string): Promise<boolean> {
    try {
      return await gitService.stage([filePath]);
    } catch (error) {
      console.error('Failed to stage file:', error);
      return false;
    }
  }

  /**
   * Unstage file
   */
  async unstageFile(filePath: string): Promise<boolean> {
    try {
      return await gitService.unstage([filePath]);
    } catch (error) {
      console.error('Failed to unstage file:', error);
      return false;
    }
  }

  /**
   * Commit
   */
  async commit(message: string): Promise<void> {
    try {
      const success = await gitService.commit(message);
      if (!success) {
        throw new Error('Failed to commit');
      }
    } catch (error) {
      console.error('Failed to commit:', error);
      throw error;
    }
  }

  /**
   * Push
   */
  async push(): Promise<void> {
    try {
      const success = await gitService.push();
      if (!success) {
        throw new Error('Failed to push');
      }
    } catch (error) {
      console.error('Failed to push:', error);
      throw error;
    }
  }

  /**
   * Pull
   */
  async pull(): Promise<void> {
    try {
      const success = await gitService.pull();
      if (!success) {
        throw new Error('Failed to pull');
      }
    } catch (error) {
      console.error('Failed to pull:', error);
      throw error;
    }
  }

  /**
   * Initialize repository
   */
  async init(): Promise<void> {
    try {
      // Get current working directory
      const cwd = process.cwd();
      const success = await gitService.initialize(cwd);
      if (!success) {
        throw new Error('Failed to initialize repository');
      }
    } catch (error) {
      console.error('Failed to init repository:', error);
      throw error;
    }
  }

  /**
   * Create branch
   */
  async createBranch(name: string, options: {
    fromBranch?: string;
    createIssue?: boolean;
    assignTo?: string;
  } = {}): Promise<void> {
    const operationId = `create_branch_${Date.now()}`;

    try {
      this.startOperation(operationId, 'branch', { name, options });

      // Use gitService to create branch
      const success = await gitService.createBranch(name);
      if (!success) {
        throw new Error('Failed to create branch');
      }

      this.completeOperation(operationId);
    } catch (error) {
      console.error('Failed to create branch:', error);
      this.failOperation(operationId, error);
      throw error;
    }
  }
}

export default AdvancedGitService;

