import { AIService } from '../ai/AIService';
import { Task, AgentContext } from '../ai/types';
import { ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../../shared/ipcChannels';

export interface AIAssistantContext {
  filePath?: string;
  language?: string;
  selection?: string;
  cursorPosition?: { line: number; column: number };
  workspacePath?: string;
  gitBranch?: string;
  recentFiles?: string[];
}

export interface AIAssistantRequest {
  prompt: string;
  context: AIAssistantContext;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AIAssistantResponse {
  content: string;
  suggestions?: string[];
  explanations?: string[];
  codeBlocks?: Array<{
    language: string;
    code: string;
    description?: string;
  }>;
}

export interface AIAssistantCommand {
  id: string;
  name: string;
  description: string;
  icon?: string;
  category: string;
  handler: (context: AIAssistantContext) => Promise<AIAssistantResponse>;
}

export class AdvancedAIAssistant {
  private aiService: AIService;
  private commands: Map<string, AIAssistantCommand> = new Map();
  private isStreaming: boolean = false;

  constructor() {
    // Initialize with a new AIService instance
    this.aiService = new AIService();
    
    // Register built-in commands
    this.registerBuiltInCommands();
  }

  /**
   * Initialize the AI assistant with agent-specific configuration
   */
  async initialize(config: {
    specialty: string;
    capabilities: string[];
    agentId: string;
    context?: AgentContext;
  }): Promise<void> {
    await this.aiService.initialize(config);
  }

  /**
   * Register a command with the AI assistant
   */
  registerCommand(command: AIAssistantCommand): void {
    this.commands.set(command.id, command);
  }

  /**
   * Execute a command
   */
  async executeCommand(commandId: string, context: AIAssistantContext): Promise<AIAssistantResponse> {
    const command = this.commands.get(commandId);
    if (!command) {
      throw new Error(`Command ${commandId} not found`);
    }
    
    return await command.handler(context);
  }

  /**
   * Send a request to the AI assistant
   */
  async sendRequest(request: AIAssistantRequest): Promise<AIAssistantResponse> {
    try {
      // Build context-aware prompt
      const fullPrompt = this.buildContextualPrompt(request);
      
      // Create a task for the AI service
      const task: Task = {
        id: `task_${Date.now()}`,
        description: fullPrompt,
        requirements: [],
        priority: 'medium'
      };
      
      // Execute task with the AI service
      const result = await this.aiService.executeTask(task);
      
      // Parse and format response
      return this.parseResponse(result.output);
    } catch (error) {
      console.error('Error sending AI request:', error);
      throw error;
    }
  }

  /**
   * Get all registered commands
   */
  getCommands(): AIAssistantCommand[] {
    return Array.from(this.commands.values());
  }

  /**
   * Get command by ID
   */
  getCommand(commandId: string): AIAssistantCommand | undefined {
    return this.commands.get(commandId);
  }

  /**
   * Build a contextual prompt for the AI
   */
  private buildContextualPrompt(request: AIAssistantRequest): string {
    let prompt = request.prompt;
    
    // Add context information if available
    if (request.context) {
      prompt = `Context:\n${this.formatContext(request.context)}\n\nTask:\n${prompt}`;
    }
    
    return prompt;
  }

  /**
   * Format context information
   */
  private formatContext(context: AIAssistantContext): string {
    const lines: string[] = [];
    
    if (context.filePath) {
      lines.push(`File: ${context.filePath}`);
    }
    
    if (context.language) {
      lines.push(`Language: ${context.language}`);
    }
    
    if (context.cursorPosition) {
      lines.push(`Position: Line ${context.cursorPosition.line}, Column ${context.cursorPosition.column}`);
    }
    
    if (context.selection) {
      lines.push(`Selected code:\n\`\`\`\n${context.selection}\n\`\`\``);
    }
    
    if (context.gitBranch) {
      lines.push(`Git branch: ${context.gitBranch}`);
    }
    
    if (context.recentFiles && context.recentFiles.length > 0) {
      lines.push(`Recent files: ${context.recentFiles.join(', ')}`);
    }
    
    return lines.join('\n');
  }

  /**
   * Parse and format AI response
   */
  private parseResponse(response: any): AIAssistantResponse {
    // For now, we'll return a simple response
    // In a real implementation, we would parse the response for:
    // - Code blocks with language information
    // - Suggestions
    // - Explanations
    // - Structured data
    
    if (typeof response === 'string') {
      return {
        content: response,
        suggestions: [],
        explanations: [],
        codeBlocks: []
      };
    }
    
    return {
      content: JSON.stringify(response),
      suggestions: [],
      explanations: [],
      codeBlocks: []
    };
  }

  /**
   * Register built-in commands
   */
  private registerBuiltInCommands(): void {
    // Code explanation command
    this.registerCommand({
      id: 'explain-code',
      name: 'Explain Code',
      description: 'Get an explanation of selected code',
      category: 'Analysis',
      handler: async (context) => {
        const prompt = `Explain the following code in simple terms:
\`\`\`${context.language || 'text'}
${context.selection || 'No code selected'}
\`\`\``;
        
        const response = await this.sendRequest({
          prompt,
          context
        });
        
        return response;
      }
    });
    
    // Code refactoring command
    this.registerCommand({
      id: 'refactor-code',
      name: 'Refactor Code',
      description: 'Suggest improvements to selected code',
      category: 'Refactoring',
      handler: async (context) => {
        const prompt = `Refactor the following code to improve readability, performance, and maintainability:
\`\`\`${context.language || 'text'}
${context.selection || 'No code selected'}
\`\`\``;
        
        const response = await this.sendRequest({
          prompt,
          context
        });
        
        return response;
      }
    });
    
    // Bug detection command
    this.registerCommand({
      id: 'detect-bugs',
      name: 'Detect Bugs',
      description: 'Identify potential bugs in selected code',
      category: 'Analysis',
      handler: async (context) => {
        const prompt = `Analyze the following code and identify any potential bugs, security issues, or anti-patterns:
\`\`\`${context.language || 'text'}
${context.selection || 'No code selected'}
\`\`\``;
        
        const response = await this.sendRequest({
          prompt,
          context
        });
        
        return response;
      }
    });
    
    // Test generation command
    this.registerCommand({
      id: 'generate-tests',
      name: 'Generate Tests',
      description: 'Generate unit tests for selected code',
      category: 'Testing',
      handler: async (context) => {
        const prompt = `Generate comprehensive unit tests for the following code:
\`\`\`${context.language || 'text'}
${context.selection || 'No code selected'}
\`\`\``;
        
        const response = await this.sendRequest({
          prompt,
          context
        });
        
        return response;
      }
    });
    
    // Documentation generation command
    this.registerCommand({
      id: 'generate-docs',
      name: 'Generate Documentation',
      description: 'Generate documentation for selected code',
      category: 'Documentation',
      handler: async (context) => {
        const prompt = `Generate clear and concise documentation for the following code:
\`\`\`${context.language || 'text'}
${context.selection || 'No code selected'}
\`\`\``;
        
        const response = await this.sendRequest({
          prompt,
          context
        });
        
        return response;
      }
    });
  }
}

// Export a singleton instance
export const advancedAIAssistant = new AdvancedAIAssistant();