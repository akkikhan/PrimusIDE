import { EventEmitter } from 'events';
import { 
  BaseAIProvider, 
  OpenAIProvider, 
  ClaudeProvider, 
  OllamaProvider, 
  DeepSeekProvider,
  CompletionRequest,
  ChatRequest
} from './ai/providers';
import { AIConfigManager, AIProviderConfig } from './config/aiConfig';

export interface AIProvider {
  name: string;
  apiKey?: string;
  model: string;
  baseURL?: string;
  maxTokens: number;
  temperature: number;
}

export interface CodeContext {
  filePath: string;
  content: string;
  language: string;
  cursorPosition: { line: number; column: number };
  selection?: { start: { line: number; column: number }; end: { line: number; column: number } };
}

export interface AICompletion {
  id: string;
  text: string;
  confidence: number;
  type: 'inline' | 'multiline' | 'function' | 'class';
  range?: { start: { line: number; column: number }; end: { line: number; column: number } };
}

export interface AIChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  context?: CodeContext;
}

export interface AIAnalysis {
  issues: Array<{
    line: number;
    column: number;
    severity: 'error' | 'warning' | 'info';
    message: string;
    suggestion?: string;
    fixable: boolean;
  }>;
  complexity: number;
  maintainability: number;
  suggestions: string[];
  optimizations: string[];
}

export class AIAssistantService extends EventEmitter {
  private provider: AIProvider;
  private isConnected: boolean = false;
  private requestQueue: Array<() => Promise<void>> = [];
  private isProcessing: boolean = false;
  private chatHistory: AIChatMessage[] = [];
  private completionCache: Map<string, AICompletion[]> = new Map();
  private configManager: AIConfigManager;
  private aiProviders: Map<string, BaseAIProvider>;

  constructor(provider: AIProvider) {
    super();
    this.provider = provider;
    this.configManager = AIConfigManager.getInstance();
    this.aiProviders = new Map<string, BaseAIProvider>();
    this.initializeProviders();
  }

  private initializeProviders(): void {
    const config = this.configManager.getConfig();
    
    // Initialize all available AI providers
    if (config.providers.openai.enabled) {
      this.aiProviders.set('openai', new OpenAIProvider(config.providers.openai));
    }
    
    if (config.providers.claude.enabled) {
      this.aiProviders.set('claude', new ClaudeProvider(config.providers.claude));
    }
    
    if (config.providers.ollama.enabled) {
      this.aiProviders.set('ollama', new OllamaProvider(config.providers.ollama));
    }
    
    if (config.providers.deepseek.enabled) {
      this.aiProviders.set('deepseek', new DeepSeekProvider(config.providers.deepseek));
    }
  }

  public getActiveAIProvider(): BaseAIProvider | null {
    const config = this.configManager.getConfig();
    const provider = this.aiProviders.get(config.defaultProvider);
    return provider && provider.isConfigured() ? provider : null;
  }

  public switchProvider(providerId: string): boolean {
    const provider = this.aiProviders.get(providerId);
    if (provider && provider.isConfigured()) {
      this.configManager.setDefaultProvider(providerId);
      this.emit('providerSwitched', providerId);
      return true;
    }
    return false;
  }

  // Initialize AI connection
  async initialize(): Promise<void> {
    try {
      // Test connection with a simple request
      await this.testConnection();
      this.isConnected = true;
      this.emit('connected');
      
    } catch (error) {
      this.isConnected = false;
      this.emit('error', error);
      console.error('AI Assistant connection failed:', error);
      throw error;
    }
  }

  // Test AI service connection
  private async testConnection(): Promise<void> {
    if (this.provider.name === 'mock') {
      // Mock provider for development
      return Promise.resolve();
    }

    // For real providers, implement actual API test
    const response = await this.makeAPIRequest('/v1/models', 'GET');
    if (!response.ok) {
      throw new Error(`API test failed: ${response.statusText}`);
    }
  }

