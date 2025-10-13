import React, { useEffect, useState } from 'react';

interface ProviderMetricRow {
  providerId: string;
  calls: number;
  lastLatencyMs: number | null;
  minLatencyMs: number | null;
  maxLatencyMs: number | null;
  avgLatencyMs: number | null;
  tokensApprox: number;
  errors: number;
  lastErrorAt?: string;
  lastSuccessAt?: string;
}

/**
 * AIStatsPanel
 * Lightweight read-only view over provider metrics persisted by main process.
 * Accesses window.primus.ai.getStats() (added in preload bridge earlier) to fetch metrics snapshot.
 */
export const AIStatsPanel: React.FC<{ visible: boolean; onClose: () => void; }>=({ visible, onClose }) => {
  const [rows, setRows] = useState<ProviderMetricRow[]>([]);
  const [ts, setTs] = useState<number>(Date.now());

  useEffect(() => {
    if(!visible) return; let mounted = true;
    const load = async () => {
      try {
        const stats = await (window as any).primus?.ai?.getStats?.();
        if(!mounted || !stats || typeof stats !== 'object') return;
        const arr: ProviderMetricRow[] = Object.values(stats).map((m: any) => ({
          providerId: m.providerId,
          calls: m.calls || 0,
            lastLatencyMs: m.lastLatencyMs ?? null,
            minLatencyMs: m.minLatencyMs ?? null,
            maxLatencyMs: m.maxLatencyMs ?? null,
            avgLatencyMs: m.avgLatencyMs ?? null,
            tokensApprox: m.tokensApprox || 0,
            errors: m.errors || 0,
            lastErrorAt: m.lastErrorAt,
            lastSuccessAt: m.lastSuccessAt,
        }));
        // Deterministic sort: descending calls then provider id
        arr.sort((a,b)=> b.calls - a.calls || a.providerId.localeCompare(b.providerId));
        setRows(arr); setTs(Date.now());
      } catch{/* ignore */}
    };
    load();
    const int = setInterval(load, 4000); // auto-refresh every 4s
    return () => { mounted = false; clearInterval(int); };
  }, [visible]);

  if(!visible) return null;

  return (
    <div className='ai-stats-panel'>
      <div className='ai-stats-header'>
        <h3>AI Provider Metrics</h3>
        <div className='ai-stats-actions'>
          <button className='qa-inline-btn' onClick={()=>window.location.reload()}>Reload App</button>
          <button className='qa-inline-btn' onClick={onClose}>Close</button>
        </div>
      </div>
      <div className='ai-stats-meta'>Updated {new Date(ts).toLocaleTimeString()}</div>
      <div className='ai-stats-tableWrap'>
        <table className='ai-stats-table'>
          <thead>
            <tr>
              <th>Provider</th>
              <th>Calls</th>
              <th>Avg ms</th>
              <th>Min ms</th>
              <th>Max ms</th>
              <th>Last ms</th>
              <th>Tokens~</th>
              <th>Errors</th>
              <th>Last Success</th>
              <th>Last Error</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.providerId}>
                <td>{r.providerId}</td>
                <td>{r.calls}</td>
                <td>{r.avgLatencyMs?.toFixed(0) ?? '-'}</td>
                <td>{r.minLatencyMs?.toFixed(0) ?? '-'}</td>
                <td>{r.maxLatencyMs?.toFixed(0) ?? '-'}</td>
                <td>{r.lastLatencyMs?.toFixed(0) ?? '-'}</td>
                <td>{r.tokensApprox}</td>
                <td className={r.errors>0?'ai-stats-err':''}>{r.errors}</td>
                <td>{r.lastSuccessAt? new Date(r.lastSuccessAt).toLocaleTimeString(): '-'}</td>
                <td>{r.lastErrorAt? new Date(r.lastErrorAt).toLocaleTimeString(): '-'}</td>
              </tr>
            ))}
            {rows.length===0 && (
              <tr><td colSpan={10} style={{textAlign:'center', opacity:0.6}}>No metrics yet – invoke AI to populate.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AIStatsPanel;
