# Primus-IDE: High-Level Design Document

## 1. Overview
- Project purpose: Modern IDE built with JavaScript/TypeScript.
- Key features: File exploration, command palette, embeddings registry, extensible command system

## 2. Core Architecture

```text
+--------------------+       +-------------------------+       +-------------------------+
|       UI Layer     |<----->|   Backend Services      |<----->|   Data Registries       |
|                    |  API  |                         |  API  |                         |
| - Command Palette  |       | - File Operations (CRUD)|       | - Global Command Reg.   |
| - File Explorer    |       | - Embedding Provider    |       | - Embeddings Registry   |
| - AI Autocomplete  |       | - Telemetry Aggregation |       | - Vector Store          |
+--------------------+       +-------------------------+       +-------------------------+
                              ^                                 ^
                              |                                 |
                              +---------------------------------+
                              |    Integration Points          |
                              | - Async Operations (await)     |
                              | - Try-Catch Error Handling     |
                              | - Event Listeners (Telemetry)  |
                              +---------------------------------+
```

This diagram shows the layered architecture:
- **UI Layer**: User-facing components for interaction.
- **Backend Services**: Core logic for operations like file I/O and embeddings.
- **Data Registries**: Centralized storage for commands and AI data.
- **Integration Points**: Cross-layer communication with error resilience.

- Diagram illustrating modular structure and key layers (UI, backend services, data registries, integration points)


## 3. Key Components
- 3.1. File Operations Module
  - CRUD operations (create/read/write/copy/rename/delete/list)
  - Error handling (invalid paths, permissions, non-existent resources)
  - Edge cases (special characters, empty content, large files, overwrite)
  - Test coverage (test-file-operations.js)

### 3.2. Command Palette

The Command Palette is a central UI component for quick access to IDE features, integrated with the globalCommandRegistry for registration and fuzzy matching for search. It supports keyboard invocation (e.g., Ctrl+P) and dynamic filtering, enabling extensible command execution.

#### Registration and Invocation
- **Registration**: `globalCommandRegistry.register({ id, title, category, action })` - Adds commands with unique ID, display title, category for grouping, and action function.
- **Invocation**: `globalCommandRegistry.execute(id)` - Runs the action for a registered ID; tracks recent executions for prioritization.
- **Search/Filtering**: `fuzzyMatch(query, list, selector)` - Ranks commands based on title/category match; returns sorted results with scores.

#### Error Handling
- Duplicate registration: Throws error with "duplicate ID" message to prevent overrides.
- Invalid action (non-function): Execute throws "action must be function" error.
- Empty/invalid query: Returns empty array without crash.
- Non-string inputs: Fuzzy match ignores or throws on selector function errors.

#### Edge Cases
- Empty titles: Registration allows but search ranks low.
- No matches: Returns [] for query with no results.
- Duplicate executions: Recent list prioritizes latest instance.
- Long queries: Handles without performance degradation (memoize fuzzy for >100 commands).

#### Test Coverage (from commandPalette.test.js)
- Happy paths: Fuzzy ranking (e.g., 'op fi' prioritizes 'Open File'), recent ordering after executions (lines 21-29).
- Error cases: Duplicate register throws, invalid action execute fails (lines 30+).
- Edge cases: Empty/no-match queries return 0, duplicates in recent (lines 30+).
- Assertions: Assert on length/ID/ranking with FAIL messages; ~70% coverage for registry/fuzzy.

| Feature | Example | Expected Behavior | Test Line |
|---------|---------|-------------------|-----------|
| Registration | { id: 'file.new', title: 'New File', action: () => {} } | Adds to list | Existing samples (lines 6-11) |
| Fuzzy Search | fuzzyMatch('op fi', list, title+category) | Top: 'file.open' | 21-24 |
| Duplicate Register | register same ID again | Throws duplicate error | New test |
| Invalid Action | action: 'string' | Execute throws function error | New test |

This component ensures fast, error-resilient command access with extensible design.

- 3.3. Embeddings Registry
  - Handling of text embeddings for code intelligence
  - Metadata support (single/long texts, empty/non-string/null inputs)
  - Test scenarios for robustness

- 3.4. Testing Framework
  - Test suite structure across files
  - Unit/integration tests for happy paths, errors, and edges
  - Assertions, console logging for readability, and fixes

## 4. User Flow and Intuitiveness

The design prioritizes intuitive, keyboard-centric workflows to minimize mouse dependency, providing visual feedback and graceful error handling for a seamless developer experience. Key UX principles include discoverability, efficiency, and resilience.

#### Key Workflows
1. **Command Palette Invocation**:
   - User presses Ctrl+P (or Cmd+P on Mac) to open the palette.
   - Type query (e.g., "open file"); fuzzy matching filters and ranks commands.
   - Select with arrow keys/Enter; action executes (e.g., file.open opens dialog).
   - Recent commands appear at top for quick repeat.

