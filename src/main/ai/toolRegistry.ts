import type { AIRequest } from '../../shared/aiTypes.js';
import { IPC_CHANNELS } from '../../shared/ipcChannels.js';
import path from 'path';
import fs from 'fs';
import { providerRegistry } from './providerRegistry.js';
import { vectorStore } from './retrieval/vectorStore.js';
import { bulkReindex, reindexFile } from './retrieval/indexer.js';
import crypto from 'crypto';

// Simple tool output types (Phase 1 stubs)
export interface ToolInvocation {
  id: string;
  name: string;
  description: string;
  invoke(req: AIRequest, args?: any): Promise<any>;
}

// Stub: context bundle summary tool
const contextTool: ToolInvocation = {
  id: 'context-summary',
  name: 'Context Summary',
  description: 'Lightweight project snapshot: task counts, lifecycle distribution, spec count, provider count.',
  async invoke(_req) {
    const root = process.cwd();
    const tasksFile = path.join(root, 'tasks_all.json');
    const specsDir = path.join(root, 'specs');
    let taskStats: any = { total: 0, byLifecycle: {}, withCodeRefs: 0 };
    try {
      if (fs.existsSync(tasksFile)) {
        const raw = JSON.parse(fs.readFileSync(tasksFile, 'utf-8'));
        if (Array.isArray(raw)) {
          taskStats.total = raw.length;
          for (const t of raw) {
            const life = (t.lifecycle || 'unknown');
            taskStats.byLifecycle[life] = (taskStats.byLifecycle[life] || 0) + 1;
            if (t.codeRefs && Array.isArray(t.codeRefs) && t.codeRefs.length) taskStats.withCodeRefs += 1;
          }
        }
      }
    } catch (e:any) {
      taskStats.error = `tasks_parse_error: ${e.message}`;
    }
    let specCount = 0;
    try {
      if (fs.existsSync(specsDir)) {
        specCount = fs.readdirSync(specsDir).filter(f => f.endsWith('.spec.md')).length;
      }
    } catch (e:any) {
      /* ignore */
    }
    const providerCount = providerRegistry.getAll().length;
    return {
      tasks: taskStats,
      specs: { count: specCount },
      ai: { providers: providerCount },
      generatedAt: new Date().toISOString(),
      notes: 'Lightweight snapshot (no deep FS scan).'
    };
  }
};

// Stub: symbol diff summary
const symbolDiffTool: ToolInvocation = {
  id: 'symbol-diff',
  name: 'Symbol Diff Summary',
  description: 'Summarizes recent symbol-level changes (stub).',
  async invoke() {
    return { symbolsChanged: 0, risk: 0, notes: 'Symbol diff tool stub (Phase 1).' };
  }
};

// Stub: verifier readiness summary
const verifierTool: ToolInvocation = {
  id: 'verifier-readiness',
  name: 'Verifier Readiness',
  description: 'Indicates readiness gating metrics (stub).',
  async invoke() {
    return { readinessScore: 0.42, blockers: [], notes: 'Verifier readiness stub (Phase 1).' };
  }
};

// Configure vector store persistence (lazy init)
const retrievalDataDir = path.join(process.cwd(), 'artifacts', 'retrieval');
const indexFile = path.join(retrievalDataDir, 'index-v1.json');
vectorStore.configurePersistence(indexFile);
vectorStore.loadFromDisk();

// Embedding index tool – chunk based bulk reindex
const embeddingIndexTool: ToolInvocation = {
  id: 'embedding-index',
  name: 'Embedding Index Build',
  description: 'Bulk (re)build of embedding index for project source (chunk-based).',
  async invoke(_req, args) {
    const root = process.cwd();
    const scanDir = args?.dir || path.join(root, 'src');
    const limit = args?.limit || 400;
    const res = bulkReindex(scanDir, /\.(ts|tsx|js|jsx|md)$/i, limit);
    return { mode: 'bulk', ...res, snapshot: vectorStore.snapshot(), persistedTo: indexFile };
  }
};

// Single file reindex tool
const embeddingReindexFileTool: ToolInvocation = {
  id: 'embedding-reindex-file',
  name: 'Embedding Reindex File',
  description: 'Reindexes a single file (chunk-based) and replaces existing vectors for that file.',
  async invoke(_req, args){
    const filePath = args?.file;
    if(!filePath) throw new Error('file argument required');
    const root = process.cwd();
    const res = reindexFile(filePath, path.join(root, 'src'));
    return { ...res, snapshot: vectorStore.snapshot() };
  }
};

