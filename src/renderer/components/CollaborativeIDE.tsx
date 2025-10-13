// Collaborative IDE Component - Main integration component
// Combines all collaboration features with the enhanced Monaco Editor

import React, { useState, useEffect, useCallback, useRef } from 'react';
import CollaborationEditor from './CollaborationEditor';
import { AdvancedSearchDialog } from '../advancedEditor/AdvancedSearchDialog';
import { AICodeAssistant } from '../advancedEditor/AICodeAssistant';
import { CollaborationState } from '../services/CollaborationClient';
import { User } from '../../shared/collaboration-types';
import './CollaborativeIDE.css';

export interface CollaborativeIDEProps {
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
  onSave?: (content: string) => void;
  readOnly?: boolean;
  showSidebar?: boolean;
  showAIAssistant?: boolean;
  enableAdvancedSearch?: boolean;
}

export interface CollaborationMetrics {
  totalOperations: number;
  operationsPerMinute: number;
  averageResponseTime: number;
  activeCollaborators: number;
  documentRevision: number;
  lastSyncTime: Date;
}

const CollaborativeIDE: React.FC<CollaborativeIDEProps> = ({
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
  onSave,
  readOnly = false,
  showSidebar = true,
  showAIAssistant = true,
  enableAdvancedSearch = true
}) => {
  const [content, setContent] = useState(initialContent);
  const [collaborationState, setCollaborationState] = useState<CollaborationState | null>(null);
  const [activeUsers, setActiveUsers] = useState<User[]>([]);
  const [isSearchDialogOpen, setIsSearchDialogOpen] = useState(false);
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [metrics, setMetrics] = useState<CollaborationMetrics | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected');
  const [lastError, setLastError] = useState<string | null>(null);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [documentStats, setDocumentStats] = useState({
    lines: 0,
    characters: 0,
    words: 0,
    size: 0
  });

  const collaborationEditorRef = useRef<any>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const operationCountRef = useRef(0);
  const lastOperationTimeRef = useRef<Date>(new Date());

  /**
   * Handle content changes from the editor
   */
  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
    setUnsavedChanges(true);
    
    // Update document statistics
    const lines = newContent.split('\n').length;
    const characters = newContent.length;
    const words = newContent.trim() ? newContent.trim().split(/\s+/).length : 0;
    const size = new Blob([newContent]).size;
    
    setDocumentStats({ lines, characters, words, size });
    
    // Notify parent component
    onContentChange?.(newContent);
    
    // Auto-save after 2 seconds of inactivity
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      handleAutoSave(newContent);
    }, 2000);
    
    // Update operation metrics
    operationCountRef.current++;
    lastOperationTimeRef.current = new Date();
    
  }, [onContentChange]);

  /**
   * Handle auto-save functionality
   */
  const handleAutoSave = useCallback((content: string) => {
    if (onSave && !readOnly) {
      try {
        onSave(content);
        setUnsavedChanges(false);
        
      } catch (error) {
        console.error('❌ Auto-save failed:', error);
        setLastError('Auto-save failed');
      }
    }
  }, [onSave, readOnly]);

  /**
   * Manual save function
   */
  const handleManualSave = useCallback(() => {
    if (onSave && !readOnly) {
      try {
        onSave(content);
        setUnsavedChanges(false);
        
      } catch (error) {
        console.error('❌ Manual save failed:', error);
        setLastError('Save failed');
      }
    }
  }, [onSave, content, readOnly]);

  /**
   * Handle collaboration state changes
   */
  const handleCollaborationStateChange = useCallback((state: CollaborationState) => {
    setCollaborationState(state);
    setActiveUsers(state.activeUsers);
    setConnectionStatus(state.isConnected ? 'connected' : state.isConnecting ? 'connecting' : 'disconnected');
    
    // Update metrics
    const now = new Date();
    const timeDiff = (now.getTime() - lastOperationTimeRef.current.getTime()) / 1000 / 60; // minutes
    const operationsPerMinute = timeDiff > 0 ? operationCountRef.current / timeDiff : 0;
    
    setMetrics({
      totalOperations: operationCountRef.current,
      operationsPerMinute: Math.round(operationsPerMinute * 10) / 10,
      averageResponseTime: 0, // TODO: Implement response time tracking
      activeCollaborators: state.activeUsers.length,
      documentRevision: state.serverRevision,
      lastSyncTime: now
    });
  }, []);

  /**
   * Handle collaboration errors
   */
  const handleCollaborationError = useCallback((error: Error) => {
    console.error('🔥 Collaboration error:', error);
    setLastError(error.message);
    
    // Clear error after 5 seconds
    setTimeout(() => {
      setLastError(null);
    }, 5000);
  }, []);

  /**
   * Toggle search dialog
   */
  const toggleSearchDialog = useCallback(() => {
    setIsSearchDialogOpen(prev => !prev);
  }, []);

  /**
   * Toggle AI assistant
   */
  const toggleAIAssistant = useCallback(() => {
    setIsAIAssistantOpen(prev => !prev);
  }, []);

  /**
   * Toggle sidebar
   */
  const toggleSidebar = useCallback(() => {
    setIsSidebarCollapsed(prev => !prev);
  }, []);

  /**
   * Format file size
   */
  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  /**
   * Format time ago
   */
  const formatTimeAgo = useCallback((date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }, []);

  /**
   * Handle keyboard shortcuts
   */
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+S / Cmd+S for save
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        handleManualSave();
      }
      
      // Ctrl+F / Cmd+F for search
      if ((event.ctrlKey || event.metaKey) && event.key === 'f' && enableAdvancedSearch) {
        event.preventDefault();
        toggleSearchDialog();
      }
      
      // Ctrl+Shift+P / Cmd+Shift+P for AI assistant
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'P' && showAIAssistant) {
        event.preventDefault();
        toggleAIAssistant();
      }
      
      // Ctrl+B / Cmd+B for sidebar toggle
      if ((event.ctrlKey || event.metaKey) && event.key === 'b' && showSidebar) {
        event.preventDefault();
        toggleSidebar();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleManualSave, toggleSearchDialog, toggleAIAssistant, toggleSidebar, enableAdvancedSearch, showAIAssistant, showSidebar]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="collaborative-ide">
      {/* Header Bar */}
      <div className="ide-header">
        <div className="ide-title">
          <h2>Primus IDE - Collaborative Editor</h2>
          <span className="document-name">{documentId}</span>
        </div>
        
        <div className="ide-status">
          <div className="connection-status">
            <span className={`status-dot ${connectionStatus}`}></span>
            <span className="status-text">
              {connectionStatus === 'connected' && `${activeUsers.length} users`}
              {connectionStatus === 'connecting' && 'Connecting...'}
              {connectionStatus === 'disconnected' && 'Disconnected'}
            </span>
          </div>
          
          {unsavedChanges && (
            <div className="unsaved-indicator" title="Unsaved changes">
              <span className="unsaved-dot">●</span>
              <span>Unsaved</span>
            </div>
          )}
          
          <div className="document-info">
            <span>{documentStats.lines} lines</span>
            <span>{documentStats.words} words</span>
            <span>{formatFileSize(documentStats.size)}</span>
          </div>
        </div>

        <div className="ide-actions">
          {enableAdvancedSearch && (
            <button 
              className="action-button search-button"
              onClick={toggleSearchDialog}
              title="Search (Ctrl+F)"
            >
              🔍
            </button>
          )}
          
          {showAIAssistant && (
            <button 
              className="action-button ai-button"
              onClick={toggleAIAssistant}
              title="AI Assistant (Ctrl+Shift+P)"
            >
              🤖
            </button>
          )}
          
          <button 
            className="action-button save-button"
            onClick={handleManualSave}
            disabled={readOnly || !unsavedChanges}
            title="Save (Ctrl+S)"
          >
            💾
          </button>

          {showSidebar && (
            <button 
              className="action-button sidebar-toggle"
              onClick={toggleSidebar}
              title="Toggle Sidebar (Ctrl+B)"
            >
              {isSidebarCollapsed ? '▶' : '◀'}
            </button>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {lastError && (
        <div className="error-banner">
          <span className="error-icon">⚠️</span>
          <span className="error-message">{lastError}</span>
          <button 
            className="error-dismiss"
            onClick={() => setLastError(null)}
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Content */}
      <div className="ide-main">
        {/* Sidebar */}
        {showSidebar && !isSidebarCollapsed && (
          <div className="ide-sidebar">
            {/* Collaboration Panel */}
            <div className="sidebar-section">
              <h3 className="sidebar-section-title">Collaboration</h3>
              
              <div className="collaboration-metrics">
                {metrics && (
                  <>
                    <div className="metric">
                      <span className="metric-label">Operations:</span>
                      <span className="metric-value">{metrics.totalOperations}</span>
                    </div>
                    <div className="metric">
                      <span className="metric-label">OPS/min:</span>
                      <span className="metric-value">{metrics.operationsPerMinute}</span>
                    </div>
                    <div className="metric">
                      <span className="metric-label">Revision:</span>
                      <span className="metric-value">{metrics.documentRevision}</span>
                    </div>
                    <div className="metric">
                      <span className="metric-label">Last sync:</span>
                      <span className="metric-value">{formatTimeAgo(metrics.lastSyncTime)}</span>
                    </div>
                  </>
                )}
              </div>

              <div className="active-users">
                <h4>Active Users ({activeUsers.length})</h4>
                {activeUsers.map(user => (
                  <div key={user.id} className="user-item">
                    <div 
                      className="user-avatar-small"
                      style={{ backgroundColor: user.color }}
                    >
                      {user.avatar ? (
                        <img src={user.avatar} alt={user.name} />
                      ) : (
                        user.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="user-info">
                      <div className="user-name">{user.name}</div>
                      <div className="user-status">
                        {user.isTyping ? 'Typing...' : 'Active'}
                      </div>
                    </div>
                  </div>
                ))}
                
                {activeUsers.length === 0 && (
                  <div className="no-users">No other users online</div>
                )}
              </div>
            </div>

            {/* Document Info */}
            <div className="sidebar-section">
              <h3 className="sidebar-section-title">Document Info</h3>
              <div className="document-stats">
                <div className="stat-item">
                  <span className="stat-label">Language:</span>
                  <span className="stat-value">{language}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Theme:</span>
                  <span className="stat-value">{theme}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Lines:</span>
                  <span className="stat-value">{documentStats.lines.toLocaleString()}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Characters:</span>
                  <span className="stat-value">{documentStats.characters.toLocaleString()}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Words:</span>
                  <span className="stat-value">{documentStats.words.toLocaleString()}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Size:</span>
                  <span className="stat-value">{formatFileSize(documentStats.size)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Editor Area */}
        <div className="ide-editor-area">
          <CollaborationEditor
            documentId={documentId}
            initialContent={initialContent}
            language={language}
            theme={theme}
            userId={userId}
            userName={userName}
            userEmail={userEmail}
            userAvatar={userAvatar}
            serverUrl={serverUrl}
            onContentChange={handleContentChange}
            onCollaborationStateChange={handleCollaborationStateChange}
            onError={handleCollaborationError}
            readOnly={readOnly}
          />
        </div>

        {/* AI Assistant Panel */}
        {showAIAssistant && isAIAssistantOpen && (
          <div className="ide-ai-panel">
            <AICodeAssistant
              isVisible={isAIAssistantOpen}
              onClose={() => setIsAIAssistantOpen(false)}
            />
          </div>
        )}
      </div>

      {/* Advanced Search Dialog */}
      {enableAdvancedSearch && isSearchDialogOpen && (
        <AdvancedSearchDialog
          isOpen={isSearchDialogOpen}
          onClose={() => setIsSearchDialogOpen(false)}
          mode="search"
        />
      )}
    </div>
  );
};

export default CollaborativeIDE;
