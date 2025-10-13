import {
  Task,
  SubTask,
  AgentConfig,
  TaskResult,
  TaskDependencyGraph,
  TaskAssignmentStrategy,
  DelegationMetrics
} from './types';

/**
 * Enhanced Task Delegation System - Intelligent task breakdown and agent assignment
 * Provides sophisticated algorithms for task decomposition, dependency analysis, and optimal agent assignment
 */
export class TaskDelegationSystem {
  private dependencyGraph: Map<string, TaskDependencyGraph> = new Map();
  private assignmentStrategies: Map<string, TaskAssignmentStrategy> = new Map();
  private delegationHistory: DelegationRecord[] = [];
  private maxHistorySize: number = 1000;

  constructor() {
    this.initializeAssignmentStrategies();
  }

  /**
   * Initialize different assignment strategies
   */
  private initializeAssignmentStrategies(): void {
    // Load balancing strategy - distribute tasks evenly across agents
    this.assignmentStrategies.set('load_balancing', {
      name: 'Load Balancing',
      description: 'Distribute tasks evenly across available agents',
      selectionCriteria: (task: Task, agents: AgentConfig[]) => {
        return this.selectAgentByLoadBalancing(task, agents);
      },
      priority: 1
    });

    // Capability matching strategy - assign based on agent capabilities
    this.assignmentStrategies.set('capability_matching', {
      name: 'Capability Matching',
      description: 'Assign tasks to agents with matching capabilities',
      selectionCriteria: (task: Task, agents: AgentConfig[]) => {
        return this.selectAgentByCapabilityMatching(task, agents);
      },
      priority: 2
    });

    // Specialization strategy - assign to specialized agents
    this.assignmentStrategies.set('specialization', {
      name: 'Specialization',
      description: 'Assign tasks to agents specialized in the domain',
      selectionCriteria: (task: Task, agents: AgentConfig[]) => {
        return this.selectAgentBySpecialization(task, agents);
      },
      priority: 3
    });

    // Performance-based strategy - assign to highest performing agents
    this.assignmentStrategies.set('performance_based', {
      name: 'Performance Based',
      description: 'Assign tasks to agents with best performance history',
      selectionCriteria: (task: Task, agents: AgentConfig[]) => {
        return this.selectAgentByPerformance(task, agents);
      },
      priority: 4
    });

    // Adaptive strategy - combine multiple strategies based on context
    this.assignmentStrategies.set('adaptive', {
      name: 'Adaptive',
      description: 'Adaptively choose strategy based on task characteristics',
      selectionCriteria: (task: Task, agents: AgentConfig[]) => {
        return this.selectAgentAdaptively(task, agents);
      },
      priority: 5
    });
  }

  /**
   * Intelligently decompose a complex task into manageable sub-tasks
   */
  async decomposeTask(task: Task): Promise<SubTask[]> {
    
    // Analyze task complexity and requirements
    const complexity = this.analyzeTaskComplexity(task);
    const dependencies = this.analyzeTaskDependencies(task);

    // Choose appropriate decomposition strategy
    let subTasks: SubTask[] = [];

    if (complexity > 0.8) {
      subTasks = await this.decomposeComplexTask(task, dependencies);
    } else if (complexity > 0.5) {
      subTasks = await this.decomposeMediumTask(task, dependencies);
    } else {
      subTasks = [this.createSimpleSubTask(task)];
    }

    // Build dependency graph
    this.buildDependencyGraph(task.id, subTasks, dependencies);

    // Record delegation
    this.recordDelegation(task, subTasks);

    return subTasks;
  }

