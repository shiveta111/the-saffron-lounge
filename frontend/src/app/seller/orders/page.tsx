'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '../../../lib/api-client';
import { Order, OrderStatus } from '../../../lib/types';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../../components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Input } from '../../../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { Calendar } from '../../../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../../../components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon, Search, Filter, MoreHorizontal, Eye, Truck, CheckCircle, XCircle, Clock, DollarSign, Package, User, Phone, CreditCard, Receipt, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

export default function SellerOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [updatingStatus, setUpdatingStatus] = useState<number | null>(null);

  const statusOptions = [
    { value: 'PENDING', label: 'Pending', icon: Package, color: 'bg-blue-100 text-blue-800' },
    { value: 'PREPARING', label: 'Preparing', icon: Clock, color: 'bg-yellow-100 text-yellow-800' },
    { value: 'READY', label: 'Ready', icon: CheckCircle, color: 'bg-green-100 text-green-800' },
    { value: 'DELIVERED', label: 'Delivered', icon: Truck, color: 'bg-purple-100 text-purple-800' },
    { value: 'CANCELLED', label: 'Cancelled', icon: XCircle, color: 'bg-red-100 text-red-800' },
  ];

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params: any = {};

      if (searchTerm) params.search = searchTerm;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (dateRange.from) params.startDate = format(dateRange.from, 'yyyy-MM-dd');
      if (dateRange.to) params.endDate = format(dateRange.to, 'yyyy-MM-dd');

      const response = await apiClient.getOrders(params);
      if (response.success) {
        setOrders(response.data?.data || []);
      }
    } catch (error: any) {
      console.error('Failed to load orders:', error);
      toast.error(error?.response?.data?.message || error?.message || 'Failed to load orders');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [searchTerm, statusFilter, dateRange]);

  const handleStatusUpdate = async (orderId: number, newStatus: OrderStatus) => {
    try {
      setUpdatingStatus(orderId);
      const response = await apiClient.updateOrderStatus(orderId, { status: newStatus });

      if (response.success) {
        toast.success(`Order status updated to ${newStatus}`);
        // Update local state
        setOrders(orders.map(order =>
          order.id === orderId ? { ...order, status: newStatus } : order
        ));
        // Update selected order if it's open
        if (selectedOrder?.id === orderId) {
          setSelectedOrder({ ...selectedOrder, status: newStatus });
        }
      }
    } catch (error: any) {
      console.error('Status update error:', error);
      toast.error(error?.response?.data?.message || error?.message || 'Failed to update order status');
    } finally {
      setUpdatingStatus(null);
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-EU', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-900">Order Management</h2>
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
            <div className="text-2xl font-bold">{formatCurrency(getTotalRevenue())}</div>
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
            <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
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
              <Input
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
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
                <TableHead>Total</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-[70px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Loading orders...
                  </TableCell>
                </TableRow>
              ) : orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    No orders found
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">#{order.id}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{order.customer?.name || 'N/A'}</div>
                        <div className="text-sm text-gray-500">{order.customer?.email || 'N/A'}</div>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell>{formatCurrency(order.total)}</TableCell>
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
                              Mark as Ready
                            </DropdownMenuItem>
                          )}
                          {order.status === 'READY' && (
                            <DropdownMenuItem
                              onClick={() => handleStatusUpdate(order.id, 'DELIVERED')}
                              disabled={updatingStatus === order.id}
                            >
                              <Truck className="mr-2 h-4 w-4" />
                              Mark as Delivered
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
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details">Order Details</TabsTrigger>
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
                    <div>Date: {new Date(selectedOrder.createdAt).toLocaleString()}</div>
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div>
                <h3 className="font-semibold mb-4">Order Items</h3>
                <div className="space-y-3">
                  {selectedOrder.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {(item.product as any)?.imageUrl && (
                          <img
                            src={(item.product as any).imageUrl}
                            alt={item.product?.name || 'Product'}
                            className="w-12 h-12 rounded-lg object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                          />
                        )}
                        <div>
                          <div className="font-medium">{item.product?.name || 'Unknown Item'}</div>
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
                  ))}
                </div>
              </div>

              {/* Order Summary */}
              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Total:</span>
                  <span className="text-xl font-bold">{formatCurrency(selectedOrder.total)}</span>
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
                          <p className="text-sm font-medium">Status Updated</p>
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