import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ToolRegistryPanel } from './Tools/ToolRegistryPanel';
import { loadSettings, updateQuickAI, updateLayout } from '@shared/settingsSchema';
import './styles/QuickAIDiff.css';
// Inline minimal styles injection (could migrate to stylesheet)
const ensureCtxBadgeStyles = () => {
  if(document.getElementById('qa-ctx-badge-styles')) return;
  const style = document.createElement('style');
  style.id = 'qa-ctx-badge-styles';
  style.textContent = `.quick-ai-context-badges{display:flex;flex-wrap:wrap;gap:4px;margin-top:6px}`+
    `.qa-ctx-badge{background:var(--color-badge-bg);border:1px solid var(--color-badge-border);border-radius:12px;padding:2px 6px;font-size:11px;font-family:var(--code-font,monospace);color:var(--color-text);}`+
    `.qa-ctx-badge.dropped{background:var(--color-badge-bg-dropped);border-color:var(--color-badge-border-dropped);padding:2px 6px;color:var(--color-danger)}`;
  document.head.appendChild(style);
};

/**
 * QuickAIPromptBar – Milestone 3
 * Summary of features (Milestones 1-3):
 *  - Collapsible persistent bar (localStorage key: quickAI.collapsed)
 *  - Provider selector (quickAI.providerHint) populated via preload bridge listProviders()
 *  - Prompt input with Enter-to-send (no Shift) & disabled states while loading/streaming
 *  - Truncated answer preview with expand/collapse (900 char threshold)
 *  - Streaming mode with partial token accumulation & cancel (quickAI.useStreaming)
 *  - Context inclusion toggle (quickAI.includeContext) forwarded to backend payload
 *  - Inline stats after completion: provider id, latency ms, approximate token estimate
 *  - Keyboard shortcut: Ctrl+Alt+Q toggles collapse (tooltip annotated)
 *  - Sidebar width slider (range 160–420px) dynamically updates CSS var --sidebar-width (layout.sidebarWidth)
 *  - Graceful fallback parsing of various AI response shapes (legacy / unified)
 *  - Defensive no-op if preload AI bridge unavailable (shows status banner)
 *  - All persistence uses localStorage with guarded try/catch to avoid quota/security errors
 *  - No Node imports; only interacts via window.primus.ai.* (request, stream, cancelStream, listProviders)
 * Future improvement ideas:
 *  - Add copy-to-clipboard button for answer
 *  - Display per-chunk token count if backend exposes stats
 *  - Provide retry & model capabilities tooltip
 *  - Integrate semantic context preview when includeContext is enabled
 */

interface Props { visible: boolean }

