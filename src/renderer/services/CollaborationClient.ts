// Collaboration Client Service - Real-time collaborative editing client
// Handles WebSocket communication, operational transforms, and conflict resolution

import { EventEmitter } from 'events';
import { 
  User, 
  EditorCursor, 
  EditorSelection, 
  DocumentOperation, 
  CollaborationMessage 
} from '../../shared/collaboration-types';

export interface CollaborationClientConfig {
  serverUrl: string;
  userId: string;
  userName: string;
  userEmail: string;
  userAvatar?: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  operationTimeout?: number;
}

export interface CollaborationState {
  isConnected: boolean;
  isConnecting: boolean;
  currentDocumentId?: string;
  currentUser?: User;
  activeUsers: User[];
  serverRevision: number;
  localRevision: number;
  pendingOperations: DocumentOperation[];
  acknowledgedOperations: Set<string>;
}

export interface CursorPosition {
  userId: string;
  cursor: EditorCursor;
  selection?: EditorSelection;
  color: string;
  userName: string;
  isTyping: boolean;
}

export interface CollaborationEvents {
  'connected': () => void;
  'disconnected': () => void;
  'reconnecting': (attempt: number) => void;
  'document-synced': (content: string, revision: number) => void;
  'operation-received': (operation: DocumentOperation) => void;
  'cursor-updated': (cursor: CursorPosition) => void;
  'selection-updated': (selection: CursorPosition) => void;
  'user-joined': (user: User) => void;
  'user-left': (user: User) => void;
  'user-list-updated': (users: User[]) => void;
  'typing-status-changed': (userId: string, isTyping: boolean) => void;
  'error': (error: Error) => void;
}

export class CollaborationClient extends EventEmitter {
  private config: CollaborationClientConfig;
  private ws: WebSocket | null = null;
  private state: CollaborationState;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private pingTimer: NodeJS.Timeout | null = null;
  private operationQueue: DocumentOperation[] = [];
  private messageHandlers: Map<string, (message: CollaborationMessage) => void> = new Map();
  private pendingAcknowledgments: Map<string, { operation: DocumentOperation; timestamp: number }> = new Map();

  constructor(config: CollaborationClientConfig) {
    super();
    
    this.config = {
      reconnectInterval: 5000,
      maxReconnectAttempts: 10,
      operationTimeout: 30000,
      ...config
    };

    this.state = {
      isConnected: false,
      isConnecting: false,
      activeUsers: [],
      serverRevision: 0,
      localRevision: 0,
      pendingOperations: [],
      acknowledgedOperations: new Set()
    };

    this.setupMessageHandlers();
  }

  /**
   * Connect to collaboration server
   */
  async connect(): Promise<void> {
    if (this.state.isConnected || this.state.isConnecting) {
      return;
    }

    this.state.isConnecting = true;

    try {
      await this.establishConnection();
      this.state.isConnected = true;
      this.state.isConnecting = false;
      this.reconnectAttempts = 0;
      
      this.startHeartbeat();
      this.emit('connected');

    } catch (error) {
      this.state.isConnecting = false;
      this.handleConnectionError(error as Error);
    }
  }

  /**
   * Disconnect from collaboration server
   */
  disconnect(): void {
    this.stopHeartbeat();
    this.clearReconnectTimer();
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    
    this.state.isConnected = false;
    this.state.isConnecting = false;
    this.emit('disconnected');

  }

  /**
   * Join document collaboration session
   */
  async joinDocument(documentId: string): Promise<void> {
    if (!this.state.isConnected) {
      throw new Error('Not connected to collaboration server');
    }

    this.state.currentDocumentId = documentId;
    this.state.currentUser = {
      id: this.config.userId,
      name: this.config.userName,
      email: this.config.userEmail,
      avatar: this.config.userAvatar,
      color: '#007acc', // Will be assigned by server
      isTyping: false,
      lastActivity: Date.now(),
      connectionId: ''
    };

    const message: CollaborationMessage = {
      type: 'user-join',
      userId: this.config.userId,
      documentId: documentId,
      data: this.state.currentUser,
      timestamp: Date.now(),
      messageId: this.generateMessageId()
    };

    this.sendMessage(message);
  }

  /**
   * Leave current document collaboration session
   */
  leaveDocument(): void {
    if (this.state.currentDocumentId) {
      const message: CollaborationMessage = {
        type: 'user-leave',
        userId: this.config.userId,
        documentId: this.state.currentDocumentId,
        data: {},
        timestamp: Date.now(),
        messageId: this.generateMessageId()
      };

      this.sendMessage(message);
      
      this.state.currentDocumentId = undefined;
      this.state.currentUser = undefined;
      this.state.activeUsers = [];
    }
  }

