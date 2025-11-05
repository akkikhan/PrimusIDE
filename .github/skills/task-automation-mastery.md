# Task Automation System - God-Level Expertise

## Complete Task Management Architecture

### Task Schema and Data Model

```typescript
// src/shared/types/task.ts - Complete task interface
export interface Task {
  // Core identification
  id: string;                    // Unique identifier (e.g., "637")
  title: string;                 // Human-readable title
  description: string;           // Detailed description
  
  // Classification
  category: TaskCategory;        // One of 28 categories
  subcategory?: string;          // Optional sub-classification
  type: TaskType;                // feature | bugfix | enhancement | refactor
  
  // Status tracking
  status: TaskStatus;            // SPEC | IMPL | TODO | DERIVED | FUTURE | DONE
  lifecycleStatus: LifecycleStatus; // planned | in-progress | done | verifying
  
  // Priority and impact
  priority: Priority;            // P0 | P1 | P2 | P3
  priorityScore: number;         // 0-100 calculated score
  impactScore: number;           // 0-100 estimated impact
  complexityScore: number;       // 1-5 difficulty rating
  
  // Dependencies
  dependencies: string[];        // Array of task IDs this depends on
  blockedBy: string[];           // Tasks blocking this one
  blocks: string[];              // Tasks this one blocks
  relatedTasks: string[];        // Related but not blocking
  
  // Spec-Kit integration
  specId?: string;               // Source spec ID
  planId?: string;               // Source plan ID
  origin: TaskOrigin;            // manual | spec | derived | ai
  
  // User stories and acceptance
  userStory?: string;            // As a [user], I want [feature] so that [benefit]
  acceptanceCriteria: string[];  // Array of testable criteria
  
  // Code traceability
  hasCodeRefs: boolean;          // Whether code references exist
  codeLocations: string[];       // Files where // TASK:<id> appears
  
  // Metadata
  createdAt: string;             // ISO timestamp
  updatedAt: string;             // ISO timestamp
  estimatedHours?: number;       // Effort estimate
  actualHours?: number;          // Actual time spent
  assignee?: string;             // Assigned developer
  
  // History
  statusHistory: StatusHistoryEntry[];
  
  // Hashing for change detection
  contentHash: string;           // SHA-256 of core fields
}

export type TaskCategory =
  | 'core-platform'
  | 'editor-tabs'
  | 'file-explorer'
  | 'theming-ui'
  | 'search'
  | 'plugins-extensions'
  | 'ai-integration'
  | 'git-integration'
  | 'terminal'
  | 'spec-kit'
  | 'outline-symbols'
  | 'problems-diagnostics'
  | 'split-view'
  | 'collaboration'
  | 'code-intelligence'
  | 'performance'
  | 'testing'
  | 'build-packaging'
  | 'documentation'
  | 'security'
  | 'accessibility'
  | 'telemetry'
  | 'future-features'
  | 'task-automation'
  | 'ai-parity'
  | 'project-management'
  | 'reporting';

export type TaskStatus = 'SPEC' | 'IMPL' | 'TODO' | 'DERIVED' | 'FUTURE' | 'DONE';
export type LifecycleStatus = 'planned' | 'in-progress' | 'done' | 'verifying' | 'blocked';
export type Priority = 'P0' | 'P1' | 'P2' | 'P3';
export type TaskType = 'feature' | 'bugfix' | 'enhancement' | 'refactor' | 'documentation';
export type TaskOrigin = 'manual' | 'spec' | 'derived' | 'ai';

export interface StatusHistoryEntry {
  from: LifecycleStatus;
  to: LifecycleStatus;
  timestamp: string;
  reason?: string;
}
```

### Task Automation Scripts - Complete Suite

#### 1. Task Generation from ALL_TASKS.md

