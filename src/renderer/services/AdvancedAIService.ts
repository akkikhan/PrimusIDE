// Advanced AI Assistant Service - Intelligent code generation, documentation, and debugging
// Integrates multiple AI models for comprehensive development assistance

import { EventEmitter } from 'events';

export interface AIModelConfig {
  name: string;
  provider: 'openai' | 'anthropic' | 'local' | 'huggingface';
  model: string;
  apiKey?: string;
  baseUrl?: string;
  maxTokens: number;
  temperature: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

export interface CodeContext {
  currentFile: string;
  language: string;
  selectedCode: string;
  cursorPosition: { line: number; column: number };
  projectStructure: string[];
  importStatements: string[];
  nearbyFunctions: string[];
  fileContent: string;
  workspaceContext: string;
}

export interface AIRequest {
  id: string;
  type: 'completion' | 'explanation' | 'documentation' | 'debugging' | 'refactor' | 'chat' | 'review';
  context: CodeContext;
  prompt: string;
  model?: string;
  parameters?: Partial<AIModelConfig>;
  timestamp: number;
  userId: string;
}

export interface AIResponse {
  id: string;
  requestId: string;
  type: AIRequest['type'];
  content: string;
  suggestions?: CodeSuggestion[];
  metadata: {
    model: string;
    tokensUsed: number;
    processingTime: number;
    confidence: number;
    language?: string;
  };
  timestamp: number;
}

export interface CodeSuggestion {
  id: string;
  type: 'completion' | 'fix' | 'improvement' | 'alternative';
  title: string;
  description: string;
  code: string;
  startLine: number;
  endLine: number;
  confidence: number;
  category: 'syntax' | 'logic' | 'performance' | 'style' | 'security' | 'best-practice';
  priority: 'low' | 'medium' | 'high' | 'critical';
  tags: string[];
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  context?: Partial<CodeContext>;
  attachments?: ConversationAttachment[];
}

export interface ConversationAttachment {
  type: 'code' | 'file' | 'error' | 'documentation';
  content: string;
  metadata: Record<string, any>;
}

export interface AICapabilities {
  codeGeneration: boolean;
  codeExplanation: boolean;
  debugging: boolean;
  documentation: boolean;
  refactoring: boolean;
  codeReview: boolean;
  chatAssistance: boolean;
  multiLanguage: boolean;
  contextAwareness: boolean;
  realTimeAssistance: boolean;
}

export class AdvancedAIService extends EventEmitter {
  private models: Map<string, AIModelConfig> = new Map();
  private activeRequests: Map<string, AIRequest> = new Map();
  private conversationHistory: Map<string, ConversationMessage[]> = new Map();
  private responseCache: Map<string, AIResponse> = new Map();
  private defaultModel: string = 'gpt-4';
  private rateLimiter: Map<string, number[]> = new Map();
  private capabilities: AICapabilities;

  constructor() {
    super();
    
    this.capabilities = {
      codeGeneration: true,
      codeExplanation: true,
      debugging: true,
      documentation: true,
      refactoring: true,
      codeReview: true,
      chatAssistance: true,
      multiLanguage: true,
      contextAwareness: true,
      realTimeAssistance: true
    };

    this.initializeDefaultModels();
    this.setupRateLimiting();
  }

  /**
   * Initialize default AI models
   */
  private initializeDefaultModels(): void {
    // OpenAI Models
    this.addModel({
      name: 'gpt-4',
      provider: 'openai',
      model: 'gpt-4',
      maxTokens: 8192,
      temperature: 0.1,
      topP: 0.95,
      frequencyPenalty: 0.0,
      presencePenalty: 0.0
    });

    this.addModel({
      name: 'gpt-4-turbo',
      provider: 'openai',
      model: 'gpt-4-1106-preview',
      maxTokens: 4096,
      temperature: 0.1,
      topP: 0.95
    });

    this.addModel({
      name: 'gpt-3.5-turbo',
      provider: 'openai',
      model: 'gpt-3.5-turbo',
      maxTokens: 4096,
      temperature: 0.1,
      topP: 0.95
    });

    // Anthropic Models
    this.addModel({
      name: 'claude-3-opus',
      provider: 'anthropic',
      model: 'claude-3-opus-20240229',
      maxTokens: 4096,
      temperature: 0.1
    });

    this.addModel({
      name: 'claude-3-sonnet',
      provider: 'anthropic',
      model: 'claude-3-sonnet-20240229',
      maxTokens: 4096,
      temperature: 0.1
    });

    // Local/Offline Model
    this.addModel({
      name: 'codellama',
      provider: 'local',
      model: 'codellama:13b-instruct',
      baseUrl: 'http://localhost:11434',
      maxTokens: 2048,
      temperature: 0.1
    });
  }

