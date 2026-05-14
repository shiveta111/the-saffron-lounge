import { io, Socket } from 'socket.io-client';
import { env } from './env';

/**
 * WebSocket Connection Manager
 * Handles connection, reconnection, and event management
 */
class WebSocketManager {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000; // Start with 1 second
  private maxReconnectDelay = 30000; // Max 30 seconds
  private isConnecting = false;
  private connectionStatusCallbacks: Set<(status: ConnectionStatus) => void> = new Set();
  private eventListeners: Map<string, Set<(data: any) => void>> = new Map();

  /**
   * Initialize WebSocket connection
   */
  connect(userId?: number, role?: string): void {
    if (this.socket?.connected || this.isConnecting) {
      console.log('🔌 WebSocket already connected or connecting');
      return;
    }

    this.isConnecting = true;
    // Socket.IO needs base URL without /api/v1 path
    // env.apiUrl = "https://domain.com/api/v1" -> "https://domain.com"
    const serverUrl = env.apiUrl.split('/api/v1')[0];

    console.log('🔌 Connecting to WebSocket server:', serverUrl);

    this.socket = io(serverUrl, {
      path: '/socket.io',  // Explicit Socket.IO path
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
      reconnectionDelayMax: this.maxReconnectDelay,
      timeout: 20000,
      autoConnect: true,
    });

    this.setupEventHandlers(userId, role);
  }

  /**
   * Setup WebSocket event handlers
   */
  private setupEventHandlers(userId?: number, role?: string): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('✅ WebSocket connected:', this.socket?.id);
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      this.reconnectDelay = 1000;
      this.notifyConnectionStatus('connected');

      // Authenticate if user info provided
      if (userId && role) {
        this.authenticate(userId, role);
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ WebSocket disconnected:', reason);
      this.notifyConnectionStatus('disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('🔴 WebSocket connection error:', error.message);
      this.isConnecting = false;
      this.handleReconnect();
      this.notifyConnectionStatus('error');
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`🔄 WebSocket reconnected after ${attemptNumber} attempts`);
      this.reconnectAttempts = 0;
      this.reconnectDelay = 1000;
      this.notifyConnectionStatus('connected');
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🔄 WebSocket reconnection attempt ${attemptNumber}`);
      this.notifyConnectionStatus('reconnecting');
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('🔴 WebSocket reconnection error:', error.message);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('❌ WebSocket reconnection failed after max attempts');
      this.notifyConnectionStatus('failed');
    });

    // Authentication response
    this.socket.on('authenticated', (data) => {
      console.log('🔐 WebSocket authenticated:', data);
    });

    this.socket.on('subscription:error', (data) => {
      console.error('❌ Subscription error:', data.message);
    });

    // Ping/Pong for connection health
    this.socket.on('pong', () => {
      // Connection is healthy
    });

    // Setup listeners for all registered events
    this.eventListeners.forEach((callbacks, event) => {
      this.socket?.on(event, (data) => {
        callbacks.forEach(callback => callback(data));
      });
    });
  }

  /**
   * Authenticate with server
   */
  private authenticate(userId: number, role: string): void {
    if (!this.socket?.connected) return;

    this.socket.emit('authenticate', { userId, role });
  }

  /**
   * Handle reconnection with exponential backoff
   */
  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      this.notifyConnectionStatus('failed');
      return;
    }

    this.reconnectAttempts++;
    this.reconnectDelay = Math.min(
      this.reconnectDelay * 2,
      this.maxReconnectDelay
    );

    console.log(`🔄 Reconnecting in ${this.reconnectDelay}ms (attempt ${this.reconnectAttempts})`);
  }

  /**
   * Subscribe to a room
   */
  subscribe(room: string): void {
    if (!this.socket?.connected) {
      console.warn('⚠️ Cannot subscribe: WebSocket not connected');
      return;
    }

    console.log(`📡 Subscribing to room: ${room}`);
    this.socket.emit(`subscribe:${room}`);
  }

  /**
   * Add event listener
   */
  on(event: string, callback: (data: any) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)?.add(callback);

    // If socket is already connected, add the listener
    if (this.socket?.connected) {
      this.socket.on(event, callback);
    }
  }

  /**
   * Remove event listener
   */
  off(event: string, callback: (data: any) => void): void {
    this.eventListeners.get(event)?.delete(callback);
    this.socket?.off(event, callback);
  }

  /**
   * Remove all listeners for an event
   */
  removeAllListeners(event: string): void {
    this.eventListeners.delete(event);
    this.socket?.removeAllListeners(event);
  }

  /**
   * Emit event to server
   */
  emit(event: string, data: any): void {
    if (!this.socket?.connected) {
      console.warn('⚠️ Cannot emit: WebSocket not connected');
      return;
    }

    this.socket.emit(event, data);
  }

  /**
   * Send ping to check connection health
   */
  ping(): void {
    if (this.socket?.connected) {
      this.socket.emit('ping');
    }
  }

  /**
   * Start heartbeat to maintain connection
   */
  startHeartbeat(interval: number = 30000): void {
    setInterval(() => {
      this.ping();
    }, interval);
  }

  /**
   * Disconnect from server
   */
  disconnect(): void {
    if (this.socket) {
      console.log('🔌 Disconnecting WebSocket');
      this.socket.disconnect();
      this.socket = null;
      this.isConnecting = false;
      this.notifyConnectionStatus('disconnected');
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): ConnectionStatus {
    if (!this.socket) return 'disconnected';
    if (this.socket.connected) return 'connected';
    if (this.isConnecting) return 'connecting';
    return 'disconnected';
  }

  /**
   * Add connection status callback
   */
  onConnectionStatusChange(callback: (status: ConnectionStatus) => void): void {
    this.connectionStatusCallbacks.add(callback);
  }

  /**
   * Remove connection status callback
   */
  offConnectionStatusChange(callback: (status: ConnectionStatus) => void): void {
    this.connectionStatusCallbacks.delete(callback);
  }

  /**
   * Notify all connection status callbacks
   */
  private notifyConnectionStatus(status: ConnectionStatus): void {
    this.connectionStatusCallbacks.forEach(callback => callback(status));
  }
}

// Connection status type
export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'reconnecting' | 'error' | 'failed';

// Singleton instance
export const wsManager = new WebSocketManager();
export const websocketService = wsManager;
export default wsManager;
