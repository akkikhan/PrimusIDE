import React, { useEffect, useState } from 'react';
import { DiagnosticsSnapshot } from '../../shared/diagnostics';
import '../styles/DiagnosticsPanel.css';

interface Props { isVisible: boolean; onClose: () => void; }

const DiagnosticsPanel: React.FC<Props> = ({ isVisible, onClose }) => {
  const [snap, setSnap] = useState<DiagnosticsSnapshot | null>(null);
  const grab = () => {
    try { const s = (window as any).primus?.diagnostics?.snapshot?.(); setSnap(s); } catch (e: any){ console.warn('diag fail', e); }
  };
  useEffect(()=>{ if(isVisible){ grab(); const id=setInterval(grab,3000); return ()=>clearInterval(id);} },[isVisible]);
  if(!isVisible) return null;
  return <div className='diagnostics-panel'>
    <div className='diagnostics-header'>
      <span>Diagnostics</span>
      <button onClick={onClose}>×</button>
    </div>
    {!snap && <div className='diagnostics-empty'>No data</div>}
    {snap && <table className='diagnostics-table'>
      <thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody>
        {snap.metrics.map(m=> <tr key={m.id}><td>{m.label}</td><td>{m.value}</td></tr>)}
      </tbody>
    </table>}
  </div>;
};
export default DiagnosticsPanel;
