import { codeApplicationManager, CodeChange } from './CodeApplicationManager';
import { getAIService, AIServiceManager } from '../ai/AIServiceManager';

type AIProvider = 'claude' | 'gpt' | 'gemini' | 'azure';

export interface CodeGenerationRequest {
  prompt: string;
  filePath: string;
  selectedText?: string;
  cursorPosition?: { line: number; column: number };
  insertMode?: 'replace' | 'insert' | 'append' | 'prepend';
  context?: {
    projectType?: string;
    language?: string;
    dependencies?: string[];
    openFiles?: string[];
  };
}

export interface CodeGenerationResult {
  success: boolean;
  changeId?: string;
  message: string;
  code?: string;
  error?: string;
}

class CodeApplicationService {
  /**
   * Generate code using AI and create a code change
   */
  async generateAndCreateChange(
    request: CodeGenerationRequest,
    provider: AIProvider
  ): Promise<CodeGenerationResult> {
    try {
      // Prepare the AI prompt with context
      const prompt = await this.preparePrompt(request);
      
      // Get code from AI
      const { AIConfigManager } = await import('../ai/AIConfigManager');
      const { initializeAIService } = await import('../ai/AIServiceManager');
      
      const config = AIConfigManager.getServiceConfig();
      const aiService = initializeAIService(config);
      
      const messages = [{ role: 'user' as const, content: prompt }];
      const aiResponse = await aiService.sendMessage(provider, messages);
      
      if (!aiResponse.content) {
        return {
          success: false,
          message: 'No response from AI service',
          error: 'Empty response'
        };
      }

      // Extract code from AI response
      const extractedCode = this.extractCodeFromResponse(aiResponse.content);
      
      if (!extractedCode) {
        return {
          success: false,
          message: 'No code found in AI response',
          error: 'No code blocks detected'
        };
      }

      // Determine change parameters
      const { changeType, lineStart, lineEnd } = await this.determineChangeParameters(
        request.filePath,
        request.selectedText,
        request.cursorPosition,
        request.insertMode
      );

      // Create code change
      const change = await codeApplicationManager.createCodeChange(
        request.filePath,
        extractedCode,
        changeType,
        lineStart,
        lineEnd,
        this.generateChangeDescription(request, changeType),
        provider
      );

      return {
        success: true,
        changeId: change.id,
        message: 'Code change created successfully',
        code: extractedCode
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to generate code: ${error}`,
        error: String(error)
      };
    }
  }

  /**
   * Generate code for fixing an error
   */
  async generateErrorFix(
    filePath: string,
    errorMessage: string,
    errorLine: number,
    provider: AIProvider,
    contextLines: number = 10
  ): Promise<CodeGenerationResult> {
    try {
      // Get file content around error
      const fileContent = await this.getFileContent(filePath);
      const lines = fileContent.split('\n');
      
      const startLine = Math.max(0, errorLine - contextLines);
      const endLine = Math.min(lines.length - 1, errorLine + contextLines);
      const contextCode = lines.slice(startLine, endLine + 1).join('\n');

      const prompt = `Fix the following error in the code:

Error: ${errorMessage}
Error Line: ${errorLine}
File: ${filePath}

Code context:
\`\`\`
${contextCode}
\`\`\`

Please provide a fixed version of the code that resolves the error. Only return the corrected code without explanations.`;

      return await this.generateAndCreateChange(
        {
          prompt,
          filePath,
          selectedText: contextCode,
          cursorPosition: { line: errorLine, column: 0 },
          insertMode: 'replace'
        },
        provider
      );
    } catch (error) {
      return {
        success: false,
        message: `Failed to generate error fix: ${error}`,
        error: String(error)
      };
    }
  }

  /**
   * Generate code for implementing a feature
   */
  async generateFeatureImplementation(
    filePath: string,
    featureDescription: string,
    insertPosition: { line: number; column: number },
    provider: AIProvider
  ): Promise<CodeGenerationResult> {
    try {
      // Get file content for context
      const fileContent = await this.getFileContent(filePath);
      const fileExtension = filePath.split('.').pop()?.toLowerCase();
      
      // Determine language
      const language = this.getLanguageFromExtension(fileExtension || '');

      const prompt = `Implement the following feature in ${language}:

Feature: ${featureDescription}
File: ${filePath}

Current file content:
\`\`\`${language}
${fileContent}
\`\`\`

Please provide the implementation code that should be inserted at line ${insertPosition.line}. Only return the code to be inserted without explanations.`;

      return await this.generateAndCreateChange(
        {
          prompt,
          filePath,
          cursorPosition: insertPosition,
          insertMode: 'insert',
          context: {
            language,
            projectType: this.detectProjectType(fileContent)
          }
        },
        provider
      );
    } catch (error) {
      return {
        success: false,
        message: `Failed to generate feature implementation: ${error}`,
        error: String(error)
      };
    }
  }

  /**
   * Generate code refactoring suggestions
   */
  async generateRefactoring(
    filePath: string,
    selectedCode: string,
    refactoringType: 'optimize' | 'rename' | 'extract' | 'simplify',
    provider: AIProvider
  ): Promise<CodeGenerationResult> {
    try {
      const fileExtension = filePath.split('.').pop()?.toLowerCase();
      const language = this.getLanguageFromExtension(fileExtension || '');

      const refactoringPrompts = {
        optimize: 'Optimize the following code for better performance and readability',
        rename: 'Refactor the following code with better variable and function names',
        extract: 'Extract reusable functions/methods from the following code',
        simplify: 'Simplify and clean up the following code while maintaining functionality'
      };

      const prompt = `${refactoringPrompts[refactoringType]} in ${language}:

Code to refactor:
\`\`\`${language}
${selectedCode}
\`\`\`

Please provide the refactored code. Only return the improved code without explanations.`;

      return await this.generateAndCreateChange(
        {
          prompt,
          filePath,
          selectedText: selectedCode,
          insertMode: 'replace',
          context: { language }
        },
        provider
      );
    } catch (error) {
      return {
        success: false,
        message: `Failed to generate refactoring: ${error}`,
        error: String(error)
      };
    }
  }

  /**
   * Prepare AI prompt with context
   */
  private async preparePrompt(request: CodeGenerationRequest): Promise<string> {
    let prompt = request.prompt;

    // Add file context if available
    if (request.filePath) {
      const fileExtension = request.filePath.split('.').pop()?.toLowerCase();
      const language = this.getLanguageFromExtension(fileExtension || '');
      
      prompt += `\n\nFile: ${request.filePath}`;
      prompt += `\nLanguage: ${language}`;
    }

    // Add selected text context
    if (request.selectedText) {
      prompt += `\n\nSelected code:\n\`\`\`\n${request.selectedText}\n\`\`\``;
    }

    // Add project context
    if (request.context) {
      if (request.context.projectType) {
        prompt += `\nProject type: ${request.context.projectType}`;
      }
      if (request.context.dependencies?.length) {
        prompt += `\nDependencies: ${request.context.dependencies.join(', ')}`;
      }
    }

    prompt += '\n\nPlease provide only the code without explanations.';

    return prompt;
  }

  /**
   * Extract code from AI response
   */
  private extractCodeFromResponse(response: string): string | null {
    // Try to extract code blocks first
    const codeBlockRegex = /```(?:\w+)?\n?([\s\S]*?)\n?```/g;
    const matches = response.match(codeBlockRegex);
    
    if (matches && matches.length > 0) {
      // Get the largest code block
      let largestBlock = '';
      matches.forEach(match => {
        const code = match.replace(/```(?:\w+)?\n?/g, '').replace(/\n?```/g, '');
        if (code.length > largestBlock.length) {
          largestBlock = code;
        }
      });
      return largestBlock.trim();
    }

    // If no code blocks, try to extract code-like content
    const lines = response.split('\n');
    const codeLines = lines.filter(line => {
      // Look for typical code patterns
      return /^[\s]*[{};()[\]+=\-*/<>!&|]/.test(line) || 
             /^[\s]*[a-zA-Z_$][a-zA-Z0-9_$]*[\s]*[=:]/.test(line) ||
             /^[\s]*(?:function|class|const|let|var|if|for|while|return)/.test(line);
    });

    return codeLines.length > 0 ? codeLines.join('\n') : null;
  }

  /**
   * Determine change parameters
   */
  private async determineChangeParameters(
    filePath: string,
    selectedText?: string,
    cursorPosition?: { line: number; column: number },
    insertMode?: string
  ): Promise<{ changeType: 'insert' | 'replace' | 'delete'; lineStart: number; lineEnd: number }> {
    if (selectedText) {
      // If text is selected, we're replacing it
      const fileContent = await this.getFileContent(filePath);
      const lines = fileContent.split('\n');
      
      // Find selected text in file (simplified)
      let lineStart = 1;
      let lineEnd = 1;
      
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(selectedText.split('\n')[0])) {
          lineStart = i + 1;
          lineEnd = i + selectedText.split('\n').length;
          break;
        }
      }
      
      return { changeType: 'replace', lineStart, lineEnd };
    }

