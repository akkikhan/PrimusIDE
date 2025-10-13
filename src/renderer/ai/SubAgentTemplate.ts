// ... existing code ...

/**
 * SubAgentTemplate - Template for creating self-replicating AI agents
 * This template defines the structure and behavior for agents that can:
 * - Execute tasks autonomously
 * - Learn from experience
 * - Replicate themselves when needed
 * - Coordinate with other agents in the swarm
 */
export class SubAgentTemplate {
  private templateId: string;
  private baseCapabilities: string[];
  private specializationRules: Map<string, SpecializationRule>;
  private replicationTriggers: ReplicationTrigger[];
  private coordinationProtocols: CoordinationProtocol[];

  constructor(templateId: string) {
    this.templateId = templateId;
    this.baseCapabilities = this.getBaseCapabilities();
    this.specializationRules = new Map();
    this.replicationTriggers = [];
    this.coordinationProtocols = [];

    this.initializeTemplate();
  }

  /**
   * Initialize the template with default configurations
   */
  private initializeTemplate(): void {
    this.setupSpecializationRules();
    this.setupReplicationTriggers();
    this.setupCoordinationProtocols();
  }

  /**
   * Get base capabilities that all agents should have
   */
  private getBaseCapabilities(): string[] {
    return [
      'task_execution',
      'communication',
      'learning',
      'self_monitoring',
      'error_handling',
      'resource_management'
    ];
  }

  /**
   * Setup rules for specializing agents based on tasks
   */
  private setupSpecializationRules(): void {
    // Code generation specialist
    this.specializationRules.set('code_generation', {
      triggerCondition: (task: Task) => 
        task.description.toLowerCase().includes('code') || 
        task.description.toLowerCase().includes('implement'),
      requiredCapabilities: ['typescript', 'react', 'node', 'api_design'],
      specializationPrompt: 'You are a code generation specialist. Focus on writing clean, efficient, and well-documented code.'
    });

    // Testing specialist
    this.specializationRules.set('testing', {
      triggerCondition: (task: Task) => 
        task.description.toLowerCase().includes('test') || 
        task.description.toLowerCase().includes('quality'),
      requiredCapabilities: ['unit_testing', 'integration_testing', 'test_automation'],
      specializationPrompt: 'You are a testing specialist. Focus on comprehensive test coverage and quality assurance.'
    });

    // Architecture specialist
    this.specializationRules.set('architecture', {
      triggerCondition: (task: Task) => 
        task.description.toLowerCase().includes('design') || 
        task.description.toLowerCase().includes('architecture'),
      requiredCapabilities: ['system_design', 'scalability', 'security'],
      specializationPrompt: 'You are an architecture specialist. Focus on system design, scalability, and technical decisions.'
    });

    // Research specialist
    this.specializationRules.set('research', {
      triggerCondition: (task: Task) => 
        task.description.toLowerCase().includes('research') || 
        task.description.toLowerCase().includes('analyze'),
      requiredCapabilities: ['data_analysis', 'market_research', 'trend_analysis'],
      specializationPrompt: 'You are a research specialist. Focus on gathering information, analysis, and insights.'
    });
  }

  /**
   * Setup triggers for when agents should replicate
   */
  private setupReplicationTriggers(): void {
    this.replicationTriggers = [
      {
        name: 'workload_capacity',
        condition: (agent: SubAgent) => agent.getActiveTasks() > 5,
        replicationStrategy: 'horizontal_scaling',
        description: 'Replicate when agent has too many active tasks'
      },
      {
        name: 'specialization_opportunity',
        condition: (agent: SubAgent) => this.detectSpecializationNeed(agent),
        replicationStrategy: 'specialization',
        description: 'Replicate when agent encounters tasks requiring different specialization'
      },
      {
        name: 'performance_degradation',
        condition: (agent: SubAgent) => agent.getPerformanceScore() < 0.6,
        replicationStrategy: 'performance_boost',
        description: 'Replicate when agent performance drops below threshold'
      },
      {
        name: 'complexity_threshold',
        condition: (agent: SubAgent) => this.detectComplexityThreshold(agent),
        replicationStrategy: 'complexity_handling',
        description: 'Replicate when task complexity exceeds agent's capabilities'
      }
    ];
  }

  /**
   * Setup protocols for agent coordination
   */
  private setupCoordinationProtocols(): void {
    this.coordinationProtocols = [
      {
        name: 'task_handover',
        trigger: 'task_completion',
        action: (fromAgent: SubAgent, toAgent: SubAgent, task: Task) => {
          // Transfer task context and knowledge
          this.transferTaskContext(fromAgent, toAgent, task);
        }
      },
      {
        name: 'knowledge_sharing',
        trigger: 'learning_event',
        action: (fromAgent: SubAgent, toAgent: SubAgent, knowledge: any) => {
          // Share learned knowledge with related agents
          this.shareKnowledge(fromAgent, toAgent, knowledge);
        }
      },
      {
        name: 'resource_sharing',
        trigger: 'resource_request',
        action: (fromAgent: SubAgent, toAgent: SubAgent, resource: any) => {
          // Share resources between agents
          this.shareResource(fromAgent, toAgent, resource);
        }
      }
    ];
  }

  /**
   * Create a new agent instance from this template
   */
  createAgent(config: SubAgentConfig): SubAgent {
    // Determine specialization based on config
    const specialization = this.determineSpecialization(config);
    
    // Create agent with template-based configuration
    const agentConfig: SubAgentConfig = {
      ...config,
      capabilities: [...this.baseCapabilities, ...specialization.capabilities],
      specialty: specialization.name
    };

    const agent = new SubAgent(agentConfig);
    
    // Apply template-specific initialization
    this.applyTemplateInitialization(agent, specialization);
    
    return agent;
  }