  /**
   * Add AI model configuration
   */
  addModel(config: AIModelConfig): void {
    this.models.set(config.name, config);
    console.log(`🤖 Added AI model: ${config.name} (${config.provider})`);
  }

  /**
   * Set API key for a model provider
   */
  setApiKey(provider: string, apiKey: string): void {
    for (const [name, config] of this.models.entries()) {
      if (config.provider === provider) {
        config.apiKey = apiKey;
        this.models.set(name, config);
      }
    }
  }

  /**
   * Generate code completion
   */
  async generateCompletion(context: CodeContext, prompt?: string, model?: string): Promise<AIResponse> {
    const request: AIRequest = {
      id: this.generateRequestId(),
      type: 'completion',
      context,
      prompt: prompt || this.buildCompletionPrompt(context),
      model: model || this.defaultModel,
      timestamp: Date.now(),
      userId: 'system'
    };

    return this.processRequest(request);
  }

  /**
   * Explain code functionality
   */
  async explainCode(context: CodeContext, specificQuestion?: string): Promise<AIResponse> {
    const request: AIRequest = {
      id: this.generateRequestId(),
      type: 'explanation',
      context,
      prompt: this.buildExplanationPrompt(context, specificQuestion),
      model: this.defaultModel,
      timestamp: Date.now(),
      userId: 'system'
    };

    return this.processRequest(request);
  }

  /**
   * Generate documentation
   */
  async generateDocumentation(context: CodeContext, style: 'jsdoc' | 'typescript' | 'python' | 'markdown' = 'jsdoc'): Promise<AIResponse> {
    const request: AIRequest = {
      id: this.generateRequestId(),
      type: 'documentation',
      context,
      prompt: this.buildDocumentationPrompt(context, style),
      model: this.defaultModel,
      timestamp: Date.now(),
      userId: 'system'
    };

    return this.processRequest(request);
  }

  /**
   * Debug code and suggest fixes
   */
  async debugCode(context: CodeContext, errorMessage?: string, stackTrace?: string): Promise<AIResponse> {
    const request: AIRequest = {
      id: this.generateRequestId(),
      type: 'debugging',
      context,
      prompt: this.buildDebuggingPrompt(context, errorMessage, stackTrace),
      model: this.defaultModel,
      timestamp: Date.now(),
      userId: 'system'
    };

    return this.processRequest(request);
  }

  /**
   * Refactor code
   */
  async refactorCode(
    context: CodeContext, 
    refactorType: 'optimize' | 'clean' | 'modernize' | 'extract' | 'rename' = 'optimize'
  ): Promise<AIResponse> {
    const request: AIRequest = {
      id: this.generateRequestId(),
      type: 'refactor',
      context,
      prompt: this.buildRefactorPrompt(context, refactorType),
      model: this.defaultModel,
      timestamp: Date.now(),
      userId: 'system'
    };

    return this.processRequest(request);
  }

  /**
   * Review code quality
   */
  async reviewCode(context: CodeContext, focus?: 'security' | 'performance' | 'maintainability' | 'all'): Promise<AIResponse> {
    const request: AIRequest = {
      id: this.generateRequestId(),
      type: 'review',
      context,
      prompt: this.buildReviewPrompt(context, focus),
      model: this.defaultModel,
      timestamp: Date.now(),
      userId: 'system'
    };

    return this.processRequest(request);
  }

