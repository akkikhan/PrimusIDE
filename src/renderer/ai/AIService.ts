import {
  Task,
  TaskResult,
  AIProvider,
  AgentContext,
  ProviderConfig,
  RateLimitConfig,
  CircuitBreakerConfig,
  CacheConfig,
  TelemetryEntry,
  ProviderStats
} from './types';
import { AIConfigManager } from './AIConfigManager';

/**
 * Enhanced AIService - Real AI provider integration with advanced features
 * Supports multiple providers with robust error handling and parallel execution
 */
export class AIService {
  private providers: Map<string, AIProvider> = new Map();
  private currentProvider: string = 'ollama'; // Default to local first
  private specialty: string = '';
  private capabilities: string[] = [];
  private agentId: string = '';

  // Enhanced rate limiting and API management
  private rateLimiters: Map<string, {
    lastCall: number;
    callCount: number;
    tokensUsed: number;
    quotaRemaining: number;
  }> = new Map();

  private readonly RATE_LIMIT_WINDOWS = {
    claude: { calls: 50, tokens: 100000, window: 60000 }, // 1 minute
    openai: { calls: 200, tokens: 500000, window: 60000 }, // 1 minute
    gemini: { calls: 60, tokens: 1000000, window: 60000 }, // 1 minute
    ollama: { calls: 1000, tokens: 10000000, window: 60000 } // 1 minute, very permissive for local
  };

  // Circuit breaker state
  private circuitBreakers: Map<string, {
    failures: number;
    lastFailure: number;
    state: 'closed' | 'open' | 'half-open';
    nextAttempt: number;
  }> = new Map();

  private readonly CIRCUIT_BREAKER_THRESHOLD = 5;
  private readonly CIRCUIT_BREAKER_TIMEOUT = 60000; // 1 minute
  private readonly CIRCUIT_BREAKER_HALF_OPEN_TIMEOUT = 30000; // 30 seconds

  // Request queue for parallel execution
  private requestQueue: Array<{
    id: string;
    provider: string;
    prompt: string;
    context?: AgentContext;
    resolve: (value: any) => void;
    reject: (error: any) => void;
    priority: number;
    timestamp: number;
  }> = [];

  private isProcessingQueue = false;
  private readonly MAX_CONCURRENT_REQUESTS = 3;

  // Caching system
  private responseCache: Map<string, {
    response: any;
    timestamp: number;
    accessCount: number;
  }> = new Map();

  private readonly CACHE_TTL = 300000; // 5 minutes
  private readonly MAX_CACHE_SIZE = 100;

  // Telemetry and logging
  private telemetry: Array<{
    timestamp: number;
    provider: string;
    operation: string;
    duration: number;
    success: boolean;
    error?: string;
    tokensUsed?: number;
    agentId?: string;
  }> = [];

  private readonly MAX_TELEMETRY_ENTRIES = 1000;

  constructor() {
    this.initializeProviders();
    this.startQueueProcessor();
  }

  /**
   * Initialize available AI providers with real configurations
   */
  private initializeProviders() {
    // Local provider (Ollama)
    this.providers.set('ollama', {
      name: 'Ollama',
      endpoint: 'http://localhost:11434/api/generate',
      requiresKey: false,
      freeTier: true,
      models: ['llama2', 'codellama', 'mistral', 'phi', 'gemma'],
      maxTokens: 4096,
      contextWindow: 4096
    });

    // Cloud providers
    this.providers.set('claude', {
      name: 'Claude',
      endpoint: 'https://api.anthropic.com/v1/messages',
      requiresKey: true,
      freeTier: true,
      models: ['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307', 'claude-3-opus-20240229'],
      maxTokens: 4096,
      contextWindow: 200000
    });

    this.providers.set('openai', {
      name: 'OpenAI',
      endpoint: 'https://api.openai.com/v1/chat/completions',
      requiresKey: true,
      freeTier: false,
      models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
      maxTokens: 4096,
      contextWindow: 128000
    });

    this.providers.set('gemini', {
      name: 'Gemini',
      endpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
      requiresKey: true,
      freeTier: true,
      models: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-pro'],
      maxTokens: 8192,
      contextWindow: 1000000
    });
  }

