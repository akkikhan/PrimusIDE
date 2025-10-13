# Automation & Task Intelligence Pipeline

This document describes the evolving automation stack powering the Primus IDE master backlog.

## Commands
- generate:tasks – Parse `ALL_TASKS.md` into `tasks_all.json`.
- snapshot:tasks – Generate JSON and add a timestamped snapshot in `task-snapshots/`.
- diff:tasks – Compare current JSON with latest snapshot; emit markdown diff and append status transitions to `status-transitions.log`.
- enrich:tasks – Populate `userStory` and `acceptanceCriteria` for SPEC/IMPL/TODO tasks (non-destructive).
- export:gherkin – Emit per-category `.feature` files into `gherkin-features/`.
- trace:tasks – Scan for `// TASK:<id>` references and build `trace_map.json`.

## Data Files
- ALL_TASKS.md – Canonical human-authored backlog (append-only; never delete numbers).
- tasks_all.json – Machine-friendly mirror with enrichment fields.
- task-snapshots/*.json – Historical state timeline for progress metrics.
- status-transitions.log – Tab-delimited chronological record of status changes.
- gherkin-features/*.feature – Behavior scaffolds for BDD expansion.
- trace_map.json – Mapping of task IDs to code references.

## Enrichment Fields
- userStory – Simple story emphasizing advancement toward intelligent, superior AI coding experience.
- acceptanceCriteria – Generic quality bar; specialize manually as needed.

## Roadmap Extensions (Category 27)
Planned metrics: priority, complexity, velocity, reasoning depth, clustering, risk, dependency graph, natural language querying, interactive exploration.

## Philosophy
Every automation step reinforces the core objective: deliver a smarter, faster, deeply assistive native AI IDE surpassing existing tools in capability and usability.

## Next Potential Enhancements
1. Add priority & complexity scoring script.
2. Integrate test coverage mapping.
3. Add semantic search over tasks via vector index.
4. Generate HTML dashboard summarizing trends.
5. CI hook to fail builds on untracked removed tasks.
