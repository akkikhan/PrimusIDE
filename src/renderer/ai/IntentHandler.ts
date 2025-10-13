/**
 * AI Intent Handler - Advanced Intent Recognition and Processing System
 * Provides intelligent command processing for the AI-Enhanced SplitViewEditor
 */

export interface Intent {
  type: IntentType;
  confidence: number;
  parameters: Record<string, any>;
  context?: string;
  timestamp: number;
}

export enum IntentType {
  // File Operations
  OPEN_FILE = 'open_file',
  CREATE_FILE = 'create_file',
  SAVE_FILE = 'save_file',
  CLOSE_FILE = 'close_file',
  
  // Editor Operations
  SPLIT_VIEW = 'split_view',
  MERGE_VIEW = 'merge_view',
  COMPARE_FILES = 'compare_files',
  SYNC_EDITORS = 'sync_editors',
  
  // AI Analysis
  ANALYZE_CODE = 'analyze_code',
  SUGGEST_IMPROVEMENTS = 'suggest_improvements',
  EXPLAIN_CODE = 'explain_code',
  FIND_BUGS = 'find_bugs',
  
  // Navigation
  GOTO_LINE = 'goto_line',
  FIND_FUNCTION = 'find_function',
  SEARCH_CONTENT = 'search_content',
  
  // Code Manipulation
  FORMAT_CODE = 'format_code',
  REFACTOR_CODE = 'refactor_code',
  ADD_COMMENTS = 'add_comments',
  
  // Layout Control
  CHANGE_LAYOUT = 'change_layout',
  TOGGLE_PANELS = 'toggle_panels',
  RESIZE_EDITORS = 'resize_editors',
  
  // Unknown
  UNKNOWN = 'unknown'
}

export class IntentHandler {
  private intentPatterns: Map<IntentType, RegExp[]> = new Map();
  private contextHistory: Intent[] = [];
  
  constructor() {
    this.initializePatterns();
  }
  
  private initializePatterns(): void {
    // File Operations
    this.intentPatterns.set(IntentType.OPEN_FILE, [
      /open\s+(file|document)\s*(.+)?/i,
      /load\s+(.+)/i,
      /show\s+me\s+(.+)/i
    ]);
    
    this.intentPatterns.set(IntentType.CREATE_FILE, [
      /create\s+(new\s+)?(file|document)/i,
      /new\s+(file|document)/i,
      /make\s+a\s+(file|document)/i
    ]);
    
    this.intentPatterns.set(IntentType.SAVE_FILE, [
      /save\s+(file|document|this)/i,
      /persist\s+(changes|file)/i,
      /write\s+to\s+disk/i
    ]);
    
    // Editor Operations
    this.intentPatterns.set(IntentType.SPLIT_VIEW, [
      /split\s+(view|editor|screen)/i,
      /divide\s+editor/i,
      /side\s+by\s+side/i,
      /dual\s+editor/i
    ]);
    
    this.intentPatterns.set(IntentType.COMPARE_FILES, [
      /compare\s+(files|documents)/i,
      /diff\s+(files|documents)/i,
      /show\s+differences/i,
      /find\s+changes/i
    ]);
    
    this.intentPatterns.set(IntentType.SYNC_EDITORS, [
      /sync\s+(editors|views)/i,
      /synchronize\s+scrolling/i,
      /link\s+editors/i
    ]);
    
    // AI Analysis
    this.intentPatterns.set(IntentType.ANALYZE_CODE, [
      /analyze\s+(this\s+)?code/i,
      /check\s+(this\s+)?code/i,
      /review\s+(this\s+)?code/i,
      /examine\s+(this\s+)?code/i
    ]);
    
    this.intentPatterns.set(IntentType.SUGGEST_IMPROVEMENTS, [
      /suggest\s+improvements/i,
      /how\s+to\s+improve/i,
      /make\s+better/i,
      /optimize\s+(this\s+)?code/i
    ]);
    
    this.intentPatterns.set(IntentType.FIND_BUGS, [
      /find\s+(bugs|errors|issues)/i,
      /check\s+for\s+(bugs|errors)/i,
      /debug\s+(this\s+)?code/i,
      /what's\s+wrong/i
    ]);
    
    // Navigation
    this.intentPatterns.set(IntentType.GOTO_LINE, [
      /go\s+to\s+line\s+(\d+)/i,
      /jump\s+to\s+line\s+(\d+)/i,
      /line\s+(\d+)/i
    ]);
    
    this.intentPatterns.set(IntentType.FIND_FUNCTION, [
      /find\s+function\s+(.+)/i,
      /locate\s+function\s+(.+)/i,
      /search\s+for\s+function\s+(.+)/i
    ]);
    
    // Code Manipulation
    this.intentPatterns.set(IntentType.FORMAT_CODE, [
      /format\s+(this\s+)?code/i,
      /beautify\s+(this\s+)?code/i,
      /clean\s+up\s+formatting/i,
      /fix\s+indentation/i
    ]);
    
    this.intentPatterns.set(IntentType.REFACTOR_CODE, [
      /refactor\s+(this\s+)?code/i,
      /restructure\s+(this\s+)?code/i,
      /improve\s+structure/i
    ]);
    
    // Layout Control
    this.intentPatterns.set(IntentType.CHANGE_LAYOUT, [
      /change\s+layout/i,
      /switch\s+to\s+(horizontal|vertical)/i,
      /rotate\s+layout/i
    ]);
  }
  