  /**
   * Initialize the service with agent-specific configuration
   */
  async initialize(config: {
    specialty: string;
    capabilities: string[];
    agentId: string;
    context?: AgentContext;
  }): Promise<void> {
    this.specialty = config.specialty;
    this.capabilities = config.capabilities;
    this.agentId = config.agentId;

    // Initialize rate limiters for all providers
    for (const [providerName] of Array.from(this.providers)) {
      this.initializeRateLimiter(providerName);
      this.initializeCircuitBreaker(providerName);
    }

    // Test providers in order of preference
    const availableProviders = await this.discoverAvailableProviders();

    if (availableProviders.length > 0) {
      this.currentProvider = availableProviders[0];
      this.log('info', `Initialized with provider: ${this.currentProvider}`, { agentId: this.agentId });
    } else {
      throw new Error('No AI providers available');
    }
  }

  /**
   * Execute a task with enhanced features
   */
  async executeTask(
    task: Task,
    options: {
      context?: AgentContext;
      priority?: number;
      useCache?: boolean;
    } = {}
  ): Promise<{ success: boolean; output: any; executionTime: number; confidence: number; metadata: any }> {
    const startTime = Date.now();
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Check cache first if enabled
      if (options.useCache !== false) {
        const cachedResponse = this.getCachedResponse(task, options.context);
        if (cachedResponse) {
          this.log('info', 'Cache hit', { requestId, agentId: this.agentId });
          return {
            success: true,
            output: cachedResponse,
            executionTime: Date.now() - startTime,
            confidence: 0.95,
            metadata: { cached: true, requestId }
          };
        }
      }

      // Create specialized prompt with agent context
      const prompt = this.createSpecializedPrompt(task, options.context);

      // Execute with fallback support
      const response = await this.executeWithFallback(prompt, {
        ...options,
        requestId,
        agentId: this.agentId
      });

      const executionTime = Date.now() - startTime;
      const confidence = this.calculateConfidence(response, task);

      // Cache successful responses
      if (options.useCache !== false && response) {
        this.cacheResponse(task, options.context, response);
      }

      // Update telemetry
      this.updateTelemetry(requestId, this.currentProvider, 'executeTask', executionTime, true);

      return {
        success: true,
        output: response,
        executionTime,
        confidence,
        metadata: {
          requestId,
          provider: this.currentProvider,
          tokensUsed: this.estimateTokens(prompt),
          agentId: this.agentId
        }
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.updateTelemetry(requestId, this.currentProvider, 'executeTask', executionTime, false, (error as Error).message);

      return {
        success: false,
        output: null,
        executionTime,
        confidence: 0,
        metadata: {
          requestId,
          provider: this.currentProvider,
          error: (error as Error).message,
          agentId: this.agentId
        }
      };
    }
  }

