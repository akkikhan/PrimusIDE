import type { ContextBundle } from './contextTypes';
import type { AIRequest, AIInvokeResult } from './aiTypes';

declare global {
  interface Window {
    primus: {
      context: {
        build: (options: { taskIds?: number[]; top?: number; fromBatch?: boolean }) => Promise<ContextBundle | { error: string }>
      };
      ai: {
        request: (req: AIRequest) => Promise<AIInvokeResult>
        listProviders: () => Promise<Array<{ id: string; name: string; supports: string[] } | { error: string }>>
      };
    } & any;
  }
}

export {};