```javascript
// scripts/automation/generateTasksJson.cjs
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

async function generateTasksJson() {
  console.log('📝 Parsing ALL_TASKS.md...');
  
  const allTasksPath = path.join(__dirname, '../../ALL_TASKS.md');
  const content = await fs.readFile(allTasksPath, 'utf-8');
  
  const tasks = [];
  let currentCategory = null;
  let taskIdCounter = 1;
  
  const lines = content.split('\n');
  
  for (const line of lines) {
    // Detect category headers
    if (line.startsWith('## Category')) {
      currentCategory = extractCategory(line);
      continue;
    }
    
    // Detect task lines
    const taskMatch = line.match(/^\s*[-*]\s+\[(SPEC|IMPL|TODO|DERIVED|FUTURE|DONE)\]\s+(.+)$/);
    if (taskMatch && currentCategory) {
      const [, status, title] = taskMatch;
      
      const task = {
        id: String(taskIdCounter++),
        title: title.trim(),
        description: '',
        category: currentCategory,
        status,
        lifecycleStatus: deriveLifecycleStatus(status),
        priority: derivePriority(title, currentCategory),
        priorityScore: 0,
        impactScore: 0,
        complexityScore: estimateComplexity(title),
        dependencies: [],
        blockedBy: [],
        blocks: [],
        relatedTasks: [],
        origin: 'manual',
        acceptanceCriteria: [],
        hasCodeRefs: false,
        codeLocations: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        statusHistory: [],
        contentHash: '',
      };
      
      task.contentHash = generateContentHash(task);
      tasks.push(task);
    }
  }
  
  console.log(`✅ Generated ${tasks.length} tasks`);
  
  // Write to tasks_all.json
  const outputPath = path.join(__dirname, '../../tasks_all.json');
  await fs.writeFile(outputPath, JSON.stringify(tasks, null, 2));
  
  console.log(`💾 Saved to ${outputPath}`);
  
  return tasks;
}

function extractCategory(line) {
  const match = line.match(/Category\s+\d+:\s+(.+)/);
  return match ? match[1].toLowerCase().replace(/\s+/g, '-') : null;
}

function deriveLifecycleStatus(status) {
  const statusMap = {
    SPEC: 'planned',
    TODO: 'planned',
    DERIVED: 'planned',
    IMPL: 'in-progress',
    FUTURE: 'planned',
    DONE: 'done',
  };
  return statusMap[status] || 'planned';
}

function derivePriority(title, category) {
  // P0: Critical core features
  if (category === 'core-platform' || title.includes('critical')) {
    return 'P0';
  }
  
  // P1: Important features
  if (['editor-tabs', 'file-explorer', 'lsp-integration'].includes(category)) {
    return 'P1';
  }
  
  // P2: Nice-to-have
  if (['theming-ui', 'documentation'].includes(category)) {
    return 'P2';
  }
  
  // P3: Future enhancements
  return 'P3';
}

function estimateComplexity(title) {
  const complexityKeywords = {
    5: ['architecture', 'refactor', 'redesign', 'migrate'],
    4: ['integrate', 'implement', 'language server', 'debugging'],
    3: ['add', 'create', 'build', 'develop'],
    2: ['improve', 'enhance', 'update', 'optimize'],
    1: ['fix', 'adjust', 'tweak', 'polish'],
  };
  
  const lowerTitle = title.toLowerCase();
  
  for (const [score, keywords] of Object.entries(complexityKeywords)) {
    if (keywords.some(kw => lowerTitle.includes(kw))) {
      return parseInt(score);
    }
  }
  
  return 3; // Default
}

function generateContentHash(task) {
  const hashContent = JSON.stringify({
    title: task.title,
    description: task.description,
    category: task.category,
    acceptanceCriteria: task.acceptanceCriteria,
  });
  
  return crypto.createHash('sha256').update(hashContent).digest('hex');
}

if (require.main === module) {
  generateTasksJson().catch(console.error);
}

module.exports = { generateTasksJson };
```

#### 2. Next Task Selection (Priority Algorithm)