  /**
   * Process user input and extract intent
   */
  public processIntent(input: string): Intent {
    const cleanInput = input.trim().toLowerCase();
    const timestamp = Date.now();
    
    // Try to match patterns
    for (const [intentType, patterns] of this.intentPatterns) {
      for (const pattern of patterns) {
        const match = cleanInput.match(pattern);
        if (match) {
          const intent: Intent = {
            type: intentType,
            confidence: this.calculateConfidence(match, cleanInput),
            parameters: this.extractParameters(intentType, match),
            context: input,
            timestamp
          };
          
          this.contextHistory.push(intent);
          this.maintainHistorySize();
          
          return intent;
        }
      }
    }
    
    // No pattern matched
    return {
      type: IntentType.UNKNOWN,
      confidence: 0,
      parameters: {},
      context: input,
      timestamp
    };
  }
  
  /**
   * Calculate confidence score based on match quality
   */
  private calculateConfidence(match: RegExpMatchArray, input: string): number {
    const matchLength = match[0].length;
    const inputLength = input.length;
    const coverage = matchLength / inputLength;
    
    // Base confidence from coverage
    let confidence = Math.min(coverage * 0.8, 0.8);
    
    // Boost for exact matches
    if (coverage > 0.8) confidence += 0.15;
    
    // Boost for common keywords
    const keywords = ['please', 'can you', 'would you', 'help me'];
    const hasPoliteKeywords = keywords.some(keyword => input.includes(keyword));
    if (hasPoliteKeywords) confidence += 0.05;
    
    return Math.min(confidence, 1.0);
  }
  
  /**
   * Extract parameters from matched patterns
   */
  private extractParameters(intentType: IntentType, match: RegExpMatchArray): Record<string, any> {
    const params: Record<string, any> = {};
    
    switch (intentType) {
      case IntentType.OPEN_FILE:
        if (match[2]) params.filename = match[2].trim();
        break;
        
      case IntentType.GOTO_LINE:
        if (match[1]) params.lineNumber = parseInt(match[1]);
        break;
        
      case IntentType.FIND_FUNCTION:
        if (match[1]) params.functionName = match[1].trim();
        break;
        
      case IntentType.CHANGE_LAYOUT:
        if (match[1]) {
          const layout = match[1].toLowerCase();
          if (layout.includes('horizontal')) params.layout = 'horizontal';
          if (layout.includes('vertical')) params.layout = 'vertical';
        }
        break;
    }
    
    return params;
  }
  
  /**
   * Get recent intent history for context
   */
  public getRecentIntents(count: number = 5): Intent[] {
    return this.contextHistory.slice(-count);
  }
  
  /**
   * Clear intent history
   */
  public clearHistory(): void {
    this.contextHistory = [];
  }
  
  /**
   * Maintain history size
   */
  private maintainHistorySize(): void {
    const maxHistory = 50;
    if (this.contextHistory.length > maxHistory) {
      this.contextHistory = this.contextHistory.slice(-maxHistory);
    }
  }
  
  /**
   * Suggest possible intents based on partial input
   */
  public suggestIntents(partialInput: string): IntentType[] {
    const suggestions: IntentType[] = [];
    const input = partialInput.toLowerCase();
    
    // Check for partial matches
    for (const [intentType, patterns] of this.intentPatterns) {
      for (const pattern of patterns) {
        const patternString = pattern.source.toLowerCase();
        if (patternString.includes(input) || input.length > 2) {
          // Fuzzy matching for longer inputs
          const words = input.split(/\s+/);
          const hasMatchingWords = words.some(word => 
            word.length > 2 && patternString.includes(word)
          );
          
          if (hasMatchingWords && !suggestions.includes(intentType)) {
            suggestions.push(intentType);
          }
        }
      }
    }
    
    return suggestions.slice(0, 5); // Limit suggestions
  }
  
  /**
   * Get human-readable description of intent
   */
  public getIntentDescription(intentType: IntentType): string {
    const descriptions: Record<IntentType, string> = {
      [IntentType.OPEN_FILE]: 'Open a file in the editor',
      [IntentType.CREATE_FILE]: 'Create a new file',
      [IntentType.SAVE_FILE]: 'Save the current file',
      [IntentType.CLOSE_FILE]: 'Close the current file',
      [IntentType.SPLIT_VIEW]: 'Split the editor into multiple panes',
      [IntentType.MERGE_VIEW]: 'Merge split editor panes',
      [IntentType.COMPARE_FILES]: 'Compare two files side by side',
      [IntentType.SYNC_EDITORS]: 'Synchronize editor scrolling and cursor',
      [IntentType.ANALYZE_CODE]: 'Analyze code for quality and issues',
      [IntentType.SUGGEST_IMPROVEMENTS]: 'Suggest code improvements',
      [IntentType.EXPLAIN_CODE]: 'Explain what the code does',
      [IntentType.FIND_BUGS]: 'Find potential bugs in the code',
      [IntentType.GOTO_LINE]: 'Navigate to a specific line number',
      [IntentType.FIND_FUNCTION]: 'Find and navigate to a function',
      [IntentType.SEARCH_CONTENT]: 'Search for content in the file',
      [IntentType.FORMAT_CODE]: 'Format and beautify the code',
      [IntentType.REFACTOR_CODE]: 'Refactor and restructure the code',
      [IntentType.ADD_COMMENTS]: 'Add comments to the code',
      [IntentType.CHANGE_LAYOUT]: 'Change the editor layout',
      [IntentType.TOGGLE_PANELS]: 'Toggle visibility of panels',
      [IntentType.RESIZE_EDITORS]: 'Resize editor panes',
      [IntentType.UNKNOWN]: 'Intent not recognized'
    };
    
    return descriptions[intentType] || 'Unknown intent';
  }
}

// Export singleton instance
export const intentHandler = new IntentHandler();