  // Get code completions
  async getCodeCompletion(context: CodeContext): Promise<AICompletion[]> {
    if (!this.isConnected) {
      throw new Error('AI Assistant not connected');
    }

    const cacheKey = this.getCacheKey(context);
    if (this.completionCache.has(cacheKey)) {
      return this.completionCache.get(cacheKey)!;
    }

    const completions = await this.requestCompletion(context);
    this.completionCache.set(cacheKey, completions);
    
    // Cleanup cache if it gets too large
    if (this.completionCache.size > 100) {
      const firstKey = this.completionCache.keys().next().value;
      if (firstKey) {
        this.completionCache.delete(firstKey);
      }
    }

    return completions;
  }

  // Generate code completions
  private async requestCompletion(context: CodeContext): Promise<AICompletion[]> {
    if (this.provider.name === 'mock') {
      return this.getMockCompletions(context);
    }

    const prompt = this.buildCompletionPrompt(context);
    
    try {
      const response = await this.makeAPIRequest('/v1/completions', 'POST', {
        model: this.provider.model,
        prompt: prompt,
        max_tokens: this.provider.maxTokens,
        temperature: this.provider.temperature,
        stop: ['\n\n', '```'],
      });

      const data = await response.json();
      return this.parseCompletionResponse(data);
    } catch (error) {
      console.error('Completion request failed:', error);
      return [];
    }
  }

  // Chat with AI assistant
  async chatWithAI(message: string, context?: CodeContext): Promise<AIChatMessage> {
    if (!this.isConnected) {
      throw new Error('AI Assistant not connected');
    }

    const userMessage: AIChatMessage = {
      id: this.generateId(),
      role: 'user',
      content: message,
      timestamp: Date.now(),
      context
    };

    this.chatHistory.push(userMessage);

    if (this.provider.name === 'mock') {
      const response = this.getMockChatResponse(message, context);
      this.chatHistory.push(response);
      return response;
    }

    try {
      const response = await this.makeAPIRequest('/v1/chat/completions', 'POST', {
        model: this.provider.model,
        messages: this.buildChatMessages(context),
        max_tokens: this.provider.maxTokens,
        temperature: this.provider.temperature,
      });

      const data = await response.json();
      const assistantMessage: AIChatMessage = {
        id: this.generateId(),
        role: 'assistant',
        content: data.choices[0].message.content,
        timestamp: Date.now()
      };

      this.chatHistory.push(assistantMessage);
      return assistantMessage;
    } catch (error) {
      console.error('Chat request failed:', error);
      throw error;
    }
  }

  // Analyze code quality
  async analyzeCode(context: CodeContext): Promise<AIAnalysis> {
    if (!this.isConnected) {
      throw new Error('AI Assistant not connected');
    }

    if (this.provider.name === 'mock') {
      return this.getMockAnalysis(context);
    }

    const prompt = this.buildAnalysisPrompt(context);

    try {
      const response = await this.makeAPIRequest('/v1/completions', 'POST', {
        model: this.provider.model,
        prompt: prompt,
        max_tokens: 1000,
        temperature: 0.1,
      });

      const data = await response.json();
      return this.parseAnalysisResponse(data.choices[0].text);
    } catch (error) {
      console.error('Analysis request failed:', error);
      throw error;
    }
  }

  // Generate code from description
  async generateCode(description: string, language: string): Promise<string> {
    if (!this.isConnected) {
      throw new Error('AI Assistant not connected');
    }

    if (this.provider.name === 'mock') {
      return this.getMockGeneration(description, language);
    }

    const prompt = `Generate ${language} code for: ${description}\n\nCode:\n`;

    try {
      const response = await this.makeAPIRequest('/v1/completions', 'POST', {
        model: this.provider.model,
        prompt: prompt,
        max_tokens: 500,
        temperature: 0.3,
      });

      const data = await response.json();
      return data.choices[0].text.trim();
    } catch (error) {
      console.error('Code generation failed:', error);
      throw error;
    }
  }

  // Helper methods
  private async makeAPIRequest(endpoint: string, method: string, body?: any): Promise<Response> {
    const url = `${this.provider.baseURL || 'https://api.openai.com'}${endpoint}`;
    
    return fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.provider.apiKey}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  private buildCompletionPrompt(context: CodeContext): string {
    return `Complete the following ${context.language} code:

File: ${context.filePath}

\`\`\`${context.language}
${context.content}
\`\`\`

Complete the code at line ${context.cursorPosition.line}, column ${context.cursorPosition.column}:`;
  }

