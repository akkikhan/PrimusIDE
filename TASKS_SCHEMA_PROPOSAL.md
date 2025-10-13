## tasks_all.json Enhanced Schema Proposal

Purpose: Normalize and enrich task tracking beyond simple parsing of `ALL_TASKS.md`, enabling scoring, guarding, traceability, and future analytics (tasks 731–738, 740, 742, 738, 739, 742, 733).

### Current Fields
`id`, `title`, `categoryNumber`, `category`, `status`, `userStory`, `validationSteps`, `acceptanceCriteria`, `sources`, `tags`, timestamps + scoring (`priorityScore`, `complexityScore`, `riskScore`, `impactScore`).

### Issues / Gaps
1. Duplicate ID reuse for trailing "Next Steps" (IDs 1–3 repeated) -> need guard (Task 742) and detection.
2. Status normalization lacks canonical workflow: should map SPEC/IMPL/TODO/DERIVED/FUTURE -> canonical `lifecycleStatus` and separately keep `originTag` (source suffix).
3. `tags` empty; automatically derive from title tokens & category (Task 738 semantic index later).
4. No field capturing whether originally from spec vs derived planning -> add `sourceType`.
5. No hash of raw text -> add `contentHash` SHA1 to detect silent textual edits for diffing.
6. Missing `riskFactors` explanation for riskScore transparency.
7. Need `blocked` boolean + `dependencies` array for future graph (Task 728 placeholder now).
8. Need `statusHistory` (append on change) to avoid parsing external log only.
9. Provide `effortEstimate` placeholder (null|number story points) separate from complexityScore heuristic.
10. Provide `updatedByScript` flag for last modifying automation step.

### Proposed Additional Fields
| Field | Type | Description |
|-------|------|-------------|
| `originTag` | string | Raw suffix captured (SPEC/IMPL/TODO/DERIVED/FUTURE/UNKNOWN). |
| `lifecycleStatus` | string | Normalized status workflow: `planned` (SPEC/DERIVED/FUTURE/TODO), `in-progress`, `done`, `removed`. Initially derived from originTag. |
| `sourceType` | string | `spec` | `inline` | `derived` | `future` | `other`. |
| `contentHash` | string | SHA1 of `title + originTag`. |
| `autoTags` | string[] | Machine derived keyword tags (kebab-case). |
| `riskFactors` | string[] | Keywords matched that influenced riskScore. |
| `priorityFactors` | string[] | Matched priority heuristic tokens. |
| `complexityFactors` | string[] | Matched complexity heuristic tokens. |
| `blocked` | boolean | Manual toggle for scheduling. Default false. |
| `dependencies` | number[] | Upstream task IDs. Empty list default. |
| `statusHistory` | {date,status}[] | Append-only transitions (script-managed). |
| `effortEstimate` | number|null | Manual planning input (story points). |
| `updatedByScript` | string | Last automation script name (e.g. `generateTasksJson`, `enrichTasks`, `scoreTasks`, `guardTasks`). |

### Backward Compatibility
Existing consumers rely on root shape: `{ generatedAt, total, tasks:[] }`. Additional fields are additive. Scoring script will be updated to not overwrite arrays of `*Factors` if present unless `--force` provided.

### Guard Script Behavior (Task 742)
1. Load previous snapshot (latest in `task-snapshots/`).
2. Compare ID set. If any IDs removed and `--allow-delete` not provided -> exit 1 with report.
3. Detect duplicate IDs within current file -> fail.
4. Detect reused IDs with conflicting `contentHash` (semantic change) -> warn (exit 0) unless `--strict` then fail.
5. Output summary JSON to stdout for potential CI capture.

### Scoring Transparency
Scoring script will populate `priorityFactors`, `complexityFactors`, `riskFactors` with the regex segments that matched.

### Migration Steps
1. Implement updated parser enriching `originTag`, `sourceType`, `contentHash`.
2. Add guard script.
3. Update scoring script to add factor arrays.
4. Regenerate & snapshot.
5. Document usage in README.

### Future Extensions
- Embed semantic vector (embedding) later in `semantic` object: `{model, vector:[...], generatedAt}`.
- Maintain `dependencies` automatically when phrases like "requires task 123" appear in markdown.

---
Generated: 2025-09-12