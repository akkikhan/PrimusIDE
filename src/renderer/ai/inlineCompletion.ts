import * as monaco from 'monaco-editor';
import { BaseAIProvider } from './providers';
import { AIConfigManager, AIConfig } from '../config/aiConfig';

/**
 * AI-powered code completion provider for Monaco Editor
 * Integrates with multiple AI providers to offer intelligent code suggestions
 */
export class AICompletionProvider implements monaco.languages.CompletionItemProvider {
  private aiProviders: Map<string, BaseAIProvider>;
  private configManager: AIConfigManager;
  private debounceTimer: NodeJS.Timeout | null = null;
  private cache: Map<string, monaco.languages.CompletionItem[]> = new Map();

  constructor() {
    this.aiProviders = new Map();
    this.configManager = AIConfigManager.getInstance();
    this.initializeProviders();
  }

  private async initializeProviders() {
    try {
      const config = this.configManager.getConfig();
      // Dynamically import providers to avoid circular dependencies
      const { OpenAIProvider, ClaudeProvider, OllamaProvider, DeepSeekProvider } = await import('./providers');
      
      this.aiProviders.set('openai', new OpenAIProvider(config.providers.openai));
      this.aiProviders.set('claude', new ClaudeProvider(config.providers.claude));
      this.aiProviders.set('ollama', new OllamaProvider(config.providers.ollama));
      this.aiProviders.set('deepseek', new DeepSeekProvider(config.providers.deepseek));
    } catch (error) {
      console.warn('Failed to initialize AI providers:', error);
    }
  }

  get triggerCharacters(): string[] {
    return ['.', '(', '[', '{', ' ', '\n'];
  }