  /**
   * Send document operation to server
   */
  sendOperation(operation: Omit<DocumentOperation, 'id' | 'timestamp' | 'revision'>): void {
    if (!this.state.currentDocumentId) {
      throw new Error('No active document session');
    }

    const fullOperation: DocumentOperation = {
      ...operation,
      id: this.generateOperationId(),
      userId: this.config.userId,
      timestamp: Date.now(),
      revision: this.state.localRevision
    };

    // Add to pending operations
    this.state.pendingOperations.push(fullOperation);
    this.pendingAcknowledgments.set(fullOperation.id, {
      operation: fullOperation,
      timestamp: Date.now()
    });

    // Send to server
    const message: CollaborationMessage = {
      type: 'operation',
      userId: this.config.userId,
      documentId: this.state.currentDocumentId,
      data: fullOperation,
      timestamp: Date.now(),
      messageId: this.generateMessageId()
    };

    this.sendMessage(message);

    // Set timeout for acknowledgment
    setTimeout(() => {
      if (this.pendingAcknowledgments.has(fullOperation.id)) {
        console.warn('Operation acknowledgment timeout:', fullOperation.id);
        this.pendingAcknowledgments.delete(fullOperation.id);
        this.emit('error', new Error(`Operation timeout: ${fullOperation.id}`));
      }
    }, this.config.operationTimeout || 30000);
  }

  /**
   * Update cursor position
   */
  updateCursor(cursor: EditorCursor): void {
    if (!this.state.currentDocumentId) return;

    const message: CollaborationMessage = {
      type: 'cursor',
      userId: this.config.userId,
      documentId: this.state.currentDocumentId,
      data: { cursor },
      timestamp: Date.now(),
      messageId: this.generateMessageId()
    };

    this.sendMessage(message);

    // Update local user state
    if (this.state.currentUser) {
      this.state.currentUser.cursor = cursor;
      this.state.currentUser.lastActivity = Date.now();
    }
  }

  /**
   * Update selection
   */
  updateSelection(selection: EditorSelection): void {
    if (!this.state.currentDocumentId) return;

    const message: CollaborationMessage = {
      type: 'selection',
      userId: this.config.userId,
      documentId: this.state.currentDocumentId,
      data: { selection },
      timestamp: Date.now(),
      messageId: this.generateMessageId()
    };

    this.sendMessage(message);

    // Update local user state
    if (this.state.currentUser) {
      this.state.currentUser.selection = selection;
      this.state.currentUser.lastActivity = Date.now();
    }
  }

  /**
   * Set typing status
   */
  setTypingStatus(isTyping: boolean): void {
    if (!this.state.currentDocumentId || !this.state.currentUser) return;

    this.state.currentUser.isTyping = isTyping;
    this.state.currentUser.lastActivity = Date.now();

    const message: CollaborationMessage = {
      type: 'cursor',
      userId: this.config.userId,
      documentId: this.state.currentDocumentId,
      data: { isTyping },
      timestamp: Date.now(),
      messageId: this.generateMessageId()
    };

    this.sendMessage(message);
  }

  /**
   * Request document synchronization
   */
  requestSync(): void {
    if (!this.state.currentDocumentId) return;

    const message: CollaborationMessage = {
      type: 'sync',
      userId: this.config.userId,
      documentId: this.state.currentDocumentId,
      data: { 
        requestedRevision: this.state.serverRevision,
        localRevision: this.state.localRevision
      },
      timestamp: Date.now(),
      messageId: this.generateMessageId()
    };

    this.sendMessage(message);
  }

  /**
   * Get current collaboration state
   */
  getState(): CollaborationState {
    return { ...this.state };
  }

  /**
   * Get active users in current document
   */
  getActiveUsers(): User[] {
    return [...this.state.activeUsers];
  }

  /**
   * Get cursor positions of other users
   */
  getCursorPositions(): CursorPosition[] {
    return this.state.activeUsers
      .filter(user => user.id !== this.config.userId && user.cursor)
      .map(user => ({
        userId: user.id,
        cursor: user.cursor!,
        selection: user.selection,
        color: user.color,
        userName: user.name,
        isTyping: user.isTyping
      }));
  }

