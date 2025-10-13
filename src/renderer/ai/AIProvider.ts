import { AIConfigManager, AIProviderConfig } from '../config/aiConfig';
import { ProjectIndexer } from '../indexing/ProjectIndexer';
import { SymbolKind } from '../indexing/types';

export class AIProvider {
  private configManager: AIConfigManager;
  private projectIndexer: ProjectIndexer;

  constructor() {
    this.configManager = AIConfigManager.getInstance();
    this.projectIndexer = ProjectIndexer.getInstance();
  }

  private getActiveProviderConfig(): AIProviderConfig | null {
    const config = this.configManager.getConfig();
    const defaultProviderId = config.defaultProvider;
    const providerConfig = config.providers[defaultProviderId as keyof typeof config.providers];

    if (providerConfig && providerConfig.enabled) {
      return providerConfig;
    }
    
    // Fallback to the first enabled provider if the default is not available
    for (const providerId in config.providers) {
      const p = config.providers[providerId as keyof typeof config.providers];
      if (p.enabled) {
        return p;
      }
    }

    return null;
  }

  public async generateCompletion(prompt: string): Promise<string | null> {
    const providerConfig = this.getActiveProviderConfig();
    if (!providerConfig) {
      console.warn('No active AI provider found.');
      return null;
    }

    const projectContext = this.getProjectContext();
    const fullPrompt = `${projectContext}\n\n---\n\n${prompt}`;

    const { baseUrl, apiKey, model } = providerConfig;
    const endpoint = baseUrl || 'https://api.openai.com/v1/completions';

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model || 'text-davinci-003',
          prompt: fullPrompt,
          max_tokens: 150, // Increased for more complex completions
          temperature: 0.2,
          stop: ['\n'],
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0]?.text?.trim() || null;
    } catch (error) {
      console.error('Error generating completion:', error);
      return null;
    }
  }

  private getProjectContext(): string {
    const index = this.projectIndexer.getIndex();
    if (!index || index.symbols.length === 0) {
      return 'Project context is not yet available.';
    }

    let context = 'Project Symbols:\n';
    // Limit the number of symbols to avoid overly long prompts
    const maxSymbols = 100; 
    const symbolsToShow = index.symbols.slice(0, maxSymbols);

    for (const symbol of symbolsToShow) {
      context += `- ${symbol.name} (type: ${symbol.kind}, path: ${symbol.path})\n`;
    }

    if (index.symbols.length > maxSymbols) {
      context += `... and ${index.symbols.length - maxSymbols} more symbols.\n`;
    }

    return context;
  }
}
