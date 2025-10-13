import * as crypto from 'crypto';
import type { EmbeddingProvider, EmbeddingProviderInfo, EmbedRequest, EmbedResponse } from '../../../shared/embeddingTypes.js';
import { emitEmbeddingBatch } from './embeddingTelemetry.js';
// Dimension guard: we import vectorStore lazily (commonjs interop safe) to avoid circular issues.
import { vectorStore } from '../retrieval/vectorStore.js';

// Simple hash placeholder provider (deterministic pseudo-embedding)
class HashPlaceholderProvider implements EmbeddingProvider {
  info: EmbeddingProviderInfo = {
    id: 'hashPlaceholder',
    name: 'Hash Placeholder',
    dimensions: 128,
    supportsBatch: true,
    maxBatchSize: 64,
  };

  async embed(req: EmbedRequest): Promise<EmbedResponse> {
    const dims = this.info.dimensions;
    const vectors = req.texts.map(t => this.hashEmbed(t, dims));
    return { vectors, model: 'hash/v1', dimensions: dims, providerId: this.info.id };
  }

  private hashEmbed(text: string, dim: number): number[] {
    const vec = new Array(dim).fill(0);
    for (let i = 0; i < text.length; i += 256) {
      const slice = text.slice(i, i + 256);
      const h = crypto.createHash('sha256').update(slice).digest();
      for (let j = 0; j < dim && j < h.length; j++) vec[j] += h[j] / 255;
    }
    const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
    return vec.map(v => v / norm);
  }
}

class EmbeddingProviderRegistry {
  private providers = new Map<string, EmbeddingProvider>();
  private activeId: string;
  private batchSize = 16;

  constructor() {
    const hash = new HashPlaceholderProvider();
    this.providers.set(hash.info.id, hash);
    this.activeId = hash.info.id;
  }

  list(): EmbeddingProviderInfo[] { return Array.from(this.providers.values()).map(p => p.info); }
  getActive(): EmbeddingProvider { return this.providers.get(this.activeId)!; }
  setActive(id: string) {
    if (!this.providers.has(id)) return;
    const prev = this.getActive();
    const next = this.providers.get(id)!;
    if (prev.info.id === next.info.id) return; // no-op
    this.activeId = id;
    // Dimension mismatch guard: if existing vectors were embedded with different dimension, clear store
    try {
      const snap = vectorStore.snapshot();
      if (snap.dim && snap.dim !== next.info.dimensions) {
        
        vectorStore.clear();
      }
    } catch (e: any) {
      console.warn('[AI][embeddings] dimension guard failed', e);
    }
  }
  setBatchSize(n: number) { this.batchSize = Math.min(Math.max(1, n), 64); }
  getBatchSize() { return this.batchSize; }
  register(p: EmbeddingProvider, setActive = false) {
    this.providers.set(p.info.id, p);
    if (setActive) this.activeId = p.info.id;
  }

  async embedBatch(req: EmbedRequest): Promise<EmbedResponse> {
    const provider = this.getActive();
    const max = provider.info.maxBatchSize;
    const batchLimit = Math.min(this.batchSize, max);

    // Single batch fast path
    if (req.texts.length <= batchLimit) {
      const start = process.hrtime.bigint();
      const result = await provider.embed(req);
      const end = process.hrtime.bigint();
      emitEmbeddingBatch({
        providerId: provider.info.id,
        batchSize: req.texts.length,
        totalItems: req.texts.length,
        durationMs: Number(end - start) / 1_000_000,
        model: result.model,
      });
      return result;
    }

    // Multi-batch path – slice and accumulate
    const all: number[][] = [];
    for (let i = 0; i < req.texts.length; i += batchLimit) {
      const slice = req.texts.slice(i, i + batchLimit);
      const sliceReq: EmbedRequest = { ...req, texts: slice };
      const start = process.hrtime.bigint();
      const part = await provider.embed(sliceReq);
      const end = process.hrtime.bigint();
      emitEmbeddingBatch({
        providerId: provider.info.id,
        batchSize: slice.length,
        totalItems: req.texts.length,
        durationMs: Number(end - start) / 1_000_000,
        model: part.model,
      });
      all.push(...part.vectors);
    }
    // NOTE: model concatenation assumption – for placeholder provider model is constant.
    // TODO: If future providers can change model per slice (e.g., fallback tiers), consider
    // capturing per-slice model list.
    return { vectors: all, model: provider.info.id, dimensions: provider.info.dimensions, providerId: provider.info.id };
  }
}

export const embeddingProviderRegistry = new EmbeddingProviderRegistry();

// Optional dynamic registration of local random provider (enabled via env flag)
(async () => {
  try {
    if (process.env.PRIMUS_ENABLE_LOCAL_RANDOM === '1') {
      // Dynamic import to avoid cost if not used
      const mod = await import('./localRandomProvider.js');
      const prov = new mod.LocalRandomProjectionProvider();
      embeddingProviderRegistry.register(prov, false);
      
    }
    if (process.env.OPENAI_API_KEY) {
      try {
        const mod = await import('./openAIProvider.js');
        const openai = new mod.OpenAIEmbeddingProvider({ apiKey: process.env.OPENAI_API_KEY, model: process.env.OPENAI_EMBED_MODEL });
        embeddingProviderRegistry.register(openai, false);
        
      } catch (e: any) {
        console.warn('[AI][embeddings] OpenAI provider registration failed', e);
      }
    }
  } catch (e: any) {
    console.warn('[AI][embeddings] Failed to load localRandom provider', e);
  }
})();
