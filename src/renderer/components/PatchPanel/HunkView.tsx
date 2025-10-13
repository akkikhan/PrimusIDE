import React, { useState } from 'react';

interface HunkProps { sessionId: string; filePath: string; hunk: any; onStatusChange?: ()=>void }

export const HunkView: React.FC<HunkProps> = ({ sessionId, filePath, hunk, onStatusChange }) => {
  const [status, setStatus] = useState<string>(hunk.status || 'pending');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateStatus = async (nextStatus: 'pending'|'accepted'|'rejected'|'conflict') => {
    setBusy(true); setError(null);
    try {
      const resp = await (window as any).primus.patch.updateHunkStatus(sessionId, filePath, hunk.id, nextStatus);
      if (resp && resp.success === false && resp.error) throw new Error(resp.error);
      setStatus(nextStatus);
      onStatusChange && onStatusChange();
    } catch (e:any) { setError(e.message || String(e)); }
    finally { setBusy(false); }
  };

  return (
    <div className={`hunk-view hunk-status-${status}`}>
      <div className='hunk-header'>
        <span className='hunk-id'>{hunk.id}</span>
        <span className='hunk-range'>Lines: {hunk.startLine}-{hunk.endLine}</span>
        <span className='hunk-status'>Status: {status}</span>
      </div>
      <div className='hunk-body'>
        <pre className='hunk-text'>{hunk.newText}</pre>
      </div>
      <div className='hunk-actions'>
        <button disabled={busy} onClick={()=>updateStatus('accepted')}>Accept</button>
        <button disabled={busy} onClick={()=>updateStatus('rejected')}>Reject</button>
        <button disabled={busy} onClick={()=>updateStatus('conflict')}>Mark Conflict</button>
        {error && <div className='hunk-error'>{error}</div>}
      </div>
    </div>
  );
};

export default HunkView;
