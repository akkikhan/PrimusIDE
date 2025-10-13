import { AIConfigManager } from '../../src/renderer/ai/AIConfigManager';

describe('AIConfigManager', () => {
  beforeEach(() => {
    AIConfigManager.__resetCacheForTests?.();
    if (typeof window !== 'undefined') {
      (window as any).primus = undefined;
    }
  });

  it('returns default config when bridge is unavailable', () => {
    const config = AIConfigManager.loadConfig();
    expect(config.claude.enabled).toBe(false);
    expect(config.openai.model).toBe('gpt-4o');
  });

  it('persists via bridge when available', async () => {
    const calls: any[] = [];
    if (typeof window !== 'undefined') {
      (window as any).primus = {
        ai: {
          getProviderConfigSync: () => AIConfigManager.getDefaultConfig(),
          saveProviderConfig: (cfg: any) => { calls.push(cfg); }
        }
      };
    }
    AIConfigManager.__resetCacheForTests?.();
    const config = AIConfigManager.loadConfig();
    config.claude.enabled = true;
    config.claude.apiKey = 'sk-ant-api03-test';
    AIConfigManager.saveConfig(config);
    expect(calls.length).toBe(1);
    expect(calls[0].claude.enabled).toBe(true);
  });
});
