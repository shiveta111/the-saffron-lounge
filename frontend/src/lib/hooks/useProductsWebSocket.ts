'use client';

import { useEffect, useCallback } from 'react';
import { useWebSocketRoom } from '../useWebSocket';

/**
 * Hook for products/shop page WebSocket integration
 * Handles real-time product updates
 */
export function useProductsWebSocket(onDataChange: () => void) {
  const handleProductCreated = useCallback((data: any) => {
    console.log('📡 Product created:', data);
    onDataChange();
  }, [onDataChange]);

  const handleProductUpdated = useCallback((data: any) => {
    console.log('📡 Product updated:', data);
    onDataChange();
  }, [onDataChange]);

  const handleProductDeleted = useCallback((data: any) => {
    console.log('📡 Product deleted:', data);
    onDataChange();
  }, [onDataChange]);

  const { connectionStatus, isConnected } = useWebSocketRoom('products', {
    'PRODUCT_CREATED': handleProductCreated,
    'PRODUCT_UPDATED': handleProductUpdated,
    'PRODUCT_DELETED': handleProductDeleted,
  });

  return { connectionStatus, isConnected };
}
