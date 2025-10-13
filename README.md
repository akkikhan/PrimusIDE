# Primus IDE - Professional Development Environment

A complete, professional-grade Integrated Development Environment built with modern web technologies.

## Workflow

1. Write or edit spec markdown in `specs/*.spec.md` (frontmatter + sections).
2. Generate plan: `npm run spec:plan` -> creates `plans/<id>.plan.json`.
3. Generate tasks: `npm run spec:tasks` -> creates/updates `tasks/*.task.json`.
4. Implement code guided by tasks (place implementations under `src/` or `implementations/`).
5. Update task JSON `status` fields (`pending` | `in-progress` | `done`).
6. Re-run generation after spec changes (existing task status preserved by ID).

## Spec Format

```yaml
---
id: hello-world
name: Hello World Feature
version: 0.1.0
status: draft
priority: medium
type: feature
created: 2025-09-10
updated: 2025-09-10
---
```

Sections (H1 headings):
`Summary`, `Problem`, `Goals`, `Non-Goals`, `Requirements`, `Constraints`, `Acceptance Criteria`, `Risks`, `Open Questions`.

List items under `Goals` and `Requirements` become candidate plan tasks.

## Scripts

- `npm run spec:plan` – parse specs -> plans.
- `npm run spec:tasks` – explode plans -> per-task files.
- `npm run spec:all` – run both steps.
- `npm run hello` – sample feature CLI.
- `npm test` – runs sample assertion test.

## Generated Artifacts

- `plans/<specId>.plan.json` structure:

```json
{
  "specId": "hello-world",
  "name": "Hello World Feature",
```

- `tasks/<taskId>.task.json` – one file per derived goal/requirement.

## Core Epic Spec

Then implement tasks incrementally. You can mark the earlier sample spec `hello-world` as deprecated once confident.

## Extending

Add new specs; run `npm run spec:all`.
Curate tasks (add description, assignee). Mark `status` as work progresses.

## Notes

- This demo uses native ES modules ("type": "module"). Node can import `.ts` directly only if a loader/transpiler is configured; here we kept the TS file minimal and imported directly, which may require a bundler or ts-node in more complex cases.
- For a larger project integrate these scripts with your Electron/React codebase and wire menu or command palette actions to spawn them.

## Next Steps

- Add status preservation improvements (hashing requirement text).
- Add `spec:watch` for auto-regeneration.
- Integrate into main Primus IDE environment.

## Task Automation Enhancements

The `ALL_TASKS.md` master list is now parsed into an enriched schema via `npm run generate:tasks` (script: `scripts/automation/generateTasksJson.cjs`). Additional automation:

- `npm run enrich:tasks` – adds user stories & acceptance criteria for SPEC/IMPL/TODO tasks.

### Enriched Fields
### Guard Workflow Example (CI)
```
node scripts/automation/generateTasksJson.cjs --snapshot
node scripts/automation/guardTasks.cjs --strict --json > task-guard-report.json
node scripts/automation/scoreTasks.cjs
```
Failing conditions: duplicate IDs, deletions without `--allow-delete`, content changes under `--strict`.

## AI Foundation (Phase 1) & Multi‑Provider Layer

The initial AI substrate establishes typed contracts, logging, provider & tool registries, and a planning operation.

### Current Capabilities

### AI Feature Matrix (Current Slice)