  /**
   * Execute multiple tasks in parallel with resource management
   */
  async executeMultipleTasks(
    tasks: Array<{ task: Task; context?: AgentContext; priority?: number }>,
    options: { maxConcurrency?: number; timeout?: number } = {}
  ): Promise<Array<{ success: boolean; output: any; executionTime: number; confidence: number; metadata: any }>> {
    const maxConcurrency = options.maxConcurrency || this.MAX_CONCURRENT_REQUESTS;
    const results: Array<{ success: boolean; output: any; executionTime: number; confidence: number; metadata: any }> = [];

    // Sort tasks by priority
    const sortedTasks = tasks.sort((a, b) => (b.priority || 0) - (a.priority || 0));

    // Process tasks in batches
    for (let i = 0; i < sortedTasks.length; i += maxConcurrency) {
      const batch = sortedTasks.slice(i, i + maxConcurrency);
      const batchPromises = batch.map(taskConfig =>
        this.executeTask(taskConfig.task, {
          context: taskConfig.context,
          priority: taskConfig.priority,
          useCache: false // Disable cache for parallel execution
        })
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Execute with automatic fallback to other providers
   */
  private async executeWithFallback(
    prompt: string,
    options: { requestId: string; agentId: string }
  ): Promise<any> {
    const providers = await this.getAvailableProviders();

    for (const providerName of providers) {
      try {
        // Check circuit breaker
        if (this.isCircuitOpen(providerName)) {
          this.log('warn', `Circuit breaker open for ${providerName}, skipping`, { requestId: options.requestId });
          continue;
        }

        // Check rate limits
        if (!this.checkRateLimit(providerName)) {
          this.log('warn', `Rate limit exceeded for ${providerName}, trying next`, { requestId: options.requestId });
          continue;
        }

        const response = await this.callProvider(providerName, prompt, options);

        // Update rate limiter
        this.updateRateLimiter(providerName, this.estimateTokens(prompt));

        return response;
      } catch (error) {
        this.log('error', `Provider ${providerName} failed`, {
          requestId: options.requestId,
          error: (error as any).message
        });

        // Update circuit breaker
        this.recordFailure(providerName);

        // Try next provider
        continue;
      }
    }

    throw new Error('All AI providers failed or are unavailable');
  }

  /**
   * Call specific AI provider with real implementation
   */
  private async callProvider(providerName: string, prompt: string, options: { requestId: string; agentId: string }): Promise<any> {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`Provider ${providerName} not found`);
    }

    switch (providerName) {
      case 'ollama':
        return this.callOllama(prompt, options);
      case 'claude':
        return this.callClaude(prompt, options);
      case 'openai':
        return this.callOpenAI(prompt, options);
      case 'gemini':
        return this.callGemini(prompt, options);
      default:
        throw new Error(`Unsupported provider: ${providerName}`);
    }
  }

  /**
   * Real Ollama implementation
   */
  private async callOllama(prompt: string, options: { requestId: string; agentId: string }): Promise<any> {
    const provider = this.providers.get('ollama')!;

    try {
      const response = await fetch(provider.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'codellama', // Default model, could be configurable
          prompt: prompt,
          stream: false,
          options: {
            temperature: 0.7,
            top_p: 0.9,
            max_tokens: provider.maxTokens
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      return result.response;
    } catch (error) {
      if ((error as Error).message.includes('fetch')) {
        throw new Error('Ollama service not available (is it running on localhost:11434?)');
      }
      throw error;
    }
  }

  /**
   * Real Claude implementation
   */
  private async callClaude(prompt: string, options: { requestId: string; agentId: string }): Promise<any> {
    const config = this.getProviderConfig('claude');
    if (!config?.apiKey) {
      throw new Error('Claude API key not configured');
    }

    const provider = this.providers.get('claude')!;

    try {
      const response = await fetch(provider.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: config.model || 'claude-3-5-sonnet-20241022',
          max_tokens: config.maxTokens || provider.maxTokens,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          system: `You are an AI agent specializing in ${this.specialty} with capabilities in ${this.capabilities.join(', ')}.`
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Claude API error: ${response.status} ${errorData.error?.message || response.statusText}`);
      }

      const result = await response.json();
      return result.content[0].text;
    } catch (error) {
      if ((error as Error).message.includes('fetch')) {
        throw new Error('Claude API service unavailable');
      }
      throw error;
    }
  }

  /**
   * Real OpenAI implementation
   */
  private async callOpenAI(prompt: string, options: { requestId: string; agentId: string }): Promise<any> {
    const config = this.getProviderConfig('openai');
    if (!config?.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const provider = this.providers.get('openai')!;

    try {
      const response = await fetch(provider.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
          model: config.model || 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are an AI agent specializing in ${this.specialty} with capabilities in ${this.capabilities.join(', ')}.`
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: config.maxTokens || provider.maxTokens,
          temperature: 0.7,
          top_p: 0.9
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`OpenAI API error: ${response.status} ${errorData.error?.message || response.statusText}`);
      }

      const result = await response.json();
      return result.choices[0].message.content;
    } catch (error) {
      if ((error as Error).message.includes('fetch')) {
        throw new Error('OpenAI API service unavailable');
      }
      throw error;
    }
  }

  /**
   * Real Gemini implementation
   */
  private async callGemini(prompt: string, options: { requestId: string; agentId: string }): Promise<any> {
    const config = this.getProviderConfig('gemini');
    if (!config?.apiKey) {
      throw new Error('Gemini API key not configured');
    }

    const provider = this.providers.get('gemini')!;

    try {
      const response = await fetch(`${provider.endpoint}/${config.model || 'gemini-1.5-flash'}:generateContent?key=${config.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `You are an AI agent specializing in ${this.specialty} with capabilities in ${this.capabilities.join(', ')}.\n\n${prompt}`
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            topP: 0.9,
            maxOutputTokens: config.maxTokens || provider.maxTokens,
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Gemini API error: ${response.status} ${errorData.error?.message || response.statusText}`);
      }

      const result = await response.json();
      return result.candidates[0].content.parts[0].text;
    } catch (error) {
      if ((error as Error).message.includes('fetch')) {
        throw new Error('Gemini API service unavailable');
      }
      throw error;
    }
  }

  /**
   * Enhanced rate limiting with quota management
   */
  private checkRateLimit(providerName: string): boolean {
    const limiter = this.rateLimiters.get(providerName);
    const limits = this.RATE_LIMIT_WINDOWS[providerName as keyof typeof this.RATE_LIMIT_WINDOWS];

    if (!limiter || !limits) return true;

    const now = Date.now();
    const windowStart = now - limits.window;

    // Reset if window has passed
    if (limiter.lastCall < windowStart) {
      limiter.callCount = 0;
      limiter.tokensUsed = 0;
      limiter.quotaRemaining = limits.tokens;
    }

    return limiter.callCount < limits.calls && limiter.quotaRemaining > 0;
  }

  /**
   * Update rate limiter after successful call
   */
  private updateRateLimiter(providerName: string, tokensUsed: number): void {
    const limiter = this.rateLimiters.get(providerName);
    const limits = this.RATE_LIMIT_WINDOWS[providerName as keyof typeof this.RATE_LIMIT_WINDOWS];

    if (limiter && limits) {
      limiter.callCount++;
      limiter.tokensUsed += tokensUsed;
      limiter.quotaRemaining = Math.max(0, limits.tokens - limiter.tokensUsed);
      limiter.lastCall = Date.now();
    }
  }

  /**
   * Circuit breaker implementation
   */
  private isCircuitOpen(providerName: string): boolean {
    const breaker = this.circuitBreakers.get(providerName);
    if (!breaker) return false;

    const now = Date.now();

    switch (breaker.state) {
      case 'open':
        if (now >= breaker.nextAttempt) {
          breaker.state = 'half-open';
          return false;
        }
        return true;
      case 'half-open':
        return false;
      default:
        return false;
    }
  }

  /**
   * Record failure for circuit breaker
   */
  private recordFailure(providerName: string): void {
    const breaker = this.circuitBreakers.get(providerName);
    if (!breaker) return;

    breaker.failures++;
    breaker.lastFailure = Date.now();

    if (breaker.failures >= this.CIRCUIT_BREAKER_THRESHOLD) {
      breaker.state = 'open';
      breaker.nextAttempt = Date.now() + this.CIRCUIT_BREAKER_TIMEOUT;
    }
  }

  /**
   * Record success for circuit breaker
   */
  private recordSuccess(providerName: string): void {
    const breaker = this.circuitBreakers.get(providerName);
    if (!breaker) return;

    breaker.failures = 0;
    breaker.state = 'closed';
  }

  /**
   * Enhanced caching system
   */
  private getCachedResponse(task: Task, context?: AgentContext): any {
    const cacheKey = this.generateCacheKey(task, context);

    const cached = this.responseCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
      cached.accessCount++;
      return cached.response;
    }

    if (cached) {
      this.responseCache.delete(cacheKey);
    }

    return null;
  }

