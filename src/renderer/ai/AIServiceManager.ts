/**
 * AI Service Integration Backend
 * Handles connections to multiple AI providers: Claude, GPT, Gemini, Azure AI
 */

import axios, { AxiosRequestConfig } from 'axios';

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIResponse {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model?: string;
  provider: 'claude' | 'gpt' | 'gemini' | 'azure';
}

export interface AIServiceConfig {
  claude?: {
    apiKey: string;
    model: string;
    maxTokens: number;
  };
  openai?: {
    apiKey: string;
    model: string;
    maxTokens: number;
  };
  gemini?: {
    apiKey: string;
    model: string;
    maxTokens: number;
  };
  azure?: {
    apiKey: string;
    endpoint: string;
    model: string;
    maxTokens: number;
  };
}

export class AIServiceManager {
  private config: AIServiceConfig;

  constructor(config: AIServiceConfig) {
    this.config = config;
  }

  /**
   * Send message to Claude (Anthropic)
   */
  async sendToClaude(messages: AIMessage[]): Promise<AIResponse> {
    if (!this.config.claude?.apiKey) {
      throw new Error('Claude API key not configured');
    }

    const requestConfig: AxiosRequestConfig = {
      method: 'POST',
      url: 'https://api.anthropic.com/v1/messages',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.claude.apiKey,
        'anthropic-version': '2023-06-01'
      },
      data: {
        model: this.config.claude.model || 'claude-3-5-sonnet-20241022',
        max_tokens: this.config.claude.maxTokens || 4000,
        messages: messages.map(msg => ({
          role: msg.role === 'system' ? 'user' : msg.role,
          content: msg.content
        }))
      }
    };

    try {
      const response = await axios(requestConfig);
      return {
        content: response.data.content[0].text,
        usage: response.data.usage,
        model: response.data.model,
        provider: 'claude'
      };
    } catch (error: any) {
      throw new Error(`Claude API error: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Send message to GPT (OpenAI)
   */
  async sendToGPT(messages: AIMessage[]): Promise<AIResponse> {
    if (!this.config.openai?.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const requestConfig: AxiosRequestConfig = {
      method: 'POST',
      url: 'https://api.openai.com/v1/chat/completions',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.openai.apiKey}`
      },
      data: {
        model: this.config.openai.model || 'gpt-4o',
        messages: messages,
        max_tokens: this.config.openai.maxTokens || 4000,
        temperature: 0.7,
        stream: false
      }
    };

