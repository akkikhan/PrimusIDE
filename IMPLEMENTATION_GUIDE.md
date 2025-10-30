# 🛠️ PRIMUS IDE - IMPLEMENTATION GUIDE
## Technical Playbook for Rapid Completion

**Companion Document to:** PROJECT_COMPLETION_PLAN.md  
**Purpose:** Detailed code examples, setup scripts, and technical recipes  
**Audience:** Implementation team

---

## 🚀 QUICK START GUIDE

### Prerequisites Checklist

```powershell
# Verify environment
node --version     # Should be v18+ (you have v22.21.0 ✅)
npm --version      # Should be v9+
git --version      # Required for vendor cloning

# Check disk space
Get-PSDrive C      # Need ~5GB for vendor code + build artifacts

# Verify current project builds
npm install
npm run build      # Should complete without errors
npm run dev        # Should launch IDE successfully
```

### Initial Setup Script

Create this script as `scripts/setup-completion-path.ps1`:

```powershell
# scripts/setup-completion-path.ps1
# Run once to set up the rapid completion infrastructure

Write-Host "🚀 Primus IDE - Rapid Completion Setup" -ForegroundColor Cyan

# 1. Create vendor directory structure
Write-Host "`n📁 Creating vendor directories..."
New-Item -ItemType Directory -Force -Path "src/vendors/vscode-lsp"
New-Item -ItemType Directory -Force -Path "src/vendors/vscode-debug"
New-Item -ItemType Directory -Force -Path "src/vendors/vscode-keybindings"
New-Item -ItemType Directory -Force -Path "src/adapters"
New-Item -ItemType Directory -Force -Path "src/shared/adapters"

# 2. Clone VS Code modules
Write-Host "`n📦 Cloning VS Code modules (this may take 5-10 minutes)..."

# LSP Integration
if (-not (Test-Path "src/vendors/vscode-lsp/.git")) {
    Write-Host "  - Cloning LSP modules..."
    git clone --depth=1 --filter=blob:none --sparse `
        https://github.com/microsoft/vscode.git src/vendors/vscode-lsp
    Push-Location src/vendors/vscode-lsp
    git sparse-checkout set `
        src/vs/editor/common/languages `
        src/vs/editor/common/services `
        src/vs/platform/files `
        src/vs/base/common
    Pop-Location
}

# Keybinding System
if (-not (Test-Path "src/vendors/vscode-keybindings/.git")) {
    Write-Host "  - Cloning keybinding modules..."
    git clone --depth=1 --filter=blob:none --sparse `
        https://github.com/microsoft/vscode.git src/vendors/vscode-keybindings
    Push-Location src/vendors/vscode-keybindings
    git sparse-checkout set `
        src/vs/platform/keybinding `
        src/vs/base/common/keyCodes.ts
    Pop-Location
}

# Debug Adapter
if (-not (Test-Path "src/vendors/vscode-debug/.git")) {
    Write-Host "  - Cloning debug adapter modules..."
    git clone --depth=1 --filter=blob:none --sparse `
        https://github.com/microsoft/vscode.git src/vendors/vscode-debug
    Push-Location src/vendors/vscode-debug
    git sparse-checkout set `
        src/vs/workbench/contrib/debug
    Pop-Location
}

# 3. Install Theia packages
Write-Host "`n📦 Installing Theia packages..."
npm install --save `
    @theia/filesystem `
    @theia/markers `
    @theia/terminal `
    @theia/plugin-ext

# 4. Install additional dev dependencies
Write-Host "`n📦 Installing dev dependencies..."
npm install --save-dev `
    @playwright/test `
    vscode-languageserver-protocol `
    vscode-languageserver-types `
    @types/vscode-languageserver-protocol

# 5. Create vendor licenses file
Write-Host "`n📄 Creating vendor licenses documentation..."
@"
# Vendor Code Licenses

This file tracks all third-party code included in Primus IDE.

## VS Code (MIT License)

**Source:** https://github.com/microsoft/vscode
**License:** MIT
**Commit:** $(git -C src/vendors/vscode-lsp rev-parse HEAD)
**Date:** $(Get-Date -Format "yyyy-MM-dd")

