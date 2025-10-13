// Build Pipeline System - Comprehensive automated build, test, and deployment pipeline
// Integrates with SwarmOrchestrator for intelligent pipeline orchestration and DevelopmentToolsIntegrationService for tool coordination

import { EventEmitter } from 'events';
import { SwarmOrchestrator } from '../ai/SwarmOrchestrator';
import { DevelopmentToolsIntegrationService } from './DevelopmentToolsIntegrationService';
import { AdvancedTestingService } from './AdvancedTestingService';
import { AdvancedGitService } from './AdvancedGitService';
import { AdvancedTerminalService } from './AdvancedTerminalService';

export interface PipelineStage {
  id: string;
  name: string;
  description: string;
  type: 'build' | 'test' | 'deploy' | 'security' | 'performance' | 'quality';
  dependencies: string[];
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimatedDuration: number; // in minutes
  actualDuration?: number;
  startTime?: Date;
  endTime?: Date;
  output?: any;
  error?: string;
  retryCount: number;
  maxRetries: number;
  agent?: string;
  resources: ResourceRequirement[];
  environment: PipelineEnvironment;
}

export interface ResourceRequirement {
  type: 'cpu' | 'memory' | 'disk' | 'network';
  amount: number;
  unit: string;
}

export interface PipelineEnvironment {
  nodeVersion: string;
  platform: 'linux' | 'windows' | 'macos';
  architecture: 'x64' | 'arm64';
  environmentVariables: Record<string, string>;
  dependencies: string[];
  cache: {
    enabled: boolean;
    paths: string[];
    key: string;
  };
}

export interface PipelineConfig {
  id: string;
  name: string;
  description: string;
  trigger: 'manual' | 'git-push' | 'schedule' | 'api';
  branches: string[];
  stages: PipelineStage[];
  environment: PipelineEnvironment;
  notifications: NotificationConfig[];
  retention: {
    builds: number;
    artifacts: number;
    logs: number;
  };
  parallel: boolean;
  maxConcurrency: number;
  timeout: number; // in minutes
  failureStrategy: 'stop' | 'continue' | 'rollback';
}

export interface NotificationConfig {
  type: 'email' | 'slack' | 'webhook' | 'teams';
  events: ('started' | 'completed' | 'failed' | 'warning')[];
  recipients: string[];
  template: string;
}

export interface BuildArtifact {
  id: string;
  name: string;
  type: 'binary' | 'package' | 'docker-image' | 'archive';
  path: string;
  size: number;
  checksum: string;
  metadata: Record<string, any>;
  uploadUrl?: string;
  expiresAt?: Date;
}

export interface PipelineExecution {
  id: string;
  configId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: Date;
  endTime?: Date;
  duration?: number;
  stages: PipelineStage[];
  artifacts: BuildArtifact[];
  metrics: PipelineMetrics;
  logs: PipelineLog[];
  trigger: {
    type: string;
    user?: string;
    branch?: string;
    commit?: string;
  };
}

export interface PipelineMetrics {
  totalStages: number;
  completedStages: number;
  failedStages: number;
  skippedStages: number;
  averageStageDuration: number;
  totalArtifacts: number;
  totalArtifactSize: number;
  successRate: number;
  throughput: number; // builds per hour
}

export interface PipelineLog {
  timestamp: Date;
  stage: string;
  level: 'info' | 'warning' | 'error' | 'debug';
  message: string;
  metadata?: Record<string, any>;
}

export interface QualityGate {
  id: string;
  name: string;
  description: string;
  conditions: QualityCondition[];
  action: 'pass' | 'warn' | 'fail';
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface QualityCondition {
  metric: string;
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'ne';
  value: number;
  unit?: string;
}

export interface DeploymentTarget {
  id: string;
  name: string;
  type: 'development' | 'staging' | 'production';
  platform: 'aws' | 'azure' | 'gcp' | 'kubernetes' | 'docker' | 'local';
  config: Record<string, any>;
  healthCheck: {
    enabled: boolean;
    url: string;
    expectedStatus: number;
    timeout: number;
  };
}

export class BuildPipelineSystem extends EventEmitter {
  private swarmOrchestrator: SwarmOrchestrator;
  private devToolsIntegration: DevelopmentToolsIntegrationService;
  private testingService: AdvancedTestingService;
  private gitService: AdvancedGitService;
  private terminalService: AdvancedTerminalService;

