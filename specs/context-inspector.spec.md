---
id: context-inspector
name: Context Inspector Panel
version: 0.1.0
status: draft
priority: medium
type: feature
created: 2025-09-13
updated: 2025-09-13
---

# Context Inspector Panel

## Summary

Add a panel displaying the exact prompt context components (selection, current file excerpt, retrieval snippets, system prompts, tool metadata) for transparency & debuggability, enabling users to validate what the AI model actually received.

## Goals

- Real-time view for last AI request (prompt + structured context parts).
- Toggle between raw prompt (collapsed tokens) and structured segmented list.
- Show token counts per segment with estimated total.
- Allow copying individual segments or full prompt.
- Redact sensitive tokens/keys automatically.
- Telemetry: context_view_opened, segment_copied.

## Non-Goals

- Prompt editing & re-submission (future advanced feature).
- Diffing between multiple past prompts (history limited to last N = 5 initially).

## User Story

"As a user, I want to see precisely which code and metadata were sent to the model so I can trust and refine AI outputs."

## Architecture

### Data Capture

Instrument provider invocation path to capture:

- timestamp
- providerId
- systemPrompt
- userPrompt / messages chain
- retrievalResults (snippet + file + lines)
- extraContext (e.g., selection, diagnostics summary)

Stored in ring buffer (size 5) in main memory; exposed via IPC.

### Renderer

New component `ContextInspectorPanel`:

- Left sidebar: list of last 5 requests (timestamp + truncated first 40 chars).
- Main view: accordion sections (System Prompt, User Prompt, Retrieval, Selection, Other Metadata).
- Token count badges per section.

### Token Estimation

Lightweight estimator (approx chars / 4) until real tokenizer integrated; display disclaimers.

### IPC / Preload

`window.primus.context.getRecent()` -> returns array of captured contexts.
`window.primus.context.get(id)` -> full detail.

### Security / Redaction

- Never include API keys (ensure these are never appended to prompt structures).
- If environment variable style patterns found (=/^[A-Z0-9_]{8,}$/) inside values, mask middle section.

### Telemetry

Events: type=context_inspector, action=open|copy_segment, segments=, totalTokensEst.

## Metrics Targets

- Open panel fetch latency < 150ms.
- Token estimation error median < ±15% vs future true tokenizer.

## Edge Cases

- Very large retrieval snippet set -> collapse after first 10, expand on demand.
- Missing selection or diagnostics -> section hidden.

## Risks & Mitigations

- Performance overhead capturing large prompts -> store references or truncated (cap each snippet length e.g., 2k chars).
- Privacy exposure of sensitive inline comments -> user awareness banner.

## Open Questions

- Should we allow exporting prompt session to file? (defer)

## Acceptance Criteria

- Panel accurately shows last request with segmented counts.
- Copy segment copies only that section text.
- Retrieval snippets show file + line range labels.
- Telemetry event recorded when panel opened.

## Implementation Tasks (High-Level)

1. Add capture hook in provider invocation.
2. Ring buffer store + shared types.
3. IPC exposure & preload bindings.
4. Panel UI components & accordions.
5. Token estimator utility.
6. Redaction pass.
7. Telemetry emission.
8. Basic tests: ring buffer overflow, redaction masking.
