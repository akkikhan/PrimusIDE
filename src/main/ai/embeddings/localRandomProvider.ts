import type { EmbeddingProvider, EmbeddingProviderInfo, EmbedRequest, EmbedResponse } from '../../../shared/embeddingTypes.js';

// Lightweight local random projection provider.
// Generates a stable pseudo-random embedding per text using seeded PRNG (deterministic per input).
export class LocalRandomProjectionProvider implements EmbeddingProvider {
  info: EmbeddingProviderInfo = {
    id: 'localRandom',
    name: 'Local Random Projection',
    dimensions: 256,
    supportsBatch: true,
    maxBatchSize: 128,
  };

  async embed(req: EmbedRequest): Promise<EmbedResponse> {
    const { dimensions } = this.info;
    const vectors = req.texts.map(t => this.project(t, dimensions));
    return { vectors, model: 'local/random-proj/v1', dimensions, providerId: this.info.id };
  }

  private project(text: string, dim: number): number[] {
    // Simple seeded RNG (xorshift32) based on text hash
    let seed = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) {
      seed ^= text.charCodeAt(i);
      seed = (seed * 0x01000193) >>> 0; // FNV-like mixing
    }
    function next() {
      // xorshift32 variant
      seed ^= seed << 13; seed >>>= 0;
      seed ^= seed >> 17; seed >>>= 0;
      seed ^= seed << 5;  seed >>>= 0;
      return (seed & 0xffffffff) / 0xffffffff;
    }
    const vec = new Array(dim);
    for (let i = 0; i < dim; i++) vec[i] = (next() * 2) - 1; // [-1,1]
    // L2 normalize
    const norm = Math.sqrt(vec.reduce((s,v)=>s+v*v,0)) || 1;
    for (let i=0;i<dim;i++) vec[i] /= norm;
    return vec;
  }
}
