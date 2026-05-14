'use client';

import { useEffect, useCallback } from 'react';
import { useWebSocket } from '../useWebSocket';

/**
 * Hook for orders page WebSocket integration
 * Handles real-time order updates
 */
export function useOrdersWebSocket(onDataChange: () => void, isAdmin: boolean = false) {
  const { connectionStatus, isConnected, subscribe, on, off } = useWebSocket();

  const handleOrderCreated = useCallback((data: any) => {
    console.log('📡 Order created:', data);
    onDataChange();
  }, [onDataChange]);

  const handleOrderStatusUpdated = useCallback((data: any) => {
    console.log('📡 Order status updated:', data);
    onDataChange();
  }, [onDataChange]);

  useEffect(() => {
    if (isConnected) {
      // Admin subscribes to orders room, customers get user-specific events
      if (isAdmin) {
        subscribe('orders');
      }

      on('ORDER_CREATED', handleOrderCreated);
      on('ORDER_STATUS_UPDATED', handleOrderStatusUpdated);

      return () => {
        off('ORDER_CREATED', handleOrderCreated);
        off('ORDER_STATUS_UPDATED', handleOrderStatusUpdated);
      };
    }
  }, [isConnected, isAdmin, subscribe, on, off, handleOrderCreated, handleOrderStatusUpdated]);

  return { connectionStatus, isConnected };
}
