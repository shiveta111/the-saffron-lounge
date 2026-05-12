'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '../ui/dialog';
import { Switch } from '../ui/switch';
import { Checkbox } from '../ui/checkbox';
import { Loader2, AlertTriangle } from 'lucide-react';
import { apiClient } from '../../lib/api-client';
import { useQuery } from '@tanstack/react-query';

// Custom validation for imageUrl that accepts empty strings, relative URLs, and absolute URLs
const imageUrlSchema = z.string().refine(
    (val) => {
        // Allow empty string
        if (!val || val === '') return true;
        // Allow relative URLs (starting with /)
        if (val.startsWith('/')) return true;
        // Allow absolute URLs (http:// or https://)
        if (val.startsWith('http://') || val.startsWith('https://')) {
            try {
                new URL(val);
                return true;
            } catch {
                return false;
            }
        }
        // Allow data URLs
        if (val.startsWith('data:')) return true;
        return false;
    },
    { message: 'Invalid URL format' }
).optional().or(z.literal(''));

const menuSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(255, 'Name too long'),
    description: z.string().min(10, 'Description must be at least 10 characters'),
    price: z.number().min(0, 'Price must be positive').optional(), // Optional - will be calculated from products
    category: z.string().min(1, 'Category is required'),
    type: z.enum(['Vegetarian', 'Non-Vegetarian', 'Vegan', 'All']),
    imageUrl: imageUrlSchema,
    isAvailable: z.boolean(),
    isSpecial: z.boolean(),
    preparationTime: z.number().int().min(0, 'Preparation time must be positive').optional(),
    dietaryNotes: z.string().optional(),
    allergenCodes: z.string().optional(),
    nutritionalInfo: z.string().optional(),
    productIds: z.array(z.number()).min(1, 'At least one product must be selected'), // Required - at least one product
});

type MenuFormData = z.infer<typeof menuSchema>;

interface MenuFormProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (data: MenuFormData) => Promise<void>;
    initialData?: Partial<MenuFormData>;
    categories: string[];
    isLoading?: boolean;
}

