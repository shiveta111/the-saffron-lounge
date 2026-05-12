'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../lib/api-client';
import { MenuItem, CreateMenuItemData, MenuCategory } from '../../../lib/types';
import { queryKeys } from '../../../lib/query-client';
import { useRealtime } from '../../../lib/realtime';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../../components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../../../components/ui/form';
import { Textarea } from '../../../components/ui/textarea';
import { Switch } from '../../../components/ui/switch';
import { Badge } from '../../../components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../../components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../../../components/ui/alert-dialog';
import { Checkbox } from '../../../components/ui/checkbox';
import { Progress } from '../../../components/ui/progress';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createMenuItemSchema } from '../../../lib/schemas';
import { Plus, Search, Filter, MoreHorizontal, Edit, Trash2, Eye, Upload, Package, AlertTriangle, TrendingUp, RefreshCw, ChefHat, DollarSign, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { ImageUpload } from '../../../components/admin/image-upload';
import { getImageUrl } from '../../../lib/image-utils';

export default function MenuManagementPage() {
   const [searchTerm, setSearchTerm] = useState('');
   const [selectedCategory, setSelectedCategory] = useState<string>('all');
   const [availabilityFilter, setAvailabilityFilter] = useState<string>('all');
   const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
   const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
   const [isNewCategoryDialogOpen, setIsNewCategoryDialogOpen] = useState(false);
   const [newCategoryName, setNewCategoryName] = useState('');
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [deletingItem, setDeletingItem] = useState<MenuItem | null>(null);
  const [viewingItem, setViewingItem] = useState<MenuItem | null>(null);

   const queryClient = useQueryClient();
   const { subscribe, emitAfterApiCall } = useRealtime();
   const router = useRouter();

  // Removed pagination - all items loaded at once

  // Queries
  
  // Fetch products for selection
  const { data: productsResponse, isLoading: loadingProducts } = useQuery({
    queryKey: ['products-for-menu-selection'],
    queryFn: async () => {
      const response = await apiClient.getProducts({ limit: 1000 });
      return response;
    },
  });

  const products = Array.isArray(productsResponse?.data) ? productsResponse.data : [];
  const { data: menuResponse, isLoading: loadingMenuItems, error: menuError } = useQuery({
    queryKey: queryKeys.menuItems,
    queryFn: async () => {
      const response = await apiClient.getMenuItems({});
      // Log response for debugging
      console.log('📥 Menu items API response:', response);
      return response;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Extract menu items and pagination from response
  // Handle different response formats from API
  const menuItems = (() => {
    if (!menuResponse) return [];
    
    // Try different response structures
    if (Array.isArray(menuResponse?.data?.items)) {
      console.log('✅ Extracted menu items from response.data.items:', menuResponse.data.items.length);
      return menuResponse.data.items;
    }
    if (Array.isArray(menuResponse?.data)) {
      console.log('✅ Extracted menu items from response.data:', menuResponse.data.length);
      return menuResponse.data;
    }
    if (Array.isArray(menuResponse?.items)) {
      console.log('✅ Extracted menu items from response.items:', menuResponse.items.length);
      return menuResponse.items;
    }
    if (Array.isArray(menuResponse)) {
      console.log('✅ Extracted menu items from response (direct array):', menuResponse.length);
      return menuResponse;
    }
    
    console.warn('⚠️ Unexpected menu response structure:', menuResponse);
    return [];
  })();
  
  const pagination = {
    total: menuItems.length,
    page: 1,
    totalPages: 1,
    hasMore: false,
    hasPrevious: false
  };

  const { data: categoriesData } = useQuery({
    queryKey: queryKeys.categories,
    queryFn: () => apiClient.getCategories().then(res => {
      // Handle different response structures from backend
      const extracted = res.data?.categories || res.data?.data || res.data || [];
      // Ensure we always return an array
      return Array.isArray(extracted) ? extracted : [];
    }),
  });

  // Ensure categories is always an array
  const categories = Array.isArray(categoriesData) ? categoriesData : [];

  // Check if products are available for menu creation
  const { data: productsCheck, isLoading: checkingProducts } = useQuery({
    queryKey: ['products-availability'],
    queryFn: async () => {
      const response = await apiClient.checkProductsAvailability();
      return response.data;
    },
  });

  const hasProducts = productsCheck?.hasProducts ?? false;
  const productCount = productsCheck?.productCount ?? 0;

  // Mutations
  const createMenuItemMutation = useMutation({
    mutationFn: (data: any) => apiClient.createMenu(data), // Use createMenu endpoint instead of createMenuItem
    onSuccess: async (response) => {
      // Invalidate and immediately refetch to ensure the new item appears
      await queryClient.invalidateQueries({ queryKey: queryKeys.menuItems });
      await queryClient.refetchQueries({ queryKey: queryKeys.menuItems });
      queryClient.invalidateQueries({ queryKey: ['products-for-menu'] }); // Invalidate products query
      queryClient.invalidateQueries({ queryKey: ['products-for-menu-selection'] }); // Invalidate products selection query
      toast.success('Menu item created successfully');
      setIsCreateDialogOpen(false);
      setSelectedProductIds([]);
      form.reset();
      setLastUpdate(new Date());
      emitAfterApiCall('MENU_ITEM_CREATED', { 
        menuItemId: response?.data?.data?.id || response?.data?.id, 
        menuItem: response?.data?.data || response?.data 
      });
    },
    onError: (error: any) => {
      const errorMessage = 
        error.response?.data?.error || 
        error.response?.data?.message || 
        error.message || 
        'Failed to create menu item';
      
      const errorDetails = error.response?.data?.details;
      toast.error(errorDetails ? `${errorMessage}: ${errorDetails}` : errorMessage);
    },
  });

  const updateMenuItemMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: CreateMenuItemData }) => 
      apiClient.updateMenuItem(id, data),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.menuItems });
      toast.success('Menu item updated successfully');
      setEditingItem(null);
      form.reset();
      setLastUpdate(new Date());
      emitAfterApiCall('MENU_ITEM_UPDATED', { 
        menuItemId: variables.id, 
        menuItem: response?.data?.item || response?.data 
      });
    },
    onError: (error: any) => {
      const errorMessage = 
        error.response?.data?.error || 
        error.response?.data?.message || 
        error.message || 
        'Failed to update menu item';
      
      const errorDetails = error.response?.data?.details;
      toast.error(errorDetails ? `${errorMessage}: ${errorDetails}` : errorMessage);
    },
  });

  const deleteMenuItemMutation = useMutation({
    mutationFn: (id: number) => apiClient.deleteMenuItem(id),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.menuItems });
      toast.success('Menu item deleted successfully');
      setLastUpdate(new Date());
      setDeletingItem(null);
      emitAfterApiCall('MENU_ITEM_DELETED', { menuItemId: variables });
    },
    onError: (error: any) => {
      const errorMessage = 
        error.response?.data?.error || 
        error.response?.data?.message || 
        error.message || 
        'Failed to delete menu item';
      
      const errorDetails = error.response?.data?.details;
      toast.error(errorDetails ? `${errorMessage}: ${errorDetails}` : errorMessage);
      setDeletingItem(null);
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: (data: { name: string; description?: string }) => apiClient.createCategory(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories });
      toast.success('Category created successfully');
      setIsNewCategoryDialogOpen(false);
      setNewCategoryName('');
      setLastUpdate(new Date());
      emitAfterApiCall('CATEGORY_CREATED', { 
        categoryId: response?.data?.id, 
        category: response?.data 
      });

      // Auto-select the newly created category in the form
      if (response?.data?.id) {
        form.setValue('categoryId', response.data.id);
      }
    },
    onError: (error: any) => {
      const errorMessage = 
        error.response?.data?.error || 
        error.response?.data?.message || 
        error.message || 
        'Failed to create category';
      
      const errorDetails = error.response?.data?.details;
      toast.error(errorDetails ? `${errorMessage}: ${errorDetails}` : errorMessage);
    },
  });

  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);

  const form = useForm<CreateMenuItemData & { productIds?: number[] }>({
    resolver: zodResolver(createMenuItemSchema),
    defaultValues: {
      name: '',
      description: '',
      price: 0,
      categoryId: categories.length > 0 ? categories[0].id : 1, // Default to first category
      isAvailable: true,
      imageUrl: '',
      productIds: [],
    },
  });

  // Update form default values when categories load
  useEffect(() => {
    if (categories.length > 0) {
      form.setValue('categoryId', categories[0].id);
    }
  }, [categories, form]);

  // Filter menu items based on current filters
  const filteredMenuItems = menuItems.filter((item: any) => {
    const matchesSearch = item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Handle different category formats: string, object, or categoryRef
    let categoryName: string | undefined;
    if (typeof item.category === 'string') {
      categoryName = item.category;
    } else if (item.category?.name) {
      categoryName = item.category.name;
    } else if (item.categoryRef?.name) {
      categoryName = item.categoryRef.name;
    }
    
    const matchesCategory = selectedCategory === 'all' || categoryName === selectedCategory;
    const matchesAvailability = availabilityFilter === 'all' ||
                                (availabilityFilter === 'available' && item.isAvailable) ||
                                (availabilityFilter === 'unavailable' && !item.isAvailable);

    return matchesSearch && matchesCategory && matchesAvailability;
  });

  // Real-time subscription setup
  useEffect(() => {
    const subscriptionId = subscribe('MENU_*', () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.menuItems });
      setLastUpdate(new Date());
    });

    const categorySubscriptionId = subscribe('CATEGORY_*', () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories });
      setLastUpdate(new Date());
    });

    return () => {
      // Cleanup subscriptions on unmount
    };
  }, [subscribe, queryClient]);

  // Bulk operations
  const handleBulkAction = async (action: string) => {
    if (selectedItems.length === 0) return;

    if (action === 'delete') {
      if (!confirm(`Are you sure you want to delete ${selectedItems.length} menu items? This action cannot be undone.`)) {
        return;
      }
    }

    try {
      const promises = selectedItems.map(itemId => {
        if (action === 'delete') {
          return deleteMenuItemMutation.mutateAsync(itemId);
        }
        return Promise.resolve();
      });

      await Promise.all(promises);
      toast.success(`${selectedItems.length} menu items ${action}d successfully`);
      setSelectedItems([]);
    } catch (error: any) {
      const errorMessage = 
        error.response?.data?.error || 
        error.response?.data?.message || 
        error.message || 
        `Failed to ${action} some menu items`;
      
      const errorDetails = error.response?.data?.details;
      toast.error(errorDetails ? `${errorMessage}: ${errorDetails}` : errorMessage);
    }
  };

  // Get menu statistics
  const getMenuStats = () => {
    const stats = {
      total: pagination.total || menuItems.length,
      available: menuItems.filter((item: MenuItem) => item.isAvailable).length,
      unavailable: menuItems.filter((item: MenuItem) => !item.isAvailable).length,
      categories: categories.length,
      avgPrice: menuItems.length > 0 ? menuItems.reduce((sum: number, item: MenuItem) => sum + item.price, 0) / menuItems.length : 0,
      totalValue: menuItems.reduce((sum: number, item: MenuItem) => sum + item.price, 0),
    };
    return stats;
  };

  const stats = getMenuStats();

  const handleCreate = (data: CreateMenuItemData & { productIds?: number[] }) => {
    // Validate that categoryId exists and is valid
    if (!data.categoryId || data.categoryId < 1) {
      toast.error('Please select a category before creating the menu item');
      return;
    }
    
    // Get the selected category from the categories array
    const selectedCategory = categories.find((cat: MenuCategory) => cat.id === data.categoryId);
    
    if (!selectedCategory) {
      toast.error('Selected category is invalid. Please choose a valid category from the list.');
      return;
    }
    
    // Ensure both category name and categoryId are included
    // Include productIds from state (selected products)
    const menuData = {
      ...data,
      category: selectedCategory.name,
      categoryId: data.categoryId,
      imageUrl: data.imageUrl || undefined,
      productIds: selectedProductIds.length > 0 ? selectedProductIds : undefined,
    };
    
    createMenuItemMutation.mutate(menuData);
  };
  
  const handleProductToggle = (productId: number) => {
    const newSelection = selectedProductIds.includes(productId)
      ? selectedProductIds.filter(id => id !== productId)
      : [...selectedProductIds, productId];
    setSelectedProductIds(newSelection);
    form.setValue('productIds', newSelection);
  };
  
  // Group products by category for display
  const productsByCategory = products.reduce((acc: Record<string, any[]>, product: any) => {
    const category = product.category || 'Uncategorized';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(product);
    return acc;
  }, {});

  const handleCreateImmediate = async (data: CreateMenuItemData) => {
    console.log('📝 IMMEDIATE CREATE - Starting immediate create operation:', {
      formData: data,
      timestamp: new Date().toISOString(),
    });
    
    try {
      // Validate that categoryId exists and is valid
      if (!data.categoryId || data.categoryId < 1) {
        console.error('❌ VALIDATION ERROR - Missing or invalid categoryId:', {
          categoryId: data.categoryId,
        });
        toast.error('Please select a category before creating the menu item');
        return;
      }
      
      const selectedCategory = categories.find((cat: MenuCategory) => cat.id === data.categoryId);
      
      if (!selectedCategory) {
        console.error('❌ VALIDATION ERROR - Category not found:', {
          categoryId: data.categoryId,
          availableCategories: categories.map((c: MenuCategory) => ({ id: c.id, name: c.name })),
        });
        toast.error('Selected category is invalid. Please choose a valid category from the list.');
        return;
      }
      
      // Ensure both category name and categoryId are included
      const menuData = {
        ...data,
        category: selectedCategory.name,
        categoryId: data.categoryId,
        imageUrl: data.imageUrl || undefined,
      };
      
      console.log('📤 IMMEDIATE CREATE REQUEST - Sending data:', {
        menuData: menuData,
        categoryName: selectedCategory.name,
        categoryId: data.categoryId,
      });
      
      const response = await apiClient.createMenu(menuData);
      
      console.log('✅ IMMEDIATE CREATE SUCCESS - Response received:', {
        response: response,
        success: response.success,
        itemId: response?.data?.item?.id || response?.data?.id,
        timestamp: new Date().toISOString(),
      });
      
      if (response.success) {
        toast.success('Menu item created successfully');
        setIsCreateDialogOpen(false);
        form.reset();
        // Immediately refresh menu items to show the new one
        queryClient.invalidateQueries({ queryKey: queryKeys.menuItems });
        setLastUpdate(new Date());
      }
    } catch (error: any) {
      console.error('❌ IMMEDIATE CREATE FAILED - Error details:', {
        error: error,
        message: error.message,
        response: error.response,
        responseData: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText,
        timestamp: new Date().toISOString(),
      });
      
      // Extract error message from multiple possible formats
      const errorMessage = 
        error.response?.data?.error || 
        error.response?.data?.message || 
        error.message || 
        'Failed to create menu item';
      
      const errorDetails = error.response?.data?.details;
      
      // Display error with details if available
      if (errorDetails) {
        toast.error(`${errorMessage}: ${errorDetails}`);
        console.error('❌ IMMEDIATE CREATE ERROR DETAILS:', errorDetails);
      } else {
        toast.error(errorMessage);
      }
    }
  };

  const handleUpdate = (data: CreateMenuItemData) => {
    if (!editingItem) {
      console.error('❌ UPDATE ERROR - No item selected for editing');
      return;
    }
    
    console.log('📝 PREPARE UPDATE - Validating and preparing update data:', {
      itemId: editingItem.id,
      itemName: editingItem.name,
      formData: data,
      timestamp: new Date().toISOString(),
    });
    
    // Validate that categoryId exists and is valid
    if (!data.categoryId || data.categoryId < 1) {
      console.error('❌ VALIDATION ERROR - Missing or invalid categoryId:', {
        categoryId: data.categoryId,
      });
      toast.error('Please select a category before updating the menu item');
      return;
    }
    
    // Get the selected category from the categories array
    const selectedCategory = categories.find((cat: MenuCategory) => cat.id === data.categoryId);
    
    if (!selectedCategory) {
      console.error('❌ VALIDATION ERROR - Category not found:', {
        categoryId: data.categoryId,
        availableCategories: categories.map((c: MenuCategory) => ({ id: c.id, name: c.name })),
      });
      toast.error('Selected category is invalid. Please choose a valid category from the list.');
      return;
    }
    
    // Ensure both category name and categoryId are included
    const menuData = {
      ...data,
      category: selectedCategory.name,
      categoryId: data.categoryId,
      imageUrl: data.imageUrl || undefined,
      // Remove id from the request body - the backend doesn't expect it in the body
    };
    
    console.log('📝 PREPARE UPDATE - Final data to be sent:', {
      itemId: editingItem.id,
      menuData: menuData,
      categoryName: selectedCategory.name,
      categoryId: data.categoryId,
    });
    
    updateMenuItemMutation.mutate({ id: editingItem.id, data: menuData });
  };

  const handleUpdateImmediate = async (data: CreateMenuItemData) => {
    if (!editingItem) {
      console.error('❌ IMMEDIATE UPDATE ERROR - No item selected for editing');
      return;
    }
    
    console.log('📝 IMMEDIATE UPDATE - Starting immediate update operation:', {
      itemId: editingItem.id,
      itemName: editingItem.name,
      formData: data,
      timestamp: new Date().toISOString(),
    });
    
    try {
      // Validate that categoryId exists and is valid
      if (!data.categoryId || data.categoryId < 1) {
        console.error('❌ VALIDATION ERROR - Missing or invalid categoryId:', {
          categoryId: data.categoryId,
        });
        toast.error('Please select a category before updating the menu item');
        return;
      }
      
      const selectedCategory = categories.find((cat: MenuCategory) => cat.id === data.categoryId);
      
      if (!selectedCategory) {
        console.error('❌ VALIDATION ERROR - Category not found:', {
          categoryId: data.categoryId,
          availableCategories: categories.map((c: MenuCategory) => ({ id: c.id, name: c.name })),
        });
        toast.error('Selected category is invalid. Please choose a valid category from the list.');
        return;
      }
      
      // Ensure both category name and categoryId are included
      const menuData = {
        ...data,
        category: selectedCategory.name,
        categoryId: data.categoryId,
        imageUrl: data.imageUrl || undefined,
        // Remove id from the request body - the backend doesn't expect it in the body
      };
      
      console.log('📤 IMMEDIATE UPDATE REQUEST - Sending data:', {
        itemId: editingItem.id,
        menuData: menuData,
        categoryName: selectedCategory.name,
        categoryId: data.categoryId,
      });
      
      const response = await apiClient.updateMenuItem(editingItem.id, menuData);
      
      console.log('✅ IMMEDIATE UPDATE SUCCESS - Response received:', {
        response: response,
        success: response.success,
        itemId: editingItem.id,
        timestamp: new Date().toISOString(),
      });
      
      if (response.success) {
        toast.success('Menu item updated successfully');
        setEditingItem(null);
        form.reset();
        // Immediately refresh menu items to show the updated one
        queryClient.invalidateQueries({ queryKey: queryKeys.menuItems });
        setLastUpdate(new Date());
      }
    } catch (error: any) {
      console.error('❌ IMMEDIATE UPDATE FAILED - Error details:', {
        error: error,
        itemId: editingItem.id,
        message: error.message,
        response: error.response,
        responseData: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText,
        timestamp: new Date().toISOString(),
      });
      
      // Extract error message from multiple possible formats
      const errorMessage = 
        error.response?.data?.error || 
        error.response?.data?.message || 
        error.message || 
        'Failed to update menu item';
      
      const errorDetails = error.response?.data?.details;
      
      // Display error with details if available
      if (errorDetails) {
        toast.error(`${errorMessage}: ${errorDetails}`);
        console.error('❌ IMMEDIATE UPDATE ERROR DETAILS:', errorDetails);
      } else {
        toast.error(errorMessage);
      }
    }
  };

  const handleDelete = () => {
    if (!deletingItem) {
      console.error('❌ DELETE ERROR - No item selected for deletion');
      return;
    }
    
    console.log('🔄 CONFIRM DELETE - User confirmed deletion:', {
      itemId: deletingItem.id,
      itemName: deletingItem.name,
      timestamp: new Date().toISOString(),
    });
    
    deleteMenuItemMutation.mutate(deletingItem.id);
  };

  const handleEdit = (item: MenuItem) => {
    setEditingItem(item);
    // Find the category ID from the categories array
    const category = categories.find((cat: MenuCategory) => cat.name === (typeof item.category === 'string' ? item.category : ''));
    form.reset({
      name: item.name,
      description: item.description || '',
      price: item.price,
      categoryId: category?.id || 1,
      imageUrl: item.imageUrl || '',
      isAvailable: item.isAvailable,
    });
  };

  const handleCategoryChange = (value: string) => {
    if (value === 'new') {
      setIsNewCategoryDialogOpen(true);
    } else {
      const categoryId = parseInt(value);
      
      // Validate that the category exists
      const selectedCategory = categories.find((cat: MenuCategory) => cat.id === categoryId);
      
      if (!selectedCategory) {
        console.error('❌ CATEGORY VALIDATION ERROR - Invalid category selected:', {
          categoryId: categoryId,
          availableCategories: categories.map((c: MenuCategory) => ({ id: c.id, name: c.name })),
        });
        toast.error('Invalid category selected. Please choose a valid category.');
        return;
      }
      
      console.log('✅ CATEGORY SELECTED - Valid category:', {
        categoryId: categoryId,
        categoryName: selectedCategory.name,
      });
      
      form.setValue('categoryId', categoryId);
    }
  };

  const handleCreateCategory = () => {
    if (!newCategoryName.trim()) {
      console.warn('⚠️ CREATE CATEGORY WARNING - Empty category name');
      toast.error('Please enter a category name');
      return;
    }
    
    console.log('📝 CREATE CATEGORY - Preparing to create category:', {
      name: newCategoryName.trim(),
      timestamp: new Date().toISOString(),
    });
    
    createCategoryMutation.mutate({
      name: newCategoryName.trim(),
      description: ''
    }, {
      onSuccess: (response) => {
        console.log('✅ CREATE CATEGORY - Auto-selecting new category:', {
          categoryId: response.data.id,
          categoryName: response.data.name,
        });
        form.setValue('categoryId', response.data.id);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Menu Management</h2>
          <p className="text-gray-600 mt-1">
            Manage menu items, categories, and inventory with real-time updates
            <span className="ml-2 text-blue-600 font-medium">({stats.total} total items)</span>
            <span className="ml-2 text-xs text-gray-400">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </span>
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => queryClient.invalidateQueries({ queryKey: queryKeys.menuItems })}
            disabled={loadingMenuItems}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${(loadingMenuItems) ? 'animate-spin' : ''}`} />
            {loadingMenuItems ? 'Refreshing...' : 'Refresh'}
          </Button>

          <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
            setIsCreateDialogOpen(open);
            if (!open) {
              form.reset();
            }
          }}>
            <DialogTrigger asChild>
              <Button 
                onClick={() => {
                  if (!hasProducts) {
                    toast.error('Please create products first', {
                      description: 'Menus require at least one product to be created.',
                      action: {
                        label: 'Go to Products',
                        onClick: () => router.push('/admin/products')
                      }
                    });
                    return;
                  }
                  setIsCreateDialogOpen(true);
                }}
                disabled={!hasProducts || checkingProducts}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Menu Item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Menu Item</DialogTitle>
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
                            <Input placeholder="Enter item name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="categoryId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category *</FormLabel>
                          <Select onValueChange={handleCategoryChange} value={field.value?.toString()}>
                            <FormControl>
                              <SelectTrigger className={!field.value ? 'border-red-300' : ''}>
                                <SelectValue placeholder="Select category (required)" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {categories.length === 0 ? (
                                <SelectItem value="no-categories" disabled>
                                  No categories available
                                </SelectItem>
                              ) : (
                                categories.map((category: MenuCategory) => (
                                  <SelectItem key={category.id} value={category.id.toString()}>
                                    {category.name}
                                  </SelectItem>
                                ))
                              )}
                              <SelectItem value="new">➕ Add New Category</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Enter item description" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Price</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="isAvailable"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Available</FormLabel>
                          <FormControl>
                            <div className="flex items-center space-x-2">
                              <Switch
                                checked={field.value || false}
                                onCheckedChange={field.onChange}
                              />
                              <span>{field.value ? 'Available' : 'Unavailable'}</span>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="imageUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <ImageUpload
                            value={field.value}
                            onChange={field.onChange}
                            type="menu"
                            label="Menu Item Image"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Product Selection */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">Select Products to Link</Label>
                    {loadingProducts ? (
                      <div className="flex items-center gap-2 text-sm text-gray-500 py-4">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Loading products...
                      </div>
                    ) : products.length === 0 ? (
                      <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                        <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-yellow-900">No Products Available</p>
                          <p className="text-sm text-yellow-800 mt-1">
                            Create products first before creating a menu. Products are the individual items that can be ordered.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-60 overflow-y-auto border rounded-md p-4">
                        <p className="text-xs text-gray-500 mb-2">
                          Choose one or more products to associate with this menu item.
                        </p>
                        {Object.entries(productsByCategory).map(([category, categoryProducts]) => {
                          const products = Array.isArray(categoryProducts) ? categoryProducts : [];
                          return (
                          <div key={category} className="space-y-2">
                            <Label className="text-sm font-semibold text-gray-700">{category}</Label>
                            <div className="space-y-2 pl-4">
                              {products.map((product: any) => (
                                <div key={product.id} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`product-${product.id}`}
                                    checked={selectedProductIds.includes(product.id)}
                                    onCheckedChange={() => handleProductToggle(product.id)}
                                  />
                                  <Label
                                    htmlFor={`product-${product.id}`}
                                    className="text-sm font-normal cursor-pointer flex-1"
                                  >
                                    {product.name} - €{product.price?.toFixed(2)}
                                  </Label>
                                </div>
                              ))}
                            </div>
                          </div>
                          );
                        })}
                        {selectedProductIds.length > 0 && (
                          <p className="text-xs text-gray-600 mt-2 pt-2 border-t">
                            {selectedProductIds.length} product{selectedProductIds.length !== 1 ? 's' : ''} selected
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsCreateDialogOpen(false);
                        setSelectedProductIds([]);
                        form.reset();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">Create Item</Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Warning Banner - No Products Available */}
      {!hasProducts && !checkingProducts && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <AlertTriangle className="h-6 w-6 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-900 mb-1">
                  No Products Available
                </h3>
                <p className="text-sm text-yellow-800 mb-3">
                  You need to create products before you can create menu items. 
                  Products are the individual items that can be ordered, while menus 
                  organize and display these products.
                </p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => router.push('/admin/products')}
                  className="border-yellow-600 text-yellow-900 hover:bg-yellow-100"
                >
                  <Package className="mr-2 h-4 w-4" />
                  Create Products First
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Menu Statistics */}
      {!loadingMenuItems && menuItems.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <Package className="w-4 h-4 mr-2" />
                Total Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-gray-500 mt-1">
                Across {stats.categories} categories
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                Available
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.available}</div>
              <p className="text-xs text-gray-500 mt-1">
                {stats.total > 0 ? Math.round((stats.available / stats.total) * 100) : 0}% of total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <DollarSign className="w-4 h-4 mr-2 text-blue-500" />
                Avg Price
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">€{stats.avgPrice.toFixed(2)}</div>
              <p className="text-xs text-gray-500 mt-1">
                Total value: €{stats.totalValue.toFixed(2)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <TrendingUp className="w-4 h-4 mr-2 text-purple-500" />
                Categories
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{stats.categories}</div>
              <p className="text-xs text-gray-500 mt-1">
                Menu organization
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Search menu items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category: MenuCategory) => (
                  <SelectItem key={category.id} value={category.name}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Items" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Items</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="unavailable">Unavailable</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedItems.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                {selectedItems.length} item{selectedItems.length > 1 ? 's' : ''} selected
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

      {/* Menu Items Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={selectedItems.length === filteredMenuItems.length && filteredMenuItems.length > 0}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedItems(filteredMenuItems.map((item: MenuItem) => item.id));
                      } else {
                        setSelectedItems([]);
                      }
                    }}
                  />
                </TableHead>
                <TableHead>Image</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="w-[70px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingMenuItems ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    Loading menu items...
                  </TableCell>
                </TableRow>
              ) : menuError ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-red-600">
                    Error loading menu items. Please check console for details.
                    <br />
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2"
                      onClick={() => queryClient.invalidateQueries({ queryKey: queryKeys.menuItems })}
                    >
                      Retry
                    </Button>
                  </TableCell>
                </TableRow>
              ) : filteredMenuItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    No menu items found. Total items in database: {pagination.total}
                    <br />
                    <span className="text-sm text-gray-500">
                      Try adjusting your filters or add new menu items.
                    </span>
                  </TableCell>
                </TableRow>
              ) : (
                filteredMenuItems.map((item: MenuItem) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedItems.includes(item.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedItems(prev => [...prev, item.id]);
                          } else {
                            setSelectedItems(prev => prev.filter(id => id !== item.id));
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      {item.imageUrl ? (
                        <img
                          src={getImageUrl(item.imageUrl) || ''}
                          alt={item.name}
                          className="w-12 h-12 rounded-lg object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const fallback = target.nextElementSibling as HTMLElement;
                            if (fallback) fallback.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center" style={{ display: item.imageUrl ? 'none' : 'flex' }}>
                        <span className="text-gray-500 text-xs">No Image</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{item.name}</div>
                        {item.description && (
                          <div className="text-sm text-gray-500 truncate max-w-[200px]">
                            {item.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {typeof (item as any).category === 'string' 
                          ? (item as any).category 
                          : (item as any).category?.name || (item as any).categoryRef?.name || 'No Category'}
                      </Badge>
                    </TableCell>
                    <TableCell>€{item.price.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={item.isAvailable ? 'default' : 'secondary'}>
                        {item.isAvailable ? 'Available' : 'Unavailable'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(item.updatedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(item)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setViewingItem(item)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-red-600 focus:text-red-600"
                            onClick={() => {
                              console.log('🗑️ Delete clicked for:', item.name);
                              setDeletingItem(item);
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
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

      {/* Total Products Display */}
      {!loadingMenuItems && menuItems.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{pagination.total}</div>
                <div className="text-sm text-gray-600">Total Products in Menu</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Menu Item</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleUpdate)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter item name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category *</FormLabel>
                      <Select onValueChange={(value) => {
                        const categoryId = parseInt(value);
                        
                        // Validate that the category exists
                        const selectedCategory = categories.find((cat: MenuCategory) => cat.id === categoryId);
                        
                        if (!selectedCategory) {
                          console.error('❌ CATEGORY VALIDATION ERROR - Invalid category selected:', {
                            categoryId: categoryId,
                            availableCategories: categories.map((c: MenuCategory) => ({ id: c.id, name: c.name })),
                          });
                          toast.error('Invalid category selected. Please choose a valid category.');
                          return;
                        }
                        
                        console.log('✅ CATEGORY SELECTED - Valid category:', {
                          categoryId: categoryId,
                          categoryName: selectedCategory.name,
                        });
                        
                        field.onChange(categoryId);
                      }} value={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger className={!field.value ? 'border-red-300' : ''}>
                            <SelectValue placeholder="Select category (required)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.length === 0 ? (
                            <SelectItem value="no-categories" disabled>
                              No categories available
                            </SelectItem>
                          ) : (
                            categories.map((category: MenuCategory) => (
                              <SelectItem key={category.id} value={category.id.toString()}>
                                {category.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Enter item description" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isAvailable"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Available</FormLabel>
                      <FormControl>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={field.value || false}
                            onCheckedChange={field.onChange}
                          />
                          <span>{field.value ? 'Available' : 'Unavailable'}</span>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <ImageUpload
                        value={field.value}
                        onChange={field.onChange}
                        type="menu"
                        label="Menu Item Image"
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
                  onClick={() => setEditingItem(null)}
                >
                  Cancel
                </Button>
                <Button type="submit">Update Item</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* New Category Dialog */}
      <Dialog open={isNewCategoryDialogOpen} onOpenChange={setIsNewCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="new-category">Category Name</Label>
              <Input
                id="new-category"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Enter category name"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateCategory();
                  }
                }}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsNewCategoryDialogOpen(false);
                  setNewCategoryName('');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateCategory}
                disabled={!newCategoryName.trim()}
              >
                Create Category
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingItem} onOpenChange={(open) => !open && setDeletingItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Menu Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingItem?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingItem(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View Details Dialog */}
      <Dialog open={!!viewingItem} onOpenChange={(open) => !open && setViewingItem(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Menu Item Details</DialogTitle>
          </DialogHeader>
          {viewingItem && (
            <div className="space-y-6">
              {/* Image */}
              <div className="relative w-full h-64 rounded-lg overflow-hidden bg-gray-200">
                {viewingItem.imageUrl ? (
                  <img
                    src={getImageUrl(viewingItem.imageUrl) || ''}
                    alt={viewingItem.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500">
                    <span>No Image Available</span>
                  </div>
                )}
              </div>

              {/* Basic Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-semibold text-gray-600">Name</Label>
                  <p className="text-lg font-medium">{viewingItem.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-semibold text-gray-600">Price</Label>
                  <p className="text-lg font-medium">€{viewingItem.price.toFixed(2)}</p>
                </div>
                <div>
                  <Label className="text-sm font-semibold text-gray-600">Category</Label>
                  <p className="text-base">
                    {typeof (viewingItem as any).category === 'string' 
                      ? (viewingItem as any).category 
                      : (viewingItem as any).category?.name || (viewingItem as any).categoryRef?.name || 'No Category'}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-semibold text-gray-600">Status</Label>
                  <Badge variant={viewingItem.isAvailable ? 'default' : 'secondary'}>
                    {viewingItem.isAvailable ? 'Available' : 'Unavailable'}
                  </Badge>
                </div>
              </div>

              {/* Description */}
              {viewingItem.description && (
                <div>
                  <Label className="text-sm font-semibold text-gray-600">Description</Label>
                  <p className="text-base text-gray-700 mt-1">{viewingItem.description}</p>
                </div>
              )}

              {/* Additional Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-semibold text-gray-600">Created At</Label>
                  <p className="text-base">{new Date(viewingItem.createdAt).toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-sm font-semibold text-gray-600">Last Updated</Label>
                  <p className="text-base">{new Date(viewingItem.updatedAt).toLocaleString()}</p>
                </div>
              </div>

              {/* Products in Combo (if applicable) */}
              {(viewingItem as any).products && Array.isArray((viewingItem as any).products) && (viewingItem as any).products.length > 0 && (
                <div>
                  <Label className="text-sm font-semibold text-gray-600 mb-2 block">Products in Combo</Label>
                  <div className="space-y-2">
                    {(viewingItem as any).products.map((product: any, index: number) => (
                      <div key={product.id || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{product.name}</p>
                          {product.description && (
                            <p className="text-sm text-gray-600">{product.description}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-medium">€{product.price?.toFixed(2) || '0.00'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Menu Products (junction table data) */}
              {(viewingItem as any).menuProducts && Array.isArray((viewingItem as any).menuProducts) && (viewingItem as any).menuProducts.length > 0 && (
                <div>
                  <Label className="text-sm font-semibold text-gray-600 mb-2 block">Linked Products</Label>
                  <div className="space-y-2">
                    {(viewingItem as any).menuProducts.map((mp: any, index: number) => (
                      <div key={mp.id || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{mp.product?.name || `Product ID: ${mp.productId}`}</p>
                          {mp.product?.description && (
                            <p className="text-sm text-gray-600">{mp.product.description}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Quantity: {mp.quantity || 1}</p>
                          {mp.product?.price && (
                            <p className="font-medium">€{mp.product.price.toFixed(2)}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Allergen Information */}
              {(viewingItem as any).allergenCodes && Array.isArray((viewingItem as any).allergenCodes) && (viewingItem as any).allergenCodes.length > 0 && (
                <div>
                  <Label className="text-sm font-semibold text-gray-600">Allergen Codes</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {(viewingItem as any).allergenCodes.map((code: number, index: number) => (
                      <Badge key={index} variant="outline">{code}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Dietary Notes */}
              {(viewingItem as any).dietaryNotes && Array.isArray((viewingItem as any).dietaryNotes) && (viewingItem as any).dietaryNotes.length > 0 && (
                <div>
                  <Label className="text-sm font-semibold text-gray-600">Dietary Notes</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {(viewingItem as any).dietaryNotes.map((note: string, index: number) => (
                      <Badge key={index} variant="secondary">{note}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Type */}
              {(viewingItem as any).type && (
                <div>
                  <Label className="text-sm font-semibold text-gray-600">Type</Label>
                  <Badge variant="outline">{(viewingItem as any).type}</Badge>
                </div>
              )}
            </div>
          )}
          <div className="flex justify-end mt-4">
            <Button onClick={() => setViewingItem(null)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}