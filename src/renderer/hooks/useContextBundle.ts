import { useCallback, useEffect, useState } from 'react';
import type { ContextBundle } from '../../shared/contextTypes';

export interface UseContextBundleOptions {
  taskIds?: number[];
  top?: number;
  fromBatch?: boolean;
  auto?: boolean; // auto trigger on mount
}

interface State {
  loading: boolean;
  error?: string;
  bundle?: ContextBundle;
}

export function useContextBundle(options: UseContextBundleOptions){
  const [state, setState] = useState<State>({ loading: !!options.auto });

  const run = useCallback(async ()=>{
    setState({ loading: true });
    try {
      const api = (window as any).primus;
      if(!api || !api.context || typeof api.context.build !== 'function'){
        setState({ loading:false, error: 'Context API unavailable' });
        return;
      }
      const res = await api.context.build({ taskIds: options.taskIds, top: options.top, fromBatch: options.fromBatch });
      if((res as any).error){
        setState({ loading:false, error: (res as any).error });
      } else {
        setState({ loading:false, bundle: res as ContextBundle });
      }
    } catch(e:any){
      setState({ loading:false, error: String(e?.message || e) });
    }
  }, [options.taskIds, options.top, options.fromBatch]);

  useEffect(()=>{ if(options.auto) run(); }, [options.auto, run]);

  return { ...state, refresh: run };
}

export default useContextBundle;
