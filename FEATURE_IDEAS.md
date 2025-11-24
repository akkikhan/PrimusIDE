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

## 4. "Shadow" Test Runner & Explanation Engine

**Description:**
A continuous background testing engine (similar to Wallaby.js) that runs only the tests affected by current code changes, integrated directly with the AI assistant to explain failures.

**Key Capabilities:**
- **Smart Execution:** Uses the dependency graph (Task 728) to run only relevant tests on every keystroke/save.
- **Inline Status:** Renders pass/fail indicators (green/red gutters) in real-time next to the code lines covered by tests.
- **AI Failure Analysis:** When a test fails, an "Explain Failure" action becomes available, where the AI reads the test logic, the error output, and the source code to suggest a fix immediately.

**Rationale:**
`ALL_TASKS.md` mentions "Coverage correlation" (Task 740) and "E2E smoke" tests (Task 492), but a real-time unit test feedback loop significantly accelerates the "Implement -> Verify" cycle, especially when combined with AI diagnostics.

**Differentiation:**
Unlike standard "Watch Mode" in Jest, this provides granular line-level feedback in the editor and couples it with AI remediation, turning "Test" into a continuous assistant rather than a distinct phase.

## 5. Collaborative "War Room" Dashboard

**Description:**
A real-time "Multiplayer" overview panel that visualizes the activity of the entire team within the project, leveraging the existing collaboration server (Task 381).

**Key Capabilities:**
- **Live Avatar Map:** Shows which file every active user is currently editing or viewing.
- **Task Radar:** Displays which Task ID each user is currently working on (derived from their active branch or manual status).
- **Conflict Prediction:** Alerts users if two people are editing files that are heavily dependent on each other, even if not the exact same file (using the dependency graph).

**Rationale:**
The project has extensive plans for collaboration (Tasks 381-415). A "War Room" provides the high-level coordination view needed for large teams, moving beyond simple "google docs style" cursor sharing to "Task-level" awareness.

**Differentiation:**
Moves collaboration from "concurrent editing" (which can be chaotic) to "concurrent awareness" (which prevents conflicts).

## 6. Performance Budget Watchdog & Bundlesize Guard

**Description:**
A proactive enforcement system for performance metrics, preventing regressions in startup time, memory usage, and bundle size before they merge.

**Key Capabilities:**
- **Budget Definition:** A configuration file defining limits (e.g., "Main Bundle < 5MB", "Startup < 2s").
- **CI/Local Check:** Runs on pre-commit/build. If a change causes a metric to exceed the budget, the build warns or fails.
- **AI Optimization Tips:** If the budget is exceeded, the AI analyzes the diff (e.g., "You imported a large library `lodash` but only used one function") and suggests tree-shaking optimizations or lazy-loading strategies.

**Rationale:**
Performance is a key theme (Tasks 446-470), specifically "Bundle size budget check" (Task 522). This feature operationalizes those tasks into a developer-facing tool with AI guidance.

**Differentiation:**
It's not just a reporter; it's an active guard with AI-powered remediation suggestions for performance regressions.
