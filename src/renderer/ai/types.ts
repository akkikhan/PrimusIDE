/**
 * Core types for the Swarm Orchestration System
 */

export interface Task {
  id: string;
  parentId?: string;
  description: string;
  requirements: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  deadline?: Date;
  assignedAgent?: string;
  metadata?: Record<string, any>;
}

export interface TaskResult {
  taskId: string;
  success: boolean;
  output: any;
  error?: string;
  metadata: {
    executionTime: number;
    confidence: number;
    agentId: string;
    [key: string]: any;
  };
}

export interface SubTask extends Task {
  parentTaskId: string;
  dependencies?: string[];
  estimatedDuration?: number;
  complexity?: number;
}

export interface AgentConfig {
  id: string;
  specialty: string;
  capabilities: string[];  
}

export interface SwarmMetrics {
  totalAgents: number;
  activeTasks: number;
  completedTasks: number;
  averageTaskCompletionTime: number;
  agentUtilization: number; 
  errorRate: number;
}

export interface AIProvider {
  name: string;
  endpoint: string;
  requiresKey: boolean;
  freeTier: boolean;
  models: string[];
  maxTokens: number;
  contextWindow: number;
  rateLimits?: {
    requestsPerMinute: number;
    tokensPerMinute: number;
  };
  supportedFeatures?: string[];
}

export interface ProviderConfig {
  apiKey?: string;
  model?: string;
  maxTokens?: number;
  endpoint?: string;
  enabled?: boolean;
}

export interface RateLimitConfig {
  calls: number;
  tokens: number;
  window: number;
}

export interface CircuitBreakerConfig {
  threshold: number;
  timeout: number;
  halfOpenTimeout: number;
}

export interface CacheConfig {
  ttl: number;
  maxSize: number;
}

export interface TelemetryEntry {
  timestamp: number;
  provider: string;
  operation: string;
  duration: number;
  success: boolean;
  error?: string;
  tokensUsed?: number;
  agentId?: string;
}

export interface ProviderStats {
  rateLimiter?: {
    callsInWindow: number;
    tokensUsed: number;
    quotaRemaining: number;
  };
  circuitBreaker?: {
    state: 'closed' | 'open' | 'half-open';
    failures: number;
    nextAttempt: number;
  };
}

export interface KnowledgeEntry {
  pattern: string;
  description: string;
  confidence: number;
  usageCount: number;
}

export interface MemoryStats {
  totalKnowledgeEntries: number;
  totalTaskHistory: number;
  successfulTasks: number;
  averageConfidence: number;
}

export interface LearningEvent {
  timestamp: number;
  eventType: 'success' | 'failure';
  taskId: string;
  error?: string;
  executionTime?: number;
  context: {
    taskRequirements: string[];
    taskDescription: string;
    agentCapabilities: string[];
  };
}

export interface PerformanceMetric {
  name: string;
  value: number;
  trend: 'improving' | 'declining' | 'stable';
  lastUpdated: number;
}

export interface WhiteningStrategy {
  name: string;
  triggerCondition: (metrics: any) => boolean;
  adaptationAction: (agent: any) => Promise<void>;
}

export interface FailurePattern {
  errorType: string;
  commonCauses: string[];
  preventionStrategies: string[];
  confidence: number;
}

export interface SuccessPattern {
  effectiveStrategies: string[];
  optimalConditions: string[];
  replicableApproaches: string[];
  confidence: number;
}

export interface ImprovementSuggestion {
  type: string;
  strategy: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  implementation: () => Promise<void>;
}

export interface LearningStats {
  totalLearningEvents: number;
  successEvents: number;
  failureEvents: number;
  learningRate: number;
  mostCommonErrorType: string;
  improvementTrends: string[];
}

export interface OptimizationInsight {
  type: 'scale_agents' | 'redistribute_tasks' | 'optimize_performance' | 'add_capability';
  description: string;
  impact: number;
  implementation: () => Promise<void>;
}

export interface SpecializationRule {
  triggerCondition: (task: Task) => boolean;
  requiredCapabilities: string[];  
  specializationPrompt: string;
}

export interface ReplicationTrigger {
  name: string;
  condition: (agent: any) => boolean; // Using any to avoid circular dependency
  replicationStrategy: string;
  description: string;
}

export interface CoordinationProtocol {
  name: string;
  trigger: string;
  action: (fromAgent: any, toAgent: any, data: any) => void;
}

export interface Specialization {
  name: string;
  capabilities: string[];
  prompt: string;
}

export interface AgentContext {
  agentId: string;
  specialty: string;
  capabilities: string[];
  memory?: any;
  learningHistory?: any;
  currentTasks?: Task[];
  environment?: {
    projectPath?: string;
    fileContext?: string[];
    dependencies?: string[];
  };
}

export type SwarmOrchestrator = import('./SwarmOrchestrator').SwarmOrchestrator;

export interface SwarmStatus {
  totalAgents: number;
  activeTasks: number;
  completedTasks: number;
  averageTaskCompletionTime: number;
  agentUtilization: number;
  errorRate: number;
  swarmHealth: 'healthy' | 'warning' | 'critical';
  activeAgentIds: string[];
  taskQueueLength: number;
}