  /**
   * Cache response
   */
  private cacheResponse(task: Task, context: AgentContext | undefined, response: any): void {
    const cacheKey = this.generateCacheKey(task, context);

    // Manage cache size
    if (this.responseCache.size >= this.MAX_CACHE_SIZE) {
      const oldestKey = Array.from(this.responseCache.entries())
        .sort(([,a], [,b]) => a.timestamp - b.timestamp)[0][0];
      this.responseCache.delete(oldestKey);
    }

    this.responseCache.set(cacheKey, {
      response,
      timestamp: Date.now(),
      accessCount: 1
    });
  }

  /**
   * Generate cache key
   */
  private generateCacheKey(task: Task, context?: AgentContext): string {
    const contextStr = context ? JSON.stringify(context) : '';
    return `cache_${this.agentId}_${task.description}_${contextStr}`.replace(/\s+/g, '_');
  }

  /**
   * Enhanced logging and telemetry
   */
  private log(level: 'info' | 'warn' | 'error', message: string, data?: any): void {
    const logEntry = {
      timestamp: Date.now(),
      level,
      message,
      agentId: this.agentId,
      ...data
    };

    console[level](`[AIService:${this.agentId}] ${message}`, data);

    // Store in telemetry
    this.telemetry.push({
      timestamp: logEntry.timestamp,
      provider: data?.provider || this.currentProvider,
      operation: data?.operation || 'unknown',
      duration: data?.duration || 0,
      success: level !== 'error',
      error: level === 'error' ? message : undefined,
      tokensUsed: data?.tokensUsed,
      agentId: this.agentId
    });

    // Manage telemetry size
    if (this.telemetry.length > this.MAX_TELEMETRY_ENTRIES) {
      this.telemetry = this.telemetry.slice(-this.MAX_TELEMETRY_ENTRIES);
    }
  }