```javascript
// scripts/automation/nextTask.cjs
const fs = require('fs/promises');
const path = require('path');

async function selectNextTask(filters = {}) {
  console.log('🎯 Selecting next task...');
  
  const tasksPath = path.join(__dirname, '../../tasks_all.json');
  const tasks = JSON.parse(await fs.readFile(tasksPath, 'utf-8'));
  
  // Filter available tasks
  let available = tasks.filter(task => {
    // Must be planned status
    if (task.lifecycleStatus !== 'planned') return false;
    
    // Must not be blocked
    if (task.blockedBy && task.blockedBy.length > 0) return false;
    
    // Apply custom filters
    if (filters.category && task.category !== filters.category) return false;
    if (filters.priority && task.priority !== filters.priority) return false;
    if (filters.maxComplexity && task.complexityScore > filters.maxComplexity) return false;
    
    return true;
  });
  
  if (available.length === 0) {
    console.log('❌ No available tasks found');
    return null;
  }
  
  // Calculate priority scores
  available = available.map(task => ({
    ...task,
    calculatedScore: calculatePriorityScore(task, tasks),
  }));
  
  // Sort by calculated score (highest first)
  available.sort((a, b) => b.calculatedScore - a.calculatedScore);
  
  const selected = available[0];
  
  console.log('\n📋 Selected Task:');
  console.log(`  ID: ${selected.id}`);
  console.log(`  Title: ${selected.title}`);
  console.log(`  Category: ${selected.category}`);
  console.log(`  Priority: ${selected.priority}`);
  console.log(`  Complexity: ${selected.complexityScore}/5`);
  console.log(`  Score: ${selected.calculatedScore.toFixed(2)}`);
  
  // Show top 5 alternatives
  console.log('\n📊 Top Alternatives:');
  available.slice(1, 6).forEach((task, i) => {
    console.log(`  ${i + 2}. [${task.id}] ${task.title} (Score: ${task.calculatedScore.toFixed(2)})`);
  });
  
  return selected;
}

function calculatePriorityScore(task, allTasks) {
  let score = 0;
  
  // Base priority score (P0=100, P1=75, P2=50, P3=25)
  const priorityScores = { P0: 100, P1: 75, P2: 50, P3: 25 };
  score += priorityScores[task.priority] || 0;
  
  // Impact score (0-100)
  score += task.impactScore || 0;
  
  // Inverse complexity bonus (easier tasks get slight boost)
  score += (6 - task.complexityScore) * 5;
  
  // Dependency bonus (tasks that unblock others get higher priority)
  const unblockCount = task.blocks ? task.blocks.length : 0;
  score += unblockCount * 20;
  
  // Recency penalty (older tasks get slight boost)
  const ageInDays = (Date.now() - new Date(task.createdAt).getTime()) / (1000 * 60 * 60 * 24);
  score += Math.min(ageInDays * 0.5, 10);
  
  // Category priority (current focus areas)
  const focusCategories = ['lsp-integration', 'editor-tabs', 'file-explorer'];
  if (focusCategories.includes(task.category)) {
    score += 25;
  }
  
  return score;
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const filters = {};
  
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace('--', '');
    const value = args[i + 1];
    filters[key] = value;
  }
  
  selectNextTask(filters).catch(console.error);
}

module.exports = { selectNextTask, calculatePriorityScore };
```

#### 3. Task Lifecycle Management

```javascript
// scripts/automation/workTask.cjs
const fs = require('fs/promises');
const path = require('path');

async function startTask(taskId) {
  console.log(`▶️  Starting task ${taskId}...`);
  
  const task = await loadTask(taskId);
  
  if (task.lifecycleStatus !== 'planned') {
    console.log(`⚠️  Task ${taskId} is not in 'planned' status (current: ${task.lifecycleStatus})`);
    return;
  }
  
  // Update status
  task.lifecycleStatus = 'in-progress';
  task.updatedAt = new Date().toISOString();
  task.statusHistory.push({
    from: 'planned',
    to: 'in-progress',
    timestamp: new Date().toISOString(),
    reason: 'Manual start via npm run task:start',
  });
  
  await saveTask(task);
  
  console.log(`✅ Task ${taskId} marked as in-progress`);
  console.log(`\n📋 Task Details:`);
  console.log(`  Title: ${task.title}`);
  console.log(`  Category: ${task.category}`);
  console.log(`  Priority: ${task.priority}`);
  console.log(`\n💡 Next Steps:`);
  console.log(`  1. Add // TASK:${taskId} comments in your code`);
  console.log(`  2. Implement the feature`);
  console.log(`  3. Run: npm run task:complete -- ${taskId}`);
}