  private pipelineConfigs: Map<string, PipelineConfig> = new Map();
  private activeExecutions: Map<string, PipelineExecution> = new Map();
  private qualityGates: Map<string, QualityGate> = new Map();
  private deploymentTargets: Map<string, DeploymentTarget> = new Map();

  private pipelineHistory: PipelineExecution[] = [];
  private maxHistorySize = 100;

  private buildQueue: string[] = [];
  private isProcessingQueue = false;
  private maxConcurrentPipelines = 3;

  private readonly DEFAULT_ENVIRONMENTS: Record<string, PipelineEnvironment> = {
    development: {
      nodeVersion: '18.x',
      platform: 'linux',
      architecture: 'x64',
      environmentVariables: {
        NODE_ENV: 'development',
        DEBUG: 'true'
      },
      dependencies: ['typescript', 'webpack', 'eslint'],
      cache: {
        enabled: true,
        paths: ['node_modules', 'dist'],
        key: 'dev-cache'
      }
    },
    production: {
      nodeVersion: '18.x',
      platform: 'linux',
      architecture: 'x64',
      environmentVariables: {
        NODE_ENV: 'production',
        DEBUG: 'false'
      },
      dependencies: ['typescript', 'webpack', 'eslint', 'compression', 'helmet'],
      cache: {
        enabled: true,
        paths: ['node_modules', 'dist'],
        key: 'prod-cache'
      }
    }
  };

  constructor(
    swarmOrchestrator: SwarmOrchestrator,
    devToolsIntegration: DevelopmentToolsIntegrationService,
    testingService: AdvancedTestingService,
    gitService: AdvancedGitService,
    terminalService: AdvancedTerminalService
  ) {
    super();
    this.swarmOrchestrator = swarmOrchestrator;
    this.devToolsIntegration = devToolsIntegration;
    this.testingService = testingService;
    this.gitService = gitService;
    this.terminalService = terminalService;

    this.initializeBuildPipelineSystem();
  }

  /**
   * Initialize the build pipeline system
   */
  private async initializeBuildPipelineSystem(): Promise<void> {
    
    // Load default pipeline configurations
    await this.loadDefaultPipelineConfigs();

    // Load quality gates
    this.loadDefaultQualityGates();

    // Load deployment targets
    this.loadDefaultDeploymentTargets();

    // Set up event listeners
    this.setupEventListeners();

    // Start pipeline queue processor
    this.startPipelineQueueProcessor();

  }

