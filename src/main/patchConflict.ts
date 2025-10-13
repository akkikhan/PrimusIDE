import { PatchSession, Hunk } from '@shared/patch';
import * as crypto from 'crypto';

export function computeHash(text: string): string {
  return crypto.createHash('sha1').update(text, 'utf8').digest('hex');
}

export function findExactHunkMatch(originalText: string, currentText: string): { found: boolean; startLine?: number; endLine?: number } {
  const originalNormalized = originalText.replace(/\r\n?/g, '\n');
  const currentNormalized = currentText.replace(/\r\n?/g, '\n');
  const idx = currentNormalized.indexOf(originalNormalized);
  if (idx === -1) return { found: false };

  const startLine = currentNormalized.slice(0, idx).split('\n').length - 1;
  const endLine = startLine + originalNormalized.split('\n').length - 1;
  return { found: true, startLine, endLine };
}

export function fuzzyLocateHunk(hunk: Hunk, currentText: string): { found: boolean; startLine?: number; endLine?: number; confidence: number } {
  // Try exact match first
  if (!hunk || !hunk.newText) return { found: false, confidence: 0 };
  const exact = findExactHunkMatch(hunk.newText, currentText);
  if (exact.found) return { found: true, startLine: exact.startLine, endLine: exact.endLine, confidence: 1 };

  // Fuzzy approach: try match by first & last line anchors
  const lines = hunk.newText.replace(/\r\n?/g, '\n').split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return { found: false, confidence: 0 };

  const first = lines[0];
  const last = lines[lines.length - 1];

  const currentLines = currentText.replace(/\r\n?/g, '\n').split('\n');

  let bestScore = 0;
  let bestStart = -1;
  for (let i = 0; i < currentLines.length; i++) {
    const windowFirst = currentLines[i].trim();
    if (windowFirst === first) {
      // check approximate match for the subsequent lines
      let score = 1; // first line match
      for (let j = 1; j < Math.min(lines.length, 10); j++) {
        const idx = i + j;
        if (idx >= currentLines.length) break;
        if (currentLines[idx].trim() === lines[j]) score += 1;
        else break;
      }
      if (score > bestScore) { bestScore = score; bestStart = i; }
    }
  }

  if (bestStart >= 0 && bestScore > 0) {
    const estimatedEnd = bestStart + Math.min(lines.length, 10) - 1;
    const confidence = Math.min(0.9, bestScore / Math.min(lines.length, 10));
    return { found: true, startLine: bestStart, endLine: estimatedEnd, confidence };
  }

  return { found: false, confidence: 0 };
}

export function detectSessionConflicts(session: PatchSession, fileLoader: (filePath: string) => Promise<string>): Promise<{ sessionId: string; conflicts: Array<{ filePath: string; hunkId: string; reason: string }> }> {
  // Load each file and attempt to locate hunks; mark conflicts when unable to locate
  return new Promise(async (resolve) => {
    const conflicts: Array<{ filePath: string; hunkId: string; reason: string }> = [];

    for (const filePatch of session.patches.patches) {
      try {
        const content = await fileLoader(filePatch.filePath).catch(() => null);
        if (!content) {
          // file missing -> mark all hunks conflict
          if (filePatch.hunks) {
            for (const h of filePatch.hunks) {
              conflicts.push({ filePath: filePatch.filePath, hunkId: h.id, reason: 'file_missing' });
            }
          }
          continue;
        }

        if (!filePatch.hunks || filePatch.hunks.length === 0) continue;

        for (const h of filePatch.hunks) {
          const res = fuzzyLocateHunk(h, content);
          if (!res.found || res.confidence < 0.4) {
            conflicts.push({ filePath: filePatch.filePath, hunkId: h.id, reason: 'not_found_or_low_confidence' });
          }
        }

      } catch (err) {
        // On error, mark all hunks as conflict for that file
        if (filePatch.hunks) {
          for (const h of filePatch.hunks) {
            conflicts.push({ filePath: filePatch.filePath, hunkId: h.id, reason: 'error_loading_file' });
          }
        }
      }
    }

    resolve({ sessionId: session.id, conflicts });
  });
}