    try {
      const response = await axios(requestConfig);
      const choice = response.data.choices[0];
      
      return {
        content: choice.message.content,
        usage: response.data.usage,
        model: response.data.model,
        provider: 'gpt'
      };
    } catch (error: any) {
      throw new Error(`OpenAI API error: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Send message to Gemini (Google)
   */
  async sendToGemini(messages: AIMessage[]): Promise<AIResponse> {
    if (!this.config.gemini?.apiKey) {
      throw new Error('Gemini API key not configured');
    }

    const model = this.config.gemini.model || 'gemini-1.5-pro';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.config.gemini.apiKey}`;

    // Convert messages to Gemini format
    const contents = messages
      .filter(msg => msg.role !== 'system')
      .map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }));

    const requestConfig: AxiosRequestConfig = {
      method: 'POST',
      url: url,
      headers: {
        'Content-Type': 'application/json'
      },
      data: {
        contents: contents,
        generationConfig: {
          maxOutputTokens: this.config.gemini.maxTokens || 4000,
          temperature: 0.7
        }
      }
    };

    try {
      const response = await axios(requestConfig);
      const candidate = response.data.candidates[0];
      
      return {
        content: candidate.content.parts[0].text,
        usage: {
          prompt_tokens: response.data.usageMetadata?.promptTokenCount || 0,
          completion_tokens: response.data.usageMetadata?.candidatesTokenCount || 0,
          total_tokens: response.data.usageMetadata?.totalTokenCount || 0
        },
        model: model,
        provider: 'gemini'
      };
    } catch (error: any) {
      throw new Error(`Gemini API error: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Send message to Azure OpenAI
   */
  async sendToAzure(messages: AIMessage[]): Promise<AIResponse> {
    if (!this.config.azure?.apiKey || !this.config.azure?.endpoint) {
      throw new Error('Azure OpenAI API key or endpoint not configured');
    }

    const deploymentName = this.config.azure.model || 'gpt-4o';
    const url = `${this.config.azure.endpoint}/openai/deployments/${deploymentName}/chat/completions?api-version=2024-02-01`;

    const requestConfig: AxiosRequestConfig = {
      method: 'POST',
      url: url,
      headers: {
        'Content-Type': 'application/json',
        'api-key': this.config.azure.apiKey
      },
      data: {
        messages: messages,
        max_tokens: this.config.azure.maxTokens || 4000,
        temperature: 0.7,
        stream: false
      }
    };

    try {
      const response = await axios(requestConfig);
      const choice = response.data.choices[0];
      
      return {
        content: choice.message.content,
        usage: response.data.usage,
        model: deploymentName,
        provider: 'azure'
      };
    } catch (error: any) {
      throw new Error(`Azure OpenAI API error: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Send message to specified AI provider
   */
  async sendMessage(
    provider: 'claude' | 'gpt' | 'gemini' | 'azure',
    messages: AIMessage[]
  ): Promise<AIResponse> {
    switch (provider) {
      case 'claude':
        return this.sendToClaude(messages);
      case 'gpt':
        return this.sendToGPT(messages);
      case 'gemini':
        return this.sendToGemini(messages);
      case 'azure':
        return this.sendToAzure(messages);
      default:
        throw new Error(`Unsupported AI provider: ${provider}`);
    }
  }

  /**
   * Test connection to all configured providers
   */
  async testConnections(): Promise<{ [key: string]: boolean }> {
    const results: { [key: string]: boolean } = {};
    
    const testMessage: AIMessage[] = [
      { role: 'user', content: 'Hello, this is a test message.' }
    ];

    // Test Claude
    if (this.config.claude?.apiKey) {
      try {
        await this.sendToClaude(testMessage);
        results.claude = true;
      } catch {
        results.claude = false;
      }
    }

    // Test OpenAI
    if (this.config.openai?.apiKey) {
      try {
        await this.sendToGPT(testMessage);
        results.gpt = true;
      } catch {
        results.gpt = false;
      }
    }

    // Test Gemini
    if (this.config.gemini?.apiKey) {
      try {
        await this.sendToGemini(testMessage);
        results.gemini = true;
      } catch {
        results.gemini = false;
      }
    }

    // Test Azure
    if (this.config.azure?.apiKey && this.config.azure?.endpoint) {
      try {
        await this.sendToAzure(testMessage);
        results.azure = true;
      } catch {
        results.azure = false;
      }
    }

    return results;
  }

  /**
   * Get available providers based on configuration
   */
  getAvailableProviders(): Array<'claude' | 'gpt' | 'gemini' | 'azure'> {
    const providers: Array<'claude' | 'gpt' | 'gemini' | 'azure'> = [];
    
    if (this.config.claude?.apiKey) providers.push('claude');
    if (this.config.openai?.apiKey) providers.push('gpt');
    if (this.config.gemini?.apiKey) providers.push('gemini');
    if (this.config.azure?.apiKey && this.config.azure?.endpoint) providers.push('azure');
    
    return providers;
  }

  /**
   * Update configuration for a specific provider
   */
  updateProviderConfig(provider: keyof AIServiceConfig, config: any): void {
    this.config[provider] = { ...this.config[provider], ...config };
  }

  /**
   * Parse code blocks from AI response
   */
  parseCodeBlocks(content: string): Array<{ language: string; code: string; file?: string }> {
    const codeBlockRegex = /```(\w+)?\n?([\s\S]*?)```/g;
    const blocks: Array<{ language: string; code: string; file?: string }> = [];
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      const language = match[1] || 'text';
      const code = match[2].trim();
      
      // Try to detect file path from comments or context
      const fileMatch = code.match(/^\/\/ (.+\.\w+)$|^# (.+\.\w+)$|^<!-- (.+\.\w+) -->/m);
      const file = fileMatch ? (fileMatch[1] || fileMatch[2] || fileMatch[3]) : undefined;
      
      blocks.push({ language, code, file });
    }

    return blocks;
  }
}

// Export singleton instance for global use
let aiServiceInstance: AIServiceManager | null = null;

export const getAIService = (config?: AIServiceConfig): AIServiceManager => {
  if (!aiServiceInstance && config) {
    aiServiceInstance = new AIServiceManager(config);
  }
  if (!aiServiceInstance) {
    throw new Error('AI Service not initialized. Call with config first.');
  }
  return aiServiceInstance;
};

export const initializeAIService = (config: AIServiceConfig): AIServiceManager => {
  aiServiceInstance = new AIServiceManager(config);
  return aiServiceInstance;
};
