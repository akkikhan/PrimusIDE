// AI Code Generator - Intelligent code scaffolding and generation
// Features template generation, smart suggestions, and contextual code creation

import React, { useState, useEffect, useCallback } from 'react';
import { CodeSuggestion, CodeContext, AIResponse } from '../services/AdvancedAIService';
import './AICodeGenerator.css';

interface AICodeGeneratorProps {
  onGenerateCode: (prompt: string, context: CodeContext, options: GenerationOptions) => Promise<AIResponse>;
  onInsertCode: (code: string, position?: { line: number; column: number }) => void;
  onPreviewCode: (code: string) => void;
  context: CodeContext;
  isVisible: boolean;
  onToggle: () => void;
  className?: string;
}

interface GenerationOptions {
  type: 'function' | 'class' | 'component' | 'test' | 'documentation' | 'interface' | 'custom';
  language: string;
  framework?: string;
  style: 'functional' | 'object-oriented' | 'declarative' | 'imperative';
  includeComments: boolean;
  includeTests: boolean;
  includeDocumentation: boolean;
  followConventions: boolean;
  optimizeFor: 'readability' | 'performance' | 'maintainability';
}

interface CodeTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  language: string;
  framework?: string;
  template: string;
  variables: TemplateVariable[];
  preview: string;
}

interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  defaultValue?: any;
  required: boolean;
  options?: string[];
}

interface GeneratedCode {
  id: string;
  prompt: string;
  code: string;
  language: string;
  options: GenerationOptions;
  suggestions: CodeSuggestion[];
  timestamp: number;
  rating?: number;
  applied: boolean;
}

