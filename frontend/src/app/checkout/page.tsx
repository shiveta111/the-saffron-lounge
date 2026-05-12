'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { apiClient } from '../../lib/api-client';
import { useAuth } from '../../lib/auth-context';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import { RadioGroup, RadioGroupItem } from '../../components/ui/radio-group';
import { LoginRequiredModal } from '../../components/LoginRequiredModal';
import { CouponCodeInput } from '../../components/customer/CouponCodeInput';
import { CheckCircle2, CreditCard, Store, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

const checkoutSchema = z.object({
  customerName: z.string().min(2, 'Name must be at least 2 characters'),
  customerEmail: z.string().email('Invalid email address'),
  customerPhone: z.string().min(10, 'Phone number must be at least 10 digits'),
  deliveryAddress: z.string().min(10, 'Address must be at least 10 characters'),
  deliveryNotes: z.string().optional(),
  paymentMethod: z.enum(['PAY_IN_RESTAURANT', 'PAY_ON_ARRIVAL']),
});

type CheckoutFormData = z.infer<typeof checkoutSchema>;

export default function CheckoutPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Check authentication on mount
  useEffect(() => {
    if (!isAuthenticated) {
      setShowLoginModal(true);
    }
  }, [isAuthenticated]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      paymentMethod: 'PAY_IN_RESTAURANT',
    },
  });

  // Fetch cart
  const { data: cartResponse, isLoading: cartLoading } = useQuery({
    queryKey: ['cart'],
    queryFn: async () => {
      const response = await apiClient.getCart();
      return response;
    },
  });

  // Place order mutation
  const placeOrderMutation = useMutation({
    mutationFn: (data: CheckoutFormData) => apiClient.createOrder(data),
    onSuccess: (response) => {
      const newOrderId = response.data?.order?.id || response.data?.id;
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      // Dispatch event to update header cart count
      window.dispatchEvent(new CustomEvent('cartUpdated'));
      // Dispatch event to refresh dashboard stats
      window.dispatchEvent(new CustomEvent('orderCreated', { detail: { orderId: newOrderId } }));
      toast.success('Order placed successfully!');
      // Redirect to order success page with order ID
      router.push(`/order-success?orderId=${newOrderId}`);
    },
    onError: (error: any) => {
      const errorMsg = error.response?.data?.error || error.error || 'Failed to place order';
      toast.error(errorMsg);
    },
  });

  const cart = cartResponse?.data?.cart || cartResponse?.data;
  const cartItems = cart?.items || [];
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [appliedCouponCode, setAppliedCouponCode] = useState<string | null>(null);
  
  const subtotal = cartItems.reduce(
    (sum: number, item: any) => {
      // Handle both products and menu items
      const itemPrice = item.menu ? (item.menu.price || item.price) : (item.product?.price || item.price);
      return sum + itemPrice * item.quantity;
    },
    0
  );
  const tax = subtotal * 0.08;
  const total = Math.max(0, subtotal + tax - appliedDiscount);

  const onSubmit = (data: CheckoutFormData) => {
    if (cartItems.length === 0) {
      toast.error('Your cart is empty');
      return;
    }
    // Include coupon code if applied
    const orderData = {
      ...data,
      ...(appliedCouponCode && { discountCode: appliedCouponCode }),
    };
    placeOrderMutation.mutate(orderData as CheckoutFormData);
  };

  if (cartLoading) {
    return (
      <div className="min-h-screen bg-[#111115] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f36b24]"></div>
      </div>
    );
  }

  // Show login modal if not authenticated
  if (!isAuthenticated) {
    return (
      <>
        <LoginRequiredModal
          isOpen={showLoginModal}
          onClose={() => {
            setShowLoginModal(false);
            router.push('/');
          }}
          message="Please register or login to continue with your order."
          returnUrl="/checkout"
        />
        <div className="min-h-screen bg-[#111115] flex items-center justify-center">
          <Card className="max-w-md w-full bg-[#18181c] border-[#23232a]">
            <CardContent className="pt-12 pb-12 text-center">
              <h2 className="text-2xl font-bold mb-4 text-white" style={{ fontFamily: 'var(--font-el-messiri)' }}>Please Log In</h2>
              <p className="text-[#bdbdbd] mb-6">
                You must be logged in to access the checkout page
              </p>
              <Button
                className="bg-[#f36b24] hover:bg-[#d65a18] text-white font-bold"
                onClick={() => router.push('/auth/login')}
              >
                Go to Login
              </Button>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }


  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-[#111115] flex items-center justify-center py-12 px-4">
        <Card className="max-w-md w-full bg-[#18181c] border-[#23232a]">
          <CardContent className="pt-12 pb-12 text-center">
            <h2 className="text-2xl font-bold mb-4 text-white" style={{ fontFamily: 'var(--font-el-messiri)' }}>Your cart is empty</h2>
            <p className="text-[#bdbdbd] mb-6">
              Add some items to your cart before checking out
            </p>
            <Button
              className="bg-[#f36b24] hover:bg-[#d65a18] text-white font-bold"
              onClick={() => router.push('/menu/restaurant')}
            >
              Browse Menu
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#111115] py-12">
      <div className="container mx-auto px-4">
        <h1 className="text-4xl font-bold mb-8 text-white" style={{ fontFamily: 'var(--font-el-messiri)' }}>Checkout</h1>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Customer Details */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="bg-[#18181c] border-[#23232a]">
                <CardHeader>
                  <CardTitle className="text-white">Customer Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="customerName" className="text-[#bdbdbd]">Full Name *</Label>
                    <Input
                      id="customerName"
                      {...register('customerName')}
                      placeholder="John Doe"
                      className="bg-[#111115] border-[#23232a] text-white placeholder:text-[#666]"
                    />
                    {errors.customerName && (
                      <p className="text-sm text-red-500 mt-1">
                        {errors.customerName.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="customerEmail" className="text-[#bdbdbd]">Email *</Label>
                    <Input
                      id="customerEmail"
                      type="email"
                      {...register('customerEmail')}
                      placeholder="john@example.com"
                      className="bg-[#111115] border-[#23232a] text-white placeholder:text-[#666]"
                    />
                    {errors.customerEmail && (
                      <p className="text-sm text-red-500 mt-1">
                        {errors.customerEmail.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="customerPhone" className="text-[#bdbdbd]">Phone Number *</Label>
                    <Input
                      id="customerPhone"
                      {...register('customerPhone')}
                      placeholder="+353 12 345 6789"
                      className="bg-[#111115] border-[#23232a] text-white placeholder:text-[#666]"
                    />
                    {errors.customerPhone && (
                      <p className="text-sm text-red-500 mt-1">
                        {errors.customerPhone.message}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#18181c] border-[#23232a]">
                <CardHeader>
                  <CardTitle className="text-white">Delivery Address</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="deliveryAddress" className="text-[#bdbdbd]">Address *</Label>
                    <Textarea
                      id="deliveryAddress"
                      {...register('deliveryAddress')}
                      placeholder="123 Main Street, Dublin, Ireland"
                      rows={3}
                      className="bg-[#111115] border-[#23232a] text-white placeholder:text-[#666]"
                    />
                    {errors.deliveryAddress && (
                      <p className="text-sm text-red-500 mt-1">
                        {errors.deliveryAddress.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="deliveryNotes" className="text-[#bdbdbd]">Delivery Notes (Optional)</Label>
                    <Textarea
                      id="deliveryNotes"
                      {...register('deliveryNotes')}
                      placeholder="Ring the doorbell, leave at door, etc."
                      rows={2}
                      className="bg-[#111115] border-[#23232a] text-white placeholder:text-[#666]"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#18181c] border-[#23232a]">
                <CardHeader>
                  <CardTitle className="text-white">Payment Method</CardTitle>
                </CardHeader>
                <CardContent>
                  <RadioGroup
                    value={watch('paymentMethod')}
                    onValueChange={(value) =>
                      setValue('paymentMethod', value as 'PAY_IN_RESTAURANT' | 'PAY_ON_ARRIVAL')
                    }
                    className="space-y-4"
                  >
                    <div className={`flex items-center space-x-4 border rounded-lg p-4 cursor-pointer transition-all ${watch('paymentMethod') === 'PAY_IN_RESTAURANT'
                      ? 'bg-[#2a2a30] border-[#f36b24]'
                      : 'bg-[#111115] border-[#23232a] hover:border-[#f36b24]'
                      }`}>
                      <RadioGroupItem value="PAY_IN_RESTAURANT" id="pay-in-restaurant" className="text-[#f36b24]" />
                      <Label htmlFor="pay-in-restaurant" className="flex-1 cursor-pointer flex items-center gap-3">
                        <Store className="h-6 w-6 text-[#f36b24]" />
                        <div>
                          <div className="font-semibold text-white">Pay in Restaurant</div>
                          <div className="text-sm text-[#bdbdbd]">
                            Pay when you pick up or dine in
                          </div>
                        </div>
                      </Label>
                    </div>

                    <div className={`flex items-center space-x-4 border rounded-lg p-4 cursor-pointer transition-all ${watch('paymentMethod') === 'PAY_ON_ARRIVAL'
                      ? 'bg-[#2a2a30] border-[#f36b24]'
                      : 'bg-[#111115] border-[#23232a] hover:border-[#f36b24]'
                      }`}>
                      <RadioGroupItem value="PAY_ON_ARRIVAL" id="pay-on-arrival" className="text-[#f36b24]" />
                      <Label htmlFor="pay-on-arrival" className="flex-1 cursor-pointer flex items-center gap-3">
                        <Wallet className="h-6 w-6 text-[#f36b24]" />
                        <div>
                          <div className="font-semibold text-white">Pay on Arrival</div>
                          <div className="text-sm text-[#bdbdbd]">
                            Pay cash/card when your order arrives
                          </div>
                        </div>
                      </Label>
                    </div>

                    {/* Disabled options for future */}
                    <div className="flex items-center space-x-4 border border-[#23232a] rounded-lg p-4 bg-[#111115] opacity-50 cursor-not-allowed">
                      <RadioGroupItem value="CARD" id="card" disabled />
                      <Label htmlFor="card" className="flex-1 cursor-not-allowed flex items-center gap-3">
                        <CreditCard className="h-6 w-6 text-[#bdbdbd]" />
                        <div>
                          <div className="font-semibold text-[#bdbdbd]">Credit/Debit Card</div>
                          <div className="text-sm text-[#666]">
                            Coming soon
                          </div>
                        </div>
                      </Label>
                    </div>
                  </RadioGroup>

                  <div className="mt-6 p-4 bg-[#2a2a30] rounded-lg border border-[#23232a]">
                    <p className="text-sm text-[#bdbdbd] text-center">
                      More payment methods coming soon!
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Order Summary */}
            <div>
              <Card className="sticky top-24 bg-[#18181c] border-[#23232a]">
                <CardHeader>
                  <CardTitle className="text-white">Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Coupon Code Input */}
                  <CouponCodeInput
                    orderTotal={subtotal}
                    items={cartItems.map((item: any) => ({
                      productId: item.productId || item.product?.id,
                      quantity: item.quantity,
                    }))}
                    onCouponApplied={(discount, code) => {
                      setAppliedDiscount(discount);
                      setAppliedCouponCode(code);
                      toast.success(`Discount of ₹${discount.toFixed(2)} will be applied to your order`);
                    }}
                    onCouponRemoved={() => {
                      setAppliedDiscount(0);
                      setAppliedCouponCode(null);
                    }}
                  />

                  <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                    {cartItems.map((item: any) => {
                      // Handle both products and menu items
                      const isMenuItem = !!item.menuId && !!item.menu;
                      const itemData = isMenuItem ? item.menu : item.product;
                      const itemName = itemData?.name || 'Unknown Item';
                      const itemPrice = item.menu ? (item.menu.price || item.price) : (item.product?.price || item.price);
                      
                      return (
                        <div key={item.id} className="flex justify-between text-sm">
                          <div className="flex-1">
                            <span className="text-[#bdbdbd]">
                              {itemName} x {item.quantity}
                            </span>
                            {isMenuItem && (
                              <span className="ml-2 px-1.5 py-0.5 bg-[#f36b24]/20 text-[#f36b24] text-xs rounded border border-[#f36b24]/30">
                                Combo
                              </span>
                            )}
                          </div>
                          <span className="font-semibold text-white">
                            €{(itemPrice * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="border-t border-[#23232a] pt-3 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-[#bdbdbd]">Subtotal</span>
                      <span className="font-semibold text-white">€{subtotal.toFixed(2)}</span>
                    </div>
                    {appliedDiscount > 0 && (
                      <div className="flex justify-between text-green-400">
                        <span className="text-[#bdbdbd]">Discount</span>
                        <span className="font-semibold">-€{appliedDiscount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-[#bdbdbd]">Tax (8%)</span>
                      <span className="font-semibold text-white">€{tax.toFixed(2)}</span>
                    </div>
                    <div className="border-t border-[#23232a] pt-2 flex justify-between">
                      <span className="text-lg font-bold text-white">Total</span>
                      <span className="text-2xl font-bold text-[#f36b24]">
                        €{total.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-[#f36b24] hover:bg-[#d65a18] text-white font-bold py-6 text-lg"
                    disabled={placeOrderMutation.isPending}
                  >
                    {placeOrderMutation.isPending ? 'Placing Order...' : 'Place Order'}
                  </Button>

                  <p className="text-xs text-[#666] text-center">
                    By placing your order, you agree to our terms and conditions
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
