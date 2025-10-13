import { EventEmitter } from 'events';

export interface CodeChange {
  id: string;
  filePath: string;
  originalContent: string;
  modifiedContent: string;
  lineStart: number;
  lineEnd: number;
  changeType: 'insert' | 'replace' | 'delete';
  timestamp: Date;
  description: string;
  aiProvider?: string;
  applied: boolean;
}

export interface CodeDiff {
  additions: Array<{
    line: number;
    content: string;
  }>;
  deletions: Array<{
    line: number;
    content: string;
  }>;
  modifications: Array<{
    line: number;
    oldContent: string;
    newContent: string;
  }>;
}

export interface CodeApplicationResult {
  success: boolean;
  changeId: string;
  message: string;
  conflict?: {
    type: 'merge' | 'overwrite' | 'concurrent';
    details: string;
  };
}

class CodeApplicationManager extends EventEmitter {
  private changes: Map<string, CodeChange> = new Map();
  private rollbackStack: CodeChange[] = [];
  private maxRollbackHistory = 50;
  private pendingChanges: Set<string> = new Set();

  constructor() {
    super();
    this.loadChangeHistory();
  }

  /**
   * Create a new code change from AI suggestion
   */
  async createCodeChange(
    filePath: string,
    content: string,
    changeType: 'insert' | 'replace' | 'delete',
    lineStart: number,
    lineEnd: number,
    description: string,
    aiProvider?: string
  ): Promise<CodeChange> {
    try {
      // Get current file content
      const originalContent = await this.getFileContent(filePath);
      
      // Generate modified content based on change type
      const modifiedContent = await this.generateModifiedContent(
        originalContent,
        content,
        changeType,
        lineStart,
        lineEnd
      );

      const change: CodeChange = {
        id: this.generateChangeId(),
        filePath,
        originalContent,
        modifiedContent,
        lineStart,
        lineEnd,
        changeType,
        timestamp: new Date(),
        description,
        aiProvider,
        applied: false
      };

      this.changes.set(change.id, change);
      this.emit('changeCreated', change);
      
      return change;
    } catch (error) {
      throw new Error(`Failed to create code change: ${error}`);
    }
  }

  /**
   * Generate diff for a code change
   */
  generateDiff(changeId: string): CodeDiff | null {
    const change = this.changes.get(changeId);
    if (!change) return null;

    const originalLines = change.originalContent.split('\n');
    const modifiedLines = change.modifiedContent.split('\n');

    const diff: CodeDiff = {
      additions: [],
      deletions: [],
      modifications: []
    };

    // Simple line-by-line diff algorithm
    const maxLines = Math.max(originalLines.length, modifiedLines.length);
    
    for (let i = 0; i < maxLines; i++) {
      const originalLine = originalLines[i];
      const modifiedLine = modifiedLines[i];

      if (originalLine === undefined) {
        // Line added
        diff.additions.push({
          line: i + 1,
          content: modifiedLine
        });
      } else if (modifiedLine === undefined) {
        // Line deleted
        diff.deletions.push({
          line: i + 1,
          content: originalLine
        });
      } else if (originalLine !== modifiedLine) {
        // Line modified
        diff.modifications.push({
          line: i + 1,
          oldContent: originalLine,
          newContent: modifiedLine
        });
      }
    }

    return diff;
  }

  /**
   * Preview a code change without applying it
   */
  async previewChange(changeId: string): Promise<{
    change: CodeChange;
    diff: CodeDiff;
    preview: string;
  } | null> {
    const change = this.changes.get(changeId);
    if (!change) return null;

    const diff = this.generateDiff(changeId);
    if (!diff) return null;

    return {
      change,
      diff,
      preview: change.modifiedContent
    };
  }

  /**
   * Apply a code change to the file
   */
  async applyChange(changeId: string, force: boolean = false): Promise<CodeApplicationResult> {
    const change = this.changes.get(changeId);
    if (!change) {
      return {
        success: false,
        changeId,
        message: 'Change not found'
      };
    }

    if (change.applied) {
      return {
        success: false,
        changeId,
        message: 'Change already applied'
      };
    }

    try {
      // Check for conflicts if not forcing
      if (!force) {
        const currentContent = await this.getFileContent(change.filePath);
        if (currentContent !== change.originalContent) {
          return {
            success: false,
            changeId,
            message: 'File has been modified since change was created',
            conflict: {
              type: 'concurrent',
              details: 'The file content has changed since this modification was suggested'
            }
          };
        }
      }

      // Apply the change
      await this.writeFileContent(change.filePath, change.modifiedContent);
      
      // Mark as applied and add to rollback stack
      change.applied = true;
      this.addToRollbackStack(change);
      
      this.emit('changeApplied', change);
      
      return {
        success: true,
        changeId,
        message: 'Change applied successfully'
      };
    } catch (error) {
      return {
        success: false,
        changeId,
        message: `Failed to apply change: ${error}`
      };
    }
  }

  /**
   * Apply multiple changes in batch
   */
  async applyBatchChanges(changeIds: string[], force: boolean = false): Promise<CodeApplicationResult[]> {
    const results: CodeApplicationResult[] = [];
    
    for (const changeId of changeIds) {
      const result = await this.applyChange(changeId, force);
      results.push(result);
      
      // Stop on first failure unless forced
      if (!result.success && !force) {
        break;
      }
    }
    
    this.emit('batchApplied', results);
    return results;
  }