**Components Used:**
- Language Server Protocol integration (src/vs/editor/common/languages)
- Keybinding system (src/vs/platform/keybinding)
- Debug Adapter Protocol (src/vs/workbench/contrib/debug)

**License Text:**
MIT License

Copyright (c) 2015 - present Microsoft Corporation

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

---

## Eclipse Theia (EPL-2.0 License)

**Source:** https://github.com/eclipse-theia/theia
**License:** Eclipse Public License 2.0
**Packages Used:**
- @theia/filesystem
- @theia/markers
- @theia/terminal
- @theia/plugin-ext

**License:** See node_modules/@theia/*/LICENSE for full text

---

## Attribution Requirements

When distributing Primus IDE:
1. Include this file in the distribution
2. Include VS Code MIT license
3. Include Theia EPL-2.0 license notices
4. Maintain copyright headers in vendored source files

"@ | Out-File -FilePath "VENDOR_LICENSES.md" -Encoding UTF8

# 6. Update .gitignore
Write-Host "`n📝 Updating .gitignore..."
@"

# Vendor code (keep source but ignore node_modules within)
src/vendors/**/node_modules
src/vendors/**/.git

"@ | Out-File -FilePath ".gitignore" -Append -Encoding UTF8

# 7. Create initial adapter interfaces
Write-Host "`n📝 Creating adapter interfaces..."

# LSP Adapter Interface
@"
// src/shared/adapters/ILSPAdapter.ts
// Interface for Language Server Protocol adapters

export interface Position {
  line: number;
  column: number;
}

export interface Range {
  start: Position;
  end: Position;
}

export interface Location {
  uri: string;
  range: Range;
}

export interface Hover {
  contents: string;
  range?: Range;
}

export interface CompletionItem {
  label: string;
  kind: string;
  detail?: string;
  documentation?: string;
  insertText?: string;
}

export interface WorkspaceEdit {
  changes: { [uri: string]: TextEdit[] };
}

export interface TextEdit {
  range: Range;
  newText: string;
}

export interface ILSPAdapter {
  /**
   * Initialize the language server for a workspace
   */
  initialize(workspaceRoot: string): Promise<void>;

  /**
   * Get definition locations for a symbol at a position
   */
  getDefinition(uri: string, position: Position): Promise<Location[]>;

  /**
   * Find all references to a symbol
   */
  getReferences(uri: string, position: Position): Promise<Location[]>;

  /**
   * Get hover information at a position
   */
  getHover(uri: string, position: Position): Promise<Hover | null>;

  /**
   * Rename a symbol across the workspace
   */
  rename(uri: string, position: Position, newName: string): Promise<WorkspaceEdit>;

  /**
   * Get code completions at a position
   */
  getCompletions(uri: string, position: Position): Promise<CompletionItem[]>;

  /**
   * Dispose of the language server
   */
  dispose(): void;
}
"@ | Out-File -FilePath "src/shared/adapters/ILSPAdapter.ts" -Encoding UTF8

Write-Host "`n✅ Setup complete!" -ForegroundColor Green
Write-Host "`nNext steps:"
Write-Host "  1. Review PROJECT_COMPLETION_PLAN.md"
Write-Host "  2. Run: npm run task:next -- --category='Code Intelligence'"
Write-Host "  3. Run: npm run task:start -- 637"
Write-Host "  4. Begin implementation following IMPLEMENTATION_GUIDE.md"
```

**Run the setup:**
```powershell
# Make script executable and run
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\scripts\setup-completion-path.ps1
```

---

## 📦 PHASE 1: LSP INTEGRATION RECIPES

### Recipe 1: TypeScript Language Server Adapter

**File:** `src/adapters/TypeScriptLSPAdapter.ts`

```typescript
// src/adapters/TypeScriptLSPAdapter.ts
import * as path from 'path';
import { fork, ChildProcess } from 'child_process';
import { 
  ILSPAdapter, 
  Position, 
  Location, 
  Hover, 
  CompletionItem,
  WorkspaceEdit 
} from '../shared/adapters/ILSPAdapter';

/**
 * Adapter for TypeScript Language Server
 * Wraps VS Code's TypeScript language features
 */
