// Embedding provider abstraction shared types
// Derived from spec: embeddings-provider-abstraction

export interface EmbeddingProviderInfo {
  id: string;
  name: string;
  dimensions: number;
  supportsBatch: boolean;
  maxBatchSize: number;
}

export interface EmbedRequest {
  texts: string[];
  languageHints?: (string | undefined)[];
  providerId?: string; // optional override
}

export interface EmbedResponse {
  vectors: number[][]; // parallel to input texts
  model: string;
  dimensions: number;
  providerId: string;
}

export interface EmbeddingProvider {
  info: EmbeddingProviderInfo;
  embed(req: EmbedRequest, signal?: AbortSignal): Promise<EmbedResponse>;
}