  /**
   * Chat with AI assistant
   */
  async chat(
    message: string, 
    conversationId: string, 
    context?: Partial<CodeContext>,
    attachments?: ConversationAttachment[]
  ): Promise<AIResponse> {
    const conversation = this.getConversation(conversationId);
    
    // Add user message to conversation
    const userMessage: ConversationMessage = {
      id: this.generateMessageId(),
      role: 'user',
      content: message,
      timestamp: Date.now(),
      context,
      attachments
    };
    
    conversation.push(userMessage);
    this.conversationHistory.set(conversationId, conversation);

    const request: AIRequest = {
      id: this.generateRequestId(),
      type: 'chat',
      context: context as CodeContext || {} as CodeContext,
      prompt: this.buildChatPrompt(conversation, context),
      model: this.defaultModel,
      timestamp: Date.now(),
      userId: 'system'
    };

    const response = await this.processRequest(request);
    
    // Add assistant response to conversation
    const assistantMessage: ConversationMessage = {
      id: this.generateMessageId(),
      role: 'assistant',
      content: response.content,
      timestamp: Date.now(),
      context
    };
    
    conversation.push(assistantMessage);
    this.conversationHistory.set(conversationId, conversation);

    return response;
  }

  /**
   * Get code suggestions based on context
   */
  async getCodeSuggestions(context: CodeContext, count: number = 5): Promise<CodeSuggestion[]> {
    const response = await this.generateCompletion(context);
    return this.parseCodeSuggestions(response.content, context, count);
  }

  /**
   * Process AI request
   */
  private async processRequest(request: AIRequest): Promise<AIResponse> {
    try {
      // Check rate limiting
      if (!this.checkRateLimit(request.userId)) {
        throw new Error('Rate limit exceeded');
      }

      // Check cache
      const cacheKey = this.getCacheKey(request);
      const cachedResponse = this.responseCache.get(cacheKey);
      if (cachedResponse) {
        
        return cachedResponse;
      }

      // Add to active requests
      this.activeRequests.set(request.id, request);
      this.emit('request-started', request);

      const startTime = Date.now();
      const modelConfig = this.models.get(request.model || this.defaultModel);
      
      if (!modelConfig) {
        throw new Error(`Model ${request.model} not found`);
      }

      // Make API request based on provider
      let responseContent: string;
      let tokensUsed = 0;

      switch (modelConfig.provider) {
        case 'openai':
          ({ content: responseContent, tokensUsed } = await this.callOpenAI(request, modelConfig));
          break;
        case 'anthropic':
          ({ content: responseContent, tokensUsed } = await this.callAnthropic(request, modelConfig));
          break;
        case 'local':
          ({ content: responseContent, tokensUsed } = await this.callLocalModel(request, modelConfig));
          break;
        case 'huggingface':
          ({ content: responseContent, tokensUsed } = await this.callHuggingFace(request, modelConfig));
          break;
        default:
          throw new Error(`Unsupported provider: ${modelConfig.provider}`);
      }

      const processingTime = Date.now() - startTime;
      const confidence = this.calculateConfidence(responseContent, request.type);

      const response: AIResponse = {
        id: this.generateResponseId(),
        requestId: request.id,
        type: request.type,
        content: responseContent.trim(),
        suggestions: request.type === 'completion' ? this.parseCodeSuggestions(responseContent, request.context) : undefined,
        metadata: {
          model: modelConfig.name,
          tokensUsed,
          processingTime,
          confidence,
          language: request.context.language
        },
        timestamp: Date.now()
      };

      // Cache response
      this.responseCache.set(cacheKey, response);

      // Clean up
      this.activeRequests.delete(request.id);
      this.emit('request-completed', request, response);

      return response;

    } catch (error) {
      this.activeRequests.delete(request.id);
      this.emit('request-error', request, error);
      console.error(`❌ AI request failed:`, error);
      throw error;
    }
  }