  /**
   * Determine the best specialization for an agent
   */
  private determineSpecialization(config: SubAgentConfig): Specialization {
    // Check if specialization is explicitly requested
    if (config.specialty) {
      const rule = this.specializationRules.get(config.specialty.toLowerCase());
      if (rule) {
        return {
          name: config.specialty,
          capabilities: rule.requiredCapabilities,
          prompt: rule.specializationPrompt
        };
      }
    }

    // Auto-determine based on capabilities
    for (const [specialty, rule] of this.specializationRules) {
      const matchScore = this.calculateCapabilityMatch(config.capabilities || [], rule.requiredCapabilities);
      if (matchScore > 0.7) {
        return {
          name: specialty,
          capabilities: rule.requiredCapabilities,
          prompt: rule.specializationPrompt
        };
      }
    }

    // Default to general purpose
    return {
      name: 'general',
      capabilities: ['task_execution', 'communication'],
      prompt: 'You are a general-purpose AI agent capable of handling various tasks.'
    };
  }

  /**
   * Calculate how well capabilities match required capabilities
   */
  private calculateCapabilityMatch(agentCaps: string[], requiredCaps: string[]): number {
    const matches = requiredCaps.filter(cap => agentCaps.includes(cap)).length;
    return matches / requiredCaps.length;
  }

  /**
   * Apply template-specific initialization to agent
   */
  private applyTemplateInitialization(agent: SubAgent, specialization: Specialization): void {
    // Set specialization prompt
    agent.setSystemPrompt(specialization.prompt);
    
    // Initialize with template knowledge
    this.initializeAgentKnowledge(agent, specialization);
    
    // Setup replication monitoring
    this.setupReplicationMonitoring(agent);
  }

  /**
   * Initialize agent with template knowledge
   */
  private initializeAgentKnowledge(agent: SubAgent, specialization: Specialization): void {
    // Load specialization-specific knowledge
    const knowledgeBase = this.getSpecializationKnowledge(specialization.name);
    
    for (const knowledge of knowledgeBase) {
      agent.addKnowledge(knowledge.pattern, knowledge);
    }
  }

  /**
   * Get knowledge base for a specialization
   */
  private getSpecializationKnowledge(specialization: string): KnowledgeEntry[] {
    // Return specialization-specific knowledge entries
    switch (specialization) {
      case 'code_generation':
        return [
          {
            pattern: 'clean_code',
            description: 'Write clean, readable, and maintainable code',
            confidence: 0.9,
            usageCount: 0
          },
          {
            pattern: 'error_handling',
            description: 'Implement proper error handling and validation',
            confidence: 0.85,
            usageCount: 0
          }
        ];
      case 'testing':
        return [
          {
            pattern: 'test_coverage',
            description: 'Ensure comprehensive test coverage',
            confidence: 0.95,
            usageCount: 0
          }
        ];
      default:
        return [];
    }
  }

  /**
   * Setup monitoring for replication triggers
   */
  private setupReplicationMonitoring(agent: SubAgent): void {
    // Monitor agent state and trigger replication when needed
    setInterval(() => {
      this.checkReplicationTriggers(agent);
    }, 30000); // Check every 30 seconds
  }

  /**
   * Check if any replication triggers are activated
   */
  private checkReplicationTriggers(agent: SubAgent): void {
    for (const trigger of this.replicationTriggers) {
      if (trigger.condition(agent)) {
        this.executeReplication(agent, trigger);
        break; // Only replicate once per check
      }
    }
  }

  /**
   * Execute replication based on trigger
   */
  private async executeReplication(agent: SubAgent, trigger: ReplicationTrigger): Promise<void> {
    
    // Create replica based on strategy
    const replicaConfig = this.generateReplicaConfig(agent, trigger);
    const replica = await agent.replicate(replicaConfig.specialty);
    
    // Transfer knowledge and context
    await agent.transferKnowledgeTo(replica);
    
    // Register with orchestrator
    await agent.orchestrator.registerAgent(replica);
  }

  /**
   * Generate configuration for replica agent
   */
  private generateReplicaConfig(agent: SubAgent, trigger: ReplicationTrigger): Partial<SubAgentConfig> {
    switch (trigger.replicationStrategy) {
      case 'horizontal_scaling':
        return { specialty: agent.specialty };
      case 'specialization':
        return { specialty: this.determineNeededSpecialization(agent) };
      case 'performance_boost':
        return { specialty: agent.specialty, capabilities: [...agent.capabilities, 'performance_optimization'] };
      case 'complexity_handling':
        return { specialty: 'complexity_manager', capabilities: ['task_decomposition', 'parallel_processing'] };
      default:
        return { specialty: 'general' };
    }
  }

  // Helper methods
  private detectSpecializationNeed(agent: SubAgent): boolean {
    // Implementation would analyze agent's task history
    return false;
  }

  private detectComplexityThreshold(agent: SubAgent): boolean {
    // Implementation would check task complexity metrics
    return false;
  }

  private transferTaskContext(fromAgent: SubAgent, toAgent: SubAgent, task: Task): void {
    // Implementation would transfer task context
  }

  private shareKnowledge(fromAgent: SubAgent, toAgent: SubAgent, knowledge: any): void {
    // Implementation would share knowledge
  }

  private shareResource(fromAgent: SubAgent, toAgent: SubAgent, resource: any): void {
    // Implementation would share resources
  }

  private determineNeededSpecialization(agent: SubAgent): string {
    // Implementation would analyze task patterns
    return 'general';
  }
}

// ... existing code ...