| Area | Feature | Status | Notes |
|------|---------|--------|-------|
| Request Surface | Quick AI Prompt Bar | ✅ | Lightweight bottom bar for rapid chat requests (operation `chat`). |
| Context Injection | Selection Module | ✅ | Current editor selection (capped & truncated) with token estimate. |
| Context Injection | Diagnostics Module | ✅ | Summarized Monaco markers (counts + top messages). |
| Context Injection | Current File Module | ✅ | Active file content (size capped ~32KB) when budget allows. |
| Context Injection | Related Tests Module | ✅ (stub) | Heuristic discovery of sibling test/spec files (filenames only). |
| Context Injection | Retrieval Module | ✅ (scaffold) | Optional vector hits (limited results; dynamic require fallback). |
| Budgeting | Deterministic Module Ordering | ✅ | selection → diagnostics → current-file → related-tests → retrieval. |
| Budgeting | Heuristic Token Estimation | ✅ | chars / 4 approximation; truncated text flagged. |
| Observability | Per-Module Timing Metrics | ✅ | `moduleTimings[]` & `totalMs` in context response. |
| Observability | Provider Usage Stats | ✅ | Aggregated call counts, latency, token & cost est. |
| Tools | Tool Registry Panel | ✅ | Lists & invokes registered tools with minimal arg form. |
| Settings | Central Settings Schema | ✅ | Versioned JSON; migration from legacy keys. |
| Theming | Unified CSS + Monaco Theme | ✅ | Token-based dark/light palettes; Monaco `primus-theme`. |
| Packaging | Electron Builder Baseline | ✅ | NSIS + zip outputs in `release/`. |
| Future | Streaming Inline Diffs | ⏳ | Planned inline apply / diff view for code transforms. |
| Future | Auto-Update | ⏳ | Requires hosting `latest.yml` + enabling `autoUpdater`. |
| Future | Advanced Retrieval Indexing | ⏳ | Background indexing + adaptive context ranking. |

### Context Modules – Detailed Guide

Context gathering request path aggregates modules until a heuristic token budget is reached.

Ordering (hard-coded priority):

1. Selection
2. Diagnostics
3. Current File
4. Related Tests
5. Retrieval

Each module contributes an object: `{ id, tokensApprox, truncated?, meta? }` plus `content` when applicable.

Budgeting & Truncation:

- Token estimate = `Math.ceil(charCount / 4)`; used only for ordering & drop decisions.
- If remaining budget < module estimate, module may be truncated (file/selection) or skipped (non-text modules if large in future).
- Current file hard cap (~32KB chars). Selection cap (~16KB). Retrieval hits globally truncated to a cumulative cap (~1200 chars) so retrieval never starves core context.

Meta Examples:

- Diagnostics: `{ counts: { error, warning, info }, top: [{ message, severity, line }] }`
- Related Tests: `{ candidates: ["foo.test.ts", "foo.spec.tsx"] }`
- Retrieval: `{ hits: [{ path, score }...] }`

Performance Instrumentation:

- Each module timing recorded: `{ id, ms }`; aggregate `totalMs` returned.
- Renderer logs grouped console output for quick profiling.

Extending with a New Module:

1. Add shared type (e.g., `ContextModuleResult` extension) in `src/shared/aiContext.ts`.
2. Implement handler branch in main `AI_CONTEXT_GATHER` IPC code (keep synchronous, short; offload heavy work later or async batch outside request path).
3. Assign a sensible priority (insert into ordering array) and a conservative size cap.
4. Update UI badges renderer (Quick AI Prompt Bar) if new badge info is desired.

### Settings & Theming

Central settings live under a versioned root schema (see `src/shared/settingsSchema.ts`). Helper functions:

- `loadSettings()` – safe load + migration.
- `updateQuickAI()`, `updateLayout()`, `updateTheme()` – narrow, type-safe mutations.

Persistence Strategy:

- Stored JSON (location depends on Electron userData path). Migration maps legacy scattered keys to structured schema.
- Add new settings by incrementing schema version & providing migration logic.

Theming:

- Token map applied to `:root` (`--color-bg`, `--color-border`, etc.).
- Monaco theme (`primus-theme`) generated dynamically to mirror app tokens.
- Avoid hardcoded colors in components; prefer tokens or theme context helpers.

### Performance Metrics & Provider Stats

Context Gather Response Fields:

- `totalMs` – wall time for full gather.
- `moduleTimings[]` – per-module timings.
- For each module: token approximation + truncated flag (if text shortened).

Provider Stats (via `ai:stats:get` IPC):

- Latency aggregation (avg & total).
- Token & cost estimates (heuristic, non-billed).
- Cancellation & error counters aid tuning provider fallbacks.

Use Cases:

- Detect slow module (e.g., retrieval > 150ms) → consider caching.
- Spot provider imbalance (one provider dominating cost) → add throttling.

### Extending Providers & Tools (Developer Quickstart)

Adding a Provider:

1. Define a new provider object implementing the shared contract (id, name, `invoke()` or stream variant).
2. Register it in provider registry initialization (main process) *before* app ready event resolves.
3. (Optional) Implement streaming: emit chunk IPC events; ensure cancellation via AbortController.

Adding a Tool:

1. Implement a pure function (fast, side-effect-light) with serializable result.
2. Register in tool registry; assign unique id & description.
3. UI auto-renders new tool in the Tool Registry Panel.

Guidelines:

- Keep module/IPC names centralized (avoid magic strings in renderer components).
- Never import Node core modules from renderer; always use preload‑exposed APIs.
- Keep heavy computation out of the render path (defer/lazy load).

### Roadmap Snapshot (Next AI Iterations)

- Streaming UI integration into Quick Prompt Bar.
- Inline code actions (apply diff / test generation) leveraging selection module.
- Background retrieval indexing + semantic ranking.
- Adaptive context pruning based on real token counts (provider response headers if available).
- Persistent provider stats & visualization dashboards.

---

### Retrieval Reindex Progress Panel

The retrieval subsystem maintains an embedding vector index over workspace files. A managed full reindex can be triggered (automatically on embedding provider dimension changes) or manually via the new Reindex Progress Panel.

Panel Features:

- Live phase + counts: processed files, total files, accumulated vectors.
- Progress bar + vectors/sec rate estimate (lightweight calculation from incremental deltas).
- Elapsed time and cancellation control.
- Persisted last-run summary (loaded on panel mount) including cancellation flag, totals, timing.

Access / Toggle:

- Dispatch a custom event: `window.dispatchEvent(new Event('retrieval.reindex.toggle'))` (temporary wiring until a menu/command is added).
- On open you can Start a reindex if none active, or Cancel the in-flight run.

Underlying IPC Channels (`src/shared/ipcChannels.ts`):

- `retrieval:reindex:start` – begins run, returns `{ runId }`.
- `retrieval:reindex:progress` – events: `{ runId, processed, totalFiles, vectors, phase }`.
- `retrieval:reindex:cancel` – request cancellation.
- `retrieval:reindex:complete` – completion event with `{ summary }`.
- `retrieval:reindex:summary:get` – fetch last persisted summary.

Preload Bridge (`window.primus.retrieval`):

```ts
startReindex(): Promise<{ runId } | { error }>
cancelReindex(): Promise<{ cancelled: boolean }>
getReindexSummary(): Promise<Summary | null>
onReindexProgress(cb)
onReindexComplete(cb)
```

Embeddings Providers & Environment Flags:

- `OPENAI_API_KEY` – when set, registers real OpenAI embeddings provider (with retry/backoff) (dimension typically 1536 unless overridden by `OPENAI_EMBED_MODEL`).
- `PRIMUS_ENABLE_LOCAL_RANDOM=1` – enables deterministic localRandom provider (256-dim) useful for local/offline development & tests.
- Dimension Guard: switching to a provider with different embedding dimension clears the vector store automatically to avoid inconsistent metrics.

Future Enhancements (not yet implemented):

- Incremental (diff-based) reindex avoiding re-embedding unchanged chunks.
- Progress panel integration with command palette + status bar indicator.
- Adaptive batch sizing based on observed provider latency / rate limits.

---


## Troubleshooting

### AI Policy & Quick AI Prompt Issues

Symptoms:

- Console shows `[AI][policy] load failed, using defaults` on startup.
- Quick AI Prompt bar throws an error like `Cannot read properties of undefined (reading 'request')`.
- Policy enforcement limits (blocked operations / prompt length caps) appear not to apply.

Causes & Resolutions:

1. Missing `ai.policy.json` in production build

