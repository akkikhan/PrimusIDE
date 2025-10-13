import {
  AgentContext,
  Task,
  TaskResult,
  LearningEvent,
  MemoryStats,
  PerformanceMetric
} from './types';

/**
 * Agent-specific context with isolation and security
 */
export interface IsolatedAgentContext {
  // Unique agent identifier
  agentId: string;

  // Agent specialization and capabilities
  specialty: string;
  capabilities: string[];

  // Memory and learning state
  memory: AgentMemoryContext;
  learning: AgentLearningContext;

  // Current execution state
  currentTasks: Task[];
  activeTask?: Task;
  executionHistory: TaskResult[];

  // Environment and project context
  environment: AgentEnvironmentContext;

  // Security and isolation
  security: AgentSecurityContext;

  // Performance and metrics
  metrics: AgentMetricsContext;

  // Communication channels
  communication: AgentCommunicationContext;
}

/**
 * Agent memory context with isolation
 */
export interface AgentMemoryContext {
  // Short-term memory for current session
  shortTerm: Map<string, any>;

  // Long-term memory for persistent knowledge
  longTerm: Map<string, any>;

  // Task-specific memory
  taskMemory: Map<string, any>;

  // Shared memory for inter-agent communication
  sharedMemory: Map<string, any>;

  // Memory statistics
  stats: MemoryStats;

  // Memory management
  maxShortTermSize: number;
  maxLongTermSize: number;
  cleanupThreshold: number;
}

/**
 * Agent learning context
 */
export interface AgentLearningContext {
  // Learning history and patterns
  learningHistory: LearningEvent[];

  // Success and failure patterns
  successPatterns: Map<string, any>;
  failurePatterns: Map<string, any>;

  // Adaptation rules
  adaptationRules: Map<string, any>;

  // Performance baselines
  performanceBaselines: Map<string, PerformanceMetric>;

  // Learning statistics
  learningRate: number;
  adaptationRate: number;
  improvementRate: number;
}

/**
 * Agent environment context
 */
export interface AgentEnvironmentContext {
  // Project information
  projectPath?: string;
  projectType?: string;
  projectStructure?: any;

  // File context
  openFiles: string[];
  recentFiles: string[];
  fileContext: Map<string, any>;

  // Dependencies and libraries
  dependencies: string[];
  devDependencies: string[];
  availableLibraries: Map<string, any>;

  // System information
  systemInfo: {
    platform: string;
    arch: string;
    nodeVersion?: string;
    availableMemory: number;
    cpuCount: number;
  };
}

/**
 * Agent security context
 */
export interface AgentSecurityContext {
  // Access control
  allowedPaths: string[];
  restrictedPaths: string[];
  allowedOperations: string[];
  restrictedOperations: string[];

  // API access
  allowedAPIs: string[];
  apiRateLimits: Map<string, number>;

  // Data protection
  sensitiveDataPatterns: RegExp[];
  encryptionEnabled: boolean;

  // Isolation level
  isolationLevel: 'none' | 'process' | 'memory' | 'full';
}

/**
 * Agent metrics context
 */
export interface AgentMetricsContext {
  // Performance metrics
  performance: Map<string, PerformanceMetric>;

  // Resource usage
  resourceUsage: {
    memoryUsage: number;
    cpuUsage: number;
    networkUsage: number;
    diskUsage: number;
  };

  // Task metrics
  taskMetrics: {
    totalTasks: number;
    successfulTasks: number;
    failedTasks: number;
    averageExecutionTime: number;
    averageConfidence: number;
  };

  // Learning metrics
  learningMetrics: {
    learningEvents: number;
    adaptationEvents: number;
    improvementRate: number;
    knowledgeGrowth: number;
  };
}

/**
 * Agent communication context
 */
export interface AgentCommunicationContext {
  // Communication channels
  channels: Map<string, CommunicationChannel>;

  // Message queues
  messageQueues: Map<string, any[]>;

  // Communication history
  communicationHistory: CommunicationEvent[];

  // Communication settings
  settings: {
    maxMessageSize: number;
    messageTimeout: number;
    encryptionEnabled: boolean;
    compressionEnabled: boolean;
  };
}

/**
 * Communication channel interface
 */
export interface CommunicationChannel {
  id: string;
  name: string;
  type: 'broadcast' | 'direct' | 'group';
  participants: string[];
  encrypted: boolean;
  maxParticipants?: number;
}

/**
 * Communication event
 */
