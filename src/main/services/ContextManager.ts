import { PinnedContextItem } from '../../shared/aiContext.js';
import * as fs from 'fs/promises';
import * as path from 'path';

export class ContextManager {
  private pinnedItems: Map<string, PinnedContextItem> = new Map();
  private persistPath: string | null = null;
  private dirty = false;

  constructor() {
    // Attempt to locate a persistence path
    try {
      if (process.env.APPDATA || process.env.HOME) {
        // This is a rough heuristic. In a real app we'd pass userData path from main.ts
        // But for now, let's just keep it in memory or use a local artifact file if in dev
        if (process.cwd()) {
            this.persistPath = path.join(process.cwd(), 'artifacts', 'ai', 'pinned_context.json');
        }
      }
    } catch(e) {
      console.warn('[ContextManager] Failed to determine persistence path', e);
    }
  }

  public async load() {
    if (!this.persistPath) return;
    try {
      const exists = await fs.stat(this.persistPath).then(() => true).catch(() => false);
      if (exists) {
        const content = await fs.readFile(this.persistPath, 'utf8');
        const data = JSON.parse(content);
        if (Array.isArray(data)) {
            this.pinnedItems.clear();
            for (const item of data) {
                this.pinnedItems.set(item.id, item);
            }
        }
      }
    } catch (e) {
        console.warn('[ContextManager] Failed to load pinned items', e);
    }
  }

  public async save() {
    if (!this.persistPath || !this.dirty) return;
    try {
        const dir = path.dirname(this.persistPath);
        await fs.mkdir(dir, { recursive: true });
        const data = Array.from(this.pinnedItems.values());
        await fs.writeFile(this.persistPath, JSON.stringify(data, null, 2), 'utf8');
        this.dirty = false;
    } catch (e) {
        console.warn('[ContextManager] Failed to save pinned items', e);
    }
  }

  public async pinItem(item: PinnedContextItem) {
    this.pinnedItems.set(item.id, item);
    this.dirty = true;
    await this.save();
    return true;
  }

  public async unpinItem(id: string) {
    const deleted = this.pinnedItems.delete(id);
    if (deleted) {
        this.dirty = true;
        await this.save();
    }
    return deleted;
  }

  public getPinnedItems(): PinnedContextItem[] {
    return Array.from(this.pinnedItems.values());
  }

  public clear() {
    this.pinnedItems.clear();
    this.dirty = true;
    this.save();
  }
}

export const contextManager = new ContextManager();
