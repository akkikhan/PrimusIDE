
export interface RegisteredCommand {
  id: string;
  title: string;
  category: string;
  description?: string;
  keybinding?: string;
  action: () => void | Promise<void>;
  hidden?: boolean;
}

interface ExecutionRecord {
  id: string;
  timestamp: number;
}

/**
 * Central command registry (singleton). Provides register/execute APIs,
 * category grouping, recent usage tracking, and simple event subscription.
 */
export class CommandRegistry {
  private static _instance: CommandRegistry;
  private commands = new Map<string, RegisteredCommand>();
  private recent: ExecutionRecord[] = [];
  private listeners = new Set<() => void>();
  private maxRecent = 30;

  private constructor() {}

  static get instance(): CommandRegistry {
    if (!this._instance) this._instance = new CommandRegistry();
    return this._instance;
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    for (const l of this.listeners) l();
  }

  register(cmd: RegisteredCommand) {
    if (this.commands.has(cmd.id)) {
      console.warn(`[CommandRegistry] Replacing existing command: ${cmd.id}`);
    }
    this.commands.set(cmd.id, cmd);
    this.notify();
    return () => this.unregister(cmd.id);
  }

  unregister(id: string) {
    if (this.commands.delete(id)) this.notify();
  }

  execute(id: string) {
    const cmd = this.commands.get(id);
    if (!cmd) {
      console.warn(`[CommandRegistry] Command not found: ${id}`);
      return;
    }
    try {
      const result = cmd.action();
      if (result instanceof Promise) {
        result.catch(err => console.error(`[CommandRegistry] Error executing ${id}:`, err));
      }
      this.recent.unshift({ id, timestamp: Date.now() });
      // de-duplicate keeping most recent occurrence
      const seen = new Set<string>();
      this.recent = this.recent.filter(r => {
        if (seen.has(r.id)) return false;
        seen.add(r.id);
        return true;
      }).slice(0, this.maxRecent);
    } catch (err) {
      console.error(`[CommandRegistry] Error executing ${id}:`, err);
    }
  }

  list(includeHidden = false): RegisteredCommand[] {
    return Array.from(this.commands.values()).filter(c => includeHidden || !c.hidden);
  }

  get(id: string) {
    return this.commands.get(id);
  }

  getRecent(): RegisteredCommand[] {
    const lookup = new Map(this.commands);
    return this.recent
      .map(r => lookup.get(r.id))
      .filter((c): c is RegisteredCommand => !!c);
  }
}

export const globalCommandRegistry = CommandRegistry.instance;
