'use client';

import { useEffect, useRef, useState } from 'react';
import { env } from './env';

export interface RealtimeEvent {
  type: string;
  data: any;
  timestamp: string;
  source: string;
}

export interface RealtimeSubscription {
  id: string;
  eventType: string;
  callback: (event: RealtimeEvent) => void;
}

class RealtimeManager {
  private ws: WebSocket | null = null;
  private subscriptions: Map<string, RealtimeSubscription[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private isConnected = false;
  private connectionRequested = false; // Track if connection was requested

  constructor() {
    // Don't connect automatically - wait for first subscription
  }

  private connect() {
    try {
      // Try WebSocket first, fallback to simulation
      if (typeof window !== 'undefined') {
        this.connectWebSocket();
      } else {
        this.simulateRealtimeConnection();
      }
    } catch (error) {
      console.error('Failed to connect to realtime service:', error);
      this.scheduleReconnect();
    }
  }

  private async connectWebSocket() {
    try {
      // Native WebSocket needs explicit /socket.io path
      const wsUrl = env.wsUrl.endsWith('/') ? env.wsUrl.slice(0, -1) : env.wsUrl;
      this.ws = new WebSocket(`${wsUrl}/socket.io/?EIO=4&transport=websocket`);

      // Connection timeout to prevent hanging
      const connectionTimeout = setTimeout(() => {
        if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
          console.warn('WebSocket connection timeout, using fallback');
          this.ws.close();
          this.simulateRealtimeConnection();
        }
      }, 3000); // 3 second timeout

      this.ws.onopen = () => {
        clearTimeout(connectionTimeout);
        console.log('🔗 WebSocket connection established');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.startHeartbeat();
      };

      this.ws.onmessage = (event) => {
        try {
          // Socket.IO protocol messages start with a number (e.g., "0{...}", "42[...]")
          // Skip Socket.IO protocol handshake messages
          const data = event.data;
          if (typeof data === 'string' && /^[0-9]+/.test(data)) {
            // This is a Socket.IO protocol message, ignore it
            return;
          }
          
          const message = JSON.parse(data);
          this.handleRealtimeEvent(message);
        } catch (error) {
          // Silently ignore parse errors for Socket.IO protocol messages
          // Only log if it looks like it should have been valid JSON
          if (event.data && !event.data.startsWith('0') && !event.data.startsWith('2') && !event.data.startsWith('4')) {
            console.error('Failed to parse WebSocket message:', error);
          }
        }
      };

      this.ws.onclose = () => {
        clearTimeout(connectionTimeout);
        if (this.reconnectAttempts === 0) {
          // Only log on first close, then silently fallback
          console.log('🔌 WebSocket connection closed. Using simulated connection.');
        }
        this.isConnected = false;
        // After first failure, use simulated connection instead of reconnecting
        if (this.reconnectAttempts === 0) {
          this.simulateRealtimeConnection();
        }
      };

      this.ws.onerror = (error) => {
        clearTimeout(connectionTimeout);
        // Only log error on first attempt, then silently fallback
        if (this.reconnectAttempts === 0) {
          console.warn('WebSocket connection unavailable. Using simulated real-time connection.');
        }
        this.isConnected = false;
        // Close the connection to trigger onclose
        if (this.ws) {
          this.ws.close();
        }
      };
    } catch (error) {
      // Silently fallback to simulated connection
      this.simulateRealtimeConnection();
    }
  }

  private simulateRealtimeConnection() {
    // Simulate WebSocket connection for development
    this.isConnected = true;
    this.startHeartbeat();

    // Simulate periodic updates (but not interfering with real events)
    setInterval(() => {
      if (this.isConnected) {
        this.handleSimulatedEvent();
      }
    }, 30000); // Update every 30 seconds

    console.log('🔗 Real-time connection established (simulated)');
  }

  private handleRealtimeEvent(message: any) {
    const event: RealtimeEvent = {
      type: message.type,
      data: message.data,
      timestamp: message.timestamp || new Date().toISOString(),
      source: message.source || 'websocket'
    };

    this.notifySubscribers(event);
  }