  /**
   * Update telemetry
   */
  private updateTelemetry(
    requestId: string,
    provider: string,
    operation: string,
    duration: number,
    success: boolean,
    error?: string,
    tokensUsed?: number
  ): void {
    this.telemetry.push({
      timestamp: Date.now(),
      provider,
      operation,
      duration,
      success,
      error,
      tokensUsed,
      agentId: this.agentId
    });
  }

  /**
   * Get telemetry data
   */
  getTelemetry(): any[] {
    return [...this.telemetry];
  }

  /**
   * Get provider statistics
   */
  getProviderStats(): any {
    const stats: any = {};

    for (const [providerName] of Array.from(this.providers.entries())) {
      const limiter = this.rateLimiters.get(providerName);
      const breaker = this.circuitBreakers.get(providerName);

      stats[providerName] = {
        rateLimiter: limiter ? {
          callsInWindow: limiter.callCount,
          tokensUsed: limiter.tokensUsed,
          quotaRemaining: limiter.quotaRemaining
        } : null,
        circuitBreaker: breaker ? {
          state: breaker.state,
          failures: breaker.failures,
          nextAttempt: breaker.nextAttempt
        } : null
      };
    }

    return stats;
  }

  /**
   * Helper methods
   */
  private initializeRateLimiter(providerName: string): void {
    const limits = this.RATE_LIMIT_WINDOWS[providerName as keyof typeof this.RATE_LIMIT_WINDOWS];
    if (limits) {
      this.rateLimiters.set(providerName, {
        lastCall: 0,
        callCount: 0,
        tokensUsed: 0,
        quotaRemaining: limits.tokens
      });
    }
  }

  private initializeCircuitBreaker(providerName: string): void {
    this.circuitBreakers.set(providerName, {
      failures: 0,
      lastFailure: 0,
      state: 'closed',
      nextAttempt: 0
    });
  }