    if (cursorPosition) {
      const line = cursorPosition.line;
      
      if (insertMode === 'replace') {
        return { changeType: 'replace', lineStart: line, lineEnd: line };
      } else {
        return { changeType: 'insert', lineStart: line, lineEnd: line };
      }
    }

    // Default to end of file insertion
    const fileContent = await this.getFileContent(filePath);
    const lineCount = fileContent.split('\n').length;
    
    return { changeType: 'insert', lineStart: lineCount + 1, lineEnd: lineCount + 1 };
  }

  /**
   * Generate change description
   */
  private generateChangeDescription(
    request: CodeGenerationRequest,
    changeType: 'insert' | 'replace' | 'delete'
  ): string {
    const action = changeType === 'insert' ? 'Insert' : 
                  changeType === 'replace' ? 'Replace' : 'Delete';
    
    const fileName = request.filePath.split('/').pop() || 'file';
    
    // Extract key terms from prompt
    const prompt = request.prompt.toLowerCase();
    let description = `${action} code in ${fileName}`;
    
    if (prompt.includes('fix')) {
      description = `Fix error in ${fileName}`;
    } else if (prompt.includes('implement')) {
      description = `Implement feature in ${fileName}`;
    } else if (prompt.includes('refactor')) {
      description = `Refactor code in ${fileName}`;
    } else if (prompt.includes('optimize')) {
      description = `Optimize code in ${fileName}`;
    }
    
    return description;
  }

  /**
   * Get language from file extension
   */
  private getLanguageFromExtension(extension: string): string {
    const languageMap: { [key: string]: string } = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'cs': 'csharp',
      'php': 'php',
      'rb': 'ruby',
      'go': 'go',
      'rs': 'rust',
      'swift': 'swift',
      'kt': 'kotlin',
      'dart': 'dart',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'less': 'less',
      'json': 'json',
      'xml': 'xml',
      'yaml': 'yaml',
      'yml': 'yaml',
      'md': 'markdown',
      'sql': 'sql',
      'sh': 'bash',
      'ps1': 'powershell'
    };
    
    return languageMap[extension] || 'text';
  }

  /**
   * Detect project type from file content
   */
  private detectProjectType(content: string): string {
    if (content.includes('import React') || content.includes('from \'react\'')) {
      return 'React';
    } else if (content.includes('@Component') || content.includes('@Injectable')) {
      return 'Angular';
    } else if (content.includes('Vue.component') || content.includes('<template>')) {
      return 'Vue.js';
    } else if (content.includes('express()') || content.includes('require(\'express\')')) {
      return 'Express.js';
    } else if (content.includes('def ') && content.includes('import ')) {
      return 'Python';
    } else if (content.includes('public class') || content.includes('package ')) {
      return 'Java';
    } else if (content.includes('#include') || content.includes('int main(')) {
      return 'C/C++';
    }
    
    return 'General';
  }

  /**
   * Get file content
   */
  private async getFileContent(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const ipc = (window as any).electronAPI;
      if (!ipc || !ipc.fs) {
        reject(new Error('Electron IPC not available'));
        return;
      }

      ipc.fs.readFile(filePath)
        .then((content: string) => resolve(content))
        .catch((error: any) => reject(error));
    });
  }
}

export const codeApplicationService = new CodeApplicationService();
