// Shared types for Quick AI contextual augmentation (Iteration B)
// These types define the contract between renderer <-> preload/main.

export interface ContextGatherRequest {
  modules: string[];            // requested module ids (e.g., 'current-file','selection','diagnostics','related-tests', 'pinned')
  budgetTokens: number;         // soft cap for total tokens
  selectionText?: string;       // optional current selection text (if already available in renderer)
  currentFilePath?: string;     // active editor file path
  languageHint?: string;        // optional language id for better token approximation
  diagnosticsSummary?: string;  // optional serialized diagnostics summary (renderer-prepared)
  retrievalQuery?: string;      // optional query override for retrieval module
}

export interface PinnedContextItem {
  id: string;             // unique id (e.g. path or hash)
  type: 'file' | 'snippet' | 'terminal';
  content: string;        // the text content
  meta?: {
    path?: string;
    range?: string; // e.g. "10-20"
    timestamp: number;
  };
}

export interface ContextModuleResult {
  id: string;                   // module id
  tokensApprox: number;         // estimated tokens contributed
  truncated: boolean;           // true if content trimmed to meet budget or size limit
  text?: string;                // optional truncated text snippet (only for textual modules)
  meta?: any;                   // extra shape (e.g. filePath, diagnostics count)
}

export interface ContextGatherResponse {
  modules: ContextModuleResult[];   // included modules
  totalTokens: number;              // sum of tokensApprox for included modules
  dropped: string[];                // module ids dropped due to budget or errors
  budgetTokens: number;             // echo budget for transparency
  totalMs?: number;                 // total wall-clock time for gather operation
  moduleTimings?: { id: string; ms: number }[]; // per-module timing (order of completion)
}

// Simple token approximation helper kept here for potential reuse.
export function approxTokensFromText(text: string): number {
  if(!text) return 0;
  // Very rough heuristic: ~4 chars per token.
  return Math.round(text.length / 4);
}
