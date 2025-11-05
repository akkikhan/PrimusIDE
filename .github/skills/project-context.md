# Primus IDE - Project Context

## Overview

**Primus IDE** is a professional desktop code editor built on Electron, React, and TypeScript. It aims to combine the power of modern web technologies with native desktop capabilities to create a flexible, extensible development environment.

## Current Status

- **Completion:** ~70% (150/750 tasks complete)
- **Current Phase:** LSP Integration & Core Feature Completion
- **Target Beta:** January 2026
- **Branch:** ide-clone (active development)

## Project Identity

- **Name:** Primus IDE
- **Tagline:** "Spec-driven development meets AI-powered coding"
- **Unique Value:** Automated spec-to-task pipeline with built-in AI assistance
- **Target Users:** Professional developers who value automation and extensibility

## Key Differentiators

1. **Spec-Kit Workflow:** Specs → Plans → Tasks (fully automated)
2. **750-Task System:** Granular task tracking with auto-generated user stories
3. **AI Integration:** Multi-provider AI chat with context-aware assistance
4. **Hybrid Architecture:** Best of VS Code/Theia via adapter pattern

## Tech Stack

### Core Technologies
- **Electron:** 38.1.2 (desktop framework)
- **React:** 18.2.0 (UI library)
- **TypeScript:** 5.9.2 (type safety)
- **Node.js:** 22.21.0 (runtime)
- **Monaco Editor:** 0.53.0 (code editor)

### Key Libraries
- **xterm.js:** Terminal emulation
- **chokidar:** File watching
- **webpack:** Module bundling
- **jest:** Testing framework

### Build Tools
- **electron-builder:** Packaging
- **TypeScript compiler:** Transpilation
- **Webpack dev server:** Hot module reload

## Architecture Principles

### 1. Three-Zone Security Model
- **Main Process:** System access, IPC coordination
- **Preload Script:** Secure API bridge
- **Renderer Process:** React UI (sandboxed)

### 2. Type-Safe Communication
- All IPC channels typed in `src/shared/`
- No direct Node.js access from renderer
- Preload exposes controlled `window.primus.*` API

### 3. Separation of Concerns
- UI logic in renderer components
- Business logic in main process
- Shared types/contracts in `src/shared/`

### 4. Spec-Driven Development
- Requirements start as Markdown specs
- Specs generate JSON plans
- Plans explode into atomic tasks
- Code references task IDs

## Repository Structure

```
src/
├── main/              # Electron main process
│   ├── ai/           # AI provider system
│   ├── ipc/          # IPC handlers
│   └── services/     # Core services
├── preload/          # Secure bridge
├── renderer/         # React UI
│   ├── components/  # UI components
│   ├── hooks/       # Custom hooks
│   └── contexts/    # React contexts
└── shared/           # Shared types

scripts/              # Automation tooling
├── automation/      # Task management (34 scripts)
└── spec-kit/        # Spec workflow tools

specs/               # Feature specifications
plans/               # Generated plans
tasks/               # Individual task JSONs

ALL_TASKS.md         # Master task list (750 items)
tasks_all.json       # Machine-readable task DB
trace_map.json       # Task-to-code mapping
```

## Key Files

### Documentation
- `README.md` - User-facing documentation
- `PROJECT_COMPLETION_PLAN.md` - 12-week roadmap
- `IMPLEMENTATION_GUIDE.md` - Implementation recipes
- `TASK_CHECKLIST.md` - Day-by-day breakdown
- `.github/copilot-instructions.md` - AI agent guidance

### Configuration
- `package.json` - Dependencies & scripts (60+)
- `electron-builder.yml` - Packaging config
- `tsconfig.*.json` - TypeScript configs (5 files)
- `webpack.*.js` - Build configurations
- `ai.policy.json` - AI system policy

### Task System
- `ALL_TASKS.md` - Human-readable task list
- `tasks_all.json` - Enriched task metadata
- `tasks_index.json` - Quick lookup index
- `trace_map.json` - Code traceability

## Development Workflow

### Daily Development
```bash
# 1. Start dev environment
npm run dev                    # Launch watchers

# 2. Select next task
npm run task:next              # Get prioritized task

# 3. Start working
npm run task:start -- <id>     # Mark in-progress

# 4. Implement feature
# (Add // TASK:<id> comments in code)

# 5. Complete task
npm run task:complete -- <id>  # Update status

# 6. Update traceability
npm run tasks:pipeline         # Regenerate trace map
```