  /**
   * Load default pipeline configurations
   */
  private async loadDefaultPipelineConfigs(): Promise<void> {
    const defaultConfigs: PipelineConfig[] = [
      {
        id: 'quick-build',
        name: 'Quick Build',
        description: 'Fast build for development with basic tests',
        trigger: 'manual',
        branches: ['develop', 'feature/*'],
        stages: [
          {
            id: 'install-deps',
            name: 'Install Dependencies',
            description: 'Install npm dependencies',
            type: 'build',
            dependencies: [],
            status: 'pending',
            priority: 'high',
            estimatedDuration: 2,
            retryCount: 0,
            maxRetries: 2,
            resources: [
              { type: 'cpu', amount: 1, unit: 'core' },
              { type: 'memory', amount: 512, unit: 'MB' }
            ],
            environment: this.DEFAULT_ENVIRONMENTS.development
          },
          {
            id: 'lint-code',
            name: 'Lint Code',
            description: 'Run ESLint and code quality checks',
            type: 'quality',
            dependencies: ['install-deps'],
            status: 'pending',
            priority: 'medium',
            estimatedDuration: 1,
            retryCount: 0,
            maxRetries: 1,
            resources: [
              { type: 'cpu', amount: 0.5, unit: 'core' },
              { type: 'memory', amount: 256, unit: 'MB' }
            ],
            environment: this.DEFAULT_ENVIRONMENTS.development
          },
          {
            id: 'unit-tests',
            name: 'Unit Tests',
            description: 'Run unit tests',
            type: 'test',
            dependencies: ['install-deps'],
            status: 'pending',
            priority: 'high',
            estimatedDuration: 3,
            retryCount: 0,
            maxRetries: 2,
            resources: [
              { type: 'cpu', amount: 1, unit: 'core' },
              { type: 'memory', amount: 512, unit: 'MB' }
            ],
            environment: this.DEFAULT_ENVIRONMENTS.development
          },
          {
            id: 'build-app',
            name: 'Build Application',
            description: 'Build the application',
            type: 'build',
            dependencies: ['lint-code', 'unit-tests'],
            status: 'pending',
            priority: 'critical',
            estimatedDuration: 5,
            retryCount: 0,
            maxRetries: 3,
            resources: [
              { type: 'cpu', amount: 2, unit: 'cores' },
              { type: 'memory', amount: 1024, unit: 'MB' }
            ],
            environment: this.DEFAULT_ENVIRONMENTS.development
          }
        ],
        environment: this.DEFAULT_ENVIRONMENTS.development,
        notifications: [
          {
            type: 'webhook',
            events: ['completed', 'failed'],
            recipients: ['build-system'],
            template: 'default'
          }
        ],
        retention: {
          builds: 10,
          artifacts: 30,
          logs: 7
        },
        parallel: true,
        maxConcurrency: 2,
        timeout: 30,
        failureStrategy: 'stop'
      },
      {
        id: 'full-ci-cd',
        name: 'Full CI/CD Pipeline',
        description: 'Complete build, test, and deployment pipeline',
        trigger: 'git-push',
        branches: ['main', 'master'],
        stages: [
          {
            id: 'install-deps',
            name: 'Install Dependencies',
            description: 'Install npm dependencies',
            type: 'build',
            dependencies: [],
            status: 'pending',
            priority: 'high',
            estimatedDuration: 3,
            retryCount: 0,
            maxRetries: 2,
            resources: [
              { type: 'cpu', amount: 1, unit: 'core' },
              { type: 'memory', amount: 512, unit: 'MB' }
            ],
            environment: this.DEFAULT_ENVIRONMENTS.production
          },
          {
            id: 'security-scan',
            name: 'Security Scan',
            description: 'Run security vulnerability scans',
            type: 'security',
            dependencies: ['install-deps'],
            status: 'pending',
            priority: 'critical',
            estimatedDuration: 5,
            retryCount: 0,
            maxRetries: 1,
            resources: [
              { type: 'cpu', amount: 1, unit: 'core' },
              { type: 'memory', amount: 1024, unit: 'MB' }
            ],
            environment: this.DEFAULT_ENVIRONMENTS.production
          },
          {
            id: 'lint-code',
            name: 'Lint Code',
            description: 'Run ESLint and code quality checks',
            type: 'quality',
            dependencies: ['install-deps'],
            status: 'pending',
            priority: 'medium',
            estimatedDuration: 2,
            retryCount: 0,
            maxRetries: 1,
            resources: [
              { type: 'cpu', amount: 0.5, unit: 'core' },
              { type: 'memory', amount: 256, unit: 'MB' }
            ],
            environment: this.DEFAULT_ENVIRONMENTS.production
          },
          {
            id: 'unit-tests',
            name: 'Unit Tests',
            description: 'Run unit tests with coverage',
            type: 'test',
            dependencies: ['install-deps'],
            status: 'pending',
            priority: 'high',
            estimatedDuration: 5,
            retryCount: 0,
            maxRetries: 2,
            resources: [
              { type: 'cpu', amount: 2, unit: 'cores' },
              { type: 'memory', amount: 1024, unit: 'MB' }
            ],
            environment: this.DEFAULT_ENVIRONMENTS.production
          },
          {
            id: 'integration-tests',
            name: 'Integration Tests',
            description: 'Run integration tests',
            type: 'test',
            dependencies: ['unit-tests'],
            status: 'pending',
            priority: 'high',
            estimatedDuration: 10,
            retryCount: 0,
            maxRetries: 2,
            resources: [
              { type: 'cpu', amount: 2, unit: 'cores' },
              { type: 'memory', amount: 2048, unit: 'MB' }
            ],
            environment: this.DEFAULT_ENVIRONMENTS.production
          },
          {
            id: 'performance-tests',
            name: 'Performance Tests',
            description: 'Run performance and load tests',
            type: 'performance',
            dependencies: ['integration-tests'],
            status: 'pending',
            priority: 'medium',
            estimatedDuration: 15,
            retryCount: 0,
            maxRetries: 1,
            resources: [
              { type: 'cpu', amount: 4, unit: 'cores' },
              { type: 'memory', amount: 4096, unit: 'MB' }
            ],
            environment: this.DEFAULT_ENVIRONMENTS.production
          },
          {
            id: 'build-app',
            name: 'Build Application',
            description: 'Build optimized production application',
            type: 'build',
            dependencies: ['security-scan', 'lint-code', 'unit-tests'],
            status: 'pending',
            priority: 'critical',
            estimatedDuration: 10,
            retryCount: 0,
            maxRetries: 3,
            resources: [
              { type: 'cpu', amount: 4, unit: 'cores' },
              { type: 'memory', amount: 2048, unit: 'MB' }
            ],
            environment: this.DEFAULT_ENVIRONMENTS.production
          },
          {
            id: 'package-app',
            name: 'Package Application',
            description: 'Package application for distribution',
            type: 'build',
            dependencies: ['build-app'],
            status: 'pending',
            priority: 'high',
            estimatedDuration: 5,
            retryCount: 0,
            maxRetries: 2,
            resources: [
              { type: 'cpu', amount: 2, unit: 'cores' },
              { type: 'memory', amount: 1024, unit: 'MB' }
            ],
            environment: this.DEFAULT_ENVIRONMENTS.production
          },
          {
            id: 'deploy-staging',
            name: 'Deploy to Staging',
            description: 'Deploy to staging environment',
            type: 'deploy',
            dependencies: ['package-app', 'integration-tests'],
            status: 'pending',
            priority: 'high',
            estimatedDuration: 8,
            retryCount: 0,
            maxRetries: 2,
            resources: [
              { type: 'cpu', amount: 1, unit: 'core' },
              { type: 'memory', amount: 512, unit: 'MB' }
            ],
            environment: this.DEFAULT_ENVIRONMENTS.production
          },
          {
            id: 'quality-gate',
            name: 'Quality Gate',
            description: 'Verify quality gates before production',
            type: 'quality',
            dependencies: ['deploy-staging', 'performance-tests'],
            status: 'pending',
            priority: 'critical',
            estimatedDuration: 2,
            retryCount: 0,
            maxRetries: 1,
            resources: [
              { type: 'cpu', amount: 0.5, unit: 'core' },
              { type: 'memory', amount: 256, unit: 'MB' }
            ],
            environment: this.DEFAULT_ENVIRONMENTS.production
          }
        ],
        environment: this.DEFAULT_ENVIRONMENTS.production,
        notifications: [
          {
            type: 'email',
            events: ['started', 'completed', 'failed'],
            recipients: ['dev-team@company.com'],
            template: 'detailed'
          },
          {
            type: 'slack',
            events: ['failed', 'warning'],
            recipients: ['#devops'],
            template: 'alert'
          }
        ],
        retention: {
          builds: 50,
          artifacts: 90,
          logs: 30
        },
        parallel: true,
        maxConcurrency: 1,
        timeout: 120,
        failureStrategy: 'stop'
      }
    ];

    for (const config of defaultConfigs) {
      this.pipelineConfigs.set(config.id, config);
    }
  }

