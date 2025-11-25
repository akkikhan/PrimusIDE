import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../shared/ipcChannels.js';
import { ContextGatherRequest, ContextGatherResponse, ContextModuleResult, approxTokensFromText } from '../../shared/aiContext.js';
import { contextManager } from '../services/ContextManager.js';
import * as fs from 'fs/promises';

// Helper to truncate text to budget
function truncate(text: string, budgetTokens: number): { text: string, truncated: boolean, tokens: number } {
    let tokens = approxTokensFromText(text);
    if (tokens <= budgetTokens) {
        return { text, truncated: false, tokens };
    }
    // Truncate (rough char approximation)
    const allowedChars = budgetTokens * 4;
    const truncatedText = text.slice(0, allowedChars) + '\n... (truncated)';
    return { text: truncatedText, truncated: true, tokens: budgetTokens };
}

async function handleContextGather(_evt: any, req: ContextGatherRequest): Promise<ContextGatherResponse> {
    const start = Date.now();
    const modulesIncluded: ContextModuleResult[] = [];
    const droppedModules: string[] = [];
    const timings: { id: string, ms: number }[] = [];

    let remainingBudget = req.budgetTokens || 4000;

    // 1. Pinned Items (Highest Priority)
    if (remainingBudget > 0) {
        const tStart = Date.now();
        const pinned = contextManager.getPinnedItems();
        if (pinned.length > 0) {
            let combinedPinnedText = '';
            let pinnedTokens = 0;

            for (const item of pinned) {
                // For now, combine all pinned items into one "module" or list them separately?
                // Let's create a single 'pinned' module output for simplicity in this iteration,
                // or multiple if the UI expects it. The spec implies "Pinned Context list".
                // We'll bundle them into one block for the prompt.
                combinedPinnedText += `--- Pinned: ${item.type} (${item.id}) ---\n${item.content}\n\n`;
            }

            const { text, truncated, tokens } = truncate(combinedPinnedText, remainingBudget);
            if (tokens > 0) {
                modulesIncluded.push({
                    id: 'pinned',
                    tokensApprox: tokens,
                    truncated,
                    text: text,
                    meta: { count: pinned.length, items: pinned.map(p => ({ id: p.id, type: p.type })) }
                });
                remainingBudget -= tokens;
            }
        }
        timings.push({ id: 'pinned', ms: Date.now() - tStart });
    }

    // 2. Selection (Request provided)
    if (req.modules.includes('selection') && req.selectionText && remainingBudget > 0) {
        const tStart = Date.now();
        const { text, truncated, tokens } = truncate(req.selectionText, remainingBudget);
        modulesIncluded.push({
            id: 'selection',
            tokensApprox: tokens,
            truncated,
            text,
            meta: {}
        });
        remainingBudget -= tokens;
        timings.push({ id: 'selection', ms: Date.now() - tStart });
    } else if (req.modules.includes('selection')) {
        droppedModules.push('selection');
    }

    // 3. Diagnostics (Request provided)
    if (req.modules.includes('diagnostics') && req.diagnosticsSummary && remainingBudget > 0) {
        const tStart = Date.now();
        const { text, truncated, tokens } = truncate(req.diagnosticsSummary, remainingBudget);
         modulesIncluded.push({
            id: 'diagnostics',
            tokensApprox: tokens,
            truncated,
            text,
            meta: {}
        });
        remainingBudget -= tokens;
        timings.push({ id: 'diagnostics', ms: Date.now() - tStart });
    } else if (req.modules.includes('diagnostics')) {
        droppedModules.push('diagnostics');
    }

    // 4. Current File (Read from disk)
    if (req.modules.includes('current-file') && req.currentFilePath && remainingBudget > 0) {
        const tStart = Date.now();
        try {
            const content = await fs.readFile(req.currentFilePath, 'utf8');
            // Reserve some budget for file path header
            const { text, truncated, tokens } = truncate(content, remainingBudget);
            modulesIncluded.push({
                id: 'current-file',
                tokensApprox: tokens,
                truncated,
                text: `File: ${req.currentFilePath}\n${text}`,
                meta: { path: req.currentFilePath }
            });
            remainingBudget -= tokens;
        } catch (e) {
            console.warn('[AIContext] Failed to read current file', e);
            droppedModules.push('current-file');
        }
        timings.push({ id: 'current-file', ms: Date.now() - tStart });
    } else if (req.modules.includes('current-file')) {
        droppedModules.push('current-file');
    }

    // 5. Related Tests (Stub)
    if (req.modules.includes('related-tests') && remainingBudget > 0) {
        droppedModules.push('related-tests'); // Not implemented yet
    }

    // 6. Retrieval (Stub/Existing)
    if (req.modules.includes('retrieval') && remainingBudget > 0) {
         droppedModules.push('retrieval'); // Not implemented in this handler yet
    }

    return {
        modules: modulesIncluded,
        totalTokens: modulesIncluded.reduce((acc, m) => acc + m.tokensApprox, 0),
        dropped: droppedModules,
        budgetTokens: req.budgetTokens,
        totalMs: Date.now() - start,
        moduleTimings: timings
    };
}

export function registerAIContextHandlers() {
    // Context Gathering
    ipcMain.handle(IPC_CHANNELS.AI_CONTEXT_GATHER, handleContextGather);

    // Pinning Actions
    ipcMain.handle(IPC_CHANNELS.AI_PIN_ADD, async (_evt, item: any) => {
        return await contextManager.pinItem(item);
    });

    ipcMain.handle(IPC_CHANNELS.AI_PIN_REMOVE, async (_evt, id: string) => {
        return await contextManager.unpinItem(id);
    });

    ipcMain.handle(IPC_CHANNELS.AI_PIN_LIST, async () => {
        return contextManager.getPinnedItems();
    });

    // Load initial state
    contextManager.load().catch(e => console.error('[AIContext] Failed to load pinned items', e));
}
