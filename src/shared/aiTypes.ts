// AI core shared type definitions
// Phase 1 skeleton: mock oriented; will evolve with provider + tool calling

export type AIOperationKind =
  | 'chat'
  | 'inline-complete'
  | 'refactor'
  | 'explain'
  | 'tests'
  | 'planning';

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: number;
  meta?: Record<string, any>;
}

export interface AIContextSliceSummary {
  taskIds?: number[];
  fileCount?: number;
  symbolBreakRisk?: number; // placeholder: 0..1
}

export interface AIRequest {
  id: string; // caller supplied or generated
  operation: AIOperationKind;
  prompt: string;
  messages?: AIMessage[]; // conversation history (excluding current prompt if desired)
  includeContext?: boolean; // if true main handler will attempt to pull context bundle summary
  contextTaskIds?: number[]; // explicit tasks to include when includeContext
  maxTokens?: number; // future use
  temperature?: number; // future use
  providerHint?: string; // optional provider id hint
  /** Optional selected code metadata for inline editor actions */
  editorSelection?: {
    filePath: string;
    languageId?: string;
    startLine: number; // 1-based
    endLine: number;   // inclusive 1-based
    startColumn: number; // 1-based
    endColumn: number;   // 1-based
    code: string; // raw selected text (may be truncated by caller if huge)
    truncated?: boolean; // true if caller trimmed large selection
  };
}

export interface AIResponse {
  id: string;
  requestId: string;
  operation: AIOperationKind;
  role: 'assistant';
  content: string;
  createdAt: number;
  context?: AIContextSliceSummary;
  meta?: {
    mock?: boolean; // true for mock providers
    provider: string;
    latencyMs: number;
  } & Record<string, any>;
}

export interface AIErrorResponse {
  error: string;
  requestId?: string;
}

export type AIInvokeResult = AIResponse | AIErrorResponse;

export interface AIProviderMetadata {
  id: string;
  name: string;
  capabilities: AIOperationKind[];
  isMock?: boolean;
}
