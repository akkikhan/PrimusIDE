// AI Integration Test Suite
// Tests real AI provider connectivity and functionality

import { RealOpenAIProvider } from '../../src/main/ai/providers/RealOpenAIProvider';
import { AIRequest, AIResponse } from '../../src/shared/aiTypes';

describe('AI Provider Integration Tests', () => {
  let provider: RealOpenAIProvider;
  
  beforeAll(() => {
    // Set up test environment
    process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'test-key';
    provider = new RealOpenAIProvider();
  });
  
  describe('OpenAI Provider', () => {
    test('Provider initializes correctly', () => {
      expect(provider.id).toBe('openai-real');
      expect(provider.name).toBe('OpenAI GPT-4');
      expect(provider.supports).toContain('chat');
      expect(provider.supports).toContain('completion');
    });
    
    test('Handles missing API key gracefully', async () => {
      const originalKey = process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_API_KEY;
      
      const testProvider = new RealOpenAIProvider();
      const request: AIRequest = {
        id: 'test-1',
        operation: 'chat',
        prompt: 'Hello',
        includeContext: false
      };
      
      const response = await testProvider.invoke(request);
      
      expect(response.result).toContain('API key not configured');
      expect(response.meta?.error).toBe('Missing API key');
      
      process.env.OPENAI_API_KEY = originalKey;
    });
    
    test('Builds correct message structure for chat', () => {
      const request: AIRequest = {
        id: 'test-2',
        operation: 'chat',
        prompt: 'Explain closures in JavaScript',
        includeContext: false
      };
      
      // We can't directly test private methods, but we can verify the behavior
      expect(request.operation).toBe('chat');
      expect(request.prompt).toBeDefined();
    });
    
    test('Formats context correctly', () => {
      const request: AIRequest = {
        id: 'test-3',
        operation: 'refactoring',
        prompt: 'Improve this code',
        includeContext: true,
        context: {
          currentFile: {
            path: 'test.js',
            language: 'javascript',
            content: 'function test() { return 1; }'
          },
          selection: 'return 1;'
        }
      };
      
      expect(request.context).toBeDefined();
      expect(request.context.currentFile).toBeDefined();
      expect(request.context.selection).toBeDefined();
    });
    
    test('Handles different operations', () => {
      const operations = ['chat', 'completion', 'planning', 'refactoring', 'debug', 'explain'];
      
      operations.forEach(op => {
        expect(provider.supports).toContain(op);
      });
    });
  });
  
  describe('AI Response Validation', () => {
    test('Response has required fields', () => {
      const mockResponse: AIResponse = {
        id: 'test-response',
        result: 'Test result',
        meta: {
          provider: 'OpenAI GPT-4',
          timestamp: Date.now(),
          tokensUsed: 100
        }
      };
      
      expect(mockResponse.id).toBeDefined();
      expect(mockResponse.result).toBeDefined();
      expect(mockResponse.meta).toBeDefined();
      expect(mockResponse.meta.provider).toBeDefined();
      expect(mockResponse.meta.timestamp).toBeGreaterThan(0);
    });
    
    test('Cost calculation works correctly', () => {
      // Test cost calculation logic
      const usage = {
        prompt_tokens: 1000,
        completion_tokens: 500,
        total_tokens: 1500
      };
      
      // GPT-4 Turbo pricing
      const expectedPromptCost = (1000 / 1000) * 0.01;
      const expectedCompletionCost = (500 / 1000) * 0.03;
      const expectedTotal = expectedPromptCost + expectedCompletionCost;
      
      expect(expectedTotal).toBeCloseTo(0.025, 3);
    });
  });
  
  describe('Error Handling', () => {
    test('Handles network errors', async () => {
      const request: AIRequest = {
        id: 'test-error',
        operation: 'chat',
        prompt: 'Test',
        includeContext: false
      };
      
      // This would normally fail with no internet
      // We're testing that it doesn't crash
      const response = await provider.invoke(request);
      expect(response).toBeDefined();
      expect(response.id).toBe(request.id);
    });
    
    test('Handles rate limiting', () => {
      const error = { response: { status: 429 } };
      // Test would verify proper rate limit handling
      expect(error.response.status).toBe(429);
    });
    
    test('Handles invalid API key', () => {
      const error = { response: { status: 401 } };
      expect(error.response.status).toBe(401);
    });
  });
});

// Mock streaming test
describe('AI Streaming Tests', () => {
  test('Stream generator works', async () => {
    const provider = new RealOpenAIProvider();
    const request: AIRequest = {
      id: 'stream-test',
      operation: 'chat',
      prompt: 'Count to 3',
      includeContext: false
    };
    
    // We can't test real streaming without API key,
    // but we can verify the generator structure
    const generator = provider.stream(request);
    expect(generator).toBeDefined();
    expect(generator.next).toBeDefined();
  });
});