// Semantic retrieval tool (queries vector store)
const semanticRetrieveTool: ToolInvocation = {
  id: 'semantic-retrieve',
  name: 'Semantic Retrieve',
  description: 'Performs similarity search over embedding index returning snippet metadata.',
  async invoke(_req, args) {
    const query = (args?.query || '').toString();
    const topK = args?.topK || 5;
    const results = vectorStore.query({ text: query, topK });
    // ensure snippet duplication convenience
    const enriched = results.map(r => ({ ...r, snippet: (r as any).snippet || r.meta?.snippet }));
    return { query, topK, count: enriched.length, results: enriched, snapshot: vectorStore.snapshot() };
  }
};

// Clear embedding index
const embeddingClearTool: ToolInvocation = {
  id: 'embedding-clear',
  name: 'Embedding Index Clear',
  description: 'Clears all in-memory embedding vectors (non-persistent).',
  async invoke() {
    vectorStore.clear();
    // removing persisted file optional: leave empty state saved automatically
    return { cleared: true, snapshot: vectorStore.snapshot(), persistedTo: indexFile };
  }
};

// Patch generator tool - generates a MultiFilePatch from a high-level description
const patchGeneratorTool: ToolInvocation = {
  id: 'patch-generator',
  name: 'Patch Generator',
  description: 'Generate multi-file patches from a high-level description (AI-assisted)',
  async invoke(_req, args) {
    const description = args?.description || _req.prompt || 'No description';
    const targetFiles = args?.targetFiles || [];
    const providerId = args?.providerId || (_req.providerHint) || (providerRegistry.getAll()[0]?.id);
    const riskTolerance = args?.riskTolerance || 'medium';
    // Build a provider request
    const provider = providerRegistry.get(providerId);
    if (!provider) throw new Error(`Provider not found: ${providerId}`);

    const prompt = `Generate a machine-parseable JSON multi-file patch for the following description. Return JSON with fields: patches: [{filePath, hunks:[{id,startLine,endLine,newText}]}], metadata. Description:\n${description}\nTargetFiles: ${JSON.stringify(targetFiles)}`;
    const reqForProvider: any = { id: `patch_tool_${Date.now()}`, operation: 'generate_patch', prompt, providerHint: providerId, includeContext: false };
    const response = await provider.invoke(reqForProvider) as any;

    // Try to parse provider content as JSON
    let output: any = null;
    try {
      output = typeof response.content === 'string' ? JSON.parse(response.content) : response.content;
    } catch (e) {
      // If parsing failed, attempt to wrap raw content into a single-file replace patch
      output = {
        id: `patch_${Date.now()}`,
        description,
        patches: [ { filePath: targetFiles[0] || 'UNKNOWN', operation: 'replace', content: response.content, metadata: { description: 'Provider returned raw content', dependencies: [], conflicts: [], risk: 0.3, priority: 1 } } ],
        dependencies: [], conflicts: [], risk: { overall: 0.3, factors: [] }, metadata: { createdAt: Date.now(), estimatedTime: 0, complexity: 0.5, author: providerId }
      };
    }

    // Normalize to MultiFilePatch shape if necessary
    if (output && output.patches) {
      const multiPatch = {
        id: output.id || `patch_${Date.now()}`,
        description: output.description || description,
        patches: output.patches,
        dependencies: output.dependencies || [],
        conflicts: output.conflicts || [],
        risk: output.risk || { overall: 0, factors: [] },
        metadata: output.metadata || { createdAt: Date.now(), estimatedTime: 0, complexity: 0.5, author: providerId }
      };

      // Telemetry: append invocation record
      try {
        const root = process.cwd();
        const teleDir = path.join(root, 'artifacts', 'ai');
        if (!fs.existsSync(teleDir)) fs.mkdirSync(teleDir, { recursive: true });
        const teleFile = path.join(teleDir, 'patch-telemetry.jsonl');
        const record = { ts: new Date().toISOString(), event: 'patch_tool_invoked', providerId, toolId: 'patch-generator', patchId: multiPatch.id, targetFiles, riskTolerance, success: true };
        fs.appendFileSync(teleFile, JSON.stringify(record) + '\n', 'utf8');
      } catch (e:any) { /* don't block on telemetry errors */ }

      return multiPatch;
    }

    throw new Error('Provider did not return patch output');
  }
};

class ToolRegistry {
  private tools: Map<string, ToolInvocation> = new Map();
  constructor(){
  [contextTool, symbolDiffTool, verifierTool, embeddingIndexTool, embeddingReindexFileTool, semanticRetrieveTool, embeddingClearTool, patchGeneratorTool].forEach(t=> this.tools.set(t.id, t));
  }
  list(){
    return [...this.tools.values()].map(t=> ({ id: t.id, name: t.name, description: t.description }));
  }
  get(id: string){
    return this.tools.get(id);
  }
  async invoke(id: string, req: AIRequest, args?: any){
    const tool = this.tools.get(id);
    if(!tool) throw new Error(`Unknown tool: ${id}`);
    return await tool.invoke(req, args);
  }
}

export const toolRegistry = new ToolRegistry();
