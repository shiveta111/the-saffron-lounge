import { useEffect, useRef, useCallback } from 'react';
import { websocketService } from '../websocket';
import { useAuth } from '../auth-context';

export function useWebSocket() {
  const { user } = useAuth();
  const isConnectedRef = useRef(false);

  useEffect(() => {
    // Connect when component mounts
    if (user && !isConnectedRef.current) {
      websocketService.connect(user.id);
      isConnectedRef.current = true;
    }

    // Cleanup on unmount
    return () => {
      // Don't disconnect on unmount as other components might be using it
      // The service will handle reconnection automatically
    };
  }, [user]);

  const on = useCallback((event: string, callback: (...args: any[]) => void) => {
    websocketService.on(event, callback);
  }, []);

  const off = useCallback((event: string, callback?: (...args: any[]) => void) => {
    if (callback) {
      websocketService.off(event, callback);
    }
  }, []);

  const emit = useCallback((event: string, data?: any) => {
    websocketService.emit(event, data);
  }, []);

  const isConnected = useCallback(() => {
    return websocketService.isConnected();
  }, []);

  return {
    on,
    off,
    emit,
    isConnected,
  };
}
