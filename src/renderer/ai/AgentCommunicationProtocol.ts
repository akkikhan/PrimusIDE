import {
  CoordinationData,
  CoordinationStrategy,
  Task,
  TaskResult,
  MessageHistoryEntry
} from './types';

/**
 * Agent Communication Protocol - Real-time communication system for AI agents
 * Handles message passing, event broadcasting, and coordination between agents
 */
export class AgentCommunicationProtocol {
  private messageQueue: Map<string, Message[]> = new Map();
  private eventListeners: Map<string, EventListener[]> = new Map();
  private broadcastChannels: Map<string, BroadcastChannel> = new Map();
  private coordinationSessions: Map<string, CoordinationSession> = new Map();
  private messageHistory: MessageHistoryEntry[] = [];
  private maxHistorySize: number = 10000;
  private encryptionKey: string | null = null;

  constructor() {
    this.initializeCommunicationChannels();
  }

  /**
   * Initialize communication channels and protocols
   */
  private initializeCommunicationChannels(): void {
    // Create broadcast channels for different communication types
    this.createBroadcastChannel('task-coordination');
    this.createBroadcastChannel('status-updates');
    this.createBroadcastChannel('error-handling');
    this.createBroadcastChannel('performance-monitoring');
    this.createBroadcastChannel('context-sharing');
  }

