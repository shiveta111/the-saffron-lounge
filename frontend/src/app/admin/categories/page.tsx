'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../lib/api-client';
import { MenuCategory, CreateCategoryData } from '../../../lib/types';
import { queryKeys } from '../../../lib/query-client';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../../components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../../../components/ui/form';
import { Textarea } from '../../../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../../components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../../../components/ui/alert-dialog';
import { Checkbox } from '../../../components/ui/checkbox';
import { Badge } from '../../../components/ui/badge';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createCategorySchema } from '../../../lib/schemas';
import { Plus, Search, MoreHorizontal, Edit, Trash2, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { toast } from 'sonner';
import { useRealtime, realtimeManager } from '../../../lib/realtime';
import { websocketService } from '../../../lib/websocket';

export default function CategoryManagementPage() {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const { isConnected, subscribe, emitAfterApiCall } = useRealtime();

  const queryClient = useQueryClient();

  // Track latest fetch ID to discard stale out-of-order responses
  const fetchIdRef = useRef(0);
  // Always points to the latest fetchCategories so real-time handlers don't stale-close
  const fetchCategoriesRef = useRef<() => Promise<void>>(async () => {});

  const form = useForm<CreateCategoryData>({
    resolver: zodResolver(createCategorySchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  const fetchCategories = async () => {
    const fetchId = ++fetchIdRef.current;
    try {
      setLoading(true);
      const params: any = { limit: 100 };

      if (searchTerm && searchTerm.trim().length > 0) {
        params.search = searchTerm.trim();
      }

      const response = await apiClient.getCategories(params);

      // Discard this response if a newer fetch has already been started
      if (fetchId !== fetchIdRef.current) return;

      if (response.success) {
        const categoriesData = response.data?.categories || response.data?.data || response.data || response.categories || [];
        setCategories(Array.isArray(categoriesData) ? categoriesData : []);
      } else {
        setCategories([]);
      }
    } catch (error: any) {
      if (fetchId !== fetchIdRef.current) return;
      console.error('Failed to load categories:', error);
      toast.error('Failed to load categories');
      setCategories([]);
    } finally {
      if (fetchId === fetchIdRef.current) {
        setLoading(false);
      }
    }
  };

  // Keep the ref in sync so real-time handlers always call the latest version
  fetchCategoriesRef.current = fetchCategories;

  useEffect(() => {
    fetchCategories();
  }, [searchTerm]);

  // Real-time updates subscription
  useEffect(() => {
    websocketService.connect();
    websocketService.subscribe('admin');
    websocketService.subscribe('categories');

    const subscriptionIds: string[] = [];

    subscriptionIds.push(subscribe('CATEGORY_CREATED', (event) => {
      console.log('Real-time category created:', event);
      fetchCategoriesRef.current();
      setLastUpdate(new Date());
    }));

    subscriptionIds.push(subscribe('CATEGORY_UPDATED', (event) => {
      console.log('Real-time category updated:', event);
      fetchCategoriesRef.current();
      setLastUpdate(new Date());
    }));

    subscriptionIds.push(subscribe('CATEGORY_DELETED', (event) => {
      console.log('Real-time category deleted:', event);
      fetchCategoriesRef.current();
      setLastUpdate(new Date());
    }));

    return () => {
      subscriptionIds.forEach(id => realtimeManager.unsubscribe(id));
    };
  }, [subscribe]);

  const handleCreate = async (data: CreateCategoryData) => {
    try {
      const response = await apiClient.createCategory(data);
      if (response.success) {
        toast.success('Category created successfully');
        setIsCreateDialogOpen(false);
        form.reset();
        // Immediately refresh categories to show the new one
        await fetchCategories();
        setLastUpdate(new Date());
        emitAfterApiCall('CATEGORY_CREATED', { categoryId: response.data?.id, name: data.name });
      }
    } catch (error: any) {
      console.error('Create category error:', error);
      toast.error(error?.response?.data?.message || error?.message || 'Failed to create category');
    }
  };

  const handleUpdate = async (data: CreateCategoryData) => {
    if (!editingCategory) return;

    try {
      // Send the category ID in the request body as expected by the backend
      const updateData = {
        id: editingCategory.id,
        ...data
      };
      const response = await apiClient.updateCategory(editingCategory.id, updateData);
      if (response.success) {
        toast.success('Category updated successfully');
        setEditingCategory(null);
        form.reset();
        // Immediately refresh categories to show the updated one
        await fetchCategories();
        setLastUpdate(new Date());
        emitAfterApiCall('CATEGORY_UPDATED', { categoryId: editingCategory.id, name: data.name });
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update category');
    }
  };

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: number) => apiClient.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories });
      toast.success('Category deleted successfully');
      setLastUpdate(new Date());
    },
    onError: (error: any) => {
      console.error('Delete category error:', error);
      toast.error(error.response?.data?.message || 'Failed to delete category');
    },
  });

  const handleDelete = async (id: number) => {
    deleteCategoryMutation.mutate(id);
    emitAfterApiCall('CATEGORY_DELETED', { categoryId: id });
  };

  const handleEdit = (category: MenuCategory) => {
    setEditingCategory(category);
    form.reset({
      name: category.name,
      description: category.description || '',
    });
  };

  // Client-side filtering for immediate response
  const filteredCategories = categories.filter(category => {
    if (!searchTerm || searchTerm.trim().length === 0) return true;

    const searchLower = searchTerm.toLowerCase().trim();
    return category.name.toLowerCase().includes(searchLower) ||
           category.description?.toLowerCase().includes(searchLower);
  });

  // Bulk operations
  const handleBulkAction = async (action: string) => {
    if (selectedCategories.length === 0) return;

    if (action === 'delete') {
      if (!confirm(`Are you sure you want to delete ${selectedCategories.length} categories? This action cannot be undone.`)) return;
    }

    try {
      const promises = selectedCategories.map(categoryId => {
        if (action === 'delete') {
          return deleteCategoryMutation.mutateAsync(categoryId);
        }
        return Promise.resolve();
      });

      await Promise.all(promises);
      toast.success(`${selectedCategories.length} categories ${action}d successfully`);
      setSelectedCategories([]);
    } catch (error) {
      console.error(`Bulk ${action} error:`, error);
      toast.error(`Failed to ${action} some categories. Please check the console for details.`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-3xl font-bold text-gray-900">Category Management</h2>
            <div title={isConnected ? "Real-time updates active" : "Real-time updates offline"}>
              {isConnected ? (
                <Wifi className="w-5 h-5 text-green-500" />
              ) : (
                <WifiOff className="w-5 h-5 text-red-500" />
              )}
            </div>
          </div>
          <p className="text-gray-600 mt-1">
            Organize menu items with hierarchical categories
            <span className="ml-2 text-blue-600 font-medium">({categories.length} total categories)</span>
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => fetchCategories()}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>

          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Category
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Category</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleCreate)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter category name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Enter category description" {...field} />
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
                    <Button type="submit">Create Category</Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Search & Filter Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search categories by name or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedCategories.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                {selectedCategories.length} categor{selectedCategories.length > 1 ? 'ies' : 'y'} selected
              </span>
              <div className="flex space-x-2">
                <Button size="sm" variant="destructive" onClick={() => handleBulkAction('delete')}>
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete Selected
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Categories Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={selectedCategories.length === filteredCategories.length && filteredCategories.length > 0}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedCategories(filteredCategories.map((category: MenuCategory) => category.id));
                      } else {
                        setSelectedCategories([]);
                      }
                    }}
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Items Count</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[70px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Loading categories...
                  </TableCell>
                </TableRow>
              ) : filteredCategories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    No categories found
                  </TableCell>
                </TableRow>
              ) : (
                filteredCategories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedCategories.includes(category.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedCategories(prev => [...prev, category.id]);
                          } else {
                            setSelectedCategories(prev => prev.filter(id => id !== category.id));
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{category.name}</div>
                    </TableCell>
                    <TableCell>
                      {category.description ? (
                        <div className="text-sm text-gray-500 truncate max-w-[300px]">
                          {category.description}
                        </div>
                      ) : (
                        <Badge variant="secondary" className="text-xs">No description</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant="outline" className="w-fit">
                          {(category as any).item_count || (category as any)._count?.menus || 0} menus
                        </Badge>
                        <Badge variant="secondary" className="w-fit">
                          {(category as any).product_count || (category as any)._count?.products || 0} products
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{new Date(category.createdAt).toLocaleDateString()}</div>
                        <div className="text-gray-500 text-xs">
                          {new Date(category.createdAt).toLocaleTimeString()}
                        </div>
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
                          <DropdownMenuItem onClick={() => handleEdit(category)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Trash2 className="mr-2 h-4 w-4" />
                            View Items
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
                                <AlertDialogTitle>Delete Category</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{category.name}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(category.id)}
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

      {/* Edit Dialog */}
      <Dialog open={!!editingCategory} onOpenChange={() => setEditingCategory(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleUpdate)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter category name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Enter category description" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingCategory(null)}
                >
                  Cancel
                </Button>
                <Button type="submit">Update Category</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}