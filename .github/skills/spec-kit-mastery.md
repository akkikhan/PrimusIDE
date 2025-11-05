# Spec-Kit Workflow - God-Level Expertise

## Complete Spec-Driven Development System

### Spec File Format and Frontmatter

```markdown
---
id: feature-lsp-integration
name: LSP Integration for TypeScript
version: 1.0.0
status: in-progress
priority: P0
type: feature
created: 2025-11-01
updated: 2025-11-04
author: Primus IDE Team
category: code-intelligence
dependencies:
  - core-platform
  - editor-tabs
tags:
  - lsp
  - typescript
  - language-server
  - code-intelligence
---

## Overview

Integrate Language Server Protocol (LSP) support for TypeScript to provide intelligent code completion, go-to-definition, hover information, and real-time diagnostics.

## Goals

1. **Code Intelligence:** Provide IntelliSense-like features for TypeScript files
2. **Real-time Feedback:** Show errors and warnings as user types
3. **Navigation:** Enable go-to-definition, find references, and symbol search
4. **Performance:** Maintain <100ms response time for most operations

## Requirements

### Functional Requirements

**REQ-1:** LSP Adapter Architecture
- Create `ILSPAdapter` interface for language-agnostic LSP operations
- Implement `TypeScriptLSPAdapter` wrapping VS Code TypeScript services
- Support dynamic adapter registration for multiple languages

**REQ-2:** Core LSP Features
- Go to definition (Ctrl+Click)
- Hover tooltips with type information
- Code completion with suggestions
- Signature help (parameter hints)
- Document and workspace symbols
- Find all references
- Rename symbol

**REQ-3:** Diagnostics System
- Real-time syntax and semantic error detection
- Warning and info messages
- Error highlighting in editor
- Problems panel integration

**REQ-4:** Performance Requirements
- Initialize language server within 2 seconds
- Complete autocomplete requests within 100ms
- Handle large files (>10,000 lines) efficiently
- Support incremental parsing for real-time feedback

### Non-Functional Requirements

**NFR-1:** Extensibility
- Easy to add new language adapters
- Plugin system for custom LSP features
- Configurable LSP options per language

**NFR-2:** Reliability
- Graceful degradation if LSP fails
- Automatic retry on connection loss
- Isolated LSP process (crash doesn't affect editor)

**NFR-3:** User Experience
- Seamless integration with Monaco Editor
- Consistent UI for all LSP features
- Configurable keyboard shortcuts

## Architecture

### Component Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Monaco Editor                         │
│  (Renderer - React Component)                           │
└────────────────┬────────────────────────────────────────┘
                 │ IPC: lsp:*
                 │
┌────────────────▼────────────────────────────────────────┐
│              LSP IPC Handlers                           │
│           (Main Process - IPC Bridge)                   │
└────────────────┬────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────┐
│               LSP Service                               │
│     (Manages multiple language adapters)                │
└─────┬──────────────────────────────────────────────┬────┘
      │                                              │
┌─────▼────────────────┐               ┌─────────────▼────┐
│ TypeScriptLSPAdapter │               │ Other Adapters   │
│  (ILSPAdapter impl)  │               │  (Python, Go...) │
└──────────┬───────────┘               └──────────────────┘
           │
┌──────────▼───────────┐
│  VS Code TS Server   │
│  (Vendored Code)     │
└──────────────────────┘
```

### Data Flow

1. **Initialization:**
   - User opens workspace → Main process initializes LSPService
   - LSPService initializes all registered adapters
   - Adapters start language servers (e.g., TypeScript server)

2. **Operation Request:**
   - User triggers action (Ctrl+Click) → Monaco captures event
   - Monaco sends IPC request → `lsp:goToDefinition`
   - Main receives IPC → LSPService routes to appropriate adapter
   - Adapter queries language server → Returns result
   - Result sent back via IPC → Monaco displays result

