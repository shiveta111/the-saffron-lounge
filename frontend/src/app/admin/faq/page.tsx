'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '../../../lib/api-client';
import { FAQ } from '../../../lib/types';
import { useRealtime } from '../../../lib/realtime';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../../components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../../../components/ui/form';
import { Textarea } from '../../../components/ui/textarea';
import { Badge } from '../../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../../components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../../../components/ui/alert-dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createFAQSchema } from '../../../lib/schemas';
import { format } from 'date-fns';
import { Plus, Search, Filter, MoreHorizontal, Edit, Trash2, Eye, HelpCircle, Tag, MessageSquare, TrendingUp, FileText } from 'lucide-react';
import { toast } from 'sonner';

export default function FAQPage() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFAQ, setSelectedFAQ] = useState<FAQ | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingFAQ, setEditingFAQ] = useState<FAQ | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const { subscribe, emitAfterApiCall } = useRealtime();

  const form = useForm({
    resolver: zodResolver(createFAQSchema),
    defaultValues: {
      question: '',
      answer: '',
      category: '',
      tags: [],
    },
  });

  const fetchFAQs = async () => {
    try {
      setLoading(true);
      const params: any = {};

      if (searchTerm) params.search = searchTerm;
      if (categoryFilter !== 'all') params.category = categoryFilter;

      const response = await apiClient.getFAQs(params);
      console.log('📥 FAQ API Response:', response);
      
      if (response.success) {
        // Handle multiple response structures
        const faqData = response.data?.faqs || response.data?.data || response.data || response.faqs || [];
        console.log('✅ Extracted FAQs:', Array.isArray(faqData) ? faqData.length : 0, 'FAQs');
        setFaqs(Array.isArray(faqData) ? faqData : []);
      } else {
        setFaqs([]);
      }
    } catch (error: any) {
      console.error('Failed to load FAQs:', error);
      toast.error(error?.response?.data?.message || error?.message || 'Failed to load FAQs');
      setFaqs([]);
    } finally {
      setLoading(false);
    }
  };

  // Real-time subscription setup
  useEffect(() => {
    const subscriptionId = subscribe('FAQ_*', (event) => {
      console.log('Real-time FAQ event:', event);
      // Auto-refresh data when real-time events are received
      fetchFAQs();
    });

    return () => {
      // Cleanup subscription on unmount
    };
  }, [subscribe]);

  useEffect(() => {
    fetchFAQs();
  }, [searchTerm, categoryFilter]);

  const handleCreate = async (data: any) => {
    try {
      const response = await apiClient.createFAQ(data);
      if (response.success) {
        toast.success('FAQ created successfully');
        setIsCreateDialogOpen(false);
        form.reset();
        fetchFAQs();
        setLastUpdate(new Date());
        // Emit real-time event for FAQ creation
        emitAfterApiCall('FAQ_CREATED', { faqId: response.data?.id, faq: response.data });
      }
    } catch (error: any) {
      console.error('Create FAQ error:', error);
      toast.error(error?.response?.data?.message || error?.message || 'Failed to create FAQ');
    }
  };

  const handleUpdate = async (data: any) => {
    if (!editingFAQ) return;

    try {
      const response = await apiClient.updateFAQ(editingFAQ.id, data);
      if (response.success) {
        toast.success('FAQ updated successfully');
        setEditingFAQ(null);
        form.reset();
        fetchFAQs();
        setLastUpdate(new Date());
        // Emit real-time event for FAQ update
        emitAfterApiCall('FAQ_UPDATED', { faqId: editingFAQ.id, faq: response.data });
      }
    } catch (error: any) {
      console.error('Update FAQ error:', error);
      toast.error(error?.response?.data?.message || error?.message || 'Failed to update FAQ');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const response = await apiClient.deleteFAQ(id);
      if (response.success) {
        toast.success('FAQ deleted successfully');
        fetchFAQs();
        setLastUpdate(new Date());
        // Emit real-time event for FAQ deletion
        emitAfterApiCall('FAQ_DELETED', { faqId: id });
      }
    } catch (error: any) {
      console.error('Delete FAQ error:', error);
      toast.error(error?.response?.data?.message || error?.message || 'Failed to delete FAQ');
    }
  };

  const handleEdit = (faq: FAQ) => {
    setEditingFAQ(faq);
    form.reset({
      question: faq.question,
      answer: faq.answer,
      category: faq.category,
      tags: (faq as any).tags || [],
    });
  };

  const categories = Array.from(new Set(faqs.map(faq => faq.category)));
  const tags = Array.from(new Set(faqs.flatMap(faq => (faq as any).tags || [])));

  const getFAQStats = () => {
    const stats = {
      total: faqs.length,
      categories: categories.length,
      tags: tags.length,
      totalViews: faqs.reduce((sum, faq) => sum + ((faq as any).viewCount || 0), 0),
      avgViews: faqs.length > 0 ?
        faqs.reduce((sum, faq) => sum + ((faq as any).viewCount || 0), 0) / faqs.length : 0,
    };
    return stats;
  };

  const stats = getFAQStats();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-900">FAQ Management</h2>
        <span className="text-xs text-gray-400">
          Last updated: {lastUpdate.toLocaleTimeString()}
        </span>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add FAQ
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New FAQ</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleCreate)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="question"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Question</FormLabel>
                      <FormControl>
                        <Input placeholder="What is your return policy?" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="answer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Answer</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Provide a detailed answer..."
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="general">General</SelectItem>
                            <SelectItem value="orders">Orders</SelectItem>
                            <SelectItem value="shipping">Shipping</SelectItem>
                            <SelectItem value="returns">Returns</SelectItem>
                            <SelectItem value="payment">Payment</SelectItem>
                            <SelectItem value="account">Account</SelectItem>
                            <SelectItem value="technical">Technical</SelectItem>
                          </SelectContent>
                        </Select>
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
                            placeholder="returns, policy, shipping (comma separated)"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">Add FAQ</Button>
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
            <CardTitle className="text-sm font-medium">Total FAQs</CardTitle>
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.categories}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalViews}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Views</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgViews.toFixed(1)}</div>
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
                placeholder="Search FAQs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* FAQs Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Question</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Views</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[70px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Loading FAQs...
                  </TableCell>
                </TableRow>
              ) : faqs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    No FAQs found
                  </TableCell>
                </TableRow>
              ) : (
                faqs.map((faq) => (
                  <TableRow key={faq.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium truncate max-w-[300px]">{faq.question}</div>
                        <div className="text-sm text-gray-500 truncate max-w-[300px]">
                          {faq.answer}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{faq.category}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(faq as any).tags?.slice(0, 2).map((tag: string, index: number) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {(faq as any).tags?.length > 2 && (
                          <Badge variant="secondary" className="text-xs">
                            +{(faq as any).tags.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Eye className="w-4 h-4" />
                        <span>{(faq as any).viewCount || 0}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date((faq as any).created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setSelectedFAQ(faq)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(faq)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete FAQ</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this FAQ?
                                  This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(faq.id)}
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

      {/* FAQ Details Dialog */}
      <Dialog open={!!selectedFAQ} onOpenChange={() => setSelectedFAQ(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>FAQ Details</DialogTitle>
          </DialogHeader>

          {selectedFAQ && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Question</h3>
                <p className="text-lg">{selectedFAQ.question}</p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Answer</h3>
                <p className="text-gray-700 leading-relaxed">{selectedFAQ.answer}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-2">Category</h3>
                  <Badge variant="outline">{selectedFAQ.category}</Badge>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Views</h3>
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    <span>{(selectedFAQ as any).viewCount || 0}</span>
                  </div>
                </div>
              </div>

              {(selectedFAQ as any).tags && (selectedFAQ as any).tags.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {(selectedFAQ as any).tags.map((tag: string, index: number) => (
                      <Badge key={index} variant="secondary">{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center pt-4 border-t text-sm text-gray-500">
                <span>Created: {format(new Date((selectedFAQ as any).created_at), 'PPP')}</span>
                <span>Updated: {format(new Date((selectedFAQ as any).updated_at), 'PPP')}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit FAQ Dialog */}
      <Dialog open={!!editingFAQ} onOpenChange={() => setEditingFAQ(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit FAQ</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleUpdate)} className="space-y-4">
              <FormField
                control={form.control}
                name="question"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Question</FormLabel>
                    <FormControl>
                      <Input placeholder="What is your return policy?" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="answer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Answer</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Provide a detailed answer..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="general">General</SelectItem>
                          <SelectItem value="orders">Orders</SelectItem>
                          <SelectItem value="shipping">Shipping</SelectItem>
                          <SelectItem value="returns">Returns</SelectItem>
                          <SelectItem value="payment">Payment</SelectItem>
                          <SelectItem value="account">Account</SelectItem>
                          <SelectItem value="technical">Technical</SelectItem>
                        </SelectContent>
                      </Select>
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
                          placeholder="returns, policy, shipping (comma separated)"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingFAQ(null)}
                >
                  Cancel
                </Button>
                <Button type="submit">Update FAQ</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}