async function completeTask(taskId) {
  console.log(`✅ Completing task ${taskId}...`);
  
  const task = await loadTask(taskId);
  
  if (task.lifecycleStatus !== 'in-progress') {
    console.log(`⚠️  Task ${taskId} is not in 'in-progress' status (current: ${task.lifecycleStatus})`);
    return;
  }
  
  // Update status
  task.lifecycleStatus = 'done';
  task.status = 'DONE';
  task.updatedAt = new Date().toISOString();
  task.statusHistory.push({
    from: 'in-progress',
    to: 'done',
    timestamp: new Date().toISOString(),
    reason: 'Manual completion via npm run task:complete',
  });
  
  await saveTask(task);
  
  console.log(`✅ Task ${taskId} marked as done`);
  console.log(`\n📊 Progress Update:`);
  await printProgress();
  
  console.log(`\n🎯 Next Task Recommendation:`);
  const { selectNextTask } = require('./nextTask.cjs');
  await selectNextTask();
}

async function resetTask(taskId) {
  console.log(`🔄 Resetting task ${taskId}...`);
  
  const task = await loadTask(taskId);
  
  task.lifecycleStatus = 'planned';
  task.updatedAt = new Date().toISOString();
  task.statusHistory.push({
    from: task.lifecycleStatus,
    to: 'planned',
    timestamp: new Date().toISOString(),
    reason: 'Manual reset via npm run task:reset',
  });
  
  await saveTask(task);
  
  console.log(`✅ Task ${taskId} reset to planned`);
}

async function loadTask(taskId) {
  const tasksPath = path.join(__dirname, '../../tasks_all.json');
  const tasks = JSON.parse(await fs.readFile(tasksPath, 'utf-8'));
  
  const task = tasks.find(t => t.id === taskId);
  if (!task) {
    throw new Error(`Task ${taskId} not found`);
  }
  
  return task;
}

async function saveTask(task) {
  const tasksPath = path.join(__dirname, '../../tasks_all.json');
  const tasks = JSON.parse(await fs.readFile(tasksPath, 'utf-8'));
  
  const index = tasks.findIndex(t => t.id === task.id);
  if (index !== -1) {
    tasks[index] = task;
  }
  
  await fs.writeFile(tasksPath, JSON.stringify(tasks, null, 2));
  
  // Also save individual task file
  const taskFilePath = path.join(__dirname, '../../tasks', `${task.id}.task.json`);
  await fs.mkdir(path.dirname(taskFilePath), { recursive: true });
  await fs.writeFile(taskFilePath, JSON.stringify(task, null, 2));
}

async function printProgress() {
  const tasksPath = path.join(__dirname, '../../tasks_all.json');
  const tasks = JSON.parse(await fs.readFile(tasksPath, 'utf-8'));
  
  const total = tasks.length;
  const done = tasks.filter(t => t.lifecycleStatus === 'done').length;
  const inProgress = tasks.filter(t => t.lifecycleStatus === 'in-progress').length;
  const planned = tasks.filter(t => t.lifecycleStatus === 'planned').length;
  
  const percentage = ((done / total) * 100).toFixed(1);
  
  console.log(`  Total: ${total} tasks`);
  console.log(`  Done: ${done} (${percentage}%)`);
  console.log(`  In Progress: ${inProgress}`);
  console.log(`  Planned: ${planned}`);
}

// CLI interface
if (require.main === module) {
  const command = process.argv[2];
  const taskId = process.argv[4]; // npm run task:start -- 637
  
  if (!taskId) {
    console.error('Usage: npm run task:{start|complete|reset} -- <taskId>');
    process.exit(1);
  }
  
  switch (command) {
    case 'start':
      startTask(taskId).catch(console.error);
      break;
    case 'complete':
      completeTask(taskId).catch(console.error);
      break;
    case 'reset':
      resetTask(taskId).catch(console.error);
      break;
    default:
      console.error('Unknown command:', command);
      process.exit(1);
  }
}

module.exports = { startTask, completeTask, resetTask };
```

#### 4. Code Traceability (Trace Map Generation)

```javascript
// scripts/automation/updateTraceMap.cjs
const fs = require('fs/promises');
const path = require('path');
const { glob } = require('glob');

