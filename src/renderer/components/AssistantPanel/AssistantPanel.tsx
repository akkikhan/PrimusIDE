import React, { useState, useEffect } from 'react';
import { useAI } from '../../hooks/useAI';
import styles from './AssistantPanel.module.css';

export const AssistantPanel: React.FC = () => {
  const { messages, loading, error, send, streamSend, cancelStream, streaming, partial, providers, setProvider, stats, refreshStats, warnings } = useAI({ operation: 'chat', includeContext: true });
  const [selectedProvider, setSelectedProvider] = useState<string | undefined>(undefined);
  const [input, setInput] = useState('Explain current project goals');
  const [retrievalQuery, setRetrievalQuery] = useState('vector store architecture');
  const [topK, setTopK] = useState(5);
  const [retrievalResults, setRetrievalResults] = useState<any | null>(null);
  const [indexing, setIndexing] = useState(false);
  const [retrieving, setRetrieving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [openPreview, setOpenPreview] = useState<string | null>(null);
  const [previewMap, setPreviewMap] = useState<Record<string, { loading?: boolean; error?: string; text?: string }>>({});
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [lifecycleStats, setLifecycleStats] = useState<any|null>(null);
  const [lifecycleRefreshing, setLifecycleRefreshing] = useState(false);

  const refreshLifecycle = async () => {
    setLifecycleRefreshing(true);
    try {
      const stats = await (window as any).primus.ipc.invoke('tasks:lifecycle:stats');
      if(!stats.error) setLifecycleStats(stats);
    } catch(_){ /* ignore */ } finally { setLifecycleRefreshing(false); }
  };

  useEffect(()=> { refreshLifecycle(); }, []);

  const copyPath = async (p: string) => {
    try {
      await navigator.clipboard.writeText(p);
      setCopiedPath(p);
      setTimeout(()=> setCopiedPath(curr => curr === p ? null : curr), 1800);
    } catch {/* ignore */}
  };

  const vectorCount = stats?.providers ? (stats as any).vectorCount || (stats as any).retrieval?.vectorCount : (stats as any)?.vectorCount; // fallback if later added

  const buildIndex = async () => {
    setIndexing(true);
    try {
      const res = await (window as any).primus.tools.invoke('embedding-index', { id: 'ui' }, { limit: 60 });
      setRetrievalResults({ index: res });
      await refreshStats();
    } catch (e:any) {
      setRetrievalResults({ error: String(e?.message||e) });
    } finally { setIndexing(false); }
  };

  const clearIndex = async () => {
    setClearing(true);
    try {
      const res = await (window as any).primus.tools.invoke('embedding-clear', { id: 'ui' }, {});
      // Reset local retrieval-related state
      setRetrievalResults({ cleared: true, snapshot: res?.snapshot });
      setPreviewMap({});
      setOpenPreview(null);
      await refreshStats();
    } catch(e:any){
      setRetrievalResults({ error: String(e?.message||e) });
    } finally { setClearing(false); }
  };

  const runRetrieval = async () => {
    if(!retrievalQuery.trim()) return;
    setRetrieving(true);
    try {
  const res = await (window as any).primus.tools.invoke('semantic-retrieve', { id: 'ui' }, { query: retrievalQuery, topK });
      setRetrievalResults((prev:any) => ({ ...(prev||{}), query: res }));
      setOpenPreview(null);
    } catch(e:any){
      setRetrievalResults({ error: String(e?.message||e) });
    } finally { setRetrieving(false); }
  };

  const togglePreview = async (result: any) => {
    const id = result.id || result.source;
    if(!id) return;
    if(openPreview === id){ setOpenPreview(null); return; }
    setOpenPreview(id);
    if(previewMap[id]?.text || previewMap[id]?.error) return;
    // If snippet provided use it immediately
    if(result.snippet || result.meta?.snippet){
      const snip = result.snippet || result.meta?.snippet;
      setPreviewMap(m => ({ ...m, [id]: { text: snip + (snip.split(/\n/).length >= 8 ? '\n… (snippet)' : '') } }));
      return;
    }
    setPreviewMap(m => ({ ...m, [id]: { loading: true } }));
    try {
      const raw = await (window as any).primus.fs.readFile(result.meta?.filePath || id);
      const lines = (raw || '').split(/\r?\n/).slice(0, 40);
      const truncated = lines.join('\n') + (lines.length === 40 ? '\n… (truncated preview)' : '');
      setPreviewMap(m => ({ ...m, [id]: { text: truncated } }));
    } catch(e:any){
      setPreviewMap(m => ({ ...m, [id]: { error: String(e?.message||e) } }));
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    // Prefer streaming path
    streamSend(input.trim());
    setInput('');
  };

  return (
    <div className={styles.root}>
      <div className={styles.providerRow}>
        <label className={styles.providerLabel} htmlFor="assistant-provider-select">Provider:</label>
        <select
          id="assistant-provider-select"
          aria-label="AI Provider"
          value={selectedProvider || ''}
          onChange={e => {
            const id = e.target.value || undefined;
            setSelectedProvider(id);
            if (id) setProvider(id);
          }}
          className={styles.providerSelect}
        >
          <option value="">(default)</option>
          {providers.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>
      <div className={styles.lifecycleRow}>
        <div className={styles.lifecycleBadges}>
          <span className={styles.badge} title="Planned tasks">Planned: {lifecycleStats?.planned ?? '–'}</span>
          <span className={styles.badge} title="In-progress tasks">WIP: {lifecycleStats?.inProgress ?? '–'}</span>
          <span className={styles.badge} title="Done tasks">Done: {lifecycleStats?.done ?? '–'}</span>
          <span className={styles.badge} title="Empty tasks (no story & no criteria)">Empty: {lifecycleStats?.empty ?? '–'}</span>
          <span className={styles.badge} title="Total tasks">Total: {lifecycleStats?.total ?? '–'}</span>
        </div>
        <button type="button" className={styles.lifecycleRefresh} onClick={refreshLifecycle} disabled={lifecycleRefreshing}>{lifecycleRefreshing? '…' : '↻'}</button>
      </div>
      <div className={styles.messages}>
        {messages.length === 0 && <div className={styles.empty}>No conversation yet.</div>}
        {messages.map(m => (
          <div key={m.id} className={styles.messageBlock}>
            <strong>{m.role === 'user' ? 'You' : 'AI'}:</strong> <span>{m.content}</span>
          </div>
        ))}
        {streaming && (
          <div className={styles.messageBlock}>
            <strong>AI (streaming):</strong> <span>{partial || ''}<span className={styles.cursor}>▍</span></span>
          </div>
        )}
        {loading && !streaming && <div className={styles.loading}>Thinking…</div>}
        {error && <div className={styles.error}>Error: {error}</div>}
      </div>
      {warnings && warnings.length > 0 && (
        <div className={styles.warningsSection}>
          <div className={styles.warningsHeader}><strong>Guardrail Warnings</strong></div>
          <ul className={styles.warningsList}>
            {warnings.map((w,i)=>(<li key={i}>{w}</li>))}
          </ul>
        </div>
      )}
      <div className={styles.retrievalSection}>
        <div className={styles.retrievalHeader}>
          <strong>Retrieval</strong>
          <div className={styles.retrievalMeta}>
            {typeof vectorCount === 'number' && <span className={styles.vectorCount}>Vectors: {vectorCount}</span>}
            <button type="button" onClick={buildIndex} disabled={indexing} className={styles.indexButton}>{indexing ? 'Indexing…' : 'Build / Refresh Index'}</button>
            <button type="button" onClick={clearIndex} disabled={clearing || indexing || !vectorCount} className={styles.clearButton}>{clearing ? 'Clearing…' : 'Clear Index'}</button>
          </div>
        </div>
        <div className={styles.retrievalQueryRow}>
          <input
            value={retrievalQuery}
            onChange={e=> setRetrievalQuery(e.target.value)}
            placeholder="Search indexed code..."
            className={styles.retrievalInput}
          />
          <input
            type="number"
            min={1}
            max={25}
            value={topK}
            onChange={e=> setTopK(Math.min(25, Math.max(1, Number(e.target.value)||5)))}
            className={styles.topKInput}
            title="Number of top matches"
            aria-label="Top K"
          />
          <button type="button" onClick={runRetrieval} disabled={retrieving || !retrievalQuery.trim()} className={styles.retrieveButton}>{retrieving ? 'Searching…' : 'Search'}</button>
        </div>
        {retrievalResults?.error && <div className={styles.error}>Retrieval Error: {retrievalResults.error}</div>}
        {retrievalResults?.query && (
          <div className={styles.retrievalResults}>
            <div className={styles.retrievalResultsHeader}>Top {retrievalResults.query.topK} matches for: <code>{retrievalResults.query.query}</code></div>
            <ol className={styles.resultsList}>
              {retrievalResults.query.results.map((r:any, idx:number)=>(
                <li key={r.id || idx} className={styles.resultItem}>
                  <div className={styles.resultHeaderRow}>
                    <button type="button" className={styles.resultButton} onClick={()=> togglePreview(r)} title="Toggle preview">
                      <span className={styles.resultSource}>{r.source}</span>
                      <span className={styles.resultScore}>{r.score?.toFixed ? r.score.toFixed(3) : r.score}</span>
                      {r.meta?.bytes && <span className={styles.resultMeta}>{r.meta.bytes} bytes</span>}
                      <span className={styles.resultToggle}>{openPreview === (r.id||r.source) ? '−' : '+'}</span>
                    </button>
                    { (r.snippet || r.meta?.snippet) && openPreview !== (r.id||r.source) && (
                      <div className={styles.inlineSnippet} title="Snippet preview (open for more)">
                        <pre>{(r.snippet || r.meta?.snippet).split(/\r?\n/).slice(0,3).join('\n')}{((r.snippet || r.meta?.snippet).split(/\n/).length>3)?'\n…':''}</pre>
                      </div>
                    )}
                    <button type="button" className={styles.copyButton} onClick={()=> copyPath(r.id || r.source)} title="Copy path">
                      {copiedPath === (r.id||r.source) ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  {openPreview === (r.id||r.source) && (
                    <div className={styles.previewBlock}>
                      {previewMap[r.id||r.source]?.text && (
                        <div className={styles.previewMeta}>
                          {(() => {
                            const txt = previewMap[r.id||r.source]?.text || '';
                            const lineCount = txt.split(/\n/).length;
                            return `${lineCount} lines${r.meta?.bytes ? ` • ${r.meta.bytes} bytes` : ''}`;
                          })()}
                        </div>
                      )}
                      {previewMap[r.id||r.source]?.loading && <div className={styles.previewLoading}>Loading…</div>}
                      {previewMap[r.id||r.source]?.error && <div className={styles.previewError}>Error: {previewMap[r.id||r.source]?.error}</div>}
                      {previewMap[r.id||r.source]?.text && (
                        <pre className={styles.previewCode}>{previewMap[r.id||r.source]?.text}</pre>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
      <div className={styles.statsSection}>
        <div className={styles.statsHeader}>
          <strong>Provider Stats</strong> <button type="button" onClick={()=>refreshStats()} className={styles.refreshButton}>Refresh</button>
        </div>
        {!stats && <div className={styles.statsEmpty}>No stats yet.</div>}
        {stats && (
          <table className={styles.statsTable}>
            <thead>
              <tr>
                <th>Provider</th><th>Calls</th><th>Stream</th><th>Err</th><th>Cancel</th><th>Avg ms</th><th>Tok</th><th>Cost</th>
              </tr>
            </thead>
            <tbody>
              {stats.providers.map((p:any)=> (
                <tr key={p.providerId}>
                  <td>{p.providerId}</td>
                  <td>{p.calls}</td>
                  <td>{p.streamingCalls}</td>
                  <td>{p.errors}</td>
                  <td>{p.cancellations}</td>
                  <td>{p.avgLatencyMs}</td>
                  <td>{p.totalTokensEst}</td>
                  <td>{p.totalCostEst.toFixed ? p.totalCostEst.toFixed(6) : p.totalCostEst}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <form onSubmit={onSubmit} className={styles.inputRow}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask the AI..."
          className={styles.textInput}
          aria-label="AI prompt"
        />
        {!streaming && <button type="submit" disabled={loading} className={styles.sendButton}>Send</button>}
        {streaming && <button type="button" onClick={()=> cancelStream()} className={styles.cancelButton}>Cancel</button>}
      </form>
    </div>
  );
};

export default AssistantPanel;
