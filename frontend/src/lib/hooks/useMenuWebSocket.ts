'use client';

import { useEffect, useCallback } from 'react';
import { useWebSocketRoom } from '../useWebSocket';

/**
 * Hook for menu page WebSocket integration
 * Handles real-time menu updates
 */
export function useMenuWebSocket(onDataChange: () => void) {
  const handleMenuCreated = useCallback((data: any) => {
    console.log('📡 Menu created:', data);
    onDataChange();
  }, [onDataChange]);

  const handleMenuUpdated = useCallback((data: any) => {
    console.log('📡 Menu updated:', data);
    onDataChange();
  }, [onDataChange]);

  const handleMenuDeleted = useCallback((data: any) => {
    console.log('📡 Menu deleted:', data);
    onDataChange();
  }, [onDataChange]);

  const { connectionStatus, isConnected } = useWebSocketRoom('menu', {
    'MENU_CREATED': handleMenuCreated,
    'MENU_UPDATED': handleMenuUpdated,
    'MENU_DELETED': handleMenuDeleted,
  });

  return { connectionStatus, isConnected };
}
