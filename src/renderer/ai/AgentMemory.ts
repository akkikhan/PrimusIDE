import type { Task, TaskResult, KnowledgeEntry, MemoryStats } from './types';

interface StoredAgentMemory {
  memoryStore: Record<string, unknown>;
  taskHistory: TaskResult[];
  knowledgeBase: Record<string, KnowledgeEntry>;
}

export class AgentMemory {
  private agentId: string;
  private memoryStore = new Map<string, unknown>();
  private taskHistory: TaskResult[] = [];
  private knowledgeBase = new Map<string, KnowledgeEntry>();

  private get storage(): Storage | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage;
      }
    } catch {
      // Accessing localStorage can throw in some environments (e.g. tests)
    }
    return null;
  }

  constructor(agentId = 'anonymous-agent') {
    this.agentId = agentId;
  }

  async initialize(agentId?: string): Promise<void> {
    if (agentId) {
      this.agentId = agentId;
    }

    await this.loadFromStorage();

    if (this.knowledgeBase.size === 0) {
      this.initializeKnowledgeBase();
    }
  }

  private async loadFromStorage(): Promise<void> {
    const storage = this.storage;
    if (!storage) {
      return;
    }

    try {
      const stored = storage.getItem(`agent_memory_${this.agentId}`);
      if (!stored) {
        return;
      }

      const parsed = JSON.parse(stored) as StoredAgentMemory;
      this.memoryStore = new Map(Object.entries(parsed.memoryStore ?? {}));
      this.taskHistory = Array.isArray(parsed.taskHistory) ? parsed.taskHistory : [];
      this.knowledgeBase = new Map(Object.entries(parsed.knowledgeBase ?? {}));
    } catch (error) {
      console.warn('Failed to load agent memory:', error);
    }
  }

  private async saveToStorage(): Promise<void> {
    const storage = this.storage;
    if (!storage) {
      return;
    }

    const payload: StoredAgentMemory = {
      memoryStore: Object.fromEntries(this.memoryStore),
      taskHistory: this.taskHistory,
      knowledgeBase: Object.fromEntries(this.knowledgeBase)
    };

    try {
      storage.setItem(`agent_memory_${this.agentId}`, JSON.stringify(payload));
    } catch (error) {
      console.warn('Failed to save agent memory:', error);
    }
  }

  private initializeKnowledgeBase(): void {
    this.addKnowledgeEntry('error_handling', {
      pattern: 'try-catch blocks',
      description: 'Use try/catch when side effects can fail.',
      confidence: 0.8,
      usageCount: 0
    });

    this.addKnowledgeEntry('async_await', {
      pattern: 'async/await syntax',
      description: 'Prefer async/await for asynchronous control flow.',
      confidence: 0.85,
      usageCount: 0
    });

    this.addKnowledgeEntry('typescript_types', {
      pattern: 'TypeScript typing',
      description: 'Add explicit types to clarify intent.',
      confidence: 0.75,
      usageCount: 0
    });
  }

  async storeTaskResult(task: Task, result: TaskResult): Promise<void> {
    this.taskHistory.push(result);

    await this.extractLearnings(task, result);
    this.updateKnowledgeBase(task, result);

    await this.saveToStorage();
  }

  private async extractLearnings(task: Task, result: TaskResult): Promise<void> {
    const patterns = result.success
      ? this.identifySuccessPatterns(task)
      : this.identifyFailurePatterns(task, result);

    for (const patternId of patterns) {
      if (result.success) {
        this.reinforcePattern(patternId);
      } else {
        this.avoidPattern(patternId);
      }
    }
  }

  private identifySuccessPatterns(task: Task): string[] {
    const matches: string[] = [];
    const description = task.description.toLowerCase();

    if (description.includes('error')) {
      matches.push('error_handling');
    }
    if (description.includes('async') || description.includes('await')) {
      matches.push('async_await');
    }
    if (description.includes('type') || description.includes('interface')) {
      matches.push('typescript_types');
    }

    return matches;
  }

  private identifyFailurePatterns(task: Task, result: TaskResult): string[] {
    const matches = this.identifySuccessPatterns(task);
    if (result.error?.toLowerCase().includes('timeout')) {
      matches.push('performance_bottleneck');
    }
    return matches;
  }

  private reinforcePattern(patternId: string): void {
    const entry = this.knowledgeBase.get(patternId);
    if (!entry) {
      return;
    }

    this.knowledgeBase.set(patternId, {
      ...entry,
      usageCount: entry.usageCount + 1,
      confidence: Math.min(1, entry.confidence + 0.02)
    });
  }

  private avoidPattern(patternId: string): void {
    const entry = this.knowledgeBase.get(patternId);
    if (!entry) {
      return;
    }

    this.knowledgeBase.set(patternId, {
      ...entry,
      usageCount: entry.usageCount + 1,
      confidence: Math.max(0, entry.confidence - 0.05)
    });
  }

  private updateKnowledgeBase(task: Task, result: TaskResult): void {
    const newKnowledge = this.extractNewKnowledge(task, result);
    for (const item of newKnowledge) {
      this.addKnowledgeEntry(item.id, item.entry);
    }
  }

  private extractNewKnowledge(
    task: Task,
    result: TaskResult
  ): Array<{ id: string; entry: KnowledgeEntry }> {
    if (!result.success) {
      return [];
    }

    const description = task.description.toLowerCase();
    if (description.includes('performance')) {
      return [
        {
          id: 'performance_optimization',
          entry: {
            pattern: 'Profiling and optimization',
            description: 'Profile slow paths and cache expensive work.',
            confidence: 0.6,
            usageCount: 0
          }
        }
      ];
    }

    return [];
  }

  private addKnowledgeEntry(id: string, entry: KnowledgeEntry): void {
    const existing = this.knowledgeBase.get(id);
    if (existing) {
      this.knowledgeBase.set(id, {
        ...existing,
        pattern: entry.pattern,
        description: entry.description,
        confidence: Math.max(existing.confidence, entry.confidence),
        usageCount: existing.usageCount + 1
      });
      return;
    }

    this.knowledgeBase.set(id, { ...entry });
  }

  absorbKnowledgeEntry(id: string, entry: KnowledgeEntry): void {
    this.addKnowledgeEntry(id, entry);
  }

  absorbTaskResult(result: TaskResult): void {
    this.taskHistory.push(result);
  }

  getRelevantKnowledge(task: Task): KnowledgeEntry[] {
    const relevant: KnowledgeEntry[] = [];
    const description = task.description.toLowerCase();

    for (const entry of this.knowledgeBase.values()) {
      const pattern = entry.pattern.toLowerCase();
      if (description.includes(pattern) || description.includes(entry.description.toLowerCase())) {
        relevant.push(entry);
      }
    }

    return relevant.sort((a, b) => b.confidence - a.confidence);
  }

  private calculateAverageConfidence(): number {
    if (this.knowledgeBase.size === 0) {
      return 0;
    }

    let total = 0;
    for (const entry of this.knowledgeBase.values()) {
      total += entry.confidence;
    }

    return total / this.knowledgeBase.size;
  }

  async transferKnowledgeTo(targetMemory: AgentMemory): Promise<void> {
    for (const [id, entry] of this.knowledgeBase) {
      targetMemory.absorbKnowledgeEntry(id, entry);
    }

    const successes = this.taskHistory.filter(item => item.success).slice(-10);
    for (const result of successes) {
      targetMemory.absorbTaskResult(result);
    }
  }

  getStats(): MemoryStats {
    return {
      totalKnowledgeEntries: this.knowledgeBase.size,
      totalTaskHistory: this.taskHistory.length,
      successfulTasks: this.taskHistory.filter(result => result.success).length,
      averageConfidence: this.calculateAverageConfidence()
    };
  }
}