  async provideCompletionItems(
    model: monaco.editor.ITextModel,
    position: monaco.Position,
    context: monaco.languages.CompletionContext
  ): Promise<monaco.languages.CompletionList | null> {
    const config = this.configManager.getConfig();
    
    // Check if AI completion is enabled
    if (!config.features.autoComplete) {
      return null;
    }

    // Get current provider
    const provider = this.aiProviders.get(config.defaultProvider);
    if (!provider) {
      return null;
    }

    try {
      // Get context around cursor
      const contextRange = this.getContextRange(model, position);
      const contextText = model.getValueInRange(contextRange);
      const language = model.getLanguageId();
      
      // Check cache first
      const cacheKey = `${language}:${contextText}:${position.lineNumber}:${position.column}`;
      if (this.cache.has(cacheKey)) {
        return {
          suggestions: this.cache.get(cacheKey)!,
          incomplete: false
        };
      }

      // Debounce AI requests
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }

      return new Promise((resolve) => {
        this.debounceTimer = setTimeout(async () => {
          try {
            const completions = await this.getAICompletions(
              provider,
              contextText,
              language,
              position,
              model
            );
            
            // Cache results
            this.cache.set(cacheKey, completions);
            
            // Limit cache size
            if (this.cache.size > 100) {
              const firstKey = this.cache.keys().next().value;
              if (firstKey) {
                this.cache.delete(firstKey);
              }
            }

            resolve({
              suggestions: completions,
              incomplete: false
            });
          } catch (error) {
            console.warn('AI completion failed:', error);
            resolve(null);
          }
        }, 300); // 300ms debounce
      });
    } catch (error) {
      console.warn('Error in AI completion:', error);
      return null;
    }
  }

  private getContextRange(model: monaco.editor.ITextModel, position: monaco.Position): monaco.IRange {
    const lineCount = model.getLineCount();
    const currentLine = position.lineNumber;
    
    // Get context from 10 lines before to 5 lines after
    const startLine = Math.max(1, currentLine - 10);
    const endLine = Math.min(lineCount, currentLine + 5);
    
    return {
      startLineNumber: startLine,
      startColumn: 1,
      endLineNumber: endLine,
      endColumn: model.getLineMaxColumn(endLine)
    };
  }

  private async getAICompletions(
    provider: BaseAIProvider,
    contextText: string,
    language: string,
    position: monaco.Position,
    model: monaco.editor.ITextModel
  ): Promise<monaco.languages.CompletionItem[]> {
    const prompt = this.buildCompletionPrompt(contextText, language, position);
    
    try {
      const completionResponse = await provider.generateCompletion({
        prompt,
        code: contextText,
        language,
        cursorPosition: position.column,
        maxTokens: 100,
        temperature: 0.3
      });

      const completion = completionResponse.completion;

      if (!completion || !completion.trim()) {
        return [];
      }

      // Parse AI response into Monaco completion items
      return this.parseAIResponse(completion, position, model);
    } catch (error) {
      console.warn(`AI completion failed with ${provider.constructor.name}:`, error);
      return [];
    }
  }

  private buildCompletionPrompt(contextText: string, language: string, position: monaco.Position): string {
    return `You are an intelligent code completion assistant. Given the following ${language} code context, provide a single, relevant completion for the cursor position.

Context:
\`\`\`${language}
${contextText}
\`\`\`

Provide only the completion text, no explanations or additional formatting. The completion should:
1. Be syntactically correct
2. Follow ${language} best practices
3. Be contextually relevant
4. Be concise and useful

Completion:`;
  }

  private parseAIResponse(
    response: string,
    position: monaco.Position,
    model: monaco.editor.ITextModel
  ): monaco.languages.CompletionItem[] {
    const completions: monaco.languages.CompletionItem[] = [];
    
    // Clean up the response
    const cleanResponse = response.trim()
      .replace(/^```\w*\n?/, '')  // Remove code block start
      .replace(/\n?```$/, '')     // Remove code block end
      .trim();

    if (!cleanResponse) {
      return completions;
    }

    // Split into lines for multi-line completions
    const lines = cleanResponse.split('\n');
    
    // Create completion items
    lines.forEach((line, index) => {
      if (line.trim()) {
        const completion: monaco.languages.CompletionItem = {
          label: line.trim(),
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: line,
          detail: 'AI Suggestion',
          documentation: 'AI-generated completion',
          range: {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: position.column,
            endColumn: position.column
          },
          sortText: `ai-${index.toString().padStart(3, '0')}`
        };
        
        completions.push(completion);
      }
    });

    // If single line, also create a snippet version
    if (lines.length === 1 && cleanResponse.length > 5) {
      completions.push({
        label: `✨ ${cleanResponse.substring(0, 30)}${cleanResponse.length > 30 ? '...' : ''}`,
        kind: monaco.languages.CompletionItemKind.Snippet,
        insertText: cleanResponse,
        detail: 'AI Code Completion',
        documentation: 'Multi-line AI-generated completion',
        range: {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: position.column,
          endColumn: position.column
        },
        sortText: 'ai-000-priority'
      });
    }

    return completions;
  }

  dispose() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.cache.clear();
  }
}

/**
 * AI-powered hover provider for Monaco Editor
 * Provides intelligent documentation and type information
 */
export class AIHoverProvider implements monaco.languages.HoverProvider {
  private aiProviders: Map<string, BaseAIProvider>;
  private configManager: AIConfigManager;
  private cache: Map<string, monaco.languages.Hover> = new Map();

  constructor() {
    this.aiProviders = new Map();
    this.configManager = AIConfigManager.getInstance();
    this.initializeProviders();
  }

  private async initializeProviders() {
    try {
      const config = this.configManager.getConfig();
      const { OpenAIProvider, ClaudeProvider, OllamaProvider, DeepSeekProvider } = await import('./providers');
      
      this.aiProviders.set('openai', new OpenAIProvider(config.providers.openai));
      this.aiProviders.set('claude', new ClaudeProvider(config.providers.claude));
      this.aiProviders.set('ollama', new OllamaProvider(config.providers.ollama));
      this.aiProviders.set('deepseek', new DeepSeekProvider(config.providers.deepseek));
    } catch (error) {
      console.warn('Failed to initialize AI hover providers:', error);
    }
  }