  /**
   * Call OpenAI API
   */
  private async callOpenAI(request: AIRequest, config: AIModelConfig): Promise<{ content: string; tokensUsed: number }> {
    if (!config.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const messages = this.buildOpenAIMessages(request);
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        max_tokens: config.maxTokens,
        temperature: config.temperature,
        top_p: config.topP,
        frequency_penalty: config.frequencyPenalty,
        presence_penalty: config.presencePenalty
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${error}`);
    }

    const data = await response.json();
    return {
      content: data.choices[0].message.content,
      tokensUsed: data.usage.total_tokens
    };
  }

  /**
   * Call Anthropic API
   */
  private async callAnthropic(request: AIRequest, config: AIModelConfig): Promise<{ content: string; tokensUsed: number }> {
    if (!config.apiKey) {
      throw new Error('Anthropic API key not configured');
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: config.maxTokens,
        temperature: config.temperature,
        messages: [{
          role: 'user',
          content: request.prompt
        }]
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${error}`);
    }

    const data = await response.json();
    return {
      content: data.content[0].text,
      tokensUsed: data.usage.input_tokens + data.usage.output_tokens
    };
  }

  /**
   * Call local model (Ollama)
   */
  private async callLocalModel(request: AIRequest, config: AIModelConfig): Promise<{ content: string; tokensUsed: number }> {
    const baseUrl = config.baseUrl || 'http://localhost:11434';
    
    const response = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: config.model,
        prompt: request.prompt,
        options: {
          temperature: config.temperature,
          num_ctx: config.maxTokens
        },
        stream: false
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Local model API error: ${error}`);
    }

    const data = await response.json();
    return {
      content: data.response,
      tokensUsed: data.eval_count || 0
    };
  }

  /**
   * Call Hugging Face API
   */
  private async callHuggingFace(request: AIRequest, config: AIModelConfig): Promise<{ content: string; tokensUsed: number }> {
    if (!config.apiKey) {
      throw new Error('Hugging Face API key not configured');
    }

    const response = await fetch(`https://api-inference.huggingface.co/models/${config.model}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: request.prompt,
        parameters: {
          max_new_tokens: config.maxTokens,
          temperature: config.temperature,
          top_p: config.topP
        }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Hugging Face API error: ${error}`);
    }

    const data = await response.json();
    const content = Array.isArray(data) ? data[0]?.generated_text || '' : data.generated_text || '';
    
    return {
      content: content.replace(request.prompt, '').trim(),
      tokensUsed: content.length / 4 // Rough estimation
    };
  }

  /**
   * Build prompt for code completion
   */
  private buildCompletionPrompt(context: CodeContext): string {
    return `You are an advanced code completion assistant. Generate intelligent code completions based on the context.

File: ${context.currentFile}
Language: ${context.language}
Current code:
\`\`\`${context.language}
${context.fileContent}
\`\`\`

Selected code (if any):
\`\`\`${context.language}
${context.selectedCode || 'None'}
\`\`\`

Cursor position: Line ${context.cursorPosition.line}, Column ${context.cursorPosition.column}

Project structure:
${context.projectStructure.join('\n')}

Nearby functions:
${context.nearbyFunctions.join('\n')}

Please provide intelligent code completion suggestions that:
1. Are syntactically correct for ${context.language}
2. Follow best practices and conventions
3. Consider the existing code context
4. Are relevant to the cursor position
5. Include appropriate error handling if needed

Provide only the code completion without explanations.`;
  }

  /**
   * Build prompt for code explanation
   */
  private buildExplanationPrompt(context: CodeContext, question?: string): string {
    const basePrompt = `Explain the following ${context.language} code in detail:

\`\`\`${context.language}
${context.selectedCode || context.fileContent}
\`\`\`

Please provide:
1. A high-level overview of what the code does
2. Explanation of key components and their roles
3. Any notable patterns, algorithms, or techniques used
4. Potential improvements or considerations`;

    return question ? `${basePrompt}\n\nSpecific question: ${question}` : basePrompt;
  }

