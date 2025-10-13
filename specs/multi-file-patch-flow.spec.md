---
id: multi-file-patch-flow
name: Multi-file Patch Flow
version: 0.1.0
status: draft
priority: high
type: feature
created: 2025-09-13
updated: 2025-09-13
---

# Multi-file Patch Flow

## Summary

Provide an AI-assisted workflow that aggregates model-proposed changes spanning multiple files into a single review/apply panel with granular hunk acceptance, conflict detection, and telemetry. Extends current single diff LCS approach to a structured patch session object.

## Goals

- Aggregate suggested edits across N files into one session.
- Represent patch as ordered file entries with hunks (line ranges + proposed text).
- Allow per-hunk accept/reject and per-file accept all.
- Detect conflicts vs current workspace (line drift / edits) before apply.
- Support generating patch via AI tool invocation with context retrieval.
- Telemetry: patch_session_started, hunk_applied, hunk_rejected, patch_applied, conflict_count.

## Non-Goals

- Three-way semantic merge (basic line conflict detection only initial).
- Inline code review comments (future extension).
- Automatic retry/regeneration of conflicting hunks.

## User Story

"As a developer, I want to review AI-proposed changes across multiple files in one consolidated panel so I can accept or discard each change efficiently and confidently."

## Architecture

### Data Model

`PatchSession` (id, createdAt, providerId, files[])

Each `PatchFile`:

- filePath
- originalHash
- hunks[]

`Hunk`:

- id
- startLine / endLine (original)
- newText (string)
- status: pending|accepted|rejected|conflict

### Generation Flow

```text
User Command -> toolRegistry.generatePatch(contextSpec) -> provider prompt -> model returns structured diff (unified or custom JSON) -> parser -> PatchSession stored -> open panel
```

### Conflict Detection

On panel open & before apply:

1. Read current file text.
2. Recompute hash & compare to originalHash; if mismatch, attempt line anchor shift (simple fuzzy search of original hunk lines).
3. If cannot locate uniquely -> mark hunk conflict.

### Apply Flow

- Collect accepted hunks per file.
- Sort hunks descending by startLine to avoid offset shift during application.
- Write modified content (single atomic FS write per file via preload API).
- Emit event `ai.patch.applied` with counts.

### Renderer Components

- `PatchPanel` (new) listing files with counts (accepted/pending/conflict).
- `HunkView` showing original vs proposed (mini diff) with accept/reject buttons.
- Sticky action bar: Accept All, Apply Selected, Discard Session.

### IPC / Preload

Expose `window.primus.patch.getSession(id)` and `window.primus.patch.apply(sessionId)`.
Persist sessions transiently in memory (no disk) until applied/discarded.

### Provider Prompt Template (Initial)

Instruction to produce machine-parseable JSON with fields: filePath, hunks[{startLine,endLine,newText}]. Include guard clause to not invent files.

### Telemetry

Events appended JSONL: type=patch, action=session_started|hunk_applied|hunk_rejected|applied|discarded, counts.

## Metrics Targets

- Time from command to panel open p95 < 6s (depends on model size).
- Apply operation latency per 50 hunks < 1.5s.

## Edge Cases

- Binary files (skip with warning).
- File deleted before apply -> skip hunks, mark session partial.
- Overlapping hunks (merge or reject later one; initial simple: order + warn).

## Risks & Mitigations

- Model hallucinated file paths -> validate existence before session creation.
- Large patch memory usage -> soft cap (e.g., 2k total changed lines) warn & truncate.

## Open Questions

- Need persistent session restore after restart? (defer)
- Support partial inline editing of newText prior to apply? (future)

## Acceptance Criteria

- Panel lists all files & hunks with status badges.
- Accept/reject toggles update counts instantly.
- Conflicting hunks clearly labeled and excluded from apply.
- Apply writes only accepted non-conflict hunks correctly.
- Telemetry rows present with expected actions.

## Implementation Tasks (High-Level)

1. Shared types for PatchSession / Hunk.
2. Provider patch generation tool + JSON parser.
3. Session store in main (Map by id) + IPC methods.
4. Conflict detection routine (hash + fuzzy locator).
5. Renderer PatchPanel & components.
6. Apply algorithm + FS writes.
7. Telemetry events.
8. Basic tests: conflict detection + hunk ordering.
