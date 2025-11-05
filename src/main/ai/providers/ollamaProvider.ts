import type { AIRequest, AIInvokeResult, AIResponse } from '../../../shared/aiTypes.js';
import type { AIProvider } from '../providerRegistry.js';

interface OllamaProviderOptions {
  baseUrl: string; // e.g., http://74.235.185.195:11434
  model: string;   // e.g., mistral:7b-instruct
  timeoutMs?: number;
}

export class OllamaProvider implements AIProvider {
  id = 'ollama';
  name = 'Ollama Local Provider';
  supports = new Set<AIRequest['operation']>(['chat','explain','refactor','inline-complete','planning','tests']);
  private opts: OllamaProviderOptions;

  constructor(opts: OllamaProviderOptions) {
    this.opts = { timeoutMs: 120000, ...opts }; // 2 minutes default for local models
  }

  async invoke(req: AIRequest): Promise<AIInvokeResult> {
    const started = Date.now();
    
    // Build system prompt based on operation
    let systemPrompt = '';
    if (req.operation === 'planning') {
      systemPrompt = 'You are a senior software planning assistant. Return concise, actionable steps.';
    } else if (req.operation === 'refactor') {
      systemPrompt = 'Focus on safe, minimal diff refactors. Preserve existing functionality.';
    } else if (req.operation === 'explain') {
      systemPrompt = 'Explain code clearly and concisely with examples when helpful.';
    } else if (req.operation === 'tests') {
      systemPrompt = 'Generate comprehensive unit tests with edge cases.';
    }

    // Combine system and user prompt
    const fullPrompt = systemPrompt 
      ? `${systemPrompt}\n\n${req.prompt}`
      : req.prompt;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.opts.timeoutMs);

    try {
      const response = await fetch(`${this.opts.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.opts.model,
          prompt: fullPrompt,
          stream: false,
          options: {
            temperature: 0.2,
            top_p: 0.9,
            top_k: 40
          }
        }),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const text = await response.text();
        return { 
          error: `Ollama error ${response.status}: ${text}`, 
          requestId: req.id 
        };
      }

      const json: any = await response.json();
      const content = json.response || '(no content)';
      
      const aiResp: AIResponse = {
        id: `ollama_${Date.now()}`,
        requestId: req.id,
        operation: req.operation,
        role: 'assistant',
        content,
        createdAt: Date.now(),
        meta: { 
          mock: false, 
          provider: this.id, 
          latencyMs: Date.now() - started, 
          model: this.opts.model,
          totalDuration: json.total_duration,
          loadDuration: json.load_duration,
          promptEvalCount: json.prompt_eval_count,
          evalCount: json.eval_count
        }
      };
      
      return aiResp;
    } catch (e: any) {
      clearTimeout(timeout);
      return { 
        error: `Ollama invoke failed: ${e?.message || e}`, 
        requestId: req.id 
      };
    }
  }

  // Streaming variant for real-time responses
  async *stream(req: AIRequest, opts?: { signal?: AbortSignal }): AsyncGenerator<{ delta: string; done?: boolean }, void, unknown> {
    // Build system prompt based on operation
    let systemPrompt = '';
    if (req.operation === 'planning') {
      systemPrompt = 'You are a senior software planning assistant. Return concise, actionable steps.';
    } else if (req.operation === 'refactor') {
      systemPrompt = 'Focus on safe, minimal diff refactors. Preserve existing functionality.';
    } else if (req.operation === 'explain') {
      systemPrompt = 'Explain code clearly and concisely with examples when helpful.';
    } else if (req.operation === 'tests') {
      systemPrompt = 'Generate comprehensive unit tests with edge cases.';
    }

    const fullPrompt = systemPrompt 
      ? `${systemPrompt}\n\n${req.prompt}`
      : req.prompt;

    const controller = new AbortController();
    const external = opts?.signal;
    if (external) {
      if (external.aborted) controller.abort();
      else external.addEventListener('abort', () => controller.abort(), { once: true });
    }

    const timeout = setTimeout(() => controller.abort(), this.opts.timeoutMs);

    try {
      const resp = await fetch(`${this.opts.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.opts.model,
          prompt: fullPrompt,
          stream: true,
          options: {
            temperature: 0.2,
            top_p: 0.9,
            top_k: 40
          }
        }),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!resp.ok) {
        const text = await resp.text();
        yield { delta: `__error: Ollama stream error ${resp.status}: ${text}`, done: true };
        return;
      }

      const reader = resp.body?.getReader();
      if (!reader) {
        yield { delta: '__error: no stream body', done: true };
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split(/\n/);
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          try {
            const json = JSON.parse(trimmed);
            
            // Ollama sends response text in chunks
            if (json.response) {
              yield { delta: json.response };
            }
            
            // Check if done
            if (json.done) {
              yield { delta: '', done: true };
              return;
            }
          } catch (e) {
            // Ignore parse errors for incomplete JSON
          }
        }
      }

      // Process any remaining buffer
      if (buffer.length) {
        try {
          const json = JSON.parse(buffer.trim());
          if (json.response) {
            yield { delta: json.response };
          }
          if (json.done) {
            yield { delta: '', done: true };
            return;
          }
        } catch (e) {
          // Ignore
        }
      }

      yield { delta: '', done: true };
    } catch (e: any) {
      yield { delta: `__error: ${e?.message || e}`, done: true };
    }
  }
}

export function createOllamaProviderFromConfig(config: any): OllamaProvider | null {
  if (!config?.baseUrl || !config?.model) return null;
  return new OllamaProvider({
    baseUrl: config.baseUrl,
    model: config.model
  });
}
