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
    categoryId: z.number().min(1, 'Please select a category'), // Required, not optional
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
    onSubmit: (data: ProductFormData) => Promise<void>;
    initialData?: Partial<ProductFormData>;
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
        trigger,
        getValues,
    } = useForm<ProductFormData>({
        resolver: zodResolver(productSchema),
        mode: 'onChange', // Validate on change for better UX
        defaultValues: (() => {
            if (initialData) {
                // Process initialData to convert null values to empty strings
                return {
                    name: initialData.name || '',
                    description: initialData.description || '',
                    price: initialData.price || 0,
                    isAvailable: initialData.isAvailable !== undefined ? initialData.isAvailable : true,
                    availability: initialData.availability || 10,
                    categoryId: initialData.categoryId,
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
                categoryId: 0, // Will be validated on submit
                imageUrl: '',
                dietaryNotes: '',
                allergenCodes: '',
                type: '',
                sku: '',
            };
        })(),
    });
    
    // Debug: Log form state when categoryId changes
    const categoryIdValue = watch('categoryId');
    useEffect(() => {
        if (categoryIdValue) {
            console.log('Form categoryId value changed:', categoryIdValue, 'Type:', typeof categoryIdValue);
            console.log('Current form values:', getValues());
            console.log('Form errors:', errors);
        }
    }, [categoryIdValue, errors]);

    const isAvailable = watch('isAvailable');

    useEffect(() => {
        if (initialData) {
            // Convert arrays to strings for form fields
            const processedData: any = { ...initialData };
            
            // Convert null imageUrl to empty string
            if (processedData.imageUrl === null || processedData.imageUrl === undefined) {
                processedData.imageUrl = '';
            }
            
            // Convert dietaryNotes array to comma-separated string
            if (Array.isArray(initialData.dietaryNotes)) {
                processedData.dietaryNotes = initialData.dietaryNotes.join(', ');
            } else if (!initialData.dietaryNotes || initialData.dietaryNotes === null) {
                processedData.dietaryNotes = '';
            }
            
            // Convert allergenCodes array to comma-separated string
            if (Array.isArray(initialData.allergenCodes)) {
                processedData.allergenCodes = initialData.allergenCodes.join(', ');
            } else if (!initialData.allergenCodes || initialData.allergenCodes === null) {
                processedData.allergenCodes = '';
            }
            
            // Handle null/undefined values for optional fields
            if (processedData.preparationTime === null || processedData.preparationTime === undefined) {
                processedData.preparationTime = undefined;
            } else if (typeof processedData.preparationTime === 'string' && processedData.preparationTime.trim() === '') {
                processedData.preparationTime = undefined;
            } else if (isNaN(Number(processedData.preparationTime))) {
                processedData.preparationTime = undefined;
            }
            
            if (processedData.nutritionalInfo === null || processedData.nutritionalInfo === undefined) {
                processedData.nutritionalInfo = '';
            }
            
            if (processedData.description === null || processedData.description === undefined) {
                processedData.description = '';
            }
            
            // Ensure all string fields are strings, not null
            ['type', 'sku'].forEach((field) => {
                if (processedData[field] === null || processedData[field] === undefined) {
                    processedData[field] = '';
                }
            });
            
            Object.keys(processedData).forEach((key) => {
                setValue(key as keyof ProductFormData, processedData[key as keyof ProductFormData] as any);
            });
        }
    }, [initialData, setValue]);

    const handleFormSubmit = async (data: ProductFormData) => {
        console.log('handleFormSubmit called with data:', data);
        setSubmitting(true);
        try {
            // Validate categoryId is set and is a valid number
            const categoryId = data.categoryId;
            console.log('Validating categoryId:', categoryId, 'Type:', typeof categoryId);
            if (!categoryId || categoryId <= 0 || isNaN(Number(categoryId))) {
                console.error('CategoryId validation failed:', categoryId);
                setValue('categoryId', undefined as any, { shouldValidate: true });
                await trigger('categoryId');
                setSubmitting(false);
                return; // Don't throw, just return early
            }
            
            console.log('Form submission data:', { ...data, categoryId });

            // Ensure availability is set
            if (data.availability === undefined || data.availability === null) {
                data.availability = 10;
            }

            // Convert string inputs to arrays for the API
            // IMPORTANT: Do NOT include menuId - products are created independently
            const formattedData: any = {
                name: data.name,
                description: data.description || '',
                price: Number(data.price),
                categoryId: Number(data.categoryId),
                availability: Number(data.availability || 10),
                isAvailable: data.isAvailable !== undefined ? data.isAvailable : true,
                dietaryNotes: data.dietaryNotes && data.dietaryNotes.trim()
                    ? data.dietaryNotes.split(',').map(s => s.trim()).filter(Boolean)
                    : [],
                allergenCodes: data.allergenCodes && data.allergenCodes.trim()
                    ? data.allergenCodes.split(',').map(s => s.trim()).filter(Boolean)
                    : [],
            };

            // Add optional fields only if they have values
            if (data.imageUrl && data.imageUrl.trim()) formattedData.imageUrl = data.imageUrl;
            if (data.type && data.type.trim()) formattedData.type = data.type;
            if (data.sku && data.sku.trim()) formattedData.sku = data.sku;
            // Handle preparationTime - only include if it's a valid number
            if (data.preparationTime !== undefined && data.preparationTime !== null && !isNaN(Number(data.preparationTime))) {
                const prepTime = Number(data.preparationTime);
                if (prepTime >= 0) {
                    formattedData.preparationTime = prepTime;
                }
            }
            
            // Handle nutritionalInfo - convert null to empty string or include if has value
            if (data.nutritionalInfo !== null && data.nutritionalInfo !== undefined && data.nutritionalInfo.trim()) {
                formattedData.nutritionalInfo = data.nutritionalInfo.trim();
            }

            // Explicitly ensure menuId is NOT included
            delete formattedData.menuId;

            console.log('Formatted data being sent:', formattedData);
            await onSubmit(formattedData);
            reset({
                name: '',
                description: '',
                price: 0,
                categoryId: undefined as any,
                isAvailable: true,
                availability: 10,
                imageUrl: '',
                dietaryNotes: '',
                allergenCodes: '',
                type: '',
                sku: '',
            });
            setSubmitting(false);
            onClose();
        } catch (error: any) {
            console.error('Form submission error:', error);
            console.error('Error details:', {
                message: error.message,
                response: error.response?.data,
                categoryId: data.categoryId,
            });
            // Error will be handled by parent component's onError handler
            throw error;
        } finally {
            setSubmitting(false);
        }
    };

    const handleClose = () => {
        reset({
            name: '',
            description: '',
            price: 0,
            isAvailable: true,
            availability: 10,
            categoryId: undefined,
            imageUrl: '',
            dietaryNotes: '',
            allergenCodes: '',
            type: '',
            sku: '',
        });
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
                        <h3 className="text-lg font-semibold">Category</h3>

                            <div className="space-y-2">
                                <Label htmlFor="categoryId">Category *</Label>
                                <Select
                                    value={watch('categoryId') ? watch('categoryId')!.toString() : ''}
                                    onValueChange={async (value) => {
                                        console.log('Category selected:', value);
                                        if (value && value !== '') {
                                            const categoryIdNum = parseInt(value, 10);
                                            if (!isNaN(categoryIdNum) && categoryIdNum > 0) {
                                                console.log('Setting categoryId to:', categoryIdNum);
                                                setValue('categoryId', categoryIdNum, { 
                                                    shouldValidate: true,
                                                    shouldDirty: true,
                                                    shouldTouch: true
                                                });
                                                // Trigger validation to ensure form is ready
                                                await trigger('categoryId');
                                                console.log('CategoryId validation triggered, current value:', watch('categoryId'));
                                            } else {
                                                console.error('Invalid categoryId:', value);
                                            }
                                        }
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories.length > 0 ? (
                                            categories.map((cat) => (
                                                <SelectItem key={cat.id} value={cat.id.toString()}>
                                                    {cat.name}
                                                </SelectItem>
                                            ))
                                        ) : (
                                            <SelectItem value="" disabled>No categories available</SelectItem>
                                        )}
                                    </SelectContent>
                                </Select>
                                {errors.categoryId && (
                                    <p className="text-sm text-red-600">{errors.categoryId.message}</p>
                                )}
                                {categories.length === 0 && (
                                    <p className="text-sm text-amber-600">Please create a category first</p>
                                )}
                            </div>
                        
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
