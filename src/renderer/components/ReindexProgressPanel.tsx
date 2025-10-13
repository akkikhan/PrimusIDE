import React, { useEffect, useState, useRef, useCallback } from 'react';
import './ReindexProgressPanel.css';

interface ProgressEventPayload {
  runId: string;
  processed: number;
  totalFiles: number;
  vectors: number;
  phase: string;
}

interface CompleteEventPayload {
  runId: string;
  summary: any;
}

interface ReindexProgressPanelProps {
  visible: boolean;
  onClose: () => void;
  autoStart?: boolean;
}

/**
 * ReindexProgressPanel
 * Lightweight live view of retrieval reindex progress, consuming preload retrieval API.
 * Shows phase, counts, rate, elapsed, and allows cancel. Displays summary on completion.
 */
export const ReindexProgressPanel: React.FC<ReindexProgressPanelProps> = ({ visible, onClose, autoStart }) => {
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [progress, setProgress] = useState<ProgressEventPayload | null>(null);
  const [summary, setSummary] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const startTsRef = useRef<number | null>(null);
  const lastVectorsRef = useRef<{ t: number; v: number } | null>(null);
  const [rate, setRate] = useState<number | null>(null);
  const fillRef = useRef<HTMLDivElement | null>(null);

  const retrieval = (window as any).primus?.retrieval;

  const start = useCallback(async () => {
    if(!retrieval) return;
    setError(null); setSummary(null); setProgress(null); setRate(null);
    const res = await retrieval.startReindex();
    if((res as any)?.error){ setError((res as any).error); return; }
    setActiveRunId((res as any).runId);
    startTsRef.current = Date.now();
  }, [retrieval]);

  const cancel = useCallback(async () => {
    if(!retrieval) return;
    await retrieval.cancelReindex();
  }, [retrieval]);

  // Attach listeners once
  useEffect(() => {
    if(!retrieval) return;
    retrieval.onReindexProgress((e: ProgressEventPayload) => {
      setProgress(e);
      // compute simple vectors/sec
      const now = Date.now();
      if(lastVectorsRef.current && e.vectors > lastVectorsRef.current.v){
        const dv = e.vectors - lastVectorsRef.current.v;
        const dt = (now - lastVectorsRef.current.t)/1000;
        if(dt > 0){ setRate(dv/dt); }
      }
      lastVectorsRef.current = { t: now, v: e.vectors };
    });
    retrieval.onReindexComplete((e: CompleteEventPayload) => {
      setSummary(e.summary);
      setActiveRunId(null);
    });
    // load last summary on mount
    retrieval.getReindexSummary?.().then((s: any) => { if(s) setSummary(s); });
  }, [retrieval]);

  // Auto start if requested when panel becomes visible and no active run
  useEffect(() => {
    if(visible && autoStart && !activeRunId){ start(); }
  }, [visible, autoStart, activeRunId, start]);

  if(!visible) return null;

  const elapsedMs = startTsRef.current ? Date.now() - startTsRef.current : null;
  const pct = progress && progress.totalFiles > 0 ? (progress.processed / progress.totalFiles) * 100 : 0;

  useEffect(() => {
    if(fillRef.current){
      requestAnimationFrame(()=>{
        if(fillRef.current) fillRef.current.style.width = pct.toFixed(2)+'%';
      });
    }
  }, [pct]);

  return (
    <div className='reindex-panel'>
      <div className='reindex-header'>
        <h3>Retrieval Reindex</h3>
        <div className='reindex-actions'>
          {activeRunId && <button onClick={cancel} className='btn-secondary'>Cancel</button>}
          {!activeRunId && <button onClick={start} className='btn-primary'>Start</button>}
          <button onClick={onClose} className='btn-ghost'>Close</button>
        </div>
      </div>
      {error && <div className='reindex-error'>Error: {error}</div>}
      {progress && (
        <div className='reindex-progress'>
          <div className='progress-bar'>
            <div className='fill' ref={fillRef} />
          </div>
          <div className='metrics-row'>
            <span>Phase: <strong>{progress.phase}</strong></span>
            <span>Files: {progress.processed}/{progress.totalFiles}</span>
            <span>Vectors: {progress.vectors}</span>
            <span>Elapsed: {elapsedMs ? (elapsedMs/1000).toFixed(1)+'s' : '-'}</span>
            <span>Rate: {rate ? rate.toFixed(1)+' v/s' : '-'}</span>
          </div>
        </div>
      )}
      {(!progress && !activeRunId) && <div className='reindex-idle'>No active reindex. Start one to refresh embeddings.</div>}
      {summary && (
        <div className='reindex-summary'>
          <h4>Last Run Summary</h4>
          <pre>{JSON.stringify(summary, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default ReindexProgressPanel;