- Ensure the file exists at project root (source of truth) and is copied to `dist/` (`scripts/copy-ai-policy.cjs` runs in the build pipeline`).
- Packaging (`electron-builder.yml`) includes `ai.policy.json` so it is bundled; verify by inspecting the packaged app or running `npm run build` and checking `dist/ai.policy.json`.

1. Path resolution mismatch after compilation

- Compiled main process resides at `dist/main/main/main.js`. The loader now searches multiple candidate paths including `process.cwd()` and relative traversals back to the `dist` and project roots.
- If customizing build output paths, update `loadAIPolicy()` candidate list accordingly.

1. Renderer attempting AI request before preload bridge ready

- The Quick AI Prompt Bar now feature-detects `window.primus?.ai?.request`. If unavailable, the input is disabled with an informational message instead of throwing.

1. ESM vs CommonJS in scripts

- The copy script is `.cjs` (CommonJS). Avoid ESM `import` syntax there. Use `require()` only.


Verification Steps:

1. Run `npm run build` and confirm terminal log `[copy-ai-policy] copied ai.policy.json -> dist/`.
2. Start the app (`npm start`) and look for `[AI][policy] loaded from <path>`.
3. Open Quick AI Prompt Bar; it should allow input (no disabled state) and mock responses should return meta including provider & policy enforcement fields.

If still failing, temporarily add additional diagnostics (already present) or log `process.cwd()` and `__dirname` early in `main.ts` to confirm runtime paths.

### Provider Selection

UI: A dropdown in `AssistantPanel` lists available providers (fetched via `ai:providers:list`). Selecting one sets `providerHint` on subsequent requests.

Programmatic example:

```ts
const providers = await window.primus.ai.listProviders();
await window.primus.ai.request({
  id: 'example_1',
  operation: 'chat',
  prompt: 'Summarize current task context',
  includeContext: true,
  providerHint: providers[0]?.id
});
```

### Adding a Provider

1. Implement `AIProvider` (id, name, supports, invoke()).
2. Register inside `providerRegistry.ts` constructor.
3. (Future) For remote providers add streaming or cancellation tokens.

### Adding a Tool

1. Create a `ToolInvocation` in `toolRegistry.ts`.
2. Keep synchronous CPU work minimal; offload heavy analysis later.
3. Returned JSON is serialized into planning prompt when `operation === 'planning'`.

### Policy File (`ai.policy.json`)

```json
{
  "version": 1,
  "maxPromptChars": 8000,
  "blockedOperations": []
}
```

Adjust and restart to apply (hot reload pending).

### Roadmap (See `FUTURE_AI.md`)

1. Real provider adapters (OpenAI / local runtime)
2. Embeddings + retrieval augmentation
3. Guardrail + verifier readiness gating
4. Streaming + partial deltas
5. Multi-step reasoning loop + autonomous task execution
6. Context graph indexing and adaptive planning

### Streaming, Cancellation, Guardrails & Provider Stats (Phase 1 Enhancements)

Recent incremental upgrades delivered:

- Streaming responses with token-by-token deltas (`ai:stream:request` / `ai:stream:chunk` / `ai:stream:complete`).
- Cancellation support via `ai:stream:cancel` (AbortController propagated to provider; OpenAI adapter honors it).
- Lightweight token + cost estimation heuristics (chars/4 → tokens; simple USD /1K mapping) attached to both single and streaming responses as `meta.tokensEst` & `meta.costEst`.
- Mid-stream guardrail secret scanning: newly received deltas are scanned incrementally; warnings surface as sentinel chunks `__warn:secrets_detected:<types>`; aggregate results provided in stream completion `meta.guardrails.secrets` (count + distinct types).
- Provider usage metrics dashboard: in-memory accumulation per provider (non-persistent) exposed through new IPC channel `ai:stats:get` and rendered in the Assistant Panel.

### Inline Editor AI (Initial Slice)

An experimental inline AI action bar now appears when you select non-empty code in the Monaco editor:

- A small floating bar ("Explain") lets you request an explanation of the selected code.
- The request adds `editorSelection` metadata to `AIRequest` (file path, language, start/end line+column, truncated flag, selected code – trimmed to 400 lines / 20K chars).
- Prompt template focuses on: purpose, data flow, side‑effects, improvement suggestions.
- Results are currently logged to the console (next iterations will surface inline or in a contextual diff panel).

Extension Path (future work – not yet implemented): Refactor / Generate Tests / Apply Diff / Multi‑segment selection batching.

Provider metrics fields:

| Field | Meaning |
|-------|---------|
| providerId | Provider identifier |
| calls | Non-stream (invoke) calls count |
| streamingCalls | Streaming sessions initiated |
| errors | Count of failed invocations / streams |
| cancellations | User-triggered stream cancellations caught at completion |
| totalLatencyMs | Accumulated latency across all calls |
| avgLatencyMs | Derived average latency (total / (calls + streamingCalls)) |
| totalTokensEst | Sum of heuristic token estimates |
| totalCostEst | Sum of heuristic cost estimates |

UI: Open the Assistant Panel to see a compact table (Refresh button triggers `ai:stats:get`). Stats reset each app restart (no persistence yet). Future work may include rolling windows and persisted historical trend logs.

Guardrail Sentinels:

| Prefix | Semantics |
|--------|-----------|
| `__warn:secrets_detected:` | Secret patterns detected mid-stream; suffix lists types |
| `__error:` | Provider/system error message |
| `__info:cancelled` | Stream cancellation acknowledgement |

Client components ignore these for final assistant content assembly (only accumulating raw deltas that are not sentinel-coded). Downstream UI enhancements can map sentinel codes to banner toasts.


Artifacts produced:

- `tasks_all.json` (enriched schema)
- `task-snapshots/` (new snapshot if not suppressed)
- `trace_map.json` (code references `// TASK:<id>`)
- `pipeline_report.json` (summary JSON)
- `gherkin-features/` (feature files if exporter present)

`pipeline_report.json` fields:

- `snapshotCreated`: whether a snapshot was written
- `postProcess.adjusted`: tasks auto-advanced to in-progress due to code refs
- `guard.status`: PASS/FAIL from guard script
- `guard.changed`: tasks whose contentHash changed under strict mode
- `tasksCount`: final total tasks parsed

Advanced flags:

```powershell
node scripts/automation/tasksPipeline.cjs --no-snapshot --allow-delete --no-strict
```

Planned Enhancements:

- Semantic vectors for search (Task 747)
- Dependency inference (Task 728)
- Coverage correlation (Task 740)
- Dashboard HTML generation (Task 736)

## Coverage & Analysis Additions

New scripts extend enrichment and visibility over task readiness:

- `node scripts/automation/enrichTasks.cjs --all-status` – enriches every task status (including DERIVED/FUTURE/BACKLOG/IDEA/RESEARCH) with lightweight placeholder user stories & acceptance criteria (flag). Without the flag only SPEC/IMPL/TODO are enriched with full templates.
- `node scripts/automation/auditTaskCoverage.cjs` – audits coverage for SPEC/IMPL/TODO by default.
  - `--include-all` to include extended statuses.
  - `--fail-on-gaps` exits non‑zero if any targeted task lacks story or criteria.
  - Outputs: `artifacts/tasks_coverage_report.json` & `artifacts/tasks_coverage_report.md`.
- `node scripts/automation/tasksMatrix.cjs` – generates `tasks_matrix.md` summarizing every task (ID | Status | Lifecycle | Placeholder | Story | Criteria Count | Title) for rapid scanning.

Example full enrichment + audit flow:

```powershell
npm run tasks:pipeline
node scripts/automation/enrichTasks.cjs --all-status
node scripts/automation/auditTaskCoverage.cjs --include-all --fail-on-gaps
node scripts/automation/tasksMatrix.cjs
```

After running the above, all 750 tasks are enriched (placeholders for non-SPEC statuses) and coverage report shows zero gaps (placeholders carry `placeholderAdded: true`). Replace placeholders incrementally as scope clarifies.

Follow‑ups (future):

- Distinguish placeholder vs finalized acceptance criteria in scoring heuristics.
- Add a coverage badge synthesized from audit results.
- Integrate matrix & coverage summaries into planned dashboard (Task 736).


## One-by-One Task Execution Workflow

To process the large task set systematically, helper scripts provide deterministic next-task selection and lifecycle transitions.

Artifacts:

- `artifacts/current_task.json` – machine snapshot of the selected task.
- `artifacts/current_task.md` – human-readable brief (story, criteria, next steps).

Selection Heuristic (`nextTask.cjs`):

1. Eligible if `lifecycleStatus` absent or `planned`.
2. Placeholder tasks (`placeholderAdded: true`) prioritized (unless `--skip-placeholders`).
3. Sort by `impactScore` desc, then `priorityScore` desc, then `id` asc.

Commands:

```powershell
npm run task:next               # select & emit next task
npm run task:start -- <id>      # lifecycle -> in-progress
npm run task:complete -- <id>   # lifecycle -> done
npm run task:reset -- <id>      # lifecycle -> planned
```

Example Flow:

```powershell
npm run task:next
npm run task:start -- 669
# implement changes referencing \// TASK:669 in code
npm run tasks:pipeline
npm run task:complete -- 669
```

Optional Selection Flags:

```powershell
node scripts/automation/nextTask.cjs --skip-placeholders --category=Security --limit-impact=5
```

Lifecycle Path:
`planned` -> `in-progress` -> `done` (use `reset` to return to `planned`).

Planned Enhancements:

- Add `verifying` state between in-progress and done.
- Per-task journal under `artifacts/task_journal/`.
- CI guard: enforce max one `in-progress` task.

This enables disciplined sequential advancement without manually scanning the full list each time.

## Batch / Queue Processing Workflow

When scaling beyond single-task iteration, you can generate a prioritized full queue and extract fixed-size batches for parallel (or rapid sequential) work.

Queue Generation (`generateTaskQueue.cjs`):

```powershell
npm run tasks:queue
```

Outputs:

- `artifacts/tasks_queue.json`
- `artifacts/tasks_queue.md`

Ordering Rules (same as single selection):

1. Placeholder tasks first (unless skipped by future flag).
2. `impactScore` descending.
3. `priorityScore` descending.
4. `id` ascending.

Batch Selection (`nextBatch.cjs`):

```powershell
# Basic usage
npm run tasks:batch                               # default batch size 5
npm run tasks:batch -- --size=8                   # custom size
npm run tasks:batch -- --size=10 --skip-placeholders

# Filtering (parity with nextTask.cjs)
npm run tasks:batch -- --category=Security
npm run tasks:batch -- --limit-impact=5
npm run tasks:batch -- --category=Editor --limit-impact=4.5

# Placeholder stub injection (creates // TASK:<id> lines)
npm run tasks:batch -- --inject-placeholders

# Auto-start selected batch with concurrency guard
npm run tasks:batch -- --start --max-in-progress=6
```

Artifacts produced:

- `artifacts/batch_current_tasks.json`
- `artifacts/batch_current_tasks.md`
- (Optional) `artifacts/batch_placeholders/placeholders_<timestamp>.ts` when `--inject-placeholders` is used.

Auto-Start Behavior (`--start` & `--max-in-progress`):

- Without `--max-in-progress`, all planned tasks in the batch transition to `lifecycleStatus: in-progress`.
- With `--max-in-progress=<n>`, only up to the remaining capacity to reach `n` total in-progress tasks are started; others remain planned.
- Each started task gets a `statusHistory` entry `{ status: 'in-progress', reason: 'batch-start' }` and `updatedByScript: 'nextBatch'`.

Placeholder Injection (`--inject-placeholders`):

- Generates a single `.ts` file with comment stubs: `// TASK:<id> placeholder reference for: <title>`.
- Intended to seed trace maps early (the pipeline can later correlate these references).

Use Case:

1. Generate queue once per planning window.
2. Run a filtered batch selection to focus a work session.
3. Optionally auto-start with capacity enforcement to avoid overload.
4. Implement each task (replace placeholder criteria/stories where applicable).
5. Run `npm run tasks:pipeline` to update code refs & lifecycle scoring.
6. Repeat with a new batch; completed / in-progress tasks are excluded automatically.

Current Implemented Flags (summary):

| Flag | Purpose |
|------|---------|
| `--size=<n>` | Limit batch size (default 5) |
| `--skip-placeholders` | Exclude placeholder tasks from consideration |
| `--category=<substring>` | Only include tasks whose category contains substring (case-insensitive) |
| `--limit-impact=<n>` | Only include tasks with `impactScore >= n` |
| `--inject-placeholders` | Emit stub file with `// TASK:<id>` references |
| `--start` | Transition selected planned tasks to `in-progress` |
| `--max-in-progress=<n>` | Cap total in-progress count when starting (requires `--start`) |
| `--dry-run` | Simulate selection / starting without persisting mutations |
| `--json-out=<file>` | Also write batch JSON to a custom file path |
| `--exclude=<id1,id2>` | Exclude specific task IDs from selection |
| `--only-empty` | Restrict pool to tasks lacking both story & criteria |
| `--empty-first` | Prioritize empty tasks before others (after placeholder rule) |
| `--explain` | Emit `artifacts/batch_explain.json` with per-task selection rationale |
| `--dump-candidates` | Emit `artifacts/batch_candidates.json` with ranked candidate list (id, composite, factors) |
| `--objective=<preset>` | Override weighting with preset: `value`, `velocity`, or `fill-gaps` |
| `--no-recent=<n>` | Exclude tasks present in the last n historical batches |
| `--diff-prev` | Emit `artifacts/batch_diff.json` comparing with the previous batch |
| `--enforce-policy` | Run policy checker immediately; abort (exit 2) if ratios exceed limits |
| `--min-volatility=<n>` | Require minimum change vs previous batch (exit 3 if below) |
| `--max-volatility=<n>` | Cap change vs previous batch (exit 3 if above) |
| `--adaptive-objective` | Autopilot: dynamically selects objective preset each iteration |
| `--policy-enforce` | Autopilot: append `--enforce-policy` to batch generation |
| `--stateful-adaptive` | Autopilot: momentum + exploration objective tuning using persisted state |
| `--explore-interval=<n>` | Autopilot: every n iterations force an exploration objective (default 5) |
| `--adaptive-volatility` | Autopilot: dynamically tightens/widens volatility band for gating |
| `--full-auto` | Convenience: implies `--auto --adaptive-objective --policy-enforce --stateful-adaptive --adaptive-volatility` |

Volatility & Trend:

- `volatility` = 1 - (|intersection| / |union|) of consecutive batch ID sets.
- `batch_trend.json` (last 50) records `{generatedAt,size,volatility,overlapRatio,objective}` plus averages.
- Exit codes: 2 (policy violation), 3 (volatility gating failure).

Adaptive Objective Heuristic:

1. If last volatility > 0.75 → objective `value`.
2. Else if empty ratio < 0.20 → `velocity`.
3. Else → `fill-gaps`.

(No history → `value`).

Example:

```powershell
node scripts/automation/autopilot.cjs --auto --dry-run --adaptive-objective --policy-enforce --size=4 --dry-run-limit=5
```

### Stateful Adaptive & Exploration Layer

An additional layer refines objective selection when `--stateful-adaptive` is used:

Momentum Rules:
 
1. Consecutive high volatility (>=2 with `volatility > 0.75`) forces `value` to stabilize.
2. Sustained low volatility (>=3 with `volatility < 0.35`) and sufficient empties (`emptyRatio > 0.25`) shifts to `fill-gaps`.

Exploration:
 
- Every N iterations (`--explore-interval`, default 5) one objective is randomly chosen among `value|velocity|fill-gaps` excluding the last two distinct objectives to avoid stagnation.

### Adaptive Volatility Band (`--adaptive-volatility`)

Maintains a dynamic gating window `[minVol, maxVol]`.

List adjustments:

- Starts broad (0.10 – 0.95) or previous band.
- Tightens (shrinks span 15%) after two stable iterations (volatility comfortably inside band).
- Widens if actual volatility breaches boundaries.
- Guarantees a minimum width (0.15) to avoid over-constraining.

State persisted in `artifacts/autopilot_state.json` includes:
 
```json
{
  "time": "2025-09-12T12:34:56.000Z",
  "objective": "velocity",
  "lastObjective": "fill-gaps",
  "lastVol": 0.42,
  "volatilityAvg": 0.51,
  "emptyRatio": 0.18,
  "placeholderRatio": 0.10,
  "recentObjectives": ["value","fill-gaps","velocity"],
  "consecutiveHighVol": 0,
  "consecutiveLowVol": 2,
  "explorationCount": 1,
  "iteration": 7,
  "exploredThisIteration": false,
  "volatilityBand": { "min": 0.12, "max": 0.88, "stabilityStreak": 1 }
}
```

`--full-auto` shortcut example (dry-run safety limit applies unless overridden):
 
```powershell
node scripts/automation/autopilot.cjs --full-auto --size=5 --dry-run
```

## Quick AI Prompt Bar (Discovery Layer)

To reduce friction and immediately expose AI capability, a lightweight prompt bar now appears docked at the bottom of the window by default.

Features:

- Single-line prompt input with Enter to submit (Shift+Enter not required; multi-line intentionally deferred to keep the surface minimal).
- Uses existing `window.primus.ai.request` path (operation `chat`).
- Displays raw response text (streaming upgrade pending) in a transient popover above the bar.
- Command Palette toggle: `AI: Toggle Quick AI Prompt Bar` (command id: `ai.quickPromptBar`).
- Visibility persisted only in-memory for now (close/open session resets to visible; future work: user setting + ephemeral history).

Why: Rapid “ask then refine” flow for contextual assistance without committing to full panel real estate.

## Diagnostics Panel

Purpose: Provide immediate runtime introspection (memory RSS, Monaco model count, timestamp) to guide performance trimming.

Usage:

- Toggle via Command Palette: `View: Toggle Diagnostics Panel` (id: `view.diagnostics`).
- Panel polls every 3s while visible (interval cleared on hide) using `window.primus.diagnostics.snapshot()` exposed from preload.
- Current metrics: `memory.rssMB`, `monaco.models`, `timestamp` (ISO). Extend by augmenting preload snapshot implementation.
- Styling is lightweight (glass effect) and intentionally non-modal; close via the `×` button.

Extending Metrics:

1. Add new metric object `{ id, label, value }` in preload `diagnostics.snapshot()`.
2. (Optional) Introduce derived metrics (e.g., heap usage, watcher counts, AI pending requests).

## Packaging (electron-builder)

We added baseline `electron-builder.yml` + scripts:

Scripts:

```powershell
npm run dist          # Full build & default target (NSIS exe)
npm run dist:dir      # Unpacked directory (portable inspection)
npm run dist:win      # Windows specific build
```

Key Config Highlights (`electron-builder.yml`):

- `asar: true` for faster startup & integrity bundling (adjust if dynamic patching needed).
- NSIS one-click installer (auto-updates not yet configured – future optional).
- Output directory: `release/`.

Pre-Req: Ensure `electron` is in `devDependencies` (moved from `dependencies` per builder validation).

Next Packaging Improvements (future work list):

- App icon assets (ICO / ICNS) & file associations.
- Auto-update channel (publish provider S3/GitHub).
- Notarization (macOS) + code signing (Windows) pipeline docs.
- Differential update metrics capture.

## Upcoming Performance Trim Targets

Planned (tracked separately) to mitigate bundle size warnings:

- Dynamic import for heavy indexing modules (e.g., `ProjectIndexer`).
- Split AI advanced interface behind lazy boundary.
- Reduce Monaco workers loaded up-front (configure languages on-demand).
- Optional preload metric for initial paint timing.

## Changelog (Recent Additions)

| Date | Change |
|------|--------|
| 2025-09-12 | Quick AI Prompt Bar + Diagnostics Panel + electron-builder packaging baseline |
| 2025-09-13 | Context modules (selection, diagnostics, current-file, related-tests, retrieval), performance instrumentation, settings schema, unified theming, packaging docs |

