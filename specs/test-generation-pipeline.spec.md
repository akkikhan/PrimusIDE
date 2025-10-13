---
id: test-generation-pipeline
name: Test Generation Pipeline
version: 0.1.0
status: draft
priority: medium
type: feature
created: 2025-09-13
updated: 2025-09-13
---

# Test Generation Pipeline

## Summary

Add AI-assisted test generation for selected source file or diff, producing minimal, focused tests (unit-level) with user review & apply similar to patch flow while capturing coverage & outcome telemetry.

## Goals

- Command to generate tests for: current file, selection, or last applied patch.
- Model prompt includes function signatures, existing tests summary, and recent diff hunks.
- Output structured list of test candidates with rationale.
- Allow accept all / per-test selection before file write.
- Avoid duplicate tests (hash comparison of test body normalized).
- Telemetry: tests_generated, tests_applied, duplicate_skipped, generation_latency.

## Non-Goals

- Full coverage measurement integration (basic heuristic only initially).
- Integration test scaffolding (unit scope first).
- Mutation testing.

## User Story

"As a developer after modifying code, I want quickly proposed unit tests so I can increase confidence without manually writing boilerplate."

## Architecture

### Flow

```text
User Command -> gather context (AST signatures + recent diffs) -> provider prompt -> model returns JSON -> parse into TestSession -> review panel -> apply selected -> write tests
```

### Data Model

`TestSession` { id, targetType: file|selection|patch, createdAt, tests[] }

`GeneratedTest` { id, filePath, targetFile, body, rationale, status: pending|accepted|rejected|duplicate }

### File Placement

- If project has `test/` directory use parallel path (mirror tree).
- Else create `test/` at root when first test accepted.
- Test file naming: `<sourceName>.generated.test.(ts|js)` to distinguish.

### Duplicate Detection

Normalize body (strip whitespace/comments) -> hash -> compare against existing generated tests index (JSON cache in memory + optional `.primus/test-index.json`).

### Coverage Heuristic (Simple)

Count referenced function identifiers vs total exported functions; include percentage in rationale display (approximate only).

### Telemetry

Events appended: type=test_gen, action=generated|applied|duplicate_skipped, counts, latencyMs.

## Metrics Targets

- p95 generation latency < 12s (network model) for medium file (<400 lines).
- Duplicate skip accuracy > 95% (few false positives blocking valid tests).

## Edge Cases

- Source file with no exported symbols -> show friendly message (skip).
- Large file (>1200 lines) -> restrict to changed hunks + directly referenced functions.
- Model returns unparsable JSON -> fallback to raw text display & manual copy option.

## Risks & Mitigations

- Overfitting brittle tests -> instruct model to avoid internal implementation assertions.
- Flaky asynchronous tests -> insert timeout guards; user guidance in rationale.

## Open Questions

- Should we auto-run generated tests before apply? (maybe future with opt-in).

## Acceptance Criteria

- TestSession panel lists proposed tests with rationale snippet.
- Accept writes new test files (or appends) without overwriting manual tests.
- Duplicate detection marks duplicates and excludes from write.
- Telemetry rows recorded for generation & apply.

## Implementation Tasks (High-Level)

1. Context collector (function signatures + diffs).
2. Provider prompt & JSON schema definition.
3. Session store & panel (reuse patch panel layout variant).
4. Duplicate detection hashing utility.
5. File path resolver & writer.
6. Telemetry emission.
7. Basic tests: duplicate detection, parsing fallback.
