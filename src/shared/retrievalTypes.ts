// Basic retrieval shared types (Phase 1 placeholder)
// TASK: retrieval foundation
// Additional metadata for file/code chunks enabling incremental re-indexing
export interface EmbeddingChunkMeta {
  filePath: string;      // absolute file path
  relPath?: string;      // workspace-relative path
  startLine: number;     // inclusive line start (1-based)
  endLine: number;       // inclusive line end (1-based)
  mtimeMs?: number;      // file modified time when chunk embedded
  snippet?: string;      // short preview snippet (trimmed)
  langHint?: string;     // optional language detected (for future tokenization)
  bytes?: number;        // raw file bytes length
}

export interface EmbeddingVector {
  id: string;            // unique identifier (e.g., file:path:chunkIndex)
  source: string;        // human readable source descriptor (usually relPath)
  values: number[];      // embedding numeric values
  meta?: EmbeddingChunkMeta & Record<string, any>;
}

export interface RetrievalQuery {
  text: string;
  topK?: number;
}

export interface RetrievalResult {
  id: string;
  score: number; // similarity score (higher = closer)
  source: string;
  meta?: EmbeddingChunkMeta & Record<string, any>;
  snippet?: string; // convenience duplication (if meta.snippet not present)
}

export interface VectorStoreSnapshotSummary {
  vectorCount: number;
  dim?: number;
  lastUpdated?: string;
}