export interface CommunicationEvent {
  id: string;
  timestamp: number;
  fromAgent: string;
  toAgent?: string;
  channel: string;
  type: 'message' | 'task' | 'result' | 'notification';
  data: any;
  encrypted: boolean;
}

/**
 * Context isolation levels
 */
export enum ContextIsolationLevel {
  NONE = 'none',           // No isolation - full sharing
  PROCESS = 'process',     // Process-level isolation
  MEMORY = 'memory',       // Memory space isolation
  FULL = 'full'           // Complete isolation
}

/**
 * Context sharing policies
 */
export enum ContextSharingPolicy {
  PRIVATE = 'private',     // No sharing allowed
  RESTRICTED = 'restricted', // Limited sharing with approval
  CONTROLLED = 'controlled', // Controlled sharing with rules
  OPEN = 'open'           // Full sharing allowed
}

/**
 * Agent Context Manager with isolation and security
 */
export class AgentContextManager {
  private static instance: AgentContextManager;
  private contexts: Map<string, IsolatedAgentContext> = new Map();
  private globalContext: Map<string, any> = new Map();

  // Security settings
  private defaultIsolationLevel: ContextIsolationLevel = ContextIsolationLevel.MEMORY;
  private defaultSharingPolicy: ContextSharingPolicy = ContextSharingPolicy.CONTROLLED;

