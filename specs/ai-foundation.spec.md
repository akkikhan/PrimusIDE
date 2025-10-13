---
id: ai-foundation
name: AI Foundation & Assistant Layer
version: 0.1.0
author: system
status: draft
priority: critical
type: epic
created: 2025-09-12
updated: 2025-09-12
---

# Summary
Establish the core AI architecture for Primus IDE enabling multi‑provider model orchestration, rich code+task aware context building, conversational + inline assistance, autonomous task execution (agent loops), and guarded application of code changes. This layer is designed to rival / surpass current AI editors (Cursor, Windsurf, VS Code Copilot Chat, Claude Desktop, Kiro) by providing deeply integrated reasoning pipelines tied to the existing Spec/Task governance system.

# Vision Pillars
1. Unified Context Graph: Merge task metadata, trace map (code refs), semantic symbol diff, and live editor selection into a single on‑demand retrieval graph feeding all AI operations.
2. Multi‑Model Orchestrator: Pluggable providers (local + cloud) with adaptive routing (cost, latency, capability tags) and fallback.
3. Progressive Reasoning Loop: plan → simulate (dry patch) → verify (readiness + lint + secret scan) → apply (atomic FS patch) → review (diff + rollback option).
4. Inline Intelligence Everywhere: Monaco inline completions, hover explain, refactor previews, test generation, docstring synthesis, commit message drafts.
5. Safe Autonomy & Guardrails: Policy driven limits (files touched, diff size, risk score), secret & credential leakage prevention, configurable fail‑on‑warn gates.
6. Extensible Tooling Surface: Tool / function calling to invoke internal capabilities (context bundle build, symbol diff, git diff, task selection) safely via a registry.
7. Transparent Artifacts: Every AI action emits structured JSON (request, context slices, reasoning summary, diff, verification report) under `artifacts/ai/` for audit & replay.

# Problems Addressed
- Fragmented context leads to hallucinated or unsafe code edits.
- Lack of traceability between generated code and backlog tasks.
- Hard to evaluate break risk before applying multi‑file changes.
- Monolithic single‑provider assumptions reduce resilience & cost efficiency.

# Goals (Phase 1 Skeleton)
1. IPC channel `ai:request` accepting structured AIRequest and returning AIResponse (mock implementation initially).
2. Shared type definitions (`aiTypes.ts`) for request/response, tool schema, and operation kinds.
3. Preload exposure `window.primus.ai.request()` bridging renderer → main → provider stub.
4. React hook `useAI` for sending requests + maintaining conversation state.
5. Assistant panel component (basic prompt + response list, mock streaming simulation optional later).
6. Integration with existing context bundle (flag includeContext to embed subset summary in mock response now).
7. Artifact logging: write each request/response pair to `artifacts/ai/session_<date>.ndjson` (deferred to Phase 1.1).

# Out of Scope (Phase 1)
- Real model network calls (will arrive in Phase 2 with provider adapters).
- Embeddings index + semantic search (Phase 3).
- Automatic multi‑step reasoning / tool calling (Phase 2 initial, Phase 3 refinement).
- Diff application / patch planning (Phase 2).

# Requirements (Phase 1)
1. Add `AI_REQUEST` channel constant.
2. Define TypeScript types: AIRequest, AIMessage, AIResponse, AIProviderMetadata, AIOperationKind union.
3. Main process handler returns deterministic mock including echo of prompt, operation kind, and (if requested) number of files from context bundle.
4. Preload exposes `primus.ai.request(req)` returning Promise<AIResponse>.
5. Hook `useAI` manages messages (user + assistant) and loading state.
6. AssistantPanel renders basic UI (textarea + send button + scrollable transcript) using hook.
7. All new code passes TypeScript build.

# Future Phases (High Level)
Phase 2: Provider adapters (OpenAI, Claude, Ollama), cost tracking, basic tool calling (contextBundle, symbolDiff, gitDiff), patch planning skeleton.
Phase 3: Embeddings (local + optional remote), retrieval augmentation, refactor/test/doc generation actions, risk assessment loop.
Phase 4: Autonomous multi‑task agent integrating readiness gating & rollback snapshots.
Phase 5: Marketplace AI extensions & custom tool registry.

# Acceptance Criteria (Phase 1)
- Running a renderer UI interaction (AssistantPanel) sends an `AI_REQUEST` and displays mock structured reply.
- Types compile with no errors; main & preload builds succeed.
- Request including `includeContext: true` reports file count from context subsystem in response meta.

# Risks
- Scope creep delaying delivery; mitigated by strict phased approach.
- Large context payloads; mitigated by early summarization & size caps later.

# Open Questions
- Preferred persistence format for conversation logs (ndjson vs per-session JSON)?
- Minimum viable provider metrics: latency, tokens, cost – which to capture first?
- Policy configuration location (dedicated `ai.policy.json` vs extend verifier policy)?

# Tracking
This spec will generate tasks via existing Spec‑Kit pipeline (`npm run spec:plan && npm run spec:tasks`).
