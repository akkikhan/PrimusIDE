// Shared patch types for Multi-file Patch Flow

export enum PatchOperation {
  INSERT = 'insert',
  REPLACE = 'replace',
  DELETE = 'delete',
  MOVE = 'move',
  CREATE = 'create',
  RENAME = 'rename'
}

export interface Hunk {
  id: string;
  originalStartLine: number;
  originalEndLine: number;
  newText: string;
  status: 'pending' | 'accepted' | 'rejected' | 'conflict';
  originalHash?: string; // optional original hash for conflict detection
}

export interface FilePatch {
  filePath: string;
  operation: PatchOperation;
  hunks?: Hunk[];
  content?: string; // used for whole-file REPLACE / CREATE
  position?: {
    line: number;
    column: number;
  };
  range?: {
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
  };
  newPath?: string; // For move/rename operations
  metadata: {
    description?: string;
    dependencies: string[];
    conflicts: string[];
    risk: number;
    priority: number;
  };
}

export interface RiskFactor {
  type: 'breaking_change' | 'data_loss' | 'performance' | 'security' | 'complexity';
  severity: number; // 0-1
  description: string;
  mitigation?: string;
}

export interface ConflictResolution {
  strategy: 'skip' | 'merge' | 'override' | 'manual';
  description: string;
  automated: boolean;
  confidence: number;
}

export interface Conflict {
  type: 'content' | 'dependency' | 'order' | 'resource';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedPatches: string[];
  resolution?: ConflictResolution;
}

export interface MultiFilePatch {
  id: string;
  description: string;
  patches: FilePatch[];
  dependencies: string[];
  conflicts: string[];
  risk: {
    overall: number;
    factors: RiskFactor[];
  };
  metadata: {
    createdAt: number;
    estimatedTime: number;
    complexity: number;
    author: string;
  };
}

export interface PatchExecutionResult {
  success: boolean;
  appliedPatches: string[];
  failedPatches: Array<{
    patch: FilePatch;
    error: string;
    conflict?: any;
  }>;
  conflicts: Conflict[];
  performance: {
    totalTime: number;
    filesProcessed: number;
    operationsApplied: number;
  };
}

export interface PatchSession {
  id: string;
  createdAt: number;
  providerId?: string;
  patches: MultiFilePatch;
  status: 'open' | 'applied' | 'discarded' | 'partial';
  metadata?: Record<string, any>;
}
