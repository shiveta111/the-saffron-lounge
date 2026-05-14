'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '../../../lib/api-client';
import { Service, CreateServiceData } from '../../../lib/types';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../../components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../../../components/ui/form';
import { Textarea } from '../../../components/ui/textarea';
import { Badge } from '../../../components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../../../components/ui/alert-dialog';
import { Checkbox } from '../../../components/ui/checkbox';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createServiceSchema } from '../../../lib/schemas';
import { format } from 'date-fns';
import {
  Plus,
  Download,
  CheckCircle,
  XCircle,
  Edit,
  Trash2,
  RefreshCw,
  AlertTriangle,
  Loader2,
  Package,
  DollarSign,
  BarChart3,
  Filter
} from 'lucide-react';
import { toast } from 'sonner';
import { useRealtime, realtimeManager } from '../../../lib/realtime';

export default function ServicesManagementPage() {
  // State
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [selectedServices, setSelectedServices] = useState<number[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const { isConnected, subscribe, emitAfterApiCall } = useRealtime();

  // Real‑time subscription
  useEffect(() => {
    const ids: string[] = [];
    ids.push(subscribe('SERVICE_CREATED', (e) => {
      fetchServices();
      setLastUpdate(new Date());
    }));
    ids.push(subscribe('SERVICE_UPDATED', (e) => {
      fetchServices();
      setLastUpdate(new Date());
    }));
    ids.push(subscribe('SERVICE_DELETED', (e) => {
      fetchServices();
      setLastUpdate(new Date());
    }));
    return () => ids.forEach((id) => realtimeManager.unsubscribe(id));
  }, []);

  // Form handling
  const form = useForm<CreateServiceData>({
    resolver: zodResolver(createServiceSchema),
    defaultValues: {
      title: '',
      description: '',
      price: undefined,
      duration: '',
      category: '',
      isActive: true,
      icon: '',
      features: [],
    },
  });

  // Fetch services
  const fetchServices = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (searchTerm) params.search = searchTerm;
      if (categoryFilter !== 'all') params.category = categoryFilter;
      const response = await apiClient.getServices(params);
      if (response.success) {
        let data = response.data?.services || response.data?.data || response.data || [];
        if (!Array.isArray(data)) data = [];
        const normalized = data.map((s: any) => ({
          ...s,
          title: s.title || s.name || 'Unnamed Service',
          description: s.description || '',
          category: s.category || 'General',
          price: s.price ?? null,
          duration: s.duration ?? null,
          isActive: s.isActive !== undefined ? s.isActive : true,
          icon: s.icon || '',
          features: s.features || [],
          createdAt: s.createdAt || s.created_at || new Date().toISOString(),
          updatedAt: s.updatedAt || s.updated_at || new Date().toISOString(),
        }));
        const filtered = statusFilter === 'all'
          ? normalized
          : normalized.filter((svc: Service) => svc.isActive === (statusFilter === 'active'));
        setServices(filtered);
      } else {
        toast.error('Failed to load services');
        setServices([]);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  // Initial load & refetch on filters
  useEffect(() => {
    fetchServices();
  }, [searchTerm, categoryFilter, statusFilter]);

  // Refresh button handler
  const handleRefresh = async () => {
    await fetchServices();
  };

  // Create service
  const handleCreate = async (data: CreateServiceData) => {
    try {
      if (!data.title?.trim() || !data.description?.trim() || !data.category?.trim()) {
        toast.error('Title, description, and category are required');
        return;
      }
      const payload = {
        title: data.title,
        description: data.description,
        category: data.category,
        price: data.price,
        icon: data.icon,
        features: data.features,
      };
      const response = await apiClient.createService(payload);
      if (response.success) {
        toast.success('Service created successfully');
        setIsCreateDialogOpen(false);
        form.reset();
        fetchServices();
        const serviceId = response.data?.service?.id || response.data?.id;
        emitAfterApiCall('SERVICE_CREATED', { serviceId, title: data.title });
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to create service');
    }
  };

  // Update service
  const handleUpdate = async (data: CreateServiceData) => {
    if (!editingService) return;
    try {
      if (!data.title?.trim() || !data.description?.trim() || !data.category?.trim()) {
        toast.error('Title, description, and category are required');
        return;
      }
      // Only send fields that are allowed by the backend update schema
      // Backend doesn't accept 'duration' or 'isActive' in updates
      const payload = {
        title: data.title,
        description: data.description,
        category: data.category,
        price: data.price,
        icon: data.icon,
        features: data.features,
      };
      const response = await apiClient.updateService(editingService.id, payload);
      if (response.success) {
        toast.success('Service updated successfully');
        setEditingService(null);
        form.reset();
        fetchServices();
        const serviceId = response.data?.service?.id || response.data?.id;
        emitAfterApiCall('SERVICE_UPDATED', { serviceId: serviceId || editingService.id, title: data.title });
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to update service');
    }
  };

  // Delete service
  const handleDelete = async (id: number) => {
    try {
      const response = await apiClient.deleteService(id);
      if (response.success) {
        toast.success('Service deleted successfully');
        fetchServices();
        emitAfterApiCall('SERVICE_DELETED', { serviceId: id });
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to delete service');
    }
  };

  // Bulk export
  const handleBulkExport = async () => {
    if (selectedServices.length === 0) {
      toast.error('Please select services to export');
      return;
    }
    const headers = ['ID', 'Title', 'Description', 'Category', 'Price', 'Duration', 'Status', 'Created Date', 'Last Updated'];
    const rows = services
      .filter((svc) => selectedServices.includes(svc.id))
      .map((svc) => [
        svc.id.toString(),
        svc.title,
        `"${svc.description.replace(/"/g, '""')}"`,
        svc.category,
        svc.price?.toString() || '',
        svc.duration || '',
        svc.isActive ? 'Active' : 'Inactive',
        format(new Date(svc.createdAt), 'yyyy-MM-dd HH:mm:ss'),
        format(new Date(svc.updatedAt), 'yyyy-MM-dd HH:mm:ss'),
      ]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `services_export_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.csv`;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    toast.success(`${selectedServices.length} services exported`);
    setSelectedServices([]);
    setShowBulkActions(false);
  };

  // Edit preparation
  const handleEdit = (service: Service) => {
    setEditingService(service);
    form.reset({
      title: service.title,
      description: service.description,
      price: service.price,
      duration: service.duration || '',
      category: service.category,
      isActive: service.isActive,
      icon: service.icon || '',
      features: service.features || [],
    });
  };

  // Selection helpers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedServices(services.map((s) => s.id));
      setShowBulkActions(true);
    } else {
      setSelectedServices([]);
      setShowBulkActions(false);
    }
  };

  const handleSelectService = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedServices((prev) => [...prev, id]);
      setShowBulkActions(true);
    } else {
      setSelectedServices((prev) => prev.filter((sid) => sid !== id));
      if (selectedServices.length <= 1) setShowBulkActions(false);
    }
  };

  // Stats
  const getServicesStats = () => {
    const categories: Record<string, number> = {};
    services.forEach((svc) => {
      categories[svc.category] = (categories[svc.category] || 0) + 1;
    });
    const avgPrice = services.length
      ? services.reduce((sum, s) => sum + (s.price ?? 0), 0) / services.filter((s) => s.price).length
      : 0;
    return {
      total: services.length,
      active: services.filter((s) => s.isActive).length,
      inactive: services.filter((s) => !s.isActive).length,
      categories: Object.entries(categories).sort((a, b) => b[1] - a[1]),
      avgPrice,
    };
  };

  const getStatusBadge = (isActive: boolean) =>
    isActive ? (
      <Badge className="bg-green-100 text-green-800">
        <CheckCircle className="w-3 h-3 mr-1" /> Active
      </Badge>
    ) : (
      <Badge className="bg-red-100 text-red-800">
        <XCircle className="w-3 h-3 mr-1" /> Inactive
      </Badge>
    );

  const stats = getServicesStats();

  // Loading state with skeleton
  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 bg-gray-200 rounded w-64 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-96 animate-pulse"></div>
          </div>
          <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-lg border">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                  <div className="h-8 bg-gray-200 rounded w-16 animate-pulse"></div>
                </div>
                <div className="h-6 w-6 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters Skeleton */}
        <div className="bg-white p-6 rounded-lg border">
          <div className="flex flex-wrap gap-4">
            <div className="h-10 bg-gray-200 rounded w-64 animate-pulse"></div>
            <div className="h-10 bg-gray-200 rounded w-40 animate-pulse"></div>
            <div className="h-10 bg-gray-200 rounded w-40 animate-pulse"></div>
          </div>
        </div>

        {/* Table Skeleton */}
        <div className="bg-white rounded-lg border">
          <div className="p-6">
            <div className="space-y-4">
              {/* Table Header */}
              <div className="grid grid-cols-6 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-4 bg-gray-200 rounded animate-pulse"></div>
                ))}
              </div>
              {/* Table Rows */}
              {[...Array(8)].map((_, i) => (
                <div key={i} className="grid grid-cols-6 gap-4">
                  <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/3 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/4 animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Loading Message */}
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-lg font-medium text-gray-700">Loading services...</p>
          <p className="text-sm text-gray-500">Please wait while we fetch the data from the database</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Services Management</h2>
          <p className="text-gray-600 mt-1">
            Manage your restaurant services and offerings with real-time database synchronization
            <span className="ml-2 text-blue-600 font-medium">({stats.total} services)</span>
            <span className="ml-2 text-xs text-gray-400">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </span>
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>

          <Button variant="outline" onClick={handleBulkExport} disabled={selectedServices.length === 0}>
            <Download className="w-4 h-4 mr-2" /> Export ({selectedServices.length})
          </Button>

          <Dialog open={isCreateDialogOpen || !!editingService} onOpenChange={(open) => {
            setIsCreateDialogOpen(open);
            if (!open) {
              setEditingService(null);
              form.reset();
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Service
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingService ? 'Edit Service' : 'Create New Service'}</DialogTitle>
                <p className="text-sm text-gray-600">
                  {editingService ? 'Update service information and settings.' : 'Add a new service to your restaurant offerings.'}
                </p>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(editingService ? handleUpdate : handleCreate)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="title" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Service Title</FormLabel>
                        <FormControl><Input placeholder="Private Dining, Catering, etc." {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="category" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <FormControl><Input placeholder="Dining, Events, Catering" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl><Textarea placeholder="Service description" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="price" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price (Optional)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="0.00" {...field} onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="duration" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duration (Optional)</FormLabel>
                        <FormControl><Input placeholder="2 hours, 1 day, etc." {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="icon" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Icon URL (Optional)</FormLabel>
                      <FormControl><Input placeholder="https://example.com/icon.png" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="features" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Features (comma separated)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Feature1, Feature2"
                          value={Array.isArray(field.value) ? field.value.join(', ') : field.value || ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            // Convert comma-separated string to array
                            const featuresArray = value ? value.split(',').map(f => f.trim()).filter(Boolean) : [];
                            field.onChange(featuresArray);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => {
                      setIsCreateDialogOpen(false);
                      setEditingService(null);
                      form.reset();
                    }}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={loading}>
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          {editingService ? 'Updating...' : 'Creating...'}
                        </>
                      ) : (
                        editingService ? 'Update Service' : 'Create Service'
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Service Statistics */}
      {!loading && services.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <Package className="w-4 h-4 mr-2" />
                Total Services
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-gray-500 mt-1">
                {stats.categories.length} categories
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                Active Services
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.active}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {Math.round((stats.active / stats.total) * 100)}% active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <XCircle className="w-4 h-4 mr-2 text-gray-500" />
                Inactive Services
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-600">
                {stats.inactive}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {Math.round((stats.inactive / stats.total) * 100)}% inactive
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <DollarSign className="w-4 h-4 mr-2 text-blue-500" />
                Average Price
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                ${stats.avgPrice.toFixed(2)}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Per service
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="services" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="services" className="flex items-center">
            <Package className="w-4 h-4 mr-2" />
            Services ({stats.total})
          </TabsTrigger>
          <TabsTrigger value="categories" className="flex items-center">
            <BarChart3 className="w-4 h-4 mr-2" />
            Categories ({stats.categories.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="services" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                  <Label htmlFor="search" className="text-sm font-medium">Search Services</Label>
                  <Input
                    id="search"
                    placeholder="Search by title or description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div className="min-w-[150px]">
                  <Label htmlFor="category-filter" className="text-sm font-medium">Category</Label>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger id="category-filter" className="w-full">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {stats.categories.map(([category]) => (
                        <SelectItem key={category} value={category}>{category}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="min-w-[150px]">
                  <Label htmlFor="status-filter" className="text-sm font-medium">Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger id="status-filter" className="w-full">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm('');
                    setCategoryFilter('all');
                    setStatusFilter('all');
                  }}
                  className="px-3"
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Bulk Actions */}
          {selectedServices.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    {selectedServices.length} service{selectedServices.length > 1 ? 's' : ''} selected
                  </span>
                  <div className="flex space-x-2">
                    <Button size="sm" onClick={handleBulkExport}>
                      <Download className="w-4 h-4 mr-1" />
                      Export
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Services Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox
                        checked={selectedServices.length === services.length && services.length > 0}
                        onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                      />
                    </TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {services.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <div className="text-gray-500">
                          <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <p className="text-lg font-medium">No services found</p>
                          <p className="text-sm">Try adjusting your search or filters</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    services.map((svc) => (
                      <TableRow key={svc.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedServices.includes(svc.id)}
                            onCheckedChange={(checked) => handleSelectService(svc.id, checked as boolean)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex-1">
                            <div className="font-medium">{svc.title}</div>
                            <div className="text-sm text-gray-500 line-clamp-1">
                              {svc.description}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{svc.category}</Badge>
                        </TableCell>
                        <TableCell>
                          {svc.price != null ? (
                            <span className="font-medium">${svc.price}</span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(svc.isActive)}</TableCell>
                        <TableCell>
                          <div className="flex space-x-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(svc)}
                              title="Edit service"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  title="Delete service"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="flex items-center space-x-2 text-red-600">
                                    <AlertTriangle className="w-5 h-5" />
                                    <span>Confirm Service Deletion</span>
                                  </AlertDialogTitle>
                                </AlertDialogHeader>
                                <div className="space-y-4">
                                  <div className="bg-red-50 border border-red-200 rounded-md p-4">
                                    <p className="text-sm text-red-800 font-medium mb-2">
                                      ⚠️ Warning: This action cannot be undone.
                                    </p>
                                    <p className="text-sm text-red-700">
                                      Are you sure you want to delete "{svc.title}"?
                                    </p>
                                  </div>
                                </div>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(svc.id)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Delete Permanently
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stats.categories.map(([category, count]) => (
              <Card key={category}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center space-x-2">
                      <Package className="w-5 h-5 text-blue-500" />
                      <span>{category}</span>
                    </CardTitle>
                    <Badge variant="outline">{count} services</Badge>
                  </div>
                  <CardDescription>
                    {Math.round((count / stats.total) * 100)}% of total services
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setCategoryFilter(category)}
                  >
                    <Filter className="w-4 h-4 mr-2" />
                    View Services
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}