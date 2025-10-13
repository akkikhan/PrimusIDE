import type { SwarmOrchestrator } from './SwarmOrchestrator';
import { AIService } from './AIService';
import { AgentLearning } from './AgentLearning';
import { AgentMemory } from './AgentMemory';
import type { Task, TaskResult, SubTask } from './types';

interface SubAgentConfig {
  id: string;
  specialty: string;
  capabilities: string[];
  orchestrator: SwarmOrchestrator;
  selfReplicate?: boolean;
}

type ExecutionResponse = Awaited<ReturnType<AIService['executeTask']>>;

export class SubAgent {
  public readonly id: string;
  public readonly specialty: string;
  public readonly capabilities: string[];
  public readonly orchestrator: SwarmOrchestrator;
  public readonly selfReplicate: boolean;

  public subAgents: SubAgent[] = [];
  public experience = 0;
  public successRate = 0;

  private readonly aiService: AIService;
  private readonly memory: AgentMemory;
  private readonly learning: AgentLearning;
  private readonly activeTaskIds = new Set<string>();

  private systemPrompt = '';
  private performanceScore = 1;

  constructor(config: SubAgentConfig) {
    this.id = config.id;
    this.specialty = config.specialty;
    this.capabilities = [...config.capabilities];
    this.orchestrator = config.orchestrator;
    this.selfReplicate = config.selfReplicate ?? false;

    this.aiService = new AIService();
    this.memory = new AgentMemory(this.id);
    this.learning = new AgentLearning(this.id);
  }

  async initialize(): Promise<void> {
    await this.memory.initialize(this.id);
    this.learning.setAgentId(this.id);

    await this.aiService.initialize({
      specialty: this.specialty,
      capabilities: this.capabilities,
      agentId: this.id
    });

    if (this.selfReplicate) {
      await this.createInitialSubAgents();
    }
  }

  async executeTask(task: Task): Promise<TaskResult> {
    this.activeTaskIds.add(task.id);

    try {
      if (this.subAgents.length === 0) {
        const result = await this.performTask(task);
        this.updateExperience(result.success);
        return result;
      }

      const subResults = await this.distributeToSubAgents(task);
      const aggregated = this.synthesizeSubResults(task, subResults);
      this.updateExperience(aggregated.success);
      return aggregated;
    } catch (error) {
      await this.learning.learnFromFailure(task, error);
      this.updateExperience(false);
      throw error;
    } finally {
      this.activeTaskIds.delete(task.id);
    }
  }

  calculateCapabilityScore(task: Task): number {
    const requirements = task.requirements ?? [];
    const capabilityMatches = requirements.filter(req =>
      this.capabilities.some(cap => cap.toLowerCase().includes(req.toLowerCase()))
    ).length;

    let score = capabilityMatches * 15;
    if (task.description?.toLowerCase().includes(this.specialty.toLowerCase())) {
      score += 30;
    }

    score += this.experience * 0.1;
    score += this.successRate * 10;
    return Math.min(score, 100);
  }

  async replicate(specialty?: string): Promise<SubAgent> {
    const replica = new SubAgent({
      id: `${this.id}-replica-${Date.now()}`,
      specialty: specialty ?? this.specialty,
      capabilities: specialty ? [...this.capabilities, specialty] : [...this.capabilities],
      orchestrator: this.orchestrator,
      selfReplicate: false
    });

    await replica.initialize();
    await this.memory.transferKnowledgeTo(replica.memory);
    replica.setSystemPrompt(this.systemPrompt);
    return replica;
  }

  getActiveTasks(): number {
    return this.activeTaskIds.size;
  }

  getPerformanceScore(): number {
    return this.performanceScore;
  }

  setSystemPrompt(prompt: string): void {
    this.systemPrompt = prompt;
  }

  getSystemPrompt(): string {
    return this.systemPrompt;
  }

