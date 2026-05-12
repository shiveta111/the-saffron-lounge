'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '../../../lib/api-client';
import { Testimonial, CreateTestimonialData } from '../../../lib/types';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../../components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../../../components/ui/form';
import { Textarea } from '../../../components/ui/textarea';
import { Badge } from '../../../components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../../components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../../../components/ui/alert-dialog';
import { Checkbox } from '../../../components/ui/checkbox';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createTestimonialSchema } from '../../../lib/schemas';
import { format } from 'date-fns';
import { Plus, Search, Filter, MoreHorizontal, Edit, Trash2, Eye, Star, Download, CheckCircle, XCircle, Clock, Users, TrendingUp, Wifi, WifiOff } from 'lucide-react';
import { toast } from 'sonner';
import { useRealtime, realtimeManager } from '../../../lib/realtime';

export default function TestimonialsManagementPage() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTestimonial, setSelectedTestimonial] = useState<Testimonial | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTestimonial, setEditingTestimonial] = useState<Testimonial | null>(null);
  const [selectedTestimonials, setSelectedTestimonials] = useState<number[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const { isConnected, subscribe, emitAfterApiCall } = useRealtime();

  // Real-time updates subscription
  useEffect(() => {
    const subscriptionIds: string[] = [];

    subscriptionIds.push(subscribe('TESTIMONIAL_CREATED', (event) => {
      console.log('Real-time testimonial created:', event.data);
      fetchTestimonials();
      setLastUpdate(new Date());
    }));

    subscriptionIds.push(subscribe('TESTIMONIAL_UPDATED', (event) => {
      console.log('Real-time testimonial updated:', event.data);
      fetchTestimonials();
      setLastUpdate(new Date());
    }));

    subscriptionIds.push(subscribe('TESTIMONIAL_DELETED', (event) => {
      console.log('Real-time testimonial deleted:', event.data);
      fetchTestimonials();
      setLastUpdate(new Date());
    }));

    return () => {
      subscriptionIds.forEach(id => realtimeManager.unsubscribe(id));
    };
  }, []);

  const form = useForm<CreateTestimonialData>({
    resolver: zodResolver(createTestimonialSchema),
    defaultValues: {
      clientName: '',
      rating: 5,
      feedback: '',
      source: '',
    },
  });

  const fetchTestimonials = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching testimonials...');

      const params: any = {};
      if (searchTerm) params.search = searchTerm;
      if (statusFilter !== 'all') params.status = statusFilter;

      console.log('📡 API Call:', '/api/testimonials', 'Params:', params);

      const response = await apiClient.getTestimonials(params);
      console.log('📥 Raw API Response:', response);

      if (response.success) {
        // Handle the specific backend response structure with client_name and designation
        let testimonialData = [];

        console.log('🔍 Analyzing response structure:', {
          hasData: !!response.data,
          dataKeys: response.data ? Object.keys(response.data) : [],
          testimonialsInData: response.data?.testimonials ? response.data.testimonials.length : 0,
          hasDirectTestimonials: !!response.testimonials
        });

        // Primary source: response.data.testimonials (the correct structure)
        if (response.data?.testimonials && Array.isArray(response.data.testimonials)) {
          testimonialData = response.data.testimonials;
          console.log('✅ Using testimonials from response.data.testimonials:', testimonialData.length);
        } else if (response.testimonials && Array.isArray(response.testimonials)) {
          testimonialData = response.testimonials;
          console.log('✅ Using testimonials from response.testimonials:', testimonialData.length);
        } else if (response.data && Array.isArray(response.data)) {
          testimonialData = response.data;
          console.log('✅ Using testimonials from response.data (array):', testimonialData.length);
        } else {
          // Handle the weird response where testimonials are spread as properties
          const testimonialsFromProps = [];
          for (const key in response) {
            if (!isNaN(Number(key)) && response[key] && typeof response[key] === 'object') {
              testimonialsFromProps.push(response[key]);
            }
          }
          if (testimonialsFromProps.length > 0) {
            testimonialData = testimonialsFromProps;
            console.log('✅ Found testimonials in response properties:', testimonialData.length);
          } else {
            console.warn('⚠️ No testimonials found in any expected structure');
            testimonialData = [];
          }
        }

        // Normalize testimonial data structure - map backend fields to frontend fields
        testimonialData = testimonialData.map((testimonial: any) => ({
          ...testimonial,
          clientName: testimonial.clientName || testimonial.client_name || testimonial.name || 'Anonymous',
          feedback: testimonial.feedback || testimonial.message || testimonial.review || '',
          rating: testimonial.rating || 5,
          source: testimonial.source || testimonial.platform || 'Website',
          status: testimonial.status || 'PENDING',
          createdAt: testimonial.createdAt || testimonial.created_at || testimonial.date || new Date().toISOString(),
          approvedAt: testimonial.approvedAt || testimonial.approved_at,
          id: testimonial.id || testimonial.testimonial_id || Math.random()
        }));

        console.log('📊 Final processed testimonials:', testimonialData.length, 'items');
        setTestimonials(testimonialData);
      } else {
        console.warn('❌ API response not successful:', response);
        setTestimonials([]);
      }
    } catch (error: any) {
      console.error('❌ Failed to load testimonials:', error);
      console.error('Error details:', {
        message: error?.message,
        response: error?.response,
        status: error?.response?.status,
        data: error?.response?.data
      });
      toast.error(error?.response?.data?.message || error?.message || 'Failed to load testimonials');
      setTestimonials([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTestimonials();
  }, [searchTerm, statusFilter]);

  const handleCreate = async (data: CreateTestimonialData) => {
    try {
      if (!data.clientName?.trim() || !data.feedback?.trim()) {
        toast.error('Client name and feedback are required');
        return;
      }

      const response = await apiClient.createTestimonial(data);
      if (response.success) {
        toast.success('Testimonial created successfully');
        setIsCreateDialogOpen(false);
        form.reset();
        fetchTestimonials();
        setLastUpdate(new Date());
        emitAfterApiCall('TESTIMONIAL_CREATED', { testimonialId: response.data?.id, clientName: data.clientName });
      }
    } catch (error: any) {
      console.error('Create testimonial error:', error);
      const errorMessage = error?.response?.data?.message || error?.response?.data?.error || error?.message || 'Failed to create testimonial';
      toast.error(errorMessage);
    }
  };

  const handleUpdate = async (data: CreateTestimonialData) => {
    if (!editingTestimonial) return;

    try {
      if (!data.clientName?.trim() || !data.feedback?.trim()) {
        toast.error('Client name and feedback are required');
        return;
      }

      const response = await apiClient.updateTestimonial(editingTestimonial.id, data);
      if (response.success) {
        toast.success('Testimonial updated successfully');
        setEditingTestimonial(null);
        form.reset();
        fetchTestimonials();
        setLastUpdate(new Date());
        emitAfterApiCall('TESTIMONIAL_UPDATED', { testimonialId: editingTestimonial.id, clientName: data.clientName });
      }
    } catch (error: any) {
      console.error('Update testimonial error:', error);
      const errorMessage = error?.response?.data?.message || error?.response?.data?.error || error?.message || 'Failed to update testimonial';
      toast.error(errorMessage);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const response = await apiClient.deleteTestimonial(id);
      if (response.success) {
        toast.success('Testimonial deleted successfully');
        fetchTestimonials();
        setLastUpdate(new Date());
        emitAfterApiCall('TESTIMONIAL_DELETED', { testimonialId: id });
      }
    } catch (error: any) {
      console.error('Delete testimonial error:', error);
      const errorMessage = error?.response?.data?.message || error?.response?.data?.error || error?.message || 'Failed to delete testimonial';
      toast.error(errorMessage);
    }
  };

  const handleStatusUpdate = async (id: number, status: 'PENDING' | 'APPROVED' | 'REJECTED') => {
    try {
      const response = await apiClient.updateTestimonial(id, { status });
      if (response.success) {
        toast.success(`Testimonial ${status.toLowerCase()} successfully`);
        fetchTestimonials();
        setLastUpdate(new Date());
      }
    } catch (error: any) {
      console.error('Status update error:', error);
      toast.error(error?.response?.data?.message || 'Failed to update status');
    }
  };

  const handleBulkExport = async () => {
    try {
      if (selectedTestimonials.length === 0) {
        toast.error('Please select testimonials to export');
        return;
      }

      const csvHeaders = [
        'ID', 'Client Name', 'Rating', 'Feedback', 'Source', 'Status', 'Created Date', 'Approved Date'
      ];

      const csvRows = testimonials
        .filter(testimonial => selectedTestimonials.includes(testimonial.id))
        .map(testimonial => [
          testimonial.id.toString(),
          testimonial.clientName,
          testimonial.rating.toString(),
          `"${testimonial.feedback.replace(/"/g, '""')}"`,
          testimonial.source,
          testimonial.status,
          format(new Date(testimonial.createdAt), 'yyyy-MM-dd HH:mm:ss'),
          testimonial.approvedAt ? format(new Date(testimonial.approvedAt), 'yyyy-MM-dd HH:mm:ss') : ''
        ]);

      const csvContent = [csvHeaders, ...csvRows]
        .map(row => row.map(field => field).join(','))
        .join('\n');

      const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `testimonials_export_${timestamp}.csv`;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success(`${selectedTestimonials.length} testimonials exported successfully`);
      setSelectedTestimonials([]);
      setShowBulkActions(false);
      setLastUpdate(new Date());
    } catch (error: any) {
      console.error('Bulk export error:', error);
      toast.error(error?.message || 'Failed to export testimonials');
    }
  };

  const handleEdit = (testimonial: Testimonial) => {
    setEditingTestimonial(testimonial);
    form.reset({
      clientName: testimonial.clientName,
      rating: testimonial.rating,
      feedback: testimonial.feedback,
      source: testimonial.source,
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTestimonials(testimonials.map(t => t.id));
      setShowBulkActions(true);
    } else {
      setSelectedTestimonials([]);
      setShowBulkActions(false);
    }
  };

  const handleSelectTestimonial = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedTestimonials([...selectedTestimonials, id]);
      setShowBulkActions(true);
    } else {
      const newSelected = selectedTestimonials.filter(tId => tId !== id);
      setSelectedTestimonials(newSelected);
      if (newSelected.length === 0) {
        setShowBulkActions(false);
      }
    }
  };

  const getTestimonialsStats = () => {
    const stats = {
      total: testimonials.length,
      approved: testimonials.filter(t => t.status === 'APPROVED').length,
      pending: testimonials.filter(t => t.status === 'PENDING').length,
      rejected: testimonials.filter(t => t.status === 'REJECTED').length,
      avgRating: testimonials.length > 0 ?
        testimonials.reduce((sum, t) => sum + t.rating, 0) / testimonials.length : 0,
    };
    return stats;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'PENDING':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'REJECTED':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
      />
    ));
  };

  const stats = getTestimonialsStats();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-3xl font-bold text-gray-900">Testimonials Management</h2>
            <div title={isConnected ? "Real-time updates active" : "Real-time updates offline"}>
              {isConnected ? (
                <Wifi className="w-5 h-5 text-green-500" />
              ) : (
                <WifiOff className="w-5 h-5 text-red-500" />
              )}
            </div>
          </div>
          <p className="text-gray-600 mt-1">
            Manage customer testimonials and reviews
            <span className="ml-2 text-blue-600 font-medium">({stats.total} total testimonials)</span>
            <span className="ml-2 text-xs text-gray-400">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleBulkExport} disabled={selectedTestimonials.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Export ({selectedTestimonials.length})
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Testimonial
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Testimonial</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleCreate)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="clientName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Client Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="rating"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Rating</FormLabel>
                          <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select rating" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {[1, 2, 3, 4, 5].map((rating) => (
                                <SelectItem key={rating} value={rating.toString()}>
                                  <div className="flex items-center">
                                    {Array.from({ length: 5 }, (_, i) => (
                                      <Star
                                        key={i}
                                        className={`w-4 h-4 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                                      />
                                    ))}
                                    <span className="ml-2">{rating} star{rating !== 1 ? 's' : ''}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="source"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Source (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Google Reviews, Website, etc." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="feedback"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Feedback</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Customer testimonial or review..."
                            className="min-h-[100px]"
                            {...field}
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
                    <Button type="submit">Create Testimonial</Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Testimonials</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              All testimonials
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.total > 0 ? ((stats.approved / stats.total) * 100).toFixed(1) : 0}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Awaiting approval
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Not approved
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            <Star className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.avgRating.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Out of 5 stars
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Bulk Actions */}
      {showBulkActions && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">
                  {selectedTestimonials.length} testimonial{selectedTestimonials.length !== 1 ? 's' : ''} selected
                </span>
              </div>
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleBulkExport}
                  className="bg-green-50 hover:bg-green-100"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Advanced Filters & Search</CardTitle>
          <CardDescription>Filter testimonials by status and search by client name</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search by client name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Testimonials</SelectItem>
                <SelectItem value="APPROVED">Approved Only</SelectItem>
                <SelectItem value="PENDING">Pending Only</SelectItem>
                <SelectItem value="REJECTED">Rejected Only</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                }}
                className="flex-1"
              >
                <Filter className="w-4 h-4 mr-2" />
                Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Testimonials Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={selectedTestimonials.length === testimonials.length && testimonials.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Feedback</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-[70px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    Loading testimonials...
                  </TableCell>
                </TableRow>
              ) : testimonials.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    No testimonials found
                  </TableCell>
                </TableRow>
              ) : (
                testimonials.map((testimonial) => (
                  <TableRow key={testimonial.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedTestimonials.includes(testimonial.id)}
                        onCheckedChange={(checked) => handleSelectTestimonial(testimonial.id, checked as boolean)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{testimonial.clientName}</div>
                      <div className="text-sm text-gray-500">
                        ID: {testimonial.id}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        {renderStars(testimonial.rating)}
                        <span className="ml-2 text-sm font-medium">{testimonial.rating}/5</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate" title={testimonial.feedback}>
                        {testimonial.feedback}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{testimonial.source || 'N/A'}</Badge>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(testimonial.status)}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {format(new Date(testimonial.createdAt), 'MMM dd, yyyy')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setSelectedTestimonial(testimonial)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(testimonial)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          {testimonial.status === 'PENDING' && (
                            <>
                              <DropdownMenuItem onClick={() => handleStatusUpdate(testimonial.id, 'APPROVED')}>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Approve
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStatusUpdate(testimonial.id, 'REJECTED')}>
                                <XCircle className="mr-2 h-4 w-4" />
                                Reject
                              </DropdownMenuItem>
                            </>
                          )}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Testimonial</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this testimonial from {testimonial.clientName}?
                                  This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(testimonial.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
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

      {/* Testimonial Details Dialog */}
      <Dialog open={!!selectedTestimonial} onOpenChange={() => setSelectedTestimonial(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Testimonial Details</DialogTitle>
          </DialogHeader>

          {selectedTestimonial && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{selectedTestimonial.clientName}</h3>
                  <div className="flex items-center mt-2">
                    {renderStars(selectedTestimonial.rating)}
                    <span className="ml-2 text-sm text-gray-600">
                      {selectedTestimonial.rating}/5 stars
                    </span>
                  </div>
                </div>
                {getStatusBadge(selectedTestimonial.status)}
              </div>

              <div>
                <h4 className="font-medium mb-2">Feedback</h4>
                <p className="text-gray-700 bg-gray-50 p-3 rounded-md">
                  {selectedTestimonial.feedback}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Source</label>
                  <p className="text-sm">{selectedTestimonial.source || 'Not specified'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Submitted</label>
                  <p className="text-sm">{format(new Date(selectedTestimonial.createdAt), 'PPP')}</p>
                </div>
              </div>

              {selectedTestimonial.approvedAt && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Approved</label>
                  <p className="text-sm">{format(new Date(selectedTestimonial.approvedAt), 'PPP')}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Testimonial Dialog */}
      <Dialog open={!!editingTestimonial} onOpenChange={() => setEditingTestimonial(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Testimonial</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleUpdate)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="clientName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="rating"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rating</FormLabel>
                      <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select rating" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {[1, 2, 3, 4, 5].map((rating) => (
                            <SelectItem key={rating} value={rating.toString()}>
                              <div className="flex items-center">
                                {Array.from({ length: 5 }, (_, i) => (
                                  <Star
                                    key={i}
                                    className={`w-4 h-4 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                                  />
                                ))}
                                <span className="ml-2">{rating} star{rating !== 1 ? 's' : ''}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="source"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Source (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Google Reviews, Website, etc." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="feedback"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Feedback</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Customer testimonial or review..."
                        className="min-h-[100px]"
                        {...field}
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
                  onClick={() => setEditingTestimonial(null)}
                >
                  Cancel
                </Button>
                <Button type="submit">Update Testimonial</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}