  /**
   * Rollback the last applied change
   */
  async rollbackLastChange(): Promise<CodeApplicationResult> {
    const lastChange = this.rollbackStack.pop();
    if (!lastChange) {
      return {
        success: false,
        changeId: '',
        message: 'No changes to rollback'
      };
    }

    try {
      // Restore original content
      await this.writeFileContent(lastChange.filePath, lastChange.originalContent);
      
      // Mark as not applied
      lastChange.applied = false;
      
      this.emit('changeRolledBack', lastChange);
      
      return {
        success: true,
        changeId: lastChange.id,
        message: 'Change rolled back successfully'
      };
    } catch (error) {
      // Re-add to stack if rollback failed
      this.rollbackStack.push(lastChange);
      
      return {
        success: false,
        changeId: lastChange.id,
        message: `Failed to rollback change: ${error}`
      };
    }
  }

  /**
   * Rollback to a specific change
   */
  async rollbackToChange(changeId: string): Promise<CodeApplicationResult[]> {
    const results: CodeApplicationResult[] = [];
    
    // Find the change in rollback stack
    const changeIndex = this.rollbackStack.findIndex(c => c.id === changeId);
    if (changeIndex === -1) {
      return [{
        success: false,
        changeId,
        message: 'Change not found in rollback history'
      }];
    }

    // Rollback all changes after this one
    const changesToRollback = this.rollbackStack.slice(changeIndex);
    changesToRollback.reverse(); // Rollback in reverse order
    
    for (const change of changesToRollback) {
      const result = await this.rollbackLastChange();
      results.push(result);
      
      if (!result.success) {
        break;
      }
    }
    
    return results;
  }

  /**
   * Get all pending changes
   */
  getPendingChanges(): CodeChange[] {
    return Array.from(this.changes.values()).filter(c => !c.applied);
  }

  /**
   * Get applied changes
   */
  getAppliedChanges(): CodeChange[] {
    return this.rollbackStack.slice();
  }

  /**
   * Get change by ID
   */
  getChange(changeId: string): CodeChange | undefined {
    return this.changes.get(changeId);
  }

  /**
   * Delete a change
   */
  deleteChange(changeId: string): boolean {
    const change = this.changes.get(changeId);
    if (!change || change.applied) {
      return false;
    }
    
    this.changes.delete(changeId);
    this.pendingChanges.delete(changeId);
    this.emit('changeDeleted', changeId);
    
    return true;
  }

  /**
   * Clear all changes
   */
  clearAllChanges(): void {
    this.changes.clear();
    this.pendingChanges.clear();
    this.emit('allChangesCleared');
  }

  private async getFileContent(filePath: string): Promise<string> {
    // Use IPC to get file content from main process
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

  private async writeFileContent(filePath: string, content: string): Promise<void> {
    // Use IPC to write file content through main process
    return new Promise((resolve, reject) => {
      const ipc = (window as any).electronAPI;
      if (!ipc || !ipc.fs) {
        reject(new Error('Electron IPC not available'));
        return;
      }

      ipc.fs.writeFile(filePath, content)
        .then(() => resolve())
        .catch((error: any) => reject(error));
    });
  }

  private async generateModifiedContent(
    originalContent: string,
    newContent: string,
    changeType: 'insert' | 'replace' | 'delete',
    lineStart: number,
    lineEnd: number
  ): Promise<string> {
    const lines = originalContent.split('\n');
    
    switch (changeType) {
      case 'insert':
        // Insert new content at specified line
        lines.splice(lineStart - 1, 0, ...newContent.split('\n'));
        break;
        
      case 'replace':
        // Replace content between start and end lines
        const newLines = newContent.split('\n');
        lines.splice(lineStart - 1, lineEnd - lineStart + 1, ...newLines);
        break;
        
      case 'delete':
        // Delete content between start and end lines
        lines.splice(lineStart - 1, lineEnd - lineStart + 1);
        break;
    }
    
    return lines.join('\n');
  }

  private generateChangeId(): string {
    return `change_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private addToRollbackStack(change: CodeChange): void {
    this.rollbackStack.push({ ...change });
    
    // Maintain max history size
    if (this.rollbackStack.length > this.maxRollbackHistory) {
      this.rollbackStack.shift();
    }
    
    this.saveChangeHistory();
  }

  private saveChangeHistory(): void {
    try {
      const history = {
        changes: Array.from(this.changes.entries()),
        rollbackStack: this.rollbackStack
      };
      localStorage.setItem('codeApplicationHistory', JSON.stringify(history));
    } catch (error) {
      console.warn('Failed to save change history:', error);
    }
  }

  private loadChangeHistory(): void {
    try {
      const stored = localStorage.getItem('codeApplicationHistory');
      if (stored) {
        const history = JSON.parse(stored);
        this.changes = new Map(history.changes || []);
        this.rollbackStack = history.rollbackStack || [];
      }
    } catch (error) {
      console.warn('Failed to load change history:', error);
    }
  }
}

export const codeApplicationManager = new CodeApplicationManager();
