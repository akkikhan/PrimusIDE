/**
 * Central command registry (singleton). Provides register/execute APIs,
 * category grouping, recent usage tracking, and simple event subscription.
 */
export class CommandRegistry {
    static _instance;
    commands = new Map();
    recent = [];
    listeners = new Set();
    maxRecent = 30;
    constructor() { }
    static get instance() {
        if (!this._instance)
            this._instance = new CommandRegistry();
        return this._instance;
    }
    subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }
    notify() {
        for (const l of this.listeners)
            l();
    }
    register(cmd) {
        if (this.commands.has(cmd.id)) {
            console.warn(`[CommandRegistry] Replacing existing command: ${cmd.id}`);
        }
        this.commands.set(cmd.id, cmd);
        this.notify();
        return () => this.unregister(cmd.id);
    }
    unregister(id) {
        if (this.commands.delete(id))
            this.notify();
    }
    execute(id) {
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
            const seen = new Set();
            this.recent = this.recent.filter(r => {
                if (seen.has(r.id))
                    return false;
                seen.add(r.id);
                return true;
            }).slice(0, this.maxRecent);
        }
        catch (err) {
            console.error(`[CommandRegistry] Error executing ${id}:`, err);
        }
    }
    list(includeHidden = false) {
        return Array.from(this.commands.values()).filter(c => includeHidden || !c.hidden);
    }
    get(id) {
        return this.commands.get(id);
    }
    getRecent() {
        const lookup = new Map(this.commands);
        return this.recent
            .map(r => lookup.get(r.id))
            .filter((c) => !!c);
    }
}
export const globalCommandRegistry = CommandRegistry.instance;