### Spec-Driven Features
```bash
# 1. Write specification
# Create specs/<feature>.spec.md

# 2. Generate plan
npm run spec:plan              # Create plan JSON

# 3. Generate tasks
npm run spec:tasks             # Explode into tasks

# 4. Implement normally
# (Follow task workflow above)
```

## Core Features (Implemented)

✅ **File Explorer:** Tree view with file operations  
✅ **Monaco Editor:** Syntax highlighting, basic editing  
✅ **Terminal Integration:** xterm.js with PTY  
✅ **Tab Management:** Multiple editor tabs  
✅ **Command Palette:** Quick command access  
✅ **Settings System:** Persistent configuration  
✅ **Theme Support:** Light/dark themes  
✅ **AI Chat Panel:** Multi-provider AI assistance  
✅ **Search Panel:** File/content search  
✅ **Problems Panel:** Error/warning display  

## Core Features (In Progress)

🔄 **LSP Integration:** Language server protocol support  
🔄 **Advanced Git:** Full Git operations  
🔄 **Debugging:** Integrated debugger  
🔄 **Extensions:** Plugin system  
🔄 **Advanced Search:** RegEx, multi-file replace  
🔄 **Key Bindings:** Customizable shortcuts  

## Quality Metrics

### Code Quality
- TypeScript strict mode enabled
- ESLint + Prettier configured
- IPC channels centralized
- No direct Node.js in renderer

### Task Metrics
- 750 total tasks defined
- 150 tasks completed (~20%)
- 600 tasks remaining (~80%)
- Average complexity: 3.2/5

### Performance Targets
- App launch: <2s (cold start)
- File open: <100ms (small files)
- Search: <500ms (10K files)
- Memory: <200MB (idle)

## Integration Points

### Monaco Editor
- Language detection via file extension
- Syntax highlighting (30+ languages)
- Basic IntelliSense (pending LSP)
- Diagnostic markers (errors/warnings)

### Terminal
- PTY spawning in main process
- xterm.js rendering in renderer
- Shell detection (bash/zsh/powershell)
- Command history support

### AI System
- Provider registry (OpenAI, local, mock)
- Context gathering (selection, diagnostics, file)
- Streaming responses
- Cost estimation

### File System
- Chokidar watchers for live updates
- Debounced events (300ms)
- Ignore patterns (.git, node_modules)
- Binary file detection

## Dependencies & Constraints

### External Dependencies
- Must maintain Electron LTS compatibility
- Monaco updates require careful testing
- AI providers need API keys
- LSP libraries from VS Code (cloned/adapted)

### Internal Constraints
- Preload must use CommonJS output
- Renderer must not import Node modules
- IPC payloads must be JSON-serializable
- Settings schema must remain backward-compatible

## Team & Workflow

### Development Approach
- Solo project (AI-assisted)
- Git workflow: feature branches → ide-clone → main
- Commit format: `TASK-<id>: <description>`
- Daily standup: Review task:next output

### Communication
- Task comments in `tasks/*.task.json`
- Code comments: `// TASK:<id> - <description>`
- Spec updates trigger plan regeneration
- Trace map auto-updates show progress

## Success Criteria

### Beta Release (Jan 2026)
- 85-90% feature completeness (640/750 tasks)
- LSP working for TypeScript/JavaScript
- Stable plugin system
- 10+ test users providing feedback

### 1.0 Release (Mar 2026)
- 95%+ feature completeness (710/750 tasks)
- LSP for 5+ languages
- Marketplace for extensions
- 100+ daily active users

## Risk Factors

### Technical Risks
- LSP integration complexity (mitigated: adapter pattern)
- Monaco performance with large files (mitigated: lazy loading)
- Electron security vulnerabilities (mitigated: strict CSP)
- Extension API stability (mitigated: versioned contracts)

### Project Risks
- Task estimation accuracy (mitigated: historical data)
- Scope creep (mitigated: strict spec workflow)
- Single-developer bandwidth (mitigated: AI assistance)
- Market competition (mitigated: unique spec-kit angle)

## Next Steps

1. **Phase 1 (Weeks 1-4):** Complete LSP foundation
2. **Phase 2 (Weeks 5-8):** Extensions, advanced editor
3. **Phase 3 (Weeks 9-12):** Polish, testing, beta release

**Current Focus:** TypeScript LSP adapter implementation (Task #637-645)

---

*Last Updated: November 4, 2025*  
*Document Version: 1.0*  
*Status: Living document - update as project evolves*
