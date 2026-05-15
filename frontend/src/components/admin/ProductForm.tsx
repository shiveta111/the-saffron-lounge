'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
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
import { Loader2 } from 'lucide-react';
import { ImageUpload } from './image-upload';

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

const productSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(255, 'Name too long'),
    description: z.string().optional(),
    price: z.number().min(0.01, 'Price must be greater than 0'),
    categoryIds: z.array(z.number().min(1)).min(1, 'Please select at least one category'),
    imageUrl: imageUrlSchema,
    isAvailable: z.boolean(),
    availability: z.number().int().min(0, 'Stock must be non-negative'),
    dietaryNotes: z.string().optional(),
    allergenCodes: z.string().optional(),
    type: z.string().optional(),
    sku: z.string().optional(),
    preparationTime: z.number().int().min(0).optional(),
    nutritionalInfo: z.string().optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

interface ProductFormProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (data: any) => Promise<void>;
    initialData?: any;
    categories: Array<{ id: number; name: string }>;
    isLoading?: boolean;
}

export function ProductForm({
    open,
    onClose,
    onSubmit,
    initialData,
    categories,
    isLoading = false,
}: ProductFormProps) {
    const [submitting, setSubmitting] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
        setValue,
        watch,
        reset,
        getValues,
    } = useForm<ProductFormData>({
        resolver: zodResolver(productSchema),
        mode: 'onChange', // Validate on change for better UX
        defaultValues: (() => {
            if (initialData) {
                const existingCategoryIds: number[] =
                    Array.isArray(initialData.categoryIds) && initialData.categoryIds.length > 0
                        ? initialData.categoryIds
                        : initialData.categoryId ? [initialData.categoryId] : [];
                return {
                    name: initialData.name || '',
                    description: initialData.description || '',
                    price: initialData.price || 0,
                    isAvailable: initialData.isAvailable !== undefined ? initialData.isAvailable : true,
                    availability: initialData.availability || 10,
                    categoryIds: existingCategoryIds,
                    imageUrl: initialData.imageUrl === null || initialData.imageUrl === undefined ? '' : initialData.imageUrl,
                    dietaryNotes: Array.isArray(initialData.dietaryNotes)
                        ? initialData.dietaryNotes.join(', ')
                        : (initialData.dietaryNotes || ''),
                    allergenCodes: Array.isArray(initialData.allergenCodes)
                        ? initialData.allergenCodes.join(', ')
                        : (initialData.allergenCodes || ''),
                    type: initialData.type || '',
                    sku: initialData.sku || '',
                    preparationTime: initialData.preparationTime === null || initialData.preparationTime === undefined || isNaN(Number(initialData.preparationTime))
                        ? undefined
                        : Number(initialData.preparationTime),
                    nutritionalInfo: initialData.nutritionalInfo || '',
                };
            }
            return {
                name: '',
                description: '',
                price: 0,
                isAvailable: true,
                availability: 10,
                categoryIds: [],
                imageUrl: '',
                dietaryNotes: '',
                allergenCodes: '',
                type: '',
                sku: '',
            };
        })(),
    });
    
    const isAvailable = watch('isAvailable');
    const selectedCategoryIds = watch('categoryIds') || [];

    useEffect(() => {
        if (initialData) {
            const categoryIds: number[] =
                Array.isArray(initialData.categoryIds) && initialData.categoryIds.length > 0
                    ? initialData.categoryIds
                    : initialData.categoryId ? [initialData.categoryId] : [];

            setValue('name', initialData.name || '');
            setValue('description', initialData.description || '');
            setValue('price', initialData.price || 0);
            setValue('isAvailable', initialData.isAvailable !== undefined ? initialData.isAvailable : true);
            setValue('availability', initialData.availability || 10);
            setValue('categoryIds', categoryIds);
            setValue('imageUrl', initialData.imageUrl ?? '');
            setValue('dietaryNotes', Array.isArray(initialData.dietaryNotes)
                ? initialData.dietaryNotes.join(', ')
                : (initialData.dietaryNotes || ''));
            setValue('allergenCodes', Array.isArray(initialData.allergenCodes)
                ? initialData.allergenCodes.join(', ')
                : (initialData.allergenCodes || ''));
            setValue('type', initialData.type || '');
            setValue('sku', initialData.sku || '');
            setValue('nutritionalInfo', initialData.nutritionalInfo || '');

            const pt = initialData.preparationTime;
            setValue('preparationTime',
                pt === null || pt === undefined || isNaN(Number(pt)) ? undefined : Number(pt));
        }
    }, [initialData, setValue]);

    const emptyForm = {
        name: '',
        description: '',
        price: 0,
        isAvailable: true,
        availability: 10,
        categoryIds: [] as number[],
        imageUrl: '',
        dietaryNotes: '',
        allergenCodes: '',
        type: '',
        sku: '',
    };

    const handleFormSubmit = async (data: ProductFormData) => {
        setSubmitting(true);
        try {
            if (!data.availability) data.availability = 10;

            const formattedData: any = {
                name: data.name,
                description: data.description || '',
                price: Number(data.price),
                categoryIds: data.categoryIds.map(Number),
                availability: Number(data.availability),
                isAvailable: data.isAvailable !== undefined ? data.isAvailable : true,
                dietaryNotes: data.dietaryNotes?.trim()
                    ? data.dietaryNotes.split(',').map(s => s.trim()).filter(Boolean)
                    : [],
                allergenCodes: data.allergenCodes?.trim()
                    ? data.allergenCodes.split(',').map(s => s.trim()).filter(Boolean)
                    : [],
            };

            if (data.imageUrl?.trim()) formattedData.imageUrl = data.imageUrl;
            if (data.type?.trim()) formattedData.type = data.type;
            if (data.sku?.trim()) formattedData.sku = data.sku;
            if (data.preparationTime !== undefined && data.preparationTime !== null && !isNaN(Number(data.preparationTime))) {
                const prepTime = Number(data.preparationTime);
                if (prepTime >= 0) formattedData.preparationTime = prepTime;
            }
            if (data.nutritionalInfo?.trim()) formattedData.nutritionalInfo = data.nutritionalInfo.trim();

            delete formattedData.menuId;

            await onSubmit(formattedData);
            reset(emptyForm);
            setSubmitting(false);
            onClose();
        } catch (error: any) {
            console.error('Form submission error:', error);
            throw error;
        } finally {
            setSubmitting(false);
        }
    };

    const handleClose = () => {
        reset(emptyForm);
        setSubmitting(false);
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{initialData ? 'Edit Product' : 'Create New Product'}</DialogTitle>
                    <DialogDescription>
                        {initialData
                            ? 'Update product details and information'
                            : 'Add a new product. You can organize products into menus later.'}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(
                    handleFormSubmit,
                    (errors) => {
                        console.error('Form validation errors:', errors);
                        console.error('Form values:', getValues());
                    }
                )} className="space-y-6">
                    {/* Basic Information */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Basic Information</h3>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Product Name *</Label>
                                <Input
                                    id="name"
                                    {...register('name')}
                                    placeholder="e.g., Margherita Pizza (Large)"
                                />
                                {errors.name && (
                                    <p className="text-sm text-red-600">{errors.name.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="sku">SKU</Label>
                                <Input
                                    id="sku"
                                    {...register('sku')}
                                    placeholder="e.g., PIZZA-MARG-L"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                {...register('description')}
                                placeholder="Product description..."
                                rows={3}
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="price">Price (€) *</Label>
                                <Input
                                    id="price"
                                    type="number"
                                    step="0.01"
                                    {...register('price', { valueAsNumber: true })}
                                    placeholder="0.00"
                                />
                                {errors.price && (
                                    <p className="text-sm text-red-600">{errors.price.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="availability">Stock Quantity *</Label>
                                <Input
                                    id="availability"
                                    type="number"
                                    {...register('availability', { valueAsNumber: true })}
                                    placeholder="10"
                                />
                                {errors.availability && (
                                    <p className="text-sm text-red-600">{errors.availability.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="preparationTime">Prep Time (min)</Label>
                                <Input
                                    id="preparationTime"
                                    type="number"
                                    {...register('preparationTime', { 
                                        valueAsNumber: true,
                                        setValueAs: (v) => {
                                            if (v === '' || v === null || v === undefined) return undefined;
                                            const num = Number(v);
                                            return isNaN(num) ? undefined : num;
                                        }
                                    })}
                                    placeholder="15"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Category */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Categories *</h3>

                        {categories.length === 0 ? (
                            <p className="text-sm text-amber-600">Please create a category first before adding products.</p>
                        ) : (
                            <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
                                {categories.map((cat) => {
                                    const checked = selectedCategoryIds.includes(cat.id);
                                    return (
                                        <div key={cat.id} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`cat-${cat.id}`}
                                                checked={checked}
                                                onCheckedChange={(isChecked) => {
                                                    const current = watch('categoryIds') || [];
                                                    const updated = isChecked
                                                        ? [...current, cat.id]
                                                        : current.filter((id: number) => id !== cat.id);
                                                    setValue('categoryIds', updated, { shouldValidate: true });
                                                }}
                                            />
                                            <Label htmlFor={`cat-${cat.id}`} className="cursor-pointer font-normal">
                                                {cat.name}
                                            </Label>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        {errors.categoryIds && (
                            <p className="text-sm text-red-600">{errors.categoryIds.message as string}</p>
                        )}
                        {selectedCategoryIds.length > 0 && (
                            <p className="text-xs text-gray-500">{selectedCategoryIds.length} categor{selectedCategoryIds.length > 1 ? 'ies' : 'y'} selected</p>
                        )}

                        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                            <p className="text-sm text-blue-800">
                                <strong>Note:</strong> Products are created first. After creating products, you can organize them into menus from the Menu Management page.
                            </p>
                        </div>
                    </div>

                    {/* Dietary & Allergen Information */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Dietary Information</h3>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="type">Dietary Type</Label>
                                <Select
                                    value={watch('type') || ''}
                                    onValueChange={(value) => setValue('type', value || undefined)}
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
                    </div>

                    {/* Image & Availability */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Image & Availability</h3>

                        <div className="space-y-2">
                            <Label>Product Image</Label>
                            <ImageUpload
                                value={watch('imageUrl') || ''}
                                onChange={(url) => setValue('imageUrl', url)}
                                type="product"
                                label="Product Image"
                                productName={watch('name')}
                            />
                            {errors.imageUrl && (
                                <p className="text-sm text-red-600">{errors.imageUrl.message}</p>
                            )}
                        </div>

                        <div className="flex items-center space-x-2">
                            <Switch
                                id="isAvailable"
                                checked={isAvailable}
                                onCheckedChange={(checked) => setValue('isAvailable', checked)}
                            />
                            <Label htmlFor="isAvailable">Product Available</Label>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={handleClose} disabled={submitting}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={submitting}>
                            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {initialData ? 'Update Product' : 'Create Product'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
