## Primus IDE – AI Coding Agent Instructions

Focus: Electron + React + TypeScript desktop IDE. Provide changes that align with existing architecture, task/spec workflow, and build scripts. Keep responses concise and cite concrete file paths.

### 1. Architecture Overview
- Three execution zones:
  - Main process (`src/main/**`): Electron app bootstrap, menus, IPC channel definitions.
  - Preload (`src/preload/**`): Securely exposes a curated API surface (e.g. `window.primus.fs.*`) to renderer; never require Node modules directly in React components.
  - Renderer (`src/renderer/**`): React UI (Editor, Terminal, FileExplorer, SearchPanel, SettingsPanel, PluginSystem) plus shared types in `src/shared/**`.
- Editor: Monaco integration (tab/state mgmt, language detection, diagnostics) – extend via React components under `src/renderer/components/Editor/`.
- Terminal: xterm.js wrapper (`Terminal` component) – keep heavy process logic outside render loop.
- Spec/Planning Tooling: Markdown specs (`specs/*.spec.md`) -> plans (`plans/*.plan.json`) -> per-task files (`tasks/*.task.json`) via scripts in `scripts/spec-kit/`.
- Massive task registry: `ALL_TASKS.md` + individual `tasks/*.task.json` drive prioritization; do not invent new task shape—reuse fields.

### 2. Core Conventions
- Module resolution aliases: `@main/*`, `@renderer/*`, `@shared/*` (see `tsconfig.*.json`). Prefer these over deep relative imports.
- Use TypeScript for new logic; keep `"type": "module"` ES module semantics in mind. Preload uses CommonJS output (see `tsconfig.preload.json`).
- IPC: Define channel names in a central place (follow existing naming style if discovered; avoid ad‑hoc scattered strings in components).
- File system & process access: Only through preload‑exposed APIs (`window.primus.*`). Never import `fs` or `child_process` directly in renderer.
- Settings persistence: JSON under OS‑specific user data path (see README). When adding settings, update schema/comments in the Settings UI + ensure default is non‑destructive.
- Theming: Extend via design tokens / CSS variables; keep Monaco + UI theme in sync; avoid hardcoded colors in components.

### 3. Build & Run Workflows
- Dev (full): `npm run dev:electron` (wait-on + concurrent watchers: preload, main, renderer on port 3001).
- Targeted: `npm run dev:main`, `npm run dev:renderer`, `npm run dev:preload`.
- Production build: `npm run build` (preload -> main -> renderer). Launch with `npm start`.
- Spec pipeline:
  1. Edit spec: `specs/<feature>.spec.md` (frontmatter + sections).
  2. Generate plan: `npm run spec:plan`.
  3. Generate tasks: `npm run spec:tasks` or `npm run spec:all`.
  4. Implement tasks; update each `tasks/*.task.json` status.
- Testing examples: simple sample tests (`test/hello.test.js`, command palette test scripts). For new tests prefer plain Node + minimal harness; keep them fast (no Electron spin‑up unless required).

### 4. When Implementing Features
- Reference an existing open task (or add a spec first) before large changes—maintains traceability (spec -> plan -> task -> code path).
- Keep renderer components lean: heavy logic -> hooks (`src/renderer/hooks/`) or shared utilities.
- Preserve preload boundary: any new capability -> add function in preload + type definition in `src/shared` (avoid global leakage).
- Update relevant plan/task JSON only via generation scripts unless you intentionally hand‑edit status/description.
- Follow existing naming style: PascalCase for React components, camelCase for functions/variables, UPPER_CASE for immutable config tokens.

### 5. Task & Spec Artifacts
- Spec frontmatter keys: `id`, `name`, `version`, `status`, `priority`, `type`, timestamps.
- Plans: `plans/<id>.plan.json` hold `goals` & `requirements` arrays. Tasks explode each goal/requirement into separate `tasks/<taskId>.task.json`.
- Do not mutate auto‑derived fields (IDs, specId) manually—regenerate instead.

### 6. Adding IPC or Preload APIs (Pattern)
1. Define typed contract in `src/shared/<domain>.ts`.
2. Implement in preload; expose under `window.primus.<domain>` namespace.
3. Main process: handle IPC channels centrally (avoid per‑component registration in renderer).
4. Use narrow, data‑only payloads (no class instances across boundary).

### 7. Theming & UI Consistency
- Add theme variables vs inline styles (central theme provider). Sync Monaco theme programmatically when global theme changes.
- Keep panel toggles and layout adjustments free of layout shift (see existing TODOs about reducing shift & animating panels).

### 8. Performance & Safety
- Lazy load heavy modules after initial render (not in module top level of critical components).
- Dispose Monaco models on tab close; release watchers when workspace changes.
- Never block main thread with large FS scans—delegate / throttle via watchers.
- Preload: restrict surface; do not broaden attack surface (no direct eval / dynamic require).

### 9. Preferred Contribution Flow (AI)
1. Identify relevant spec/task.
2. Propose minimal diff (only touched files; avoid reformat noise).
3. Add/adjust tests or lightweight script if behavior changes.
4. Mention follow‑ups instead of large multi‑concern PRs.

### 10. Examples
- Generating plan & tasks for new spec `awesome-feature`: `npm run spec:all` after adding `specs/awesome-feature.spec.md`.
- Exposing new FS helper: shared types -> preload method -> renderer hook `useFileOps()` consuming `window.primus.fs`.

Keep instructions project‑specific; omit generic boilerplate. If uncertain, inspect existing patterns first (README, ALL_TASKS.md, scripts/spec-kit/*) before introducing new abstractions.
