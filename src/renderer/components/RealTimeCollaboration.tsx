import React, { useState, useEffect, useRef } from 'react';
import * as monaco from 'monaco-editor';
import { User } from '../../shared/collaboration-types';
import './RealTimeCollaboration.css';

interface RealTimeCollaborationProps {
  editor?: monaco.editor.IStandaloneCodeEditor;
  users?: User[];
  onUserActivity?: (userId: string, activity: string) => void;
}

export const RealTimeCollaboration: React.FC<RealTimeCollaborationProps> = ({
  editor,
  users = [],
  onUserActivity
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [activeUsers, setActiveUsers] = useState<User[]>(users);
  const [userPresence, setUserPresence] = useState<Record<string, { 
    cursorPosition: monaco.Position | null; 
    selection: monaco.Selection | null;
    color: string;
  }>>({});
  
  const presenceDecorationsRef = useRef<string[]>([]);
  const colorPalette = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
    '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
    '#BB8FCE', '#85C1E9', '#F8C471', '#82E0AA'
  ];

  useEffect(() => {
    if (!editor) return;
    
    // Initialize collaboration features
    setIsConnected(true);
    
    // Set up listeners for editor changes
    const disposables: monaco.IDisposable[] = [];
    
    disposables.push(editor.onDidChangeCursorPosition((e) => {
      // Notify other users of cursor position
      onUserActivity?.('current-user', 'cursor-move');
    }));
    
    disposables.push(editor.onDidChangeCursorSelection((e) => {
      // Notify other users of selection changes
      onUserActivity?.('current-user', 'selection-change');
    }));
    
    disposables.push(editor.onDidChangeModelContent((e) => {
      // Notify other users of content changes
      onUserActivity?.('current-user', 'content-change');
    }));
    
    // Clean up listeners
    return () => {
      disposables.forEach(disposable => disposable.dispose());
    };
  }, [editor, onUserActivity]);

  useEffect(() => {
    // Update active users list
    setActiveUsers(users);
  }, [users]);

  const updateUserPresence = (userId: string, presence: {
    cursorPosition: monaco.Position | null;
    selection: monaco.Selection | null;
  }) => {
    // Remove previous decorations
    if (editor && presenceDecorationsRef.current.length > 0) {
      editor.deltaDecorations(presenceDecorationsRef.current, []);
    }
    
    // Add new decorations for user presence
    if (editor && presence.cursorPosition) {
      const decorations: monaco.editor.IModelDeltaDecoration[] = [];
      
      // Add cursor decoration
      decorations.push({
        range: new monaco.Range(
          presence.cursorPosition.lineNumber,
          presence.cursorPosition.column,
          presence.cursorPosition.lineNumber,
          presence.cursorPosition.column + 1
        ),
        options: {
          className: `collaboration-cursor-${userId}`,
          stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
        }
      });
      
      // Add selection decoration if present
      if (presence.selection) {
        decorations.push({
          range: presence.selection,
          options: {
            className: `collaboration-selection-${userId}`,
            stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
          }
        });
      }
      
      // Apply decorations
      presenceDecorationsRef.current = editor.deltaDecorations([], decorations);
    }
    
    // Update presence state
    setUserPresence(prev => ({
      ...prev,
      [userId]: {
        ...presence,
        color: colorPalette[users.findIndex(u => u.id === userId) % colorPalette.length] || '#FFFFFF'
      }
    }));
  };

  const renderUserPresence = () => {
    return (
      <div className="collaboration-presence">
        <div className="presence-header">
          <h4>Collaborators ({activeUsers.length})</h4>
          <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </div>
        </div>
        
        <div className="presence-list">
          {activeUsers.map(user => (
            <div key={user.id} className="presence-item">
              <div 
                className="presence-color"
                style={{ backgroundColor: userPresence[user.id]?.color || '#FFFFFF' }}
              ></div>
              <div className="presence-info">
                <div className="presence-name">{user.name}</div>
                <div className="presence-email">{user.email}</div>
              </div>
              <div className="presence-activity">
                {userPresence[user.id]?.cursorPosition ? 
                  `Line ${userPresence[user.id].cursorPosition.lineNumber}, Col ${userPresence[user.id].cursorPosition.column}` : 
                  'No activity'}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="real-time-collaboration">
      {renderUserPresence()}
    </div>
  );
};

export default RealTimeCollaboration;