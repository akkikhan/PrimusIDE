---
id: risk-scoring-and-revert-ledger
name: Risk Scoring & Revert Ledger
version: 0.1.0
status: draft
priority: low
type: feature
created: 2025-09-13
updated: 2025-09-13
---

# Risk Scoring & Revert Ledger

## Summary

Introduce heuristic risk scoring for AI-applied patches plus a lightweight revert ledger enabling one-click reversion of recent AI changes to build trust and accountability.

## Goals

- Compute risk score (0–1) per patch session based on heuristics: lines changed, files touched, presence of critical keywords (config, build, auth), test coverage delta (if available), conflict count.
- Display score badge (low/medium/high) in patch panel before apply.
- Maintain ledger of last N (e.g., 20) AI-applied patch snapshots (pre-change content per file subset compressed).
- Provide quick revert UI listing ledger entries with timestamp & score.
- Telemetry: risk_score_recorded, revert_invoked.

## Non-Goals

- ML-based risk prediction (heuristic only first phase).
- Full VCS integration (Git handles broader history; this is fast local safety net).
- Automatic blocking of high-risk patches (inform only).

## User Story

"As a developer, I want to understand how risky an AI change is and quickly roll it back if it's problematic without manual file diffing."

## Architecture

### Risk Scoring Heuristics

Score components (each normalized 0–1 then weighted):

- sizeFactor (changedLines / cap)
- breadthFactor (filesTouched / cap)
- criticalFactor (keyword presence -> 1 if any else 0)
- conflictFactor (conflicts / changedLines)
- testDeltaFactor (negative if patch removes tests)

Final: weighted sum -> clamp 0–1. Map to label: <0.33 low, <0.66 medium else high.

### Ledger Storage

- Directory: userDataDir/`ledger/`
- Entry file name: `<timestamp>-<patchId>.json.gz`
- Content: { patchId, appliedAt, riskScore, files:[{path, preContentHash, preContent? (optional if large)}], summary:{ changedLines, files }}
- For large files > 200KB store only hash; skip raw content (flag partial).
- Maintain index file `ledger/index.json` with rolling window; prune oldest on exceed.

### Apply Hook

Patch apply path triggers risk computation -> ledger snapshot -> then file writes.

### Revert Flow

1. User opens Revert Panel (new command).
2. Select entry -> preview diff (current vs stored pre-content for included files).
3. Confirm -> restore originals (write preContent where available; skip hashed-only with warning).
4. Telemetry event revert_invoked with success/fail counts.

### IPC / Preload

`window.primus.ledger.list()` -> list index metadata.
`window.primus.ledger.get(patchId)` -> loads & decompresses entry.
`window.primus.ledger.revert(patchId)` -> executes revert.

### Telemetry

Events include riskScore, changedLines, filesTouched, label.

## Metrics Targets

- Risk score computation overhead < 10ms.
- Revert median time for 10 small files < 300ms.

## Edge Cases

- Large binary or skipped file -> revert marks partial.
- File deleted after patch -> revert recreates if content stored.
- Hash mismatch (file modified since patch) -> prompt user (skip or force) initial simple skip.

## Risks & Mitigations

- Storage bloat -> compression + size cap + pruning.
- False sense of security -> clear UI wording (heuristic only).

## Open Questions

- Should we integrate Git diff for improved accuracy when repo present? (future)

## Acceptance Criteria

- Risk badge visible with correct label before apply.
- Ledger persists up to N entries and prunes beyond.
- Revert restores original contents where stored.
- Telemetry records risk & revert actions.

## Implementation Tasks (High-Level)

1. Risk heuristic module.
2. Ledger writer (with gzip compression) + index maintenance.
3. Integration in patch apply path.
4. Revert panel UI & flows.
5. IPC methods & preload exposure.
6. Telemetry emission.
7. Tests: scoring logic, prune behavior, revert partial.
