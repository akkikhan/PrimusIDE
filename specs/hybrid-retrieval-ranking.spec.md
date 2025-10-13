---
id: hybrid-retrieval-ranking
name: Hybrid Retrieval Ranking
version: 0.1.0
status: draft
priority: medium
type: feature
created: 2025-09-13
updated: 2025-09-13
---

# Hybrid Retrieval Ranking

## Summary

Enhance retrieval pipeline by combining lexical (BM25-like) and embedding similarity signals plus lightweight recency & file importance boosts to produce higher quality context slices for AI prompts.

## Goals

- Implement lexical scorer over chunk texts (in-memory inverted index minimal viable).
- Combine embedding cosine similarity + lexical score via weighted sum.
- Add boost factors: recency (mtime decay), file importance (e.g., open tabs weight), proximity to cursor (line distance for same file context window).
- Configurable weights via settings with safe defaults.
- Telemetry: retrieval_rank_invoked with component scores distribution.

## Non-Goals

- Learning-to-rank ML model (manual weights initial).
- Cross-file graph-based dependency weighting (future feature).
- Full BM25 correctness; approximation acceptable.

## User Story

"As a user, I want the most relevant code snippets included in prompts so AI answers reflect the right parts of my project without manual curation."

## Architecture

### Components

- `lexicalIndex`: term -> postings list (chunkId, tf) built during chunk indexing.
- `embeddingStore`: existing vectors.
- `ranker.ts`: function `rankChunks(query, opts)` returns scored list.

### Scoring Formula (Initial)

```text
score = w_embed * embedSim + w_lex * lexScore + w_recent * recentBoost + w_import * importanceBoost + w_local * localProximity
```

Recent boost: exponential decay on age (cap).
Importance boost: open tab chunk +X, active file +Y.
Local proximity: if chunk from same file within +/- K lines of cursor -> additive boost.

### Settings

`ai.retrieval.weights` object persisted (with validation) e.g. { embed:0.5, lex:0.25, recent:0.1, import:0.1, local:0.05 }.
Fallback defaults if invalid.

### Query Flow

1. Form query tokens (trim stopwords small list).
2. Get top M lexical matches.
3. Get top M embedding matches (existing pipeline).
4. Union chunk IDs -> compute all component scores.
5. Weighted sum -> sort -> take K (limit tokens aggregate budget).

### Telemetry

Event fields: weights, K, M, avgEmbedSim, avgLex, latencyMs.

## Metrics Targets

- Ranking latency added overhead < 25ms p95 (M <= 200, union size <= 400).
- Measured answer quality (manual eval small set) +15% improvement vs embedding-only baseline.

## Edge Cases

- Empty query tokens -> rely solely on embeddings.
- Very recent file new chunks without embeddings yet -> skip or assign neutral score (not negative).

## Risks & Mitigations

- Overweight recency causing noisy results -> cap boost factor.
- Memory growth from lexical index -> store only top tf terms length limit per chunk.

## Open Questions

- Expose per-result breakdown in UI? (maybe in context inspector advanced view).

## Acceptance Criteria

- Ranker returns stable ordering with weight changes reflected immediately.
- Setting update hot-reloads weights without restart.
- Telemetry event emitted with correct component aggregates.

## Implementation Tasks (High-Level)

1. Lexical index builder integrated into existing indexing flow.
2. Ranker module with scoring formula.
3. Settings schema extension + validation.
4. Retrieval path integration (swap previous embedding-only list).
5. Telemetry emission.
6. Basic tests: weight impact, empty query fallback.