  /**
   * Build prompt for documentation generation
   */
  private buildDocumentationPrompt(context: CodeContext, style: string): string {
    return `Generate comprehensive ${style} documentation for this ${context.language} code:

\`\`\`${context.language}
${context.selectedCode || context.fileContent}
\`\`\`

Include:
1. Function/class descriptions
2. Parameter descriptions with types
3. Return value descriptions
4. Usage examples
5. Any important notes or warnings

Format the documentation according to ${style} standards.`;
  }

  /**
   * Build prompt for debugging
   */
  private buildDebuggingPrompt(context: CodeContext, errorMessage?: string, stackTrace?: string): string {
    let prompt = `Debug the following ${context.language} code and suggest fixes:

\`\`\`${context.language}
${context.selectedCode || context.fileContent}
\`\`\``;

    if (errorMessage) {
      prompt += `\n\nError message: ${errorMessage}`;
    }

    if (stackTrace) {
      prompt += `\n\nStack trace:\n${stackTrace}`;
    }

    prompt += `\n\nPlease:
1. Identify the issue(s) in the code
2. Explain why the error is occurring
3. Provide a corrected version of the code
4. Suggest additional improvements or best practices`;

    return prompt;
  }

  /**
   * Build prompt for refactoring
   */
  private buildRefactorPrompt(context: CodeContext, refactorType: string): string {
    const typeDescriptions = {
      optimize: 'performance and efficiency',
      clean: 'readability and maintainability',
      modernize: 'modern language features and patterns',
      extract: 'extracting reusable components',
      rename: 'better naming conventions'
    };

    return `Refactor the following ${context.language} code focusing on ${typeDescriptions[refactorType as keyof typeof typeDescriptions] || refactorType}:

\`\`\`${context.language}
${context.selectedCode || context.fileContent}
\`\`\`

Please provide:
1. Refactored code with improvements
2. Explanation of changes made
3. Benefits of the refactoring
4. Any additional recommendations`;
  }

  /**
   * Build prompt for code review
   */
  private buildReviewPrompt(context: CodeContext, focus?: string): string {
    let prompt = `Perform a comprehensive code review of this ${context.language} code:

\`\`\`${context.language}
${context.selectedCode || context.fileContent}
\`\`\``;

    if (focus) {
      prompt += `\n\nFocus particularly on: ${focus}`;
    }

    prompt += `\n\nProvide feedback on:
1. Code quality and best practices
2. Performance considerations
3. Security vulnerabilities
4. Maintainability and readability
5. Testing considerations
6. Specific suggestions for improvement`;

    return prompt;
  }

  /**
   * Build prompt for chat conversation
   */
  private buildChatPrompt(conversation: ConversationMessage[], context?: Partial<CodeContext>): string {
    let prompt = `You are an advanced AI coding assistant. Help the user with their development questions and tasks.

Context:`;

    if (context?.currentFile) {
      prompt += `\nCurrent file: ${context.currentFile}`;
    }
    if (context?.language) {
      prompt += `\nLanguage: ${context.language}`;
    }

    prompt += `\n\nConversation history:\n`;
    
    conversation.slice(-10).forEach(msg => {
      prompt += `${msg.role}: ${msg.content}\n`;
    });

    return prompt;
  }

  /**
   * Build OpenAI messages format
   */
  private buildOpenAIMessages(request: AIRequest): any[] {
    const systemMessage = {
      role: 'system',
      content: `You are an advanced AI coding assistant specialized in ${request.context.language || 'software development'}. You provide accurate, helpful, and contextually relevant assistance with coding tasks.`
    };

    const userMessage = {
      role: 'user',
      content: request.prompt
    };

    return [systemMessage, userMessage];
  }

  /**
   * Parse code suggestions from AI response
   */
  private parseCodeSuggestions(content: string, context: CodeContext, count: number = 5): CodeSuggestion[] {
    const suggestions: CodeSuggestion[] = [];
    
    // This is a simplified parser - in production, you'd want more sophisticated parsing
    const codeBlocks = content.match(/```[\s\S]*?```/g) || [];
    
    codeBlocks.slice(0, count).forEach((block, index) => {
      const code = block.replace(/```\w*\n?/g, '').replace(/```$/g, '').trim();
      
      suggestions.push({
        id: `suggestion-${Date.now()}-${index}`,
        type: 'completion',
        title: `Code Suggestion ${index + 1}`,
        description: 'AI-generated code completion',
        code,
        startLine: context.cursorPosition.line,
        endLine: context.cursorPosition.line,
        confidence: 0.8,
        category: 'logic',
        priority: 'medium',
        tags: [context.language, 'ai-generated']
      });
    });

    return suggestions;
  }