// QuickAIPromptBar – Milestone 3 implementation (streaming, context toggle, stats, hotkey, sidebar slider)
export const QuickAIPromptBar: React.FC<Props> = ({ visible }) => {
  // Visibility guard early (avoid mounting listeners if not shown)
  if(!visible) return null;
  ensureCtxBadgeStyles();

  // Core prompt / answer state
  const [prompt, setPrompt] = useState('');
  const [answer, setAnswer] = useState('');
  const [expandedAnswer, setExpandedAnswer] = useState(false);

  // UI / persistence states
  const initialSettings = useMemo(() => loadSettings(), []);
  const [collapsed, setCollapsed] = useState<boolean>(initialSettings.quickAI.collapsed);
  // providerHint can now be a real provider id OR the special string 'auto'
  const [providerHint, setProviderHint] = useState<string | undefined>(initialSettings.quickAI.providerHint);
  const [includeContext, setIncludeContext] = useState<boolean>(initialSettings.quickAI.includeContext);
  const [useStreaming, setUseStreaming] = useState<boolean>(initialSettings.quickAI.useStreaming);
  const [sidebarWidth, setSidebarWidth] = useState<number>(initialSettings.layout.sidebarWidth);

  // Runtime states
  const [providers, setProviders] = useState<{ id: string; name: string; supports: string[] }[]>([]);
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [partial, setPartial] = useState('');
  const [stats, setStats] = useState<{ provider?: string; latencyMs?: number; tokensApprox?: number } | null>(null);
  const [liveTokensApprox, setLiveTokensApprox] = useState<number>(0); // live counter during streaming
  const [warnings, setWarnings] = useState<string[]>([]);
  // Variant preference (persist last used)
  const initialVariant = (() => {
    try { const v = localStorage.getItem('ai.defaultVariant'); if(v==='explain'||v==='improve'||v==='tests'||v==='default') return v; } catch{} return 'default';
  })();
  const [variant, setVariant] = useState<'default'|'explain'|'improve'|'tests'>(initialVariant);
  useEffect(()=>{ try { localStorage.setItem('ai.defaultVariant', variant); } catch{} }, [variant]);
  const [showContextModal, setShowContextModal] = useState(false);
  const [contextModules, setContextModules] = useState<string[]>(initialSettings.quickAI.contextModules.length ? initialSettings.quickAI.contextModules : ['current-file']);
  const [showTools, setShowTools] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const originalContentRef = useRef<string>('');
  const [diffLines, setDiffLines] = useState<{type:'ctx'|'add'|'del'|'same'; left?:string; right?:string}[]>([]);

  // Refs
  const startedAtRef = useRef<number | null>(null);
  const streamIdRef = useRef<string | null>(null);

  // AI availability
  const aiAvailable = !!(window as any).primus?.ai?.request;

  // Load providers once
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const list = await (window as any).primus?.ai?.listProviders?.();
        if(mounted && Array.isArray(list)) setProviders(list as any);
      } catch {/* ignore */}
    })();
    return () => { mounted = false; };
  }, []);

  // Persisted effects (central settings)
  useEffect(() => { updateQuickAI({ collapsed }); }, [collapsed]);
  useEffect(() => { updateQuickAI({ providerHint }); }, [providerHint]);
  useEffect(() => { updateQuickAI({ includeContext }); }, [includeContext]);
  useEffect(() => { updateQuickAI({ useStreaming }); }, [useStreaming]);
  useEffect(() => { updateLayout({ sidebarWidth }); document.documentElement.style.setProperty('--sidebar-width', sidebarWidth + 'px'); }, [sidebarWidth]);
  useEffect(() => { document.documentElement.style.setProperty('--sidebar-width', sidebarWidth + 'px'); }, []); // initial apply
  useEffect(() => { updateQuickAI({ contextModules }); }, [contextModules]);

  // Global event to open last diff via command palette
  useEffect(()=>{
    const open = () => { if(diffLines.length) setShowDiff(true); };
    window.addEventListener('quickAI.openDiff', open as any);
    return () => window.removeEventListener('quickAI.openDiff', open as any);
  }, [diffLines]);

  useEffect(()=>{
    const apply = () => {
      if(!diffLines.length) return;
      const improved = diffLines.filter(l=> l.right!==undefined).map(l=> l.right).join('\n');
      try { window.dispatchEvent(new CustomEvent('quickAI.insertAnswer', { detail: { text: improved } })); } catch{}
    };
    window.addEventListener('quickAI.applyDiff', apply as any);
    return () => window.removeEventListener('quickAI.applyDiff', apply as any);
  }, [diffLines]);

  // Hotkey: Ctrl+Alt+Q toggles collapse
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if(e.ctrlKey && e.altKey && (e.key === 'q' || e.key === 'Q')) { e.preventDefault(); setCollapsed(c => !c); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  /**
   * Heuristic auto-selection: scores providers based on prompt traits & declared supports[] metadata.
   * Simple, deterministic, transparent – future versions can incorporate latency stats & success rates.
   */
  const chooseProviderForPrompt = (p: string, list: {id:string; name:string; supports:string[]}[]) => {
    if(!p || !Array.isArray(list) || list.length === 0) return undefined;
    const lower = p.toLowerCase();
    const hasCodeFence = /```/.test(p);
    const codeKeywords = /(function|class |import |export |const |let |var |def |refactor|optimiz|typescript|interface )/i.test(p);
    const long = p.length > 400;
    const short = p.length < 120;
    let best: any = null; let bestScore = -1;
    for(const prov of list){
      let score = 0;
      const supports = prov.supports || [];
      if(short && supports.includes('fast')) score += 3; // low-latency models
      if(long && supports.includes('reasoning')) score += 4; // bigger context / reasoning models
      if((hasCodeFence || codeKeywords) && (supports.includes('code') || supports.includes('tools'))) score += 5; // code-centric
      if(lower.includes('test') && supports.includes('code')) score += 2;
      if(lower.includes('explain') && supports.includes('reasoning')) score += 2;
      // Mild preference for multi-capability providers
      if(supports.length > 2) score += 1;
      if(score > bestScore){ bestScore = score; best = prov; }
    }
    return best || list[0];
  };

  const selectedProviderDirect = useMemo(() => providers.find(p => p.id === providerHint) || providers[0], [providers, providerHint]);
  const autoChosen = useMemo(() => providerHint === 'auto' ? chooseProviderForPrompt(prompt, providers) : null, [providerHint, prompt, providers]);
  const effectiveProvider = providerHint === 'auto' ? (autoChosen || providers[0]) : selectedProviderDirect;

  const chosenProviderRef = useRef<string | null>(null); // captures provider actually used for in-flight request (immutable per submit)

  const finishStats = () => {
    if(startedAtRef.current != null) {
      const latencyMs = Date.now() - startedAtRef.current;
      const body = streaming ? partial : answer;
      const tokensApprox = Math.round((prompt.length + body.length) / 4);
      setStats({ provider: chosenProviderRef.current || effectiveProvider?.id, latencyMs, tokensApprox });
      startedAtRef.current = null;
    }
  };

  const cancelStream = () => {
    if(streaming && streamIdRef.current && (window as any).primus?.ai?.cancelStream) {
      (window as any).primus.ai.cancelStream(streamIdRef.current);
    }
  };

  const submit = async () => {
    if(!prompt.trim() || loading || streaming) return;
  let effectivePrompt = prompt;
  if(variant === 'explain') effectivePrompt = `Explain the following code or question with concise, insightful detail:\n${prompt}`;
  else if(variant === 'improve') effectivePrompt = `Suggest improvements/refactoring (keep semantics) for:\n${prompt}`;
  else if(variant === 'tests') effectivePrompt = `Propose meaningful test cases for the following (include edge cases):\n${prompt}`;
    // Capture original source for diffing only for improve/tests (skip for default/explain)
    if(variant === 'improve' || variant === 'tests') {
      originalContentRef.current = prompt;
    } else {
      originalContentRef.current = '';
      setDiffLines([]);
    }
  setLoading(true); setAnswer(''); setExpandedAnswer(false); setPartial(''); setStats(null); setLiveTokensApprox(0);
    startedAtRef.current = Date.now();
    try {
      if(!aiAvailable) throw new Error('AI bridge unavailable (preload not exposing primus.ai).');
      
      // Iteration B Step 1: Call gatherContext if includeContext is enabled
      if(includeContext && (window as any).primus?.ai?.gatherContext) {
        try {
          let currentFilePath: string | undefined = undefined;
          try {
            const monaco = (window as any).monaco;
            const editor = monaco?.editor;
            const models = editor?.getModels?.();
            if(models && models.length) {
              // Heuristic: first model or model with most lines
              let chosen = models[0];
              for(const m of models) { if(m.getLineCount() > chosen.getLineCount()) chosen = m; }
              currentFilePath = chosen.uri?.path || chosen.uri?.fsPath || chosen.uri?.toString();
            }
          } catch {/* swallow */}
          // Capture current selection text (Monaco or DOM). If empty string, omit.
          let selectionText: string | undefined = undefined;
          try {
            const monaco = (window as any).monaco;
            // Try to use first editor instance if an API exists
            let activeEditor: any = undefined;
            try {
              const editors = monaco?.editor?.getEditors?.();
              if(Array.isArray(editors) && editors.length) activeEditor = editors[0];
            } catch {/* ignore */}
            if(!activeEditor && monaco?.editor?.getStandaloneCodeEditor) {
              try { activeEditor = monaco.editor.getStandaloneCodeEditor(); } catch {/* ignore */}
            }
            if(activeEditor && activeEditor.getSelection && activeEditor.getModel) {
              const sel = activeEditor.getSelection();
              if(sel && (sel.startLineNumber !== sel.endLineNumber || sel.startColumn !== sel.endColumn)) {
                const model = activeEditor.getModel();
                if(model?.getValueInRange) selectionText = model.getValueInRange(sel);
              }
            }
            // Fallback to DOM selection if Monaco path failed
            if(!selectionText) {
              const domSel = window.getSelection?.();
              if(domSel) {
                const txt = domSel.toString();
                if(txt && txt.trim().length > 0) selectionText = txt;
              }
            }
            if(selectionText && selectionText.trim().length === 0) selectionText = undefined;
            if(selectionText && selectionText.length > 8000) selectionText = selectionText.slice(0, 8000); // safety cap
          } catch {/* ignore selection issues */}
          const contextReq = { modules: contextModules, budgetTokens: 4000, currentFilePath };
          if(selectionText && contextModules.includes('selection')) {
            (contextReq as any).selectionText = selectionText;
          }
          if(contextModules.includes('diagnostics')) {
            try {
              const monaco = (window as any).monaco;
              const markerService = monaco?.editor; // Monaco exposes getModelMarkers via editor API
              let diagText = '';
              if(monaco?.editor?.getModelMarkers) {
                const markers = monaco.editor.getModelMarkers({});
                if(markers && markers.length) {
                  // Aggregate counts by severity 1..8 (Monaco uses Severity enum: 1 Error, 2 Warning, 4 Info, 8 Hint typically)
                  const counts: Record<string, number> = {};
                  const samples: string[] = [];
                  for(const mk of markers) {
                    const sev = String(mk.severity);
                    counts[sev] = (counts[sev]||0)+1;
                    if(samples.length < 8 && mk.message) {
                      samples.push(`${mk.severity}:${mk.message.slice(0,140).replace(/\s+/g,' ')}`);
                    }
                  }
                  diagText = `diagnostics total=${markers.length} counts=${Object.entries(counts).map(([k,v])=>k+':'+v).join(',')} samples=${samples.join(' | ')}`;
                  if(diagText.length > 4000) diagText = diagText.slice(0,4000);
                } else {
                  diagText = 'diagnostics none';
                }
              }
              if(diagText) (contextReq as any).diagnosticsSummary = diagText;
            } catch {/* ignore diagnostics issues */}
          }
          const contextResp = await (window as any).primus.ai.gatherContext(contextReq);
          try {
            const summary = contextResp.modules.map((m: any) => `${m.id}${m.truncated?'~':''}:${m.tokensApprox}`).join(', ');
            console.groupCollapsed('[QuickAI] Context Modules');
            console.log('Requested:', contextModules.join(', '));
            
            if(contextResp.dropped?.length) console.log('Dropped:', contextResp.dropped.join(', '));
            
            if(contextResp.totalMs != null) console.log('Total time:', contextResp.totalMs + 'ms');
            if(Array.isArray(contextResp.moduleTimings)) {
              for(const t of contextResp.moduleTimings) {
                console.log(`  ${t.module}: ${t.timeMs}ms`);
              }
            }
            console.groupEnd();
          } catch { console.log('[QuickAI] gatherContext response:', contextResp); }
        } catch(ctxErr: any) {
          console.warn('[QuickAI] gatherContext failed:', ctxErr.message);
        }
      }
      
      // Determine provider to use (respect 'auto' heuristic)
      const providerToUse = effectiveProvider?.id;
      chosenProviderRef.current = providerHint === 'auto' ? ('auto->' + providerToUse) : providerToUse || null;
      if(useStreaming && (window as any).primus?.ai?.stream) {
        setStreaming(true);
        const id = 'quick_' + Date.now();
        const sid = (window as any).primus.ai.stream(
          { id, operation: variant==='default'?'chat': (variant==='improve'?'refactor': variant==='tests'?'tests':'explain'), prompt: effectivePrompt, includeContext, contextModules, providerHint: providerToUse },
          (chunk: { delta: string }) => {
            if(!chunk || typeof chunk.delta !== 'string') return;
            if(chunk.delta.startsWith('__error:')) { setStreaming(false); setLoading(false); setAnswer('Error: ' + chunk.delta.replace('__error:', '')); finishStats(); return; }
            if(chunk.delta.startsWith('__info:cancelled')) { setStreaming(false); setLoading(false); finishStats(); return; }
            if(chunk.delta.startsWith('__warn:')) { setWarnings(w=> [...w, chunk.delta.replace('__warn:','')]); return; }
            setPartial(p => {
              const next = p + chunk.delta;
              // crude token approximation: 1 token ~ 4 chars (fallback). Could refine with provider metadata later.
              setLiveTokensApprox(Math.round((prompt.length + next.length) / 4));
              return next;
            });
          },
          (final: any) => {
            const text = (final?.response?.text || final?.content || final?.response?.content || final?.response?.message || partial || '');
            setAnswer(text); setPartial(''); setStreaming(false); setLoading(false); finishStats();
            if((variant==='improve'||variant==='tests') && originalContentRef.current){
              buildDiff(originalContentRef.current, text);
            }
          }
        );
        streamIdRef.current = sid;
      } else {
        const resp = await (window as any).primus.ai.request({ id: 'quick_' + Date.now(), operation: variant==='default'?'chat': (variant==='improve'?'refactor': variant==='tests'?'tests':'explain'), prompt: effectivePrompt, includeContext, contextModules, providerHint: providerToUse });
        const text = resp?.response?.text || resp?.content || resp?.response?.content || resp?.response?.message || JSON.stringify(resp);
        setAnswer(text); setLoading(false); finishStats();
        if((variant==='improve'||variant==='tests') && originalContentRef.current){
          buildDiff(originalContentRef.current, text);
        }
      }
    } catch(e: any) {
      setAnswer('Error: ' + e.message);
      setLoading(false); setStreaming(false); finishStats();
    }
  };

  const clear = () => {
    if(loading || streaming) return;
  setPrompt(''); setAnswer(''); setExpandedAnswer(false); setPartial(''); setStats(null); setLiveTokensApprox(0);
  };

  // Action helpers (iteration A)
  const recordAction = (type: string) => { /* future telemetry hook */ };
  const recordAutoProviderDecision = (resolved: string | undefined) => { /* future telemetry hook auto-choice */ };
  const copyAnswer = async () => {
    const text = streaming ? partial : answer;
    if(!text) return;
    try { await navigator.clipboard.writeText(text); recordAction('copy'); } catch {/* ignore */}
  };
  const insertAnswer = () => {
    const text = streaming ? partial : answer;
    if(!text) return;
    try {
      window.dispatchEvent(new CustomEvent('quickAI.insertAnswer', { detail: { text } }));
      recordAction('insert');
    } catch {/* ignore */}
  };

  // Context modal interactions (stub)
  const toggleContextModule = (id: string) => {
    setContextModules(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev, id]);
  };
  const closeContextModal = () => setShowContextModal(false);
  const saveContextModal = () => { /* future: maybe validate presence */ setShowContextModal(false); };

  const hasCodeBlock = useMemo(() => /```/.test(streaming ? partial : answer), [partial, answer, streaming]);
  const handleDiffPreviewStub = () => { recordAction('diffPreviewStub'); };
  const openDiff = () => { if(diffLines.length) setShowDiff(true); };
  function buildDiff(a: string, b: string){
    const aLines = a.split(/\r?\n/);
    const bLines = b.split(/\r?\n/);
    // LCS DP
    const n = aLines.length, m = bLines.length;
    const dp: number[][] = Array.from({length:n+1},()=> Array(m+1).fill(0));
    for(let i=n-1;i>=0;i--){
      for(let j=m-1;j>=0;j--){
        if(aLines[i] === bLines[j]) dp[i][j] = dp[i+1][j+1]+1; else dp[i][j] = Math.max(dp[i+1][j], dp[i][j+1]);
      }
    }
    const lines: {type:'ctx'|'add'|'del'|'same'; left?:string; right?:string}[] = [];
    let i=0,j=0;
    while(i<n && j<m){
      if(aLines[i] === bLines[j]) { lines.push({type:'same', left:aLines[i], right:bLines[j]}); i++; j++; }
      else if(dp[i+1][j] >= dp[i][j+1]) { lines.push({type:'del', left:aLines[i++]}); }
      else { lines.push({type:'add', right:bLines[j++]}); }
    }
    while(i<n) lines.push({type:'del', left:aLines[i++]});
    while(j<m) lines.push({type:'add', right:bLines[j++]});
    setDiffLines(lines);
  }

  const truncated = useMemo(() => {
    const max = 900;
    const src = streaming ? partial : answer;
    if(!src) return '';
    if(expandedAnswer || src.length <= max) return src;
    return src.slice(0, max) + '…';
  }, [answer, partial, streaming, expandedAnswer]);

  return (
    <div className={`quick-ai-bar ${collapsed ? 'collapsed':''}`} role='region' aria-label='Quick AI prompt bar'>
      <button
        className='qa-btn collapse-toggle'
        aria-label={collapsed ? 'Expand quick AI bar' : 'Collapse quick AI bar'}
        onClick={() => setCollapsed(c => !c)}
        title={(collapsed ? 'Expand Quick AI' : 'Collapse Quick AI') + ' (Ctrl+Alt+Q)'}
      >{collapsed ? '▲' : '▼'}</button>
      {!collapsed && (
        <>
          <div className='quick-ai-toggles'>
            <label className='qa-toggle'><input type='checkbox' checked={useStreaming} onChange={e=>setUseStreaming(e.target.checked)} /> Stream</label>
            <label className='qa-toggle'><input type='checkbox' checked={includeContext} onChange={e=>setIncludeContext(e.target.checked)} /> Ctx</label>
            <button
              type='button'
              className='qa-inline-btn qa-context-btn'
              onClick={()=> setShowContextModal(true)}
              disabled={loading || streaming}
              title='Configure context granularity'
            >Context+</button>
          </div>
          <div className='quick-ai-providerWrap'>
            <select
              className='quick-ai-provider'
              aria-label='AI Provider'
              value={providerHint === 'auto' ? 'auto' : (effectiveProvider?.id || '')}
              onChange={e => setProviderHint(e.target.value)}
              disabled={!aiAvailable || loading || providers.length === 0}
              title={providerHint === 'auto' && effectiveProvider ? `Auto resolved -> ${effectiveProvider.name}` : 'Select provider'}
            >
              {providers.length > 1 && <option value='auto'>Auto (smart)</option>}
              {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            {providerHint === 'auto' && effectiveProvider && (
              <div className='quick-ai-autoResolved' aria-live='polite'>→ {effectiveProvider.name}</div>
            )}
          </div>
          <div className='quick-ai-inputWrap'>
            <input
              className='quick-ai-input'
              placeholder='Ask AI…'
              aria-label='Quick AI prompt'
              value={prompt}
              onChange={e=>setPrompt(e.target.value)}
              onKeyDown={e=>{ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); submit(); } }}
              disabled={!aiAvailable || loading || streaming}
            />
          </div>
          <div className='quick-ai-actions'>
            <button className='qa-btn send' disabled={!aiAvailable || loading || streaming || !prompt.trim()} onClick={submit}>{aiAvailable ? (loading? 'Sending…':'Send') : 'Disabled'}</button>
            <button className='qa-btn clear' disabled={loading || streaming || (!prompt && !answer && !partial)} onClick={clear}>Clear</button>
            {streaming && <button className='qa-btn clear' onClick={cancelStream}>Cancel</button>}
            <button className='qa-btn secondary' disabled={loading || streaming} onClick={()=> setShowTools(s=>!s)}>Tools</button>
            <div className='quick-ai-variants'>
              <button className={`qa-inline-btn ${variant==='default'?'active':''}`} disabled={loading||streaming} onClick={()=>setVariant('default')}>Chat</button>
              <button className={`qa-inline-btn ${variant==='explain'?'active':''}`} disabled={loading||streaming} onClick={()=>setVariant('explain')}>Explain</button>
              <button className={`qa-inline-btn ${variant==='improve'?'active':''}`} disabled={loading||streaming} onClick={()=>setVariant('improve')}>Improve</button>
              <button className={`qa-inline-btn ${variant==='tests'?'active':''}`} disabled={loading||streaming} onClick={()=>setVariant('tests')}>Tests</button>
            </div>
          </div>
        </>
      )}
      <div className='quick-ai-outputArea'>
        {!aiAvailable && <div className='quick-ai-status warn'>AI disabled: preload bridge missing. Rebuild or check policy load.</div>}
        {(answer || partial) && (
          <div className={`quick-ai-answer ${expandedAnswer ? 'expanded':''}`} aria-live='polite'>
            {truncated}
            {((streaming ? partial : answer).length > truncated.length) && !expandedAnswer && (
              <button className='qa-inline-btn expand' onClick={() => setExpandedAnswer(true)}>Show more</button>
            )}
            {expandedAnswer && (streaming ? partial.length : answer.length) > 900 && (
              <button className='qa-inline-btn collapse' onClick={() => setExpandedAnswer(false)}>Collapse</button>
            )}
            {streaming && <div className='quick-ai-progress'>Streaming… ({partial.length} chars · ~{liveTokensApprox} tok)</div>}
            {warnings.length > 0 && (
              <div className='quick-ai-warnings'>
                {warnings.map((w,i)=> <div key={i} className='qa-warn-item'>{w}</div>)}
              </div>
            )}
            <div className='quick-ai-answer-actions'>
              <button className='qa-inline-btn' onClick={copyAnswer} disabled={!(answer || partial)}>Copy</button>
              <button className='qa-inline-btn' onClick={insertAnswer} disabled={!(answer || partial)}>Insert</button>
              {hasCodeBlock && (
                <button className='qa-inline-btn qa-diff-btn' onClick={openDiff} disabled={!diffLines.length} title={diffLines.length? 'Open Diff':'Diff available after completion'}>Diff</button>
              )}
            </div>
          </div>
        )}
        {stats && !streaming && (
          <div className='quick-ai-stats'>
            <span>{stats.provider}</span>
            <span>{stats.latencyMs?.toFixed(0)} ms</span>
            <span>~{stats.tokensApprox} tokens</span>
          </div>
        )}
        {/* Context badges (post-answer) */}
        {!streaming && includeContext && (window as any)._lastAIContext && (
          <div className='quick-ai-context-badges'>
            {((window as any)._lastAIContext.modules||[]).map((m:any) => (
              <span key={m.id} className='qa-ctx-badge' title={`~${m.tokensApprox} tokens${m.truncated?' (truncated)':''}`}>
                {m.id}{m.truncated?'~':''}:{m.tokensApprox}
              </span>
            ))}
              {showDiff && (
                <div className='qa-diff-modal' role='dialog' aria-modal='true'>
                  <div className='qa-diff-header'>
                    <div className='qa-diff-title'>Diff (original vs answer)</div>
                    <div className='qa-diff-btnGroup'>
                      <button className='qa-inline-btn' onClick={()=>{
                        // Build improved content using right side precedence (adds + same lines)
                        const improved = diffLines.filter(l=> l.right!==undefined).map(l=> l.right).join('\n');
                        try { window.dispatchEvent(new CustomEvent('quickAI.insertAnswer', { detail: { text: improved } })); } catch{}
                      }}>Apply</button>
                      <button className='qa-inline-btn' onClick={()=> setShowDiff(false)}>Close</button>
                    </div>
                  </div>
                  <div className='qa-diff-body'>
                    <div className='qa-diff-cols'>
                      <div className='qa-diff-col qa-diff-left'>
                        {diffLines.map((l,i)=> l.left!==undefined && <div key={'L'+i} className={`qa-diff-line ${l.type==='del'?'del': l.type==='same'?'same':'skip'}`}>{l.left}\u00A0</div>)}
                      </div>
                      <div className='qa-diff-col qa-diff-right'>
                        {diffLines.map((l,i)=> l.right!==undefined && <div key={'R'+i} className={`qa-diff-line ${l.type==='add'?'add': l.type==='same'?'same':'skip'}`}>{l.right}\u00A0</div>)}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            {((window as any)._lastAIContext.dropped||[]).map((d:string) => (
              <span key={'drop_'+d} className='qa-ctx-badge dropped' title='dropped (budget or error)'>
                {d}!
              </span>
            ))}
          </div>
        )}
      </div>
      {!collapsed && (
        <div className='quick-ai-sidebarWidth'>
          <label>Sidebar: <input type='range' min={160} max={420} value={sidebarWidth} onChange={e=> setSidebarWidth(parseInt(e.target.value,10))} /></label>
          <span className='qa-side-val'>{sidebarWidth}px</span>
        </div>
      )}
      {showContextModal && (
        <div className='quick-ai-contextModalOverlay' role='dialog' aria-modal='true' aria-label='Select context modules'>
          <div className='quick-ai-contextModal'>
            <div className='qa-cm-header'>Context Sources (stub)</div>
            <div className='qa-cm-sub'>Choose which sources to include when Ctx is enabled (future backend wiring).</div>
            <div className='qa-cm-list'>
              <label className='qa-cm-item'>
                <input type='checkbox' checked={contextModules.includes('current-file')} onChange={()=>toggleContextModule('current-file')} /> Current File
              </label>
              <label className='qa-cm-item'>
                <input type='checkbox' checked={contextModules.includes('selection')} onChange={()=>toggleContextModule('selection')} /> Current Selection
              </label>
              <label className='qa-cm-item disabled' title='Coming soon'>
                <input type='checkbox' disabled /> Related Tests
              </label>
              <label className='qa-cm-item'>
                <input type='checkbox' checked={contextModules.includes('diagnostics')} onChange={()=>toggleContextModule('diagnostics')} /> Recent Diagnostics
              </label>
              <label className='qa-cm-item'>
                <input type='checkbox' checked={contextModules.includes('retrieval')} onChange={()=>toggleContextModule('retrieval')} /> Retrieval Snippets
              </label>
            </div>
            <div className='qa-cm-actions'>
              <button className='qa-inline-btn' onClick={saveContextModal}>Save</button>
              <button className='qa-inline-btn' onClick={closeContextModal}>Close</button>
            </div>
          </div>
        </div>
      )}
      <ToolRegistryPanel visible={showTools} prompt={prompt} onClose={()=> setShowTools(false)} />
    </div>
  );
};