export interface ProgressUpdate {
  taskId: string;
  progress: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  assignedAgent: string;
  estimatedTimeRemaining: number;
}

export interface CoordinationData {
  agentIds: string[];
  coordinationType: 'synchronization' | 'collaboration' | 'information_sharing';
  data: any;
  priority: 'low' | 'medium' | 'high';
  timeout?: number;
}

export interface CoordinationStrategy {
  type: 'parallel' | 'sequential' | 'collaborative';
  synchronization: 'none' | 'partial' | 'full';
  communication: 'direct' | 'broadcast' | 'coordinated';
  errorHandling: 'individual' | 'collective';
}

export interface SwarmStatistics {
  totalAgents: number;
  activeTasks: number;
  completedTasks: number;
  averageTaskCompletionTime: number;
  agentUtilization: number;
  errorRate: number;
  swarmHealth: 'healthy' | 'warning' | 'critical';
  activeAgentIds: string[];
  taskQueueLength: number;
  agentPerformance: AgentPerformanceStats[];
  taskDistribution: TaskDistributionStats;
  systemHealth: SystemHealthStats;
}

export interface AgentPerformanceStats {
  agentId: string;
  specialty: string;
  capabilities: string[];
  tasksCompleted: number;
  averageTaskTime: number;
  successRate: number;
  currentUtilization: number;
}

export interface TaskDistributionStats {
  byPriority: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  byType: Record<string, number>;
  queueLength: number;
  activeTasks: number;
  completedTasks: number;
}

export interface SystemHealthStats {
  memoryUsage: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
  uptime: number;
  swarmHealth: 'healthy' | 'warning' | 'critical';
  lastOptimization: number;
  activeConnections: number;
  errorCount: number;
}

export interface MessageHistoryEntry {
  id: string;
  fromAgentId: string;
  toAgentId?: string;
  type: string;
  data: any;
  timestamp: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

// Interface definitions that depend on the above types

export interface SelfAwareness {
  analyzeTask(task: Task): Promise<{ subTasks: SubTask[] }>;
  synthesizeResults(
    originalTask: Task, results: TaskResult[]): TaskResult;
}

export interface LearningEngine {
  analyzeMetrics(metrics: SwarmMetrics): Promise<OptimizationInsight[]>;
}

export interface AgentMemory {
  initialize(agentId: string): Promise<void>;
  storeTaskResult(task: Task, result: TaskResult): Promise<void>;
  transferKnowledgeTo(targetMemory: AgentMemory): Promise<void>;
}

export interface AgentLearning {
  learnFromFailure(task: Task, error: any): Promise<void>;
}

export interface AIService {
  initialize(config: { specialty: string; capabilities: string[] }): Promise<void>;
  executeTask(task: Task): Promise<{ success: boolean; output: any; executionTime: number; confidence: number }>;
}

export interface SubAgentConfig extends AgentConfig {
  orchestrator: SwarmOrchestrator;
  selfReplicate?: boolean;
}

// Additional types for SelfAwareness system
export interface ReflectionEntry {
  timestamp: number;
  context: string;
  consciousnessLevel: number;
  selfAssessment: SelfAssessment;
  insights: string[];
  improvementActions: ImprovementAction[];
}

export interface SelfAssessment {
  performance: number;
  knowledge: number;
  adaptability: number;
  strengths: string[];
  weaknesses: string[];
}

export interface ImprovementAction {
  type: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  implementation: () => Promise<void>;
}

export interface ImprovementStrategy {
  name: string;
  triggerCondition: (input: any) => boolean;
  improvementAction: (input: any) => Promise<any>;
}

// Additional types for LearningEngine system
export interface LearningPattern {
  patternType: 'success' | 'failure' | 'optimization';
  frequency: number;
  impact: number;
  context: string[];
  adaptation: string;
}

export interface AdaptationRule {
  condition: (metrics: SwarmMetrics) => boolean;
  action: string;
  priority: number;
  cooldown: number;
}

export interface PerformanceBaseline {
  metricName: string;
  baselineValue: number;
  threshold: number;
  trend: 'improving' | 'declining' | 'stable';
}

// Additional types for TaskDelegationSystem

export interface TaskDependencyGraph {
  taskId: string;
  subTasks: string[];
  dependencies: TaskDependency[];
  executionOrder: string[];
}

export interface TaskAssignmentStrategy {
  name: string;
  description: string;
  selectionCriteria: (task: Task, agents: AgentConfig[]) => AgentConfig | null;
  priority: number;
}

export interface DelegationMetrics {
  totalDelegations: number;
  successfulDelegations: number;
  successRate: number;
  averageComplexity: number;
  strategyUsage: Record<string, number>;
  performanceByComplexity: Record<string, number>;
}

export interface TaskDependency {
  requirement1: string;
  requirement2: string;
  dependencyType: 'sequential' | 'parallel' | 'optional';
  strength: number;
}

export interface DelegationRecord {
  originalTaskId: string;
  subTaskIds: string[];
  timestamp: number;
  complexity: number;
  strategy: string;
  success: boolean;
}

