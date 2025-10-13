import { MockAIService } from './MockAIService';

/**
 * AI Service Manager - Handles initialization and fallback
 */
export class AIServiceManager {
  private static instance: AIServiceManager;
  private aiService: any = null;
  private isInitialized = false;
  private initializationError: string | null = null;

  static getInstance(): AIServiceManager {
    if (!AIServiceManager.instance) {
      AIServiceManager.instance = new AIServiceManager();
    }
    return AIServiceManager.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Try to load the full AI service
      const { AIService } = await import('./AIService');
      this.aiService = new AIService();
      await this.aiService.initialize();
      
    } catch (error) {
      console.warn('[AIServiceManager] Failed to initialize full AI service, using mock fallback:', error);
      this.aiService = MockAIService.getInstance();
      await this.aiService.initialize();
      this.initializationError = error instanceof Error ? error.message : String(error);
    }

    this.isInitialized = true;
  }

  getService(): any {
    if (!this.isInitialized) {
      throw new Error('AI Service not initialized. Call initialize() first.');
    }
    return this.aiService;
  }

  isReady(): boolean {
    return this.isInitialized && this.aiService !== null;
  }

  getStatus(): { ready: boolean; usingMock: boolean; error?: string } {
    return {
      ready: this.isInitialized,
      usingMock: this.aiService instanceof MockAIService,
      error: this.initializationError || undefined
    };
  }

  async getProviders(): Promise<any[]> {
    if (!this.isReady()) {
      await this.initialize();
    }
    return this.aiService.getProviders ? await this.aiService.getProviders() : [];
  }
}

// Export singleton instance
export const aiServiceManager = AIServiceManager.getInstance();