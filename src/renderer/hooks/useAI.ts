import { useCallback, useEffect, useState } from 'react';
import type { AIMessage, AIRequest, AIResponse, AIInvokeResult } from '../../shared/aiTypes';

interface UseAIOptions {
  operation?: AIRequest['operation'];
  includeContext?: boolean;
  contextTaskIds?: number[];
}

interface UseAIState {
  messages: AIMessage[];
  loading: boolean;
  error?: string;
  providers: { id: string; name: string; supports: string[] }[];
  providerHint?: string;
  streaming?: boolean;
  streamId?: string;
  partial?: string; // accumulating content
  cancelled?: boolean;
  stats?: { generatedAt: number; providers: any[] };
  warnings?: string[];
}

let counter = 0;
const genId = () => `ai_${Date.now()}_${counter++}`;

export function useAI(opts: UseAIOptions = {}) {
  const [state, setState] = useState<UseAIState>({ messages: [], loading: false, providers: [] });

  // Load providers once
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const list = await (window as any).primus.ai.listProviders();
        if (mounted && Array.isArray(list)) {
          setState(s => ({ ...s, providers: list as any }));
        }
      } catch (e: any){ /* ignore */ }
    })();
    return () => { mounted = false; };
  }, []);

  // Load stats on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const stats = await (window as any).primus.ai.getStats();
        if(mounted) setState(s => ({ ...s, stats }));
      } catch {/* ignore */}
    })();
    return () => { mounted = false; };
  }, []);

  const refreshStats = useCallback(async () => {
    try {
      const stats = await (window as any).primus.ai.getStats();
      setState(s => ({ ...s, stats }));
    } catch {/* ignore */}
  }, []);

  const setProvider = useCallback((id: string) => {
    setState(s => ({ ...s, providerHint: id }));
  }, []);

  const send = useCallback(async (prompt: string) => {
    const user: AIMessage = { id: genId(), role: 'user', content: prompt, createdAt: Date.now() };
    setState(s => ({ ...s, messages: [...s.messages, user], loading: true, error: undefined }));
    const req: AIRequest = {
      id: genId(),
      operation: opts.operation || 'chat',
      prompt,
      messages: state.messages.slice(-15),
      includeContext: opts.includeContext,
      contextTaskIds: opts.contextTaskIds,
      providerHint: state.providerHint
    };
    try {
      const res = await (window as any).primus.ai.request(req) as AIInvokeResult;
      if ((res as any).error) {
        setState(s => ({ ...s, loading: false, error: (res as any).error }));
        return;
      }
      const r = res as AIResponse;
      const assistant: AIMessage = { id: r.id, role: 'assistant', content: r.content, createdAt: r.createdAt, meta: r.meta };
      setState(s => ({ ...s, messages: [...s.messages, assistant], loading: false }));
    } catch (e: any) {
      setState(s => ({ ...s, loading: false, error: String(e?.message || e) }));
    }
  }, [opts.operation, opts.includeContext, opts.contextTaskIds, state.messages]);

  const streamSend = useCallback((prompt: string) => {
    const user: AIMessage = { id: genId(), role: 'user', content: prompt, createdAt: Date.now() };
    const req: AIRequest = {
      id: genId(),
      operation: opts.operation || 'chat',
      prompt,
      messages: state.messages.slice(-15),
      includeContext: opts.includeContext,
      contextTaskIds: opts.contextTaskIds,
      providerHint: state.providerHint
    };
  setState(s => ({ ...s, messages: [...s.messages, user], streaming: true, partial: '', error: undefined, cancelled: false, warnings: [] }));
    const streamId = (window as any).primus.ai.stream(req,
      (chunk: { delta: string; streamId: string }) => {
        if(!chunk || typeof chunk.delta !== 'string') return;
        if(chunk.delta.startsWith('__error:')){
          setState(s => ({ ...s, streaming: false, error: chunk.delta.replace('__error:','') }));
          return;
        }
        if(chunk.delta.startsWith('__info:cancelled')) {
          setState(s => ({ ...s, streaming: false, cancelled: true }));
          return;
        }
        if(chunk.delta.startsWith('__warn:')) {
          const warn = chunk.delta.replace('__warn:','');
          setState(s => ({ ...s, warnings: [...(s.warnings||[]), warn] }));
          return;
        }
        setState(s => ({ ...s, partial: (s.partial || '') + chunk.delta }));
      },
      (final: any) => {
        setState(s => {
          const content = (s.partial || '');
          if(!content && s.cancelled) return { ...s, streaming: false };
          if(!content) return { ...s, streaming: false };
          const assistant: AIMessage = { id: genId(), role: 'assistant', content, createdAt: Date.now() };
          return { ...s, streaming: false, messages: [...s.messages, assistant], partial: undefined };
        });
        // refresh stats after completion
        refreshStats();
      }
    );
    setState(s => ({ ...s, streamId }));
  }, [opts.operation, opts.includeContext, opts.contextTaskIds, state.messages, state.providerHint]);

  const cancelStream = useCallback(() => {
    if(state.streamId && state.streaming){
      (window as any).primus.ai.cancelStream(state.streamId);
    }
  }, [state.streamId, state.streaming]);

  return { ...state, send, streamSend, cancelStream, setProvider, refreshStats };
}

export default useAI;
