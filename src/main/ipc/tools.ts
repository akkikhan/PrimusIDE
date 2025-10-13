import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../shared/ipcChannels.js';
import { toolRegistry } from '../ai/toolRegistry.js';
import fs from 'fs';
import path from 'path';

export function registerToolIpcHandlers() {
  ipcMain.handle(IPC_CHANNELS.TOOL_LIST, async () => {
    try {
      const tools = toolRegistry.list();
      return tools.map(t => ({ id: t.id, name: t.name, description: t.description, capabilities: (t as any).capabilities || [] }));
    } catch (e:any) {
      return { error: e.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.TOOL_INVOKE, async (_evt, maybePayload: any, maybeReq?: any, maybeArgs?: any) => {
    // Accept either (toolId, req, args) OR ({ id, req, args })
    let toolId = maybePayload;
    let req = maybeReq;
    let args = maybeArgs;
    if (maybePayload && typeof maybePayload === 'object' && maybePayload.id) {
      toolId = maybePayload.id;
      req = maybePayload.req;
      args = maybePayload.args;
    }
    if (!toolId) return { success: false, error: 'toolId required' };
    try {
      const tool = toolRegistry.get(toolId);
      if (!tool) return { success: false, error: `Tool not found: ${toolId}` };

      // Telemetry: invocation record
      const recordBase = { ts: new Date().toISOString(), event: 'tool:invoke', toolId, args };
      try {
        const teleDir = path.join(process.cwd(), 'artifacts', 'ai');
        if (!fs.existsSync(teleDir)) fs.mkdirSync(teleDir, { recursive: true });
        const teleFile = path.join(teleDir, 'tool-invocations.jsonl');
        fs.appendFileSync(teleFile, JSON.stringify({ ...recordBase, stage: 'started' }) + '\n', 'utf8');
      } catch (e) { /* non-blocking */ }

      const result = await toolRegistry.invoke(toolId, req, args);

      try {
        const teleDir = path.join(process.cwd(), 'artifacts', 'ai');
        const teleFile = path.join(teleDir, 'tool-invocations.jsonl');
        fs.appendFileSync(teleFile, JSON.stringify({ ...recordBase, stage: 'completed', success: true }) + '\n', 'utf8');
      } catch (e) { /* non-blocking */ }

      return { success: true, result };
    } catch (e:any) {
      try {
        const teleDir = path.join(process.cwd(), 'artifacts', 'ai');
        if (!fs.existsSync(teleDir)) fs.mkdirSync(teleDir, { recursive: true });
        const teleFile = path.join(teleDir, 'tool-invocations.jsonl');
        fs.appendFileSync(teleFile, JSON.stringify({ ts: new Date().toISOString(), event: 'tool:invoke', toolId, args, stage: 'failed', error: e.message }) + '\n', 'utf8');
      } catch (e2) { /* swallow */ }
      return { success: false, error: e.message };
    }
  });
}

// Register on module load for convenience
try {
  registerToolIpcHandlers();
} catch (e) {
  console.error('[IPC][tools] Failed to register tool ipc handlers', e);
}