3. **Diagnostics (Push Model):**
   - Language server detects errors → Pushes to adapter
   - Adapter emits diagnostics event → LSPService forwards to renderer
   - Renderer receives diagnostics → Updates Monaco markers
   - Problems panel refreshes automatically

## Implementation Plan

### Phase 1: Foundation (Week 1)

**Tasks:**
- [ ] Define `ILSPAdapter` interface in `src/shared/adapters/`
- [ ] Create `LSPService` singleton in `src/main/services/`
- [ ] Setup IPC handlers in `src/main/ipc/lspHandlers.ts`
- [ ] Expose preload API: `window.primus.lsp.*`
- [ ] Add LSP types to `src/shared/lspTypes.ts`

**Deliverable:** LSP infrastructure ready for adapter implementation

### Phase 2: TypeScript Adapter (Week 2)

**Tasks:**
- [ ] Clone VS Code TypeScript services to `src/vendors/typescript/`
- [ ] Implement `TypeScriptLSPAdapter` in `src/adapters/`
- [ ] Wire up go-to-definition operation
- [ ] Test with sample TypeScript file

**Deliverable:** Basic go-to-definition working for TypeScript

### Phase 3: Core Features (Week 3)

**Tasks:**
- [ ] Implement hover provider
- [ ] Implement completion provider
- [ ] Implement signature help
- [ ] Implement document symbols
- [ ] Register all providers with Monaco

**Deliverable:** Full IntelliSense experience for TypeScript

### Phase 4: Diagnostics (Week 4)

**Tasks:**
- [ ] Implement diagnostics push model
- [ ] Integrate with Monaco markers API
- [ ] Update Problems panel to show LSP diagnostics
- [ ] Add real-time error highlighting

**Deliverable:** Real-time error detection and display

### Phase 5: Advanced Features (Week 5)

**Tasks:**
- [ ] Implement find references
- [ ] Implement rename symbol
- [ ] Implement workspace symbols
- [ ] Add code actions (quick fixes)

**Deliverable:** Complete TypeScript LSP integration

### Phase 6: Multi-Language Support (Week 6)

**Tasks:**
- [ ] Implement JavaScript adapter (reuse TypeScript adapter)
- [ ] Implement JSON language server adapter
- [ ] Test with multiple file types
- [ ] Document adapter API for future languages

**Deliverable:** LSP working for TypeScript, JavaScript, and JSON

## Acceptance Criteria

### AC-1: Go to Definition
- GIVEN a TypeScript file with function calls
- WHEN user Ctrl+Clicks on function name
- THEN editor jumps to function definition
- AND cursor is positioned at the function declaration

### AC-2: Hover Information
- GIVEN a TypeScript variable with type annotation
- WHEN user hovers over variable name
- THEN tooltip shows variable type and documentation
- AND tooltip appears within 200ms

### AC-3: Code Completion
- GIVEN user typing code in TypeScript file
- WHEN user types `.` after object
- THEN completion list appears with object methods
- AND list is filtered as user continues typing

### AC-4: Real-time Diagnostics
- GIVEN a TypeScript file with syntax error
- WHEN user saves file (or after 500ms delay)
- THEN error is highlighted with red squiggle
- AND error appears in Problems panel

### AC-5: Find References
- GIVEN a function used in multiple files
- WHEN user right-clicks function and selects "Find References"
- THEN all references are listed
- AND clicking reference jumps to that location

### AC-6: Rename Symbol
- GIVEN a variable used in multiple places
- WHEN user triggers rename (F2) and types new name
- THEN all occurrences are renamed simultaneously
- AND changes are applied correctly

### AC-7: Performance
- GIVEN a workspace with 1000+ TypeScript files
- WHEN LSP initializes
- THEN initialization completes within 5 seconds
- AND subsequent operations respond within 100ms

### AC-8: Error Handling
- GIVEN language server crashes
- WHEN user continues editing
- THEN editor remains functional (graceful degradation)
- AND LSP automatically restarts after 5 seconds