  // Context lifecycle management
  private contextLifecycles: Map<string, ContextLifecycle> = new Map();

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): AgentContextManager {
    if (!AgentContextManager.instance) {
      AgentContextManager.instance = new AgentContextManager();
    }
    return AgentContextManager.instance;
  }

  /**
   * Create a new isolated context for an agent
   */
  async createAgentContext(
    agentId: string,
    baseContext: Partial<AgentContext>,
    options: {
      isolationLevel?: ContextIsolationLevel;
      sharingPolicy?: ContextSharingPolicy;
      memoryLimit?: number;
      enableEncryption?: boolean;
    } = {}
  ): Promise<IsolatedAgentContext> {
    const isolationLevel = options.isolationLevel || this.defaultIsolationLevel;
    const sharingPolicy = options.sharingPolicy || this.defaultSharingPolicy;

    // Create isolated memory spaces
    const memoryContext = this.createMemoryContext(options.memoryLimit || 1000);
    const learningContext = this.createLearningContext();
    const environmentContext = this.createEnvironmentContext(baseContext.environment);
    const securityContext = this.createSecurityContext(isolationLevel, sharingPolicy, options.enableEncryption);
    const metricsContext = this.createMetricsContext();
    const communicationContext = this.createCommunicationContext(agentId);

    const isolatedContext: IsolatedAgentContext = {
      agentId,
      specialty: baseContext.specialty || '',
      capabilities: baseContext.capabilities || [],
      memory: memoryContext,
      learning: learningContext,
      currentTasks: [],
      executionHistory: [],
      environment: environmentContext,
      security: securityContext,
      metrics: metricsContext,
      communication: communicationContext
    };

    // Set up context lifecycle
    const lifecycle = new ContextLifecycle(isolatedContext, isolationLevel);
    this.contextLifecycles.set(agentId, lifecycle);

    // Store the context
    this.contexts.set(agentId, isolatedContext);

    return isolatedContext;
  }

  /**
   * Get an agent's isolated context
   */
  getAgentContext(agentId: string): IsolatedAgentContext | null {
    return this.contexts.get(agentId) || null;
  }

  /**
   * Update an agent's context
   */
  async updateAgentContext(
    agentId: string,
    updates: Partial<IsolatedAgentContext>
  ): Promise<void> {
    const context = this.contexts.get(agentId);
    if (!context) {
      throw new Error(`Agent context not found: ${agentId}`);
    }

    // Validate updates against security policy
    this.validateContextUpdate(context, updates);

    // Apply updates
    Object.assign(context, updates);

    // Update lifecycle
    const lifecycle = this.contextLifecycles.get(agentId);
    if (lifecycle) {
      lifecycle.updateTimestamp();
    }
  }

  /**
   * Share context between agents with security checks
   */
  async shareContext(
    fromAgentId: string,
    toAgentId: string,
    contextKey: string,
    data: any,
    options: {
      encrypted?: boolean;
      ttl?: number;
      accessLevel?: 'read' | 'write' | 'admin';
    } = {}
  ): Promise<boolean> {
    const fromContext = this.contexts.get(fromAgentId);
    const toContext = this.contexts.get(toAgentId);

    if (!fromContext || !toContext) {
      throw new Error('Agent context not found');
    }

    // Check sharing policy
    if (!this.canShareContext(fromContext, toContext, contextKey)) {
      return false;
    }

    // Validate data against security constraints
    if (!this.validateSharedData(fromContext, data)) {
      return false;
    }

    // Share the data
    const sharedData = {
      data,
      fromAgent: fromAgentId,
      timestamp: Date.now(),
      ttl: options.ttl,
      accessLevel: options.accessLevel || 'read',
      encrypted: options.encrypted || false
    };

    // Store in recipient's shared memory
    toContext.memory.sharedMemory.set(contextKey, sharedData);

    // Record the sharing event
    this.recordSharingEvent(fromAgentId, toAgentId, contextKey, options);

    return true;
  }

  /**
   * Execute a task with isolated context
   */
  async executeWithContext<T>(
    agentId: string,
    task: Task,
    executor: (context: IsolatedAgentContext) => Promise<T>
  ): Promise<T> {
    const context = this.contexts.get(agentId);
    if (!context) {
      throw new Error(`Agent context not found: ${agentId}`);
    }

    // Set active task
    context.activeTask = task;
    context.currentTasks.push(task);

    try {
      // Execute with isolated context
      const result = await executor(context);

      // Record successful execution
      this.recordTaskExecution(context, task, result, true);

      return result;
    } catch (error) {
      // Record failed execution
      this.recordTaskExecution(context, task, error, false);

      throw error;
    } finally {
      // Clean up active task
      context.activeTask = undefined;
      context.currentTasks = context.currentTasks.filter(t => t.id !== task.id);
    }
  }

  /**
   * Clean up expired contexts and memory
   */
  async cleanup(): Promise<void> {
    const now = Date.now();

    for (const [agentId, context] of Array.from(this.contexts)) {
      // Clean up expired shared memory
      for (const [key, data] of Array.from(context.memory.sharedMemory)) {
        if (data.ttl && now > data.timestamp + data.ttl) {
          context.memory.sharedMemory.delete(key);
        }
      }

      // Clean up old communication history
      context.communication.communicationHistory =
        context.communication.communicationHistory.filter(
          event => now - event.timestamp < 86400000 // 24 hours
        );

      // Clean up old telemetry data
      // Implementation would depend on specific telemetry structure
    }
  }

  /**
   * Get global context value
   */
  getGlobalContext(key: string): any {
    return this.globalContext.get(key);
  }

  /**
   * Set global context value
   */
  setGlobalContext(key: string, value: any): void {
    this.globalContext.set(key, value);
  }

  // Private helper methods
  private createMemoryContext(maxSize: number): AgentMemoryContext {
    return {
      shortTerm: new Map(),
      longTerm: new Map(),
      taskMemory: new Map(),
      sharedMemory: new Map(),
      stats: {
        totalKnowledgeEntries: 0,
        totalTaskHistory: 0,
        successfulTasks: 0,
        averageConfidence: 0
      },
      maxShortTermSize: maxSize,
      maxLongTermSize: maxSize * 10,
      cleanupThreshold: 0.8
    };
  }

  private createLearningContext(): AgentLearningContext {
    return {
      learningHistory: [],
      successPatterns: new Map(),
      failurePatterns: new Map(),
      adaptationRules: new Map(),
      performanceBaselines: new Map(),
      learningRate: 0.1,
      adaptationRate: 0.05,
      improvementRate: 0.02
    };
  }

  private createEnvironmentContext(baseEnvironment?: any): AgentEnvironmentContext {
    return {
      openFiles: [],
      recentFiles: [],
      fileContext: new Map(),
      dependencies: [],
      devDependencies: [],
      availableLibraries: new Map(),
      systemInfo: {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        availableMemory: 0, // Would be populated from system info
        cpuCount: 0 // Would be populated from system info
      },
      ...baseEnvironment
    };
  }

  private createSecurityContext(
    isolationLevel: ContextIsolationLevel,
    sharingPolicy: ContextSharingPolicy,
    enableEncryption: boolean = false
  ): AgentSecurityContext {
    return {
      allowedPaths: [],
      restrictedPaths: ['/system', '/private'],
      allowedOperations: ['read', 'write', 'execute'],
      restrictedOperations: ['delete', 'format'],
      allowedAPIs: ['*'],
      apiRateLimits: new Map(),
      sensitiveDataPatterns: [/password/i, /key/i, /token/i],
      encryptionEnabled: enableEncryption,
      isolationLevel
    };
  }

  private createMetricsContext(): AgentMetricsContext {
    return {
      performance: new Map(),
      resourceUsage: {
        memoryUsage: 0,
        cpuUsage: 0,
        networkUsage: 0,
        diskUsage: 0
      },
      taskMetrics: {
        totalTasks: 0,
        successfulTasks: 0,
        failedTasks: 0,
        averageExecutionTime: 0,
        averageConfidence: 0
      },
      learningMetrics: {
        learningEvents: 0,
        adaptationEvents: 0,
        improvementRate: 0,
        knowledgeGrowth: 0
      }
    };
  }

  private createCommunicationContext(agentId: string): AgentCommunicationContext {
    return {
      channels: new Map(),
      messageQueues: new Map(),
      communicationHistory: [],
      settings: {
        maxMessageSize: 1024 * 1024, // 1MB
        messageTimeout: 30000, // 30 seconds
        encryptionEnabled: false,
        compressionEnabled: true
      }
    };
  }

  private validateContextUpdate(context: IsolatedAgentContext, updates: Partial<IsolatedAgentContext>): void {
    // Check security constraints
    if (updates.memory) {
      // Validate memory updates
      this.validateMemoryUpdate(context, updates.memory);
    }

    if (updates.security) {
      // Security context should not be directly updatable
      throw new Error('Security context cannot be updated directly');
    }
  }

  private validateMemoryUpdate(context: IsolatedAgentContext, memoryUpdate: Partial<AgentMemoryContext>): void {
    // Check memory limits
    if (memoryUpdate.shortTerm && context.memory.shortTerm.size + memoryUpdate.shortTerm.size > context.memory.maxShortTermSize) {
      throw new Error('Short-term memory limit exceeded');
    }

    if (memoryUpdate.longTerm && context.memory.longTerm.size + memoryUpdate.longTerm.size > context.memory.maxLongTermSize) {
      throw new Error('Long-term memory limit exceeded');
    }
  }

  private canShareContext(fromContext: IsolatedAgentContext, toContext: IsolatedAgentContext, contextKey: string): boolean {
    // Check sharing policy
    if (fromContext.security.isolationLevel === ContextIsolationLevel.FULL) {
      return false;
    }

    // Check if context key is allowed to be shared
    if (fromContext.security.restrictedOperations.includes('share')) {
      return false;
    }

    return true;
  }

  private validateSharedData(context: IsolatedAgentContext, data: any): boolean {
    // Check for sensitive data patterns
    const dataStr = JSON.stringify(data);
    for (const pattern of context.security.sensitiveDataPatterns) {
      if (pattern.test(dataStr)) {
        return false;
      }
    }

    return true;
  }

  private recordTaskExecution(context: IsolatedAgentContext, task: Task, result: any, success: boolean): void {
    const taskResult: TaskResult = {
      taskId: task.id,
      success,
      output: result,
      metadata: {
        executionTime: Date.now(),
        confidence: success ? 0.8 : 0.2,
        agentId: context.agentId
      }
    };

    context.executionHistory.push(taskResult);
    context.metrics.taskMetrics.totalTasks++;

    if (success) {
      context.metrics.taskMetrics.successfulTasks++;
    } else {
      context.metrics.taskMetrics.failedTasks++;
    }
  }

  private recordSharingEvent(fromAgentId: string, toAgentId: string, contextKey: string, options: any): void {
    // Implementation would record the sharing event for audit purposes
  }
}

/**
 * Context lifecycle management
 */
export class ContextLifecycle {
  private context: IsolatedAgentContext;
  private isolationLevel: ContextIsolationLevel;
  private createdAt: number;
  private lastAccessed: number;
  private accessCount: number;

  constructor(context: IsolatedAgentContext, isolationLevel: ContextIsolationLevel) {
    this.context = context;
    this.isolationLevel = isolationLevel;
    this.createdAt = Date.now();
    this.lastAccessed = Date.now();
    this.accessCount = 0;
  }

  updateTimestamp(): void {
    this.lastAccessed = Date.now();
    this.accessCount++;
  }

  getLifetime(): number {
    return Date.now() - this.createdAt;
  }

  getLastAccessed(): number {
    return Date.now() - this.lastAccessed;
  }

  getAccessCount(): number {
    return this.accessCount;
  }

  isExpired(maxLifetime: number = 86400000): boolean { // 24 hours default
    return this.getLifetime() > maxLifetime;
  }

  shouldCleanup(): boolean {
    // Clean up if not accessed for 1 hour and access count is low
    return this.getLastAccessed() > 3600000 && this.accessCount < 10;
  }
}