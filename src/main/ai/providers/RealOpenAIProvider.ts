// Real AI Provider Implementation - OpenAI Integration
import axios from 'axios';
import { AIRequest, AIResponse, AIOperationKind } from '../../../shared/aiTypes';
import { AIProvider } from '../providerRegistry';

export class RealOpenAIProvider implements AIProvider {
  id = 'openai';
  name = 'OpenAI Provider';
  supports = new Set<AIOperationKind>(['chat', 'inline-complete', 'planning', 'refactor']);

  async invoke(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();
    
    try {
      // Mock implementation for now
      const content = `[mock:${request.operation}] ${request.prompt.slice(0, 600)}`;
      
      return {
        id: `prov_mock_${Date.now()}`,
        requestId: request.id,
        operation: request.operation,
        role: 'assistant',
        content,
        createdAt: Date.now(),
        meta: { 
          mock: true, 
          provider: this.id, 
          latencyMs: Date.now() - startTime 
        }
      };
    } catch (error: any) {
      return {
        id: `prov_mock_${Date.now()}`,
        requestId: request.id,
        operation: request.operation,
        role: 'assistant',
        content: 'Error processing request',
        createdAt: Date.now(),
        meta: { 
          mock: true, 
          provider: this.id, 
          latencyMs: Date.now() - startTime,
          error: error.message 
        }
      };
    }
  }

  async *stream(request: AIRequest, opts?: { signal?: AbortSignal }): AsyncGenerator<{ delta: string; done?: boolean }, void, unknown> {
    // Mock streaming implementation
    const content = `[mock:${request.operation}] ${request.prompt.slice(0, 600)}`;
    const words = content.split(' ');
    
    for (const word of words) {
      yield { delta: word + ' ' };
      // Add a small delay to simulate streaming
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    yield { delta: '', done: true };
  }

  // Format context for the AI request
  private formatContext(context: any): string {
    return JSON.stringify(context, null, 2);
  }
}