export class TypeScriptLSPAdapter implements ILSPAdapter {
  private serverProcess: ChildProcess | null = null;
  private workspaceRoot: string = '';
  private requestId: number = 0;
  private pendingRequests: Map<number, {
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }> = new Map();

  async initialize(workspaceRoot: string): Promise<void> {
    this.workspaceRoot = workspaceRoot;
    
    // Path to TypeScript language server
    const serverPath = require.resolve('typescript/lib/tsserver.js');
    
    // Fork the language server process
    this.serverProcess = fork(serverPath, [], {
      cwd: workspaceRoot,
      stdio: 'pipe',
      execArgv: []
    });

    // Set up message handling
    this.serverProcess.on('message', this.handleServerMessage.bind(this));
    this.serverProcess.on('error', (error) => {
      console.error('[LSP] Server error:', error);
    });

    // Send initialization request
    await this.sendRequest('initialize', {
      rootPath: workspaceRoot,
      capabilities: {
        textDocument: {
          synchronization: {
            didOpen: true,
            didChange: true,
            didClose: true
          }
        }
      }
    });
  }

  async getDefinition(uri: string, position: Position): Promise<Location[]> {
    const filePath = this.uriToPath(uri);
    
    const response = await this.sendRequest('textDocument/definition', {
      textDocument: { uri: filePath },
      position: { line: position.line - 1, character: position.column - 1 }
    });

    if (!response || !Array.isArray(response)) {
      return [];
    }

    return response.map((loc: any) => ({
      uri: this.pathToUri(loc.file),
      range: {
        start: { 
          line: loc.start.line + 1, 
          column: loc.start.offset 
        },
        end: { 
          line: loc.end.line + 1, 
          column: loc.end.offset 
        }
      }
    }));
  }

  async getReferences(uri: string, position: Position): Promise<Location[]> {
    const filePath = this.uriToPath(uri);
    
    const response = await this.sendRequest('textDocument/references', {
      textDocument: { uri: filePath },
      position: { line: position.line - 1, character: position.column - 1 },
      context: { includeDeclaration: true }
    });

    if (!response || !Array.isArray(response)) {
      return [];
    }

    return response.map((ref: any) => ({
      uri: this.pathToUri(ref.file),
      range: {
        start: { line: ref.start.line + 1, column: ref.start.offset },
        end: { line: ref.end.line + 1, column: ref.end.offset }
      }
    }));
  }

  async getHover(uri: string, position: Position): Promise<Hover | null> {
    const filePath = this.uriToPath(uri);
    
    const response = await this.sendRequest('textDocument/hover', {
      textDocument: { uri: filePath },
      position: { line: position.line - 1, character: position.column - 1 }
    });

    if (!response || !response.displayString) {
      return null;
    }

    return {
      contents: response.displayString,
      range: response.start && response.end ? {
        start: { line: response.start.line + 1, column: response.start.offset },
        end: { line: response.end.line + 1, column: response.end.offset }
      } : undefined
    };
  }

  async rename(uri: string, position: Position, newName: string): Promise<WorkspaceEdit> {
    const filePath = this.uriToPath(uri);
    
    const response = await this.sendRequest('textDocument/rename', {
      textDocument: { uri: filePath },
      position: { line: position.line - 1, character: position.column - 1 },
      newName
    });

    if (!response || !response.locs) {
      return { changes: {} };
    }

    const changes: { [uri: string]: any[] } = {};
    
    for (const loc of response.locs) {
      const fileUri = this.pathToUri(loc.file);
      if (!changes[fileUri]) {
        changes[fileUri] = [];
      }
      
      changes[fileUri].push({
        range: {
          start: { line: loc.start.line + 1, column: loc.start.offset },
          end: { line: loc.end.line + 1, column: loc.end.offset }
        },
        newText: newName
      });
    }

    return { changes };
  }

