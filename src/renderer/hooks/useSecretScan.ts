// TASK:669 minimal hook placeholder for future UI integration
// Provides a simple function to scan arbitrary text via preload security API.
import { useCallback, useState } from 'react';

type ScanOutcome = {
  findings: { type: string; value: string; redacted: string }[];
  redactedText: string;
  durationMs: number;
  error?: string;
};

export function useSecretScan(){
  const [lastResult, setLastResult] = useState<ScanOutcome | null>(null);
  const scan = useCallback(async (text: string) => {
    const api = (window as any).primus;
    if(!api || !api.security || typeof api.security.scanText !== 'function'){
      const fallback: ScanOutcome = { findings: [], redactedText: text, durationMs: 0, error: 'Security scan API unavailable'};
      setLastResult(fallback);
      return fallback;
    }
    const res = await api.security.scanText(text);
    setLastResult(res as ScanOutcome);
    return res as ScanOutcome;
  },[]);
  return { scan, lastResult };
}
