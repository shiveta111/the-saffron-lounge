'use client';

import { useState } from 'react';
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
import { Search, Package, AlertTriangle, CheckCircle, RefreshCw, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { getImageUrl } from '../../../lib/image-utils';

export default function InventoryManagementPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [stockFilter, setStockFilter] = useState<string>('all');
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editValue, setEditValue] = useState<number>(0);

    const queryClient = useQueryClient();

    // Fetch products for inventory
    const { data: productsResponse, isLoading, refetch } = useQuery({
        queryKey: ['inventory-products'],
        queryFn: async () => {
            // Use a reasonable limit to avoid 400 errors
            const response = await apiClient.getProducts({ limit: 100 });
            return response;
        },
    });

    const products = Array.isArray(productsResponse?.data)
        ? productsResponse.data
        : Array.isArray(productsResponse?.data?.products)
            ? productsResponse.data.products
            : [];

    // Update stock mutation
    const updateStockMutation = useMutation({
        mutationFn: async ({ id, availability }: { id: number; availability: number }) => {
            return apiClient.updateProduct(id, { availability, isAvailable: availability > 0 });
        },
        onSuccess: () => {
            toast.success('Stock updated successfully');
            setEditingId(null);
            queryClient.invalidateQueries({ queryKey: ['inventory-products'] });
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to update stock');
        },
    });

    // Filter products
    const filteredProducts = products.filter((product: any) => {
        const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.sku?.toLowerCase().includes(searchTerm.toLowerCase());

        let matchesStock = true;
        if (stockFilter === 'low') {
            matchesStock = product.availability > 0 && product.availability < 10;
        } else if (stockFilter === 'out') {
            matchesStock = product.availability === 0;
        } else if (stockFilter === 'in') {
            matchesStock = product.availability >= 10;
        }

        return matchesSearch && matchesStock;
    });

    // Calculate stats
    const stats = {
        total: products.length,
        lowStock: products.filter((p: any) => p.availability > 0 && p.availability < 10).length,
        outOfStock: products.filter((p: any) => p.availability === 0).length,
        totalValue: products.reduce((sum: number, p: any) => sum + (p.price * p.availability), 0),
    };

    const handleStartEdit = (product: any) => {
        setEditingId(product.id);
        setEditValue(product.availability);
    };

    const handleSaveEdit = (id: number) => {
        if (editValue < 0) {
            toast.error('Stock cannot be negative');
            return;
        }
        updateStockMutation.mutate({ id, availability: editValue });
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold text-gray-900">Inventory Management</h2>
                    <p className="text-gray-600 mt-1">Track and update product stock levels</p>
                </div>
                <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
                    <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center">
                            <Package className="w-4 h-4 mr-2" />
                            Total Products
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.total}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center">
                            <AlertTriangle className="w-4 h-4 mr-2 text-yellow-500" />
                            Low Stock
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-yellow-600">{stats.lowStock}</div>
                        <p className="text-xs text-gray-500 mt-1">Less than 10 items</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center">
                            <AlertTriangle className="w-4 h-4 mr-2 text-red-500" />
                            Out of Stock
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{stats.outOfStock}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center">
                            <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                            Total Value
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">€{stats.totalValue.toFixed(2)}</div>
                        <p className="text-xs text-gray-500 mt-1">Based on current stock</p>
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
                                    placeholder="Search by name or SKU..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10"
                                />
                            </div>
                        </div>
                        <Select value={stockFilter} onValueChange={setStockFilter}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="All Stock Levels" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Levels</SelectItem>
                                <SelectItem value="in">In Stock (10+)</SelectItem>
                                <SelectItem value="low">Low Stock (&lt; 10)</SelectItem>
                                <SelectItem value="out">Out of Stock (0)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Inventory Table */}
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Product Name</TableHead>
                                <TableHead>SKU</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Current Stock</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="w-[150px]">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8">
                                        Loading inventory...
                                    </TableCell>
                                </TableRow>
                            ) : filteredProducts.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8">
                                        No products found matching your filters.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredProducts.map((product: any) => (
                                    <TableRow key={product.id}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-3">
                                                {product.imageUrl && (
                                                    <img
                                                        src={getImageUrl(product.imageUrl) || ''}
                                                        alt={product.name}
                                                        className="w-8 h-8 rounded object-cover"
                                                        onError={(e) => {
                                                            // Hide broken images
                                                            e.currentTarget.style.display = 'none';
                                                        }}
                                                    />
                                                )}
                                                {product.name}
                                            </div>
                                        </TableCell>
                                        <TableCell>{product.sku || '-'}</TableCell>
                                        <TableCell>{product.category}</TableCell>
                                        <TableCell>
                                            {editingId === product.id ? (
                                                <Input
                                                    type="number"
                                                    value={editValue}
                                                    onChange={(e) => setEditValue(parseInt(e.target.value) || 0)}
                                                    className="w-24 h-8"
                                                    min="0"
                                                />
                                            ) : (
                                                <span className="font-mono">{product.availability}</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {product.availability === 0 ? (
                                                <Badge variant="destructive">Out of Stock</Badge>
                                            ) : product.availability < 10 ? (
                                                <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">Low Stock</Badge>
                                            ) : (
                                                <Badge className="bg-green-100 text-green-800 hover:bg-green-200">In Stock</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {editingId === product.id ? (
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleSaveEdit(product.id)}
                                                        disabled={updateStockMutation.isPending}
                                                    >
                                                        <Save className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => setEditingId(null)}
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleStartEdit(product)}
                                                >
                                                    Update Stock
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
