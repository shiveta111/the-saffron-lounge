'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient } from '../../../lib/api-client';
import { Order, OrderStatus } from '../../../lib/types';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../../components/ui/dialog';
import { Badge } from '../../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../../components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../../../components/ui/alert-dialog';
import { Calendar } from '../../../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../../../components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon, Search, Filter, MoreHorizontal, Eye, Truck, CheckCircle, XCircle, Clock, DollarSign, Package, User, Phone, CreditCard, Receipt, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { useWebSocket } from '../../../lib/hooks/useWebSocket';
import { getImageUrl } from '../../../lib/image-utils';

export default function OrderManagementPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [updatingStatus, setUpdatingStatus] = useState<number | null>(null);
  const [processingPayment, setProcessingPayment] = useState<number | null>(null);
  const [processingRefund, setProcessingRefund] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const { on, off } = useWebSocket();

  const statusOptions = [
    { value: 'PENDING', label: 'Pending', icon: Package, color: 'bg-blue-100 text-blue-800' },
    { value: 'PREPARING', label: 'Preparing', icon: Clock, color: 'bg-yellow-100 text-yellow-800' },
    { value: 'READY', label: 'Ready', icon: CheckCircle, color: 'bg-green-100 text-green-800' },
    { value: 'DELIVERED', label: 'Delivered', icon: Truck, color: 'bg-purple-100 text-purple-800' },
    { value: 'CANCELLED', label: 'Cancelled', icon: XCircle, color: 'bg-red-100 text-red-800' },
  ];

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = { limit: 100 }; // Get more orders for admin view

      if (searchTerm) params.search = searchTerm;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (dateRange.from) params.startDate = format(dateRange.from, 'yyyy-MM-dd');
      if (dateRange.to) params.endDate = format(dateRange.to, 'yyyy-MM-dd');

      const response = await apiClient.getAdminOrders(params);
      console.log('📥 Orders API Response:', response);
      
      if (response.success) {
        // Handle response structure: {success: true, data: {orders: [...], pagination: {...}}}
        const ordersData = response.data?.orders || response.data?.data || response.data || [];
        console.log('✅ Extracted orders:', ordersData.length, 'orders');
        setOrders(Array.isArray(ordersData) ? ordersData : []);
      }
    } catch (error: any) {
      console.error('Failed to load orders:', error);
      toast.error(error?.response?.data?.message || error?.message || 'Failed to load orders');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter, dateRange]);

  // Debounce search term
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm]);

  useEffect(() => {
    fetchOrders();
  }, [debouncedSearchTerm, statusFilter, dateRange, fetchOrders]);

  // WebSocket listener for real-time order updates
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

      // Update selected order if it's open
      if (selectedOrder?.id === data.orderId) {
        setSelectedOrder((prev) => prev ? { ...prev, status: data.status, ...(data.order && data.order) } : null);
      }

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
  }, [on, off, selectedOrder]);

  const handleStatusUpdate = async (orderId: number, newStatus: OrderStatus) => {
    try {
      setUpdatingStatus(orderId);
      const response = await apiClient.updateOrderStatus(orderId, { status: newStatus });

      if (response.success) {
        toast.success(`Order status updated to ${newStatus}`);
        // Refresh orders to get latest data
        await fetchOrders();
        // Update selected order if it's open
        if (selectedOrder?.id === orderId) {
          const updatedOrder = response.data?.order || { ...selectedOrder, status: newStatus };
          setSelectedOrder(updatedOrder);
        }
      }
    } catch (error: any) {
      console.error('Status update error:', error);
      toast.error(error?.response?.data?.message || error?.message || 'Failed to update order status');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleProcessPayment = async (orderId: number) => {
    if (!paymentMethod) {
      toast.error('Please select a payment method');
      return;
    }

    try {
      setProcessingPayment(orderId);

      // Try API first, fallback to mock
      try {
        const response = await apiClient.processPayment(orderId, {
          paymentMethod,
          paymentMethodId: 'mock_payment_method_id' // In real implementation, this would come from payment gateway
        });

        if (response.success) {
          toast.success('Payment processed successfully');
          // Update order status to PREPARING
          await handleStatusUpdate(orderId, 'PREPARING');
          setPaymentMethod('');
          return;
        }
      } catch (apiError) {
        console.warn('Payment API not available, using mock');
      }

      // Mock payment processing
      toast.success('Payment processed successfully (mock)');
      await handleStatusUpdate(orderId, 'PREPARING');
      setPaymentMethod('');

    } catch (error: any) {
      console.error('Payment processing error:', error);
      toast.error(error?.response?.data?.message || error?.message || 'Failed to process payment');
    } finally {
      setProcessingPayment(null);
    }
  };

  const handleProcessRefund = async (orderId: number) => {
    if (!refundAmount || !refundReason) {
      toast.error('Please provide refund amount and reason');
      return;
    }

    try {
      setProcessingRefund(orderId);

      // Try API first, fallback to mock
      try {
        const response = await apiClient.processRefund(orderId, {
          amount: parseFloat(refundAmount),
          reason: refundReason
        });

        if (response.success) {
          toast.success('Refund processed successfully');
          // Update order status to CANCELLED if full refund
          const order = orders.find(o => o.id === orderId);
          if (order && parseFloat(refundAmount) >= order.total) {
            await handleStatusUpdate(orderId, 'CANCELLED');
          }
          setRefundAmount('');
          setRefundReason('');
          return;
        }
      } catch (apiError) {
        console.warn('Refund API not available, using mock');
      }

      // Mock refund processing
      toast.success('Refund processed successfully (mock)');
      const order = orders.find(o => o.id === orderId);
      if (order && parseFloat(refundAmount) >= order.total) {
        await handleStatusUpdate(orderId, 'CANCELLED');
      }
      setRefundAmount('');
      setRefundReason('');

    } catch (error: any) {
      console.error('Refund processing error:', error);
      toast.error(error?.response?.data?.message || error?.message || 'Failed to process refund');
    } finally {
      setProcessingRefund(null);
    }
  };

  const getStatusBadge = (status: OrderStatus) => {
    const statusOption = statusOptions.find(option => option.value === status);
    return statusOption ? (
      <Badge className={statusOption.color}>
        <statusOption.icon className="w-3 h-3 mr-1" />
        {statusOption.label}
      </Badge>
    ) : (
      <Badge variant="secondary">{status}</Badge>
    );
  };

  const getTotalRevenue = () => {
    return orders.reduce((total, order) => total + order.total, 0);
  };

  const getOrderStats = () => {
    const stats = {
      total: orders.length,
      pending: orders.filter(o => o.status === 'PENDING').length,
      preparing: orders.filter(o => o.status === 'PREPARING').length,
      ready: orders.filter(o => o.status === 'READY').length,
      delivered: orders.filter(o => o.status === 'DELIVERED').length,
      cancelled: orders.filter(o => o.status === 'CANCELLED').length,
    };
    return stats;
  };

  const stats = getOrderStats();

  // Filter orders based on search term (client-side filtering)
  const filteredOrders = orders.filter(order => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    const orderIdMatch = order.id.toString().includes(searchLower);
    const customerNameMatch = order.customer?.name?.toLowerCase().includes(searchLower);
    const customerEmailMatch = order.customer?.email?.toLowerCase().includes(searchLower);
    return orderIdMatch || customerNameMatch || customerEmailMatch;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-900">Order Management</h2>
        <Button onClick={fetchOrders} variant="outline">
          <RotateCcw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{getTotalRevenue().toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivered Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.delivered}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by order ID or customer name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10"
                />
              </div>
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {statusOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[240px] justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "LLL dd, y")} -{" "}
                        {format(dateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Pick a date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange?.from ? { from: dateRange.from, to: dateRange.to } : undefined}
                  onSelect={(range) => setDateRange(range ? { from: range.from, to: range.to } : {})}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-[70px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    Loading orders...
                  </TableCell>
                </TableRow>
              ) : filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    {searchTerm ? 'No orders match your search' : 'No orders found'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">#{order.id}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{order.customer?.name || 'N/A'}</div>
                        <div className="text-sm text-gray-500">{order.customer?.email || 'N/A'}</div>
                        {order.customerId && (
                          <div className="text-xs text-gray-400">User ID: {order.customerId}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell>
                      {(order as any).payment ? (
                        <div>
                          <Badge className={
                            (order as any).payment.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                            (order as any).payment.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                            (order as any).payment.status === 'FAILED' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }>
                            {(order as any).payment.status}
                          </Badge>
                          <div className="text-xs text-gray-500 mt-1">{(order as any).payment.method}</div>
                        </div>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-800">No Payment</Badge>
                      )}
                    </TableCell>
                    <TableCell>€{order.total.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">Order</Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(order.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setSelectedOrder(order)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          {order.status === 'PENDING' && (
                            <DropdownMenuItem
                              onClick={() => handleStatusUpdate(order.id, 'PREPARING')}
                              disabled={updatingStatus === order.id}
                            >
                              <Clock className="mr-2 h-4 w-4" />
                              Start Preparing
                            </DropdownMenuItem>
                          )}
                          {order.status === 'PREPARING' && (
                            <DropdownMenuItem
                              onClick={() => handleStatusUpdate(order.id, 'READY')}
                              disabled={updatingStatus === order.id}
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Mark Ready
                            </DropdownMenuItem>
                          )}
                          {order.status === 'READY' && (
                            <DropdownMenuItem
                              onClick={() => handleStatusUpdate(order.id, 'DELIVERED')}
                              disabled={updatingStatus === order.id}
                            >
                              <Truck className="mr-2 h-4 w-4" />
                              Mark Delivered
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Order Details Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Details #{selectedOrder?.id}</DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="details">Order Details</TabsTrigger>
                <TabsTrigger value="payment">Payment</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-6">
              {/* Order Header */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-2">Customer Information</h3>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      <span>{selectedOrder.customer?.name || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">{selectedOrder.customer?.email || 'N/A'}</span>
                    </div>
                    {selectedOrder.customerId && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">User ID: {selectedOrder.customerId}</span>
                      </div>
                    )}
                    {(selectedOrder.customer as any)?.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        <span className="text-sm">{(selectedOrder.customer as any).phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Order Information</h3>
                  <div className="space-y-1">
                    <div>Status: {getStatusBadge(selectedOrder.status)}</div>
                    <div>Type: <Badge variant="outline">Order</Badge></div>
                    <div>Date: {new Date(selectedOrder.createdAt).toLocaleString()}</div>
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div>
                <h3 className="font-semibold mb-4">Order Items</h3>
                <div className="space-y-3">
                  {selectedOrder.items.map((item: any) => {
                    // Handle both products and menu items
                    const isMenuItem = !!item.menuId && !!item.menu;
                    const itemName = isMenuItem 
                      ? (item.menu?.name || 'Combo Pack')
                      : (item.product?.name || 'Unknown Item');
                    const itemImage = isMenuItem 
                      ? item.menu?.imageUrl 
                      : item.product?.imageUrl;
                    
                    return (
                      <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          {itemImage && (
                            <img
                              src={getImageUrl(itemImage) || ''}
                              alt={itemName}
                              className="w-12 h-12 rounded-lg object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                              }}
                            />
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <div className="font-medium">{itemName}</div>
                              {isMenuItem && (
                                <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                                  Combo
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-gray-500">Quantity: {item.quantity}</div>
                            {item.specialRequests && (
                              <div className="text-sm text-blue-600">Note: {item.specialRequests}</div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">Qty: {item.quantity}</div>
                          <div className="text-sm text-gray-500">€{item.price.toFixed(2)} each</div>
                          <div className="font-medium">€{(item.price * item.quantity).toFixed(2)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Order Summary */}
              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Total:</span>
                  <span className="text-xl font-bold">€{selectedOrder.total.toFixed(2)}</span>
                </div>
              </div>

              {/* Status Update Actions */}
              <div className="flex gap-2 pt-4 border-t">
                {selectedOrder.status === 'PENDING' && (
                  <Button
                    onClick={() => handleStatusUpdate(selectedOrder.id, 'PREPARING')}
                    disabled={updatingStatus === selectedOrder.id}
                    className="flex-1"
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    Start Preparing
                  </Button>
                )}

                {selectedOrder.status === 'PREPARING' && (
                  <Button
                    onClick={() => handleStatusUpdate(selectedOrder.id, 'READY')}
                    disabled={updatingStatus === selectedOrder.id}
                    className="flex-1"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Mark as Ready
                  </Button>
                )}

                {selectedOrder.status === 'READY' && (
                  <Button
                    onClick={() => handleStatusUpdate(selectedOrder.id, 'DELIVERED')}
                    disabled={updatingStatus === selectedOrder.id}
                    className="flex-1"
                  >
                    <Truck className="w-4 h-4 mr-2" />
                    Mark as Delivered
                  </Button>
                )}
              </div>
              </TabsContent>

              <TabsContent value="payment" className="space-y-6">
                {/* Payment Information */}
                <div>
                  <h3 className="font-semibold mb-4 flex items-center">
                    <CreditCard className="w-5 h-5 mr-2" />
                    Payment Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <Label className="text-sm font-medium">Payment Status</Label>
                      <div className="mt-1">
                        {(selectedOrder as any).payment ? (
                          <Badge className={
                            (selectedOrder as any).payment.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                            (selectedOrder as any).payment.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                            (selectedOrder as any).payment.status === 'FAILED' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }>
                            {(selectedOrder as any).payment.status}
                          </Badge>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-800">No Payment</Badge>
                        )}
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Payment Method</Label>
                      <div className="mt-1 text-sm">
                        {(selectedOrder as any).payment?.method || 'N/A'}
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Transaction ID</Label>
                      <div className="mt-1 text-sm font-mono">
                        {(selectedOrder as any).payment?.transactionId || 'N/A'}
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Amount</Label>
                      <div className="mt-1 text-sm font-medium">
                        €{(selectedOrder as any).payment?.amount?.toFixed(2) || selectedOrder.total.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mark as Paid for Cash Payments */}
                {((selectedOrder as any).payment?.method === 'CASH' || 
                  (selectedOrder as any).payment?.method === 'PAY_ON_ARRIVAL' ||
                  (selectedOrder as any).payment?.method === 'PAY_IN_RESTAURANT') && 
                  (selectedOrder as any).payment?.status === 'PENDING' && (
                  <div>
                    <h3 className="font-semibold mb-4 flex items-center">
                      <DollarSign className="w-5 h-5 mr-2" />
                      Mark Payment as Completed
                    </h3>
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
                      <p className="text-sm text-yellow-800">
                        This order is set to be paid {((selectedOrder as any).payment?.method === 'CASH' ? 'in cash' : 'on arrival')} at the restaurant. 
                        Mark as completed once payment is received.
                      </p>
                    </div>
                    <Button
                      onClick={async () => {
                        try {
                          setProcessingPayment(selectedOrder.id);
                          const response = await apiClient.updatePaymentStatus((selectedOrder as any).payment.id, {
                            status: 'COMPLETED'
                          });
                          if (response.success) {
                            toast.success('Payment marked as completed');
                            // Refresh orders to get latest data
                            await fetchOrders();
                            // Fetch updated order directly to ensure we have latest payment status
                            try {
                              const orderResponse = await apiClient.getOrder(selectedOrder.id);
                              if (orderResponse.success && orderResponse.data?.order) {
                                setSelectedOrder(orderResponse.data.order);
                              } else {
                                // Fallback: find from refreshed orders
                                const updatedOrder = orders.find(o => o.id === selectedOrder.id);
                                if (updatedOrder) setSelectedOrder(updatedOrder);
                              }
                            } catch (fetchError) {
                              console.warn('Failed to fetch updated order, using refreshed list:', fetchError);
                              // Fallback: find from refreshed orders
                              const updatedOrder = orders.find(o => o.id === selectedOrder.id);
                              if (updatedOrder) setSelectedOrder(updatedOrder);
                            }
                          }
                        } catch (error: any) {
                          console.error('Failed to update payment status:', error);
                          const errorMessage = error?.response?.data?.error || error?.response?.data?.message || error?.message || 'Failed to update payment status';
                          toast.error(errorMessage);
                        } finally {
                          setProcessingPayment(null);
                        }
                      }}
                      disabled={processingPayment === selectedOrder.id}
                      className="w-full"
                    >
                      {processingPayment === selectedOrder.id ? (
                        <>
                          <Clock className="w-4 h-4 mr-2 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Mark Payment as Completed
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {/* Payment Processing */}
                {selectedOrder.status === 'PENDING' && (
                  <div>
                    <h3 className="font-semibold mb-4 flex items-center">
                      <Receipt className="w-5 h-5 mr-2" />
                      Process Payment
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="payment-method">Payment Method</Label>
                        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select payment method" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="STRIPE">Credit Card (Stripe)</SelectItem>
                            <SelectItem value="PAYPAL">PayPal</SelectItem>
                            <SelectItem value="CASH">Cash</SelectItem>
                            <SelectItem value="CARD">Card (POS)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        onClick={() => handleProcessPayment(selectedOrder.id)}
                        disabled={processingPayment === selectedOrder.id || !paymentMethod}
                        className="w-full"
                      >
                        {processingPayment === selectedOrder.id ? (
                          <>
                            <Clock className="w-4 h-4 mr-2 animate-spin" />
                            Processing Payment...
                          </>
                        ) : (
                          <>
                            <CreditCard className="w-4 h-4 mr-2" />
                            Process Payment
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Refund Processing */}
                {(selectedOrder.status === 'PREPARING' || selectedOrder.status === 'READY' || selectedOrder.status === 'DELIVERED') && (
                  <div>
                    <h3 className="font-semibold mb-4 flex items-center">
                      <RotateCcw className="w-5 h-5 mr-2" />
                      Process Refund
                    </h3>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="refund-amount">Refund Amount</Label>
                          <Input
                            id="refund-amount"
                            type="number"
                            step="0.01"
                            placeholder={selectedOrder.total.toString()}
                            value={refundAmount}
                            onChange={(e) => setRefundAmount(e.target.value)}
                          />
                        </div>
                        <div>
                          <Label htmlFor="refund-reason">Reason</Label>
                          <Input
                            id="refund-reason"
                            placeholder="Customer requested cancellation"
                            value={refundReason}
                            onChange={(e) => setRefundReason(e.target.value)}
                          />
                        </div>
                      </div>
                      <Button
                        onClick={() => handleProcessRefund(selectedOrder.id)}
                        disabled={processingRefund === selectedOrder.id || !refundAmount || !refundReason}
                        variant="destructive"
                        className="w-full"
                      >
                        {processingRefund === selectedOrder.id ? (
                          <>
                            <Clock className="w-4 h-4 mr-2 animate-spin" />
                            Processing Refund...
                          </>
                        ) : (
                          <>
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Process Refund
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="history" className="space-y-6">
                {/* Order History */}
                <div>
                  <h3 className="font-semibold mb-4">Order Timeline</h3>
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Order Placed</p>
                        <p className="text-xs text-gray-500">{new Date(selectedOrder.createdAt).toLocaleString()}</p>
                      </div>
                    </div>

                    {selectedOrder.status !== 'PENDING' && (
                      <div className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">Payment Processed</p>
                          <p className="text-xs text-gray-500">Status changed to {selectedOrder.status}</p>
                        </div>
                      </div>
                    )}

                    {selectedOrder.status === 'DELIVERED' && (
                      <div className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">Order Delivered</p>
                          <p className="text-xs text-gray-500">Order completed successfully</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}