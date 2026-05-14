import { useEffect, useState, useCallback, useRef } from 'react';
import { wsManager, ConnectionStatus } from './websocket';
import { useAuthStore } from './stores/auth-store';

/**
 * React hook for WebSocket connection and event handling
 */
export function useWebSocket() {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const isInitialized = useRef(false);
  const { user } = useAuthStore();

  useEffect(() => {
    // Only initialize once
    if (isInitialized.current) return;
    isInitialized.current = true;

    // Setup connection status listener
    wsManager.onConnectionStatusChange(setConnectionStatus);

    // Connect if not already connected
    if (!wsManager.isConnected()) {
      // Use user from auth store
      if (user?.id && user?.role) {
        console.log(`🔐 Connecting WebSocket with user: ${user.id}, role: ${user.role}`);
        wsManager.connect(user.id, user.role);
      } else {
        console.log('⚠️ Connecting WebSocket without authentication (guest mode)');
        wsManager.connect();
      }

      // Start heartbeat
      wsManager.startHeartbeat();
    }

    return () => {
      wsManager.offConnectionStatusChange(setConnectionStatus);
    };
  }, [user?.id, user?.role]);

  const subscribe = useCallback((room: string) => {
    wsManager.subscribe(room);
  }, []);

  const on = useCallback((event: string, callback: (data: any) => void) => {
    wsManager.on(event, callback);
  }, []);

  const off = useCallback((event: string, callback: (data: any) => void) => {
    wsManager.off(event, callback);
  }, []);

  const emit = useCallback((event: string, data: any) => {
    wsManager.emit(event, data);
  }, []);

  return {
    connectionStatus,
    isConnected: connectionStatus === 'connected',
    subscribe,
    on,
    off,
    emit,
  };
}

/**
 * Hook for subscribing to a specific room and handling events
 */
export function useWebSocketRoom(room: string, events: Record<string, (data: any) => void>) {
  const { connectionStatus, subscribe, on, off } = useWebSocket();
  const eventsRef = useRef(events);

  // Update events ref when events change
  useEffect(() => {
    eventsRef.current = events;
  }, [events]);

  useEffect(() => {
    if (connectionStatus === 'connected') {
      // Subscribe to room
      subscribe(room);

      // Setup event listeners
      Object.entries(eventsRef.current).forEach(([event, handler]) => {
        on(event, handler);
      });

      // Cleanup
      return () => {
        Object.entries(eventsRef.current).forEach(([event, handler]) => {
          off(event, handler);
        });
      };
    }
  }, [connectionStatus, room, subscribe, on, off]);

  return { connectionStatus, isConnected: connectionStatus === 'connected' };
}

/**
 * Hook for connection status indicator
 */
export function useConnectionStatus() {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');

  useEffect(() => {
    wsManager.onConnectionStatusChange(setStatus);
    setStatus(wsManager.getConnectionStatus());

    return () => {
      wsManager.offConnectionStatusChange(setStatus);
    };
  }, []);

  return status;
}
