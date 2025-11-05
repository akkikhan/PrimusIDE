## Primus IDE – AI Coding Agent Instructions

**Project:** Professional Electron-based IDE with TypeScript/React | **Status:** ~70% complete, targeting date was November 2025. Already late need ASAP.  

**Unique Features:** Spec-Kit driven development, AI planning integration

---

### 1. Architecture & Execution Zones

**Three-Process Electron Model:**
- **Main** (`src/main/**`): App bootstrap, native menus, window mgmt, IPC handlers. Entry: `src/main/main.ts`
- **Preload** (`src/preload/**`): Sandboxed bridge exposing `window.primus.*` APIs. Never import Node.js modules in renderer.
- **Renderer** (`src/renderer/**`): React UI + Monaco editor. All Node.js access via `window.primus.*` only.

**Key Components:**
- **Editor:** Monaco integration at `src/renderer/MonacoEditor.tsx` with tab state in `App.tsx`
- **Terminal:** xterm.js wrapper at `src/renderer/Terminal.tsx` (keep PTY logic in main process)
- **File Explorer:** `src/renderer/FileExplorer.tsx` with chokidar watchers in main
- **AI System:** Multi-provider at `src/main/ai/` (OpenAI, local, mock) + context modules
- **Task Automation:** 750 tasks in `ALL_TASKS.md` + `tasks_all.json` with scripts at `scripts/automation/`

**Data Flow Example (File Open):**
```
FileExplorer.tsx → window.primus.fs.readFile(path) 
  → [IPC] → main/ipc/fsHandlers.ts 
  → fs.readFile → [IPC response] 
  → Monaco model created in renderer
```

---

### 2. Core Conventions & Patterns

**Module Resolution:** Use aliases `@main/*`, `@renderer/*`, `@shared/*` (defined in `tsconfig.*.json`) instead of `../../..` paths.

**IPC Channels:** Centralize in `src/shared/ipcChannels.ts`. Pattern: `domain:action` (e.g., `fs:readFile`, `lsp:goToDefinition`). Never hardcode strings.

**Type Safety Across Boundaries:**
```typescript
// src/shared/fileTypes.ts
export interface FileEntry { name: string; path: string; type: 'file' | 'directory'; }

// src/preload/preload.ts
fs: {
  readDir: (path: string) => ipcRenderer.invoke('fs:readDir', path) as Promise<FileEntry[]>
}

// src/main/ipc/fsHandlers.ts
ipcMain.handle('fs:readDir', async (_, path: string): Promise<FileEntry[]> => { ... })
```

**Renderer Safety Rules:**
- ❌ `import fs from 'fs'` or `import { spawn } from 'child_process'`
- ✅ `await window.primus.fs.readFile(path)` or `await window.primus.terminal.executeCommand(cmd)`

**Settings Management:** Persisted JSON at OS-specific paths. Schema at `src/shared/settingsSchema.ts`. Update via `loadSettings()` / `updateQuickAI()` helpers (see `README.md` "Settings & Theming" section).

---

### 3. Task & Spec-Driven Workflow (Critical!)

**The Development Loop:**
1. **Spec First:** Write `specs/<feature>.spec.md` with frontmatter (`id`, `name`, `priority`, `status`)
2. **Generate Plan:** `npm run spec:plan` → creates `plans/<id>.plan.json`
3. **Generate Tasks:** `npm run spec:tasks` → explodes into `tasks/<taskId>.task.json`
4. **Implement:** Reference task ID in code comments: `// TASK:637 - LSP go to definition`
5. **Track Progress:** `npm run task:start -- 637`, then `npm run task:complete -- 637`
6. **Update Trace Map:** `npm run tasks:pipeline` (auto-detects `// TASK:<id>` refs in code)

**Task Management Commands:**
```bash
npm run task:next              # Select next prioritized task
npm run task:start -- <id>     # Mark task in-progress
npm run task:complete -- <id>  # Mark done, update statusHistory
npm run tasks:status           # View dashboard
npm run tasks:batch -- --size=5  # Get batch for parallel work
```

**Key Artifacts:**
- `ALL_TASKS.md`: 750 tasks across 28 categories (human-readable master list)
- `tasks_all.json`: Machine-readable with `impactScore`, `priorityScore`, `lifecycleStatus`
- `trace_map.json`: Maps task IDs to code file locations (auto-generated)

**Don't Invent Task Schemas:** Reuse existing fields (`id`, `title`, `category`, `status`, `lifecycleStatus`, `userStory`, `acceptanceCriteria`). Tasks auto-enriched via `npm run enrich:tasks`.

---

### 4. Build & Dev Workflows

**Development (Hot Reload):**
```bash
npm run dev                  # All watchers (preload + main + renderer)
npm run dev:electron         # Launch Electron when ready (requires above running first)
```
- Renderer: Webpack dev server on port 3001 with HMR
- Main/Preload: TypeScript watch mode with `electronmon` auto-restart
- Build order: preload → main → renderer (dependencies)

