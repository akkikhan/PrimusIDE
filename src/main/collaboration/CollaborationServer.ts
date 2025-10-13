// Collaboration Server - WebSocket-based Real-time Collaboration System
// Implements operational transforms, cursor synchronization, and conflict resolution

import { WebSocket, WebSocketServer } from 'ws';
import { EventEmitter } from 'events';

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
}

export interface EditorSelection {
  start: EditorCursor;
  end: EditorCursor;
}

export interface DocumentOperation {
  id: string;
  type: 'insert' | 'delete' | 'retain';
  position: number;
  content?: string;
  length?: number;
  userId: string;
  timestamp: number;
  revision: number;
}

export interface CollaborationMessage {
  type: 'operation' | 'cursor' | 'selection' | 'user-join' | 'user-leave' | 'user-list' | 'sync' | 'ack';
  userId: string;
  documentId: string;
  data: any;
  timestamp: number;
  messageId: string;
}

export interface Document {
  id: string;
  content: string;
  revision: number;
  operations: DocumentOperation[];
  users: Map<string, User>;
  lastModified: number;
  createdAt: number;
}

export class OperationalTransform {
  /**
   * Transform operation A against operation B for concurrent editing
   * Implements the core OT algorithm for text operations
   */
  static transform(opA: DocumentOperation, opB: DocumentOperation): [DocumentOperation, DocumentOperation] {
    const transformedA = { ...opA };
    const transformedB = { ...opB };

    // Handle insert vs insert
    if (opA.type === 'insert' && opB.type === 'insert') {
      if (opA.position <= opB.position) {
        transformedB.position += opA.content?.length || 0;
      } else {
        transformedA.position += opB.content?.length || 0;
      }
    }
    
    // Handle insert vs delete
    else if (opA.type === 'insert' && opB.type === 'delete') {
      if (opA.position <= opB.position) {
        transformedB.position += opA.content?.length || 0;
      } else if (opA.position < opB.position + (opB.length || 0)) {
        // Insert is within delete range, split the delete
        const deleteLength = opB.length || 0;
        const insertLength = opA.content?.length || 0;
        transformedB.length = deleteLength + insertLength;
      } else {
        transformedA.position -= opB.length || 0;
      }
    }
    
    // Handle delete vs insert
    else if (opA.type === 'delete' && opB.type === 'insert') {
      if (opB.position <= opA.position) {
        transformedA.position += opB.content?.length || 0;
      } else if (opB.position < opA.position + (opA.length || 0)) {
        // Insert is within delete range
        const insertLength = opB.content?.length || 0;
        transformedA.length = (transformedA.length || 0) + insertLength;
      } else {
        transformedB.position -= opA.length || 0;
      }
    }
    
    // Handle delete vs delete
    else if (opA.type === 'delete' && opB.type === 'delete') {
      if (opA.position + (opA.length || 0) <= opB.position) {
        transformedB.position -= opA.length || 0;
      } else if (opB.position + (opB.length || 0) <= opA.position) {
        transformedA.position -= opB.length || 0;
      } else {
        // Overlapping deletes - complex case
        const aStart = opA.position;
        const aEnd = opA.position + (opA.length || 0);
        const bStart = opB.position;
        const bEnd = opB.position + (opB.length || 0);
        
        if (aStart <= bStart && aEnd >= bEnd) {
          // A contains B completely
          transformedA.length = (transformedA.length || 0) - (opB.length || 0);
          transformedB.length = 0; // B becomes no-op
        } else if (bStart <= aStart && bEnd >= aEnd) {
          // B contains A completely
          transformedB.length = (transformedB.length || 0) - (opA.length || 0);
          transformedA.length = 0; // A becomes no-op
        } else {
          // Partial overlap - adjust lengths and positions
          const overlapStart = Math.max(aStart, bStart);
          const overlapEnd = Math.min(aEnd, bEnd);
          const overlapLength = overlapEnd - overlapStart;
          
          transformedA.length = (transformedA.length || 0) - overlapLength;
          transformedB.length = (transformedB.length || 0) - overlapLength;
          
          if (aStart < bStart) {
            transformedB.position = aStart;
          } else {
            transformedA.position = bStart;
          }
        }
      }
    }

    return [transformedA, transformedB];
  }

  /**
   * Apply transformation to a sequence of operations
   */
  static transformAgainstOperations(
    operation: DocumentOperation, 
    operations: DocumentOperation[]
  ): DocumentOperation {
    let transformed = { ...operation };
    
    for (const op of operations) {
      if (op.userId !== operation.userId && op.timestamp < operation.timestamp) {
        const [transformedOp] = this.transform(transformed, op);
        transformed = transformedOp;
      }
    }
    
    return transformed;
  }