  async getCompletions(uri: string, position: Position): Promise<CompletionItem[]> {
    const filePath = this.uriToPath(uri);
    
    const response = await this.sendRequest('textDocument/completion', {
      textDocument: { uri: filePath },
      position: { line: position.line - 1, character: position.column - 1 }
    });

    if (!response || !response.entries) {
      return [];
    }

    return response.entries.map((entry: any) => ({
      label: entry.name,
      kind: entry.kind,
      detail: entry.kindModifiers,
      documentation: entry.documentation,
      insertText: entry.insertText || entry.name
    }));
  }

  dispose(): void {
    if (this.serverProcess) {
      this.serverProcess.kill();
      this.serverProcess = null;
    }
    this.pendingRequests.clear();
  }

  // Helper methods
  private async sendRequest(method: string, params: any): Promise<any> {
    if (!this.serverProcess) {
      throw new Error('Language server not initialized');
    }

    const id = ++this.requestId;
    const message = {
      jsonrpc: '2.0',
      id,
      method,
      params
    };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      this.serverProcess!.send(message);
      
      // Timeout after 5 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('LSP request timeout'));
        }
      }, 5000);
    });
  }

  private handleServerMessage(message: any): void {
    if (message.id && this.pendingRequests.has(message.id)) {
      const { resolve, reject } = this.pendingRequests.get(message.id)!;
      this.pendingRequests.delete(message.id);
      
      if (message.error) {
        reject(new Error(message.error.message));
      } else {
        resolve(message.result);
      }
    }
  }

  private uriToPath(uri: string): string {
    // Convert file:// URI to file path
    return uri.replace(/^file:\/\//, '');
  }

  private pathToUri(filePath: string): string {
    // Convert file path to file:// URI
    return 'file://' + filePath.replace(/\\/g, '/');
  }
}
```

### Recipe 2: LSP Service (Main Process)

**File:** `src/main/services/LSPService.ts`

```typescript
// src/main/services/LSPService.ts
import { TypeScriptLSPAdapter } from '../../adapters/TypeScriptLSPAdapter';
import { ILSPAdapter, Position, Location, Hover, WorkspaceEdit } from '../../shared/adapters/ILSPAdapter';

/**
 * Main process service for managing language servers
 */
export class LSPService {
  private adapters: Map<string, ILSPAdapter> = new Map();
  private workspaceRoot: string = '';

  async initialize(workspaceRoot: string): Promise<void> {
    this.workspaceRoot = workspaceRoot;
    
    // Register TypeScript/JavaScript adapter
    await this.registerLanguage('typescript');
    await this.registerLanguage('javascript');
  }

  private async registerLanguage(language: string): Promise<void> {
    if (this.adapters.has(language)) {
      return; // Already registered
    }

    let adapter: ILSPAdapter;

    switch (language) {
      case 'typescript':
      case 'javascript':
        adapter = new TypeScriptLSPAdapter();
        break;
      default:
        console.warn(`[LSP] No adapter available for language: ${language}`);
        return;
    }

    try {
      await adapter.initialize(this.workspaceRoot);
      this.adapters.set(language, adapter);
      console.log(`[LSP] Registered language server for: ${language}`);
    } catch (error) {
      console.error(`[LSP] Failed to initialize ${language} adapter:`, error);
    }
  }

  async goToDefinition(uri: string, position: Position): Promise<Location[]> {
    const language = this.getLanguageForUri(uri);
    const adapter = this.adapters.get(language);
    
    if (!adapter) {
      console.warn(`[LSP] No adapter for language: ${language}`);
      return [];
    }

    try {
      return await adapter.getDefinition(uri, position);
    } catch (error) {
      console.error('[LSP] Error in goToDefinition:', error);
      return [];
    }
  }

  async findReferences(uri: string, position: Position): Promise<Location[]> {
    const language = this.getLanguageForUri(uri);
    const adapter = this.adapters.get(language);
    
    if (!adapter) {
      return [];
    }

    try {
      return await adapter.getReferences(uri, position);
    } catch (error) {
      console.error('[LSP] Error in findReferences:', error);
      return [];
    }
  }

  async getHover(uri: string, position: Position): Promise<Hover | null> {
    const language = this.getLanguageForUri(uri);
    const adapter = this.adapters.get(language);
    
    if (!adapter) {
      return null;
    }

    try {
      return await adapter.getHover(uri, position);
    } catch (error) {
      console.error('[LSP] Error in getHover:', error);
      return null;
    }
  }

