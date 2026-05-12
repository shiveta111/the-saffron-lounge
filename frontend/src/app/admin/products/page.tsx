'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../lib/api-client';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { Badge } from '../../../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import { Plus, Search, Edit, Trash2, Package, RefreshCw, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { getImageUrl } from '../../../lib/image-utils';
import { lazy, Suspense } from 'react';

// Lazy load heavy modals and forms
const ErrorModal = lazy(() => import('../../../components/admin/error-modal').then(m => ({ default: m.ErrorModal })));
const ProductForm = lazy(() => import('../../../components/admin/ProductForm').then(m => ({ default: m.ProductForm })));
const ProductDetailsModal = lazy(() => import('../../../components/ProductDetailsModal').then(m => ({ default: m.ProductDetailsModal })));

export default function ProductsManagementPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedAvailability, setSelectedAvailability] = useState<string>('all');
  const [selectedMenuLinkage, setSelectedMenuLinkage] = useState<string>('all');
  const [productFormOpen, setProductFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [errorModal, setErrorModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    details?: string;
    suggestions?: string[];
  }>({
    isOpen: false,
    title: '',
    message: '',
    details: '',
    suggestions: []
  });
  const queryClient = useQueryClient();
  const router = useRouter();

  // Fetch products
  const { data: productsResponse, isLoading, error, refetch } = useQuery({
    queryKey: ['products', selectedCategory, searchTerm],
    queryFn: async () => {
      try {
        const params: any = {};
        if (selectedCategory !== 'all') params.category = selectedCategory;
        if (searchTerm) params.search = searchTerm;
        
        const response = await apiClient.getProducts(params);
        return response;
      } catch (err: any) {
        setErrorModal({
          isOpen: true,
          title: 'Failed to Load Products',
          message: err.error || 'Unable to fetch products from the server.',
          details: err.message,
          suggestions: [
            'Check if the backend server is running on port 8000',
            'Verify your authentication token is valid',
            'Ensure the products table has data',
            'Try refreshing the page'
          ]
        });
        throw err;
      }
    },
  });

  // Fetch menu items for linkage
  const { data: menuResponse } = useQuery({
    queryKey: ['menu-items'],
    queryFn: async () => {
      const response = await apiClient.getMenuItems();
      return response;
    },
  });

  // Fetch categories
  const { data: categoriesResponse } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await apiClient.getCategories();
      return response;
    },
  });

  const products = Array.isArray(productsResponse?.data)
    ? productsResponse.data
    : [];

  const menuItems = Array.isArray(menuResponse?.data?.items)
    ? menuResponse.data.items
    : [];

  // Handle different response formats for categories
  let categories: Array<{ id: number; name: string }> = [];
  if (categoriesResponse?.data) {
    if (Array.isArray(categoriesResponse.data)) {
      categories = categoriesResponse.data.map((c: any) => ({ id: c.id, name: c.name }));
    } else if (Array.isArray(categoriesResponse.data.categories)) {
      categories = categoriesResponse.data.categories.map((c: any) => ({ id: c.id, name: c.name }));
    } else if (Array.isArray(categoriesResponse.data.data)) {
      categories = categoriesResponse.data.data.map((c: any) => ({ id: c.id, name: c.name }));
    }
  }
  
  const categoryNames = categories.map((c: any) => c.name).filter((name: string) => name && name.trim() !== '');

  // Filter products client-side
  const filteredProducts = products.filter((product: any) => {
    if (selectedType !== 'all' && product.type !== selectedType) return false;
    if (selectedAvailability === 'available' && !product.isAvailable) return false;
    if (selectedAvailability === 'unavailable' && product.isAvailable) return false;
    if (selectedMenuLinkage === 'linked' && !product.menuId) return false;
    if (selectedMenuLinkage === 'unlinked' && product.menuId) return false;
    return true;
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: any) => apiClient.createProduct(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      
      // Check if this is the first product
      const productCount = products.length + 1;
      
      if (productCount === 1) {
        toast.success('First product created!', {
          description: 'You can now create menus to organize your products.',
          action: {
            label: 'Create Menu',
            onClick: () => router.push('/admin/menu')
          }
        });
      } else {
        toast.success('Product created successfully');
      }
      
      setProductFormOpen(false);
    },
    onError: (error: any) => {
      console.error('Product creation error:', error);
      console.error('Error response:', error.response?.data);
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.error || 
                          error.message ||
                          'Failed to create product';
      
      // Handle validation errors array
      let errorDetails = '';
      if (error.response?.data?.details) {
        if (Array.isArray(error.response.data.details)) {
          errorDetails = error.response.data.details
            .map((d: any) => `${d.field}: ${d.message}`)
            .join(', ');
        } else if (typeof error.response.data.details === 'string') {
          errorDetails = error.response.data.details;
        }
      }
      
      toast.error(errorMessage, {
        description: errorDetails || 'Please check the form and try again'
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiClient.updateProduct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product updated successfully');
      setEditingProduct(null);
      setProductFormOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.error || 'Failed to update product');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.error || 'Failed to delete product');
    },
  });

  const handleDelete = (id: number, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  const handleEdit = (product: any) => {
    setEditingProduct(product);
    setProductFormOpen(true);
  };

  const handleCreate = () => {
    setEditingProduct(null);
    setProductFormOpen(true);
  };

  const handleFormSubmit = async (data: any) => {
    if (editingProduct) {
      await updateMutation.mutateAsync({ id: editingProduct.id, data });
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  return (
    <>
      {errorModal.isOpen && (
        <Suspense fallback={null}>
          <ErrorModal
            isOpen={errorModal.isOpen}
            onClose={() => setErrorModal({ ...errorModal, isOpen: false })}
            title={errorModal.title}
            message={errorModal.message}
            details={errorModal.details}
            suggestions={errorModal.suggestions}
          />
        </Suspense>
      )}

      {productFormOpen && (
        <Suspense fallback={null}>
          <ProductForm
            open={productFormOpen}
            onClose={() => {
              setProductFormOpen(false);
              setEditingProduct(null);
            }}
            onSubmit={handleFormSubmit}
            initialData={editingProduct}
            categories={categories || []}
            isLoading={createMutation.isPending || updateMutation.isPending}
          />
        </Suspense>
      )}

      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Product Management ttt</h1>
            <p className="text-gray-500 mt-1">Manage products linked to menu items</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => refetch()} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-500">Total Products</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{products.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-500">Available</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {products.filter((p: any) => p.isAvailable).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-500">Out of Stock</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">
                {products.filter((p: any) => !p.isAvailable).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-500">Linked to Menu</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">
                {products.filter((p: any) => p.menuId).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categoryNames.map((cat: string) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="Vegetarian">Vegetarian</SelectItem>
                  <SelectItem value="Non-Vegetarian">Non-Vegetarian</SelectItem>
                  <SelectItem value="Vegan">Vegan</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedAvailability} onValueChange={setSelectedAvailability}>
                <SelectTrigger>
                  <SelectValue placeholder="Availability" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="unavailable">Unavailable</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedMenuLinkage} onValueChange={setSelectedMenuLinkage}>
                <SelectTrigger>
                  <SelectValue placeholder="Menu Linkage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="linked">Linked to Menu</SelectItem>
                  <SelectItem value="unlinked">Not Linked</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Products Table */}
        <Card>
          <CardHeader>
            <CardTitle>Products List ({filteredProducts.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Loading products...</div>
            ) : error ? (
              <div className="text-center py-8 text-red-600">
                Error loading products. Please try again.
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No products found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Menu Link</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((product: any) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">{product.id}</TableCell>
                        <TableCell> 
                          <div className="flex items-center gap-2">
                            <img
                              src={getImageUrl(product.imageUrl) || '/assets-main/menu/coming-soon.png'}
                              alt={product.name}
                              className="h-10 w-10 rounded object-cover"
                              onError={(e) => {
                                e.currentTarget.src = '/assets-main/menu/coming-soon.png';
                              }}
                            />
                            <span className="font-medium">{product.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {product.menu ? (
                            <span className="text-sm text-gray-600">
                              Menu #{product.menuId}: {product.menu.name}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400">No menu link</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{product.category}</Badge>
                        </TableCell>
                        <TableCell>
                          {product.type && (
                            <Badge
                              variant="outline"
                              className={
                                product.type === 'Vegetarian' ? 'bg-green-50 text-green-700' :
                                  product.type === 'Vegan' ? 'bg-green-100 text-green-800' :
                                    product.type === 'Non-Vegetarian' ? 'bg-red-50 text-red-700' :
                                      ''
                              }
                            >
                              {product.type}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-semibold">€{product.price.toFixed(2)}</TableCell>
                        <TableCell>
                          <span className={product.availability > 10 ? 'text-green-600' : product.availability > 0 ? 'text-orange-600' : 'text-red-600'}>
                            {product.availability} units
                          </span>
                        </TableCell>
                        <TableCell>
                          {product.isAvailable ? (
                            <Badge className="bg-green-100 text-green-800">Available</Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-800">Unavailable</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">{product.sku || 'N/A'}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedProductId(product.id);
                                setShowProductModal(true);
                              }}
                              title="Preview product details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(product)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => handleDelete(product.id, product.name)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {showProductModal && (
        <Suspense fallback={null}>
          <ProductDetailsModal
            isOpen={showProductModal}
            onClose={() => {
              setShowProductModal(false);
              setSelectedProductId(null);
            }}
            productId={selectedProductId || undefined}
            entityType="product"
          />
        </Suspense>
      )}
    </>
  );
}
