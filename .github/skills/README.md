# Primus IDE - Skills Directory

This directory contains comprehensive context and guidance for AI coding agents and developers working on Primus IDE.

---

## 📁 Files Overview

### Core Context Files

#### [project-context.md](./project-context.md)
**What:** High-level project overview and current status  
**When to read:** First time working on the project, quarterly reviews  
**Key sections:**
- Project identity and unique value propositions
- Tech stack and dependencies
- Repository structure
- Current completion status (70%, 150/750 tasks)
- Development workflow examples
- Quality metrics and success criteria

#### [roadmap.md](./roadmap.md)
**What:** 12-week plan from 70% to beta release  
**When to read:** Sprint planning, milestone tracking, priority decisions  
**Key sections:**
- Phase-by-phase breakdown (LSP → Extensions → Polish)
- Weekly milestones with specific task IDs
- Feature roadmap by category
- Risk mitigation strategies
- Success metrics and quality gates
- Beyond 1.0 vision

#### [architecture.md](./architecture.md)
**What:** Deep technical architecture and design patterns  
**When to read:** Before implementing features, debugging complex issues  
**Key sections:**
- Three-zone Electron model (Main/Preload/Renderer)
- IPC communication patterns with code examples
- Service layer and adapter patterns
- Data flow examples (file open, LSP, AI chat)
- Performance optimizations
- Security architecture and threat model
- Build system and deployment

#### [../copilot-instructions.md](../copilot-instructions.md)
**What:** AI coding agent instructions (primary guidance)  
**When to read:** Every time before making code changes  
**Key sections:**
- Architecture & execution zones
- Core conventions (TypeScript, IPC, modules)
- Task & spec-driven workflow (critical!)
- Build & dev workflows
- LSP integration approach
- AI system architecture
- Implementation checklists
- Project-specific gotchas

### God-Level Expertise Files

#### [electron-expertise.md](./electron-expertise.md)
**What:** Deep Electron mastery - process model, IPC, security  
**When to read:** Working on main process, preload, IPC, or window management  
**Key sections:**
- Complete process lifecycle management
- Advanced BrowserWindow configuration
- Preload script security patterns
- IPC communication patterns (request/response, streaming, events)
- Performance optimization (worker threads, caching, memory)
- Security best practices (input validation, CSP, secure protocols)
- Custom protocols and native modules
**Expertise Level:** God-Tier (production-grade implementations)

#### [react-typescript-mastery.md](./react-typescript-mastery.md)
**What:** Advanced React patterns and TypeScript techniques  
**When to read:** Building renderer components, hooks, or performance optimization  
**Key sections:**
- Compound component pattern
- Render props and HOCs
- Custom hooks mastery (useFileOperations, useMonacoEditor, useDebounce)
- Performance optimization (memoization, code splitting, virtual scrolling)
- Advanced TypeScript patterns (discriminated unions, generics with constraints)
**Expertise Level:** God-Tier (scalable component architecture)

#### [monaco-editor-mastery.md](./monaco-editor-mastery.md)
**What:** Complete Monaco Editor integration and customization  
**When to read:** Working on editor features, language support, or editor behavior  
**Key sections:**
- Production-grade editor setup and configuration
- Advanced model management and lifecycle
- Custom language registration (syntax highlighting, completion)
- Decorations and markers (search highlights, diagnostics, inlay hints)
- Code lens providers
- Diff editor integration
- Custom commands and actions
- Performance monitoring
**Expertise Level:** God-Tier (full Monaco API mastery)

#### [lsp-integration-mastery.md](./lsp-integration-mastery.md)
**What:** Language Server Protocol deep implementation  
**When to read:** Implementing LSP features, language intelligence, or code actions  
**Key sections:**
- Complete LSP architecture (service, adapters, IPC)
- TypeScript LSP adapter (full implementation with VS Code integration)
- All LSP operations (definition, hover, completion, symbols, references, rename)
- Diagnostics system (real-time error detection)
- Position/offset conversion utilities
- Performance optimization (caching, incremental parsing)
**Expertise Level:** God-Tier (production LSP implementation)

#### [task-automation-mastery.md](./task-automation-mastery.md)
**What:** Complete task management and automation system  
**When to read:** Managing tasks, creating automation scripts, or tracking progress  
**Key sections:**
- Complete task schema and data model
- Task generation from ALL_TASKS.md
- Priority algorithm and next task selection
- Task lifecycle management (start, complete, reset)
- Code traceability (trace map generation)
- Full automation pipeline
- 750-task system architecture
**Expertise Level:** God-Tier (sophisticated automation beyond typical projects)

#### [spec-kit-mastery.md](./spec-kit-mastery.md)
**What:** Spec-driven development workflow and tooling  
**When to read:** Writing specifications, generating plans/tasks, or spec workflow  
**Key sections:**
- Complete spec file format with frontmatter
- Requirements and goals extraction
- Acceptance criteria patterns
- Plan generation from specs
- Task explosion from plans
- Full spec-to-code workflow
- Example production spec (LSP Integration)
**Expertise Level:** God-Tier (unique to Primus IDE, core differentiator)

---