**Production:**
```bash
npm run build                # Full build (dist/preload, dist/main, dist/renderer)
npm start                    # Launch production build
npm run dist                 # Package with electron-builder (release/ folder)
```

**Testing:**
```bash
npm test                     # Jest unit tests
npm run test:commands        # Command palette integration tests
npm run tasks:verify         # Task schema validation
```

**Common Build Issues:**
- **Preload errors:** Check `tsconfig.preload.json` has `"module": "commonjs"`
- **Monaco workers:** Large bundle? Lazy load languages (see `webpack.renderer.prod.optimized.js`)
- **IPC not working:** Verify channel names match in `src/shared/ipcChannels.ts`

---

### 5. LSP Integration (In Progress - See PROJECT_COMPLETION_PLAN.md)

**Adapter Pattern for Vendor Code:**
We're cloning VS Code LSP modules into `src/vendors/` and wrapping with adapters at `src/adapters/`:

```typescript
// src/shared/adapters/ILSPAdapter.ts (interface)
export interface ILSPAdapter {
  initialize(workspaceRoot: string): Promise<void>;
  getDefinition(uri: string, position: Position): Promise<Location[]>;
  // ... other LSP operations
}

// src/adapters/TypeScriptLSPAdapter.ts (wrapper)
export class TypeScriptLSPAdapter implements ILSPAdapter { ... }

// src/main/services/LSPService.ts (singleton)
export const lspService = new LSPService();  // Manages all language adapters
```

**Integration Steps:**
1. Define interface in `src/shared/adapters/`
2. Implement adapter wrapping VS Code code in `src/adapters/`
3. Expose via IPC in `src/main/ipc/lspHandlers.ts`
4. Add preload API at `window.primus.lsp.*`
5. Register Monaco provider in `src/renderer/MonacoEditor.tsx`

**See Also:** `IMPLEMENTATION_GUIDE.md` for complete LSP recipes with code examples.

---

### 6. AI System Architecture

**Provider Registry:** `src/main/ai/providerRegistry.ts` manages OpenAI, local, mock providers.

**Context Modules (Prioritized):**
1. Selection → Current editor selection (capped ~16KB)
2. Diagnostics → Monaco markers (errors/warnings)
3. Current File → Active file content (capped ~32KB)
4. Related Tests → Heuristic sibling test file discovery
5. Retrieval → Vector index hits (optional, limited results)

**Request Flow:**
```typescript
// Renderer
await window.primus.ai.request({
  id: 'req_123',
  operation: 'chat',
  prompt: 'Explain this function',
  includeContext: true,
  providerHint: 'openai'
});

// Main → src/main/ai/aiService.ts
// → gatherContext() → providerRegistry.invoke()
// → response with {text, meta: {tokensEst, costEst}}
```

**AI Policy:** `ai.policy.json` enforces `maxPromptChars`, `blockedOperations`. Loaded at startup via `src/main/ai/policy.ts`.

---

### 7. When Implementing Features

**Pre-Implementation Checklist:**
1. ✅ Search `ALL_TASKS.md` or `tasks_all.json` for existing task
2. ✅ If none exists, write spec in `specs/` first, then `npm run spec:all`
3. ✅ Run `npm run task:start -- <id>` before coding
4. ✅ Add `// TASK:<id>` comment in implementation files
5. ✅ Keep renderer components lean (<200 lines); extract hooks to `src/renderer/hooks/`
6. ✅ Test preload APIs in isolation before integrating into UI

**IPC Addition Pattern (Expanded):**
```typescript
// 1. Shared types
// src/shared/myFeature.ts
export interface MyFeatureRequest { query: string; }
export interface MyFeatureResponse { results: string[]; }

// 2. Preload exposure
// src/preload/preload.ts
myFeature: {
  search: (req: MyFeatureRequest) => ipcRenderer.invoke('myFeature:search', req)
}

// 3. Main handler
// src/main/ipc/myFeatureHandlers.ts
ipcMain.handle('myFeature:search', async (_, req: MyFeatureRequest): Promise<MyFeatureResponse> => {
  return { results: ['...'] };
});

// 4. Register in main.ts
import { registerMyFeatureHandlers } from './ipc/myFeatureHandlers';
app.on('ready', () => { registerMyFeatureHandlers(); });
```

**Monaco Integration Pattern:**
```typescript
// Register provider for TypeScript
monaco.languages.registerDefinitionProvider('typescript', {
  provideDefinition: async (model, position) => {
    const result = await window.primus.lsp.goToDefinition(
      model.uri.toString(),
      { line: position.lineNumber, column: position.column }
    );
    return result.locations.map(loc => ({
      uri: monaco.Uri.parse(loc.uri),
      range: new monaco.Range(loc.range.start.line, ...)
    }));
  }
});
```

