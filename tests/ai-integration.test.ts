// AI Integration Test Suite
import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import { OpenAIProvider } from '../src/main/ai/providers/openAIProviderReal';
import { AIRequest, AIResponse } from '../src/shared/aiTypes';

describe('AI Integration Tests', () => {
  let provider: OpenAIProvider;
  let hasRealAPIKey = false;

  beforeAll(() => {
    // Check for API key
    hasRealAPIKey = !!process.env.OPENAI_API_KEY;
    
    provider = new OpenAIProvider({
      apiKey: process.env.OPENAI_API_KEY || 'test-key',
      model: 'gpt-4-turbo-preview'
    });
  });

  describe('Provider Initialization', () => {
    it('should initialize with correct ID and name', () => {
      expect(provider.id).toBe('openai');
      expect(provider.name).toBe('OpenAI');
    });

    it('should support all expected operations', () => {
      expect(provider.supports).toContain('chat');
      expect(provider.supports).toContain('completion');
      expect(provider.supports).toContain('refactoring');
      expect(provider.supports).toContain('explanation');
      expect(provider.supports).toContain('planning');
    });
  });

  describe('Mock Responses (No API Key)', () => {
    it('should return mock response when no API key', async () => {
      if (hasRealAPIKey) {
        console.log('Skipping mock test - real API key found');
        return;
      }

      const request: AIRequest = {
        id: 'test-1',
        operation: 'chat',
        prompt: 'Hello',
        includeContext: false
      };

      const response = await provider.invoke(request);
      
      expect(response).toBeDefined();
      expect(response.id).toBe(request.id);
      expect(response.meta?.isMock).toBe(true);
      expect(response.content).toContain('Mock Response');
    });

    it('should provide mock stream when no API key', async () => {
      if (hasRealAPIKey) {
        console.log('Skipping mock stream test - real API key found');
        return;
      }

      const request: AIRequest = {
        id: 'test-2',
        operation: 'chat',
        prompt: 'Stream test',
        includeContext: false
      };

      const chunks: any[] = [];
      for await (const chunk of provider.stream(request)) {
        chunks.push(chunk);
      }

      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[chunks.length - 1].isComplete).toBe(true);
    });
  });

  describe('Real API Tests (With API Key)', () => {
    it('should make real API call with valid key', async () => {
      if (!hasRealAPIKey) {
        console.log('Skipping real API test - no API key found');
        return;
      }

      const request: AIRequest = {
        id: 'test-real-1',
        operation: 'chat',
        prompt: 'Say "Hello from OpenAI" and nothing else',
        includeContext: false
      };

      const response = await provider.invoke(request);
      
      expect(response).toBeDefined();
      expect(response.content).toBeTruthy();
      expect(response.meta?.isMock).toBeFalsy();
      expect(response.meta?.model).toContain('gpt');
      expect(response.meta?.tokensUsed).toBeGreaterThan(0);
    }, 30000); // 30 second timeout for API call

    it('should stream real responses', async () => {
      if (!hasRealAPIKey) {
        console.log('Skipping real stream test - no API key found');
        return;
      }

      const request: AIRequest = {
        id: 'test-stream-1',
        operation: 'chat',
        prompt: 'Count from 1 to 5',
        includeContext: false
      };

      let fullContent = '';
      let chunkCount = 0;
      
      for await (const chunk of provider.stream(request)) {
        if (chunk.delta && !chunk.delta.startsWith('__')) {
          fullContent += chunk.delta;
          chunkCount++;
        }
      }

      expect(chunkCount).toBeGreaterThan(1);
      expect(fullContent).toBeTruthy();
      expect(fullContent).toContain('1');
      expect(fullContent).toContain('5');
    }, 30000);

    it('should handle context correctly', async () => {
      if (!hasRealAPIKey) {
        console.log('Skipping context test - no API key found');
        return;
      }

      const request: AIRequest = {
        id: 'test-context-1',
        operation: 'explanation',
        prompt: 'Explain the selected code',
        includeContext: true,
        context: {
          selection: {
            code: 'const x = 42;',
            language: 'javascript'
          },
          currentFile: {
            path: 'test.js',
            language: 'javascript'
          }
        }
      };

      const response = await provider.invoke(request);
      
      expect(response).toBeDefined();
      expect(response.content.toLowerCase()).toContain('const');
      expect(response.content).toContain('42');
    }, 30000);
  });

  describe('Operation-Specific Behavior', () => {
    it('should use appropriate temperature for completion', async () => {
      const request: AIRequest = {
        id: 'test-completion',
        operation: 'completion',
        prompt: 'function fibonacci(',
        includeContext: false
      };

      const response = await provider.invoke(request);
      expect(response.operation).toBe('completion');
    });

    it('should handle refactoring requests', async () => {
      const request: AIRequest = {
        id: 'test-refactor',
        operation: 'refactoring',
        prompt: 'Refactor this code',
        includeContext: true,
        context: {
          selection: {
            code: 'var x = 1; var y = 2; var z = x + y;',
            language: 'javascript'
          }
        }
      };

      const response = await provider.invoke(request);
      expect(response.operation).toBe('refactoring');
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      const badProvider = new OpenAIProvider({
        apiKey: 'invalid-key',
        baseUrl: 'https://invalid-url-that-does-not-exist.com'
      });

      const request: AIRequest = {
        id: 'test-error',
        operation: 'chat',
        prompt: 'Test',
        includeContext: false
      };

      const response = await badProvider.invoke(request);
      
      expect(response).toBeDefined();
      expect(response.meta?.error).toBeTruthy();
    });

    it('should handle abort signals in streaming', async () => {
      const controller = new AbortController();
      const request: AIRequest = {
        id: 'test-abort',
        operation: 'chat',
        prompt: 'Write a very long story',
        includeContext: false
      };

      setTimeout(() => controller.abort(), 100);

      let aborted = false;
      for await (const chunk of provider.stream(request, controller.signal)) {
        if (chunk.delta === '__info:cancelled') {
          aborted = true;
          break;
        }
      }

      expect(aborted).toBe(true);
    });
  });

  describe('Cost Estimation', () => {
    it('should provide cost estimates', async () => {
      const request: AIRequest = {
        id: 'test-cost',
        operation: 'chat',
        prompt: 'Hello',
        includeContext: false
      };

      const response = await provider.invoke(request);
      
      if (response.meta?.costEst) {
        expect(response.meta.costEst).toBeGreaterThan(0);
        expect(response.meta.costEst).toBeLessThan(1); // Should be less than $1
      }
    });
  });

  describe('Performance', () => {
    it('should respond within reasonable time', async () => {
      const request: AIRequest = {
        id: 'test-perf',
        operation: 'chat',
        prompt: 'Hi',
        includeContext: false
      };

      const start = Date.now();
      const response = await provider.invoke(request);
      const duration = Date.now() - start;

      expect(response).toBeDefined();
      
      if (hasRealAPIKey) {
        expect(duration).toBeLessThan(10000); // 10 seconds max
        expect(response.meta?.latency).toBeLessThan(10000);
      } else {
        expect(duration).toBeLessThan(1000); // Mock should be instant
      }
    });

    it('should handle concurrent requests', async () => {
      const requests = Array.from({ length: 5 }, (_, i) => ({
        id: `concurrent-${i}`,
        operation: 'chat' as const,
        prompt: `Request ${i}`,
        includeContext: false
      }));

      const promises = requests.map(req => provider.invoke(req));
      const responses = await Promise.all(promises);

      expect(responses).toHaveLength(5);
      responses.forEach((resp, i) => {
        expect(resp.id).toBe(`concurrent-${i}`);
      });
    });
  });
});