  private async discoverAvailableProviders(): Promise<string[]> {
    const available: string[] = [];

    for (const [providerName] of Array.from(this.providers)) {
      if (await this.testProvider(providerName)) {
        available.push(providerName);
      }
    }

    // Sort by preference: local first, then free tier, then paid
    return available.sort((a, b) => {
      const order = { ollama: 0, claude: 1, gemini: 2, openai: 3 };
      return (order[a as keyof typeof order] || 999) - (order[b as keyof typeof order] || 999);
    });
  }

  private async testProvider(providerName: string): Promise<boolean> {
    try {
      const provider = this.providers.get(providerName);
      if (!provider) return false;

      if (providerName === 'ollama') {
        const response = await fetch('http://localhost:11434/api/tags');
        return response.ok;
      }

      // For cloud providers, check if API key is available
      if (provider.requiresKey) {
        const config = this.getProviderConfig(providerName);
        return !!(config && config.apiKey);
      }

      return true;
    } catch {
      return false;
    }
  }

  private getProviderConfig(providerName: string): any {
    const config = AIConfigManager.getServiceConfig();
    switch (providerName) {
      case 'claude':
        return config.claude || null;
      case 'openai':
        return config.openai || null;
      case 'gemini':
        return config.gemini || null;
      case 'azure':
        return config.azure || null;
      default:
        return null;
    }
  }

  private async getAvailableProviders(): Promise<string[]> {
    const available: string[] = [];

    for (const [providerName] of Array.from(this.providers)) {
      if (this.checkRateLimit(providerName) && !this.isCircuitOpen(providerName)) {
        available.push(providerName);
      }
    }

    return available;
  }

  private createSpecializedPrompt(task: Task, context?: AgentContext): string {
    const capabilityContext = this.capabilities.join(', ');
    const specialtyContext = this.specialty;

    let prompt = `
You are an AI agent specializing in ${specialtyContext} with capabilities in ${capabilityContext}.

Task: ${task.description}
Requirements: ${task.requirements.join(', ')}

Please provide a detailed, actionable response that demonstrates your expertise in this area.`;

    if (context) {
      prompt += `\n\nAdditional Context:\n${JSON.stringify(context, null, 2)}`;
    }

    return prompt;
  }

  private calculateConfidence(response: any, task: Task): number {
    if (!response) return 0;
    let confidence = 0.5; // Base confidence

    // Length-based confidence
    if (typeof response === 'string') {
      const length = response.length;
      if (length > 1000) confidence += 0.2;
      else if (length > 500) confidence += 0.15;
      else if (length > 200) confidence += 0.1;
    }

    // Task complexity-based adjustment
    if (task.requirements.length > 5) confidence += 0.1;
    if (task.priority === 'critical') confidence += 0.1;

    // Agent capability match
    const matchingCapabilities = task.requirements.filter((req: string) =>
      this.capabilities.some(cap => cap.toLowerCase().includes(req.toLowerCase()))
    ).length;
    confidence += (matchingCapabilities / task.requirements.length) * 0.2;

    return Math.min(confidence, 1.0);
  }

  private estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  /**
   * Queue processor for parallel execution
   */
  private startQueueProcessor(): void {
    setInterval(() => {
      this.processQueue();
    }, 100); // Process queue every 100ms
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    try {
      const activeRequests = this.requestQueue
        .sort((a, b) => b.priority - a.priority)
        .slice(0, this.MAX_CONCURRENT_REQUESTS);

      const promises = activeRequests.map(async (request) => {
        try {
          const response = await this.executeWithFallback(request.prompt, {
            requestId: request.id,
            agentId: this.agentId
          });

          request.resolve(response);
        } catch (error) {
          request.reject(error);
        } finally {
          this.requestQueue = this.requestQueue.filter(r => r.id !== request.id);
        }
      });

      await Promise.allSettled(promises);
    } finally {
      this.isProcessingQueue = false;
    }
  }
}