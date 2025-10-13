export interface RuntimeDiagnostic {
  id: string;
  label: string;
  value: string | number;
  detail?: string;
  level?: 'info' | 'warn' | 'error';
}
export interface DiagnosticsSnapshot {
  collectedAt: string;
  metrics: RuntimeDiagnostic[];
}