// Real-world use case tests
describe('Real-World AI Use Cases', () => {
  let provider: OpenAIProvider;

  beforeAll(() => {
    provider = new OpenAIProvider();
  });

  it('should explain complex code', async () => {
    const request: AIRequest = {
      id: 'explain-complex',
      operation: 'explanation',
      prompt: 'Explain this React hook',
      includeContext: true,
      context: {
        selection: {
          code: `
            const useDebounce = (value, delay) => {
              const [debouncedValue, setDebouncedValue] = useState(value);
              
              useEffect(() => {
                const handler = setTimeout(() => {
                  setDebouncedValue(value);
                }, delay);
                
                return () => clearTimeout(handler);
              }, [value, delay]);
              
              return debouncedValue;
            };
          `,
          language: 'typescript'
        }
      }
    };

    const response = await provider.invoke(request);
    expect(response.content).toBeTruthy();
    expect(response.content.length).toBeGreaterThan(100);
  });

  it('should generate unit tests', async () => {
    const request: AIRequest = {
      id: 'generate-tests',
      operation: 'completion',
      prompt: 'Generate Jest tests for this function',
      includeContext: true,
      context: {
        selection: {
          code: `
            function calculateDiscount(price, percentage) {
              if (percentage < 0 || percentage > 100) {
                throw new Error('Invalid percentage');
              }
              return price * (1 - percentage / 100);
            }
          `,
          language: 'javascript'
        }
      }
    };

    const response = await provider.invoke(request);
    expect(response.content).toContain('describe');
    expect(response.content).toContain('expect');
  });

  it('should refactor legacy code', async () => {
    const request: AIRequest = {
      id: 'refactor-legacy',
      operation: 'refactoring',
      prompt: 'Modernize this code to ES6+',
      includeContext: true,
      context: {
        selection: {
          code: `
            var obj = {
              init: function() {
                var self = this;
                setTimeout(function() {
                  self.doSomething();
                }, 1000);
              },
              doSomething: function() {
                console.log('done');
              }
            };
          `,
          language: 'javascript'
        }
      }
    };

    const response = await provider.invoke(request);
    expect(response.content).toContain('=>'); // Arrow functions
    expect(response.content).toContain('const'); // Modern declarations
  });
});

export { hasRealAPIKey };
