'use client';

import { useEffect, useCallback } from 'react';
import { useWebSocketRoom } from '../useWebSocket';

/**
 * Hook for admin pages WebSocket integration
 * Handles real-time updates for all admin modules
 */
export function useAdminWebSocket(
  module: 'categories' | 'customers' | 'reservations' | 'tables' | 'delivery-zones' | 'promotions',
  onDataChange: () => void
) {
  const getEventHandlers = () => {
    switch (module) {
      case 'categories':
        return {
          'CATEGORY_CREATED': (data: any) => {
            console.log('📡 Category created:', data);
            onDataChange();
          },
          'CATEGORY_UPDATED': (data: any) => {
            console.log('📡 Category updated:', data);
            onDataChange();
          },
          'CATEGORY_DELETED': (data: any) => {
            console.log('📡 Category deleted:', data);
            onDataChange();
          },
        };
      case 'customers':
        return {
          'CUSTOMER_UPDATED': (data: any) => {
            console.log('📡 Customer updated:', data);
            onDataChange();
          },
          'CUSTOMER_STATUS_UPDATED': (data: any) => {
            console.log('📡 Customer status updated:', data);
            onDataChange();
          },
        };
      case 'reservations':
        return {
          'RESERVATION_CREATED': (data: any) => {
            console.log('📡 Reservation created:', data);
            onDataChange();
          },
          'RESERVATION_STATUS_UPDATED': (data: any) => {
            console.log('📡 Reservation status updated:', data);
            onDataChange();
          },
          'RESERVATION_TABLE_ASSIGNED': (data: any) => {
            console.log('📡 Reservation table assigned:', data);
            onDataChange();
          },
          'RESERVATION_CONFIRMED': (data: any) => {
            console.log('📡 Reservation confirmed:', data);
            onDataChange();
          },
          'RESERVATION_REJECTED': (data: any) => {
            console.log('📡 Reservation rejected:', data);
            onDataChange();
          },
          'RESERVATION_CANCELLED': (data: any) => {
            console.log('📡 Reservation cancelled:', data);
            onDataChange();
          },
          'RESERVATION_DELETED': (data: any) => {
            console.log('📡 Reservation deleted:', data);
            onDataChange();
          },
        };
      case 'tables':
        return {
          'TABLE_CREATED': (data: any) => {
            console.log('📡 Table created:', data);
            onDataChange();
          },
          'TABLE_UPDATED': (data: any) => {
            console.log('📡 Table updated:', data);
            onDataChange();
          },
          'TABLE_DELETED': (data: any) => {
            console.log('📡 Table deleted:', data);
            onDataChange();
          },
          'TABLE_QR_UPDATED': (data: any) => {
            console.log('📡 Table QR updated:', data);
            onDataChange();
          },
        };
      case 'delivery-zones':
        return {
          'ZONE_CREATED': (data: any) => {
            console.log('📡 Zone created:', data);
            onDataChange();
          },
          'ZONE_UPDATED': (data: any) => {
            console.log('📡 Zone updated:', data);
            onDataChange();
          },
          'ZONE_DELETED': (data: any) => {
            console.log('📡 Zone deleted:', data);
            onDataChange();
          },
        };
      case 'promotions':
        return {
          'PROMOTION_CREATED': (data: any) => {
            console.log('📡 Promotion created:', data);
            onDataChange();
          },
          'PROMOTION_UPDATED': (data: any) => {
            console.log('📡 Promotion updated:', data);
            onDataChange();
          },
          'PROMOTION_DELETED': (data: any) => {
            console.log('📡 Promotion deleted:', data);
            onDataChange();
          },
        };
      default:
        return {};
    }
  };

  const { connectionStatus, isConnected } = useWebSocketRoom(module, getEventHandlers() as Record<string, (data: any) => void>);

  return { connectionStatus, isConnected };
}
