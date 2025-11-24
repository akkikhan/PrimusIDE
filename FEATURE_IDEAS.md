# Proposed Feature Ideas for Primus IDE

Based on an analysis of the codebase, `README.md`, `FUTURE_AI.md`, and `ALL_TASKS.md`, here are three feature ideas that align with the project's goal of being a professional, spec-driven, AI-enhanced IDE.

## 1. AI-Powered "Doc-Rot" Monitor & Auto-Updater

**Description:**
A background AI agent that continuously monitors the consistency between high-level documentation (Specs, `architecture.md`, design docs) and the actual codebase. It detects when code implementation diverges from the agreed-upon specs or when documentation becomes outdated ("rot").

**Key Capabilities:**
- **Drift Detection:** Scans changed files and compares them against linked Specs or Architecture documents.
- **Proactive Alerting:** Adds non-intrusive diagnostics (like "Architecture Warnings") in the Problems panel when code violates a documented pattern or constraint.
- **Auto-Remediation:** Offers an AI Action to "Update Documentation to Match Code" or "Refactor Code to Match Spec".

**Rationale:**
Primus IDE emphasizes a "Spec-Driven Development" workflow (Specs -> Plans -> Tasks). However, keeping these artifacts in sync with moving code is a major burden. Automating this ensures the "Professional" promise of the IDE is kept without manual overhead.

**Differentiation:**
Existing tasks (e.g., Task 656) focus on low-level *docstring* generation. This feature focuses on high-level *semantic consistency* between design artifacts and implementation, acting as an automated "Architectural Linter".

## 2. Interactive "Spec-to-Code" Traceability Graph

**Description:**
A dedicated visualization panel (integrated into the editor, not just a generated HTML report) that renders an interactive node graph showing the relationships between:
`Spec (Markdown)` -> `Plan (JSON)` -> `Task (JSON)` -> `Code Implementation (File/Symbol)`.

**Key Capabilities:**
- **Visual Navigation:** Click a "Spec" node to see all related "Tasks" and modified "Files".
- **Coverage Heatmap:** Color-code nodes based on status (Draft, Planned, In-Progress, Done) and test coverage.
- **Link Traversal:** Uses the existing `trace_map.json` and `// TASK:ID` markers to visualize the actual footprint of a feature in the codebase.
- **Impact Analysis:** Selecting a Task node highlights the specific files and functions it touched.

**Rationale:**
The project already maintains rich metadata (`tasks_*.json`, `trace_map.json`), but developers interact with it mostly through text/CLI. A visual "Mission Control" helps developers understand the scope of features and ensure all requirements (Specs) have corresponding code.

**Differentiation:**
While `ALL_TASKS.md` mentions "HTML dashboard generation" (Task 736) and "Task cluster visualization" (Task 748), this proposes a deeply integrated, interactive *editor panel* (React-based) that facilitates navigation and understanding, rather than a static report.

## 3. "Context Pinning" & Persistent AI Snapshots

**Description:**
Enhances the AI Context system (`src/shared/aiContext.ts`) to allow users to manually control the context window, moving beyond purely automated heuristics.

**Key Capabilities:**
- **Context Pinning:** Allow users to right-click a file, code selection, or terminal output and "Pin to AI Context". Pinned items are never dropped by the budget pruner until unpinned.
- **Session Snapshots:** Users can save the current state of the AI context (open files + pinned items + recent conversation) as a named "Session" (e.g., "Debugging Auth Middleware").
- **Restoration:** Switching tasks (via the Task system) could optionally restore the "Snapshot" associated with that task, bringing back relevant files and context.

**Rationale:**
The current context gathering relies on automated priorities (Selection > Diagnostics > File). Complex tasks often require context that isn't currently "active" (e.g., a utility file closed 10 minutes ago). Giving power users explicit control over the context window turns the AI into a more reliable "Pair Programmer" that shares the user's mental model.

**Differentiation:**
This extends the current "Context Enrichment" (Task 227) by adding user agency and state persistence. It bridges the gap between the Task system and the AI Assistant.
