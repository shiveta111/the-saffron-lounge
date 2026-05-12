'use client';

import { useConnectionStatus } from '@/lib/useWebSocket';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

/**
 * Connection Status Indicator Component
 * Shows real-time WebSocket connection status
 */
export function ConnectionStatus() {
  const status = useConnectionStatus();

  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          icon: Wifi,
          text: 'Connected',
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          show: false, // Don't show when connected
        };
      case 'connecting':
        return {
          icon: RefreshCw,
          text: 'Connecting...',
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          show: true,
          animate: true,
        };
      case 'reconnecting':
        return {
          icon: RefreshCw,
          text: 'Reconnecting...',
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
          show: true,
          animate: true,
        };
      case 'disconnected':
        return {
          icon: WifiOff,
          text: 'Disconnected',
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          show: true,
        };
      case 'error':
        return {
          icon: WifiOff,
          text: 'Connection Error',
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          show: true,
        };
      case 'failed':
        return {
          icon: WifiOff,
          text: 'Connection Failed',
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          show: true,
        };
      default:
        return {
          icon: WifiOff,
          text: 'Unknown',
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          show: true,
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  if (!config.show) {
    return null;
  }

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg ${config.bgColor} ${config.color} transition-all duration-300`}
    >
      <Icon
        className={`w-4 h-4 ${config.animate ? 'animate-spin' : ''}`}
      />
      <span className="text-sm font-medium">{config.text}</span>
    </div>
  );
}

/**
 * Compact Connection Status Badge
 * For use in navigation bars or headers
 */
export function ConnectionStatusBadge() {
  const status = useConnectionStatus();

  const getStatusColor = () => {
    switch (status) {
      case 'connected':
        return 'bg-green-500';
      case 'connecting':
      case 'reconnecting':
        return 'bg-yellow-500 animate-pulse';
      case 'disconnected':
      case 'error':
      case 'failed':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
      <span className="text-xs text-gray-600 capitalize">{status}</span>
    </div>
  );
}
