'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '../../../lib/api-client';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Badge } from '../../../components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../../../components/ui/dialog';
import { Label } from '../../../components/ui/label';
import { Switch } from '../../../components/ui/switch';
import { format } from 'date-fns';
import { Search, Filter, Users, ShoppingBag, TrendingUp, Info, Eye, Edit, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import dynamic from 'next/dynamic';
import { io, Socket } from 'socket.io-client';
import { env } from '@/lib/env';

interface CustomerWithOrders {
  id: number;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string;
  orderCount: number;
  totalQuantity: number;
  lastOrderDate?: string;
}

interface CustomerDetail extends CustomerWithOrders {
  phone?: string;
  address?: string;
  loyaltyPoints?: number;
  orders?: any[];
  reservations?: any[];
  statistics?: {
    totalOrders: number;
    totalSpent: number;
  };
}

const CustomerManagementPage = dynamic(() => Promise.resolve(function CustomerManagementPage() {
  const [customers, setCustomers] = useState<CustomerWithOrders[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [orderBehaviorFilter, setOrderBehaviorFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<string>('desc');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCustomers, setTotalCustomers] = useState(0);
  
  // Customer detail dialog state
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDetail | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    address: '',
    emailVerified: false,
  });
  const [socket, setSocket] = useState<Socket | null>(null);

  // Initialize WebSocket connection
  useEffect(() => {
    // Extract base URL from apiUrl (remove /api/v1)
    const socketUrl = env.apiUrl.split('/api/v1')[0];
    const socketInstance = io(socketUrl, {
      path: '/socket.io',
      transports: ['websocket'],
      reconnection: true,
    });

    socketInstance.on('connect', () => {
      console.log('WebSocket connected');
      // Subscribe to customer updates
      socketInstance.emit('subscribe:customers');
    });

    socketInstance.on('CUSTOMER_UPDATED', (data: any) => {
      console.log('Customer updated:', data);
      toast.success('Customer updated');
      fetchCustomers();
    });

    socketInstance.on('CUSTOMER_STATUS_UPDATED', (data: any) => {
      console.log('Customer status updated:', data);
      toast.success(`Customer ${data.isActive ? 'activated' : 'deactivated'}`);
      fetchCustomers();
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const params: any = {
        page,
        limit: 10,
        sortBy,
        sortOrder,
      };

      if (searchTerm) params.search = searchTerm;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (orderBehaviorFilter !== 'all') params.orderBehavior = orderBehaviorFilter;

      console.log('[CUSTOMERS] Fetching with params:', params);

      const response = await apiClient.getCustomers(params);
      console.log('[CUSTOMERS] API response:', response);

      if (response.success && response.data) {
        setCustomers(response.data.customers || []);
        setTotalPages(response.data.pagination?.pages || 1);
        setTotalCustomers(response.data.pagination?.total || 0);
      } else {
        console.error('[CUSTOMERS] API response not successful:', response);
        setCustomers([]);
      }
    } catch (error: any) {
      console.error('[CUSTOMERS] Failed to load customers:', error);
      toast.error(error?.response?.data?.message || error?.message || 'Failed to load customers');
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerDetail = async (customerId: number) => {
    try {
      const response = await apiClient.getCustomerById(customerId);
      if (response.success && response.data) {
        setSelectedCustomer(response.data.customer);
        setDetailDialogOpen(true);
      }
    } catch (error: any) {
      toast.error('Failed to load customer details');
      console.error('Failed to load customer details:', error);
    }
  };

  const handleEditCustomer = (customer: CustomerDetail) => {
    setEditForm({
      name: customer.name || '',
      phone: customer.phone || '',
      address: customer.address || '',
      emailVerified: customer.emailVerified || false,
    });
    setSelectedCustomer(customer);
    setEditDialogOpen(true);
  };

  const handleSaveCustomer = async () => {
    if (!selectedCustomer) return;

    try {
      const response = await apiClient.updateCustomer(selectedCustomer.id, editForm);
      if (response.success) {
        toast.success('Customer updated successfully');
        setEditDialogOpen(false);
        fetchCustomers();
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to update customer');
      console.error('Failed to update customer:', error);
    }
  };

  const handleToggleStatus = async (customerId: number, currentStatus: boolean) => {
    try {
      const response = await apiClient.updateCustomerStatus(customerId, !currentStatus);
      if (response.success) {
        toast.success(`Customer ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
        fetchCustomers();
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to update customer status');
      console.error('Failed to update customer status:', error);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [searchTerm, statusFilter, orderBehaviorFilter, sortBy, sortOrder, page]);

  const getCustomerStats = () => {
    return {
      total: totalCustomers,
      active: customers.filter(c => c.isActive).length,
      totalOrders: customers.reduce((sum, c) => sum + (c.orderCount || 0), 0),
      avgOrdersPerCustomer: customers.length > 0 ?
        customers.reduce((sum, c) => sum + (c.orderCount || 0), 0) / customers.length : 0,
    };
  };

  const formatOrderFrequency = (count: number): string => {
    if (count === 0) return 'No orders yet';
    if (count === 1) return 'Ordered once';
    return `Ordered ${count} times`;
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const stats = getCustomerStats();

  return (
    <div className="space-y-6" suppressHydrationWarning>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Customer Management</h2>
          <p className="text-gray-600 mt-1">
            View customer insights and order statistics
            <span className="ml-2 text-blue-600 font-medium">({stats.total} total customers)</span>
          </p>
        </div>
      </div>

      {/* Info Message about Automatic Registration */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-900">
                Customers are created automatically through registration
              </p>
              <p className="text-sm text-blue-700 mt-1">
                Users who register on the website are automatically added as customers. 
                To create user accounts manually, please use the <a href="/admin/users" className="underline font-medium">User Management</a> section.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.active} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across all customers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Orders/Customer</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgOrdersPerCustomer.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Purchase frequency
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Rate</CardTitle>
            <Users className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.total > 0 ? ((stats.active / stats.total) * 100).toFixed(1) : 0}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Active customers
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters & Search</CardTitle>
          <CardDescription>Filter customers by status and order behavior</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active Only</SelectItem>
                <SelectItem value="inactive">Inactive Only</SelectItem>
              </SelectContent>
            </Select>
            <Select value={orderBehaviorFilter} onValueChange={setOrderBehaviorFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Customers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Customers</SelectItem>
                <SelectItem value="frequent">Most Frequent (5+ orders)</SelectItem>
                <SelectItem value="recent">Recent Buyers (Last 30 days)</SelectItem>
                <SelectItem value="inactive">No Orders Yet</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setOrderBehaviorFilter('all');
              }}
              className="w-full"
            >
              <Filter className="w-4 h-4 mr-2" />
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Customers Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('name')}
                >
                  Customer {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('email')}
                >
                  Email {sortBy === 'email' && (sortOrder === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Email Verified</TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('orderCount')}
                >
                  Order Frequency {sortBy === 'orderCount' && (sortOrder === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('totalQuantity')}
                >
                  Total Quantity {sortBy === 'totalQuantity' && (sortOrder === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('createdAt')}
                >
                  Created {sortBy === 'createdAt' && (sortOrder === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead>Actions ttt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    Loading customers...
                  </TableCell>
                </TableRow>
              ) : customers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="text-gray-500">
                      <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No customers found</p>
                      <p className="text-sm mt-1">Try adjusting your filters</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                customers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{customer.name}</div>
                        <div className="text-sm text-gray-500">ID: {customer.id}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{customer.email}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant={customer.isActive ? 'default' : 'secondary'}>
                          {customer.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleStatus(customer.id, customer.isActive)}
                          title={customer.isActive ? 'Deactivate' : 'Activate'}
                        >
                          {customer.isActive ? <XCircle className="w-4 h-4 text-red-500" /> : <CheckCircle className="w-4 h-4 text-green-500" />}
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={customer.emailVerified ? 'default' : 'secondary'}>
                        {customer.emailVerified ? 'Verified' : 'Not Verified'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">
                          {formatOrderFrequency(customer.orderCount)}
                        </div>
                        {customer.lastOrderDate && (
                          <div className="text-gray-500 text-xs mt-1">
                            Last: {format(new Date(customer.lastOrderDate), 'MMM dd, yyyy')}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">
                        {customer.totalQuantity} {customer.totalQuantity === 1 ? 'item' : 'items'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-500">
                        {format(new Date(customer.createdAt), 'MMM dd, yyyy')}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => fetchCustomerDetail(customer.id)}
                        >
                          <Eye className="w-4 h-4" />
                          <div> test</div>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditCustomer(customer as CustomerDetail)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Page {page} of {totalPages} ({totalCustomers} total customers)
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Customer Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Customer Details</DialogTitle>
            <DialogDescription>
              View detailed information about this customer
            </DialogDescription>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Name</Label>
                  <p className="text-sm">{selectedCustomer.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Email</Label>
                  <p className="text-sm">{selectedCustomer.email}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Phone</Label>
                  <p className="text-sm">{selectedCustomer.phone || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <Badge variant={selectedCustomer.isActive ? 'default' : 'secondary'}>
                    {selectedCustomer.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium">Email Verified</Label>
                  <Badge variant={selectedCustomer.emailVerified ? 'default' : 'secondary'}>
                    {selectedCustomer.emailVerified ? 'Yes' : 'No'}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium">Loyalty Points</Label>
                  <p className="text-sm">{selectedCustomer.loyaltyPoints || 0}</p>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium">Address</Label>
                <p className="text-sm">{selectedCustomer.address || 'N/A'}</p>
              </div>
              {selectedCustomer.statistics && (
                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <Label className="text-sm font-medium">Total Orders</Label>
                    <p className="text-2xl font-bold">{selectedCustomer.statistics.totalOrders}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Total Spent</Label>
                    <p className="text-2xl font-bold">£{selectedCustomer.statistics.totalSpent.toFixed(2)}</p>
                  </div>
                </div>
              )}
              {selectedCustomer.orders && selectedCustomer.orders.length > 0 && (
                <div className="pt-4 border-t">
                  <Label className="text-sm font-medium mb-2 block">Recent Orders</Label>
                  <div className="space-y-2">
                    {selectedCustomer.orders.slice(0, 5).map((order: any) => (
                      <div key={order.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <div>
                          <p className="text-sm font-medium">Order #{order.id}</p>
                          <p className="text-xs text-gray-500">{format(new Date(order.createdAt), 'MMM dd, yyyy')}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">£{order.total.toFixed(2)}</p>
                          <Badge variant="outline" className="text-xs">{order.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Customer Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
            <DialogDescription>
              Update customer information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={editForm.address}
                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="emailVerified"
                checked={editForm.emailVerified}
                onCheckedChange={(checked) => setEditForm({ ...editForm, emailVerified: checked })}
              />
              <Label htmlFor="emailVerified">Email Verified</Label>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveCustomer}>
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}), { ssr: false });

export default CustomerManagementPage;
