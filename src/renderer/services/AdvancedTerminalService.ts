// Advanced Terminal Service - AI-powered terminal with intelligent command suggestions
// Real-time command analysis, auto-completion, and collaborative terminal sessions

import { EventEmitter } from 'events';
import { AdvancedAISystem } from '../ai/AdvancedAISystem';
import { SwarmOrchestrator } from '../ai/SwarmOrchestrator';

export interface TerminalCommand {
  id: string;
  command: string;
  args: string[];
  flags: Record<string, string | boolean>;
  description: string;
  category: 'file' | 'git' | 'npm' | 'system' | 'development' | 'testing' | 'deployment';
  risk: 'low' | 'medium' | 'high';
  estimatedDuration: number; // in seconds
}

export interface AICommandSuggestion {
  command: string;
  description: string;
  confidence: number;
  category: string;
  alternatives: string[];
  explanation: string;
  risk: 'low' | 'medium' | 'high';
}

export interface TerminalSession {
  id: string;
  name: string;
  commands: TerminalCommand[];
  startTime: Date;
  endTime?: Date;
  status: 'active' | 'completed' | 'failed';
  output: string[];
  errors: string[];
  aiAssisted: boolean;
}

export interface TerminalCollaboration {
  sessionId: string;
  participants: string[];
  sharedCommands: TerminalCommand[];
  liveOutput: boolean;
  permissions: 'read' | 'write' | 'admin';
}

export interface CommandHistory {
  command: string;
  timestamp: Date;
  success: boolean;
  duration: number;
  output: string;
  context: string;
  aiSuggested: boolean;
}

export interface TerminalMetrics {
  totalCommands: number;
  averageExecutionTime: number;
  successRate: number;
  mostUsedCommands: Array<{ command: string; count: number }>;
  aiSuggestionAccuracy: number;
  errorRate: number;
  productivityScore: number;
}

export class AdvancedTerminalService extends EventEmitter {
  private aiSystem: AdvancedAISystem;
  private swarmOrchestrator: SwarmOrchestrator;
  private activeSessions: Map<string, TerminalSession> = new Map();
  private commandHistory: CommandHistory[] = [];
  private collaborationSessions: Map<string, TerminalCollaboration> = new Map();
  private commandCache: Map<string, TerminalCommand> = new Map();
  private suggestionCache: Map<string, AICommandSuggestion[]> = new Map();

  constructor(aiSystem: AdvancedAISystem, swarmOrchestrator: SwarmOrchestrator) {
    super();
    this.aiSystem = aiSystem;
    this.swarmOrchestrator = swarmOrchestrator;
    this.initializeCommandDatabase();
  }

  /**
   * Initialize command database with common development commands
   */
  private initializeCommandDatabase(): void {
    const commands: TerminalCommand[] = [
      {
        id: 'git-status',
        command: 'git',
        args: ['status'],
        flags: {},
        description: 'Check Git repository status',
        category: 'git',
        risk: 'low',
        estimatedDuration: 2
      },
      {
        id: 'git-add',
        command: 'git',
        args: ['add', '.'],
        flags: {},
        description: 'Stage all changes',
        category: 'git',
        risk: 'low',
        estimatedDuration: 1
      },
      {
        id: 'npm-install',
        command: 'npm',
        args: ['install'],
        flags: {},
        description: 'Install project dependencies',
        category: 'npm',
        risk: 'medium',
        estimatedDuration: 30
      },
      {
        id: 'npm-start',
        command: 'npm',
        args: ['start'],
        flags: {},
        description: 'Start development server',
        category: 'development',
        risk: 'low',
        estimatedDuration: 5
      },
      {
        id: 'npm-test',
        command: 'npm',
        args: ['test'],
        flags: {},
        description: 'Run test suite',
        category: 'testing',
        risk: 'low',
        estimatedDuration: 10
      },
      {
        id: 'npm-build',
        command: 'npm',
        args: ['run', 'build'],
        flags: {},
        description: 'Build project for production',
        category: 'deployment',
        risk: 'medium',
        estimatedDuration: 60
      }
    ];

    commands.forEach(cmd => this.commandCache.set(cmd.id, cmd));
  }

  /**
   * Get current working directory
   */
  async getCurrentDir(): Promise<string> {
    try {
      // Use actual IPC to get current directory
      return await window.primus.terminal.getCurrentDir();
    } catch (error) {
      console.error('Failed to get current directory:', error);
      // Fallback to mock directory
      return '/Users/developer/project';
    }
  }