2. **File Navigation**:
   - Use file explorer sidebar or command "file.open" to browse directories.
   - Click or Ctrl+Click to open files; right-click for context menu (rename, delete).
   - Search files via palette ("file.search"); listDir returns contents for tree view.
   - Handle errors with toast notifications (e.g., "File not found").

3. **AI Embeddings for Autocompletion**:
   - While editing code, trigger autocompletion (Ctrl+Space); text snippet sent to embeddings registry.
   - Batch embed with metadata {purpose: 'code'}; vectors used for similarity search in registry.
   - Display suggestions in dropdown; select to insert; fallback to basic if provider error.

#### Visual Flow Diagram
```text
User Input (Keyboard/Mouse)
         |
         v
UI Layer (Command Palette / File Explorer)
         |
         v
Backend Services (Validate Input, Async Call)
         | Error? -> Toast Message (e.g., "Invalid Path")
         v
Data Registries (Execute Action, Log Telemetry)
         |
         v
Feedback (Visual Success/Error, Recent Update)
```

#### UX Principles
- **Keyboard Shortcuts**: Global (Ctrl+P for palette), contextual (Ctrl+S save); customizable via settings.
- **Visual Feedback**: Loading spinners for async ops (e.g., embedding batch), green/red toasts for success/failure.
- **Error Messages**: User-friendly (e.g., "Permission denied - check file access" instead of raw error); non-blocking.
- **Discoverability**: Onboarding tour for new users, help command in palette ("show.help").
- **Efficiency**: Fuzzy search with scoring, recent prioritization; batch ops to reduce latency.

These flows ensure low cognitive load, with errors handled gracefully to maintain flow.

- 5. Extensibility and Best Practices
- Scalability (plugin system via registries)
- Security (path validation)
- Performance (async handling)
- TODO integration (completed tasks, ongoing improvements)

## 6. Implementation Notes

This section offers practical guidance for implementation, including pseudocode for key functions, a dependency graph, and recommended tools to build and maintain Primus-IDE efficiently.

#### Pseudocode Snippets for Critical Functions
- **embedBatch (Embeddings Registry)**:  
  ```
async embedBatch({ texts, metadata }) {
    validateInputs(texts, metadata); // Throw if non-string or empty invalid
    const provider = getActiveProvider();
    const vectors = await provider.generateVectors(texts, metadata || {});
    const dimensions = provider.info.dimensions;
    normalizeVectors(vectors); // Ensure unit magnitude
    logTelemetry({ totalItems: texts.length, dimensions });
    return { vectors, dimensions };
  }
  ```
  - Validates inputs (e.g., texts.filter(t => typeof t === 'string')), handles async generation, normalizes for consistency.

- **registerCommand (Command Palette)**:  
  ```
 registerCommand(command) {
    if (registry.has(command.id)) throw new Error('Duplicate ID');
    if (typeof command.action !== 'function') throw new Error('Action must be function');
    registry.set(command.id, { ...command, recentScore: 0 });
    updateRecentList(command.id);
  }
  ```
  - Checks duplicates and type, adds to registry, updates recent for prioritization.

- **createDirectory (File Operations)**:  
  ```
async createDirectory(path) {
    validatePath(path); // Throw if invalid chars or absolute outside workspace
    if (exists(path)) return false; // Already exists
    await fs.mkdir(path, { recursive: true });
    logTelemetry({ operation: 'createDir', path });
    return true;
  }
  ```
  - Validates path security (e.g., no ../ escapes), creates recursively, logs for telemetry.

#### Dependency Graph
```text
UI Layer
  | 
  v
Backend Services <--- Data Registries
  |                 |
  v                 v
Integration Points (Async Calls, Error Handling)
  |
  v
External (VSCode API, FS, AI Providers)
```

- UI depends on Backend for actions; Backend uses Registries for data; Integration handles cross-cutting concerns like errors.

#### Tool Recommendations
- **Testing**: Jest for unified runner and coverage reports (npm i -D jest); convert console.assert to expect() for % metrics.
- **Linting/Formatting**: ESLint + Prettier for code quality (npm i -D eslint prettier); config for no-console in prod.
- **Building**: Webpack for bundling TS/JS; ts-loader for TypeScript compilation (npm run build:main).
- **Debugging**: VSCode Debugger with breakpoints; Node --inspect for runtime.
- **CI/CD**: GitHub Actions for lint/test on PRs; add .github/workflows/test.yml.
- **Docs**: JSDoc for API comments; generate with jsdoc tool.

These notes align with project evolution, e.g., from 30% to 60% test coverage through modular additions.
