---
id: spec-refinement-assistant
name: Spec Refinement Assistant
version: 0.1.0
status: draft
priority: low
type: feature
created: 2025-09-13
updated: 2025-09-13
---

# Spec Refinement Assistant

## Summary

Provide an in-IDE assistant that ingests an existing feature spec markdown and suggests refinements (clarifying goals, listing missing edge cases, highlighting ambiguous acceptance criteria) with selective apply into the spec file.

## Goals

- Command: "Refine Current Spec" when a `.spec.md` file focused.
- Parse frontmatter + sections into structured intermediate model.
- Provider prompt includes extracted structure + heuristics for improvement.
- Output JSON suggestions grouped by category: goals, nonGoals, edgeCases, acceptanceCriteria, risks.
- UI diff preview per suggestion with accept button that edits relevant section.
- Telemetry: spec_refine_started, suggestion_applied, suggestion_rejected.

## Non-Goals

- Automatic rewriting of entire spec body (surgical insertions only).
- Multi-spec cross-referencing recommendations.
- Generating brand new specs (handled elsewhere).

## User Story

"As a maintainer, I want quick AI feedback to strengthen a spec's clarity before generating plans and tasks."

## Architecture

### Parsing

Tokenizer splits frontmatter (YAML) and identifies H2 section headings; builds object { summary, goals[], nonGoals[], edgeCases[], acceptanceCriteria[], risks[], openQuestions[] }.

### Suggestion Flow

```text
User Command -> parseSpec -> provider prompt -> suggestions JSON -> build suggestion objects -> open refinement panel
```

### Suggestion Object

{ id, category, description, proposedText, insertPosition (after|replace-section|append-list) }

### Application

- For list-based sections (Goals, Non-Goals, Edge Cases, Acceptance Criteria) append bullet if `append-list`.
- For summary/risk replace full section if flagged replace-section (with confirmation modal).

### Renderer

`SpecRefinementPanel` lists suggestions grouped; each shows diff (unified small) + Accept / Reject.

### Section Location Strategy

Regex for `## <Section Name>` anchors; if absent create section at end (except Summary which must exist).

### Telemetry

Events: type=spec_refine, action=started|applied|rejected, category, charsAdded.

## Metrics Targets

- Time from command to suggestions p95 < 9s.
- User acceptance rate of at least one suggestion per invocation > 50% (qualitative goal).

## Edge Cases

- Malformed frontmatter -> attempt recovery else show error.
- Sections with numbered list vs bullets -> maintain existing style.

## Risks & Mitigations

- Over-suggesting minor edits -> cap suggestions per category (e.g., max 5).
- Large specs causing token overrun -> truncate long sections with model note.

## Open Questions

- Should we support in-place edits with multi-select apply? (future improvement)

## Acceptance Criteria

- Running command surfaces panel with categorized suggestions.
- Accepting suggestion mutates doc accurately and updates panel state.
- Telemetry events recorded.
- No destructive deletion of unrelated sections.

## Implementation Tasks (High-Level)

1. Spec parser utility.
2. Provider prompt template & schema definition.
3. Suggestion application transformer.
4. Panel UI components.
5. IPC exposure if needed (or all renderer side except provider invocation).
6. Telemetry emissions.
7. Tests: parsing robustness, apply transformer, missing section creation.
