# Future AI Roadmap

This document expands the phased evolution beyond the Phase 1 mock foundation.

## Phase 1.1 – Instrumentation & Logging
- NDJSON session logging (`artifacts/ai/session_<date>.ndjson`).
- Request size + latency + (future) token usage placeholders.
- Basic policy file `ai.policy.json` loaded at startup (limits + feature toggles).

## Phase 2 – Provider & Context Expansion
- Provider registry (`OpenAI`, `Claude`, `Ollama` adapters) behind uniform interface.
- Cost & latency telemetry surface (per provider metadata object).
- Embedding generation (local model first) for task titles + file snippets -> `artifacts/embeddings/index.json`.
- Retrieval layer scoring (BM25 + vector hybrid) to prune context slices.
- Tool registry initial actions: `contextBundle`, `symbolDiffSummary`, `verifierSummary`, `gitDiffCurrentFile`.

## Phase 2.5 – Reasoning Loop (Single Step Autonomy)
Workflow: plan → (tool calls) → propose diff (dry) → verify (readiness + risk) → emit patch artifact.
Artifacts:
- `artifacts/ai/plan_<ts>.json` (objectives, steps, tool usage)
- `artifacts/ai/patch_<ts>.diff` (unapplied diff)
- `artifacts/ai/verify_<ts>.json` (risk + readiness snapshot)

## Phase 3 – Multi-Step Agent
- Iterative improvement cycles (max N passes or until convergence score).
- Heuristics: code churn limit, max warnings, readiness delta target.
- Rollback snapshots (pre-apply FS snapshot of touched files to `.primus/rollback/`).
- Merge strategy: minimal patch segments (line-level) followed by semantic re-parse for conflicts.

## Phase 3.5 – Inline Intelligence
- Inline completion provider wired to Monaco (adapter reading provider registry).
- Hover explain & quick actions ("Refactor", "Add tests", "Document").
- Inline test generation (detect exported function w/out test -> propose test file stub).

## Phase 4 – Policy & Governance Hardening
- Policy dimensions: maxFilesTouched, maxTotalAddedLines, secretsScanRequired, requireTestsForExports, forbidBreakingAPIUnlessFlag.
- `--fail-on-warn` integration with verifier + AI gating.
- Signed artifact manifest (hash chain) for audit.

## Phase 4.5 – Knowledge & Memory
- Long-term memory store keyed by task ID (vector + summary) enabling cross-task recall.
- Change impact graph (symbol -> tasks referencing it) for proactive suggestion of follow-up refactors.

## Phase 5 – Ecosystem & Extensibility
- Marketplace AI extensions: provider plugins, tool plugins (manifest with capability flags).
- User tool scripting (sandboxed) with input/output schema introspection.
- Metrics dashboard (latency distribution, acceptance ratio, rollback frequency).

## Phase 6 – Collaborative & Multi-User
- Session share (stream AI reasoning logs to peers).
- Conflict-aware agent merges (multi-branch reasoning with diff reconciliation).

## Risk Mitigation Themes
| Risk | Mitigation |
|------|------------|
| Secret Leakage | Pre-send scan; redact; policy gate |
| Over-sized Context | Retrieval scoring + token cap + summarization tiers |
| Breaking API Changes | Symbol diff check pre-apply; require override flag |
| Hallucinated Paths | FS existence validation tool call |
| Infinite Loops | Max iterations + stagnation detection (no improvement) |

## Metrics (Planned)
- Readiness delta per agent cycle
- Avg files touched per patch
- Token cost per successful patch
- Rollback frequency / cause taxonomy
- Provider latency p50/p95

## Open Questions
- Where to persist vector index (JSON vs SQLite) long term?
- Multi-provider ensemble strategy (vote, rank, merge)?
- Formal risk score weighting calibration (static vs adaptive)?

---
Incrementally implement; keep each phase shippable. Update this roadmap after each major phase lands.
