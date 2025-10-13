---
id: quick-ai-iteration-a
name: Quick AI Prompt Bar Iteration A
version: 0.1.0
status: draft
priority: medium
type: feature
created: 2025-09-13
updated: 2025-09-13
---

# Quick AI Prompt Bar Iteration A

## Overview

Iteration A builds upon Milestone 3 of the Quick AI Prompt Bar adding actionability, smarter provider routing, richer streaming feedback, and groundwork for contextual augmentation.

## Goals

1. Increase post-answer action value (copy / insert / future diff preview).
2. Reduce manual provider friction via an "Auto" virtual provider option.
3. Improve user feedback during streaming (live token count).
4. Prepare for granular context selection (modal stub + instrumentation hooks).
5. Lay foundation for code patch workflows (Diff Preview stub trigger conditions).

## Out of Scope

- Actual semantic search implementation.
- True diff patching & hunk application (deferred to later spec).
- Cost estimation & pricing awareness (future iteration B or C).

## Requirements

- Add Copy button to copy full final answer (not partial mid-stream unless streaming finished or cancelled).
- Add Insert button to dispatch an IPC/event to active editor (placeholder event: `window.dispatchEvent(new CustomEvent('quickAI.insertAnswer',{detail:{text:answer}}))`).
- Add Auto provider option: when selected, runtime chooses provider by heuristic: if prompt length > 400 or contains triple backticks => prefer "gpt4"/advanced model if present; else fastest (first provider with id including 'fast' or shortest name). Persist selection like others.
- Live token counter: while streaming show approximate tokens (charLength/4) updated every chunk; replace final with stats panel after completion.
- Context granularity stub: Add a small "Context+" button that opens a modal listing checkboxes (Current File, Selection, Related Tests (disabled), Recent Diagnostics). Selected ones simply logged to console for now and contribute to an internal contextModules[] state (not yet sent). Modal ESC closes.
- Diff Preview stub button: If final answer contains a fenced code block and a file path pattern (e.g., `src/`), show disabled button with tooltip "Diff preview (coming soon)".
- Styling: New action buttons share qa-btn variant; modal uses existing panel token colors; backdrop semi-transparent.
- Accessibility: Modal gets role="dialog" aria-modal="true" and initial focus on first checkbox.
- All new persistent keys use existing naming style; only providerHint continues storing real provider id or 'auto'.

## Telemetry Hooks (future ready)

Add no-op functions `recordAutoProviderDecision(input, chosen)` and `recordAction(type)` to centralize future analytics (inline stub in component for now).

## Risks & Mitigations

- "Auto" selecting unsupported model: fallback to first provider in list.
- Token counter performance: only update state per chunk (already chunk-based) - acceptable.
- Modal focus trap skipped for now; low complexity environment; plan upgrade later.

## Acceptance Criteria

- All listed buttons render conditionally & behave per requirements.
- Build passes with no new TypeScript errors.
- Selecting Auto visibly updates provider selector to "Auto" and requests use chosen provider.
- Live token counter visible during streaming (e.g., Streaming… (123 chars · ~30 tok)).
- Context+ modal opens/ closes; selections retained while bar open.

## Follow-up / Next Iteration Seeds

- Implement semantic file selection & token budget display.
- Real diff generation & hunk acceptance UI.
- Pricing & cost projection.
- Session metrics panel.