## 🚀 Quick Start for AI Agents

### 1. First-Time Context Loading (Core Files)
Read in this order:
1. **copilot-instructions.md** (30 min) - Core conventions and workflows
2. **project-context.md** (15 min) - Current status and tech stack
3. **roadmap.md** (20 min) - Strategic priorities and milestones
4. **architecture.md** (30 min) - Deep technical details

**Total time investment:** ~90 minutes  
**Result:** Comprehensive understanding of Primus IDE

### 2. God-Level Expertise Loading (On-Demand)
Load these when working on specific areas:
- **Electron work?** → `electron-expertise.md` (45 min)
- **React components?** → `react-typescript-mastery.md` (40 min)
- **Monaco editor?** → `monaco-editor-mastery.md` (50 min)
- **LSP features?** → `lsp-integration-mastery.md` (60 min)
- **Task system?** → `task-automation-mastery.md` (30 min)
- **Spec workflow?** → `spec-kit-mastery.md` (35 min)

**Total expertise files:** 6 files, ~260 minutes (4+ hours)  
**Result:** God-tier mastery of Primus IDE implementation details

### 2. Daily Development Context
Before each task:
1. Run `npm run task:next` to get prioritized task
2. Check task details in `tasks/<id>.task.json`
3. Reference **copilot-instructions.md** sections 3-7 for workflow
4. Scan **architecture.md** for relevant patterns

### 3. Feature Implementation Flow
```bash
# 1. Find or create task
npm run task:next              # Or search ALL_TASKS.md

# 2. Start task
npm run task:start -- <id>

# 3. Review context
# - Read copilot-instructions.md section 7 (implementation checklist)
# - Check architecture.md for design patterns
# - Review similar code in codebase

# 4. Implement with task reference
# Add comment: // TASK:<id> - <description>

# 5. Test changes
npm run dev                    # Start dev environment
npm test                       # Run tests

# 6. Complete task
npm run task:complete -- <id>
npm run tasks:pipeline         # Update trace map
```

---

## 📊 Document Relationships

```
copilot-instructions.md (ALWAYS READ FIRST)
    ↓
    ├─→ project-context.md (Current status, overview)
    │       ↓
    │       └─→ roadmap.md (Strategic planning)
    │
    └─→ architecture.md (Technical deep-dive)
            ↓
            └─→ IMPLEMENTATION_GUIDE.md (Code recipes)
```

**Golden Rule:** Always start with `copilot-instructions.md` - it's the source of truth for development conventions.

---

## 🎯 Use Case Matrix

### Core Workflow Scenarios

| Scenario | Primary Doc | Secondary Docs | Expertise Files |
|----------|-------------|----------------|-----------------|
| **New AI agent onboarding** | copilot-instructions.md | project-context.md | - |
| **Sprint planning** | roadmap.md | project-context.md | - |
| **Feature implementation** | copilot-instructions.md (§7) | architecture.md | (relevant expertise file) |
| **Task workflow questions** | copilot-instructions.md (§3) | roadmap.md | task-automation-mastery.md |
| **Build/deployment issues** | copilot-instructions.md (§4) | architecture.md (Build System) | - |

### Technical Implementation Scenarios

| Scenario | Primary Doc | Expertise File | Additional Context |
|----------|-------------|----------------|-------------------|
| **Electron main process work** | copilot-instructions.md (§1) | **electron-expertise.md** | architecture.md (§2) |
| **IPC/Preload changes** | copilot-instructions.md (§2,6) | **electron-expertise.md** (IPC Patterns) | - |
| **React component development** | copilot-instructions.md (§7) | **react-typescript-mastery.md** | - |
| **Monaco editor features** | copilot-instructions.md (§2) | **monaco-editor-mastery.md** | - |
| **LSP integration work** | copilot-instructions.md (§5) | **lsp-integration-mastery.md** | IMPLEMENTATION_GUIDE.md |
| **Task automation scripts** | copilot-instructions.md (§3) | **task-automation-mastery.md** | - |
| **Spec-driven development** | copilot-instructions.md (§3) | **spec-kit-mastery.md** | - |
| **Performance optimization** | copilot-instructions.md (§8) | **electron-expertise.md** + **react-typescript-mastery.md** | architecture.md (§10) |
| **Security review** | copilot-instructions.md (§8) | **electron-expertise.md** (Security) | architecture.md (§11) |

---

## 🔍 Cross-Reference Guide

### By Topic

**Architecture & Design:**
- Main/Preload/Renderer split: `copilot-instructions.md §1`, `architecture.md §2`
- IPC patterns: `copilot-instructions.md §2,6`, `architecture.md §4`
- Service layer: `architecture.md §6 (patterns)`

**Development Workflow:**
- Task system: `copilot-instructions.md §3`, `project-context.md §6`
- Spec-Kit: `copilot-instructions.md §3`, `roadmap.md §3`
- Build commands: `copilot-instructions.md §4`, `architecture.md §12`

**Features:**
- LSP integration: `copilot-instructions.md §5`, `roadmap.md (Phase 1)`
- AI system: `copilot-instructions.md §6`, `architecture.md §5 (data flow)`
- Extensions: `roadmap.md (Phase 2)`, `project-context.md (In Progress)`

