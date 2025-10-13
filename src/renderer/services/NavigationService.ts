import * as monaco from 'monaco-editor';
import { ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../../shared/ipcChannels';

export interface NavigationItem {
  id: string;
  type: 'file' | 'symbol' | 'history';
  name: string;
  path: string;
  line?: number;
  column?: number;
  icon?: string;
  timestamp?: number;
}

export class NavigationService {
  private navigationHistory: NavigationItem[] = [];
  private historyIndex: number = -1;
  private maxHistorySize: number = 100;

  constructor() {
    // Initialize the navigation service
  }

  /**
   * Navigate to a file at a specific line and column
   */
  async navigateToFile(filePath: string, line?: number, column?: number): Promise<void> {
    try {
      // Add to navigation history
      this.addToHistory({
        id: `file-${filePath}-${line || 0}-${column || 0}`,
        type: 'file',
        name: this.getFileName(filePath),
        path: filePath,
        line,
        column,
        icon: this.getFileIcon(filePath)
      });

      // Send message to main process to open file
      await ipcRenderer.invoke(
        IPC_CHANNELS.TERMINAL_CWD, // Using existing channel as placeholder
        filePath,
        line,
        column
      );
    } catch (error) {
      console.error('Error navigating to file:', error);
    }
  }

  /**
   * Navigate to a symbol in a file
   */
  async navigateToSymbol(filePath: string, symbolName: string, line: number, column: number): Promise<void> {
    try {
      // Add to navigation history
      this.addToHistory({
        id: `symbol-${filePath}-${symbolName}`,
        type: 'symbol',
        name: symbolName,
        path: filePath,
        line,
        column,
        icon: 'symbol'
      });

      // Send message to main process to open file at symbol location
      await ipcRenderer.invoke(
        IPC_CHANNELS.TERMINAL_CWD, // Using existing channel as placeholder
        filePath,
        line,
        column
      );
    } catch (error) {
      console.error('Error navigating to symbol:', error);
    }
  }

  /**
   * Navigate back in history
   */
  async navigateBack(): Promise<void> {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      const item = this.navigationHistory[this.historyIndex];
      await this.navigateToItem(item);
    }
  }

  /**
   * Navigate forward in history
   */
  async navigateForward(): Promise<void> {
    if (this.historyIndex < this.navigationHistory.length - 1) {
      this.historyIndex++;
      const item = this.navigationHistory[this.historyIndex];
      await this.navigateToItem(item);
    }
  }

  /**
   * Get navigation history
   */
  getHistory(): NavigationItem[] {
    return [...this.navigationHistory];
  }

  /**
   * Clear navigation history
   */
  clearHistory(): void {
    this.navigationHistory = [];
    this.historyIndex = -1;
  }

  /**
   * Add item to navigation history
   */
  private addToHistory(item: NavigationItem): void {
    // Remove forward history if we're not at the end
    if (this.historyIndex < this.navigationHistory.length - 1) {
      this.navigationHistory = this.navigationHistory.slice(0, this.historyIndex + 1);
    }

    // Add new item
    this.navigationHistory.push({
      ...item,
      timestamp: Date.now()
    });

    // Limit history size
    if (this.navigationHistory.length > this.maxHistorySize) {
      this.navigationHistory = this.navigationHistory.slice(-this.maxHistorySize);
    }

    // Update history index
    this.historyIndex = this.navigationHistory.length - 1;
  }

  /**
   * Navigate to a navigation item
   */
  private async navigateToItem(item: NavigationItem): Promise<void> {
    switch (item.type) {
      case 'file':
      case 'symbol':
        await this.navigateToFile(item.path, item.line, item.column);
        break;
      case 'history':
        // Handle history navigation
        break;
    }
  }

  /**
   * Get file icon based on file extension
   */
  private getFileIcon(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase() || '';
    switch (ext) {
      case 'ts':
      case 'tsx':
        return 'typescript';
      case 'js':
      case 'jsx':
        return 'javascript';
      case 'html':
        return 'html';
      case 'css':
        return 'css';
      case 'json':
        return 'json';
      case 'md':
        return 'markdown';
      default:
        return 'file';
    }
  }

  /**
   * Extract file name from path
   */
  private getFileName(filePath: string): string {
    return filePath.split('/').pop() || filePath.split('\\').pop() || filePath;
  }
}

// Export a singleton instance
export const navigationService = new NavigationService();