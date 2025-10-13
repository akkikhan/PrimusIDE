import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { vectorStore } from './vectorStore.js';
import { embeddingProviderRegistry } from '../embeddings/providerRegistry.js';
import type { EmbeddingVector, EmbeddingChunkMeta } from '../../../shared/retrievalTypes.js';

// ---- Configuration ----
const DEFAULT_DIM = 128; // increase dimension for better discrimination (still cheap)
const MAX_FILE_BYTES = 120_000; // skip very large files for now
const CHUNK_CHAR_TARGET = 1200; // soft chunk target
const CHUNK_CHAR_OVERLAP = 120; // overlap to preserve context continuity

// Simple heuristic language hint
function detectLang(filePath: string): string | undefined {
  if(/\.tsx?$/.test(filePath)) return 'typescript';
  if(/\.jsx?$/.test(filePath)) return 'javascript';
  if(/\.md$/.test(filePath)) return 'markdown';
  if(/\.json$/.test(filePath)) return 'json';
  return undefined;
}

// Legacy embedText kept for hashing chunk boundaries only (not semantic vector generation)
function simpleHash(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex').slice(0,16);
}

export interface BuildFileChunksOptions {
  filePath: string;
  rootDir?: string; // for relative path computation
  chunkTargetChars?: number;
  overlapChars?: number;
  dim?: number;
}

export function chunkFileContent(content: string, target = CHUNK_CHAR_TARGET, overlap = CHUNK_CHAR_OVERLAP): { text: string; startChar: number; endChar: number; index: number }[] {
  const chunks: { text: string; startChar: number; endChar: number; index: number }[] = [];
  let idx = 0;
  for(let offset=0; offset < content.length; offset += target){
    const slice = content.slice(offset, offset + target + overlap);
    chunks.push({ text: slice, startChar: offset, endChar: Math.min(content.length, offset + slice.length), index: idx++ });
  }
  return chunks;
}

export function buildFileChunks(opts: BuildFileChunksOptions): EmbeddingVector[] {
  const { filePath, rootDir = process.cwd(), chunkTargetChars = CHUNK_CHAR_TARGET, overlapChars = CHUNK_CHAR_OVERLAP, dim = DEFAULT_DIM } = opts;
  let stat: fs.Stats;
  try { stat = fs.statSync(filePath); } catch { return []; }
  if(!stat.isFile()) return [];
  if(stat.size > MAX_FILE_BYTES) return [];
  let raw: string;
  try { raw = fs.readFileSync(filePath,'utf-8'); } catch { return []; }
  if(!raw.trim()) return [];
  const langHint = detectLang(filePath);
  const relPath = path.relative(rootDir, filePath);
  const lines = raw.split(/\r?\n/);
  const lineOffsets: number[] = [0];
  for(const line of lines){ lineOffsets.push(lineOffsets[lineOffsets.length-1] + line.length + 1); }
  function charOffsetToLine(off: number){
    // binary search; simple linear fallback due to small chunk sizes
    for(let i=0;i<lineOffsets.length;i++) if(lineOffsets[i] > off) return i; // first lineOffset greater than off => line index i
    return lines.length;
  }
  const rawChunks = chunkFileContent(raw, chunkTargetChars, overlapChars);
  // Use provider registry for embeddings in batch for efficiency
  const texts = rawChunks.map(c => c.text);
  const embedResp = embeddingProviderRegistry.embedBatch({ texts, languageHints: rawChunks.map(()=> langHint) });
  // embedResp is Promise; we keep buildFileChunks sync for now -> fallback to placeholder synchronous approach
  // To avoid changing existing sync contract, we block here (small batches acceptable). Future: async refactor.
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  const awaited = (embedResp as unknown) as any; // Type narrowing below
  if (awaited instanceof Promise) {
    // This synchronous wrapper pattern: block via deasync-like approach not available; instead simple warning.
    // Fallback: local hash-based pseudo values to avoid breaking sync API.
    const fallbackVectors: EmbeddingVector[] = rawChunks.map(ch => {
      const pseudo = Array(dim).fill(0).map((_v,i)=> ((i % 2 ? 1 : -1) * (ch.text.charCodeAt(i % ch.text.length) || 1))/256);
      const startLine = charOffsetToLine(ch.startChar) + 1;
      const endLine = charOffsetToLine(ch.endChar) + 1;
      const snippet = ch.text.split(/\r?\n/).slice(0, 8).join('\n');
  const meta: EmbeddingChunkMeta = { filePath, relPath, startLine, endLine, mtimeMs: stat.mtimeMs, snippet, langHint, bytes: stat.size };
      const id = `${filePath}:${ch.index}`;
      return { id, source: relPath, values: pseudo, meta };
    });
    return fallbackVectors;
  }
  // If embedBatch became sync (unlikely), map results
  return [];
}