  private async performTask(task: Task): Promise<TaskResult> {
    const response = await this.executeWithFallback(task);

    const result: TaskResult = {
      taskId: task.id,
      success: response.success,
      output: response.output,
      error: response.metadata?.error,
      metadata: {
        executionTime: response.executionTime,
        confidence: response.confidence,
        agentId: this.id,
        ...response.metadata
      }
    };

    await this.memory.storeTaskResult(task, result);

    if (result.success) {
      await this.learning.learnFromSuccess(task, result);
    } else {
      await this.learning.learnFromFailure(task, response.metadata?.error ?? 'unknown-error');
    }

    this.updatePerformanceMetrics(result);
    return result;
  }

  private async executeWithFallback(task: Task): Promise<ExecutionResponse> {
    try {
      return await this.aiService.executeTask(task);
    } catch (error) {
      return {
        success: false,
        output: null,
        executionTime: 0,
        confidence: 0,
        metadata: {
          error: error instanceof Error ? error.message : String(error),
          agentId: this.id
        }
      };
    }
  }

  private async createInitialSubAgents(): Promise<void> {
    const configs = this.getDefaultSubAgentConfigs();
    for (const config of configs) {
      const subAgent = new SubAgent(config);
      await subAgent.initialize();
      this.subAgents.push(subAgent);
    }
  }

  private getDefaultSubAgentConfigs(): SubAgentConfig[] {
    const baseCapabilities = [...this.capabilities];
    return [
      {
        id: `${this.id}-analysis`,
        specialty: `${this.specialty}-analysis`,
        capabilities: baseCapabilities,
        orchestrator: this.orchestrator,
        selfReplicate: false
      }
    ];
  }

  private async distributeToSubAgents(task: Task): Promise<TaskResult[]> {
    if (this.subAgents.length === 0) {
      return [await this.performTask(task)];
    }

    const subTasks = this.decomposeTaskForSubAgents(task);
    const assignments = subTasks.map(async (subTask, index) => {
      const agent = this.subAgents[index % this.subAgents.length];
      return agent.executeTask(subTask);
    });

    return Promise.all(assignments);
  }

  private decomposeTaskForSubAgents(task: Task): SubTask[] {
    const requirements = task.requirements ?? [];
    if (requirements.length === 0) {
      return [
        {
          ...task,
          parentTaskId: task.id,
          id: `${task.id}-sub-0`
        } as SubTask
      ];
    }

    return requirements.map((requirement, index) => ({
      ...task,
      id: `${task.id}-sub-${index}`,
      parentTaskId: task.id,
      description: `${task.description} - focus on ${requirement}`,
      requirements: [requirement]
    }));
  }

  private synthesizeSubResults(task: Task, results: TaskResult[]): TaskResult {
    const success = results.every(result => result.success);
    const combinedOutput = results
      .map(result => result.output)
      .filter(output => Boolean(output))
      .join('\n');

    const totalTime = results.reduce(
      (sum, result) => sum + (result.metadata?.executionTime ?? 0),
      0
    );
    const averageConfidence =
      results.reduce((sum, result) => sum + (result.metadata?.confidence ?? 0), 0) /
      Math.max(results.length, 1);

    return {
      taskId: task.id,
      success,
      output: combinedOutput,
      metadata: {
        executionTime: totalTime,
        confidence: averageConfidence,
        agentId: this.id,
        sources: results.map(result => result.taskId)
      }
    };
  }

  private updateExperience(success: boolean): void {
    this.experience += 1;
    if (success) {
      this.successRate = ((this.successRate * (this.experience - 1)) + 1) / this.experience;
    } else {
      this.successRate = (this.successRate * (this.experience - 1)) / this.experience;
    }
  }

  private updatePerformanceMetrics(result: TaskResult): void {
    const executionTime = result.metadata?.executionTime ?? 0;
    const confidence = result.metadata?.confidence ?? 0;
    const timeScore = executionTime > 0 ? Math.max(0.1, 1000 / (executionTime + 1)) : 1;
    this.performanceScore = Number(((confidence + timeScore) / 2).toFixed(2));
  }
}