  /**
   * Compose multiple operations into a single operation
   */
  static compose(operations: DocumentOperation[]): DocumentOperation[] {
    if (operations.length === 0) return [];
    if (operations.length === 1) return operations;

    const composed: DocumentOperation[] = [];
    let current = operations[0];

    for (let i = 1; i < operations.length; i++) {
      const next = operations[i];
      
      // Try to merge consecutive operations from the same user
      if (current.userId === next.userId && 
          current.type === next.type && 
          Math.abs(current.timestamp - next.timestamp) < 5000) { // 5 second window
        
        if (current.type === 'insert' && next.type === 'insert') {
          // Merge consecutive inserts
          if (current.position + (current.content?.length || 0) === next.position) {
            current = {
              ...current,
              content: (current.content || '') + (next.content || ''),
              timestamp: Math.max(current.timestamp, next.timestamp)
            };
            continue;
          }
        } else if (current.type === 'delete' && next.type === 'delete') {
          // Merge consecutive deletes
          if (current.position === next.position + (next.length || 0)) {
            current = {
              ...current,
              length: (current.length || 0) + (next.length || 0),
              position: next.position,
              timestamp: Math.max(current.timestamp, next.timestamp)
            };
            continue;
          }
        }
      }
      
      composed.push(current);
      current = next;
    }
    
    composed.push(current);
    return composed;
  }
}

export class CollaborationDocument extends EventEmitter {
  private document: Document;
  private pendingOperations: Map<string, DocumentOperation> = new Map();
  private acknowledgments: Set<string> = new Set();

  constructor(documentId: string, initialContent: string = '') {
    super();
    
    this.document = {
      id: documentId,
      content: initialContent,
      revision: 0,
      operations: [],
      users: new Map(),
      lastModified: Date.now(),
      createdAt: Date.now()
    };
  }

  /**
   * Add user to the document collaboration session
   */
  addUser(user: User): void {
    this.document.users.set(user.id, {
      ...user,
      lastActivity: Date.now(),
      isTyping: false
    });
    
    this.emit('user-joined', {
      type: 'user-join',
      userId: user.id,
      documentId: this.document.id,
      data: user,
      timestamp: Date.now(),
      messageId: this.generateMessageId()
    });

    // Send current user list to all users
    this.broadcastUserList();
  }

  /**
   * Remove user from the document collaboration session
   */
  removeUser(userId: string): void {
    const user = this.document.users.get(userId);
    if (user) {
      this.document.users.delete(userId);
      
      this.emit('user-left', {
        type: 'user-leave',
        userId: userId,
        documentId: this.document.id,
        data: user,
        timestamp: Date.now(),
        messageId: this.generateMessageId()
      });

      this.broadcastUserList();
    }
  }

  /**
   * Apply operation to the document with operational transformation
   */
  applyOperation(operation: DocumentOperation): boolean {
    try {
      // Transform operation against concurrent operations
      const transformedOp = OperationalTransform.transformAgainstOperations(
        operation, 
        this.document.operations.filter(op => 
          op.revision > operation.revision && op.userId !== operation.userId
        )
      );

      // Validate operation
      if (!this.validateOperation(transformedOp)) {
        console.warn('Invalid operation:', transformedOp);
        return false;
      }

      // Apply the transformed operation to document content
      this.document.content = this.applyOperationToContent(
        this.document.content, 
        transformedOp
      );

      // Update document metadata
      this.document.revision++;
      this.document.lastModified = Date.now();
      
      // Store operation with updated revision
      const finalOperation = {
        ...transformedOp,
        revision: this.document.revision
      };
      
      this.document.operations.push(finalOperation);

      // Broadcast operation to all users except the author
      this.emit('operation-applied', {
        type: 'operation',
        userId: operation.userId,
        documentId: this.document.id,
        data: finalOperation,
        timestamp: Date.now(),
        messageId: this.generateMessageId()
      });

      // Clean up old operations (keep last 1000 operations)
      if (this.document.operations.length > 1000) {
        this.document.operations = this.document.operations.slice(-1000);
      }

      return true;
    } catch (error) {
      console.error('Error applying operation:', error);
      return false;
    }
  }

