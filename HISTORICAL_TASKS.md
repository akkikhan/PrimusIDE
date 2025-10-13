# Historical Task Catalog

This file is an aggregated, persistent snapshot of tasks across specs, implemented features, inline TODOs, and inferred subsystems. It is derived from `tasks_index.json`.

## Snapshot Metadata

- Generated: 2025-09-12T00:00:00Z
- Index File: `tasks_index.json`
- Approximate Total (current snapshot): 59
- Note: The originally referenced "630" historical items are not present in the current repository state; this catalog will grow with future snapshots.

## Categories

### Spec: primus-ide-core (16)

1. Electron bootstraps BrowserWindow
2. Dev vs prod renderer serve
3. Monaco integration
4. Tab manager CRUD & dirty state
5. File explorer CRUD
6. Plugin manager loads manifests
7. AI service stub
8. Git service wrapper branch+status
9. Terminal panel PTY fallback
10. Search panel filename+grep
11. Settings persistence
12. Theming system
13. Status bar subscribed states
14. Spec-Kit menu plan/tasks
15. Build scripts dev & prod
16. Basic tests for key utilities

### Spec: hello-world (4)

1. helloWorld() function
2. Unit test for helloWorld
3. CLI script prints message
4. Plan & task artifacts generation

### Feature: Outline (Symbols Panel) (8)

1. SymbolsPanel scaffold
2. Command/shortcut registration
3. Indexer data wiring
4. Reveal navigation
5. Fuzzy filter + highlight
6. Performance timing >=1000
7. Tests for symbols panel
8. Docs update

### Feature: Problems Panel (9)

1. Diagnostics types + toggle
2. Status bar bubble
3. Marker collection debounce
4. Grouping + navigation
5. Severity filters
6. Performance instrumentation thresholds
7. Helper tests (grouping/counts)
8. Docs & acceptance
9. Polish (SeverityIcon refactor)

### Inline TODO Sample (12)

1. Get selected text from monaco
2. Get cursor position
3. Navigate to specific line (open file)
4. Synchronized scrolling
5. Implement test generation placeholders
6. Add function description JSDoc
7. Implement response time tracking
8. Add proper error handling
9. Spawn spec plan script
10. Spawn spec tasks script
11. Lightweight code navigation
12. Improve broadcast handler structure

### Inferred Subsystems (10)

1. AI chat interface scaffold
2. Smart code intelligence extraction
3. Collaboration server skeleton
4. Plugin manifest validation
5. Build pipeline separation
6. Git staging future work
7. Terminal multi-instance future
8. Settings UI enhancements
9. Search performance improvements
10. Accessibility & ARIA polish

## Maintenance

To append a new snapshot in the future:

1. Update / create scripts to scan specs, src inline TODOs, and feature directories.
2. Regenerate `tasks_index.json` with updated timestamp.
3. Append a new section to this file (do not overwrite previous snapshots) under a heading `## Snapshot YYYY-MM-DDTHH:MM:SSZ`.

## Future Automation (Planned)

- `npm run tasks:snapshot` script to: regenerate JSON index, append snapshot block.
- Optional diff summary (new, removed, changed tasks) appended after each snapshot.

## Limitations

- Not a forensic reconstruction of prior ephemeral chat-managed lists.
- Counts reflect what is currently discoverable in repository files.
- Inline TODO sample intentionally limited to high-signal items; full raw list lives in VCS history and code.