**Quality & Best Practices:**
- Performance: `copilot-instructions.md §8`, `architecture.md §10`
- Security: `copilot-instructions.md §8`, `architecture.md §11`
- Testing: `architecture.md §12`, `project-context.md (Quality Metrics)`

**Project Planning:**
- Milestones: `roadmap.md §5`, `project-context.md (Status)`
- Risk management: `roadmap.md §9`
- Success criteria: `project-context.md §8`, `roadmap.md §7`

---

## 🧠 Context Management Tips

### For AI Agents with Token Limits

**Minimal Context (Quick Tasks):**
- Load: `copilot-instructions.md` sections 1-3, 7
- ~3K tokens, covers 80% of daily work

**Standard Context (Feature Work):**
- Load: Full `copilot-instructions.md` + `architecture.md` relevant sections
- ~10K tokens, covers 95% of development

**Full Context (Architecture Changes):**
- Load: All 4 files
- ~25K tokens, complete project understanding

**Pro Tip:** Use document section references (e.g., "copilot-instructions.md §7") to reload specific context just-in-time instead of loading everything upfront.

### For Human Developers

**Week 1:** Read all 4 docs cover-to-cover  
**Week 2+:** Reference as needed (see use case matrix)  
**Monthly:** Re-read `roadmap.md` and `project-context.md` to stay aligned  
**Quarterly:** Full refresh of all docs

---

## 📋 Document Maintenance

### Update Frequency

| Document | Frequency | Owner |
|----------|-----------|-------|
| `copilot-instructions.md` | As conventions change | Lead Dev |
| `project-context.md` | Monthly | Project Manager |
| `roadmap.md` | Weekly (milestones) | Product Owner |
| `architecture.md` | As architecture evolves | Lead Architect |

### Update Triggers

**copilot-instructions.md:**
- New conventions established
- Breaking changes to workflows
- Major refactors
- New critical patterns

**project-context.md:**
- Completion % changes significantly
- New major features implemented
- Tech stack updates
- Status changes

**roadmap.md:**
- Milestone completion
- Priority shifts
- Scope changes
- Risk updates

**architecture.md:**
- New architecture patterns
- Security model changes
- Performance optimizations
- Build system changes

---

## 🔗 Related Documentation

### In Project Root
- `README.md` - User-facing documentation
- `PROJECT_COMPLETION_PLAN.md` - Detailed 12-week plan
- `IMPLEMENTATION_GUIDE.md` - Code recipes and examples
- `TASK_CHECKLIST.md` - Day-by-day task breakdown

### In Repository
- `ALL_TASKS.md` - Master task list (750 items)
- `tasks_all.json` - Machine-readable task database
- `specs/*.spec.md` - Feature specifications

### External
- [Electron Docs](https://www.electronjs.org/docs)
- [Monaco Editor API](https://microsoft.github.io/monaco-editor/api/index.html)
- [VS Code Extension API](https://code.visualstudio.com/api) (for LSP reference)

---

## ❓ FAQ

**Q: Which document should AI agents load first?**  
A: Always `copilot-instructions.md` - it's the source of truth for development conventions and workflows.

**Q: What if these docs conflict with README.md?**  
A: Skills directory takes precedence for development; README.md is user-facing documentation.

**Q: How often should AI context be refreshed?**  
A: Daily for active tasks. Re-load full context weekly or when switching focus areas.

**Q: What's the difference between copilot-instructions.md and architecture.md?**  
A: **copilot-instructions:** Development conventions and workflows (HOW to work)  
**architecture.md:** Technical design and patterns (WHAT the system is)

**Q: Where do I find specific task details?**  
A: Task IDs referenced here are in `tasks/<id>.task.json` or `ALL_TASKS.md`.

**Q: How do I know if docs are up-to-date?**  
A: Check "Last Updated" timestamp at bottom of each file.

---

## 🎓 Learning Path

### Beginner (New to Primus IDE)
**Week 1:**
1. Read `project-context.md` (understand what we're building)
2. Read `copilot-instructions.md` sections 1-4 (learn conventions)
3. Run `npm run dev` and explore the app
4. Pick a small task from `npm run task:next --priority=low`

**Week 2:**
1. Read `architecture.md` sections 1-4 (understand structure)
2. Implement 3-5 small tasks
3. Review `roadmap.md` to understand priorities

### Intermediate (Familiar with codebase)
**Daily:**
- Check `npm run task:next` for prioritized work
- Reference `copilot-instructions.md §7` before implementing
- Use `architecture.md` for design pattern lookup

**Weekly:**
- Review `roadmap.md` for milestone progress
- Update task status via `npm run task:complete`

### Advanced (Core contributor)
**Responsibilities:**
- Maintain these docs (update as project evolves)
- Guide others using these docs
- Propose architectural improvements
- Lead by example (reference tasks, add comments)

---

**Last Updated:** November 4, 2025  
**Document Version:** 1.0  
**Maintained by:** Primus IDE Development Team

**Questions or improvements?** Update these docs directly or open an issue.