async function updateTraceMap() {
  console.log('🔍 Scanning codebase for task references...');
  
  const srcPath = path.join(__dirname, '../../src');
  const files = await glob('**/*.{ts,tsx,js,jsx}', { cwd: srcPath, absolute: true });
  
  const traceMap = {};
  const taskPattern = /\/\/\s*TASK:(\d+)(?:\s*-\s*(.+))?/g;
  
  for (const file of files) {
    const content = await fs.readFile(file, 'utf-8');
    const matches = Array.from(content.matchAll(taskPattern));
    
    for (const match of matches) {
      const taskId = match[1];
      const description = match[2] || '';
      
      if (!traceMap[taskId]) {
        traceMap[taskId] = [];
      }
      
      traceMap[taskId].push({
        file: path.relative(path.join(__dirname, '../..'), file),
        line: getLineNumber(content, match.index),
        description,
      });
    }
  }
  
  console.log(`✅ Found references to ${Object.keys(traceMap).length} tasks`);
  
  // Update tasks_all.json with hasCodeRefs and codeLocations
  const tasksPath = path.join(__dirname, '../../tasks_all.json');
  const tasks = JSON.parse(await fs.readFile(tasksPath, 'utf-8'));
  
  for (const task of tasks) {
    if (traceMap[task.id]) {
      task.hasCodeRefs = true;
      task.codeLocations = traceMap[task.id].map(ref => ref.file);
    } else {
      task.hasCodeRefs = false;
      task.codeLocations = [];
    }
  }
  
  await fs.writeFile(tasksPath, JSON.stringify(tasks, null, 2));
  
  // Save trace map
  const traceMapPath = path.join(__dirname, '../../trace_map.json');
  await fs.writeFile(traceMapPath, JSON.stringify(traceMap, null, 2));
  
  console.log(`💾 Saved trace map to ${traceMapPath}`);
  
  // Print summary
  console.log('\n📊 Trace Summary:');
  Object.entries(traceMap)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 10)
    .forEach(([taskId, refs]) => {
      console.log(`  Task ${taskId}: ${refs.length} locations`);
    });
}

function getLineNumber(content, index) {
  return content.substring(0, index).split('\n').length;
}

if (require.main === module) {
  updateTraceMap().catch(console.error);
}

module.exports = { updateTraceMap };
```

#### 5. Full Automation Pipeline

```javascript
// scripts/automation/tasksPipeline.cjs
const { generateTasksJson } = require('./generateTasksJson.cjs');
const { enrichTasks } = require('./enrichTasks.cjs');
const { updateTraceMap } = require('./updateTraceMap.cjs');
const { calculateScores } = require('./calculateScores.cjs');
const { generateTaskIndex } = require('./generateTaskIndex.cjs');

async function runPipeline() {
  console.log('🚀 Starting tasks pipeline...\n');
  
  try {
    // 1. Generate tasks from ALL_TASKS.md
    console.log('Step 1: Generate tasks JSON');
    await generateTasksJson();
    console.log('');
    
    // 2. Enrich with user stories and acceptance criteria
    console.log('Step 2: Enrich tasks');
    await enrichTasks();
    console.log('');
    
    // 3. Update code traceability map
    console.log('Step 3: Update trace map');
    await updateTraceMap();
    console.log('');
    
    // 4. Calculate priority and impact scores
    console.log('Step 4: Calculate scores');
    await calculateScores();
    console.log('');
    
    // 5. Generate quick lookup index
    console.log('Step 5: Generate index');
    await generateTaskIndex();
    console.log('');
    
    console.log('✅ Pipeline complete!');
    
    // Print summary
    const fs = require('fs/promises');
    const path = require('path');
    const tasksPath = path.join(__dirname, '../../tasks_all.json');
    const tasks = JSON.parse(await fs.readFile(tasksPath, 'utf-8'));
    
    console.log('\n📊 Task Summary:');
    console.log(`  Total tasks: ${tasks.length}`);
    console.log(`  With code refs: ${tasks.filter(t => t.hasCodeRefs).length}`);
    console.log(`  With user stories: ${tasks.filter(t => t.userStory).length}`);
    console.log(`  Done: ${tasks.filter(t => t.lifecycleStatus === 'done').length}`);
    console.log(`  In progress: ${tasks.filter(t => t.lifecycleStatus === 'in-progress').length}`);
    
  } catch (error) {
    console.error('❌ Pipeline failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  runPipeline();
}

module.exports = { runPipeline };
```

---

**Last Updated:** November 4, 2025  
**Expertise Level:** God-Tier  
**Use When:** Managing tasks, automation pipelines, project tracking
