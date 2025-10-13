import { AIService } from './AIService';
import { AgentContextManager } from './AgentContextManager';
import { SwarmOrchestrator } from './SwarmOrchestrator';
import { AdvancedAISystem } from './AdvancedAISystem';
import { AdvancedGitService } from '../services/AdvancedGitService';
import type { AdvancedTerminalService } from '../services/AdvancedTerminalService';
import type { AdvancedTestingService } from '../services/AdvancedTestingService';
import type { AdvancedDiagnosticsService } from '../services/AdvancedDiagnosticsService';
import type { DevelopmentToolsIntegrationService } from '../services/DevelopmentToolsIntegrationService';

export interface AdvancedAIEnvironment {
  aiService: AIService;
  agentContextManager: AgentContextManager;
  swarmOrchestrator: SwarmOrchestrator;
  advancedAISystem: AdvancedAISystem;
  advancedGitService: AdvancedGitService;
  advancedTerminalService?: AdvancedTerminalService;
  advancedTestingService?: AdvancedTestingService;
  advancedDiagnosticsService?: AdvancedDiagnosticsService;
  developmentToolsService?: DevelopmentToolsIntegrationService;
}

let environmentPromise: Promise<AdvancedAIEnvironment> | null = null;
let cachedEnvironment: AdvancedAIEnvironment | null = null;

async function createEnvironment(): Promise<AdvancedAIEnvironment> {
  const agentContextManager = AgentContextManager.getInstance();
  const aiService = new AIService();

  try {
    await aiService.initialize({
      specialty: 'universal-orchestrator',
      capabilities: ['analysis', 'planning', 'code-generation'],
      agentId: 'advanced-system'
    });
  } catch (error) {
    console.warn('[AdvancedAI] AIService initialization failed (continuing with fallback configuration):', error);
  }

  const swarmOrchestrator = new SwarmOrchestrator();
  const advancedAISystem = new AdvancedAISystem(aiService, agentContextManager, swarmOrchestrator);

  try {
    await advancedAISystem.initialize();
  } catch (error) {
    console.error('[AdvancedAI] Failed to initialize AdvancedAISystem:', error);
  }

  const advancedGitService = new AdvancedGitService(advancedAISystem, swarmOrchestrator);

  const environment: AdvancedAIEnvironment = {
    aiService,
    agentContextManager,
    swarmOrchestrator,
    advancedAISystem,
    advancedGitService
  };

  cachedEnvironment = environment;
  return environment;
}

export function ensureAdvancedAIEnvironment(): Promise<AdvancedAIEnvironment> {
  if (!environmentPromise) {
    environmentPromise = createEnvironment();
  }
  return environmentPromise;
}

export function getAdvancedAIEnvironmentSync(): AdvancedAIEnvironment | null {
  return cachedEnvironment;
}