---

### 8. Performance & Safety

**Renderer Performance:**
- Lazy load Monaco languages: `import(/* webpackChunkName: "lang-python" */ 'monaco-editor/esm/vs/basic-languages/python/python')`
- Dispose models on tab close: `editor.getModel()?.dispose()`
- Debounce file watcher events (100-300ms)
- Virtual scrolling for large lists (see `src/renderer/ProblemsPanel.tsx` for example)

**Memory Leaks:**
- Always cleanup subscriptions: `useEffect(() => { return () => subscription.dispose(); }, [])`
- Monaco workers: Limit to 2-4 via `monaco.editor.MonacoWebWorker`
- Language servers: Dispose adapters on workspace close

**Security (Electron):**
- Preload: `contextIsolation: true`, `nodeIntegration: false`
- CSP headers in renderer HTML
- Never `eval()` or `new Function()` in renderer
- Validate all IPC inputs in main process

---

### 9. Contribution Guidelines for AI

**Preferred Changes:**
- ✅ Minimal diffs (touch only necessary files)
- ✅ Preserve existing formatting (Prettier auto-formats)
- ✅ Reference task ID in commit: `git commit -m "TASK-637: Implement LSP go to definition"`
- ✅ Update tests if behavior changes

**Avoid:**
- ❌ Large refactors without spec/task justification
- ❌ Adding new dependencies without discussion
- ❌ Breaking preload API contracts (impacts all renderer code)
- ❌ Hardcoding file paths (use workspace-relative)

**When Uncertain:**
1. Check existing patterns in similar files
2. Search codebase: `grep -r "pattern" src/`
3. Review `README.md`, `PROJECT_COMPLETION_PLAN.md`, or `IMPLEMENTATION_GUIDE.md`
4. Ask specific questions with context

---

### 10. Project-Specific Gotchas

**TypeScript Configs:** 5 separate tsconfigs for different targets. Don't merge!
- `tsconfig.main.json`: Node.js target, ESNext modules
- `tsconfig.preload.json`: CommonJS output (required for Electron preload)
- `tsconfig.renderer.json`: React + DOM libs
- `tsconfig.tests.json`: Jest types
- `tsconfig.json`: IDE tooling only

**Module Type Confusion:** Root `package.json` has `"type": "commonjs"` but some scripts use ESM. Check individual file extensions (.cjs vs .mjs vs .ts).

**Monaco Theme Sync:** When changing app theme, also update Monaco theme via `monaco.editor.setTheme('primus-theme')`. See `src/renderer/ThemeContext.tsx`.

**Task Status Lifecycle:** `planned` → `in-progress` → `done` (or `verifying`). Use `npm run task:start/complete/reset` to transition states properly (updates `statusHistory`, `updatedAt`, etc.).

**AI Context Budget:** Max ~8000 chars per prompt (configurable in `ai.policy.json`). Context modules truncate automatically if exceeded. See `src/main/ai/contextGatherer.ts`.

---

### 11. Quick Reference

**Key Files to Review:**
- `src/renderer/App.tsx` – Main React component (1200+ lines, central state)
- `src/main/main.ts` – Electron app entry point
- `src/preload/preload.ts` – API bridge (all `window.primus.*` definitions)
- `src/shared/ipcChannels.ts` – IPC channel constants
- `ALL_TASKS.md` – Task master list (750 items across 28 categories)
- `PROJECT_COMPLETION_PLAN.md` – 12-week roadmap to beta (read for strategic context)

**Common Commands:**
```bash
# Development
npm run dev                      # Start all watchers
npm run dev:electron             # Launch Electron (after dev is running)

# Task Management
npm run task:next                # Get next prioritized task
npm run task:start -- 637        # Start task 637
npm run task:complete -- 637     # Mark task 637 done
npm run tasks:pipeline           # Update trace map + analytics

# Spec-Kit Workflow
npm run spec:all                 # Generate plans + tasks from specs
npm run generate:tasks           # Parse ALL_TASKS.md → tasks_all.json
npm run enrich:tasks             # Add user stories/acceptance criteria

# Build & Test
npm run build                    # Production build
npm test                         # Run Jest tests
npm run dist                     # Package for distribution
```

**File Naming:** PascalCase for React components, camelCase for utilities, kebab-case for CSS modules.

---

**For Strategic Context:** Read `PROJECT_COMPLETION_PLAN.md` (12-week roadmap), `IMPLEMENTATION_GUIDE.md` (code recipes), and `TASK_CHECKLIST.md` (daily tracking).

**When Adding Features:** Spec → Plan → Tasks → Code → Trace. Always reference task IDs. The automation system is the project's core differentiator—respect the workflow.