export function MenuForm({
    open,
    onClose,
    onSubmit,
    initialData,
    categories,
    isLoading = false,
}: MenuFormProps) {
    const [submitting, setSubmitting] = useState(false);
    const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);

    // Fetch products when form opens
    const { data: productsResponse, isLoading: loadingProducts } = useQuery({
        queryKey: ['products-for-menu'],
        queryFn: async () => {
            const response = await apiClient.getProducts({ limit: 1000 });
            return response;
        },
        enabled: open, // Only fetch when dialog is open
    });

    const products = Array.isArray(productsResponse?.data) ? productsResponse.data : [];

    const {
        register,
        handleSubmit,
        formState: { errors },
        setValue,
        watch,
        reset,
    } = useForm<MenuFormData>({
        resolver: zodResolver(menuSchema),
        defaultValues: {
            name: initialData?.name || '',
            description: initialData?.description || '',
            category: initialData?.category || '',
            type: (initialData?.type || 'All') as 'Vegetarian' | 'Non-Vegetarian' | 'Vegan' | 'All',
            isAvailable: initialData?.isAvailable ?? true,
            isSpecial: initialData?.isSpecial ?? false,
            productIds: initialData?.productIds || [],
            price: initialData?.price,
            imageUrl: initialData?.imageUrl,
            preparationTime: initialData?.preparationTime,
            dietaryNotes: initialData?.dietaryNotes,
            allergenCodes: initialData?.allergenCodes,
            nutritionalInfo: initialData?.nutritionalInfo,
        },
    });

    const isAvailable = watch('isAvailable');
    const isSpecial = watch('isSpecial');

    useEffect(() => {
        if (initialData) {
            Object.keys(initialData).forEach((key) => {
                setValue(key as keyof MenuFormData, initialData[key as keyof MenuFormData] as any);
            });
            // Set selected products if editing
            if (initialData.productIds) {
                setSelectedProductIds(initialData.productIds);
            }
        } else {
            setSelectedProductIds([]);
        }
    }, [initialData, setValue]);

    const handleProductToggle = (productId: number) => {
        const newSelection = selectedProductIds.includes(productId)
            ? selectedProductIds.filter(id => id !== productId)
            : [...selectedProductIds, productId];
        setSelectedProductIds(newSelection);
        setValue('productIds', newSelection);
    };

    // Group products by category
    const productsByCategory = products.reduce((acc: Record<string, any[]>, product: any) => {
        const category = product.category || 'Uncategorized';
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(product);
        return acc;
    }, {});

    const handleFormSubmit = async (data: MenuFormData) => {
        setSubmitting(true);
        try {
            // Calculate price from selected products if products are selected
            const calculatedPrice = selectedProductIds.length > 0
                ? products
                    .filter((p: any) => selectedProductIds.includes(p.id))
                    .reduce((sum: number, p: any) => sum + (p.price || 0), 0)
                : data.price || 0;

            // Include selected product IDs in the submission (required)
            const submitData = {
                ...data,
                productIds: selectedProductIds, // Required - at least one product
                price: calculatedPrice, // Use calculated price
            };
            await onSubmit(submitData);
            reset();
            setSelectedProductIds([]);
            onClose();
        } catch (error) {
            console.error('Form submission error:', error);
        } finally {
            setSubmitting(false);
        }
    };

    const handleClose = () => {
        reset();
        setSelectedProductIds([]);
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{initialData ? 'Edit Menu Item' : 'Create New Menu Item'}</DialogTitle>
                    <DialogDescription>
                        {initialData
                            ? 'Update menu item details and settings'
                            : 'Add a new menu item to display on the public menu'}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
                    {/* Basic Information */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Basic Information</h3>

                        <div className="space-y-2">
                            <Label htmlFor="name">Menu Item Name *</Label>
                            <Input
                                id="name"
                                {...register('name')}
                                placeholder="e.g., Margherita Pizza"
                            />
                            {errors.name && (
                                <p className="text-sm text-red-600">{errors.name.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Description *</Label>
                            <Textarea
                                id="description"
                                {...register('description')}
                                placeholder="Describe the menu item..."
                                rows={3}
                            />
                            {errors.description && (
                                <p className="text-sm text-red-600">{errors.description.message}</p>
                            )}
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="price">Price (€) {selectedProductIds.length > 0 && '(Auto-calculated)'}</Label>
                                <Input
                                    id="price"
                                    type="number"
                                    step="0.01"
                                    {...register('price', { valueAsNumber: true })}
                                    placeholder="0.00"
                                    disabled={selectedProductIds.length > 0}
                                    value={selectedProductIds.length > 0 
                                        ? products
                                            .filter((p: any) => selectedProductIds.includes(p.id))
                                            .reduce((sum: number, p: any) => sum + (p.price || 0), 0)
                                            .toFixed(2)
                                        : watch('price') || ''}
                                />
                                {selectedProductIds.length > 0 && (
                                    <p className="text-xs text-gray-500">
                                        Calculated from selected products
                                    </p>
                                )}
                                {errors.price && (
                                    <p className="text-sm text-red-600">{errors.price.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="category">Category *</Label>
                                <Select
                                    value={watch('category')}
                                    onValueChange={(value) => setValue('category', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories.map((cat) => (
                                            <SelectItem key={cat} value={cat}>
                                                {cat}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.category && (
                                    <p className="text-sm text-red-600">{errors.category.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="preparationTime">Prep Time (min)</Label>
                                <Input
                                    id="preparationTime"
                                    type="number"
                                    {...register('preparationTime', { valueAsNumber: true })}
                                    placeholder="15"
                                />
                                {errors.preparationTime && (
                                    <p className="text-sm text-red-600">{errors.preparationTime.message}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Dietary Information */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Dietary Information</h3>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="type">Dietary Type *</Label>
                                <Select
                                    value={watch('type')}
                                    onValueChange={(value) => setValue('type', value as any)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Vegetarian">Vegetarian</SelectItem>
                                        <SelectItem value="Non-Vegetarian">Non-Vegetarian</SelectItem>
                                        <SelectItem value="Vegan">Vegan</SelectItem>
                                        <SelectItem value="All">All</SelectItem>
                                    </SelectContent>
                                </Select>
                                {errors.type && (
                                    <p className="text-sm text-red-600">{errors.type.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="allergenCodes">Allergen Codes</Label>
                                <Input
                                    id="allergenCodes"
                                    {...register('allergenCodes')}
                                    placeholder="e.g., GLUTEN, DAIRY, NUTS"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="dietaryNotes">Dietary Notes</Label>
                            <Textarea
                                id="dietaryNotes"
                                {...register('dietaryNotes')}
                                placeholder="Additional dietary information..."
                                rows={2}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="nutritionalInfo">Nutritional Information (JSON)</Label>
                            <Textarea
                                id="nutritionalInfo"
                                {...register('nutritionalInfo')}
                                placeholder='{"calories": 250, "protein": "12g", "carbs": "30g"}'
                                rows={2}
                            />
                        </div>
                    </div>

                    {/* Product Selection */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Product Selection</h3>
                        
                        {loadingProducts ? (
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Loading products...
                            </div>
                        ) : products.length === 0 ? (
                            <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-yellow-900">No Products Available</p>
                                    <p className="text-sm text-yellow-800 mt-1">
                                        You need to create products before creating a menu. Products are the individual items that can be ordered.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3 max-h-60 overflow-y-auto border rounded-md p-4">
                                <Label className="text-sm font-medium">Select Products to Link to This Menu</Label>
                                <p className="text-xs text-gray-500 mb-3">
                                    Choose one or more products that will be associated with this menu item.
                                </p>
                                {(Object.entries(productsByCategory) as [string, any[]][]).map(([category, categoryProducts]) => (
                                    <div key={category} className="space-y-2">
                                        <Label className="text-sm font-semibold text-gray-700">{category}</Label>
                                        <div className="space-y-2 pl-4">
                                            {categoryProducts.map((product: any) => (
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
                                ))}
                                {selectedProductIds.length > 0 && (
                                    <p className="text-xs text-gray-600 mt-2 pt-2 border-t">
                                        {selectedProductIds.length} product{selectedProductIds.length !== 1 ? 's' : ''} selected
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Image & Settings */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Image & Settings</h3>

                        <div className="space-y-2">
                            <Label htmlFor="imageUrl">Image URL</Label>
                            <Input
                                id="imageUrl"
                                {...register('imageUrl')}
                                placeholder="https://example.com/image.jpg"
                            />
                            {errors.imageUrl && (
                                <p className="text-sm text-red-600">{errors.imageUrl.message}</p>
                            )}
                        </div>

                        <div className="flex items-center space-x-6">
                            <div className="flex items-center space-x-2">
                                <Switch
                                    id="isAvailable"
                                    checked={isAvailable}
                                    onCheckedChange={(checked) => setValue('isAvailable', checked)}
                                />
                                <Label htmlFor="isAvailable">Available</Label>
                            </div>

                            <div className="flex items-center space-x-2">
                                <Switch
                                    id="isSpecial"
                                    checked={isSpecial}
                                    onCheckedChange={(checked) => setValue('isSpecial', checked)}
                                />
                                <Label htmlFor="isSpecial">Special Item</Label>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={handleClose} disabled={submitting}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={submitting}>
                            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {initialData ? 'Update Menu Item' : 'Create Menu Item'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