  /**
   * Load default quality gates
   */
  private loadDefaultQualityGates(): void {
    const defaultGates: QualityGate[] = [
      {
        id: 'test-coverage',
        name: 'Test Coverage',
        description: 'Minimum test coverage requirement',
        conditions: [
          { metric: 'coverage.lines', operator: 'gte', value: 80, unit: '%' },
          { metric: 'coverage.functions', operator: 'gte', value: 85, unit: '%' },
          { metric: 'coverage.branches', operator: 'gte', value: 75, unit: '%' }
        ],
        action: 'fail',
        severity: 'high'
      },
      {
        id: 'security-vulnerabilities',
        name: 'Security Vulnerabilities',
        description: 'No critical or high severity security vulnerabilities',
        conditions: [
          { metric: 'security.critical', operator: 'eq', value: 0 },
          { metric: 'security.high', operator: 'eq', value: 0 }
        ],
        action: 'fail',
        severity: 'critical'
      },
      {
        id: 'performance-threshold',
        name: 'Performance Threshold',
        description: 'Performance metrics within acceptable limits',
        conditions: [
          { metric: 'performance.bundleSize', operator: 'lt', value: 2, unit: 'MB' },
          { metric: 'performance.firstContentfulPaint', operator: 'lt', value: 2000, unit: 'ms' },
          { metric: 'performance.largestContentfulPaint', operator: 'lt', value: 2500, unit: 'ms' }
        ],
        action: 'warn',
        severity: 'medium'
      },
      {
        id: 'code-quality',
        name: 'Code Quality',
        description: 'Code quality metrics',
        conditions: [
          { metric: 'quality.eslintErrors', operator: 'eq', value: 0 },
          { metric: 'quality.complexity', operator: 'lt', value: 10 },
          { metric: 'quality.duplicateLines', operator: 'lt', value: 5, unit: '%' }
        ],
        action: 'warn',
        severity: 'medium'
      }
    ];

    for (const gate of defaultGates) {
      this.qualityGates.set(gate.id, gate);
    }
  }

