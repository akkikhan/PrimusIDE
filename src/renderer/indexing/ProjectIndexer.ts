import * as ts from 'typescript';
import { ProjectIndex, FileNode, SymbolInfo, SymbolKind } from './types';

export class ProjectIndexer {
  private static instance: ProjectIndexer;
  private index: ProjectIndex | null = null;
  private isIndexing = false;

  private constructor() {}

  public static getInstance(): ProjectIndexer {
    if (!ProjectIndexer.instance) {
      ProjectIndexer.instance = new ProjectIndexer();
    }
    return ProjectIndexer.instance;
  }

  // New helper: return symbols for a given file (empty if index not ready)
  public getSymbolsForFile(filePath: string): SymbolInfo[] {
    if (!this.index) return [];
    return this.index.symbols.filter(s => s.path === filePath);
  }

  public async startIndexing(rootPath: string): Promise<void> {
    if (this.isIndexing) {
      console.warn('Indexing is already in progress.');
      return;
    }

    this.isIndexing = true;
    
    try {
      const fileTree = await this.buildFileTree(rootPath);
      if (!fileTree) {
        console.error('Failed to build file tree. Aborting indexing.');
        this.index = null;
        this.isIndexing = false;
        return;
      }
      
      const symbols = await this.extractSymbols(fileTree);
      
      this.index = {
        fileTree,
        symbols,
      };

      console.log(`Indexed ${this.countFiles(fileTree)} files and found ${symbols.length} symbols.`);
    } catch (error) {
      console.error('Error during project indexing:', error);
      this.index = null;
    } finally {
      this.isIndexing = false;
    }
  }

  public getIndex(): ProjectIndex | null {
    return this.index;
  }

  private async buildFileTree(path: string): Promise<FileNode | null> {
    const name = path.split(/[/\\]/).pop() || '';
    const stats = await (window.primus.fs as any).stat(path);

    if (!stats) {
      console.warn(`Could not get stats for path: ${path}. Skipping.`);
      return null;
    }

    const isDirectory = stats.isDirectory;
    const node: FileNode = { path, name, isDirectory };

    if (isDirectory) {
      const children = await window.primus.fs.readDir(path);
      const childNodes = await Promise.all(
        children
          .filter(child => !this.shouldIgnore(child.name))
          .map(child => this.buildFileTree(`${path}/${child.name}`))
      );
      node.children = childNodes.filter((child): child is FileNode => child !== null);
    }

    return node;
  }

  private async extractSymbols(node: FileNode): Promise<SymbolInfo[]> {
    let symbols: SymbolInfo[] = [];

    if (node.isDirectory && node.children) {
      for (const child of node.children) {
        symbols = symbols.concat(await this.extractSymbols(child));
      }
    } else if (this.isSupportedFile(node.name)) {
      try {
        const fileContent = await window.primus.fs.readFile(node.path);
        const fileSymbols = this.extractSymbolsFromFile(node.path, fileContent);
        symbols = symbols.concat(fileSymbols);
      } catch (error) {
        console.error(`Error extracting symbols from ${node.path}:`, error);
      }
    }

    return symbols;
  }

  private extractSymbolsFromFile(filePath: string, fileContent: string): SymbolInfo[] {
    const symbols: SymbolInfo[] = [];
    const sourceFile = ts.createSourceFile(
      filePath,
      fileContent,
      ts.ScriptTarget.Latest,
      true
    );

    const visit = (node: ts.Node) => {
      let symbol: SymbolInfo | null = null;

      if (ts.isClassDeclaration(node) && node.name) {
        symbol = {
          name: node.name.getText(sourceFile),
          kind: SymbolKind.Class,
          path: filePath,
          position: {
            start: node.getStart(sourceFile),
            end: node.getEnd(),
          },
        };
      } else if (ts.isFunctionDeclaration(node) && node.name) {
        symbol = {
          name: node.name.getText(sourceFile),
          kind: SymbolKind.Function,
          path: filePath,
          position: {
            start: node.getStart(sourceFile),
            end: node.getEnd(),
          },
        };
      } else if (ts.isInterfaceDeclaration(node) && node.name) {
        symbol = {
          name: node.name.getText(sourceFile),
          kind: SymbolKind.Interface,
          path: filePath,
          position: {
            start: node.getStart(sourceFile),
            end: node.getEnd(),
          },
        };
      } else if (ts.isVariableDeclaration(node) && node.name) {
        // This can capture variables, constants, and arrow functions
        symbol = {
            name: node.name.getText(sourceFile),
            kind: SymbolKind.Variable,
            path: filePath,
            position: {
                start: node.getStart(sourceFile),
                end: node.getEnd(),
            },
        };
      }

      if (symbol) {
        symbols.push(symbol);
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return symbols;
  }

  private countFiles(node: FileNode): number {
    if (!node.isDirectory) {
      return 1;
    }
    return (node.children || []).reduce((acc, child) => acc + this.countFiles(child), 0);
  }

  private shouldIgnore(fileName: string): boolean {
    return fileName === 'node_modules' || fileName.startsWith('.');
  }

  private isSupportedFile(fileName: string): boolean {
    return /\.(ts|tsx|js|jsx)$/.test(fileName);
  }
}
