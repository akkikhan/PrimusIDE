import { ipcMain } from 'electron';
import { patchSessionStore } from '../patchSessionStore.js';

// Patch-related IPC handlers
ipcMain.handle('patch:create-session', async (_: any, multiPatch: any, providerId?: string) => {
  try {
    // Basic validation
    if (!multiPatch || typeof multiPatch !== 'object') throw new Error('Invalid patch payload');
    const session = patchSessionStore.createSession(multiPatch, providerId);
    return { success: true, session };
  } catch (error: any) {
    console.error('Failed to create patch session:', error);
    return { success: false, error: error.message || String(error) };
  }
});

ipcMain.handle('patch:get-session', async (_: any, sessionId: string) => {
  try {
    if (!sessionId || typeof sessionId !== 'string') throw new Error('Invalid sessionId');
    const session = patchSessionStore.getSession(sessionId);
    if (!session) return { success: false, error: 'Not found' };
    return { success: true, session };
  } catch (error: any) {
    console.error('Failed to get patch session:', error);
    return { success: false, error: error.message || String(error) };
  }
});

ipcMain.handle('patch:update-hunk-status', async (_: any, sessionId: string, filePath: string, hunkId: string, status: string) => {
  try {
    const allowed = new Set(['pending', 'accepted', 'rejected', 'conflict']);
    if (!allowed.has(status)) throw new Error('Invalid status');
    const updatedHunk = patchSessionStore.updateHunkStatus(sessionId, filePath, hunkId, status as any);
    return { success: true, hunk: updatedHunk };
  } catch (error: any) {
    console.error('Failed to update hunk status:', error);
    return { success: false, error: error.message || String(error) };
  }
});

ipcMain.handle('patch:discard-session', async (_: any, sessionId: string) => {
  try {
    const ok = patchSessionStore.discardSession(sessionId);
    return { success: ok };
  } catch (error: any) {
    console.error('Failed to discard session:', error);
    return { success: false, error: error.message || String(error) };
  }
});

ipcMain.handle('patch:apply-session', async (_: any, sessionId: string) => {
  try {
    // For now, mark as applied and return simulated result
    const result = patchSessionStore.markSessionApplied(sessionId);
    return { success: true, result };
  } catch (error: any) {
    console.error('Failed to apply session:', error);
    return { success: false, error: error.message || String(error) };
  }
});