  /**
   * Load default deployment targets
   */
  private loadDefaultDeploymentTargets(): void {
    const defaultTargets: DeploymentTarget[] = [
      {
        id: 'staging-server',
        name: 'Staging Server',
        type: 'staging',
        platform: 'local',
        config: {
          host: 'staging.company.com',
          port: 3001,
          protocol: 'https'
        },
        healthCheck: {
          enabled: true,
          url: 'https://staging.company.com/health',
          expectedStatus: 200,
          timeout: 5000
        }
      },
      {
        id: 'production-cluster',
        name: 'Production Cluster',
        type: 'production',
        platform: 'kubernetes',
        config: {
          namespace: 'production',
          replicas: 3,
          resources: {
            cpu: '500m',
            memory: '1Gi'
          }
        },
        healthCheck: {
          enabled: true,
          url: 'https://api.company.com/health',
          expectedStatus: 200,
          timeout: 10000
        }
      }
    ];

    for (const target of defaultTargets) {
      this.deploymentTargets.set(target.id, target);
    }
  }

  /**
   * Set up event listeners
   */
  private setupEventListeners(): void {
    // Git service events
    this.gitService.on('push', (data) => {
      this.handleGitPush(data);
    });

    // Development tools integration events
    this.devToolsIntegration.on('session-created', (session) => {
      this.handleDevelopmentSession(session);
    });
  }

  /**
   * Start pipeline queue processor
   */
  private startPipelineQueueProcessor(): void {
    setInterval(() => {
      this.processPipelineQueue();
    }, 5000); // Check every 5 seconds
  }

  /**
   * Handle Git push events
   */
  private handleGitPush(data: any): void {
    const { branch, commit } = data;

    // Find pipeline configs that should trigger on this branch
    for (const config of this.pipelineConfigs.values()) {
      if (config.trigger === 'git-push' && config.branches.includes(branch)) {
        
        this.executePipeline(config.id, {
          type: 'git-push',
          branch,
          commit
        });
      }
    }
  }

  /**
   * Handle development session events
   */
  private handleDevelopmentSession(session: any): void {
    // Auto-trigger quick build for development sessions
    if (session.status === 'active') {
      const quickBuildConfig = this.pipelineConfigs.get('quick-build');
      if (quickBuildConfig) {
        this.executePipeline(quickBuildConfig.id, {
          type: 'development-session',
          user: session.participants[0]
        });
      }
    }
  }