  /**
   * Analyze task complexity based on multiple factors
   */
  private analyzeTaskComplexity(task: Task): number {
    let complexity = 0;

    // Factor in requirements count and diversity
    const uniqueRequirements = new Set(task.requirements);
    complexity += Math.min(uniqueRequirements.size * 0.15, 0.4);

    // Factor in description length and technical terms
    const descriptionWords = task.description.split(' ').length;
    complexity += Math.min(descriptionWords * 0.005, 0.2);

    // Factor in deadline pressure
    if (task.deadline) {
      const hoursUntilDeadline = (task.deadline.getTime() - Date.now()) / (1000 * 60 * 60);
      if (hoursUntilDeadline < 24) {
        complexity += 0.2;
      } else if (hoursUntilDeadline < 72) {
        complexity += 0.1;
      }
    }

    // Factor in priority
    const priorityWeights = { low: 0, medium: 0.05, high: 0.1, critical: 0.15 };
    complexity += priorityWeights[task.priority];

    // Factor in historical data
    const historicalComplexity = this.getHistoricalComplexity(task);
    if (historicalComplexity > 0) {
      complexity = (complexity + historicalComplexity) / 2;
    }

    return Math.min(complexity, 1.0);
  }

  /**
   * Analyze task dependencies
   */
  private analyzeTaskDependencies(task: Task): TaskDependency[] {
    const dependencies: TaskDependency[] = [];

    // Analyze requirements for dependencies
    for (let i = 0; i < task.requirements.length; i++) {
      for (let j = i + 1; j < task.requirements.length; j++) {
        if (this.areRequirementsDependent(task.requirements[i], task.requirements[j])) {
          dependencies.push({
            requirement1: task.requirements[i],
            requirement2: task.requirements[j],
            dependencyType: 'sequential',
            strength: 0.8
          });
        }
      }
    }

    // Analyze description for workflow dependencies
    const workflowDependencies = this.extractWorkflowDependencies(task.description);
    dependencies.push(...workflowDependencies);

    return dependencies;
  }

  /**
   * Check if two requirements are dependent
   */
  private areRequirementsDependent(req1: string, req2: string): boolean {
    const dependentPairs = [
      ['database', 'api'],
      ['frontend', 'backend'],
      ['ui', 'testing'],
      ['security', 'authentication'],
      ['deployment', 'monitoring']
    ];

    return dependentPairs.some(([dep1, dep2]) =>
      (req1.includes(dep1) && req2.includes(dep2)) ||
      (req1.includes(dep2) && req2.includes(dep1))
    );
  }

  /**
   * Extract workflow dependencies from task description
   */
  private extractWorkflowDependencies(description: string): TaskDependency[] {
    const dependencies: TaskDependency[] = [];
    const lowerDesc = description.toLowerCase();

    // Common workflow patterns
    if (lowerDesc.includes('first') || lowerDesc.includes('before')) {
      dependencies.push({
        requirement1: 'initialization',
        requirement2: 'processing',
        dependencyType: 'sequential',
        strength: 0.9
      });
    }

    if (lowerDesc.includes('then') || lowerDesc.includes('after')) {
      dependencies.push({
        requirement1: 'setup',
        requirement2: 'execution',
        dependencyType: 'sequential',
        strength: 0.8
      });
    }

    if (lowerDesc.includes('finally') || lowerDesc.includes('cleanup')) {
      dependencies.push({
        requirement1: 'main',
        requirement2: 'cleanup',
        dependencyType: 'sequential',
        strength: 0.7
      });
    }

    return dependencies;
  }

  /**
   * Get historical complexity for similar tasks
   */
  private getHistoricalComplexity(task: Task): number {
    // This would query historical delegation records
    // For now, return 0
    return 0;
  }

