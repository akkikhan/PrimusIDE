// In-memory vector store (Phase 1 placeholder)
// Supports add/update and cosine similarity query
import type { EmbeddingVector, RetrievalQuery, RetrievalResult, VectorStoreSnapshotSummary } from '../../../shared/retrievalTypes.js';

class InMemoryVectorStore {
  private vectors: EmbeddingVector[] = [];
  private vectorById: Map<string, EmbeddingVector> = new Map();
  private dim: number | undefined;
  private updated: string | undefined;
  private persistPath: string | undefined;
  private dirty = false;

  configurePersistence(filePath: string){
    this.persistPath = filePath;
  }

  loadFromDisk(){
    if(!this.persistPath) return false;
    try {
      if(require('fs').existsSync(this.persistPath)){
        const raw = JSON.parse(require('fs').readFileSync(this.persistPath,'utf-8'));
        if(Array.isArray(raw?.vectors)){
          this.vectors = raw.vectors;
          this.dim = raw.dim;
          this.updated = raw.updated;
          return true;
        }
      }
    } catch {/* ignore */}
    return false;
  }

  private saveToDiskIfConfigured(){
    if(!this.persistPath || !this.dirty) return;
    try {
      require('fs').mkdirSync(require('path').dirname(this.persistPath), { recursive: true });
      require('fs').writeFileSync(this.persistPath, JSON.stringify({ vectors: this.vectors, dim: this.dim, updated: this.updated }), 'utf-8');
      this.dirty = false;
    } catch {/* ignore */}
  }

  addAll(vecs: EmbeddingVector[]) {
    if(vecs.length === 0) return;
    if(!this.dim) this.dim = vecs[0].values.length;
    const idSet = new Set(vecs.map(v => v.id));
    // filter existing
    this.vectors = this.vectors.filter(v => !idSet.has(v.id));
    // push & update map
    for(const v of vecs){
      this.vectors.push(v);
      this.vectorById.set(v.id, v);
    }
    this.updated = new Date().toISOString();
    this.dirty = true;
    this.saveToDiskIfConfigured();
  }

  clear(){
    this.vectors = [];
    this.dim = undefined;
    this.updated = new Date().toISOString();
    this.dirty = true;
    this.saveToDiskIfConfigured();
  }

  upsert(vec: EmbeddingVector){
    const idx = this.vectors.findIndex(v=> v.id === vec.id);
    if(idx >= 0) this.vectors[idx] = vec; else this.vectors.push(vec);
    this.vectorById.set(vec.id, vec);
    if(!this.dim) this.dim = vec.values.length;
    this.updated = new Date().toISOString();
    this.dirty = true;
    this.saveToDiskIfConfigured();
  }

  remove(id: string){
    const before = this.vectors.length;
    this.vectors = this.vectors.filter(v=> v.id !== id);
    this.vectorById.delete(id);
    if(this.vectors.length !== before){
      this.updated = new Date().toISOString();
      this.dirty = true;
      this.saveToDiskIfConfigured();
    }
  }

  removeBySource(sourcePath: string){
    const before = this.vectors.length;
    this.vectors = this.vectors.filter(v=> {
      const keep = (v.meta?.filePath || v.source) !== sourcePath;
      if(!keep) this.vectorById.delete(v.id);
      return keep;
    });
    if(this.vectors.length !== before){
      this.updated = new Date().toISOString();
      this.dirty = true;
      this.saveToDiskIfConfigured();
    }
  }

  replaceFileChunks(sourcePath: string, newChunks: EmbeddingVector[]){
    // remove existing for file, then add
    this.removeBySource(sourcePath);
    this.addAll(newChunks);
  }

  snapshot(): VectorStoreSnapshotSummary {
    return { vectorCount: this.vectors.length, dim: this.dim, lastUpdated: this.updated };
  }

  query(q: RetrievalQuery): RetrievalResult[] {
    if(!q.text.trim()) return [];
    if(this.vectors.length === 0) return [];
    // Cheap pseudo embedding for query text: hash chars into same dim (fallback 64)
    const dim = this.dim || 64;
    const qVec = new Array(dim).fill(0);
    for(let i=0;i<q.text.length;i++){
      const code = q.text.charCodeAt(i);
      qVec[i % dim] += code / 255; // scaled
    }
    const qNorm = Math.sqrt(qVec.reduce((s,v)=> s+v*v,0)) || 1;
    const scored = this.vectors.map(v => {
      if(!v.values || v.values.length === 0) return { id: v.id, score: 0, source: v.source, meta: v.meta, snippet: v.meta?.snippet };
      const dot = v.values.reduce((s,val,idx)=> s + val * (qVec[idx % qVec.length] || 0), 0);
      const vNorm = Math.sqrt(v.values.reduce((s,val)=> s+val*val,0)) || 1;
      const sim = dot / (vNorm * qNorm);
      return { id: v.id, score: sim, source: v.source, meta: v.meta, snippet: v.meta?.snippet };
    });
    scored.sort((a,b)=> b.score - a.score);
    const topK = q.topK && q.topK > 0 ? q.topK : 5;
    return scored.slice(0, topK);
  }

  // Simple search wrapper expected by context gather code (compat shim)
  async search(query: string, opts: { limit?: number } = {}) {
    const res = this.query({ text: query, topK: opts.limit || 5 } as any);
    // Map to shape expected: id, score, text (if meta has snippet)
    return res.map(r => ({ id: r.id, score: r.score, text: (r as any).text, source: (r as any).source, meta: r.meta, snippet: (r as any).snippet }));
  }
}

export const vectorStore = new InMemoryVectorStore();
