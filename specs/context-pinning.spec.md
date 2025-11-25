---
id: context-pinning
name: Context Pinning & Persistent AI Snapshots
version: 0.1.0
status: draft
priority: high
type: feature
created: 2025-05-20
updated: 2025-05-20
---

# Context Pinning & Persistent AI Snapshots

## Summary
A mechanism to allow users to manually control the AI context window by "pinning" specific files, selections, or data, and saving these configurations as named "Snapshots" (Sessions) that can be restored later.

## Problem
The current AI context gathering system relies heavily on automated heuristics (Selection > Diagnostics > Current File > Related Tests). While effective for simple queries, this often fails for complex, multi-step tasks where the relevant context (e.g., a utility file, a specific error log, or an interface definition) is not currently "active" in the editor.

Developers frequently find themselves re-opening files or re-selecting text just to "remind" the AI of the context, or struggling when the AI "forgets" key information because it was pushed out of the token budget by less relevant active files.

## Goals
1.  **User Agency:** Give users explicit manual control over what stays in the AI context.
2.  **Persistence:** Allow context configurations to be saved and reloaded, enabling seamless context switching between tasks.
3.  **Transparency:** Clearly visualize what is currently in the context and why (Pinned vs. Auto).

## Non-Goals
-   Replacing the automated heuristics entirely (the auto-context is still useful as a baseline).
-   Infinite context window (token limits still apply; pinned items just get priority).

## Requirements

### 1. Pinning Actions
-   **Pin File:** Context menu action in File Explorer and Editor Tabs to "Pin to AI Context".
-   **Pin Selection:** Editor context menu action to "Pin Selection to AI Context" (captures specific lines).
-   **Pin Terminal Output:** Ability to select text in the terminal and pin it (useful for error traces).

### 2. Context Management UI
-   **Pinned List:** A section in the AI Assistant panel showing currently pinned items.
-   **Unpin:** Ability to remove items from the pinned list.
-   **Budget Visualization:** A visual indicator showing how much of the token budget is consumed by Pinned items vs. Auto items.

### 3. Session Snapshots
-   **Save Session:** Button to save the current set of (Pinned Items + Open Files + Chat History) as a named session.
-   **Load Session:** Interface to browse and restore a saved session.
-   **Task Integration:** (Future) Option to link a Session to a specific Task ID, auto-loading it when the task is started.

### 4. Context Logic Updates
-   Modify `ContextGatherRequest` and the gathering logic (`src/shared/aiContext.ts`) to prioritize pinned items above all other modules.
-   Ensure pinned items are never dropped unless they alone exceed the *entire* budget (in which case, warn the user).

## Constraints
-   **Token Limit:** Pinned items consume the shared token budget. If pinned items take 90% of the budget, the "Auto" context (current file) may be starved.
-   **Storage:** Snapshots should be stored locally (e.g., `tasks/sessions/*.json` or `artifacts/ai/sessions/`) to avoid bloating the git repo if they contain large text dumps.

## Acceptance Criteria
1.  User can right-click a file in the explorer and see "Pin to AI Context".
2.  Pinned file appears in a "Pinned Context" list in the AI panel.
3.  When sending a query, the pinned file's content is included even if the file is closed in the editor.
4.  User can save the current context state as "Feature X Debugging".
5.  After restarting the IDE, user can load "Feature X Debugging" and see the pinned items restored.

## Risks
-   **User Overload:** Users might pin too much, leaving no room for the active file or response. *Mitigation: UI warning when pinned content exceeds 70% of budget.*
-   **Stale References:** Pinned selections (line numbers) might become invalid if the file changes externally. *Mitigation: Store a hash of the content or use robust range tracking (if possible).*

## Open Questions
-   Should we store the *content* of the pinned item in the snapshot, or just the *reference* (path)? (Reference is better for files, Content is better for terminal output/ephemeral text).
-   How do we handle "Pin Selection" if the file is edited significantly? (For V1, maybe just snapshot the text content).
