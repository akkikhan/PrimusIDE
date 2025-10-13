// Mock AI Service for development/fallback scenarios
export class MockAIService {
  private static instance: MockAIService;
  
  static getInstance(): MockAIService {
    if (!MockAIService.instance) {
      MockAIService.instance = new MockAIService();
    }
    return MockAIService.instance;
  }

  async initialize(): Promise<void> {
    
    return Promise.resolve();
  }

  async getProviders(): Promise<any[]> {
    return [
      { id: 'mock', name: 'Mock Provider', available: true }
    ];
  }

  async generateCompletion(prompt: string): Promise<string> {
    // Simulate AI response
    return `Mock AI response for: "${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}"`;
  }

  async embedText(text: string): Promise<number[]> {
    // Generate mock embedding vector
    return Array.from({ length: 384 }, () => Math.random() - 0.5);
  }

  isAvailable(): boolean {
    return true;
  }

  getStatus(): { ready: boolean; error?: string } {
    return { ready: true };
  }
}

// Export as default for easy import
export default MockAIService;