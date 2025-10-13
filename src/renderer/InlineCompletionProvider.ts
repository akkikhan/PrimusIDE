import * as monaco from "monaco-editor";
import { AdvancedAISystem } from "./ai/AdvancedAISystem";

interface InlineCompletionProviderOptions {
  getAdvancedSystem?: () => AdvancedAISystem | null | undefined;
}

interface CompletionStats {
  cacheSize: number;
  advancedCompletionsEnabled: boolean;
  totalRequests: number;
  averageResponseTime: number;
}

export class InlineCompletionProvider implements monaco.languages.InlineCompletionsProvider {
  private readonly getAdvancedSystem?: () => AdvancedAISystem | null | undefined;
  private stats = {
    totalRequests: 0,
    totalDurationMs: 0,
    advancedHits: 0
  };

  constructor(options: InlineCompletionProviderOptions = {}) {
    this.getAdvancedSystem = options.getAdvancedSystem;
  }

  async provideInlineCompletions(
    model: monaco.editor.ITextModel,
    position: monaco.Position,
    context: monaco.languages.InlineCompletionContext,
    token: monaco.CancellationToken
  ): Promise<monaco.languages.InlineCompletions<monaco.languages.InlineCompletion> | undefined> {
    const start = performance.now();
    this.stats.totalRequests += 1;

    try {
      if (token.isCancellationRequested) {
        return undefined;
      }

      const system = this.getAdvancedSystem?.();
      if (!system) {
        return undefined;
      }

      const status = system.getStatus();
      if (!status.components.completionEngine) {
        return undefined;
      }

      const result = await system.generateCompletions(model, position, {
        agentId: 'inline-completion-provider'
      });

      if (token.isCancellationRequested) {
        return undefined;
      }

      if (!result.success || !result.data?.completions?.length) {
        return undefined;
      }

      this.stats.advancedHits += 1;
      const items: monaco.languages.InlineCompletion[] = result.data.completions.map((candidate: { text: string }) => ({
        insertText: candidate.text,
        range: new monaco.Range(
          position.lineNumber,
          position.column,
          position.lineNumber,
          position.column
        )
      }));

      return { items };
    } catch (error) {
      console.warn("[InlineCompletionProvider] advanced completion failed:", error);
      return undefined;
    } finally {
      this.stats.totalDurationMs += performance.now() - start;
    }
  }

  freeInlineCompletions(): void {}

  clearCache(): void {}

  updateConfig(): void {}

  disposeInlineCompletions(): void {}

  getStatistics(): CompletionStats {
    const averageResponseTime = this.stats.totalRequests === 0
      ? 0
      : this.stats.totalDurationMs / this.stats.totalRequests;

    return {
      cacheSize: 0,
      advancedCompletionsEnabled: this.stats.advancedHits > 0,
      totalRequests: this.stats.totalRequests,
      averageResponseTime
    };
  }
}