  /**
   * Get conversation history
   */
  private getConversation(conversationId: string): ConversationMessage[] {
    return this.conversationHistory.get(conversationId) || [];
  }

  /**
   * Setup rate limiting
   */
  private setupRateLimiting(): void {
    // Clean up rate limiting records every minute
    setInterval(() => {
      const now = Date.now();
      for (const [userId, timestamps] of this.rateLimiter.entries()) {
        const filtered = timestamps.filter(time => now - time < 60000); // Last minute
        if (filtered.length === 0) {
          this.rateLimiter.delete(userId);
        } else {
          this.rateLimiter.set(userId, filtered);
        }
      }
    }, 60000);
  }

  /**
   * Check rate limiting
   */
  private checkRateLimit(userId: string, maxRequests: number = 60): boolean {
    const now = Date.now();
    const userRequests = this.rateLimiter.get(userId) || [];
    const recentRequests = userRequests.filter(time => now - time < 60000);
    
    if (recentRequests.length >= maxRequests) {
      return false;
    }
    
    recentRequests.push(now);
    this.rateLimiter.set(userId, recentRequests);
    return true;
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(content: string, type: string): number {
    let confidence = 0.7; // Base confidence
    
    // Adjust based on response length
    if (content.length > 100) confidence += 0.1;
    if (content.length > 500) confidence += 0.1;
    
    // Adjust based on type
    const typeConfidence = {
      completion: 0.8,
      explanation: 0.9,
      documentation: 0.85,
      debugging: 0.75,
      refactor: 0.8,
      review: 0.85,
      chat: 0.7
    };
    
    confidence = Math.max(confidence, typeConfidence[type as keyof typeof typeConfidence] || 0.7);
    
    return Math.min(confidence, 1.0);
  }

  /**
   * Generate cache key
   */
  private getCacheKey(request: AIRequest): string {
    const contextHash = this.hashString(JSON.stringify({
      selectedCode: request.context.selectedCode,
      language: request.context.language,
      prompt: request.prompt.substring(0, 200) // First 200 chars
    }));
    
    return `${request.type}-${request.model}-${contextHash}`;
  }

  /**
   * Hash string for caching
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique response ID
   */
  private generateResponseId(): string {
    return `res-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get AI capabilities
   */
  getCapabilities(): AICapabilities {
    return { ...this.capabilities };
  }

  /**
   * Get available models
   */
  getModels(): AIModelConfig[] {
    return Array.from(this.models.values());
  }

  /**
   * Set default model
   */
  setDefaultModel(modelName: string): void {
    if (this.models.has(modelName)) {
      this.defaultModel = modelName;
    } else {
      throw new Error(`Model ${modelName} not found`);
    }
  }

  /**
   * Clear conversation history
   */
  clearConversation(conversationId: string): void {
    this.conversationHistory.delete(conversationId);
  }

  /**
   * Get active request count
   */
  getActiveRequestCount(): number {
    return this.activeRequests.size;
  }

  /**
   * Cancel active request
   */
  cancelRequest(requestId: string): void {
    this.activeRequests.delete(requestId);
    this.emit('request-cancelled', requestId);
  }

  /**
   * Clear response cache
   */
  clearCache(): void {
    this.responseCache.clear();
  }

  /**
   * Get service statistics
   */
  getStatistics(): {
    totalRequests: number;
    activeRequests: number;
    cachedResponses: number;
    conversationCount: number;
  } {
    return {
      totalRequests: this.listenerCount('request-completed'),
      activeRequests: this.activeRequests.size,
      cachedResponses: this.responseCache.size,
      conversationCount: this.conversationHistory.size
    };
  }
}

export default AdvancedAIService;