  private buildAnalysisPrompt(context: CodeContext): string {
    return `Analyze the following ${context.language} code for issues, complexity, and suggestions:

\`\`\`${context.language}
${context.content}
\`\`\`

Provide analysis in JSON format with: issues, complexity (1-10), maintainability (1-10), suggestions, optimizations.`;
  }

  private buildChatMessages(context?: CodeContext): any[] {
    const messages = [
      {
        role: 'system',
        content: 'You are an expert programming assistant. Help with code analysis, debugging, and development questions.'
      }
    ];

    if (context) {
      messages.push({
        role: 'system',
        content: `Current file: ${context.filePath} (${context.language})\n\`\`\`${context.language}\n${context.content}\n\`\`\``
      });
    }

    // Add recent chat history
    const recentHistory = this.chatHistory.slice(-10);
    messages.push(...recentHistory.map(msg => ({
      role: msg.role,
      content: msg.content
    })));

    return messages;
  }

  private getCacheKey(context: CodeContext): string {
    const contentHash = this.simpleHash(context.content);
    return `${context.filePath}-${context.cursorPosition.line}-${context.cursorPosition.column}-${contentHash}`;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  // Mock implementations for development
  private getMockCompletions(context: CodeContext): AICompletion[] {
    const mockCompletions: AICompletion[] = [
      {
        id: this.generateId(),
        text: 'function calculateSum(a: number, b: number): number {\n  return a + b;\n}',
        confidence: 0.85,
        type: 'function'
      },
      {
        id: this.generateId(),
        text: 'const result = ',
        confidence: 0.72,
        type: 'inline'
      }
    ];

    return mockCompletions.filter(() => Math.random() > 0.5);
  }

  private getMockChatResponse(message: string, context?: CodeContext): AIChatMessage {
    const responses = [
      "I can help you with that! Let me analyze your code.",
      "Here's what I found in your code...",
      "This looks like a common pattern. You might want to consider...",
      "I notice a few potential improvements in this code.",
      "Based on the context, I'd suggest..."
    ];

    return {
      id: this.generateId(),
      role: 'assistant',
      content: responses[Math.floor(Math.random() * responses.length)],
      timestamp: Date.now()
    };
  }

  private getMockAnalysis(context: CodeContext): AIAnalysis {
    return {
      issues: [
        {
          line: 5,
          column: 10,
          severity: 'warning',
          message: 'Consider using const instead of let',
          suggestion: 'Use const for immutable values',
          fixable: true
        }
      ],
      complexity: 3,
      maintainability: 7,
      suggestions: [
        'Add error handling',
        'Consider extracting this into a separate function',
        'Add type annotations for better type safety'
      ],
      optimizations: [
        'Cache repeated calculations',
        'Use early returns to reduce nesting'
      ]
    };
  }

  private getMockGeneration(description: string, language: string): string {
    return `// Generated ${language} code for: ${description}
function generatedFunction() {
  // Implementation here
  return true;
}`;
  }

  private parseCompletionResponse(data: any): AICompletion[] {
    // Parse real API response format
    return data.choices?.map((choice: any, index: number) => ({
      id: this.generateId(),
      text: choice.text || choice.message?.content || '',
      confidence: Math.random() * 0.3 + 0.7, // Mock confidence
      type: 'inline' as const
    })) || [];
  }

  private parseAnalysisResponse(text: string): AIAnalysis {
    try {
      return JSON.parse(text);
    } catch {
      // Fallback to mock analysis if parsing fails
      return this.getMockAnalysis({} as CodeContext);
    }
  }

  // Public API methods
  updateProvider(provider: AIProvider): void {
    this.provider = provider;
    this.isConnected = false;
    this.completionCache.clear();
  }

  clearCache(): void {
    this.completionCache.clear();
  }

  getChatHistory(): AIChatMessage[] {
    return [...this.chatHistory];
  }

  clearChatHistory(): void {
    this.chatHistory = [];
  }

  isReady(): boolean {
    return this.isConnected;
  }

  getProvider(): AIProvider {
    return { ...this.provider };
  }
}

// Default provider for development
export const createDefaultAIProvider = (): AIProvider => ({
  name: 'mock',
  model: 'mock-model',
  maxTokens: 500,
  temperature: 0.7
});

export const aiAssistant = new AIAssistantService(createDefaultAIProvider());