## Testing Strategy

### Unit Tests
- Test each LSP adapter method independently
- Mock language server responses
- Verify IPC message formats
- Test error handling paths

### Integration Tests
- Test full request/response cycle (renderer → main → adapter → server)
- Verify Monaco provider registration
- Test diagnostics push model
- Test with real TypeScript files

### Performance Tests
- Measure initialization time with large workspaces
- Measure response time for common operations
- Test memory usage over extended sessions
- Profile CPU usage during heavy LSP activity

### Manual Testing
- Test with various TypeScript projects
- Verify all keyboard shortcuts work
- Test edge cases (empty files, large files, syntax errors)
- Test user experience flow

## Dependencies

### External
- `typescript` package (TypeScript compiler API)
- VS Code TypeScript services (vendored)
- Monaco Editor (already integrated)

### Internal
- Core platform (workspace management)
- Editor tabs (file opening/closing)
- IPC system (communication layer)

## Risks and Mitigation

### Risk 1: VS Code Code Complexity
**Impact:** High  
**Probability:** Medium  
**Mitigation:** Use adapter pattern to isolate VS Code code. Create thin wrapper layer.

### Risk 2: Performance Issues
**Impact:** High  
**Probability:** Medium  
**Mitigation:** Implement caching, lazy loading, and incremental parsing. Profile early and often.

### Risk 3: Breaking Changes in TypeScript API
**Impact:** Medium  
**Probability:** Low  
**Mitigation:** Pin TypeScript version. Test thoroughly before upgrading.

### Risk 4: Multi-Language Complexity
**Impact:** Medium  
**Probability:** Low  
**Mitigation:** Start with TypeScript only. Add languages incrementally.

## Success Metrics

- **Developer Productivity:** 30% reduction in time to find definitions
- **Error Detection:** 90%+ of errors caught before runtime
- **Performance:** 95% of operations complete within 100ms
- **Reliability:** <1 crash per 100 hours of use

## Future Enhancements

### Phase 7 (Post-MVP)
- Python LSP adapter
- Go LSP adapter  
- Rust LSP adapter
- Language server configuration UI
- Custom LSP features via plugins

### Phase 8 (Advanced)
- Multi-language workspace support
- LSP debugging tools
- Performance profiling UI
- LSP extension marketplace

## References