  /**
   * Process pipeline queue
   */
  private async processPipelineQueue(): Promise<void> {
    if (this.isProcessingQueue || this.activeExecutions.size >= this.maxConcurrentPipelines) {
      return;
    }

    this.isProcessingQueue = true;

    try {
      while (this.buildQueue.length > 0 && this.activeExecutions.size < this.maxConcurrentPipelines) {
        const executionId = this.buildQueue.shift();
        if (executionId) {
          const execution = this.activeExecutions.get(executionId);
          if (execution && execution.status === 'pending') {
            await this.runPipeline(execution);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error processing pipeline queue:', error);
    } finally {
      this.isProcessingQueue = false;
    }
  }

  /**
   * Execute pipeline
   */
  async executePipeline(configId: string, trigger: any): Promise<string> {
    const config = this.pipelineConfigs.get(configId);
    if (!config) {
      throw new Error(`Pipeline config ${configId} not found`);
    }

    const executionId = `pipeline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const execution: PipelineExecution = {
      id: executionId,
      configId,
      status: 'pending',
      startTime: new Date(),
      stages: config.stages.map(stage => ({ ...stage })),
      artifacts: [],
      metrics: {
        totalStages: config.stages.length,
        completedStages: 0,
        failedStages: 0,
        skippedStages: 0,
        averageStageDuration: 0,
        totalArtifacts: 0,
        totalArtifactSize: 0,
        successRate: 0,
        throughput: 0
      },
      logs: [],
      trigger
    };

    this.activeExecutions.set(executionId, execution);
    this.buildQueue.push(executionId);

    this.emit('pipeline-queued', execution);

    return executionId;
  }

  /**
   * Run pipeline execution
   */
  private async runPipeline(execution: PipelineExecution): Promise<void> {
    const config = this.pipelineConfigs.get(execution.configId);
    if (!config) return;

    execution.status = 'running';
    this.emit('pipeline-started', execution);

    try {
      // Create swarm task for pipeline orchestration
      const task = {
        id: `pipeline-${execution.id}`,
        type: 'pipeline' as const,
        description: `Execute pipeline: ${config.name}`,
        requirements: ['pipeline-orchestration', 'resource-management'],
        priority: 'high',
        deadline: new Date(Date.now() + config.timeout * 60000),
        assignedAgent: 'pipeline-orchestrator'
      };

      const result = await this.swarmOrchestrator.submitTask(task);

      if (result.success) {
        // Execute stages
        await this.executePipelineStages(execution, config);

        // Check quality gates
        await this.checkQualityGates(execution);

        // Deploy if all stages successful
        if (execution.status === 'running') {
          await this.deployPipeline(execution, config);
        }

        execution.status = 'completed';
        execution.endTime = new Date();
        execution.duration = execution.endTime.getTime() - execution.startTime.getTime();

        this.emit('pipeline-completed', execution);

      } else {
        execution.status = 'failed';
        execution.endTime = new Date();
        execution.duration = execution.endTime.getTime() - execution.startTime.getTime();
        execution.stages.forEach(stage => {
          if (stage.status === 'running') {
            stage.status = 'failed';
            stage.error = 'Pipeline failed';
          }
        });

        this.emit('pipeline-failed', execution);
      }

    } catch (error) {
      execution.status = 'failed';
      execution.endTime = new Date();
      execution.duration = execution.endTime.getTime() - execution.startTime.getTime();

      console.error(`❌ Pipeline error: ${execution.id}`, error);
      this.emit('pipeline-error', { execution, error });
    }

    // Clean up
    this.activeExecutions.delete(execution.id);
    this.pipelineHistory.push(execution);

    // Keep only recent history
    if (this.pipelineHistory.length > this.maxHistorySize) {
      this.pipelineHistory = this.pipelineHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Execute pipeline stages
   */
  private async executePipelineStages(execution: PipelineExecution, config: PipelineConfig): Promise<void> {
    const stagesToExecute = this.getExecutableStages(execution.stages);

    for (const stage of stagesToExecute) {
      if (execution.status !== 'running') break;

      await this.executeStage(execution, stage, config);
    }
  }

  /**
   * Get executable stages (considering dependencies and parallel execution)
   */
  private getExecutableStages(stages: PipelineStage[]): PipelineStage[] {
    const completedStages = new Set(stages.filter(s => s.status === 'completed').map(s => s.id));
    const failedStages = new Set(stages.filter(s => s.status === 'failed').map(s => s.id));

    return stages.filter(stage => {
      // Check if all dependencies are completed
      const dependenciesMet = stage.dependencies.every(dep => completedStages.has(dep));

      // Check if stage hasn't failed
      const notFailed = !failedStages.has(stage.id);

      // Check if stage is pending
      const isPending = stage.status === 'pending';

      return dependenciesMet && notFailed && isPending;
    });
  }

  /**
   * Execute a single stage
   */
  private async executeStage(execution: PipelineExecution, stage: PipelineStage, config: PipelineConfig): Promise<void> {
    
    stage.status = 'running';
    stage.startTime = new Date();
    this.emit('stage-started', { execution, stage });

    try {
      // Create swarm task for stage execution
      const task = {
        id: `stage-${stage.id}-${execution.id}`,
        type: 'stage-execution' as const,
        description: `Execute stage: ${stage.name}`,
        requirements: [stage.type],
        priority: stage.priority === 'critical' ? 'high' : 'medium',
        deadline: new Date(Date.now() + stage.estimatedDuration * 60000),
        assignedAgent: this.getAgentForStage(stage)
      };

      const result = await this.swarmOrchestrator.submitTask(task);

      if (result.success) {
        stage.status = 'completed';
        stage.endTime = new Date();
        stage.actualDuration = stage.endTime.getTime() - stage.startTime.getTime();
        stage.output = result.output;

        // Update execution metrics
        execution.metrics.completedStages++;

        this.emit('stage-completed', { execution, stage });

      } else {
        stage.status = 'failed';
        stage.endTime = new Date();
        stage.actualDuration = stage.endTime.getTime() - stage.startTime.getTime();
        stage.error = result.error || 'Stage execution failed';

        // Update execution metrics
        execution.metrics.failedStages++;

        this.emit('stage-failed', { execution, stage });

        // Handle failure strategy
        if (config.failureStrategy === 'stop') {
          execution.status = 'failed';
        }
      }

    } catch (error) {
      stage.status = 'failed';
      stage.endTime = new Date();
      stage.actualDuration = stage.endTime.getTime() - stage.startTime.getTime();
      stage.error = error instanceof Error ? error.message : 'Unknown error';

      // Update execution metrics
      execution.metrics.failedStages++;

      console.error(`❌ Stage error: ${stage.name}`, error);
      this.emit('stage-error', { execution, stage, error });

      // Handle failure strategy
      if (config.failureStrategy === 'stop') {
        execution.status = 'failed';
      }
    }
  }

  /**
   * Get appropriate agent for stage type
   */
  private getAgentForStage(stage: PipelineStage): string {
    const agentMap: Record<string, string> = {
      'build': 'code-generator',
      'test': 'tester',
      'deploy': 'architect',
      'security': 'optimizer',
      'performance': 'optimizer',
      'quality': 'tester'
    };

    return agentMap[stage.type] || 'code-generator';
  }

  /**
   * Check quality gates
   */
  private async checkQualityGates(execution: PipelineExecution): Promise<void> {
    
    for (const gate of this.qualityGates.values()) {
      const passed = await this.evaluateQualityGate(gate, execution);

      if (!passed) {
        if (gate.action === 'fail') {
          execution.status = 'failed';
          
          this.emit('quality-gate-failed', { execution, gate });
          break;
        } else if (gate.action === 'warn') {
          
          this.emit('quality-gate-warning', { execution, gate });
        }
      } else {
        
        this.emit('quality-gate-passed', { execution, gate });
      }
    }
  }

  /**
   * Evaluate quality gate
   */
  private async evaluateQualityGate(gate: QualityGate, execution: PipelineExecution): Promise<boolean> {
    for (const condition of gate.conditions) {
      const actualValue = this.getMetricValue(execution, condition.metric);

      if (!this.evaluateCondition(actualValue, condition.operator, condition.value)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get metric value from execution
   */
  private getMetricValue(execution: PipelineExecution, metricPath: string): number {
    // Extract metric from execution stages and artifacts
    const parts = metricPath.split('.');
    let value = 0;

    // Simple metric extraction logic
    switch (metricPath) {
      case 'coverage.lines':
        value = 85; // Mock value
        break;
      case 'coverage.functions':
        value = 90; // Mock value
        break;
      case 'coverage.branches':
        value = 80; // Mock value
        break;
      case 'security.critical':
        value = 0; // Mock value
        break;
      case 'security.high':
        value = 0; // Mock value
        break;
      case 'performance.bundleSize':
        value = 1.5; // Mock value in MB
        break;
      case 'performance.firstContentfulPaint':
        value = 1500; // Mock value in ms
        break;
      case 'performance.largestContentfulPaint':
        value = 2000; // Mock value in ms
        break;
      case 'quality.eslintErrors':
        value = 0; // Mock value
        break;
      case 'quality.complexity':
        value = 5; // Mock value
        break;
      case 'quality.duplicateLines':
        value = 2; // Mock value in %
        break;
      default:
        value = 0;
    }

    return value;
  }

  /**
   * Evaluate condition
   */
  private evaluateCondition(actual: number, operator: string, expected: number): boolean {
    switch (operator) {
      case 'gt': return actual > expected;
      case 'gte': return actual >= expected;
      case 'lt': return actual < expected;
      case 'lte': return actual <= expected;
      case 'eq': return actual === expected;
      case 'ne': return actual !== expected;
      default: return false;
    }
  }

  /**
   * Deploy pipeline
   */
  private async deployPipeline(execution: PipelineExecution, config: PipelineConfig): Promise<void> {
    if (execution.status !== 'running') return;

    // Find deployment stage
    const deployStage = execution.stages.find(s => s.type === 'deploy' && s.status === 'completed');
    if (!deployStage) return;

    // Get deployment target
    const target = this.deploymentTargets.get('production-cluster');
    if (!target) return;

    // Create deployment task
    const task = {
      id: `deploy-${execution.id}`,
      type: 'deployment' as const,
      description: `Deploy pipeline ${execution.id} to ${target.name}`,
      requirements: ['deployment', 'container-orchestration'],
      priority: 'high',
      deadline: new Date(Date.now() + 300000), // 5 minutes
      assignedAgent: 'architect'
    };

    const result = await this.swarmOrchestrator.submitTask(task);

    if (result.success) {
      
      this.emit('deployment-completed', { execution, target });
    } else {
      
      this.emit('deployment-failed', { execution, target, error: result.error });
    }
  }

  // Public API methods
  getPipelineConfigs(): PipelineConfig[] {
    return Array.from(this.pipelineConfigs.values());
  }

  getPipelineConfig(id: string): PipelineConfig | undefined {
    return this.pipelineConfigs.get(id);
  }

  getActiveExecutions(): PipelineExecution[] {
    return Array.from(this.activeExecutions.values());
  }

  getPipelineExecution(id: string): PipelineExecution | undefined {
    return this.activeExecutions.get(id) || this.pipelineHistory.find(h => h.id === id);
  }

  getPipelineHistory(limit = 10): PipelineExecution[] {
    return this.pipelineHistory.slice(-limit);
  }

  getQualityGates(): QualityGate[] {
    return Array.from(this.qualityGates.values());
  }

  getDeploymentTargets(): DeploymentTarget[] {
    return Array.from(this.deploymentTargets.values());
  }

  createPipelineConfig(config: Omit<PipelineConfig, 'id'>): string {
    const id = `pipeline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const pipelineConfig: PipelineConfig = { ...config, id };

    this.pipelineConfigs.set(id, pipelineConfig);
    
    this.emit('pipeline-config-created', pipelineConfig);

    return id;
  }

  updatePipelineConfig(id: string, updates: Partial<PipelineConfig>): void {
    const config = this.pipelineConfigs.get(id);
    if (config) {
      const updatedConfig = { ...config, ...updates };
      this.pipelineConfigs.set(id, updatedConfig);
      
      this.emit('pipeline-config-updated', updatedConfig);
    }
  }

  deletePipelineConfig(id: string): void {
    if (this.pipelineConfigs.delete(id)) {
      
      this.emit('pipeline-config-deleted', id);
    }
  }

  cancelPipeline(executionId: string): void {
    const execution = this.activeExecutions.get(executionId);
    if (execution && execution.status === 'running') {
      execution.status = 'cancelled';
      execution.endTime = new Date();
      execution.duration = execution.endTime.getTime() - execution.startTime.getTime();

      // Mark running stages as cancelled
      execution.stages.forEach(stage => {
        if (stage.status === 'running') {
          stage.status = 'failed';
          stage.error = 'Pipeline cancelled';
        }
      });

      this.emit('pipeline-cancelled', execution);
    }
  }

  getSystemStatus(): {
    activePipelines: number;
    queuedPipelines: number;
    totalConfigs: number;
    totalQualityGates: number;
    totalDeploymentTargets: number;
    averageBuildTime: number;
    successRate: number;
  } {
    const completedPipelines = this.pipelineHistory.filter(p => p.status === 'completed');
    const averageBuildTime = completedPipelines.length > 0
      ? completedPipelines.reduce((sum, p) => sum + (p.duration || 0), 0) / completedPipelines.length
      : 0;

    const successRate = this.pipelineHistory.length > 0
      ? (completedPipelines.length / this.pipelineHistory.length) * 100
      : 0;

    return {
      activePipelines: this.activeExecutions.size,
      queuedPipelines: this.buildQueue.length,
      totalConfigs: this.pipelineConfigs.size,
      totalQualityGates: this.qualityGates.size,
      totalDeploymentTargets: this.deploymentTargets.size,
      averageBuildTime,
      successRate
    };
  }

  stop(): void {
    // Cancel all active pipelines
    for (const execution of this.activeExecutions.values()) {
      if (execution.status === 'running') {
        this.cancelPipeline(execution.id);
      }
    }

    this.activeExecutions.clear();
    this.buildQueue.length = 0;
    this.isProcessingQueue = false;

  }
}

export default BuildPipelineSystem;