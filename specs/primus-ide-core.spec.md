---
id: primus-ide-core
name: Primus IDE Core Platform
version: 0.1.0
author: you
status: draft
priority: high
type: epic
created: 2025-09-10
updated: 2025-09-10
---

# Summary
Deliver a cross‑platform desktop AI-augmented IDE (Primus IDE) using Electron + React + Monaco with a spec-driven workflow (Spec-Kit) enabling rapid, structured evolution. Core includes: project/workspace management, file explorer, multi-tab Monaco editor, theming, plugin architecture, AI assistance, Git integration, embedded terminal, search, settings UI, and task artifacts generated from specs.

# Problem
Existing editors either lack integrated structured spec-to-implementation loops or cohesive AI + plugin extensibility out-of-the-box. We need a baseline, well-architected IDE that bakes in Spec-Kit to ensure every feature is traceable to a spec and plan, while allowing incremental AI-driven productivity enhancements.

# Goals
- Launchable Electron app with production + dev modes.
- React renderer hosting Monaco with multi-tab support & basic language features.
- File Explorer: create, rename, delete, open files/directories.
- Plugin system: discover/load core + external plugins (configuration scaffold + runtime loader).
- AI assistance: placeholder interface (later: inline suggestions, chat, refactor commands).
- Git integration panel: status, stage/unstage, commit, branch switch (initial read-only OK).
- Embedded terminal panel (shell passthrough) with at least one instance.
- Global search (filename + in-file text baseline). 
- Settings panel: theme (light/dark), font size, tab size, autosave toggle, AI enable toggle.
- Theming system (light/dark persisted) applied across UI + Monaco.
- Status bar: current file, cursor position, Git branch, AI status.
- Spec-Kit integration: ability to generate plans/tasks from specs inside the IDE (menu / command).
- Build scripts: dev hot reload (main, preload, renderer) and production build.
- Basic test scaffolding for critical utilities.
- Full LSP implementation (rely on Monaco defaults initially).
- Advanced AI model integration (stub only for now).
- Marketplace hosting infrastructure.
- Multi-window editing beyond single main window.
- Performance optimizations for very large repos.
- use void, cursor AI, VS code, Claude code, claude desktop, bolt.diy as reference.


# Non-Goals
-do not stop untill you are asked so
-a non usable tool


# Requirements
1. Electron main process bootstraps single BrowserWindow (resizable, remembers last size later).
2. Renderer served by dev server (port 3000) in dev, static files in production.
3. Monaco integrated with language workers bundled.
4. Tab manager: open, close, switch, dirty state indicator.*
5. File explorer tree reads from current working directory; double-click opens file; context menu basic CRUD.*
6. Plugin manager loads plugins from a `plugins/` directory (JSON manifest + index script) and core built-ins.*
7. AI service stub exposes request method returning mock completion.*
8. Git service wrapper (simple shell commands) returns current branch + status list.*
9. Terminal panel spawns a PTY (minimum echo fallback if PTY not implemented yet) with output streaming.*
10. Search panel: filename fuzzy match + in-file grep fallback.*
11. Settings persisted (JSON in user data) for theme + editor options + AI enable.*
12. Theming applies a CSS class to root container; Monaco theme switched accordingly.*
13. Status bar subscribes to editor + git + AI state.*
14. Spec-Kit menu: Generate Plan(s) & Generate Tasks triggers existing node scripts (show toast on completion).* 
15. Build: `npm run dev` orchestrates watches + auto-reload; `npm run build` outputs distributable artifacts.*
16. Tests: At least one test each for file manager, plugin loader, spec-kit invoke shim.*

(*) indicates can begin as minimal implementation and evolve.

# Constraints
- Must remain framework-light: React + Monaco + Electron; avoid premature heavy libraries.
- Scripts should be cross-platform (Windows/macOS/Linux) using node & cross-env.
- Keep initial bundle size reasonable; lazy load heavy plugins.

# Acceptance Criteria
- Running dev script opens Electron window with IDE layout and functioning file explorer + editor.
- At least two files can be opened simultaneously via tabs and edited with syntax highlighting.
- Generating plan/tasks from inside the menu produces artifacts matching CLI output.
- Theme toggle updates UI + Monaco instantly and persists across relaunch.
- Git branch name visible (if repo) or placeholder if not a git repo.
- Status bar updates cursor position on editor move.
- Tests pass (`npm test`).
- Production build runs via start command with no dev server dependency.

# Risks
- PTY / terminal integration complexity on Windows may delay terminal; fallback needed.
- Git commands may hang or be slow for large repos; need async + timeout safeguards.
- Monaco bundle size may slow cold start; consider dynamic worker loading later.

# Open Questions
- Will plugin manifests require semantic version constraints now or later?
- Preferred AI provider integration order (OpenAI, local LLM, others)?
- How will multi-root workspaces be represented (future)?