  /**
   * Decompose a complex task into multiple sub-tasks
   */
  private async decomposeComplexTask(task: Task, dependencies: TaskDependency[]): Promise<SubTask[]> {
    const subTasks: SubTask[] = [];

    // Research and analysis phase
    subTasks.push({
      id: `${task.id}-research`,
      parentId: task.id,
      parentTaskId: task.id,
      description: `Research and analyze requirements for: ${task.description}`,
      requirements: ['research', 'analysis'],
      priority: task.priority,
      deadline: task.deadline,
      dependencies: [],
      estimatedDuration: 30 * 60 * 1000, // 30 minutes
      complexity: 0.3
    });

    // Planning and design phase
    subTasks.push({
      id: `${task.id}-planning`,
      parentId: task.id,
      parentTaskId: task.id,
      description: `Create detailed plan and design for: ${task.description}`,
      requirements: ['planning', 'design'],
      priority: task.priority,
      deadline: task.deadline,
      dependencies: [`${task.id}-research`],
      estimatedDuration: 45 * 60 * 1000, // 45 minutes
      complexity: 0.4
    });

    // Implementation phases based on requirements
    const implementationTasks = this.createImplementationSubTasks(task, dependencies);
    subTasks.push(...implementationTasks);

    // Testing and validation phase
    subTasks.push({
      id: `${task.id}-testing`,
      parentId: task.id,
      parentTaskId: task.id,
      description: `Test and validate: ${task.description}`,
      requirements: ['testing', 'validation'],
      priority: task.priority,
      deadline: task.deadline,
      dependencies: implementationTasks.map(t => t.id),
      estimatedDuration: 25 * 60 * 1000, // 25 minutes
      complexity: 0.3
    });

    // Documentation phase
    subTasks.push({
      id: `${task.id}-documentation`,
      parentId: task.id,
      parentTaskId: task.id,
      description: `Document the solution for: ${task.description}`,
      requirements: ['documentation'],
      priority: task.priority,
      deadline: task.deadline,
      dependencies: [`${task.id}-testing`],
      estimatedDuration: 15 * 60 * 1000, // 15 minutes
      complexity: 0.2
    });

    return subTasks;
  }

  /**
   * Decompose a medium complexity task
   */
  private async decomposeMediumTask(task: Task, dependencies: TaskDependency[]): Promise<SubTask[]> {
    const subTasks: SubTask[] = [];

    // Main implementation
    subTasks.push({
      id: `${task.id}-main`,
      parentId: task.id,
      parentTaskId: task.id,
      description: `Main implementation: ${task.description}`,
      requirements: task.requirements,
      priority: task.priority,
      deadline: task.deadline,
      dependencies: [],
      estimatedDuration: 60 * 60 * 1000, // 1 hour
      complexity: 0.5
    });

    // Testing and refinement
    subTasks.push({
      id: `${task.id}-testing`,
      parentId: task.id,
      parentTaskId: task.id,
      description: `Test and refine: ${task.description}`,
      requirements: ['testing', 'refinement'],
      priority: task.priority,
      deadline: task.deadline,
      dependencies: [`${task.id}-main`],
      estimatedDuration: 30 * 60 * 1000, // 30 minutes
      complexity: 0.3
    });

    return subTasks;
  }

  /**
   * Create implementation sub-tasks based on requirements and dependencies
   */
  private createImplementationSubTasks(task: Task, dependencies: TaskDependency[]): SubTask[] {
    const subTasks: SubTask[] = [];
    const requirements = [...task.requirements];

    // Group related requirements
    const requirementGroups = this.groupRelatedRequirements(requirements, dependencies);

    for (let i = 0; i < requirementGroups.length; i++) {
      const group = requirementGroups[i];
      const prevTaskId = i > 0 ? `${task.id}-impl-${i-1}` : undefined;

      subTasks.push({
        id: `${task.id}-impl-${i}`,
        parentId: task.id,
        parentTaskId: task.id,
        description: `Implement ${group.join(', ')} for: ${task.description}`,
        requirements: group,
        priority: task.priority,
        deadline: task.deadline,
        dependencies: prevTaskId ? [prevTaskId] : [],
        estimatedDuration: this.estimateDurationForRequirements(group),
        complexity: this.calculateComplexityForRequirements(group)
      });
    }

    return subTasks;
  }

  /**
   * Group related requirements together
   */
  private groupRelatedRequirements(requirements: string[], dependencies: TaskDependency[]): string[][] {
    const groups: string[][] = [];
    const used = new Set<string>();

    for (const req of requirements) {
      if (used.has(req)) continue;

      const group = [req];
      used.add(req);

      // Find related requirements
      for (const otherReq of requirements) {
        if (used.has(otherReq)) continue;

        if (this.areRequirementsRelated(req, otherReq, dependencies)) {
          group.push(otherReq);
          used.add(otherReq);
        }
      }

      groups.push(group);
    }

    return groups;
  }