  async renameSymbol(uri: string, position: Position, newName: string): Promise<WorkspaceEdit> {
    const language = this.getLanguageForUri(uri);
    const adapter = this.adapters.get(language);
    
    if (!adapter) {
      return { changes: {} };
    }

    try {
      return await adapter.rename(uri, position, newName);
    } catch (error) {
      console.error('[LSP] Error in renameSymbol:', error);
      return { changes: {} };
    }
  }

  dispose(): void {
    for (const [language, adapter] of this.adapters) {
      console.log(`[LSP] Disposing ${language} adapter`);
      adapter.dispose();
    }
    this.adapters.clear();
  }

  private getLanguageForUri(uri: string): string {
    const extension = uri.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'ts':
      case 'tsx':
        return 'typescript';
      case 'js':
      case 'jsx':
        return 'javascript';
      default:
        return 'unknown';
    }
  }
}

// Singleton instance
export const lspService = new LSPService();
```

### Recipe 3: IPC Handlers for LSP

**File:** `src/main/ipc/lspHandlers.ts`

```typescript
// src/main/ipc/lspHandlers.ts
import { ipcMain } from 'electron';
import { lspService } from '../services/LSPService';
import { Position } from '../../shared/adapters/ILSPAdapter';

/**
 * Register IPC handlers for LSP operations
 */
export function registerLSPHandlers(): void {
  // Initialize LSP service for workspace
  ipcMain.handle('lsp:initialize', async (event, workspaceRoot: string) => {
    try {
      await lspService.initialize(workspaceRoot);
      return { success: true };
    } catch (error: any) {
      console.error('[IPC] LSP initialization error:', error);
      return { success: false, error: error.message };
    }
  });

  // Go to definition
  ipcMain.handle('lsp:goToDefinition', async (event, uri: string, position: Position) => {
    try {
      const locations = await lspService.goToDefinition(uri, position);
      return { success: true, locations };
    } catch (error: any) {
      console.error('[IPC] Go to definition error:', error);
      return { success: false, error: error.message, locations: [] };
    }
  });

  // Find references
  ipcMain.handle('lsp:findReferences', async (event, uri: string, position: Position) => {
    try {
      const references = await lspService.findReferences(uri, position);
      return { success: true, references };
    } catch (error: any) {
      console.error('[IPC] Find references error:', error);
      return { success: false, error: error.message, references: [] };
    }
  });

  // Get hover info
  ipcMain.handle('lsp:getHover', async (event, uri: string, position: Position) => {
    try {
      const hover = await lspService.getHover(uri, position);
      return { success: true, hover };
    } catch (error: any) {
      console.error('[IPC] Get hover error:', error);
      return { success: false, error: error.message, hover: null };
    }
  });

  // Rename symbol
  ipcMain.handle('lsp:rename', async (event, uri: string, position: Position, newName: string) => {
    try {
      const edit = await lspService.renameSymbol(uri, position, newName);
      return { success: true, edit };
    } catch (error: any) {
      console.error('[IPC] Rename symbol error:', error);
      return { success: false, error: error.message, edit: { changes: {} } };
    }
  });

  console.log('[IPC] LSP handlers registered');
}
```

### Recipe 4: Preload API for LSP

**File:** Update `src/preload/preload.ts`

```typescript
// Add to src/preload/preload.ts
const primusApi = {
  // ... existing APIs ...
  
  lsp: {
    initialize: (workspaceRoot: string) => 
      ipcRenderer.invoke('lsp:initialize', workspaceRoot),
    
    goToDefinition: (uri: string, position: { line: number; column: number }) => 
      ipcRenderer.invoke('lsp:goToDefinition', uri, position),
    
    findReferences: (uri: string, position: { line: number; column: number }) => 
      ipcRenderer.invoke('lsp:findReferences', uri, position),
    
    getHover: (uri: string, position: { line: number; column: number }) => 
      ipcRenderer.invoke('lsp:getHover', uri, position),
    
    rename: (uri: string, position: { line: number; column: number }, newName: string) => 
      ipcRenderer.invoke('lsp:rename', uri, position, newName)
  }
};

