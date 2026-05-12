'use client';

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../lib/api-client';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Textarea } from '../../ui/textarea';
import { Label } from '../../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';
import { env } from '@/lib/env';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../ui/dialog';
import { Switch } from '../../ui/switch';
import { Checkbox } from '../../ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { Loader2, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const promotionSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters').max(255),
  code: z.string().optional().nullable(),
  type: z.enum(['PERCENTAGE', 'FIXED', 'BOGO', 'PRODUCT_BASED', 'CATEGORY_BASED', 'MIN_ORDER_BASED', 'FIRST_ORDER', 'COUPON_CODE', 'HAPPY_HOURS']).optional(),
  discountType: z.enum(['PERCENTAGE', 'FIXED']),
  discountValue: z.number().min(0.01, 'Discount value must be greater than 0'),
  validFrom: z.string(),
  validTo: z.string().optional().nullable(),
  applicableType: z.enum(['ALL_PRODUCTS', 'SPECIFIC_PRODUCTS', 'SPECIFIC_CATEGORIES']).optional(),
  productIds: z.array(z.number()).optional(),
  categoryIds: z.array(z.number()).optional(),
  usageLimit: z.number().optional().nullable(),
  minOrderValue: z.number().optional().nullable(),
  maxDiscount: z.number().optional().nullable(),
  userLimit: z.number().optional().nullable(),
  firstOrderOnly: z.boolean().optional(),
  requiresCouponCode: z.boolean().optional(),
  autoApply: z.boolean().optional(),
  priority: z.number().optional(),
  description: z.string().optional().nullable(),
  bannerImageUrl: z.string().optional().nullable(),
  happyHourStart: z.string().optional().nullable(),
  happyHourEnd: z.string().optional().nullable(),
  happyHourDays: z.array(z.number()).optional(),
  bogoBuyQuantity: z.number().optional().nullable(),
  bogoGetQuantity: z.number().optional().nullable(),
  bogoProductId: z.number().optional().nullable(),
  isActive: z.boolean().optional(),
}).refine((data) => {
  if (data.discountType === 'PERCENTAGE' && data.discountValue > 100) {
    return false;
  }
  return true;
}, {
  message: 'Percentage discount cannot exceed 100%',
  path: ['discountValue'],
}).refine((data) => {
  if (data.validTo && data.validFrom) {
    return new Date(data.validTo) > new Date(data.validFrom);
  }
  return true;
}, {
  message: 'End date must be after start date',
  path: ['validTo'],
});

type PromotionFormData = z.infer<typeof promotionSchema>;

interface PromotionFormProps {
  promotion?: any;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function PromotionForm({ promotion, open, onClose, onSuccess }: PromotionFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);

