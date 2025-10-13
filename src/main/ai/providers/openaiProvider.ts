import type { AIRequest, AIInvokeResult, AIResponse } from '../../../shared/aiTypes.js';
import type { AIProvider } from '../providerRegistry.js';

// Lightweight dynamic import wrapper to avoid bundling if unused.
async function fetchJson(url: string, opts: any): Promise<Response> {
  return fetch(url, opts);
}

interface OpenAIProviderOptions {
  apiKey: string;
  baseUrl?: string; // override for Azure/OpenAI-compatible endpoints
  model?: string;
  timeoutMs?: number;
}

export class OpenAIProvider implements AIProvider {
  id = 'openai';
  name = 'OpenAI Provider';
  supports = new Set<AIRequest['operation']>(['chat','explain','refactor','inline-complete','planning','tests']);
  private opts: OpenAIProviderOptions;

  constructor(opts: OpenAIProviderOptions){
    this.opts = { model: 'gpt-4o-mini', timeoutMs: 60000, ...opts };
  }

  async invoke(req: AIRequest): Promise<AIInvokeResult> {
    const started = Date.now();
    const system: string[] = [];
    if(req.operation === 'planning') system.push('You are a senior software planning assistant. Return concise, actionable steps.');
    if(req.operation === 'refactor') system.push('Focus on safe, minimal diff refactors.');

    const messages = [
      ... (system.length? [{ role: 'system', content: system.join('\n') }] : []),
      { role: 'user', content: req.prompt }
    ];

    const controller = new AbortController();
    const timeout = setTimeout(()=> controller.abort(), this.opts.timeoutMs);

    try {
      const response = await fetchJson(`${this.opts.baseUrl || 'https://api.openai.com/v1'}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.opts.apiKey}`
        },
        body: JSON.stringify({
          model: this.opts.model,
          messages,
          temperature: 0.2,
          stream: false
        }),
        signal: controller.signal
      });
      clearTimeout(timeout);
      if(!response.ok){
        const text = await response.text();
        return { error: `OpenAI error ${response.status}: ${text}`, requestId: req.id };
      }
      const json: any = await response.json();
      const content = json.choices?.[0]?.message?.content || '(no content)';
      const aiResp: AIResponse = {
        id: `openai_${Date.now()}`,
        requestId: req.id,
        operation: req.operation,
        role: 'assistant',
        content,
        createdAt: Date.now(),
        meta: { mock: false, provider: this.id, latencyMs: Date.now() - started, model: this.opts.model }
      };
      return aiResp;
    } catch(e:any){
      return { error: `OpenAI invoke failed: ${e?.message||e}`, requestId: req.id };
    }
  }

  // Streaming variant producing incremental content chunks.
  async *stream(req: AIRequest, opts?: { signal?: AbortSignal }): AsyncGenerator<{ delta: string; done?: boolean }, void, unknown> {
    const system: string[] = [];
    if(req.operation === 'planning') system.push('You are a senior software planning assistant. Return concise, actionable steps.');
    if(req.operation === 'refactor') system.push('Focus on safe, minimal diff refactors.');
    const messages = [
      ... (system.length? [{ role: 'system', content: system.join('\n') }] : []),
      { role: 'user', content: req.prompt }
    ];
    const controller = new AbortController();
    const external = opts?.signal;
    if (external) {
      if (external.aborted) controller.abort();
      else external.addEventListener('abort', () => controller.abort(), { once: true });
    }
    const timeout = setTimeout(()=> controller.abort(), this.opts.timeoutMs);
    try {
      const resp = await fetch(`${this.opts.baseUrl || 'https://api.openai.com/v1'}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.opts.apiKey}`
        },
        body: JSON.stringify({ model: this.opts.model, messages, temperature: 0.2, stream: true }),
        signal: controller.signal
      });
      clearTimeout(timeout);
      if(!resp.ok){
        const text = await resp.text();
        yield { delta: `__error: OpenAI stream error ${resp.status}: ${text}`, done: true };
        return;
      }
      const reader = resp.body?.getReader();
      if(!reader){
        yield { delta: '__error: no stream body', done: true }; return;
      }
      const decoder = new TextDecoder();
      let buffer = '';
      while(true){
        const { value, done } = await reader.read();
        if(done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split(/\n/);
        buffer = lines.pop() || '';
        for(const line of lines){
          const trimmed = line.trim();
            if(!trimmed) continue;
            if(trimmed.startsWith('data: ')){
              const payload = trimmed.slice(6).trim();
              if(payload === '[DONE]') { yield { delta: '', done: true }; return; }
              try {
                const json = JSON.parse(payload);
                const piece = json.choices?.[0]?.delta?.content;
                if(piece) yield { delta: piece };
              } catch(_e){ /* swallow parse errors */ }
            }
        }
      }
      if(buffer.length){
        try {
          const maybe = buffer.trim();
          if(maybe.startsWith('data: ')){
            const payload = maybe.slice(6).trim();
            if(payload === '[DONE]') { yield { delta: '', done: true }; return; }
          }
        } catch(_){ /* ignore */ }
      }
      yield { delta: '', done: true };
    } catch(e:any){
      yield { delta: `__error: ${e?.message||e}`, done: true };
    }
  }
}

export function createOpenAIProviderFromEnv(): OpenAIProvider | null {
  const apiKey = process.env.OPENAI_API_KEY || process.env.PRIMUS_OPENAI_KEY;
  if(!apiKey) return null;
  return new OpenAIProvider({ apiKey });
}