contextBridge.exposeInMainWorld('primus', primusApi);
```

### Recipe 5: Monaco Integration

**File:** Update `src/renderer/MonacoEditor.tsx`

```typescript
// Add to src/renderer/MonacoEditor.tsx
import * as monaco from 'monaco-editor';

// Register LSP Definition Provider
monaco.languages.registerDefinitionProvider('typescript', {
  provideDefinition: async (model, position) => {
    const uri = model.uri.toString();
    const pos = {
      line: position.lineNumber,
      column: position.column
    };

    const response = await window.primus.lsp.goToDefinition(uri, pos);
    
    if (!response.success || !response.locations) {
      return null;
    }

    return response.locations.map((loc: any) => ({
      uri: monaco.Uri.parse(loc.uri),
      range: new monaco.Range(
        loc.range.start.line,
        loc.range.start.column,
        loc.range.end.line,
        loc.range.end.column
      )
    }));
  }
});

// Register LSP Reference Provider
monaco.languages.registerReferenceProvider('typescript', {
  provideReferences: async (model, position, context) => {
    const uri = model.uri.toString();
    const pos = {
      line: position.lineNumber,
      column: position.column
    };

    const response = await window.primus.lsp.findReferences(uri, pos);
    
    if (!response.success || !response.references) {
      return [];
    }

    return response.references.map((ref: any) => ({
      uri: monaco.Uri.parse(ref.uri),
      range: new monaco.Range(
        ref.range.start.line,
        ref.range.start.column,
        ref.range.end.line,
        ref.range.end.column
      )
    }));
  }
});

// Register LSP Hover Provider
monaco.languages.registerHoverProvider('typescript', {
  provideHover: async (model, position) => {
    const uri = model.uri.toString();
    const pos = {
      line: position.lineNumber,
      column: position.column
    };

    const response = await window.primus.lsp.getHover(uri, pos);
    
    if (!response.success || !response.hover) {
      return null;
    }

    return {
      contents: [{ value: response.hover.contents }],
      range: response.hover.range ? new monaco.Range(
        response.hover.range.start.line,
        response.hover.range.start.column,
        response.hover.range.end.line,
        response.hover.range.end.column
      ) : undefined
    };
  }
});

// Register LSP Rename Provider
monaco.languages.registerRenameProvider('typescript', {
  provideRenameEdits: async (model, position, newName) => {
    const uri = model.uri.toString();
    const pos = {
      line: position.lineNumber,
      column: position.column
    };

    const response = await window.primus.lsp.rename(uri, pos, newName);
    
    if (!response.success || !response.edit) {
      return null;
    }

    const edits: any[] = [];
    
    for (const [fileUri, textEdits] of Object.entries(response.edit.changes)) {
      for (const edit of textEdits as any[]) {
        edits.push({
          resource: monaco.Uri.parse(fileUri),
          edit: {
            range: new monaco.Range(
              edit.range.start.line,
              edit.range.start.column,
              edit.range.end.line,
              edit.range.end.column
            ),
            text: edit.newText
          }
        });
      }
    }

    return { edits };
  }
});
```

---

## 🧪 TESTING RECIPES

### Test Template for LSP Features

**File:** `test/lsp/goToDefinition.test.ts`

```typescript
// test/lsp/goToDefinition.test.ts
import { TypeScriptLSPAdapter } from '../../src/adapters/TypeScriptLSPAdapter';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

