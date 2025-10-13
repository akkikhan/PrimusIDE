---
id: inline-completions-mvp
name: Inline Completions MVP
version: 0.1.0
status: draft
priority: high
type: feature
created: 2025-09-13
updated: 2025-09-13
---

# Inline Completions MVP

## Summary

Introduce inline (ghost text) code completions triggered during typing with accept/reject keybindings, streaming support, and basic metrics instrumentation. Provides parity baseline with competitive AI editors while plugging into existing provider & context assembly.

## Goals

- Low-latency inline suggestions (<2.0s p95 from last keystroke to first token).
- Accept (`Tab`) / reject (`Esc`) / partial accept (future) foundation.
- Provider-agnostic completion request API with cancellation.
- Context assembly reuse (selection, current file snippet, retrieval top hits).
- Telemetry events: completion_shown, completion_accepted, completion_rejected, latency_ms, tokens.

## Non-Goals

- Multi-line multi-file edits (handled by patch flow spec).
- Ranking multiple candidates (first version single suggestion).
- Learning-based reranking.

## User Story

“As a developer typing code, I want relevant next-line or inline continuation suggestions so I can accelerate routine coding tasks without leaving the editor.”

## Triggers

- Debounced keystroke (e.g., 350ms idle) in supported file types.
- Manual command: `ai.inline.trigger`.

## Key Interactions

1. User types → debounce fires → request sent.
2. Streaming tokens populate ghost layer.
3. Accept with Tab merges text into buffer; rejects clear overlay.
4. New keystroke while streaming cancels request.

## Architecture

### Renderer

- `src/renderer/inline/InlineCompletionManager.ts` (new): listens to editor model changes, debounces, requests completion via preload API, maintains active session state.
- Decoration layer: Monaco inline ghost text decoration (after content or overlay).

### Preload → Main

- Add `window.primus.ai.complete(request)` bridging to IPC: channel `ai:complete`.
- Request shape: { filePath, language, prefix, suffix, cursorOffset, providerId? }.

### Main / Providers

- Extend provider interface: optional `complete(opts)`; fallback to chat model with system prompt for completion style.
- Cancellation token mapping to abort controller for HTTP calls.

## Data Flows

```text
EditorChange -> Manager (debounce) -> preload ai.complete -> main providerRegistry.complete -> stream -> preload -> manager -> apply ghost tokens
```

## Telemetry

Append JSONL rows: type=completion, action=shown|accepted|rejected, latencyMs, provider, charsSuggested, linesSuggested.

## Metrics Targets

- p95 latency < 2000ms
- Acceptance rate initial > 25%

## Edge Cases

- Empty line / whitespace only (skip trigger)
- Large file (>200KB) limit context to surrounding window (e.g., ±400 lines)
- Rapid typing cancels prior session
- Mixed indentation detection (preserve style)

## Risks & Mitigations

- Over-triggering → apply heuristic filters (min chars since last newline or identifier in progress).
- Provider token waste → early cancellation on new input.

## Open Questions

- Partial accept by word? (defer)
- Multi-candidate cycling? (future spec)

## Acceptance Criteria

- Ghost text appears for eligible contexts.
- Tab inserts entire suggestion; Esc clears.
- Cancellation works (no trailing tokens after new keystroke).
- Telemetry file contains events with expected fields.

## Implementation Tasks (High-Level)

1. Monaco decoration layer for ghost text.
2. InlineCompletionManager with debounce + cancellation.
3. Preload API + shared types addition.
4. Provider interface extension & default chat fallback prompt template.
5. Telemetry writing.
6. Commands: trigger, accept (bound to Tab when active), reject.
7. Basic tests (manager debounce + accept flow simulation).