  /**
   * Check if two requirements are related
   */
  private areRequirementsRelated(req1: string, req2: string, dependencies: TaskDependency[]): boolean {
    return dependencies.some(dep =>
      (dep.requirement1 === req1 && dep.requirement2 === req2) ||
      (dep.requirement1 === req2 && dep.requirement2 === req1)
    );
  }

  /**
   * Create a simple sub-task (no decomposition needed)
   */
  private createSimpleSubTask(task: Task): SubTask {
    return {
      id: `${task.id}-simple`,
      parentId: task.id,
      parentTaskId: task.id,
      description: task.description,
      requirements: task.requirements,
      priority: task.priority,
      deadline: task.deadline,
      dependencies: [],
      estimatedDuration: 30 * 60 * 1000, // 30 minutes
      complexity: 0.2
    };
  }

  /**
   * Estimate duration for a group of requirements
   */
  private estimateDurationForRequirements(requirements: string[]): number {
    const baseTime = 30 * 60 * 1000; // 30 minutes base
    const perRequirement = 15 * 60 * 1000; // 15 minutes per requirement

    return baseTime + (requirements.length * perRequirement);
  }

  /**
   * Calculate complexity for a group of requirements
   */
  private calculateComplexityForRequirements(requirements: string[]): number {
    const complexityWeights: Record<string, number> = {
      'database': 0.8,
      'security': 0.9,
      'performance': 0.7,
      'testing': 0.6,
      'ui': 0.5,
      'api': 0.6,
      'integration': 0.7
    };

    const totalComplexity = requirements.reduce((sum, req) => {
      const weight = complexityWeights[req] || 0.4;
      return sum + weight;
    }, 0);

    return Math.min(totalComplexity / requirements.length, 1.0);
  }

  /**
   * Build dependency graph for tasks
   */
  private buildDependencyGraph(parentTaskId: string, subTasks: SubTask[], dependencies: TaskDependency[]): void {
    const graph: TaskDependencyGraph = {
      taskId: parentTaskId,
      subTasks: subTasks.map(st => st.id),
      dependencies: dependencies,
      executionOrder: this.calculateExecutionOrder(subTasks, dependencies)
    };

    this.dependencyGraph.set(parentTaskId, graph);
  }

  /**
   * Calculate optimal execution order for sub-tasks
   */
  private calculateExecutionOrder(subTasks: SubTask[], dependencies: TaskDependency[]): string[] {
    // Simple topological sort implementation
    const executionOrder: string[] = [];
    const completed = new Set<string>();
    const inProgress = new Set<string>();

    const processTask = (taskId: string): void => {
      if (completed.has(taskId)) return;
      if (inProgress.has(taskId)) {
        throw new Error(`Circular dependency detected for task ${taskId}`);
      }

      inProgress.add(taskId);

      // Find dependencies for this task
      const taskDependencies = dependencies.filter(dep =>
        dep.requirement2 === taskId || subTasks.find(st => st.id === taskId)?.requirements.includes(dep.requirement2)
      );

      // Process dependencies first
      for (const dep of taskDependencies) {
        processTask(dep.requirement1);
      }

      inProgress.delete(taskId);
      completed.add(taskId);
      executionOrder.push(taskId);
    };

    // Process all tasks
    for (const subTask of subTasks) {
      if (!completed.has(subTask.id)) {
        processTask(subTask.id);
      }
    }

    return executionOrder;
  }

  /**
   * Assign tasks to agents using intelligent strategies
   */
  assignTasksToAgents(subTasks: SubTask[], agents: AgentConfig[], strategy: string = 'adaptive'): Map<string, string> {
    const assignments = new Map<string, string>();
    const strategyImpl = this.assignmentStrategies.get(strategy) || this.assignmentStrategies.get('adaptive')!;

    for (const subTask of subTasks) {
      const assignedAgent = strategyImpl.selectionCriteria(subTask, agents);
      if (assignedAgent) {
        assignments.set(subTask.id, assignedAgent.id);
        
      } else {
        console.warn(`No suitable agent found for task ${subTask.id}`);
      }
    }

    return assignments;
  }