describe('LSP - Go to Definition', () => {
  let adapter: TypeScriptLSPAdapter;
  let testWorkspace: string;

  beforeAll(async () => {
    // Create temporary workspace
    testWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), 'primus-lsp-test-'));
    
    // Create test files
    const testFile = path.join(testWorkspace, 'test.ts');
    fs.writeFileSync(testFile, `
function greet(name: string): string {
  return 'Hello, ' + name;
}

const result = greet('World');
    `);

    // Initialize adapter
    adapter = new TypeScriptLSPAdapter();
    await adapter.initialize(testWorkspace);
  });

  afterAll(() => {
    adapter.dispose();
    // Clean up test workspace
    fs.rmSync(testWorkspace, { recursive: true, force: true });
  });

  test('should find definition of function', async () => {
    const uri = `file://${path.join(testWorkspace, 'test.ts')}`;
    const position = { line: 6, column: 16 }; // Position on 'greet' usage
    
    const locations = await adapter.getDefinition(uri, position);
    
    expect(locations).toHaveLength(1);
    expect(locations[0].range.start.line).toBe(2); // Function definition line
  });

  test('should return empty array for non-existent symbol', async () => {
    const uri = `file://${path.join(testWorkspace, 'test.ts')}`;
    const position = { line: 1, column: 1 }; // Empty line
    
    const locations = await adapter.getDefinition(uri, position);
    
    expect(locations).toEqual([]);
  });

  test('should handle invalid file gracefully', async () => {
    const uri = 'file:///nonexistent.ts';
    const position = { line: 1, column: 1 };
    
    const locations = await adapter.getDefinition(uri, position);
    
    expect(locations).toEqual([]);
  });
});
```

---

## 📊 DAILY WORKFLOW TEMPLATE

### Morning Routine

```powershell
# 1. Pull latest changes
git pull origin ide-clone

# 2. Check task status
npm run tasks:status

# 3. Select next task
npm run task:next -- --category="Code Intelligence" --limit-impact=5

# 4. Start working on task
npm run task:start -- <task-id>

# 5. Open project in IDE
npm run dev
```

### During Development

```powershell
# Build specific modules
npm run build:preload
npm run build:main
npm run build:renderer

# Run tests
npm test -- --watch

# Check code quality
npm run lint
npm run format
```

### End of Day

```powershell
# 1. Commit changes
git add .
git commit -m "TASK-637: Implement LSP go to definition

- Created TypeScriptLSPAdapter
- Added IPC handlers
- Integrated with Monaco editor
- Tests passing

Refs: #637
Progress: 80%"

# 2. Mark task complete (if done)
npm run task:complete -- 637

# 3. Update trace map
npm run tasks:pipeline

# 4. Push changes
git push origin ide-clone

# 5. Update status document
# (Manual: Update PROJECT_STATUS.md with progress)
```

---

## 📚 TROUBLESHOOTING GUIDE

### Common Issues

**Issue 1: Vendor code won't clone**
```powershell
# Solution: Check git-lfs
git lfs install

# Or use HTTP instead of SSH
git config --global url."https://".insteadOf git://
```

**Issue 2: TypeScript errors in vendored code**
```powershell
# Solution: Add to tsconfig.json
{
  "compilerOptions": {
    "skipLibCheck": true,
    "paths": {
      "vs/*": ["src/vendors/vscode-lsp/src/vs/*"]
    }
  },
  "exclude": [
    "src/vendors/**/test",
    "src/vendors/**/*.test.ts"
  ]
}
```

**Issue 3: LSP not responding**
```typescript
// Add debug logging to adapter
private async sendRequest(method: string, params: any): Promise<any> {
  console.log(`[LSP] Sending request: ${method}`, params);
  // ... existing code
}
```

**Issue 4: Memory leaks in language server**
```typescript
// Ensure proper cleanup
dispose(): void {
  // Cancel all pending requests
  for (const [id, { reject }] of this.pendingRequests) {
    reject(new Error('Language server disposed'));
  }
  this.pendingRequests.clear();
  
  // Kill process
  if (this.serverProcess) {
    this.serverProcess.kill('SIGTERM');
    this.serverProcess = null;
  }
}
```

---

## ✅ READY TO START?

Before beginning implementation:

- [ ] Review PROJECT_COMPLETION_PLAN.md (milestones, timeline)
- [ ] Run setup script: `.\scripts\setup-completion-path.ps1`
- [ ] Verify build: `npm run build`
- [ ] Verify dev environment: `npm run dev`
- [ ] Read through LSP recipes above
- [ ] Check out feature branch: `git checkout -b feature/lsp-integration`

**First Task:** Implement Recipe 1-5 for basic LSP integration.

**Questions?** Refer back to PROJECT_COMPLETION_PLAN.md or ask for clarification.

---

**END OF IMPLEMENTATION GUIDE**
