# LSP Integration - God-Level Expertise

## Language Server Protocol Deep Dive

### Complete LSP Architecture

```typescript
// src/main/services/LSPService.ts - Complete implementation
import { EventEmitter } from 'events';
import type { ILSPAdapter } from '../../shared/adapters/ILSPAdapter';
import { TypeScriptLSPAdapter } from '../../adapters/TypeScriptLSPAdapter';
import { JavaScriptLSPAdapter } from '../../adapters/JavaScriptLSPAdapter';

export class LSPService extends EventEmitter {
  private adapters = new Map<string, ILSPAdapter>();
  private workspaceRoots = new Map<string, string>();
  
  constructor() {
    super();
    this.registerDefaultAdapters();
  }
  
  private registerDefaultAdapters() {
    // TypeScript/JavaScript
    this.registerAdapter('typescript', new TypeScriptLSPAdapter());
    this.registerAdapter('javascript', new JavaScriptLSPAdapter());
    
    // Can add more adapters here
    // this.registerAdapter('python', new PythonLSPAdapter());
    // this.registerAdapter('go', new GoLSPAdapter());
  }
  
  registerAdapter(language: string, adapter: ILSPAdapter) {
    this.adapters.set(language, adapter);
  }
  
  async initializeWorkspace(workspaceRoot: string) {
    // Initialize all adapters for this workspace
    const promises = Array.from(this.adapters.entries()).map(
      async ([language, adapter]) => {
        try {
          await adapter.initialize(workspaceRoot);
          this.workspaceRoots.set(language, workspaceRoot);
          console.log(`Initialized ${language} LSP for ${workspaceRoot}`);
        } catch (error) {
          console.error(`Failed to initialize ${language} LSP:`, error);
        }
      }
    );
    
    await Promise.allSettled(promises);
  }
  
  private getAdapterForFile(uri: string): ILSPAdapter {
    const language = this.detectLanguage(uri);
    const adapter = this.adapters.get(language);
    
    if (!adapter) {
      throw new Error(`No LSP adapter registered for language: ${language}`);
    }
    
    return adapter;
  }
  
  private detectLanguage(uri: string): string {
    const ext = uri.split('.').pop()?.toLowerCase();
    
    const languageMap: Record<string, string> = {
      ts: 'typescript',
      tsx: 'typescript',
      js: 'javascript',
      jsx: 'javascript',
      py: 'python',
      go: 'go',
      rs: 'rust',
      java: 'java',
      cpp: 'cpp',
      c: 'c',
    };
    
    return languageMap[ext || ''] || 'plaintext';
  }
  
  // LSP Operations
  
  async goToDefinition(uri: string, position: Position): Promise<Location[]> {
    const adapter = this.getAdapterForFile(uri);
    return await adapter.goToDefinition(uri, position);
  }
  
  async hover(uri: string, position: Position): Promise<Hover | null> {
    const adapter = this.getAdapterForFile(uri);
    return await adapter.hover(uri, position);
  }
  
  async completion(
    uri: string,
    position: Position,
    triggerCharacter?: string
  ): Promise<CompletionItem[]> {
    const adapter = this.getAdapterForFile(uri);
    return await adapter.completion(uri, position, triggerCharacter);
  }
  
  async signatureHelp(uri: string, position: Position): Promise<SignatureHelp | null> {
    const adapter = this.getAdapterForFile(uri);
    return await adapter.signatureHelp(uri, position);
  }
  
  async documentSymbol(uri: string): Promise<DocumentSymbol[]> {
    const adapter = this.getAdapterForFile(uri);
    return await adapter.documentSymbol(uri);
  }
  
  async workspaceSymbol(query: string): Promise<SymbolInformation[]> {
    // Query all adapters
    const results = await Promise.all(
      Array.from(this.adapters.values()).map(adapter =>
        adapter.workspaceSymbol(query).catch(() => [])
      )
    );
    
    return results.flat();
  }
  
  async rename(uri: string, position: Position, newName: string): Promise<WorkspaceEdit> {
    const adapter = this.getAdapterForFile(uri);
    return await adapter.rename(uri, position, newName);
  }
  
  async findReferences(
    uri: string,
    position: Position,
    includeDeclaration: boolean = true
  ): Promise<Location[]> {
    const adapter = this.getAdapterForFile(uri);
    return await adapter.findReferences(uri, position, includeDeclaration);
  }
  
  async format(uri: string, options: FormattingOptions): Promise<TextEdit[]> {
    const adapter = this.getAdapterForFile(uri);
    return await adapter.format(uri, options);
  }
  
  async codeAction(
    uri: string,
    range: Range,
    context: CodeActionContext
  ): Promise<CodeAction[]> {
    const adapter = this.getAdapterForFile(uri);
    return await adapter.codeAction(uri, range, context);
  }
  
  async executeCommand(command: string, args: any[]): Promise<any> {
    // Commands are adapter-specific
    // Find the adapter that can handle this command
    for (const adapter of this.adapters.values()) {
      try {
        return await adapter.executeCommand(command, args);
      } catch {
        continue;
      }
    }
    
    throw new Error(`No adapter can handle command: ${command}`);
  }
  
  // Diagnostics
  
  onDiagnostics(callback: (uri: string, diagnostics: Diagnostic[]) => void) {
    // Subscribe to diagnostics from all adapters
    this.adapters.forEach(adapter => {
      adapter.onDiagnostics((uri, diagnostics) => {
        callback(uri, diagnostics);
        
        // Forward to renderer
        this.emit('diagnostics', { uri, diagnostics });
      });
    });
  }
  
  // Lifecycle
  
  async shutdown() {
    const promises = Array.from(this.adapters.values()).map(adapter =>
      adapter.shutdown().catch(console.error)
    );
    
    await Promise.allSettled(promises);
    this.adapters.clear();
    this.workspaceRoots.clear();
  }
}

// Singleton instance
export const lspService = new LSPService();
```

