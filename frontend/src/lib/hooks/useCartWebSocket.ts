'use client';

import { useEffect, useCallback } from 'react';
import { useWebSocket } from '../useWebSocket';

/**
 * Hook for cart page WebSocket integration
 * Handles real-time cart updates (user-specific)
 */
export function useCartWebSocket(onDataChange: () => void) {
  const { connectionStatus, isConnected, on, off } = useWebSocket();

  const handleCartUpdated = useCallback((data: any) => {
    console.log('📡 Cart updated:', data);
    onDataChange();
  }, [onDataChange]);

  const handleCartCleared = useCallback((data: any) => {
    console.log('📡 Cart cleared:', data);
    onDataChange();
  }, [onDataChange]);

  useEffect(() => {
    if (isConnected) {
      // Cart events are user-specific, no need to subscribe to a room
      on('CART_UPDATED', handleCartUpdated);
      on('CART_CLEARED', handleCartCleared);

      return () => {
        off('CART_UPDATED', handleCartUpdated);
        off('CART_CLEARED', handleCartCleared);
      };
    }
  }, [isConnected, on, off, handleCartUpdated, handleCartCleared]);

  return { connectionStatus, isConnected };
}
