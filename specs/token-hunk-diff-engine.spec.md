---
id: token-hunk-diff-engine
name: Token/Hunk Diff Engine
version: 0.1.0
status: draft
priority: medium
type: feature
created: 2025-09-13
updated: 2025-09-13
---

# Token / Hunk Diff Engine

## Summary

Refine current line-based LCS diff to a token-aware hunk diff engine improving precision for small edits (identifier rename, parameter insertion) while providing structured hunks consumable by patch flow & inline review UI.

## Goals

- Tokenize code (language-agnostic fallback: regex word + punctuation groups) to reduce noisy line diffs.
- Produce minimal edit script (insert/delete/replace/copy) aggregated into semantic hunks.
- Collapse trivial whitespace-only changes (option to hide by default).
- Output both line + token spans to enable dual highlighting.
- Provide fast path: if file < 5k tokens aim p95 < 80ms.

## Non-Goals

- Full AST-level structural diff (future possible evolution).
- Move detection (treat moved blocks as delete+insert initially).
- Rename semantic pairing (purely textual phase).

## User Story

"As a developer reviewing AI suggestions, I want cleaner, minimal diffs so I can quickly understand actual code changes without noise."

## Architecture

### Pipeline

1. Normalize input (ensure LF, strip trailing spaces for comparison only).
2. Tokenize original & modified text arrays.
3. Run modified Myers O(ND) or optimized patience diff depending size heuristic.
4. Generate primitive operations sequence.
5. Merge adjacent operations into hunks based on proximity (e.g., gap <= 2 unchanged tokens) and line mapping.
6. Map token indexes back to original line ranges for display.

### Data Structures

`Token` { text, line, startCol, endCol }
`Op` { type: insert|delete|replace|equal, aStart, aEnd, bStart, bEnd }
`DiffHunk` { id, aStartLine, aEndLine, bStartLine, bEndLine, ops[] }

### API

Function: `buildTokenDiff(original: string, modified: string, opts?): TokenDiffResult`
Return: { hunks: DiffHunk[], stats: { tokensA, tokensB, ops, timeMs } }

### Integration Points

- Patch generation parser can optionally convert raw unified diff into token-level hunks for improved UI granularity.
- Inline preview (hover) can highlight token replacements precisely.

### Performance Strategy

- If token length > 20k fallback to line-based diff (guard).
- Use early-exit if identical prefix/suffix large blocks (trim before diff core).
- Optionally switch to patience diff if many small scattered changes (heuristic: unique token ratio > 0.6).

### Telemetry

Event: type=diff_engine, tokens=, ops=, algo=line|token|fallback, durationMs.

## Metrics Targets

- p95 duration < 80ms for files <= 5k tokens.
- Token diff reduces displayed changed lines by >25% vs line LCS on typical refactors.

## Edge Cases

- Extremely long single line (minify) -> treat as line diff fallback.
- Mixed line endings -> normalized for diff, restored for output.
- Unicode combining chars -> rely on JS iteration (document limitation).

## Risks & Mitigations

- Performance regressions on large files -> size guard & fallback.
- Excessive hunk fragmentation -> merge threshold tuning.

## Open Questions

- Should we highlight intraline changes within tokens (e.g., Levenshtein) for replacements? (maybe future)

## Acceptance Criteria

- API returns hunks with expected token/line mapping in tests.
- Large file triggers fallback path reliably.
- Telemetry rows contain timing + algorithm used.

## Implementation Tasks (High-Level)

1. Tokenizer utility (simple regex + line mapping).
2. Diff core (Myers) + optional patience variant.
3. Hunk aggregation & line mapping.
4. Fallback logic & guards.
5. Telemetry emission.
6. Tests: small rename, insertion, large file fallback, whitespace-only collapse.
