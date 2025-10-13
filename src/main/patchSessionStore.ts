const { v4: uuidv4 } = require('uuid');
import { MultiFilePatch, PatchSession, PatchExecutionResult, FilePatch, Hunk } from '@shared/patch';
import fs from 'fs';
import path from 'path';

function writeTelemetry(record: any) {
  try {
    const root = process.cwd();
    const teleDir = path.join(root, 'artifacts', 'ai');
    if (!fs.existsSync(teleDir)) fs.mkdirSync(teleDir, { recursive: true });
    const teleFile = path.join(teleDir, 'patch-telemetry.jsonl');
    fs.appendFileSync(teleFile, JSON.stringify({ ts: new Date().toISOString(), ...record }) + '\n', 'utf8');
  } catch (e) {
    // non-blocking
  }
}

class PatchSessionStore {
  private sessions: Map<string, PatchSession> = new Map();

  createSession(multiPatch: MultiFilePatch, providerId?: string): PatchSession {
    const id = `session_${Date.now()}_${Math.random().toString(36).substr(2,9)}`;
    const session: PatchSession = {
      id,
      createdAt: Date.now(),
      providerId: providerId || 'unknown',
      patches: multiPatch,
      status: 'open',
      metadata: {}
    };

    this.sessions.set(id, session);

    writeTelemetry({ event: 'session_started', sessionId: id, providerId: session.providerId, patchId: multiPatch.id, patchSummary: { files: multiPatch.patches.length, risk: multiPatch.risk } });

    return session;
  }

  getSession(sessionId: string): PatchSession | null {
    const s = this.sessions.get(sessionId);
    if (!s) return null;
    // Return a deep copy to avoid mutation across boundary
    return JSON.parse(JSON.stringify(s));
  }

  updateHunkStatus(sessionId: string, filePath: string, hunkId: string, status: 'pending' | 'accepted' | 'rejected' | 'conflict') {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);

    const filePatch = session.patches.patches.find(p => p.filePath === filePath);
    if (!filePatch) throw new Error(`File not found in session: ${filePath}`);

    if (!filePatch.hunks) throw new Error(`No hunks present for file: ${filePath}`);

    const hunk = filePatch.hunks.find(h => h.id === hunkId);
    if (!hunk) throw new Error(`Hunk not found: ${hunkId}`);

    hunk.status = status;
    // Update session storage
    this.sessions.set(sessionId, session);

    writeTelemetry({ event: 'hunk_status_updated', sessionId, filePath, hunkId, status });

    return JSON.parse(JSON.stringify(hunk));
  }

  discardSession(sessionId: string) {
    const existed = this.sessions.delete(sessionId);
    if (existed) writeTelemetry({ event: 'session_discarded', sessionId });
    return existed;
  }

  listSessions() {
    return Array.from(this.sessions.values()).map(s => ({ id: s.id, createdAt: s.createdAt, status: s.status }));
  }

  // Mark session applied (simple state transition; real apply logic happens elsewhere)
  markSessionApplied(sessionId: string): PatchExecutionResult {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);

    session.status = 'applied';
    this.sessions.set(sessionId, session);

    const result: PatchExecutionResult = {
      success: true,
      appliedPatches: session.patches.patches.map(p => `${p.filePath}:${p.operation}`),
      failedPatches: [],
      conflicts: [],
      performance: {
        totalTime: 0,
        filesProcessed: session.patches.patches.length,
        operationsApplied: session.patches.patches.length
      }
    };

    writeTelemetry({ event: 'session_applied', sessionId, appliedFiles: result.appliedPatches.length, conflicts: result.conflicts.length });

    return result;
  }
}

export const patchSessionStore = new PatchSessionStore();