  /**
   * Create a broadcast channel for specific communication type
   */
  private createBroadcastChannel(channelName: string): void {
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel(`swarm-${channelName}`);
      this.broadcastChannels.set(channelName, channel);

      channel.onmessage = (event) => {
        this.handleBroadcastMessage(channelName, event.data);
      };
    }
  }

  /**
   * Send a direct message to a specific agent
   */
  async sendMessage(toAgentId: string, message: Message): Promise<void> {
    // Encrypt message if encryption is enabled
    if (this.encryptionKey) {
      message = await this.encryptMessage(message);
    }

    // Add message to recipient's queue
    if (!this.messageQueue.has(toAgentId)) {
      this.messageQueue.set(toAgentId, []);
    }
    this.messageQueue.get(toAgentId)!.push(message);

    // Add to history
    this.addToMessageHistory(message);

    // Emit message event
    this.emitEvent('message-sent', { toAgentId, message });

  }

  /**
   * Receive messages for a specific agent
   */
  getMessages(agentId: string): Message[] {
    const messages = this.messageQueue.get(agentId) || [];
    this.messageQueue.set(agentId, []); // Clear messages after retrieval
    return messages;
  }

  /**
   * Broadcast a message to all agents
   */
  async broadcastMessage(message: BroadcastMessage): Promise<void> {
    // Encrypt message if encryption is enabled
    if (this.encryptionKey) {
      message = await this.encryptBroadcastMessage(message);
    }

    // Send to all broadcast channels
    for (const [channelName, channel] of this.broadcastChannels) {
      if (this.shouldBroadcastToChannel(message.type, channelName)) {
        channel.postMessage(message);
      }
    }

    // Add to history
    this.addToMessageHistory(message);

    // Emit broadcast event
    this.emitEvent('message-broadcast', { message });

  }

  /**
   * Determine if message should be broadcast to a specific channel
   */
  private shouldBroadcastToChannel(messageType: string, channelName: string): boolean {
    const channelMappings: Record<string, string[]> = {
      'task-coordination': ['task-assignment', 'task-completion', 'coordination-request'],
      'status-updates': ['status-update', 'progress-update', 'heartbeat'],
      'error-handling': ['error', 'warning', 'failure'],
      'performance-monitoring': ['performance-metric', 'optimization', 'bottleneck'],
      'context-sharing': ['context-request', 'context-response', 'knowledge-share']
    };

    return channelMappings[channelName]?.includes(messageType) || false;
  }

  /**
   * Handle incoming broadcast messages
   */
  private handleBroadcastMessage(channelName: string, data: any): void {
    
    // Process the message based on its type
    switch (data.type) {
      case 'task-assignment':
        this.handleTaskAssignment(data);
        break;
      case 'task-completion':
        this.handleTaskCompletion(data);
        break;
      case 'coordination-request':
        this.handleCoordinationRequest(data);
        break;
      case 'error':
        this.handleErrorBroadcast(data);
        break;
      case 'context-request':
        this.handleContextRequest(data);
        break;
      default:
        
    }

    // Emit broadcast received event
    this.emitEvent('broadcast-received', { channelName, data });
  }

  /**
   * Handle task assignment broadcasts
   */
  private handleTaskAssignment(data: any): void {
    
    // Implementation would coordinate with task management system
  }

  /**
   * Handle task completion broadcasts
   */
  private handleTaskCompletion(data: any): void {
    
    // Implementation would update task status and trigger dependent tasks
  }

  /**
   * Handle coordination requests
   */
  private handleCoordinationRequest(data: any): void {
    
    // Implementation would initiate coordination session
  }

  /**
   * Handle error broadcasts
   */
  private handleErrorBroadcast(data: any): void {
    
    // Implementation would trigger error recovery procedures
  }

  /**
   * Handle context requests
   */
  private handleContextRequest(data: any): void {
    
    // Implementation would share relevant context
  }

  /**
   * Initiate a coordination session between multiple agents
   */
  async initiateCoordinationSession(
    agentIds: string[],
    coordinationType: CoordinationData['coordinationType'],
    data: any
  ): Promise<string> {
    const sessionId = `coordination-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const session: CoordinationSession = {
      id: sessionId,
      agentIds,
      coordinationType,
      data,
      status: 'active',
      createdAt: Date.now(),
      participants: new Map(),
      messages: []
    };

    this.coordinationSessions.set(sessionId, session);

    // Notify all participants
    for (const agentId of agentIds) {
      await this.sendMessage(agentId, {
        id: `coord-${sessionId}-${agentId}`,
        fromAgentId: 'system',
        toAgentId: agentId,
        type: 'coordination-invitation',
        data: {
          sessionId,
          coordinationType,
          participants: agentIds
        },
        timestamp: Date.now(),
        priority: 'high'
      });
    }

    return sessionId;
  }

  /**
   * Join a coordination session
   */
  async joinCoordinationSession(sessionId: string, agentId: string): Promise<void> {
    const session = this.coordinationSessions.get(sessionId);
    if (!session) {
      throw new Error(`Coordination session ${sessionId} not found`);
    }

    session.participants.set(agentId, {
      agentId,
      joinedAt: Date.now(),
      status: 'active'
    });

    // Notify session participants
    await this.broadcastToSession(sessionId, {
      id: `join-${sessionId}-${agentId}`,
      fromAgentId: agentId,
      toAgentId: 'session',
      type: 'participant-joined',
      data: { agentId },
      timestamp: Date.now(),
      priority: 'medium'
    });

  }

  /**
   * Send a message within a coordination session
   */
  async sendCoordinationMessage(
    sessionId: string,
    fromAgentId: string,
    message: SessionMessage
  ): Promise<void> {
    const session = this.coordinationSessions.get(sessionId);
    if (!session) {
      throw new Error(`Coordination session ${sessionId} not found`);
    }

    const fullMessage: CoordinationMessage = {
      ...message,
      sessionId,
      fromAgentId,
      timestamp: Date.now()
    };

    session.messages.push(fullMessage);

    // Broadcast to all session participants
    await this.broadcastToSession(sessionId, fullMessage);

  }

  /**
   * Broadcast a message to all participants in a coordination session
   */
  private async broadcastToSession(sessionId: string, message: any): Promise<void> {
    const session = this.coordinationSessions.get(sessionId);
    if (!session) return;

    for (const [agentId] of session.participants) {
      await this.sendMessage(agentId, message);
    }
  }

  /**
   * End a coordination session
   */
  async endCoordinationSession(sessionId: string, agentId: string): Promise<void> {
    const session = this.coordinationSessions.get(sessionId);
    if (!session) {
      throw new Error(`Coordination session ${sessionId} not found`);
    }

    session.status = 'completed';
    session.completedAt = Date.now();

    // Notify all participants
    await this.broadcastToSession(sessionId, {
      id: `end-${sessionId}-${agentId}`,
      fromAgentId: agentId,
      toAgentId: 'session',
      type: 'session-ended',
      data: { sessionId },
      timestamp: Date.now(),
      priority: 'medium'
    });

  }

  /**
   * Add an event listener for communication events
   */
  addEventListener(eventType: string, listener: EventListener): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType)!.push(listener);
  }

  /**
   * Remove an event listener
   */
  removeEventListener(eventType: string, listener: EventListener): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Emit an event to all registered listeners
   */
  private emitEvent(eventType: string, data: any): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(data);
        } catch (error) {
          console.error('Error in event listener:', error);
        }
      }
    }
  }

  /**
   * Enable message encryption
   */
  async enableEncryption(key: string): Promise<void> {
    this.encryptionKey = key;
    
  }

  /**
   * Disable message encryption
   */
  disableEncryption(): void {
    this.encryptionKey = null;
    
  }

  /**
   * Encrypt a message
   */
  private async encryptMessage(message: Message): Promise<Message> {
    // Simple encryption implementation (in production, use proper encryption)
    if (this.encryptionKey) {
      const encryptedData = btoa(JSON.stringify(message.data));
      return { ...message, data: encryptedData };
    }
    return message;
  }

  /**
   * Encrypt a broadcast message
   */
  private async encryptBroadcastMessage(message: BroadcastMessage): Promise<BroadcastMessage> {
    // Simple encryption implementation (in production, use proper encryption)
    if (this.encryptionKey) {
      const encryptedData = btoa(JSON.stringify(message.data));
      return { ...message, data: encryptedData };
    }
    return message;
  }

  /**
   * Add message to history
   */
  private addToMessageHistory(message: Message | BroadcastMessage): void {
    // Convert to a common format for history storage
    const historyEntry: MessageHistoryEntry = {
      id: message.id,
      fromAgentId: message.fromAgentId,
      type: message.type,
      data: message.data,
      timestamp: message.timestamp,
      priority: message.priority,
      // Add optional fields based on message type
      ...(this.isBroadcastMessage(message) ? {} : { toAgentId: (message as Message).toAgentId })
    };

    this.messageHistory.push(historyEntry);

    // Maintain history size limit
    if (this.messageHistory.length > this.maxHistorySize) {
      this.messageHistory = this.messageHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Check if message is a broadcast message
   */
  private isBroadcastMessage(message: Message | BroadcastMessage): message is BroadcastMessage {
    return 'targetChannels' in message;
  }

  /**
   * Get communication statistics
   */
  getCommunicationStats(): CommunicationStats {
    return {
      totalMessages: this.messageHistory.length,
      activeCoordinationSessions: Array.from(this.coordinationSessions.values())
        .filter(session => session.status === 'active').length,
      broadcastChannels: this.broadcastChannels.size,
      messageQueueSize: Array.from(this.messageQueue.values())
        .reduce((total, queue) => total + queue.length, 0),
      averageMessageSize: this.calculateAverageMessageSize(),
      encryptionEnabled: this.encryptionKey !== null
    };
  }

  /**
   * Calculate average message size
   */
  private calculateAverageMessageSize(): number {
    if (this.messageHistory.length === 0) return 0;

    const totalSize = this.messageHistory.reduce((sum, message) => {
      return sum + JSON.stringify(message).length;
    }, 0);

    return totalSize / this.messageHistory.length;
  }

  /**
   * Get active coordination sessions
   */
  getActiveCoordinationSessions(): CoordinationSession[] {
    return Array.from(this.coordinationSessions.values())
      .filter(session => session.status === 'active');
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    // Close all broadcast channels
    for (const channel of this.broadcastChannels.values()) {
      channel.close();
    }

    // Clear all data structures
    this.messageQueue.clear();
    this.eventListeners.clear();
    this.broadcastChannels.clear();
    this.coordinationSessions.clear();
    this.messageHistory = [];

  }
}

// Supporting interfaces and types

export interface Message {
  id: string;
  fromAgentId: string;
  toAgentId: string;
  type: string;
  data: any;
  timestamp: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  requiresResponse?: boolean;
  responseTo?: string;
}

export interface BroadcastMessage {
  id: string;
  fromAgentId: string;
  type: string;
  data: any;
  timestamp: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  targetChannels?: string[];
}

export interface SessionMessage {
  id: string;
  toAgentId: string;
  type: string;
  data: any;
  priority: 'low' | 'medium' | 'high' | 'critical';
  requiresResponse?: boolean;
}

export interface CoordinationMessage extends SessionMessage {
  sessionId: string;
  fromAgentId: string;
  timestamp: number;
}

export interface CoordinationSession {
  id: string;
  agentIds: string[];
  coordinationType: CoordinationData['coordinationType'];
  data: any;
  status: 'active' | 'completed' | 'failed';
  createdAt: number;
  completedAt?: number;
  participants: Map<string, SessionParticipant>;
  messages: CoordinationMessage[];
}

export interface SessionParticipant {
  agentId: string;
  joinedAt: number;
  status: 'active' | 'inactive' | 'disconnected';
  lastSeen?: number;
}

export interface EventListener {
  (data: any): void;
}

export interface CommunicationStats {
  totalMessages: number;
  activeCoordinationSessions: number;
  broadcastChannels: number;
  messageQueueSize: number;
  averageMessageSize: number;
  encryptionEnabled: boolean;
}
