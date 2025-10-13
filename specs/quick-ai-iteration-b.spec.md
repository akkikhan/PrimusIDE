---
id: quick-ai-iteration-b
name: Quick AI Prompt Bar Iteration B
version: 0.1.0
status: draft
priority: medium
type: feature
created: 2025-09-13
updated: 2025-09-13
---

# Quick AI Prompt Bar Iteration B

## Overview

Iteration B deepens the Quick AI Prompt Bar by turning placeholder stubs (context modules, diff preview, telemetry) into functional capabilities and introducing patch-based workflow ergonomics and provider intelligence.

## Goals

1. Real contextual augmentation: gather and inject selected context modules (current file content, active selection text, recent diagnostics, related test file snippets) with token budget management.
2. Diff preview & patch application: generate unified diffs for code block suggestions, present hunk review UI, allow apply / reject per hunk.
3. Provider performance telemetry: capture latency, streaming start time, token throughput, error rates, and feed smart routing improvements.
4. Cost awareness (if pricing metadata available): surface estimated cost per request (tokens * model pricing) and cumulative session total.
5. Enhanced auto-routing v2: incorporate rolling averages (latency, error) and model capability tags to refine provider choice.
6. Action history & recall: persist last N interactions for quick re-run / edit.

## Out of Scope (Defer)

- Full semantic search across entire repo (plan for Iteration C).
- Multi-turn conversational memory beyond a single prompt-answer pair (future conversation panel feature).
- Fine-grained pricing negotiation or budget enforcement.

## Requirements

### Context Acquisition
- Implement preload + main IPC channel to fetch current file text, current selection, and recent diagnostics (structured: {file,path,range,message,severity}).
- Related tests heuristic: for a file `src/foo/Bar.ts`, search sibling or `__tests__` / `test` directories for matching filename patterns (`Bar.test.ts`, `Bar.spec.ts`). Limit snippet length (first 120 lines or 4KB, whichever smaller).
- Token budgeting: approximate tokens for each candidate module; cap total injected context at a configurable ceiling (default 2048 tokens). Drop lowest-priority modules if over budget (priority order: selection > current-file > diagnostics > related-tests). Return summary stats to renderer.
- Renderer: when `Ctx` enabled and modules selected, show a small context badge with included module counts & truncated token sum (e.g. `CTX: 3 mods · ~680 tok`). Tooltip enumerates modules.

### Diff Preview & Apply
- Parse model answer for fenced code blocks with optional path hints (`// File: path/to/file.ext` or markdown fence info lines like ```ts path=src/x.ts`).
- Generate an in-memory diff between existing file content and suggested code block content. Use a minimal diff lib (implement a lightweight line diff if external libs are undesirable) producing unified diff format.
- Present a modal: list each file with collapsible diff hunks, checkboxes per hunk (default all checked). Actions: Apply Selected, Copy Diff, Cancel.
- Applying selected hunks writes updated file(s) via preload FS API (add new API if not present) and triggers an editor refresh event.
- If filesystem write fails, show inline error per file section.

### Telemetry & Metrics
- Capture for each request: provider, mode (stream/one-shot), start ts, first byte ts (stream only), end ts, char length, approx tokens, error flag.
- Maintain rolling window (last 20) in memory; auto-provider v2 consults moving average latency & error rate to penalize slow/unreliable providers.
- Expose a lightweight provider diagnostics panel (toggleable) showing metrics table.

### Cost Awareness
- Shared pricing map (static JSON in `src/shared/aiPricing.ts`): { providerId: { inputPer1K: number, outputPer1K: number } }.
- Estimate cost: (promptTokens/1000 * inputPer1K) + (answerTokens/1000 * outputPer1K). Display in stats line when available (format: `~0.0023$`).
- Aggregate session total (reset on app reload for now) shown in provider diagnostics panel.

### Auto-Routing V2
- Extend heuristic: base score + dynamic penalty( (latencyMsAvg / targetLatency) + errorRate * weight ).
- Weight constants stored centrally; allow future tuning.
- Log routing decision with scored breakdown (debug flag controlled by localStorage `quickAI.debugAuto`).

### Action History
- Store last 10 prompts + selected modules + provider used + timestamp in localStorage `quickAI.history`.
- UI: dropdown / popover listing history entries; selecting repopulates prompt & modules (does not auto-send).

### Accessibility & UX
- All new modals have role="dialog", labelled header, focus first actionable element, ESC closes.
- Diff modal apply button disabled if no hunks selected.
- Provider diagnostics panel reachable by keyboard, table rows focusable.

## Data Structures (Draft)

```ts
interface ContextGatherRequest { modules: string[]; budgetTokens: number; selection?: { text: string; language?: string }; currentFilePath?: string; }
interface ContextModuleResult { id: string; tokensApprox: number; truncated: boolean; meta?: any; }
interface ContextGatherResponse { modules: ContextModuleResult[]; totalTokens: number; dropped: string[]; }

interface DiffHunk { filePath: string; header: string; lines: string[]; apply: boolean; }
interface DiffSession { id: string; files: { path: string; hunks: DiffHunk[] }[]; }

interface ProviderMetricSample { provider: string; start: number; firstByte?: number; end: number; tokensApprox: number; error?: boolean; }
```

## IPC / Preload Additions (Stubs)

- `ai.gatherContext(request: ContextGatherRequest): Promise<ContextGatherResponse>`
- `fs.applyPatch(patch: { filePath: string; newContent: string; }): Promise<{ ok: boolean; error?: string }>` (or batch variant)

## Telemetry Storage

In-memory ring buffer in renderer; optional persistence behind debug flag for future export.

## Risks & Mitigations

- Over-injection of context -> token overflow: enforce strict budget & dropping logic.
- Large diff blocks causing slowdown: limit code block capture to 800 lines / 40KB per block.
- Provider pricing drift: expose pricing map version & allow manual refresh (later).

## Acceptance Criteria (High-Level)

- Selecting modules with Ctx on actually injects textual context (visible via debug tooltip or diagnostics output).
- Diff Preview shows unified diff of changes & can apply hunks producing immediate file updates.
- Auto-routing v2 uses metrics (latency + error) plus capability heuristics.
- Stats line optionally shows cost estimate when pricing exists.
- History list repopulates prompt & modules.

## Follow-up Seeds (Iteration C or Later)

- Multi-turn conversation thread panel.
- Advanced semantic retrieval (vector + structure ranking).
- Inline patch application with Monaco decorations.
- Rate limiting & quota guardrails.
- Model capability discovery API handshake.
