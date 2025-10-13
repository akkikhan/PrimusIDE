import fs from 'fs';
import path from 'path';
import { bulkReindexAsync, reindexFileAsync } from './indexer.js';
import { vectorStore } from './vectorStore.js';
import { embeddingProviderRegistry } from '../embeddings/providerRegistry.js';
import { EventEmitter } from 'events';

export interface ReindexProgress {
  runId: string;
  processed: number;
  totalFiles: number;
  vectors: number;
  phase: 'scanning' | 'embedding' | 'finalizing' | 'cancelled' | 'complete' | 'idle';
  startedAt: number;
  providerId: string;
}

export interface ReindexSummary {
  runId: string;
  totalFiles: number;
  processed: number;
  vectors: number;
  durationMs: number;
  cancelled: boolean;
  providerId: string;
  providerDim?: number;
  completedAt: number;
}

interface ActiveRun {
  id: string;
  abortController: AbortController;
  progress: ReindexProgress;
  vectorsAccum: number;
}

export class ReindexManager {
  private active: ActiveRun | null = null;
  private emitter = new EventEmitter();
  private lastSummary: ReindexSummary | null = null;
  private root: string;

  constructor(rootDir: string){
    this.root = rootDir;
  }

  setRoot(rootDir: string){
    if(this.root === rootDir) return;
    if(this.active){
      this.active.abortController.abort();
      this.active = null;
    }
    this.root = rootDir;
  }

  on(event: 'progress' | 'complete', listener: (payload: any)=> void){
    this.emitter.on(event, listener);
  }

  getLastSummary(){ return this.lastSummary; }
  isRunning(){ return !!this.active; }

  async startFull(pattern = /\.(ts|tsx|js|jsx|md)$/i, limit = 500): Promise<{ started: boolean; runId?: string; error?: string }> {
    if(this.active) return { started: false, error: 'already-running', runId: this.active.id };
    const runId = `reindex-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
    const abortController = new AbortController();
    const provider = embeddingProviderRegistry.getActive().info;
    const progress: ReindexProgress = { runId, processed: 0, totalFiles: 0, vectors: 0, phase: 'scanning', startedAt: Date.now(), providerId: provider.id };
    const active: ActiveRun = { id: runId, abortController, progress, vectorsAccum: 0 };
    this.active = active;
    this.emitProgress();

    // Run in background
    (async () => {
      try {
        // Collect file list (replicates bulkReindexAsync walk but allows early abort)
        const files: string[] = [];
        const walk = (dir: string) => {
          if(abortController.signal.aborted) return;
            let ents: fs.Dirent[] = [];
            try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
            for(const e of ents){
              if(abortController.signal.aborted) return;
              const full = path.join(dir, e.name);
              if(e.isDirectory()) {
                if(/node_modules|dist|release|artifacts/.test(full)) continue;
                walk(full);
              } else if(pattern.test(e.name)) {
                files.push(full);
                if(files.length >= limit) break;
              }
            }
        };
        walk(path.join(this.root, 'src'));
        progress.totalFiles = files.length;
        progress.phase = 'embedding';
        this.emitProgress();
        for(const f of files){
          if(abortController.signal.aborted) { break; }
          const res = await reindexFileAsync(f, this.root);
          active.vectorsAccum += res.added;
          progress.processed += 1;
          progress.vectors = active.vectorsAccum;
          this.emitProgress();
        }
        if(abortController.signal.aborted){
          progress.phase = 'cancelled';
        } else {
          progress.phase = 'finalizing';
          this.emitProgress();
        }
        // Final summary
        const summary: ReindexSummary = {
          runId,
          totalFiles: progress.totalFiles,
          processed: progress.processed,
          vectors: active.vectorsAccum,
          durationMs: Date.now() - progress.startedAt,
          cancelled: abortController.signal.aborted,
          providerId: provider.id,
          providerDim: provider.dimensions,
          completedAt: Date.now()
        };
        this.lastSummary = summary;
        progress.phase = abortController.signal.aborted ? 'cancelled' : 'complete';
        this.emitProgress();
        this.persistSummary(summary);
        this.emitter.emit('complete', { runId, summary });
      } catch (e: any) {
        // Treat errors as cancelled for now
        progress.phase = 'cancelled';
        this.emitProgress();
      } finally {
        this.active = null;
      }
    })();

    return { started: true, runId };
  }

  cancel(runId?: string){
    if(!this.active) return { cancelled: false, reason: 'no-active' };
    if(runId && this.active.id !== runId) return { cancelled: false, reason: 'run-id-mismatch' };
    this.active.abortController.abort();
    return { cancelled: true, runId: this.active.id };
  }

  private emitProgress(){
    if(!this.active) return;
    this.emitter.emit('progress', { ...this.active.progress });
  }

  private persistSummary(summary: ReindexSummary){
    try {
      const outDir = path.join(this.root, 'artifacts','ai');
      fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(path.join(outDir, 'reindex-summary.json'), JSON.stringify(summary, null, 2), 'utf8');
    } catch {/* ignore */}
  }
}

export const reindexManager = new ReindexManager(process.cwd());
