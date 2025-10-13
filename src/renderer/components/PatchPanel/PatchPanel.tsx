import React, { useEffect, useState } from 'react';
import './PatchPanel.css';
import { HunkView } from './HunkView';

interface PatchPanelProps { visible: boolean; onClose: () => void; }

export const PatchPanel: React.FC<PatchPanelProps> = ({ visible, onClose }) => {
  const [sessionId, setSessionId] = useState<string>('');
  const [session, setSession] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applyResult, setApplyResult] = useState<any | null>(null);

  useEffect(() => {
    if (!visible) {
      setSession(null); setSessionId(''); setError(null); setApplyResult(null);
    }
  }, [visible]);

  const loadSession = async () => {
    setError(null); setLoading(true); setSession(null);
    try {
      if (!sessionId) throw new Error('Please provide a session id');
      const resp = await (window as any).primus.patch.getSession(sessionId);
      if (!resp || !resp.success) throw new Error(resp?.error || 'Not found');
      setSession(resp.session);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally { setLoading(false); }
  };

  const applySession = async () => {
    if (!session?.id) return;
    setApplyResult(null);
    try {
      const resp = await (window as any).primus.patch.applySession(session.id);
      setApplyResult(resp);
      if (resp?.success) {
        // refresh
        setSession(null);
      }
    } catch (e:any) {
      setApplyResult({ success: false, error: e.message });
    }
  };

  const discardSession = async () => {
    if (!session?.id) return;
    try {
      const resp = await (window as any).primus.patch.discardSession(session.id);
      if (resp?.success) {
        setSession(null);
      } else {
        setError(resp?.error || 'Discard failed');
      }
    } catch (e:any) { setError(e.message); }
  };

  if (!visible) return null;

  return (
    <div className='patch-panel'>
      <div className='patch-panel-header'>
        <strong>Patch Review</strong>
        <div className='patch-panel-actions'>
          <button onClick={onClose} className='pp-close'>✕</button>
        </div>
      </div>
      <div className='patch-panel-body'>
        <div className='pp-controls'>
          <label>Session ID</label>
          <div style={{display:'flex',gap:6}}>
            <input value={sessionId} onChange={e=>setSessionId(e.target.value)} placeholder='session_...' />
            <button onClick={loadSession} disabled={loading}>{loading? 'Loading…' : 'Load'}</button>
          </div>
          {error && <div className='pp-error'>{error}</div>}
        </div>

        {session && (
          <div className='pp-session'>
            <div className='pp-session-meta'>
              <div>Session: {session.id}</div>
              <div>Provider: {session.providerId}</div>
              <div>Created: {new Date(session.createdAt).toLocaleString()}</div>
            </div>

            <div className='pp-files'>
              {Array.isArray(session.patches?.patches) && session.patches.patches.map((filePatch: any) => (
                <div key={filePatch.filePath} className='pp-file'>
                  <div className='pp-file-header'>
                    <strong>{filePatch.filePath}</strong>
                    <span className='pp-file-op'>{filePatch.operation}</span>
                  </div>
                  <div className='pp-file-hunks'>
                    {(filePatch.hunks || []).map((h:any)=> (
                      <HunkView key={h.id} sessionId={session.id} filePath={filePatch.filePath} hunk={h} onStatusChange={async()=>{ await loadSession(); }} />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className='pp-bottom-actions'>
              <button className='pp-apply' onClick={applySession}>Apply Patch</button>
              <button className='pp-discard' onClick={discardSession}>Discard</button>
            </div>

            {applyResult && (
              <div className='pp-apply-result'>
                <pre>{JSON.stringify(applyResult, null, 2)}</pre>
              </div>
            )}
          </div>
        )}

        {!session && (
          <div className='pp-empty'>No session loaded. Enter an ID and press Load.</div>
        )}
      </div>
    </div>
  );
};

export default PatchPanel;
