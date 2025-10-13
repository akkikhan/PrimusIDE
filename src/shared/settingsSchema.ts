/**
 * Centralized settings schema & helpers.
 * Goal: Replace ad-hoc localStorage key usage (quickAI.*, layout.*, primus-*) with a typed, evolvable schema.
 * Versioned so future migrations are deterministic. Only renderer should directly call browser storage;
 * main process can request settings via IPC (future enhancement) if needed.
 */

export type QuickAISettings = {
  collapsed: boolean;
  providerHint?: string;
  includeContext: boolean;
  useStreaming: boolean;
  contextModules: string[]; // list of enabled module identifiers
};

export type LayoutSettings = {
  sidebarWidth: number; // px
};

export type ThemeSettings = {
  theme: string; // 'light' | 'dark' | custom id
};

export interface RootSettings {
  version: 1;
  quickAI: QuickAISettings;
  layout: LayoutSettings;
  theme: ThemeSettings;
  app?: { autoUpdateEnabled?: boolean }; // optional until migration
  ai?: { embeddingProvider?: string; embeddingBatchSize?: number };
}

export const DEFAULT_SETTINGS: RootSettings = {
  version: 1,
  quickAI: {
    collapsed: false,
    providerHint: undefined,
    includeContext: false,
    useStreaming: true,
    contextModules: ['selection', 'diagnostics', 'current-file'],
  },
  layout: {
    sidebarWidth: 240,
  },
  theme: {
    theme: 'dark',
  },
  app: { autoUpdateEnabled: false },
  ai: { embeddingProvider: 'hashPlaceholder', embeddingBatchSize: 16 }
};

// Keys previously used individually; retained for backward compatibility migration.
const LEGACY_KEYS = {
  collapsed: 'quickAI.collapsed',
  providerHint: 'quickAI.providerHint',
  includeContext: 'quickAI.includeContext',
  useStreaming: 'quickAI.useStreaming',
  contextModules: 'quickAI.contextModules',
  sidebarWidth: 'layout.sidebarWidth',
  theme: 'primus-theme',
};

const ROOT_KEY = 'primus.settings';

function safeParse<T>(raw: string | null): T | undefined {
  if (!raw) return undefined;
  try { return JSON.parse(raw) as T; } catch { return undefined; }
}

export function loadSettings(): RootSettings {
  try {
    const existing = safeParse<RootSettings>(localStorage.getItem(ROOT_KEY));
    if (existing && existing.version === 1) {
      return patchDefaults(existing);
    }
    // Attempt migration from legacy scattered keys.
    const migrated = migrateFromLegacy();
    persistSettings(migrated);
    return migrated;
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function patchDefaults(s: RootSettings): RootSettings {
  // Ensure any new fields added in future minor tweaks (within same version) are defaulted.
  return {
    ...DEFAULT_SETTINGS,
    ...s,
    quickAI: { ...DEFAULT_SETTINGS.quickAI, ...s.quickAI },
    layout: { ...DEFAULT_SETTINGS.layout, ...s.layout },
    theme: { ...DEFAULT_SETTINGS.theme, ...s.theme },
    app: { ...DEFAULT_SETTINGS.app, ...(s.app||{}) },
    ai: { ...DEFAULT_SETTINGS.ai, ...(s.ai||{}) }
  };
}

function migrateFromLegacy(): RootSettings {
  const base = { ...DEFAULT_SETTINGS };
  try {
    const g = (k: string) => localStorage.getItem(k);
    const collapsed = g(LEGACY_KEYS.collapsed);
    if (collapsed) base.quickAI.collapsed = collapsed === '1';
    const providerHint = g(LEGACY_KEYS.providerHint) || undefined;
    if (providerHint) base.quickAI.providerHint = providerHint;
    const includeContext = g(LEGACY_KEYS.includeContext);
    if (includeContext) base.quickAI.includeContext = includeContext === '1';
    const useStreaming = g(LEGACY_KEYS.useStreaming);
    if (useStreaming) base.quickAI.useStreaming = useStreaming !== '0';
    const contextModulesRaw = g(LEGACY_KEYS.contextModules);
    if (contextModulesRaw) {
      try {
        const arr = JSON.parse(contextModulesRaw);
        if (Array.isArray(arr)) base.quickAI.contextModules = arr.filter(x => typeof x === 'string');
      } catch { /* ignore */ }
    }
    const sidebarWidth = g(LEGACY_KEYS.sidebarWidth);
    if (sidebarWidth) {
      const n = parseInt(sidebarWidth, 10);
      if (!isNaN(n)) base.layout.sidebarWidth = n;
    }
    const theme = g(LEGACY_KEYS.theme);
    if (theme) base.theme.theme = theme;
  } catch { /* ignore */ }
  return base;
}

export function persistSettings(settings: RootSettings) {
  try {
    localStorage.setItem(ROOT_KEY, JSON.stringify(settings));
  } catch { /* ignore */ }
}

// Focused update helpers to reduce re-read boilerplate in components.
export function updateQuickAI(partial: Partial<QuickAISettings>): RootSettings {
  const current = loadSettings();
  const next: RootSettings = { ...current, quickAI: { ...current.quickAI, ...partial } };
  persistSettings(next);
  return next;
}

export function updateLayout(partial: Partial<LayoutSettings>): RootSettings {
  const current = loadSettings();
  const next: RootSettings = { ...current, layout: { ...current.layout, ...partial } };
  persistSettings(next);
  return next;
}

export function updateTheme(partial: Partial<ThemeSettings>): RootSettings {
  const current = loadSettings();
  const next: RootSettings = { ...current, theme: { ...current.theme, ...partial } };
  persistSettings(next);
  return next;
}

export function updateApp(partial: Partial<NonNullable<RootSettings['app']>>): RootSettings {
  const current = loadSettings();
  const next: RootSettings = { ...current, app: { ...(current.app||{}), ...partial } };
  persistSettings(next); return next;
}

export function validateSettings(s: unknown): s is RootSettings {
  if (!s || typeof s !== 'object') return false;
  const r = s as RootSettings;
  return r.version === 1 && !!r.quickAI && !!r.layout && !!r.theme;
}