const AICodeGenerator: React.FC<AICodeGeneratorProps> = ({
  onGenerateCode,
  onInsertCode,
  onPreviewCode,
  context,
  isVisible,
  onToggle,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState<'generate' | 'templates' | 'history'>('generate');
  const [prompt, setPrompt] = useState('');
  const [options, setOptions] = useState<GenerationOptions>({
    type: 'function',
    language: context.language || 'typescript',
    style: 'functional',
    includeComments: true,
    includeTests: false,
    includeDocumentation: false,
    followConventions: true,
    optimizeFor: 'readability'
  });
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCodes, setGeneratedCodes] = useState<GeneratedCode[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<CodeTemplate | null>(null);
  const [templateVariables, setTemplateVariables] = useState<Record<string, any>>({});
  const [previewCode, setPreviewCode] = useState<string>('');

  // Code templates for common patterns
  const codeTemplates: CodeTemplate[] = [
    {
      id: 'react-component',
      name: 'React Component',
      description: 'Functional React component with TypeScript',
      category: 'React',
      language: 'typescript',
      framework: 'react',
      template: `import React, { useState, useEffect } from 'react';

interface {{componentName}}Props {
  {{#if hasChildren}}
  children?: React.ReactNode;
  {{/if}}
  {{#each props}}
  {{name}}{{#if optional}}?{{/if}}: {{type}};
  {{/each}}
}

const {{componentName}}: React.FC<{{componentName}}Props> = ({
  {{#each props}}
  {{name}}{{#unless @last}},{{/unless}}
  {{/each}}
  {{#if hasChildren}}
  children
  {{/if}}
}) => {
  {{#if hasState}}
  const [{{stateName}}, set{{capitalize stateName}}] = useState<{{stateType}}>({{stateDefault}});
  {{/if}}

  {{#if hasEffect}}
  useEffect(() => {
    // Effect logic here
  }, []);
  {{/if}}

  return (
    <div className="{{kebabCase componentName}}">
      {{#if hasChildren}}
      {children}
      {{else}}
      <h1>{{componentName}}</h1>
      {{/if}}
    </div>
  );
};

export default {{componentName}};`,
      variables: [
        { name: 'componentName', type: 'string', description: 'Component name', required: true },
        { name: 'hasChildren', type: 'boolean', description: 'Accept children prop', defaultValue: false, required: false },
        { name: 'hasState', type: 'boolean', description: 'Include state management', defaultValue: false, required: false },
        { name: 'hasEffect', type: 'boolean', description: 'Include useEffect hook', defaultValue: false, required: false }
      ],
      preview: 'Creates a modern React functional component with TypeScript support'
    },
    {
      id: 'api-service',
      name: 'API Service',
      description: 'REST API service with error handling',
      category: 'API',
      language: 'typescript',
      template: `export interface {{modelName}} {
  {{#each fields}}
  {{name}}: {{type}};
  {{/each}}
}

export interface {{serviceName}}Response<T = any> {
  data: T;
  status: number;
  message?: string;
}

export class {{serviceName}} {
  private baseUrl: string;

  constructor(baseUrl: string = '{{baseUrl}}') {
    this.baseUrl = baseUrl;
  }

  async get{{modelName}}s(): Promise<{{serviceName}}Response<{{modelName}}[]>> {
    try {
      const response = await fetch(\`\${this.baseUrl}/{{endpoint}}\`);
      const data = await response.json();
      return { data, status: response.status };
    } catch (error) {
      console.error('Error fetching {{lowercase modelName}}s:', error);
      throw error;
    }
  }

  async get{{modelName}}ById(id: string): Promise<{{serviceName}}Response<{{modelName}}>> {
    try {
      const response = await fetch(\`\${this.baseUrl}/{{endpoint}}/\${id}\`);
      const data = await response.json();
      return { data, status: response.status };
    } catch (error) {
      console.error('Error fetching {{lowercase modelName}}:', error);
      throw error;
    }
  }

  async create{{modelName}}({{lowercase modelName}}: Omit<{{modelName}}, 'id'>): Promise<{{serviceName}}Response<{{modelName}}>> {
    try {
      const response = await fetch(\`\${this.baseUrl}/{{endpoint}}\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({{lowercase modelName}})
      });
      const data = await response.json();
      return { data, status: response.status };
    } catch (error) {
      console.error('Error creating {{lowercase modelName}}:', error);
      throw error;
    }
  }
}`,
      variables: [
        { name: 'serviceName', type: 'string', description: 'Service class name', required: true },
        { name: 'modelName', type: 'string', description: 'Data model name', required: true },
        { name: 'baseUrl', type: 'string', description: 'API base URL', defaultValue: '/api', required: true },
        { name: 'endpoint', type: 'string', description: 'API endpoint', required: true }
      ],
      preview: 'Creates a comprehensive API service with CRUD operations and error handling'
    },
    {
      id: 'test-suite',
      name: 'Test Suite',
      description: 'Jest test suite with common test patterns',
      category: 'Testing',
      language: 'typescript',
      template: `import { {{testTarget}} } from '{{importPath}}';

describe('{{testSuiteName}}', () => {
  {{#if hasSetup}}
  beforeEach(() => {
    // Setup code
  });

  afterEach(() => {
    // Cleanup code
  });
  {{/if}}

  describe('{{testGroup}}', () => {
    it('should {{testDescription}}', {{#if isAsync}}async {{/if}}() => {
      // Arrange
      {{#each arrangeSteps}}
      {{this}}
      {{/each}}

      // Act
      {{#if isAsync}}
      const result = await {{testTarget}}({{testParams}});
      {{else}}
      const result = {{testTarget}}({{testParams}});
      {{/if}}

      // Assert
      expect(result).{{assertion}};
    });

    {{#if includeErrorTests}}
    it('should handle errors gracefully', {{#if isAsync}}async {{/if}}() => {
      // Test error scenarios
      {{#if isAsync}}
      await expect({{testTarget}}(invalidParams)).rejects.toThrow();
      {{else}}
      expect(() => {{testTarget}}(invalidParams)).toThrow();
      {{/if}}
    });
    {{/if}}

    {{#if includeEdgeCases}}
    it('should handle edge cases', () => {
      // Test edge cases
      expect({{testTarget}}(null)).toBeDefined();
      expect({{testTarget}}(undefined)).toBeDefined();
    });
    {{/if}}
  });
});`,
      variables: [
        { name: 'testSuiteName', type: 'string', description: 'Test suite name', required: true },
        { name: 'testTarget', type: 'string', description: 'Function/class being tested', required: true },
        { name: 'importPath', type: 'string', description: 'Import path for test target', required: true },
        { name: 'isAsync', type: 'boolean', description: 'Test async functions', defaultValue: false, required: false },
        { name: 'includeErrorTests', type: 'boolean', description: 'Include error handling tests', defaultValue: true, required: false }
      ],
      preview: 'Creates comprehensive test suites with arrange-act-assert pattern'
    }
  ];

  // Quick prompts for common generation tasks
  const quickPrompts = [
    {
      category: 'Functions',
      prompts: [
        'Create a utility function that',
        'Generate an async function that',
        'Write a pure function that',
        'Build a recursive function that'
      ]
    },
    {
      category: 'Classes',
      prompts: [
        'Design a class that',
        'Create a service class for',
        'Build an abstract class that',
        'Generate a singleton class that'
      ]
    },
    {
      category: 'Components',
      prompts: [
        'Create a React component that',
        'Build a Vue component for',
        'Generate an Angular component that',
        'Design a web component that'
      ]
    },
    {
      category: 'Tests',
      prompts: [
        'Write unit tests for',
        'Create integration tests that',
        'Generate test cases for',
        'Build a test suite for'
      ]
    }
  ];

  /**
   * Handle code generation
   */
  const handleGenerateCode = async () => {
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);

    try {
      const response = await onGenerateCode(prompt, context, options);
      
      const generated: GeneratedCode = {
        id: `gen-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        prompt,
        code: response.content,
        language: options.language,
        options: { ...options },
        suggestions: response.suggestions || [],
        timestamp: Date.now(),
        applied: false
      };

      setGeneratedCodes(prev => [generated, ...prev]);
      setPreviewCode(response.content);
      setPrompt('');
    } catch (error) {
      console.error('Code generation error:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * Handle template generation
   */
  const handleGenerateFromTemplate = () => {
    if (!selectedTemplate) return;

    try {
      let code = selectedTemplate.template;
      
      // Simple template variable replacement (in production, use a proper template engine)
      Object.entries(templateVariables).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        code = code.replace(regex, String(value));
      });

      // Handle conditionals (simplified)
      code = code.replace(/{{#if \w+}}[\s\S]*?{{\/if}}/g, (match) => {
        // This is a simplified implementation
        return match.includes('true') ? match.replace(/{{#if \w+}}|{{\/if}}/g, '') : '';
      });

      const generated: GeneratedCode = {
        id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        prompt: `Generated from template: ${selectedTemplate.name}`,
        code,
        language: selectedTemplate.language,
        options,
        suggestions: [],
        timestamp: Date.now(),
        applied: false
      };

      setGeneratedCodes(prev => [generated, ...prev]);
      setPreviewCode(code);
    } catch (error) {
      console.error('Template generation error:', error);
    }
  };

  /**
   * Apply generated code
   */
  const applyGeneratedCode = (generated: GeneratedCode) => {
    onInsertCode(generated.code, context.cursorPosition);
    setGeneratedCodes(prev => 
      prev.map(g => 
        g.id === generated.id ? { ...g, applied: true } : g
      )
    );
  };

  /**
   * Rate generated code
   */
  const rateGeneratedCode = (id: string, rating: number) => {
    setGeneratedCodes(prev => 
      prev.map(g => 
        g.id === id ? { ...g, rating } : g
      )
    );
  };

  /**
   * Update template variables
   */
  const updateTemplateVariable = (name: string, value: any) => {
    setTemplateVariables(prev => ({ ...prev, [name]: value }));
  };

  /**
   * Auto-update options based on context
   */
  useEffect(() => {
    if (context.language && context.language !== options.language) {
      setOptions(prev => ({ ...prev, language: context.language }));
    }
  }, [context.language, options.language]);

  /**
   * Preview template code
   */
  useEffect(() => {
    if (selectedTemplate && Object.keys(templateVariables).length > 0) {
      try {
        let preview = selectedTemplate.template;
        Object.entries(templateVariables).forEach(([key, value]) => {
          const regex = new RegExp(`{{${key}}}`, 'g');
          preview = preview.replace(regex, String(value));
        });
        setPreviewCode(preview.substring(0, 500) + (preview.length > 500 ? '...' : ''));
      } catch (error) {
        console.error('Preview generation error:', error);
      }
    }
  }, [selectedTemplate, templateVariables]);

  if (!isVisible) {
    return (
      <div className={`ai-generator-toggle ${className}`}>
        <button className="generator-toggle-btn" onClick={onToggle} title="Open AI Code Generator">
          ⚡ Code Generator
        </button>
      </div>
    );
  }

  return (
    <div className={`ai-code-generator ${className}`}>
      {/* Header */}
      <div className="generator-header">
        <div className="generator-title">
          <span className="generator-icon">⚡</span>
          <h3>AI Code Generator</h3>
        </div>
        <button className="close-btn" onClick={onToggle} title="Close Code Generator">
          ✕
        </button>
      </div>

      {/* Tabs */}
      <div className="generator-tabs">
        <button
          className={`tab ${activeTab === 'generate' ? 'active' : ''}`}
          onClick={() => setActiveTab('generate')}
        >
          🎯 Generate
        </button>
        <button
          className={`tab ${activeTab === 'templates' ? 'active' : ''}`}
          onClick={() => setActiveTab('templates')}
        >
          📋 Templates
        </button>
        <button
          className={`tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          📚 History ({generatedCodes.length})
        </button>
      </div>

      {/* Generate Tab */}
      {activeTab === 'generate' && (
        <div className="generate-tab">
          {/* Quick Prompts */}
          <div className="quick-prompts">
            <h4>🚀 Quick Start</h4>
            {quickPrompts.map(category => (
              <div key={category.category} className="prompt-category">
                <span className="category-name">{category.category}:</span>
                {category.prompts.map((promptText, index) => (
                  <button
                    key={index}
                    className="quick-prompt-btn"
                    onClick={() => setPrompt(promptText + ' ')}
                  >
                    {promptText}...
                  </button>
                ))}
              </div>
            ))}
          </div>

          {/* Prompt Input */}
          <div className="prompt-input-area">
            <label>💭 Describe what you want to generate:</label>
            <textarea
              className="prompt-input"
              placeholder="e.g., Create a TypeScript function that validates email addresses with detailed error messages..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
            />
          </div>

          {/* Generation Options */}
          <div className="generation-options">
            <h4>⚙️ Options</h4>
            <div className="options-grid">
              <div className="option-group">
                <label>Type:</label>
                <select
                  value={options.type}
                  onChange={(e) => setOptions(prev => ({ ...prev, type: e.target.value as any }))}
                >
                  <option value="function">Function</option>
                  <option value="class">Class</option>
                  <option value="component">Component</option>
                  <option value="test">Test</option>
                  <option value="documentation">Documentation</option>
                  <option value="interface">Interface/Type</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              <div className="option-group">
                <label>Language:</label>
                <select
                  value={options.language}
                  onChange={(e) => setOptions(prev => ({ ...prev, language: e.target.value }))}
                >
                  <option value="typescript">TypeScript</option>
                  <option value="javascript">JavaScript</option>
                  <option value="python">Python</option>
                  <option value="java">Java</option>
                  <option value="csharp">C#</option>
                  <option value="go">Go</option>
                  <option value="rust">Rust</option>
                </select>
              </div>

              <div className="option-group">
                <label>Style:</label>
                <select
                  value={options.style}
                  onChange={(e) => setOptions(prev => ({ ...prev, style: e.target.value as any }))}
                >
                  <option value="functional">Functional</option>
                  <option value="object-oriented">Object-Oriented</option>
                  <option value="declarative">Declarative</option>
                  <option value="imperative">Imperative</option>
                </select>
              </div>

              <div className="option-group">
                <label>Optimize for:</label>
                <select
                  value={options.optimizeFor}
                  onChange={(e) => setOptions(prev => ({ ...prev, optimizeFor: e.target.value as any }))}
                >
                  <option value="readability">Readability</option>
                  <option value="performance">Performance</option>
                  <option value="maintainability">Maintainability</option>
                </select>
              </div>
            </div>

            <div className="option-checkboxes">
              <label>
                <input
                  type="checkbox"
                  checked={options.includeComments}
                  onChange={(e) => setOptions(prev => ({ ...prev, includeComments: e.target.checked }))}
                />
                Include comments
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={options.includeTests}
                  onChange={(e) => setOptions(prev => ({ ...prev, includeTests: e.target.checked }))}
                />
                Generate tests
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={options.includeDocumentation}
                  onChange={(e) => setOptions(prev => ({ ...prev, includeDocumentation: e.target.checked }))}
                />
                Include documentation
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={options.followConventions}
                  onChange={(e) => setOptions(prev => ({ ...prev, followConventions: e.target.checked }))}
                />
                Follow conventions
              </label>
            </div>
          </div>

          {/* Generate Button */}
          <button
            className="generate-btn"
            onClick={handleGenerateCode}
            disabled={!prompt.trim() || isGenerating}
          >
            {isGenerating ? '🔄 Generating...' : '⚡ Generate Code'}
          </button>
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div className="templates-tab">
          <div className="templates-grid">
            {codeTemplates
              .filter(template => !options.language || template.language === options.language)
              .map(template => (
                <div
                  key={template.id}
                  className={`template-card ${selectedTemplate?.id === template.id ? 'selected' : ''}`}
                  onClick={() => setSelectedTemplate(template)}
                >
                  <div className="template-header">
                    <h4>{template.name}</h4>
                    <span className="template-category">{template.category}</span>
                  </div>
                  <p className="template-description">{template.description}</p>
                  <div className="template-meta">
                    <span className="template-language">{template.language}</span>
                    {template.framework && (
                      <span className="template-framework">{template.framework}</span>
                    )}
                  </div>
                </div>
              ))}
          </div>

          {selectedTemplate && (
            <div className="template-config">
              <h4>📝 Configure Template: {selectedTemplate.name}</h4>
              <div className="template-variables">
                {selectedTemplate.variables.map(variable => (
                  <div key={variable.name} className="variable-input">
                    <label>
                      {variable.name}
                      {variable.required && <span className="required">*</span>}
                    </label>
                    <p className="variable-description">{variable.description}</p>
                    {variable.type === 'boolean' ? (
                      <input
                        type="checkbox"
                        checked={templateVariables[variable.name] || variable.defaultValue || false}
                        onChange={(e) => updateTemplateVariable(variable.name, e.target.checked)}
                      />
                    ) : variable.options ? (
                      <select
                        value={templateVariables[variable.name] || variable.defaultValue || ''}
                        onChange={(e) => updateTemplateVariable(variable.name, e.target.value)}
                      >
                        <option value="">Select...</option>
                        {variable.options.map(option => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={variable.type === 'number' ? 'number' : 'text'}
                        value={templateVariables[variable.name] || variable.defaultValue || ''}
                        onChange={(e) => updateTemplateVariable(variable.name, e.target.value)}
                        placeholder={`Enter ${variable.name}...`}
                      />
                    )}
                  </div>
                ))}
              </div>
              <button
                className="generate-template-btn"
                onClick={handleGenerateFromTemplate}
                disabled={selectedTemplate.variables
                  .filter(v => v.required)
                  .some(v => !templateVariables[v.name])}
              >
                📋 Generate from Template
              </button>
            </div>
          )}
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="history-tab">
          {generatedCodes.length === 0 ? (
            <div className="empty-history">
              <div className="empty-icon">📭</div>
              <p>No generated code yet. Try generating some code first!</p>
            </div>
          ) : (
            <div className="history-list">
              {generatedCodes.map(generated => (
                <div key={generated.id} className={`history-item ${generated.applied ? 'applied' : ''}`}>
                  <div className="history-header">
                    <span className="history-prompt">{generated.prompt}</span>
                    <div className="history-actions">
                      <div className="rating">
                        {[1, 2, 3, 4, 5].map(rating => (
                          <button
                            key={rating}
                            className={`rating-btn ${generated.rating && generated.rating >= rating ? 'active' : ''}`}
                            onClick={() => rateGeneratedCode(generated.id, rating)}
                            title={`Rate ${rating} stars`}
                          >
                            ⭐
                          </button>
                        ))}
                      </div>
                      <button
                        className="preview-btn"
                        onClick={() => onPreviewCode(generated.code)}
                        title="Preview code"
                      >
                        👁️
                      </button>
                      <button
                        className="apply-btn"
                        onClick={() => applyGeneratedCode(generated)}
                        disabled={generated.applied}
                        title="Insert into editor"
                      >
                        {generated.applied ? '✅' : '📥'}
                      </button>
                    </div>
                  </div>
                  <div className="history-meta">
                    <span className="history-language">{generated.language}</span>
                    <span className="history-time">
                      {new Date(generated.timestamp).toLocaleString()}
                    </span>
                    {generated.applied && <span className="applied-badge">Applied</span>}
                  </div>
                  <pre className="history-code-preview">
                    {generated.code.substring(0, 200)}
                    {generated.code.length > 200 && '...'}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Code Preview */}
      {previewCode && (
        <div className="code-preview">
          <h4>👁️ Preview</h4>
          <pre className="preview-code">
            <code>{previewCode.substring(0, 500)}</code>
            {previewCode.length > 500 && <span className="preview-more">... (truncated)</span>}
          </pre>
        </div>
      )}
    </div>
  );
};

export default AICodeGenerator;