  /**
   * Select agent using load balancing strategy
   */
  private selectAgentByLoadBalancing(task: Task, agents: AgentConfig[]): AgentConfig | null {
    // Find agent with least current workload
    let selectedAgent: AgentConfig | null = null;
    let minWorkload = Infinity;

    for (const agent of agents) {
      const workload = this.calculateAgentWorkload(agent);
      if (workload < minWorkload) {
        minWorkload = workload;
        selectedAgent = agent;
      }
    }

    return selectedAgent;
  }

  /**
   * Select agent using capability matching strategy
   */
  private selectAgentByCapabilityMatching(task: Task, agents: AgentConfig[]): AgentConfig | null {
    let selectedAgent: AgentConfig | null = null;
    let bestMatchScore = 0;

    for (const agent of agents) {
      const matchScore = this.calculateCapabilityMatchScore(task, agent);
      if (matchScore > bestMatchScore) {
        bestMatchScore = matchScore;
        selectedAgent = agent;
      }
    }

    return bestMatchScore > 0.3 ? selectedAgent : null;
  }

  /**
   * Select agent using specialization strategy
   */
  private selectAgentBySpecialization(task: Task, agents: AgentConfig[]): AgentConfig | null {
    // Find agent whose specialty matches the task domain
    const taskDomain = this.extractTaskDomain(task);

    for (const agent of agents) {
      if (agent.specialty.toLowerCase().includes(taskDomain.toLowerCase())) {
        return agent;
      }
    }

    return null;
  }

  /**
   * Select agent using performance-based strategy
   */
  private selectAgentByPerformance(task: Task, agents: AgentConfig[]): AgentConfig | null {
    // Find agent with best performance history for similar tasks
    let selectedAgent: AgentConfig | null = null;
    let bestPerformance = 0;

    for (const agent of agents) {
      const performance = this.getAgentPerformanceForTask(agent, task);
      if (performance > bestPerformance) {
        bestPerformance = performance;
        selectedAgent = agent;
      }
    }

    return selectedAgent;
  }

  /**
   * Select agent using adaptive strategy
   */
  private selectAgentAdaptively(task: Task, agents: AgentConfig[]): AgentConfig | null {
    // Combine multiple strategies based on task characteristics
    const complexity = this.analyzeTaskComplexity(task);

    if (complexity > 0.7) {
      return this.selectAgentBySpecialization(task, agents) ||
             this.selectAgentByCapabilityMatching(task, agents);
    } else if (complexity > 0.4) {
      return this.selectAgentByCapabilityMatching(task, agents) ||
             this.selectAgentByPerformance(task, agents);
    } else {
      return this.selectAgentByLoadBalancing(task, agents);
    }
  }

  /**
   * Calculate current workload for an agent
   */
  private calculateAgentWorkload(agent: AgentConfig): number {
    // This would query current active tasks for the agent
    // For now, return a random workload
    return Math.random() * 100;
  }

  /**
   * Calculate how well an agent's capabilities match a task
   */
  private calculateCapabilityMatchScore(task: Task, agent: AgentConfig): number {
    let score = 0;
    const taskRequirements = new Set(task.requirements);

    for (const capability of agent.capabilities) {
      if (taskRequirements.has(capability)) {
        score += 1.0;
      } else if (task.description.toLowerCase().includes(capability.toLowerCase())) {
        score += 0.5;
      }
    }

    return score / Math.max(taskRequirements.size, 1);
  }

