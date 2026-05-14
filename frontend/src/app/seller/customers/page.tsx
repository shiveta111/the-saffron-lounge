'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '../../../lib/api-client';
import { Customer, CustomerOrder } from '../../../lib/types';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../../components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../../../components/ui/form';
import { Badge } from '../../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createCustomerSchema } from '../../../lib/schemas';
import { format } from 'date-fns';
import { Plus, Search, Eye, User, Mail, Phone, ShoppingBag, Star, Users, TrendingUp, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

export default function SellerCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerOrders, setCustomerOrders] = useState<CustomerOrder[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const form = useForm({
    resolver: zodResolver(createCustomerSchema),
    defaultValues: {
      email: '',
      name: '',
      phone: '',
      tags: [],
    },
  });

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const params: any = {};

      if (searchTerm) params.search = searchTerm;
      if (statusFilter !== 'all') params.isActive = statusFilter === 'active';

      const response = await apiClient.getCustomers(params);
      if (response.success) {
        setCustomers(response.data?.data || []);
      }
    } catch (error: any) {
      console.error('Failed to load customers:', error);
      toast.error(error?.response?.data?.message || error?.message || 'Failed to load customers');
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerOrders = async (customerId: number) => {
    try {
      const response = await apiClient.getCustomerOrders(customerId);
      if (response.success) {
        setCustomerOrders(response.data || []);
      }
    } catch (error: any) {
      console.error('Failed to load customer orders:', error);
      toast.error(error?.response?.data?.message || error?.message || 'Failed to load customer orders');
      setCustomerOrders([]);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    if (selectedCustomer) {
      fetchCustomerOrders(selectedCustomer.id);
    }
  }, [selectedCustomer]);

  const handleCreate = async (data: any) => {
    try {
      const response = await apiClient.createCustomer(data);
      if (response.success) {
        toast.success('Customer created successfully');
        setIsCreateDialogOpen(false);
        form.reset();
        fetchCustomers();
      }
    } catch (error: any) {
      console.error('Create customer error:', error);
      toast.error(error?.response?.data?.message || error?.message || 'Failed to create customer');
    }
  };

  const getCustomerStats = () => {
    const stats = {
      total: customers.length,
      active: customers.filter(c => c.isActive).length,
      inactive: customers.filter(c => !c.isActive).length,
      totalOrders: customers.reduce((sum, c) => sum + c.totalOrders, 0),
      avgOrdersPerCustomer: customers.length > 0 ?
        customers.reduce((sum, c) => sum + c.totalOrders, 0) / customers.length : 0,
      totalLoyaltyPoints: customers.reduce((sum, c) => sum + c.loyaltyPoints, 0),
    };
    return stats;
  };

  const getCustomerSegment = (customer: Customer) => {
    if (customer.totalOrders >= 10) return { label: 'VIP', color: 'bg-purple-100 text-purple-800' };
    if (customer.totalOrders >= 5) return { label: 'Regular', color: 'bg-blue-100 text-blue-800' };
    if (customer.totalOrders >= 1) return { label: 'New', color: 'bg-green-100 text-green-800' };
    return { label: 'Prospect', color: 'bg-gray-100 text-gray-800' };
  };

  const stats = getCustomerStats();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-900">Customer Management</h2>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Customer
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Customer</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleCreate)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="john@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="+1 (555) 123-4567" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tags"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tags (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="VIP, Regular, New (comma separated)"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">Create Customer</Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Orders/Customer</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgOrdersPerCustomer.toFixed(1)}</div>
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
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Customers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Customers</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Customers Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Segment</TableHead>
                <TableHead>Orders</TableHead>
                <TableHead>Loyalty Points</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[70px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Loading customers...
                  </TableCell>
                </TableRow>
              ) : customers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    No customers found
                  </TableCell>
                </TableRow>
              ) : (
                customers.map((customer) => {
                  const segment = getCustomerSegment(customer);
                  return (
                    <TableRow key={customer.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{customer.name}</div>
                          <div className="text-sm text-gray-500">
                            ID: {customer.id}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Mail className="w-3 h-3" />
                            <span className="text-sm">{customer.email}</span>
                          </div>
                          {customer.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="w-3 h-3" />
                              <span className="text-sm">{customer.phone}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={segment.color}>
                          {segment.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">{customer.totalOrders} orders</div>
                          {customer.lastOrderDate && (
                            <div className="text-gray-500">
                              Last: {format(new Date(customer.lastOrderDate), 'MMM dd, yyyy')}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Star className="w-4 h-4 text-yellow-500" />
                          <span className="font-medium">{customer.loyaltyPoints}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={customer.isActive ? 'default' : 'secondary'}>
                          {customer.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedCustomer(customer)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Customer Details Dialog */}
      <Dialog open={!!selectedCustomer} onOpenChange={() => setSelectedCustomer(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Customer Details</DialogTitle>
          </DialogHeader>

          {selectedCustomer && (
            <Tabs defaultValue="profile" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="orders">Order History</TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="space-y-4">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-4">Basic Information</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Name</label>
                        <p className="text-sm">{selectedCustomer.name}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Email</label>
                        <p className="text-sm">{selectedCustomer.email}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Phone</label>
                        <p className="text-sm">{selectedCustomer.phone || 'Not provided'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Status</label>
                        <Badge variant={selectedCustomer.isActive ? 'default' : 'secondary'}>
                          {selectedCustomer.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-4">Customer Analytics</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Total Orders</label>
                        <p className="text-lg font-semibold">{selectedCustomer.totalOrders}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Loyalty Points</label>
                        <p className="text-lg font-semibold">{selectedCustomer.loyaltyPoints}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Last Order</label>
                        <p className="text-sm">
                          {selectedCustomer.lastOrderDate
                            ? format(new Date(selectedCustomer.lastOrderDate), 'PPP')
                            : 'No orders yet'
                          }
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Segment</label>
                        {(() => {
                          const segment = getCustomerSegment(selectedCustomer);
                          return <Badge className={segment.color}>{segment.label}</Badge>;
                        })()}
                      </div>
                    </div>
                  </div>
                </div>

                {selectedCustomer.tags && selectedCustomer.tags.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedCustomer.tags.map((tag, index) => (
                        <Badge key={index} variant="outline">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="orders" className="space-y-4">
                <h3 className="font-semibold">Order History</h3>
                {customerOrders.length === 0 ? (
                  <p className="text-sm text-gray-500">No orders found for this customer</p>
                ) : (
                  <div className="space-y-3">
                    {customerOrders.map((order) => (
                      <Card key={order.id}>
                        <CardContent className="pt-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-medium">Order #{order.orderId}</div>
                              <div className="text-sm text-gray-500">
                                {format(new Date(order.date), 'PPP')}
                              </div>
                              <div className="text-sm text-gray-500">
                                {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-medium">${order.total.toFixed(2)}</div>
                              <Badge variant="outline">{order.status}</Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}