  /**
   * Establish WebSocket connection
   */
  private async establishConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.config.serverUrl);

        this.ws.onopen = () => {
          
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: CollaborationMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Error parsing message:', error);
          }
        };

        this.ws.onclose = (event) => {
          
          this.handleDisconnection();
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(new Error('WebSocket connection failed'));
        };

        // Connection timeout
        setTimeout(() => {
          if (this.ws?.readyState !== WebSocket.OPEN) {
            reject(new Error('Connection timeout'));
          }
        }, 10000);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(message: CollaborationMessage): void {
    const handler = this.messageHandlers.get(message.type);
    if (handler) {
      try {
        handler(message);
      } catch (error) {
        console.error(`Error handling ${message.type} message:`, error);
        this.emit('error', error as Error);
      }
    } else {
      console.warn(`Unknown message type: ${message.type}`);
    }
  }

  /**
   * Setup message handlers for different message types
   */
  private setupMessageHandlers(): void {
    this.messageHandlers.set('operation', (message) => {
      const operation: DocumentOperation = message.data;
      
      // Don't process our own operations
      if (operation.userId === this.config.userId) return;

      // Apply operational transform if needed
      const transformedOperation = this.transformOperation(operation);
      
      this.state.serverRevision = Math.max(this.state.serverRevision, operation.revision || 0);
      this.emit('operation-received', transformedOperation);
    });

    this.messageHandlers.set('cursor', (message) => {
      const userId = message.userId;
      const data = message.data;
      
      // Update user in active users list
      const userIndex = this.state.activeUsers.findIndex(u => u.id === userId);
      if (userIndex >= 0) {
        if (data.cursor) {
          this.state.activeUsers[userIndex].cursor = data.cursor;
        }
        if (data.isTyping !== undefined) {
          this.state.activeUsers[userIndex].isTyping = data.isTyping;
        }
        this.state.activeUsers[userIndex].lastActivity = Date.now();

        if (data.cursor) {
          this.emit('cursor-updated', {
            userId,
            cursor: data.cursor,
            selection: this.state.activeUsers[userIndex].selection,
            color: this.state.activeUsers[userIndex].color,
            userName: this.state.activeUsers[userIndex].name,
            isTyping: this.state.activeUsers[userIndex].isTyping
          });
        }

        if (data.isTyping !== undefined) {
          this.emit('typing-status-changed', userId, data.isTyping);
        }
      }
    });

    this.messageHandlers.set('selection', (message) => {
      const userId = message.userId;
      const { selection } = message.data;
      
      // Update user in active users list
      const userIndex = this.state.activeUsers.findIndex(u => u.id === userId);
      if (userIndex >= 0) {
        this.state.activeUsers[userIndex].selection = selection;
        this.state.activeUsers[userIndex].lastActivity = Date.now();

        this.emit('selection-updated', {
          userId,
          cursor: this.state.activeUsers[userIndex].cursor || { line: 0, column: 0 },
          selection,
          color: this.state.activeUsers[userIndex].color,
          userName: this.state.activeUsers[userIndex].name,
          isTyping: this.state.activeUsers[userIndex].isTyping
        });
      }
    });

    this.messageHandlers.set('user-join', (message) => {
      const user: User = message.data;
      
      // Don't add ourselves
      if (user.id === this.config.userId) return;

      // Check if user already exists
      const existingIndex = this.state.activeUsers.findIndex(u => u.id === user.id);
      if (existingIndex >= 0) {
        this.state.activeUsers[existingIndex] = user;
      } else {
        this.state.activeUsers.push(user);
      }

      this.emit('user-joined', user);
    });

    this.messageHandlers.set('user-leave', (message) => {
      const user: User = message.data;
      
      this.state.activeUsers = this.state.activeUsers.filter(u => u.id !== user.id);
      this.emit('user-left', user);
    });

    this.messageHandlers.set('user-list', (message) => {
      const { users } = message.data;
      
      // Filter out current user
      this.state.activeUsers = users.filter((user: User) => user.id !== this.config.userId);
      this.emit('user-list-updated', this.state.activeUsers);
    });

    this.messageHandlers.set('sync', (message) => {
      const data = message.data;
      
      if (data.content !== undefined) {
        this.state.serverRevision = data.revision || 0;
        this.state.localRevision = this.state.serverRevision;
        
        if (data.users) {
          this.state.activeUsers = data.users.filter((user: User) => user.id !== this.config.userId);
        }

        // Update current user color if provided
        if (this.state.currentUser && data.userColor) {
          this.state.currentUser.color = data.userColor;
        }

        this.emit('document-synced', data.content, data.revision);
        
        if (data.users) {
          this.emit('user-list-updated', this.state.activeUsers);
        }
      }
    });

    this.messageHandlers.set('ack', (message) => {
      const data = message.data;
      
      if (data.success && data.messageId) {
        // Find corresponding operation
        for (const [opId, pending] of this.pendingAcknowledgments.entries()) {
          if (pending.operation.id === data.operationId || data.messageId.includes(opId)) {
            this.state.acknowledgedOperations.add(opId);
            this.pendingAcknowledgments.delete(opId);
            
            // Update local revision
            this.state.localRevision++;
            break;
          }
        }
      } else if (data.error) {
        console.error('Server error:', data.error);
        this.emit('error', new Error(data.error));
      }
    });
  }

  /**
   * Transform operation against pending operations (Operational Transform)
   */
  private transformOperation(operation: DocumentOperation): DocumentOperation {
    let transformed = { ...operation };

    // Transform against pending operations
    for (const pending of this.state.pendingOperations) {
      if (pending.timestamp < operation.timestamp) {
        // Apply basic operational transform
        if (pending.type === 'insert' && transformed.type === 'insert') {
          if (pending.position <= transformed.position) {
            transformed.position += pending.content?.length || 0;
          }
        } else if (pending.type === 'delete' && transformed.type === 'insert') {
          if (pending.position < transformed.position) {
            transformed.position -= Math.min(pending.length || 0, 
              Math.max(0, transformed.position - pending.position));
          }
        } else if (pending.type === 'insert' && transformed.type === 'delete') {
          if (pending.position <= transformed.position) {
            transformed.position += pending.content?.length || 0;
          }
        } else if (pending.type === 'delete' && transformed.type === 'delete') {
          if (pending.position < transformed.position) {
            transformed.position -= pending.length || 0;
          } else if (pending.position < transformed.position + (transformed.length || 0)) {
            // Overlapping deletes - adjust length
            const overlap = Math.min(pending.length || 0, 
              (transformed.position + (transformed.length || 0)) - pending.position);
            transformed.length = (transformed.length || 0) - overlap;
          }
        }
      }
    }

    return transformed;
  }

  /**
   * Handle connection error and attempt reconnection
   */
  private handleConnectionError(error: Error): void {
    console.error('Connection error:', error);
    this.emit('error', error);
    
    if (this.reconnectAttempts < (this.config.maxReconnectAttempts || 10)) {
      this.scheduleReconnect();
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  /**
   * Handle disconnection
   */
  private handleDisconnection(): void {
    this.state.isConnected = false;
    this.state.isConnecting = false;
    this.stopHeartbeat();
    
    this.emit('disconnected');
    
    // Attempt reconnection if not manually disconnected
    if (this.ws && this.ws.readyState !== WebSocket.CLOSED) {
      this.scheduleReconnect();
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;

    this.reconnectAttempts++;
    const delay = Math.min(
      (this.config.reconnectInterval || 5000) * Math.pow(2, this.reconnectAttempts - 1),
      30000 // Max 30 seconds
    );

    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    this.emit('reconnecting', this.reconnectAttempts);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect().catch(error => {
        console.error('Reconnection failed:', error);
      });
    }, delay);
  }

  /**
   * Clear reconnection timer
   */
  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
    this.pingTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        const pingMessage: CollaborationMessage = {
          type: 'sync',
          userId: this.config.userId,
          documentId: this.state.currentDocumentId || '',
          data: { ping: true },
          timestamp: Date.now(),
          messageId: this.generateMessageId()
        };
        
        this.sendMessage(pingMessage);
      }
    }, 30000); // Ping every 30 seconds
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  /**
   * Send message to server
   */
  private sendMessage(message: CollaborationMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message));
      } catch (error) {
        console.error('Error sending message:', error);
        this.emit('error', error as Error);
      }
    } else {
      console.warn('WebSocket not connected, queuing message');
      this.operationQueue.push(message.data);
    }
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `${this.config.userId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique operation ID
   */
  private generateOperationId(): string {
    return `op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clean up pending operations that have been acknowledged
   */
  private cleanupPendingOperations(): void {
    const now = Date.now();
    const timeout = this.config.operationTimeout || 30000;
    
    // Remove acknowledged operations from pending list
    this.state.pendingOperations = this.state.pendingOperations.filter(op => 
      !this.state.acknowledgedOperations.has(op.id)
    );
    
    // Remove timed out acknowledgments
    for (const [opId, pending] of this.pendingAcknowledgments.entries()) {
      if (now - pending.timestamp > timeout) {
        console.warn('Removing timed out operation:', opId);
        this.pendingAcknowledgments.delete(opId);
      }
    }
  }

  /**
   * Start periodic cleanup
   */
  startPeriodicCleanup(): void {
    setInterval(() => {
      this.cleanupPendingOperations();
    }, 10000); // Clean up every 10 seconds
  }
}

export default CollaborationClient;
