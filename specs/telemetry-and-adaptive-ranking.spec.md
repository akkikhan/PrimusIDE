---
id: telemetry-and-adaptive-ranking
name: Telemetry & Adaptive Ranking
version: 0.1.0
status: draft
priority: low
type: feature
created: 2025-09-13
updated: 2025-09-13
---

# Telemetry & Adaptive Ranking

## Summary

Establish unified telemetry emission + lightweight adaptive feedback loop that adjusts retrieval weighting hints based on user accept/reject behaviors and patch/test outcomes.

## Goals

- Central telemetry writer (append JSONL) with schema versioning.
- Buffered writes (flush interval + size threshold) for performance.
- Event normalization: completion, patch, test_gen, retrieval_rank, context_inspector.
- Adaptive layer computes simple moving averages influencing retrieval weights (bounded adjustments).
- Expose read-only metrics snapshot API for UI.

## Non-Goals

- Full RL/ML model training (heuristic only).
- Remote sync / cloud analytics upload.
- Personally identifiable data collection.

## User Story

"As a user, I want the system to gradually surface better context without manual tuning, using my accept/reject patterns safely and locally."

## Architecture

### Telemetry Writer

Module: `src/main/telemetry/telemetryWriter.ts`

- Queue events in memory.
- Flush when queue length >= N (e.g., 50) or T milliseconds (e.g., 5000ms).
- File path: userDataDir/`telemetry/events-YYYYMMDD.jsonl`.

### Event Shape (Base)

```json
{ "v":1, "ts": ISO8601, "type":"completion", "action":"accepted", ...extra }
```

### Adaptive Engine

Module: `adaptiveRetrievalTuner.ts`

- Consume events: completion_shown/accepted/rejected, patch_applied, test_gen applied.
- Maintain rolling window stats (last 500 events) acceptance ratio & snippet contribution (if retrieval result snippet used inside accepted patch/test — heuristic via file/line overlap).
- Adjust weight hints within ±20% band from defaults.

### Weight Application

Ranker reads hint multipliers each query: `effectiveWeight = baseWeight * hintMultiplier`.
Decay hint toward 1.0 if no reinforcing events for cooldown interval.

### Settings / Opt-Out

Add `ai.telemetry.enabled` (default true) and `ai.telemetry.adaptiveEnabled` (default true). If disabled, no events written; adaptive resets to neutral.

### IPC / UI Exposure

`window.primus.telemetry.snapshot()` -> { counters, acceptanceRate, adaptiveWeights }.
Potential panel integration later (not required MVP).

### Telemetry Privacy Safeguards

- Never log raw source code beyond short hashes / file paths.
- Strip large text fields (>512 chars) or hash them.

### Telemetry

Additional meta event: daily rollover event with file size & counts.

## Metrics Targets

- Flush latency impact negligible (<5ms added to event path p95).
- Adaptive adjustments converge (stabilize weight drift) after ~100 interactions.

## Edge Cases

- Disk full / write error -> disable telemetry gracefully & surface warning once.
- Rapid burst > queue capacity -> drop oldest (ring) with counter.

## Risks & Mitigations

- Weight oscillation -> apply smoothing (EMA) and clamp.
- Privacy concerns -> clear documentation & easy toggle off.

## Open Questions

- Should we implement per-file weight personalization? (likely overkill initial).

## Acceptance Criteria

- Telemetry files contain structured JSONL with base fields.
- Disabling setting stops new file writes immediately.
- Adaptive weights change within clamp bounds and influence ranker output order in tests.

## Implementation Tasks (High-Level)

1. Telemetry writer + buffering.
2. Base event emission integration points.
3. Adaptive tuner consuming event stream.
4. Weight hint application in ranker.
5. Settings additions & preload exposure.
6. Snapshot IPC method.
7. Tests: buffering, adaptive clamp, opt-out.