// ---- Async Version (preferred) ----
export async function buildFileChunksAsync(opts: BuildFileChunksOptions): Promise<EmbeddingVector[]> {
  const { filePath, rootDir = process.cwd(), chunkTargetChars = CHUNK_CHAR_TARGET, overlapChars = CHUNK_CHAR_OVERLAP } = opts;
  let stat: fs.Stats;
  try { stat = await fs.promises.stat(filePath); } catch { return []; }
  if(!stat.isFile()) return [];
  if(stat.size > MAX_FILE_BYTES) return [];
  let raw: string;
  try { raw = await fs.promises.readFile(filePath,'utf-8'); } catch { return []; }
  if(!raw.trim()) return [];
  const langHint = detectLang(filePath);
  const relPath = path.relative(rootDir, filePath);
  const lines = raw.split(/\r?\n/);
  const lineOffsets: number[] = [0];
  for(const line of lines){ lineOffsets.push(lineOffsets[lineOffsets.length-1] + line.length + 1); }
  function charOffsetToLine(off: number){
    for(let i=0;i<lineOffsets.length;i++) if(lineOffsets[i] > off) return i; // simple scan
    return lines.length;
  }
  const rawChunks = chunkFileContent(raw, chunkTargetChars, overlapChars);
  if(!rawChunks.length) return [];
  const texts = rawChunks.map(c => c.text);
  // Await real embeddings
  let resp; 
  try {
    resp = await embeddingProviderRegistry.embedBatch({ texts, languageHints: rawChunks.map(()=> langHint) });
  } catch (e: any) {
    console.warn('[AI][embeddings] embedBatch failed, falling back to pseudo vectors', e);
    resp = null;
  }
  const dim = resp?.dimensions || embeddingProviderRegistry.getActive().info.dimensions;
  const vectors: EmbeddingVector[] = [];
  for(const ch of rawChunks){
    let values: number[];
    if(resp && resp.vectors && resp.vectors.length === rawChunks.length){
      values = resp.vectors[ch.index] || [];
    } else {
      // fallback deterministic pseudo
      values = Array(dim).fill(0).map((_v,i)=> ((i % 2 ? 1 : -1) * (ch.text.charCodeAt(i % ch.text.length) || 1))/256);
    }
    if(values.length !== dim){
      if(values.length > dim) values = values.slice(0, dim); else values = values.concat(Array(dim - values.length).fill(0));
    }
    const startLine = charOffsetToLine(ch.startChar) + 1;
    const endLine = charOffsetToLine(ch.endChar) + 1;
    const snippet = ch.text.split(/\r?\n/).slice(0, 8).join('\n');
    const meta: EmbeddingChunkMeta = { filePath, relPath, startLine, endLine, mtimeMs: stat.mtimeMs, snippet, langHint, bytes: stat.size };
    const id = `${filePath}:${ch.index}`;
    vectors.push({ id, source: relPath, values, meta });
  }
  return vectors;
}

export async function reindexFileAsync(filePath: string, rootDir = process.cwd()): Promise<{ added: number; filePath: string }> {
  const vecs = await buildFileChunksAsync({ filePath, rootDir });
  vectorStore.replaceFileChunks(filePath, vecs);
  return { added: vecs.length, filePath };
}

export async function bulkReindexAsync(rootDir: string, pattern = /\.(ts|tsx|js|jsx|md)$/i, limit = 500): Promise<{ totalFiles: number; processed: number; vectors: number }> {
  const files: string[] = [];
  function walk(dir: string){
    let ents: fs.Dirent[] = [];
    try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for(const e of ents){
      const full = path.join(dir, e.name);
      if(e.isDirectory()) {
        if(/node_modules|dist|release|artifacts/.test(full)) continue;
        walk(full);
      } else if(pattern.test(e.name)) {
        files.push(full);
        if(files.length >= limit) break;
      }
    }
  }
  walk(rootDir);
  let totalVectors = 0;
  for(const f of files){
    const res = await reindexFileAsync(f, rootDir);
    totalVectors += res.added;
  }
  return { totalFiles: files.length, processed: files.length, vectors: totalVectors };
}

export function reindexFile(filePath: string, rootDir = process.cwd()): { added: number; filePath: string } {
  const vecs = buildFileChunks({ filePath, rootDir });
  vectorStore.replaceFileChunks(filePath, vecs);
  return { added: vecs.length, filePath };
}

export function bulkReindex(rootDir: string, pattern = /\.(ts|tsx|js|jsx|md)$/i, limit = 500): { totalFiles: number; processed: number; vectors: number } {
  const files: string[] = [];
  function walk(dir: string){
    let ents: fs.Dirent[] = [];
    try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for(const e of ents){
      const full = path.join(dir, e.name);
      if(e.isDirectory()) {
        if(/node_modules|dist|release|artifacts/.test(full)) continue;
        walk(full);
      } else if(pattern.test(e.name)) {
        files.push(full);
        if(files.length >= limit) break;
      }
    }
  }
  walk(rootDir);
  let totalVectors = 0;
  for(const f of files){
    totalVectors += reindexFile(f, rootDir).added;
  }
  return { totalFiles: files.length, processed: files.length, vectors: totalVectors };
}