  async provideHover(
    model: monaco.editor.ITextModel,
    position: monaco.Position
  ): Promise<monaco.languages.Hover | null> {
    const config = this.configManager.getConfig();
    
    // Check if AI hover is enabled  
    if (!config.features.chatAssistant) {
      return null;
    }

    const provider = this.aiProviders.get(config.defaultProvider);
    if (!provider) {
      return null;
    }

    try {
      // Get word at position
      const word = model.getWordAtPosition(position);
      if (!word) {
        return null;
      }

      // Check cache
      const language = model.getLanguageId();
      const cacheKey = `${language}:${word.word}`;
      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey)!;
      }

      // Get context
      const contextRange = this.getContextRange(model, position);
      const contextText = model.getValueInRange(contextRange);

      // Build hover prompt
      const prompt = `You are a code documentation assistant. Given the following ${language} code context, provide brief documentation for the identifier "${word.word}".

Context:
\`\`\`${language}
${contextText}
\`\`\`

Provide concise documentation for "${word.word}" including:
1. What it is (function, variable, class, etc.)
2. Its purpose or functionality
3. Parameters (if applicable)
4. Return value (if applicable)

Keep it brief and focused. Use markdown formatting.

Documentation:`;

      // Get AI response
      const completionResponse = await provider.generateCompletion({
        prompt,
        code: contextText,
        language,
        cursorPosition: position.column,
        maxTokens: 200,
        temperature: 0.2
      });

      const documentation = completionResponse.completion;

      if (!documentation || !documentation.trim()) {
        return null;
      }

      // Create hover result
      const hover: monaco.languages.Hover = {
        range: {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn
        },
        contents: [
          { value: `**${word.word}** (AI Documentation)` },
          { value: documentation.trim() }
        ]
      };

      // Cache the result
      this.cache.set(cacheKey, hover);
      
      // Limit cache size
      if (this.cache.size > 50) {
        const firstKey = this.cache.keys().next().value;
        if (firstKey) {
          this.cache.delete(firstKey);
        }
      }

      return hover;
    } catch (error) {
      console.warn('AI hover failed:', error);
      return null;
    }
  }

  private getContextRange(model: monaco.editor.ITextModel, position: monaco.Position): monaco.IRange {
    const lineCount = model.getLineCount();
    const currentLine = position.lineNumber;
    
    // Get smaller context for hover (5 lines before and after)
    const startLine = Math.max(1, currentLine - 5);
    const endLine = Math.min(lineCount, currentLine + 5);
    
    return {
      startLineNumber: startLine,
      startColumn: 1,
      endLineNumber: endLine,
      endColumn: model.getLineMaxColumn(endLine)
    };
  }

  dispose() {
    this.cache.clear();
  }
}

// Global instances for registration
let completionProvider: AICompletionProvider | null = null;
let hoverProvider: AIHoverProvider | null = null;

/**
 * Register AI providers with Monaco Editor
 */
export function registerAIProviders() {
  // Dispose existing providers
  if (completionProvider) {
    completionProvider.dispose();
  }
  if (hoverProvider) {
    hoverProvider.dispose();
  }

  // Create new providers
  completionProvider = new AICompletionProvider();
  hoverProvider = new AIHoverProvider();

  // Register with Monaco for all languages
  const languages = ['typescript', 'javascript', 'python', 'java', 'csharp', 'cpp', 'rust', 'go', 'html', 'css', 'json', 'markdown'];
  
  languages.forEach(languageId => {
    monaco.languages.registerCompletionItemProvider(languageId, completionProvider!);
    monaco.languages.registerHoverProvider(languageId, hoverProvider!);
  });

}

/**
 * Unregister AI providers
 */
export function unregisterAIProviders() {
  if (completionProvider) {
    completionProvider.dispose();
    completionProvider = null;
  }
  if (hoverProvider) {
    hoverProvider.dispose();
    hoverProvider = null;
  }
}