  // Fetch products and categories
  const { data: productsResponse } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await apiClient.getProducts();
      return response;
    },
  });

  const { data: categoriesResponse } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await apiClient.getCategories();
      return response;
    },
  });

  const products = Array.isArray(productsResponse?.data) 
    ? productsResponse.data 
    : Array.isArray(productsResponse) 
      ? productsResponse 
      : [];
  const categories = Array.isArray(categoriesResponse?.data)
    ? categoriesResponse.data
    : Array.isArray(categoriesResponse)
      ? categoriesResponse
      : [];

  const form = useForm<PromotionFormData>({
    resolver: zodResolver(promotionSchema),
    mode: 'onBlur',
    defaultValues: {
      name: '',
      code: null,
      type: 'PERCENTAGE',
      discountType: 'PERCENTAGE',
      discountValue: 10,
      validFrom: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      validTo: null,
      applicableType: 'ALL_PRODUCTS',
      productIds: [],
      categoryIds: [],
      usageLimit: null,
      minOrderValue: null,
      maxDiscount: null,
      userLimit: null,
      firstOrderOnly: false,
      requiresCouponCode: false,
      autoApply: false,
      priority: 0,
      description: null,
      bannerImageUrl: null,
      happyHourStart: null,
      happyHourEnd: null,
      happyHourDays: [],
      bogoBuyQuantity: null,
      bogoGetQuantity: null,
      bogoProductId: null,
      isActive: true,
    },
  });

  useEffect(() => {
    if (promotion) {
      form.reset({
        name: promotion.name || '',
        code: promotion.code || null,
        type: promotion.type || 'PERCENTAGE',
        discountType: promotion.discountType || 'PERCENTAGE',
        discountValue: promotion.discountValue || 0,
        validFrom: promotion.validFrom ? format(new Date(promotion.validFrom), "yyyy-MM-dd'T'HH:mm") : format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        validTo: promotion.validTo ? format(new Date(promotion.validTo), "yyyy-MM-dd'T'HH:mm") : null,
        applicableType: promotion.applicableType || 'ALL_PRODUCTS',
        productIds: promotion.productIds ? JSON.parse(promotion.productIds) : [],
        categoryIds: promotion.categoryIds ? JSON.parse(promotion.categoryIds) : [],
        usageLimit: promotion.usageLimit || null,
        minOrderValue: promotion.minOrderValue || null,
        maxDiscount: promotion.maxDiscount || null,
        userLimit: promotion.userLimit || null,
        firstOrderOnly: promotion.firstOrderOnly || false,
        requiresCouponCode: promotion.requiresCouponCode || false,
        autoApply: promotion.autoApply || false,
        priority: promotion.priority || 0,
        description: promotion.description || null,
        bannerImageUrl: promotion.bannerImageUrl || null,
        happyHourStart: promotion.happyHourStart || null,
        happyHourEnd: promotion.happyHourEnd || null,
        happyHourDays: promotion.happyHourDays ? JSON.parse(promotion.happyHourDays) : [],
        bogoBuyQuantity: promotion.bogoBuyQuantity || null,
        bogoGetQuantity: promotion.bogoGetQuantity || null,
        bogoProductId: promotion.bogoProductId || null,
        isActive: promotion.isActive !== undefined ? promotion.isActive : true,
      });
      if (promotion.bannerImageUrl) {
        setBannerPreview(promotion.bannerImageUrl);
      }
    }
  }, [promotion, form]);

  const createMutation = useMutation({
    mutationFn: async (data: PromotionFormData) => {
      const response = await apiClient.createPromotion(data);
      return response;
    },
    onSuccess: async (data, variables) => {
      // Upload banner if provided
      if (bannerFile && data.data?.promotion?.id) {
        try {
          await apiClient.uploadPromotionBanner(data.data.promotion.id, bannerFile);
        } catch (error) {
          console.error('Failed to upload banner:', error);
        }
      }
      toast.success('Promotion created successfully');
      onSuccess();
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || 'Failed to create promotion';
      const errorDetails = error.response?.data?.details;
      const fixInstructions = error.response?.data?.fix;
      
      if (error.response?.data?.fix) {
        // Show detailed error with migration instructions
        console.error('Promotion creation error:', {
          message: errorMessage,
          details: errorDetails,
          fix: fixInstructions,
        });
        toast.error(
          `${errorMessage}\n\n${errorDetails ? `Details: ${errorDetails}\n\n` : ''}Fix: ${fixInstructions}`,
          { duration: 15000 }
        );
      } else {
        toast.error(errorMessage);
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: PromotionFormData) => {
      const response = await apiClient.updatePromotion(promotion.id, data);
      return response;
    },
    onSuccess: async (data, variables) => {
      // Upload banner if provided
      if (bannerFile && promotion.id) {
        try {
          await apiClient.uploadPromotionBanner(promotion.id, bannerFile);
        } catch (error) {
          console.error('Failed to upload banner:', error);
        }
      }
      toast.success('Promotion updated successfully');
      onSuccess();
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || 'Failed to update promotion';
      const errorDetails = error.response?.data?.details;
      const fixInstructions = error.response?.data?.fix;
      
      if (error.response?.data?.fix) {
        // Show detailed error with migration instructions
        console.error('Promotion update error:', {
          message: errorMessage,
          details: errorDetails,
          fix: fixInstructions,
        });
        toast.error(
          `${errorMessage}\n\n${errorDetails ? `Details: ${errorDetails}\n\n` : ''}Fix: ${fixInstructions}`,
          { duration: 15000 }
        );
      } else {
        toast.error(errorMessage);
      }
    },
  });

  const onSubmit = async (data: PromotionFormData) => {
    try {
      console.log('Form onSubmit called with data:', data);
      console.log('Form errors:', form.formState.errors);
      
      // Ensure required fields have values
      if (!data.name || data.name.trim().length < 3) {
        toast.error('Promotion name is required (minimum 3 characters)');
        form.setFocus('name');
        return;
      }
      
      if (!data.discountValue || data.discountValue <= 0) {
        toast.error('Discount value must be greater than 0');
        form.setFocus('discountValue');
        return;
      }

      if (!data.validFrom) {
        toast.error('Start date is required');
        form.setFocus('validFrom');
        return;
      }

      console.log('Submitting promotion...');
      
      if (promotion) {
        updateMutation.mutate(data);
      } else {
        createMutation.mutate(data);
      }
    } catch (error) {
      console.error('Error in onSubmit:', error);
      toast.error('Failed to submit form. Please try again.');
    }
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBannerFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setBannerPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{promotion ? 'Edit Promotion' : 'Create Promotion'}</DialogTitle>
          <DialogDescription>
            {promotion ? 'Update promotion details' : 'Create a new promotional offer'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Tabs value={currentStep.toString()} onValueChange={(v) => setCurrentStep(Number(v))}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger 
                value="1"
                className={form.formState.errors.name || form.formState.errors.validFrom ? 'border-destructive border-2' : ''}
              >
                Basic
                {(form.formState.errors.name || form.formState.errors.validFrom) && (
                  <span className="ml-1 text-destructive">*</span>
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="2"
                className={form.formState.errors.discountType || form.formState.errors.discountValue ? 'border-destructive border-2' : ''}
              >
                Discount
                {(form.formState.errors.discountType || form.formState.errors.discountValue) && (
                  <span className="ml-1 text-destructive">*</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="3">Applicability</TabsTrigger>
              <TabsTrigger value="4">Advanced</TabsTrigger>
              <TabsTrigger value="5">Banner</TabsTrigger>
            </TabsList>

            {/* Step 1: Basic Info */}
            <TabsContent value="1" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Promotion Name *</Label>
                  <Input
                    id="name"
                    {...form.register('name')}
                    placeholder="e.g., Summer Sale 2024"
                    className={form.formState.errors.name ? 'border-destructive focus-visible:ring-destructive' : ''}
                    aria-invalid={!!form.formState.errors.name}
                  />
                  {form.formState.errors.name && (
                    <p className="text-sm text-destructive mt-1">{form.formState.errors.name.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="code">Coupon Code (Optional)</Label>
                  <Input
                    id="code"
                    {...form.register('code')}
                    placeholder="e.g., SUMMER2024"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="type">Promotion Type</Label>
                  <Controller
                    name="type"
                    control={form.control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PERCENTAGE">Percentage Discount</SelectItem>
                          <SelectItem value="FIXED">Fixed Discount</SelectItem>
                          <SelectItem value="BOGO">Buy 1 Get 1</SelectItem>
                          <SelectItem value="PRODUCT_BASED">Product-based</SelectItem>
                          <SelectItem value="CATEGORY_BASED">Category-based</SelectItem>
                          <SelectItem value="MIN_ORDER_BASED">Min Order Value</SelectItem>
                          <SelectItem value="FIRST_ORDER">First Order</SelectItem>
                          <SelectItem value="COUPON_CODE">Coupon Code</SelectItem>
                          <SelectItem value="HAPPY_HOURS">Happy Hours</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Input
                    id="priority"
                    type="number"
                    {...form.register('priority', { valueAsNumber: true })}
                    placeholder="0"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Higher priority promotions apply first</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="validFrom">Start Date & Time *</Label>
                  <Input
                    id="validFrom"
                    type="datetime-local"
                    {...form.register('validFrom')}
                    className={form.formState.errors.validFrom ? 'border-destructive focus-visible:ring-destructive' : ''}
                    aria-invalid={!!form.formState.errors.validFrom}
                  />
                  {form.formState.errors.validFrom && (
                    <p className="text-sm text-destructive mt-1">{form.formState.errors.validFrom.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="validTo">End Date & Time (Optional)</Label>
                  <Input
                    id="validTo"
                    type="datetime-local"
                    {...form.register('validTo')}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  {...form.register('description')}
                  placeholder="Promotion description..."
                  rows={3}
                />
              </div>
            </TabsContent>

            {/* Step 2: Discount Details */}
            <TabsContent value="2" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="discountType">Discount Type *</Label>
                  <Controller
                    name="discountType"
                    control={form.control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
                          <SelectItem value="FIXED">Fixed Amount (₹)</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div>
                  <Label htmlFor="discountValue">Discount Value *</Label>
                  <Input
                    id="discountValue"
                    type="number"
                    step="0.01"
                    {...form.register('discountValue', { valueAsNumber: true })}
                    placeholder={form.watch('discountType') === 'PERCENTAGE' ? '10' : '50'}
                    className={form.formState.errors.discountValue ? 'border-destructive focus-visible:ring-destructive' : ''}
                    aria-invalid={!!form.formState.errors.discountValue}
                  />
                  {form.formState.errors.discountValue && (
                    <p className="text-sm text-destructive mt-1">{form.formState.errors.discountValue.message}</p>
                  )}
                  {!form.formState.errors.discountValue && form.watch('discountType') === 'PERCENTAGE' && (
                    <p className="text-xs text-muted-foreground mt-1">Enter percentage (0-100)</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="minOrderValue">Minimum Order Value (₹)</Label>
                  <Input
                    id="minOrderValue"
                    type="number"
                    step="0.01"
                    {...form.register('minOrderValue', { valueAsNumber: true })}
                    placeholder="0"
                  />
                </div>

                <div>
                  <Label htmlFor="maxDiscount">Maximum Discount (₹)</Label>
                  <Input
                    id="maxDiscount"
                    type="number"
                    step="0.01"
                    {...form.register('maxDiscount', { valueAsNumber: true })}
                    placeholder="Unlimited"
                  />
                </div>
              </div>

              {/* BOGO Fields */}
              {form.watch('type') === 'BOGO' && (
                <div className="space-y-4 p-4 border rounded-lg">
                  <h4 className="font-medium">BOGO Settings</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="bogoBuyQuantity">Buy Quantity</Label>
                      <Input
                        id="bogoBuyQuantity"
                        type="number"
                        {...form.register('bogoBuyQuantity', { valueAsNumber: true })}
                        placeholder="1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="bogoGetQuantity">Get Free Quantity</Label>
                      <Input
                        id="bogoGetQuantity"
                        type="number"
                        {...form.register('bogoGetQuantity', { valueAsNumber: true })}
                        placeholder="1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="bogoProductId">Specific Product ID (Optional)</Label>
                      <Input
                        id="bogoProductId"
                        type="number"
                        {...form.register('bogoProductId', { valueAsNumber: true })}
                        placeholder="Leave empty for all products"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Happy Hours Fields */}
              {form.watch('type') === 'HAPPY_HOURS' && (
                <div className="space-y-4 p-4 border rounded-lg">
                  <h4 className="font-medium">Happy Hours Settings</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="happyHourStart">Start Time (HH:mm)</Label>
                      <Input
                        id="happyHourStart"
                        type="time"
                        {...form.register('happyHourStart')}
                      />
                    </div>
                    <div>
                      <Label htmlFor="happyHourEnd">End Time (HH:mm)</Label>
                      <Input
                        id="happyHourEnd"
                        type="time"
                        {...form.register('happyHourEnd')}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Days of Week</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <Checkbox
                            checked={form.watch('happyHourDays')?.includes(index) || false}
                            onCheckedChange={(checked) => {
                              const currentDays = form.watch('happyHourDays') || [];
                              if (checked) {
                                form.setValue('happyHourDays', [...currentDays, index]);
                              } else {
                                form.setValue('happyHourDays', currentDays.filter((d) => d !== index));
                              }
                            }}
                          />
                          <Label className="text-sm">{day}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Step 3: Applicability */}
            <TabsContent value="3" className="space-y-4">
              <div>
                <Label htmlFor="applicableType">Applicable To</Label>
                <Controller
                  name="applicableType"
                  control={form.control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL_PRODUCTS">All Products</SelectItem>
                        <SelectItem value="SPECIFIC_PRODUCTS">Specific Products</SelectItem>
                        <SelectItem value="SPECIFIC_CATEGORIES">Specific Categories</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              {form.watch('applicableType') === 'SPECIFIC_PRODUCTS' && (
                <div>
                  <Label>Select Products</Label>
                  <div className="max-h-60 overflow-y-auto border rounded-lg p-4 mt-2">
                    {products.map((product: any) => (
                      <div key={product.id} className="flex items-center space-x-2 py-1">
                        <Checkbox
                          checked={form.watch('productIds')?.includes(product.id) || false}
                          onCheckedChange={(checked) => {
                            const currentIds = form.watch('productIds') || [];
                            if (checked) {
                              form.setValue('productIds', [...currentIds, product.id]);
                            } else {
                              form.setValue('productIds', currentIds.filter((id) => id !== product.id));
                            }
                          }}
                        />
                        <Label className="text-sm">{product.name}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {form.watch('applicableType') === 'SPECIFIC_CATEGORIES' && (
                <div>
                  <Label>Select Categories</Label>
                  <div className="max-h-60 overflow-y-auto border rounded-lg p-4 mt-2">
                    {categories.map((category: any) => (
                      <div key={category.id} className="flex items-center space-x-2 py-1">
                        <Checkbox
                          checked={form.watch('categoryIds')?.includes(category.id) || false}
                          onCheckedChange={(checked) => {
                            const currentIds = form.watch('categoryIds') || [];
                            if (checked) {
                              form.setValue('categoryIds', [...currentIds, category.id]);
                            } else {
                              form.setValue('categoryIds', currentIds.filter((id) => id !== category.id));
                            }
                          }}
                        />
                        <Label className="text-sm">{category.name}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Step 4: Advanced */}
            <TabsContent value="4" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="usageLimit">Usage Limit</Label>
                  <Input
                    id="usageLimit"
                    type="number"
                    {...form.register('usageLimit', { valueAsNumber: true })}
                    placeholder="Unlimited"
                  />
                </div>

                <div>
                  <Label htmlFor="userLimit">Per User Limit</Label>
                  <Input
                    id="userLimit"
                    type="number"
                    {...form.register('userLimit', { valueAsNumber: true })}
                    placeholder="Unlimited"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="firstOrderOnly">First Order Only</Label>
                    <p className="text-xs text-muted-foreground">Apply only to customers' first order</p>
                  </div>
                  <Controller
                    name="firstOrderOnly"
                    control={form.control}
                    render={({ field }) => (
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    )}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="requiresCouponCode">Requires Coupon Code</Label>
                    <p className="text-xs text-muted-foreground">Customer must enter code to apply</p>
                  </div>
                  <Controller
                    name="requiresCouponCode"
                    control={form.control}
                    render={({ field }) => (
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    )}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="autoApply">Auto-Apply</Label>
                    <p className="text-xs text-muted-foreground">Automatically apply if conditions are met</p>
                  </div>
                  <Controller
                    name="autoApply"
                    control={form.control}
                    render={({ field }) => (
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    )}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="isActive">Active</Label>
                    <p className="text-xs text-muted-foreground">Enable or disable this promotion</p>
                  </div>
                  <Controller
                    name="isActive"
                    control={form.control}
                    render={({ field }) => (
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    )}
                  />
                </div>
              </div>
            </TabsContent>

            {/* Step 5: Banner */}
            <TabsContent value="5" className="space-y-4">
              <div>
                <Label>Promotion Banner</Label>
                <div className="mt-2">
                  {bannerPreview && (
                    <div className="relative w-full h-48 mb-4">
                      <img
                        src={bannerPreview.startsWith('/') ? `${env.apiUrl}${bannerPreview}` : bannerPreview}
                        alt="Banner preview"
                        className="w-full h-full object-cover rounded-lg"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => {
                          setBannerPreview(null);
                          setBannerFile(null);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleBannerChange}
                    className="cursor-pointer"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Upload a banner image for this promotion (max 5MB)
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            {currentStep > 1 && (
              <Button type="button" variant="outline" onClick={() => setCurrentStep(currentStep - 1)}>
                Previous
              </Button>
            )}
            {currentStep < 5 ? (
              <Button 
                type="button" 
                onClick={async () => {
                  // Validate current step before moving to next
                  const fieldsToValidate: (keyof PromotionFormData)[] = [];
                  
                  if (currentStep === 1) {
                    fieldsToValidate.push('name', 'validFrom');
                  } else if (currentStep === 2) {
                    fieldsToValidate.push('discountType', 'discountValue');
                  }
                  
                  if (fieldsToValidate.length > 0) {
                    const isValid = await form.trigger(fieldsToValidate);
                    if (!isValid) {
                      const errors = form.formState.errors;
                      const firstError = Object.keys(errors)[0];
                      const errorMessage = errors[firstError as keyof typeof errors]?.message || 'Please fix the errors';
                      toast.error(errorMessage);
                      return;
                    }
                  }
                  
                  setCurrentStep(currentStep + 1);
                }}
              >
                Next
              </Button>
            ) : (
              <Button 
                type="button"
                disabled={isLoading}
                onClick={async (e) => {
                  e.preventDefault();
                  
                  // Validate all fields
                  const isValid = await form.trigger();
                  
                  if (!isValid) {
                    const errors = form.formState.errors;
                    
                    // Find the first error and navigate to its tab
                    if (errors.name || errors.validFrom || errors.type) {
                      setCurrentStep(1);
                      toast.error('Please fill in all required fields in the Basic tab');
                      if (errors.name) {
                        form.setFocus('name');
                      } else if (errors.validFrom) {
                        form.setFocus('validFrom');
                      }
                    } else if (errors.discountType || errors.discountValue) {
                      setCurrentStep(2);
                      toast.error('Please fill in all required fields in the Discount tab');
                      if (errors.discountValue) {
                        form.setFocus('discountValue');
                      }
                    } else {
                      const firstErrorKey = Object.keys(errors)[0];
                      const firstError = errors[firstErrorKey as keyof typeof errors];
                      toast.error(firstError?.message || 'Please fix all form errors');
                    }
                    return;
                  }
                  
                  // Submit form using handleSubmit which will call onSubmit
                  form.handleSubmit(onSubmit)();
                }}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {promotion ? 'Update' : 'Create'} Promotion
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

