import React, { useEffect, useState } from 'react';
import { IPC_CHANNELS } from '@shared/ipcChannels';

interface ToolInfo { id: string; name?: string; description?: string; capabilities?: string[]; }

export const ToolRegistryPanel: React.FC<{ visible: boolean; prompt: string; onClose: ()=>void }> = ({ visible, prompt, onClose }) => {
  const [tools, setTools] = useState<ToolInfo[]>([]);
  const [invoking, setInvoking] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [argsJson, setArgsJson] = useState<string>('{}');
  const [providers, setProviders] = useState<Array<{id:string;name:string}>>([]);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [riskTolerance, setRiskTolerance] = useState<'low'|'medium'|'high'>('medium');
  const [targetFilesInput, setTargetFilesInput] = useState<string>('[]');

  useEffect(() => {
    if(!visible) return;
    let cancelled = false;
    (async () => {
      try {
  const list = await (window as any).primus?.ai?.listTools?.();
        if(cancelled) return;
        if(Array.isArray(list)) setTools(list as any);
      } catch(e:any){ if(!cancelled) setError('Failed to load tools: '+ e.message); }
    })();
    return () => { cancelled = true; };
  }, [visible]);

  useEffect(()=>{
    let cancelled = false;
    (async ()=>{
      try{
        const p = await (window as any).primus?.ai?.listProviders?.();
        if(cancelled) return;
        if(Array.isArray(p)){
          setProviders(p.map((x:any)=>({ id: x.id, name: x.name || x.id })));
          if(p.length) setSelectedProvider(p[0].id);
        }
      }catch(e){ /* ignore */ }
    })();
    return ()=>{ cancelled = true; };
  }, []);

  const invoke = async (id: string) => {
    if(invoking) return;
    setInvoking(id); setError(null); setResult(null);
    let toolArgs: any = undefined;
    try { if(argsJson.trim()) toolArgs = JSON.parse(argsJson); } catch(e:any){ setError('Args JSON invalid: '+ e.message); setInvoking(null); return; }

    // If invoking the patch-generator, merge provider/risk/targets into toolArgs
    if(id === 'patch-generator'){
      const targets = (() => { try { return JSON.parse(targetFilesInput); } catch { return []; } })();
      toolArgs = { ...(toolArgs || {}), providerId: selectedProvider, riskTolerance, targetFiles: targets };
    }

    try {
      const req = { id: 'tool_'+Date.now(), operation: 'invoke', prompt, includeContext: false, contextModules: [], providerHint: selectedProvider };
      const resp = await (window as any).primus?.ai?.invokeTool?.(id, req, toolArgs);
      setResult(resp);
    } catch(e:any){ setError('Invoke failed: '+ e.message); }
    finally { setInvoking(null); }
  };

  if(!visible) return null;
  return (
    <div className='tool-panel'>
      <div className='tool-panel-header'>
        <strong>Tools</strong>
        <button onClick={onClose} className='tp-close'>✕</button>
      </div>
      <div className='tool-panel-body'>
        {error && <div className='tp-error'>{error}</div>}
        <div className='tp-args'>
          <label>Args (JSON):</label>
          <textarea aria-label='Tool arguments JSON' value={argsJson} onChange={e=>setArgsJson(e.target.value)} rows={4} spellCheck={false} />
        </div>
        <div className='tp-tool-list'>
          {tools.length === 0 && <div className='tp-empty'>No tools registered.</div>}
          {tools.map(t => (
            <div key={t.id} className='tp-tool'>
              <div className='tp-tool-main'>
                <span className='tp-tool-id'>{t.id}</span>
                {t.name && <span className='tp-tool-name'> – {t.name}</span>}
              </div>
              {t.description && <div className='tp-tool-desc'>{t.description}</div>}
              {t.capabilities && <div className='tp-tool-caps'>Caps: {t.capabilities.join(', ')}</div>}
              {t.id === 'patch-generator' && (
                <div className='tp-patch-options'>
                  <label>Provider:</label>
                  <select value={selectedProvider ?? ''} onChange={e=>setSelectedProvider(e.target.value)}>
                    {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <label>Risk Tolerance:</label>
                  <select value={riskTolerance} onChange={e=>setRiskTolerance(e.target.value as any)}>
                    <option value='low'>Low</option>
                    <option value='medium'>Medium</option>
                    <option value='high'>High</option>
                  </select>
                  <label>Target files (JSON array):</label>
                  <input value={targetFilesInput} onChange={e=>setTargetFilesInput(e.target.value)} />
                </div>
              )}
              <button disabled={!!invoking} onClick={()=>invoke(t.id)} className='tp-invoke'>
                {invoking === t.id ? 'Running…' : 'Invoke'}
              </button>
            </div>
          ))}
        </div>
        {result && (
          <div className='tp-result'>
            <div className='tp-result-title'>Result</div>
            <pre>{safeStringify(result)}</pre>
          </div>
        )}
      </div>
    </div>
  );
};

function safeStringify(v:any){ try { return JSON.stringify(v, null, 2); } catch { return String(v); } }

// Inject minimal styles once
if(typeof document !== 'undefined' && !document.getElementById('tool-panel-styles')){
  const s = document.createElement('style');
  s.id = 'tool-panel-styles';
  s.textContent = `.tool-panel{position:absolute;top:4px;right:4px;width:320px;max-height:80vh;display:flex;flex-direction:column;background:var(--color-bg-alt);border:1px solid var(--color-border);border-radius:6px;font-size:12px;z-index:4000;padding:6px;box-shadow:0 2px 8px rgba(0,0,0,.4)}\n`+
    `.tool-panel-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;color:var(--color-text)}\n`+
    `.tp-close{background:var(--color-badge-bg);border:1px solid var(--color-border-strong);color:var(--color-text-muted);cursor:pointer;padding:2px 6px;border-radius:4px} .tp-close:hover{color:var(--color-text)}\n`+
    `.tp-error{color:var(--color-danger);margin-bottom:6px} .tp-args textarea{width:100%;background:var(--color-bg);color:var(--color-text);border:1px solid var(--color-border);font-family:var(--code-font,monospace);border-radius:4px} .tp-args{margin-bottom:6px}\n`+
    `.tp-tool-list{overflow:auto;max-height:240px;margin-bottom:6px;display:flex;flex-direction:column;gap:6px} .tp-tool{border:1px solid var(--color-border);padding:6px;border-radius:4px;background:var(--color-bg)} .tp-tool-id{font-weight:600} .tp-tool-desc{opacity:.8;margin:2px 0} .tp-tool-caps{font-size:11px;opacity:.7} .tp-invoke{margin-top:4px;background:var(--color-accent);color:#fff;border:1px solid var(--color-accent);border-radius:4px;padding:2px 8px;cursor:pointer} .tp-invoke:hover{filter:brightness(1.1)}\n`+
    `.tp-result{border-top:1px solid var(--color-border);padding-top:6px;max-height:200px;overflow:auto} .tp-result pre{background:var(--color-bg);padding:6px;border:1px solid var(--color-border);border-radius:4px;color:var(--color-text);}\n`+
    `.tp-patch-options{display:flex;flex-direction:column;gap:6px;margin-top:6px}.tp-patch-options select,.tp-patch-options input{width:100%;padding:4px;border-radius:4px;border:1px solid var(--color-border)}`;
  document.head.appendChild(s);
}