'use client';

import { useRouter } from 'next/navigation';
import { ShoppingBag, ArrowRight, Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from './EmptyState';
import { cn } from '@/lib/utils';
import type { Order, OrderStatus } from '@/lib/types';

interface RecentOrdersProps {
  orders: Order[];
  loading?: boolean;
  onViewAll: () => void;
}

export function RecentOrders({ orders, loading = false, onViewAll }: RecentOrdersProps) {
  const router = useRouter();

  const getStatusColor = (status: OrderStatus) => {
    const colors = {
      PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      PREPARING: 'bg-blue-100 text-blue-800 border-blue-200',
      READY: 'bg-green-100 text-green-800 border-green-200',
      DELIVERED: 'bg-gray-100 text-gray-800 border-gray-200',
      CANCELLED: 'bg-red-100 text-red-800 border-red-200',
    };
    return colors[status] || colors.PENDING;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <ShoppingBag className="h-5 w-5" />
            <span>Recent Orders</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-6 w-20" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (orders.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <ShoppingBag className="h-5 w-5" />
            <span>Recent Orders</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={Package}
            title="No orders yet"
            description="You haven't placed any orders. Browse our menu to get started!"
            actionLabel="Browse Menu"
            onAction={() => router.push('/menu/restaurant')}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center space-x-2">
          <ShoppingBag className="h-5 w-5" />
          <span>Recent Orders</span>
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={onViewAll}
          className="text-primary hover:text-primary/80"
        >
          View All
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {orders.slice(0, 3).map((order) => (
          <div
            key={order.id}
            onClick={() => router.push(`/orders/${order.id}`)}
            className="flex items-center justify-between p-4 border rounded-lg hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer"
          >
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <p className="font-semibold text-gray-900">Order #{order.id}</p>
                <Badge variant="outline" className={cn('text-xs', getStatusColor(order.status))}>
                  {order.status}
                </Badge>
              </div>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <span>{formatDate(order.createdAt)}</span>
                <span>•</span>
                <span>{order.items.length} item{order.items.length !== 1 ? 's' : ''}</span>
              </div>
            </div>
            <div className="text-right">
              <p className="font-bold text-gray-900">{formatCurrency(order.total)}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
