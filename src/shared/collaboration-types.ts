// Shared Collaboration Types - Common interfaces for collaboration features
// Used by both main and renderer processes

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  color: string;
  cursor?: EditorCursor;
  selection?: EditorSelection;
  isTyping: boolean;
  lastActivity: number;
  connectionId: string;
}

export interface EditorCursor {
  line: number;
  column: number;
  affinity?: 'before' | 'after';
}

export interface EditorSelection {
  anchor: EditorCursor;
  active: EditorCursor;
  isEmpty: boolean;
}

export interface DocumentOperation {
  type: 'insert' | 'delete' | 'retain';
  position: number;
  content?: string;
  length?: number;
  attributes?: Record<string, any>;
  userId: string;
  timestamp: number;
  id: string;
  revision?: number;
}

export interface CollaborationMessage {
  type: 'operation' | 'cursor' | 'selection' | 'user-join' | 'user-leave' | 'document-lock' | 'document-unlock' | 'sync-request' | 'sync-response' | 'sync';
  data: any;
  userId: string;
  timestamp: number;
  documentId?: string;
  messageId?: string;
}
