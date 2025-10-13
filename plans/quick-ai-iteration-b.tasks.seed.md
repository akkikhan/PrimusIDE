# Iteration B Task Seeds (Planning Draft)

These are draft task bullets derived from `specs/quick-ai-iteration-b.spec.md` for later conversion to formal plan / task JSON via existing spec-kit scripts.

## Context Acquisition

- Implement preload IPC: ai.gatherContext (stub returning synthetic counts initially)
- Implement diagnostics fetch using existing channels (or new) and shape to spec
- Related tests heuristic path scan utility (debounced, cancellable)
- Token budget calculator & dropping logic with priority ordering
- Renderer: context badge w/ tooltip summarizing modules & token total

## Diff Preview & Patch

- Parse fenced code blocks + path hints extractor utility
- Lightweight unified diff generator (line-level, ignore trailing whitespace diffs flag)
- Diff session state manager (create, update selections, dispose)
- Modal UI: file list, hunks with checkboxes, apply/cancel actions
- Preload fs.applyPatch IPC + error mapping
- Apply selected hunks sequentially; aggregate result toast

## Provider Metrics & Routing V2

- Metrics ring buffer implementation
- Streaming first-byte capture hook
- Rolling averages & error rate calculation function
- Auto routing scorer (capability + dynamic penalty)
- Diagnostics panel UI & toggle

## Cost Awareness

- Static pricing map file + types
- Token estimation refinement (include context module sizes separately)
- Cost calculation & display integration in stats line

## Action History

- History ring + localStorage serialization
- UI dropdown / popover listing last 10 entries
- Repopulate prompt & modules on selection

## Telemetry Hooks

- recordAction & recordAutoProviderDecision fleshed out (console.debug initially)
- Optional export of metrics/history under debug flag

## Accessibility / UX Polish

- Focus management & ESC handling for all new modals
- Aria labels + keyboard navigation for diff hunk list

## Hardening / Edge Cases

- Large file diff truncation logic
- Context module fallback if file not loaded
- Graceful degrade when no providers expose pricing

