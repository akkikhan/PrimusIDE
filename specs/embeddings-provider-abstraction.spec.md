---
id: embeddings-provider-abstraction
name: Embeddings Provider Abstraction
version: 0.1.0
status: draft
priority: high
type: feature
created: 2025-09-13
updated: 2025-09-13
---

# Embeddings Provider Abstraction

## Summary

Introduce a pluggable embeddings provider layer enabling swap of the current placeholder hash-based vectors with real model-backed embeddings (local or remote) without altering retrieval pipeline contracts. Supports multiple providers (e.g., OpenAI, local WASM, future on-device) and batched indexing.

## Goals

- Define stable embedding request/response types in shared layer.
- Support batch embedding of file chunks with concurrency control.
- Pluggable provider registry: select active provider via settings.
- Cancellable embedding jobs (on file delete / workspace close).
- Persistence of model + dimension metadata for future migrations.
- Basic metrics: embedding_latency_ms, tokens_used (if returned), batch_size.

## Non-Goals

- Semantic reranking logic (handled in hybrid retrieval spec).
- Multi-modal embeddings (code only initial scope).
- On-the-fly fine-tuning / adapter loading.

## User Story

"As the system evolves, I want to plug in different embedding backends without rewriting indexing logic so I can iterate rapidly and compare quality/cost/performance."

## Architecture

### Shared Types

- `EmbeddingProviderInfo`: { id, name, dimensions, supportsBatch, maxBatchSize }
- `EmbedRequest`: { texts: string[], languageHints?: string[], providerId? }
- `EmbedResponse`: { vectors: number[][], model: string, dimensions: number, providerId }

### Main Process

- New module: `src/main/ai/embeddings/providerRegistry.ts`
  - `registerProvider(provider: EmbeddingProvider)`
  - `getActiveProvider()` (reads setting `ai.embeddingProvider`)
  - `embedBatch(req)` -> delegates to active provider.
- Job queue: simple FIFO with concurrency = configurable (default 2) -> prevents overloading remote endpoints.

### Providers (Initial)

1. `hashPlaceholder` (existing fallback) – deterministic hash -> pseudo vector.
2. `openai-ada` (example remote) – streaming/batched HTTP (stub until keys configured).
3. `local-wasm` (future) – WASM module for offline small model.

### Settings

Add setting key `ai.embeddingProvider` with default `hashPlaceholder`.
Add setting `ai.embeddingBatchSize` (default 16, clamp 1..64).

### Indexer Integration

Update `indexer.ts` to call `providerRegistry.embedBatch` for chunk arrays:

1. Gather N chunks pending embedding.
2. Batch by `embeddingBatchSize`.
3. Retry policy: exponential backoff (max 3 attempts) on transient errors.
4. Partial failure handling: only persist successful vectors; requeue failed.


### Caching Strategy

- Persist embedding vectors unchanged as today but store: { model, providerId, createdAt }.
- On provider change or dimension mismatch -> invalidate & reindex lazily (mark stale flag, background refresh).

### Data Flows

```text
FileChange -> chunkFileContent -> enqueue embedding jobs -> provider.embedBatch -> vectors -> vectorStore.replaceFileChunks -> retrieval queries
```

### Telemetry

Append events: type=embedding_batch, providerId, batchSize, durationMs, error?(boolean), retryCount.

### Metrics Targets

- Batch latency p95 < 1200ms for 16 short chunks (remote baseline).
- Reindex full medium workspace (200 files, ~5k chunks) < 5 minutes remote, < 90s local.

## Edge Cases

- Provider switch mid-indexing → active jobs finish; new jobs use new provider; stale older vectors flagged.
- Large file producing > maxBatchSize chunks → split gracefully.
- Provider returns partial vectors (network hiccup) → only store completed subset.

## Risks & Mitigations

- Cost spikes from unnecessary reindex -> lazy invalidation, not eager full rebuild.
- Rate limiting -> global concurrency + backoff.
- Dimension drift -> enforce dimension check before merging into store.

## Open Questions

- Need per-language model selection? (defer)
- Should we persist raw text hash to avoid recomputing embeddings on unchanged chunk content? (likely yes future)

## Acceptance Criteria

- Changing `ai.embeddingProvider` triggers background lazy reindex (stale markers) and eventual refresh.
- Batch embedding executes with configured batch size and concurrency.
- Failed batches retry up to 3 times then log telemetry error event.
- Retrieval still functional during provider switch (serves mixed old/new until refresh complete).

## Implementation Tasks (High-Level)

1. Shared type additions.
2. Provider registry module in main.
3. Implement hashPlaceholder provider via adapter interface.
4. Integrate registry into `indexer.ts` batching.
5. Add settings + preload exposure if needed for switching.
6. Telemetry event emission for batches.
7. Stale marking + lazy reindex logic.
8. Minimal tests: provider switch invalidation & retry path.
