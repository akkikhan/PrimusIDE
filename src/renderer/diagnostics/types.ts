// Central diagnostics (Problems) types (Task 9.2 part of 1)
// Provides a single source of truth for severities and problem shape.

export enum ProblemSeverity {
  Error = 'error',
  Warning = 'warning',
  Info = 'info',
  Hint = 'hint'
}

export interface Problem {
  id: string; // unique id (file:line:col:message hash)
  filePath: string;
  message: string;
  severity: ProblemSeverity;
  startLine: number;
  startColumn: number;
  endLine?: number;
  endColumn?: number;
  code?: string;
  source?: string;
}

export interface ProblemsSettings {
  enabled: boolean; // master toggle to collect/show diagnostics
}

export const defaultProblemsSettings: ProblemsSettings = {
  enabled: true
};