  /**
   * Update user cursor position
   */
  updateCursor(userId: string, cursor: EditorCursor): void {
    const user = this.document.users.get(userId);
    if (user) {
      user.cursor = cursor;
      user.lastActivity = Date.now();

      this.emit('cursor-updated', {
        type: 'cursor',
        userId: userId,
        documentId: this.document.id,
        data: { cursor },
        timestamp: Date.now(),
        messageId: this.generateMessageId()
      });
    }
  }

  /**
   * Update user selection
   */
  updateSelection(userId: string, selection: EditorSelection): void {
    const user = this.document.users.get(userId);
    if (user) {
      user.selection = selection;
      user.lastActivity = Date.now();

      this.emit('selection-updated', {
        type: 'selection',
        userId: userId,
        documentId: this.document.id,
        data: { selection },
        timestamp: Date.now(),
        messageId: this.generateMessageId()
      });
    }
  }

  /**
   * Set user typing status
   */
  setUserTyping(userId: string, isTyping: boolean): void {
    const user = this.document.users.get(userId);
    if (user) {
      user.isTyping = isTyping;
      user.lastActivity = Date.now();

      this.emit('typing-updated', {
        type: 'cursor',
        userId: userId,
        documentId: this.document.id,
        data: { isTyping },
        timestamp: Date.now(),
        messageId: this.generateMessageId()
      });
    }
  }

  /**
   * Get current document state for synchronization
   */
  getDocumentState(): Document {
    return {
      ...this.document,
      users: new Map(this.document.users) // Create a copy
    };
  }

  /**
   * Get document content
   */
  getContent(): string {
    return this.document.content;
  }

  /**
   * Get active users
   */
  getUsers(): User[] {
    return Array.from(this.document.users.values());
  }

  /**
   * Broadcast current user list to all connected users
   */
  private broadcastUserList(): void {
    const users = this.getUsers();
    this.emit('user-list-updated', {
      type: 'user-list',
      userId: 'system',
      documentId: this.document.id,
      data: { users },
      timestamp: Date.now(),
      messageId: this.generateMessageId()
    });
  }

  /**
   * Validate operation before applying
   */
  private validateOperation(operation: DocumentOperation): boolean {
    const contentLength = this.document.content.length;
    
    if (operation.type === 'insert') {
      return operation.position >= 0 && 
             operation.position <= contentLength && 
             operation.content !== undefined;
    } else if (operation.type === 'delete') {
      return operation.position >= 0 && 
             operation.length !== undefined &&
             operation.length > 0 &&
             operation.position + operation.length <= contentLength;
    }
    
    return false;
  }