- [LSP Specification](https://microsoft.github.io/language-server-protocol/)
- [TypeScript Compiler API](https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API)
- [VS Code TypeScript Services](https://github.com/microsoft/vscode/tree/main/extensions/typescript-language-features)
- [Monaco Editor API](https://microsoft.github.io/monaco-editor/api/index.html)

## Changelog

- **2025-11-01:** Initial spec created
- **2025-11-02:** Added architecture diagram
- **2025-11-03:** Refined acceptance criteria
- **2025-11-04:** Updated implementation plan

---

**Status:** In Progress (Phase 2)  
**Next Review:** 2025-11-11  
**Owner:** Primus IDE Team
```

### Spec Generation Script

```javascript
// scripts/spec-kit/generatePlan.cjs
const fs = require('fs/promises');
const path = require('path');
const yaml = require('yaml');

async function generatePlan(specPath) {
  console.log(`📋 Generating plan from ${specPath}...`);
  
  // Read spec file
  const specContent = await fs.readFile(specPath, 'utf-8');
  
  // Parse frontmatter
  const frontmatterMatch = specContent.match(/^---\n([\s\S]+?)\n---/);
  if (!frontmatterMatch) {
    throw new Error('No frontmatter found in spec');
  }
  
  const frontmatter = yaml.parse(frontmatterMatch[1]);
  
  // Extract requirements
  const requirements = extractRequirements(specContent);
  
  // Extract goals
  const goals = extractGoals(specContent);
  
  // Create plan
  const plan = {
    id: frontmatter.id,
    name: frontmatter.name,
    version: frontmatter.version,
    specFile: path.basename(specPath),
    createdAt: new Date().toISOString(),
    status: frontmatter.status || 'draft',
    
    goals: goals.map((goal, index) => ({
      id: `${frontmatter.id}-goal-${index + 1}`,
      title: goal,
      status: 'planned',
    })),
    
    requirements: requirements.map((req, index) => ({
      id: `${frontmatter.id}-req-${index + 1}`,
      title: req.title,
      description: req.description,
      type: req.type || 'functional',
      priority: req.priority || 'P1',
      status: 'planned',
    })),
    
    phases: extractPhases(specContent),
    dependencies: frontmatter.dependencies || [],
    risks: extractRisks(specContent),
  };
  
  // Save plan
  const planPath = path.join(__dirname, '../../plans', `${frontmatter.id}.plan.json`);
  await fs.mkdir(path.dirname(planPath), { recursive: true });
  await fs.writeFile(planPath, JSON.stringify(plan, null, 2));
  
  console.log(`✅ Plan saved to ${planPath}`);
  console.log(`  Goals: ${plan.goals.length}`);
  console.log(`  Requirements: ${plan.requirements.length}`);
  console.log(`  Phases: ${plan.phases.length}`);
  
  return plan;
}

function extractGoals(content) {
  const goalsMatch = content.match(/## Goals\s+([\s\S]+?)(?=\n##)/);
  if (!goalsMatch) return [];
  
  const goalsText = goalsMatch[1];
  const goals = [];
  
  const goalMatches = goalsText.matchAll(/^\d+\.\s+\*\*(.+?)\*\*:/gm);
  for (const match of goalMatches) {
    goals.push(match[1]);
  }
  
  return goals;
}

function extractRequirements(content) {
  const requirements = [];
  
  const reqMatches = content.matchAll(/\*\*REQ-(\d+):\*\*\s+(.+?)\n([\s\S]+?)(?=\n\*\*REQ-|$)/g);
  
  for (const match of reqMatches) {
    const [, id, title, description] = match;
    
    requirements.push({
      id: `REQ-${id}`,
      title: title.trim(),
      description: description.trim(),
      type: determinRequirementType(title),
      priority: determineRequirementPriority(title),
    });
  }
  
  return requirements;
}

function extractPhases(content) {
  const phases = [];
  
  const phaseMatches = content.matchAll(/### Phase (\d+):\s+(.+?)\s+\(Week\s+(\d+)\)/g);
  
  for (const match of phaseMatches) {
    const [, phaseNum, title, week] = match;
    
    phases.push({
      number: parseInt(phaseNum),
      title: title.trim(),
      week: parseInt(week),
      tasks: [],
    });
  }
  
  return phases;
}

function extractRisks(content) {
  const risks = [];
  
  const riskMatches = content.matchAll(/### Risk (\d+):\s+(.+?)\n\*\*Impact:\*\*\s+(\w+)\s+\n\*\*Probability:\*\*\s+(\w+)\s+\n\*\*Mitigation:\*\*\s+(.+?)(?=\n###|$)/gs);
  
  for (const match of riskMatches) {
    const [, id, title, impact, probability, mitigation] = match;
    
    risks.push({
      id: `RISK-${id}`,
      title: title.trim(),
      impact: impact.toLowerCase(),
      probability: probability.toLowerCase(),
      mitigation: mitigation.trim(),
    });
  }
  
  return risks;
}

function determineRequirementType(title) {
  const lowerTitle = title.toLowerCase();
  
  if (lowerTitle.includes('performance') || lowerTitle.includes('speed')) {
    return 'performance';
  }
  if (lowerTitle.includes('security') || lowerTitle.includes('authentication')) {
    return 'security';
  }
  if (lowerTitle.includes('ui') || lowerTitle.includes('user')) {
    return 'ui';
  }
  
  return 'functional';
}

function determineRequirementPriority(title) {
  const lowerTitle = title.toLowerCase();
  
  if (lowerTitle.includes('critical') || lowerTitle.includes('must')) {
    return 'P0';
  }
  if (lowerTitle.includes('important') || lowerTitle.includes('should')) {
    return 'P1';
  }
  if (lowerTitle.includes('nice') || lowerTitle.includes('could')) {
    return 'P2';
  }
  
  return 'P1';
}

// CLI
if (require.main === module) {
  const specPath = process.argv[2];
  
  if (!specPath) {
    console.error('Usage: node generatePlan.cjs <spec-file>');
    process.exit(1);
  }
  
  generatePlan(specPath).catch(console.error);
}

module.exports = { generatePlan };
```

### Task Explosion Script

```javascript
// scripts/spec-kit/generateTasks.cjs
const fs = require('fs/promises');
const path = require('path');

async function generateTasks(planPath) {
  console.log(`📝 Generating tasks from ${planPath}...`);
  
  const plan = JSON.parse(await fs.readFile(planPath, 'utf-8'));
  
  const tasks = [];
  let taskIdCounter = 1;
  
  // Generate tasks from goals
  for (const goal of plan.goals) {
    const task = {
      id: String(taskIdCounter++),
      title: `Implement: ${goal.title}`,
      description: `Complete goal: ${goal.title}`,
      category: plan.category || 'core-platform',
      status: 'TODO',
      lifecycleStatus: 'planned',
      priority: 'P1',
      priorityScore: 0,
      impactScore: 0,
      complexityScore: 3,
      dependencies: [],
      blockedBy: [],
      blocks: [],
      relatedTasks: [],
      specId: plan.id,
      planId: plan.id,
      goalId: goal.id,
      origin: 'spec',
      acceptanceCriteria: [],
      hasCodeRefs: false,
      codeLocations: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      statusHistory: [],
      contentHash: '',
    };
    
    tasks.push(task);
  }
  
  // Generate tasks from requirements
  for (const req of plan.requirements) {
    const task = {
      id: String(taskIdCounter++),
      title: req.title,
      description: req.description,
      category: plan.category || 'core-platform',
      status: 'TODO',
      lifecycleStatus: 'planned',
      priority: req.priority,
      priorityScore: 0,
      impactScore: 0,
      complexityScore: estimateComplexityFromDescription(req.description),
      dependencies: [],
      blockedBy: [],
      blocks: [],
      relatedTasks: [],
      specId: plan.id,
      planId: plan.id,
      requirementId: req.id,
      origin: 'spec',
      acceptanceCriteria: [],
      hasCodeRefs: false,
      codeLocations: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      statusHistory: [],
      contentHash: '',
    };
    
    tasks.push(task);
  }
  
  // Save individual task files
  for (const task of tasks) {
    const taskPath = path.join(__dirname, '../../tasks', `${task.id}.task.json`);
    await fs.mkdir(path.dirname(taskPath), { recursive: true });
    await fs.writeFile(taskPath, JSON.stringify(task, null, 2));
  }
  
  console.log(`✅ Generated ${tasks.length} tasks`);
  console.log(`  From goals: ${plan.goals.length}`);
  console.log(`  From requirements: ${plan.requirements.length}`);
  
  return tasks;
}

function estimateComplexityFromDescription(description) {
  const wordCount = description.split(/\s+/).length;
  
  if (wordCount > 100) return 5;
  if (wordCount > 50) return 4;
  if (wordCount > 20) return 3;
  if (wordCount > 10) return 2;
  return 1;
}

// CLI
if (require.main === module) {
  const planPath = process.argv[2];
  
  if (!planPath) {
    console.error('Usage: node generateTasks.cjs <plan-file>');
    process.exit(1);
  }
  
  generateTasks(planPath).catch(console.error);
}

module.exports = { generateTasks };
```

---

**Last Updated:** November 4, 2025  
**Expertise Level:** God-Tier  
**Use When:** Writing specs, generating plans/tasks, spec-driven development
