import { toolRegistry } from '../src/main/ai/toolRegistry';

describe('Patch Generator Tool', () => {
  test('invokes patch-generator with mock provider and returns multi-patch shape', async () => {
    const req = { id: `t_${Date.now()}`, operation: 'generate_patch', prompt: 'Create a simple change', providerHint: 'mock-local' } as any;
    const args = { description: 'Create a new helper function', targetFiles: ['src/utils/helper.ts'], providerId: 'mock-local' };

    const res = await toolRegistry.invoke('patch-generator', req, args);
    expect(res).toBeDefined();
    // When mock returns non-JSON, tool wraps into single-file replace patch
    expect(res.patches).toBeDefined();
    expect(Array.isArray(res.patches)).toBe(true);
    expect(res.id).toBeTruthy();
  });
});