  /**
   * Apply operation to document content
   */
  private applyOperationToContent(content: string, operation: DocumentOperation): string {
    if (operation.type === 'insert') {
      return content.slice(0, operation.position) + 
             (operation.content || '') + 
             content.slice(operation.position);
    } else if (operation.type === 'delete') {
      return content.slice(0, operation.position) + 
             content.slice(operation.position + (operation.length || 0));
    }
    
    return content;
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export class CollaborationServer extends EventEmitter {
  private wss: WebSocketServer;
  private documents: Map<string, CollaborationDocument> = new Map();
  private connections: Map<string, WebSocket & { userId?: string; documentId?: string }> = new Map();
  private userColors: string[] = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
  ];
  private usedColors: Set<string> = new Set();

  constructor(port: number = 3001) {
    super();
    
    this.wss = new WebSocketServer({ port });
    this.setupWebSocketServer();

  }

  /**
   * Setup WebSocket server with message handling
   */
  private setupWebSocketServer(): void {
    this.wss.on('connection', (ws: WebSocket & { userId?: string; documentId?: string }) => {
      const connectionId = this.generateConnectionId();
      this.connections.set(connectionId, ws);

      ws.on('message', (data: Buffer) => {
        try {
          const message: CollaborationMessage = JSON.parse(data.toString());
          this.handleMessage(ws, message, connectionId);
        } catch (error) {
          console.error('Error parsing message:', error);
          this.sendError(ws, 'Invalid message format');
        }
      });

      ws.on('close', () => {
        
        this.handleDisconnection(connectionId);
      });

      ws.on('error', (error) => {
        console.error(`WebSocket error for ${connectionId}:`, error);
      });

      // Send welcome message
      this.sendMessage(ws, {
        type: 'sync',
        userId: 'system',
        documentId: '',
        data: { connectionId, serverTime: Date.now() },
        timestamp: Date.now(),
        messageId: this.generateMessageId()
      });
    });
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(
    ws: WebSocket & { userId?: string; documentId?: string }, 
    message: CollaborationMessage,
    connectionId: string
  ): void {
    try {
      switch (message.type) {
        case 'operation':
          this.handleOperation(ws, message, connectionId);
          break;
        case 'cursor':
          this.handleCursorUpdate(ws, message, connectionId);
          break;
        case 'selection':
          this.handleSelectionUpdate(ws, message, connectionId);
          break;
        case 'user-join':
          this.handleUserJoin(ws, message, connectionId);
          break;
        case 'sync':
          this.handleSyncRequest(ws, message, connectionId);
          break;
        case 'ack':
          this.handleAcknowledgment(ws, message, connectionId);
          break;
        default:
          console.warn(`Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error('Error handling message:', error);
      this.sendError(ws, 'Error processing message');
    }
  }

  /**
   * Handle operation message (insert/delete/retain)
   */
  private handleOperation(
    ws: WebSocket & { userId?: string; documentId?: string },
    message: CollaborationMessage,
    connectionId: string
  ): void {
    const document = this.getOrCreateDocument(message.documentId);
    const operation: DocumentOperation = message.data;
    
    if (document.applyOperation(operation)) {
      // Broadcast to all other users in the same document
      this.broadcastToDocument(message.documentId, message, ws);
      
      // Send acknowledgment to sender
      this.sendMessage(ws, {
        type: 'ack',
        userId: 'system',
        documentId: message.documentId,
        data: { messageId: message.messageId, success: true },
        timestamp: Date.now(),
        messageId: this.generateMessageId()
      });
    } else {
      this.sendError(ws, 'Failed to apply operation');
    }
  }

  /**
   * Handle cursor position update
   */
  private handleCursorUpdate(
    ws: WebSocket & { userId?: string; documentId?: string },
    message: CollaborationMessage,
    connectionId: string
  ): void {
    const document = this.getOrCreateDocument(message.documentId);
    document.updateCursor(message.userId, message.data.cursor);
    
    // Broadcast to all other users in the same document
    this.broadcastToDocument(message.documentId, message, ws);
  }

  /**
   * Handle selection update
   */
  private handleSelectionUpdate(
    ws: WebSocket & { userId?: string; documentId?: string },
    message: CollaborationMessage,
    connectionId: string
  ): void {
    const document = this.getOrCreateDocument(message.documentId);
    document.updateSelection(message.userId, message.data.selection);
    
    // Broadcast to all other users in the same document
    this.broadcastToDocument(message.documentId, message, ws);
  }

  /**
   * Handle user joining document
   */
  private handleUserJoin(
    ws: WebSocket & { userId?: string; documentId?: string },
    message: CollaborationMessage,
    connectionId: string
  ): void {
    const user: User = {
      ...message.data,
      connectionId,
      color: this.assignUserColor(),
      isTyping: false,
      lastActivity: Date.now()
    };
    
    ws.userId = user.id;
    ws.documentId = message.documentId;
    
    const document = this.getOrCreateDocument(message.documentId);
    document.addUser(user);
    
    // Send current document state to new user
    this.sendMessage(ws, {
      type: 'sync',
      userId: 'system',
      documentId: message.documentId,
      data: {
        content: document.getContent(),
        users: document.getUsers(),
        revision: document.getDocumentState().revision
      },
      timestamp: Date.now(),
      messageId: this.generateMessageId()
    });
  }

  /**
   * Handle synchronization request
   */
  private handleSyncRequest(
    ws: WebSocket & { userId?: string; documentId?: string },
    message: CollaborationMessage,
    connectionId: string
  ): void {
    if (message.documentId) {
      const document = this.getOrCreateDocument(message.documentId);
      const documentState = document.getDocumentState();
      
      this.sendMessage(ws, {
        type: 'sync',
        userId: 'system',
        documentId: message.documentId,
        data: {
          content: documentState.content,
          users: Array.from(documentState.users.values()),
          revision: documentState.revision,
          operations: documentState.operations.slice(-100) // Last 100 operations
        },
        timestamp: Date.now(),
        messageId: this.generateMessageId()
      });
    }
  }

  /**
   * Handle acknowledgment message
   */
  private handleAcknowledgment(
    ws: WebSocket & { userId?: string; documentId?: string },
    message: CollaborationMessage,
    connectionId: string
  ): void {
    // Handle acknowledgment logic here
    
  }

  /**
   * Handle user disconnection
   */
  private handleDisconnection(connectionId: string): void {
    const ws = this.connections.get(connectionId);
    if (ws && ws.userId && ws.documentId) {
      const document = this.documents.get(ws.documentId);
      if (document) {
        const user = document.getUsers().find(u => u.id === ws.userId);
        if (user) {
          this.releaseUserColor(user.color);
        }
        document.removeUser(ws.userId);
      }
    }
    
    this.connections.delete(connectionId);
  }

  /**
   * Get or create document for collaboration
   */
  private getOrCreateDocument(documentId: string): CollaborationDocument {
    let document = this.documents.get(documentId);
    
    if (!document) {
      document = new CollaborationDocument(documentId);
      this.documents.set(documentId, document);
      
      // Set up document event listeners
      this.setupDocumentEventListeners(document);
    }
    
    return document;
  }

  /**
   * Setup event listeners for document events
   */
  private setupDocumentEventListeners(document: CollaborationDocument): void {
    document.on('operation-applied', (message: CollaborationMessage) => {
      this.broadcastToDocument(message.documentId, message);
    });

    document.on('cursor-updated', (message: CollaborationMessage) => {
      this.broadcastToDocument(message.documentId, message);
    });

    document.on('selection-updated', (message: CollaborationMessage) => {
      this.broadcastToDocument(message.documentId, message);
    });

    document.on('user-joined', (message: CollaborationMessage) => {
      this.broadcastToDocument(message.documentId, message);
    });

    document.on('user-left', (message: CollaborationMessage) => {
      this.broadcastToDocument(message.documentId, message);
    });

    document.on('user-list-updated', (message: CollaborationMessage) => {
      this.broadcastToDocument(message.documentId, message);
    });
  }

  /**
   * Broadcast message to all users in a document except sender
   */
  private broadcastToDocument(
    documentId: string, 
    message: CollaborationMessage, 
    excludeWs?: WebSocket
  ): void {
    for (const [connectionId, ws] of this.connections.entries()) {
      if (ws.documentId === documentId && ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
        this.sendMessage(ws, message);
      }
    }
  }

  /**
   * Send message to WebSocket connection
   */
  private sendMessage(ws: WebSocket, message: CollaborationMessage): void {
    try {
      ws.send(JSON.stringify(message));
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }

  /**
   * Send error message to WebSocket connection
   */
  private sendError(ws: WebSocket, error: string): void {
    this.sendMessage(ws, {
      type: 'ack',
      userId: 'system',
      documentId: '',
      data: { error, success: false },
      timestamp: Date.now(),
      messageId: this.generateMessageId()
    });
  }

  /**
   * Assign unique color to user
   */
  private assignUserColor(): string {
    for (const color of this.userColors) {
      if (!this.usedColors.has(color)) {
        this.usedColors.add(color);
        return color;
      }
    }
    
    // If all colors are used, return a random one
    return this.userColors[Math.floor(Math.random() * this.userColors.length)];
  }

  /**
   * Release user color when user disconnects
   */
  private releaseUserColor(color: string): void {
    this.usedColors.delete(color);
  }

  /**
   * Generate unique connection ID
   */
  private generateConnectionId(): string {
    return `conn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get server statistics
   */
  getStats(): {
    activeConnections: number;
    activeDocuments: number;
    totalUsers: number;
  } {
    const totalUsers = Array.from(this.documents.values())
      .reduce((sum, doc) => sum + doc.getUsers().length, 0);
    
    return {
      activeConnections: this.connections.size,
      activeDocuments: this.documents.size,
      totalUsers
    };
  }

  /**
   * Clean up inactive documents and connections
   */
  cleanup(): void {
    const now = Date.now();
    const inactivityThreshold = 30 * 60 * 1000; // 30 minutes
    
    // Clean up inactive documents
    for (const [documentId, document] of this.documents.entries()) {
      const documentState = document.getDocumentState();
      if (now - documentState.lastModified > inactivityThreshold && 
          documentState.users.size === 0) {
        this.documents.delete(documentId);
        
      }
    }
    
    // Clean up closed connections
    for (const [connectionId, ws] of this.connections.entries()) {
      if (ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
        this.handleDisconnection(connectionId);
      }
    }
  }

  /**
   * Start periodic cleanup
   */
  startPeriodicCleanup(): void {
    setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000); // Clean up every 5 minutes
  }

  /**
   * Shutdown server gracefully
   */
  shutdown(): void {
    
    // Close all connections
    for (const [connectionId, ws] of this.connections.entries()) {
      ws.close(1000, 'Server shutting down');
    }
    
    // Close WebSocket server
    this.wss.close(() => {
      
    });
  }
}

// Export default instance
export default CollaborationServer;
