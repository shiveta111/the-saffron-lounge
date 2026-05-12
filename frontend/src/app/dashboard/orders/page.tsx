'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Package, ArrowLeft, Filter, ChevronDown, ChevronUp, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '../components/EmptyState';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api-client';
import { useWebSocket } from '@/lib/hooks/useWebSocket';
import { toast } from 'sonner';
import type { Order, OrderStatus } from '@/lib/types';

export default function OrdersPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { on, off } = useWebSocket();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | OrderStatus>('all');
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  // WebSocket listener for order status updates
  useEffect(() => {
    const handleOrderStatusUpdate = (data: { orderId: number; status: OrderStatus; order?: Order }) => {
      console.log('[WebSocket] Order status updated:', data);
      
      setOrders((prevOrders) => {
        const updatedOrders = prevOrders.map((order) => {
          if (order.id === data.orderId) {
            return {
              ...order,
              status: data.status,
              ...(data.order && data.order),
            };
          }
          return order;
        });
        return updatedOrders;
      });

      toast.success('Order status updated', {
        description: `Order #${data.orderId} is now ${data.status.toLowerCase()}`,
      });
    };

    const handleOrderCreated = (data: { order: Order }) => {
      console.log('[WebSocket] New order created:', data);
      
      setOrders((prevOrders) => [data.order, ...prevOrders]);
      
      toast.success('New order placed', {
        description: `Order #${data.order.id} has been created`,
      });
    };

    // Subscribe to WebSocket events
    on('ORDER_STATUS_UPDATED', handleOrderStatusUpdate);
    on('ORDER_CREATED', handleOrderCreated);

    // Cleanup on unmount
    return () => {
      off('ORDER_STATUS_UPDATED', handleOrderStatusUpdate);
      off('ORDER_CREATED', handleOrderCreated);
    };
  }, [on, off]);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      
      // Fetch real orders from API
      const response = await apiClient.getOrders({ limit: 100 });
      
      if (response.success && response.data?.orders) {
        setOrders(response.data.orders);
      } else {
        setOrders([]);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      toast.error('Failed to load orders', {
        description: 'Please try refreshing the page',
      });
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleOrderDetails = useCallback((orderId: number) => {
    setExpandedOrderId((prev) => (prev === orderId ? null : orderId));
  }, []);

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

  const getStatusIcon = (status: OrderStatus) => {
    const icons = {
      PENDING: <Clock className="h-4 w-4" />,
      PREPARING: <AlertCircle className="h-4 w-4" />,
      READY: <CheckCircle className="h-4 w-4" />,
      DELIVERED: <CheckCircle className="h-4 w-4" />,
      CANCELLED: <XCircle className="h-4 w-4" />,
    };
    return icons[status] || icons.PENDING;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const filteredOrders = filter === 'all' 
    ? orders 
    : orders.filter(order => order.status === filter);

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <Skeleton className="h-10 w-48" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/dashboard')}
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Order History</h1>
          <p className="text-gray-600 mt-2">View and track all your orders</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2 overflow-x-auto">
            <Filter className="h-5 w-5 text-gray-500 flex-shrink-0" />
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              All Orders
            </Button>
            <Button
              variant={filter === 'PENDING' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('PENDING')}
            >
              Pending
            </Button>
            <Button
              variant={filter === 'PREPARING' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('PREPARING')}
            >
              Preparing
            </Button>
            <Button
              variant={filter === 'DELIVERED' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('DELIVERED')}
            >
              Delivered
            </Button>
            <Button
              variant={filter === 'CANCELLED' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('CANCELLED')}
            >
              Cancelled
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No orders found"
          description={filter === 'all' ? "You haven't placed any orders yet." : `No ${filter.toLowerCase()} orders found.`}
          actionLabel="Browse Menu"
          onAction={() => router.push('/menu/restaurant')}
        />
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const isExpanded = expandedOrderId === order.id;
            
            return (
              <Card key={order.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="cursor-pointer" onClick={() => toggleOrderDetails(order.id)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <CardTitle className="text-lg">Order #{order.id}</CardTitle>
                      <Badge 
                        variant="outline" 
                        className={cn('text-xs flex items-center gap-1', getStatusColor(order.status))}
                      >
                        {getStatusIcon(order.status)}
                        {order.status}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-lg font-bold text-gray-900">
                        {formatCurrency(order.total)}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-gray-500" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-500" />
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">{formatDate(order.createdAt)}</p>
                </CardHeader>
                
                {isExpanded && (
                  <CardContent>
                    <div className="space-y-4">
                      {/* Order Items */}
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 mb-2">Order Items</h4>
                        <div className="space-y-2">
                          {order.items.map((item: any) => {
                            // Handle both products and menu items
                            const isMenuItem = !!item.menuId && !!item.menu;
                            const itemName = isMenuItem 
                              ? (item.menu?.name || 'Combo Pack')
                              : (item.product?.name || 'Item');
                            
                            return (
                              <div key={item.id} className="flex justify-between items-start text-sm bg-gray-50 p-3 rounded-md">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <p className="text-gray-900 font-medium">
                                      {itemName}
                                    </p>
                                    {isMenuItem && (
                                      <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                                        Combo
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-gray-600 text-xs">
                                    Quantity: {item.quantity} × {formatCurrency(item.price)}
                                  </p>
                                  {item.specialRequests && (
                                    <p className="text-gray-600 text-xs mt-1">
                                      <span className="font-medium">Special requests:</span> {item.specialRequests}
                                    </p>
                                  )}
                                </div>
                                <span className="text-gray-900 font-semibold">
                                  {formatCurrency(item.price * item.quantity)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Order Details */}
                      <div className="pt-3 border-t">
                        <h4 className="text-sm font-semibold text-gray-900 mb-2">Order Details</h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Order ID:</span>
                            <span className="text-gray-900 font-medium">#{order.id}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Status:</span>
                            <Badge 
                              variant="outline" 
                              className={cn('text-xs flex items-center gap-1', getStatusColor(order.status))}
                            >
                              {getStatusIcon(order.status)}
                              {order.status}
                            </Badge>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Order Date:</span>
                            <span className="text-gray-900">{formatDate(order.createdAt)}</span>
                          </div>
                          {order.payment && (
                            <>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Payment Method:</span>
                                <span className="text-gray-900">{order.payment.method}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Payment Status:</span>
                                <Badge 
                                  variant="outline" 
                                  className={cn(
                                    'text-xs',
                                    order.payment.status === 'COMPLETED' && 'bg-green-100 text-green-800 border-green-200',
                                    order.payment.status === 'PENDING' && 'bg-yellow-100 text-yellow-800 border-yellow-200',
                                    order.payment.status === 'FAILED' && 'bg-red-100 text-red-800 border-red-200'
                                  )}
                                >
                                  {order.payment.status}
                                </Badge>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Notes */}
                      {order.notes && (
                        <div className="pt-3 border-t">
                          <h4 className="text-sm font-semibold text-gray-900 mb-1">Notes</h4>
                          <p className="text-sm text-gray-600">{order.notes}</p>
                        </div>
                      )}

                      {/* Total */}
                      <div className="pt-3 border-t flex justify-between items-center">
                        <span className="text-base font-semibold text-gray-900">Total Amount</span>
                        <span className="text-xl font-bold text-gray-900">
                          {formatCurrency(order.total)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