  /**
   * Extract domain from task description
   */
  private extractTaskDomain(task: Task): string {
    const desc = task.description.toLowerCase();

    if (desc.includes('frontend') || desc.includes('ui') || desc.includes('react')) return 'frontend';
    if (desc.includes('backend') || desc.includes('api') || desc.includes('server')) return 'backend';
    if (desc.includes('database') || desc.includes('data')) return 'database';
    if (desc.includes('testing') || desc.includes('test')) return 'testing';
    if (desc.includes('deployment') || desc.includes('deploy')) return 'deployment';

    return 'general';
  }

  /**
   * Get agent's performance history for similar tasks
   */
  private getAgentPerformanceForTask(agent: AgentConfig, task: Task): number {
    // This would query historical performance data
    // For now, return a random performance score
    return Math.random();
  }

  /**
   * Record delegation for learning and analysis
   */
  private recordDelegation(originalTask: Task, subTasks: SubTask[]): void {
    const record: DelegationRecord = {
      originalTaskId: originalTask.id,
      subTaskIds: subTasks.map(st => st.id),
      timestamp: Date.now(),
      complexity: this.analyzeTaskComplexity(originalTask),
      strategy: 'adaptive',
      success: true // Will be updated when task completes
    };

    this.delegationHistory.push(record);

    // Maintain history size limit
    if (this.delegationHistory.length > this.maxHistorySize) {
      this.delegationHistory = this.delegationHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Get delegation metrics for analysis
   */
  getDelegationMetrics(): DelegationMetrics {
    const totalDelegations = this.delegationHistory.length;
    const successfulDelegations = this.delegationHistory.filter(d => d.success).length;
    const averageComplexity = this.delegationHistory.reduce((sum, d) => sum + d.complexity, 0) / totalDelegations;

    return {
      totalDelegations,
      successfulDelegations,
      successRate: successfulDelegations / totalDelegations,
      averageComplexity,
      strategyUsage: this.getStrategyUsageStats(),
      performanceByComplexity: this.getPerformanceByComplexity()
    };
  }

  /**
   * Get usage statistics for different strategies
   */
  private getStrategyUsageStats(): Record<string, number> {
    const stats: Record<string, number> = {};

    for (const record of this.delegationHistory) {
      stats[record.strategy] = (stats[record.strategy] || 0) + 1;
    }

    return stats;
  }

  /**
   * Get performance statistics by complexity level
   */
  private getPerformanceByComplexity(): Record<string, number> {
    const complexityRanges = {
      'low': { min: 0, max: 0.3, count: 0, success: 0 },
      'medium': { min: 0.3, max: 0.7, count: 0, success: 0 },
      'high': { min: 0.7, max: 1.0, count: 0, success: 0 }
    };

    for (const record of this.delegationHistory) {
      if (record.complexity <= 0.3) {
        complexityRanges.low.count++;
        if (record.success) complexityRanges.low.success++;
      } else if (record.complexity <= 0.7) {
        complexityRanges.medium.count++;
        if (record.success) complexityRanges.medium.success++;
      } else {
        complexityRanges.high.count++;
        if (record.success) complexityRanges.high.success++;
      }
    }

    const result: Record<string, number> = {};
    for (const [range, data] of Object.entries(complexityRanges)) {
      result[range] = data.count > 0 ? data.success / data.count : 0;
    }

    return result;
  }

  /**
   * Update delegation record with result
   */
  updateDelegationResult(taskId: string, success: boolean): void {
    const record = this.delegationHistory.find(d => d.subTaskIds.includes(taskId));
    if (record) {
      record.success = success;
    }
  }
}

// Supporting interfaces and types

export interface TaskDependency {
  requirement1: string;
  requirement2: string;
  dependencyType: 'sequential' | 'parallel' | 'optional';
  strength: number;
}

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

export interface DelegationRecord {
  originalTaskId: string;
  subTaskIds: string[];
  timestamp: number;
  complexity: number;
  strategy: string;
  success: boolean;
}

export interface DelegationMetrics {
  totalDelegations: number;
  successfulDelegations: number;
  successRate: number;
  averageComplexity: number;
  strategyUsage: Record<string, number>;
  performanceByComplexity: Record<string, number>;
}
</content>
</edit_file>