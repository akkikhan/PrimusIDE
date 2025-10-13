// Real-time Collaboration Component for Monaco Editor
// Integrates WebSocket-based collaborative editing with Monaco Editor

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as monaco from 'monaco-editor';
import CollaborationClient, { 
  CollaborationClientConfig, 
  CursorPosition,
  CollaborationState
} from '../services/CollaborationClient';
import { EditorCursor, EditorSelection as CollabEditorSelection, DocumentOperation, User } from '../../main/collaboration/CollaborationServer';
import { EditorSelection } from '../../shared/collaboration-types';
import './CollaborationEditor.css';

export interface CollaborationEditorProps {
  documentId: string;
  initialContent?: string;
  language?: string;
  theme?: string;
  userId: string;
  userName: string;
  userEmail: string;
  userAvatar?: string;
  serverUrl?: string;
  onContentChange?: (content: string) => void;
  onCollaborationStateChange?: (state: CollaborationState) => void;
  onError?: (error: Error) => void;
  readOnly?: boolean;
  options?: monaco.editor.IStandaloneEditorConstructionOptions;
}

export interface CollaborationIndicator {
  user: User;
  isOnline: boolean;
  lastActivity: number;
}

const CollaborationEditor: React.FC<CollaborationEditorProps> = ({
  documentId,
  initialContent = '',
  language = 'typescript',
  theme = 'vs-dark',
  userId,
  userName,
  userEmail,
  userAvatar,
  serverUrl = 'ws://localhost:3001',
  onContentChange,
  onCollaborationStateChange,
  onError,
  readOnly = false,
  options = {}
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const monacoEditorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const collaborationClientRef = useRef<CollaborationClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [activeUsers, setActiveUsers] = useState<User[]>([]);
  const [cursorPositions, setCursorPositions] = useState<CursorPosition[]>([]);
  const [collaborationState, setCollaborationState] = useState<CollaborationState | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  // Track local changes to prevent infinite loops
  const isLocalChangeRef = useRef(false);
  const lastContentRef = useRef(initialContent);
  const operationQueueRef = useRef<DocumentOperation[]>([]);
  const cursorDecorationIdsRef = useRef<string[]>([]);
  const selectionDecorationIdsRef = useRef<string[]>([]);

  /**
   * Set user color as CSS custom property
   */
  const setUserColor = useCallback((userId: string, color: string) => {
    const userElement = document.querySelector(`[data-user-id="${userId}"]`) as HTMLElement;
    if (userElement) {
      userElement.style.setProperty('--user-color', color);
    }
  }, []);

  /**
   * Initialize Monaco Editor
   */
  const initializeEditor = useCallback(() => {
    if (!editorRef.current || monacoEditorRef.current) return;

    const editor = monaco.editor.create(editorRef.current, {
      value: initialContent,
      language,
      theme,
      automaticLayout: true,
      minimap: { enabled: true },
      scrollBeyondLastLine: false,
      readOnly,
      wordWrap: 'on',
      lineNumbers: 'on',
      folding: true,
      renderWhitespace: 'selection',
      contextmenu: true,
      ...options
    });

    monacoEditorRef.current = editor;

    // Set up editor event listeners
    setupEditorEventListeners(editor);

  }, [initialContent, language, theme, readOnly, options]);

  /**
   * Setup editor event listeners for collaboration
   */
  const setupEditorEventListeners = (editor: monaco.editor.IStandaloneCodeEditor) => {
    // Content change listener
    editor.onDidChangeModelContent((event) => {
      if (isLocalChangeRef.current) {
        isLocalChangeRef.current = false;
        return;
      }

      const model = editor.getModel();
      if (!model) return;

      const currentContent = model.getValue();
      
      // Convert Monaco editor changes to operations
      event.changes.forEach(change => {
        const startPosition = new monaco.Position(change.range.startLineNumber, change.range.startColumn);
        const operation: Omit<DocumentOperation, 'id' | 'timestamp' | 'revision'> = {
          type: change.text ? 'insert' : 'delete',
          position: model.getOffsetAt(startPosition),
          userId: userId,
          ...(change.text ? { content: change.text } : { length: change.rangeLength })
        };

        // Send operation through collaboration client
        if (collaborationClientRef.current) {
          collaborationClientRef.current.sendOperation(operation);
        }
      });

      lastContentRef.current = currentContent;
      onContentChange?.(currentContent);
    });

    // Cursor position change listener
    editor.onDidChangeCursorPosition((event) => {
      const position = event.position;
      const cursor: EditorCursor = {
        line: position.lineNumber - 1, // Convert to 0-based
        column: position.column - 1
      };

      if (collaborationClientRef.current) {
        collaborationClientRef.current.updateCursor(cursor);
      }
    });

    // Selection change listener
    editor.onDidChangeCursorSelection((event) => {
      const selection = event.selection;
      const collaborationSelection: EditorSelection = {
        anchor: {
          line: selection.startLineNumber - 1,
          column: selection.startColumn - 1
        },
        active: {
          line: selection.endLineNumber - 1,
          column: selection.endColumn - 1
        },
        isEmpty: selection.isEmpty()
      };

      if (collaborationClientRef.current) {
        collaborationClientRef.current.updateSelection(collaborationSelection);
      }
    });

    // Focus/blur listeners for typing status
    editor.onDidFocusEditorWidget(() => {
      if (collaborationClientRef.current) {
        collaborationClientRef.current.setTypingStatus(true);
      }
    });

    editor.onDidBlurEditorWidget(() => {
      if (collaborationClientRef.current) {
        collaborationClientRef.current.setTypingStatus(false);
      }
    });
  };

  /**
   * Initialize collaboration client
   */
  const initializeCollaboration = useCallback(async () => {
    const config: CollaborationClientConfig = {
      serverUrl,
      userId,
      userName,
      userEmail,
      userAvatar,
      reconnectInterval: 5000,
      maxReconnectAttempts: 10,
      operationTimeout: 30000
    };

    const client = new CollaborationClient(config);
    collaborationClientRef.current = client;

    // Setup collaboration event listeners
    setupCollaborationEventListeners(client);

    try {
      setIsConnecting(true);
      setConnectionError(null);
      
      await client.connect();
      await client.joinDocument(documentId);
      
      setIsConnected(true);
      setIsConnecting(false);
    } catch (error) {
      console.error('Failed to initialize collaboration:', error);
      setConnectionError((error as Error).message);
      setIsConnecting(false);
      onError?.(error as Error);
    }
  }, [serverUrl, userId, userName, userEmail, userAvatar, documentId, onError]);

  /**
   * Setup collaboration client event listeners
   */
  const setupCollaborationEventListeners = (client: CollaborationClient) => {
    client.on('connected', () => {
      setIsConnected(true);
      setIsConnecting(false);
      setConnectionError(null);
      
    });

    client.on('disconnected', () => {
      setIsConnected(false);
      setConnectionError('Disconnected from server');
      
    });

    client.on('reconnecting', (attempt: number) => {
      setIsConnecting(true);
      setConnectionError(`Reconnecting... (attempt ${attempt})`);
      console.log(`Reconnecting to collaboration server (attempt ${attempt})`);
    });

    client.on('document-synced', (content: string, revision: number) => {
      if (monacoEditorRef.current && content !== lastContentRef.current) {
        isLocalChangeRef.current = true;
        monacoEditorRef.current.setValue(content);
        lastContentRef.current = content;
        onContentChange?.(content);
      }
      
      const state = client.getState();
      setCollaborationState(state);
      onCollaborationStateChange?.(state);
    });

    client.on('operation-received', (operation: DocumentOperation) => {
      applyOperationToEditor(operation);
    });

    client.on('cursor-updated', (cursor: CursorPosition) => {
      updateCursorDisplay(cursor);
    });

    client.on('selection-updated', (selection: CursorPosition) => {
      updateSelectionDisplay(selection);
    });

    client.on('user-joined', (user: User) => {
      
      setActiveUsers(prev => [...prev.filter(u => u.id !== user.id), user]);
    });

    client.on('user-left', (user: User) => {
      
      setActiveUsers(prev => prev.filter(u => u.id !== user.id));
      // Remove cursor/selection displays for this user
      removeCursorDisplay(user.id);
    });

    client.on('user-list-updated', (users: User[]) => {
      setActiveUsers(users);
      setCursorPositions(client.getCursorPositions());
    });

    client.on('typing-status-changed', (userId: string, isTyping: boolean) => {
      setActiveUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, isTyping } : user
      ));
    });

    client.on('error', (error: Error) => {
      console.error('Collaboration error:', error);
      setConnectionError(error.message);
      onError?.(error);
    });
  };

  /**
   * Apply received operation to Monaco Editor
   */
  const applyOperationToEditor = (operation: DocumentOperation) => {
    const editor = monacoEditorRef.current;
    const model = editor?.getModel();
    if (!editor || !model) return;

    isLocalChangeRef.current = true;

    try {
      if (operation.type === 'insert') {
        const position = model.getPositionAt(operation.position);
        const range = new monaco.Range(
          position.lineNumber,
          position.column,
          position.lineNumber,
          position.column
        );
        
        model.pushEditOperations([], [{
          range,
          text: operation.content || ''
        }], () => null);
        
      } else if (operation.type === 'delete') {
        const startPos = model.getPositionAt(operation.position);
        const endPos = model.getPositionAt(operation.position + (operation.length || 0));
        const range = new monaco.Range(
          startPos.lineNumber,
          startPos.column,
          endPos.lineNumber,
          endPos.column
        );
        
        model.pushEditOperations([], [{
          range,
          text: ''
        }], () => null);
      }

      // Update last content reference
      lastContentRef.current = model.getValue();
      onContentChange?.(lastContentRef.current);

    } catch (error) {
      console.error('Error applying operation to editor:', error);
    }
  };

  /**
   * Update cursor display for remote users
   */
  const updateCursorDisplay = (cursorInfo: CursorPosition) => {
    const editor = monacoEditorRef.current;
    if (!editor) return;

    // Remove existing cursor decorations for this user
    removeCursorDisplay(cursorInfo.userId);

    const model = editor.getModel();
    if (!model) return;

    try {
      const position = new monaco.Position(
        cursorInfo.cursor.line + 1, // Convert to 1-based
        cursorInfo.cursor.column + 1
      );

      const decoration: monaco.editor.IModelDeltaDecoration = {
        range: new monaco.Range(
          position.lineNumber,
          position.column,
          position.lineNumber,
          position.column
        ),
        options: {
          className: `collaboration-cursor-${cursorInfo.userId}`,
          stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
          beforeContentClassName: `collaboration-cursor-before-${cursorInfo.userId}`,
          zIndex: 1000
        }
      };

      const decorationIds = editor.deltaDecorations([], [decoration]);
      cursorDecorationIdsRef.current.push(...decorationIds);

      // Add CSS for this user's cursor
      addCursorCSS(cursorInfo);

    } catch (error) {
      console.error('Error updating cursor display:', error);
    }
  };

  /**
   * Update selection display for remote users
   */
  const updateSelectionDisplay = (selectionInfo: CursorPosition) => {
    const editor = monacoEditorRef.current;
    if (!editor || !selectionInfo.selection) return;

    const model = editor.getModel();
    if (!model) return;

    try {
      const startPos = new monaco.Position(
        (selectionInfo.selection as unknown as CollabEditorSelection).start.line + 1,
        (selectionInfo.selection as unknown as CollabEditorSelection).start.column + 1
      );
      const endPos = new monaco.Position(
        (selectionInfo.selection as unknown as CollabEditorSelection).end.line + 1,
        (selectionInfo.selection as unknown as CollabEditorSelection).end.column + 1
      );

      const decoration: monaco.editor.IModelDeltaDecoration = {
        range: new monaco.Range(
          startPos.lineNumber,
          startPos.column,
          endPos.lineNumber,
          endPos.column
        ),
        options: {
          className: `collaboration-selection-${selectionInfo.userId}`,
          stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
        }
      };

      const decorationIds = editor.deltaDecorations([], [decoration]);
      selectionDecorationIdsRef.current.push(...decorationIds);

      // Add CSS for this user's selection
      addSelectionCSS(selectionInfo);

    } catch (error) {
      console.error('Error updating selection display:', error);
    }
  };

  /**
   * Remove cursor display for a specific user
   */
  const removeCursorDisplay = (userId: string) => {
    const editor = monacoEditorRef.current;
    if (!editor) return;

    // Remove decorations
    editor.deltaDecorations(cursorDecorationIdsRef.current, []);
    editor.deltaDecorations(selectionDecorationIdsRef.current, []);
    
    cursorDecorationIdsRef.current = [];
    selectionDecorationIdsRef.current = [];

    // Remove CSS
    removeCursorCSS(userId);
    removeSelectionCSS(userId);
  };

  /**
   * Add CSS for user cursor
   */
  const addCursorCSS = (cursorInfo: CursorPosition) => {
    const styleId = `cursor-style-${cursorInfo.userId}`;
    let existingStyle = document.getElementById(styleId);
    
    if (!existingStyle) {
      existingStyle = document.createElement('style');
      existingStyle.id = styleId;
      document.head.appendChild(existingStyle);
    }

    existingStyle.textContent = `
      .collaboration-cursor-${cursorInfo.userId}::before {
        content: '';
        position: absolute;
        top: 0;
        left: -1px;
        width: 2px;
        height: 100%;
        background: ${cursorInfo.color};
        animation: cursorBlink 1s infinite;
        z-index: 1000;
      }
      
      .collaboration-cursor-before-${cursorInfo.userId}::before {
        content: '${cursorInfo.userName}';
        position: absolute;
        bottom: 100%;
        left: 0;
        background: ${cursorInfo.color};
        color: white;
        padding: 2px 6px;
        border-radius: 3px;
        font-size: 10px;
        font-weight: 500;
        white-space: nowrap;
        z-index: 1001;
        transform: translateY(-2px);
        opacity: ${cursorInfo.isTyping ? '1' : '0.7'};
      }
      
      @keyframes cursorBlink {
        0%, 50% { opacity: 1; }
        51%, 100% { opacity: 0.3; }
      }
    `;
  };

  /**
   * Add CSS for user selection
   */
  const addSelectionCSS = (selectionInfo: CursorPosition) => {
    const styleId = `selection-style-${selectionInfo.userId}`;
    let existingStyle = document.getElementById(styleId);
    
    if (!existingStyle) {
      existingStyle = document.createElement('style');
      existingStyle.id = styleId;
      document.head.appendChild(existingStyle);
    }

    const color = selectionInfo.color;
    const rgbaColor = hexToRgba(color, 0.2);

    existingStyle.textContent = `
      .collaboration-selection-${selectionInfo.userId} {
        background: ${rgbaColor} !important;
        border: 1px solid ${color} !important;
        border-radius: 2px !important;
      }
    `;
  };

  /**
   * Remove CSS for user cursor
   */
  const removeCursorCSS = (userId: string) => {
    const styleElement = document.getElementById(`cursor-style-${userId}`);
    if (styleElement) {
      styleElement.remove();
    }
  };

  /**
   * Remove CSS for user selection
   */
  const removeSelectionCSS = (userId: string) => {
    const styleElement = document.getElementById(`selection-style-${userId}`);
    if (styleElement) {
      styleElement.remove();
    }
  };

  /**
   * Convert hex color to rgba
   */
  const hexToRgba = (hex: string, alpha: number): string => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  /**
   * Force sync with server
   */
  const forceSync = useCallback(() => {
    if (collaborationClientRef.current) {
      collaborationClientRef.current.requestSync();
    }
  }, []);

  /**
   * Disconnect from collaboration
   */
  const disconnect = useCallback(() => {
    if (collaborationClientRef.current) {
      collaborationClientRef.current.disconnect();
      setIsConnected(false);
      setActiveUsers([]);
      setCursorPositions([]);
    }
  }, []);

  /**
   * Reconnect to collaboration server
   */
  const reconnect = useCallback(async () => {
    if (collaborationClientRef.current) {
      try {
        await collaborationClientRef.current.connect();
        await collaborationClientRef.current.joinDocument(documentId);
      } catch (error) {
        console.error('Reconnection failed:', error);
        onError?.(error as Error);
      }
    }
  }, [documentId, onError]);

  // Initialize editor and collaboration on mount
  useEffect(() => {
    initializeEditor();
    initializeCollaboration();

    return () => {
      // Cleanup on unmount
      if (collaborationClientRef.current) {
        collaborationClientRef.current.disconnect();
      }
      if (monacoEditorRef.current) {
        monacoEditorRef.current.dispose();
      }
      
      // Remove all cursor/selection CSS
      activeUsers.forEach(user => {
        removeCursorCSS(user.id);
        removeSelectionCSS(user.id);
      });
    };
  }, [initializeEditor, initializeCollaboration]);

  // Update editor content when initialContent changes
  useEffect(() => {
    if (monacoEditorRef.current && initialContent !== lastContentRef.current) {
      isLocalChangeRef.current = true;
      monacoEditorRef.current.setValue(initialContent);
      lastContentRef.current = initialContent;
    }
  }, [initialContent]);

  return (
    <div className="collaboration-editor-container">
      <div className="collaboration-status-bar">
        <div className="collaboration-status">
          <div className={`status-indicator ${isConnected ? 'connected' : isConnecting ? 'connecting' : 'disconnected'}`}>
            {isConnected ? '🟢' : isConnecting ? '🟡' : '🔴'}
          </div>
          <span className="status-text">
            {isConnected 
              ? `Connected (${activeUsers.length} users)` 
              : isConnecting 
                ? 'Connecting...' 
                : connectionError || 'Disconnected'
            }
          </span>
        </div>
        
        <div className="collaboration-users">
          {activeUsers.slice(0, 5).map(user => (
            <div 
              key={user.id} 
              className="user-indicator user-indicator-dynamic"
              data-user-id={user.id}
              data-user-color={user.color}
              title={`${user.name} ${user.isTyping ? '(typing...)' : ''}`}
              ref={(el) => {
                if (el) {
                  el.style.backgroundColor = user.color;
                }
              }}
            >
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="user-avatar" />
              ) : (
                user.name.charAt(0).toUpperCase()
              )}
              {user.isTyping && <div className="typing-indicator">...</div>}
            </div>
          ))}
          {activeUsers.length > 5 && (
            <div className="user-indicator more-users">
              +{activeUsers.length - 5}
            </div>
          )}
        </div>

        <div className="collaboration-actions">
          <button 
            className="sync-button" 
            onClick={forceSync}
            disabled={!isConnected}
            title="Force sync with server"
          >
            🔄
          </button>
          {!isConnected && (
            <button 
              className="reconnect-button" 
              onClick={reconnect}
              disabled={isConnecting}
            >
              Connect
            </button>
          )}
        </div>
      </div>

      <div 
        ref={editorRef} 
        className="monaco-editor-container monaco-editor-container-full-height"
      />
    </div>
  );
};

export default CollaborationEditor;