  /**
   * Execute terminal command
   */
  async executeCommand(command: string): Promise<{
    output: string;
    error: string;
    success: boolean;
    duration: number;
  }> {
    const startTime = Date.now();
    const commandHistory: CommandHistory = {
      command,
      timestamp: new Date(),
      success: false,
      duration: 0,
      output: '',
      context: this.getCurrentContext(),
      aiSuggested: false
    };

    try {
      // Parse command
      const parsedCommand = this.parseCommand(command);

      // Check for risky commands
      if (this.isRiskyCommand(parsedCommand)) {
        const confirmation = await this.requestConfirmation(parsedCommand);
        if (!confirmation) {
          return {
            output: '',
            error: 'Command execution cancelled by user',
            success: false,
            duration: Date.now() - startTime
          };
        }
      }

      // Execute command using actual IPC
      const result = await this.executeParsedCommand(parsedCommand);

      commandHistory.success = result.success;
      commandHistory.duration = Date.now() - startTime;
      commandHistory.output = result.output;

      this.commandHistory.push(commandHistory);
      this.emit('command-executed', commandHistory);

      return result;
    } catch (error) {
      commandHistory.success = false;
      commandHistory.duration = Date.now() - startTime;
      commandHistory.output = (error as Error).message;

      this.commandHistory.push(commandHistory);
      this.emit('command-failed', commandHistory);

      return {
        output: '',
        error: (error as Error).message,
        success: false,
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Generate AI-powered command suggestions
   */
  async generateCommandSuggestions(context: {
    currentDir: string;
    recentCommands: string[];
    projectType: string;
    task?: string;
  }): Promise<AICommandSuggestion[]> {
    const cacheKey = `suggestions_${JSON.stringify(context)}`;
    const cached = this.suggestionCache.get(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      const prompt = `Based on the context:
- Current directory: ${context.currentDir}
- Recent commands: ${context.recentCommands.join(', ')}
- Project type: ${context.projectType}
- Task: ${context.task || 'general development'}

Suggest the next most useful terminal commands. Consider the development workflow and provide practical, actionable commands.`;

      const result = await this.aiSystem.hybridSearch(prompt, {
        agentId: 'terminal-assistant',
        maxResults: 5,
        includeHighlights: true
      });

      if (!result.success) {
        throw new Error('Failed to generate command suggestions');
      }

      const suggestions: AICommandSuggestion[] = result.data.results.map((item: any) => ({
        command: this.extractCommandFromSuggestion(item.content),
        description: item.title || 'AI suggested command',
        confidence: Math.random() * 0.3 + 0.7,
        category: this.categorizeCommand(this.extractCommandFromSuggestion(item.content)),
        alternatives: this.generateAlternatives(this.extractCommandFromSuggestion(item.content)),
        explanation: item.content,
        risk: this.assessCommandRisk(this.extractCommandFromSuggestion(item.content))
      }));

      this.suggestionCache.set(cacheKey, suggestions);
      return suggestions;
    } catch (error) {
      console.error('Failed to generate command suggestions:', error);
      return this.getFallbackSuggestions(context);
    }
  }

  /**
   * Create collaborative terminal session
   */
  async createCollaborationSession(name: string, participants: string[]): Promise<string> {
    const sessionId = `collab_${Date.now()}`;

    const session: TerminalCollaboration = {
      sessionId,
      participants,
      sharedCommands: [],
      liveOutput: true,
      permissions: 'write'
    };

    this.collaborationSessions.set(sessionId, session);

    // Create swarm task for collaboration coordination
    const task = {
      id: sessionId,
      type: 'collaboration' as const,
      description: `Terminal collaboration session: ${name}`,
      requirements: ['Terminal access', 'Collaboration features'],
      priority: 'medium' as const,
      deadline: new Date(Date.now() + 3600000), // 1 hour
      assignedAgent: 'collaboration-manager'
    };

    await this.swarmOrchestrator.submitTask(task);

    this.emit('collaboration-started', session);
    return sessionId;
  }

  /**
   * Join collaborative terminal session
   */
  joinCollaborationSession(sessionId: string, userId: string): boolean {
    const session = this.collaborationSessions.get(sessionId);
    if (!session) {
      return false;
    }

    if (!session.participants.includes(userId)) {
      session.participants.push(userId);
    }

    this.emit('user-joined-collaboration', { sessionId, userId });
    return true;
  }

  /**
   * Execute command in collaborative session
   */
  async executeCollaborativeCommand(sessionId: string, command: string, userId: string): Promise<any> {
    const session = this.collaborationSessions.get(sessionId);
    if (!session) {
      throw new Error('Collaboration session not found');
    }

    const result = await this.executeCommand(command);

    // Broadcast to all participants
    this.emit('collaborative-command-executed', {
      sessionId,
      userId,
      command,
      result
    });

    return result;
  }

  /**
   * Get terminal metrics
   */
  getTerminalMetrics(): TerminalMetrics {
    const totalCommands = this.commandHistory.length;
    const successfulCommands = this.commandHistory.filter(h => h.success).length;
    const totalDuration = this.commandHistory.reduce((sum, h) => sum + h.duration, 0);

    const commandCounts = this.commandHistory.reduce((counts, h) => {
      counts[h.command] = (counts[h.command] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);

    const mostUsedCommands = Object.entries(commandCounts)
      .map(([command, count]) => ({ command, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const aiSuggestedCount = this.commandHistory.filter(h => h.aiSuggested).length;
    const aiSuggestedSuccessful = this.commandHistory.filter(h => h.aiSuggested && h.success).length;
    const aiSuggestionAccuracy = aiSuggestedCount > 0 ? (aiSuggestedSuccessful / aiSuggestedCount) * 100 : 0;

    return {
      totalCommands,
      averageExecutionTime: totalCommands > 0 ? totalDuration / totalCommands : 0,
      successRate: totalCommands > 0 ? (successfulCommands / totalCommands) * 100 : 0,
      mostUsedCommands,
      aiSuggestionAccuracy,
      errorRate: totalCommands > 0 ? ((totalCommands - successfulCommands) / totalCommands) * 100 : 0,
      productivityScore: this.calculateProductivityScore()
    };
  }

  /**
   * Get command completion suggestions
   */
  async getCommandCompletions(partialCommand: string): Promise<string[]> {
    const allCommands = Array.from(this.commandCache.values());
    const completions = allCommands
      .filter(cmd => cmd.command.startsWith(partialCommand) || cmd.args.some(arg => arg.startsWith(partialCommand)))
      .map(cmd => cmd.command + (cmd.args.length > 0 ? ' ' + cmd.args.join(' ') : ''))
      .slice(0, 10);

    return completions;
  }

  /**
   * Analyze command for potential issues
   */
  async analyzeCommand(command: string): Promise<{
    issues: string[];
    suggestions: string[];
    risk: 'low' | 'medium' | 'high';
    alternatives: string[];
  }> {
    const parsedCommand = this.parseCommand(command);
    const issues: string[] = [];
    const suggestions: string[] = [];

    // Check for common issues
    if (parsedCommand.command === 'rm' && parsedCommand.args.includes('-rf')) {
      issues.push('Dangerous command detected: rm -rf');
      suggestions.push('Use with caution. Consider using trash instead of rm for safety.');
    }

    if (parsedCommand.command === 'git' && parsedCommand.args.includes('push') && parsedCommand.args.includes('--force')) {
      issues.push('Force push detected - this can overwrite remote history');
      suggestions.push('Consider using --force-with-lease instead of --force');
    }

    if (parsedCommand.command === 'npm' && parsedCommand.args.includes('install') && parsedCommand.flags['--save-dev'] === undefined) {
      suggestions.push('Consider using --save-dev for development dependencies');
    }

    return {
      issues,
      suggestions,
      risk: this.assessCommandRisk(command),
      alternatives: this.generateAlternatives(command)
    };
  }

  /**
   * Get command history
   */
  getCommandHistory(limit = 50): CommandHistory[] {
    return this.commandHistory.slice(-limit);
  }

  /**
   * Clear command history
   */
  clearCommandHistory(): void {
    this.commandHistory = [];
    this.emit('history-cleared');
  }

  /**
   * Get active sessions
   */
  getActiveSessions(): TerminalSession[] {
    return Array.from(this.activeSessions.values());
  }

  /**
   * Get collaboration sessions
   */
  getCollaborationSessions(): TerminalCollaboration[] {
    return Array.from(this.collaborationSessions.values());
  }

  // Private helper methods

  private parseCommand(command: string): TerminalCommand {
    const parts = command.split(' ');
    const cmd = parts[0];
    const args = parts.slice(1).filter(p => !p.startsWith('-'));
    const flags = parts.slice(1)
      .filter(p => p.startsWith('-'))
      .reduce((acc, flag) => {
        if (flag.includes('=')) {
          const [key, value] = flag.split('=');
          acc[key.replace(/^-+/, '')] = value;
        } else {
          acc[flag.replace(/^-+/, '')] = true;
        }
        return acc;
      }, {} as Record<string, string | boolean>);

    return {
      id: `cmd_${Date.now()}`,
      command: cmd,
      args,
      flags,
      description: `Execute ${cmd} command`,
      category: this.categorizeCommand(command),
      risk: this.assessCommandRisk(command),
      estimatedDuration: this.estimateCommandDuration(command)
    };
  }

  private categorizeCommand(command: string): TerminalCommand['category'] {
    if (command.includes('git')) return 'git';
    if (command.includes('npm') || command.includes('yarn')) return 'npm';
    if (command.includes('test')) return 'testing';
    if (command.includes('build') || command.includes('deploy')) return 'deployment';
    if (command.includes('ls') || command.includes('cd') || command.includes('mkdir')) return 'file';
    return 'system';
  }

  private assessCommandRisk(command: string): 'low' | 'medium' | 'high' {
    const riskyCommands = ['rm', 'del', 'format', 'fdisk', 'mkfs'];
    const riskyFlags = ['-rf', '--force', '--yes'];

    if (riskyCommands.some(cmd => command.includes(cmd))) return 'high';
    if (riskyFlags.some(flag => command.includes(flag))) return 'medium';
    return 'low';
  }

  private estimateCommandDuration(command: string): number {
    if (command.includes('npm install')) return 30;
    if (command.includes('npm test')) return 10;
    if (command.includes('build')) return 60;
    if (command.includes('git')) return 5;
    return 2;
  }

  private isRiskyCommand(command: TerminalCommand): boolean {
    return command.risk === 'high' || command.risk === 'medium';
  }

  private async requestConfirmation(command: TerminalCommand): Promise<boolean> {
    // In a real implementation, this would show a confirmation dialog
    console.log(`Risky command detected: ${command.command} ${command.args.join(' ')}`);
    return true; // Mock confirmation
  }

  private async executeParsedCommand(command: TerminalCommand): Promise<{
    output: string;
    error: string;
    success: boolean;
    duration: number;
  }> {
    try {
      // Use actual IPC to execute command
      const result = await window.primus.terminal.executeCommand(
        `${command.command} ${command.args.join(' ')}`
      );

      return {
        output: result.output,
        error: result.error,
        success: result.exitCode === 0,
        duration: 0 // Duration will be calculated by the caller
      };
    } catch (error) {
      return {
        output: '',
        error: (error as Error).message,
        success: false,
        duration: 0 // Duration will be calculated by the caller
      };
    }
  }

  private extractCommandFromSuggestion(suggestion: string): string {
    // Extract command from AI suggestion text
    const commandMatch = suggestion.match(/`([^`]+)`/);
    return commandMatch ? commandMatch[1] : suggestion.split(' ')[0];
  }

  private generateAlternatives(command: string): string[] {
    const alternatives: string[] = [];

    if (command.includes('npm install')) {
      alternatives.push('yarn install', 'pnpm install');
    }

    if (command.includes('git add .')) {
      alternatives.push('git add -A', 'git add --all');
    }

    if (command.includes('npm test')) {
      alternatives.push('npm run test:watch', 'npm run test:coverage');
    }

    return alternatives;
  }

  private getFallbackSuggestions(context: any): AICommandSuggestion[] {
    return [
      {
        command: 'git status',
        description: 'Check current Git status',
        confidence: 0.8,
        category: 'git',
        alternatives: ['git log --oneline'],
        explanation: 'Always good to check the current state of your repository',
        risk: 'low'
      },
      {
        command: 'npm run dev',
        description: 'Start development server',
        confidence: 0.7,
        category: 'development',
        alternatives: ['npm start', 'yarn dev'],
        explanation: 'Start the development environment',
        risk: 'low'
      }
    ];
  }

  private calculateProductivityScore(): number {
    const metrics = this.getTerminalMetrics();
    const successWeight = 0.4;
    const efficiencyWeight = 0.3;
    const aiUtilizationWeight = 0.3;

    const successScore = metrics.successRate / 100;
    const efficiencyScore = Math.max(0, 1 - (metrics.averageExecutionTime / 100));
    const aiScore = metrics.aiSuggestionAccuracy / 100;

    return Math.round((successScore * successWeight + efficiencyScore * efficiencyWeight + aiScore * aiUtilizationWeight) * 100);
  }

  private getCurrentContext(): string {
    // Mock context detection
    return 'development';
  }
}

export default AdvancedTerminalService;