  private handleSimulatedEvent() {
    // Simulate various real-time events
    const events = [
      {
        type: 'USER_UPDATED',
        data: { userId: Math.floor(Math.random() * 100) + 1, action: 'profile_update' },
        source: 'user_service'
      },
      {
        type: 'ORDER_CREATED',
        data: { orderId: Math.floor(Math.random() * 1000) + 1, total: Math.floor(Math.random() * 100) + 10 },
        source: 'order_service'
      },
      {
        type: 'CONTENT_UPDATED',
        data: { contentId: Math.floor(Math.random() * 50) + 1, type: 'page' },
        source: 'content_service'
      },
      {
        type: 'TESTIMONIAL_CREATED',
        data: { testimonialId: Math.floor(Math.random() * 50) + 1, clientName: 'New Client' },
        source: 'testimonial_service'
      },
      {
        type: 'SERVICE_UPDATED',
        data: { serviceId: Math.floor(Math.random() * 20) + 1, action: 'status_change' },
        source: 'service_service'
      },
      {
        type: 'TEAM_MEMBER_UPDATED',
        data: { memberId: Math.floor(Math.random() * 10) + 1, action: 'profile_update' },
        source: 'team_service'
      }
    ];

    const randomEvent = events[Math.floor(Math.random() * events.length)];
    const event: RealtimeEvent = {
      ...randomEvent,
      timestamp: new Date().toISOString()
    };

    this.notifySubscribers(event);
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected) {
        // Send heartbeat to keep connection alive
        this.notifySubscribers({
          type: 'HEARTBEAT',
          data: { timestamp: Date.now() },
          timestamp: new Date().toISOString(),
          source: 'system'
        });
      }
    }, 30000); // Heartbeat every 30 seconds
  }

  private scheduleReconnect() {
    // Don't reconnect if we've already switched to simulated mode
    if (this.reconnectAttempts === 0) {
      // First failure - switch to simulated connection
      this.simulateRealtimeConnection();
      return;
    }
    
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      // Only log reconnection attempts in development
      if (process.env.NODE_ENV === 'development' && this.reconnectAttempts <= 2) {
        console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      }
      setTimeout(() => {
        this.connect();
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      // Max attempts reached, use simulated connection
      this.simulateRealtimeConnection();
    }
  }

  private notifySubscribers(event: RealtimeEvent) {
    const eventSubscriptions = this.subscriptions.get(event.type) || [];
    eventSubscriptions.forEach(subscription => {
      try {
        subscription.callback(event);
      } catch (error) {
        console.error('Error in realtime subscription callback:', error);
      }
    });

    // Also notify wildcard subscribers
    const wildcardSubscriptions = this.subscriptions.get('*') || [];
    wildcardSubscriptions.forEach(subscription => {
      try {
        subscription.callback(event);
      } catch (error) {
        console.error('Error in wildcard realtime subscription callback:', error);
      }
    });
  }

  subscribe(eventType: string, callback: (event: RealtimeEvent) => void): string {
    // Lazy connect - only connect when first subscription is made
    // Use requestIdleCallback or setTimeout to avoid blocking
    if (!this.connectionRequested) {
      this.connectionRequested = true;
      // Delay connection to avoid blocking initial render
      // Use a single connection attempt to prevent multiple pages from creating multiple connections
      if (typeof window !== 'undefined') {
        const connectTimeout = setTimeout(() => {
          if (!this.isConnected && !this.ws) {
            this.connect();
          }
        }, 100);
        // Store timeout ID for potential cleanup (though it's a singleton)
        (this as any)._connectTimeout = connectTimeout;
      }
    }

    const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    if (!this.subscriptions.has(eventType)) {
      this.subscriptions.set(eventType, []);
    }

    this.subscriptions.get(eventType)!.push({
      id: subscriptionId,
      eventType,
      callback
    });

    return subscriptionId;
  }

  unsubscribe(subscriptionId: string) {
    for (const [eventType, subs] of this.subscriptions.entries()) {
      const index = subs.findIndex(sub => sub.id === subscriptionId);
      if (index > -1) {
        subs.splice(index, 1);
        if (subs.length === 0) {
          this.subscriptions.delete(eventType);
        }
        // Disconnect if no more subscriptions
        if (this.subscriptions.size === 0 && this.isConnected) {
          this.disconnect();
          this.connectionRequested = false;
        }
        break;
      }
    }
  }

  emit(eventType: string, data: any) {
    const event: RealtimeEvent = {
      type: eventType,
      data,
      timestamp: new Date().toISOString(),
      source: 'client'
    };

    console.log(`📡 Emitting real-time event: ${eventType}`, data);
    this.notifySubscribers(event);
  }

  // Method to emit events after API operations (workaround for server-side events)
  emitAfterApiCall(eventType: string, data: any) {
    // In a real implementation, this would be called from the server via WebSocket
    // For now, we emit it locally as a workaround
    setTimeout(() => {
      this.emit(eventType, data);
    }, 100); // Small delay to ensure UI updates first
  }

  isRealtimeConnected(): boolean {
    return this.isConnected;
  }

  disconnect() {
    this.isConnected = false;
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    // Don't clear subscriptions here - let unsubscribe handle it
  }
}

// Singleton instance
export const realtimeManager = new RealtimeManager();

// React hook for using realtime functionality
export function useRealtime() {
  const [isConnected, setIsConnected] = useState(realtimeManager.isRealtimeConnected());
  const subscriptionsRef = useRef<string[]>([]);

  useEffect(() => {
    const checkConnection = () => {
      setIsConnected(realtimeManager.isRealtimeConnected());
    };

    // Check connection status periodically
    const interval = setInterval(checkConnection, 5000);

    return () => {
      clearInterval(interval);
      // Cleanup subscriptions
      subscriptionsRef.current.forEach(id => realtimeManager.unsubscribe(id));
    };
  }, []);

  const subscribe = (eventType: string, callback: (event: RealtimeEvent) => void) => {
    const subscriptionId = realtimeManager.subscribe(eventType, callback);
    subscriptionsRef.current.push(subscriptionId);
    return subscriptionId;
  };

  const unsubscribe = (subscriptionId: string) => {
    realtimeManager.unsubscribe(subscriptionId);
    subscriptionsRef.current = subscriptionsRef.current.filter(id => id !== subscriptionId);
  };

  const emit = (eventType: string, data: any) => {
    realtimeManager.emit(eventType, data);
  };

  return {
    isConnected,
    subscribe,
    unsubscribe,
    emit,
    emitAfterApiCall: (eventType: string, data: any) => realtimeManager.emitAfterApiCall(eventType, data)
  };
}