### TypeScript LSP Adapter (VS Code Integration)

```typescript
// src/adapters/TypeScriptLSPAdapter.ts
import * as ts from 'typescript';
import * as path from 'path';
import * as fs from 'fs/promises';
import { ILSPAdapter } from '../shared/adapters/ILSPAdapter';

export class TypeScriptLSPAdapter implements ILSPAdapter {
  private languageService: ts.LanguageService | null = null;
  private documentRegistry: ts.DocumentRegistry;
  private files = new Map<string, { version: number; content: string }>();
  private workspaceRoot: string = '';
  
  constructor() {
    this.documentRegistry = ts.createDocumentRegistry();
  }
  
  async initialize(workspaceRoot: string): Promise<void> {
    this.workspaceRoot = workspaceRoot;
    
    // Read tsconfig.json
    const tsconfigPath = path.join(workspaceRoot, 'tsconfig.json');
    const configFile = await this.readTsConfig(tsconfigPath);
    
    // Create language service host
    const serviceHost: ts.LanguageServiceHost = {
      getScriptFileNames: () => Array.from(this.files.keys()),
      
      getScriptVersion: (fileName) => {
        const file = this.files.get(fileName);
        return file ? file.version.toString() : '0';
      },
      
      getScriptSnapshot: (fileName) => {
        const file = this.files.get(fileName);
        if (file) {
          return ts.ScriptSnapshot.fromString(file.content);
        }
        
        // Try to read from disk
        try {
          const content = require('fs').readFileSync(fileName, 'utf-8');
          return ts.ScriptSnapshot.fromString(content);
        } catch {
          return undefined;
        }
      },
      
      getCurrentDirectory: () => workspaceRoot,
      getCompilationSettings: () => configFile.options,
      getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
      fileExists: ts.sys.fileExists,
      readFile: ts.sys.readFile,
      readDirectory: ts.sys.readDirectory,
      directoryExists: ts.sys.directoryExists,
      getDirectories: ts.sys.getDirectories,
    };
    
    // Create language service
    this.languageService = ts.createLanguageService(
      serviceHost,
      this.documentRegistry
    );
    
    // Index all TypeScript files in workspace
    await this.indexWorkspace(workspaceRoot);
  }
  
  private async readTsConfig(configPath: string): Promise<ts.ParsedCommandLine> {
    try {
      const configText = await fs.readFile(configPath, 'utf-8');
      const configJson = ts.parseConfigFileTextToJson(configPath, configText);
      
      return ts.parseJsonConfigFileContent(
        configJson.config,
        ts.sys,
        path.dirname(configPath)
      );
    } catch {
      // Return default config if tsconfig doesn't exist
      return {
        options: ts.getDefaultCompilerOptions(),
        fileNames: [],
        errors: [],
      };
    }
  }
  
  private async indexWorkspace(workspaceRoot: string): Promise<void> {
    // Find all .ts and .tsx files
    const files = await this.findTypeScriptFiles(workspaceRoot);
    
    // Add to files map
    await Promise.all(
      files.map(async (filePath) => {
        const content = await fs.readFile(filePath, 'utf-8');
        this.files.set(filePath, { version: 1, content });
      })
    );
  }
  
  private async findTypeScriptFiles(dir: string): Promise<string[]> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files: string[] = [];
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      // Skip node_modules and .git
      if (entry.name === 'node_modules' || entry.name === '.git') {
        continue;
      }
      
      if (entry.isDirectory()) {
        files.push(...(await this.findTypeScriptFiles(fullPath)));
      } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
        files.push(fullPath);
      }
    }
    
    return files;
  }
  
  private updateFile(uri: string, content: string) {
    const file = this.files.get(uri);
    if (file) {
      file.version++;
      file.content = content;
    } else {
      this.files.set(uri, { version: 1, content });
    }
  }
  
  // LSP Operations Implementation
  
  async goToDefinition(uri: string, position: Position): Promise<Location[]> {
    if (!this.languageService) throw new Error('Language service not initialized');
    
    const offset = this.positionToOffset(uri, position);
    const definitions = this.languageService.getDefinitionAtPosition(uri, offset);
    
    if (!definitions) return [];
    
    return definitions.map(def => ({
      uri: def.fileName,
      range: this.textSpanToRange(uri, def.textSpan),
    }));
  }
  
  async hover(uri: string, position: Position): Promise<Hover | null> {
    if (!this.languageService) throw new Error('Language service not initialized');
    
    const offset = this.positionToOffset(uri, position);
    const quickInfo = this.languageService.getQuickInfoAtPosition(uri, offset);
    
    if (!quickInfo) return null;
    
    return {
      contents: {
        kind: 'markdown',
        value: ts.displayPartsToString(quickInfo.displayParts || []),
      },
      range: this.textSpanToRange(uri, quickInfo.textSpan),
    };
  }
  
  async completion(
    uri: string,
    position: Position,
    triggerCharacter?: string
  ): Promise<CompletionItem[]> {
    if (!this.languageService) throw new Error('Language service not initialized');
    
    const offset = this.positionToOffset(uri, position);
    const completions = this.languageService.getCompletionsAtPosition(uri, offset, {
      includeExternalModuleExports: true,
      includeInsertTextCompletions: true,
    });
    
    if (!completions) return [];
    
    return completions.entries.map(entry => ({
      label: entry.name,
      kind: this.convertCompletionKind(entry.kind),
      detail: entry.kindModifiers,
      documentation: entry.documentationText
        ? ts.displayPartsToString(entry.documentationText)
        : undefined,
      insertText: entry.insertText || entry.name,
      sortText: entry.sortText,
    }));
  }
  
  async signatureHelp(uri: string, position: Position): Promise<SignatureHelp | null> {
    if (!this.languageService) throw new Error('Language service not initialized');
    
    const offset = this.positionToOffset(uri, position);
    const signatureHelp = this.languageService.getSignatureHelpItems(uri, offset, {});
    
    if (!signatureHelp) return null;
    
    return {
      signatures: signatureHelp.items.map(item => ({
        label: ts.displayPartsToString(item.prefixDisplayParts)
          + item.parameters.map(p => ts.displayPartsToString(p.displayParts)).join(', ')
          + ts.displayPartsToString(item.suffixDisplayParts),
        documentation: ts.displayPartsToString(item.documentation),
        parameters: item.parameters.map(p => ({
          label: ts.displayPartsToString(p.displayParts),
          documentation: ts.displayPartsToString(p.documentation),
        })),
      })),
      activeSignature: signatureHelp.selectedItemIndex,
      activeParameter: signatureHelp.argumentIndex,
    };
  }
  
  async documentSymbol(uri: string): Promise<DocumentSymbol[]> {
    if (!this.languageService) throw new Error('Language service not initialized');
    
    const navTree = this.languageService.getNavigationTree(uri);
    
    return this.convertNavTreeToSymbols(navTree);
  }
  
  private convertNavTreeToSymbols(navTree: ts.NavigationTree): DocumentSymbol[] {
    const symbols: DocumentSymbol[] = [];
    
    for (const child of navTree.childItems || []) {
      const symbol: DocumentSymbol = {
        name: child.text,
        kind: this.convertSymbolKind(child.kind),
        range: this.textSpanToRange('', child.spans[0]),
        selectionRange: this.textSpanToRange('', child.spans[0]),
        children: this.convertNavTreeToSymbols(child),
      };
      
      symbols.push(symbol);
    }
    
    return symbols;
  }
  
  async workspaceSymbol(query: string): Promise<SymbolInformation[]> {
    if (!this.languageService) throw new Error('Language service not initialized');
    
    const symbols: SymbolInformation[] = [];
    
    // Search in all indexed files
    for (const [uri, file] of this.files.entries()) {
      const navTree = this.languageService.getNavigationTree(uri);
      
      this.searchSymbols(navTree, query, uri, symbols);
    }
    
    return symbols;
  }
  
  private searchSymbols(
    navTree: ts.NavigationTree,
    query: string,
    uri: string,
    symbols: SymbolInformation[]
  ) {
    if (navTree.text.toLowerCase().includes(query.toLowerCase())) {
      symbols.push({
        name: navTree.text,
        kind: this.convertSymbolKind(navTree.kind),
        location: {
          uri,
          range: this.textSpanToRange(uri, navTree.spans[0]),
        },
      });
    }
    
    for (const child of navTree.childItems || []) {
      this.searchSymbols(child, query, uri, symbols);
    }
  }
  
  async rename(uri: string, position: Position, newName: string): Promise<WorkspaceEdit> {
    if (!this.languageService) throw new Error('Language service not initialized');
    
    const offset = this.positionToOffset(uri, position);
    const renameLocations = this.languageService.findRenameLocations(uri, offset, false, false);
    
    if (!renameLocations) {
      return { changes: {} };
    }
    
    const changes: Record<string, TextEdit[]> = {};
    
    for (const location of renameLocations) {
      const textEdit: TextEdit = {
        range: this.textSpanToRange(location.fileName, location.textSpan),
        newText: newName,
      };
      
      if (!changes[location.fileName]) {
        changes[location.fileName] = [];
      }
      
      changes[location.fileName].push(textEdit);
    }
    
    return { changes };
  }
  
  async findReferences(
    uri: string,
    position: Position,
    includeDeclaration: boolean
  ): Promise<Location[]> {
    if (!this.languageService) throw new Error('Language service not initialized');
    
    const offset = this.positionToOffset(uri, position);
    const references = this.languageService.getReferencesAtPosition(uri, offset);
    
    if (!references) return [];
    
    return references
      .filter(ref => includeDeclaration || !ref.isDefinition)
      .map(ref => ({
        uri: ref.fileName,
        range: this.textSpanToRange(ref.fileName, ref.textSpan),
      }));
  }
  
  async format(uri: string, options: FormattingOptions): Promise<TextEdit[]> {
    if (!this.languageService) throw new Error('Language service not initialized');
    
    const file = this.files.get(uri);
    if (!file) return [];
    
    const textChanges = this.languageService.getFormattingEditsForDocument(uri, {
      convertTabsToSpaces: options.insertSpaces,
      tabSize: options.tabSize,
      indentSize: options.tabSize,
      newLineCharacter: '\n',
    });
    
    return textChanges.map(change => ({
      range: this.textSpanToRange(uri, change.span),
      newText: change.newText,
    }));
  }
  
  async codeAction(
    uri: string,
    range: Range,
    context: CodeActionContext
  ): Promise<CodeAction[]> {
    if (!this.languageService) throw new Error('Language service not initialized');
    
    const start = this.positionToOffset(uri, range.start);
    const end = this.positionToOffset(uri, range.end);
    
    const codeFixActions = this.languageService.getCodeFixesAtPosition(
      uri,
      start,
      end,
      context.diagnostics.map(d => d.code as number),
      {},
      {}
    );
    
    return codeFixActions.map(action => ({
      title: action.description,
      kind: 'quickfix',
      edit: {
        changes: {
          [uri]: action.changes.map(change => ({
            range: this.textSpanToRange(uri, change.span),
            newText: change.newText,
          })),
        },
      },
    }));
  }
  
  // Utility methods
  
  private positionToOffset(uri: string, position: Position): number {
    const file = this.files.get(uri);
    if (!file) return 0;
    
    const lines = file.content.split('\n');
    let offset = 0;
    
    for (let i = 0; i < position.line; i++) {
      offset += lines[i].length + 1; // +1 for newline
    }
    
    offset += position.column;
    
    return offset;
  }
  
  private textSpanToRange(uri: string, span: ts.TextSpan): Range {
    const file = this.files.get(uri);
    if (!file) {
      return { start: { line: 0, column: 0 }, end: { line: 0, column: 0 } };
    }
    
    const start = this.offsetToPosition(file.content, span.start);
    const end = this.offsetToPosition(file.content, span.start + span.length);
    
    return { start, end };
  }
  
  private offsetToPosition(content: string, offset: number): Position {
    const lines = content.substring(0, offset).split('\n');
    return {
      line: lines.length - 1,
      column: lines[lines.length - 1].length,
    };
  }
  
  private convertCompletionKind(kind: ts.ScriptElementKind): CompletionItemKind {
    // Map TypeScript kinds to LSP kinds
    const kindMap: Record<string, CompletionItemKind> = {
      [ts.ScriptElementKind.functionElement]: 'function',
      [ts.ScriptElementKind.variableElement]: 'variable',
      [ts.ScriptElementKind.memberFunctionElement]: 'method',
      [ts.ScriptElementKind.memberVariableElement]: 'property',
      [ts.ScriptElementKind.classElement]: 'class',
      [ts.ScriptElementKind.interfaceElement]: 'interface',
      [ts.ScriptElementKind.typeElement]: 'type',
      [ts.ScriptElementKind.enumElement]: 'enum',
      [ts.ScriptElementKind.moduleElement]: 'module',
    };
    
    return kindMap[kind] || 'text';
  }
  
  private convertSymbolKind(kind: ts.ScriptElementKind): SymbolKind {
    // Map TypeScript kinds to LSP symbol kinds
    const kindMap: Record<string, SymbolKind> = {
      [ts.ScriptElementKind.functionElement]: 'function',
      [ts.ScriptElementKind.variableElement]: 'variable',
      [ts.ScriptElementKind.classElement]: 'class',
      [ts.ScriptElementKind.interfaceElement]: 'interface',
      [ts.ScriptElementKind.methodElement]: 'method',
      [ts.ScriptElementKind.propertyElement]: 'property',
    };
    
    return kindMap[kind] || 'variable';
  }
  
  // Diagnostics
  
  onDiagnostics(callback: (uri: string, diagnostics: Diagnostic[]) => void) {
    // Poll for diagnostics
    setInterval(() => {
      if (!this.languageService) return;
      
      for (const [uri, file] of this.files.entries()) {
        const semanticDiagnostics = this.languageService.getSemanticDiagnostics(uri);
        const syntacticDiagnostics = this.languageService.getSyntacticDiagnostics(uri);
        
        const diagnostics = [...semanticDiagnostics, ...syntacticDiagnostics].map(diag => ({
          range: this.textSpanToRange(uri, {
            start: diag.start || 0,
            length: diag.length || 0,
          }),
          severity: this.convertDiagnosticSeverity(diag.category),
          code: diag.code,
          message: ts.flattenDiagnosticMessageText(diag.messageText, '\n'),
        }));
        
        callback(uri, diagnostics);
      }
    }, 1000); // Check every second
  }
  
  private convertDiagnosticSeverity(category: ts.DiagnosticCategory): DiagnosticSeverity {
    switch (category) {
      case ts.DiagnosticCategory.Error:
        return 'error';
      case ts.DiagnosticCategory.Warning:
        return 'warning';
      case ts.DiagnosticCategory.Suggestion:
        return 'info';
      case ts.DiagnosticCategory.Message:
        return 'hint';
      default:
        return 'info';
    }
  }
  
  async shutdown(): Promise<void> {
    this.languageService?.dispose();
    this.languageService = null;
    this.files.clear();
  }
}
```

---

**Last Updated:** November 4, 2025  
**Expertise Level:** God-Tier  
**Use When:** LSP integration, TypeScript language services, code intelligence
